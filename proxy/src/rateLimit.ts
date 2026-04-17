export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(buf).slice(0, 8);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface LimitDecision {
  allowed: boolean;
  retryAfter: number;
}

const SHORT_WINDOW_MS = 10 * 60 * 1000;
const SHORT_WINDOW_MAX = 20;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAY_WINDOW_MAX = 100;

interface Counter {
  count: number;
  windowStart: number;
}

async function readCounter(kv: KVNamespace, key: string): Promise<Counter> {
  const raw = await kv.get(key);
  if (!raw) return { count: 0, windowStart: Date.now() };
  try {
    return JSON.parse(raw) as Counter;
  } catch {
    return { count: 0, windowStart: Date.now() };
  }
}

async function bump(
  kv: KVNamespace,
  key: string,
  windowMs: number,
  max: number,
): Promise<{ allowed: boolean; remainingMs: number }> {
  const now = Date.now();
  const cur = await readCounter(kv, key);
  let { count, windowStart } = cur;
  if (now - windowStart >= windowMs) {
    count = 0;
    windowStart = now;
  }
  if (count >= max) {
    return { allowed: false, remainingMs: windowStart + windowMs - now };
  }
  count += 1;
  const ttlSeconds = Math.max(60, Math.ceil((windowStart + windowMs - now) / 1000));
  await kv.put(key, JSON.stringify({ count, windowStart }), {
    expirationTtl: ttlSeconds,
  });
  return { allowed: true, remainingMs: 0 };
}

export async function checkRateLimit(
  kv: KVNamespace,
  ipHash: string,
): Promise<LimitDecision> {
  const shortKey = `rl:short:${ipHash}`;
  const dayKey = `rl:day:${ipHash}`;
  const short = await bump(kv, shortKey, SHORT_WINDOW_MS, SHORT_WINDOW_MAX);
  if (!short.allowed) {
    return { allowed: false, retryAfter: Math.ceil(short.remainingMs / 1000) };
  }
  const day = await bump(kv, dayKey, DAY_WINDOW_MS, DAY_WINDOW_MAX);
  if (!day.allowed) {
    return { allowed: false, retryAfter: Math.ceil(day.remainingMs / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}
