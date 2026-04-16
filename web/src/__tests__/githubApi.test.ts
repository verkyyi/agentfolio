import { describe, it, expect, vi } from 'vitest';
import {
  fetchIssueComments,
  getApiConfig,
} from '../utils/githubApi';

describe('getApiConfig', () => {
  it('throws when PAT missing', () => {
    expect(() => getApiConfig({ pat: undefined, repo: 'x/y' })).toThrow(/PAT/);
  });

  it('returns config when both provided', () => {
    const cfg = getApiConfig({ pat: 'xxx', repo: 'a/b' });
    expect(cfg.repo).toBe('a/b');
    expect(cfg.pat).toBe('xxx');
  });
});

describe('fetchIssueComments', () => {
  it('GETs comments URL for the issue', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => [{ body: '{"status":"progress"}' }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const comments = await fetchIssueComments(42, { pat: 'tok', repo: 'a/b' });
    expect(comments).toHaveLength(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/a/b/issues/42/comments?per_page=100');
  });
});
