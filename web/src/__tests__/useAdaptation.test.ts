import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAdaptation } from '../hooks/useAdaptation';
import type { AdaptedResume } from '../types';

function mockAdapted(overrides: Record<string, any> = {}): AdaptedResume {
  return {
    basics: {
      name: 'Test User',
      email: 'test@example.com',
      summary: 'Test summary',
      location: { city: 'Test City', region: 'TC' },
      profiles: [],
    },
    work: [],
    projects: [],
    skills: [],
    education: [],
    volunteer: [],
    meta: {
      version: '1.0.0',
      lastModified: '2026-04-16T00:00:00+00:00',
      agentfolio: {
        company: 'default',
        generated_by: 'test',
      },
    },
    ...overrides,
  } as AdaptedResume;
}

const sampleAdapted = mockAdapted({
  meta: { version: '1.0.0', agentfolio: { company: 'notion' } },
});
const defaultAdapted = mockAdapted();

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/data/adapted/notion.json')) {
      return Promise.resolve({ ok: true, json: async () => sampleAdapted });
    }
    if (url.includes('/data/adapted/default.json')) {
      return Promise.resolve({ ok: true, json: async () => defaultAdapted });
    }
    return Promise.resolve({ ok: false, status: 404 });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAdaptation', () => {
  it('fetches default adaptation at root path', async () => {
    window.history.pushState({}, '', '/');
    const { result } = renderHook(() => useAdaptation());
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.adapted?.meta?.agentfolio?.company).toBe('default');
  });

  it('fetches adapted JSON for slug in path', async () => {
    window.history.pushState({}, '', '/notion');
    const { result } = renderHook(() => useAdaptation());
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.adapted?.meta?.agentfolio?.company).toBe('notion');
  });

  it('returns error for unknown slug', async () => {
    window.history.pushState({}, '', '/unknown');
    const { result } = renderHook(() => useAdaptation());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.adapted).toBeNull();
    expect(result.current.error?.message).toBe('not_found');
  });
});
