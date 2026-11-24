const { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback, useContext, createContext } = React;
const SJ = window.SJ;

/* ---------- highlighters: the only colours in the app, and they mean one thing ---------- */
const HL = [null,
  { fill: '#FFE14A', ink: '#6B5400', inkD: '#FFE14A', v: 'var(--hl1)', vi: 'var(--hl1i)' },
  { fill: '#FF9FCC', ink: '#A01F5D', inkD: '#FF9FCC', v: 'var(--hl2)', vi: 'var(--hl2i)' },
  { fill: '#97E283', ink: '#256A1B', inkD: '#97E283', v: 'var(--hl3)', vi: 'var(--hl3i)' },
  { fill: '#94CDFF', ink: '#1B5A9A', inkD: '#94CDFF', v: 'var(--hl4)', vi: 'var(--hl4i)' },
  { fill: '#FFB66E', ink: '#964806', inkD: '#FFB66E', v: 'var(--hl5)', vi: 'var(--hl5i)' },
];
HL.forEach(h => { if (!h) return; const n = parseInt(h.fill.slice(1), 16); h.faint = `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},0.32)`; });
const THEME = {
  light: { wave: '#2A2F37', dim: '#B3BAC3', ink: '#1E2228', ink3: '#5C6470', sel: 'rgba(30,34,40,0.12)', hatch: 'rgba(30,34,40,0.28)', bg: '#FFFFFF', grid: '#E3E7EB' },
  dark: { wave: '#DCE1E6', dim: '#555D67', ink: '#ECEFF2', ink3: '#A0A8B2', sel: 'rgba(236,239,242,0.14)', hatch: 'rgba(236,239,242,0.3)', bg: '#1C2026', grid: '#2B3038' },
};

const fmt = SJ.fmt;
const fmt1 = s => { s = Math.max(0, s); const m = Math.floor(s / 60), x = s - m * 60; return m + ':' + (x < 10 ? '0' : '') + x.toFixed(1); };
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// " · " in the shared demo data becomes a drawn separator, so meta never reads as a dot-chained label
function Dot({ s }) { const parts = String(s).split(' · '); return parts.map((x, i) => <React.Fragment key={i}>{i > 0 && <i className="sep" />}{x}</React.Fragment>); }
const plain = s => String(s).split(' · ').join('，');

/* ---------- envelopes (cached) ---------- */
const ENV = {};
function envSpeech() { return ENV.sp || (ENV.sp = SJ.speechEnvelope()); } // 130 s @ 50/s, 9 long pauses
function envSpeechLong() { // 260 s: the real first 130 s plus another stretch of talk, for ranges past 2:10
  if (ENV.spl) return ENV.spl;
  const a = envSpeech(), b = SJ.speechEnvelope({ seed: 8, lead: 0.3, pauses: [] }), o = new Float32Array(a.length + b.length);
  o.set(a); o.set(b, a.length); return (ENV.spl = o);
}
function envTail() { return ENV.tail || (ENV.tail = SJ.speechEnvelope({ seconds: 12, seed: 41, lead: 0.1, pauses: [] })); }
function envMusic() { return ENV.mu || (ENV.mu = SJ.musicEnvelope()); }
function envThumb(id, kind) {
  const k = 't' + id; if (ENV[k]) return ENV[k];
  const h = hash(id) % 1000 + 3;
  return (ENV[k] = kind === 'music' || kind === 'mix' ? SJ.musicEnvelope({ seconds: 60, rate: 6, seed: h, bpm: 70 + h % 60 })
    : SJ.speechEnvelope({ seconds: 60, rate: 6, seed: h, lead: 1.5, pauses: [[12 + h % 9, 2.2], [31, 1.8], [47 - h % 5, 2.6]] }));
}
function envOverview(seconds) { // whole recording, 2 points per second
  const k = 'ov' + seconds; if (ENV[k]) return ENV[k];
  const n = Math.round(seconds * 2), o = new Float32Array(n), first = envSpeech();
  for (let i = 0; i < n; i++) {
    const t = i / 2;
    let src, off;
    if (t < 130) { src = first; off = t; } else { const c = Math.floor((t - 130) / 130); const key = 'ch' + c; src = ENV[key] || (ENV[key] = SJ.speechEnvelope({ seed: 11 + c, lead: 0.2, pauses: [] })); off = (t - 130) % 130; }
    let m = 0; for (let j = Math.floor(off * 50); j < Math.floor((off + 0.5) * 50) && j < src.length; j++) m = Math.max(m, src[j]);
    o[i] = m;
  }
  return (ENV[k] = o);
}

/* ---------- the plan, applied to the first 130 s (all the pauses are there) ---------- */
const PLAN0 = { s1: 3, s2: 0.3, s3: 3, s4: 2 };
function planCuts(v, off) {
  const cuts = [];
  if (!off.s1) cuts.push({ a: 0, b: v.s1, step: 1 });
  if (!off.s2) SJ.PAUSES.forEach(([s, d]) => { if (d > v.s2) cuts.push({ a: s + v.s2 / 2, b: s + d - v.s2 / 2, step: 2 }); });
  return cuts.filter(c => c.b > c.a);
}
function planResult(v = PLAN0, off = {}) {
  const src = envSpeech(), rate = 50, cuts = planCuts(v, off), gain = off.s3 ? 1 : Math.pow(10, v.s3 / 20);
  const keep = new Uint8Array(src.length).fill(1);
  cuts.forEach(c => { for (let i = Math.round(c.a * rate); i < Math.round(c.b * rate) && i < src.length; i++) keep[i] = 0; });
  const out = []; const seams = []; let prev = 1;
  for (let i = 0; i < src.length; i++) {
    if (keep[i]) { if (!prev) { const c = cuts.find(c => Math.abs(c.b * rate - i) < 2) || {}; seams.push({ t: out.length / rate, step: c.step || 2, len: (c.b - c.a) || 0 }); } out.push(Math.min(1, src[i] * gain)); }
    prev = keep[i];
  }
  const removed = cuts.reduce((s, c) => s + c.b - c.a, 0);
  return { env: Float32Array.from(out), rate, seams, removed, total: 1120 - removed };
}

/* ---------- icons (24 grid, stroke) ---------- */
const IP = {
  play: 'M7.5 5.2v13.6a.8.8 0 0 0 1.2.7l11-6.8a.8.8 0 0 0 0-1.4l-11-6.8a.8.8 0 0 0-1.2.7z',
  pause: 'M7 5h3.2v14H7zM13.8 5H17v14h-3.2z',
  mic: 'M12 3.5a3 3 0 0 1 3 3V12a3 3 0 0 1-6 0V6.5a3 3 0 0 1 3-3zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3',
  back: 'M15 5l-7 7 7 7', more: 'M12 5.5h.01M12 12h.01M12 18.5h.01', search: 'M10.8 4.5a6.3 6.3 0 1 1 0 12.6 6.3 6.3 0 0 1 0-12.6zM15.5 15.5L20 20',
  plus: 'M12 5v14M5 12h14', check: 'M5 12.5l4.5 4.5L19 7.5', close: 'M6 6l12 12M18 6L6 18', chev: 'M9.5 6l6 6-6 6', down: 'M6 9.5l6 6 6-6', up: 'M6 14.5l6-6 6 6',
  cut: 'M6 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM6 14.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8.2 8.4L20 18M8.2 15.6L20 6',
  split: 'M12 3v18M7.5 8l-3.5 4 3.5 4M16.5 8l3.5 4-3.5 4',
  vol: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  fade: 'M3 19h18M3 18L13 6h8', flag: 'M6 21V4h11l-2.5 4L17 12H6', sliders: 'M4 7h9M17 7h3M4 17h4M12 17h8M15 4.8v4.4M10 14.8v4.4',
  undo: 'M9 6.5L5 10.5l4 4M5 10.5h9.5a4.5 4.5 0 0 1 0 9H11', redo: 'M15 6.5l4 4-4 4M19 10.5H9.5a4.5 4.5 0 0 0 0 9H13',
  save: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14', share: 'M6 9.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM17 3.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM17 15.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM8.2 10.9l6.6-3.8M8.2 13.1l6.6 3.8',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0', file: 'M7 3h7l5 5v13H7zM14 3v5h5', video: 'M3.5 6.5h11a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 2 16V8a1.5 1.5 0 0 1 1.5-1.5zM16 10.5l5.5-3v9l-5.5-3',
  text: 'M5 6h14M12 6v13M9 19h6', sub: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM7 11h4M13 11h4M7 15h7',
  voice: 'M4 10v4M7.5 7v10M11 4v16M14.5 8v8M18 6v12M21 10.5v3', music: 'M9 18V6l11-2v12M6.5 15.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM17.5 13.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  blank: 'M3 12h2.5M8 12h2.5M13.5 12H16M18.5 12H21M3 8v8M21 8v8', sample: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM10 8.8v6.4l5-3.2z',
  pack: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8', gear: 'M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  user: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4.5 20.5a7.5 7.5 0 0 1 15 0', rec: 'M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14z', stop: 'M6.5 6.5h11v11h-11z',
  phones: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H5a1 1 0 0 1-1-1zM20 15h-3v5h2a1 1 0 0 0 1-1z', layers: 'M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  spec: 'M3 5h18M3 9.5h18M3 14h18M3 18.5h18', zin: 'M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM15 15l5 5M8 10.5h5M10.5 8v5', zout: 'M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM15 15l5 5M8 10.5h5',
  folder: 'M3 6.5h6l2 2h10V19H3z', wifioff: 'M3 3l18 18M8.5 16.3a5 5 0 0 1 7 0M5 12.8a10 10 0 0 1 4.6-2.6M19 12.8a10 10 0 0 0-3.3-2.2M2 9.3a15 15 0 0 1 5-2.9M22 9.3a15 15 0 0 0-10-3.8M12 20h.01',
  batch: 'M8 3h8.5L21 7.5V18H8zM16.5 3v4.5H21M4 7v14h12', book: 'M7 4h10v16l-5-4-5 4z', help: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.4v.6M12 16.8v.2',
  globe: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z',
  moon: 'M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z', trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13', edit: 'M4 20h4L19 9l-4-4L4 16z',
  info: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 11v5.5M12 7.8v.2', clock: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 7.5V12l3 2',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01', copy: 'M9 9h10v11H9zM5 15V4h10', repeat: 'M17 3l3 3-3 3M4 11V9.5A3.5 3.5 0 0 1 7.5 6H20M7 21l-3-3 3-3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H4',
  ins: 'M4 12h4M16 12h4M12 6v12M9.5 8.5L12 6l2.5 2.5', beat: 'M9 3.5h6l3 17H6zM12 16.5l4.5-9', curve: 'M3 17c4 0 5-10 9-10s5 6 9 6',
  bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6z', send: 'M4 12l16-8-6 16-2.5-6.5z', phone: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  alarm: 'M12 6a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM12 9.5V13l2.5 1.5M4 5l3-2.5M20 5l-3-2.5', msg: 'M4 5h16v11H9l-5 4z', sparkle: 'M12 4v16M4 12h16',
  ab: 'M4 18L7.5 6h1L12 18M5.2 14h5.6M14 6h3.5a3 3 0 0 1 0 6H14zM14 12h4a3 3 0 0 1 0 6h-4z', speed: 'M4 16a8 8 0 1 1 16 0M12 16l4.5-5', loop: 'M17 2.5l3 3-3 3M3.5 11.5v-1A5 5 0 0 1 8.5 5.5H20M7 21.5l-3-3 3-3M20.5 12.5v1a5 5 0 0 1-5 5H4',
  lock: 'M6.5 11h11v9h-11zM8.5 11V8a3.5 3.5 0 0 1 7 0v3', key: 'M8 11.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM10.5 13L19 4.5M16 7.5l2.5 2.5', mail: 'M3.5 6h17v12h-17zM3.5 6.5l8.5 7 8.5-7',
};
function Ic({ n, s = 24, w = 1.8, fill }) {
  const solid = n === 'play' || n === 'pause' || n === 'rec' || n === 'stop';
  const dotty = n === 'more' || n === 'grip';
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={solid ? 'currentColor' : (fill || 'none')} stroke={solid ? 'none' : 'currentColor'}
    strokeWidth={dotty ? 3.2 : w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', display: 'block' }}><path d={IP[n]} /></svg>;
}

/* ---------- waveform ---------- */
function useTheme() { const c = useContext(PhoneCtx); return THEME[c && c.g.dark ? 'dark' : 'light']; }
function Wave({ env, rate, from = 0, to, w, h, regions = [], gain = 1, seams = [], spectrum = false, mode = 'mirror', dim = false, fadeEnd = 0, thin = false, theme: th0, color, scale = 0.88 }) {
  const ref = useRef();
  const thCtx = useTheme(); const th = th0 || thCtx;
  const key = JSON.stringify([from, to, w, h, regions, gain, seams, spectrum, mode, dim, fadeEnd, thin, th.wave, color, scale]);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    const end = to == null ? env.length / rate : to, span = end - from, X = t => (t - from) / span * w;
    // region fills under the wave
    regions.forEach(r => {
      const a = X(r.a), b = X(r.b);
      if (r.kind === 'fill' || r.kind === 'fade') { x.fillStyle = r.c; x.globalAlpha = r.alpha || 1; const wd = Math.max(r.min || 3, b - a); x.fillRect(a - (wd - (b - a)) / 2, 0, wd, h); x.globalAlpha = 1; }
      if (r.kind === 'hatch') { x.save(); x.beginPath(); x.rect(a, 0, Math.max(2, b - a), h); x.clip(); x.strokeStyle = th.hatch; x.lineWidth = 1; for (let k = -h; k < (b - a) + h; k += 5) { x.beginPath(); x.moveTo(a + k, h); x.lineTo(a + k + h, 0); x.stroke(); } x.restore(); }
      if (r.kind === 'sel') { x.fillStyle = th.sel; x.fillRect(a, 0, b - a, h); }
    });
    if (!spectrum) seams.forEach(s => { if (!s.f) return; const a = X(s.t); x.fillStyle = s.f; x.fillRect(a - 4, 0, 8, h); });
    if (spectrum) {
      const bins = Math.floor(h / 3), r = SJ.rng(5);
      const prof = Array.from({ length: bins }, (_, k) => Math.exp(-Math.pow((k / bins - 0.22), 2) / 0.02) * 0.9 + Math.exp(-Math.pow((k / bins - 0.5), 2) / 0.015) * 0.55 + 0.12);
      for (let px = 0; px < w; px += 2) {
        const t0 = from + px / w * span, i0 = Math.floor(t0 * rate), i1 = Math.max(i0 + 1, Math.floor((from + (px + 2) / w * span) * rate));
        let m = 0; for (let i = i0; i < i1 && i < env.length; i++) m = Math.max(m, env[i]);
        for (let k = 0; k < bins; k++) {
          const v = clamp(m * gain * prof[k] * (0.7 + 0.5 * r()) + 0.03 * r(), 0, 1);
          x.fillStyle = th === THEME.dark ? `rgba(220,225,230,${v.toFixed(3)})` : `rgba(30,34,40,${v.toFixed(3)})`;
          x.fillRect(px, h - (k + 1) * 3, 2, 3);
        }
      }
    } else {
      const mid = h / 2, half = (mode === 'mirror' ? h / 2 - 1 : h - 1) * scale;
      x.fillStyle = color || (dim ? th.dim : th.wave);
      const step = thin ? 3 : 1, bw = thin ? 2 : 1;
      for (let px = 0; px < w; px += step) {
        const t0 = from + px / w * span, t1 = from + (px + step) / w * span;
        if (t0 * rate >= env.length || t0 < 0) continue;
        const i0 = Math.floor(t0 * rate), i1 = Math.max(i0 + 1, Math.floor(t1 * rate));
        let m = 0; for (let i = i0; i < i1 && i < env.length; i++) m = Math.max(m, env[i]);
        let g = gain; if (fadeEnd > 0 && t0 > end - fadeEnd) g *= Math.sin((end - t0) / fadeEnd * Math.PI / 2);
        const bh = Math.max(0.6, Math.min(1, m * g) * half);
        if (mode === 'mirror') x.fillRect(px, mid - bh, bw, bh * 2); else x.fillRect(px, h - bh, bw, bh);
      }
    }
    // bands and fades over the wave
    regions.forEach(r => {
      const a = X(r.a), b = X(r.b);
      if (r.kind === 'band') { x.fillStyle = r.c; x.fillRect(a, h - (r.bh || 6), b - a, r.bh || 6); }
      if (r.kind === 'fade') { x.strokeStyle = r.line || th.ink; x.lineWidth = 2; x.beginPath(); for (let k = 0; k <= 24; k++) { const f = k / 24, xx = a + f * (b - a), yy = h * (1 - Math.cos(f * Math.PI / 2)) * 0.92 + 2; k ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); }
      if (r.kind === 'edge') { x.fillStyle = r.c; x.fillRect(a - 1, 0, 2, h); }
      if (r.kind === 'tick') { x.fillStyle = r.c; x.fillRect(a - 1.5, 0, 3, r.th || 10); x.fillRect(a - 1.5, h - (r.th || 10), 3, r.th || 10); }
    });
    seams.forEach(s => { const a = X(s.t); x.fillStyle = s.c || th.ink; if (s.f) { x.fillRect(a - 1, 0, 2, h); x.beginPath(); x.arc(a, 5, 4.5, 0, Math.PI * 2); x.fill(); } else { x.fillRect(a - 1.5, 0, 3, 9); x.fillRect(a - 1.5, h - 9, 3, 9); } });
  }, [key, env]);
  return <canvas ref={ref} style={{ width: w, height: h, display: 'block' }} />;
}
/* generated voiceprint: a voice drawn as data, no faces */
function Voiceprint({ id, w = 72, h = 40, on = false, prog = -1, light = false }) {
  const bars = useMemo(() => { const r = SJ.rng(hash(id)); const n = Math.floor(w / 4); const p1 = r() * 6, p2 = r() * 6, f1 = 1 + r() * 2.5, f2 = 3 + r() * 4;
    return Array.from({ length: n }, (_, i) => { const t = i / n; return clamp(0.18 + 0.5 * Math.abs(Math.sin(t * f1 * Math.PI + p1)) * (0.6 + 0.4 * Math.sin(t * f2 + p2)) + 0.25 * r(), 0.12, 1); }); }, [id, w]);
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
    {bars.map((b, i) => { const bh = b * (h - 4); const done = prog >= 0 && i / bars.length <= prog;
      return <rect key={i} x={i * 4 + 0.5} y={(h - bh) / 2} width={2.6} height={bh} rx={1.3} fill={light ? '#fff' : 'currentColor'} opacity={on || done ? 1 : (prog >= 0 ? 0.35 : 0.55)} />; })}
  </svg>;
}
/* generated covers: monochrome patterns, one family per category, seeded by track id */
function Cover({ t, s: size = 56, r = 12, w: wPx, h: hPx }) {
  const s = 56, W = wPx || size, H = hPx || size;
  const rnd = SJ.rng(hash(t.id) + 9), inv = hash(t.id) % 2 === 0, fg = inv ? '#E9EDF1' : '#1E2228', bg = inv ? '#262B32' : '#DDE2E8';
  const el = []; const cat = t.cat;
  if (cat === '轻快') for (let i = -4; i < 10; i++) el.push(<path key={i} d={`M${i * 9} ${s}L${i * 9 + s} 0`} stroke={fg} strokeWidth={1.5 + rnd() * 4} />);
  else if (cat === '温暖') { const cx = s * (0.3 + rnd() * 0.4), cy = s * (0.3 + rnd() * 0.4); for (let i = 1; i < 9; i++) el.push(<circle key={i} cx={cx} cy={cy} r={i * s / 9} fill="none" stroke={fg} strokeWidth={1.4} />); }
  else if (cat === '电子') for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) el.push(<circle key={i + '-' + j} cx={s / 14 + i * s / 7} cy={s / 14 + j * s / 7} r={0.8 + rnd() * 3} fill={fg} />);
  else if (cat === '国风') { for (let i = 0; i < 9; i++) { const x = 4 + i * s / 9 + rnd() * 2; el.push(<path key={i} d={`M${x} ${rnd() * 10} V${s - rnd() * 14}`} stroke={fg} strokeWidth={1.3} />); } el.push(<path key="h" d={`M0 ${s * 0.62}H${s}`} stroke={fg} strokeWidth={2.4} />); }
  else if (cat === '悬疑') for (let i = 0; i < 26; i++) { const x = rnd() * s, y = rnd() * s; el.push(<path key={i} d={`M${x} ${y}l${4 + rnd() * 8} ${rnd() * 4 - 2}`} stroke={fg} strokeWidth={1.6} />); }
  else if (cat === '节日喜庆') for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; el.push(<path key={i} d={`M${s / 2} ${s / 2}L${s / 2 + Math.cos(a) * s} ${s / 2 + Math.sin(a) * s}`} stroke={fg} strokeWidth={i % 2 ? 1 : 2.6} />); }
  else if (cat === '片头片尾') for (let i = 0; i < 7; i++) el.push(<rect key={i} x={6} y={6 + i * (s - 12) / 7} width={(0.25 + rnd() * 0.7) * (s - 12)} height={(s - 12) / 7 - 2.5} fill={fg} rx={1} />);
  else for (let i = 0; i < 7; i++) { const y = 6 + i * 7.5; el.push(<path key={i} d={`M0 ${y} C ${s * 0.3} ${y - 6 + rnd() * 12}, ${s * 0.6} ${y - 6 + rnd() * 12}, ${s} ${y}`} fill="none" stroke={fg} strokeWidth={1.4} />); }
  return <svg width={W} height={H} viewBox={`0 0 ${s} ${s}`} preserveAspectRatio="xMidYMid slice" style={{ borderRadius: r, flex: 'none', display: 'block', background: bg }} aria-hidden="true">{el}</svg>;
}

/* ---------- player: one thing plays at a time per phone ---------- */
function usePlayer() {
  const [st, setSt] = useState({ tag: null, t: 0, dur: 1, playing: false, speed: 1 });
  const ref = useRef({ raf: 0, t0: 0, from: 0, dur: 1, tag: null, speed: 1 });
  const loop = () => {
    const r = ref.current; const t = r.from + (performance.now() - r.t0) / 1000 * r.speed;
    if (t >= r.dur) { setSt(s => ({ ...s, t: r.dur, playing: false })); return; }
    setSt(s => ({ ...s, t })); r.raf = requestAnimationFrame(loop);
  };
  const api = useMemo(() => ({
    play(tag, dur, from = 0, speed) { const r = ref.current; cancelAnimationFrame(r.raf); Object.assign(r, { t0: performance.now(), from, dur, tag, speed: speed || r.speed }); setSt({ tag, t: from, dur, playing: true, speed: r.speed }); r.raf = requestAnimationFrame(loop); },
    stop() { cancelAnimationFrame(ref.current.raf); setSt(s => ({ ...s, playing: false })); },
    setSpeed(sp) { const r = ref.current; const t = r.from + (performance.now() - r.t0) / 1000 * r.speed; r.from = t; r.t0 = performance.now(); r.speed = sp; setSt(s => ({ ...s, speed: sp })); },
  }), []);
  useEffect(() => () => cancelAnimationFrame(ref.current.raf), []);
  return { ...st, ...api, on: tag => st.playing && st.tag === tag, toggle(tag, dur, from) { if (st.playing && st.tag === tag) api.stop(); else api.play(tag, dur, st.tag === tag && st.t < dur ? st.t : (from || 0)); } };
}

/* ---------- phone frame (Android, 360 × 780) ---------- */
const PhoneCtx = createContext(null);
function PhoneFrame({ id, dark, children, onStatus, onGesture }) {
  return <div className={'ph' + (dark ? ' dark' : '')} id={id}>
    <div className="ph-scr">
      <div className="ph-sb" onClick={onStatus} title="下拉通知栏">
        <span>9:41</span>
        <div className="ph-sb-i">
          <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor"><rect x="0" y="7" width="2.4" height="4" rx=".6" /><rect x="4" y="5" width="2.4" height="6" rx=".6" /><rect x="8" y="2.5" width="2.4" height="8.5" rx=".6" /><rect x="12" y="0" width="2.4" height="11" rx=".6" /></svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 4a9.5 9.5 0 0 1 13 0M3.3 6.4a6 6 0 0 1 8.4 0M5.6 8.7a2.6 2.6 0 0 1 3.8 0" /></svg>
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none"><rect x=".75" y=".75" width="20" height="10.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" /><rect x="3" y="3" width="14" height="6" rx="1" fill="currentColor" /><rect x="22" y="4" width="1.6" height="4" rx=".8" fill="currentColor" /></svg>
          <small>86%</small>
        </div>
      </div>
      <div className="ph-hole" />
      <div className="ph-body">{children}</div>
      <div className="ph-gb" onClick={onGesture} title="返回" style={{ cursor: 'pointer' }}><i /></div>
    </div>
  </div>;
}

/* ---------- small shared pieces ---------- */
function Top({ title, sub, back = true, right, onBack }) {
  const { nav } = useContext(PhoneCtx);
  return <div className="top">
    {back ? <button className="ib" onClick={onBack || nav.back} aria-label="返回"><Ic n="back" /></button> : <div style={{ width: 8 }} />}
    <div className="top-t">{title}{sub && <small>{sub}</small>}</div>
    {right}
  </div>;
}
function Seg({ items, value, onChange, style }) {
  return <div className="seg" style={style}>{items.map(it => { const [k, l] = Array.isArray(it) ? it : [it, it]; return <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>; })}</div>;
}
function Switch({ on, onClick }) { return <button className={'sw' + (on ? ' on' : '')} onClick={onClick} role="switch" aria-checked={on} />; }
function Slider({ value, min = 0, max = 1, onChange, w }) {
  const ref = useRef();
  const set = e => { const r = ref.current.getBoundingClientRect(); onChange(clamp(min + (e.clientX - r.left) / r.width * (max - min), min, max)); };
  const f = (value - min) / (max - min) * 100;
  return <div className="slider" ref={ref} style={{ width: w }} onPointerDown={e => { set(e); const mv = ev => set(ev), up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); }}>
    <div className="tr" /><div className="fi" style={{ width: f + '%' }} /><div className="kn" style={{ left: f + '%' }} />
  </div>;
}
function Stepper({ value, unit, onChange, step = 1, min = 0, max = 99, fmtv }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'var(--surface-2)', borderRadius: 20, padding: 2, verticalAlign: 'middle' }}>
    <button className="ib" style={{ width: 34, height: 34 }} onClick={e => { e.stopPropagation(); onChange(clamp(+(value - step).toFixed(2), min, max)); }} aria-label="减少"><span style={{ fontSize: 20, lineHeight: 1, marginTop: -2 }}>−</span></button>
    <b className="num" style={{ minWidth: 40, textAlign: 'center', fontSize: 17 }}>{fmtv ? fmtv(value) : value}{unit && <span style={{ fontWeight: 500, fontSize: 14 }}> {unit}</span>}</b>
    <button className="ib" style={{ width: 34, height: 34 }} onClick={e => { e.stopPropagation(); onChange(clamp(+(value + step).toFixed(2), min, max)); }} aria-label="增加"><span style={{ fontSize: 20, lineHeight: 1, marginTop: -2 }}>+</span></button>
  </span>;
}
function Hl({ i, children, off, ask, foc, dim, onClick }) {
  return <span className={'hl' + (off ? ' off' : '') + (ask ? ' ask' : '') + (foc ? ' foc' : '')} style={{ '--c': HL[i] ? (dim ? HL[i].faint : HL[i].v) : 'transparent' }} onClick={onClick}>{children}</span>;
}
function PlayBtn({ on, onClick, size = 44, fill = true, label }) {
  return <button className={'ib' + (fill ? ' fill' : ' soft')} style={{ width: size, height: size, borderRadius: size / 2 }} onClick={onClick} aria-label={label || (on ? '暂停' : '播放')}><Ic n={on ? 'pause' : 'play'} s={size > 44 ? 24 : 20} /></button>;
}
function Thumb({ item, w = 56, h = 40 }) {
  const env = envThumb(item.id, item.kind);
  return <div style={{ width: w, height: h, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flex: 'none', overflow: 'hidden' }}>
    <Wave env={env} rate={6} w={w - 10} h={h - 12} thin />
  </div>;
}
function Badge({ children, solid }) { return <span className={'badge' + (solid ? ' solid' : '')}>{children}</span>; }
function Member() { return <Badge>会员</Badge>; }

Object.assign(window, { HL, THEME, fmt, fmt1, hash, clamp, Dot, plain, envSpeech, envSpeechLong, envTail, envMusic, envThumb, envOverview, PLAN0, planCuts, planResult, Ic, Wave, Voiceprint, Cover, usePlayer, PhoneCtx, PhoneFrame, Top, Seg, Switch, Slider, Stepper, Hl, PlayBtn, Thumb, Badge, Member, useTheme });
