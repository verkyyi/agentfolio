import json
from pathlib import Path

from scripts.adapt_on_request import build_profile, run

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_build_profile_returns_default_shape_with_overrides():
    default = {
        "company": "default",
        "role": None,
        "priority_tags": ["full-stack"],
        "summary_vars": {"focus": "x"},
        "section_order": ["summary"],
        "project_order": [],
        "skill_emphasis": ["Python"],
        "jd_keywords": [],
    }
    profile = build_profile("Stripe", "Forward Deployed Engineer", default)
    assert profile["company"] == "Stripe"
    assert profile["role"] == "Forward Deployed Engineer"
    # unchanged fields are preserved
    assert profile["priority_tags"] == ["full-stack"]
    assert profile["skill_emphasis"] == ["Python"]


def test_build_profile_is_independent_of_input_dict():
    default = {"company": "default", "role": None, "priority_tags": [],
               "summary_vars": {}, "section_order": [], "project_order": [],
               "skill_emphasis": [], "jd_keywords": []}
    profile = build_profile("Stripe", "FDE", default)
    profile["priority_tags"].append("mutated")
    assert default["priority_tags"] == []


def test_run_writes_company_profile_and_adapted_json(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)

    base = (REPO_ROOT / "data" / "resume.json").read_text()
    default = (REPO_ROOT / "data" / "companies" / "default.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)
    (tmp_path / "data" / "companies" / "default.json").write_text(default)

    profile_path, adapted_path = run(
        company="Stripe",
        role="Forward Deployed Engineer",
        repo_root=tmp_path,
    )

    assert profile_path == tmp_path / "data" / "companies" / "stripe.json"
    assert adapted_path == tmp_path / "data" / "adapted" / "stripe.json"
    assert profile_path.exists()
    assert adapted_path.exists()

    profile = json.loads(profile_path.read_text())
    assert profile["company"] == "Stripe"
    assert profile["role"] == "Forward Deployed Engineer"

    adapted = json.loads(adapted_path.read_text())
    assert adapted["company"] == "Stripe"
    assert "summary" in adapted
    assert "match_score" in adapted


def test_run_normalizes_company_for_filename(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    default = (REPO_ROOT / "data" / "companies" / "default.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)
    (tmp_path / "data" / "companies" / "default.json").write_text(default)

    profile_path, adapted_path = run(
        company="Scale AI",
        role="FDE, GenAI",
        repo_root=tmp_path,
    )
    assert profile_path.name == "scale-ai.json"
    assert adapted_path.name == "scale-ai.json"
