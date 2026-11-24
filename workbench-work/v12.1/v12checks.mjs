// v12 checks: the round's rules, on the live phone and the static screens.
//  1 the speech is real: every pause over 1 s of the interview shows as at least one pale (pause) column at the fitted
//    zoom, at 360 and 390; the pauses plan counts exactly the pauses the audio has;
//  2 the playhead and the sound end above play: at rest, with a selection, with tracks, recording; for a single audio
//    the horizon sits in the lower half of the canvas above play and the sound ends within 140 dp of play;
//  3 grips: across selections (short in the middle, at the start, at the end, whole, zoomed at both ends), 360/390,
//    font scale 1.0/1.3, zh/en: each hit box at least 48 wide and 44 tall, the two never overlap, both keep SAFE from
//    the sides; a touch on each grip moves that end (and only it);
//  4 magnify: a grip held still magnifies time at least eight times around it, the grip stays under the finger, a move
//    of 30 dp moves the end by 30 dp of magnified time, and letting go brings the view back exactly;
//  5 recording: play is not shown while recording; the record button is the one round control of 48 dp or more;
//  6 export: the purpose is the first row; the main button names what happens; one quality row says the format and
//    opens the details inside the dock; sharing takes the last format used for sharing (M4A 128k the first time);
//  7 words: no 拉齐 anywhere in the UI; 统一音量 and Even out fit their cells (360, font scale 1.3);
//  8 first run: the bar shows one example sentence until 说一句 is used once, then it says 说一句;
//  9 常用 follows the audio: a song starts with 副歌; a recording has no 副歌 there and has 降噪, 统一音量, 停顿;
// 10 times are in the UI font with tabular figures (the time tag, the recording clock, the export percentage);
// 11 v12.1: the ruler sits just above the tallest bar in every state where the main line's top moves, with the time
//    pill on it and the overview strip above it; it still seeks and scrolls; the air above it acts as v12's sky; it holds
//    still while a grip magnifies;
// 12 v12.1: with tracks the first one sits right under the main line and does not move with a selection; the grips
//    hang over the echo, above the first track and clear of its label, and a touch there takes the grip.
// Usage: node v12checks.mjs ROOT
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
let fails = 0;
const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined && !c ? '  ' + JSON.stringify(x).slice(0, 900) : '')); if (!c) fails++; };
const X = `document.querySelector('.scr[data-scene=live]')._bench`;
const LIB = `
  window.__wait = ms => new Promise(r => setTimeout(r, ms));
  window.__fin = () => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* infinite */ } });
  window.__settle = x => { x.view.a.snap(x.view.a.t); x.view.b.snap(x.view.b.t); x.measure(); x.draw(); };
  window.__vis = e => { if (!e || !e.isConnected) return false; for (let p = e; p && p.nodeType === 1; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } const q = e.getBoundingClientRect(); return q.width > 1 && q.height > 1; };
`;
const open = async (w, h, q = '', dark = false) => { await b.viewport(w, h, true, 2, dark); await b.open('file://' + path.join(ROOT, 'index.html') + q); await sleep(900); await b.eval(`(() => { ${LIB} const x = ${X}; x.scr.scrollIntoView({ block: 'start' }); window.resetLive(); x.hideCoach(); __settle(x); return 1; })()`); await sleep(200); };
try {
  // ---------------------------------------------------------------- 1 pauses show at the fitted zoom
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await open(w, h);
    const r = await b.eval(`(() => { const x = ${X}, W = window.WB, d = x.doc; __settle(x);
      const cols = x._cols || [], ps = W.pausesOf(d, 10);
      const per = ps.map(([a, c]) => { const xa = x.d2x(a), xc = x.d2x(c); return { at: (a / 10).toFixed(1), pale: cols.filter(k => k[0] >= xa && k[0] <= xc && k[4]).length }; });
      // the plan: what it says it removes
      x.startPlan('删掉超过1秒的停顿'); const label = x.panelEl.querySelector('.step-r .sx').textContent; x.back(true);
      return { n: ps.length, per, label };
    })()`);
    ok(r.n >= 6 && r.per.every(p => p.pale >= 1), `${w}: all ${r.n} pauses over 1 s show at least one pale column at the fitted zoom`, r.per);
    ok(r.label.includes(String(r.n)), `${w}: the plan says it removes ${r.n} pauses ("${r.label}")`, r.label);
  }
  // ---------------------------------------------------------------- 2 the sound and the playhead end above play
  for (const [w, h] of [[360, 780], [390, 844]]) for (const fs of ['0', '1']) {
    await open(w, h, `?fs=${fs}`);
    const r = await b.eval(`(async () => { const x = ${X}, S = window.SCENES, out = [];
      const check = (label, single) => { __fin(); __settle(x); const g = x.geom(), c = x.cv.getBoundingClientRect(), p = x.playEl.getBoundingClientRect();
        const playTop = __vis(x.playEl) ? p.top - c.top : (x.botEl.getBoundingClientRect().top - c.top - 10);
        const low = g.lanes.length ? Math.min(g.lanes[g.lanes.length - 1].y + g.lanes[g.lanes.length - 1].h, g.dockTop - g.R) : g.bandBot;
        // "lower half": of the open water between the ruler and play's top (the canvas itself runs on under the dock)
        // v12.1: the ruler now sits on the sound, so "lower half" is of the canvas between the title and play
        out.push({ label, single, low: Math.round(low), playTop: Math.round(playTop), mid: g.mid, half: Math.round(playTop / 2), gap: Math.round(playTop - g.bandBot) }); };
      window.resetLive(); check('rest', true);
      x.sel = [398, 585]; x.stack = [x.rootView()]; x.renderArea(); check('selection', true);
      window.resetLive(); x.ph = 741; x.startRec(); x.rec.len = 60; x.rec.running = true; x.gap.w = 60; x.renderArea(); check('recording', true); x.recCancel(true);
      x.reset(S.kTracks5.doc()); x.stack = [x.rootView()]; x.renderArea(true); check('five tracks', false);
      x.reset(S.kTracks.doc ? S.kTrackRow.doc() : S.kTrackRow.doc()); x.stack = [x.rootView()]; x.renderArea(true); check('one track', false);
      window.resetLive(); return out; })()`);
    for (const o of r) {
      ok(o.low <= o.playTop - 6, `${w}${fs === '1' ? ' 1.3' : ''} ${o.label}: the playhead and the sound end at ${o.low}, above play at ${o.playTop}`, o);
      if (o.single && o.label !== 'recording') ok(o.mid > o.half && o.gap <= 140, `${w}${fs === '1' ? ' 1.3' : ''} ${o.label}: the horizon (${o.mid}) is in the lower half of the canvas above play (below ${o.half}) and the sound ends ${o.gap} dp above play`, o);
    }
  }
  // ---------------------------------------------------------------- 3 grips
  for (const [w, h] of [[360, 780], [390, 844]]) for (const fs of ['0', '1']) for (const lang of ['zh', 'en']) {
    await open(w, h, `?fs=${fs}&lang=${lang}`);
    const r = await b.eval(`(async () => { const x = ${X}, L = x.L, out = [];
      const cases = [['short in the middle', 0, L, [621, 638]], ['one unit', 0, L, [700, 701]], ['short at the start', 0, L, [0, 12]], ['at the start', 0, L, [0, 87]],
        ['short at the end', 0, L, [L - 9, L]], ['at the end', 0, L, [L - 90, L]], ['whole', 0, L, [0, L]], ['zoomed at the start', 0, 200, [0, 30]], ['zoomed at the end', L - 200, L, [L - 25, L]],
        ['zoomed, short', 600, 800, [700, 706]]];
      for (const [label, va, vb, sel] of cases) {
        window.resetLive(); x.view.a.snap(va); x.view.b.snap(vb); x.sel = sel.slice(); x.stack = [x.rootView()]; x.renderArea(); __settle(x);
        const q = x.gripLayout(), A = q[0], B = q[1], SAFE = window.WB.SAFE;
        const over = A.row === B.row && A.l < B.r && B.l < A.r;
        out.push({ label, w: [Math.round(A.r - A.l), Math.round(B.r - B.l)], h: [Math.round(A.b - A.t), Math.round(B.b - B.t)], over, safe: A.l >= SAFE - 0.5 && B.r <= x.W - SAFE + 0.5 && A.l >= SAFE - 0.5 && B.l >= SAFE - 0.5 && A.r <= x.W - SAFE + 0.5,
          rows: [A.row, B.row], sides: [A.side, B.side] });
      }
      window.resetLive(); return out; })()`);
    const bad = r.filter(o => o.w.some(v => v < 48) || o.h.some(v => v < 44) || o.over || !o.safe);
    ok(bad.length === 0, `${w}${fs === '1' ? ' 1.3' : ''} ${lang}: in ${r.length} selections each grip takes at least 48 × 44 dp, the two never overlap, both keep 32 dp from the sides`, bad);
  }
  // a touch on each grip moves that end (touch, 390 and 360)
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await open(w, h);
    for (const [label, sel, va, vb] of [['short in the middle', [621, 638], 0, 0], ['short at the start', [0, 12], 0, 0], ['short at the end', [-9, 0], 0, 0]]) {
      for (const i of [0, 1]) {
        const q = await b.eval(`(() => { const x = ${X}; window.resetLive(); const L = x.L, s = ${JSON.stringify(sel)}.map(v => v < 0 || (v === 0 && ${sel[0] < 0}) ? L + v : v); x.sel = s; x.stack = [x.rootView()]; x.renderArea(); __settle(x);
          const c = x.cv.getBoundingClientRect(), r = x.gripLayout()[${i}]; return { x: c.left + r.bx + r.bw / 2, y: c.top + r.by + r.bh / 2, sel: x.sel.slice(), dir: r.side }; })()`);
        await b.touch('touchStart', q.x, q.y); await sleep(60);
        const held = await b.eval(`(() => { const x = ${X}; return { i: x._gripI, drag: !!x.dragSel }; })()`);
        await b.touch('touchEnd', q.x, q.y); await sleep(250);
        const s = await b.eval(`${X}.sel`);
        ok(held.drag && held.i === i && s && s[1 - i] === q.sel[1 - i], `${w} ${label}: a touch on the ${i ? 'end' : 'start'} grip takes that grip, the other end stays`, { held, before: q.sel, after: s });
      }
    }
  }
  // ---------------------------------------------------------------- 4 magnify
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await open(w, h);
    const q = await b.eval(`(() => { const x = ${X}; x.sel = [398, 585]; x.stack = [x.rootView()]; x.renderArea(); __settle(x); const c = x.cv.getBoundingClientRect(), r = x.gripLayout()[1]; return { x: c.left + r.bx + r.bw / 2, y: c.top + r.by + r.bh / 2, gx: c.left + x.d2x(585), span: x.view.b.v - x.view.a.v }; })()`);
    await b.touch('touchStart', q.x, q.y); await sleep(1000);
    const m = await b.eval(`(() => { const x = ${X}, c = x.cv.getBoundingClientRect(); return { span: x.view.b.v - x.view.a.v, gx: c.left + x.d2x(x.sel[1]), mag: !!x._mag, ppu: x.ppu() }; })()`);
    ok(m.mag && m.span <= q.span / 8 + 1, `${w}: a grip held still magnifies time ${(q.span / m.span).toFixed(1)}× around it`, m);
    ok(Math.abs(m.gx - q.gx) <= 6, `${w}: the grip stays where it was (${Math.round(q.gx)} → ${Math.round(m.gx)})`, m);
    for (let k = 1; k <= 6; k++) { await b.touch('touchMove', q.x - 5 * k, q.y); await sleep(20); }
    await sleep(120);
    const s1 = await b.eval(`${X}.sel[1]`);
    const want = 585 - 30 / m.ppu;
    ok(Math.abs(s1 - want) <= 1.5, `${w}: moving 30 dp moves the end by 30 dp of magnified time (${(585 - s1) / 10} s)`, { s1, want });
    await b.touch('touchEnd', q.x - 30, q.y); await sleep(1000);
    const v = await b.eval(`(() => { const x = ${X}; return { a: x.view.a.v, b: x.view.b.v, mag: !!x._mag, ov: x.geom().ovH }; })()`);
    ok(!v.mag && Math.abs(v.a) < 0.5 && Math.abs(v.b - q.span) < 0.5 && v.ov === 0, `${w}: letting go brings the whole audio back`, v);
  }
  // ---------------------------------------------------------------- 5 recording: one round main button
  for (const [w, h] of [[360, 780], [390, 844]]) for (const theme of ['light', 'dark']) {
    await open(w, h, '', theme === 'dark');
    const r = await b.eval(`(async () => { const x = ${X}; x.ph = 741; x.onTool('rec'); x.recToggle(); await __wait(400); __fin();
      const round = [...x.scr.querySelectorAll('button')].filter(e => __vis(e) && e.offsetWidth >= 48 && Math.abs(e.offsetWidth - e.offsetHeight) <= 2 && parseFloat(getComputedStyle(e).borderTopLeftRadius) >= e.offsetWidth / 2 - 1).map(e => e.className.split(' ')[0]);
      const out = { play: __vis(x.playEl), round }; x.recCancel(true); return out; })()`);
    ok(!r.play && r.round.length === 1 && r.round[0] === 'recbtn', `${w} ${theme}: while recording, play gives way and the record button is the one round main button`, r);
  }
  // ---------------------------------------------------------------- 6 export
  for (const [w, h] of [[360, 780], [390, 844]]) for (const lang of ['zh', 'en']) {
    await open(w, h, `?lang=${lang}`);
    const r = await b.eval(`(async () => { const x = ${X}; const out = {};
      const read = () => { __fin(); const rows = [...x.panelEl.querySelectorAll('.pbody > *')].filter(__vis); const main = x.panelEl.querySelector('[data-a=expGo]');
        const kind = e => e.querySelector('.seg.purpose') ? 'purpose' : e.querySelector('.qrow') ? 'quality' : e.querySelector('.seg') ? 'seg' : 'other';
        return { first: rows[0] && rows[0].querySelector('.seg.purpose') ? rows[0].querySelectorAll('.seg.purpose button').length : 0, rows: rows.map(kind), main: main ? main.textContent.trim() : null, q: (x.panelEl.querySelector('.qrow .qv') || {}).textContent }; };
      x.openExport(); await __wait(50); out.file = read();
      x.onSeg('xp', 'share'); out.share = read();
      x.onSeg('xp', 'ring'); out.ring = read();
      x.onAct('xmore', x.panelEl.querySelector('[data-a=xmore]')); out.open = { fmts: !!x.panelEl.querySelector('.seg.fmts'), inDock: x.botEl.contains(x.panelEl.querySelector('.seg.fmts')) };
      x.back(true); x.sel = [398, 585]; x.stack = [x.rootView()]; x.renderArea(); x.openExport(); out.sel = read(); x.back(true);
      window.resetLive(); return out; })()`);
    const zh = lang === 'zh';
    ok(r.file.first === 3 && /MP3/.test(r.file.main) && /MP3 · 192k/.test(r.file.q), `${w} ${lang}: export opens with the purpose (3 choices) first; the main button says "${r.file.main}"; quality "${r.file.q}"`, r.file);
    ok(/M4A/.test(r.share.main) && /M4A · 128k/.test(r.share.q), `${w} ${lang}: sharing takes M4A 128k (the last used for sharing): "${r.share.main}"`, r.share);
    ok((zh ? /铃声/ : /ringtone/i).test(r.ring.main), `${w} ${lang}: as the phone's sound the main button says "${r.ring.main}"`, r.ring);
    ok(r.open.fmts && r.open.inDock, `${w} ${lang}: the quality row opens the formats inside the dock`, r.open);
    ok(r.sel.first === 3 && r.sel.rows.join() === 'purpose,seg,quality', `${w} ${lang}: with a selection, the purpose, then all / selection, then quality`, r.sel);
    ok(r.file.rows.join() === 'purpose,quality', `${w} ${lang}: without one, two rows above the decision: the purpose and quality`, r.file);
  }
  // ---------------------------------------------------------------- 7 words
  {
    await open(360, 780, '?fs=1');
    const r = await b.eval(`(async () => { const x = ${X}, seen = new Set(); let bad = [];
      for (const c of ['ctx', 'edit', 'sound', 'add', 'more']) { x.cat = c; x.renderArea(); x.toolsEl.querySelectorAll('.act .al').forEach(e => seen.add(e.textContent)); }
      x.cat = 'ctx'; x.renderArea(); x.onTool('ld'); seen.add(x.panelEl.textContent); x.back(true); seen.add(x.chipsEl.textContent);
      x.startPlan('降噪，统一音量，删掉超过1秒的停顿'); seen.add(x.panelEl.textContent); seen.add(x.chipsEl.textContent); x.back(true);
      const all = [...seen].join(' | ');
      // 统一音量 in its cell at 360, font scale 1.3: one line, inside the cell
      x.cat = 'ctx'; x.renderArea(); await __wait(50); const cell = x.toolsEl.querySelector('.act[data-k=ld]'), al = cell && cell.querySelector('.al');
      const fit = al ? { one: al.getClientRects().length === 1 && al.offsetHeight < 30 * 1.3, inside: al.scrollWidth <= cell.clientWidth + 1 } : null;
      window.resetLive(); return { la: /拉齐/.test(all), fit }; })()`);
    ok(!r.la, 'no 拉齐 in the tool rows, the setting, the tags or the plan', r);
    ok(r.fit && r.fit.one && r.fit.inside, '统一音量 fits its cell on one line at 360, font scale 1.3', r.fit);
    await open(360, 780, '?fs=1&lang=en');
    const e = await b.eval(`(async () => { const x = ${X}; await __wait(50); const cell = x.toolsEl.querySelector('.act[data-k=ld]'), al = cell && cell.querySelector('.al'); return al ? { t: al.textContent, one: al.getClientRects().length === 1, inside: al.scrollWidth <= cell.clientWidth + 1 } : null; })()`);
    ok(e && e.one && e.inside && e.t === 'Even out', `English: "${e && e.t}" fits its cell on one line at 360, font scale 1.3`, e);
  }
  // ---------------------------------------------------------------- 8 first run
  for (const lang of ['zh', 'en']) {
    await open(390, 844, `?lang=${lang}`);
    const r = await b.eval(`(async () => { const x = ${X}; const t0 = x.slotEl.textContent.trim(), wraps0 = x.slotEl.querySelector('.sft').getClientRects().length;
      x.onTool('say'); await __wait(50); x.back(true); x.setTyping(false); await __wait(50); const t1 = x.slotEl.textContent.trim(); window.resetLive(); const t2 = x.slotEl.textContent.trim(); return { t0, t1, t2, wraps0 }; })()`);
    const want = lang === 'zh' ? '说一句' : 'Say it';
    ok(r.t0 !== want && r.t0.length > want.length && r.wraps0 === 1, `${lang}: the first time the bar shows one example ("${r.t0}") on one line`, r);
    ok(r.t1 === want, `${lang}: once used, the bar says "${r.t1}"`, r);
  }
  // ---------------------------------------------------------------- 9 常用 follows the audio
  {
    await open(390, 844);
    const r = await b.eval(`(() => { const S = window.SCENES, x = ${X}; const read = () => [...x.toolsEl.querySelectorAll('.act')].map(e => e.dataset.k);
      const speech = read(); x.reset(S.t3a.doc()); x.renderArea(true); const song = read(); window.resetLive(); return { speech, song }; })()`);
    ok(r.song[0] === 'chorus', `a song's 常用 starts with 副歌 (${r.song.slice(0, 6).join(', ')})`, r.song);
    ok(!r.speech.includes('chorus') && ['dn', 'ld', 'pauses'].every(k => r.speech.slice(0, 6).includes(k)), `a recording's 常用: ${r.speech.slice(0, 6).join(', ')}`, r.speech);
  }
  // ---------------------------------------------------------------- 10 times in the UI font
  {
    await open(390, 844);
    const r = await b.eval(`(async () => { const x = ${X}, f = e => e ? getComputedStyle(e) : null;
      const rd = cs => cs && { fam: cs.fontFamily, num: cs.fontVariantNumeric };
      const tm = rd(f(x.tmEl)); x.ph = 741; x.onTool('rec'); await __wait(30); const rc = rd(f(x.panelEl.querySelector('.rectime'))); x.recCancel(true);
      x.openExport(); x.expGo(); const pc = rd(f(x.panelEl.querySelector('.pct'))); x.back(true);
      window.resetLive(); return [tm, rc, pc]; })()`);
    ok(r.every(o => o && !/mono/i.test(o.fam) && /tabular/.test(o.num)), 'the time tag, the recording clock and the export percentage use the UI font with tabular figures', r);
  }
  // ---------------------------------------------------------------- 11 v12.1: the ruler belongs to the sound
  for (const [w, h] of [[360, 780], [390, 844]]) for (const fs of ['0', '1']) for (const theme of ['light', 'dark']) {
    await open(w, h, `?fs=${fs}`, theme === 'dark');
    const r = await b.eval(`(async () => { const x = ${X}, S = window.SCENES, out = [];
      const read = label => { __fin(); __settle(x); x.draw(); const g = x.geom(), cols = x._cols || [];
        const tallest = Math.min(...cols.map(c => g.mid - Math.min(1, c[1]) * g.amp * g.barScale));
        const tm = x.tmEl.getBoundingClientRect(), c = x.cv.getBoundingClientRect(), tmT = tm.top - c.top, tmB = tm.bottom - c.top;
        // the sound's top is the tallest bar this recording draws at this zoom (wherever it is scrolled, so the ruler
        // never bobs while scrolling); for a recording this short it is also the tallest bar in view
        const docTop = g.mid - g.pk * g.amp;
        out.push({ label, rTop: g.rTop, rBot: g.rBot, tallest: Math.round(tallest), inView: Math.round(tallest - g.rBot), gap: Math.round(docTop - g.rBot), pill: tmT >= g.rTop - 1 && tmB <= g.rBot + 1, ovAbove: !g.ovH || g.ovY + g.ovH <= g.rTop, short: x.L < 3000 }); };
      window.resetLive(); read('rest');
      x.sel = [398, 585]; x.stack = [x.rootView()]; x.renderArea(); read('selection');
      window.resetLive(); x.onTool('dn'); read('denoise open');
      window.resetLive(); x.openExport(); read('export open');
      window.resetLive(); x.ph = 741; x.startRec(); x.rec.len = 60; x.rec.running = true; x.gap.w = 60; x.view.b.snap(x.L + 60); x.renderArea(); read('recording'); x.recCancel(true);
      window.resetLive(); x.startPlan('降噪，统一音量，删掉超过1秒的停顿'); read('plan'); x.back(true);
      window.resetLive(); x.view.a.snap(500); x.view.b.snap(800); read('zoomed in');
      x.reset(S.kTracks5.doc()); x.stack = [x.rootView()]; x.renderArea(true); read('five tracks');
      x.reset(S.kTracks8.doc()); x.stack = [x.rootView()]; x.renderArea(true); read('eight tracks');
      x.reset(S.kLong.doc()); x.view.a.snap(37000); x.view.b.snap(37600); x.renderArea(true); read('the meeting, zoomed');
      window.resetLive(); return out; })()`);
    const bad = r.filter(o => o.gap < 4 || o.gap > 24 || (o.short && (o.inView < 4 || o.inView > 24)) || !o.pill || !o.ovAbove);
    ok(bad.length === 0, `${w}${fs === '1' ? ' 1.3' : ''} ${theme}: in ${r.length} states the ruler sits 4–24 dp above the sound's tallest bar (in view: ${r.map(o => o.inView).join(', ')}), the time pill on it, the overview strip above it`, bad);
  }
  // the ruler still seeks (tap) and scrolls (drag) where it now is; the air above it acts as v12's sky did
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await open(w, h);
    const g = await b.eval(`(() => { const x = ${X}; x.view.a.snap(400); x.view.b.snap(700); x.kick(); __settle(x); const c = x.cv.getBoundingClientRect(), g = x.geom(); return { cx: c.left, cy: c.top, W: x.W, rTop: g.rTop, rBot: g.rBot, ph: x.ph }; })()`);
    const y = g.cy + (g.rTop + g.rBot) / 2;
    await b.touch('touchStart', g.cx + 200, y); await sleep(40); await b.touch('touchEnd', g.cx + 200, y); await sleep(250);
    const t = await b.eval(`(() => { const x = ${X}; return { ph: x.ph, a: x.view.a.v }; })()`);
    ok(Math.abs(t.ph - (400 + (200 - 40) / (g.W - 80) * 300)) < 6, `${w}: a tap on the ruler puts the playhead there (${t.ph})`, t);
    // (the time pill is a button on the ruler at the playhead; the drag starts clear of it)
    const x0 = g.cx + g.W - 60; await b.touch('touchStart', x0, y); for (let k = 1; k <= 8; k++) { await b.touch('touchMove', x0 - 12 * k, y); await sleep(16); } await b.touch('touchEnd', x0 - 96, y); await sleep(250);
    const d = await b.eval(`(() => { const x = ${X}; return { a: x.view.a.v, sel: x.sel }; })()`);
    ok(d.a > 420 && !d.sel, `${w}: a drag along the ruler scrolls the view (${Math.round(d.a)}) and selects nothing`, d);
    await b.touch('touchStart', g.cx + 200, g.cy + Math.max(4, g.rTop - 40)); await sleep(40); await b.touch('touchEnd', g.cx + 200, g.cy + Math.max(4, g.rTop - 40)); await sleep(250);
    const n = await b.eval(`(() => { const x = ${X}; return { ph: x.ph, sel: x.sel, a: x.view.a.v }; })()`);
    ok(Math.abs(n.ph - (n.a + (200 - 40) / (g.W - 80) * 300)) < 6 && !n.sel, `${w}: a tap in the air above the ruler places the playhead, as the sky above the sound did in v12`, n);
  }
  // ---------------------------------------------------------------- 12 v12.1: tracks sit up under the main line
  for (const [w, h] of [[360, 780], [390, 844]]) for (const fs of ['0', '1']) {
    await open(w, h, `?fs=${fs}`);
    const r = await b.eval(`(async () => { const x = ${X}, S = window.SCENES, out = [];
      for (const [label, doc] of [['one track', S.kTrackRow.doc()], ['five tracks', S.kTracks5.doc()], ['eight tracks', S.kTracks8.doc()]]) {
        x.reset(doc); x.laneOff = 0; x.stack = [x.rootView()]; x.renderArea(true); __fin(); __settle(x);
        const g0 = x.geom(), lane0 = g0.laneTop;
        for (const sel of [[0, 118], [398, 585], [x.L - 90, x.L], [700, 716]]) {
          x.sel = sel; x.stack = [x.rootView()]; x.renderArea(); __fin(); __settle(x); x.draw();
          const g = x.geom(), q = x.gripLayout(), c = x.cv.getBoundingClientRect();
          const labels = [...x.labelsEl.querySelectorAll('.tlabel')].map(e => { const r = e.getBoundingClientRect(); return [r.left - c.left, r.top - c.top, r.right - c.left, r.bottom - c.top]; });
          const coverLabel = q.some(k => labels.some(([l, t, r, b]) => k.l < r && k.r > l && k.t < b && k.b > t) || labels.some(([l, t, r, b]) => k.bx < r && k.bx + k.bw > l && k.by < b && k.by + k.bh > t));
          const aboveLane = q.every(k => k.b <= g.laneTop - 1 && k.by + k.bh <= g.laneTop);
          out.push({ label, sel, gap: g.laneTop - g.bandBot, moved: g.laneTop !== lane0, coverLabel, aboveLane, size: q.map(k => [Math.round(k.r - k.l), Math.round(k.b - k.t)]) });
        }
        x.sel = null; x.stack = [x.rootView()]; x.renderArea(); __settle(x); out.push({ label: label + ', let go', gap: x.geom().laneTop - x.geom().bandBot, moved: x.geom().laneTop !== lane0, coverLabel: false, aboveLane: true, size: [[48, 44], [48, 44]] });
      }
      window.resetLive(); return out; })()`);
    const bad = r.filter(o => o.gap > 12 || o.moved || o.coverLabel || !o.aboveLane || o.size.some(([a, bb]) => a < 48 || bb < 44));
    ok(bad.length === 0, `${w}${fs === '1' ? ' 1.3' : ''}: with tracks the first one sits ${r[0].gap} dp under the main line, does not move when a selection comes or goes, and the grips (48 × 44 dp or more) hang over the echo, above the first track and clear of its label`, bad);
  }
  // with eight tracks at 360, a touch on a grip takes the grip, not the track under it
  {
    await open(360, 780);
    for (const i of [0, 1]) {
      const q = await b.eval(`(() => { const x = ${X}, S = window.SCENES; x.reset(S.kTracks8.doc()); x.laneOff = 0; x.sel = [398, 585]; x.stack = [x.rootView()]; x.renderArea(true); __fin(); __settle(x);
        const c = x.cv.getBoundingClientRect(), r = x.gripLayout()[${i}]; return { x: c.left + (r.l + r.r) / 2, y: c.top + r.b - 3 }; })()`);
      await b.touch('touchStart', q.x, q.y); await sleep(60);
      const held = await b.eval(`(() => { const x = ${X}; return { i: x._gripI, drag: !!x.dragSel, track: x.track }; })()`);
      await b.touch('touchEnd', q.x, q.y); await sleep(250);
      ok(held.drag && held.i === i && !held.track, `360, eight tracks: a touch at the foot of the ${i ? 'end' : 'start'} grip's area takes the grip, not the track`, held);
    }
    const m = await b.eval(`(async () => { const x = ${X}; window.resetLive(); x.sel = [398, 585]; x.stack = [x.rootView()]; x.renderArea(); __settle(x); const r0 = x.geom().rTop;
      x.magnify({ i: 1, last: { x: x.d2x(585) }, p0: { x: x.d2x(585) } }); await __wait(700); x.draw(); const r1 = x.geom().rTop, top = Math.min(...(x._cols || []).map(c => x.geom().mid - Math.min(1, c[1]) * x.geom().amp * x.geom().barScale));
      x.unmagnify(); await __wait(700); x.draw(); const r2 = x.geom().rTop; window.resetLive(); return { r0, r1, r2, top: Math.round(top), rBot: r1 + x.geom().ruler }; })()`);
    ok(m.r0 === m.r1 && m.r1 === m.r2 && m.top >= m.rBot, `while a grip magnifies, the ruler stays where it was (${m.r0} → ${m.r1} → ${m.r2}) and the bars stay under it`, m);
  }
  console.log('page errors:', JSON.stringify(b.errors.filter(e => !/ERR_FILE/.test(e))));
  ok(b.errors.filter(e => !/ERR_FILE/.test(e)).length === 0, 'no page errors');
} finally { await b.close(); }
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
