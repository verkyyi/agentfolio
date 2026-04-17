import React from 'react';
import './ActivityStrip.css';
import type { ActivityData } from './GithubActivity';
import { topLanguages, recentDays } from '../utils/activityMetrics';

const SPARK_BUCKETS = ['#161b22', '#033a16', '#196c2e', '#2ea043', '#56d364'];

function sparkBucket(count: number): number {
  if (count <= 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}

function handleJump(e: React.MouseEvent<HTMLButtonElement>) {
  e.preventDefault();
  const target = document.getElementById('activity');
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function ActivityStrip({ data }: { data: ActivityData | null }) {
  if (!data) return null;

  const top = topLanguages(data, 3);
  const days = recentDays(data, 14);

  return (
    <section className="strip" aria-label="Live activity summary">
      <span className="strip-label">live</span>
      <div className="strip-bars" aria-hidden="true">
        {days.map((d) => (
          <span
            key={d.date}
            style={{ background: SPARK_BUCKETS[sparkBucket(d.count)] }}
            title={`${d.count} on ${d.date}`}
          />
        ))}
      </div>
      <span className="strip-count">
        <strong>{data.stats.contributions30d}</strong> contributions · 30d
      </span>
      <span className="strip-sep" aria-hidden="true">|</span>
      {top.map((l) => (
        <span key={l.name} className="strip-lang">
          <span className="strip-dot" style={{ background: l.color || '#888' }} />
          {l.name} {Math.round(l.pct)}%
        </span>
      ))}
      <button className="strip-jump" type="button" onClick={handleJump}>
        ↓ jump to full activity
      </button>
    </section>
  );
}
