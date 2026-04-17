# LLM Greeting — Design

**Date:** 2026-04-17
**Status:** Approved

## Problem

`ChatPanel` opens with a hardcoded, slug-agnostic greeting and three generic suggestion chips:

- `web/src/components/ChatPanel.tsx:159` — `> Hey, I'm an agent that knows {name}.{tagline ? ' ' + tagline : ''} Ask me anything.`
- `web/src/components/ChatPanel.tsx:16` — `DEFAULT_SUGGESTIONS = ['Walk me through the résumé', 'Why is this a fit?', "What's not on the résumé?"]`

Visitors on `/notion` see the same opener as visitors on `/stripe`. The most visible surface of the portfolio ignores the per-slug adaptation that the rest of the pipeline spent effort producing.

## Goal

Generate a per-slug greeting and three per-slug opener suggestions at build time, baked into `data/adapted/{slug}.json`. Zero runtime LLM cost, zero added latency, consistent across visitors. Hardcoded values stay as fallbacks.

## Architecture

- **Generated in:** `/fit` skill — it already makes one LLM call with the full adaptation context (JD, fitted resume, directives). Greeting + suggestions are one more field in the same output.
- **Stored in:** fit-summary HTML comment in `data/fitted/{slug}.md` (source of truth, human-editable), then copied through to `meta.agentfolio.*` in `data/adapted/{slug}.json` by `/structurize`.
- **Consumed by:** `ChatPanel` via new props forwarded from `App.tsx`.

## Schema

### fit-summary block (source of truth)

```
<!--
fit-summary:
  target: Notion — Software Engineer, Enterprise Data Platform
  changes:
    - ...
  greeting: Hey — I'm an agent that knows Alex. Ask me about the Flink pipeline at Acme, or what drew me to Notion's data platform.
  suggestions:
    - Why Notion?
    - Walk me through the Flink pipeline
    - What's not on the résumé?
-->
```

**Constraints** (enforced by `/fit` prompt): greeting 1–2 sentences, ≤200 chars, first-person (matches the proxy system prompt voice). Exactly 3 suggestions, each ≤40 chars.

### `data/adapted/{slug}.json`

```
"meta": {
  "agentfolio": {
    "greeting": "...",
    "suggestions": ["...", "...", "..."]
  }
}
```

Lives under `meta.*` (JSON Resume's extension namespace). Dashboard-only fields (`target`, `changes`) stay in fit-summary — not copied.

## Changes

| Location | Before | After |
|---|---|---|
| `.claude/skills/fit.md` | Skill emits fit-summary with `target` + `changes` | Also emits `greeting` and `suggestions` with length/voice constraints spelled out. |
| `.claude/skills/structurize.md` | Parses fitted md → writes JSON Resume fields | Also parses `greeting`/`suggestions` from fit-summary; writes `meta.agentfolio.*`. |
| `web/src/utils/parseFitSummary.ts` | Parses `target` + `changes` | Parses `greeting` (string) and `suggestions` (string[]). `FitSummary` gains `greeting?: string; suggestions?: string[]`. |
| `web/src/components/ChatPanel.tsx` | Hardcoded greeting + `DEFAULT_SUGGESTIONS` constant | New props `greeting?: string; suggestions?: string[]`. Render `props.greeting ?? <hardcoded fallback>`. Chips: `(props.suggestions?.length === 3 ? props.suggestions : DEFAULT_SUGGESTIONS)`. |
| `web/src/App.tsx` | Passes `ownerName`, `tagline`, `email`, `profiles` | Also reads `adapted.meta?.agentfolio` and passes `greeting` + `suggestions`. |
| Existing fitted files (`default.md`, `notion.md`) | Fit-summary has `target`+`changes` only | Rerun `/fit` (or hand-edit fit-summary + rerun `/structurize`) to populate new fields. |

## Fallbacks

- `meta.agentfolio.greeting` missing/empty → hardcoded line: `Hey, I'm an agent that knows {ownerName}.{tagline ? ' ' + tagline : ''} Ask me anything.`
- `meta.agentfolio.suggestions` missing, not an array, or not exactly 3 items → `DEFAULT_SUGGESTIONS`.
- Proxy offline (no `VITE_CHAT_PROXY_URL`) → offline card unchanged; greeting never rendered.

## Test updates

- `web/src/utils/parseFitSummary.ts` unit tests (existing file or sibling): parse `greeting` + `suggestions`; omitted fields; wrong suggestion count; backward-compat with legacy fit-summary blocks.
- `web/src/__tests__/ChatPanel.test.tsx`: with `greeting` prop → rendered in place of fallback; with `suggestions` prop → three chips match props; omit both → fallback greeting + `DEFAULT_SUGGESTIONS`.
- Skills aren't unit-tested. Manual end-to-end: rerun `/fit` on one slug, verify fit-summary + JSON.

## Out of scope

- Runtime/per-visit LLM greeting (explicitly rejected — build-time only).
- Dashboard changes — still uses `target`/`changes` only.
- Suggestion chip behavior — still fills the input on click, unchanged.
- Proxy (`/chat`, rate limits, system prompt) — unchanged.

## Verification

1. `npx vitest run` — all unit tests pass.
2. `npx tsc --noEmit` — typecheck clean.
3. Rerun `/fit` on `notion`, then `/structurize`. Inspect `data/fitted/notion.md` fit-summary for the two new fields and `data/adapted/notion.json` for `meta.agentfolio.{greeting,suggestions}`.
4. `npm run dev`, load `/notion`: greeting line and three chips match the JSON content; load `/`: same pattern with default-slug content.
5. Locally delete `meta.agentfolio` from one `adapted/*.json` → ChatPanel renders hardcoded fallback and `DEFAULT_SUGGESTIONS`.
