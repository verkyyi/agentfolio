# Adapt Skill — Replace Python Pipeline with Claude Code Skill

Replace the Python adaptation script with a Claude Code skill (`.claude/skills/adapt.md`). Both local (`/adapt`) and CI (`claude -p`) use the same skill. Delete the entire `scripts/` directory.

## Motivation

The Python script (`adapt_from_markdown.py`) is just an LLM prompt wrapper — it reads markdown files, sends them to Claude via the Anthropic SDK, and writes JSON. Claude Code already IS Claude. The skill eliminates 250 lines of Python, a requirements.txt, and a test suite in favor of a single markdown file that Claude Code executes directly.

## What Gets Created

### `.claude/skills/adapt.md`

A Claude Code skill containing:

- **Frontmatter:** `name: adapt`, description with trigger conditions
- **Instructions:** Read `data/input/resume.md` + glob `data/input/jd/*.md`. For each JD, generate an adapted JSON Resume and write to `data/adapted/{slug}.json`. Then generate a default adaptation (no JD) and write to `data/adapted/default.json`.
- **JSON Resume schema:** The full output schema (ported from the current `SYSTEM_PROMPT` in `adapt_from_markdown.py`)
- **Constraints:** Same as current script — extract all factual info, order by relevance, rewrite highlights for target role, honest match scores, etc.

The skill only generates files. It does not commit, push, or interact with git.

## What Gets Deleted

| Path | Reason |
|------|--------|
| `scripts/adapt_from_markdown.py` | Replaced by skill |
| `scripts/tests/test_adapt_from_markdown.py` | Tests for deleted script |
| `scripts/tests/__init__.py` | Empty init |
| `scripts/tests/conftest.py` | Test config for deleted tests |
| `scripts/__init__.py` | Empty init |
| `scripts/requirements.txt` | Python deps no longer needed |

The entire `scripts/` directory is removed.

## What Gets Modified

### `.github/workflows/adapt.yml`

Replace Python setup + script run with Claude Code CLI:

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Install Claude Code
    run: npm install -g @anthropic-ai/claude-code

  - name: Generate adaptations
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    run: claude -p "Use the /adapt skill" --allowedTools Read,Write,Glob

  - name: Commit generated files
    run: |
      git config user.name "AgentFolio Bot"
      git config user.email "bot@agentfolio.local"
      git add data/adapted/
      if git diff --cached --quiet; then
        echo "no adaptation changes"
      else
        git commit -m "chore(adapt): regenerate adapted resumes"
        git push
      fi
```

Trigger paths change: replace `scripts/adapt_from_markdown.py` with `.claude/skills/adapt.md`.

### `CLAUDE.md`

- Remove `scripts/` from project structure tree
- Update project structure to show `.claude/skills/adapt.md`
- Remove Python test commands from testing section

### `README.md`

- Remove `scripts/` from architecture section
- Mention `/adapt` skill in quickstart or personalization section

## Usage

**Local:** Run `/adapt` in Claude Code. Claude reads inputs, generates adapted JSONs, writes them. User reviews and commits.

**CI:** GitHub Actions runs `claude -p "Use the /adapt skill"`. Workflow commits results.

**Same prompt, same schema, one source of truth.**

## Scope

- Create 1 file (`.claude/skills/adapt.md`)
- Delete 6 files (entire `scripts/` directory)
- Modify 3 files (`adapt.yml`, `CLAUDE.md`, `README.md`)
