import pytest

from scripts.adapt_one import (
    render_summary,
    pick_bullet_text,
    score_bullet_relevance,
    order_experience_bullets,
    score_skill_match,
    adapt,
)


def test_render_summary_fills_template(base_resume, cohere_profile):
    result = render_summary(base_resume, cohere_profile)
    assert "agentic AI systems and full-stack products" in result
    assert "{focus}" not in result
    assert "{surface}" not in result


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


def test_adapt_applies_cohere_bullet_override(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    override = result["bullet_overrides"].get("24h-evolving-code")
    assert override is not None
    assert "agentic" in override


def test_adapt_orders_projects_per_profile(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    assert result["project_order"] == ["agentfolio", "ainbox", "tokenman"]


def test_adapt_match_score_has_per_category(base_resume, cohere_profile):
    result = adapt(base_resume, cohere_profile)
    ms = result["match_score"]
    assert 0.0 <= ms["overall"] <= 1.0
    assert set(ms["by_category"].keys()) == {"ai", "fullstack", "cloud", "methods"}
    for v in ms["by_category"].values():
        assert 0.0 <= v <= 1.0
