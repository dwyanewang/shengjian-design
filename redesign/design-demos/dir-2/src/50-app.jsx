/* ===================== 50 · 每台手机的状态机 + 展示板 + 功能覆盖图 ===================== */
const SCREENS = { home: Home, ling: Ling, pei: Pei, jing: Jing, edit: Editor, plan: Plan, export: Export, music: Music, member: Member, login: Login, record: Record, batch: Batch, subtitle: Subtitle, clone: Clone, files: Files, video: Video, tool: Tool, info: InfoPage };
const toStack = r => Array.isArray(r) ? r : (r.name === 'home' ? [r] : [{ name: 'home' }, r]);
window.SJP = window.SJP || {};

function SJApp({ id, init }) {
  const [stack, setStack] = useState(() => toStack(init.route));
  const [state, setState] = useState(() => ({ member: false, loggedIn: false, offline: false, aiConsent: false, applied: false, theme: '跟随系统', lang: '跟随系统', remind: true, ai: true, ...(init.state || {}) }));
  const [sheet, setSheet] = useState(init.sheet || null);
  const [toast, setToast] = useState(null), [shade, setShade] = useState(!!init.shade), [tone, setTone] = useState('dark'), [flash, setFlash] = useState(0), [gen, setGen] = useState(0);
  const player = usePlayerState(); const tt = useRef();
  const route = stack[stack.length - 1];
  useEffect(() => { if (init.play) player.freeze(...init.play); }, []);
  const nav = {
    route, player, state, sheet,
    set: p => setState(s => ({ ...s, ...p })),
    push: r => { player.stop(); setSheet(null); setStack(s => [...s, r]); },
    replace: r => setStack(s => [...s.slice(0, -1), r]),
    back: () => { player.stop(); setSheet(null); setToast(null); setStack(s => s.length > 1 ? s.slice(0, -1) : s); },
    reset: r => { player.stop(); setSheet(null); setStack(toStack(r)); },
    setTab: t => { player.stop(); setSheet(null); setStack(s => [{ name: 'home', tab: t }]); },
    setSheet,
    toast: (msg, act, fn) => { clearTimeout(tt.current); setToast({ msg, act, fn }); tt.current = setTimeout(() => setToast(null), 3400); },
  };
  useEffect(() => {
    window.SJP[id] = {
      go: (r, o = {}) => { player.stop(); setToast(null); setGen(g => g + 1); setStack(toStack(r)); setSheet(o.sheet || null); setShade(!!o.shade); if (o.state) setState(s => ({ ...s, ...o.state })); },
      flash: () => { setFlash(0); requestAnimationFrame(() => setFlash(Date.now())); },
      set: p => setState(s => ({ ...s, ...p })),
    };
  });
  const Scr = SCREENS[route.name] || Home;
  return <ToneCtx.Provider value={setTone}><NavCtx.Provider value={nav}>
    <div className={'pf' + (flash ? ' flash' : '')} key={flash} data-phone={id}>
      <div className="pf-scr">
        <Scr key={gen + ':' + stack.length + ':' + route.name + ':' + (route.id || '')} nav={nav} />
        <div className={'pf-st' + (tone === 'light' && !shade ? ' lt' : '')} onClick={() => setShade(!shade)} title="点一下下拉通知栏"><span className="num">9:41</span><StIcons /></div>
        <div className="pf-hole" />
        {shade && <Shade nav={nav} onClose={() => setShade(false)} />}
        {toast && <div className="toast"><span className="grow">{toast.msg}</span>{toast.act && <button onClick={() => { toast.fn && toast.fn(); setToast(null); }}>{toast.act}</button>}</div>}
        <div className="pf-gb" onClick={nav.back} title="返回手势"><i /></div>
      </div>
    </div>
  </NavCtx.Provider></ToneCtx.Provider>;
}

const PLAN_AT = mode => [{ name: 'home' }, { name: 'edit' }, { name: 'plan', mode }];
const PHONES = {
  home: { route: { name: 'home', tab: 'do' } },
  ling: { route: { name: 'ling', step: 'pick' } },
  pei: { route: { name: 'pei', step: 'voice' } },
  jing: { route: { name: 'jing', step: 'compare' } },
  member: { route: { name: 'member' } },
  edit: { route: { name: 'edit' }, play: ['ed', 32, 8, 8] },
  plan: { route: PLAN_AT('plan') },
  export: { route: { name: 'export', item: 'interview' } },
  music: { route: { name: 'music' }, play: ['mu-m2', 30, 0, 12.5] },
};
function drive(id, route, opts) {
  const ph = window.SJP[id]; if (!ph) return;
  ph.go(route, opts || {});
  const el = document.getElementById('ph-' + id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' });
  setTimeout(() => ph.flash(), 350);
}
window.SJdrive = drive;

function PhoneSlot({ id, ch, title, sub, zoom, tone = 'white', style, children }) {
  return <div className={'slot' + (zoom ? ' z12' : '')} style={style} id={'ph-' + id}>
    <div className="plabel"><Han ch={ch} s={40} tone={tone} fs={22} /><div className="tx"><b>{title}</b><span>{sub}</span></div></div>
    <SJApp id={id} init={PHONES[id]} />
    {children}
  </div>;
}

/* ---------- 汉字方块系统的局部特写 ---------- */
function SysCloseup() {
  return <div className="sys">
    <div className="sys-head"><h3>汉字方块：图标、入口、身份，是同一个东西</h3>
      <p>每件事一个字。在首页它是入口；进了流程它是半屏的标志，只做一步；开始干活它缩到左上角当角标；在音频库里它说明这段声音是怎么来的。</p></div>
    <div className="sys-row">
      <div className="anat">
        <div className="anat-tile">
          <span className="anat-big">铃</span><span className="anat-cap">做铃声</span>
          <i className="anat-n" style={{ left: 10, top: 10 }}>1</i><i className="anat-n" style={{ left: 10, bottom: 12 }}>2</i><i className="anat-n" style={{ right: 4, top: 4 }}>3</i>
        </div>
        <div className="anat-k">
          <div><i>1</i><span>字：这件事在中文里最短的名字。粗黑体、贴边裁切，像印章，不像标题。</span></div>
          <div><i>2</i><span>一行人话：不用懂「波形」「响度」也看得懂。</span></div>
          <div><i>3</i><span>剪角：只有标志和「正在做的那件事」才有。</span></div>
        </div>
      </div>
      <div className="seq">
        <figure><div className="mini"><div className="mini-wall">{Array.from({ length: 12 }, (_, i) => <i key={i} style={i === 0 ? { background: BLUE, gridArea: '1 / 1 / 3 / 3' } : null} />)}</div></div><figcaption>点「铃」</figcaption></figure>
        <span className="seq-ar">›</span>
        <figure><div className="mini"><div className="mini-half"><span>铃</span></div><div className="mini-lines"><i /><i /><i /></div></div><figcaption>半屏巨字，只做一步</figcaption></figure>
        <span className="seq-ar">›</span>
        <figure><div className="mini"><div className="mini-top"><b>铃</b><i /></div><div className="mini-wave">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ height: 6 + ((i * 7) % 11) * 3 }} />)}</div><div className="mini-lines"><i /><i /></div></div><figcaption>开始干活，字缩成角标</figcaption></figure>
      </div>
      <div className="sys-col">
        <div className="swatch"><div style={{ background: '#fff', color: BLUE }}>刃蓝<span>#2B3BFF</span></div><div style={{ background: '#000', color: '#fff' }}>墨<span>#000000</span></div><div style={{ background: '#fff', color: '#000' }}>纸<span>#FFFFFF</span></div></div>
        <p>整个 App 只有这三种颜色。刃蓝是正在做的事和该点的地方；墨是字、声音和会员；纸是底。声音不另配颜色：白底上用墨画，蓝底上用白画。</p>
        <div className="typespec"><span className="ts-a">剪铃配净</span><span className="ts-b num">0:30.0</span></div>
        <p style={{ marginTop: 6 }}>Noto Sans SC 900 写字，Schibsted Grotesk 写时间和数字。</p>
      </div>
    </div>
  </div>;
}

/* ---------- 首屏：先听一个结果（一首歌 → 30 秒铃声） ---------- */
function DemoStrip() {
  const C = SJ.CHORUS[0]; const [t, setT] = useState(null);
  useEffect(() => { if (t == null) return; const st = performance.now() - (t - C.from) * 1000; let raf; const f = n => { const v = C.from + (n - st) / 1000; if (v >= C.to) { setT(null); return; } setT(v); raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, [t == null]);
  return <div className="demo">
    <div className="demo-h"><button className="demo-play" onClick={() => setT(t == null ? C.from : null)} aria-label="试听"><Ic n={t == null ? 'play' : 'stop'} s={30} /></button>
      <div><b>先听一个结果</b><span>一首 3 分 52 秒的歌，「铃」自己找到副歌，剪成 30 秒来电铃声，最后一秒淡出。</span></div></div>
    <div className="demo-w">
      <Wave env={ENV.music} rate={20} h={84} bar={2} gap={2} color="rgba(255,255,255,.42)" hi={[C.from, C.to, '#fff']} />
      <div className="demo-box" style={{ left: pct(C.from, 0, 232), width: pct(C.to - C.from, 0, 232) }}><b>2:05 – 2:35　来电铃声</b></div>
      {t != null && <div className="demo-ph" style={{ left: pct(t, 0, 232) }} />}
    </div>
    <div className="demo-secs">{SJ.SECTIONS.map((s, i) => <span key={i} style={{ width: pct(s.to - s.from, 0, 232) }}>{s.name === '副歌' ? '副歌' : ''}</span>)}</div>
    <div className="ruler"><span>0:00</span><span>1:00</span><span>2:00</span><span>3:00</span><span>3:52</span></div>
  </div>;
}

/* ---------- 功能覆盖图 ---------- */
const E_ = (panel, extra) => ({ name: 'edit', panel, ...(extra || {}) });
const COVER = {
  A1: ['录', '首页「录」：开始、暂停、接着录；剪 › 更多 › 插入音频 › 现在录一段', 'home', { name: 'record', step: 'rec' }],
  A2: ['录', '录音页的设置条：麦克风、单 / 立体声、增益、耳机监听', 'home', { name: 'record', sheet: 'settings' }],
  A3: ['录', '录音页 › 录过的（上次中断的能接着录）', 'home', { name: 'record', step: 'list' }],
  A4: ['开', '首页「开」› 系统选择器，多选按顺序拼成一段', 'home', { name: 'files' }],
  A5: ['提', '首页「提」› 选视频，只取声音', 'home', { name: 'video' }],
  A6: ['＋', '首页「更多来源」› 从别的 App 分享进来', 'home', { name: 'home' }, { sheet: 'share' }],
  A7: ['配', '首页「配」› 写字 › 选声音（手机自带 / 真人感）、语速、试听', 'pei', { name: 'pei', step: 'voice' }],
  A8: ['字', '首页「字」› 导入 SRT / VTT / 纯文本 › 逐句合成、对齐时间', 'home', { name: 'subtitle', step: 'cues' }],
  A9: ['克', '首页「克」› 照着读 › 本机检查 › 同意 › 我的声音', 'home', { name: 'clone', step: 'check' }],
  A10: ['乐', '首页「乐」› 分类、试听、VIP、授权；导入或用作背景音乐', 'music', { name: 'music' }],
  A11: ['＋', '首页「更多来源」› 一段空白', 'home', { name: 'home' }, { sheet: 'blank' }],
  A12: ['＋', '首页「更多来源」› 示例音频', 'home', { name: 'home' }, { sheet: 'sample' }],
  A13: ['＋', '首页「更多来源」› 导入工程包', 'home', { name: 'home' }, { sheet: 'pkg' }],
  B1: ['剪', '波形上的选区；「精确时间」按 0.1 秒调', 'edit', E_('time')],
  B2: ['剪', '选区下面的工具条：剪掉、只留', 'edit', E_()],
  B3: ['剪', '工具条「分割」：在播放头切开', 'edit', E_()],
  B4: ['剪', '更多 › 片段顺序', 'edit', E_('order')],
  B5: ['剪', '工具条「复制」› 复制、剪切、粘贴', 'edit', E_('copy')],
  B6: ['剪', '工具条「复制」› 重复这一段', 'edit', E_('copy')],
  B7: ['剪', '工具条「音量」：选区 / 片段 / 整体', 'edit', E_('vol')],
  B8: ['剪', '工具条「淡化」：正弦、线性、对数', 'edit', E_('fade')],
  B9: ['剪', '「淡化」› 片段接缝交叉淡化', 'edit', E_('fade')],
  B10: ['剪', '更多 › 音量曲线', 'edit', E_('curve')],
  B11: ['剪', '波形上的黑旗；更多 › 标记 › 按标记分割', 'edit', E_('marker')],
  B12: ['剪', '更多 › 插入静音', 'edit', E_('silence')],
  B13: ['剪', '更多 › 插入音频 / 现在录一段', 'edit', E_('insert')],
  B14: ['剪', '更多 › 对齐节拍', 'edit', E_('beat')],
  B15: ['剪', '顶栏撤销、重做；每次改完的提示条也能撤销', 'edit', E_()],
  B16: ['剪', '播放键旁的「1×」，点一下换速度', 'edit', E_()],
  B17: ['剪', '播放键旁的「原声」', 'edit', E_()],
  B18: ['剪', '播放键旁的「频谱」', 'edit', E_(null, { spec: true })],
  B19: ['剪', '波形下面的 − / ＋', 'edit', E_(null, { zoom: 10 })],
  C1: ['说', '剪 › 说一句：打字或按话筒（本机识别）', 'edit', E_('say')],
  C2: ['说', '计划页：原句标号，波形上标出每一步', 'plan', PLAN_AT('plan')],
  C3: ['说', '计划页：点一步改数值，「不要」划掉', 'plan', PLAN_AT('plan')],
  C4: ['说', '说「剪掉开头」› 追问多少秒，给一键改写', 'plan', PLAN_AT('ask')],
  C5: ['说', '说口语 › AI 理解（会员，同意一次）› 标出你没说过的数', 'plan', PLAN_AT('ai')],
  C6: ['说', '「照这样改」算一步，撤销一下全回去', 'plan', PLAN_AT('plan')],
  C7: ['说', '说一句面板：试试这些、我的配方', 'edit', E_('say')],
  C8: ['转', '音频库多选 › 说一句；转 › 一句话', 'home', { name: 'batch', step: 'files', tpl: 'sentence' }],
  C9: ['说', '说「把副歌做成铃声」› 找副歌 › 导出先选好设成铃声', 'plan', PLAN_AT('purpose')],
  C10: ['说', '说「降噪之后统一音量」› 工具一个接一个，可跳过', 'plan', PLAN_AT('chain')],
  D1: ['净', '首页「净」；剪 › 处理 › 噪', 'jing', { name: 'jing', step: 'compare' }],
  D2: ['净', '「净」里的开关；剪 › 处理 › 停（逐个试听）', 'edit', { name: 'tool', id: 'pauses' }],
  D3: ['净', '「净」里的开关；剪 › 处理 › 匀', 'edit', { name: 'tool', id: 'loudness' }],
  D4: ['修', '剪 › 处理 › 修；「净」页里的链接', 'edit', { name: 'tool', id: 'repair' }],
  D5: ['变', '剪 › 处理 › 速', 'edit', { name: 'tool', id: 'speed' }],
  D6: ['变', '首页「变」；剪 › 处理 › 变', 'edit', { name: 'tool', id: 'voice' }],
  D7: ['剪', '剪 › 处理 › 效：排顺序、存预设', 'edit', { name: 'tool', id: 'effects' }],
  D8: ['剪', '剪 › 处理 › 道', 'edit', { name: 'tool', id: 'channels' }],
  D9: ['剪', '剪 › 处理 › 倒', 'edit', { name: 'tool', id: 'reverse' }],
  D10: ['伴', '首页「伴」› 拆成人声、伴奏两个版本', 'home', { name: 'tool', id: 'separate', entry: 'wall', step: 'work' }],
  D11: ['铃', '首页「铃」第 2 步；剪 › 处理 › 副', 'ling', { name: 'ling', step: 'chorus' }],
  D12: ['混', '首页「混」；配 › 配背景音乐；乐 › 用作背景音乐', 'pei', { name: 'pei', step: 'mix' }],
  D13: ['混', '剪 › 处理 › 叠', 'edit', { name: 'tool', id: 'multitrack' }],
  D14: ['串', '首页「串」› 排顺序、接缝过渡', 'home', { name: 'tool', id: 'medley', entry: 'wall', step: 'work' }],
  D15: ['循', '首页「循」› 30 / 60 / 90 秒，首尾无缝', 'home', { name: 'tool', id: 'loop', entry: 'wall', step: 'work' }],
  D16: ['字', '剪 › 处理 › 文；字 › 反过来转文字：即将开放', 'edit', { name: 'tool', id: 'stt' }],
  E1: ['净', '处理的主按钮都是「存成新版本」› 存好了', 'jing', { name: 'jing', step: 'saved' }],
  E2: ['库', '音频库 › 点一条 › 版本：试听、切换、删除', 'home', { name: 'home', tab: 'lib' }, { sheet: { type: 'versions', id: 'interview' } }],
  E3: ['净', '「之前 / 之后」切换；剪 › 原声', 'jing', { name: 'jing', step: 'compare' }],
  E4: ['混', '配乐、串烧、多轨存成新音频，设置留着，能回来调', 'pei', { name: 'pei', step: 'mix' }],
  F1: ['转', '首页「转」› 6 种做法', 'home', { name: 'batch' }],
  F2: ['转', '转 › 选文件、存到哪个文件夹', 'home', { name: 'batch', step: 'files' }],
  F3: ['转', '转 › 进度、暂停；离开后通知栏接着走', 'home', { name: 'batch', step: 'run' }],
  F4: ['转', '转 › 结果报告（有爆音一栏）› 导出 CSV', 'home', { name: 'batch', step: 'report' }],
  G1: ['出', '导出第一问：拿去做什么', 'export', { name: 'export', item: 'interview' }],
  G2: ['出', '存成文件 › 格式、音质；展开采样率、声道、位深', 'export', { name: 'export', item: 'interview', open: 'more' }],
  G3: ['出', '存成文件 › 文件信息', 'export', { name: 'export', item: 'interview', open: 'tags' }],
  G4: ['出', '存成文件 › 常用（预设）', 'export', { name: 'export', item: 'interview' }],
  G5: ['出', '存成文件 › 爆音提醒，自动限幅', 'export', { name: 'export', item: 'interview' }],
  G6: ['出', '存成文件 › 每段一个文件', 'export', { name: 'export', item: 'interview' }],
  G7: ['出', '生成时能离开 › 待保存 › 选位置保存', 'export', { name: 'export', item: 'interview', step: 'ready' }],
  G8: ['铃', '铃 › 多长 › 最后 1 秒自动淡出', 'ling', { name: 'ling', step: 'length' }],
  H1: ['库', '音频库：搜索、筛选', 'home', { name: 'home', tab: 'lib' }],
  H2: ['库', '音频库 › 选择 › 说一句 / 用工具 / 导出', 'home', { name: 'home', tab: 'lib', select: true }],
  H3: ['库', '点一条 › 改名、导出、版本、占用、工程包、删除', 'home', { name: 'home', tab: 'lib' }, { sheet: { type: 'item', id: 'interview' } }],
  H4: ['库', '列表上的状态：正在导出、待保存、已用备份恢复', 'home', { name: 'home', tab: 'lib' }],
  I1: ['我', '我的 › 登录：Google 账号、邮箱验证码', 'home', { name: 'login' }],
  I2: ['会', '会员页：三种方案、7 天试用、恢复购买', 'member', { name: 'member' }],
  I3: ['会', '会员页：会员有的 / 不开也能用的', 'member', { name: 'member' }],
  I4: ['我', '登录页第一句：不会上传你的音频', 'home', { name: 'login' }],
  J1: ['我', '我的 › 设置 › 外观', 'home', { name: 'home', tab: 'me' }],
  J2: ['我', '我的 › 设置 › 语言', 'home', { name: 'home', tab: 'me' }],
  J3: ['我', '我的 › 提醒没保存的导出', 'home', { name: 'home', tab: 'me' }],
  J4: ['我', '我的 › AI 帮忙理解一句话', 'home', { name: 'home', tab: 'me' }],
  J5: ['我', '我的 › 你的数据在哪里', 'home', { name: 'info', id: 'data' }],
  J6: ['我', '我的 › 使用指南', 'home', { name: 'info', id: 'guide' }],
  J7: ['我', '我的 › 常见问题', 'home', { name: 'info', id: 'faq' }],
  J8: ['我', '我的 › 联系支持', 'home', { name: 'info', id: 'support' }],
  J9: ['我', '我的 › 第三方许可', 'home', { name: 'info', id: 'licence' }],
  K1: ['通', '点状态栏下拉：播放控制，拔耳机暂停', 'home', { name: 'home' }, { shade: true }],
  K2: ['通', '通知栏：导出、批量的进度', 'home', { name: 'home' }, { shade: true }],
};
const CH_NAME = { 剪: '工作台', 我: '我的', 说: '一句话', 出: '导出', 转: '批量', 净: '变干净', 库: '音频库', '＋': '更多来源', 录: '录音', 混: '配乐混音', 字: '字幕配音', 变: '变声变速', 铃: '铃声', 会: '会员', 通: '通知栏', 开: '打开文件', 提: '视频取声', 配: '配音', 克: '克隆', 乐: '音乐库', 修: '修复', 伴: '伴奏', 串: '串烧', 循: '循环' };
const HAN_TONE = ch => ['会', '乐'].includes(ch) ? 'ink' : ['库', '我', '通', '＋', '出', '说'].includes(ch) ? 'tint' : 'blue';
const HONEST = [
  ['在线音色', '没网时音色卡变灰，写「没连上网，先用手机自带的声音」；已经生成的不受影响。'],
  ['克隆声音', '检查在手机上做。上传前必须勾同意；上传失败，参考录音留在手机里，联网再传。'],
  ['音乐库', '没网时显示上次的目录，标「不是最新」；下载过的曲子照常用。'],
  ['AI 理解一句话', '没网或没开会员，就只用本机理解；本机能读懂的说法一直能用。'],
  ['登录与会员', '没网时显示上次的会员状态，写「没连上，显示的是上次的」，不会把会员当成过期。'],
  ['音频转文字', '还没做好，就写「即将开放」，可以开「开放时通知我」，不给假结果。'],
];
function Coverage() {
  const [f, setF] = useState(null);
  const all = SJ.FEATURES.flatMap(g => g.items);
  const count = {}; all.forEach(([id]) => { const c = COVER[id][0]; count[c] = (count[c] || 0) + 1; });
  const chars = Object.keys(count).sort((a, b) => count[b] - count[a]);
  return <section className="band paper" id="coverage"><div className="wrap">
    <div className="cov-head"><div><h2>93 项功能，每一项归哪个字</h2><p>按清单分组。每行写着它归哪个字、在哪一屏、怎么点到。点一行，上面对应的那台手机会跳过去。点下面的字，只看归它管的。</p></div>
      <div className="cov-stats num">{all.length}<span>项，全部有位置；{all.filter(([id]) => COVER[id][3]).length} 项能直接跳到手机里</span></div></div>
    <div className="legend">{chars.map(c => <button key={c} className={f === c ? 'on' : ''} onClick={() => setF(f === c ? null : c)}><Han ch={c} s={40} tone={HAN_TONE(c)} fs={22} /><span>{CH_NAME[c] || c}</span><em>{count[c]}</em></button>)}{f && <button className="clear" onClick={() => setF(null)}>看全部</button>}</div>
    <div className="covgrid">{SJ.FEATURES.map(g => <div key={g.id} className="cg">
      <div className="cg-h"><b>{g.id}</b><span>{g.group}</span><em>{g.items.length} 项</em></div>
      {g.items.map(([id, name]) => { const [c, where, ph, r, o] = COVER[id]; return <button key={id} className={'ci' + (f && f !== c ? ' dim' : '')} onClick={() => drive(ph, r, o)}>
        <span className="id">{id}</span><span className="ft">{name}</span>
        <span className="wh"><Han ch={c} s={26} tone={HAN_TONE(c)} fs={16} /><span>{where}</span></span>
      </button>; })}
    </div>)}</div>
    <h3 className="h3b">联网的部分，没网或没开通时怎么说</h3>
    <div className="honest">{HONEST.map(([t, d]) => <div key={t}><b>{t}</b>{d}</div>)}</div>
    <div className="foot">声剪 · 方向 2「一个字一件事」初稿，2026-11-23。演示内容全部来自 demo-data.js，曲目、音色、人名都是虚构的。价格是示例，以 Google Play 为准。九台手机各自能点：点状态栏下拉通知栏，点底部横条返回。</div>
  </div></section>;
}

/* ---------- 展示板 ---------- */
function Board() {
  const [off, setOff] = useState(false);
  useEffect(() => { const f = () => document.documentElement.style.setProperty('--pz', Math.min(1, (window.innerWidth - 32) / 378).toFixed(3)); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const toggleOff = () => { const v = !off; setOff(v); Object.values(window.SJP).forEach(p => p.set({ offline: v })); };
  return <div className="bd">
    <section className="band blue hero"><div className="wrap">
      <div className="topline">
        <div className="lockup"><Han ch="剪" s={84} tone="white" cut fs={56} /><div><div className="wm">声剪</div><div className="sub">安卓手机上的音频编辑</div></div></div>
        <div className="meta">商业化重新设计，方向 2<br />「一个字一件事」初稿，2026-11-23</div>
      </div>
      <div className="cols">
        <div className="col colL">
          <h1 className="h1">一个字，<br />一件事。</h1>
          <p className="lead">剪个铃声、配个音、把录音弄干净。想做的事，在声剪里各是一个字：点那个字，一屏只做一步，最后都落到导出。</p>
          <p className="lead"><b>剪辑和处理都在这台手机上做，免费，导出没有水印。</b>联网的真人感音色、克隆、VIP 音乐和 AI 听懂口语，是会员的。</p>
          <DemoStrip />
          <PhoneSlot id="pei" ch="配" title="配：写字 › 选声音 › 生成 › 配乐" sub="在线音色标着会员，试听不要钱；点「用林溪读」才弹会员。" style={{ marginTop: 72 }} />
        </div>
        <div className="col colC">
          <PhoneSlot id="home" ch="做" zoom title="首页：今天想做什么？" sub="一面汉字墙。所有来源也在墙上，它同时是「新建」。左上角那块能直接听一个做好的铃声。" style={{ marginTop: 40 }} />
          <PhoneSlot id="jing" ch="净" title="净：之前 / 之后，存成新版本" sub="三件事各一个开关，切到「之前」就是原录音。" style={{ marginTop: 72 }} />
        </div>
        <div className="col colR">
          <div className="spacer" style={{ height: 150 }} />
          <PhoneSlot id="ling" ch="铃" title="铃：选歌 › 找副歌 › 30 秒 › 设成铃声" sub="第一步半屏是字；选了歌，字缩进左上角。" />
          <PhoneSlot id="member" ch="会" title="会员：品牌海报的一屏" sub="本机的全免费，联网的会员给。示例价格，以 Google Play 为准。" style={{ marginTop: 72 }} />
        </div>
      </div>
      <SysCloseup />
      <div style={{ height: 96 }} />
    </div></section>

    <section className="band paper"><div className="wrap">
      <div className="btitle"><Han ch="剪" s={132} tone="blue" cut fs={88} /><div><h2>剪，一点没少。</h2><p>墙上的「剪」是完整的工作台。波形上拖选区，下面的工具跟着选区变；说一句，计划落在波形上，看清了再改；16 种处理一字一个，都存成新版本。</p></div></div>
      <div className="cols cols3" style={{ marginTop: 48 }}>
        <PhoneSlot id="edit" ch="剪" tone="blue" title="剪：工作台" sub="9 处长停顿在波形上看得见。选区、播放头、标记、倍速、原声、频谱。">
          <div className="notes"><div>选区一出来，工具条就换成「剪掉 只留 分割 音量 淡化 复制」。</div><div>「处理整段」打开 16 个字：噪 停 匀 修 速 变 效 道 倒 伴 副 混 叠 串 循 文。</div></div>
        </PhoneSlot>
        <PhoneSlot id="plan" ch="说" tone="blue" title="说一句 › 计划" sub="原句里每个短语标了号，同一个号落在波形上。" style={{ marginTop: 120 }}>
          <div className="notes"><div>点一步改数值，「不要」就划掉；整条计划算一步，能一下撤回。</div><div>读不懂会追问；口语交给 AI 时，标出它补的、你没说过的数。</div></div>
        </PhoneSlot>
        <PhoneSlot id="export" ch="出" tone="blue" title="导出：先问拿去做什么" sub="存成文件、设成铃声、发给别人。格式和音质排在用途后面。" style={{ marginTop: 40 }}>
          <div className="notes"><div>会爆音就先说，并且已经替你开了限幅。</div><div>生成时可以离开；没存之前它一直等着，库里标「待保存」。</div></div>
        </PhoneSlot>
      </div>
      <div style={{ height: 96 }} />
    </div></section>

    <section className="band ink"><div className="wrap">
      <div className="cols">
        <div className="col" style={{ width: 520 }}>
          <div className="btitle"><Han ch="会" s={132} tone="white" fs={88} style={{ color: '#000' }} /><div><h2>联网的，<br />会员给。</h2></div></div>
          <p className="lead" style={{ color: 'rgba(255,255,255,.88)' }}>会员只卖联网才有的东西。入口不在首页喊，出现在你正要用它的那一下：</p>
          <div style={{ marginTop: 18, width: '100%' }}>
            {[['声', '选了一个在线音色', '配 › 选林溪 › 「用林溪读」', 'pei', { name: 'pei', step: 'voice', gate: true }], ['乐', '想用一首 VIP 曲目', '乐 › 霓虹慢车 › 用作背景音乐', 'music', { name: 'music', track: 'm3' }], ['说', '说的话太口语，要 AI 帮忙', '剪 › 说一句 › 让 AI 帮忙理解', 'plan', PLAN_AT('ai')], ['批', '一次批量超过 10 个', '转 › 选了 24 个文件', 'home', { name: 'batch', step: 'files' }]].map(([c, t, s, ph, r]) =>
              <button key={c} className="ent" onClick={() => drive(ph, r)}><Han ch={c} s={44} tone="white" fs={24} style={{ color: '#000' }} /><span className="tx"><b>{t}</b><span>{s}</span></span><span className="go">在手机里看</span></button>)}
          </div>
        </div>
        <div className="col"><PhoneSlot id="music" ch="乐" tone="white" title="乐：在线音乐库" sub="试听在列表里直接放；授权、能不能商用、要不要署名写在详情里。" style={{ marginTop: 96 }} /></div>
        <div className="col" style={{ width: 440 }}>
          <div className="freebox" style={{ marginTop: 136 }}><h4>不开会员也能用，没有水印</h4><ul>{[...SJ.MEMBERSHIP.free, '音频库、版本、配方', '批量一次 10 个（示例）'].map(x => <li key={x}>{x}</li>)}</ul></div>
          <div className="freebox" style={{ background: BLUE, color: '#fff' }}><h4>会员有</h4><ul>{SJ.MEMBERSHIP.pro.map(x => <li key={x} style={{ '--dot': '#fff' }}>{x}</li>)}</ul><div style={{ font: '400 14px/1.5 var(--f)', marginTop: 14, opacity: .9 }}>年度 ¥98（7 天免费试用）、包月 ¥15、周卡 ¥6。{SJ.MEMBERSHIP.priceNote}。</div></div>
          <button className={'offbtn' + (off ? ' on' : '')} onClick={toggleOff}>{off ? '恢复联网' : '让所有手机断网看看'}</button>
          <p style={{ font: '400 15px/1.6 var(--f)', color: 'rgba(255,255,255,.8)', marginTop: 12 }}>断网后：音乐库显示上次的目录并标「不是最新」，在线音色变灰并建议用手机自带的，AI 理解退回本机。</p>
        </div>
      </div>
      <div style={{ height: 110 }} />
    </div></section>
    <Coverage />
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Board />);
