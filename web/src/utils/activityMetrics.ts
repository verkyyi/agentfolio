import type { ActivityData } from '../components/GithubActivity';

export function topLanguages(data: ActivityData, n: number): ActivityData['languages'] {
  return [...data.languages].sort((a, b) => b.pct - a.pct).slice(0, n);
}

export function recentDays(data: ActivityData, n: number): { date: string; count: number }[] {
  const flat: { date: string; count: number }[] = [];
  for (const week of data.contributions.weeks) {
    for (const day of week) flat.push(day);
  }
  return flat.slice(-n);
}

/**
 * Map a day's contribution count to a 0..4 heatmap bucket index.
 * -1 and 0 both collapse to the bottom bucket (pad days vs. zero-activity days).
 * Callers supply their own color palette indexed by the returned bucket.
 */
export function bucketIndex(count: number): number {
  if (count <= 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}
