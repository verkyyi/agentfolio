import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../hooks/useChat';

const cfg = { pat: 'tok', repo: 'a/b' };

function stubFetch(commentsByCall: Array<Array<{ body: string }>>) {
  let commentsCalls = 0;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/issues') && init?.method === 'POST') {
      return { ok: true, json: async () => ({ number: 77 }) };
    }
    if (url.includes('/issues/77/comments')) {
      const comments = commentsByCall[Math.min(commentsCalls, commentsByCall.length - 1)] ?? [];
      commentsCalls += 1;
      return { ok: true, json: async () => comments };
    }
    return { ok: false, status: 404 };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('useChat', () => {
  it('asks a question and resolves with the answer', async () => {
    stubFetch([
      [{ body: JSON.stringify({ status: 'thinking' }) }],
      [
        { body: JSON.stringify({ status: 'thinking' }) },
        { body: JSON.stringify({ status: 'answer', answer: 'hi there', model: 'm', ts: 'x' }) },
      ],
    ]);
    const { result } = renderHook(() => useChat({ config: cfg, enabled: true, pollIntervalMs: 1000 }));

    await act(async () => { await result.current.ask('hello?'); });
    // User message appears immediately
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');

    // Advance polls
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });

    await waitFor(() => {
      const assistant = result.current.messages.find((m) => m.role === 'assistant');
      expect(assistant?.text).toBe('hi there');
    });
  });

  it('enforces client-side rate limit of 5 questions per session', async () => {
    stubFetch([[]]);
    const { result } = renderHook(() => useChat({ config: cfg, enabled: true, pollIntervalMs: 1000 }));

    for (let i = 0; i < 5; i++) {
      await act(async () => { await result.current.ask(`q${i}`); });
    }
    await expect(
      act(async () => { await result.current.ask('q6'); }),
    ).rejects.toThrow(/limit/i);
  });

  it('does nothing when disabled', async () => {
    const fetchMock = stubFetch([[]]);
    const { result } = renderHook(() => useChat({ config: cfg, enabled: false, pollIntervalMs: 1000 }));
    await expect(
      act(async () => { await result.current.ask('hi'); }),
    ).rejects.toThrow(/disabled/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
