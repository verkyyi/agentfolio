import { useVisitorContext } from './hooks/useVisitorContext';
import { useAdaptation } from './hooks/useAdaptation';
import { ResumeTheme } from './components/ResumeTheme';

export default function App() {
  const { context, error: ctxError } = useVisitorContext();
  const { adapted, error: adaptError } = useAdaptation(context?.company ?? null);

  if (ctxError) return <main>Error loading context: {ctxError.message}</main>;

  if (adaptError) {
    return (
      <main>
        <h1>Not Found</h1>
        <p>No resume adaptation exists for this path.</p>
        <a href={import.meta.env.BASE_URL}>Go to homepage</a>
      </main>
    );
  }

  if (!context || !adapted) return <main>Loading…</main>;

  return <ResumeTheme resume={adapted as unknown as Record<string, unknown>} />;
}
