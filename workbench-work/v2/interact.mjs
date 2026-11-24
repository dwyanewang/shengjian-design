// Drives the live phone with touch (or mouse) input through every flow, checking state after each step.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const MODE = process.argv[4] || 'touch';
fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
let fails = 0;
const ok = (cond, msg, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
try {
  if (MODE === 'touch') await b.viewport(390, 844, true, 2, false); else await b.viewport(1440, 900, false, 1, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(700);
  await b.eval(`document.querySelector('.scr[data-scene=live]').scrollIntoView({block:'start'})`); await sleep(300);
  const st = () => b.eval(`(() => { const x = document.querySelector('.scr[data-scene=live]')._bench; return { L: x.L, ph: Math.round(x.ph), sel: x.sel, view: x.scr.dataset.view, hist: x.hist.length, hi: x.hi, label: x.hist[x.hi].label, layers: x.doc.layers.map(l => l.k + ':' + (l.v instanceof Set ? [...l.v] : JSON.stringify(l.v))), tracks: x.doc.tracks.map(t => t.name + (t.duck ? '/duck' + t.duckTo : '')), work: x.work ? x.work.layer.k + ':' + x.work.layer.v : null, hand: x.hand ? x.hand.at : null, plan: x.plan ? x.plan.steps.map(s => s.k + (s.on ? '' : '-off')) : null, exp: x.exp ? x.exp.stage : null, modal: !!x.mhost.innerHTML, pieces: x.doc.pieces.length, va: Math.round(x.view.a.v), vb: Math.round(x.view.b.v), compare: x.compareHold, rec: x.rec ? Math.round(x.rec.len) : null }; })()`);
  const geo = () => b.eval(`(() => { const x = document.querySelector('.scr[data-scene=live]')._bench, c = x.cv.getBoundingClientRect(), g = x.geom(); return { cx: c.left, cy: c.top, W: x.W, va: x.view.a.v, vb: x.view.b.v, mainY: g.mainY, mainH: g.mainH, lanes: g.lanes.map(l => [l.y, l.h]) }; })()`);
  const X = (g, u) => g.cx + (u - g.va) / (g.vb - g.va) * g.W;
  const midY = g => g.cy + g.mainY + g.mainH * 0.45;
  const down = async (x, y) => MODE === 'touch' ? b.touch('touchStart', x, y) : b.mouse('mousePressed', x, y);
  const move = async (x, y) => MODE === 'touch' ? b.touch('touchMove', x, y) : b.mouse('mouseMoved', x, y);
  const up = async (x, y) => MODE === 'touch' ? b.touch('touchEnd', x, y) : b.mouse('mouseReleased', x, y);
  const tapAt = async (x, y) => { await down(x, y); await sleep(50); await up(x, y); await sleep(220); };
  const drag = async (x0, y0, x1, y1, n = 14, hold = 0) => { await down(x0, y0); await sleep(hold || 30); for (let i = 1; i <= n; i++) { await move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); await sleep(20); } await sleep(60); await up(x1, y1); await sleep(350); };
  const tapSel = async (sel) => {
    const r = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene=live]').querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({block:'nearest', inline:'nearest'}); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()`);
    if (!r) { ok(false, 'element exists: ' + sel); return false; }
    await tapAt(r.x, r.y); await sleep(250); return true;
  };
  const shot = async name => { const r = await b.eval(`(() => { const q = document.querySelector('.scr[data-scene=live]').getBoundingClientRect(); return { x: q.left + scrollX, y: q.top + scrollY, width: q.width, height: q.height }; })()`); await b.shot(path.join(OUT, `${MODE}-${name}.png`), r, false); };
  const tool = k => tapSel(`.area [data-a=tool][data-k=${k}]`);

  let s = await st(); ok(s.view === 'strip:rest' && s.L === 1610, 'opens at rest', s);
  let g = await geo();
  // 1 playhead
  await tapAt(X(g, 500), midY(g)); s = await st(); ok(Math.abs(s.ph - 500) <= 6 && !s.sel, 'tap places the playhead at 0:50', s.ph);
  // 2 select by dragging
  await drag(X(g, 315), midY(g), X(g, 440), midY(g)); s = await st();
  ok(s.sel && Math.abs(s.sel[0] - 315) <= 8 && Math.abs(s.sel[1] - 440) <= 8 && s.view === 'strip:range', 'horizontal drag selects 0:31.5–0:44', s.sel);
  await shot('01-selected');
  // vertical drag does not select (page scroll gets it)
  // 3 delete + undo/redo
  const selLen = s.sel[1] - s.sel[0];
  await tool('del'); await sleep(500); s = await st(); ok(s.L === 1610 - selLen && s.view === 'strip:rest' && s.hist === 2, 'delete closes the gap', s.L);
  await shot('02-deleted');
  await tapSel('[data-a=undo]'); s = await st(); ok(s.L === 1610 && s.hi === 0, 'undo restores', s.L);
  await tapSel('[data-a=redo]'); s = await st(); ok(s.L === 1610 - selLen && s.hi === 1, 'redo deletes again', s.L);
  await tapSel('[data-a=undo]'); await sleep(400);
  // 4 keep + undo
  g = await geo();
  await drag(X(g, 315), midY(g), X(g, 440), midY(g)); s = await st();
  await tool('keep'); await sleep(700); s = await st(); ok(s.L === selLen && s.pieces === 1, 'keep leaves only the selection', s.L);
  await tapSel('[data-a=undo]'); await sleep(500); s = await st(); ok(s.L === 1610, 'undo keep', s.L);
  // 5 move by holding and dragging the selection
  g = await geo();
  await drag(X(g, 315), midY(g), X(g, 440), midY(g)); s = await st(); const a0 = s.sel[0], b0 = s.sel[1];
  const xh = X(g, (a0 + b0) / 2);
  await down(xh, midY(g)); await sleep(650);
  s = await st(); ok(s.hand !== null, 'long press lifts the selection', s.hand);
  const target = X(g, 900);
  for (let i = 1; i <= 20; i++) { await move(xh + (target - xh) * i / 20, midY(g)); await sleep(25); }
  await sleep(300); await shot('03-lifted');
  await up(target, midY(g)); await sleep(500);
  s = await st(); ok(s.L === 1610 && s.label.startsWith('移动') && s.sel && s.sel[0] > 700, 'drop moves it (one step, same length)', { label: s.label, sel: s.sel });
  await shot('04-moved');
  await tapSel('[data-a=undo]'); await sleep(400); s = await st(); ok(s.hi === 0 && s.L === 1610, 'undo the move', s.hi);
  // 6 move with the button, far away
  g = await geo();
  await drag(X(g, 100), midY(g), X(g, 180), midY(g));
  await tool('move'); s = await st(); ok(s.view === 'hand', 'Move opens the place-it view', s.view);
  await tapAt(X(g, 1400), midY(g)); s = await st(); ok(s.hand > 1200, 'tap chooses where it goes', s.hand);
  await shot('05-hand');
  await tapSel('.area [data-a=handOk]'); await sleep(400); s = await st(); ok(s.label.startsWith('移动') && s.L === 1610, 'tick puts it there', s.label);
  await tapSel('[data-a=undo]'); await sleep(300);
  // 7 handle drag changes the selection end
  g = await geo();
  await drag(X(g, 300), midY(g), X(g, 400), midY(g)); s = await st(); const e0 = s.sel[1];
  const hy = g.cy + g.mainY + g.mainH - 13;
  await drag(X(g, e0), hy, X(g, e0 + 150), hy); s = await st(); ok(s.sel[1] > e0 + 100, 'dragging the end handle extends the selection', s.sel);
  await tapAt(X(g, 1200), midY(g)); s = await st(); ok(!s.sel && s.view === 'strip:rest', 'tap outside lets go', s.view);
  // 8 vertical swipe is not a selection
  await drag(X(g, 600), midY(g) - 60, X(g, 610), midY(g) + 90, 10); s = await st(); ok(!s.sel, 'vertical swipe does not select', s.sel);
  await b.eval(`document.querySelector('.scr[data-scene=live]').scrollIntoView({block:'start'})`); await sleep(300); g = await geo();
  // 9 sound: denoise in place, adjust later, remove
  await tool('sound'); s = await st(); ok(s.view === 'strip:sound', 'Sound opens its row in place', s.view);
  await tool('dn'); s = await st(); ok(s.view === 'p:dn' && s.work === 'dn:2', 'Denoise opens its control at the bottom', s);
  await shot('06-denoise');
  await tapSel('.area [data-a=stop][data-i="3"]'); await sleep(800); s = await st(); ok(s.work === 'dn:3', 'strength stop', s.work);
  const hold = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene=live] [data-hold]'); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()`);
  await down(hold.x, hold.y); await sleep(200); s = await st(); ok(s.compare === true, 'hold Original compares', s.compare); await up(hold.x, hold.y); await sleep(200); s = await st(); ok(s.compare === false, 'release returns', s.compare);
  await tapSel('.area .vh [data-a=ok]'); s = await st(); ok(s.layers.join() === 'dn:3' && s.view === 'strip:sound' && s.label.startsWith('降噪'), 'tick keeps denoise as a layer', s);
  await tapSel('.lchips [data-a=chip]'); s = await st(); ok(s.view === 'p:dn' && s.work === 'dn:3', 'tapping the chip reopens it', s);
  await tapSel('.area [data-a=stop][data-i="1"]'); await sleep(700); await tapSel('.area .vh [data-a=ok]'); s = await st(); ok(s.layers.join() === 'dn:1' && s.label.includes('→'), 'adjusted afterwards, one step', s.label);
  await tapSel('.lchips [data-a=chip]'); await tapSel('.area [data-a=rmlayer]'); s = await st(); ok(s.layers.length === 0 && s.label.startsWith('去掉'), 'removed afterwards', s.label);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.layers.join() === 'dn:1', 'undo brings it back', s.layers);
  await tapSel('[data-a=undo]'); await tapSel('[data-a=undo]'); s = await st(); ok(s.layers.length === 0 && s.hi === 0, 'undo all the way', s);
  s = await st(); if (s.view !== 'strip:rest') await tapSel('.area [data-a=pop]'); s = await st(); ok(s.view === 'strip:rest', 'undo returns the bottom to the first row', s.view);
  // 10 add music as a second track
  await tool('add'); await tool('music'); await tool('mlib'); s = await st(); ok(s.view === 'list', 'music list in place', s.view);
  await tapSel('.area [data-a=pickLib][data-i="0"]'); await sleep(300); s = await st(); ok(s.tracks.length === 1 && s.view === 'strip:track', 'music becomes a track, its tools show', s);
  await shot('07-music');
  await tool('duck'); await tapSel('.area .sld[data-sl=duckTo] .tr'); await tapSel('.area .vh [data-a=ok]'); s = await st(); ok(s.tracks[0].includes('/duck') && s.label === '自动调小', 'duck level adjusted as one step', s);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.tracks[0] === '轻快的早晨/duck0.25', 'undo the duck change', s.tracks);
  g = await geo();
  await tapAt(X(g, 800), midY(g)); s = await st(); ok(s.view === 'strip:rest', 'tap the voice: back to rest with two lanes', s.view);
  await shot('08-two-lanes');
  const ln = g.lanes[0]; await tapAt(X(g, 600), g.cy + ln[0] + ln[1] / 2); s = await st(); ok(s.view === 'strip:track', 'tap the music lane selects it', s.view);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.tracks.length === 0, 'undo the music', s.tracks);
  // 11 one sentence
  await tool('say'); s = await st(); ok(s.view === 'say', 'Say opens the input in place', s.view);
  await tapSel('.area [data-a=ex][data-x="剪掉开头5秒，结尾淡出3秒，导出MP3"]'); await sleep(300); s = await st();
  ok(s.view === 'plan' && JSON.stringify(s.plan) === '["head","fo","export"]', 'the plan shows at the bottom, marks on the audio', s.plan);
  await shot('09-plan');
  await tapSel('.area .seg [data-a=seg][data-k=after][data-v="1"]'); s = await st(); ok(s.L === 1610, 'switch to after (still not applied)', s.L);
  await tapSel('.area [data-a=stepOn][data-i="1"]'); s = await st(); ok(JSON.stringify(s.plan) === '["head","fo-off","export"]', 'a step can be dropped', s.plan);
  await tapSel('.area [data-a=stepOn][data-i="1"]'); await tapSel('.area [data-a=stepN][data-i="0"][data-d="1"]'); await sleep(200);
  await tapSel('.area .vh [data-a=apply]'); await sleep(500); s = await st(); ok(s.L === 1610 - 60 && s.view === 'export' && s.label.startsWith('按这句话改'), 'apply: one step, then export preselected', s);
  // 12 export
  await shot('10-export');
  await tapSel('.area [data-a=expGo]'); await sleep(1700); s = await st(); ok(s.modal, 'system save sheet after generating', s);
  await shot('11-system-save');
  await tapSel('.mhost [data-a=sysSave]'); s = await st(); ok(s.exp === 'done' && !s.modal, 'saved', s.exp);
  await tapSel('.area .vh [data-a=expClose]'); s = await st(); ok(s.view === 'strip:rest', 'back to rest', s.view);
  await tapSel('[data-a=undo]'); await sleep(400); s = await st(); ok(s.L === 1610 && s.hi === 0, 'undo the sentence in one step', s.L);
  // 13 recording straight into the timeline
  g = await geo(); await tapAt(X(g, 600), midY(g));
  await tool('add'); await tool('rec'); s = await st(); ok(s.view === 'rec', 'recorder in place', s.view);
  await tapSel('.area [data-a=recGo]'); await sleep(1300); s = await st(); ok(s.rec > 8, 'recording grows at the playhead', s.rec);
  await shot('12-recording');
  await tapSel('.area .vh [data-a=recOk]'); await sleep(300); s = await st(); ok(s.L > 1610 && s.label.startsWith('录音') && s.sel && s.sel[0] === 600, 'recording lands where the playhead was', s);
  await tapSel('[data-a=undo]'); await sleep(300); s = await st(); ok(s.L === 1610, 'undo the recording', s.L);
  // 14 pinch zoom (touch only) and fit
  if (MODE === 'touch') {
    g = await geo(); const y = midY(g);
    await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.cx + 150, y, id: 1 }, { x: g.cx + 230, y, id: 2 }] }); await sleep(40);
    for (let i = 1; i <= 8; i++) { await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.cx + 150 - i * 10, y, id: 1 }, { x: g.cx + 230 + i * 10, y, id: 2 }] }); await sleep(25); }
    await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
    s = await st(); ok(s.vb - s.va < 1610 * 0.6 && !s.sel, 'pinch zooms, no selection', [s.va, s.vb]);
    await shot('13-zoomed');
    await tapSel('[data-a=time]'); await tool('fit'); await sleep(900); s = await st(); ok(s.va === 0 && s.vb === 1610, 'Fit shows it all', [s.va, s.vb]);
    await tapSel('.area [data-a=pop]');
  }
  // 15 pauses
  await tool('edit'); await tool('pauses'); s = await st(); ok(s.view === 'pauses', 'pauses marked', s.view);
  await tapSel('.area [data-a=pausesGo]'); await sleep(600); s = await st(); ok(s.L < 1610 && s.label.includes('停顿'), 'pauses removed in one step', s.L);
  await tapSel('[data-a=undo]'); await sleep(300);
  s = await st(); ok(s.L === 1610 && s.hi === 0, 'clean at the end', s);
  console.log('page errors:', JSON.stringify(b.errors));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
} finally { await b.close(); }
