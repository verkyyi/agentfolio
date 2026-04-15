import type { MatchScore } from '../types';

interface Props {
  score: MatchScore;
}

export function MatchScoreBar({ score }: Props) {
  const pct = Math.round(score.overall * 100);
  return (
    <aside aria-label="Match score">
      <p>
        <strong>{pct}% match</strong>
      </p>
      <ul>
        {Object.entries(score.by_category).map(([cat, val]) => (
          <li key={cat}>
            {cat}: {Math.round(val * 100)}%
          </li>
        ))}
      </ul>
    </aside>
  );
}
