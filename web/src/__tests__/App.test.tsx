import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import type { AdaptedResume, BaseResume, SlugRegistry } from '../types';

const baseResume: BaseResume = {
  name: 'Lianghui Yi',
  contact: {
    location: 'Santa Clara, CA',
    phone: '',
    email: 'verky.yi@gmail.com',
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

const defaultAdapted: AdaptedResume = {
  company: 'default',
  generated_at: '2026-04-15T00:00:00+00:00',
  generated_by: 'adapt_one.py v0.1',
  summary: 'Default summary',
  section_order: ['summary'],
  experience_order: [],
  bullet_overrides: {},
  project_order: [],
  skill_emphasis: [],
  match_score: { overall: 0.1, by_category: {}, matched_keywords: [], missing_keywords: [] },
};

const stripeAdapted: AdaptedResume = { ...defaultAdapted, company: 'Stripe', summary: 'Stripe summary' };

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
    if (url.endsWith('data/resume.json')) {
      return { ok: true, json: async () => baseResume };
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
