import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findOpenRequestForCompany,
  createAdaptRequest,
  fetchIssueComments,
  getApiConfig,
} from '../utils/githubApi';

const issues = [
  { number: 7, title: '[adapt] Stripe | FDE', state: 'open', labels: [{ name: 'adapt-request' }] },
  { number: 8, title: '[adapt] Databricks | FDE', state: 'open', labels: [{ name: 'adapt-request' }] },
];

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

describe('findOpenRequestForCompany', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => issues,
    })));
  });

  it('returns the issue number when an open request matches the company', async () => {
    const n = await findOpenRequestForCompany('stripe', { pat: 'x', repo: 'a/b' });
    expect(n).toBe(7);
  });

  it('matches case-insensitively and via normalized slug', async () => {
    const n = await findOpenRequestForCompany('STRIPE', { pat: 'x', repo: 'a/b' });
    expect(n).toBe(7);
  });

  it('returns null when no match', async () => {
    const n = await findOpenRequestForCompany('unknown-co', { pat: 'x', repo: 'a/b' });
    expect(n).toBeNull();
  });
});

describe('createAdaptRequest', () => {
  it('POSTs with correct title, body, and labels', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ number: 42 }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const n = await createAdaptRequest('Stripe', 'FDE', { pat: 'tok', repo: 'a/b' });
    expect(n).toBe(42);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/a/b/issues');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body.title).toBe('[adapt] Stripe | FDE');
    expect(body.labels).toEqual(['adapt-request']);
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
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
