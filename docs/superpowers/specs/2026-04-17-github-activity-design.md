# GitHub Activity Section — Design

**Date:** 2026-04-17
**Issue:** [#62 Adding dynamic content such as github activity summary](https://github.com/verkyyi/agentfolio/issues/62)
**Status:** Spec

## Overview

Add a "Live Activity" section to every public slug page (e.g. `/`, `/notion`, `/stripe`). The section is rendered **below** the resume and is fully independent of the resume pipeline — it has its own data workflow, its own JSON output, and its own component. A daily cron fetches GitHub activity for the deploy's owner, commits the result, and triggers a rebuild.

## Goals

- Show liveness on a portfolio site without embedding GitHub data into the resume content itself.
- Zero runtime API traffic; everything is statically served.
- No coupling with `/fit`, `/extract-directives`, `/structurize`, or `data/adapted/*`.
- Opt-out for forks is automatic: no fetch success → no section rendered.

## Non-goals

- No PR/issue activity streams (noisy, mostly uninteresting individually).
- No per-adaptation filtering of activity content (same section on every slug).
- No pinned repos (owner can curate those into the resume `projects` section).
- No tooltip library or 3rd-party heatmap library.
- No configuration file. The owner is implicitly `github.repository_owner`.

## Architecture

```
┌─────────────────────┐
│ activity.yml (cron) │──► GraphQL API ──► data/github/activity.json (committed)
└─────────────────────┘                                │
                                                       ▼
                                              copy-data.cjs syncs
                                                       │
                                                       ▼
                                      web/public/data/github/activity.json
                                                       │
                                                       ▼
                          GithubActivity.tsx fetches + renders below <ResumeTheme />
```

## Data pipeline

### New workflow `.github/workflows/activity.yml`

- **Triggers**
  - `schedule`: `cron: '0 6 * * *'` (06:00 UTC daily — outside US peak working hours)
  - `workflow_dispatch` (manual refresh)
- **Permissions**: `contents: write` (to commit the JSON)
- **Steps**
  1. Checkout
  2. Setup Node 20
  3. Run `node scripts/fetch-github-activity.mjs` (new script, in repo root `scripts/` — separate from `web/scripts/`)
     - Reads `GITHUB_TOKEN` from env, uses `${{ github.repository_owner }}` as the target user
     - Calls GraphQL API once for user contributions + languages; calls REST API once for recently pushed repos
     - Writes `data/github/activity.json`
  4. `git add data/github/activity.json && git commit -m "chore(activity): refresh github activity" && git push` (skip if no diff)
  5. `gh workflow run deploy.yml` if committed (same pattern as other bot workflows)

### Schema — `data/github/activity.json`

```json
{
  "user": "verkyyi",
  "fetchedAt": "2026-04-17T06:00:00Z",
  "stats": {
    "publicRepos": 12,
    "contributions30d": 84,
    "contributionsLastYear": 1247
  },
  "contributions": {
    "weeks": [
      [
        { "date": "2025-04-20", "count": 0 },
        { "date": "2025-04-21", "count": 3 },
        ...
      ],
      ...
    ]
  },
  "languages": [
    { "name": "TypeScript", "color": "#3178c6", "pct": 42.1 },
    { "name": "Python",     "color": "#3572a5", "pct": 21.8 },
    ...
  ],
  "repos": [
    {
      "name": "agentfolio",
      "url": "https://github.com/verkyyi/agentfolio",
      "description": "Open-source agentic portfolio engine",
      "language": "TypeScript",
      "languageColor": "#3178c6",
      "stars": 42,
      "pushedAt": "2026-04-17T05:29:33Z"
    },
    ...
  ]
}
```

- `contributions.weeks` — outer array is 53 weeks max (GitHub's native structure), each inner array is 7 daily entries.
- `languages` — top 5 by bytes across the user's public repos. Color comes from GitHub's [linguist color map](https://github.com/ozh/github-colors/blob/master/colors.json) (shipped as a small constant inline; no runtime lookup).
- `repos` — top 5 by `pushedAt` descending, public only, excluding forks.

### Fetch script (`scripts/fetch-github-activity.mjs`)

- Plain Node 20 (has `fetch` built-in), no deps.
- One GraphQL query for contributions + languages (single round trip).
- One REST call for recent repos (`GET /users/{owner}/repos?sort=pushed&per_page=10&type=owner`, filter out forks, take top 5).
- Writes JSON atomically (`fs.writeFileSync` is fine for this size; <50KB).

## UI

### New component `web/src/components/GithubActivity.tsx`

Layout (top to bottom, constrained to the same 800px max-width as the resume):

1. **Header strip** — `@username · 12 public repos · 84 contributions last 30 days`
2. **Contribution heatmap** — hand-rolled SVG:
   - 53 columns × 7 rows of 11px squares, 2px gap (matches GitHub's own sizing)
   - 5-bucket green palette: `#ebedf0 #9be9a8 #40c463 #30a14e #216e39`
   - Month labels above, weekday labels (Mon/Wed/Fri) on the left
   - Each `<rect>` has `<title>` child for native hover tooltip (`"3 contributions on Apr 21"`)
   - Responsive: horizontal scroll on narrow viewports (no wrapping)
3. **Top languages bar** — single horizontal 8px-tall stacked bar, full width; legend below with colored dots + name + percentage.
4. **Recent repos** — 3-5 list items. Each: `[name link] · [language dot + name] · [description] · [pushed 3 days ago]`.
5. **Footnote** — `Updated 2026-04-17` in small muted text.

### Wiring in `App.tsx`

- `ResumePage` component fetches `/data/github/activity.json` once on mount (parallel to existing fetches).
- If fetch fails or returns 404 → don't render the section. Forks without activity data get the baseline experience silently.
- Render order inside the fragment: `<DownloadPdf />`, `<ResumeTheme />`, `<GithubActivity />` (if data), `<Footer />`, `<ChatWidget />`.

### Styling notes

- Use `styled-components`, consistent with other components.
- A single top divider (same border style as `Footer`) separates the activity section from the resume.
- Hidden in print via `@media print { display: none }` — resume-only PDFs aren't affected.

## Configuration

- **None** for the happy path. The owner is derived from `${{ github.repository_owner }}`.
- The fetch script fails loudly if the GraphQL call errors or the user is missing — workflow fails, no bogus data committed.
- If `data/github/activity.json` doesn't exist (fresh fork, before first cron run), the SPA fetch 404s, and the section doesn't render. Acceptable.

## copy-data integration

`web/scripts/copy-data.cjs` currently syncs `data/adapted/`, `data/fitted/`, `data/input/jd/`, `data/input/directives.md`. Add a rule that syncs `data/github/activity.json → web/public/data/github/activity.json` (idempotent copy, skip if absent).

## Testing

- Unit tests for `GithubActivity` component (Vitest + Testing Library) — covers:
  - Renders stats header from fixture data
  - Renders correct number of heatmap cells (7 × weeks.length)
  - Languages bar segments sum to 100%
  - Renders repo links
  - Returns null when `activity.json` fetch fails
- Unit test for the fetch script (Vitest) — stubs `fetch` and asserts GraphQL query + output schema.
- Update `copy-data.test.ts` to cover the new path.
- No E2E addition — the visual correctness of the heatmap is checked by unit test on the DOM (count, colors), not by Playwright screenshots.

## Framework vs derived-deploy considerations

Per `CLAUDE.md`: this is the framework repo — changes flow downstream. The activity feature is:

- **Opt-in by default.** A forker gets the workflow, the component, the wiring — but the first cron run produces `data/github/activity.json` for *their* account automatically, because the workflow uses their `github.repository_owner`.
- **Safe to ignore.** If a forker disables the workflow or it never runs, the file is absent, the SPA skips the section, and nothing breaks.
- **No per-deploy config.** Deliberate — the less config, the less drift between framework and derived deploys.

## Risks

- **GraphQL rate limit.** Daily cron is ~30 queries/month per fork — negligible even on the free tier (5000/hr authenticated).
- **Contribution calendar accuracy.** GraphQL returns public contributions only; private contribs show only if the owner has opted into "include private contributions" on their GH profile. Acceptable — portfolio viewers care about public activity.
- **Language color staleness.** Shipping a small constant map risks drift vs. linguist. Acceptable; colors change rarely. Revisit if someone reports a missing language.

## Scope

One implementation plan. Touches:

- `.github/workflows/activity.yml` (new)
- `scripts/fetch-github-activity.mjs` (new)
- `data/github/.gitkeep` (new — ensure directory exists)
- `web/scripts/copy-data.cjs` (add sync rule)
- `web/src/components/GithubActivity.tsx` (new)
- `web/src/App.tsx` (mount it)
- `web/src/__tests__/GithubActivity.test.tsx` (new)
- `web/src/__tests__/fetch-github-activity.test.ts` (new)
- `web/src/__tests__/copy-data.test.ts` (extend)
- `README.md` (brief mention in Features + in Environment Variables if any token note is needed — likely no addition, since `GITHUB_TOKEN` is built-in)
