// ui.jsx — shared primitives, icons, money formatting

const CAT = {
  food:       { label: 'Food & Dining', color: 'var(--c-food)',       hex: '#161616' },
  groceries:  { label: 'Groceries',     color: 'var(--c-groceries)',  hex: '#3A3A3D' },
  transport:  { label: 'Transport',     color: 'var(--c-transport)',  hex: '#5C5C61' },
  shopping:   { label: 'Shopping',      color: 'var(--c-shopping)',   hex: '#828289' },
  travel:     { label: 'Travel',        color: 'var(--c-travel)',     hex: '#A8A8AE' },
  utilities:  { label: 'Utilities',     color: 'var(--c-utilities)',  hex: '#CBCBD0' },
};

function money(n, { cents = true, sign = false } = {}) {
  const neg = n < 0;
  const v = Math.abs(n);
  const s = v.toLocaleString('en-CA', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  const pre = sign ? (neg ? '−' : '+') : (neg ? '−' : '');
  return pre + '$' + s;
}

// ── Icon set — 1.75 stroke, rounded ──────────────────────────
function Icon({ name, size = 22, stroke = 'currentColor', sw = 1.75, fill = 'none', style }) {
  const p = { fill: 'none', stroke, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5" {...p}/><path d="M5 9.5V20h14V9.5" {...p}/></>,
    list: <><path d="M8 7h12M8 12h12M8 17h12" {...p}/><circle cx="4" cy="7" r="1.2" fill={stroke} stroke="none"/><circle cx="4" cy="12" r="1.2" fill={stroke} stroke="none"/><circle cx="4" cy="17" r="1.2" fill={stroke} stroke="none"/></>,
    camera: <><path d="M3 8.5A2 2 0 0 1 5 6.5h2l1.2-2h7.6L19 6.5h0a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" {...p}/><circle cx="12" cy="13" r="3.6" {...p}/></>,
    scan: <><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" {...p}/><path d="M7 12h10" {...p}/></>,
    plus: <path d="M12 5v14M5 12h14" {...p}/>,
    check: <path d="M5 12.5 10 17.5 19 6.5" {...p}/>,
    checkCircle: <><circle cx="12" cy="12" r="9" {...p}/><path d="M8 12.2 11 15.2 16.5 9" {...p}/></>,
    chevR: <path d="M9 6l6 6-6 6" {...p}/>,
    chevL: <path d="M15 6l-6 6 6 6" {...p}/>,
    chevD: <path d="M6 9l6 6 6-6" {...p}/>,
    close: <path d="M6 6l12 12M18 6 6 18" {...p}/>,
    flash: <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" {...p}/>,
    image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" {...p}/><circle cx="8.5" cy="9.5" r="1.6" {...p}/><path d="M4 17l4.5-4 3.5 3 3-2.5L20.5 18" {...p}/></>,
    search: <><circle cx="11" cy="11" r="6.5" {...p}/><path d="m16 16 4 4" {...p}/></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" {...p}/><path d="M3.5 9.5h17M8 3v4M16 3v4" {...p}/></>,
    trash: <><path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" {...p}/></>,
    edit: <><path d="M4 20h4L19 9l-4-4L4 16v4Z" {...p}/><path d="M14 6l4 4" {...p}/></>,
    sliders: <><path d="M5 7h9M18 7h1M5 17h1M10 17h9" {...p}/><circle cx="16" cy="7" r="2" {...p}/><circle cx="8" cy="17" r="2" {...p}/></>,
    arrowUp: <path d="M12 19V5M6 11l6-6 6 6" {...p}/>,
    arrowDown: <path d="M12 5v14M6 13l6 6 6-6" {...p}/>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" {...p}/><path d="M10 19a2 2 0 0 0 4 0" {...p}/></>,
    card: <><rect x="3" y="5.5" width="18" height="13" rx="3" {...p}/><path d="M3 10h18M7 14.5h4" {...p}/></>,
    note: <><path d="M5 4.5h14v15H5z" {...p}/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" {...p}/></>,
    // category glyphs
    c_food: <><path d="M7 3v7M7 10c-1.5 0-2.5-1-2.5-3V3M7 10v11M17 3c-2 0-3 2-3 5s1 4 3 4v9" {...p}/></>,
    c_groceries: <><path d="M5 8h14l-1.3 9.5a2 2 0 0 1-2 1.7H8.3a2 2 0 0 1-2-1.7L5 8Z" {...p}/><path d="M8.5 8 11 3.5M15.5 8 13 3.5M9 12v3M15 12v3M12 12v3" {...p}/></>,
    c_transport: <><path d="M5 16v2.5M19 16v2.5M4 16h16M5 16l1.5-6h11L19 16M4 16a2 2 0 0 1 1.2-1.8M20 16a2 2 0 0 0-1.2-1.8" {...p}/><circle cx="8" cy="13" r=".4" fill={stroke} stroke="none"/></>,
    c_shopping: <><path d="M6 8h12l1 11.5H5L6 8Z" {...p}/><path d="M9 9V6a3 3 0 0 1 6 0v3" {...p}/></>,
    c_travel: <><path d="M21 13.5 3 18l2-4-1-7 3 1 3 4 6-2a1.5 1.5 0 0 1 2 2.5l-2 1.5Z" {...p}/></>,
    c_utilities: <path d="M13 3 5 13.5h5L9 21l9-11h-5l1-7Z" {...p}/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function CatIcon({ cat, size = 38, on = 'var(--surface)', bg }) {
  const c = CAT[cat];
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
      background: bg || c.color, color: on,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={'c_' + cat} size={size * 0.55} sw={1.7} />
    </div>
  );
}

Object.assign(window, { CAT, money, Icon, CatIcon });
