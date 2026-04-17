# AgentFolio Chat Proxy

Cloudflare Worker that backs the `Chat with me` widget. Deploy-optional:
if `VITE_CHAT_PROXY_URL` is unset on the Pages deploy, the widget does
not mount and nothing else changes.

## Deploy

```bash
cd proxy
npm install
npm install -g wrangler
wrangler login
```

Create the KV namespace and paste the `id` into `wrangler.toml`:

```bash
wrangler kv namespace create RATE_LIMIT
```

Set secrets:

```bash
wrangler secret put ANTHROPIC_API_KEY   # sk-...
wrangler secret put ALLOWED_ORIGIN      # https://<user>.github.io (comma-separated for multiple)
wrangler secret put PAGES_ORIGIN        # https://<user>.github.io/agentfolio (no trailing slash)
wrangler secret put IP_HASH_SALT        # any random string, e.g. output of `openssl rand -hex 16`
```

Edit `wrangler.toml` and set `NAME` under `[vars]` to your own name.

Deploy:

```bash
wrangler deploy
```

Copy the `*.workers.dev` URL. Set it as `VITE_CHAT_PROXY_URL` in your
GitHub Pages env (repo Settings → Secrets and variables → Actions →
Variables) and trigger a redeploy.

## Configuration reference

| Name | Kind | Purpose |
|------|------|---------|
| `ANTHROPIC_API_KEY` | secret | Upstream auth |
| `ALLOWED_ORIGIN` | secret | Comma-separated browser origins |
| `PAGES_ORIGIN` | secret | Base URL the Worker fetches slug context from |
| `IP_HASH_SALT` | secret | Salt for hashing visitor IPs before logging |
| `MODEL` | var | Anthropic model id (default `claude-haiku-4-5`) |
| `NAME` | var | Your display name (used in system prompt) |
| `RATE_LIMIT_KV` | KV binding | Per-IP counters (20/10min + 100/day) |

## Costs

Claude Haiku 4.5 with prompt caching on the system block runs about
$0.001–0.002 per visitor message. The rate limit caps daily exposure;
set a monthly spend cap in the Anthropic console as a backstop.
