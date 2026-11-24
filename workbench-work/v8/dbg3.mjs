import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(360, 780, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(900);
  const r = await b.eval(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench; window.resetLive(); await wait(300);
    x.toolsEl.querySelector('[data-k=tts]').click(); await wait(900);
    const kids = [...x.areaEl.children].map(c => c.className + ':' + c.offsetHeight + '/' + c.scrollHeight);
    const t = x.areaEl.querySelector('textarea');
    return { tlh: x._tlh, top: x.top.t, kids, bot: x.botEl.offsetHeight, area: x.areaEl.offsetHeight, ta: t && (t.offsetHeight + '/' + t.scrollHeight + ' ' + t.style.height) };
  })()`);
  console.log(JSON.stringify(r));
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
