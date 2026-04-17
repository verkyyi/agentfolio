import { describe, it, expect } from 'vitest';
import { topLanguages, recentDays } from '../utils/activityMetrics';
import type { ActivityData } from '../components/GithubActivity';

function makeActivity(overrides: Partial<ActivityData> = {}): ActivityData {
  return {
    user: 'u',
    fetchedAt: '2026-04-17T00:00:00.000Z',
    stats: { publicRepos: 1, contributions30d: 0, contributionsLastYear: 0 },
    contributions: { weeks: [] },
    languages: [],
    repos: [],
    ...overrides,
  };
}

describe('topLanguages', () => {
  it('returns the top 3 languages sorted by percent desc', () => {
    const a = makeActivity({
      languages: [
        { name: 'Go', color: '#0', pct: 10 },
        { name: 'TS', color: '#1', pct: 42 },
        { name: 'Rust', color: '#2', pct: 23 },
        { name: 'JS', color: '#3', pct: 18 },
        { name: 'Py', color: '#4', pct: 7 },
      ],
    });
    const top = topLanguages(a, 3);
    expect(top.map((l) => l.name)).toEqual(['TS', 'Rust', 'JS']);
  });

  it('returns fewer than N if input has fewer', () => {
    const a = makeActivity({
      languages: [{ name: 'TS', color: '#1', pct: 100 }],
    });
    expect(topLanguages(a, 3)).toHaveLength(1);
  });

  it('returns [] when languages is empty', () => {
    expect(topLanguages(makeActivity(), 3)).toEqual([]);
  });
});

describe('recentDays', () => {
  it('returns the last N days flattened across weeks, oldest-first', () => {
    const a = makeActivity({
      contributions: {
        weeks: [
          [
            { date: '2026-04-01', count: 1 },
            { date: '2026-04-02', count: 2 },
            { date: '2026-04-03', count: 3 },
            { date: '2026-04-04', count: 4 },
            { date: '2026-04-05', count: 5 },
            { date: '2026-04-06', count: 6 },
            { date: '2026-04-07', count: 7 },
          ],
          [
            { date: '2026-04-08', count: 8 },
            { date: '2026-04-09', count: 9 },
            { date: '2026-04-10', count: 10 },
            { date: '2026-04-11', count: 11 },
            { date: '2026-04-12', count: 12 },
            { date: '2026-04-13', count: 13 },
            { date: '2026-04-14', count: 14 },
          ],
        ],
      },
    });
    const days = recentDays(a, 5);
    expect(days.map((d) => d.count)).toEqual([10, 11, 12, 13, 14]);
  });

  it('returns [] when there are no weeks', () => {
    expect(recentDays(makeActivity(), 14)).toEqual([]);
  });

  it('returns all available days if fewer than N exist', () => {
    const a = makeActivity({
      contributions: {
        weeks: [
          [
            { date: '2026-04-01', count: 1 },
            { date: '2026-04-02', count: 2 },
          ],
        ],
      },
    });
    expect(recentDays(a, 14)).toHaveLength(2);
  });
});
