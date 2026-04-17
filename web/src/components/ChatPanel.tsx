import { useEffect, useRef, useState } from 'react';
import './ChatPanel.css';

type Role = 'user' | 'assistant';
interface Msg { role: Role; content: string }
type Status = 'idle' | 'streaming' | 'error';

export interface ChatPanelProps {
  slug: string;
  target: string;
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

export function ChatPanel({ slug, target, email, profiles }: ChatPanelProps) {
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
          <span>· chat</span>
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
        <span>· chat · context: {target}</span>
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
          <span className="chatp-prompt">&gt;</span> Hey — I'm an agent that knows this résumé cold. Ask me about the work and I'll keep it relevant to the {target} context.
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
