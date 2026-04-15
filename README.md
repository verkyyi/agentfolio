# AgentFolio

Open-source agentic portfolio engine. Detects visitor context (URL slug) and renders a resume adapted to the target role.

**Live:** https://verkyyi.github.io/agentfolio

## Status

All eight planned phases are deployed on `main`:

1. **Known-company adaptation** — URL slugs map to pre-built adaptations at `/agentfolio/c/<slug>` (`data/slugs.json`).
2. **Live adaptation** — unknown companies get adapted on demand via an issue-triggered workflow.
3. **Analytics pipeline** — session-level engagement signals aggregated weekly into `data/analytics.json`.
4. **Issue-triggered chat** — visitor Q&A answered by Claude Haiku 4.5 running in a GitHub Action.
5. **Architecture page** — `/how-it-works` renders the pipeline plus aggregated stats and side-by-side adaptation comparisons.
6. **JD auto-fetching** — daily workflow re-fetches each `jd_url` and refreshes `jd_keywords`; unreachable URLs mark the profile `stale: true` without regressing prior keywords.
7. **LLM summary polish** — `adapt_one --llm` rewrites the templated summary via Claude; cached by `(summary, keyword set)` hash; scheduled `adapt.yml` uses it automatically.
8. **Weighted match score** — overall score combines skill (weight 1.0), experience-bullet tag (6.0), and project tag (6.0) matches. See the "Caveats" section below for the current discrimination issue.

## Development

```bash
# Generate adapted resumes
python -m scripts.adapt_all

# Run Python tests
python -m pytest scripts/tests/ -v

# Run web dev server
cd web
npm install
npm run dev
```

Open `http://localhost:5173/agentfolio/c/cohere-fde` to see the Cohere adaptation.

## Architecture

See `docs/architecture.md` for the full design. Implementation plans live in `docs/superpowers/plans/`.

## Live adaptation setup (Phase 2)

The site can generate adaptations on demand when a visitor self-identifies with a company that has no pre-built file. This requires a fine-grained GitHub PAT.

### Create the PAT

1. Go to https://github.com/settings/personal-access-tokens/new
2. **Repository access:** select *Only select repositories* → `verkyyi/agentfolio`
3. **Repository permissions:** set `Issues` to `Read and write`. Leave everything else as `No access`.
4. **Expiration:** 90 days (renew quarterly)
5. Generate and copy the token.

### Configure the secret

```bash
gh secret set GH_ISSUES_PAT --repo verkyyi/agentfolio
# paste the PAT when prompted
```

The `deploy.yml` workflow reads this secret and bakes it into the client bundle as `VITE_GITHUB_PAT`.

### Local development

Copy `web/.env.example` to `web/.env.local` and paste the PAT. `.env.local` is gitignored. If you skip this, the dev site still works but live generation is disabled (unknown-company visitors see the default adaptation without triggering an Issue).

### Rotation

When the PAT expires or is compromised:

```bash
# Revoke old token in GitHub UI, generate new one with same scopes, then:
gh secret set GH_ISSUES_PAT --repo verkyyi/agentfolio
# Re-run deploy workflow:
gh workflow run deploy.yml --repo verkyyi/agentfolio
```

## Analytics & privacy (Phase 3)

The site collects anonymous, aggregated engagement signals to help tune resume content over time. The loop runs entirely on GitHub infrastructure:

- **What is tracked:** session start (company, source, adaptation slug, match score), scroll depth, section dwell times, project-link clicks, contact-CTA clicks (email/LinkedIn/GitHub). Every flushed payload is visible as a GitHub Issue labeled `analytics` — fully auditable.
- **What is NOT tracked:** cookies, IP addresses, user-agent fingerprints, form inputs, chat text, content outside the site.
- **Storage:** events flush to a single GitHub Issue per session (first flush creates it, subsequent flushes append comments). No client-side persistence — all session state lives in memory and is lost on tab close.
- **Aggregation:** a weekly `analytics.yml` workflow runs `scripts/aggregate_feedback.py`, which collapses all open analytics issues into `data/analytics.json`, then closes them with the `analytics-processed` label.
- **Disable:** the tracker only fires when `VITE_GITHUB_PAT` is configured. Unset it to disable.

## Chat widget setup (Phase 4)

The chat widget routes questions through a GitHub Action that calls Anthropic's API. The API key stays on GitHub — never baked into the client bundle.

### Create an Anthropic API key

1. Go to https://console.anthropic.com/settings/keys
2. Create a new key with **Workspace Monthly Spend Limit: $5** (rotate monthly or on suspicion of abuse).
3. Copy the key.

### Configure the secret

```bash
gh secret set ANTHROPIC_API_KEY --repo verkyyi/agentfolio
# paste key when prompted
```

### How it works

1. Visitor asks a question in the chat widget.
2. Browser POSTs a `[chat] <question>` issue tagged `chat-request` (via the same `VITE_GITHUB_PAT` as Phase 2).
3. The `chat-on-request.yml` workflow triggers, calls Anthropic with the full resume JSON as the system prompt.
4. The Action posts the answer as a JSON comment; the browser polls the issue and surfaces the answer.
5. Each session is capped at 5 questions (client) and the repo at 20 chat-requests/hour (Action).

All Q&A is publicly visible as GitHub issues — by design, for auditability.

## JD auto-fetching (Phase 6)

`scripts/fetch_jds.py` re-fetches each `data/companies/*.json`'s `jd_url` and updates `jd_keywords` by matching a curated vocab (`KEYWORD_VOCAB`) against the page text. Ashby, Greenhouse, Lever, and generic HTML are all supported.

- **Workflow:** `.github/workflows/jd-sync.yml` runs daily at 05:17 UTC (`workflow_dispatch` also available).
- **Safety net:** an unreachable `jd_url` (404, timeout, fetch error) marks the profile `stale: true` and leaves the previous `jd_keywords` intact. Adaptation never regresses from a rotten URL.
- **Run manually:**
  ```bash
  python -m scripts.fetch_jds              # all companies
  python -m scripts.fetch_jds --only cohere
  ```
- **Triggered regeneration:** when `jd-sync` commits changes to `data/companies/`, `adapt.yml` re-runs and regenerates `data/adapted/*.json`.

## LLM summary polish (Phase 7)

After the templated summary is rendered, `adapt_one --llm` optionally routes it through Claude Haiku 4.5 (`temperature=0`) for a tighter rewrite. The raw template is the ground truth; the polish never invents claims.

- **CLI:**
  ```bash
  python -m scripts.adapt_one cohere --llm                     # polish one
  python -m scripts.adapt_all --llm                            # polish all
  python -m scripts.adapt_one cohere --llm --cache-dir /tmp/x  # override cache dir
  ```
- **Cache:** `data/llm_cache/<sha1>.txt`, keyed by `(summary, sorted(keywords))`. Hits skip the API. The scheduled `adapt.yml` commits cache files alongside adapted resumes so future runs stay cheap.
- **Fail-soft:** if the API call fails or `ANTHROPIC_API_KEY` is unset, `polish_summary` logs a warning and returns the input summary unchanged. Unit tests run with `polish_fn=None`, so CI stays deterministic without an API key.

## Match score (Phase 8)

`match_score.overall` is a weighted fraction:

```
overall = (1.0 * skill_matches + 6.0 * bullet_tag_matches + 6.0 * project_tag_matches)
        / (1.0 * skill_total   + 6.0 * bullet_total       + 6.0 * project_total)
```

`by_category` exposes per-skill-group ratios plus two new buckets: `experience_bullets` and `projects`. `matched_keywords` / `missing_keywords` union all three sources.

### Caveats

- **Weight choice.** The plan suggested `bullet=project=0.5`; that topped out around 0.36 for Cohere because the skill denominator dominated. Weights were raised to 6.0 to let tag evidence drive the score. Artifact: both tailored (cohere 0.70) and default (0.71) profiles now land in the same range.
- **Default discrimination.** `data/companies/default.json` has broad `priority_tags` (`full-stack`, `agentic`, `customer-facing`) that match many bullets/projects. This inflates default's score. Two fixes worth considering: narrow `default.priority_tags` to truly generic terms, or weight tag matches by the number of profiles that share the tag.

## Architecture & plans

- `docs/architecture.md` — high-level design.
- `docs/superpowers/plans/` — one implementation plan per phase. `NEXT.md` tracks planning state.
- `docs/superpowers/specs/` — design specs when brainstorming runs ahead of planning.

## Repository secrets

| Secret | Required for | Exposure |
|--------|--------------|----------|
| `GH_ISSUES_PAT` | Phases 2, 3, 4 | Baked into the client bundle as `VITE_GITHUB_PAT`. Fine-grained, issues-only, on this repo. |
| `ANTHROPIC_API_KEY` | Phases 4, 7 | Server-only (GitHub Actions). Never exposed to the client. $5/mo spend cap recommended. |
| `GITHUB_TOKEN` | Phases 3, 6, adapt.yml | Auto-provided per run. |
