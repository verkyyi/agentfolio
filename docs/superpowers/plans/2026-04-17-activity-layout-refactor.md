# Activity Layout Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the two GitHub activity surfaces into one canonical layout — the compact strip moves inside the detailed panel (replacing its heatmap/header/language bar), and language stats in the strip are rescoped to repos pushed in the last 30 days.

**Architecture:** Four localized changes — (1) data pipeline in `buildActivity` rescopes `languages` to a 30-day repo window, (2) `ActivityStrip` drops its "jump" CTA since it's now in-situ, (3) `GithubActivity` drops its heatmap/header/language-bar/language-legend and embeds `ActivityStrip`, (4) `App.tsx` drops the standalone strip between chat and resume.

**Tech Stack:** React 18 + TypeScript, Vite, styled-components, Vitest, Node 20 (data script).

**Spec:** `docs/superpowers/specs/2026-04-17-activity-layout-refactor-design.md`

---

## File Structure

Files touched:

- **Modify** `scripts/fetch-github-activity.mjs` — add `pushedAt` to repo query; filter repos by 30-day window before aggregating language bytes.
- **Modify** `web/src/__tests__/fetch-github-activity.test.ts` — update fixture (add `pushedAt` to `r1`/`r2`); add 30-day-scope test case.
- **Modify** `web/src/components/ActivityStrip.tsx` — remove "jump" button + handler.
- **Modify** `web/src/components/ActivityStrip.css` — drop `margin-left:auto` rule on `.strip-jump` (rule becomes orphaned).
- **Modify** `web/src/__tests__/ActivityStrip.test.tsx` — remove the jump-button test.
- **Modify** `web/src/components/GithubActivity.tsx` — remove `Header`, `HeatmapWrap`, `LangBar`, `LangLegend`, `Heatmap`, `HEATMAP_BUCKETS`, `MONTH_NAMES`, `scopeToLast30Days`. Import `ActivityStrip`; render it as the first child of `Wrapper`.
- **Modify** `web/src/__tests__/GithubActivity.test.tsx` — drop header/heatmap/scope/langlegend tests; add "embeds strip" test.
- **Modify** `web/src/App.tsx` — remove the `<ActivityStrip>` between `ChatPanel` and `ResumeTheme`. Remove now-unused import.
- **Modify** `web/src/__tests__/App.test.tsx` — update ordering test: `.strip` now appears inside `#activity`, not between identity card and activity.

Task order: data first (pure, isolated), then the two UI tidies (Task 2 + Task 3 are independent), then the App composition change, then a final verification.

---

## Task 1: Rescope `languages` to repos pushed in the last 30 days

**Files:**
- Modify: `scripts/fetch-github-activity.mjs`
- Test: `web/src/__tests__/fetch-github-activity.test.ts`

### Context

`buildActivity` currently aggregates language bytes across **all** public repos. After this refactor, `languages` is only consumed by the strip (which sits next to a "30d contributions" number), so scoping it to 30 days is semantically consistent. The GraphQL repo node doesn't currently select `pushedAt`; add it and filter.

### Steps

- [ ] **Step 1: Update the fixture to include `pushedAt` and add a failing 30-day-scope test**

Edit `web/src/__tests__/fetch-github-activity.test.ts`. Replace the `repositories.nodes` array in `fixture` so both repos carry `pushedAt`:

```ts
    repositories: {
      totalCount: 12,
      nodes: [
        {
          name: 'r1',
          pushedAt: '2026-04-10T00:00:00Z', // within 30d of 2026-04-17
          languages: {
            edges: [
              { size: 5000, node: { name: 'TypeScript', color: '#3178c6' } },
              { size: 2000, node: { name: 'CSS', color: '#663399' } },
            ],
          },
        },
        {
          name: 'r2',
          pushedAt: '2026-04-15T00:00:00Z', // within 30d
          languages: {
            edges: [
              { size: 1000, node: { name: 'Python', color: '#3572a5' } },
            ],
          },
        },
      ],
    },
```

Add a new test case at the end of the `describe('buildActivity', ...)` block (just before its closing `})`):

```ts
  it('excludes repos pushed outside the 30-day window from language totals', () => {
    const staleFixture = {
      ...fixture,
      user: {
        ...fixture.user,
        repositories: {
          totalCount: 12,
          nodes: [
            {
              name: 'stale',
              pushedAt: '2025-04-10T00:00:00Z', // ~12 months old
              languages: {
                edges: [{ size: 9000, node: { name: 'COBOL', color: '#a1a1a1' } }],
              },
            },
            {
              name: 'fresh',
              pushedAt: '2026-04-16T00:00:00Z', // within 30d
              languages: {
                edges: [{ size: 500, node: { name: 'Rust', color: '#dea584' } }],
              },
            },
          ],
        },
      },
    };
    const result = buildActivity('verkyyi', staleFixture, new Date('2026-04-17T06:00:00Z'));
    const names = result.languages.map((l: { name: string }) => l.name);
    expect(names).toContain('Rust');
    expect(names).not.toContain('COBOL');
  });
```

- [ ] **Step 2: Run the tests to verify the new one fails**

Run: `cd web && npx vitest run src/__tests__/fetch-github-activity.test.ts`

Expected: the new "excludes repos pushed outside the 30-day window" case FAILS (COBOL still appears in `names` because filtering isn't implemented yet). Existing tests may also start failing once the fixture adds `pushedAt` — that's fine, Step 3 fixes them together.

- [ ] **Step 3: Add `pushedAt` to the GraphQL repo query and filter in `buildActivity`**

Edit `scripts/fetch-github-activity.mjs`.

Update the `repositories` block inside `QUERY` to select `pushedAt`:

```js
    repositories(first: 100, isFork: false, privacy: PUBLIC, ownerAffiliations: OWNER) {
      totalCount
      nodes {
        name
        pushedAt
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
```

Replace the language-aggregation block (currently lines 55-64) with a 30-day-scoped filter. The existing `cutoff` computed above (~line 48-49) for `contributions30d` is already the right boundary — reuse it:

```js
  // Aggregate language bytes across repos pushed within the last 30 days.
  // Scoped (not all-time) because the strip renders this next to the 30d
  // contribution count; showing all-time language mix there would mislead.
  const bytes = new Map();
  const colors = new Map();
  for (const repo of data.user.repositories.nodes) {
    if (!repo.pushedAt || new Date(repo.pushedAt) < cutoff) continue;
    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      bytes.set(name, (bytes.get(name) ?? 0) + edge.size);
      if (!colors.has(name) && edge.node.color) colors.set(name, edge.node.color);
    }
  }
```

- [ ] **Step 4: Run the full data-script test file to verify all pass**

Run: `cd web && npx vitest run src/__tests__/fetch-github-activity.test.ts`

Expected: all three tests PASS. The first "shapes the GraphQL response…" test still passes because both fixture repos have `pushedAt` within the 30d window.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-github-activity.mjs web/src/__tests__/fetch-github-activity.test.ts
git commit -m "$(cat <<'EOF'
feat(activity): rescope languages to last-30d repos

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Drop the "jump to activity" button from `ActivityStrip`

**Files:**
- Modify: `web/src/components/ActivityStrip.tsx`
- Modify: `web/src/components/ActivityStrip.css`
- Test: `web/src/__tests__/ActivityStrip.test.tsx`

### Context

The strip moves inside `#activity` in Task 3. A "jump to full activity" CTA from inside the thing it jumps to is useless. Remove button + handler + the now-orphan `.strip-jump` CSS rule.

### Steps

- [ ] **Step 1: Delete the jump-button test**

Edit `web/src/__tests__/ActivityStrip.test.tsx`. Remove the entire `it('jump-to-activity link scrolls to #activity', async () => { … })` block (lines 50-63 in the current file), including the preceding blank line.

Also remove the now-unused imports at the top:

```ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityStrip } from '../components/ActivityStrip';
import type { ActivityData } from '../components/GithubActivity';
```

(`vi` and `userEvent` are no longer used.)

- [ ] **Step 2: Run the strip tests to confirm the remaining three still pass**

Run: `cd web && npx vitest run src/__tests__/ActivityStrip.test.tsx`

Expected: 3 tests PASS (contributions/languages render, 14 spark bars, null-data returns empty). Nothing should reference the jump button anymore.

- [ ] **Step 3: Remove the button + handler from the component**

Edit `web/src/components/ActivityStrip.tsx`. Replace the full file with:

```tsx
import React from 'react';
import './ActivityStrip.css';
import type { ActivityData } from './GithubActivity';
import { topLanguages, recentDays, bucketIndex } from '../utils/activityMetrics';

const SPARK_BUCKETS = ['#161b22', '#033a16', '#196c2e', '#2ea043', '#56d364'];

export function ActivityStrip({ data }: { data: ActivityData | null }) {
  if (!data) return null;

  const top = topLanguages(data, 3);
  const days = recentDays(data, 14);

  return (
    <section className="strip" aria-label="Live activity summary">
      <span className="strip-label">live</span>
      <div className="strip-bars" aria-hidden="true">
        {days.map((d) => (
          <span
            key={d.date}
            style={{ background: SPARK_BUCKETS[bucketIndex(d.count)] }}
            title={`${d.count} on ${d.date}`}
          />
        ))}
      </div>
      <span className="strip-count">
        <strong>{data.stats.contributions30d}</strong> contributions · 30d
      </span>
      <span className="strip-sep" aria-hidden="true">|</span>
      {top.map((l) => (
        <span key={l.name} className="strip-lang">
          <span className="strip-dot" style={{ background: l.color || '#888' }} />
          {l.name} {Math.round(l.pct)}%
        </span>
      ))}
    </section>
  );
}
```

(Also drop the `React` default import if your codebase convention is no-default-import for React — check `ActivityStrip.tsx` pre-edit; if it had `import React from 'react';`, keep it; the snippet above preserves it to match the current file.)

- [ ] **Step 4: Remove the orphan `.strip-jump` styles**

Edit `web/src/components/ActivityStrip.css`. Delete the `.strip-jump` rule block and the `.strip-jump` override in the `@media (max-width: 640px)` block:

Remove:
```css
.strip-jump {
  margin-left: auto;
  font-family: inherit;
  font-size: 11px;
  color: var(--text-dim);
  padding: 0;
  border-bottom: 1px dashed transparent;
}
.strip-jump:hover { color: var(--accent-green); border-bottom-color: var(--accent-green); }
```

And inside the `@media (max-width: 640px)` block, remove just the `.strip-jump` line (keep the `.strip` margin rules):

Before:
```css
@media (max-width: 640px) {
  .strip { margin-left: var(--side-gutter-mobile); margin-right: var(--side-gutter-mobile); }
  .strip-jump { margin-left: 0; }
}
```

After:
```css
@media (max-width: 640px) {
  .strip { margin-left: var(--side-gutter-mobile); margin-right: var(--side-gutter-mobile); }
}
```

- [ ] **Step 5: Run the strip tests again to confirm all three pass**

Run: `cd web && npx vitest run src/__tests__/ActivityStrip.test.tsx`

Expected: 3/3 PASS. No "jump" button references anywhere.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/ActivityStrip.tsx web/src/components/ActivityStrip.css web/src/__tests__/ActivityStrip.test.tsx
git commit -m "$(cat <<'EOF'
refactor(strip): drop jump-to-activity button

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Strip `GithubActivity` down and embed `ActivityStrip`

**Files:**
- Modify: `web/src/components/GithubActivity.tsx`
- Test: `web/src/__tests__/GithubActivity.test.tsx`

### Context

`GithubActivity` keeps its outer section (`#activity` anchor, repo list, footnote) but drops the header line, the full heatmap, the language bar, and the language legend. The `ActivityStrip` (updated in Task 2) renders as the first child inside the wrapper.

### Steps

- [ ] **Step 1: Rewrite the test file to match the new shape**

Replace the full contents of `web/src/__tests__/GithubActivity.test.tsx` with:

```tsx
// web/src/__tests__/GithubActivity.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GithubActivity } from '../components/GithubActivity';

const fixture = {
  user: 'verkyyi',
  fetchedAt: '2026-04-17T06:00:00.000Z',
  stats: { publicRepos: 12, contributions30d: 84, contributionsLastYear: 1247 },
  contributions: {
    weeks: [
      Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-${11 + i}`, count: 2 })),
    ],
  },
  languages: [
    { name: 'TypeScript', color: '#3178c6', pct: 60 },
    { name: 'Python', color: '#3572a5', pct: 40 },
  ],
  repos: [
    {
      name: 'agentfolio',
      url: 'https://github.com/verkyyi/agentfolio',
      description: 'Open-source agentic portfolio engine',
      language: 'TypeScript',
      languageColor: '#3178c6',
      stars: 42,
      pushedAt: '2026-04-17T05:29:33Z',
    },
  ],
};

describe('GithubActivity', () => {
  it('embeds the activity strip inside the activity section', () => {
    const { container } = render(<GithubActivity data={fixture} />);
    const section = container.querySelector('#activity');
    expect(section).not.toBeNull();
    expect(section!.querySelector('.strip')).not.toBeNull();
  });

  it('does not render a contribution heatmap', () => {
    const { container } = render(<GithubActivity data={fixture} />);
    expect(container.querySelector('svg rect.heatmap-cell')).toBeNull();
  });

  it('renders the 30d contribution count from the embedded strip', () => {
    render(<GithubActivity data={fixture} />);
    expect(screen.getByText('84')).toBeInTheDocument();
  });

  it('renders each repo with link and description', () => {
    render(<GithubActivity data={fixture} />);
    const link = screen.getByRole('link', { name: 'agentfolio' });
    expect(link).toHaveAttribute('href', 'https://github.com/verkyyi/agentfolio');
    expect(screen.getByText('Open-source agentic portfolio engine')).toBeInTheDocument();
  });

  it('renders an Updated footnote with the fetchedAt date', () => {
    render(<GithubActivity data={fixture} />);
    expect(screen.getByText(/Updated 2026-04-17/)).toBeInTheDocument();
  });

  it('returns null when data is null', () => {
    const { container } = render(<GithubActivity data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('has id="activity" for in-page anchor scrolling', () => {
    const { container } = render(<GithubActivity data={fixture} />);
    expect(container.querySelector('#activity')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests — several should fail**

Run: `cd web && npx vitest run src/__tests__/GithubActivity.test.tsx`

Expected: At minimum the "embeds the activity strip" test FAILS (component doesn't render the strip yet). The "does not render a contribution heatmap" test FAILS (heatmap still renders). The other tests may pass or fail depending on current state.

- [ ] **Step 3: Rewrite `GithubActivity.tsx`**

Replace the full contents of `web/src/components/GithubActivity.tsx` with:

```tsx
// web/src/components/GithubActivity.tsx
import styled from 'styled-components';
import { colorFor } from '../utils/githubColors';
import { ActivityStrip } from './ActivityStrip';

export interface ActivityData {
  user: string;
  fetchedAt: string;
  stats: {
    publicRepos: number;
    contributions30d: number;
    contributionsLastYear: number;
  };
  contributions: { weeks: { date: string; count: number }[][] };
  languages: { name: string; color: string; pct: number }[];
  repos: {
    name: string;
    url: string;
    description: string;
    language: string | null;
    languageColor: string | null;
    stars: number;
    pushedAt: string;
  }[];
}

const Wrapper = styled.section`
  max-width: var(--column-max);
  margin: 48px auto 24px;
  padding: 0 var(--side-gutter);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--text);
  border-top: 1px solid var(--border-soft);
  padding-top: 32px;

  @media (max-width: 640px) {
    padding-left: var(--side-gutter-mobile);
    padding-right: var(--side-gutter-mobile);
  }

  @media print { display: none; }
`;

const RepoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 16px 0;

  li { padding: 8px 0; border-bottom: 1px solid var(--border-soft); font-size: 14px; }
  li:last-child { border-bottom: none; }
  a { color: var(--text); font-weight: 600; text-decoration: none; }
  a:hover { color: var(--accent-blue); }
  .meta { color: var(--text-muted); font-size: 12px; margin-left: 8px; }
  .desc { color: var(--text-muted); display: block; margin-top: 2px; }
`;

const Footnote = styled.div`
  font-size: 11px;
  color: var(--text-dim);
  text-align: right;
`;

function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = now.getTime() - then;
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export function GithubActivity({ data }: { data: ActivityData | null }) {
  if (!data) return null;

  return (
    <Wrapper id="activity">
      <ActivityStrip data={data} />

      <RepoList>
        {data.repos.map((r) => (
          <li key={r.name}>
            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a>
            {r.language && (
              <span className="meta" style={{ color: r.languageColor ?? colorFor(r.language) }}>
                ● {r.language}
              </span>
            )}
            <span className="meta">· pushed {formatRelative(r.pushedAt)}</span>
            {r.description && <span className="desc">{r.description}</span>}
          </li>
        ))}
      </RepoList>

      <Footnote>Updated {data.fetchedAt.slice(0, 10)}</Footnote>
    </Wrapper>
  );
}
```

Note what's gone: `bucketIndex` import, `Header`, `HeatmapWrap`, `LangBar`, `LangLegend`, `Heatmap`, `HEATMAP_BUCKETS`, `MONTH_NAMES`, and the exported `scopeToLast30Days`.

- [ ] **Step 4: Run `GithubActivity.test.tsx` — expect all pass**

Run: `cd web && npx vitest run src/__tests__/GithubActivity.test.tsx`

Expected: 7/7 PASS.

- [ ] **Step 5: Run the full web test suite to catch collateral breakage**

Run: `cd web && npm test -- --run`

Expected: all unit tests PASS except possibly `App.test.tsx` — specifically the "renders IdentityCard, ActivityStrip, ResumeTheme, and GithubActivity in order" test, which still expects a `.strip` *above* the activity section. Leave that failure; Task 4 fixes it.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/GithubActivity.tsx web/src/__tests__/GithubActivity.test.tsx
git commit -m "$(cat <<'EOF'
refactor(activity): embed strip, remove heatmap + lang bar

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Remove the standalone `ActivityStrip` from `App.tsx`

**Files:**
- Modify: `web/src/App.tsx`
- Test: `web/src/__tests__/App.test.tsx`

### Context

The strip now lives inside `GithubActivity`. The copy rendered between `ChatPanel` and `ResumeTheme` in `App.tsx` is redundant.

### Steps

- [ ] **Step 1: Update the App ordering test to expect `.strip` inside `#activity`**

Edit `web/src/__tests__/App.test.tsx`. Replace the test titled `'renders IdentityCard, ActivityStrip, ResumeTheme, and GithubActivity in order for slug "default"'` (currently lines 140-177) with:

```tsx
describe('App — new stack composition', () => {
  it('renders IdentityCard, ResumeTheme, and GithubActivity (with embedded strip) in order for slug "default"', async () => {
    const activity = {
      user: 'verkyyi',
      fetchedAt: '2026-04-17T00:00:00.000Z',
      stats: { publicRepos: 3, contributions30d: 42, contributionsLastYear: 100 },
      contributions: { weeks: [Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-0${i+1}`, count: i }))] },
      languages: [{ name: 'TypeScript', color: '#3178c6', pct: 100 }],
      repos: [],
    };

    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') return { ok: false, status: 404 };
      if (url.includes('activity.json')) return { ok: true, json: async () => activity };
      if (url.includes('data/fitted/index.json')) return { ok: true, json: async () => [{ slug: 'default', filename: 'default.md' }] };
      if (url.includes('data/fitted/default.md')) return { ok: true, text: async () => '# Alex Chen\n\nDefault summary' };
      if (url.includes('data/adapted/default.json')) return { ok: true, json: async () => defaultAdapted };
      return { ok: false, status: 404 };
    }));

    window.history.pushState({}, '', '/');
    render(<App />);

    await screen.findAllByText('Alex Chen');
    await screen.findAllByText(/42/);

    const idcard = document.querySelector('.idcard')!;
    const activityEl = document.getElementById('activity')!;
    const strip = document.querySelector('.strip')!;
    expect(idcard).not.toBeNull();
    expect(activityEl).not.toBeNull();
    expect(strip).not.toBeNull();

    // Strip is nested inside the activity section, not a sibling above it.
    expect(activityEl.contains(strip)).toBe(true);

    // idcard precedes activity in document order.
    expect(idcard.compareDocumentPosition(activityEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // There is only one strip on the page.
    expect(document.querySelectorAll('.strip').length).toBe(1);
  });
});
```

- [ ] **Step 2: Run the App tests — ordering test should fail (two strips still rendered)**

Run: `cd web && npx vitest run src/__tests__/App.test.tsx`

Expected: the new "in order" test FAILS on `expect(document.querySelectorAll('.strip').length).toBe(1)` — `App.tsx` still renders a second strip between chat and resume, so the count is 2.

- [ ] **Step 3: Remove the standalone strip from `App.tsx`**

Edit `web/src/App.tsx`. Remove the import:

```ts
import { ActivityStrip } from './components/ActivityStrip';
```

Remove the render line between `ChatPanel` and `ResumeTheme`:

```tsx
        <ActivityStrip data={activity} />
```

The surrounding JSX becomes:

```tsx
      <main>
        <IdentityCard basics={basics} />
        <ChatPanel
          key={activeSlug}
          slug={activeSlug}
          ownerName={basics.name}
          tagline={tagline}
          email={basics.email}
          profiles={basics.profiles}
          greeting={greeting}
          suggestions={suggestions}
        />
        <ResumeTheme resume={adapted as unknown as Record<string, unknown>} />
        <GithubActivity data={activity} />
      </main>
```

- [ ] **Step 4: Run the App tests — all should pass**

Run: `cd web && npx vitest run src/__tests__/App.test.tsx`

Expected: all App tests PASS, including the new "in order" test.

- [ ] **Step 5: Run the full web unit test suite**

Run: `cd web && npm test -- --run`

Expected: all tests PASS across every file.

- [ ] **Step 6: Commit**

```bash
git add web/src/App.tsx web/src/__tests__/App.test.tsx
git commit -m "$(cat <<'EOF'
refactor(app): drop standalone strip; activity section owns it

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Final verification

**Files:** (none modified)

### Context

Sanity-check that nothing else references the removed symbols and the dev build still works.

### Steps

- [ ] **Step 1: Grep for removed symbols — should return zero hits**

Run: `cd /home/dev/projects/agentfolio && rg -n 'scopeToLast30Days|strip-jump|jump to full activity' --glob '!docs/**' --glob '!data/**'`

Expected: no matches in `web/` or `scripts/`. (Matches inside `docs/superpowers/specs/` or `docs/superpowers/plans/` are expected — those describe history — and are excluded by the globs above anyway.)

- [ ] **Step 2: Run the full unit test suite once more**

Run: `cd web && npm test -- --run`

Expected: all tests PASS.

- [ ] **Step 3: Start the dev server and eyeball the page**

Run: `cd web && npm run dev`

In a browser, load `/`. Verify:
- No strip appears between the chat panel and the resume body.
- Below the resume, the activity section shows the strip as its first element, followed by the repo list and the "Updated …" footnote.
- The strip's language chips reflect the 30-day window (may differ from the previous all-time labels after the next scheduled workflow run; for now the committed `data/github/activity.json` still holds the old all-time values — that's fine until the workflow re-runs).
- No heatmap, no language bar, no language legend in the activity section.

Stop the dev server with Ctrl-C when done.

- [ ] **Step 4: Nothing to commit**

No files changed in Task 5. If Step 1 or 2 surfaced issues, go back to the relevant task and fix.

---

## Self-Review Notes

- **Spec coverage:** Each of the five code changes in the spec's "Code changes" section maps to a task (data pipeline → Task 1, strip button → Task 2, activity component → Task 3, App composition → Task 4). Test updates listed in the spec are covered inline with each task. Task 5 catches leftover references.
- **Placeholder scan:** No TBDs, no "similar to", no "handle edge cases" hand-waves. Every code step shows exact code.
- **Type consistency:** `ActivityData` interface is unchanged; `languages` array shape is identical pre/post refactor (only the semantic scope of `pct` changes). `ActivityStrip` import path is consistent across tasks.
- **Degenerate case:** Task 1's filter produces `languages: []` if no repos pushed in the last 30 days. The strip already maps over `top` (the result of `topLanguages(data, 3)`) — an empty array renders no language chips, which is the intended degraded-but-valid state. No extra null-guard needed.
