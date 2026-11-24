import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(360, 780, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(900);
  const r = await b.eval(`(async () => { const x = document.querySelector('.scr[data-scene=live]')._bench; x.scr.scrollIntoView(); await new Promise(r => setTimeout(r, 200));
    const snap = (n) => { x.measure(); const g = x.geom(); return n + ' bot ' + x.botEl.offsetHeight + ' top ' + x.botEl.offsetTop + ' H ' + x.H + ' restH ' + x._restDockH + ' dockTop ' + g.dockTop + ' restTop ' + g.restTop + ' main ' + g.blockY + '+' + g.blockH + ' waterB ' + x.waterEl.style.bottom + ' playTop ' + Math.round(x.playEl.getBoundingClientRect().top - x.tlEl.getBoundingClientRect().top) + ' anims ' + document.getAnimations().length + ' water ' + JSON.stringify(x.waterEl.getBoundingClientRect().top - x.tlEl.getBoundingClientRect().top) + ' wh ' + x.waterEl.offsetHeight + ' op ' + x.waterEl.offsetParent.className + ':' + x.waterEl.offsetParent.clientHeight + ' wot ' + x.waterEl.offsetTop + ' stH ' + x.stageEl.clientHeight + ' stS ' + x.stageEl.scrollTop + ' cs ' + getComputedStyle(x.waterEl).top + '/' + getComputedStyle(x.waterEl).bottom + ' tlot ' + x.tlEl.offsetTop + ' scrS ' + x.scr.scrollTop + ' wcs ' + getComputedStyle(x.waterEl).transform + ' pcs ' + getComputedStyle(x.playEl).transform + ' ' + x.playEl.offsetTop + ' ' + x.waterEl.getAnimations().length + ' ' + x.playEl.getAnimations().map(a => a.animationName || a.id || a.effect && JSON.stringify(a.effect.getKeyframes())).join('|'); };
    const out = [snap('rest')];
    x.sel = [0, 90]; x.stack = [x.rootView()]; x.renderArea(); out.push(snap('sel'));
    x.openExport(); out.push(snap('export now'));
    await new Promise(r => setTimeout(r, 800)); out.push(snap('export +800'));
    document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }); out.push(snap('finished'));
    return out.join('\\n'); })()`);
  console.log(r);
} finally { await b.close(); }
