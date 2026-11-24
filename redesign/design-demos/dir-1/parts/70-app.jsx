/* ================= brand mark: a few bars of sound with one stroke of highlighter ================= */
function Logo({ s = 28 }) {
  return <svg width={s} height={s} viewBox="0 0 28 28" aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
    <rect width="28" height="28" rx="8" fill="#1E2228" />
    <path d="M8.2 11.2 L21.4 10.2 L20.6 17.4 L7.4 18.4 Z" fill="#FFE14A" />
    {[[6, 6], [9.5, 12], [13, 16], [16.5, 10], [20, 13], [23, 5]].map(([x, h], i) => <rect key={i} x={x - 1} y={14 - h / 2} width="2" height={h} rx="1" fill={i > 0 && i < 5 ? '#1E2228' : '#FFFFFF'} />)}
  </svg>;
}

/* ================= one phone = one independent app ================= */
const SCREENS = { home: Home, say: Say, plan: Plan, editor: Editor, tool: Tool, export: Export, new: NewScreen, record: Record, tts: Tts, clone: Clone, subtitle: Subtitle, music: Music, incoming: Incoming, files: Files, video: Video, member: MemberScreen, login: Login, me: Me, settings: Settings, help: Help, batch: Batch, versions: Versions };
let KEY = 1;
const mk = (r, p) => ({ r, p: p || {}, k: KEY++ });
function PhoneApp({ pid, init }) {
  const [stack, setStack] = useState(() => init.stack.map(([r, p]) => mk(r, p)));
  const [sheet, setSheet] = useState(init.sheet ? { k: init.sheet[0], p: init.sheet[1] } : null);
  const [toast, setToast] = useState(null);
  const [shade, setShade] = useState(!!init.shade);
  const [g, setG] = useState(() => Object.assign({ member: false, signed: false, dark: false, aiConsent: false, applied: null, draft: '', versions: SJ.LIBRARY[0].versionNames.slice(), clip: null }, init.g || {}));
  const player = usePlayer();
  const nav = useMemo(() => ({
    go: (r, p) => { setSheet(null); setStack(s => [...s, mk(r, p)]); },
    back: () => { setSheet(null); setShade(false); setStack(s => s.length > 1 ? s.slice(0, -1) : s); },
    replace: (r, p) => { setSheet(null); setStack(s => [...s.slice(0, -1), mk(r, p)]); },
    tab: r => { setSheet(null); setStack([mk(r)]); },
    sheet: (k, p) => setSheet({ k, p }),
    close: () => setSheet(null),
    toast: (msg, act, fn) => setToast({ msg, act, fn, k: KEY++ }),
    set: patch => setG(x => Object.assign({}, x, typeof patch === 'function' ? patch(x) : patch)),
    shade: () => setShade(true),
    jump: spec => { setToast(null); setSheet(spec.sheet ? { k: spec.sheet[0], p: spec.sheet[1] } : null); setShade(!!spec.shade); setStack(spec.stack.map(([r, p]) => mk(r, p))); if (spec.g) setG(x => Object.assign({}, x, spec.g)); },
  }), []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { (window.__phones = window.__phones || {})[pid] = nav; }, []);
  useEffect(() => { window.dispatchEvent(new Event('sj-nav')); }, [stack, sheet, shade]);
  const top = stack[stack.length - 1];
  const Scr = SCREENS[top.r] || Home;
  return <PhoneCtx.Provider value={{ nav, g, player, pid }}>
    <PhoneFrame id={'phone-' + pid} dark={g.dark} onStatus={() => setShade(true)} onGesture={nav.back}>
      <Scr key={top.k} p={top.p} />
      {sheet && <SheetHost key={sheet.k + (sheet.p && sheet.p.id || '')} sheet={sheet} />}
      {toast && <div className="toast" key={toast.k}><span>{toast.msg}</span>{toast.act && <button onClick={() => { setToast(null); toast.fn && toast.fn(); }}>{toast.act}</button>}</div>}
      {shade && <Shade close={() => setShade(false)} />}
    </PhoneFrame>
  </PhoneCtx.Provider>;
}

Object.assign(window, { Logo, SCREENS, PhoneApp });
