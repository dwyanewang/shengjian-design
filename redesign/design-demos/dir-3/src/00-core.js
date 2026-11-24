/* 声剪 · 方向 3「竖着的声音」 · core: data prep, edit model, spine drawing.
 * Time flows down. A sentence is a capsule on a vertical spine, a pause is the gap between capsules.
 * Pure JS (no JSX). Everything is in result time r (seconds) unless named src/s/e (source seconds). */
const SJ = window.SJ;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const fmtT = (s, dec) => {
  if (!dec) return SJ.fmt(s);
  s = Math.max(0, Math.round(s * 10) / 10);
  const m = Math.floor(s / 60), x = s - m * 60;
  return m + ':' + (x < 10 ? '0' : '') + x.toFixed(1);
};
const sec1 = d => { const v = Math.round(d * 10) / 10; return Number.isInteger(v) ? String(v) : v.toFixed(1); };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const COL = { glow: '126,240,207', ghost: '196,205,219', warm: '255,182,72', line: '141,153,173', white: '238,242,248' };

/* ---------- the interview: 18:40 of speech, first 130 s from SJ (with the 9 long pauses) ---------- */
const SPEECH = (function () {
  const rate = 50, LEAD = 2.6;
  const a1 = SJ.speechEnvelope();
  const a2 = SJ.speechEnvelope({ seconds: 990, seed: 23, lead: 0.4, pauses: [] }); // the rest has no long pauses
  const env = new Float32Array(a1.length + a2.length); env.set(a1, 0); env.set(a2, a1.length);
  const n = env.length, dur = n / rate;
  const pauses = SJ.PAUSES.map(([s, d], i) => ({ k: 'pause', id: 'p' + (i + 1), n: i + 1, s, e: s + d, d }));
  const inLong = (a, b) => pauses.find(p => p.s < b && p.e > a);
  const gaps = [];
  for (let i = Math.round(LEAD * rate); i < n;) {
    if (env[i] < 0.1) { let j = i; while (j < n && env[j] < 0.1) j++; if (j - i >= 15) gaps.push([i / rate, j / rate]); i = j; } else i++;
  }
  pauses.forEach(p => gaps.push([p.s, p.e]));
  gaps.sort((x, y) => x[0] - y[0]);
  const mg = [];
  for (const g of gaps) { const l = mg[mg.length - 1]; if (l && g[0] <= l[1]) l[1] = Math.max(l[1], g[1]); else mg.push([g[0], g[1]]); }
  const runs = []; let cur = LEAD;
  for (const [g0, g1] of mg) { if (g1 <= cur) continue; if (g0 > cur + 0.05) runs.push([cur, g0]); cur = Math.max(cur, g1); }
  if (cur < dur - 0.05) runs.push([cur, dur]);
  const caps = [];
  for (const r of runs) {
    const l = caps[caps.length - 1];
    if (l && !inLong(l[1], r[0]) && r[0] - l[1] < 0.8 && (l[1] - l[0] < 1.6 || r[1] - r[0] < 0.7)) l[1] = r[1];
    else caps.push([r[0], r[1]]);
  }
  // pauses own their exact window: trim capsules that spill into them
  for (const c of caps) for (const p of pauses) { if (c[0] < p.s && c[1] > p.s) c[1] = p.s; if (c[0] < p.e && c[1] > p.e && c[0] >= p.s) c[0] = p.e; }
  const capItems = caps.filter(c => c[1] - c[0] > 0.15).map(([s, e], i) => ({ k: 'cap', id: 'c' + (i + 1), n: i + 1, s, e }));
  const items = [{ k: 'lead', id: 'lead', s: 0, e: LEAD }, ...capItems, ...pauses].sort((a, b) => a.s - b.s);
  return { key: 'interview', kind: 'speech', rate, env, dur, items, pauses, caps: capItems, lead: LEAD };
})();

/* ---------- 晚风（钢琴版）: sections are capsules, width = loudness ---------- */
const MUSIC = (function () {
  const rate = 20, env = SJ.musicEnvelope(), dur = env.length / rate;
  const items = SJ.SECTIONS.map((x, i) => ({ k: 'sec', id: 'sec' + i, n: i + 1, s: x.from, e: x.to, name: x.name, level: x.level, chorus: x.name === '副歌' }));
  return { key: 'wanfeng', kind: 'music', rate, env, dur, items, bpm: 92 };
})();

/* short sources: an inserted recording, thumbnails, voice prints */
const REC = (function () { const rate = 50, env = SJ.speechEnvelope({ seconds: 6, seed: 77, lead: 0.3, pauses: [] }); return { key: 'rec', kind: 'speech', rate, env, dur: env.length / rate, items: [] }; })();
const SRCS = { interview: SPEECH, wanfeng: MUSIC, rec: REC };
const ENVS = {};
function envFor(id) {
  if (SRCS[id]) return SRCS[id];
  if (ENVS[id]) return ENVS[id];
  const it = SJ.LIBRARY.find(x => x.id === id);
  const seed = (hashStr(id) % 997) + 3;
  let env, rate;
  if (it && it.env === 'music') { rate = 20; env = SJ.musicEnvelope({ seconds: 232, seed }); }
  else { rate = 50; env = SJ.speechEnvelope({ seconds: 80, seed, lead: 0.8, pauses: [[13, 1.5], [33, 2.1], [55, 1.4]] }); }
  return (ENVS[id] = { rate, env, dur: env.length / rate });
}
function shortEnv(key, seconds) {
  const k = key + ':' + seconds;
  if (ENVS[k]) return ENVS[k];
  const env = SJ.speechEnvelope({ seconds, seed: (hashStr(key) % 991) + 5, lead: 0.15, pauses: [] });
  return (ENVS[k] = { rate: 50, env, dur: seconds });
}

/* ---------- edit model: segs are source ranges in result order ---------- */
function newEd(src, id) {
  const ed = { src: src.key, segs: [{ s: 0, e: src.dur }], mods: [], markers: [], bgm: null };
  if (id === 'interview') ed.markers = [{ id: 'm1', src: 18.6, name: '第一个问题' }, { id: 'm2', src: 74.2, name: '王老师推荐的三本书' }];
  return ed;
}
const segLen = g => g.e - g.s;
const edDur = ed => ed.segs.reduce((a, g) => a + g.e - g.s, 0);
function splitSegs(segs, r) {
  const out = []; let acc = 0;
  for (const g of segs) {
    const L = g.e - g.s;
    if (r > acc + 1e-6 && r < acc + L - 1e-6) { const m = g.s + (r - acc); out.push({ ...g, e: m }, { ...g, s: m }); } else out.push(g);
    acc += L;
  }
  return out;
}
function cutRange(segs0, r0, r1) {
  const segs = splitSegs(splitSegs(segs0, r0), r1); const inside = []; let acc = 0;
  segs.forEach((g, i) => { const L = g.e - g.s; if (acc >= r0 - 1e-6 && acc + L <= r1 + 1e-6) inside.push(i); acc += L; });
  return { segs, inside };
}
function removeRange(ed, r0, r1) { const { segs, inside } = cutRange(ed.segs, r0, r1); return { ...ed, segs: segs.filter((_, i) => !inside.includes(i)) }; }
function keepRange(ed, r0, r1) { const { segs, inside } = cutRange(ed.segs, r0, r1); return { ...ed, segs: segs.filter((_, i) => inside.includes(i)) }; }
function insertSegsAt(ed, r, add) {
  const segs = splitSegs(ed.segs, r); let acc = 0, at = segs.length;
  for (let i = 0; i < segs.length; i++) { if (acc >= r - 1e-6) { at = i; break; } acc += segLen(segs[i]); }
  return { ...ed, segs: [...segs.slice(0, at), ...add.map(g => ({ ...g })), ...segs.slice(at)] };
}
function piecesOf(ed, r0, r1) { const { segs, inside } = cutRange(ed.segs, r0, r1); return inside.map(i => ({ ...segs[i] })); }
function dupRange(ed, r0, r1) { return insertSegsAt(ed, r1, piecesOf(ed, r0, r1)); }
function moveRange(ed, r0, r1, to) {
  if (to >= r0 && to <= r1) return ed;
  const pcs = piecesOf(ed, r0, r1), n = removeRange(ed, r0, r1);
  return insertSegsAt(n, to > r1 ? to - (r1 - r0) : to, pcs);
}
function splitAt(ed, r) { return { ...ed, segs: splitSegs(ed.segs, r), splits: [...(ed.splits || []), resToSrc(ed, r)] }; }
function srcToRes(ed, t) {
  let acc = 0;
  for (const g of ed.segs) { if (!g.silent && !g.src && t >= g.s - 1e-6 && t <= g.e + 1e-6) return acc + (t - g.s); acc += g.e - g.s; }
  return null;
}
function resToSrc(ed, r) {
  let acc = 0;
  for (const g of ed.segs) { const L = g.e - g.s; if (r <= acc + L + 1e-6) return g.silent || g.src ? null : g.s + (r - acc); acc += L; }
  return null;
}
function addGain(ed, r0, r1, db) {
  const mods = [...ed.mods];
  for (const g of piecesOf(ed, r0, r1)) if (!g.silent) mods.push({ kind: 'gain', s: g.s, e: g.e, db, src: g.src || null });
  return { ...ed, mods };
}
function globalGain(ed, db) { return { ...ed, mods: [...ed.mods, { kind: 'gain', s: -1, e: 1e9, db, all: true }] }; }
function addFade(ed, r0, r1, dir, shape) {
  const mods = [...ed.mods], L = r1 - r0; let acc = 0;
  for (const g of piecesOf(ed, r0, r1)) {
    const gl = g.e - g.s;
    if (!g.silent) mods.push({ kind: 'fade', dir, shape: shape || 'sine', s: g.s, e: g.e, f0: acc / L, f1: (acc + gl) / L, src: g.src || null });
    acc += gl;
  }
  return { ...ed, mods };
}
function fadeCurve(dir, shape, f) {
  f = clamp(f, 0, 1); const x = dir === 'in' ? f : 1 - f;
  if (shape === 'lin') return x;
  if (shape === 'log') return x * x;
  return Math.sin(x * Math.PI / 2);
}
function closePause(ed, pid, keep) {
  keep = keep == null ? 0.3 : keep;
  const p = SPEECH.pauses.find(x => x.id === pid); if (!p) return ed;
  const a = srcToRes(ed, p.s + keep / 2), b = srcToRes(ed, p.e - keep / 2);
  if (a == null || b == null || b - a < 0.05) return ed;
  const ra = resToSrc(ed, (a + b) / 2); if (ra == null || ra < p.s || ra > p.e) return ed;
  return removeRange(ed, a, b);
}
function openPauses(ed) { return SPEECH.pauses.filter(p => { const m = srcToRes(ed, (p.s + p.e) / 2); return m != null; }); }
function restoreSeam(ed, seam) {
  const segs = [...ed.segs];
  if (seam.head) segs.unshift({ s: 0, e: segs[0].s });
  else if (seam.tail) segs.push({ s: segs[segs.length - 1].e, e: seam.srcDur });
  else segs.splice(seam.gi + 1, 0, { s: seam.a, e: seam.b });
  // merge contiguous plain segs
  const out = [];
  for (const g of segs) { const l = out[out.length - 1]; if (l && !l.silent && !g.silent && !l.src && !g.src && Math.abs(l.e - g.s) < 1e-6) l.e = g.e; else out.push({ ...g }); }
  return { ...ed, segs: out };
}

/* ---------- layout: what is where in result time ---------- */
function layout(src, ed) {
  const items = [], seams = []; let acc = 0; const segs = ed.segs;
  if (segs.length && !segs[0].silent && !segs[0].src && segs[0].s > 0.05) seams.push({ id: 'seam-head', r: 0, head: true, kind: 'cut', removed: segs[0].s, a: 0, b: segs[0].s });
  segs.forEach((g, gi) => {
    const L = g.e - g.s;
    if (g.silent) items.push({ k: 'silence', id: 'sil' + gi, r0: acc, r1: acc + L, d: L });
    else if (g.src) items.push({ k: 'ins', id: 'ins' + gi, r0: acc, r1: acc + L, d: L, srcKey: g.src });
    else for (const it of src.items) {
      if (it.e <= g.s + 1e-6 || it.s >= g.e - 1e-6) continue;
      const s = Math.max(it.s, g.s), e = Math.min(it.e, g.e);
      items.push({ k: it.k, id: it.id, ref: it, r0: acc + (s - g.s), r1: acc + (e - g.s), cutTop: s > it.s + 1e-6, cutBot: e < it.e - 1e-6 });
    }
    const nx = segs[gi + 1];
    if (nx) {
      const plain = !nx.silent && !g.silent && !nx.src && !g.src;
      if (plain && Math.abs(nx.s - g.e) < 1e-6) seams.push({ id: 'split' + gi + '-' + Math.round(g.e * 100), r: acc + L, gi, kind: 'split' });
      else seams.push({ id: 'seam' + gi + '-' + Math.round(g.e * 100), r: acc + L, gi, a: g.e, b: nx.s, removed: plain && nx.s > g.e ? nx.s - g.e : 0, kind: !plain ? 'insert' : nx.s > g.e ? 'cut' : 'jump' });
    }
    acc += L;
  });
  const last = segs[segs.length - 1];
  if (last && !last.silent && !last.src && last.e < src.dur - 0.05) seams.push({ id: 'seam-tail', r: acc, tail: true, kind: 'cut', removed: src.dur - last.e, srcDur: src.dur, a: last.e, b: src.dur });
  // a pause whose middle was removed reads as one closed pause
  for (const sm of seams) {
    if (sm.kind !== 'cut' || sm.head || sm.tail) continue;
    const bi = items.findIndex(x => x.k === 'pause' && Math.abs(x.r1 - sm.r) < 1e-6 && x.cutBot);
    const ai = items.findIndex(x => x.k === 'pause' && Math.abs(x.r0 - sm.r) < 1e-6 && x.cutTop);
    if (bi >= 0 && ai >= 0 && items[bi].id === items[ai].id) {
      const b = items[bi], a = items[ai];
      items[bi] = { k: 'closed', id: b.id, ref: b.ref, r0: b.r0, r1: a.r1, saved: sm.removed, seam: sm };
      items.splice(ai, 1); sm.closed = b.id;
    }
  }
  items.sort((x, y) => x.r0 - y.r0);
  return { dur: acc, items, seams, src };
}

/* ---------- sampler: max amplitude over a result range ---------- */
function makeSampler(src, ed) {
  const segs = ed.segs, starts = []; let acc = 0;
  for (const g of segs) { starts.push(acc); acc += g.e - g.s; }
  const mods = ed.mods;
  const mult = (t, key) => {
    let m = 1;
    for (const x of mods) {
      if (x.all) { m *= Math.pow(10, x.db / 20); continue; }
      if ((x.src || null) !== key || t < x.s || t > x.e) continue;
      if (x.kind === 'gain') m *= Math.pow(10, x.db / 20);
      else if (x.kind === 'fade') m *= fadeCurve(x.dir, x.shape, x.f0 + (t - x.s) / Math.max(1e-6, x.e - x.s) * (x.f1 - x.f0));
    }
    if (ed.curve && key == null) m *= curveAt(ed.curve, t);
    return m;
  };
  function amp(rA, rB) {
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= rA) lo = mid; else hi = mid - 1; }
    let best = 0;
    for (let i = lo; i < segs.length && starts[i] < rB; i++) {
      const g = segs[i]; if (g.silent) continue;
      const a = Math.max(rA, starts[i]), b = Math.min(rB, starts[i] + g.e - g.s); if (b <= a) continue;
      const S = g.src ? SRCS[g.src] : src, env = S.env, rate = S.rate;
      const t0 = g.s + (a - starts[i]), t1 = g.s + (b - starts[i]);
      const i0 = Math.max(0, Math.floor(t0 * rate)), i1 = Math.min(env.length, Math.max(i0 + 1, Math.ceil(t1 * rate)));
      let mx = 0; for (let k = i0; k < i1; k++) if (env[k] > mx) mx = env[k];
      const v = mx * (mods.length || ed.curve ? mult((t0 + t1) / 2, g.src || null) : 1);
      if (v > best) best = v;
    }
    return best;
  }
  return { amp, dur: acc };
}
function curveAt(pts, t) { // volume curve (dB points on source time), interpolated in dB
  if (!pts.length) return 1;
  if (t <= pts[0].t) return Math.pow(10, pts[0].db / 20);
  for (let i = 1; i < pts.length; i++) if (t <= pts[i].t) { const a = pts[i - 1], b = pts[i]; const f = (t - a.t) / (b.t - a.t); return Math.pow(10, (a.db + (b.db - a.db) * f) / 20); }
  return Math.pow(10, pts[pts.length - 1].db / 20);
}
/* plain sampler over an env (no edits) */
function envSampler(S, opts) {
  const o = opts || {}, scale = o.scale || 1, gain = o.gain || 1, loop = o.loop, off = o.off || 0;
  return function (rA, rB) {
    let t0 = rA * scale + off, t1 = rB * scale + off;
    if (loop) { t0 = ((t0 % S.dur) + S.dur) % S.dur; t1 = t0 + (rB - rA) * scale; }
    const i0 = Math.max(0, Math.floor(t0 * S.rate)), i1 = Math.min(S.env.length, Math.max(i0 + 1, Math.ceil(t1 * S.rate)));
    let mx = 0; for (let k = i0; k < i1; k++) if (S.env[k] > mx) mx = S.env[k];
    return mx * gain;
  };
}
function duckFor(lay) { // music steps aside while someone talks
  const n = Math.ceil(lay.dur * 10) + 2, d = new Float32Array(n).fill(1);
  for (const it of lay.items) if (it.k === 'cap' || it.k === 'ins') for (let i = Math.floor(it.r0 * 10); i < Math.ceil(it.r1 * 10) && i < n; i++) d[i] = 0.3;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) { let a = 0, c = 0; for (let k = -4; k <= 4; k++) { const j = i + k; if (j >= 0 && j < n) { a += d[j]; c++; } } s[i] = a / c; }
  return r => s[clamp(Math.round(r * 10), 0, n - 1)];
}

/* ---------- drawing: one tile of a (multi-column) vertical spine ---------- */
function rrPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
function specAt(r, f, a) { // a believable speech spectrum, for the spectrum view
  const f1 = 0.17 + 0.05 * Math.sin(r * 3.1), f2 = 0.43 + 0.07 * Math.sin(r * 2.3 + 1), f3 = 0.68 + 0.03 * Math.sin(r * 5.1);
  const e = Math.exp(-((f - f1) ** 2) / 0.003) + 0.7 * Math.exp(-((f - f2) ** 2) / 0.005) + 0.35 * Math.exp(-((f - f3) ** 2) / 0.006) + 0.5 * Math.exp(-f * 9);
  return clamp(a * e * 1.25 + 0.04 * Math.random() * a, 0, 1);
}
function drawSpine(ctx, o) {
  const { W, H, dpr, y0, padTop, pps } = o;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const Y = r => padTop + r * pps - y0, R = y => (y + y0 - padTop) / pps;
  const step = 1 / dpr, dr = step / pps;
  for (const c of o.cols) drawCol(ctx, o, c, Y, R, step, dr);
}
function drawCol(ctx, o, c, Y, R, step, dr) {
  const H = o.H, x = c.x, lay = c.lay, cw = c.capW, maxHalf = cw / 2 - 3, A = c.alpha == null ? 1 : c.alpha;
  const sA = Math.max(0, Y(0)), sB = Math.min(H, Y(lay.dur));
  if (sB > sA) { ctx.fillStyle = `rgba(${COL.line},${0.3 * A})`; ctx.fillRect(x - 0.5, sA, 1, sB - sA); }
  if (c.kind === 'bgm') { // a continuous second spine, narrower, ducking beside speech
    ctx.fillStyle = `rgba(${COL.glow},${0.55 * A})`;
    for (let y = sA; y < sB; y += step) { const r = R(y); const hw = Math.min(1, c.amp(r, r + dr) * (c.duck ? c.duck(r) : 1)) * maxHalf; if (hw > 0.3) ctx.fillRect(x - hw, y, hw * 2, step); }
    return;
  }
  const rows = (yA, yB, half, alpha, inCap) => {
    if (o.spectrum && inCap !== 'hiss') {
      const x0 = c.specX0 || 66, x1 = c.specX1 || 344, bins = 44, bw = (x1 - x0) / bins;
      for (let y = yA; y < yB; y += step) { const r = R(y), a = Math.min(1, c.amp(r, r + dr)); for (let b = 0; b < bins; b++) { const v = specAt(r, b / bins, a); if (v > 0.03) { ctx.fillStyle = `rgba(${COL.glow},${(v * 0.95).toFixed(3)})`; ctx.fillRect(x0 + b * bw, y, bw - 0.6, step); } } }
      return;
    }
    if (c.mirror) {
      const M = c.mirror;
      const dc = a => Math.pow(Math.min(1, a), M.diff ? 0.5 : 0.62);
      for (let y = yA; y < yB; y += step) {
        const r = R(y);
        const aL = dc(M.L(r - dr, r + 2 * dr)), rr = M.rScale ? r * M.rScale : r, aR = M.rEnd != null && rr > M.rEnd ? 0 : dc(M.R(rr - dr, rr + 2 * dr * (M.rScale || 1)));
        if (M.diff && aL > aR + 0.06) {
          ctx.fillStyle = `rgba(${COL.ghost},${0.5 * alpha * A})`; if (aR * half > 0.3) ctx.fillRect(x - aR * half, y, aR * half, step);
          ctx.fillStyle = `rgba(${COL.warm},${0.85 * A})`; ctx.fillRect(x - aL * half, y, (aL - aR) * half, step);
        } else { ctx.fillStyle = `rgba(${COL.ghost},${0.5 * alpha * A})`; if (aL * half > 0.3) ctx.fillRect(x - aL * half, y, aL * half, step); }
        ctx.fillStyle = `rgba(${COL.glow},${alpha * A})`; if (aR * half > 0.3) ctx.fillRect(x, y, aR * half, step);
      }
      return;
    }
    for (let y = yA; y < yB; y += step) {
      const r = R(y), a = c.amp(r - dr * 1.5, r + dr * 2.5), hw = Math.min(1, a) * half;
      if (a > 1.02) { ctx.fillStyle = `rgba(${COL.white},${0.95 * A})`; ctx.fillRect(x - hw, y, hw * 2, step); continue; }
      if (hw > 0.3) { ctx.fillStyle = `rgba(${COL.glow},${0.55 * alpha * A})`; ctx.fillRect(x - hw, y, hw * 2, step); ctx.fillStyle = `rgba(${COL.glow},${alpha * A})`; ctx.fillRect(x - hw * 0.62, y, hw * 1.24, step); }
    }
  };
  for (const it of lay.items) {
    const ya = Y(it.r0), yb = Y(it.r1);
    if (yb < -4 || ya > H + 4) continue;
    if (it.k === 'cap' || it.k === 'sec' || it.k === 'ins') {
      const lvl = it.k === 'sec' ? it.ref.level : 1;
      const w = it.k === 'sec' ? cw * (0.38 + 0.62 * lvl) : cw;
      const pad = it.k === 'sec' ? 1.5 : 0.6, top = ya + (it.cutTop ? 0 : pad), h = Math.max(3, yb - ya - (it.cutTop ? 0 : pad) - (it.cutBot ? 0 : pad));
      const hot = c.hot ? c.hot(it) : 0;
      rrPath(ctx, x - w / 2, top, w, h, Math.min(16, h / 2));
      ctx.fillStyle = hot ? `rgba(${COL.glow},${0.1 + 0.1 * hot})` : it.k === 'sec' ? `rgba(${COL.glow},${(0.03 + 0.08 * lvl) * A})` : `rgba(${COL.glow},${0.065 * A})`;
      ctx.fill();
      ctx.strokeStyle = it.k === 'ins' ? `rgba(${COL.white},.5)` : `rgba(${COL.glow},${(it.k === 'sec' ? 0.1 + 0.4 * lvl : 0.2) * A + 0.3 * hot})`; ctx.lineWidth = 1; ctx.stroke();
      if (o.spectrum) { rows(Math.max(top, 0), Math.min(top + h, H), maxHalf, 1, 'cap'); continue; }
      ctx.save(); ctx.clip();
      rows(Math.max(top, 0), Math.min(top + h, H), w / 2 - 3, it.k === 'sec' ? 0.42 + 0.58 * lvl : 0.95, 'cap');
      ctx.restore();
    } else if (it.k === 'pause' || it.k === 'closed' || it.k === 'lead') {
      rows(Math.max(ya, 0), Math.min(yb, H), maxHalf, it.k === 'lead' ? 0.5 : 0.4, 'hiss');
      if (it.k === 'lead' && yb - ya > 6) { ctx.save(); ctx.setLineDash([3, 4]); rrPath(ctx, x - cw / 2, ya + 0.6, cw, yb - ya - 1.2, Math.min(16, (yb - ya) / 2)); ctx.strokeStyle = `rgba(${COL.line},${0.55 * A})`; ctx.stroke(); ctx.restore(); }
    } else if (it.k === 'silence') {
      ctx.save(); ctx.setLineDash([3, 4]); rrPath(ctx, x - cw / 2, ya + 0.6, cw, Math.max(3, yb - ya - 1.2), Math.min(16, (yb - ya) / 2)); ctx.strokeStyle = `rgba(${COL.white},.45)`; ctx.stroke(); ctx.restore();
    }
  }
}
/* small static spines (thumbnails, voice prints, covers) */
function drawMini(cv, S, o) {
  o = o || {};
  const w = o.w, h = o.h, dpr = 2; cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const t0 = o.from || 0, t1 = o.to || S.dur, x = w / 2, half = (o.half || w / 2) - 1;
  ctx.fillStyle = `rgba(${COL.line},.35)`; ctx.fillRect(x - 0.5, 0, 1, h);
  const color = o.color || COL.glow, alpha = o.alpha == null ? 0.95 : o.alpha;
  for (let y = 0; y < h; y += 0.5) {
    const a0 = t0 + (y / h) * (t1 - t0), a1 = t0 + ((y + 0.5) / h) * (t1 - t0);
    const i0 = Math.floor(a0 * S.rate), i1 = Math.max(i0 + 1, Math.ceil(a1 * S.rate));
    let m = 0; for (let k = i0; k < i1 && k < S.env.length; k++) if (S.env[k] > m) m = S.env[k];
    const hw = Math.min(1, m * (o.gain || 1)) * half;
    const lit = o.lit != null && y / h <= o.lit;
    ctx.fillStyle = `rgba(${lit ? COL.warm : color},${o.lit != null && !lit ? alpha * 0.55 : alpha})`;
    if (hw > 0.25) ctx.fillRect(x - hw, y, hw * 2, 0.5);
  }
}
function drawCover(cv, id, size) {
  const dpr = 2; cv.width = cv.height = size * dpr; const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = SJ.rng(hashStr(id)), hue = Math.floor(r() * 360);
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, `hsl(${hue} 32% 22%)`); g.addColorStop(1, `hsl(${(hue + 40) % 360} 38% 12%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const n = 5 + Math.floor(r() * 4), bw = size / (n * 2 + 1);
  for (let i = 0; i < n; i++) {
    const h = size * (0.25 + 0.6 * r()), y = (size - h) * r(), x = bw * (1 + i * 2);
    ctx.fillStyle = `hsla(${(hue + 160 + i * 9) % 360} 80% ${72 + r() * 14}% / ${0.55 + r() * 0.4})`;
    rrPath(ctx, x, y, bw, h, bw / 2); ctx.fill();
  }
}
