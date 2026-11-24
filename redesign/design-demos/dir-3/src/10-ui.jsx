/* ===== UI primitives + the phone (each phone is its own state machine) ===== */
const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, Fragment } = React;
const cx = (...a) => a.filter(Boolean).join(' ');
const REG = {};            // phone id -> { go(path) }, used by the coverage map
const SCREENS = {};        // screen name -> component

const IC = {
  back: 'M15 5l-7 7 7 7', close: 'M6 6l12 12M18 6 6 18', search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 20 20',
  undo: 'M9 6 4 11l5 5M4 11h10.5a5 5 0 0 1 0 10H12', redo: 'M15 6l5 5-5 5M20 11H9.5a5 5 0 0 0 0 10H12',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21', plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5', chevR: 'M9 5l7 7-7 7', chevD: 'M5 9l7 7 7-7',
  cut: 'M8.5 7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM8.5 17a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM8 8.5 19 18M8 15.5 19 6',
  file: 'M7 3h7l4 4v14H7zM14 3v4h4', video: 'M3.5 6.5h12v11h-12zM15.5 10.5l5-3v9l-5-3', text: 'M5 6h14M12 6v13M9 19h6',
  music: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  user: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4.5 20a7.5 7.5 0 0 1 15 0', share: 'M12 4v11M8 8l4-4 4 4M5 13v6h14v-6',
  layers: 'M12 4 3 9l9 5 9-5zM3 14l9 5 9-5', split: 'M12 3v18M7 8l-3 4 3 4M17 8l3 4-3 4',
  vol: 'M4 9h4l5-4v14l-5-4H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11', fade: 'M3 19C9 19 15 13 21 5M3 19h18',
  copy: 'M8 8h11v11H8zM5 16V5h11', repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  move: 'M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4', insert: 'M4 6h16M4 18h16M12 9v6M9 12h6', marker: 'M12 3.5l5.5 8.5-5.5 8.5-5.5-8.5z',
  denoise: 'M3 12c1.5-3 3 3 4.5 0s3 3 4.5 0M14 12h7', grid: 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
  pauses: 'M8 4v5M8 15v5M16 4v5M16 15v5M5 12h14', spines: 'M8 3v18M16 3v18', spec: 'M4 19h16M6 15v-3M9 15V7M12 15V9M15 15V5M18 15v-4',
  trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', folder: 'M3 6.5h6l2 2h10v10H3z',
  head: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z', bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4',
  set: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4', sparkle: 'M12 4v4M12 16v4M4 12h4M16 12h4', blank: 'M5 12h3M10 12h4M16 12h3',
  pkg: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8', batch: 'M7 4h10M5 8h14M4 12h16v8H4z', sample: 'M5 4h14v16H5zM9 9l6 3-6 3z',
  clock: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM12 8v4l3 2', ab: 'M4 18l4-12 4 12M5.5 14h5M14 6h4a3 3 0 0 1 0 6h-4zM14 12h5a3 3 0 0 1 0 6h-5z',
  curve: 'M3 17c3 0 4-9 8-9s5 6 10 6', beat: 'M5 5v14M10 5v14M15 5v14M20 5v14', wave: 'M4 12h1M7 9v6M10 6v12M13 9v6M16 7v10M19 11v2',
  globe: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16', mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  rev: 'M20 12H5M9 8l-4 4 4 4', loop: 'M17 4l3 3-3 3M20 7H8a4 4 0 0 0-4 4M7 20l-3-3 3-3M4 17h12a4 4 0 0 0 4-4', info: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM12 11v5M12 8v.5',
};
function Icon({ n, s = 22, w = 1.8 }) {
  if (n === 'play') return <svg width={s} height={s} viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>;
  if (n === 'pause') return <svg width={s} height={s} viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg>;
  if (n === 'rec') return <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.5" fill="currentColor" /></svg>;
  if (n === 'stop') return <svg width={s} height={s} viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /></svg>;
  if (n === 'more') return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5.5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="18.5" r="1.7" /></svg>;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d={IC[n] || IC.plus} /></svg>;
}
/* brand mark: two sentences and the pause between them */
function Mark({ s = 1, glow = true }) {
  return <svg width={30 * s} height={64 * s} viewBox="0 0 30 64" style={{ flex: 'none', filter: glow ? 'drop-shadow(0 0 6px rgba(126,240,207,.6))' : 'none' }}>
    <rect x="14.25" y="0" width="1.5" height="64" rx=".75" fill="rgba(141,153,173,.5)" />
    <rect x="3" y="2" width="24" height="25" rx="12" fill="#7ef0cf" />
    <rect x="3" y="40" width="24" height="22" rx="11" fill="#7ef0cf" />
  </svg>;
}

function Hdr({ title, sub, onBack, right, back = 'back' }) {
  return <div className="hdr">
    {onBack ? <button className="ib" onClick={onBack} aria-label="返回"><Icon n={back} /></button> : <div style={{ width: 10 }} />}
    <div className="tt"><b>{title}</b>{sub && <span>{sub}</span>}</div>
    {right}
  </div>;
}
function Btn({ k, sm, full, line, children, icon, onClick, disabled, style }) {
  return <button className={cx('btn', k === 'pri' && 'pri', sm && 'sm', full && 'full', line && 'line')} onClick={onClick} disabled={disabled} style={style}>{icon && <Icon n={icon} s={sm ? 18 : 20} />}{children}</button>;
}
function Seg({ value, options, onChange, style }) {
  return <div className="seg" style={style}>{options.map((o, i) => { const v = typeof o === 'object' ? o.v : i; const l = typeof o === 'object' ? o.l : o; return <button key={i} className={cx(value === v && 'on')} onClick={() => onChange(v)}>{l}</button>; })}</div>;
}
function Switch({ on, onChange }) { return <button className={cx('sw', on && 'on')} onClick={() => onChange(!on)} aria-pressed={on} />; }
function Slider({ value, min, max, step = 1, onChange }) {
  const ref = useRef();
  const set = e => { const rc = ref.current.getBoundingClientRect(); const f = clamp((e.clientX - rc.left) / rc.width, 0, 1); let v = min + f * (max - min); v = Math.round(v / step) * step; onChange(+v.toFixed(3)); };
  const f = (value - min) / (max - min);
  return <div className="slider" ref={ref} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); set(e); }} onPointerMove={e => { if (e.buttons) set(e); }}>
    <div className="tr" /><div className="fl" style={{ width: f * 100 + '%' }} /><div className="kb" style={{ left: f * 100 + '%' }} />
  </div>;
}
function Sheet({ title, onClose, children, right, style }) {
  return <Fragment><div className="scrim" onClick={onClose} /><div className="sheet" style={style}><div className="grab" />
    {title != null && <div className="sh"><b>{title}</b>{right}<button className="ib" onClick={onClose} aria-label="关闭"><Icon n="close" s={20} /></button></div>}
    <div className="sb">{children}</div></div></Fragment>;
}
function Vip() { return <span className="vip">VIP</span>; }

/* canvases */
function Mini({ S, w, h, from, to, half, color, alpha, lit, gain, style, className }) {
  const ref = useRef();
  useEffect(() => { drawMini(ref.current, S, { w, h, from, to, half, color, alpha, lit, gain }); }, [S, w, h, from, to, lit, gain, color]);
  return <canvas ref={ref} className={className} style={{ width: w, height: h, display: 'block', filter: 'drop-shadow(0 0 3px rgba(126,240,207,.35))', ...style }} />;
}
function Cover({ id, size }) {
  const ref = useRef();
  useEffect(() => { drawCover(ref.current, id, size); }, [id, size]);
  return <canvas ref={ref} style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), flex: 'none', display: 'block' }} />;
}

/* ---------- the phone ---------- */
let UID = 1;
const mkEntry = ([name, p]) => ({ key: UID++, name, p: p || {} });
function Phone({ id, init, zoom = 1, member: m0 = false, user: u0 = null }) {
  const [stack, setStack] = useState(() => init.stack.map(mkEntry));
  const [dir, setDir] = useState('enter');
  const [sheet, setSheet] = useState(init.sheet || null);
  const [toast, setToast] = useState(null);
  const [shade, setShade] = useState(!!init.shade);
  const [member, setMember] = useState(m0);
  const [user, setUser] = useState(u0);
  const [notes, setNotes] = useState(init.notes || []);
  const store = useRef({}).current;
  const tt = useRef();
  const nav = useMemo(() => ({
    push: (name, p) => { setDir('enter'); setStack(s => [...s, mkEntry([name, p])]); },
    pop: () => { setDir('back'); setStack(s => (s.length > 1 ? s.slice(0, -1) : s)); },
    replace: (name, p) => { setDir('enter'); setStack(s => [...s.slice(0, -1), mkEntry([name, p])]); },
    reset: (list) => { setDir('enter'); setStack(list.map(mkEntry)); },
    popTo: (name) => { setDir('back'); setStack(s => { const i = s.map(x => x.name).lastIndexOf(name); return i >= 0 ? s.slice(0, i + 1) : s; }); },
  }), []);
  const showToast = useCallback((msg, action) => { clearTimeout(tt.current); setToast({ msg, action, k: UID++ }); tt.current = setTimeout(() => setToast(null), action ? 4200 : 2600); }, []);
  const notify = useCallback((n) => setNotes(list => [...list.filter(x => x.id !== n.id), n]), []);
  const unnotify = useCallback((nid) => setNotes(list => list.filter(x => x.id !== nid)), []);
  useEffect(() => {
    REG[id] = { go: (path) => { setSheet(path.sheet || null); setShade(!!path.shade); setToast(null); setDir('enter'); setStack(path.stack.map(mkEntry)); } };
  }, []);
  const ph = { id, nav, store, member, setMember, user, setUser, toast: showToast, notify, unnotify, notes, openSheet: (name, p) => setSheet({ name, p: p || {} }), closeSheet: () => setSheet(null), openShade: () => setShade(true) };
  const top = stack[stack.length - 1];
  const Scr = SCREENS[top.name] || (() => <div className="scr"><Hdr title={'缺页：' + top.name} onBack={nav.pop} /></div>);
  const ShC = sheet && SHEETS[sheet.name];
  return <div className="ph" style={{ zoom }} data-phone={id}>
    <div className="ph-scr">
      <div className="ph-sb" onClick={() => setShade(s => !s)} title="下拉通知栏">
        <span className="num">9:41</span>
        <span className="ic">
          <svg width="15" height="11" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="6" width="2" height="4" rx=".5" /><rect x="4" y="4" width="2" height="6" rx=".5" /><rect x="8" y="2" width="2" height="8" rx=".5" /><rect x="12" y="0" width="2" height="10" rx=".5" /></svg>
          <svg width="15" height="11" viewBox="0 0 14 10" fill="none"><path d="M7 9a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" /><path d="M3 6a5 5 0 018 0" stroke="currentColor" strokeWidth="1.3" /><path d="M.5 3.5a11 11 0 0113 0" stroke="currentColor" strokeWidth="1.3" /></svg>
          <span style={{ width: 22, height: 11, border: '1.5px solid currentColor', borderRadius: 3, padding: 1, display: 'inline-block' }}><span style={{ display: 'block', width: '78%', height: '100%', background: 'currentColor', borderRadius: 1 }} /></span>
        </span>
      </div>
      <div className="ph-hole" />
      <div className="ph-ct">
        <Scr key={top.key} ph={ph} p={top.p} dir={stack.length > 1 ? dir : ''} />
        {ShC && <ShC ph={ph} p={sheet.p} onClose={() => setSheet(null)} />}
        {toast && <div className="toast" key={toast.k}><span>{toast.msg}</span>{toast.action && <button onClick={() => { toast.action.fn(); setToast(null); }}>{toast.action.label}</button>}</div>}
      </div>
      {shade && <Shade ph={ph} notes={notes} onClose={() => setShade(false)} />}
      <div className="ph-nav"><i onClick={() => { if (sheet) setSheet(null); else nav.pop(); }} title="返回手势" /></div>
    </div>
  </div>;
}
const SHEETS = {};
function Shade({ ph, notes, onClose }) {
  const playing = ph.store.nowPlaying;
  return <Fragment><div className="scrim" style={{ zIndex: 79 }} onClick={onClose} />
    <div className="shade" onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px 6px' }}>
        <b style={{ fontSize: 20, fontWeight: 500 }} className="num">9:41</b><span className="t3" style={{ fontSize: 13 }}>11月23日 周日</span>
      </div>
      <div className="ntf">
        <div className="nh"><i />声剪 正在播放</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Mini S={SPEECH} w={18} h={44} from={40} to={70} half={9} />
          <div style={{ flex: 1, minWidth: 0 }}><b style={{ marginTop: 0, fontSize: 15 }}>{playing || '播客第 12 期'}</b><p>锁屏也能控制；拔掉耳机会自动暂停</p></div>
          <span className="playsm on"><Icon n="pause" s={18} /></span>
        </div>
        <div className="bar"><i style={{ width: '24%' }} /></div>
      </div>
      {notes.map(n => <div className="ntf" key={n.id}>
        <div className="nh"><i />声剪 {n.app || '导出'}</div>
        <b>{n.title}</b><p>{n.text}</p>{n.pct != null && <div className="bar"><i style={{ width: n.pct + '%' }} /></div>}
      </div>)}
      {!notes.length && <p className="note" style={{ padding: '12px 8px 0' }}>开始导出或批量处理后，这里会显示进度；做完了会提醒你去保存。</p>}
      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--s3)', margin: '14px auto 0', cursor: 'pointer' }} onClick={onClose} />
    </div></Fragment>;
}
