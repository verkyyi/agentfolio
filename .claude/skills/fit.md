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

Each fitted file starts with a **fit summary** as an HTML comment, followed by the resume markdown. The summary describes what was changed from the base resume for this target role.

```markdown
<!--
fit-summary:
  target: Company Name — Role Title
  changes:
    - Changed headline from "X" to "Y"
    - Reordered sections: Skills moved above Projects
    - Tailored summary for company's specific focus area
    - Emphasized relevant experience in N bullet points
    - Reordered work entries to lead with most relevant role
-->
# Name
...
```

The `target` field is the company and role from the JD. The `changes` list is 3-6 bullet points describing the key adaptations made. For the default fit (no JD), use `target: General` and describe which directives were applied.

The resume content below the comment is **freeform markdown** with the same structure as `resume.md`. It is NOT JSON. The markdown should:

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
