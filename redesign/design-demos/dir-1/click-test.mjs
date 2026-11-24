// Click test for dir-1.html: real mouse clicks through the main flows; fails on any page error.
// Usage: node click-test.mjs [outDir]   (screenshots of each checkpoint go to outDir)
import { launch, sleep } from '../../tools/cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.join(here, '../shots/dir-1/clicks');
fs.mkdirSync(out, { recursive: true });
const b = await launch();
const results = [];
let n = 0;
const ok = (name, cond, extra = '') => { results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
// mark the smallest clickable element inside a phone whose text contains `text`, then click its centre with the mouse
async function click(pid, text, opts = {}) {
  const sel = await b.eval(`(() => {
    const root = ${pid ? `document.getElementById('phone-${pid}')` : 'document'};
    const want = ${JSON.stringify(text)};
    const cands = [...root.querySelectorAll(${JSON.stringify(opts.sel || 'button, [data-step], .row, .hl')})].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.textContent.replace(/\\s+/g, '').includes(want.replace(/\\s+/g, '')); });
    if (!cands.length) return null;
    cands.sort((a, c) => a.textContent.length - c.textContent.length);
    document.querySelectorAll('[data-t]').forEach(e => e.removeAttribute('data-t'));
    cands[0].setAttribute('data-t', 'x'); return true; })()`);
  if (!sel) { ok(`click ${pid || 'board'}: ${text}`, false, '(not found)'); return false; }
  const r = await b.rect('[data-t="x"]');
  const x = r.vx + r.width / 2, y = r.vy + r.height / 2;
  await b.mouse('mouseMoved', x, y); await b.mouse('mousePressed', x, y); await b.mouse('mouseReleased', x, y);
  await sleep(opts.wait || 450);
  return true;
}
const has = (pid, text) => b.eval(`!!document.getElementById('phone-${pid}') && document.getElementById('phone-${pid}').innerText.replace(/\\s+/g, '').includes(${JSON.stringify(text.replace(/\s+/g, ''))})`);
const shotPhone = async (pid, name) => { const r = await b.rect('#phone-' + pid); await b.shot(path.join(out, String(++n).padStart(2, '0') + '-' + name + '.png'), { x: r.x - 10, y: r.y - 10, width: r.width + 20, height: r.height + 20 }); };

try {
  await b.viewport(1600, 1000, false, 1);
  await b.open('file://' + path.join(here, '../dir-1.html'));
  await sleep(1500);

  // 1. say -> plan -> apply (phone 1)
  await click('p1', '看看怎么改');
  ok('p1 opens the plan', await has('p1', '这样改，对吗'));
  await shotPhone('p1', 'plan');
  await click('p1', '不做这步');
  ok('striking a step updates the button', await has('p1', '照这样改（3 步）'));
  await click('p1', '恢复这步');
  await click('p1', '照这样改（4 步）', { wait: 700 });
  ok('apply lands in the editor with the trail', await has('p1', '这一版来自你说的'));
  await shotPhone('p1', 'applied');
  await click('p1', '整条撤销');
  ok('whole plan undone in one step', await has('p1', '整条计划撤销了'));

  // 2. plan: change a number (phone 2)
  await click('p2', '+', { sel: '[data-step="s1"] button' });
  ok('stepper changes the cut', await has('p2', '3.5秒'));

  // 3. export: choose 设成铃声 (phone 4)
  await click('p4', '设成铃声');
  ok('ringtone purpose shows the 30 s window', await has('p4', '铃声用'));
  await shotPhone('p4', 'ringtone');
  await click('p4', '设成来电铃声', { wait: 2400 });
  ok('ringtone set', await has('p4', '已设为来电铃声'));

  // 4. membership: from an online voice (phone 7) through the gate to the member page
  await click('p7', '要会员');
  ok('gate sheet for the online voice', await has('p7', '是会员音色'));
  await click('p7', '看看会员');
  ok('member page from the voice', await has('p7', '本机能做的'));
  await shotPhone('p7', 'member');
  await click('p7', '免费试用 7 天');
  ok('sign-in comes first', await has('p7', '登录声剪'));
  await click('p7', '用 Google 账号登录');
  await click('p7', '免费试用 7 天');
  await click('p7', '开始免费试用');
  ok('member after the Play sheet', await has('p7', '你是年度会员'));

  // 5. AI rewrite (phone 2): colloquial sentence, member gate, consent, rewritten
  await b.eval(`window.__phones.p2.jump({ stack: [['home'], ['plan', { text: ${JSON.stringify('前面那段咳嗽不要了，然后整体听着太闷')} }]], g: { member: true } })`); await sleep(400);
  await click('p2', '请 AI 帮忙理解');
  await click('p2', '同意，帮我理解', { wait: 600 });
  ok('AI rewrite shown with the guessed number', await has('p2', '你没说过的数字'));
  await shotPhone('p2', 'ai');

  // 6. editor tools sheet -> denoise (phone 3)
  await click('p3', '工具');
  await click('p3', '降噪', { sel: '[data-tool]' });
  ok('tools sheet opens 降噪', await has('p3', '空调声小多了'));
  await click('p3', '存成新版本');
  ok('saved as a new version', await has('p3', '存成了新版本'));

  // 7. new -> record (phone 6)
  await click('p6', '录音能暂停');
  ok('record screen', await has('p6', '点中间开始'));
  await click('p6', '', { sel: 'button[aria-label="录音"]', wait: 900 });
  ok('recording runs', await has('p6', '正在录'));

  // 8. settings: dark mode (phone 9)
  await b.eval(`window.__phones.p9.jump({ stack: [['me'], ['settings']] })`); await sleep(300);
  await click('p9', '深色');
  ok('dark theme applied', await b.eval(`document.getElementById('phone-p9').classList.contains('dark')`));
  await shotPhone('p9', 'dark-settings');

  // 9. coverage map: a feature jumps a phone
  await click(null, '工作台 › 工具 › 删掉停顿', { sel: '.cov-go', wait: 900 });
  ok('coverage D2 drives phone 5', await has('p5', '长停顿，省下'));
  const top = await b.eval(`document.getElementById('phone-p5').getBoundingClientRect().top`);
  ok('board scrolled to phone 5', top > -50 && top < 400, 'top=' + Math.round(top));
  await click(null, '导出 › 设成铃声', { sel: '.cov-go', wait: 900 });
  ok('coverage G8 drives phone 4', await has('p4', '铃声用'));

  // 10. editor selection by dragging on the wave (phone 3 back to editor)
  await b.eval(`window.__phones.p3.jump({ stack: [['home'], ['editor', {}]] })`); await sleep(400);
  const wr = await b.rect('#phone-p3 .scr canvas[style*="height: 168px"]');
  if (wr) { const y = wr.vy + 60; await b.mouse('mouseMoved', wr.vx + 60, y); await b.mouse('mousePressed', wr.vx + 60, y); for (let k = 1; k <= 6; k++) await b.mouse('mouseMoved', wr.vx + 60 + k * 20, y); await b.mouse('mouseReleased', wr.vx + 180, y); await sleep(300); }
  ok('drag selects a range', await has('p3', '已选'));
  await click('p3', '剪掉');
  ok('cut is undoable', await has('p3', '剪掉'));

  ok('no page errors', b.errors.length === 0, b.errors.slice(0, 3).join(' | '));
} catch (e) {
  results.push('FAIL exception ' + (e && e.stack || e));
} finally {
  await b.close();
}
console.log(results.join('\n'));
fs.writeFileSync(path.join(out, 'results.txt'), results.join('\n') + '\n');
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
