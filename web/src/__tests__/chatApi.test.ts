import { describe, it, expect, vi } from 'vitest';
import { createChatRequest, fetchChatComments } from '../utils/chatApi';

describe('createChatRequest', () => {
  it('POSTs issue with chat-request label and returns issue number', async () => {
    const fetchMock = vi.fn(async (_u: string, _i?: RequestInit) => ({
      ok: true,
      json: async () => ({ number: 77 }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const n = await createChatRequest('How many years of Python?', { pat: 'tok', repo: 'a/b' });
    expect(n).toBe(77);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/a/b/issues');
    const body = JSON.parse(init?.body as string);
    expect(body.title).toMatch(/^\[chat\]/);
    expect(body.labels).toEqual(['chat-request']);
    const issueBody = JSON.parse(body.body);
    expect(issueBody.question).toBe('How many years of Python?');
  });

  it('truncates very long questions in the title', async () => {
    const fetchMock = vi.fn(async (_u: string, _i?: RequestInit) => ({
      ok: true,
      json: async () => ({ number: 1 }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const q = 'a'.repeat(200);
    await createChatRequest(q, { pat: 't', repo: 'x/y' });
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.title.length).toBeLessThanOrEqual(80);
  });
});

describe('fetchChatComments', () => {
  it('GETs comments URL', async () => {
    const fetchMock = vi.fn(async (_u: string, _i?: RequestInit) => ({
      ok: true,
      json: async () => [{ body: '{"status":"thinking"}' }],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const comments = await fetchChatComments(77, { pat: 't', repo: 'a/b' });
    expect(comments).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a/b/issues/77/comments?per_page=100');
  });
});
