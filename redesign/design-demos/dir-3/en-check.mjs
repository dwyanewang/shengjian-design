// English check: swap the workbench's visible strings for English and screenshot (no English screen is shipped).
import { launch, sleep } from '../../tools/cdp.mjs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = process.argv[2];
const b = await launch();
await b.viewport(1600, 1000, false, 2);
await b.open('file://' + path.resolve(here, '../dir-3.html')); await sleep(1600);
const shoot = async (ph, file) => { const r = await b.eval(`(() => { const e = document.querySelector('[data-phone=${ph}] .ph-scr'); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height }; })()`); await b.shot(path.join(out, file), r); };
const swap = (ph) => b.eval(`(() => {
  const P = document.querySelector('[data-phone=${ph}]');
  const tx = (sel, f) => P.querySelectorAll(sel).forEach(e => { if (e.children.length && !e.matches('.lbl.gap')) return; const t = e.textContent; const n = f(t); if (n != null) e.textContent = n; });
  tx('.lbl.gap', t => t.replace(/停顿 ([\\d.]+)\\s秒.*/, 'Pause $1\u00A0s'));
  tx('.lbl.dim', t => t.replace(/第 (\\d+) 句\\s*([\\d.]+)\\s秒/, 'Line $1, $2\u00A0s').replace(/合上了\\s*省 ([\\d.]+)\\s秒/, 'Closed, saved $1 s'));
  tx('.lbl', t => /只有环境声/.test(t) ? 'Room noise only, 2.6 s' : null);
  tx('.mk-l', t => ({ '第一个问题': 'First question', '王老师推荐的三本书': 'Three books Mr Wang recommends' })[t] || null);
  tx('.seam-l', t => t.replace(/删了 ([\\d.]+)\\s秒/, 'Cut $1 s'));
  const T = { '删停顿': 'Pauses', '降噪': 'Denoise', '配乐': 'Music', '标记': 'Marker', '分割': 'Split', '插入': 'Insert', '音量': 'Volume', '全部工具': 'All tools', '更多': 'More', '剪掉': 'Cut', '只留': 'Keep only', '淡入淡出': 'Fade', '复制': 'Copy', '剪切': 'Cut out', '重复': 'Repeat', '移动': 'Move', '降噪这段': 'Denoise this' };
  P.querySelectorAll('.tool').forEach(e => { const n = [...e.childNodes].find(c => c.nodeType === 3); if (n && T[n.textContent]) n.textContent = T[n.textContent]; });
  const s = P.querySelector('.sayf span'); if (s) s.textContent = 'Say it: delete long pauses, a bit louder';
  const h = P.querySelector('.hdr .tt b'); if (h) h.textContent = 'Podcast No. 12';
  const hs = P.querySelector('.hdr .tt > span'); if (hs) hs.textContent = 'Talking reading with Mr Wang  Original  18:40';
  const x = P.querySelector('.hdr .btn'); if (x) x.textContent = 'Export';
  const hint = P.querySelector('.hint'); if (hint) hint.firstChild.textContent = 'Swipe across this gap to close it, or tap it.';
  return [...P.querySelectorAll('.lbl, .mk-l, .seam-l')].filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = e.getBoundingClientRect(), s = P.querySelector('.ph-scr').getBoundingClientRect(); return Math.round((r.right - s.right) / (s.width / 360)); }).filter(v => v > -2).length;
})()`);
console.log('W labels overflowing the screen edge:', await swap('W'));
await shoot('W', 'en-W.png');
// selection tools + music spine (labels at x=276)
await b.eval(`window.scrollTo(0, 0)`);
const clickTxt = async (ph, t) => { const c = await b.eval(`(() => { const e = [...document.querySelectorAll('[data-phone=${ph}] button')].find(e => e.textContent.includes(${JSON.stringify(t)})); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`); await b.mouse('mouseMoved', c.x, c.y); await b.mouse('mousePressed', c.x, c.y); await b.mouse('mouseReleased', c.x, c.y); await sleep(500); };
await clickTxt('W', 'Music');
console.log('W with music, labels overflowing:', await swap('W'));
await shoot('W', 'en-W-bgm.png');
await b.close();
