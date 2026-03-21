---
name: adversarial-review
description: >
  Use when an agent (especially evolve.yml) has proposed an output or change
  and needs to self-check before finalizing. Implements risk-scaled adversarial
  review inspired by gstack v0.9.5.0 (garrytan/gstack@6c69feb, PR #297).
---

# Adversarial Self-Review Protocol

Before finalizing any proposed output (issue, PR, code change, or state update),
run a lightweight self-check scaled to the risk level of the change.

## Risk Tiers

### Tier 0 — State Updates (auto-commit)
Examples: agent_log.md, project_state.md, research_log.md entries
Required checks:
- [ ] Is this append-only? (no rewrites of existing lines)
- [ ] Does it follow the correct pipe-delimited format?

### Tier 1 — Skill / Content Changes (auto-merge PR)
Examples: skill wording improvements, FEATURE_STATUS updates
Required checks:
- [ ] Is there already a merged PR that addresses this?
- [ ] Does this change behavior (→ needs Tier 2) or just wording?
- [ ] Is this reversible?

### Tier 2 — Structural Changes (needs-review PR)
Examples: workflow YAML, CLAUDE.md rules, new skill files, research-inspired changes
Required checks:
- [ ] Is there a duplicate open issue or PR for this improvement?
  Run: `gh issue list --state open --label evolve-finding --json title -q '.[].title'`
- [ ] Am I promoting my own autonomy? (yes → STOP immediately)
- [ ] Am I editing workflow YAML directly in this run? (yes → STOP, open PR instead)
- [ ] What could go wrong if this change is incorrect?
- [ ] Does this cite the failure or research that triggered it?
- [ ] Is this the FIRST structural change this evolve.yml run? (max one per run)

## Self-Check Block for evolve.yml Step 5

Before creating any GitHub Issue or writing any structural change, answer:

```
ADVERSARIAL CHECK (Tier [0/1/2]):
1. Duplicate check: [result of gh issue list query or "N/A for state update"]
2. Autonomy promotion: [yes → abort / no → continue]
3. Direct workflow YAML edit: [yes → abort / no → continue]
4. Risk if wrong: [one-sentence assessment]
5. Evidence cited: [source commit/release/repo URL or finding]
6. Structural changes this run so far: [N of max 1]
VERDICT: [proceed / abort — reason]
```

Only proceed if verdict is "proceed".

## Examples

**Good (proceed):**
```
ADVERSARIAL CHECK (Tier 2):
1. Duplicate check: no open issues matching "mobile breakpoint"
2. Autonomy promotion: no
3. Direct workflow YAML edit: no — opening issue only
4. Risk if wrong: CSS regression on mobile, easily reverted
5. Evidence cited: two prior evolve.yml runs proposed same fix
6. Structural changes this run so far: 0 of max 1
VERDICT: proceed
```

**Bad (abort):**
```
ADVERSARIAL CHECK (Tier 2):
1. Duplicate check: issue #4 already open with title "[evolve] adversarial self-review"
2. Autonomy promotion: no
3. Direct workflow YAML edit: no
4. Risk if wrong: duplicate issue noise
5. Evidence cited: gstack v0.9.5.0
6. Structural changes this run so far: 0 of max 1
VERDICT: abort — duplicate issue already exists (#4)
```
