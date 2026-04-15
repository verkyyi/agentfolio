import { useEffect, useState } from 'react';
import type { AnalyticsDoc } from '../types';

export function useAnalytics(url?: string) {
  const [data, setData] = useState<AnalyticsDoc | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const target = url ?? `${import.meta.env.BASE_URL}data/analytics.json`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(target);
        if (!res.ok) throw new Error(`analytics fetch: ${res.status}`);
        const json = (await res.json()) as AnalyticsDoc;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [target]);

  return { data, error, loading };
}
