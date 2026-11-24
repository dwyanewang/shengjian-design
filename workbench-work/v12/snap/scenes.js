/* 每个静态画面都是同一个组件在某个状态下的样子；live 那台从「打开」开始。 */
(function () {
  'use strict';
  const { Bench, SRC, sec, slice, cutP, insP, withP, newRecSource } = window.WB;

  const voice = () => ({ name: '采访录音', pieces: [{ src: 'voice', s: 0, e: SRC.voice.n, g: 1 }], layers: [], tracks: [], markers: [] });
  const song = () => ({ name: '周末录的歌', pieces: [{ src: 'song', s: 0, e: SRC.song.n, g: 1 }], layers: [], tracks: [], markers: [] });
  const long = () => ({ name: '周会录音', pieces: [{ src: 'long', s: 0, e: SRC.long.n, g: 1 }], layers: [], tracks: [],
    markers: [['开场', 0], ['预算', 1460], ['第二部分', 3725], ['问答', 6100]].map(([n, s], i) => ({ id: 'mk' + i, name: n, src: 'long', f: sec(s) })) });
  const music = (o) => Object.assign({ id: 'tm', k: 'music', name: '轻快的早晨', src: 'music1', gain: 0.6, duck: true, duckTo: 0.25, fill: true, at: 0, s: 0, e: SRC.music1.n, fi: 20, fo: 30, lane: 1, loop: true }, o || {});

  /** Brings a scene to rest: springs where they are heading, transient animations finished. */
  function settle(b) {
    b.anim = null; b.proc = null;
    b.view.a.snap(b.view.a.t); b.view.b.snap(b.view.b.t);
    if (b.gap) { if (b.gap.done) b.gap = null; else { if (b.gap.at.snap) b.gap.at.snap(b.gap.at.t); if (b.gap.w.snap) b.gap.w.snap(b.gap.w.t); } }
    b.renderArea(true); b.renderChips(); b.renderTop();
  }
  const sel = (b, a, c) => { b.sel = [sec(a), sec(c)]; b.stack = [b.rootView()]; };
  const strip = (b, ...ctx) => { b.stack = ctx.map(c => ({ t: 'strip', ctx: c })); };

  const S = {
    live: { doc: voice, live: true },

    // ---- 1 剪掉一段
    t1a: { doc: voice, coach: 'drag', firstRun: true, setup: b => { b.ph = sec(12.4); } },
    t1b: { doc: voice, setup: b => { b.ph = sec(39.8); sel(b, 39.8, 58.5); } },
    t1c: { doc: voice, setup: b => { b.commit(withP(b.doc, cutP(b.doc.pieces, sec(39.8), sec(58.5))), '删掉 0:39.8–0:58.5'); b.ph = sec(39.8); b.view.b.snap(b.L); } },
    t1d: { doc: voice, setup: b => { b.commit(withP(b.doc, cutP(b.doc.pieces, sec(39.8), sec(58.5))), '删掉'); b.view.b.snap(b.L); b.openExport(); } },
    t1e: { doc: voice, setup: b => { b.commit(withP(b.doc, cutP(b.doc.pieces, sec(39.8), sec(58.5))), '删掉'); b.view.b.snap(b.L); b.openExport(); b.exp.stage = 'done'; } },

    // ---- 2 挪一段
    t2a: { doc: voice, coach: 'hold', setup: b => { b.ph = sec(39.8); sel(b, 39.8, 58.5); } },
    t2b: { doc: voice, finger: true, setup: b => { b.startHand(sec(39.8), sec(58.5), 'lift', false); b.hand.at = sec(87.5); b.gap.at.snap(sec(87.5)); b.stack = [b.rootView()]; } },
    t2c: { doc: voice, setup: b => { const d = b.doc; b.commit(withP(d, insP(cutP(d.pieces, sec(39.8), sec(58.5)), sec(87.5), slice(d.pieces, sec(39.8), sec(58.5)))), '移动'); b.sel = [sec(87.5), sec(106.2)]; b.ph = sec(87.5); b.stack = [b.rootView()]; } },
    t2d: { doc: voice, coach: 'hand', setup: b => { b.view.a.snap(sec(96)); b.view.b.snap(sec(150)); b.startHand(sec(23.4), sec(29.3), 'tap', false); b.handTarget(sec(128.9)); } },

    // ---- 3 做铃声
    t3a: { doc: song, firstRun: true, setup: b => { b.ph = sec(5); } },
    t3b: { doc: song, setup: b => { b.findChorus(); b.top.len = 300; b.pickCand(); } },
    t3c: { doc: song, setup: b => { b.findChorus(); b.top.len = 300; b.pickCand(); b.sel = b.fitChorus(b.chorus[0], 300); b.marks = null; b.chorus = null; b.doKeep(); b.openExport({ purpose: 'ring' }); } },
    t3d: { doc: song, setup: b => { b.commit(withP(b.doc, slice(b.doc.pieces, 440, 740)), '只留'); b.view.b.snap(b.L); b.openExport({ purpose: 'ring' }); b.exp.stage = 'done'; } },

    // ---- 4 清理人声
    t4a: { doc: voice, setup: b => { b.stack = [{ t: 'strip', ctx: 'rest' }]; } },
    t4b: { doc: voice, setup: b => { b.startPlan('降噪，统一音量，删掉超过1秒的停顿'); } },
    t4c: { doc: voice, setup: b => { b.startPlan('降噪，统一音量，删掉超过1秒的停顿'); b.applyPlan(); } },
    t4d: { doc: voice, setup: b => { b.startPlan('降噪，统一音量，删掉超过1秒的停顿'); b.applyPlan(); const l = b.doc.layers.find(x => x.k === 'dn'); b.openLayer('dn', l); b.layerSet(x => { x.v = 3; }); } },

    // ---- 5 配背景音乐
    t5a: { doc: voice, setup: b => { } },
    t5b: { doc: voice, setup: b => { b.openSheet('pick', { mode: 'music', src: 'lib' }); } },
    t5c: { doc: voice, setup: b => { b.addTrack(music()); } },
    t5d: { doc: voice, setup: b => { b.addTrack(music()); b.push({ t: 'duck' }); } },

    // ---- 6 插入录音、接几段
    t6a: { doc: voice, setup: b => { b.ph = sec(74.1); } },
    t6b: { doc: voice, setup: b => { b.ph = sec(74.1); b.startRec(); b.rec.len = 73; b.rec.running = true; b.gap.w = 73; b.view.b.snap(b.L + 73); } },
    t6c: { doc: voice, setup: b => { b.ph = sec(74.1); const id = newRecSource(73); b.insertPiece(id, 73, '录音 7.3 秒'); } },
    t6d: { doc: () => ({ name: '三段合在一起', pieces: [{ src: 'clipB', s: 0, e: SRC.clipB.n }, { src: 'clipA', s: 0, e: SRC.clipA.n }, { src: 'clipC', s: 0, e: SRC.clipC.n }], layers: [], tracks: [],
      markers: [{ id: 'j1', name: '片头口播', src: 'clipB', f: 0 }, { id: 'j2', name: '补录', src: 'clipA', f: 0 }, { id: 'j3', name: '电话录音', src: 'clipC', f: 0 }] }), origin: '把几段接起来' },

    // ---- 7 说一句
    t7a: { doc: voice, setup: b => { b.stack = [{ t: 'strip', ctx: 'rest' }, { t: 'say', text: '剪掉开头5秒，结尾淡出3秒，导出MP3' }]; b.markTool = 'say'; b.setTyping(true); } },
    t7b: { doc: voice, setup: b => { b.startPlan('剪掉开头5秒，结尾淡出3秒，导出MP3'); } },
    t7c: { doc: voice, setup: b => { b.startPlan('剪掉开头5秒，结尾淡出3秒，导出MP3'); b.applyPlan(); } },
    t7d: { doc: voice, setup: b => { b.startPlan('把它弄得好听点，降噪'); } },

    // ---- 8 导出、分享
    t8a: { doc: voice, setup: b => { b.openExport(); b.onSeg('xp', 'share'); } },
    t8b: { doc: voice, setup: b => { b.openExport(); b.exp.purpose = 'share'; b.exp.stage = 'run'; b.exp.p = 0.46; } },
    t8c: { doc: voice, modal: b => { b.exp.purpose = 'share'; b.systemAfterExport(); }, setup: b => { b.openExport(); b.exp.purpose = 'share'; b.exp.stage = 'run'; b.exp.p = 1; } },
    t8d: { doc: voice, setup: b => { sel(b, 39.8, 58.5); b.openExport(); } },

    // ---- edges (annotated)
    kEdges: { doc: voice, showEdges: true, setup: b => { b.ph = sec(12.4); sel(b, 0, 8.7); } },
    kEdgesZoomStart: { doc: long, showEdges: true, setup: b => { b.view.a.snap(0); b.view.b.snap(sec(40)); b.sel = [0, sec(6.5)]; b.stack = [b.rootView()]; } },
    kEdgesZoomEnd: { doc: long, showEdges: true, setup: b => { const L = b.L; b.view.a.snap(L - sec(40)); b.view.b.snap(L); b.sel = [L - sec(8), L]; b.ph = L - sec(8); b.stack = [b.rootView()]; } },
    kSysBack: { doc: voice, sysback: true, setup: b => { b.openLayer('dn'); } },

    // ---- key states
    kNew: { doc: () => ({ name: '录音 11月20日', pieces: [{ src: 'sil', s: 0, e: 1 }], layers: [], tracks: [], markers: [] }), setup: b => { b.view.b.snap(300); b.startRec(); b.rec.at = 0; b.gap.at = 0; b.rec.len = 73; b.rec.running = true; b.gap.w = 73; b.ph = 0; } },
    kLong: { doc: long, setup: b => { b.view.a.snap(sec(3700)); b.view.b.snap(sec(3760)); b.ph = sec(3731.2); b.sel = [sec(3725), sec(3741.5)]; b.stack = [b.rootView()]; } },
    kTracks: { doc: () => Object.assign(voice(), { tracks: [
      music(),
      { id: 'td', k: 'dub', name: '配音', src: 'dub', gain: 1, duck: false, duckTo: 1, fill: false, at: 0, s: 0, e: 1610, fi: 0, fo: 0, lane: 3, loop: false },
      { id: 'tv', k: 'voice', name: '补录.m4a', src: 'clipC', gain: 1, duck: false, duckTo: 1, fill: false, at: sec(96), s: 0, e: SRC.clipC.n, fi: 0, fo: 0, lane: 5, loop: false, mute: true },
    ] }), setup: b => { b.track = 'tm'; b.stack = [b.rootView()]; } },
    kRepair: { doc: voice, setup: b => { b.cat = 'sound'; b.openLayer('rp'); } },
    // v7 states
    kPlaying: { doc: voice, setup: b => { b.ph = sec(48.6); b.playing = true; b.range = [0, b.L]; } },
    kBrowse: { doc: long, setup: b => { b.view.a.snap(sec(3690)); b.view.b.snap(sec(3770)); b.ph = sec(3731.2); } },
    kSayFocus: { doc: voice, setup: b => { b.stack = [b.rootView(), { t: 'say', text: '' }]; b.markTool = 'say'; b.setTyping(true); } },
    kTracks5: { doc: () => Object.assign(voice(), { tracks: [
      music(),
      { id: 'td', k: 'dub', name: '配音', src: 'dub', gain: 1, duck: false, duckTo: 1, fill: false, at: 0, s: 0, e: 1610, fi: 0, fo: 0, lane: 3, loop: false },
      { id: 'tv', k: 'voice', name: '补录.m4a', src: 'clipC', gain: 1, duck: false, duckTo: 1, fill: false, at: sec(96), s: 0, e: SRC.clipC.n, fi: 0, fo: 0, lane: 5, loop: false },
      { id: 'ta', k: 'acc', name: '掌声', src: 'music2', gain: 0.7, duck: false, duckTo: 1, fill: false, at: sec(20), s: 0, e: 400, fi: 10, fo: 10, lane: 2, loop: false },
      { id: 'te', k: 'music', name: '环境声', src: 'music3', gain: 0.4, duck: true, duckTo: 0.3, fill: true, at: 0, s: 0, e: SRC.music3.n, fi: 20, fo: 20, lane: 7, loop: true },
    ] }), setup: b => { b.stack = [b.rootView()]; } },
    kTracks5Scroll: { doc: () => Object.assign(voice(), { tracks: [
      music(),
      { id: 'td', k: 'dub', name: '配音', src: 'dub', gain: 1, duck: false, duckTo: 1, fill: false, at: 0, s: 0, e: 1610, fi: 0, fo: 0, lane: 3, loop: false },
      { id: 'tv', k: 'voice', name: '补录.m4a', src: 'clipC', gain: 1, duck: false, duckTo: 1, fill: false, at: sec(96), s: 0, e: SRC.clipC.n, fi: 0, fo: 0, lane: 5, loop: false },
      { id: 'ta', k: 'acc', name: '掌声', src: 'music2', gain: 0.7, duck: false, duckTo: 1, fill: false, at: sec(20), s: 0, e: 400, fi: 10, fo: 10, lane: 2, loop: false },
      { id: 'te', k: 'music', name: '环境声', src: 'music3', gain: 0.4, duck: true, duckTo: 0.3, fill: true, at: 0, s: 0, e: SRC.music3.n, fi: 20, fo: 20, lane: 7, loop: true },
    ] }), setup: b => { b.stack = [b.rootView()]; b.laneOff = 400; } },
    kTracks5Ctrl: { doc: () => Object.assign(voice(), { tracks: [
      music(),
      { id: 'td', k: 'dub', name: '配音', src: 'dub', gain: 1, duck: false, duckTo: 1, fill: false, at: 0, s: 0, e: 1610, fi: 0, fo: 0, lane: 3, loop: false },
      { id: 'tv', k: 'voice', name: '补录.m4a', src: 'clipC', gain: 1, duck: false, duckTo: 1, fill: false, at: sec(96), s: 0, e: SRC.clipC.n, fi: 0, fo: 0, lane: 5, loop: false },
      { id: 'ta', k: 'acc', name: '掌声', src: 'music2', gain: 0.7, duck: false, duckTo: 1, fill: false, at: sec(20), s: 0, e: 400, fi: 10, fo: 10, lane: 2, loop: false },
      { id: 'te', k: 'music', name: '环境声', src: 'music3', gain: 0.4, duck: true, duckTo: 0.3, fill: true, at: 0, s: 0, e: SRC.music3.n, fi: 20, fo: 20, lane: 7, loop: true },
    ] }), setup: b => { b.track = 'tm'; b.stack = [b.rootView(), { t: 'duck' }]; } },
    kFx: { doc: voice, setup: b => { b.openLayer('fx'); b.layerSet(l => { l.v = new Set([0, 1, 3]); l.cur = 3; }); } },
    kSpeed: { doc: voice, setup: b => { b.cat = 'sound'; b.openLayer('sp'); } },
    kStt: { doc: voice, setup: b => { b.cat = 'more'; b.push({ t: 'stt' }); b.markTool = 'stt'; } },
    kOnlineOff: { doc: voice, musicOff: true, setup: b => { b.openSheet('pick', { mode: 'music', src: 'online' }); } },
    kOnline: { doc: voice, setup: b => { b.openSheet('pick', { mode: 'music', src: 'online' }); } },
    kVoiceOff: { doc: voice, voiceOff: true, setup: b => { b.push({ t: 'tts', s: { text: '欢迎收听本期节目。' } }); b.push({ t: 'tts', s: { voices: true, src: 1 } }); } },
    kErr: { doc: () => Object.assign(song(), { layers: [{ id: 'le', k: 'sep', v: 0, on: true }] }), chipState: { sep: { err: true } }, setup: b => { b.cat = 'sound'; b.stack = [{ t: 'strip', ctx: 'rest' }, { t: 'err', k: 'sep', msg: '没能完成：手机存储空间不够' }]; } },
    kProc: { doc: () => Object.assign(song(), { layers: [{ id: 'lp', k: 'sep', v: 0, on: true }] }), chipState: { sep: { p: 0.37 } }, procSplit: 0.37, setup: b => { b.cat = 'sound'; b.stack = [{ t: 'strip', ctx: 'rest' }, { t: 'proc', k: 'sep', p: 37 }]; } },
    kFsRest: { doc: voice, fs: true, setup: b => { b.ph = sec(12.4); } },
    kFsRange: { doc: voice, fs: true, setup: b => { sel(b, 39.8, 58.5); } },
    kFsParam: { doc: voice, fs: true, setup: b => { b.openLayer('dn'); } },
    kFsExport: { doc: voice, fs: true, setup: b => { b.sel = [398, 585]; b.openExport(); } },
    kFsPlan: { doc: voice, fs: true, setup: b => { b.startPlan('剪掉开头5秒，结尾淡出3秒，导出MP3'); } },
    kEnRest: { doc: voice, lang: 'en', setup: b => { b.ph = sec(12.4); } },
    kEnRange: { doc: voice, lang: 'en', setup: b => { sel(b, 39.8, 58.5); } },
    kEnSound: { doc: voice, lang: 'en', setup: b => { b.ph = sec(12.4); b.cat = 'sound'; } },
    kEnParam: { doc: voice, lang: 'en', setup: b => { b.openLayer('dn'); } },
    kEnExport: { doc: voice, lang: 'en', setup: b => { b.openExport(); } },
    kHistory: { doc: voice, setup: b => {
      let d = b.doc; b.commit(withP(d, cutP(d.pieces, 0, 50)), '删掉开头 5 秒'); d = b.doc;
      b.commit(Object.assign({}, d, { layers: [{ id: 'h1', k: 'dn', v: 2, on: true }] }), '降噪（适中）');
      b.commit(Object.assign({}, b.doc, { tracks: [music()] }), '加背景音乐「轻快的早晨」');
      b.commit(Object.assign({}, b.doc, { tracks: [music({ gain: 0.45 })] }), '音乐音量 · 轻快的早晨');
      b.commit(Object.assign({}, b.doc, { layers: b.doc.layers.map(l => Object.assign({}, l, { v: 3 })) }), '降噪：适中 → 较强');
      b.hi = 4; b.doc = b.hist[4].doc;
      b.cat = 'more'; b.stack = [{ t: 'strip', ctx: 'rest' }, { t: 'history' }]; b.histPrev = 2;
    } },
    kDetails: { doc: () => Object.assign(voice(), { tracks: [music({ credit: '在线音乐库 · CC BY 4.0 · 可商用 · 署名：林间工作室' })] }), setup: b => { b.openSheet('info'); } },
    kTts: { doc: voice, setup: b => { b.push({ t: 'tts', s: { text: '欢迎收听本期节目。今天我们聊聊城市里的小店。' } }); } },
    kSub: { doc: voice, setup: b => { b.cat = 'add'; b.push({ t: 'sub', s: { lines: true, run: 5, done: true } }); b.commit(Object.assign({}, b.doc, { tracks: [{ id: 'tdub', k: 'dub', name: '配音', src: 'dub', gain: 1, duck: false, duckTo: 1, fill: false, at: 0, s: 0, e: 1610, fi: 0, fo: 0, lane: 3, loop: false }] }), '字幕配音', true); } },
    kClone: { doc: voice, setup: b => { b.cat = 'add'; b.push({ t: 'clone', s: { ok: true, rec: 'done' } }); } },
    kEnv: { doc: voice, coach: 'env', setup: b => { b.cat = 'sound'; b.push({ t: 'env', base: b.doc }); b.liveSet(Object.assign({}, b.doc, { env: [{ u: 0, db: 0 }, { u: 420, db: 0 }, { u: 520, db: -12 }, { u: 900, db: -12 }, { u: 980, db: 0 }] }), '音量曲线', b.top); } },
    kBeats: { doc: () => Object.assign(song(), { markers: [{ id: 'b1', name: '前奏完', src: 'song', f: 140 }, { id: 'b2', name: '副歌', src: 'song', f: 430 }] }), setup: b => { b.cat = 'edit'; b.view.a.snap(sec(8)); b.view.b.snap(sec(58)); b.beats = true; b.sel = [sec(14), sec(30)]; b.push({ t: 'beats', bpm: 120 }); } },
    kPauses: { doc: voice, setup: b => { b.findPauses(10); b.push({ t: 'pauses', min: 10 }); b.marks[2].on = false; b.renderArea(true); } },
    kChorusNone: { doc: voice, setup: b => { b.findChorus(); } },
    kConfirm: { doc: voice, modal: b => b.onTool('delaudio'), setup: b => { b.cat = 'more'; } },
    kPicker: { doc: voice, modal: b => b.pickFile(() => {}), setup: b => { } },
    kTrackVol: { doc: () => Object.assign(voice(), { tracks: [music()] }), setup: b => { b.track = 'tm'; b.stack = [b.rootView(), { t: 'tvol' }]; } },
    kRangeSound: { doc: voice, setup: b => { b.cat = 'sound'; sel(b, 39.8, 58.5); } },
    kPiece: { doc: () => Object.assign(voice(), { pieces: [{ src: 'voice', s: 0, e: 475 }, { src: 'voice', s: 475, e: 1063 }, { src: 'voice', s: 1063, e: 1610 }] }), setup: b => { b.sel = [475, 1063]; b.stack = [b.rootView()]; } },
    kRestEdit: { doc: voice, setup: b => { b.ph = sec(12.4); b.cat = 'edit'; } },
    kRestSound: { doc: voice, setup: b => { b.ph = sec(12.4); b.cat = 'sound'; } },
    kRestAdd: { doc: voice, setup: b => { b.ph = sec(12.4); b.cat = 'add'; } },
    kTrackRow: { doc: () => Object.assign(voice(), { tracks: [music()] }), setup: b => { b.track = 'tm'; b.stack = [b.rootView()]; } },
    kFsTrack: { doc: () => Object.assign(voice(), { tracks: [music()] }), fs: true, setup: b => { b.track = 'tm'; b.stack = [b.rootView()]; } },
    kEnTrack: { doc: () => Object.assign(voice(), { tracks: [music()] }), lang: 'en', setup: b => { b.track = 'tm'; b.stack = [b.rootView()]; } },
    kEnRestSound: { doc: voice, lang: 'en', setup: b => { b.ph = sec(12.4); b.cat = 'more'; } },
    kFade: { doc: voice, setup: b => { sel(b, 152, 161); b.push({ t: 'fade', base: b.doc, f: { dir: null, shape: 0 } }); b.onSeg('fdir', 'out'); } },
    kPlay: { doc: voice, setup: b => { b.ph = sec(12.4); b.cat = 'more'; b.speed = 1.5; } },
    kAudio: { doc: voice, setup: b => { b.cat = 'more'; } },
    kSpec: { doc: voice, setup: b => { b.spec = true; b.cat = 'more'; } },
    kRecSet: { doc: voice, setup: b => { b.ph = sec(74.1); b.startRec(); b.push({ t: 'rec', settings: true }); } },
    // v10: the states the anatomy is judged by, and play beside the handles
    kFadeRest: { doc: voice, setup: b => { b.onTool('fade'); b.markTool = 'fade'; } },
    kVol: { doc: voice, setup: b => { b.openLayer('vol'); b.layerSetQuiet(l => { l.v = 4; l.on = true; }); } },
    kLd: { doc: voice, setup: b => { b.openLayer('ld'); } },
    kVc: { doc: voice, setup: b => { b.cat = 'sound'; b.openLayer('vc'); } },
    kRangeDn: { doc: voice, setup: b => { sel(b, 39.8, 58.5); b.openLayer('dn'); } },
    kDnOff: { doc: voice, setup: b => { b.openLayer('dn'); b.layerSetQuiet(l => { l.on = false; }); } },
    kHandlesEnd: { doc: voice, showEdges: true, setup: b => { b.ph = sec(152); sel(b, 152, 161); } },
    kTracks5Sel: { doc: () => Object.assign(voice(), { tracks: [
      music(),
      { id: 'td', k: 'dub', name: '配音', src: 'dub', gain: 1, duck: false, duckTo: 1, fill: false, at: 0, s: 0, e: 1610, fi: 0, fo: 0, lane: 3, loop: false },
      { id: 'tv', k: 'voice', name: '补录.m4a', src: 'clipC', gain: 1, duck: false, duckTo: 1, fill: false, at: sec(96), s: 0, e: SRC.clipC.n, fi: 0, fo: 0, lane: 5, loop: false },
      { id: 'ta', k: 'acc', name: '掌声', src: 'music2', gain: 0.7, duck: false, duckTo: 1, fill: false, at: sec(20), s: 0, e: 400, fi: 10, fo: 10, lane: 2, loop: false },
      { id: 'te', k: 'music', name: '环境声', src: 'music3', gain: 0.4, duck: true, duckTo: 0.3, fill: true, at: 0, s: 0, e: SRC.music3.n, fi: 20, fo: 20, lane: 7, loop: true },
    ] }), setup: b => { b.ph = sec(2); sel(b, 0, 11.8); } },
    kTracks5Vol: { doc: () => Object.assign(voice(), { tracks: [
      music(),
      { id: 'td', k: 'dub', name: '配音', src: 'dub', gain: 1, duck: false, duckTo: 1, fill: false, at: 0, s: 0, e: 1610, fi: 0, fo: 0, lane: 3, loop: false },
      { id: 'tv', k: 'voice', name: '补录.m4a', src: 'clipC', gain: 1, duck: false, duckTo: 1, fill: false, at: sec(96), s: 0, e: SRC.clipC.n, fi: 0, fo: 0, lane: 5, loop: false },
      { id: 'ta', k: 'acc', name: '掌声', src: 'music2', gain: 0.7, duck: false, duckTo: 1, fill: false, at: sec(20), s: 0, e: 400, fi: 10, fo: 10, lane: 2, loop: false },
      { id: 'te', k: 'music', name: '环境声', src: 'music3', gain: 0.4, duck: true, duckTo: 0.3, fill: true, at: 0, s: 0, e: SRC.music3.n, fi: 20, fo: 20, lane: 7, loop: true },
    ] }), setup: b => { b.track = 'te'; b.stack = [b.rootView(), { t: 'tvol' }]; b.markTool = 'tvol'; } },
    kMarkerName: { doc: long, setup: b => { b.view.a.snap(sec(3600)); b.view.b.snap(sec(3800)); b.marker = 'mk2'; b.ph = sec(3725); b.stack = [b.rootView(), { t: 'mname', name: '第二部分' }]; b.markTool = 'mrename'; b.setTyping(true); } },
    kTtsType: { doc: voice, setup: b => { b.push({ t: 'tts', s: { text: '欢迎收听本期节目。今天我们聊聊城市里的小店。' } }); b._ttsFocus = true; b.setTyping(true); } },
    kExportMore: { doc: voice, setup: b => { b.openExport(); b.exp.open = true; } },
    kAudioPick: { doc: voice, setup: b => { b.cat = 'add'; b.openSheet('pick', { mode: 'audio', src: 'lib' }); } },
    // v12: the grips. A one-line selection (是街坊吧。, 1.7 s); a selection from the very start (the start grip turns in
    // and, meeting the end's, goes to the top-left corner); the end grip held still: time magnified around it
    kGripsShort: { doc: voice, setup: b => { b.ph = sec(70); sel(b, 62.1, 63.8); } },
    kGripsStart: { doc: voice, setup: b => { b.ph = sec(12.1); sel(b, 0, 4); } },
    kGripsHeld: { doc: voice, setup: b => { b.ph = sec(39.8); sel(b, 39.8, 58.5); const span = 134, a = 585 - 0.363 * span; b.view.a.snap(a); b.view.b.snap(a + span); b._mag = { a0: 0, b0: 1610, off: 0 }; b.dragSel = true; b._gripI = 1; b.scr.classList.add('magnified'); } },
    // v11: eight tracks, scrolled halfway, so tracks run under the waterline (play, original, undo float over them)
    kTracks8: { doc: () => { const d = S.kTracks5.doc(); d.tracks = d.tracks.concat(d.tracks.slice(0, 3).map((t, i) => Object.assign({}, t, { id: t.id + 'b' + i, name: t.name + ' 2' }))); d.layers = [{ id: 'l8', k: 'dn', v: 2, on: true }]; return d; }, setup: b => { b.ph = sec(48); b.commit(Object.assign({}, b.doc), '降噪（适中）', true); b.stack = [b.rootView()]; b.laneOff = 70; } },
  };

  const benches = [];
  function boot() {
    document.querySelectorAll('.scr[data-scene]').forEach(scr => {
      const sc = S[scr.dataset.scene]; if (!sc) { console.warn('no scene', scr.dataset.scene); return; }
      if (!sc.live) scr.classList.add('static');
      // ?lang=en / ?fs=1 render every screen in English or at font scale 1.3 (used by the checks)
      const Q = new URLSearchParams(location.search), qLang = Q.get('lang'), qFs = Q.get('fs'), qStudy = Q.get('study');
      const b = new Bench(scr, { doc: sc.doc(), live: !!sc.live, lang: qLang || sc.lang, fs: qFs ? qFs === '1' : sc.fs, study: qStudy || sc.study, musicOff: sc.musicOff, voiceOff: sc.voiceOff, chipState: sc.chipState, origin: sc.origin, showEdges: sc.showEdges, firstRun: sc.firstRun });
      scr._bench = b; b._scene = sc;
      if (sc.setup) sc.setup(b);
      // a control opened in a scene is marked the way a tap on its tool would mark it
      if (b.stack.length > 1 && !b.markTool) { const v = b.top; b.markTool = sc.mark || ({ p: v.k, plan: 'say', say: 'say', duck: 'duck', tvol: 'tvol', tfade: 'tfade', tstart: 'tstart', rec: 'rec', tts: 'tts', sub: 'sub', clone: 'clone', env: 'env', beats: 'beats', pauses: 'pauses', chorus: 'chorus', fade: 'fade', history: 'history', hand: 'move', export: 'export', err: v.k, proc: v.k, stt: 'stt', speed: 'speed', goto: 'goto', exact: 'exact', sil: 'sil', seams: 'seams', loopto: 'loopto', divide: 'divide', pieces: 'pieces' }[v.t] || null); }
      if (!sc.live) settle(b);
      if (sc.procSplit !== undefined) b.procSplit = sc.procSplit;
      benches.push(b);
    });
    requestAnimationFrame(() => {
      benches.forEach(b => {
        b.measure(); b.sizeRows(); b.draw();
        const sc = b._scene;
        if (sc.scrollTo) { const row = b.areaEl.querySelector('.strip-s'), it = row && row.querySelector(`[data-k="${sc.scrollTo}"]`); if (it) { const sep = it.previousElementSibling && it.previousElementSibling.classList.contains('sep') ? it.previousElementSibling : it; row.scrollLeft = sep.offsetLeft - row.offsetLeft - 4; row.dispatchEvent(new Event('scroll')); b.sizeRows(); row.scrollLeft = sep.offsetLeft - row.offsetLeft - 4; } }
        if (sc.modal) sc.modal(b);
        if (sc.coach) coach(b, sc.coach);
        if (sc.finger) finger(b);
        if (sc.sysback) { const s = document.createElement('div'); s.className = 'sysback'; s.innerHTML = WB.ic('ArrowBack', 20); s.style.left = '20px'; s.style.top = '46%'; b.scr.appendChild(s); }
        if (sc.live) b.showCoach('drag', '拖动选一段', b.W / 2, b.geom().mainY + b.geom().mainH * 0.35);
      });
    });
    const ro = new ResizeObserver(es => es.forEach(e => { const b = e.target.closest('.scr')._bench; if (b && b.measure()) { b.draw(); } }));
    benches.forEach(b => ro.observe(b.tlEl));
    const recolor = () => requestAnimationFrame(() => benches.forEach(b => { b.colors(); b.draw(); }));
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
    document.addEventListener('themechange', recolor);
    window.BENCHES = benches;
  }
  function coach(b, k) {
    const g = b.geom();
    b.o.coach = true;
    if (k === 'drag') b.showCoach('drag', '拖动选一段', b.W / 2, g.mainY + g.mainH * 0.35);
    if (k === 'hold') b.showCoach('hold', '按住选中的部分可以拖走', b.d2x((b.sel[0] + b.sel[1]) / 2), g.mainY + g.mainH * 0.3);
    if (k === 'hand') { b.seen.hand = false; b.showCoach('hand', '点要放的位置', b.W / 2, g.mainY + 18, true); }
    if (k === 'env') { b.seen.env = false; b.showCoach('env', '点一下加点，拖动调整', b.W / 2, g.mainY + 16, true); }
  }
  function finger(b) {
    const g = b.geom(), x = b.xOf(b.gapAt()) + b.gapW() * b.ppu() / 2, y = g.mainY + g.mainH * 0.55;
    b.hand.fx = x; b.hand.fy = y; b.draw();
    const f = document.createElement('div'); f.className = 'finger'; f.style.left = x + 'px'; f.style.top = y + 'px'; b.ovl.appendChild(f);
  }
  window.SCENES = S;
  window.resetLive = () => { const b = document.querySelector('.scr[data-scene="live"]')._bench; b.reset(S.live.doc()); requestAnimationFrame(() => b.showCoach('drag', '拖动选一段', b.W / 2, b.geom().mainY + b.geom().mainH * 0.35)); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
