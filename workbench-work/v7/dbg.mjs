import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const b = await launch();
try {
  await b.viewport(360, 780, true, 2, false);
  await b.open('file://' + path.resolve(process.argv[2], 'index.html')); await sleep(800);
  console.log(await b.eval(`(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench; scr.scrollIntoView({block:'start'}); await wait(200);
    const m = () => JSON.stringify({ scr: scr.clientHeight, tl: Math.round(x.tlEl.getBoundingClientRect().height), tlStyle: x.tlEl.style.height, bot: Math.round(x.botEl.getBoundingClientRect().height), area: [x.areaEl.scrollHeight, x.areaEl.clientHeight], botTop: Math.round(x.botEl.getBoundingClientRect().top - scr.getBoundingClientRect().top) });
    const a = m(); x.sel = [315, 440]; x.stack = [x.rootView()]; x.renderArea(); x.openExport(); x.exp.open = 'quality'; x.renderArea(); await wait(300); return a + ' / ' + m(); })()`));
} finally { await b.close(); }
