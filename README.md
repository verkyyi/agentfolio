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
