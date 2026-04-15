import { useEffect, useState } from 'react';
import type { AdaptedResume } from '../types';

interface Props {
  slugs: string[];
}

type Loaded = { slug: string; adapted: AdaptedResume | null };

export function AdaptationComparison({ slugs }: Props) {
  const [rows, setRows] = useState<Loaded[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results: Loaded[] = [];
      for (const slug of slugs) {
        const url = `${import.meta.env.BASE_URL}data/adapted/${slug}.json`;
        try {
          const res = await fetch(url);
          if (!res.ok) {
            results.push({ slug, adapted: null });
            continue;
          }
          const json = (await res.json()) as AdaptedResume;
          results.push({ slug, adapted: json });
        } catch {
          results.push({ slug, adapted: null });
        }
      }
      if (!cancelled) setRows(results);
    })();
    return () => { cancelled = true; };
  }, [slugs.join('|')]);

  return (
    <section aria-label="Adaptation comparison">
      <h3>Adaptation Comparison</h3>
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Summary</th>
            <th>Section order</th>
            <th>Top skills</th>
            <th>Match</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            r.adapted ? (
              <tr key={r.slug}>
                <td>{r.adapted.company}</td>
                <td>{r.adapted.summary}</td>
                <td>{r.adapted.section_order.join(' → ')}</td>
                <td>{r.adapted.skill_emphasis.slice(0, 3).join(', ')}</td>
                <td>{Math.round(r.adapted.match_score.overall * 100)}%</td>
              </tr>
            ) : (
              <tr key={r.slug}>
                <td>{r.slug}</td>
                <td colSpan={4}>not available</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </section>
  );
}
