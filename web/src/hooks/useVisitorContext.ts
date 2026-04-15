import { useEffect, useState } from 'react';
import type { SlugRegistry, VisitorContext } from '../types';
import { parseSlugFromPath, resolveSlug } from '../utils/slugResolver';

interface Options {
  pathname?: string;
  slugsUrl?: string;
}

export function useVisitorContext(options: Options = {}) {
  const [context, setContext] = useState<VisitorContext | null>(null);
  const [registry, setRegistry] = useState<SlugRegistry | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const pathname = options.pathname ?? window.location.pathname;
  const slugsUrl = options.slugsUrl ?? `${import.meta.env.BASE_URL}data/slugs.json`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(slugsUrl);
        if (!res.ok) throw new Error(`slugs fetch failed: ${res.status}`);
        const reg = (await res.json()) as SlugRegistry;
        if (cancelled) return;
        const slug = parseSlugFromPath(pathname);
        setRegistry(reg);
        setContext(resolveSlug(slug, reg));
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
        setContext({ source: 'default', company: 'default', role: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, slugsUrl]);

  return { context, registry, error };
}
