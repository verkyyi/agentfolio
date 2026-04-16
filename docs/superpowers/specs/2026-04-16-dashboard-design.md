# Dashboard — Design Spec

> Readonly owner-facing dashboard at `/dashboard` for browsing fitted resumes and viewing inline diffs against the base.

## Routing

- `/dashboard` is a reserved path recognized in `App.tsx` before slug resolution
- Renders the `Dashboard` component instead of `ResumeTheme`
- Not linked from any public resume page — accessed by typing the URL directly

## Layout: Sidebar + Content

- **Left sidebar:** fixed list of all fitted resumes (slugs), highlights the active selection
- **Right main area:** two tabs — **Preview** (rendered markdown) and **Diff** (inline highlights against base)
- First item in the sidebar is selected by default on load

## Components

| Component | Responsibility |
|-----------|---------------|
| `Dashboard.tsx` | Top-level: fetches manifest, manages selected slug and active tab (preview/diff) |
| `DashboardSidebar.tsx` | Renders file list, highlights active slug, calls onSelect callback |
| `FittedPreview.tsx` | Fetches and renders a fitted markdown file using `react-markdown` or `marked` |
| `FittedDiff.tsx` | Fetches both the selected file and `default.md`, computes word-level diff, renders inline highlights |

## Data Flow

1. `copy-data` script is extended to copy `data/fitted/*.md` → `web/public/data/fitted/` and generate `data/fitted/index.json` (array of `{ slug, filename }` objects)
2. `Dashboard` fetches `data/fitted/index.json` on mount to discover available resumes
3. When a slug is selected, `FittedPreview` or `FittedDiff` fetches `data/fitted/{slug}.md`
4. `FittedDiff` also fetches `data/fitted/default.md` as the base for comparison

## Diff Behavior

- **Style:** Inline highlights — the fitted resume is rendered with word-level changes highlighted in place
- **Additions:** Green background highlight on inserted/changed words
- **Deletions:** Red strikethrough on removed words, rendered inline
- **Library:** `diff` package (`diffWords` function) for word-level comparison
- **Base:** Always `default.md`
- **Edge case:** When viewing `default.md` itself, the Diff tab is disabled (nothing to compare)

## Styling

- Dashboard has its own styles, independent of `ResumeTheme`
- Markdown preview area uses clean readable typography
- Sidebar uses a simple file-list pattern with hover/active states

## Edge Cases

- **Empty state:** If `data/fitted/index.json` is empty or missing, show "No fitted resumes. Run `/fit` to generate."
- **Load error:** If a markdown file fails to fetch, show an error message in the content area without crashing the sidebar
- **No default.md:** If `default.md` doesn't exist, disable the Diff tab for all items

## Build Changes

- `copy-data` script: add step to copy `data/fitted/*.md` → `web/public/data/fitted/` and generate `index.json`
- No new dependencies beyond a markdown renderer (`react-markdown` or `marked`) and `diff` package

## New Dependencies

- `react-markdown` — render markdown to React components
- `diff` — word-level text diffing (`diffWords`)

## Out of Scope

- Authentication or access control
- Editing fitted resumes from the dashboard
- Analytics or visitor tracking
- Linking to the dashboard from public pages
