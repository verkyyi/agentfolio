import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    name: 'Lianghui Yi',
    email: 'verky.yi@gmail.com',
    summary: 'Default summary',
    location: { city: 'Santa Clara', region: 'CA' },
    profiles: [],
  },
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'default',
      generated_by: 'adapt_one.py v0.1',
      match_score: { overall: 0.1, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: [],
      section_order: ['basics'],
    },
  },
});

const stripeAdapted = mockAdapted({
  basics: {
    ...defaultAdapted.basics,
    summary: 'Stripe summary',
  },
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'Stripe',
      generated_by: 'adapt_one.py v0.1',
      match_score: { overall: 0.1, by_category: {}, matched_keywords: [], missing_keywords: [] },
      skill_emphasis: [],
      section_order: ['basics'],
    },
  },
});

const slugRegistry: SlugRegistry = {};

beforeEach(() => {
  vi.stubEnv('VITE_GITHUB_PAT', 'test-pat');
  vi.stubEnv('VITE_GITHUB_REPO', 'a/b');

  let stripeCallCount = 0;
  let commentsCallCount = 0;

  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('data/slugs.json')) {
      return { ok: true, json: async () => slugRegistry };
    }
    if (url.includes('data/adapted/stripe.json')) {
      stripeCallCount += 1;
      // First call (initial useAdaptation): 404. Subsequent (after complete): 200.
      if (stripeCallCount === 1) return { ok: false, status: 404 };
      return { ok: true, json: async () => stripeAdapted };
    }
    if (url.includes('data/adapted/default.json')) {
      return { ok: true, json: async () => defaultAdapted };
    }
    // GitHub API
    if (url.includes('/issues?labels=adapt-request')) {
      return { ok: true, json: async () => [] };
    }
    if (url.endsWith('/issues') && init?.method === 'POST') {
      return { ok: true, json: async () => ({ number: 7 }) };
    }
    if (url.includes('/issues/7/comments')) {
      commentsCallCount += 1;
      if (commentsCallCount >= 2) {
        return {
          ok: true,
          json: async () => [
            { body: JSON.stringify({ status: 'complete', adapted_path: 'data/adapted/stripe.json', company_slug: 'stripe' }) },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    }
    return { ok: false, status: 404 };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('App — self-ID + live generation flow', () => {
  it('shows SelfIdPrompt when no URL slug', async () => {
    window.history.pushState({}, '', '/agentfolio/');
    render(<App />);
    await waitFor(() => expect(screen.getByLabelText(/company/i)).toBeInTheDocument());
  });

  it('creates Issue and renders progress, then hot-swaps on complete', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.history.pushState({}, '', '/agentfolio/');

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<App />);

    await waitFor(() => expect(screen.getByLabelText(/company/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/company/i), 'Stripe');
    await user.type(screen.getByLabelText(/role/i), 'FDE');
    await user.click(screen.getByRole('button', { name: /show me/i }));

    // Progress panel should appear; default summary should render underneath
    await waitFor(() =>
      expect(screen.getByText(/generating your adapted resume/i)).toBeInTheDocument(),
    );
    expect(screen.getByText('Default summary')).toBeInTheDocument();

    // Advance through polling (2 cycles × 5s)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    // After complete comment + refetch, Stripe summary should appear
    await waitFor(() => expect(screen.getByText('Stripe summary')).toBeInTheDocument(), {
      timeout: 3000,
    });
  });
});
