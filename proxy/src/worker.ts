export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
  PAGES_ORIGIN: string;
  IP_HASH_SALT: string;
  MODEL: string;
  RATE_LIMIT_KV: KVNamespace;
}

export default {
  async fetch(_req: Request, _env: Env): Promise<Response> {
    return new Response('not implemented', { status: 501 });
  },
};
