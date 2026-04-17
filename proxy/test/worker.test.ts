import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/worker';
import { __resetCacheForTests } from '../src/context';

function makeKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(k: string) { return store.get(k) ?? null; },
    async put(k: string, v: string) { store.set(k, v); },
    async delete(k: string) { store.delete(k); },
  } as unknown as KVNamespace;
}

function baseEnv(overrides: Partial<any> = {}) {
  return {
    ANTHROPIC_API_KEY: 'sk-test',
    ALLOWED_ORIGIN: 'https://site.example,http://localhost:5173',
    PAGES_ORIGIN: 'https://pages.example',
    IP_HASH_SALT: 'salt',
    MODEL: 'claude-haiku-4-5',
    NAME: 'Verky',
    RATE_LIMIT_KV: makeKV(),
    ...overrides,
  };
}

function chatRequest(body: unknown, origin = 'https://site.example') {
  return new Request('https://worker.example/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'CF-Connecting-IP': '1.2.3.4',
    },
    body: JSON.stringify(body),
  });
}

describe('worker: CORS + routing', () => {
  beforeEach(() => __resetCacheForTests());

  it('responds to OPTIONS preflight with allowed origin', async () => {
    const req = new Request('https://worker.example/chat', {
      method: 'OPTIONS',
      headers: { Origin: 'https://site.example' },
    });
    const res = await worker.fetch(req, baseEnv() as any);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://site.example');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('rejects disallowed origin', async () => {
    const req = chatRequest({ slug: 'notion', messages: [] }, 'https://evil.example');
    const res = await worker.fetch(req, baseEnv() as any);
    expect(res.status).toBe(403);
  });

  it('rejects wrong method', async () => {
    const req = new Request('https://worker.example/chat', {
      method: 'GET',
      headers: { Origin: 'https://site.example' },
    });
    const res = await worker.fetch(req, baseEnv() as any);
    expect(res.status).toBe(405);
  });

  it('rejects unknown path', async () => {
    const req = new Request('https://worker.example/other', {
      method: 'POST',
      headers: { Origin: 'https://site.example' },
    });
    const res = await worker.fetch(req, baseEnv() as any);
    expect(res.status).toBe(404);
  });

  it('returns 403 for disallowed origin on any path', async () => {
    const req = new Request('https://worker.example/other', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
    });
    const res = await worker.fetch(req, baseEnv() as any);
    expect(res.status).toBe(403);
  });
});

describe('worker: input validation', () => {
  beforeEach(() => __resetCacheForTests());

  it('400 on malformed JSON', async () => {
    const req = new Request('https://worker.example/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://site.example' },
      body: 'not json',
    });
    const res = await worker.fetch(req, baseEnv() as any);
    expect(res.status).toBe(400);
  });

  it('400 on missing slug', async () => {
    const res = await worker.fetch(chatRequest({ messages: [] }), baseEnv() as any);
    expect(res.status).toBe(400);
  });

  it('400 on too many turns', async () => {
    const messages = Array.from({ length: 21 }, () => ({ role: 'user', content: 'hi' }));
    const res = await worker.fetch(chatRequest({ slug: 'notion', messages }), baseEnv() as any);
    expect(res.status).toBe(400);
  });

  it('400 on oversized content', async () => {
    const messages = [{ role: 'user', content: 'x'.repeat(2001) }];
    const res = await worker.fetch(chatRequest({ slug: 'notion', messages }), baseEnv() as any);
    expect(res.status).toBe(400);
  });

  it('400 on unknown role', async () => {
    const messages = [{ role: 'system', content: 'hi' }];
    const res = await worker.fetch(chatRequest({ slug: 'notion', messages }), baseEnv() as any);
    expect(res.status).toBe(400);
  });

  it('includes CORS headers on 400 body-validation responses', async () => {
    const res = await worker.fetch(chatRequest({ messages: [] }), baseEnv() as any);
    expect(res.status).toBe(400);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://site.example');
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('logs 4xx rejections', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await worker.fetch(chatRequest({ messages: [] }), baseEnv() as any);
    expect(spy).toHaveBeenCalled();
    const logged = spy.mock.calls.map((c) => String(c[0])).find((s) => s.includes('"status":400'));
    expect(logged).toBeDefined();
    spy.mockRestore();
  });
});

describe('worker: context + rate limit', () => {
  beforeEach(() => {
    __resetCacheForTests();
    vi.stubGlobal('fetch', vi.fn(async (u: string) => {
      if (u.endsWith('/data/fitted/notion.md')) {
        return new Response('<!-- fit-summary: {"target":"Notion"} -->\n# R', { status: 200 });
      }
      if (u.endsWith('/data/input/directives.md')) return new Response('D', { status: 200 });
      if (u.endsWith('/data/input/jd/notion.md')) return new Response('J', { status: 200 });
      return new Response('missing', { status: 404 });
    }));
  });

  it('404 when fitted slug missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const res = await worker.fetch(
      chatRequest({ slug: 'missing', messages: [{ role: 'user', content: 'hi' }] }),
      baseEnv() as any,
    );
    expect(res.status).toBe(404);
  });

  it('429 after 21 requests from the same IP', async () => {
    const env = baseEnv() as any;
    const body = { slug: 'notion', messages: [{ role: 'user', content: 'hi' }] };
    for (let i = 0; i < 20; i++) await worker.fetch(chatRequest(body), env);
    const res = await worker.fetch(chatRequest(body), env);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });
});

describe('worker: anthropic passthrough', () => {
  beforeEach(() => {
    __resetCacheForTests();
    const pagesFetch = async (u: string) => {
      if (u.endsWith('/data/fitted/notion.md')) return new Response('# R', { status: 200 });
      if (u.includes('/data/input/')) return new Response('', { status: 404 });
      return new Response('', { status: 404 });
    };
    vi.stubGlobal('fetch', vi.fn(async (u: string, init?: RequestInit) => {
      if (u.startsWith('https://api.anthropic.com/')) {
        expect(init?.method).toBe('POST');
        const bodyStr = init?.body as string;
        expect(bodyStr).toContain('# R');
        expect(bodyStr).toContain('cache_control');
        const chunks = [
          'event: content_block_delta\ndata: {"delta":{"text":"Hi"}}\n\n',
          'event: content_block_delta\ndata: {"delta":{"text":" there"}}\n\n',
          'event: message_stop\ndata: {}\n\n',
        ];
        const stream = new ReadableStream({
          start(controller) {
            for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }
      return pagesFetch(u);
    }));
  });

  it('streams SSE body back to the client', async () => {
    const res = await worker.fetch(
      chatRequest({ slug: 'notion', messages: [{ role: 'user', content: 'hey' }] }),
      baseEnv() as any,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toContain('Hi');
    expect(text).toContain('there');
    expect(text).toContain('message_stop');
  });
});
