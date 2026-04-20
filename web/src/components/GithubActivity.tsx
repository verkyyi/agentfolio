// web/src/components/GithubActivity.tsx
import styled from 'styled-components';
import { colorFor } from '../utils/githubColors';

export interface ActivityData {
  user: string;
  fetchedAt: string;
  stats: {
    publicRepos: number;
    contributions30d: number;
    contributionsLastYear: number;
  };
  contributions: { weeks: { date: string; count: number }[][] };
  languages: { name: string; color: string; pct: number }[];
  repos: {
    name: string;
    url: string;
    description: string;
    language: string | null;
    languageColor: string | null;
    stars: number;
    pushedAt: string;
  }[];
}

const Wrapper = styled.section`
  max-width: var(--column-max);
  margin: 48px auto 24px;
  padding: 0 var(--side-gutter);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--text);
  border-top: 1px solid var(--border-soft);
  padding-top: 32px;

  @media (max-width: 640px) {
    padding-left: var(--side-gutter-mobile);
    padding-right: var(--side-gutter-mobile);
  }

  @media print { display: none; }
`;

const RepoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 16px 0;

  li { padding: 8px 0; border-bottom: 1px solid var(--border-soft); font-size: 14px; }
  li:last-child { border-bottom: none; }
  a { color: var(--text); font-weight: 600; text-decoration: none; }
  a:hover { color: var(--accent-blue); }
  .meta { color: var(--text-muted); font-size: 12px; margin-left: 8px; }
  .desc { color: var(--text-muted); display: block; margin-top: 2px; }
`;

const Footnote = styled.div`
  font-size: 11px;
  color: var(--text-dim);
  text-align: right;
`;

function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = now.getTime() - then;
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export function GithubActivity({ data }: { data: ActivityData | null }) {
  if (!data) return null;

  return (
    <Wrapper id="activity" data-testid="github-activity">
      <RepoList>
        {data.repos.map((r) => (
          <li key={r.name}>
            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a>
            {r.language && (
              <span className="meta" style={{ color: r.languageColor ?? colorFor(r.language) }}>
                ● {r.language}
              </span>
            )}
            <span className="meta">· pushed {formatRelative(r.pushedAt)}</span>
            {r.description && <span className="desc">{r.description}</span>}
          </li>
        ))}
      </RepoList>

      <Footnote>Updated {data.fetchedAt.slice(0, 10)}</Footnote>
    </Wrapper>
  );
}
