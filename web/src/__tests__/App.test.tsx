import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import type { AdaptedResume, SlugRegistry } from '../types';

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

const defaultAdapted = mockAdapted({
  basics: {
    name: 'Alex Chen',
    email: 'alex@example.com',
    summary: 'Default summary',
    location: { city: 'San Francisco', region: 'CA' },
    profiles: [],
  },
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'default',
      generated_by: 'sample',
      match_score: { overall: 0.1, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: [],
      section_order: ['basics'],
    },
  },
});

const sampleAdapted = mockAdapted({
  basics: {
    ...defaultAdapted.basics,
    summary: 'Sample company summary',
  },
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'sample-company',
      generated_by: 'sample',
      match_score: { overall: 0.7, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: [],
      section_order: ['basics'],
    },
  },
});

const slugRegistry: SlugRegistry = {
  'sample': { company: 'sample-company', role: 'Software Engineer', created: '2026-01-01', context: 'Sample slug for demo' },
};

beforeEach(() => {
  vi.stubEnv('VITE_GITHUB_PAT', 'test-pat');
  vi.stubEnv('VITE_GITHUB_REPO', 'a/b');

  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('data/slugs.json')) {
      return { ok: true, json: async () => slugRegistry };
    }
    if (url.includes('data/adapted/sample-company.json')) {
      return { ok: true, json: async () => sampleAdapted };
    }
    if (url.includes('data/adapted/default.json')) {
      return { ok: true, json: async () => defaultAdapted };
    }
    return { ok: false, status: 404 };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('App — default path', () => {
  it('renders default resume immediately without self-id form', async () => {
    window.history.pushState({}, '', '/agentfolio/');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Default summary')).toBeInTheDocument());
    expect(screen.queryByLabelText(/company/i)).not.toBeInTheDocument();
  });
});

describe('App — slug path', () => {
  it('renders company-specific adaptation for valid slug', async () => {
    window.history.pushState({}, '', '/agentfolio/c/sample');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Sample company summary')).toBeInTheDocument());
  });

  it('falls back to default for unknown slug', async () => {
    window.history.pushState({}, '', '/agentfolio/c/unknown-co');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Default summary')).toBeInTheDocument());
  });
});
