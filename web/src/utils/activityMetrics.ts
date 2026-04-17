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
