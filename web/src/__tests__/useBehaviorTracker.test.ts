import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBehaviorTracker } from '../hooks/useBehaviorTracker';

const cfg = { pat: 'tok', repo: 'a/b' };

const startCtx = { company: 'cohere', source: 'slug', adaptation: 'cohere', match_score: 0.8 };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubFetch() {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith('/issues')) {
      return { ok: true, json: async () => ({ number: 42 }) };
    }
    if (url.includes('/comments')) {
      return { ok: true, json: async () => ({ id: 1 }) };
    }
    return { ok: false, status: 404 };
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

describe('useBehaviorTracker', () => {
  it('emits a session_start event on init', () => {
    stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: true }));
    expect(result.current.eventCount).toBeGreaterThanOrEqual(1);
  });

  it('track() appends events to the buffer', () => {
    stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: true }));
    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'email' }, ts: Date.now() });
    });
    expect(result.current.eventCount).toBeGreaterThanOrEqual(2);
  });

  it('creates an analytics issue on first flush', async () => {
    const { calls } = stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: true, flushIntervalMs: 1000 }));
    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'email' }, ts: 1 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/issues') && c.init?.method === 'POST')).toBe(true));
  });

  it('appends a comment on subsequent flush', async () => {
    const { calls } = stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: true, flushIntervalMs: 1000 }));

    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'email' }, ts: 1 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/issues'))).toBe(true));

    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'linkedin' }, ts: 2 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await waitFor(() => expect(calls.some((c) => c.url.includes('/comments'))).toBe(true));
  });

  it('buffer clears after successful flush', async () => {
    stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: true, flushIntervalMs: 1000 }));
    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'email' }, ts: 1 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await waitFor(() => expect(result.current.eventCount).toBe(0));
  });

  it('does nothing when disabled', () => {
    const { calls } = stubFetch();
    const { result } = renderHook(() => useBehaviorTracker({ config: cfg, startCtx, enabled: false, flushIntervalMs: 1000 }));
    act(() => {
      result.current.track({ type: 'cta_click', data: { target: 'email' }, ts: 1 });
    });
    expect(calls).toHaveLength(0);
  });
});
