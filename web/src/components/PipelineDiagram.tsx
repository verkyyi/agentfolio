import { useMemo, useState } from 'react';
import type { AdaptedResume, AnalyticsDoc } from '../types';

interface Props {
  slugs: string[];
  adaptations: Record<string, AdaptedResume | null>;
  analytics: AnalyticsDoc | null;
  defaultSlug?: string;
}

interface Stage {
  n: string;
  name: string;
  skill: string;
  blurb: string;
  source: { label: string; href: string };
  telemetry: Array<{ k: string; v: string }>;
}

const REPO = import.meta.env.VITE_GITHUB_REPO
  ? `https://github.com/${import.meta.env.VITE_GITHUB_REPO}`
  : 'https://github.com';

function buildStages(
  example: AdaptedResume | null,
  exampleSlug: string | undefined,
  baseline: AdaptedResume | null,
  analytics: AnalyticsDoc | null,
): Stage[] {
  const slugLabel = exampleSlug ?? '—';
  const companyName = example?.meta?.agentfolio?.company ?? '—';

  const summaryWords = example ? (example.basics?.summary ?? '').split(/\s+/).length : 0;
  const baseWords = baseline ? (baseline.basics?.summary ?? '').split(/\s+/).length : 0;
  const wordDelta = summaryWords - baseWords;

  const reorderDiffs = (() => {
    if (!example || !baseline) return 0;
    const exOrder = example.meta?.agentfolio?.section_order ?? [];
    const blOrder = baseline.meta?.agentfolio?.section_order ?? [];
    let n = 0;
    for (let i = 0; i < exOrder.length; i++) {
      if (exOrder[i] !== blOrder[i]) n++;
    }
    return n;
  })();

  const eventsByCompany =
    analytics && exampleSlug && analytics.by_company[exampleSlug]
      ? analytics.by_company[exampleSlug]
      : null;

  const matchPct = example ? Math.round((example.meta?.agentfolio?.match_score?.overall ?? 0) * 100) : 0;
  const matchedKw = example?.meta?.agentfolio?.match_score?.matched_keywords?.length ?? 0;

  return [
    {
      n: '01',
      name: 'Perceive',
      skill: 'routing · context resolution',
      blurb:
        'Detect who is visiting. URL slug or the default profile. Nothing personalised without a source.',
      source: { label: 'useVisitorContext.ts', href: `${REPO}/blob/main/web/src/hooks/useVisitorContext.ts` },
      telemetry: [
        { k: 'slug', v: `/${slugLabel}` },
        { k: 'company', v: companyName },
        { k: 'source', v: exampleSlug === 'default' ? 'default' : 'slug' },
      ],
    },
    {
      n: '02',
      name: 'Reason',
      skill: 'LLM-driven adaptation',
      blurb:
        'Pick the right profile, rewrite the summary, reorder sections and bullets, surface matching skills.',
      source: { label: 'scripts/adapt_one.py', href: `${REPO}/blob/main/scripts/adapt_one.py` },
      telemetry: [
        { k: 'summary', v: `${summaryWords} words · ${wordDelta >= 0 ? '+' : ''}${wordDelta} vs default` },
        { k: 'skills promoted', v: String(example?.meta?.agentfolio?.skill_emphasis?.length ?? 0) },
      ],
    },
    {
      n: '03',
      name: 'Act',
      skill: 'browser rendering · diff-aware DOM',
      blurb:
        'Render the adapted resume with the new section order, emphasised skills, and a live match-score readout.',
      source: { label: 'AdaptiveResume.tsx', href: `${REPO}/blob/main/web/src/components/AdaptiveResume.tsx` },
      telemetry: [
        { k: 'sections reordered', v: String(reorderDiffs) },
        { k: 'match score', v: `${matchPct}%` },
        { k: 'matched keywords', v: String(matchedKw) },
      ],
    },
    {
      n: '04',
      name: 'Learn',
      skill: 'behaviour tracking · weekly aggregation',
      blurb:
        'Track dwell, scroll, clicks. A weekly job aggregates events into a public JSON — no per-session storage.',
      source: { label: 'useBehaviorTracker.ts', href: `${REPO}/blob/main/web/src/hooks/useBehaviorTracker.ts` },
      telemetry: eventsByCompany
        ? [
            { k: 'sessions', v: String(eventsByCompany.sessions) },
            { k: 'avg dwell', v: `${eventsByCompany.avg_duration_s.toFixed(1)}s` },
            { k: 'scroll depth', v: `${Math.round(eventsByCompany.avg_max_scroll_pct * 100)}%` },
          ]
        : [
            { k: 'sessions', v: '—' },
            { k: 'avg dwell', v: '—' },
            { k: 'scroll depth', v: '—' },
          ],
    },
    {
      n: '05',
      name: 'Explain',
      skill: 'transparency · public audit trail',
      blurb:
        'This page. Every adaptation, every weekly rollup, every commit is on GitHub — no hidden models, no dark patterns.',
      source: { label: 'ArchitecturePage.tsx', href: `${REPO}/blob/main/web/src/components/ArchitecturePage.tsx` },
      telemetry: [
        { k: 'page', v: '/how-it-works' },
        { k: 'data', v: 'public JSON' },
        { k: 'license', v: 'MIT' },
      ],
    },
  ];
}

export function PipelineDiagram({ slugs, adaptations, analytics, defaultSlug }: Props) {
  const available = useMemo(
    () => slugs.filter((s) => adaptations[s]),
    [slugs, adaptations],
  );
  const initial =
    (defaultSlug && available.includes(defaultSlug) && defaultSlug) ||
    available.find((s) => s !== 'default') ||
    available[0] ||
    '';
  const [selected, setSelected] = useState<string>(initial);
  const effective = adaptations[selected] ? selected : initial;

  const example = adaptations[effective] ?? null;
  const baseline = adaptations['default'] ?? null;
  const stages = buildStages(example, effective, baseline, analytics);
  const exampleLabel = example?.meta?.agentfolio?.company ?? effective ?? 'default';

  return (
    <section className="hiw-block hiw-pipeline" aria-labelledby="hiw-pipe-h">
      <header className="hiw-block-head">
        <span className="hiw-block-num">§1</span>
        <h2 id="hiw-pipe-h">Pipeline</h2>
        <span className="hiw-block-rule" aria-hidden />
      </header>

      {available.length > 1 && (
        <div className="hiw-trace-tabs" role="tablist" aria-label="Pick a trace">
          <span className="hiw-trace-tabs-lbl">Replay</span>
          {available.map((s) => {
            const adapted = adaptations[s];
            const label = adapted?.meta?.agentfolio?.company ?? s;
            const isActive = s === effective;
            return (
              <button
                key={s}
                role="tab"
                aria-selected={isActive}
                className={`hiw-trace-tab ${isActive ? 'is-active' : ''}`}
                onClick={() => setSelected(s)}
                type="button"
              >
                <span className="hiw-trace-tab-slug">/{s}</span>
                <span className="hiw-trace-tab-co">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="hiw-trace" aria-live="polite">
        <span className="hiw-trace-lbl">Trace</span>
        <span className="hiw-trace-val">visit from <strong>{exampleLabel}</strong></span>
        {example && (
          <span className="hiw-trace-meta">
            · adapted {(example.meta?.lastModified ?? '').slice(0, 10)}
          </span>
        )}
      </p>

      <ol className="hiw-stages" key={effective}>
        {stages.map((s, i) => (
          <li key={s.n} className="hiw-stage" style={{ ['--i' as string]: i }}>
            <div className="hiw-stage-gutter" aria-hidden>
              <span className="hiw-stage-num">{s.n}</span>
              <span className="hiw-stage-dot" />
              {i < stages.length - 1 && <span className="hiw-stage-line" />}
            </div>
            <div className="hiw-stage-body">
              <h3 className="hiw-stage-name">{s.name}</h3>
              <p className="hiw-stage-skill">{s.skill}</p>
              <p className="hiw-stage-blurb">{s.blurb}</p>
              <dl className="hiw-stage-telem">
                {s.telemetry.map((t) => (
                  <div key={t.k} className="hiw-stage-telem-row">
                    <dt>{t.k}</dt>
                    <dd>{t.v}</dd>
                  </div>
                ))}
              </dl>
              <a className="hiw-stage-src" href={s.source.href} target="_blank" rel="noreferrer">
                <span className="hiw-stage-src-lbl">source</span>
                <span className="hiw-stage-src-file">{s.source.label}</span>
                <span aria-hidden>↗</span>
              </a>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
