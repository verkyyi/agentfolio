import { useEffect, useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { AgentStats } from './AgentStats';
import { AdaptationComparison } from './AdaptationComparison';
import { PipelineDiagram } from './PipelineDiagram';
import type { AdaptedResume } from '../types';

interface Props {
  compareSlugs: string[];
}

type Loaded = Record<string, AdaptedResume | null>;

export function ArchitecturePage({ compareSlugs }: Props) {
  const { data, error, loading } = useAnalytics();
  const [adaptations, setAdaptations] = useState<Loaded>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Loaded = {};
      for (const slug of compareSlugs) {
        const url = `${import.meta.env.BASE_URL}data/adapted/${slug}.json`;
        try {
          const res = await fetch(url);
          out[slug] = res.ok ? ((await res.json()) as AdaptedResume) : null;
        } catch {
          out[slug] = null;
        }
      }
      if (!cancelled) setAdaptations(out);
    })();
    return () => { cancelled = true; };
  }, [compareSlugs.join('|')]);

  const defaultTrace = compareSlugs.find((s) => s !== 'default') ?? compareSlugs[0];

  return (
    <main className="howitworks">
      <header className="hiw-hero">
        <p className="hiw-eyebrow">Field manual · rev. {new Date().getFullYear()}</p>
        <h1>How this works</h1>
        <p className="hiw-lede">
          AgentFolio is an agent that adapts this resume to whoever is reading it.
          Five stages — each a real engineering surface, each showing its own receipts.
        </p>
      </header>

      <PipelineDiagram
        slugs={compareSlugs}
        adaptations={adaptations}
        analytics={data}
        defaultSlug={defaultTrace}
      />

      <section className="hiw-block" aria-labelledby="hiw-stats-h">
        <header className="hiw-block-head">
          <span className="hiw-block-num">§2</span>
          <h2 id="hiw-stats-h">Telemetry</h2>
          <span className="hiw-block-rule" aria-hidden />
        </header>
        {loading && <p className="hiw-muted">Loading stats…</p>}
        {error && (
          <p className="hiw-muted">
            No aggregated stats yet — come back after the first weekly aggregation.
          </p>
        )}
        {data && <AgentStats data={data} />}
      </section>

      {compareSlugs.length > 0 && (
        <section className="hiw-block" aria-labelledby="hiw-diff-h">
          <header className="hiw-block-head">
            <span className="hiw-block-num">§3</span>
            <h2 id="hiw-diff-h">Proof sheet</h2>
            <span className="hiw-block-rule" aria-hidden />
          </header>
          <p className="hiw-lede hiw-lede-s">
            Each card is a concrete diff versus the <em>default</em> run — what this
            company's adaptation added, promoted, reordered, or dropped.
          </p>
          <AdaptationComparison slugs={compareSlugs} adaptations={adaptations} />
        </section>
      )}

      <footer className="hiw-foot">
        <a href={import.meta.env.VITE_GITHUB_REPO ? `https://github.com/${import.meta.env.VITE_GITHUB_REPO}` : '#'} target="_blank" rel="noreferrer">
          View source on GitHub ↗
        </a>
      </footer>
    </main>
  );
}
