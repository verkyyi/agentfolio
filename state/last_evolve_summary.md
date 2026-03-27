# Last Evolve Summary
Timestamp: 2026-03-27T15:26:56Z
Main HEAD: 99dda7f
Posture: PIPELINE_WATCH (3 runs since last; cost/health verification due)
Posture history: [PIPELINE_WATCH, HORIZON_SCAN, PATTERN_HUNT, SYNTHESIS, PIPELINE_WATCH, SYNTHESIS, PATTERN_HUNT, HORIZON_SCAN, PIPELINE_WATCH, SYNTHESIS, PATTERN_HUNT, HORIZON_SCAN, PIPELINE_WATCH, SYNTHESIS, PATTERN_HUNT, HORIZON_SCAN, PATTERN_HUNT, PIPELINE_WATCH]
Runs since each:
  PATTERN_HUNT: 2
  PIPELINE_WATCH: 0
  HORIZON_SCAN: 1
  SYNTHESIS: 3
Open issues: #22, #48, #100, #103

## Source Digests
anthropics/claude-code: f75b613 | last-deep: 2026-03-27T09:27 | unchanged
garrytan/gstack: 43c078f | last-deep: 2026-03-26T21:16 | changed (was 5319b8a)
affaan-m/everything-claude-code: 8b6140d | last-deep: 2026-03-25T13:32 | unchanged
hesreallyhim/awesome-claude-code: 22d444f | last-deep: 2026-03-26T09:28 | unchanged
bytedance/deer-flow: 03b144f | last-deep: 2026-03-26T09:28 | changed (was 50f50d7)
wshobson/agents: 91fe43e | last-deep: 2026-03-27T09:27 | unchanged
actions/runner: 9728019 | last-deep: 2026-03-24 | unchanged
withastro/astro: 4198232 | last-deep: 2026-03-25T17:12 | changed (was efb2e4b)
verkyyi/tokenman: 99dda7f | last-deep: never | self, 0 forks

## Findings This Run
- All 10 recent failures ALREADY-FIXED (0 ACTIONABLE): watcher transient (1), coder #116 bug (4), older coder (3), evolve merge conflict (1), reviewer dirty tree (1).
- Cost trending down: $32.79/day projected ($229.50/week), from $35.80/day. Watcher 44.9% + Evolve 34.3% = 79.2% of total. PR #111 frequency reduction confirmed effective.
- SHA scan: 3/8 Active changed (gstack, deer-flow, astro), 1/9 Watch changed (antigravity). No deep-dives (PIPELINE_WATCH posture).
0 issues created.
