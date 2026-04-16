import { useState } from 'react';
import type { AdaptedResume, VisitorContext } from '../types';

interface Props {
  context: VisitorContext;
  adapted: AdaptedResume;
}

export function DebugPanel({ context, adapted }: Props) {
  const [open, setOpen] = useState(false);
  const af = adapted.meta?.agentfolio;
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
        <dd>{af?.company ?? '—'}</dd>
        <dt>Generated</dt>
        <dd>{adapted.meta?.lastModified ?? '—'}</dd>
        <dt>Match Score</dt>
        <dd>{af?.match_score ? Math.round(af.match_score.overall * 100) : 0}%</dd>
      </dl>
    </details>
  );
}
