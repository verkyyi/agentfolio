import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import styled from 'styled-components';

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

const ErrorMsg = styled.p`
  color: var(--ink-mute);
  font-style: italic;
`;

export function JdView({ slug }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(false);

    const url = `${import.meta.env.BASE_URL}data/jd/${slug}.md`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('not_found');
        return res.text();
      })
      .then((text) => { if (!cancelled) setContent(text); })
      .catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, [slug]);

  if (error) return <Container><ErrorMsg>No job description found for {slug}.</ErrorMsg></Container>;
  if (content === null) return <Container>Loading…</Container>;

  return (
    <Container>
      <Markdown>{content}</Markdown>
    </Container>
  );
}
