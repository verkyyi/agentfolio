import { useEffect, useRef, useState, type RefObject } from 'react';
import './ChatStrip.css';

export interface ChatStripProps {
  slug: string;
  ownerName: string;
  proxyUrl: string;
  isStreaming: boolean;
  liveTail: string;
  sentinelRef: RefObject<Element>;
  onJump: () => void;
}

export function ChatStrip({ slug, ownerName, proxyUrl, isStreaming, liveTail, sentinelRef, onJump }: ChatStripProps) {
  const [pinned, setPinned] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [disabled, setDisabled] = useState(false);
  const hasBeenVisible = useRef(false);
  const pendingFetch = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          hasBeenVisible.current = true;
          setPinned(false);
        } else if (hasBeenVisible.current) {
          setPinned(true);
        }
      }
    }, { threshold: 0 });
    obs.observe(target);
    return () => obs.disconnect();
  }, [sentinelRef]);

  useEffect(() => () => {
    if (pendingFetch.current !== null) window.clearTimeout(pendingFetch.current);
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!pinned || disabled) {
      if (pendingFetch.current !== null) {
        window.clearTimeout(pendingFetch.current);
        pendingFetch.current = null;
      }
      return;
    }
    if (hints.length > 0) return;
    if (pendingFetch.current !== null) return;
    pendingFetch.current = window.setTimeout(() => {
      pendingFetch.current = null;
      void fetchHints();
    }, 400);
  }, [pinned, disabled, hints.length]);

  async function fetchHints() {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let resp: Response;
    try {
      resp = await fetch(`${proxyUrl}/hints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
        signal: ctrl.signal,
      });
    } catch {
      return;
    }
    if (resp.status === 404) {
      setDisabled(true);
      return;
    }
    if (!resp.ok) return;
    let data: { hints?: unknown };
    try { data = await resp.json(); } catch { return; }
    const arr = Array.isArray(data.hints)
      ? data.hints.filter((h): h is string => typeof h === 'string').slice(0, 5)
      : [];
    setHints(arr);
  }

  const showLiveTail = isStreaming && liveTail.length > 0;
  const currentHint = hints[0] ?? '';

  return (
    <button
      type="button"
      className="chat-strip"
      hidden={!pinned}
      onClick={onJump}
      aria-label="Return to chat"
    >
      <span className="chat-strip__left">
        <span className="chat-strip__prompt">&gt;</span>
        <span className="chat-strip__name">{ownerName}</span>
        <span className={`chat-strip__dot${isStreaming ? ' chat-strip__dot--pulse' : ''}`} />
        <span className="chat-strip__sep">—</span>
        <span className="chat-strip__hint">
          {showLiveTail ? liveTail : currentHint}
        </span>
      </span>
      <span className="chat-strip__cue">tap to chat ↑</span>
    </button>
  );
}
