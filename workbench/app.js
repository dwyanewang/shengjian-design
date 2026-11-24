/* 声剪 工作台重排交互稿：一个渲染器画出所有手机画面（静态状态和可操作的两台）。 */
(function () {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RM.matches;
  const UNIT = 50; // 一个时间单位 = 50 毫秒
  const NB = ' ';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ------------------------------------------------------------------ icons
  function ic(name, size, cls) {
    size = size || 24; cls = cls || '';
    const a = `class="ic ${cls}" width="${size}" height="${size}" aria-hidden="true"`;
    if (name === 'Drag') return `<svg ${a} viewBox="0 0 24 24">` + [5, 12, 19].map(y => [9, 15].map(x => `<circle cx="${x}" cy="${y}" r="1.9"/>`).join('')).join('') + '</svg>';
    if (name === 'Playhead') return `<svg ${a} viewBox="0 0 24 24"><path d="M6.5 3h11l-5.5 5.5z"/><rect x="11" y="6" width="2" height="15" rx="1"/></svg>`;
    if (name === 'Redo') return ic('Undo', size, cls + ' flip');
    if (name === 'ArrowForward') return ic('ArrowBack', size, cls + ' flip');
    const d = (window.ICONS || {})[name];
    if (!d) return `<svg ${a} viewBox="0 0 24 24"></svg>`;
    return `<svg ${a} viewBox="0 -960 960 960"><path d="${d}"/></svg>`;
  }

  // ------------------------------------------------------------------ time labels (core/TimeFormat)
  const pad2 = n => String(n).padStart(2, '0');
  function clock(u, ms) {
    const t = Math.max(0, Math.round(u * UNIT));
    const m = Math.floor(t / 60000), s = Math.floor(t / 1000) % 60, k = t % 1000;
    return pad2(m) + ':' + pad2(s) + (ms ? '.' + String(k).padStart(3, '0') : '');
  }
  const point = u => (Math.round(u * UNIT) % 1000 ? clock(u, true) : clock(u, false));
  function compact(u) {
    const te = Math.round(u * UNIT / 100);
    return `${Math.floor(te / 600)}:${pad2(Math.floor(te / 10) % 60)}.${te % 10}`;
  }
  function dur(u) {
    const sec = u * UNIT / 1000;
    if (sec < 60) return String(Math.round(sec * 10) / 10) + NB + '秒';
    const t = Math.round(sec);
    return Math.floor(t / 60) + NB + '分' + NB + (t % 60) + NB + '秒';
  }

  // ------------------------------------------------------------------ springs (ui/Flow.kt, ui/Motion.kt)
  const P = {
    lead: { k: 300, z: 0.62 }, trail: { k: 170, z: 0.78 }, grow: { k: 380, z: 0.5 },
    move: { k: 400, z: 0.9 }, slot: { k: 520, z: 0.86 }, col: { k: 330, z: 0.8 }, panel: { k: 380, z: 0.8 },
  };
  class Spring {
    constructor(v, p, eps) { this.v = v || 0; this.t = this.v; this.vel = 0; this.p = p || P.move; this.eps = eps || 0.01; }
    to(t, p) { this.t = t; if (p) this.p = p; return this; }
    snap(v) { this.v = this.t = v; this.vel = 0; return this; }
    get busy() { return this.v !== this.t || this.vel !== 0; }
    step(dt) {
      if (this.v === this.t && this.vel === 0) return false;
      if (reduced()) { this.v = this.t; this.vel = 0; return false; }
      const k = this.p.k, c = 2 * this.p.z * Math.sqrt(k);
      let left = Math.min(dt, 0.05);
      while (left > 1e-6) {
        const h = Math.min(left, 1 / 240);
        const a = -k * (this.v - this.t) - c * this.vel;
        this.vel += a * h; this.v += this.vel * h; left -= h;
      }
      if (Math.abs(this.v - this.t) < this.eps && Math.abs(this.vel) < this.eps * 8) { this.v = this.t; this.vel = 0; return false; }
      return true;
    }
  }
  /** Two edges; the edge on the side it moves toward leads on the quick spring, the other follows (FlowSpan). */
  class FlowSpan {
    constructor(eps) { this.a = new Spring(0, P.lead, eps || 0.3); this.b = new Spring(0, P.lead, eps || 0.3); this.placed = false; }
    to(s, e) {
      if (!this.placed) { this.snap(s, e); return; }
      if (s === this.a.t && e === this.b.t) return;
      const right = s + e > this.a.t + this.b.t;
      this.a.to(s, right ? P.trail : P.lead); this.b.to(e, right ? P.lead : P.trail);
    }
    snap(s, e) { this.a.snap(s); this.b.snap(e); this.placed = true; }
    step(dt) { const x = this.a.step(dt); const y = this.b.step(dt); return x || y; }
  }
  /** Many springs at once (one per waveform column). */
  class ArrSpring {
    constructor(n, init, p) {
      this.n = n; this.v = new Float32Array(n).fill(init); this.vel = new Float32Array(n);
      this.t = new Float32Array(n).fill(init); this.p = p || P.col; this.active = false;
    }
    step(dt) {
      if (!this.active) return false;
      if (reduced()) { this.v.set(this.t); this.vel.fill(0); this.active = false; return false; }
      const k = this.p.k, c = 2 * this.p.z * Math.sqrt(k), d = Math.min(dt, 0.05);
      let any = false;
      for (let i = 0; i < this.n; i++) {
        let v = this.v[i], vel = this.vel[i]; const t = this.t[i];
        if (v === t && vel === 0) continue;
        let left = d;
        while (left > 1e-6) { const h = Math.min(left, 1 / 120); const a = -k * (v - t) - c * vel; vel += a * h; v += vel * h; left -= h; }
        if (Math.abs(v - t) < 0.05 && Math.abs(vel) < 0.4) { v = t; vel = 0; } else any = true;
        this.v[i] = v; this.vel[i] = vel;
      }
      this.active = any;
      return any;
    }
  }

  // ------------------------------------------------------------------ audio model
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /** A speech-like recording: words in phrases, pauses, a steady noise floor (what denoise takes away). */
  function genSource(n, seed, key0) {
    const r = rng(seed), clean = new Float32Array(n), noise = new Float32Array(n);
    let u = 2;
    while (u < n) {
      const words = 2 + Math.floor(r() * 4), loud = 0.55 + r() * 0.4;
      for (let w = 0; w < words && u < n; w++) {
        const len = 3 + Math.floor(r() * 6), peak = loud * (0.45 + r() * 0.55);
        for (let k = 0; k < len && u < n; k++, u++) clean[u] = peak * Math.pow(Math.sin(Math.PI * (k + 0.5) / len), 0.8) * (0.7 + 0.3 * r());
        u += Math.floor(r() * 2.6);
      }
      u += 8 + Math.floor(r() * 9);
      if (r() < 0.25) u += 12 + Math.floor(r() * 14);
    }
    for (let i = 0; i < n; i++) noise[i] = 0.07 + 0.05 * r();
    return { n, clean, noise, key0 };
  }
  const SRC = genSource(978, 11, 0);
  const hash01 = i => { const x = Math.sin((i + 7) * 12.9898) * 43758.5453; return x - Math.floor(x); };

  // Pieces: [srcStart, srcEnd, silent?] in units, like core/Timeline segments.
  const plen = q => q[1] - q[0];
  const tlen = ps => ps.reduce((a, q) => a + plen(q), 0);
  function slicePieces(ps, a, b) {
    const out = []; let u = 0;
    for (const q of ps) {
      const L = plen(q), s = Math.max(a, u), e = Math.min(b, u + L);
      if (e > s) out.push([q[0] + s - u, q[0] + e - u, q[2] || 0]);
      u += L;
    }
    return out;
  }
  const cutPieces = (ps, a, b) => slicePieces(ps, 0, a).concat(slicePieces(ps, b, Infinity));
  const insertPieces = (ps, at, ins) => slicePieces(ps, 0, at).concat(ins.map(q => q.slice()), slicePieces(ps, at, Infinity));
  const movePieces = (ps, a, b, to) => insertPieces(cutPieces(ps, a, b), to, slicePieces(ps, a, b));
  function seamsOf(ps) { const out = []; let u = 0; for (let i = 0; i < ps.length - 1; i++) { u += plen(ps[i]); out.push(u); } return out; }

  const flatCache = new WeakMap();
  function flatten(ps, src) {
    let per = flatCache.get(ps);
    if (per && per.src === src) return per.m;
    const L = tlen(ps), cl = new Float32Array(L), no = new Float32Array(L), key = new Int32Array(L);
    let u = 0;
    for (const q of ps) for (let s = q[0]; s < q[1]; s++, u++) {
      if (q[2]) key[u] = -1; else { cl[u] = src.clean[s]; no[u] = src.noise[s]; key[u] = src.key0 + s; }
    }
    const m = { L, cl, no, key };
    flatCache.set(ps, { src, m });
    return m;
  }
  function resample(m, rate) {
    const L = Math.floor(m.L / rate), cl = new Float32Array(L), no = new Float32Array(L), key = new Int32Array(L);
    for (let u = 0; u < L; u++) { const s = Math.min(m.L - 1, Math.floor(u * rate)); cl[u] = m.cl[s]; no[u] = m.no[s]; key[u] = m.key[s]; }
    return { L, cl, no, key };
  }
  // Denoise strength stops 25/45/65/80/95: how much noise is left, how much of the voice is kept.
  const DN = [{ res: 0.62, keep: 0.99 }, { res: 0.46, keep: 0.98 }, { res: 0.3, keep: 0.97 }, { res: 0.17, keep: 0.95 }, { res: 0.07, keep: 0.92 }];
  const DN_NAMES = ['很轻', '轻', '适中', '较强', '很强'];

  // ------------------------------------------------------------------ one piece of audio and its versions
  const V1_HIST = () => [
    { label: '最开始的样子', ps: [[0, 978]] },
    { label: '剪掉开头' + NB + '2.4' + NB + '秒', ps: [[48, 978]] },
    { label: '删除 00:20.500–00:22', ps: [[48, 458], [488, 978]] },
  ];
  function mkFamily() {
    return { projects: [{ id: 'v1', n: 1, origin: '录音', src: SRC, parent: null, parentIdx: 0, hist: V1_HIST(), idx: 2 }], cur: 'v1', redo: null };
  }
  /** A processing step: the result becomes the source of a new version (ProcessScreen.confirm). */
  function processProject(fam, p, opt) {
    const m = flatten(p.hist[p.idx].ps, p.src), n = m.L;
    const src = { n, clean: new Float32Array(n), noise: new Float32Array(n), key0: 100000 * (fam.projects.length + 1) };
    const r = DN[opt.level];
    for (let u = 0; u < n; u++) {
      const inS = !opt.scope || (u >= opt.scope[0] && u < opt.scope[1]);
      src.clean[u] = m.cl[u] * (inS ? r.keep : 1); src.noise[u] = m.no[u] * (inS ? r.res : 1);
    }
    const v = { id: 'v' + (fam.projects.length + 1), n: fam.projects.length + 1, origin: opt.origin, src, parent: p.id, parentIdx: p.idx, hist: [{ label: opt.origin, ps: [[0, n]] }], idx: 0 };
    fam.projects.push(v); fam.cur = v.id; fam.redo = null;
    return v;
  }
  function commitTo(p, ps, label) { p.hist = p.hist.slice(0, p.idx + 1); p.hist.push({ label, ps }); p.idx++; }

  // ------------------------------------------------------------------ tool catalogue (labels from res/values-zh)
  const CUT_TOOLS = [
    { k: 'split', n: '分割', i: 'ContentCut' }, { k: 'insert', n: '插入…', i: 'PlaylistAdd', kw: '粘贴 静音 录音 文件 paste silence insert' },
    { k: 'precise', n: '精确时间', i: 'Straighten' }, { k: 'segments', n: '片段顺序', i: 'ViewAgenda' },
    { k: 'params', n: '音量与淡化', i: 'VolumeUp' }, { k: 'envelope', n: '音量曲线', i: 'ShowChart', kw: '音量曲线 包络 自动化 envelope' },
    { k: 'markers', n: '标记', i: 'Flag', kw: '标记 书签 marker' },
  ].map(t => Object.assign(t, { c: '--accent', g: 'cut' }));
  const PROC_TOOLS = [
    { k: 'denoise', n: '降噪', i: 'GraphicEq', kw: 'noise hiss hum 噪音 杂音 底噪' }, { k: 'repair', n: '修复', i: 'Healing', kw: '嗡嗡 电流 咔哒 爆音 削波 齿音 噪声门' },
    { k: 'loudness', n: '音量拉齐', i: 'Equalizer', kw: '响度 标准化 统一音量 LUFS' }, { k: 'speed', n: '快慢与音高', i: 'Speed', kw: '变速 变调 加快 放慢' },
    { k: 'fx', n: '效果', i: 'AutoAwesome', kw: 'eq reverb echo 均衡 混响 回声' }, { k: 'voice', n: '变声', i: 'RecordVoiceOver', kw: '机器人 卡通 电话 对讲机' },
    { k: 'channels', n: '左右声道', i: 'SurroundSound', kw: '单声道 立体声 声道' }, { k: 'reverse', n: '倒放', i: 'Undo' },
    { k: 'separate', n: '人声分离', i: 'CallSplit', kw: '人声 伴奏 消音' },
  ].map(t => Object.assign(t, { c: '--lane0', g: 'proc' }));
  const FIND_TOOLS = [
    { k: 'pauses', n: '删掉停顿', i: 'VolumeOff', kw: '静音 空白 安静 停顿' }, { k: 'chorus', n: '找副歌', i: 'MusicNote', kw: '副歌 铃声' },
  ].map(t => Object.assign(t, { c: '--lane3', g: 'proc' }));
  const SEL_TOOLS = [
    { k: 'beats', n: '对齐节拍', i: 'Timer', kw: '节拍 卡点 beat' }, { k: 'snap', n: '边缘吸附到过零点', i: 'Waves', kw: '过零点 吸附' },
  ].map(t => Object.assign(t, { c: '--accent', g: 'sel' }));
  const CREATE_TOOLS = [
    { k: 'bgm', n: '配背景音乐', i: 'LibraryMusic', d: '人声下面垫一段音乐，可以从在线音乐库选', kw: '配乐 背景 在线 音乐库 曲库' },
    { k: 'multitrack', n: '多轨混音', i: 'Layers', d: '几段声音叠在一起，各自调音量和位置' },
    { k: 'medley', n: '串烧', i: 'QueueMusic', d: '几首歌接成一首，接缝处交叉淡化' },
    { k: 'loop', n: '一分钟循环', i: 'PlaylistAdd', d: '做成 60' + NB + '秒、首尾接得上的背景音乐' },
    { k: 'subtitle', n: '字幕配音', i: 'ClosedCaption', d: '按字幕的时间生成配音', kw: '字幕 配音 朗读 srt' },
    { k: 'clone', n: '克隆声音', i: 'RecordVoiceOver', d: '用这段里 3–6' + NB + '秒的说话声做一个声音', kw: '克隆 音色' },
    { k: 'stt', n: '音频转文字', i: 'ClosedCaption', d: '点开有说明', nc: true, kw: '转写 文字 字幕' },
  ].map(t => Object.assign(t, { c: '--lane1', g: 'create' }));
  const ALL_TOOLS = CUT_TOOLS.concat(PROC_TOOLS, FIND_TOOLS, SEL_TOOLS, CREATE_TOOLS);
  const WHERE = { cut: '剪辑 · 直接改这一版', proc: '处理声音 · 在波形下面调', sel: '选区「⋯」里', create: '用这段音频创作 · 打开新页面' };

  const tile = (t, extra) => `<button class="tt" data-a="tool" data-k="${t.k}" style="--c:var(${t.c})"><span class="ti">${ic(t.i, 24)}</span><span class="tl">${t.n}</span>${t.nc ? '<span class="nc">未接通</span>' : ''}${extra || ''}</button>`;
  const grid = list => `<div class="tgrid">${list.map(t => tile(t)).join('')}</div>`;
  const shHead = (title, sub, back) => `<div class="handle"></div><div class="sh-h">${back ? `<button class="bk" data-a="${back}" aria-label="返回">${ic('ArrowBack', 22)}</button>` : ''}<div class="sh-tt"><div class="sh-t">${title}</div>${sub ? `<div class="sh-s">${sub}</div>` : ''}</div><button class="cb" data-a="sclose" aria-label="关闭">${ic('Close', 20)}</button></div>`;
  const ar = (icon, title, desc, a, note, cls) => `<button class="ar ${cls || ''}" data-a="${a || 'noop'}">${ic(icon, 22)}<span class="ar-x"><span class="ar-t">${title}</span>${desc ? `<span class="ar-d" style="display:block">${desc}</span>` : ''}</span>${note ? `<span class="ar-n">${note}</span>` : ''}</button>`;

  function searchResults(q) {
    q = q.trim();
    if (!q) return '';
    const hits = ALL_TOOLS.filter(t => t.n.includes(q) || (t.kw || '').toLowerCase().includes(q.toLowerCase()));
    const rows = hits.map(t => {
      const why = t.n.includes(q) ? '' : ` · 匹配「<em>${q}</em>」`;
      return `<button class="rrow" data-a="tool" data-k="${t.k}" style="--c:var(${t.c})"><span class="ti">${ic(t.i, 22)}</span><span class="rx"><b>${t.n}${t.nc ? ' <span class="pill nc">未接通</span>' : ''}</b><span>${WHERE[t.g]}${why}</span></span>${ic('KeyboardArrowRight', 22, 'chv')}</button>`;
    }).join('');
    return `<div class="res">${rows || '<div class="hintx" style="text-align:center;padding:8px 0">没有叫这个的工具</div>'}</div><button class="say" data-a="say">对这段音频说「${q}」</button>`;
  }

  // ------------------------------------------------------------------ the workbench
  const benches = [];

  class Bench {
    constructor(root, scene, live) {
      this.root = root; this.live = live; this.sceneName = root.dataset.scene;
      this.reset(scene);
      this.build();
      this.selOpen = { l: new Spring(0, P.lead, 0.002), r: new Spring(0, P.trail, 0.002) };
      this.pasteOpen = { l: new Spring(0, P.lead, 0.002), r: new Spring(0, P.trail, 0.002) };
      this.ampMix = new Spring(1, P.move, 0.003);
      this.panelY = new Spring(0, P.panel, 0.3);
      this.spans = new Map();
      this.ca = null; this.drag = null; this.g = null; this.playing = false; this.last = 0; this.raf = 0;
      this.lastBar = { left: 8, arrow: 40 };
      this.render(true);
      new ResizeObserver(() => this.resize()).observe(this.waveEl);
      this.resize();
      if (live) this.bindLive();
      benches.push(this);
    }

    reset(scene) {
      this.fam = scene.fam; this.st = scene.st; this.after = scene.after;
    }

    // ---- model access
    proj() { return this.fam.projects.find(p => p.id === this.fam.cur); }
    byId(id) { return this.fam.projects.find(p => p.id === id); }
    ps() { const p = this.proj(); return p.hist[p.idx].ps; }
    flat() { const p = this.proj(); return flatten(this.ps(), p.src); }
    len() { return this.flat().L; }
    verLabel(p) { p = p || this.proj(); return `第${NB}${p.n}${NB}版 · ${p.origin}`; }
    scopeRange() { const pn = this.st.panel, s = this.st.selection; return pn && pn.scope === 'sel' && s ? s : [0, this.len()]; }
    displayModel() {
      const p = this.proj(), base = flatten(this.ps(), p.src), pn = this.st.panel;
      if (!pn || pn.ab === 'orig') return base;
      if (pn.tool === 'speed') return pn.phase === 'ready' ? resample(base, 1.25) : base;
      if (pn.tool !== 'denoise') return base;
      const sc = this.scopeRange(), r = DN[pn.level];
      const upto = pn.phase === 'ready' ? sc[1] : pn.phase === 'rendering' ? sc[0] + (sc[1] - sc[0]) * pn.progress : sc[0];
      if (upto <= sc[0]) return base;
      const nf = new Float32Array(base.L).fill(1), cs = new Float32Array(base.L).fill(1);
      for (let u = sc[0]; u < upto && u < base.L; u++) { nf[u] = r.res; cs[u] = r.keep; }
      return { L: base.L, cl: base.cl, no: base.no, key: base.key, nf, cs };
    }

    // ---- DOM
    build() {
      const r = this.root;
      r.classList.add('scr', this.live ? 'live' : 'static');
      r.innerHTML = `
        <div class="sb"><span>9:41</span><span class="sig"><i></i><span class="bat"></span></span></div>
        <div class="hdr">
          <button class="back" data-a="back" aria-label="回到音频库">${ic('ArrowBack', 22)}</button>
          <div class="ttl"><div class="name">周末采访</div><button class="vchip" data-a="versions"><span class="vtx"></span>${ic('ExpandMore', 14)}</button></div>
          <button class="export" data-a="export">${ic('FileDownload', 18)}<span>导出</span></button>
        </div>
        <div class="clk"><div class="time mono"></div><div class="clk-r"><div class="clk-row"><button class="spd" data-a="speed">1×</button><button class="tg sm" data-a="spectrum" aria-label="频谱视图">${ic('GraphicEq', 20)}</button></div><div class="total"></div></div></div>
        <div class="wave"><canvas></canvas>
          <div class="strip">
            <div class="hint">在波形上拖动选一段 · 双指缩放</div>
            <div class="pvchip"></div>
            <div class="drop selbar" role="toolbar" aria-label="选区操作"><div class="dbg"></div><div class="darr"></div><div class="drow">
              <button class="acc" data-a="keep">保留</button><button data-a="delete">删除</button><button data-a="move">移动</button><button data-a="fade">淡化</button><button data-a="more" aria-label="更多选区操作">${ic('MoreHoriz', 20)}</button>
            </div></div>
            <div class="drop paste"><div class="dbg"></div><div class="darr"></div><div class="drow">
              <button class="pst" data-a="paste">${ic('ContentPaste', 18)}<span class="pl"></span></button><span class="sep"></span><button class="x" data-a="clipx" aria-label="清空剪贴板">${ic('Close', 18)}</button>
            </div></div>
            <div class="bubble"></div>
          </div>
          <div class="coach">${ic('Drag', 16)}<span>按住选区，拖到别处</span></div>
          <div class="press"></div><div class="finger"></div>
        </div>
        <div class="trn">
          <button class="tg" data-a="loop" aria-label="循环">${ic('Repeat', 22)}</button>
          <button class="play" data-a="play" aria-label="播放"></button>
          <button class="tg" data-a="onlysel" aria-label="只听选区">${ic('CropFree', 22)}</button>
        </div>
        <div class="hist"><div class="hh"><b>改动</b><span>点一步回到那里</span><button class="cbtn" data-a="undo" aria-label="撤销">${ic('Undo', 20)}</button><button class="cbtn" data-a="redo" aria-label="重做">${ic('Redo', 20)}</button></div><div class="hl"></div></div>
        <div class="cmp">
          <div class="scope"><span class="sl">说的话改动</span><div class="seg acc" data-seg="cscope"><span class="si"></span><button class="w16 a" data-a="cscope" data-v="sel"></button><button data-a="cscope" data-v="all">整段</button></div></div>
          <div class="irow"><button class="toolsbtn" data-a="tools" aria-label="全部工具">${ic('GridView', 25)}</button>
            <div class="input">${this.live ? '<input data-in="say" aria-label="说一句要怎么改">' : '<span class="ph"></span>'}<span class="mic">${ic('Mic', 22)}</span><button class="send" data-a="send" aria-label="看看会怎么改">${ic('ArrowUpward', 20)}</button></div></div>
        </div>
        <div class="panel"></div>
        <div class="snack"><span class="tx"></span><button data-a="snackact"></button></div>
        <div class="toast"></div>
        <div class="scrim" data-a="sclose"></div>
        <div class="sheet"></div>
        <div class="nb"><i></i></div>`;
      const q = s => r.querySelector(s);
      this.waveEl = q('.wave'); this.cv = q('canvas'); this.ctx = this.cv.getContext('2d');
      this.selbar = q('.selbar'); this.pastebar = q('.paste'); this.bubble = q('.bubble'); this.coach = q('.coach');
      this.hintEl = q('.hint'); this.pv = q('.pvchip'); this.panelEl = q('.panel'); this.sheetEl = q('.sheet'); this.scrimEl = q('.scrim');
      this.snackEl = q('.snack'); this.toastEl = q('.toast'); this.timeEl = q('.clk .time'); this.pressEl = q('.press'); this.fingerEl = q('.finger');
      const ph = q('.input .ph'); if (ph) ph.textContent = '比如：保留 10 到 40 秒，两端淡化 0.3 秒';
      const inp = q('.input input'); if (inp) inp.placeholder = '比如：保留 10 到 40 秒，两端淡化 0.3 秒';
    }

    colors() {
      const cs = getComputedStyle(this.root), g = n => cs.getPropertyValue(n).trim();
      this.C = { bg: g('--bg'), wave: g('--wave'), waveDim: g('--wave-dim'), sel: g('--sel'), selEdge: g('--sel-edge'), playhead: g('--playhead'),
        outline: g('--outline'), faint: g('--faint'), accent: g('--accent'), surface: g('--surface'), raised: g('--raised'), shade: g('--shade'), on: g('--on') };
    }

    resize() {
      const w = this.waveEl.clientWidth, h = this.waveEl.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      this.W = w; this.H = h; this.dpr = dpr;
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
      this.colors();
      this.layoutWidgets(true);
      if (this.after) { const f = this.after; this.after = null; f(this); }
      this.draw();
    }

    stripH() { return this.root.classList.contains('pmx') ? 8 : this.st.panel ? 40 : 60; }
    rulerH() { return this.root.classList.contains('pmx') ? 0 : 22; }

    // ---- chrome
    render(first) {
      const st = this.st, p = this.proj(), r = this.root, L = this.len();
      r.querySelector('.name').textContent = '周末采访';
      const vtx = r.querySelector('.vtx'), label = this.verLabel(p);
      if (vtx.textContent !== label) {
        vtx.textContent = label;
        if (!first && this.live) { vtx.classList.remove('swap'); void vtx.offsetWidth; vtx.classList.add('swap'); const ch = r.querySelector('.vchip'); ch.classList.add('flash'); setTimeout(() => ch.classList.remove('flash'), 900); }
      }
      this.timeEl.textContent = clock(st.playhead, true);
      r.querySelector('.total').textContent = '共' + NB + clock(L, true);
      r.querySelector('[data-a=loop]').classList.toggle('on', !!st.loop);
      r.querySelector('[data-a=onlysel]').classList.toggle('on', !!(st.onlySel && st.selection));
      r.querySelector('[data-a=play]').innerHTML = ic(this.playing ? 'Pause' : 'PlayArrow', 32);
      // undo / redo
      r.querySelector('[data-a=undo]').classList.toggle('dis', !(p.idx > 0 || p.parent));
      r.querySelector('[data-a=redo]').classList.toggle('dis', !(p.idx < p.hist.length - 1 || this.redoChild()));
      this.renderHistory(first);
      // composer scope
      const sel = st.selection;
      const cs = r.querySelector('[data-seg=cscope]'), bs = cs.querySelectorAll('button');
      const onSel = !!sel && st.cscope !== 'all';
      bs[0].textContent = sel ? `选区 ${compact(sel[0])}–${compact(sel[1])}` : '选区';
      bs[0].classList.toggle('on', onSel); bs[0].classList.toggle('dim', !sel); bs[1].classList.toggle('on', !onSel); cs.classList.toggle('sel-on', onSel);
      // panel
      r.classList.toggle('pm', !!st.panel);
      r.classList.toggle('pmx', !!(st.panel && st.panel.more));
      if (st.panel) this.panelEl.innerHTML = this.panelHtml(); else this.panelEl.innerHTML = '';
      // sheet
      if (st.sheet) { this.sheetEl.innerHTML = this.sheetHtml(); this.sheetEl.classList.add('show'); this.scrimEl.classList.add('show'); }
      else { this.sheetEl.classList.remove('show'); this.scrimEl.classList.remove('show'); }
      // snackbar
      if (st.snack) {
        this.snackEl.querySelector('.tx').textContent = st.snack.text;
        const b = this.snackEl.querySelector('button'); b.textContent = st.snack.act || ''; b.style.display = st.snack.act ? '' : 'none';
        if (!this.snackEl.classList.contains('show')) this.snackEl.classList.add('show');
        this.snackEl.style.bottom = st.panel ? (this.panelEl.offsetHeight + 12) + 'px' : '';
      } else this.snackEl.classList.remove('show');
      // preview chip
      const pn = st.panel;
      if (pn && (pn.tool === 'denoise' || pn.tool === 'speed' || pn.tool === 'fx') && !pn.more) {
        const after = pn.ab === 'after';
        this.pv.innerHTML = `<span class="dotp"></span>${after ? (pn.phase === 'ready' ? '预览：处理后' : '预览：正在生成') : '原声'}`;
        this.pv.className = 'pvchip show' + (after ? '' : ' orig');
      } else this.pv.className = 'pvchip';
      this.layoutWidgets(first || !this.live);
      this.kick();
    }

    renderHistory(first) {
      const rows = this.histRows(), hl = this.root.querySelector('.hl');
      const prevNow = this._nowKey;
      let html = '', i = 0;
      const items = rows.filter(x => !x.sep);
      rows.forEach(row => {
        if (row.sep) { html += `<div class="hsep">${row.sep}</div>`; return; }
        const k = items.indexOf(row);
        const cls = ['hr', 'k-' + row.kind, k === 0 ? 'first' : '', k === items.length - 1 ? 'last' : ''];
        const key = row.pid + ':' + row.i + ':' + row.label;
        if (row.kind === 'now') { this._nowKey = key; if (!first && this.live && prevNow !== key && row.fresh) cls.push('newrow'); }
        html += `<button class="${cls.join(' ')}" data-a="hist" data-p="${row.pid}" data-i="${row.i}"><span class="rail"><i></i></span><span class="lt">${row.label}</span>${row.ver ? `<span class="vb">${ic('Layers', 12)}第${NB}${row.ver}${NB}版</span>` : ''}<span class="ld">${row.kind === 'now' ? '现在' : row.kind === 'redo' ? '可重做' : ''}</span></button>`;
        i++;
      });
      hl.innerHTML = html;
      // keep "now" in view
      const now = hl.querySelector('.k-now');
      if (now) { const top = now.offsetTop - hl.offsetTop; if (top > hl.clientHeight - 40 || top < hl.scrollTop) hl.scrollTop = Math.max(0, top - 36); }
    }

    histRows() {
      const p = this.proj(), rows = [];
      const child = this.redoChild();
      if (child) for (let i = child.hist.length - 1; i >= 0; i--) rows.push({ pid: child.id, i, label: child.hist[i].label, kind: 'redo', ver: i === 0 ? child.n : null });
      for (let i = p.hist.length - 1; i >= 0; i--) {
        const kind = i > p.idx ? 'redo' : i === p.idx ? 'now' : 'past';
        rows.push({ pid: p.id, i, label: p.hist[i].label, kind, ver: i === 0 && p.parent ? p.n : null, fresh: i === p.hist.length - 1 });
      }
      if (p.parent) {
        const par = this.byId(p.parent);
        rows.push({ sep: `第${NB}${par.n}${NB}版 · ${par.origin}` });
        for (let i = p.parentIdx; i >= 0; i--) rows.push({ pid: par.id, i, label: par.hist[i].label, kind: 'past' });
      }
      return rows;
    }
    redoChild() {
      const r = this.fam.redo; if (!r) return null;
      const ch = this.byId(r.id), p = this.proj();
      return ch && ch.parent === p.id && p.idx === ch.parentIdx ? ch : null;
    }

    // ---- panel
    panelHtml() {
      const pn = this.st.panel, sel = this.st.selection, p = this.proj(), next = this.fam.projects.length + 1;
      const scope = () => {
        const lab = sel ? `选区 ${compact(sel[0])}–${compact(sel[1])}` : '选区';
        return `<div class="scope"><span class="sl">处理范围</span><div class="seg acc ${pn.scope === 'sel' && sel ? 'sel-on' : ''}" data-seg="scope"><span class="si"></span><button class="w16 a ${pn.scope === 'sel' && sel ? 'on' : ''} ${sel ? '' : 'dim'}" data-a="scope" data-v="sel">${lab}</button><button class="${pn.scope === 'sel' && sel ? '' : 'on'}" data-a="scope" data-v="all">整段</button></div></div>`;
      };
      const head = (icon, t, s) => `<div class="pn-h"><div class="itile" style="--c:var(--lane0)">${ic(icon, 22)}</div><div class="pn-tt"><div class="pn-t">${t}</div><div class="pn-s">${s}</div></div><button class="cb" data-a="pclose" aria-label="关闭">${ic('Close', 20)}</button></div>`;
      const more = (open, summary) => `<button class="more" data-a="pmore">${ic('Tune', 18)}<span>更多设置</span><span class="ms">${summary || ''}</span>${ic('ExpandMore', 20, 'chev' + (open ? ' up' : ''))}</button>`;
      let body = '';
      if (pn.tool === 'denoise') {
        body = head('GraphicEq', '本地降噪', '去掉底噪和嘶嘶声') + scope() +
          `<div class="pn-b">${stopsHtml('dn', 5, pn.level, DN_NAMES.map(x => '力度：' + x), '保留细节', '更干净')}</div>`;
      } else if (pn.tool === 'speed') {
        body = head('Speed', '变速与变调', '改快慢，可以不变音高') + scope() +
          `<div class="pn-b"><div class="ba"><span class="b0 mono">45${NB}秒</span>${ic('ArrowForward', 18)}<span class="b1 mono">36${NB}秒</span><span class="bn">1.25×</span></div>
           ${stopsHtml('sp', 6, 3, ['0.5×', '0.75×', '1×', '1.25×', '1.5×', '2×'], '更慢', '更快')}
           <div class="swr"><div class="sw-t"><b>保持音高</b><span>只改变快慢，声音高低不变</span></div><span class="switch on"></span></div>
           ${more(false, '')}</div>`;
      } else if (pn.tool === 'fx') {
        const presets = ['人声清晰', '播客', '小房间', '大厅', '回声', '合唱', '温暖失真'];
        const ch = `<div class="choices" style="grid-template-columns:repeat(3,1fr)">${presets.map((x, i) => `<button class="choice ${i === 0 ? 'on' : ''}"><b>${x}</b></button>`).join('')}</div>`;
        const stage = (n, name, on, open) => `<div class="fxrow"><div class="fx-h"><span class="fx-n mono">${n}</span><span class="fx-t"><b>${name}</b><span>${open ? '点按收起' : '点按设置参数'}</span></span><span class="pill ${on ? 'on' : ''}">${on ? '已启用' : '未启用'}</span><span class="mini-cb ${n === 1 ? 'dis' : ''}">${ic('ArrowUpward', 18)}</span><span class="mini-cb">${ic('ArrowDownward', 18)}</span></div>${open ? open : ''}</div>`;
        const sl = (name, val, f) => `<div class="lsl"><div class="lsl-h"><span>${name}</span><b>${val}</b></div><div class="tr"><s style="left:50%"></s><i style="left:${Math.min(50, f)}%;width:${Math.abs(f - 50)}%"></i><u style="left:${f}%"></u></div></div>`;
        const eq = sl('低频' + NB + '200' + NB + 'Hz', '-3.0' + NB + 'dB', 37.5) + sl('中频' + NB + '1' + NB + 'kHz', '2.0' + NB + 'dB', 58.3) + sl('高频' + NB + '4' + NB + 'kHz', '3.0' + NB + 'dB', 62.5);
        body = head('AutoAwesome', '音频效果', '让声音更清楚、有空间感或回声') + scope() +
          `<div class="pn-b">${ch}${more(pn.more, '均衡、压缩、限制')}${pn.more ? `<div class="mbox"><div class="chain"><span>效果链 · 从上到下依次处理</span></div>
            ${stage(1, '均衡', true, eq)}${stage(2, '压缩', true)}${stage(3, '限制', true)}${stage(4, '混响', false)}${stage(5, '回声', false)}${stage(6, '滤波', false)}${stage(7, '合唱', false)}${stage(8, '镶边', false)}${stage(9, '失真', false)}
            <div class="hintx">处理不会延长结果，混响和回声的尾音可能在结尾被截断。</div></div>` : ''}</div>`;
      }
      return body + this.panelFoot(next, p.n);
    }
    panelFoot(next, cur) {
      const pn = this.st.panel, ready = pn.phase === 'ready', L = this.displayModel().L;
      const playing = this.playing || pn.playing;
      const st = this.statusOf();
      return `<div class="pn-f">
        <div class="listen"><button class="play sm" data-a="pplay" aria-label="播放">${ic(playing ? 'Pause' : 'PlayArrow', 22)}</button><span class="lt mono" data-live="ltime">${clock(this.st.playhead, false)} / ${clock(L, false)}</span>
          <div class="seg" data-seg="ab"><span class="si"></span><button class="${pn.ab === 'after' ? 'on' : ''}" data-a="ab" data-v="after">处理后</button><button class="${pn.ab === 'orig' ? 'on' : ''}" data-a="ab" data-v="orig">原声</button></div></div>
        <div class="status"><span class="rg">${st.ring}</span><span class="stx">${st.text}</span>${st.act ? `<button class="sa" data-a="${st.a}">${st.act}</button>` : ''}</div>
        <div class="bpair"><button class="btn sec" data-a="pclose">放弃</button><button class="btn pri ${ready ? '' : 'dis'}" data-a="papply">应用</button></div>
        <div class="foot">应用后存为第${NB}${next}${NB}版；第${NB}${cur}${NB}版不变，撤销就能回来</div></div>`;
    }
    statusOf() {
      const pn = this.st.panel;
      if (pn.phase === 'rendering') return { ring: ringSvg(pn.progress, false), text: `正在更新预览… ${Math.round(pn.progress * 100)}%`, act: '取消', a: 'pcancel' };
      if (pn.phase === 'ready') return { ring: ringSvg(1, true), text: `预览已更新 · ${dur(this.displayModel().L)}`, act: (this.playing || pn.playing) ? '暂停' : '试听', a: 'pplay' };
      return { ring: ic('Info', 18), text: '设置好后，这里会出现预览' };
    }

    // ---- sheets
    sheetHtml() {
      const st = this.st, sh = st.sheet, sel = st.selection;
      const body = inner => `<div class="sh-b">${inner}</div>`;
      if (sh === 'tools') {
        const recent = [PROC_TOOLS[0], CUT_TOOLS[0], PROC_TOOLS[2], CUT_TOOLS[2]];
        const search = this.live ? `<input data-in="q" placeholder="找工具，或者直接说要做什么" value="${st.q || ''}">` : `<span class="${st.q ? 'q' : 'ph'}" style="${st.q ? '' : 'color:var(--faint)'}">${st.q || '找工具，或者直接说要做什么'}</span>`;
        const root = `<div class="tg-h"><b>最近用过</b></div>${grid(recent)}
          <div class="tg-h"><b>剪辑</b><span>直接改这一版，可撤回</span></div>${grid(CUT_TOOLS)}
          <button class="wrow" data-a="page" data-v="process" style="--c:var(--lane0)"><span class="wi">${ic('GraphicEq', 22)}</span><span class="wx"><b>处理声音</b><span>降噪、修复、音量拉齐、变速…</span><span>在波形下面调，不换页</span></span>${ic('KeyboardArrowRight', 22, 'chv')}</button>
          <button class="wrow" data-a="page" data-v="create" style="--c:var(--lane1)"><span class="wi">${ic('AutoAwesome', 22)}</span><span class="wx"><b>用这段音频创作</b><span>配乐、多轨、串烧、字幕配音…</span><span>打开新页面</span></span>${ic('KeyboardArrowRight', 22, 'chv')}</button>`;
        return shHead('工具') + body(`<div class="search">${ic('Search', 22)}${search}</div><div class="sres">${st.q ? searchResults(st.q) : root}</div>`);
      }
      if (sh === 'process') {
        return shHead('处理声音', '在波形下面调，试听满意再应用；原来的版本留着', 'back-tools') + body(
          `<div class="note-line">${ic('Info', 16)}<span>有选区时只处理选区，在面板里可以改成整段。</span></div>
           <div class="tg-h"><b>处理</b><span>存为新版本，可撤销</span></div>${grid(PROC_TOOLS)}
           <div class="tg-h"><b>找出来再决定</b><span>标在波形上，逐个选</span></div>${grid(FIND_TOOLS)}`);
      }
      if (sh === 'create') {
        return shHead('用这段音频创作', '会做出一段新的音频，在单独的页面里完成；这段音频不变', this.st.sheetFrom === 'direct' ? null : 'back-tools') + body(
          CREATE_TOOLS.map(t => `<button class="ar" data-a="tool" data-k="${t.k}"><span class="itile" style="--c:var(${t.c})">${ic(t.i, 22)}</span><span class="ar-x"><span class="ar-t">${t.n}${t.nc ? ' <span class="pill nc">未接通</span>' : ''}</span><span class="ar-d" style="display:block">${t.d}</span></span>${ic('KeyboardArrowRight', 22, 'chv')}</button>`).join('') +
          `<div class="note-line">${ic('Info', 16)}<span>这些也在音频库的「新建」里。</span></div>`);
      }
      if (sh === 'more' && sel) {
        return shHead('更多选区操作', `${compact(sel[0])}–${compact(sel[1])} · ${dur(sel[1] - sel[0])}`) + body(
          `<div class="qtiles"><button class="qt" data-a="copy">${ic('ContentCopy', 22)}复制</button><button class="qt" data-a="cut">${ic('ContentCut', 22)}剪切</button><button class="qt" data-a="dup">${ic('Repeat', 22)}重复一遍</button><button class="qt" data-a="gain">${ic('VolumeUp', 22)}调这段的音量</button></div>` +
          ar('Straighten', '精确时间', null, 'stub') + ar('Waves', '边缘吸附到过零点', null, 'stub') +
          ar('Timer', '对齐节拍', '在波形上标出节拍，把选区对齐到拍子上', 'stub') + ar('FileDownload', '只导出这一段', null, 'stub') + ar('Close', '取消选择', null, 'clearsel'));
      }
      if (sh === 'move' && sel) {
        const inside = st.playhead > sel[0] && st.playhead < sel[1];
        return shHead('移动到…', `已选 ${compact(sel[0])}–${compact(sel[1])}（${dur(sel[1] - sel[0])}）`) + body(
          ar('ArrowBack', '移到开头', '放在最前面', 'mv:start') + ar('ArrowForward', '接到结尾', '放在最后面', 'mv:end') +
          ar('Playhead', '移到播放头处', inside ? '播放头在选区里面，先把它放到别处' : '插在播放头这里，后面的顺延', 'mv:ph', compact(st.playhead), inside ? 'dim' : '') +
          `<div class="tg-h"><b>指定位置</b></div>
           <div class="field"><span class="fu">移动后从</span>${this.live ? '<input data-in="mvt" value="27.0" inputmode="decimal" aria-label="秒">' : '<span class="fv">27.0</span>'}<span class="fu">秒开始</span></div>
           <button class="btn pri" data-a="mv:t">移动</button>
           <div class="note-line">${ic('Drag', 16)}<span>下次可以直接按住选区，拖到想放的地方。也可以说一句：“把选区移到结尾”。</span></div>`);
      }
      if (sh === 'insert') {
        const clip = st.clipboard;
        return shHead(`在 ${compact(st.playhead)} 插入`, '插入点之后的内容整体顺延') + body(
          ar('ContentPaste', '粘贴', clip ? `剪贴板里的 ${dur(clip.len)}，来自这段音频` : '还没有复制。先选一段，在「⋯」里复制或剪切', clip ? 'paste' : 'noclip', '改这一版', clip ? '' : 'dim') +
          `<div>${ar('SpaceBar', '一段静音', '音频会变长，可以撤回', 'noop', '改这一版')}
             <div style="display:flex;gap:10px;align-items:center;padding-left:40px"><div class="seg" data-seg="sil"><span class="si"></span><button>0.5${NB}秒</button><button class="on">1${NB}秒</button><button>2${NB}秒</button><button>5${NB}秒</button></div><button class="btn pri sm" data-a="silence">插入</button></div></div>
           <div class="divider"></div>` +
          ar('Mic', '录一段', '录完放在这里', 'newver', '存为新版本') + ar('LibraryMusic', '音频库里的', '另一段音频', 'newver', '存为新版本') + ar('AudioFile', '手机里的文件', null, 'newver', '存为新版本') +
          `<div class="note-line">${ic('Info', 16)}<span>放进别的声音会存成新的一版（这一版留着），也在波形下面调位置、试听。</span></div>`);
      }
      if (sh === 'versions') {
        const rows = this.fam.projects.map(v => {
          const cur = v.id === this.fam.cur;
          const edits = v.idx - 0;
          return `<div class="ver ${cur ? 'cur' : ''} ${v.parent ? 'child' : ''}"><span class="minw"></span><span class="vx"><b>${this.verLabel(v)}</b><span>${cur ? '正在编辑 · ' : ''}${edits ? edits + NB + '处改动' : '没有改动'}</span></span><button class="cb" data-a="vplay" aria-label="试听">${ic('PlayArrow', 20)}</button></div>`;
        }).reverse().join('');
        return shHead('版本', '每处理一次就留下一版，原始音频一直都在') + body(rows +
          `<div class="note-line">${ic('Info', 16)}<span>撤销一次处理会回到上一版；处理出的那一版仍在这里，删不删由你。</span></div>`);
      }
      return shHead('') + body('');
    }

    // ---- floating widgets: selection bar, paste pill, bubble, coach, segmented indicators, stops
    layoutWidgets(snap) {
      // segmented indicators
      this.root.querySelectorAll('.seg').forEach(seg => {
        const key = seg.dataset.seg || 'x', on = seg.querySelector('button.on'), si = seg.querySelector('.si');
        if (!si) return;
        if (!on) { si.style.opacity = '0'; return; }
        si.style.opacity = '1';
        const l = on.offsetLeft, w = on.offsetWidth;
        let sp = this.spans.get('seg:' + key);
        if (!sp) { sp = new FlowSpan(0.3); this.spans.set('seg:' + key, sp); }
        if (snap || !this.live || !sp.placed) sp.snap(l, l + w); else sp.to(l, l + w);
        sp.el = si;
      });
      // stops sliders
      this.root.querySelectorAll('.stops').forEach(sw => {
        const key = sw.dataset.stops, n = +sw.dataset.n, sel = +sw.dataset.sel, t = sw.querySelector('.st-t');
        const w = t.clientWidth, pad = 18, cx = k => pad + (w - 2 * pad) * (n > 1 ? k / (n - 1) : 0);
        t.querySelectorAll('.st-dot').forEach((d, k) => { d.style.left = cx(k) + 'px'; });
        t.querySelectorAll('.st-hit').forEach((d, k) => { d.style.left = cx(k) + 'px'; });
        let sp = this.spans.get('stops:' + key);
        if (!sp) { sp = new FlowSpan(0.3); this.spans.set('stops:' + key, sp); }
        const c = cx(sel);
        if (snap || !this.live || !sp.placed) sp.snap(c - 13, c + 13); else sp.to(c - 13, c + 13);
        sp.el = t.querySelector('.st-drop'); sp.fill = t.querySelector('.st-fill'); sp.dots = t.querySelectorAll('.st-dot'); sp.pad = pad; sp.cx = cx;
      });
      this.paintWidgets();
    }
    paintWidgets() {
      this.spans.forEach(sp => {
        if (!sp.el || !sp.el.isConnected) return;
        const a = sp.a.v, b = sp.b.v;
        sp.el.style.left = a + 'px'; sp.el.style.width = Math.max(0, b - a) + 'px';
        if (sp.fill) {
          const mid = (a + b) / 2;
          sp.fill.style.width = Math.max(0, mid - sp.pad) + 'px';
          sp.dots.forEach((d, k) => d.classList.toggle('on', sp.cx(k) <= mid + 1));
        }
      });
      if (this.st.panel) this.panelEl.style.transform = this.panelY.v ? `translateY(${this.panelY.v}px)` : '';
    }

    /** Live screens flow to a new value; still screens show where it lands. */
    aim(s, v, p) { if (this.live) s.to(v, p); else s.snap(v); }
    placeFloats(ppu) {
      const st = this.st, W = this.W;
      // selection bar: a drop that forms on the selection (EditorScreen.WaveArea)
      const showBar = !!st.selection && !st.panel && !this.drag && !(this.g && this.g.mode === 'select') && !(this.g && this.g.mode === 'edge');
      const barW = Math.min(300, W - 16);
      if (st.selection && showBar) {
        const c = (st.selection[0] + st.selection[1]) / 2 * ppu;
        const left = clamp(c - barW / 2, 8, Math.max(8, W - barW - 8));
        this.lastBar = { left, arrow: clamp(c - left, 22, barW - 22) };
      }
      this.aim(this.selOpen.l, showBar ? 1 : 0, showBar ? P.trail : P.move); this.aim(this.selOpen.r, showBar ? 1 : 0, showBar ? P.lead : P.move);
      setDrop(this.selbar, this.lastBar.left, barW, this.lastBar.arrow, this.selOpen.l.v, this.selOpen.r.v);
      // paste pill: offered at the playhead while the clipboard holds something
      const showPaste = !!st.clipboard && !st.selection && !st.panel && !this.drag && !this.playing && !(this.g && this.g.mode === 'select');
      const pw = 158;
      const px = st.playhead * ppu;
      const pl = clamp(px - pw / 2, 8, W - pw - 8);
      this.pastebar.querySelector('.pl').textContent = st.clipboard ? '粘贴' + NB + dur(st.clipboard.len) : '';
      this.aim(this.pasteOpen.l, showPaste ? 1 : 0, showPaste ? P.trail : P.move); this.aim(this.pasteOpen.r, showPaste ? 1 : 0, showPaste ? P.lead : P.move);
      setDrop(this.pastebar, pl, pw, clamp(px - pl, 22, pw - 22), this.pasteOpen.l.v, this.pasteOpen.r.v);
      // hint and coach
      this.hintEl.classList.toggle('off', !!(st.selection || st.panel || this.drag || showPaste || (this.g && this.g.mode === 'select')));
      const coach = st.coach && st.selection && !st.panel && !this.drag && !(this.g && this.g.mode);
      if (coach) {
        const c = (st.selection[0] + st.selection[1]) / 2 * ppu;
        this.coach.style.left = clamp(c, 80, W - 80) + 'px'; this.coach.style.top = (this.stripH() + 10) + 'px';
      }
      this.coach.classList.toggle('show', !!coach);
    }

    // ---- animation loop
    kick() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(t => this.frame(t)); } }
    frame(t) {
      this.raf = 0;
      const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000)); this.last = t;
      let busy = false;
      for (const s of [this.selOpen.l, this.selOpen.r, this.pasteOpen.l, this.pasteOpen.r, this.ampMix, this.panelY]) busy = s.step(dt) || busy;
      this.spans.forEach(sp => { busy = sp.step(dt) || busy; });
      if (this.ca) { const a = this.ca.dx.step(dt), b = this.ca.g.step(dt); if (!a && !b) this.ca = null; else busy = true; }
      if (this.drag) busy = this.stepDrag(dt) || busy;
      const pn = this.st.panel;
      if (this.live && pn && pn.phase === 'rendering') {
        pn.progress = Math.min(1, pn.progress + dt / (pn.scope === 'sel' && this.st.selection ? 1.8 : 3.4));
        if (pn.progress >= 1) { pn.phase = 'ready'; this.render(); }
        else { const s = this.statusOf(), el = this.panelEl.querySelector('.status'); if (el) { el.querySelector('.rg').innerHTML = s.ring; el.querySelector('.stx').textContent = s.text; } }
        busy = true;
      }
      if (this.playing) { busy = this.stepPlay(dt) || busy; }
      this.paintWidgets();
      this.draw();
      // Targets set while drawing (the selection bar forming) keep the loop going.
      const pending = [this.selOpen.l, this.selOpen.r, this.pasteOpen.l, this.pasteOpen.r, this.ampMix, this.panelY].some(s => s.busy) ||
        Array.from(this.spans.values()).some(sp => sp.a.busy || sp.b.busy);
      if ((busy || pending) && this.live) this.raf = requestAnimationFrame(tt => this.frame(tt));
    }

    stepPlay(dt) {
      const st = this.st, L = this.len();
      const range = st.onlySel && st.selection ? st.selection : [0, L];
      st.playhead += dt * 1000 / UNIT;
      if (st.playhead >= range[1]) {
        if (st.loop) st.playhead = range[0];
        else { st.playhead = range[1]; this.setPlaying(false); return false; }
      }
      this.timeEl.textContent = clock(st.playhead, true);
      const lt = this.panelEl.querySelector('[data-live=ltime]');
      if (lt) lt.textContent = `${clock(st.playhead, false)} / ${clock(this.displayModel().L, false)}`;
      return true;
    }
    setPlaying(on) {
      const st = this.st;
      if (on) {
        const L = this.len(), range = st.onlySel && st.selection ? st.selection : [0, L];
        if (st.playhead >= range[1] - 1 || st.playhead < range[0]) st.playhead = range[0];
      }
      this.playing = on;
      this.render();
    }

    // ---- drawing
    draw() {
      const ctx = this.ctx, W = this.W, H = this.H;
      if (!W || !H || !this.C) return;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const strip = this.stripH(), ruler = this.rulerH(), top = strip, wh = H - strip - ruler;
      if (wh <= 4) return;
      const mid = top + wh / 2, amp = wh / 2 * 0.92;
      if (this.drag) { this.drawDrag(ctx, W, top, wh, mid, amp, ruler); return; }
      const C = this.C, st = this.st, pn = st.panel, sel = st.selection;
      const m = this.displayModel(), L = m.L, ppu = W / L;
      const n = Math.max(1, Math.floor(W / 3)), colW = W / n;
      if (this.ca && this.ca.dx.n !== n) this.ca = null;
      this.drawRuler(ctx, L, ppu, top + wh, ruler);
      const speedView = pn && pn.tool === 'speed' && pn.ab === 'after' && pn.phase === 'ready';
      const scope = pn ? (pn.scope === 'sel' && sel ? sel : null) : sel;
      if (sel && !speedView) { ctx.fillStyle = C.sel; ctx.fillRect(sel[0] * ppu, top, (sel[1] - sel[0]) * ppu, wh); }
      if (!speedView) {
        ctx.save(); ctx.strokeStyle = C.outline; ctx.lineWidth = 1; ctx.setLineDash([8, 6]);
        for (const s of seamsOf(this.ps())) { const x = Math.round(s * ppu) + 0.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + wh); ctx.stroke(); }
        ctx.restore();
      }
      // columns
      const pk = this.pk && this.pk.length === n ? this.pk : (this.pk = new Float32Array(n));
      const keys = this.keys && this.keys.length === n ? this.keys : (this.keys = new Int32Array(n));
      colPeaks(m, n, pk, keys);
      const mix = this.ampMix.v, old = this.oldPk && this.oldPk.length === n ? this.oldPk : null;
      ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, colW * 0.62);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) * L / n;
        let a = pk[i]; if (old && mix < 1) a = lerp(old[i], a, mix);
        let x = i * colW + colW / 2, g = 1;
        if (this.ca) { x += this.ca.dx.v[i]; g = this.ca.g.v[i]; }
        const inScope = !scope || speedView || (u >= scope[0] && u < scope[1]);
        ctx.strokeStyle = inScope ? C.wave : C.waveDim;
        const hi = Math.max(a, 0.012) * amp * g, lo = Math.max(a, 0.012) * (0.8 + 0.2 * hash01(keys[i])) * amp * g;
        ctx.beginPath(); ctx.moveTo(x, mid - hi); ctx.lineTo(x, Math.max(mid + lo, mid - hi + 1.5)); ctx.stroke();
      }
      this.lastPk = pk;
      // preview being made: a line sweeps across what is done
      if (pn && pn.phase === 'rendering' && pn.ab === 'after') {
        const sc = this.scopeRange(), x = (sc[0] + (sc[1] - sc[0]) * pn.progress) * ppu;
        ctx.fillStyle = C.accent; ctx.fillRect(Math.round(x) - 1, top - 4, 2, wh + 8);
        ctx.beginPath(); ctx.arc(x, top - 4, 4, 0, 7); ctx.fill();
      }
      // selection edges with grips
      if (sel && !speedView && !(this.g && this.g.mode === 'lift')) {
        for (const f of sel) {
          const x = f * ppu; if (x < -2 || x > W + 2) continue;
          ctx.fillStyle = C.selEdge; ctx.fillRect(x - 1, top, 2, wh);
          if (!pn) {
            const r = 9, cy = top + wh - r - 2;
            ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x, cy, r + 3, 0, 7); ctx.fill();
            ctx.fillStyle = C.selEdge; ctx.beginPath(); ctx.arc(x, cy, r, 0, 7); ctx.fill();
          }
        }
      }
      // playhead
      const phx = (speedView ? st.playhead / 1.25 : st.playhead) * ppu;
      ctx.fillStyle = C.playhead; ctx.fillRect(Math.round(phx) - 1, top, 2, wh);
      this.placeFloats(ppu);
      this.bubble.classList.remove('show');
    }

    drawRuler(ctx, L, ppu, y0, h) {
      if (h <= 0) return;
      const W = this.W, ms = L * UNIT, raw = ms / Math.max(1, W / 80);
      const steps = [100, 200, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000];
      const step = steps.find(s => s >= raw) || 60000;
      ctx.font = '11px ui-monospace, "Roboto Mono", "Noto Sans Mono", monospace';
      ctx.fillStyle = this.C.faint; ctx.textBaseline = 'middle';
      for (let t = 0; t <= ms; t += step) {
        const label = clock(t / UNIT, false), w = ctx.measureText(label).width;
        ctx.fillText(label, clamp(t / UNIT * ppu - w / 2, 0, W - w), y0 + h / 2 + 2);
      }
    }

    // ---- moving a stretch: lift, drag, drop
    lift(x) {
      const st = this.st, [a, b] = st.selection, ps = this.ps(), L = this.len(), W = this.W, ppu = W / L;
      const rem = cutPieces(ps, a, b), clip = slicePieces(ps, a, b), p = this.proj();
      const remM = flatten(rem, p.src), clipM = flatten(clip, p.src);
      const n = Math.max(1, Math.floor(remM.L * ppu / 3));
      const d = {
        a, b, len: b - a, L, ppu, rem, clip, remM, clipM, n, gap: (b - a) * ppu, grab: x - a * ppu, ins: a, snapped: null,
        off: new ArrSpring(n, 0, P.col), cx: new Spring(a * ppu, P.lead, 0.3), lift: new Spring(0, P.grow, 0.003), slot: new FlowSpan(0.3), dropping: false,
        phRem: st.playhead >= b ? st.playhead - (b - a) : st.playhead >= a ? null : st.playhead,
      };
      const cw = remM.L * ppu / n;
      for (let i = 0; i < n; i++) { const xr = i * cw + cw / 2, o = xr >= a * ppu ? d.gap : 0; d.off.v[i] = d.off.t[i] = o; }
      d.slot.snap(a * ppu, b * ppu);
      d.lift.to(1, P.grow);
      this.drag = d;
      st.coach = false;
      buzz(12, this.live);
      this.kick();
    }
    dragTo(x) {
      const d = this.drag; if (!d || d.dropping) return;
      const left = x - d.grab;
      d.cx.snap(left);
      const remL = d.remM.L;
      let ins = clamp(left / d.ppu, 0, remL);
      const cands = [{ u: 0, name: '开头' }, { u: remL, name: '结尾' }].concat(seamsOf(d.rem).map(u => ({ u, name: '接缝' })));
      if (d.phRem !== null) cands.push({ u: d.phRem, name: '播放头' });
      let near = null, best = 12;
      for (const c of cands) { const dd = Math.abs(c.u * d.ppu - left); if (dd < best) { best = dd; near = c; } }
      if (near) { ins = near.u; if (d.snapped !== near.name + near.u) buzz(6, this.live); d.snapped = near.name + near.u; } else d.snapped = null;
      d.ins = Math.round(ins); d.near = near;
      this.retargetDrag();
      this.kick();
    }
    retargetDrag() {
      const d = this.drag, cw = d.remM.L * d.ppu / d.n, insX = d.ins * d.ppu;
      d.slot.to(insX, insX + d.gap);
      for (let i = 0; i < d.n; i++) { const xr = i * cw + cw / 2; d.off.t[i] = xr >= insX ? d.gap : 0; }
      d.off.active = true;
    }
    drop() {
      const d = this.drag; if (!d) return;
      d.dropping = true;
      d.cx.to(d.ins * d.ppu, P.lead); d.lift.to(0, P.move);
      this.kick();
    }
    stepDrag(dt) {
      const d = this.drag;
      let busy = false;
      for (const s of [d.cx, d.lift]) busy = s.step(dt) || busy;
      busy = d.slot.step(dt) || busy;
      busy = d.off.step(dt) || busy;
      if (d.dropping && Math.abs(d.cx.v - d.cx.t) < 0.6 && d.lift.v < 0.04) { this.finishDrop(); return true; }
      return busy || !d.dropping;
    }
    finishDrop() {
      const d = this.drag; this.drag = null;
      const st = this.st;
      if (d.ins === d.a) { st.selection = [d.a, d.b]; this.selOpen.l.snap(0); this.selOpen.r.snap(0); this.render(); return; }
      const ps = insertPieces(d.rem, d.ins, d.clip);
      this.commit(ps, `把 ${point(d.a)}–${point(d.b)} 移到 ${point(d.ins)}`, 'none');
      st.selection = [d.ins, d.ins + d.len];
      this.selOpen.l.snap(0); this.selOpen.r.snap(0);
      this.snack(`已移动到 ${compact(d.ins)}`, '撤销', () => this.undo());
    }
    drawDrag(ctx, W, top, wh, mid, amp, ruler) {
      const d = this.drag, C = this.C, ppu = d.ppu, rm = d.remM;
      this.drawRuler(ctx, d.L, ppu, top + wh, ruler);
      const n = d.n, cw = rm.L * ppu / n;
      const pk = new Float32Array(n), keys = new Int32Array(n);
      colPeaks(rm, n, pk, keys);
      // the slot where it will land
      const sa = d.slot.a.v, sb = d.slot.b.v;
      ctx.save();
      ctx.fillStyle = hexA(C.accent, 0.10); roundRect(ctx, sa + 1, top + 3, Math.max(0, sb - sa - 2), wh - 6, 10); ctx.fill();
      ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = C.accent; ctx.stroke();
      ctx.restore();
      // the rest of the audio, parting to make room
      ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, cw * 0.62);
      for (let i = 0; i < n; i++) {
        const x = i * cw + cw / 2 + d.off.v[i], a = Math.max(pk[i], 0.012);
        ctx.strokeStyle = C.waveDim;
        ctx.beginPath(); ctx.moveTo(x, mid - a * amp); ctx.lineTo(x, mid + a * (0.8 + 0.2 * hash01(keys[i])) * amp); ctx.stroke();
      }
      // where it came from: a small mark on the ruler
      const insX = d.ins * ppu, ox = d.a * ppu + (d.a * ppu >= insX && d.ins !== d.a ? d.gap : 0);
      if (d.ins !== d.a) {
        ctx.strokeStyle = C.faint; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(ox - 5, top + wh + 2); ctx.lineTo(ox + 5, top + wh + 2); ctx.lineTo(ox, top + wh + 8); ctx.closePath(); ctx.stroke();
      }
      // playhead stays with its audio
      if (d.phRem !== null) { const px = d.phRem * ppu + (d.phRem * ppu >= insX ? d.gap : 0); ctx.fillStyle = C.playhead; ctx.fillRect(Math.round(px) - 1, top, 2, wh); }
      // the lifted stretch
      const lift = d.lift.v, cx = d.cx.v, w = d.gap, y = top + 2 - 10 * lift, h = wh - 4;
      ctx.save();
      ctx.shadowColor = hexA('#000000', 0.32 * clamp(lift, 0, 1)); ctx.shadowBlur = 18 * lift; ctx.shadowOffsetY = 6 * lift;
      ctx.fillStyle = C.surface; roundRect(ctx, cx, y, w, h, 10); ctx.fill();
      ctx.restore();
      ctx.fillStyle = hexA(C.accent, 0.12); roundRect(ctx, cx, y, w, h, 10); ctx.fill();
      const cn = Math.max(1, Math.floor(w / 3)), ccw = w / cn, cp = new Float32Array(cn), ck = new Int32Array(cn);
      colPeaks(d.clipM, cn, cp, ck);
      const cmid = y + h / 2, camp = (h / 2) * 0.9 * (1 + 0.03 * lift);
      ctx.save(); roundRect(ctx, cx, y, w, h, 10); ctx.clip();
      ctx.lineWidth = Math.max(1, ccw * 0.62); ctx.strokeStyle = C.wave;
      for (let i = 0; i < cn; i++) {
        const x = cx + i * ccw + ccw / 2, a = Math.max(cp[i], 0.012);
        ctx.beginPath(); ctx.moveTo(x, cmid - a * camp); ctx.lineTo(x, cmid + a * (0.8 + 0.2 * hash01(ck[i])) * camp); ctx.stroke();
      }
      ctx.restore();
      ctx.lineWidth = 2; ctx.strokeStyle = C.accent; roundRect(ctx, cx, y, w, h, 10); ctx.stroke();
      // grip dots at the top of the lifted stretch
      ctx.fillStyle = C.accent;
      for (let k = -1; k <= 1; k++) for (const yy of [y + 8, y + 13]) { ctx.beginPath(); ctx.arc(cx + w / 2 + k * 5, yy, 1.6, 0, 7); ctx.fill(); }
      // bubble: where it will start
      const b = this.bubble;
      b.textContent = `放到 ${compact(d.ins)}` + (d.near ? ` · ${d.near.name}` : '');
      b.style.left = clamp(sa, 60, W - 60) + 'px';
      b.classList.add('show');
      setDrop(this.selbar, this.lastBar.left, Math.min(300, W - 16), this.lastBar.arrow, 0, 0);
      this.coach.classList.remove('show'); this.hintEl.classList.add('off');
    }
    /** A still frame of a drag (static screen). */
    freezeDrag(ins, fingerDx) {
      const sel = this.st.selection, ppu = this.W / this.len();
      this.lift(sel[0] * ppu + 30);
      const d = this.drag;
      d.lift.snap(1);
      this.dragTo(ins * ppu + 30);
      d.slot.snap(d.slot.a.t, d.slot.b.t);
      d.off.v.set(d.off.t); d.off.active = false;
      d.cx.snap(ins * ppu + fingerDx);
    }

    // ---- edits
    commit(ps, label, anim) {
      const p = this.proj(), old = this.flat();
      commitTo(p, ps, label);
      this.fam.redo = null;
      this.flowFrom(old, anim || 'pos');
      this.st.coach = false;
      this.render();
    }
    flowFrom(old, kind) {
      if (kind === 'none' || reduced() || !this.W) { this.ca = null; return; }
      const W = this.W, n = Math.max(1, Math.floor(W / 3));
      if (kind === 'amp' || !old) {
        if (this.lastPk && this.lastPk.length === n) { this.oldPk = Float32Array.from(this.lastPk); this.ampMix.snap(0).to(1, P.move); }
        this.kick(); return;
      }
      const m = this.flat(), oldPpu = W / old.L, map = new Map();
      for (let u = 0; u < old.L; u++) { const k = old.key[u]; if (k < 0) continue; const e = map.get(k); if (e === undefined) map.set(k, u); else if (Array.isArray(e)) e.push(u); else map.set(k, [e, u]); }
      const dx = new ArrSpring(n, 0, P.col), g = new ArrSpring(n, 1, P.col);
      for (let i = 0; i < n; i++) {
        const uNew = (i + 0.5) * m.L / n, k = m.key[Math.min(m.L - 1, Math.floor(uNew))];
        let uo = k >= 0 ? map.get(k) : undefined;
        if (Array.isArray(uo)) uo = uo.reduce((best, x) => (Math.abs(x - uNew) < Math.abs(best - uNew) ? x : best));
        if (uo === undefined) g.v[i] = 0; else dx.v[i] = (uo + 0.5) * oldPpu - (i + 0.5) * W / n;
      }
      dx.active = g.active = true;
      this.ca = { dx, g };
      this.kick();
    }
    undo() {
      const p = this.proj();
      if (p.idx > 0) {
        const old = this.flat(), label = p.hist[p.idx].label;
        p.idx--; this.flowFrom(old, 'pos'); this.clampPositions();
        this.snack(`已撤销：${label}`, '重做', () => this.redo()); return;
      }
      if (p.parent) {
        const par = this.byId(p.parent);
        this.fam.redo = { id: p.id };
        this.switchTo(par, p.parentIdx);
        this.snack(`已撤销：${p.origin}，回到第${NB}${par.n}${NB}版`, '重做', () => this.redo());
      }
    }
    redo() {
      const p = this.proj();
      if (p.idx < p.hist.length - 1) {
        const old = this.flat(); p.idx++; this.flowFrom(old, 'pos'); this.clampPositions();
        this.snack(`已重做：${p.hist[p.idx].label}`); return;
      }
      const ch = this.redoChild();
      if (ch) { this.switchTo(ch, 0); this.snack(`已重做：${ch.origin}，第${NB}${ch.n}${NB}版`); }
    }
    switchTo(proj, idx) {
      this.fam.cur = proj.id; proj.idx = idx;
      this.flowFrom(null, 'amp'); this.clampPositions(); this.render();
    }
    jump(pid, i) {
      const proj = this.byId(pid);
      if (proj === this.proj()) {
        if (i === proj.idx) return;
        const old = this.flat(); proj.idx = i; this.flowFrom(old, 'pos'); this.clampPositions(); this.render();
      } else {
        const cur = this.proj();
        if (cur.parent === pid) this.fam.redo = { id: cur.id };
        this.switchTo(proj, i);
      }
    }
    clampPositions() {
      const L = this.len(), st = this.st;
      st.playhead = clamp(st.playhead, 0, L);
      if (st.selection) { const a = clamp(st.selection[0], 0, L), b = clamp(st.selection[1], 0, L); st.selection = b - a >= 2 ? [a, b] : null; }
    }
    snack(text, act, fn) {
      this.st.snack = { text, act }; this.snackFn = fn;
      this.snackEl.classList.remove('show'); void this.snackEl.offsetWidth;
      this.render();
      clearTimeout(this.snackT);
      if (this.live) this.snackT = setTimeout(() => { this.st.snack = null; this.render(); }, 5200);
    }
    toast(text) {
      const t = this.toastEl; t.textContent = text; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
      clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('show'), 2600);
    }

    // ---- live interaction
    bindLive() {
      const r = this.root;
      r.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && r.contains(b)) this.act(b.dataset.a, b, e); });
      r.addEventListener('input', e => {
        const el = e.target;
        if (el.dataset.in === 'q') { this.st.q = el.value; const box = r.querySelector('.sres'); if (box) box.innerHTML = el.value.trim() ? searchResults(el.value) : this.sheetRootTools(); }
        if (el.dataset.in === 'say') r.querySelector('.send').classList.toggle('on', !!el.value.trim());
      });
      r.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.in === 'say') this.act('send'); });
      const cv = this.cv;
      cv.addEventListener('pointerdown', e => { if (e.button > 0) return; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* */ } const p = this.pt(e); this.pDown(p.x, p.y, e.pointerId); });
      cv.addEventListener('pointermove', e => { const p = this.pt(e); this.pMove(p.x, p.y, e.pointerId); });
      cv.addEventListener('pointerup', e => { const p = this.pt(e); this.pUp(p.x, p.y, e.pointerId); });
      cv.addEventListener('pointercancel', e => { const p = this.pt(e); this.pUp(p.x, p.y, e.pointerId, true); });
      cv.addEventListener('contextmenu', e => e.preventDefault());
    }
    sheetRootTools() {
      const save = this.st.q; this.st.q = '';
      const html = this.sheetHtml(); this.st.q = save;
      const tmp = document.createElement('div'); tmp.innerHTML = html;
      return tmp.querySelector('.sres').innerHTML;
    }
    pt(e) { const b = this.cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * (this.W / b.width), y: (e.clientY - b.top) * (this.H / b.height) }; }
    unitAt(x) { return clamp(Math.round(x / this.W * this.len()), 0, this.len()); }
    pDown(x, y, id) {
      if (this.drag || this.st.sheet) return;
      const st = this.st, ppu = this.W / this.len();
      this.g = { id, x0: x, y0: y, x, y, mode: 'pending' };
      if (st.selection && !st.panel) {
        // Timing decides, not position: a finger that stays still inside the selection lifts it, even next to an
        // edge (a short selection is mostly edge); one that moves first drags the edge or makes a new selection.
        const xa = st.selection[0] * ppu, xb = st.selection[1] * ppu, da = Math.abs(x - xa), db = Math.abs(x - xb);
        const edge = da < 22 && da <= db ? 0 : db < 22 ? 1 : -1;
        const inside = x > xa && x < xb && y > this.stripH() - 10;
        if (!inside && edge >= 0) { this.g.mode = 'edge'; this.g.edge = edge; this.render(); return; }
        if (inside) {
          this.g.mode = 'hold'; this.g.edge = edge;
          this.pressEl.style.left = x + 'px'; this.pressEl.style.top = y + 'px';
          this.pressEl.classList.remove('go'); void this.pressEl.offsetWidth; this.pressEl.classList.add('go');
          this.g.timer = setTimeout(() => { if (this.g && this.g.mode === 'hold') { this.g.mode = 'lift'; this.pressEl.classList.remove('go'); this.lift(this.g.x); } }, 420);
        }
      }
    }
    pMove(x, y, id) {
      const g = this.g; if (!g || g.id !== id) return;
      g.x = x; g.y = y;
      const d = Math.hypot(x - g.x0, y - g.y0);
      if (g.mode === 'hold' && d > 9) {
        clearTimeout(g.timer); this.pressEl.classList.remove('go');
        if (g.edge >= 0) { g.mode = 'edge'; this.render(); } else { g.mode = 'select'; this.st.selection = null; }
      }
      else if (g.mode === 'pending' && d > 9) { g.mode = 'select'; }
      if (g.mode === 'select') {
        const a = this.unitAt(g.x0), b = this.unitAt(x);
        this.st.selection = [Math.min(a, b), Math.max(a, b)]; this.st.coach = false;
        this.selOpen.l.snap(0); this.selOpen.r.snap(0);
        this.render(); this.draw();
      } else if (g.mode === 'edge') {
        const s = this.st.selection.slice(), u = this.unitAt(x);
        s[g.edge] = u; if (s[0] > s[1]) { s.reverse(); g.edge = 1 - g.edge; }
        this.st.selection = s; this.render(); this.draw();
      } else if (g.mode === 'lift') this.dragTo(x);
    }
    pUp(x, y, id, cancel) {
      const g = this.g; if (!g || g.id !== id) return;
      this.g = null;
      clearTimeout(g.timer); this.pressEl.classList.remove('go');
      const st = this.st;
      if (g.mode === 'lift') { this.drop(); return; }
      if (g.mode === 'select') {
        if (st.selection && st.selection[1] - st.selection[0] < 3) st.selection = null;
        if (st.panel) { st.panel.scope = st.selection ? 'sel' : 'all'; this.restartPreview(); }
        this.render(); return;
      }
      if (g.mode === 'edge') { this.render(); return; }
      if (cancel) { this.render(); return; }
      // a tap: move the playhead; outside the selection it lets go of it
      const u = this.unitAt(x);
      if (st.selection && !st.panel && (u < st.selection[0] || u > st.selection[1])) st.selection = null;
      st.playhead = u;
      this.render();
    }

    restartPreview() {
      const pn = this.st.panel; if (!pn) return;
      pn.phase = 'rendering'; pn.progress = 0; pn.ab = 'after';
    }

    openTool(k) {
      if (k !== 'denoise') { this.toast(k === 'speed' || k === 'fx' ? '同一种面板，见第 6 节的静态画面；本稿只把降噪做成了可操作' : '同一种面板；本稿只把降噪做成了可操作'); return; }
      this.st.sheet = null; this.st.snack = null;
      this.setPlaying(false);
      this.st.panel = { tool: 'denoise', scope: this.st.selection ? 'sel' : 'all', level: 2, phase: 'rendering', progress: 0, ab: 'after' };
      this.render();
      const h = this.panelEl.offsetHeight || 380;
      this.panelY.snap(h).to(0, P.panel);
      this.kick();
    }
    closePanel() {
      this.st.panel = null; this.setPlaying(false);
      ['.trn', '.hist', '.cmp'].forEach(s => { const el = this.root.querySelector(s); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'riseIn 0.42s cubic-bezier(0.05,0.7,0.1,1)'; });
      this.render();
    }
    applyPanel() {
      const pn = this.st.panel; if (!pn) return;
      if (pn.phase !== 'ready') { const s = this.panelEl.querySelector('.status'); s.classList.remove('pulse'); void s.offsetWidth; s.classList.add('pulse'); return; }
      const p = this.proj();
      if (this.lastPk) { this.oldPk = Float32Array.from(this.lastPk); }
      const v = processProject(this.fam, p, { level: pn.level, scope: pn.scope === 'sel' && this.st.selection ? this.st.selection.slice() : null, origin: '本地降噪' });
      this.st.panel = null; this.setPlaying(false);
      if (this.oldPk) this.ampMix.snap(0).to(1, P.move);
      this.closePanel();
      this.snack(`已应用：本地降噪 · 存为第${NB}${v.n}${NB}版`, '撤销', () => this.undo());
    }

    act(a, el) {
      const st = this.st, sel = st.selection;
      const close = () => { st.sheet = null; this.render(); };
      const [cmd, arg] = a.split(':');
      switch (cmd) {
        case 'keep': if (sel) { const old = this.flat(); this.commitAnim(slicePieces(this.ps(), sel[0], sel[1]), `保留 ${point(sel[0])}–${point(sel[1])}`, old); st.selection = null; st.playhead = 0; this.render(); } break;
        case 'delete': if (sel) { const old = this.flat(); this.commitAnim(cutPieces(this.ps(), sel[0], sel[1]), `删除 ${point(sel[0])}–${point(sel[1])}`, old); st.playhead = sel[0]; st.selection = null; this.render(); } break;
        case 'move': st.sheet = 'move'; this.render(); break;
        case 'fade': this.toast('淡化沿用现在的面板（淡入 / 淡出 + 曲线）'); break;
        case 'more': st.sheet = 'more'; this.render(); break;
        case 'copy': if (sel) { st.clipboard = { len: sel[1] - sel[0], pieces: slicePieces(this.ps(), sel[0], sel[1]) }; st.sheet = null; st.selection = null; this.render(); this.snack(`已复制 ${dur(st.clipboard.len)}。点波形放好播放头，再点「粘贴」`); } break;
        case 'cut': if (sel) { st.clipboard = { len: sel[1] - sel[0], pieces: slicePieces(this.ps(), sel[0], sel[1]) }; st.sheet = null; const old = this.flat(); this.commitAnim(cutPieces(this.ps(), sel[0], sel[1]), `剪切 ${point(sel[0])}–${point(sel[1])}`, old); st.playhead = sel[0]; st.selection = null; this.render(); } break;
        case 'dup': if (sel) { st.sheet = null; const old = this.flat(); this.commitAnim(insertPieces(this.ps(), sel[1], slicePieces(this.ps(), sel[0], sel[1])), `重复 ${point(sel[0])}–${point(sel[1])}`, old); this.render(); } break;
        case 'paste': if (st.clipboard) { const at = Math.round(st.playhead), old = this.flat(); st.sheet = null; this.commitAnim(insertPieces(this.ps(), at, st.clipboard.pieces), `在 ${point(at)} 粘贴 ${dur(st.clipboard.len)}`, old); st.selection = [at, at + st.clipboard.len]; this.snack(`已粘贴 ${dur(st.clipboard.len)}`, '撤销', () => this.undo()); } break;
        case 'clipx': st.clipboard = null; this.render(); break;
        case 'silence': { const at = Math.round(st.playhead), old = this.flat(); st.sheet = null; this.commitAnim(insertPieces(this.ps(), at, [[0, 20, 1]]), `在 ${point(at)} 插入 1${NB}秒静音`, old); this.render(); } break;
        case 'noclip': this.toast('还没有复制。先选一段，在「⋯」里复制或剪切'); break;
        case 'newver': this.toast('会在波形下面打开插入面板，存为新的一版'); break;
        case 'gain': case 'stub': this.toast('沿用现有功能，这一稿没有改它'); break;
        case 'clearsel': st.selection = null; close(); break;
        case 'mv': if (sel) {
          const len = sel[1] - sel[0], remL = this.len() - len;
          let to = null;
          if (arg === 'start') to = 0;
          if (arg === 'end') to = remL;
          if (arg === 'ph') { if (st.playhead > sel[0] && st.playhead < sel[1]) { this.toast('播放头在选区里面，先把它放到别处'); break; } to = st.playhead >= sel[1] ? st.playhead - len : st.playhead; }
          if (arg === 't') { const v = parseFloat((this.root.querySelector('[data-in=mvt]') || {}).value); if (!isFinite(v)) { this.toast('请输入秒数'); break; } to = clamp(Math.round(v * 1000 / UNIT), 0, remL); }
          to = Math.round(to);
          st.sheet = null;
          if (to === sel[0]) { this.render(); this.toast('已经在这里了'); break; }
          const old = this.flat();
          this.commitAnim(movePieces(this.ps(), sel[0], sel[1], to), `把 ${point(sel[0])}–${point(sel[1])} 移到 ${point(to)}`, old);
          st.selection = [to, to + len]; this.render();
          this.snack(`已移动到 ${compact(to)}`, '撤销', () => this.undo());
        } break;
        case 'tools': st.sheet = 'tools'; st.q = ''; this.setPlaying(false); this.render(); break;
        case 'page': st.sheet = arg || el.dataset.v; this.render(); break;
        case 'back-tools': st.sheet = 'tools'; this.render(); break;
        case 'sclose': close(); break;
        case 'tool': {
          const k = el.dataset.k;
          if (k === 'split') { const at = Math.round(st.playhead); st.sheet = null; this.commit(slicePieces(this.ps(), 0, at).concat(slicePieces(this.ps(), at, Infinity)), `在 ${point(at)} 分割`, 'none'); this.snack(`已在 ${compact(at)} 分割`, '撤销', () => this.undo()); break; }
          if (k === 'insert') { st.sheet = 'insert'; this.render(); break; }
          if (PROC_TOOLS.concat(FIND_TOOLS).some(t => t.k === k)) { this.openTool(k); break; }
          const t = ALL_TOOLS.find(x => x.k === k);
          if (t && t.g === 'create') this.toast(t.nc ? '会打开「音频转文字」说明页：未接通' : `会打开「${t.n}」页面，这段音频是第一个素材`);
          else this.toast('沿用现有面板，这一稿没有改它');
        } break;
        case 'say': this.toast('会把这句话交给一句话，进入计划核对'); break;
        case 'send': { const inp = this.root.querySelector('[data-in=say]'); const v = inp ? inp.value.trim() : ''; if (!v) break; if (/降噪|噪音|底噪|杂音/.test(v)) { inp.value = ''; this.openTool('denoise'); } else this.toast('会进入计划核对（这一稿没有改）'); } break;
        case 'cscope': if (arg === 'sel' || el.dataset.v === 'sel') { if (!sel) { this.toast('先在波形上拖动，选出一段'); break; } st.cscope = 'sel'; } else st.cscope = 'all'; this.render(); break;
        case 'hist': this.jump(el.dataset.p, +el.dataset.i); break;
        case 'undo': this.undo(); break;
        case 'redo': this.redo(); break;
        case 'snackact': { const f = this.snackFn; st.snack = null; this.render(); if (f) f(); } break;
        case 'play': this.setPlaying(!this.playing); break;
        case 'loop': st.loop = !st.loop; this.render(); break;
        case 'onlysel': if (!sel) { this.toast('先在波形上拖动，选出一段'); break; } st.onlySel = !st.onlySel; this.render(); break;
        case 'versions': st.sheet = 'versions'; this.setPlaying(false); this.render(); break;
        case 'vplay': this.toast('试听这一版'); break;
        case 'export': this.toast('导出页沿用现在的'); break;
        case 'back': this.toast('回到音频库'); break;
        case 'speed': this.toast('试听速度，不改音频'); break;
        case 'spectrum': this.toast('频谱视图，沿用现在的'); break;
        // panel
        case 'pclose': this.closePanel(); break;
        case 'pcancel': { const pn = st.panel; pn.phase = 'idle'; pn.progress = 0; this.render(); } break;
        case 'papply': this.applyPanel(); break;
        case 'pplay': if (st.panel && st.panel.phase !== 'ready' && !this.playing) { this.toast('预览生成好就能听；也可以先听原声'); } this.setPlaying(!this.playing); break;
        case 'pmore': this.toast('降噪没有更多设置；效果和修复的长列表见第 6 节'); break;
        case 'ab': { const pn = st.panel; const v = el.dataset.v; if (pn.ab === v) break; pn.ab = v; if (this.lastPk) { this.oldPk = Float32Array.from(this.lastPk); this.ampMix.snap(0).to(1, P.move); } this.render(); } break;
        case 'scope': { const pn = st.panel; const v = el.dataset.v; if (v === 'sel' && !sel) { this.toast('先在波形上拖动，选出一段'); break; } if (pn.scope === v) break; pn.scope = v; this.restartPreview(); this.render(); } break;
        case 'stop': { const pn = st.panel; const k = +el.dataset.k; if (pn.level === k) break; pn.level = k; this.restartPreview(); this.render(); } break;
        default: break;
      }
    }
    commitAnim(ps, label, old) {
      const p = this.proj();
      commitTo(p, ps, label);
      this.fam.redo = null; this.st.coach = false;
      this.flowFrom(old, 'pos'); this.clampPositions();
      this.selOpen.l.snap(0); this.selOpen.r.snap(0);
    }

    // ---- automatic demo of the move (a finger does it)
    async demoMove() {
      if (this.demoing) return;
      this.demoing = true;
      const st = this.st;
      st.sheet = null; st.panel = null; this.setPlaying(false);
      if (!st.selection) { st.selection = [240, 360]; this.render(); await wait(700); }
      const ppu = this.W / this.len(), sel = st.selection;
      const y = this.stripH() + (this.H - this.stripH() - this.rulerH()) * 0.45;
      const f = this.fingerEl;
      let x = (sel[0] + (sel[1] - sel[0]) * 0.4) * ppu;
      const remL = this.len() - (sel[1] - sel[0]);
      const target = sel[0] < remL * 0.5 ? Math.min(remL - 20, sel[0] + 300) : Math.max(0, sel[0] - 220);
      const tx = target * ppu + (x - sel[0] * ppu);
      f.style.left = x + 'px'; f.style.top = y + 'px'; f.classList.add('show');
      await wait(350);
      this.pDown(x, y, 99);
      await wait(560);
      const t0 = performance.now(), D = 1300, x0 = x;
      await new Promise(res => {
        const step = now => {
          const k = clamp((now - t0) / D, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          x = x0 + (tx - x0) * e + Math.sin(k * Math.PI) * 6;
          f.style.left = x + 'px'; this.pMove(x, y, 99);
          if (k < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
      await wait(380);
      this.pUp(x, y, 99);
      await wait(250);
      f.classList.remove('show');
      this.demoing = false;
    }
  }

  // ------------------------------------------------------------------ helpers
  /** A short tick under the finger, only once the person has touched the page (browsers refuse it before). */
  function buzz(ms, live) {
    const ua = navigator.userActivation;
    if (!live || !navigator.vibrate || (ua && !ua.hasBeenActive)) return;
    try { navigator.vibrate(ms); } catch (e) { /* not allowed here */ }
  }
  function colPeaks(m, n, out, keys) {
    const L = m.L;
    for (let i = 0; i < n; i++) {
      const u0 = Math.floor(i * L / n), u1 = Math.max(u0 + 1, Math.floor((i + 1) * L / n));
      let pk = 0;
      for (let u = u0; u < u1 && u < L; u++) {
        const cl = m.cl[u] * (m.cs ? m.cs[u] : 1), f = m.nf ? m.nf[u] : 1;
        const a = cl + m.no[u] * f * (1 - cl * 0.9);
        if (a > pk) pk = a;
      }
      out[i] = Math.min(1, pk);
      keys[i] = m.key[Math.min(L - 1, (u0 + u1) >> 1)];
    }
  }
  function setDrop(el, left, width, arrowX, l, r) {
    const h = 48, bead = h * 0.42;
    const x0 = arrowX - (bead / 2 + (arrowX - bead / 2) * l), x1 = arrowX + (bead / 2 + (width - arrowX - bead / 2) * r);
    const hh = bead + (h - bead) * Math.min(1.1, Math.max(l, r)), y0 = (h - hh) / 2;
    const alpha = clamp(Math.max(l, r) * 4, 0, 1), o = clamp(Math.min(l, r), 0, 1);
    el.style.left = left + 'px'; el.style.width = width + 'px';
    const [bg, arw, row] = el.children;
    bg.style.left = x0 + 'px'; bg.style.width = Math.max(0, x1 - x0) + 'px'; bg.style.top = y0 + 'px'; bg.style.height = hh + 'px'; bg.style.opacity = alpha;
    arw.style.left = arrowX + 'px'; arw.style.opacity = clamp((o - 0.5) * 2, 0, 1);
    row.style.opacity = clamp((o - 0.7) / 0.3, 0, 1);
    row.style.clipPath = `inset(0 ${Math.max(0, width - x1)}px 0 ${Math.max(0, x0)}px)`;
    row.style.pointerEvents = o > 0.9 ? '' : 'none';
    el.classList.toggle('show', Math.max(l, r) > 0.001);
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function hexA(c, a) {
    c = c.trim();
    if (c.startsWith('#')) { const h = c.length === 4 ? c.slice(1).split('').map(x => x + x).join('') : c.slice(1, 7); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`; }
    return c;
  }
  function ringSvg(p, done) {
    const r = 7.5, c = 2 * Math.PI * r;
    if (done) return `<svg class="ring" viewBox="0 0 18 18"><circle cx="9" cy="9" r="${r}" fill="none" stroke="var(--ok)" stroke-width="2"/><path d="M5.4 9.2l2.4 2.4 4.8-4.9" fill="none" stroke="var(--ok)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<svg class="ring" viewBox="0 0 18 18"><circle cx="9" cy="9" r="${r}" fill="none" stroke="var(--surface3)" stroke-width="2"/><circle cx="9" cy="9" r="${r}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-dasharray="${Math.max(0.06, p) * c} ${c}" transform="rotate(-90 9 9)"/></svg>`;
  }
  function stopsHtml(key, n, sel, descs, l0, l1) {
    const dots = Array.from({ length: n }, (_, k) => `<i class="st-dot"></i>`).join('');
    const hits = Array.from({ length: n }, (_, k) => `<button class="st-hit" data-a="stop" data-k="${k}" aria-label="${descs[k]}"></button>`).join('');
    return `<div class="stops" data-stops="${key}" data-n="${n}" data-sel="${sel}"><div class="st-t"><div class="st-line"></div><div class="st-fill"></div>${dots}<div class="st-drop"></div>${hits}</div><div class="st-l"><span>${l0}</span><span>${l1}</span></div></div>`;
  }

  // ------------------------------------------------------------------ scenes
  function base(o) {
    return { fam: mkFamily(), st: Object.assign({ selection: null, playhead: 624, clipboard: null, panel: null, sheet: null, q: '', snack: null, coach: false, loop: false, onlySel: false, cscope: 'sel' }, o || {}) };
  }
  const SEL = () => [240, 360];
  const PANEL = o => Object.assign({ tool: 'denoise', scope: 'sel', level: 2, phase: 'ready', progress: 1, ab: 'after' }, o);
  function applied(o) {
    const s = base(Object.assign({ selection: SEL() }, o));
    processProject(s.fam, s.fam.projects[0], { level: 2, scope: SEL(), origin: '本地降噪' });
    return s;
  }
  const SCENES = {
    's1-rest': () => base(),
    's2-sel': () => base({ selection: SEL(), coach: true }),
    's2-more': () => base({ selection: SEL(), sheet: 'more' }),
    's3-live': () => base({ selection: SEL(), coach: true }),
    's3-drag': () => Object.assign(base({ selection: SEL() }), { after: b => b.freezeDrag(540, 12) }),
    's3-drop': () => {
      const s = base(); const p = s.fam.projects[0];
      commitTo(p, movePieces(p.hist[p.idx].ps, 240, 360, 540), '把 00:12–00:18 移到 00:27');
      s.st.selection = [540, 660]; s.st.snack = { text: '已移动到 0:27.0', act: '撤销' };
      return s;
    },
    's3-moveto': () => base({ selection: SEL(), sheet: 'move' }),
    's4-paste': () => {
      const s = base({ playhead: 720 }); const p = s.fam.projects[0];
      s.st.clipboard = { len: 120, pieces: slicePieces(p.hist[p.idx].ps, 240, 360) };
      return s;
    },
    's4-insert': () => {
      const s = base({ playhead: 720, sheet: 'insert' }); const p = s.fam.projects[0];
      s.st.clipboard = { len: 120, pieces: slicePieces(p.hist[p.idx].ps, 240, 360) };
      return s;
    },
    's5-tools': () => base({ sheet: 'tools' }),
    's5-process': () => base({ sheet: 'process', selection: SEL() }),
    's5-search': () => base({ sheet: 'tools', q: '混响' }),
    's6-live': () => base({ selection: SEL(), panel: PANEL({ phase: 'rendering', progress: 0 }) }),
    's6-adjust': () => base({ selection: SEL(), playhead: 252, panel: PANEL({ phase: 'rendering', progress: 0.37, level: 3 }) }),
    's6-after': () => base({ selection: SEL(), playhead: 296, panel: PANEL({ playing: true }) }),
    's6-orig': () => base({ selection: SEL(), playhead: 302, panel: PANEL({ ab: 'orig', playing: true }) }),
    's6-whole': () => base({ selection: SEL(), playhead: 0, panel: PANEL({ scope: 'all', phase: 'rendering', progress: 0.62 }) }),
    's6-applied': () => { const s = applied({ playhead: 302 }); s.st.snack = { text: '已应用：本地降噪 · 存为第' + NB + '2' + NB + '版', act: '撤销' }; return s; },
    's6-speed': () => base({ playhead: 500, panel: PANEL({ tool: 'speed', scope: 'all' }) }),
    's6-fx': () => base({ selection: SEL(), panel: PANEL({ tool: 'fx' }) }),
    's6-fxmore': () => Object.assign(base({ selection: SEL(), panel: PANEL({ tool: 'fx', more: true }) }), { after: b => { const pb = b.root.querySelector('.pn-b'); if (pb) pb.scrollTop = 150; } }),
    's7-hist': () => {
      const s = applied({ playhead: 302 }); const v2 = s.fam.projects[1];
      commitTo(v2, [[20, 900]], '剪掉开头' + NB + '1' + NB + '秒');
      s.st.selection = [220, 340];
      return s;
    },
    's7-undo': () => {
      const s = applied({ playhead: 302 }); const v2 = s.fam.projects[1];
      commitTo(v2, [[20, 900]], '剪掉开头' + NB + '1' + NB + '秒');
      v2.idx = 0; s.fam.cur = 'v1'; s.fam.redo = { id: 'v2' };
      return s;
    },
    's7-versions': () => {
      const s = applied({ playhead: 302, sheet: 'versions' }); const v2 = s.fam.projects[1];
      commitTo(v2, [[20, 900]], '剪掉开头' + NB + '1' + NB + '秒');
      s.st.selection = null;
      return s;
    },
    's8-create': () => base({ sheet: 'create', sheetFrom: 'tools' }),
  };

  // The library with the 新建 sheet (ui/library/CreateSheet.kt plus the new group).
  function buildLibrary(root) {
    root.classList.add('scr', 'static');
    const row = (n, m) => `<div class="lrow"><div class="minw"></div><div class="lx"><b>${n}</b><span>${m}</span></div>${ic('MoreVert', 20)}</div>`;
    const ct = (i, n, cls) => `<div class="ct ${cls || ''}">${ic(i, 26)}<span>${n}</span></div>`;
    root.innerHTML = `<div class="sb"><span>9:41</span><span class="sig"><i></i><span class="bat"></span></span></div>
      <div class="lib"><h4>音频库</h4><div class="search">${ic('Search', 22)}<span class="ph" style="color:var(--faint)">搜索</span></div>
        ${row('周末采访', '第 2 版 · 0:44')}${row('播客第 12 期', '第 3 版 · 24 分')}${row('婚礼开场', '0:58')}${row('铃声 · 副歌', '0:30')}</div>
      <div class="nb"><i></i></div>
      <div class="scrim show"></div>
      <div class="sheet show"><div class="handle"></div><div class="sh-h"><div class="sh-tt"><div class="sh-t">新建</div></div><span class="cb">${ic('Close', 20)}</span></div>
        <div class="sh-b">
          <div class="rec"><div class="rc">${ic('Mic', 26)}</div><div><b>录一段</b><span>可以暂停，录完直接开始改</span></div></div>
          <div class="ctiles">${ct('AudioFile', '手机里的文件')}${ct('VideoFile', '视频里的声音')}${ct('RecordVoiceOver', '文字读出来')}${ct('ClosedCaption', '字幕配音')}${ct('Link', '把几段接起来')}${ct('VolumeOff', '一段空白')}${ct('Science', '先拿示例试试')}${ct('LibraryMusic', '在线音乐')}</div>
          <div class="tg-h"><b>用已有的音频创作</b><span class="newtag">新</span><span>先选库里的一段音频</span></div>
          <div class="ctiles">${ct('LibraryMusic', '配背景音乐', 'new')}${ct('Layers', '多轨混音', 'new')}${ct('QueueMusic', '串烧', 'new')}${ct('PlaylistAdd', '一分钟循环', 'new')}${ct('RecordVoiceOver', '克隆声音', 'new')}</div>
          <div class="wrow">${ic('ViewList', 22)}<span class="wx"><b>一次处理很多个文件</b></span>${ic('KeyboardArrowRight', 22, 'chv')}</div>
          <div class="wrow">${ic('Inventory2', 22)}<span class="wx"><b>导入工程包</b></span>${ic('KeyboardArrowRight', 22, 'chv')}</div>
        </div></div>`;
    const sb = root.querySelector('.sh-b');
    const tune = () => { sb.scrollTop = 150; };
    new ResizeObserver(tune).observe(root); tune();
  }

  // ------------------------------------------------------------------ boot
  function boot() {
    document.querySelectorAll('.scr[data-scene]').forEach(el => {
      const name = el.dataset.scene;
      if (name === 's8-new') { buildLibrary(el); return; }
      const f = SCENES[name];
      if (!f) { el.textContent = '缺少画面：' + name; return; }
      const b = new Bench(el, f(), el.hasAttribute('data-live'));
      el._bench = b;
    });
    document.querySelectorAll('[data-demo]').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = document.querySelector(`.scr[data-scene="${btn.dataset.target}"]`), b = el && el._bench;
        if (!b) return;
        if (btn.dataset.demo === 'move') b.demoMove();
        if (btn.dataset.demo === 'reset') { const s = SCENES[el.dataset.scene](); b.reset(s); b.drag = null; b.g = null; b.ca = null; b.setPlaying(false); b.st.snack = null; b.selOpen.l.snap(0); b.selOpen.r.snap(0); b.render(); b.draw(); }
        if (btn.dataset.demo === 'reset-panel') { const s = SCENES[el.dataset.scene](); b.reset(s); b.ca = null; b.setPlaying(false); b.render(); const h = b.panelEl.offsetHeight || 380; b.panelY.snap(h).to(0, P.panel); b.kick(); }
      });
    });
    // theme
    const saved = (() => { try { return localStorage.getItem('wb-theme'); } catch (e) { return null; } })();
    const apply = v => {
      if (v === 'light' || v === 'dark') document.documentElement.setAttribute('data-theme', v); else document.documentElement.removeAttribute('data-theme');
      document.querySelectorAll('[data-theme-btn]').forEach(b => b.classList.toggle('on', b.dataset.themeBtn === (v || 'system')));
      requestAnimationFrame(() => benches.forEach(b => { b.colors(); b.draw(); }));
    };
    apply(saved);
    document.querySelectorAll('[data-theme-btn]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.themeBtn; try { localStorage.setItem('wb-theme', v); } catch (e) { /* private mode */ }
      apply(v === 'system' ? null : v);
    }));
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => benches.forEach(b => { b.colors(); b.draw(); }));
    window.__benches = benches;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
