#!/bin/bash
# SessionEnd hook: commits and pushes any uncommitted state changes
# This ensures session summaries (written by Claude during the session)
# are always committed, even if the human closes the terminal abruptly.

# Skip in GitHub Actions — workflow runs handle their own state commits
if [ -n "$GITHUB_ACTIONS" ]; then
  exit 0
fi

# Skip in non-interactive mode (-p/--print) — these are headless runs
# that manage their own lifecycle (e.g. workflow-dispatched claude -p)
if [ -n "$CLAUDE_CODE_PRINT_MODE" ]; then
  exit 0
fi

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')

cd "$CWD" || exit 0

# Only proceed if we're in a git repo
git rev-parse --git-dir > /dev/null 2>&1 || exit 0

# Stage state files that Claude should have updated during the session
git add state/project_state.md state/agent_log.md state/learned_intents.md 2>/dev/null

# Check if there's anything to commit
if git diff --cached --quiet; then
  exit 0
fi

# Commit and push
git config user.name "agentfolio[bot]" 2>/dev/null || true
git commit -m "state: CLI session ended — $(date -u +%Y-%m-%dT%H:%M)" 2>/dev/null || exit 0
git pull --rebase origin main 2>/dev/null || true
git push origin main 2>/dev/null || true

exit 0
