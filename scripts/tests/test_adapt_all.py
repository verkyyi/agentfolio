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
        json.dumps(
            {
                "company": "Alpha",
                "priority_tags": [],
                "summary_vars": {},
                "section_order": ["summary"],
                "project_order": [],
                "skill_emphasis": [],
                "jd_keywords": [],
            }
        )
    )
    (tmp_path / "data" / "companies" / "beta.json").write_text(
        json.dumps(
            {
                "company": "Beta",
                "priority_tags": [],
                "summary_vars": {},
                "section_order": ["summary"],
                "project_order": [],
                "skill_emphasis": [],
                "jd_keywords": [],
            }
        )
    )


def test_run_generates_one_file_per_profile(tmp_path):
    _write_minimal_repo(tmp_path)

    written = run(repo_root=tmp_path)

    assert sorted(p.name for p in written) == ["alpha.json", "beta.json"]
    assert (tmp_path / "data" / "adapted" / "alpha.json").exists()
    assert (tmp_path / "data" / "adapted" / "beta.json").exists()


def test_run_against_real_repo_produces_cohere_and_default():
    written = run(repo_root=REPO_ROOT)
    names = {p.name for p in written}
    assert "cohere.json" in names
    assert "default.json" in names


def test_run_without_llm_does_not_build_polish_fn(tmp_path):
    """Default run (no llm) must not invoke _build_polish_fn."""
    _write_minimal_repo(tmp_path)

    with patch("scripts.adapt_all._build_polish_fn") as mock_build:
        run(repo_root=tmp_path)
        assert mock_build.call_count == 0


def test_run_forwards_llm_flag_to_polish_fn(tmp_path):
    """When llm=True, run() must build a polish_fn and pass it to each adapt() call."""
    _write_minimal_repo(tmp_path)

    captured_calls: list[tuple[str, list[str]]] = []

    def fake_polish(summary: str, keywords: list[str]) -> str:
        captured_calls.append((summary, list(keywords)))
        return "POLISHED: " + summary

    with patch(
        "scripts.adapt_all._build_polish_fn", return_value=fake_polish
    ) as mock_build:
        run(repo_root=tmp_path, llm=True)
        assert mock_build.call_count == 1
        # Verify the polish_fn was actually wired into adapt() for each profile
        assert len(captured_calls) == 2  # alpha + beta

    # Output summaries should reflect the polished prefix
    alpha = json.loads((tmp_path / "data" / "adapted" / "alpha.json").read_text())
    beta = json.loads((tmp_path / "data" / "adapted" / "beta.json").read_text())
    assert alpha["summary"].startswith("POLISHED:")
    assert beta["summary"].startswith("POLISHED:")


def test_main_forwards_llm_and_cache_dir(tmp_path):
    """main(['--llm', '--cache-dir', X]) must propagate both to run()."""
    captured: dict = {}

    def fake_run(repo_root, *, llm=False, cache_dir=None):
        captured["repo_root"] = repo_root
        captured["llm"] = llm
        captured["cache_dir"] = cache_dir
        return []

    with patch("scripts.adapt_all.run", side_effect=fake_run):
        rc = main(["--llm", "--cache-dir", str(tmp_path / "cache")])

    assert rc == 0
    assert captured["llm"] is True
    assert captured["cache_dir"] == tmp_path / "cache"


def test_main_without_llm_defaults(tmp_path):
    captured: dict = {}

    def fake_run(repo_root, *, llm=False, cache_dir=None):
        captured["llm"] = llm
        captured["cache_dir"] = cache_dir
        return []

    with patch("scripts.adapt_all.run", side_effect=fake_run):
        rc = main([])

    assert rc == 0
    assert captured["llm"] is False
    assert captured["cache_dir"] is None
