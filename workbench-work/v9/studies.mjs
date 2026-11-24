// The single-track rest screen of each study (and v8), 360x780, light and dark, blur on and off.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT9 = path.resolve(process.argv[2]), ROOT8 = path.resolve(process.argv[3]);
const b = await launch();
try {
  await b.viewport(360, 780, true, 2, false);
  const runs = [['v8', ROOT8, ''], ['s1', ROOT9, '?study=1'], ['s2', ROOT9, '?study=2'], ['s3', ROOT9, '?study=3']];
  for (const [tag, root, q] of runs) for (const theme of ['light', 'dark']) for (const blur of ['blur', 'noblur']) {
    await b.open('file://' + path.join(root, 'index.html') + q);
    await sleep(900);
    await b.eval(`(async () => { document.documentElement.dataset.theme = '${theme}'; document.body.classList.toggle('noblur', '${blur}' === 'noblur'); document.dispatchEvent(new Event('themechange'));
      const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench; window.resetLive(); await new Promise(r => setTimeout(r, 200)); x.hideCoach(); x.ph = 1560; x.renderTime(); x.kick(); scr.scrollIntoView(); })()`);
    await sleep(500);
    const clip = await b.eval(`(() => { const r = document.querySelector('.scr[data-scene=live]').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; })()`);
    await b.shot(path.resolve(`shots/study-${tag}-${theme}-${blur}.png`), clip);
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
