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
      profiles: [
        { network: 'LinkedIn', url: 'https://linkedin.com/in/test' },
        { network: 'GitHub', url: 'https://github.com/test' },
      ],
    },
    work: [
      {
        id: 'job1',
        name: 'Test Corp',
        position: 'Engineer',
        location: 'Test City',
        startDate: '2024-01',
        highlights: ['Did something great'],
      },
    ],
    projects: [
      {
        id: 'proj1',
        name: 'Test Project',
        description: 'A test project',
        url: 'https://example.com',
        startDate: '2024-01',
        highlights: ['Built something'],
        keywords: ['test'],
      },
    ],
    skills: [
      { id: 'sk1', name: 'Languages', keywords: ['Python', 'TypeScript'] },
    ],
    education: [
      { institution: 'Test University', area: 'CS', studyType: 'BS', location: 'Test City' },
    ],
    volunteer: [],
    meta: {
      version: '1.0.0',
      lastModified: '2026-04-16T00:00:00+00:00',
      agentfolio: {
        company: 'default',
        generated_by: 'test',
        match_score: { overall: 0.5, by_category: { sk1: 0.5 }, matched_keywords: ['Python'], missing_keywords: ['Ruby'] },
        skill_emphasis: ['Python'],
        section_order: ['basics', 'work', 'projects', 'skills', 'education', 'volunteer'],
      },
    },
    ...overrides,
  } as AdaptedResume;
}

const adapted = mockAdapted({
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'Cohere',
      generated_by: 'adapt_one.py v0.1',
      match_score: { overall: 0.5, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: [],
      section_order: ['basics', 'work', 'projects', 'skills', 'education', 'volunteer'],
    },
  },
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/data/adapted/cohere.json')) {
      return Promise.resolve({ ok: true, json: async () => adapted });
    }
    if (url.includes('/data/adapted/default.json')) {
      return Promise.resolve({
        ok: true,
        json: async () => mockAdapted({
          meta: {
            version: '1.0.0',
            lastModified: '2026-04-15T00:00:00+00:00',
            agentfolio: {
              company: 'Default',
              generated_by: 'test',
              match_score: { overall: 0.5, by_category: {}, matched_keywords: [], missing_keywords: [] },
              skill_emphasis: [],
              section_order: ['basics', 'work', 'projects', 'skills', 'education', 'volunteer'],
            },
          },
        }),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  }));
});

describe('useAdaptation', () => {
  it('returns null until company is provided', () => {
    const { result } = renderHook(() => useAdaptation(null));
    expect(result.current.adapted).toBeNull();
  });

  it('fetches adapted JSON for company', async () => {
    const { result } = renderHook(() => useAdaptation('cohere'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.adapted?.meta?.agentfolio?.company).toBe('Cohere');
  });

  it('falls back to default when adapted file is 404', async () => {
    const { result } = renderHook(() => useAdaptation('unknown'));
    await waitFor(() => expect(result.current.adapted).not.toBeNull());
    expect(result.current.adapted?.meta?.agentfolio?.company).toBe('Default');
  });

  it('normalizes company name to lowercase-dashed', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    renderHook(() => useAdaptation('Cohere AI'));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(calls.some((u) => u.includes('/data/adapted/cohere-ai.json'))).toBe(true);
    });
  });

});
