# Public Exposure Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the AgentFolio repo for developer discovery with README screenshots, live demo link, repo metadata, and LICENSE file.

**Architecture:** Capture screenshots via Playwright, update README with hero section and expanded features, add MIT LICENSE, set GitHub repo metadata via CLI.

**Tech Stack:** Playwright (screenshots), gh CLI (repo metadata), markdown

---

### Task 1: Capture screenshots

**Files:**
- Create: `docs/screenshots/resume.png`
- Create: `docs/screenshots/dashboard.png`

- [ ] **Step 1: Create screenshots directory**

```bash
mkdir -p docs/screenshots
```

- [ ] **Step 2: Capture resume screenshot**

Use Playwright MCP to navigate to `https://verkyyi.github.io/agentfolio/` and take a full-page screenshot. Save to `docs/screenshots/resume.png`.

Resize browser to 1200x900 first for consistent width. Take screenshot.

- [ ] **Step 3: Capture dashboard screenshot**

Navigate to `https://verkyyi.github.io/agentfolio/dashboard`. Click the "notion" sidebar button so it's selected and the preview tab with fit-summary card is visible. Take screenshot. Save to `docs/screenshots/dashboard.png`.

- [ ] **Step 4: Verify screenshots exist and are reasonable size**

```bash
ls -la docs/screenshots/
```

Expected: two PNG files, each roughly 100KB-500KB.

- [ ] **Step 5: Commit**

```bash
git add docs/screenshots/
git commit -m "docs: add resume and dashboard screenshots"
```

---

### Task 2: Add LICENSE file

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create MIT LICENSE file**

Create `LICENSE` at repo root:

```
MIT License

Copyright (c) 2026 AgentFolio Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "docs: add MIT LICENSE file"
```

---

### Task 3: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the hero section**

Replace lines 1-13 (from `# AgentFolio` through the routing code block) with:

```markdown
# AgentFolio

An open-source agentic portfolio engine. Fork it, drop in your resume, and deploy a portfolio site that adapts to each visitor's context.

![Resume preview](docs/screenshots/resume.png)

**[Live Demo](https://verkyyi.github.io/agentfolio/)** · **[Dashboard Demo](https://verkyyi.github.io/agentfolio/dashboard)**

## How It Works

AgentFolio renders a resume adapted to the target company and role. A three-stage pipeline (`/fit` → `/extract-directives` → `/structurize`) tailors your resume, lets you edit the result in markdown, and converts it to JSON Resume for rendering and PDF export. Each URL slug maps to a tailored adaptation.

```
/                    → default resume
/company-slug        → company-specific adaptation
/dashboard           → owner dashboard (not public)
/unknown             → 404 page
```
```

- [ ] **Step 2: Add dashboard screenshot after Features heading**

Insert after the Features heading (before the feature list), add:

```markdown
![Dashboard](docs/screenshots/dashboard.png)
*Owner dashboard for reviewing fitted resumes, diffs, and PDFs*
```

- [ ] **Step 3: Update the Features list**

Replace the existing Features list with:

```markdown
- **Three-stage pipeline** — separate tailoring from schema conversion, with human editing in between
- **Directive learning** — your edits are automatically extracted as reusable preferences
- **Preset directives** — research-backed resume optimization rules out of the box
- **Owner dashboard** — preview, word-level diff, inline PDF, and JD tabs for each fitted resume
- **Fit summaries** — auto-generated change descriptions for each adaptation
- **PDF export** — auto-generated PDFs alongside each adaptation, with a download button on the site
- **Zero-runtime quickstart** — fork, add markdown files, push, deployed. No local tools needed.
- **JSON Resume theme** — renders all 12 JSON Resume sections using the developer-mono theme
```

- [ ] **Step 4: Verify README renders correctly**

Open `README.md` and visually check that the markdown structure is valid — no broken image paths, no unclosed code blocks.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add hero screenshots and expanded features to README"
```

---

### Task 4: Set repo metadata

**Files:** None (GitHub API only)

- [ ] **Step 1: Set description and homepage**

```bash
gh repo edit --description "Open-source agentic portfolio engine — fork, drop in your resume, deploy. Adapts to each target role with Claude." --homepage "https://verkyyi.github.io/agentfolio/"
```

- [ ] **Step 2: Set topics**

```bash
gh repo edit --add-topic resume --add-topic portfolio --add-topic claude --add-topic github-pages --add-topic json-resume --add-topic ai --add-topic open-source
```

- [ ] **Step 3: Verify**

```bash
gh repo view --json description,homepageUrl,repositoryTopics
```

Expected: description, homepage URL, and all 7 topics set.

- [ ] **Step 4: Push all commits**

```bash
git push
```
