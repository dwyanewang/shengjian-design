// The time beside play: never cut, never under play, at 360 and 390, normal and font scale 1.3.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(900);
    const r = await b.eval(`[...document.querySelectorAll('.scr[data-scene]')].map(scr => {
      const tm = scr.querySelector('.tp .tm'), s = tm && tm.firstElementChild, p = scr.querySelector('.tp .play');
      if (!s || !p) return null;
      const a = s.getBoundingClientRect(), q = p.getBoundingClientRect(), t = tm.getBoundingClientRect();
      return { sc: scr.dataset.scene, cut: a.right > t.right + 0.5, under: a.right > q.left - 2, fs: getComputedStyle(s).fontSize, txt: s.textContent };
    }).filter(Boolean)`);
    const bad = r.filter(o => o.cut || o.under), shrunk = r.filter(o => o.fs !== r.find(z => z.sc === 'live').fs && !['kFsRest','kFsTrack','kFsExport','kFsParam'].includes(o.sc));
    console.log(w, 'screens', r.length, 'bad', JSON.stringify(bad), 'shrunk', JSON.stringify(shrunk.map(o => o.sc + ':' + o.fs + ':' + o.txt)));
  }
  console.log('page errors:', JSON.stringify(b.errors));
} finally { await b.close(); }
