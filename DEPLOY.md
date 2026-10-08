# Deploying Harrington Global Markets

The app is a single Node.js process (`node server.js`, no npm dependencies) that serves the
front-end and proxies live data. It needs a host that runs a **long-lived Node server** — not a
static-site host. Any of the options below works; config files for each are already in the repo.

| Host | Cost | Effort | Notes |
|------|------|--------|-------|
| **Render** (`render.yaml`) | Free tier | ★ easiest | Free instances sleep after 15 min idle (≈30–60 s cold start). No card needed. |
| **Railway** (`railway.json`) | $5/mo Hobby after trial | ★ | Always-on, very simple CLI or GitHub deploy. |
| **Fly.io** (`fly.toml`, `Dockerfile`) | ~free for 1 small VM | ★★ | Has a **Johannesburg region (`jnb`)** — lowest latency for SA users. Card required. |
| **Docker / VPS** (`Dockerfile`, `docker-compose.yml`) | VPS price | ★★ | Full control; works on any box with Docker. |
| Heroku / Dokku (`Procfile`) | varies | ★ | Standard buildpack deploy. |

The server already reads `PORT` from the environment, binds `0.0.0.0`, exposes `GET /api/health`
for health checks, and falls back to `/tmp` if the app directory is read-only.

---

## 0. Put the code in a Git repository (needed for Render / Railway GitHub deploys)

```bash
cd harrington-global-markets
git init
git add .
git commit -m "Harrington Global Markets prototype"
# create an empty repo on GitHub (or GitLab/Bitbucket), then:
git remote add origin https://github.com/<you>/harrington-global-markets.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes the runtime cache (`data/last_good/`).

---

## 1. Render (recommended free option)

1. Push the repo to GitHub (step 0).
2. Go to <https://dashboard.render.com> → **New +** → **Blueprint**.
3. Connect the repository. Render reads `render.yaml` and proposes a free web service named
   `harrington-global-markets` in Frankfurt (change `region` in `render.yaml` if you prefer).
4. Click **Apply**. First deploy takes ~1 minute. Your URL will be
   `https://harrington-global-markets.onrender.com` (or similar if the name is taken).
5. Every `git push` to `main` redeploys automatically.

Tips
* Free instances spin down when idle; the first visitor after a pause waits for a cold start.
  Upgrading to the $7/mo Starter plan keeps it always-on.
* The disk is ephemeral, so the "last good" snapshot cache resets on each deploy — the in-memory
  cache warms within the first few requests.

### Alternative: without Blueprint
**New +** → **Web Service** → pick the repo → Runtime *Node*, Build command `echo ok`,
Start command `node server.js`, Health check path `/api/health`, Instance type *Free*.

---

## 2. Railway

**Option A — CLI (no GitHub needed)**
```bash
npm i -g @railway/cli
railway login
cd harrington-global-markets
railway init          # create a new project
railway up            # uploads and deploys using railway.json
railway domain        # generates a public https://*.up.railway.app URL
```

**Option B — GitHub**: <https://railway.app/new> → *Deploy from GitHub repo* → select the repo.
Railway detects Node, uses `railway.json` for the start command and health check, then
**Settings → Networking → Generate Domain**.

---

## 3. Fly.io (Johannesburg region)

```bash
# install flyctl: https://fly.io/docs/flyctl/install/
fly auth login
cd harrington-global-markets
fly launch --copy-config --no-deploy   # accepts the existing fly.toml; pick/confirm app name
fly deploy
fly open
```

`fly.toml` sets `primary_region = "jnb"`, a 256 MB shared VM, auto-stop/auto-start (so it costs
≈ nothing when idle) and a health check on `/api/health`. To keep it always warm:
`fly scale count 1` and set `min_machines_running = 1`.

---

## 4. Docker (any VPS, Synology, home server…)

```bash
docker build -t harrington-global-markets .
docker run -d --name hgm -p 3000:3000 --restart unless-stopped harrington-global-markets
# or
docker compose up -d
```

Then put it behind your reverse proxy (Caddy / nginx / Traefik) for HTTPS, e.g. Caddyfile:

```
markets.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

---

## 5. Plain Node on a VM (no Docker)

```bash
# Node 18+ required
git clone https://github.com/<you>/harrington-global-markets.git
cd harrington-global-markets
PORT=3000 node server.js
```
Use `pm2 start server.js --name hgm` (or a systemd unit) to keep it running after logout.

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Listening port (set automatically by most hosts) |
| `CACHE_DIR` | `data/last_good` | Where last-good API snapshots are written; falls back to the OS temp dir if unwritable |
| `NODE_ENV` | — | Informational only |

No API keys are required — all upstream sources are public endpoints.

---

## After deploying — checks

* `https://<your-url>/api/health` → `{"ok":true,...}`
* `https://<your-url>/api/quotes?symbols=EURUSD=X` → `"stale":false` means the host can reach Yahoo.
* Open the site, press `8` → COT Report should show the latest Tuesday report date.

### Known considerations

* **Upstream rate limits**: Yahoo Finance occasionally returns HTTP 429 to cloud/datacenter IP
  ranges. The app survives this (it serves the last good snapshot with an amber *Stale data*
  banner) but if you see persistent `stale:true`, switch region/provider or plug in a licensed
  feed in `server.js`. CFTC, Google News RSS and open.er-api.com have been reliable.
* **Curated data** (`data/rates.json`, `data/ipos.json`, `data/cot_markets.json`,
  `data/sp500_constituents.csv`) is edited by hand — commit and push to update it.
* **Browser-side state** (portfolio, watchlist, alerts) lives in each visitor's `localStorage`;
  nothing is stored on the server.
* The prototype has no authentication. If it should be private, put it behind your host's
  access control (Render/Railway private networking, Cloudflare Access, basic-auth in the reverse
  proxy, etc.).
