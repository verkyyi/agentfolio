import type { SlugRegistry, VisitorContext } from '../types';

export function parseSlugFromPath(pathname: string, basePath: string = '/'): string | null {
  // Strip base path prefix
  let path = pathname;
  if (basePath !== '/' && path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }
  // Remove leading/trailing slashes, get first segment
  const segment = path.replace(/^\/+|\/+$/g, '').split('/')[0] || null;
  return segment || null;
}

export function resolveSlug(
  slug: string | null,
  registry: SlugRegistry,
): VisitorContext {
  if (!slug) {
    return { source: 'default', company: 'default', role: null };
  }
  if (registry[slug]) {
    const entry = registry[slug];
    return { source: 'slug', slug, company: entry.company, role: entry.role };
  }
  return { source: 'default', slug, company: '__not_found__', role: null };
}
