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
      "generated_by": "claude-code/structurize-skill",
      "greeting": "<greeting line from fit-summary, or omit if absent>",
      "suggestions": ["<3 items from fit-summary suggestions, or omit if absent>"]
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
- For `meta.agentfolio.greeting`: copy the `greeting:` value from the fit-summary block verbatim. Omit the field if the fit-summary has no `greeting:` line.
- For `meta.agentfolio.suggestions`: copy the `suggestions:` list from the fit-summary block verbatim. Omit the field if the fit-summary has no `suggestions:` list, or if the list has a number of items other than 3.

## Output

Write each JSON file with 2-space indentation and a trailing newline. Do not commit — just write the files.
