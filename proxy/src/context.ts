export interface SlugContext {
  fitted: string;
  directives: string | null;
  jd: string | null;
}

interface Entry {
  value: string | null;
  expires: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, Entry>();
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export function __resetCacheForTests() {
  cache.clear();
}

async function fetchCached(url: string): Promise<string | null> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value;
  const res = await fetch(url);
  const value = res.ok ? await res.text() : null;
  cache.set(url, { value, expires: now + CACHE_TTL_MS });
  return value;
}

export async function loadSlugContext(
  slug: string,
  pagesOrigin: string,
): Promise<SlugContext | null> {
  if (!SLUG_RE.test(slug)) return null;
  const base = pagesOrigin.replace(/\/$/, '');
  const [fitted, directives, jd] = await Promise.all([
    fetchCached(`${base}/data/fitted/${slug}.md`),
    fetchCached(`${base}/data/input/directives.md`),
    fetchCached(`${base}/data/input/jd/${slug}.md`),
  ]);
  if (fitted === null) return null;
  return { fitted, directives, jd };
}
