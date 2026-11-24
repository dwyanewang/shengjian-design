/* 声剪 工作台 第十二轮：一个组件画出所有手机画面；live 的那台可以用手指和鼠标操作。
   v12: the speech is real (speech.js, 100 frames a second), pauses read at the fitted zoom; a single audio sits low on
   its horizon near play; the selection has two grips that magnify time when held; recording has one round button;
   export asks the purpose first; 常用 follows what the audio is; the sentence shows one example the first time.
   The dock has one anatomy: the instrument (one slot: the sentence at rest, or the open setting's control), the tools,
   the categories. A task that ends in a decision takes the whole dock over. Play and undo float on the waterline. */
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
  function clk(u) { const t = Math.max(0, Math.round(u / SR)); const h = Math.floor(t / 3600); return (h ? h + ':' + p2(Math.floor(t / 60) % 60) : Math.floor(t / 60)) + ':' + p2(t % 60); }
  function clkd(u) { const t = Math.max(0, Math.round(u)); const s = Math.floor(t / SR); const h = Math.floor(s / 3600); return (h ? h + ':' + p2(Math.floor(s / 60) % 60) : Math.floor(s / 60)) + ':' + p2(s % 60) + '.' + (t % SR); }
  function cmp(u) { const t = Math.max(0, Math.round(u)); const s = Math.floor(t / SR); const h = Math.floor(s / 3600); return (h ? h + ':' + p2(Math.floor(s / 60) % 60) : Math.floor(s / 60)) + ':' + p2(s % 60) + (t % SR ? '.' + (t % SR) : ''); }
  function dur(u) { const s = u / SR; if (s < 60) return (Math.round(s * 10) / 10) + NB + '秒'; const t = Math.round(s); return Math.floor(t / 60) + NB + '分' + (t % 60 ? NB + (t % 60) + NB + '秒' : ''); }
  function durEn(u) { const s = u / SR; if (s < 60) return (Math.round(s * 10) / 10) + NB + 's'; const t = Math.round(s); return Math.floor(t / 60) + NB + 'min' + (t % 60 ? NB + (t % 60) + NB + 's' : ''); }

  // ------------------------------------------------------------------ springs (ui/Flow.kt, ui/Motion.kt)
  const P = { lead: { k: 300, z: 0.62 }, trail: { k: 170, z: 0.78 }, grow: { k: 380, z: 0.5 }, move: { k: 260, z: 0.9 }, gap: { k: 190, z: 0.82 }, view: { k: 210, z: 0.86 }, mag: { k: 520, z: 0.95 } };
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

  // ------------------------------------------------------------------ audio sources (levels at 100 frames a second)
  // v12: every speech source is measured from real speech (speech.js: the interview, the clips, the take, the dubbing,
  // all spoken by the LAN TTS service's built-in voices and mixed over room noise; workbench-work/v12/audio). Per frame
  // a source keeps the peak of the sound (fc) and of the noise under it (fz), linear; the waveform is drawn from these,
  // so a pause is a pause. Per edit unit (0.1 s) the same as bar heights (cl, nz) for the edit model.
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const FPU = 10;                                     // frames per edit unit
  /** A peak level as a bar's height: a gentle power curve, so quiet speech and the room's noise floor still show. */
  const disp = a => a <= 0 ? 0 : Math.min(1, Math.pow(a / 0.9, 0.7));
  function unb64(s) { const t = atob(s), out = new Float32Array(t.length); for (let i = 0; i < t.length; i++) { const b = t.charCodeAt(i); out[i] = b ? Math.pow(10, (b / 2.5 - 96) / 20) : 0; } return out; }
  function fromFrames(fc, fz, kind, extra) {
    const n = Math.floor(fc.length / FPU), cl = new Float32Array(n), nz = new Float32Array(n);
    for (let u = 0; u < n; u++) { let c = 0, z = 0; for (let k = u * FPU, e = k + FPU; k < e; k++) { if (fc[k] > c) c = fc[k]; if (fz && fz[k] > z) z = fz[k]; } cl[u] = disp(c); nz[u] = disp(z); }
    return Object.assign({ n, fc, fz, cl, nz, kind }, extra || {});
  }
  const SP = window.SPEECH || {};
  const speech = k => fromFrames(unb64(SP[k].c), SP[k].z ? unb64(SP[k].z) : null, 'speech');
  /**
   * Music: beats with onsets that decay (kick, snare, hats), notes over a pad, in parts of different loudness. Parts:
   * [kind, units, level]; kinds: i intro (pad and notes), v verse, c chorus (the same pattern each time), b bridge,
   * o outro (fades), p piano (notes with long decays, no drums), g groove (drums all through).
   */
  function renderMusic(parts, seed, bpm) {
    const n = parts.reduce((a, p) => a + p[1], 0), nf = n * FPU, fc = new Float32Array(nf), fz = new Float32Array(nf);
    const bf = 6000 / bpm, chorus = [];
    let at = 0;
    for (const [kind, len, lv] of parts) {
      const r = rng(kind === 'c' ? 991 + seed : seed + at), F = len * FPU, a0 = at * FPU;
      if (kind === 'c') chorus.push([at, at + len]);
      const drums = kind === 'v' || kind === 'c' || kind === 'g', four = kind === 'c', notesP = kind === 'p' ? 0.7 : kind === 'i' || kind === 'b' ? 0.55 : 0.35;
      const nDec = kind === 'p' ? 70 : 28, padL = kind === 'p' ? 0.12 : kind === 'c' ? 0.42 : 0.3;
      let kick = 0, snare = 0, hat = 0, note = 0, nextNote = 0, noteAmp = 0;
      for (let f = 0; f < F; f++) {
        const t = f / bf, b = Math.floor(t), ph = t - b, onBeat = f === Math.round(b * bf), onHalf = f === Math.round((b + 0.5) * bf);
        if (drums && onBeat && (four || b % 2 === 0)) kick = 1;
        if (drums && onBeat && b % 2 === 1) snare = 0.78;
        if (drums && (onBeat || onHalf)) hat = 0.3;
        if (f >= nextNote) { note = 0.42 + r() * 0.36; noteAmp = note; nextNote = f + Math.round(bf * (r() < notesP ? 0.5 : 1)); }
        kick *= Math.exp(-1 / 9); snare *= Math.exp(-1 / 13); hat *= Math.exp(-1 / 3.5); note *= Math.exp(-1 / nDec);
        let pad = padL * (0.86 + 0.14 * Math.sin((a0 + f) / 230 + seed));
        let v = Math.max(pad, kick, snare, hat, note * (kind === 'p' ? 1 : 0.85));
        // a part's own swell, and an outro that fades to nothing
        let g = lv * (0.94 + 0.06 * Math.sin(f / (bf * 8) * Math.PI));
        if (kind === 'o') g *= 1 - f / F;
        if (kind === 'i') g *= Math.min(1, 0.3 + f / (bf * 8));
        fc[a0 + f] = Math.min(0.97, v * g * (0.93 + 0.07 * r()));
        fz[a0 + f] = 0.0006;
        void ph; void noteAmp;
      }
      at += len;
    }
    for (let i = 0; i < Math.min(nf, 120); i++) { fc[i] *= i / 120; }
    return fromFrames(fc, fz, 'music', { chorus, beat: Math.round(bf / FPU * 10) / 10 });
  }
  function genMusic(n, seed, o) {
    o = o || {};
    const k = o.piano ? 'p' : 'g', lv = o.base || 0.6, q = Math.round(n / 8);
    // sections: a soft start, two bodies with a lift between, a softer middle, a lift again, the end fading
    const parts = [[k, q, lv * 0.7], [k, q * 2, lv], [k, q, lv * 0.8], [k, q * 2, lv * 1.15], [k, q, lv * 0.85], ['o', n - q * 7, lv * 0.9]];
    return renderMusic(parts, seed, o.bpm || 110);
  }
  /** A song: intro, verses, three choruses that repeat the same shape (what the chorus finder looks for). */
  function genSong(seed) {
    return renderMusic([['i', 140, 0.42], ['v', 290, 0.6], ['c', 300, 0.95], ['v', 280, 0.62], ['c', 300, 0.96], ['b', 200, 0.5], ['c', 320, 0.97], ['o', 120, 0.6]], seed, 96);
  }
  /**
   * The two-hour meeting: the interview's real lines tiled by four people at different distances from the phone, with
   * pauses of every length, over the room's noise. It breaks around the given times (in seconds) so a sentence
   * selected there starts and ends in a pause.
   */
  function genLong(n, seed, breaks) {
    const V = SRC.voice, utt = (SP.voice && SP.voice.utt) || [], nf = n * FPU, fc = new Float32Array(nf), fz = new Float32Array(nf), r = rng(seed);
    const people = [0, -4, -7.5, -2.5], fixed = (breaks || []).map(s => s * 100);
    let t = 150, who = 0;
    while (t < nf && utt.length) {
      if (r() < 0.28) who = Math.floor(r() * people.length);
      const [a, b, spk] = utt[Math.floor(r() * utt.length)], len = b - a;
      const hit = fixed.find(x => x > t - 45 && x < t + len + 45);
      if (hit !== undefined) { t = hit + 45 + Math.round(r() * 20); continue; }
      const g = Math.pow(10, (people[who] + (spk === 0 ? 6.3 : 0) + (r() - 0.5) * 2.4) / 20);
      for (let i = 0; i < len && t + i < nf; i++) fc[t + i] = Math.min(0.95, V.fc[a + i] * g);
      t += len + (r() < 0.12 ? 110 + Math.round(r() * 220) : 25 + Math.round(r() * 55));
    }
    for (let i = 0; i < nf; i++) fz[i] = V.fz ? V.fz[i % V.fz.length] * 1.4 : 0.002;
    return fromFrames(fc, fz, 'speech');
  }
  const SRC = {
    voice: speech('voice'),
    song: genSong(5),
    music1: genMusic(1300, 3, { base: 0.62, bpm: 116 }),
    music2: genMusic(1050, 8, { base: 0.5, piano: true, bpm: 84 }),
    music3: genMusic(1500, 12, { base: 0.6, bpm: 102 }),
    clipA: speech('clipA'),
    clipB: speech('clipB'),
    clipC: speech('clipC'),
    tts: speech('tts'),
    dub: speech('dub'),
    rec: speech('rec'),
    sil: { n: 1e9, cl: null, nz: null, fc: null, fz: null, kind: 'sil' },
  };
  SRC.long = genLong(73950, 71, [3725, 3741.5]);
  const SRCL = [];
  const SRC_IDX = {}; Object.keys(SRC).forEach((k, i) => { SRC_IDX[k] = i; SRCL[i] = SRC[k]; });
  let recSeed = 300;
  /** A new take: the phone's recording of the host (real speech), from its start; a later take starts further in. */
  function newRecSource(len) {
    const id = 'rec' + (++recSeed), R = SRC.rec, nf = Math.max(len, 1) * FPU, off = ((recSeed - 301) * 230) % R.fc.length;
    const fc = new Float32Array(nf), fz = new Float32Array(nf);
    for (let i = 0; i < nf; i++) { const k = (off + i) % R.fc.length; fc[i] = R.fc[k]; fz[i] = R.fz ? R.fz[k] : 0; }
    SRC[id] = fromFrames(fc, fz, 'speech'); SRC_IDX[id] = SRCL.length; SRCL.push(SRC[id]);
    return id;
  }
  /** The tallest column of the phone's take at a typical width (the recording in progress is drawn from it). */
  let _takePk = null;
  function takePeak() { if (_takePk === null) { const R = SRC.rec; let m = 0; for (let u = 0; u < R.n; u++) m = Math.max(m, srcCol(R, u, u + 1, true)); _takePk = m; } return _takePk; }
  /** One column of a source on its own (a track): the mean of the frames under it, lifted toward their peak. */
  function srcCol(S, ua, ub, loop, q) {
    const nf = S.fc.length; let f0 = Math.floor(ua * FPU), f1 = Math.max(f0 + 1, Math.ceil(ub * FPU));
    const step = Math.max(1, Math.floor((f1 - f0) / 120)); let mx = 0, sum = 0, c = 0, sp = 0;
    for (let f = f0; f < f1; f += step) { const k = loop ? ((f % nf) + nf) % nf : clamp(f, 0, nf - 1); if (S.fc[k] > 0.0045) sp++; const h = disp(S.fc[k] + (S.fz ? S.fz[k] : 0)); if (h > mx) mx = h; sum += h; c++; }
    if (q) q[0] = c ? sp / c : 0;
    return c ? Math.min(1, (0.68 * sum / c + 0.32 * mx) * 1.16) : 0;
  }
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
    // where each unit's frames are: the source (by index) and its unit in that source
    const si = new Uint8Array(L), sfu = new Int32Array(L);
    let u = 0;
    d.pieces.forEach((p, i) => {
      const S = SRC[p.src], n = plen(p);
      for (let k = 0; k < n; k++, u++) {
        const sf = p.s + k;
        if (S.kind === 'sil') { sil[u] = 1; } else { cl[u] = S.cl[sf % S.n]; nz[u] = S.nz[sf % S.n]; si[u] = SRC_IDX[p.src]; sfu[u] = sf % S.n; }
        key[u] = (SRC_IDX[p.src] || 0) * 100000 + sf; pi[u] = i;
        let gg = p.g === undefined ? 1 : p.g;
        if (p.fi && k < p.fi) gg *= fadeCurve((k + 0.5) / p.fi);
        if (p.fo && n - k <= p.fo) gg *= fadeCurve((n - k - 0.5) / p.fo);
        g[u] = gg;
      }
    });
    const va = new Float32Array(L);
    for (let i = 0; i < L; i++) { let m = 0; for (let j = Math.max(0, i - 3); j <= Math.min(L - 1, i + 6); j++) if (cl[j] > 0.2) { m = 1; break; } va[i] = m; }
    for (let i = 1; i < L; i++) va[i] = Math.max(va[i], va[i - 1] * 0.82);
    let peak = 0; for (let i = 0; i < L; i++) if (cl[i] + nz[i] * 0.3 > peak) peak = cl[i] + nz[i] * 0.3;
    f = { L, cl, nz, g, key, pi, sil, va, si, sf: sfu, peak, seams: seamsOf(d.pieces) };
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
  /**
   * v12.1: the tallest column this document draws when a column spans about `fpc` frames (the same measure as the
   * waveform: the mean of the frames lifted toward their peak). Per power-of-two width, cached with the document, so the
   * sound's top (and its ruler) depends on the zoom only, never on where the view is scrolled.
   */
  function colPeak(d, fpc) {
    const f = flat(d), LF = f.L * FPU;
    if (!f.cp) f.cp = [];
    const lv = k => {
      if (f.cp[k] !== undefined) return f.cp[k];
      const w = 1 << k, step = Math.max(1, w >> 6); let best = 0;
      for (let a = 0; a < LF; a += w) {
        let mx = 0, sum = 0, c = 0;
        for (let fr = a, e = Math.min(LF, a + w); fr < e; fr += step) {
          const i = Math.floor(fr / FPU); c++; if (f.sil[i]) continue;
          const S = SRCL[f.si[i]], k2 = f.sf[i] * FPU + fr % FPU, h = disp((S.fc[k2] + (S.fz ? S.fz[k2] : 0)) * f.g[i]);
          if (h > mx) mx = h; sum += h;
        }
        const m = c ? Math.min(1, (0.68 * sum / c + 0.32 * mx) * 1.16) : 0; if (m > best) best = m;
      }
      return (f.cp[k] = best);
    };
    const x = Math.log2(Math.max(1, fpc)), k0 = Math.min(13, Math.floor(x)), t = Math.min(1, x - k0);
    return k0 >= 13 ? lv(13) : lv(k0) * (1 - t) + lv(k0 + 1) * t;
  }
  /** The middle of every pause of 0.4 s or more (where a sentence starts or ends), cached with the document. */
  function pauseMids(d) { const f = flat(d); if (!f.pm) f.pm = pausesOf(d, 4).map(([a, b]) => (a + b) / 2); return f.pm; }
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
  const DN_EN = ['Lightest', 'Light', 'Medium', 'Strong', 'Max'];
  const DN_RES = [0.62, 0.46, 0.3, 0.16, 0.06];
  const LD = ['语音', '音乐', '广播'];
  const LD_EN = ['Speech', 'Music', 'Broadcast'];
  const CH = ['原样', '单声道', '左右交换'];
  const CH_EN = ['As is', 'Mono', 'Swap'];
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const VOICES = ['升调', '降调', '卡通', '巨人', '机器人', '电话', '收音机', '对讲机', '大厅', '山谷'];
  const SEP = ['留人声', '留伴奏', '两轨'];
  const FX = ['均衡', '压缩', '限制', '混响', '回声', '滤波', '合唱', '镶边', '失真'];
  const RP = ['嗡声', '低频', '破音', '咔哒', '齿音', '直流', '静音间隙'];
  const LAYER = {
    dn: { zh: '降噪', en: 'Denoise', ic: 'GraphicEq', c: 'lane0', val: v => DN[v] },
    ld: { zh: '统一音量', en: 'Even out', ic: 'Equalizer', c: 'lane3', val: v => LD[v] },
    vol: { zh: '音量', en: 'Volume', ic: 'VolumeUp', c: 'lane2', val: v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + NB + 'dB', chip: true },
    rp: { zh: '修复', en: 'Repair', ic: 'Healing', c: 'lane5', val: v => [...v].map(i => RP[i]).join('、') || '无' },
    fx: { zh: '效果', en: 'Effects', ic: 'AutoAwesome', c: 'lane1', val: v => [...v].map(i => FX[i]).join('、') || '无' },
    vc: { zh: '变声', en: 'Voice', ic: 'RecordVoiceOver', c: 'lane6', val: v => VOICES[v], chip: true },
    sp: { zh: '变速', en: 'Speed', ic: 'Speed', c: 'lane4', val: v => v + '×', chip: true },
    ch: { zh: '声道', en: 'Channels', ic: 'SurroundSound', c: 'lane7', val: v => CH[v] },
    sep: { zh: '人声分离', en: 'Separate', ic: 'CallSplit', c: 'lane1', val: v => SEP[v], chip: true },
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
    dn: ['降噪', 'Denoise', 'GraphicEq'], ld: ['统一音量', 'Even out', 'Equalizer'], rp: ['修复', 'Repair', 'Healing'], fx: ['效果', 'Effects', 'AutoAwesome'],
    vc: ['变声', 'Voice', 'RecordVoiceOver'], sp: ['变速', 'Speed', 'Speed'], ch: ['声道', 'Channels', 'SurroundSound'], sep: ['人声分离', 'Separate', 'CallSplit'],
    rev: ['倒放', 'Reverse', 'FastRewind'], env: ['音量曲线', 'Curve', 'ShowChart'],
    rec: ['录音', 'Record', 'Mic'], music: ['音乐', 'Music', 'LibraryMusic'], audio: ['音频', 'Audio', 'AudioFile'], file: ['文件', 'File', 'Folder'],
    video: ['视频', 'Video', 'VideoFile'], tts: ['朗读', 'Speak', 'RecordVoiceOver'], sub: ['字幕', 'Dubbing', 'ClosedCaption'], sil: ['空白', 'Silence', 'SpaceBar'],
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
    // first five (visible without scrolling at 360): split at the playhead (also while it plays), the two sound fixes,
    // music under the voice, a recording at the playhead; the tail scrolls
    rest: ['split', 'dn', 'ld', 'music', 'rec', 'pauses', 'marker', 'fade', 'vol', 'all', 'tts', 'fx'],
    range: ['del', 'keep', 'move', 'fade', 'vol', 'copy', 'split', 'dup', 'dn', 'exact', 'beats', 'xpart'],
    piece: ['del', 'move', 'vol', 'fade', 'copy', 'keep', 'seams', 'dup', 'dn', 'exact', 'xpart'],
    track: ['tvol', 'duck', 'tfade', 'tstart', 'swap', 'mute', 'solo', 'tdel'],
    marker: ['mrename', 'msplit', 'mdel'],
  };
  // v12: 常用 follows what the audio is. Speech (a recording, an interview): the voice fixes, music under it, a recording
  // at the playhead, the pauses. A song: the chorus first (a ringtone stays three steps), then fades, volume, vocals.
  const CTX_REST = {
    speech: ['split', 'dn', 'ld', 'music', 'rec', 'pauses', 'marker', 'fade', 'vol', 'all', 'tts', 'fx'],
    music: ['chorus', 'split', 'fade', 'vol', 'sep', 'sp', 'beats', 'loopto', 'marker', 'all', 'rec', 'fx'],
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
  const LIBAUDIO = [{ name: '补录：结尾一段', src: 'clipA' }, { name: '片头口播', src: 'clipB' }, { name: '电话录音', src: 'clipC' }].map(x => Object.assign(x, { meta: clk(SRC[x.src].n) }));
  const ONLINE = [{ name: '晨光', meta: 'CC BY 4.0 · 可商用', src: 'music1' }, { name: '咖啡馆', meta: 'CC BY-NC 4.0 · 不可商用', src: 'music2' }, { name: '向前走', meta: 'CC0 · 可商用', src: 'music3' }];
  // the subtitle file: the interview's own lines at their times (the dubbing track re-voices them)
  const SUBS = (SP.subs || []).map(([t, x]) => [clk(t * SR), x]);
  const SELCTX = new Set(['range', 'piece']);
  // RESERVE: the room an ordinary setting may take above the tools without moving play (two compact rows).
  const AUDIO_MIN = 150, RESERVE = 110, RESERVE_FS = 140, MAX_TOOLS = 12;
  // the reading-and-deciding controls (and the lists you choose from) may borrow height from the audio
  // Sentences for this audio, shown at rest just above the tray (the room an open setting would take). Each is parser
  // grammar and opens its plan in one tap; English ones stand for the Chinese sentence the prototype can read.
  const SUGG = {
    rest: [['人声清理', 'Clean up the voice'], ['删掉超过1秒的停顿', 'Remove long pauses'], ['剪掉开头5秒', 'Cut the first 5 s'], ['结尾淡出3秒', 'Fade out the end'], ['做成铃声', 'Make a ringtone']],
    range: [['这段调小一点', 'Make this quieter'], ['这段调大一点', 'Make this louder'], ['降噪', 'Denoise']],
    edit: [['剪掉开头5秒', 'Cut the first 5 s'], ['删掉超过1秒的停顿', 'Remove long pauses'], ['把1:20到1:35移到开头', 'Move 1:20–1:35 to the start']],
    sound: [['人声清理', 'Clean up the voice'], ['声音太小了', 'Too quiet'], ['结尾淡出3秒', 'Fade out the end']],
    more: [['导出MP3', 'Export MP3'], ['做成铃声', 'Make a ringtone'], ['剪掉开头5秒，结尾淡出3秒，导出MP3', 'Trim, fade, export MP3']],
  };
  const LIVE_LEVELS = new Set(['p', 'fade', 'rvol', 'tvol', 'duck', 'tfade', 'tstart', 'sil', 'seams', 'loopto', 'divide', 'env']);
  // v10: where each open view lives. SLOT: a live setting, shown in the instrument slot (the dock keeps its height and
  // shape; tools and categories stay). TASK: something that ends in a worded decision; it takes the dock over (tools and
  // categories leave) and ends only by deciding (system Back = the cancelling decision). Sheets are not on the stack.
  const SLOT_VIEWS = new Set(['p', 'fade', 'rvol', 'tvol', 'duck', 'tfade', 'tstart', 'sil', 'seams', 'loopto', 'divide', 'env', 'speed', 'goto', 'exact', 'beats', 'pieces', 'stt', 'err', 'proc']);
  const TASK_VIEWS = new Set(['export', 'tts', 'sub', 'clone', 'rec', 'hand', 'pauses', 'chorus', 'history', 'plan', 'say', 'mname']);
  // The waterline: play (a 56 dp buoy) floats 10 dp above the dock's lit edge; the main line and its handles keep 8 dp
  // above the buoy. While the keyboard is up the waterline is empty (the transport makes way for typing).
  const BUOY = 56, BUOY_GAP = 10, WATER_R = BUOY + BUOY_GAP + 8;
  // v12.2: a swipe past an end (or at the fitted zoom) gives at most RUB dp; a fling slows with a time constant of
  // FLING_T seconds and stops below 20 dp/s
  const RUB = 40, FLING_T = 0.33;
  // track kinds: each a different water hue (the main line stays the deepest blue); the label carries the same hue
  const KIND = { music: { c: 'k-music', ic: 'MusicNote', zh: '音乐', en: 'Music' }, dub: { c: 'k-dub', ic: 'RecordVoiceOver', zh: '配音', en: 'Voice-over' }, voice: { c: 'k-voice', ic: 'Mic', zh: '录音', en: 'Recording' }, acc: { c: 'k-acc', ic: 'QueueMusic', zh: '音效', en: 'Effect' } };

  // ------------------------------------------------------------------ the workbench
  class Bench {
    constructor(scr, o) {
      this.scr = scr; this.o = o; this.live = !!o.live; this.lang = o.lang || 'zh';
      scr.lang = this.lang === 'en' ? 'en' : 'zh-CN';
      if (o.fs) scr.classList.add('fs13');
      // the visual studies of round nine: 1 (chosen, "clear water"), 2 (spotlight) and 3 (ink silhouette)
      this.study = +o.study || 1; if (this.study > 1) scr.classList.add('st' + this.study);
      if (o.showEdges) scr.classList.add('show-edges');
      scr.innerHTML = `
        <div class="sb"><span>9:41</span><span class="sig"><i></i><span class="bat"></span></span></div>
        <div class="hdr">
          <button class="rb" data-a="leave" aria-label="${this.t('回到音频库', 'Back to library')}">${ic('ArrowBack', 22)}</button>
          <button class="ttl" data-a="title"><span class="name"></span></button>
          <button class="xbtn" data-a="export">${ic('FileDownload', 18)}<span>${this.t('导出', 'Export')}</span></button>
        </div>
        <div class="stage">
          <div class="tl"><canvas></canvas><div class="lchips"></div><div class="tlabels"></div><div class="ovl"></div></div>
          <button class="tm mono" data-a="time"></button>
          <div class="kbd" aria-hidden="true"><div class="kbd-s">${this.t('系统 · 键盘', 'System · Keyboard')}</div>${'<i></i>'.repeat(30)}</div>
          <div class="water">
            <span class="listen"><button class="play buoy" data-a="play" aria-label="${this.t('播放', 'Play')}"></button><i class="loopmark" aria-hidden="true">${ic('Repeat', 12)}</i><button class="orig" data-hold="1" aria-label="${this.t('按住听原声', 'Hold for the original')}">${ic('Hold', 16)}<span>${this.t('原声', 'Original')}</span></button></span>
            <span class="wsp"></span>
            <span class="ur"><button class="ub" data-a="undo" aria-label="${this.t('撤销', 'Undo')}">${ic('Undo', 22)}</button><button class="ub" data-a="redo" aria-label="${this.t('重做', 'Redo')}">${ic('Redo', 22)}</button></span>
          </div>
          <div class="bot">
            <div class="toast"></div>
            <div class="slot" data-tier="instrument"></div>
            <div class="tools" data-tier="tools"></div>
            <div class="cats" data-tier="categories"></div>
            <div class="panel"></div>
          </div>
        </div>
        <div class="nb"><i></i></div>
        <div class="mhost"></div>`;
      const q = s => scr.querySelector(s);
      this.cv = q('canvas'); this.ctx = this.cv.getContext('2d'); this.tlEl = q('.tl'); this.chipsEl = q('.lchips'); this.labelsEl = q('.tlabels'); this.ovl = q('.ovl');
      this.addEl = null; this.stageEl = q('.stage'); this.waterEl = q('.water'); this.slotEl = q('.slot'); this.panelEl = q('.panel'); this.origEl = q('.orig');
      this.botEl = q('.bot'); this.areaEl = this.botEl; this.toolsEl = q('.tools'); this.catsEl = q('.cats'); this.tmEl = q('.tm'); this.leadEl = this.tmEl; this.playEl = q('.play'); this.cat = 'ctx'; this.markTool = null; this.toastEl = q('.toast'); this.mhost = q('.mhost');
      // the canvas never changes size when the dock does; it is redrawn so the main line and its handles keep above the
      // waterline, and the waterline rides on the dock's edge
      if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (this.measure()) this.kick(); }); ro.observe(this.tlEl); ro.observe(this.botEl); }
      this.toolsEl.addEventListener('scroll', () => this.placeNub(), { passive: true });
      this.nameEl = q('.ttl .name'); this.undoEl = q('[data-a=undo]'); this.redoEl = q('[data-a=redo]'); this.exEl = null;

      this.doc = o.doc; this.hist = [{ label: o.origin || '打开', doc: this.doc }]; this.hi = 0; this.group = null;
      this.sel = null; this.ph = 0; this.track = null; this.marker = null;
      const L = docLen(this.doc);
      this.view = { a: new Spring(0, P.view, 0.02), b: new Spring(L, P.view, 0.02) };
      this.selDraw = new FlowSpan();
      this.rub = new Spring(0, P.view, 0.3); this.fling = null; this.anchor = null; this._follow = true;
      this.stack = [{ t: 'strip', ctx: 'rest' }];
      this.playing = false; this.speed = 1; this.loop = false; this.spec = false; this.beats = false; this.snapBeats = true;
      this.gap = null; this.plan = null; this.hand = null; this.rec = null; this.marks = null; this.compareHold = false; this.proc = null;
      this.coach = null; this.seen = {}; this.clipboard = null; this.exp = null;
      this.firstRun = this.live || !!o.firstRun;
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
    // While a task waits for its decision, history is out of reach (its buttons leave the waterline): the decision ends it.
    undo() { if (this.task) { this.nudgeDecision(); return; } if (this.hi > 0) this.jump(this.hi - 1); }
    redo() { if (this.task) { this.nudgeDecision(); return; } if (this.hi < this.hist.length - 1) this.jump(this.hi + 1); }
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
      this.plan = null; this.planMarks = null; this.marks = null; this.chorus = null; this.compareHold = false; this.group = null; this.histPrev = null;
      this.hideCoach();
    }
    reset(doc) {
      this.stopPlay(); this.leaveView(); this.closeModal();
      this.doc = doc; this.hist = [{ label: '打开', doc }]; this.hi = 0; this.sel = null; this.ph = 0; this.track = null; this.marker = null;
      this.exp = null; this.speed = 1; this.loop = false; this.spec = false; this.beats = false; this.snapBeats = true; this.seen = {}; this.clipboard = null; this.where = null; this.rwhere = null;
      this.firstRun = this.live; this.lastPurpose = null; this.lastUsed = null;
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
    resetStack() { this.dropOffLayers(); this.group = null; this.stack = [this.rootView()]; this.renderArea(); }
    push(v) { this.group = null; this.stack.push(v); this.renderArea(); }
    /** A task is open: it has the dock until its decision. */
    get task() { return TASK_VIEWS.has(this.top.t); }
    /** Views that keep drags on the timeline for themselves (a task, the curve, a setting on the selection). */
    get holding() { const t = this.top.t; return TASK_VIEWS.has(t) || t === 'env' || t === 'exact' || t === 'rvol' || (t === 'fade' && !!this.sel) || (t === 'p' && !!this.sel); }
    /** A setting moved to its off stop is taken off the audio when its control closes (in the same history step). */
    dropOffLayers() {
      const v = this.top; if (!v || v.t !== 'p') return;
      const l = this.doc.layers.find(x => x.id === v.id); if (!l || l.on !== false) return;
      const doc = Object.assign({}, this.doc, { layers: this.doc.layers.filter(x => x.id !== v.id) });
      if (this.group && this.group.key === v && this.group.idx === this.hi) { this.hist[this.hi] = { label: '去掉' + LAYER[l.k].zh, doc }; this.doc = doc; }
      else this.commit(doc, '去掉' + LAYER[l.k].zh, true);
      this.renderChips();
    }
    /**
     * System Back (an edge swipe, Esc): a sheet closes; a task takes its cancelling decision; an open setting closes
     * (its value stays); then what is selected is let go.
     */
    back(quiet) {
      this.hideCoach();
      if (this.mhost.innerHTML) { this.closeModal(); this.pendingFile = null; return; }
      const v = this.top;
      this.compareHold = false;
      if (v.t === 'plan') { this.plan = null; this.planMarks = null; }
      if (v.t === 'hand') { this.handCancel(); return; }
      if (v.t === 'rec') { this.recCancel(quiet); return; }
      if (v.t === 'export') { this.anim = null; this.exp = null; }
      if (v.t === 'history') { this.histPrev = null; this.kick(); }
      if (v.t === 'say' || v.t === 'mname') { const t = this.botEl.querySelector('textarea, input'); if (t) t.blur(); }
      if (v.t === 'chorus' || v.t === 'pauses') { this.marks = null; if (v.t === 'chorus') { this.chorus = null; this.sel = null; } }
      if (this.stack.length > 2 && TASK_VIEWS.has(this.stack[this.stack.length - 2].t)) { this.stack.pop(); this.renderArea(); this.kick(); return; }
      if (this.stack.length > 1) { this.dropOffLayers(); this.group = null; this.stack = [this.rootView()]; this.renderArea(); this.kick(); return; }
      this.group = null;
      if (v.ctx !== 'rest') { this.sel = null; this.track = null; this.marker = null; this.stack = [this.rootView()]; this.renderArea(); this.kick(); return; }
      if (!quiet) this.toast(this.t('回到音频库', 'To the library'));
    }
    /** Another tool or a category was tapped: the open setting steps aside. Settings it changed stay. */
    closeCtrl() { if (this.stack.length > 1 && !this.task) this.back(true); }
    /** Something outside a task was tapped while it waits: the task's decision row says where it ends. */
    nudgeDecision() {
      const d = this.panelEl.querySelector('.dec'); if (!d) return;
      d.classList.remove('nudge'); void d.offsetWidth; d.classList.add('nudge');
    }

    /**
     * One anatomy, three tiers of descending weight, and no state adds a tier:
     *  - the instrument: one full-width slot holding the one thing the hand is on (the sentence at rest, else the open
     *    setting's control); it never holds two things;
     *  - the tools: one row that scrolls sideways; the open tool is lit and tied to the slot (it is the tab, the slot its page);
     *  - the categories: the lightest row.
     * A task (it ends in a worded decision) takes the whole dock over: tools and categories leave and its panel's last
     * row holds the decision. The keyboard is a task too: the sentence rides on it.
     */
    renderArea(first) {
      if (this.stack.length === 1) this.markTool = null;
      const ctx = this.stack[0].ctx;
      if (ctx !== this._ctx) { if (ctx !== 'rest' && !(this.cat === 'sound' && SELCTX.has(ctx))) this.cat = 'ctx'; this._ctx = ctx; }
      const v = this.top, kind = SLOT_VIEWS.has(v.t) ? 'live' : TASK_VIEWS.has(v.t) ? 'task' : 'rest';
      if (first) this.botEl.getAnimations().forEach(a => a.cancel());
      const h0 = first ? 0 : this.botEl.offsetHeight, kind0 = this._kind;
      // the row and the slot carry the mark of what they act on: the selection's orange, the track's own hue
      const trk = this.trk(), tgt = SELCTX.has(ctx) ? 'var(--sel-edge)' : ctx === 'track' && trk ? `var(--${(KIND[trk.k] || KIND.music).c})` : ctx === 'marker' ? 'var(--on)' : '';
      this.botEl.style.setProperty('--tgt', tgt || 'transparent'); this.botEl.classList.toggle('tgt', !!tgt);
      const same = v === this._lastTop; this._lastTop = v; this._kind = kind;
      // the toolbar at rest (the sentence in its slot, the tools, the categories); an open setting or a task covers it
      const slot = kind === 'rest' ? this.sayHtml() : '';
      if (slot !== this._slotHtml) { this._slotHtml = slot; this.slotEl.innerHTML = slot; }
      this.panelEl.innerHTML = kind !== 'rest' ? this.viewHtml(v) : '';
      if (!same && !first && this.live && !reduced() && kind !== 'rest' && kind0 === 'rest') { this.panelEl.classList.remove('enter'); void this.panelEl.offsetWidth; this.panelEl.classList.add('enter'); }
      this.botEl.classList.toggle('covered', kind !== 'rest');
      this.botEl.classList.toggle('tasking', kind === 'task');
      this.botEl.classList.toggle('live', kind === 'live');
      // a live setting covers the dock at exactly the toolbar's height, so the canvas and play never move for it
      this.botEl.style.height = kind === 'live' && this._restDockH ? this._restDockH + 'px' : '';
      if (this.typing && v.t !== 'say' && v.t !== 'mname' && !(v.t === 'tts' && this._ttsFocus)) this.setTyping(false);
      this.botEl.querySelectorAll('textarea.tbox').forEach(t => this.growBox(t));
      if (kind !== 'task') { this.renderTools(first); this.renderCats(first); }
      this.bindSliders(); this.sizeRows();
      requestAnimationFrame(() => { const vb = this.panelEl.querySelector('.pbody'); if (vb) { const u = () => vb.classList.toggle('more', vb.scrollTop + vb.clientHeight < vb.scrollHeight - 2); vb.onscroll = u; u(); } this.placeNub(); });
      this.scr.dataset.view = v.t + (v.ctx ? ':' + v.ctx : v.k ? ':' + v.k : '');
      this.scr.dataset.cat = this.cat;
      this.scr.dataset.dock = this.typing ? 'typing' : kind;
      this.scr.classList.toggle('ctrl-open', kind !== 'rest');
      this.botEl.classList.toggle('pending', kind === 'task');
      // a task grows the dock (the waterline rides on it); a live setting never changes its height
      if (!first && this.live && !reduced()) {
        const h1 = this.botEl.offsetHeight;
        if (Math.abs(h1 - h0) > 2) this.botEl.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: E_TRAIL.ms, easing: E_TRAIL.ease });
      }
      if (this.playing && this.loopT && !this.target()) { this.loopT = false; this.range = [0, this.shownLen()]; }
      this.measure();
      this.renderTop(); this.renderChips(); this.kick();
    }
    /** The sentence, at rest: this audio (or the selection) is what you talk to. Its mic is the screen's one filled orange. */
    sayHtml() {
      const sel = this.sel && !this.track ? `<span class="scope">${this.t('选中的', 'Selection')}</span>` : '';
      // v12: until the sentence is first used, the bar shows one sentence this audio could take (then plainly 说一句)
      const ex = this.firstRun && !sel ? this.example() : null;
      const lab = ex ? `<span class="sft first">${this.t('试试', 'Try')} <b>${this.t('「' + ex[0] + '」', '"' + ex[1] + '"')}</b></span>` : `<span class="sft">${this.t('说一句', 'Say it')}</span>`;
      return `<button class="sayf si" data-a="tool" data-k="say"><span class="sfi">${ic('Say', 20)}</span>${lab}${sel}<span class="sfg"></span><span class="sfm">${ic('Mic', 20)}</span></button>`;
    }
    /** What this audio is: from how it came in when that decides it (a recording, a library song), else from the sound. */
    kind() { if (this.doc.kind) return this.doc.kind; const S = SRC[this.doc.pieces[0] && this.doc.pieces[0].src]; return S && S.kind === 'music' ? 'music' : 'speech'; }
    example() { return this.kind() === 'music' ? ['把副歌做成铃声', 'Make the chorus a ringtone'] : ['删掉超过1秒的停顿', 'Remove pauses over 1 s']; }
    /** The slot's pointer: a small tail under the slot, over the lit tool (the tool is the tab, the slot its page). */
    placeNub() {
      const nub = this.slotEl.querySelector('.nub'); if (!nub) return;
      const m = this.toolsEl.querySelector('.act.mark'), sr = this.slotEl.getBoundingClientRect();
      if (!m || !sr.width) { nub.style.opacity = '0'; return; }
      const r = m.getBoundingClientRect(), row = this.toolsEl.getBoundingClientRect();
      const cx = r.left + r.width / 2, inView = cx > row.left + 10 && cx < row.right - 10;
      nub.style.opacity = inView ? '1' : '0';
      nub.style.left = Math.round(clamp(cx - sr.left, 28, sr.width - 28) - 7) + 'px';
    }
    toolList() {
      const ctx = this.stack[0].ctx;
      if (this.cat === 'ctx') return (ctx === 'rest' ? CTX_REST[this.kind()] : CTX_TOOLS[ctx]).slice();
      const l = CAT_TOOLS[this.cat].slice();
      if (this.cat === 'add') l.push('paste');
      return l;
    }
    renderTools(first) {
      const tr = this.trk(), items = this.toolList(), sel = SELCTX.has(this.stack[0].ctx);
      const state = k => ({ mark: k === this.markTool, on: (k === 'loop' && this.loop) || (k === 'spec' && this.spec) || (k === 'beats' && this.beats && !sel) || (k === 'rev' && this.doc.layers.some(l => l.k === 'rev')) || (tr && ((k === 'mute' && tr.mute) || (k === 'solo' && tr.solo) || (k === 'duck' && tr.duck))), nc: k === 'stt' });
      const keys = this.cat + ':' + items.join(), row = this.toolsEl.querySelector('.strip-s');
      if (row && keys === this._toolKeys) {
        // the same tools: only their marks change; nothing is rebuilt, moved or scrolled
        row.querySelectorAll('.act').forEach(b => { const st = state(b.dataset.k); b.classList.toggle('mark', !!st.mark); b.classList.toggle('on', !!st.on); });
        this.revealMarked(row);
        return;
      }
      const mem = this._scrollMem || (this._scrollMem = {});
      if (row && this._toolKeys) mem[this._toolKeys] = row.scrollLeft;
      this.toolsEl.innerHTML = `<div class="strip-s row">${items.map(k => this.act(k, state(k))).join('')}</div>`;
      const nr = this.toolsEl.querySelector('.strip-s');
      if (keys !== this._toolKeys && (!first || this.live)) nr.querySelectorAll('.act').forEach((b, i) => { b.classList.add('in'); b.style.animationDelay = Math.min(i, 8) * 14 + 'ms'; });
      this._toolKeys = keys;
      this.sizeRows();
      nr.scrollLeft = mem[keys] || 0;
      this.revealMarked(nr);
      nr.addEventListener('scroll', () => this.placeNub(), { passive: true });
    }
    /** A control opened from elsewhere (a tag on the audio, a sentence) shows its tool, if it is out of view. */
    revealMarked(row) {
      const m = row.querySelector('.act.mark'); if (!m) return;
      const l = m.offsetLeft - row.offsetLeft, r = l + m.offsetWidth;
      if (l < row.scrollLeft || r > row.scrollLeft + row.clientWidth) row.scrollLeft = Math.max(0, l - 12);
    }
    /** The categories: plain text, the current one heavier with a short line under it. */
    renderCats(first) {
      const ctx = this.stack[0].ctx, en = this.lang === 'en';
      const name = k => k === 'ctx' ? CTX_NAME[ctx][en ? 1 : 0] : CAT_NAME[k][en ? 1 : 0];
      if (!this.catsEl.firstChild) this.catsEl.innerHTML = `<div class="tabs" role="tablist"><div class="tabs-in"><i class="ind"></i>${CATS.map(k => `<button class="tab" role="tab" data-a="cat" data-k="${k}"></button>`).join('')}</div></div>`;
      this.catsEl.querySelectorAll('.tab').forEach(b => { const k = b.dataset.k; const t = name(k); if (b.textContent !== t) b.textContent = t; b.classList.toggle('cur', k === this.cat); b.setAttribute('aria-selected', k === this.cat); });
      this.placeInd(first || !this.live);
    }
    /** The keyboard came up (or went): the dock rides on it with only what is being typed; the waterline empties. */
    setTyping(on) {
      if (!!on === !!this.typing) return;
      this.typing = !!on; this.scr.classList.toggle('typing', this.typing);
      this.scr.dataset.dock = this.typing ? 'typing' : (this._kind || 'rest');
      const t0 = performance.now(), step = () => { if (this.measure()) this.draw(); if (performance.now() - t0 < 380) requestAnimationFrame(step); };
      requestAnimationFrame(step); this.kick();
    }
    /** A text box shows two lines and grows with its text, up to five. */
    growBox(t) {
      const cs = getComputedStyle(t), lh = parseFloat(cs.lineHeight) || 22, pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      t.style.height = '0px';
      t.style.height = Math.round(clamp(t.scrollHeight, lh * 2 + pad, lh * (this.typing ? 4 : 3) + pad)) + 'px';
    }
    placeInd(snap) {
      const tabs = this.catsEl.querySelector('.tabs-in'), cur = tabs && tabs.querySelector('.tab.cur'), ind = tabs && tabs.querySelector('.ind');
      if (!cur || !tabs.clientWidth) return;
      const l = cur.offsetLeft, r = tabs.clientWidth - (cur.offsetLeft + cur.offsetWidth);
      const sc = tabs.parentElement; if (sc.scrollWidth > sc.clientWidth + 1) { const want = cur.offsetLeft - (sc.clientWidth - cur.offsetWidth) / 2; if (cur.offsetLeft < sc.scrollLeft || cur.offsetLeft + cur.offsetWidth > sc.scrollLeft + sc.clientWidth) sc.scrollLeft = Math.max(0, want); }
      if (snap || this._indL === undefined || reduced()) ind.style.transition = 'none';
      else if (l !== this._indL) { const right = l > this._indL; ind.style.transition = right ? `right ${E_LEAD.ms}ms ${E_LEAD.ease}, left ${E_TRAIL.ms}ms ${E_TRAIL.ease} 40ms` : `left ${E_LEAD.ms}ms ${E_LEAD.ease}, right ${E_TRAIL.ms}ms ${E_TRAIL.ease} 40ms`; }
      // a short line centred under the current name
      const w = Math.min(20, cur.offsetWidth * 0.4), cx = cur.offsetLeft + cur.offsetWidth / 2;
      ind.style.left = (cx - w / 2) + 'px'; ind.style.right = (tabs.clientWidth - cx - w / 2) + 'px'; this._indL = l;
    }

    // ---------------------------------------------------------------- the transport band under the audio
    renderTop() {
      this.nameEl.innerHTML = '<span class="nm">' + esc(this.lang === 'en' ? (this.o.nameEn || EN.name) : this.doc.name) + '</span>' + ic('ExpandMore', 18);
      this.undoEl.classList.toggle('dis', this.hi === 0); this.redoEl.classList.toggle('dis', this.hi >= this.hist.length - 1);
      this.undoEl.parentElement.classList.toggle('idle', this.hi === 0 && this.hi >= this.hist.length - 1);
      const pi = this.playing ? 'Pause' : 'PlayArrow'; if (this._pi !== pi) { this._pi = pi; this.playEl.innerHTML = ic(pi, 30); }
      this.playEl.classList.toggle('on', this.playing);
      this.playEl.classList.toggle('scoped', !!this.target());
      this.playEl.setAttribute('aria-label', this.playing ? this.t('暂停', 'Pause') : this.t('播放', 'Play'));
      // the waterline: play always; "hold for the original" whenever a sound setting is on the audio; undo and redo apart
      // from play, at the other end. A task keeps play only (its decision ends it, not history).
      const task = this.task;
      this.waterEl.classList.toggle('tasking', task);
      // v12: while recording, play gives way (the record button is the one round main button)
      this.waterEl.classList.toggle('recording', !!this.rec && this.top.t === 'rec');
      this.origEl.classList.toggle('off', task || !this.doc.layers.some(l => l.on !== false));
      this.origEl.classList.toggle('on', !!this.compareHold);
      const xb = this.scr.querySelector('.xbtn'); if (xb) xb.classList.toggle('mark', this.markTool === 'export');
      this.renderTime();
    }
    levelName(v) { return v.t; }
    /** The time rides on the ruler as a flag: at the playhead, over the selection, or where the stretch in hand goes. */
    renderTime() {
      const L = this.shownLen(), durL = u => this.lang === 'en' ? durEn(u) : dur(u);
      const ex = (this.speed !== 1 ? `<i class="fx">${this.speed}×</i>` : '') + (this.loop || (this.playing && this.loopT) ? `<i class="fx">${ic('Repeat', 12)}</i>` : '');
      let h, kind = 'ph';
      if (this.hand && this.hand.mode === 'lift') { h = `<b class="acc">${durL(this.hand.len)}</b>`; kind = 'hand'; }
      else if (this.hand) { h = `<b class="acc">${clkd(this.hand.at)}</b><small>${durL(this.hand.len)}</small>`; kind = 'hand'; }
      else if (this.sel) { h = `<b class="acc">${cmp(this.sel[0])}–${cmp(this.sel[1])}</b><small>${durL(this.sel[1] - this.sel[0])}</small>`; kind = 'sel'; }
      else if (this.rec) { h = `<b class="rc">${clkd(this.rec.at + this.rec.len)}</b><small>${clk(L + this.rec.len)}</small>`; }
      else h = `<b>${clkd(this.ph)}</b><small>${clk(L)}</small>`;
      h += ex;
      if (h !== this._leadHtml) { this._leadHtml = h; this.tmEl.innerHTML = h; }
      this._flagKind = kind;
      this.placeFlag();
    }
    placeFlag() {
      const el = this.tmEl; if (!el || !this.W) return;
      let x;
      if (this._flagKind === 'sel' && this.sel) x = (this.d2x(this.sel[0]) + this.d2x(this.sel[1])) / 2;
      else if (this._flagKind === 'hand' && this.hand) x = this.hand.fx !== undefined && this.hand.mode === 'lift' ? this.hand.fx : this.d2x(this.hand.at || 0);
      else x = this.d2x(clamp(this.ph, 0, this.shownLen()));
      const w = el.offsetWidth || 90, l = clamp(Math.round(x - w / 2), 8, this.W - 8 - w); this._flagW = w;
      if (l !== this._flagL) { this._flagL = l; el.style.transform = `translateX(${l}px)`; }
    }
    fitLead() {}
    shownDoc() {
      if (this.plan && this.plan.after) return this.plan.res.doc;
      if (this.hand) return this.hand.rest;
      if (this.histPrev !== null && this.histPrev !== undefined && this.hist[this.histPrev]) return this.hist[this.histPrev].doc;
      return this.doc;
    }
    shownLen() { const d = this.shownDoc(); let L = docLen(d); const sp = this.layersShown(d).find(l => l.k === 'sp' && l.on !== false); if (sp) L = Math.round(L / sp.v); return L; }
    layersShown(d) {
      let ls = (d || this.doc).layers.filter(l => l.on !== false);
      // holding "original": with a setting open, without that setting; otherwise without any
      if (this.compareHold) ls = this.top.t === 'p' ? ls.filter(l => l.id !== this.top.id) : [];
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

    // ---------------------------------------------------------------- what the slot and a task's panel hold (no headings)
    viewHtml(v) {
      const fn = this['v_' + v.t];
      return fn ? fn.call(this, v) : '';
    }
    act(k, extra) {
      const T = TOOLS[k];
      const nc = extra && extra.nc ? `<span class="nc">${ic('CloudOff', 12)}</span>` : '';
      return `<button class="act ${extra && extra.mark ? 'mark' : ''} ${extra && extra.on ? 'on' : ''}" data-a="tool" data-k="${k}"><span class="ai">${ic(T[2], 20)}${nc}</span><span class="al">${this.lang === 'en' ? T[1] : T[0]}</span></button>`;
    }
    /**
     * One row of tools that scrolls sideways. Every item has the same width, chosen so that the row shows whole items
     * and part of the next one at its right edge (so it plainly goes on); a long English name widens its own item.
     * Text is never shrunk.
     */
    sizeRows() {
      const s = this.toolsEl.querySelector('.strip-s');
      if (s && s.clientWidth) {
        // computed from the row's width alone (never from measured cells, which may be mid-transition): whole cells and
        // two thirds of the next one; a long English name widens its own cell
        const w = s.clientWidth, pad = parseFloat(getComputedStyle(s).paddingLeft) || 0, minW = this.o.fs ? 78 : 60;
        const n = Math.max(2, Math.floor((w - pad) / minW - 0.65));
        s.style.setProperty('--aw', ((w - pad) / (n + 0.65)).toFixed(2) + 'px');
      }
      this.fitSegs();
      this.placeInd(true);
    }
    /** A segment whose options do not fit on one line lays them out in two rows; an option's text never wraps. */
    fitSegs() {
      this.panelEl.querySelectorAll('.seg').forEach(sg => {
        sg.classList.remove('two'); sg.style.removeProperty('--n');
        if (sg.scrollWidth > sg.clientWidth + 1) { sg.classList.add('two'); sg.style.setProperty('--n', Math.ceil(sg.children.length / 2)); }
      });
      // the export's purposes: when a word and its icon do not fit beside each other, the icon goes above the word
      this.panelEl.querySelectorAll('.seg.purpose').forEach(sg => { sg.classList.remove('stack'); if ([...sg.children].some(b => b.scrollWidth > b.clientWidth + 1)) sg.classList.add('stack'); });
      // in the slot a row that does not fit scrolls sideways (the next option cut at the edge); it never takes a second line
      this.panelEl.querySelectorAll('.sseg, .srow, .schips, .csub').forEach(r => r.classList.toggle('over', r.scrollWidth > r.clientWidth + 1));
    }
    secs(x) { return (Math.round(x * 10) / 10).toFixed(1) + NB + this.t('秒', 's'); }
    dbs(x) { return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x) + NB + 'dB'; }
    labelW(labels) { return Math.max(...labels.map(l => [...String(l)].reduce((a, c) => a + (/[一-龥]/.test(c) ? 1 : /[0-9.×]/.test(c) ? 0.6 : 0.56), 0))) + 0.3; }

    // ---- the slot's controls: one row, the pill's height, values in the water's blue
    /** Stops (the first may be off): the value at the leading end, then the track; drag along it or tap a stop. */
    /** The setting's name and its value read as one label at the slot's start (the value in the sound's blue). */
    nameOf(k) { const T = TOOLS[k]; return T ? (this.lang === 'en' ? T[1] : T[0]) : ''; }
    sStops(key, labels, i, o) {
      const n = labels.length, p = j => n === 1 ? 0.5 : j / (n - 1), nm = o && o.name ? `<span class="sn">${esc(o.name)}</span>` : '';
      const dots = labels.map((l, j) => `<span class="sd ${j <= i ? 'on' : ''} ${j === 0 && o && o.off ? 'off' : ''}" style="--p:${p(j)}" aria-hidden="true"></span>`).join('');
      const sv = o && o.noVal ? '' : `<b class="sv" style="min-width:${this.labelW(labels).toFixed(2)}em">${esc(labels[i])}</b>`;
      const e0 = o && o.ends ? `<span class="se">${ic(o.ends[0], 18)}</span>` : '', e1 = o && o.ends ? `<span class="se">${ic(o.ends[1], 18)}</span>` : '';
      const ew = o && o.ewords ? `<span class="ew l">${esc(o.ewords[0])}</span><span class="ew r">${esc(o.ewords[1])}</span>` : '';
      return `<div class="sl ${ew ? 'ew2' : ''}" data-sl="${key}" data-n="${n}" data-i="${i}">${nm}${sv}${e0}` +
        `<div class="st" role="slider" aria-valuetext="${esc(labels[i])}"><i class="sl-line"></i><i class="sl-fill" style="--p:${p(i)}"></i>${dots}<u class="sk" style="--p:${p(i)}"></u>${ew}</div>${e1}</div>`;
    }
    /** A continuous value; zero (or the start) is off and has a detent. */
    sRange(key, val, min, max, fmt, o) {
      const p = (val - min) / (max - min), z = o && o.zero !== undefined ? (o.zero - min) / (max - min) : null;
      const sample = [fmt(min), fmt(max), fmt((min + max) / 2)].concat(o && o.wide ? [o.wide] : []);
      const nm = o && o.name ? `<span class="sn">${esc(o.name)}</span>` : '';
      const sv = o && o.noVal ? '' : `<b class="sv" style="min-width:${this.labelW(sample).toFixed(2)}em">${esc(fmt(val))}</b>`;
      const e0 = o && o.ends ? `<span class="se">${ic(o.ends[0], 18)}</span>` : '', e1 = o && o.ends ? `<span class="se">${ic(o.ends[1], 18)}</span>` : '';
      const ew = o && o.ewords ? `<span class="ew l">${esc(o.ewords[0])}</span><span class="ew r">${esc(o.ewords[1])}</span>` : '';
      return `<div class="sl range ${ew ? 'ew2' : ''}" data-sl="${key}" data-min="${min}" data-max="${max}" ${z !== null ? `data-zero="${o.zero}"` : ''}>${nm}${sv}${e0}` +
        `<div class="st" role="slider"><i class="sl-line"></i>${z !== null && z > 0 ? `<i class="sl-zero" style="--p:${z}"></i>` : ''}<i class="sl-fill" style="--a:${z !== null ? Math.min(z, p) : 0};--p:${z !== null ? Math.max(z, p) : p}"></i><u class="sk" style="--p:${p}"></u>${ew}</div>${e1}</div>`;
    }
    /** Fade in and fade out as one control: the track stands for the audio, the left knob sets the fade in, the right one the fade out. */
    sFade(kind, fi, fo) {
      const a = clamp(fi / 10, 0, 1) * 0.5, b = 1 - clamp(fo / 10, 0, 1) * 0.5;
      return `<div class="sl fade2" data-sl="fade2" data-kind="${kind}"><b class="sv l">${ic('Fade', 14, 'flip')}<span>${this.secs(fi)}</span></b>` +
        `<div class="st"><i class="sl-line"></i><i class="fw in" style="--p:${a}"></i><i class="fw out" style="--p:${b}"></i><u class="sk k1" style="--p:${a}"></u><u class="sk k2" style="--p:${b}"></u></div>` +
        `<b class="sv r"><span>${this.secs(fo)}</span>${ic('Fade', 14)}</b></div>`;
    }
    /** The slot as a segmented choice: every option one tap, the current one lifted. */
    sSeg(key, opts, cur) { return `<div class="sseg">${opts.map(([v, l]) => `<button class="${cur !== null && cur !== undefined && String(v) === String(cur) ? 'on' : ''}" data-a="seg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`; }
    /** A smaller segmented group inside a composite row. */
    gSeg(key, opts, cur) { return `<span class="gseg">${opts.map(([v, l]) => `<button class="${cur !== null && cur !== undefined && String(v) === String(cur) ? 'on' : ''}" data-a="seg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</span>`; }
    sRow(inner, cls) { return `<div class="srow ${cls || ''}">${inner}</div>`; }
    sChips(inner) { return `<div class="schips">${inner}</div>`; }
    tog(key, label, on) { return `<button class="chip tog ${on ? 'on' : ''}" data-a="sw" data-k="${key}" aria-pressed="${!!on}">${ic(on ? 'Check' : 'Add', 16)}${label}</button>`; }
    vsep() { return '<i class="vsep" aria-hidden="true"></i>'; }

    // ---- a task's panel: rows of settings, then the decision row (worded pills; the main one the only filled orange)
    seg(key, opts, cur, cls) { return `<div class="seg ${cls || ''}">${opts.map(([v, l]) => `<button class="${cur !== null && cur !== undefined && String(v) === String(cur) ? 'on' : ''}" data-a="seg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`; }
    slider(key, label, val, min, max, fmt) {
      const p = (val - min) / (max - min) * 100;
      return `<div class="sld" data-sl="${key}" data-min="${min}" data-max="${max}"><div class="sh"><span>${label}</span><b>${fmt(val)}</b></div><div class="tr"><i style="width:${p}%"></i><u style="left:${p}%"></u></div></div>`;
    }
    sw(key, label, on) { return this.tog(key, label, on); }
    wbtn(a, label, icon, cls) { return `<button class="dbtn ${cls || 'pri'}" data-a="${a}">${icon ? ic(icon, 18) : ''}<span>${label}</span></button>`; }
    dec(lead, out, main) { return `<div class="prow dec" data-tier="decision"><div class="dlead">${lead || ''}</div><div class="dbts">${out || ''}${main || ''}</div></div>`; }
    prow(inner, cls) { return `<div class="prow ${cls || ''}" data-tier="row">${inner}</div>`; }
    panel(rows, dec) { return (rows.length ? `<div class="pbody">${rows.map(r => r.startsWith('<div class="prow') ? r : this.prow(r)).join('')}</div>` : '') + (dec || ''); }
    cancel(label) { return this.wbtn('back', label || this.t('取消', 'Cancel'), null, 'sec'); }

    // ---------------------------------------------------------------- live settings: the open tool covers the dock
    /**
     * A live setting covers the whole dock at exactly the toolbar's height: its name and value at the leading side
     * (and what it acts on), its control across the full width, a second row for a second value, and one way out at
     * the trailing end of the last row (完成; it only closes, the setting already applies). No title bar, no ✕, no back.
     */
    cover(name, val, main, sub) {
      const tr = this.trk(), kd = tr && (KIND[tr.k] || KIND.music);
      const tg = this.sel && !this.task ? `<span class="ctg sel">${this.t('选中的', 'Selection')}</span>` : tr && this.stack[0].ctx === 'track' ? `<span class="ctg" style="--c:var(--${kd.c})">${ic(kd.ic, 14)}<span>${esc(tr.name)}</span></span>` : '';
      return `<div class="cover"><div class="chead" data-tier="name"><span class="cn">${esc(name)}</span>${val !== '' && val !== undefined ? `<b class="cv">${esc(val)}</b>` : ''}${tg}</div>` +
        `<div class="cmain" data-tier="control">${main}</div>` +
        `<div class="cfoot" data-tier="out"><div class="csub">${sub || ''}</div>${this.wbtn('done', this.t('完成', 'Done'), null, 'sec')}</div></div>`;
    }
    ends(l, r) { return { ends: [l, r] }; }
    v_p(v) {
      const l = this.doc.layers.find(x => x.id === v.id); if (!l) return '';
      const k = l.k, en = this.lang === 'en', off = l.on === false, OFF = this.t('关', 'Off'), name = this.nameOf(k);
      if (k === 'dn') { const labels = [OFF].concat(en ? DN_EN : DN), i = off ? 0 : l.v + 1; return this.cover(name, labels[i], this.sStops('dn', labels, i, { off: true, noVal: true, ticks: true, ewords: [OFF, labels[labels.length - 1]] }), ''); }
      if (k === 'ld') { const opts = [[-1, OFF]].concat((en ? LD_EN : LD).map((x, i) => [i, x])); return this.cover(name, opts.find(o => o[0] === (off ? -1 : l.v))[1], this.sSeg('ld', opts, off ? -1 : l.v), ''); }
      if (k === 'vol') { const val = off ? 0 : l.v, fmt = x => x === 0 ? OFF : this.dbs(x); return this.cover(name, fmt(val), this.sRange('vol', val, -24, 12, fmt, { zero: 0, noVal: true, ends: ['VolumeOff', 'VolumeUp'] }), ''); }
      if (k === 'rp') {
        const n = l.v.size, st = [this.t('轻', 'Light'), this.t('中', 'Med'), this.t('强', 'Strong')][l.s === undefined ? 1 : l.s];
        return this.cover(name, off ? OFF : n + NB + this.t('项', 'on') + ' · ' + st, this.sChips(RP.map((x, i) => `<button class="chip ${l.v.has(i) ? 'on' : ''}" data-a="rpt" data-i="${i}">${l.v.has(i) ? ic('Check', 14) : ''}${x}</button>`).join('')),
          `<span class="clab">${this.t('力度', 'Strength')}</span>` + this.gSeg('rps', [[0, this.t('轻', 'Light')], [1, this.t('中', 'Med')], [2, this.t('强', 'Strong')]], l.s === undefined ? 1 : l.s));
      }
      if (k === 'fx') {
        const lv = l.lv || {}, on = [...l.v].sort((a, b) => a - b);
        return this.cover(name, off ? OFF : on.map(i => FX[i]).join('、'), this.sChips(FX.map((x, i) => { const nn = l.v.has(i) ? (lv[i] || 2) : 0; return `<button class="chip lvl ${nn ? 'on' : ''}" data-a="fxt" data-i="${i}" aria-label="${x}">${x}<span class="lv" aria-hidden="true">${[1, 2, 3].map(j => `<i class="${j <= nn ? 'f' : ''}"></i>`).join('')}</span></button>`; }).join('')), '');
      }
      if (k === 'vc') return this.cover(name, off ? OFF : VOICES[l.v], this.sChips([`<button class="chip ${off ? 'on' : ''}" data-a="vct" data-i="-1">${OFF}</button>`].concat(VOICES.map((x, i) => `<button class="chip ${!off && l.v === i ? 'on' : ''}" data-a="vct" data-i="${i}">${x}</button>`)).join('')), '');
      if (k === 'sp') { const i = SPEEDS.indexOf(off ? 1 : l.v); return this.cover(name, SPEEDS[i] + '×', this.sStops('sp', SPEEDS.map(x => x + '×'), i, { noVal: true, ticks: true, ends: ['SlowMotion', 'Speed'] }), this.tog('keepPitch', this.t('音高不变', 'Keep pitch'), l.keep !== false)); }
      if (k === 'ch') { const opts = (en ? CH_EN : CH).map((x, i) => [i, x]), m = off ? 0 : l.v; return this.cover(name, opts[m][1], this.sSeg('chm', opts, m), this.sRange('chw', l.w || 100, 0, 200, x => Math.round(x) + '%', { name: this.t('宽度', 'Width') })); }
      if (k === 'sep') { const opts = [[-1, OFF]].concat(SEP.map((x, i) => [i, x])); return this.cover(name, opts.find(o => o[0] === (off ? -1 : l.v))[1], this.sSeg('sep', opts, off ? -1 : l.v), off ? '' : this.sRange('sepS', l.s || 60, 0, 100, x => Math.round(x) + '%', { name: this.t('强度', 'Strength') })); }
      return '';
    }
    v_fade(v) {
      const f = v.f, name = this.nameOf('fade');
      if (this.sel) {
        const shapes = [[0, 'M3 19 C9 19 9 5 21 5', this.t('平滑', 'Smooth')], [1, 'M3 19 L21 5', this.t('线性', 'Linear')], [2, 'M3 19 C3 7 9 5 21 5', this.t('快', 'Fast')], [3, 'M3 19 C15 19 21 17 21 5', this.t('慢', 'Slow')]];
        const sh = `<span class="gseg icons ${f.dir ? '' : 'dim'}">${shapes.map(([v2, d, lab]) => `<button class="${f.shape === v2 ? 'on' : ''}" data-a="seg" data-k="fshape" data-v="${v2}" aria-label="${lab}"><svg class="ic" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="${f.dir === 'out' ? d.replace(/(\d+) (\d+)/g, (m, x, y) => (24 - x) + ' ' + y) : d}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>`).join('')}</span>`;
        const dirL = f.dir === 'in' ? this.t('淡入', 'In') : f.dir === 'out' ? this.t('淡出', 'Out') : '';
        return this.cover(name, dirL, this.sSeg('fdir', [['in', this.t('淡入', 'Fade in')], ['out', this.t('淡出', 'Fade out')]], f.dir), f.dir ? `<span class="clab">${this.t('曲线', 'Curve')}</span>` + sh : '');
      }
      return this.cover(name, '', this.sFade('e', f.fi, f.fo), '');
    }
    v_rvol(v) { const fmt = x => x === 0 ? this.t('原样', 'As is') : this.dbs(x); return this.cover(this.nameOf('vol'), fmt(v.db || 0), this.sRange('rvol', v.db || 0, -24, 12, fmt, { zero: 0, noVal: true, ends: ['VolumeOff', 'VolumeUp'] }), ''); }
    v_tvol() { const tr = this.trk(), fmt = x => Math.round(x) + '%'; return this.cover(this.nameOf('tvol'), fmt(tr.gain * 100), this.sRange('tvol', Math.round(tr.gain * 100), 0, 150, fmt, { noVal: true, ends: ['VolumeOff', 'VolumeUp'] }), ''); }
    v_duck() { const tr = this.trk(), d = tr.duck ? Math.round((1 - tr.duckTo) * 100) : 0, fmt = x => x === 0 ? this.t('关', 'Off') : this.t('降到 ', 'to ') + (100 - Math.round(x)) + '%'; return this.cover(this.nameOf('duck'), fmt(d), this.sRange('duck', d, 0, 95, fmt, { noVal: true, ewords: [this.t('关', 'Off'), this.t('最低', 'Lowest')] }), ''); }
    v_tfade() { const tr = this.trk(); return this.cover(this.nameOf('tfade'), '', this.sFade('t', tr.fi / SR, tr.fo / SR), ''); }
    v_tstart() { const tr = this.trk(), fmt = x => this.t('从 ', 'from ') + this.secs(x); return this.cover(this.nameOf('tstart'), fmt((tr.off || 0) / SR), this.sRange('toff', (tr.off || 0) / SR, 0, 60, fmt, { noVal: true, ewords: ['0' + NB + this.t('秒', 's'), '60' + NB + this.t('秒', 's')] }), this.tog('tloop', this.t('循环', 'Loop'), tr.loop !== false)); }
    v_sil(v) { const o = [0.5, 1, 2, 3, 5].map(x => [x, x + NB + this.t('秒', 's')]); return this.cover(this.nameOf('sil'), v.n ? (o.find(x => x[0] === v.n) || [0, ''])[1] : '', this.sSeg('siln', o, v.n), ''); }
    v_seams() { const o = [[0, this.t('直接接', 'None')], [10, '10 ms'], [20, '20 ms'], [50, '50 ms']], c = this.doc.seam || 0; return this.cover(this.nameOf('seams'), o.find(x => x[0] === c)[1], this.sSeg('seam', o, c), ''); }
    v_loopto(v) { const o = [[0, this.t('原长', 'As is')], [30, this.t('30秒', '30 s')], [60, this.t('1分钟', '1 min')], [90, this.t('90秒', '90 s')], [120, this.t('2分钟', '2 min')]], c = v.v || 0; return this.cover(this.nameOf('loopto'), o.find(x => x[0] === c)[1], this.sSeg('lt', o, c), ''); }
    v_divide(v) {
      const m = v.m || 'every', n = v.n || (m === 'every' ? 30 : 4), pc = this.doc.pieces.length;
      return this.cover(this.nameOf('divide'), v.v ? pc + NB + this.t('段', 'pieces') : '', this.sSeg('dm', [['every', this.t('每隔几秒', 'Every')], ['equal', this.t('平均分', 'Equal')], ['marks', this.t('按标记', 'At marks')]], v.v ? m : null),
        m !== 'marks' ? `<span class="stp"><button data-a="divN" data-d="-1" aria-label="少">${ic('Remove', 18)}</button><b>${m === 'every' ? n + NB + this.t('秒', 's') : n + NB + this.t('段', '')}</b><button data-a="divN" data-d="1" aria-label="多">${ic('Add', 18)}</button></span>` : '');
    }
    v_env() { const n = (this.doc.env || []).length; return this.cover(this.nameOf('env'), n ? n + NB + this.t('个点', 'points') : this.t('平直', 'Flat'), `<div class="srow"><span class="sst">${ic('ShowChart', 18)}<span>${this.t('在波形上点一下加点，拖动调整', 'Tap the waveform to add a point')}</span></span></div>`, `<button class="chip" data-a="envClear">${ic('Delete', 16)}${this.t('清空', 'Clear')}</button>`); }
    v_speed() { const i = SPEEDS.indexOf(this.speed); return this.cover(this.t('试听速度', 'Playback speed'), SPEEDS[i] + '×', this.sStops('pspd', SPEEDS.map(x => x + '×'), i, { noVal: true, ticks: true, ends: ['SlowMotion', 'Speed'] }), ''); }
    v_goto() { return this.cover(this.nameOf('goto'), clkd(this.ph), this.sRow(`<button class="chip" data-a="nudge" data-d="-100">−10${this.t('秒', 's')}</button><button class="chip" data-a="nudge" data-d="-10">−1${this.t('秒', 's')}</button><span class="grow"></span><button class="chip" data-a="nudge" data-d="10">+1${this.t('秒', 's')}</button><button class="chip" data-a="nudge" data-d="100">+10${this.t('秒', 's')}</button>`, 'fill'), ''); }
    v_exact() {
      const s = this.sel || [0, 0];
      const f = (k, lab, u) => `<span class="clab">${lab}</span><span class="stp"><button data-a="nudgeSel" data-k="${k}" data-d="-1" aria-label="早一点">${ic('Remove', 18)}</button><b class="mono">${clkd(u)}</b><button data-a="nudgeSel" data-k="${k}" data-d="1" aria-label="晚一点">${ic('Add', 18)}</button></span>`;
      return this.cover(this.nameOf('exact'), this.lang === 'en' ? durEn(s[1] - s[0]) : dur(s[1] - s[0]), this.sRow(f(0, this.t('起点', 'Start'), s[0])), f(1, this.t('终点', 'End'), s[1]));
    }
    v_beats(v) { return this.cover(this.nameOf('beats'), (v.bpm || 120) + ' BPM', this.sRow(`<span class="stp"><button data-a="bpm" data-m="0.5" aria-label="½×">½</button><b class="mono">${v.bpm || 120} BPM</b><button data-a="bpm" data-m="2" aria-label="2×">2×</button></span>`), this.tog('showBeats', this.t('显示节拍', 'Show beats'), this.beats) + this.tog('snap', this.t('选择时吸附', 'Snap'), this.snapBeats !== false)); }
    v_pieces() { const ps = this.doc.pieces; let u = 0; return this.cover(this.nameOf('pieces'), ps.length + NB + this.t('段', 'pieces'), this.sChips(ps.map((p, i) => { const a = u; u += plen(p); return `<button class="chip" data-a="pickPiece" data-i="${i}"><b>${i + 1}</b>&nbsp;${cmp(a)}–${cmp(u)}</button>`; }).join('')), ''); }
    v_stt() { return this.cover(this.t('转文字', 'To text'), this.t('未接通', 'Not connected'), `<div class="srow"><span class="sst">${ic('CloudOff', 18)}<span>${this.t('这个版本没有接通转写服务，不会上传音频', 'No transcription service in this build')}</span></span></div>`, `<button class="chip" data-a="export">${ic('FileDownload', 16)}${this.t('导出音频', 'Export audio')}</button>`); }
    v_err(v) { return this.cover(this.nameOf(v.k), this.t('没能完成', 'Failed'), `<div class="srow"><span class="sst err">${ic('ErrorOutline', 18)}<span>${esc(v.msg)}</span></span></div>`, `<button class="chip" data-a="retry">${ic('Refresh', 16)}${this.t('重试', 'Retry')}</button><button class="chip" data-a="rmlayer">${ic('Delete', 16)}${this.t('去掉', 'Remove')}</button>`); }
    v_proc(v) { return this.cover(this.nameOf(v.k), v.p + '%', `<div class="srow fill"><div class="grow pbar"><i style="width:${v.p}%"></i></div></div>`, `<button class="chip" data-a="rmlayer">${ic('Close', 16)}${this.t('取消', 'Cancel')}</button>`); }

    // ---------------------------------------------------------------- tasks (the panel takes the dock over)
    v_hand() {
      return this.panel([], this.dec(`<button class="chip" data-a="handTo" data-to="0">${this.t('放到开头', 'To start')}</button><button class="chip" data-a="handTo" data-to="end">${this.t('放到结尾', 'To end')}</button>`,
        this.cancel(this.t('放回去', 'Put back')), this.wbtn('handOk', this.t('放这里', 'Place'))));
    }
    v_say(v) {
      const sel = this.sel ? `<span class="scope">${this.t('选中的', 'Selection')}<button data-a="sayAll" aria-label="对整段说">${ic('Close', 16)}</button></span>` : '';
      const ex = (this.sel ? ['这段调小一点'] : []).concat(this.kind() === 'music' ? ['把副歌做成铃声', '结尾淡出3秒', '剪掉开头5秒，结尾淡出3秒，导出MP3', '声音太小了'] : ['删掉超过1秒的停顿', '人声清理', '剪掉开头5秒，结尾淡出3秒，导出MP3', '降噪之后统一音量', '把1:20到1:35移到开头', '声音太小了', '把它弄得好听点']);
      return this.panel([`<div class="chips say-ex">${ex.map(x => `<button class="chip" data-a="ex" data-x="${esc(x)}">${esc(x)}</button>`).join('')}</div>`,
        `<div class="sayin">${sel}<textarea rows="1" placeholder="${this.t('想怎么改', 'What to change')}" aria-label="说一句要怎么改">${esc(v.text || '')}</textarea>` +
        `<button class="mic ${v.text ? '' : 'on'}" data-a="mic" aria-label="语音输入">${ic(v.listening ? 'GraphicEq' : 'Mic', 22)}</button><button class="send ${v.text ? 'on' : ''}" data-a="send" aria-label="看看会怎么改">${ic('ArrowUpward', 20)}</button></div>`]);
    }
    v_plan() {
      const p = this.plan, d = this.doc;
      const rows = p.steps.map((s, i) => {
        const num = ['head', 'tail', 'fo', 'fi', 'pauses', 'gain', 'rgain'].includes(s.k);
        const stp = num && s.on ? `<span class="stepper"><button data-a="stepN" data-i="${i}" data-d="-1" aria-label="少一点">${ic('Remove', 18)}</button><button data-a="stepN" data-i="${i}" data-d="1" aria-label="多一点">${ic('Add', 18)}</button></span>` : '';
        return `<div class="step-r ${s.on ? '' : 'off'}"><button class="chk ${s.on ? 'on' : ''}" data-a="stepOn" data-i="${i}" aria-label="这一步">${ic('Check', 18)}</button><div class="sx">${esc(stepLabel(s, d))}</div>${stp}</div>`;
      }).join('');
      const iss = p.issues.map(x => `<div class="issue"><div>「${esc(x.text)}」${this.t('没看懂', '?')}</div><div class="chips">${['降噪', '统一音量', '加点混响'].map(s => `<button class="chip" data-a="ex" data-x="${esc(s)}">${s}</button>`).join('')}<button class="chip quiet" data-a="ai">AI</button></div></div>`).join('');
      return this.panel([this.prow(rows + iss, 'plist')],
        this.dec(this.seg('after', [[0, this.t('现在', 'Now')], [1, this.t('改后', 'After')]], p.after ? 1 : 0, 'sm'), this.cancel(this.t('不改了', 'Discard')), p.steps.some(s => s.on) ? this.wbtn('apply', this.t('应用', 'Apply')) : ''));
    }
    /**
     * v12: export asks what the file is for first (save it, send it, make it the phone's sound), then what (with a
     * selection: all or the selection). Format and quality follow from the purpose and what was used last for it, folded
     * into one row ("音质 MP3 · 192k") that opens the details inside the dock. The main button says what will happen.
     */
    v_export() {
      const e = this.exp, en = this.lang === 'en';
      if (e.stage === 'run') return this.panel([], this.dec(`<div class="vrow grow"><div class="grow pbar"><i style="width:${Math.round(e.p * 100)}%"></i></div><span class="mono pct">${Math.round(e.p * 100)}%</span></div>`, this.wbtn('expCancel', this.t('取消', 'Cancel'), null, 'sec'), ''));
      if (e.stage === 'done') {
        const what = e.purpose === 'ring' ? this.ringDone(e.ring) : e.purpose === 'share' ? this.t('已分享', 'Shared') : this.t('已保存', 'Saved');
        return this.panel([`<div class="donel">${ic('CheckCircle', 22)}<span class="rx"><b>${what}</b><span>${esc(e.name)}.${e.fmt.toLowerCase()}</span></span></div>`],
          this.dec(e.purpose === 'file' ? `<button class="chip" data-a="share">${ic('Share', 16)}${this.t('分享', 'Share')}</button><button class="chip" data-a="openOther">${this.t('用别的应用听', 'Open with')}</button>` : '', this.wbtn('back', this.t('完成', 'Done'), null, 'sec'), ''));
      }
      const rows = [];
      // 1 what it is for: three big choices, each its icon and word
      rows.push(`<div class="seg purpose">${[['file', 'FileDownload', '存文件', 'Save'], ['share', 'Share', '分享', 'Share'], ['ring', 'NotificationsActive', '设铃声', 'Ringtone']].map(([k, icn, zh, enl]) => `<button class="${e.purpose === k ? 'on' : ''}" data-a="seg" data-k="xp" data-v="${k}">${ic(icn, 20)}<span>${this.t(zh, enl)}</span></button>`).join('')}</div>`);
      // 2 what: all or the selection (only when there is a selection)
      if (this.sel) rows.push(this.seg('xs', [['all', this.t('整段', 'All') + ' ' + clk(this.L)], ['sel', this.t('选中的', 'Selection') + ' ' + clk(this.sel[1] - this.sel[0])]], e.scope));
      // a phone sound: which one
      if (e.purpose === 'ring') rows.push(this.seg('xr', [['call', this.t('来电', 'Calls')], ['note', this.t('通知', 'Alerts')], ['alarm', this.t('闹钟', 'Alarm')]], e.ring, 'sm'));
      // 3 how good: one row that says it, opening the details here
      const q = e.fmt === 'MP3' || e.fmt === 'M4A' ? e.q + 'k' : e.fmt === 'WAV' || e.fmt === 'FLAC' ? (e.depth || 16) + this.t(' 位', '-bit') : e.fmt === 'OPUS' ? '96k' : '23.85k';
      rows.push(`<button class="qrow ${e.open ? 'on' : ''}" data-a="xmore" aria-expanded="${!!e.open}"><span class="ql">${this.t('音质', 'Quality')}</span><b class="qv">${e.fmt} · ${q}</b>${ic(e.open ? 'ExpandLess' : 'ExpandMore', 20)}</button>`);
      if (e.open) {
        const fm = ['MP3', 'M4A', 'WAV', 'FLAC', 'OPUS', 'AMR'];
        rows.push(`<div class="seg fmts">${fm.map(f => `<button class="${e.fmt === f ? 'on' : ''}" data-a="xf" data-f="${f}">${f}</button>`).join('')}</div>`);
        const qq = e.fmt === 'MP3' || e.fmt === 'M4A' ? this.seg('xq', [[128, '128'], [192, '192'], [256, '256'], [320, '320']], e.q, 'grow') + `<span class="unit">kbps</span>`
          : e.fmt === 'WAV' || e.fmt === 'FLAC' ? this.seg('xd', [[16, this.t('16 位', '16-bit')], [24, this.t('24 位', '24-bit')]].concat(e.fmt === 'WAV' ? [[32, this.t('32 位浮点', '32 float')]] : []), e.depth || 16, 'grow')
          : `<span class="grow fixedq">${e.fmt === 'OPUS' ? 'Opus · 96 kbps' : 'AMR-WB · 23.85 kbps'}</span>`;
        rows.push(`<div class="vrow">${qq}</div>`);
        const lk = (k, icn, zh, enl) => `<button class="ghost ${e.sub === k ? 'on' : ''}" data-a="xsub" data-s="${k}">${ic(icn, 16)}<span>${this.t(zh, enl)}</span></button>`;
        rows.push(`<div class="links"><button class="ghost" data-a="xname">${ic('Edit', 16)}<span>${esc(e.name)}</span></button>${lk('tags', 'Label', '标签', 'Tags')}${lk('more', 'Tune', '采样率', 'Rate')}${lk('presets', 'Tune', '预设', 'Presets')}${this.doc.pieces.length > 1 && !this.sel ? `<button class="ghost ${e.split ? 'on' : ''}" data-a="xsplit">${ic('ViewAgenda', 16)}<span>${this.t('每段一个', 'Per piece')}</span></button>` : ''}</div>`);
        if (e.sub === 'more') rows.push(`<div class="vrow wrap">${this.seg('xrate', [[0, this.t('原样', 'As is')], [44100, '44.1k'], [48000, '48k']], e.rate || 0, 'sm')}${this.seg('xch', [[0, this.t('原样', 'As is')], [1, this.t('单声道', 'Mono')], [2, this.t('立体声', 'Stereo')]], e.ch || 0, 'sm')}${this.sw('xlim', this.t('压低峰值', 'Limit peaks'), !!e.limit)}</div>`);
        if (e.sub === 'tags') rows.push(`<div class="vrow"><div class="field grow"><span class="fv"><span class="fl">${this.t('标题', 'Title')}</span>${esc(e.name)}</span></div><div class="field grow"><span class="fv"><span class="fl">${this.t('作者', 'Artist')}</span>&nbsp;</span></div><button class="ghost" data-a="cover">${ic('Image', 16)}<span>${this.t('封面', 'Cover')}</span></button></div>`);
        if (e.sub === 'presets') rows.push(`<div class="chips"><button class="chip" data-a="preset" data-f="MP3" data-q="128">${this.t('播客', 'Podcast')} MP3 128</button><button class="chip" data-a="preset" data-f="FLAC" data-q="0">${this.t('存档', 'Archive')} FLAC</button><button class="chip quiet" data-a="presetSave">${ic('Add', 16)}${this.t('存为预设', 'Save preset')}</button></div>`);
      }
      // the main button says what will happen
      const lab = e.purpose === 'ring' ? this.ringGo(e.ring) : e.purpose === 'share' ? this.t('分享 ', 'Share ') + e.fmt : this.t('保存 ', 'Save ') + e.fmt;
      void en;
      return this.panel(rows, this.dec('', this.cancel(), this.wbtn('expGo', lab)));
    }
    ringGo(r) { return r === 'note' ? this.t('设为通知铃声', 'Set as alert') : r === 'alarm' ? this.t('设为闹钟铃声', 'Set as alarm') : this.t('设为来电铃声', 'Set as ringtone'); }
    ringDone(r) { return r === 'note' ? this.t('已设为通知铃声', 'Set as alert sound') : r === 'alarm' ? this.t('已设为闹钟铃声', 'Set as alarm sound') : this.t('已设为来电铃声', 'Set as ringtone'); }
    v_rec(v) {
      const rs = this.recSet || {}, r = this.rec || { len: 0, running: false };
      const bars = this.takeLevels(r.len).map(h => `<i style="height:${(r.running || r.len ? h : 8).toFixed(0)}%"></i>`).join('');
      const go = `<button class="recbtn ${r.running ? 'on' : ''}" data-a="recGo" aria-label="${r.running ? this.t('暂停录音', 'Pause recording') : this.t('录音', 'Record')}">${ic(r.running ? 'Pause' : 'RecDot', r.running ? 30 : 34)}</button><span class="rectime mono">${clkd(r.len)}</span>`;
      const gear = `<button class="cb ${v.settings ? 'on' : ''}" data-a="recSet" aria-label="录音设置">${ic('Tune', 20)}</button>`;
      const where = this.seg('rwhere', [['ins', this.t('插入', 'Insert')], ['mix', this.t('叠加', 'Overlay')]], this.rwhere || 'ins', 'sm');
      const done = r.len > 0 ? [this.cancel(this.t('不要了', 'Discard')), this.wbtn('recOk', this.t('完成', 'Done'))] : [this.cancel(), ''];
      const rows = [`<div class="vrow">${go}<div class="meter grow">${bars}</div>${gear}</div>`];
      if (v.settings) rows.push(this.seg('mic', [[0, this.t('跟随系统', 'System')], [1, this.t('内置', 'Built-in')], [2, this.t('有线', 'Wired')], [3, this.t('蓝牙', 'Bluetooth')]], rs.mic || 0, 'sm'),
        `<div class="vrow">${this.seg('rch', [[1, this.t('单声道', 'Mono')], [2, this.t('立体声', 'Stereo')]], rs.rch || 1, 'sm')}${this.sw('mon', this.t('耳机监听', 'Monitor'), !!rs.mon)}<span class="grow"></span>${this.sRange('rgain', rs.gain || 0, -12, 24, x => this.dbs(Math.round(x)))}</div>`);
      return this.panel(rows, this.dec(where, done[0], done[1]));
    }
    v_tts(v) {
      const s = v.s || {};
      const voices = s.voices ? `<div class="vrow">${this.seg('vsrc', [[0, this.t('本机', 'On phone')], [1, this.t('在线', 'Online')]], s.src || 0, 'sm')}${(s.src || 0) === 0 ? `<div class="chips nowrap">${['小美', '小宇', '晓晓', 'English'].map((x, i) => `<button class="chip ${i === (s.voice || 0) ? 'on' : ''}" data-a="voice" data-i="${i}">${x}</button>`).join('')}</div>` : this.o.voiceOff ? `<span class="sst">${ic('CloudOff', 18)}<span>${this.t('在线音色未接通', 'Online voices not connected')}</span></span>` : `<div class="chips nowrap">${['温柔女声', '沉稳男声', '我的声音'].map((x, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-a="voice" data-i="${i}">${x}</button>`).join('')}<button class="chip quiet" data-a="tool" data-k="clone">${ic('Add', 16)}${this.t('克隆', 'Clone')}</button></div>`}</div>` : '';
      const vname = (s.src || 0) === 0 ? ['小美', '小宇', '晓晓', 'English'][s.voice || 0] : '温柔女声';
      const rows = [`<textarea class="tbox" data-in="tts" rows="2" placeholder="${this.t('要读的文字', 'Text to read')}" aria-label="${this.t('要读的文字', 'Text to read')}">${esc(s.text || '')}</textarea>`];
      rows.push(this.prow(`<div class="vrow"><button class="chip ${s.voices ? 'on' : ''}" data-a="ttsVoices">${ic('RecordVoiceOver', 16)}${esc(vname)}${ic(s.voices ? 'ExpandLess' : 'ExpandMore', 16)}</button>${this.seg('trate', [[0, this.t('慢', 'Slow')], [1, this.t('正常', 'Normal')], [2, this.t('快', 'Fast')]], s.rate !== undefined ? s.rate : 1, 'sm')}</div>`, 'kb-hide'));
      if (voices) rows.push(this.prow(voices, 'kb-hide'));
      return this.panel(rows, this.dec('', this.cancel(), this.wbtn('ttsGo', this.t('生成', 'Generate'))));
    }
    v_sub(v) {
      const s = v.s || {};
      if (!s.lines) return this.panel([`<div class="chips"><button class="chip" data-a="subFile">${ic('ClosedCaption', 16)}${this.t('选字幕文件', 'Subtitle file')}</button><button class="chip" data-a="subFile">${ic('ContentPaste', 16)}${this.t('粘贴文字', 'Paste text')}</button></div>`], this.dec('', this.cancel(), ''));
      const lines = SUBS.map((x, i) => `<div class="sub-line"><span class="stm mono">${x[0]}</span><span class="tx">${x[1]}</span>${s.done || (s.run !== undefined && i < s.run) ? (i === 3 ? '<span class="badge fast">1.2×</span>' : '<span class="badge ok">✓</span>') : ''}</div>`).join('');
      const lead = `<button class="chip" data-a="ttsVoices">${ic('RecordVoiceOver', 16)}小美</button>${s.run !== undefined && !s.done ? `<span class="mono pct">${s.run}/${SUBS.length}</span>` : ''}`;
      if (s.done) return this.panel([this.prow(lines, 'plist')], this.dec('', this.wbtn('back', this.t('完成', 'Done'), null, 'sec'), ''));
      return this.panel([this.prow(lines, 'plist')], this.dec(lead, this.cancel(), s.run === undefined ? this.wbtn('subGo', this.t('生成', 'Generate')) : ''));
    }
    v_clone(v) {
      const s = v.s || {};
      const chk = (ok, t) => `<span class="okline">${ic(ok ? 'CheckCircle' : 'ErrorOutline', 16)}<span>${t}</span></span>`;
      return this.panel([`<button class="swr" data-a="sw" data-k="consent"><span class="chk ${s.ok ? 'on' : ''}">${ic('Check', 18)}</span><span class="sw-t"><b>${this.t('这是我本人的声音，或已取得本人同意', 'This is my voice, or I have consent')}</b></span></button>`,
        `<div class="readbox">今天天气不错，我们出去走走吧。</div>`,
        `<div class="vrow"><button class="recbtn ${s.rec === 'on' ? 'on' : ''}" data-a="cloneRec" aria-label="录音">${ic(s.rec === 'on' ? 'Stop' : 'Mic', 24)}</button><span class="rectime mono">${s.rec === 'done' ? '00:05.2' : s.rec === 'on' ? '00:03.1' : '00:00.0'}</span>${s.rec === 'done' ? chk(true, this.t('音量和音质没问题', 'Level OK')) : ''}</div>`],
        this.dec('', this.cancel(this.t('不要了', 'Discard')), this.wbtn('cloneOk', this.t('保存为音色', 'Save voice'))));
    }
    v_chorus(v) {
      const c = this.chorus;
      if (!c.length) return this.panel([`<span class="sst">${ic('MusicNote', 18)}<span>${this.t('没找到副歌', 'No chorus found')}</span></span>`], this.dec('', this.cancel(this.t('好', 'OK')), ''));
      return this.panel([this.seg('cand', c.map((x, i) => [i, (i + 1) + ' · ' + cmp(x[0])]), v.i || 0), this.seg('clen', [[0, this.t('原长', 'As found')], [200, this.t('20秒', '20 s')], [300, this.t('30秒', '30 s')]], v.len || 0, 'sm')],
        this.dec('', this.cancel() + this.wbtn('chorusKeep', this.t('只留这段', 'Keep'), null, 'sec'), this.wbtn('ring', this.t('做铃声', 'Ringtone'))));
    }
    v_pauses(v) {
      const mk = this.marks || [], on = mk.filter(m => m.on).length, gain = mk.filter(m => m.on).reduce((a, m) => a + m.b - m.a, 0);
      return this.panel([this.seg('pmin', [[5, this.t('超过半秒', 'Over 0.5 s')], [10, this.t('超过1秒', 'Over 1 s')], [20, this.t('超过2秒', 'Over 2 s')]], v.min || 10, 'sm')],
        this.dec('', this.cancel(), on ? this.wbtn('pausesGo', `${this.t('删掉', 'Remove')} ${on}${this.t(' 处', '')} · −${this.lang === 'en' ? durEn(gain) : dur(gain)}`) : ''));
    }
    v_history() {
      const n = this.hist.length, cur = this.histPrev !== null && this.histPrev !== undefined ? this.histPrev : this.hi;
      const rows = this.hist.map((h, i) => ({ h, i })).reverse().map(({ h, i }, k) => {
        const cls = (i === cur ? 'now' : i > this.hi ? 'redo' : '') + (k === 0 ? ' first' : '') + (k === n - 1 ? ' last' : '');
        return `<button class="hist-r ${cls}" data-a="hprev" data-i="${i}"><span class="rail"><i></i></span><span class="lt">${esc(i === 0 ? this.t('最开始', 'Original') : h.label)}</span>${i === this.hi ? `<span class="ld">${this.t('现在', 'Now')}</span>` : ''}</button>`;
      }).join('');
      return this.panel([this.prow(rows, 'plist hist')], this.dec('', this.cancel(), cur !== this.hi ? this.wbtn('histGo', this.t('回到这一步', 'Go back here')) : ''));
    }
    v_mname(v) {
      return this.panel([`<div class="field"><input data-in="mname" value="${esc(v.name || '')}" aria-label="${this.t('标记名称', 'Marker name')}"></div>`], this.dec('', this.cancel(), this.wbtn('mnameOk', this.t('好', 'OK'))));
    }

    // ---------------------------------------------------------------- the two honest sheets (no waveform needed)
    /** Choosing a sound from a list (music under the voice, audio to insert, a replacement): previews, not the waveform. */
    sheetPick(o) {
      const src = o.src || 'lib', items = src === 'online' ? ONLINE : o.mode === 'audio' ? LIBAUDIO : LIBMUSIC;
      const pick = src === 'online' ? 'pickOnline' : o.mode === 'audio' ? 'pickAudio' : 'pickLib';
      const title = o.mode === 'audio' ? this.t('插入一段音频', 'Insert audio') : o.mode === 'swap' ? this.t('换一首', 'Replace the music') : this.t('配一首音乐', 'Add music');
      const tabs = this.seg('psrc', [['lib', this.t('音频库', 'Library')], ['online', this.t('在线', 'Online')], ['file', this.t('手机里的文件', 'Files')]], src);
      const where = o.mode === 'audio' ? this.seg('where', [['ins', this.t('插在播放头', 'At playhead')], ['end', this.t('接在结尾', 'At end')], ['mix', this.t('叠加', 'Overlay')]], this.where || 'ins', 'sm') : '';
      let body;
      if (src === 'online' && this.o.musicOff) body = `<div class="ncrow"><span class="itile" style="--c:var(--faint)">${ic('CloudOff', 22)}</span><span class="rx"><b>${this.t('未接通', 'Not connected')}</b><span>${this.t('这个版本没有配置音乐库服务器。', 'No music server in this build.')}</span></span></div><div class="chips"><button class="chip" data-a="psrcFile">${ic('Folder', 16)}${this.t('用手机里的音乐', 'Use a file')}</button></div>`;
      else body = (src === 'online' ? `<div class="chips nowrap">${['轻快', '舒缓', '节日', '播客'].map((p, i) => `<button class="chip ${i === (o.pill || 0) ? 'on' : ''}" data-a="pill" data-i="${i}">${p}</button>`).join('')}</div>` : '') +
        items.map((it, i) => `<div class="mtrack"><button class="mini-play" data-a="pv" data-i="${i}" aria-label="${this.t('试听', 'Preview')}">${ic('PlayArrow', 20)}</button><button class="mx" data-a="${pick}" data-i="${i}"><b>${esc(it.name)}</b><span>${esc(it.meta || '')}</span></button><button class="use" data-a="${pick}" data-i="${i}">${this.t('用这首', 'Use')}</button></div>`).join('');
      return `<div class="handle" data-a="modalClose" aria-label="${this.t('收起', 'Close')}"></div><div class="sh-h"><b>${title}</b></div>${tabs}${where}<div class="sh-b">${body}</div>`;
    }
    /** This audio: its name, what it is, where it came from and the credits it owes; the few things done to the file. */
    sheetInfo() {
      const cr = this.doc.tracks.filter(t => t.credit).map(t => `<div class="credit"><b>${esc(t.name)}</b><span>${esc(t.credit)}</span></div>`).join('');
      return `<div class="handle" data-a="modalClose" aria-label="${this.t('收起', 'Close')}"></div>` +
        `<div class="field big"><span class="fv"><span class="fl">${this.t('名字', 'Name')}</span><input data-in="name" value="${esc(this.lang === 'en' ? (this.o.nameEn || EN.name) : this.doc.name)}" aria-label="${this.t('名字', 'Name')}"></span>${ic('Edit', 18)}</div>` +
        `<dl class="kv"><dt>${this.t('时长', 'Length')}</dt><dd>${clk(this.L)}</dd><dt>${this.t('格式', 'Format')}</dt><dd>48 kHz · ${this.t('单声道', 'mono')}</dd><dt>${this.t('来源', 'Source')}</dt><dd>${esc(this.o.source || this.t('手机里的文件 · 采访0412.m4a', 'A file · interview0412.m4a'))}</dd><dt>${this.t('占用', 'Storage')}</dt><dd>38 MB</dd><dt>${this.t('备份', 'Backup')}</dt><dd>${this.t('今天 10:12', 'Today 10:12')}</dd></dl>${cr}` +
        `<div class="sh-acts"><button class="row" data-a="saveas">${ic('ContentCopy', 20)}<span class="rx"><b>${this.t('另存一份', 'Save a copy')}</b></span></button><button class="row" data-a="pkg">${ic('Inventory2', 20)}<span class="rx"><b>${this.t('导出工程包', 'Export project')}</b></span></button><button class="row" data-a="restore">${ic('Restore', 20)}<span class="rx"><b>${this.t('从备份恢复', 'Restore backup')}</b></span></button><button class="row danger" data-a="delaudio">${ic('Delete', 20)}<span class="rx"><b>${this.t('删除这段音频', 'Delete this audio')}</b></span></button></div>`;
    }
    openSheet(kind, o) {
      this.stopPlay();
      this.sheet = Object.assign({ kind }, o || {});
      this.renderSheet();
    }
    renderSheet() {
      const s = this.sheet; if (!s) return;
      const html = s.kind === 'pick' ? this.sheetPick(s) : this.sheetInfo();
      const had = !!this.mhost.querySelector('.sheet');
      this.mhost.innerHTML = `<div class="scrim" data-a="modalClose"></div><div class="sheet ${had ? 'still' : ''}" data-sheet="${s.kind}" role="dialog">${html}</div>`;
      this.fitSegsIn(this.mhost);
    }
    fitSegsIn(root) { root.querySelectorAll('.seg').forEach(sg => { sg.classList.remove('two'); if (sg.scrollWidth > sg.clientWidth + 1) { sg.classList.add('two'); sg.style.setProperty('--n', Math.ceil(sg.children.length / 2)); } }); }

    trk() { return this.track ? this.doc.tracks.find(x => x.id === this.track) : null; }

    // ---------------------------------------------------------------- colours, size
    colors() {
      const cs = getComputedStyle(this.scr), g = n => cs.getPropertyValue('--' + n).trim();
      this.C = {}; this._accRGB = null;
      ['bg', 'surface', 'on', 'sheet', 'surface2', 'surface3', 'dim', 'faint', 'accent', 'on-accent', 'wave', 'wave-dim', 'sel', 'sel-edge', 'playhead', 'fade', 'record', 'outline', 'icon-btn', 'error',
        'lane0', 'lane1', 'lane2', 'lane3', 'lane4', 'lane5', 'lane6', 'lane7', 'info',
        'wave-deep', 'wave-tip', 'wave-echo', 'wave-echo-tip', 'horizon', 'light', 'ph-glow', 'spot', 'k-music', 'k-dub', 'k-voice', 'k-acc', 'water-top', 'water-bot'].forEach(n => { this.C[n] = g(n); });
    }
    measure() {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const W = Math.round(this.tlEl.clientWidth), H = Math.round(this.tlEl.clientHeight);
      if (!W || !H) return false;
      if (W !== this.W || H !== this.H || dpr !== this.dpr) { this.W = W; this.H = H; this.dpr = dpr; this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
      this.IW = Math.max(40, W - 2 * G);
      // the dock's height at rest (the same with any live setting open): remembered while a task or the keyboard has it
      if (!this.botEl.classList.contains('covered') && !this.typing) this._restDockH = this.botEl.offsetHeight;
      this._restTop = H - (this._restDockH || this.botEl.offsetHeight); this._dockTop = this.botEl.offsetTop;
      // the waterline rides on the dock's lit edge
      const wb = Math.round(H - this._dockTop + BUOY_GAP);
      if (wb !== this._waterB) { this._waterB = wb; this.waterEl.style.bottom = wb + 'px'; }
      if (this.toolsEl.clientWidth !== this._aw) { this._aw = this.toolsEl.clientWidth; this.sizeRows(); }
      this.placeNub();
      return true;
    }
    /** The waterline holds play (and undo): kept clear of the main line and its handles. Empty while typing. */
    waterOn() { return !this.typing; }

    // ---------------------------------------------------------------- geometry of the timeline (inset G at both ends)
    geom() {
      const W = this.W, H = this.H, fs = this.o.fs ? 1.3 : 1;
      const ruler = Math.round(30 * fs), chips = 0;
      const tr = this.shownDoc().tracks, n = tr.length;
      const ovH = this.zoomed() && !this._mag && !this._magBack ? 24 : 0, ovGap = ovH ? ovH + 6 : 0;
      // the highest the main line can begin: the ruler (and, zoomed in, the overview strip) above it
      const top0 = ruler + ovGap + 6;
      // The dock floats over the canvas. The time axis never moves sideways (x of a moment is the same in every state);
      // the main line's height follows the part of the canvas the dock leaves uncovered, so the whole waveform stays in
      // view while a control is open, a decision waits or the keyboard is up; the bars rescale.
      const dockTop = this._dockTop !== undefined ? this._dockTop : H, restTop = this._restTop !== undefined ? this._restTop : H;
      // v10: the waterline (play, undo) is a reserved strip above the dock; the main line and its handles end above it
      const R = this.waterOn() ? WATER_R : 14;
      const floor = restTop - R, vis = Math.min(dockTop, H) - R;
      const th = n ? Math.round(48 * fs) : 0, span = n * (th + 6), minMain = Math.round(96 * fs);
      const covered = dockTop < restTop - 1;
      let mainH;
      if (!n) mainH = Math.max(Math.min(minMain, vis - top0), Math.min(floor - top0, vis - top0));
      else {
        // v12: the main line takes what the tracks leave (at least 120); its sound keeps to the bottom of it, as for a
        // single audio, so the tracks follow the sound directly and the room left over is air, above
        const rest = Math.max(120, floor - top0 - 10 - span);
        // with tracks: the main line gives up height first (down to a minimum), so the tracks stay in view longer
        mainH = covered ? clamp(vis - top0 - 10 - span, Math.min(minMain, vis - top0), rest) : rest;
        mainH = Math.min(mainH, Math.max(40, vis - top0));
      }
      const laneTop = top0 + mainH + 10;
      // the tracks scroll under the waterline: the last one can always be brought above it
      const view = Math.max(0, Math.min(dockTop, H) - R - laneTop);
      this._laneMax = Math.max(0, span - view);
      let off = clamp(this.laneOff || 0, 0, this._laneMax);
      // the track being adjusted is kept in view: the stack scrolls just enough (vertically only)
      const sel = this.track ? tr.findIndex(t => t.id === this.track) : -1;
      if (sel >= 0) { const b = laneTop + sel * (th + 6) + th, t0 = laneTop + sel * (th + 6); if (b - off > vis) off = b - vis; if (t0 - off < laneTop) off = Math.max(0, t0 - laneTop); }
      const lanes = tr.map((t, i) => ({ t, y: laneTop + i * (th + 6) - off, h: th }));
      // v12: the sound band. The waveform sits low in the main line, on a horizon with its echo under it, so a single
      // audio has no empty middle between it and play; it is bounded (at most 235 tall, about 0.46 of the main line), so
      // the air above stays open. A single audio keeps a row under its echo for the grips (it is also the air above
      // play). v12.1: with tracks there is no such row: the grips hang over the echo and the tracks follow it directly.
      const GRIP = n ? 0 : Math.round(44 * fs);
      let amp = Math.min((mainH - GRIP - 8) / 1.45, 235 * fs);
      // the share is taken without the overview strip, so zooming in never rescales the sound
      amp = Math.min(amp, Math.max(110 * fs, ((n ? Math.max(mainH, floor - top0 - 10 - span) : mainH) + ovGap) * 0.46));
      amp = Math.max(20, amp);
      const echo = amp * 0.45, mid = Math.round(top0 + mainH - GRIP - echo - 4);
      // the band reaches as high as the tallest bar this audio draws at this zoom (with its volume), not higher; while a
      // take is coming in, as high as the take's tallest
      const sd = this.shownDoc(), vl = this.layersShown(sd).find(l => l.k === 'vol');
      const fpc = this.IW ? FPU * Math.max(1e-6, this.view.b.v - this.view.a.v) / this.IW : FPU;
      let pkc = colPeak(sd, fpc) * (vl ? Math.pow(Math.pow(10, vl.v / 20), 0.7) : 1);
      if (this.rec) pkc = Math.max(pkc, 0.9 * takePeak());
      // while a grip magnifies time (and springs back) the sound's top and its ruler stay where they were; the bars
      // scale to fit under it, so nothing moves under the finger but the time
      let barScale = 1;
      if ((this._mag || this._magBack) && this._magPk) { barScale = Math.min(1, this._magPk / Math.max(1e-6, pkc)); pkc = this._magPk; }
      const pk = clamp(pkc, 0.3, 1);
      const bandTop = Math.max(top0, Math.round(mid - amp * pk - 8)), bandBot = Math.round(mid + echo + 4);
      // v12.1: the ruler belongs to the sound. It sits just above the band (its ticks, labels, the time pill and the
      // playhead's marker); zoomed in, the overview strip goes above it. What height is left is air under the title.
      const rTop = Math.max(ovGap, bandTop - 6 - ruler), rBot = rTop + ruler, ovY = ovH ? rTop - ovH - 4 : rTop;
      // the main line begins right under its ruler
      const top = rBot + 4, blockY = top, blockH = top0 + mainH - top;
      // the grips: a single audio's hang in the row under the echo; with tracks, over the echo
      const handleY = n ? Math.round(mid + 4 + 15 * fs) : Math.min(bandBot + Math.round(GRIP / 2) - 2, dockTop - R - 16);
      return { W, H, ruler, rTop, rBot, chips, top, mainY: top, mainH: blockH, blockY, blockH, lanes, laneTop, ovY, ovH, ovGap, dockTop, restTop, handleY, addH: 0, waterTop: dockTop - BUOY_GAP - BUOY, R, mid, amp, echo, bandTop, bandBot, grip: GRIP, tracks: n, pk: pkc, barScale };
    }
    placeAddLane(g) {
      const el = this.addEl; if (!el) return;
      const on = g.addH >= 28, key = on ? [g.addY, g.addH, this.W, this.lang].join() : 'off';
      if (key === this._addKey) return; this._addKey = key;
      el.style.display = on ? '' : 'none';
      if (!on) return;
      el.style.top = g.addY + 'px'; el.style.height = g.addH + 'px'; el.style.left = G + 'px'; el.style.right = G + 'px';
      el.innerHTML = ic('Add', 16) + `<span>${this.t('加一条：音乐、录音、朗读', 'Add music, a recording or speech')}</span>`;
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
    /**
     * v12: the selection's two grips. Each hangs from its edge on the outside (the start's to the left, the end's to the
     * right), so however short the selection they never overlap, and each takes at least 48 dp. A grip that would come
     * within SAFE of a screen side turns inward; if it would then meet the other one, it moves to the top of the sound
     * (the start's grip at the top-left corner, the end's at the bottom-right). Returns per grip: side (−1 left of its
     * edge, 1 right), row (0 under the sound, 1 above it), the hit box (l, r, t, b) and the drawn body (bx, by, bw, bh).
     */
    gripLayout() {
      if (!this.sel) return null;
      const g = this.geom(), W = this.W, HW = 48, x = [this.d2x(this.sel[0]), this.d2x(this.sel[1])];
      const fs = this.o.fs ? 1.3 : 1, bw = Math.round(22 * fs), bh = Math.round(30 * fs);
      const h = [{ side: -1, row: 0 }, { side: 1, row: 0 }];
      if (x[0] - HW < SAFE) h[0].side = 1;
      if (x[1] + HW > W - SAFE) h[1].side = -1;
      const box = i => { const q = h[i], xx = x[i]; let l = q.side < 0 ? xx - HW : xx - 8, r = q.side < 0 ? xx + 8 : xx + HW; if (q.side > 0 && i === 1) l = xx - 6; if (q.side < 0 && i === 0) r = xx + 6; if (l < SAFE) { r += SAFE - l; l = SAFE; } if (r > W - SAFE) { l -= r - (W - SAFE); r = W - SAFE; } return [l, r]; };
      let b0 = box(0), b1 = box(1);
      if (b0[1] > b1[0]) {
        // bodies apart: the boundary goes between them and each box keeps 48 (stretching outward if it must)
        const body = i => h[i].side < 0 ? [x[i] - bw, x[i]] : [x[i], x[i] + bw], p0 = body(0), p1 = body(1);
        let m = p0[1] <= p1[0] + 1 ? (p0[1] + p1[0]) / 2 : (x[0] + x[1]) / 2;
        m = Math.max(m, b0[0] + HW); const r1 = Math.min(W - SAFE, Math.max(b1[1], m + HW));
        if (p0[1] <= p1[0] + 1 && r1 - m >= HW && m - b0[0] >= HW && p1[1] > m + 4) { b0[1] = m; b1[0] = m; b1[1] = r1; }
        else if (h[0].side > 0) h[0].row = 1; else if (h[1].side < 0) h[1].row = 1;
        else { const mm = (x[0] + x[1]) / 2; b0[1] = Math.min(b0[1], mm); b1[0] = Math.max(b1[0], mm); }
      }
      return h.map((q, i) => {
        const [l, r] = i ? b1 : b0;
        let t, b, by;
        if (q.row) {
          // v12.1: the corner grip hangs from the top of the sound, inside it (its ruler sits right above)
          t = g.bandTop - 2; b = t + 44 * Math.max(1, bh / 30); by = g.bandTop + 2;
        } else if (g.tracks) {
          // v12.1: with tracks there is no row under the echo: the grip hangs over the echo, from the horizon down, and
          // its touch area ends above the first track (never over its label, never taking its touches)
          b = Math.min(g.mid + 8 + bh + 10, g.laneTop - 2); t = b - Math.max(44, bh + 14); by = Math.min(g.mid + 4, b - bh - 2);
        } else {
          t = g.bandBot - 6; b = Math.min(g.bandBot + g.grip - 2, g.dockTop - g.R - 2); by = g.bandBot + 4;
        }
        const bx = q.side < 0 ? x[i] - bw : x[i];
        return Object.assign(q, { x: x[i], l, r, t, b, bx, by, bw, bh });
      });
    }
    handleRect(i) { const q = this.gripLayout()[i]; return { l: q.l, r: q.r, t: q.t, b: q.b }; }
    /** Every touch target drawn on the timeline, with the area that takes the touch (used by the checks). */
    targets() {
      const out = [], g = this.geom(), d = this.shownDoc();
      if (this.sel && !this.task) for (let i = 0; i < 2; i++) { const r = this.handleRect(i); out.push({ kind: 'handle' + i, l: r.l, r: r.r }); }
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
      if (this.fling) { this.stepFling(dt); busy = true; }
      if (this.rub.step(dt)) busy = true;
      if (this.anchor && this.anchor.fade) { this.anchor.alpha -= dt / 0.22; if (this.anchor.alpha <= 0) this.anchor = null; busy = true; }
      if (this._magBack && !this.view.a.busy && !this.view.b.busy) { this._magBack = false; this._magPk = 0; busy = true; }
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
      this.placeAddLane(g);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // v12.1: the sound's tags sit above its ruler (with the overview strip, above that) when there is air for them
      { const room = g.rTop - g.ovGap; this.chipsEl.style.top = (room >= 26 + 10 ? room - 26 - 6 : g.top + 6) + 'px'; }
      // the time pill rides on the ruler wherever the ruler is
      { const tt = Math.round(g.rTop + (g.ruler - 24) / 2); if (tt !== this._tmTop) { this._tmTop = tt; this.tmEl.style.top = tt + 'px'; } }
      const d = this.shownDoc(), f = flat(d), L = f.L;
      const ppu = this.ppu(), va = this.view.a.v;
      const gat = this.gapAt(), gw = this.gapW(), hasGap = !!this.gap;
      const d2x = u => G + (((hasGap && u >= gat) ? u + gw : u) - va) * ppu;
      const x2d = x => { const du = va + (x - G) / ppu; if (!hasGap || du < gat) return du; if (du < gat + gw) return null; return du - gw; };
      const ls = this.layersShown(d).filter(l => l.on !== false);
      const lay = {}; ls.forEach(l => { lay[l.k] = l; });
      this.drawLight(ctx, g);
      ctx.save(); if (this.rub.v) ctx.translate(this.rub.v, 0);
      this.drawRuler(ctx, g, fs);
      // the bars use about seven tenths of the line's height: the audio sits in the canvas, it does not fill it
      // mY/mH: the sound band (where the bars, the selection, the marks and the playhead are drawn)
      const mY = g.bandTop, mH = g.bandBot - g.bandTop, mid = g.mid, amp = g.amp;
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
      if (sel) { ctx.fillStyle = C.sel; roundRect(ctx, sel[0], mY, sel[1] - sel[0], mH, Math.min(6, (sel[1] - sel[0]) / 2)); ctx.fill(); }
      const dn = lay.dn ? DN_RES[lay.dn.v] : 1, keep = lay.dn ? [0.99, 0.98, 0.97, 0.95, 0.92][lay.dn.v] : 1;
      const lvl = lay.ld ? 1 : 0, vol = lay.vol ? Math.pow(10, lay.vol.v / 20) : 1;
      const rev = !!lay.rev, env = d.env;
      if (this.spec) this.drawSpec(ctx, g, f, x2d);
      else {
        // v12: a column every PITCH px from the frames under it (100 a second): the mean, lifted toward the peak, so a
        // pause of a second still reads as a dip at the fitted zoom (about half a second a pixel)
        const cols = [], PITCH = 1, LF = L * FPU;
        for (let x = PITCH / 2 + 0.5; x < W; x += PITCH) {
          const ua = x2d(x - PITCH / 2), ub = x2d(x + PITCH / 2);
          if (ua === null || ub === null) continue;
          if (ub <= 0 || ua >= L) continue;
          const f0 = clamp(Math.floor(ua * FPU), 0, LF - 1), f1 = clamp(Math.max(f0 + 1, Math.ceil(ub * FPU)), f0 + 1, LF);
          const step = Math.max(1, Math.floor((f1 - f0) / 160));
          let mx = 0, sum = 0, cnt = 0, key = 0, spk = 0;
          for (let fr = f0; fr < f1; fr += step) {
            const i = Math.floor(fr / FPU), j = rev ? L - 1 - i : i, sub = rev ? FPU - 1 - (fr % FPU) : fr % FPU;
            cnt++;
            if (f.sil[j]) continue;
            const S = SRCL[f.si[j]], k = f.sf[j] * FPU + sub;
            let c = S.fc[k] * keep; const z = S.fz ? S.fz[k] * dn : 0;
            if (c > 0.0045) spk++;
            if (lvl) c = Math.min(0.9, Math.pow(c, 0.72) * 0.98);
            let a = (c + z) * f.g[j] * vol;
            if (env && env.length) a *= envGain(env, i);
            if (lay.rp) a = Math.min(a, 0.82);
            const h = disp(a);
            if (h > mx) { mx = h; key = f.key[j]; }
            sum += h;
          }
          const m = cnt ? Math.min(1, (0.68 * sum / cnt + 0.32 * mx) * 1.16) : 0;
          // a column that is mostly room (speech in under a third of it) is a pause: drawn pale and without its
          // reflection, so pauses read at the fitted zoom
          cols.push([x, m, key, this.procSplit !== undefined && f0 / FPU > L * this.procSplit, spk < cnt * 0.3]);
        }
        this._cols = cols;
        this.drawBars(ctx, cols, mid, amp * g.barScale, d2x, L, PITCH);
      }
      if (hasGap && gw > 0.5) this.drawGap(ctx, g, mY, mH, gat, gw, va, ppu);
      u0 = 0;
      d.pieces.forEach(p => {
        const n = plen(p), curves = [];
        if (p.fi) { const a = d2x(u0), b = d2x(u0 + p.fi); curves.push(c => { c.moveTo(a, mY + mH - 4); c.quadraticCurveTo(a + (b - a) * 0.15, mY + 6, b, mY + 4); }); }
        if (p.fo) { const a = d2x(u0 + n - p.fo), b = d2x(u0 + n); curves.push(c => { c.moveTo(a, mY + 4); c.quadraticCurveTo(b - (b - a) * 0.15, mY + 6, b, mY + mH - 4); }); }
        curves.forEach(f => { const path = new Path2D(); f(path); ctx.lineCap = 'round'; ctx.strokeStyle = hexA(C.bg, 0.85); ctx.lineWidth = 4.5; ctx.stroke(path); ctx.strokeStyle = C['wave-deep']; ctx.lineWidth = 1.8; ctx.stroke(path); });
        u0 += n;
      });
      if (env && env.length) this.drawEnv(ctx, env, d2x, mY, mH);
      this.drawMarkers(ctx, g, fs, d2x);
      ls.forEach(l => { if (l.a !== undefined) { const a = d2x(l.a), b = d2x(l.b); ctx.fillStyle = C[LAYER[l.k].c]; roundRect(ctx, a, mY + 2, b - a, 4, 2); ctx.fill(); } });
      if (g.lanes.length) { ctx.save(); ctx.beginPath(); ctx.rect(0, g.laneTop - 4, W, H); ctx.clip(); for (const ln of g.lanes) this.drawLane(ctx, ln, f, d2x, x2d); ctx.restore(); }
      this.placeLabels(g);
      if (sel) {
        const ye = g.lanes.length ? g.lanes[g.lanes.length - 1].y + g.lanes[g.lanes.length - 1].h : mY + mH;
        const grips = !this.task && this.gripLayout();
        ctx.fillStyle = C['sel-edge'];
        sel.forEach((x, i) => {
          // the edge runs the height of the sound and on into its grip (down to it, or up to it at the top)
          const q = grips && grips[i], y0 = mY, y1 = q && !q.row ? Math.max(mY + mH, q.by + 2) : mY + mH;
          ctx.fillRect(Math.round(x) - 1, y0, 2, y1 - y0);
        });
        if (g.lanes.length) { ctx.globalAlpha = 0.35; for (const x of sel) ctx.fillRect(Math.round(x) - 0.5, mY + mH, 1, ye - mY - mH); ctx.globalAlpha = 1; }
        if (grips) grips.forEach((q, i) => this.drawGrip(ctx, Object.assign({}, q, { bx: q.side < 0 ? sel[i] - q.bw : sel[i] }), this.dragSel && this._gripI === i));
      }
      if (!this.hand) {
        const phx = this.d2x(clamp(this.ph, 0, L));
        // v12: a hairline in the sound's blue, only as far as the last line that holds sound (never down to play); above
        // the sound it is fainter still, so it ties the time on the ruler to the ring on the horizon without weight
        const bottom = g.lanes.length ? Math.min(g.lanes[g.lanes.length - 1].y + g.lanes[g.lanes.length - 1].h, g.dockTop - g.R) : Math.round(g.mid + g.echo * 0.9);
        const pc = this.rec ? C.record : C['wave-deep'], onEdge = sel && sel.some(x => Math.abs(x - phx) < 2);
        // v12.1: marker and line are one object: the line starts at the marker on the ruler, just above the sound
        ctx.fillStyle = hexA(pc, 0.62); if (!onEdge) ctx.fillRect(phx - 0.6, g.rBot - 1, 1.2, Math.max(0, bottom - g.rBot + 1));
        ctx.fillStyle = pc; ctx.beginPath(); ctx.arc(phx, g.rBot - 1, 2.5, 0, 7); ctx.fill();
        if (this.study === 1 && !this.spec) {
          const hy = g.mid + 0.5;
          if (this.playing) { const rg = ctx.createRadialGradient(phx, hy, 0, phx, hy, 16); rg.addColorStop(0, C['ph-glow']); rg.addColorStop(1, hexA(C['ph-glow'], 0)); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(phx, hy, 16, 0, 7); ctx.fill(); }
          ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(phx, hy, 4.5, 0, 7); ctx.fill();
          ctx.strokeStyle = pc; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(phx, hy, 4.5, 0, 7); ctx.stroke();
        }
      }
      if (this.hand) this.drawCard(ctx, g, this.hand.mode !== 'lift');
      if (g.ovH) this.drawOverview(ctx, g, f);
      if (this.compareHold) { ctx.fillStyle = C.surface3; roundRect(ctx, G + 6, mY + 8, 46 * fs, 22 * fs, 11 * fs); ctx.fill(); ctx.fillStyle = C.on; ctx.font = `600 ${12 * fs}px system-ui, sans-serif`; ctx.textBaseline = 'middle'; ctx.fillText(this.t('原声', 'Orig.'), G + 14, mY + 8 + 11 * fs); }
      // v12.2: the anchor of a range being started (press and hold): a line in the selection's colour, a dot on the horizon
      if (this.anchor) {
        const ax = d2x(this.anchor.u), al = clamp(this.anchor.alpha, 0, 1);
        ctx.fillStyle = hexA(C['sel-edge'], al); ctx.fillRect(Math.round(ax) - 1, mY, 2, mH);
        ctx.fillStyle = hexA(C['sel-edge'], 0.22 * al); ctx.beginPath(); ctx.arc(ax, g.mid, 14, 0, 7); ctx.fill();
        ctx.fillStyle = hexA(C['sel-edge'], al); ctx.beginPath(); ctx.arc(ax, g.mid, 5, 0, 7); ctx.fill();
      }
      ctx.restore();
      if (this.o.showEdges) this.drawEdgeGuides(ctx, g);
      this.placeFlag();
      const ta = this._laneMax > 0 ? 'none' : 'pan-y'; if (this.cv.style.touchAction !== ta) this.cv.style.touchAction = ta;
    }
    /** A grip: a tab hanging from the selection's edge, squared where it meets the edge, two ridges to hold. */
    drawGrip(ctx, q, held) {
      const C = this.C, { bx, by, bw, bh } = q, r = bw / 2, inner = q.side < 0 ? 'r' : 'l', top = !q.row;
      ctx.save();
      if (held) { ctx.fillStyle = hexA(C['sel-edge'], 0.22); roundRect(ctx, bx - 6, by - 6, bw + 12, bh + 12, r + 6); ctx.fill(); }
      ctx.beginPath();
      // corners: the one on the edge's side next to the sound is square, the rest round
      const rr = { tl: r, tr: r, br: r, bl: r };
      rr[(top ? 't' : 'b') + inner] = 2;
      ctx.moveTo(bx + rr.tl, by); ctx.arcTo(bx + bw, by, bx + bw, by + bh, rr.tr); ctx.arcTo(bx + bw, by + bh, bx, by + bh, rr.br);
      ctx.arcTo(bx, by + bh, bx, by, rr.bl); ctx.arcTo(bx, by, bx + bw, by, rr.tl); ctx.closePath();
      ctx.fillStyle = C['sel-edge']; ctx.fill();
      ctx.fillStyle = hexA(C['on-accent'], 0.9);
      const cx = bx + bw / 2, cy = by + bh / 2;
      ctx.fillRect(Math.round(cx - 3.5), Math.round(cy - 6), 1.6, 12); ctx.fillRect(Math.round(cx + 2), Math.round(cy - 6), 1.6, 12);
      ctx.restore();
    }
    drawEdgeGuides(ctx, g) {
      const W = this.W, H = this.H, C = this.C;
      ctx.save();
      ctx.fillStyle = 'rgba(226, 59, 59, 0.16)'; ctx.fillRect(0, 0, EDGE, H); ctx.fillRect(W - EDGE, 0, EDGE, H);
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.strokeStyle = C.record; [SAFE, W - SAFE].forEach(x => { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); });
      ctx.strokeStyle = C.accent; [G, W - G].forEach(x => { ctx.beginPath(); ctx.moveTo(x + 0.5, g.rBot); ctx.lineTo(x + 0.5, H); ctx.stroke(); });
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
      // no box behind the audio: its extent is the horizon line; only a recording in progress or a silence is marked
      if (tint || silent) { ctx.fillStyle = tint ? hexA(tint, 0.07) : hexA(C.surface3, 0.12); roundRect(ctx, a + 1, y, Math.max(0, b - a - 2), h, 14); ctx.fill(); }
      if (silent) { ctx.strokeStyle = C.faint; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a + 6, y + h / 2); ctx.lineTo(b - 6, y + h / 2); ctx.stroke(); ctx.setLineDash([]); }
    }
    /**
     * The ground's light: a soft pool behind the main line (still; it follows the line, not time), and while playing a
     * column of light around the playhead. Plain gradients: free on Android as a shader brush.
     */
    drawLight(ctx, g) {
      const C = this.C, W = this.W, mid = g.mid - g.amp * 0.3;
      const pool = this.study === 2 ? C.spot : C.light;
      if (pool) {
        // an ellipse of light, wider than tall, fading to nothing well before the edges (no rectangle anywhere)
        const rx = W * (this.study === 2 ? 0.62 : 0.72), ry = Math.max(80, (g.amp * 1.45 + 40) * (this.study === 2 ? 0.6 : 0.62));
        ctx.save(); ctx.translate(W / 2, mid); ctx.scale(1, ry / rx);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); rg.addColorStop(0, pool); rg.addColorStop(0.55, hexA(pool, 0.45)); rg.addColorStop(1, hexA(pool, 0));
        ctx.fillStyle = rg; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
      }
      // v12: the water. From the horizon down the ground is a little deeper and cooler, with a soft edge, so the sound
      // sits on a surface and its reflection is in the water (it reads in the light theme too, not only at night)
      // the water ends where the dock's glass begins (the glass is its own material over the plain ground)
      if (this.study === 1 && C['water-top']) {
        const y0 = g.mid - 6, y1 = Math.min(this.H, g.dockTop + 36), span = Math.max(1, y1 - y0), wg = ctx.createLinearGradient(0, y0, 0, y1);
        wg.addColorStop(0, hexA(C['water-top'], 0)); wg.addColorStop(Math.min(0.2, 30 / span), C['water-top']);
        wg.addColorStop(clamp((g.dockTop - 6 - y0) / span, 0.25, 0.98), C['water-bot']); wg.addColorStop(1, hexA(C['water-bot'], 0));
        ctx.fillStyle = wg; ctx.fillRect(0, y0, W, y1 - y0);
      }
      if (this.playing && !this.hand && C['ph-glow']) {
        const x = this.d2x(clamp(this.ph, 0, this.shownLen())), lg = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
        lg.addColorStop(0, hexA(C['ph-glow'], 0)); lg.addColorStop(0.5, C['ph-glow']); lg.addColorStop(1, hexA(C['ph-glow'], 0));
        ctx.fillStyle = lg; ctx.fillRect(x - 22, g.bandTop, 44, g.bandBot - g.bandTop);
      }
    }
    /**
     * The waveform. Study 1 (chosen): a horizon line for the audio's extent; above it bars that deepen toward the line
     * and lighten at their tips, below it a shorter, quieter echo; silence reads as a dotted horizon. Study 2: solid
     * thick bars. Study 3: a filled silhouette with an ink outline.
     */
    drawBars(ctx, cols, mid, amp, d2x, L, pitch) {
      const C = this.C, st = this.study, lw = (pitch || 3) <= 1 ? 0.9 : (pitch || 3) <= 2 ? 1.15 : 1.4;
      if (st === 1) {
        // the horizon: where the audio is, with a small gap at each seam and a dot at each end
        const x0 = d2x(0), x1 = d2x(L); ctx.strokeStyle = C.horizon; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.max(0, x0), mid + 0.5); ctx.lineTo(Math.min(this.W, x1), mid + 0.5); ctx.stroke();
        ctx.fillStyle = C['wave-deep']; [x0, x1].forEach(x => { if (x > -4 && x < this.W + 4) { ctx.beginPath(); ctx.arc(x, mid + 0.5, 2.2, 0, 7); ctx.fill(); } });
      }
      if (st === 3) {
        const top = [], bot = [];
        cols.forEach(([x, m, key]) => { const hi = Math.max(0.8, Math.min(1, m) * amp), lo = hi * (0.8 + 0.2 * hash01(key)); top.push([x, mid - hi]); bot.push([x, mid + lo]); });
        if (top.length) {
          ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath();
          const gf = ctx.createLinearGradient(0, mid - amp, 0, mid + amp); gf.addColorStop(0, hexA(C['wave-deep'], 0.55)); gf.addColorStop(0.5, hexA(C['wave-deep'], 0.9)); gf.addColorStop(1, hexA(C['wave-deep'], 0.55));
          ctx.fillStyle = gf; ctx.fill(); ctx.strokeStyle = C['wave-deep']; ctx.lineWidth = 1; ctx.stroke();
        }
        return;
      }
      const up = new Path2D(), dn = new Path2D(), dim = new Path2D(), hush = new Path2D(); let hasDim = false, k = 0;
      for (const [x, m, key, after, quiet] of cols) {
        k++;
        const hi = Math.max(st === 2 ? 1.2 : 0.9, Math.min(1, m) * amp);
        if (after) hasDim = true;
        if (st === 1 && quiet && !after) { hush.moveTo(x, mid - 1.2); hush.lineTo(x, mid - Math.max(1.6, hi)); continue; }
        if (st === 1) {
          const lo = Math.max(0.9, hi * 0.5);
          (after ? dim : up).moveTo(x, mid - 1.2); (after ? dim : up).lineTo(x, mid - hi);
          // the echo takes every other column: a lighter texture, like a reflection on water, each stroke still clear
          if (k % (pitch <= 1 ? 3 : 2) === 0) { (after ? dim : dn).moveTo(x, mid + 2.2); (after ? dim : dn).lineTo(x, mid + 1.2 + lo * 0.85); }
        } else {
          const lo = hi * (0.78 + 0.22 * hash01(key));
          (after ? dim : up).moveTo(x, mid - hi); (after ? dim : up).lineTo(x, mid + lo);
        }
      }
      ctx.lineCap = 'round';
      if (st === 1) {
        ctx.lineWidth = lw;
        const gu = ctx.createLinearGradient(0, mid - amp, 0, mid); gu.addColorStop(0, C['wave-tip']); gu.addColorStop(1, C['wave-deep']);
        ctx.strokeStyle = gu; ctx.stroke(up);
        // the echo: thinner and shorter, so it reads as the sound's reflection, not a second waveform
        const gd = ctx.createLinearGradient(0, mid, 0, mid + amp * 0.5); gd.addColorStop(0, C['wave-echo']); gd.addColorStop(1, C['wave-echo-tip']);
        ctx.lineWidth = lw; ctx.strokeStyle = gd; ctx.stroke(dn);
        // pauses: the room's floor only, in the pale water
        ctx.strokeStyle = C['wave-dim']; ctx.stroke(hush);
      } else { ctx.lineWidth = 2.3; ctx.strokeStyle = C['wave-deep'] || C.wave; ctx.stroke(up); }
      if (hasDim) { ctx.strokeStyle = C['wave-dim']; ctx.lineWidth = st === 1 ? lw : 2.3; ctx.stroke(dim); }
    }
    drawMark(ctx, m, d2x, y, h) {
      const C = this.C, a = d2x(m.a), b = d2x(m.b);
      if (b < 0 || a > this.W) return;
      const narrow = b - a < 6, cx = clamp((a + b) / 2, 6, this.W - 6);
      if ((m.t === 'del' || m.t === 'fo' || m.t === 'fi' || m.t === 'pause') && narrow) {
        // v12: a short stretch (a pause at the fitted zoom) is marked in its own gap: a pin above the sound, a line down
        // the gap to the horizon and a dot there, so the pale break it removes stays visible
        const on = m.t !== 'pause' || m.on, hy = this.geom().mid;
        ctx.fillStyle = on ? C.accent : hexA(C.accent, 0.55); ctx.beginPath(); ctx.moveTo(cx - 6, y - 1); ctx.lineTo(cx + 6, y - 1); ctx.lineTo(cx, y + 7); ctx.closePath(); ctx.fill();
        if (m.t === 'fo' || m.t === 'fi') return;
        ctx.fillStyle = hexA(C.accent, on ? 0.13 : 0.06); ctx.fillRect(a - 1, y + 7, Math.max(2, b - a + 2), hy - y - 7);
        ctx.strokeStyle = on ? hexA(C.accent, 0.8) : hexA(C.accent, 0.45); ctx.lineWidth = 1.2; if (!on) ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(cx, y + 8); ctx.lineTo(cx, hy - 3); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = on ? C.accent : C.bg; ctx.beginPath(); ctx.arc(cx, hy, 3, 0, 7); ctx.fill();
        if (!on) { ctx.strokeStyle = hexA(C.accent, 0.7); ctx.lineWidth = 1.2; ctx.stroke(); }
        return;
      }
      // a short stretch (under 14 dp) also gets the pin, so it is found at a glance
      if ((m.t === 'del' || m.t === 'fo' || m.t === 'fi') && b - a < 14) { ctx.fillStyle = C.accent; ctx.beginPath(); ctx.moveTo(cx - 6, y - 1); ctx.lineTo(cx + 6, y - 1); ctx.lineTo(cx, y + 7); ctx.closePath(); ctx.fill(); }
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
        ctx.fillStyle = hexA(C['wave-deep'], 0.10); ctx.beginPath();
        if (m.t === 'fo') { ctx.moveTo(a, y); ctx.lineTo(b, y + h); ctx.lineTo(b, y); } else { ctx.moveTo(a, y); ctx.lineTo(a, y + h); ctx.lineTo(b, y); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C['wave-deep']; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
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
        const mid = g.mid, amp = g.amp * 0.9;
        // the take as it comes in is the real take (the phone's recording of the host); speech being generated breathes
        const R = SRC.rec, off = ((recSeed + 1 - 301) * 230) / FPU;
        for (let x = a + 3; x < b - 2; x += 3) {
          const k = Math.floor((x - a) / 3);
          const lv = fill === 'tts' ? 0.12 + 0.08 * Math.sin(k * 0.5 + performance.now() / 120) : srcCol(R, off + (x - 1.5 - a) / ppu, off + (x + 1.5 - a) / ppu, true) * 0.9;
          ctx.beginPath(); ctx.moveTo(x, mid - lv * amp); ctx.lineTo(x, mid + lv * amp * 0.5); ctx.stroke();
        }
      } else if (fill === 'drop') {
        ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        roundRect(ctx, a + 2, mY + 2, Math.max(0, b - a - 4), mH - 4, 10); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = hexA(C.accent, 0.08); roundRect(ctx, a + 2, mY + 2, Math.max(0, b - a - 4), mH - 4, 10); ctx.fill();
      }
    }
    drawCard(ctx, g, docked) {
      const C = this.C, h = this.hand, f = flat(h.clipDoc), ppu = this.ppu();
      const w = Math.max(56, f.L * ppu), hh = Math.min((g.bandBot - g.bandTop) * 0.62, 120);
      let x = docked ? this.xOf(this.gapAt()) : h.fx - w / 2;
      const y = docked ? (g.bandTop + g.bandBot - hh) / 2 : clamp(h.fy - hh - 26, 2, g.blockY + g.blockH - hh);
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
      // the flag's place as last laid out (reading its width here would force a layout every frame)
      const fl = this._flagW && this._flagL !== undefined ? [this._flagL, this._flagL + this._flagW] : null;
      ctx.font = `500 ${11 * fs}px system-ui, -apple-system, Roboto, "Noto Sans", sans-serif`; ctx.fillStyle = C.faint; ctx.textBaseline = 'middle';
      const hasGap = !!this.gap, gat = this.gapAt(), gw = this.gapW();
      const d2x = u => G + (((hasGap && u >= gat) ? u + gw : u) - va) * ppu;
      const L = docLen(this.shownDoc());
      for (let s = 0; s * SR <= Math.max(L + 1, vb); s += st) {
        if (s * SR > L + 0.5 && s * SR > vb) break;
        const x = d2x(s * SR); if (x < -40 || x > this.W + 40) continue;
        ctx.fillRect(Math.round(x), g.rBot - 6, 1, 4);
        const lab = clk(s * SR), w = ctx.measureText(lab).width, lx = clamp(x + 5, 2, this.W - w - 2);
        if (lx < lastR + 8) continue;
        // a label the time flag would cut is left out (the flag says where we are)
        if (fl && lx < fl[1] + 6 && lx + w > fl[0] - 6) continue;
        ctx.fillText(lab, lx, g.rTop + g.ruler / 2 - 1); lastR = lx + w;
      }
      if (this.beats) { ctx.fillStyle = hexA(C.info, 0.8); for (let u = 0; u < L; u += 5) { const x = d2x(u); if (x >= 0 && x <= this.W) ctx.fillRect(Math.round(x), g.rBot - (u % 20 === 0 ? 8 : 5), 1.5, u % 20 === 0 ? 8 : 5); } }
    }
    drawMarkers(ctx, g, fs, d2x) {
      const C = this.C, d = this.shownDoc(), y = g.mainY + 4, h = Math.round(18 * fs);
      ctx.font = `700 ${11 * fs}px system-ui, sans-serif`; ctx.textBaseline = 'middle';
      (d.markers || []).forEach(m => {
        const pos = markerPos(d, m); if (pos === null) return;
        const x = d2x(pos); if (x < -80 || x > this.W) return;
        ctx.fillStyle = hexA(C.on, 0.45); ctx.fillRect(Math.round(x), y + h, 1.5, g.bandBot - y - h);
        const lab = m.name, w = ctx.measureText(lab).width + 12;
        ctx.fillStyle = C.on; roundRect(ctx, x, y, w, h, 9); ctx.fill();
        ctx.fillStyle = C.bg; ctx.fillText(lab, x + 6, y + h / 2 + 0.5);
      });
    }
    drawLane(ctx, ln, f, d2x, x2d) {
      // tracks are sound too, drawn like the main line (bars over a quieter reflection) but each kind in its own water
      // hue: music sky, voice-over teal, recordings indigo, effects slate; the main line stays the deepest blue
      const C = this.C, t = ln.t, kind = KIND[t.k] || KIND.music, col = C[kind.c] || C['wave-echo'], L = f.L;
      const S = SRC[t.src], at = t.at || 0, end = t.fill ? L : at + (t.e - t.s);
      const a = d2x(at), b = d2x(end), sel = this.track === t.id;
      ctx.fillStyle = hexA(col, t.mute ? 0.04 : sel ? 0.16 : 0.09); roundRect(ctx, a + 1, ln.y, Math.max(0, b - a - 2), ln.h, 9); ctx.fill();
      if (sel) { ctx.strokeStyle = col; ctx.lineWidth = 1.5; roundRect(ctx, a + 1, ln.y + 0.75, Math.max(0, b - a - 2), ln.h - 1.5, 9); ctx.stroke(); }
      const mid = ln.y + ln.h * 0.64, amp = ln.h * 0.64 - 9;
      ctx.lineCap = 'round'; ctx.lineWidth = 1.4;
      const up = new Path2D(), dn = new Path2D(), ghost = new Path2D(); let k2 = 0;
      const vline = [];
      const loopT = t.fill || t.loop !== false, hush = new Path2D(), speechT = S.kind === 'speech';
      for (let x = 1; x < this.W; x += 2) {
        const u = x2d(x); if (u === null || u < at || u >= end) continue;
        const ua = x2d(x - 1), ub = x2d(x + 1); if (ua === null || ub === null) continue;
        const i = Math.floor(u); k2++;
        // the track's own sound under this column, from its frames (a speech track's pauses in the pale water)
        const s0 = ua - at + (loopT ? (t.off || 0) : 0) + t.s, s1 = s0 + (ub - ua), q = [0], lvS = srcCol(S, loopT ? s0 : clamp(s0, 0, S.n), loopT ? s1 : clamp(s1, 0, S.n), loopT, q);
        if (speechT && q[0] < 0.3) { hush.moveTo(x, mid - 1); hush.lineTo(x, mid - Math.max(1.2, lvS * amp * 0.9)); continue; }
        let gn = t.gain;
        if (t.duck && i < L) gn *= lerp(1, t.duckTo, f.va[i] || 0);
        if (t.fi && i - at < t.fi) gn *= (i - at) / t.fi;
        if (t.fo && end - i < t.fo) gn *= (end - i) / t.fo;
        const full = Math.min(1, lvS * 1.08 * Math.min(1, t.gain / 0.6)), lv = full * gn / Math.max(0.01, t.gain);
        if (t.duck && full > lv + 0.02) { ghost.moveTo(x, mid - full * amp); ghost.lineTo(x, mid - lv * amp - 2); }
        up.moveTo(x, mid - 1); up.lineTo(x, mid - Math.max(0.8, lv * amp));
        if (k2 % 2 === 0) { dn.moveTo(x, mid + 2); dn.lineTo(x, mid + 1.5 + Math.max(0.6, lv * amp * 0.35)); }
        vline.push([x, gn]);
      }
      ctx.globalAlpha = t.mute ? 0.35 : 1; ctx.lineWidth = 1.2;
      // what the music is under the voice, lighter: it still reads as music while it is turned down
      ctx.strokeStyle = hexA(col, 0.5); ctx.stroke(ghost);
      ctx.strokeStyle = hexA(col, 0.3); ctx.stroke(hush);
      ctx.strokeStyle = col; ctx.stroke(up);
      ctx.strokeStyle = hexA(col, 0.6); ctx.stroke(dn);
      ctx.globalAlpha = 1;
      if (t.duck && vline.length) {
        ctx.strokeStyle = hexA(col, 0.75); ctx.lineWidth = 1; ctx.beginPath();
        vline.forEach(([x, gn], i) => { const y = ln.y + 5 + (1 - Math.min(1, gn / Math.max(0.01, t.gain))) * (ln.h * 0.55); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      }
    }
    placeLabels(g) {
      const html = g.lanes.filter(ln => ln.y >= g.laneTop - 2 && ln.y < (this.waterOn() ? g.waterTop - 22 : g.dockTop - 16)).map(ln => { const t = ln.t, kd = KIND[t.k] || KIND.music; const x = Math.max(G + 6, this.d2x(t.at || 0) + 6); return `<div class="tlabel ${this.track === t.id ? 'cur' : ''}" style="--c:var(--${kd.c});top:${ln.y + 3}px;left:${Math.min(x, this.W - 120)}px">${ic(t.mute ? 'VolumeOff' : t.solo ? 'Headphones' : kd.ic, 13)}<span>${esc(t.name)}</span></div>`; }).join('');
      if (html !== this._lblHtml) { this._lblHtml = html; this.labelsEl.innerHTML = html; }
    }
    drawEnv(ctx, env, d2x, y, h) {
      const C = this.C, yOf = db => y + 6 + (1 - (db + 24) / 36) * (h - 12);
      ctx.strokeStyle = hexA(C.on, 0.8); ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(d2x(0), yOf(env[0].db)); env.forEach(p => ctx.lineTo(d2x(p.u), yOf(p.db))); ctx.lineTo(d2x(docLen(this.shownDoc())), yOf(env[env.length - 1].db)); ctx.stroke();
      env.forEach(p => { ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(d2x(p.u), yOf(p.db), 8, 0, 7); ctx.fill(); ctx.fillStyle = C.on; ctx.beginPath(); ctx.arc(d2x(p.u), yOf(p.db), 5.5, 0, 7); ctx.fill(); });
    }
    drawSpec(ctx, g, f, x2d) {
      const C = this.C, y = g.bandTop, h = g.bandBot - g.bandTop, rows = 24, rh = h / rows;
      for (let x = 0; x < this.W; x += 3) {
        const u = x2d(x); if (u === null || u < 0 || u >= f.L) continue;
        const i = Math.floor(u), lv = f.cl[i] + f.nz[i];
        for (let r = 0; r < rows; r++) {
          const fr = r / rows, e = clamp(lv * (1.25 - fr * 1.1) + 0.12 * hash01(i * 31 + r) - 0.08, 0, 1);
          ctx.fillStyle = hexA(e > 0.55 ? C['wave-deep'] : C['wave-tip'], 0.08 + e * 0.85);
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
    /** With a setting open on a selection or on a track, play auditions that stretch, looping (it never starts by itself). */
    target() {
      if (this.task || !SLOT_VIEWS.has(this.top.t)) return null;
      if (this.sel) return this.sel.slice();
      const tr = this.trk(); if (tr && !tr.fill) { const a = tr.at || 0; return [a, Math.min(this.L, a + (tr.e - tr.s))]; }
      return null;
    }
    play() {
      if (this.rec && this.rec.running) { this.rec.running = false; this.renderArea(); }
      if (this.playing) { this.stopPlay(); return; }
      const L = this.L, tg = this.target();
      this.loopT = !!tg;
      if (tg) { this.range = tg; if (this.ph < tg[0] || this.ph >= tg[1] - 1) this.ph = tg[0]; }
      else if (this.sel && !this.task) { this.range = this.sel.slice(); if (this.ph < this.sel[0] || this.ph >= this.sel[1] - 1) this.ph = this.sel[0]; }
      else { this.range = [0, this.shownLen()]; if (this.ph >= L - 1) this.ph = 0; }
      this.playing = true; this._follow = true; this.renderTop(); this.kick();
    }
    stopPlay() { if (!this.playing) return; this.playing = false; this.renderTop(); }
    tickPlay(dt) {
      this.ph += dt * SR * this.speed;
      if (this.ph >= this.range[1]) { if (this.loop || this.loopT) this.ph = this.range[0]; else { this.ph = this.range[1]; this.playing = false; this.renderTop(); } }
      const span = this.view.b.t - this.view.a.t;
      // v12.2: the view pages after the playhead (when it reaches the last twentieth of the view) unless a finger is on
      // the canvas or a fling runs; after a swipe it follows again once the playhead is back in view
      if (this._follow === false && this.ph >= this.view.a.t && this.ph <= this.view.b.t - span * 0.05) this._follow = true;
      if (this._follow !== false && !this._touching && !this.fling && this.ph > this.view.b.t - span * 0.05 && this.zoomed()) { const s = Math.min(this.ph - span * 0.1, docLen(this.shownDoc()) - span); this.view.a.snap(s); this.view.b.snap(s + span); }
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
    modal(html) { this.sheet = null; this.mhost.innerHTML = `<div class="scrim" data-a="modalClose"></div><div class="modal">${html}</div>`; }
    closeModal() { this.mhost.innerHTML = ''; this.sheet = null; }

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
      // a setting goes on at a common value (volume starts at zero: off until it is moved)
      const init = { dn: 2, ld: 0, vol: 0, rp: new Set([0, 1, 3]), fx: new Set([3]), vc: 2, sp: 1.25, ch: 1, sep: 0 }[k];
      const layer = { id: 'l' + (++uid), k, v: init instanceof Set ? new Set(init) : typeof init === 'object' ? Object.assign({}, init) : init, on: k !== 'vol' };
      if (this.sel && SELCTX.has(this.top.ctx)) { layer.a = this.sel[0]; layer.b = this.sel[1]; }
      const v = { t: 'p', k, id: layer.id, orig: null };
      this.push(v);
      this.liveSet(Object.assign({}, this.doc, { layers: this.doc.layers.concat([layer]) }), this.layerLabel(layer, null), v);
      this.startProc(layer.id, 0);
      this.renderArea();
    }
    layerLabel(l, orig) {
      const m = LAYER[l.k];
      if (l.on === false) return m.zh + '：关';
      const val = m.val ? m.val(l.v) : '';
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
      if (/副歌|chorus/i.test(text)) { this.plan = null; this.planMarks = null; this.stack = [this.rootView()]; this.findChorus(); this.markTool = 'chorus'; this.renderArea(); return; }
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
      const clip = this.doc.layers.some(l => l.k === 'vol' && l.on !== false && l.v > 3);
      // the purpose: the sentence's, else this audio's last; format and quality: the sentence's, else the last used for it
      const purpose = pre && pre.purpose === 'ring' ? 'ring' : (this.lastPurpose || 'file'), last = this.lastFmt(purpose);
      this.exp = { stage: 'set', purpose, fmt: (pre && pre.fmt) || last.fmt, q: last.q, fmtSet: !!(pre && pre.fmt), name: this.doc.name, scope: this.sel ? 'sel' : 'all', ring: 'call', limit: clip };
      this.stack = [this.rootView(), { t: 'export' }]; this.markTool = 'export'; this.renderArea();
    }
    /** What was used last for each purpose (LastUsed); a first export: MP3 192k to keep, M4A 128k to send, MP3 for a ring. */
    lastFmt(purpose) { const m = this.lastUsed || (this.lastUsed = { file: { fmt: 'MP3', q: 192 }, share: { fmt: 'M4A', q: 128 }, ring: { fmt: 'MP3', q: 192 } }); return m[purpose]; }
    expGo() {
      const e = this.exp; e.stage = 'run'; e.p = 0; this.lastPurpose = e.purpose === 'ring' ? this.lastPurpose : e.purpose; this.lastFmt(e.purpose); this.lastUsed[e.purpose] = { fmt: e.fmt, q: e.q }; this.renderArea();
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
      // the dock moved (the keyboard's panel slid up or down): lay the main line out for where it ended
      this.botEl.addEventListener('transitionend', e => { if (e.target === this.botEl && this.measure()) this.kick(); });
      this.botEl.addEventListener('pointerdown', e => { this._dockDown = true; if (e.target.closest('.say-ex')) e.preventDefault(); });
      const up0 = () => { this._dockDown = false; }; window.addEventListener('pointerup', up0); window.addEventListener('pointercancel', up0);
      // typing (the sentence, the text to read, a marker's name): the keyboard comes up and the dock rides on it
      scr.addEventListener('focusin', e => {
        const t = e.target; if (!t.closest || !this.botEl.contains(t)) return;
        if (t.closest('.sayin') || t.matches('textarea.tbox, input[data-in=mname]')) { this._ttsFocus = t.matches('textarea.tbox'); this.setTyping(true); }
      });
      // the keyboard goes when the audio is touched: the sentence (nothing typed yet that matters) closes with it;
      // the text to read and a name stay in their task, only the keyboard goes
      this.stageEl.addEventListener('pointerdown', e => {
        if (!this.typing || e.target.closest('.bot')) return;
        const t = this.botEl.querySelector('.sayin textarea, textarea.tbox, input[data-in=mname]'); if (t) t.blur();
        this._ttsFocus = false; this.setTyping(false);
        if (this.top.t === 'say') this.back(true); else this.renderArea();
      });
      scr.addEventListener('input', e => {
        if (e.target.dataset.in === 'tts') { const st = this.top.s || (this.top.s = {}); st.text = e.target.value; this.growBox(e.target); }
        if (e.target.tagName === 'TEXTAREA' && this.top.t === 'say') { this.top.text = e.target.value; const s = this.botEl.querySelector('.send'), m = this.botEl.querySelector('.sayin .mic'), has = !!e.target.value.trim(); if (s) s.classList.toggle('on', has); if (m) m.classList.toggle('on', !has); }
        if (e.target.dataset.in === 'name') { const n = e.target.value.trim(); if (n) { this.liveSet(Object.assign({}, this.doc, { name: n }), '改名「' + n + '」', 'rename'); } }
        if (e.target.dataset.in === 'mname') this.top.name = e.target.value;
      });
      scr.addEventListener('keydown', e => { if (e.target.tagName === 'TEXTAREA' && this.top.t === 'say' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.onAct('send'); } });
      // hold "original": the sound without its settings (without the open one, when one is open)
      scr.addEventListener('pointerdown', e => { const h = e.target.closest('[data-hold]'); if (!h || h.classList.contains('off')) return; this.compareHold = true; h.classList.add('on'); this.renderChips(); this.kick(); });
      const up = () => { if (!this.compareHold) return; this.compareHold = false; const h = scr.querySelector('[data-hold]'); if (h) h.classList.remove('on'); this.renderChips(); this.kick(); };
      scr.addEventListener('pointerup', up); scr.addEventListener('pointercancel', up); scr.addEventListener('pointerleave', up);
      // Holding undo: the history, as a task (browse the steps on the audio, then go back to one, or cancel).
      let holdT = 0;
      this.undoEl.addEventListener('pointerdown', () => { if (this.task) return; holdT = setTimeout(() => { holdT = -1; this.leaveView(); this.histPrev = this.hi; this.stack = [this.rootView(), { t: 'history' }]; this.markTool = 'history'; this.renderArea(); }, 500); });
      this.undoEl.addEventListener('pointerup', () => { if (holdT > 0) clearTimeout(holdT); });
      this.undoEl.addEventListener('click', e => { if (holdT === -1) { e.stopImmediatePropagation(); holdT = 0; } }, true);
      this.bindEdges();
      this.bindCanvas();
      window.addEventListener('keydown', e => {
        if (!this.isActive()) return;
        // Esc is the system Back, also while typing (the keyboard goes with it)
        if (e.key === 'Escape') { e.preventDefault(); const a = document.activeElement; if (a && this.scr.contains(a) && /INPUT|TEXTAREA/.test(a.tagName)) { a.blur(); this._ttsFocus = false; this.setTyping(false); } this.systemBack(); return; }
        if (/INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
        if (false) { /* */ }
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
    /** The slot's controls take a drag along their track (or a tap on it); nothing is rebuilt under the finger. */
    bindSliders() {
      if (!this.live) return;
      this.botEl.querySelectorAll('.sl').forEach(sl => {
        const st = sl.querySelector('.st'), key = sl.dataset.sl; if (!st || st._bound) return; st._bound = true;
        const pos = e => { const r = st.getBoundingClientRect(), pad = 13; return clamp((e.clientX - r.left - pad) / Math.max(1, r.width - 2 * pad), 0, 1); };
        const setP = (sel, p) => sl.querySelectorAll(sel).forEach(x => x.style.setProperty('--p', p));
        let knob = null;
        const set = e => {
          const p = pos(e);
          if (key === 'fade2') {
            const kind = sl.dataset.kind, k1 = sl.querySelector('.k1'), k2 = sl.querySelector('.k2');
            const a = parseFloat(k1.style.getPropertyValue('--p')) || 0, b = parseFloat(k2.style.getPropertyValue('--p')) || 1;
            if (!knob) knob = Math.abs(p - a) <= Math.abs(p - b) && p < 0.5 + 1e-6 ? 'k1' : 'k2';
            if (knob === 'k1') { const q = Math.min(p, 0.5), v = Math.round(q / 0.5 * 100) / 10; const lab = this.onSlide(kind === 'e' ? 'efi' : 'tfi', v); setP('.k1, .fw.in', v / 10 * 0.5); sl.querySelector('.sv.l span').textContent = lab; }
            else { const q = Math.min(1 - p, 0.5), v = Math.round(q / 0.5 * 100) / 10; const lab = this.onSlide(kind === 'e' ? 'efo' : 'tfo', v); setP('.k2, .fw.out', 1 - v / 10 * 0.5); sl.querySelector('.sv.r span').textContent = lab; }
          } else if (sl.dataset.n) {
            const n = +sl.dataset.n, i = Math.round(p * (n - 1));
            if (i === sl._i) return; sl._i = i;
            const lab = this.onStop(key, i), q = n === 1 ? 0.5 : i / (n - 1);
            setP('.sl-fill, .sk', q); sl.querySelectorAll('.sd').forEach((d, j) => d.classList.toggle('on', j <= i));
            const sv = sl.querySelector('.sv') || this.panelEl.querySelector('.chead .cv'); if (lab !== undefined && sv) sv.textContent = lab;
          } else {
            const min = +sl.dataset.min, max = +sl.dataset.max;
            let v = min + p * (max - min); v = (max - min) > 30 ? Math.round(v) : Math.round(v * 10) / 10;
            const z = sl.dataset.zero !== undefined ? +sl.dataset.zero : null;
            if (z !== null && Math.abs(v - z) <= (max - min) * 0.03) v = z;
            const lab = this.onSlide(key, v), q = (v - min) / (max - min), zq = z !== null ? (z - min) / (max - min) : 0;
            setP('.sk', q); const f = sl.querySelector('.sl-fill'); f.style.setProperty('--a', z !== null ? Math.min(zq, q) : 0); f.style.setProperty('--p', z !== null ? Math.max(zq, q) : q);
            const sv = sl.querySelector('.sv') || this.panelEl.querySelector('.chead .cv'); if (lab !== undefined && sv) sv.textContent = lab;
          }
          this.renderChips(); this.kick();
        };
        st.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; e.preventDefault(); try { st.setPointerCapture(e.pointerId); } catch (x) { /* synthetic */ } st._on = true; st.classList.add('drag'); knob = null; sl._i = sl._i === undefined ? +(sl.dataset.i || -1) : sl._i; set(e); });
        st.addEventListener('pointermove', e => { if (st._on) set(e); });
        const up = () => { if (!st._on) return; st._on = false; st.classList.remove('drag'); knob = null; this.renderTop(); this.renderTools(); };
        st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
      });
    }
    /** A stop chosen on a stepped control. Returns its label. */
    onStop(key, i) {
      const en = this.lang === 'en';
      switch (key) {
        case 'dn': this.layerSetQuiet(l => { if (i === 0) l.on = false; else { l.on = true; l.v = i - 1; } }); return i === 0 ? this.t('关', 'Off') : (en ? DN_EN : DN)[i - 1];
        case 'sp': this.layerSetQuiet(l => { l.v = SPEEDS[i]; l.on = SPEEDS[i] !== 1; }); this.renderTime(); return SPEEDS[i] + '×';
        case 'pspd': this.speed = SPEEDS[i]; this.renderTime(); return SPEEDS[i] + '×';
      }
    }
    onSlide(key, v) {
      const top = this.top, OFF = this.t('关', 'Off');
      const lay = fn => this.layerSetQuiet(fn);
      switch (key) {
        case 'vol': lay(l => { l.v = Math.round(v); l.on = Math.round(v) !== 0; }); return Math.round(v) === 0 ? OFF : this.dbs(Math.round(v));
        case 'rvol': { top.db = Math.round(v); const [a, b] = this.sel, f = Math.pow(10, top.db / 20); this.liveSet(rangeSet(top.base, a, b, p => Object.assign(p, { g: (p.g || 1) * f })), '选中的音量 ' + this.dbs(top.db), top); return top.db === 0 ? this.t('原样', 'As is') : this.dbs(top.db); }
        case 'efi': case 'efo': { top.f[key === 'efi' ? 'fi' : 'fo'] = v; this.liveSet(endFades(top.base, top.f.fi, top.f.fo), '开头淡入 ' + top.f.fi.toFixed(1) + ' 秒 · 结尾淡出 ' + top.f.fo.toFixed(1) + ' 秒', top); return this.secs(v); }
        case 'tvol': this.trackSet({ gain: v / 100 }, '音乐音量'); return Math.round(v) + '%';
        case 'duck': this.trackSet({ duck: v > 0, duckTo: v > 0 ? 1 - v / 100 : this.trk().duckTo }, '自动调小'); return v === 0 ? OFF : this.t('降到 ', 'to ') + (100 - Math.round(v)) + '%';
        case 'tfi': this.trackSet({ fi: sec(v) }, '音乐淡化'); return this.secs(v);
        case 'tfo': this.trackSet({ fo: sec(v) }, '音乐淡化'); return this.secs(v);
        case 'toff': this.trackSet({ off: sec(v) }, '音乐起点'); return this.secs(v);
        case 'rgain': this.recSet = Object.assign(this.recSet || {}, { gain: Math.round(v) }); return this.dbs(Math.round(v));
        case 'chw': lay(l => { l.w = Math.round(v); }); return Math.round(v) + '%';
        case 'sepS': lay(l => { l.s = Math.round(v); }); return Math.round(v) + '%';
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
        case 'leave': if (this.task) { this.nudgeDecision(); return; } this.toast(this.t('回到音频库', 'To the library')); return;
        case 'back': this.back(true); return;
        // a live setting's one way out: it only closes (the setting already applies)
        case 'done': this.back(true); return;
        // the name opens this audio's sheet (name, details, credits, copy, package, delete); a task first wants its decision
        case 'title': if (this.task) { this.nudgeDecision(); return; } this.closeCtrl(); this.openSheet('info'); return;
        case 'time':
          if (this.task) { this.nudgeDecision(); return; }
          if (this.sel && !this.hand) { if (this.markTool === 'exact') { this.back(true); return; } this.closeCtrl(); this.push({ t: 'exact' }); this.markTool = 'exact'; this.renderArea(); return; }
          this.closeCtrl(); this.cat = 'more'; this.renderArea(); return;
        case 'export': if (this.task) { this.nudgeDecision(); return; } this.closeCtrl(); this.openExport(); return;
        case 'cat': {
          this.closeCtrl();
          if (k !== 'ctx' && (this.track || this.marker)) { this.track = null; this.marker = null; this.stack = [this.rootView()]; this._ctx = this.stack[0].ctx; }
          this.cat = k; this.renderArea(); return;
        }
        case 'play': this.play(); return;
        case 'undo': this.undo(); return;
        case 'redo': this.redo(); return;
        case 'tool': {
          // Tapping the lit tool again closes its setting (the value stays); another tool takes the slot over at once.
          if (k === this.markTool && this.stack.length > 1 && !this.task) { this.back(true); return; }
          this.closeCtrl();
          this.onTool(k, el);
          if (this.stack.length > 1 && !this.markTool) { this.markTool = k; this.renderArea(); }
          return;
        }
        case 'chip': {
          if (this.task) { this.nudgeDecision(); return; }
          const l = this.doc.layers.find(x => x.id === el.dataset.id); if (!l) return;
          if (top.t === 'p' && top.id === l.id) { this.back(true); return; }
          this.closeCtrl(); this.sel = null; this.track = null; this.marker = null; this.stack = [this.rootView()]; this._ctx = 'rest';
          if (!this.toolList().includes(l.k)) this.cat = CTX_TOOLS.rest.includes(l.k) ? 'ctx' : 'sound';
          this.openLayer(l.k, l); this.markTool = l.k; this.renderArea(); return;
        }
        case 'seg': return this.onSeg(k, el.dataset.v, el);
        case 'sw': return this.onSwitch(k);
        case 'rpt': { const i = +el.dataset.i; this.layerSet(l => { l.v.has(i) ? l.v.delete(i) : l.v.add(i); l.on = l.v.size > 0; }); return; }
        // an effect chip steps through light, medium, strong and off
        case 'fxt': { const i = +el.dataset.i; this.layerSet(l => { l.lv = Object.assign({}, l.lv || {}); const n = l.v.has(i) ? (l.lv[i] || 2) : 0; if (n >= 3) { l.v.delete(i); delete l.lv[i]; } else { l.v.add(i); l.lv[i] = n + 1; } l.on = l.v.size > 0; }); return; }
        case 'vct': { const i = +el.dataset.i; this.layerSet(l => { if (i < 0) l.on = false; else { l.v = i; l.on = true; } }); return; }
        case 'hprev': this.histPrev = +el.dataset.i; this.renderArea(); this.kick(); return;
        case 'histGo': { const i = this.histPrev; this.histPrev = null; this.stack = [this.rootView()]; this.markTool = null; if (i !== null && i !== undefined) this.jump(i); else this.renderArea(); return; }
        case 'mnameOk': { const m = (this.doc.markers || []).find(x => x.id === this.marker), n = (top.name || '').trim(); if (m && n && n !== m.name) this.commit(Object.assign({}, this.doc, { markers: this.doc.markers.map(x => x === m ? Object.assign({}, x, { name: n }) : x) }), '标记改名「' + n + '」', true); const t = this.botEl.querySelector('input'); if (t) t.blur(); this.setTyping(false); this.stack = [this.rootView()]; this.renderArea(); this.kick(); return; }
        case 'xmore': this.exp.open = !this.exp.open; this.exp.sub = null; this.renderArea(); requestAnimationFrame(() => { const b = this.panelEl.querySelector('.pbody'); if (b && this.exp.open) b.scrollTop = b.scrollHeight; }); return;
        case 'psrcFile': this.closeModal(); this.pickFile(() => this.addTrack({ src: 'music3', name: '夏日午后.mp3', lane: 1 })); return;
        case 'saveas': case 'pkg': case 'delaudio': this.closeModal(); this.onTool(a); return;
        case 'rmlayer': return this.layerRemove();
        case 'handOk': return this.handDrop();
        case 'handTo': this.handTarget(el.dataset.to === 'end' ? docLen(this.hand.rest) : 0); return;
        case 'sayAll': this.sel = null; this.renderArea(); this.kick(); return;
        case 'sugg': {
          this.closeCtrl(); this.stopPlay();
          const x = el.dataset.x === '人声清理' ? '降噪，统一音量，删掉超过1秒的停顿' : el.dataset.x;
          this.startPlan(x); this.markTool = 'say'; this.renderCats(); return;
        }
        case 'ex': {
          if (top.t === 'plan') { this.plan = null; this.planMarks = null; }
          if (this.typing) { const t = this.botEl.querySelector('textarea'); if (t) t.blur(); this.setTyping(false); }
          const x = el.dataset.x === '人声清理' ? '降噪，统一音量，删掉超过1秒的停顿' : el.dataset.x;
          this.startPlan(x); return;
        }
        case 'send': { const tx = this.botEl.querySelector('.sayin textarea'); const v = tx ? tx.value.trim() : ''; if (v) { tx.blur(); this.setTyping(false); this.startPlan(v); } else if (tx) { tx.focus(); tx.classList.remove('nudge'); void tx.offsetWidth; tx.classList.add('nudge'); } return; }
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
        case 'xf': this.exp.fmt = el.dataset.f; this.exp.fmtSet = true; this.renderArea(); return;
        case 'xsub': this.exp.sub = this.exp.sub === el.dataset.s ? null : el.dataset.s; this.renderArea(); requestAnimationFrame(() => { const b = this.panelEl.querySelector('.pbody'); if (b) b.scrollTop = b.scrollHeight; }); return;
        case 'xsplit': this.exp.split = !this.exp.split; this.renderArea(); return;
        case 'xname': this.toast(this.t('键盘输入文件名', 'Type a name')); return;
        case 'preset': this.exp.fmt = el.dataset.f; this.exp.q = +el.dataset.q || 192; this.exp.fmtSet = true; this.exp.sub = null; this.renderArea(); return;
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
        case 'pickLib': case 'pickOnline': {
          const it = (a === 'pickOnline' ? ONLINE : LIBMUSIC)[+el.dataset.i], mode = this.sheet && this.sheet.mode; this.closeModal();
          if (mode === 'swap' && this.trk()) { const tr = this.trk(); this.commit(Object.assign({}, this.doc, { tracks: this.doc.tracks.map(t => t.id === tr.id ? Object.assign({}, t, { src: it.src, name: it.name, credit: a === 'pickOnline' ? it.meta : undefined }) : t) }), '换成「' + it.name + '」', true); this.renderArea(); this.kick(); return; }
          this.addTrack(Object.assign({ src: it.src, name: it.name, lane: 1 }, a === 'pickOnline' ? { credit: it.meta } : {})); return;
        }
        case 'pickAudio': { const it = LIBAUDIO[+el.dataset.i]; this.closeModal(); this.placeAudio(it.src, it.name); return; }
        case 'pill': if (this.sheet) { this.sheet.pill = +el.dataset.i; this.renderSheet(); } return;
        case 'pv': e.stopPropagation(); el.classList.toggle('on'); el.innerHTML = ic(el.classList.contains('on') ? 'Pause' : 'PlayArrow', 20); return;
        case 'recOk': return this.recFinish();
        case 'recSet': top.settings = !top.settings; this.renderArea(); return;
        case 'recGo': return this.recToggle();
        case 'ttsVoices': top.s = top.s || {}; top.s.voices = !top.s.voices; this.renderArea(); return;
        case 'voice': top.s.voice = +el.dataset.i; this.renderArea(); return;
        case 'ttsGo': { const tx = this.areaEl.querySelector('textarea.tbox'); if (tx && !tx.value.trim()) { tx.focus(); this.toast(this.t('先写要读的文字', 'Write the text first')); return; } return this.ttsGo(); }
        case 'subFile': top.s = { lines: true }; this.renderArea(); return;
        case 'subGo': return this.subGo();
        case 'cloneRec': { const s = top.s || (top.s = {}); s.rec = s.rec === 'on' ? 'done' : 'on'; this.renderArea(); if (s.rec === 'on') setTimeout(() => { if (top.s.rec === 'on') { top.s.rec = 'done'; this.renderArea(); } }, 1600); return; }
        case 'cloneOk': { const st = top.s || {}; if (st.rec !== 'done') { this.toast(this.t('先读一遍上面这句，3 到 6 秒', 'First read the sentence aloud, 3 to 6 s')); return; } if (!st.ok) { this.toast(this.t('先勾选同意', 'Tick the consent first')); return; } this.toast(this.t('音色已保存', 'Voice saved')); this.back(true); return; }
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
    onSeg(k, v, el) {
      const top = this.top;
      // choices inside a sheet re-render the sheet only
      if (el && el.closest && el.closest('.sheet')) {
        if (k === 'psrc') { if (v === 'file') { this.closeModal(); this.pickFile(() => this.addTrack({ src: 'music3', name: '夏日午后.mp3', lane: 1 })); return; } this.sheet.src = v; }
        if (k === 'where') this.where = v;
        this.renderSheet(); return;
      }
      switch (k) {
        case 'ld': this.layerSet(l => { if (+v < 0) l.on = false; else { l.v = +v; l.on = true; } }); return;
        case 'rps': this.layerSet(l => { l.s = +v; }); return;
        case 'chm': this.layerSet(l => { l.v = +v; l.on = +v > 0; }); return;
        case 'sep': this.layerSet(l => { if (+v < 0) l.on = false; else { l.v = +v; l.on = true; } }); return;
        case 'fdir': case 'fshape': {
          top.f = Object.assign(top.f, k === 'fdir' ? { dir: v } : { shape: +v });
          const [a, b] = this.sel;
          this.liveSet(rangeSet(splitAt(splitAt(top.base, a), b), a, b, p => Object.assign(p, top.f.dir === 'in' ? { fi: plen(p), fo: 0 } : { fo: plen(p), fi: 0 })), (top.f.dir === 'in' ? '淡入 ' : '淡出 ') + cmp(a) + '–' + cmp(b), top);
          break;
        }
        case 'after': this.plan.after = v === '1'; this.refreshPlan(); break;
        case 'xp': { const e = this.exp; e.purpose = v; if (!e.fmtSet) { const l = this.lastFmt(v); e.fmt = l.fmt; e.q = l.q; } break; }
        case 'xs': this.exp.scope = v; break;
        case 'xr': this.exp.ring = v; break;
        case 'xq': this.exp.q = +v; this.exp.fmtSet = true; break;
        case 'xd': this.exp.depth = +v; break;
        case 'xrate': this.exp.rate = +v; break;
        case 'xch': this.exp.ch = +v; break;
        case 'where': this.where = v; break;
        case 'rwhere': this.rwhere = v; break;
        case 'siln': { top.n = +v; const n = sec(top.n), at = clamp(Math.round(this.ph), 0, docLen(top.base)); this.liveSet(withP(top.base, insP(top.base.pieces, at, [{ src: 'sil', s: 0, e: n }])), '插入 ' + dur(n) + ' 空白', top); this.fitIfWhole(docLen(top.base)); break; }
        case 'dm': top.m = v; top.n = v === 'every' ? 30 : 4; top.v = true; this.divideLive(top); return;
        case 'seam': { const s = +v; if (s !== (this.doc.seam || 0)) this.liveSet(Object.assign({}, this.doc, { seam: s }), '接缝交叉淡化 ' + s + ' ms', top); break; }
        case 'lt': top.v = +v; this.liveSet(top.v ? loopDoc(top.base, sec(top.v)) : top.base, top.v ? '循环到 ' + dur(sec(top.v)) : '循环到：原长', top); this.view.a.to(0); this.view.b.to(this.L); break;
        case 'cand': top.i = +v; this.pickCand(); break;
        case 'clen': top.len = +v; this.pickCand(); break;
        case 'pmin': top.min = +v; this.findPauses(+v); break;
        case 'vsrc': top.s.src = +v; break;
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
        case 'say': { this.stopPlay(); this.firstRun = false; this.push({ t: 'say', text: '' }); const t = this.botEl.querySelector('.sayin textarea'); if (t) t.focus(); this.setTyping(true); return; }
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
        // choosing from a list needs previews, not the waveform: an honest sheet
        case 'music': case 'mlib': this.openSheet('pick', { mode: 'music', src: 'lib' }); return;
        case 'mfile': this.pickFile(() => this.addTrack({ src: 'music3', name: '夏日午后.mp3', lane: 1 })); return;
        case 'monline': this.openSheet('pick', { mode: 'music', src: 'online' }); return;
        case 'audio': this.openSheet('pick', { mode: 'audio', src: 'lib' }); return;
        case 'file': this.pickFile(() => this.placeAudio('clipC', '补录.m4a')); return;
        case 'video': this.pickFile(() => this.placeAudio('clipB', '现场视频.mp4')); return;
        case 'tts': this.push({ t: 'tts', s: { text: '欢迎收听本期节目。' } }); return;
        case 'sub': this.push({ t: 'sub', s: {} }); return;
        case 'sil': this.push({ t: 'sil', base: this.doc, n: null }); return;
        case 'clone': this.push({ t: 'clone', s: {} }); return;
        case 'paste': if (!this.clipboard) { this.toast(this.t('先选一段，点「复制」', 'Select a stretch and tap Copy first')); return; } { const len = docLen({ pieces: this.clipboard.pieces }); const at = clamp(Math.round(this.ph), 0, this.L); this.hand = { a: at, b: at, len, clipDoc: withP(this.doc, this.clipboard.pieces), rest: this.doc, at, from: -1, mode: 'tap', copy: true }; this.gap = { at: new Spring(at, P.lead, 0.05), w: new Spring(0, P.gap, 0.05).to(len), fill: 'drop' }; this.push({ t: 'hand' }); this.kick(); return; }
        case 'tvol': case 'duck': case 'tfade': case 'tstart': this.push({ t: k }); return;
        case 'swap': this.openSheet('pick', { mode: 'swap', src: 'lib' }); return;
        case 'mute': case 'solo': { const tr = this.trk(); this.commit(Object.assign({}, this.doc, { tracks: this.doc.tracks.map(t => t.id === tr.id ? Object.assign({}, t, { [k]: !t[k] }) : t) }), (tr[k] ? '取消' : '') + (k === 'mute' ? '静音' : '独听') + ' ' + tr.name, true); this.renderArea(); this.kick(); return; }
        case 'tdel': { const tr = this.trk(); this.commit(Object.assign({}, this.doc, { tracks: this.doc.tracks.filter(t => t.id !== tr.id) }), '删除 ' + tr.name); this.track = null; this.resetStack(); this.kick(); return; }
        case 'rename': case 'details': this.openSheet('info'); if (k === 'rename') setTimeout(() => { const i = this.mhost.querySelector('input'); if (i) { i.focus(); i.select(); } }, 60); return;
        case 'history': this.histPrev = this.hi; this.push({ t: 'history' }); return;
        case 'saveas': this.toast(this.t('已另存为「', 'Saved as “') + this.doc.name + this.t(' 副本」', ' copy”')); return;
        case 'stt': this.push({ t: 'stt' }); return;
        case 'pkg': this.modal(`<div class="handle"></div><div class="sys">系统 · 选择保存位置</div><h4>${esc(this.doc.name)}.zip</h4><div class="folder on">${ic('Folder', 22)}<span>下载</span></div><button class="btn pri" data-a="modalClose">保存</button>`); return;
        case 'delaudio': this.modal(`<h4 style="margin-top:6px">删除「${esc(this.doc.name)}」？</h4><p style="margin:0;color:var(--dim);font-size:var(--t14)">删除后无法恢复，已经导出的文件不受影响。</p><div class="vrow"><button class="btn sec" data-a="modalClose">取消</button><button class="btn pri" style="background:var(--error)" data-a="confirmDel">删除</button></div>`); return;
        case 'goto': this.push({ t: 'goto' }); return;
        case 'speed': this.push({ t: 'speed' }); return;
        case 'loop': this.loop = !this.loop; this.renderArea(); this.renderTime(); return;
        case 'spec': this.spec = !this.spec; this.renderArea(); this.kick(); return;
        case 'fit': if (!this.zoomed()) { this.toast(this.t('已经是整段', 'Already showing it all')); return; } this.view.a.to(0); this.view.b.to(this.dispLen()); this.kick(); return;
        case 'mrename': { const m = (this.doc.markers || []).find(x => x.id === this.marker); this.push({ t: 'mname', name: m ? m.name : '' }); this.markTool = 'mrename'; const i = this.botEl.querySelector('input[data-in=mname]'); if (i) { i.focus(); i.select(); } this.setTyping(true); return; }
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
      const lv = this.takeLevels(r.len); this.areaEl.querySelectorAll('.meter i').forEach((el, i) => { el.style.height = lv[i].toFixed(0) + '%'; });
      if (!this.areaEl.querySelector('[data-a=recOk]') && r.len > 0) this.renderArea();
      this.renderTime();
    }
    /** The meter: the take's own level over its last 2.4 s, in tenths (the take as it comes in). */
    takeLevels(len) { const R = SRC.rec, off = ((recSeed + 1 - 301) * 230) / FPU; return Array.from({ length: 24 }, (_, i) => { const u = len - (23 - i); return u < 0 ? 6 : 6 + 94 * srcCol(R, off + u, off + u + 1, true); }); }
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
      if (this.typing) { const t = this.botEl.querySelector('textarea'); if (t) t.blur(); this._ttsFocus = false; this.setTyping(false); }
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
      }, 90);
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
        if (g.ovH && p.y >= g.ovY - 6 && p.y < g.ovY + g.ovH + 6) return { z: 'ov' };
        if (p.y >= g.rTop - 12 && p.y < g.rBot) return { z: 'ruler' };
        // the air above the ruler is the main line's, as the sky above the sound was in v12 (tap: playhead; drag: select)
        if (p.y < g.rTop - 12) return { z: 'main' };
        if (p.y >= g.mainY && p.y < g.mainY + g.mainH + 8) return { z: 'main' };
        for (const ln of g.lanes) if (p.y >= ln.y && p.y < ln.y + ln.h) return { z: 'lane', t: ln.t };
        return { z: 'none' };
      };
      /** Snaps to the ends, seams, markers, the playhead (and beats); a finger beyond an end means that end. */
      const snapU = (u, x, pz) => {
        const d = this.shownDoc(), L = docLen(d), tol = 10 / this.ppu(), endTol = 18 / this.ppu();
        if (x !== undefined && x <= this.xOf(0) + 2) return 0;
        if (x !== undefined && x >= this.xOf(L) - 2) return L;
        if (Math.abs(u) < endTol) return 0;
        if (Math.abs(u - L) < endTol) return L;
        const c = [this.ph].concat(seamsOf(d.pieces), (d.markers || []).map(m => markerPos(d, m)).filter(v => v !== null), this.beats && this.snapBeats !== false ? Array.from({ length: Math.floor(L / 5) }, (_, i) => i * 5) : []);
        let best = u, bd = tol;
        for (const s of c) { const dd = Math.abs(s - u); if (dd < bd) { bd = dd; best = s; } }
        // v12: when nothing else is near, a selection's end lands in the middle of the nearest pause (a sentence starts
        // and ends in one); held still on a grip, the view magnifies and the end goes exactly where the finger is. A tap
        // that places the playhead does not jump to pauses.
        if (pz && best === u && !this._mag) { const pm = pauseMids(d), pt = 7 / this.ppu(); for (const s of pm) { const dd = Math.abs(s - u); if (dd < pt && dd < bd) { bd = dd; best = s; } } }
        return Math.round(clamp(best, 0, L));
      };
      const inStrip = p => p.x < EDGE || p.x > this.W - EDGE;
      // v12.2: the phone's text-editing grammar on touch (the audio is a line of text, the playhead its caret).
      //   one finger swipes the view (and flings); two fingers only zoom; a tap places the playhead at once; a double tap
      //   selects the sentence under the finger, a triple tap its piece; press and hold, then drag: a range from the press
      //   point (hold inside the selection lifts it); the grips win over everything. A mouse keeps the desktop's ways.
      const HOLD_MS = 300, SLOP = 8, TAP2_MS = 300, TAP2_PX = 24;
      let vel = [];
      const tick = ms => { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) try { navigator.vibrate(ms); } catch (x) { /* none */ } };
      cv.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const p = pos(e);
        if (inStrip(p)) return;                       // the system's: an edge swipe is Back
        this.stopFling();                             // a touch stops a fling where it is
        cv.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, p); this._touching = true;
        if (pts.size === 2) {
          // a pinch only zooms: the time under the fingers' starting midpoint stays at that x
          const [p1, p2] = [...pts.values()]; this.cancelGesture(g0);
          const mx = (p1.x + p2.x) / 2, a0 = this.view.a.v, b0 = this.view.b.v;
          g0 = { k: 'pinch', d0: Math.max(30, Math.abs(p1.x - p2.x)), a0, b0, mx, um: a0 + (mx - G) / this.IW * (b0 - a0) }; this.drag = null; return;
        }
        if (pts.size > 2 || (g0 && g0.k === 'pinch')) return;
        const zn = zone(p), touch = e.pointerType !== 'mouse';
        g0 = { k: 'pending', p0: p, zn, u0: this.uOf(p.x), touch, t0: performance.now() };
        vel = [[performance.now(), p.x]];
        this.hideCoach();
        // the grips win over everything (wherever their touch areas lie)
        if (this.sel && !this.task) {
          let best = -1, bd = 1e9;
          for (let i = 0; i < 2; i++) { const r = this.handleRect(i); if (p.x >= r.l && p.x <= r.r && p.y >= r.t && p.y <= r.b) { const dd = Math.abs(p.x - this.d2x(this.sel[i])); if (dd < bd) { bd = dd; best = i; } } }
          if (best >= 0) {
            g0.k = 'handle'; g0.i = best; this.dragSel = true; this._gripI = best; g0.still = performance.now(); g0.sx = p.x;
            // held still for a moment, the grip magnifies time around itself (released, the view comes back)
            g0.mt = setInterval(() => { if (!g0 || g0.k !== 'handle') return; if (!this._mag && performance.now() - g0.still > 260) this.magnify(g0); }, 50);
            this.kick(); return;
          }
        }
        if (touch) {
          // press and hold, still: inside the selection it lifts (to move it); elsewhere on the sound a range begins here
          if ((zn.z === 'main' || zn.z === 'ruler') && !this.holding) g0.lp = setTimeout(() => {
            if (!g0 || g0.k !== 'pending') return;
            const u = clamp(this.uOf(p.x), 0, this.L), inSel = this.sel && u > this.sel[0] && u < this.sel[1];
            tick(12);
            if (inSel) {
              g0.k = 'lift'; this.startHand(this.sel[0], this.sel[1], 'lift', false); this.hand.fx = p.x; this.hand.fy = p.y; this.handTarget(this.uOf(p.x) - this.hand.len / 2);
              g0.last = p; this.drag = { x: p.x, apply: () => this.handTarget(this.uOf(g0.last.x) - this.hand.len / 2) };
            } else { g0.k = 'anchor'; g0.a = snapU(u, p.x, true); this.anchor = { u: g0.a, alpha: 1 }; }
            this.kick();
          }, HOLD_MS);
        } else if (zn.z === 'main' && !this.holding) {
          // the mouse, as before: held 0.42 s on the selection (or a piece) it lifts
          const u = this.uOf(p.x), inSel = this.sel && u > this.sel[0] && u < this.sel[1];
          const pi = pieceIndexAt(this.doc.pieces, clamp(u, 0, this.L - 1));
          if (inSel || this.doc.pieces.length > 1) g0.lp = setTimeout(() => {
            if (!g0 || g0.k !== 'pending') return;
            const r = inSel ? this.sel : pieceRange(this.doc.pieces, pi);
            g0.k = 'lift'; tick(12);
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
        if (g0.k === 'pinch') {
          if (pts.size !== 2) return;            // after a pinch, a finger left behind does nothing until all lift
          const [p1, p2] = [...pts.values()], dd = Math.max(30, Math.abs(p1.x - p2.x)), Ld = this.dispLen();
          const span = clamp((g0.b0 - g0.a0) * g0.d0 / dd, 20, Ld), a = clamp(g0.um - (g0.mx - G) / this.IW * span, 0, Math.max(0, Ld - span));
          this.view.a.snap(a); this.view.b.snap(a + span); this.kick(); return;
        }
        const now = performance.now(); vel.push([now, p.x]); while (vel.length > 2 && now - vel[0][0] > 100) vel.shift();
        const dx = p.x - g0.p0.x, dy = p.y - g0.p0.y;
        if (g0.k === 'pending') {
          if (Math.hypot(dx, dy) < SLOP) return;
          clearTimeout(g0.lp);
          if (Math.abs(dy) > Math.abs(dx)) {   // vertical: the stack of tracks scrolls if it is longer than its view; else the page
            if (this._laneMax > 0 && g0.p0.y > this.geom().laneTop - 4) { g0.k = 'lanes'; g0.off0 = this.laneOff || 0; } else g0.k = 'none';
            return;
          }
          const z = g0.zn.z;
          if (g0.touch || z === 'ruler' || z === 'ov' || this.holding) g0.k = z === 'ov' ? 'ov' : 'scroll';   // touch: a swipe scrolls, everywhere
          else { g0.k = 'select'; this.dragSel = true; this.track = null; this.marker = null; g0.a = snapU(clamp(g0.u0, 0, this.L), g0.p0.x, true); }
          g0.va = this.view.a.v; g0.vb = this.view.b.v; g0.sx0 = p.x;
          if (g0.k === 'scroll') this._swiping = true;
        }
        if (g0.k === 'anchor') {
          // the range begins at the anchor as soon as the finger moves on
          if (Math.hypot(dx, dy) < 4) return;
          g0.k = 'select'; this.dragSel = true; this.track = null; this.marker = null; this.anchor = null;
        }
        g0.last = p;
        if (g0.k === 'lanes') { this.scrollLanes(g0.off0 - dy); return; }
        if (g0.k === 'select') {
          const apply = () => { const x = g0.last.x, u = snapU(this.uOf(x), x, true); this.sel = [Math.min(g0.a, u), Math.max(g0.a, u)]; this.renderTime(); this.kick(); };
          this.drag = { x: p.x, apply }; apply();
        } else if (g0.k === 'handle') {
          if (Math.abs(p.x - g0.sx) > 3) { g0.still = performance.now(); g0.sx = p.x; }
          const apply = () => {
            const x = g0.last.x, m = this._mag;
            const u = m ? clamp(Math.round(this.uOf(x) + m.off), 0, docLen(this.shownDoc())) : snapU(this.uOf(x), x, true), s = this.sel.slice();
            s[g0.i] = u; if (s[0] > s[1]) { s.reverse(); g0.i = 1 - g0.i; this._gripI = g0.i; } this.sel = s; this.renderTime(); this.kick();
          };
          this.drag = { x: p.x, apply }; apply();
        } else if (g0.k === 'scroll') {
          // the view follows the finger; past an end (or at the fitted zoom, where there is nothing to scroll) it gives a
          // little, like a rubber band, and springs back when let go
          const span = g0.vb - g0.va, Ld = this.dispLen(), max = Math.max(0, Ld - span), ppu = this.ppu();
          let a = g0.va - (p.x - g0.sx0) / ppu, over = 0;
          if (a < 0) { over = -a * ppu; a = 0; } else if (a > max) { over = -(a - max) * ppu; a = max; }
          this.view.a.snap(a); this.view.b.snap(a + span);
          this.rub.snap(Math.sign(over) * RUB * (1 - Math.exp(-Math.abs(over) / (RUB * 2.2))));
          this.kick();
        } else if (g0.k === 'ov') {
          const Ld = this.dispLen(), span = g0.vb - g0.va, a = clamp(g0.va + dx / this.IW * Ld, 0, Ld - span); this.view.a.snap(a); this.view.b.snap(a + span); this.kick();
        } else if (g0.k === 'lift') {
          this.hand.fx = p.x; this.hand.fy = p.y; if (!this.drag) this.drag = { x: p.x, apply: () => this.handTarget(this.uOf(g0.last.x) - this.hand.len / 2) }; this.drag.x = p.x; this.drag.apply(); this.kick();
        } else if (g0.k === 'envpt') {
          const g = this.geom(); const env = this.doc.env.map(q => Object.assign({}, q)); const pt = env[g0.i];
          pt.u = clamp(Math.round(this.uOf(p.x)), 0, this.L); pt.db = clamp(Math.round(24 - (p.y - g.bandTop - 6) / (g.bandBot - g.bandTop - 12) * 36 - 12), -24, 12);
          env.sort((x, y) => x.u - y.u); g0.i = env.indexOf(pt);
          this.liveSet(Object.assign({}, this.doc, { env }), '音量曲线', this.top);
        }
      });
      const end = e => {
        if (!pts.has(e.pointerId)) return;
        pts.delete(e.pointerId); if (!pts.size) this._touching = false;
        this.drag = null;
        if (!g0) return;
        clearTimeout(g0.lp);
        const k = g0.k; const p = g0.p0;
        clearInterval(g0.mt); this.unmagnify();
        if (k === 'pinch') { if (pts.size === 0) { g0 = null; this.afterUserView(); } return; }
        this.dragSel = false; this._swiping = false;
        if (k === 'pending' && e.type === 'pointerup') this.taps(p, g0.zn, snapU, g0.touch, g0.t0);
        else if (k === 'anchor') {
          // held and let go without dragging: nothing is selected, the playhead stays; the anchor fades
          if (this.anchor) this.anchor.fade = true;
        } else if (k === 'select') {
          if (!this.sel || this.sel[1] - this.sel[0] < 2) { this.sel = null; this.renderTime(); }
          else { this.resetStack(); const g = this.geom(); this.showCoach('hold', this.t('按住选中的部分可以拖走', 'Hold the selection to drag it'), this.d2x((this.sel[0] + this.sel[1]) / 2), g.mainY + g.mainH * 0.3); }
        } else if (k === 'handle') { this.renderArea(); }
        else if (k === 'lift') { if (e.type === 'pointerup') this.handDrop(); else this.handCancel(); }
        else if (k === 'scroll') {
          // let go while moving: the view flings on, slowing down; then the rubber band (if any) springs back
          const v = this.flingVelocity(vel);
          if (e.type === 'pointerup' && g0.touch && !reduced() && Math.abs(v) > 60 && this.zoomed() && !this.rub.v) this.fling = { v: -v / this.ppu() };
          this.rub.to(0, P.view);
          if (!this.fling) this.afterUserView();
          if (g0.touch && g0.zn.z !== 'lane') this.gestureHint();
        }
        this.kick();
        g0 = null;
      };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      // the volume curve: a point is dragged where it is touched
      cv.addEventListener('pointerdown', e => {
        if (this.top.t !== 'env' || !g0 || g0.k !== 'pending') return;
        const p = pos(e), env = this.doc.env || [], g = this.geom(), yOf = db => g.bandTop + 6 + (1 - (db + 24) / 36) * (g.bandBot - g.bandTop - 12);
        const i = env.findIndex(q => { const [l, r] = this.hit(this.d2x(q.u), 32); return p.x >= l && p.x <= r && Math.abs(yOf(q.db) - p.y) < 22; });
        if (i >= 0) { g0.k = 'envpt'; g0.i = i; }
      });
      cv.addEventListener('wheel', e => {
        e.preventDefault();
        if (!(e.ctrlKey || e.metaKey) && this._laneMax > 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX) && pos(e).y > this.geom().laneTop - 4) { this.scrollLanes((this.laneOff || 0) + e.deltaY); return; }
        const Ld = this.dispLen(), span = this.view.b.t - this.view.a.t;
        if (e.ctrlKey || e.metaKey) {
          const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left - G) / this.IW, um = this.view.a.v + mx * span;
          const ns = clamp(span * Math.exp(e.deltaY * 0.004), 20, Ld); const a = clamp(um - mx * ns, 0, Ld - ns);
          this.view.a.snap(a); this.view.b.snap(a + ns);
        } else { const a = clamp(this.view.a.v + (e.deltaX || e.deltaY) / this.ppu(), 0, Math.max(0, Ld - span)); this.view.a.snap(a); this.view.b.snap(a + span); }
        this.kick();
      }, { passive: false });
    }
    /**
     * v12: a grip held still magnifies time around itself, about twelve times (a stretch of 5–15 s fills the width), so
     * the pauses near it are wide and the end lands in one. The grip stays under the finger; the finger moves it by its
     * own distance in the magnified time. Letting go brings the view back to where it was.
     */
    magnify(g0) {
      if (!this.sel || this._mag) return;
      const i = g0.i, u = this.sel[i], zx = g0.last ? g0.last.x : g0.p0.x, Ld = this.dispLen();
      const a0 = this.view.a.t, b0 = this.view.b.t, span = clamp((b0 - a0) / 12, 50, 150);
      if (span >= b0 - a0 - 1) return;
      this._magPk = this.geom().pk;
      const a = clamp(u - (this.d2x(u) - G) / this.IW * span, 0, Math.max(0, Ld - span));
      this._mag = { a0, b0, off: u - (a + (zx - G) / this.IW * span) };
      this.view.a.to(a, P.mag); this.view.b.to(a + span, P.mag);
      if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) try { navigator.vibrate(8); } catch (x) { /* none */ }
      this.scr.classList.add('magnified'); this.kick();
    }
    unmagnify() {
      const m = this._mag; if (!m) return;
      this._mag = null; this._magBack = true; this.scr.classList.remove('magnified');
      this.view.a.to(m.a0, P.mag); this.view.b.to(m.b0, P.mag); this.kick();
    }
    /** The tracks scroll under the pinned main line and under the waterline; the dock does not move for it (v10). */
    scrollLanes(off) {
      this.laneOff = clamp(off, 0, this._laneMax || 0);
      this.kick();
    }
    cancelGesture(g) { if (g) { clearTimeout(g.lp); clearInterval(g.mt); } this.unmagnify(); if (g && g.k === 'select') this.sel = null; if (g && g.k === 'lift') this.handCancel(); this.anchor = null; this.drag = null; this.rub.to(0, P.view); }
    /**
     * v12.2: taps in a row on the sound (each within 300 ms of the last and 24 dp of it) count up: one places the
     * playhead at once; two select the sentence under the finger; three select its piece. Elsewhere (a track, a task
     * holding the timeline) every tap is a single tap.
     */
    taps(p, zn, snapU, touch, t0) {
      // counted from the last tap's lift to this tap's touch, as the phone's double tap is
      const now = performance.now(), prev = this._tap, many = (zn.z === 'main' || zn.z === 'ruler') && !this.holding && !this.task;
      const n = many && prev && (t0 || now) - prev.up < 300 && Math.abs(p.x - prev.x) < 24 && Math.abs(p.y - prev.y) < 24 ? Math.min(3, prev.n + 1) : 1;
      this._tap = { n, up: now, x: p.x, y: p.y };
      const u = clamp(this.uOf(p.x), 0, this.L);
      if (n === 1) { this.tap(p, zn, snapU); if (touch && zn.z !== 'lane') this.gestureHint(); return; }
      if (n === 2) { const r = this.sentenceAt(u); this.select(r[0], r[1]); return; }
      const r = pieceRange(this.doc.pieces, pieceIndexAt(this.doc.pieces, clamp(Math.floor(u), 0, this.L - 1))); this.select(r[0], r[1]);
    }
    /** The sentence under a point: from the nearest stop before it to the nearest after (pause middles, seams, markers, the ends). */
    sentenceAt(u) {
      const d = this.doc, L = docLen(d), stops = [0, L].concat(pauseMids(d), seamsOf(d.pieces), (d.markers || []).map(m => markerPos(d, m)).filter(v => v !== null)).sort((a, b) => a - b);
      let a = 0, b = L;
      for (const s of stops) { if (s <= u && s > a) a = s; if (s > u && s < b) b = s; }
      return [Math.round(a), Math.round(b)];
    }
    /** A fling: the view keeps the finger's speed, slowing down; it stops at an end, at 20 dp/s or at the next touch. */
    stepFling(dt) {
      const f = this.fling, span = this.view.b.v - this.view.a.v, max = Math.max(0, this.dispLen() - span);
      let a = this.view.a.v + f.v * dt; const hit = a < 0 || a > max; a = clamp(a, 0, max);
      this.view.a.snap(a); this.view.b.snap(a + span);
      f.v *= Math.exp(-dt / FLING_T);
      if (hit || Math.abs(f.v * this.ppu()) < 20) { if (hit) this.rub.vel = -Math.sign(f.v) * Math.min(600, Math.abs(f.v * this.ppu()) * 0.35); this.fling = null; this.afterUserView(); }
    }
    stopFling() { if (this.fling) { this.fling = null; this.afterUserView(); } }
    /** The finger's speed over its last 100 ms (dp/s); 0 when it had stopped before letting go. */
    flingVelocity(vel) {
      if (vel.length < 2) return 0;
      const [t1, x1] = vel[vel.length - 1], [t0, x0] = vel[0];
      if (performance.now() - t1 > 80 || t1 - t0 < 12) return 0;
      return (x1 - x0) / (t1 - t0) * 1000;
    }
    /** After the user moves the view: playback follows again only if the playhead is still in view. */
    afterUserView() { if (this.playing) { const a = this.view.a.t, b = this.view.b.t; this._follow = this.ph >= a && this.ph <= b; } }
    /** The first-run hint for the gestures, once: after the first tap or swipe on the sound (see the page for why). */
    gestureHint() {
      if (!this.live || this.seen.gest) return;
      const g = this.geom();
      setTimeout(() => { if (this.seen.gest || this._touching) return; this.showCoach('gest', this.t('点两下选一句 · 按住再拖选一段', 'Double-tap a sentence · hold and drag a range'), this.W / 2, Math.max(40, g.rTop - 6)); }, 350);
    }
    tap(p, zn, snapU) {
      const u = this.uOf(p.x);
      const top = this.top;
      if (zn.z === 'main' && p.y < this.geom().mainY + 26 && !this.holding) {
        const d = this.shownDoc(), hit = (d.markers || []).find(m => { const mp = markerPos(d, m); if (mp === null) return false; const x = this.d2x(mp); return p.x >= Math.max(SAFE, x - 4) && p.x <= x + 64; });
        if (hit) { this.marker = hit.id; this.sel = null; this.track = null; this.ph = markerPos(d, hit); this.resetStack(); this.kick(); return; }
      }
      if (top.t === 'hand') { this.handTarget(snapU(u, p.x)); return; }
      if (top.t === 'env' && zn.z === 'main') {
        const g = this.geom(), env = (this.doc.env || []).map(q => Object.assign({}, q)), yOf = db => g.bandTop + 6 + (1 - (db + 24) / 36) * (g.bandBot - g.bandTop - 12);
        const hit = env.findIndex(q => { const [l, r] = this.hit(this.d2x(q.u), 32); return p.x >= l && p.x <= r && Math.abs(yOf(q.db) - p.y) < 22; });
        if (hit >= 0) env.splice(hit, 1);
        else { env.push({ u: clamp(Math.round(u), 0, this.L), db: clamp(Math.round(24 - (p.y - g.bandTop - 6) / (g.bandBot - g.bandTop - 12) * 36 - 12), -24, 12) }); env.sort((a, b) => a.u - b.u); }
        this.liveSet(Object.assign({}, this.doc, { env }), '音量曲线', top); return;
      }
      if (top.t === 'pauses' && zn.z === 'main') { const m = this.marks.find(q => u >= q.a - 2 && u <= q.b + 2); if (m) { m.on = !m.on; this.renderArea(); this.kick(); return; } }
      if (top.t === 'chorus' && zn.z === 'main' && this.chorus.length) { const j = this.chorus.findIndex(c => u >= c[0] && u <= c[1]); if (j >= 0) { top.i = j; this.pickCand(); this.renderArea(); return; } }
      if (zn.z === 'lane' && !this.holding) { this.track = zn.t.id; this.sel = null; this.marker = null; this.stopPlay(); this.resetStack(); this.kick(); return; }
      const L = docLen(this.shownDoc());
      this.ph = Math.round(clamp(snapU(u, p.x), 0, L));
      if (!this.holding) {
        if (this.sel && (u < this.sel[0] || u > this.sel[1])) this.clearSel();
        else if (this.track || this.marker) this.clearSel();
      }
      if (this.playing && this.range) { this.range = this.sel && !this.task ? this.sel.slice() : [0, this.shownLen()]; }
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
    if (c.startsWith('rgba')) { const v = c.match(/[\d.]+/g).map(Number); return `rgba(${v[0]}, ${v[1]}, ${v[2]}, ${(v[3] === undefined ? 1 : v[3]) * a})`; }
    if (c.startsWith('rgb')) return c.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
    const n = parseInt(c.slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  window.WB = { Bench, SRC, sec, slice, cutP, insP, withP, splitAt, rangeSet, docLen, flat, pausesOf, parsePlan, planEdits, Spring, P, ic, clk, cmp, dur, LAYER, newRecSource, byOrder, EDGE, SAFE, G, SCROLLZ };
})();
