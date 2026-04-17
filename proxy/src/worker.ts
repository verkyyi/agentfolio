import { loadSlugContext } from './context';

export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
  PAGES_ORIGIN: string;
  IP_HASH_SALT: string;
  MODEL: string;
  NAME: string;
  RATE_LIMIT_KV: KVNamespace;
}

interface ChatBody {
  slug: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  greeting?: string;
}

interface HintsBody {
  slug: string;
  recentMessages?: { role: 'user' | 'assistant'; content: string }[];
  maxChars?: number;
}

const MAX_TURNS = 20;
const MAX_CONTENT = 2000;
const MAX_GREETING = 500;
const MAX_HINT_TURNS = 4;

function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
}

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(status: number, body: unknown, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function logAndReturn(
  res: Response,
  meta: { slug?: string; ipHash?: string; status: number },
): Response {
  console.log(JSON.stringify({
    slug: meta.slug ?? null,
    ip_hash: meta.ipHash ?? null,
    status: meta.status,
  }));
  return res;
}

function validateBody(parsed: unknown): ChatBody | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const b = parsed as Partial<ChatBody>;
  if (typeof b.slug !== 'string' || !b.slug) return null;
  if (!Array.isArray(b.messages)) return null;
  if (b.messages.length > MAX_TURNS) return null;
  for (const m of b.messages) {
    if (!m || typeof m !== 'object') return null;
    if (m.role !== 'user' && m.role !== 'assistant') return null;
    if (typeof m.content !== 'string') return null;
    if (m.content.length > MAX_CONTENT) return null;
  }
  if (b.greeting !== undefined) {
    if (typeof b.greeting !== 'string') return null;
    if (b.greeting.length > MAX_GREETING) return null;
  }
  return b as ChatBody;
}

function validateHintsBody(parsed: unknown): HintsBody | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const b = parsed as Partial<HintsBody>;
  if (typeof b.slug !== 'string' || !b.slug) return null;
  if (b.recentMessages !== undefined) {
    if (!Array.isArray(b.recentMessages)) return null;
    if (b.recentMessages.length > MAX_HINT_TURNS) return null;
    for (const m of b.recentMessages) {
      if (!m || typeof m !== 'object') return null;
      if (m.role !== 'user' && m.role !== 'assistant') return null;
      if (typeof m.content !== 'string') return null;
      if (m.content.length > MAX_CONTENT) return null;
    }
  }
  if (b.maxChars !== undefined) {
    if (typeof b.maxChars !== 'number' || !Number.isFinite(b.maxChars)) return null;
  }
  return b as HintsBody;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin') ?? '';
    const allow = allowedOrigins(env);

    if (req.method === 'OPTIONS') {
      if (!allow.includes(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!allow.includes(origin)) {
      return new Response('forbidden', { status: 403 });
    }

    const url = new URL(req.url);
    if (url.pathname === '/chat') {
      return handleChat(req, env, origin);
    }
    if (url.pathname === '/hints') {
      return handleHints(req, env, origin);
    }
    return new Response('not found', { status: 404, headers: corsHeaders(origin) });
  },
};

async function handleChat(req: Request, env: Env, origin: string): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: corsHeaders(origin) });
  }
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return logAndReturn(
      json(400, { error: 'invalid_json' }, corsHeaders(origin)),
      { status: 400 },
    );
  }
  const body = validateBody(parsed);
  if (!body) {
    return logAndReturn(
      json(400, { error: 'invalid_body' }, corsHeaders(origin)),
      { status: 400 },
    );
  }
  const ip = req.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
  const { hashIp, checkRateLimit } = await import('./rateLimit');
  const ipHash = await hashIp(ip, env.IP_HASH_SALT);
  const rl = await checkRateLimit(env.RATE_LIMIT_KV, ipHash);
  if (!rl.allowed) {
    return logAndReturn(
      json(
        429,
        { error: 'rate_limited' },
        { ...corsHeaders(origin), 'Retry-After': String(rl.retryAfter) },
      ),
      { slug: body.slug, ipHash, status: 429 },
    );
  }
  const ctx = await loadSlugContext(body.slug, env.PAGES_ORIGIN);
  if (!ctx) {
    return logAndReturn(
      json(404, { error: 'unknown_slug' }, corsHeaders(origin)),
      { slug: body.slug, ipHash, status: 404 },
    );
  }
  const ac = new AbortController();
  req.signal.addEventListener('abort', () => ac.abort());
  const started = Date.now();
  const { callAnthropic } = await import('./anthropic');
  const upstream = await callAnthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.MODEL,
    slug: body.slug,
    name: env.NAME || 'the owner',
    ctx,
    messages: body.messages,
    greeting: body.greeting,
    signal: ac.signal,
  });
  if (!upstream.ok || !upstream.body) {
    return logAndReturn(
      json(502, { error: 'upstream_error' }, corsHeaders(origin)),
      { slug: body.slug, ipHash, status: 502 },
    );
  }
  const response = new Response(upstream.body, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
  console.log(JSON.stringify({
    slug: body.slug,
    ip_hash: ipHash,
    messages: body.messages.length,
    status: 200,
    latency_ms: Date.now() - started,
  }));
  return response;
}

async function handleHints(req: Request, env: Env, origin: string): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: corsHeaders(origin) });
  }
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return logAndReturn(
      json(400, { error: 'invalid_json' }, corsHeaders(origin)),
      { status: 400 },
    );
  }
  const body = validateHintsBody(parsed);
  if (!body) {
    return logAndReturn(
      json(400, { error: 'invalid_body' }, corsHeaders(origin)),
      { status: 400 },
    );
  }
  const ip = req.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
  const { hashIp, checkRateLimit } = await import('./rateLimit');
  const ipHash = await hashIp(ip, env.IP_HASH_SALT);
  const rl = await checkRateLimit(env.RATE_LIMIT_KV, ipHash, 'hints:');
  if (!rl.allowed) {
    return logAndReturn(
      json(
        429,
        { error: 'rate_limited' },
        { ...corsHeaders(origin), 'Retry-After': String(rl.retryAfter) },
      ),
      { slug: body.slug, ipHash, status: 429 },
    );
  }
  const ctx = await loadSlugContext(body.slug, env.PAGES_ORIGIN);
  if (!ctx) {
    return logAndReturn(
      json(404, { error: 'unknown_slug' }, corsHeaders(origin)),
      { slug: body.slug, ipHash, status: 404 },
    );
  }
  const ac = new AbortController();
  req.signal.addEventListener('abort', () => ac.abort());
  const { callHints } = await import('./hints');
  const { extractTarget } = await import('./prompt');
  const target = extractTarget(ctx.fitted, body.slug);
  const hints = await callHints({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.MODEL,
    name: env.NAME || 'the owner',
    target,
    fitted: ctx.fitted,
    directives: ctx.directives,
    jd: ctx.jd,
    recentMessages: body.recentMessages ?? [],
    maxChars: body.maxChars,
    signal: ac.signal,
  });
  console.log(JSON.stringify({
    slug: body.slug,
    ip_hash: ipHash,
    route: 'hints',
    status: 200,
    count: hints.length,
  }));
  return json(200, { hints }, corsHeaders(origin));
}
