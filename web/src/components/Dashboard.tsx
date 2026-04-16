import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { DashboardSidebar, type FittedEntry } from './DashboardSidebar';
import { FittedPreview } from './FittedPreview';
import { FittedDiff } from './FittedDiff';

type Tab = 'preview' | 'diff';

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
  gap: 0;
  border-bottom: 1px solid var(--rule);
  padding: 0 40px;
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
      <DashboardSidebar items={items} activeSlug={activeSlug!} onSelect={(slug) => { setActiveSlug(slug); setTab('preview'); }} />
      <Main>
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
        </TabBar>
        {activeSlug && tab === 'preview' && <FittedPreview slug={activeSlug} />}
        {activeSlug && tab === 'diff' && <FittedDiff slug={activeSlug} />}
      </Main>
    </Layout>
  );
}
