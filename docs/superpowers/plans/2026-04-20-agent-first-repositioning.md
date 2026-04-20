# Agent-First Repositioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition AgentFolio from resume + activity on landing to an agent-first portfolio where resume/activity surface only inside the conversation via inline typed blocks and a side panel.

**Architecture:** Three shippable phases. Phase 1 strips the default page to hero + chat. Phase 2 extends the SSE protocol with typed `block` frames, adds a `SidePanel`, and wires the first tool (`open_panel`). Phase 3 adds three data tools (`get_recent_activity`, `get_repo_highlight`, `get_work_highlight`) and their inline renderers.

**Tech Stack:** Existing stack only — React 18, TypeScript, Vite, Vitest, Playwright, react-markdown, styled-components (for ResumeTheme, unchanged); Cloudflare Worker + Anthropic SDK (native fetch) for the proxy. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-20-agent-first-repositioning-design.md`

**File-structure overview:**

```
web/src/
  blocks/
    types.ts                       # shared block frame types (NEW, Phase 2)
  components/
    Hero.tsx + Hero.css            # NEW, Phase 1
    SidePanel.tsx + SidePanel.css  # NEW, Phase 2
    blocks/
      index.tsx                    # <Block> dispatcher (NEW, Phase 2)
      OpenPanelChip.tsx            # NEW, Phase 2
      RepoCard.tsx                 # NEW, Phase 3
      ActivitySummary.tsx          # NEW, Phase 3
      WorkHighlight.tsx            # NEW, Phase 3
    ChatPanel.tsx                  # MODIFY (Phase 1 trim, Phase 2 segments model)
    App.tsx                        # MODIFY (Phase 1 strip, Phase 2 + panel)
    ChatStrip.tsx/css              # DELETE (Phase 1)
    ActivityStrip.tsx/css          # DELETE (Phase 1)
  hooks/
    useSidePanel.ts                # NEW, Phase 2
  __tests__/
    Hero.test.tsx                  # NEW, Phase 1
    SidePanel.test.tsx             # NEW, Phase 2
    useSidePanel.test.ts           # NEW, Phase 2
    blocks.dispatcher.test.tsx     # NEW, Phase 2
    OpenPanelChip.test.tsx         # NEW, Phase 2
    RepoCard.test.tsx              # NEW, Phase 3
    ActivitySummary.test.tsx       # NEW, Phase 3
    WorkHighlight.test.tsx         # NEW, Phase 3
    ChatStrip.test.tsx             # DELETE (Phase 1)
    ActivityStrip.test.tsx         # DELETE (Phase 1)

proxy/src/
  blocks.ts                        # block frame types (manually synced with web/src/blocks/types.ts) (NEW, Phase 2)
  tools.ts                         # tool definitions + handlers (NEW, Phase 2; extended Phase 3)
  bundledData.ts                   # imports adapted JSONs + activity.json for server-side tools (NEW, Phase 3)
  anthropic.ts                     # MODIFY — replace pass-through with tool-use loop that emits framed SSE
proxy/test/
  tools.test.ts                    # NEW, Phase 2 + extended Phase 3
  anthropic.test.ts                # NEW, Phase 2
```

---

## Phase 1 — Strip and ship

Goal: agent-first landing page with plain text chat. No protocol changes. Ship independently.

### Task 1.1: Create Hero component with failing test

**Files:**
- Create: `web/src/components/Hero.tsx`
- Create: `web/src/components/Hero.css`
- Test: `web/src/__tests__/Hero.test.tsx`

- [ ] **Step 1: Write the failing test**

File: `web/src/__tests__/Hero.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '../components/Hero';

describe('Hero', () => {
  it('renders name, tagline, and explainer', () => {
    render(
      <Hero
        name="Verky Yi"
        tagline="Product engineer building AI-native tools"
        image="/avatar.png"
      />
    );
    expect(screen.getByText('Verky Yi')).toBeInTheDocument();
    expect(screen.getByText(/Product engineer building AI-native tools/)).toBeInTheDocument();
    expect(screen.getByText(/This page is an agent/i)).toBeInTheDocument();
  });

  it('falls back to initials when no image', () => {
    render(<Hero name="Verky Yi" />);
    expect(screen.getByTestId('hero-avatar')).toHaveTextContent('VY');
  });

  it('renders without tagline', () => {
    render(<Hero name="Verky Yi" />);
    expect(screen.getByText('Verky Yi')).toBeInTheDocument();
    expect(screen.getByText(/This page is an agent/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/Hero.test.tsx`
Expected: FAIL with "Cannot find module '../components/Hero'"

- [ ] **Step 3: Implement Hero**

File: `web/src/components/Hero.tsx`

```tsx
import './Hero.css';

export interface HeroProps {
  name: string;
  tagline?: string;
  image?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export function Hero({ name, tagline, image }: HeroProps) {
  return (
    <header className="hero">
      <div className="hero-avatar" data-testid="hero-avatar">
        {image ? <img src={image} alt={name} /> : <span>{initials(name)}</span>}
      </div>
      <h1 className="hero-name">{name}</h1>
      {tagline && <p className="hero-tagline">{tagline}</p>}
      <p className="hero-explainer">
        This page is an agent — ask it anything about my background, projects, or fit for a role.
      </p>
    </header>
  );
}
```

File: `web/src/components/Hero.css`

```css
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 16px 24px;
  max-width: 640px;
  margin: 0 auto;
}
.hero-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent-dim, #e8e8e8);
  color: var(--fg, #333);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 20px;
  overflow: hidden;
  margin-bottom: 12px;
}
.hero-avatar img { width: 100%; height: 100%; object-fit: cover; }
.hero-name { margin: 0; font-size: 22px; font-weight: 600; }
.hero-tagline { margin: 4px 0 0; font-size: 14px; opacity: 0.72; }
.hero-explainer { margin: 12px 0 0; font-size: 13px; opacity: 0.6; max-width: 420px; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/__tests__/Hero.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/components/Hero.tsx web/src/components/Hero.css web/src/__tests__/Hero.test.tsx
git commit -m "Add Hero component for agent-first landing"
```

---

### Task 1.2: Widen ChatPanel suggestion support from 3 to 4

Currently `ChatPanel` only uses the suggestions prop if `suggestions.length === 3`. The spec's 2×2 grid wants up to 4. Relax this check and update the CSS grid.

**Files:**
- Modify: `web/src/components/ChatPanel.tsx` (line 253-254)
- Modify: `web/src/components/ChatPanel.css` (suggestions grid)
- Test: `web/src/__tests__/ChatPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `web/src/__tests__/ChatPanel.test.tsx` (append inside the existing `describe` for ChatPanel):

```tsx
it('renders 4 suggestions when 4 are provided', () => {
  render(
    <ChatPanel
      slug="default"
      ownerName="Verky"
      suggestions={['A', 'B', 'C', 'D']}
    />
  );
  const buttons = screen.getAllByTestId('chat-suggestion');
  expect(buttons).toHaveLength(4);
  expect(buttons.map((b) => b.textContent)).toEqual(['A', 'B', 'C', 'D']);
});

it('renders 2 suggestions when 2 are provided', () => {
  render(
    <ChatPanel
      slug="default"
      ownerName="Verky"
      suggestions={['A', 'B']}
    />
  );
  expect(screen.getAllByTestId('chat-suggestion')).toHaveLength(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/ChatPanel.test.tsx -t "renders 4 suggestions"`
Expected: FAIL — receives DEFAULT_SUGGESTIONS (3 items) instead of the 4 provided.

- [ ] **Step 3: Change the filter**

In `web/src/components/ChatPanel.tsx` around line 253, replace:

```tsx
const displaySuggestions =
  Array.isArray(suggestions) && suggestions.length === 3 ? suggestions : DEFAULT_SUGGESTIONS;
```

with:

```tsx
const displaySuggestions =
  Array.isArray(suggestions) && suggestions.length >= 1 && suggestions.length <= 6
    ? suggestions
    : DEFAULT_SUGGESTIONS;
```

- [ ] **Step 4: Update CSS for 2×2 grid when count ≥ 4**

In `web/src/components/ChatPanel.css`, find `.chatp-suggestions` and replace its layout rule with:

```css
.chatp-suggestions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin: 12px 0;
}
```

(If the rule doesn't exist yet or uses `flex`, replace with the above. Leave existing `.chatp-suggestion` button styling intact.)

- [ ] **Step 5: Run tests**

Run: `cd web && npx vitest run src/__tests__/ChatPanel.test.tsx`
Expected: PASS (all existing + 2 new).

- [ ] **Step 6: Commit**

```bash
git add web/src/components/ChatPanel.tsx web/src/components/ChatPanel.css web/src/__tests__/ChatPanel.test.tsx
git commit -m "Accept 1–6 chat suggestions and lay out as grid"
```

---

### Task 1.3: Delete ChatStrip and ActivityStrip

They were sticky helpers for the long-scrolling page. The new short hero + chat layout doesn't need them.

**Files:**
- Delete: `web/src/components/ChatStrip.tsx`, `ChatStrip.css`
- Delete: `web/src/components/ActivityStrip.tsx`, `ActivityStrip.css`
- Delete: `web/src/__tests__/ChatStrip.test.tsx`, `ActivityStrip.test.tsx`

- [ ] **Step 1: Verify nothing else imports them**

Run:

```bash
cd /home/dev/projects/agentfolio
grep -rn "ChatStrip\|ActivityStrip" web/src proxy/src 2>/dev/null | grep -v __tests__ | grep -v ".test."
```

Expected output: only references inside `App.tsx` (imports + render) which we will remove in Task 1.4.

- [ ] **Step 2: Remove the files**

Run:

```bash
cd /home/dev/projects/agentfolio
rm web/src/components/ChatStrip.tsx \
   web/src/components/ChatStrip.css \
   web/src/components/ActivityStrip.tsx \
   web/src/components/ActivityStrip.css \
   web/src/__tests__/ChatStrip.test.tsx \
   web/src/__tests__/ActivityStrip.test.tsx
```

- [ ] **Step 3: Confirm tests still build**

Run: `cd web && npx vitest run`
Expected: Build fails only on `App.test.tsx` and `App.tsx` (they still import the deleted components). This is expected — Task 1.4 fixes it. Do NOT commit yet.

---

### Task 1.4: Simplify App.tsx to Hero + ChatPanel

**Files:**
- Modify: `web/src/App.tsx` (replace `ResumePage` contents)
- Modify: `web/src/__tests__/App.test.tsx`

- [ ] **Step 1: Update App test to expect hero, no resume, no activity**

Replace `web/src/__tests__/App.test.tsx` contents with:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import App from '../App';

const mockAdapted = {
  basics: { name: 'Verky Yi', summary: 'Product engineer.' },
  work: [],
  meta: { agentfolio: { suggestions: ['Roles?', 'Recent work?', 'AI experience?', 'Resume?'] } },
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/data/adapted/')) {
      return { ok: true, json: async () => mockAdapted } as unknown as Response;
    }
    return { ok: false } as unknown as Response;
  }));
  window.history.replaceState({}, '', '/');
});

describe('App landing', () => {
  it('renders Hero and ChatPanel, not ResumeTheme or GithubActivity', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Verky Yi')).toBeInTheDocument());
    expect(screen.getByText(/This page is an agent/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Chat')).toBeInTheDocument();
    expect(screen.queryByTestId('resume-theme')).not.toBeInTheDocument();
    expect(screen.queryByTestId('github-activity')).not.toBeInTheDocument();
  });

  it('renders 4 suggestions from meta.agentfolio.suggestions', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByTestId('chat-suggestion')).toHaveLength(4));
  });
});
```

- [ ] **Step 2: Confirm ResumeTheme and GithubActivity have testids**

Run:

```bash
grep -n "data-testid" web/src/components/ResumeTheme.tsx web/src/components/GithubActivity.tsx
```

If either is missing `data-testid="resume-theme"` or `data-testid="github-activity"` respectively, add it to the root element:

- `ResumeTheme.tsx` root element: `data-testid="resume-theme"`
- `GithubActivity.tsx` root element: `data-testid="github-activity"`

(The queryByTestId assertions in the test need these. Even though we'll stop rendering them in `App.tsx`, the testids help future tests and don't hurt.)

- [ ] **Step 3: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/App.test.tsx`
Expected: FAIL — ResumeTheme + GithubActivity still render; "This page is an agent" not found.

- [ ] **Step 4: Replace App.tsx**

Replace `web/src/App.tsx` with:

```tsx
import { useEffect } from 'react';
import { useAdaptation } from './hooks/useAdaptation';
import { Dashboard } from './components/Dashboard';
import { Hero } from './components/Hero';
import { ChatPanel } from './components/ChatPanel';
import { Footer } from './components/Footer';
import { firstSentence } from './utils/firstSentence';
import type { IdentityBasics } from './components/IdentityCard';

function isDashboard(): boolean {
  const base = import.meta.env.BASE_URL ?? '/';
  let path = window.location.pathname;
  if (base !== '/' && path.startsWith(base)) path = path.slice(base.length);
  return path.replace(/^\/+|\/+$/g, '') === 'dashboard';
}

export default function App() {
  if (isDashboard()) return <Dashboard />;
  return <ResumePage />;
}

function ResumePage() {
  const { adapted, error, slug } = useAdaptation();

  useEffect(() => {
    if (adapted?.basics?.name) {
      document.title = `${adapted.basics.name} — Resume`;
    }
  }, [adapted]);

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
  const tagline = basics.summary ? firstSentence(basics.summary) : undefined;
  const agentMeta = adapted.meta?.agentfolio;
  const greeting = agentMeta?.greeting;
  const suggestions = agentMeta?.suggestions;

  return (
    <>
      <main>
        <Hero name={basics.name ?? ''} tagline={tagline} image={basics.image} />
        <ChatPanel
          key={activeSlug}
          slug={activeSlug}
          ownerName={basics.name ?? ''}
          tagline={tagline}
          email={basics.email}
          profiles={basics.profiles}
          greeting={greeting}
          suggestions={suggestions}
        />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: Drop unused props from ChatPanel**

In `web/src/components/ChatPanel.tsx`, remove the now-unused `sentinelRef` prop, `onStateChange` callback, and `onSend` callback since the ChatStrip that consumed them is deleted.

Replace the `ChatPanelProps` interface (around line 18-29) with:

```tsx
export interface ChatPanelProps {
  slug: string;
  ownerName: string;
  tagline?: string;
  email?: string;
  profiles?: { network: string; url: string }[];
  greeting?: string;
  suggestions?: string[];
}
```

Remove `ChatPanelState`, `ChatPanelHandle`, and `forwardRef`/`useImperativeHandle` usage:

- Change the component signature from `export const ChatPanel = forwardRef<...>(...)` to `export function ChatPanel({ ... }: ChatPanelProps) { ... }`.
- Delete the `useImperativeHandle(...)` block.
- Delete the `useEffect` that calls `onStateChange` (around lines 108-118).
- Delete the `onSend?.()` call inside `send`.
- Delete the `sentinelRef` div at the bottom of the component (around lines 319-326).
- Delete `sectionRef` and its use — plain section is fine: `<section className="chatp" aria-label="Chat">`.

Exports to keep: `ChatPanel`, `Msg`.
Exports to drop: `ChatPanelHandle`, `ChatPanelState`.

- [ ] **Step 6: Run all tests**

Run: `cd web && npx vitest run`
Expected: PASS. If `App.test.tsx` or `ChatPanel.test.tsx` use removed exports, remove those usages.

- [ ] **Step 7: Manually verify dev server**

Run: `cd web && npm run dev`
Open `http://localhost:5173/`. Expected: hero avatar + "Verky Yi" + tagline + "This page is an agent — ask it anything…" + chat input + 4 suggestion buttons. No full resume rendered below. No GitHub activity. Send a message — chat still streams.

- [ ] **Step 8: Commit Phase 1**

```bash
git add web/src/App.tsx \
        web/src/components/ChatPanel.tsx \
        web/src/components/ChatPanel.css \
        web/src/components/ResumeTheme.tsx \
        web/src/components/GithubActivity.tsx \
        web/src/__tests__/App.test.tsx \
        web/src/components/Hero.tsx \
        web/src/components/Hero.css \
        web/src/__tests__/Hero.test.tsx
git rm web/src/components/ChatStrip.tsx \
       web/src/components/ChatStrip.css \
       web/src/components/ActivityStrip.tsx \
       web/src/components/ActivityStrip.css \
       web/src/__tests__/ChatStrip.test.tsx \
       web/src/__tests__/ActivityStrip.test.tsx
git commit -m "Reposition landing to Hero + ChatPanel, drop strip components"
```

**Phase 1 ships here. The site is now agent-first with plain-text chat.**

---

## Phase 2 — SSE protocol, SidePanel, open_panel

Goal: extend the chat protocol so the agent can emit typed blocks; add a SidePanel; wire the first tool (`open_panel`) end-to-end.

### Task 2.1: Define block types (shared schema)

**Files:**
- Create: `web/src/blocks/types.ts`
- Create: `proxy/src/blocks.ts` (manually kept in sync)

- [ ] **Step 1: Create the frontend types**

File: `web/src/blocks/types.ts`

```ts
export interface RepoCardData {
  name: string;
  description: string;
  commits?: number;
  sparkline?: number[];
  url: string;
  primaryLang?: string;
}

export interface ActivitySummaryData {
  window: '30d' | '90d';
  totalCommits: number;
  topRepos: Array<{ name: string; commits: number }>;
  sparkline: number[];
}

export interface WorkHighlightData {
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface OpenPanelData {
  panel: 'resume' | 'activity' | 'jd';
}

export type BlockFrame =
  | { id: string; type: 'repo-card';        data: RepoCardData }
  | { id: string; type: 'activity-summary'; data: ActivitySummaryData }
  | { id: string; type: 'work-highlight';   data: WorkHighlightData }
  | { id: string; type: 'open-panel';       data: OpenPanelData };

export type BlockType = BlockFrame['type'];
```

- [ ] **Step 2: Create the mirrored worker types**

File: `proxy/src/blocks.ts`

```ts
// Must stay in sync with web/src/blocks/types.ts
export interface RepoCardData {
  name: string;
  description: string;
  commits?: number;
  sparkline?: number[];
  url: string;
  primaryLang?: string;
}

export interface ActivitySummaryData {
  window: '30d' | '90d';
  totalCommits: number;
  topRepos: Array<{ name: string; commits: number }>;
  sparkline: number[];
}

export interface WorkHighlightData {
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface OpenPanelData {
  panel: 'resume' | 'activity' | 'jd';
}

export type BlockFrame =
  | { id: string; type: 'repo-card';        data: RepoCardData }
  | { id: string; type: 'activity-summary'; data: ActivitySummaryData }
  | { id: string; type: 'work-highlight';   data: WorkHighlightData }
  | { id: string; type: 'open-panel';       data: OpenPanelData };
```

- [ ] **Step 3: Commit**

```bash
git add web/src/blocks/types.ts proxy/src/blocks.ts
git commit -m "Define shared block frame types"
```

---

### Task 2.2: Segment-based message model in ChatPanel (refactor under green tests)

**Files:**
- Modify: `web/src/components/ChatPanel.tsx`
- Modify: `web/src/__tests__/ChatPanel.test.tsx`

- [ ] **Step 1: Write tests for the new segment model**

Append to `web/src/__tests__/ChatPanel.test.tsx`:

```tsx
import { mergeDelta, appendBlock, type Segment } from '../components/ChatPanel';
import type { BlockFrame } from '../blocks/types';

describe('segment helpers', () => {
  it('mergeDelta appends to trailing text segment', () => {
    const segs: Segment[] = [{ kind: 'text', text: 'hello' }];
    const result = mergeDelta(segs, ' world');
    expect(result).toEqual([{ kind: 'text', text: 'hello world' }]);
  });

  it('mergeDelta starts new text segment after a block', () => {
    const block: BlockFrame = {
      id: 'b1', type: 'open-panel', data: { panel: 'resume' },
    };
    const segs: Segment[] = [
      { kind: 'text', text: 'See ' },
      { kind: 'block', block },
    ];
    const result = mergeDelta(segs, 'here');
    expect(result).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'block', block },
      { kind: 'text', text: 'here' },
    ]);
  });

  it('appendBlock appends a block segment', () => {
    const block: BlockFrame = {
      id: 'b1', type: 'open-panel', data: { panel: 'resume' },
    };
    const segs: Segment[] = [{ kind: 'text', text: 'See ' }];
    const result = appendBlock(segs, block);
    expect(result).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'block', block },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/ChatPanel.test.tsx -t "segment helpers"`
Expected: FAIL — `mergeDelta`, `appendBlock`, `Segment` not exported.

- [ ] **Step 3: Add segment model to ChatPanel**

In `web/src/components/ChatPanel.tsx`, near the top (after imports), add:

```tsx
import type { BlockFrame } from '../blocks/types';

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'block'; block: BlockFrame };

export interface Msg {
  role: 'user' | 'assistant';
  segments: Segment[];
}

export function mergeDelta(segments: Segment[], delta: string): Segment[] {
  if (!delta) return segments;
  const last = segments[segments.length - 1];
  if (last && last.kind === 'text') {
    const next = segments.slice(0, -1);
    next.push({ kind: 'text', text: last.text + delta });
    return next;
  }
  return [...segments, { kind: 'text', text: delta }];
}

export function appendBlock(segments: Segment[], block: BlockFrame): Segment[] {
  return [...segments, { kind: 'block', block }];
}

export function segmentsToText(segments: Segment[]): string {
  return segments.filter((s) => s.kind === 'text').map((s) => (s as { text: string }).text).join('');
}
```

Replace the previous `Msg` export (the `{role, content: string}` one) with the new one. Update all places in the file that used `content` to use segments. Key locations:
- `send()` — the user message is now `{ role: 'user', segments: [{kind: 'text', text: draft.trim()}] }`; the assistant stub is `{ role: 'assistant', segments: [] }`.
- Drip tick — replace `copy[copy.length - 1] = { role: 'assistant', content: visible }` with `copy[copy.length - 1] = { role: 'assistant', segments: [{kind: 'text', text: visible}] }`. (Phase 2.3 will make this handle blocks; for now keep text-only path working.)
- Session storage hydration — old `Msg[]` with `content` won't deserialize; on parse error, default to `[]`. Add a guard:

  ```tsx
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Accept only new-shape messages; discard stale content-shape.
      return parsed.filter((m: any) => m && Array.isArray(m.segments)) as Msg[];
    } catch { return []; }
  });
  ```

- Render loop — replace `<span className="chatp-msg-body">{m.content}</span>` with a segments renderer: for each text segment, render its text; for each block segment, render `<Block block={...} />` (Block dispatcher comes in Task 2.4; use a placeholder `<span>` for now that renders `[block:{type}]`, replaced in 2.4).

- [ ] **Step 4: Run tests**

Run: `cd web && npx vitest run src/__tests__/ChatPanel.test.tsx`
Expected: all tests PASS, including the new segment helper tests.

- [ ] **Step 5: Manually verify dev server**

Run: `cd web && npm run dev`
Send a message. Expected: streaming text still works exactly as before.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/ChatPanel.tsx web/src/__tests__/ChatPanel.test.tsx
git commit -m "Switch ChatPanel to segment-based message model"
```

---

### Task 2.3: Extend parseSse to yield tagged frames (text | block | done | error)

**Files:**
- Modify: `web/src/components/ChatPanel.tsx` (replace `parseSse`)
- Test: `web/src/__tests__/ChatPanel.test.tsx`

- [ ] **Step 1: Write failing test for tagged parser**

Append to `web/src/__tests__/ChatPanel.test.tsx`:

```tsx
import { parseSse, type SseEvent } from '../components/ChatPanel';

function streamFrom(s: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) { c.enqueue(enc.encode(s)); c.close(); },
  });
}

async function collect(s: string): Promise<SseEvent[]> {
  const out: SseEvent[] = [];
  for await (const ev of parseSse(streamFrom(s))) out.push(ev);
  return out;
}

describe('parseSse', () => {
  it('yields text delta frames', async () => {
    const s =
      'event: text\ndata: {"delta":"hello "}\n\n' +
      'event: text\ndata: {"delta":"world"}\n\n' +
      'event: done\ndata: {}\n\n';
    expect(await collect(s)).toEqual([
      { kind: 'text', delta: 'hello ' },
      { kind: 'text', delta: 'world' },
      { kind: 'done' },
    ]);
  });

  it('yields block frames', async () => {
    const block = { id: 'b1', type: 'open-panel', data: { panel: 'resume' } };
    const s =
      'event: text\ndata: {"delta":"see "}\n\n' +
      `event: block\ndata: ${JSON.stringify(block)}\n\n` +
      'event: done\ndata: {}\n\n';
    expect(await collect(s)).toEqual([
      { kind: 'text', delta: 'see ' },
      { kind: 'block', block },
      { kind: 'done' },
    ]);
  });

  it('yields error frame', async () => {
    const s = 'event: error\ndata: {"message":"boom"}\n\n';
    expect(await collect(s)).toEqual([{ kind: 'error', message: 'boom' }]);
  });

  it('tolerates chunks split mid-frame', async () => {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode('event: text\nda'));
        c.enqueue(enc.encode('ta: {"delta":"hi"}\n\nevent: done\ndata: {}\n\n'));
        c.close();
      },
    });
    const out: SseEvent[] = [];
    for await (const ev of parseSse(stream)) out.push(ev);
    expect(out).toEqual([{ kind: 'text', delta: 'hi' }, { kind: 'done' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/ChatPanel.test.tsx -t "parseSse"`
Expected: FAIL — `parseSse` either not exported or yields only strings; `SseEvent` not exported.

- [ ] **Step 3: Replace parseSse**

In `web/src/components/ChatPanel.tsx`, replace the existing `parseSse` (around lines 45-68) with:

```tsx
import type { BlockFrame } from '../blocks/types';

export type SseEvent =
  | { kind: 'text'; delta: string }
  | { kind: 'block'; block: BlockFrame }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
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
      if (!frame.trim()) continue;
      let eventType = 'message';
      let dataLine = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        else if (line.startsWith('data: ')) dataLine = line.slice(6);
      }
      if (!dataLine) continue;
      try {
        const payload = JSON.parse(dataLine);
        if (eventType === 'text' && typeof payload.delta === 'string') {
          yield { kind: 'text', delta: payload.delta };
        } else if (eventType === 'block' && payload && typeof payload.type === 'string') {
          yield { kind: 'block', block: payload as BlockFrame };
        } else if (eventType === 'done') {
          yield { kind: 'done' };
          return;
        } else if (eventType === 'error' && typeof payload.message === 'string') {
          yield { kind: 'error', message: payload.message };
          return;
        }
      } catch {
        // ignore non-JSON pings
      }
    }
  }
}
```

- [ ] **Step 4: Update send() to consume tagged events and update segments**

In `web/src/components/ChatPanel.tsx`, inside `send()`, replace the streaming loop (around lines 217-226):

```tsx
for await (const delta of parseSse(resp.body)) {
  fullText += delta;
  if (fullText.length >= MAX_RESPONSE_CHARS) { ... break; }
}
```

with:

```tsx
const pendingBlocks: BlockFrame[] = [];
for await (const ev of parseSse(resp.body)) {
  if (ev.kind === 'text') {
    fullText += ev.delta;
    if (fullText.length >= MAX_RESPONSE_CHARS) {
      fullText = fullText.slice(0, MAX_RESPONSE_CHARS);
      truncated = true;
      break;
    }
  } else if (ev.kind === 'block') {
    pendingBlocks.push(ev.block);
    // Drain the current fullText into the visible message before inserting the block,
    // so the block lands at the wire position.
    revealed = fullText.length;
    setMessages((cur) => {
      const copy = cur.slice();
      const last = copy[copy.length - 1];
      if (last && last.role === 'assistant') {
        let segs = mergeDelta([], fullText); // start with all revealed text so far
        segs = appendBlock(segs, ev.block);
        copy[copy.length - 1] = { role: 'assistant', segments: segs };
      }
      return copy;
    });
    fullText = ''; // subsequent text starts a new trailing segment after the block
  } else if (ev.kind === 'error') {
    throw new Error(ev.message);
  } else if (ev.kind === 'done') {
    break;
  }
}
```

Also update the drip `tick()` to respect existing block segments: instead of replacing the assistant message's single text content, `tick()` should append a trailing text segment representing `fullText.slice(0, revealed)` while preserving any already-inserted block segments. Concretely — replace the body of `tick()` with:

```tsx
const tick = () => {
  const backlog = fullText.length - revealed;
  if (backlog <= 0) {
    if (streamDone) {
      if (dripRef.current !== null) { window.clearInterval(dripRef.current); dripRef.current = null; }
      if (truncated) {
        setMessages((cur) => withTrailingText(cur, fullText + TRUNCATION_SUFFIX));
      }
      setStatus('idle');
    }
    return;
  }
  const step = Math.max(DRIP_BASE_CHARS_PER_TICK, Math.ceil(backlog / DRIP_BACKLOG_DIVISOR));
  revealed = Math.min(fullText.length, revealed + step);
  const visible = fullText.slice(0, revealed);
  setMessages((cur) => withTrailingText(cur, visible));
};

function withTrailingText(cur: Msg[], text: string): Msg[] {
  const copy = cur.slice();
  const last = copy[copy.length - 1];
  if (!last || last.role !== 'assistant') return cur;
  // Keep all non-trailing-text segments; replace trailing-text with `text`.
  const segs = last.segments.slice();
  const lastSeg = segs[segs.length - 1];
  if (lastSeg && lastSeg.kind === 'text') segs[segs.length - 1] = { kind: 'text', text };
  else if (text) segs.push({ kind: 'text', text });
  copy[copy.length - 1] = { role: 'assistant', segments: segs };
  return copy;
}
```

Note: `withTrailingText` can live at module scope in `ChatPanel.tsx`.

- [ ] **Step 5: Run tests**

Run: `cd web && npx vitest run src/__tests__/ChatPanel.test.tsx`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/ChatPanel.tsx web/src/__tests__/ChatPanel.test.tsx
git commit -m "Extend SSE parser to yield tagged text/block/done/error frames"
```

---

### Task 2.4: Block dispatcher and OpenPanelChip

**Files:**
- Create: `web/src/components/blocks/index.tsx`
- Create: `web/src/components/blocks/OpenPanelChip.tsx`
- Test: `web/src/__tests__/blocks.dispatcher.test.tsx`
- Test: `web/src/__tests__/OpenPanelChip.test.tsx`

- [ ] **Step 1: Write failing tests for dispatcher and chip**

File: `web/src/__tests__/blocks.dispatcher.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Block } from '../components/blocks';
import type { BlockFrame } from '../blocks/types';

describe('Block dispatcher', () => {
  it('renders OpenPanelChip for open-panel', () => {
    const block: BlockFrame = { id: 'b1', type: 'open-panel', data: { panel: 'resume' } };
    render(<Block block={block} onOpenPanel={vi.fn()} />);
    expect(screen.getByTestId('open-panel-chip')).toBeInTheDocument();
  });

  it('silently drops unknown types', () => {
    const { container } = render(
      <Block block={{ id: 'b1', type: 'unknown' as never, data: {} as never }} onOpenPanel={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

File: `web/src/__tests__/OpenPanelChip.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OpenPanelChip } from '../components/blocks/OpenPanelChip';

describe('OpenPanelChip', () => {
  it('renders panel label and triggers onOpen on click', async () => {
    const onOpen = vi.fn();
    render(<OpenPanelChip panel="resume" onOpen={onOpen} />);
    const chip = screen.getByTestId('open-panel-chip');
    expect(chip).toHaveTextContent(/resume/i);
    await userEvent.click(chip);
    expect(onOpen).toHaveBeenCalledWith('resume');
  });

  it('renders activity chip', () => {
    render(<OpenPanelChip panel="activity" onOpen={vi.fn()} />);
    expect(screen.getByTestId('open-panel-chip')).toHaveTextContent(/activity/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/__tests__/blocks.dispatcher.test.tsx src/__tests__/OpenPanelChip.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement OpenPanelChip**

File: `web/src/components/blocks/OpenPanelChip.tsx`

```tsx
import type { OpenPanelData } from '../../blocks/types';

const LABEL: Record<OpenPanelData['panel'], string> = {
  resume: '📄 Resume',
  activity: '📊 Activity',
  jd: '📝 Job description',
};

export interface OpenPanelChipProps {
  panel: OpenPanelData['panel'];
  onOpen: (panel: OpenPanelData['panel']) => void;
}

export function OpenPanelChip({ panel, onOpen }: OpenPanelChipProps) {
  return (
    <button
      type="button"
      className="block-open-panel-chip"
      data-testid="open-panel-chip"
      onClick={() => onOpen(panel)}
    >
      {LABEL[panel]}
    </button>
  );
}
```

- [ ] **Step 4: Implement Block dispatcher**

File: `web/src/components/blocks/index.tsx`

```tsx
import type { BlockFrame, OpenPanelData } from '../../blocks/types';
import { OpenPanelChip } from './OpenPanelChip';

export interface BlockProps {
  block: BlockFrame;
  onOpenPanel: (panel: OpenPanelData['panel']) => void;
}

export function Block({ block, onOpenPanel }: BlockProps) {
  switch (block.type) {
    case 'open-panel':
      return <OpenPanelChip panel={block.data.panel} onOpen={onOpenPanel} />;
    default:
      // Silent drop for unknown types (future: repo-card, activity-summary, work-highlight land here in Phase 3).
      return null;
  }
}
```

- [ ] **Step 5: Add chip CSS**

Append to `web/src/components/ChatPanel.css`:

```css
.block-open-panel-chip {
  display: inline-block;
  border: 1px solid var(--border, #ddd);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  background: transparent;
  cursor: pointer;
  margin: 2px 4px;
}
.block-open-panel-chip:hover { background: var(--accent-dim, #f2f2f2); }
```

- [ ] **Step 6: Run tests**

Run: `cd web && npx vitest run src/__tests__/blocks.dispatcher.test.tsx src/__tests__/OpenPanelChip.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/blocks/ web/src/components/ChatPanel.css \
        web/src/__tests__/blocks.dispatcher.test.tsx web/src/__tests__/OpenPanelChip.test.tsx
git commit -m "Add Block dispatcher and OpenPanelChip renderer"
```

---

### Task 2.5: useSidePanel hook

**Files:**
- Create: `web/src/hooks/useSidePanel.ts`
- Test: `web/src/__tests__/useSidePanel.test.ts`

- [ ] **Step 1: Write failing test**

File: `web/src/__tests__/useSidePanel.test.ts`

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSidePanel } from '../hooks/useSidePanel';

describe('useSidePanel', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useSidePanel());
    expect(result.current.panel).toBeNull();
  });

  it('opens and closes', () => {
    const { result } = renderHook(() => useSidePanel());
    act(() => result.current.open('resume'));
    expect(result.current.panel).toBe('resume');
    act(() => result.current.close());
    expect(result.current.panel).toBeNull();
  });

  it('replaces panel when opened with a different view', () => {
    const { result } = renderHook(() => useSidePanel());
    act(() => result.current.open('resume'));
    act(() => result.current.open('activity'));
    expect(result.current.panel).toBe('activity');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/useSidePanel.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement hook**

File: `web/src/hooks/useSidePanel.ts`

```ts
import { useCallback, useState } from 'react';
import type { OpenPanelData } from '../blocks/types';

type Panel = OpenPanelData['panel'];

export interface UseSidePanel {
  panel: Panel | null;
  open: (panel: Panel) => void;
  close: () => void;
}

export function useSidePanel(): UseSidePanel {
  const [panel, setPanel] = useState<Panel | null>(null);
  const open = useCallback((p: Panel) => setPanel(p), []);
  const close = useCallback(() => setPanel(null), []);
  return { panel, open, close };
}
```

- [ ] **Step 4: Run tests**

Run: `cd web && npx vitest run src/__tests__/useSidePanel.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useSidePanel.ts web/src/__tests__/useSidePanel.test.ts
git commit -m "Add useSidePanel hook"
```

---

### Task 2.6: SidePanel component

**Files:**
- Create: `web/src/components/SidePanel.tsx`
- Create: `web/src/components/SidePanel.css`
- Test: `web/src/__tests__/SidePanel.test.tsx`

- [ ] **Step 1: Write failing test**

File: `web/src/__tests__/SidePanel.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SidePanel } from '../components/SidePanel';

const baseProps = {
  slug: 'default',
  adapted: { basics: { name: 'Verky Yi' } } as any,
  jd: 'Target role JD',
};

describe('SidePanel', () => {
  it('renders nothing when panel is null', () => {
    const { container } = render(<SidePanel panel={null} onClose={vi.fn()} {...baseProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders resume view with close button', async () => {
    const onClose = vi.fn();
    render(<SidePanel panel="resume" onClose={onClose} {...baseProps} />);
    expect(screen.getByTestId('side-panel')).toBeInTheDocument();
    expect(screen.getByTestId('side-panel-resume')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders JD view', () => {
    render(<SidePanel panel="jd" onClose={vi.fn()} {...baseProps} />);
    expect(screen.getByText('Target role JD')).toBeInTheDocument();
  });

  it('renders placeholder when jd panel requested without JD', () => {
    render(<SidePanel panel="jd" onClose={vi.fn()} {...baseProps} jd={null} />);
    expect(screen.getByTestId('side-panel-empty')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<SidePanel panel="resume" onClose={onClose} {...baseProps} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/SidePanel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement SidePanel**

File: `web/src/components/SidePanel.tsx`

```tsx
import { useEffect } from 'react';
import './SidePanel.css';
import { ResumeTheme } from './ResumeTheme';
import { GithubActivity, type ActivityData } from './GithubActivity';
import { JdView } from './JdView';
import type { OpenPanelData } from '../blocks/types';

export interface SidePanelProps {
  panel: OpenPanelData['panel'] | null;
  onClose: () => void;
  slug: string;
  adapted: Record<string, unknown> | null;
  activity?: ActivityData | null;
  jd: string | null;
}

export function SidePanel({ panel, onClose, adapted, activity, jd }: SidePanelProps) {
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, onClose]);

  if (!panel) return null;

  return (
    <>
      <div className="side-panel-backdrop" onClick={onClose} data-testid="side-panel-backdrop" />
      <aside className="side-panel" data-testid="side-panel" role="dialog" aria-label={`${panel} panel`}>
        <div className="side-panel-header">
          <span className="side-panel-title">{panel}</span>
          <button type="button" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="side-panel-body">
          {panel === 'resume' && adapted && (
            <div data-testid="side-panel-resume">
              <ResumeTheme resume={adapted} />
            </div>
          )}
          {panel === 'activity' && (
            <div data-testid="side-panel-activity">
              <GithubActivity data={activity ?? null} />
            </div>
          )}
          {panel === 'jd' && jd && <JdView markdown={jd} />}
          {panel === 'jd' && !jd && (
            <div data-testid="side-panel-empty" className="side-panel-empty">
              No job description available for this page.
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
```

File: `web/src/components/SidePanel.css`

```css
.side-panel-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 30;
}
.side-panel {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: min(480px, 100vw);
  background: var(--bg, #fff);
  border-left: 1px solid var(--border, #ddd);
  z-index: 31;
  display: flex; flex-direction: column;
  animation: side-panel-in 180ms ease-out;
}
@keyframes side-panel-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.side-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid var(--border, #ddd);
}
.side-panel-title { text-transform: capitalize; font-weight: 500; }
.side-panel-body { flex: 1; overflow-y: auto; padding: 16px; }
.side-panel-empty { opacity: 0.6; text-align: center; padding: 40px 12px; }
```

- [ ] **Step 4: Check JdView prop name**

Run: `grep -n "export function JdView\|interface JdViewProps\|markdown\|jd" web/src/components/JdView.tsx | head -20`

If `JdView` uses a different prop name (e.g., `content`, `source`), update the SidePanel call site AND the test's "Target role JD" assertion to match. Use whichever prop renders the markdown text.

- [ ] **Step 5: Run tests**

Run: `cd web && npx vitest run src/__tests__/SidePanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/SidePanel.tsx web/src/components/SidePanel.css web/src/__tests__/SidePanel.test.tsx
git commit -m "Add SidePanel component for resume/activity/jd views"
```

---

### Task 2.7: Wire SidePanel + Block dispatcher into App and ChatPanel

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/ChatPanel.tsx`
- Modify: `web/src/__tests__/App.test.tsx`

- [ ] **Step 1: Write failing test for panel-open behavior**

Append to `web/src/__tests__/App.test.tsx`:

```tsx
it('opens the resume side panel when chat streams an open-panel block', async () => {
  // Mock proxy to stream an open-panel block.
  const enc = new TextEncoder();
  const sseBody = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(enc.encode('event: text\ndata: {"delta":"See my resume: "}\n\n'));
      c.enqueue(enc.encode('event: block\ndata: {"id":"b1","type":"open-panel","data":{"panel":"resume"}}\n\n'));
      c.enqueue(enc.encode('event: done\ndata: {}\n\n'));
      c.close();
    },
  });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/data/adapted/')) return { ok: true, json: async () => mockAdapted } as unknown as Response;
    if (url.includes('/chat')) return { ok: true, body: sseBody } as unknown as Response;
    return { ok: false } as unknown as Response;
  }));
  // The test needs VITE_CHAT_PROXY_URL set. Stub import.meta.env via vi.stubEnv if supported,
  // otherwise rely on test-setup env — add to web/vitest.config.ts if needed.
  // @ts-expect-error mutate for test
  import.meta.env.VITE_CHAT_PROXY_URL = 'http://test-proxy';

  render(<App />);
  await waitFor(() => expect(screen.getByText('Verky Yi')).toBeInTheDocument());
  const input = screen.getByLabelText('Message') as HTMLInputElement;
  await userEvent.type(input, 'show resume');
  await userEvent.click(screen.getByRole('button', { name: /send/i }));
  await waitFor(() => expect(screen.getByTestId('side-panel')).toBeInTheDocument());
  expect(screen.getByTestId('side-panel-resume')).toBeInTheDocument();
});
```

Add `userEvent` + `waitFor` imports at the top if not already present.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/App.test.tsx -t "open-panel"`
Expected: FAIL — SidePanel not rendered.

- [ ] **Step 3: Thread onOpenPanel through ChatPanel**

In `web/src/components/ChatPanel.tsx`:

1. Add an optional prop:

```tsx
export interface ChatPanelProps {
  slug: string;
  ownerName: string;
  tagline?: string;
  email?: string;
  profiles?: { network: string; url: string }[];
  greeting?: string;
  suggestions?: string[];
  onOpenPanel?: (panel: 'resume' | 'activity' | 'jd') => void;
}
```

2. Replace the segments renderer (the placeholder `[block:...]` span from Task 2.3) with the real `<Block>` dispatcher:

```tsx
import { Block } from './blocks';

// inside the message map:
<span className="chatp-msg-body">
  {m.segments.map((seg, j) =>
    seg.kind === 'text' ? (
      <span key={j}>{seg.text}</span>
    ) : (
      <Block key={j} block={seg.block} onOpenPanel={(p) => onOpenPanel?.(p)} />
    )
  )}
</span>
```

3. When a `block` event of type `open-panel` arrives in the streaming loop, call `onOpenPanel?.(ev.block.data.panel)`:

```tsx
} else if (ev.kind === 'block') {
  // ...existing appendBlock code...
  if (ev.block.type === 'open-panel') {
    onOpenPanel?.(ev.block.data.panel);
  }
}
```

- [ ] **Step 4: Wire SidePanel in App.tsx**

In `web/src/App.tsx`, replace `ResumePage` with:

```tsx
function ResumePage() {
  const { adapted, error, slug } = useAdaptation();
  const sidePanel = useSidePanel();
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [jd, setJd] = useState<string | null>(null);

  useEffect(() => {
    if (adapted?.basics?.name) document.title = `${adapted.basics.name} — Resume`;
  }, [adapted]);

  // Fetch activity and JD lazily when side panel opens to them.
  useEffect(() => {
    if (sidePanel.panel === 'activity' && !activity) {
      fetch(`${import.meta.env.BASE_URL}data/github/activity.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: ActivityData | null) => setActivity(d))
        .catch(() => setActivity(null));
    }
    if (sidePanel.panel === 'jd' && jd === null && slug) {
      fetch(`${import.meta.env.BASE_URL}data/jd/${slug}.md`)
        .then((r) => (r.ok ? r.text() : null))
        .then((t) => setJd(t))
        .catch(() => setJd(null));
    }
  }, [sidePanel.panel, slug, activity, jd]);

  if (error) return /* ...unchanged 404... */;
  if (!adapted) return <main>Loading…</main>;

  const activeSlug = slug ?? 'default';
  const basics = (adapted.basics ?? {}) as IdentityBasics;
  const tagline = basics.summary ? firstSentence(basics.summary) : undefined;
  const agentMeta = adapted.meta?.agentfolio;
  const greeting = agentMeta?.greeting;
  const suggestions = agentMeta?.suggestions;

  return (
    <>
      <main>
        <Hero name={basics.name ?? ''} tagline={tagline} image={basics.image} />
        <ChatPanel
          key={activeSlug}
          slug={activeSlug}
          ownerName={basics.name ?? ''}
          tagline={tagline}
          email={basics.email}
          profiles={basics.profiles}
          greeting={greeting}
          suggestions={suggestions}
          onOpenPanel={sidePanel.open}
        />
      </main>
      <SidePanel
        panel={sidePanel.panel}
        onClose={sidePanel.close}
        slug={activeSlug}
        adapted={adapted as Record<string, unknown>}
        activity={activity}
        jd={jd}
      />
      <Footer />
    </>
  );
}
```

Add imports: `useSidePanel`, `SidePanel`, `useState`, `useEffect`, `ActivityData`.

- [ ] **Step 5: Ensure `data/jd/` is in `web/public`**

Run: `ls web/public/data/jd 2>/dev/null | head`

If the directory doesn't exist, update `web/scripts/copy-data.cjs` to also copy `data/input/jd/*.md` into `web/public/data/jd/`. Check the existing script first:

Run: `grep -n "jd" web/scripts/copy-data.cjs`

If it already copies to `public/data/jd/` or similar, match that path in the `fetch('/data/jd/...')` call. Otherwise add a copy step in `copy-data.cjs`:

```js
// Existing section that walks data/input/jd/ → public/data/jd/
const jdIn = path.join(root, 'data/input/jd');
const jdOut = path.join(root, 'web/public/data/jd');
if (fs.existsSync(jdIn)) {
  fs.mkdirSync(jdOut, { recursive: true });
  for (const f of fs.readdirSync(jdIn)) {
    if (f.endsWith('.md')) fs.copyFileSync(path.join(jdIn, f), path.join(jdOut, f));
  }
}
```

(If `copy-data.cjs` already handles this, skip.)

- [ ] **Step 6: Run tests**

Run: `cd web && npx vitest run`
Expected: all PASS (including the new App `open-panel` test).

- [ ] **Step 7: Commit**

```bash
git add web/src/App.tsx web/src/components/ChatPanel.tsx web/src/__tests__/App.test.tsx web/scripts/copy-data.cjs
git commit -m "Wire SidePanel and Block dispatcher into App and ChatPanel"
```

---

### Task 2.8: Worker — tool-use loop emitting framed SSE

**Files:**
- Create: `proxy/src/tools.ts`
- Create: `proxy/test/tools.test.ts`
- Modify: `proxy/src/anthropic.ts`
- Create: `proxy/test/anthropic.test.ts`

This is the largest task in the plan. Break into sub-steps.

- [ ] **Step 1: Write failing test for `tools.ts` (open_panel only for now)**

File: `proxy/test/tools.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { TOOL_DEFS, executeTool } from '../src/tools';

describe('TOOL_DEFS', () => {
  it('includes open_panel', () => {
    const names = TOOL_DEFS.map((t) => t.name);
    expect(names).toContain('open_panel');
  });
});

describe('executeTool open_panel', () => {
  it('returns ok and an open-panel display_block', async () => {
    const res = await executeTool('open_panel', { panel: 'resume' }, { slug: 'default' });
    expect(res.result).toEqual({ ok: true });
    expect(res.display_block).toEqual({
      id: expect.any(String),
      type: 'open-panel',
      data: { panel: 'resume' },
    });
  });

  it('rejects unknown panel', async () => {
    await expect(executeTool('open_panel', { panel: 'other' } as never, { slug: 'default' }))
      .rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd proxy && npx vitest run test/tools.test.ts`
Expected: FAIL — module `../src/tools` not found.

- [ ] **Step 3: Implement `tools.ts`**

File: `proxy/src/tools.ts`

```ts
import type { BlockFrame } from './blocks';

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'open_panel',
    description:
      'Opens a side panel in the visitor UI showing the full resume, full activity history, or the target job description. Call only when the visitor explicitly asks for the full resume, activity, or JD. Not for short answers.',
    input_schema: {
      type: 'object',
      properties: {
        panel: { type: 'string', enum: ['resume', 'activity', 'jd'] },
      },
      required: ['panel'],
    },
  },
];

export interface ToolContext {
  slug: string;
}

export interface ToolResult {
  result: unknown;
  display_block?: BlockFrame;
}

let blockCounter = 0;
function blockId(): string { return `blk_${++blockCounter}`; }

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  _ctx: ToolContext,
): Promise<ToolResult> {
  if (name === 'open_panel') {
    const panel = input.panel;
    if (panel !== 'resume' && panel !== 'activity' && panel !== 'jd') {
      throw new Error(`invalid panel: ${String(panel)}`);
    }
    return {
      result: { ok: true },
      display_block: { id: blockId(), type: 'open-panel', data: { panel } },
    };
  }
  throw new Error(`unknown tool: ${name}`);
}
```

- [ ] **Step 4: Run tests**

Run: `cd proxy && npx vitest run test/tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit tool scaffolding**

```bash
git add proxy/src/tools.ts proxy/test/tools.test.ts
git commit -m "Add open_panel tool definition and executor"
```

- [ ] **Step 6: Write failing test for anthropic loop**

File: `proxy/test/anthropic.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';
import { runToolLoop } from '../src/anthropic';

// Build a fake fetch that returns a pre-scripted Anthropic non-streaming message.
function mockClaude(responses: unknown[]) {
  let i = 0;
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    async json() { return responses[i++]; },
  } as unknown as Response));
}

describe('runToolLoop', () => {
  it('streams text frames for a plain response', async () => {
    const claude = mockClaude([
      {
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hello.' }],
      },
    ]);
    const frames: string[] = [];
    const writer = {
      write(f: string) { frames.push(f); },
      close() {},
    };
    await runToolLoop({
      claude, model: 'claude-haiku-4-5', apiKey: 'k',
      system: 'sys', messages: [{ role: 'user', content: 'hi' }],
      ctx: { slug: 'default' }, writer,
    });
    expect(frames).toContain('event: text\ndata: {"delta":"Hello."}\n\n');
    expect(frames[frames.length - 1]).toBe('event: done\ndata: {}\n\n');
  });

  it('emits block frame for open_panel tool_use', async () => {
    const claude = mockClaude([
      {
        id: 'msg_1',
        stop_reason: 'tool_use',
        content: [
          { type: 'text', text: 'Here → ' },
          { type: 'tool_use', id: 'tu_1', name: 'open_panel', input: { panel: 'resume' } },
        ],
      },
      {
        id: 'msg_2',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'See the panel.' }],
      },
    ]);
    const frames: string[] = [];
    const writer = { write(f: string) { frames.push(f); }, close() {} };
    await runToolLoop({
      claude, model: 'claude-haiku-4-5', apiKey: 'k',
      system: 'sys', messages: [{ role: 'user', content: 'resume' }],
      ctx: { slug: 'default' }, writer,
    });
    const joined = frames.join('');
    expect(joined).toContain('event: text\ndata: {"delta":"Here → "}\n\n');
    expect(joined).toContain('"type":"open-panel"');
    expect(joined).toContain('"panel":"resume"');
    expect(joined).toContain('event: text\ndata: {"delta":"See the panel."}\n\n');
    expect(frames[frames.length - 1]).toBe('event: done\ndata: {}\n\n');
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd proxy && npx vitest run test/anthropic.test.ts`
Expected: FAIL — `runToolLoop` not exported.

- [ ] **Step 8: Replace `anthropic.ts` with tool-loop implementation**

Note: the current `anthropic.ts` returns a streaming `Response` (pass-through). We switch to **non-streaming** Claude requests in a loop. This is a deliberate trade — the tool loop is much simpler non-streaming, and latency is acceptable for the portfolio use case. A future optimization can stream within each round; out of scope here.

Replace `proxy/src/anthropic.ts` with:

```ts
import { buildSystemPrompt, extractTarget, type PromptInputs } from './prompt';
import type { SlugContext } from './context';
import { TOOL_DEFS, executeTool, type ToolContext } from './tools';

export interface CallInputs {
  apiKey: string;
  model: string;
  slug: string;
  name: string;
  ctx: SlugContext;
  messages: { role: 'user' | 'assistant'; content: string }[];
  greeting?: string;
  signal?: AbortSignal;
}

export interface LoopWriter {
  write(frame: string): void | Promise<void>;
  close(): void | Promise<void>;
}

export interface ToolLoopInputs {
  claude: typeof fetch; // injectable for tests
  apiKey: string;
  model: string;
  system: string;
  messages: { role: 'user' | 'assistant'; content: unknown }[];
  ctx: ToolContext;
  writer: LoopWriter;
  signal?: AbortSignal;
}

const MAX_ROUNDS = 8;

function sseText(delta: string): string {
  return `event: text\ndata: ${JSON.stringify({ delta })}\n\n`;
}
function sseBlock(block: unknown): string {
  return `event: block\ndata: ${JSON.stringify(block)}\n\n`;
}
function sseError(message: string): string {
  return `event: error\ndata: ${JSON.stringify({ message })}\n\n`;
}
const SSE_DONE = 'event: done\ndata: {}\n\n';

export async function runToolLoop(inputs: ToolLoopInputs): Promise<void> {
  const { claude, apiKey, model, system, ctx, writer, signal } = inputs;
  const history = inputs.messages.slice();

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const resp = await claude('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          tools: TOOL_DEFS,
          messages: history,
        }),
        signal,
      });
      if (!resp.ok) {
        await writer.write(sseError(`upstream_${resp.status}`));
        return;
      }
      const body = await resp.json() as {
        stop_reason: string;
        content: Array<
          | { type: 'text'; text: string }
          | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
        >;
      };

      // Emit text and run tool calls in wire order.
      const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];
      for (const block of body.content) {
        if (block.type === 'text') {
          await writer.write(sseText(block.text));
        } else if (block.type === 'tool_use') {
          try {
            const { result, display_block } = await executeTool(block.name, block.input, ctx);
            if (display_block) await writer.write(sseBlock(display_block));
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (e) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: String((e as Error).message) }),
            });
          }
        }
      }

      if (body.stop_reason !== 'tool_use' || toolResults.length === 0) {
        break;
      }
      // Feed tool results back to Claude.
      history.push({ role: 'assistant', content: body.content });
      history.push({ role: 'user', content: toolResults });
    }
    await writer.write(SSE_DONE);
  } catch (e) {
    await writer.write(sseError(String((e as Error).message)));
  } finally {
    await writer.close();
  }
}

// Backward-compatible entry called from worker.ts: returns a streaming Response.
export async function callAnthropic(inputs: CallInputs): Promise<Response> {
  const target = extractTarget(inputs.ctx.fitted, inputs.slug);
  const promptInputs: PromptInputs = {
    name: inputs.name,
    target,
    fitted: inputs.ctx.fitted,
    directives: inputs.ctx.directives,
    jd: inputs.ctx.jd,
    greeting: inputs.greeting,
  };
  const system = buildSystemPrompt(promptInputs);

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const encoder = new TextEncoder();
  const w = writable.getWriter();
  const writer: LoopWriter = {
    write: (f) => w.write(encoder.encode(f)).then(() => undefined),
    close: () => w.close(),
  };

  // Kick off the loop without awaiting so the Response body streams to the client.
  runToolLoop({
    claude: fetch,
    apiKey: inputs.apiKey,
    model: inputs.model,
    system,
    messages: inputs.messages,
    ctx: { slug: inputs.slug },
    writer,
    signal: inputs.signal,
  }).catch(() => { /* loop handles its own errors */ });

  return new Response(readable, { status: 200 });
}
```

- [ ] **Step 9: Run both test files**

Run: `cd proxy && npx vitest run test/anthropic.test.ts test/tools.test.ts`
Expected: PASS.

- [ ] **Step 10: Run full proxy test suite to confirm no regressions**

Run: `cd proxy && npx vitest run`
Expected: All PASS. The worker-level tests (`worker.test.ts`) may need updates if they asserted on the old pass-through SSE format — if a test breaks, update the assertion to expect the new `event: text` / `event: done` frames (or mock `callAnthropic` directly).

- [ ] **Step 11: Commit**

```bash
git add proxy/src/anthropic.ts proxy/test/anthropic.test.ts proxy/test/worker.test.ts
git commit -m "Run Anthropic via tool-use loop, emit framed SSE"
```

---

### Task 2.9: Extend system prompt with tool guidance

**Files:**
- Modify: `proxy/src/prompt.ts`
- Modify: `proxy/test/prompt.test.ts`

- [ ] **Step 1: Write failing test**

Append to `proxy/test/prompt.test.ts`:

```ts
it('includes tool guidance for open_panel', () => {
  const prompt = buildSystemPrompt({
    name: 'Verky', target: 'FDE', fitted: '# resume', directives: null, jd: null,
  });
  expect(prompt).toMatch(/open_panel/);
  expect(prompt).toMatch(/explicitly ask/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd proxy && npx vitest run test/prompt.test.ts -t "tool guidance"`
Expected: FAIL.

- [ ] **Step 3: Add tool guidance to prompt**

In `proxy/src/prompt.ts`, in `buildSystemPrompt` (within the `parts` array), append:

```ts
parts.push('');
parts.push('Tool guidance:');
parts.push('- You have tools available. Prefer calling tools over paraphrasing from memory when the question is about recent activity, a specific repo, or a specific work experience.');
parts.push('- Use `open_panel` ONLY when the visitor explicitly asks to see the full resume, the full activity history, or the target job description. Do not call it proactively.');
```

- [ ] **Step 4: Run tests**

Run: `cd proxy && npx vitest run test/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Phase 2**

```bash
git add proxy/src/prompt.ts proxy/test/prompt.test.ts
git commit -m "Add tool guidance to system prompt"
```

**Phase 2 ships. Visitors who ask for the full resume get a slide-out panel with a re-open chip.**

---

## Phase 3 — Data tools and inline block renderers

Goal: three data tools with their inline renderers so the agent can show recent activity, specific repos, and work highlights without opening the panel.

### Task 3.1: Bundle data into the Worker

**Files:**
- Create: `proxy/src/bundledData.ts`
- Create: `proxy/test/bundledData.test.ts`

- [ ] **Step 1: Decide bundling mechanism**

Wrangler supports `rules` to import `.json` and `.md` as modules. Extend `proxy/wrangler.toml`:

```toml
rules = [
  { type = "Text", globs = ["**/*.md"], fallthrough = true },
  { type = "Data", globs = ["**/*.json"], fallthrough = true },
]
```

`import activity from '../../data/github/activity.json'` now returns the parsed JSON at bundle time. `import jdText from '../../data/input/jd/foo.md'` returns the markdown string.

- [ ] **Step 2: Write failing test for bundledData**

File: `proxy/test/bundledData.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../data/github/activity.json', () => ({
  default: { generatedAt: '2026-04-01', repos: [{ name: 'AgentFolio', commits: [1, 2, 3], url: 'https://github.com/v/a' }] },
}));

describe('bundledData.getActivity', () => {
  it('returns the imported activity data', async () => {
    const { getActivity } = await import('../src/bundledData');
    const a = getActivity();
    expect(a.repos[0].name).toBe('AgentFolio');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd proxy && npx vitest run test/bundledData.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement bundledData**

File: `proxy/src/bundledData.ts`

```ts
// @ts-expect-error - Wrangler JSON import
import activity from '../../data/github/activity.json';

export interface RepoActivity {
  name: string;
  description?: string;
  url: string;
  primaryLang?: string;
  commits: number[]; // daily commit counts, oldest → newest
}

export interface ActivityBundle {
  generatedAt: string;
  repos: RepoActivity[];
}

export function getActivity(): ActivityBundle {
  return activity as ActivityBundle;
}
```

Check the real shape of `data/github/activity.json` before locking this in:

Run: `head -80 data/github/activity.json`

Adapt the `RepoActivity` / `ActivityBundle` interfaces to match the actual file's shape. If the field names differ (e.g., `repos` vs `repositories`), use the real names.

- [ ] **Step 5: Run tests**

Run: `cd proxy && npx vitest run test/bundledData.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add proxy/src/bundledData.ts proxy/test/bundledData.test.ts proxy/wrangler.toml
git commit -m "Bundle activity.json into the Worker for server-side tools"
```

---

### Task 3.2: Add `get_recent_activity` tool

**Files:**
- Modify: `proxy/src/tools.ts`
- Modify: `proxy/test/tools.test.ts`

- [ ] **Step 1: Write failing test**

Append to `proxy/test/tools.test.ts`:

```ts
import { vi } from 'vitest';
vi.mock('../src/bundledData', () => ({
  getActivity: () => ({
    generatedAt: '2026-04-01',
    repos: [
      { name: 'AgentFolio', url: 'https://github.com/v/a', commits: Array.from({ length: 30 }, (_, i) => (i < 15 ? 0 : 2)) },
      { name: 'Other', url: 'https://github.com/v/o', commits: Array.from({ length: 30 }, () => 1) },
    ],
  }),
}));

describe('get_recent_activity', () => {
  it('aggregates commits and returns an activity-summary block', async () => {
    const res = await executeTool('get_recent_activity', { window: '30d' }, { slug: 'default' });
    expect(res.display_block).toMatchObject({ type: 'activity-summary' });
    const data = (res.display_block as any).data;
    expect(data.window).toBe('30d');
    expect(data.totalCommits).toBeGreaterThan(0);
    expect(Array.isArray(data.topRepos)).toBe(true);
    expect(data.sparkline.length).toBe(30);
  });

  it('defaults to 30d', async () => {
    const res = await executeTool('get_recent_activity', {}, { slug: 'default' });
    expect((res.display_block as any).data.window).toBe('30d');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd proxy && npx vitest run test/tools.test.ts -t "get_recent_activity"`
Expected: FAIL.

- [ ] **Step 3: Add tool definition and handler**

In `proxy/src/tools.ts`:

1. Append to `TOOL_DEFS`:

```ts
{
  name: 'get_recent_activity',
  description: 'Summarizes GitHub activity over a recent window. Returns total commits, top repos, and a daily sparkline.',
  input_schema: {
    type: 'object',
    properties: {
      window: { type: 'string', enum: ['30d', '90d'] },
    },
  },
},
```

2. Add import at top:

```ts
import { getActivity } from './bundledData';
```

3. Add handler branch in `executeTool`:

```ts
if (name === 'get_recent_activity') {
  const window = (input.window === '90d' ? '90d' : '30d') as '30d' | '90d';
  const days = window === '90d' ? 90 : 30;
  const activity = getActivity();
  const repos = activity.repos.map((r) => {
    const recent = r.commits.slice(-days);
    const total = recent.reduce((a, b) => a + b, 0);
    return { name: r.name, commits: total, recent };
  });
  const total = repos.reduce((a, r) => a + r.commits, 0);
  const topRepos = repos
    .filter((r) => r.commits > 0)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 3)
    .map(({ name, commits }) => ({ name, commits }));
  const sparkline = Array.from({ length: days }, (_, i) =>
    repos.reduce((sum, r) => sum + (r.recent[i] ?? 0), 0),
  );
  const data = { window, totalCommits: total, topRepos, sparkline };
  return {
    result: data,
    display_block: { id: blockId(), type: 'activity-summary', data },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd proxy && npx vitest run test/tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add proxy/src/tools.ts proxy/test/tools.test.ts
git commit -m "Add get_recent_activity tool"
```

---

### Task 3.3: Add `get_repo_highlight` tool

**Files:**
- Modify: `proxy/src/tools.ts`
- Modify: `proxy/test/tools.test.ts`

- [ ] **Step 1: Write failing test**

Append to `proxy/test/tools.test.ts`:

```ts
describe('get_repo_highlight', () => {
  it('returns a repo-card for a known repo', async () => {
    const res = await executeTool('get_repo_highlight', { repo: 'AgentFolio' }, { slug: 'default' });
    expect(res.display_block).toMatchObject({
      type: 'repo-card',
      data: { name: 'AgentFolio', url: 'https://github.com/v/a' },
    });
  });

  it('throws on unknown repo', async () => {
    await expect(executeTool('get_repo_highlight', { repo: 'Missing' }, { slug: 'default' }))
      .rejects.toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd proxy && npx vitest run test/tools.test.ts -t "get_repo_highlight"`
Expected: FAIL.

- [ ] **Step 3: Add tool**

In `proxy/src/tools.ts`:

1. Append to `TOOL_DEFS`:

```ts
{
  name: 'get_repo_highlight',
  description: 'Look up a specific GitHub repo and return a highlight card with recent commit count and sparkline.',
  input_schema: {
    type: 'object',
    properties: { repo: { type: 'string' } },
    required: ['repo'],
  },
},
```

2. Add handler:

```ts
if (name === 'get_repo_highlight') {
  const repoName = typeof input.repo === 'string' ? input.repo : '';
  const activity = getActivity();
  const match = activity.repos.find((r) => r.name.toLowerCase() === repoName.toLowerCase());
  if (!match) throw new Error(`repo not found: ${repoName}`);
  const recent = match.commits.slice(-30);
  const data = {
    name: match.name,
    description: match.description ?? '',
    commits: recent.reduce((a, b) => a + b, 0),
    sparkline: recent,
    url: match.url,
    primaryLang: match.primaryLang,
  };
  return {
    result: data,
    display_block: { id: blockId(), type: 'repo-card', data },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd proxy && npx vitest run test/tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add proxy/src/tools.ts proxy/test/tools.test.ts
git commit -m "Add get_repo_highlight tool"
```

---

### Task 3.4: Add `get_work_highlight` tool

**Files:**
- Modify: `proxy/src/tools.ts`
- Modify: `proxy/src/context.ts` (expose adapted JSON)
- Modify: `proxy/test/tools.test.ts`

- [ ] **Step 1: Check context.ts shape**

Run: `cat proxy/src/context.ts`

Note whether `SlugContext` already exposes `adapted` JSON or only `fitted` markdown. If it's markdown-only, add a loader for adapted JSON — the work-highlight tool needs structured `work[]` entries.

- [ ] **Step 2: Extend context to load adapted JSON**

If `SlugContext` lacks `adapted`, add it. File: `proxy/src/context.ts` — add field:

```ts
export interface SlugContext {
  fitted: string;
  directives: string | null;
  jd: string | null;
  adapted: { basics?: Record<string, unknown>; work?: Array<Record<string, unknown>> } | null;
}
```

In `loadSlugContext`, also fetch `${pagesOrigin}/data/adapted/${slug}.json` and attach (or null on 404).

Add matching test coverage in `proxy/test/context.test.ts` — one happy path, one 404 case — following the existing test patterns in that file.

- [ ] **Step 3: Thread `ctx` into `executeTool`**

Currently `executeTool(name, input, ctx)` receives only `{slug}`. To access adapted JSON, extend `ToolContext`:

```ts
export interface ToolContext {
  slug: string;
  adapted?: { work?: Array<Record<string, unknown>> } | null;
}
```

Update `runToolLoop` signature in `anthropic.ts` to accept and forward `adapted`:

```ts
export interface ToolLoopInputs {
  // ...existing fields...
  ctx: ToolContext;
}
```

In `callAnthropic`, pass `ctx: { slug: inputs.slug, adapted: inputs.ctx.adapted }`.

- [ ] **Step 4: Write failing test**

Append to `proxy/test/tools.test.ts`:

```ts
describe('get_work_highlight', () => {
  const ctx = {
    slug: 'default',
    adapted: {
      work: [
        {
          name: 'Acme',
          position: 'Staff Engineer',
          startDate: '2022-01',
          endDate: '2024-06',
          highlights: ['Led agent platform', 'Scaled infra 10x', 'Mentored 4 engineers', 'Shipped tool-use SDK'],
        },
      ],
    },
  };

  it('returns a work-highlight block for a matching company', async () => {
    const res = await executeTool('get_work_highlight', { company: 'Acme', focus: 'agents' }, ctx);
    expect(res.display_block).toMatchObject({
      type: 'work-highlight',
      data: { company: 'Acme', role: 'Staff Engineer' },
    });
    const bullets = (res.display_block as any).data.bullets;
    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets.length).toBeLessThanOrEqual(4);
  });

  it('throws on unknown company', async () => {
    await expect(executeTool('get_work_highlight', { company: 'Nope', focus: '' }, ctx))
      .rejects.toThrow(/not found/i);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd proxy && npx vitest run test/tools.test.ts -t "get_work_highlight"`
Expected: FAIL.

- [ ] **Step 6: Add tool**

In `proxy/src/tools.ts`:

1. Append to `TOOL_DEFS`:

```ts
{
  name: 'get_work_highlight',
  description: 'Look up a specific work experience entry (by company) from the resume. Claude filters bullets for the visitor\'s focus in the text response; this tool returns up to 4 raw bullets.',
  input_schema: {
    type: 'object',
    properties: {
      company: { type: 'string' },
      focus: { type: 'string' },
    },
    required: ['company'],
  },
},
```

2. Add handler:

```ts
if (name === 'get_work_highlight') {
  const company = typeof input.company === 'string' ? input.company : '';
  const work = _ctx.adapted?.work ?? [];
  const match = work.find((w) => {
    const n = (w.name ?? w.company) as string | undefined;
    return typeof n === 'string' && n.toLowerCase() === company.toLowerCase();
  });
  if (!match) throw new Error(`work entry not found: ${company}`);
  const period = [match.startDate, match.endDate].filter(Boolean).join(' – ');
  const rawBullets = Array.isArray(match.highlights) ? (match.highlights as string[]) : [];
  const bullets = rawBullets.slice(0, 4);
  const data = {
    company,
    role: (match.position as string) ?? '',
    period,
    bullets,
  };
  return {
    result: data,
    display_block: { id: blockId(), type: 'work-highlight', data },
  };
}
```

- [ ] **Step 7: Run tests**

Run: `cd proxy && npx vitest run test/tools.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add proxy/src/tools.ts proxy/src/context.ts proxy/src/anthropic.ts \
        proxy/test/tools.test.ts proxy/test/context.test.ts proxy/src/worker.ts
git commit -m "Add get_work_highlight tool, thread adapted JSON through ToolContext"
```

---

### Task 3.5: RepoCard renderer

**Files:**
- Create: `web/src/components/blocks/RepoCard.tsx`
- Create: `web/src/components/blocks/RepoCard.css`
- Test: `web/src/__tests__/RepoCard.test.tsx`

- [ ] **Step 1: Write failing test**

File: `web/src/__tests__/RepoCard.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RepoCard } from '../components/blocks/RepoCard';

describe('RepoCard', () => {
  it('renders name, description, commit count, and link', () => {
    render(
      <RepoCard
        data={{
          name: 'AgentFolio',
          description: 'Agent-native portfolio engine',
          commits: 47,
          sparkline: [1, 2, 3, 4, 5],
          url: 'https://github.com/v/a',
        }}
      />
    );
    expect(screen.getByText('AgentFolio')).toBeInTheDocument();
    expect(screen.getByText(/agent-native portfolio/i)).toBeInTheDocument();
    expect(screen.getByText(/47 commits/i)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://github.com/v/a');
  });

  it('renders without commits or sparkline', () => {
    render(<RepoCard data={{ name: 'X', description: '', url: 'https://x' }} />);
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/RepoCard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement RepoCard**

File: `web/src/components/blocks/RepoCard.tsx`

```tsx
import type { RepoCardData } from '../../blocks/types';
import './RepoCard.css';

export interface RepoCardProps { data: RepoCardData }

export function RepoCard({ data }: RepoCardProps) {
  const max = data.sparkline && Math.max(1, ...data.sparkline);
  return (
    <a className="block-repo-card" href={data.url} target="_blank" rel="noreferrer">
      <div className="block-repo-card-head">
        <span className="block-repo-card-name">{data.name}</span>
        {typeof data.commits === 'number' && (
          <span className="block-repo-card-commits">{data.commits} commits</span>
        )}
      </div>
      {data.description && <div className="block-repo-card-desc">{data.description}</div>}
      {data.sparkline && data.sparkline.length > 0 && (
        <div className="block-repo-card-spark" aria-hidden="true">
          {data.sparkline.map((v, i) => (
            <span key={i} style={{ height: `${(v / (max ?? 1)) * 100}%` }} />
          ))}
        </div>
      )}
    </a>
  );
}
```

File: `web/src/components/blocks/RepoCard.css`

```css
.block-repo-card {
  display: block;
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  padding: 10px 12px;
  margin: 6px 0;
  color: inherit;
  text-decoration: none;
}
.block-repo-card:hover { background: var(--accent-dim, #f8f8f8); }
.block-repo-card-head { display: flex; justify-content: space-between; font-weight: 500; }
.block-repo-card-commits { font-weight: 400; opacity: 0.6; font-size: 12px; }
.block-repo-card-desc { font-size: 12px; opacity: 0.75; margin-top: 2px; }
.block-repo-card-spark { display: flex; gap: 2px; align-items: flex-end; height: 20px; margin-top: 6px; }
.block-repo-card-spark span { flex: 1; background: var(--accent, #3aa); min-height: 1px; }
```

- [ ] **Step 4: Add to dispatcher**

In `web/src/components/blocks/index.tsx`, add:

```tsx
import { RepoCard } from './RepoCard';

// in the switch:
case 'repo-card':
  return <RepoCard data={block.data} />;
```

- [ ] **Step 5: Run tests**

Run: `cd web && npx vitest run src/__tests__/RepoCard.test.tsx src/__tests__/blocks.dispatcher.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/blocks/RepoCard.tsx web/src/components/blocks/RepoCard.css \
        web/src/components/blocks/index.tsx web/src/__tests__/RepoCard.test.tsx
git commit -m "Add RepoCard block renderer"
```

---

### Task 3.6: ActivitySummary renderer

**Files:**
- Create: `web/src/components/blocks/ActivitySummary.tsx`
- Create: `web/src/components/blocks/ActivitySummary.css`
- Test: `web/src/__tests__/ActivitySummary.test.tsx`

- [ ] **Step 1: Write failing test**

File: `web/src/__tests__/ActivitySummary.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivitySummary } from '../components/blocks/ActivitySummary';

describe('ActivitySummary', () => {
  it('renders total commits, window, and top repos', () => {
    render(
      <ActivitySummary
        data={{
          window: '30d',
          totalCommits: 42,
          topRepos: [{ name: 'AgentFolio', commits: 27 }, { name: 'Other', commits: 15 }],
          sparkline: [1, 2, 3, 4, 5],
        }}
      />
    );
    expect(screen.getByText(/42 commits/i)).toBeInTheDocument();
    expect(screen.getByText(/30 day/i)).toBeInTheDocument();
    expect(screen.getByText('AgentFolio')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/ActivitySummary.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement ActivitySummary**

File: `web/src/components/blocks/ActivitySummary.tsx`

```tsx
import type { ActivitySummaryData } from '../../blocks/types';
import './ActivitySummary.css';

export interface ActivitySummaryProps { data: ActivitySummaryData }

export function ActivitySummary({ data }: ActivitySummaryProps) {
  const max = Math.max(1, ...data.sparkline);
  const windowLabel = data.window === '90d' ? '90 days' : '30 day';
  return (
    <div className="block-activity-summary">
      <div className="block-activity-head">
        <span>
          <strong>{data.totalCommits} commits</strong> · last {windowLabel}
        </span>
      </div>
      <div className="block-activity-spark" aria-hidden="true">
        {data.sparkline.map((v, i) => (
          <span key={i} style={{ height: `${(v / max) * 100}%` }} />
        ))}
      </div>
      <ul className="block-activity-repos">
        {data.topRepos.map((r) => (
          <li key={r.name}>
            <span>{r.name}</span>
            <span className="block-activity-repo-count">{r.commits}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

File: `web/src/components/blocks/ActivitySummary.css`

```css
.block-activity-summary {
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  padding: 10px 12px;
  margin: 6px 0;
}
.block-activity-head { font-size: 13px; }
.block-activity-spark { display: flex; gap: 2px; align-items: flex-end; height: 28px; margin: 8px 0; }
.block-activity-spark span { flex: 1; background: var(--accent, #3aa); min-height: 1px; }
.block-activity-repos { list-style: none; padding: 0; margin: 0; font-size: 12px; }
.block-activity-repos li { display: flex; justify-content: space-between; padding: 2px 0; }
.block-activity-repo-count { opacity: 0.6; }
```

- [ ] **Step 4: Add to dispatcher**

In `web/src/components/blocks/index.tsx`:

```tsx
import { ActivitySummary } from './ActivitySummary';

// in the switch:
case 'activity-summary':
  return <ActivitySummary data={block.data} />;
```

- [ ] **Step 5: Run tests**

Run: `cd web && npx vitest run src/__tests__/ActivitySummary.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/blocks/ActivitySummary.tsx web/src/components/blocks/ActivitySummary.css \
        web/src/components/blocks/index.tsx web/src/__tests__/ActivitySummary.test.tsx
git commit -m "Add ActivitySummary block renderer"
```

---

### Task 3.7: WorkHighlight renderer

**Files:**
- Create: `web/src/components/blocks/WorkHighlight.tsx`
- Create: `web/src/components/blocks/WorkHighlight.css`
- Test: `web/src/__tests__/WorkHighlight.test.tsx`

- [ ] **Step 1: Write failing test**

File: `web/src/__tests__/WorkHighlight.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkHighlight } from '../components/blocks/WorkHighlight';

describe('WorkHighlight', () => {
  it('renders company, role, period, and bullets', () => {
    render(
      <WorkHighlight
        data={{
          company: 'Acme',
          role: 'Staff Engineer',
          period: '2022-01 – 2024-06',
          bullets: ['Built X', 'Scaled Y', 'Mentored Z'],
        }}
      />
    );
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText('2022-01 – 2024-06')).toBeInTheDocument();
    expect(screen.getByText('Built X')).toBeInTheDocument();
    expect(screen.getByText('Scaled Y')).toBeInTheDocument();
    expect(screen.getByText('Mentored Z')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/__tests__/WorkHighlight.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement WorkHighlight**

File: `web/src/components/blocks/WorkHighlight.tsx`

```tsx
import type { WorkHighlightData } from '../../blocks/types';
import './WorkHighlight.css';

export interface WorkHighlightProps { data: WorkHighlightData }

export function WorkHighlight({ data }: WorkHighlightProps) {
  return (
    <div className="block-work-highlight">
      <div className="block-work-head">
        <strong>{data.company}</strong>
        <span className="block-work-role"> · {data.role}</span>
        <span className="block-work-period">{data.period}</span>
      </div>
      <ul className="block-work-bullets">
        {data.bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  );
}
```

File: `web/src/components/blocks/WorkHighlight.css`

```css
.block-work-highlight {
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  padding: 10px 12px;
  margin: 6px 0;
}
.block-work-head { font-size: 13px; display: flex; flex-wrap: wrap; gap: 4px; align-items: baseline; }
.block-work-role { opacity: 0.8; }
.block-work-period { margin-left: auto; opacity: 0.5; font-size: 11px; }
.block-work-bullets { margin: 6px 0 0; padding-left: 18px; font-size: 12px; }
.block-work-bullets li { margin: 2px 0; }
```

- [ ] **Step 4: Add to dispatcher**

In `web/src/components/blocks/index.tsx`:

```tsx
import { WorkHighlight } from './WorkHighlight';

// in the switch:
case 'work-highlight':
  return <WorkHighlight data={block.data} />;
```

- [ ] **Step 5: Run tests**

Run: `cd web && npx vitest run src/__tests__/WorkHighlight.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/blocks/WorkHighlight.tsx web/src/components/blocks/WorkHighlight.css \
        web/src/components/blocks/index.tsx web/src/__tests__/WorkHighlight.test.tsx
git commit -m "Add WorkHighlight block renderer"
```

---

### Task 3.8: End-to-end verification

- [ ] **Step 1: Run full suite**

Run:

```bash
cd /home/dev/projects/agentfolio
(cd web && npx vitest run)
(cd proxy && npx vitest run)
```

Expected: both green.

- [ ] **Step 2: Run typecheck**

Run: `cd web && npx tsc -b`
Expected: no errors.

Run: `cd proxy && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the Playwright suite**

Run: `cd web && npm run build && npx playwright test`
Expected: PASS. If existing E2E tests depended on ResumeTheme / GithubActivity being on `/`, update them to either (a) assert on `Hero` + `ChatPanel` instead, or (b) drive a chat message that opens the side panel and assert on the panel.

- [ ] **Step 4: Smoke test dev server**

Run: `cd web && npm run dev` (requires the proxy deployed with the new tool loop, or a local wrangler dev at `cd proxy && npm run dev`).

Verify in browser:
1. `/` shows hero + chat, no resume/activity below.
2. Send "show me your recent GitHub work" → agent calls `get_recent_activity`, an `ActivitySummary` card appears inline.
3. Send "tell me about AgentFolio" → agent calls `get_repo_highlight`, a `RepoCard` appears inline.
4. Send "show me your full resume" → agent calls `open_panel`, side panel slides in from the right with the full `ResumeTheme`. An inline chip appears in the message. Close with ✕ / backdrop / Escape. Click the chip → panel re-opens.
5. Visit `/anthropic-fde-nyc` → hero shows that slug's greeting/suggestions; chat is primed with that JD.

- [ ] **Step 5: Commit any E2E fixes**

```bash
git add web/e2e
git commit -m "Update E2E tests for agent-first landing"
```

---

## Self-review notes

Spec coverage:
- Hero → Task 1.1, 1.4
- Content surfacing (hybrid cards + side panel) → 2.4, 2.5, 2.6, 2.7, 3.5–3.7
- Slug personas → preserved via existing `useAdaptation` + prompt builder (2.9)
- No escape hatch → enforced by 1.4 (no link added; resume only via chat)
- Typed blocks → 2.1, 2.4
- SSE frames (text/block/done/error) → 2.3, 2.8
- Silent drop unknown types → 2.4
- `open-panel` visible chip → 2.4
- Scroll-away hero → 1.1 CSS (no position sticky)
- Server-side tools, Anthropic tool-use loop → 2.8
- Four tools: `open_panel` (2.8), `get_recent_activity` (3.2), `get_repo_highlight` (3.3), `get_work_highlight` (3.4)
- System prompt tool guidance → 2.9
- Bundle activity + adapted into Worker → 3.1, 3.4
- Testing strategy (SSE parser, segment model, renderers, SidePanel, tools, E2E) → covered across phases
- Rollout three-phase → plan is split into Phase 1 / 2 / 3

Gap check: the spec mentions bundling `data/input/jd/*.md` into the Worker. The plan currently loads JDs in the browser for the `jd` panel (2.7 step 5) and in `loadSlugContext` server-side (unchanged from current behavior). Worker-side JD bundling is not needed for the current tool set — `jd` only surfaces via `open_panel` which is a no-op server-side. The browser fetches JD directly from `/data/jd/*.md`. This is a deliberate simplification; flag if the spec should be updated or if a later feature needs JD server-side.
