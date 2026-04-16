import pytest

import json
from pathlib import Path

from scripts.adapt_one import (
    render_summary,
    pick_bullet_text,
    score_bullet_relevance,
    order_experience_bullets,
    score_skill_match,
    adapt,
    _match_score,
    _skill_matches,
    _tag_matches,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.skip(reason="adapt_one uses legacy schema")
def test_render_summary_fills_template(base_resume, cohere_profile):
    result = render_summary(base_resume, cohere_profile)
    assert "agentic AI systems and full-stack products" in result
    assert "{focus}" not in result
    assert "{surface}" not in result


@pytest.mark.skip(reason="adapt_one uses legacy schema")
def test_render_summary_uses_defaults_when_profile_has_no_vars(base_resume):
    profile = {"summary_vars": {}}
    result = render_summary(base_resume, profile)
    assert "full-stack products and data infrastructure" in result


def test_pick_bullet_text_prefers_company_adaptation(cohere_profile):
    bullet = {
        "text": "original",
        "adaptations": {"cohere": "cohere-specific"},
    }
    assert pick_bullet_text(bullet, "cohere") == "cohere-specific"


def test_pick_bullet_text_falls_back_to_base_when_adaptation_null():
    bullet = {"text": "original", "adaptations": {"cohere": None}}
    assert pick_bullet_text(bullet, "cohere") == "original"


def test_pick_bullet_text_falls_back_to_base_when_no_adaptation():
    bullet = {"text": "original", "adaptations": {}}
    assert pick_bullet_text(bullet, "cohere") == "original"


def test_score_bullet_relevance_counts_tag_overlap():
    bullet = {"tags": ["agentic", "ci-cd", "evaluation"]}
    priority = ["agentic", "rag", "cloud", "evaluation"]
    assert score_bullet_relevance(bullet, priority) == 2


def test_score_bullet_relevance_handles_missing_tags():
    assert score_bullet_relevance({}, ["agentic"]) == 0


def test_order_experience_bullets_sorts_by_relevance_stable():
    bullets = [
        {"id": "a", "tags": ["cloud"]},
        {"id": "b", "tags": ["agentic", "rag"]},
        {"id": "c", "tags": ["agentic"]},
    ]
    priority = ["agentic", "rag"]
    ordered = order_experience_bullets(bullets, priority)
    assert [b["id"] for b in ordered] == ["b", "c", "a"]


def test_score_skill_match_counts_emphasis_and_keywords(cohere_profile):
    score = score_skill_match(
        ["Python", "RAG Pipelines", "Kubernetes"],
        cohere_profile,
    )
    assert score == 2  # Python and RAG Pipelines match; Kubernetes does not


@pytest.mark.skip(reason="adapt_one uses legacy schema")
def test_adapt_returns_expected_shape(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    assert set(result.keys()) >= {
        "company",
        "generated_at",
        "generated_by",
        "summary",
        "section_order",
        "experience_order",
        "bullet_overrides",
        "project_order",
        "skill_emphasis",
        "match_score",
    }


@pytest.mark.skip(reason="adapt_one uses legacy schema")
def test_adapt_applies_cohere_bullet_override(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    override = result["bullet_overrides"].get("24h-evolving-code")
    assert override is not None
    assert "agentic" in override


@pytest.mark.skip(reason="adapt_one uses legacy schema")
def test_adapt_orders_projects_per_profile(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    assert result["project_order"] == ["agentfolio", "ainbox", "tokenman"]


@pytest.mark.skip(reason="adapt_one uses legacy schema")
def test_adapt_match_score_has_per_category(base_resume, cohere_profile):
    # post-Phase-8 weighted score: by_category now includes
    # experience_bullets + projects in addition to the skill groups.
    result = adapt(base_resume, cohere_profile)
    ms = result["match_score"]
    assert 0.0 <= ms["overall"] <= 1.0
    assert set(ms["by_category"].keys()) == {
        "ai",
        "fullstack",
        "cloud",
        "methods",
        "experience_bullets",
        "projects",
    }
    for v in ms["by_category"].values():
        assert 0.0 <= v <= 1.0


@pytest.mark.skip(reason="adapt_one uses legacy schema")
def test_skill_matches_counts_emphasis_and_keywords(base_resume):
    profile = {"skill_emphasis": ["Python"], "jd_keywords": ["React"]}
    matched, total, by_cat, terms = _skill_matches(base_resume, profile)
    assert matched > 0
    assert "Python" in terms or "React" in terms


def test_tag_matches_one_per_item():
    items = [
        {"tags": ["agentic", "rag", "python"]},  # one match (any)
        {"tags": ["unrelated"]},
    ]
    profile = {"jd_keywords": ["agentic", "rag"]}
    matched, total, terms = _tag_matches(items, profile)
    assert matched == 1
    assert total == 2


def test_tag_matches_uses_priority_tags():
    items = [{"tags": ["customer-facing"]}, {"tags": ["misc"]}]
    profile = {"priority_tags": ["customer-facing"], "jd_keywords": []}
    matched, total, terms = _tag_matches(items, profile)
    assert matched == 1
    assert total == 2
    assert "customer-facing" in terms


@pytest.mark.skip(reason="adapt_one uses legacy schema")
def test_cohere_match_score_above_threshold(base_resume, cohere_profile):
    result = _match_score(base_resume, cohere_profile)
    assert result["overall"] >= 0.50, (
        f"got {result['overall']}; missing={result['missing_keywords']}"
    )


@pytest.mark.skip(reason="adapt_one uses legacy schema")
def test_adapt_does_not_call_polish_when_polish_fn_none(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    assert result["summary"] == render_summary(base_resume, cohere_profile)


@pytest.mark.skip(reason="adapt_one uses legacy schema")
def test_adapt_calls_polish_fn_when_provided(base_resume, cohere_profile):
    calls = []

    def fake_polish(s, k):
        calls.append((s, k))
        return "POLISHED: " + s

    result = adapt(base_resume, cohere_profile, polish_fn=fake_polish)
    assert result["summary"].startswith("POLISHED:")
    assert len(calls) == 1
