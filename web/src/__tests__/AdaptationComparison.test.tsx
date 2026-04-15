import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdaptationComparison } from '../components/AdaptationComparison';
import type { AdaptedResume } from '../types';

const cohere: AdaptedResume = {
  company: 'Cohere',
  generated_at: '2026-04-15T00:00:00+00:00',
  generated_by: 'adapt_one.py v0.1',
  summary: 'Cohere summary',
  section_order: ['summary', 'projects', 'experience'],
  experience_order: [],
  bullet_overrides: {},
  project_order: ['agentfolio'],
  skill_emphasis: ['RAG Pipelines'],
  match_score: { overall: 0.87, by_category: {}, matched_keywords: [], missing_keywords: [] },
};
const def: AdaptedResume = {
  ...cohere,
  company: 'default',
  summary: 'Default summary',
  section_order: ['summary', 'experience', 'projects'],
  skill_emphasis: ['Python'],
  match_score: { ...cohere.match_score, overall: 0.2 },
};

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
    await waitFor(() => expect(screen.getByText(/summary → projects → experience/)).toBeInTheDocument());
    expect(screen.getByText(/summary → experience → projects/)).toBeInTheDocument();
  });

  it('shows empty state when slug 404s', async () => {
    render(<AdaptationComparison slugs={['nonexistent']} />);
    await waitFor(() => expect(screen.getByText(/not available/i)).toBeInTheDocument());
  });
});
