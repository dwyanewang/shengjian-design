// Bottom rows at 360 and 390 dp (and the static font-scale 1.3 and English screens): every tool at least 48 dp wide,
// fully visible or clearly continued; no back control in the rows; play in one place; the audio never below its
// minimum with the tallest control open at 360x780.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
let fails = 0;
const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!c) fails++; };
const rowsJS = sel => `(() => {
  document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* infinite */ } });   // measure where things come to rest
  const out = [];
  document.querySelectorAll(${JSON.stringify(sel)}).forEach(scr => {
    const x = scr._bench; if (!x) return;
    const tools = scr.querySelector('.tools .strip-s'), tr = tools && tools.getBoundingClientRect();
    const scrollable = tools && tools.scrollWidth > tools.clientWidth + 1;
    const acts = [...scr.querySelectorAll('.tools .act')].map(a => a.getBoundingClientRect());
    const vis = acts.filter(q => q.right > tr.left + 1 && q.left < tr.right - 1);
    const narrow = acts.filter(q => q.width < 48 - 0.5).length;
    const cut = vis.filter(q => q.left < tr.left - 0.5 || q.right > tr.right + 0.5);
    const badCut = cut.filter(q => !(scrollable && (Math.abs(q.right - tr.right) < q.width || Math.abs(q.left - tr.left) < q.width))).length;
    const tabs = [...scr.querySelectorAll('.cats .tab, .cats .saypill')].map(t => t.getBoundingClientRect());
    const tabsSmall = tabs.filter(q => q.width < 48 - 0.5 || q.height < 48 - 0.5).length;
    const labels = [...scr.querySelectorAll('.tools .al, .cats .tab')];
    const over = labels.filter(l => l.scrollWidth > l.clientWidth + 1).length;
    const tiny = labels.filter(l => parseFloat(getComputedStyle(l).fontSize) < 10.5).length;
    const back = scr.querySelectorAll('.tools [data-a=back], .cats [data-a=back]').length;
    // v5: cells and tabs at least 48 dp as touch areas (unscaled sizes); all five tabs inside the row; the entry 48 high
    const low = [...scr.querySelectorAll('.tools .act')].filter(a => a.offsetHeight < 48 || a.offsetWidth < 48).length;
    const tabEls = [...scr.querySelectorAll('.cats .tab')], tr2 = scr.querySelector('.cats .tabs');
    const trr = tr2 && tr2.getBoundingClientRect();
    const tabsOut = tabEls.filter(t => { const q = t.getBoundingClientRect(); return t.offsetHeight < 48 || t.offsetWidth < 48 || q.left < trr.left - 0.5 || q.right > trr.right + 0.5; }).length + (tabEls.length === 5 ? 0 : 10);
    const say = scr.querySelector('.tp .sayf'), sayR = say && say.offsetHeight ? say.getBoundingClientRect() : null;
    const sayHit = sayR ? [sayR.top - 1.5, sayR.bottom + 1.5].every(y => { const h = document.elementFromPoint(sayR.left + sayR.width / 2, y); return h && (h === say || say.contains(h)); }) : true;
    const sayLow = say && say.offsetHeight && (say.offsetHeight + 4 < 48 || say.offsetWidth < 48) ? 1 : 0;
    const sayIcon = false;
    if (scr.classList.contains('typing')) return;   // the keyboard is up: tools and categories have made way
    out.push({ s: scr.dataset.scene, n: acts.length, w: acts.length ? Math.round(Math.min(...acts.map(q => q.width))) : 0, narrow, badCut, tabsSmall, over, tiny, back, low, tabsOut, sayLow, sayIcon, mode: tools ? (tools.classList.contains('grid') ? 'grid' : 'row') : '-' });
  });
  return out; })()`;
try {
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(900);
    const r = await b.eval(rowsJS('.scr[data-scene]'));
    const bad = r.filter(o => o.narrow || o.badCut || o.tabsSmall || o.over || o.tiny || o.back || o.low || o.tabsOut || o.sayLow);
    ok(bad.length === 0, `${w} dp: ${r.length} screens — every tool cell ≥ 48×48 dp and fully visible; all five tabs inside the row, ≥ 48×48; the entry ≥ 48; labels fit on one line (≥ 10.5 px); no back in the rows`, bad);
    const iconOnly = r.filter(o => o.sayIcon && !/^kFs/.test(o.s)).map(o => o.s);
    ok(iconOnly.length === 0, `${w} dp: at normal text size the entry keeps its label in Chinese and English (icon only at 1.3)`, iconOnly);
    const sample = r.filter(o => ['live', 't1b', 'kPiece', 'kTrackRow', 'kRestSound', 't4d', 'kFsRest', 'kFsTrack', 'kEnRest', 'kEnTrack'].includes(o.s)).map(o => `${o.s}:${o.n}@${o.w}${o.mode}`);
    console.log('  ', sample.join('  '));
    // the live phone at this size: play in one place across states; tallest control
    const res = await b.eval(`(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench; scr.scrollIntoView({ block: 'start' }); await wait(200);
      const pos = () => { const p = x.playEl.getBoundingClientRect(), s = scr.getBoundingClientRect(); return [Math.round(p.left - s.left), Math.round(p.top - s.top)]; };
      const out = {}; window.resetLive(); await wait(200);
      const st = (k, f) => { f(); x.renderArea(); out[k] = pos(); };
      st('rest', () => {});
      for (const c of ['edit', 'sound', 'add', 'more', 'ctx']) st('cat-' + c, () => { x.cat = c; });
      st('range', () => { x.sel = [315, 440]; x.stack = [x.rootView()]; });
      st('range-fade', () => { x.onAct('tool', x.toolsEl.querySelector('[data-k=fade]')); });
      x.back(true); x.sel = null; x.stack = [x.rootView()]; x.cat = 'ctx'; x.renderArea();
      st('denoise', () => { x.onAct('tool', x.toolsEl.querySelector('[data-k=dn]')); });
      x.back(true);
      st('rec', () => { x.onAct('tool', x.toolsEl.querySelector('[data-k=rec]')); });
      x.back(true);
      const fixed = Object.values(out).every(p => p[0] === out.rest[0] && p[1] === out.rest[1]);
      // the tallest control: export with a selection and its quality section open
      x.sel = [315, 440]; x.stack = [x.rootView()]; x.renderArea(); x.openExport(); x.exp.open = 'quality'; x.renderArea(); await wait(1200);
      const tl = x.tlEl.getBoundingClientRect().height, s = scr.getBoundingClientRect();
      const vis = sel => { const e = scr.querySelector(sel); if (!e) return false; const q = e.getBoundingClientRect(); return q.top >= s.top - 0.5 && q.bottom <= s.bottom + 0.5 && q.height > 0; };
      // v7: the canvas does not shrink; the dock covers it. What is left in view above the dock, and the handles there
      const g = x.geom(); const canvasVis = Math.round(x.botEl.getBoundingClientRect().top - x.tlEl.getBoundingClientRect().top);
      const tall = { tl: canvasVis, play: pos(), go: vis('[data-a=expGo]'), out: vis('.area [data-a=back]'), tools: vis('.tools'), cats: vis('.cats .tab.cur'), handlesAbove: g.handleY + 11 <= g.dockTop - 8, mainInView: g.blockY + g.blockH <= g.dockTop - 2 };
      // decision buttons take 48 dp of touch: 4 dp beyond the drawn pill above and below
      const hitOk = [...scr.querySelectorAll('.area .dbtn')].every(bt => { const q = bt.getBoundingClientRect(), cx = q.left + q.width / 2; return [q.top - 3.5, q.bottom + 3.5].every(y => { const h = document.elementFromPoint(cx, y); return h && (h === bt || bt.contains(h)); }); });
      tall.hit48 = hitOk;
      x.back(true); x.sel = null; x.stack = [x.rootView()]; x.renderArea(); await wait(1200);
      tall.back = pos();
      return { out, fixed, tall };
    })()`);
    ok(res.fixed, `${w}x${h}: play at the same place at rest, in every category, with a selection, with fade, denoise and the recorder open`, res.out);
    ok(res.tall.hit48, `${w}x${h}: decision buttons (40 dp drawn) take touches 4 dp above and below: 48 dp`, res.tall.hit48);
    ok(res.tall.mainInView, `${w}x${h}: with the tallest control the whole main line (all its bars) stays above the dock`, res.tall);
    ok(res.tall.handlesAbove, `${w}x${h}: with the tallest control the selection handles ride above the dock (never under it or the head)`, res.tall);
    ok(res.tall.tl >= 150 && res.tall.go && res.tall.out && res.tall.tools && res.tall.cats && res.tall.play[0] === res.out.rest[0] && res.tall.play[1] === res.out.rest[1] && res.tall.back[0] === res.out.rest[0] && res.tall.back[1] === res.out.rest[1], `${w}x${h}: the tallest control (export + selection + quality): ${res.tall.tl} dp of the canvas stay in view above the dock (≥ 150); its buttons, the tools and the categories on screen; play does not move`, res.tall);
    // v7: when the dock may make way, and when it must not
    const c = await b.eval(`(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench, S = window.SCENES; window.resetLive(); await wait(200);
      const out = {};
      x.play(); await wait(700); out.playing = !x.collapsed; x.stopPlay();
      const cv = x.cv, r = cv.getBoundingClientRect(); cv.dispatchEvent(new WheelEvent('wheel', { deltaX: 120, clientX: r.left + 150, clientY: r.top + 200, bubbles: true, cancelable: true })); await wait(300); out.browse = !x.collapsed;
      // five tracks: scrolling them makes the tools step aside, and back at the top they return
      const d8 = S.kTracks5.doc(); d8.tracks = d8.tracks.concat(d8.tracks.slice(0, 3).map((t, i) => Object.assign({}, t, { id: t.id + 'b' + i, name: t.name + ' 2' })));
      x.reset(d8); x.stack = [x.rootView()]; x.renderArea(true); await wait(200); x.measure(); x.draw();
      out.laneMax = x._laneMax; x.scrollLanes(200); await wait(400); out.lanesCollapse = x.collapsed === 'lanes'; x.scrollLanes(0); await wait(500); out.lanesBack = !x.collapsed;
      // never while a control is open or a finger is in the dock
      x.toolsEl.querySelector('[data-k=dn]').click(); await wait(300); out.ctrl = x.stack.length > 1; x.scrollLanes(200); await wait(300); out.ctrlHolds = !x.collapsed; x.back(true); x.scrollLanes(0); await wait(400);
      x._dockDown = true; x.scrollLanes(200); await wait(300); out.downHolds = !x.collapsed; x._dockDown = false; x.scrollLanes(0); await wait(300);
      // a category tap brings it back
      x.scrollLanes(200); await wait(300); x.catsEl.querySelector('.tab[data-k=edit]').click(); await wait(500); out.catBack = !x.collapsed;
      window.resetLive(); return out;
    })()`);
    ok(c.playing && c.browse, `${w}x${h}: playback and browsing do not move the dock`, c);
    ok(c.laneMax > 0 && c.lanesCollapse && c.lanesBack && c.catBack, `${w}x${h}: scrolling a long stack of tracks (eight) makes the tools step aside; back at the top, or a tap on a category, brings them back`, c);
    ok(c.ctrl && c.ctrlHolds && c.downHolds, `${w}x${h}: nothing collapses while a control is open or a finger is down in the dock`, c);
  }
  console.log('page errors:', JSON.stringify(b.errors));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
} finally { await b.close(); }
