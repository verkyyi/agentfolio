import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
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
      agentfolio: { company: 'default', generated_by: 'test' },
    },
    ...overrides,
  } as AdaptedResume;
}

const defaultAdapted = mockAdapted({
  basics: { name: 'Alex Chen', email: 'alex@example.com', summary: 'Default summary', location: { city: 'San Francisco', region: 'CA' }, profiles: [] },
});

const sampleAdapted = mockAdapted({
  basics: { ...defaultAdapted.basics, summary: 'Notion summary' },
  meta: { version: '1.0.0', agentfolio: { company: 'notion', generated_by: 'test' } },
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    // HEAD requests for PDF availability check
    if (init?.method === 'HEAD') {
      return { ok: false, status: 404 };
    }
    if (url.includes('data/fitted/index.json')) {
      return { ok: true, json: async () => [{ slug: 'default', filename: 'default.md' }] };
    }
    if (url.includes('data/fitted/default.md')) {
      return { ok: true, text: async () => '# Alex Chen\n\nDefault summary' };
    }
    if (url.includes('data/adapted/notion.json')) {
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
});

describe('App — default path', () => {
  it('renders default resume at root', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Default summary')).toBeInTheDocument());
  });
});

describe('App — slug path', () => {
  it('renders adaptation for known slug', async () => {
    window.history.pushState({}, '', '/notion');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Notion summary')).toBeInTheDocument());
  });

  it('shows not found for unknown slug', async () => {
    window.history.pushState({}, '', '/unknown-co');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Not Found')).toBeInTheDocument());
  });
});

describe('App — /dashboard route', () => {
  it('renders dashboard at /dashboard', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Fitted Resumes')).toBeInTheDocument());
  });
});

describe('App — GithubActivity', () => {
  it('mounts GithubActivity when activity.json is present', async () => {
    window.history.pushState({}, '', '/');

    const activity = {
      user: 'verkyyi',
      fetchedAt: '2026-04-17T06:00:00.000Z',
      stats: { publicRepos: 3, contributions30d: 7, contributionsLastYear: 100 },
      contributions: {
        weeks: [Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-${10 + i}`, count: 1 }))],
      },
      languages: [{ name: 'TS', color: '#3178c6', pct: 100 }],
      repos: [],
    };

    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') {
        return { ok: false, status: 404 };
      }
      if (url.includes('activity.json')) {
        return { ok: true, json: async () => activity };
      }
      if (url.includes('data/fitted/index.json')) {
        return { ok: true, json: async () => [{ slug: 'default', filename: 'default.md' }] };
      }
      if (url.includes('data/fitted/default.md')) {
        return { ok: true, text: async () => '# Alex Chen\n\nDefault summary' };
      }
      if (url.includes('data/adapted/default.json')) {
        return { ok: true, json: async () => defaultAdapted };
      }
      return { ok: false, status: 404 };
    }));

    render(<App />);
    await screen.findByText(/@verkyyi/);
    expect(screen.getByText(/3 public repos/)).toBeInTheDocument();
  });
});
