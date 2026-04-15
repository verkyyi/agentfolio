import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAdaptationProgress } from '../hooks/useAdaptationProgress';

const cfg = { pat: 'tok', repo: 'a/b' };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mockComments(comments: Array<{ body: string }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => comments })),
  );
}

describe('useAdaptationProgress', () => {
  it('returns initial step "waiting" when issueNumber is null', () => {
    const { result } = renderHook(() => useAdaptationProgress(null, cfg));
    expect(result.current.step).toBe('waiting');
    expect(result.current.status).toBe('idle');
  });

  it('advances through progress steps as comments are posted', async () => {
    mockComments([]);
    const { result, rerender } = renderHook(
      ({ n }) => useAdaptationProgress(n, cfg),
      { initialProps: { n: 42 as number | null } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.step).toBe('waiting');

    mockComments([{ body: JSON.stringify({ status: 'progress', step: 'jd_parsed' }) }]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await waitFor(() => expect(result.current.step).toBe('jd_parsed'));

    mockComments([
      { body: JSON.stringify({ status: 'progress', step: 'jd_parsed' }) },
      { body: JSON.stringify({ status: 'progress', step: 'profile_built' }) },
    ]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await waitFor(() => expect(result.current.step).toBe('profile_built'));

    rerender({ n: 42 });
  });

  it('surfaces completion with adapted_path', async () => {
    mockComments([
      {
        body: JSON.stringify({
          status: 'complete',
          adapted_path: 'data/adapted/stripe.json',
          company_slug: 'stripe',
        }),
      },
    ]);
    const { result } = renderHook(() => useAdaptationProgress(42, cfg));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.adaptedPath).toBe('data/adapted/stripe.json');
  });

  it('surfaces rate_limited', async () => {
    mockComments([{ body: JSON.stringify({ status: 'rate_limited' }) }]);
    const { result } = renderHook(() => useAdaptationProgress(42, cfg));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await waitFor(() => expect(result.current.status).toBe('rate_limited'));
  });

  it('ignores non-JSON comments', async () => {
    mockComments([{ body: 'hello there' }]);
    const { result } = renderHook(() => useAdaptationProgress(42, cfg));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.step).toBe('waiting');
    expect(result.current.status).toBe('idle');
  });

  it('stops polling after completion', async () => {
    mockComments([
      { body: JSON.stringify({ status: 'complete', adapted_path: 'x', company_slug: 'x' }) },
    ]);
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    renderHook(() => useAdaptationProgress(42, cfg));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    const callsAfterFirst = fetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(callsAfterFirst);
  });
});
