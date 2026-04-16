import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdaptationComparison } from '../components/AdaptationComparison';
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

const cohere = mockAdapted({
  basics: {
    name: 'Test User',
    email: 'test@example.com',
    summary: 'Cohere summary',
    location: { city: 'Test City', region: 'TC' },
    profiles: [],
  },
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'Cohere',
      generated_by: 'adapt_one.py v0.1',
      match_score: { overall: 0.87, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: ['RAG Pipelines'],
      section_order: ['basics', 'projects', 'work'],
    },
  },
});

const def = mockAdapted({
  basics: {
    name: 'Test User',
    email: 'test@example.com',
    summary: 'Default summary',
    location: { city: 'Test City', region: 'TC' },
    profiles: [],
  },
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'default',
      generated_by: 'adapt_one.py v0.1',
      match_score: { overall: 0.2, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: ['Python'],
      section_order: ['basics', 'work', 'projects'],
    },
  },
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('cohere.json')) return { ok: true, json: async () => cohere };
    if (url.includes('default.json')) return { ok: true, json: async () => def };
    return { ok: false, status: 404 };
  }));
});

describe('AdaptationComparison', () => {
  it('renders side-by-side summaries and match scores for each slug', async () => {
    render(<AdaptationComparison slugs={['cohere', 'default']} />);
    await waitFor(() => expect(screen.getByText('Cohere summary')).toBeInTheDocument());
    expect(screen.getByText('Default summary')).toBeInTheDocument();
    expect(screen.getByText(/87%/)).toBeInTheDocument();
    expect(screen.getByText(/20%/)).toBeInTheDocument();
  });

  it('shows the adapted section_order for each slug', async () => {
    render(<AdaptationComparison slugs={['cohere', 'default']} />);
    await waitFor(() => expect(screen.getByText(/basics → projects → work/)).toBeInTheDocument());
    expect(screen.getByText(/basics → work → projects/)).toBeInTheDocument();
  });

  it('shows empty state when slug 404s', async () => {
    render(<AdaptationComparison slugs={['nonexistent']} />);
    await waitFor(() => expect(screen.getByText(/not available/i)).toBeInTheDocument());
  });
});
