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
  max-width: 800px;
  margin: 48px auto 24px;
  padding: 0 40px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1f2937;
  border-top: 1px solid #e5e7eb;
  padding-top: 32px;

  @media print { display: none; }
`;

const Header = styled.div`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 20px;

  a { color: #1f2937; text-decoration: none; font-weight: 600; }
  a:hover { color: #2563eb; }
`;

const HeatmapWrap = styled.div`
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 24px;
`;

const LangBar = styled.div`
  display: flex;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const LangLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 24px;

  span { display: inline-flex; align-items: center; gap: 6px; }
  span::before {
    content: '';
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--dot);
  }
`;

const RepoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 16px;

  li { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  li:last-child { border-bottom: none; }
  a { color: #1f2937; font-weight: 600; text-decoration: none; }
  a:hover { color: #2563eb; }
  .meta { color: #6b7280; font-size: 12px; margin-left: 8px; }
  .desc { color: #4b5563; display: block; margin-top: 2px; }
`;

const Footnote = styled.div`
  font-size: 11px;
  color: #9ca3af;
  text-align: right;
`;

const HEATMAP_BUCKETS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

function bucket(count: number): number {
  if (count <= 0) return 0; // -1 = out-of-scope pad day, rendered same as zero
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Scope heatmap to match the "last 30 days" stat in the header: keep only
// weeks containing at least one day within the past 30 days. Days older
// than the cutoff within a kept week are rendered as inactive-bucket cells
// so the grid stays rectangular but the hot region is visually clear.
export function scopeToLast30Days(
  weeks: { date: string; count: number }[][],
  now: Date = new Date(),
): { date: string; count: number }[][] {
  // Normalize to UTC midnight so the cutoff compares cleanly with "YYYY-MM-DD"
  // day strings (which parse to 00:00 UTC).
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  return weeks
    .map((week) =>
      week.map((day) =>
        new Date(day.date) < cutoff ? { date: day.date, count: -1 } : day,
      ),
    )
    .filter((week) => week.some((d) => d.count !== -1));
}

function Heatmap({ weeks }: { weeks: ActivityData['contributions']['weeks'] }) {
  const cell = 11;
  const gap = 2;
  const left = 24;  // gutter for weekday labels
  const top = 16;   // gutter for month labels
  const width = left + weeks.length * (cell + gap);
  const height = top + 7 * (cell + gap);

  const monthLabels: { x: number; label: string }[] = [];
  weeks.forEach((week, wi) => {
    const first = week[0];
    if (!first) return;
    const mo = new Date(first.date + 'T00:00:00Z').getUTCMonth();
    const prevFirst = wi > 0 ? weeks[wi - 1][0]?.date : null;
    const prevMo = prevFirst ? new Date(prevFirst + 'T00:00:00Z').getUTCMonth() : -1;
    if (mo !== prevMo) {
      monthLabels.push({ x: left + wi * (cell + gap), label: MONTH_NAMES[mo] });
    }
  });

  const weekdayLabels = [
    { y: top + 1 * (cell + gap) + cell - 2, label: 'Mon' },
    { y: top + 3 * (cell + gap) + cell - 2, label: 'Wed' },
    { y: top + 5 * (cell + gap) + cell - 2, label: 'Fri' },
  ];

  return (
    <svg width={width} height={height} role="img" aria-label="Contribution heatmap">
      {monthLabels.map((m, i) => (
        <text key={`mo-${i}`} x={m.x} y={10} fontSize={9} fill="#6b7280">{m.label}</text>
      ))}
      {weekdayLabels.map((w) => (
        <text key={`wd-${w.label}`} x={0} y={w.y} fontSize={9} fill="#6b7280">{w.label}</text>
      ))}
      {weeks.map((week, wi) =>
        week.map((day, di) => (
          <rect
            key={`${wi}-${di}`}
            className="heatmap-cell"
            x={left + wi * (cell + gap)}
            y={top + di * (cell + gap)}
            width={cell}
            height={cell}
            rx={2}
            fill={HEATMAP_BUCKETS[bucket(day.count)]}
          >
            {day.count >= 0 && (
              <title>{`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}</title>
            )}
          </rect>
        ))
      )}
    </svg>
  );
}

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
    <Wrapper>
      <Header>
        <a href={`https://github.com/${data.user}`} target="_blank" rel="noopener noreferrer">
          @{data.user}
        </a>
        {' · '}
        {data.stats.publicRepos} public repos
        {' · '}
        {data.stats.contributions30d} contributions last 30 days
      </Header>

      <HeatmapWrap>
        <Heatmap weeks={scopeToLast30Days(data.contributions.weeks)} />
      </HeatmapWrap>

      <LangBar>
        {data.languages.map((l) => (
          <div
            key={l.name}
            style={{ width: `${l.pct}%`, background: l.color || colorFor(l.name) }}
            title={`${l.name} ${l.pct}%`}
          />
        ))}
      </LangBar>
      <LangLegend>
        {data.languages.map((l) => (
          <span key={l.name} style={{ ['--dot' as any]: l.color || colorFor(l.name) }}>
            {l.name} {Math.round(l.pct)}%
          </span>
        ))}
      </LangLegend>

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
