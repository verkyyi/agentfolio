// web/src/__tests__/fetch-github-activity.test.ts
import { describe, it, expect } from 'vitest';
import { buildActivity } from '../../../scripts/fetch-github-activity.mjs';

const fixture = {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: 1247,
        weeks: [
          {
            contributionDays: [
              { date: '2025-04-20', contributionCount: 0 },
              { date: '2025-04-21', contributionCount: 3 },
              { date: '2025-04-22', contributionCount: 1 },
              { date: '2025-04-23', contributionCount: 0 },
              { date: '2025-04-24', contributionCount: 0 },
              { date: '2025-04-25', contributionCount: 0 },
              { date: '2025-04-26', contributionCount: 0 },
            ],
          },
          {
            contributionDays: Array.from({ length: 7 }, (_, i) => ({
              date: `2026-04-${11 + i}`,
              contributionCount: i + 1,
            })),
          },
        ],
      },
    },
    repositories: {
      totalCount: 12,
      nodes: [
        {
          name: 'r1',
          languages: {
            edges: [
              { size: 5000, node: { name: 'TypeScript', color: '#3178c6' } },
              { size: 2000, node: { name: 'CSS', color: '#663399' } },
            ],
          },
        },
        {
          name: 'r2',
          languages: {
            edges: [
              { size: 1000, node: { name: 'Python', color: '#3572a5' } },
            ],
          },
        },
      ],
    },
    recent: {
      nodes: [
        {
          name: 'agentfolio',
          url: 'https://github.com/verkyyi/agentfolio',
          description: 'Open-source agentic portfolio engine',
          stargazerCount: 42,
          pushedAt: '2026-04-17T05:29:33Z',
          primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
        },
      ],
    },
  },
};

describe('buildActivity', () => {
  it('shapes the GraphQL response into the activity.json schema', () => {
    const result = buildActivity('verkyyi', fixture, new Date('2026-04-17T06:00:00Z'));

    expect(result.user).toBe('verkyyi');
    expect(result.fetchedAt).toBe('2026-04-17T06:00:00.000Z');
    expect(result.stats.publicRepos).toBe(12);
    expect(result.stats.contributionsLastYear).toBe(1247);
    expect(result.contributions.weeks).toHaveLength(2);
    expect(result.contributions.weeks[0][1]).toEqual({ date: '2025-04-21', count: 3 });
    expect(result.repos[0].name).toBe('agentfolio');
    expect(result.repos[0].language).toBe('TypeScript');
    expect(result.repos[0].languageColor).toBe('#3178c6');
    expect(result.languages.length).toBeGreaterThan(0);
    expect(result.languages[0].name).toBe('TypeScript');
    expect(Math.round(result.languages.reduce((s, l) => s + l.pct, 0))).toBe(100);
  });

  it('computes 30-day contributions from the tail of the calendar', () => {
    const result = buildActivity('verkyyi', fixture, new Date('2026-04-17T06:00:00Z'));
    // Last 30 daily entries exist only if we have 30+ days; with 14 total, 30d sum = all
    const expected = fixture.user.contributionsCollection.contributionCalendar.weeks
      .flatMap((w) => w.contributionDays)
      .reduce((s, d) => s + d.contributionCount, 0);
    expect(result.stats.contributions30d).toBe(expected);
  });
});
