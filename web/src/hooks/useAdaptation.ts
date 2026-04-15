import { useEffect, useState } from 'react';
import type { AdaptedResume, BaseResume } from '../types';

function normalize(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, '-');
}

export function useAdaptation(company: string | null) {
  const [adapted, setAdapted] = useState<AdaptedResume | null>(null);
  const [base, setBase] = useState<BaseResume | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    const baseUrl = `${import.meta.env.BASE_URL}data/resume.json`;
    const slug = normalize(company);

    (async () => {
      try {
        const baseRes = await fetch(baseUrl);
        if (!baseRes.ok) throw new Error(`base resume fetch: ${baseRes.status}`);
        const baseData = (await baseRes.json()) as BaseResume;

        const primaryUrl = `${import.meta.env.BASE_URL}data/adapted/${slug}.json`;
        let adaptedRes = await fetch(primaryUrl);
        if (!adaptedRes.ok) {
          const fallbackUrl = `${import.meta.env.BASE_URL}data/adapted/default.json`;
          adaptedRes = await fetch(fallbackUrl);
          if (!adaptedRes.ok) {
            throw new Error(`no adaptation available for ${slug} or default`);
          }
        }
        const adaptedData = (await adaptedRes.json()) as AdaptedResume;

        if (cancelled) return;
        setBase(baseData);
        setAdapted(adaptedData);
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [company]);

  return { adapted, base, error };
}
