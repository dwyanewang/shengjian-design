// Header, transport, suggestion row and the free gap at rest, at both sizes.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(900);
    const r = await b.eval(`(async () => {
      const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench; window.resetLive(); await new Promise(r => setTimeout(r, 400));
      const R = s => { const e = scr.querySelector(s); return e ? e.getBoundingClientRect() : null; };
      const s0 = scr.getBoundingClientRect(), hd = R('.hdr'), tp = R('.tp'), sg = R('.sugg'), bt = R('.bot'), al = R('.addlane'), pl = R('.tp .play');
      const g = x.geom();
      return { scr: Math.round(s0.height), hdr: Math.round(hd.height), audio: Math.round(R('.tl').height), main: Math.round(g.mainH), ruler: g.ruler, addLane: Math.round(al.height), tp: Math.round(tp.height), freeAboveSugg: Math.round(sg.top - tp.bottom), sugg: Math.round(sg.height), suggToTray: Math.round(bt.top - sg.bottom), tray: Math.round(bt.height), playTop: Math.round(pl.top - s0.top), playSize: Math.round(pl.width) };
    })()`);
    console.log(w + 'x' + h, JSON.stringify(r));
  }
} finally { await b.close(); }
