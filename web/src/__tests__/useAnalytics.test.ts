import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from '../hooks/useAnalytics';

const doc = {
  generated_at: '2026-04-15T00:00:00+00:00',
  source_issues: 5,
  total_sessions: 5,
  unique_companies: 2,
  by_company: {},
  global: { avg_duration_s: 60, top_projects: [], top_sections: [] },
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('useAnalytics', () => {
  it('fetches and returns the analytics doc', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => doc })));
    const { result } = renderHook(() => useAnalytics());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.total_sessions).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    const { result } = renderHook(() => useAnalytics());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
  });
});
