// Heights of the tray and its parts at rest, with denoise open and with read-aloud open; drawn sizes in the tray.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(900);
    const r = await b.eval(`(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench; scr.scrollIntoView({ block: 'start' });
      window.resetLive(); await wait(400);
      const R = e => e ? e.getBoundingClientRect() : null, s0 = R(scr);
      const rd = q => q ? Math.round(q.height) : 0;
      const m = () => { x.tlEl.getAnimations().forEach(a => a.finish()); x.areaEl.getAnimations().forEach(a => a.finish());
        const bot = R(x.botEl), tp = R(scr.querySelector('.tp')), tl = R(x.tlEl), play = R(x.playEl), tools = R(x.toolsEl), cats = R(x.catsEl), area = R(x.areaEl);
        const go = [...scr.querySelectorAll('.area button')].filter(e => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)').map(e => { const q = R(e); return e.textContent.trim().slice(0, 6) + ' ' + Math.round(q.width) + 'x' + Math.round(q.height); });
        return { tray: rd(bot), area: rd(area), tools: rd(tools), cats: rd(cats), audio: rd(tl), gap: Math.round(bot.top - tp.bottom), playY: Math.round(play.top - s0.top), btns: go.join(' | ') }; };
      const out = { rest: m() };
      const act = scr.querySelector('.tools .act'), ai = act && act.querySelector('.ai svg, svg'), al = act && act.querySelector('.al');
      const tab = scr.querySelector('.cats .tab'), say = scr.querySelector('.cats .saypill, .cats [data-k=say]');
      out.drawn = { cell: R(act) && Math.round(R(act).width) + 'x' + Math.round(R(act).height), icon: ai && Math.round(R(ai).width), label: al && getComputedStyle(al).fontSize,
        tab: R(tab) && Math.round(R(tab).width) + 'x' + Math.round(R(tab).height), say: R(say) && Math.round(R(say).width) + 'x' + Math.round(R(say).height) };
      x.toolsEl.querySelector('[data-k=dn]').click(); await wait(800); out.denoise = m(); x.back(true); await wait(600);
      x.toolsEl.querySelector('[data-k=tts]').click(); await wait(800); out.tts = m(); x.back(true); await wait(600);
      return out; })()`);
    console.log(w + 'x' + h + '\n' + Object.entries(r).map(([k, v]) => '  ' + k + ' ' + JSON.stringify(v)).join('\n'));
  }
  console.log('page errors:', JSON.stringify(b.errors));
} finally { await b.close(); }
