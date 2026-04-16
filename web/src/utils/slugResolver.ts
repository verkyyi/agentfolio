import type { SlugRegistry, VisitorContext } from '../types';

export function parseSlugFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const cIdx = parts.indexOf('c');
  if (cIdx !== -1 && cIdx + 1 < parts.length) {
    return parts[cIdx + 1] || null;
  }
  const last = parts[parts.length - 1];
  if (last && last !== 'agentfolio' && last !== 'c') return last;
  return null;
}

export function resolveSlug(
  slug: string | null,
  registry: SlugRegistry,
): VisitorContext {
  if (slug && registry[slug]) {
    const entry = registry[slug];
    return {
      source: 'slug',
      slug,
      company: entry.company,
      role: entry.role,
    };
  }
  return {
    source: 'default',
    company: 'default',
    role: null,
  };
}
