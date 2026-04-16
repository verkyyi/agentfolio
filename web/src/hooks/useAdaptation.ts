import { useEffect, useState } from 'react';
import type { AdaptedResume } from '../types';

function normalize(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, '-');
}

export function useAdaptation(company: string | null) {
  const [adapted, setAdapted] = useState<AdaptedResume | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    const slug = normalize(company);

    (async () => {
      try {
        const primaryUrl = `${import.meta.env.BASE_URL}data/adapted/${slug}.json`;
        let res = await fetch(primaryUrl);
        if (!res.ok) {
          const fallbackUrl = `${import.meta.env.BASE_URL}data/adapted/default.json`;
          res = await fetch(fallbackUrl);
          if (!res.ok) {
            throw new Error(`no adaptation available for ${slug} or default`);
          }
        }
        const data = (await res.json()) as AdaptedResume;
        if (cancelled) return;
        setAdapted(data);
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
      }
    })();

    return () => { cancelled = true; };
  }, [company]);

  return { adapted, error };
}
