import type { RepoCardData } from '../../blocks/types';
import './RepoCard.css';

export interface RepoCardProps { data: RepoCardData }

export function RepoCard({ data }: RepoCardProps) {
  const max = data.sparkline && Math.max(1, ...data.sparkline);
  return (
    <a className="block-repo-card" href={data.url} target="_blank" rel="noreferrer">
      <div className="block-repo-card-head">
        <span className="block-repo-card-name">{data.name}</span>
        {typeof data.commits === 'number' && (
          <span className="block-repo-card-commits">{data.commits} commits</span>
        )}
      </div>
      {data.description && <div className="block-repo-card-desc">{data.description}</div>}
      {data.sparkline && data.sparkline.length > 0 && (
        <div className="block-repo-card-spark" aria-hidden="true">
          {data.sparkline.map((v, i) => (
            <span key={i} style={{ height: `${(v / (max ?? 1)) * 100}%` }} />
          ))}
        </div>
      )}
    </a>
  );
}
