# Chat Conversation Context — Design

**Date:** 2026-04-17
**Status:** Approved

## Problem

The chat bot appears to lack memory of earlier turns:

- `$ Can you see what I have asked you before?`
- `> No, I don't have memory of previous conversations—each time we chat, it's a fresh start for me.`

Investigation shows turn history *is* being sent (`ChatPanel.tsx:175` builds `toSend = [...messages, newUser]`; `worker.ts:142` forwards it verbatim; `anthropic.ts:30` passes it to Anthropic). Two real issues lie in the system prompt, not the API:

1. **Canned "no memory" reply.** The prompt never tells Claude that prior turns are real history to reference. Given a meta-question about memory, Claude defaults to the generic "I don't have memory of previous conversations" line.
2. **Invisible greeting.** The greeting rendered in `ChatPanel` (`> Hey, I'm an agent that knows …`) is a client-side prop — it never leaves the browser. If the visitor's first reply refers to the greeting, Claude has no idea what was "said."

## Goal

Make the bot correctly reference in-session history and the greeting it opened with, without changing the message schema or the prompt-cache story.

## Architecture

Client forwards the greeting it displayed as a new `greeting` field in the POST body. Worker validates and threads it through to `buildSystemPrompt`, which adds two prompt lines:

- Always present: an assertion that prior turns in the message list are real and should be referenced.
- Only when `greeting` is provided: a line quoting the greeting as the assistant's opening turn.

No change to the `messages` array. The greeting is per-slug and stable, so the system block stays cacheable under the existing `cache_control: ephemeral`.

## Components

### `web/src/components/ChatPanel.tsx`

`displayGreeting` is already computed (line 218). Include it in the request body:

```ts
body: JSON.stringify({ slug, messages: toSend, greeting: displayGreeting }),
```

### `proxy/src/worker.ts`

Extend `ChatBody` and `validateBody`:

```ts
interface ChatBody {
  slug: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  greeting?: string;
}
```

Validation: if `greeting` is present, it must be a string ≤ 500 chars; empty string coerces to `undefined`. Missing field is allowed (backward compat). Forward to `callAnthropic`.

### `proxy/src/anthropic.ts`

Add `greeting?: string` to `CallInputs`, thread into `PromptInputs`.

### `proxy/src/prompt.ts`

Add `greeting?: string` to `PromptInputs`. After the existing `"Keep replies short…"` line, append:

```
Prior turns in this conversation are real — you wrote the assistant turns,
the visitor wrote the user turns. Reference them naturally; don't claim you
lack memory of what was said earlier in this thread.
```

And, only if greeting is a non-empty string:

```
Your opening line to the visitor was: "<greeting>". Treat it as something
you already said.
```

## Data Flow

```
meta.agentfolio.greeting  →  App.tsx  →  ChatPanel.displayGreeting
                                           │
                                           ▼
                                  POST /chat { slug, messages, greeting }
                                           │
                                           ▼
                                  worker.validateBody
                                           │
                                           ▼
                                  callAnthropic → buildSystemPrompt
                                           │
                                           ▼
                         Anthropic system block (prefix-cached per slug)
```

## Error Handling

- Missing / empty `greeting` → skip the greeting line. The history-is-real line still appears.
- `greeting` over 500 chars → 400 `invalid_body` (same path as existing validation).
- Old clients that don't send `greeting` → worker treats as absent (no 400).
- Non-string `greeting` → 400.

## Prompt Cache Impact

System text is `<persona> <rules> <history-line> <greeting-line?> <resume> <directives?> <jd?>`. Each slug has a stable `greeting` (from `meta.agentfolio.greeting`), so the full system string is deterministic per slug. Cache-hit behavior is unchanged.

## Testing

- `proxy/test/prompt.test.ts` — asserts both new lines appear when `greeting` is provided; only the history line appears when it's absent; greeting text is embedded verbatim.
- `proxy/test/worker.test.ts` — one case for the 500-char cap (400); one case that the greeting string appears inside the Anthropic request body.
- `web/src/__tests__/ChatPanel.test.tsx` — asserts the fetch body contains `greeting` matching the rendered greeting, and that omitting the greeting prop still sends *some* greeting (the fallback).

## Non-Goals

- Storing conversation state server-side (no `conversationId`, no KV of messages).
- Rate limits per conversation.
- Sending the greeting as an `assistant` message in `messages`. Rejected because it would count against the 20-turn / 2000-char limits and mix static boilerplate into the real transcript.

## Rollout

1. Merge to `ux/chatbot-optimizations` → push → GitHub Pages builds the web client.
2. Manual `wrangler deploy` from `proxy/` to ship the worker.

Web and worker are backward-compatible in both directions: old worker + new client silently ignores `greeting`; new worker + old client just skips the greeting line.
