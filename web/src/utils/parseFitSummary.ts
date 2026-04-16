export interface FitSummary {
  target: string;
  changes: string[];
}

const COMMENT_RE = /^<!--\s*\nfit-summary:\s*\n([\s\S]*?)-->\s*\n/;

export function parseFitSummary(markdown: string): { summary: FitSummary | null; body: string } {
  const match = markdown.match(COMMENT_RE);
  if (!match) return { summary: null, body: markdown };

  const block = match[1];
  const targetMatch = block.match(/target:\s*(.+)/);
  const changes: string[] = [];
  for (const line of block.split('\n')) {
    const item = line.match(/^\s+-\s+(.+)/);
    if (item) changes.push(item[1]);
  }

  const summary: FitSummary | null =
    targetMatch && changes.length > 0
      ? { target: targetMatch[1].trim(), changes }
      : null;

  return { summary, body: markdown.slice(match[0].length) };
}
