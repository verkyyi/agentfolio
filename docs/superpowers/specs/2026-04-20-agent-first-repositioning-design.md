# Agent-First Repositioning — Design

**Date:** 2026-04-20
**Status:** Draft — awaiting user review

## Goal

Reposition AgentFolio from a resume-and-activity-on-landing portfolio to an agent-first portfolio. The default landing view is a conversational UI. Resume content and GitHub activity are surfaced *inside* the conversation — either as inline typed cards or by opening a side panel for long-form content. There is no "just show me the resume" escape hatch; the repositioning is a deliberate filter.

## Non-goals

- Redesigning the fit / structurize / PDF pipeline.
- Changing the slug-based routing or adapted JSON schema (only `meta.agentfolio` use expands).
- Rewriting `ResumeTheme`, `GithubActivity`, `JdView`, `DirectivesView`, or the `/dashboard` route.
- Building agent interactive blocks (buttons that send follow-up messages). v1 is display-only except for `open-panel`.
- SEO or no-JS fallback for the new landing.

## Locked decisions

| Area | Decision |
|---|---|
| Landing hero | Identity (avatar, name) + one-line tagline + 2×2 suggestion grid from `meta.agentfolio.suggestions` |
| Content surfacing | Hybrid — inline typed cards for short answers; side panel for full resume, full activity, full JD |
| Slug pages | Keep as tailored agent personas. Each slug's adapted JSON + matching JD file prime the system prompt |
| Escape hatch | None — no direct "view resume" link on the landing page |
| Block protocol | Agent emits typed blocks |
| Wire format | Typed SSE frames: `text`, `block`, `done`, `error`. All `data:` payloads are JSON |
| Tool execution | Server-side in the Cloudflare Worker, Anthropic tool-use loop |
| Unknown block types | Silent drop in all environments |
| `open-panel` UX | Visible chip in the message (re-opens the panel when clicked) |
| Hero on scroll | Scrolls away (no sticky header) |
| Rollout | Approach 1 — strip-and-ship first, then protocol + panel, then inline blocks |

## Architecture

Same deployment shape as today: React SPA on GitHub Pages, Cloudflare Worker as chat proxy. Responsibilities shift:

- **Frontend:** renders `Hero → ChatPanel` by default. `ResumeTheme`, `GithubActivity`, `JdView` are rendered only inside a new `SidePanel` opened by `open-panel` blocks.
- **Worker:** runs an Anthropic tool-use loop with four tools. Streams SSE frames in two event types (`text`, `block`) plus terminators (`done`, `error`).
- **Data:** adapted JSON + activity.json + JD files are bundled into the Worker at build time so all tool reads are local. No new storage layer.

### Request flow — "show recent work"

1. Browser posts `{slug, message, history}` to the Worker.
2. Worker loads slug's adapted JSON and JD from its bundle; builds the system prompt (cacheable prefix).
3. Worker calls Claude with the system prompt + 4 tool definitions.
4. Claude streams text, eventually emits a `tool_use` for `get_recent_activity`.
5. Worker executes the tool locally (reads bundled activity.json), returns `tool_result` to Claude, and simultaneously emits an SSE `event: block` frame with the tool's `display_block` payload.
6. Claude continues streaming text after the tool result. Worker continues emitting `text` SSE frames.
7. Worker emits `event: done` when the Claude stream ends.
8. Frontend interleaves text deltas and block frames into the assistant message's `segments[]` in wire order; renders each segment as either prose or a typed React component.

### Components and files

**New files:**
- `web/src/components/Hero.tsx` — avatar, name, tagline, explainer line
- `web/src/components/SidePanel.tsx` + `SidePanel.css` — slide-out panel with close button, backdrop, esc-to-dismiss
- `web/src/components/blocks/index.tsx` — `<Block>` dispatcher, silent drop for unknown types
- `web/src/components/blocks/RepoCard.tsx`
- `web/src/components/blocks/ActivitySummary.tsx`
- `web/src/components/blocks/WorkHighlight.tsx`
- `web/src/components/blocks/OpenPanelChip.tsx`
- `web/src/blocks/types.ts` — shared block schema (imported by frontend; copied into Worker bundle)
- `web/src/hooks/useSidePanel.ts` — panel state + subscription to `open-panel` blocks

**Modified files:**
- `web/src/App.tsx` — strip `ResumeTheme`, `GithubActivity`, `ChatStrip` renders and the `activity` state; render `Hero` + `ChatPanel` + `SidePanel`
- `web/src/components/ChatPanel.tsx` — SSE parser yields tagged frames; message model becomes `segments[]`; render interleaves text and blocks
- `worker/` (chat proxy) — add Anthropic tool-use loop, tool handlers, SSE event-typed emission, bundle activity.json + JDs
- `web/scripts/copy-data.cjs` — no change needed for the frontend (it already copies `data/input/jd/` to `public/`); the Worker build step gets its own data bundling

**Deleted files (no backwards-compat shims):**
- `web/src/components/ChatStrip.tsx` + `ChatStrip.css`
- `web/src/components/ActivityStrip.tsx` + `ActivityStrip.css`

**Kept untouched:** `ResumeTheme`, `GithubActivity`, `JdView`, `DirectivesView`, `Dashboard`, `DashboardSidebar`, `FittedPreview`, `FittedDiff`, all skills, all workflows.

## Landing page

```
┌─────────────────────────────────────┐
│         [avatar] Verky Yi           │
│   Product engineer. This page is    │  ← Hero
│   an agent — ask it anything.       │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Ask about experience, roles…  │  │  ← ChatPanel input
│  └───────────────────────────────┘  │
│  [roles?] [recent work?]            │  ← 2×2 suggestions
│  [AI experience?] [resume?]         │
│                                     │
│  (chat messages stream below)       │
└─────────────────────────────────────┘
              Footer
```

The 2×2 suggestions grid is populated from `meta.agentfolio.suggestions` in the slug's adapted JSON. If fewer than four suggestions are present, the grid collapses rows (1×1, 2×1, 2×2 as the count grows). No new data source.

The hero scrolls away with the rest of the page. No sticky header.

## Side panel

`SidePanel` is a right-anchored slide-out overlay (full height, ~480px wide on desktop, full-width on narrow viewports). Closed by default. Opens when `useSidePanel` receives an `open-panel` block.

Panel contents (one active at a time):
- `resume` — renders existing `<ResumeTheme>` with the current adapted JSON
- `activity` — renders existing `<GithubActivity>` with `activity.json` (fetched client-side on first open and cached)
- `jd` — renders existing `<JdView>` for the slug's JD

Close triggers: close button (top-right), click on backdrop, `Escape` key. When closed, the `open-panel` chip in the chat message remains clickable to re-open.

## SSE protocol

All frames use named `event:` types. All `data:` payloads are JSON.

```
event: text
data: {"delta":"Last month I shipped "}

event: block
data: {"id":"blk_01","type":"activity-summary","data":{"window":"30d","totalCommits":42,"topRepos":[{"name":"AgentFolio","commits":27}],"sparkline":[3,7,5,10,8,12,9]}}

event: text
data: {"delta":". Want the full history?"}

event: done
data: {}
```

**Frame types:**
- `text`: `{delta: string}` — chunk of assistant prose; append to current message's trailing text segment (or start a new text segment if last segment was a block)
- `block`: `{id, type, data}` — typed block frame; append as a new block segment
- `done`: `{}` — stream terminator
- `error`: `{message: string, recoverable: boolean}` — surface as an inline error bubble; stop streaming

**Frontend `parseSse`** yields tagged values:
```ts
type SseEvent =
  | { kind: "text"; delta: string }
  | { kind: "block"; block: BlockFrame }
  | { kind: "done" }
  | { kind: "error"; message: string };
```

## Message data model

```ts
type Segment =
  | { kind: "text"; text: string }
  | { kind: "block"; block: BlockFrame };

type Msg = {
  role: "user" | "assistant";
  segments: Segment[];
};
```

Rendering walks `segments` in order. Text segments render as markdown; block segments render via `<Block>`. User messages have a single text segment. Ordering is preserved from the wire; no reordering client-side.

This replaces the current `{role, content: string}` shape. Acceptable breaking change — chats are per-session, not persisted.

## Block catalog (v1)

Shared types live in `web/src/blocks/types.ts` and are mirrored into the Worker bundle at build time.

```ts
type BlockFrame =
  | { id: string; type: "repo-card";        data: RepoCardData }
  | { id: string; type: "activity-summary"; data: ActivitySummaryData }
  | { id: string; type: "work-highlight";   data: WorkHighlightData }
  | { id: string; type: "open-panel";       data: OpenPanelData };

type RepoCardData = {
  name: string;
  description: string;
  commits?: number;
  sparkline?: number[];
  url: string;
  primaryLang?: string;
};

type ActivitySummaryData = {
  window: "30d" | "90d";
  totalCommits: number;
  topRepos: Array<{ name: string; commits: number }>;
  sparkline: number[];
};

type WorkHighlightData = {
  company: string;
  role: string;
  period: string;
  bullets: string[]; // 2–4 items, already filtered by Claude for the question
};

type OpenPanelData = {
  panel: "resume" | "activity" | "jd";
};
```

**Renderer contract:** each block renderer is a pure component `({block}) => ReactNode`. The `<Block>` dispatcher switches on `block.type`. Unknown types render `null` (silent drop) in all environments.

**`open-panel` renders a visible chip** (`<OpenPanelChip>`) as its inline element — a small clickable pill with the panel label (e.g., "📄 Resume"). Clicking the chip re-opens the panel. Side effect on arrival: `useSidePanel` observes `open-panel` blocks and opens the panel automatically.

**Out of scope for v1:** `skill-badge`, `jd-match-score`, `pdf-download`. PDF downloads are surfaced as markdown links in text for v1.

## Server-side tools

Four tools, all resolved server-side in the Worker. Each tool handler returns `{result, display_block?}`. When `display_block` is present, the Worker emits an SSE `block` frame at the wire position of the tool's result in Claude's streamed response.

### `get_recent_activity`
- Input: `{ window?: "30d" | "90d" }` (default `"30d"`)
- Reads bundled `activity.json`, aggregates top repos and sparkline for the window.
- Returns `{result: ActivitySummaryData, display_block: {type: "activity-summary", data: ...}}`.

### `get_repo_highlight`
- Input: `{ repo: string }`
- Looks up the repo in `activity.json`.
- Returns `{result: RepoCardData, display_block: {type: "repo-card", data: ...}}`.

### `get_work_highlight`
- Input: `{ company: string, focus: string }` — `focus` is a free-text question hint
- Reads slug's adapted JSON, finds the matching `work[]` entry, returns role, period, bullets.
- Bullet filtering for relevance is Claude's responsibility in the text response, not this tool's.
- Returns `{result: {company, role, period, bullets}, display_block: {type: "work-highlight", data: ...}}`.

### `open_panel`
- Input: `{ panel: "resume" | "activity" | "jd" }`
- Server no-op; returns `{ok: true}`.
- `display_block: {type: "open-panel", data: {panel}}`.
- System prompt constrains Claude to call this only on explicit visitor request.

## System prompt

Built per request from the slug's adapted JSON:

1. **Identity** — `basics.name`, tagline (first sentence of `basics.summary`), full `basics.summary`.
2. **Persona** — "You are an agent representing {name}. Answer visitor questions about their background, experience, and fit for roles."
3. **JD context** (if slug has one) — contents of `data/input/jd/{slug}.md`, prefixed with "The visitor likely arrived here because they care about fit for this role:".
4. **Tool guidance** — "Prefer calling tools over paraphrasing from memory. Use `open_panel` only when the visitor explicitly asks for the full resume, JD, or activity view — not proactively."
5. **Suggestion examples** — `meta.agentfolio.suggestions` as sample questions the agent might expect.

The full system prompt + tool definitions are marked `cache_control: ephemeral` for Anthropic prompt caching. Per-request variable part (user message + history) sits after the cache boundary.

## Slug persona flow

`/anthropic-fde-nyc` → `useAdaptation` fetches `data/adapted/anthropic-fde-nyc.json` → `Hero` + `ChatPanel` render. Chat requests include `slug`; Worker loads `anthropic-fde-nyc.json` and `anthropic-fde-nyc.md` JD from its bundle; builds system prompt.

Default slug `/` has no JD; system prompt omits the JD section.

## Data bundling

- Frontend: `copy-data.cjs` already mirrors `data/adapted/`, `data/fitted/`, `data/input/jd/`, `data/input/directives.md` into `web/public/`. No change.
- Worker: new build step imports `data/adapted/*.json`, `data/input/jd/*.md`, and `data/github/activity.json` into the Worker bundle. Rebuild + redeploy the Worker whenever source data changes (mirrors the existing deploy trigger pattern).

## Error handling

- **Worker-side tool error** — tool handler throws → Worker returns `tool_result` with `is_error: true` to Claude, lets Claude acknowledge in prose. No `block` frame emitted.
- **Claude stream error** — Worker emits `event: error` SSE frame with message + `recoverable` flag; closes stream.
- **Frontend SSE parse error** — log, stop appending; surface "Something went wrong" bubble; offer retry.
- **Unknown block type** — silent drop. No user-facing signal.
- **Panel open with missing data** — if `open-panel` arrives for `jd` but the slug has no JD, panel renders a small placeholder ("No JD for this slug"). No error bubble.

## Testing

- **SSE parser (Vitest):** fixture streams with interleaved text + block + done frames → correct tagged output. Cover partial-chunk reassembly across reads.
- **Message segment model (Vitest):** segment ordering preserved; text coalesced into single segment; blocks open a new segment.
- **Block renderers (Vitest):** snapshot each type with a sample payload; `<Block>` dispatcher returns null for unknown types.
- **ChatPanel integration (Vitest + mocked fetch):** mock Worker SSE response with interleaved events → assert rendered message contains text and block components in wire order.
- **SidePanel (Vitest):** `open-panel` block opens panel; chip click re-opens; Escape and backdrop close.
- **Worker tool handlers (Vitest, Worker-scoped):** each tool returns correct `{result, display_block}` for sample adapted JSON + sample activity.json.
- **E2E (Playwright):** load `/`, click a suggestion, assert streaming text appears; mocked-worker E2E for block rendering flow. Skip live-LLM E2E.

## Rollout

**Phase 1 — Strip and ship** (one PR, ~half a day)
- New `Hero`. `App.tsx` simplified. Delete `ChatStrip`, `ActivityStrip`.
- No protocol changes; text-only chat still works.
- User-visible: agent-first page, plain text answers.

**Phase 2 — Protocol and side panel** (one PR, ~1 day)
- SSE event types: `text`, `block`, `done`, `error`.
- Frontend message model → `segments[]`; `parseSse` returns tagged frames.
- `SidePanel` + `useSidePanel` + `open_panel` tool + `open-panel` block + `OpenPanelChip`.
- User-visible: "show me your resume" → panel slides out.

**Phase 3 — Inline blocks** (one PR, ~1 day)
- `get_recent_activity`, `get_repo_highlight`, `get_work_highlight` tools.
- `RepoCard`, `ActivitySummary`, `WorkHighlight` renderers.
- User-visible: rich cards inline for recent-work and experience questions.

Each phase is independently shippable and reversible.

## Risks

- **SSE frame ordering** — Claude's tool-use loop interleaves `text` and `tool_use` content blocks. Worker must emit SSE frames in wire order from Claude's stream, not re-order. Test with fixtures that mix tool calls between text deltas.
- **Prompt cache invalidation** — JD edits break the cache for that slug's system prompt. Acceptable; JDs are stable per slug.
- **Agent over-using `open_panel`** — Claude could call `open_panel` when a short prose answer would do. Mitigated by explicit system-prompt guidance; revisit if it happens in practice.
- **Deliberate filter for non-engagers** — a recruiter scanning 50 profiles who doesn't chat will leave. Accepted consciously.
