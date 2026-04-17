# Label Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove adapter-meta leaks (`adapted for X`, `context: Y`) from the public portfolio view and replace the chat greeting with an owner-named greeting.

**Architecture:** Three small edits. (1) `IdentityCard` drops its top label div and `slug` prop. (2) `ChatPanel` drops the left header span, renames `target` → `ownerName`, and updates its greeting. (3) `App.tsx` stops fetching fit-summary, drops the `target` state/gate, and passes `ownerName={basics.name}` directly. Dashboard and the `/fit` pipeline are untouched — this is a view-layer cleanup.

**Tech Stack:** React 18, TypeScript, Vitest, styled-components + plain CSS.

**Spec:** `docs/superpowers/specs/2026-04-17-label-cleanup-design.md`

---

## File Structure

**Modified:**
- `web/src/components/IdentityCard.tsx` — remove label div, drop `slug` prop, drop `githubHandle` helper
- `web/src/__tests__/IdentityCard.test.tsx` — remove "adapted for…" assertions, drop `slug` from all renders, delete two now-obsolete tests
- `web/src/components/ChatPanel.tsx` — remove left header spans (connected + offline), rename `target` → `ownerName`, new greeting wording
- `web/src/components/ChatPanel.css` — flip `.chatp-header` to `justify-content: flex-end`
- `web/src/__tests__/ChatPanel.test.tsx` — rename `target` → `ownerName` in all renders, add ownerName prop where needed
- `web/src/App.tsx` — drop fit-summary fetch effect, `target` state, `parseFitSummary` import, `target !== null` render gate; pass `ownerName={basics.name}`
- `web/src/__tests__/App.test.tsx` — (inspection only; existing mocks for `data/fitted/default.md` become dead but harmless — leave them)

**Not modified:**
- `web/src/utils/parseFitSummary.ts` — still used by `web/scripts/copy-data.cjs`
- `web/src/components/Dashboard.tsx` — dashboard still legitimately shows adapter-meta
- Anything under `data/`, `pdf-theme/`, or `.claude/skills/`

---

## Task 1: IdentityCard — remove adapter-meta label

**Files:**
- Modify: `web/src/components/IdentityCard.tsx`
- Test: `web/src/__tests__/IdentityCard.test.tsx`

- [ ] **Step 1: Update `IdentityCard.test.tsx` — remove `slug` prop and obsolete assertions**

Replace the entire file with:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdentityCard } from '../components/IdentityCard';

const baseBasics = {
  name: 'Verky Yi',
  label: 'Senior Engineer',
  summary: 'Shipped search infra for a 50M-DAU product. Looking for staff IC roles.',
  location: { city: 'New York', region: 'NY' },
  profiles: [
    { network: 'GitHub', url: 'https://github.com/verkyyi' },
    { network: 'LinkedIn', url: 'https://linkedin.com/in/verkyyi' },
  ],
  email: 'verky.yi@gmail.com',
};

describe('IdentityCard', () => {
  it('renders name, role line, and one-liner', () => {
    render(<IdentityCard basics={baseBasics} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/verky yi/i);
    expect(screen.getByText(/Senior Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/New York, NY/)).toBeInTheDocument();
    expect(screen.getByText(/Shipped search infra/)).toBeInTheDocument();
  });

  it('does not render any adapter-meta label', () => {
    const { container } = render(<IdentityCard basics={baseBasics} />);
    expect(container.querySelector('.idcard-label')).toBeNull();
    expect(screen.queryByText(/adapted for/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/~\//)).not.toBeInTheDocument();
  });

  it('renders profile + email links', () => {
    render(<IdentityCard basics={baseBasics} />);
    expect(screen.getByRole('link', { name: /GitHub/i })).toHaveAttribute('href', 'https://github.com/verkyyi');
    expect(screen.getByRole('link', { name: /LinkedIn/i })).toHaveAttribute('href', 'https://linkedin.com/in/verkyyi');
    expect(screen.getByRole('link', { name: /verky\.yi@gmail\.com/ })).toHaveAttribute('href', 'mailto:verky.yi@gmail.com');
  });

  it('truncates summary to the first sentence for the one-liner', () => {
    const basics = {
      ...baseBasics,
      summary: 'First sentence here. Second sentence should not appear in the card one-liner. Third also excluded.',
    };
    render(<IdentityCard basics={basics} />);
    expect(screen.getByText(/First sentence here\./)).toBeInTheDocument();
    expect(screen.queryByText(/Second sentence should not appear/)).not.toBeInTheDocument();
  });

  it('skips role line when label is absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, label: undefined }} />);
    expect(container.querySelector('.idcard-role')).toBeNull();
  });

  it('skips one-liner when summary is absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, summary: undefined }} />);
    expect(container.querySelector('.idcard-oneliner')).toBeNull();
  });

  it('skips profile row when profiles and email are both absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, profiles: [], email: undefined }} />);
    expect(container.querySelector('.idcard-profiles')).toBeNull();
  });

  it('handles abbreviations like "U.S." without splitting on them', () => {
    const basics = { ...baseBasics, summary: 'U.S. citizen with a long résumé. Looking for staff roles.' };
    render(<IdentityCard basics={basics} />);
    expect(screen.getByText(/U\.S\. citizen with a long résumé\./)).toBeInTheDocument();
    expect(screen.queryByText(/Looking for staff roles/)).not.toBeInTheDocument();
  });

  it('returns the whole summary when there is no second sentence', () => {
    const basics = { ...baseBasics, summary: 'Just one sentence without a real boundary' };
    render(<IdentityCard basics={basics} />);
    expect(screen.getByText(/Just one sentence without a real boundary/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd web && npx vitest run src/__tests__/IdentityCard.test.tsx`
Expected: Type error on `<IdentityCard basics={...} />` (missing `slug`), or the assertion `container.querySelector('.idcard-label')).toBeNull()` fails because the label still exists.

- [ ] **Step 3: Update `IdentityCard.tsx` — remove label div, drop `slug` prop, drop helper**

Replace the entire file with:

```tsx
import './IdentityCard.css';

export interface IdentityBasics {
  name: string;
  label?: string;
  summary?: string;
  location?: { city?: string; region?: string };
  profiles?: { network: string; url: string }[];
  email?: string;
}

export interface IdentityCardProps {
  basics: IdentityBasics;
}

function firstSentence(s: string): string {
  const m = s.match(/^(.+?[.!?])\s+(?=[A-Z])/);
  return m ? m[1] : s;
}

function locationLine(loc?: IdentityBasics['location']): string | null {
  if (!loc) return null;
  const parts = [loc.city, loc.region].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function IdentityCard({ basics }: IdentityCardProps) {
  const loc = locationLine(basics.location);
  const roleBits = basics.label ? [basics.label, loc].filter(Boolean).join(' · ') : null;
  const oneLiner = basics.summary ? firstSentence(basics.summary) : null;
  const hasProfiles = (basics.profiles && basics.profiles.length > 0) || !!basics.email;

  return (
    <section className="idcard">
      <h1 className="idcard-name">
        {basics.name}
        <span className="caret">_</span>
      </h1>
      {roleBits && <div className="idcard-role">{roleBits}</div>}
      {oneLiner && (
        <p className="idcard-oneliner">
          <span className="idcard-comment">{'// '}</span>
          {oneLiner}
        </p>
      )}
      {hasProfiles && (
        <div className="idcard-profiles">
          {basics.profiles?.map((p) => (
            <a key={p.network} href={p.url} target="_blank" rel="noreferrer">{p.network}</a>
          ))}
          {basics.email && <a href={`mailto:${basics.email}`}>{basics.email}</a>}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/__tests__/IdentityCard.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: Fails because `App.tsx` still passes `slug` to `IdentityCard`. This is fine — fixed in Task 2. Don't commit yet.

Note: If you want this task's commit to leave the tree green on its own, move Task 2's App.tsx edit up here. Otherwise, proceed to Task 2 and commit both together at the end of Task 2. **Recommended: defer commit — see Task 2's final step.**

---

## Task 2: ChatPanel + App.tsx — rename prop, update greeting, drop fit-summary pipeline

**Files:**
- Modify: `web/src/components/ChatPanel.tsx`
- Modify: `web/src/components/ChatPanel.css`
- Modify: `web/src/App.tsx`
- Test: `web/src/__tests__/ChatPanel.test.tsx`
- Test: `web/src/__tests__/App.test.tsx` (read-only verification)

- [ ] **Step 1: Update `ChatPanel.test.tsx` — rename `target` → `ownerName`**

Replace the entire file with:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../components/ChatPanel';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

function sseResponse(chunks: string[]) {
  const stream = new ReadableStream({
    start(c) {
      for (const s of chunks) c.enqueue(new TextEncoder().encode(s));
      c.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('ChatPanel — offline state', () => {
  it('renders an offline card when VITE_CHAT_PROXY_URL is empty', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', '');
    render(<ChatPanel slug="default" ownerName="Alex Chen" email="a@b.co" profiles={[{ network: 'LinkedIn', url: 'https://l.co' }]} />);
    expect(screen.getByText(/chat is offline/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /a@b\.co/ })).toHaveAttribute('href', 'mailto:a@b.co');
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://l.co');
  });

  it('does not render the "· chat" left label in offline state', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', '');
    render(<ChatPanel slug="default" ownerName="Alex Chen" />);
    // No leading "· chat" span anywhere
    expect(screen.queryByText(/· chat/)).not.toBeInTheDocument();
  });
});

describe('ChatPanel — inline default state', () => {
  it('always shows greeting + suggestion chips without needing a click', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    expect(screen.getByTestId('chat-greeting')).toBeInTheDocument();
    const chips = screen.getAllByTestId('chat-suggestion');
    expect(chips).toHaveLength(3);
  });

  it('greeting names the owner and does not mention target/context', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(/knows Alex Chen/);
    expect(greeting).toHaveTextContent(/ask me anything/i);
    expect(greeting).not.toHaveTextContent(/context/i);
  });

  it('header does not render a "· chat" or "context:" left label', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    expect(screen.queryByText(/· chat/)).not.toBeInTheDocument();
    expect(screen.queryByText(/context:/i)).not.toBeInTheDocument();
  });

  it('clicking a chip prefills the input but does not auto-submit', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    const chip = screen.getAllByTestId('chat-suggestion')[0];
    await user.click(chip);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe(chip.textContent);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reset link appears only when messages exist', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'hi again' }]),
    );
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    expect(screen.getByRole('button', { name: /clear conversation/i })).toBeInTheDocument();
  });

  it('reset link is hidden when there are no messages', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    expect(screen.queryByRole('button', { name: /clear conversation/i })).not.toBeInTheDocument();
  });
});

describe('ChatPanel — streaming send', () => {
  it('sends a POST and renders streamed assistant deltas', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn(async () => sseResponse([
      'event: content_block_delta\ndata: {"delta":{"text":"Hi"}}\n\n',
      'event: content_block_delta\ndata: {"delta":{"text":" there"}}\n\n',
      'event: message_stop\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    await user.type(screen.getByRole('textbox'), 'tell me about notion');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example/chat',
      expect.objectContaining({ method: 'POST' }),
    );
    await screen.findByText('Hi there');
  });
});

describe('ChatPanel — persistence + reset', () => {
  it('loads messages from sessionStorage on mount', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'Welcome back' }]),
    );
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('reset clears messages and sessionStorage', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'old' }]),
    );
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    await user.click(screen.getByRole('button', { name: /clear conversation/i }));
    expect(screen.queryByText('old')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('agentfolio.chat.notion')).toBeNull();
  });
});

describe('ChatPanel — error handling', () => {
  it('removes the trailing empty assistant bubble on fetch error', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/something went wrong/i);
    expect(screen.getByText('hi')).toBeInTheDocument();
    const assistantBubbles = document.querySelectorAll('.chatp-msg.assistant');
    // Only the greeting — no empty placeholder
    expect(assistantBubbles.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to confirm failures**

Run: `cd web && npx vitest run src/__tests__/ChatPanel.test.tsx`
Expected: Multiple failures — TypeScript will complain about unknown `ownerName` prop (ChatPanel still expects `target`), and new assertions for greeting wording and absent "· chat" will fail.

- [ ] **Step 3: Update `ChatPanel.tsx` — rename prop, new greeting, remove left header span**

Replace the component file with:

```tsx
import { useEffect, useRef, useState } from 'react';
import './ChatPanel.css';

type Role = 'user' | 'assistant';
interface Msg { role: Role; content: string }
type Status = 'idle' | 'streaming' | 'error';

export interface ChatPanelProps {
  slug: string;
  ownerName: string;
  email?: string;
  profiles?: { network: string; url: string }[];
}

const DEFAULT_SUGGESTIONS = [
  'Walk me through the résumé',
  'Why is this a fit?',
  "What's not on the résumé?",
];

async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
      if (!dataLine) continue;
      const payload = dataLine.slice(6);
      if (payload === '[DONE]') return;
      try {
        const parsed = JSON.parse(payload) as { delta?: { text?: string } };
        if (parsed.delta?.text) yield parsed.delta.text;
      } catch {
        // ignore non-JSON pings
      }
    }
  }
}

export function ChatPanel({ slug, ownerName, email, profiles }: ChatPanelProps) {
  const proxyUrl = import.meta.env.VITE_CHAT_PROXY_URL as string | undefined;

  // Hooks must be called unconditionally; the offline early-return below
  // is declared after the hooks so React hook order stays stable.
  const storageKey = `agentfolio.chat.${slug}`;
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Msg[]) : [];
    } catch { return []; }
  });
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (messages.length === 0) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  if (!proxyUrl) {
    return (
      <section className="chatp chatp-offline">
        <div className="chatp-header">
          <span className="chatp-status-off">● offline</span>
        </div>
        <p className="chatp-offline-body">
          Chat is offline — reach out directly:
        </p>
        <div className="chatp-offline-links">
          {email && <a href={`mailto:${email}`}>{email}</a>}
          {profiles?.map((p) => (
            <a key={p.network} href={p.url} target="_blank" rel="noreferrer">{p.network}</a>
          ))}
        </div>
      </section>
    );
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setStatus('idle');
    sessionStorage.removeItem(storageKey);
  }

  function pickSuggestion(text: string) {
    setDraft(text);
    inputRef.current?.focus();
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'streaming' || !draft.trim()) return;
    const next: Msg[] = [...messages, { role: 'user', content: draft.trim() }, { role: 'assistant', content: '' }];
    setMessages(next);
    setDraft('');
    setStatus('streaming');

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const toSend = next.slice(0, -1);
      const resp = await fetch(`${proxyUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, messages: toSend }),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`status_${resp.status}`);
      for await (const delta of parseSse(resp.body)) {
        setMessages((cur) => {
          const copy = cur.slice();
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant') {
            copy[copy.length - 1] = { role: 'assistant', content: last.content + delta };
          }
          return copy;
        });
      }
      setStatus('idle');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((cur) => {
        const last = cur[cur.length - 1];
        if (last && last.role === 'assistant' && last.content === '') {
          return cur.slice(0, -1);
        }
        return cur;
      });
      setStatus('error');
    }
  }

  return (
    <section className="chatp" aria-label="Chat">
      <div className="chatp-header">
        <div className="chatp-header-right">
          {messages.length > 0 && (
            <button type="button" className="chatp-clear" onClick={reset}>
              clear conversation
            </button>
          )}
          <span className="chatp-status-on">● connected</span>
        </div>
      </div>

      <div className="chatp-messages">
        <div className="chatp-msg assistant chatp-greeting" data-testid="chat-greeting">
          <span className="chatp-prompt">&gt;</span> Hey, I'm an agent that knows {ownerName}. Ask me anything.
        </div>
        {messages.map((m, i) => (
          <div key={i} className={`chatp-msg ${m.role}`}>
            {m.role === 'assistant' && <span className="chatp-prompt">&gt;</span>}
            {m.role === 'user' && <span className="chatp-prompt chatp-prompt-user">$</span>}
            {m.content}
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="chatp-suggestions" role="group" aria-label="Suggested questions">
          {DEFAULT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              data-testid="chat-suggestion"
              className="chatp-suggestion"
              onClick={() => pickSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {status === 'error' && <div className="chatp-error">Something went wrong. Try again.</div>}

      <form className="chatp-input-row" onSubmit={send}>
        <span className="chatp-prompt chatp-prompt-user">$</span>
        <input
          ref={inputRef}
          aria-label="Message"
          placeholder="ask a question…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={status === 'streaming'}
          maxLength={2000}
        />
        <button type="submit" aria-label="Send" disabled={status === 'streaming' || !draft.trim()}>
          send ⏎
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 4: Update `ChatPanel.css` — flip header to right-align**

In `web/src/components/ChatPanel.css`, find the `.chatp-header` block (around line 23) and replace `justify-content: space-between` with `justify-content: flex-end`:

```css
.chatp-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
```

(Only that one property changes.)

- [ ] **Step 5: Update `App.tsx` — drop fit-summary pipeline, pass ownerName, drop IdentityCard slug**

Replace the entire file with:

```tsx
import { useEffect, useState } from 'react';
import { useAdaptation } from './hooks/useAdaptation';
import { ResumeTheme } from './components/ResumeTheme';
import { Dashboard } from './components/Dashboard';
import { IdentityCard, type IdentityBasics } from './components/IdentityCard';
import { ChatPanel } from './components/ChatPanel';
import { ActivityStrip } from './components/ActivityStrip';
import { Footer } from './components/Footer';
import { GithubActivity, type ActivityData } from './components/GithubActivity';

function isDashboard(): boolean {
  const base = import.meta.env.BASE_URL ?? '/';
  let path = window.location.pathname;
  if (base !== '/' && path.startsWith(base)) {
    path = path.slice(base.length);
  }
  return path.replace(/^\/+|\/+$/g, '') === 'dashboard';
}

export default function App() {
  if (isDashboard()) return <Dashboard />;
  return <ResumePage />;
}

function ResumePage() {
  const { adapted, error, slug } = useAdaptation();
  const [activity, setActivity] = useState<ActivityData | null>(null);

  useEffect(() => {
    if (adapted?.basics?.name) {
      document.title = `${adapted.basics.name} — Resume`;
    }
  }, [adapted]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/github/activity.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ActivityData | null) => { if (!cancelled) setActivity(data); })
      .catch(() => { if (!cancelled) setActivity(null); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <main>
        <h1>Not Found</h1>
        <p>No resume adaptation exists for this path.</p>
        <a href={import.meta.env.BASE_URL}>Go to homepage</a>
      </main>
    );
  }

  if (!adapted) return <main>Loading…</main>;

  const activeSlug = slug ?? 'default';
  const basics = (adapted.basics ?? {}) as IdentityBasics;

  return (
    <>
      <main>
        <IdentityCard basics={basics} />
        <ChatPanel
          key={activeSlug}
          slug={activeSlug}
          ownerName={basics.name}
          email={basics.email}
          profiles={basics.profiles}
        />
        <ActivityStrip data={activity} />
        <ResumeTheme resume={adapted as unknown as Record<string, unknown>} />
        <GithubActivity data={activity} />
      </main>
      <Footer />
    </>
  );
}
```

Key changes vs. the previous version:
- Removed `import { parseFitSummary } ...`
- Removed `const [target, setTarget] = useState<string | null>(null);` and its populating effect
- Removed the `{target !== null && (...)}` gate around `<ChatPanel ...>`
- Changed `target={target}` to `ownerName={basics.name}`
- Changed `<IdentityCard basics={basics} slug={activeSlug} />` to `<IdentityCard basics={basics} />`

- [ ] **Step 6: Run full test suite**

Run: `cd web && npx vitest run`
Expected: All 73 tests pass (IdentityCard tests: 9; ChatPanel tests: 11; App tests: unchanged behavior).

If `App.test.tsx` fails unexpectedly, inspect the failure — the likely cause is a timing change from removing the fit-summary fetch (ChatPanel now renders immediately). If so, the existing `waitFor` assertions should still be fine since they weren't gated on fit-summary. Report back if anything fails.

- [ ] **Step 7: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: Exit 0, no output.

- [ ] **Step 8: Visual spot check (dev server)**

Run: `cd web && npm run dev`
Open `http://localhost:5173/` in a browser:
- IdentityCard has no top `~/… · adapted for …` line.
- ChatPanel header shows only `● connected` on the right; nothing on the left.
- Greeting reads: `> Hey, I'm an agent that knows {name}. Ask me anything.` (where `{name}` is the real owner name from `basics.name`).

Then navigate to `http://localhost:5173/notion`:
- Same layout. No `adapted for notion`. No `context: Notion`.

Stop the dev server with Ctrl+C when done.

- [ ] **Step 9: Commit (all changes from Tasks 1 and 2 together)**

```bash
cd /home/dev/projects/agentfolio
git add web/src/components/IdentityCard.tsx \
        web/src/__tests__/IdentityCard.test.tsx \
        web/src/components/ChatPanel.tsx \
        web/src/components/ChatPanel.css \
        web/src/__tests__/ChatPanel.test.tsx \
        web/src/App.tsx
git commit -m "$(cat <<'EOF'
chore: hide adapter-meta labels on public portfolio view

Remove `~/{handle} · adapted for {slug}` line from IdentityCard,
drop the left `· chat · context: {target}` span from ChatPanel, and
rewrite the greeting to name the owner directly. App.tsx no longer
fetches fit-summary for display purposes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Final verification

**Files:** (read-only)

- [ ] **Step 1: Confirm working tree is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean` (ignoring untracked `.claude/settings.local.json`).

- [ ] **Step 2: Full test suite + typecheck one more time**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: All tests pass, typecheck exits 0.

- [ ] **Step 3: Grep for any lingering leaks**

Run:

```bash
cd /home/dev/projects/agentfolio
```

Then via Grep tool (not bash): search for `adapted for` in `web/src` — expect zero matches. Search for `context: {target}` in `web/src` — expect zero matches. Search for `parseFitSummary` in `web/src/App.tsx` — expect zero matches.

If any match shows up, investigate and fix before reporting done.

- [ ] **Step 4: Report back**

Confirm:
- Tests: 73 passed (or higher if new tests were added in Task 1/2 — actual count ~75 after two new assertions)
- Typecheck: clean
- Commit: single commit chained off `c093b1a`
- No residual references to `adapted for`, `context: {target}`, or `parseFitSummary` in app code
