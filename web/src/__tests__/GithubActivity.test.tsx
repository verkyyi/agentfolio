// web/src/__tests__/GithubActivity.test.tsx
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GithubActivity, scopeToLast30Days } from '../components/GithubActivity';

// Pin "now" so the 30-day scope is deterministic across runs.
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-17T06:00:00Z'));
});
afterAll(() => vi.useRealTimers());

const fixture = {
  user: 'verkyyi',
  fetchedAt: '2026-04-17T06:00:00.000Z',
  stats: { publicRepos: 12, contributions30d: 84, contributionsLastYear: 1247 },
  contributions: {
    weeks: [
      // Week 1 is ~1 year old and will be filtered out by the 30-day scope.
      Array.from({ length: 7 }, (_, i) => ({ date: `2025-04-${20 + i}`, count: i })),
      // Week 2 is within the window (2026-04-11..17).
      Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-${11 + i}`, count: 2 })),
    ],
  },
  languages: [
    { name: 'TypeScript', color: '#3178c6', pct: 60 },
    { name: 'Python', color: '#3572a5', pct: 40 },
  ],
  repos: [
    {
      name: 'agentfolio',
      url: 'https://github.com/verkyyi/agentfolio',
      description: 'Open-source agentic portfolio engine',
      language: 'TypeScript',
      languageColor: '#3178c6',
      stars: 42,
      pushedAt: '2026-04-17T05:29:33Z',
    },
  ],
};

describe('GithubActivity', () => {
  it('renders the header strip with stats', () => {
    render(<GithubActivity data={fixture} />);
    expect(screen.getByText(/@verkyyi/)).toBeInTheDocument();
    expect(screen.getByText(/12 public repos/)).toBeInTheDocument();
    expect(screen.getByText(/84 contributions/)).toBeInTheDocument();
  });

  it('renders one heatmap cell per in-scope contribution day', () => {
    const { container } = render(<GithubActivity data={fixture} />);
    const cells = container.querySelectorAll('svg rect.heatmap-cell');
    // Only the 2026 week (7 days) is within the 30-day window; the 2025 week
    // is scoped out and its entire week is dropped from the grid.
    expect(cells.length).toBe(7);
  });

  it('scopeToLast30Days keeps only weeks touching the 30-day window', () => {
    const now = new Date('2026-04-17T06:00:00Z');
    const kept = scopeToLast30Days(fixture.contributions.weeks, now);
    expect(kept).toHaveLength(1);
    expect(kept[0][0].date).toBe('2026-04-11');
  });

  it('scopeToLast30Days pads a mixed week with sentinel -1 for days outside the window', () => {
    const now = new Date('2026-04-17T06:00:00Z');
    const mixedWeek = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${16 + i}`, // Mar 16..22; cutoff is Mar 18, so Mar 16-17 pad, 18-22 keep
      count: 5,
    }));
    const kept = scopeToLast30Days([mixedWeek], now);
    expect(kept).toHaveLength(1);
    expect(kept[0][0].count).toBe(-1); // Mar 16 padded
    expect(kept[0][1].count).toBe(-1); // Mar 17 padded
    expect(kept[0][2].count).toBe(5);  // Mar 18 kept
  });

  it('renders language legend entries', () => {
    render(<GithubActivity data={fixture} />);
    expect(screen.getAllByText(/TypeScript/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Python/)).toBeInTheDocument();
    expect(screen.getByText(/60%/)).toBeInTheDocument();
  });

  it('renders each repo with link and language', () => {
    render(<GithubActivity data={fixture} />);
    const link = screen.getByRole('link', { name: 'agentfolio' });
    expect(link).toHaveAttribute('href', 'https://github.com/verkyyi/agentfolio');
    expect(screen.getByText('Open-source agentic portfolio engine')).toBeInTheDocument();
  });

  it('renders an Updated footnote with the fetchedAt date', () => {
    render(<GithubActivity data={fixture} />);
    expect(screen.getByText(/Updated 2026-04-17/)).toBeInTheDocument();
  });

  it('returns null when data is null', () => {
    const { container } = render(<GithubActivity data={null} />);
    expect(container.firstChild).toBeNull();
  });
});
