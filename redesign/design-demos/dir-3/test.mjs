// Click test for dir-3.html. Usage: node test.mjs [outDir]
// Drives the board with real mouse events through CDP and checks each phone reacts.
import { launch, sleep } from '../../tools/cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = process.argv[2] || path.join(here, '../shots/dir-3/test');
fs.mkdirSync(out, { recursive: true });
const b = await launch();
const results = [];
const ok = (name, pass, info) => { results.push({ name, pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const q = (sel) => JSON.stringify(sel);
async function center(sel, i = 0) { // scroll the element into the viewport (page scroll only), return its center in viewport coords
  return b.eval(`(() => { const e = document.querySelectorAll(${q(sel)})[${i}]; if (!e) return null; let r = e.getBoundingClientRect(); window.scrollBy(0, r.top - innerHeight / 2); r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, l: r.left, t: r.top }; })()`);
}
async function click(x, y) { await b.mouse('mouseMoved', x, y); await b.mouse('mousePressed', x, y); await sleep(40); await b.mouse('mouseReleased', x, y); await sleep(260); }
async function clickSel(sel, i = 0) { const c = await center(sel, i); if (!c) throw new Error('missing ' + sel); await sleep(120); const c2 = await b.eval(`(() => { const r = document.querySelectorAll(${q(sel)})[${i}].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`); await click(c2.x, c2.y); }
async function clickText(scope, text, tag = 'button,[role=button],.chip,.tool') {
  const c = await b.eval(`(() => { const s = document.querySelector(${q(scope)}); const els = [...s.querySelectorAll(${q(tag)})].filter(e => e.textContent.includes(${q(text)}) && e.getBoundingClientRect().width > 0); const e = els[els.length - 1]; if (!e) return null; let r = e.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) { window.scrollBy(0, r.top - innerHeight / 2); r = e.getBoundingClientRect(); } return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!c) throw new Error('no "' + text + '" in ' + scope);
  await click(c.x, c.y);
}
const text = (sel) => b.eval(`(() => { const e = document.querySelector(${q(sel)}); return e ? e.textContent : null; })()`);
try {
  await b.viewport(1600, 1000, false, 1);
  await b.open('file://' + path.resolve(here, '../dir-3.html'));
  await sleep(1500);
  ok('page loads without errors', b.errors.length === 0, b.errors.slice(0, 3).join(' | '));

  // 1. workbench scrolls (time flows down): wheel over the spine, the playhead readout moves on
  const W = '[data-phone=W]';
  const spv = await center(W + ' .spv');
  const t0 = await text(W + ' .phl b');
  await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: spv.x, y: spv.y, deltaX: 0, deltaY: 420 });
  await sleep(500);
  const t1 = await text(W + ' .phl b');
  ok('workbench scrolls down in time (wheel)', t0 !== t1, t0 + ' -> ' + t1);
  // mouse drag (one-finger scroll stand-in) goes back up
  const r2 = await center(W + ' .spv');
  await b.mouse('mouseMoved', r2.l + 210, r2.y); await b.mouse('mousePressed', r2.l + 210, r2.y);
  for (let k = 1; k <= 8; k++) { await b.mouse('mouseMoved', r2.l + 210, r2.y + k * 25); await sleep(16); }
  await b.mouse('mouseReleased', r2.l + 210, r2.y + 200); await sleep(400);
  const t2 = await text(W + ' .phl b');
  ok('workbench drag scrolls back up', t2 !== t1, t1 + ' -> ' + t2);

  // 2. delete a pause: swipe horizontally across a gap
  const sub0 = await text(W + ' .hdr .tt > span');
  await center(W + ' .spv');
  const sp = await b.eval(`(() => { const r = document.querySelector('${W} .spv').getBoundingClientRect(); return { l: r.left, z: r.width / 360 }; })()`);
  const g = await b.eval(`(() => { const s = document.querySelector('${W} .spv').getBoundingClientRect(); const e = [...document.querySelectorAll('${W} .lbl.gap')].find(x => { const r = x.getBoundingClientRect(); return r.top > s.top + 40 && r.bottom < s.bottom - 40; }); if (!e) return null; const r = e.getBoundingClientRect(); return { y: r.top + r.height / 2, name: e.textContent }; })()`);
  const gy = g.y, gapName = g.name;
  const x0 = sp.l + 90 * sp.z;
  await b.mouse('mouseMoved', x0, gy); await b.mouse('mousePressed', x0, gy);
  for (let k = 1; k <= 10; k++) { await b.mouse('mouseMoved', x0 + k * 14 * sp.z, gy + 1); await sleep(20); }
  await b.shot(path.join(out, 'swipe-mid.png'), { x: sp.l - 20, y: gy - 300, width: 520, height: 600 }, false);
  await b.mouse('mouseReleased', x0 + 140 * sp.z, gy + 1); await sleep(500);
  const sub1 = await text(W + ' .hdr .tt > span');
  const closed = await b.eval(`[...document.querySelectorAll('${W} .lbl.dim')].some(e => e.textContent.includes('合上了'))`);
  const toast1 = await text(W + ' .toast');
  ok('swipe across a pause closes it', closed && sub0 !== sub1, gapName + ' | ' + sub0 + ' -> ' + sub1 + ' | ' + toast1);
  await b.shot(path.join(out, 'swipe-after.png'), { x: sp.l - 20, y: gy - 300, width: 520, height: 600 }, false);
  // tap the closed seam label and restore through undo
  await clickSel(W + ' button[aria-label="撤销"]');
  const sub2 = await text(W + ' .hdr .tt > span');
  ok('undo brings the pause back', sub2 === sub0, sub2);

  // 3. say a sentence -> plan -> apply
  await clickSel(W + ' .sayf');
  await sleep(300);
  await clickText(W + ' .sheet', '剪掉开头3秒，删掉长停顿，声音大一点，结尾淡出2秒');
  await sleep(500);
  const planTitle = await text(W + ' .panel .ph-h b');
  ok('sentence becomes a 4-step plan on the spine', /4 件事/.test(planTitle || ''), planTitle);
  const tags = await b.eval(`document.querySelectorAll('${W} .ptag').length`);
  ok('plan steps are tagged on the spine', tags >= 3, tags + ' tags visible');
  await b.shot(path.join(out, 'plan.png'), await b.eval(`(() => { const r = document.querySelector('${W} .ph-scr').getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height }; })()`));
  await clickText(W + ' .panel', '照这样改');
  await sleep(400);
  const sub3 = await text(W + ' .hdr .tt > span');
  const toast3 = await text(W + ' .toast');
  ok('apply changes the audio as one step', /18:23/.test(sub3 || '') && /撤销整条/.test(toast3 || ''), sub3 + ' | ' + toast3);
  await b.shot(path.join(out, 'applied.png'), await b.eval(`(() => { const r = document.querySelector('${W} .ph-scr').getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height }; })()`));

  // 4. membership: from the voice phone's upsell
  const V = '[data-phone=V]';
  await clickText(V, '看会员');
  await sleep(400);
  const mt = await text(V + ' .hdr .tt b');
  ok('voice upsell opens the membership page', mt === '声剪会员', mt);
  await clickText(V, '免费试用 7 天');
  await sleep(300);
  const login = await text(V + ' .sheet');
  ok('subscribing asks to sign in first (Google / email)', /Google/.test(login || '') && /不会上传你的音频/.test(login || ''), (login || '').slice(0, 40));
  await clickText(V + ' .sheet', '用 Google 账号登录');
  await sleep(700);
  await b.shot(path.join(out, 'pay.png'), await b.eval(`(() => { const r = document.querySelector('${V} .ph-scr').getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height }; })()`));
  await clickText(V + ' .sheet', '订阅');
  await sleep(400);
  const gate = await text(V + ' .gate b');
  ok('after paying the page shows the member state', /试用到/.test(gate || ''), gate);

  // 5. export: choose 设成铃声
  const E = '[data-phone=E]';
  await clickText(E, '设成铃声', '.opt');
  await sleep(200);
  const btn = await b.eval(`[...document.querySelectorAll('${E} .dock .btn.pri')].map(e => e.textContent).join('')`);
  ok('export: purpose 设成铃声 changes the main button', /设成来电铃声/.test(btn), btn);
  await clickText(E + ' .dock', '设成来电铃声');
  await sleep(2600);
  await clickText(E, '允许');
  await sleep(300);
  const done = await text(E + ' .body');
  ok('ringtone set after the system permission', /已设为来电铃声/.test(done || ''), (done || '').slice(0, 30));

  // 6. coverage map drives a phone
  await clickText('.cov', 'A9', '.it');
  await sleep(900);
  const vt = await text(V + ' .hdr .tt b');
  ok('coverage item A9 jumps the voice phone to cloning', vt === '克隆我的声音', vt);
  await clickText('.cov', 'D2', '.it');
  await sleep(900);
  const tt = await text('[data-phone=T] .hdr .tt b');
  ok('coverage item D2 opens 删掉停顿 on the processing phone', tt === '删掉停顿', tt);

  // 7. pinch (ctrl+wheel) zooms the workbench
  const z0 = await text(W + ' .zpill span');
  const s3 = await center(W + ' .spv');
  await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: s3.x, y: s3.y, deltaX: 0, deltaY: -120, modifiers: 2 });
  await sleep(400);
  const z1 = await text(W + ' .zpill span');
  ok('pinch / ctrl+wheel zooms', z0 !== z1, z0 + ' -> ' + z1);

  // 8. music: ringtone from the chorus
  const M = '[data-phone=M]';
  await b.shot(path.join(out, 'music-before.png'), await b.eval(`(() => { window.scrollBy(0, document.querySelector('${M}').getBoundingClientRect().top - 60); const r = document.querySelector('${M} .ph-scr').getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height }; })()`));
  await clickText(M + ' .panel', '设成铃声');
  await sleep(400);
  await b.shot(path.join(out, 'music-after.png'), await b.eval(`(() => { const r = document.querySelector('${M} .ph-scr').getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height }; })()`));
  const mx = await b.eval(`document.querySelector('${M} .opt.on') && document.querySelector('${M} .opt.on').textContent`);
  ok('chorus → ringtone opens export with 设成铃声 chosen', /设成铃声/.test(mx || ''), mx);

  ok('no page errors after all interactions', b.errors.length === 0, b.errors.slice(0, 3).join(' | '));
} catch (e) {
  ok('test script ran to the end', false, e.message);
} finally {
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ results, errors: b.errors }, null, 2));
  await b.close();
}
