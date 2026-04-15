import type { AnalyticsDoc } from '../types';

interface Props {
  data: AnalyticsDoc;
}

function BarList({
  items,
  unit,
  format,
}: {
  items: Array<[string, number]>;
  unit: string;
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map(([, n]) => n));
  return (
    <ol className="hiw-bars">
      {items.map(([label, value], i) => (
        <li key={label} style={{ ['--i' as string]: i }}>
          <span className="hiw-bar-rank">{String(i + 1).padStart(2, '0')}</span>
          <span className="hiw-bar-label" title={label}>{label}</span>
          <span className="hiw-bar-track" aria-hidden>
            <span
              className="hiw-bar-fill"
              style={{ width: `${Math.max(4, (value / max) * 100)}%` }}
            />
          </span>
          <span className="hiw-bar-val">
            {format(value)}
            <small>{unit}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function AgentStats({ data }: Props) {
  const generated = data.generated_at.slice(0, 10);

  const stats: Array<{ k: string; v: string; note?: string }> = [
    { k: 'Total sessions', v: String(data.total_sessions), note: 'since launch' },
    { k: 'Unique companies', v: String(data.unique_companies), note: 'adaptations served' },
    { k: 'Avg duration', v: `${data.global.avg_duration_s.toFixed(1)}s`, note: 'per visit' },
  ];
  const readout =
    `${stats[0].v} sessions · ${stats[1].v} companies · ${stats[2].v} avg · updated ${generated}`;

  return (
    <section className="hiw-stats" aria-label="Agent stats">
      <dl className="hiw-stat-grid" aria-hidden="true">
        {stats.map((s) => (
          <div key={s.k} className="hiw-stat">
            <dt>{s.k}</dt>
            <dd>
              <span className="hiw-stat-num" data-value={s.v} aria-hidden="true" />
              {s.note && <span className="hiw-stat-note">{s.note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <p className="hiw-stats-updated">{readout}</p>

      <div className="hiw-stat-panels">
        <div className="hiw-stat-panel">
          <h4>
            <span className="hiw-stat-panel-tag">projects</span>
            Most-clicked
          </h4>
          {data.global.top_projects.length === 0 ? (
            <p className="hiw-muted">No project clicks yet.</p>
          ) : (
            <BarList
              items={data.global.top_projects}
              unit="clicks"
              format={(n) => String(n)}
            />
          )}
        </div>
        <div className="hiw-stat-panel">
          <h4>
            <span className="hiw-stat-panel-tag">sections</span>
            Most-dwelt (avg seconds)
          </h4>
          {data.global.top_sections.length === 0 ? (
            <p className="hiw-muted">No dwell data yet.</p>
          ) : (
            <BarList
              items={data.global.top_sections}
              unit="s"
              format={(n) => n.toFixed(1)}
            />
          )}
        </div>
      </div>
    </section>
  );
}
