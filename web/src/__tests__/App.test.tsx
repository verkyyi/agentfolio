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
  basics: { ...defaultAdapted.basics, summary: 'Sample company summary' },
  meta: { version: '1.0.0', agentfolio: { company: 'sample-company', generated_by: 'sample' } },
});

const slugRegistry: SlugRegistry = {
  'sample-company': { company: 'sample-company', role: 'Software Engineer', created: '2026-01-01', context: 'Sample' },
};

beforeEach(() => {
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
    window.history.pushState({}, '', '/sample-company');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Sample company summary')).toBeInTheDocument());
  });

  it('shows not found for unknown slug', async () => {
    window.history.pushState({}, '', '/unknown-co');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Not Found')).toBeInTheDocument());
  });
});
