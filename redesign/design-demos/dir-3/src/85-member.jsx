/* ===== Membership: sells only what needs the network ===== */
function MemberScreen({ ph, p, dir }) {
  const M = SJ.MEMBERSHIP, V = SJ.VOICES.online;
  const [plan, setPlan] = useState('year');
  const [play, setPlay] = useState(p.play || null);
  useEffect(() => { if (!play) return; const t = setTimeout(() => setPlay(null), 3200); return () => clearTimeout(t); }, [play]);
  const pv = V.find(v => v.id === play);
  const buy = () => { const go = () => ph.openSheet('pay', { plan }); if (!ph.user) ph.openSheet('login', { then: go }); else go(); };
  const P = M.plans.find(x => x.id === plan);
  const icons = ['head', 'mic', 'music', 'sparkle', 'batch', 'spines'];
  return <div className={cx('scr', dir)}>
    <Hdr title="声剪会员" onBack={ph.nav.pop} back="close" right={<button className="t2" style={{ fontSize: 14, padding: '0 14px' }} onClick={() => ph.toast(ph.user ? '查过了：这个账号没有可恢复的购买' : '先登录，再恢复购买')}>恢复购买</button>} />
    <div className="body">
      {ph.member && <div className="gate" style={{ marginBottom: 12 }}><b>年度会员，试用到 11月30日</b><p>试用结束前一天提醒你；随时在 Google Play 取消。</p></div>}
      <div className="pad"><p style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.3, letterSpacing: '.01em' }}>剪，一直免费。</p>
        <p className="t2" style={{ fontSize: 16, lineHeight: 1.6, marginTop: 6 }}>会员给你的，是要联网才有的那几样。</p></div>
      <div style={{ margin: '18px 12px 0', padding: '16px 6px 12px', borderRadius: 24, background: 'var(--s1)' }}>
        <p className="pad" style={{ fontSize: 14, color: 'var(--t3)' }}>6 位真人感音色，点一位听听</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', marginTop: 10 }}>{V.map(v => <button key={v.id} onClick={() => setPlay(x => (x === v.id ? null : v.id))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', height: 128, display: 'flex', alignItems: 'center' }}><Mini S={shortEnv(v.id, 3.2)} w={30} h={128} half={15} lit={play === v.id ? 1 : null} alpha={play && play !== v.id ? 0.45 : 0.95} /></div>
          <span style={{ fontSize: 14, fontWeight: play === v.id ? 600 : 400, color: play === v.id ? 'var(--t1)' : 'var(--t2)' }}>{v.name}</span></button>)}</div>
        <p className="pad" style={{ marginTop: 10, minHeight: 46, fontSize: 14.5, lineHeight: 1.55, color: pv ? 'var(--t1)' : 'var(--t3)' }}>{pv ? <Fragment>「{pv.sample}」<span className="t3" style={{ display: 'block', fontSize: 13 }}>{pv.name}，{pv.desc.replace(' · ', '，')}，适合{pv.use}</span></Fragment> : '每月 20 万字，够读 60 多期十分钟的播客稿。'}</p>
      </div>
      <div className="st" style={{ marginTop: 22 }}><b>会员多给你的</b></div>
      {M.pro.map((x, i) => <div key={x} className="li" style={{ minHeight: 48, padding: '6px 16px' }}><span style={{ color: 'var(--vip)', display: 'grid' }}><Icon n={icons[i]} s={20} /></span><div className="lt"><b style={{ fontSize: 15 }}>{x.replace(' · ', '，')}</b></div></div>)}
      <div className="st" style={{ marginTop: 18 }}><b>选一个</b><span>{M.priceNote}</span></div>
      <div className="pad" style={{ display: 'grid', gap: 8 }}>{M.plans.map(x => <button key={x.id} className={cx('opt', plan === x.id && 'on')} onClick={() => setPlan(x.id)} style={{ padding: '12px 16px' }}>
        <span className={cx('radio', plan === x.id && 'on')} />
        <div className="lt"><b style={{ fontSize: 16 }}>{x.name}{x.best && <span className="vip" style={{ marginLeft: 8 }}>最划算</span>}</b><span>{x.note.replace(/ · /g, '，')}</span></div>
        <b className="num" style={{ fontSize: 16 }}>{x.price}</b></button>)}</div>
      <div className="st" style={{ marginTop: 22 }}><b>不开会员也能用的</b></div>
      <div className="pad" style={{ display: 'grid', gap: 8, paddingBottom: 8 }}>{M.free.map(x => <div key={x} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15 }}><span style={{ color: 'var(--glow)', display: 'grid' }}><Icon n="check" s={18} w={2.2} /></span><span style={{ fontWeight: /水印/.test(x) ? 600 : 400 }}>{x}</span></div>)}</div>
      <p className="note pad" style={{ padding: '14px 16px 20px' }}>{M.privacy}。买会员需要登录；付款和取消都在 Google Play。</p>
    </div>
    <div className="dock" style={{ padding: '10px 14px 12px' }}>
      {ph.member ? <Btn full onClick={() => ph.nav.pop()}>回去用</Btn> : <Fragment>
        <Btn k="pri" full onClick={buy}>{plan === 'year' ? '免费试用 7 天，然后 ' + P.price : plan === 'month' ? '开通连续包月 ' + P.price : '买一张周卡 ' + P.price}</Btn>
        <p className="note" style={{ textAlign: 'center', marginTop: 6 }}>示例价格，以 Google Play 为准</p></Fragment>}
    </div>
  </div>;
}
SCREENS.member = MemberScreen;
function PaySheet({ ph, p, onClose }) {
  const P = SJ.MEMBERSHIP.plans.find(x => x.id === p.plan);
  return <Sheet title={null} onClose={onClose}>
    <div className="pad" style={{ paddingTop: 4 }}><p className="note">Google Play 结算（系统界面，示意）</p>
      <p style={{ fontSize: 19, fontWeight: 600, marginTop: 8 }}>声剪 {P.name}</p>
      <div className="card" style={{ padding: '4px 14px', marginTop: 10 }}>
        {p.plan === 'year' && <div className="kv"><span>今天</span>¥0，免费试用 7 天</div>}
        <div className="kv" style={{ borderTop: p.plan === 'year' ? '1px solid var(--line)' : 0 }}><span>{p.plan === 'year' ? '11月30日起' : '每期'}</span>{P.price}</div>
        <div className="kv" style={{ borderTop: '1px solid var(--line)' }}><span>账号</span>{ph.user}</div></div>
      <p className="note" style={{ marginTop: 8 }}>示例价格。随时可以在 Google Play 的「订阅」里取消。</p>
      <Btn k="pri" full style={{ marginTop: 14 }} onClick={() => { ph.setMember(true); onClose(); ph.toast(p.plan === 'year' ? '开通了，试用到 11月30日' : '开通了'); }}>订阅</Btn></div>
  </Sheet>;
}
SHEETS.pay = PaySheet;
