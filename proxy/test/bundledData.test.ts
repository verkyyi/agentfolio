import { describe, expect, it, vi } from 'vitest';

vi.mock('../../data/github/activity.json', () => ({
  default: {
    user: 'tester',
    fetchedAt: '2026-04-01T00:00:00Z',
    stats: { publicRepos: 2, contributions30d: 5, contributionsLastYear: 100 },
    contributions: {
      weeks: [
        [
          { date: '2026-03-25', count: 1 },
          { date: '2026-03-26', count: 2 },
          { date: '2026-03-27', count: 0 },
          { date: '2026-03-28', count: 1 },
          { date: '2026-03-29', count: 0 },
          { date: '2026-03-30', count: 0 },
          { date: '2026-03-31', count: 1 },
        ],
        [
          { date: '2026-04-01', count: 0 },
          { date: '2026-04-02', count: 3 },
          { date: '2026-04-03', count: 0 },
          { date: '2026-04-04', count: 0 },
          { date: '2026-04-05', count: 0 },
          { date: '2026-04-06', count: 0 },
          { date: '2026-04-07', count: 0 },
        ],
      ],
    },
    languages: [{ name: 'TypeScript', color: '#fff', pct: 80 }],
    repos: [
      { name: 'AgentFolio', url: 'https://github.com/v/a', description: 'desc', language: 'TypeScript', stars: 1, pushedAt: '2026-04-07T00:00:00Z' },
    ],
  },
}));

describe('bundledData', () => {
  it('getActivity returns the imported activity data', async () => {
    const { getActivity } = await import('../src/bundledData');
    const a = getActivity();
    expect(a.user).toBe('tester');
    expect(a.stats.contributions30d).toBe(5);
    expect(a.repos[0]?.name).toBe('AgentFolio');
    expect(a.contributions.weeks.length).toBe(2);
  });

  it('getRecentDailyCounts flattens weeks into a day array (oldest-first)', async () => {
    const { getRecentDailyCounts } = await import('../src/bundledData');
    const days = getRecentDailyCounts();
    expect(days.length).toBe(14);
    expect(days[0]).toEqual({ date: '2026-03-25', count: 1 });
    expect(days[days.length - 1]).toEqual({ date: '2026-04-07', count: 0 });
  });
});
