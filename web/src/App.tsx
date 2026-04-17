import { useEffect, useState } from 'react';
import { useAdaptation } from './hooks/useAdaptation';
import { ResumeTheme } from './components/ResumeTheme';
import { DownloadPdf } from './components/DownloadPdf';
import { Dashboard } from './components/Dashboard';
import { ChatWidget } from './components/ChatWidget';
import { Footer } from './components/Footer';
import { GithubActivity, type ActivityData } from './components/GithubActivity';
import { parseFitSummary } from './utils/parseFitSummary';

function isDashboard(): boolean {
  const base = import.meta.env.BASE_URL ?? '/';
  let path = window.location.pathname;
  if (base !== '/' && path.startsWith(base)) {
    path = path.slice(base.length);
  }
  return path.replace(/^\/+|\/+$/g, '') === 'dashboard';
}

export default function App() {
  if (isDashboard()) {
    return <Dashboard />;
  }
  return <ResumePage />;
}

function ResumePage() {
  const { adapted, error, slug } = useAdaptation();
  const [target, setTarget] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);

  useEffect(() => {
    if (adapted?.basics?.name) {
      document.title = `${adapted.basics.name} — Resume`;
    }
  }, [adapted]);

  useEffect(() => {
    const s = slug ?? 'default';
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/fitted/${s}.md`)
      .then((r) => (r.ok ? r.text() : ''))
      .then((md) => {
        if (cancelled) return;
        const summary = parseFitSummary(md).summary;
        setTarget(summary?.target ?? s);
      })
      .catch(() => { if (!cancelled) setTarget(s); });
    return () => { cancelled = true; };
  }, [slug]);

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

  return (
    <>
      <DownloadPdf slug={slug} />
      <ResumeTheme resume={adapted as unknown as Record<string, unknown>} />
      <GithubActivity data={activity} />
      <Footer />
      {target && <ChatWidget key={activeSlug} slug={activeSlug} target={target} />}
    </>
  );
}
