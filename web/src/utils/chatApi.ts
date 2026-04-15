import type { ApiConfig } from './githubApi';

function headers(cfg: ApiConfig): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.pat}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

export async function createChatRequest(
  question: string,
  cfg: ApiConfig,
): Promise<number> {
  const trimmedTitle = `[chat] ${question.slice(0, 60)}${question.length > 60 ? '…' : ''}`;
  const url = `https://api.github.com/repos/${cfg.repo}/issues`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify({
      title: trimmedTitle,
      body: JSON.stringify({ question, ts: new Date().toISOString() }),
      labels: ['chat-request'],
    }),
  });
  if (!res.ok) throw new Error(`create chat request failed: ${res.status}`);
  const data = (await res.json()) as { number: number };
  return data.number;
}

export async function fetchChatComments(
  issueNumber: number,
  cfg: ApiConfig,
): Promise<Array<{ body: string }>> {
  const url = `https://api.github.com/repos/${cfg.repo}/issues/${issueNumber}/comments?per_page=100`;
  const res = await fetch(url, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`fetch comments failed: ${res.status}`);
  return (await res.json()) as Array<{ body: string }>;
}
