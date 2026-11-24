// 点击测试：node clicktest.mjs   （截图存到 ../shots/dir-2/clicks/）
// 用真实鼠标事件点：首页「铃」走到设成铃声；「剪」说一句 → 计划 → 应用；打开会员页；覆盖图点一项跳到手机。
import { launch, sleep } from '../../tools/cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const page = path.join(here, '..', 'dir-2.html');
const out = path.join(here, '..', 'shots', 'dir-2', 'clicks');
fs.mkdirSync(out, { recursive: true });
const b = await launch();
const log = [];
let fails = 0;
const ok = (name, cond) => { log.push((cond ? 'PASS ' : 'FAIL ') + name); if (!cond) fails++; };

// 在某台手机（或整页）里找含有文字的可点元素，滚到视口中间，用鼠标点它的中心
async function tap(phone, text, sel = 'button,[class*=prow],[class*=wt],.ci,.ent,.saybar') {
  const r = await b.eval(`(() => {
    const root = ${phone ? `document.querySelector('[data-phone="${phone}"]')` : 'document'};
    const els = [...root.querySelectorAll(${JSON.stringify(sel)})].filter(e => e.textContent.includes(${JSON.stringify(text)}) && e.offsetParent !== null);
    els.sort((a, c) => a.textContent.length - c.textContent.length);
    const e = els[0]; if (!e) return null;
    let bb = e.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + bb.top - innerHeight / 2);
    bb = e.getBoundingClientRect();
    return { x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 };
  })()`);
  if (!r) { log.push('  (没找到「' + text + '」)'); return false; }
  await sleep(120);
  await b.mouse('mouseMoved', r.x, r.y); await b.mouse('mousePressed', r.x, r.y); await b.mouse('mouseReleased', r.x, r.y);
  await sleep(650);
  return true;
}
const has = (phone, text) => b.eval(`!!document.querySelector('[data-phone="${phone}"]') && document.querySelector('[data-phone="${phone}"]').innerText.includes(${JSON.stringify(text)})`);
async function snap(phone, name) {
  const r = await b.eval(`(() => { const e = document.querySelector('[data-phone="${phone}"]'); const bb = e.getBoundingClientRect(); return { x: bb.left + scrollX, y: bb.top + scrollY, width: bb.width, height: bb.height }; })()`);
  await b.shot(path.join(out, name + '.png'), r);
}

try {
  await b.viewport(1600, 1000, false, 1);
  await b.open('file://' + page);
  await sleep(3500);

  // 1. 首页点「铃」走完到设成铃声
  ok('首页 › 点「铃」', await tap('home', '做铃声', '.wt-hero'));
  ok('铃 第 1 步：选一首歌', await has('home', '选一首歌'));
  ok('铃 › 选「晚风」', await tap('home', '晚风（钢琴版）', '.prow'));
  ok('铃 第 2 步：找到 3 段副歌', await has('home', '找到 3 段副歌'));
  await snap('home', '1-ling-chorus');
  ok('铃 › 用第 1 段', await tap('home', '用第 1 段', 'button'));
  ok('铃 第 3 步：铃声多长', await has('home', '铃声多长'));
  await tap('home', '30 秒', '.seg button');
  ok('铃 › 就这样', await tap('home', '就这样', 'button'));
  ok('铃 第 4 步：设成什么', await has('home', '设成什么'));
  ok('铃 › 设成来电铃声', await tap('home', '设成来电铃声', 'button'));
  ok('系统问：允许修改系统设置', await has('home', '允许「声剪」修改系统设置'));
  ok('铃 › 允许', await tap('home', '允许', '.sysdlg-b button:last-child'));
  ok('铃 完成：好了。', await has('home', '好了。') && await has('home', '副歌铃声 30 秒'));
  await snap('home', '1-ling-done');

  // 2. 进「剪」说一句 → 计划 → 应用
  ok('剪 › 说一句', await tap('edit', '说一句，比如', '.saybar'));
  ok('说一句面板打开', await has('edit', '看看会怎么改'));
  ok('说一句 › 看看会怎么改', await tap('edit', '看看会怎么改', 'button'));
  ok('计划页：照这句话改', await has('edit', '照这句话改') && await has('edit', '删掉 9 处长停顿'));
  await snap('edit', '2-plan');
  ok('计划 › 第 3 步「不要」', await tap('edit', '不要', '.step:nth-of-type(3) .chip'));
  ok('计划 › 照这样改', await tap('edit', '照这样改', '.pfoot button'));
  ok('回到工作台：照一句话改过 + 提示可撤销', await has('edit', '照一句话改过') && await has('edit', '撤销'));
  await snap('edit', '2-applied');

  // 3. 打开会员页（首页右上「会员」）
  await b.eval(`window.SJP.home.go({ name: 'home', tab: 'do' })`); await sleep(400);
  ok('首页 › 会员', await tap('home', '会员', '.home-mem'));
  ok('会员页：本机的，全免费', await has('home', '本机的，全免费') && await has('home', '以 Google Play 为准'));
  await snap('home', '3-member');
  ok('会员 › 免费试用 7 天（未登录先提示登录）', await tap('home', '免费试用 7 天', '.pfoot button') && await has('home', '先登录'));

  // 4. 覆盖图点一项跳到手机
  ok('覆盖图 › A9 克隆', await tap(null, '克隆我的声音：照着读', '.ci'));
  ok('首页那台跳到克隆检查', await has('home', '在手机上检查过了'));
  await snap('home', '4-cover-A9');
  ok('覆盖图 › C5 AI 理解口语', await tap(null, 'AI 帮忙理解口语', '.ci'));
  ok('计划那台跳到「没完全读懂」', await has('plan', '这句有点口语'));
  ok('覆盖图 › G7 待保存', await tap(null, '后台导出、完成后选位置保存', '.ci'));
  ok('导出那台：音频已生成，待保存', await has('export', '音频已生成，待保存'));
  await snap('export', '4-cover-G7');

  // 5. 会员入口出现在需要它的地方：配 › 选林溪 › 用林溪读
  ok('配 › 用「林溪」读', await tap('pei', '用「林溪」读', '.pfoot button'));
  ok('弹出会员：林溪是会员音色', await has('pei', '林溪是会员音色'));
  await snap('pei', '5-pei-gate');
  ok('会员弹层 › 先用手机自带的', await tap('pei', '先用手机自带的', 'button'));
  ok('配 › 用「中文女声」读', await has('pei', '用「中文女声」读'));

  // 6. 状态栏下拉通知栏
  ok('点状态栏', await tap('music', '9:41', '.pf-st'));
  ok('通知栏：正在导出 64%', await has('music', '正在导出') && await has('music', '17 / 24'));
  await snap('music', '6-shade');
} finally {
  log.push('页面错误：' + b.errors.length + (b.errors.length ? '\n' + b.errors.join('\n') : ''));
  fs.writeFileSync(path.join(out, 'result.txt'), log.join('\n') + '\n');
  console.log(log.join('\n'));
  console.log(fails ? fails + ' 项没过' : '全部通过');
  await b.close();
}
