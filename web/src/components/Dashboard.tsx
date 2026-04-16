import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { DashboardSidebar, type FittedEntry } from './DashboardSidebar';
import { FittedPreview } from './FittedPreview';
import { FittedDiff } from './FittedDiff';
import { DirectivesView } from './DirectivesView';
import { JdView } from './JdView';

type Tab = 'preview' | 'diff' | 'pdf' | 'jd';

const Layout = styled.div`
  display: flex;
  min-height: 100vh;
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
`;

const TabBar = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--rule);
  padding: 0 40px;
  position: sticky;
  top: 0;
  background: var(--paper);
  z-index: 5;
`;

const TabBarActions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ActionLink = styled.a`
  font-size: 13px;
  color: var(--ink-mute);
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 4px;
  transition: color 120ms ease, background 120ms ease;

  &:hover {
    color: var(--ink);
    background: var(--rule);
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ $active }) => ($active ? 'var(--accent-ink)' : 'var(--ink-mute)')};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--accent)' : 'transparent')};
  cursor: pointer;
  transition: color 120ms ease;

  &:hover {
    color: var(--ink);
  }
`;

const UrlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const UrlInput = styled.input`
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--ink-soft);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 4px 8px;
  width: 240px;
  outline: none;

  &:focus {
    border-color: var(--rule-strong);
  }
`;

const CopyButton = styled.button`
  font-size: 12px;
  color: var(--ink-mute);
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  transition: color 120ms ease, background 120ms ease;
  white-space: nowrap;

  &:hover {
    color: var(--ink);
    background: var(--rule);
  }
`;

const PdfFrame = styled.iframe`
  width: 100%;
  height: calc(100vh - 43px);
  border: none;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: var(--ink-mute);
  font-size: 15px;
`;

export function Dashboard() {
  const [items, setItems] = useState<FittedEntry[] | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('preview');
  const [showDirectives, setShowDirectives] = useState(false);
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}data/fitted/index.json`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FittedEntry[]) => {
        setItems(data);
        if (data.length > 0) setActiveSlug(data[0].slug);
      })
      .catch(() => setItems([]));
  }, []);

  if (items === null) return <EmptyState>Loading…</EmptyState>;
  if (items.length === 0) return <EmptyState>No fitted resumes. Run /fit to generate.</EmptyState>;

  const isDiffDisabled = activeSlug === 'default';

  return (
    <Layout>
      <DashboardSidebar
        items={items}
        activeSlug={activeSlug!}
        onSelect={(slug) => { setActiveSlug(slug); setTab('preview'); setShowDirectives(false); setCopied(false); }}
        onDirectives={() => setShowDirectives(true)}
        directivesActive={showDirectives}
      />
      <Main>
        {showDirectives ? (
          <DirectivesView />
        ) : (
          <>
            <TabBar>
              <TabButton $active={tab === 'preview'} onClick={() => setTab('preview')}>Preview</TabButton>
              <TabButton
                $active={tab === 'diff'}
                onClick={() => !isDiffDisabled && setTab('diff')}
                disabled={isDiffDisabled}
                style={isDiffDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              >
                Diff
              </TabButton>
              <TabButton $active={tab === 'pdf'} onClick={() => setTab('pdf')}>PDF</TabButton>
              <TabButton
                $active={tab === 'jd'}
                onClick={() => !isDiffDisabled && setTab('jd')}
                disabled={isDiffDisabled}
                style={isDiffDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              >
                JD
              </TabButton>
              <TabBarActions>
                {activeSlug && (
                  <UrlGroup>
                    <UrlInput
                      ref={urlInputRef}
                      readOnly
                      value={`${window.location.origin}${import.meta.env.BASE_URL}${activeSlug === 'default' ? '' : activeSlug}`}
                      onClick={() => urlInputRef.current?.select()}
                    />
                    <CopyButton onClick={() => {
                      const url = `${window.location.origin}${import.meta.env.BASE_URL}${activeSlug === 'default' ? '' : activeSlug}`;
                      navigator.clipboard.writeText(url).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      });
                    }}>
                      {copied ? 'Copied' : 'Copy'}
                    </CopyButton>
                  </UrlGroup>
                )}
                {activeSlug && (
                  <ActionLink
                    href={`${import.meta.env.BASE_URL}${activeSlug === 'default' ? '' : activeSlug}`}
                    target="_blank"
                    rel="noopener"
                  >
                    Open ↗
                  </ActionLink>
                )}
                {activeSlug && (
                  <ActionLink
                    href={`${import.meta.env.BASE_URL}data/adapted/${activeSlug}.pdf`}
                    download
                  >
                    PDF ↓
                  </ActionLink>
                )}
              </TabBarActions>
            </TabBar>
            {activeSlug && tab === 'preview' && <FittedPreview slug={activeSlug} />}
            {activeSlug && tab === 'diff' && <FittedDiff slug={activeSlug} />}
            {activeSlug && tab === 'pdf' && <PdfFrame src={`${import.meta.env.BASE_URL}data/adapted/${activeSlug}.pdf#view=FitH&navpanes=0`} title={`${activeSlug} PDF`} />}
            {activeSlug && tab === 'jd' && <JdView slug={activeSlug} />}
          </>
        )}
      </Main>
    </Layout>
  );
}
