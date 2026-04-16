# Pipeline Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic `/adapt` skill with a three-stage pipeline (`/fit` -> `/extract-directives` -> `/structurize`) that produces human-editable intermediate markdown and auto-extracts directives from human edits.

**Architecture:** Three independent Claude Code skills, each reading/writing to a specific data directory. `data/input/` is the human-authored source, `data/fitted/` holds tailored freeform markdown (human-editable), `data/adapted/` holds final JSON Resume output. Git authorship (`AgentFolio Bot`) distinguishes pipeline output from human edits. Four CI workflows chain via push triggers.

**Tech Stack:** Claude Code skills (markdown), GitHub Actions workflows (YAML), git authorship detection (shell)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `.claude/skills/fit.md` | `/fit` skill — tailors resume markdown for a target role |
| Create | `.claude/skills/extract-directives.md` | `/extract-directives` skill — extracts intentions from human edits |
| Create | `.claude/skills/structurize.md` | `/structurize` skill — converts fitted markdown to JSON Resume |
| Create | `.github/workflows/fit.yml` | CI workflow for `/fit` |
| Create | `.github/workflows/extract.yml` | CI workflow for `/extract-directives` |
| Create | `.github/workflows/structurize.yml` | CI workflow for `/structurize` |
| Create | `data/input/directives.md` | Empty directives template |
| Create | `data/fitted/.gitkeep` | Ensure fitted directory exists in git |
| Delete | `.claude/skills/adapt.md` | Replaced by three new skills |
| Delete | `.github/workflows/adapt.yml` | Replaced by three new workflows |
| Modify | `CLAUDE.md` | Update project structure, skill references, pipeline description |

---

### Task 1: Create the `/fit` skill

**Files:**
- Create: `.claude/skills/fit.md`

- [ ] **Step 1: Create the fit skill file**

```markdown
---
name: fit
description: Use when the user wants to generate or regenerate tailored resume markdown from data/input/resume.md, data/input/jd/*.md, and data/input/directives.md
---

# Fit Resume

Generate tailored freeform markdown resumes from a source resume, target job descriptions, and global directives.

## Usage

- `/fit` — fit all JDs in `data/input/jd/` + generate default
- `/fit notion` — fit only for `data/input/jd/notion.md` (no default)
- `/fit notion stripe` — fit for multiple specific JDs

## Steps

1. Read `data/input/resume.md`
2. Read `data/input/directives.md` (if it exists — skip silently if missing)
3. If slug(s) specified: read `data/input/jd/{slug}.md` for each (error if file missing). If no slug: glob `data/input/jd/*.md` to find all target JDs.
4. For each JD file, generate a tailored markdown resume and write to `data/fitted/{slug}.md`
5. Generate a default version (no JD) and write to `data/fitted/default.md` — **only when no specific slug is given**

## Output Format

The output is **freeform markdown** with the same structure as `resume.md`. It is NOT JSON. The markdown should:

- Keep the same section headings as the source resume (Experience, Projects, Skills, Education, Volunteering)
- Rewrite bullet points to emphasize relevance to the target role, keeping all factual claims intact
- Reorder sections and entries by relevance to the target role (most relevant first)
- Tailor the summary/headline for the specific company and role
- Apply any instructions from `data/input/directives.md`
- Include ALL entries from the source resume — do not omit anything

## Constraints

- Preserve all factual information — dates, numbers, company names, URLs
- Rewrite highlights to emphasize relevance, but never fabricate claims
- Summary must be specific to the target company/role, not generic
- Apply directives faithfully — they represent accumulated human preferences
- The output must be human-readable and human-editable markdown

## Default Fit

When generating the default (no JD):
- Use a general professional summary
- Keep original section ordering
- Apply directives but skip any that are role-specific

## Output

Write each fitted markdown file. Do not commit — just write the files.
```

- [ ] **Step 2: Verify the skill file exists and has correct frontmatter**

Run: `head -5 .claude/skills/fit.md`
Expected: Shows `---`, `name: fit`, `description: ...`, `---`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/fit.md
git commit -m "feat: add /fit skill for tailoring resume markdown"
```

---

### Task 2: Create the `/extract-directives` skill

**Files:**
- Create: `.claude/skills/extract-directives.md`

- [ ] **Step 1: Create the extract-directives skill file**

```markdown
---
name: extract-directives
description: Use when the user wants to extract editing intentions from human changes to data/fitted/*.md and append them to data/input/directives.md
---

# Extract Directives

Extract human editing intentions from changes to fitted resume markdown and append them to the global directives file.

## Usage

- `/extract-directives` — extract from all fitted files with human changes
- `/extract-directives notion` — extract from `data/fitted/notion.md` only

## How It Works

This skill uses git authorship to distinguish pipeline output from human edits:

1. For each target fitted file in `data/fitted/*.md`:
   a. Run `git log --author="AgentFolio Bot" -1 --format="%H" -- data/fitted/{slug}.md` to find the last bot commit for that file
   b. If no bot commit exists, skip this file (it was never generated by the pipeline)
   c. Run `git diff {bot_commit_hash} -- data/fitted/{slug}.md` to get the diff between the bot's version and the current file
   d. If no diff, skip this file (no human edits)
2. For each file with diffs, analyze the changes and extract the **intentions** behind them — not the literal diffs
3. Read `data/input/directives.md` (create it if missing)
4. Append a new section with the extracted directives

## Extracting Intentions

Given a diff, extract the human's intent. Examples:

- Changed "backend engineer" to "platform engineer" in summary → "Prefer 'platform engineer' over 'backend engineer' in summary"
- Removed 2 of 3 volunteer bullets → "Keep volunteer section brief — one highlight max"
- Moved the Skills section above Projects → "Place Skills section before Projects"
- Added a bullet about Kafka to a work entry → "Emphasize Kafka experience in work highlights"

Extract high-level preferences, not line-by-line edits. Group related changes into single directives.

## Append Format

Append to `data/input/directives.md` using this format:

```markdown

## Auto-extracted ({date}, from {slug}.md edits)
- {directive 1}
- {directive 2}
```

Where `{date}` is today's date in YYYY-MM-DD format.

Do NOT overwrite existing content in directives.md — always append.

## No-Op Behavior

If no fitted files have human edits (no diff against last bot commit), print "No human edits found in fitted files." and exit without modifying directives.md.

## Output

Append to directives.md. Do not commit — just write the file.
```

- [ ] **Step 2: Verify the skill file exists and has correct frontmatter**

Run: `head -5 .claude/skills/extract-directives.md`
Expected: Shows `---`, `name: extract-directives`, `description: ...`, `---`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/extract-directives.md
git commit -m "feat: add /extract-directives skill for intention extraction"
```

---

### Task 3: Create the `/structurize` skill

**Files:**
- Create: `.claude/skills/structurize.md`

- [ ] **Step 1: Create the structurize skill file**

The structurize skill converts fitted markdown to JSON Resume format. The JSON Resume schema must match what `web/src/types.ts` expects (`AdaptedResume` interface) and include `company` field on work entries for PDF theme compatibility (per CLAUDE.md: "Work entries include both `name` and `company` fields").

```markdown
---
name: structurize
description: Use when the user wants to convert fitted markdown resumes in data/fitted/*.md to JSON Resume format in data/adapted/*.json
---

# Structurize Resume

Convert tailored freeform markdown resumes into valid JSON Resume documents.

## Usage

- `/structurize` — convert all files in `data/fitted/`
- `/structurize notion` — convert only `data/fitted/notion.md`
- `/structurize notion stripe` — convert multiple specific slugs

## Steps

1. If slug(s) specified: read `data/fitted/{slug}.md` for each (error if file missing). If no slug: glob `data/fitted/*.md` to find all fitted files.
2. For each fitted markdown file, parse it into a valid JSON Resume document and write to `data/adapted/{slug}.json`

## Output Schema

Each output file must be valid JSON matching this schema exactly:

```json
{
  "basics": {
    "name": "<from markdown header>",
    "label": "<professional title from markdown>",
    "email": "<from markdown>",
    "phone": "<from markdown or null>",
    "summary": "<from markdown summary/headline>",
    "location": { "city": "<city>", "region": "<state/region>", "countryCode": "<country code>" },
    "profiles": [{ "network": "<name>", "url": "<url>", "username": "<optional>" }]
  },
  "work": [
    {
      "id": "<slugified company name>",
      "name": "<company name>",
      "company": "<company name (same as name, for PDF theme compat)>",
      "position": "<position>",
      "location": "<location>",
      "startDate": "<YYYY-MM>",
      "endDate": "<YYYY-MM or omit if current/present>",
      "highlights": ["<bullet text>"]
    }
  ],
  "projects": [
    {
      "id": "<slugified project name>",
      "name": "<project name>",
      "description": "<one-line description>",
      "url": "<url or omit>",
      "github": "<github url or omit>",
      "startDate": "<YYYY-MM>",
      "highlights": ["<bullet text>"],
      "keywords": ["<tech keywords>"]
    }
  ],
  "skills": [
    { "id": "<slugified category name>", "name": "<category>", "keywords": ["<skill1>", "..."] }
  ],
  "education": [
    { "institution": "<name>", "studyType": "<degree>", "area": "<field>", "location": "<location>", "startDate": "<YYYY-MM>", "endDate": "<YYYY-MM>" }
  ],
  "volunteer": [
    { "organization": "<name>", "position": "<role>", "location": "<location>", "startDate": "<YYYY-MM>", "summary": "<description>" }
  ],
  "meta": {
    "version": "1.0.0",
    "lastModified": "<ISO 8601 timestamp>",
    "agentfolio": {
      "company": "<from slug: 'default' for default.md, company name for JD-specific>",
      "role": "<from fitted markdown title/context, or null for default>",
      "generated_by": "claude-code/structurize-skill"
    }
  }
}
```

## Parsing Rules

- Extract name, email, phone, and profile URLs from the markdown header/contact section
- Parse location from the header line (e.g., "San Francisco, CA" → city + region + countryCode "US")
- Parse dates like "Jun 2022" → "2022-06", "present" → omit endDate
- Each bullet point under a work/project entry becomes one highlights array item
- Skills listed as "Category: skill1, skill2, ..." → one skills entry per category
- The `company` field must equal the `name` field on work entries (PDF theme compatibility)
- Generate slugified `id` fields by lowercasing and replacing spaces/special chars with hyphens
- For the `meta.agentfolio.company` field: use "default" for `default.md`, otherwise infer the company name from the fitted markdown content
- For the `meta.agentfolio.role` field: extract from the fitted markdown title/context, or null for default

## Output

Write each JSON file with 2-space indentation and a trailing newline. Do not commit — just write the files.
```

- [ ] **Step 2: Verify the skill file exists and has correct frontmatter**

Run: `head -5 .claude/skills/structurize.md`
Expected: Shows `---`, `name: structurize`, `description: ...`, `---`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/structurize.md
git commit -m "feat: add /structurize skill for markdown to JSON Resume conversion"
```

---

### Task 4: Create the directives template and fitted directory

**Files:**
- Create: `data/input/directives.md`
- Create: `data/fitted/.gitkeep`

- [ ] **Step 1: Create the empty directives file**

```markdown
# Resume Directives

Global preferences for how resumes should be tailored. Write directives here manually, or let `/extract-directives` append them automatically from your edits to fitted files.

## Manual

```

- [ ] **Step 2: Create the fitted directory with .gitkeep**

```bash
mkdir -p data/fitted
touch data/fitted/.gitkeep
```

- [ ] **Step 3: Verify both files exist**

Run: `ls -la data/input/directives.md data/fitted/.gitkeep`
Expected: Both files listed

- [ ] **Step 4: Commit**

```bash
git add data/input/directives.md data/fitted/.gitkeep
git commit -m "feat: add directives template and fitted directory"
```

---

### Task 5: Create `fit.yml` workflow

**Files:**
- Create: `.github/workflows/fit.yml`

- [ ] **Step 1: Create the fit workflow**

This workflow mirrors the structure of the existing `adapt.yml` but targets the `/fit` skill and writes to `data/fitted/`. Key differences from `adapt.yml`:
- Triggers on `data/input/resume.md`, `data/input/jd/**`, `.claude/skills/fit.md` (NOT `data/input/directives.md` — avoids loop)
- Commits to `data/fitted/` instead of `data/adapted/`
- Uses the `/fit` skill instead of `/adapt`

```yaml
name: Fit Resumes
on:
  push:
    branches: [main]
    paths:
      - 'data/input/resume.md'
      - 'data/input/jd/**'
      - '.claude/skills/fit.md'
  workflow_dispatch:
    inputs:
      slugs:
        description: 'Space-separated slugs to fit (e.g. "notion stripe"). Leave empty to fit all.'
        required: false
        default: ''

permissions:
  contents: write

jobs:
  fit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Detect changed files
        id: changes
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            INPUT="${{ github.event.inputs.slugs }}"
            echo "slugs=${INPUT:-all}" >> "$GITHUB_OUTPUT"
          else
            CHANGED=$(git diff --name-only HEAD~1 HEAD)
            if echo "$CHANGED" | grep -qE '(data/input/resume\.md|\.claude/skills/fit\.md)'; then
              echo "slugs=all" >> "$GITHUB_OUTPUT"
            else
              SLUGS=$(echo "$CHANGED" | grep '^data/input/jd/' | sed 's|data/input/jd/||;s|\.md$||' | tr '\n' ' ' | xargs)
              echo "slugs=${SLUGS:-all}" >> "$GITHUB_OUTPUT"
            fi
          fi
          echo "Fit targets: $(cat "$GITHUB_OUTPUT")"

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Generate fitted resumes
        env:
          CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
        run: |
          SLUGS="${{ steps.changes.outputs.slugs }}"
          if [ "$SLUGS" = "all" ]; then
            claude -p "Use the /fit skill to generate all fitted resumes." --allowedTools Read,Write,Glob 2>&1 | tee fit-output.log
          else
            claude -p "Use the /fit skill to generate fitted resumes for these specific slugs: $SLUGS" --allowedTools Read,Write,Glob 2>&1 | tee fit-output.log
          fi

      - name: Upload Claude output
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: fit-log
          path: fit-output.log
          retention-days: 7

      - name: Show fitted file changes
        run: git diff -- data/fitted/

      - name: Commit generated files
        run: |
          git config user.name "AgentFolio Bot"
          git config user.email "bot@agentfolio.local"
          git add data/fitted/
          if git diff --cached --quiet; then
            echo "no fit changes"
          else
            git commit -m "chore(fit): regenerate fitted resumes"
            git push
          fi
```

- [ ] **Step 2: Verify the workflow file is valid YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/fit.yml'))"; echo "valid"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/fit.yml
git commit -m "ci: add fit.yml workflow for fitted resume generation"
```

---

### Task 6: Create `extract.yml` workflow

**Files:**
- Create: `.github/workflows/extract.yml`

- [ ] **Step 1: Create the extract workflow**

This workflow triggers on pushes to `data/fitted/*.md`, checks if the commit author is NOT the bot (i.e., human edits), runs `/extract-directives`, commits the updated directives, and then triggers `structurize.yml` via `workflow_dispatch`.

```yaml
name: Extract Directives
on:
  push:
    branches: [main]
    paths:
      - 'data/fitted/*.md'

permissions:
  contents: write
  actions: write

jobs:
  extract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 10

      - name: Check commit author
        id: author
        run: |
          AUTHOR=$(git log -1 --format='%an')
          echo "author=$AUTHOR" >> "$GITHUB_OUTPUT"
          IS_BOT=$( [ "$AUTHOR" = "AgentFolio Bot" ] && echo true || echo false )
          echo "is_bot=$IS_BOT" >> "$GITHUB_OUTPUT"
          echo "Commit author: $AUTHOR (is_bot=$IS_BOT)"

      - name: Skip if bot commit
        if: steps.author.outputs.is_bot == 'true'
        run: echo "Bot commit — skipping directive extraction"

      - uses: actions/setup-node@v4
        if: steps.author.outputs.is_bot == 'false'
        with:
          node-version: '20'

      - name: Install Claude Code
        if: steps.author.outputs.is_bot == 'false'
        run: npm install -g @anthropic-ai/claude-code

      - name: Extract directives
        if: steps.author.outputs.is_bot == 'false'
        env:
          CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
        run: |
          claude -p "Use the /extract-directives skill to extract intentions from human edits to fitted files." --allowedTools Read,Write,Glob,Bash 2>&1 | tee extract-output.log

      - name: Upload Claude output
        if: always() && steps.author.outputs.is_bot == 'false'
        uses: actions/upload-artifact@v4
        with:
          name: extract-log
          path: extract-output.log
          retention-days: 7

      - name: Commit updated directives
        if: steps.author.outputs.is_bot == 'false'
        run: |
          git config user.name "AgentFolio Bot"
          git config user.email "bot@agentfolio.local"
          git add data/input/directives.md
          if git diff --cached --quiet; then
            echo "no directive changes"
          else
            git commit -m "chore(extract): update directives from human edits"
            git push
          fi

      - name: Trigger structurize workflow
        if: steps.author.outputs.is_bot == 'false'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh workflow run structurize.yml
```

- [ ] **Step 2: Verify the workflow file is valid YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/extract.yml'))"; echo "valid"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/extract.yml
git commit -m "ci: add extract.yml workflow for directive extraction"
```

---

### Task 7: Create `structurize.yml` workflow

**Files:**
- Create: `.github/workflows/structurize.yml`

- [ ] **Step 1: Create the structurize workflow**

This workflow triggers on bot commits to `data/fitted/*.md` (from `/fit`) or via `workflow_dispatch` (from `extract.yml`). It runs `/structurize` and commits JSON Resume output to `data/adapted/`.

```yaml
name: Structurize Resumes
on:
  push:
    branches: [main]
    paths:
      - 'data/fitted/*.md'
  workflow_dispatch:
    inputs:
      slugs:
        description: 'Space-separated slugs to structurize (e.g. "notion stripe"). Leave empty for all.'
        required: false
        default: ''

permissions:
  contents: write

jobs:
  structurize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check commit author (push trigger only)
        id: author
        if: github.event_name == 'push'
        run: |
          AUTHOR=$(git log -1 --format='%an')
          echo "author=$AUTHOR" >> "$GITHUB_OUTPUT"
          IS_BOT=$( [ "$AUTHOR" = "AgentFolio Bot" ] && echo true || echo false )
          echo "is_bot=$IS_BOT" >> "$GITHUB_OUTPUT"
          echo "Commit author: $AUTHOR (is_bot=$IS_BOT)"

      - name: Skip if non-bot push
        if: github.event_name == 'push' && steps.author.outputs.is_bot == 'false'
        run: |
          echo "Non-bot commit — extract.yml handles this path"
          exit 0

      - uses: actions/setup-node@v4
        if: github.event_name == 'workflow_dispatch' || steps.author.outputs.is_bot == 'true'
        with:
          node-version: '20'

      - name: Install Claude Code
        if: github.event_name == 'workflow_dispatch' || steps.author.outputs.is_bot == 'true'
        run: npm install -g @anthropic-ai/claude-code

      - name: Detect slugs
        if: github.event_name == 'workflow_dispatch' || steps.author.outputs.is_bot == 'true'
        id: slugs
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            INPUT="${{ github.event.inputs.slugs }}"
            echo "slugs=${INPUT:-all}" >> "$GITHUB_OUTPUT"
          else
            SLUGS=$(git diff --name-only HEAD~1 HEAD -- 'data/fitted/*.md' | sed 's|data/fitted/||;s|\.md$||' | tr '\n' ' ' | xargs)
            echo "slugs=${SLUGS:-all}" >> "$GITHUB_OUTPUT"
          fi
          echo "Structurize targets: $(cat "$GITHUB_OUTPUT")"

      - name: Generate JSON Resumes
        if: github.event_name == 'workflow_dispatch' || steps.author.outputs.is_bot == 'true'
        env:
          CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
        run: |
          SLUGS="${{ steps.slugs.outputs.slugs }}"
          if [ "$SLUGS" = "all" ]; then
            claude -p "Use the /structurize skill to convert all fitted resumes to JSON Resume format." --allowedTools Read,Write,Glob 2>&1 | tee structurize-output.log
          else
            claude -p "Use the /structurize skill to convert these specific slugs: $SLUGS" --allowedTools Read,Write,Glob 2>&1 | tee structurize-output.log
          fi

      - name: Upload Claude output
        if: always() && (github.event_name == 'workflow_dispatch' || steps.author.outputs.is_bot == 'true')
        uses: actions/upload-artifact@v4
        with:
          name: structurize-log
          path: structurize-output.log
          retention-days: 7

      - name: Show JSON changes
        if: github.event_name == 'workflow_dispatch' || steps.author.outputs.is_bot == 'true'
        run: git diff -- data/adapted/

      - name: Commit generated files
        if: github.event_name == 'workflow_dispatch' || steps.author.outputs.is_bot == 'true'
        run: |
          git config user.name "AgentFolio Bot"
          git config user.email "bot@agentfolio.local"
          git add data/adapted/
          if git diff --cached --quiet; then
            echo "no structurize changes"
          else
            git commit -m "chore(structurize): regenerate JSON resumes"
            git push
          fi
```

- [ ] **Step 2: Verify the workflow file is valid YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/structurize.yml'))"; echo "valid"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/structurize.yml
git commit -m "ci: add structurize.yml workflow for JSON Resume generation"
```

---

### Task 8: Delete old adapt skill and workflow

**Files:**
- Delete: `.claude/skills/adapt.md`
- Delete: `.github/workflows/adapt.yml`

- [ ] **Step 1: Delete the old adapt skill**

```bash
rm .claude/skills/adapt.md
```

- [ ] **Step 2: Delete the old adapt workflow**

```bash
rm .github/workflows/adapt.yml
```

- [ ] **Step 3: Verify both files are gone**

Run: `ls .claude/skills/adapt.md .github/workflows/adapt.yml 2>&1`
Expected: Both files show "No such file or directory"

- [ ] **Step 4: Commit**

```bash
git add -u .claude/skills/adapt.md .github/workflows/adapt.yml
git commit -m "chore: remove old /adapt skill and adapt.yml workflow"
```

---

### Task 9: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the project structure tree**

Replace the current project structure in `CLAUDE.md` with the new layout that includes `data/fitted/`, the three new skills, and the four workflows:

Old:
```
agentfolio/
├── data/                    # Personal data (replace with your own)
│   ├── input/               # ← User input (the only directory you edit)
│   │   ├── resume.md        # Your resume (any text format — source of truth)
│   │   └── jd/              # Target job descriptions (one .md per role)
│   └── adapted/             # Adapted resumes + PDFs (auto-generated)
├── web/                     # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── components/      # ResumeTheme, DownloadPdf
│   │   ├── hooks/           # useAdaptation
│   │   ├── styles/          # Global CSS
│   │   ├── types.ts         # TypeScript types
│   │   └── __tests__/       # Vitest unit tests
│   └── e2e/                 # Playwright E2E tests
├── .claude/skills/          # Claude Code skills
│   └── adapt.md             # /adapt — generate adapted resumes
└── .github/workflows/       # GitHub Actions
    ├── deploy.yml           # Build + deploy to GitHub Pages
    ├── adapt.yml            # Generate adaptations on data/input/ changes
    └── pdf.yml              # Generate PDFs from adapted JSON
```

New:
```
agentfolio/
├── data/                    # Personal data (replace with your own)
│   ├── input/               # ← User input (the only directory you edit)
│   │   ├── resume.md        # Your resume (any text format — source of truth)
│   │   ├── directives.md    # Global resume preferences (human + auto-extracted)
│   │   └── jd/              # Target job descriptions (one .md per role)
│   ├── fitted/              # Tailored markdown resumes (human-editable)
│   └── adapted/             # Final JSON Resume + PDFs (auto-generated)
├── web/                     # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── components/      # ResumeTheme, DownloadPdf
│   │   ├── hooks/           # useAdaptation
│   │   ├── styles/          # Global CSS
│   │   ├── types.ts         # TypeScript types
│   │   └── __tests__/       # Vitest unit tests
│   └── e2e/                 # Playwright E2E tests
├── .claude/skills/          # Claude Code skills
│   ├── fit.md               # /fit — tailor resume markdown for a target role
│   ├── extract-directives.md # /extract-directives — extract intentions from human edits
│   └── structurize.md       # /structurize — convert fitted markdown to JSON Resume
└── .github/workflows/       # GitHub Actions
    ├── deploy.yml           # Build + deploy to GitHub Pages
    ├── fit.yml              # Generate fitted markdown on data/input/ changes
    ├── extract.yml          # Extract directives from human edits to fitted/
    ├── structurize.yml      # Convert fitted markdown to JSON Resume
    └── pdf.yml              # Generate PDFs from adapted JSON
```

- [ ] **Step 2: Update the Key Conventions section**

Replace the line:
```
- **Resume source of truth:** `data/input/resume.md` — any text format. `data/adapted/` is auto-generated and should not be edited manually.
```

With:
```
- **Resume source of truth:** `data/input/resume.md` — any text format.
- **Pipeline:** `/fit` (resume + JD + directives → `data/fitted/*.md`) → `/extract-directives` (human edits → directives) → `/structurize` (fitted markdown → `data/adapted/*.json`).
- **Fitted resumes:** `data/fitted/` — tailored markdown, human-editable. Generated by `/fit`, consumed by `/structurize`.
- **Directives:** `data/input/directives.md` — global preferences. Written by humans and auto-extracted by `/extract-directives`.
- **Adapted output:** `data/adapted/` — auto-generated JSON Resume + PDFs. Do not edit manually.
```

- [ ] **Step 3: Verify CLAUDE.md has the new structure**

Run: `grep -c 'fit.md\|extract-directives.md\|structurize.md\|fitted/' CLAUDE.md`
Expected: At least 6 matches (3 skills + directory references)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for pipeline separation"
```

---

### Task 10: End-to-end local test

This task verifies the full pipeline works locally by running each skill in sequence.

- [ ] **Step 1: Run `/fit notion` and verify output**

Run: `/fit notion`

Then verify:
```bash
ls -la data/fitted/notion.md
head -20 data/fitted/notion.md
```

Expected: `data/fitted/notion.md` exists, contains tailored markdown with the same sections as `resume.md` but rewritten for the Notion role.

- [ ] **Step 2: Run `/structurize notion` and verify output**

Run: `/structurize notion`

Then verify:
```bash
python3 -c "import json; d=json.load(open('data/adapted/notion.json')); print(d['basics']['name']); print(d['meta']['agentfolio']['generated_by'])"
```

Expected: Prints `Alex Chen` and `claude-code/structurize-skill`

- [ ] **Step 3: Verify JSON Resume is valid for the frontend**

```bash
python3 -c "
import json
d = json.load(open('data/adapted/notion.json'))
assert 'basics' in d and 'work' in d and 'projects' in d and 'skills' in d
assert 'education' in d and 'volunteer' in d and 'meta' in d
for w in d['work']:
    assert w['name'] == w.get('company', w['name']), f'work entry missing company field: {w[\"name\"]}'
print('JSON Resume schema valid')
"
```

Expected: `JSON Resume schema valid`

- [ ] **Step 4: Run `/fit` (all slugs + default) and verify default output**

Run: `/fit`

Then verify:
```bash
ls data/fitted/
head -5 data/fitted/default.md
```

Expected: Both `default.md` and `notion.md` exist in `data/fitted/`

- [ ] **Step 5: Run `/structurize` (all) and verify**

Run: `/structurize`

Then verify:
```bash
ls data/adapted/*.json
python3 -c "import json; d=json.load(open('data/adapted/default.json')); print(d['meta']['agentfolio']['company'])"
```

Expected: Both `default.json` and `notion.json` exist; default company is `"default"`

- [ ] **Step 6: Commit all generated files**

```bash
git add data/fitted/ data/adapted/
git commit -m "chore: regenerate fitted and adapted files with new pipeline"
```
