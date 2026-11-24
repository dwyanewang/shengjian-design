import { launch, sleep } from '../cdp.mjs';
const b = await launch();
try {
  await b.viewport(390, 844, true, 2, false);
  await b.open('http://127.0.0.1:8765/v12.2/index.html');
  await sleep(1500);
  const n = await b.eval(`document.querySelectorAll('.scr[data-scene] canvas').length`);
  console.log('canvases', n, 'errors', JSON.stringify(b.errors));
} finally { await b.close(); }
