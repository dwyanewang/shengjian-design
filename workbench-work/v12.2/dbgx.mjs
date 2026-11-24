import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]), W = +process.argv[3] || 360, H = +process.argv[4] || 780;
const b = await launch();
try {
  await b.viewport(W, H, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html') + (process.argv[5] || ''));
  await sleep(900);
  console.log(await b.eval(process.argv[6] || '1'));
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
