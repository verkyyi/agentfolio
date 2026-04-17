import { loadSlugContext } from './context';

export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
  PAGES_ORIGIN: string;
  IP_HASH_SALT: string;
  MODEL: string;
  RATE_LIMIT_KV: KVNamespace;
}

interface ChatBody {
  slug: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

const MAX_TURNS = 20;
const MAX_CONTENT = 2000;

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
  return b as ChatBody;
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
    if (url.pathname !== '/chat') {
      return new Response('not found', { status: 404, headers: corsHeaders(origin) });
    }
    if (req.method !== 'POST') {
      return new Response('method not allowed', { status: 405, headers: corsHeaders(origin) });
    }

    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      return json(400, { error: 'invalid_json' }, corsHeaders(origin));
    }

    const body = validateBody(parsed);
    if (!body) {
      return json(400, { error: 'invalid_body' }, corsHeaders(origin));
    }

    // context loading, rate limiting, and Anthropic call land in later tasks.
    const ctx = await loadSlugContext(body.slug, env.PAGES_ORIGIN);
    if (!ctx) {
      return json(404, { error: 'unknown_slug' }, corsHeaders(origin));
    }

    return json(501, { error: 'not_implemented' }, corsHeaders(origin));
  },
};
