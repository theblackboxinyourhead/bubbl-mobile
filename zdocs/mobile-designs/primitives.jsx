// Primitives — buttons, chips, pills, top bar, bottom nav, sub-tabs, rows.

const Icon = ({ name, size = 18, color = 'currentColor', stroke = 1.8 }) => {
  const s = { width: size, height: size, flexShrink: 0 };
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'chevron-right': return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M9 6l6 6-6 6"/></svg>);
    case 'chevron-left':  return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M15 6l-6 6 6 6"/></svg>);
    case 'chevron-down':  return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M6 9l6 6 6-6"/></svg>);
    case 'search':        return (<svg style={s} viewBox="0 0 24 24"><circle {...p} cx="11" cy="11" r="7"/><path {...p} d="M20 20l-3.5-3.5"/></svg>);
    case 'plus':          return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 5v14M5 12h14"/></svg>);
    case 'home':          return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1z"/></svg>);
    case 'calendar':      return (<svg style={s} viewBox="0 0 24 24"><rect {...p} x="3.5" y="5" width="17" height="15" rx="2.5"/><path {...p} d="M3.5 10h17M8 3v4M16 3v4"/></svg>);
    case 'list':          return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1.2" fill={color}/><circle cx="4" cy="12" r="1.2" fill={color}/><circle cx="4" cy="18" r="1.2" fill={color}/></svg>);
    case 'users':         return (<svg style={s} viewBox="0 0 24 24"><circle {...p} cx="9" cy="8" r="3.5"/><path {...p} d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><circle {...p} cx="17" cy="7" r="2.6"/><path {...p} d="M15.5 13.3c3 .2 5 2.5 5 5.5"/></svg>);
    case 'user':          return (<svg style={s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="8" r="4"/><path {...p} d="M4 20c0-4 3.5-7 8-7s8 3 8 7"/></svg>);
    case 'bell':          return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5zM10 20a2 2 0 004 0"/></svg>);
    case 'clock':         return (<svg style={s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="8.5"/><path {...p} d="M12 7.5V12l3 2"/></svg>);
    case 'mic':           return (<svg style={s} viewBox="0 0 24 24"><rect {...p} x="9" y="3" width="6" height="12" rx="3"/><path {...p} d="M5 11a7 7 0 0014 0M12 18v3"/></svg>);
    case 'pause':         return (<svg style={s} viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1" fill={color}/><rect x="13.5" y="5" width="4" height="14" rx="1" fill={color}/></svg>);
    case 'play':          return (<svg style={s} viewBox="0 0 24 24"><path d="M7 5v14l12-7z" fill={color}/></svg>);
    case 'stop':          return (<svg style={s} viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill={color}/></svg>);
    case 'check':         return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M5 12l5 5L20 7"/></svg>);
    case 'arrow-right':   return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M5 12h14M13 6l6 6-6 6"/></svg>);
    case 'dot':           return (<svg style={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill={color}/></svg>);
    case 'filter':        return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M4 5h16l-6 8v5l-4 2v-7z"/></svg>);
    case 'sort':          return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/></svg>);
    case 'phone':         return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M5 4h3l2 5-2.5 1.5a11 11 0 006 6L15 14l5 2v3a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z"/></svg>);
    case 'mail':          return (<svg style={s} viewBox="0 0 24 24"><rect {...p} x="3" y="5" width="18" height="14" rx="2"/><path {...p} d="M3 7l9 7 9-7"/></svg>);
    case 'send':          return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M4 12l16-8-6 16-3-7z"/></svg>);
    case 'shield':        return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>);
    case 'sparkle':       return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 3l1.8 4.8L19 10l-5.2 2.2L12 17l-1.8-4.8L5 10l5.2-2.2zM19 3v3M20.5 4.5h-3"/></svg>);
    case 'doc':           return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M7 3h8l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path {...p} d="M14 3v5h5M9 13h6M9 17h4"/></svg>);
    case 'logout':        return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 8l-4 4 4 4M6 12h10"/></svg>);
    case 'alert':         return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 4l9 16H3z"/><path {...p} d="M12 10v4M12 17.5v.5"/></svg>);
    case 'heart-pulse':   return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M3 11h4l2-3 3 6 2-3h7"/><path {...p} d="M20 11c0 5-4 8-8 10-4-2-8-5-8-10"/></svg>);
    case 'sliders':       return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M4 7h9M16 7h4M4 17h3M10 17h10"/><circle {...p} cx="14.5" cy="7" r="2"/><circle {...p} cx="8.5" cy="17" r="2"/></svg>);
    case 'more':          return (<svg style={s} viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8" fill={color}/><circle cx="12" cy="12" r="1.8" fill={color}/><circle cx="19" cy="12" r="1.8" fill={color}/></svg>);
    case 'back':          return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M14 6l-6 6 6 6"/></svg>);
    case 'eye':           return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle {...p} cx="12" cy="12" r="3"/></svg>);
    case 'waveform':      return (<svg style={s} viewBox="0 0 24 24"><path {...p} d="M4 12h2M8 7v10M12 4v16M16 9v6M20 12h0"/></svg>);
    default: return null;
  }
};

// ─── Buttons ──────────────────────────────────────────────────
const Button = ({ variant = 'primary', size = 'md', onClick, children, icon, trailingIcon, full, style = {}, disabled }) => {
  const h = size === 'sm' ? 40 : size === 'lg' ? 56 : 48;
  const fs = size === 'sm' ? 14 : size === 'lg' ? 17 : 15.5;
  const pad = size === 'sm' ? '0 16px' : size === 'lg' ? '0 24px' : '0 22px';

  const base = {
    height: h, padding: pad, fontSize: fs, fontWeight: 600,
    borderRadius: L.rBtn, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: full ? '100%' : 'auto', letterSpacing: -0.1,
    fontFamily: L.font, transition: 'transform .08s ease, background .15s ease, box-shadow .15s ease',
    opacity: disabled ? 0.5 : 1,
  };

  const variants = {
    primary: {
      background: L.primary, color: L.primaryInk,
      boxShadow: '0 1px 0 rgba(0,0,0,0.06), 0 1px 2px rgba(0,107,102,0.25)',
    },
    secondary: {
      background: L.secondary, color: L.secondaryInk,
    },
    ghost: {
      background: 'transparent', color: L.ink2,
    },
    tonal: {
      background: L.surfaceSoft, color: L.ink2,
    },
    destructive: {
      background: '#FDECEC', color: '#B42318',
    },
    primaryOutline: {
      background: 'transparent', color: L.primary,
      boxShadow: `inset 0 0 0 1.5px ${L.primary}`,
    },
  };

  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={size === 'sm' ? 16 : 18} />}
    </button>
  );
};

// ─── Status Pills ────────────────────────────────────────────
const STATUS = {
  sent:       { bg: L.infoBg,    fg: L.infoFg,    dot: L.infoDot,    label: 'Sent' },
  inreview:   { bg: L.warnBg,    fg: L.warnFg,    dot: L.warnDot,    label: 'In Review' },
  completed:  { bg: L.successBg, fg: L.successFg, dot: L.successDot, label: 'Completed' },
  finalized:  { bg: L.finalBg,   fg: L.finalFg,   dot: L.finalDot,   label: 'Finalized' },
  stopped:    { bg: L.errorBg,   fg: L.errorFg,   dot: L.errorDot,   label: 'Stopped' },
  active:     { bg: L.infoBg,    fg: L.infoFg,    dot: L.infoDot,    label: 'Active' },
  pending:    { bg: L.warnBg,    fg: L.warnFg,    dot: L.warnDot,    label: 'Pending' },
  needsScribe:{ bg: L.errorBg,   fg: L.errorFg,   dot: L.errorDot,   label: 'Needs scribe' },
  ready:      { bg: L.successBg, fg: L.successFg, dot: L.successDot, label: 'Ready' },
  recording:  { bg: L.errorBg,   fg: L.errorFg,   dot: L.errorDot,   label: 'Recording' },
};

const StatusPill = ({ kind, label, size = 'md' }) => {
  const s = STATUS[kind] || STATUS.sent;
  const h = size === 'sm' ? 22 : 26;
  const fs = size === 'sm' ? 11.5 : 12.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: h, padding: size === 'sm' ? '0 8px' : '0 10px',
      borderRadius: 999, background: s.bg, color: s.fg,
      fontSize: fs, fontWeight: 600, letterSpacing: -0.1,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot }} />
      {label || s.label}
    </span>
  );
};

// ─── Chips (filter) ──────────────────────────────────────────
const Chip = ({ active, onClick, children, count }) => (
  <button onClick={onClick} style={{
    height: 34, padding: '0 14px', borderRadius: 999,
    border: 'none', cursor: 'pointer', fontFamily: L.font,
    background: active ? L.ink : L.surface,
    color: active ? '#fff' : L.ink2,
    fontSize: 13.5, fontWeight: 600, letterSpacing: -0.1,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    boxShadow: active ? 'none' : `inset 0 0 0 1px ${L.hair}`,
    flexShrink: 0, transition: 'background .15s ease',
  }}>
    {children}
    {count !== undefined && (
      <span style={{
        minWidth: 18, padding: '0 5px', height: 18, borderRadius: 999,
        background: active ? 'rgba(255,255,255,0.2)' : L.surfaceSoft,
        color: active ? '#fff' : L.ink3,
        fontSize: 11, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{count}</span>
    )}
  </button>
);

// ─── Top bar (large title) ───────────────────────────────────
const TopBar = ({ title, subtitle, onBack, right, compact }) => (
  <div style={{
    padding: compact ? '12px 20px 8px' : '10px 20px 12px',
    background: L.bg, position: 'sticky', top: 0, zIndex: 10,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 }}>
      {onBack ? (
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 999, border: 'none',
          background: L.surface, boxShadow: `inset 0 0 0 1px ${L.hair}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><Icon name="back" size={18} color={L.ink2}/></button>
      ) : <div style={{ width: 36 }} />}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 8 }}>{right}</div>
    </div>
    {title && (
      <div style={{
        marginTop: compact ? 4 : 10,
        fontSize: compact ? 22 : 28, fontWeight: 700, color: L.ink,
        letterSpacing: -0.6, lineHeight: 1.1,
      }}>{title}</div>
    )}
    {subtitle && (
      <div style={{ marginTop: 4, fontSize: 13.5, color: L.ink3, lineHeight: 1.4 }}>{subtitle}</div>
    )}
  </div>
);

// ─── Bottom nav (persistent) ─────────────────────────────────
const BottomNav = ({ tabs, active, onChange }) => (
  <div style={{
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingBottom: 22, paddingTop: 8, background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderTop: `1px solid ${L.hair}`, boxShadow: L.navShadow,
    display: 'flex', justifyContent: 'space-around', alignItems: 'stretch',
    zIndex: 40,
  }}>
    {tabs.map(t => {
      const isActive = t.key === active;
      return (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
          padding: '6px 4px 2px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 3, fontFamily: L.font,
          color: isActive ? L.primary : L.ink4,
        }}>
          <div style={{ position: 'relative' }}>
            <Icon name={t.icon} size={24} color={isActive ? L.primary : L.ink4} stroke={isActive ? 2 : 1.7}/>
            {t.badge && (
              <span style={{
                position: 'absolute', top: -3, right: -6,
                minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                background: L.errorDot, color: '#fff',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{t.badge}</span>
            )}
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.1 }}>{t.label}</span>
        </button>
      );
    })}
  </div>
);

// ─── Segmented sub-tabs ──────────────────────────────────────
const SegmentedTabs = ({ tabs, active, onChange }) => (
  <div style={{
    display: 'flex', padding: 4, background: L.surfaceSoft,
    borderRadius: 12, margin: '4px 20px 0', gap: 2,
  }}>
    {tabs.map(t => {
      const isActive = t === active || t.key === active;
      const key = typeof t === 'string' ? t : t.key;
      const label = typeof t === 'string' ? t : t.label;
      return (
        <button key={key} onClick={() => onChange(key)} style={{
          flex: 1, height: 34, border: 'none', borderRadius: 9,
          background: isActive ? L.surface : 'transparent',
          color: isActive ? L.ink : L.ink3,
          fontSize: 13.5, fontWeight: 600, letterSpacing: -0.1, cursor: 'pointer',
          boxShadow: isActive ? '0 1px 3px rgba(16,24,40,0.08)' : 'none',
          transition: 'all .18s cubic-bezier(.2,.9,.3,1.2)', fontFamily: L.font,
        }}>{label}</button>
      );
    })}
  </div>
);

// ─── Search field (sticky) ───────────────────────────────────
const SearchField = ({ value, onChange, placeholder = 'Search' }) => (
  <div style={{ padding: '6px 20px 8px', background: L.bg, position: 'sticky', top: 0, zIndex: 5 }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      height: 40, padding: '0 14px', borderRadius: 12,
      background: L.surface, boxShadow: `inset 0 0 0 1px ${L.hair}`,
    }}>
      <Icon name="search" size={16} color={L.ink4}/>
      <input value={value || ''} onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontFamily: L.font, fontSize: 14.5, color: L.ink, letterSpacing: -0.1,
        }}/>
    </div>
  </div>
);

// ─── Scroll area that respects the bottom nav ────────────────
const Scroller = ({ children, style = {}, pb = 110 }) => (
  <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: pb, ...style }}>
    {children}
  </div>
);

// ─── Section wrapper ──────────────────────────────────────────
const Section = ({ title, action, children, pad = '20px', gap = 10 }) => (
  <div style={{ padding: `4px ${pad} 12px` }}>
    {(title || action) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: gap }}>
        {title && (
          <div style={{
            fontSize: 13, fontWeight: 700, color: L.ink3,
            letterSpacing: 0.6, textTransform: 'uppercase',
          }}>{title}</div>
        )}
        {action}
      </div>
    )}
    {children}
  </div>
);

// ─── List row (compact) ──────────────────────────────────────
const ListRow = ({ onClick, children, first, last, style = {} }) => (
  <div onClick={onClick} style={{
    padding: '14px 16px', cursor: onClick ? 'pointer' : 'default',
    borderBottom: last ? 'none' : `1px solid ${L.divider}`,
    background: L.surface,
    borderTopLeftRadius: first ? 16 : 0,
    borderTopRightRadius: first ? 16 : 0,
    borderBottomLeftRadius: last ? 16 : 0,
    borderBottomRightRadius: last ? 16 : 0,
    ...style,
  }}>
    {children}
  </div>
);

// ─── Avatar (initials) ───────────────────────────────────────
const Avatar = ({ name, size = 36, tint }) => {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  // deterministic hue from name
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const bg = tint || `oklch(0.93 0.04 ${h})`;
  const fg = tint ? '#fff' : `oklch(0.35 0.06 ${h})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0, letterSpacing: -0.2,
    }}>{initials}</div>
  );
};

Object.assign(window, {
  Icon, Button, StatusPill, Chip, TopBar, BottomNav, SegmentedTabs, SearchField,
  Scroller, Section, ListRow, Avatar, STATUS,
});
