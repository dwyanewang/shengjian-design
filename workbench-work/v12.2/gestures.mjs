// v12.2 gestures: real touch events (Input.dispatchTouchEvent) on the live phone, one group per rule of the round.
//  1 a one-finger swipe scrolls (main line, air, ruler, a track), selects nothing; at the fitted zoom a rubber band;
//    a fling carries on after the finger lifts and the next touch stops it; a swipe wins over following the playhead
//  2 a pinch only zooms: the time under the starting midpoint stays at its x, moving both fingers does not pan; a finger
//    left after a pinch does nothing
//  3 a tap places the playhead at once
//  4 a double tap selects the sentence (pause middle to pause middle); a triple tap the piece; music: the piece
//  5 press and hold, then drag: a range from the press point; the anchor shows when the hold registers; held and let go:
//    nothing selected, the playhead stays
//  6 hold inside the selection lifts it; hold on an unselected piece starts a range
//  7 grips: drag, hold still to magnify; edge auto-scroll for a range; the system's edge strips
//  8 the volume curve: tap adds, a point drags, a swipe scrolls; tracks: tap selects, vertical drag scrolls the tracks,
//    a hold does nothing
//  9 the hint: not at open; once, after the first tap or swipe
// 10 a mouse: drag selects, a double click selects the sentence
// Usage: node gestures.mjs ROOT
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
let fails = 0;
const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined && !c ? '  ' + JSON.stringify(x).slice(0, 700) : '')); if (!c) fails++; };
const X = `document.querySelector('.scr[data-scene=live]')._bench`;
const ev = e => b.eval(`(() => { const x = ${X}; ${e} })()`);
const T = (type, pts) => b.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, radiusX: 4, radiusY: 4, id: i + 1 })) });
const down = (x, y) => T('touchStart', [[x, y]]), move = (x, y) => T('touchMove', [[x, y]]), up = () => T('touchEnd', []);
const tap = async (x, y, hold = 40) => { await down(x, y); await sleep(hold); await up(); };
const swipe = async (x0, y, x1, n = 10, gap = 24, still = 120) => { await down(x0, y); await sleep(20); for (let i = 1; i <= n; i++) { await move(x0 + (x1 - x0) * i / n, y); await sleep(gap); } await sleep(still); await up(); };
try {
  for (const [W, H] of [[390, 844], [360, 780]]) {
    await b.viewport(W, H, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(900);
    const geo = () => ev(`x.scr.scrollIntoView({ block: 'start' }); x.measure(); const c = x.cv.getBoundingClientRect(), g = x.geom(); return { cx: c.left, cy: c.top, W: x.W, IW: x.IW, a: x.view.a.v, b: x.view.b.v, mid: c.top + g.mid - 40, air: c.top + Math.max(6, (g.ovH ? g.ovY : g.rTop) - 18), ruler: c.top + (g.rTop + g.rBot) / 2, laneTop: c.top + g.laneTop, L: x.L };`);
    const reset = async () => { await b.eval(`window.resetLive()`); await sleep(200); return geo(); };
    const at = (g, u) => g.cx + 40 + (u - g.a) / (g.b - g.a) * g.IW;
    const st = () => ev(`return { ph: Math.round(x.ph), sel: x.sel, a: x.view.a.v, b: x.view.b.v, view: x.scr.dataset.view, hand: !!x.hand, anchor: x.anchor ? x.anchor.u : null, rub: x.rub.v, fling: !!x.fling, track: x.track, laneOff: x.laneOff || 0, mag: !!x._mag, coach: x.coach ? x.coach.textContent : null };`);
    const tag = `${W}:`;
    // ------------------------------------------------ 9 (part) no hint at open
    let g = await reset(); let s = await st();
    ok(!s.coach, `${tag} at open no gesture hint shows (the bar's example sentence is the first-run message)`, s.coach);
    // ------------------------------------------------ 3 tap: at once
    await down(at(g, 500), g.mid); await sleep(40); await up(); await sleep(15);
    s = await st(); ok(Math.abs(s.ph - 500) <= 6 && !s.sel, `${tag} a tap places the playhead at once (${s.ph}, read 15 ms after lifting)`, s);
    await sleep(500); s = await st();
    ok(s.coach && /点两下/.test(s.coach), `${tag} after the first tap, once, the hint: "${s.coach}"`, s.coach);
    // ------------------------------------------------ 1 swipes scroll
    for (const [label, yk] of [['the main line', 'mid'], ['the air above the ruler', 'air'], ['the ruler', 'ruler']]) {
      g = await reset(); await ev(`x.view.a.snap(400); x.view.b.snap(700); x.kick(); return 1;`); await sleep(80); g = await geo();
      await swipe(g.cx + 260, g[yk], g.cx + 140, 10, 24, 150); await sleep(100);
      // the view follows the finger from where it passed the 8 dp slop (the first move here is 12 dp), as phones do
      s = await st(); const want = 400 + (120 - 12) / g.IW * 300;
      ok(Math.abs(s.a - want) < 2 && !s.sel && s.view === 'strip:rest', `${tag} a slow swipe on ${label} scrolls the view by the finger's distance after the slop (${s.a.toFixed(1)} ≈ ${want.toFixed(1)}), selects nothing`, s);
    }
    g = await reset(); await ev(`x.reset(window.SCENES.kTracks5.doc()); x.view.a.snap(400); x.view.b.snap(700); x.stack = [x.rootView()]; x.renderArea(true); return 1;`); await sleep(150); g = await geo();
    await swipe(g.cx + 260, g.laneTop + 30, g.cx + 140, 10, 24, 150); await sleep(100); s = await st();
    ok(s.a > 450 && !s.track, `${tag} a horizontal swipe on a track scrolls the view too (${s.a.toFixed(1)}), selects no track`, s);
    // fling
    g = await reset(); await ev(`x.view.a.snap(200); x.view.b.snap(500); x.kick(); return 1;`); await sleep(80); g = await geo();
    await down(g.cx + 300, g.mid); for (let i = 1; i <= 6; i++) { await move(g.cx + 300 - 30 * i, g.mid); await sleep(16); } await up();
    const s0 = await st(); await sleep(350); const s1 = await st();
    ok(s1.a > s0.a + 5, `${tag} a fling carries on after the finger lifts (${s0.a.toFixed(1)} → ${s1.a.toFixed(1)} in 0.35 s)`, [s0, s1]);
    await tap(g.cx + 200, g.mid); const s2 = await st(); await sleep(200); const s3 = await st();
    ok(!s3.fling && Math.abs(s3.a - s2.a) < 0.5, `${tag} the next touch stops the fling where it is`, [s2, s3]);
    // rubber band at the fitted zoom
    g = await reset();
    await down(g.cx + 250, g.mid); for (let i = 1; i <= 8; i++) { await move(g.cx + 250 - 20 * i, g.mid); await sleep(20); }
    s = await st(); ok(s.rub < -8 && s.rub > -41 && Math.abs(s.a) < 0.01, `${tag} at the fitted zoom a swipe gives a rubber band (${s.rub.toFixed(1)} dp), the view stays`, s);
    await up(); await sleep(700); s = await st(); ok(Math.abs(s.rub) < 0.5 && !s.sel, `${tag} and springs back when let go, nothing selected`, s);
    // a swipe wins over following the playhead
    g = await reset(); await ev(`x.view.a.snap(300); x.view.b.snap(600); x.ph = 520; x.play(); return 1;`); await sleep(100); g = await geo();
    // the finger swipes the view to the right (the playhead nears the view's end) and stays down while the playhead
    // passes the point where the view would page after it
    await down(g.cx + 120, g.mid); for (let i = 1; i <= 10; i++) { await move(g.cx + 120 + 8 * i, g.mid); await sleep(30); }
    // (the browser hands a pointer move over at the next frame: read once the last one has landed)
    await sleep(250); let f0 = await st(); await sleep(1500); let f1 = await st();
    ok(Math.abs(f1.a - f0.a) < 0.5 && f1.ph > f1.b - (f1.b - f1.a) * 0.05, `${tag} while a finger is on the canvas during playback, the view does not page after the playhead (${f0.a.toFixed(1)} → ${f1.a.toFixed(1)}; playhead ${f1.ph} past ${(f1.b - (f1.b - f1.a) * 0.05).toFixed(0)})`, [f0, f1]);
    for (let i = 1; i <= 10; i++) { await move(g.cx + 200 + 10 * i, g.mid); await sleep(30); }
    await up(); await sleep(1500); f0 = await st(); await sleep(800); f1 = await st();   // (after any fling has settled)
    ok(Math.abs(f1.a - f0.a) < 0.5, `${tag} swiped back so the playhead is out of view, the view stays where the finger left it`, [f0, f1]);
    await ev(`x.stopPlay(); return 1;`);
    // ------------------------------------------------ 2 pinch
    g = await reset(); await ev(`x.view.a.snap(300); x.view.b.snap(900); x.kick(); return 1;`); await sleep(80); g = await geo();
    const mx = g.cx + 190, um = g.a + (mx - g.cx - 40) / g.IW * (g.b - g.a);
    await T('touchStart', [[mx - 40, g.mid], [mx + 40, g.mid]]); await sleep(20);
    for (let i = 1; i <= 8; i++) { await T('touchMove', [[mx - 40 - 10 * i, g.mid], [mx + 40 + 10 * i, g.mid]]); await sleep(20); }
    let p1 = await st(); const um1 = p1.a + (mx - g.cx - 40) / g.IW * (p1.b - p1.a);
    ok(p1.b - p1.a < 300 && Math.abs(um1 - um) < 1.5, `${tag} a pinch zooms (${(g.b - g.a).toFixed(0)} → ${(p1.b - p1.a).toFixed(0)} units) keeping the time under the starting midpoint (${um.toFixed(1)} → ${um1.toFixed(1)})`, [p1, um, um1]);
    for (let i = 1; i <= 6; i++) { await T('touchMove', [[mx - 120 + 15 * i, g.mid], [mx + 120 + 15 * i, g.mid]]); await sleep(20); }
    const p2 = await st(); ok(Math.abs(p2.a - p1.a) < 0.5 && Math.abs(p2.b - p1.b) < 0.5, `${tag} moving both fingers together does not pan`, [p1, p2]);
    await T('touchEnd', [[mx + 210, g.mid]]); await sleep(30);
    for (let i = 1; i <= 6; i++) { await T('touchMove', [[mx + 210 - 20 * i, g.mid]]); await sleep(20); }
    const p3 = await st(); await T('touchEnd', []); await sleep(200); const p4 = await st();
    ok(Math.abs(p3.a - p2.a) < 0.5 && Math.abs(p4.a - p2.a) < 0.5 && !p4.sel, `${tag} the finger left after a pinch does nothing until all lift`, [p2, p3, p4]);
    // ------------------------------------------------ 4 double and triple tap
    g = await reset();
    const pm = await ev(`return window.WB.pausesOf(x.doc, 4).map(([a, c]) => (a + c) / 2);`);
    const isStop = v => v === 0 || v === g.L || pm.some(m => Math.abs(m - v) <= 0.6);
    await tap(at(g, 330), g.mid); await sleep(120); await tap(at(g, 331), g.mid); await sleep(120);
    s = await st();
    ok(s.sel && s.sel[0] <= 330 && s.sel[1] >= 331 && isStop(s.sel[0]) && isStop(s.sel[1]) && s.view === 'strip:range', `${tag} a double tap selects the sentence under the finger, pause middle to pause middle (${s.sel && s.sel.map(v => v / 10).join('–')} s)`, s);
    await sleep(400);
    await tap(at(g, 905), g.mid); await sleep(110); await tap(at(g, 905), g.mid); await sleep(110); await tap(at(g, 906), g.mid); await sleep(150);
    s = await st(); ok(s.sel && s.sel[0] === 0 && s.sel[1] === g.L, `${tag} a triple tap selects the piece (here the whole interview)`, s.sel);
    await ev(`x.reset(window.SCENES.kPiece.doc()); x.stack = [x.rootView()]; x.renderArea(true); return 1;`); await sleep(150); g = await geo();
    await tap(at(g, 700), g.mid); await sleep(110); await tap(at(g, 700), g.mid); await sleep(110); await tap(at(g, 700), g.mid); await sleep(150);
    s = await st(); ok(s.sel && s.sel[0] === 475 && s.sel[1] === 1063, `${tag} with three pieces a triple tap selects the piece under the finger`, s.sel);
    await sleep(400);
    await ev(`x.reset(window.SCENES.t3a.doc()); x.stack = [x.rootView()]; x.renderArea(true); return 1;`); await sleep(150); g = await geo();
    await tap(at(g, 900), g.mid); await sleep(110); await tap(at(g, 900), g.mid); await sleep(150);
    s = await st(); ok(s.sel && s.sel[0] === 0 && s.sel[1] === g.L, `${tag} music has no pauses: a double tap selects the piece`, s.sel);
    // two taps far apart are two single taps
    g = await reset(); await tap(at(g, 300), g.mid); await sleep(110); await tap(at(g, 600), g.mid); await sleep(150);
    s = await st(); ok(!s.sel && Math.abs(s.ph - 600) <= 6, `${tag} two taps 30 dp apart are two taps (no selection)`, s);
    // ------------------------------------------------ 5 hold, then drag
    g = await reset();
    await down(at(g, 420), g.mid); await sleep(380);
    s = await st(); ok(s.anchor !== null && Math.abs(s.anchor - 420) < 30 && !s.sel, `${tag} held 0.3 s still, the range's anchor shows at the press point (${s.anchor})`, s);
    for (let i = 1; i <= 8; i++) { await move(at(g, 420) + 12 * i, g.mid); await sleep(25); }
    await sleep(60); await up(); await sleep(250);
    s = await st(); ok(s.sel && Math.abs(s.sel[0] - 420) < 30 && s.sel[1] > s.sel[0] + 100 && !s.anchor && s.view === 'strip:range', `${tag} then a drag selects a range from the press point (${s.sel && s.sel.join('–')})`, s);
    g = await reset(); const ph0 = (await st()).ph;
    await down(at(g, 900), g.mid); await sleep(400); await up(); await sleep(60);
    s = await st(); ok(!s.sel && s.ph === ph0, `${tag} held and let go without dragging: nothing selected, the playhead stays (${s.ph})`, s);
    await sleep(400); s = await st(); ok(s.anchor === null, `${tag} the anchor fades away`, s);
    // ------------------------------------------------ 6 hold inside the selection lifts; on a piece it starts a range
    g = await reset(); await ev(`x.sel = [398, 585]; x.stack = [x.rootView()]; x.renderArea(); return 1;`); await sleep(100);
    await down(at(g, 490), g.mid); await sleep(400); s = await st();
    ok(s.hand, `${tag} a hold inside the selection lifts it`, s);
    for (let i = 1; i <= 10; i++) { await move(at(g, 490) + 15 * i, g.mid); await sleep(25); } await up(); await sleep(400);
    s = await st(); ok(!s.hand && s.sel && s.sel[0] !== 398, `${tag} and dropping it moves it (${s.sel && s.sel.join('–')})`, s);
    await ev(`x.reset(window.SCENES.kPiece.doc()); x.stack = [x.rootView()]; x.renderArea(true); return 1;`); await sleep(150); g = await geo();
    await down(at(g, 700), g.mid); await sleep(400); s = await st(); await up(); await sleep(200);
    ok(!s.hand && s.anchor !== null, `${tag} a hold on an unselected piece starts a range, it does not lift the piece`, s);
    // ------------------------------------------------ 7 grips, magnify, edge auto-scroll, edge strips
    g = await reset(); await ev(`x.sel = [398, 585]; x.stack = [x.rootView()]; x.renderArea(); return 1;`); await sleep(100);
    const gr = await ev(`const c = x.cv.getBoundingClientRect(), r = x.gripLayout()[1]; return { x: c.left + r.bx + r.bw / 2, y: c.top + r.by + r.bh / 2 };`);
    await down(gr.x, gr.y); await sleep(30); for (let i = 1; i <= 6; i++) { await move(gr.x + 10 * i, gr.y); await sleep(20); } await up(); await sleep(200);
    s = await st(); ok(s.sel && s.sel[1] > 585 && s.sel[0] === 398, `${tag} the end grip still drags (${s.sel && s.sel.join('–')})`, s);
    const gr2 = await ev(`const c = x.cv.getBoundingClientRect(), r = x.gripLayout()[1]; return { x: c.left + r.bx + r.bw / 2, y: c.top + r.by + r.bh / 2 };`);
    await down(gr2.x, gr2.y); await sleep(700); s = await st(); await up(); await sleep(900);
    ok(s.mag, `${tag} and held still it magnifies`, s);
    g = await reset(); await ev(`x.view.a.snap(800); x.view.b.snap(1100); x.kick(); return 1;`); await sleep(80); g = await geo();
    await down(g.cx + 150, g.mid); await sleep(380); for (let i = 1; i <= 12; i++) { await move(g.cx + 150 + (g.W - 52 - 150) * i / 12, g.mid); await sleep(20); }
    await sleep(4500); await up(); await sleep(300); s = await st();
    ok(s.b >= g.L - 0.5 && s.sel && s.sel[1] === g.L, `${tag} holding a range's end 52 dp from the right edge scrolls the view to the end and selects to it`, s);
    g = await reset(); await ev(`x.sel = [398, 585]; x.stack = [x.rootView()]; x.renderArea(); return 1;`); await sleep(100);
    await swipe(g.cx + 6, g.mid, g.cx + 130, 8, 20, 30); await sleep(200); s = await st();
    ok(!s.sel && Math.abs(s.a) < 0.01, `${tag} a swipe from the left edge strip is the system's Back (lets go of the selection), not a scroll`, s);
    // ------------------------------------------------ 8 the volume curve; tracks
    g = await reset(); await ev(`x.view.a.snap(300); x.view.b.snap(700); x.onTool('env'); x.hideCoach(); return 1;`); await sleep(150); g = await geo();
    await tap(at(g, 500), g.mid); await sleep(150); let n1 = await ev(`return (x.doc.env || []).length;`);
    ok(n1 === 1, `${tag} volume curve: a tap adds a point`, n1);
    await swipe(g.cx + 300, g.mid + 10, g.cx + 200, 8, 24, 150); await sleep(150); s = await st(); let n2 = await ev(`return (x.doc.env || []).length;`);
    ok(n2 === 1 && s.a > 300.5, `${tag} volume curve: a swipe elsewhere scrolls (${s.a.toFixed(1)}), adds nothing`, { n2, a: s.a });
    const ep = await ev(`const g = x.geom(), c = x.cv.getBoundingClientRect(), p = x.doc.env[0], yOf = db => g.bandTop + 6 + (1 - (db + 24) / 36) * (g.bandBot - g.bandTop - 12); return { x: c.left + x.d2x(p.u), y: c.top + yOf(p.db), u: p.u };`);
    await swipe(ep.x, ep.y, ep.x + 40, 6, 24, 60); await sleep(150); const ep2 = await ev(`return x.doc.env[0].u;`);
    ok(ep2 > ep.u + 10, `${tag} volume curve: a point drags (${ep.u} → ${ep2})`, [ep.u, ep2]);
    g = await reset(); await ev(`const d = window.SCENES.kTracks8.doc(); x.reset(d); x.laneOff = 0; x.stack = [x.rootView()]; x.renderArea(true); return 1;`); await sleep(150); g = await geo();
    await down(g.cx + 200, g.laneTop + 120); await sleep(20); for (let i = 1; i <= 8; i++) { await move(g.cx + 200, g.laneTop + 120 - 15 * i); await sleep(20); } await up(); await sleep(200);
    s = await st(); ok(s.laneOff > 40 && Math.abs(s.a) < 0.01, `${tag} a vertical drag on the tracks scrolls them (${s.laneOff} dp), not the view`, s);
    await ev(`x.laneOff = 0; x.kick(); return 1;`); await sleep(100); g = await geo();
    await tap(g.cx + 200, g.laneTop + 24); await sleep(150); s = await st(); ok(s.track, `${tag} a tap on a track selects it`, s);
    await ev(`x.track = null; x.stack = [x.rootView()]; x.renderArea(); return 1;`);
    await down(g.cx + 200, g.laneTop + 24); await sleep(450); s = await st(); await up(); await sleep(150); const s4 = await st();
    ok(!s.anchor && !s.hand && !s.sel && s4.track, `${tag} a hold on a track starts nothing (let go, it is a tap: the track is selected)`, [s, s4]);
  }
  // ------------------------------------------------ 10 the mouse keeps the desktop's ways
  await b.viewport(1440, 900, false, 1, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(900);
  const m = (type, x, y) => b.mouse(type, x, y);
  const gm = await ev(`x.scr.scrollIntoView({ block: 'start' }); window.resetLive(); x.measure(); const c = x.cv.getBoundingClientRect(), g = x.geom(); return { cx: c.left, cy: c.top, IW: x.IW, a: x.view.a.v, b: x.view.b.v, mid: c.top + g.mid - 40 };`);
  await sleep(200);
  const atm = u => gm.cx + 40 + (u - gm.a) / (gm.b - gm.a) * gm.IW;
  await m('mousePressed', atm(300), gm.mid); for (let i = 1; i <= 10; i++) { await m('mouseMoved', atm(300) + 12 * i, gm.mid); await sleep(16); } await m('mouseReleased', atm(300) + 120, gm.mid); await sleep(250);
  let sm = await ev(`return { sel: x.sel, a: x.view.a.v };`);
  ok(sm.sel && sm.sel[1] - sm.sel[0] > 100 && sm.a === 0, 'mouse: a drag selects (desktop)', sm);
  await ev(`window.resetLive(); return 1;`); await sleep(150);
  await m('mousePressed', atm(310), gm.mid); await sleep(30); await m('mouseReleased', atm(310), gm.mid); await sleep(100); await m('mousePressed', atm(310), gm.mid); await sleep(30); await m('mouseReleased', atm(310), gm.mid); await sleep(200);
  sm = await ev(`return { sel: x.sel, want: x.sentenceAt(310) };`);
  ok(sm.sel && sm.sel[0] === sm.want[0] && sm.sel[1] === sm.want[1], 'mouse: a double click selects the sentence', sm);
  console.log('page errors:', JSON.stringify(b.errors.filter(e => !/ERR_FILE/.test(e))));
  ok(b.errors.filter(e => !/ERR_FILE/.test(e)).length === 0, 'no page errors');
} finally { await b.close(); }
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
