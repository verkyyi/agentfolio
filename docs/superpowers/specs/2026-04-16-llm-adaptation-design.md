# LLM-Powered Resume Adaptation

## Summary

Replace the deterministic `adapt()` pipeline with a single LLM call that generates the full adapted resume directly. The LLM receives `resume.json` + company/role and outputs the complete `AdaptedResume` JSON that the frontend consumes. No intermediate profile schema, no fallback.

## Architecture

### Flow

```
self-ID (company + role)
    ↓
write companies/{slug}.json          ← minimal input record
    ↓
generate_adaptation(company, role, resume)  ← single LLM call
    ↓
write adapted/{slug}.json            ← frontend-ready output
    ↓
update slugs.json                    ← auto-register
    ↓
commit + push
```

### New Module: `scripts/llm_adapt.py`

Single responsibility: given company, role, and base resume, return an adapted resume via one Claude API call.

```python
def generate_adaptation(
    company: str,
    role: str,
    base_resume: dict,
    *,
    client: Any,
    model: str = "claude-haiku-4-5",
    cache_dir: Path,
) -> dict:
```

**Prompt strategy:**

The system prompt includes:
- The full `resume.json` content
- Target company name and role title
- The exact output JSON schema with field descriptions and constraints

**Constraints enforced via prompt:**
- `experience_order` values must be existing experience IDs from resume.json
- `project_order` values must be existing project IDs from resume.json
- `section_order` values must be the 6 known section names: `summary`, `experience`, `projects`, `skills`, `education`, `volunteering`
- `bullet_overrides` keys must be valid bullet IDs from resume.json
- `skill_emphasis` items must be exact strings from the skills groups in resume.json
- `match_score.overall` must be between 0.0 and 1.0
- `match_score.by_category` keys must be skill group IDs from resume.json

**Output schema** (matches `AdaptedResume` type the frontend expects):

```json
{
  "company": "Stripe",
  "generated_at": "2026-04-16T12:00:00+00:00",
  "generated_by": "llm_adapt.py v1.0",
  "summary": "Free-form tailored summary text...",
  "section_order": ["summary", "projects", "experience", "skills", "education", "volunteering"],
  "experience_order": ["24helpful", "24haowan", "maiduote"],
  "bullet_overrides": {
    "24h-evolving-code": "Rewritten bullet text tailored to Stripe..."
  },
  "project_order": ["agentfolio", "ainbox", "tokenman"],
  "skill_emphasis": ["Python", "LLM Integration"],
  "match_score": {
    "overall": 0.82,
    "by_category": { "ai": 0.9, "fullstack": 0.7, "cloud": 0.8, "methods": 0.6 },
    "matched_keywords": ["Python", "distributed systems"],
    "missing_keywords": ["Ruby", "Kafka"]
  }
}
```

**Caching:** SHA1 hash of `(company, role, sha1(resume.json content))` → `data/llm_cache/{hash}.json`. Cache hit returns immediately without an API call.

**No fallback.** If the LLM call fails or returns unparseable JSON, the error propagates. The GitHub Actions workflow already handles errors via issue comments and labels.

### Simplified `companies/{slug}.json`

Becomes a minimal input record:

```json
{
  "company": "Stripe",
  "role": "Forward Deployed Engineer"
}
```

Existing company files (cohere, openai, apple, default) will be trimmed to this shape. The old profile fields (`priority_tags`, `summary_vars`, `skill_emphasis`, `jd_keywords`, `section_order`, `project_order`) are removed.

### Modified: `scripts/adapt_on_request.py`

Simplified flow:
1. Write `companies/{slug}.json` with `{company, role}`
2. Load `resume.json`
3. Call `generate_adaptation(company, role, resume)`
4. Write `adapted/{slug}.json`
5. Update `slugs.json`

The existing `build_profile()` function is removed. Import of `adapt` from `adapt_one` is removed.

### Modified: `scripts/adapt_all.py`

Weekly regeneration reads each `companies/{slug}.json` (now just `{company, role}`), calls `generate_adaptation()` for each. LLM cache means repeat runs with unchanged inputs are free.

### Modified: `.github/workflows/adapt-on-request.yml`

- Add `ANTHROPIC_API_KEY` env var to the "Run adaptation" step
- `git add` line already includes `data/companies/`, `data/adapted/`, and `data/slugs.json`
- No other workflow changes needed

### Unchanged

- **Frontend** — consumes the same `AdaptedResume` shape, no changes
- **`web/src/types.ts`** — `AdaptedResume` type unchanged
- **`scripts/llm_polish.py`** — unused by this path but stays in repo (no cleanup needed)
- **`scripts/adapt_one.py`** — deterministic adapter remains in repo but is no longer called by the live or batch paths
- **Progress signals** — same issue comment flow, same polling from frontend
- **Slug auto-registration** — already implemented, no changes

## Data Migration

Trim existing `companies/*.json` files to `{company, role}` only:
- `cohere.json` → `{"company": "Cohere", "role": "FDE, Agentic Platform"}`
- `openai.json` → `{"company": "OpenAI", "role": "Forward Deployed Engineer"}`
- `apple.json` → `{"company": "Apple", "role": "Software Engineer"}`
- `default.json` → `{"company": "default", "role": null}`

Regenerate all `adapted/*.json` files using the new LLM path.

## Cost & Performance

- **Model:** Claude Haiku 4.5 — fast, cheap, sufficient for structured JSON generation
- **Input tokens:** ~2k (resume.json) + ~500 (prompt/schema) = ~2.5k
- **Output tokens:** ~1.5k (adapted resume JSON)
- **Cost per adaptation:** ~$0.003
- **Latency:** ~5-15s for the LLM call (within the existing ~60s workflow budget)
- **Cache:** Repeat runs for same company+role+resume are free
