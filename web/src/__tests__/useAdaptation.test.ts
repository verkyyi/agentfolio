import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAdaptation } from '../hooks/useAdaptation';
import type { AdaptedResume, BaseResume } from '../types';

const baseResume: BaseResume = {
  name: 'Test User',
  contact: {
    location: 'X',
    phone: '',
    email: 'x@y.z',
    linkedin: '',
    github: '',
  },
  summary_template: 'ignored',
  summary_defaults: {},
  experience: [],
  projects: [],
  education: [],
  skills: { groups: [] },
  volunteering: [],
};

const adapted: AdaptedResume = {
  company: 'Cohere',
  generated_at: '2026-04-15T00:00:00+00:00',
  generated_by: 'adapt_one.py v0.1',
  summary: 'Adapted summary',
  section_order: ['summary', 'experience', 'projects', 'skills', 'education', 'volunteering'],
  experience_order: [],
  bullet_overrides: {},
  project_order: [],
  skill_emphasis: [],
  match_score: {
    overall: 0.5,
    by_category: {},
    matched_keywords: [],
    missing_keywords: [],
  },
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.endsWith('/data/resume.json')) {
      return Promise.resolve({ ok: true, json: async () => baseResume });
    }
    if (url.includes('/data/adapted/cohere.json')) {
      return Promise.resolve({ ok: true, json: async () => adapted });
    }
    if (url.includes('/data/adapted/default.json')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ ...adapted, company: 'Default' }),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  }));
});

describe('useAdaptation', () => {
  it('returns null until company is provided', () => {
    const { result } = renderHook(() => useAdaptation(null));
    expect(result.current.adapted).toBeNull();
    expect(result.current.base).toBeNull();
  });

  it('fetches base resume and adapted JSON for company', async () => {
    const { result } = renderHook(() => useAdaptation('cohere'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.adapted?.company).toBe('Cohere');
    expect(result.current.base?.name).toBe('Test User');
  });

  it('falls back to default when adapted file is 404', async () => {
    const { result } = renderHook(() => useAdaptation('unknown'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.adapted?.company).toBe('Default');
  });

  it('normalizes company name to lowercase-dashed', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    renderHook(() => useAdaptation('Cohere AI'));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(calls.some((u) => u.includes('/data/adapted/cohere-ai.json'))).toBe(true);
    });
  });

  it('sets needsLiveGeneration true when primary file is 404 and default is served', async () => {
    const { result } = renderHook(() => useAdaptation('unknown'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.needsLiveGeneration).toBe(true);
  });

  it('sets needsLiveGeneration false when primary file loads', async () => {
    const { result } = renderHook(() => useAdaptation('cohere'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.needsLiveGeneration).toBe(false);
  });
});
