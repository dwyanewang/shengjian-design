import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const b = await launch();
try {
  await b.viewport(1440, 900, false, 1, false);
  await b.open('file://' + path.resolve(process.argv[2], 'index.html')); await sleep(800);
  console.log(await b.eval(`(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench;
    const m = () => JSON.stringify({ tl: Math.round(x.tlEl.getBoundingClientRect().height), tlS: x.tlEl.style.height, bot: Math.round(x.botEl.getBoundingClientRect().height), tools: x.toolsEl.offsetHeight, cats: x.catsEl.offsetHeight, area: x.areaEl.offsetHeight, act: (x.toolsEl.querySelector('.act')||{}).offsetHeight, play: Math.round(x.playEl.getBoundingClientRect().top) });
    x.addTrack({ src: 'music1', name: 'm', lane: 1 }); x.renderArea(); await wait(900); const a = m();
    x.onAct('tool', x.toolsEl.querySelector('[data-k=tvol]')); await wait(900); return a + ' / ' + m(); })()`));
} finally { await b.close(); }
