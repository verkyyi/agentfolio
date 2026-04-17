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
});
