# Chat-first Portfolio Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the AgentFolio homepage as a chat-first landing (identity card → inline chat → activity strip → résumé → full activity) with a dark terminal-forward aesthetic, without disrupting the existing adapted-JSON pipeline, PDF export, or the internal dashboard.

**Architecture:** Full theme rewrite (cream-paper → GitHub-dark + JetBrains Mono). Three new components (`IdentityCard`, `ActivityStrip`, `ChatPanel`) compose the top of the page; existing `ResumeTheme` and `GithubActivity` are restyled to the new palette and harmonized to a 760px column. `ChatWidget` (the current FAB) is deleted once `ChatPanel` supersedes it. Data sources unchanged — identity card pulls from the existing `adapted.basics`, activity from the existing `activity.json`.

**Tech Stack:** React 18, TypeScript, Vite, styled-components (for ResumeTheme), plain CSS + CSS variables elsewhere, Vitest + Testing Library for unit tests, Playwright for E2E.

**Reference spec:** `docs/superpowers/specs/2026-04-17-portfolio-layout-design.md`

---

## File Structure

**Create:**
- `web/src/components/IdentityCard.tsx` — identity/about-me card
- `web/src/components/IdentityCard.css` — component-scoped styles
- `web/src/components/ActivityStrip.tsx` — one-line live-activity strip
- `web/src/components/ActivityStrip.css`
- `web/src/components/ChatPanel.tsx` — inline full-width chat (replaces ChatWidget for slug routes)
- `web/src/components/ChatPanel.css`
- `web/src/utils/activityMetrics.ts` — pure helpers (topLanguages, recentDays)
- `web/src/__tests__/IdentityCard.test.tsx`
- `web/src/__tests__/ActivityStrip.test.tsx`
- `web/src/__tests__/ChatPanel.test.tsx`
- `web/src/__tests__/activityMetrics.test.ts`
- `web/e2e/portfolio-layout.spec.ts` — E2E tests for the new layout

**Modify:**
- `web/src/styles/global.css` — full rewrite: dark palette + JetBrains Mono + print + reduced-motion
- `web/index.html` — add Google Fonts link for JetBrains Mono
- `web/src/components/ResumeTheme.tsx` — retheme to dark palette + 760px column + IntersectionObserver fade-in
- `web/src/components/GithubActivity.tsx` — retheme + `id="activity"` anchor + 760px column
- `web/src/App.tsx` — new composition, share activity fetch between ActivityStrip and GithubActivity
- `web/src/__tests__/App.test.tsx` — update expectations for new tree; keep /dashboard test

**Delete:**
- `web/src/components/ChatWidget.tsx` — superseded by ChatPanel
- `web/src/components/ChatWidget.css`
- `web/src/__tests__/ChatWidget.test.tsx` — replaced by ChatPanel.test.tsx

**Leave alone:**
- `web/src/components/Dashboard*.tsx`, `FittedPreview.tsx`, `FittedDiff.tsx`, `DirectivesView.tsx`, `JdView.tsx`, `DownloadPdf.tsx`, `Footer.tsx` (no design changes — palette changes flow through CSS variables, but these may need minor restyles if they look wrong; leave for a follow-up if out of scope)
- `pdf-theme/` — PDF export unchanged
- Everything under `data/`, `.github/workflows/`, `.claude/skills/`

---

## Task 1: Theme foundation (global.css, font loading, print, reduced-motion)

**Files:**
- Modify: `web/src/styles/global.css`
- Modify: `web/index.html`

- [ ] **Step 1: Add JetBrains Mono to index.html**

Replace `web/index.html` lines 3–10 with:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#0d1117" />
  <meta name="color-scheme" content="dark" />
  <link rel="stylesheet" href="/fonts/fonts.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <title>Resume</title>
</head>
```

Keep `/fonts/fonts.css` — it is used by ResumeTheme's current developer-mono theme and won't interfere.

- [ ] **Step 2: Replace `web/src/styles/global.css` with dark terminal theme**

```css
/* AgentFolio — dark terminal-forward theme */

:root {
  /* Surfaces */
  --bg: #0d1117;
  --surface: #161b22;
  --surface-raised: #1c2230;
  --border: #30363d;
  --border-soft: #21262d;

  /* Text */
  --text: #e6edf3;
  --text-muted: #7d8590;
  --text-dim: #6e7681;

  /* Accents */
  --accent-green: #7ee787;
  --accent-blue: #79c0ff;
  --accent-teal: #4ec9b0;
  --accent-orange: #ffa657;

  /* Legacy variable names kept for components that still reference them.
     These map onto the dark palette so nothing looks catastrophically broken
     during the transition. Components should migrate to the new tokens. */
  --paper: var(--bg);
  --paper-deep: var(--surface);
  --ink: var(--text);
  --ink-soft: var(--text-muted);
  --ink-mute: var(--text-dim);
  --rule: var(--border-soft);
  --rule-strong: var(--border);
  --accent: var(--accent-green);
  --accent-soft: rgba(126, 231, 135, 0.16);
  --accent-ink: var(--accent-green);
  --highlight: rgba(126, 231, 135, 0.22);

  /* Layout */
  --column-max: 760px;
  --side-gutter: 32px;
  --side-gutter-mobile: 20px;
}

* { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'JetBrains Mono', ui-monospace, 'Menlo', 'Consolas', monospace;
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  min-height: 100dvh;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

#root { position: relative; z-index: 1; }

a {
  color: var(--accent-blue);
  text-decoration: none;
  border-bottom: 1px dashed rgba(121, 192, 255, 0.35);
  padding-bottom: 1px;
  transition: color 120ms ease, border-color 120ms ease;
}
a:hover { color: var(--accent-green); border-color: var(--accent-green); }
a:focus-visible {
  outline: 2px solid var(--accent-green);
  outline-offset: 3px;
  border-radius: 2px;
}

button {
  font-family: inherit;
  font-size: 1rem;
  cursor: pointer;
  border: 0;
  color: inherit;
  background: transparent;
}
button:focus-visible {
  outline: 2px solid var(--accent-green);
  outline-offset: 3px;
  border-radius: 4px;
}

/* Blinking caret used by identity card and chat input */
@keyframes blink { 50% { opacity: 0; } }
.caret {
  display: inline-block;
  color: var(--accent-green);
  animation: blink 1.1s steps(1) infinite;
  margin-left: 2px;
}

/* ---------- Reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

/* ---------- Print ---------- */
@media print {
  :root {
    --bg: #ffffff;
    --surface: #ffffff;
    --surface-raised: #ffffff;
    --border: #d0d0d0;
    --border-soft: #eeeeee;
    --text: #111111;
    --text-muted: #555555;
    --text-dim: #777777;
    --accent-green: #111111;
    --accent-blue: #111111;
    --accent-teal: #111111;
    --accent-orange: #111111;
  }
  body { background: white; }
  a { color: #111; border-bottom: none; }
  .caret { display: none; }
  /* Components opt out of print via their own `@media print { display: none }`. */
}
```

- [ ] **Step 3: Run the site to eyeball the theme change**

```bash
cd web && npm run dev
```

Open `http://localhost:5173/`. Expected: the page is now dark (black-ish background) and the body font is monospace. Layout will look broken (ResumeTheme and GithubActivity still use their own light-theme internals) — that's fine, they're restyled in later tasks.

Kill the dev server with Ctrl-C.

- [ ] **Step 4: Run existing tests — confirm no regressions**

```bash
cd web && npx vitest run
```

Expected: all existing tests still pass. They assert on text content, not colors. If any test fails due to body default fonts being queried, investigate.

- [ ] **Step 5: Commit**

```bash
git add web/src/styles/global.css web/index.html
git commit -m "Introduce dark terminal theme tokens and JetBrains Mono"
```

---

## Task 2: Activity metrics helper (topLanguages + recentDays)

**Files:**
- Create: `web/src/utils/activityMetrics.ts`
- Create: `web/src/__tests__/activityMetrics.test.ts`

- [ ] **Step 1: Write the failing test**

`web/src/__tests__/activityMetrics.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { topLanguages, recentDays } from '../utils/activityMetrics';
import type { ActivityData } from '../components/GithubActivity';

function makeActivity(overrides: Partial<ActivityData> = {}): ActivityData {
  return {
    user: 'u',
    fetchedAt: '2026-04-17T00:00:00.000Z',
    stats: { publicRepos: 1, contributions30d: 0, contributionsLastYear: 0 },
    contributions: { weeks: [] },
    languages: [],
    repos: [],
    ...overrides,
  };
}

describe('topLanguages', () => {
  it('returns the top 3 languages sorted by percent desc', () => {
    const a = makeActivity({
      languages: [
        { name: 'Go', color: '#0', pct: 10 },
        { name: 'TS', color: '#1', pct: 42 },
        { name: 'Rust', color: '#2', pct: 23 },
        { name: 'JS', color: '#3', pct: 18 },
        { name: 'Py', color: '#4', pct: 7 },
      ],
    });
    const top = topLanguages(a, 3);
    expect(top.map((l) => l.name)).toEqual(['TS', 'Rust', 'JS']);
  });

  it('returns fewer than N if input has fewer', () => {
    const a = makeActivity({
      languages: [{ name: 'TS', color: '#1', pct: 100 }],
    });
    expect(topLanguages(a, 3)).toHaveLength(1);
  });

  it('returns [] when languages is empty', () => {
    expect(topLanguages(makeActivity(), 3)).toEqual([]);
  });
});

describe('recentDays', () => {
  it('returns the last N days flattened across weeks, oldest-first', () => {
    const a = makeActivity({
      contributions: {
        weeks: [
          [
            { date: '2026-04-01', count: 1 },
            { date: '2026-04-02', count: 2 },
            { date: '2026-04-03', count: 3 },
            { date: '2026-04-04', count: 4 },
            { date: '2026-04-05', count: 5 },
            { date: '2026-04-06', count: 6 },
            { date: '2026-04-07', count: 7 },
          ],
          [
            { date: '2026-04-08', count: 8 },
            { date: '2026-04-09', count: 9 },
            { date: '2026-04-10', count: 10 },
            { date: '2026-04-11', count: 11 },
            { date: '2026-04-12', count: 12 },
            { date: '2026-04-13', count: 13 },
            { date: '2026-04-14', count: 14 },
          ],
        ],
      },
    });
    const days = recentDays(a, 5);
    expect(days.map((d) => d.count)).toEqual([10, 11, 12, 13, 14]);
  });

  it('returns [] when there are no weeks', () => {
    expect(recentDays(makeActivity(), 14)).toEqual([]);
  });

  it('returns all available days if fewer than N exist', () => {
    const a = makeActivity({
      contributions: {
        weeks: [
          [
            { date: '2026-04-01', count: 1 },
            { date: '2026-04-02', count: 2 },
          ],
        ],
      },
    });
    expect(recentDays(a, 14)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
cd web && npx vitest run src/__tests__/activityMetrics.test.ts
```

Expected: FAIL — `activityMetrics` module not found.

- [ ] **Step 3: Write the implementation**

`web/src/utils/activityMetrics.ts`:

```typescript
import type { ActivityData } from '../components/GithubActivity';

export function topLanguages(data: ActivityData, n: number): ActivityData['languages'] {
  return [...data.languages].sort((a, b) => b.pct - a.pct).slice(0, n);
}

export function recentDays(data: ActivityData, n: number): { date: string; count: number }[] {
  const flat: { date: string; count: number }[] = [];
  for (const week of data.contributions.weeks) {
    for (const day of week) flat.push(day);
  }
  return flat.slice(-n);
}
```

- [ ] **Step 4: Run the test — verify it passes**

```bash
cd web && npx vitest run src/__tests__/activityMetrics.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/utils/activityMetrics.ts web/src/__tests__/activityMetrics.test.ts
git commit -m "Add activityMetrics helper (topLanguages, recentDays)"
```

---

## Task 3: IdentityCard component

**Files:**
- Create: `web/src/components/IdentityCard.tsx`
- Create: `web/src/components/IdentityCard.css`
- Create: `web/src/__tests__/IdentityCard.test.tsx`

- [ ] **Step 1: Write the failing test**

`web/src/__tests__/IdentityCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdentityCard } from '../components/IdentityCard';

const baseBasics = {
  name: 'Verky Yi',
  label: 'Senior Engineer',
  summary: 'Shipped search infra for a 50M-DAU product. Looking for staff IC roles.',
  location: { city: 'New York', region: 'NY' },
  profiles: [
    { network: 'GitHub', url: 'https://github.com/verkyyi' },
    { network: 'LinkedIn', url: 'https://linkedin.com/in/verkyyi' },
  ],
  email: 'verky.yi@gmail.com',
};

describe('IdentityCard', () => {
  it('renders name, role line, and one-liner', () => {
    render(<IdentityCard basics={baseBasics} slug="default" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/verky yi/i);
    expect(screen.getByText(/Senior Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/New York, NY/)).toBeInTheDocument();
    expect(screen.getByText(/Shipped search infra/)).toBeInTheDocument();
  });

  it('renders the slug label', () => {
    render(<IdentityCard basics={baseBasics} slug="notion" />);
    expect(screen.getByText(/adapted for notion/i)).toBeInTheDocument();
  });

  it('renders profile + email links', () => {
    render(<IdentityCard basics={baseBasics} slug="default" />);
    expect(screen.getByRole('link', { name: /GitHub/i })).toHaveAttribute('href', 'https://github.com/verkyyi');
    expect(screen.getByRole('link', { name: /LinkedIn/i })).toHaveAttribute('href', 'https://linkedin.com/in/verkyyi');
    expect(screen.getByRole('link', { name: /verky\.yi@gmail\.com/ })).toHaveAttribute('href', 'mailto:verky.yi@gmail.com');
  });

  it('truncates summary to the first sentence for the one-liner', () => {
    const basics = {
      ...baseBasics,
      summary: 'First sentence here. Second sentence should not appear in the card one-liner. Third also excluded.',
    };
    render(<IdentityCard basics={basics} slug="default" />);
    expect(screen.getByText(/First sentence here\./)).toBeInTheDocument();
    expect(screen.queryByText(/Second sentence should not appear/)).not.toBeInTheDocument();
  });

  it('skips role line when label is absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, label: undefined }} slug="default" />);
    expect(container.querySelector('.idcard-role')).toBeNull();
  });

  it('skips one-liner when summary is absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, summary: undefined }} slug="default" />);
    expect(container.querySelector('.idcard-oneliner')).toBeNull();
  });

  it('skips profile row when profiles and email are both absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, profiles: [], email: undefined }} slug="default" />);
    expect(container.querySelector('.idcard-profiles')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd web && npx vitest run src/__tests__/IdentityCard.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

`web/src/components/IdentityCard.tsx`:

```tsx
import './IdentityCard.css';

export interface IdentityBasics {
  name: string;
  label?: string;
  summary?: string;
  location?: { city?: string; region?: string };
  profiles?: { network: string; url: string }[];
  email?: string;
}

export interface IdentityCardProps {
  basics: IdentityBasics;
  slug: string;
}

function firstSentence(s: string): string {
  const m = s.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1] : s;
}

function locationLine(loc?: IdentityBasics['location']): string | null {
  if (!loc) return null;
  const parts = [loc.city, loc.region].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function IdentityCard({ basics, slug }: IdentityCardProps) {
  const loc = locationLine(basics.location);
  const roleBits = [basics.label, loc].filter(Boolean).join(' · ');
  const oneLiner = basics.summary ? firstSentence(basics.summary) : null;
  const hasProfiles = (basics.profiles && basics.profiles.length > 0) || !!basics.email;

  return (
    <section className="idcard">
      <div className="idcard-label">~/{slug} · adapted for {slug}</div>
      <h1 className="idcard-name">
        {basics.name}
        <span className="caret">_</span>
      </h1>
      {roleBits && <div className="idcard-role">{roleBits}</div>}
      {oneLiner && (
        <p className="idcard-oneliner">
          <span className="idcard-comment">{'// '}</span>
          {oneLiner}
        </p>
      )}
      {hasProfiles && (
        <div className="idcard-profiles">
          {basics.profiles?.map((p) => (
            <a key={p.network} href={p.url} target="_blank" rel="noreferrer">{p.network}</a>
          ))}
          {basics.email && <a href={`mailto:${basics.email}`}>{basics.email}</a>}
        </div>
      )}
    </section>
  );
}
```

`web/src/components/IdentityCard.css`:

```css
.idcard {
  max-width: var(--column-max);
  margin: 0 auto;
  padding: 48px var(--side-gutter) 28px;
  border-bottom: 1px solid var(--border-soft);
  color: var(--text);
}

.idcard-label {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 12px;
  opacity: 0;
  animation: idcard-in 280ms ease-out 0ms forwards;
}

.idcard-name {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.01em;
  margin: 0;
  opacity: 0;
  animation: idcard-in 280ms ease-out 80ms forwards;
}

.idcard-role {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 10px;
  opacity: 0;
  animation: idcard-in 280ms ease-out 160ms forwards;
}

.idcard-oneliner {
  font-size: 15px;
  color: var(--text);
  margin: 14px 0 0;
  line-height: 1.55;
  max-width: 580px;
  opacity: 0;
  animation: idcard-in 280ms ease-out 240ms forwards;
}

.idcard-comment { color: var(--text-muted); }

.idcard-profiles {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 18px;
  font-size: 12px;
  opacity: 0;
  animation: idcard-in 280ms ease-out 320ms forwards;
}

@keyframes idcard-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .idcard { padding: 36px var(--side-gutter-mobile) 22px; }
  .idcard-name { font-size: 28px; }
}

@media print {
  .idcard-label { display: none; }
  .idcard-name { animation: none; opacity: 1; }
  .idcard-role, .idcard-oneliner, .idcard-profiles { animation: none; opacity: 1; }
  .idcard .caret { display: none; }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd web && npx vitest run src/__tests__/IdentityCard.test.tsx
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/IdentityCard.tsx web/src/components/IdentityCard.css web/src/__tests__/IdentityCard.test.tsx
git commit -m "Add IdentityCard component with slug label + profile row"
```

---

## Task 4: ActivityStrip component

**Files:**
- Create: `web/src/components/ActivityStrip.tsx`
- Create: `web/src/components/ActivityStrip.css`
- Create: `web/src/__tests__/ActivityStrip.test.tsx`

- [ ] **Step 1: Write the failing test**

`web/src/__tests__/ActivityStrip.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityStrip } from '../components/ActivityStrip';
import type { ActivityData } from '../components/GithubActivity';

function sample(over: Partial<ActivityData> = {}): ActivityData {
  return {
    user: 'verkyyi',
    fetchedAt: '2026-04-17T00:00:00.000Z',
    stats: { publicRepos: 12, contributions30d: 793, contributionsLastYear: 1508 },
    contributions: {
      weeks: [
        Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-0${i+1}`, count: i })),
        Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-1${i}`, count: 7 + i })),
      ],
    },
    languages: [
      { name: 'TypeScript', color: '#3178c6', pct: 42 },
      { name: 'Rust', color: '#dea584', pct: 23 },
      { name: 'JavaScript', color: '#f1e05a', pct: 18 },
      { name: 'Go', color: '#00ADD8', pct: 10 },
    ],
    repos: [],
    ...over,
  };
}

describe('ActivityStrip', () => {
  it('renders the 30d contribution count and top 3 languages', () => {
    render(<ActivityStrip data={sample()} />);
    expect(screen.getByText('793')).toBeInTheDocument();
    expect(screen.getByText(/TypeScript/)).toBeInTheDocument();
    expect(screen.getByText(/Rust/)).toBeInTheDocument();
    expect(screen.getByText(/JavaScript/)).toBeInTheDocument();
    expect(screen.queryByText(/Go/)).not.toBeInTheDocument();
  });

  it('renders a 14-bar sparkline', () => {
    const { container } = render(<ActivityStrip data={sample()} />);
    const bars = container.querySelectorAll('.strip-bars span');
    expect(bars.length).toBe(14);
  });

  it('returns nothing when data is null', () => {
    const { container } = render(<ActivityStrip data={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('jump-to-activity link scrolls to #activity', async () => {
    const scrollSpy = vi.fn();
    const target = document.createElement('div');
    target.id = 'activity';
    target.scrollIntoView = scrollSpy;
    document.body.appendChild(target);

    const user = userEvent.setup();
    render(<ActivityStrip data={sample()} />);
    await user.click(screen.getByRole('button', { name: /jump to full activity/i }));
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    document.body.removeChild(target);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd web && npx vitest run src/__tests__/ActivityStrip.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

`web/src/components/ActivityStrip.tsx`:

```tsx
import './ActivityStrip.css';
import type { ActivityData } from './GithubActivity';
import { topLanguages, recentDays } from '../utils/activityMetrics';

const SPARK_BUCKETS = ['#161b22', '#033a16', '#196c2e', '#2ea043', '#56d364'];

function sparkBucket(count: number): number {
  if (count <= 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}

function handleJump(e: React.MouseEvent<HTMLButtonElement>) {
  e.preventDefault();
  const target = document.getElementById('activity');
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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
            style={{ background: SPARK_BUCKETS[sparkBucket(d.count)] }}
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
      <button className="strip-jump" type="button" onClick={handleJump}>
        ↓ jump to full activity
      </button>
    </section>
  );
}
```

`web/src/components/ActivityStrip.css`:

```css
.strip {
  max-width: var(--column-max);
  margin: 22px auto 0;
  padding: 10px 14px;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  font-size: 11px;
  color: var(--text-muted);
}

.strip-label {
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.strip-bars { display: flex; gap: 2px; }
.strip-bars span { width: 8px; height: 8px; border-radius: 1px; }

.strip-count strong { color: var(--text); font-weight: 700; }

.strip-sep { color: var(--border); }

.strip-lang { display: inline-flex; align-items: center; gap: 6px; }
.strip-dot { width: 6px; height: 6px; border-radius: 3px; display: inline-block; }

.strip-jump {
  margin-left: auto;
  font-family: inherit;
  font-size: 11px;
  color: var(--text-dim);
  padding: 0;
  border-bottom: 1px dashed transparent;
}
.strip-jump:hover { color: var(--accent-green); border-bottom-color: var(--accent-green); }

@media (max-width: 640px) {
  .strip { margin-left: var(--side-gutter-mobile); margin-right: var(--side-gutter-mobile); }
  .strip-jump { margin-left: 0; }
}

@media print { .strip { display: none; } }
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd web && npx vitest run src/__tests__/ActivityStrip.test.tsx
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ActivityStrip.tsx web/src/components/ActivityStrip.css web/src/__tests__/ActivityStrip.test.tsx
git commit -m "Add ActivityStrip with sparkline, top-3 languages, anchor scroll"
```

---

## Task 5: ChatPanel component (inline, with offline state and static chips)

**Files:**
- Create: `web/src/components/ChatPanel.tsx`
- Create: `web/src/components/ChatPanel.css`
- Create: `web/src/__tests__/ChatPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

`web/src/__tests__/ChatPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../components/ChatPanel';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

function sseResponse(chunks: string[]) {
  const stream = new ReadableStream({
    start(c) {
      for (const s of chunks) c.enqueue(new TextEncoder().encode(s));
      c.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('ChatPanel — offline state', () => {
  it('renders an offline card when VITE_CHAT_PROXY_URL is empty', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', '');
    render(<ChatPanel slug="default" target="default" email="a@b.co" profiles={[{ network: 'LinkedIn', url: 'https://l.co' }]} />);
    expect(screen.getByText(/chat is offline/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /a@b\.co/ })).toHaveAttribute('href', 'mailto:a@b.co');
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://l.co');
  });
});

describe('ChatPanel — inline default state', () => {
  it('always shows greeting + suggestion chips without needing a click', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" target="Notion" />);
    expect(screen.getByTestId('chat-greeting')).toBeInTheDocument();
    const chips = screen.getAllByTestId('chat-suggestion');
    expect(chips).toHaveLength(3);
  });

  it('clicking a chip prefills the input but does not auto-submit', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" target="Notion" />);
    const chip = screen.getAllByTestId('chat-suggestion')[0];
    await user.click(chip);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe(chip.textContent);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reset link appears only when messages exist', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'hi again' }]),
    );
    render(<ChatPanel slug="notion" target="Notion" />);
    expect(screen.getByRole('button', { name: /clear conversation/i })).toBeInTheDocument();
  });

  it('reset link is hidden when there are no messages', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" target="Notion" />);
    expect(screen.queryByRole('button', { name: /clear conversation/i })).not.toBeInTheDocument();
  });
});

describe('ChatPanel — streaming send', () => {
  it('sends a POST and renders streamed assistant deltas', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn(async () => sseResponse([
      'event: content_block_delta\ndata: {"delta":{"text":"Hi"}}\n\n',
      'event: content_block_delta\ndata: {"delta":{"text":" there"}}\n\n',
      'event: message_stop\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" target="Notion" />);
    await user.type(screen.getByRole('textbox'), 'tell me about notion');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example/chat',
      expect.objectContaining({ method: 'POST' }),
    );
    await screen.findByText('Hi there');
  });
});

describe('ChatPanel — persistence + reset', () => {
  it('loads messages from sessionStorage on mount', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'Welcome back' }]),
    );
    render(<ChatPanel slug="notion" target="Notion" />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('reset clears messages and sessionStorage', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'old' }]),
    );
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" target="Notion" />);
    await user.click(screen.getByRole('button', { name: /clear conversation/i }));
    expect(screen.queryByText('old')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('agentfolio.chat.notion')).toBeNull();
  });
});

describe('ChatPanel — error handling', () => {
  it('removes the trailing empty assistant bubble on fetch error', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" target="Notion" />);
    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/something went wrong/i);
    expect(screen.getByText('hi')).toBeInTheDocument();
    const assistantBubbles = document.querySelectorAll('.chatp-msg.assistant');
    // Only the greeting — no empty placeholder
    expect(assistantBubbles.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd web && npx vitest run src/__tests__/ChatPanel.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

`web/src/components/ChatPanel.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import './ChatPanel.css';

type Role = 'user' | 'assistant';
interface Msg { role: Role; content: string }
type Status = 'idle' | 'streaming' | 'error';

export interface ChatPanelProps {
  slug: string;
  target: string;
  email?: string;
  profiles?: { network: string; url: string }[];
}

const DEFAULT_SUGGESTIONS = [
  'Walk me through the résumé',
  'Why is this a fit?',
  "What's not on the résumé?",
];

async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
      if (!dataLine) continue;
      const payload = dataLine.slice(6);
      if (payload === '[DONE]') return;
      try {
        const parsed = JSON.parse(payload) as { delta?: { text?: string } };
        if (parsed.delta?.text) yield parsed.delta.text;
      } catch {
        // ignore non-JSON pings
      }
    }
  }
}

export function ChatPanel({ slug, target, email, profiles }: ChatPanelProps) {
  const proxyUrl = import.meta.env.VITE_CHAT_PROXY_URL as string | undefined;

  // Hooks must be called unconditionally; the offline early-return below
  // is declared after the hooks so React hook order stays stable.
  const storageKey = `agentfolio.chat.${slug}`;
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Msg[]) : [];
    } catch { return []; }
  });
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (messages.length === 0) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  if (!proxyUrl) {
    return (
      <section className="chatp chatp-offline">
        <div className="chatp-header">
          <span>· chat</span>
          <span className="chatp-status-off">● offline</span>
        </div>
        <p className="chatp-offline-body">
          Chat is offline — reach out directly:
        </p>
        <div className="chatp-offline-links">
          {email && <a href={`mailto:${email}`}>{email}</a>}
          {profiles?.map((p) => (
            <a key={p.network} href={p.url} target="_blank" rel="noreferrer">{p.network}</a>
          ))}
        </div>
      </section>
    );
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setStatus('idle');
    sessionStorage.removeItem(storageKey);
  }

  function pickSuggestion(text: string) {
    setDraft(text);
    inputRef.current?.focus();
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'streaming' || !draft.trim()) return;
    const next: Msg[] = [...messages, { role: 'user', content: draft.trim() }, { role: 'assistant', content: '' }];
    setMessages(next);
    setDraft('');
    setStatus('streaming');

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const toSend = next.slice(0, -1);
      const resp = await fetch(`${proxyUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, messages: toSend }),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`status_${resp.status}`);
      for await (const delta of parseSse(resp.body)) {
        setMessages((cur) => {
          const copy = cur.slice();
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant') {
            copy[copy.length - 1] = { role: 'assistant', content: last.content + delta };
          }
          return copy;
        });
      }
      setStatus('idle');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((cur) => {
        const last = cur[cur.length - 1];
        if (last && last.role === 'assistant' && last.content === '') {
          return cur.slice(0, -1);
        }
        return cur;
      });
      setStatus('error');
    }
  }

  return (
    <section className="chatp" aria-label="Chat">
      <div className="chatp-header">
        <span>· chat · context: {target}</span>
        <div className="chatp-header-right">
          {messages.length > 0 && (
            <button type="button" className="chatp-clear" onClick={reset}>
              clear conversation
            </button>
          )}
          <span className="chatp-status-on">● connected</span>
        </div>
      </div>

      <div className="chatp-messages">
        <div className="chatp-msg assistant chatp-greeting" data-testid="chat-greeting">
          <span className="chatp-prompt">&gt;</span> Hey — I'm an agent that knows this résumé cold. Ask me about the work and I'll keep it relevant to the {target} context.
        </div>
        {messages.map((m, i) => (
          <div key={i} className={`chatp-msg ${m.role}`}>
            {m.role === 'assistant' && <span className="chatp-prompt">&gt;</span>}
            {m.role === 'user' && <span className="chatp-prompt chatp-prompt-user">$</span>}
            {m.content}
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="chatp-suggestions" role="group" aria-label="Suggested questions">
          {DEFAULT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              data-testid="chat-suggestion"
              className="chatp-suggestion"
              onClick={() => pickSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {status === 'error' && <div className="chatp-error">Something went wrong. Try again.</div>}

      <form className="chatp-input-row" onSubmit={send}>
        <span className="chatp-prompt chatp-prompt-user">$</span>
        <input
          ref={inputRef}
          aria-label="Message"
          placeholder="ask a question…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={status === 'streaming'}
          maxLength={2000}
        />
        <button type="submit" aria-label="Send" disabled={status === 'streaming' || !draft.trim()}>
          send ⏎
        </button>
      </form>
    </section>
  );
}
```

`web/src/components/ChatPanel.css`:

```css
.chatp {
  max-width: var(--column-max);
  margin: 0 auto;
  padding: 22px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 60vh;
  color: var(--text);
  font-family: inherit;
}

@media (max-width: 640px) {
  .chatp {
    min-height: 360px;
    margin: 0 var(--side-gutter-mobile);
  }
}

.chatp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.chatp-header-right { display: flex; gap: 14px; align-items: center; }
.chatp-status-on { color: var(--accent-teal); }
.chatp-status-off { color: var(--text-dim); }

.chatp-clear {
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0;
  border-bottom: 1px dashed transparent;
}
.chatp-clear:hover { color: var(--accent-green); border-bottom-color: var(--accent-green); }

.chatp-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 560px;
}

.chatp-msg {
  font-size: 13px;
  line-height: 1.55;
  color: var(--text);
  animation: chatp-in 180ms ease-out;
}
.chatp-msg.user { color: var(--text); }
.chatp-msg.assistant { color: var(--text); }

.chatp-prompt { color: var(--accent-green); margin-right: 6px; }
.chatp-prompt-user { color: var(--accent-orange); }

@keyframes chatp-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.chatp-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 640px) {
  .chatp-suggestions {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .chatp-suggestions::-webkit-scrollbar { display: none; }
}

.chatp-suggestion {
  font-family: inherit;
  font-size: 11px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  background: var(--bg);
  white-space: nowrap;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}
.chatp-suggestion:hover { color: var(--accent-green); border-color: var(--accent-green); }

.chatp-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--border-soft);
}
.chatp-input-row input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text);
  font: inherit;
  font-size: 13px;
  outline: none;
}
.chatp-input-row input:disabled { opacity: 0.6; }
.chatp-input-row button[type="submit"] {
  font-family: inherit;
  font-size: 11px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  background: var(--bg);
}
.chatp-input-row button[type="submit"]:hover:not(:disabled) {
  color: var(--accent-green);
  border-color: var(--accent-green);
}
.chatp-input-row button[type="submit"]:disabled { opacity: 0.4; cursor: default; }

.chatp-error {
  color: var(--accent-orange);
  font-size: 12px;
}

.chatp-offline {
  min-height: auto;
  padding: 20px 24px;
}
.chatp-offline-body { margin: 6px 0 14px; font-size: 13px; color: var(--text-muted); }
.chatp-offline-links { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; }

@media print { .chatp { display: none; } }
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd web && npx vitest run src/__tests__/ChatPanel.test.tsx
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ChatPanel.tsx web/src/components/ChatPanel.css web/src/__tests__/ChatPanel.test.tsx
git commit -m "Add inline ChatPanel with offline state and suggestion chips"
```

---

## Task 6: Restyle ResumeTheme (palette + 760px column + fade-in on scroll)

**Files:**
- Modify: `web/src/components/ResumeTheme.tsx`

- [ ] **Step 1: Retheme the ResumeTheme wrapper to new palette and 760px column**

`ResumeTheme.tsx` currently uses `max-width: 900px` at line 88 and `max-width: 750px` at line 151 with hard-coded light colors. Change outer wrapper and inner column to use CSS variables and a harmonized width.

Open `web/src/components/ResumeTheme.tsx` and find the `Wrapper` / main container styled-components declarations. Replace their hard-coded colors and max-widths with:

```tsx
// Outer wrapper — page background already set by :root (var(--bg)).
// Inner column constrained to 760px for vertical alignment with identity card.
// Replace the existing styled.div`...` for the page wrapper with this:

const Page = styled.div`
  background: transparent;
  color: var(--text);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  padding-top: 72px;
  border-top: 1px solid var(--border-soft);
  margin-top: 72px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 400ms ease, transform 400ms ease;
  &.is-visible { opacity: 1; transform: translateY(0); }
`;

const Column = styled.div`
  max-width: var(--column-max);
  margin: 0 auto;
  padding: 0 var(--side-gutter);
  @media (max-width: 640px) {
    padding: 0 var(--side-gutter-mobile);
  }
`;
```

Find where the existing outermost wrapper renders and wrap its contents:

```tsx
import { useEffect, useRef, useState } from 'react';
// ...existing imports...

export function ResumeTheme({ resume }: { resume: Record<string, unknown> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Page ref={ref} className={visible ? 'is-visible' : ''}>
      <Column>
        {/* ... existing content (sections, headings, etc.) ... */}
      </Column>
    </Page>
  );
}
```

Additionally, inside the existing styled-components definitions, replace color literals with CSS variables:

- `#1f2937` → `var(--text)`
- `#4b5563` / `#374151` → `var(--text-muted)` (use muted for meta text, body for main)
- `#6b7280` / `#9ca3af` → `var(--text-dim)`
- `#e5e7eb` / `#f3f4f6` → `var(--border-soft)`
- `#2563eb` → `var(--accent-blue)`

Use editor-wide search within `web/src/components/ResumeTheme.tsx` and replace one-by-one. Keep heatmap colors (GitHub greens) untouched — they live in `GithubActivity.tsx`, not here.

- [ ] **Step 2: Add print override inside ResumeTheme**

Inside the styled-components that compose the Page, make sure no `background` is set directly on the résumé sections (background inherits from body). The global `@media print` already flips tokens to light; the résumé will render as dark-on-white in print.

Verify by adding this at the bottom of `Page`:

```tsx
const Page = styled.div`
  /* ... (everything above) ... */
  @media print {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
    opacity: 1;
    transform: none;
  }
`;
```

- [ ] **Step 3: Run existing unit tests — confirm no regressions**

```bash
cd web && npx vitest run
```

Expected: all existing tests pass, including `App.test.tsx` checks on résumé summary text (those assert on content, not colors).

- [ ] **Step 4: Visually verify in dev**

```bash
cd web && npm run dev
```

Open `http://localhost:5173/`. Expected: résumé section renders in dark mode, 760px wide, with the new top border separator visible. Kill dev server.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ResumeTheme.tsx
git commit -m "Retheme ResumeTheme to dark palette and 760px column"
```

---

## Task 7: Restyle GithubActivity + add #activity anchor

**Files:**
- Modify: `web/src/components/GithubActivity.tsx`

- [ ] **Step 1: Update Wrapper to use CSS variables, 760px column, and id anchor**

In `web/src/components/GithubActivity.tsx`, locate the `Wrapper` styled-component at lines 26–36 and replace:

```tsx
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
```

Then locate the `Header` component (lines 38–45), `LangLegend` (62–76), `RepoList` (78–89), `Footnote` (91–95), and replace hard-coded colors:

- `#1f2937` → `var(--text)`
- `#6b7280` → `var(--text-muted)`
- `#4b5563` → `var(--text-muted)`
- `#9ca3af` → `var(--text-dim)`
- `#e5e7eb` → `var(--border-soft)`
- `#f3f4f6` → `var(--border-soft)`
- `#2563eb` → `var(--accent-blue)`

Keep `HEATMAP_BUCKETS` (line 97) and `SPARK_BUCKETS` logic — GitHub green scale is fine on dark.

- [ ] **Step 2: Add `id="activity"` anchor**

In the `GithubActivity` function's JSX, change the root element:

```tsx
return (
  <Wrapper id="activity">
    {/* ... existing children unchanged ... */}
  </Wrapper>
);
```

- [ ] **Step 3: Update existing GithubActivity test if needed**

Open `web/src/__tests__/GithubActivity.test.tsx` and run it:

```bash
cd web && npx vitest run src/__tests__/GithubActivity.test.tsx
```

If assertions depend on the old light theme's specific colors, update them. Content-based assertions (e.g. `@verkyyi`, language names) should still pass.

Add one new test to cover the anchor:

```tsx
// Inside the existing describe block in GithubActivity.test.tsx, add:
it('has id="activity" for in-page anchor scrolling', () => {
  const data = {
    user: 'u', fetchedAt: '2026-04-17T00:00:00.000Z',
    stats: { publicRepos: 1, contributions30d: 1, contributionsLastYear: 1 },
    contributions: { weeks: [[{ date: '2026-04-10', count: 1 }]] },
    languages: [{ name: 'TS', color: '#3178c6', pct: 100 }],
    repos: [],
  };
  const { container } = render(<GithubActivity data={data} />);
  expect(container.querySelector('#activity')).not.toBeNull();
});
```

- [ ] **Step 4: Run tests — verify pass**

```bash
cd web && npx vitest run src/__tests__/GithubActivity.test.tsx
```

Expected: all tests pass including the new anchor test.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/GithubActivity.tsx web/src/__tests__/GithubActivity.test.tsx
git commit -m "Retheme GithubActivity and add #activity anchor"
```

---

## Task 8: App composition, share activity fetch, delete ChatWidget, update tests

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/__tests__/App.test.tsx`
- Delete: `web/src/components/ChatWidget.tsx`, `web/src/components/ChatWidget.css`, `web/src/__tests__/ChatWidget.test.tsx`

- [ ] **Step 1: Rewrite App.tsx ResumePage to new composition**

Replace the body of `web/src/App.tsx` (keep `isDashboard`; drop `ChatWidget`):

```tsx
import { useEffect, useState } from 'react';
import { useAdaptation } from './hooks/useAdaptation';
import { ResumeTheme } from './components/ResumeTheme';
import { DownloadPdf } from './components/DownloadPdf';
import { Dashboard } from './components/Dashboard';
import { IdentityCard, type IdentityBasics } from './components/IdentityCard';
import { ChatPanel } from './components/ChatPanel';
import { ActivityStrip } from './components/ActivityStrip';
import { Footer } from './components/Footer';
import { GithubActivity, type ActivityData } from './components/GithubActivity';
import { parseFitSummary } from './utils/parseFitSummary';

function isDashboard(): boolean {
  const base = import.meta.env.BASE_URL ?? '/';
  let path = window.location.pathname;
  if (base !== '/' && path.startsWith(base)) {
    path = path.slice(base.length);
  }
  return path.replace(/^\/+|\/+$/g, '') === 'dashboard';
}

export default function App() {
  if (isDashboard()) return <Dashboard />;
  return <ResumePage />;
}

function ResumePage() {
  const { adapted, error, slug } = useAdaptation();
  const [target, setTarget] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);

  useEffect(() => {
    if (adapted?.basics?.name) {
      document.title = `${adapted.basics.name} — Resume`;
    }
  }, [adapted]);

  useEffect(() => {
    const s = slug ?? 'default';
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/fitted/${s}.md`)
      .then((r) => (r.ok ? r.text() : ''))
      .then((md) => {
        if (cancelled) return;
        const summary = parseFitSummary(md).summary;
        setTarget(summary?.target ?? s);
      })
      .catch(() => { if (!cancelled) setTarget(s); });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/github/activity.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ActivityData | null) => { if (!cancelled) setActivity(data); })
      .catch(() => { if (!cancelled) setActivity(null); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <main>
        <h1>Not Found</h1>
        <p>No resume adaptation exists for this path.</p>
        <a href={import.meta.env.BASE_URL}>Go to homepage</a>
      </main>
    );
  }

  if (!adapted) return <main>Loading…</main>;

  const activeSlug = slug ?? 'default';
  const basics = (adapted.basics ?? {}) as IdentityBasics;

  return (
    <>
      <DownloadPdf slug={slug} />
      <IdentityCard basics={basics} slug={activeSlug} />
      {target !== null && (
        <ChatPanel
          key={activeSlug}
          slug={activeSlug}
          target={target}
          email={basics.email}
          profiles={basics.profiles}
        />
      )}
      <ActivityStrip data={activity} />
      <ResumeTheme resume={adapted as unknown as Record<string, unknown>} />
      <GithubActivity data={activity} />
      <Footer />
    </>
  );
}
```

Notes:
- `ChatPanel` renders only once `target` is resolved (same condition as the old `ChatWidget`), to avoid flashing the wrong context.
- `key={activeSlug}` resets chat state when user navigates between slugs.

- [ ] **Step 2: Delete ChatWidget files**

```bash
rm web/src/components/ChatWidget.tsx web/src/components/ChatWidget.css web/src/__tests__/ChatWidget.test.tsx
```

- [ ] **Step 3: Update App.test.tsx**

Open `web/src/__tests__/App.test.tsx`. The existing tests assert on `Default summary` and `Notion summary`. After the new composition, these strings now appear in BOTH the IdentityCard's one-liner AND the résumé body — so `getByText` will fail with "multiple matches." Fix by using `findAllByText` or scoping by role.

Replace the two `expect(screen.getByText('Default summary'))...` and `expect(screen.getByText('Notion summary'))...` lines:

```tsx
// In "App — default path" → "renders default resume at root":
await waitFor(() => {
  const matches = screen.getAllByText(/Default summary/);
  expect(matches.length).toBeGreaterThan(0);
});

// In "App — slug path" → "renders adaptation for known slug":
await waitFor(() => {
  const matches = screen.getAllByText(/Notion summary/);
  expect(matches.length).toBeGreaterThan(0);
});
```

Add one new test that asserts the component stack order:

```tsx
describe('App — new stack composition', () => {
  it('renders IdentityCard, ActivityStrip, ResumeTheme, and GithubActivity in order for slug "default"', async () => {
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

    // Wait for everything to mount
    await screen.findByText('Alex Chen'); // identity card name
    await screen.findByText(/42/);         // activity strip count

    // DOM order check: idcard, strip, résumé, activity in document order
    const idcard = document.querySelector('.idcard')!;
    const strip = document.querySelector('.strip')!;
    const activityEl = document.getElementById('activity')!;
    expect(idcard).not.toBeNull();
    expect(strip).not.toBeNull();
    expect(activityEl).not.toBeNull();
    // Compare DOCUMENT_POSITION bitmasks to assert document order
    expect(idcard.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(strip.compareDocumentPosition(activityEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
```

Keep existing `App — /dashboard route` test as-is — dashboard still routes correctly.

- [ ] **Step 4: Run all unit tests**

```bash
cd web && npx vitest run
```

Expected: all tests pass. If any fail, read the failure; common causes:
- `getByText` ambiguity → switch to `getAllByText` or scope with `within()`
- Fetch mock missing a URL path → add a stub

- [ ] **Step 5: Visually verify full page**

```bash
cd web && npm run dev
```

Open `http://localhost:5173/`. Expected top-to-bottom order: IdentityCard → ChatPanel (inline, ~60vh) → ActivityStrip → ResumeTheme (border-top separator) → GithubActivity → Footer. Click "↓ jump to full activity" on the strip — should smooth-scroll to the GithubActivity section. Visit `/dashboard` — dashboard unchanged.

Kill dev server.

- [ ] **Step 6: Commit**

```bash
git add web/src/App.tsx web/src/__tests__/App.test.tsx
git rm web/src/components/ChatWidget.tsx web/src/components/ChatWidget.css web/src/__tests__/ChatWidget.test.tsx
git commit -m "Compose new chat-first layout in App; remove superseded ChatWidget"
```

---

## Task 9: E2E tests (Playwright)

**Files:**
- Create: `web/e2e/portfolio-layout.spec.ts`

- [ ] **Step 1: Write the E2E spec**

`web/e2e/portfolio-layout.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Portfolio layout — chat-first', () => {
  test('default slug: identity → chat → strip → résumé in order', async ({ page }) => {
    await page.goto('/');

    // Identity card visible
    const idcard = page.locator('.idcard');
    await expect(idcard).toBeVisible();
    await expect(idcard.locator('.idcard-name')).toContainText(/./);

    // Chat panel or offline card is present (depending on env)
    const chat = page.locator('.chatp');
    await expect(chat).toBeVisible();

    // Activity strip present iff activity.json exists — allow absence
    const strip = page.locator('.strip');
    if (await strip.count()) {
      await expect(strip).toBeVisible();
    }

    // Résumé section below chat
    const resumeAnchor = page.locator('main, article, section').first();
    await expect(resumeAnchor).toBeVisible();

    // #activity exists iff activity.json was loaded
    const activityTarget = page.locator('#activity');
    if (await activityTarget.count()) {
      await expect(activityTarget).toBeAttached();
    }
  });

  test('/notion slug renders with same layout', async ({ page }) => {
    const resp = await page.goto('/notion');
    // If this deploy has no notion adaptation, skip
    if (resp && resp.status() === 404) test.skip(true, 'no notion adaptation in this deploy');

    await expect(page.locator('.idcard')).toBeVisible();
    await expect(page.locator('.chatp')).toBeVisible();
  });

  test('mobile viewport — no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('.idcard')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('print media hides chat and activity strip', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.chatp')).toBeHidden();
    if (await page.locator('.strip').count()) {
      await expect(page.locator('.strip')).toBeHidden();
    }
  });

  test('/dashboard still routes to dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/Fitted Resumes/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Build the site (E2E tests run against a static build)**

```bash
cd web && npm run build
```

- [ ] **Step 3: Run Playwright**

```bash
cd web && npx playwright test e2e/portfolio-layout.spec.ts
```

Expected: all tests pass. Common issues:
- `chatp` not visible because `VITE_CHAT_PROXY_URL` is unset in the build → test still passes because the offline card also has `.chatp` class.
- `.strip` missing because `activity.json` is not copied → guarded by `if (await strip.count())`.

If failures are genuine (not missing data), debug with `npx playwright test --ui`.

- [ ] **Step 4: Commit**

```bash
git add web/e2e/portfolio-layout.spec.ts
git commit -m "Add E2E tests for chat-first layout, mobile, print, dashboard"
```

---

## Final Verification

- [ ] **Step 1: Full test suite**

```bash
cd web && npx vitest run && npx playwright test
```

Expected: all unit tests pass; all Playwright tests pass.

- [ ] **Step 2: Manual smoke test**

```bash
cd web && npm run dev
```

Open `http://localhost:5173/` and verify:
1. Dark theme loaded, JetBrains Mono rendering.
2. Identity card shows name with blinking caret, label/location line, one-liner as `// …` comment, profile links.
3. Chat panel is inline (not FAB), takes ~60vh, shows greeting + 3 suggestion chips.
4. Clicking a chip prefills the input.
5. Activity strip shows sparkline + contributions count + top 3 languages.
6. Clicking "↓ jump to full activity" smooth-scrolls to the full heatmap below.
7. Résumé section is separated by top border and fades in as it scrolls into view.
8. GithubActivity has the familiar green heatmap on dark background.
9. Visit `/notion` — same layout, Notion-adapted content.
10. Visit `/dashboard` — unchanged light-theme dashboard (or the dashboard may look off if its own styles used the old `--paper` variables; if so, that is a follow-up scope item, not part of this plan).
11. `Cmd/Ctrl-P` print preview — chat and strip hidden, résumé prints as dark-on-white.

- [ ] **Step 3: Commit any fixes found during smoke**

Only commit if something was broken that the tests did not catch. Otherwise, move on.

---

## Self-Review Notes

**Spec coverage:**
- §Architecture → Tasks 8 (routing/composition), 3–7 (components).
- §IdentityCard → Task 3 covers all missing-field behaviors.
- §ChatPanel — inline, offline state, chip prefill, reset-when-empty, ported ChatWidget behaviors → Task 5 covers all.
- §ActivityStrip → Task 4 covers all.
- §ResumeTheme restyle → Task 6.
- §GithubActivity restyle + anchor → Task 7.
- §Data flow (shared activity fetch) → Task 8 step 1 passes `activity` to both consumers.
- §Visual design (palette, type, spatial) → Task 1 (global) + component CSS in Tasks 3–5 + Task 6 for résumé.
- §Motion (idcard stagger, chat slide-in, résumé IntersectionObserver) → Tasks 3, 5, 6 respectively; reduced-motion global in Task 1.
- §Responsive → mobile CSS in Tasks 3, 4, 5, 6, 7.
- §Print → global overrides in Task 1; per-component `@media print` in Tasks 4, 5; résumé forces dark-on-white via global token flip in Task 1.
- §Fallbacks (no adapted, no activity, no label, no summary, no profiles, no proxy, streaming error, fit-summary fetch fail) → covered in Task 3, 4, 5, and App's existing branches.
- §Testing (all unit + E2E items) → Tasks 3–9.

**Placeholder scan:** No TBDs, no "add error handling," no "similar to Task N" — all code is inline.

**Type consistency:**
- `IdentityBasics` defined in `IdentityCard.tsx`, imported by `App.tsx`. Field names match across spec.
- `ActivityData` imported from `GithubActivity.tsx` by `ActivityStrip`, `activityMetrics.ts`, and tests — no re-definition drift.
- `ChatPanelProps` field `profiles?: { network: string; url: string }[]` matches the shape inside `IdentityBasics.profiles`.
- `SPARK_BUCKETS` is local to `ActivityStrip.tsx` — no global name collision.
- Reset in ChatPanel is a button labeled "clear conversation" consistently across component, CSS, and test.

**Scope:** Single plan, single-session executable. No subsystem decomposition needed.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-17-portfolio-layout.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
