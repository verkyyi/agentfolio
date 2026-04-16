import json
from pathlib import Path
from unittest.mock import patch

from scripts.adapt_on_request import run

REPO_ROOT = Path(__file__).resolve().parents[2]


def _fake_adaptation():
    resume = json.loads((REPO_ROOT / "data" / "resume.json").read_text())
    exp_ids = [e["id"] for e in resume["experience"]]
    proj_ids = [p["id"] for p in resume["projects"]]
    group_ids = [g["id"] for g in resume["skills"]["groups"]]
    return {
        "company": "Stripe",
        "generated_at": "2026-04-16T00:00:00+00:00",
        "generated_by": "llm_adapt.py v1.0",
        "summary": "Tailored for Stripe.",
        "section_order": ["summary", "projects", "experience", "skills", "education", "volunteering"],
        "experience_order": exp_ids,
        "bullet_overrides": {},
        "project_order": proj_ids,
        "skill_emphasis": ["Python"],
        "match_score": {
            "overall": 0.75,
            "by_category": {gid: 0.5 for gid in group_ids},
            "matched_keywords": ["Python"],
            "missing_keywords": [],
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
    assert adapted["company"] == "Stripe"
    assert adapted["summary"] == "Tailored for Stripe."


def test_run_normalizes_slug(tmp_path):
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)

    fake = _fake_adaptation()
    fake["company"] = "Scale AI"
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
