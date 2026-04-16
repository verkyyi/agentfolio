import { useEffect, useState } from 'react';
import type { AdaptedResume, SectionName } from '../types';

interface Props {
  slugs: string[];
  adaptations?: Record<string, AdaptedResume | null>;
}

type Loaded = { slug: string; adapted: AdaptedResume | null };

const SECTION_SHORT: Record<SectionName, string> = {
  basics: 'bas',
  work: 'exp',
  projects: 'prj',
  skills: 'skl',
  education: 'edu',
  volunteer: 'vol',
};

function addedPhrases(base: string, next: string): string[] {
  const baseWords = new Set(
    base
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean),
  );
  const runs: string[] = [];
  let current: string[] = [];
  const tokens = next.split(/\s+/);
  for (const t of tokens) {
    const key = t.toLowerCase().replace(/[^\w]/g, '');
    if (key && !baseWords.has(key) && !/^(and|the|a|of|to|in|for|with|on|at)$/.test(key)) {
      current.push(t);
    } else if (current.length) {
      runs.push(current.join(' '));
      current = [];
    }
  }
  if (current.length) runs.push(current.join(' '));
  const seen = new Set<string>();
  return runs
    .map((r) => r.replace(/[.,;:]+$/, '').trim())
    .filter((r) => r.length > 2 && !seen.has(r.toLowerCase()) && seen.add(r.toLowerCase()));
}

function sectionDiff(
  base: SectionName[] | undefined,
  next: SectionName[],
): Array<{ name: SectionName; shift: number | null }> {
  return next.map((name, i) => {
    if (!base) return { name, shift: null };
    const basePos = base.indexOf(name);
    if (basePos === -1) return { name, shift: null };
    return { name, shift: basePos - i };
  });
}

function skillDiff(base: string[] | undefined, next: string[]) {
  const baseSet = new Set((base ?? []).map((s) => s.toLowerCase()));
  const nextSet = new Set(next.map((s) => s.toLowerCase()));
  const added = next.filter((s) => !baseSet.has(s.toLowerCase()));
  const kept = next.filter((s) => baseSet.has(s.toLowerCase()));
  const dropped = (base ?? []).filter((s) => !nextSet.has(s.toLowerCase()));
  return { added, kept, dropped };
}

export function AdaptationComparison({ slugs, adaptations }: Props) {
  const [rows, setRows] = useState<Loaded[]>(() =>
    adaptations
      ? slugs.map((s) => ({ slug: s, adapted: adaptations[s] ?? null }))
      : [],
  );

  useEffect(() => {
    if (adaptations) {
      setRows(slugs.map((s) => ({ slug: s, adapted: adaptations[s] ?? null })));
      return;
    }
    let cancelled = false;
    (async () => {
      const results: Loaded[] = [];
      for (const slug of slugs) {
        const url = `${import.meta.env.BASE_URL}data/adapted/${slug}.json`;
        try {
          const res = await fetch(url);
          if (!res.ok) {
            results.push({ slug, adapted: null });
            continue;
          }
          const json = (await res.json()) as AdaptedResume;
          results.push({ slug, adapted: json });
        } catch {
          results.push({ slug, adapted: null });
        }
      }
      if (!cancelled) setRows(results);
    })();
    return () => { cancelled = true; };
  }, [slugs.join('|'), adaptations]);

  const baseline = rows.find((r) => r.slug === 'default')?.adapted ?? null;
  const variants = rows.filter((r) => r.slug !== 'default');
  const showBaselineCard = rows.some((r) => r.slug === 'default');

  return (
    <section className="hiw-diffs" aria-label="Adaptation comparison">
      {showBaselineCard && baseline && (
        <article className="hiw-diff hiw-diff-baseline">
          <header className="hiw-diff-head">
            <span className="hiw-diff-tag">baseline</span>
            <h3>
              <a className="hiw-diff-link" href={`${import.meta.env.BASE_URL}`}>{baseline.meta?.agentfolio?.company ?? 'default'}</a>
            </h3>
            <span className="hiw-diff-score" aria-label={`match ${Math.round((baseline.meta?.agentfolio?.match_score?.overall ?? 0) * 100)}%`}>
              {Math.round((baseline.meta?.agentfolio?.match_score?.overall ?? 0) * 100)}%
              <span className="hiw-diff-score-bar" aria-hidden>
                <span style={{ width: `${Math.round((baseline.meta?.agentfolio?.match_score?.overall ?? 0) * 100)}%` }} />
              </span>
            </span>
          </header>
          <p className="hiw-diff-summary">{baseline.basics?.summary ?? ''}</p>
          <p className="hiw-diff-order-caption">
            {(baseline.meta?.agentfolio?.section_order ?? []).join(' → ')}
          </p>
        </article>
      )}

      {variants.map(({ slug, adapted }) => {
        if (!adapted) {
          return (
            <article key={slug} className="hiw-diff hiw-diff-missing">
              <header className="hiw-diff-head">
                <h3>
                  <a className="hiw-diff-link" href={`${import.meta.env.BASE_URL}${slug}`}>
                    {slug}
                  </a>
                </h3>
              </header>
              <p className="hiw-muted">not available</p>
            </article>
          );
        }
        const adaptedSummary = adapted.basics?.summary ?? '';
        const baselineSummary = baseline?.basics?.summary ?? '';
        const adaptedOrder = adapted.meta?.agentfolio?.section_order ?? [];
        const baselineOrder = baseline?.meta?.agentfolio?.section_order;
        const adaptedSkills = adapted.meta?.agentfolio?.skill_emphasis ?? [];
        const baselineSkills = baseline?.meta?.agentfolio?.skill_emphasis;
        const addedBits = addedPhrases(baselineSummary, adaptedSummary);
        const orderCells = sectionDiff(baselineOrder, adaptedOrder);
        const isIdenticalToBaseline =
          baseline !== null &&
          adaptedSummary === baselineSummary &&
          adaptedOrder.join('|') === (baselineOrder ?? []).join('|') &&
          adaptedSkills.join('|') === (baselineSkills ?? []).join('|');
        const skills = skillDiff(baselineSkills, adaptedSkills);
        const pct = Math.round((adapted.meta?.agentfolio?.match_score?.overall ?? 0) * 100);
        const basePct = baseline ? Math.round((baseline.meta?.agentfolio?.match_score?.overall ?? 0) * 100) : null;
        const delta = basePct !== null ? pct - basePct : null;

        return (
          <article
            key={slug}
            className={`hiw-diff ${isIdenticalToBaseline ? 'hiw-diff-nodiff' : ''}`}
          >
            <header className="hiw-diff-head">
              <span className="hiw-diff-tag">
                {isIdenticalToBaseline ? 'no rewrite' : 'adaptation'}
              </span>
              <h3>
                <a
                  className="hiw-diff-link"
                  href={`${import.meta.env.BASE_URL}${slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {adapted.meta?.agentfolio?.company ?? slug}
                  <span className="hiw-diff-link-arrow" aria-hidden>↗</span>
                </a>
              </h3>
              <span
                className="hiw-diff-score"
                aria-label={`match ${pct}% versus baseline ${basePct ?? '—'}%`}
              >
                {pct}%
                {delta !== null && (
                  <span
                    className={`hiw-diff-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}
                  >
                    {delta > 0 ? '+' : ''}
                    {delta}
                  </span>
                )}
                <span className="hiw-diff-score-bar" aria-hidden>
                  <span style={{ width: `${pct}%` }} />
                </span>
              </span>
            </header>

            {isIdenticalToBaseline && (
              <p className="hiw-diff-nodiff-note">
                Same output as the default run — the parsed JD didn't surface
                enough distinct keywords to shift the summary, section order,
                or skill emphasis. See baseline above for the full text.
              </p>
            )}

            <div className="hiw-diff-grid">
              <div className="hiw-diff-col hiw-diff-col-summary">
                <h4>Summary rewrite</h4>
                <p className="hiw-diff-summary">{adaptedSummary}</p>
                {addedBits.length > 0 && (
                  <p className="hiw-diff-addendum">
                    <span className="hiw-diff-addendum-lbl">new for {adapted.meta?.agentfolio?.company ?? slug}</span>
                    {addedBits.slice(0, 6).map((bit) => (
                      <mark key={bit}>{bit}</mark>
                    ))}
                  </p>
                )}
              </div>

              <div className="hiw-diff-col">
                <h4>Section order</h4>
                <ol className="hiw-diff-order" aria-hidden>
                  {orderCells.map((c, i) => (
                    <li
                      key={c.name}
                      className={`hiw-diff-order-cell ${c.shift && c.shift !== 0 ? 'moved' : ''}`}
                    >
                      <span className="hiw-diff-order-idx">{i + 1}</span>
                      <span className="hiw-diff-order-name">{SECTION_SHORT[c.name]}</span>
                      {c.shift !== null && c.shift !== 0 && (
                        <span className="hiw-diff-order-shift">
                          {c.shift > 0 ? `↑${c.shift}` : `↓${Math.abs(c.shift)}`}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
                <p className="hiw-diff-order-caption">
                  {adaptedOrder.join(' → ')}
                </p>
              </div>

              <div className="hiw-diff-col">
                <h4>Skills emphasised</h4>
                <ul className="hiw-diff-chips">
                  {skills.added.map((s) => (
                    <li key={s} className="hiw-chip hiw-chip-add" title="promoted for this company">
                      <span className="hiw-chip-sigil">+</span>
                      {s}
                    </li>
                  ))}
                  {skills.kept.map((s) => (
                    <li key={s} className="hiw-chip hiw-chip-kept" title="in baseline too">
                      {s}
                    </li>
                  ))}
                  {skills.dropped.map((s) => (
                    <li key={s} className="hiw-chip hiw-chip-drop" title="dropped vs baseline">
                      <span className="hiw-chip-sigil">−</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hiw-diff-col hiw-diff-col-meta">
                <h4>Match keywords</h4>
                <ul className="hiw-diff-kws">
                  {(adapted.meta?.agentfolio?.match_score?.matched_keywords ?? []).slice(0, 6).map((kw) => (
                    <li key={kw} className="hiw-kw hiw-kw-hit">{kw}</li>
                  ))}
                  {(adapted.meta?.agentfolio?.match_score?.missing_keywords ?? []).slice(0, 4).map((kw) => (
                    <li key={kw} className="hiw-kw hiw-kw-miss">{kw}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
