import type { ApiConfig } from './githubApi';
import type { AnalyticsFlushPayload } from '../types';

function headers(cfg: ApiConfig): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.pat}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

function toBody(payload: AnalyticsFlushPayload): string {
  return '```json\n' + JSON.stringify(payload, null, 2) + '\n```';
}

export async function createAnalyticsIssue(
  payload: AnalyticsFlushPayload,
  cfg: ApiConfig,
): Promise<number> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues`;
  const body = {
    title: `[analytics] ${new Date().toISOString()}`,
    body: toBody(payload),
    labels: ['analytics'],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create analytics issue failed: ${res.status}`);
  const data = (await res.json()) as { number: number };
  return data.number;
}

export async function appendAnalyticsComment(
  issueNumber: number,
  payload: AnalyticsFlushPayload,
  cfg: ApiConfig,
): Promise<void> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues/${issueNumber}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify({ body: toBody(payload) }),
  });
  if (!res.ok) throw new Error(`append analytics comment failed: ${res.status}`);
}
