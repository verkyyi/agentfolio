# Label Cleanup — Design

**Date:** 2026-04-17
**Status:** Approved

## Problem

Internal/adapter metadata leaks into the public portfolio view:

1. `IdentityCard` renders `~/{handle} · adapted for {slug}` — shows `adapted for default` on `/` and `adapted for notion` on `/notion`. The `adapted for X` framing is a dev-facing concept that means nothing to a visitor.
2. `ChatPanel` header renders `· chat · context: {target}` — `target` comes from `fit-summary` in the fitted markdown (`General`, `Notion`, etc). Reads as jargon.
3. `ChatPanel` greeting says `"…I'll keep it relevant to the {target} context."` — same source, same leak.

## Goal

Hide slug/target/"adapted for" wording on the public view on **every** slug (default and tailored alike). Dashboard, `/fit` skill, and `fit-summary` format remain untouched — these are legitimately dev/owner-facing.

## Changes

| Location | Before | After |
|---|---|---|
| `IdentityCard` — top label div | `<div class="idcard-label">~/{handle} · adapted for {slug}</div>` | **Remove the div entirely.** |
| `IdentityCard` — props | `{ basics, slug }` | `{ basics }` |
| `IdentityCard` — helper | `githubHandle()` used for the label | **Remove** (unused once the label is gone) |
| `ChatPanel` header (connected) — left span | `<span>· chat · context: {target}</span>` | **Remove span.** Right side (clear button + `● connected`) remains. |
| `ChatPanel` header (offline) — left span | `<span>· chat</span>` | **Remove span.** `● offline` remains. |
| `ChatPanel` — greeting | `"Hey — I'm an agent that knows this résumé cold. Ask me about the work and I'll keep it relevant to the {target} context."` | `"Hey, I'm an agent that knows {ownerName}. Ask me anything."` |
| `ChatPanel` — props | `{ slug, target, email, profiles }` | `{ slug, ownerName, email, profiles }` |
| `App.tsx` | Fetches `data/fitted/{slug}.md`, parses fit-summary, stores `target` state, gates `<ChatPanel>` on `target !== null` | Drop the fetch effect, state, gate, and `parseFitSummary` import. Pass `ownerName={basics.name}` directly. |
| `ChatPanel` CSS (`.chatp-header`) | Flex row with left span + right group | May need `justify-content: flex-end` since the left span is gone. Verify visually. |

## Test updates

- `web/src/__tests__/IdentityCard.test.tsx` — drop assertions for `adapted for notion` / `adapted for default`. Remove `slug` prop from all renders. Remove/adjust tests that only existed to cover the label.
- `web/src/__tests__/ChatPanel.test.tsx` — replace `target={...}` with `ownerName={...}` in all `render()` calls. Update any assertion that relied on `context: {target}` or greeting wording.
- `web/src/__tests__/App.test.tsx` — remove any fit-summary fetch mocks and `target`-gating assertions. Confirm ChatPanel renders without waiting on fit-summary.

## Out of scope

- `Dashboard` (keeps all adapter-meta — legitimately owner-facing)
- `/fit` skill and the `fit-summary` HTML comment format
- `parseFitSummary` util — still used by `web/scripts/copy-data.cjs` to label dashboard sidebar items
- Any resume content, JSON, or styling beyond the small CSS tweak noted above

## Verification

1. `npx vitest run` — all unit tests pass.
2. `npx tsc --noEmit` — typecheck clean.
3. `npm run dev` and inspect `/` and `/notion`:
   - No `adapted for …` text anywhere on the page.
   - No `context: …` in the chat header.
   - Greeting reads: `"Hey, I'm an agent that knows {name}. Ask me anything."`
   - Chat header right side still shows `● connected` / `● offline` and the "clear conversation" button when there are messages.
