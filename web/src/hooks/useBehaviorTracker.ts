import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiConfig } from '../utils/githubApi';
import { appendAnalyticsComment, createAnalyticsIssue } from '../utils/trackingApi';
import type { AnalyticsEvent } from '../types';

interface Options {
  config: ApiConfig;
  startCtx: { company: string; source: string; adaptation: string; match_score: number };
  enabled: boolean;
  flushIntervalMs?: number;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_FLUSH_MS = 60000;

export function useBehaviorTracker(options: Options) {
  const { config, startCtx, enabled, flushIntervalMs = DEFAULT_FLUSH_MS } = options;
  const buffer = useRef<AnalyticsEvent[]>([]);
  const sessionId = useRef<string>(uuid());
  const startedAt = useRef<number>(Date.now());
  const issueNumber = useRef<number | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const maxScroll = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    buffer.current.push({
      type: 'session_start',
      data: startCtx,
      ts: Date.now(),
    });
    setEventCount(buffer.current.length);
  }, [enabled, startCtx]);

  const track = useCallback(
    (event: AnalyticsEvent) => {
      if (!enabled) return;
      buffer.current.push(event);
      setEventCount(buffer.current.length);
    },
    [enabled],
  );

  const flush = useCallback(async () => {
    if (!enabled) return;
    const heartbeat: AnalyticsEvent = {
      type: 'session_heartbeat',
      data: {
        duration_ms: Date.now() - startedAt.current,
        max_scroll_pct: Number(maxScroll.current.toFixed(2)),
      },
      ts: Date.now(),
    };
    const events = [...buffer.current, heartbeat];
    if (events.length === 1 && issueNumber.current !== null) {
      buffer.current = [];
      setEventCount(0);
      return;
    }
    const payload = { session_id: sessionId.current, events };
    try {
      if (issueNumber.current === null) {
        issueNumber.current = await createAnalyticsIssue(payload, config);
      } else {
        await appendAnalyticsComment(issueNumber.current, payload, config);
      }
      buffer.current = [];
      setEventCount(0);
    } catch {
      // keep buffer; retry on next interval
    }
  }, [config, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => {
      const scrolled =
        (window.scrollY + window.innerHeight) /
        Math.max(document.documentElement.scrollHeight, 1);
      if (scrolled > maxScroll.current) maxScroll.current = Math.min(scrolled, 1);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(flush, flushIntervalMs);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void flush();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, flush, flushIntervalMs]);

  return { track, eventCount };
}
