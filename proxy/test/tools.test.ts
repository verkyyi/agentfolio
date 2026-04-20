import { describe, expect, it, vi } from 'vitest';
import { TOOL_DEFS, executeTool, makeBlockIdGenerator } from '../src/tools';

vi.mock('../src/bundledData', () => {
  const weeks = [
    // Fill 13 weeks of mostly-zero + 1 week of activity at the tail.
    ...Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => ({
      date: `2026-01-${String(w * 7 + d + 1).padStart(2, '0')}`,
      count: 0,
    }))),
    // Last 2 weeks with some activity
    Array.from({ length: 7 }, (_, d) => ({
      date: `2026-04-${String(d + 1).padStart(2, '0')}`,
      count: d % 2,
    })),
    Array.from({ length: 7 }, (_, d) => ({
      date: `2026-04-${String(d + 8).padStart(2, '0')}`,
      count: d === 0 ? 3 : 0,
    })),
  ];
  return {
    getActivity: () => ({
      user: 'test',
      fetchedAt: '2026-04-14',
      stats: { publicRepos: 3, contributions30d: 10, contributionsLastYear: 50 },
      contributions: { weeks },
      languages: [],
      repos: [
        { name: 'RepoA', url: 'https://x/a', description: 'A', language: 'TS', stars: 5, pushedAt: '2026-04-07T00:00:00Z' },
      ],
    }),
    getRecentDailyCounts: () => weeks.flat(),
  };
});

describe('TOOL_DEFS', () => {
  it('includes open_panel', () => {
    const names = TOOL_DEFS.map((t) => t.name);
    expect(names).toContain('open_panel');
  });
});

describe('executeTool open_panel', () => {
  it('returns ok and an open-panel display_block', async () => {
    const blockId = makeBlockIdGenerator();
    const res = await executeTool('open_panel', { panel: 'resume' }, { slug: 'default', blockId });
    expect(res.result).toEqual({ ok: true });
    expect(res.display_block).toEqual({
      id: 'blk_1',
      type: 'open-panel',
      data: { panel: 'resume' },
    });
  });

  it('rejects unknown panel', async () => {
    const blockId = makeBlockIdGenerator();
    await expect(executeTool('open_panel', { panel: 'other' } as never, { slug: 'default', blockId }))
      .rejects.toThrow();
  });
});

describe('executeTool unknown name', () => {
  it('throws', async () => {
    const blockId = makeBlockIdGenerator();
    await expect(executeTool('nope' as never, {}, { slug: 'default', blockId }))
      .rejects.toThrow(/unknown tool/i);
  });
});

describe('get_recent_activity', () => {
  it('returns activity-summary with 30d window by default', async () => {
    const blockId = makeBlockIdGenerator();
    const res = await executeTool('get_recent_activity', {}, { slug: 'default', blockId });
    expect(res.display_block).toMatchObject({ type: 'activity-summary' });
    const data = (res.display_block as any).data;
    expect(data.window).toBe('30d');
    expect(data.totalCommits).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(data.sparkline)).toBe(true);
    expect(data.sparkline.length).toBe(30);
    expect(Array.isArray(data.topRepos)).toBe(true);
  });

  it('accepts 90d window', async () => {
    const blockId = makeBlockIdGenerator();
    const res = await executeTool('get_recent_activity', { window: '90d' }, { slug: 'default', blockId });
    const data = (res.display_block as any).data;
    expect(data.window).toBe('90d');
    expect(data.sparkline.length).toBe(90);
  });

  it('rejects invalid window (falls back to 30d)', async () => {
    // Be lenient — the tool coerces unknown windows to 30d.
    const blockId = makeBlockIdGenerator();
    const res = await executeTool('get_recent_activity', { window: 'weird' as never }, { slug: 'default', blockId });
    const data = (res.display_block as any).data;
    expect(data.window).toBe('30d');
  });
});
