// Heights of the canvas in view, the dock, the main line and play, in each state, at 360x780 and 390x844.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(1000);
    const r = await b.eval(`(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench, S = window.SCENES; scr.scrollIntoView();
      const m = () => { x.areaEl.getAnimations().forEach(a => a.finish()); x.measure(); const g = x.geom(), s0 = scr.getBoundingClientRect(), hd = scr.querySelector('.hdr').getBoundingClientRect(), bt = x.botEl.getBoundingClientRect(), pl = x.playEl.getBoundingClientRect();
        const row = x.toolsEl.querySelector('.strip-s'), vis = row ? [...row.querySelectorAll('.act')].filter(a => a.offsetLeft - row.offsetLeft + a.offsetWidth <= row.clientWidth + row.scrollLeft + 0.5 && a.offsetLeft - row.offsetLeft >= row.scrollLeft - 0.5).map(a => a.dataset.k) : [];
        return { header: Math.round(hd.height), canvasInView: Math.round(bt.top - hd.bottom), dock: Math.round(bt.height), mainLine: Math.round(g.blockH), playY: pl.height ? Math.round(pl.top - s0.top) : null, tools: vis.join(' ') }; };
      const out = {};
      window.resetLive(); x.hideCoach(); await wait(300); out.rest = m();
      x.play(); await wait(400); out.playing = m(); x.stopPlay();
      x.sel = [315, 440]; x.stack = [x.rootView()]; x.renderArea(); await wait(400); out.range = m();
      window.resetLive(); x.hideCoach(); await wait(200); x.toolsEl.querySelector('[data-k=dn]').click(); await wait(700); out.denoise = m(); x.back(true);
      x.cat = 'add'; x.renderArea(); await wait(200); x.toolsEl.querySelector('[data-k=tts]').click(); await wait(700); out.tts = m(); x.back(true);
      x.sel = [315, 440]; x.stack = [x.rootView()]; x.renderArea(); x.openExport(); await wait(700); out.export = m(); x.back(true); x.sel = null; x.stack = [x.rootView()]; x.renderArea();
      x.sayEl.click(); await wait(700); out.typing = m(); x.back(true); x.setTyping(false);
      x.reset(S.kTracks5.doc()); x.stack = [x.rootView()]; x.renderArea(true); await wait(400); out.tracks5 = m(); out.tracks5.lanesFit = x._laneMax === 0;
      window.resetLive(); return out;
    })()`);
    console.log(w + 'x' + h); for (const [k, v] of Object.entries(r)) console.log('  ' + k + ' ' + JSON.stringify(v));
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
