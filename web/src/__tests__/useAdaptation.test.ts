import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  meta: { version: '1.0.0', agentfolio: { company: 'sample-company' } },
});
const defaultAdapted = mockAdapted();

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/data/adapted/sample-company.json')) {
      return Promise.resolve({ ok: true, json: async () => sampleAdapted });
    }
    if (url.includes('/data/adapted/default.json')) {
      return Promise.resolve({ ok: true, json: async () => defaultAdapted });
    }
    return Promise.resolve({ ok: false, status: 404 });
  }));
});

describe('useAdaptation', () => {
  it('returns null until company is provided', () => {
    const { result } = renderHook(() => useAdaptation(null));
    expect(result.current.adapted).toBeNull();
  });

  it('fetches adapted JSON for known company', async () => {
    const { result } = renderHook(() => useAdaptation('sample-company'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.adapted?.meta?.agentfolio?.company).toBe('sample-company');
  });

  it('returns error for unknown company (no fallback)', async () => {
    const { result } = renderHook(() => useAdaptation('unknown'));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.adapted).toBeNull();
    expect(result.current.error?.message).toBe('not_found');
  });

  it('normalizes company name to lowercase-dashed', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    renderHook(() => useAdaptation('Sample Company'));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(calls.some((u) => u.includes('/data/adapted/sample-company.json'))).toBe(true);
    });
  });
});
