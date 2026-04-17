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

type DripPhase = 'typing' | 'holding' | 'erasing';

export function ChatStrip({ slug, ownerName, proxyUrl, isStreaming, liveTail, sentinelRef, onJump }: ChatStripProps) {
  const [pinned, setPinned] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [dripIndex, setDripIndex] = useState(0);
  const [dripText, setDripText] = useState('');
  const [dripPhase, setDripPhase] = useState<DripPhase>('typing');
  const hasBeenVisible = useRef(false);
  const pendingFetch = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dripTimer = useRef<number | null>(null);

  const prefersReducedMotion = typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    if (dripTimer.current !== null) window.clearTimeout(dripTimer.current);
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

  useEffect(() => {
    setDripIndex(0);
    setDripText('');
    setDripPhase('typing');
  }, [hints]);

  useEffect(() => {
    if (dripTimer.current !== null) {
      window.clearTimeout(dripTimer.current);
      dripTimer.current = null;
    }
    if (!pinned || isStreaming || hints.length === 0) return;
    const cur = hints[dripIndex % hints.length] ?? '';
    if (prefersReducedMotion) {
      if (dripText !== cur) { setDripText(cur); return; }
      dripTimer.current = window.setTimeout(() => {
        setDripText('');
        setDripIndex((i) => i + 1);
      }, 4000);
      return;
    }
    if (dripPhase === 'typing') {
      if (dripText.length < cur.length) {
        dripTimer.current = window.setTimeout(() => {
          setDripText(cur.slice(0, dripText.length + 1));
        }, 40);
      } else {
        dripTimer.current = window.setTimeout(() => setDripPhase('holding'), 0);
      }
    } else if (dripPhase === 'holding') {
      dripTimer.current = window.setTimeout(() => setDripPhase('erasing'), 4000);
    } else if (dripPhase === 'erasing') {
      if (dripText.length > 0) {
        dripTimer.current = window.setTimeout(() => {
          setDripText(dripText.slice(0, -1));
        }, 30);
      } else {
        dripTimer.current = window.setTimeout(() => {
          setDripIndex((i) => i + 1);
          setDripPhase('typing');
        }, 0);
      }
    }
    return () => {
      if (dripTimer.current !== null) {
        window.clearTimeout(dripTimer.current);
        dripTimer.current = null;
      }
    };
  }, [pinned, isStreaming, hints, dripIndex, dripPhase, dripText, prefersReducedMotion]);

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
  const hintTyping = dripPhase === 'typing' && !showLiveTail && hints.length > 0 && !prefersReducedMotion;

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
        <span className={`chat-strip__hint${hintTyping ? ' chat-strip__hint--typing' : ''}`}>
          {showLiveTail ? liveTail : dripText}
        </span>
      </span>
      <span className="chat-strip__cue">tap to chat ↑</span>
    </button>
  );
}
