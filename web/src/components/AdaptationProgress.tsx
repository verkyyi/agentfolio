import type { ProgressStep } from '../types';

interface Props {
  step: ProgressStep | 'waiting';
  status: 'idle' | 'progress' | 'complete' | 'rate_limited' | 'error';
  errorMessage?: string;
}

const STEPS: Array<{ key: ProgressStep; label: string }> = [
  { key: 'jd_parsed', label: 'Parsing request' },
  { key: 'profile_built', label: 'Building profile' },
  { key: 'adapted', label: 'Adapting resume' },
  { key: 'committed', label: 'Committing' },
];

function stateFor(current: ProgressStep | 'waiting', key: ProgressStep): 'done' | 'pending' {
  if (current === 'waiting') return 'pending';
  const order: ProgressStep[] = ['jd_parsed', 'profile_built', 'adapted', 'committed'];
  return order.indexOf(current) >= order.indexOf(key) ? 'done' : 'pending';
}

export function AdaptationProgress({ step, status, errorMessage }: Props) {
  return (
    <section aria-label="Generation progress">
      <h3>Generating your adapted resume…</h3>
      <ul>
        {STEPS.map((s) => (
          <li key={s.key} data-state={stateFor(step, s.key)}>
            {s.label}
          </li>
        ))}
      </ul>
      {status === 'rate_limited' && (
        <p role="alert">Rate limit reached. Try again later.</p>
      )}
      {status === 'error' && (
        <p role="alert">Error: {errorMessage ?? 'unknown'}</p>
      )}
    </section>
  );
}
