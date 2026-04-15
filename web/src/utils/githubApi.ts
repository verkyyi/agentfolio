import type { GithubIssue } from '../types';

export interface ApiConfig {
  pat: string;
  repo: string;
}

function normalize(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, '-');
}

export function getApiConfig(opts: {
  pat: string | undefined;
  repo: string | undefined;
}): ApiConfig {
  if (!opts.pat) throw new Error('VITE_GITHUB_PAT not configured — live generation unavailable');
  if (!opts.repo) throw new Error('VITE_GITHUB_REPO not configured');
  return { pat: opts.pat, repo: opts.repo };
}

function headers(cfg: ApiConfig): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.pat}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

export async function findOpenRequestForCompany(
  company: string,
  cfg: ApiConfig,
): Promise<number | null> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues?labels=adapt-request&state=open&per_page=100`;
  const res = await fetch(url, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`issue list failed: ${res.status}`);
  const issues = (await res.json()) as GithubIssue[];
  const slug = normalize(company);
  const found = issues.find((i) => {
    const m = i.title.match(/^\[adapt\]\s*(.+?)\s*\|/);
    if (!m) return false;
    return normalize(m[1]) === slug;
  });
  return found ? found.number : null;
}

export async function createAdaptRequest(
  company: string,
  role: string,
  cfg: ApiConfig,
): Promise<number> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues`;
  const body = {
    title: `[adapt] ${company} | ${role}`,
    body: JSON.stringify({
      company,
      role,
      timestamp: new Date().toISOString(),
    }),
    labels: ['adapt-request'],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create issue failed: ${res.status}`);
  const data = (await res.json()) as { number: number };
  return data.number;
}

export async function fetchIssueComments(
  issueNumber: number,
  cfg: ApiConfig,
): Promise<Array<{ body: string }>> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues/${issueNumber}/comments?per_page=100`;
  const res = await fetch(url, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`comments fetch failed: ${res.status}`);
  return (await res.json()) as Array<{ body: string }>;
}
