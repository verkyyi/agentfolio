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
