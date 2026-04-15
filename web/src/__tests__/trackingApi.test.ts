import { describe, it, expect, vi } from 'vitest';
import { createAnalyticsIssue, appendAnalyticsComment } from '../utils/trackingApi';
import type { AnalyticsFlushPayload } from '../types';

const payload: AnalyticsFlushPayload = {
  session_id: 'abc123',
  events: [
    { type: 'session_start', data: { company: 'cohere', source: 'slug', adaptation: 'cohere', match_score: 0.8 }, ts: 1 },
  ],
};

describe('createAnalyticsIssue', () => {
  it('POSTs an issue with analytics label and returns issue number', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ number: 99 }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const n = await createAnalyticsIssue(payload, { pat: 'tok', repo: 'a/b' });
    expect(n).toBe(99);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/a/b/issues');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body.title.startsWith('[analytics]')).toBe(true);
    expect(body.labels).toEqual(['analytics']);
    expect(body.body).toContain('"session_id": "abc123"');
  });
});

describe('appendAnalyticsComment', () => {
  it('POSTs a comment to the existing issue', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ id: 123 }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await appendAnalyticsComment(99, payload, { pat: 'tok', repo: 'a/b' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/a/b/issues/99/comments');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body.body).toContain('"session_id": "abc123"');
  });
});
