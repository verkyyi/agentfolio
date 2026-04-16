import { useVisitorContext } from './hooks/useVisitorContext';
import { useAdaptation } from './hooks/useAdaptation';
import { ResumeTheme } from './components/ResumeTheme';
import { ArchitecturePage } from './components/ArchitecturePage';

export default function App() {
  const { context, error: ctxError } = useVisitorContext();
  const { adapted, error: adaptError } = useAdaptation(context?.company ?? null);

  const isArchitecturePath =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/$/, '').endsWith('/how-it-works');

  if (ctxError) return <main>Error loading context: {ctxError.message}</main>;
  if (adaptError) return <main>Error loading adaptation: {adaptError.message}</main>;

  if (isArchitecturePath) {
    return <ArchitecturePage compareSlugs={['sample-company', 'default']} />;
  }

  if (!context || !adapted) return <main>Loading…</main>;

  return <ResumeTheme resume={adapted as unknown as Record<string, unknown>} />;
}
