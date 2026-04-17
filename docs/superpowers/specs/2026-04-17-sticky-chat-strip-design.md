# Sticky Chat Strip — Design

**Date:** 2026-04-17
**Status:** Approved

## Problem

On a portfolio page, `<ChatPanel>` sits between `<IdentityCard>` and the résumé
body. Once a visitor scrolls down to read work history or GitHub activity, the
chat disappears off-screen and there is no way to return to it without
scrolling back up. For an agentic portfolio where the chat *is* the pitch,
that's wasted surface area.

## Goal

When the chat scrolls out of view, pin a compact, ambient strip to the top of
the viewport. The strip:

1. Signals the agent is still there (nameplate + status dot).
2. Surfaces LLM-generated question hints so the visitor sees what to ask.
3. Returns the visitor to the full chat on tap.

Quality bar: **ambient, not Clippy.** The strip must never feel like a
pop-up or a nag. If the LLM can't produce confident hints, the strip stays
silent except for the nameplate.

## Architecture

Two new surfaces: a React component `<ChatStrip>` (sibling to `<ChatPanel>`
inside `<ResumePage>`) and a new `/hints` route on the Cloudflare proxy. The
strip owns its own visibility state via `IntersectionObserver`; ChatPanel
exposes a bottom-edge sentinel ref and its live `isStreaming` flag through
lift-up props on `App.tsx`. The strip pulses, drips hints, and re-uses the
existing CSS design tokens (`--accent-green`, `--border`, etc.).

No external deps added. IntersectionObserver is mocked in the existing test
setup; we extend that mock rather than adding a library.

## Components

### `web/src/components/ChatStrip.tsx` (new)

```ts
interface ChatStripProps {
  slug: string;
  ownerName: string;
  proxyUrl: string;              // if undefined, caller skips rendering the strip
  isStreaming: boolean;
  liveTail: string;              // last ~60 chars of the streaming response, '' when idle
  sentinelRef: RefObject<Element>;
  onJump: () => void;
}
```

Internal state:

- `pinned: boolean` — flipped by the IntersectionObserver when `sentinelRef`
  leaves the viewport upward.
- `hints: string[]` — current batch. Empty means "no confident hints."
- `currentHint: string` — which hint is being dripped.
- `dripText: string` — current prefix shown on screen.
- `phase: 'typing' | 'holding' | 'erasing'` — state machine driving the drip.
- `hintsDisabled: boolean` — set `true` after first proxy 404 or network error;
  kills hint fetches for the rest of the session.

Render:

- `<button type="button" aria-label="Return to chat">` rendered at
  `position: fixed; top: 0` with `display: none` when not pinned.
- Structure: prompt `>`, owner name, status dot, hint slot, "tap to chat ↑".
- When `isStreaming === true`, hint slot is replaced with `liveTail` and the
  dot pulses. When streaming ends, the drip resumes from the current hint.
- When `hints` is empty *and* not streaming, hint slot renders nothing (no
  filler copy).

### `web/src/components/ChatStrip.css` (new)

Follows ChatPanel conventions:

- `.chat-strip` — `position: fixed; top: 0; left: 0; right: 0;` with
  `background: var(--surface);`, a 1px bottom border, and `z-index: 40`
  (above resume content, below modals). Slide-in animation of 200ms
  (opacity + translateY(-8px)). `prefers-reduced-motion` is honored by the
  global CSS reset.
- `.chat-strip__dot` — 8×8 green dot; `.chat-strip__dot--pulse` applies the
  `chat-strip-pulse` keyframes during streaming.
- `.chat-strip__hint` — `color: var(--text-muted); font-size: 12px;` monospace.
  Caret `::after` on `.chat-strip__hint--typing`.
- Hidden on print and when `.chat-strip[hidden]`.

### `web/src/components/ChatPanel.tsx` (edited)

Minimal invasion:

1. Forward-ref a 1px sentinel `<div>` inside the panel's bottom row so
   ChatStrip can observe it.
2. Call a new optional prop `onStateChange({ isStreaming, liveTail })`
   whenever those values change. Implemented as a `useEffect` that watches
   the existing `status` and the current assistant message content.
3. Expose an imperative handle via `forwardRef` exposing `jumpTo()` which
   `scrollIntoView({ behavior: 'smooth', block: 'start' })` and focuses
   the input.

### `web/src/App.tsx` (edited)

```ts
const chatRef = useRef<ChatPanelHandle>(null);
const sentinelRef = useRef<HTMLDivElement>(null);
const [chatState, setChatState] = useState({ isStreaming: false, liveTail: '' });

// after <ChatPanel ... ref={chatRef} sentinelRef={sentinelRef}
//                      onStateChange={setChatState} />
<ChatStrip
  slug={activeSlug}
  ownerName={basics.name}
  proxyUrl={proxyUrl}
  isStreaming={chatState.isStreaming}
  liveTail={chatState.liveTail}
  sentinelRef={sentinelRef}
  onJump={() => chatRef.current?.jumpTo()}
/>
```

Where `proxyUrl = import.meta.env.VITE_CHAT_PROXY_URL`; if it is unset, the
strip is not rendered at all (same condition under which the chat goes
offline).

### `proxy/src/worker.ts` (edited)

Add a `/hints` route alongside `/chat`:

```ts
if (url.pathname === '/hints') {
  // POST only, CORS like /chat, own rate-limit bucket
  // body: { slug: string, recentMessages?: Msg[] }
  // → 200 { hints: string[] } (≤ 5 items, each ≤ 80 chars)
  //   400 invalid_body
  //   404 unknown_slug
  //   429 rate_limited
  //   502 upstream_error
}
```

Validation: `recentMessages` optional; if present, same per-message rules
as `/chat` but hard-capped at 4 turns.

Rate-limit: reuse the existing KV bucket but under a distinct key prefix
`hints:` so chat and hints don't starve each other. Budget is the same
per-IP window (the existing `checkRateLimit` accepts an optional prefix).

### `proxy/src/hints.ts` (new)

```ts
export async function callHints(inputs: HintsInputs): Promise<string[]>;
```

Builds a hint-focused system prompt (see below), calls Anthropic with
`stream: false`, parses a JSON array from the response, filters to strings
≤ 80 chars, caps at 5.

System prompt (condensed):

```
You are generating 3–5 short question prompts a recruiter might ask the
agent version of <name>. Each prompt must be specific to this résumé and
target role; ≤ 80 chars; no generic openers. Return ONLY a JSON array of
strings. If you cannot produce ≥ 3 specific questions with high confidence,
return [].
```

The `--- RESUME / DIRECTIVES / JOB DESCRIPTION ---` blocks are reused so
the cache key stays aligned with `/chat` (both hit the same
`system.cache_control: ephemeral` prefix when `name`, `target`, and
context bodies match).

### `proxy/src/rateLimit.ts` (edited)

Accept an optional `prefix` argument so the hint bucket is a separate KV
namespace entry. Default is empty string (existing chat behavior).

## Data flow

```
Visitor scrolls                         ChatStrip
      ↓                                     │
IntersectionObserver fires                  │
      ↓                                     │
pinned = true  ────────────────────────────┐│
                                           ▼▼
                         debounce 400ms → fetch POST /hints
                                           │
                                           ▼
                    proxy calls Anthropic, returns { hints }
                                           │
                                           ▼
                  ChatStrip drips hints one-by-one (typewriter)
                         ↑                 │
                         │    stream done  │
                         │                 ▼
         ChatPanel isStreaming=true   hint batch spent
                         │                 │
                         ▼                 ▼
               liveTail replaces     refetch if pinned
               hint slot; dot          (invalidated when
               pulses                  user sends a message)
```

Fetch triggers:

1. **First pin** — debounced 400ms after `pinned` flips to `true`. If the
   observer flips back before the debounce fires, cancel.
2. **Batch spent** — after the last hint finishes erasing, if still pinned
   and not disabled, fetch another batch. Queue one at a time.
3. **Visitor sends a chat message** — invalidate `hints` state to `[]` so
   the next refetch includes `recentMessages` (last 4 turns).

Disable conditions:

- `proxyUrl` unset → strip never renders (no feature).
- First fetch returns 404 → set `hintsDisabled = true` for the session.
  Strip still pins, shows just the nameplate + pulse. This is the
  "deployed proxy doesn't implement /hints yet" path.
- Any network error (including abort) → treat the batch as empty but
  do not disable; try again after a 60s cooldown.

## Visibility mechanics

- Sentinel is a 1px `<div aria-hidden="true">` placed as the final child of
  `.chatp-messages`' parent (so observing its position reflects the chat's
  bottom edge).
- IntersectionObserver options: `rootMargin: '0px'`, `threshold: 0`. The
  `entry.boundingClientRect.top < 0 && !entry.isIntersecting` condition
  means the sentinel has scrolled above the viewport top — that's when we
  pin.
- On unpin (scrolling back up), the strip animates out. The drip state
  machine pauses (timers cleared); the batch and the current progress
  within the current hint are preserved so the next pin resumes exactly
  where it left off. Same behavior for `isStreaming` transitions
  mid-drip.

## Interaction

- **Click / tap** on strip body → `onJump()` → ChatPanel scrolls into
  view, input refocuses. Idempotent: if chat is already on-screen,
  scrolling is a no-op and focus still lands on the input.
  IntersectionObserver will naturally unpin the strip as the sentinel
  re-enters the viewport.
- **Focus** — tab-reachable; same behavior on `Enter` / `Space` thanks
  to the native `<button>`.
- **Hover** — subtle underline on the "tap to chat ↑" cue; does not
  pause the drip (drift-free UX).
- **Reduced motion** — global CSS disables the slide-in and the drip
  animations. Hints are shown in full text with a 4s cross-fade instead.
  The `prefers-reduced-motion` media query already neuters
  `animation-duration` globally, so ChatStrip listens to the media query
  itself to switch off the char-by-char state machine.

## Edge cases

- **Offline chat** (no `proxyUrl`) — `<ChatStrip>` not mounted.
- **Dashboard route** — App.tsx short-circuits before ResumePage; strip
  never mounts.
- **Short pages** where chat doesn't leave the viewport — sentinel never
  crosses the threshold, no fetches, no visual artifact.
- **Streaming when the strip pins** — `liveTail` takes over the hint slot
  immediately; any in-progress drip is paused (not erased) until stream
  ends.
- **Session clear** — `ChatPanel.reset` already resets messages;
  `onStateChange` will emit `isStreaming:false, liveTail:''`. Hints batch
  is invalidated the same way as "user sends a message" so a fresh batch
  gets fetched after the next idle tick.
- **Multiple fast scrolls** — the 400ms debounce plus the
  `AbortController` on the fetch prevents overlapping requests.
- **Very long hints from a misbehaving LLM** — client enforces ≤ 80 chars
  (slice on receive) as a second line of defense; proxy does it too.

## Security

- CORS identical to `/chat` — same allowlist, same preflight handling.
- Rate-limit is per-IP via the same KV. A separate prefix (`hints:`)
  ensures hint traffic can't exhaust chat budget or vice versa.
- No new secrets. Reuses `ANTHROPIC_API_KEY`.
- The prompt repeats the same refusal rules so a malicious slug injecting
  instructions into the fitted résumé can't turn hints into a vector.

## Testing

### Vitest unit — `web/src/__tests__/ChatStrip.test.tsx`

- Renders nothing when `pinned === false`.
- Pins and renders nameplate when the mocked IntersectionObserver reports
  `isIntersecting: false` with `top < 0`.
- Debounces first fetch by 400ms.
- Fetches `/hints` with body `{ slug, recentMessages? }` and drips the
  first hint.
- When `isStreaming` flips true, hint slot swaps to `liveTail`; when it
  flips false, drip resumes.
- On 404, sets `hintsDisabled` and never fetches again.
- On network error, retries after cooldown (fast-forward timers).
- Empty `hints: []` response renders only the nameplate, no filler.
- Respects `prefers-reduced-motion` by skipping the drip state machine
  (shows full text cross-fade).

### Vitest proxy unit — `proxy/src/hints.test.ts`

- Builds the hint system prompt with correct `name`, `target`,
  fitted/directives/jd.
- Parses a valid JSON array; returns it capped to 5 items, ≤ 80 chars
  each.
- Returns `[]` for malformed JSON.
- Returns `[]` on upstream non-200.

### Vitest proxy route — `proxy/src/worker.test.ts` (extended)

- `POST /hints` with valid body returns 200 `{ hints }`.
- `POST /hints` with bad body returns 400.
- `POST /hints` with unknown slug returns 404.
- Rate-limit bucket is isolated: exhausting `/chat` doesn't block `/hints`.

### Playwright E2E — `web/e2e/chat-strip.spec.ts`

- Load the homepage with `VITE_CHAT_PROXY_URL` mocked.
- Scroll past the chat; assert `.chat-strip` becomes visible.
- Wait for fetch `/hints` and assert the dripped first hint appears.
- Click the strip; assert chat input is focused.
- Capture PNG screenshots of the three key states
  (`idle-empty`, `idle-with-hints`, `streaming`) for the PR comment.

## Non-goals

- Expanding the strip into a mini chat (input + send inline). Explicitly
  declined during brainstorming — Option A, not Option B.
- Adapting hints to scroll position within the résumé (Option C from
  brainstorming). Hints are page-level, not section-level.
- Persisting hints across pageviews. Fresh session = fresh hints.
- Badge with message count. Not needed given the nameplate + pulse +
  hint surface.

## Rollout

1. Ship the client first behind the existing `proxyUrl` guard. With no
   matching proxy route, the first `/hints` fetch 404s and the strip
   disables gracefully — only the nameplate + pulse remain. Safe to ship
   before the worker is deployed.
2. Deploy the worker update (`/hints` route + rate-limit prefix).
3. Verify in staging (localhost + Tailscale) that hints actually drip.
