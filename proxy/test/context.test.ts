import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadSlugContext, __resetCacheForTests } from '../src/context';

function mockFetch(responses: Record<string, { status: number; body?: string }>) {
  return vi.fn(async (url: string | URL) => {
    const key = typeof url === 'string' ? url : url.toString();
    const r = responses[key];
    if (!r) return new Response('missing', { status: 404 });
    return new Response(r.body ?? '', { status: r.status });
  });
}

describe('loadSlugContext', () => {
  beforeEach(() => __resetCacheForTests());

  it('returns null when fitted file is 404', async () => {
    const fetchMock = mockFetch({});
    vi.stubGlobal('fetch', fetchMock);
    const ctx = await loadSlugContext('notion', 'https://pages.example');
    expect(ctx).toBeNull();
  });

  it('returns fitted+directives+jd when all present', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'https://pages.example/data/fitted/notion.md': { status: 200, body: '# R' },
      'https://pages.example/data/input/directives.md': { status: 200, body: 'D' },
      'https://pages.example/data/input/jd/notion.md': { status: 200, body: 'J' },
    }));
    const ctx = await loadSlugContext('notion', 'https://pages.example');
    expect(ctx).toEqual({ fitted: '# R', directives: 'D', jd: 'J' });
  });

  it('treats missing directives and jd as null but still succeeds', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'https://pages.example/data/fitted/notion.md': { status: 200, body: '# R' },
    }));
    const ctx = await loadSlugContext('notion', 'https://pages.example');
    expect(ctx).toEqual({ fitted: '# R', directives: null, jd: null });
  });

  it('caches responses across calls within TTL', async () => {
    const fetchMock = mockFetch({
      'https://pages.example/data/fitted/notion.md': { status: 200, body: '# R' },
    });
    vi.stubGlobal('fetch', fetchMock);
    await loadSlugContext('notion', 'https://pages.example');
    await loadSlugContext('notion', 'https://pages.example');
    // 3 URLs fetched first call, 0 on second call (all cached, including negative caches)
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejects slugs that are not simple identifiers', async () => {
    vi.stubGlobal('fetch', mockFetch({}));
    const ctx = await loadSlugContext('../etc/passwd', 'https://pages.example');
    expect(ctx).toBeNull();
  });
});
