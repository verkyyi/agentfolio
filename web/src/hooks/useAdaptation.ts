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
        const url = `${import.meta.env.BASE_URL}data/adapted/${slug}.json`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`not_found`);
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
