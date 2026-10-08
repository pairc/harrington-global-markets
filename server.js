/**
 * Harrington Global Markets — prototype server
 * ------------------------------------------------
 * Zero-dependency Node.js server that:
 *   • serves the static front-end from /public
 *   • proxies + normalises public market-data endpoints (Yahoo Finance chart/spark,
 *     Google News RSS, open.er-api.com FX fallback)
 *   • caches responses in memory and persists a "last good" copy on disk so the
 *     prototype degrades gracefully when an upstream is unreachable.
 *
 * Run:  node server.js   (PORT env var optional, default 3000)
 */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
// Last-good snapshot cache. Override with CACHE_DIR=/tmp/hgm-cache on hosts with a read-only app directory.
let LAST_GOOD_DIR = process.env.CACHE_DIR || path.join(DATA_DIR, 'last_good');
try {
  fs.mkdirSync(LAST_GOOD_DIR, { recursive: true });
} catch (e) {
  LAST_GOOD_DIR = path.join(require('os').tmpdir(), 'hgm-last-good');
  try { fs.mkdirSync(LAST_GOOD_DIR, { recursive: true }); } catch { /* cache disabled */ }
}

// NB: Yahoo's public endpoints throttle browser-like UA strings from data-centre IPs; the plain token works reliably.
const UA = 'Mozilla/5.0';

/* ------------------------------------------------------------------ */
/* Small utilities                                                      */
/* ------------------------------------------------------------------ */

function fetchText(url, { headers = {}, timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.request(
      u,
      { method: 'GET', headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Encoding': 'gzip, deflate', ...headers } },
      (res) => {
        // follow redirects (max 3)
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, u).toString();
          if ((headers.__redirects || 0) >= 3) return reject(new Error('Too many redirects'));
          return fetchText(next, { headers: { ...headers, __redirects: (headers.__redirects || 0) + 1 }, timeout }).then(resolve, reject);
        }
        const chunks = [];
        let stream = res;
        const enc = (res.headers['content-encoding'] || '').toLowerCase();
        if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
        else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
        else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 400) {
            const err = new Error(`HTTP ${res.statusCode} for ${u.hostname}${u.pathname}`);
            err.status = res.statusCode;
            err.body = body.slice(0, 300);
            return reject(err);
          }
          resolve(body);
        });
        stream.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error('Request timeout')));
    req.end();
  });
}

async function fetchJSON(url, opts) {
  const txt = await fetchText(url, opts);
  return JSON.parse(txt);
}

/** Simple in-memory cache with in-flight de-duplication and disk "last good" persistence. */
const memCache = new Map();
function safeKey(key) {
  return key.replace(/[^a-z0-9_.-]+/gi, '_').slice(0, 80) + '_' + crypto.createHash('md5').update(key).digest('hex').slice(0, 8);
}
function readLastGood(key) {
  try {
    const p = path.join(LAST_GOOD_DIR, safeKey(key) + '.json');
    if (!fs.existsSync(p)) return null;
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    return parsed;
  } catch {
    return null;
  }
}
function writeLastGood(key, val) {
  try {
    fs.writeFileSync(path.join(LAST_GOOD_DIR, safeKey(key) + '.json'), JSON.stringify({ savedAt: Date.now(), val }));
  } catch {
    /* ignore disk errors */
  }
}
/**
 * cached(key, ttlMs, producer, {persist}) → { val, stale, cachedAt }
 * On producer failure returns last-good (memory or disk) flagged stale, else rethrows.
 */
async function cached(key, ttlMs, producer, { persist = true } = {}) {
  const now = Date.now();
  const hit = memCache.get(key);
  if (hit && hit.exp > now && hit.val !== undefined) return { val: hit.val, stale: false, cachedAt: hit.at };
  if (hit && hit.inflight) return hit.inflight;
  const inflight = (async () => {
    try {
      const val = await producer();
      memCache.set(key, { val, exp: Date.now() + ttlMs, at: Date.now() });
      if (persist && !(val && val.__noPersist)) writeLastGood(key, val);
      return { val, stale: false, cachedAt: Date.now() };
    } catch (err) {
      const prev = memCache.get(key);
      if (prev && prev.val !== undefined) {
        memCache.set(key, { ...prev, exp: Date.now() + Math.min(ttlMs, 15000), inflight: undefined });
        return { val: prev.val, stale: true, cachedAt: prev.at, error: err.message };
      }
      const disk = readLastGood(key);
      if (disk) {
        memCache.set(key, { val: disk.val, exp: Date.now() + Math.min(ttlMs, 15000), at: disk.savedAt });
        return { val: disk.val, stale: true, cachedAt: disk.savedAt, error: err.message };
      }
      memCache.delete(key);
      throw err;
    }
  })();
  memCache.set(key, { ...(hit || {}), inflight });
  const out = await inflight;
  const cur = memCache.get(key);
  if (cur) cur.inflight = undefined;
  return out;
}

function downsample(arr, n) {
  if (!arr || arr.length <= n) return arr || [];
  const out = [];
  const step = (arr.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx], idx);
      } catch (e) {
        out[idx] = { __error: e.message };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/* ------------------------------------------------------------------ */
/* Yahoo Finance adapters                                               */
/* ------------------------------------------------------------------ */

const YF = 'https://query1.finance.yahoo.com';
const YF_HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** fetch JSON from Yahoo, rotating hosts and retrying once on 429/5xx. */
async function yfJSON(pathAndQuery) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const host = YF_HOSTS[attempt % YF_HOSTS.length];
    try {
      return await fetchJSON(host + pathAndQuery);
    } catch (e) {
      lastErr = e;
      if (e.status && e.status !== 429 && e.status < 500) throw e; // hard error (404 etc.)
      await sleep(250 * (attempt + 1));
    }
  }
  throw lastErr;
}
const RANGE_INTERVAL = { '1d': '5m', '5d': '30m', '1mo': '1h', '3mo': '1d', '6mo': '1d', ytd: '1d', '1y': '1d', '2y': '1wk', '5y': '1wk', max: '1mo' };
const VALID_RANGES = Object.keys(RANGE_INTERVAL);

function fxWeekendClosed() {
  const d = new Date();
  const day = d.getUTCDay();
  const h = d.getUTCHours();
  return day === 6 || (day === 5 && h >= 22) || (day === 0 && h < 22);
}

function marketState(meta) {
  const now = Date.now() / 1000;
  const type = meta.instrumentType;
  if (type === 'CRYPTOCURRENCY') return 'OPEN';
  if (type === 'CURRENCY') return fxWeekendClosed() ? 'CLOSED' : 'OPEN';
  const ctp = meta.currentTradingPeriod || {};
  const reg = ctp.regular;
  if (reg && now >= reg.start && now < reg.end) return 'OPEN';
  if (ctp.pre && now >= ctp.pre.start && now < ctp.pre.end) return 'PRE';
  if (ctp.post && now >= ctp.post.start && now < ctp.post.end) return 'POST';
  return 'CLOSED';
}

/** Minor-unit currencies reported by Yahoo (pence / cents) → major unit. */
function unitFactor(currency) {
  if (currency === 'ZAc') return { f: 0.01, ccy: 'ZAR' };
  if (currency === 'GBp') return { f: 0.01, ccy: 'GBP' };
  if (currency === 'ILA') return { f: 0.01, ccy: 'ILS' };
  return { f: 1, ccy: currency };
}

function normaliseSparkResult(r) {
  const resp = r.response && r.response[0];
  if (!resp || !resp.meta) return null;
  const m = resp.meta;
  const { f, ccy } = unitFactor(m.currency);
  const closesRaw = ((resp.indicators || {}).quote || [{}])[0].close || [];
  const ts = resp.timestamp || [];
  const pts = [];
  for (let i = 0; i < closesRaw.length; i++) if (closesRaw[i] != null) pts.push({ t: ts[i], c: closesRaw[i] * f });
  const price = m.regularMarketPrice != null ? m.regularMarketPrice * f : pts.length ? pts[pts.length - 1].c : null;
  const prev = (m.previousClose != null ? m.previousClose : m.chartPreviousClose) * f || null;
  const change = price != null && prev ? price - prev : null;
  const changePct = m.regularMarketChangePercent != null ? m.regularMarketChangePercent : change != null && prev ? (change / prev) * 100 : null;
  return {
    symbol: m.symbol,
    name: (m.longName || m.shortName || m.symbol || '').replace(/\s+/g, ' ').trim(),
    shortName: (m.shortName || '').replace(/\s+/g, ' ').trim(),
    type: m.instrumentType,
    currency: ccy,
    exchange: m.fullExchangeName || m.exchangeName,
    price,
    prevClose: prev,
    change,
    changePct,
    dayHigh: m.regularMarketDayHigh != null ? m.regularMarketDayHigh * f : null,
    dayLow: m.regularMarketDayLow != null ? m.regularMarketDayLow * f : null,
    wk52High: m.fiftyTwoWeekHigh != null ? m.fiftyTwoWeekHigh * f : null,
    wk52Low: m.fiftyTwoWeekLow != null ? m.fiftyTwoWeekLow * f : null,
    volume: m.regularMarketVolume != null ? m.regularMarketVolume : null,
    marketTime: m.regularMarketTime || null,
    marketState: marketState(m),
    tz: m.exchangeTimezoneName,
    chartPrevClose: m.chartPreviousClose != null ? m.chartPreviousClose * f : null,
    spark: downsample(pts.map((p) => +p.c.toFixed(6)), 60),
    sparkT: downsample(pts.map((p) => p.t), 60),
  };
}

/** Batched spark fetch. Returns Map(symbol → normalised quote). */
async function yahooSpark(symbols, range = '1d', interval = '5m') {
  const uniq = [...new Set(symbols.filter(Boolean))];
  const batches = [];
  for (let i = 0; i < uniq.length; i += 20) batches.push(uniq.slice(i, i + 20));
  const results = await mapLimit(batches, 6, async (b) => {
    const d = await yfJSON(`/v7/finance/spark?symbols=${encodeURIComponent(b.join(','))}&range=${range}&interval=${interval}`);
    return (d.spark && d.spark.result) || [];
  });
  const map = new Map();
  let errors = 0;
  for (const res of results) {
    if (!Array.isArray(res)) {
      errors++;
      continue;
    }
    for (const r of res) {
      const q = normaliseSparkResult(r);
      if (q) map.set(q.symbol, q);
    }
  }
  if (map.size === 0 && uniq.length) throw new Error('Yahoo spark returned no data' + (errors ? ` (${errors} batch errors)` : ''));
  return map;
}

async function yahooChart(symbol, range = '1d', interval) {
  interval = interval || RANGE_INTERVAL[range] || '1d';
  const d = await yfJSON(`/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplit`);
  const res = d.chart && d.chart.result && d.chart.result[0];
  if (!res) throw new Error((d.chart && d.chart.error && d.chart.error.description) || 'No chart data');
  const m = res.meta;
  const { f, ccy } = unitFactor(m.currency);
  const q = ((res.indicators || {}).quote || [{}])[0];
  const ts = res.timestamp || [];
  const t = [], o = [], h = [], l = [], c = [], v = [];
  const live = m.regularMarketPrice;
  for (let i = 0; i < ts.length; i++) {
    let close = q.close ? q.close[i] : null;
    // Yahoo leaves the in-progress / just-closed session's daily bar with close=null; patch it with the live print
    if (close == null) {
      const isLastBar = i === ts.length - 1;
      if (!(isLastBar && live != null && q.open && q.open[i] != null)) continue;
      close = live;
    }
    const oo = q.open[i] != null ? q.open[i] : close;
    let hh = q.high[i] != null ? q.high[i] : Math.max(oo, close);
    let ll = q.low[i] != null ? q.low[i] : Math.min(oo, close);
    if (i === ts.length - 1 && live != null) { hh = Math.max(hh, close); ll = Math.min(ll, close); }
    t.push(ts[i]);
    o.push(oo * f);
    h.push(hh * f);
    l.push(ll * f);
    c.push(close * f);
    v.push(q.volume ? q.volume[i] : null);
  }
  return {
    symbol: m.symbol,
    name: (m.longName || m.shortName || m.symbol || '').replace(/\s+/g, ' ').trim(),
    currency: ccy,
    exchange: m.fullExchangeName || m.exchangeName,
    type: m.instrumentType,
    range,
    interval,
    price: m.regularMarketPrice != null ? m.regularMarketPrice * f : null,
    prevClose: (m.previousClose != null ? m.previousClose : m.chartPreviousClose) * f || null,
    chartPrevClose: m.chartPreviousClose != null ? m.chartPreviousClose * f : null,
    marketTime: m.regularMarketTime,
    tz: m.exchangeTimezoneName,
    gmtoffset: m.gmtoffset,
    marketState: marketState(m),
    t, o, h, l, c, v,
  };
}

/* ------------------------------------------------------------------ */
/* FX fallback (open.er-api.com)                                        */
/* ------------------------------------------------------------------ */
async function erApiRates() {
  const d = await fetchJSON('https://open.er-api.com/v6/latest/USD');
  if (d.result !== 'success') throw new Error('er-api failure');
  return { rates: d.rates, updated: d.time_last_update_unix };
}
function fxFromRates(sym, rates, updated) {
  const mm = /^([A-Z]{3})([A-Z]{3})=X$/.exec(sym);
  if (!mm) return null;
  const [_, base, quote] = mm;
  if (!rates[base] || !rates[quote]) return null;
  const price = rates[quote] / rates[base];
  return {
    symbol: sym, name: `${base}/${quote}`, shortName: `${base}/${quote}`, type: 'CURRENCY', currency: quote, exchange: 'CCY (fallback)',
    price, prevClose: null, change: null, changePct: null, dayHigh: null, dayLow: null, wk52High: null, wk52Low: null,
    volume: null, marketTime: updated, marketState: fxWeekendClosed() ? 'CLOSED' : 'OPEN', spark: [], sparkT: [], fallback: true,
  };
}

/* ------------------------------------------------------------------ */
/* S&P 500 constituents + performance scans                             */
/* ------------------------------------------------------------------ */
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQ = false;
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const [hdr, ...body] = rows;
  return body.filter((r) => r.length === hdr.length).map((r) => Object.fromEntries(hdr.map((h, i) => [h, r[i]])));
}
let constituentsCache = null;
function constituents() {
  if (constituentsCache) return constituentsCache;
  const csv = fs.readFileSync(path.join(DATA_DIR, 'sp500_constituents.csv'), 'utf8');
  constituentsCache = parseCSV(csv).map((r) => ({
    symbol: r.Symbol.replace('.', '-'),
    name: r.Security,
    sector: r['GICS Sector'],
    subIndustry: r['GICS Sub-Industry'],
    hq: r['Headquarters Location'],
  }));
  return constituentsCache;
}

/** Period return for a list of symbols using spark chartPreviousClose as the baseline. */
async function periodPerformance(symbols, range) {
  const interval = range === '1d' ? '5m' : range === '5d' ? '30m' : '1d';
  const map = await yahooSpark(symbols, range, interval);
  const out = [];
  for (const s of symbols) {
    const q = map.get(s);
    if (!q || q.price == null) continue;
    const base = range === '1d' ? q.prevClose : q.chartPrevClose || (q.spark.length ? q.spark[0] : null);
    if (!base) continue;
    out.push({ symbol: s, name: q.name, price: q.price, currency: q.currency, base, ret: (q.price / base - 1) * 100, changePct: q.changePct, spark: downsample(q.spark, 40), sparkT: downsample(q.sparkT, 40), marketState: q.marketState });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* News (Google News RSS)                                               */
/* ------------------------------------------------------------------ */
function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&nbsp;/g, ' ');
}
async function googleNews(query, days = 7) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ` when:${days}d`)}&hl=en-US&gl=US&ceid=US:en`;
  const xml = await fetchText(url);
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let mm;
  while ((mm = re.exec(xml))) {
    const it = mm[1];
    const pick = (tag) => { const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(it); return r ? decodeEntities(r[1]).trim() : ''; };
    let title = pick('title');
    const source = pick('source');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    items.push({ title, link: pick('link'), source, published: new Date(pick('pubDate')).getTime() || null });
  }
  if (!items.length) throw new Error('No news items parsed');
  items.sort((a, b) => (b.published || 0) - (a.published || 0));
  return items.slice(0, 40);
}

/* ------------------------------------------------------------------ */
/* IPO dataset merge                                                    */
/* ------------------------------------------------------------------ */
function loadIpoData() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ipos.json'), 'utf8'));
}
async function ipoBoard() {
  const data = loadIpoData();
  const jse = (data.jseAfrica && data.jseAfrica.listed) || [];
  const listed = [...data.recent2026, ...data.class2025, ...jse];
  const [charts, dayMap] = await Promise.all([
    mapLimit(listed, 6, async (ipo) => {
      try {
        // listings older than ~23 months need a longer window so the first traded bar is the real debut
        const ageDays = (Date.now() - Date.parse(ipo.ipoDate)) / 86400000;
        return await yahooChart(ipo.symbol, ageDays > 700 ? '5y' : '2y', '1d');
      } catch (e) {
        return null;
      }
    }),
    yahooSpark(listed.map((x) => x.symbol), '1d', '5m').catch(() => new Map()),
  ]);
  const enrich = (ipo, ch) => {
    const out = { ...ipo };
    const dq = dayMap.get(ipo.symbol);
    if (ch && ch.c.length) {
      // first bar on/after IPO date
      const ipoTs = Date.parse(ipo.ipoDate + 'T00:00:00Z') / 1000 - 86400;
      // first *traded* bar on/after the IPO date (Yahoo sometimes prepends a zero-volume placeholder bar at the offer price)
      let i0 = ch.t.findIndex((t, i) => t >= ipoTs && (ch.v[i] == null || ch.v[i] > 0));
      if (i0 < 0) i0 = Math.max(0, ch.t.findIndex((t) => t >= ipoTs));
      const firstClose = ch.c[i0];
      const firstOpen = ch.o[i0] != null ? ch.o[i0] : firstClose;
      const ref = ipo.ipoPrice != null ? ipo.ipoPrice : firstClose;
      // previous session close: prefer the intraday quote's previousClose, else the second-to-last daily bar
      const n = ch.c.length;
      const prevClose = dq && dq.prevClose != null ? dq.prevClose : n >= 2 ? ch.c[n - 2] : ch.prevClose;
      out.live = {
        price: ch.price, currency: ch.currency, prevClose, marketState: dq ? dq.marketState : ch.marketState, marketTime: ch.marketTime,
        firstOpen, firstClose, refPrice: ref, refIsFirstClose: ipo.ipoPrice == null,
        dayOnePop: ipo.ipoPrice ? (firstClose / ipo.ipoPrice - 1) * 100 : null,
        openPop: ipo.ipoPrice ? (firstOpen / ipo.ipoPrice - 1) * 100 : null,
        returnSinceIpo: ref ? (ch.price / ref - 1) * 100 : null,
        dayChangePct: dq && dq.changePct != null ? dq.changePct : prevClose ? (ch.price / prevClose - 1) * 100 : null,
        high: Math.max(...ch.h.slice(i0).filter((x) => x != null)),
        low: Math.min(...ch.l.slice(i0).filter((x) => x != null)),
        spark: downsample(ch.c.slice(i0), 60),
        sparkT: downsample(ch.t.slice(i0), 60),
      };
    }
    return out;
  };
  const recent2026 = data.recent2026.map((ipo, i) => enrich(ipo, charts[i]));
  const class2025 = data.class2025.map((ipo, i) => enrich(ipo, charts[data.recent2026.length + i]));
  const off = data.recent2026.length + data.class2025.length;
  const jseListed = jse.map((ipo, i) => enrich(ipo, charts[off + i]));
  const jseAfrica = data.jseAfrica ? { ...data.jseAfrica, listed: jseListed } : null;
  return { asOf: Date.now(), recent2026, class2025, upcoming: data.upcoming, pipeline: data.pipeline, stats: data.stats, fallbackNews: data.fallbackNews, jseAfrica };
}

/* ------------------------------------------------------------------ */
/* Bonds & rates                                                        */
/* ------------------------------------------------------------------ */
function loadRatesData() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'rates.json'), 'utf8'));
}
/** Yield curve now vs ~1 month / ~1 year ago, using weekly closes. */
async function ratesBoard() {
  const data = loadRatesData();
  const ySyms = data.usYields.map((y) => y.symbol);
  const etfSyms = Object.values(data.bondEtfs).flat();
  const futSyms = data.bondFutures;
  const [quoteMap, hist] = await Promise.all([
    yahooSpark([...ySyms, ...etfSyms, ...futSyms], '1d', '15m'),
    yahooSpark(ySyms, '1y', '1wk').catch(() => new Map()),
  ]);
  const curve = data.usYields.map((y) => {
    const q = quoteMap.get(y.symbol);
    const h = hist.get(y.symbol);
    const pts = h ? h.spark : [];
    const n = pts.length;
    // weekly points: ~4 weeks back and first point (~1y back)
    const ago1m = n >= 5 ? pts[n - 5] : null;
    const ago1y = n ? pts[0] : null;
    return {
      ...y,
      yield: q ? q.price : null,
      prev: q ? q.prevClose : null,
      changeBp: q && q.prevClose != null ? (q.price - q.prevClose) * 100 : null,
      ago1m,
      ago1y,
      marketTime: q ? q.marketTime : null,
      spark: h ? h.spark : [],
      sparkT: h ? h.sparkT : [],
    };
  });
  const by = Object.fromEntries(curve.map((c) => [c.label, c.yield]));
  const spreads = [
    { label: '2s10s', name: '10Y − 2Y', bp: by['10Y'] != null && by['2Y'] != null ? (by['10Y'] - by['2Y']) * 100 : null },
    { label: '3m10y', name: '10Y − 3M', bp: by['10Y'] != null && by['3M'] != null ? (by['10Y'] - by['3M']) * 100 : null },
    { label: '5s30s', name: '30Y − 5Y', bp: by['30Y'] != null && by['5Y'] != null ? (by['30Y'] - by['5Y']) * 100 : null },
  ];
  const etfs = {};
  for (const [group, syms] of Object.entries(data.bondEtfs)) etfs[group] = syms.map((sym) => quoteMap.get(sym)).filter(Boolean).map((q) => ({ ...q, label: data.etfNames[q.symbol] || q.name }));
  const futures = futSyms.map((sym) => quoteMap.get(sym)).filter(Boolean).map((q) => ({ ...q, label: data.etfNames[q.symbol] || q.name }));
  return { asOf: Date.now(), dataAsOf: data.asOf, centralBanks: data.centralBanks, southAfrica: data.southAfrica, curve, spreads, etfs, futures };
}

/* ------------------------------------------------------------------ */
/* CFTC Commitments of Traders                                          */
/* ------------------------------------------------------------------ */
const CFTC_BASE = 'https://publicreporting.cftc.gov/resource';
const COT_DATASETS = { legacy: '6dca-aqww', tff: 'gpe5-46if', disagg: '72hh-3qpy' };
function loadCotMarkets() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cot_markets.json'), 'utf8'));
}
const cotNum = (v) => (v == null || v === '' ? null : Number(String(v).trim()));
function cotQuery(dataset, params) {
  const qs = new URLSearchParams(params).toString();
  return fetchJSON(`${CFTC_BASE}/${COT_DATASETS[dataset]}.json?${qs}`, { timeout: 40000 });
}
function cotDateStr(iso) { return String(iso).slice(0, 10); }
function pct(a, b) { return a != null && b ? (a / b) * 100 : null; }
/** COT index (Williams) = position of current net within min–max of lookback window. */
function cotIndex(series, i, window) {
  const from = Math.max(0, i - window + 1);
  const slice = series.slice(from, i + 1).filter((v) => v != null);
  if (slice.length < 4) return null;
  const min = Math.min(...slice), max = Math.max(...slice);
  return max > min ? ((series[i] - min) / (max - min)) * 100 : 50;
}
function zScore(series, i, window) {
  const from = Math.max(0, i - window + 1);
  const slice = series.slice(from, i + 1).filter((v) => v != null);
  if (slice.length < 8) return null;
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const sd = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length);
  return sd ? (series[i] - mean) / sd : 0;
}

/** Board: latest week for every market in the universe + 3y legacy history for indexes/sparks. */
async function cotBoard() {
  const cfg = loadCotMarkets();
  const markets = cfg.groups.flatMap((g) => g.markets.map((m) => ({ ...m, group: g.name, icon: g.icon })));
  const codes = markets.map((m) => m.code);
  const since = new Date(Date.now() - (cfg.lookbackYears || 3) * 365.25 * 86400000).toISOString().slice(0, 10);
  const inList = codes.map((c) => `'${c}'`).join(',');
  const rows = await cotQuery('legacy', {
    $select: 'cftc_contract_market_code,report_date_as_yyyy_mm_dd,open_interest_all,noncomm_positions_long_all,noncomm_positions_short_all,noncomm_postions_spread_all,comm_positions_long_all,comm_positions_short_all,nonrept_positions_long_all,nonrept_positions_short_all,change_in_open_interest_all,change_in_noncomm_long_all,change_in_noncomm_short_all,change_in_comm_long_all,change_in_comm_short_all',
    $where: `report_date_as_yyyy_mm_dd >= '${since}T00:00:00.000' AND cftc_contract_market_code in (${inList})`,
    $order: 'report_date_as_yyyy_mm_dd',
    $limit: '50000',
  });
  if (!Array.isArray(rows) || !rows.length) throw new Error('CFTC returned no rows');
  const byCode = new Map();
  for (const r of rows) {
    const c = r.cftc_contract_market_code;
    if (!byCode.has(c)) byCode.set(c, []);
    byCode.get(c).push(r);
  }
  let reportDate = null;
  const items = markets.map((m) => {
    const hist = (byCode.get(m.code) || []).slice().sort((a, b) => a.report_date_as_yyyy_mm_dd.localeCompare(b.report_date_as_yyyy_mm_dd));
    if (!hist.length) return { ...m, missing: true };
    const dates = hist.map((r) => cotDateStr(r.report_date_as_yyyy_mm_dd));
    const oi = hist.map((r) => cotNum(r.open_interest_all));
    const ncL = hist.map((r) => cotNum(r.noncomm_positions_long_all));
    const ncS = hist.map((r) => cotNum(r.noncomm_positions_short_all));
    const cL = hist.map((r) => cotNum(r.comm_positions_long_all));
    const cS = hist.map((r) => cotNum(r.comm_positions_short_all));
    const nrL = hist.map((r) => cotNum(r.nonrept_positions_long_all));
    const nrS = hist.map((r) => cotNum(r.nonrept_positions_short_all));
    const netNC = ncL.map((v, i) => (v != null && ncS[i] != null ? v - ncS[i] : null));
    const netC = cL.map((v, i) => (v != null && cS[i] != null ? v - cS[i] : null));
    const netNR = nrL.map((v, i) => (v != null && nrS[i] != null ? v - nrS[i] : null));
    const n = hist.length - 1;
    const last = hist[n];
    const d = dates[n];
    if (!reportDate || d > reportDate) reportDate = d;
    const wk = (arr, k) => (n - k >= 0 && arr[n] != null && arr[n - k] != null ? arr[n] - arr[n - k] : null);
    return {
      ...m,
      reportDate: d,
      weeks: hist.length,
      openInterest: oi[n],
      oiChange: cotNum(last.change_in_open_interest_all),
      nonComm: { long: ncL[n], short: ncS[n], spread: cotNum(last.noncomm_postions_spread_all), net: netNC[n], change: wk(netNC, 1), change4w: wk(netNC, 4), longChg: cotNum(last.change_in_noncomm_long_all), shortChg: cotNum(last.change_in_noncomm_short_all), pctOI: pct(netNC[n], oi[n]), longPctOI: pct(ncL[n], oi[n]), shortPctOI: pct(ncS[n], oi[n]) },
      comm: { long: cL[n], short: cS[n], net: netC[n], change: wk(netC, 1), change4w: wk(netC, 4), longChg: cotNum(last.change_in_comm_long_all), shortChg: cotNum(last.change_in_comm_short_all), pctOI: pct(netC[n], oi[n]) },
      nonRept: { long: nrL[n], short: nrS[n], net: netNR[n], change: wk(netNR, 1), pctOI: pct(netNR[n], oi[n]) },
      index26: cotIndex(netNC, n, 26),
      index52: cotIndex(netNC, n, 52),
      index156: cotIndex(netNC, n, 156),
      commIndex52: cotIndex(netC, n, 52),
      z52: zScore(netNC, n, 52),
      extremes: { max52: Math.max(...netNC.slice(Math.max(0, n - 51)).filter((v) => v != null)), min52: Math.min(...netNC.slice(Math.max(0, n - 51)).filter((v) => v != null)), max3y: Math.max(...netNC.filter((v) => v != null)), min3y: Math.min(...netNC.filter((v) => v != null)) },
      spark: netNC.slice(-52),
      sparkDates: dates.slice(-52),
      flags: {
        record3yLong: netNC[n] != null && netNC[n] >= Math.max(...netNC.filter((v) => v != null)),
        record3yShort: netNC[n] != null && netNC[n] <= Math.min(...netNC.filter((v) => v != null)),
        flipped: n >= 1 && netNC[n] != null && netNC[n - 1] != null && Math.sign(netNC[n]) !== Math.sign(netNC[n - 1]) && netNC[n] !== 0,
      },
    };
  });
  const dated = items.filter((x) => !x.missing);
  const releaseDate = reportDate ? new Date(Date.parse(reportDate + 'T00:00:00Z') + 3 * 86400000).toISOString().slice(0, 10) : null; // Tuesday data → Friday release
  const nextRelease = releaseDate ? new Date(Date.parse(releaseDate + 'T00:00:00Z') + 7 * 86400000).toISOString().slice(0, 10) : null;
  return {
    asOf: Date.now(), reportDate, releaseDate, nextRelease, lookbackYears: cfg.lookbackYears || 3,
    groups: cfg.groups.map((g) => ({ name: g.name, icon: g.icon, codes: g.markets.map((m) => m.code) })),
    items: dated,
    missing: items.filter((x) => x.missing).map((x) => x.code),
    source: 'CFTC Public Reporting (Socrata) — Legacy futures-only report',
  };
}

/** Detail: full history for one market (legacy) + TFF or disaggregated breakdown + weekly price series. */
async function cotDetail(code, years) {
  const cfg = loadCotMarkets();
  const m = cfg.groups.flatMap((g) => g.markets.map((mm) => ({ ...mm, group: g.name }))).find((x) => x.code === code);
  if (!m) throw Object.assign(new Error('Unknown COT market code'), { status: 404 });
  const since = new Date(Date.now() - years * 365.25 * 86400000).toISOString().slice(0, 10);
  const where = `report_date_as_yyyy_mm_dd >= '${since}T00:00:00.000' AND cftc_contract_market_code = '${code}'`;
  const isFin = ['Currencies', 'Equity indices', 'Interest rates'].includes(m.group);
  const [legacy, breakdown, priceRes] = await Promise.all([
    cotQuery('legacy', { $select: 'report_date_as_yyyy_mm_dd,market_and_exchange_names,open_interest_all,noncomm_positions_long_all,noncomm_positions_short_all,noncomm_postions_spread_all,comm_positions_long_all,comm_positions_short_all,nonrept_positions_long_all,nonrept_positions_short_all,tot_rept_positions_long_all,tot_rept_positions_short', $where: where, $order: 'report_date_as_yyyy_mm_dd', $limit: '5000' }),
    (isFin
      ? cotQuery('tff', { $select: 'report_date_as_yyyy_mm_dd,open_interest_all,dealer_positions_long_all,dealer_positions_short_all,asset_mgr_positions_long,asset_mgr_positions_short,lev_money_positions_long,lev_money_positions_short,other_rept_positions_long,other_rept_positions_short,nonrept_positions_long_all,nonrept_positions_short_all,change_in_dealer_long_all,change_in_dealer_short_all,change_in_asset_mgr_long,change_in_asset_mgr_short,change_in_lev_money_long,change_in_lev_money_short,change_in_other_rept_long,change_in_other_rept_short', $where: where, $order: 'report_date_as_yyyy_mm_dd', $limit: '5000' })
      : cotQuery('disagg', { $select: 'report_date_as_yyyy_mm_dd,open_interest_all,prod_merc_positions_long,prod_merc_positions_short,swap_positions_long_all,swap__positions_short_all,m_money_positions_long_all,m_money_positions_short_all,other_rept_positions_long,other_rept_positions_short,nonrept_positions_long_all,nonrept_positions_short_all,change_in_prod_merc_long,change_in_prod_merc_short,change_in_swap_long_all,change_in_swap_short_all,change_in_m_money_long_all,change_in_m_money_short_all,change_in_other_rept_long,change_in_other_rept_short', $where: where, $order: 'report_date_as_yyyy_mm_dd', $limit: '5000' })
    ).catch(() => []),
    m.yahoo ? yahooChart(m.yahoo, years > 5 ? '10y' : years > 2 ? '5y' : years >= 2 ? '2y' : '1y', years >= 2 ? '1wk' : '1d').catch(() => null) : Promise.resolve(null),
  ]);
  if (!Array.isArray(legacy) || !legacy.length) throw new Error('No CFTC history for ' + code);
  const dates = legacy.map((r) => cotDateStr(r.report_date_as_yyyy_mm_dd));
  const pick = (k) => legacy.map((r) => cotNum(r[k]));
  const oi = pick('open_interest_all');
  const ncL = pick('noncomm_positions_long_all'), ncS = pick('noncomm_positions_short_all'), cL = pick('comm_positions_long_all'), cS = pick('comm_positions_short_all'), nrL = pick('nonrept_positions_long_all'), nrS = pick('nonrept_positions_short_all');
  const net = (a, b) => a.map((v, i) => (v != null && b[i] != null ? v - b[i] : null));
  const netNC = net(ncL, ncS), netC = net(cL, cS), netNR = net(nrL, nrS);
  const n = dates.length - 1;
  const idx = (arr, w) => arr.map((_, i) => cotIndex(arr, i, w));
  // breakdown (TFF / disaggregated) — latest week + net series per category
  let categories = null;
  if (Array.isArray(breakdown) && breakdown.length) {
    const b = breakdown.slice().sort((x, y) => x.report_date_as_yyyy_mm_dd.localeCompare(y.report_date_as_yyyy_mm_dd));
    const bd = b.map((r) => cotDateStr(r.report_date_as_yyyy_mm_dd));
    const defs = isFin
      ? [['Dealer / intermediary', 'dealer_positions_long_all', 'dealer_positions_short_all', 'change_in_dealer_long_all', 'change_in_dealer_short_all'], ['Asset manager / institutional', 'asset_mgr_positions_long', 'asset_mgr_positions_short', 'change_in_asset_mgr_long', 'change_in_asset_mgr_short'], ['Leveraged funds', 'lev_money_positions_long', 'lev_money_positions_short', 'change_in_lev_money_long', 'change_in_lev_money_short'], ['Other reportables', 'other_rept_positions_long', 'other_rept_positions_short', 'change_in_other_rept_long', 'change_in_other_rept_short'], ['Non-reportable (small)', 'nonrept_positions_long_all', 'nonrept_positions_short_all', null, null]]
      : [['Producer / merchant / user', 'prod_merc_positions_long', 'prod_merc_positions_short', 'change_in_prod_merc_long', 'change_in_prod_merc_short'], ['Swap dealers', 'swap_positions_long_all', 'swap__positions_short_all', 'change_in_swap_long_all', 'change_in_swap_short_all'], ['Managed money', 'm_money_positions_long_all', 'm_money_positions_short_all', 'change_in_m_money_long_all', 'change_in_m_money_short_all'], ['Other reportables', 'other_rept_positions_long', 'other_rept_positions_short', 'change_in_other_rept_long', 'change_in_other_rept_short'], ['Non-reportable (small)', 'nonrept_positions_long_all', 'nonrept_positions_short_all', null, null]];
    const lastB = b[b.length - 1];
    const oiB = cotNum(lastB.open_interest_all);
    categories = {
      type: isFin ? 'tff' : 'disagg',
      reportDate: bd[bd.length - 1],
      openInterest: oiB,
      dates: bd,
      rows: defs.map(([label, lk, sk, lck, sck]) => {
        const L = cotNum(lastB[lk]), S = cotNum(lastB[sk]);
        const series = b.map((r) => { const l = cotNum(r[lk]), s2 = cotNum(r[sk]); return l != null && s2 != null ? l - s2 : null; });
        return { label, long: L, short: S, net: L != null && S != null ? L - S : null, longChg: lck ? cotNum(lastB[lck]) : null, shortChg: sck ? cotNum(lastB[sck]) : null, pctOI: pct(L != null && S != null ? L - S : null, oiB), longPctOI: pct(L, oiB), shortPctOI: pct(S, oiB), series, index52: cotIndex(series, series.length - 1, 52) };
      }),
    };
  }
  // weekly price aligned to report dates (Tuesday close ≈ nearest bar on/before)
  let price = null;
  if (priceRes && priceRes.c && priceRes.c.length) {
    const pt = priceRes.t, pc = priceRes.c;
    const aligned = dates.map((d) => {
      const ts = Date.parse(d + 'T23:59:59Z') / 1000;
      let j = -1;
      for (let k = pt.length - 1; k >= 0; k--) if (pt[k] <= ts) { j = k; break; }
      if (j < 0) return null;
      const v = pc[j];
      return m.invertPrice && v ? 1 / v : v;
    });
    price = { symbol: m.yahoo, name: priceRes.name, currency: priceRes.currency, inverted: !!m.invertPrice, series: aligned, last: m.invertPrice && priceRes.price ? 1 / priceRes.price : priceRes.price };
  }
  return {
    asOf: Date.now(),
    market: { ...m, fullName: legacy[n].market_and_exchange_names },
    reportDate: dates[n],
    dates,
    openInterest: oi,
    nonComm: { long: ncL, short: ncS, net: netNC, index26: idx(netNC, 26), index52: idx(netNC, 52), index156: idx(netNC, 156) },
    comm: { long: cL, short: cS, net: netC, index52: idx(netC, 52) },
    nonRept: { long: nrL, short: nrS, net: netNR },
    latest: {
      openInterest: oi[n], oiChange: n >= 1 ? oi[n] - oi[n - 1] : null,
      nonComm: { long: ncL[n], short: ncS[n], spread: cotNum(legacy[n].noncomm_postions_spread_all), net: netNC[n], change: n >= 1 ? netNC[n] - netNC[n - 1] : null, longChg: n >= 1 ? ncL[n] - ncL[n - 1] : null, shortChg: n >= 1 ? ncS[n] - ncS[n - 1] : null, pctOI: pct(netNC[n], oi[n]), longPctOI: pct(ncL[n], oi[n]), shortPctOI: pct(ncS[n], oi[n]) },
      comm: { long: cL[n], short: cS[n], net: netC[n], change: n >= 1 ? netC[n] - netC[n - 1] : null, longChg: n >= 1 ? cL[n] - cL[n - 1] : null, shortChg: n >= 1 ? cS[n] - cS[n - 1] : null, pctOI: pct(netC[n], oi[n]), longPctOI: pct(cL[n], oi[n]), shortPctOI: pct(cS[n], oi[n]) },
      nonRept: { long: nrL[n], short: nrS[n], net: netNR[n], change: n >= 1 ? netNR[n] - netNR[n - 1] : null, longChg: n >= 1 ? nrL[n] - nrL[n - 1] : null, shortChg: n >= 1 ? nrS[n] - nrS[n - 1] : null, pctOI: pct(netNR[n], oi[n]), longPctOI: pct(nrL[n], oi[n]), shortPctOI: pct(nrS[n], oi[n]) },
      index26: cotIndex(netNC, n, 26), index52: cotIndex(netNC, n, 52), index156: cotIndex(netNC, n, 156), z52: zScore(netNC, n, 52),
    },
    categories,
    price,
  };
}

/* ------------------------------------------------------------------ */
/* HTTP layer                                                           */
/* ------------------------------------------------------------------ */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

function sendJSON(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', ...extraHeaders });
  res.end(body);
}
function serveStatic(req, res, pathname) {
  let p = pathname === '/' ? '/index.html' : pathname;
  p = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(PUBLIC_DIR, p);
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // SPA fallback
      if (!path.extname(p)) return serveStatic(req, res, '/index.html');
      res.writeHead(404); return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

const symList = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 120);

const routes = {
  '/api/health': async () => ({ ok: true, time: Date.now(), uptime: process.uptime(), fxWeekendClosed: fxWeekendClosed() }),

  '/api/quotes': async (q) => {
    const symbols = symList(q.get('symbols'));
    if (!symbols.length) throw Object.assign(new Error('symbols required'), { status: 400 });
    const key = 'quotes:' + symbols.slice().sort().join(',');
    const { val, stale, cachedAt, error } = await cached(key, 10000, async () => {
      let map;
      try {
        map = await yahooSpark(symbols, '1d', '5m');
      } catch (e) {
        // Secondary FX provider — only for FX-only requests (mixed requests are better served by the
        // last-good snapshot, which the cache layer returns when we rethrow).
        const fx = symbols.filter((s) => /^[A-Z]{6}=X$/.test(s));
        if (fx.length !== symbols.length) throw e;
        const { rates, updated } = await erApiRates();
        map = new Map(fx.map((s) => [s, fxFromRates(s, rates, updated)]).filter(([, v]) => v));
        if (!map.size) throw e;
        const out = symbols.map((s) => map.get(s)).filter(Boolean);
        out.__noPersist = true; // don't overwrite a richer snapshot with spark-less fallback rates
        return out;
      }
      return symbols.map((s) => map.get(s)).filter(Boolean);
    });
    return { asOf: cachedAt, stale, error, quotes: val };
  },

  '/api/chart': async (q) => {
    const symbol = (q.get('symbol') || '').trim();
    const range = VALID_RANGES.includes(q.get('range')) ? q.get('range') : '1d';
    if (!symbol) throw Object.assign(new Error('symbol required'), { status: 400 });
    const key = `chart:${symbol}:${range}`;
    const ttl = range === '1d' ? 30000 : 120000;
    const { val, stale, cachedAt, error } = await cached(key, ttl, () => yahooChart(symbol, range));
    return { asOf: cachedAt, stale, error, ...val };
  },

  '/api/series': async (q) => {
    const symbols = symList(q.get('symbols'));
    const range = VALID_RANGES.includes(q.get('range')) ? q.get('range') : '1mo';
    if (!symbols.length) throw Object.assign(new Error('symbols required'), { status: 400 });
    const key = `series:${range}:` + symbols.slice().sort().join(',');
    const { val, stale, cachedAt, error } = await cached(key, 60000, async () => {
      const interval = range === '1d' ? '5m' : range === '5d' ? '30m' : range === '1mo' ? '1h' : range === '5y' || range === '2y' ? '1wk' : '1d';
      const map = await yahooSpark(symbols, range, interval);
      return symbols.map((s) => map.get(s)).filter(Boolean).map((qq) => ({ symbol: qq.symbol, name: qq.name, currency: qq.currency, price: qq.price, base: range === '1d' ? qq.prevClose : qq.chartPrevClose, t: qq.sparkT, c: qq.spark }));
    });
    return { asOf: cachedAt, stale, error, range, series: val };
  },

  '/api/perf': async (q) => {
    const symbols = symList(q.get('symbols'));
    const range = ['1d', '5d', '1mo', '3mo', '6mo', 'ytd', '1y'].includes(q.get('range')) ? q.get('range') : '1mo';
    if (!symbols.length) throw Object.assign(new Error('symbols required'), { status: 400 });
    const key = `perf:${range}:` + symbols.slice().sort().join(',');
    const { val, stale, cachedAt, error } = await cached(key, range === '1d' ? 15000 : 120000, () => periodPerformance(symbols, range));
    return { asOf: cachedAt, stale, error, range, items: val };
  },

  '/api/search': async (q) => {
    const query = (q.get('q') || '').trim();
    if (query.length < 1) return { quotes: [] };
    const key = 'search:' + query.toLowerCase();
    const { val } = await cached(key, 300000, async () => {
      const d = await yfJSON(`/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`);
      return (d.quotes || []).filter((x) => x.symbol).map((x) => ({ symbol: x.symbol, name: x.shortname || x.longname || x.symbol, exchange: x.exchDisp || x.exchange, type: x.typeDisp || x.quoteType }));
    }, { persist: false });
    return { quotes: val };
  },

  '/api/sp500/outperformers': async (q) => {
    const range = ['1mo', '3mo', '6mo', 'ytd', '1y'].includes(q.get('range')) ? q.get('range') : 'ytd';
    const limit = Math.min(Math.max(parseInt(q.get('limit') || '10', 10) || 10, 1), 60);
    const key = `sp500:${range}`;
    const { val, stale, cachedAt, error } = await cached(key, 5 * 60000, async () => {
      const members = constituents();
      const [perf, idx] = await Promise.all([periodPerformance(members.map((m) => m.symbol), range), periodPerformance(['^GSPC'], range)]);
      const spx = idx[0];
      if (!spx) throw new Error('S&P 500 index data unavailable');
      const meta = new Map(members.map((m) => [m.symbol, m]));
      const ranked = perf
        .map((p) => ({ ...p, name: meta.get(p.symbol) ? meta.get(p.symbol).name : p.name, sector: meta.get(p.symbol) ? meta.get(p.symbol).sector : null, subIndustry: meta.get(p.symbol) ? meta.get(p.symbol).subIndustry : null, excess: p.ret - spx.ret }))
        .sort((a, b) => b.ret - a.ret)
        .map((p, i) => ({ ...p, rank: i + 1 }));
      const beating = ranked.filter((p) => p.ret > spx.ret).length;
      const rets = ranked.map((p) => p.ret).sort((a, b) => a - b);
      const median = rets.length ? rets[Math.floor(rets.length / 2)] : null;
      const sectorAgg = {};
      for (const p of ranked) {
        const s = p.sector || 'Other';
        sectorAgg[s] = sectorAgg[s] || { sector: s, n: 0, sum: 0, beating: 0 };
        sectorAgg[s].n++;
        sectorAgg[s].sum += p.ret;
        if (p.ret > spx.ret) sectorAgg[s].beating++;
      }
      const sectors = Object.values(sectorAgg).map((s) => ({ sector: s.sector, n: s.n, avg: s.sum / s.n, beating: s.beating })).sort((a, b) => b.avg - a.avg);
      // strip sparks from the long tail to keep payload small
      const top = ranked.slice(0, 60);
      const tail = ranked.slice(60).map(({ spark, sparkT, ...rest }) => rest);
      return { range, index: { symbol: '^GSPC', name: 'S&P 500', price: spx.price, ret: spx.ret, spark: spx.spark, sparkT: spx.sparkT }, scanned: perf.length, members: members.length, beating, median, sectors, ranked: [...top, ...tail] };
    });
    return { asOf: cachedAt, stale, error, ...val, ranked: val.ranked.slice(0, limit), laggards: val.ranked.slice(-5).reverse() };
  },

  '/api/ipos': async () => {
    const { val, stale, cachedAt, error } = await cached('ipos', 10 * 60000, ipoBoard);
    return { stale, cachedAt, error, ...val };
  },

  '/api/cot': async () => {
    const { val, stale, cachedAt, error } = await cached('cot:board', 6 * 3600000, cotBoard);
    return { stale, cachedAt, error, ...val };
  },
  '/api/cot/detail': async (q) => {
    const code = (q.get('code') || '').trim();
    if (!/^[0-9A-Z+]{5,8}$/i.test(code)) throw Object.assign(new Error('code required'), { status: 400 });
    const years = Math.min(10, Math.max(1, parseInt(q.get('years') || '3', 10) || 3));
    const { val, stale, cachedAt, error } = await cached(`cot:detail:${code}:${years}`, 6 * 3600000, () => cotDetail(code, years));
    return { stale, cachedAt, error, ...val };
  },

  '/api/rates': async () => {
    const { val, stale, cachedAt, error } = await cached('rates', 60000, ratesBoard);
    return { stale, cachedAt, error, ...val };
  },

  '/api/news': async (q) => {
    const query = (q.get('q') || 'IPO').trim().slice(0, 80);
    const days = Math.min(Math.max(parseInt(q.get('days') || '7', 10) || 7, 1), 30);
    const key = `news:${query.toLowerCase()}:${days}`;
    try {
      const { val, stale, cachedAt, error } = await cached(key, 10 * 60000, () => googleNews(query, days));
      return { asOf: cachedAt, stale, error, query, items: val };
    } catch (e) {
      const fb = loadIpoData().fallbackNews || [];
      return { asOf: Date.now(), stale: true, error: e.message, query, items: fb, fallback: true };
    }
  },
};

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); return res.end(); }
  if (u.pathname.startsWith('/api/')) {
    const handler = routes[u.pathname];
    if (!handler) return sendJSON(res, 404, { error: 'Unknown endpoint' });
    try {
      const out = await handler(u.searchParams);
      sendJSON(res, 200, out);
    } catch (e) {
      const status = e.status && e.status < 500 ? e.status : 502;
      sendJSON(res, status, { error: e.message || 'Upstream error' });
    }
    return;
  }
  serveStatic(req, res, u.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Harrington Global Markets prototype listening on http://0.0.0.0:${PORT}`);
});
