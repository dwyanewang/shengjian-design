/* ===================== 20 · 首页（做 / 库 / 我）、登录、会员 ===================== */
// 方向 2 自己补的演示内容（不和 SJ 矛盾）：音频库每条的来源字、一条「用备份恢复」的状态
const LIB_CH = { interview: '录', wanfeng: '开', meeting: '录', dance: '串', promo: '配', grad: '提', annual: '循', lesson: '开' };
const LIB = SJ.LIBRARY.map(x => ({ ...x, ch: LIB_CH[x.id] }));
Object.assign(LIB.find(x => x.id === 'lesson'), { status: 'restored', statusText: '上次没存完，已用备份恢复' });
const SIZE_MB = { interview: 112, wanfeng: 9, meeting: 271, dance: 63, promo: 3, grad: 22, annual: 6, lesson: 145 };

// 汉字墙：每个字 = 一件事 = 一个入口 = 一个流程的身份
const WALL = [
  { ch: '铃', cap: '做铃声', go: { name: 'ling' }, area: '1 / 1 / 3 / 3', kind: 'hero' },
  { ch: '配', cap: '文字配音', sub: '听一句', go: { name: 'pei' }, area: '1 / 3 / 2 / 5', kind: 'wide', demo: { key: 'demo-pei', dur: 9.4 } },
  { ch: '净', cap: '录音变干净', sub: '听前后', go: { name: 'jing' }, area: '2 / 3 / 3 / 5', kind: 'wide', demo: { key: 'demo-jing', dur: 8 } },
  { ch: '剪', cap: '自己动手剪', sub: '波形和工具', go: { name: 'edit' }, area: '3 / 1 / 4 / 3', kind: 'wide2' },
  { ch: '录', cap: '录音', go: { name: 'record' } },
  { ch: '提', cap: '视频的声音', go: { name: 'video' } },
  { ch: '开', cap: '打开文件', go: { name: 'files' } },
  { ch: '串', cap: '串烧', go: { name: 'tool', id: 'medley', entry: 'wall' } },
  { ch: '伴', cap: '伴奏', go: { name: 'tool', id: 'separate', entry: 'wall' } },
  { ch: '混', cap: '配背景乐', go: { name: 'tool', id: 'bgm', entry: 'wall' } },
  { ch: '变', cap: '变声变速', go: { name: 'tool', id: 'voice', entry: 'wall' } },
  { ch: '乐', cap: '音乐库', go: { name: 'music' } },
  { ch: '字', cap: '字幕配音', go: { name: 'subtitle' } },
  { ch: '克', cap: '克隆声音', go: { name: 'clone' } },
  { ch: '转', cap: '转格式', go: { name: 'batch' } },
  { ch: '循', cap: '一分钟循环', go: { name: 'tool', id: 'loop', entry: 'wall' } },
  { ch: '＋', cap: '更多来源', sub: '空白、示例…', sheet: 'more', area: '6 / 3 / 7 / 5', kind: 'more' },
];

function WallTile({ t, nav }) {
  const P = nav.player;
  const open = () => t.sheet ? nav.setSheet(t.sheet) : nav.push(t.go);
  if (t.kind === 'hero') {
    const on = P.on('demo-ling');
    return <button className="wt-hero" style={{ gridArea: t.area }} onClick={open}>
      <span className="wt-hero-f"><span className="wt-hero-ch">铃</span></span>
      <span className="wt-hero-b"><b>做铃声</b>
        <span className="wt-hero-demo" onClick={e => { e.stopPropagation(); P.toggle('demo-ling', 30, SJ.CHORUS[0].from); }}><Ic n={on ? 'stop' : 'play'} s={14} />{on ? '在放' : '先听'}</span>
        {on && <span className="wt-hero-prog" style={{ width: (P.frac() * 100) + '%' }} />}
      </span>
    </button>;
  }
  if (t.kind === 'wide' || t.kind === 'wide2' || t.kind === 'more') {
    const on = t.demo && P.on(t.demo.key);
    const tone = t.kind === 'wide2' ? 'ink' : t.kind === 'more' ? 'plain' : 'tint';
    return <button className={'wt-wide ' + tone} style={{ gridArea: t.area }} onClick={open}>
      <span className="wt-wide-ch">{t.ch}</span>
      <span className="wt-wide-tx"><b>{t.cap}</b>
        {t.demo ? <span className="wt-wide-demo" onClick={e => { e.stopPropagation(); P.toggle(t.demo.key, t.demo.dur); }}><Ic n={on ? 'stop' : 'play'} s={13} />{on ? '在放…' : t.sub}</span> : <span className="wt-wide-sub">{t.sub}</span>}
      </span>
      {on && <span className="wt-hero-prog" style={{ width: (P.frac() * 100) + '%', background: BLUE }} />}
    </button>;
  }
  return <button className="wt" onClick={open}><span className="wt-ch">{t.ch}</span><span className="wt-cap">{t.cap}</span></button>;
}

function StatusChip({ it, nav }) {
  if (it.status === 'saving') return <span className="tag b" onClick={e => { e.stopPropagation(); nav.push({ name: 'export', step: 'ready', purpose: 'sound', item: it.id }); }}>{it.statusText}</span>;
  if (it.status === 'exporting') return <span className="lib-exp"><span className="pk" style={{ color: BLUE }}>正在导出 64%</span><span className="bar-prog" style={{ width: 92, display: 'block', marginTop: 4 }}><i style={{ width: '64%' }} /></span></span>;
  if (it.status === 'restored') return <span className="tag o">已用备份恢复</span>;
  return null;
}

function LibRow({ it, nav, sel, onSel }) {
  return <div className={'prow' + (sel ? ' on' : '')} onClick={() => onSel ? onSel() : nav.setSheet({ type: 'item', id: it.id })}>
    {onSel ? <Check on={sel} /> : null}
    <Han ch={it.ch} s={44} tone={it.status === 'saving' || it.status === 'exporting' ? 'blue' : 'tint'} fs={24} />
    <div className="mid">
      <div className="pt3 ell" style={{ fontSize: 16 }}>{it.title}</div>
      <div className="psub ell num">{it.date}　{fmt(it.seconds)}{it.versions > 1 ? '　' + it.versions + ' 个版本' : ''}</div>
      {it.status && <div style={{ marginTop: 6 }}><StatusChip it={it} nav={nav} /></div>}
    </div>
  </div>;
}

function HomeDo({ nav }) {
  return <div className="ps">
    <div className="home-h">
      <Logo s={34} /><span className="home-wm">声剪</span><span className="grow" />
      <button className="home-mem" onClick={() => nav.push({ name: 'member' })}>会员</button>
    </div>
    <div className="pad" style={{ padding: '6px 16px 14px' }}><div className="pt0">今天想做什么？</div></div>
    <div className="wall">{WALL.map(t => <WallTile key={t.ch} t={t} nav={nav} />)}</div>
    <div className="sect" style={{ paddingTop: 26 }}><b>接着做</b><span className="grow" style={{ flex: 1 }} /><button className="plink" style={{ padding: 0 }} onClick={() => nav.setTab('lib')}>看全部 8 个</button></div>
    {LIB.slice(0, 2).map(it => <LibRow key={it.id} it={it} nav={nav} />)}
    <div style={{ height: 24 }} />
  </div>;
}

const FILTERS = [
  { v: 'all', l: '全部', f: () => true }, { v: 'rec', l: '录音', f: x => x.from === '录音' }, { v: 'imp', l: '导入', f: x => /文件|视频/.test(x.from) },
  { v: 'mix', l: '混音', f: x => x.kind === 'mix' }, { v: 'ver', l: '多版本', f: x => x.versions > 1 }, { v: 'save', l: '待保存', f: x => x.status === 'saving' },
];
function HomeLib({ nav }) {
  const [q, setQ] = useState(''), [flt, setFlt] = useState('all'), [sel, setSel] = useState(nav.route.select ? ['interview', 'meeting'] : null);
  const list = LIB.filter(FILTERS.find(f => f.v === flt).f).filter(x => !q || x.title.includes(q));
  return <Fragment>
    <div className="ps">
      <div className="pbar" style={{ padding: '8px 12px 0 16px', height: 60 }}>
        <div className="pt1 grow">音频库</div>
        <button className="chip" onClick={() => setSel(sel ? null : [])}>{sel ? '完成' : '选择'}</button>
      </div>
      <div className="pad" style={{ paddingTop: 8 }}><div className="lib-search"><Ic n="search" s={20} c="#4B4F5E" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="搜标题" /></div></div>
      <div className="chips" style={{ padding: '12px 16px 6px' }}>{FILTERS.map(f => <button key={f.v} className={'chip' + (flt === f.v ? ' on' : '')} onClick={() => setFlt(f.v)}>{f.l} <span style={{ opacity: .6 }} className="num">{LIB.filter(f.f).length}</span></button>)}</div>
      {list.map(it => <LibRow key={it.id} it={it} nav={nav} sel={sel && sel.includes(it.id)} onSel={sel ? () => setSel(sel.includes(it.id) ? sel.filter(x => x !== it.id) : [...sel, it.id]) : null} />)}
      {!list.length && <div className="pad psub" style={{ padding: 32, textAlign: 'center' }}>没有找到「{q}」</div>}
      <div className="pad psm" style={{ padding: '18px 16px 28px' }}>音频都存在这台手机里，共占用 631 MB。</div>
    </div>
    {sel && sel.length > 0 && <div className="lib-act">
      <div className="pk" style={{ color: '#fff' }}>已选 {sel.length} 个</div>
      <div className="lib-act-b">
        <button onClick={() => nav.push({ name: 'batch', step: 'files', tpl: 'sentence' })}><Han ch="说" s={30} tone="white" fs={18} />说一句</button>
        <button onClick={() => nav.push({ name: 'batch', step: 'tpl' })}><Han ch="处" s={30} tone="white" fs={18} />用工具</button>
        <button onClick={() => nav.push({ name: 'batch', step: 'files', tpl: 'convert' })}><Han ch="出" s={30} tone="white" fs={18} />导出</button>
      </div>
    </div>}
  </Fragment>;
}

function ItemSheet({ id, nav }) {
  const it = LIB.find(x => x.id === id);
  const act = (ch, l, sub, fn) => <button className="prow" onClick={fn}><Han ch={ch} s={40} tone="tint" fs={22} /><div className="mid"><div className="pt3">{l}</div>{sub && <div className="psub">{sub}</div>}</div><Ic n="right" s={18} c="#999" /></button>;
  return <Sheet title={it.title} sub={<span className="num">{fmt(it.seconds)}　{it.from}　占用 {SIZE_MB[it.id]} MB</span>} onClose={() => nav.setSheet(null)}>
    {it.status === 'restored' && <div className="pad" style={{ paddingBottom: 10 }}><div className="infobox">上次编辑时手机没电了。已经用自动备份恢复到最后一步，没有丢东西。</div></div>}
    {act('剪', '打开来剪', '波形、一句话、手动工具', () => nav.push({ name: 'edit', item: id }))}
    {act('说', '对它说一句', '比如「剪掉开头3秒」', () => nav.push({ name: 'edit', item: id, panel: 'say' }))}
    {act('版', '版本', it.versions + ' 个，原来的都还在', () => nav.setSheet({ type: 'versions', id }))}
    {act('出', '导出', '存成文件、设成铃声、发给别人', () => nav.push({ name: 'export', item: id }))}
    {act('改', '改名', null, () => nav.setSheet({ type: 'rename', id }))}
    {act('包', '导出工程包', '换手机时带走，含全部版本', () => { nav.setSheet(null); nav.toast('工程包已生成，选个位置保存'); })}
    <button className="prow" onClick={() => { nav.setSheet(null); nav.toast('已删除「' + it.title + '」', '撤销'); }}><Han ch="删" s={40} tone="line" fs={22} /><div className="mid"><div className="pt3">删除</div><div className="psub">连同 {it.versions} 个版本</div></div></button>
  </Sheet>;
}

function VersionsSheet({ id, nav }) {
  const it = LIB.find(x => x.id === id); const names = it.versionNames || ['原始'];
  const [cur, setCur] = useState(names.length - 1); const P = nav.player;
  return <Sheet title="版本" sub="每次处理都存成新版本，原来的不会变" han={<Han ch="版" s={40} tone="blue" fs={22} />} onClose={() => nav.setSheet(null)}>
    {names.map((n, i) => <div key={i} className={'prow' + (cur === i ? ' on' : '')}>
      <PlayBtn s={40} tone={P.on('v' + i) ? 'blue' : 'tint'} on={P.on('v' + i)} onClick={() => P.toggle('v' + i, 12)} />
      <div className="mid"><div className="pt3">{i + 1}　{n}</div><div className="psub num">{i === 0 ? '原始，永远保留' : '由「' + names[i - 1] + '」处理而来'}</div></div>
      {cur === i ? <span className="tag b">在用</span> : <button className="chip" onClick={() => { setCur(i); nav.toast('已切到「' + n + '」'); }}>用这个</button>}
    </div>)}
    <div className="pad psub" style={{ paddingTop: 12 }}>长按一个版本可以删除；原始版本不能删。</div>
  </Sheet>;
}

function MoreSheet({ nav, which }) {
  const [sec, setSec] = useState('3');
  if (which === 'blank') return <Sheet title="一段空白" sub="0.05 到 600 秒，之后可以往里插声音" han={<Han ch="空" s={40} tone="tint" fs={22} />} onClose={() => nav.setSheet(null)}
    foot={<button className="pbtn" onClick={() => { nav.setSheet(null); nav.push({ name: 'edit', item: 'blank' }); }}>做一段 {sec} 秒的空白</button>}>
    <div className="pad"><div className="blank-in"><input className="num" value={sec} onChange={e => setSec(e.target.value.replace(/[^\d.]/g, ''))} /><span>秒</span></div>
      <div className="chips" style={{ padding: '12px 0 0' }}>{['1', '3', '10', '60'].map(v => <button key={v} className={'chip' + (sec === v ? ' on' : '')} onClick={() => setSec(v)}>{v} 秒</button>)}</div></div>
  </Sheet>;
  if (which === 'sample') return <Sheet title="示例音频" sub="随手试试，不用找文件" han={<Han ch="例" s={40} tone="tint" fs={22} />} onClose={() => nav.setSheet(null)}>
    {[['一段访谈（有停顿、有底噪）', '2:10', 'speech'], ['一首钢琴曲（有副歌）', '3:52', 'music']].map(([t, d, k]) => <button key={t} className="prow" onClick={() => { nav.setSheet(null); nav.push({ name: 'edit', item: k === 'speech' ? 'interview' : 'wanfeng' }); }}>
      <div style={{ width: 64 }}><Wave env={k === 'speech' ? ENV.speech : ENV.music} rate={k === 'speech' ? 50 : 20} h={36} bar={1} gap={1} /></div>
      <div className="mid"><div className="pt3">{t}</div><div className="psub num">{d}</div></div><Ic n="right" s={18} c="#999" /></button>)}
  </Sheet>;
  if (which === 'pkg') return <Sheet title="导入工程包" sub="换手机时，把旧手机导出的 .sjpkg 文件导进来" han={<Han ch="包" s={40} tone="tint" fs={22} />} onClose={() => nav.setSheet(null)}
    foot={<button className="pbtn" onClick={() => { nav.setSheet(null); nav.toast('已导入「播客第 11 期」，3 个版本都在'); }}>选工程包文件</button>}>
    <div className="pad pbody">工程包里有这段声音的全部版本、标记和配乐设置。导进来以后和在旧手机上一样，可以接着改。</div>
  </Sheet>;
  if (which === 'share') return <Sheet title="从别的 App 分享进来" han={<Han ch="享" s={40} tone="tint" fs={22} />} onClose={() => nav.setSheet(null)}>
    <div className="pad pbody">在微信、文件管理、录音机里选中声音或视频，点「分享」，再点「声剪」。<br />一个文件：直接打开来剪。<br />几个文件：按你选的顺序拼成一段。</div>
    <div className="pad"><div className="sharemock"><div className="psm">系统分享面板（由手机列出）</div><div className="sharemock-g">{['声剪', '信息', '邮件', '蓝牙', '文件'].map((n, i) => <span key={n}>{i === 0 ? <Logo s={44} /> : <i />}<em>{n}</em></span>)}</div></div></div>
  </Sheet>;
  return <Sheet title="更多来源" han={<Han ch="＋" s={40} tone="tint" fs={22} />} onClose={() => nav.setSheet(null)}>
    {[['空', '一段空白', '0.05–600 秒', 'blank'], ['例', '示例音频', '一段访谈、一首钢琴曲', 'sample'], ['包', '导入工程包', '换手机时用', 'pkg'], ['享', '从别的 App 分享进来', '一个直接打开，多个拼成一段', 'share']].map(([c, l, s, k]) =>
      <button key={k} className="prow" onClick={() => nav.setSheet(k)}><Han ch={c} s={40} tone="tint" fs={22} /><div className="mid"><div className="pt3">{l}</div><div className="psub">{s}</div></div><Ic n="right" s={18} c="#999" /></button>)}
  </Sheet>;
}

const SET_INFO = {
  data: ['你的数据在哪里', '你的音频、版本、配方都只存在这台手机里，声剪没有云端相册。\n\n会联网的只有：在线音色（只发你要读的文字）、克隆声音（发你同意上传的 5 秒参考录音）、音乐库（下载曲子）、AI 帮忙理解一句话（只发文字，不发声音）、登录和会员。\n\n卸载声剪会删掉手机里的这些音频。换手机前请导出工程包。'],
  guide: ['使用指南', '点首页的一个字，就从那件事开始，每一屏只做一步。\n\n想自己动手就点「剪」：拖出选区，下面的工具跟着选区变；或者直接说一句，比如「剪掉开头3秒，结尾淡出2秒」。\n\n所有处理都存成新版本，原来的永远还在。'],
  faq: ['常见问题', '导出的文件有水印吗？没有，所有格式都没有。\n\n为什么设铃声要我允许「修改系统设置」？这是安卓的规定，只用于把铃声写进系统。\n\n没网能用吗？剪辑、处理、录音、导出、手机自带的朗读都不需要网。'],
  support: ['联系支持', '在这里写下遇到的问题，我们会回到你登录用的邮箱。\n\n可以附上出问题的那段音频的工程包，但只有你点「附上」时才会发送。'],
  licence: ['第三方许可', 'LAME（MP3 编码）LGPL 2.0\nAndroid Jetpack Apache 2.0\nNoto Sans SC OFL 1.1\n\n音乐库里每首曲子的授权写在它自己的详情里。'],
};
function HomeMe({ nav }) {
  const S = nav.state, set = nav.set;
  const row = (ch, l, sub, fn, right) => <div className="prow" role="button" onClick={fn}><Han ch={ch} s={36} tone="tint" fs={20} /><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>{l}</div>{sub && <div className="psub">{sub}</div>}</div>{right || <Ic n="right" s={18} c="#999" />}</div>;
  return <div className="ps">
    <div className="pbar" style={{ padding: '8px 16px 0', height: 60 }}><div className="pt1 grow">我的</div></div>
    <div className="pad">
      {S.loggedIn ? <div className="me-acc"><Han ch="我" s={52} tone="blue" fs={28} /><div className="mid"><div className="pt3">已登录</div><div className="psub">Google 账号　只用于身份和会员</div></div><button className="chip" onClick={() => { set({ loggedIn: false }); nav.toast('已退出登录'); }}>退出</button></div>
        : <button className="me-acc" onClick={() => nav.push({ name: 'login' })}><Han ch="我" s={52} tone="tint" fs={28} /><div className="mid"><div className="pt3">还没登录</div><div className="psub">不登录也能剪、处理、导出</div></div><span className="chip b">登录</span></button>}
      <button className="me-mem" onClick={() => nav.push({ name: 'member' })}>
        <Han ch="会" s={44} tone="white" fs={26} style={{ color: '#000' }} />
        <div className="mid"><b>{S.member ? '会员 · 试用中，还剩 7 天' : '会员'}</b><span>在线真人感音色、克隆、VIP 音乐、AI 听懂口语</span></div>
        <Ic n="right" s={18} c="#fff" />
      </button>
    </div>
    <div className="sect"><b>我的</b></div>
    {row('声', '我的音色', '1 个克隆的声音', () => nav.push({ name: 'clone', step: 'mine' }))}
    {row('方', '我的配方', SJ.SENTENCE.recipes.length + ' 句常用的话', () => nav.setSheet('recipes'))}
    {row('转', '批量处理', '一批文件，一起转格式或清理', () => nav.push({ name: 'batch' }))}
    <div className="sect"><b>设置</b></div>
    <div className="pad" style={{ paddingBottom: 6 }}><div className="pk" style={{ marginBottom: 8 }}>外观</div><Seg opts={['浅色', '深色', '跟随系统']} value={S.theme} onChange={v => set({ theme: v })} /></div>
    <div className="pad" style={{ padding: '12px 16px 6px' }}><div className="pk" style={{ marginBottom: 8 }}>语言</div><Seg opts={['跟随系统', 'English', '简体中文']} value={S.lang} onChange={v => set({ lang: v })} /></div>
    {row('提', '提醒没保存的导出', '生成好但还没存的，隔天提醒一次', () => set({ remind: !S.remind }), <Tog on={S.remind} onChange={v => set({ remind: v })} />)}
    {row('说', 'AI 帮忙理解一句话', '读不懂口语时，只把文字发给 AI', () => set({ ai: !S.ai }), <Tog on={S.ai} onChange={v => set({ ai: v })} />)}
    {row('存', '你的数据在哪里', '卸载时会怎样', () => nav.push({ name: 'info', id: 'data' }))}
    {row('用', '使用指南', null, () => nav.push({ name: 'info', id: 'guide' }))}
    {row('问', '常见问题', null, () => nav.push({ name: 'info', id: 'faq' }))}
    {row('联', '联系支持', null, () => nav.push({ name: 'info', id: 'support' }))}
    {row('许', '第三方许可', null, () => nav.push({ name: 'info', id: 'licence' }))}
    <div className="pad psm" style={{ padding: '18px 16px 30px' }}>声剪 2.0　剪辑和处理都在这台手机上完成</div>
  </div>;
}

function InfoPage({ nav }) {
  const [t, body] = SET_INFO[nav.route.id] || SET_INFO.data;
  return <div className="pr">
    <div className="pbar"><button className="pib" onClick={nav.back}><Ic n="back" /></button><div className="pt2 grow">{t}</div></div>
    <div className="ps pad"><div className="pbody" style={{ whiteSpace: 'pre-line', padding: '8px 0 30px' }}>{body}</div>
      {nav.route.id === 'support' && <textarea className="field" rows={4} placeholder="遇到了什么问题？" />}</div>
  </div>;
}

function Home({ nav }) {
  useTone('dark');
  const tab = nav.route.tab || 'do';
  const sh = nav.sheet;
  return <div className="pr">
    {tab === 'do' && <HomeDo nav={nav} />}
    {tab === 'lib' && <HomeLib nav={nav} key={nav.route.select ? 's' : 'n'} />}
    {tab === 'me' && <HomeMe nav={nav} />}
    <nav className="tabs">
      {[['do', '做', '今天做什么'], ['lib', '库', '音频库'], ['me', '我', '我的']].map(([k, c, l]) =>
        <button key={k} className={tab === k ? 'on' : ''} onClick={() => nav.setTab(k)}><span className="tabs-ch">{c}</span><span className="tabs-l">{l}</span></button>)}
    </nav>
    {sh && sh.type === 'item' && <ItemSheet id={sh.id} nav={nav} />}
    {sh && sh.type === 'versions' && <VersionsSheet id={sh.id} nav={nav} />}
    {sh && sh.type === 'rename' && <Sheet title="改名" onClose={() => nav.setSheet(null)} foot={<button className="pbtn" onClick={() => { nav.setSheet(null); nav.toast('已改名'); }}>好</button>}><div className="pad"><input className="field" defaultValue={LIB.find(x => x.id === sh.id).title} /></div></Sheet>}
    {['more', 'blank', 'sample', 'pkg', 'share'].includes(sh) && <MoreSheet nav={nav} which={sh} />}
    {sh === 'recipes' && <Sheet title="我的配方" sub="常说的话存下来，下次点一下就行" han={<Han ch="方" s={40} tone="blue" fs={22} />} onClose={() => nav.setSheet(null)}>
      {SJ.SENTENCE.recipes.map(r => { const [n, s] = r.split('：'); return <button key={r} className="prow" onClick={() => { nav.setSheet(null); nav.push({ name: 'edit', panel: 'say', text: s }); }}><div className="mid"><div className="pt3">{n}</div><div className="psub">「{s}」</div></div><Ic n="right" s={18} c="#999" /></button>; })}
    </Sheet>}
  </div>;
}

/* ---------- 登录 ---------- */
function Login({ nav }) {
  useTone('dark');
  const [mail, setMail] = useState(''), [sent, setSent] = useState(false), [code, setCode] = useState('');
  const done = how => { nav.set({ loggedIn: true }); nav.toast('已用' + how + '登录'); nav.back(); };
  return <div className="pr">
    <div className="pbar"><button className="pib" onClick={nav.back}><Ic n="back" /></button><div className="grow" /></div>
    <div className="ps pad">
      <Logo s={64} />
      <div className="pt0" style={{ marginTop: 22 }}>登录声剪</div>
      <div className="pbody" style={{ marginTop: 8 }}>{SJ.MEMBERSHIP.privacy}。不登录也能剪、处理、导出。</div>
      <button className="gbtn" onClick={() => done(' Google 账号')}><img src="../assets/logos/google-g.svg" width="22" height="22" alt="" />用 Google 账号登录</button>
      <div className="or"><span>或者用邮箱验证码</span></div>
      <input className="field" placeholder="你的邮箱" value={mail} onChange={e => setMail(e.target.value)} style={{ fontSize: 17 }} />
      {!sent ? <button className="pbtn line" style={{ marginTop: 10 }} onClick={() => { setSent(true); setMail(mail || 'you@example.com'); }}>发验证码</button>
        : <Fragment><div className="psub" style={{ margin: '14px 0 8px' }}>验证码已发到 {mail}，10 分钟内有效</div>
          <div className="code6">{[0, 1, 2, 3, 4, 5].map(i => <span key={i} className={code.length === i ? 'cur' : ''}>{code[i] || ''}</span>)}</div>
          <div className="chips" style={{ padding: '10px 0 0' }}><button className="chip" onClick={() => setCode('482913')}>填入演示验证码</button></div>
          <button className="pbtn" style={{ marginTop: 14 }} onClick={() => done('邮箱')}>登录</button></Fragment>}
      <div className="psm" style={{ margin: '22px 0 30px' }}>登录即表示同意《用户协议》和《隐私说明》。</div>
    </div>
  </div>;
}

/* ---------- 会员：品牌海报级的一屏 ---------- */
const PRO_CH = ['声', '克', '乐', '说', '批', '字'];
function Member({ nav }) {
  useTone('light');
  const M = SJ.MEMBERSHIP; const [plan, setPlan] = useState('year');
  const p = M.plans.find(x => x.id === plan);
  const buy = () => { if (!nav.state.loggedIn) { nav.toast('先登录，会员要跟着账号走', '去登录', () => nav.push({ name: 'login' })); return; } nav.set({ member: true }); nav.toast(plan === 'year' ? '已开始 7 天免费试用（演示）' : '已开通（演示）'); };
  return <div className="pr np">
    <div className="ps">
      <div className="mem-hero">
        <button className="pib mem-x" onClick={nav.back} aria-label="关闭"><Ic n="close" c="#fff" /></button>
        <span className="mem-ch">会</span>
        <div className="mem-tag">声剪会员</div>
        <div className="mem-h">本机的，全免费。<br /><em>联网的，会员给。</em></div>
      </div>
      <div className="mem-pro">
        {M.pro.map((x, i) => <div key={x} className="mem-pro-i"><Han ch={PRO_CH[i]} s={34} tone={i < 2 ? 'blue' : 'ink'} fs={19} /><span>{x}</span></div>)}
      </div>
      <div className="mem-free"><b>不开会员也能用</b>{M.free.join('；')}。</div>
      <div className="pad" style={{ paddingTop: 18 }}>
        {M.plans.map(x => <button key={x.id} className={'mem-plan' + (plan === x.id ? ' on' : '')} onClick={() => setPlan(x.id)}>
          <Radio on={plan === x.id} />
          <div className="mid"><b>{x.name}{x.best && <span className="tag b" style={{ marginLeft: 8 }}>最划算</span>}</b><span>{x.note}</span></div>
          <div className="mem-price num">{x.price.replace(' / ', '/')}</div>
        </button>)}
        <div className="psm" style={{ padding: '10px 0 0', textAlign: 'center' }}>{M.priceNote}　随时可以在 Google Play 取消</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: '6px 0 24px' }}><button className="plink" onClick={() => nav.toast('没有找到可恢复的购买')}>恢复购买</button><button className="plink" onClick={() => nav.push({ name: 'info', id: 'faq' })}>常见问题</button></div>
      </div>
    </div>
    <div className="pfoot" style={{ boxShadow: '0 -1px 0 var(--hair)' }}>
      {nav.state.member ? <button className="pbtn ink" onClick={nav.back}>已是会员 · 回去接着用</button>
        : <button className="pbtn" onClick={buy}>{plan === 'year' ? '免费试用 7 天' : '开通' + p.name}</button>}
      <div className="note">{plan === 'year' ? '试用结束后 ' + p.price + '，前一天提醒你' : p.price + '　' + p.note}</div>
    </div>
  </div>;
}

/* 用到会员的地方弹出的那一张（选在线音色、VIP 曲目、AI 理解、批量超量） */
function MemberSheet({ nav, why, onClose, onFree, freeLabel }) {
  const go = () => { if (!nav.state.loggedIn) { nav.set({ loggedIn: true }); } nav.set({ member: true }); onClose(); nav.toast('已开始 7 天免费试用（演示）'); };
  return <div className="shbg" onClick={onClose}><div className="sh" onClick={e => e.stopPropagation()}>
    <div className="msh-top"><span className="msh-ch">会</span><div className="msh-t"><div className="tag" style={{ background: '#fff', color: '#000' }}>会员</div><div className="pt2" style={{ color: '#fff', marginTop: 10 }}>{why.title}</div><div style={{ font: '400 15px/1.5 var(--f)', color: 'rgba(255,255,255,.82)', marginTop: 4 }}>{why.sub}</div></div>
      <button className="pib" style={{ position: 'absolute', right: 4, top: 6 }} onClick={onClose}><Ic n="close" c="#fff" /></button></div>
    <div className="pad" style={{ padding: '16px 16px 4px' }}>
      <div className="pbody" style={{ fontSize: 15 }}>会员还有：{SJ.MEMBERSHIP.pro.filter(x => !why.skip || !x.includes(why.skip)).slice(0, 4).join('、')}。</div>
      <div className="psm" style={{ marginTop: 8 }}>年度会员 ¥98/年，先免费用 7 天。{SJ.MEMBERSHIP.priceNote}。</div>
    </div>
    <div className="pfoot" style={{ paddingBottom: 30 }}>
      <button className="pbtn" onClick={go}>免费试用 7 天</button>
      <div className="pbtn2" style={{ marginTop: 8 }}>
        <button className="pbtn ghost sm" onClick={() => { onClose(); nav.push({ name: 'member' }); }}>看全部方案</button>
        {onFree && <button className="pbtn ghost sm" onClick={() => { onClose(); onFree(); }}>{freeLabel}</button>}
      </div>
    </div>
  </div></div>;
}

/* ---------- 通知栏：播放控制、导出与批量进度 ---------- */
function Shade({ nav, onClose }) {
  const P = nav.player; const on = P.on('shade');
  return <div className="shade" onClick={onClose}><div className="shade-p" onClick={e => e.stopPropagation()}>
    <div style={{ display: 'flex', justifyContent: 'space-between', font: '600 14px/1 var(--f)', padding: '0 6px 6px' }}><span>11月23日 周日</span><span>下拉的通知栏</span></div>
    <div className="ntf">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Logo s={40} /><div className="mid" style={{ flex: 1, minWidth: 0 }}><div className="pt3 ell" style={{ fontSize: 15 }}>播客第 12 期 · 和王老师聊阅读</div><div className="psub">声剪　正在播放　锁屏上也能控制</div></div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}><span className="psm num">3:12</span><div style={{ flex: 1 }}><Prog p={0.17} /></div><span className="psm num">18:40</span></div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 26, marginTop: 10 }}><button className="pib"><Ic n="prev" /></button><button className="pib" style={{ background: BLUE, color: '#fff' }} onClick={() => P.toggle('shade', 20)}><Ic n={on ? 'pause' : 'play'} /></button><button className="pib"><Ic n="next" /></button></div>
      <div className="psm" style={{ marginTop: 8 }}>拔掉耳机会自动暂停。</div>
    </div>
    <div className="ntf"><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Han ch="出" s={36} tone="blue" fs={20} /><div style={{ flex: 1 }}><div className="pt3" style={{ fontSize: 15 }}>正在导出　广场舞串烧 · 6 首</div><div style={{ marginTop: 8 }}><Prog p={0.64} /></div><div className="psub" style={{ marginTop: 4 }}>64%　可以离开声剪，做好了提醒你保存</div></div></div></div>
    <div className="ntf"><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Han ch="转" s={36} tone="blue" fs={20} /><div style={{ flex: 1 }}><div className="pt3" style={{ fontSize: 15 }}>批量处理　17 / 24</div><div style={{ marginTop: 8 }}><Prog p={17 / 24} /></div><div className="psub" style={{ marginTop: 4 }}>{SJ.BATCH.run.current}</div></div></div></div>
    <button className="shade-handle" onClick={onClose}><i /></button>
  </div></div>;
}
