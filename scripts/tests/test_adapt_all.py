import json
from pathlib import Path

from scripts.adapt_all import run

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_run_generates_one_file_per_profile(tmp_path):
    # Mirror repo structure in tmp
    (tmp_path / "data" / "companies").mkdir(parents=True)
    (tmp_path / "data" / "adapted").mkdir(parents=True)

    # Copy real base resume
    base = (REPO_ROOT / "data" / "resume.json").read_text()
    (tmp_path / "data" / "resume.json").write_text(base)

    # Write two minimal profiles
    (tmp_path / "data" / "companies" / "alpha.json").write_text(json.dumps({
        "company": "Alpha", "priority_tags": [], "summary_vars": {},
        "section_order": ["summary"], "project_order": [],
        "skill_emphasis": [], "jd_keywords": []
    }))
    (tmp_path / "data" / "companies" / "beta.json").write_text(json.dumps({
        "company": "Beta", "priority_tags": [], "summary_vars": {},
        "section_order": ["summary"], "project_order": [],
        "skill_emphasis": [], "jd_keywords": []
    }))

    written = run(repo_root=tmp_path)

    assert sorted(p.name for p in written) == ["alpha.json", "beta.json"]
    assert (tmp_path / "data" / "adapted" / "alpha.json").exists()
    assert (tmp_path / "data" / "adapted" / "beta.json").exists()


def test_run_against_real_repo_produces_cohere_and_default():
    written = run(repo_root=REPO_ROOT)
    names = {p.name for p in written}
    assert "cohere.json" in names
    assert "default.json" in names
