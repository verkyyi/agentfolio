# AgentFolio

Open-source agentic portfolio engine. Detects visitor context (URL slug) and renders a resume adapted to the target role.

**Live:** https://verkyyi.github.io/agentfolio

## Status

**Phase 1 — complete:** known-company adaptation via URL slugs. Pre-built adaptations for `cohere` and `default`. Access via `/agentfolio/c/<slug>` where `<slug>` is a key from `data/slugs.json`.

**Next phases:** live generation for unknown companies, analytics, chat widget, architecture page.

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
