// Drive the live prototypes with touch (phone) and mouse (desktop) and record what changed.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const url = 'file://' + path.join(ROOT, 'index.html');
const log = (...a) => console.log(...a);

const STATE = `(name) => { const b = document.querySelector('.scr[data-scene="' + name + '"]')._bench; const p = b.proj();
  return { ver: b.verLabel(), sel: b.st.selection, ph: Math.round(b.st.playhead), hist: p.hist.slice(0, p.idx + 1).map(h => h.label).reverse().slice(0, 3),
    rows: Array.from(b.root.querySelectorAll('.hr')).map(r => r.className.match(/k-(\\w+)/)[1] + ':' + r.querySelector('.lt').textContent).slice(0, 6),
    clip: !!b.st.clipboard, panel: b.st.panel && { phase: b.st.panel.phase, ab: b.st.panel.ab, level: b.st.panel.level, scope: b.st.panel.scope }, sheet: b.st.sheet,
    snack: b.st.snack && b.st.snack.text, drag: !!b.drag, len: b.len() }; }`;

const b = await launch();
try {
  // ---------------- phone, touch
  await b.viewport(390, 844, true, 2, false);
  await b.open(url);
  const st = name => b.eval(`(${STATE})(${JSON.stringify(name)})`);
  const geo = async name => {
    await b.eval(`document.querySelector('.scr[data-scene="${name}"]').scrollIntoView({block:'center'})`);
    await sleep(300);
    return b.eval(`(() => { const s = document.querySelector('.scr[data-scene="${name}"]'), c = s.querySelector('canvas').getBoundingClientRect(), r = s.getBoundingClientRect(), bn = s._bench;
      return { cx: c.left, cy: c.top, cw: c.width, ch: c.height, sx: r.left + scrollX, sy: r.top + scrollY, sw: r.width, sh: r.height, strip: bn.stripH(), ruler: bn.rulerH(), len: bn.len() }; })()`);
  };
  const tapAt = async (x, y) => { await b.touch('touchStart', x, y); await sleep(60); await b.touch('touchEnd', x, y); await sleep(250); };
  const tapSel = async (name, sel) => {
    const r = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene="${name}"]').querySelector(${JSON.stringify(sel)}); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()`);
    if (!r) throw new Error('no element ' + sel);
    await tapAt(r.x, r.y);
  };
  const shotPhone = async (name, file) => { const g = await b.eval(`(() => { const r = document.querySelector('.scr[data-scene="${name}"]').getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; })()`); await b.shot(path.join(OUT, file), g, false); };

  let g = await geo('s3-live');
  await sleep(900);
  log('start', JSON.stringify(await st('s3-live')));
  const ppx = g.cw / g.len;
  const y = g.cy + g.strip + (g.ch - g.strip - g.ruler) * 0.5;
  const x0 = g.cx + 300 * ppx;           // middle of the selection (240–360)
  await b.touch('touchStart', x0, y);
  await sleep(650);                       // long press
  log('after hold, lifted:', (await st('s3-live')).drag);
  const target = x0 + 300 * ppx;          // move about 15 s to the right
  for (let i = 1; i <= 24; i++) { await b.touch('touchMove', x0 + (target - x0) * i / 24, y); await sleep(25); }
  await sleep(350);
  await shotPhone('s3-live', 'live-drag-mid.png');
  const bubble = await b.eval(`document.querySelector('.scr[data-scene="s3-live"] .bubble').textContent`);
  log('bubble while dragging:', bubble);
  await b.touch('touchEnd', target, y);
  await sleep(1300);
  await shotPhone('s3-live', 'live-drag-after.png');
  log('after drop', JSON.stringify(await st('s3-live')));

  // undo from the history header, then redo
  await tapSel('s3-live', '[data-a=undo]'); await sleep(900);
  log('after undo', JSON.stringify(await st('s3-live')));
  await tapSel('s3-live', '[data-a=redo]'); await sleep(900);
  log('after redo', JSON.stringify(await st('s3-live')));

  // drag back onto the original place: nothing should be recorded
  g = await geo('s3-live');
  let s = await st('s3-live');
  const xa = g.cx + (s.sel[0] + 30) * ppx;
  await b.touch('touchStart', xa, y); await sleep(650);
  for (let i = 1; i <= 6; i++) { await b.touch('touchMove', xa + i, y); await sleep(30); }
  for (let i = 6; i >= 0; i--) { await b.touch('touchMove', xa + i, y); await sleep(30); }
  await b.touch('touchEnd', xa, y); await sleep(1100);
  log('dropped in place', JSON.stringify(await st('s3-live')));

  // copy from "⋯", tap the waveform to move the playhead, paste from the pill
  await tapSel('s3-live', '.selbar [data-a=more]'); await sleep(600);
  await tapSel('s3-live', '.sheet [data-a=copy]'); await sleep(700);
  await tapAt(g.cx + 820 * ppx, y); await sleep(700);
  log('pill shown:', await b.eval(`document.querySelector('.scr[data-scene="s3-live"] .paste').classList.contains('show')`));
  await shotPhone('s3-live', 'live-paste-pill.png');
  await tapSel('s3-live', '.paste [data-a=paste]'); await sleep(1100);
  log('after paste', JSON.stringify(await st('s3-live')));

  // "移动到…" sheet: move to the start
  await tapSel('s3-live', '.selbar [data-a=move]'); await sleep(600);
  await shotPhone('s3-live', 'live-moveto.png');
  await tapSel('s3-live', '.sheet [data-a="mv:start"]'); await sleep(1100);
  log('after move to start', JSON.stringify(await st('s3-live')));

  // tools → 处理声音 → 降噪 → wait → 应用 → undo across the version
  await tapSel('s3-live', '[data-a=tools]'); await sleep(600);
  await shotPhone('s3-live', 'live-tools.png');
  await tapSel('s3-live', '.sheet [data-v=process]'); await sleep(600);
  await tapSel('s3-live', '.sheet [data-k=denoise]'); await sleep(900);
  log('panel opened', JSON.stringify((await st('s3-live')).panel));
  await shotPhone('s3-live', 'live-panel-rendering.png');
  await sleep(2200);
  log('panel later', JSON.stringify((await st('s3-live')).panel));
  await tapSel('s3-live', '.panel [data-a=papply]'); await sleep(1200);
  await shotPhone('s3-live', 'live-applied.png');
  log('after apply', JSON.stringify(await st('s3-live')));
  await tapSel('s3-live', '[data-a=undo]'); await sleep(900);
  log('after undo x1', JSON.stringify(await st('s3-live')));
  await shotPhone('s3-live', 'live-undo-across.png');
  await tapSel('s3-live', '[data-a=redo]'); await sleep(900);
  log('after redo', JSON.stringify(await st('s3-live')));

  // section 6 live panel: change strength, switch to original, apply
  g = await geo('s6-live');
  await sleep(2500);
  log('s6 start', JSON.stringify((await st('s6-live')).panel));
  await tapSel('s6-live', '.st-hit[data-k="4"]'); await sleep(500);
  log('s6 level', JSON.stringify((await st('s6-live')).panel));
  await tapSel('s6-live', '[data-a=ab][data-v=orig]'); await sleep(500);
  log('s6 ab', JSON.stringify((await st('s6-live')).panel));
  await shotPhone('s6-live', 'live-s6-orig.png');
  await sleep(2200);
  await tapSel('s6-live', '[data-a=papply]'); await sleep(1200);
  log('s6 applied', JSON.stringify(await st('s6-live')));

  // auto demo button
  await b.eval(`document.querySelector('[data-demo=reset][data-target=s3-live]').click()`); await sleep(500);
  await b.eval(`document.querySelector('[data-demo=move][data-target=s3-live]').click()`);
  await sleep(4200);
  log('auto demo', JSON.stringify(await st('s3-live')));

  // ---------------- desktop, mouse
  await b.viewport(1440, 900, false, 1, true);
  await b.open(url);
  g = await geo('s3-live');
  const ppx2 = g.cw / g.len, y2 = g.cy + g.strip + (g.ch - g.strip - g.ruler) * 0.5, m0 = g.cx + 300 * ppx2;
  await b.mouse('mouseMoved', m0, y2); await b.mouse('mousePressed', m0, y2); await sleep(650);
  for (let i = 1; i <= 20; i++) { await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: m0 - 200 * ppx2 * i / 20, y: y2, button: 'left', buttons: 1 }); await sleep(25); }
  await sleep(300);
  await shotPhone('s3-live', 'desk-drag-mid.png');
  await b.mouse('mouseReleased', m0 - 200 * ppx2, y2); await sleep(1200);
  log('desktop mouse drag', JSON.stringify(await st('s3-live')));
  log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
