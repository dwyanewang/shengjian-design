/* ===== Online music library ===== */
function MusicLib({ ph, p, dir }) {
  const M = SJ.MUSIC;
  const [cat, setCat] = useState(p.cat || '精选');
  const [play, setPlay] = useState(p.playing || null);
  const [pos, setPos] = useState(0.18);
  const [open, setOpen] = useState(p.open || null);
  const [offline, setOffline] = useState(!!p.offline);
  const tracks = M.tracks.filter(t => cat === '精选' || t.cat === cat);
  useEffect(() => { if (!play) return; const i = setInterval(() => setPos(x => (x + 0.01) % 1), 160); return () => clearInterval(i); }, [play]);
  const T = id => M.tracks.find(t => t.id === id);
  const pt = play && T(play);
  return <div className={cx('scr', dir)}>
    <Hdr title={p.pick ? '挑一首当背景音乐' : '音乐库'} sub={offline ? '没连上网，显示上次的目录' : '8 首，可商用的都写清楚了'} onBack={ph.nav.pop}
      right={<button className="ib" onClick={() => setOffline(o => !o)} aria-label="切换网络状态（演示）" title="演示：没网时的样子"><Icon n="globe" s={20} /></button>} />
    {offline && <div className="warn" style={{ margin: '0 12px 8px', background: 'var(--s1)' }}><i style={{ background: 'var(--t3)' }} />没连上网。目录是 11月22日 的，下载过的曲目还能用；试听和新下载要等联网。</div>}
    <div className="chips" style={{ flex: 'none', paddingBottom: 6 }}>{M.categories.map(c => <button key={c} className={cx('chip', cat === c && 'on')} onClick={() => setCat(c)}>{c}</button>)}</div>
    <div className="body">
      {cat === '精选' && <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '8px 16px 4px', scrollbarWidth: 'none' }}>
        {M.tracks.filter(t => ['m2', 'm4', 'm1'].includes(t.id)).map(t => <button key={t.id} onClick={() => setOpen(t.id)} style={{ flex: 'none', width: 136, textAlign: 'left' }}>
          <div style={{ position: 'relative' }}><Cover id={t.id} size={136} />{t.vip && <span className="vip" style={{ position: 'absolute', left: 8, top: 8 }}>VIP</span>}</div>
          <b style={{ display: 'block', fontSize: 15, fontWeight: 600, marginTop: 8 }}>{t.title}</b><span className="note num">{t.cat}　{fmtT(t.seconds)}</span></button>)}
      </div>}
      <div className="st" style={{ marginTop: cat === '精选' ? 14 : 4 }}><b>{cat === '精选' ? '全部' : cat}</b><span>{tracks.length} 首</span></div>
      {(cat === '精选' ? M.tracks : tracks).map(t => <div key={t.id} className="li" role="button" style={{ cursor: 'pointer' }} onClick={() => setOpen(t.id)}>
        <Cover id={t.id} size={48} />
        <div className="lt"><b>{t.title} {t.vip && <Vip />}</b><span className="num">{fmtT(t.seconds)}</span></div>
        <button className={cx('playsm', play === t.id && 'on')} onClick={e => { e.stopPropagation(); if (offline) return ph.toast('没网，试听不了'); if (t.can_preview === false) return; setPlay(x => (x === t.id ? null : t.id)); setPos(0.02); }} aria-label="试听"><Icon n={play === t.id ? 'pause' : 'play'} s={18} /></button>
      </div>)}
      <div style={{ height: pt ? 90 : 20 }} />
    </div>
    {pt && <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, background: 'var(--s2)', borderRadius: 20, padding: 10, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 10px 30px rgba(0,0,0,.4)', zIndex: 8 }}>
      <Cover id={pt.id} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 14.5 }}>{pt.title}</b><span className="note num" style={{ display: 'block' }}>试听中　{fmtT(pos * pt.seconds)} / {fmtT(pt.seconds)}</span></div>
      <Mini S={MUSIC} w={14} h={48} half={7} lit={pos} />
      <button className="playsm on" onClick={() => setPlay(null)} aria-label="停"><Icon n="pause" s={18} /></button></div>}
    {open && <TrackSheet ph={ph} t={T(open)} pick={p.pick} onClose={() => setOpen(null)} />}
  </div>;
}
SCREENS.musiclib = MusicLib;
function TrackSheet({ ph, t, pick, onClose }) {
  const lock = t.vip && !ph.member;
  return <Sheet title={null} onClose={onClose}>
    <div className="pad" style={{ display: 'flex', gap: 16, alignItems: 'flex-end', paddingTop: 6 }}>
      <Cover id={t.id} size={112} />
      <div><b style={{ fontSize: 20, display: 'block', lineHeight: 1.35 }}>{t.title}</b><span className="note num">{t.cat}　{fmtT(t.seconds)}{t.bpm ? '　' + t.bpm + ' BPM' : ''}</span><div style={{ marginTop: 8 }}>{t.vip && <Vip />}</div></div>
    </div>
    <div className="pad" style={{ marginTop: 12 }}><div className="card" style={{ padding: '4px 14px' }}>
      <div className="kv"><span>授权</span>{t.licence}</div>
      <div className="kv" style={{ borderTop: '1px solid var(--line)' }}><span>能不能商用</span><b style={{ fontWeight: 600, color: t.commercial ? 'var(--t1)' : 'var(--red)' }}>{t.commercial ? '可以' : '不可以，只能自己用'}</b></div>
      <div className="kv" style={{ borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}><span style={{ flex: 'none' }}>署名</span><span style={{ color: 'var(--t1)', textAlign: 'right' }}>{t.credit ? t.credit : '不用署名'}</span></div>
    </div>
      {t.credit && <p className="note" style={{ marginTop: 8 }}>用了它的作品，导出时会自动把署名写进文件信息里。</p>}
      {lock ? <div className="gate" style={{ margin: '14px 0 0' }}><b>VIP 曲目：可以完整试听</b><p>导入和用作背景音乐需要会员。</p><Btn k="pri" full style={{ marginTop: 10 }} onClick={() => { onClose(); ph.nav.push('member', { from: 'music' }); }}>看看会员，7 天免费试用</Btn></div>
        : <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Btn line onClick={() => { onClose(); ph.toast('下载好了，存成新音频「' + t.title + '」'); }}>导入成新音频</Btn>
          <Btn k="pri" style={{ flex: 1 }} onClick={() => { onClose(); if (pick) { ph.nav.pop(); ph.toast('背景音乐换成「' + t.title + '」了'); } else ph.toast('打开工作台，「' + t.title + '」作为第二条脊线配在人声旁边'); }}>用作背景音乐</Btn></div>}
    </div>
  </Sheet>;
}
