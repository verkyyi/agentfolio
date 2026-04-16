import json
from pathlib import Path
from unittest.mock import patch

from scripts.adapt_all import main, run

REPO_ROOT = Path(__file__).resolve().parents[2]


def _write_minimal_repo(tmp_path: Path) -> None:
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)
    (tmp_path / "data" / "companies" / "alpha.json").write_text(
        json.dumps({"company": "Alpha", "role": "Engineer"})
    )
    (tmp_path / "data" / "companies" / "beta.json").write_text(
        json.dumps({"company": "Beta", "role": "Designer"})
    )


def _fake_result(company: str) -> dict:
    return {
        "basics": {
            "name": "Test User",
            "email": "test@example.com",
            "summary": f"Summary for {company}",
            "location": {"city": "Test City"},
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
                "company": company,
                "generated_by": "llm_adapt.py v2.0",
                "match_score": {"overall": 0.5, "by_category": {}, "matched_keywords": [], "missing_keywords": []},
                "skill_emphasis": [],
                "section_order": ["basics", "work", "projects", "skills", "education", "volunteer"],
            },
        },
    }


def test_run_generates_one_file_per_company(tmp_path):
    _write_minimal_repo(tmp_path)

    def fake_generate(company, role, resume, *, client, cache_dir):
        return _fake_result(company)

    with patch("scripts.adapt_all.generate_adaptation", side_effect=fake_generate):
        with patch("scripts.adapt_all.Anthropic"):
            written = run(repo_root=tmp_path)

    assert sorted(p.name for p in written) == ["alpha.json", "beta.json"]
    assert (tmp_path / "data" / "adapted" / "alpha.json").exists()
    assert (tmp_path / "data" / "adapted" / "beta.json").exists()

    alpha = json.loads((tmp_path / "data" / "adapted" / "alpha.json").read_text())
    assert alpha["basics"]["summary"] == "Summary for Alpha"


def test_main_forwards_cache_dir(tmp_path):
    captured: dict = {}

    def fake_run(repo_root, *, cache_dir=None):
        captured["cache_dir"] = cache_dir
        return []

    with patch("scripts.adapt_all.run", side_effect=fake_run):
        rc = main(["--cache-dir", str(tmp_path / "cache")])

    assert rc == 0
    assert captured["cache_dir"] == tmp_path / "cache"
