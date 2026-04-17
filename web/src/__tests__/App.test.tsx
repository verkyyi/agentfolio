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
  basics: { name: 'Lianghui Yi', email: 'verky.yi@gmail.com', summary: 'Default summary', location: { city: 'Santa Clara', region: 'CA' }, profiles: [] },
});

const sampleAdapted = mockAdapted({
  basics: { ...defaultAdapted.basics, summary: 'Anthropic summary' },
  meta: { version: '1.0.0', agentfolio: { company: 'anthropic-fde-nyc', generated_by: 'test' } },
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
      return { ok: true, text: async () => '# Lianghui Yi\n\nDefault summary' };
    }
    if (url.includes('data/adapted/anthropic-fde-nyc.json')) {
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
    await waitFor(() => {
      const matches = screen.getAllByText(/Default summary/);
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});

describe('App — slug path', () => {
  it('renders adaptation for known slug', async () => {
    window.history.pushState({}, '', '/anthropic-fde-nyc');
    render(<App />);
    await waitFor(() => {
      const matches = screen.getAllByText(/Anthropic summary/);
      expect(matches.length).toBeGreaterThan(0);
    });
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
        return { ok: true, text: async () => '# Lianghui Yi\n\nDefault summary' };
      }
      if (url.includes('data/adapted/default.json')) {
        return { ok: true, json: async () => defaultAdapted };
      }
      return { ok: false, status: 404 };
    }));

    render(<App />);
    await screen.findByText(/Updated 2026-04-17/);
    const activityEl = document.getElementById('activity');
    expect(activityEl).not.toBeNull();
    expect(activityEl!.querySelector('.strip')).not.toBeNull();
  });
});

describe('App — new stack composition', () => {
  it('renders IdentityCard, ResumeTheme, and GithubActivity (with embedded strip) in order for slug "default"', async () => {
    const activity = {
      user: 'verkyyi',
      fetchedAt: '2026-04-17T00:00:00.000Z',
      stats: { publicRepos: 3, contributions30d: 42, contributionsLastYear: 100 },
      contributions: { weeks: [Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-0${i+1}`, count: i }))] },
      languages: [{ name: 'TypeScript', color: '#3178c6', pct: 100 }],
      repos: [],
    };

    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') return { ok: false, status: 404 };
      if (url.includes('activity.json')) return { ok: true, json: async () => activity };
      if (url.includes('data/fitted/index.json')) return { ok: true, json: async () => [{ slug: 'default', filename: 'default.md' }] };
      if (url.includes('data/fitted/default.md')) return { ok: true, text: async () => '# Lianghui Yi\n\nDefault summary' };
      if (url.includes('data/adapted/default.json')) return { ok: true, json: async () => defaultAdapted };
      return { ok: false, status: 404 };
    }));

    window.history.pushState({}, '', '/');
    render(<App />);

    await screen.findAllByText('Lianghui Yi');
    await screen.findAllByText(/42/);

    const idcard = document.querySelector('.idcard')!;
    const activityEl = document.getElementById('activity')!;
    const strip = document.querySelector('.strip')!;
    expect(idcard).not.toBeNull();
    expect(activityEl).not.toBeNull();
    expect(strip).not.toBeNull();

    expect(activityEl.contains(strip)).toBe(true);

    expect(idcard.compareDocumentPosition(activityEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(document.querySelectorAll('.strip').length).toBe(1);
  });
});
