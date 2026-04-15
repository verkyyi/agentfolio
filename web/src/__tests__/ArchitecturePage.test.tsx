import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ArchitecturePage } from '../components/ArchitecturePage';

const analyticsDoc = {
  generated_at: '2026-04-20T06:00:00+00:00',
  source_issues: 3,
  total_sessions: 3,
  unique_companies: 2,
  by_company: {},
  global: { avg_duration_s: 50, top_projects: [['agentfolio', 2]], top_sections: [['projects', 10]] },
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('analytics.json')) return { ok: true, json: async () => analyticsDoc };
    if (url.includes('/data/adapted/')) return { ok: false, status: 404 };
    return { ok: false, status: 404 };
  }));
});

describe('ArchitecturePage', () => {
  it('renders the five-stage pipeline', async () => {
    render(<ArchitecturePage compareSlugs={[]} />);
    expect(screen.getByText(/perceive/i)).toBeInTheDocument();
    expect(screen.getByText(/reason/i)).toBeInTheDocument();
    expect(screen.getByText(/act/i)).toBeInTheDocument();
    expect(screen.getByText(/learn/i)).toBeInTheDocument();
    expect(screen.getByText(/explain/i)).toBeInTheDocument();
  });

  it('renders AgentStats when analytics loads', async () => {
    render(<ArchitecturePage compareSlugs={[]} />);
    await waitFor(() => expect(screen.getByText(/Total sessions/i)).toBeInTheDocument());
  });

  it('falls back gracefully when analytics fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    render(<ArchitecturePage compareSlugs={[]} />);
    await waitFor(() => expect(screen.getByText(/no aggregated stats/i)).toBeInTheDocument());
  });
});
