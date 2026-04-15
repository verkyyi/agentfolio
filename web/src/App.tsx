import { useVisitorContext } from './hooks/useVisitorContext';
import { useAdaptation } from './hooks/useAdaptation';
import { AdaptiveResume } from './components/AdaptiveResume';

export default function App() {
  const { context, error: ctxError } = useVisitorContext();
  const { adapted, base, error: adaptError } = useAdaptation(
    context?.company ?? null,
  );

  if (ctxError) return <main>Error loading context: {ctxError.message}</main>;
  if (adaptError) return <main>Error loading adaptation: {adaptError.message}</main>;
  if (!context || !adapted || !base) return <main>Loading…</main>;

  return <AdaptiveResume base={base} adapted={adapted} context={context} />;
}
