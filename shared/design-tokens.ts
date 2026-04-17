/**
 * DESIGN TOKENS — Asset Tracker Somos Bogotá Usme
 * Fuente de verdad visual del sistema de diseño Light Cyberpunk.
 * Todos los componentes deben referenciar estos tokens.
 */

// ── PALETA CORPORATIVA ──
export const colors = {
  brandDark:    '#281C19',  // texto principal, headers, contraste alto
  brandGreen:   '#8CB32A',  // éxito, NUEVO, acciones positivas, CTA primario
  brandTeal:    '#009890',  // interactividad, info, badges SERVICIO
  surface:      '#FAFAFA',  // fondo base — Light Cyberpunk
  surfaceCard:  '#FFFFFF',  // cards y tablas
  neonRed:      '#FF3333',  // bus Transmilenio, alertas críticas, glow neón
  neonAmber:    '#F59E0B',  // advertencias, REORDENAR INMEDIATAMENTE
  neonGreen:    '#8CB32A',  // ÓPTIMO, confirmaciones
  textMuted:    '#6B7280',  // labels secundarios, metadatos
  border:       '#E5E7EB',  // bordes neutros de tabla y card
} as const;

// ── TIPOGRAFÍA ──
export const typography = {
  fontPrimary:  "'Space Grotesk', sans-serif",
  fontMono:     "'JetBrains Mono', monospace",
  h1: { size: '28px', weight: 600, color: colors.brandDark },
  h2: { size: '22px', weight: 600, color: colors.brandDark },
  h3: { size: '16px', weight: 500, color: colors.brandDark },
  body: { size: '14px', weight: 400, lineHeight: '1.6' },
  tableLabel: { size: '12px', weight: 500, transform: 'uppercase', letterSpacing: '0.06em', color: colors.textMuted },
  code: { size: '13px', color: colors.brandDark },
} as const;

// ── ESPACIADO (escala 4px) ──
export const spacing = {
  xs:  '4px',
  sm:  '8px',
  md:  '16px',
  lg:  '24px',
  xl:  '32px',
  '2xl': '48px',
} as const;

// ── BORDES Y SOMBRAS ──
export const borders = {
  radiusBase: '8px',
  radiusPill: '999px',
  shadowCard: '0 1px 3px rgba(40,28,25,0.08), 0 1px 2px rgba(40,28,25,0.04)',
  glowNeonRed:   '0 0 8px rgba(255,51,51,0.6), 0 0 20px rgba(255,51,51,0.3)',
  glowNeonGreen: '0 0 8px rgba(140,179,42,0.5), 0 0 16px rgba(140,179,42,0.2)',
  glowNeonTeal:  '0 0 8px rgba(0,152,144,0.5), 0 0 16px rgba(0,152,144,0.2)',
} as const;

// ── BADGES DE ESTADO ──
// texto blanco, 11px, weight 600, uppercase, border-radius pill
export const badges = {
  CRITICO:             { bg: '#DC2626', glow: 'rgba(220,38,38,0.4)' },
  'REORDEN INMEDIATO': { bg: '#F59E0B', glow: 'rgba(245,158,11,0.4)' },
  OPTIMO:              { bg: '#8CB32A', glow: 'rgba(140,179,42,0.4)' },
  PRECAUCION:          { bg: '#6366F1', glow: 'none' },
  EXCESO:              { bg: '#009890', glow: 'none' },
  NUEVO:               { bg: '#009890', glow: 'none' },
  REPARADO:            { bg: '#D97706', glow: 'none' },
  'PEDIR INMEDIATAMENTE': { bg: '#DC2626', glow: 'rgba(220,38,38,0.4)', animate: 'pulse 1.5s infinite' },
  'GENERAR OC EN 24H':    { bg: '#F59E0B', glow: 'rgba(245,158,11,0.4)' },
  'MONITOREAR 48H':       { bg: '#6366F1', glow: 'none' },
  'NIVEL OPTIMO':         { bg: '#8CB32A', glow: 'rgba(140,179,42,0.4)' },
  'EVALUAR REDUCCION':    { bg: '#009890', glow: 'none' },
} as const;

// ── GRID DASHBOARD ──
export const grid = {
  columns: 12,
  gap: '16px',
  kpiRow: { span: 3, mobileSpan: 12 },
  tableMain: { span: 12, maxVisibleCols: 8 },
  sidebarRight: { span: 3 },
} as const;

// ── BREAKPOINTS ──
export const breakpoints = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1280px',
} as const;

export type BadgeKey = keyof typeof badges;
export type ColorKey = keyof typeof colors;
