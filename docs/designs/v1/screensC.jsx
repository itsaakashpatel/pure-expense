// screensC.jsx — History + Expense detail + Saved toast

function History({ onOpenTxn, extra }) {
  const [filter, setFilter] = React.useState('all');
  const chips = ['all', 'food', 'groceries', 'transport', 'shopping', 'travel', 'utilities'];
  // merge any newly-saved expense into "Today"
  let groups = TXNS;
  if (extra) {
    groups = [{ group: 'Today · Jun 9', items: [extra, ...TXNS[0].items] }, ...TXNS.slice(1)];
  }
  const monthCount = groups.reduce((n, g) => n + g.items.length, 0);

  const fg = groups
    .map(g => ({ ...g, items: g.items.filter(t => filter === 'all' || t.cat === filter) }))
    .filter(g => g.items.length);

  return (
    <div className="scr">
      <div className="scr-scroll" style={{ padding: '60px 0 110px' }}>
        {/* title + search */}
        <div style={{ padding: '8px 18px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>History</h1>
            <IconBtn name="sliders" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, padding: '0 14px', height: 44, background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14 }}>
            <Icon name="search" size={18} stroke="var(--ink-3)" />
            <span style={{ fontSize: 15, color: 'var(--ink-3)' }}>Search merchant or amount</span>
          </div>
        </div>

        {/* filter chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 18px 6px', scrollbarWidth: 'none' }}>
          {chips.map(c => {
            const on = c === filter;
            return (
              <button key={c} className="tap" onClick={() => setFilter(c)} style={{
                flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font)',
                fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
                background: on ? 'var(--accent)' : 'var(--surface)', color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                border: '1px solid ' + (on ? 'var(--accent)' : 'var(--hair)'),
              }}>{c === 'all' ? 'All' : CAT[c].label}</button>
            );
          })}
        </div>

        {/* month summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px 10px', color: 'var(--ink-3)', fontSize: 13 }}>
          <span style={{ whiteSpace: 'nowrap' }}>June 2026 · {fg.reduce((n,g)=>n+g.items.length,0)} expenses</span>
        </div>

        {/* groups */}
        <div style={{ padding: '6px 18px 0' }}>
          {fg.map(g => {
            const sub = g.items.reduce((s, t) => s + t.amount, 0);
            return (
              <section key={g.group} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 9px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', letterSpacing: '-0.01em' }}>{g.group}</span>
                  <span className="tnum" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{money(sub)}</span>
                </div>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {g.items.map((t, i) => (
                    <TxnRow key={t.id} t={t} onClick={() => onOpenTxn(t)} last={i === g.items.length - 1} />
                  ))}
                </div>
              </section>
            );
          })}
          {!fg.length && (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '60px 20px', fontSize: 15 }}>No {CAT[filter]?.label.toLowerCase()} expenses this month.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Expense detail ───────────────────────────────────────────
function Detail({ t, onBack }) {
  if (!t) return null;
  const isCafe = t.merchant === SCANNED.merchant;
  return (
    <div className="scr">
      {/* header */}
      <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '58px 16px 12px' }}>
        <button className="tap" onClick={onBack} style={hdrBtn}><Icon name="chevL" size={20} /></button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tap" style={hdrBtn}><Icon name="edit" size={18} /></button>
          <button className="tap" style={hdrBtn}><Icon name="trash" size={18} /></button>
        </div>
      </div>

      <div className="scr-scroll" style={{ padding: '4px 18px 40px' }}>
        {/* hero */}
        <div style={{ textAlign: 'center', padding: '14px 0 26px' }}>
          <CatIcon cat={t.cat} size={64} />
          <div style={{ fontSize: 21, fontWeight: 700, marginTop: 16, letterSpacing: '-0.02em' }}>{t.merchant}</div>
          <div className="tnum" style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 6 }}>{money(t.amount)}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '6px 12px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--hair)', fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: CAT[t.cat].color }} /> {CAT[t.cat].label}
          </div>
        </div>

        {/* meta */}
        <div className="card" style={{ padding: '4px 16px', marginBottom: 12 }}>
          <DetRow label="Date" value={'Jun 9, 2026' + (t.time ? ' · ' + t.time : '')} icon="calendar" />
          <DetRow label="Payment" value={t.method || 'Visa ·· 4021'} icon="card" />
          <DetRow label="Currency" value="CAD · Canadian Dollar" icon="note" last />
        </div>

        {/* itemised (for café receipt) */}
        {isCafe && (
          <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Itemised</div>
            {SCANNED.lineItems.map((li, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14.5, padding: '5px 0', color: 'var(--ink-2)' }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{li.name}</span><span className="tnum" style={{ color: 'var(--ink)' }}>{money(li.price)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--hair-2)', margin: '10px 0' }} />
            <SumRow label="Subtotal" v={SCANNED.subtotal} />
            <SumRow label="Tax + Tip" v={SCANNED.tax + SCANNED.tip} />
          </div>
        )}

        {/* receipt image */}
        <div className="eyebrow" style={{ padding: '6px 4px 10px' }}>Receipt</div>
        <div className="card" style={{ padding: 20, display: 'flex', justifyContent: 'center', background: 'var(--hair-2)' }}>
          <div style={{ width: 200, transform: 'rotate(-1.5deg)' }}>
            <PaperReceipt />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetRow({ label, value, icon, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 54, borderBottom: last ? 'none' : '1px solid var(--hair-2)' }}>
      <Icon name={icon} size={19} stroke="var(--ink-3)" />
      <span style={{ fontSize: 14.5, color: 'var(--ink-3)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

// ── Saved toast ──────────────────────────────────────────────
function SavedToast() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(244,244,245,.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
      <div className="card" style={{ padding: '28px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, boxShadow: '0 30px 60px rgba(0,0,0,.18)', animation: 'pop .4s cubic-bezier(.2,.7,.2,1) both' }}>
        <div style={{ width: 60, height: 60, borderRadius: 999, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={30} stroke="#fff" sw={2.6} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Expense saved</div>
      </div>
    </div>
  );
}

Object.assign(window, { History, Detail, SavedToast });
