import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import './ChatPanel.css';

type Role = 'user' | 'assistant';
export interface Msg { role: Role; content: string }
type Status = 'idle' | 'streaming' | 'error';

export interface ChatPanelHandle {
  jumpTo(): void;
}

export interface ChatPanelState {
  isStreaming: boolean;
  liveTail: string;
  recentMessages: Msg[];
}

export interface ChatPanelProps {
  slug: string;
  ownerName: string;
  tagline?: string;
  email?: string;
  profiles?: { network: string; url: string }[];
  greeting?: string;
  suggestions?: string[];
  sentinelRef?: React.RefObject<HTMLDivElement>;
  onStateChange?: (s: ChatPanelState) => void;
  onSend?: () => void;
}

const DEFAULT_SUGGESTIONS = [
  'Walk me through the résumé',
  'Why is this a fit?',
  "What's not on the résumé?",
];

// UX tuning for streamed responses.
const MAX_RESPONSE_CHARS = 2000;
const TRUNCATION_SUFFIX = '… (response truncated)';
const DRIP_TICK_MS = 18;
const DRIP_BASE_CHARS_PER_TICK = 1;
// Keep visible lag bounded: if the buffer runs ahead, reveal extra chars per tick.
const DRIP_BACKLOG_DIVISOR = 40;

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

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(function ChatPanel(
  { slug, ownerName, tagline, email, profiles, greeting, suggestions, sentinelRef, onStateChange, onSend },
  ref,
) {
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
  const dripRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  useImperativeHandle(ref, () => ({
    jumpTo() {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      inputRef.current?.focus({ preventScroll: true });
    },
  }), []);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (dripRef.current !== null) window.clearInterval(dripRef.current);
  }, []);
  useEffect(() => {
    if (messages.length === 0) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    if (!onStateChange) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    const liveTail = status === 'streaming' && lastAssistant
      ? lastAssistant.content.slice(-60)
      : '';
    // Drop empty placeholders (the assistant stub we insert before a response arrives)
    // so the hint LLM doesn't see a dangling empty turn.
    const recentMessages = messages.filter((m) => m.content.length > 0).slice(-4);
    onStateChange({ isStreaming: status === 'streaming', liveTail, recentMessages });
  }, [messages, status, onStateChange]);

  if (!proxyUrl) {
    return (
      <section ref={sectionRef} className="chatp chatp-offline">
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
    if (dripRef.current !== null) {
      window.clearInterval(dripRef.current);
      dripRef.current = null;
    }
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
    onSend?.();

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Full text accumulated from SSE; what's revealed to the user is a growing prefix of this.
    let fullText = '';
    let revealed = 0;
    let streamDone = false;
    let truncated = false;

    // Typewriter drip: reveals chars from fullText on a timer so fast SSE feels human-paced.
    // Adaptive: speeds up proportionally when the buffer runs ahead so we never lag far behind.
    const tick = () => {
      const backlog = fullText.length - revealed;
      if (backlog <= 0) {
        if (streamDone) {
          if (dripRef.current !== null) {
            window.clearInterval(dripRef.current);
            dripRef.current = null;
          }
          if (truncated) {
            setMessages((cur) => {
              const copy = cur.slice();
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = { role: 'assistant', content: fullText + TRUNCATION_SUFFIX };
              }
              return copy;
            });
          }
          setStatus('idle');
        }
        return;
      }
      const step = Math.max(DRIP_BASE_CHARS_PER_TICK, Math.ceil(backlog / DRIP_BACKLOG_DIVISOR));
      revealed = Math.min(fullText.length, revealed + step);
      const visible = fullText.slice(0, revealed);
      setMessages((cur) => {
        const copy = cur.slice();
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = { role: 'assistant', content: visible };
        }
        return copy;
      });
    };
    dripRef.current = window.setInterval(tick, DRIP_TICK_MS);

    try {
      const toSend = next.slice(0, -1);
      const resp = await fetch(`${proxyUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, messages: toSend, greeting: displayGreeting }),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`status_${resp.status}`);
      for await (const delta of parseSse(resp.body)) {
        fullText += delta;
        if (fullText.length >= MAX_RESPONSE_CHARS) {
          fullText = fullText.slice(0, MAX_RESPONSE_CHARS);
          truncated = true;
          break;
        }
      }
      if (truncated) ctrl.abort();
      streamDone = true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Caller-initiated (reset/unmount). Stop the drip; state is already being reset.
        if (dripRef.current !== null) {
          window.clearInterval(dripRef.current);
          dripRef.current = null;
        }
        return;
      }
      if (dripRef.current !== null) {
        window.clearInterval(dripRef.current);
        dripRef.current = null;
      }
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

  const fallbackGreeting = `Hey, I'm an agent that knows ${ownerName}.${tagline ? ` ${tagline}` : ''} Ask me anything.`;
  const displayGreeting = greeting && greeting.trim() ? greeting.trim() : fallbackGreeting;
  const displaySuggestions =
    Array.isArray(suggestions) && suggestions.length === 3 ? suggestions : DEFAULT_SUGGESTIONS;

  return (
    <section ref={sectionRef} className="chatp" aria-label="Chat">
      {messages.length > 0 && (
        <div className="chatp-header">
          <button type="button" className="chatp-clear" onClick={reset}>
            clear conversation
          </button>
        </div>
      )}

      <div className="chatp-messages">
        <div className="chatp-msg assistant chatp-greeting" data-testid="chat-greeting">
          <span className="chatp-prompt">&gt;</span>
          <span className="chatp-msg-body">{displayGreeting}</span>
        </div>
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          const isStreaming = status === 'streaming' && m.role === 'assistant' && isLast;
          const cls = `chatp-msg ${m.role}${isStreaming ? ' streaming' : ''}`;
          return (
            <div key={i} className={cls} data-streaming={isStreaming || undefined}>
              <span className={`chatp-prompt${m.role === 'user' ? ' chatp-prompt-user' : ''}`}>
                {m.role === 'assistant' ? '>' : '$'}
              </span>
              <span className="chatp-msg-body">{m.content}</span>
            </div>
          );
        })}
      </div>

      {messages.length === 0 && (
        <div className="chatp-suggestions" role="group" aria-label="Suggested questions">
          {displaySuggestions.map((s) => (
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
      {sentinelRef && (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          style={{ height: 1, width: '100%' }}
          data-testid="chatp-sentinel"
        />
      )}
    </section>
  );
});
