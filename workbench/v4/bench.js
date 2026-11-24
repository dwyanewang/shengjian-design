/* 声剪 工作台 第三轮：一个组件画出所有手机画面；live 的那台可以用手指和鼠标操作。 */
(function () {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RM.matches;
  const SR = 10;                       // 1 单位 = 0.1 秒
  const NB = ' ';
  // Screen edges: the system takes swipes that start within EDGE of either side (Android's back gesture). Nothing
  // the user touches has a hit area within SAFE of a side; the audio's ends sit G in at the fitted view; a drag that
  // comes within SCROLLZ of a side scrolls the view instead of asking the finger to reach the bezel.
  const EDGE = 24, SAFE = 32, G = 40, SCROLLZ = 64;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sec = s => Math.round(s * SR);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ------------------------------------------------------------------ icons (ui/AppIcons.kt + a few drawn here)
  const CUSTOM = {
    Move: '<path d="M7.6 6.6 2.2 12l5.4 5.4 1.4-1.4L6 13h12l-3 3 1.4 1.4 5.4-5.4-5.4-5.4L15 8l3 3H6l3-3z"/>',
    Fade: '<path fill-rule="evenodd" d="M3 19h18V5zm4.6-2L19 9.7V17z"/>',
    Keep: '<path d="M3 4h6v2H5v12h4v2H3zM21 4h-6v2h4v12h-4v2h6z"/><rect x="9.5" y="9" width="5" height="6" rx="1"/>',
    Split: '<path d="M11 2h2v20h-2z"/><path d="M3 7h6v2H5v6h4v2H3zM21 7h-6v2h4v6h-4v2h6z"/>',
    Say: '<path fill-rule="evenodd" d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9.5L5 21.6V18H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3.5 8.5a1.5 1.5 0 1 0 0-.01zm4.5 0a1.5 1.5 0 1 0 0-.01zm4.5 0a1.5 1.5 0 1 0 0-.01z"/>',
    SelectAll: '<path d="M3 3h4v2H5v2H3zm6 0h2v2H9zm4 0h2v2h-2zm4 0h4v4h-2V5h-2zM3 9h2v2H3zm16 0h2v2h-2zM3 13h2v2H3zm16 0h2v2h-2zM3 17h2v2h2v2H3zm16 0h2v4h-4v-2h2zM9 19h2v2H9zm4 0h2v2h-2z"/><rect x="7" y="7" width="10" height="10" rx="1.5"/>',
    Duck: '<path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15 10h7v2h-7zM15 14h4v2h-4z"/>',
    Solo: '<path d="M12 3a8 8 0 0 0-8 8v6a3 3 0 0 0 3 3h1v-7H6v-2a6 6 0 0 1 12 0v2h-2v7h1a3 3 0 0 0 3-3v-6a8 8 0 0 0-8-8z"/>',
    Hold: '<path d="M12 4a3 3 0 0 1 3 3v4.2l3.7 1.2a2 2 0 0 1 1.3 2.3L19 20H9.6l-4-5.3 1.3-1.2L9 15V7a3 3 0 0 1 3-3z"/>',
    RecDot: '<circle cx="12" cy="12" r="7"/>',
  };
  function ic(name, size, cls) {
    size = size || 24; cls = cls || '';
    const a = `class="ic ${cls}" width="${size}" height="${size}" aria-hidden="true"`;
    if (name === 'Redo') return ic('Undo', size, cls + ' flip');
    if (name === 'Chevron') return ic('KeyboardArrowRight', size, cls + ' flip');
    if (CUSTOM[name]) return `<svg ${a} viewBox="0 0 24 24">${CUSTOM[name]}</svg>`;
    const d = (window.ICONS || {})[name];
    if (!d) return `<svg ${a} viewBox="0 0 24 24"></svg>`;
    return `<svg ${a} viewBox="0 -960 960 960"><path d="${d}"/></svg>`;
  }
  function ring(p, cls) {
    const r = 7, c = 2 * Math.PI * r;
    return `<svg class="ring ${cls || ''}" viewBox="0 0 18 18" aria-hidden="true"><circle class="bgc" cx="9" cy="9" r="${r}" fill="none" stroke-width="2.4"/>` +
      `<circle cx="9" cy="9" r="${r}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="${(c * clamp(p, 0.02, 1)).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 9 9)"/></svg>`;
  }

  // ------------------------------------------------------------------ time labels (core/TimeFormat)
  const p2 = n => String(n).padStart(2, '0');
  function clk(u) { const t = Math.max(0, Math.round(u / SR)); const h = Math.floor(t / 3600); return (h ? h + ':' + p2(Math.floor(t / 60) % 60) : p2(Math.floor(t / 60))) + ':' + p2(t % 60); }
  function clkd(u) { const t = Math.max(0, Math.round(u)); const s = Math.floor(t / SR); const h = Math.floor(s / 3600); return (h ? h + ':' + p2(Math.floor(s / 60) % 60) : p2(Math.floor(s / 60))) + ':' + p2(s % 60) + '.' + (t % SR); }
  function cmp(u) { const t = Math.max(0, Math.round(u)); const s = Math.floor(t / SR); const h = Math.floor(s / 3600); return (h ? h + ':' + p2(Math.floor(s / 60) % 60) : Math.floor(s / 60)) + ':' + p2(s % 60) + (t % SR ? '.' + (t % SR) : ''); }
  function dur(u) { const s = u / SR; if (s < 60) return (Math.round(s * 10) / 10) + NB + '秒'; const t = Math.round(s); return Math.floor(t / 60) + NB + '分' + (t % 60 ? NB + (t % 60) + NB + '秒' : ''); }
  function durEn(u) { const s = u / SR; if (s < 60) return (Math.round(s * 10) / 10) + NB + 's'; const t = Math.round(s); return Math.floor(t / 60) + NB + 'min' + (t % 60 ? NB + (t % 60) + NB + 's' : ''); }

  // ------------------------------------------------------------------ springs (ui/Flow.kt, ui/Motion.kt)
  const P = { lead: { k: 300, z: 0.62 }, trail: { k: 170, z: 0.78 }, grow: { k: 380, z: 0.5 }, move: { k: 260, z: 0.9 }, gap: { k: 190, z: 0.82 }, view: { k: 210, z: 0.86 } };
  class Spring {
    constructor(v, p, eps) { this.v = v || 0; this.t = this.v; this.vel = 0; this.p = p || P.move; this.eps = eps || 0.05; }
    to(t, p) { this.t = t; if (p) this.p = p; return this; }
    snap(v) { this.v = this.t = v; this.vel = 0; return this; }
    get busy() { return this.v !== this.t || this.vel !== 0; }
    step(dt) {
      if (this.v === this.t && this.vel === 0) return false;
      if (reduced()) { this.v = this.t; this.vel = 0; return false; }
      const k = this.p.k, c = 2 * this.p.z * Math.sqrt(k);
      let left = Math.min(dt, 0.05);
      while (left > 1e-6) { const h = Math.min(left, 1 / 240); const a = -k * (this.v - this.t) - c * this.vel; this.vel += a * h; this.v += this.vel * h; left -= h; }
      if (Math.abs(this.v - this.t) < this.eps && Math.abs(this.vel) < this.eps * 8) { this.v = this.t; this.vel = 0; return false; }
      return true;
    }
  }
  /** Two edges: the edge on the side it moves toward leads on the quick spring, the other follows (FlowSpan). */
  class FlowSpan {
    constructor() { this.a = new Spring(0, P.lead, 0.2); this.b = new Spring(0, P.lead, 0.2); this.placed = false; }
    to(s, e) {
      if (!this.placed) { this.snap(s, e); return; }
      if (s === this.a.t && e === this.b.t) return;
      const right = s + e > this.a.t + this.b.t;
      this.a.to(s, right ? P.trail : P.lead); this.b.to(e, right ? P.lead : P.trail);
    }
    snap(s, e) { this.a.snap(s); this.b.snap(e); this.placed = true; }
    step(dt) { const x = this.a.step(dt); const y = this.b.step(dt); return x || y; }
  }
  const LINEAR_OK = window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)');
  function springEase(p) {
    let x = 0, v = 0, t = 0; const dt = 1 / 240, pts = [];
    const k = p.k, c = 2 * p.z * Math.sqrt(k);
    while (t < 1.6) { for (let i = 0; i < 4; i++) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt; } pts.push(x); if (Math.abs(x - 1) < 0.002 && Math.abs(v) < 0.02) break; }
    const n = pts.length, step = Math.max(1, Math.floor(n / 36)), out = ['0'];
    for (let i = step - 1; i < n; i += step) out.push(pts[i].toFixed(3));
    out.push('1');
    return { ease: LINEAR_OK ? `linear(${out.join(', ')})` : 'cubic-bezier(0.34, 1.4, 0.64, 1)', ms: Math.round(t * 1000) };
  }
  const E_LEAD = springEase(P.lead), E_TRAIL = springEase(P.trail), E_GROW = springEase(P.grow);
  document.documentElement.style.setProperty('--ease-grow', E_GROW.ease);

  // ------------------------------------------------------------------ audio sources (levels per 0.1 s)
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /** Speech: syllables in phrases, short breaths, a few long pauses, a steady noise floor (what denoise removes). */
  function genSpeech(n, seed, o) {
    o = o || {};
    const r = rng(seed), cl = new Float32Array(n), nz = new Float32Array(n);
    let u = o.lead !== undefined ? o.lead : 6, k = 0;
    const longs = new Set(o.longs || []);
    while (u < n) {
      const plen = Math.round((1.4 + r() * 3.4) * SR), loud = 0.34 + r() * 0.5, end = Math.min(n, u + plen);
      while (u < end) {
        const sl = 1 + Math.floor(r() * 3), pk = loud * (0.25 + r() * 0.75);
        for (let i = 0; i < sl && u < end; i++, u++) cl[u] = pk * (0.6 + 0.4 * r());
        if (r() < 0.3) u += 1;
      }
      k++;
      u += longs.has(k) ? Math.round((1.4 + r() * 1.5) * SR) : Math.round((0.25 + r() * 0.45) * SR);
    }
    const nf = o.noise !== undefined ? o.noise : 0.075;
    for (let i = 0; i < n; i++) nz[i] = nf + 0.04 * r();
    return { n, cl, nz, kind: 'speech' };
  }
  function genMusic(n, seed, o) {
    o = o || {};
    const r = rng(seed), cl = new Float32Array(n), nz = new Float32Array(n), beat = o.beat || 5;
    for (let u = 0; u < n; u++) {
      const ph = u % beat, bar = Math.floor(u / (beat * 4));
      const sect = (o.base || 0.5) + 0.14 * Math.sin(bar * 0.7 + seed);
      const pulse = ph === 0 ? 0.26 : ph === 1 ? 0.1 : 0;
      cl[u] = clamp(sect * (0.62 + 0.26 * r()) + pulse, 0, 0.97);
      nz[u] = 0.015;
    }
    for (let u = 0; u < Math.min(n, 30); u++) { cl[u] *= u / 30; cl[n - 1 - u] *= u / 30; }
    return { n, cl, nz, kind: 'music', beat };
  }
  /** A song: intro, verses, three choruses that repeat the same shape (what the chorus finder looks for). */
  function genSong(seed) {
    const parts = [['i', 140, 0.32], ['v', 290, 0.48], ['c', 300, 0.86], ['v', 280, 0.5], ['c', 300, 0.88], ['b', 200, 0.44], ['c', 320, 0.9], ['o', 120, 0.3]];
    const n = parts.reduce((a, p) => a + p[1], 0);
    const cl = new Float32Array(n), nz = new Float32Array(n), chorus = [];
    let u = 0;
    for (const [kind, len, lv] of parts) {
      const r = rng(kind === 'c' ? 99 : seed + u);
      if (kind === 'c') chorus.push([u, u + len]);
      for (let i = 0; i < len; i++, u++) {
        const ph = i % 5;
        cl[u] = clamp(lv * (0.66 + 0.24 * r()) + (ph === 0 ? 0.2 : 0) + 0.06 * Math.sin(i / 7), 0, 0.98);
        nz[u] = 0.02;
      }
    }
    for (let i = 0; i < 25; i++) { cl[i] *= i / 25; cl[n - 1 - i] *= i / 25; }
    return { n, cl, nz, kind: 'music', beat: 5, chorus };
  }
  const SRC = {
    voice: genSpeech(1610, 7, { longs: [3, 7, 11, 16, 20, 25, 29, 34] }),
    song: genSong(5),
    music1: genMusic(1300, 3, { base: 0.5 }),
    music2: genMusic(1050, 8, { base: 0.42, beat: 6 }),
    music3: genMusic(1500, 12, { base: 0.55, beat: 4 }),
    clipA: genSpeech(220, 21, { lead: 2, noise: 0.05 }),
    clipB: genSpeech(160, 33, { lead: 2, noise: 0.05 }),
    clipC: genSpeech(190, 44, { lead: 2, noise: 0.05 }),
    tts: genSpeech(64, 51, { lead: 2, noise: 0.005 }),
    dub: genSpeech(1610, 61, { lead: 18, noise: 0.004 }),
    long: genSpeech(73950, 71, { longs: [] }),
    sil: { n: 1e9, cl: null, nz: null, kind: 'sil' },
  };
  let recSeed = 300;
  function newRecSource(len) { const id = 'rec' + (++recSeed); SRC[id] = genSpeech(Math.max(len, 1), recSeed, { lead: 3, noise: 0.06 }); SRC_IDX[id] = Object.keys(SRC_IDX).length; return id; }
  const SRC_IDX = {}; Object.keys(SRC).forEach((k, i) => { SRC_IDX[k] = i; });
  const hash01 = i => { const x = Math.sin((i + 7) * 12.9898) * 43758.5453; return x - Math.floor(x); };

  // ------------------------------------------------------------------ the edit model
  // A project: one main line of pieces (it closes up when cut and opens when something goes in), tracks that play
  // under it, sound layers that stay adjustable, markers. Every change is a new doc in one history.
  const plen = p => p.e - p.s;
  const docLen = d => d.pieces.reduce((a, p) => a + plen(p), 0);
  function slice(ps, a, b) {
    const out = []; let u = 0;
    for (const p of ps) {
      const n = plen(p), s = Math.max(a, u), e = Math.min(b, u + n);
      if (e > s) { const q = Object.assign({}, p, { s: p.s + (s - u), e: p.s + (e - u) }); if (s > u) q.fi = 0; if (e < u + n) q.fo = 0; out.push(q); }
      u += n;
    }
    return out;
  }
  const cutP = (ps, a, b) => slice(ps, 0, a).concat(slice(ps, b, Infinity));
  const insP = (ps, at, ins) => slice(ps, 0, at).concat(ins.map(q => Object.assign({}, q)), slice(ps, at, Infinity));
  const withP = (d, pieces) => Object.assign({}, d, { pieces });
  function splitAt(d, u) { return withP(d, slice(d.pieces, 0, u).concat(slice(d.pieces, u, Infinity))); }
  function rangeSet(d, a, b, f) {
    const mid = slice(d.pieces, a, b).map(p => f(Object.assign({}, p)));
    return withP(d, slice(d.pieces, 0, a).concat(mid, slice(d.pieces, b, Infinity)));
  }
  function seamsOf(ps) { const out = []; let u = 0; for (let i = 0; i < ps.length - 1; i++) { u += plen(ps[i]); out.push(u); } return out; }
  function pieceRange(ps, i) { let u = 0; for (let k = 0; k < i; k++) u += plen(ps[k]); return [u, u + plen(ps[i])]; }
  function pieceIndexAt(ps, u) { let a = 0; for (let i = 0; i < ps.length; i++) { const b = a + plen(ps[i]); if (u < b) return i; a = b; } return ps.length - 1; }
  /** Where a source-anchored marker sits in the result now, or null when its audio was cut. */
  function markerPos(d, m) { let u = 0; for (const p of d.pieces) { if (p.src === m.src && m.f >= p.s && m.f < p.e) return u + m.f - p.s; u += plen(p); } return null; }
  function srcAt(d, u) { let a = 0; for (const p of d.pieces) { const n = plen(p); if (u < a + n) return { src: p.src, f: p.s + (u - a) }; a += n; } const l = d.pieces[d.pieces.length - 1]; return { src: l.src, f: l.e - 1 }; }

  const fadeCurve = x => Math.sin(clamp(x, 0, 1) * Math.PI / 2);
  const FL = new WeakMap();
  function flat(d) {
    let f = FL.get(d.pieces);
    if (f) return f;
    const L = docLen(d), cl = new Float32Array(L), nz = new Float32Array(L), g = new Float32Array(L), key = new Int32Array(L), pi = new Int16Array(L), sil = new Uint8Array(L);
    let u = 0;
    d.pieces.forEach((p, i) => {
      const S = SRC[p.src], n = plen(p);
      for (let k = 0; k < n; k++, u++) {
        const sf = p.s + k;
        if (S.kind === 'sil') { sil[u] = 1; } else { cl[u] = S.cl[sf % S.n]; nz[u] = S.nz[sf % S.n]; }
        key[u] = (SRC_IDX[p.src] || 0) * 100000 + sf; pi[u] = i;
        let gg = p.g === undefined ? 1 : p.g;
        if (p.fi && k < p.fi) gg *= fadeCurve((k + 0.5) / p.fi);
        if (p.fo && n - k <= p.fo) gg *= fadeCurve((n - k - 0.5) / p.fo);
        g[u] = gg;
      }
    });
    const va = new Float32Array(L);
    for (let i = 0; i < L; i++) { let m = 0; for (let j = Math.max(0, i - 3); j <= Math.min(L - 1, i + 6); j++) if (cl[j] > 0.12) { m = 1; break; } va[i] = m; }
    for (let i = 1; i < L; i++) va[i] = Math.max(va[i], va[i - 1] * 0.82);
    f = { L, cl, nz, g, key, pi, sil, va, seams: seamsOf(d.pieces) };
    FL.set(d.pieces, f);
    return f;
  }
  function pausesOf(d, min) {
    const f = flat(d), out = []; let s = -1;
    for (let u = 0; u <= f.L; u++) {
      const quiet = u < f.L && f.cl[u] < 0.03;
      if (quiet && s < 0) s = u;
      if (!quiet && s >= 0) { if (u - s >= min && s > 0 && u < f.L) out.push([s + 1, u - 1]); s = -1; }
    }
    return out;
  }
  /** Rebuilds pieces from the result units kept, in a new order: runs of neighbouring units become one piece. */
  function byOrder(d, order) {
    const f = flat(d), out = [];
    let i = 0;
    while (i < order.length) {
      let j = i; while (j + 1 < order.length && order[j + 1] === order[j] + 1 && f.pi[order[j + 1]] === f.pi[order[i]]) j++;
      const p = d.pieces[f.pi[order[i]]], [pa] = pieceRange(d.pieces, f.pi[order[i]]);
      const s = order[i] - pa, e = order[j] - pa + 1;
      const q = Object.assign({}, p, { s: p.s + s, e: p.s + e });
      if (s > 0) q.fi = 0; if (e < plen(p)) q.fo = 0;
      out.push(q); i = j + 1;
    }
    return withP(d, out);
  }
  function endFades(d, fi, fo) {
    const L = docLen(d);
    if (fi) { const n = sec(fi); d = rangeSet(splitAt(d, n), 0, n, p => Object.assign(p, { fi: plen(p) })); }
    if (fo) { const n = sec(fo); d = rangeSet(splitAt(d, L - n), L - n, L, p => Object.assign(p, { fo: plen(p) })); }
    return d;
  }
  function loopDoc(d, n) {
    let ps = [];
    while (docLen({ pieces: ps }) < n) ps = ps.concat(d.pieces.map(p => Object.assign({}, p)));
    ps = slice(ps, 0, n); ps[0].fi = Math.min(20, plen(ps[0])); ps[ps.length - 1].fo = Math.min(30, plen(ps[ps.length - 1]));
    return withP(d, ps);
  }
  function divideDoc(d, m, n) {
    const L = docLen(d);
    const pts = m === 'every' ? Array.from({ length: Math.floor((L - 1) / sec(n)) }, (_, i) => (i + 1) * sec(n)) : m === 'equal' ? Array.from({ length: n - 1 }, (_, i) => Math.round((i + 1) * L / n)) : (d.markers || []).map(x => markerPos(d, x)).filter(x => x !== null);
    pts.sort((a, b) => b - a).forEach(u => { d = splitAt(d, u); });
    return d;
  }
  let uid = 1;

  // ------------------------------------------------------------------ layers (sound settings that stay on the audio)
  const DN = ['很轻', '轻', '适中', '较强', '很强'];
  const DN_RES = [0.62, 0.46, 0.3, 0.16, 0.06];
  const LD = ['语音', '音乐', '广播'];
  const VOICES = ['升调', '降调', '卡通', '巨人', '机器人', '电话', '收音机', '对讲机', '大厅', '山谷'];
  const SEP = ['留人声', '留伴奏', '两轨'];
  const FX = ['均衡', '压缩', '限制', '混响', '回声', '滤波', '合唱', '镶边', '失真'];
  const RP = ['嗡声', '低频', '削波', '咔哒', '齿音', '直流', '噪声门'];
  const LAYER = {
    dn: { zh: '降噪', en: 'Denoise', ic: 'GraphicEq', c: 'lane0', val: v => DN[v] },
    ld: { zh: '拉齐', en: 'Level', ic: 'Equalizer', c: 'lane3', val: v => LD[v] },
    vol: { zh: '音量', en: 'Volume', ic: 'VolumeUp', c: 'lane2', val: v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + NB + 'dB', chip: true },
    rp: { zh: '修复', en: 'Repair', ic: 'Healing', c: 'lane5', val: v => [...v].map(i => RP[i]).join('、') || '无' },
    fx: { zh: '效果', en: 'Effects', ic: 'AutoAwesome', c: 'lane1', val: v => [...v].map(i => FX[i]).join('、') || '无' },
    vc: { zh: '变声', en: 'Voice', ic: 'RecordVoiceOver', c: 'lane6', val: v => VOICES[v], chip: true },
    sp: { zh: '变速', en: 'Speed', ic: 'Speed', c: 'lane4', val: v => v + '×', chip: true },
    ch: { zh: '声道', en: 'Channels', ic: 'SurroundSound', c: 'lane7', val: v => ['原样', '单声道', '立体声'][v.m || 0] },
    sep: { zh: '分离', en: 'Separate', ic: 'CallSplit', c: 'lane1', val: v => SEP[v], chip: true },
    rev: { zh: '倒放', en: 'Reverse', ic: 'FastRewind', c: 'lane7' },
  };
  const cloneLayer = l => Object.assign({}, l, { v: l.v instanceof Set ? new Set(l.v) : (l.v && typeof l.v === 'object') ? Object.assign({}, l.v) : l.v });
  const layerKey = l => JSON.stringify(Object.assign({}, l, { v: l.v instanceof Set ? [...l.v].sort() : l.v }));

  // ------------------------------------------------------------------ labels
  const TOOLS = {
    say: ['说一句', 'Say', 'Say'], edit: ['剪辑', 'Edit', 'ContentCut'], sound: ['声音', 'Sound', 'GraphicEq'], add: ['添加', 'Add', 'Add'],
    del: ['删除', 'Delete', 'Delete'], keep: ['只留', 'Keep', 'Keep'], move: ['移动', 'Move', 'Move'], fade: ['淡化', 'Fade', 'Fade'], vol: ['音量', 'Volume', 'VolumeUp'],
    copy: ['复制', 'Copy', 'ContentCopy'], split: ['分割', 'Split', 'Split'], dup: ['重复', 'Repeat', 'Repeat'], exact: ['精确', 'Exact', 'Straighten'],
    beats: ['节拍', 'Beats', 'Timer'], xpart: ['导出', 'Export', 'FileDownload'], all: ['全选', 'All', 'SelectAll'], chorus: ['副歌', 'Chorus', 'MusicNote'],
    pauses: ['停顿', 'Pauses', 'VolumeOff'], marker: ['标记', 'Marker', 'Flag'], divide: ['分段', 'Divide', 'ViewAgenda'], pieces: ['片段', 'Pieces', 'ViewList'],
    seams: ['接缝', 'Seams', 'Link'], loopto: ['循环到', 'Loop to', 'Repeat'],
    dn: ['降噪', 'Denoise', 'GraphicEq'], ld: ['拉齐', 'Level', 'Equalizer'], rp: ['修复', 'Repair', 'Healing'], fx: ['效果', 'Effects', 'AutoAwesome'],
    vc: ['变声', 'Voice', 'RecordVoiceOver'], sp: ['变速', 'Speed', 'Speed'], ch: ['声道', 'Channels', 'SurroundSound'], sep: ['分离', 'Separate', 'CallSplit'],
    rev: ['倒放', 'Reverse', 'FastRewind'], env: ['曲线', 'Curve', 'ShowChart'],
    rec: ['录音', 'Record', 'Mic'], music: ['音乐', 'Music', 'LibraryMusic'], audio: ['音频', 'Audio', 'AudioFile'], file: ['文件', 'File', 'Folder'],
    video: ['视频', 'Video', 'VideoFile'], tts: ['朗读', 'Speak', 'RecordVoiceOver'], sub: ['字幕', 'Subtitles', 'ClosedCaption'], sil: ['空白', 'Silence', 'SpaceBar'],
    clone: ['克隆', 'Clone', 'Person'], paste: ['粘贴', 'Paste', 'ContentPaste'],
    tvol: ['音量', 'Volume', 'VolumeUp'], duck: ['自动调小', 'Duck', 'Duck'], tfade: ['淡化', 'Fade', 'Fade'], tstart: ['起点', 'Start', 'Straighten'],
    swap: ['换一首', 'Replace', 'SwapHoriz'], mute: ['静音', 'Mute', 'VolumeOff'], solo: ['独听', 'Solo', 'Solo'], tdel: ['删除', 'Remove', 'Delete'],
    rename: ['改名', 'Rename', 'Edit'], details: ['详情', 'Details', 'Info'], history: ['历史', 'History', 'History'], saveas: ['另存', 'Copy', 'ContentCopy'],
    stt: ['转文字', 'To text', 'ClosedCaption'], pkg: ['工程包', 'Package', 'Inventory2'], delaudio: ['删除', 'Delete', 'Delete'],
    goto: ['跳到', 'Go to', 'Straighten'], speed: ['速度', 'Speed', 'SlowMotion'], loop: ['循环', 'Loop', 'Repeat'], spec: ['频谱', 'Spectrum', 'Equalizer'], fit: ['全部', 'Fit', 'FitScreen'],
    mlib: ['音频库', 'Library', 'LibraryMusic'], mfile: ['文件', 'File', 'Folder'], monline: ['在线', 'Online', 'Language'],
    mrename: ['改名', 'Rename', 'Edit'], msplit: ['分割', 'Split', 'Split'], mdel: ['删除', 'Delete', 'Delete'],
  };
  // The tools for each category. The first category follows what is touched (nothing, a selection, a piece, a
  // track, a marker); the others are the same everywhere. The most used come first.
  const CTX_TOOLS = {
    rest: ['dn', 'ld', 'pauses', 'music', 'rec', 'chorus', 'split', 'fade', 'vol', 'all', 'tts', 'fx'],
    range: ['del', 'keep', 'move', 'fade', 'vol', 'copy', 'split', 'dup', 'dn', 'exact', 'beats', 'xpart'],
    piece: ['del', 'move', 'vol', 'fade', 'copy', 'keep', 'seams', 'dup', 'dn', 'exact', 'xpart'],
    track: ['tvol', 'duck', 'tfade', 'tstart', 'swap', 'mute', 'solo', 'tdel'],
    marker: ['mrename', 'msplit', 'mdel'],
  };
  const CAT_TOOLS = {
    edit: ['split', 'all', 'chorus', 'pauses', 'marker', 'beats', 'divide', 'pieces', 'seams', 'loopto'],
    sound: ['dn', 'ld', 'vol', 'fade', 'rp', 'fx', 'vc', 'sp', 'ch', 'sep', 'rev', 'env'],
    add: ['rec', 'music', 'audio', 'file', 'video', 'tts', 'sub', 'sil', 'clone'],
    more: ['goto', 'speed', 'loop', 'spec', 'fit', 'rename', 'details', 'history', 'saveas', 'stt', 'pkg', 'delaudio'],
  };
  const CATS = ['ctx', 'edit', 'sound', 'add', 'more'];
  const CTX_NAME = { rest: ['常用', 'Quick'], range: ['选中的', 'Range'], piece: ['片段', 'Piece'], track: ['轨道', 'Track'], marker: ['标记', 'Marker'] };
  const CAT_NAME = { edit: ['剪辑', 'Edit'], sound: ['声音', 'Sound'], add: ['添加', 'Add'], more: ['更多', 'More'] };
  const LEVEL = {
    edit: ['剪辑', 'Edit'], sound: ['声音', 'Sound'], add: ['添加', 'Add'], music: ['音乐', 'Music'], fade: ['淡化', 'Fade'], rvol: ['音量', 'Volume'],
    say: ['说一句', 'Say'], plan: ['按这句话改', 'Plan'], export: ['导出', 'Export'], quality: ['音质', 'Quality'], tags: ['标签', 'Tags'], presets: ['预设', 'Presets'],
    tvol: ['音量', 'Volume'], duck: ['自动调小', 'Duck'], tfade: ['淡化', 'Fade'], tstart: ['起点', 'Start'], rec: ['录音', 'Record'], recset: ['录音设置', 'Microphone'],
    tts: ['朗读', 'Speak'], voices: ['音色', 'Voice'], sil: ['空白', 'Silence'], stt: ['转文字', 'Transcribe'], online: ['在线音乐库', 'Online music'], sub: ['字幕配音', 'Subtitles'],
    clone: ['克隆声音', 'Clone voice'], speed: ['试听速度', 'Speed'], exact: ['精确', 'Exact'], beats: ['节拍', 'Beats'], divide: ['分段', 'Divide'], pieces: ['片段', 'Pieces'],
    seams: ['接缝', 'Seams'], loopto: ['循环到', 'Loop to'], chorus: ['副歌', 'Chorus'], pauses: ['停顿', 'Pauses'], history: ['历史', 'History'], details: ['详情', 'Details'],
    rename: ['改名', 'Rename'], env: ['音量曲线', 'Volume curve'], hand: ['移动', 'Move'], copy: ['复制', 'Copy'],
  };
  const EN = { name: 'Interview' };

  // ------------------------------------------------------------------ the one-sentence parser (a small slice of phrase/PhraseParser)
  const tm = (m, s) => (+m) * 60 + (+s);
  function parsePlan(text, d, sel) {
    const L = docLen(d), steps = [], issues = [];
    let rest = text.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '');
    const take = (re, fn) => { rest = rest.replace(re, (...m) => { fn(m); return '｜'; }); };
    take(/做成铃声|设成铃声|当铃声/g, () => steps.push({ k: 'export', purpose: 'ring' }));
    take(/(?:剪掉|删掉|去掉)开头(\d+(?:\.\d+)?)秒(?:的空白)?/g, m => steps.push({ k: 'head', n: sec(+m[1]) }));
    take(/(?:剪掉|删掉|去掉)(?:结尾|最后)(\d+(?:\.\d+)?)秒/g, m => steps.push({ k: 'tail', n: sec(+m[1]) }));
    take(/(?:结尾|最后)(?:(\d+(?:\.\d+)?)秒)?淡出(?:(\d+(?:\.\d+)?)秒)?/g, m => steps.push({ k: 'fo', n: sec(+(m[1] || m[2] || 3)) }));
    take(/开头(?:(\d+(?:\.\d+)?)秒)?淡入(?:(\d+(?:\.\d+)?)秒)?/g, m => steps.push({ k: 'fi', n: sec(+(m[1] || m[2] || 2)) }));
    take(/(?:删掉|去掉|剪掉)(?:所有)?(?:超过(\d+(?:\.\d+)?)秒的)?(?:长)?停顿/g, m => steps.push({ k: 'pauses', n: sec(+(m[1] || 1)) }));
    take(/降噪|去(?:掉)?(?:底)?噪(?:音)?/g, () => steps.push({ k: 'layer', l: 'dn', v: 2 }));
    take(/(?:统一|拉齐)音量|音量拉齐|响度标准化/g, () => steps.push({ k: 'layer', l: 'ld', v: 0 }));
    take(/把(\d+):(\d+)到(\d+):(\d+)移到(开头|结尾|最后)/g, m => steps.push({ k: 'move', a: sec(tm(m[1], m[2])), b: sec(tm(m[3], m[4])), to: m[5] === '开头' ? 'start' : 'end' }));
    if (sel) take(/这段(?:的)?(?:声音|音量)?(?:调|变)?(小|大)(?:一)?点/g, m => steps.push({ k: 'rgain', db: m[1] === '小' ? -6 : 6 }));
    take(/(?:声音|音量)?太小(?:声)?了?|听不清/g, () => steps.push({ k: 'gain', db: 6 }));
    take(/(?:声音|音量)?太大(?:声)?了?|太吵了?/g, () => steps.push({ k: 'gain', db: -6 }));
    take(/导出(?:成)?(MP3|M4A|WAV|FLAC|mp3|m4a|wav|flac)/g, m => steps.push({ k: 'export', fmt: m[1].toUpperCase() }));
    rest.split(/[｜，,。；;、!！?？]|然后|之后|再|并且|接着/).forEach(x => { if (/[一-龥A-Za-z]{2,}/.test(x)) issues.push({ text: x }); });
    steps.forEach(s => { s.on = true; });
    return { text, steps, issues, sel: sel ? sel.slice() : null, L };
  }
  function stepLabel(s, d) {
    switch (s.k) {
      case 'head': return '删掉开头 ' + dur(s.n);
      case 'tail': return '删掉结尾 ' + dur(s.n);
      case 'fo': return '结尾淡出 ' + dur(s.n);
      case 'fi': return '开头淡入 ' + dur(s.n);
      case 'pauses': return '删掉 ' + pausesOf(d, s.n).length + NB + '处停顿';
      case 'layer': return s.l === 'ld' ? '统一音量' : LAYER[s.l].zh;
      case 'move': return '把 ' + cmp(s.a) + '–' + cmp(s.b) + ' 移到' + (s.to === 'start' ? '开头' : '结尾');
      case 'gain': return '整段 ' + (s.db > 0 ? '+' : '−') + Math.abs(s.db) + NB + 'dB';
      case 'rgain': return '选中的 ' + (s.db > 0 ? '+' : '−') + Math.abs(s.db) + NB + 'dB';
      case 'export': return s.purpose === 'ring' ? '做成铃声' : '导出 ' + s.fmt;
    }
    return '';
  }
  /** Deletions, moves and fades of a plan; positions refer to the audio before the plan (PlanRunner). */
  function planEdits(d, plan) {
    const f = flat(d), L = f.L, kill = new Uint8Array(L), on = plan.steps.filter(s => s.on);
    const marks = [];
    for (const s of on) {
      if (s.k === 'head') { for (let u = 0; u < Math.min(L, s.n); u++) kill[u] = 1; marks.push({ a: 0, b: Math.min(L, s.n), t: 'del' }); }
      if (s.k === 'tail') { for (let u = Math.max(0, L - s.n); u < L; u++) kill[u] = 1; marks.push({ a: Math.max(0, L - s.n), b: L, t: 'del' }); }
      if (s.k === 'pauses') for (const [a, b] of pausesOf(d, s.n)) { for (let u = a; u < b; u++) kill[u] = 1; marks.push({ a, b, t: 'del' }); }
    }
    let order = []; for (let u = 0; u < L; u++) if (!kill[u]) order.push(u);
    for (const s of on) if (s.k === 'move') {
      const clip = order.filter(u => u >= s.a && u < s.b); const rest = order.filter(u => u < s.a || u >= s.b);
      order = s.to === 'start' ? clip.concat(rest) : rest.concat(clip);
      marks.push({ a: s.a, b: s.b, t: 'move', to: s.to });
    }
    let nd = byOrder(d, order);
    for (const s of on) {
      const NL = docLen(nd);
      if (s.k === 'fo') nd = rangeSet(splitAt(nd, Math.max(0, NL - s.n)), Math.max(0, NL - s.n), NL, p => Object.assign(p, { fo: plen(p) }));
      if (s.k === 'fi') nd = rangeSet(splitAt(nd, Math.min(NL, s.n)), 0, Math.min(NL, s.n), p => Object.assign(p, { fi: plen(p) }));
      if (s.k === 'rgain' && plan.sel) { const a = order.indexOf(plan.sel[0]); const b = order.indexOf(plan.sel[1] - 1) + 1; if (a >= 0 && b > a) nd = rangeSet(nd, a, b, p => Object.assign(p, { g: (p.g || 1) * Math.pow(10, s.db / 20) })); }
      if (s.k === 'layer' && !nd.layers.some(l => l.k === s.l)) nd = Object.assign({}, nd, { layers: nd.layers.concat([{ id: 'l' + (++uid), k: s.l, v: s.v, on: true }]) });
      if (s.k === 'gain') { const old = nd.layers.find(l => l.k === 'vol'); nd = Object.assign({}, nd, { layers: old ? nd.layers.map(l => l === old ? Object.assign({}, l, { v: l.v + s.db }) : l) : nd.layers.concat([{ id: 'l' + (++uid), k: 'vol', v: s.db, on: true }]) }); }
    }
    for (const s of on) if (s.k === 'fo') marks.push({ a: Math.max(0, L - s.n), b: L, t: 'fo' });
    for (const s of on) if (s.k === 'fi') marks.push({ a: 0, b: Math.min(L, s.n), t: 'fi' });
    return { doc: nd, marks };
  }

  const LIBMUSIC = [{ name: '轻快的早晨', meta: '2:10', src: 'music1' }, { name: '钢琴小品', meta: '1:45', src: 'music2' }];
  const LIBAUDIO = [{ name: '补录：结尾一段', meta: '0:22', src: 'clipA' }, { name: '片头口播', meta: '0:16', src: 'clipB' }, { name: '电话录音', meta: '0:19', src: 'clipC' }];
  const ONLINE = [{ name: '晨光', meta: 'CC BY 4.0 · 可商用', src: 'music1' }, { name: '咖啡馆', meta: 'CC BY-NC 4.0 · 不可商用', src: 'music2' }, { name: '向前走', meta: 'CC0 · 可商用', src: 'music3' }];
  const SUBS = [['00:01', '大家好，欢迎收听本期节目。'], ['00:05', '今天我们聊聊城市里的小店。'], ['00:11', '先请出我们的嘉宾。'], ['00:14', '她在老城区开了十年的书店，见证了这条街的变化。'], ['00:22', '欢迎你。']];
  const SELCTX = new Set(['range', 'piece']);
  const AUDIO_MIN = 150, TRAY = 320, TRAY_FS = 400;
  const ROOMY = new Set(['export', 'say', 'plan', 'tts', 'sub', 'clone', 'list']);
  const LIVE_LEVELS = new Set(['p', 'fade', 'rvol', 'tvol', 'duck', 'tfade', 'tstart', 'sil', 'seams', 'loopto', 'divide', 'env', 'rename']);

  // ------------------------------------------------------------------ the workbench
  class Bench {
    constructor(scr, o) {
      this.scr = scr; this.o = o; this.live = !!o.live; this.lang = o.lang || 'zh';
      scr.lang = this.lang === 'en' ? 'en' : 'zh-CN';
      if (o.fs) scr.classList.add('fs13');
      if (o.showEdges) scr.classList.add('show-edges');
      scr.innerHTML = `
        <div class="sb"><span>9:41</span><span class="sig"><i></i><span class="bat"></span></span></div>
        <div class="hdr">
          <button class="rb" data-a="leave" aria-label="${this.t('回到音频库', 'Back to library')}">${ic('ArrowBack', 22)}</button>
          <button class="ttl" data-a="title"><span class="name"></span></button>
          <button class="xbtn" data-a="export">${ic('FileDownload', 18)}<span>${this.t('导出', 'Export')}</span></button>
        </div>
        <div class="tl"><canvas></canvas><div class="lchips"></div><div class="tlabels"></div><div class="ovl"></div></div>
        <div class="tp">
          <button class="tm mono" data-a="time"></button>
          <button class="play" data-a="play" aria-label="${this.t('播放', 'Play')}"></button>
          <div class="ur"><span class="ex"></span><button class="ub" data-a="undo" aria-label="${this.t('撤销', 'Undo')}">${ic('Undo', 22)}</button><button class="ub" data-a="redo" aria-label="${this.t('重做', 'Redo')}">${ic('Redo', 22)}</button></div>
        </div>
        <div class="bot">
          <div class="toast"></div>
          <div class="area"></div>
          <div class="tools"></div>
          <div class="cats"></div>
        </div>
        <div class="nb"><i></i></div>
        <div class="mhost"></div>`;
      const q = s => scr.querySelector(s);
      this.cv = q('canvas'); this.ctx = this.cv.getContext('2d'); this.tlEl = q('.tl'); this.chipsEl = q('.lchips'); this.labelsEl = q('.tlabels'); this.ovl = q('.ovl');
      this.areaEl = q('.area'); this.toolsEl = q('.tools'); this.catsEl = q('.cats'); this.botEl = q('.bot'); this.tmEl = q('.tp .tm'); this.leadEl = this.tmEl; this.playEl = q('.play'); this.cat = 'ctx'; this.markTool = null; this.toastEl = q('.toast'); this.mhost = q('.mhost');
      // the audio gives up height while a tall control grows in (and takes it back): redraw it at every size on the way
      if (window.ResizeObserver) new ResizeObserver(() => { if (this.measure()) this.kick(); }).observe(this.tlEl);
      this.nameEl = q('.ttl .name'); this.undoEl = q('[data-a=undo]'); this.redoEl = q('[data-a=redo]'); this.exEl = q('.tp .ex');

      this.doc = o.doc; this.hist = [{ label: o.origin || '打开', doc: this.doc }]; this.hi = 0; this.group = null;
      this.sel = null; this.ph = 0; this.track = null; this.marker = null;
      const L = docLen(this.doc);
      this.view = { a: new Spring(0, P.view, 0.02), b: new Spring(L, P.view, 0.02) };
      this.selDraw = new FlowSpan();
      this.stack = [{ t: 'strip', ctx: 'rest' }];
      this.playing = false; this.speed = 1; this.loop = false; this.spec = false; this.beats = false; this.snapBeats = true;
      this.gap = null; this.plan = null; this.hand = null; this.rec = null; this.marks = null; this.compareHold = false; this.proc = null;
      this.coach = null; this.seen = {}; this.clipboard = null; this.exp = null;
      this.colors();
      this.renderArea(true);
      if (this.live) this.bind();
    }
    t(zh, en) { return this.lang === 'en' ? en : zh; }
    get L() { return docLen(this.doc); }

    // ---------------------------------------------------------------- history: one list for everything
    commit(doc, label, keepSel) {
      this.hist = this.hist.slice(0, this.hi + 1); this.hist.push({ label, doc }); this.hi++;
      this.doc = doc; this.group = null; if (!keepSel) this.sel = null;
      this.ph = clamp(this.ph, 0, this.L);
      this.renderTop(); this.renderChips();
    }
    /** A setting changing as you move it: the whole visit to a level is one step in the history. */
    liveSet(doc, label, key) {
      if (this.group && this.group.key === key && this.group.idx === this.hi) { this.hist[this.hi] = { label, doc }; this.doc = doc; }
      else { this.commit(doc, label, true); this.group = { key, idx: this.hi }; }
      this.ph = clamp(this.ph, 0, this.L);
      this.renderTop(); this.renderChips(); this.kick();
    }
    undo() { if (this.dropPending()) return; if (this.hi > 0) this.jump(this.hi - 1); }
    redo() { if (this.dropPending()) return; if (this.hi < this.hist.length - 1) this.jump(this.hi + 1); }
    /** Undo first takes back what is waiting for a decision (a plan shown, a stretch in hand, a take being recorded). */
    dropPending() {
      if (this.plan) { this.plan = null; this.planMarks = null; this.stack = [this.rootView()]; this.renderArea(); this.kick(); return true; }
      if (this.hand) { this.handCancel(); return true; }
      if (this.rec) { this.recCancel(); return true; }
      return false;
    }
    jump(i) {
      this.stopPlay(); this.group = null;
      const before = this.L; this.hi = i; this.doc = this.hist[i].doc;
      this.ph = clamp(this.ph, 0, this.L);
      this.fitIfWhole(before);
      const v = this.top;
      this.sel = null;                                   // a selection is not part of the history
      if (this.track && !this.trk()) this.track = null;
      if (this.marker && !(this.doc.markers || []).some(m => m.id === this.marker)) this.marker = null;
      // Undo keeps you where you are when that place still makes sense.
      let keep = true;
      if (v.t === 'p') { keep = this.doc.layers.some(l => l.id === v.id); if (keep) v.orig = this.doc.layers.find(l => l.id === v.id); }
      else if (['tvol', 'duck', 'tfade', 'tstart'].includes(v.t)) keep = !!this.trk();
      else if (v.base !== undefined && LIVE_LEVELS.has(v.t)) { keep = !(v.t === 'rvol' || v.t === 'fade') || !!this.sel; if (keep) this.resetLevel(v); }
      else if (v.t === 'strip') keep = ['play', 'audio', 'rest'].includes(v.ctx) || (v.ctx === 'track' && !!this.trk()) || (SELCTX.has(v.ctx) && !!this.sel) || (v.ctx === 'marker' && !!this.marker);
      else if (['chorus', 'pauses', 'pieces', 'exact'].includes(v.t)) keep = false;
      if (!keep) { this.marks = null; this.chorus = null; this.stack.pop(); if (!this.stack.length || (this.top.t === 'strip' && ['range', 'piece', 'track', 'marker'].includes(this.top.ctx))) this.stack = [this.rootView()]; }
      this.renderTop(); this.renderChips(); this.renderArea(); this.kick();
    }
    resetLevel(v) {
      v.base = this.doc;
      if (v.t === 'rvol') v.db = 0;
      if (v.t === 'fade') v.f = this.sel ? { dir: null, shape: 0 } : { fi: 0, fo: 0 };
      if (v.t === 'sil') v.n = null;
      if (v.t === 'loopto' || v.t === 'divide') v.v = null;
    }
    fitIfWhole(before) {
      const a = this.view.a.t, b = this.view.b.t;
      if (a <= 0.5 && b >= before - 0.5) this.view.b.to(this.L, P.view);
      else { const span = b - a; const s = clamp(a, 0, Math.max(0, this.L - span)); this.view.a.to(s); this.view.b.to(Math.min(this.L, s + span)); }
    }
    leaveView() {
      if (this.rec) this.recCancel(true, true);
      if (this.hand) { this.hand = null; this.gap = null; this.scr.classList.remove('lifting'); }
      this.plan = null; this.planMarks = null; this.marks = null; this.chorus = null; this.compareHold = false; this.group = null;
      this.hideCoach();
    }
    reset(doc) {
      this.stopPlay(); this.leaveView(); this.closeModal();
      this.doc = doc; this.hist = [{ label: '打开', doc }]; this.hi = 0; this.sel = null; this.ph = 0; this.track = null; this.marker = null;
      this.exp = null; this.speed = 1; this.loop = false; this.spec = false; this.beats = false; this.snapBeats = true; this.seen = {}; this.clipboard = null; this.where = null; this.rwhere = null;
      this.view.a.snap(0); this.view.b.snap(docLen(doc)); this.stack = [{ t: 'strip', ctx: 'rest' }];
      this.renderArea(true); this.kick();
    }

    // ---------------------------------------------------------------- the bottom: stacked rows, nothing to go "back" from
    // stack[0] is what is touched (nothing, a selection, a piece, a track, a marker); an open tool's control sits on top.
    get top() { return this.stack[this.stack.length - 1]; }
    /** A selection that is exactly one piece (double tap) gets the piece's tools. */
    selIsPiece() { const ps = this.doc.pieces; if (!this.sel || ps.length < 2) return false; let u = 0; for (const p of ps) { const e = u + plen(p); if (u === this.sel[0] && e === this.sel[1]) return true; u = e; } return false; }
    rootView() {
      if (this.hand) return { t: 'strip', ctx: 'range' };
      if (this.track) return { t: 'strip', ctx: 'track' }; if (this.marker) return { t: 'strip', ctx: 'marker' };
      if (this.sel) return { t: 'strip', ctx: this.selIsPiece() ? 'piece' : 'range' }; return { t: 'strip', ctx: 'rest' };
    }
    resetStack() { this.group = null; this.stack = [this.rootView()]; this.renderArea(); }
    push(v) { this.group = null; this.stack.push(v); this.renderArea(); }
    /** Views that hold the timeline to taps on the playhead (and their own marks) while they are open. */
    get holding() { return this.top.t !== 'strip'; }
    /** System Back (an edge swipe, Esc): closes the innermost thing — an open control, then what is selected. */
    back(quiet) {
      this.hideCoach();
      if (this.mhost.innerHTML) { this.closeModal(); this.pendingFile = null; return; }
      const v = this.top;
      this.group = null; this.compareHold = false;
      if (v.t === 'plan') { this.plan = null; this.planMarks = null; }
      if (v.t === 'hand') { this.handCancel(); return; }
      if (v.t === 'rec') { this.recCancel(quiet); return; }
      if (v.t === 'export') { this.anim = null; this.exp = null; }
      if (v.t === 'chorus' || v.t === 'pauses') { this.marks = null; if (v.t === 'chorus') { this.chorus = null; this.sel = null; } }
      if (this.stack.length > 1) { this.stack = [this.rootView()]; this.renderArea(); this.kick(); return; }
      if (v.ctx !== 'rest') { this.sel = null; this.track = null; this.marker = null; this.stack = [this.rootView()]; this.renderArea(); this.kick(); return; }
      if (!quiet) this.toast(this.t('回到音频库', 'To the library'));
    }
    /** Another tool or a category was tapped: the open control steps aside. Settings it changed stay. */
    closeCtrl() { if (this.stack.length > 1) this.back(true); }

    renderArea(first) {
      if (this.stack.length === 1) this.markTool = null;
      const ctx = this.stack[0].ctx;
      if (ctx !== this._ctx) { if (ctx !== 'rest' && !(this.cat === 'sound' && SELCTX.has(ctx))) this.cat = 'ctx'; this._ctx = ctx; }
      const el = this.areaEl, v = this.top, open = v.t !== 'strip';
      const h0 = first ? 0 : this.areaEl.offsetHeight;
      const same = v === this._lastTop; this._lastTop = v;
      el.classList.toggle('still', same && !first);
      el.innerHTML = open ? this.viewHtml(v) : '';
      el.classList.toggle('open', open);
      this.renderTools(first, open);
      this.renderCats(first);
      this.bindSliders(); this.sizeRows();
      requestAnimationFrame(() => { const vb = this.areaEl.querySelector('.vb'); if (vb) { const u = () => vb.classList.toggle('more', vb.scrollTop + vb.clientHeight < vb.scrollHeight - 2); vb.onscroll = u; u(); } });
      this.scr.dataset.view = v.t + (v.ctx ? ':' + v.ctx : v.k ? ':' + v.k : '');
      this.scr.dataset.cat = this.cat;
      this.scr.classList.toggle('ctrl-open', open);
      // the audio makes room first (only for the few decisions that need it), then the control grows into it
      const tl0 = this.sizeAudio(false);
      if (!first && this.live && !reduced()) {
        const h1 = el.offsetHeight;
        if (Math.abs(h1 - h0) > 2) el.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: E_TRAIL.ms, easing: E_TRAIL.ease });
        if (tl0 && Math.abs(tl0 - this._tlh) > 2) this.tlEl.animate([{ height: tl0 + 'px' }, { height: this._tlh + 'px' }], { duration: E_TRAIL.ms, easing: E_TRAIL.ease });
      }
      this.renderTop(); this.renderChips(); this.kick();
    }
    toolList() {
      const ctx = this.stack[0].ctx;
      if (this.cat === 'ctx') return CTX_TOOLS[ctx].slice();
      const l = CAT_TOOLS[this.cat].slice();
      if (this.cat === 'add' && this.clipboard) l.unshift('paste');
      return l;
    }
    renderTools(first, open) {
      const tr = this.trk(), items = this.toolList(), sel = SELCTX.has(this.stack[0].ctx);
      const state = k => ({ mark: k === this.markTool, on: (k === 'loop' && this.loop) || (k === 'spec' && this.spec) || (k === 'beats' && this.beats && !sel) || (tr && ((k === 'mute' && tr.mute) || (k === 'solo' && tr.solo) || (k === 'duck' && tr.duck))), nc: k === 'stt' });
      const html = `<div class="strip-s ${open ? 'row' : 'grid'}">${items.map(k => this.act(k, state(k))).join('')}</div>`;
      if (html === this._toolsHtml) return;
      const keys = this.cat + ':' + items.join();
      this._toolsHtml = html; this.toolsEl.innerHTML = html;
      if (keys !== this._toolKeys && (!first || this.live)) this.toolsEl.querySelectorAll('.act').forEach((b, i) => { b.classList.add('in'); b.style.animationDelay = Math.min(i, 12) * 14 + 'ms'; });
      this._toolKeys = keys;
    }
    /** The bottom row: the one-sentence entry, then the categories; the current one is marked by a flowing pill. */
    renderCats(first) {
      const ctx = this.stack[0].ctx, en = this.lang === 'en';
      const name = k => k === 'ctx' ? CTX_NAME[ctx][en ? 1 : 0] : CAT_NAME[k][en ? 1 : 0];
      if (!this.catsEl.firstChild) {
        this.catsEl.innerHTML = `<button class="saypill" data-a="tool" data-k="say">${ic('Say', 18)}<span>${en ? 'Say' : '说一句'}</span></button><div class="tabs" role="tablist"><div class="tabs-in"><i class="ind"></i>${CATS.map(k => `<button class="tab" role="tab" data-a="cat" data-k="${k}"></button>`).join('')}</div></div>`;
      }
      this.catsEl.querySelector('.saypill').classList.toggle('mark', this.markTool === 'say');
      this.catsEl.querySelectorAll('.tab').forEach(b => { const k = b.dataset.k; const t = name(k); if (b.textContent !== t) b.textContent = t; b.classList.toggle('cur', k === this.cat); b.setAttribute('aria-selected', k === this.cat); });
      this.placeInd(first || !this.live);
    }
    placeInd(snap) {
      const tabs = this.catsEl.querySelector('.tabs-in'), cur = tabs && tabs.querySelector('.tab.cur'), ind = tabs && tabs.querySelector('.ind');
      if (!cur || !tabs.clientWidth) return;
      const l = cur.offsetLeft, r = tabs.clientWidth - (cur.offsetLeft + cur.offsetWidth);
      const sc = tabs.parentElement; if (sc.scrollWidth > sc.clientWidth + 1) { const want = cur.offsetLeft - (sc.clientWidth - cur.offsetWidth) / 2; if (cur.offsetLeft < sc.scrollLeft || cur.offsetLeft + cur.offsetWidth > sc.scrollLeft + sc.clientWidth) sc.scrollLeft = Math.max(0, want); }
      if (snap || this._indL === undefined || reduced()) ind.style.transition = 'none';
      else if (l !== this._indL) { const right = l > this._indL; ind.style.transition = right ? `right ${E_LEAD.ms}ms ${E_LEAD.ease}, left ${E_TRAIL.ms}ms ${E_TRAIL.ease} 40ms` : `left ${E_LEAD.ms}ms ${E_LEAD.ease}, right ${E_TRAIL.ms}ms ${E_TRAIL.ease} 40ms`; }
      ind.style.left = l + 'px'; ind.style.right = r + 'px'; this._indL = l;
    }

    // ---------------------------------------------------------------- the transport band under the audio
    renderTop() {
      this.nameEl.innerHTML = '<span class="nm">' + esc(this.lang === 'en' ? (this.o.nameEn || EN.name) : this.doc.name) + '</span>' + ic('ExpandMore', 18);
      const pend = !!(this.plan || this.hand || this.rec);
      this.undoEl.classList.toggle('dis', this.hi === 0 && !pend); this.redoEl.classList.toggle('dis', this.hi >= this.hist.length - 1 && !pend);
      this.playEl.innerHTML = ic(this.playing ? 'Pause' : 'PlayArrow', 30);
      const xb = this.scr.querySelector('.xbtn'); if (xb) xb.classList.toggle('mark', this.markTool === 'export');
      this.sizeAudio(true);
      this.renderTime();
    }
    /** The audio's height. It is set by the screen and the tracks, never by what the tools are doing: it leaves the
     *  tray a fixed budget, so categories, selections and every setting that changes the sound keep play in one place
     *  (a taller setting scrolls inside the tray, its buttons pinned). Only a decision that needs reading room (export,
     *  a sentence and its plan, text to speech, subtitles, a cloned voice, an audio to insert) takes height from the
     *  audio, never below its minimum, and gives it back when it closes. Returns the height before. */
    sizeAudio(anim) {
      const nTr = this.shownDoc().tracks.length, H = this.scr.clientHeight || 800;
      const oh = sel => { const e = this.scr.querySelector(sel); return e ? e.offsetHeight : 0; };
      let tray = this.o.fs ? TRAY_FS : TRAY;
      if (ROOMY.has(this.top.t)) {
        const vb = this.areaEl.querySelector('.vb');
        if (vb) tray = Math.max(tray, this.botEl.offsetHeight - vb.clientHeight + vb.scrollHeight);
      }
      const room = H - oh('.sb') - oh('.hdr') - oh('.tp') - oh('.nb');
      const tlh = Math.round(Math.max(AUDIO_MIN + nTr * 36, Math.min(clamp(H * 0.46, 220, 400) + nTr * 64, room - tray)));
      const old = this._tlh || 0; this._tlh = tlh;
      this.tlEl.style.height = tlh + 'px'; this.tlEl.style.minHeight = ''; this.tlEl.style.maxHeight = '';
      if (anim && old && Math.abs(old - tlh) > 2 && this.live && !reduced())
        this.tlEl.animate([{ height: old + 'px' }, { height: tlh + 'px' }], { duration: E_TRAIL.ms, easing: E_TRAIL.ease });
      return old;
    }
    levelName(v) { return v.t; }
    /** The time (or the selection, or what is in hand) at the left of the band. */
    renderTime() {
      const L = this.shownLen(), durL = u => this.lang === 'en' ? durEn(u) : dur(u);
      let h;
      if (this.hand && this.hand.mode === 'lift') h = `<span class="acc">${durL(this.hand.len)}</span><small>${clk(L)}</small>`;
      else if (this.hand) h = `<span class="acc">${clkd(this.hand.at)}</span><small>${durL(this.hand.len)}</small>`;
      else if (this.sel) h = `<span class="acc">${cmp(this.sel[0])}–${cmp(this.sel[1])}</span><small>${durL(this.sel[1] - this.sel[0])}</small>`;
      else if (this.rec) h = `<span>${clkd(this.rec.at + this.rec.len)}</span><small>${clk(L + this.rec.len)}</small>`;
      else h = `<span>${clkd(this.ph)}</span><small>${clk(L)}</small>`;
      if (h !== this._leadHtml) { this._leadHtml = h; this.tmEl.innerHTML = h; this.fitLead(); }
      const extra = (this.speed !== 1 ? `<span class="pillb on">${this.speed}×</span>` : '') + (this.loop ? `<span class="pillb on">${ic('Repeat', 16)}</span>` : '');
      if (extra !== this._extra) { this._extra = extra; this.exEl.innerHTML = extra; }
    }
    /** A long time (hours, a range over an hour) shrinks to fit beside play rather than running under it. */
    fitLead() {
      const s = this.tmEl.firstElementChild; if (!s) return;
      s.style.fontSize = '';
      const col = parseFloat(getComputedStyle(this.tmEl.parentElement).gridTemplateColumns) || 0;
      const room = col - 8, w = s.getBoundingClientRect().width;
      if (room > 0 && w > room + 0.5) s.style.fontSize = Math.max(11, Math.floor(parseFloat(getComputedStyle(s).fontSize) * room / w * 10) / 10) + 'px';
    }
    shownDoc() {
      if (this.plan && this.plan.after) return this.plan.res.doc;
      if (this.hand) return this.hand.rest;
      return this.doc;
    }
    shownLen() { const d = this.shownDoc(); let L = docLen(d); const sp = this.layersShown(d).find(l => l.k === 'sp'); if (sp) L = Math.round(L / sp.v); return L; }
    layersShown(d) {
      let ls = (d || this.doc).layers.slice();
      if (this.compareHold && this.top.t === 'p') ls = ls.filter(l => l.id !== this.top.id);
      return ls;
    }
    renderChips() {
      const d = this.shownDoc();
      let ls = this.layersShown(d).map(l => ({ l, cls: '' }));
      if (this.top.t === 'p') ls.forEach(x => { if (x.l.id === this.top.id) x.cls = 'cur'; });
      if (this.plan && !this.plan.after) this.plan.steps.forEach(s => { if (s.on && s.k === 'layer' && !d.layers.some(l => l.k === s.l)) ls.push({ l: { id: 'p' + s.l, k: s.l, v: s.v, on: true }, cls: 'dash' }); });
      if (this.o.chipState) ls = ls.map(x => Object.assign(x, this.o.chipState[x.l.k] || {}));
      const html = ls.map(({ l, cls, p, err }) => {
        const m = LAYER[l.k]; const nm = this.lang === 'en' ? m.en : m.zh;
        const val = m.chip ? ' ' + m.val(l.v) : '';
        const pr = this.proc && this.proc.id === l.id && this.proc.p < 1 ? this.proc.p : p;
        const lead = pr !== undefined ? ring(pr) : err ? ic('ErrorOutline', 14) : ic(m.ic, 14);
        return `<button class="lchip ${cls} ${err ? 'err' : ''}" style="--c:var(--${m.c})" data-a="chip" data-id="${l.id}">${lead}${esc(nm + val)}</button>`;
      }).join('');
      if (html !== this._chipsHtml) { this._chipsHtml = html; this.chipsEl.innerHTML = html; }
      this.chipsEl.style.display = ls.length ? 'flex' : 'none';
      this._hasChips = ls.length > 0;
    }

    // ---------------------------------------------------------------- level content (no headings: the name is at the leading end of the bar)
    viewHtml(v) {
      const fn = this['v_' + v.t];
      return fn ? fn.call(this, v) : '';
    }
    act(k, extra) {
      const T = TOOLS[k];
      const nc = extra && extra.nc ? `<span class="nc">${ic('CloudOff', 12)}</span>` : '';
      return `<button class="act ${extra && extra.mark ? 'mark' : ''} ${extra && extra.on ? 'on' : ''}" data-a="tool" data-k="${k}"><span class="ai">${ic(T[2], 22)}${nc}</span><span class="al">${this.lang === 'en' ? T[1] : T[0]}</span></button>`;
    }
    /**
     * Tools take at least 50 dp each (60 dp at font scale 1.3): 6 across at 360 dp, 7 at 390 dp. At rest they wrap
     * into as many rows as the category needs; while a control is open they make one row that scrolls, the next
     * tool showing half. An English word shrinks a little rather than break.
     */
    sizeRows() {
      const s = this.toolsEl.querySelector('.strip-s');
      if (s) {
        const n = s.querySelectorAll('.act').length, w = s.clientWidth;
        if (w) {
          const minW = this.o.fs ? 60 : 50, cap = Math.max(1, Math.floor(w / minW));
          if (s.classList.contains('grid')) s.style.setProperty('--cols', Math.min(cap, Math.max(n, 1)) < cap && n < cap ? cap : cap);
          else if (n <= cap) s.classList.add('fill');
          else {
            s.classList.remove('fill'); s.style.setProperty('--aw', (w / (cap + 0.5)).toFixed(2) + 'px');
            const m = s.querySelector('.mark'); if (m) s.scrollLeft = Math.max(0, m.offsetLeft - s.offsetLeft - (w - m.offsetWidth) / 2);
          }
          const upd = () => { s.classList.toggle('end', s.scrollLeft + s.clientWidth >= s.scrollWidth - 2); s.classList.toggle('start', s.scrollLeft <= 1); };
          s.onscroll = upd; upd();
        }
      }
      const fit = l => { l.style.fontSize = ''; let f = parseFloat(getComputedStyle(l).fontSize), guard = 10; while (l.scrollWidth > l.clientWidth + 0.5 && f > 10.5 && guard--) { f -= 0.5; l.style.fontSize = f + 'px'; } };
      this.toolsEl.querySelectorAll('.al').forEach(fit);
      this.catsEl.querySelectorAll('.tab').forEach(fit);
      const tb = this.catsEl.querySelector('.tabs');
      if (tb) { const u = () => { const more = tb.scrollWidth > tb.clientWidth + 1; tb.classList.toggle('more-r', more && tb.scrollLeft + tb.clientWidth < tb.scrollWidth - 2); tb.classList.toggle('more-l', more && tb.scrollLeft > 1); }; tb.onscroll = u; u(); }
      this.placeInd(true);
    }
    body(inner, action) { return `<div class="vb">${inner}</div>` + (action ? `<div class="vf">${action}</div>` : ''); }
    stops(key, labels, i) {
      const n = labels.length, pct = j => (n === 1 ? 50 : 18 / 3.4 + j * (100 - 2 * 18 / 3.4) / (n - 1));
      return `<div class="stops"><div class="st-t"><div class="st-line"></div><div class="st-fill" style="width:calc(${pct(Math.max(0, i))}% - 18px)"></div>` +
        labels.map((_, j) => `<div class="st-dot ${j <= i ? 'on' : ''}" style="left:${pct(j)}%"></div>`).join('') +
        (i >= 0 ? `<div class="st-knob" style="left:${pct(i)}%"></div>` : '') + labels.map((_, j) => `<button class="st-hit" style="left:${pct(j)}%" data-a="stop" data-k="${key}" data-i="${j}" aria-label="${labels[j]}"></button>`).join('') +
        `</div><div class="st-l">${labels.map((l, j) => `<span style="${j === i ? 'color:var(--accent);font-weight:700' : ''}">${l}</span>`).join('')}</div></div>`;
    }
    seg(key, opts, cur, cls) { return `<div class="seg ${cls || ''}">${opts.map(([v, l]) => `<button class="${cur !== null && cur !== undefined && String(v) === String(cur) ? 'on' : ''}" data-a="seg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`; }
    slider(key, label, val, min, max, fmt) {
      const p = (val - min) / (max - min) * 100;
      return `<div class="sld" data-sl="${key}" data-min="${min}" data-max="${max}"><div class="sh"><span>${label}</span><b>${fmt(val)}</b></div><div class="tr"><i style="width:${p}%"></i><u style="left:${p}%"></u></div></div>`;
    }
    sw(key, label, on) { return `<button class="swr" data-a="sw" data-k="${key}"><span class="sw-t"><b>${label}</b></span><span class="switch ${on ? 'on' : ''}"></span></button>`; }
    holdBtn() { return `<button class="chip hold ${this.compareHold ? 'on' : ''}" data-hold="1">${ic('Hold', 16)}${this.t('按住听原声', 'Hold: original')}</button>`; }
    wbtn(a, label, icon, cls) { return `<button class="bigbtn ${cls || ''}" data-a="${a}">${icon ? ic(icon, 20) : ''}${label}</button>`; }
    /** A decision that is really pending: the main button, and the way out worded beside it. */
    pair(out, main) { return `<div class="vrow">${out}${main || ''}</div>`; }

    v_p(v) {
      const l = this.doc.layers.find(x => x.id === v.id); if (!l) return '';
      const k = l.k;
      let b = '';
      if (k === 'dn') b = this.stops('dn', DN, l.v);
      else if (k === 'ld') b = this.seg('ld', LD.map((x, i) => [i, x]), l.v);
      else if (k === 'vol') b = this.slider('vol', this.t('音量', 'Volume'), l.v, -24, 12, x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x) + NB + 'dB');
      else if (k === 'rp') b = `<div class="chips">${RP.map((x, i) => `<button class="chip ${l.v.has(i) ? 'on' : ''}" data-a="rpt" data-i="${i}">${x}</button>`).join('')}</div>` + this.seg('rps', [[0, this.t('轻', 'Light')], [1, this.t('中', 'Medium')], [2, this.t('强', 'Strong')]], l.s === undefined ? 1 : l.s, 'sm');
      else if (k === 'fx') { const cur = l.cur === undefined ? 3 : l.cur; b = `<div class="chips">${FX.map((x, i) => `<button class="chip ${l.v.has(i) ? 'on' : ''} ${i === cur && l.v.has(i) ? 'cur' : ''}" data-a="fxt" data-i="${i}">${x}</button>`).join('')}</div>` + (l.v.has(cur) ? this.slider('fxa', FX[cur], l.amt || 40, 0, 100, x => Math.round(x) + '%') : ''); }
      else if (k === 'vc') b = `<div class="chips">${VOICES.map((x, i) => `<button class="chip ${l.v === i ? 'on' : ''}" data-a="vct" data-i="${i}">${x}</button>`).join('')}</div>`;
      else if (k === 'sp') b = this.stops('sp', ['0.5×', '0.75×', '1×', '1.25×', '1.5×', '2×'], [0.5, 0.75, 1, 1.25, 1.5, 2].indexOf(l.v)) + this.sw('keepPitch', this.t('音高不变', 'Keep pitch'), l.keep !== false);
      else if (k === 'ch') b = this.seg('chm', [[0, this.t('原样', 'As is')], [1, this.t('单声道', 'Mono')], [2, this.t('立体声', 'Stereo')]], l.v.m || 0) + this.slider('chw', this.t('宽度', 'Width'), l.v.w || 100, 0, 200, x => Math.round(x) + '%') + this.sw('chs', this.t('左右交换', 'Swap sides'), !!l.v.s);
      else if (k === 'sep') b = this.seg('sep', SEP.map((x, i) => [i, x]), l.v) + this.slider('sepS', this.t('分离强度', 'Strength'), l.s || 60, 0, 100, x => Math.round(x) + '%');
      return this.body(b + `<div class="chips">${this.holdBtn()}<button class="chip" data-a="rmlayer">${ic('Delete', 16)}${this.t('去掉', 'Remove')}</button></div>`);
    }
    v_fade(v) {
      const f = v.f;
      if (this.sel) return this.body(this.seg('fdir', [['in', this.t('淡入', 'Fade in')], ['out', this.t('淡出', 'Fade out')]], f.dir) + (f.dir ? this.seg('fshape', [[0, this.t('平滑', 'Smooth')], [1, this.t('线性', 'Linear')], [2, this.t('快', 'Fast')], [3, this.t('慢', 'Slow')]], f.shape, 'sm') : ''));
      return this.body(this.slider('efi', this.t('开头淡入', 'Fade in'), f.fi, 0, 10, x => x.toFixed(1) + NB + '秒') + this.slider('efo', this.t('结尾淡出', 'Fade out'), f.fo, 0, 10, x => x.toFixed(1) + NB + '秒'));
    }
    v_rvol(v) { return this.body(this.slider('rvol', this.t('选中的', 'Selection'), v.db || 0, -24, 12, x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x) + NB + 'dB')); }
    v_hand(v) {
      return this.body(`<div class="chips"><button class="chip" data-a="handTo" data-to="0">${this.t('放到开头', 'To start')}</button><button class="chip" data-a="handTo" data-to="end">${this.t('放到结尾', 'To end')}</button></div>`,
        this.pair(this.wbtn('back', this.t('放回去', 'Put back'), null, 'sec'), this.wbtn('handOk', this.t('放这里', 'Put it here'))));
    }
    v_say(v) {
      const sel = this.sel ? `<span class="scope">${this.t('选中的', 'Selection')}<button data-a="sayAll" aria-label="对整段说">${ic('Close', 16)}</button></span>` : '';
      const ex = (this.sel ? ['这段调小一点'] : []).concat(['人声清理', '剪掉开头5秒，结尾淡出3秒，导出MP3', '降噪之后统一音量', '删掉超过1秒的停顿', '把1:20到1:35移到开头', '声音太小了', '把它弄得好听点']);
      return this.body(`<div class="sayin">${sel}<textarea rows="1" placeholder="${this.t('想怎么改', 'What to change')}" aria-label="说一句要怎么改">${esc(v.text || '')}</textarea>` +
        `<button class="mic" data-a="mic" aria-label="语音输入">${ic(v.listening ? 'GraphicEq' : 'Mic', 22)}</button><button class="send ${v.text ? 'on' : ''}" data-a="send" aria-label="看看会怎么改">${ic('ArrowUpward', 20)}</button></div>` +
        `<div class="chips">${ex.map((x, i) => `<button class="chip ${i === (this.sel ? 1 : 0) ? 'acc' : ''}" data-a="ex" data-x="${esc(x)}">${esc(x)}</button>`).join('')}</div>`);
    }
    v_plan(v) {
      const p = this.plan, d = this.doc;
      const rows = p.steps.map((s, i) => {
        const num = ['head', 'tail', 'fo', 'fi', 'pauses', 'gain', 'rgain'].includes(s.k);
        const stp = num && s.on ? `<span class="stepper"><button data-a="stepN" data-i="${i}" data-d="-1" aria-label="少一点">${ic('Remove', 18)}</button><button data-a="stepN" data-i="${i}" data-d="1" aria-label="多一点">${ic('Add', 18)}</button></span>` : '';
        return `<div class="step-r ${s.on ? '' : 'off'}"><button class="chk ${s.on ? 'on' : ''}" data-a="stepOn" data-i="${i}" aria-label="这一步">${ic('Check', 18)}</button><div class="sx">${esc(stepLabel(s, d))}</div>${stp}</div>`;
      }).join('');
      const iss = p.issues.map(x => `<div class="issue"><div>「${esc(x.text)}」${this.t('没看懂', '?')}</div><div class="chips">${['降噪', '统一音量', '加点混响'].map(s => `<button class="chip" data-a="ex" data-x="${esc(s)}">${s}</button>`).join('')}<button class="chip quiet" data-a="ai">AI</button></div></div>`).join('');
      const L0 = docLen(d), L1 = docLen(p.res.doc);
      return this.body(`${this.seg('after', [[0, this.t('现在', 'Now') + ' ' + clk(L0)], [1, this.t('改后', 'After') + ' ' + clk(L1)]], p.after ? 1 : 0, 'sm')}${rows}${iss}`,
        this.pair(this.wbtn('back', this.t('不改了', 'Discard'), null, 'sec'), p.steps.some(s => s.on) ? this.wbtn('apply', this.t('应用', 'Apply')) : ''));
    }
    v_export(v) {
      const e = this.exp;
      if (e.stage === 'run') return this.body(`<div class="vrow"><div class="grow pbar"><i style="width:${Math.round(e.p * 100)}%"></i></div><span class="mono pct">${Math.round(e.p * 100)}%</span></div>`, this.pair(this.wbtn('expCancel', this.t('取消', 'Cancel'), null, 'sec')));
      if (e.stage === 'done') {
        const what = e.purpose === 'ring' ? this.t('已设为来电铃声', 'Set as ringtone') : e.purpose === 'share' ? this.t('已分享', 'Shared') : this.t('已保存', 'Saved');
        return this.body(`<div class="row big">${ic('CheckCircle', 24)}<span class="rx"><b>${what}</b><span>${esc(e.name)}.${e.purpose === 'ring' ? 'mp3' : e.fmt.toLowerCase()}</span></span></div>${e.purpose === 'file' ? `<div class="chips"><button class="chip" data-a="share">${ic('Share', 16)}${this.t('分享', 'Share')}</button><button class="chip" data-a="openOther">${ic('PlayArrow', 16)}${this.t('用别的应用听', 'Open with')}</button></div>` : ''}`, this.pair(this.wbtn('back', this.t('完成', 'Done'), null, 'sec')));
      }
      const purp = this.seg('xp', [['file', this.t('存文件', 'File')], ['share', this.t('分享', 'Share')], ['ring', this.t('铃声', 'Ring')]], e.purpose, 'acc');
      const scope = this.sel ? this.seg('xs', [['all', this.t('整段', 'All') + ' ' + clk(this.L)], ['sel', this.t('选中的', 'Selection') + ' ' + clk(this.sel[1] - this.sel[0])]], e.scope, 'sm') : '';
      let mid;
      if (e.purpose === 'ring') mid = this.seg('xr', [['call', this.t('来电', 'Calls')], ['note', this.t('通知', 'Alerts')], ['alarm', this.t('闹钟', 'Alarm')]], e.ring, 'sm');
      else {
        const fm = ['MP3', 'M4A', 'WAV', 'FLAC', 'OPUS', 'AMR'];
        const open = e.open, chip = (k, icn, zh, en) => `<button class="chip ${open === k ? 'on' : ''}" data-a="xsub" data-s="${k}">${ic(icn, 16)}${this.t(zh, en)}</button>`;
        let more = '';
        if (open === 'quality') more = `${this.seg('xrate', [[0, this.t('原样', 'As is')], [44100, '44.1k'], [48000, '48k']], e.rate || 0, 'sm')}${this.seg('xch', [[0, this.t('原样', 'As is')], [1, this.t('单声道', 'Mono')], [2, this.t('立体声', 'Stereo')]], e.ch || 0, 'sm')}${this.sw('xlim', this.t('压低峰值', 'Limit peaks'), !!e.limit)}`;
        if (open === 'tags') more = `<div class="field"><span class="fv"><span class="fl">标题</span>${esc(e.name)}</span></div><div class="field"><span class="fv"><span class="fl">作者</span>&nbsp;</span></div><button class="row big" data-a="cover">${ic('Image', 22)}<span class="rx"><b>封面</b></span>${ic('KeyboardArrowRight', 20, 'chv')}</button>`;
        if (open === 'presets') more = `<div class="chips"><button class="chip" data-a="preset" data-f="MP3" data-q="128">播客 MP3 128</button><button class="chip" data-a="preset" data-f="FLAC" data-q="0">存档 FLAC</button><button class="chip quiet" data-a="presetSave">${ic('Add', 16)}${this.t('存为预设', 'Save preset')}</button></div>`;
        mid = `<div class="chips">${fm.map(f => `<button class="chip ${e.fmt === f ? 'on' : ''}" data-a="xf" data-f="${f}">${f}</button>`).join('')}</div>` +
          (e.fmt === 'MP3' || e.fmt === 'M4A' ? this.seg('xq', [[128, '128'], [192, '192'], [256, '256'], [320, '320 kbps']], e.q, 'sm') : '') +
          `<div class="chips"><button class="chip" data-a="xname">${ic('Edit', 16)}${esc(e.name)}</button>${chip('tags', 'Label', '标签', 'Tags')}${chip('quality', 'Tune', '音质', 'Quality')}${chip('presets', 'Tune', '预设', 'Presets')}${this.doc.pieces.length > 1 && !this.sel ? `<button class="chip ${e.split ? 'on' : ''}" data-a="xsplit">${ic('ViewAgenda', 16)}${this.t('每段一个', 'Per piece')}</button>` : ''}</div>` + more;
      }
      const clip = e.clipWarn ? `<div class="status warn">${ic('WarningAmber', 18)}<span class="stx">${this.t('有地方会削波', 'Will clip')}</span><button class="sa" data-a="sw" data-k="xlim">${e.limit ? this.t('已压低', 'Limited') : this.t('压低峰值', 'Limit')}</button></div>` : '';
      const lab = e.purpose === 'ring' ? this.t('设为铃声', 'Set ringtone') : e.purpose === 'share' ? this.t('分享', 'Share') : this.t('导出', 'Export');
      return this.body(`${scope}${purp}${mid}${clip}`, this.pair(this.wbtn('back', this.t('取消', 'Cancel'), null, 'sec'), this.wbtn('expGo', lab)));
    }
    v_music(v) {
      const src = v.src || 'lib';
      const seg = this.seg('msrc', [['lib', this.t('音频库', 'Library')], ['file', this.t('手机文件', 'Files')], ['online', this.t('在线', 'Online')]], src, 'sm');
      const rows = (items, pick) => items.map((it, i) => `<button class="mtrack" data-a="${pick}" data-i="${i}"><span class="mini-play" data-a="pv" data-i="${i}">${ic('PlayArrow', 20)}</span><span class="mx"><b>${esc(it.name)}</b><span>${it.meta || ''}</span></span><span class="use">${this.t('使用', 'Use')}</span></button>`).join('');
      if (src === 'online') {
        if (this.o.musicOff) return this.body(seg + `<div class="ncrow"><span class="itile" style="--c:var(--faint)">${ic('CloudOff', 22)}</span><span class="rx"><b>${this.t('未接通', 'Not connected')}</b><span>${this.t('这个版本没有配置音乐库服务器。', 'No music server in this build.')}</span></span></div>`);
        return this.body(seg + `<div class="chips">${['轻快', '舒缓', '节日', '播客'].map((p, i) => `<button class="chip ${i === (v.pill || 0) ? 'on' : ''}" data-a="pill" data-i="${i}">${p}</button>`).join('')}</div>` + rows(ONLINE, 'pickOnline'));
      }
      return this.body(seg + rows(LIBMUSIC, 'pickLib'));
    }
    v_tvol() { const tr = this.trk(); return this.body(this.slider('tvol', this.t('音量', 'Volume'), Math.round(tr.gain * 100), 0, 150, x => Math.round(x) + '%')); }
    v_duck() { const tr = this.trk(); return this.body(this.sw('duck', this.t('有人说话时', 'Under speech'), tr.duck) + (tr.duck ? this.slider('duckTo', this.t('调到', 'Down to'), Math.round(tr.duckTo * 100), 0, 100, x => Math.round(x) + '%') : '')); }
    v_tfade() { const tr = this.trk(); return this.body(this.slider('tfi', this.t('淡入', 'In'), tr.fi / SR, 0, 10, x => x.toFixed(1) + NB + '秒') + this.slider('tfo', this.t('淡出', 'Out'), tr.fo / SR, 0, 10, x => x.toFixed(1) + NB + '秒')); }
    v_tstart() { const tr = this.trk(); return this.body(this.slider('toff', this.t('音乐从', 'From'), (tr.off || 0) / SR, 0, 60, x => x.toFixed(1) + NB + '秒') + this.sw('tloop', this.t('循环', 'Loop'), tr.loop !== false)); }
    v_list(v) {
      const rows = v.items.map((it, i) => `<button class="mtrack" data-a="${v.pick}" data-i="${i}"><span class="mini-play" data-a="pv" data-i="${i}">${ic('PlayArrow', 20)}</span><span class="mx"><b>${esc(it.name)}</b><span>${it.meta || ''}</span></span><span class="use">${this.t('使用', 'Use')}</span></button>`).join('');
      const where = v.where ? this.seg('where', [['ins', this.t('插入', 'Insert')], ['end', this.t('接在结尾', 'At end')], ['mix', this.t('叠加', 'Overlay')]], this.where || 'ins', 'sm') : '';
      const pills = v.pills ? `<div class="chips">${v.pills.map((p, i) => `<button class="chip ${i === (v.pill || 0) ? 'on' : ''}" data-a="pill" data-i="${i}">${p}</button>`).join('')}</div>` : '';
      return this.body(`${where}${pills}${rows}`);
    }
    v_rec(v) {
      const rs = this.recSet || {}, r = this.rec || { len: 0, running: false };
      const bars = Array.from({ length: 24 }, (_, i) => { const h = r.running ? 15 + 85 * Math.abs(Math.sin(i * 1.7 + r.len * 0.9)) * (0.4 + 0.6 * hash01(i + Math.floor(r.len))) : 8; return `<i style="height:${h.toFixed(0)}%"></i>`; }).join('');
      const set = v.settings ? `${this.seg('mic', [[0, '跟随系统'], [1, '内置'], [2, '有线'], [3, '蓝牙']], rs.mic || 0, 'sm')}${this.seg('rch', [[1, '单声道'], [2, '立体声']], rs.rch || 1, 'sm')}${this.slider('rgain', this.t('增益', 'Gain'), 0, -12, 24, x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(Math.round(x)) + NB + 'dB')}${this.sw('mon', this.t('耳机监听', 'Monitor'), !!rs.mon)}` : '';
      return this.body(`<div class="vrow"><button class="recbtn ${r.running ? 'on' : ''}" data-a="recGo" aria-label="${this.t('录音', 'Record')}">${ic(r.running ? 'Pause' : 'Mic', 26)}</button><span class="rectime mono">${clkd(r.len)}</span><div class="meter grow">${bars}</div><button class="cb ${v.settings ? 'on' : ''}" data-a="recSet" aria-label="录音设置">${ic('Tune', 20)}</button></div>${this.seg('rwhere', [['ins', this.t('插入', 'Insert')], ['mix', this.t('叠加', 'Overlay')]], this.rwhere || 'ins', 'sm')}${set}`,
        r.len > 0 ? this.pair(this.wbtn('back', this.t('不要了', 'Discard'), null, 'sec'), this.wbtn('recOk', this.t('完成', 'Done'))) : '');
    }
    v_tts(v) {
      const s = v.s || {};
      const voices = s.voices ? `${this.seg('vsrc', [[0, this.t('本机', 'On phone')], [1, this.t('在线', 'Online')]], s.src || 0, 'sm')}${(s.src || 0) === 0 ? `<div class="chips">${['小美', '小宇', '晓晓', 'English'].map((x, i) => `<button class="chip ${i === (s.voice || 0) ? 'on' : ''}" data-a="voice" data-i="${i}">${x}</button>`).join('')}</div>` : this.o.voiceOff ? `<div class="status">${ic('CloudOff', 18)}<span class="stx">${this.t('在线音色未接通：这个版本没有配置语音服务器', 'Online voices not connected')}</span></div>` : `<div class="chips">${['温柔女声', '沉稳男声', '我的声音'].map((x, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-a="voice" data-i="${i}">${x}</button>`).join('')}<button class="chip quiet" data-a="tool" data-k="clone">${ic('Add', 16)}${this.t('克隆', 'Clone')}</button></div>`}` : '';
      return this.body(`<div class="textarea">${esc(s.text || '')}<span style="color:var(--faint)">${s.text ? '' : this.t('要读的文字', 'Text to read')}</span></div><div class="vrow"><button class="chip ${s.voices ? 'on' : ''}" data-a="ttsVoices">${ic('RecordVoiceOver', 16)}小美 · ${this.t('本机', 'phone')}</button><div class="grow">${this.seg('trate', [[0, this.t('慢', 'Slow')], [1, this.t('正常', 'Normal')], [2, this.t('快', 'Fast')]], s.rate !== undefined ? s.rate : 1, 'sm')}</div></div>${voices}`,
        s.text ? this.pair(this.wbtn('ttsGo', this.t('生成', 'Generate'))) : '');
    }
    v_sil(v) { return this.body(this.seg('siln', [[0.5, '0.5秒'], [1, '1秒'], [2, '2秒'], [3, '3秒'], [5, '5秒']], v.n)); }
    v_stt() { return this.body(`<div class="ncrow"><span class="itile" style="--c:var(--faint)">${ic('CloudOff', 22)}</span><span class="rx"><b>${this.t('未接通', 'Not connected')}</b><span>${this.t('这个版本没有接通转写服务，不会上传音频。', 'No transcription service in this build.')}</span></span></div><div class="chips"><button class="chip" data-a="export">${ic('FileDownload', 16)}${this.t('导出音频', 'Export audio')}</button></div>`); }
    v_online(v) {
      if (this.o.musicOff) return this.body(`<div class="ncrow"><span class="itile" style="--c:var(--faint)">${ic('CloudOff', 22)}</span><span class="rx"><b>${this.t('未接通', 'Not connected')}</b><span>${this.t('这个版本没有配置音乐库服务器。', 'No music server in this build.')}</span></span></div><div class="chips"><button class="chip" data-a="tool" data-k="mfile">${ic('Folder', 16)}${this.t('用手机里的音乐', 'Use a file')}</button></div>`);
      return this.v_list(Object.assign(v, { title: this.t('在线音乐库', 'Online music'), pick: 'pickOnline', pills: ['轻快', '舒缓', '节日', '播客'], items: ONLINE }));
    }
    v_sub(v) {
      const s = v.s || {};
      if (!s.lines) return this.body(`<div class="cards c2"><button class="pc" data-a="subFile">${ic('ClosedCaption', 24)}${this.t('字幕文件', 'File')}</button><button class="pc" data-a="subFile">${ic('ContentPaste', 24)}${this.t('粘贴文字', 'Paste')}</button></div>`);
      const lines = SUBS.map((x, i) => `<div class="sub-line"><span class="tm">${x[0]}</span><span class="tx">${x[1]}</span>${s.done || (s.run !== undefined && i < s.run) ? (i === 3 ? '<span class="badge fast">1.2×</span>' : '<span class="badge ok">✓</span>') : ''}</div>`).join('');
      return this.body(`<div class="vrow"><button class="chip" data-a="ttsVoices">${ic('RecordVoiceOver', 16)}小美 · ${this.t('本机', 'phone')}</button><span class="grow"></span>${s.run !== undefined && !s.done ? `<span class="mono">${s.run}/${SUBS.length}</span>` : ''}</div>${lines}`,
        s.run === undefined ? this.wbtn('subGo', this.t('生成', 'Generate')) : '');
    }
    v_clone(v) {
      const s = v.s || {};
      const chk = (ok, t) => `<div class="vrow">${ic(ok ? 'CheckCircle' : 'ErrorOutline', 18)}<span class="grow">${t}</span></div>`;
      return this.body(`<button class="swr" data-a="sw" data-k="consent"><span class="chk ${s.ok ? 'on' : ''}">${ic('Check', 18)}</span><span class="sw-t"><b>${this.t('这是我本人的声音，或已取得本人同意', 'This is my voice, or I have consent')}</b></span></button>` +
        `<div class="textarea">今天天气不错，我们出去走走吧。</div>` +
        `<div class="vrow"><button class="recbtn ${s.rec === 'on' ? 'on' : ''}" data-a="cloneRec" aria-label="录音">${ic(s.rec === 'on' ? 'Stop' : 'Mic', 26)}</button><span class="rectime mono grow">${s.rec === 'done' ? '00:05.2' : s.rec === 'on' ? '00:03.1' : '00:00.0'}</span></div>` +
        (s.rec === 'done' ? chk(true, '5.2 秒') + chk(true, this.t('音量和音质没问题', 'Level OK')) : ''),
        s.rec === 'done' && s.ok ? this.wbtn('cloneOk', this.t('保存为音色', 'Save voice')) : '');
    }
    v_goto() { return this.body(`<div class="vrow"><button class="chip" data-a="nudge" data-d="-100">−10秒</button><button class="chip" data-a="nudge" data-d="-10">−1秒</button><span class="grow"></span><button class="chip" data-a="nudge" data-d="10">+1秒</button><button class="chip" data-a="nudge" data-d="100">+10秒</button></div>`); }
    v_speed() { return this.body(this.stops('pspd', ['0.5×', '0.75×', '1×', '1.25×', '1.5×', '2×'], [0.5, 0.75, 1, 1.25, 1.5, 2].indexOf(this.speed))); }
    v_exact() {
      const s = this.sel || [0, 0];
      const f = (k, lab, u) => `<div class="field mono"><span class="fv"><span class="fl">${lab}</span><span class="fvv">${clkd(u)}</span></span><span class="stepper"><button data-a="nudgeSel" data-k="${k}" data-d="-1" aria-label="早一点">${ic('Remove', 18)}</button><button data-a="nudgeSel" data-k="${k}" data-d="1" aria-label="晚一点">${ic('Add', 18)}</button></span></div>`;
      return this.body(f(0, this.t('起点', 'Start'), s[0]) + f(1, this.t('终点', 'End'), s[1]));
    }
    v_beats(v) { return this.body(`<div class="vrow"><button class="chip" data-a="bpm" data-m="0.5">½×</button><span class="grow rectime mono" style="text-align:center">${v.bpm || 120} BPM</span><button class="chip" data-a="bpm" data-m="2">2×</button></div><div class="chips"><button class="chip ${this.beats ? 'on' : ''}" data-a="sw" data-k="showBeats">${ic('Timer', 16)}${this.t('显示节拍', 'Show beats')}</button><button class="chip ${this.snapBeats !== false ? 'on' : ''}" data-a="sw" data-k="snap">${ic('Straighten', 16)}${this.t('选择时吸附', 'Snap')}</button></div>`); }
    v_divide(v) { const m = v.m || 'every', n = v.n || (m === 'every' ? 30 : 4); return this.body(`${this.seg('dm', [['every', this.t('每隔', 'Every')], ['equal', this.t('平均', 'Equal')], ['marks', this.t('按标记', 'At marks')]], v.v ? m : null)}${m !== 'marks' ? `<div class="vrow"><span class="stepper"><button data-a="divN" data-d="-1">${ic('Remove', 18)}</button><b>${m === 'every' ? n + NB + '秒' : n + NB + '段'}</b><button data-a="divN" data-d="1">${ic('Add', 18)}</button></span></div>` : ''}`); }
    v_pieces() { const ps = this.doc.pieces; let u = 0; return this.body(`<div class="chips">${ps.map((p, i) => { const a = u; u += plen(p); return `<button class="chip" data-a="pickPiece" data-i="${i}"><b>${i + 1}</b>&nbsp;${cmp(a)}–${cmp(u)}</button>`; }).join('')}</div>`); }
    v_seams() { return this.body(this.seg('seam', [[0, this.t('直接接', 'None')], [10, '10ms'], [20, '20ms'], [50, '50ms']], this.doc.seam || 0)); }
    v_loopto(v) { return this.body(this.seg('lt', [[30, '30秒'], [60, '1分钟'], [90, '90秒'], [120, '2分钟']], v.v)); }
    v_chorus(v) {
      const c = this.chorus;
      if (!c.length) return this.body(`<div class="ncrow"><span class="itile" style="--c:var(--faint)">${ic('MusicNote', 22)}</span><span class="rx"><b>${this.t('没找到副歌', 'No chorus found')}</b></span></div>`);
      return this.body(`${this.seg('cand', c.map((x, i) => [i, cmp(x[0])]), v.i || 0)}${this.seg('clen', [[0, this.t('原长', 'Found')], [200, '20秒'], [300, '30秒']], v.len || 0, 'sm')}`,
        this.pair(this.wbtn('chorusKeep', this.t('只留这段', 'Keep'), 'Keep', 'sec'), this.wbtn('ring', this.t('做铃声', 'Ringtone'), 'NotificationsActive')));
    }
    v_pauses(v) {
      const mk = this.marks || [], on = mk.filter(m => m.on).length, gain = mk.filter(m => m.on).reduce((a, m) => a + m.b - m.a, 0);
      return this.body(this.seg('pmin', [[5, this.t('半秒', '0.5 s')], [10, this.t('1秒', '1 s')], [20, this.t('2秒', '2 s')]], v.min || 10),
        this.wbtn('pausesGo', `${this.t('删掉', 'Remove')} ${on}${this.t(' 处', '')} · −${dur(gain)}`));
    }
    v_history() {
      const n = this.hist.length;
      const rows = this.hist.map((h, i) => ({ h, i })).reverse().map(({ h, i }, k) => {
        const cls = (i === this.hi ? 'now' : i > this.hi ? 'redo' : '') + (k === 0 ? ' first' : '') + (k === n - 1 ? ' last' : '');
        return `<button class="hist-r ${cls}" data-a="jump" data-i="${i}"><span class="rail"><i></i></span><span class="lt">${esc(i === 0 ? this.t('最开始', 'Original') : h.label)}</span>${i === this.hi ? `<span class="ld">${this.t('现在', 'Now')}</span>` : ''}</button>`;
      }).join('');
      return `<div class="vb" style="gap:0">${rows}</div>`;
    }
    v_details() {
      const cr = this.doc.tracks.filter(t => t.credit).map(t => `<div class="credit"><b>${esc(t.name)}</b><span>${esc(t.credit)}</span></div>`).join('');
      return this.body(`<dl class="kv"><dt>时长</dt><dd>${clk(this.L)}</dd><dt>格式</dt><dd>48 kHz · 单声道</dd><dt>来源</dt><dd>${esc(this.o.source || '手机里的文件 · 采访0412.m4a')}</dd><dt>占用</dt><dd>38 MB</dd><dt>备份</dt><dd>今天 10:12</dd></dl>${cr}<div class="chips"><button class="chip" data-a="restore">${ic('Restore', 16)}${this.t('从备份恢复', 'Restore backup')}</button></div>`);
    }
    v_rename() { return this.body(`<div class="field"><input data-in="name" value="${esc(this.doc.name)}" aria-label="名称"></div>`); }
    v_err(v) { return this.body(`<div class="status err">${ic('ErrorOutline', 18)}<span class="stx">${esc(v.msg)}</span></div><div class="chips"><button class="chip" data-a="retry">${ic('Refresh', 16)}${this.t('重试', 'Retry')}</button><button class="chip" data-a="rmlayer">${ic('Delete', 16)}${this.t('去掉', 'Remove')}</button></div>`); }
    v_proc(v) { return this.body(`<div class="vrow"><div class="grow pbar"><i style="width:${v.p}%"></i></div><span class="mono pct">${v.p}%</span></div><div class="chips"><button class="chip" data-a="rmlayer">${ic('Close', 16)}${this.t('取消', 'Cancel')}</button></div>`); }
    v_env() { return this.body(`<div class="chips"><button class="chip" data-a="envClear">${ic('Delete', 16)}${this.t('清空', 'Clear')}</button></div>`); }

    trk() { return this.track ? this.doc.tracks.find(x => x.id === this.track) : null; }

    // ---------------------------------------------------------------- colours, size
    colors() {
      const cs = getComputedStyle(this.scr), g = n => cs.getPropertyValue('--' + n).trim();
      this.C = {};
      ['bg', 'surface', 'on', 'sheet', 'surface2', 'surface3', 'dim', 'faint', 'accent', 'on-accent', 'wave', 'wave-dim', 'sel', 'sel-edge', 'playhead', 'fade', 'record', 'outline', 'icon-btn', 'error',
        'lane0', 'lane1', 'lane2', 'lane3', 'lane4', 'lane5', 'lane6', 'lane7', 'info'].forEach(n => { this.C[n] = g(n); });
    }
    measure() {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const W = Math.round(this.tlEl.clientWidth), H = Math.round(this.tlEl.clientHeight);
      if (!W || !H) return false;
      if (W !== this.W || H !== this.H || dpr !== this.dpr) { this.W = W; this.H = H; this.dpr = dpr; this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
      this.IW = Math.max(40, W - 2 * G);
      if (this.toolsEl.clientWidth !== this._aw) { this._aw = this.toolsEl.clientWidth; this.sizeRows(); this.fitLead(); }
      return true;
    }

    // ---------------------------------------------------------------- geometry of the timeline (inset G at both ends)
    geom() {
      const W = this.W, H = this.H, fs = this.o.fs ? 1.3 : 1;
      const ruler = Math.round(22 * fs), chips = this._hasChips ? 30 : 0;
      const tr = this.shownDoc().tracks;
      const n = tr.length;
      const ovH = this.zoomed() ? 26 : 0;
      const top = ruler + chips + 4;
      const avail = H - top - ovH - 10;
      const th = n ? clamp(Math.floor((avail - 110) / n) - 6, 30, 62) : 0;
      const mainH = Math.max(56, avail - n * (th + 6));
      const lanes = tr.map((t, i) => ({ t, y: top + mainH + 6 + i * (th + 6), h: th }));
      return { W, H, ruler, chips, top, mainY: top, mainH, lanes, ovY: H - ovH, ovH };
    }
    zoomed() { const Ld = this.dispLen(); return this.view.b.t - this.view.a.t < Ld - 0.5 || this.view.a.t > 0.5; }
    dispLen() { return docLen(this.shownDoc()) + this.gapW(); }
    ppu() { return this.IW / Math.max(1, this.view.b.v - this.view.a.v); }
    xOf(u) { return G + (u - this.view.a.v) * this.ppu(); }
    uOf(x) { return this.view.a.v + (x - G) / this.ppu(); }
    gapAt() { return this.gap ? (typeof this.gap.at === 'number' ? this.gap.at : this.gap.at.v) : 0; }
    gapW() { return this.gap ? (typeof this.gap.w === 'number' ? this.gap.w : this.gap.w.v) : 0; }
    d2x(u) { const at = this.gapAt(), w = this.gapW(); return this.xOf(this.gap && u >= at ? u + w : u); }
    /** A hit area kept out of the side strips: it may never begin within SAFE of an edge. */
    hit(cx, w) { let l = cx - w / 2, r = cx + w / 2; if (l < SAFE) { r += SAFE - l; l = SAFE; } if (r > this.W - SAFE) { l -= r - (this.W - SAFE); r = this.W - SAFE; } return [Math.max(SAFE, l), r]; }
    handleRect(i) { const g = this.geom(), x = this.d2x(this.sel[i]), [l, r] = this.hit(x, 48); return { l, r, t: g.mainY + g.mainH - 39, b: g.mainY + g.mainH + 8 }; }
    /** Every touch target drawn on the timeline, with the area that takes the touch (used by the checks). */
    targets() {
      const out = [], g = this.geom(), d = this.shownDoc();
      if (this.sel && (!this.holding || ['fade', 'rvol', 'exact'].includes(this.top.t))) for (let i = 0; i < 2; i++) { const r = this.handleRect(i); out.push({ kind: 'handle' + i, l: r.l, r: r.r }); }
      (d.markers || []).forEach(m => { const p = markerPos(d, m); if (p === null) return; const x = this.d2x(p); if (x < -60 || x > this.W + 60) return; const l = Math.max(SAFE, x - 4), r = Math.min(this.W - SAFE, x + 64); if (r > l) out.push({ kind: 'marker', l, r }); });
      (d.env || []).forEach(p => { const x = this.d2x(p.u); if (x < 0 || x > this.W) return; const [l, r] = this.hit(x, 32); out.push({ kind: 'env', l, r }); });
      if (g.ovH) { const Ld = this.dispLen(); out.push({ kind: 'overview', l: G, r: this.W - G }); }
      return out;
    }

    // ---------------------------------------------------------------- drawing
    kick() {
      if (!this.W) { if (!this.measure()) return; }
      if (this._raf) return;
      this._raf = requestAnimationFrame(t => this.frame(t));
    }
    frame(t) {
      this._raf = 0;
      const dt = this._last ? Math.min(0.05, (t - this._last) / 1000) : 0.016; this._last = t;
      let busy = false;
      busy = this.view.a.step(dt) | busy; busy = this.view.b.step(dt) | busy;
      busy = this.selDraw.step(dt) | busy;
      if (this.gap) { if (this.gap.at.step) busy = this.gap.at.step(dt) | busy; if (this.gap.w.step) busy = this.gap.w.step(dt) | busy; if (this.gap.done && !this.gap.w.busy && !(this.gap.at.busy)) { this.gap = null; } else if (this.gap.done) busy = true; }
      if (this.playing && this.live) { busy = true; this.tickPlay(dt); }
      if (this.rec && this.rec.running && this.live) {
        busy = true; const whole = this.view.a.t <= 0.5 && this.view.b.t >= docLen(this.doc) + this.rec.len - 0.5;
        this.rec.len += dt * SR; if (this.gap && this.gap.fill === 'rec') this.gap.w = this.rec.len; if (whole) this.view.b.snap(docLen(this.doc) + this.rec.len);
        if (Math.floor(this.rec.len) !== this._recTick && this.top.t === 'rec') { this._recTick = Math.floor(this.rec.len); this.recMeter(); }
      }
      if (this.drag && this.edgeScroll(dt)) busy = true;
      if (this.anim) { busy = this.anim(dt) || busy; }
      this.draw();
      if (busy) { this._raf = requestAnimationFrame(tt => this.frame(tt)); } else this._last = 0;
    }
    /** While a finger holds a drag near a side, the view scrolls there; the finger never has to reach the bezel. */
    edgeScroll(dt) {
      const x = this.drag.x, W = this.W;
      let depth = 0;
      if (x < SCROLLZ) depth = -(SCROLLZ - x) / (SCROLLZ - EDGE); else if (x > W - SCROLLZ) depth = (x - (W - SCROLLZ)) / (SCROLLZ - EDGE);
      if (!depth || !this.zoomed()) return false;
      const span = this.view.b.v - this.view.a.v, Ld = this.dispLen();
      const dep = clamp(depth, -1, 1), a = clamp(this.view.a.v + Math.sign(dep) * (0.8 + 2.4 * Math.abs(dep)) * span * dt, 0, Math.max(0, Ld - span));
      if (Math.abs(a - this.view.a.v) < 1e-6) return false;
      this.view.a.snap(a); this.view.b.snap(a + span);
      this.drag.apply();
      return true;
    }
    draw() {
      if (!this.W) return;
      const ctx = this.ctx, C = this.C, g = this.geom(), W = this.W, H = this.H, fs = this.o.fs ? 1.3 : 1;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      this.chipsEl.style.top = g.ruler + 'px';
      const d = this.shownDoc(), f = flat(d), L = f.L;
      const ppu = this.ppu(), va = this.view.a.v;
      const gat = this.gapAt(), gw = this.gapW(), hasGap = !!this.gap;
      const d2x = u => G + (((hasGap && u >= gat) ? u + gw : u) - va) * ppu;
      const x2d = x => { const du = va + (x - G) / ppu; if (!hasGap || du < gat) return du; if (du < gat + gw) return null; return du - gw; };
      const ls = this.layersShown(d).filter(l => l.on !== false);
      const lay = {}; ls.forEach(l => { lay[l.k] = l; });
      this.drawRuler(ctx, g, fs);
      const mY = g.mainY, mH = g.mainH, mid = mY + mH / 2, amp = Math.min(mH / 2 - 6, 150);
      let u0 = 0;
      d.pieces.forEach(p => {
        const n = plen(p); let a = d2x(u0); const b = d2x(u0 + n);
        if (hasGap && gat > u0 && gat < u0 + n) { this.block(ctx, a, G + (gat - va) * ppu, mY, mH, p.src === 'sil'); a = d2x(gat); }
        this.block(ctx, a, b, mY, mH, p.src === 'sil', p.src.startsWith('rec') ? C.record : null);
        u0 += n;
      });
      if (this.marks) for (const m of this.marks) this.drawMark(ctx, m, d2x, mY, mH);
      if (this.planMarks) for (const m of this.planMarks) this.drawMark(ctx, m, d2x, mY, mH);
      const sel = this.selShown();
      if (sel) { ctx.fillStyle = C.sel; ctx.fillRect(sel[0], mY, sel[1] - sel[0], mH); }
      const dn = lay.dn ? DN_RES[lay.dn.v] : 1, keep = lay.dn ? [0.99, 0.98, 0.97, 0.95, 0.92][lay.dn.v] : 1;
      const lvl = lay.ld ? 1 : 0, vol = lay.vol ? Math.pow(10, lay.vol.v / 20) : 1;
      const rev = !!lay.rev, env = d.env;
      if (this.spec) this.drawSpec(ctx, g, f, x2d);
      else {
        ctx.lineCap = 'round'; ctx.lineWidth = 2;
        for (let x = 1.5; x < W; x += 3) {
          const ua = x2d(x - 1.5), ub = x2d(x + 1.5);
          if (ua === null || ub === null) continue;
          let i0 = Math.floor(ua), i1 = Math.max(i0 + 1, Math.floor(ub));
          if (i0 >= L || i1 <= 0) continue;
          i0 = clamp(i0, 0, L - 1); i1 = clamp(i1, i0 + 1, L);
          let m = 0, key = 0;
          for (let i = i0; i < i1; i++) {
            const j = rev ? L - 1 - i : i;
            if (f.sil[j]) continue;
            let c = f.cl[j] * keep; const nz = f.nz[j] * dn;
            if (lvl) c = Math.min(0.95, Math.pow(c, 0.72) * 0.98);
            let a = (c + nz) * f.g[j] * vol;
            if (env && env.length) a *= envGain(env, i);
            if (lay.rp) a = Math.min(a, 0.82);
            if (a > m) { m = a; key = f.key[j]; }
          }
          const inAfter = this.procSplit !== undefined && i0 > L * this.procSplit;
          const hi = Math.max(0.8, Math.min(1, m) * amp), lo = hi * (0.78 + 0.22 * hash01(key));
          ctx.strokeStyle = inAfter ? C['wave-dim'] : C.wave;
          ctx.beginPath(); ctx.moveTo(x, mid - hi); ctx.lineTo(x, Math.max(mid + lo, mid - hi + 1.5)); ctx.stroke();
        }
      }
      if (hasGap && gw > 0.5) this.drawGap(ctx, g, mY, mH, gat, gw, va, ppu);
      u0 = 0;
      ctx.strokeStyle = C.fade; ctx.lineWidth = 1.5;
      d.pieces.forEach(p => {
        const n = plen(p);
        if (p.fi) { const a = d2x(u0), b = d2x(u0 + p.fi); ctx.beginPath(); ctx.moveTo(a, mY + mH - 4); ctx.quadraticCurveTo(a + (b - a) * 0.15, mY + 6, b, mY + 4); ctx.stroke(); }
        if (p.fo) { const a = d2x(u0 + n - p.fo), b = d2x(u0 + n); ctx.beginPath(); ctx.moveTo(a, mY + 4); ctx.quadraticCurveTo(b - (b - a) * 0.15, mY + 6, b, mY + mH - 4); ctx.stroke(); }
        u0 += n;
      });
      if (env && env.length) this.drawEnv(ctx, env, d2x, mY, mH);
      this.drawMarkers(ctx, g, fs, d2x);
      ls.forEach(l => { if (l.a !== undefined) { const a = d2x(l.a), b = d2x(l.b); ctx.fillStyle = C[LAYER[l.k].c]; roundRect(ctx, a, mY + 2, b - a, 4, 2); ctx.fill(); } });
      for (const ln of g.lanes) this.drawLane(ctx, ln, f, d2x, x2d);
      this.placeLabels(g);
      if (sel) {
        const ye = g.lanes.length ? g.lanes[g.lanes.length - 1].y + g.lanes[g.lanes.length - 1].h : mY + mH;
        ctx.fillStyle = C['sel-edge'];
        for (const x of sel) ctx.fillRect(Math.round(x) - 1, mY, 2, mH);
        if (g.lanes.length) { ctx.globalAlpha = 0.35; for (const x of sel) ctx.fillRect(Math.round(x) - 0.5, mY + mH, 1, ye - mY - mH); ctx.globalAlpha = 1; }
        if (!this.holding || ['fade', 'rvol', 'exact'].includes(this.top.t)) for (const x of sel) {
          const cy = mY + mH - 13;
          ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x, cy, 11, 0, 7); ctx.fill();
          ctx.fillStyle = C['sel-edge']; ctx.beginPath(); ctx.arc(x, cy, 8, 0, 7); ctx.fill();
        }
      }
      if (!this.hand) {
        const phx = this.d2x(clamp(this.ph, 0, L));
        const bottom = g.lanes.length ? g.lanes[g.lanes.length - 1].y + g.lanes[g.lanes.length - 1].h : mY + mH;
        ctx.fillStyle = this.rec ? C.record : C.playhead;
        ctx.fillRect(Math.round(phx) - 1, g.ruler - 2, 2, bottom - g.ruler + 2);
        ctx.beginPath(); ctx.moveTo(phx - 6, 2); ctx.lineTo(phx + 6, 2); ctx.lineTo(phx + 6, 10); ctx.lineTo(phx, 16); ctx.lineTo(phx - 6, 10); ctx.closePath(); ctx.fill();
      }
      if (this.hand) this.drawCard(ctx, g, this.hand.mode !== 'lift');
      if (g.ovH) this.drawOverview(ctx, g, f);
      if (this.compareHold) { ctx.fillStyle = C.surface3; roundRect(ctx, G + 6, mY + 8, 46 * fs, 22 * fs, 11 * fs); ctx.fill(); ctx.fillStyle = C.on; ctx.font = `600 ${12 * fs}px system-ui, sans-serif`; ctx.textBaseline = 'middle'; ctx.fillText(this.t('原声', 'Orig.'), G + 14, mY + 8 + 11 * fs); }
      if (this.o.showEdges) this.drawEdgeGuides(ctx, g);
    }
    drawEdgeGuides(ctx, g) {
      const W = this.W, H = this.H, C = this.C;
      ctx.save();
      ctx.fillStyle = 'rgba(226, 59, 59, 0.16)'; ctx.fillRect(0, 0, EDGE, H); ctx.fillRect(W - EDGE, 0, EDGE, H);
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.strokeStyle = C.record; [SAFE, W - SAFE].forEach(x => { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); });
      ctx.strokeStyle = C.accent; [G, W - G].forEach(x => { ctx.beginPath(); ctx.moveTo(x + 0.5, g.ruler); ctx.lineTo(x + 0.5, H); ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.font = '700 11px system-ui, sans-serif'; ctx.textBaseline = 'middle';
      const tag = (x, y, t, col) => { const w = ctx.measureText(t).width + 8; ctx.fillStyle = col; roundRect(ctx, x - w / 2, y - 9, w, 18, 9); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(t, x - w / 2 + 4, y + 0.5); };
      tag(EDGE / 2, H * 0.5, '24', C.record); tag(W - EDGE / 2, H * 0.5, '24', C.record);
      tag(SAFE + 1, H * 0.62, '32', C.record); tag(W - SAFE - 1, H * 0.62, '32', C.record);
      tag(G + 2, H * 0.74, '40', C.accent); tag(W - G - 2, H * 0.74, '40', C.accent);
      ctx.restore();
    }
    block(ctx, a, b, y, h, silent, tint) {
      if (b - a < 0.5) return;
      const C = this.C;
      ctx.fillStyle = tint ? hexA(tint, 0.10) : hexA(C.surface3, silent ? 0.2 : 0.26);
      roundRect(ctx, a + 1, y, Math.max(0, b - a - 2), h, 10); ctx.fill();
      if (silent) { ctx.strokeStyle = C.faint; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a + 6, y + h / 2); ctx.lineTo(b - 6, y + h / 2); ctx.stroke(); ctx.setLineDash([]); }
    }
    drawMark(ctx, m, d2x, y, h) {
      const C = this.C, a = d2x(m.a), b = d2x(m.b);
      if (b < 0 || a > this.W) return;
      if ((m.t === 'del' || m.t === 'fo' || m.t === 'fi') && b - a < 14) { ctx.fillStyle = C.accent; ctx.beginPath(); const cx = clamp((a + b) / 2, 6, this.W - 6); ctx.moveTo(cx - 6, y - 1); ctx.lineTo(cx + 6, y - 1); ctx.lineTo(cx, y + 7); ctx.closePath(); ctx.fill(); }
      if (m.t === 'del' || (m.t === 'pause' && m.on)) {
        ctx.save(); ctx.beginPath(); ctx.rect(a, y, b - a, h); ctx.clip();
        ctx.fillStyle = hexA(C.accent, 0.12); ctx.fillRect(a, y, b - a, h);
        ctx.strokeStyle = hexA(C.accent, 0.55); ctx.lineWidth = 1.5;
        for (let x = a - h; x < b; x += 7) { ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + h, y); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = C.accent; ctx.fillRect(a, y, Math.max(1, b - a), 3);
      } else if (m.t === 'pause') {
        ctx.strokeStyle = C.faint; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.strokeRect(a + 0.5, y + 0.5, Math.max(1, b - a - 1), h - 1); ctx.setLineDash([]);
      } else if (m.t === 'cand') {
        ctx.strokeStyle = m.on ? C.accent : hexA(C.accent, 0.5); ctx.lineWidth = m.on ? 2 : 1.5; ctx.setLineDash(m.on ? [] : [5, 4]);
        roundRect(ctx, a + 1, y + 1, b - a - 2, h - 2, 10); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = m.on ? C.accent : hexA(C.accent, 0.6); ctx.font = `700 ${11 * (this.o.fs ? 1.3 : 1)}px system-ui, sans-serif`; ctx.textBaseline = 'top';
        ctx.fillText(m.label, a + 8, y + 7);
      } else if (m.t === 'fo' || m.t === 'fi') {
        ctx.fillStyle = hexA(C.fade, 0.18); ctx.beginPath();
        if (m.t === 'fo') { ctx.moveTo(a, y); ctx.lineTo(b, y + h); ctx.lineTo(b, y); } else { ctx.moveTo(a, y); ctx.lineTo(a, y + h); ctx.lineTo(b, y); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C.fade; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
        if (m.t === 'fo') { ctx.moveTo(a, y + 3); ctx.lineTo(b, y + h - 3); } else { ctx.moveTo(a, y + h - 3); ctx.lineTo(b, y + 3); }
        ctx.stroke(); ctx.setLineDash([]);
      } else if (m.t === 'move') {
        ctx.strokeStyle = C.accent; ctx.lineWidth = 2; roundRect(ctx, a + 1, y + 1, b - a - 2, h - 2, 10); ctx.stroke();
        const tx = m.to === 'start' ? d2x(0) + 4 : d2x(docLen(this.doc)) - 4, cy = y + 14;
        ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo((a + b) / 2, y + 2); ctx.quadraticCurveTo(((a + b) / 2 + tx) / 2, y - 14, tx, cy); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(tx, cy, 4, 0, 7); ctx.fill();
      }
    }
    drawGap(ctx, g, mY, mH, gat, gw, va, ppu) {
      const C = this.C, a = G + (gat - va) * ppu, b = G + (gat + gw - va) * ppu;
      const fill = this.gap.fill;
      if (fill === 'rec' || fill === 'tts') {
        const col = fill === 'rec' ? C.record : C.lane3;
        ctx.fillStyle = hexA(col, 0.12); roundRect(ctx, a + 1, mY, Math.max(0, b - a - 2), mH, 10); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
        const mid = mY + mH / 2, amp = Math.min(mH / 2 - 8, 140);
        for (let x = a + 3; x < b - 2; x += 3) {
          const k = Math.floor((x - a) / 3); const lv = fill === 'tts' ? 0.12 + 0.08 * Math.sin(k * 0.5 + performance.now() / 120) : (0.2 + 0.7 * hash01(k * 3.1)) * (hash01(k) > 0.25 ? 1 : 0.15);
          ctx.beginPath(); ctx.moveTo(x, mid - lv * amp); ctx.lineTo(x, mid + lv * amp * 0.85); ctx.stroke();
        }
      } else if (fill === 'drop') {
        ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        roundRect(ctx, a + 2, mY + 2, Math.max(0, b - a - 4), mH - 4, 10); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = hexA(C.accent, 0.08); roundRect(ctx, a + 2, mY + 2, Math.max(0, b - a - 4), mH - 4, 10); ctx.fill();
      }
    }
    drawCard(ctx, g, docked) {
      const C = this.C, h = this.hand, f = flat(h.clipDoc), ppu = this.ppu();
      const w = Math.max(56, f.L * ppu), hh = Math.min(g.mainH * 0.62, 120);
      let x = docked ? this.xOf(this.gapAt()) : h.fx - w / 2;
      const y = docked ? g.mainY + (g.mainH - hh) / 2 : clamp(h.fy - hh - 26, 2, g.mainY + g.mainH - hh);
      x = clamp(x, -w + 20, this.W - 20);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = docked ? 10 : 20; ctx.shadowOffsetY = docked ? 3 : 8;
      ctx.fillStyle = C.sheet; roundRect(ctx, x, y, w, hh, 12); ctx.fill(); ctx.restore();
      ctx.fillStyle = hexA(C.accent, 0.12); roundRect(ctx, x, y, w, hh, 12); ctx.fill();
      ctx.save(); roundRect(ctx, x, y, w, hh, 12); ctx.clip();
      ctx.strokeStyle = C.wave; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const mid = y + hh / 2, amp = hh / 2 - 6;
      for (let xx = x + 2; xx < x + w; xx += 3) {
        const i = clamp(Math.floor((xx - x) / Math.max(ppu, w / f.L)), 0, f.L - 1), a = Math.min(1, (f.cl[i] + f.nz[i]) * f.g[i]);
        ctx.beginPath(); ctx.moveTo(xx, mid - a * amp); ctx.lineTo(xx, mid + a * amp * 0.85); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2; roundRect(ctx, x, y, w, hh, 12); ctx.stroke();
    }
    drawRuler(ctx, g, fs) {
      const C = this.C, ppu = this.ppu(), va = this.view.a.v, vb = this.view.b.v;
      const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
      const minPx = (docLen(this.shownDoc()) >= 36000 ? 88 : 64) * fs; const st = steps.find(s => s * SR * ppu >= minPx) || 3600;
      let lastR = -1e9;
      ctx.font = `${10.5 * fs}px ui-monospace, "Roboto Mono", monospace`; ctx.fillStyle = C.faint; ctx.textBaseline = 'middle';
      const hasGap = !!this.gap, gat = this.gapAt(), gw = this.gapW();
      const d2x = u => G + (((hasGap && u >= gat) ? u + gw : u) - va) * ppu;
      const L = docLen(this.shownDoc());
      for (let s = 0; s * SR <= Math.max(L + 1, vb); s += st) {
        if (s * SR > L + 0.5 && s * SR > vb) break;
        const x = d2x(s * SR); if (x < -40 || x > this.W + 40) continue;
        ctx.fillRect(Math.round(x), g.ruler - 6, 1, 4);
        const lab = clk(s * SR), w = ctx.measureText(lab).width, lx = clamp(x + 5, 2, this.W - w - 2);
        if (lx < lastR + 8) continue;
        ctx.fillText(lab, lx, g.ruler / 2 - 1); lastR = lx + w;
      }
      if (this.beats) { ctx.fillStyle = hexA(C.info, 0.8); for (let u = 0; u < L; u += 5) { const x = d2x(u); if (x >= 0 && x <= this.W) ctx.fillRect(Math.round(x), g.ruler - (u % 20 === 0 ? 8 : 5), 1.5, u % 20 === 0 ? 8 : 5); } }
    }
    drawMarkers(ctx, g, fs, d2x) {
      const C = this.C, d = this.shownDoc(), y = g.mainY + 4, h = Math.round(18 * fs);
      ctx.font = `700 ${11 * fs}px system-ui, sans-serif`; ctx.textBaseline = 'middle';
      (d.markers || []).forEach(m => {
        const pos = markerPos(d, m); if (pos === null) return;
        const x = d2x(pos); if (x < -80 || x > this.W) return;
        ctx.fillStyle = C.lane2; ctx.fillRect(Math.round(x), g.mainY, 2, g.mainH);
        const lab = m.name, w = ctx.measureText(lab).width + 12;
        roundRect(ctx, x, y, w, h, 5); ctx.fill();
        ctx.fillStyle = C.bg; ctx.fillText(lab, x + 6, y + h / 2 + 0.5);
      });
    }
    drawLane(ctx, ln, f, d2x, x2d) {
      const C = this.C, t = ln.t, col = C['lane' + (t.lane || 1)], L = f.L;
      const S = SRC[t.src], at = t.at || 0, end = t.fill ? L : at + (t.e - t.s);
      const a = d2x(at), b = d2x(end), sel = this.track === t.id;
      ctx.fillStyle = hexA(col, t.mute ? 0.05 : 0.13); roundRect(ctx, a + 1, ln.y, Math.max(0, b - a - 2), ln.h, 9); ctx.fill();
      if (sel) { ctx.strokeStyle = col; ctx.lineWidth = 2; roundRect(ctx, a + 1, ln.y, Math.max(0, b - a - 2), ln.h, 9); ctx.stroke(); }
      const mid = ln.y + ln.h / 2 + 4, amp = ln.h / 2 - 8;
      ctx.lineCap = 'round'; ctx.lineWidth = 2;
      const solid = t.mute ? hexA(col, 0.3) : hexA(col, 0.85);
      ctx.strokeStyle = solid;
      const vline = [];
      for (let x = 1.5; x < this.W; x += 3) {
        const u = x2d(x); if (u === null || u < at || u >= end) continue;
        const i = Math.floor(u);
        const k = t.fill || t.loop !== false ? ((i - at + (t.off || 0) + t.s) % S.n + S.n) % S.n : clamp(i - at + t.s, 0, S.n - 1);
        let gn = t.gain;
        if (t.duck && i < L) gn *= lerp(1, t.duckTo, f.va[i] || 0);
        if (t.fi && i - at < t.fi) gn *= (i - at) / t.fi;
        if (t.fo && end - i < t.fo) gn *= (end - i) / t.fo;
        const full = Math.min(1, S.cl[k] * 1.35 * Math.min(1, t.gain / 0.6)), lv = full * gn / Math.max(0.01, t.gain);
        if (t.duck && full > lv + 0.02) { ctx.strokeStyle = hexA(col, 0.3); ctx.beginPath(); ctx.moveTo(x, mid - full * amp); ctx.lineTo(x, mid + full * amp * 0.8); ctx.stroke(); ctx.strokeStyle = solid; }
        ctx.beginPath(); ctx.moveTo(x, mid - lv * amp); ctx.lineTo(x, mid + Math.max(lv * amp * 0.8, 0.8)); ctx.stroke();
        vline.push([x, gn]);
      }
      if (t.duck && vline.length) {
        ctx.strokeStyle = hexA(col, 0.7); ctx.lineWidth = 1; ctx.beginPath();
        vline.forEach(([x, gn], i) => { const y = ln.y + 5 + (1 - Math.min(1, gn / Math.max(0.01, t.gain))) * (ln.h - 12); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      }
    }
    placeLabels(g) {
      const html = g.lanes.map(ln => { const t = ln.t; const ico = t.k === 'music' ? 'MusicNote' : t.k === 'dub' ? 'RecordVoiceOver' : t.k === 'acc' ? 'QueueMusic' : 'Mic'; const x = Math.max(G + 6, this.d2x(t.at || 0) + 6); return `<div class="tlabel" style="--c:var(--lane${t.lane || 1});top:${ln.y + 3}px;left:${Math.min(x, this.W - 120)}px">${ic(t.mute ? 'VolumeOff' : t.solo ? 'Headphones' : ico, 13)}<span>${esc(t.name)}</span></div>`; }).join('');
      if (html !== this._lblHtml) { this._lblHtml = html; this.labelsEl.innerHTML = html; }
    }
    drawEnv(ctx, env, d2x, y, h) {
      const C = this.C, yOf = db => y + 6 + (1 - (db + 24) / 36) * (h - 12);
      ctx.strokeStyle = C.lane2; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(d2x(0), yOf(env[0].db)); env.forEach(p => ctx.lineTo(d2x(p.u), yOf(p.db))); ctx.lineTo(d2x(docLen(this.shownDoc())), yOf(env[env.length - 1].db)); ctx.stroke();
      env.forEach(p => { ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(d2x(p.u), yOf(p.db), 8, 0, 7); ctx.fill(); ctx.fillStyle = C.lane2; ctx.beginPath(); ctx.arc(d2x(p.u), yOf(p.db), 5.5, 0, 7); ctx.fill(); });
    }
    drawSpec(ctx, g, f, x2d) {
      const C = this.C, y = g.mainY, h = g.mainH, rows = 24, rh = h / rows;
      for (let x = 0; x < this.W; x += 3) {
        const u = x2d(x); if (u === null || u < 0 || u >= f.L) continue;
        const i = Math.floor(u), lv = f.cl[i] + f.nz[i];
        for (let r = 0; r < rows; r++) {
          const fr = r / rows, e = clamp(lv * (1.25 - fr * 1.1) + 0.12 * hash01(i * 31 + r) - 0.08, 0, 1);
          ctx.fillStyle = hexA(e > 0.55 ? C.accent : C.wave, 0.08 + e * 0.85);
          ctx.fillRect(x, y + h - (r + 1) * rh, 3, rh + 0.5);
        }
      }
    }
    drawOverview(ctx, g, f) {
      const C = this.C, y = g.ovY + 4, h = g.ovH - 8, L = f.L, W = this.IW, x0 = G;
      ctx.fillStyle = hexA(C.surface3, 0.35); roundRect(ctx, x0, y, W, h, 6); ctx.fill();
      ctx.strokeStyle = hexA(C.wave, 0.55); ctx.lineWidth = 1.5;
      const cols = Math.floor(W / 2.5);
      for (let c = 0; c < cols; c++) {
        const i0 = Math.floor(c / cols * L), i1 = Math.max(i0 + 1, Math.floor((c + 1) / cols * L)); let m = 0;
        for (let i = i0; i < i1; i += Math.max(1, Math.floor((i1 - i0) / 24))) m = Math.max(m, f.cl[i] + f.nz[i]);
        const x = x0 + c * 2.5 + 1, a = Math.min(1, m) * (h / 2 - 1);
        ctx.beginPath(); ctx.moveTo(x, y + h / 2 - a); ctx.lineTo(x, y + h / 2 + a); ctx.stroke();
      }
      const Ld = this.dispLen(), a = x0 + this.view.a.v / Ld * W, b = x0 + this.view.b.v / Ld * W;
      ctx.fillStyle = hexA(C.accent, 0.14); roundRect(ctx, a, y - 1, Math.max(6, b - a), h + 2, 5); ctx.fill();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; roundRect(ctx, a, y - 1, Math.max(6, b - a), h + 2, 5); ctx.stroke();
      ctx.fillStyle = C.playhead; ctx.fillRect(x0 + this.ph / Ld * W, y - 2, 1.5, h + 4);
    }
    selShown() {
      if (!this.sel) { this._hadSel = false; return null; }
      const a = this.d2x(this.sel[0]), b = this.d2x(this.sel[1]);
      this.selDraw.to(a, b);
      if (this.dragSel || !this.live || !this._hadSel || this.view.a.busy || this.view.b.busy) this.selDraw.snap(a, b);
      this._hadSel = true;
      return [this.selDraw.a.v, this.selDraw.b.v];
    }

    // ---------------------------------------------------------------- playback (no real audio: the playhead moves in time)
    play() {
      if (this.rec && this.rec.running) { this.rec.running = false; this.renderArea(); }
      if (this.playing) { this.stopPlay(); return; }
      const L = this.L;
      if (this.sel && !this.holding) { this.range = this.sel.slice(); if (this.ph < this.sel[0] || this.ph >= this.sel[1] - 1) this.ph = this.sel[0]; }
      else { this.range = [0, this.shownLen()]; if (this.ph >= L - 1) this.ph = 0; }
      this.playing = true; this.renderTop(); this.kick();
    }
    stopPlay() { if (!this.playing) return; this.playing = false; this.renderTop(); }
    tickPlay(dt) {
      this.ph += dt * SR * this.speed;
      if (this.ph >= this.range[1]) { if (this.loop) this.ph = this.range[0]; else { this.ph = this.range[1]; this.playing = false; this.renderTop(); } }
      const span = this.view.b.t - this.view.a.t;
      if (this.ph > this.view.b.t - span * 0.05 && this.zoomed()) { const s = Math.min(this.ph - span * 0.1, docLen(this.shownDoc()) - span); this.view.a.snap(s); this.view.b.snap(s + span); }
      this.renderTime();
    }

    // ---------------------------------------------------------------- feedback
    toast(msg) {
      const el = this.toastEl; el.textContent = msg; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('show'), 2200);
    }
    showCoach(key, text, x, y, up) {
      if (this.seen[key] || (!this.live && !this.o.coach)) return;
      this.seen[key] = true;
      const el = document.createElement('div');
      el.className = 'coach show' + (up ? ' up' : ''); el.innerHTML = ic('Hold', 16) + esc(text);
      this.ovl.appendChild(el);
      const w = el.offsetWidth, l = clamp(x - w / 2, SAFE, this.W - w - SAFE);
      el.style.left = l + 'px'; el.style.top = (up ? y + 10 : y - el.offsetHeight - 10) + 'px'; el.style.setProperty('--ax', (x - l) + 'px');
      this.coach = el;
    }
    hideCoach() { if (this.coach) { this.coach.remove(); this.coach = null; } }
    modal(html) { this.mhost.innerHTML = `<div class="scrim" data-a="modalClose"></div><div class="modal">${html}</div>`; }
    closeModal() { this.mhost.innerHTML = ''; }

    // ---------------------------------------------------------------- editing actions
    select(a, b, quiet) {
      a = Math.round(a); b = Math.round(b);
      this.sel = b - a < 1 ? null : [a, b];
      this.track = null; this.marker = null;
      if (!quiet && !this.holding) this.resetStack();
      this.renderTime(); this.kick();
    }
    clearSel() { if (!this.sel && !this.track && !this.marker) return; this.sel = null; this.track = null; this.marker = null; if (!this.holding) this.resetStack(); this.renderTime(); this.kick(); }
    doDelete() {
      const [a, b] = this.sel; const L0 = this.L;
      this.stopPlay();
      this.commit(withP(this.doc, cutP(this.doc.pieces, a, b)), '删掉 ' + cmp(a) + '–' + cmp(b));
      this.ph = a;
      this.gap = { at: a, w: new Spring(b - a, P.gap, 0.05).to(0), done: true, fill: null };
      if (this.view.a.t <= 0.5 && this.view.b.t >= L0 - 0.5) { this.view.b.snap(L0); this.view.b.to(this.L, P.gap); }
      this.resetStack(); this.kick();
    }
    doKeep() {
      const [a, b] = this.sel;
      this.stopPlay();
      const span = this.view.b.v - this.view.a.v;
      this.commit(withP(this.doc, slice(this.doc.pieces, a, b)), '只留 ' + cmp(a) + '–' + cmp(b));
      this.ph = 0;
      this.view.a.snap(this.view.a.v - a); this.view.b.snap(this.view.a.v + span);
      this.view.a.to(0, P.view); this.view.b.to(this.L, P.view);
      this.resetStack(); this.kick();
    }
    startHand(a, b, mode, copy) {
      this.stopPlay();
      const clip = slice(this.doc.pieces, a, b);
      const rest = copy ? this.doc.pieces : cutP(this.doc.pieces, a, b);
      const at0 = copy ? b : a;
      this.hand = { a, b, len: b - a, clipDoc: withP(this.doc, clip), rest: withP(this.doc, rest), at: at0, from: at0, mode, copy, fx: 0, fy: 0 };
      this.gap = { at: new Spring(at0, P.lead, 0.05), w: copy ? new Spring(0, P.gap, 0.05).to(b - a) : b - a, fill: 'drop' };
      this.sel = null; this.scr.classList.toggle('lifting', mode === 'lift');
      if (mode !== 'lift') { this.push({ t: 'hand' }); this.showCoach('hand', this.t('点要放的位置', 'Tap where it goes'), this.W / 2, this.geom().mainY + 18, true); }
      this.renderTime(); this.renderTop(); this.kick();
    }
    handTarget(u) {
      const h = this.hand, RL = docLen(h.rest);
      let at = clamp(Math.round(u), 0, RL);
      const snaps = [0, RL].concat(seamsOf(h.rest.pieces));
      const tol = 12 / this.ppu();
      for (const s of snaps) if (Math.abs(s - at) < tol) at = s;
      h.at = at; this.gap.at.to(at); this.renderTime();
      this.kick();
    }
    handDrop() {
      const h = this.hand; if (!h) return;
      this.scr.classList.remove('lifting'); this.hideCoach();
      const same = !h.copy && h.at === h.from;
      const doc = withP(this.doc, insP(h.rest.pieces, h.at, h.clipDoc.pieces));
      this.hand = null; this.gap = null;
      if (!same) { this.commit(doc, (h.copy ? '复制 ' : '移动 ') + cmp(h.a) + '–' + cmp(h.b) + ' 到 ' + cmp(h.at)); this.ph = h.at; this.sel = [h.at, h.at + h.len]; }
      else this.sel = [h.a, h.b];
      this.stack = [this.rootView()]; this.renderArea();
    }
    handCancel() { const h = this.hand; if (!h) return; this.scr.classList.remove('lifting'); this.hideCoach(); this.hand = null; this.gap = null; this.sel = h.copy || h.from < 0 ? null : [h.a, h.b]; this.stack = [this.rootView()]; this.renderArea(); }

    /** A sound setting goes on the audio as soon as its level opens; changes take effect as they are made. */
    openLayer(k, existing) {
      this.stopPlay();
      if (existing) { this.push({ t: 'p', k, id: existing.id, orig: existing }); return; }
      const init = { dn: 2, ld: 0, vol: 0, rp: new Set([0, 1, 3]), fx: new Set([3]), vc: 2, sp: 1.25, ch: { m: 0, w: 100 }, sep: 0 }[k];
      const layer = { id: 'l' + (++uid), k, v: init instanceof Set ? new Set(init) : typeof init === 'object' ? Object.assign({}, init) : init, on: true };
      if (this.sel && SELCTX.has(this.top.ctx)) { layer.a = this.sel[0]; layer.b = this.sel[1]; }
      const v = { t: 'p', k, id: layer.id, orig: null };
      this.push(v);
      this.liveSet(Object.assign({}, this.doc, { layers: this.doc.layers.concat([layer]) }), this.layerLabel(layer, null), v);
      this.startProc(layer.id, 0);
      this.renderArea();
    }
    layerLabel(l, orig) {
      const m = LAYER[l.k], val = m.val ? m.val(l.v) : '';
      if (!orig) return m.zh + (val ? '（' + val + '）' : '') + (l.a !== undefined ? ' · 选中的' : '');
      return m.zh + (val ? '：' + m.val(orig.v) + ' → ' + val : '');
    }
    layerSet(fn) {
      const v = this.top; if (v.t !== 'p') return;
      const cur = this.doc.layers.find(l => l.id === v.id); if (!cur) return;
      const nl = cloneLayer(cur); fn(nl);
      if (layerKey(nl) === layerKey(cur)) return;
      const doc = Object.assign({}, this.doc, { layers: this.doc.layers.map(l => l.id === v.id ? nl : l) });
      this.liveSet(doc, this.layerLabel(nl, v.orig), v);
      this.startProc(v.id, 0.3);
      this.renderArea();
    }
    layerRemove() {
      const v = this.top, id = v.id;
      const l = this.doc.layers.find(x => x.id === id); if (!l) { this.back(); return; }
      this.compareHold = false;
      this.commit(Object.assign({}, this.doc, { layers: this.doc.layers.filter(x => x.id !== id) }), '去掉' + LAYER[l.k].zh, true);
      this.stack.pop(); if (!this.stack.length) this.stack = [this.rootView()];
      this.renderArea();
    }
    /** A setting is worked out in the background; the tag shows how far, the bars change when it is ready. */
    startProc(id, from) {
      if (!this.live) return;
      const t0 = performance.now(); this.proc = { id, p: from };
      this.anim = () => {
        if (!this.proc || this.proc.id !== id) return false;
        this.proc.p = Math.min(1, from + (performance.now() - t0) / 650);
        this.renderChips();
        if (this.proc.p >= 1) { this.proc = null; this.anim = null; this.renderChips(); return false; }
        return true;
      };
      this.kick();
    }
    trackSet(ch, label) {
      const tr = this.trk(); if (!tr) return;
      const doc = Object.assign({}, this.doc, { tracks: this.doc.tracks.map(t => t.id === tr.id ? Object.assign({}, t, ch) : t) });
      this.liveSet(doc, label + ' · ' + tr.name, this.top);
    }
    addTrack(t, label) {
      const tr = Object.assign({ id: 't' + (++uid), k: 'music', gain: 0.6, duck: true, duckTo: 0.25, fill: true, at: 0, s: 0, e: SRC[t.src].n, fi: 20, fo: 30, lane: 1, loop: true }, t);
      this.commit(Object.assign({}, this.doc, { tracks: this.doc.tracks.concat([tr]) }), label || ('加背景音乐「' + tr.name + '」'));
      this.track = tr.id; this.stack = [{ t: 'strip', ctx: 'track' }]; this.renderArea();
    }
    insertPiece(src, len, label, where) {
      const at = where === 'end' ? this.L : clamp(Math.round(this.ph), 0, this.L);
      const L0 = this.L, whole = this.view.a.t <= 0.5 && this.view.b.t >= L0 - 0.5;
      this.commit(withP(this.doc, insP(this.doc.pieces, at, [{ src, s: 0, e: len, g: 1 }])), label);
      if (whole) this.view.b.to(this.L, P.view);
      this.ph = at + len; this.sel = [at, at + len];
      this.stack = [this.rootView()]; this.renderArea(); this.kick();
    }
    startPlan(text) {
      const plan = parsePlan(text, this.doc, this.sel);
      this.plan = plan; plan.after = false;
      this.refreshPlan();
      if (this.top.t === 'say') this.stack.pop();
      if (this.top.t === 'plan') this.stack.pop();
      if (!this.stack.length) this.stack = [this.rootView()];
      this.stack.push({ t: 'plan' }); this.renderArea();
    }
    refreshPlan() { const p = this.plan; p.res = planEdits(this.doc, p); this.planMarks = p.after ? null : p.res.marks; this.renderChips(); this.kick(); }
    applyPlan() {
      const p = this.plan, ex = p.steps.find(s => s.on && s.k === 'export');
      const doc = p.res.doc; this.plan = null; this.planMarks = null;
      const L0 = this.L;
      this.commit(doc, '按这句话改：' + p.text);
      this.ph = 0; this.view.b.snap(Math.max(this.view.b.v, L0)); this.view.a.to(0); this.view.b.to(this.L, P.view);
      if (ex) { this.openExport(ex); return; }
      this.resetStack();
    }
    openExport(pre) {
      this.stopPlay(); this.leaveView();
      this.exp = { stage: 'set', purpose: pre && pre.purpose === 'ring' ? 'ring' : 'file', fmt: (pre && pre.fmt) || 'MP3', q: 192, name: this.doc.name, scope: this.sel ? 'sel' : 'all', ring: 'call', clipWarn: this.doc.layers.some(l => l.k === 'vol' && l.v > 3) };
      this.stack = [this.rootView(), { t: 'export' }]; this.markTool = 'export'; this.renderArea();
    }
    expGo() {
      const e = this.exp; e.stage = 'run'; e.p = 0; this.renderArea();
      const t0 = performance.now();
      this.anim = () => {
        if (!this.exp || this.exp.stage !== 'run') return false;
        e.p = Math.min(1, (performance.now() - t0) / 1300);
        const pb = this.areaEl.querySelector('.pbar i'), pt = this.areaEl.querySelector('.pct'); if (pb) pb.style.width = Math.round(e.p * 100) + '%'; if (pt) pt.textContent = Math.round(e.p * 100) + '%';
        if (e.p >= 1) { this.anim = null; this.systemAfterExport(); return false; }
        return true;
      };
      this.kick();
    }
    systemAfterExport() {
      const e = this.exp;
      if (e.purpose === 'file') this.modal(`<div class="handle"></div><div class="sys">${this.t('系统 · 选择保存位置', 'System · Save to')}</div><h4>${esc(e.name)}.${e.fmt.toLowerCase()}</h4><div class="folder on">${ic('Folder', 22)}<span>下载</span></div><div class="folder">${ic('Folder', 22)}<span>音乐</span></div><div class="folder">${ic('Folder', 22)}<span>文档</span></div><button class="btn pri" data-a="sysSave">保存</button>`);
      else if (e.purpose === 'share') this.modal(`<div class="handle"></div><div class="sys">${this.t('系统 · 分享', 'System · Share')}</div><div class="apps">${['微信', 'QQ', '邮件', '蓝牙'].map(x => `<button class="app" data-a="sysSave"><i></i>${x}</button>`).join('')}</div>`);
      else this.modal(`<div class="handle"></div><div class="sys">${this.t('系统 · 权限', 'System · Permission')}</div><h4>允许“声剪”修改系统设置？</h4><button class="btn pri" data-a="sysSave">允许</button><button class="btn ghost" data-a="modalClose" style="align-self:center">不允许</button>`);
    }

    // ---------------------------------------------------------------- events
    bind() {
      const scr = this.scr;
      scr.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b || !scr.contains(b)) return;
        this.onAct(b.dataset.a, b, e);
      });
      scr.addEventListener('input', e => {
        if (e.target.tagName === 'TEXTAREA' && this.top.t === 'say') { this.top.text = e.target.value; const s = this.areaEl.querySelector('.send'); if (s) s.classList.toggle('on', !!e.target.value.trim()); }
        if (e.target.dataset.in === 'name') { const n = e.target.value.trim(); if (n) { this.liveSet(Object.assign({}, this.doc, { name: n }), '改名「' + n + '」', this.top); } }
      });
      scr.addEventListener('keydown', e => { if (e.target.tagName === 'TEXTAREA' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.onAct('send'); } });
      scr.addEventListener('pointerdown', e => { const h = e.target.closest('[data-hold]'); if (!h) return; this.compareHold = true; h.classList.add('on'); this.renderChips(); this.kick(); });
      const up = () => { if (!this.compareHold) return; this.compareHold = false; const h = scr.querySelector('[data-hold]'); if (h) h.classList.remove('on'); this.renderChips(); this.kick(); };
      scr.addEventListener('pointerup', up); scr.addEventListener('pointercancel', up); scr.addEventListener('pointerleave', up);
      // Holding undo: the history list.
      let holdT = 0;
      this.undoEl.addEventListener('pointerdown', () => { holdT = setTimeout(() => { holdT = -1; this.leaveView(); this.cat = 'more'; this.stack = [this.rootView(), { t: 'history' }]; this.markTool = 'history'; this.renderArea(); }, 500); });
      this.undoEl.addEventListener('pointerup', () => { if (holdT > 0) clearTimeout(holdT); });
      this.undoEl.addEventListener('click', e => { if (holdT === -1) { e.stopImmediatePropagation(); holdT = 0; } }, true);
      this.bindEdges();
      this.bindCanvas();
      window.addEventListener('keydown', e => {
        if (!this.isActive() || /INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
        if (e.key === 'Escape') { e.preventDefault(); this.systemBack(); }
        else if (e.key === ' ') { e.preventDefault(); this.play(); }
        else if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel && !this.holding) { e.preventDefault(); this.doDelete(); }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
      });
    }
    /** The side strips belong to the system: a swipe that starts there is the system Back, as on the phone. */
    bindEdges() {
      const scr = this.scr;
      let s = null, ind = null;
      scr.addEventListener('pointerdown', e => {
        const r = scr.getBoundingClientRect(), x = e.clientX - r.left;
        s = x < EDGE ? { x: e.clientX, y: e.clientY, side: 1, id: e.pointerId } : x > r.width - EDGE ? { x: e.clientX, y: e.clientY, side: -1, id: e.pointerId } : null;
      }, true);
      window.addEventListener('pointermove', e => {
        if (!s || e.pointerId !== s.id) return;
        const dx = (e.clientX - s.x) * s.side, dy = Math.abs(e.clientY - s.y);
        if (dx > 12 && dx > dy && !ind) { ind = document.createElement('div'); ind.className = 'sysback'; ind.innerHTML = ic('ArrowBack', 20); scr.appendChild(ind); }
        if (ind) { const r = scr.getBoundingClientRect(); const k = clamp(dx / 72, 0, 1); ind.style.top = (e.clientY - r.top) + 'px'; ind.style.left = ind.style.right = ''; ind.style[s.side > 0 ? 'left' : 'right'] = (4 + k * 18) + 'px'; ind.style.opacity = 0.35 + k * 0.65; ind.style.transform = `scale(${0.6 + 0.4 * k})`; }
      }, true);
      const end = e => { if (!s || e.pointerId !== s.id) return; const dx = (e.clientX - s.x) * s.side, dy = Math.abs(e.clientY - s.y); s = null; if (ind) { ind.remove(); ind = null; } if (e.type === 'pointerup' && dx > 56 && dx > dy) this.systemBack(); };
      window.addEventListener('pointerup', end, true); window.addEventListener('pointercancel', end, true);
    }
    systemBack() { this.back(); }
    isActive() { const r = this.scr.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; }
    bindSliders() {
      if (!this.live) return;
      this.areaEl.querySelectorAll('.sld').forEach(sl => {
        const tr = sl.querySelector('.tr'), min = +sl.dataset.min, max = +sl.dataset.max, key = sl.dataset.sl;
        const set = e => {
          const r = tr.getBoundingClientRect(); const p = clamp((e.clientX - r.left) / r.width, 0, 1);
          let v = min + p * (max - min); v = (max - min) > 30 ? Math.round(v) : Math.round(v * 10) / 10;
          const out = this.onSlide(key, v);
          const pp = (v - min) / (max - min) * 100;
          tr.querySelector('i').style.width = pp + '%'; tr.querySelector('u').style.left = pp + '%';
          if (out !== undefined) sl.querySelector('b').textContent = out;
          this.renderChips(); this.kick();
        };
        tr.addEventListener('pointerdown', e => { tr.setPointerCapture(e.pointerId); set(e); tr._on = true; });
        tr.addEventListener('pointermove', e => { if (tr._on) set(e); });
        tr.addEventListener('pointerup', () => { tr._on = false; });
      });
    }
    onSlide(key, v) {
      const sgn = x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x) + NB + 'dB';
      const top = this.top, s1 = x => x.toFixed(1) + NB + '秒';
      const lay = fn => this.layerSetQuiet(fn);
      switch (key) {
        case 'vol': lay(l => { l.v = Math.round(v); }); return sgn(Math.round(v));
        case 'fxa': lay(l => { l.amt = v; }); return Math.round(v) + '%';
        case 'chw': lay(l => { l.v.w = v; }); return Math.round(v) + '%';
        case 'sepS': lay(l => { l.s = v; }); return Math.round(v) + '%';
        case 'rvol': { top.db = Math.round(v); const [a, b] = this.sel, f = Math.pow(10, top.db / 20); this.liveSet(rangeSet(top.base, a, b, p => Object.assign(p, { g: (p.g || 1) * f })), '选中的音量 ' + sgn(top.db), top); return sgn(top.db); }
        case 'efi': case 'efo': { top.f[key === 'efi' ? 'fi' : 'fo'] = v; this.liveSet(endFades(top.base, top.f.fi, top.f.fo), '开头淡入 ' + top.f.fi.toFixed(1) + ' 秒 · 结尾淡出 ' + top.f.fo.toFixed(1) + ' 秒', top); return s1(v); }
        case 'tvol': this.trackSet({ gain: v / 100 }, '音乐音量'); return Math.round(v) + '%';
        case 'duckTo': this.trackSet({ duckTo: v / 100 }, '自动调小'); return Math.round(v) + '%';
        case 'tfi': this.trackSet({ fi: sec(v) }, '音乐淡化'); return s1(v);
        case 'tfo': this.trackSet({ fo: sec(v) }, '音乐淡化'); return s1(v);
        case 'toff': this.trackSet({ off: sec(v) }, '音乐起点'); return s1(v);
        case 'rgain': return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)) + NB + 'dB';
      }
    }
    /** A slider moves the setting without rebuilding the level under the finger. */
    layerSetQuiet(fn) {
      const v = this.top; if (v.t !== 'p') return;
      const cur = this.doc.layers.find(l => l.id === v.id); if (!cur) return;
      const nl = cloneLayer(cur); fn(nl);
      if (layerKey(nl) === layerKey(cur)) return;
      this.liveSet(Object.assign({}, this.doc, { layers: this.doc.layers.map(l => l.id === v.id ? nl : l) }), this.layerLabel(nl, v.orig), v);
    }

    onAct(a, el, e) {
      const k = el && el.dataset.k, top = this.top;
      this.hideCoach();
      switch (a) {
        case 'leave': this.toast(this.t('回到音频库', 'To the library')); return;
        case 'back': this.back(true); return;
        case 'title': this.closeCtrl(); this.sel = null; this.track = null; this.marker = null; this.stack = [this.rootView()]; this.cat = 'more'; this.renderArea(); this.kick(); return;
        case 'time':
          if (this.sel && !this.hand) { if (this.markTool === 'exact') { this.back(true); return; } this.closeCtrl(); this.push({ t: 'exact' }); this.markTool = 'exact'; this.renderArea(); return; }
          this.closeCtrl(); this.cat = 'more'; this.renderArea(); return;
        case 'export': if (this.markTool === 'export') { this.back(true); return; } this.openExport(); return;
        case 'cat': {
          this.closeCtrl();
          if (k !== 'ctx' && (this.track || this.marker)) { this.track = null; this.marker = null; this.stack = [this.rootView()]; this._ctx = this.stack[0].ctx; }
          this.cat = k; this.renderArea(); return;
        }
        case 'play': this.play(); return;
        case 'undo': this.undo(); return;
        case 'redo': this.redo(); return;
        case 'tool': {
          // Tapping the marked tool again closes its control; another tool sets the open one aside first.
          if (k === this.markTool && this.stack.length > 1) { this.back(true); return; }
          this.closeCtrl();
          this.onTool(k, el);
          if (this.stack.length > 1 && !this.markTool) { this.markTool = k; this.renderArea(); }
          return;
        }
        case 'chip': {
          if (this.plan || this.hand || this.rec) return;
          const l = this.doc.layers.find(x => x.id === el.dataset.id); if (!l) return;
          if (top.t === 'p' && top.id === l.id) { this.back(true); return; }
          this.closeCtrl(); this.sel = null; this.track = null; this.marker = null; this.stack = [this.rootView()]; this._ctx = 'rest';
          if (!this.toolList().includes(l.k)) this.cat = CTX_TOOLS.rest.includes(l.k) ? 'ctx' : 'sound';
          this.openLayer(l.k, l); this.markTool = l.k; this.renderArea(); return;
        }
        case 'stop': {
          const i = +el.dataset.i;
          if (el.dataset.k === 'dn') this.layerSet(l => { l.v = i; });
          if (el.dataset.k === 'sp') { this.layerSet(l => { l.v = [0.5, 0.75, 1, 1.25, 1.5, 2][i]; }); this.renderTime(); }
          if (el.dataset.k === 'pspd') { this.speed = [0.5, 0.75, 1, 1.25, 1.5, 2][i]; this.renderArea(); }
          return;
        }
        case 'seg': return this.onSeg(k, el.dataset.v);
        case 'sw': return this.onSwitch(k);
        case 'rpt': { const i = +el.dataset.i; this.layerSet(l => { l.v.has(i) ? l.v.delete(i) : l.v.add(i); }); return; }
        case 'fxt': { const i = +el.dataset.i; this.layerSet(l => { const cur = l.cur === undefined ? 3 : l.cur; if (l.v.has(i) && cur === i) l.v.delete(i); else { l.v.add(i); l.cur = i; } }); return; }
        case 'vct': { const i = +el.dataset.i; this.layerSet(l => { l.v = i; }); return; }
        case 'rmlayer': return this.layerRemove();
        case 'handOk': return this.handDrop();
        case 'handTo': this.handTarget(el.dataset.to === 'end' ? docLen(this.hand.rest) : 0); return;
        case 'sayAll': this.sel = null; this.renderArea(); this.kick(); return;
        case 'ex': {
          if (top.t === 'plan') { this.plan = null; this.planMarks = null; }
          const x = el.dataset.x === '人声清理' ? '降噪，统一音量，删掉超过1秒的停顿' : el.dataset.x;
          this.startPlan(x); return;
        }
        case 'send': { const tx = this.areaEl.querySelector('textarea'); const v = tx ? tx.value.trim() : ''; if (v) this.startPlan(v); else if (tx) { tx.focus(); tx.classList.remove('nudge'); void tx.offsetWidth; tx.classList.add('nudge'); } return; }
        case 'mic': top.listening = true; this.renderArea(); setTimeout(() => { if (this.top === top) { top.listening = false; top.text = '降噪之后统一音量'; this.renderArea(); } }, 1100); return;
        case 'ai': this.toast(this.t('AI 改写未接通', 'AI not connected')); return;
        case 'stepOn': { const s = this.plan.steps[+el.dataset.i]; s.on = !s.on; this.refreshPlan(); this.renderArea(); return; }
        case 'stepN': {
          const s = this.plan.steps[+el.dataset.i], d = +el.dataset.d;
          if (s.k === 'pauses') s.n = [5, 10, 20, 30][clamp([5, 10, 20, 30].indexOf(s.n) + d, 0, 3)];
          else if (s.k === 'gain' || s.k === 'rgain') s.db = clamp(s.db + d * 3 * Math.sign(s.db || 1), -24, 12) || 3;
          else s.n = clamp(s.n + d * SR, SR, sec(60));
          this.refreshPlan(); this.renderArea(); return;
        }
        case 'apply': return this.applyPlan();
        case 'expGo': return this.expGo();
        case 'expCancel': this.exp.stage = 'set'; this.anim = null; this.renderArea(); return;
        case 'xf': this.exp.fmt = el.dataset.f; this.renderArea(); return;
        case 'xsub': this.exp.open = this.exp.open === el.dataset.s ? null : el.dataset.s; this.renderArea(); return;
        case 'xsplit': this.exp.split = !this.exp.split; this.renderArea(); return;
        case 'xname': this.toast(this.t('键盘输入文件名', 'Type a name')); return;
        case 'preset': this.exp.fmt = el.dataset.f; this.exp.q = +el.dataset.q || 192; this.exp.open = null; this.renderArea(); return;
        case 'presetSave': this.toast(this.t('已存为预设', 'Preset saved')); return;
        case 'cover': this.modal(`<div class="handle"></div><div class="sys">系统 · 选择图片</div><div class="apps">${[1, 2, 3, 4].map(() => '<button class="app" data-a="modalClose"><i></i></button>').join('')}</div>`); return;
        case 'share': this.exp.purpose = 'share'; this.systemAfterExport(); return;
        case 'openOther': this.toast(this.t('用其他应用打开', 'Open with…')); return;
        case 'sysSave': {
          this.closeModal();
          if (this.pendingFile) { const f = this.pendingFile; this.pendingFile = null; f(); return; }
          if (this.exp) { this.exp.stage = 'done'; this.renderArea(); }
          return;
        }
        case 'modalClose': this.closeModal(); this.pendingFile = null; if (this.exp && this.exp.stage === 'run') { this.exp.stage = 'set'; this.renderArea(); } return;
        case 'confirmDel': this.closeModal(); this.toast(this.t('原型里不删除', 'Not deleted in the prototype')); return;
        case 'pickLib': { const it = LIBMUSIC[+el.dataset.i]; this.addTrack({ src: it.src, name: it.name, lane: 1 }); return; }
        case 'pickOnline': { const it = ONLINE[+el.dataset.i]; this.addTrack({ src: it.src, name: it.name, lane: 1, credit: it.meta }); return; }
        case 'pickAudio': { const it = LIBAUDIO[+el.dataset.i]; this.placeAudio(it.src, it.name); return; }
        case 'pill': top.pill = +el.dataset.i; this.renderArea(); return;
        case 'pv': e.stopPropagation(); this.toast(this.t('试听', 'Preview') + ' · ' + (el.closest('.mtrack').querySelector('b').textContent)); return;
        case 'recOk': return this.recFinish();
        case 'recSet': top.settings = !top.settings; this.renderArea(); return;
        case 'recGo': return this.recToggle();
        case 'ttsVoices': top.s = top.s || {}; top.s.voices = !top.s.voices; this.renderArea(); return;
        case 'voice': top.s.voice = +el.dataset.i; this.renderArea(); return;
        case 'ttsGo': return this.ttsGo();
        case 'subFile': top.s = { lines: true }; this.renderArea(); return;
        case 'subGo': return this.subGo();
        case 'cloneRec': { const s = top.s || (top.s = {}); s.rec = s.rec === 'on' ? 'done' : 'on'; this.renderArea(); if (s.rec === 'on') setTimeout(() => { if (top.s.rec === 'on') { top.s.rec = 'done'; this.renderArea(); } }, 1600); return; }
        case 'cloneOk': this.toast(this.t('音色已保存', 'Voice saved')); this.back(true); return;
        case 'nudge': this.ph = clamp(this.ph + +el.dataset.d, 0, this.L); this.renderTime(); this.kick(); return;
        case 'nudgeSel': { const i = +el.dataset.k, s = this.sel.slice(); s[i] = clamp(s[i] + +el.dataset.d, i ? s[0] + 1 : 0, i ? this.L : s[1] - 1); this.sel = s; this.renderArea(); this.kick(); return; }
        case 'bpm': top.bpm = Math.round((top.bpm || 120) * +el.dataset.m); this.renderArea(); return;
        case 'divN': { const m = top.m || 'every'; top.n = Math.max(m === 'every' ? 5 : 2, (top.n || (m === 'every' ? 30 : 4)) + +el.dataset.d * (m === 'every' ? 5 : 1)); top.v = true; this.divideLive(top); return; }
        case 'pickPiece': { const r = pieceRange(this.doc.pieces, +el.dataset.i); this.stack = [{ t: 'strip', ctx: 'rest' }]; this.select(r[0], r[1]); return; }
        case 'pausesGo': return this.pausesGo();
        case 'chorusKeep': { const c = this.chorus[top.i || 0]; this.sel = this.fitChorus(c, top.len || 0); this.marks = null; this.chorus = null; this.doKeep(); return; }
        case 'ring': { const c = this.chorus[top.i || 0]; this.sel = this.fitChorus(c, top.len || 0); this.marks = null; this.chorus = null; this.doKeep(); this.openExport({ purpose: 'ring' }); return; }
        case 'jump': this.jump(+el.dataset.i); return;
        case 'retry': this.toast(this.t('重新处理', 'Retrying')); return;
        case 'restore': this.toast(this.t('恢复为一段新音频', 'Restored as new audio')); return;
        case 'envClear': this.liveSet(Object.assign({}, this.doc, { env: [] }), '音量曲线', top); return;
      }
    }
    onSeg(k, v) {
      const top = this.top;
      switch (k) {
        case 'ld': this.layerSet(l => { l.v = +v; }); return;
        case 'rps': this.layerSet(l => { l.s = +v; }); return;
        case 'chm': this.layerSet(l => { l.v.m = +v; }); return;
        case 'sep': this.layerSet(l => { l.v = +v; }); return;
        case 'fdir': case 'fshape': {
          top.f = Object.assign(top.f, k === 'fdir' ? { dir: v } : { shape: +v });
          const [a, b] = this.sel;
          this.liveSet(rangeSet(splitAt(splitAt(top.base, a), b), a, b, p => Object.assign(p, top.f.dir === 'in' ? { fi: plen(p), fo: 0 } : { fo: plen(p), fi: 0 })), (top.f.dir === 'in' ? '淡入 ' : '淡出 ') + cmp(a) + '–' + cmp(b), top);
          break;
        }
        case 'after': this.plan.after = v === '1'; this.refreshPlan(); break;
        case 'xp': this.exp.purpose = v; break;
        case 'xs': this.exp.scope = v; break;
        case 'xr': this.exp.ring = v; break;
        case 'xq': this.exp.q = +v; break;
        case 'xrate': this.exp.rate = +v; break;
        case 'xch': this.exp.ch = +v; break;
        case 'where': this.where = v; break;
        case 'rwhere': this.rwhere = v; break;
        case 'siln': { top.n = +v; const n = sec(top.n), at = clamp(Math.round(this.ph), 0, docLen(top.base)); this.liveSet(withP(top.base, insP(top.base.pieces, at, [{ src: 'sil', s: 0, e: n }])), '插入 ' + dur(n) + ' 空白', top); this.fitIfWhole(docLen(top.base)); break; }
        case 'dm': top.m = v; top.n = v === 'every' ? 30 : 4; top.v = true; this.divideLive(top); return;
        case 'seam': { const s = +v; if (s !== (this.doc.seam || 0)) this.liveSet(Object.assign({}, this.doc, { seam: s }), '接缝交叉淡化 ' + s + ' ms', top); break; }
        case 'lt': top.v = +v; this.liveSet(loopDoc(top.base, sec(top.v)), '循环到 ' + dur(sec(top.v)), top); this.view.a.to(0); this.view.b.to(this.L); break;
        case 'cand': top.i = +v; this.pickCand(); break;
        case 'clen': top.len = +v; this.pickCand(); break;
        case 'pmin': top.min = +v; this.findPauses(+v); break;
        case 'vsrc': top.s.src = +v; break;
        case 'msrc': if (v === 'file') { this.pickFile(() => this.addTrack({ src: 'music3', name: '夏日午后.mp3', lane: 1 })); return; } top.src = v; break;
        case 'mic': case 'rch': this.recSet = Object.assign(this.recSet || {}, { [k]: +v }); break;
        case 'trate': top.s.rate = +v; break;
      }
      this.renderArea(); this.renderTime(); this.kick();
    }
    divideLive(top) {
      const d = divideDoc(top.base, top.m || 'every', top.n || 30);
      this.liveSet(d, (top.m || 'every') === 'every' ? '每 ' + top.n + ' 秒分一段' : top.m === 'equal' ? '平均分成 ' + top.n + ' 段' : '按标记分段', top);
      this.renderArea();
    }
    onSwitch(k) {
      const top = this.top;
      switch (k) {
        case 'keepPitch': this.layerSet(l => { l.keep = l.keep === false; }); return;
        case 'chs': this.layerSet(l => { l.v.s = !l.v.s; }); return;
        case 'duck': this.trackSet({ duck: !this.trk().duck }, '自动调小'); break;
        case 'tloop': this.trackSet({ loop: this.trk().loop === false }, '音乐循环'); break;
        case 'xlim': this.exp.limit = !this.exp.limit; break;
        case 'snap': this.snapBeats = this.snapBeats === false; break;
        case 'showBeats': this.beats = !this.beats; this.kick(); break;
        case 'consent': top.s = top.s || {}; top.s.ok = !top.s.ok; break;
        case 'mon': this.recSet = Object.assign(this.recSet || {}, { mon: !(this.recSet && this.recSet.mon) }); break;
      }
      this.renderArea();
    }
    onTool(k) {
      const top = this.top, inRange = !!this.sel;
      switch (k) {
        case 'say': this.stopPlay(); this.push({ t: 'say', text: '' }); setTimeout(() => { const t = this.areaEl.querySelector('textarea'); if (t && window.matchMedia('(pointer: fine)').matches) t.focus(); }, 60); return;
        case 'del': return this.doDelete();
        case 'keep': return this.doKeep();
        case 'move': this.startHand(this.sel[0], this.sel[1], 'tap', false); return;
        case 'copy': this.clipboard = { pieces: slice(this.doc.pieces, this.sel[0], this.sel[1]) }; this.startHand(this.sel[0], this.sel[1], 'tap', true); return;
        case 'fade': {
          if (inRange) { this.push({ t: 'fade', base: this.doc, f: { dir: null, shape: 0 } }); return; }
          // At rest one tap fades both ends in a common way; the level adjusts it.
          const v = { t: 'fade', base: this.doc, f: { fi: 0.5, fo: 2 } }; this.push(v);
          this.liveSet(endFades(v.base, 0.5, 2), '开头淡入 0.5 秒 · 结尾淡出 2.0 秒', v); this.renderArea(); return;
        }
        case 'vol': if (inRange && SELCTX.has(top.ctx)) { this.push({ t: 'rvol', db: 0, base: this.doc }); return; } this.openExistingOr('vol'); return;
        case 'split': {
          if (inRange) { let d = splitAt(this.doc, this.sel[0]); d = splitAt(d, this.sel[1]); this.commit(d, '在 ' + cmp(this.sel[0]) + ' 和 ' + cmp(this.sel[1]) + ' 分割', true); this.kick(); return; }
          const u = Math.round(this.ph); if (u <= 0 || u >= this.L || seamsOf(this.doc.pieces).includes(u)) { this.toast(this.t('先把播放头放到要分开的地方', 'Move the playhead first')); return; }
          this.commit(splitAt(this.doc, u), '在 ' + cmp(u) + ' 分割'); this.kick(); return;
        }
        case 'dup': { const [a, b] = this.sel; this.commit(withP(this.doc, insP(this.doc.pieces, b, slice(this.doc.pieces, a, b))), '重复 ' + cmp(a) + '–' + cmp(b)); this.sel = [b, b + (b - a)]; this.resetStack(); this.kick(); return; }
        case 'exact': this.push({ t: 'exact' }); return;
        case 'beats': this.beats = true; this.push({ t: 'beats', bpm: 120 }); this.kick(); return;
        case 'xpart': this.openExport(); return;
        case 'all': this.stack = [{ t: 'strip', ctx: 'rest' }]; this.select(0, this.L); return;
        case 'chorus': this.findChorus(); return;
        case 'pauses': this.findPauses(10); this.push({ t: 'pauses', min: 10 }); return;
        case 'marker': { const u = Math.round(this.ph), s = srcAt(this.doc, u); const n = (this.doc.markers || []).length + 1; this.commit(Object.assign({}, this.doc, { markers: (this.doc.markers || []).concat([{ id: 'm' + (++uid), name: '标记 ' + n, src: s.src, f: s.f }]) }), '标记 ' + n, true); this.kick(); return; }
        case 'divide': this.push({ t: 'divide', base: this.doc, m: 'every', n: 30, v: null }); return;
        case 'pieces': this.push({ t: 'pieces' }); return;
        case 'seams': this.push({ t: 'seams', base: this.doc }); return;
        case 'loopto': this.push({ t: 'loopto', base: this.doc, v: null }); return;
        case 'dn': case 'ld': case 'rp': case 'fx': case 'vc': case 'sp': case 'ch': case 'sep': this.openExistingOr(k); return;
        case 'rev': {
          const ex = this.doc.layers.find(l => l.k === 'rev');
          this.commit(Object.assign({}, this.doc, { layers: ex ? this.doc.layers.filter(l => l !== ex) : this.doc.layers.concat([{ id: 'l' + (++uid), k: 'rev', v: 1, on: true }]) }), ex ? '去掉倒放' : '倒放', true); this.renderArea(); this.kick(); return;
        }
        case 'env': this.push({ t: 'env', base: this.doc }); this.showCoach('env', this.t('点一下加点，拖动调整', 'Tap to add a point'), this.W / 2, this.geom().mainY + 16, true); this.kick(); return;
        case 'rec': this.startRec(); return;
        case 'music': this.push({ t: 'music', src: 'lib' }); return;
        case 'mlib': this.push({ t: 'list', title: this.t('音频库', 'Library'), pick: 'pickLib', items: LIBMUSIC }); return;
        case 'mfile': this.pickFile(() => this.addTrack({ src: 'music3', name: '夏日午后.mp3', lane: 1 })); return;
        case 'monline': this.push({ t: 'online' }); return;
        case 'audio': this.push({ t: 'list', title: this.t('音频库', 'Library'), pick: 'pickAudio', items: LIBAUDIO, where: true }); return;
        case 'file': this.pickFile(() => this.placeAudio('clipC', '补录.m4a')); return;
        case 'video': this.pickFile(() => this.placeAudio('clipB', '现场视频.mp4')); return;
        case 'tts': this.push({ t: 'tts', s: { text: '欢迎收听本期节目。' } }); return;
        case 'sub': this.push({ t: 'sub', s: {} }); return;
        case 'sil': this.push({ t: 'sil', base: this.doc, n: null }); return;
        case 'clone': this.push({ t: 'clone', s: {} }); return;
        case 'paste': { const len = docLen({ pieces: this.clipboard.pieces }); const at = clamp(Math.round(this.ph), 0, this.L); this.hand = { a: at, b: at, len, clipDoc: withP(this.doc, this.clipboard.pieces), rest: this.doc, at, from: -1, mode: 'tap', copy: true }; this.gap = { at: new Spring(at, P.lead, 0.05), w: new Spring(0, P.gap, 0.05).to(len), fill: 'drop' }; this.push({ t: 'hand' }); this.kick(); return; }
        case 'tvol': case 'duck': case 'tfade': case 'tstart': this.push({ t: k }); return;
        case 'swap': this.push({ t: 'music', src: 'lib' }); return;
        case 'mute': case 'solo': { const tr = this.trk(); this.commit(Object.assign({}, this.doc, { tracks: this.doc.tracks.map(t => t.id === tr.id ? Object.assign({}, t, { [k]: !t[k] }) : t) }), (tr[k] ? '取消' : '') + (k === 'mute' ? '静音' : '独听') + ' ' + tr.name, true); this.renderArea(); this.kick(); return; }
        case 'tdel': { const tr = this.trk(); this.commit(Object.assign({}, this.doc, { tracks: this.doc.tracks.filter(t => t.id !== tr.id) }), '删除 ' + tr.name); this.track = null; this.resetStack(); this.kick(); return; }
        case 'rename': this.push({ t: 'rename', base: this.doc }); setTimeout(() => { const i = this.areaEl.querySelector('input'); if (i && window.matchMedia('(pointer: fine)').matches) i.focus(); }, 60); return;
        case 'details': this.push({ t: 'details' }); return;
        case 'history': this.push({ t: 'history' }); return;
        case 'saveas': this.toast(this.t('已另存为「', 'Saved as “') + this.doc.name + this.t(' 副本」', ' copy”')); return;
        case 'stt': this.push({ t: 'stt' }); return;
        case 'pkg': this.modal(`<div class="handle"></div><div class="sys">系统 · 选择保存位置</div><h4>${esc(this.doc.name)}.zip</h4><div class="folder on">${ic('Folder', 22)}<span>下载</span></div><button class="btn pri" data-a="modalClose">保存</button>`); return;
        case 'delaudio': this.modal(`<h4 style="margin-top:6px">删除「${esc(this.doc.name)}」？</h4><p style="margin:0;color:var(--dim);font-size:var(--t14)">删除后无法恢复，已经导出的文件不受影响。</p><div class="vrow"><button class="btn sec" data-a="modalClose">取消</button><button class="btn pri" style="background:var(--error)" data-a="confirmDel">删除</button></div>`); return;
        case 'goto': this.push({ t: 'goto' }); return;
        case 'speed': this.push({ t: 'speed' }); return;
        case 'loop': this.loop = !this.loop; this.renderArea(); this.renderTime(); return;
        case 'spec': this.spec = !this.spec; this.renderArea(); this.kick(); return;
        case 'fit': this.view.a.to(0); this.view.b.to(this.dispLen()); this.kick(); return;
        case 'mrename': this.toast(this.t('键盘输入名称', 'Type a name')); return;
        case 'msplit': { const m = this.doc.markers.find(x => x.id === this.marker); const u = markerPos(this.doc, m); this.marker = null; this.commit(splitAt(this.doc, u), '在' + m.name + '处分割'); this.resetStack(); this.kick(); return; }
        case 'mdel': { const m = this.doc.markers.find(x => x.id === this.marker); this.marker = null; this.commit(Object.assign({}, this.doc, { markers: this.doc.markers.filter(x => x !== m) }), '删除' + m.name); this.resetStack(); this.kick(); return; }
      }
    }
    openExistingOr(k) {
      const scoped = this.sel && SELCTX.has(this.top.ctx);
      const ex = !scoped && this.doc.layers.find(l => l.k === k && l.a === undefined);
      this.openLayer(k, ex || null);
    }
    placeAudio(src, name) {
      const len = SRC[src].n, w = this.where || 'ins';
      if (w === 'mix') { this.addTrack({ src, name, k: 'voice', lane: 5, fill: false, s: 0, e: len, at: Math.round(this.ph), duck: false, gain: 1, fi: 0, fo: 0, loop: false }, '叠加「' + name + '」'); return; }
      this.insertPiece(src, len, '插入「' + name + '」', w);
    }
    pickFile(then) {
      this.pendingFile = then;
      this.modal(`<div class="handle"></div><div class="sys">${this.t('系统 · 选择文件', 'System · Pick a file')}</div>${['补录.m4a', '夏日午后.mp3', '现场视频.mp4'].map(n => `<button class="folder" data-a="sysSave">${ic('AudioFile', 22)}<span>${n}</span></button>`).join('')}`);
    }
    startRec() {
      this.stopPlay(); this.sel = null;
      this.rec = { at: Math.round(this.ph), len: 0, running: false };
      this.gap = { at: this.rec.at, w: 0, fill: 'rec' };
      this.stack = [this.rootView(), { t: 'rec' }]; this.markTool = 'rec'; this.renderArea(); this.kick();
    }
    /** While recording only the clock and the level meter change; the controls stay put so a tap always lands. */
    recMeter() {
      const r = this.rec, t = this.areaEl.querySelector('.rectime'); if (t) t.textContent = clkd(r.len);
      this.areaEl.querySelectorAll('.meter i').forEach((el, i) => { el.style.height = (15 + 85 * Math.abs(Math.sin(i * 1.7 + r.len * 0.9)) * (0.4 + 0.6 * hash01(i + Math.floor(r.len)))).toFixed(0) + '%'; });
      if (!this.areaEl.querySelector('[data-a=recOk]') && r.len > 0) this.renderArea();
      this.renderTime();
    }
    recToggle() { if (!this.rec) return; this.rec.running = !this.rec.running; this.renderTop(); this.renderArea(); this.kick(); }
    recFinish() {
      const r = this.rec; r.running = false; const len = Math.max(1, Math.round(r.len));
      const id = newRecSource(len);
      this.rec = null; this.gap = null;
      this.ph = r.at;
      if (this.rwhere === 'mix') { this.addTrack({ src: id, name: '录音 ' + clk(len), k: 'voice', lane: 4, fill: false, s: 0, e: len, at: r.at, duck: false, gain: 1, fi: 0, fo: 0, loop: false }, '录音 ' + dur(len)); return; }
      this.insertPiece(id, len, '录音 ' + dur(len));
      this.renderTop();
    }
    recCancel(quiet, noRender) {
      const had = this.rec && this.rec.len > 0;
      this.rec = null; this.gap = null;
      if (noRender) { this.renderTop(); return; }
      this.stack = [this.rootView()]; this.renderArea();
      if (had) this.toast(this.t('这段录音留在“之前录的”里', 'Kept in recordings'));
      this.kick();
    }
    ttsGo() {
      const at = clamp(Math.round(this.ph), 0, this.L), len = SRC.tts.n;
      this.stack = [this.rootView()];
      this.gap = { at, w: new Spring(0, P.gap, 0.05).to(len), fill: 'tts' }; this.renderArea();
      const t0 = performance.now();
      this.anim = () => { if (performance.now() - t0 < 1200) return true; this.anim = null; this.gap = null; this.insertPiece('tts', len, '朗读「欢迎收听本期节目。」'); return false; };
      this.kick();
    }
    subGo() {
      const top = this.top; top.s.run = 0; this.renderArea();
      const iv = setInterval(() => {
        if (this.top !== top) { clearInterval(iv); return; }
        top.s.run++;
        if (top.s.run >= SUBS.length) { clearInterval(iv); top.s.done = true; this.commit(Object.assign({}, this.doc, { tracks: this.doc.tracks.concat([{ id: 't' + (++uid), k: 'dub', name: '配音', src: 'dub', gain: 1, duck: false, duckTo: 1, fill: false, at: 0, s: 0, e: Math.min(SRC.dub.n, this.L), fi: 0, fo: 0, lane: 3, loop: false }]) }), '字幕配音', true); }
        this.renderArea();
      }, 260);
    }
    findPauses(min) { this.marks = pausesOf(this.doc, min).map(([a, b]) => ({ a, b, t: 'pause', on: true })); this.kick(); }
    pausesGo() {
      const on = this.marks.filter(m => m.on); if (!on.length) return;
      const kill = new Uint8Array(this.L); on.forEach(m => { for (let u = m.a; u < m.b; u++) kill[u] = 1; });
      const order = []; for (let u = 0; u < this.L; u++) if (!kill[u]) order.push(u);
      const L0 = this.L;
      this.marks = null;
      this.commit(byOrder(this.doc, order), '删掉 ' + on.length + ' 处停顿');
      this.ph = 0; this.view.b.snap(L0); this.view.a.to(0); this.view.b.to(this.L, P.view); this.resetStack(); this.kick();
    }
    findChorus() {
      const s = this.doc.pieces.length === 1 && SRC[this.doc.pieces[0].src].chorus;
      this.chorus = s ? s.map(c => [c[0] - this.doc.pieces[0].s, c[1] - this.doc.pieces[0].s]) : [];
      this.push({ t: 'chorus', i: 0, len: 0 });
      if (this.chorus.length) this.pickCand();
    }
    fitChorus(c, len) { if (!len) return c.slice(); const mid = (c[0] + c[1]) / 2; const a = clamp(Math.round(mid - len / 2), 0, this.L - len); return [a, a + len]; }
    pickCand() {
      const top = this.top; const i = top.i || 0, len = top.len || 0;
      this.marks = this.chorus.map((c, j) => ({ a: c[0], b: c[1], t: 'cand', on: j === i, label: String(j + 1) }));
      const s = this.fitChorus(this.chorus[i], len); this.sel = s; this.ph = s[0];
      this.kick();
    }

    // ---------------------------------------------------------------- touch on the timeline
    bindCanvas() {
      const cv = this.cv, pts = new Map();
      let g0 = null;
      const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      const zone = p => {
        const g = this.geom();
        if (g.ovH && p.y >= g.ovY) return { z: 'ov' };
        if (p.y < g.ruler) return { z: 'ruler' };
        if (p.y >= g.mainY && p.y < g.mainY + g.mainH + 8) return { z: 'main' };
        for (const ln of g.lanes) if (p.y >= ln.y && p.y < ln.y + ln.h) return { z: 'lane', t: ln.t };
        return { z: 'none' };
      };
      /** Snaps to the ends, seams, markers, the playhead (and beats); a finger beyond an end means that end. */
      const snapU = (u, x) => {
        const d = this.shownDoc(), L = docLen(d), tol = 10 / this.ppu(), endTol = 18 / this.ppu();
        if (x !== undefined && x <= this.xOf(0) + 2) return 0;
        if (x !== undefined && x >= this.xOf(L) - 2) return L;
        if (Math.abs(u) < endTol) return 0;
        if (Math.abs(u - L) < endTol) return L;
        const c = [this.ph].concat(seamsOf(d.pieces), (d.markers || []).map(m => markerPos(d, m)).filter(v => v !== null), this.beats && this.snapBeats !== false ? Array.from({ length: Math.floor(L / 5) }, (_, i) => i * 5) : []);
        let best = u, bd = tol;
        for (const s of c) { const dd = Math.abs(s - u); if (dd < bd) { bd = dd; best = s; } }
        return Math.round(clamp(best, 0, L));
      };
      const inStrip = p => p.x < EDGE || p.x > this.W - EDGE;
      cv.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const p = pos(e);
        if (inStrip(p)) return;                       // the system's: an edge swipe is Back
        cv.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, p);
        if (pts.size === 2) { const [p1, p2] = [...pts.values()]; this.cancelGesture(g0); g0 = { k: 'pinch', d0: Math.abs(p1.x - p2.x) || 1, a0: this.view.a.v, b0: this.view.b.v, mx: (p1.x + p2.x) / 2 }; this.drag = null; return; }
        const zn = zone(p);
        g0 = { k: 'pending', p0: p, zn, u0: this.uOf(p.x) };
        this.hideCoach();
        if (this.sel && (!this.holding || ['fade', 'rvol', 'exact'].includes(this.top.t)) && zn.z === 'main') {
          let best = -1, bd = 1e9;
          for (let i = 0; i < 2; i++) { const r = this.handleRect(i); if (p.x >= r.l && p.x <= r.r && p.y >= r.t && p.y <= r.b) { const dd = Math.abs(p.x - this.d2x(this.sel[i])); if (dd < bd) { bd = dd; best = i; } } }
          if (best >= 0) { g0.k = 'handle'; g0.i = best; this.dragSel = true; return; }
        }
        if (zn.z === 'main' && !this.holding) {
          const u = this.uOf(p.x), inSel = this.sel && u > this.sel[0] && u < this.sel[1];
          const pi = pieceIndexAt(this.doc.pieces, clamp(u, 0, this.L - 1));
          if (inSel || this.doc.pieces.length > 1) g0.lp = setTimeout(() => {
            if (!g0 || g0.k !== 'pending') return;
            const r = inSel ? this.sel : pieceRange(this.doc.pieces, pi);
            g0.k = 'lift'; if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) { /* none */ }
            this.startHand(r[0], r[1], 'lift', false); this.hand.fx = p.x; this.hand.fy = p.y; this.handTarget(this.uOf(p.x) - this.hand.len / 2);
            g0.last = p; this.drag = { x: p.x, apply: () => this.handTarget(this.uOf(g0.last.x) - this.hand.len / 2) };
            this.kick();
          }, 420);
        }
      });
      cv.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId)) return;
        const p = pos(e); pts.set(e.pointerId, p);
        if (!g0) return;
        if (g0.k === 'pinch' && pts.size === 2) {
          const [p1, p2] = [...pts.values()], dd = Math.abs(p1.x - p2.x) || 1, Ld = this.dispLen();
          const span0 = g0.b0 - g0.a0, span = clamp(span0 * g0.d0 / dd, 20, Ld), um = g0.a0 + (g0.mx - G) / this.IW * span0;
          let a = um - ((p1.x + p2.x) / 2 - G) / this.IW * span; a = clamp(a, 0, Ld - span);
          this.view.a.snap(a); this.view.b.snap(a + span); this.kick(); return;
        }
        const dx = p.x - g0.p0.x, dy = p.y - g0.p0.y;
        if (g0.k === 'pending') {
          if (Math.hypot(dx, dy) < 8) return;
          clearTimeout(g0.lp);
          if (Math.abs(dy) > Math.abs(dx)) { g0.k = 'none'; return; }   // vertical: the page scrolls (touch-action: pan-y)
          const z = g0.zn.z;
          if (z === 'ruler' || z === 'ov' || (this.holding && this.top.t !== 'env')) g0.k = z === 'ov' ? 'ov' : 'scroll';
          else if (this.top.t === 'env') g0.k = 'none';
          else { g0.k = 'select'; this.dragSel = true; this.track = null; this.marker = null; g0.a = snapU(clamp(g0.u0, 0, this.L), g0.p0.x); }
          g0.va = this.view.a.v; g0.vb = this.view.b.v;
        }
        g0.last = p;
        if (g0.k === 'select') {
          const apply = () => { const x = g0.last.x, u = snapU(this.uOf(x), x); this.sel = [Math.min(g0.a, u), Math.max(g0.a, u)]; this.renderTime(); this.kick(); };
          this.drag = { x: p.x, apply }; apply();
        } else if (g0.k === 'handle') {
          const apply = () => { const x = g0.last.x, u = snapU(this.uOf(x), x), s = this.sel.slice(); s[g0.i] = u; if (s[0] > s[1]) { s.reverse(); g0.i = 1 - g0.i; } this.sel = s; this.renderTime(); this.kick(); };
          this.drag = { x: p.x, apply }; apply();
        } else if (g0.k === 'scroll') {
          const span = g0.vb - g0.va, Ld = this.dispLen(); const a = clamp(g0.va - dx / this.ppu(), 0, Math.max(0, Ld - span)); this.view.a.snap(a); this.view.b.snap(a + span); this.kick();
        } else if (g0.k === 'ov') {
          const Ld = this.dispLen(), span = g0.vb - g0.va, a = clamp(g0.va + dx / this.IW * Ld, 0, Ld - span); this.view.a.snap(a); this.view.b.snap(a + span); this.kick();
        } else if (g0.k === 'lift') {
          this.hand.fx = p.x; this.hand.fy = p.y; if (!this.drag) this.drag = { x: p.x, apply: () => this.handTarget(this.uOf(g0.last.x) - this.hand.len / 2) }; this.drag.x = p.x; this.drag.apply(); this.kick();
        } else if (g0.k === 'envpt') {
          const g = this.geom(); const env = this.doc.env.map(q => Object.assign({}, q)); const pt = env[g0.i];
          pt.u = clamp(Math.round(this.uOf(p.x)), 0, this.L); pt.db = clamp(Math.round(24 - (p.y - g.mainY - 6) / (g.mainH - 12) * 36 - 12), -24, 12);
          env.sort((x, y) => x.u - y.u); g0.i = env.indexOf(pt);
          this.liveSet(Object.assign({}, this.doc, { env }), '音量曲线', this.top);
        }
      });
      const end = e => {
        if (!pts.has(e.pointerId)) return;
        pts.delete(e.pointerId);
        this.drag = null;
        if (!g0) return;
        clearTimeout(g0.lp);
        const k = g0.k; const p = g0.p0;
        if (k === 'pinch') { if (pts.size === 0) g0 = null; return; }
        this.dragSel = false;
        if (k === 'pending' && e.type === 'pointerup') this.tap(p, g0.zn, snapU);
        else if (k === 'select') {
          if (!this.sel || this.sel[1] - this.sel[0] < 2) { this.sel = null; this.renderTime(); }
          else { this.resetStack(); const g = this.geom(); this.showCoach('hold', this.t('按住选中的部分可以拖走', 'Hold the selection to drag it'), this.d2x((this.sel[0] + this.sel[1]) / 2), g.mainY + g.mainH * 0.3); }
        } else if (k === 'handle') { this.renderArea(); }
        else if (k === 'lift') { if (e.type === 'pointerup') this.handDrop(); else this.handCancel(); }
        this.kick();
        g0 = null;
      };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      // the volume curve: a point is dragged where it is touched
      cv.addEventListener('pointerdown', e => {
        if (this.top.t !== 'env' || !g0 || g0.k !== 'pending') return;
        const p = pos(e), env = this.doc.env || [], g = this.geom(), yOf = db => g.mainY + 6 + (1 - (db + 24) / 36) * (g.mainH - 12);
        const i = env.findIndex(q => { const [l, r] = this.hit(this.d2x(q.u), 32); return p.x >= l && p.x <= r && Math.abs(yOf(q.db) - p.y) < 22; });
        if (i >= 0) { g0.k = 'envpt'; g0.i = i; }
      });
      cv.addEventListener('wheel', e => {
        e.preventDefault();
        const Ld = this.dispLen(), span = this.view.b.t - this.view.a.t;
        if (e.ctrlKey || e.metaKey) {
          const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left - G) / this.IW, um = this.view.a.v + mx * span;
          const ns = clamp(span * Math.exp(e.deltaY * 0.004), 20, Ld); const a = clamp(um - mx * ns, 0, Ld - ns);
          this.view.a.snap(a); this.view.b.snap(a + ns);
        } else { const a = clamp(this.view.a.v + (e.deltaX || e.deltaY) / this.ppu(), 0, Math.max(0, Ld - span)); this.view.a.snap(a); this.view.b.snap(a + span); }
        this.kick();
      }, { passive: false });
    }
    cancelGesture(g) { if (g) clearTimeout(g.lp); if (g && g.k === 'select') this.sel = null; this.drag = null; }
    tap(p, zn, snapU) {
      const u = this.uOf(p.x), now = performance.now();
      const dbl = now - (this._tapT || 0) < 320 && Math.abs(p.x - (this._tapX || -99)) < 24; this._tapT = now; this._tapX = p.x;
      const top = this.top;
      if (zn.z === 'main' && p.y < this.geom().mainY + 26 && !this.holding) {
        const d = this.shownDoc(), hit = (d.markers || []).find(m => { const mp = markerPos(d, m); if (mp === null) return false; const x = this.d2x(mp); return p.x >= Math.max(SAFE, x - 4) && p.x <= x + 64; });
        if (hit) { this.marker = hit.id; this.sel = null; this.track = null; this.ph = markerPos(d, hit); this.resetStack(); this.kick(); return; }
      }
      if (top.t === 'hand') { this.handTarget(snapU(u, p.x)); return; }
      if (top.t === 'env' && zn.z === 'main') {
        const g = this.geom(), env = (this.doc.env || []).map(q => Object.assign({}, q)), yOf = db => g.mainY + 6 + (1 - (db + 24) / 36) * (g.mainH - 12);
        const hit = env.findIndex(q => { const [l, r] = this.hit(this.d2x(q.u), 32); return p.x >= l && p.x <= r && Math.abs(yOf(q.db) - p.y) < 22; });
        if (hit >= 0) env.splice(hit, 1);
        else { env.push({ u: clamp(Math.round(u), 0, this.L), db: clamp(Math.round(24 - (p.y - g.mainY - 6) / (g.mainH - 12) * 36 - 12), -24, 12) }); env.sort((a, b) => a.u - b.u); }
        this.liveSet(Object.assign({}, this.doc, { env }), '音量曲线', top); return;
      }
      if (top.t === 'pauses' && zn.z === 'main') { const m = this.marks.find(q => u >= q.a - 2 && u <= q.b + 2); if (m) { m.on = !m.on; this.renderArea(); this.kick(); return; } }
      if (top.t === 'chorus' && zn.z === 'main' && this.chorus.length) { const j = this.chorus.findIndex(c => u >= c[0] && u <= c[1]); if (j >= 0) { top.i = j; this.pickCand(); this.renderArea(); return; } }
      if (zn.z === 'lane' && !this.holding) { this.track = zn.t.id; this.sel = null; this.marker = null; this.stopPlay(); this.resetStack(); this.kick(); return; }
      if (zn.z === 'main' && dbl && !this.holding && this.doc.pieces.length > 1) { const r = pieceRange(this.doc.pieces, pieceIndexAt(this.doc.pieces, clamp(u, 0, this.L - 1))); this.select(r[0], r[1]); return; }
      const L = docLen(this.shownDoc());
      this.ph = Math.round(clamp(snapU(u, p.x), 0, L));
      if (!this.holding) {
        if (this.sel && (u < this.sel[0] || u > this.sel[1])) this.clearSel();
        else if (this.track || this.marker) this.clearSel();
      }
      if (this.playing && this.range) { this.range = this.sel && !this.holding ? this.sel.slice() : [0, this.shownLen()]; }
      this.renderTime(); this.kick();
    }
  }

  // ------------------------------------------------------------------ helpers
  function envGain(env, u) {
    if (u <= env[0].u) return Math.pow(10, env[0].db / 20);
    for (let i = 1; i < env.length; i++) if (u <= env[i].u) { const t = (u - env[i - 1].u) / Math.max(1, env[i].u - env[i - 1].u); return Math.pow(10, lerp(env[i - 1].db, env[i].db, t) / 20); }
    return Math.pow(10, env[env.length - 1].db / 20);
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function hexA(c, a) {
    c = (c || '#000').trim();
    if (c.startsWith('rgba')) return c;
    if (c.startsWith('rgb')) return c.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
    const n = parseInt(c.slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  window.WB = { Bench, SRC, sec, slice, cutP, insP, withP, splitAt, rangeSet, docLen, flat, pausesOf, parsePlan, planEdits, Spring, P, ic, clk, cmp, dur, LAYER, newRecSource, byOrder, EDGE, SAFE, G, SCROLLZ };
})();
