#!/usr/bin/env bash
# archive-research-log.sh — Rolling archive for research_log.md
# Moves entries beyond the last 100 to research_log_archive.md.
# Preserves append-only contract: data is moved, never deleted.
# Called by evolve.yml after appending new entries.

set -euo pipefail

RESEARCH_LOG="state/research_log.md"
ARCHIVE="state/research_log_archive.md"
HEADER_LINES=4  # header + format + example + blank line
KEEP=100        # entries to keep in active file

if [ ! -f "$RESEARCH_LOG" ]; then
  echo "No research log found, skipping archive."
  exit 0
fi

TOTAL_LINES=$(wc -l < "$RESEARCH_LOG")
ENTRY_LINES=$((TOTAL_LINES - HEADER_LINES))

if [ "$ENTRY_LINES" -le "$KEEP" ]; then
  echo "Research log has $ENTRY_LINES entries (<= $KEEP), no archiving needed."
  exit 0
fi

ARCHIVE_COUNT=$((ENTRY_LINES - KEEP))
echo "Archiving $ARCHIVE_COUNT entries (keeping last $KEEP of $ENTRY_LINES)."

# Extract header
head -n "$HEADER_LINES" "$RESEARCH_LOG" > /tmp/research_header.txt

# Extract entries to archive (lines after header, up to ARCHIVE_COUNT)
ARCHIVE_START=$((HEADER_LINES + 1))
ARCHIVE_END=$((HEADER_LINES + ARCHIVE_COUNT))

# Initialize archive file if it doesn't exist
if [ ! -f "$ARCHIVE" ]; then
  cat > "$ARCHIVE" << 'EOF'
# Research Log Archive
# Archived entries from state/research_log.md (rolling archive).
# This file is NOT read during session start — historical reference only.
# Format: ISO_TIMESTAMP | source | finding_summary | action_taken

EOF
fi

# Append archived entries
sed -n "${ARCHIVE_START},${ARCHIVE_END}p" "$RESEARCH_LOG" >> "$ARCHIVE"

# Rebuild active file: header + kept entries
KEEP_START=$((ARCHIVE_END + 1))
cat /tmp/research_header.txt > /tmp/research_new.txt
sed -n "${KEEP_START},\$p" "$RESEARCH_LOG" >> /tmp/research_new.txt

mv /tmp/research_new.txt "$RESEARCH_LOG"
rm -f /tmp/research_header.txt

echo "Archived $ARCHIVE_COUNT entries. Active file now has $KEEP entries."
