# jsonresume-theme-onepage-agentfolio

AgentFolio fork of [jsonresume-theme-onepage](https://github.com/ainsleychong/jsonresume-theme-onepage) — a compact, printable JSON Resume theme. This fork adds a `projects` section (not rendered by the upstream theme).

Consumed only by the `.github/workflows/pdf.yml` workflow via `resumed export`. Installed in CI with `npm install -g --install-links ./pdf-theme` — the `--install-links` flag is required so npm copies the package instead of symlinking, which lets the nested `handlebars` dependency resolve.

Original theme (c) Ainsley Chong, MIT licensed. See `LICENSE`.
