// Lumina design tokens — mobile
// Single source of truth for color, radius, spacing, shadow, type.

const L = {
  // Neutrals (cool, near-white surfaces)
  bg:        '#F6F5F8',   // app canvas (subtle lilac-cool)
  surface:   '#FFFFFF',   // card
  surfaceSoft: '#F2F1F5', // inset row / chip bg
  hair:      '#ECEAF1',   // hairline
  divider:   '#EFEDF2',   // dividers
  ink:       '#0E121A',   // primary text
  ink2:      '#1F2937',   // body
  ink3:      '#4B5563',   // muted
  ink4:      '#6B7280',   // caption
  ink5:      '#9CA3AF',   // placeholder

  // Primary (Lumina teal — solid, NO gradient)
  primary:        '#006B66',
  primaryHover:   '#0A7A73',
  primaryPressed: '#005A56',
  primarySoft:    '#E6F1F0',
  primaryInk:     '#FFFFFF',

  // Secondary (light lilac + dark neutral text)
  secondary:      '#EFE7FB',   // light purple fill
  secondaryHover: '#E6DBF8',
  secondaryInk:   '#1F2937',   // dark neutral, not purple

  // Semantic — status pills (by meaning, always colored)
  successBg: '#E6F6EC', successFg: '#0E7A3D', successDot: '#16A34A',
  errorBg:   '#FDECEC', errorFg:   '#B42318', errorDot:   '#DC2626',
  infoBg:    '#E6F0FE', infoFg:    '#1D4ED8', infoDot:    '#2563EB',
  warnBg:    '#FEF3C7', warnFg:    '#92400E', warnDot:    '#D97706',
  finalBg:   '#F1EAFE', finalFg:   '#5B21B6', finalDot:   '#7C3AED',

  // Radii
  rSm: 10, rMd: 14, rLg: 18, rXl: 22, rBtn: 999,

  // Shadow
  cardShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.04)',
  cardShadowHi: '0 4px 10px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.04)',
  navShadow: '0 -2px 12px rgba(16, 24, 40, 0.05)',

  // Font stack
  font: "'Inter', -apple-system, 'SF Pro Text', system-ui, sans-serif",
  // Display for hero numbers (no weird stylized fonts — use Inter tight)
};

window.L = L;
