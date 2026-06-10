// screensB.jsx — Scan / Camera + Verify & edit

function Scan({ onClose, onCaptured, radius }) {
  const [phase, setPhase] = React.useState('aim'); // aim | shot | reading
  const [flash, setFlash] = React.useState(false);
  const steps = ['Detecting edges', 'Reading text', 'Finding total'];
  const [step, setStep] = React.useState(0);

  const capture = () => {
    setPhase('shot');
    setTimeout(() => setPhase('reading'), 220);
  };
  React.useEffect(() => {
    if (phase !== 'reading') return;
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 560);
    const t2 = setTimeout(() => setStep(2), 1120);
    const t3 = setTimeout(() => onCaptured(), 1850);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase]);

  return (
    <div className="scr" style={{ background: '#0B0B0C' }}>
      {/* viewfinder texture */}
      <div style={{ position: 'absolute', inset: 0, background:
        'radial-gradient(120% 80% at 50% 18%, #1c1c1f 0%, #101012 55%, #050506 100%)' }} />

      {/* top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '58px 18px 0' }}>
        <GlassBtn onClick={onClose}><Icon name="close" size={20} stroke="#fff" /></GlassBtn>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Scan receipt</span>
        <GlassBtn active={flash} onClick={() => setFlash(f => !f)}><Icon name="flash" size={19} stroke={flash ? '#0B0B0C' : '#fff'} fill={flash ? '#fff' : 'none'} /></GlassBtn>
      </div>

      {/* receipt + detection frame */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 250, transform: phase === 'aim' ? 'rotate(-3deg)' : 'rotate(0deg)', transition: 'transform .4s cubic-bezier(.2,.7,.2,1)' }}>
          {/* paper */}
          <div style={{ filter: phase === 'shot' ? 'brightness(2.2)' : 'none', transition: 'filter .18s' }}>
            <PaperReceipt />
          </div>
          {/* corner brackets */}
          <DetectFrame reading={phase !== 'aim'} />
          {/* scan line */}
          {phase === 'aim' && (
            <div style={{ position: 'absolute', left: 6, right: 6, height: 2, borderRadius: 2,
              background: 'linear-gradient(90deg,transparent,#fff,transparent)', boxShadow: '0 0 12px #fff',
              animation: 'scanline 2.4s ease-in-out infinite' }} />
          )}
        </div>
      </div>

      {/* hint */}
      <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', color: 'rgba(255,255,255,.7)', fontSize: 14, fontWeight: 500, marginBottom: 18, height: 20 }}>
        {phase === 'aim' ? 'Position the receipt inside the frame' : ''}
      </div>

      {/* controls */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px 48px' }}>
        <GlassBtn onClick={onClose} size={50}><Icon name="image" size={22} stroke="#fff" /></GlassBtn>
        <button className="tap" onClick={capture} disabled={phase !== 'aim'} aria-label="Capture" style={{
          width: 76, height: 76, borderRadius: 999, background: 'none', border: '4px solid rgba(255,255,255,.9)',
          padding: 5, cursor: 'pointer',
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 999, background: '#fff' }} />
        </button>
        <GlassBtn onClick={onClose} size={50}><Icon name="edit" size={21} stroke="#fff" /></GlassBtn>
      </div>

      {/* reading overlay */}
      {phase === 'reading' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 8, background: 'rgba(6,6,8,.72)', backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <div style={{ width: 54, height: 54, borderRadius: 999, border: '3px solid rgba(255,255,255,.18)', borderTopColor: '#fff', animation: 'spin .8s linear infinite' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>Reading receipt</div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, marginTop: 6 }}>{steps[step]}…</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {steps.map((_, i) => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: 999, background: i <= step ? '#fff' : 'rgba(255,255,255,.25)', transition: 'background .3s' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GlassBtn({ children, onClick, size = 44, active }) {
  return (
    <button className="tap" onClick={onClick} style={{
      width: size, height: size, borderRadius: 999, cursor: 'pointer',
      background: active ? '#fff' : 'rgba(255,255,255,.14)',
      border: '1px solid rgba(255,255,255,.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  );
}

function PaperReceipt() {
  const rows = [['Flat White','5.25'],['Avocado Toast','14.00'],['Sparkling Water','4.50']];
  return (
    <div style={{ background: '#fafafa', borderRadius: 4, padding: '20px 18px', boxShadow: '0 30px 60px rgba(0,0,0,.5)', color: '#111', fontFamily: 'var(--font)' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '.04em' }}>CAFÉ PAMENAR</div>
        <div style={{ fontSize: 9.5, color: '#888', marginTop: 3 }}>Toronto, ON · Jun 9 2026</div>
      </div>
      <div style={{ borderTop: '1px dashed #bbb', borderBottom: '1px dashed #bbb', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span>{r[0]}</span><span className="tnum">{r[1]}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, marginTop: 11 }}>
        <span>TOTAL</span><span className="tnum">$31.59</span>
      </div>
    </div>
  );
}

function DetectFrame({ reading }) {
  const col = '#fff';
  const C = ({ style }) => (
    <div style={{ position: 'absolute', width: 26, height: 26, borderColor: col, borderStyle: 'solid', ...style }} />
  );
  const o = -12;
  return (
    <div style={{ position: 'absolute', inset: 0, transition: 'opacity .3s', opacity: reading ? 1 : .85 }}>
      <C style={{ top: o, left: o, borderWidth: '3px 0 0 3px', borderRadius: '6px 0 0 0' }} />
      <C style={{ top: o, right: o, borderWidth: '3px 3px 0 0', borderRadius: '0 6px 0 0' }} />
      <C style={{ bottom: o, left: o, borderWidth: '0 0 3px 3px', borderRadius: '0 0 0 6px' }} />
      <C style={{ bottom: o, right: o, borderWidth: '0 3px 3px 0', borderRadius: '0 0 6px 0' }} />
    </div>
  );
}

// ── Verify & edit ────────────────────────────────────────────
function Verify({ onClose, onSave }) {
  const d = SCANNED;
  const [merchant, setMerchant] = React.useState(d.merchant);
  const [cat, setCat] = React.useState(d.cat);
  const [amount, setAmount] = React.useState(d.total);
  const [showItems, setShowItems] = React.useState(true);
  const cats = ['food', 'groceries', 'transport', 'shopping', 'travel', 'utilities'];

  return (
    <div className="scr" style={{ background: 'var(--canvas)' }}>
      {/* header */}
      <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '58px 16px 12px', background: 'var(--canvas)' }}>
        <button className="tap" onClick={onClose} style={hdrBtn}><Icon name="close" size={20} /></button>
        <span style={{ fontSize: 16, fontWeight: 700 }}>Review expense</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px 5px 8px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--hair)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>
          <Icon name="checkCircle" size={15} /> {Math.round(d.confidence * 100)}%
        </div>
      </div>

      <div className="scr-scroll" style={{ padding: '6px 16px 120px' }}>
        {/* amount hero */}
        <div className="card fade-up" style={{ padding: '20px 20px 22px', marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* receipt thumb */}
          <div style={{ width: 58, height: 74, borderRadius: 10, background: '#fafafa', border: '1px solid var(--hair)', flexShrink: 0, padding: 7, overflow: 'hidden' }}>
            <div style={{ height: 6, width: '70%', background: 'var(--ink)', borderRadius: 2, margin: '2px auto 6px' }} />
            {[.9,.6,.75,.5].map((w,i)=><div key={i} style={{ height: 4, width: `${w*100}%`, background: 'var(--hair)', borderRadius: 2, marginBottom: 4 }} />)}
          </div>
          <div style={{ flex: 1 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Total · {d.currency}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span className="tnum" style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em' }}>{money(amount)}</span>
            </div>
            <button className="tap" style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <Icon name="edit" size={14} /> Edit amount
            </button>
          </div>
        </div>

        {/* fields */}
        <div className="card fade-up" style={{ padding: '4px 16px', marginBottom: 12, animationDelay: '60ms' }}>
          <Field label="Merchant" verified>
            <input value={merchant} onChange={e => setMerchant(e.target.value)} style={inp} />
          </Field>
          <Field label="Date" verified>
            <span style={{ fontSize: 15.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.date} · {d.time}</span>
            <Icon name="calendar" size={18} stroke="var(--ink-3)" />
          </Field>
          <Field label="Payment" verified last>
            <span style={{ fontSize: 15.5, fontWeight: 600 }}>{d.method}</span>
            <Icon name="card" size={18} stroke="var(--ink-3)" />
          </Field>
        </div>

        {/* category */}
        <div className="fade-up" style={{ animationDelay: '120ms', marginBottom: 12 }}>
          <div className="eyebrow" style={{ padding: '4px 6px 10px' }}>Category</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {cats.map(c => {
              const on = c === cat;
              return (
                <button key={c} className="tap" onClick={() => setCat(c)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '13px 6px',
                  borderRadius: 14, cursor: 'pointer', fontFamily: 'var(--font)',
                  background: on ? 'var(--accent)' : 'var(--surface)',
                  border: '1px solid ' + (on ? 'var(--accent)' : 'var(--hair)'),
                  color: on ? 'var(--accent-ink)' : 'var(--ink)',
                }}>
                  <Icon name={'c_' + c} size={22} sw={1.7} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.1, textAlign: 'center' }}>{CAT[c].label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* line items */}
        <div className="card fade-up" style={{ padding: '16px 18px', animationDelay: '180ms' }}>
          <button onClick={() => setShowItems(s => !s)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font)' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Itemised · {d.lineItems.length}</span>
            <Icon name="chevD" size={18} stroke="var(--ink-3)" style={{ transform: showItems ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }} />
          </button>
          {showItems && (
            <div style={{ marginTop: 14 }}>
              {d.lineItems.map((li, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14.5, padding: '6px 0', color: 'var(--ink-2)' }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{li.name}</span><span className="tnum" style={{ color: 'var(--ink)', fontWeight: 500 }}>{money(li.price)}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--hair-2)', margin: '8px 0' }} />
              <SumRow label="Subtotal" v={d.subtotal} />
              <SumRow label="Tax (HST 13%)" v={d.tax} />
              <SumRow label="Tip" v={d.tip} />
              <div style={{ height: 1, background: 'var(--hair-2)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                <span>Total</span><span className="tnum">{money(d.total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* save bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10, padding: '14px 16px 30px',
        background: 'linear-gradient(to top, var(--canvas) 60%, transparent)' }}>
        <button className="btn-primary tap" onClick={() => onSave({ merchant, cat, amount })} style={{ width: '100%', height: 56, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="check" size={20} stroke="#fff" sw={2.4} /> Save expense
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, verified, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 56, borderBottom: last ? 'none' : '1px solid var(--hair-2)', gap: 12 }}>
      <span style={{ fontSize: 13.5, color: 'var(--ink-3)', width: 78, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>{children}</div>
      {verified && <Icon name="checkCircle" size={17} stroke="var(--ink)" />}
    </div>
  );
}
function SumRow({ label, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0', color: 'var(--ink-2)' }}>
      <span>{label}</span><span className="tnum">{money(v)}</span>
    </div>
  );
}

const hdrBtn = { width: 38, height: 38, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink)' };
const inp = { flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', padding: 0, width: '100%' };

Object.assign(window, { Scan, Verify });
