import { useEffect, useRef, useState } from 'react';
import './ChatWidget.css';

export interface ChatWidgetProps {
  slug: string;
  target: string;
}

type Role = 'user' | 'assistant';
interface Msg { role: Role; content: string }
type Status = 'idle' | 'streaming' | 'error';

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
        // ignore non-JSON frames (e.g. pings)
      }
    }
  }
}

export function ChatWidget({ slug, target }: ChatWidgetProps) {
  const proxyUrl = import.meta.env.VITE_CHAT_PROXY_URL as string | undefined;
  const [open, setOpen] = useState(false);
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

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (messages.length === 0) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setStatus('idle');
    sessionStorage.removeItem(storageKey);
  }

  if (!proxyUrl) return null;

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
    <>
      <button
        className="chat-fab"
        aria-label="Chat with me"
        onClick={() => setOpen((v) => !v)}
      >
        Chat
      </button>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat">
          <div className="chat-header">
            <span>Chat</span>
            <div>
              <button aria-label="Reset" onClick={reset}>Reset</button>
              <button aria-label="Close" onClick={() => setOpen(false)}>×</button>
            </div>
          </div>
          <div className="chat-messages">
            <div className="chat-msg assistant" data-testid="chat-greeting">
              Hey — I see you're looking at the {target} adaptation. Ask me anything about my work and I'll keep it relevant to that role.
            </div>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>{m.content}</div>
            ))}
          </div>
          {status === 'error' && <div className="chat-error">Something went wrong. Try again.</div>}
          <form className="chat-input" onSubmit={send}>
            <input
              aria-label="Message"
              placeholder="Ask a question…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={status === 'streaming'}
              maxLength={2000}
            />
            <button type="submit" disabled={status === 'streaming' || !draft.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}
