import activity from '../../data/github/activity.json';

export interface DayCount {
  date: string;
  count: number;
}

export interface ActivityBundle {
  user: string;
  fetchedAt: string;
  stats: {
    publicRepos: number;
    contributions30d: number;
    contributionsLastYear: number;
  };
  contributions: { weeks: DayCount[][] };
  languages: Array<{ name: string; color: string; pct: number }>;
  repos: Array<{
    name: string;
    url: string;
    description: string;
    language: string | null;
    languageColor?: string;
    stars: number;
    pushedAt: string;
  }>;
}

export function getActivity(): ActivityBundle {
  return activity as unknown as ActivityBundle;
}

export function getRecentDailyCounts(): DayCount[] {
  const a = getActivity();
  return a.contributions.weeks.flat();
}
