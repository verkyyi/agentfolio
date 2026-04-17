import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, hashIp } from '../src/rateLimit';

function makeKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(k: string) { return store.get(k) ?? null; },
    async put(k: string, v: string) { store.set(k, v); },
    async delete(k: string) { store.delete(k); },
    async list() { return { keys: [], list_complete: true, cursor: '' } as any; },
    getWithMetadata: (async () => ({ value: null, metadata: null })) as any,
  } as unknown as KVNamespace;
}

describe('hashIp', () => {
  it('hashes consistently with a salt', async () => {
    const a = await hashIp('1.2.3.4', 'salt');
    const b = await hashIp('1.2.3.4', 'salt');
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });

  it('differs with different salts', async () => {
    const a = await hashIp('1.2.3.4', 's1');
    const b = await hashIp('1.2.3.4', 's2');
    expect(a).not.toBe(b);
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows requests under the short-window limit', async () => {
    const kv = makeKV();
    for (let i = 0; i < 20; i++) {
      const r = await checkRateLimit(kv, 'abc');
      expect(r.allowed).toBe(true);
    }
  });

  it('rejects the 21st request within 10 minutes', async () => {
    const kv = makeKV();
    for (let i = 0; i < 20; i++) await checkRateLimit(kv, 'abc');
    const r = await checkRateLimit(kv, 'abc');
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
  });

  it('rejects past the daily limit', async () => {
    const kv = makeKV();
    // 5 burst windows of 20 each = 100 — still allowed
    for (let w = 0; w < 5; w++) {
      for (let i = 0; i < 20; i++) await checkRateLimit(kv, 'abc');
      vi.advanceTimersByTime(10 * 60 * 1000 + 1000);
    }
    const r = await checkRateLimit(kv, 'abc');
    expect(r.allowed).toBe(false);
  });
});
