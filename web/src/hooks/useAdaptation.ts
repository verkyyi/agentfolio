import { useEffect, useState } from 'react';
import type { AdaptedResume } from '../types';

function parseSlug(pathname: string, basePath: string = '/'): string | null {
  let path = pathname;
  if (basePath !== '/' && path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }
  const segment = path.replace(/^\/+|\/+$/g, '').split('/')[0] || null;
  return segment || null;
}

export function useAdaptation() {
  const [adapted, setAdapted] = useState<AdaptedResume | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const slug = parseSlug(window.location.pathname, import.meta.env.BASE_URL);

  useEffect(() => {
    let cancelled = false;
    const file = slug ?? 'default';
    const url = `${import.meta.env.BASE_URL}data/adapted/${file}.json`;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('not_found');
        const data = (await res.json()) as AdaptedResume;
        if (cancelled) return;
        setAdapted(data);
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  return { adapted, error, slug };
}
