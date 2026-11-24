// Tour: click every coverage-map item, screenshot the phone it drives. Usage: node tour.mjs <outDir>
import { launch, sleep } from '../../tools/cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const b = await launch();
const NAME = { 工作台: 'W', 首页: 'H', 一句话: 'P', 处理: 'T', 晚风: 'M', 导出: 'E', 配音: 'V', 音乐库: 'L', 会员: 'S' };
try {
  await b.viewport(1600, 1000, false, 1);
  await b.open('file://' + path.resolve(here, '../dir-3.html'));
  await sleep(1500);
  const n = await b.eval(`document.querySelectorAll('.cov .it').length`);
  for (let i = 0; i < n; i++) {
    const info = await b.eval(`(() => { const e = document.querySelectorAll('.cov .it')[${i}]; return { id: e.querySelector('.id').textContent, ph: e.querySelector('.wh b').textContent }; })()`);
    await b.eval(`document.querySelectorAll('.cov .it')[${i}].click()`);
    await sleep(1100);
    const id = NAME[info.ph];
    const r = await b.eval(`(() => { const e = document.querySelector('[data-phone=${id}] .ph-scr'); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height }; })()`);
    await b.shot(path.join(out, info.id + '.png'), r);
  }
  console.log('shots', n, 'errors', b.errors.length, b.errors.slice(0, 5).join(' | '));
} finally { await b.close(); }
