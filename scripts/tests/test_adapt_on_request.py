import json
from pathlib import Path
from unittest.mock import patch

from scripts.adapt_on_request import run

REPO_ROOT = Path(__file__).resolve().parents[2]


def _fake_adaptation():
    return {
        "basics": {
            "name": "Test User",
            "email": "test@example.com",
            "summary": "Tailored for Stripe.",
            "location": {"city": "Test City", "region": "TC"},
            "profiles": [],
        },
        "work": [],
        "projects": [],
        "skills": [],
        "education": [],
        "volunteer": [],
        "meta": {
            "version": "1.0.0",
            "agentfolio": {
                "company": "Stripe",
                "generated_by": "llm_adapt.py v2.0",
                "match_score": {"overall": 0.75, "by_category": {}, "matched_keywords": ["Python"], "missing_keywords": []},
                "skill_emphasis": ["Python"],
                "section_order": ["basics", "work", "projects", "skills", "education", "volunteer"],
            },
        },
    }


def test_run_writes_company_and_adapted_json(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)

    fake = _fake_adaptation()
    with patch("scripts.adapt_on_request.generate_adaptation", return_value=fake):
        company_path, adapted_path = run(
            company="Stripe",
            role="Forward Deployed Engineer",
            repo_root=tmp_path,
        )

    assert company_path == tmp_path / "data" / "companies" / "stripe.json"
    assert adapted_path == tmp_path / "data" / "adapted" / "stripe.json"
    assert company_path.exists()
    assert adapted_path.exists()

    company = json.loads(company_path.read_text())
    assert company == {"company": "Stripe", "role": "Forward Deployed Engineer"}

    adapted = json.loads(adapted_path.read_text())
    assert adapted["meta"]["agentfolio"]["company"] == "Stripe"
    assert adapted["basics"]["summary"] == "Tailored for Stripe."
    assert "match_score" in adapted["meta"]["agentfolio"]


def test_run_normalizes_slug(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)

    fake = _fake_adaptation()
    fake["meta"]["agentfolio"]["company"] = "Scale AI"
    with patch("scripts.adapt_on_request.generate_adaptation", return_value=fake):
        company_path, adapted_path = run(
            company="Scale AI",
            role="FDE",
            repo_root=tmp_path,
        )

    assert company_path.name == "scale-ai.json"
    assert adapted_path.name == "scale-ai.json"


def test_run_updates_slugs_registry(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)
    (tmp_path / "data" / "slugs.json").write_text(json.dumps({}))

    fake = _fake_adaptation()
    with patch("scripts.adapt_on_request.generate_adaptation", return_value=fake):
        run(company="Stripe", role="FDE", repo_root=tmp_path)

    slugs = json.loads((tmp_path / "data" / "slugs.json").read_text())
    assert "stripe" in slugs
    assert slugs["stripe"]["company"] == "stripe"
    assert slugs["stripe"]["context"] == "Auto-generated from self-ID"


def test_run_does_not_overwrite_existing_slug(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)
    existing = {"stripe": {"company": "stripe", "role": "FDE", "created": "2026-01-01", "context": "Manual"}}
    (tmp_path / "data" / "slugs.json").write_text(json.dumps(existing))

    fake = _fake_adaptation()
    with patch("scripts.adapt_on_request.generate_adaptation", return_value=fake):
        run(company="Stripe", role="FDE", repo_root=tmp_path)

    slugs = json.loads((tmp_path / "data" / "slugs.json").read_text())
    assert slugs["stripe"]["context"] == "Manual"
