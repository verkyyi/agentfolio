# AgentFolio Phase 5: Architecture Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/how-it-works` page that explains the agent pipeline, renders aggregated analytics from `data/analytics.json`, and shows side-by-side adaptation comparisons — completing the EXPLAIN pillar.

**Architecture:** A new `ArchitecturePage` component is rendered when the URL path ends in `/how-it-works`. The page has three sections: a static pipeline explanation (Perceive → Reason → Act → Learn → Explain), an `AgentStats` block that fetches `data/analytics.json` and renders the aggregated numbers, and an `AdaptationComparison` block that fetches two or more adapted JSONs and shows summary/section-order/skills side by side. Routing is a thin URL-path check inside `App.tsx` — no React Router dependency. A footer link is added to `AdaptiveResume` pointing at `/how-it-works`.

**Tech Stack:** React 18 + TypeScript (Vitest).

**Out of scope:** JD auto-fetching (separate plan), LLM-powered summary rewriting (separate plan), match-score refinement (separate plan), per-visitor real-time stats (the page shows weekly-aggregated numbers only).

**Prerequisites:** Phase 3 deployed so `data/analytics.json` exists on the published site. The page degrades gracefully if the file is 404.

---

## File Structure

```
agentfolio/
└── web/
    ├── src/
    │   ├── types.ts                              # MODIFY: add AnalyticsDoc type
    │   ├── hooks/
    │   │   └── useAnalytics.ts                   # NEW: fetch analytics.json
    │   ├── components/
    │   │   ├── ArchitecturePage.tsx              # NEW: top-level page
    │   │   ├── AgentStats.tsx                    # NEW: render aggregated stats
    │   │   ├── AdaptationComparison.tsx          # NEW: side-by-side view
    │   │   └── AdaptiveResume.tsx                # MODIFY: footer link
    │   ├── App.tsx                               # MODIFY: route check
    │   └── __tests__/
    │       ├── useAnalytics.test.ts              # NEW
    │       ├── AgentStats.test.tsx               # NEW
    │       ├── AdaptationComparison.test.tsx     # NEW
    │       └── ArchitecturePage.test.tsx         # NEW
```

**Responsibilities:**

- `useAnalytics` — fetches `data/analytics.json` once on mount; returns `{data, error, loading}`. No routing.
- `AgentStats` — receives the analytics dict as a prop, renders stat cards. Dumb presentational.
- `AdaptationComparison` — takes a list of company slugs, fetches each adapted JSON, renders a comparison table.
- `ArchitecturePage` — composes pipeline explanation + AgentStats + AdaptationComparison.
- `AdaptiveResume` — adds a footer link `<a href="/how-it-works">How this works →</a>`.
- `App.tsx` — if `window.location.pathname` ends in `/how-it-works`, render `ArchitecturePage`; otherwise render the existing flow.

---

## Task 1: `AnalyticsDoc` type + `useAnalytics` hook

**Files:**
- Modify: `web/src/types.ts`
- Create: `web/src/hooks/useAnalytics.ts`
- Create: `web/src/__tests__/useAnalytics.test.ts`

- [ ] **Step 1: Add type**

Append to `web/src/types.ts`:

```typescript

export interface CompanyAnalytics {
  sessions: number;
  avg_duration_s: number;
  avg_max_scroll_pct: number;
  section_dwell_avg_s: Record<string, number>;
  project_clicks: Record<string, number>;
  cta_clicks: Record<string, number>;
}

export interface AnalyticsDoc {
  generated_at: string;
  source_issues: number;
  total_sessions: number;
  unique_companies: number;
  by_company: Record<string, CompanyAnalytics>;
  global: {
    avg_duration_s: number;
    top_projects: Array<[string, number]>;
    top_sections: Array<[string, number]>;
  };
}
```

- [ ] **Step 2: Write failing test**

Create `web/src/__tests__/useAnalytics.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from '../hooks/useAnalytics';

const doc = {
  generated_at: '2026-04-15T00:00:00+00:00',
  source_issues: 5,
  total_sessions: 5,
  unique_companies: 2,
  by_company: {},
  global: { avg_duration_s: 60, top_projects: [], top_sections: [] },
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('useAnalytics', () => {
  it('fetches and returns the analytics doc', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => doc })));
    const { result } = renderHook(() => useAnalytics());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.total_sessions).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    const { result } = renderHook(() => useAnalytics());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
  });
});
```

- [ ] **Step 3: Run failing test**

```bash
cd web && npm test -- useAnalytics
```
Expected: FAIL.

- [ ] **Step 4: Implement**

Create `web/src/hooks/useAnalytics.ts`:

```typescript
import { useEffect, useState } from 'react';
import type { AnalyticsDoc } from '../types';

export function useAnalytics(url?: string) {
  const [data, setData] = useState<AnalyticsDoc | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const target = url ?? `${import.meta.env.BASE_URL}data/analytics.json`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(target);
        if (!res.ok) throw new Error(`analytics fetch: ${res.status}`);
        const json = (await res.json()) as AnalyticsDoc;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [target]);

  return { data, error, loading };
}
```

- [ ] **Step 5: Run tests + tsc**

```bash
npm test -- useAnalytics
npx tsc --noEmit
```
Expected: 2 tests pass, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add web/src/types.ts web/src/hooks/useAnalytics.ts web/src/__tests__/useAnalytics.test.ts
git commit -m "feat(web): add AnalyticsDoc type and useAnalytics hook"
```

---

## Task 2: `AgentStats` component + tests

**Files:**
- Create: `web/src/components/AgentStats.tsx`
- Create: `web/src/__tests__/AgentStats.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `web/src/__tests__/AgentStats.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentStats } from '../components/AgentStats';

const doc = {
  generated_at: '2026-04-20T06:00:00+00:00',
  source_issues: 47,
  total_sessions: 47,
  unique_companies: 4,
  by_company: {
    cohere: {
      sessions: 12,
      avg_duration_s: 87.3,
      avg_max_scroll_pct: 0.72,
      section_dwell_avg_s: { summary: 5.2, projects: 18.4 },
      project_clicks: { agentfolio: 8, ainbox: 3 },
      cta_clicks: { email: 4, linkedin: 2 },
    },
  },
  global: {
    avg_duration_s: 62.1,
    top_projects: [['agentfolio', 12], ['ainbox', 7]] as Array<[string, number]>,
    top_sections: [['projects', 17.9], ['experience', 11.2]] as Array<[string, number]>,
  },
};

describe('AgentStats', () => {
  it('renders total sessions and unique companies', () => {
    render(<AgentStats data={doc} />);
    expect(screen.getByText(/47/)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it('renders top projects list', () => {
    render(<AgentStats data={doc} />);
    expect(screen.getByText(/agentfolio/i)).toBeInTheDocument();
    expect(screen.getByText(/ainbox/i)).toBeInTheDocument();
  });

  it('renders generated_at as readable date', () => {
    render(<AgentStats data={doc} />);
    expect(screen.getByText(/2026-04-20/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- AgentStats
```
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `web/src/components/AgentStats.tsx`:

```typescript
import type { AnalyticsDoc } from '../types';

interface Props {
  data: AnalyticsDoc;
}

export function AgentStats({ data }: Props) {
  return (
    <section aria-label="Agent stats">
      <h3>Agent Stats</h3>
      <p>
        <small>Updated {data.generated_at.slice(0, 10)}</small>
      </p>
      <ul>
        <li>Total sessions: <strong>{data.total_sessions}</strong></li>
        <li>Unique companies served: <strong>{data.unique_companies}</strong></li>
        <li>Average session duration: <strong>{data.global.avg_duration_s.toFixed(1)}s</strong></li>
      </ul>
      <h4>Most-clicked projects</h4>
      <ol>
        {data.global.top_projects.map(([pid, count]) => (
          <li key={pid}>
            <strong>{pid}</strong> — {count} clicks
          </li>
        ))}
      </ol>
      <h4>Most-dwelt sections (avg seconds)</h4>
      <ol>
        {data.global.top_sections.map(([section, secs]) => (
          <li key={section}>
            <strong>{section}</strong> — {secs.toFixed(1)}s
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- AgentStats
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/AgentStats.tsx web/src/__tests__/AgentStats.test.tsx
git commit -m "feat(web): add AgentStats component"
```

---

## Task 3: `AdaptationComparison` component + tests

**Files:**
- Create: `web/src/components/AdaptationComparison.tsx`
- Create: `web/src/__tests__/AdaptationComparison.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `web/src/__tests__/AdaptationComparison.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdaptationComparison } from '../components/AdaptationComparison';
import type { AdaptedResume } from '../types';

const cohere: AdaptedResume = {
  company: 'Cohere',
  generated_at: '2026-04-15T00:00:00+00:00',
  generated_by: 'adapt_one.py v0.1',
  summary: 'Cohere summary',
  section_order: ['summary', 'projects', 'experience'],
  experience_order: [],
  bullet_overrides: {},
  project_order: ['agentfolio'],
  skill_emphasis: ['RAG Pipelines'],
  match_score: { overall: 0.87, by_category: {}, matched_keywords: [], missing_keywords: [] },
};
const def: AdaptedResume = {
  ...cohere,
  company: 'default',
  summary: 'Default summary',
  section_order: ['summary', 'experience', 'projects'],
  skill_emphasis: ['Python'],
  match_score: { ...cohere.match_score, overall: 0.2 },
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('cohere.json')) return { ok: true, json: async () => cohere };
    if (url.includes('default.json')) return { ok: true, json: async () => def };
    return { ok: false, status: 404 };
  }));
});

describe('AdaptationComparison', () => {
  it('renders side-by-side summaries and match scores for each slug', async () => {
    render(<AdaptationComparison slugs={['cohere', 'default']} />);
    await waitFor(() => expect(screen.getByText('Cohere summary')).toBeInTheDocument());
    expect(screen.getByText('Default summary')).toBeInTheDocument();
    expect(screen.getByText(/87%/)).toBeInTheDocument();
    expect(screen.getByText(/20%/)).toBeInTheDocument();
  });

  it('shows the adapted section_order for each slug', async () => {
    render(<AdaptationComparison slugs={['cohere', 'default']} />);
    await waitFor(() => expect(screen.getByText(/summary → projects → experience/)).toBeInTheDocument());
    expect(screen.getByText(/summary → experience → projects/)).toBeInTheDocument();
  });

  it('shows empty state when slug 404s', async () => {
    render(<AdaptationComparison slugs={['nonexistent']} />);
    await waitFor(() => expect(screen.getByText(/not available/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- AdaptationComparison
```
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `web/src/components/AdaptationComparison.tsx`:

```typescript
import { useEffect, useState } from 'react';
import type { AdaptedResume } from '../types';

interface Props {
  slugs: string[];
}

type Loaded = { slug: string; adapted: AdaptedResume | null };

export function AdaptationComparison({ slugs }: Props) {
  const [rows, setRows] = useState<Loaded[]>([]);

  useEffect(() => {
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
  }, [slugs.join('|')]);

  return (
    <section aria-label="Adaptation comparison">
      <h3>Adaptation Comparison</h3>
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Summary</th>
            <th>Section order</th>
            <th>Top skills</th>
            <th>Match</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            r.adapted ? (
              <tr key={r.slug}>
                <td>{r.adapted.company}</td>
                <td>{r.adapted.summary}</td>
                <td>{r.adapted.section_order.join(' → ')}</td>
                <td>{r.adapted.skill_emphasis.slice(0, 3).join(', ')}</td>
                <td>{Math.round(r.adapted.match_score.overall * 100)}%</td>
              </tr>
            ) : (
              <tr key={r.slug}>
                <td>{r.slug}</td>
                <td colSpan={4}>not available</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- AdaptationComparison
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/AdaptationComparison.tsx web/src/__tests__/AdaptationComparison.test.tsx
git commit -m "feat(web): add AdaptationComparison component"
```

---

## Task 4: `ArchitecturePage` composer + tests

**Files:**
- Create: `web/src/components/ArchitecturePage.tsx`
- Create: `web/src/__tests__/ArchitecturePage.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `web/src/__tests__/ArchitecturePage.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ArchitecturePage } from '../components/ArchitecturePage';

const analyticsDoc = {
  generated_at: '2026-04-20T06:00:00+00:00',
  source_issues: 3,
  total_sessions: 3,
  unique_companies: 2,
  by_company: {},
  global: { avg_duration_s: 50, top_projects: [['agentfolio', 2]], top_sections: [['projects', 10]] },
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('analytics.json')) return { ok: true, json: async () => analyticsDoc };
    if (url.includes('/data/adapted/')) return { ok: false, status: 404 };
    return { ok: false, status: 404 };
  }));
});

describe('ArchitecturePage', () => {
  it('renders the five-stage pipeline', async () => {
    render(<ArchitecturePage compareSlugs={[]} />);
    expect(screen.getByText(/perceive/i)).toBeInTheDocument();
    expect(screen.getByText(/reason/i)).toBeInTheDocument();
    expect(screen.getByText(/act/i)).toBeInTheDocument();
    expect(screen.getByText(/learn/i)).toBeInTheDocument();
    expect(screen.getByText(/explain/i)).toBeInTheDocument();
  });

  it('renders AgentStats when analytics loads', async () => {
    render(<ArchitecturePage compareSlugs={[]} />);
    await waitFor(() => expect(screen.getByText(/Total sessions/i)).toBeInTheDocument());
  });

  it('falls back gracefully when analytics fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    render(<ArchitecturePage compareSlugs={[]} />);
    await waitFor(() => expect(screen.getByText(/no aggregated stats/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- ArchitecturePage
```
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `web/src/components/ArchitecturePage.tsx`:

```typescript
import { useAnalytics } from '../hooks/useAnalytics';
import { AgentStats } from './AgentStats';
import { AdaptationComparison } from './AdaptationComparison';

interface Props {
  compareSlugs: string[];
}

export function ArchitecturePage({ compareSlugs }: Props) {
  const { data, error, loading } = useAnalytics();

  return (
    <main>
      <h1>How this works</h1>
      <p>
        AgentFolio is an agent that adapts this resume to whoever is reading it.
        Five stages, each linked to a real engineering skill:
      </p>
      <ol>
        <li><strong>Perceive</strong> — detect who is visiting (URL slug or self-ID).</li>
        <li><strong>Reason</strong> — pick the right profile and rewrite the summary.</li>
        <li><strong>Act</strong> — render the adapted resume in your browser.</li>
        <li><strong>Learn</strong> — track engagement and aggregate weekly.</li>
        <li><strong>Explain</strong> — this page; everything auditable on GitHub.</li>
      </ol>

      {loading && <p>Loading stats…</p>}
      {error && <p>No aggregated stats yet — come back after the first weekly aggregation.</p>}
      {data && <AgentStats data={data} />}

      {compareSlugs.length > 0 && <AdaptationComparison slugs={compareSlugs} />}

      <p>
        <a href="https://github.com/verkyyi/agentfolio" target="_blank" rel="noreferrer">
          View source on GitHub →
        </a>
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- ArchitecturePage
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ArchitecturePage.tsx web/src/__tests__/ArchitecturePage.test.tsx
git commit -m "feat(web): add ArchitecturePage composer"
```

---

## Task 5: Route + footer link

**Files:**
- Modify: `web/src/components/AdaptiveResume.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Add footer link to AdaptiveResume**

Read `web/src/components/AdaptiveResume.tsx`. Find the closing `</main>` tag. Insert before it:

```typescript
      <footer>
        <a href={`${import.meta.env.BASE_URL}how-it-works`}>How this works →</a>
      </footer>
```

- [ ] **Step 2: Add route check in App.tsx**

Read `web/src/App.tsx`. At the top of the `App` function (right after the `useVisitorContext` call), add:

```typescript
  const isArchitecturePath =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/$/, '').endsWith('/how-it-works');
```

Add an import at the top of the file:

```typescript
import { ArchitecturePage } from './components/ArchitecturePage';
```

Right after `if (ctxError) return <main>Error loading context: {ctxError.message}</main>;`, insert:

```typescript
  if (isArchitecturePath) {
    return <ArchitecturePage compareSlugs={['cohere', 'default']} />;
  }
```

- [ ] **Step 3: Run full suite**

```bash
cd web && npm test
```
Expected: all prior pass + new tests.

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: succeeds. Also verify `dist/404.html` still emitted (from Phase 1's fix), so `/agentfolio/how-it-works` falls through to the SPA.

- [ ] **Step 5: Commit**

```bash
git add web/src/App.tsx web/src/components/AdaptiveResume.tsx
git commit -m "feat(web): route /how-it-works to ArchitecturePage; add footer link"
```

---

## Task 6: Deploy + smoke test

- [ ] **Step 1: Merge and push**

```bash
git checkout main
git merge phase5-architecture-page --ff-only
git push origin main
```

- [ ] **Step 2: Watch deploy**

```bash
gh run watch --repo verkyyi/agentfolio --exit-status
```

- [ ] **Step 3: Smoke test**

1. Visit https://verkyyi.github.io/agentfolio/how-it-works — should render the pipeline explanation, AgentStats with real numbers from `data/analytics.json`, and the AdaptationComparison table for cohere + default.
2. Visit https://verkyyi.github.io/agentfolio/c/cohere-fde — scroll to footer, click "How this works →", should land on the same page.
3. Verify `curl -s https://verkyyi.github.io/agentfolio/data/analytics.json` still returns valid JSON (Phase 3 artifact).

- [ ] **Step 4: Record results**

Append `## Smoke Test Results` to this plan.

---

## Acceptance Criteria

1. `cd web && npm test` passes — 11 new tests (useAnalytics 2, AgentStats 3, AdaptationComparison 3, ArchitecturePage 3).
2. `cd web && npm run build` succeeds.
3. https://verkyyi.github.io/agentfolio/how-it-works renders the page with real aggregated stats.
4. Footer link on the resume navigates to the architecture page.
5. If `data/analytics.json` is 404 (brand-new repo), the page degrades with a clear "no stats yet" message and the pipeline + comparison still render.

---

## Follow-up phases (separate plans)

- **Phase 6:** JD auto-fetching — `scripts/fetch_jds.py` + `jd-sync.yml` daily cron + populate `company.jd_keywords` automatically from job board URLs.
- **Phase 7:** LLM-powered summary rewriting — teach `adapt_one.py` to optionally call Claude to polish the templated summary.
- **Phase 8:** Match-score refinement — score across bullets + projects + skills with weighted keyword matching.
