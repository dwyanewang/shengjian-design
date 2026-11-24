/* ===================== 10 · core ===================== */
const { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext, Fragment } = React;
const SJ = window.SJ;
const fmt = SJ.fmt;
const BLUE = '#2B3BFF', INK = '#000', TINT = '#EDEFFF';
const fmtT = (s, d = 1) => { s = Math.max(0, s); const m = Math.floor(s / 60); const x = s - m * 60; return m + ':' + (x < 10 ? '0' : '') + x.toFixed(d); };
const hashStr = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h || 1; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pct = (t, a, b) => ((t - a) / (b - a) * 100) + '%';

/* ---------- 包络（全部来自 SJ） ---------- */
function downsample(a, rIn, rOut) { const k = rIn / rOut, n = Math.floor(a.length / k), o = new Float32Array(n); for (let i = 0; i < n; i++) { let m = 0; for (let j = Math.floor(i * k); j < Math.floor((i + 1) * k); j++) if (a[j] > m) m = a[j]; o[i] = m; } return o; }
function cutEnv(a, rate, ranges) { const out = []; for (let i = 0; i < a.length; i++) { const t = i / rate; let skip = false; for (const [s, e] of ranges) if (t >= s && t < e) { skip = true; break; } if (!skip) out.push(a[i]); } return Float32Array.from(out); }
function mapEnv(a, f) { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = f(a[i], i); return o; }
const PAUSE_CUT = SJ.PAUSES.map(([s, d]) => [s + 0.15, s + d - 0.15]);
const ENV = (() => {
  const speech = SJ.speechEnvelope();
  const music = SJ.musicEnvelope();
  const long = downsample(SJ.speechEnvelope({ seconds: 1120 }), 50, 5);
  return {
    speech, music, long,
    denoised: mapEnv(speech, v => v < 0.075 ? v * 0.2 : v),
    clean: cutEnv(mapEnv(speech, v => v < 0.075 ? v * 0.2 : Math.min(1, v * 1.25)), 50, PAUSE_CUT),
    nopause: cutEnv(speech, 50, PAUSE_CUT),
    planned: cutEnv(mapEnv(speech, v => Math.min(1, v * 1.41)), 50, [[0, 3], ...PAUSE_CUT]),
    tts: SJ.speechEnvelope({ seconds: 9.4, seed: 21, lead: 0.25, pauses: [[4.6, 0.5]], noise: 0.01 }),
    rec: SJ.speechEnvelope({ seconds: 60, seed: 11, lead: 0.6, pauses: [[9.0, 1.4], [21, 1.2], [37, 1.6]], noise: 0.03 }),
    ref: SJ.speechEnvelope({ seconds: 5.2, seed: 33, lead: 0.3, pauses: [], noise: 0.015 }),
    dub: SJ.speechEnvelope({ seconds: 16, seed: 41, lead: 0.8, pauses: [[3.6, 0.4], [7.4, 0.6], [10.2, 0.5], [12.4, 0.6]], noise: 0.01 }),
  };
})();
const TRACK_ENV = {};
function trackEnv(id, seconds, bpm) { if (!TRACK_ENV[id]) TRACK_ENV[id] = SJ.musicEnvelope({ seconds: Math.max(8, Math.min(seconds, 232)), seed: hashStr(id) % 997, bpm: bpm || 96 }); return TRACK_ENV[id]; }

/* ---------- 小图标（只画动作，不画装饰） ---------- */
function Ic({ n, s = 24, c = 'currentColor', w = 2.2 }) {
  const p = { fill: 'none', stroke: c, strokeWidth: w, strokeLinecap: 'square', strokeLinejoin: 'miter' };
  const d = {
    back: <path d="M15 4 7 12l8 8" {...p} />,
    close: <path d="M5 5l14 14M19 5 5 19" {...p} />,
    play: <path d="M7 4.5v15l13-7.5z" fill={c} />,
    pause: <g fill={c}><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></g>,
    stop: <rect x="6" y="6" width="12" height="12" fill={c} />,
    mic: <g {...p}><rect x="9" y="3" width="6" height="11" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></g>,
    undo: <g {...p}><path d="M9 6 4 11l5 5" /><path d="M4.5 11H14a5.5 5.5 0 0 1 0 11h-3" /></g>,
    redo: <g {...p}><path d="m15 6 5 5-5 5" /><path d="M19.5 11H10a5.5 5.5 0 0 0 0 11h3" /></g>,
    search: <g {...p}><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></g>,
    check: <path d="m4.5 12.5 5 5 10-11" {...p} />,
    more: <g fill={c}><rect x="10.5" y="4" width="3" height="3" /><rect x="10.5" y="10.5" width="3" height="3" /><rect x="10.5" y="17" width="3" height="3" /></g>,
    plus: <path d="M12 4v16M4 12h16" {...p} />,
    minus: <path d="M4 12h16" {...p} />,
    right: <path d="m9 4 8 8-8 8" {...p} />,
    down: <path d="m4 9 8 8 8-8" {...p} />,
    grip: <g fill={c}><rect x="7" y="6" width="3" height="3" /><rect x="14" y="6" width="3" height="3" /><rect x="7" y="11" width="3" height="3" /><rect x="14" y="11" width="3" height="3" /><rect x="7" y="16" width="3" height="3" /><rect x="14" y="16" width="3" height="3" /></g>,
    prev: <g fill={c}><rect x="5" y="5" width="3" height="14" /><path d="M19 5v14L9 12z" /></g>,
    next: <g fill={c}><rect x="16" y="5" width="3" height="14" /><path d="M5 5v14l10-7z" /></g>,
    rec: <rect x="5" y="5" width="14" height="14" fill={c} />,
    lock: <g {...p}><rect x="5" y="10" width="14" height="10" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></g>,
  }[n];
  return <svg width={s} height={s} viewBox="0 0 24 24" style={{ display: 'block', flex: 'none' }}>{d}</svg>;
}

/* ---------- 汉字方块（标志、图标、入口、角标都是它） ---------- */
function Han({ ch, s = 40, tone = 'blue', cut = false, fs, style, className = '', onClick }) {
  const c = Math.max(4, Math.round(s * 0.22));
  const st = { width: s, height: s, fontSize: fs || Math.round(s * 0.64), ...style };
  if (cut) st.clipPath = `polygon(0 0, calc(100% - ${c}px) 0, 100% ${c}px, 100% 100%, 0 100%)`;
  return <span className={'han han-' + tone + ' ' + className} style={st} onClick={onClick}>{ch}</span>;
}
const Logo = ({ s = 32, tone = 'blue' }) => <Han ch="剪" s={s} tone={tone} cut />;

/* ---------- 波形（canvas；数据来自 SJ 包络） ---------- */
function Wave({ env, rate, from = 0, to, h = 64, color = INK, bar = 2, gap = 1, mirror = true, gain = 1, hi = null, className = '', style, children, onTap }) {
  const cv = useRef(null), box = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect(); }, []);
  const end = to == null ? env.length / rate : to;
  useEffect(() => {
    const c = cv.current; if (!c || !w) return; const S = 3;
    c.width = Math.round(w * S); c.height = Math.round(h * S);
    const g = c.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0); g.clearRect(0, 0, w, h); g.fillStyle = color;
    const n = Math.max(1, Math.floor((w + gap) / (bar + gap))), span = end - from;
    for (let i = 0; i < n; i++) {
      const t0 = from + span * i / n, t1 = from + span * (i + 1) / n;
      const i0 = Math.max(0, Math.floor(t0 * rate)), i1 = Math.min(env.length, Math.max(i0 + 1, Math.ceil(t1 * rate)));
      let m = 0; for (let k = i0; k < i1; k++) if (env[k] > m) m = env[k];
      if (i0 >= env.length) m = 0;
      m = Math.min(1, m * gain);
      const x = i * (bar + gap);
      g.fillStyle = hi && t0 >= hi[0] && t1 <= hi[1] ? hi[2] : color;
      if (mirror) { const bh = Math.max(1, m * (h - 2)); g.fillRect(x, (h - bh) / 2, bar, bh); }
      else { const bh = Math.max(1, m * (h - 1)); g.fillRect(x, h - bh, bar, bh); }
    }
  }, [w, env, rate, from, end, h, color, bar, gap, mirror, gain, hi && hi.join()]);
  const tap = onTap ? e => { const r = box.current.getBoundingClientRect(); onTap(from + clamp((e.clientX - r.left) / r.width, 0, 1) * (end - from)); } : undefined;
  return <div ref={box} className={'wv ' + className} style={{ height: h, ...style, cursor: onTap ? 'pointer' : undefined }} onClick={tap}>
    <canvas ref={cv} style={{ width: '100%', height: h, display: 'block' }} />
    {children}
  </div>;
}

/* 频谱视图：对数频率轴，颜色只用纸→刃蓝→墨 */
function Spectro({ env, rate, from = 0, to, h = 120 }) {
  const cv = useRef(null), box = useRef(null); const [w, setW] = useState(0);
  useEffect(() => { const el = box.current; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect(); }, []);
  useEffect(() => {
    const c = cv.current; if (!c || !w) return; const S = 2; c.width = w * S; c.height = h * S; const g = c.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0);
    const r = SJ.rng(5); const cols = Math.floor(w / 2), rows = Math.floor(h / 3);
    for (let i = 0; i < cols; i++) {
      const t = from + (to - from) * i / cols; const a = env[Math.min(env.length - 1, Math.floor(t * rate))] || 0;
      for (let j = 0; j < rows; j++) {
        const f = j / rows; const formant = Math.exp(-Math.pow((f - 0.32) / 0.14, 2)) + 0.6 * Math.exp(-Math.pow((f - 0.58) / 0.1, 2));
        let e = a * (0.35 + formant) * (0.7 + 0.5 * r()) + 0.05 * r(); e = clamp(e, 0, 1);
        g.fillStyle = e < 0.5 ? `rgba(43,59,255,${(e * 2).toFixed(3)})` : `rgb(${Math.round(43 * (2 - e * 2))},${Math.round(59 * (2 - e * 2))},${Math.round(255 * (2 - e * 2))})`;
        g.fillRect(i * 2, h - (j + 1) * 3, 2, 3);
      }
    }
  }, [w, env, from, to, h]);
  return <div ref={box} style={{ height: h, position: 'relative' }}><canvas ref={cv} style={{ width: '100%', height: h, display: 'block' }} /></div>;
}

/* ---------- 音乐封面：按曲目 id 固定随机种子，曲名第一个字裁进方块 ---------- */
function Cover({ id, title, size = 56 }) {
  const r = SJ.rng(hashStr(id));
  const tones = [[BLUE, '#fff'], [INK, '#fff'], [TINT, BLUE], [INK, BLUE], ['#fff', INK]];
  const [bg, fg] = tones[Math.floor(r() * tones.length)];
  const ch = title.replace(/[（(].*$/, '').replace(/^[^\u4e00-\u9fa5]+/, '')[0] || title[0];
  const k = Math.floor(r() * 3);
  const fs = size * [0.98, 1.16, 1.3][k], x = size * [0.16, -0.05, 0.22][k], y = size * [0.97, 1.0, 1.14][k];
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flex: 'none' }}>
    <rect width={size} height={size} fill={bg} stroke={bg === '#fff' ? 'rgba(0,0,0,.2)' : 'none'} />
    <text x={x} y={y} fontSize={fs} fontWeight="900" fontFamily={'"Noto Sans SC","Noto Sans CJK SC",sans-serif'} fill={fg}>{ch}</text>
  </svg>;
}

/* ---------- 声纹：音色的数据图形，不画人脸 ---------- */
function VoicePrint({ id, size = 56, tone = 'ink' }) {
  const r = SJ.rng(hashStr(id)); const n = 13, centre = 0.2 + r() * 0.6, width = 0.12 + r() * 0.2;
  const bg = tone === 'ink' ? INK : tone === 'blue' ? BLUE : TINT, fg = tone === 'tint' ? BLUE : '#fff';
  const bw = size / (n * 1.75), step = (size - bw * 2) / n;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flex: 'none' }}>
    <rect width={size} height={size} fill={bg} />
    {Array.from({ length: n }, (_, i) => { const f = i / (n - 1); const v = 0.14 + 0.86 * Math.exp(-Math.pow((f - centre) / width, 2)) * (0.6 + 0.4 * r()); const hh = v * size * 0.72; return <rect key={i} x={bw + i * step} y={(size - hh) / 2} width={bw} height={hh} fill={fg} />; })}
  </svg>;
}

/* ---------- 小控件 ---------- */
function Seg({ opts, value, onChange, style }) {
  return <div className="seg" style={style}>{opts.map(o => { const v = typeof o === 'string' ? o : o.v, l = typeof o === 'string' ? o : o.l; return <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>; })}</div>;
}
const Tog = ({ on, onChange }) => <button className={'tog' + (on ? ' on' : '')} onClick={e => { e.stopPropagation(); onChange(!on); }} aria-pressed={on}><i /></button>;
const Check = ({ on }) => <span className={'check' + (on ? ' on' : '')}>{on && <Ic n="check" s={18} w={2.6} />}</span>;
const Radio = ({ on }) => <span className={'radio' + (on ? ' on' : '')} />;
function Slider({ v, min = 0, max = 1, onChange, fmtv }) {
  const ref = useRef(null);
  const set = e => { const r = ref.current.getBoundingClientRect(); onChange(min + clamp((e.clientX - r.left) / r.width, 0, 1) * (max - min)); };
  const p = (v - min) / (max - min) * 100;
  return <div className="slider" ref={ref} onClick={set}><div className="tr" /><div className="fi" style={{ width: p + '%' }} /><div className="kn" style={{ left: p + '%' }} /></div>;
}
function Sheet({ title, sub, han, onClose, children, foot }) {
  return <div className="shbg" onClick={onClose}><div className="sh" onClick={e => e.stopPropagation()}>
    <div className="sh-h">{han}<div className="t"><div className="pt2">{title}</div>{sub && <div className="psub" style={{ marginTop: 2 }}>{sub}</div>}</div><button className="pib" onClick={onClose} aria-label="关闭"><Ic n="close" /></button></div>
    <div className="sh-b">{children}</div>
    {foot && <div className="pfoot" style={{ paddingBottom: 30 }}>{foot}</div>}
  </div></div>;
}
function Prog({ p }) { return <div className="bar-prog"><i style={{ width: (p * 100).toFixed(1) + '%' }} /></div>; }
function PlayBtn({ on, onClick, s = 44, tone = 'blue' }) {
  const bg = tone === 'blue' ? BLUE : tone === 'ink' ? INK : tone === 'white' ? '#fff' : TINT;
  const fg = tone === 'white' || tone === 'tint' ? (tone === 'white' ? BLUE : INK) : '#fff';
  return <button onClick={e => { e.stopPropagation(); onClick && onClick(); }} style={{ width: s, height: s, background: bg, color: fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }} aria-label={on ? '暂停' : '播放'}><Ic n={on ? 'pause' : 'play'} s={Math.round(s * 0.5)} /></button>;
}

/* ---------- 每台手机自己的播放器（预览互斥） ---------- */
function usePlayerState() {
  const [cur, setCur] = useState(null);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!cur || cur.frozen) return; let raf, last = 0;
    const tick = now => {
      const tt = cur.from + (now - cur.start) / 1000 * cur.speed;
      if (tt >= cur.from + cur.dur) { setCur(null); setT(0); return; }
      if (now - last > 45) { setT(tt); last = now; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [cur]);
  return useMemo(() => ({
    key: cur && cur.key, t: cur ? t : 0, from: cur ? cur.from : 0, dur: cur ? cur.dur : 0,
    play: (key, dur, from = 0, speed = 1) => { setT(from); setCur({ key, dur, from, speed, start: performance.now() }); },
    freeze: (key, dur, from, at) => { setT(at); setCur({ key, dur, from, speed: 1, frozen: true }); },
    stop: () => setCur(null),
    on: k => !!cur && cur.key === k,
    toggle(key, dur, from = 0, speed = 1) { if (cur && cur.key === key) setCur(null); else { setT(from); setCur({ key, dur, from, speed, start: performance.now() }); } },
    frac() { return cur ? clamp((t - cur.from) / cur.dur, 0, 1) : 0; },
  }), [cur, t]);
}

const NavCtx = createContext(null);
const useNav = () => useContext(NavCtx);
const ToneCtx = createContext(() => { });
function useTone(t) { const set = useContext(ToneCtx); useEffect(() => { set(t); }, [t]); }

/* 状态栏图标 */
const StIcons = () => <span className="ic">
  <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor"><rect x="0" y="7" width="2.4" height="4" /><rect x="4" y="5" width="2.4" height="6" /><rect x="8" y="2.5" width="2.4" height="8.5" /><rect x="12" y="0" width="2.4" height="11" /></svg>
  <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor"><path d="M7.5 11 0 3.2A10.8 10.8 0 0 1 15 3.2z" /></svg>
  <span style={{ width: 24, height: 11, border: '1.6px solid currentColor', padding: 1.5, display: 'inline-block' }}><span style={{ display: 'block', width: '78%', height: '100%', background: 'currentColor' }} /></span>
</span>;
