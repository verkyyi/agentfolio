---
name: adapt
description: Use when the user wants to generate or regenerate adapted resumes from data/input/resume.md and data/input/jd/*.md
---

# Adapt Resumes

Generate adapted JSON Resume documents from a markdown resume and target job descriptions.

## Steps

1. Read `data/input/resume.md`
2. Glob `data/input/jd/*.md` to find all target JDs
3. For each JD file, generate an adapted JSON Resume and write to `data/adapted/{slug}.json` (where slug = JD filename without extension)
4. Generate a default adaptation (no JD) and write to `data/adapted/default.json`

## Output Schema

Each output file must be valid JSON matching this schema exactly:

```json
{
  "basics": {
    "name": "<extracted from resume>",
    "label": "<professional title>",
    "email": "<extracted from resume>",
    "phone": "<extracted or null>",
    "summary": "<tailored summary, 2-3 sentences>",
    "location": { "city": "<city>", "region": "<state/region>", "countryCode": "<country code>" },
    "profiles": [{ "network": "<name>", "url": "<url>", "username": "<optional>" }]
  },
  "work": [
    {
      "id": "<slug>",
      "name": "<company name>",
      "position": "<position>",
      "location": "<location>",
      "startDate": "<YYYY-MM>",
      "endDate": "<YYYY-MM or omit if current>",
      "highlights": ["<tailored bullet text>"]
    }
  ],
  "projects": [
    {
      "id": "<slug>",
      "name": "<project name>",
      "description": "<one-line description>",
      "url": "<url or omit>",
      "github": "<github url or omit>",
      "startDate": "<YYYY-MM>",
      "highlights": ["<tailored text>"],
      "keywords": ["<tech keywords>"]
    }
  ],
  "skills": [
    { "id": "<slug>", "name": "<category>", "keywords": ["<skill1>", "..."] }
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
      "company": "<target company name or 'default'>",
      "role": "<target role or null>",
      "generated_by": "claude-code/adapt-skill",
      "match_score": {
        "overall": "<0.0 to 1.0>",
        "by_category": { "<skill_id>": "<0.0 to 1.0>" },
        "matched_keywords": ["<relevant keywords found>"],
        "missing_keywords": ["<required keywords not found>"]
      },
      "skill_emphasis": ["<exact skill strings to highlight in UI>"],
      "section_order": ["basics", "<most relevant section>", "...", "<least relevant>"]
    }
  }
}
```

## Constraints

- Extract ALL factual information from the resume — do not omit entries
- Work and project entries: order by relevance to the target role (most relevant first)
- Highlights: rewrite to emphasize relevance to target role, but keep factual claims intact
- Summary: specific to the target company/role, not generic
- match_score: honestly reflect how well the candidate fits
- section_order: must contain all 6 values, ordered by relevance to the role
- skill_emphasis: exact strings from the skills keywords list

## Default Adaptation

When generating the default (no JD), use these settings:
- company: "default"
- role: null
- Summary: a general professional summary
- match_score.overall: 0.5 (neutral)
- section_order: standard order ["basics", "work", "projects", "skills", "education", "volunteer"]

## Output

Write each adapted JSON file with 2-space indentation and a trailing newline. Do not commit — just write the files.
