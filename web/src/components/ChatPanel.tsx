import React, { useEffect, useRef, useState } from 'react';
import type { BlockFrame } from '../blocks/types';
import './ChatPanel.css';

type Role = 'user' | 'assistant';
export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'block'; block: BlockFrame };

export interface Msg {
  role: Role;
  segments: Segment[];
}
type Status = 'idle' | 'streaming' | 'error';

export interface ChatPanelProps {
  slug: string;
  ownerName: string;
  tagline?: string;
  email?: string;
  profiles?: { network: string; url: string }[];
  greeting?: string;
  suggestions?: string[];
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
  return segments
    .filter((s): s is Extract<Segment, { kind: 'text' }> => s.kind === 'text')
    .map((s) => s.text)
    .join('');
}

// Updates the trailing text segment of the last assistant message.
// Invariant: `text` represents the text-so-far AFTER the most recent block
// segment (if any). When a block frame arrives, the caller resets fullText=''
// so the next drip tick starts a fresh trailing text segment.
function withTrailingText(cur: Msg[], text: string): Msg[] {
  const copy = cur.slice();
  const last = copy[copy.length - 1];
  if (!last || last.role !== 'assistant') return cur;
  const segs = last.segments.slice();
  const lastSeg = segs[segs.length - 1];
  if (lastSeg && lastSeg.kind === 'text') {
    segs[segs.length - 1] = { kind: 'text', text };
  } else if (text) {
    segs.push({ kind: 'text', text });
  }
  copy[copy.length - 1] = { role: 'assistant', segments: segs };
  return copy;
}

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

export function ChatPanel({ slug, ownerName, tagline, email, profiles, greeting, suggestions }: ChatPanelProps) {
  const proxyUrl = import.meta.env.VITE_CHAT_PROXY_URL as string | undefined;

  // Hooks must be called unconditionally; the offline early-return below
  // is declared after the hooks so React hook order stays stable.
  const storageKey = `agentfolio.chat.${slug}`;
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Accept only new-shape messages; discard stale content-shape entries.
      return (parsed as unknown[]).filter((m): m is Msg => {
        return !!m && typeof m === 'object' && Array.isArray((m as Msg).segments);
      });
    } catch { return []; }
  });
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const dripRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (dripRef.current !== null) window.clearInterval(dripRef.current);
  }, []);
  useEffect(() => {
    if (messages.length === 0) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  if (!proxyUrl) {
    return (
      <section className="chatp chatp-offline">
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
    const next: Msg[] = [
      ...messages,
      { role: 'user', segments: [{ kind: 'text', text: draft.trim() }] },
      { role: 'assistant', segments: [] },
    ];
    setMessages(next);
    setDraft('');
    setStatus('streaming');

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
    dripRef.current = window.setInterval(tick, DRIP_TICK_MS);

    try {
      const toSend = next.slice(0, -1);
      const wire = toSend.map((m) => ({ role: m.role, content: segmentsToText(m.segments) }));
      const resp = await fetch(`${proxyUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, messages: wire, greeting: displayGreeting }),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`status_${resp.status}`);
      for await (const ev of parseSse(resp.body)) {
        if (ev.kind === 'text') {
          fullText += ev.delta;
          if (fullText.length >= MAX_RESPONSE_CHARS) {
            fullText = fullText.slice(0, MAX_RESPONSE_CHARS);
            truncated = true;
            break;
          }
        } else if (ev.kind === 'block') {
          // Flush any pending text up to fullText into segments, then insert the block.
          // After this point, new text deltas accumulate into a fresh fullText buffer
          // and the drip will write them as a new trailing text segment (via withTrailingText).
          const flushed = fullText;
          fullText = '';
          revealed = 0;
          const incomingBlock = ev.block;
          setMessages((cur) => {
            const copy = cur.slice();
            const last = copy[copy.length - 1];
            if (!last || last.role !== 'assistant') return cur;
            let segs = last.segments;
            if (flushed) segs = mergeDelta(segs, flushed);
            segs = appendBlock(segs, incomingBlock);
            copy[copy.length - 1] = { role: 'assistant', segments: segs };
            return copy;
          });
        } else if (ev.kind === 'error') {
          throw new Error(ev.message);
        } else if (ev.kind === 'done') {
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
        if (last && last.role === 'assistant' && last.segments.length === 0) {
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
    Array.isArray(suggestions) && suggestions.length >= 1 && suggestions.length <= 6
      ? suggestions
      : DEFAULT_SUGGESTIONS;

  return (
    <section className="chatp" aria-label="Chat">
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
              <span className="chatp-msg-body">
                {m.segments.map((seg, j) =>
                  seg.kind === 'text' ? (
                    <span key={j}>{seg.text}</span>
                  ) : (
                    // Block dispatcher arrives in Task 2.4; render placeholder for now.
                    <span key={j}>[block:{seg.block.type}]</span>
                  )
                )}
              </span>
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
    </section>
  );
}
