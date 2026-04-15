from scripts.aggregate_feedback import aggregate


def make_session(company, duration_s=60, scroll=0.5, sections=None, projects=None, ctas=None):
    events = []
    events.append({
        "type": "session_start",
        "data": {"company": company, "source": "slug", "adaptation": company, "match_score": 0.5},
        "ts": 1,
    })
    events.append({
        "type": "session_heartbeat",
        "data": {"duration_ms": duration_s * 1000, "max_scroll_pct": scroll},
        "ts": duration_s * 1000,
    })
    for section, ms in (sections or {}).items():
        events.append({"type": "section_dwell", "data": {"section": section, "ms": ms}, "ts": 100})
    for pid in projects or []:
        events.append({"type": "project_click", "data": {"project_id": pid, "link": "url"}, "ts": 200})
    for target in ctas or []:
        events.append({"type": "cta_click", "data": {"target": target}, "ts": 300})
    return {"session_id": f"s-{company}", "events": events}


def test_aggregate_counts_sessions_per_company():
    sessions = [
        make_session("cohere"),
        make_session("cohere"),
        make_session("stripe"),
    ]
    result = aggregate(sessions)
    assert result["total_sessions"] == 3
    assert result["unique_companies"] == 2
    assert result["by_company"]["cohere"]["sessions"] == 2
    assert result["by_company"]["stripe"]["sessions"] == 1


def test_aggregate_averages_duration_and_scroll():
    sessions = [
        make_session("cohere", duration_s=60, scroll=0.5),
        make_session("cohere", duration_s=100, scroll=0.9),
    ]
    result = aggregate(sessions)
    c = result["by_company"]["cohere"]
    assert c["avg_duration_s"] == 80.0
    assert c["avg_max_scroll_pct"] == 0.7


def test_aggregate_section_dwell_averages_only_across_sessions_that_recorded_it():
    sessions = [
        make_session("cohere", sections={"projects": 10000}),
        make_session("cohere", sections={"projects": 30000, "experience": 5000}),
    ]
    result = aggregate(sessions)
    s = result["by_company"]["cohere"]["section_dwell_avg_s"]
    assert s["projects"] == 20.0
    assert s["experience"] == 5.0


def test_aggregate_sums_project_and_cta_clicks():
    sessions = [
        make_session("cohere", projects=["agentfolio", "agentfolio", "ainbox"], ctas=["email", "linkedin"]),
        make_session("cohere", projects=["agentfolio"], ctas=["email"]),
    ]
    result = aggregate(sessions)
    c = result["by_company"]["cohere"]
    assert c["project_clicks"] == {"agentfolio": 3, "ainbox": 1}
    assert c["cta_clicks"] == {"email": 2, "linkedin": 1}


def test_aggregate_global_top_projects_sorted_desc():
    sessions = [
        make_session("cohere", projects=["a", "a", "b"]),
        make_session("stripe", projects=["a", "c", "c", "c"]),
    ]
    result = aggregate(sessions)
    top = result["global"]["top_projects"]
    assert top[0] == ["c", 3]
    assert top[1] == ["a", 3] or top[1][1] == 3
    assert sum(v for _, v in top) == 7


def test_aggregate_global_duration_is_mean_across_all_sessions():
    sessions = [
        make_session("cohere", duration_s=60),
        make_session("stripe", duration_s=120),
    ]
    result = aggregate(sessions)
    assert result["global"]["avg_duration_s"] == 90.0


def test_aggregate_ignores_sessions_without_session_start():
    sessions = [
        {"session_id": "orphan", "events": [
            {"type": "cta_click", "data": {"target": "email"}, "ts": 1}
        ]},
        make_session("cohere"),
    ]
    result = aggregate(sessions)
    assert result["total_sessions"] == 1


def test_aggregate_empty_input():
    result = aggregate([])
    assert result["total_sessions"] == 0
    assert result["unique_companies"] == 0
    assert result["by_company"] == {}
