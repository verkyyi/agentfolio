#!/bin/bash
# Atomic state file update via GitHub API.
# Replaces git add/commit/push to avoid push conflicts between concurrent workflows.
# Usage: ./scripts/commit-state.sh <file_path> [commit_message]
# Requires: GH_TOKEN and GITHUB_REPOSITORY env vars (set by GitHub Actions)

set -euo pipefail

FILE_PATH="${1:?Usage: commit-state.sh <file_path> [commit_message]}"
COMMIT_MSG="${2:-state: update $(basename "$FILE_PATH" .md)}"
MAX_RETRIES=3

if [ ! -f "$FILE_PATH" ]; then
  echo "File not found: $FILE_PATH"
  exit 1
fi

# Use a temp file for the JSON payload to avoid ARG_MAX limits on large files
PAYLOAD_FILE=$(mktemp)
trap 'rm -f "$PAYLOAD_FILE" "$PAYLOAD_FILE.b64"' EXIT

for i in $(seq 1 $MAX_RETRIES); do
  # Get current SHA (file may not exist on remote yet)
  SHA=$(gh api "repos/$GITHUB_REPOSITORY/contents/$FILE_PATH" --jq '.sha' 2>/dev/null || echo "")

  # Build JSON payload via temp file (avoids "Argument list too long" for large files).
  # base64 content is piped through jq via --rawfile to never hit ARG_MAX.
  base64 -w0 "$FILE_PATH" > "$PAYLOAD_FILE.b64"
  if [ -n "$SHA" ]; then
    jq -n --arg msg "$COMMIT_MSG" --arg sha "$SHA" --rawfile content "$PAYLOAD_FILE.b64" \
      '{message: $msg, content: $content, sha: $sha}' > "$PAYLOAD_FILE"
  else
    jq -n --arg msg "$COMMIT_MSG" --rawfile content "$PAYLOAD_FILE.b64" \
      '{message: $msg, content: $content}' > "$PAYLOAD_FILE"
  fi
  rm -f "$PAYLOAD_FILE.b64"

  # PUT via --input to avoid passing content as a shell argument
  RESULT=$(gh api "repos/$GITHUB_REPOSITORY/contents/$FILE_PATH" \
    -X PUT --input "$PAYLOAD_FILE" 2>&1) || true

  # Check success
  if echo "$RESULT" | grep -q '"content"'; then
    echo "Updated $FILE_PATH"
    git checkout -- "$FILE_PATH" 2>/dev/null || true
    exit 0
  fi

  if [ "$i" -lt "$MAX_RETRIES" ]; then
    echo "Retry $i/$MAX_RETRIES for $FILE_PATH (SHA conflict or API error)"
    sleep 2
  fi
done

echo "Warning: Failed to update $FILE_PATH after $MAX_RETRIES retries"
exit 0  # Don't fail the workflow over state writes
