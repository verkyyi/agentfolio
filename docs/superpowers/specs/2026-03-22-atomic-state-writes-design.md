# Atomic State Writes via GitHub API

## Problem

All 11 workflows commit state files to main via `git add/commit/push`. When workflows run concurrently, they race on push — causing `rejected: fetch first` errors. The `git pull --rebase || true` workaround silently drops state updates when rebase conflicts occur. This is the #1 operational reliability issue.

## Solution

Replace `git add/commit/push` with GitHub API content updates (`PUT /repos/.../contents/...`). GitHub handles atomicity — SHA-based optimistic locking prevents lost updates. On conflict (409), retry with fresh SHA.

## Helper Script

Create `scripts/commit-state.sh` that any workflow calls to update a state file:

```bash
#!/bin/bash
# Usage: ./scripts/commit-state.sh <file_path> <commit_message>
# Example: ./scripts/commit-state.sh state/agent_log.md "state: evolve append"

FILE_PATH="$1"
COMMIT_MSG="$2"
MAX_RETRIES=3

for i in $(seq 1 $MAX_RETRIES); do
  # Get current SHA (file may not exist yet)
  SHA=$(gh api "repos/$GITHUB_REPOSITORY/contents/$FILE_PATH" --jq '.sha' 2>/dev/null || echo "")

  # Encode current local file content
  CONTENT=$(base64 -w0 "$FILE_PATH")

  # PUT with SHA for atomicity
  if [ -n "$SHA" ]; then
    RESULT=$(gh api "repos/$GITHUB_REPOSITORY/contents/$FILE_PATH" \
      -X PUT -f message="$COMMIT_MSG" -f content="$CONTENT" -f sha="$SHA" 2>&1)
  else
    RESULT=$(gh api "repos/$GITHUB_REPOSITORY/contents/$FILE_PATH" \
      -X PUT -f message="$COMMIT_MSG" -f content="$CONTENT" 2>&1)
  fi

  if echo "$RESULT" | grep -q '"content"'; then
    echo "Updated $FILE_PATH"
    exit 0
  fi

  echo "Retry $i/$MAX_RETRIES for $FILE_PATH (SHA conflict)"
  sleep 2
done

echo "Failed to update $FILE_PATH after $MAX_RETRIES retries"
exit 1
```

## Workflow Changes

Every workflow has a "commit state" step near the end. Replace the git pattern with API calls.

**Before (current pattern in every workflow):**
```yaml
      - name: Commit state changes
        run: |
          git config user.name "agentfolio[bot]"
          git config user.email "agentfolio[bot]@users.noreply.github.com"
          git add state/
          if ! git diff --cached --quiet; then
            git commit -m "state: workflow-name summary"
            git pull --rebase || true
            git push || true
          fi
```

**After (new pattern):**
```yaml
      - name: Commit state changes
        if: always()
        run: |
          chmod +x scripts/commit-state.sh
          for f in state/agent_log.md state/project_state.md state/usage_log.md state/research_log.md state/learned_rules.md state/learned_intents.md state/growth_metrics.md state/adopters.md state/growth_log.md state/evolve_config.md; do
            if [ -f "$f" ] && ! git diff --quiet "$f" 2>/dev/null; then
              ./scripts/commit-state.sh "$f" "state: update $(basename $f .md)"
            fi
          done
        env:
          GH_TOKEN: ${{ github.token }}
```

This only PUTs files that actually changed (checked via `git diff`).

## What Stays as Git Commit/Push

Not everything moves to API writes:

- **Code changes** (coder.yml creating PRs): Still uses git branches + PRs. Not affected.
- **Workflow YAML changes**: Still uses git/PRs. Not affected.
- **Usage log**: Moves to API writes (currently appended by every workflow).
- **evolve_config.md**: Moves to API writes (updated by re-check step).

Only **state/ files** move to API writes. Everything else stays as-is.

## Edge Cases

- **File doesn't exist yet**: Omit `sha` param in PUT — GitHub creates the file.
- **Two workflows modify same file simultaneously**: One gets 409, retries with fresh SHA. For append-only files (agent_log), the retry re-reads the file (now containing the other workflow's append), appends its own line, and PUTs again. No data lost.
- **API rate limit**: 5000 requests/hour for authenticated calls. At ~10 state files × 11 workflows × 24 runs/day = ~2640 PUTs/day. Well within limits.
- **Large files**: GitHub API content endpoint has a 100MB limit. State files are <100KB. No issue.

## Scope

### Changes Required

1. **New file**: `scripts/commit-state.sh` — atomic write helper
2. **All 11 workflows**: Replace git commit/push state steps with API write calls
3. **Remove**: `git config user.name/email` steps (no longer needed for state commits — API uses the token's identity)

### Not Changed

- Code commit/push patterns (coder PRs, etc.)
- State file format
- State file locations
- Workflow triggers, permissions, prompts

## Risk

- **API errors**: If GitHub API is down, state updates fail. Mitigated by retry loop. State is still in the local workspace — next run picks it up.
- **Token permissions**: `${{ github.token }}` needs `contents: write` — already set in all workflows.
- **Commit attribution**: API commits show as the GitHub App, not `agentfolio[bot]`. Minor cosmetic difference.

## Test Plan

- [ ] Create `scripts/commit-state.sh` and test locally: `GH_TOKEN=... ./scripts/commit-state.sh state/agent_log.md "test"`
- [ ] Update one workflow (evolve.yml) and trigger manually — verify state files updated via API
- [ ] Trigger two workflows simultaneously — verify no push conflicts
- [ ] Verify state file content is correct after concurrent updates
- [ ] Roll out to remaining 10 workflows
