// Drives the v3 live phone with touch (or mouse) input through every flow, checking state after each step.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const MODE = process.argv[4] || 'touch';
const TOUCH = MODE !== 'mouse';
fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
let fails = 0;
const ok = (cond, msg, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
try {
  if (TOUCH) await b.viewport(390, 844, true, 2, false); else await b.viewport(1440, 900, false, 1, false);
  if (MODE === 'reduced') await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(700);
  await b.eval(`document.querySelector('.scr[data-scene=live]').scrollIntoView({block:'start'})`); await sleep(300);
  const st = () => b.eval(`(() => { const x = document.querySelector('.scr[data-scene=live]')._bench; return { L: x.L, ph: Math.round(x.ph), sel: x.sel, view: x.scr.dataset.view, depth: x.stack.length, hist: x.hist.length, hi: x.hi, label: x.hist[x.hi].label, layers: x.doc.layers.map(l => l.k + ':' + (l.v instanceof Set ? [...l.v] : JSON.stringify(l.v))), tracks: x.doc.tracks.map(t => t.name + '/g' + t.gain + (t.duck ? '/duck' + t.duckTo : '')), hand: x.hand ? x.hand.at : null, plan: x.plan ? x.plan.steps.map(s => s.k + (s.on ? '' : '-off')) : null, exp: x.exp ? x.exp.stage : null, modal: !!x.mhost.innerHTML, pieces: x.doc.pieces.length, va: Math.round(x.view.a.v), vb: Math.round(x.view.b.v), compare: x.compareHold, rec: x.rec ? Math.round(x.rec.len) : null, lead: x.leadEl.textContent.trim() }; })()`);
  const geo = () => b.eval(`(() => { const x = document.querySelector('.scr[data-scene=live]')._bench, c = x.cv.getBoundingClientRect(), g = x.geom(); return { cx: c.left, cy: c.top, W: x.W, IW: x.IW, va: x.view.a.v, vb: x.view.b.v, mainY: g.mainY, mainH: g.mainH, lanes: g.lanes.map(l => [l.y, l.h]) }; })()`);
  const X = (g, u) => g.cx + 40 + (u - g.va) / (g.vb - g.va) * g.IW;
  const midY = g => g.cy + g.mainY + g.mainH * 0.45;
  const down = (x, y) => TOUCH ? b.touch('touchStart', x, y) : b.mouse('mousePressed', x, y);
  const move = (x, y) => TOUCH ? b.touch('touchMove', x, y) : b.mouse('mouseMoved', x, y);
  const up = (x, y) => TOUCH ? b.touch('touchEnd', x, y) : b.mouse('mouseReleased', x, y);
  const tapAt = async (x, y) => { await down(x, y); await sleep(50); await up(x, y); await sleep(220); };
  const drag = async (x0, y0, x1, y1, n = 14, holdEnd = 0) => { await down(x0, y0); await sleep(30); for (let i = 1; i <= n; i++) { await move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); await sleep(20); } await sleep(60 + holdEnd); await up(x1, y1); await sleep(350); };
  const tapSel = async (sel) => {
    const r = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene=live]').querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({block:'nearest', inline:'nearest'}); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()`);
    if (!r) { ok(false, 'element exists: ' + sel); return false; }
    await tapAt(r.x, r.y); await sleep(250); return true;
  };
  const shot = async name => { const r = await b.eval(`(() => { const q = document.querySelector('.scr[data-scene=live]').getBoundingClientRect(); return { x: q.left + scrollX, y: q.top + scrollY, width: q.width, height: q.height }; })()`); await b.shot(path.join(OUT, `${MODE}-${name}.png`), r, false); };
  const tool = k => tapSel(`.area [data-a=tool][data-k=${k}]`);
  const back = () => tapSel('.tp [data-a=back]');
  const setView = (a, bb) => b.eval(`(() => { const x = document.querySelector('.scr[data-scene=live]')._bench; x.view.a.snap(${a}); x.view.b.snap(${bb}); x.kick(); return true; })()`);
  /** Every touch target on the phone, with the part that takes a touch (scrolled-away parts don't count). */
  const targetsCheck = async (label) => {
    const r = await b.eval(`(() => {
      const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench, sr = scr.getBoundingClientRect(), out = [];
      scr.querySelectorAll('[data-a], [data-hold], .sld .tr').forEach(e => {
        if (e.closest('.edge') || e.closest('.mhost')) return;
        let q = e.getBoundingClientRect(); if (!q.width || !q.height) return;
        let l = q.left, r = q.right;
        for (let p = e.parentElement; p && p !== scr; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.overflowX !== 'visible') { const pq = p.getBoundingClientRect(); l = Math.max(l, pq.left); r = Math.min(r, pq.right); } }
        if (r - l < 1) return;
        out.push({ k: (e.dataset.a || 'slider') + (e.dataset.k ? ':' + e.dataset.k : ''), l: Math.round(l - sr.left), r: Math.round(sr.right - r) });
      });
      x.targets().forEach(t => out.push({ k: 'canvas:' + t.kind, l: Math.round(t.l), r: Math.round(x.W - t.r) }));
      const minL = Math.min(...out.map(o => o.l)), minR = Math.min(...out.map(o => o.r));
      return { n: out.length, minL, minR, worst: out.filter(o => o.l < 32 || o.r < 32).slice(0, 6), canvas: out.filter(o => o.k.startsWith('canvas')) };
    })()`);
    ok(r.minL >= 24 && r.minR >= 24, `${label}: no touch target starts inside the 24 dp strips (${r.n} targets, nearest ${r.minL} / ${r.minR} dp)`, r.worst);
    ok(r.minL >= 32 && r.minR >= 32, `${label}: every target keeps the 32 dp inset`, r.worst);
    return r;
  };

  let s = await st(); ok(s.view === 'strip:rest' && s.L === 1610, 'opens at rest', s);
  let g = await geo();
  await tapAt(X(g, 500), midY(g)); s = await st(); ok(Math.abs(s.ph - 500) <= 6 && !s.sel, 'tap places the playhead at 0:50', s.ph);
  // select by dragging
  await drag(X(g, 315), midY(g), X(g, 440), midY(g)); s = await st();
  ok(s.sel && Math.abs(s.sel[0] - 315) <= 8 && Math.abs(s.sel[1] - 440) <= 8 && s.view === 'strip:range', 'horizontal drag selects 0:31.5–0:44', s.sel);
  ok(s.lead.includes('12.5') && s.lead.includes('0:31.5'), 'the bar leads with the selection and a way back', s.lead);
  await shot('01-selected');
  // ---- edges: select exactly to the start and the end with touches that start well inside
  await drag(X(g, 300), midY(g), g.cx + 30, midY(g)); s = await st(); ok(s.sel && s.sel[0] === 0, 'dragging past the start selects exactly from 0 (touch began at ' + Math.round(X(g, 300) - g.cx) + ' dp, ended at 30 dp)', s.sel);
  await drag(X(g, 300), midY(g), g.cx + 8, midY(g)); s = await st(); ok(s.sel && s.sel[0] === 0, 'ending inside the strip is fine: still exactly 0', s.sel);
  await drag(X(g, 1300), midY(g), g.cx + g.W - 30, midY(g)); s = await st(); ok(s.sel && s.sel[1] === 1610, 'dragging past the end selects exactly to the end', s.sel);
  await targetsCheck('fitted view, selection to the end');
  await drag(X(g, 0) + 60, midY(g), X(g, 0) + 120, midY(g)); s = await st();
  // the start handle at the fitted view: hit area kept in
  await b.eval(`(() => { const x = document.querySelector('.scr[data-scene=live]')._bench; x.sel = [0, 200]; x.resetStack(); return 1; })()`); await sleep(200); g = await geo();
  const hy = g.cy + g.mainY + g.mainH - 13;
  await drag(g.cx + 36, hy, X(g, 120), hy); s = await st(); ok(s.sel && s.sel[0] >= 100 && s.sel[1] === 200, 'the start handle at the very start is grabbed from 36 dp and moves', s.sel);
  await drag(X(g, 120), hy, g.cx + 30, hy); s = await st(); ok(s.sel && s.sel[0] === 0, 'and dragged back past the start snaps to exactly 0', s.sel);
  await targetsCheck('fitted view, selection from the start');
  // zoomed in: the view scrolls when the finger stays near a side, so the start and end are reachable without the bezel
  await setView(500, 800); await sleep(200); g = await geo();
  await drag(g.cx + 250, midY(g), g.cx + 52, midY(g), 14, 3000); s = await st();
  ok(s.va === 0 && s.sel && s.sel[0] === 0, 'zoomed in: holding 52 dp from the left scrolls to the start and selects to 0', { va: s.va, sel: s.sel });
  await shot('02-zoomed-start');
  await targetsCheck('zoomed in at the start');
  await setView(800, 1100); await sleep(200); g = await geo();
  await drag(g.cx + 120, midY(g), g.cx + g.W - 52, midY(g), 14, 3000); s = await st();
  ok(s.vb === 1610 && s.sel && s.sel[1] === 1610, 'zoomed in: holding 52 dp from the right scrolls to the end and selects to the end', { vb: s.vb, sel: s.sel });
  await targetsCheck('zoomed in at the end');
  await shot('03-zoomed-end');
  await setView(0, 1610); await sleep(200); g = await geo();
  // an edge swipe is the system's Back, not a selection
  await b.eval(`(() => { const x = document.querySelector('.scr[data-scene=live]')._bench; x.sel = [315, 440]; x.resetStack(); return 1; })()`); await sleep(150);
  if (TOUCH) { await drag(g.cx + 6, midY(g), g.cx + 120, midY(g)); s = await st(); ok(!s.sel && s.view === 'strip:rest', 'a swipe from the left edge is system Back (lets go of the selection), not a new selection', s); }
  else { await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(250); s = await st(); ok(!s.sel && s.view === 'strip:rest', 'Esc (system Back) lets go of the selection', s); }
  // delete, undo, redo
  g = await geo();
  await drag(X(g, 315), midY(g), X(g, 440), midY(g)); s = await st(); const selLen = s.sel[1] - s.sel[0];
  await tool('del'); await sleep(500); s = await st(); ok(s.L === 1610 - selLen && s.view === 'strip:rest', 'delete closes the gap', s.L);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.L === 1610, 'undo restores', s.L);
  await tapSel('[data-a=redo]'); s = await st(); ok(s.L === 1610 - selLen, 'redo deletes again', s.L);
  await tapSel('[data-a=undo]'); await sleep(400);
  // keep
  g = await geo(); await drag(X(g, 315), midY(g), X(g, 440), midY(g));
  await tool('keep'); await sleep(700); s = await st(); ok(s.L === selLen && s.pieces === 1, 'keep leaves only the selection', s.L);
  await tapSel('[data-a=undo]'); await sleep(500); s = await st(); ok(s.L === 1610, 'undo keep', s.L);
  // hold and drag the selection
  g = await geo(); await drag(X(g, 315), midY(g), X(g, 440), midY(g)); s = await st(); const a0 = s.sel[0], b0 = s.sel[1];
  const xh = X(g, (a0 + b0) / 2);
  await down(xh, midY(g)); await sleep(650); s = await st(); ok(s.hand !== null, 'long press lifts the selection', s.hand);
  const target = X(g, 900);
  for (let i = 1; i <= 20; i++) { await move(xh + (target - xh) * i / 20, midY(g)); await sleep(25); }
  await sleep(300); await shot('04-lifted');
  await up(target, midY(g)); await sleep(500);
  s = await st(); ok(s.L === 1610 && s.label.startsWith('移动') && s.sel && s.sel[0] > 700, 'drop moves it (one step, same length)', { label: s.label, sel: s.sel });
  await tapSel('[data-a=undo]'); await sleep(400); s = await st(); ok(s.hi === 0, 'undo the move', s.hi);
  // move with the button: Put it here is the decision; back puts it back
  g = await geo(); await drag(X(g, 100), midY(g), X(g, 180), midY(g));
  await tool('move'); s = await st(); ok(s.view === 'hand' && s.lead.includes('移动'), 'Move opens its level', s.lead);
  await tapAt(X(g, 1400), midY(g)); s = await st(); ok(s.hand > 1200, 'tap chooses where it goes', s.hand);
  await shot('05-hand');
  await back(); s = await st(); ok(s.hand === null && s.hi === 0 && s.sel && s.sel[0] === 100, 'back puts it back where it was', s);
  await tool('move'); await tapAt(X(g, 1400), midY(g)); await tapSel('.area [data-a=handOk]'); await sleep(400); s = await st(); ok(s.label.startsWith('移动') && s.L === 1610, '"放这里" puts it there', s.label);
  await tapSel('[data-a=undo]'); await sleep(300);
  await tapAt(X(g, 1200), midY(g)); s = await st(); ok(!s.sel && s.view === 'strip:rest', 'tap outside lets go', s.view);
  await drag(X(g, 600), midY(g) - 60, X(g, 610), midY(g) + 90, 10); s = await st(); ok(!s.sel, 'vertical swipe does not select', s.sel);
  await b.eval(`document.querySelector('.scr[data-scene=live]').scrollIntoView({block:'start'})`); await sleep(300); g = await geo();
  // ---- a setting is live, survives leaving, and is one step to undo
  const h0 = (await st()).hi;
  await tool('sound'); s = await st(); ok(s.view === 'strip:sound' && s.lead.includes('声音'), 'Sound is a level of the bar, its name at the leading end', s.lead);
  await tool('dn'); s = await st(); ok(s.view === 'p:dn' && s.layers.join() === 'dn:2', 'opening Denoise puts it on at once', s.layers);
  await shot('06-denoise');
  await tapSel('.area [data-a=stop][data-i="3"]'); await sleep(200); await tapSel('.area [data-a=stop][data-i="4"]'); await sleep(700); s = await st();
  ok(s.layers.join() === 'dn:4' && s.hi === h0 + 1, 'changes take effect as made, and stay one history step', { layers: s.layers, hi: s.hi });
  const hold = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene=live] [data-hold]'); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()`);
  await down(hold.x, hold.y); await sleep(200); s = await st(); ok(s.compare === true, 'hold compares with the original', s.compare); await up(hold.x, hold.y); await sleep(200);
  await back(); s = await st(); ok(s.view === 'strip:sound' && s.layers.join() === 'dn:4', 'leaving the level keeps the setting', s);
  await back(); s = await st(); ok(s.view === 'strip:rest', 'back again: the first row', s.view);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.layers.length === 0 && s.hi === 0, 'one undo takes the whole visit back', s);
  await tapSel('[data-a=redo]'); s = await st(); ok(s.layers.join() === 'dn:4', 'redo', s.layers);
  await tapSel('.lchips [data-a=chip]'); s = await st(); ok(s.view === 'p:dn', 'the tag reopens it', s.view);
  await tapSel('.area [data-a=stop][data-i="1"]'); await sleep(600); s = await st(); ok(s.layers.join() === 'dn:1' && s.label.includes('→'), 'adjusted afterwards', s.label);
  await back(); await tapSel('[data-a=undo]'); s = await st(); ok(s.layers.join() === 'dn:4', 'one undo returns the earlier strength', s.layers);
  await tapSel('.lchips [data-a=chip]'); await tapSel('.area [data-a=rmlayer]'); s = await st(); ok(s.layers.length === 0 && s.label.startsWith('去掉') && s.view === 'strip:rest', 'its own "去掉" removes it', s);
  await tapSel('[data-a=undo]'); await tapSel('[data-a=undo]'); s = await st(); ok(s.hi === 0 && s.layers.length === 0, 'undo all the way', s);
  if (TOUCH) { await tool('sound'); await tool('dn'); g = await geo(); await drag(g.cx + 5, midY(g), g.cx + 140, midY(g)); s = await st(); ok(s.view === 'strip:sound' && s.layers.join() === 'dn:2', 'edge swipe in a level: back one level, setting kept', s); await drag(g.cx + g.W - 5, midY(g), g.cx + g.W - 140, midY(g)); s = await st(); ok(s.view === 'strip:rest', 'right-edge swipe: back again', s.view); await tapSel('[data-a=undo]'); }
  // ---- add music as a second track; track volume live, one step
  await tool('add'); await tool('music'); await tool('mlib'); s = await st(); ok(s.view === 'list', 'music list in the bar', s.view);
  await tapSel('.area [data-a=pickLib][data-i="0"]'); await sleep(300); s = await st(); ok(s.tracks.length === 1 && s.view === 'strip:track', 'music becomes a track, its tools show', s);
  await shot('07-music');
  const hm = s.hi;
  await tool('tvol');
  const tr = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene=live] .sld[data-sl=tvol] .tr'); const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, y: q.top + q.height / 2 }; })()`);
  await drag(tr.l + (tr.r - tr.l) * 0.4, tr.y, tr.l + (tr.r - tr.l) * 0.2, tr.y, 8); s = await st();
  ok(s.tracks[0].includes('/g0.3') && s.hi === hm + 1, 'dragging the volume is live and one step', { tracks: s.tracks, hi: s.hi });
  await back(); s = await st(); ok(s.view === 'strip:track' && s.tracks[0].includes('/g0.3'), 'leaving keeps it', s.tracks);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.tracks[0].includes('/g0.6'), 'one undo restores the volume', s.tracks);
  await tool('duck'); await tapSel('.area .sld[data-sl=duckTo] .tr'); await back(); s = await st(); ok(s.tracks[0].includes('/duck0.5'), 'duck level set by a tap, kept on leaving', s.tracks);
  await tapSel('[data-a=undo]'); g = await geo();
  await tapAt(X(g, 800), midY(g)); s = await st(); ok(s.view === 'strip:rest', 'tap the voice: back to rest with two lanes', s.view);
  await shot('08-two-lanes');
  const ln = g.lanes[0]; await tapAt(X(g, 600), g.cy + ln[0] + ln[1] / 2); s = await st(); ok(s.view === 'strip:track', 'tap the music lane selects it', s.view);
  await back(); s = await st(); ok(s.view === 'strip:rest', 'back lets go of the track', s.view);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.tracks.length === 0, 'undo the music', s.tracks);
  // ---- one sentence: Apply is the decision; back drops the plan
  await tool('say'); s = await st(); ok(s.view === 'say', 'Say opens in the bar', s.view);
  await tapSel('.area [data-a=ex][data-x="剪掉开头5秒，结尾淡出3秒，导出MP3"]'); await sleep(300); s = await st();
  ok(s.view === 'plan' && JSON.stringify(s.plan) === '["head","fo","export"]', 'the plan: steps in the bar, marks on the audio', s.plan);
  await shot('09-plan');
  await back(); s = await st(); ok(!s.plan && s.view === 'strip:rest' && s.hi === 0, 'back drops the plan, nothing changed', s);
  await tool('say'); await tapSel('.area [data-a=ex][data-x="剪掉开头5秒，结尾淡出3秒，导出MP3"]'); await sleep(200);
  await tapSel('[data-a=undo]'); s = await st(); ok(!s.plan && s.hi === 0, 'undo also drops a pending plan first', s);
  await tool('say'); await tapSel('.area [data-a=ex][data-x="剪掉开头5秒，结尾淡出3秒，导出MP3"]'); await sleep(200);
  await tapSel('.area .seg [data-a=seg][data-k=after][data-v="1"]'); s = await st(); ok(s.L === 1610, 'switch to after (not applied)', s.L);
  await tapSel('.area [data-a=stepOn][data-i="1"]'); s = await st(); ok(JSON.stringify(s.plan) === '["head","fo-off","export"]', 'a step can be dropped', s.plan);
  await tapSel('.area [data-a=stepOn][data-i="1"]'); await tapSel('.area [data-a=stepN][data-i="0"][data-d="1"]'); await sleep(200);
  await tapSel('.area [data-a=apply]'); await sleep(500); s = await st(); ok(s.L === 1610 - 60 && s.view === 'export' && s.label.startsWith('按这句话改'), '"应用": one step, then export preselected', s);
  await shot('10-export');
  await tapSel('.area [data-a=expGo]'); await sleep(1700); s = await st(); ok(s.modal, 'system save sheet after generating', s);
  await shot('11-system-save');
  await tapSel('.mhost [data-a=sysSave]'); s = await st(); ok(s.exp === 'done' && !s.modal, 'saved', s.exp);
  await back(); s = await st(); ok(s.view === 'strip:rest', 'back to rest', s.view);
  await tapSel('[data-a=undo]'); await sleep(400); s = await st(); ok(s.L === 1610 && s.hi === 0, 'undo the sentence in one step', s.L);
  // ---- recording: the main button records; "完成" is the decision; back keeps nothing in the audio
  g = await geo(); await tapAt(X(g, 600), midY(g));
  await tool('add'); await tool('rec'); s = await st(); ok(s.view === 'rec', 'recorder level', s.view);
  await tapSel('[data-a=play]'); await sleep(1300); s = await st(); ok(s.rec > 8, 'the main button records at the playhead', s.rec);
  await shot('12-recording');
  await tapSel('.area [data-a=recOk]'); await sleep(300); s = await st(); ok(s.L > 1610 && s.label.startsWith('录音') && s.sel && s.sel[0] === 600, '"完成" lands it where the playhead was', s);
  await tapSel('[data-a=undo]'); await sleep(300); s = await st(); ok(s.L === 1610, 'undo the recording', s.L);
  await tool('add'); await tool('rec'); await tapSel('[data-a=play]'); await sleep(600); await back(); s = await st(); ok(s.L === 1610 && s.rec === null && s.view === 'strip:rest', 'back from a take leaves the audio unchanged', s);
  // ---- pinch zoom and fit
  if (TOUCH) {
    g = await geo(); const y = midY(g);
    await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.cx + 150, y, id: 1 }, { x: g.cx + 230, y, id: 2 }] }); await sleep(40);
    for (let i = 1; i <= 8; i++) { await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.cx + 150 - i * 10, y, id: 1 }, { x: g.cx + 230 + i * 10, y, id: 2 }] }); await sleep(25); }
    await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
    s = await st(); ok(s.vb - s.va < 1610 * 0.6 && !s.sel, 'pinch zooms, no selection', [s.va, s.vb]);
    await tapSel('[data-a=time]'); await tool('fit'); await sleep(900); s = await st(); ok(s.va === 0 && s.vb === 1610, 'Fit shows it all', [s.va, s.vb]);
    await back();
  }
  // ---- pauses
  await tool('edit'); await tool('pauses'); s = await st(); ok(s.view === 'pauses', 'pauses marked', s.view);
  await tapSel('.area [data-a=pausesGo]'); await sleep(600); s = await st(); ok(s.L < 1610 && s.label.includes('停顿'), 'pauses removed in one step', s.L);
  await tapSel('[data-a=undo]'); await sleep(300);
  s = await st(); ok(s.L === 1610 && s.hi === 0, 'clean at the end', s);
  console.log('page errors:', JSON.stringify(b.errors));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
} finally { await b.close(); }
