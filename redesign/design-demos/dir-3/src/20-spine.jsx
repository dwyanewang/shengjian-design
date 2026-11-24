/* ===== SpineView: time flows down under a fixed reading line (the playhead) =====
 * one finger up/down = scroll time; pinch = zoom (keeps the moment on the line); tap; horizontal swipe = strike out;
 * drag in the left ruler = select a range; long press = lift a sentence and move it. */
const TILE = 384, GUT = 54;
function niceStep(px, pps) { const want = px / pps; for (const v of [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]) if (v >= want) return v; return 1200; }
function SpineView(props) {
  const { height, dur, pps, cols, spectrum, ver, phFrac = 0.3, initR = 0, apiRef, overlay, beat, zoomCtl, onZoom, readoutExtra, gestures = true, tickPx = 66 } = props;
  const el = useRef(), ro = useRef(), g = useRef(null), lastR = useRef(initR), pinch = useRef(null);
  const PH = Math.round(height * phFrac);
  const total = PH + dur * pps + (height - PH);
  const [range, setRange] = useState([0, 3]);
  const dpr = Math.min(3, Math.max(2, (window.devicePixelRatio || 1) * 1.35));
  const cb = useRef(props); cb.current = props;
  const updRange = () => { const S = el.current.scrollTop; const a = Math.max(0, Math.floor((S - 200) / TILE)), b = Math.max(a, Math.floor((S + height + 200) / TILE)); setRange(r => (r[0] === a && r[1] === b ? r : [a, b])); };
  useLayoutEffect(() => { el.current.scrollTop = lastR.current * pps; updRange(); if (ro.current) ro.current.textContent = fmtT(lastR.current, true); }, [pps, height]);
  const onScroll = () => {
    const S = el.current.scrollTop; lastR.current = S / pps; updRange();
    if (ro.current) ro.current.textContent = fmtT(Math.min(lastR.current, dur), true);
    cb.current.onTime && cb.current.onTime(lastR.current);
  };
  const scrollToR = (r, smooth) => { lastR.current = r; el.current.scrollTo({ top: r * pps, behavior: smooth ? 'smooth' : 'auto' }); };
  useEffect(() => { if (apiRef) apiRef.current = { scrollToR, getR: () => lastR.current, el: el.current, pps, PH, setR: r => { lastR.current = r; el.current.scrollTop = r * pps; } }; });

  /* gestures */
  const local = e => { const rc = el.current.getBoundingClientRect(); const z = rc.height / el.current.offsetHeight || 1; const x = (e.clientX - rc.left) / z, y = (e.clientY - rc.top) / z; return { x, y, r: (el.current.scrollTop + y - PH) / pps }; };
  const onDown = e => {
    if (!gestures || pinch.current || (e.button != null && e.button > 0)) return;
    const L = local(e);
    const s = { id: e.pointerId, x0: L.x, y0: L.y, sx: el.current.scrollTop, r0: L.r, mode: L.x < GUT ? 'gut?' : null, type: e.pointerType, t0: Date.now() };
    g.current = s;
    if (s.mode) { try { el.current.setPointerCapture(e.pointerId); } catch (x) { /* */ } }
    else if (cb.current.onLong) s.lp = setTimeout(() => { if (g.current === s && !s.mode) { s.mode = 'lift'; try { el.current.setPointerCapture(s.id); } catch (x) { /* */ } cb.current.onLong(s.r0, s.x0); } }, 460);
  };
  const onMove = e => {
    const s = g.current; if (!s || s.id !== e.pointerId) return;
    const L = local(e), dx = L.x - s.x0, dy = L.y - s.y0;
    if (s.mode === 'gut?' && Math.abs(dy) > 5) s.mode = 'gut';
    if (s.mode === 'gut') {
      if (L.y < 36) el.current.scrollTop -= 6; else if (L.y > height - 36) el.current.scrollTop += 6;
      const r = (el.current.scrollTop + L.y - PH) / pps;
      cb.current.onGutter && cb.current.onGutter(s.r0, r, 'move'); return;
    }
    if (s.mode === 'lift') { cb.current.onLiftMove && cb.current.onLiftMove(L.r, L.y); return; }
    if (!s.mode) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) { s.mode = 'swipe'; clearTimeout(s.lp); try { el.current.setPointerCapture(e.pointerId); } catch (x) { /* */ } }
      else if (Math.abs(dy) > 7) { s.mode = 'scroll'; clearTimeout(s.lp); }
    }
    if (s.mode === 'swipe') cb.current.onSwipeMove && cb.current.onSwipeMove(s.r0, s.x0, dx);
    if (s.mode === 'scroll' && s.type === 'mouse') el.current.scrollTop = s.sx - dy;
  };
  const onUp = e => {
    const s = g.current; if (!s || s.id !== e.pointerId) return; g.current = null; clearTimeout(s.lp);
    const L = local(e), dx = L.x - s.x0;
    if (s.mode === 'gut?') { cb.current.onGutterTap && cb.current.onGutterTap(s.r0); return; }
    if (s.mode === 'gut') { const r = (el.current.scrollTop + L.y - PH) / pps; cb.current.onGutter && cb.current.onGutter(s.r0, r, 'end'); return; }
    if (s.mode === 'lift') { cb.current.onLiftEnd && cb.current.onLiftEnd(L.r); return; }
    if (s.mode === 'swipe') { cb.current.onSwipeMove && cb.current.onSwipeMove(null); if (Math.abs(dx) > 64) cb.current.onSwipe && cb.current.onSwipe(s.r0, s.x0, dx); return; }
    if (!s.mode && Date.now() - s.t0 < 450) cb.current.onTap && cb.current.onTap(s.r0, s.x0, e);
  };
  const onCancel = () => { const s = g.current; if (!s) return; clearTimeout(s.lp); g.current = null; if (s.mode === 'swipe') cb.current.onSwipeMove && cb.current.onSwipeMove(null); if (s.mode === 'lift') cb.current.onLiftEnd && cb.current.onLiftEnd(null); };
  useEffect(() => { // pinch (touch) + ctrl-wheel (trackpad pinch) = zoom
    const node = el.current;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const ts = e => { if (e.touches.length === 2 && cb.current.onZoom) { pinch.current = { d0: dist(e.touches), p0: cb.current.pps }; g.current = null; } };
    const tm = e => {
      if (pinch.current && e.touches.length === 2) { e.preventDefault(); cb.current.onZoom(clamp(pinch.current.p0 * dist(e.touches) / pinch.current.d0, 0.5, 90)); return; }
      const s = g.current; if (s && (s.mode === 'lift' || s.mode === 'gut' || s.mode === 'gut?' || s.mode === 'swipe')) e.preventDefault();
    };
    const te = e => { if (e.touches.length < 2) pinch.current = null; };
    const wh = e => { if (e.ctrlKey && cb.current.onZoom) { e.preventDefault(); cb.current.onZoom(clamp(cb.current.pps * Math.exp(-e.deltaY * 0.01), 0.5, 90)); } };
    node.addEventListener('touchstart', ts, { passive: true }); node.addEventListener('touchmove', tm, { passive: false });
    node.addEventListener('touchend', te); node.addEventListener('wheel', wh, { passive: false });
    return () => { node.removeEventListener('touchstart', ts); node.removeEventListener('touchmove', tm); node.removeEventListener('touchend', te); node.removeEventListener('wheel', wh); };
  }, []);

  const Y = r => PH + r * pps;
  const rA = (range[0] * TILE - PH) / pps, rB = ((range[1] + 1) * TILE - PH) / pps;
  const tiles = [];
  for (let i = range[0]; i <= range[1]; i++) if (i * TILE < total) tiles.push(i);
  // ruler
  const lab = niceStep(tickPx, pps), minor = lab >= 10 ? lab / 5 : lab >= 2 ? lab / 2 : lab / 5;
  const ticks = [];
  for (let t = Math.max(0, Math.floor(rA / minor) * minor); t <= Math.min(dur, rB); t += minor) {
    const maj = Math.abs(t / lab - Math.round(t / lab)) < 1e-6;
    ticks.push(<div key={t.toFixed(2)} className={cx('tick', maj && 'maj')} style={{ top: Y(t) }}><i />{maj && <span>{fmtT(t)}</span>}</div>);
  }
  if (beat && pps * (60 / beat) >= 5) for (let t = 0, k = 0; t <= Math.min(dur, rB); t += 60 / beat, k++) if (t >= rA) ticks.push(<div key={'b' + k} className="tick" style={{ top: Y(t), left: GUT - 2, width: 6 }}><i style={{ right: 0, width: k % 4 ? 3 : 6, background: 'var(--glow)' }} /></div>);
  const [zs, setZs] = useState(0);
  useEffect(() => { if (!zs) return; const t = setTimeout(() => setZs(0), 1800); return () => clearTimeout(t); }, [zs]);
  const lastP = useRef(pps); useEffect(() => { if (lastP.current !== pps) { lastP.current = pps; setZs(x => x + 1); } }, [pps]);
  return <div className="spwrap" style={{ position: 'relative', height, flex: 'none' }}>
    <div ref={el} className="spv" style={{ height }} onScroll={onScroll} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onContextMenu={e => e.preventDefault()}>
      <div style={{ position: 'relative', height: total }}>
        {tiles.map(i => <Tile key={i + ':' + ver} i={i} cols={cols} pps={pps} PH={PH} dpr={dpr} spectrum={spectrum} />)}
        <div className="gut" style={{ height: total }} />
        <div className="ovl" style={{ height: total }}>
          {ticks}
          {overlay && overlay({ Y, rA, rB, PH, pps })}
        </div>
      </div>
    </div>
    <div className="spfade" style={{ top: 0, background: 'linear-gradient(var(--bg), rgba(14,20,32,0))' }} />
    <div className="spfade" style={{ bottom: 0, background: 'linear-gradient(rgba(14,20,32,0), var(--bg))' }} />
    <div className="phl" style={{ top: PH }}><b ref={ro}>{fmtT(initR, true)}</b>{readoutExtra && <em>{readoutExtra}</em>}</div>
    {zoomCtl && <div className={cx('zpill', zs && 'show')}><button onClick={() => onZoom(clamp(pps / 1.6, 0.5, 90))} aria-label="缩小">−</button><span>每屏 {height / pps >= 90 ? sec1(height / pps / 60) + ' 分' : Math.round(height / pps) + ' 秒'}</span><button onClick={() => onZoom(clamp(pps * 1.6, 0.5, 90))} aria-label="放大">+</button></div>}
  </div>;
}
function Tile({ i, cols, pps, PH, dpr, spectrum }) {
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current; cv.width = 360 * dpr; cv.height = TILE * dpr;
    drawSpine(cv.getContext('2d'), { W: 360, H: TILE, dpr, y0: i * TILE, padTop: PH, pps, cols, spectrum });
  }, []);
  return <canvas ref={ref} className="tile" style={{ top: i * TILE, width: 360, height: TILE }} />;
}
