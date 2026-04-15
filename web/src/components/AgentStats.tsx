import type { AnalyticsDoc } from '../types';

interface Props {
  data: AnalyticsDoc;
}

export function AgentStats({ data }: Props) {
  const summary = `Total sessions: ${data.total_sessions} · Unique companies served: ${data.unique_companies} · Avg duration ${data.global.avg_duration_s.toFixed(1)}s · Updated ${data.generated_at.slice(0, 10)}`;

  return (
    <section aria-label="Agent stats">
      <h3>Agent Stats</h3>
      <p>{summary}</p>
      <h4>Most-clicked projects</h4>
      <ol>
        {data.global.top_projects.map(([pid, count]) => (
          <li key={pid}>
            <span>{pid}</span> — {count} clicks
          </li>
        ))}
      </ol>
      <h4>Most-dwelt sections (avg seconds)</h4>
      <ol>
        {data.global.top_sections.map(([section, secs]) => (
          <li key={section}>
            <span>{section}</span> — {secs.toFixed(1)}s
          </li>
        ))}
      </ol>
    </section>
  );
}
