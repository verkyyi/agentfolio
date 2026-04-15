# AgentFolio Phase 8: Match-Score Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Replace the skill-only keyword counter with a weighted score across skills (1.0), experience-bullet tags (0.5), and project tags (0.5). Target: lift Cohere score from ~24% to ≥70% without inflating unrelated profiles.

**Architecture:** Refactor `_match_score(base_resume, profile)` in `scripts/adapt_one.py`. Introduce three pure helper functions:
- `_skill_matches(base_resume, profile) -> tuple[int, int, list[str]]` — (matched, total, matched_keywords)
- `_bullet_tag_matches(base_resume, profile) -> tuple[float, int, list[str]]`
- `_project_tag_matches(base_resume, profile) -> tuple[float, int, list[str]]`

`_match_score` sums `(weighted_matched / weighted_total)`. `by_category` keeps existing skill-group ratios + adds two new categories: `experience_bullets`, `projects`.

**Tech Stack:** Python 3.11. No new dependencies.

**Out of scope:** semantic embedding scores, weighting by recency, jd-keyword expansion (Phase 6's job).

---

## File Structure

```
agentfolio/
└── scripts/
    ├── adapt_one.py                     # MODIFY: refactor _match_score
    └── tests/
        └── test_adapt_one.py            # MODIFY: add weighted-score tests
```

---

## Task 1: Helper functions + tests

**Files:**
- Modify: `scripts/adapt_one.py`
- Modify: `scripts/tests/test_adapt_one.py`

- [ ] **Step 1:** Read existing `_match_score` and tests.

- [ ] **Step 2:** Add three module-level helpers in `adapt_one.py`:

```python
def _matches_keyword_or_emphasis(item: str, profile: dict) -> str | None:
    """Return the matched keyword/emphasis string, or None."""
    emphasis = set(profile.get("skill_emphasis") or [])
    if item in emphasis:
        return item
    keywords = [k for k in (profile.get("jd_keywords") or [])]
    lowered = item.lower()
    for kw in keywords:
        if kw.lower() in lowered:
            return kw
    return None


def _skill_matches(base_resume: dict, profile: dict):
    matched = 0
    total = 0
    by_category: dict[str, float] = {}
    matched_terms: set[str] = set()
    for group in base_resume["skills"]["groups"]:
        items = group["items"]
        local = sum(1 for it in items if _matches_keyword_or_emphasis(it, profile))
        for it in items:
            t = _matches_keyword_or_emphasis(it, profile)
            if t:
                matched_terms.add(t)
        by_category[group["id"]] = round(local / len(items), 2) if items else 0.0
        matched += local
        total += len(items)
    return matched, total, by_category, matched_terms


def _tag_matches(items: list[dict], profile: dict, tag_field: str = "tags"):
    """Items are objects with a .tags list (bullets, projects)."""
    keywords = {k.lower() for k in (profile.get("jd_keywords") or [])}
    priority = {p.lower() for p in (profile.get("priority_tags") or [])}
    needles = keywords | priority
    matched = 0
    matched_terms: set[str] = set()
    for it in items:
        for tag in it.get(tag_field) or []:
            if tag.lower() in needles:
                matched += 1
                matched_terms.add(tag)
                break  # at most 1 per item
    return matched, len(items), matched_terms
```

- [ ] **Step 3:** Add unit tests for the helpers in `test_adapt_one.py`:

```python
def test_skill_matches_counts_emphasis_and_keywords(base_resume_fixture):
    profile = {"skill_emphasis": ["Python"], "jd_keywords": ["React"]}
    matched, total, by_cat, terms = _skill_matches(base_resume_fixture, profile)
    assert matched > 0
    assert "Python" in terms or "React" in terms


def test_tag_matches_one_per_item():
    items = [
        {"tags": ["agentic", "rag", "python"]},   # one match (any)
        {"tags": ["unrelated"]},
    ]
    profile = {"jd_keywords": ["agentic", "rag"]}
    matched, total, terms = _tag_matches(items, profile)
    assert matched == 1
    assert total == 2
```

- [ ] **Step 4:** Run pytest, expect new tests PASS.

---

## Task 2: Refactor `_match_score` to use weighted sum

**Files:**
- Modify: `scripts/adapt_one.py`
- Modify: `scripts/tests/test_adapt_one.py`

- [ ] **Step 1:** Replace `_match_score` body:

```python
SKILL_WEIGHT = 1.0
BULLET_WEIGHT = 0.5
PROJECT_WEIGHT = 0.5


def _match_score(base_resume: dict, profile: dict) -> dict:
    skill_matched, skill_total, by_category, skill_terms = _skill_matches(base_resume, profile)

    all_bullets = [b for exp in base_resume["experience"] for b in exp["bullets"]]
    bullet_matched, bullet_total, bullet_terms = _tag_matches(all_bullets, profile)
    by_category["experience_bullets"] = round(bullet_matched / bullet_total, 2) if bullet_total else 0.0

    project_matched, project_total, project_terms = _tag_matches(base_resume["projects"], profile)
    by_category["projects"] = round(project_matched / project_total, 2) if project_total else 0.0

    weighted_matched = (
        SKILL_WEIGHT * skill_matched
        + BULLET_WEIGHT * bullet_matched
        + PROJECT_WEIGHT * project_matched
    )
    weighted_total = (
        SKILL_WEIGHT * skill_total
        + BULLET_WEIGHT * bullet_total
        + PROJECT_WEIGHT * project_total
    )
    overall = round(weighted_matched / weighted_total, 2) if weighted_total else 0.0

    matched_terms = sorted(skill_terms | bullet_terms | project_terms)
    profile_keywords = set(profile.get("jd_keywords") or [])
    missing = sorted(profile_keywords - set(matched_terms))

    return {
        "overall": overall,
        "by_category": by_category,
        "matched_keywords": matched_terms,
        "missing_keywords": missing,
    }
```

- [ ] **Step 2:** Update existing `test_match_score_*` assertions if they check exact numeric values — they likely will need adjustment since the formula changed. Run tests, see which fail, update expected values to reflect the new weighted formula. Document old → new score in the test comments.

- [ ] **Step 3:** Add an acceptance test:

```python
def test_cohere_match_score_above_threshold(base_resume_fixture, cohere_profile_fixture):
    """Phase 8 target: Cohere overall ≥ 0.70."""
    result = _match_score(base_resume_fixture, cohere_profile_fixture)
    assert result["overall"] >= 0.70, f"got {result['overall']}"
```

If you need a `cohere_profile_fixture` and one doesn't exist, load `data/companies/cohere.json` directly in the test.

- [ ] **Step 4:** Run full pytest. If Cohere score is below 0.70, **do not** lower the threshold — first inspect what's missing (`matched_keywords` vs `missing_keywords` in the fixture output) and decide whether to:
  (a) widen `KEYWORD_VOCAB` in Phase 6's vocab,
  (b) tag more bullets/projects in `data/resume.json`,
  (c) adjust weights.
  Pick the least-invasive path. Tagging is usually right.

- [ ] **Step 5:** Run `python -m scripts.adapt_all` and inspect `data/adapted/cohere.json`'s `match_score.overall`. Should be ≥ 0.70.

- [ ] **Step 6:** Commit:
```
git add scripts/adapt_one.py scripts/tests/test_adapt_one.py data/resume.json data/adapted/
git commit -m "feat(adapt): weighted match score across skills, bullets, projects"
```

---

## Task 3: Update `AdaptedResume` consumers if `by_category` shape change breaks types

**Files:**
- Check: `web/src/types.ts` (MatchScore type)
- Check: `web/src/components/AdaptiveResume.tsx` and `AdaptationComparison.tsx`

- [ ] **Step 1:** `MatchScore.by_category` is already `Record<string, number>` — adding new keys (`experience_bullets`, `projects`) is non-breaking. Confirm by running `cd web && npx tsc --noEmit`.

- [ ] **Step 2:** No action needed unless a component hard-codes specific group IDs. Skip.

---

## Task 4: Deploy

- [ ] **Step 1:** Merge to main + push.
- [ ] **Step 2:** GitHub Pages auto-deploys; verify `https://verkyyi.github.io/agentfolio/c/cohere-fde` shows updated score in adapted resume rendering (if displayed).

---

## Acceptance Criteria

1. `python -m pytest scripts/tests/` passes, including new `test_cohere_match_score_above_threshold`.
2. `data/adapted/cohere.json` `match_score.overall` ≥ 0.70.
3. `data/adapted/default.json` `match_score.overall` does NOT regress past prior baseline by more than 0.05 (default has empty/light keywords; weighted formula should keep it small).
4. `cd web && npx tsc --noEmit` clean.
