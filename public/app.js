/* Harrington Global Markets — front-end (vanilla JS, no build step) */
(function () {
  'use strict';

  /* ================================================================== */
  /* Configuration: instrument universes                                 */
  /* ================================================================== */
  const FX = {
    majors: ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X'],
    crosses: ['EURGBP=X', 'EURJPY=X', 'GBPJPY=X', 'EURCHF=X', 'AUDJPY=X', 'EURAUD=X', 'ZARJPY=X'],
    africaEm: ['USDZAR=X', 'EURZAR=X', 'GBPZAR=X', 'USDNGN=X', 'USDKES=X', 'USDEGP=X', 'USDINR=X', 'USDCNY=X', 'USDMXN=X', 'USDBRL=X', 'USDTRY=X'],
    other: ['DX-Y.NYB', 'USDSGD=X', 'USDHKD=X', 'USDSEK=X', 'USDNOK=X', 'USDPLN=X', 'USDKRW=X'],
  };
  const FX_ALL = [...FX.majors, ...FX.crosses, ...FX.africaEm, ...FX.other];
  const CONV_CCYS = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'ZAR', 'CNY', 'INR', 'NGN', 'KES', 'EGP', 'MXN', 'BRL', 'TRY', 'SGD', 'HKD', 'SEK', 'NOK', 'PLN', 'KRW'];
  const MATRIX_CCYS = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'ZAR'];
  const STRENGTH_CCYS = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'ZAR'];
  const FLAG = { USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CHF: '🇨🇭', AUD: '🇦🇺', CAD: '🇨🇦', NZD: '🇳🇿', ZAR: '🇿🇦', CNY: '🇨🇳', INR: '🇮🇳', NGN: '🇳🇬', KES: '🇰🇪', EGP: '🇪🇬', MXN: '🇲🇽', BRL: '🇧🇷', TRY: '🇹🇷', SGD: '🇸🇬', HKD: '🇭🇰', SEK: '🇸🇪', NOK: '🇳🇴', PLN: '🇵🇱', KRW: '🇰🇷' };

  const INDICES = {
    Americas: ['^GSPC', '^DJI', '^IXIC', '^NDX', '^RUT', '^VIX', '^GSPTSE', '^BVSP', '^MXX'],
    Europe: ['^FTSE', '^GDAXI', '^FCHI', '^STOXX50E', '^IBEX', '^SSMI', '^AEX'],
    'Asia-Pacific': ['^N225', '^HSI', '000001.SS', '^BSESN', '^NSEI', '^AXJO', '^KS11', '^TWII', '^STI'],
    'Africa & Middle East': ['^J200.JO', '^J203.JO', '^J210.JO', '^CASE30', '^TA125.TA'],
    Commodities: ['GC=F', 'SI=F', 'PL=F', 'CL=F', 'BZ=F', 'NG=F', 'HG=F'],
    Crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
  };
  const INDEX_NAMES = { '^GSPC': 'S&P 500', '^DJI': 'Dow Jones', '^IXIC': 'Nasdaq Composite', '^NDX': 'Nasdaq 100', '^RUT': 'Russell 2000', '^VIX': 'VIX', '^GSPTSE': 'S&P/TSX', '^BVSP': 'Bovespa', '^MXX': 'IPC Mexico', '^FTSE': 'FTSE 100', '^GDAXI': 'DAX', '^FCHI': 'CAC 40', '^STOXX50E': 'Euro Stoxx 50', '^IBEX': 'IBEX 35', '^SSMI': 'SMI', '^AEX': 'AEX', '^N225': 'Nikkei 225', '^HSI': 'Hang Seng', '000001.SS': 'Shanghai Comp.', '^BSESN': 'Sensex', '^NSEI': 'Nifty 50', '^AXJO': 'ASX 200', '^KS11': 'KOSPI', '^TWII': 'Taiwan TAIEX', '^STI': 'Straits Times', '^J200.JO': 'JSE Top 40', '^J203.JO': 'JSE All Share', '^J210.JO': 'JSE Resources 10', '^CASE30': 'EGX 30', '^TA125.TA': 'TA-125', 'GC=F': 'Gold', 'SI=F': 'Silver', 'PL=F': 'Platinum', 'CL=F': 'WTI Crude', 'BZ=F': 'Brent Crude', 'NG=F': 'Natural Gas', 'HG=F': 'Copper', 'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum', 'SOL-USD': 'Solana', 'DX-Y.NYB': 'US Dollar Index' };
  const INDEX_ALL = Object.values(INDICES).flat();

  const STOCKS = {
    'US Mega Caps': ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'AVGO', 'LLY', 'JPM', 'V', 'XOM', 'WMT', 'UNH', 'NFLX', 'ORCL', 'MA', 'COST', 'JNJ'],
    'JSE Large Caps': ['NPN.JO', 'PRX.JO', 'FSR.JO', 'SBK.JO', 'AGL.JO', 'SOL.JO', 'MTN.JO', 'CPI.JO', 'GFI.JO', 'ANG.JO', 'SHP.JO', 'VOD.JO', 'ABG.JO', 'NED.JO', 'DSY.JO', 'BTI.JO', 'CFR.JO', 'BHG.JO', 'SLM.JO', 'MNP.JO'],
  };

  const SECTORS = {
    financials: {
      label: 'Financials',
      etf: 'XLF',
      groups: {
        'Global banks': ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'HSBC'],
        'Payments & networks': ['V', 'MA', 'AXP', 'PYPL', 'XYZ'],
        'Exchanges, data & asset mgmt': ['BLK', 'SCHW', 'ICE', 'CME', 'SPGI', 'MSCI'],
        Insurance: ['BRK-B', 'PGR', 'CB', 'AIG'],
        'Fintech & crypto-fin': ['COIN', 'HOOD', 'SOFI', 'AFRM', 'NU', 'KLAR', 'CHYM', 'CRCL'],
      },
    },
    tech: {
      label: 'Technology',
      etf: 'XLK',
      groups: {
        'Mega-cap platforms': ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN'],
        Semiconductors: ['AMD', 'AVGO', 'INTC', 'MU', 'QCOM', 'TXN', 'AMAT', 'LRCX', 'TSM', 'ASML', 'ARM', 'MRVL', 'SNDK'],
        'Software & cloud': ['ORCL', 'CRM', 'NOW', 'ADBE', 'PLTR', 'IBM'],
        'Hardware & AI infrastructure': ['DELL', 'HPE', 'SMCI', 'ANET', 'CSCO', 'STX', 'WDC', 'CRWV', 'NBIS'],
      },
    },
  };
  const SECTOR_ETFS = ['XLF', 'XLK', 'SOXX', 'SPY'];
  const ETF_NAMES = { XLF: 'Financials ETF (XLF)', XLK: 'Technology ETF (XLK)', SOXX: 'Semiconductors (SOXX)', SPY: 'S&P 500 (SPY)' };

  const TAPE = ['^GSPC', '^DJI', '^IXIC', '^FTSE', '^GDAXI', '^N225', '^HSI', '^J200.JO', 'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDZAR=X', 'DX-Y.NYB', 'GC=F', 'CL=F', 'BTC-USD', '^VIX', 'NVDA', 'AAPL', 'MSFT', 'SNDK'];

  const CLOCKS = [
    { code: 'JNB', tz: 'Africa/Johannesburg', open: 9 * 60, close: 17 * 60, name: 'Johannesburg' },
    { code: 'LON', tz: 'Europe/London', open: 8 * 60, close: 16 * 60 + 30, name: 'London' },
    { code: 'NYC', tz: 'America/New_York', open: 9 * 60 + 30, close: 16 * 60, name: 'New York' },
    { code: 'TYO', tz: 'Asia/Tokyo', open: 9 * 60, close: 15 * 60 + 30, name: 'Tokyo' },
    { code: 'SYD', tz: 'Australia/Sydney', open: 10 * 60, close: 16 * 60, name: 'Sydney' },
  ];
  const FX_SESSIONS = [ // approximate UTC windows (northern-hemisphere DST)
    { name: 'Sydney', start: 21, end: 6 },
    { name: 'Tokyo', start: 0, end: 9 },
    { name: 'London', start: 7, end: 16 },
    { name: 'New York', start: 12, end: 21 },
  ];
  const PALETTE = ['#d4af37', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16'];

  /* ================================================================== */
  /* State                                                               */
  /* ================================================================== */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const state = {
    tab: null,
    quotes: new Map(), // symbol -> latest quote
    prevPrices: new Map(),
    watchlist: JSON.parse(localStorage.getItem('hgm.watchlist') || '["^J200.JO","USDZAR=X","NPN.JO","NVDA","SNDK","GC=F"]'),
    sort: {},
    timers: {},
    lastOk: 0,
    lastStale: false,
    lastError: null,
    fx: { usdRates: null, usdPrev: null },
    sectors: { range: '1d', sector: 'financials', compare: [] },
    outperf: { range: 'ytd', limit: 10 },
    ipo: { newsQuery: 'IPO', data: null },
    indices: { compare: ['^GSPC', '^J200.JO', '^FTSE', '^N225'], range: '1mo' },
    modal: { symbol: null, range: '1d', type: 'area', chart: null, quote: null },
    alerts: JSON.parse(localStorage.getItem('hgm.alerts') || '[]'),
    positions: JSON.parse(localStorage.getItem('hgm.positions') || 'null'),
    pf: { baseCcy: localStorage.getItem('hgm.baseCcy') || 'ZAR', sort: { key: 'value', dir: -1 } },
    rates: { data: null },
    cot: { board: null, code: localStorage.getItem('hgm.cotCode') || '099741', years: 3, view: 'net', detail: null, detailKey: null, filter: '' },
  };
  if (!Array.isArray(state.positions)) {
    // Demo portfolio so the tab is meaningful on first open (user can delete/replace)
    state.positions = [
      { id: 'p1', symbol: 'NPN.JO', side: 'long', qty: 40, cost: 640, date: '2026-03-02', note: 'Demo position' },
      { id: 'p2', symbol: 'SBK.JO', side: 'long', qty: 150, cost: 245, date: '2026-01-15', note: 'Demo position' },
      { id: 'p3', symbol: 'AAPL', side: 'long', qty: 25, cost: 268, date: '2026-02-10', note: 'Demo position' },
      { id: 'p4', symbol: 'SNDK', side: 'long', qty: 6, cost: 980, date: '2026-05-20', note: 'Demo position' },
      { id: 'p5', symbol: 'GC=F', side: 'long', qty: 2, cost: 4120, date: '2026-04-08', note: 'Demo position (oz)' },
      { id: 'p6', symbol: 'TLT', side: 'long', qty: 60, cost: 84.5, date: '2026-06-01', note: 'Demo position' },
    ];
  }
  const saveAlerts = () => localStorage.setItem('hgm.alerts', JSON.stringify(state.alerts));
  const savePositions = () => localStorage.setItem('hgm.positions', JSON.stringify(state.positions));
  const saveWatch = () => localStorage.setItem('hgm.watchlist', JSON.stringify(state.watchlist));
  const inWatch = (s) => state.watchlist.includes(s);
  function toggleWatch(sym) {
    if (inWatch(sym)) state.watchlist = state.watchlist.filter((x) => x !== sym);
    else state.watchlist = [sym, ...state.watchlist].slice(0, 40);
    saveWatch();
    $$('.star[data-sym]').forEach((el) => { if (el.dataset.sym === sym) el.classList.toggle('on', inWatch(sym)); });
    if (state.modal.symbol === sym) $('#mWatch').textContent = (inWatch(sym) ? '★ In watchlist' : '☆ Watchlist');
    if (state.tab === 'indices') loadWatchlist();
  }

  /* ================================================================== */
  /* Helpers                                                             */
  /* ================================================================== */
  const isFX = (s) => /=X$/.test(s) || s === 'DX-Y.NYB';
  function digitsFor(symbol, price, type) {
    if (/=X$/.test(symbol)) { if (/JPY=X$/.test(symbol)) return 3; if (Math.abs(price) >= 100) return 2; return 4; }
    if (symbol === 'DX-Y.NYB') return 3;
    if (price == null) return 2;
    if (Math.abs(price) < 1) return 4;
    if (type === 'INDEX' && Math.abs(price) >= 1000) return 2;
    return 2;
  }
  function fmtPrice(q, price) {
    const p = price != null ? price : q && q.price;
    if (p == null || !isFinite(p)) return '—';
    const d = digitsFor(q ? q.symbol : '', p, q && q.type);
    return p.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  const fmtPct = (v, d = 2) => (v == null || !isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(d)}%`);
  const fmtChg = (q) => (q.change == null ? '—' : `${q.change > 0 ? '+' : ''}${q.change.toLocaleString('en-US', { minimumFractionDigits: digitsFor(q.symbol, q.price, q.type), maximumFractionDigits: digitsFor(q.symbol, q.price, q.type) })}`);
  const cls = (v) => (v == null || !isFinite(v) ? 'flat' : v > 0 ? 'up' : v < 0 ? 'down' : 'flat');
  const compact = (v) => (v == null ? '—' : Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function timeAgo(ts) {
    if (!ts) return '';
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return `${Math.floor(s)}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
  function fmtClock(ts, tz) {
    if (!ts) return '—';
    try { return new Date(ts * 1000).toLocaleString('en-GB', { timeZone: tz || undefined, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return new Date(ts * 1000).toLocaleString('en-GB'); }
  }
  const displayName = (q) => INDEX_NAMES[q.symbol] || ETF_NAMES[q.symbol] || q.name || q.shortName || q.symbol;
  const fxLabel = (s) => (/^([A-Z]{3})([A-Z]{3})=X$/.test(s) ? s.replace(/^([A-Z]{3})([A-Z]{3})=X$/, '$1/$2') : INDEX_NAMES[s] || s);
  const stateBadge = (q) => { const st = (q.marketState || '').toLowerCase(); const lbl = { open: 'OPEN', pre: 'PRE', post: 'AFTER HRS', closed: 'CLOSED' }[st] || st.toUpperCase(); return `<span class="badge ${st}">${lbl}</span>`; };

  /* ================================================================== */
  /* API                                                                 */
  /* ================================================================== */
  async function api(path, params = {}) {
    const u = new URL(path, location.origin);
    Object.entries(params).forEach(([k, v]) => v != null && u.searchParams.set(k, v));
    let res;
    try {
      res = await fetch(u.toString(), { cache: 'no-store' });
    } catch (e) {
      setConn('error', 'Offline', 'Cannot reach server');
      throw e;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setConn('error', 'Data error', data.error || `HTTP ${res.status}`);
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    state.lastOk = Date.now();
    state.lastStale = !!data.stale;
    if (data.stale) setConn('stale', 'Stale data', `Upstream issue · showing cached (${timeAgo(data.asOf || data.cachedAt)})`);
    else setConn('live', 'Live feed', `Updated ${new Date().toLocaleTimeString('en-GB')}`);
    showBanner(data.stale ? `Upstream data source temporarily unreachable — showing last good snapshot from ${new Date(data.asOf || data.cachedAt || Date.now()).toLocaleTimeString('en-GB')}.` : null);
    return data;
  }
  async function getQuotes(symbols) {
    const d = await api('/api/quotes', { symbols: symbols.join(',') });
    for (const q of d.quotes) {
      const prev = state.quotes.get(q.symbol);
      if (prev && prev.price != null) state.prevPrices.set(q.symbol, prev.price);
      state.quotes.set(q.symbol, q);
    }
    if (typeof evaluateAlerts === 'function' && state.alerts.some((a) => !a.firedAt)) evaluateAlerts();
    return d;
  }
  function setConn(mode, text, sub) {
    const el = $('#conn');
    el.className = 'conn ' + mode;
    $('#connText').textContent = text;
    $('#connSub').textContent = sub || '';
  }
  function showBanner(msg, isErr) {
    const b = $('#banner');
    if (!msg) { b.hidden = true; return; }
    b.hidden = false; b.textContent = msg; b.className = 'banner' + (isErr ? ' err' : '');
  }

  /* ================================================================== */
  /* Generic renderers                                                   */
  /* ================================================================== */
  function drawSparks(root) {
    $$('canvas[data-spark]', root || document).forEach((c) => {
      try {
        const vals = JSON.parse(c.dataset.spark || '[]');
        const base = c.dataset.base ? parseFloat(c.dataset.base) : undefined;
        HGChart.sparkline(c, vals, { base, showBase: c.dataset.showbase !== '0' });
      } catch { /* ignore */ }
    });
  }
  const sparkHTML = (vals, base, cls) => `<canvas class="${cls || 'spark'}" data-spark='${JSON.stringify((vals || []).map((v) => +(+v).toFixed(6)))}' ${base != null ? `data-base="${base}"` : ''}></canvas>`;

  function flashClass(q) {
    const prev = state.prevPrices.get(q.symbol);
    if (prev == null || q.price == null || prev === q.price) return '';
    return q.price > prev ? 'flash-up' : 'flash-down';
  }

  /** Sortable quote table. cols: [{key,label,r,render,sortVal}] */
  function quoteTable(id, rows, cols, opts = {}) {
    const st = state.sort[id] || opts.defaultSort || { key: null, dir: 1 };
    let data = rows.slice();
    if (st.key) {
      const col = cols.find((c) => c.key === st.key);
      data.sort((a, b) => {
        const va = col.sortVal ? col.sortVal(a) : a[st.key], vb = col.sortVal ? col.sortVal(b) : b[st.key];
        if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
        return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * st.dir;
      });
    }
    const thead = `<tr>${cols.map((c) => `<th class="${c.r ? 'r' : ''} ${st.key === c.key ? 'sorted' + (st.dir < 0 ? ' asc' : '') : ''}" data-sort="${c.key}">${c.label}</th>`).join('')}</tr>`;
    const tbody = data.map((r) => `<tr data-sym="${esc(r.symbol)}" class="${opts.rowClass ? opts.rowClass(r) : ''} ${flashClass(r)}">${cols.map((c) => `<td class="${c.r ? 'r' : ''} ${c.cls || ''}">${c.render(r)}</td>`).join('')}</tr>`).join('');
    return `<div class="tbl-wrap" ${opts.maxH ? `style="max-height:${opts.maxH}px"` : ''}><table class="tbl" id="${id}"><thead>${thead}</thead><tbody>${tbody || `<tr><td colspan="${cols.length}" class="empty">No data</td></tr>`}</tbody></table></div>`;
  }
  function bindTable(root, id, rerender) {
    const tbl = $('#' + id, root);
    if (!tbl) return;
    tbl.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (th) {
        const cur = state.sort[id] || {};
        state.sort[id] = { key: th.dataset.sort, dir: cur.key === th.dataset.sort ? -cur.dir : -1 };
        rerender();
        return;
      }
      const star = e.target.closest('.star');
      if (star) { e.stopPropagation(); toggleWatch(star.dataset.sym); return; }
      const cmp = e.target.closest('[data-compare]');
      if (cmp) { e.stopPropagation(); toggleCompare(cmp.dataset.compare); return; }
      const tr = e.target.closest('tr[data-sym]');
      if (tr) openModal(tr.dataset.sym);
    });
  }
  const starHTML = (s) => `<span class="star ${inWatch(s) ? 'on' : ''}" data-sym="${esc(s)}" title="Toggle watchlist">${inWatch(s) ? '★' : '☆'}</span>`;

  const COL = {
    star: { key: 'star', label: '', render: (q) => starHTML(q.symbol) },
    sym: (labelFn) => ({ key: 'symbol', label: 'Symbol', render: (q) => `<span class="sym">${esc(labelFn ? labelFn(q.symbol) : q.symbol)}</span>` }),
    name: { key: 'name', label: 'Name', cls: 'nm', render: (q) => esc(displayName(q)), sortVal: (q) => displayName(q) },
    price: { key: 'price', label: 'Last', r: true, cls: 'price', render: (q) => fmtPrice(q) },
    chg: { key: 'change', label: 'Chg', r: true, render: (q) => `<span class="chg ${cls(q.change)}">${fmtChg(q)}</span>` },
    pct: { key: 'changePct', label: '% Chg', r: true, render: (q) => `<span class="chip ${cls(q.changePct)}">${fmtPct(q.changePct)}</span>` },
    range: { key: 'dayHigh', label: 'Day range', r: true, render: (q) => (q.dayLow != null && q.dayHigh != null ? `<span class="num muted">${fmtPrice(q, q.dayLow)} – ${fmtPrice(q, q.dayHigh)}</span>` : '—') },
    wk52: { key: 'wk52High', label: '52w range', r: true, render: (q) => (q.wk52Low != null && q.wk52High != null ? `<span class="num muted">${fmtPrice(q, q.wk52Low)} – ${fmtPrice(q, q.wk52High)}</span>` : '—') },
    spark: { key: 'spark', label: 'Today', render: (q) => sparkHTML(q.spark, q.prevClose), sortVal: (q) => q.changePct },
    ccy: { key: 'currency', label: 'Ccy', render: (q) => `<span class="muted">${esc(q.currency || '')}</span>` },
    vol: { key: 'volume', label: 'Volume', r: true, render: (q) => `<span class="num muted">${compact(q.volume)}</span>` },
    state: { key: 'marketState', label: 'Session', render: (q) => stateBadge(q) },
    time: { key: 'marketTime', label: 'Updated', render: (q) => `<span class="num muted">${fmtClock(q.marketTime, q.tz)}</span>` },
  };

  function cardHTML(q, opts = {}) {
    const name = opts.name || displayName(q);
    const flag = opts.flag ? `<span class="c-flag">${opts.flag}</span>` : '';
    return `<div class="card ${opts.big ? 'big' : ''} ${flashClass(q)}" data-sym="${esc(q.symbol)}">
      <div class="c-top"><span class="c-sym">${flag}${esc(opts.label || q.symbol)}</span><span class="c-chg ${cls(q.changePct)}">${fmtPct(q.changePct)}</span></div>
      <div class="c-name" title="${esc(name)}">${esc(name)}</div>
      <div class="c-price">${fmtPrice(q)} <small class="muted" style="font-size:11px;font-weight:400">${esc(q.currency || '')}</small></div>
      <div class="c-chg ${cls(q.change)}">${fmtChg(q)} <span class="muted" style="font-weight:400">· ${stateBadge(q)}</span></div>
      ${sparkHTML(q.spark, q.prevClose, 'c-spark')}
    </div>`;
  }
  function heatColor(pct, scale = 3) {
    if (pct == null || !isFinite(pct)) return '#334155';
    const t = Math.max(-1, Math.min(1, pct / scale));
    if (t >= 0) { const k = t; return `rgb(${Math.round(63 - 40 * k)}, ${Math.round(63 + 70 * k)}, ${Math.round(70 - 20 * k)})`; }
    const k = -t; return `rgb(${Math.round(63 + 122 * k)}, ${Math.round(63 - 35 * k)}, ${Math.round(70 - 42 * k)})`;
  }
  function heatHTML(items, opts = {}) {
    const scale = opts.scale || 3;
    return `<div class="heat">${items.map((it) => `<div class="cell" data-sym="${esc(it.symbol)}" style="background:${heatColor(it.pct, scale)}" title="${esc(it.name)}"><div><b>${esc(it.label || it.symbol)}</b><small>${esc(it.name)}</small></div><div class="v">${fmtPct(it.pct, 1)}</div></div>`).join('')}</div>`;
  }

  /* ================================================================== */
  /* Tabs                                                                */
  /* ================================================================== */
  const TABS = ['forex', 'indices', 'sectors', 'ipos', 'outperformers', 'rates', 'portfolio', 'cot'];
  const loaders = { forex: loadForex, indices: loadIndices, sectors: loadSectors, ipos: loadIpos, outperformers: loadOutperformers, rates: loadRates, portfolio: loadPortfolio, cot: loadCot };
  const intervals = { forex: 10000, indices: 15000, sectors: 30000, ipos: 60000, outperformers: 120000, rates: 30000, portfolio: 15000, cot: 30 * 60000 };
  function switchTab(tab) {
    if (!TABS.includes(tab)) tab = 'forex';
    state.tab = tab;
    $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    TABS.forEach((t) => { $('#tab-' + t).hidden = t !== tab; });
    if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
    Object.values(state.timers).forEach(clearInterval); state.timers = {};
    const panel = $('#tab-' + tab);
    if (!panel.dataset.built) { panel.innerHTML = '<div class="loading-block">Loading market data…</div>'; }
    loaders[tab]().catch((e) => { if (!panel.dataset.built) panel.innerHTML = `<div class="loading-block">Could not load data: ${esc(e.message)}<br><button class="btn" onclick="location.reload()">Retry</button></div>`; });
    state.timers[tab] = setInterval(() => { if (!document.hidden) loaders[tab]().catch(() => {}); }, intervals[tab]);
    HGChart.redrawAll();
  }

  /* ================================================================== */
  /* TAB 1 — Forex Live Market                                           */
  /* ================================================================== */
  function buildForex() {
    const p = $('#tab-forex');
    p.innerHTML = `
      <div class="grid g-main">
        <div class="grid" style="gap:14px">
          <div class="panel"><div class="p-head"><h2>Major pairs <span class="live">LIVE</span></h2><div class="tools"><span class="asof" id="fxAsOf"></span></div></div><div class="p-body"><div class="cards" id="fxMajors"></div></div></div>
          <div class="panel">
            <div class="p-head"><h2>Live FX board</h2><div class="tools"><div class="seg" id="fxGroup"><button data-g="all" class="active">All</button><button data-g="majors">Majors</button><button data-g="crosses">Crosses</button><button data-g="africaEm">Africa &amp; EM</button><button data-g="other">Other</button></div><input id="fxFilter" class="sel" placeholder="Filter…" style="width:120px"></div></div>
            <div class="p-body tight" id="fxTable"></div>
            <div class="note">Click any row to open an interactive chart. Rates are indicative mid-prices; FX trades 24/5 and shows CLOSED over the weekend.</div>
          </div>
          <div class="panel"><div class="p-head"><h2>Cross-rate matrix</h2><span class="asof">row currency → column currency</span></div><div class="p-body tight" style="overflow:auto" id="fxMatrix"></div></div>
        </div>
        <div class="grid" style="gap:14px;align-content:start">
          <div class="panel"><div class="p-head"><h2>Currency converter</h2></div><div class="p-body" id="fxConv">
            <div class="conv">
              <div><label>Amount</label><input id="cvAmt" type="number" value="1000" min="0" step="any"></div>
              <button class="btn swap" id="cvSwap" title="Swap" type="button">⇄</button>
              <div><label>&nbsp;</label><div style="height:37px"></div></div>
              <div><label>From</label><select id="cvFrom">${CONV_CCYS.map((c) => `<option ${c === 'USD' ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
              <div></div>
              <div><label>To</label><select id="cvTo">${CONV_CCYS.map((c) => `<option ${c === 'ZAR' ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            </div>
            <div class="conv-out" id="cvOut">—</div>
          </div></div>
          <div class="panel"><div class="p-head"><h2>Currency strength (today)</h2><span class="asof">vs basket</span></div><div class="p-body"><div class="strength" id="fxStrength"></div></div></div>
          <div class="panel"><div class="p-head"><h2>Trading sessions</h2><span class="asof" id="utcNow"></span></div><div class="p-body"><div class="sessions" id="fxSessions"></div><div class="muted" style="font-size:11px;margin-top:8px">Approximate UTC windows. Gold marker = now. Overlaps (London/New York) typically carry the deepest liquidity.</div></div></div>
          <div class="panel"><div class="p-head"><h2>Rand watch 🇿🇦</h2></div><div class="p-body"><div class="cards" id="fxRand" style="grid-template-columns:1fr 1fr"></div></div></div>
        </div>
      </div>`;
    p.dataset.built = '1';
    state.fxGroup = 'all';
    $('#fxGroup').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#fxGroup button').forEach((x) => x.classList.toggle('active', x === b)); state.fxGroup = b.dataset.g; renderFxTable(); });
    $('#fxFilter').addEventListener('input', renderFxTable);
    ['cvAmt', 'cvFrom', 'cvTo'].forEach((id) => $('#' + id).addEventListener('input', renderConverter));
    $('#cvSwap').addEventListener('click', () => { const a = $('#cvFrom').value; $('#cvFrom').value = $('#cvTo').value; $('#cvTo').value = a; renderConverter(); });
    p.addEventListener('click', (e) => { const c = e.target.closest('.card[data-sym]'); if (c) openModal(c.dataset.sym); });
    bindTable(p, 'fxTbl', renderFxTable);
  }
  async function loadForex() {
    if (!$('#tab-forex').dataset.built) buildForex();
    const d = await getQuotes(FX_ALL);
    $('#fxAsOf').textContent = `as of ${new Date(d.asOf || Date.now()).toLocaleTimeString('en-GB')}${d.quotes.some((q) => q.fallback) ? ' · fallback rates' : ''}`;
    computeUsdRates();
    $('#fxMajors').innerHTML = [...FX.majors, 'DX-Y.NYB'].map((s) => state.quotes.get(s)).filter(Boolean).map((q) => cardHTML(q, { label: fxLabel(q.symbol), name: q.symbol === 'DX-Y.NYB' ? 'US Dollar Index' : q.name, flag: q.symbol === 'DX-Y.NYB' ? '💵' : FLAG[q.symbol.slice(0, 3)] })).join('');
    $('#fxRand').innerHTML = ['USDZAR=X', 'EURZAR=X', 'GBPZAR=X', 'ZARJPY=X'].map((s) => state.quotes.get(s)).filter(Boolean).map((q) => cardHTML(q, { label: fxLabel(q.symbol), flag: FLAG[q.symbol.slice(0, 3)] })).join('');
    renderFxTable();
    renderMatrix();
    renderConverter();
    renderStrength();
    renderSessions();
    drawSparks($('#tab-forex'));
  }
  function renderFxTable() {
    const g = state.fxGroup || 'all';
    const filter = ($('#fxFilter').value || '').toUpperCase().replace('/', '');
    const syms = g === 'all' ? FX_ALL : FX[g];
    const rows = syms.map((s) => state.quotes.get(s)).filter(Boolean).filter((q) => !filter || q.symbol.includes(filter) || (q.name || '').toUpperCase().includes(filter));
    const cols = [COL.star, { ...COL.sym(fxLabel), label: 'Pair' }, { key: 'flag', label: '', render: (q) => (q.symbol === 'DX-Y.NYB' ? '💵' : `${FLAG[q.symbol.slice(0, 3)] || ''}${FLAG[q.symbol.slice(3, 6)] || ''}`) }, { ...COL.price, label: 'Mid' }, COL.chg, COL.pct, COL.range, COL.wk52, COL.spark, COL.state, COL.time];
    $('#fxTable').innerHTML = quoteTable('fxTbl', rows, cols, { maxH: 520 });
    bindTable($('#tab-forex'), 'fxTbl', renderFxTable);
    drawSparks($('#fxTable'));
  }
  function computeUsdRates() {
    // X per USD for each currency, current and previous close
    const now = { USD: 1 }, prev = { USD: 1 };
    for (const q of state.quotes.values()) {
      const m = /^([A-Z]{3})([A-Z]{3})=X$/.exec(q.symbol);
      if (!m || q.price == null) continue;
      const [_, b, c] = m;
      if (b === 'USD') { now[c] = q.price; prev[c] = q.prevClose || q.price; }
      else if (c === 'USD') { now[b] = 1 / q.price; prev[b] = 1 / (q.prevClose || q.price); }
    }
    state.fx.usdRates = now; state.fx.usdPrev = prev;
  }
  function renderMatrix() {
    const r = state.fx.usdRates; if (!r) return;
    const ccys = MATRIX_CCYS.filter((c) => r[c]);
    const cell = (a, b) => { if (a === b) return '<td class="diag">1</td>'; const v = r[b] / r[a]; const d = v >= 100 ? 2 : v >= 10 ? 3 : 4; return `<td title="1 ${a} = ${v.toFixed(d)} ${b}">${v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}</td>`; };
    $('#fxMatrix').innerHTML = `<table class="fx-matrix"><thead><tr><th></th>${ccys.map((c) => `<th>${FLAG[c] || ''} ${c}</th>`).join('')}</tr></thead><tbody>${ccys.map((a) => `<tr><td>${FLAG[a] || ''} ${a}</td>${ccys.map((b) => cell(a, b)).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function renderConverter() {
    const r = state.fx.usdRates; if (!r) return;
    const amt = parseFloat($('#cvAmt').value) || 0, from = $('#cvFrom').value, to = $('#cvTo').value;
    if (!r[from] || !r[to]) { $('#cvOut').textContent = 'Rate unavailable'; return; }
    const rate = r[to] / r[from];
    const out = amt * rate;
    const prevRate = state.fx.usdPrev[to] / state.fx.usdPrev[from];
    const chg = prevRate ? (rate / prevRate - 1) * 100 : null;
    $('#cvOut').innerHTML = `${amt.toLocaleString('en-US')} ${from} = <b>${out.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${to}</b><br><span>1 ${from} = ${rate.toLocaleString('en-US', { maximumFractionDigits: rate >= 100 ? 2 : 4, minimumFractionDigits: 2 })} ${to} · 1 ${to} = ${(1 / rate).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${from}</span> <span class="chip ${cls(chg)}">${fmtPct(chg)} today</span>`;
  }
  function renderStrength() {
    const r = state.fx.usdRates, p = state.fx.usdPrev; if (!r) return;
    const ccys = STRENGTH_CCYS.filter((c) => r[c] && p[c]);
    const rel = ccys.map((c) => ({ c, v: (p[c] / r[c] - 1) * 100 })); // value of 1 unit of c in USD terms, % change
    const mean = rel.reduce((a, b) => a + b.v, 0) / rel.length;
    const rows = rel.map((x) => ({ c: x.c, s: x.v - mean })).sort((a, b) => b.s - a.s);
    const mx = Math.max(0.05, ...rows.map((x) => Math.abs(x.s)));
    $('#fxStrength').innerHTML = rows.map((x) => `<div class="row"><span class="ccy">${FLAG[x.c] || ''} ${x.c}</span><div class="b"><i class="${x.s >= 0 ? 'up' : 'down'}" style="width:${(Math.abs(x.s) / mx) * 50}%"></i></div><span class="v ${cls(x.s)}">${fmtPct(x.s)}</span></div>`).join('');
  }
  function renderSessions() {
    const now = new Date(); const h = now.getUTCHours() + now.getUTCMinutes() / 60;
    $('#utcNow').textContent = `UTC ${now.toISOString().slice(11, 16)} · local ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    $('#fxSessions').innerHTML = FX_SESSIONS.map((s) => {
      const open = s.start < s.end ? h >= s.start && h < s.end : h >= s.start || h < s.end;
      const segs = s.start < s.end ? [[s.start, s.end]] : [[s.start, 24], [0, s.end]];
      return `<div class="sess"><span class="nm"><span class="st ${open ? 'open' : ''}" style="width:7px;height:7px;border-radius:50%;display:inline-block;background:${open ? 'var(--up)' : 'var(--muted-2)'}"></span>${s.name}</span><div class="track">${segs.map(([a, b]) => `<i class="${open ? 'open' : ''}" style="left:${(a / 24) * 100}%;width:${((b - a) / 24) * 100}%"></i>`).join('')}<span class="now" style="left:${(h / 24) * 100}%"></span></div></div>`;
    }).join('');
  }

  /* ================================================================== */
  /* TAB 2 — Indices & Stocks                                            */
  /* ================================================================== */
  function buildIndices() {
    const p = $('#tab-indices');
    p.innerHTML = `
      <div class="grid" style="gap:14px">
        <div class="panel"><div class="p-head"><h2>Global indices heatmap <span class="live">LIVE</span></h2><div class="tools"><div class="legend">−3%<span class="bar"></span>+3%</div><span class="asof" id="ixAsOf"></span></div></div><div class="p-body" id="ixHeat"></div></div>
        <div class="grid g-main">
          <div class="panel"><div class="p-head"><h2>Compare indices</h2><div class="tools"><div class="seg" id="ixRange">${['5d', '1mo', '3mo', '6mo', 'ytd', '1y'].map((r) => `<button data-r="${r}" class="${r === state.indices.range ? 'active' : ''}">${r.toUpperCase()}</button>`).join('')}</div><select class="sel" id="ixAdd"><option value="">+ add index…</option>${INDEX_ALL.filter((s) => !['^VIX'].includes(s)).map((s) => `<option value="${s}">${INDEX_NAMES[s] || s}</option>`).join('')}</select></div></div><div class="p-body"><div class="compare-legend" id="ixLegend"></div><div class="chart-box" style="margin-top:8px"><canvas id="ixCmp"></canvas></div></div></div>
          <div class="panel"><div class="p-head"><h2>My watchlist</h2><span class="asof">★ any instrument to add</span></div><div class="p-body tight" id="watchTable"></div></div>
        </div>
        <div class="panel"><div class="p-head"><h2>Indices by region</h2><div class="tools"><div class="seg" id="ixRegion">${['All', ...Object.keys(INDICES)].map((r, i) => `<button data-g="${r}" class="${i === 0 ? 'active' : ''}">${r}</button>`).join('')}</div></div></div><div class="p-body tight" id="ixTable"></div></div>
        <div class="grid g-2">
          <div class="panel"><div class="p-head"><h2>US mega caps</h2></div><div class="p-body tight" id="usTable"></div></div>
          <div class="panel"><div class="p-head"><h2>JSE large caps 🇿🇦</h2><span class="asof">ZAR, converted from cents</span></div><div class="p-body tight" id="jseTable"></div></div>
        </div>
      </div>`;
    p.dataset.built = '1';
    state.ixRegion = 'All';
    $('#ixRegion').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#ixRegion button').forEach((x) => x.classList.toggle('active', x === b)); state.ixRegion = b.dataset.g; renderIndexTable(); });
    $('#ixRange').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#ixRange button').forEach((x) => x.classList.toggle('active', x === b)); state.indices.range = b.dataset.r; loadIndexCompare(); });
    $('#ixAdd').addEventListener('change', (e) => { const s = e.target.value; if (s && !state.indices.compare.includes(s)) { state.indices.compare = [...state.indices.compare, s].slice(-6); loadIndexCompare(); } e.target.value = ''; });
    $('#ixLegend').addEventListener('click', (e) => { const x = e.target.closest('[data-rm]'); if (x && state.indices.compare.length > 1) { state.indices.compare = state.indices.compare.filter((s) => s !== x.dataset.rm); loadIndexCompare(); } });
    p.addEventListener('click', (e) => { const c = e.target.closest('.cell[data-sym],.card[data-sym]'); if (c) openModal(c.dataset.sym); });
  }
  async function loadIndices() {
    const first = !$('#tab-indices').dataset.built;
    if (first) buildIndices();
    const all = [...INDEX_ALL, ...STOCKS['US Mega Caps'], ...STOCKS['JSE Large Caps'], ...state.watchlist];
    const d = await getQuotes([...new Set(all)]);
    $('#ixAsOf').textContent = `as of ${new Date(d.asOf || Date.now()).toLocaleTimeString('en-GB')}`;
    const heatItems = Object.entries(INDICES).filter(([g]) => !['Commodities', 'Crypto'].includes(g)).flatMap(([, syms]) => syms).filter((s) => s !== '^VIX').map((s) => state.quotes.get(s)).filter(Boolean).map((q) => ({ symbol: q.symbol, label: INDEX_NAMES[q.symbol] || q.symbol, name: `${Object.keys(INDICES).find((k) => INDICES[k].includes(q.symbol)) || ''} · ${fmtPrice(q)}`, pct: q.changePct }));
    $('#ixHeat').innerHTML = heatHTML(heatItems, { scale: 3 });
    renderIndexTable();
    renderStockTables();
    loadWatchlist(true);
    if (first) loadIndexCompare();
    drawSparks($('#tab-indices'));
  }
  function renderIndexTable() {
    const g = state.ixRegion || 'All';
    const syms = g === 'All' ? INDEX_ALL : INDICES[g];
    const region = (s) => Object.keys(INDICES).find((k) => INDICES[k].includes(s));
    const rows = syms.map((s) => state.quotes.get(s)).filter(Boolean);
    const cols = [COL.star, { key: 'symbol', label: 'Index', render: (q) => `<span class="twoline"><span class="sym">${esc(INDEX_NAMES[q.symbol] || q.symbol)}</span><small>${esc(q.symbol)} · ${esc(region(q.symbol) || '')}</small></span>`, sortVal: (q) => INDEX_NAMES[q.symbol] || q.symbol }, COL.price, COL.chg, COL.pct, COL.range, COL.wk52, COL.spark, COL.ccy, COL.state, COL.time];
    $('#ixTable').innerHTML = quoteTable('ixTbl', rows, cols, { maxH: 480 });
    bindTable($('#tab-indices'), 'ixTbl', renderIndexTable);
    drawSparks($('#ixTable'));
  }
  function renderStockTables() {
    const cols = [COL.star, COL.sym(), COL.name, COL.price, COL.chg, COL.pct, COL.spark, COL.vol, COL.state];
    const us = STOCKS['US Mega Caps'].map((s) => state.quotes.get(s)).filter(Boolean);
    const jse = STOCKS['JSE Large Caps'].map((s) => state.quotes.get(s)).filter(Boolean);
    $('#usTable').innerHTML = quoteTable('usTbl', us, cols, { maxH: 520 });
    $('#jseTable').innerHTML = quoteTable('jseTbl', jse, cols, { maxH: 520 });
    bindTable($('#tab-indices'), 'usTbl', renderStockTables);
    bindTable($('#tab-indices'), 'jseTbl', renderStockTables);
    drawSparks($('#usTable')); drawSparks($('#jseTable'));
  }
  async function loadWatchlist(skipFetch) {
    const el = $('#watchTable'); if (!el) return;
    if (!state.watchlist.length) { el.innerHTML = '<div class="watch-empty">Your watchlist is empty. Click ☆ on any instrument to track it here.</div>'; return; }
    if (!skipFetch) await getQuotes(state.watchlist).catch(() => {});
    const rows = state.watchlist.map((s) => state.quotes.get(s)).filter(Boolean);
    const cols = [COL.star, { key: 'symbol', label: 'Symbol', render: (q) => `<span class="twoline"><span class="sym">${esc(isFX(q.symbol) ? fxLabel(q.symbol) : q.symbol)}</span><small>${esc(displayName(q))}</small></span>` }, COL.price, COL.pct, COL.spark, COL.state];
    el.innerHTML = quoteTable('watchTbl', rows, cols, { maxH: 300 });
    bindTable($('#tab-indices'), 'watchTbl', () => loadWatchlist(true));
    drawSparks(el);
  }
  async function loadIndexCompare() {
    const syms = state.indices.compare;
    $('#ixLegend').innerHTML = syms.map((s, i) => `<span><i style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(INDEX_NAMES[s] || s)} <a href="javascript:void 0" data-rm="${esc(s)}" class="muted" title="remove">✕</a></span>`).join('');
    try {
      const d = await api('/api/series', { symbols: syms.join(','), range: state.indices.range });
      const series = d.series.map((s, i) => ({ label: INDEX_NAMES[s.symbol] || s.symbol, t: s.t, c: s.c, base: s.base, color: PALETTE[i % PALETTE.length], emph: i === 0 }));
      HGChart.compareChart($('#ixCmp'), series, { range: state.indices.range });
    } catch (e) { /* keep previous */ }
  }

  /* ================================================================== */
  /* TAB 3 — Financials & Tech (interactive)                             */
  /* ================================================================== */
  function buildSectors() {
    const p = $('#tab-sectors');
    p.innerHTML = `
      <div class="grid" style="gap:14px">
        <div class="panel">
          <div class="p-head"><h2>Sector explorer <span class="live">INTERACTIVE</span></h2>
            <div class="tools">
              <div class="seg" id="secSel"><button data-s="financials" class="active">🏦 Financials</button><button data-s="tech">💻 Technology</button></div>
              <div class="seg" id="secRange">${['1d', '5d', '1mo', '3mo', '6mo', 'ytd', '1y'].map((r) => `<button data-r="${r}" class="${r === '1d' ? 'active' : ''}">${r.toUpperCase()}</button>`).join('')}</div>
              <select class="sel" id="secGroup"><option value="">All sub-groups</option></select>
              <span class="asof" id="secAsOf"></span>
            </div>
          </div>
          <div class="p-body">
            <div class="kpi-row" id="secKpis"></div>
            <div style="margin-top:12px" id="secHeat"></div>
          </div>
        </div>
        <div class="grid g-main">
          <div class="panel"><div class="p-head"><h2>Relative performance</h2><div class="tools"><span class="asof">ETF benchmarks + up to 4 tickers (use “⇄ compare” in the table)</span></div></div><div class="p-body"><div class="compare-legend" id="secLegend"></div><div class="chart-box tall" style="margin-top:8px"><canvas id="secCmp"></canvas></div></div></div>
          <div class="panel"><div class="p-head"><h2>Leaders &amp; laggards</h2><span class="asof" id="secLbl"></span></div><div class="p-body" id="secLeaders"></div></div>
        </div>
        <div class="panel"><div class="p-head"><h2 id="secTblTitle">Constituents</h2><div class="tools"><input id="secFilter" class="sel" placeholder="Filter…" style="width:140px"></div></div><div class="p-body tight" id="secTable"></div><div class="note">Return = price change over the selected period (1D uses previous close). Sparklines show the same window. Click a row for the full chart.</div></div>
      </div>`;
    p.dataset.built = '1';
    $('#secSel').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#secSel button').forEach((x) => x.classList.toggle('active', x === b)); state.sectors.sector = b.dataset.s; state.sectors.group = ''; fillGroupSelect(); loadSectors(); });
    $('#secRange').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#secRange button').forEach((x) => x.classList.toggle('active', x === b)); state.sectors.range = b.dataset.r; loadSectors(); });
    $('#secGroup').addEventListener('change', (e) => { state.sectors.group = e.target.value; renderSectors(); });
    $('#secFilter').addEventListener('input', renderSectors);
    $('#secLegend').addEventListener('click', (e) => { const x = e.target.closest('[data-rm]'); if (x) toggleCompare(x.dataset.rm); });
    p.addEventListener('click', (e) => { const c = e.target.closest('.cell[data-sym]'); if (c) openModal(c.dataset.sym); });
    fillGroupSelect();
  }
  function fillGroupSelect() {
    const sec = SECTORS[state.sectors.sector];
    $('#secGroup').innerHTML = `<option value="">All sub-groups</option>${Object.keys(sec.groups).map((g) => `<option>${g}</option>`).join('')}`;
  }
  function sectorSymbols() { const sec = SECTORS[state.sectors.sector]; return Object.values(sec.groups).flat(); }
  function groupOf(sym) { const sec = SECTORS[state.sectors.sector]; return Object.keys(sec.groups).find((g) => sec.groups[g].includes(sym)) || ''; }
  async function loadSectors() {
    if (!$('#tab-sectors').dataset.built) buildSectors();
    const syms = [...new Set([...sectorSymbols(), ...SECTOR_ETFS])];
    const d = await api('/api/perf', { symbols: syms.join(','), range: state.sectors.range });
    state.sectors.data = new Map(d.items.map((it) => [it.symbol, it]));
    $('#secAsOf').textContent = `as of ${new Date(d.asOf || Date.now()).toLocaleTimeString('en-GB')}`;
    renderSectors();
    loadSectorCompare();
  }
  function renderSectors() {
    const data = state.sectors.data; if (!data) return;
    const sec = SECTORS[state.sectors.sector];
    const filter = ($('#secFilter').value || '').toUpperCase();
    const grp = state.sectors.group || '';
    let syms = grp ? sec.groups[grp] : sectorSymbols();
    let items = syms.map((s) => data.get(s)).filter(Boolean).map((it) => ({ ...it, group: groupOf(it.symbol) }));
    if (filter) items = items.filter((it) => it.symbol.includes(filter) || (it.name || '').toUpperCase().includes(filter));
    const etf = data.get(sec.etf), spy = data.get('SPY');
    const avg = items.length ? items.reduce((a, b) => a + b.ret, 0) / items.length : null;
    const adv = items.filter((i) => i.ret > 0).length;
    const rangeLbl = state.sectors.range.toUpperCase();
    $('#secKpis').innerHTML = `
      <div class="stat gold"><div class="s-label">${esc(sec.label)} ETF · ${esc(sec.etf)} · ${rangeLbl}</div><div class="s-val ${cls(etf && etf.ret)}">${etf ? fmtPct(etf.ret) : '—'}</div><div class="s-sub">${etf ? `${etf.price.toFixed(2)} USD` : ''}</div></div>
      <div class="stat"><div class="s-label">S&amp;P 500 (SPY) · ${rangeLbl}</div><div class="s-val ${cls(spy && spy.ret)}">${spy ? fmtPct(spy.ret) : '—'}</div><div class="s-sub">${etf && spy ? `${sec.label} ${etf.ret - spy.ret >= 0 ? 'outperforming' : 'lagging'} by ${Math.abs(etf.ret - spy.ret).toFixed(2)} pts` : ''}</div></div>
      <div class="stat"><div class="s-label">Universe average · ${items.length} names</div><div class="s-val ${cls(avg)}">${fmtPct(avg)}</div><div class="s-sub">${adv} advancing · ${items.length - adv} declining</div></div>
      <div class="stat"><div class="s-label">Best / worst</div><div class="s-val" style="font-size:15px">${items.length ? `<span class="up">${esc(items.slice().sort((a, b) => b.ret - a.ret)[0].symbol)} ${fmtPct(items.slice().sort((a, b) => b.ret - a.ret)[0].ret, 1)}</span> · <span class="down">${esc(items.slice().sort((a, b) => a.ret - b.ret)[0].symbol)} ${fmtPct(items.slice().sort((a, b) => a.ret - b.ret)[0].ret, 1)}</span>` : '—'}</div><div class="s-sub">over ${rangeLbl}</div></div>`;
    const scale = state.sectors.range === '1d' ? 4 : state.sectors.range === '5d' ? 8 : state.sectors.range === '1mo' ? 15 : 40;
    const byGroup = grp ? { [grp]: items } : Object.fromEntries(Object.keys(sec.groups).map((g) => [g, items.filter((i) => i.group === g)]));
    $('#secHeat').innerHTML = Object.entries(byGroup).filter(([, arr]) => arr.length).map(([g, arr]) => `<div class="section-title"><h3>${esc(g)}</h3><span class="sub">avg ${fmtPct(arr.reduce((a, b) => a + b.ret, 0) / arr.length)}</span></div>${heatHTML(arr.map((i) => ({ symbol: i.symbol, name: i.name, pct: i.ret })), { scale })}`).join('');
    // leaders
    const sorted = items.slice().sort((a, b) => b.ret - a.ret);
    const mx = Math.max(0.01, ...sorted.map((i) => Math.abs(i.ret)));
    const bar = (i) => `<div class="sector-list"><div class="sr" data-sym="${esc(i.symbol)}" style="cursor:pointer"><span><span class="sym" style="font-family:var(--mono);font-weight:700;color:var(--gold-2)">${esc(i.symbol)}</span> <small class="muted">${esc((i.name || '').slice(0, 22))}</small></span><div class="b"><i class="${i.ret < 0 ? 'neg' : ''}" style="width:${(Math.abs(i.ret) / mx) * 100}%"></i></div><span class="n ${cls(i.ret)}">${fmtPct(i.ret, 1)}</span><span class="n muted">${i.price.toFixed(2)}</span></div></div>`;
    $('#secLbl').textContent = `${sec.label} · ${rangeLbl}`;
    $('#secLeaders').innerHTML = `<div class="section-title"><h3>Top 5</h3></div>${sorted.slice(0, 5).map(bar).join('')}<div class="section-title" style="margin-top:14px"><h3>Bottom 5</h3></div>${sorted.slice(-5).reverse().map(bar).join('')}`;
    $$('#secLeaders .sr').forEach((el) => el.addEventListener('click', () => openModal(el.dataset.sym)));
    // table
    $('#secTblTitle').textContent = `${sec.label} constituents · ${rangeLbl}`;
    const cols = [COL.star, COL.sym(), { key: 'name', label: 'Name', cls: 'nm', render: (i) => esc(i.name) }, { key: 'group', label: 'Sub-group', render: (i) => `<span class="muted">${esc(i.group)}</span>` }, { key: 'price', label: 'Last', r: true, cls: 'price', render: (i) => i.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }, { key: 'ret', label: `${rangeLbl} return`, r: true, render: (i) => `<span class="chip ${cls(i.ret)}">${fmtPct(i.ret)}</span>` }, { key: 'changePct', label: 'Today', r: true, render: (i) => `<span class="chg ${cls(i.changePct)}">${fmtPct(i.changePct)}</span>` }, { key: 'spark', label: rangeLbl + ' trend', render: (i) => sparkHTML(i.spark, i.base), sortVal: (i) => i.ret }, { key: 'rel', label: `vs ${sec.etf}`, r: true, render: (i) => `<span class="chg ${cls(etf ? i.ret - etf.ret : null)}">${etf ? fmtPct(i.ret - etf.ret) : '—'}</span>`, sortVal: (i) => (etf ? i.ret - etf.ret : null) }, { key: 'cmp', label: 'Compare', render: (i) => `<button class="btn small" data-compare="${esc(i.symbol)}">${state.sectors.compare.includes(i.symbol) ? '✓ added' : '⇄ compare'}</button>` }];
    state.sort.secTbl = state.sort.secTbl || { key: 'ret', dir: -1 };
    $('#secTable').innerHTML = quoteTable('secTbl', items, cols, { maxH: 600 });
    bindTable($('#tab-sectors'), 'secTbl', renderSectors);
    drawSparks($('#tab-sectors'));
  }
  function toggleCompare(sym) {
    const c = state.sectors.compare;
    state.sectors.compare = c.includes(sym) ? c.filter((s) => s !== sym) : [...c, sym].slice(-4);
    renderSectors();
    loadSectorCompare();
  }
  async function loadSectorCompare() {
    const sec = SECTORS[state.sectors.sector];
    const syms = [sec.etf, 'SPY', ...state.sectors.compare];
    const rng = state.sectors.range === '1d' ? '1d' : state.sectors.range;
    $('#secLegend').innerHTML = syms.map((s, i) => `<span><i style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(ETF_NAMES[s] || s)}${i >= 2 ? ` <a href="javascript:void 0" data-rm="${esc(s)}" class="muted">✕</a>` : ''}</span>`).join('');
    try {
      const d = await api('/api/series', { symbols: syms.join(','), range: rng });
      const series = d.series.map((s) => { const i = syms.indexOf(s.symbol); return { label: s.symbol, t: s.t, c: s.c, base: s.base, color: PALETTE[i % PALETTE.length], emph: i === 0, dash: s.symbol === 'SPY' }; });
      HGChart.compareChart($('#secCmp'), series, { range: rng });
    } catch (e) { /* keep previous */ }
  }

  /* ================================================================== */
  /* TAB 4 — IPOs & IPO news                                             */
  /* ================================================================== */
  function buildIpos() {
    const p = $('#tab-ipos');
    p.innerHTML = `
      <div class="grid" style="gap:14px">
        <div class="kpi-row" id="ipoStats"></div>
        <div class="grid g-main">
          <div class="grid" style="gap:14px">
            <div class="panel"><div class="p-head"><h2>2026 landmark IPOs — live aftermarket <span class="live">LIVE</span></h2><span class="asof" id="ipoAsOf"></span></div><div class="p-body"><div class="grid g-3" id="ipoRecent"></div></div><div class="note">Return since IPO is measured against the offer price where confirmed; otherwise the first-day close (marked *). Day-one pop = first close vs offer price.</div></div>
            <div class="panel"><div class="p-head"><h2>Upcoming &amp; expected listings</h2><div class="tools"><div class="seg" id="ipoRegion"><button data-g="all" class="active">All</button><button data-g="US">US</button><button data-g="India">India</button></div></div></div><div class="p-body"><div class="timeline" id="ipoUpcoming"></div></div><div class="note">Dates and price ranges are as published on IPO calendars (Investing.com, MarketBeat, StockAnalysis, Kotak Neo, IPO Central) and can change without notice.</div></div>
            <div class="panel"><div class="p-head"><h2>JSE &amp; Africa listings 🇿🇦</h2><span class="asof">Johannesburg · Lagos · pan-African pipeline</span></div>
              <div class="p-body"><div class="kpi-row" id="jseCtx"></div><div class="section-title" style="margin-top:12px"><h3>Upcoming &amp; pending</h3></div><div class="timeline" id="jseUpcoming"></div></div>
              <div class="section-title" style="padding:0 14px"><h3>Recent JSE admissions — live</h3><span class="sub">JSE prices converted from cents to rand</span></div>
              <div class="p-body tight" id="jseListed"></div>
              <div class="note">Secondary inward listings have no offer price; return is measured from the first JSE close (*). Boxer Retail's IPO priced at R54.</div>
            </div>
            <div class="panel"><div class="p-head"><h2>Class of 2025 — how last year's debuts are trading</h2></div><div class="p-body tight" id="ipoClass"></div></div>
          </div>
          <div class="grid" style="gap:14px;align-content:start">
            <div class="panel"><div class="p-head"><h2>IPO news</h2><div class="tools"><select class="sel" id="ipoNewsQ"><option value="IPO">All IPO news</option><option value="Anthropic IPO">Anthropic IPO</option><option value="OpenAI IPO">OpenAI IPO</option><option value="NSE IPO India">NSE India IPO</option><option value="Holtec Nuclear IPO">Holtec Nuclear</option><option value="SpaceX stock">SpaceX (SPCX)</option><option value="Cerebras stock">Cerebras (CBRS)</option><option value="SK hynix ADR">SK hynix (SKHY)</option><option value="JSE listing IPO South Africa">JSE / South Africa</option><option value="Dangote IPO">Dangote IPO</option><option value="SPAC IPO">SPACs</option></select></div></div><div class="p-body tight"><div class="news" id="ipoNews"><div class="loading-block">Loading headlines…</div></div></div><div class="note" id="ipoNewsNote">Headlines via Google News RSS. Links open the publisher.</div></div>
            <div class="panel"><div class="p-head"><h2>Pipeline &amp; filings watch</h2></div><div class="p-body"><div class="pipe" id="ipoPipe"></div></div></div>
          </div>
        </div>
      </div>`;
    p.dataset.built = '1';
    state.ipo.region = 'all';
    $('#ipoRegion').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#ipoRegion button').forEach((x) => x.classList.toggle('active', x === b)); state.ipo.region = b.dataset.g; renderUpcoming(); });
    $('#ipoNewsQ').addEventListener('change', (e) => { state.ipo.newsQuery = e.target.value; loadIpoNews(); });
    p.addEventListener('click', (e) => { const c = e.target.closest('.ipo-card[data-sym]'); if (c) openModal(c.dataset.sym); });
  }
  async function loadIpos() {
    const first = !$('#tab-ipos').dataset.built;
    if (first) buildIpos();
    const [d] = await Promise.all([api('/api/ipos'), first ? loadIpoNews() : Promise.resolve()]);
    state.ipo.data = d;
    $('#ipoAsOf').textContent = `as of ${new Date(d.asOf || Date.now()).toLocaleTimeString('en-GB')}`;
    $('#ipoStats').innerHTML = d.stats.map((s) => `<div class="stat gold"><div class="s-label">${esc(s.label)}</div><div class="s-val" style="font-size:18px">${esc(s.value)}</div><div class="s-sub">${esc(s.sub)}</div></div>`).join('');
    $('#ipoRecent').innerHTML = d.recent2026.map((ipo) => {
      const l = ipo.live || {};
      return `<div class="ipo-card" data-sym="${esc(ipo.symbol)}">
        <div><div class="i-co"><span class="sym" style="font-family:var(--mono);color:var(--gold-2)">${esc(ipo.symbol)}</span> · ${esc(ipo.company)}</div><div class="i-meta">${esc(ipo.exchange)} · listed ${esc(ipo.ipoDate)} · ${esc(ipo.sector)}</div></div>
        <div><div class="i-price">${l.price != null ? l.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</div><div class="i-ret ${cls(l.dayChangePct)}">${fmtPct(l.dayChangePct)} today</div></div>
        ${sparkHTML(l.spark, l.refPrice, 'i-spark')}
        <div class="i-row"><span class="chip ${cls(l.returnSinceIpo)}">${fmtPct(l.returnSinceIpo)} since IPO${l.refIsFirstClose ? '*' : ''}</span>${ipo.ipoPrice ? `<span class="chip">Offer $${ipo.ipoPrice}</span>` : ''}${l.dayOnePop != null ? `<span class="chip ${cls(l.dayOnePop)}">Day-1 ${fmtPct(l.dayOnePop, 0)}</span>` : ''}${ipo.raised && ipo.raised !== 'n/a' ? `<span class="chip gold">Raised ${esc(ipo.raised)}</span>` : ''}${l.high ? `<span class="chip">Hi ${l.high.toFixed(0)} · Lo ${l.low.toFixed(0)}</span>` : ''}</div>
        ${ipo.note ? `<div class="i-meta" style="grid-column:1/-1">${esc(ipo.note)}</div>` : ''}
      </div>`;
    }).join('');
    renderUpcoming();
    const rows = d.class2025.map((ipo) => ({ ...ipo, ...(ipo.live || {}) }));
    const cols = [{ key: 'symbol', label: 'Symbol', render: (r) => `<span class="sym">${esc(r.symbol)}</span>` }, { key: 'company', label: 'Company', cls: 'nm', render: (r) => esc(r.company) }, { key: 'sector', label: 'Sector', render: (r) => `<span class="muted">${esc(r.sector)}</span>` }, { key: 'ipoDate', label: 'IPO date', render: (r) => `<span class="num muted">${esc(r.ipoDate)}</span>` }, { key: 'ipoPrice', label: 'Offer', r: true, render: (r) => `<span class="num">$${r.ipoPrice}</span>` }, { key: 'dayOnePop', label: 'Day-1 pop', r: true, render: (r) => `<span class="chg ${cls(r.dayOnePop)}">${fmtPct(r.dayOnePop, 0)}</span>` }, { key: 'price', label: 'Last', r: true, cls: 'price', render: (r) => (r.price != null ? r.price.toFixed(2) : '—') }, { key: 'returnSinceIpo', label: 'Since IPO', r: true, render: (r) => `<span class="chip ${cls(r.returnSinceIpo)}">${fmtPct(r.returnSinceIpo)}</span>` }, { key: 'spark', label: 'Since listing', render: (r) => sparkHTML(r.spark, r.refPrice), sortVal: (r) => r.returnSinceIpo }];
    state.sort.ipoClass = state.sort.ipoClass || { key: 'returnSinceIpo', dir: -1 };
    $('#ipoClass').innerHTML = quoteTable('ipoClass', rows, cols, { maxH: 460 });
    bindTable($('#tab-ipos'), 'ipoClass', () => loadIpos());
    renderJse(d);
    $('#ipoPipe').innerHTML = d.pipeline.map((p) => `<div class="pr"><div><b>${esc(p.company)}</b><small>${esc(p.detail)}</small></div><span class="chip ${p.tone === 'hot' ? 'hot' : p.tone === 'cold' ? 'cold' : p.tone === 'africa' ? 'gold' : p.tone === 'muted' ? '' : 'blue'}">${esc(p.status)}</span></div>`).join('');
    drawSparks($('#tab-ipos'));
  }
  function renderJse(d) {
    const j = d.jseAfrica; if (!j) return;
    $('#jseCtx').innerHTML = j.context.map((c) => `<div class="stat"><div class="s-label">${esc(c.label)}</div><div class="s-val" style="font-size:16px;color:var(--gold-2)">${esc(c.value)}</div><div class="s-sub">${esc(c.sub)}</div></div>`).join('');
    const today = new Date().toISOString().slice(0, 10);
    $('#jseUpcoming').innerHTML = j.upcoming.map((u) => {
      const dt = u.date === 'TBC' ? null : new Date(u.date + 'T00:00:00');
      const tone = /opens|subscription/i.test(u.status) ? 'gold' : /target/i.test(u.status) ? 'blue' : '';
      return `<div class="tl ${u.date === today ? 'today' : ''}"><div class="d">${dt ? dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'TBC'}<small>${dt ? dt.toLocaleDateString('en-GB', { weekday: 'short' }) : ''}${u.dateEnd ? ` → ${new Date(u.dateEnd + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}</small></div><div><div class="co">${esc(u.company)}<small>${esc(u.exchange)}</small></div><div class="dt">${esc(u.sector)} · ${esc(u.priceRange)} · ${esc(u.dealSize)}${u.note ? `<span class="note">${esc(u.note)}</span>` : ''}</div></div><div><span class="chip ${tone}">${esc(u.status)}</span><div class="muted" style="font-size:10px;text-align:right;margin-top:4px">${esc(u.region)}</div></div></div>`;
    }).join('');
    const rows = j.listed.map((ipo) => ({ ...ipo, ...(ipo.live || {}) }));
    const cols = [{ key: 'symbol', label: 'Symbol', render: (r) => `<span class="sym">${esc(r.symbol)}</span>` }, { key: 'company', label: 'Company', cls: 'nm', render: (r) => `<span class="twoline">${esc(r.company)}<small>${esc(r.type)} · ${esc(r.sector)}</small></span>` }, { key: 'ipoDate', label: 'Listed', render: (r) => `<span class="num muted">${esc(r.ipoDate)}</span>` }, { key: 'refPrice', label: 'Ref', r: true, render: (r) => (r.refPrice != null ? `<span class="num">R${r.refPrice.toFixed(2)}${r.refIsFirstClose ? '*' : ''}</span>` : '—') }, { key: 'price', label: 'Last', r: true, cls: 'price', render: (r) => (r.price != null ? 'R' + r.price.toFixed(2) : '—') }, { key: 'dayChangePct', label: 'Today', r: true, render: (r) => `<span class="chg ${cls(r.dayChangePct)}">${fmtPct(r.dayChangePct)}</span>` }, { key: 'returnSinceIpo', label: 'Since listing', r: true, render: (r) => `<span class="chip ${cls(r.returnSinceIpo)}">${fmtPct(r.returnSinceIpo)}</span>` }, { key: 'spark', label: 'Trend', render: (r) => sparkHTML(r.spark, r.refPrice), sortVal: (r) => r.returnSinceIpo }];
    state.sort.jseTbl = state.sort.jseTbl || { key: 'ipoDate', dir: -1 };
    $('#jseListed').innerHTML = quoteTable('jseTbl', rows, cols, { maxH: 420 });
    bindTable($('#tab-ipos'), 'jseTbl', () => renderJse(state.ipo.data));
    drawSparks($('#jseListed'));
  }
  function renderUpcoming() {
    const d = state.ipo.data; if (!d) return;
    const today = new Date().toISOString().slice(0, 10);
    const g = state.ipo.region || 'all';
    const list = d.upcoming.filter((u) => g === 'all' || u.region === g).slice().sort((a, b) => (a.date === 'TBC' ? 1 : b.date === 'TBC' ? -1 : a.date.localeCompare(b.date)));
    $('#ipoUpcoming').innerHTML = list.map((u) => {
      const dt = u.date === 'TBC' ? null : new Date(u.date + 'T00:00:00');
      const past = u.date !== 'TBC' && (u.dateEnd || u.date) < today;
      const isToday = u.date === today;
      const tone = /postponed|withdrawn/i.test(u.status) ? 'cold' : /filed|confidential/i.test(u.status) ? 'blue' : /opens/i.test(u.status) ? 'gold' : 'up';
      return `<div class="tl ${past ? 'past' : ''} ${isToday ? 'today' : ''}"><div class="d">${dt ? dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'TBC'}<small>${dt ? dt.toLocaleDateString('en-GB', { weekday: 'short' }) : ''}${u.dateEnd ? ` → ${new Date(u.dateEnd + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}</small></div><div><div class="co">${esc(u.company)}<small>${esc(u.symbol)} · ${esc(u.exchange)}</small></div><div class="dt">${esc(u.sector)} · Price ${esc(u.priceRange)} · Deal ${esc(u.dealSize)}${u.note ? `<span class="note">${esc(u.note)}</span>` : ''}</div></div><div><span class="chip ${tone}">${esc(u.status)}</span><div class="muted" style="font-size:10px;text-align:right;margin-top:4px">${esc(u.region)}</div></div></div>`;
    }).join('');
  }
  async function loadIpoNews() {
    const el = $('#ipoNews'); if (!el) return;
    try {
      const d = await api('/api/news', { q: state.ipo.newsQuery, days: 10 });
      el.innerHTML = d.items.length ? d.items.slice(0, 25).map((n) => `<a href="${esc(n.link)}" target="_blank" rel="noopener"><div><div class="t">${esc(n.title)}</div><div class="s"><span class="src-tag">${esc(n.source || 'News')}</span>${n.published ? new Date(n.published).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</div></div><span class="ago">${timeAgo(n.published)}</span></a>`).join('') : '<div class="empty">No headlines found for this query.</div>';
      $('#ipoNewsNote').textContent = d.fallback ? 'Live news feed unavailable — showing a cached snapshot of recent IPO headlines.' : `Headlines via Google News RSS · "${d.query}" · ${d.items.length} items · refreshed ${new Date(d.asOf).toLocaleTimeString('en-GB')}`;
    } catch (e) { el.innerHTML = `<div class="empty">News unavailable: ${esc(e.message)}</div>`; }
  }

  /* ================================================================== */
  /* TAB 5 — S&P 500 outperformers                                       */
  /* ================================================================== */
  function buildOutperformers() {
    const p = $('#tab-outperformers');
    p.innerHTML = `
      <div class="grid" style="gap:14px">
        <div class="panel">
          <div class="p-head"><h2>Stocks beating the S&amp;P 500 <span class="live">SCAN</span></h2><div class="tools"><div class="seg" id="opRange">${['1mo', '3mo', '6mo', 'ytd', '1y'].map((r) => `<button data-r="${r}" class="${r === 'ytd' ? 'active' : ''}">${r.toUpperCase()}</button>`).join('')}</div><div class="seg" id="opLimit"><button data-n="10" class="active">Top 10</button><button data-n="25">Top 25</button><button data-n="50">Top 50</button></div><span class="asof" id="opAsOf"></span></div></div>
          <div class="p-body"><div class="kpi-row" id="opKpis"></div></div>
        </div>
        <div class="grid g-main">
          <div class="panel"><div class="p-head"><h2 id="opTitle">Top 10 outperformers</h2><span class="asof">ranked by total price return · click a row for the chart</span></div><div class="p-body tight" id="opTable"></div><div class="note">Universe: current S&amp;P 500 constituents (503 share classes). Return = last price vs. period-start close; excess = stock return − index return. Prices may be delayed.</div></div>
          <div class="grid" style="gap:14px;align-content:start">
            <div class="panel"><div class="p-head"><h2>Top 5 vs S&amp;P 500</h2></div><div class="p-body"><div class="compare-legend" id="opLegend"></div><div class="chart-box" style="margin-top:8px"><canvas id="opCmp"></canvas></div></div></div>
            <div class="panel"><div class="p-head"><h2>Sector scorecard</h2><span class="asof">avg return · % of members beating index</span></div><div class="p-body"><div class="sector-list" id="opSectors"></div></div></div>
            <div class="panel"><div class="p-head"><h2>Biggest laggards</h2></div><div class="p-body tight" id="opLaggards"></div></div>
          </div>
        </div>
      </div>`;
    p.dataset.built = '1';
    $('#opRange').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#opRange button').forEach((x) => x.classList.toggle('active', x === b)); state.outperf.range = b.dataset.r; $('#opTable').innerHTML = '<div class="loading-block">Scanning 503 constituents…</div>'; loadOutperformers(); });
    $('#opLimit').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#opLimit button').forEach((x) => x.classList.toggle('active', x === b)); state.outperf.limit = +b.dataset.n; loadOutperformers(); });
  }
  async function loadOutperformers() {
    if (!$('#tab-outperformers').dataset.built) buildOutperformers();
    const d = await api('/api/sp500/outperformers', { range: state.outperf.range, limit: state.outperf.limit });
    state.outperf.data = d;
    const R = d.range.toUpperCase();
    $('#opAsOf').textContent = `scan as of ${new Date(d.asOf || Date.now()).toLocaleTimeString('en-GB')}`;
    $('#opKpis').innerHTML = `
      <div class="stat gold"><div class="s-label">S&amp;P 500 · ${R} return</div><div class="s-val ${cls(d.index.ret)}">${fmtPct(d.index.ret)}</div><div class="s-sub">Index ${d.index.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div></div>
      <div class="stat"><div class="s-label">Members beating the index</div><div class="s-val">${d.beating} <small class="muted" style="font-size:12px">/ ${d.scanned}</small></div><div class="s-sub">${((d.beating / d.scanned) * 100).toFixed(0)}% breadth · ${d.scanned - d.beating} lagging</div></div>
      <div class="stat"><div class="s-label">Median member return</div><div class="s-val ${cls(d.median)}">${fmtPct(d.median)}</div><div class="s-sub">${d.median < d.index.ret ? 'Index driven by a narrow set of leaders' : 'Broad-based participation'}</div></div>
      <div class="stat"><div class="s-label">#1 · ${esc(d.ranked[0].symbol)}</div><div class="s-val up">${fmtPct(d.ranked[0].ret)}</div><div class="s-sub">${esc(d.ranked[0].name)} · ${esc(d.ranked[0].sector || '')}</div></div>`;
    $('#opTitle').textContent = `Top ${state.outperf.limit} outperformers · ${R}`;
    const top = d.ranked;
    const mx = Math.max(...top.map((r) => r.ret));
    const cols = [{ key: 'rank', label: '#', render: (r) => `<span class="rk ${r.rank <= 3 ? 'top' : ''}">${r.rank}</span>` }, COL.star, { key: 'symbol', label: 'Symbol', render: (r) => `<span class="sym">${esc(r.symbol)}</span>` }, { key: 'name', label: 'Company', cls: 'nm', render: (r) => `<span class="twoline">${esc(r.name)}<small>${esc(r.sector || '')}${r.subIndustry ? ' · ' + esc(r.subIndustry) : ''}</small></span>` }, { key: 'price', label: 'Last', r: true, cls: 'price', render: (r) => r.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }, { key: 'ret', label: `${R} return`, cls: 'bar-cell', render: (r) => `<div class="wrap"><div class="bg"><i class="${r.ret < 0 ? 'neg' : ''}" style="width:${Math.max(2, (r.ret / mx) * 100)}%"></i></div><span class="${cls(r.ret)}">${fmtPct(r.ret, 1)}</span></div>` }, { key: 'excess', label: 'vs S&P', r: true, render: (r) => `<span class="chip ${cls(r.excess)}">${fmtPct(r.excess, 1)}</span>` }, { key: 'changePct', label: 'Today', r: true, render: (r) => `<span class="chg ${cls(r.changePct)}">${fmtPct(r.changePct)}</span>` }, { key: 'spark', label: R + ' trend', render: (r) => sparkHTML(r.spark, r.base), sortVal: (r) => r.ret }];
    $('#opTable').innerHTML = quoteTable('opTbl', top, cols, { maxH: 760, rowClass: () => 'rank-row' });
    bindTable($('#tab-outperformers'), 'opTbl', () => loadOutperformers());
    // sectors
    const smx = Math.max(0.01, ...d.sectors.map((s) => Math.abs(s.avg)));
    $('#opSectors').innerHTML = d.sectors.map((s) => `<div class="sr"><span title="${esc(s.sector)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.sector)}</span><div class="b"><i class="${s.avg < 0 ? 'neg' : ''}" style="width:${(Math.abs(s.avg) / smx) * 100}%"></i></div><span class="n ${cls(s.avg)}">${fmtPct(s.avg, 1)}</span><span class="n muted">${Math.round((s.beating / s.n) * 100)}%</span></div>`).join('');
    // laggards
    const lcols = [{ key: 'symbol', label: 'Symbol', render: (r) => `<span class="sym">${esc(r.symbol)}</span>` }, { key: 'name', label: 'Company', cls: 'nm', render: (r) => esc(r.name) }, { key: 'ret', label: R, r: true, render: (r) => `<span class="chip ${cls(r.ret)}">${fmtPct(r.ret, 1)}</span>` }];
    $('#opLaggards').innerHTML = quoteTable('opLag', d.laggards, lcols, {});
    bindTable($('#tab-outperformers'), 'opLag', () => {});
    drawSparks($('#tab-outperformers'));
    // compare chart
    const syms = ['^GSPC', ...top.slice(0, 5).map((r) => r.symbol)];
    $('#opLegend').innerHTML = syms.map((s, i) => `<span><i style="background:${i === 0 ? '#e6edf6' : PALETTE[i % PALETTE.length]}"></i>${esc(s === '^GSPC' ? 'S&P 500' : s)}</span>`).join('');
    try {
      const sd = await api('/api/series', { symbols: syms.join(','), range: d.range });
      const series = sd.series.map((s) => { const i = syms.indexOf(s.symbol); return { label: s.symbol === '^GSPC' ? 'S&P' : s.symbol, t: s.t, c: s.c, base: s.base, color: i === 0 ? (document.documentElement.dataset.theme === 'light' ? '#0f172a' : '#e6edf6') : PALETTE[i % PALETTE.length], emph: i === 0, dash: i === 0 }; });
      HGChart.compareChart($('#opCmp'), series, { range: d.range });
    } catch (e) { /* ignore */ }
  }

  /* ================================================================== */
  /* TAB 6 — Bonds & Rates                                               */
  /* ================================================================== */
  function buildRates() {
    const p = $('#tab-rates');
    p.innerHTML = `
      <div class="grid" style="gap:14px">
        <div class="panel"><div class="p-head"><h2>US Treasury yields <span class="live">LIVE</span></h2><span class="asof" id="rtAsOf"></span></div><div class="p-body"><div class="yield-tiles" id="rtTiles"></div></div></div>
        <div class="grid g-main">
          <div class="panel"><div class="p-head"><h2>Yield curve — today vs 1 month &amp; 1 year ago</h2><span class="asof">weekly closes · hover a tenor</span></div><div class="p-body"><div class="curve-box"><canvas id="rtCurve"></canvas></div></div></div>
          <div class="grid" style="gap:14px;align-content:start">
            <div class="panel"><div class="p-head"><h2>Curve spreads</h2></div><div class="p-body" id="rtSpreads"></div></div>
            <div class="panel"><div class="p-head"><h2>South Africa 🇿🇦</h2><span class="asof" id="rtSaNext"></span></div><div class="p-body"><div class="sa-box" id="rtSa"></div><div class="muted" style="font-size:11px;margin-top:8px" id="rtSaNote"></div></div></div>
          </div>
        </div>
        <div class="panel"><div class="p-head"><h2>Central bank policy rates</h2><span class="asof" id="rtCbAsOf"></span></div><div class="p-body"><div class="cb-grid" id="rtCb"></div></div><div class="note">Highlighted cards have a decision within the next 14 days. Rates as last published; update <code>data/rates.json</code> after each meeting.</div></div>
        <div class="grid g-2">
          <div class="panel"><div class="p-head"><h2>Bond ETFs — live</h2></div><div class="p-body tight" id="rtEtfs"></div><div class="note">Bond ETF prices move inversely to yields. JSE ETFs shown in rand.</div></div>
          <div class="panel"><div class="p-head"><h2>Treasury futures (CBOT)</h2></div><div class="p-body tight" id="rtFut"></div><div class="note">Front-month contracts. Click any row for the full chart.</div></div>
        </div>
      </div>`;
    p.dataset.built = '1';
    p.addEventListener('click', (e) => { const t = e.target.closest('.yt[data-sym]'); if (t) openModal(t.dataset.sym); });
  }
  async function loadRates() {
    if (!$('#tab-rates').dataset.built) buildRates();
    const d = await api('/api/rates');
    state.rates.data = d;
    $('#rtAsOf').textContent = `as of ${new Date(d.asOf || Date.now()).toLocaleTimeString('en-GB')}`;
    $('#rtCbAsOf').textContent = `policy data compiled ${d.dataAsOf}`;
    // tiles
    $('#rtTiles').innerHTML = d.curve.map((c) => `<div class="yt" data-sym="${esc(c.symbol)}" title="${esc(c.symbol)} · last update ${c.marketTime ? new Date(c.marketTime * 1000).toLocaleString('en-GB') : 'n/a'} · click for chart"><div class="l">${esc(c.label)} · ${esc(c.name)}</div><div class="v">${c.yield != null ? c.yield.toFixed(3) + '%' : '—'}</div><div class="d ${cls(c.changeBp)}">${c.changeBp != null ? (c.changeBp > 0 ? '+' : '') + c.changeBp.toFixed(1) + ' bp' : '—'} today${c.ago1y != null && c.yield != null ? ` · <span class="${cls(c.yield - c.ago1y)}">${((c.yield - c.ago1y) * 100 > 0 ? '+' : '') + ((c.yield - c.ago1y) * 100).toFixed(0)} bp 1y</span>` : ''}</div>${sparkHTML(c.spark, null, '')}</div>`).join('');
    drawSparks($('#rtTiles'));
    // curve
    const mk = (key, label, color, emph, dash) => ({ label, color, emph, dash, pts: d.curve.map((c) => ({ x: c.months, y: c[key] != null ? c[key] : null, lbl: c.label })) });
    HGChart.curveChart($('#rtCurve'), [mk('yield', 'Today', '#d4af37', true), mk('ago1m', '1 month ago', '#3b82f6', false, true), mk('ago1y', '1 year ago', '#8b9bb4', false, true)]);
    // spreads
    $('#rtSpreads').innerHTML = d.spreads.map((sp) => `<div class="spread-row"><span class="lbl">${esc(sp.label)}</span><span class="muted">${esc(sp.name)} ${sp.bp != null && sp.bp < 0 ? '· <span class="down">inverted</span>' : ''}</span><span class="val ${cls(sp.bp)}">${sp.bp != null ? (sp.bp > 0 ? '+' : '') + sp.bp.toFixed(0) + ' bp' : '—'}</span></div>`).join('');
    // SA
    const sa = d.southAfrica;
    $('#rtSa').innerHTML = [['Repo rate', sa.repo.toFixed(2) + '%'], ['Prime rate', sa.prime.toFixed(2) + '%'], ['Latest CPI', sa.lastCPI], ['Target', sa.inflationTarget]].map(([k, v]) => `<div class="stat"><div class="s-label">${k}</div><div class="s-val" style="font-size:16px">${esc(v)}</div></div>`).join('');
    $('#rtSaNext').textContent = `next MPC ${sa.nextMPC}`;
    $('#rtSaNote').textContent = sa.note;
    // central banks
    const now = Date.now();
    $('#rtCb').innerHTML = d.centralBanks.map((cb) => {
      const days = Math.ceil((Date.parse(cb.next) - now) / 86400000);
      const soon = days >= 0 && days <= 14;
      return `<div class="cb ${soon ? 'soon' : ''}"><div class="cb-name">${cb.flag} ${esc(cb.bank)}</div><div class="cb-rate">${esc(cb.rate)}</div><div class="cb-move muted">${esc(cb.instrument)} · last: ${esc(cb.lastMove)} (${esc(cb.lastDate)})</div><div class="cb-meta"><span class="chip ${cb.tone === 'hawkish-hold' ? 'gold' : ''}">${cb.tone === 'hawkish-hold' ? 'hawkish hold' : esc(cb.tone)}</span><span class="cb-next ${soon ? 'up' : ''}">next ${esc(cb.next)}${days >= 0 ? ` · in ${days}d` : ''}</span></div></div>`;
    }).join('');
    // ETFs
    const etfRows = Object.entries(d.etfs).flatMap(([g, arr]) => arr.map((q) => ({ ...q, group: g })));
    for (const q of etfRows) state.quotes.set(q.symbol, q);
    for (const q of d.futures) state.quotes.set(q.symbol, q);
    const cols = [COL.star, { key: 'symbol', label: 'Fund', render: (q) => `<span class="twoline"><span class="sym">${esc(q.symbol)}</span><small>${esc(q.label)}</small></span>` }, { key: 'group', label: 'Group', render: (q) => `<span class="muted">${esc(q.group)}</span>` }, COL.price, COL.pct, COL.spark, COL.ccy, COL.state];
    $('#rtEtfs').innerHTML = quoteTable('rtEtfTbl', etfRows, cols, { maxH: 520 });
    bindTable($('#tab-rates'), 'rtEtfTbl', () => loadRates());
    const fcols = [COL.star, { key: 'symbol', label: 'Contract', render: (q) => `<span class="twoline"><span class="sym">${esc(q.symbol)}</span><small>${esc(q.label)} · ${esc(q.name)}</small></span>` }, COL.price, COL.chg, COL.pct, COL.spark, COL.state];
    $('#rtFut').innerHTML = quoteTable('rtFutTbl', d.futures, fcols, {});
    bindTable($('#tab-rates'), 'rtFutTbl', () => loadRates());
    drawSparks($('#rtEtfs')); drawSparks($('#rtFut'));
  }

  /* ================================================================== */
  /* TAB 7 — Portfolio & Alerts                                          */
  /* ================================================================== */
  const PF_CCYS = ['ZAR', 'USD', 'EUR', 'GBP'];
  function buildPortfolio() {
    const p = $('#tab-portfolio');
    p.innerHTML = `
      <div class="grid" style="gap:14px">
        <div class="panel">
          <div class="p-head"><h2>Portfolio tracker <span class="live">LIVE P&amp;L</span></h2><div class="tools"><span class="ccy-toggle">Report in</span><div class="seg" id="pfCcy">${PF_CCYS.map((c) => `<button data-c="${c}" class="${c === state.pf.baseCcy ? 'active' : ''}">${c}</button>`).join('')}</div><button class="btn gold small" id="pfAdd" type="button">＋ Add position</button><button class="btn small" id="pfExport" type="button">⤓ Export CSV</button><button class="btn small" id="pfImport" type="button">⤒ Import CSV</button><button class="btn small" id="pfClear" type="button" title="Remove all positions">Clear all</button><input type="file" id="pfFile" accept=".csv,text/csv" hidden><span class="asof" id="pfAsOf"></span></div></div>
          <div class="p-body"><div class="kpi-row" id="pfKpis"></div></div>
        </div>
        <div class="grid g-main">
          <div class="panel"><div class="p-head"><h2>Positions</h2><span class="asof">click a row for the chart · ✎ edit</span></div><div class="p-body tight" id="pfTable"></div><div class="note" id="pfNote">P&amp;L uses the latest available price; FX-converted using live spot. Positions are saved in this browser only.</div></div>
          <div class="grid" style="gap:14px;align-content:start">
            <div class="panel"><div class="p-head"><h2>Allocation</h2></div><div class="p-body" id="pfAlloc"></div></div>
            <div class="panel"><div class="p-head"><h2>Today's movers in your book</h2></div><div class="p-body" id="pfMovers"></div></div>
          </div>
        </div>
        <div class="panel">
          <div class="p-head"><h2>Price alerts <span class="live" id="alHeadCount">0 ACTIVE</span></h2><div class="tools"><button class="btn gold small" id="alAdd" type="button">＋ New alert</button><button class="btn small" id="alNotify" type="button">🔔 Enable browser notifications</button><button class="btn small" id="alClear" type="button">Clear triggered</button></div></div>
          <div class="p-body tight" id="alTable"></div>
          <div class="note">Alerts are evaluated every 10 seconds against live quotes while any tab is open. Triggered alerts show a toast (and a system notification if permitted) and are kept in the log until cleared.</div>
        </div>
      </div>`;
    p.dataset.built = '1';
    $('#pfCcy').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#pfCcy button').forEach((x) => x.classList.toggle('active', x === b)); state.pf.baseCcy = b.dataset.c; localStorage.setItem('hgm.baseCcy', state.pf.baseCcy); renderPortfolio(); });
    $('#pfAdd').addEventListener('click', () => openPosDlg());
    $('#pfExport').addEventListener('click', exportCsv);
    $('#pfImport').addEventListener('click', () => $('#pfFile').click());
    $('#pfFile').addEventListener('change', importCsv);
    $('#pfClear').addEventListener('click', () => { if (!state.positions.length || !confirm(`Remove all ${state.positions.length} positions from this browser?`)) return; state.positions = []; savePositions(); renderPortfolio(); toast('Portfolio cleared', 'Add positions manually or import a CSV.'); });
    $('#alAdd').addEventListener('click', () => openAlertDlg(state.modal.symbol || (state.positions[0] && state.positions[0].symbol) || 'USDZAR=X'));
    $('#alNotify').addEventListener('click', async () => { if (!('Notification' in window)) return toast('Notifications unsupported', 'This browser does not support system notifications.'); const r = await Notification.requestPermission(); toast('Notifications ' + r, r === 'granted' ? 'You will get a system notification when an alert fires.' : 'Alerts will still show in-app.'); });
    $('#alClear').addEventListener('click', () => { state.alerts = state.alerts.filter((a) => !a.firedAt); saveAlerts(); renderAlerts(); });
  }
  function pfSymbols() { return [...new Set(state.positions.map((p) => p.symbol.toUpperCase()))]; }
  function fxSymbolsFor(ccys) {
    const need = new Set();
    for (const c of ccys) if (c && c !== 'USD') need.add(`USD${c}=X`);
    for (const c of PF_CCYS) if (c !== 'USD') need.add(`USD${c}=X`);
    return [...need];
  }
  async function loadPortfolio() {
    if (!$('#tab-portfolio').dataset.built) buildPortfolio();
    const syms = pfSymbols();
    if (syms.length) await getQuotes(syms).catch(() => {});
    const ccys = syms.map((s) => (state.quotes.get(s) || {}).currency).filter(Boolean);
    await getQuotes(fxSymbolsFor(ccys)).catch(() => {});
    computeUsdRates();
    renderPortfolio();
    renderAlerts();
  }
  /** convert amount in ccy → base using USD-per-unit table */
  function convert(amount, ccy, base) {
    const r = state.fx.usdRates || { USD: 1 };
    if (!ccy || ccy === base) return amount;
    if (!r[ccy] || !r[base]) return null;
    return (amount / r[ccy]) * r[base];
  }
  function pfRows() {
    const base = state.pf.baseCcy;
    return state.positions.map((p) => {
      const q = state.quotes.get(p.symbol.toUpperCase());
      const price = q ? q.price : null;
      const ccy = q ? q.currency : null;
      const sign = p.side === 'short' ? -1 : 1;
      const costTotal = p.qty * p.cost;
      const value = price != null ? p.qty * price : null;
      const pnl = value != null ? sign * (value - costTotal) : null;
      const pnlPct = pnl != null && costTotal ? (pnl / costTotal) * 100 : null;
      const dayPnl = q && q.change != null ? sign * p.qty * q.change : null;
      return { ...p, symbol: p.symbol.toUpperCase(), q, name: q ? displayName(q) : '', price, ccy, costTotal, value, pnl, pnlPct, dayPnl, dayPct: q ? q.changePct : null, valueBase: value != null ? convert(value, ccy, base) : null, costBase: convert(costTotal, ccy, base), pnlBase: pnl != null ? convert(pnl, ccy, base) : null, dayPnlBase: dayPnl != null ? convert(dayPnl, ccy, base) : null };
    });
  }
  const fmtMoney = (v, ccy) => (v == null || !isFinite(v) ? '—' : `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${ccy ? ' ' + ccy : ''}`);
  function renderPortfolio() {
    const base = state.pf.baseCcy;
    const rows = pfRows();
    $('#pfAsOf').textContent = `as of ${new Date().toLocaleTimeString('en-GB')}`;
    if (!rows.length) {
      $('#pfKpis').innerHTML = ''; $('#pfAlloc').innerHTML = ''; $('#pfMovers').innerHTML = '';
      $('#pfTable').innerHTML = `<div class="empty-state"><div class="big">📂</div><div>No positions yet. Add one manually, import a CSV, or use “＋ Portfolio” from any chart.</div><button class="btn gold" onclick="document.getElementById('pfAdd').click()">Add your first position</button></div>`;
      return;
    }
    const tot = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
    const value = tot('valueBase'), cost = tot('costBase'), pnl = tot('pnlBase'), day = tot('dayPnlBase');
    const missing = rows.filter((r) => r.valueBase == null).length;
    const best = rows.filter((r) => r.pnlPct != null).sort((a, b) => b.pnlPct - a.pnlPct)[0];
    const worst = rows.filter((r) => r.pnlPct != null).sort((a, b) => a.pnlPct - b.pnlPct)[0];
    $('#pfKpis').innerHTML = `
      <div class="stat gold pf-kpi"><div class="s-label">Market value · ${base}</div><div class="s-val">${fmtMoney(value)}</div><div class="s-sub">${rows.length} positions${missing ? ` · ${missing} unpriced` : ''}</div></div>
      <div class="stat pf-kpi"><div class="s-label">Unrealised P&amp;L</div><div class="s-val ${cls(pnl)}">${fmtMoney(pnl)}</div><div class="s-sub ${cls(pnl)}">${cost ? fmtPct((pnl / cost) * 100) : '—'} on cost of ${fmtMoney(cost)}</div></div>
      <div class="stat pf-kpi"><div class="s-label">Today's P&amp;L</div><div class="s-val ${cls(day)}">${fmtMoney(day)}</div><div class="s-sub ${cls(day)}">${value ? fmtPct((day / (value - day)) * 100) : '—'} vs prior close</div></div>
      <div class="stat pf-kpi"><div class="s-label">Best / worst</div><div class="s-val" style="font-size:14px">${best ? `<span class="up">${esc(best.symbol)} ${fmtPct(best.pnlPct, 1)}</span>` : '—'}${worst && worst !== best ? ` · <span class="down">${esc(worst.symbol)} ${fmtPct(worst.pnlPct, 1)}</span>` : ''}</div><div class="s-sub">since entry</div></div>`;
    // table
    const cols = [
      { key: 'symbol', label: 'Symbol', render: (r) => `<span class="twoline"><span class="sym">${esc(isFX(r.symbol) ? fxLabel(r.symbol) : r.symbol)}</span><small>${esc(r.name || '')}${r.side === 'short' ? ' · <span class="down">SHORT</span>' : ''}</small></span>` },
      { key: 'qty', label: 'Qty', r: true, render: (r) => `<span class="num">${r.qty.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>` },
      { key: 'cost', label: 'Avg cost', r: true, render: (r) => `<span class="num muted">${r.cost.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>` },
      { key: 'price', label: 'Last', r: true, cls: 'price', render: (r) => (r.price != null ? fmtPrice(r.q) : '<span class="muted">n/a</span>') },
      { key: 'dayPct', label: 'Today', r: true, render: (r) => `<span class="chg ${cls(r.dayPct)}">${fmtPct(r.dayPct)}</span>` },
      { key: 'value', label: `Value (${base})`, r: true, render: (r) => `<span class="num">${fmtMoney(r.valueBase)}</span>${r.ccy && r.ccy !== base ? `<br><small class="muted num">${fmtMoney(r.value, r.ccy)}</small>` : ''}`, sortVal: (r) => r.valueBase },
      { key: 'pnl', label: `P&L (${base})`, r: true, render: (r) => `<span class="num ${cls(r.pnlBase)}" style="font-weight:700">${fmtMoney(r.pnlBase)}</span><br><span class="chip ${cls(r.pnlPct)}">${fmtPct(r.pnlPct)}</span>`, sortVal: (r) => r.pnlBase },
      { key: 'weight', label: 'Weight', render: (r) => { const wgt = value ? ((r.valueBase || 0) / value) * 100 : 0; return `<div class="prog" title="${wgt.toFixed(1)}%"><i style="width:${wgt}%"></i></div><small class="num muted">${wgt.toFixed(1)}%</small>`; }, sortVal: (r) => r.valueBase },
      { key: 'spark', label: 'Today', render: (r) => (r.q ? sparkHTML(r.q.spark, r.q.prevClose) : ''), sortVal: (r) => r.dayPct },
      { key: 'act', label: '', render: (r) => `<span class="inline-actions"><button class="btn" data-edit="${esc(r.id)}" title="Edit">✎</button><button class="btn" data-alert="${esc(r.symbol)}" title="Alert">🔔</button></span>` },
    ];
    $('#pfTable').innerHTML = quoteTable('pfTbl', rows, cols, { defaultSort: state.pf.sort, maxH: 560 });
    const tbl = $('#pfTbl');
    tbl.addEventListener('click', (e) => {
      const ed = e.target.closest('[data-edit]'); if (ed) { e.stopPropagation(); openPosDlg(state.positions.find((p) => p.id === ed.dataset.edit)); return; }
      const al = e.target.closest('[data-alert]'); if (al) { e.stopPropagation(); openAlertDlg(al.dataset.alert); return; }
      const th = e.target.closest('th[data-sort]'); if (th) { const cur = state.sort.pfTbl || state.pf.sort; state.sort.pfTbl = { key: th.dataset.sort, dir: cur.key === th.dataset.sort ? -cur.dir : -1 }; renderPortfolio(); return; }
      const tr = e.target.closest('tr[data-sym]'); if (tr) openModal(tr.dataset.sym);
    });
    drawSparks($('#pfTable'));
    // allocation (by symbol + by currency)
    const bySym = rows.filter((r) => r.valueBase).sort((a, b) => b.valueBase - a.valueBase);
    const byCcy = {};
    bySym.forEach((r) => { byCcy[r.ccy] = (byCcy[r.ccy] || 0) + r.valueBase; });
    const donut = (parts) => {
      const R = 60, C = 2 * Math.PI * R; let off = 0;
      return `<svg viewBox="0 0 150 150"><g transform="translate(75,75) rotate(-90)">${parts.map((p, i) => { const len = (p.w / 100) * C; const seg = `<circle r="${R}" cx="0" cy="0" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="22" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"><title>${esc(p.k)} ${p.w.toFixed(1)}%</title></circle>`; off += len; return seg; }).join('')}</g><text x="75" y="71" text-anchor="middle" fill="currentColor" font-size="11" font-family="monospace">${parts.length} ${parts.length === 1 ? 'holding' : 'holdings'}</text><text x="75" y="86" text-anchor="middle" fill="currentColor" font-size="10" opacity=".6">${base}</text></svg>`;
    };
    const symParts = bySym.map((r) => ({ k: r.symbol, w: (r.valueBase / value) * 100 }));
    const ccyParts = Object.entries(byCcy).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, w: (v / value) * 100 }));
    $('#pfAlloc').innerHTML = `<div class="donut">${donut(symParts)}<div><div class="alloc-legend" style="margin-top:0">${symParts.map((p, i) => `<span><b style="background:${PALETTE[i % PALETTE.length]}"></b>${esc(p.k)} <span class="num muted">${p.w.toFixed(1)}%</span></span>`).join('')}</div></div></div>
      <div class="section-title" style="margin-top:14px"><h3>By currency</h3></div><div class="alloc">${ccyParts.map((p, i) => `<i style="width:${p.w}%;background:${PALETTE[(i + 3) % PALETTE.length]}" title="${esc(p.k)} ${p.w.toFixed(1)}%"></i>`).join('')}</div><div class="alloc-legend">${ccyParts.map((p, i) => `<span><b style="background:${PALETTE[(i + 3) % PALETTE.length]}"></b>${esc(p.k)} <span class="num muted">${p.w.toFixed(1)}%</span></span>`).join('')}</div>`;
    // movers
    const movers = rows.filter((r) => r.dayPnlBase != null).sort((a, b) => Math.abs(b.dayPnlBase) - Math.abs(a.dayPnlBase)).slice(0, 6);
    const mx = Math.max(1, ...movers.map((r) => Math.abs(r.dayPnlBase)));
    $('#pfMovers').innerHTML = movers.length ? `<div class="sector-list">${movers.map((r) => `<div class="sr" data-sym="${esc(r.symbol)}" style="cursor:pointer;grid-template-columns:90px 1fr 70px 90px"><span class="sym" style="font-family:var(--mono);font-weight:700;color:var(--gold-2)">${esc(isFX(r.symbol) ? fxLabel(r.symbol) : r.symbol)}</span><div class="b"><i class="${r.dayPnlBase < 0 ? 'neg' : ''}" style="width:${(Math.abs(r.dayPnlBase) / mx) * 100}%"></i></div><span class="n ${cls(r.dayPct)}">${fmtPct(r.dayPct, 1)}</span><span class="n ${cls(r.dayPnlBase)}">${fmtMoney(r.dayPnlBase)}</span></div>`).join('')}</div>` : '<div class="empty">No intraday data yet.</div>';
    $$('#pfMovers .sr').forEach((el) => el.addEventListener('click', () => openModal(el.dataset.sym)));
  }
  // ---- position dialog ----
  function openPosDlg(pos, presetSymbol) {
    const dlg = $('#posDlg'); dlg.hidden = false;
    $('#pdTitle').textContent = pos ? 'Edit position' : 'Add position';
    $('#pdId').value = pos ? pos.id : '';
    $('#pdSymbol').value = pos ? pos.symbol : presetSymbol || '';
    $('#pdSide').value = pos ? pos.side : 'long';
    $('#pdQty').value = pos ? pos.qty : '';
    const q = state.quotes.get((pos ? pos.symbol : presetSymbol || '').toUpperCase());
    $('#pdCost').value = pos ? pos.cost : q && q.price != null ? +q.price.toFixed(4) : '';
    $('#pdDate').value = pos ? pos.date || '' : new Date().toISOString().slice(0, 10);
    $('#pdNote').value = pos ? pos.note || '' : '';
    $('#pdDelete').hidden = !pos;
    $('#pdSub').textContent = q ? `${displayName(q)} · last ${fmtPrice(q)} ${q.currency}` : 'Enter a Yahoo-style symbol (e.g. NPN.JO, AAPL, EURUSD=X, GC=F, BTC-USD)';
    setTimeout(() => $(pos ? '#pdQty' : '#pdSymbol').focus(), 30);
  }
  $('#posForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#pdId').value || 'p' + Date.now().toString(36);
    const pos = { id, symbol: $('#pdSymbol').value.trim().toUpperCase(), side: $('#pdSide').value, qty: parseFloat($('#pdQty').value), cost: parseFloat($('#pdCost').value), date: $('#pdDate').value, note: $('#pdNote').value.trim() };
    if (!pos.symbol || !(pos.qty > 0) || !(pos.cost >= 0)) return;
    const i = state.positions.findIndex((p) => p.id === id);
    if (i >= 0) state.positions[i] = pos; else state.positions.push(pos);
    savePositions(); $('#posDlg').hidden = true;
    toast('Position saved', `${pos.symbol} · ${pos.qty} @ ${pos.cost}`, 'up');
    if (state.tab === 'portfolio') loadPortfolio(); else getQuotes([pos.symbol]).catch(() => {});
  });
  $('#pdDelete').addEventListener('click', () => { const id = $('#pdId').value; state.positions = state.positions.filter((p) => p.id !== id); savePositions(); $('#posDlg').hidden = true; if (state.tab === 'portfolio') renderPortfolio(); });
  $('#pdSymbol').addEventListener('change', async () => { const s = $('#pdSymbol').value.trim().toUpperCase(); if (!s) return; try { const d = await getQuotes([s]); const q = d.quotes[0]; if (q) { $('#pdSub').textContent = `${displayName(q)} · last ${fmtPrice(q)} ${q.currency}`; if (!$('#pdCost').value) $('#pdCost').value = +q.price.toFixed(4); } else $('#pdSub').textContent = 'Symbol not found'; } catch { $('#pdSub').textContent = 'Symbol lookup failed'; } });
  function exportCsv() {
    const lines = [['symbol', 'side', 'qty', 'cost', 'date', 'note'].join(','), ...state.positions.map((p) => [p.symbol, p.side, p.qty, p.cost, p.date || '', `"${(p.note || '').replace(/"/g, '""')}"`].join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `harrington-portfolio-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  function importCsv(e) {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const lines = String(rd.result).split(/\r?\n/).filter((l) => l.trim());
      const hdr = lines[0].toLowerCase().split(',').map((h) => h.trim());
      const ix = (n) => hdr.indexOf(n);
      if (ix('symbol') < 0 || ix('qty') < 0 || ix('cost') < 0) return toast('Import failed', 'CSV needs symbol, qty, cost columns (side, date, note optional).', 'down');
      let n = 0;
      for (const l of lines.slice(1)) {
        const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((x) => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
        const sym = (c[ix('symbol')] || '').trim().toUpperCase(), qty = parseFloat(c[ix('qty')]), cost = parseFloat(c[ix('cost')]);
        if (!sym || !(qty > 0) || !(cost >= 0)) continue;
        state.positions.push({ id: 'p' + Date.now().toString(36) + n, symbol: sym, side: ix('side') >= 0 && /short/i.test(c[ix('side')]) ? 'short' : 'long', qty, cost, date: ix('date') >= 0 ? c[ix('date')] : '', note: ix('note') >= 0 ? c[ix('note')] : '' });
        n++;
      }
      savePositions(); toast('Imported', `${n} positions added`, 'up'); loadPortfolio();
    };
    rd.readAsText(f); e.target.value = '';
  }

  /* ================================================================== */
  /* Alerts engine                                                       */
  /* ================================================================== */
  const COND_LABEL = { above: 'rises above', below: 'falls below', pct_up: 'day change ≥ +', pct_down: 'day change ≤ −' };
  function alertText(a) { const q = { symbol: a.symbol, type: null, price: a.value }; return a.cond.startsWith('pct') ? `${COND_LABEL[a.cond]}${a.value}%` : `${COND_LABEL[a.cond]} ${fmtPrice(q, a.value)}`; }
  function openAlertDlg(symbol) {
    if (!symbol) return;
    const q = state.quotes.get(symbol);
    $('#alertDlg').hidden = false;
    $('#adSymbol').value = symbol;
    $('#adTitle').textContent = `New alert · ${isFX(symbol) ? fxLabel(symbol) : symbol}`;
    $('#adSub').textContent = q ? `${displayName(q)} · last ${fmtPrice(q)} ${q.currency || ''} (${fmtPct(q.changePct)} today)` : 'Current price unavailable — alert will arm once a quote arrives';
    $('#adNote').value = '';
    const setQuick = () => {
      const cond = $('#adCond').value;
      if (cond.startsWith('pct')) { $('#adQuick').innerHTML = [1, 2, 3, 5, 10].map((v) => `<span class="chip" data-v="${v}">${v}%</span>`).join(''); $('#adValue').value = 3; }
      else if (q && q.price != null) {
        const steps = cond === 'above' ? [1, 2, 5, 10] : [-1, -2, -5, -10];
        $('#adQuick').innerHTML = steps.map((pc) => { const v = q.price * (1 + pc / 100); return `<span class="chip" data-v="${v}">${pc > 0 ? '+' : ''}${pc}% → ${fmtPrice(q, v)}</span>`; }).join('');
        $('#adValue').value = +(q.price * (cond === 'above' ? 1.02 : 0.98)).toFixed(isFX(symbol) ? 4 : 2);
      } else { $('#adQuick').innerHTML = ''; $('#adValue').value = ''; }
    };
    $('#adCond').value = 'above'; setQuick();
    $('#adCond').onchange = setQuick;
    $('#adQuick').onclick = (e) => { const c = e.target.closest('[data-v]'); if (c) $('#adValue').value = +(+c.dataset.v).toFixed(isFX(symbol) ? 4 : 2); };
    setTimeout(() => $('#adValue').focus(), 30);
  }
  $('#alertForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const a = { id: 'a' + Date.now().toString(36), symbol: $('#adSymbol').value, cond: $('#adCond').value, value: parseFloat($('#adValue').value), note: $('#adNote').value.trim(), createdAt: Date.now(), firedAt: null, firedPrice: null };
    if (!isFinite(a.value)) return;
    state.alerts.unshift(a); saveAlerts(); $('#alertDlg').hidden = true;
    toast('Alert set', `${isFX(a.symbol) ? fxLabel(a.symbol) : a.symbol} ${alertText(a)}`, 'up');
    renderAlerts(); updateBell();
  });
  document.addEventListener('click', (e) => { const c = e.target.closest('[data-close-dlg]'); if (c) $('#' + c.dataset.closeDlg).hidden = true; });
  function alertProgress(a, q) {
    if (!q || q.price == null) return null;
    if (a.cond === 'above') { const start = q.prevClose || q.price; return Math.max(0, Math.min(1, (q.price - start) / Math.max(1e-9, a.value - start))); }
    if (a.cond === 'below') { const start = q.prevClose || q.price; return Math.max(0, Math.min(1, (start - q.price) / Math.max(1e-9, start - a.value))); }
    if (q.changePct == null) return null;
    return Math.max(0, Math.min(1, (a.cond === 'pct_up' ? q.changePct : -q.changePct) / a.value));
  }
  function renderAlerts() {
    const el = $('#alTable'); if (!el) return;
    const active = state.alerts.filter((a) => !a.firedAt).length;
    $('#alHeadCount').textContent = `${active} ACTIVE`;
    if (!state.alerts.length) { el.innerHTML = `<div class="empty-state"><div class="big">🔔</div><div>No alerts yet. Use “＋ New alert”, the 🔔 button on any chart, or the bell in a position row.</div></div>`; return; }
    const rows = state.alerts.map((a) => ({ ...a, q: state.quotes.get(a.symbol) }));
    const cols = [
      { key: 'status', label: '', render: (a) => (a.firedAt ? '<span class="st-fired" title="Triggered">●</span>' : '<span class="st-on" title="Armed">●</span>') },
      { key: 'symbol', label: 'Symbol', render: (a) => `<span class="twoline"><span class="sym">${esc(isFX(a.symbol) ? fxLabel(a.symbol) : a.symbol)}</span><small>${esc(a.q ? displayName(a.q) : '')}</small></span>` },
      { key: 'cond', label: 'Condition', render: (a) => `<span class="cond">${esc(alertText(a))}</span>${a.note ? `<br><small class="muted">${esc(a.note)}</small>` : ''}` },
      { key: 'last', label: 'Last', r: true, render: (a) => (a.q ? `<span class="num">${fmtPrice(a.q)}</span> <span class="chg ${cls(a.q.changePct)}">${fmtPct(a.q.changePct)}</span>` : '<span class="muted">—</span>') },
      { key: 'dist', label: 'Distance', r: true, render: (a) => { if (a.firedAt) return '<span class="st-fired">triggered</span>'; if (!a.q || a.q.price == null) return '—'; if (a.cond.startsWith('pct')) return `<span class="num muted">${fmtPct((a.cond === 'pct_up' ? a.value - (a.q.changePct || 0) : a.value + (a.q.changePct || 0)))} to go</span>`; const d = ((a.value - a.q.price) / a.q.price) * 100; return `<span class="num ${Math.abs(d) < 1 ? 'up' : 'muted'}">${d > 0 ? '+' : ''}${d.toFixed(2)}%</span>`; } },
      { key: 'prog', label: 'Progress', render: (a) => { const p = a.firedAt ? 1 : alertProgress(a, a.q); return p == null ? '' : `<div class="prog"><i class="${p >= 1 ? 'hit' : p > 0.7 ? 'near' : ''}" style="width:${p * 100}%"></i></div>`; } },
      { key: 'when', label: 'Created / fired', render: (a) => `<span class="num muted" style="font-size:11px">${new Date(a.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}${a.firedAt ? `<br><span class="up">fired ${new Date(a.firedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} @ ${a.firedPrice}</span>` : ''}</span>` },
      { key: 'act', label: '', render: (a) => `<span class="inline-actions">${a.firedAt ? `<button class="btn" data-rearm="${a.id}" title="Re-arm">↻</button>` : ''}<button class="btn" data-del="${a.id}" title="Delete">✕</button></span>` },
    ];
    el.innerHTML = quoteTable('alTbl', rows, cols, { rowClass: (a) => 'alert-row' + (a.firedAt ? ' fired' : ''), maxH: 420 });
    $('#alTbl').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]'); if (del) { e.stopPropagation(); state.alerts = state.alerts.filter((a) => a.id !== del.dataset.del); saveAlerts(); renderAlerts(); updateBell(); return; }
      const re = e.target.closest('[data-rearm]'); if (re) { e.stopPropagation(); const a = state.alerts.find((x) => x.id === re.dataset.rearm); if (a) { a.firedAt = null; a.firedPrice = null; } saveAlerts(); renderAlerts(); updateBell(); return; }
      const tr = e.target.closest('tr[data-sym]'); if (tr) openModal(tr.dataset.sym);
    });
  }
  function updateBell() {
    const active = state.alerts.filter((a) => !a.firedAt).length;
    const el = $('#bellCount'); el.hidden = !active; el.textContent = active;
  }
  function evaluateAlerts() {
    let fired = 0;
    for (const a of state.alerts) {
      if (a.firedAt) continue;
      const q = state.quotes.get(a.symbol);
      if (!q || q.price == null) continue;
      let hit = false;
      if (a.cond === 'above') hit = q.price >= a.value;
      else if (a.cond === 'below') hit = q.price <= a.value;
      else if (a.cond === 'pct_up') hit = q.changePct != null && q.changePct >= a.value;
      else if (a.cond === 'pct_down') hit = q.changePct != null && q.changePct <= -a.value;
      if (hit) {
        a.firedAt = Date.now(); a.firedPrice = fmtPrice(q); fired++;
        const title = `${isFX(a.symbol) ? fxLabel(a.symbol) : a.symbol} ${alertText(a)}`;
        toast('🔔 Alert triggered', `${title} — now ${fmtPrice(q)} (${fmtPct(q.changePct)})`, a.cond === 'below' || a.cond === 'pct_down' ? 'down' : 'up', () => openModal(a.symbol));
        if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('Harrington Global Markets — alert', { body: `${title} · now ${fmtPrice(q)}` }); } catch { /* ignore */ } }
      }
    }
    if (fired) { saveAlerts(); updateBell(); const b = $('#alertBell'); b.classList.remove('ringing'); void b.offsetWidth; b.classList.add('ringing'); if (state.tab === 'portfolio') renderAlerts(); }
  }
  async function pollAlerts() {
    const syms = [...new Set(state.alerts.filter((a) => !a.firedAt).map((a) => a.symbol))];
    if (!syms.length || document.hidden) return;
    try { await getQuotes(syms); evaluateAlerts(); } catch { /* ignore */ }
  }
  function toast(title, body, tone, onClick) {
    const host = $('#toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + (tone || '');
    t.innerHTML = `<b>${esc(title)}</b><small>${esc(body)}</small>`;
    t.addEventListener('click', () => { if (onClick) onClick(); t.remove(); });
    host.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 7000);
  }
  $('#alertBell').addEventListener('click', () => switchTab('portfolio'));

  /* ================================================================== */
  /* TAB 8 — CFTC Commitments of Traders                                 */
  /* ================================================================== */
  const fmtInt = (v, sign) => (v == null || !isFinite(v) ? '—' : `${sign && v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v)).toLocaleString('en-US')}`);
  const idxColor = (v) => (v == null ? 'var(--panel-2)' : v >= 80 ? 'rgba(34,197,94,.25)' : v <= 20 ? 'rgba(239,68,68,.25)' : 'var(--panel-2)');
  const idxChip = (v) => `<span class="idx-chip" style="background:${idxColor(v)};color:${v == null ? 'var(--muted)' : v >= 80 ? 'var(--up)' : v <= 20 ? 'var(--down)' : 'var(--text)'}">${v == null ? '—' : v.toFixed(0)}</span>`;
  const cotFlags = (it) => `${it.flags.record3yLong ? '<span class="cot-flag rec-long">3y record long</span>' : ''}${it.flags.record3yShort ? '<span class="cot-flag rec-short">3y record short</span>' : ''}${it.flags.flipped ? '<span class="cot-flag flip">flipped</span>' : ''}`;
  function buildCot() {
    const p = $('#tab-cot');
    p.innerHTML = `
      <div class="grid" style="gap:14px">
        <div class="panel">
          <div class="p-head"><h2>CFTC Commitments of Traders <span class="live" id="cotWeekBadge">WEEKLY</span></h2><div class="tools"><span class="asof" id="cotAsOf"></span></div></div>
          <div class="p-body"><div class="kpi-row" id="cotKpis"></div></div>
        </div>
        <div class="cot-grid">
          <div class="cot-side">
            <div class="panel">
              <div class="p-head"><h2>Markets</h2><input id="cotFilter" class="sel" placeholder="filter…" style="width:110px;padding:4px 8px;font-size:12px"></div>
              <div class="cot-list" id="cotList"></div>
              <div class="note">Speculator (non-commercial) net position · 52-week COT index gauge. Click a market.</div>
            </div>
          </div>
          <div class="grid" style="gap:14px;min-width:0">
            <div class="panel">
              <div class="p-head"><div class="m-title" style="min-width:0"><h2 id="cotTitle">—</h2><div class="asof" id="cotSub"></div></div>
                <div class="tools">
                  <div class="seg" id="cotView"><button data-v="net" class="active">Net positions</button><button data-v="ls">Long vs short</button><button data-v="cat">By category</button></div>
                  <div class="seg" id="cotYears"><button data-y="1">1Y</button><button data-y="3" class="active">3Y</button><button data-y="5">5Y</button><button data-y="10">10Y</button></div>
                  <button class="btn small" id="cotOpenChart" type="button">Price chart ↗</button>
                </div></div>
              <div class="p-body"><div class="cot-kpis" id="cotDetailKpis"></div></div>
              <div class="p-body" style="padding-top:0"><div class="cot-chart"><canvas id="cotCanvas"></canvas></div></div>
              <div class="note" id="cotChartNote"></div>
            </div>
            <div class="grid g-2">
              <div class="panel"><div class="p-head"><h2>Positions — latest week</h2><span class="asof" id="cotTblDate"></span></div><div class="p-body tight" id="cotTbl"></div><div class="note">Legacy report: non-commercial = speculators (funds), commercial = hedgers, non-reportable = small traders. Changes vs prior week.</div></div>
              <div class="panel"><div class="p-head"><h2 id="cotCatTitle">Trader categories</h2><span class="asof" id="cotCatSub"></span></div><div class="p-body tight" id="cotCatTbl"></div><div class="note" id="cotCatNote"></div></div>
            </div>
            <div class="panel"><div class="p-head"><h2>Open interest &amp; price</h2></div><div class="p-body"><div class="cot-mini"><canvas id="cotOiCanvas"></canvas></div></div></div>
          </div>
        </div>
        <div class="grid g-2">
          <div class="panel"><div class="p-head"><h2>Positioning extremes — 52-week COT index</h2><span class="asof">100 = most bullish speculators in a year · 0 = most bearish</span></div><div class="p-body"><div class="cot-heat" id="cotHeat"></div></div></div>
          <div class="panel"><div class="p-head"><h2>Biggest weekly shifts</h2><span class="asof">change in speculator net position, % of open interest</span></div><div class="p-body cot-scan" id="cotShifts"></div></div>
        </div>
        <div class="panel"><div class="p-head"><h2>Full board — speculator positioning across all markets</h2><span class="asof">click a row to load it above</span></div><div class="p-body tight" id="cotBoardTbl"></div><div class="note">Source: CFTC Public Reporting API (Legacy futures-only, Traders in Financial Futures and Disaggregated reports). Data as of each Tuesday, released Friday 15:30 ET. Positions are in contracts. COT index = (net − 52w min) ÷ (52w max − 52w min). Not investment advice.</div></div>
      </div>`;
    p.dataset.built = '1';
    $('#cotFilter').addEventListener('input', (e) => { state.cot.filter = e.target.value.trim().toLowerCase(); renderCotList(); });
    $('#cotList').addEventListener('click', (e) => { const it = e.target.closest('.cot-item'); if (it) selectCot(it.dataset.code); });
    $('#cotView').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#cotView button').forEach((x) => x.classList.toggle('active', x === b)); state.cot.view = b.dataset.v; renderCotChart(); });
    $('#cotYears').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#cotYears button').forEach((x) => x.classList.toggle('active', x === b)); state.cot.years = +b.dataset.y; loadCotDetail(); });
    $('#cotOpenChart').addEventListener('click', () => { const m = state.cot.detail && state.cot.detail.market; if (m && m.yahoo) openModal(m.yahoo); });
    p.addEventListener('click', (e) => { const h = e.target.closest('[data-cot]'); if (h) { selectCot(h.dataset.cot); $('#cotTitle').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  }
  async function loadCot() {
    if (!$('#tab-cot').dataset.built) buildCot();
    const d = await api('/api/cot');
    state.cot.board = d;
    const rel = d.releaseDate ? new Date(d.releaseDate + 'T00:00:00') : null;
    $('#cotAsOf').textContent = `positions as of Tue ${d.reportDate} · released ${d.releaseDate} · next ${d.nextRelease}${d.stale ? ' · STALE' : ''}`;
    $('#cotWeekBadge').textContent = rel ? `WEEK ${isoWeek(rel)}` : 'WEEKLY';
    renderCotBoard();
    renderCotList();
    if (!state.cot.detail || state.cot.detail.market.code !== state.cot.code) await loadCotDetail();
  }
  function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 86400000 + 1) / 7); }
  function cotItems() { return state.cot.board ? state.cot.board.items : []; }
  function renderCotBoard() {
    const d = state.cot.board; const items = d.items;
    const recL = items.filter((i) => i.flags.record3yLong), recS = items.filter((i) => i.flags.record3yShort), flips = items.filter((i) => i.flags.flipped);
    const crowdedL = items.filter((i) => i.index52 != null && i.index52 >= 80).length, crowdedS = items.filter((i) => i.index52 != null && i.index52 <= 20).length;
    const dxy = items.find((i) => i.code === '098662');
    // aggregate USD positioning vs G10 (in USD notional would need multipliers; show count of currencies where specs are net long USD)
    const fxCodes = ['099741', '097741', '096742', '090741', '092741', '232741', '112741'];
    const usdLongVs = fxCodes.filter((c) => { const it = items.find((i) => i.code === c); return it && it.nonComm.net < 0; }).length;
    $('#cotKpis').innerHTML = `
      <div class="stat gold"><div class="s-label">Markets tracked</div><div class="s-val">${items.length}</div><div class="s-sub">${d.groups.length} groups · ${d.lookbackYears}y history</div></div>
      <div class="stat"><div class="s-label">Crowded longs / shorts</div><div class="s-val"><span class="up">${crowdedL}</span> / <span class="down">${crowdedS}</span></div><div class="s-sub">52w COT index ≥ 80 / ≤ 20</div></div>
      <div class="stat"><div class="s-label">3-year record positions</div><div class="s-val" style="font-size:14px">${recL.length ? recL.map((i) => `<span class="up">${esc(i.short)}</span>`).join(', ') : '—'}${recS.length ? (recL.length ? ' · ' : '') + recS.map((i) => `<span class="down">${esc(i.short)}</span>`).join(', ') : ''}</div><div class="s-sub">${recL.length} record long · ${recS.length} record short</div></div>
      <div class="stat"><div class="s-label">Flipped this week</div><div class="s-val" style="font-size:14px">${flips.length ? flips.map((i) => `<span class="${i.nonComm.net > 0 ? 'up' : 'down'}">${esc(i.short)} → ${i.nonComm.net > 0 ? 'long' : 'short'}</span>`).join(', ') : 'none'}</div><div class="s-sub">speculator net crossed zero</div></div>
      <div class="stat"><div class="s-label">US dollar sentiment</div><div class="s-val" style="font-size:16px">${dxy ? `<span class="${cls(dxy.nonComm.net)}">DXY net ${fmtInt(dxy.nonComm.net, true)}</span>` : '—'}</div><div class="s-sub">specs short ${usdLongVs} of 7 G10 currencies vs USD</div></div>`;
    // heat of index52
    const sorted = items.slice().sort((a, b) => (b.index52 || 0) - (a.index52 || 0));
    $('#cotHeat').innerHTML = sorted.map((i) => { const v = i.index52; const t = v == null ? 0 : (v - 50) / 50; const bg = heatColor(t * 3, 3); return `<div class="hc" data-cot="${esc(i.code)}" style="background:${bg}" title="${esc(i.name)} · net ${fmtInt(i.nonComm.net, true)} · 3y index ${i.index156 == null ? '—' : i.index156.toFixed(0)}"><div class="t">${esc(i.short)}</div><div><div class="v">${v == null ? '—' : v.toFixed(0)}</div><div class="s">${fmtInt(i.nonComm.net, true)}</div></div></div>`; }).join('');
    // biggest shifts
    const shifts = items.map((i) => ({ ...i, shiftPct: i.openInterest ? (i.nonComm.change / i.openInterest) * 100 : null })).filter((i) => i.shiftPct != null).sort((a, b) => Math.abs(b.shiftPct) - Math.abs(a.shiftPct)).slice(0, 10);
    const mx = Math.max(0.1, ...shifts.map((i) => Math.abs(i.shiftPct)));
    $('#cotShifts').innerHTML = `<div class="sector-list">${shifts.map((i) => `<div class="sr" data-cot="${esc(i.code)}" style="cursor:pointer"><span style="font-weight:700;color:var(--gold-2)">${esc(i.short)}</span><div class="b"><i class="${i.shiftPct < 0 ? 'neg' : ''}" style="width:${(Math.abs(i.shiftPct) / mx) * 100}%"></i></div><span class="n ${cls(i.shiftPct)}">${fmtPct(i.shiftPct, 1)}</span><span class="n ${cls(i.nonComm.change)}">${fmtInt(i.nonComm.change, true)}</span></div>`).join('')}</div>`;
    // full board table
    const rows = items.map((i) => ({ ...i, symbol: i.code, net: i.nonComm.net, chg: i.nonComm.change, chg4: i.nonComm.change4w, pctOI: i.nonComm.pctOI, commNet: i.comm.net, oi: i.openInterest }));
    const cols = [
      { key: 'group', label: 'Group', render: (r) => `<span class="muted">${r.icon} ${esc(r.group)}</span>` },
      { key: 'short', label: 'Market', render: (r) => `<span class="twoline"><span class="sym">${esc(r.short)}</span><small>${esc(r.name)} ${cotFlags(r)}</small></span>`, sortVal: (r) => r.short },
      { key: 'oi', label: 'Open int.', r: true, render: (r) => `<span class="num">${fmtInt(r.oi)}</span><br><small class="num ${cls(r.oiChange)}">${fmtInt(r.oiChange, true)}</small>` },
      { key: 'net', label: 'Spec net', r: true, render: (r) => `<span class="num ${cls(r.net)}" style="font-weight:700">${fmtInt(r.net, true)}</span>` },
      { key: 'chg', label: '1w Δ', r: true, render: (r) => `<span class="num ${cls(r.chg)}">${fmtInt(r.chg, true)}</span>` },
      { key: 'chg4', label: '4w Δ', r: true, render: (r) => `<span class="num ${cls(r.chg4)}">${fmtInt(r.chg4, true)}</span>` },
      { key: 'pctOI', label: 'Net % OI', r: true, render: (r) => `<span class="chip ${cls(r.pctOI)}">${fmtPct(r.pctOI, 1)}</span>` },
      { key: 'commNet', label: 'Comm. net', r: true, render: (r) => `<span class="num ${cls(r.commNet)}">${fmtInt(r.commNet, true)}</span>` },
      { key: 'index52', label: 'Idx 52w', r: true, render: (r) => idxChip(r.index52) },
      { key: 'index156', label: 'Idx 3y', r: true, render: (r) => idxChip(r.index156) },
      { key: 'z52', label: 'z (52w)', r: true, render: (r) => `<span class="num ${r.z52 != null && Math.abs(r.z52) >= 2 ? (r.z52 > 0 ? 'up' : 'down') : 'muted'}">${r.z52 == null ? '—' : (r.z52 > 0 ? '+' : '') + r.z52.toFixed(2)}</span>` },
      { key: 'spark', label: '52w net', render: (r) => sparkHTML(r.spark, 0), sortVal: (r) => r.index52 },
    ];
    state.sort.cotBoardTbl = state.sort.cotBoardTbl || { key: 'index52', dir: -1 };
    $('#cotBoardTbl').innerHTML = quoteTable('cotBoardTbl', rows, cols, { maxH: 640, rowClass: (r) => (r.code === state.cot.code ? 'cot-sel' : '') });
    const tbl = $('#cotBoardTbl');
    tbl.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]'); if (th) { const cur = state.sort.cotBoardTbl; state.sort.cotBoardTbl = { key: th.dataset.sort, dir: cur.key === th.dataset.sort ? -cur.dir : -1 }; renderCotBoard(); return; }
      const tr = e.target.closest('tr[data-sym]'); if (tr) { selectCot(tr.dataset.sym); $('#cotTitle').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    drawSparks(tbl);
  }
  function renderCotList() {
    const d = state.cot.board; if (!d) return;
    const f = state.cot.filter;
    $('#cotList').innerHTML = d.groups.map((g) => {
      const its = g.codes.map((c) => d.items.find((i) => i.code === c)).filter(Boolean).filter((i) => !f || (i.name + ' ' + i.short + ' ' + g.name).toLowerCase().includes(f));
      if (!its.length) return '';
      return `<div class="cot-group">${g.icon} ${esc(g.name)}</div>` + its.map((i) => `<div class="cot-item ${i.code === state.cot.code ? 'active' : ''}" data-code="${esc(i.code)}"><div class="nm">${esc(i.name)}<small>${esc(i.short)} · OI ${fmtInt(i.openInterest)}</small></div><div class="net ${cls(i.nonComm.net)}">${fmtInt(i.nonComm.net, true)}<small class="${cls(i.nonComm.change)}">${fmtInt(i.nonComm.change, true)}</small></div><div class="gauge" title="52w COT index ${i.index52 == null ? '—' : i.index52.toFixed(0)}"><i style="left:${i.index52 == null ? 50 : i.index52}%"></i></div></div>`).join('');
    }).join('');
  }
  function selectCot(code) {
    if (!code || code === state.cot.code) return;
    state.cot.code = code; localStorage.setItem('hgm.cotCode', code);
    renderCotList();
    $$('#cotBoardTbl tr[data-sym]').forEach((tr) => tr.classList.toggle('cot-sel', tr.dataset.sym === code));
    loadCotDetail();
  }
  async function loadCotDetail() {
    const key = `${state.cot.code}:${state.cot.years}`;
    $('#cotTitle').textContent = 'Loading…';
    let d;
    try { d = await api('/api/cot/detail', { code: state.cot.code, years: state.cot.years }); } catch (e) { $('#cotTitle').textContent = 'Could not load ' + state.cot.code; $('#cotSub').textContent = e.message; return; }
    if (key !== `${state.cot.code}:${state.cot.years}`) return; // superseded
    state.cot.detail = d; state.cot.detailKey = key;
    const m = d.market, L = d.latest;
    $('#cotTitle').innerHTML = `${esc(m.name)} <span class="muted" style="font-weight:400;font-size:12px">· ${esc(m.fullName)}</span>`;
    $('#cotSub').textContent = `Contract ${m.unit || ''} · CFTC code ${m.code} · report ${d.reportDate}${d.stale ? ' · STALE' : ''}`;
    $('#cotOpenChart').hidden = !m.yahoo;
    const idxTone = (v) => (v == null ? '' : v >= 80 ? 'up' : v <= 20 ? 'down' : '');
    $('#cotDetailKpis').innerHTML = `
      <div class="stat gold"><div class="s-label">Speculator net</div><div class="s-val ${cls(L.nonComm.net)}">${fmtInt(L.nonComm.net, true)}</div><div class="s-sub"><span class="${cls(L.nonComm.change)}">${fmtInt(L.nonComm.change, true)}</span> w/w · ${fmtPct(L.nonComm.pctOI, 1)} of OI</div></div>
      <div class="stat"><div class="s-label">Commercial net</div><div class="s-val ${cls(L.comm.net)}">${fmtInt(L.comm.net, true)}</div><div class="s-sub"><span class="${cls(L.comm.change)}">${fmtInt(L.comm.change, true)}</span> w/w · ${fmtPct(L.comm.pctOI, 1)} of OI</div></div>
      <div class="stat"><div class="s-label">Small traders net</div><div class="s-val ${cls(L.nonRept.net)}">${fmtInt(L.nonRept.net, true)}</div><div class="s-sub"><span class="${cls(L.nonRept.change)}">${fmtInt(L.nonRept.change, true)}</span> w/w</div></div>
      <div class="stat"><div class="s-label">Open interest</div><div class="s-val">${fmtInt(L.openInterest)}</div><div class="s-sub"><span class="${cls(L.oiChange)}">${fmtInt(L.oiChange, true)}</span> w/w</div></div>
      <div class="stat"><div class="s-label">COT index 26w / 52w / 3y</div><div class="s-val" style="font-size:16px"><span class="${idxTone(L.index26)}">${L.index26 == null ? '—' : L.index26.toFixed(0)}</span> / <span class="${idxTone(L.index52)}">${L.index52 == null ? '—' : L.index52.toFixed(0)}</span> / <span class="${idxTone(L.index156)}">${L.index156 == null ? '—' : L.index156.toFixed(0)}</span></div><div class="s-sub">z-score (52w) ${L.z52 == null ? '—' : (L.z52 > 0 ? '+' : '') + L.z52.toFixed(2)}${L.z52 != null && Math.abs(L.z52) >= 2 ? ' · <b>extreme</b>' : ''}</div></div>
      ${d.price ? `<div class="stat"><div class="s-label">${esc(d.price.symbol)}${d.price.inverted ? ' (USD per unit)' : ''}</div><div class="s-val" style="font-size:16px">${HGChart.fmtNum(d.price.last)}</div><div class="s-sub">price overlay · weekly</div></div>` : ''}`;
    renderCotChart();
    renderCotTables();
  }
  function renderCotChart() {
    const d = state.cot.detail; if (!d) return;
    const v = state.cot.view;
    const price = d.price ? { label: d.price.symbol + (d.price.inverted ? ' (inv.)' : ''), values: d.price.series, color: '#d4af37' } : null;
    let series, note;
    if (v === 'ls') {
      series = [{ label: 'Spec long', values: d.nonComm.long, color: '#22c55e', width: 1.6 }, { label: 'Spec short', values: d.nonComm.short, color: '#ef4444', width: 1.6 }, { label: 'Comm long', values: d.comm.long, color: '#3b82f6', dash: true, width: 1.2 }, { label: 'Comm short', values: d.comm.short, color: '#f97316', dash: true, width: 1.2 }];
      note = 'Gross long and short contracts by group. Commercials (hedgers) typically sit opposite speculators.';
    } else if (v === 'cat' && d.categories) {
      const pal = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#8b9bb4'];
      // align category series to legacy dates via date map
      const map = new Map(d.categories.dates.map((dt, i) => [dt, i]));
      series = d.categories.rows.map((r, k) => ({ label: r.label.split(' /')[0].split(' (')[0], values: d.dates.map((dt) => (map.has(dt) ? r.series[map.get(dt)] : null)), color: pal[k % pal.length], width: k === (d.categories.type === 'tff' ? 2 : 2) ? 2.2 : 1.4 }));
      note = d.categories.type === 'tff' ? 'Traders in Financial Futures report: net positions by dealer, asset manager, leveraged fund, other reportable and small traders.' : 'Disaggregated report: net positions by producer/merchant, swap dealer, managed money, other reportable and small traders.';
    } else {
      series = [{ label: 'Speculators (non-commercial) net', values: d.nonComm.net, color: '#3b82f6', width: 2.2, fill: true }, { label: 'Commercials net', values: d.comm.net, color: '#ef4444', width: 1.4, dash: true }, { label: 'Small traders net', values: d.nonRept.net, color: '#8b9bb4', width: 1, dash: true }];
      note = 'Net = long − short contracts. Blue area is the classic "large speculator" positioning line; the purple strip below is the 52-week COT index (≥80 crowded long, ≤20 crowded short).';
    }
    HGChart.cotChart($('#cotCanvas'), { dates: d.dates, series, price, index: v === 'cat' ? null : { values: d.nonComm.index52, label: '52w COT index (speculators)', color: '#a855f7' } });
    $('#cotChartNote').textContent = note + (price ? ` Gold line = ${d.price.symbol}${d.price.inverted ? ' inverted to USD per unit so it moves with the futures' : ''} (right axis).` : '');
    // OI mini chart
    HGChart.cotChart($('#cotOiCanvas'), { dates: d.dates, series: [{ label: 'Open interest', values: d.openInterest, color: '#06b6d4', width: 1.6, fill: true }], price, index: null });
  }
  function renderCotTables() {
    const d = state.cot.detail; const L = d.latest; const oi = L.openInterest || 1;
    $('#cotTblDate').textContent = `Tue ${d.reportDate}`;
    const grp = (label, g, sub) => `<tr><td><span class="twoline"><b>${label}</b><small>${sub}</small></span></td><td class="r num up">${fmtInt(g.long)}<br><small class="${cls(g.longChg)}">${fmtInt(g.longChg, true)}</small></td><td class="r num down">${fmtInt(g.short)}<br><small class="${cls(g.shortChg)}">${fmtInt(g.shortChg, true)}</small></td><td class="r"><span class="num ${cls(g.net)}" style="font-weight:700">${fmtInt(g.net, true)}</span><br><small class="${cls(g.change)}">${fmtInt(g.change, true)}</small></td><td><div class="pos-bar" title="long ${fmtPct(g.longPctOI, 1)} · short ${fmtPct(g.shortPctOI, 1)} of OI"><i class="l" style="width:${Math.min(100, (g.long / oi) * 50)}%"></i><i class="s" style="width:${Math.min(100, (g.short / oi) * 50)}%"></i></div><small class="muted num">${fmtPct(g.longPctOI, 1)} / ${fmtPct(g.shortPctOI, 1)}</small></td></tr>`;
    $('#cotTbl').innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Group</th><th class="r">Long</th><th class="r">Short</th><th class="r">Net</th><th>Long / short % OI</th></tr></thead><tbody>
      ${grp('Non-commercial', L.nonComm, 'large speculators · funds')}
      ${grp('Commercial', L.comm, 'hedgers · producers · dealers')}
      ${grp('Non-reportable', L.nonRept, 'small traders')}
      <tr><td><b>Open interest</b><br><small class="muted">spreading (non-comm): ${fmtInt(L.nonComm.spread)}</small></td><td class="r num" colspan="2">${fmtInt(L.openInterest)}</td><td class="r num ${cls(L.oiChange)}">${fmtInt(L.oiChange, true)}</td><td></td></tr>
    </tbody></table></div>`;
    const c = d.categories;
    if (!c) { $('#cotCatTitle').textContent = 'Trader categories'; $('#cotCatSub').textContent = ''; $('#cotCatTbl').innerHTML = '<div class="empty">No TFF / disaggregated breakdown available for this market.</div>'; $('#cotCatNote').textContent = ''; return; }
    $('#cotCatTitle').textContent = c.type === 'tff' ? 'Traders in Financial Futures' : 'Disaggregated report';
    $('#cotCatSub').textContent = `Tue ${c.reportDate} · OI ${fmtInt(c.openInterest)}`;
    $('#cotCatTbl').innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Category</th><th class="r">Long</th><th class="r">Short</th><th class="r">Net</th><th class="r">Net % OI</th><th class="r">Idx 52w</th></tr></thead><tbody>${c.rows.map((r) => `<tr><td><b>${esc(r.label)}</b></td><td class="r num up">${fmtInt(r.long)}<br><small class="${cls(r.longChg)}">${r.longChg == null ? '' : fmtInt(r.longChg, true)}</small></td><td class="r num down">${fmtInt(r.short)}<br><small class="${cls(r.shortChg)}">${r.shortChg == null ? '' : fmtInt(r.shortChg, true)}</small></td><td class="r num ${cls(r.net)}" style="font-weight:700">${fmtInt(r.net, true)}</td><td class="r"><span class="chip ${cls(r.pctOI)}">${fmtPct(r.pctOI, 1)}</span></td><td class="r">${idxChip(r.index52)}</td></tr>`).join('')}</tbody></table></div>`;
    $('#cotCatNote').textContent = c.type === 'tff' ? 'Leveraged funds ≈ hedge funds / CTAs; asset managers ≈ pension funds, insurers, mutual funds; dealers are the sell side.' : 'Managed money ≈ hedge funds / CTAs; producer/merchant = physical hedgers; swap dealers intermediate index and OTC flows.';
  }

  /* ================================================================== */
  /* Modal chart                                                         */
  /* ================================================================== */
  async function openModal(symbol) {
    if (!symbol) return;
    state.modal.symbol = symbol;
    const m = $('#modal'); m.hidden = false; document.body.style.overflow = 'hidden';
    $('#mName').textContent = isFX(symbol) ? fxLabel(symbol) : symbol;
    $('#mSub').textContent = 'Loading…'; $('#mPrice').textContent = '—'; $('#mDelta').textContent = ''; $('#mStats').innerHTML = ''; $('#mPeriod').textContent = '';
    $('#mWatch').textContent = inWatch(symbol) ? '★ In watchlist' : '☆ Watchlist';
    $$('#mRange button').forEach((b) => b.classList.toggle('active', b.dataset.r === state.modal.range));
    $$('#mType button').forEach((b) => b.classList.toggle('active', b.dataset.t === state.modal.type));
    await loadModalChart();
  }
  async function loadModalChart() {
    const symbol = state.modal.symbol; if (!symbol) return;
    const range = state.modal.range;
    try {
      const [ch, qd] = await Promise.all([api('/api/chart', { symbol, range }), state.quotes.get(symbol) ? Promise.resolve({ quotes: [state.quotes.get(symbol)] }) : api('/api/quotes', { symbols: symbol }).catch(() => ({ quotes: [] }))]);
      if (state.modal.symbol !== symbol || state.modal.range !== range) return;
      const q = qd.quotes[0] || {};
      if (q.symbol) state.quotes.set(q.symbol, q);
      state.modal.chart = ch; state.modal.quote = q;
      const price = ch.price != null ? ch.price : ch.c[ch.c.length - 1];
      const base = range === '1d' ? ch.prevClose || ch.chartPrevClose : ch.chartPrevClose || ch.c[0];
      const chg = base ? price - base : null, pct = base ? (price / base - 1) * 100 : null;
      const fakeQ = { symbol, type: ch.type, price };
      $('#mName').textContent = `${isFX(symbol) ? fxLabel(symbol) : symbol} · ${INDEX_NAMES[symbol] || ch.name}`;
      $('#mSub').textContent = `${ch.exchange || ''} · ${ch.currency || ''} · ${ch.type || ''} · ${(q.marketState || ch.marketState || '').toUpperCase()} · last ${fmtClock(ch.marketTime, ch.tz)} (${ch.tz || 'local'})`;
      $('#mPrice').textContent = fmtPrice(fakeQ, price);
      $('#mDelta').className = 'm-delta num ' + cls(chg);
      $('#mDelta').textContent = `${chg != null ? (chg > 0 ? '+' : '') + chg.toLocaleString('en-US', { maximumFractionDigits: digitsFor(symbol, price, ch.type) }) : '—'} (${fmtPct(pct)}) ${range === '1d' ? 'today' : 'over ' + range.toUpperCase()}`;
      $('#mPeriod').textContent = ch.t.length ? `${new Date(ch.t[0] * 1000).toLocaleDateString('en-GB')} → ${new Date(ch.t[ch.t.length - 1] * 1000).toLocaleDateString('en-GB')} · ${ch.t.length} bars (${ch.interval})` : '';
      const digits = digitsFor(symbol, price, ch.type);
      HGChart.priceChart($('#mCanvas'), ch, { type: state.modal.type, base, range, tz: ch.tz, currency: ch.currency, digits });
      const hi = Math.max(...ch.h.filter((x) => x != null)), lo = Math.min(...ch.l.filter((x) => x != null));
      const vol = ch.v.reduce((a, b) => a + (b || 0), 0);
      const prevClose = q.prevClose != null ? q.prevClose : range === '1d' ? ch.prevClose : null;
      const stats = [[range === '1d' ? 'Open' : 'Period open', ch.o[0]], [range === '1d' ? 'Day high' : 'Period high', hi], [range === '1d' ? 'Day low' : 'Period low', lo], ['Prev close', prevClose], [range === '1d' ? 'Day change' : `${range.toUpperCase()} change`, fmtPct(pct)], ['52w high', q.wk52High], ['52w low', q.wk52Low], ['Volume', vol ? compact(vol) : null], ['Currency', ch.currency], ['Exchange', ch.exchange]];
      $('#mStats').innerHTML = stats.map(([k, v]) => `<div class="ms"><small>${k}</small><b>${typeof v === 'number' ? fmtPrice(fakeQ, v) : v || '—'}</b></div>`).join('');
    } catch (e) {
      $('#mSub').textContent = 'Chart unavailable: ' + e.message;
    }
  }
  function closeModal() { $('#modal').hidden = true; document.body.style.overflow = ''; state.modal.symbol = null; }
  $('#modal').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
  $('#mRange').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.modal.range = b.dataset.r; $$('#mRange button').forEach((x) => x.classList.toggle('active', x === b)); loadModalChart(); });
  $('#mType').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.modal.type = b.dataset.t; $$('#mType button').forEach((x) => x.classList.toggle('active', x === b)); if (state.modal.chart) loadModalChart(); });
  $('#mWatch').addEventListener('click', () => toggleWatch(state.modal.symbol));
  $('#mAlert').addEventListener('click', () => openAlertDlg(state.modal.symbol));
  $('#mAddPos').addEventListener('click', () => openPosDlg(null, state.modal.symbol));

  /* ================================================================== */
  /* Ticker tape, clocks, search, theme, keyboard                        */
  /* ================================================================== */
  async function loadTape() {
    try {
      const d = await getQuotes(TAPE);
      const items = d.quotes.map((q) => `<span class="tp" data-sym="${esc(q.symbol)}"><span class="s">${esc(isFX(q.symbol) ? fxLabel(q.symbol) : INDEX_NAMES[q.symbol] || q.symbol)}</span><span class="p">${fmtPrice(q)}</span><span class="d ${cls(q.changePct)}">${q.changePct > 0 ? '▲' : q.changePct < 0 ? '▼' : '•'} ${fmtPct(q.changePct)}</span></span>`).join('');
      $('#tapeTrack').innerHTML = items + items;
    } catch { /* ignore */ }
  }
  $('#tapeTrack').addEventListener('click', (e) => { const t = e.target.closest('.tp'); if (t) openModal(t.dataset.sym); });

  function renderClocks() {
    const now = new Date();
    $('#clocks').innerHTML = CLOCKS.map((c) => {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: c.tz, hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(now);
      const get = (t) => (parts.find((p) => p.type === t) || {}).value;
      const hh = +get('hour') % 24, mm = +get('minute'), wd = get('weekday');
      const mins = hh * 60 + mm;
      const open = !['Sat', 'Sun'].includes(wd) && mins >= c.open && mins < c.close;
      return `<div class="clock" title="${c.name} · exchange ${open ? 'open' : 'closed'}"><span class="c-name"><span class="st ${open ? 'open' : ''}"></span>${c.code}</span><span class="c-time">${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}</span></div>`;
    }).join('');
  }

  // Search
  let searchTimer, searchIdx = -1, searchItems = [];
  const sInput = $('#globalSearch'), sRes = $('#searchResults');
  function renderSearch() {
    if (!searchItems.length) { sRes.innerHTML = '<div class="empty">No matches</div>'; return; }
    sRes.innerHTML = searchItems.map((r, i) => `<div class="sr ${i === searchIdx ? 'active' : ''}" data-sym="${esc(r.symbol)}"><b>${esc(r.symbol)}</b><span>${esc(r.name)}</span><small>${esc(r.exchange || '')} · ${esc(r.type || '')}</small></div>`).join('');
  }
  sInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = sInput.value.trim();
    if (!q) { sRes.hidden = true; return; }
    searchTimer = setTimeout(async () => {
      try { const d = await api('/api/search', { q }); searchItems = d.quotes; searchIdx = -1; sRes.hidden = false; renderSearch(); } catch { sRes.hidden = false; sRes.innerHTML = '<div class="empty">Search unavailable</div>'; }
    }, 220);
  });
  sInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { searchIdx = Math.min(searchItems.length - 1, searchIdx + 1); renderSearch(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { searchIdx = Math.max(0, searchIdx - 1); renderSearch(); e.preventDefault(); }
    else if (e.key === 'Enter') { const it = searchItems[searchIdx >= 0 ? searchIdx : 0]; if (it) { openModal(it.symbol); sRes.hidden = true; sInput.blur(); } }
    else if (e.key === 'Escape') { sRes.hidden = true; sInput.blur(); }
  });
  sRes.addEventListener('mousedown', (e) => { const it = e.target.closest('.sr'); if (it) { openModal(it.dataset.sym); sRes.hidden = true; } });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) sRes.hidden = true; });

  // Theme
  const savedTheme = localStorage.getItem('hgm.theme');
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $('#themeToggle').addEventListener('click', () => { const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = t; localStorage.setItem('hgm.theme', t); setTimeout(() => { HGChart.redrawAll(); drawSparks(); }, 30); });

  // Tabs + keyboard
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) switchTab(b.dataset.tab); });
  window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (TABS.includes(t) && t !== state.tab) switchTab(t); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#alertDlg').hidden) { $('#alertDlg').hidden = true; return; }
      if (!$('#posDlg').hidden) { $('#posDlg').hidden = true; return; }
    }
    if (e.target.matches('input,select,textarea')) return;
    if (e.key === '/') { e.preventDefault(); sInput.focus(); }
    else if (e.key === 'Escape') closeModal();
    else if (/^[1-8]$/.test(e.key)) switchTab(TABS[+e.key - 1]);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.tab) loaders[state.tab]().catch(() => {}); });

  /* ================================================================== */
  /* Boot                                                                */
  /* ================================================================== */
  renderClocks(); setInterval(renderClocks, 15000);
  updateBell(); setInterval(pollAlerts, 10000); setTimeout(pollAlerts, 2500);
  loadTape(); setInterval(() => { if (!document.hidden) loadTape(); }, 20000);
  setInterval(() => { if (state.tab === 'forex' && $('#fxSessions')) renderSessions(); }, 60000);
  switchTab(TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'forex');
})();
