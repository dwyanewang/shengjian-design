// Minimal Chrome DevTools Protocol driver: launch headless Chrome, open a page, run steps, take screenshots.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = path.join(os.homedir(), '.cache/ms-playwright/chromium-1248/chrome-linux64/chrome');

export async function launch() {
  const dir = fs.mkdtempSync(path.join(process.env.WORK_TMP || os.tmpdir(), 'chr-'));
  const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', '--font-render-hinting=none', '--lang=zh-CN', ...(process.env.CHROME_PROXY ? [`--proxy-server=${process.env.CHROME_PROXY}`] : []), 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let port = null;
  for (let i = 0; i < 100 && !port; i++) {
    await new Promise(r => setTimeout(r, 100));
    try { port = fs.readFileSync(path.join(dir, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch (e) { /* not yet */ }
  }
  if (!port) throw new Error('chrome did not start');
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    else if (m.method) listeners.forEach(f => f(m));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const errors = [];
  listeners.push(m => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
  });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  const api = {
    send, errors,
    async viewport(w, h, mobile, scale = 2, dark = false) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile });
      await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
    },
    async open(url) {
      const loaded = new Promise(r => { const f = m => { if (m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(f), 1); r(); } }; listeners.push(f); });
      await send('Page.navigate', { url });
      await loaded;
      await new Promise(r => setTimeout(r, 600));
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async shot(file, clip, beyond = true) {
      const p = { format: 'png', captureBeyondViewport: beyond };
      if (clip) p.clip = Object.assign({ scale: 1 }, clip);
      const r = await send('Page.captureScreenshot', p);
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    async rect(sel) {
      return api.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({block:'center'}); const b = e.getBoundingClientRect(); return {x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height, vx: b.left, vy: b.top}; })()`);
    },
    async touch(type, x, y) {
      await send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 4, radiusY: 4, id: 1 }] });
    },
    async mouse(type, x, y) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse' });
    },
    async close() { try { await send('Browser.close'); } catch (e) { /* closing */ } proc.kill(); fs.rmSync(dir, { recursive: true, force: true }); },
  };
  return api;
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
