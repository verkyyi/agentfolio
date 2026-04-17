import { useEffect, useState } from 'react';
import { useAdaptation } from './hooks/useAdaptation';
import { ResumeTheme } from './components/ResumeTheme';
import { Dashboard } from './components/Dashboard';
import { IdentityCard, type IdentityBasics } from './components/IdentityCard';
import { ChatPanel } from './components/ChatPanel';
import { ActivityStrip } from './components/ActivityStrip';
import { Footer } from './components/Footer';
import { GithubActivity, type ActivityData } from './components/GithubActivity';
import { firstSentence } from './utils/firstSentence';

function isDashboard(): boolean {
  const base = import.meta.env.BASE_URL ?? '/';
  let path = window.location.pathname;
  if (base !== '/' && path.startsWith(base)) {
    path = path.slice(base.length);
  }
  return path.replace(/^\/+|\/+$/g, '') === 'dashboard';
}

export default function App() {
  if (isDashboard()) return <Dashboard />;
  return <ResumePage />;
}

function ResumePage() {
  const { adapted, error, slug } = useAdaptation();
  const [activity, setActivity] = useState<ActivityData | null>(null);

  useEffect(() => {
    if (adapted?.basics?.name) {
      document.title = `${adapted.basics.name} — Resume`;
    }
  }, [adapted]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/github/activity.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ActivityData | null) => { if (!cancelled) setActivity(data); })
      .catch(() => { if (!cancelled) setActivity(null); });
    return () => { cancelled = true; };
  }, []);

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
        <IdentityCard basics={basics} />
        <ChatPanel
          key={activeSlug}
          slug={activeSlug}
          ownerName={basics.name}
          tagline={tagline}
          email={basics.email}
          profiles={basics.profiles}
          greeting={greeting}
          suggestions={suggestions}
        />
        <ActivityStrip data={activity} />
        <ResumeTheme resume={adapted as unknown as Record<string, unknown>} />
        <GithubActivity data={activity} />
      </main>
      <Footer />
    </>
  );
}
