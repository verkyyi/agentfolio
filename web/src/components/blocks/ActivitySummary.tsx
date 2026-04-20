import type { ActivitySummaryData } from '../../blocks/types';
import './ActivitySummary.css';

export interface ActivitySummaryProps { data: ActivitySummaryData }

export function ActivitySummary({ data }: ActivitySummaryProps) {
  const max = Math.max(1, ...data.sparkline);
  const windowLabel = data.window === '90d' ? '90 days' : '30 days';
  return (
    <div className="block-activity-summary">
      <div className="block-activity-head">
        <strong>{data.totalCommits} commits</strong> · last {windowLabel}
      </div>
      <div className="block-activity-spark" aria-hidden="true">
        {data.sparkline.map((v, i) => (
          <span key={i} style={{ height: `${(v / max) * 100}%` }} />
        ))}
      </div>
      {data.topRepos.length > 0 && (
        <ul className="block-activity-repos">
          {data.topRepos.map((r) => (
            <li key={r.name}>
              <span>{r.name}</span>
              <span className="block-activity-repo-count">{r.commits}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
