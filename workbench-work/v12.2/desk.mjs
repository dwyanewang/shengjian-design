import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const b = await launch();
try {
  await b.viewport(1440, 900, false, 1, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(1200);
  for (const id of ['live', 'idea', 'eval']) {
    const y = await b.eval(`document.getElementById('${id}').getBoundingClientRect().top + scrollY`);
    await b.shot(OUT + '-' + id + '.png', { x: 0, y, width: 1440, height: 900 });
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
