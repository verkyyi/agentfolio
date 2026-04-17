# GitHub Activity Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dynamic "Live Activity" section below the resume on every public slug, backed by a daily workflow that fetches GitHub contributions, top languages, and recent repos.

**Architecture:** Scheduled workflow → `scripts/fetch-github-activity.mjs` runs a single GraphQL query using the built-in `GITHUB_TOKEN` for `github.repository_owner`, writes `data/github/activity.json`, commits, and triggers deploy. `web/scripts/copy-data.cjs` syncs the file to `web/public/data/github/activity.json`. A new `GithubActivity` component fetches that JSON on mount and renders a header strip, hand-rolled SVG heatmap, stacked language bar, and recent-repo list. Absent file = section silently skipped.

**Tech Stack:** Node 20 (native `fetch`), GitHub GraphQL API v4, React 18, styled-components, Vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-04-17-github-activity-design.md`

---

## File Structure

| Path | Create / Modify | Purpose |
|---|---|---|
| `scripts/fetch-github-activity.mjs` | Create | Node script; hits GitHub GraphQL once, writes activity.json |
| `.github/workflows/activity.yml` | Create | Daily cron + workflow_dispatch; runs the script, commits, triggers deploy |
| `data/github/.gitkeep` | Create | Ensures the output directory exists in fresh clones |
| `web/scripts/copy-data.cjs` | Modify | Sync `data/github/activity.json` → `web/public/data/github/activity.json` |
| `web/src/utils/githubColors.ts` | Create | Small linguist color map for languages not carrying `color` from the API |
| `web/src/components/GithubActivity.tsx` | Create | Renders header, heatmap, languages, repos |
| `web/src/App.tsx` | Modify | Fetch activity.json in `ResumePage`, mount `<GithubActivity />` when available |
| `web/src/__tests__/fetch-github-activity.test.ts` | Create | Unit test for the fetch script (stubs `fetch`) |
| `web/src/__tests__/GithubActivity.test.tsx` | Create | Component tests covering each sub-visual + null-state |
| `web/src/__tests__/copy-data.test.ts` | Modify | Add assertion that activity.json is copied when present |
| `web/src/__tests__/App.test.tsx` | Modify | Assert `<GithubActivity />` mounts when activity.json fetch succeeds |
| `README.md` | Modify | One bullet in Features |

Each file has a single responsibility. `GithubActivity.tsx` is a single component file (~250 lines) that composes four internal sub-components — small enough to hold in context, but kept together because they share layout context and never reuse.

---

### Task 1: Add the GitHub linguist color map module

**Files:**
- Create: `web/src/utils/githubColors.ts`

The GitHub GraphQL API returns a `color` for each language per-repo but not for the aggregated legend. Rather than a second API call, ship a small constant map. Only 15 common languages — forks can extend if needed.

- [ ] **Step 1: Create the file**

```typescript
// web/src/utils/githubColors.ts
// Subset of GitHub's linguist color map for languages likely to appear
// in a developer portfolio. Fallback color used when a language is missing.
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Rust: '#dea584',
  Go: '#00add8',
  Java: '#b07219',
  Kotlin: '#a97bff',
  Swift: '#f05138',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4f5d95',
  HTML: '#e34c26',
  CSS: '#663399',
  Shell: '#89e051',
  Dockerfile: '#384d54',
};

export const FALLBACK_COLOR = '#9ca3af';

export function colorFor(name: string): string {
  return LANGUAGE_COLORS[name] ?? FALLBACK_COLOR;
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/utils/githubColors.ts
git commit -m "feat(activity): add github linguist color map"
```

---

### Task 2: Fetch script — failing test

**Files:**
- Test: `web/src/__tests__/fetch-github-activity.test.ts`

The fetch script is a Node CLI. We test the exported `buildActivity()` helper (pure — takes a GraphQL response shape, returns the output JSON), so we don't need to mock `fetch` or `fs`.

- [ ] **Step 1: Write the failing test**

```typescript
// web/src/__tests__/fetch-github-activity.test.ts
import { describe, it, expect } from 'vitest';
import { buildActivity } from '../../../scripts/fetch-github-activity.mjs';

const fixture = {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: 1247,
        weeks: [
          {
            contributionDays: [
              { date: '2025-04-20', contributionCount: 0 },
              { date: '2025-04-21', contributionCount: 3 },
              { date: '2025-04-22', contributionCount: 1 },
              { date: '2025-04-23', contributionCount: 0 },
              { date: '2025-04-24', contributionCount: 0 },
              { date: '2025-04-25', contributionCount: 0 },
              { date: '2025-04-26', contributionCount: 0 },
            ],
          },
          {
            contributionDays: Array.from({ length: 7 }, (_, i) => ({
              date: `2026-04-${11 + i}`,
              contributionCount: i + 1,
            })),
          },
        ],
      },
    },
    repositories: {
      totalCount: 12,
      nodes: [
        {
          name: 'r1',
          languages: {
            edges: [
              { size: 5000, node: { name: 'TypeScript', color: '#3178c6' } },
              { size: 2000, node: { name: 'CSS', color: '#663399' } },
            ],
          },
        },
        {
          name: 'r2',
          languages: {
            edges: [
              { size: 1000, node: { name: 'Python', color: '#3572a5' } },
            ],
          },
        },
      ],
    },
    recent: {
      nodes: [
        {
          name: 'agentfolio',
          url: 'https://github.com/verkyyi/agentfolio',
          description: 'Open-source agentic portfolio engine',
          stargazerCount: 42,
          pushedAt: '2026-04-17T05:29:33Z',
          primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
        },
      ],
    },
  },
};

describe('buildActivity', () => {
  it('shapes the GraphQL response into the activity.json schema', () => {
    const result = buildActivity('verkyyi', fixture, new Date('2026-04-17T06:00:00Z'));

    expect(result.user).toBe('verkyyi');
    expect(result.fetchedAt).toBe('2026-04-17T06:00:00.000Z');
    expect(result.stats.publicRepos).toBe(12);
    expect(result.stats.contributionsLastYear).toBe(1247);
    expect(result.contributions.weeks).toHaveLength(2);
    expect(result.contributions.weeks[0][1]).toEqual({ date: '2025-04-21', count: 3 });
    expect(result.repos[0].name).toBe('agentfolio');
    expect(result.repos[0].language).toBe('TypeScript');
    expect(result.repos[0].languageColor).toBe('#3178c6');
    expect(result.languages.length).toBeGreaterThan(0);
    expect(result.languages[0].name).toBe('TypeScript');
    expect(Math.round(result.languages.reduce((s, l) => s + l.pct, 0))).toBe(100);
  });

  it('computes 30-day contributions from the tail of the calendar', () => {
    const result = buildActivity('verkyyi', fixture, new Date('2026-04-17T06:00:00Z'));
    // Last 30 daily entries exist only if we have 30+ days; with 14 total, 30d sum = all
    const expected = fixture.user.contributionsCollection.contributionCalendar.weeks
      .flatMap((w) => w.contributionDays)
      .reduce((s, d) => s + d.contributionCount, 0);
    expect(result.stats.contributions30d).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd /home/dev/projects/agentfolio/web
npx vitest run src/__tests__/fetch-github-activity.test.ts
```
Expected: FAIL — `Cannot find module '../../../scripts/fetch-github-activity.mjs'`.

---

### Task 3: Fetch script — minimal implementation

**Files:**
- Create: `scripts/fetch-github-activity.mjs`

- [ ] **Step 1: Write the script**

```javascript
// scripts/fetch-github-activity.mjs
// Node 20 script. No deps. Called from .github/workflows/activity.yml.
// Exports buildActivity for unit tests; runs the fetch when invoked directly.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const QUERY = `
query UserActivity($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date contributionCount }
        }
      }
    }
    repositories(first: 100, isFork: false, privacy: PUBLIC, ownerAffiliations: OWNER) {
      totalCount
      nodes {
        name
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    recent: repositories(first: 10, isFork: false, privacy: PUBLIC, ownerAffiliations: OWNER, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        name url description stargazerCount pushedAt
        primaryLanguage { name color }
      }
    }
  }
}`;

export function buildActivity(login, data, now = new Date()) {
  const cal = data.user.contributionsCollection.contributionCalendar;
  const weeks = cal.weeks.map((w) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))
  );

  const flat = weeks.flat();
  const last30 = flat.slice(-30);
  const contributions30d = last30.reduce((s, d) => s + d.count, 0);

  // Aggregate language bytes across all repos
  const bytes = new Map();
  const colors = new Map();
  for (const repo of data.user.repositories.nodes) {
    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      bytes.set(name, (bytes.get(name) ?? 0) + edge.size);
      if (!colors.has(name) && edge.node.color) colors.set(name, edge.node.color);
    }
  }
  const total = Array.from(bytes.values()).reduce((a, b) => a + b, 0) || 1;
  const languages = Array.from(bytes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, size]) => ({
      name,
      color: colors.get(name) ?? '#9ca3af',
      pct: Math.round((size / total) * 1000) / 10,
    }));

  const repos = data.user.recent.nodes.slice(0, 5).map((r) => ({
    name: r.name,
    url: r.url,
    description: r.description ?? '',
    language: r.primaryLanguage?.name ?? null,
    languageColor: r.primaryLanguage?.color ?? null,
    stars: r.stargazerCount,
    pushedAt: r.pushedAt,
  }));

  return {
    user: login,
    fetchedAt: now.toISOString(),
    stats: {
      publicRepos: data.user.repositories.totalCount,
      contributions30d,
      contributionsLastYear: cal.totalContributions,
    },
    contributions: { weeks },
    languages,
    repos,
  };
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const login = process.env.GITHUB_REPOSITORY_OWNER;
  if (!token) throw new Error('GITHUB_TOKEN is required');
  if (!login) throw new Error('GITHUB_REPOSITORY_OWNER is required');

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'agentfolio-activity',
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error('GraphQL errors: ' + JSON.stringify(json.errors));

  const activity = buildActivity(login, json.data);
  const outPath = path.resolve('data/github/activity.json');
  await writeFile(outPath, JSON.stringify(activity, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${outPath}`);
}

// Only run main() when invoked as a script, not when imported for tests.
const isMain = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '');
if (isMain) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
```

- [ ] **Step 2: Run tests — expect pass**

```bash
cd /home/dev/projects/agentfolio/web
npx vitest run src/__tests__/fetch-github-activity.test.ts
```
Expected: PASS, 2 tests green.

- [ ] **Step 3: Commit**

```bash
cd /home/dev/projects/agentfolio
git add scripts/fetch-github-activity.mjs web/src/__tests__/fetch-github-activity.test.ts
git commit -m "feat(activity): fetch script + buildActivity tests"
```

---

### Task 4: Output directory + copy-data extension

**Files:**
- Create: `data/github/.gitkeep`
- Modify: `web/scripts/copy-data.cjs`
- Modify: `web/src/__tests__/copy-data.test.ts`

- [ ] **Step 1: Create placeholder directory**

```bash
cd /home/dev/projects/agentfolio
mkdir -p data/github
touch data/github/.gitkeep
```

- [ ] **Step 2: Write the failing test**

Append this block to the existing `describe('copy-data script', ...)` in `web/src/__tests__/copy-data.test.ts`:

```typescript
  it('copies data/github/activity.json when it exists', () => {
    const src = join(__dirname, '..', '..', '..', 'data', 'github', 'activity.json');
    const dst = join(__dirname, '..', '..', 'public', 'data', 'github', 'activity.json');
    if (existsSync(src)) {
      expect(existsSync(dst)).toBe(true);
      expect(readFileSync(src, 'utf-8')).toBe(readFileSync(dst, 'utf-8'));
    } else {
      // Absent source must not crash the copy — verify no output path was created.
      expect(existsSync(dst)).toBe(false);
    }
  });
```

- [ ] **Step 3: Run test — expect fail if a fixture activity.json exists, else pass-through**

```bash
cd /home/dev/projects/agentfolio/web
npx vitest run src/__tests__/copy-data.test.ts
```

If `data/github/activity.json` doesn't exist yet, the test passes immediately (covers the absent branch). If it does exist (manual fixture added), it will FAIL because copy-data doesn't sync it. Either way, proceed to step 4.

- [ ] **Step 4: Extend copy-data.cjs**

At the end of `web/scripts/copy-data.cjs`, add:

```javascript
// Copy github activity JSON if it exists
const activitySrc = path.join(root, '..', 'data', 'github', 'activity.json');
const activityDst = path.join(root, 'public', 'data', 'github', 'activity.json');
if (fs.existsSync(activitySrc)) {
  fs.mkdirSync(path.dirname(activityDst), { recursive: true });
  fs.copyFileSync(activitySrc, activityDst);
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd /home/dev/projects/agentfolio/web
npx vitest run src/__tests__/copy-data.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/dev/projects/agentfolio
git add data/github/.gitkeep web/scripts/copy-data.cjs web/src/__tests__/copy-data.test.ts
git commit -m "feat(activity): sync github activity.json via copy-data"
```

---

### Task 5: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/activity.yml`

No unit test — workflow YAML is verified at runtime. Keep the structure isomorphic to other bot workflows (`fit.yml`, `extract.yml`, `structurize.yml`) so maintainers can pattern-match.

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/activity.yml
name: Refresh GitHub Activity

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Fetch github activity
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY_OWNER: ${{ github.repository_owner }}
        run: node scripts/fetch-github-activity.mjs

      - name: Commit updated activity
        id: commit
        run: |
          git config user.name "AgentFolio Bot"
          git config user.email "bot@agentfolio.local"
          git add data/github/activity.json
          if git diff --cached --quiet; then
            echo "no activity changes"
            echo "changed=false" >> "$GITHUB_OUTPUT"
          else
            git commit -m "chore(activity): refresh github activity"
            git push
            echo "changed=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Trigger deploy
        if: steps.commit.outputs.changed == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh workflow run deploy.yml
```

- [ ] **Step 2: Commit**

```bash
cd /home/dev/projects/agentfolio
git add .github/workflows/activity.yml
git commit -m "feat(activity): daily cron workflow"
```

---

### Task 6: GithubActivity component — failing tests

**Files:**
- Create: `web/src/__tests__/GithubActivity.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
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
      Array.from({ length: 7 }, (_, i) => ({ date: `2025-04-${20 + i}`, count: i })),
      Array.from({ length: 7 }, (_, i) => ({ date: `2025-04-${27 + i}`, count: 2 })),
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
  it('renders the header strip with stats', () => {
    render(<GithubActivity data={fixture} />);
    expect(screen.getByText(/@verkyyi/)).toBeInTheDocument();
    expect(screen.getByText(/12 public repos/)).toBeInTheDocument();
    expect(screen.getByText(/84 contributions/)).toBeInTheDocument();
  });

  it('renders one heatmap cell per contribution day', () => {
    const { container } = render(<GithubActivity data={fixture} />);
    const cells = container.querySelectorAll('svg rect.heatmap-cell');
    expect(cells.length).toBe(14);
  });

  it('renders language legend entries', () => {
    render(<GithubActivity data={fixture} />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders each repo with link and language', () => {
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
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd /home/dev/projects/agentfolio/web
npx vitest run src/__tests__/GithubActivity.test.tsx
```
Expected: FAIL — module not found.

---

### Task 7: GithubActivity component — implementation

**Files:**
- Create: `web/src/components/GithubActivity.tsx`

- [ ] **Step 1: Write the component**

```tsx
// web/src/components/GithubActivity.tsx
import styled from 'styled-components';
import { colorFor } from '../utils/githubColors';

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
  max-width: 800px;
  margin: 48px auto 24px;
  padding: 0 40px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1f2937;
  border-top: 1px solid #e5e7eb;
  padding-top: 32px;

  @media print { display: none; }
`;

const Header = styled.div`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 20px;

  a { color: #1f2937; text-decoration: none; font-weight: 600; }
  a:hover { color: #2563eb; }
`;

const HeatmapWrap = styled.div`
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 24px;
`;

const LangBar = styled.div`
  display: flex;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const LangLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 24px;

  span { display: inline-flex; align-items: center; gap: 6px; }
  span::before {
    content: '';
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--dot);
  }
`;

const RepoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 16px;

  li { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  li:last-child { border-bottom: none; }
  a { color: #1f2937; font-weight: 600; text-decoration: none; }
  a:hover { color: #2563eb; }
  .meta { color: #6b7280; font-size: 12px; margin-left: 8px; }
  .desc { color: #4b5563; display: block; margin-top: 2px; }
`;

const Footnote = styled.div`
  font-size: 11px;
  color: #9ca3af;
  text-align: right;
`;

const HEATMAP_BUCKETS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

function bucket(count: number): number {
  if (count === 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}

function Heatmap({ weeks }: { weeks: ActivityData['contributions']['weeks'] }) {
  const cell = 11;
  const gap = 2;
  const width = weeks.length * (cell + gap);
  const height = 7 * (cell + gap);

  return (
    <svg width={width} height={height} role="img" aria-label="Contribution heatmap">
      {weeks.map((week, wi) =>
        week.map((day, di) => (
          <rect
            key={`${wi}-${di}`}
            className="heatmap-cell"
            x={wi * (cell + gap)}
            y={di * (cell + gap)}
            width={cell}
            height={cell}
            rx={2}
            fill={HEATMAP_BUCKETS[bucket(day.count)]}
          >
            <title>{`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}</title>
          </rect>
        ))
      )}
    </svg>
  );
}

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
    <Wrapper>
      <Header>
        <a href={`https://github.com/${data.user}`} target="_blank" rel="noopener noreferrer">
          @{data.user}
        </a>
        {' · '}
        {data.stats.publicRepos} public repos
        {' · '}
        {data.stats.contributions30d} contributions last 30 days
      </Header>

      <HeatmapWrap>
        <Heatmap weeks={data.contributions.weeks} />
      </HeatmapWrap>

      <LangBar>
        {data.languages.map((l) => (
          <div
            key={l.name}
            style={{ width: `${l.pct}%`, background: l.color || colorFor(l.name) }}
            title={`${l.name} ${l.pct}%`}
          />
        ))}
      </LangBar>
      <LangLegend>
        {data.languages.map((l) => (
          <span key={l.name} style={{ ['--dot' as any]: l.color || colorFor(l.name) }}>
            {l.name} {Math.round(l.pct)}%
          </span>
        ))}
      </LangLegend>

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

- [ ] **Step 2: Run tests — expect pass**

```bash
cd /home/dev/projects/agentfolio/web
npx vitest run src/__tests__/GithubActivity.test.tsx
```
Expected: PASS, 6 tests green.

- [ ] **Step 3: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/components/GithubActivity.tsx web/src/__tests__/GithubActivity.test.tsx
git commit -m "feat(activity): GithubActivity component"
```

---

### Task 8: Mount in App — failing test

**Files:**
- Modify: `web/src/__tests__/App.test.tsx`

- [ ] **Step 1: Read the existing App test to find insertion point**

```bash
cd /home/dev/projects/agentfolio
cat web/src/__tests__/App.test.tsx
```

Existing tests mock `useAdaptation` and fetch for fitted markdown. Add a fourth test that stubs a successful activity.json fetch and asserts the heading/owner text appears.

- [ ] **Step 2: Add the failing test**

Append this block inside the existing `describe('App', ...)`:

```typescript
  it('mounts GithubActivity when activity.json is present', async () => {
    const mockAdapted = { basics: { name: 'Alex' }, work: [], education: [], skills: [] };
    vi.mocked(useAdaptation).mockReturnValue({ adapted: mockAdapted as any, error: null, slug: 'default' });

    const activity = {
      user: 'verkyyi',
      fetchedAt: '2026-04-17T06:00:00.000Z',
      stats: { publicRepos: 3, contributions30d: 7, contributionsLastYear: 100 },
      contributions: { weeks: [Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-${10 + i}`, count: 1 }))] },
      languages: [{ name: 'TS', color: '#3178c6', pct: 100 }],
      repos: [],
    };

    (global.fetch as any) = vi.fn((url: string) => {
      if (url.endsWith('activity.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(activity) });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve('') });
    });

    render(<App />);
    await screen.findByText(/@verkyyi/);
    expect(screen.getByText(/3 public repos/)).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run — expect failure**

```bash
cd /home/dev/projects/agentfolio/web
npx vitest run src/__tests__/App.test.tsx
```
Expected: FAIL — no `@verkyyi` text yet; the `<GithubActivity />` isn't mounted by App.

---

### Task 9: Mount in App — implementation

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Wire the fetch + mount**

Update imports and `ResumePage`:

```tsx
// web/src/App.tsx
import { useEffect, useState } from 'react';
import { useAdaptation } from './hooks/useAdaptation';
import { ResumeTheme } from './components/ResumeTheme';
import { DownloadPdf } from './components/DownloadPdf';
import { Dashboard } from './components/Dashboard';
import { ChatWidget } from './components/ChatWidget';
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
  if (isDashboard()) {
    return <Dashboard />;
  }
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

  return (
    <>
      <DownloadPdf slug={slug} />
      <ResumeTheme resume={adapted as unknown as Record<string, unknown>} />
      <GithubActivity data={activity} />
      <Footer />
      {target && <ChatWidget key={activeSlug} slug={activeSlug} target={target} />}
    </>
  );
}
```

- [ ] **Step 2: Run App test — expect pass**

```bash
cd /home/dev/projects/agentfolio/web
npx vitest run src/__tests__/App.test.tsx
```
Expected: PASS, all 5 tests (was 4 + 1 new).

- [ ] **Step 3: Run full test suite**

```bash
cd /home/dev/projects/agentfolio/web
npm test
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /home/dev/projects/agentfolio
git add web/src/App.tsx web/src/__tests__/App.test.tsx
git commit -m "feat(activity): mount GithubActivity in ResumePage"
```

---

### Task 10: Verification + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Features bullet**

In `README.md`, inside the `## Features` list (currently ending with `- **JSON Resume theme** — …`), add one more bullet:

```markdown
- **Live GitHub activity** — daily cron pulls contribution heatmap, top languages, and recent repos into a dynamic section below the resume. Independent of the resume pipeline.
```

- [ ] **Step 2: Type-check + build**

```bash
cd /home/dev/projects/agentfolio/web
npx tsc -b
npm run build
```
Expected: no type errors; build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /home/dev/projects/agentfolio
git add README.md
git commit -m "docs(activity): mention live github activity in features"
```

- [ ] **Step 4: Open PR**

```bash
cd /home/dev/projects/agentfolio
git push -u origin HEAD
gh pr create --title "feat: live github activity section (#62)" --body "$(cat <<'PRBODY'
## Summary
- Adds a daily cron workflow that fetches GitHub contributions, top languages, and recent repos for the deploy owner (\`github.repository_owner\`)
- Writes \`data/github/activity.json\`; \`copy-data.cjs\` syncs it to \`web/public/\`
- New \`GithubActivity\` component renders a header strip, hand-rolled SVG heatmap, stacked language bar, and recent-repo list below the resume on every public slug
- Independent of the \`/fit\` → \`/structurize\` pipeline; section auto-hides when \`activity.json\` is absent

Closes #62

## Test plan
- [x] \`npx vitest run\` — all unit tests pass (including new \`fetch-github-activity\`, \`GithubActivity\`, \`copy-data\`, \`App\` tests)
- [x] \`npx tsc -b\` clean
- [x] \`npm run build\` succeeds
- [ ] Trigger \`activity.yml\` manually: \`gh workflow run activity.yml\`
- [ ] Verify \`data/github/activity.json\` is committed and deploy redeploys
- [ ] Visit \`https://agentfolio.lianghuiyi.com/\` — activity section visible below resume, heatmap renders, languages/repos populated
- [ ] Verify section hidden in print preview

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
)"
```

---

## Post-merge validation

After the PR lands on main, the first scheduled run happens at 06:00 UTC the next day. To validate immediately, dispatch the workflow manually from the Actions tab or via `gh workflow run activity.yml`. Expected outcome:

1. Workflow runs, commits `data/github/activity.json`.
2. Deploy workflow fires on the new commit.
3. Site at `https://agentfolio.lianghuiyi.com/` shows the activity section below the resume.

If the first run commits nothing, the bot user's token may lack the `read:user` scope in GraphQL — `GITHUB_TOKEN` covers public profile data so this should not happen, but if it does, check workflow logs for GraphQL errors.
