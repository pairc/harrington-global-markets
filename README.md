# Harrington Global Markets — Prototype

A zero-dependency, multi-asset market terminal prototype. Node.js backend + vanilla JS front-end (no build step, no npm installs).

## Run

```bash
cd harrington-global-markets
node server.js            # http://localhost:3000   (PORT=8080 node server.js to change)
```

Requires Node 18+. The sandbox/server needs outbound internet access for live data.

## Deploy

Deployment configs are included for Render (`render.yaml`), Railway (`railway.json`), Fly.io (`fly.toml`), Docker (`Dockerfile`, `docker-compose.yml`) and Heroku-style hosts (`Procfile`). See **[DEPLOY.md](DEPLOY.md)** for step-by-step instructions.

## Tabs

| # | Tab | What it shows |
|---|-----|---------------|
| 1 | **Forex Live Market** | 7 majors + DXY as live cards, 38-pair FX board (majors / crosses / Africa & EM / other) with day & 52-week ranges and intraday sparklines, 8×8 cross-rate matrix, currency converter (23 currencies), currency-strength meter, FX session clock, Rand watch. Auto-refresh 10 s. |
| 2 | **Indices & Stocks** | Global indices heatmap (30 indices incl. JSE Top 40 / All Share / Resources), multi-index normalised comparison chart (5D→1Y, add/remove any index), personal watchlist (★, saved in localStorage), regional index table, US mega caps, JSE large caps (converted from cents to ZAR), commodities & crypto. Auto-refresh 15 s. |
| 3 | **Financials & Tech** | Interactive sector explorer — switch Financials ⇄ Technology, period 1D→1Y, sub-group filter, heatmap per sub-group, KPIs vs XLF/XLK and SPY, leaders & laggards, relative-performance chart (ETF vs SPY + up to 4 tickers of your choosing), sortable constituent table with excess return vs the sector ETF. |
| 4 | **IPOs & IPO News** | Live aftermarket cards for the 2026 landmark IPOs (SpaceX, SK hynix, Cerebras, Fervo, Pasqal, TurboGen) with return-since-offer, day-one pop and since-listing sparkline; upcoming/expected listings timeline (US + India, incl. NSE, Holtec Nuclear, Orion180, Anthropic/OpenAI placeholders); **JSE & Africa listings** panel — market context, Dangote Refinery NGX IPO (subscription 14 Sep – 13 Oct) and pending Coca-Cola HBC secondary listing, plus a live table of recent JSE admissions (Canal+, Aimia, Oribi Top 30 ETF, Greencoat, Boxer, WeBuyCars, Rainbow) with return since listing; "Class of 2025" table; pipeline & filings watch; live IPO headlines via Google News RSS with topic filters. |
| 5 | **S&P 500 Outperformers** | Scans all 503 current S&P 500 constituents and ranks the top 10 / 25 / 50 by total return over 1M, 3M, 6M, YTD or 1Y vs the index; breadth (% of members beating the index), median member return, sector scorecard, biggest laggards, and a Top-5-vs-S&P comparison chart. |
| 6 | **Bonds & Rates** | Live US Treasury yield tiles (3M, 2Y, 5Y, 10Y, 30Y) with 1-year sparklines; interactive yield-curve chart (today vs 1 month vs 1 year ago); 2s10s / 3m10y / 5s30s spreads with inversion flag; South Africa panel (repo, prime, CPI, next MPC); 13 central-bank policy-rate cards with next-decision countdown (decisions within 14 days highlighted); live bond-ETF table (US Treasuries, credit/aggregate, international/EM, JSE-listed SA bond ETFs) and CBOT Treasury futures. |
| 7 | **Portfolio & Alerts** | Portfolio tracker — positions (long/short, qty, average cost) saved in the browser, live market value, unrealised and intraday P&L, FX-converted into ZAR / USD / EUR / GBP using live spot, weights, allocation donut, currency exposure bar, "today's movers in your book", CSV import/export, add-from-any-chart. Price alerts — price above / below or day-change ±% rules, evaluated every 10 s against live quotes, with progress bars, in-app toasts, optional browser notifications, triggered log with re-arm. |
| 8 | **COT Report** | CFTC Commitments of Traders for 46 futures markets (currencies incl. ZAR, equity indices, US rates, metals, energy, ags/softs). Weekly dashboard: crowded longs/shorts, 3-year record positions, markets that flipped, USD sentiment. Per-market view: speculator / commercial / small-trader net positions with price overlay (right axis) and a 52-week COT-index strip; "Long vs short" gross view; "By category" view from the Traders-in-Financial-Futures (dealer, asset manager, leveraged funds) or Disaggregated (producer, swap dealer, managed money) reports; 1Y–10Y history; positions table with week-on-week changes; open-interest chart; 52-week COT-index heatmap; biggest weekly shifts; sortable full board (net, 1w/4w Δ, % OI, 26w/52w/3y index, z-score). |

Global features: ticker tape, world exchange clocks with open/closed status, instrument search (any Yahoo symbol), full-screen interactive chart modal (line/candles, 1D→5Y, crosshair, OHLC tooltip, volume, ☆ watchlist / 🔔 alert / ＋ portfolio buttons), alert bell with active-alert count, light/dark theme, keyboard shortcuts (`1`–`8` tabs, `/` search, `Esc` close).

## Architecture

```
server.js                 HTTP server + API proxy + cache (no dependencies)
public/index.html         Shell
public/styles.css         Theme (dark default, light toggle)
public/chart.js           Canvas charting: sparklines, price/candle chart, normalised comparison chart, yield curve
public/app.js             All tab logic, state, rendering, alerts engine, portfolio maths
data/sp500_constituents.csv   S&P 500 members (symbol, name, GICS sector) — refresh periodically
data/ipos.json            Curated IPO reference data (offer prices, dates, upcoming calendar, pipeline, JSE/Africa section)
data/rates.json           Central-bank policy rates & meeting dates, yield/ETF/futures symbol lists — update after each decision
data/cot_markets.json     COT universe: CFTC contract codes grouped by asset class, contract units, Yahoo price-overlay symbols
data/last_good/           Auto-written "last good" API snapshots used when upstream is unreachable
```

### API (all JSON)

| Endpoint | Description |
|----------|-------------|
| `GET /api/quotes?symbols=A,B,C` | Batch quotes with intraday sparkline (Yahoo spark; FX falls back to open.er-api.com) |
| `GET /api/chart?symbol=X&range=1d..5y` | OHLCV series for the chart modal |
| `GET /api/series?symbols=…&range=…` | Lightweight close series for comparison charts |
| `GET /api/perf?symbols=…&range=…` | Period returns (sector explorer) |
| `GET /api/sp500/outperformers?range=ytd&limit=10` | Full-index scan, ranked |
| `GET /api/ipos` | Curated IPO data (US, India, JSE/Africa) merged with live prices/returns |
| `GET /api/rates` | Yield curve (now / 1M / 1Y ago), spreads, policy rates, bond ETFs & Treasury futures |
| `GET /api/cot` | COT board: latest week for all markets + 3-year derived stats (net, changes, COT index, z-score, flags) |
| `GET /api/cot/detail?code=099741&years=3` | Full history for one market (legacy + TFF/disaggregated categories) with weekly price series aligned to report dates |
| `GET /api/news?q=IPO&days=7` | Google News RSS headlines |
| `GET /api/search?q=…` | Symbol search |

Every response carries `asOf` and `stale`; when an upstream call fails, the last good copy (memory → disk) is served with `stale: true` and the UI shows an amber "Stale data" status + banner.

## Data sources & caveats

* Prices: public Yahoo Finance chart/spark endpoints — equities & indices may be delayed 15–20 min; FX, futures and crypto are near real-time. Not licensed for redistribution; for a production build swap `server.js` adapters for a licensed feed (e.g. Polygon, Twelve Data, Refinitiv, Bloomberg B-PIPE).
* IPO reference data (`data/ipos.json`) was compiled on 12 Sep 2026 from public IPO calendars and press releases; verify before relying on it.
* S&P 500 membership CSV is a snapshot; update it when the index rebalances.
* COT data comes from the CFTC Public Reporting API (Socrata datasets `6dca-aqww` legacy, `gpe5-46if` TFF, `72hh-3qpy` disaggregated) — futures-only, as of each Tuesday, published Fridays 15:30 ET; cached 6 h server-side. The COT index is the Williams-style (net − min) ÷ (max − min) over the window; z-score uses the trailing 52 weeks. Currency overlays quoted as USD-per-unit (JPY, CAD, CHF, MXN, BRL, ZAR are inverted) so price moves in the same direction as the futures contract.
* Policy rates (`data/rates.json`) were compiled on 12 Sep 2026; the 2Y point on the US curve uses the CBOT 2-year yield future (`2YY=F`) as a proxy because Yahoo has no cash 2-year index. JSE bond ETF prices are converted from cents to rand.
* Portfolio positions, watchlist and alerts live in `localStorage` only (nothing is sent to the server). A small demo portfolio is seeded on first launch — use **Clear all** or edit/delete rows to replace it. Alerts are evaluated only while a browser tab with the app is open.
* This is a prototype for demonstration — not investment advice.
