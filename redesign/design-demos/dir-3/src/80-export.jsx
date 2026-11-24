/* ===== Export: purpose first ===== */
function ExportScreen({ ph, p, dir }) {
  const E = SJ.EXPORT;
  const isMusic = p.id === 'wanfeng';
  const proj = SJ.LIBRARY.find(x => x.id === p.id) || SJ.LIBRARY[0];
  const h = ph.store['ed:' + (p.id || 'interview')];
  const dur = p.range ? p.range[1] - p.range[0] : h ? edDur(h.cur) : proj.seconds;
  const [pur, setPur] = useState(p.purpose || 'file');
  const [sub, setSub] = useState(0);
  const [fmt, setFmt] = useState(p.purpose === 'share' ? 'm4a' : 'mp3');
  const [q, setQ] = useState(2);
  const [more, setMore] = useState(!!p.more);
  const [rate, setRate] = useState(0), [ch, setCh] = useState(isMusic ? 1 : 0), [depth, setDepth] = useState(0);
  const [perSeg, setPerSeg] = useState(false), [lim, setLim] = useState(true), [preset, setPreset] = useState(null);
  const [phase, setPhase] = useState(p.phase || 'setup');
  const [pct, setPct] = useState(p.phase === 'gen' ? 64 : 0);
  const kbps = { mp3: [96, 128, 192, 320], m4a: [64, 128, 192, 256], opus: [24, 32, 64, 96], amr: [12, 16, 20, 24] }[fmt];
  const mb = fmt === 'wav' ? dur * (rate ? 48000 : 44100) * (ch + 1) * [2, 3, 4][depth] / 1e6 : fmt === 'flac' ? dur * 0.09 * (ch + 1) : (dur * kbps[q] * (ch && fmt !== 'amr' ? 1 : 0.75)) / 8000;
  const name = proj.title.replace(/ · .*/, '') + (isMusic && p.range ? '-副歌' : '') + '.' + (pur === 'sound' ? 'mp3' : fmt);
  const bodyRef = useRef();
  useEffect(() => { if (p.more && bodyRef.current) bodyRef.current.scrollTop = 520; if (p.phase === 'gen') start(64); }, []);
  function start(from) {
    setPhase('gen'); let k = typeof from === 'number' ? from : 0; setPct(k);
    const i = setInterval(() => {
      k += 6; setPct(Math.min(100, k)); ph.notify({ id: 'exp', title: '正在导出 ' + name, text: Math.min(100, k) + '%，可以先去做别的', pct: Math.min(100, k) });
      if (k >= 100) { clearInterval(i); if (pur === 'file') { setPhase('ready'); ph.notify({ id: 'exp', title: '音频已生成，待保存', text: name + '：点一下选个位置保存' }); } else if (pur === 'sound') setPhase('perm'); else { setPhase('done'); ph.unnotify('exp'); ph.openSheet('share', { name }); } }
    }, 110);
  }
  const subs = E.purposes[1].subs;
  const opts = <Fragment>
    {pur === 'file' && <Fragment>
      <div className="st"><b>格式</b><span>{E.formats.find(f => f.id === fmt).note}</span></div>
      <div className="chips">{E.formats.map(f => <button key={f.id} className={cx('chip', fmt === f.id && 'on')} onClick={() => { setFmt(f.id); setDepth(0); }}>{f.name}</button>)}</div>
      {fmt === 'wav' || fmt === 'flac' ? <div className="pad" style={{ marginTop: 10 }}><div className="kv" style={{ paddingTop: 0 }}>位深</div><Seg value={depth} options={fmt === 'wav' ? ['16 位', '24 位', '32 位浮点'] : ['16 位', '24 位']} onChange={setDepth} /></div>
        : <div className="pad" style={{ marginTop: 10 }}><div className="kv" style={{ paddingTop: 0 }}>音质<span className="num">{kbps[q]} kbps</span></div><Seg value={q} options={E.quality} onChange={setQ} /></div>}
      {!isMusic && <div className="pad" style={{ marginTop: 12 }}><div className="warn"><i /><span style={{ flex: 1 }}>{E.clipWarn}</span><Switch on={lim} onChange={setLim} /></div></div>}
      <button className="li" style={{ minHeight: 48, marginTop: 6 }} onClick={() => setMore(m => !m)}><div className="lt"><b>更多设置</b><span>采样率、声道、标签、每段一个文件、预设</span></div><span style={{ transform: more ? 'rotate(180deg)' : 'none', display: 'grid' }}><Icon n="chevD" s={20} /></span></button>
      {more && <div className="pad">
        <div className="kv">采样率</div><Seg value={rate} options={E.rates} onChange={setRate} />
        <div className="kv" style={{ marginTop: 4 }}>声道</div><Seg value={ch} options={E.channels} onChange={setCh} />
        <div className="kv" style={{ marginTop: 4 }}>{E.perSegment}<Switch on={perSeg} onChange={setPerSeg} /></div>
        <div className="kv" style={{ paddingBottom: 6 }}>标签<span>写进文件里</span></div>
        <div style={{ display: 'grid', gap: 6 }}>{[['标题', proj.title], ['作者', '林晨'], ['专辑', '慢读播客'], ['年份', '2026'], ['备注', isMusic ? '' : '']].map(([k, v]) => <div key={k} className="fld" style={{ minHeight: 42 }}><label>{k}</label><input defaultValue={v} placeholder={k === '备注' ? '音乐署名会自动写在这里' : ''} /></div>)}
          <div className="fld" style={{ minHeight: 56 }}><label>封面</label><Cover id={p.id || 'interview'} size={40} /><span className="t3" style={{ fontSize: 14 }}>换一张</span></div></div>
        <div className="kv" style={{ marginTop: 6 }}>预设<button className="t2" style={{ fontSize: 14 }} onClick={() => { setPreset('我的播客'); ph.toast('存成预设「我的播客」：MP3，高，单声道'); }}>存成预设</button></div>
        <div className="wrapchips">{['我的播客', '发微信语音', '无损存档'].map(x => <button key={x} className={cx('chip', preset === x && 'on')} onClick={() => { setPreset(x); if (x === '无损存档') { setFmt('flac'); setDepth(1); } else if (x === '发微信语音') { setFmt('m4a'); setQ(1); } else { setFmt('mp3'); setQ(2); setCh(0); } }}>{x}</button>)}</div>
        <div style={{ height: 8 }} /></div>}
    </Fragment>}
    {pur === 'sound' && <div className="pad" style={{ marginTop: 14 }}>
      <Seg value={sub} options={subs} onChange={setSub} />
      <div className="card" style={{ marginTop: 12, padding: '12px 14px', display: 'flex', gap: 14, alignItems: 'center' }}>
        <Mini S={isMusic ? MUSIC : SPEECH} w={22} h={70} half={11} from={p.range ? p.range[0] : 0} to={p.range ? p.range[1] : 30} />
        <div style={{ flex: 1 }}><b style={{ fontSize: 15 }}>{p.range ? '副歌 ' + fmtT(p.range[0]) + '–' + fmtT(p.range[1]) + '，' + Math.round(dur) + ' 秒' : fmtT(dur) + '，比较长'}</b>
          <p className="note">{p.range ? '最后一秒自动淡出，不会戛然而止' : '铃声一般 30 秒以内；只会响开头那一段。最后一秒自动淡出。'}</p></div></div>
      {!p.range && <Btn full line style={{ marginTop: 10 }} onClick={() => ph.nav.pop()}>回去选一段</Btn>}
      <p className="note" style={{ marginTop: 10 }}>存成 MP3，铃声和闹钟都认；同时在「铃声」文件夹留一份。</p></div>}
    {pur === 'share' && <div className="pad" style={{ marginTop: 14 }}>
      <Seg value={fmt === 'mp3' ? 'mp3' : 'm4a'} options={[{ v: 'm4a', l: 'M4A，更小' }, { v: 'mp3', l: 'MP3，哪里都能放' }]} onChange={setFmt} />
      <p className="note" style={{ marginTop: 10 }}>下一步是系统的分享面板，你自己选发给谁；声剪不会自动发出去。</p></div>}
  </Fragment>;
  return <div className={cx('scr', dir)}>
    <Hdr title="导出" sub={proj.title + '，' + fmtT(dur)} onBack={ph.nav.pop} />
    {phase === 'setup' ? <Fragment>
      <div className="body" ref={bodyRef}>
        <p className="h2 pad" style={{ marginTop: 4 }}>拿去做什么？</p>
        <div className="pad" style={{ display: 'grid', gap: 8, marginTop: 12 }}>{E.purposes.map(x => <button key={x.id} className={cx('opt', pur === x.id && 'on')} onClick={() => { setPur(x.id); if (x.id === 'share') setFmt('m4a'); if (x.id === 'file') setFmt('mp3'); }}>
          <span className="playsm" style={{ width: 40, height: 40, borderRadius: 20, background: pur === x.id ? 'var(--t1)' : 'var(--s2)', color: pur === x.id ? 'var(--bg)' : 'var(--t1)' }}><Icon n={x.id === 'file' ? 'file' : x.id === 'sound' ? 'bell' : 'share'} s={20} /></span>
          <div className="lt"><b>{x.name}</b><span>{x.detail.replace(/ · /g, '，')}</span></div><span className={cx('radio', pur === x.id && 'on')} /></button>)}</div>
        {opts}
        <div style={{ height: 14 }} />
      </div>
      <div className="dock" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px 12px' }}>
        <div style={{ flex: 1 }}><b className="num" style={{ fontSize: 15 }}>约 {mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB</b><span className="note" style={{ display: 'block' }}>没有水印{perSeg ? '，4 个文件' : ''}</span></div>
        <Btn k="pri" onClick={() => start(0)}>{pur === 'file' ? '导出' : pur === 'sound' ? '设成' + subs[sub] : '发给别人'}</Btn></div>
    </Fragment> : <div className="body pad" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 18 }}>
        <Mini S={isMusic ? MUSIC : SPEECH} w={34} h={200} half={17} from={p.range ? p.range[0] : 0} to={p.range ? p.range[1] : 120} lit={phase === 'gen' ? pct / 100 : 1} />
        <div style={{ flex: 1 }}>
          {phase === 'gen' && <Fragment><span className="num" style={{ fontSize: 40, fontWeight: 300 }}>{pct}%</span><p className="t2" style={{ fontSize: 15 }}>正在生成 {name}</p><p className="note" style={{ marginTop: 6 }}>可以离开这一页，做完会在通知栏提醒你保存。</p><Btn sm line style={{ marginTop: 12 }} onClick={() => ph.openShade()}>看通知栏</Btn></Fragment>}
          {phase === 'ready' && <Fragment><span className="gl" style={{ fontSize: 14 }}>音频已生成，待保存</span><p style={{ fontSize: 19, fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>{name}</p><p className="note">{mb.toFixed(1)} MB，没有水印{lim && !isMusic ? '。限幅处理了 3 处爆音' : ''}</p></Fragment>}
          {phase === 'perm' && <Fragment><p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.45 }}>还差一步：允许声剪修改系统设置</p><p className="note" style={{ marginTop: 4 }}>安卓要求这样才能把它设成{subs[sub]}；只用这一次。</p></Fragment>}
          {phase === 'done' && <Fragment><span className="gl" style={{ fontSize: 14 }}>好了</span><p style={{ fontSize: 19, fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>{pur === 'sound' ? '已设为' + subs[sub] : pur === 'share' ? '交给系统分享了' : '存到 下载／' + name}</p><p className="note">{pur === 'sound' ? '最后一秒淡出；「铃声」文件夹里也留了一份' : '在音频库里随时可以再导出'}</p></Fragment>}
        </div></div>
      <div style={{ marginTop: 'auto', display: 'grid', gap: 10, paddingBottom: 14 }}>
        {phase === 'ready' && <Btn k="pri" full onClick={() => ph.openSheet('saf', { name, then: () => { setPhase('done'); ph.unnotify('exp'); } })}>选个位置保存</Btn>}
        {phase === 'perm' && <div style={{ display: 'flex', gap: 10 }}><Btn line onClick={() => setPhase('setup')}>不允许</Btn><Btn k="pri" style={{ flex: 1 }} onClick={() => { setPhase('done'); ph.unnotify('exp'); ph.toast('已设为' + subs[sub]); }}>允许</Btn></div>}
        {phase === 'done' && <div style={{ display: 'flex', gap: 10 }}><Btn line onClick={() => setPhase('setup')}>再导出一个</Btn><Btn k="pri" style={{ flex: 1 }} onClick={() => ph.nav.pop()}>回去接着剪</Btn></div>}
      </div>
    </div>}
  </div>;
}
SCREENS.export = ExportScreen;
