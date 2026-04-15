import { useAnalytics } from '../hooks/useAnalytics';
import { AgentStats } from './AgentStats';
import { AdaptationComparison } from './AdaptationComparison';

interface Props {
  compareSlugs: string[];
}

export function ArchitecturePage({ compareSlugs }: Props) {
  const { data, error, loading } = useAnalytics();

  return (
    <main>
      <h1>How this works</h1>
      <p>
        AgentFolio is an agent that adapts this resume to whoever is reading it.
        Five stages, each linked to a real engineering skill:
      </p>
      <ol>
        <li><strong>Perceive</strong> — detect who is visiting (URL slug or self-ID).</li>
        <li><strong>Reason</strong> — pick the right profile and rewrite the summary.</li>
        <li><strong>Act</strong> — render the adapted resume in your browser.</li>
        <li><strong>Learn</strong> — track engagement and aggregate weekly.</li>
        <li><strong>Explain</strong> — this page; everything auditable on GitHub.</li>
      </ol>

      {loading && <p>Loading stats…</p>}
      {error && <p>No aggregated stats yet — come back after the first weekly aggregation.</p>}
      {data && <AgentStats data={data} />}

      {compareSlugs.length > 0 && <AdaptationComparison slugs={compareSlugs} />}

      <p>
        <a href="https://github.com/verkyyi/agentfolio" target="_blank" rel="noreferrer">
          View source on GitHub →
        </a>
      </p>
    </main>
  );
}
