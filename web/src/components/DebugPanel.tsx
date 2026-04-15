import { useState } from 'react';
import type { AdaptedResume, VisitorContext } from '../types';

interface Props {
  context: VisitorContext;
  adapted: AdaptedResume;
}

export function DebugPanel({ context, adapted }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Agent Context</summary>
      <dl>
        <dt>Source</dt>
        <dd>{context.source}</dd>
        <dt>Company</dt>
        <dd>{context.company}</dd>
        <dt>Role</dt>
        <dd>{context.role ?? '—'}</dd>
        <dt>Adaptation</dt>
        <dd>{adapted.company}</dd>
        <dt>Generated</dt>
        <dd>{adapted.generated_at}</dd>
        <dt>Match Score</dt>
        <dd>{Math.round(adapted.match_score.overall * 100)}%</dd>
      </dl>
    </details>
  );
}
