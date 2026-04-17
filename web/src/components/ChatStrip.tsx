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

export function ChatStrip({ ownerName, isStreaming, liveTail, sentinelRef, onJump }: ChatStripProps) {
  const [pinned, setPinned] = useState(false);
  const hasBeenVisible = useRef(false);

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

  const showLiveTail = isStreaming && liveTail.length > 0;

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
          {showLiveTail ? liveTail : ''}
        </span>
      </span>
      <span className="chat-strip__cue">tap to chat ↑</span>
    </button>
  );
}
