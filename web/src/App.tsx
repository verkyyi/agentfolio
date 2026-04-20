import { useEffect, useState } from 'react';
import { useAdaptation } from './hooks/useAdaptation';
import { useSidePanel } from './hooks/useSidePanel';
import { Dashboard } from './components/Dashboard';
import { Hero } from './components/Hero';
import { ChatPanel } from './components/ChatPanel';
import { Footer } from './components/Footer';
import { SidePanel } from './components/SidePanel';
import type { ActivityData } from './components/GithubActivity';
import { firstSentence } from './utils/firstSentence';
import type { IdentityBasics } from './types';

function isDashboard(): boolean {
  const base = import.meta.env.BASE_URL ?? '/';
  let path = window.location.pathname;
  if (base !== '/' && path.startsWith(base)) path = path.slice(base.length);
  return path.replace(/^\/+|\/+$/g, '') === 'dashboard';
}

export default function App() {
  if (isDashboard()) return <Dashboard />;
  return <ResumePage />;
}

function ResumePage() {
  const { adapted, error, slug } = useAdaptation();
  const sidePanel = useSidePanel();
  const [activity, setActivity] = useState<ActivityData | null>(null);

  useEffect(() => {
    if (adapted?.basics?.name) {
      document.title = `${adapted.basics.name} — Agentfolio`;
    }
  }, [adapted]);

  useEffect(() => {
    if (sidePanel.panel === 'activity' && !activity) {
      let cancelled = false;
      fetch(`${import.meta.env.BASE_URL}data/github/activity.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: ActivityData | null) => { if (!cancelled) setActivity(d); })
        .catch(() => { if (!cancelled) setActivity(null); });
      return () => { cancelled = true; };
    }
  }, [sidePanel.panel, activity]);

  if (error) {
    return (
      <main>
        <h1>Not Found</h1>
        <p>No resume adaptation exists for this path.</p>
        <a href={import.meta.env.BASE_URL}>Go to homepage</a>
      </main>
    );
  }

  if (!adapted) return <main>Loading…</main>;

  const activeSlug = slug ?? 'default';
  const basics = (adapted.basics ?? {}) as IdentityBasics;
  const tagline = basics.summary ? firstSentence(basics.summary) : undefined;
  const agentMeta = adapted.meta?.agentfolio;
  const greeting = agentMeta?.greeting;
  const suggestions = agentMeta?.suggestions;

  return (
    <>
      <main>
        <Hero name={basics.name ?? ''} tagline={tagline} image={basics.image} />
        <ChatPanel
          key={activeSlug}
          slug={activeSlug}
          ownerName={basics.name ?? ''}
          tagline={tagline}
          email={basics.email}
          profiles={basics.profiles}
          greeting={greeting}
          suggestions={suggestions}
          onOpenPanel={sidePanel.open}
        />
      </main>
      <SidePanel
        panel={sidePanel.panel}
        onClose={sidePanel.close}
        slug={activeSlug}
        adapted={adapted as unknown as Record<string, unknown>}
        activity={activity}
      />
      <Footer />
    </>
  );
}
