import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(1440, 900, false, 1, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(800);
  console.log('errors:', JSON.stringify(b.errors, null, 1));
  console.log(await b.eval(`JSON.stringify({ n: document.querySelectorAll('.scr').length, benches: (window.BENCHES||[]).length, views: [...document.querySelectorAll('.scr')].map(s => s.dataset.scene + ':' + s.dataset.view).join(' ') })`));
} finally { await b.close(); }
