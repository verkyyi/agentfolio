# Evolve History Gap Fix

## Problem

Evolve's Step 5 dedup check only queries open issues:

```bash
gh issue list --state open --label evolve-finding --json title -q '.[].title'
```

Closed issues (e.g., #4, #16) are invisible. If a similar external finding surfaces again, evolve may re-create an issue that was already addressed and closed.

## Fix

Change `--state open` to `--state all` in the Step 5 dedup check in `.github/workflows/evolve.yml`.

```bash
# Before
gh issue list --state open --label evolve-finding --json title -q '.[].title'

# After
gh issue list --state all --label evolve-finding --json title -q '.[].title'
```

## Scope

- **One file changed:** `.github/workflows/evolve.yml`
- **One line changed:** the `gh issue list` command in the Step 5 dedup instructions
- **No other workflows affected** — triage, coder, watcher, and reviewer already use labels for dedup

## Why not more?

- **Research log tail injection**: Considered but unnecessary. `agent_log.md` (already injected as context, tail 20) covers what was found and acted on.
- **Git history injection**: `agent_log.md` already provides richer operational history than `git log --oneline state/`.
- **State file consolidation** (project_state.md vs agent_log.md): Valid simplification but out of scope — deferred.
- **Research log noise** (repeated "no action" entries): Cosmetic, not a functional bug. The append-only log grows but doesn't cause incorrect behavior.

## Risk

- `--state all` returns more titles as issues accumulate. At current volume (~20 total issues, ~10 with `evolve-finding` label), this is negligible. Would only matter at hundreds of issues, which is months away.
- No behavioral change for any other workflow.

## Test Plan

- [ ] Verify the change by running `gh issue list --state all --label evolve-finding --json title -q '.[].title'` locally and confirming closed issues appear
- [ ] Trigger a manual `workflow_dispatch` of evolve.yml after merge and confirm it doesn't re-create any closed issues
