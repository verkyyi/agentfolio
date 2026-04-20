import { useEffect } from 'react';
import { useAdaptation } from './hooks/useAdaptation';
import { Dashboard } from './components/Dashboard';
import { Hero } from './components/Hero';
import { ChatPanel } from './components/ChatPanel';
import { Footer } from './components/Footer';
import { firstSentence } from './utils/firstSentence';
import type { IdentityBasics } from './components/IdentityCard';

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

  useEffect(() => {
    if (adapted?.basics?.name) {
      document.title = `${adapted.basics.name} — Resume`;
    }
  }, [adapted]);

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
        />
      </main>
      <Footer />
    </>
  );
}
