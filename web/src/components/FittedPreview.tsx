import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import styled from 'styled-components';
import { parseFitSummary, type FitSummary } from '../utils/parseFitSummary';

interface Props {
  slug: string;
}

const Container = styled.div`
  padding: 32px 40px;
  max-width: 800px;
  font-size: 15px;
  line-height: 1.7;

  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 24px 0 8px; border-bottom: 1px solid var(--rule); padding-bottom: 4px; }
  h3 { font-size: 15px; margin: 16px 0 4px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; }
  p { margin: 8px 0; }
`;

const SummaryCard = styled.div`
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 6px;
  padding: 16px 20px;
  margin-bottom: 24px;
  font-size: 13px;
  line-height: 1.6;
`;

const SummaryTarget = styled.div`
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 8px;
`;

const SummaryList = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: var(--ink-soft);

  li { margin-bottom: 2px; }
`;

const ErrorMsg = styled.p`
  color: var(--accent);
  font-style: italic;
`;

export function FittedPreview({ slug }: Props) {
  const [body, setBody] = useState<string | null>(null);
  const [summary, setSummary] = useState<FitSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBody(null);
    setSummary(null);
    setError(false);

    const url = `${import.meta.env.BASE_URL}data/fitted/${slug}.md`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('not_found');
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const parsed = parseFitSummary(text);
        setSummary(parsed.summary);
        setBody(parsed.body);
      })
      .catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, [slug]);

  if (error) return <Container><ErrorMsg>Failed to load {slug}.md</ErrorMsg></Container>;
  if (body === null) return <Container>Loading…</Container>;

  return (
    <Container>
      {summary && (
        <SummaryCard>
          <SummaryTarget>{summary.target}</SummaryTarget>
          <SummaryList>
            {summary.changes.map((change, i) => (
              <li key={i}>{change}</li>
            ))}
          </SummaryList>
        </SummaryCard>
      )}
      <Markdown>{body}</Markdown>
    </Container>
  );
}
