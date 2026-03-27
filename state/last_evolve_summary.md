# Last Evolve Summary
Timestamp: 2026-03-27T21:18:25Z
Main HEAD: ba4e0d7
Posture: PATTERN_HUNT (highest counter at 3; Citadel never deep-dived, first priority)
Posture history: [PATTERN_HUNT, SYNTHESIS, PIPELINE_WATCH, HORIZON_SCAN, PATTERN_HUNT, SYNTHESIS, PIPELINE_WATCH, SYNTHESIS, PATTERN_HUNT, HORIZON_SCAN, PIPELINE_WATCH, SYNTHESIS, PATTERN_HUNT, HORIZON_SCAN, PIPELINE_WATCH, SYNTHESIS, PATTERN_HUNT, HORIZON_SCAN, PATTERN_HUNT, PIPELINE_WATCH]
Runs since each:
  PATTERN_HUNT: 0
  PIPELINE_WATCH: 2
  HORIZON_SCAN: 3
  SYNTHESIS: 1
Open issues: #22, #48, #100, #103

## Source Digests
anthropics/claude-code: f75b613 | last-deep: 2026-03-27T09:27 | unchanged
affaan-m/everything-claude-code: 8b6140d | last-deep: 2026-03-25T13:32 | unchanged
hesreallyhim/awesome-claude-code: 7f0aafc | last-deep: 2026-03-26T09:28 | unchanged
bytedance/deer-flow: ca20b48 | last-deep: 2026-03-26T09:28 | unchanged
SethGammon/Citadel: 830b63b | last-deep: 2026-03-27T21:18 | deep-dived (was 25c4755)
actions/runner: f0c2286 | last-deep: 2026-03-24 | unchanged
withastro/astro: 0d24e3b | last-deep: 2026-03-25T17:12 | changed (was 6464425)
verkyyi/tokenman: ba4e0d7 | last-deep: never | self, 0 forks

## Findings This Run
- Citadel first deep-dive (830b63b): 21-hook ecosystem (governance, quality-gate, external-action-gate, intake-scanner, stop-failure, circuit-breaker, etc.). V2 quality improvements: ReDoS heuristic for custom regex rules, repo-slug input validation, execFileSync over execSync for shell injection prevention. Validates our guard.sh architecture but patterns are interactive-session focused — low CI adoption potential.
- Citadel quality-gate Stop hook scans changed files for anti-patterns post-edit. Interesting concept but not transferable to CI workflows.
- Citadel external-action-gate blocks irreversible gh commands (merge/close/delete) with quoted-string stripping to prevent false positives. Our guard.sh already covers this via deny_rules. The quote-stripping technique is clever but no recorded false positives in our harness to justify the complexity.
- SHA scan: 2/8 Active changed (Citadel deep-dived, Astro minor node middleware fix). 0/5 Watch changed. All stable.
0 issues created.
