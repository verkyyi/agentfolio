import { useEffect } from 'react';
import { useAdaptation } from './hooks/useAdaptation';
import { ResumeTheme } from './components/ResumeTheme';
import { DownloadPdf } from './components/DownloadPdf';

export default function App() {
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

  return (
    <>
      <DownloadPdf slug={slug} />
      <ResumeTheme resume={adapted as unknown as Record<string, unknown>} />
    </>
  );
}
