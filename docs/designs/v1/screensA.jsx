// screensA.jsx — Onboarding + Dashboard

function Onboarding({ onStart }) {
  const receipts = [
    { w: 184, rot: -8, x: -54, y: 12, z: 1, o: .55, s: .9 },
    { w: 196, rot: 7,  x: 60,  y: 4,  z: 2, o: .8,  s: .96 },
    { w: 210, rot: -2, x: 4,   y: 0,  z: 3, o: 1,   s: 1 },
  ];
  return (
    <div className="scr" style={{ background: 'var(--surface)' }}>
      <div className="scr-scroll" style={{ display: 'flex', flexDirection: 'column', padding: '0 26px' }}>
        {/* hero illustration */}
        <div style={{ flex: 1, minHeight: 360, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
          {receipts.map((r, i) => (
            <div key={i} className="fade-up" style={{
              position: 'absolute', width: r.w, zIndex: r.z, opacity: r.o,
              transform: `translate(${r.x}px, ${r.y}px) rotate(${r.rot}deg) scale(${r.s})`,
              animationDelay: (i * 90) + 'ms',
            }}>
              <ReceiptCard active={i === 2} />
            </div>
          ))}
          {/* scan badge */}
          <div className="fade-up" style={{
            position: 'absolute', bottom: 28, right: 36, zIndex: 5,
            width: 64, height: 64, borderRadius: 22, background: 'var(--accent)', color: 'var(--accent-ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 30px rgba(0,0,0,.28)', animationDelay: '320ms',
          }}>
            <Icon name="scan" size={30} sw={1.9} />
          </div>
        </div>

        <div className="fade-up" style={{ animationDelay: '180ms', paddingBottom: 8 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Pure · Expenses</div>
          <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.04, fontWeight: 700, letterSpacing: '-0.03em' }}>
            Scan a receipt.<br/>Log it in seconds.
          </h1>
          <p style={{ margin: '16px 0 0', fontSize: 17, lineHeight: 1.5, color: 'var(--ink-2)', maxWidth: 300 }}>
            Point your camera, review what we read, and save. Every expense, verified before it counts.
          </p>
        </div>

        <div style={{ padding: '26px 0 30px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn-primary tap" onClick={onStart} style={{ height: 56, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
            <Icon name="camera" size={21} sw={1.9} /> Scan your first receipt
          </button>
          <button onClick={onStart} style={{ height: 50, background: 'none', border: 'none', fontFamily: 'var(--font)', fontSize: 16, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>
            Enter one manually
          </button>
        </div>
      </div>
    </div>
  );
}

// a small stylised receipt graphic
function ReceiptCard({ active }) {
  const lines = [.9, .55, .7, .4];
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 16,
      border: '1px solid var(--hair)',
      boxShadow: active ? '0 30px 60px rgba(0,0,0,.16)' : '0 12px 30px rgba(0,0,0,.08)',
      padding: '18px 16px 16px', position: 'relative', overflow: 'hidden',
    }}>
      {active && (
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--ink), transparent)',
          animation: 'scanline 2.6s ease-in-out infinite',
        }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--ink)' }} />
        <div style={{ width: 44, height: 8, borderRadius: 4, background: 'var(--hair)' }} />
      </div>
      {lines.map((w, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ width: `${w * 100}%`, height: 7, borderRadius: 4, background: 'var(--hair-2)' }} />
          <div style={{ width: 28, height: 7, borderRadius: 4, background: 'var(--hair)' }} />
        </div>
      ))}
      <div style={{ height: 1, background: 'var(--hair)', margin: '6px 0 12px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 40, height: 9, borderRadius: 4, background: 'var(--ink-3)' }} />
        <div style={{ width: 56, height: 13, borderRadius: 4, background: 'var(--ink)' }} />
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────
function Dashboard({ onOpenTxn, onSeeAll }) {
  const max = Math.max(...MONTHS.map(m => m.total));
  const delta = ((MONTH_TOTAL - PREV_TOTAL) / PREV_TOTAL) * 100;
  const budgetPct = Math.min(100, (MONTH_TOTAL / BUDGET) * 100);
  const recent = TXNS[0].items.concat(TXNS[1].items).slice(0, 3);

  return (
    <div className="scr">
      <div className="scr-scroll" style={{ padding: '60px 18px 110px' }}>
        {/* header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em' }}>June 2026</span>
            <div style={{ width: 24, height: 24, borderRadius: 999, background: 'var(--hair-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevD" size={15} stroke="var(--ink-2)" sw={2} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <IconBtn name="bell" />
            <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600 }}>AR</div>
          </div>
        </header>

        {/* hero total */}
        <section className="card" style={{ padding: '22px 22px 20px', marginBottom: 14 }}>
          <div className="eyebrow">Total spent</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 10 }}>
            <span className="tnum" style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: .95 }}>{money(MONTH_TOTAL)}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 7, padding: '2px 7px', border: '1px solid var(--hair)', borderRadius: 7 }}>CAD</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)' }}>
              <Icon name="arrowUp" size={15} sw={2.2} /> {delta.toFixed(1)}%
            </span>
            <span style={{ fontSize: 13.5, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>vs. {money(PREV_TOTAL, { cents: false })} in May</span>
          </div>
          {/* budget bar */}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 7 }}>
              <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Budget</span>
              <span className="tnum">{money(MONTH_TOTAL, { cents: false })} of {money(BUDGET, { cents: false })}</span>
            </div>
            <div style={{ height: 7, borderRadius: 999, background: 'var(--hair)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: budgetPct + '%', background: 'var(--accent)', borderRadius: 999 }} />
            </div>
          </div>
        </section>

        {/* monthly chart */}
        <section className="card" style={{ padding: '20px 20px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Monthly spending</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Last 6 months</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, height: 132 }}>
            {MONTHS.map((m, i) => {
              const cur = i === MONTHS.length - 1;
              const h = Math.round((m.total / max) * 116) + 4;
              return (
                <div key={m.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span className="tnum" style={{ fontSize: 10.5, fontWeight: 600, color: cur ? 'var(--ink)' : 'transparent' }}>
                    {(m.total / 1000).toFixed(1)}k
                  </span>
                  <div style={{
                    width: '100%', maxWidth: 30, height: h, borderRadius: 8,
                    background: cur ? 'var(--accent)' : 'var(--hair)',
                  }} />
                  <span style={{ fontSize: 11.5, fontWeight: cur ? 700 : 500, color: cur ? 'var(--ink)' : 'var(--ink-3)' }}>{m.m}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* category breakdown */}
        <section className="card" style={{ padding: '20px 20px 8px', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 18 }}>Where it went</div>
          {BREAKDOWN.map((b, i) => {
            const pct = (b.amount / MONTH_TOTAL) * 100;
            return (
              <div key={b.cat} style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
                <CatIcon cat={b.cat} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{CAT[b.cat].label}</span>
                    <span className="tnum" style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{money(b.amount)}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: 'var(--hair-2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: CAT[b.cat].color, borderRadius: 999 }} />
                  </div>
                </div>
                <span className="tnum" style={{ fontSize: 12, color: 'var(--ink-3)', width: 32, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </section>

        {/* recent */}
        <section style={{ padding: '4px 4px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px' }}>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Recent</span>
            <button onClick={onSeeAll} style={{ background: 'none', border: 'none', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>See all</button>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {recent.map((t, i) => (
              <TxnRow key={t.id} t={t} onClick={() => onOpenTxn(t)} last={i === recent.length - 1} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function IconBtn({ name, onClick }) {
  return (
    <button className="tap" onClick={onClick} style={{
      width: 38, height: 38, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--hair)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink)',
    }}>
      <Icon name={name} size={19} />
    </button>
  );
}

function TxnRow({ t, onClick, last }) {
  return (
    <div className="tap" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px',
      borderBottom: last ? 'none' : '1px solid var(--hair-2)',
    }}>
      <CatIcon cat={t.cat} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.merchant}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{CAT[t.cat].label}{t.time ? ' · ' + t.time : ''}</div>
      </div>
      <span className="tnum" style={{ fontSize: 15.5, fontWeight: 600 }}>{money(t.amount)}</span>
    </div>
  );
}

Object.assign(window, { Onboarding, Dashboard, TxnRow, IconBtn });
