/* Harrington Global Markets — minimal dependency-free canvas charts
 * Exposes window.HGChart with:
 *   sparkline(canvas, values, {base, color})
 *   priceChart(canvas, series, opts)      – area/line or candles with axes, crosshair, tooltip
 *   compareChart(canvas, [{label,t,c,color}], opts) – normalised % comparison
 */
(function () {
  'use strict';

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const theme = () => ({
    up: css('--up') || '#22c55e',
    down: css('--down') || '#ef4444',
    text: css('--muted') || '#8b9bb4',
    grid: css('--line') || '#22304a',
    gold: css('--gold') || '#d4af37',
    panel: css('--panel') || '#121923',
    fg: css('--text') || '#e6edf6',
  });

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(10, Math.round(rect.width || canvas.clientWidth || canvas.width));
    const h = Math.max(10, Math.round(rect.height || canvas.clientHeight || canvas.height));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function hexToRgba(hex, a) {
    if (!hex) return `rgba(0,0,0,${a})`;
    if (hex.startsWith('rgb')) return hex.replace(/rgba?\(([^)]+)\)/, (_, inner) => `rgba(${inner.split(',').slice(0, 3).join(',')},${a})`);
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  /* ------------------------------------------------------------------ */
  function sparkline(canvas, values, opts = {}) {
    const vals = (values || []).filter((v) => v != null && isFinite(v));
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    if (vals.length < 2) {
      ctx.strokeStyle = theme().grid;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      return;
    }
    const t = theme();
    const base = opts.base != null ? opts.base : vals[0];
    let min = Math.min(...vals, base), max = Math.max(...vals, base);
    if (max === min) { max += 1; min -= 1; }
    const pad = 2;
    const x = (i) => pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = (v) => pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
    const color = opts.color || (vals[vals.length - 1] >= base ? t.up : t.down);
    // baseline
    if (opts.base != null && opts.showBase !== false) {
      ctx.strokeStyle = hexToRgba(t.text, 0.35); ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y(base)); ctx.lineTo(w, y(base)); ctx.stroke(); ctx.setLineDash([]);
    }
    // fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, hexToRgba(color, 0.35)); grad.addColorStop(1, hexToRgba(color, 0.02));
    ctx.beginPath(); ctx.moveTo(x(0), y(vals[0]));
    for (let i = 1; i < vals.length; i++) ctx.lineTo(x(i), y(vals[i]));
    ctx.lineTo(x(vals.length - 1), h); ctx.lineTo(x(0), h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    // line
    ctx.beginPath(); ctx.moveTo(x(0), y(vals[0]));
    for (let i = 1; i < vals.length; i++) ctx.lineTo(x(i), y(vals[i]));
    ctx.strokeStyle = color; ctx.lineWidth = opts.lineWidth || 1.5; ctx.lineJoin = 'round'; ctx.stroke();
    // end dot
    ctx.beginPath(); ctx.arc(x(vals.length - 1), y(vals[vals.length - 1]), 2, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  }

  /* ------------------------------------------------------------------ */
  function niceStep(range, target) {
    const raw = range / Math.max(1, target);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return step * mag;
  }
  function fmtNum(v, digits) {
    if (v == null || !isFinite(v)) return '—';
    const d = digits != null ? digits : Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 100 ? 2 : Math.abs(v) >= 1 ? 2 : 4;
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtTime(ts, range, tz) {
    const d = new Date(ts * 1000);
    const o = { timeZone: tz || undefined };
    if (range === '1d') return d.toLocaleTimeString('en-GB', { ...o, hour: '2-digit', minute: '2-digit' });
    if (range === '5d') return d.toLocaleString('en-GB', { ...o, weekday: 'short', hour: '2-digit', minute: '2-digit' });
    if (range === '1mo') return d.toLocaleDateString('en-GB', { ...o, day: '2-digit', month: 'short' });
    if (range === '5y' || range === 'max' || range === '2y') return d.toLocaleDateString('en-GB', { ...o, month: 'short', year: 'numeric' });
    return d.toLocaleDateString('en-GB', { ...o, day: '2-digit', month: 'short', year: '2-digit' });
  }
  function fmtTimeFull(ts, range, tz) {
    const d = new Date(ts * 1000);
    const o = { timeZone: tz || undefined };
    if (range === '1d' || range === '5d' || range === '1mo') return d.toLocaleString('en-GB', { ...o, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-GB', { ...o, day: '2-digit', month: 'short', year: 'numeric' });
  }

  const charts = new WeakMap();

  /**
   * priceChart(canvas, data, opts)
   * data: { t:[], o:[], h:[], l:[], c:[], v:[] }
   * opts: { type:'area'|'candle', base, range, tz, currency, digits, onHover }
   */
  function priceChart(canvas, data, opts = {}) {
    const state = charts.get(canvas) || {};
    state.data = data; state.opts = opts;
    charts.set(canvas, state);
    if (!state.bound) {
      state.bound = true;
      canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); state.mx = e.clientX - r.left; state.my = e.clientY - r.top; draw(canvas); });
      canvas.addEventListener('mouseleave', () => { state.mx = null; draw(canvas); if (state.opts.onHover) state.opts.onHover(null); });
      canvas.addEventListener('touchmove', (e) => { const t0 = e.touches[0]; const r = canvas.getBoundingClientRect(); state.mx = t0.clientX - r.left; state.my = t0.clientY - r.top; draw(canvas); }, { passive: true });
    }
    draw(canvas);
  }

  function draw(canvas) {
    const state = charts.get(canvas);
    if (!state || !state.data) return;
    const { data, opts } = state;
    const th = theme();
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const n = data.c.length;
    const padL = 8, padR = 76, padT = 14, padB = 26;
    const volH = opts.type === 'candle' && data.v && data.v.some((x) => x) ? 46 : 0;
    const cw = w - padL - padR, ch = h - padT - padB - volH;
    if (n < 2) {
      ctx.fillStyle = th.text; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(n === 1 ? 'Only one data point available for this range' : 'No data available', w / 2, h / 2);
      return;
    }
    const useOHLC = opts.type === 'candle' && data.h && data.l;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < n; i++) {
      const lo = useOHLC && data.l[i] != null ? data.l[i] : data.c[i];
      const hi = useOHLC && data.h[i] != null ? data.h[i] : data.c[i];
      if (lo < min) min = lo; if (hi > max) max = hi;
    }
    if (opts.base != null && isFinite(opts.base)) { min = Math.min(min, opts.base); max = Math.max(max, opts.base); }
    if (max === min) { max += 1; min -= 1; }
    const span = max - min; min -= span * 0.05; max += span * 0.05;
    const x = (i) => padL + (i / (n - 1)) * cw;
    const y = (v) => padT + (1 - (v - min) / (max - min)) * ch;

    // grid + y labels
    const step = niceStep(max - min, 6);
    ctx.font = '11px ' + (css('--mono') || 'monospace'); ctx.textBaseline = 'middle';
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      const yy = y(v);
      ctx.strokeStyle = hexToRgba(th.grid, 0.8); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
      ctx.fillStyle = th.text; ctx.textAlign = 'left'; ctx.fillText(fmtNum(v, opts.digits), w - padR + 8, yy);
    }
    // x labels
    const labels = Math.max(2, Math.floor(cw / 110));
    ctx.textAlign = 'center'; ctx.fillStyle = th.text;
    for (let k = 0; k < labels; k++) {
      const i = Math.round((k / (labels - 1)) * (n - 1));
      ctx.fillText(fmtTime(data.t[i], opts.range, opts.tz), x(i), h - padB / 2);
    }
    const last = data.c[n - 1];
    const base = opts.base != null && isFinite(opts.base) ? opts.base : data.c[0];
    const color = last >= base ? th.up : th.down;

    if (!useOHLC) {
      // area
      const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
      grad.addColorStop(0, hexToRgba(color, 0.38)); grad.addColorStop(1, hexToRgba(color, 0.02));
      ctx.beginPath(); ctx.moveTo(x(0), y(data.c[0]));
      for (let i = 1; i < n; i++) ctx.lineTo(x(i), y(data.c[i]));
      ctx.lineTo(x(n - 1), padT + ch); ctx.lineTo(x(0), padT + ch); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x(0), y(data.c[0]));
      for (let i = 1; i < n; i++) ctx.lineTo(x(i), y(data.c[i]));
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
    } else {
      const bw = Math.max(1.5, Math.min(14, (cw / n) * 0.7));
      // volume
      if (volH) {
        const vmax = Math.max(...data.v.map((v) => v || 0)) || 1;
        for (let i = 0; i < n; i++) {
          const v = data.v[i] || 0; const up = data.c[i] >= (data.o[i] != null ? data.o[i] : data.c[i]);
          ctx.fillStyle = hexToRgba(up ? th.up : th.down, 0.35);
          const vh = (v / vmax) * (volH - 6);
          ctx.fillRect(x(i) - bw / 2, padT + ch + (volH - vh), bw, vh);
        }
      }
      for (let i = 0; i < n; i++) {
        const o = data.o[i] != null ? data.o[i] : data.c[i], c = data.c[i], hi = data.h[i] != null ? data.h[i] : Math.max(o, c), lo = data.l[i] != null ? data.l[i] : Math.min(o, c);
        const up = c >= o; const col = up ? th.up : th.down;
        ctx.strokeStyle = col; ctx.fillStyle = up ? hexToRgba(col, 0.9) : col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x(i), y(hi)); ctx.lineTo(x(i), y(lo)); ctx.stroke();
        const top = y(Math.max(o, c)), bot = y(Math.min(o, c));
        ctx.fillRect(x(i) - bw / 2, top, bw, Math.max(1, bot - top));
      }
    }
    // base line
    if (opts.base != null && isFinite(opts.base)) {
      ctx.strokeStyle = hexToRgba(th.gold, 0.7); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y(base)); ctx.lineTo(w - padR, y(base)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = th.gold; ctx.textAlign = 'left'; ctx.font = '10px ' + (css('--mono') || 'monospace');
      const prevTxt = fmtNum(base, opts.digits);
      ctx.fillText(ctx.measureText('prev ' + prevTxt).width <= padR - 10 ? 'prev ' + prevTxt : prevTxt, w - padR + 8, y(base) - 9);
    }
    // last price tag
    const ly = y(last);
    ctx.fillStyle = color; ctx.fillRect(w - padR + 2, ly - 9, padR - 4, 18);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = 'bold 11px ' + (css('--mono') || 'monospace');
    ctx.fillText(fmtNum(last, opts.digits), w - padR + 8, ly);

    // crosshair
    if (state.mx != null && state.mx >= padL && state.mx <= w - padR) {
      const i = Math.round(((state.mx - padL) / cw) * (n - 1));
      const xi = x(i), yi = y(data.c[i]);
      ctx.strokeStyle = hexToRgba(th.fg, 0.35); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xi, padT); ctx.lineTo(xi, padT + ch + volH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, yi); ctx.lineTo(w - padR, yi); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(xi, yi, 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = th.panel; ctx.lineWidth = 2; ctx.stroke();
      // tooltip box
      const lines = [fmtTimeFull(data.t[i], opts.range, opts.tz)];
      if (useOHLC) lines.push(`O ${fmtNum(data.o[i], opts.digits)}  H ${fmtNum(data.h[i], opts.digits)}`, `L ${fmtNum(data.l[i], opts.digits)}  C ${fmtNum(data.c[i], opts.digits)}`);
      else lines.push(`${opts.currency ? opts.currency + ' ' : ''}${fmtNum(data.c[i], opts.digits)}`);
      const chg = (data.c[i] / base - 1) * 100;
      lines.push(`${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% vs base`);
      if (data.v && data.v[i]) lines.push(`Vol ${Intl.NumberFormat('en', { notation: 'compact' }).format(data.v[i])}`);
      ctx.font = '11px ' + (css('--mono') || 'monospace');
      const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16, thh = lines.length * 15 + 10;
      let tx = xi + 12; if (tx + tw > w - padR) tx = xi - tw - 12; let ty = padT + 6;
      ctx.fillStyle = hexToRgba(th.panel, 0.95); ctx.strokeStyle = th.grid;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx, ty, tw, thh, 6) : ctx.rect(tx, ty, tw, thh); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      lines.forEach((l, k) => { ctx.fillStyle = k === 0 ? th.text : k === lines.length - (data.v && data.v[i] ? 2 : 1) ? (chg >= 0 ? th.up : th.down) : th.fg; ctx.fillText(l, tx + 8, ty + 6 + k * 15); });
      if (opts.onHover) opts.onHover({ i, t: data.t[i], c: data.c[i] });
    }
  }

  /* ------------------------------------------------------------------ */
  /** compareChart(canvas, series:[{label,t,c,color}], {range, tz}) — normalised % change from first point */
  function compareChart(canvas, series, opts = {}) {
    const state = charts.get(canvas) || {};
    state.cmp = { series, opts };
    charts.set(canvas, state);
    if (!state.cmpBound) {
      state.cmpBound = true;
      canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); state.mx = e.clientX - r.left; drawCompare(canvas); });
      canvas.addEventListener('mouseleave', () => { state.mx = null; drawCompare(canvas); });
    }
    drawCompare(canvas);
  }
  function drawCompare(canvas) {
    const state = charts.get(canvas);
    if (!state || !state.cmp) return;
    const { series, opts } = state.cmp;
    const th = theme();
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const valid = series.filter((s) => s.c && s.c.length > 1);
    if (!valid.length) { ctx.fillStyle = th.text; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('No data', w / 2, h / 2); return; }
    // normalise each to % from base (or first)
    const norm = valid.map((s) => { const b = s.base || s.c[0]; return { ...s, p: s.c.map((v) => (v / b - 1) * 100) }; });
    const t0 = Math.min(...norm.map((s) => s.t[0])), t1 = Math.max(...norm.map((s) => s.t[s.t.length - 1]));
    let min = Math.min(0, ...norm.flatMap((s) => s.p)), max = Math.max(0, ...norm.flatMap((s) => s.p));
    if (max === min) { max += 1; min -= 1; }
    const span = max - min; min -= span * 0.06; max += span * 0.06;
    const padL = 8, padR = 96, padT = 12, padB = 24, cw = w - padL - padR, ch = h - padT - padB;
    const x = (t) => padL + ((t - t0) / Math.max(1, t1 - t0)) * cw;
    const y = (v) => padT + (1 - (v - min) / (max - min)) * ch;
    const step = niceStep(max - min, 6);
    ctx.font = '11px ' + (css('--mono') || 'monospace'); ctx.textBaseline = 'middle';
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      const yy = y(v);
      ctx.strokeStyle = Math.abs(v) < 1e-9 ? hexToRgba(th.text, 0.6) : hexToRgba(th.grid, 0.8); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
      ctx.fillStyle = th.text; ctx.textAlign = 'left'; ctx.fillText((v > 0 ? '+' : '') + v.toFixed(Math.abs(step) < 1 ? 1 : 0) + '%', w - padR + 8, yy);
    }
    const labels = Math.max(2, Math.floor(cw / 110));
    ctx.textAlign = 'center';
    for (let k = 0; k < labels; k++) { const t = t0 + (k / (labels - 1)) * (t1 - t0); ctx.fillText(fmtTime(t, opts.range, opts.tz), x(t), h - padB / 2); }
    norm.forEach((s) => {
      ctx.beginPath();
      s.t.forEach((t, i) => { if (i === 0) ctx.moveTo(x(t), y(s.p[i])); else ctx.lineTo(x(t), y(s.p[i])); });
      ctx.strokeStyle = s.color; ctx.lineWidth = s.emph ? 2.6 : 1.6; ctx.lineJoin = 'round';
      if (s.dash) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    });
    // end-of-line labels, de-overlapped (sorted by y, pushed apart by 12px) and drawn in the right gutter
    const tags = norm.map((s) => { const lastP = s.p[s.p.length - 1]; return { s, lastP, y: y(lastP) }; }).sort((a, b) => a.y - b.y);
    for (let i = 1; i < tags.length; i++) if (tags[i].y - tags[i - 1].y < 12) tags[i].y = tags[i - 1].y + 12;
    for (let i = tags.length - 2; i >= 0; i--) if (tags[i + 1].y - tags[i].y < 12) tags[i].y = tags[i + 1].y - 12;
    ctx.font = 'bold 10px ' + (css('--mono') || 'monospace'); ctx.textAlign = 'left';
    tags.forEach((l) => {
      const txt = `${l.s.label} ${l.lastP >= 0 ? '+' : ''}${l.lastP.toFixed(1)}%`;
      const tw = ctx.measureText(txt).width + 6;
      ctx.fillStyle = hexToRgba(th.panel, 0.92); ctx.fillRect(w - padR + 1, l.y - 6, Math.min(tw, padR - 2), 12);
      ctx.fillStyle = l.s.color; ctx.fillText(txt, w - padR + 4, l.y);
    });
    ctx.font = '11px ' + (css('--mono') || 'monospace');
    if (state.mx != null && state.mx >= padL && state.mx <= w - padR) {
      const tt = t0 + ((state.mx - padL) / cw) * (t1 - t0);
      ctx.strokeStyle = hexToRgba(th.fg, 0.35); ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(state.mx, padT); ctx.lineTo(state.mx, padT + ch); ctx.stroke(); ctx.setLineDash([]);
      const lines = [fmtTimeFull(tt, opts.range, opts.tz)];
      norm.forEach((s) => {
        let i = s.t.findIndex((t) => t >= tt); if (i < 0) i = s.t.length - 1;
        lines.push({ txt: `${s.label.padEnd(8)} ${s.p[i] >= 0 ? '+' : ''}${s.p[i].toFixed(2)}%`, color: s.color });
        ctx.beginPath(); ctx.arc(x(s.t[i]), y(s.p[i]), 3, 0, Math.PI * 2); ctx.fillStyle = s.color; ctx.fill();
      });
      const tw = 170, thh = lines.length * 15 + 10;
      let tx = state.mx + 12; if (tx + tw > w - padR) tx = state.mx - tw - 12;
      ctx.fillStyle = hexToRgba(th.panel, 0.95); ctx.strokeStyle = th.grid;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx, padT + 4, tw, thh, 6) : ctx.rect(tx, padT + 4, tw, thh); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      lines.forEach((l, k) => { ctx.fillStyle = typeof l === 'string' ? th.text : l.color; ctx.fillText(typeof l === 'string' ? l : l.txt, tx + 8, padT + 10 + k * 15); });
    }
  }

  /* ------------------------------------------------------------------ */
  /** curveChart(canvas, series:[{label, pts:[{x(months), y(%), lbl}], color, dash}]) — yield curve with log-ish tenor axis */
  function curveChart(canvas, series, opts = {}) {
    const state = charts.get(canvas) || {};
    state.curve = { series, opts };
    charts.set(canvas, state);
    if (!state.curveBound) {
      state.curveBound = true;
      canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); state.mx = e.clientX - r.left; drawCurve(canvas); });
      canvas.addEventListener('mouseleave', () => { state.mx = null; drawCurve(canvas); });
    }
    drawCurve(canvas);
  }
  function drawCurve(canvas) {
    const state = charts.get(canvas);
    if (!state || !state.curve) return;
    const { series } = state.curve;
    const th = theme();
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const valid = series.filter((s) => s.pts && s.pts.filter((p) => p.y != null).length >= 2);
    if (!valid.length) { ctx.fillStyle = th.text; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('No data', w / 2, h / 2); return; }
    const tenors = valid[0].pts.map((p) => p.x);
    const xs = tenors.map((m) => Math.log(m + 1));
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    let min = Infinity, max = -Infinity;
    valid.forEach((s) => s.pts.forEach((p) => { if (p.y != null) { min = Math.min(min, p.y); max = Math.max(max, p.y); } }));
    const span = Math.max(0.5, max - min); min -= span * 0.15; max += span * 0.15;
    const padL = 44, padR = 16, padT = 16, padB = 28, cw = w - padL - padR, ch = h - padT - padB;
    const X = (m) => padL + ((Math.log(m + 1) - x0) / Math.max(1e-6, x1 - x0)) * cw;
    const Y = (v) => padT + (1 - (v - min) / (max - min)) * ch;
    ctx.font = '11px ' + (css('--mono') || 'monospace'); ctx.textBaseline = 'middle';
    const step = niceStep(max - min, 5);
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      ctx.strokeStyle = hexToRgba(th.grid, 0.8); ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(w - padR, Y(v)); ctx.stroke();
      ctx.fillStyle = th.text; ctx.textAlign = 'right'; ctx.fillText(v.toFixed(2) + '%', padL - 6, Y(v));
    }
    ctx.textAlign = 'center';
    valid[0].pts.forEach((p) => { ctx.strokeStyle = hexToRgba(th.grid, 0.5); ctx.beginPath(); ctx.moveTo(X(p.x), padT); ctx.lineTo(X(p.x), padT + ch); ctx.stroke(); ctx.fillStyle = th.text; ctx.fillText(p.lbl, X(p.x), h - padB / 2); });
    valid.forEach((s) => {
      const pts = s.pts.filter((p) => p.y != null);
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
      ctx.strokeStyle = s.color; ctx.lineWidth = s.emph ? 2.6 : 1.6; ctx.lineJoin = 'round'; if (s.dash) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      pts.forEach((p) => { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), s.emph ? 4 : 3, 0, Math.PI * 2); ctx.fillStyle = s.color; ctx.fill(); ctx.strokeStyle = th.panel; ctx.lineWidth = 1.5; ctx.stroke(); });
      if (s.emph) { ctx.fillStyle = s.color; ctx.font = 'bold 10px ' + (css('--mono') || 'monospace'); ctx.textAlign = 'center'; pts.forEach((p) => ctx.fillText(p.y.toFixed(2), X(p.x), Y(p.y) - 12)); ctx.font = '11px ' + (css('--mono') || 'monospace'); }
    });
    // legend
    let lx = padL + 6;
    valid.forEach((s) => { ctx.fillStyle = s.color; ctx.fillRect(lx, padT - 8, 14, 3); ctx.fillStyle = th.text; ctx.textAlign = 'left'; ctx.fillText(s.label, lx + 18, padT - 7); lx += 18 + ctx.measureText(s.label).width + 16; });
    // hover
    if (state.mx != null) {
      let best = null;
      valid[0].pts.forEach((p) => { const d = Math.abs(X(p.x) - state.mx); if (!best || d < best.d) best = { p, d }; });
      if (best && best.d < 40) {
        const px = X(best.p.x);
        ctx.strokeStyle = hexToRgba(th.fg, 0.35); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, padT + ch); ctx.stroke(); ctx.setLineDash([]);
        const lines = [best.p.lbl + ' tenor'];
        valid.forEach((s) => { const p = s.pts.find((q) => q.x === best.p.x); if (p && p.y != null) lines.push({ txt: `${s.label.padEnd(9)} ${p.y.toFixed(3)}%`, color: s.color }); });
        const tw = 175, thh = lines.length * 15 + 10; let tx = px + 12; if (tx + tw > w - padR) tx = px - tw - 12;
        ctx.fillStyle = hexToRgba(th.panel, 0.95); ctx.strokeStyle = th.grid; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx, padT + 8, tw, thh, 6) : ctx.rect(tx, padT + 8, tw, thh); ctx.fill(); ctx.stroke();
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        lines.forEach((l, k) => { ctx.fillStyle = typeof l === 'string' ? th.text : l.color; ctx.fillText(typeof l === 'string' ? l : l.txt, tx + 8, padT + 14 + k * 15); });
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /** cotChart(canvas, { dates, series:[{label,values,color,width,dash,bars}], price:{label,values,color}, index:{values,label}, hiBand:[80,20] })
   *  Net-positioning chart: left axis = contracts (line/bars), right axis = price overlay, bottom strip = COT index 0-100. */
  function cotChart(canvas, data) {
    const state = charts.get(canvas) || {};
    state.cot = data;
    charts.set(canvas, state);
    if (!state.cotBound) {
      state.cotBound = true;
      canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); state.mx = e.clientX - r.left; drawCot(canvas); });
      canvas.addEventListener('mouseleave', () => { state.mx = null; drawCot(canvas); });
    }
    drawCot(canvas);
  }
  const fmtK = (v) => (v == null || !isFinite(v) ? '—' : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(Math.abs(v) >= 1e5 ? 0 : 1) + 'k' : String(Math.round(v)));
  function drawCot(canvas) {
    const state = charts.get(canvas);
    if (!state || !state.cot) return;
    const { dates, series, price, index } = state.cot;
    const th = theme();
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const n = dates.length;
    if (n < 2) { ctx.fillStyle = th.text; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('No data', w / 2, h / 2); return; }
    const mono = css('--mono') || 'monospace';
    const hasIdx = index && index.values && index.values.some((v) => v != null);
    const padL = 58, padR = price ? 62 : 16, padT = 22, padB = 24, stripH = hasIdx ? 46 : 0, gap = hasIdx ? 14 : 0;
    const cw = w - padL - padR;
    const ch = h - padT - padB - stripH - gap;
    const X = (i) => padL + (i / (n - 1)) * cw;
    // main axis range (contracts)
    let min = Infinity, max = -Infinity;
    series.forEach((s) => s.values.forEach((v) => { if (v != null) { min = Math.min(min, v); max = Math.max(max, v); } }));
    if (!isFinite(min)) { min = -1; max = 1; }
    min = Math.min(min, 0); max = Math.max(max, 0);
    const spanY = Math.max(1, max - min); min -= spanY * 0.06; max += spanY * 0.08;
    const Y = (v) => padT + (1 - (v - min) / (max - min)) * ch;
    // grid + left labels
    ctx.font = '10px ' + mono; ctx.textBaseline = 'middle';
    const step = niceStep(max - min, 5);
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      ctx.strokeStyle = hexToRgba(th.grid, Math.abs(v) < step / 2 ? 1 : 0.7); ctx.lineWidth = Math.abs(v) < step / 2 ? 1.2 : 1;
      ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(w - padR, Y(v)); ctx.stroke();
      ctx.fillStyle = th.text; ctx.textAlign = 'right'; ctx.fillText(fmtK(v), padL - 6, Y(v));
    }
    // x labels (years / quarters)
    ctx.textAlign = 'center'; ctx.fillStyle = th.text;
    let lastLbl = '';
    const every = Math.max(1, Math.round(n / Math.max(4, Math.floor(cw / 70))));
    for (let i = 0; i < n; i += every) {
      const d = dates[i]; const lbl = n > 120 ? d.slice(0, 4) : d.slice(0, 7);
      if (lbl === lastLbl) continue; lastLbl = lbl;
      ctx.fillText(n > 120 ? lbl : d.slice(2, 7), X(i), h - padB / 2);
    }
    // series
    series.forEach((s) => {
      if (s.bars) {
        const bw = Math.max(1, (cw / n) * 0.7);
        s.values.forEach((v, i) => { if (v == null) return; ctx.fillStyle = v >= 0 ? hexToRgba(th.up, 0.55) : hexToRgba(th.down, 0.55); const y0 = Y(0), y1 = Y(v); ctx.fillRect(X(i) - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0))); });
        return;
      }
      ctx.beginPath(); let started = false;
      s.values.forEach((v, i) => { if (v == null) { started = false; return; } if (!started) { ctx.moveTo(X(i), Y(v)); started = true; } else ctx.lineTo(X(i), Y(v)); });
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1.6; ctx.lineJoin = 'round'; if (s.dash) ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
      if (s.fill) { ctx.lineTo(X(n - 1), Y(0)); ctx.lineTo(X(0), Y(0)); ctx.closePath(); ctx.fillStyle = hexToRgba(s.color, 0.08); ctx.fill(); }
    });
    // price overlay (right axis)
    let PY = null;
    if (price && price.values.some((v) => v != null)) {
      const pv = price.values.filter((v) => v != null);
      let pmin = Math.min(...pv), pmax = Math.max(...pv); const ps = Math.max(1e-9, pmax - pmin); pmin -= ps * 0.05; pmax += ps * 0.05;
      PY = (v) => padT + (1 - (v - pmin) / (pmax - pmin)) * ch;
      ctx.beginPath(); let started = false;
      price.values.forEach((v, i) => { if (v == null) { return; } if (!started) { ctx.moveTo(X(i), PY(v)); started = true; } else ctx.lineTo(X(i), PY(v)); });
      ctx.strokeStyle = price.color || th.gold; ctx.lineWidth = 1.4; ctx.setLineDash([]); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = price.color || th.gold;
      const pstep = niceStep(pmax - pmin, 4);
      for (let v = Math.ceil(pmin / pstep) * pstep; v <= pmax; v += pstep) ctx.fillText(fmtNum(v, pstep >= 1 ? (pstep >= 10 ? 0 : 1) : Math.min(4, Math.max(2, -Math.floor(Math.log10(pstep))))), w - padR + 6, PY(v));
    }
    // legend
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; let lx = padL + 4;
    const leg = [...series.map((s) => ({ label: s.label, color: s.bars ? th.up : s.color })), ...(price ? [{ label: price.label, color: price.color || th.gold }] : [])];
    leg.forEach((l) => { ctx.fillStyle = l.color; ctx.fillRect(lx, padT - 13, 12, 3); ctx.fillStyle = th.text; ctx.fillText(l.label, lx + 16, padT - 12); lx += 16 + ctx.measureText(l.label).width + 14; });
    // index strip
    let IY = null;
    if (hasIdx) {
      const top = padT + ch + gap;
      IY = (v) => top + (1 - v / 100) * stripH;
      ctx.fillStyle = hexToRgba(th.grid, 0.25); ctx.fillRect(padL, top, cw, stripH);
      ctx.fillStyle = hexToRgba(th.down, 0.10); ctx.fillRect(padL, top, cw, stripH * 0.2);
      ctx.fillStyle = hexToRgba(th.up, 0.10); ctx.fillRect(padL, top + stripH * 0.8, cw, stripH * 0.2);
      ctx.strokeStyle = hexToRgba(th.grid, 0.9); ctx.setLineDash([2, 3]); [20, 50, 80].forEach((v) => { ctx.beginPath(); ctx.moveTo(padL, IY(v)); ctx.lineTo(w - padR, IY(v)); ctx.stroke(); }); ctx.setLineDash([]);
      ctx.fillStyle = th.text; ctx.textAlign = 'right'; ctx.fillText('100', padL - 6, IY(100)); ctx.fillText('0', padL - 6, IY(0)); ctx.fillText('50', padL - 6, IY(50));
      ctx.beginPath(); let started = false;
      index.values.forEach((v, i) => { if (v == null) { started = false; return; } if (!started) { ctx.moveTo(X(i), IY(v)); started = true; } else ctx.lineTo(X(i), IY(v)); });
      ctx.strokeStyle = index.color || '#a855f7'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = th.text; ctx.textAlign = 'left'; ctx.fillText(index.label || 'COT index', padL + 4, top - 6);
    }
    // hover
    if (state.mx != null && state.mx >= padL && state.mx <= w - padR) {
      const i = Math.max(0, Math.min(n - 1, Math.round(((state.mx - padL) / cw) * (n - 1))));
      const px = X(i);
      ctx.strokeStyle = hexToRgba(th.fg, 0.35); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, h - padB); ctx.stroke(); ctx.setLineDash([]);
      const lines = [{ txt: dates[i], color: th.fg }];
      series.forEach((s) => { const v = s.values[i]; if (v != null) lines.push({ txt: `${s.label}: ${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v)).toLocaleString('en-US')}`, color: s.bars ? (v >= 0 ? th.up : th.down) : s.color }); });
      if (price && price.values[i] != null) lines.push({ txt: `${price.label}: ${fmtNum(price.values[i])}`, color: price.color || th.gold });
      if (hasIdx && index.values[i] != null) lines.push({ txt: `${index.label || 'COT index'}: ${index.values[i].toFixed(0)}`, color: index.color || '#a855f7' });
      ctx.font = '11px ' + mono;
      const tw = Math.max(...lines.map((l) => ctx.measureText(l.txt).width)) + 18, thh = lines.length * 15 + 10;
      let tx = px + 12; if (tx + tw > w - padR) tx = px - tw - 12;
      ctx.fillStyle = hexToRgba(th.panel, 0.96); ctx.strokeStyle = th.grid; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(tx, padT + 6, tw, thh, 6); else ctx.rect(tx, padT + 6, tw, thh); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      lines.forEach((l, k) => { ctx.fillStyle = l.color; ctx.fillText(l.txt, tx + 9, padT + 12 + k * 15); });
      // dots
      series.forEach((s) => { const v = s.values[i]; if (v == null || s.bars) return; ctx.beginPath(); ctx.arc(px, Y(v), 3.5, 0, Math.PI * 2); ctx.fillStyle = s.color; ctx.fill(); });
      if (PY && price.values[i] != null) { ctx.beginPath(); ctx.arc(px, PY(price.values[i]), 3.5, 0, Math.PI * 2); ctx.fillStyle = price.color || th.gold; ctx.fill(); }
    }
  }

  function redrawAll() {
    document.querySelectorAll('canvas').forEach((c) => { const s = charts.get(c); if (!s) return; if (s.cot) drawCot(c); else if (s.curve) drawCurve(c); else if (s.cmp) drawCompare(c); else if (s.data) draw(c); });
  }
  window.addEventListener('resize', () => { clearTimeout(window.__hgRz); window.__hgRz = setTimeout(redrawAll, 120); });

  window.HGChart = { sparkline, priceChart, compareChart, curveChart, cotChart, redrawAll, fmtNum };
})();
