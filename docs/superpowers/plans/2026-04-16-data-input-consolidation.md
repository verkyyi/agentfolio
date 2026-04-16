# Data Input Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all user-editable files into `data/input/` so personalizing AgentFolio is "replace one folder."

**Architecture:** Move `data/resume.md` and `data/jd/` into `data/input/`, then update all consumers: Python scripts, GitHub Actions workflows, the web build pipeline, and documentation. The web app runtime is unaffected — it fetches `adapted/*.json` and `slugs.json` at the same public URL paths.

**Tech Stack:** Python, Node.js, GitHub Actions YAML, Vitest

**Spec:** `docs/superpowers/specs/2026-04-16-data-input-consolidation-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `data/resume.md` | Move → `data/input/resume.md` | User's resume |
| `data/jd/` | Move → `data/input/jd/` | Target job descriptions |
| `scripts/adapt_from_markdown.py` | Modify lines 192-193 | Read resume + JDs from `input/` |
| `scripts/tests/test_adapt_from_markdown.py` | Modify lines 180-185 | Test fixture matches new layout |
| `scripts/chat_answer.py` | Modify line 53 | Default `--resume` path |
| `scripts/fetch_jds.py` | Modify line 116 | Company profiles path |
| `.github/workflows/adapt.yml` | Modify lines 6-7 | Trigger paths |
| `.github/workflows/jd-sync.yml` | Modify lines 27, 31 | Company dir paths |
| `web/package.json` | Modify line 7 | `copy-data` script |
| `CLAUDE.md` | Modify | Project structure + personalization |
| `README.md` | Modify | Project structure + personalization |

---

### Task 1: Move user-input files into `data/input/`

**Files:**
- Move: `data/resume.md` → `data/input/resume.md`
- Move: `data/jd/` → `data/input/jd/`

- [ ] **Step 1: Create `data/input/` and move files**

```bash
mkdir -p data/input
git mv data/resume.md data/input/resume.md
git mv data/jd data/input/jd
```

- [ ] **Step 2: Verify the new structure**

```bash
ls -R data/
```

Expected:
```
data/:
adapted  input  llm_cache  slugs.json

data/adapted:
default.json  sample-company.json

data/input:
jd  resume.md

data/input/jd:
sample-company.md

data/llm_cache:
fd6622da15566bd3c560f9351e451e06fdc29c77.json
```

- [ ] **Step 3: Commit**

```bash
git add data/
git commit -m "refactor: move user-input files into data/input/"
```

---

### Task 2: Update `adapt_from_markdown.py` and its test

**Files:**
- Modify: `scripts/adapt_from_markdown.py:192-193`
- Modify: `scripts/tests/test_adapt_from_markdown.py:180-185`

- [ ] **Step 1: Update the test to use `input/` layout**

In `scripts/tests/test_adapt_from_markdown.py`, the `TestAdaptAllFromMarkdown` test creates a temp data directory. Update it to put resume and JDs inside `input/`:

```python
class TestAdaptAllFromMarkdown:
    def test_processes_all_jds_and_default(self, tmp_path):
        # Set up data dir
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        input_dir = data_dir / "input"
        input_dir.mkdir()
        (input_dir / "resume.md").write_text(SAMPLE_RESUME_MD)
        jd_dir = input_dir / "jd"
        jd_dir.mkdir()
        (jd_dir / "techco.md").write_text(SAMPLE_JD_MD)

        client = _mock_client(SAMPLE_LLM_RESPONSE)
        results = adapt_all_from_markdown(data_dir, client=client)

        # One JD + one default = 2 calls
        assert client.messages.create.call_count == 2
        assert "techco" in results
        assert "default" in results
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd web && npm test -- --reporter=verbose 2>&1 || true
cd /home/dev/projects/agentfolio && python -m pytest scripts/tests/test_adapt_from_markdown.py::TestAdaptAllFromMarkdown -v
```

Expected: FAIL — `adapt_all_from_markdown` still reads `data_dir / "resume.md"` which no longer exists in the test fixture.

- [ ] **Step 3: Update `adapt_all_from_markdown` to read from `input/`**

In `scripts/adapt_from_markdown.py`, change lines 192-193 from:

```python
    resume_md = (data_dir / "resume.md").read_text()
    jd_dir = data_dir / "jd"
```

to:

```python
    input_dir = data_dir / "input"
    resume_md = (input_dir / "resume.md").read_text()
    jd_dir = input_dir / "jd"
```

Also update the module docstring on line 3 from:

```python
Reads data/resume.md + data/jd/*.md, produces data/adapted/*.json + data/slugs.json.
```

to:

```python
Reads data/input/resume.md + data/input/jd/*.md, produces data/adapted/*.json + data/slugs.json.
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
python -m pytest scripts/tests/test_adapt_from_markdown.py -v
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/adapt_from_markdown.py scripts/tests/test_adapt_from_markdown.py
git commit -m "refactor: adapt_from_markdown reads from data/input/"
```

---

### Task 3: Update `chat_answer.py` default path

**Files:**
- Modify: `scripts/chat_answer.py:53`

- [ ] **Step 1: Update the default `--resume` argument**

In `scripts/chat_answer.py`, change line 53 from:

```python
    parser.add_argument("--resume", default="data/resume.md")
```

to:

```python
    parser.add_argument("--resume", default="data/input/resume.md")
```

- [ ] **Step 2: Run the chat_answer tests**

```bash
python -m pytest scripts/tests/test_chat_answer.py -v
```

Expected: All tests PASS (tests don't depend on the default path — they pass resume text directly).

- [ ] **Step 3: Commit**

```bash
git add scripts/chat_answer.py
git commit -m "refactor: chat_answer default resume path to data/input/"
```

---

### Task 4: Update `fetch_jds.py` and `jd-sync.yml` company profiles path

**Files:**
- Modify: `scripts/fetch_jds.py:116`
- Modify: `.github/workflows/jd-sync.yml:27,31`

- [ ] **Step 1: Update `fetch_jds.py`**

In `scripts/fetch_jds.py`, change line 116 from:

```python
    profiles_dir = root / "data" / "companies"
```

to:

```python
    profiles_dir = root / "data" / "input" / "companies"
```

- [ ] **Step 2: Run the fetch_jds tests**

```bash
python -m pytest scripts/tests/test_fetch_jds.py -v
```

Expected: All tests PASS (tests use `tmp_path` fixtures, not the hardcoded path).

- [ ] **Step 3: Update `jd-sync.yml`**

In `.github/workflows/jd-sync.yml`, change line 27 from:

```yaml
          if git diff --quiet -- data/companies; then
```

to:

```yaml
          if git diff --quiet -- data/input/companies; then
```

And change line 31 from:

```yaml
          git add data/companies/
```

to:

```yaml
          git add data/input/companies/
```

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch_jds.py .github/workflows/jd-sync.yml
git commit -m "refactor: fetch_jds and jd-sync use data/input/companies/"
```

---

### Task 5: Update `adapt.yml` trigger paths

**Files:**
- Modify: `.github/workflows/adapt.yml:6-7`

- [ ] **Step 1: Update trigger paths**

In `.github/workflows/adapt.yml`, change lines 6-7 from:

```yaml
      - 'data/resume.md'
      - 'data/jd/**'
```

to:

```yaml
      - 'data/input/resume.md'
      - 'data/input/jd/**'
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/adapt.yml
git commit -m "refactor: adapt workflow triggers on data/input/ paths"
```

---

### Task 6: Update `copy-data` build script

**Files:**
- Modify: `web/package.json:7`

- [ ] **Step 1: Update the `copy-data` script**

In `web/package.json`, change line 7 from:

```json
    "copy-data": "node -e \"require('node:fs').cpSync('../data', 'public/data', {recursive: true})\"",
```

to:

```json
    "copy-data": "node -e \"const fs = require('node:fs'); fs.cpSync('../data/adapted', 'public/data/adapted', {recursive: true}); fs.cpSync('../data/slugs.json', 'public/data/slugs.json');\"",
```

This copies only what the web app needs — `adapted/` and `slugs.json` — instead of the entire `data/` tree. Raw resume markdown, JDs, and LLM cache are no longer served publicly.

- [ ] **Step 2: Clean stale `public/data/` and test the build**

```bash
cd web
rm -rf public/data
npm run build
```

Expected: Build succeeds. Check that only the right files were copied:

```bash
ls -R dist/data/
```

Expected:
```
dist/data/:
adapted  slugs.json

dist/data/adapted:
default.json  sample-company.json
```

No `input/`, no `llm_cache/`, no `resume.md` in the output.

- [ ] **Step 3: Test dev server starts**

```bash
cd web
rm -rf public/data
npm run dev -- --host 0.0.0.0 &
sleep 3
curl -sf http://localhost:5173/data/slugs.json | head -5
curl -sf http://localhost:5173/data/adapted/default.json | head -5
kill %1
```

Expected: Both curl commands return valid JSON.

- [ ] **Step 4: Run web unit tests**

```bash
cd web && npm test
```

Expected: All 17 tests pass. (Tests mock fetch calls and don't depend on `public/data/`.)

- [ ] **Step 5: Commit**

```bash
git add web/package.json
git commit -m "refactor: copy-data copies only adapted/ and slugs.json"
```

---

### Task 7: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Update `CLAUDE.md` project structure**

Replace the project structure tree in `CLAUDE.md` with:

```
agentfolio/
├── data/                    # Personal data (replace with your own)
│   ├── input/               # ← User input (the only directory you edit)
│   │   ├── resume.md        # Your resume (any text format — source of truth)
│   │   └── jd/              # Target job descriptions (one .md per role)
│   ├── adapted/             # Adapted resumes (auto-generated by Actions)
│   └── slugs.json           # URL slug registry (auto-generated by Actions)
├── web/                     # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── components/      # ResumeTheme (JSON Resume renderer)
│   │   ├── hooks/           # useVisitorContext, useAdaptation
│   │   ├── utils/           # slugResolver
│   │   ├── styles/          # Global CSS
│   │   ├── types.ts         # TypeScript types
│   │   └── __tests__/       # Vitest unit tests
│   └── e2e/                 # Playwright E2E tests
├── scripts/                 # Python adaptation pipeline
│   ├── adapt_from_markdown.py # Markdown resume + JD → adapted JSON
│   ├── chat_answer.py       # Chat answer generation (reads resume.md)
│   ├── fetch_jds.py         # JD auto-fetching
│   └── aggregate_feedback.py # Analytics aggregation
└── .github/workflows/       # GitHub Actions
    ├── deploy.yml           # Build + deploy to GitHub Pages
    ├── adapt.yml            # Generate adaptations on data/input/ changes
    ├── analytics.yml        # Analytics aggregation
    └── jd-sync.yml          # JD auto-fetching
```

Update the "How to Personalize" section:

```
## How to Personalize

1. Replace `data/input/resume.md` with your resume (any text format)
2. Add target JDs in `data/input/jd/` (one `.md` per role, filename = URL slug)
3. Set secret: `ANTHROPIC_API_KEY`
4. Push — GitHub Actions generates adaptations and deploys
```

Update the "Key Conventions" section — change the resume source of truth line:

```
- **Resume source of truth:** `data/input/resume.md` — any text format. `data/adapted/` and `data/slugs.json` are auto-generated and should not be edited manually.
```

Update the build pipeline convention:

```
- **Build pipeline:** `npm run copy-data` syncs `data/adapted/` and `data/slugs.json` → `web/public/data/` before every build/dev start.
```

- [ ] **Step 2: Update `README.md`**

In the Quick Start section, update steps 3-4:

```
3. **Replace** `data/input/resume.md` with your resume (any format — paste from LinkedIn, PDF text, or write markdown)
4. **Add target positions** in `data/input/jd/` — one `.md` file per role, filename becomes the URL slug (e.g., `data/input/jd/google.md` → `yoursite.com/google`)
```

Update the Personalization table:

```
## Personalization

All personal data lives in `data/input/`. Replace these files with your own:

| File | Purpose |
|------|---------|
| `data/input/resume.md` | Your resume in any text format |
| `data/input/jd/*.md` | Target positions (one .md per role, filename = URL slug) |
| `data/adapted/*.json` | Auto-generated by GitHub Actions — don't edit |
| `data/slugs.json` | Auto-generated from `data/input/jd/` filenames — don't edit |
```

Update the Architecture section:

```
## Architecture

```
web/           React SPA (Vite + TypeScript + styled-components)
scripts/       Python adaptation pipeline (adapt_from_markdown.py)
data/input/    Your personal data (the only directory you edit)
data/          Also contains auto-generated outputs (adapted/, slugs.json)
.github/       GitHub Actions workflows (adapt, deploy)
```
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update project structure for data/input/ consolidation"
```
