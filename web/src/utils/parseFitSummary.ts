export interface FitSummary {
  target: string;
  changes: string[];
  greeting?: string;
  suggestions?: string[];
}

const COMMENT_RE = /^<!--\s*\nfit-summary:\s*\n([\s\S]*?)-->\s*\n/;
const LIST_HEADER_RE = /^\s*(\w+):\s*$/;        // `  changes:` or `  suggestions:`
const SCALAR_RE = /^\s*(\w+):\s+(.+)$/;         // `  target: value` or `  greeting: value`
const BULLET_RE = /^\s+-\s+(.+)$/;              // `    - item`

export function parseFitSummary(markdown: string): { summary: FitSummary | null; body: string } {
  const match = markdown.match(COMMENT_RE);
  if (!match) return { summary: null, body: markdown };

  const block = match[1];
  let target = '';
  let greeting: string | undefined;
  const changes: string[] = [];
  const suggestions: string[] = [];
  let currentList: string[] | null = null;

  for (const line of block.split('\n')) {
    const bullet = line.match(BULLET_RE);
    if (bullet && currentList) {
      currentList.push(bullet[1].trim());
      continue;
    }

    const listHeader = line.match(LIST_HEADER_RE);
    if (listHeader) {
      if (listHeader[1] === 'changes') currentList = changes;
      else if (listHeader[1] === 'suggestions') currentList = suggestions;
      else currentList = null;
      continue;
    }

    const scalar = line.match(SCALAR_RE);
    if (scalar) {
      if (scalar[1] === 'target') target = scalar[2].trim();
      else if (scalar[1] === 'greeting') greeting = scalar[2].trim();
      currentList = null;
    }
  }

  const summary: FitSummary | null =
    target && changes.length > 0
      ? {
          target,
          changes,
          greeting: greeting || undefined,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
        }
      : null;

  return { summary, body: markdown.slice(match[0].length) };
}
