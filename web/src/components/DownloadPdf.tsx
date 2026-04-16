import { useEffect, useState } from 'react';
import styled from 'styled-components';

const DownloadLink = styled.a`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10;
  padding: 8px 16px;
  background: #2563eb;
  color: #ffffff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 500;
  transition: background 150ms ease;

  &:hover {
    background: #1d4ed8;
    color: #ffffff;
  }

  @media print {
    display: none;
  }
`;

export function DownloadPdf({ slug }: { slug: string | null }) {
  const [available, setAvailable] = useState(false);
  const file = slug ?? 'default';
  const pdfUrl = `${import.meta.env.BASE_URL}data/adapted/${file}.pdf`;

  useEffect(() => {
    let cancelled = false;
    fetch(pdfUrl, { method: 'HEAD' }).then((res) => {
      if (!cancelled) setAvailable(res.ok);
    }).catch(() => {
      if (!cancelled) setAvailable(false);
    });
    return () => { cancelled = true; };
  }, [pdfUrl]);

  if (!available) return null;

  return (
    <DownloadLink href={pdfUrl} download>
      Download PDF
    </DownloadLink>
  );
}
