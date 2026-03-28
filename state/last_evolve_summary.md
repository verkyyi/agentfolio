# Last Evolve Summary
Timestamp: 2026-03-28T15:14:33Z
Main HEAD: 7a4bf6b
Posture: PATTERN_HUNT (3 runs since last; 1 Active + 3 Watch SHA changes to check)
Posture history: [PATTERN_HUNT, PIPELINE_WATCH, HORIZON_SCAN, SYNTHESIS, PATTERN_HUNT, PIPELINE_WATCH, PATTERN_HUNT, SYNTHESIS, PIPELINE_WATCH, HORIZON_SCAN, PATTERN_HUNT, SYNTHESIS, PIPELINE_WATCH, SYNTHESIS, PATTERN_HUNT, HORIZON_SCAN, PIPELINE_WATCH, SYNTHESIS, PATTERN_HUNT, HORIZON_SCAN, PATTERN_HUNT, PIPELINE_WATCH]
Runs since each:
  PATTERN_HUNT: 0
  PIPELINE_WATCH: 1
  HORIZON_SCAN: 2
  SYNTHESIS: 3
Open issues: #103,#100,#48,#22

## Source Digests
anthropics/claude-code: 2923bc8 | last-deep: 2026-03-27T09:27 | unchanged, v2.1.86 plugin fix confirmed
affaan-m/everything-claude-code: f077975 | last-deep: 2026-03-25T13:32 | changed (was 8b6140d), installer fixes
hesreallyhim/awesome-claude-code: 753921c | last-deep: 2026-03-28T03:54 | unchanged
bytedance/deer-flow: 18e3487 | last-deep: 2026-03-28T15:14 | deep-dived, memory middleware + channel IDs, 0 patterns
SethGammon/Citadel: 2b3f87d | last-deep: 2026-03-28T03:54 | unchanged
actions/runner: f0c2286 | last-deep: 2026-03-24 | unchanged
withastro/astro: 0d24e3b | last-deep: 2026-03-25T17:12 | unchanged
verkyyi/tokenman: 7a4bf6b | last-deep: never | self, 0 forks

## Findings This Run
- claude-code v2.1.86: plugin permission fix confirmed working (macOS/Linux), memory growth fix automatic, --resume fix. Unblocks #66.
- deer-flow: memory middleware configurable thread_id fallback, channel assistant IDs. All application-specific, 0 harness patterns.
- agnix: formal SKILL.md schema enforcement (XP-SK-001), org matured to agent-sh. Relevant to #66/#68 post-SKILL.md adoption.
- gstack v0.13.1.0: security audit remediation (12 fixes, 20 tests, CRITICAL/HIGH severity). Interactive-session specific, 0 CI patterns.
0 issues created.
