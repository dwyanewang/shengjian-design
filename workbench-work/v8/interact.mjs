// Drives the v4 live phone with touch (or mouse) through every flow, checking state after each step.
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
  const X_ = `document.querySelector('.scr[data-scene=live]')._bench`;
  const st = () => b.eval(`(() => { const x = ${X_}, pr = x.playEl.getBoundingClientRect(), sr = x.scr.getBoundingClientRect(); return { L: x.L, ph: Math.round(x.ph), sel: x.sel, view: x.scr.dataset.view, cat: x.cat, mark: x.markTool, depth: x.stack.length, hi: x.hi, label: x.hist[x.hi].label, layers: x.doc.layers.map(l => l.k + ':' + (l.v instanceof Set ? [...l.v] : JSON.stringify(l.v))), tracks: x.doc.tracks.map(t => t.name + '/g' + t.gain + (t.duck ? '/duck' + t.duckTo : '')), hand: x.hand ? x.hand.at : null, plan: x.plan ? x.plan.steps.map(s => s.k + (s.on ? '' : '-off')) : null, exp: x.exp ? x.exp.stage : null, modal: !!x.mhost.innerHTML, pieces: x.doc.pieces.length, va: Math.round(x.view.a.v), vb: Math.round(x.view.b.v), compare: x.compareHold, rec: x.rec ? Math.round(x.rec.len) : null, tm: x.tmEl.textContent.trim(), marks: x.marks ? x.marks.length : 0, play: [Math.round(pr.left - sr.left), Math.round(pr.top - sr.top)], tlH: Math.round(x.tlEl.getBoundingClientRect().height) }; })()`);
  const geo = () => b.eval(`(() => { const x = ${X_}, c = x.cv.getBoundingClientRect(), g = x.geom(); return { cx: c.left, cy: c.top, W: x.W, IW: x.IW, va: x.view.a.v, vb: x.view.b.v, mainY: g.mainY, mainH: g.mainH, lanes: g.lanes.map(l => [l.y, l.h]) }; })()`);
  const X = (g, u) => g.cx + 40 + (u - g.va) / (g.vb - g.va) * g.IW;
  const midY = g => g.cy + g.mainY + g.mainH * 0.45;
  const down = (x, y) => TOUCH ? b.touch('touchStart', x, y) : b.mouse('mousePressed', x, y);
  const move = (x, y) => TOUCH ? b.touch('touchMove', x, y) : b.mouse('mouseMoved', x, y);
  const up = (x, y) => TOUCH ? b.touch('touchEnd', x, y) : b.mouse('mouseReleased', x, y);
  const tapAt = async (x, y) => { await down(x, y); await sleep(50); await up(x, y); await sleep(220); };
  const drag = async (x0, y0, x1, y1, n = 14, holdEnd = 0) => { await down(x0, y0); await sleep(30); for (let i = 1; i <= n; i++) { await move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); await sleep(20); } await sleep(60 + holdEnd); await up(x1, y1); await sleep(350); };
  const tapSel = async (sel, quiet) => {
    const r = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene=live]').querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({block:'nearest', inline:'nearest'}); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()`);
    if (!r) { if (!quiet) ok(false, 'element exists: ' + sel); return false; }
    await tapAt(r.x, r.y); await sleep(250); return true;
  };
  const shot = async name => { const r = await b.eval(`(() => { const q = document.querySelector('.scr[data-scene=live]').getBoundingClientRect(); return { x: q.left + scrollX, y: q.top + scrollY, width: q.width, height: q.height }; })()`); await b.shot(path.join(OUT, `${MODE}-${name}.png`), r, false); };
  const tool = k => k === 'say' ? tapSel('.tp [data-k=say]') : tapSel(`.tools [data-a=tool][data-k=${k}]`);
  const cat = k => tapSel(`.cats [data-a=cat][data-k=${k}]`);
  const closeMarked = () => tapSel('.tools .act.mark, .tp .sayf.mark, .hdr .xbtn.mark');
  const wayOut = () => tapSel('.area [data-a=back]');
  const sysBack = async () => {
    if (TOUCH) { const g = await geo(); await drag(g.cx + 6, midY(g), g.cx + 130, midY(g)); }
    else { await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(250); }
  };
  const fresh = async () => { await b.eval(`window.resetLive()`); await sleep(300); };
  const setView = (a, bb) => b.eval(`(() => { const x = ${X_}; x.view.a.snap(${a}); x.view.b.snap(${bb}); x.kick(); return true; })()`);
  const targetsCheck = async label => {
    const r = await b.eval(`(() => { const x = ${X_}; const t = x.targets(); return { n: t.length, minL: Math.min(...t.map(o => o.l)), minR: Math.min(...t.map(o => x.W - o.r)), t }; })()`);
    ok(r.minL >= 32 && r.minR >= 32, `${label}: timeline touch targets keep 32 dp from the sides (${r.n}; nearest ${Math.round(r.minL)} / ${Math.round(r.minR)})`, r.minL < 32 || r.minR < 32 ? r.t : undefined);
  };
  const noBackInRows = async label => { const n = await b.eval(`document.querySelectorAll('.scr[data-scene=live] .tools [data-a=back], .scr[data-scene=live] .cats [data-a=back]').length`); ok(n === 0, `${label}: no back control in the tool rows`, n); };

  let s = await st(); ok(s.view === 'strip:rest' && s.cat === 'ctx' && s.L === 1610, 'opens at rest on the most used tools', s);
  const play0 = s.play; await noBackInRows('rest');
  // ---- each tool placed at rest does its job in one tap
  const oneTap = [
    ['dn', s => s.layers.join() === 'dn:2' && s.view === 'p:dn' && s.mark === 'dn', 'denoise is on, its control open'],
    ['ld', s => s.layers.join() === 'ld:0' && s.view === 'p:ld', 'level loudness is on'],
    ['pauses', s => s.view === 'pauses' && s.marks > 3, 'pauses are marked on the audio'],
    ['music', s => s.view === 'music' && s.mark === 'music', 'the music list is open'],
    ['rec', s => s.view === 'rec' && s.mark === 'rec', 'the recorder is open at the playhead'],
    ['chorus', s => s.view === 'chorus', 'the chorus finder runs'],
    ['split', s => s.pieces === 2, 'split at the playhead'],
    ['fade', s => s.view === 'fade' && s.label.includes('淡出'), 'both ends fade at once, control open'],
    ['vol', s => s.view === 'p:vol', 'volume control open'],
    ['all', s => s.sel && s.sel[0] === 0 && s.sel[1] === 1610, 'everything selected'],
    ['tts', s => s.view === 'tts', 'text to speech open'],
    ['fx', s => s.layers.join().startsWith('fx:') && s.view === 'p:fx', 'effects on'],
  ];
  for (const [k, test, what] of oneTap) {
    await fresh(); await b.eval(`(() => { const x = ${X_}; x.ph = 620; x.renderTime(); return 1; })()`);
    await tool(k); s = await st(); ok(test(s), `one tap on «${k}»: ${what}`, test(s) ? undefined : s);
  }
  await fresh();
  let g = await geo();
  await tapAt(X(g, 500), midY(g)); s = await st(); ok(Math.abs(s.ph - 500) <= 6 && !s.sel, 'tap places the playhead at 0:50', s.ph);
  await drag(X(g, 315), midY(g), X(g, 440), midY(g)); s = await st();
  ok(s.sel && Math.abs(s.sel[0] - 315) <= 8 && Math.abs(s.sel[1] - 440) <= 8 && s.view === 'strip:range' && s.cat === 'ctx', 'horizontal drag selects; the first category becomes the selection', s);
  ok(JSON.stringify(s.play) === JSON.stringify(play0), 'play stays in place with a selection', [s.play, play0]);
  await noBackInRows('selection'); await shot('01-selected');
  // ---- edges of the timeline
  await drag(X(g, 300), midY(g), g.cx + 30, midY(g)); s = await st(); ok(s.sel && s.sel[0] === 0, 'dragging past the start selects exactly from 0', s.sel);
  await drag(X(g, 300), midY(g), g.cx + 8, midY(g)); s = await st(); ok(s.sel && s.sel[0] === 0, 'ending inside the strip is fine: still 0', s.sel);
  await drag(X(g, 1300), midY(g), g.cx + g.W - 30, midY(g)); s = await st(); ok(s.sel && s.sel[1] === 1610, 'dragging past the end selects exactly to the end', s.sel);
  await targetsCheck('fitted, selection to the end');
  await b.eval(`(() => { const x = ${X_}; x.sel = [0, 200]; x.resetStack(); return 1; })()`); await sleep(200); g = await geo();
  const hy = g.cy + g.mainY + g.mainH - 13;
  await drag(g.cx + 36, hy, X(g, 120), hy); s = await st(); ok(s.sel && s.sel[0] >= 100 && s.sel[1] === 200, 'the start handle at the very start is grabbed from 36 dp', s.sel);
  await drag(X(g, 120), hy, g.cx + 30, hy); s = await st(); ok(s.sel && s.sel[0] === 0, 'dragged back past the start: exactly 0', s.sel);
  await targetsCheck('fitted, selection from the start');
  await setView(500, 800); await sleep(200); g = await geo();
  await drag(g.cx + 250, midY(g), g.cx + 52, midY(g), 14, 4000); s = await st(); ok(s.va === 0 && s.sel && s.sel[0] === 0, 'zoomed in: holding 52 dp from the left scrolls to the start, selects to 0', { va: s.va, sel: s.sel });
  await targetsCheck('zoomed in at the start');
  await setView(800, 1100); await sleep(200); g = await geo();
  await drag(g.cx + 120, midY(g), g.cx + g.W - 52, midY(g), 14, 4000); s = await st(); ok(s.vb === 1610 && s.sel && s.sel[1] === 1610, 'zoomed in: holding 52 dp from the right scrolls to the end', { vb: s.vb, sel: s.sel });
  await targetsCheck('zoomed in at the end');
  await setView(0, 1610); await sleep(200); g = await geo();
  await b.eval(`(() => { const x = ${X_}; x.sel = [315, 440]; x.resetStack(); return 1; })()`); await sleep(150);
  await sysBack(); s = await st(); ok(!s.sel && s.view === 'strip:rest', 'system Back lets go of the selection (an edge swipe on the phone)', s);
  // ---- delete, undo, keep, move
  g = await geo(); await drag(X(g, 315), midY(g), X(g, 440), midY(g)); s = await st(); const selLen = s.sel[1] - s.sel[0];
  await tool('del'); await sleep(500); s = await st(); ok(s.L === 1610 - selLen && s.view === 'strip:rest', 'delete closes the gap', s.L);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.L === 1610, 'undo restores', s.L);
  await tapSel('[data-a=redo]'); s = await st(); ok(s.L === 1610 - selLen, 'redo', s.L);
  await tapSel('[data-a=undo]'); await sleep(400);
  g = await geo(); await drag(X(g, 315), midY(g), X(g, 440), midY(g)); await tool('keep'); await sleep(700); s = await st(); ok(s.L === selLen, 'keep leaves only the selection', s.L);
  await tapSel('[data-a=undo]'); await sleep(500);
  g = await geo(); await drag(X(g, 315), midY(g), X(g, 440), midY(g)); s = await st(); const xh = X(g, (s.sel[0] + s.sel[1]) / 2);
  await down(xh, midY(g)); await sleep(650); s = await st(); ok(s.hand !== null, 'long press lifts the selection', s.hand);
  const target = X(g, 900); for (let i = 1; i <= 20; i++) { await move(xh + (target - xh) * i / 20, midY(g)); await sleep(25); }
  await sleep(300); await shot('02-lifted'); await up(target, midY(g)); await sleep(500);
  s = await st(); ok(s.L === 1610 && s.label.startsWith('移动') && s.sel && s.sel[0] > 700, 'drop moves it in one step', s.label);
  await tapSel('[data-a=undo]'); await sleep(400);
  g = await geo(); await drag(X(g, 100), midY(g), X(g, 180), midY(g));
  await tool('move'); s = await st(); ok(s.view === 'hand' && s.mark === 'move', 'Move: its tool marked, the control above the tools', s);
  await tapAt(X(g, 1400), midY(g)); s = await st(); ok(s.hand > 1200, 'tap chooses where it goes', s.hand);
  await shot('03-hand');
  await wayOut(); s = await st(); ok(s.hand === null && s.hi === 0 && s.sel && s.sel[0] === 100, '"放回去" puts it back', s);
  await tool('move'); await tapAt(X(g, 1400), midY(g)); await tapSel('.area [data-a=handOk]'); await sleep(400); s = await st(); ok(s.label.startsWith('移动'), '"放这里" puts it there', s.label);
  await tapSel('[data-a=undo]'); await sleep(300);
  await tapAt(X(g, 1200), midY(g)); s = await st(); ok(!s.sel && s.view === 'strip:rest', 'tap outside lets go', s.view);
  await drag(X(g, 600), midY(g) - 60, X(g, 610), midY(g) + 90, 10); s = await st(); ok(!s.sel, 'vertical swipe does not select', s.sel);
  await b.eval(`document.querySelector('.scr[data-scene=live]').scrollIntoView({block:'start'})`); await sleep(300);
  // ---- a setting: live, kept on leaving, one step to undo; leaving by the marked tool and by system Back
  const h0 = (await st()).hi;
  await tool('dn'); s = await st(); ok(s.view === 'p:dn' && s.layers.join() === 'dn:2' && s.mark === 'dn', 'denoise on, its control above the tools, the tool marked', s);
  ok(JSON.stringify(s.play) === JSON.stringify(play0), 'play stays in place with a control open', [s.play, play0]);
  await noBackInRows('a control open'); await shot('04-denoise');
  await tapSel('.area [data-a=stop][data-i="3"]'); await sleep(200); await tapSel('.area [data-a=stop][data-i="4"]'); await sleep(700); s = await st();
  ok(s.layers.join() === 'dn:4' && s.hi === h0 + 1, 'changes take effect as made, one history step', s);
  const hold = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene=live] [data-hold]'); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()`);
  await down(hold.x, hold.y); await sleep(200); s = await st(); ok(s.compare === true, 'hold compares with the original', s.compare); await up(hold.x, hold.y); await sleep(200);
  await closeMarked(); s = await st(); ok(s.view === 'strip:rest' && s.layers.join() === 'dn:4' && !s.mark, 'tapping the marked tool again closes it; the setting stays', s);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.layers.length === 0 && s.hi === h0, 'one undo takes the visit back', s);
  await tapSel('[data-a=redo]'); await tapSel('.lchips [data-a=chip]'); s = await st(); ok(s.view === 'p:dn' && s.mark === 'dn', 'the tag reopens it', s);
  await tapSel('.area [data-a=stop][data-i="1"]'); await sleep(600); await sysBack(); s = await st(); ok(s.view === 'strip:rest' && s.layers.join() === 'dn:1', 'system Back closes it; adjusted value stays', s);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.layers.join() === 'dn:4', 'one undo returns the earlier strength', s.layers);
  await tapSel('.lchips [data-a=chip]'); await tapSel('.area [data-a=rmlayer]'); s = await st(); ok(s.layers.length === 0 && s.label.startsWith('去掉') && s.view === 'strip:rest', 'its own "去掉" removes it', s);
  await tapSel('[data-a=undo]'); await tapSel('[data-a=undo]'); await tapSel('[data-a=undo]');
  // ---- categories: tabs, not levels
  for (const c of ['edit', 'sound', 'add', 'more', 'ctx']) { await cat(c); s = await st(); ok(s.cat === c && s.view === 'strip:rest' && JSON.stringify(s.play) === JSON.stringify(play0), `category «${c}»: its tools in place, play unmoved`, s.cat); await noBackInRows('category ' + c); }
  await cat('sound'); await tool('rp'); s = await st(); ok(s.view === 'p:rp' && s.mark === 'rp' && s.cat === 'sound', 'a tool from a category opens with the same structure', s);
  await cat('edit'); s = await st(); ok(s.view === 'strip:rest' && s.cat === 'edit' && s.layers.join().startsWith('rp:'), 'switching category sets the control aside; repair stays on', s);
  await tapSel('[data-a=undo]'); await cat('ctx');
  // ---- music as a track; track tools; volume live and one step
  await tool('music'); await tapSel('.area [data-a=pickLib][data-i="0"]'); await sleep(300); s = await st(); ok(s.tracks.length === 1 && s.view === 'strip:track' && s.cat === 'ctx', 'music becomes a track; the first category becomes the track', s);
  await shot('05-music');
  const hm = s.hi;
  await tool('tvol');
  const tr = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene=live] .sld[data-sl=tvol] .tr'); const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, y: q.top + q.height / 2 }; })()`);
  await drag(tr.l + (tr.r - tr.l) * 0.4, tr.y, tr.l + (tr.r - tr.l) * 0.2, tr.y, 8); s = await st(); ok(s.tracks[0].includes('/g0.3') && s.hi === hm + 1, 'dragging the volume is live and one step', s);
  await closeMarked(); s = await st(); ok(s.view === 'strip:track' && s.tracks[0].includes('/g0.3'), 'closing keeps it', s);
  await tapSel('[data-a=undo]'); s = await st(); ok(s.tracks[0].includes('/g0.6'), 'one undo restores', s.tracks);
  g = await geo(); await tapAt(X(g, 800), midY(g)); s = await st(); ok(s.view === 'strip:rest', 'tap the voice: back to rest', s.view);
  await shot('06-two-lanes');
  await tapSel('[data-a=undo]'); s = await st(); ok(s.tracks.length === 0, 'undo the music', s.tracks);
  // ---- one sentence: pending, with its worded way out
  await tool('say'); await sleep(500); s = await st(); ok(s.view === 'say' && s.mark === 'say', 'the sentence opens with the keyboard, examples above it', s);
  await tapSel('.area [data-a=ex][data-x="剪掉开头5秒，结尾淡出3秒，导出MP3"]'); await sleep(300); s = await st();
  ok(s.view === 'plan' && JSON.stringify(s.plan) === '["head","fo","export"]', 'the plan: steps above the tools, marks on the audio', s.plan);
  await shot('07-plan');
  await wayOut(); s = await st(); ok(!s.plan && s.view === 'strip:rest' && s.hi === 0, '"不改了" drops it', s);
  await tool('say'); await tapSel('.area [data-a=ex][data-x="剪掉开头5秒，结尾淡出3秒，导出MP3"]'); await sleep(200);
  await tapSel('[data-a=undo]'); s = await st(); ok(!s.plan && s.hi === 0, 'undo drops a pending plan first', s);
  await tool('say'); await tapSel('.area [data-a=ex][data-x="剪掉开头5秒，结尾淡出3秒，导出MP3"]'); await sleep(200);
  await tapSel('.area [data-a=stepOn][data-i="1"]'); s = await st(); ok(JSON.stringify(s.plan) === '["head","fo-off","export"]', 'a step can be dropped', s.plan);
  await tapSel('.area [data-a=stepOn][data-i="1"]'); await tapSel('.area [data-a=stepN][data-i="0"][data-d="1"]'); await sleep(200);
  await tapSel('.area [data-a=apply]'); await sleep(500); s = await st(); ok(s.L === 1550 && s.view === 'export' && s.mark === 'export', '"应用" in one step; export opens, preselected', s);
  ok(s.tlH >= 150, 'the audio keeps at least its minimum with export open', s.tlH);
  await shot('08-export');
  await tapSel('.area [data-a=expGo]'); await sleep(1700); s = await st(); ok(s.modal, 'system save after generating', s);
  await tapSel('.mhost [data-a=sysSave]'); s = await st(); ok(s.exp === 'done', 'saved', s.exp);
  await wayOut(); s = await st(); ok(s.view === 'strip:rest', '"完成" closes it', s.view);
  await tapSel('[data-a=undo]'); await sleep(400); s = await st(); ok(s.L === 1610 && s.hi === 0, 'undo the sentence in one step', s.L);
  // ---- recording
  g = await geo(); await tapAt(X(g, 600), midY(g));
  await tool('rec'); s = await st(); ok(s.view === 'rec', 'recorder', s.view);
  await tapSel('.area [data-a=recGo]'); await sleep(1300); s = await st(); ok(s.rec > 8, 'its red button records at the playhead', s.rec);
  ok(JSON.stringify(s.play) === JSON.stringify(play0), 'play keeps its place while recording', [s.play, play0]);
  await shot('09-recording');
  await tapSel('.area [data-a=recOk]'); await sleep(300); s = await st(); ok(s.L > 1610 && s.label.startsWith('录音') && s.sel && s.sel[0] === 600, '"完成" lands it at the playhead', s);
  await tapSel('[data-a=undo]'); await sleep(300);
  await tool('rec'); await tapSel('.area [data-a=recGo]'); await sleep(600); await wayOut(); s = await st(); ok(s.L === 1610 && s.rec === null && s.view === 'strip:rest', '"不要了" leaves the audio unchanged', s);
  // ---- pinch and fit; pauses
  if (TOUCH) {
    g = await geo(); const y = midY(g);
    await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.cx + 150, y, id: 1 }, { x: g.cx + 230, y, id: 2 }] }); await sleep(40);
    for (let i = 1; i <= 8; i++) { await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.cx + 150 - i * 10, y, id: 1 }, { x: g.cx + 230 + i * 10, y, id: 2 }] }); await sleep(25); }
    await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
    s = await st(); ok(s.vb - s.va < 1610 * 0.6 && !s.sel, 'pinch zooms', [s.va, s.vb]);
    await tapSel('[data-a=time]'); s = await st(); ok(s.cat === 'more', 'tapping the time shows "更多" (playback and view)', s.cat);
    await tool('fit'); await sleep(900); s = await st(); ok(s.va === 0 && s.vb === 1610, 'Fit shows it all', [s.va, s.vb]);
    await cat('ctx');
  }
  await tool('pauses'); await tapSel('.area [data-a=pausesGo]'); await sleep(600); s = await st(); ok(s.L < 1610 && s.label.includes('停顿'), 'pauses removed in one step', s.L);
  await tapSel('[data-a=undo]'); await sleep(300);
  s = await st(); ok(s.L === 1610 && s.hi === 0, 'clean at the end', s);
  console.log('page errors:', JSON.stringify(b.errors));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
} finally { await b.close(); }
