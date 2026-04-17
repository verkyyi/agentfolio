---
name: grow-resume
description: Use when the user wants to expand or iterate their base resume (data/input/resume.md) to provide richer raw material for /fit — conversational, section-by-section, informed by career goals
---

# Grow Resume

Expand and iterate `data/input/resume.md` through a structured conversation so `/fit` has richer raw material to select, reorder, and rephrase from when tailoring to specific JDs.

`/fit` can only emphasize what is already in the base. A thin base caps fitted output quality. This skill grows the base into a superset — bullet depth, keyword coverage, tech-stack specificity, substantiation — while enforcing integrity (no fabrication).

## Usage

- `/grow-resume` — run in the appropriate mode (detected automatically)
- `/grow-resume experience` — jump straight to Experience section (re-entry mode)
- `/grow-resume projects`, `/grow-resume skills`, `/grow-resume summary` — section shortcuts

## Mode Detection

Read `data/input/career-goal.md`:

- **Absent, empty, or missing the `## Target Roles` section** → **first-time mode** (full flow)
- **Present and well-formed** → **re-entry mode** (scoped iteration)

If `career-goal.md` exists but `resume.md` has not been updated since it was written, the previous run was likely aborted mid-flow. Ask the user whether to **continue** the interrupted walk or **restart** from section selection.

## Persisted State: `data/input/career-goal.md`

This file captures the user's target roles and constraints so the skill can return to it across sessions. Read by `/grow-resume` on every run. Human-editable.

Format:

```markdown
# Career Goal

Last updated: YYYY-MM-DD

## Target Roles
Primary: {role type — e.g., "Forward Deployed Engineer / Solutions Engineer"}
Also considering: {list, or "none"}

## Target Companies (optional)
{named companies, or "unspecified"}

## Constraints
- Location: {e.g., "SF Bay / NYC / remote-OK"}
- Seniority: {e.g., "senior / staff / founding"}
- Other: {any additional constraint}

## Notes
{free-form context the user wants to preserve}
```

## First-Time Mode

Run this flow when `career-goal.md` does not exist.

### 1. Read context

- `data/input/resume.md` (required — error if missing)
- `data/input/directives.md` (read if present; it drives the gap audit)
- `data/input/jd/*.md` (list for awareness; informs priority framing)
- `data/fitted/*.md` (list only; do not modify)

### 2. Elicit career goal

Ask the user which role types they are targeting, using multiple choice:

- A. Forward Deployed Engineer / Solutions Engineer
- B. Founding / early-stage engineer
- C. AI / ML / Agent engineer (IC track at larger companies)
- D. Tech lead / Eng manager
- E. Product-leaning roles (PM, TPM, product engineer)
- F. Research / applied science
- G. Something else (user specifies)

Multiple selections allowed. Follow up for named target companies, location, seniority, any other constraints. Write `data/input/career-goal.md` once the user confirms.

### 3. Diagnose gaps against directives

Read directives. Audit the current base against them. Common gaps to check:

- **Bullet depth.** Do recent roles meet the directives' bullet-count target (typically 4-6)?
- **Substantiation.** Every Skills item must be backed by at least one bullet in Experience or Projects. List skills that appear only in the Skills section.
- **Summary presence.** If directives call for a summary and the base has none, flag it.
- **Quantified achievements.** Each role should carry at least one metric. Flag roles without one.
- **Keyword specificity.** Bullets that say "cloud infrastructure" without naming services give `/fit` nothing to match against JD keywords. Flag generic phrasings.
- **Role ordering.** Older roles (>5 years) should compress to 1-2 bullets per directives; current role should have the most.

### 4. Propose priorities informed by the goal

Rank the gaps by usefulness for the user's chosen target roles. Present the top 3-4 as a ranked list with one-sentence rationale each. The user confirms or reorders.

### 5. Section-by-section walk

Walk the sections one at a time. For each, show current content, ask targeted unlock questions, draft expanded content, confirm with the user, move on. Within Experience and Projects (multi-entry sections), take **one entry per turn** — do not dump prompts for all roles at once.

When drafting, always confirm with the user whether to **add** new bullets alongside existing ones, **rewrite** existing bullets, or **both**. Integrity checks (step 6) apply inline to every draft, not only at the end.

**Experience** — per role, ask:
- One customer + one problem (anonymized is fine)
- Scale numbers (tenants, users, request volume, team size, funding raised)
- Named tech stack (replace generic phrasings with specific tools)
- LLM/agent work surfaced from side-project context
- A concrete incident/war story (FDE signal)
- POC / pilot / onboarding motion

**Projects** — per project, differentiate from Experience bullets (no verbatim overlap). Ask:
- Users / traction signal (beta count, stars, external listing)
- Tech stack not already covered in Experience
- Hardest technical problem solved

**Skills** — for each unsubstantiated skill, prompt `keep + bullet hook`, `cut`, or `demote`. Remove items the user can't back up.

**Summary** — if missing, draft a 2-3 sentence prose summary anchored in the career goal, using the strongest quantified metric and naming the target role type. Keep under 50 words (or whatever directives specify).

**New sections** — quick yes/no on Certifications, Talks / Demos, Open Source Contributions, Awards. Only add sections that have real material; skip empty placeholders.

### 6. Integrity checks

Integrity applies at two layers:

- **Inline, per section.** As each draft is produced in step 5, scan for overstatement, unshipped claims, and invented metrics. Flag them to the user in the same turn, not at the end.
- **Final sanity scan before preview.** Once all sections are drafted, re-read the assembled resume as a whole and check for any overstatements that only become visible in aggregate (e.g., the same metric being double-counted across role and project bullets).

What to watch for:

- **Overstated scope.** "Enterprise customers" when users were friends. "50% reduction" with no measured baseline. Rewrite honestly.
- **Unshipped claims.** Features described as real that are roadmap. Check against the linked URLs / repos when possible.
- **Invented metrics.** Numbers not supplied by the user. Remove or soften to original wording.

Surface every rewrite explicitly — never slip integrity adjustments in silently.

### 7. Preview, approve, write

Present the fully assembled resume in a single message. Ask for approval. On approval, write to `data/input/resume.md`. Do not commit — just write the file.

## Re-entry Mode

Run this flow when `career-goal.md` exists.

1. Read `career-goal.md` and restate the target to the user. Ask: *"Still current?"* If the user wants changes, revise and rewrite the file.
2. Ask: *"Which section do you want to iterate — experience / projects / skills / summary / new additions?"* (Or honor the section argument if passed: `/grow-resume experience`.)
3. Run the relevant subset of step 5 above (only the chosen section).
4. Integrity pass on the changes.
5. Preview, approve, write.

## Non-goals

- **No directives.md edits.** That is `/extract-directives`'s job.
- **No JD management.** Adding or editing `data/input/jd/*.md` is out of scope.
- **No fitted regeneration.** After writing `resume.md`, suggest the user run `/fit` — do not run it automatically.
- **No adapted / PDF regeneration.** Those are downstream of `/fit`.
- **No git commits.** Writing files only.

## Constraints

- Preserve all factual information already in the base — dates, company names, URLs, numbers.
- Never invent metrics, customers, or shipped features. When a number isn't available, keep qualitative wording.
- Confirm every integrity rewrite with the user before writing.
- Keep the conversation section-by-section. One section per turn. No multi-section dumps.

## Output

Write `data/input/resume.md` and (in first-time mode) `data/input/career-goal.md`. Do not commit — just write the files. After writing, remind the user that `/fit` should be re-run to regenerate fitted output against the expanded base.
