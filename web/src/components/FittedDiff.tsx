import { useEffect, useState } from 'react';
import { diffWords } from 'diff';
import styled from 'styled-components';
import { parseFitSummary } from '../utils/parseFitSummary';

interface Props {
  slug: string;
}

const Container = styled.div`
  padding: 32px 40px;
  max-width: 800px;
  font-size: 14px;
  line-height: 1.8;
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', monospace;
  white-space: pre-wrap;
  word-break: break-word;
`;

const Added = styled.span`
  background: rgba(40, 167, 69, 0.18);
  color: #1a7f37;
  border-radius: 2px;
  padding: 1px 2px;
`;

const Removed = styled.span`
  background: rgba(207, 58, 42, 0.14);
  color: var(--accent);
  text-decoration: line-through;
  border-radius: 2px;
  padding: 1px 2px;
`;

const Unchanged = styled.span`
  color: var(--ink-soft);
`;

const DisabledMsg = styled.p`
  color: var(--ink-mute);
  font-style: italic;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const ErrorMsg = styled.p`
  color: var(--accent);
  font-style: italic;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

export function FittedDiff({ slug }: Props) {
  const [parts, setParts] = useState<Array<{ value: string; added?: boolean; removed?: boolean }> | null>(null);
  const [error, setError] = useState(false);
  const isDefault = slug === 'default';

  useEffect(() => {
    if (isDefault) return;
    let cancelled = false;
    setParts(null);
    setError(false);

    const baseUrl = `${import.meta.env.BASE_URL}data/fitted/default.md`;
    const fittedUrl = `${import.meta.env.BASE_URL}data/fitted/${slug}.md`;

    Promise.all([
      fetch(baseUrl).then((r) => { if (!r.ok) throw new Error('not_found'); return r.text(); }),
      fetch(fittedUrl).then((r) => { if (!r.ok) throw new Error('not_found'); return r.text(); }),
    ])
      .then(([baseText, fittedText]) => {
        if (cancelled) return;
        setParts(diffWords(parseFitSummary(baseText).body, parseFitSummary(fittedText).body));
      })
      .catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, [slug, isDefault]);

  if (isDefault) return <Container><DisabledMsg>Nothing to compare — this is the base resume.</DisabledMsg></Container>;
  if (error) return <Container><ErrorMsg>Failed to load diff for {slug}.md</ErrorMsg></Container>;
  if (parts === null) return <Container>Loading…</Container>;

  return (
    <Container data-testid="diff-container">
      {parts.map((part, i) => {
        if (part.added) return <Added key={i} data-diff="added">{part.value}</Added>;
        if (part.removed) return <Removed key={i} data-diff="removed">{part.value}</Removed>;
        return <Unchanged key={i}>{part.value}</Unchanged>;
      })}
    </Container>
  );
}
