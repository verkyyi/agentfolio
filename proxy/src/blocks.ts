// Must stay in sync with web/src/blocks/types.ts
export interface RepoCardData {
  name: string;
  description: string;
  commits?: number;
  sparkline?: number[];
  url: string;
  primaryLang?: string;
}

export interface ActivitySummaryData {
  window: '30d' | '90d';
  totalCommits: number;
  topRepos: Array<{ name: string; commits: number }>;
  sparkline: number[];
}

export interface WorkHighlightData {
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface OpenPanelData {
  panel: 'resume' | 'activity' | 'jd';
}

export type BlockFrame =
  | { id: string; type: 'repo-card';        data: RepoCardData }
  | { id: string; type: 'activity-summary'; data: ActivitySummaryData }
  | { id: string; type: 'work-highlight';   data: WorkHighlightData }
  | { id: string; type: 'open-panel';       data: OpenPanelData };
