# Activity Layout Refactor

Reorganize the GitHub activity surfaces: the detailed panel below the resume is over-decorated and visually competes with the heatmap in the compact strip. Collapse to one canonical representation per surface.

## Current layout

```
IdentityCard
ChatPanel
ActivityStrip      ← compact: live bars (14d) · 30d count · top-3 langs · "jump" button
ResumeTheme
GithubActivity     ← detailed: header line · heatmap (30d-scoped) · lang bar · lang legend · repos · footnote
```

## Target layout

```
IdentityCard
ChatPanel
ResumeTheme
GithubActivity
 ├─ ActivityStrip  ← moved in; no "jump" button (we're already here)
 ├─ RepoList
 └─ Footnote
```

The strip becomes the header/summary of the detailed panel. The heatmap, header line, language bar, and language legend are removed from `GithubActivity`. No compact strip above the resume anymore.

## Data model change

`ActivityStrip` shows top languages. Today those come from `data.languages`, which `buildActivity` aggregates across **all** public repos (all-time, by bytes). After this refactor the strip is the only consumer of `languages` and the surrounding context is 30-day-oriented (the 30d contribution count sits right next to it). Rescope `languages` to repos pushed in the last 30 days:

- Add `pushedAt` to the main `repositories` GraphQL query in `scripts/fetch-github-activity.mjs`.
- In `buildActivity`, filter repos by `pushedAt >= now - 30d` before aggregating language bytes.
- Total percentages still sum to 100 within the 30-day window. If no repos pushed in the window, `languages: []` (strip renders zero lang chips — acceptable degenerate case).

The `contributions30d` and `contributionsLastYear` stats are unchanged. The `contributions.weeks` grid is unchanged (still emitted; currently no consumer after this refactor, but retaining it keeps the data file stable for future use and avoids touching every test).

## Code changes

**`web/src/components/GithubActivity.tsx`**
- Remove `Header`, `HeatmapWrap`, `LangBar`, `LangLegend` styled components and their usages.
- Remove `Heatmap` function, `HEATMAP_BUCKETS`, `MONTH_NAMES`, and the exported `scopeToLast30Days` helper.
- Import `ActivityStrip`; render it as the first child inside `Wrapper`.
- Keep `Wrapper` (outer section with `id="activity"`), `RepoList`, `Footnote`, `formatRelative`.

**`web/src/components/ActivityStrip.tsx`**
- Remove the "↓ jump to full activity" button and the `handleJump` handler.
- Remove `margin-left: auto` orphaned rule from `.strip-jump` in `ActivityStrip.css`.

**`web/src/App.tsx`**
- Remove `<ActivityStrip data={activity} />` between `ChatPanel` and `ResumeTheme`.
- Keep the `activity` fetch and the `<GithubActivity data={activity} />` render.

**`scripts/fetch-github-activity.mjs`**
- Add `pushedAt` to the `repositories` query.
- Filter repos by `pushedAt >= now - 30d` before the language-bytes loop.

## Tests

- `web/src/__tests__/GithubActivity.test.tsx`: drop assertions about header text, heatmap cells, language bar, language legend. Add one assertion that the strip renders inside the activity section (by its "live" label).
- `web/src/__tests__/ActivityStrip.test.tsx`: drop the "jump" button assertion.
- `web/src/__tests__/App.test.tsx`: drop any assertion that the strip renders above `ResumeTheme`; if the test covers layout order, update it to expect the strip only inside the activity section.
- `web/src/__tests__/activityMetrics.test.ts`: no change (the utilities it tests are still used by the strip).
- `web/src/__tests__/fetch-github-activity.test.ts`: add a case covering the 30-day repo filter for languages (repo pushed 45d ago is excluded from language totals).
- `scopeToLast30Days` and its test disappear with the heatmap.

## Out of scope

- Visual redesign of the repo list or the strip itself.
- Changing the strip's 14-day spark bars (still 14d; unrelated to the language-stat scoping).
- Removing `contributions.weeks` from the data file.
