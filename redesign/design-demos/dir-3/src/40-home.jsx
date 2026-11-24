/* ===== Home (audio library), New, Record, Files, Share-in, Batch, Me & settings, Login, member gate ===== */
const FILTERS = [{ k: 'all', l: '全部' }, { k: 'rec', l: '录音' }, { k: 'imp', l: '导入' }, { k: 'mix', l: '混音' }, { k: 'multi', l: '多版本' }, { k: 'save', l: '待保存' }];
const matchF = (it, f) => f === 'all' || (f === 'rec' && it.from === '录音') || (f === 'imp' && /文件|视频/.test(it.from)) || (f === 'mix' && it.kind === 'mix') || (f === 'multi' && it.versions > 1) || (f === 'save' && it.status === 'saving');
function Home({ ph, p, dir }) {
  const [f, setF] = useState(p.filter || 'all');
  const [q, setQ] = useState(null);
  const [picked, setPicked] = useState(p.pick || null);
  const [menu, setMenu] = useState(p.menu || null);
  const lib = SJ.LIBRARY.filter(it => matchF(it, f) && (!q || it.title.includes(q)));
  const open = it => (it.id === 'interview' || it.id === 'wanfeng' ? ph.nav.push('editor', { id: it.id }) : ph.nav.push('editor', { id: it.env === 'music' ? 'wanfeng' : 'interview' }));
  const tog = id => setPicked(s => { const n = new Set(s || []); n.has(id) ? n.delete(id) : n.add(id); return n.size ? n : null; });
  return <div className={cx('scr', dir)}>
    {picked ? <Hdr title={'选了 ' + picked.size + ' 个'} onBack={() => setPicked(null)} back="close" right={<Btn sm line onClick={() => setPicked(new Set(SJ.LIBRARY.map(x => x.id)))} style={{ marginRight: 6 }}>全选</Btn>} />
      : q != null ? <div className="hdr"><button className="ib" onClick={() => setQ(null)} aria-label="返回"><Icon n="back" /></button><div className="fld" style={{ flex: 1, height: 42, marginRight: 8 }}><Icon n="search" s={18} /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="搜音频名字" /></div></div>
      : <div className="hdr" style={{ paddingLeft: 16 }}><Mark s={0.42} /><b style={{ fontFamily: 'var(--f-disp)', fontWeight: 900, fontSize: 24, marginLeft: 10, flex: 1, letterSpacing: '.02em' }}>声剪</b>
        <button className="ib" onClick={() => setQ('')} aria-label="搜索"><Icon n="search" /></button>
        <button className="ib" onClick={() => ph.nav.push('me')} aria-label="我的"><span style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--s2)', display: 'grid', placeItems: 'center' }}><Icon n="user" s={18} /></span></button></div>}
    <div className="body">
      {!picked && q == null && <Fragment>
        <div className="hero" onClick={() => ph.nav.push('editor', { id: 'interview' })} style={{ cursor: 'pointer' }}>
          <div className="hs"><HeroSpine /></div>
          <div className="hx"><span className="t3" style={{ fontSize: 13 }}>接着剪</span><b style={{ marginTop: 2 }}>播客第 12 期 · 和王老师聊阅读</b><span className="m num">18:40　今天 09:42</span>
            <p className="say1">9 处长停顿，就是左边这些空档。<br />横着一划，它就合上。</p>
            <Btn k="pri" sm style={{ marginTop: 10, alignSelf: 'flex-start' }} onClick={e => { e.stopPropagation(); ph.nav.push('editor', { id: 'interview' }); }}>接着剪</Btn></div>
        </div>
        <div className="st" style={{ marginTop: 18 }}><b>新建</b><button className="t2" style={{ fontSize: 14 }} onClick={() => ph.nav.push('new')}>全部 13 种来源</button></div>
        <div className="srcs">
          <button className="rec" onClick={() => ph.nav.push('record')}><i><Icon n="rec" /></i>录音</button>
          <button onClick={() => ph.nav.push('files')}><i><Icon n="file" /></i>手机文件</button>
          <button onClick={() => ph.nav.push('files', { video: true })}><i><Icon n="video" /></i>视频提取</button>
          <button onClick={() => ph.openSheet('cross', { phone: 'V', label: '配音在「配音」那台手机里', path: { stack: [['tts']] } })}><i><Icon n="text" /></i>文字配音</button>
          <button onClick={() => ph.nav.push('new')}><i><Icon n="plus" /></i>更多</button>
        </div>
      </Fragment>}
      <div className="st" style={{ marginTop: picked || q != null ? 6 : 22 }}><b>音频库</b><span className="num">{lib.length} 个</span></div>
      <div className="chips">{FILTERS.map(x => <button key={x.k} className={cx('chip', f === x.k && 'on')} onClick={() => setF(x.k)}>{x.l}{x.k === 'save' && ' 1'}</button>)}</div>
      <div style={{ marginTop: 6 }}>{lib.map(it => <LibRow key={it.id} it={it} picked={picked} onTap={() => (picked ? tog(it.id) : open(it))} onLong={() => tog(it.id)} onMore={() => setMenu(it.id)} ph={ph} />)}</div>
      {!lib.length && <p className="note pad" style={{ padding: '30px 16px' }}>没有叫「{q}」的音频。</p>}
      {!picked && <p className="note pad" style={{ padding: '14px 16px 24px' }}>长按一条可以多选，对几个音频一起说一句、用工具或导出。</p>}
    </div>
    {picked && <div className="dock" style={{ display: 'flex', gap: 8, padding: '10px 12px' }}>
      <Btn k="pri" style={{ flex: 1 }} onClick={() => ph.nav.push('batch', { tpl: 'sentence', n: picked.size })}>对它们说一句</Btn>
      <Btn onClick={() => ph.nav.push('batch', { tpl: 'clean', n: picked.size })}>用工具</Btn>
      <Btn onClick={() => ph.nav.push('batch', { tpl: 'convert', n: picked.size })}>导出</Btn></div>}
    {menu && <ItemSheet ph={ph} it={SJ.LIBRARY.find(x => x.id === menu)} onClose={() => setMenu(null)} />}
  </div>;
}
SCREENS.home = Home;
function HeroSpine() {
  const ref = useRef();
  const lay = useMemo(() => layout(SPEECH, newEd(SPEECH, 'x')), []);
  const smp = useMemo(() => makeSampler(SPEECH, newEd(SPEECH, 'x')), []);
  useEffect(() => { const cv = ref.current, dpr = 2; cv.width = 128 * dpr; cv.height = 236 * dpr; drawSpine(cv.getContext('2d'), { W: 128, H: 236, dpr, y0: 40.5 * 10, padTop: 0, pps: 10, cols: [{ x: 50, capW: 64, lay, amp: smp.amp, kind: 'speech' }] }); }, []);
  const Y = r => r * 10 - 405;
  return <Fragment><canvas ref={ref} style={{ width: 128, height: 236, display: 'block', filter: 'drop-shadow(0 0 4px rgba(126,240,207,.45))' }} />
    {SPEECH.pauses.filter(q => q.s > 41 && q.e < 63.5).map(q => <span key={q.id} style={{ position: 'absolute', left: 86, top: Y((q.s + q.e) / 2) - 9, fontSize: 12, color: 'var(--t1)', lineHeight: '18px', whiteSpace: 'nowrap' }}>{sec1(q.d)} 秒</span>)}
  </Fragment>;
}
function LibRow({ it, picked, onTap, onLong, onMore, ph }) {
  const t = useRef();
  const on = picked && picked.has(it.id);
  const S = envFor(it.id);
  return <div className={cx('lib-row', on && 'on')} role="button" style={{ cursor: 'pointer' }}
    onPointerDown={() => { t.current = setTimeout(() => { t.current = 'long'; onLong(); }, 480); }} onPointerUp={() => { if (t.current !== 'long') { clearTimeout(t.current); onTap(); } t.current = null; }} onPointerLeave={() => { if (t.current !== 'long') clearTimeout(t.current); }}>
    {picked ? <span className={cx('ck', on && 'on')}>{on && <Icon n="check" s={16} w={2.4} />}</span> : <Mini S={S} w={24} h={60} from={it.env === 'speech' ? 0 : 0} to={it.env === 'speech' ? Math.min(S.dur, 80) : S.dur} half={12} className="thumb" />}
    <div className="lt"><b>{it.title}</b>
      <span>{it.status === 'exporting' ? <Fragment><span className="stt">{it.statusText}</span></Fragment> : it.status === 'saving' ? <span className="stt">{it.statusText}</span> : <Fragment>{it.from}{it.versions > 1 && <span>{'　' + it.versions + ' 个版本'}</span>}{it.markers && <span>{'　' + it.markers + ' 个标记'}</span>}</Fragment>}</span>
      {it.status === 'exporting' && <div className="bar" style={{ width: '80%' }}><i style={{ width: '64%' }} /></div>}
    </div>
    <div className="rt"><span className="num">{fmtT(it.seconds)}</span><br /><span className="t3" style={{ fontSize: 12.5 }}>{it.date}</span></div>
    {it.status === 'saving' && !picked ? <Btn sm k="pri" style={{ height: 34, padding: '0 12px' }} onClick={e => { e.stopPropagation(); ph.openSheet('saf', { name: '晚风-副歌铃声.mp3' }); }}>保存</Btn>
      : !picked && <button className="ib" style={{ width: 36, marginRight: -8 }} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onMore(); }} aria-label="更多"><Icon n="more" s={20} /></button>}
  </div>;
}
function ItemSheet({ ph, it, onClose }) {
  const [ren, setRen] = useState(false);
  const mb = Math.round(it.seconds * 0.19 * it.versions + 4);
  return <Sheet title={ren ? '改名' : it.title} onClose={onClose}>
    {ren ? <div className="pad"><div className="fld"><input autoFocus defaultValue={it.title} /></div><Btn k="pri" full style={{ marginTop: 12 }} onClick={() => { onClose(); ph.toast('改好了'); }}>好</Btn></div> : <Fragment>
      <div className="pad" style={{ display: 'flex', gap: 14, alignItems: 'center', paddingBottom: 6 }}><Mini S={envFor(it.id)} w={24} h={56} to={it.env === 'speech' ? 80 : null} half={12} />
        <div className="note num" style={{ fontSize: 14 }}>{fmtT(it.seconds)}　{it.from}<br />占用 {mb} MB，含 {it.versions} 个版本</div></div>
      <button className="li" onClick={() => setRen(true)}><Icon n="edit" s={20} /><div className="lt"><b>改名</b></div></button>
      <button className="li" onClick={() => { onClose(); ph.openSheet('cross', { phone: 'E', label: '导出在「导出」那台手机里演示', path: { stack: [['export', { id: 'interview' }]] } }); }}><Icon n="share" s={20} /><div className="lt"><b>导出</b><span>先选用途：存文件、设铃声、发给别人</span></div></button>
      <button className="li" onClick={() => { onClose(); ph.openSheet('cross', { phone: 'T', label: '版本在「处理」那台手机里', path: { stack: [['editor', { id: 'interview' }], ['versions', { id: 'interview' }]] } }); }}><Icon n="layers" s={20} /><div className="lt"><b>版本</b><span>{(it.versionNames || ['原始']).join('、')}</span></div></button>
      <button className="li" onClick={() => { onClose(); ph.toast('工程包存好了：' + it.title + '.sjpkg，换手机后在「新建」里导入'); }}><Icon n="pkg" s={20} /><div className="lt"><b>导出工程包</b><span>带上所有版本和编辑记录，换手机用</span></div></button>
      <button className="li" onClick={() => { onClose(); ph.toast('用 09:40 的备份恢复了，最后 2 分钟的改动没了'); }}><Icon n="undo" s={20} /><div className="lt"><b>用备份恢复</b><span>上次没存完、或者打不开时用</span></div></button>
      <button className="li" onClick={() => { onClose(); ph.toast('删掉了，会在音频库保留 30 天', { label: '撤销', fn: () => { } }); }}><span style={{ color: 'var(--red)', display: 'grid' }}><Icon n="trash" s={20} /></span><div className="lt"><b style={{ color: 'var(--red)' }}>删除</b><span>连同 {it.versions} 个版本</span></div></button>
    </Fragment>}
  </Sheet>;
}

/* ----- 新建: every source ----- */
function NewScreen({ ph, p, dir }) {
  const [blank, setBlank] = useState(p.blank ? 2 : null);
  const rows = [
    ['rec', '录音', '暂停、继续，接着上次录', () => ph.nav.push('record')],
    ['file', '手机里的文件', '多选就按顺序拼成一段，最多 20 个', () => ph.nav.push('files')],
    ['video', '视频里的声音', '从视频里把声音提出来', () => ph.nav.push('files', { video: true })],
    ['share', '从别的 App 分享进来', '在微信、文件管理里点「分享」选声剪', () => ph.nav.push('sharein')],
    ['text', '文字读出来', '本机音色免费；真人感音色要会员', () => ph.openSheet('cross', { phone: 'V', label: '配音在「配音」那台手机里', path: { stack: [['tts']] } })],
    ['spines', '字幕配音', '导入 SRT / VTT / 纯文本，逐句对齐', () => ph.openSheet('cross', { phone: 'V', label: '字幕配音在「配音」那台手机里', path: { stack: [['tts'], ['subtitle']] } })],
    ['mic', '克隆我的声音', '照着读 5 秒，以后用你的声音读文字', () => ph.openSheet('cross', { phone: 'V', label: '克隆在「配音」那台手机里', path: { stack: [['tts'], ['clone']] } })],
    ['music', '在线音乐库', '分类试听，可商用的会写清楚', () => ph.openSheet('cross', { phone: 'L', label: '音乐库在「音乐库」那台手机里', path: { stack: [['musiclib']] } })],
    ['blank', '一段空白', '0.05 到 600 秒，当垫子或间隔', () => setBlank(2)],
    ['sample', '示例音频', '一段 2 分钟的访谈，先拿它练手', () => ph.nav.push('editor', { id: 'interview' })],
    ['pkg', '导入工程包', '从旧手机带过来的 .sjpkg', () => ph.toast('选择 .sjpkg 文件…（系统文件选择器）')],
    ['batch', '批量处理', '一批文件，用同一个模板', () => ph.nav.push('batch', {})],
  ];
  return <div className={cx('scr', dir)}>
    <Hdr title="新建" sub="声音从哪儿来" onBack={ph.nav.pop} />
    <div className="body">
      {rows.map(([i, t, s, fn]) => <button key={t} className="li" onClick={fn}><span className="playsm" style={i === 'rec' ? { background: '#3a1f1f', color: '#ff8f7f', width: 40, height: 40, borderRadius: 20 } : { width: 40, height: 40, borderRadius: 20 }}><Icon n={i} s={20} /></span><div className="lt"><b>{t}</b><span>{s}</span></div><Icon n="chevR" s={18} /></button>)}
      <div style={{ height: 20 }} />
    </div>
    {blank != null && <Sheet title="一段空白" onClose={() => setBlank(null)}>
      <div className="pad"><div className="kv">长度<span className="num" style={{ fontSize: 18, color: 'var(--t1)', fontWeight: 600 }}>{blank} 秒</span></div>
        <Slider value={blank} min={0.05} max={60} step={0.05} onChange={v => setBlank(+v.toFixed(2))} />
        <div className="wrapchips" style={{ marginTop: 8 }}>{[0.5, 1, 3, 10, 60, 600].map(v => <button key={v} className={cx('chip', blank === v && 'on')} onClick={() => setBlank(v)}>{v >= 60 ? v / 60 + ' 分钟' : v + ' 秒'}</button>)}</div>
        <Btn k="pri" full style={{ marginTop: 14 }} onClick={() => { setBlank(null); ph.toast('新建了 ' + blank + ' 秒空白'); }}>新建</Btn></div>
    </Sheet>}
  </div>;
}
SCREENS.new = NewScreen;

/* ----- 录音 ----- */
function RecordScreen({ ph, p, dir }) {
  const [st, setSt] = useState('idle'); // idle | rec | paused
  const [t, setT] = useState(0);
  const [tab, setTab] = useState(p.tab || 'now');
  const [sheet, setSheet] = useState(p.sheet || null);
  const [cfg, setCfg] = useState({ dev: '内置麦克风', ch: 'mono', gain: 6, mon: false });
  useEffect(() => { if (st !== 'rec') return; const i = setInterval(() => setT(x => x + 0.1), 100); return () => clearInterval(i); }, [st]);
  const pxs = 9, H = 400;
  const shown = Math.max(0, t);
  return <div className={cx('scr', dir)}>
    <Hdr title="录音" onBack={ph.nav.pop} right={<div className="seg" style={{ width: 150, marginRight: 8 }}><button className={cx(tab === 'now' && 'on')} onClick={() => setTab('now')}>录</button><button className={cx(tab === 'list' && 'on')} onClick={() => setTab('list')}>录音列表</button></div>} />
    {tab === 'list' ? <div className="body">
      <div className="st" style={{ marginTop: 6 }}><b>上次没录完</b></div>
      <button className="li" onClick={() => { setTab('now'); setT(83); setSt('paused'); }}><Mini S={envFor('meeting')} w={20} h={44} half={10} to={60} /><div className="lt"><b>客户回访电话</b><span className="num">1:23　昨天 21:10　App 被关掉时停在这里</span></div><span className="btn sm pri">接着录</span></button>
      <div className="st"><b>录好的</b></div>
      {['周三产品例会', '播客第 12 期 · 和王老师聊阅读', '晨读打卡 11月19日'].map((n, i) => <button key={n} className="li" onClick={() => ph.toast('打开「' + n + '」')}><Mini S={envFor(i ? 'interview' : 'meeting')} w={20} h={44} half={10} to={60} /><div className="lt"><b>{n}</b><span className="num">{['47:12', '18:40', '3:05'][i]}　{['昨天', '今天', '11月19日'][i]}</span></div></button>)}
    </div> : <Fragment>
      <button className="li" style={{ minHeight: 48, margin: '0 4px', width: 'auto', borderRadius: 14, background: 'var(--s1)' }} onClick={() => setSheet('settings')}>
        <Icon n="set" s={19} /><div className="lt"><b style={{ fontSize: 14 }}>{cfg.dev}　{cfg.ch === 'mono' ? '单声道' : '立体声'}　{cfg.gain > 0 ? '+' : ''}{cfg.gain} dB　{cfg.mon ? '耳机监听开' : '耳机监听关'}</b></div><Icon n="chevR" s={18} /></button>
      <div className="recv">
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: H, overflow: 'hidden' }}>
          <RecSpine t={shown} pxs={pxs} H={H} on={st === 'rec'} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: H + 6, textAlign: 'center' }}>
          <div className="num" style={{ fontSize: 40, fontWeight: 300, letterSpacing: '.02em' }}>{fmtT(shown, true)}</div>
          <p className="note">{st === 'idle' ? '声音会从上往下长出来，停顿看得见' : st === 'rec' ? '正在录：说话就是一颗颗胶囊' : '暂停了，可以接着录'}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '6px 20px 18px' }}>
        <button className="playsm" style={{ width: 52, height: 52, borderRadius: 26 }} onClick={() => { if (st !== 'idle') { setSt('idle'); setT(0); ph.toast('这段丢掉了'); } }} aria-label="丢掉"><Icon n="trash" s={22} /></button>
        <button className={cx('bigrec', st === 'rec' && 'on')} onClick={() => setSt(s => (s === 'rec' ? 'paused' : 'rec'))} aria-label={st === 'rec' ? '暂停' : '录'}><Icon n={st === 'rec' ? 'pause' : 'rec'} s={34} /></button>
        <button className="playsm" style={{ width: 52, height: 52, borderRadius: 26, background: t > 0.5 ? 'var(--t1)' : 'var(--s2)', color: t > 0.5 ? 'var(--bg)' : 'var(--t1)' }} onClick={() => { if (t > 0.5) { setSt('idle'); ph.nav.replace('editor', { id: 'interview' }); ph.toast('存好了：新录音 ' + fmtT(t)); } }} aria-label="存好"><Icon n="check" s={24} /></button>
      </div>
    </Fragment>}
    {sheet === 'settings' && <Sheet title="录音设置" onClose={() => setSheet(null)}>
      <div className="st" style={{ marginTop: 4 }}><b>用哪个麦克风</b></div>
      {['内置麦克风', '有线耳机麦克风', 'USB 麦克风', '蓝牙耳机（通话音质）'].map(d => <button key={d} className="li" style={{ minHeight: 50 }} onClick={() => setCfg(c => ({ ...c, dev: d }))}><span className={cx('radio', cfg.dev === d && 'on')} /><div className="lt"><b>{d}</b>{/蓝牙/.test(d) && <span>蓝牙录音是窄带的，声音会像打电话</span>}</div></button>)}
      <div className="pad"><div className="kv">声道</div><Seg value={cfg.ch} options={[{ v: 'mono', l: '单声道' }, { v: 'st', l: '立体声' }]} onChange={v => setCfg(c => ({ ...c, ch: v }))} />
        <div className="kv" style={{ marginTop: 6 }}>输入增益<span className="num">{cfg.gain > 0 ? '+' : ''}{cfg.gain} dB　（-12 到 +24）</span></div><Slider value={cfg.gain} min={-12} max={24} step={1} onChange={v => setCfg(c => ({ ...c, gain: v }))} />
        <div className="kv">耳机监听<Switch on={cfg.mon} onChange={v => setCfg(c => ({ ...c, mon: v }))} /></div>
        <p className="note">监听要插耳机，外放会啸叫；蓝牙耳机会有延迟。</p></div>
    </Sheet>}
  </div>;
}
SCREENS.record = RecordScreen;
function RecSpine({ t, pxs, H, on }) {
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current, dpr = 2; cv.width = 360 * dpr; cv.height = H * dpr; const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, 360, H);
    const S = SPEECH, head = H - 70, x = 180, half = 58;
    const y0 = Math.min(head, t * pxs);   // newest audio sits at the head line; older audio scrolls up
    ctx.fillStyle = `rgba(${COL.line},.35)`; ctx.fillRect(x - 0.5, 0, 1, y0);
    for (let y = 0; y < y0; y += 0.5) {
      const r = t - (y0 - y) / pxs; if (r < 0) continue; const tt = r + 9;
      const i0 = Math.floor(tt * S.rate), i1 = Math.ceil((tt + 0.5 / pxs) * S.rate); let m = 0; for (let k = i0; k < i1; k++) m = Math.max(m, S.env[k] || 0);
      const hw = m * half; ctx.fillStyle = `rgba(${COL.glow},.95)`; if (hw > 0.3) ctx.fillRect(x - hw, y, hw * 2, 0.5);
    }
    ctx.fillStyle = on ? 'rgba(255,122,106,.9)' : `rgba(${COL.white},.8)`; ctx.fillRect(40, y0, 280, 1);
  }, [t, on]);
  return <canvas ref={ref} style={{ width: 360, height: H, filter: 'drop-shadow(0 0 4px rgba(126,240,207,.45))' }} />;
}

/* ----- 手机文件 / 视频 ----- */
function FilesScreen({ ph, p, dir }) {
  const vids = p.video;
  const files = vids ? [['毕业典礼.mp4', '3:48', '1.2 GB'], ['女儿钢琴课.mp4', '12:10', '860 MB'], ['年会彩排.mov', '25:02', '2.1 GB']] : [['访谈素材 01.m4a', '18:40', '17 MB'], ['访谈素材 02.m4a', '21:13', '19 MB'], ['片头音乐.mp3', '0:12', '0.4 MB'], ['晚风（钢琴版）.flac', '3:52', '24 MB'], ['语音备忘 1120.amr', '1:05', '0.1 MB']];
  const [sel, setSel] = useState(vids ? [0] : [0, 2]);
  return <div className={cx('scr', dir)}>
    <Hdr title={vids ? '视频里的声音' : '手机里的文件'} sub={vids ? '选一个视频，只取声音' : '可以多选，按选的顺序拼成一段，最多 20 个'} onBack={ph.nav.pop} />
    <div className="body">{files.map((f, i) => { const k = sel.indexOf(i); return <button key={f[0]} className="li" onClick={() => setSel(s => (vids ? [i] : k >= 0 ? s.filter(x => x !== i) : [...s, i].slice(0, 20)))}>
      <span className={cx('ck', k >= 0 && 'on')} style={{ fontSize: 13, fontWeight: 700 }}>{k >= 0 && (vids ? <Icon n="check" s={16} w={2.4} /> : k + 1)}</span>
      <div className="lt"><b>{f[0]}</b><span className="num">{f[1]}　{f[2]}</span></div></button>; })}</div>
    <div className="dock" style={{ padding: 12 }}><Btn k="pri" full disabled={!sel.length} onClick={() => { ph.nav.replace('editor', { id: 'interview' }); ph.toast(vids ? '声音提出来了，视频本身不动' : sel.length > 1 ? sel.length + ' 个文件拼好了，每段开头放了一个标记' : '导入好了'); }}>{vids ? '提取声音' : sel.length > 1 ? '拼成一段（' + sel.length + ' 个）' : '导入'}</Btn></div>
  </div>;
}
SCREENS.files = FilesScreen;
function ShareIn({ ph, dir }) {
  const [mode, setMode] = useState('join');
  return <div className={cx('scr', dir)}>
    <Hdr title="收到 3 个文件" sub="从「文件管理」分享过来" onBack={ph.nav.pop} back="close" />
    <div className="body pad">
      {['课堂录音 上.m4a', '课堂录音 中.m4a', '课堂录音 下.m4a'].map((n, i) => <div key={n} className="li" style={{ padding: '10px 0' }}><Mini S={envFor('lesson')} w={20} h={40} half={10} from={i * 20} to={i * 20 + 40} /><div className="lt"><b>{n}</b><span className="num">{['24:10', '25:02', '19:48'][i]}</span></div></div>)}
      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        <button className={cx('opt', mode === 'join' && 'on')} onClick={() => setMode('join')}><span className={cx('radio', mode === 'join' && 'on')} /><div className="lt"><b>拼成一段</b><span>按这个顺序接起来，接缝处放标记</span></div></button>
        <button className={cx('opt', mode === 'each' && 'on')} onClick={() => setMode('each')}><span className={cx('radio', mode === 'each' && 'on')} /><div className="lt"><b>分别导入</b><span>变成 3 个音频</span></div></button>
      </div></div>
    <div className="dock" style={{ padding: 12 }}><Btn k="pri" full onClick={() => { ph.nav.reset([['home']]); ph.toast(mode === 'join' ? '拼好了：课堂录音（1:09:00）' : '导入了 3 个音频'); }}>好</Btn></div>
  </div>;
}
SCREENS.sharein = ShareIn;

/* ----- 批量 ----- */
function BatchScreen({ ph, p, dir }) {
  const [tpl, setTpl] = useState(p.tpl || 'clean');
  const [stage, setStage] = useState(p.stage || 'setup');
  const [done, setDone] = useState(p.stage === 'run' ? SJ.BATCH.run.done : p.stage === 'report' ? (p.n || SJ.BATCH.run.total) : 0);
  const [paused, setPaused] = useState(false);
  const [text, setText] = useState('降噪，删掉长停顿，统一音量');
  const n = p.n || SJ.BATCH.run.total;
  const over = n > 10 && !ph.member;
  useEffect(() => {
    if (stage !== 'run' || paused) return;
    const i = setInterval(() => setDone(d => { if (d + 1 >= n) { clearInterval(i); setStage('report'); ph.unnotify('batch'); return n; } return d + 1; }), 700);
    return () => clearInterval(i);
  }, [stage, paused]);
  useEffect(() => { if (stage === 'run') ph.notify({ id: 'batch', app: '批量处理', title: '语音清理 ' + done + ' / ' + n, text: paused ? '暂停了' : '在后台继续，可以锁屏', pct: Math.round((done / n) * 100) }); }, [done, stage, paused]);
  const T = SJ.BATCH.templates.find(x => x.id === tpl);
  return <div className={cx('scr', dir)}>
    <Hdr title="批量处理" sub={stage === 'setup' ? n + ' 个文件' : T.name} onBack={ph.nav.pop} />
    {stage === 'setup' && <Fragment><div className="body">
      <div className="st" style={{ marginTop: 4 }}><b>用哪个模板</b></div>
      <div className="pad" style={{ display: 'grid', gap: 8 }}>{SJ.BATCH.templates.map(x => <button key={x.id} className={cx('opt', tpl === x.id && 'on')} style={{ padding: '11px 14px' }} onClick={() => setTpl(x.id)}><span className={cx('radio', tpl === x.id && 'on')} /><div className="lt"><b style={{ fontSize: 15 }}>{x.name}</b><span>{x.desc}</span></div></button>)}</div>
      {tpl === 'sentence' && <div className="pad" style={{ marginTop: 10 }}><div className="fld"><input value={text} onChange={e => setText(e.target.value)} /></div><p className="note" style={{ marginTop: 6 }}>每个文件都照这句话做；只能用不需要你盯着的工具。</p></div>}
      <div className="st"><b>文件</b><span>{n} 个</span></div>
      <button className="li" style={{ minHeight: 52 }} onClick={() => ph.toast('打开文件选择器')}><Icon n="file" s={20} /><div className="lt"><b>访谈素材 01–{n}.m4a</b><span>点这里换文件</span></div></button>
      <button className="li" style={{ minHeight: 52 }} onClick={() => ph.toast('打开文件夹选择器')}><Icon n="folder" s={20} /><div className="lt"><b>存到 音乐／声剪批量</b><span>输出文件夹，下次还用它</span></div></button>
      {over && <div className="gate" style={{ marginTop: 12 }}><b>免费版一次最多处理 10 个</b><p>这次有 {n} 个。可以先做前 10 个，或者开通会员，不限数量。</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><Btn sm k="pri" onClick={() => ph.nav.push('member', { from: 'batch' })}>看看会员</Btn><Btn sm line onClick={() => { setStage('run'); setDone(0); }}>先做前 10 个</Btn></div></div>}
      <div style={{ height: 16 }} /></div>
      {!over && <div className="dock" style={{ padding: 12 }}><Btn k="pri" full onClick={() => { setStage('run'); setDone(0); }}>开始处理 {n} 个</Btn></div>}</Fragment>}
    {(stage === 'run' || stage === 'report') && <div className="body">
      <div style={{ display: 'flex', gap: 3, padding: '10px 16px', height: 240, alignItems: 'stretch' }}>
        {Array.from({ length: Math.min(n, 24) }, (_, i) => <div key={i} style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <Mini S={envFor(['meeting', 'grad', 'lesson', 'promo'][i % 4])} w={12} h={220} half={6} to={60} alpha={i < done ? 0.95 : 0.25} color={i === done && stage === 'run' ? COL.warm : COL.glow} />
          {i === 4 && i < done && <span style={{ position: 'absolute', bottom: -18, fontSize: 12, color: 'var(--warm)' }}>!</span>}</div>)}
      </div>
      <div className="pad" style={{ marginTop: 18 }}>
        <div className="num" style={{ fontSize: 30, fontWeight: 600 }}>{done} / {n}</div>
        <p className="t2" style={{ fontSize: 14.5, marginTop: 2 }}>{stage === 'report' ? '做完了。1 个没成功，3 个导出时用了限幅' : paused ? '暂停了' : '第 ' + (done + 1) + ' 个　访谈素材 ' + String(done + 1).padStart(2, '0') + '.m4a　编码中'}</p>
        <p className="note" style={{ marginTop: 6 }}>可以离开这一页、锁屏，处理在后台继续，通知栏里看进度。</p>
        {stage === 'run' ? <div style={{ display: 'flex', gap: 10, marginTop: 16 }}><Btn line onClick={() => setPaused(x => !x)} icon={paused ? 'play' : 'pause'}>{paused ? '继续' : '暂停'}</Btn><Btn line onClick={() => ph.openShade()}>看通知栏</Btn></div>
          : <Fragment><div className="card" style={{ marginTop: 14, padding: '4px 14px' }}>
            {[['访谈素材 05.m4a', '没成功：文件损坏，读不出来', true], ['访谈素材 09.m4a', '成功，有爆音，已限幅'], ['访谈素材 14.m4a', '成功，有爆音，已限幅'], ['其余 ' + (n - 4) + ' 个', '成功']].map(([a, b, bad]) => <div key={a} className="kv" style={{ borderTop: '1px solid var(--line)' }}><span style={{ color: 'var(--t1)', fontSize: 14 }}>{a}</span><span style={{ color: bad ? 'var(--red)' : 'var(--t3)', fontSize: 13 }}>{b}</span></div>)}
          </div><div style={{ display: 'flex', gap: 10, marginTop: 14 }}><Btn line onClick={() => ph.toast('报告存成了 CSV：批量报告-1123.csv（含是否爆音）')}>存报告 CSV</Btn><Btn k="pri" onClick={() => ph.nav.pop()}>完成</Btn></div></Fragment>}
      </div></div>}
  </div>;
}
SCREENS.batch = BatchScreen;

/* ----- 我的: account, membership entry, settings ----- */
function MeScreen({ ph, dir }) {
  const [theme, setTheme] = useState(2), [lang, setLang] = useState(0), [remind, setRemind] = useState(true), [ai, setAi] = useState(true);
  const [page, setPage] = useState(null);
  return <div className={cx('scr', dir)}>
    <Hdr title="我的" onBack={ph.nav.pop} />
    <div className="body">
      <button className="li" style={{ minHeight: 76 }} onClick={() => (ph.user ? ph.toast('已登录：' + ph.user) : ph.openSheet('login'))}>
        <span style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--s2)', display: 'grid', placeItems: 'center' }}><Icon n="user" /></span>
        <div className="lt"><b style={{ fontSize: 17 }}>{ph.user || '没登录'}</b><span>{ph.user ? '登录只用于身份和会员' : '剪辑不用登录；买会员、换手机恢复时才要'}</span></div>{!ph.user && <span className="btn sm">登录</span>}</button>
      <button className="li" style={{ margin: '4px 12px', width: 'auto', borderRadius: 18, background: 'var(--vip-bg)' }} onClick={() => ph.nav.push('member')}>
        <Vip /><div className="lt"><b style={{ color: 'var(--vip)' }}>{ph.member ? '年度会员（试用中）' : '会员：真人感音色、克隆、VIP 音乐'}</b><span>{ph.member ? '到 11月30日，可随时在 Google Play 取消' : '本机剪辑一直免费、没有水印'}</span></div><Icon n="chevR" s={18} /></button>
      <div className="st"><b>设置</b></div>
      <div className="pad"><div className="kv">外观</div><Seg value={theme} options={['浅色', '深色', '跟随系统']} onChange={setTheme} />
        <div className="kv" style={{ marginTop: 6 }}>语言</div><Seg value={lang} options={['跟随系统', 'English', '简体中文']} onChange={setLang} /></div>
      <div className="li"><div className="lt"><b>提醒没保存的导出</b><span>导出完还没选位置保存时，通知你一下</span></div><Switch on={remind} onChange={setRemind} /></div>
      <div className="li"><div className="lt"><b>AI 帮忙理解一句话</b><span>只发文字、不发音频；关掉后只用本机理解</span></div><Switch on={ai} onChange={setAi} /></div>
      <div className="st"><b>帮助</b></div>
      {[['你的数据在哪里、卸载时会怎样', 'data'], ['使用指南', 'guide'], ['常见问题', 'faq'], ['联系支持', 'support'], ['第三方许可', 'lic']].map(([t, k]) => <button key={k} className="li" style={{ minHeight: 52 }} onClick={() => setPage(k)}><div className="lt"><b>{t}</b></div><Icon n="chevR" s={18} /></button>)}
      <p className="note pad" style={{ padding: '16px 16px 28px' }}>声剪 3.0（设计稿）</p>
    </div>
    {page && <Sheet title={{ data: '你的数据在哪里', guide: '使用指南', faq: '常见问题', support: '联系支持', lic: '第三方许可' }[page]} onClose={() => setPage(null)}>
      <div className="pad" style={{ fontSize: 15, lineHeight: 1.75 }}>{{
        data: <Fragment><p>音频、版本和编辑记录都在这台手机里（应用专属目录），不上传。</p><p style={{ marginTop: 10 }}>卸载声剪会把它们一起删掉。想留着：先导出成文件，或者在音频库里「导出工程包」。</p><p className="note" style={{ marginTop: 10 }}>用到联网功能时只发必要的东西：在线音色发文字，克隆发你那 5 秒录音，AI 理解只发那句话。</p></Fragment>,
        guide: <Fragment><p><b>往下滚是时间。</b>一句话是一颗胶囊，胶囊之间的空档是停顿。</p><p style={{ marginTop: 8 }}><b>横着划掉</b>一处停顿或一句话；<b>在左边刻度上拖</b>选一段；<b>两指捏合</b>缩放。</p><p style={{ marginTop: 8 }}>底下说一句，比如「剪掉开头3秒，删掉长停顿」，先看计划再改。</p></Fragment>,
        faq: <Fragment><p><b>会改坏原文件吗？</b>不会。剪辑可以撤销，处理会存成新版本。</p><p style={{ marginTop: 8 }}><b>导出有水印吗？</b>没有，所有格式都没有。</p><p style={{ marginTop: 8 }}><b>音频转文字呢？</b>还没开放，开放后每颗胶囊旁边会出现那句话的文字。</p></Fragment>,
        support: <Fragment><p>写信给我们，附上出问题的那一步。不会要你的音频，除非你自己发来。</p><Btn full style={{ marginTop: 12 }} icon="mail" onClick={() => ph.toast('打开邮件 App')}>写邮件</Btn></Fragment>,
        lic: <Fragment><p>LAME 3.100（MP3 编码，LGPL）</p><p>Noto Sans / Serif CJK（SIL OFL）</p><p>React（MIT）</p></Fragment>,
      }[page]}<div style={{ height: 10 }} /></div></Sheet>}
  </div>;
}
SCREENS.me = MeScreen;

/* ----- phone-level sheets: login, member gate, save location, share, jump to another phone ----- */
function LoginSheet({ ph, p, onClose }) {
  const [mode, setMode] = useState('pick'), [mail, setMail] = useState('lin@example.com'), [code, setCode] = useState('');
  const done = who => { ph.setUser(who); onClose(); ph.toast('登录好了'); if (p.then) setTimeout(p.then, 300); };
  return <Sheet title="登录声剪" onClose={onClose}>
    <div className="pad">
      {mode === 'pick' && <Fragment>
        <button className="btn full" style={{ background: '#fff', color: '#1f1f1f', gap: 10 }} onClick={() => done('lin.chen@example.com')}><img src={GOOGLE_G} width="20" height="20" alt="" />用 Google 账号登录</button>
        <Btn full line style={{ marginTop: 10 }} icon="mail" onClick={() => setMode('mail')}>用邮箱验证码</Btn></Fragment>}
      {mode === 'mail' && <Fragment><div className="fld"><label>邮箱</label><input value={mail} onChange={e => setMail(e.target.value)} /></div>
        <div className="fld" style={{ marginTop: 8 }}><label>验证码</label><input value={code} onChange={e => setCode(e.target.value)} placeholder="6 位数字" /><button className="t2" style={{ fontSize: 14 }} onClick={() => ph.toast('验证码发到 ' + mail + ' 了')}>发验证码</button></div>
        <Btn k="pri" full style={{ marginTop: 12 }} onClick={() => done(mail)}>登录</Btn></Fragment>}
      <p className="note" style={{ marginTop: 14, display: 'flex', gap: 8 }}><Icon n="info" s={18} />{SJ.MEMBERSHIP.privacy}。剪辑、处理、导出都不用登录。</p>
    </div>
  </Sheet>;
}
function GateSheet({ ph, p, onClose }) {
  const what = { ai: ['AI 帮你听懂口语', '「前面那段咳嗽不要了」这种说法，本机听不懂；会员可以请 AI 把它改写成本机能照着做的步骤。只发文字，不发音频。'], voice: ['真人感音色是会员的', '6 位真人感音色，每月 20 万字；可以先免费试听每一位。本机音色一直免费。'], clone: ['克隆你的声音要会员', '检查和录音都在本机完成；保存成可以用的音色需要会员。'], music: ['这首是 VIP 曲目', '可以完整试听；开通会员后才能导入和用作背景音乐。'] }[p.what || 'voice'];
  return <Sheet title={null} onClose={onClose}>
    <div className="pad" style={{ paddingTop: 10 }}><Vip /><p style={{ fontSize: 20, fontWeight: 600, marginTop: 10 }}>{what[0]}</p><p className="t2" style={{ fontSize: 14.5, lineHeight: 1.65, marginTop: 6 }}>{what[1]}</p>
      <Btn k="pri" full style={{ marginTop: 16 }} onClick={() => { onClose(); ph.nav.push('member', { from: p.what }); }}>看看会员，7 天免费试用</Btn>
      <Btn full line style={{ marginTop: 8 }} onClick={onClose}>先不用</Btn></div>
  </Sheet>;
}
function SafSheet({ ph, p, onClose }) {
  const [dirx, setDir] = useState('下载');
  return <Sheet title="保存到…（系统文件选择器）" onClose={onClose}>
    {['下载', '音乐', '铃声', '声剪导出'].map(d => <button key={d} className="li" style={{ minHeight: 52 }} onClick={() => setDir(d)}><Icon n="folder" s={20} /><div className="lt"><b>{d}</b></div><span className={cx('radio', dirx === d && 'on')} /></button>)}
    <div className="pad" style={{ marginTop: 8 }}><div className="fld"><input defaultValue={p.name} /></div><Btn k="pri" full style={{ marginTop: 10 }} onClick={() => { onClose(); ph.toast('存好了：' + dirx + '／' + p.name); p.then && p.then(dirx); }}>保存</Btn></div>
  </Sheet>;
}
function ShareSheet({ ph, p, onClose }) {
  return <Sheet title={null} onClose={onClose}>
    <div className="pad" style={{ paddingTop: 6 }}><p className="note">系统分享面板</p><b style={{ display: 'block', fontSize: 16, marginTop: 4 }}>{p.name}</b>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginTop: 16 }}>{['微信', 'QQ', '邮件', '信息', '蓝牙', '云盘', '附近分享', '复制到…'].map(a => <button key={a} onClick={() => { onClose(); ph.toast('交给「' + a + '」了'); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--t2)' }}><span style={{ width: 50, height: 50, borderRadius: 16, background: 'var(--s2)', display: 'grid', placeItems: 'center', fontSize: 16, color: 'var(--t1)' }}>{a[0]}</span>{a}</button>)}</div>
      <p className="note" style={{ marginTop: 14 }}>示意：真机上是系统自己的面板，图标由各 App 提供。</p></div>
  </Sheet>;
}
function CrossSheet({ ph, p, onClose }) {
  return <Sheet title={null} onClose={onClose}>
    <div className="pad" style={{ paddingTop: 8 }}><p style={{ fontSize: 17, fontWeight: 600 }}>{p.label}</p><p className="t2" style={{ fontSize: 14, marginTop: 4 }}>展示板上每台手机各管一段；点下面会让那台手机打开这一屏。</p>
      <Btn k="pri" full style={{ marginTop: 14 }} onClick={() => { onClose(); gotoPhone(p.phone, p.path); }}>去那台手机看</Btn></div>
  </Sheet>;
}
Object.assign(SHEETS, { login: LoginSheet, gate: GateSheet, saf: SafSheet, share: ShareSheet, cross: CrossSheet });
function gotoPhone(id, path) {
  const r = REG[id]; if (!r) return;
  r.go(path);
  const slot = document.querySelector('[data-slot="' + id + '"]');
  if (slot) { const top = slot.getBoundingClientRect().top + window.scrollY - 70; window.scrollTo({ top, behavior: 'smooth' }); slot.classList.remove('flash'); void slot.offsetWidth; slot.classList.add('flash'); }
}
