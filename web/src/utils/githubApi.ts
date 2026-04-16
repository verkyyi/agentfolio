export interface ApiConfig {
  pat: string;
  repo: string;
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

export async function fetchIssueComments(
  issueNumber: number,
  cfg: ApiConfig,
): Promise<Array<{ body: string }>> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues/${issueNumber}/comments?per_page=100`;
  const res = await fetch(url, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`comments fetch failed: ${res.status}`);
  return (await res.json()) as Array<{ body: string }>;
}
