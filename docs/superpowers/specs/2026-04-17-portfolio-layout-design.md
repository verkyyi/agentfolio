# Portfolio layout — chat-first, recruiter-facing

**Date:** 2026-04-17
**Status:** design approved, awaiting implementation plan

## Intent

Recompose the AgentFolio homepage into a chat-first experience without sacrificing the recruiter-facing credential it already is. A visitor lands on `/` (or `/notion`, or any slug) and sees:

1. Who this person is in one line (identity card).
2. An inline chat they are invited to use.
3. A one-line "proof of life" activity signal.
4. The full résumé below — same content as today, restyled.
5. Full GitHub activity after the résumé.

The design applies to every public slug. `/dashboard` is unchanged.

## Constraints

- All four elements (résumé, about-me, live activity, chat) already exist as components or data. This is a composition + styling change, not new functionality.
- No new data sources. Identity-card content comes from the existing adapted JSON Resume (`basics.name`, `basics.label`, `basics.summary`, `basics.profiles`). It varies per slug automatically via the existing fit → structurize pipeline.
- No schema changes to adapted JSON.
- No changes to fit / structurize / extract-directives skills or workflows.
- PDF theme unchanged; print must still produce a clean recruiter-ready résumé.

## Architecture

### Routing

Unchanged. `App.tsx` detects `/dashboard` early; every other path goes through `useAdaptation` to resolve the slug. The new layout applies to all slug routes, not to `/dashboard`.

### Page composition (top to bottom)

1. **`IdentityCard`** — new component. Reads from `adapted.basics`.
2. **`ChatPanel`** — replaces the current FAB + popup `ChatWidget`. Full-width inline panel. On `/dashboard`, the existing FAB-style `ChatWidget` is retained (separate component kept unchanged, different audience).
3. **`ActivityStrip`** — new component. Reads `activity.json`. Thin one-line "proof of life" strip.
4. **`ResumeTheme`** — restyled (palette + typography), no structural change.
5. **`GithubActivity`** — restyled (palette), existing heatmap / languages / repos preserved.
6. **`Footer`** — unchanged.

### Components

#### IdentityCard (new)

Inputs: `adapted.basics` (`name`, `label`, `summary`, `profiles[]`, `location`).

Renders:
- small slug label: `~/{handle} · adapted for {slug}` (e.g. `~/verkyyi · adapted for default`)
- name as display-weight headline with a trailing blinking caret `_`
- role/location line: `{label} · {city, region}`
- one-liner: first sentence of `summary`, prefixed with `// ` as a code comment
- profile row: up to 4 links from `profiles[]` plus `email` if present. Each link underlined with a dashed border-bottom.

Missing-field behavior:
- No `label` → skip role line.
- No `summary` → skip one-liner.
- No `profiles` and no `email` → skip profile row (do not render an empty container).

#### ChatPanel (replaces ChatWidget for slug routes)

Inputs: `slug`, `target`, optional `suggestions: string[]`. `VITE_CHAT_PROXY_URL` gate unchanged.

Keeps from current `ChatWidget`:
- SSE parsing and streaming append.
- `sessionStorage.agentfolio.chat.{slug}` persistence.
- `AbortController` cleanup on unmount.
- Error state behavior (inline error row, input re-enables).

Changes from current `ChatWidget`:
- **Inline, not FAB.** Renders as a full-width panel in the page flow, not a floating button.
- **Greeting + suggestion chips.** 3 clickable suggestion chips. Clicking a chip prefills the input but does not auto-submit — the user can edit before pressing enter. Source: `fit-summary.changes[0..2]` if the fitted markdown has a summary comment; otherwise a static seed (`"Walk me through the résumé"`, `"Why is this a fit?"`, `"What's not on the résumé?"`).
- **Offline state.** When `VITE_CHAT_PROXY_URL` is unset, renders a disabled panel with the text "Chat is offline — reach out via email or LinkedIn" plus the identity-card profile links. (Current `ChatWidget` returns `null`; leaving a hole in the new layout is unacceptable.)
- **Reset is an inline "clear conversation" link** in the top-right of the panel, rendered only when `messages.length > 0`. No close button — the panel is always visible.
- **Max-height ~560px**, internal scroll.

Retained tests from `ChatWidget` are ported to `ChatPanel`; new tests cover the offline state and chip prefill.

#### ActivityStrip (new)

Inputs: `activity: ActivityData | null` (same type as `GithubActivity`).

Renders a single horizontal strip: total 30-day contribution count, top 3 languages with colored dots, and a 14-bar sparkline derived from the most recent 14 days of `contributions.weeks` (last two weeks, flattened). Clicking the "jump to full activity" hint smooth-scrolls to `#activity` (the full `GithubActivity` section).

When `activity` is `null`, renders nothing (no placeholder).

#### ResumeTheme (modified)

Theme tokens adopted from CSS variables set at the `App` root. No structural change to what gets rendered. `ResumeTheme` currently uses a 900px outer and 750px inner column; both are harmonized to 760px so the résumé column aligns vertically with the identity card, chat panel, and activity strip above it.

#### GithubActivity (modified)

Wrapper restyled for the dark theme. The current `Wrapper` uses `border-top: 1px solid #e5e7eb` and Inter font — these move to CSS variables so the section blends into the new palette. The heatmap keeps GitHub's native green bucket colors; they look correct on both light and dark backgrounds and users recognize them.

Adds an `id="activity"` anchor so `ActivityStrip` can scroll to it.

### Data flow

- `App` fetches `adapted` (via `useAdaptation`) and `activity.json` (currently only used by `GithubActivity`; now shared with `ActivityStrip`). Both are passed down as props. No duplicate fetches.
- `App` also continues to fetch `fit-summary` from `data/fitted/{slug}.md` for `target` and for the new chip suggestions.
- Chat target / slug logic continues to work as today.

## Visual design

### Palette (CSS variables at `:root`)

- `--bg: #0d1117`
- `--surface: #161b22`
- `--border: #30363d`
- `--border-soft: #21262d`
- `--text: #e6edf3`
- `--text-muted: #7d8590`
- `--text-dim: #6e7681`
- `--accent-green: #7ee787` — prompts, carets, connection status
- `--accent-blue: #79c0ff` — links
- `--accent-teal: #4ec9b0` — secondary status

Heatmap bucket colors in `GithubActivity` remain unchanged — they are GitHub-native and readable on the dark background.

### Typography

- Family: `'JetBrains Mono', monospace` for all text. One family, three weights (400/500/700). No serif or sans fallback beyond system monospace.
- Sizes (desktop):
  - Display headline: 34px, line-height 1.05, letter-spacing `-0.01em`, weight 700.
  - Body: 15px, line-height 1.55.
  - Secondary / meta: 13px, `--text-muted`.
  - Label (uppercase slug-path labels): 10px, letter-spacing `0.12em`, `--text-muted`.

### Spatial composition

- Centered column, `max-width: 760px`, side padding 32px desktop / 20px mobile.
- Identity card: 48px top gutter, 28px bottom padding with a bottom border.
- Chat panel: `min-height: 60vh` on desktop so it dominates the first fold. `min-height: 360px` on mobile.
- Activity strip: 22px gap from chat, ~36px tall.
- Résumé section: 72px gap + top border to signal a new zone.
- Full activity section below résumé, existing spacing rules.

### Motion

- Identity card: staggered fade-in on mount. Sequence: `name → label → oneliner → profiles`, 80ms apart, 280ms each. Implemented with CSS `animation-delay`.
- Blinking caret `▋` or `_` in two places: the name headline, and the empty chat input. CSS `@keyframes blink` at 1.1s, `steps(1)`.
- Chat messages: slide-in 12px `translateY` + fade, 180ms, on append.
- Résumé section: IntersectionObserver fade-in at 0.1 threshold, once per page load.
- No parallax, no scroll-jacking, no custom cursor, no hover motion on activity cells.
- All motion wrapped in `@media (prefers-reduced-motion: reduce) { transition: none !important; animation: none !important; }`.

## Responsive

- `< 640px`: full stack unchanged. Identity card name + label on one visual block; one-liner on the block below. Chat `min-height: 360px`. Activity strip wraps to two rows. Suggestion chips become horizontally scrollable (`overflow-x: auto`, scrollbar hidden).
- `640–900px`: column widens to `min(92vw, 760px)`.
- `> 900px`: fixed 760px column.

## Print

- Hide `ChatPanel` and `ActivityStrip` entirely (`@media print { display: none }`).
- Force light theme on the résumé portion: override CSS variables within `@media print` to dark-on-white equivalents. Résumé must print cleanly in black on white.
- Identity card prints as a plain text header — no caret, no colored links (link text shown, no underline color).
- `GithubActivity` already hides on print (current behavior preserved).

## Fallbacks

- No `adapted` JSON for the slug → existing 404 page (unchanged).
- No `activity.json` → both `ActivityStrip` and `GithubActivity` render nothing. Layout does not reserve space.
- No `basics.label` → identity card skips the role line.
- No `basics.summary` → identity card skips the one-liner.
- No `basics.profiles` and no `email` → profile row hidden.
- `VITE_CHAT_PROXY_URL` unset → chat panel renders offline card with contact links (see `ChatPanel` spec above).
- Streaming error → existing behavior (inline error row, retry).
- Fetch of `fit-summary` fails → chat falls back to static suggestion seed.

## Testing

### Unit (Vitest)

- `IdentityCard.test.tsx`
  - Renders name, label, one-liner, profiles.
  - No label → no role line.
  - No summary → no one-liner.
  - No profiles and no email → no profile row rendered.
- `ActivityStrip.test.tsx`
  - Renders count, top 3 languages, 14-bar sparkline.
  - `null` data → renders nothing.
  - "jump to full activity" click scrolls to `#activity`.
- `ChatPanel.test.tsx`
  - All ported `ChatWidget` tests: send, stream, abort, reset, sessionStorage persistence, error state.
  - No `VITE_CHAT_PROXY_URL` → renders offline card with profile links (not `null`).
  - Clicking a suggestion chip prefills the input.
  - Suggestions come from `fit-summary.changes[0..2]` when available; otherwise static seed.
- `App.test.tsx`
  - For slug `default` and slug `notion`: component tree renders `IdentityCard → ChatPanel → ActivityStrip → ResumeTheme → GithubActivity → Footer` in order.
  - `/dashboard` still routes to `Dashboard`.

### E2E (Playwright)

- Golden path: visit `/`, assert identity card, chat greeting, activity strip, and first résumé experience entry are all visible at their expected positions.
- Chat exchange: mocked proxy, send a message, assistant response streams in.
- `/notion`: same stack renders with Notion-specific content.
- Mobile viewport (375×667): no horizontal overflow; suggestion chips can be scrolled.
- Print media emulation: chat panel and activity strip are not visible; résumé is dark-on-white.

## Out of scope

- No new data files (no `about.md`).
- No schema changes to adapted JSON.
- No changes to `/fit`, `/structurize`, `/extract-directives` skills or workflows.
- No PDF theme changes — PDF stays the current onepage theme.
- No dashboard changes.
- No new CI workflow.
- No light/dark theme toggle — theme is dark; print forces light.

## Behavior changes worth flagging

1. **Chat with no proxy URL now renders** (an offline card with contact links) rather than returning `null`. Previously an AgentFolio deploy without a chat proxy had a hidden chat FAB; in the new layout, the slot is too prominent to leave empty.
2. **Print output shifts.** Today's page prints the résumé with its own light styles and hides the activity section. The new layout prints the same résumé content but requires explicit `@media print` overrides on the identity card + résumé to force dark-on-white to light-on-white.
3. **Column width harmonized to 760px.** `ResumeTheme` currently uses a 900px outer / 750px inner; `GithubActivity` uses 800px. Both collapse to a single 760px column so the résumé aligns vertically with the new identity card / chat / strip stack.
