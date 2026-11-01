/**
 * Super Admin Portal — design tokens (light + dark theme support).
 *
 * Token values sourced from DESIGN-HANDOFF.md.
 * Theme-aware: import useSAC() in components to get the correct tokens.
 * import resolveColors() to make module-scope StyleSheets theme-aware.
 */
import { useTheme } from '@/src/theme/ThemeContext';
import { COLORS } from '@/src/theme/tokens';

// ─── Core tokens (from DESIGN-HANDOFF §1.2) ────────────────────────────────

export const DARK_SAC = {
  // Core (exact values from sa-dashboard-export.html reference)
  bg:        COLORS.bg,
  bgPage:    COLORS.bg,
  panel:     COLORS.surface1,
  panel2:    COLORS.surface2,
  line:      COLORS.line,
  line2:     COLORS.line2,
  text:      COLORS.text,
  muted:     COLORS.textS,
  dim:       '#7E7E92',
  chrome:    'rgba(8,8,15,.82)',
  chromeSolid:'rgba(16,16,25,.92)',

  // Brand / accent
  violet:    COLORS.primary,
  violetLt:  COLORS.primaryLight,
  accentLine:'#2C2A52',
  tint:      'rgba(124,92,252,.10)',
  tintStrong:'rgba(124,92,252,.18)',
  onTint:    '#F4F4FA',
  onAccent:  '#0C0C14',

  // Event accents
  ev1: '#A78BFA', ev2: '#34D399', ev3: '#F1B8D9', ev4: '#F59E0B', ev5: '#6FD6FF',

  // Semantic
  ok:        COLORS.green,
  okTint:    'rgba(16,185,129,.13)',
  okLine:    '#17503E',
  amber:     COLORS.amber,
  warnTint:  'rgba(245,158,11,.10)',
  warnLine:  '#4A3410',
  danger:    COLORS.red,
  dangerTint:'rgba(240,97,107,.13)',
  green:     '#10B981',
  sky:       '#6FD6FF',

  // Category accents
  cat1: '#8E72FF', cat2: '#2FB8C6', cat3: '#F59E0B',
  cat4: '#F472B6', cat5: '#34D399', cat6: '#4C8DF6', cat7: '#A78BFA',

  // Tile gradients (for bento cards)
  t1a: 'rgba(124,92,252,.16)', t1b: 'rgba(124,92,252,.05)',
  t2a: 'rgba(47,184,198,.15)', t2b: 'rgba(47,184,198,.04)',
  t3a: 'rgba(245,179,66,.13)', t3b: 'rgba(245,179,66,.03)',
  t4a: 'rgba(111,168,245,.14)', t4b: 'rgba(111,168,245,.04)',
  t5a: 'rgba(52,211,153,.13)', t5b: 'rgba(52,211,153,.03)',
  t6a: 'rgba(139,132,255,.15)', t6b: 'rgba(139,132,255,.04)',
  t7a: 'rgba(219,39,119,.13)', t7b: 'rgba(219,39,119,.03)',
  tline1: '#332B66', tline2: '#1B4A54', tline3: '#4A3A18', tline4: '#22375C',
  tline5: '#1B4A3A', tline6: '#332F6B', tline7: '#4A1F3C',

  // Dots overlay
  dots: 'rgba(255,255,255,.05)',

  // Shadows
  shadow:    '0 1px 0 rgba(255,255,255,.03) inset, 0 18px 40px rgba(0,0,0,.35)',
  shadowMd:  '0 4px 20px rgba(0,0,0,.25)',

  // Gradients
  gradFrom:  '#7C6BFF',
  gradMid:   '#4C8DF6',
  gradTo:    '#2FB8C6',
  gradEnd:   '#34D3A6',

  // Backward-compatible aliases (old code uses these)
  primary:       COLORS.primary,
  primaryD:      '#5B3FD9',
  primaryL:      COLORS.primaryLight,
  accent:        '#F59E0B',
  accentBright:  '#FCD34D',
  card:          '#101019',
  cardSolid:     '#14141F',
  cardH:         '#14141F',
  border:        '#1F1F30',
  border2:       '#262638',
  bg2:           '#101019',
  red:           COLORS.red,
  blue:          COLORS.blue,
  purple:        '#8B5CF6',
  pink:          '#EC4899',
  teal:          COLORS.cyan,

  // BGV Hub accents (used by bgvStyles.tsx / bgvView.tsx inline JSX)
  b1: '#38BDF8', b1Soft: 'rgba(56,189,248,.12)',
  b2: '#34D399', b2Soft: 'rgba(16,185,129,.15)',
  b3: '#FBBF24', b3Soft: 'rgba(245,158,11,.15)',
  b4: '#EF4444', b4Soft: 'rgba(239,68,68,.15)',
  b5: '#F472B6', b5Soft: 'rgba(239,68,68,.30)',
  b6: '#93C5FD', b6Soft: 'rgba(59,130,246,.15)',
  b7: '#FCA5A5', b8: '#10B981',
  b9: '#7C3AED', b9Soft: 'rgba(124,58,237,.40)',
  b10: '#6366F1', b10Soft: 'rgba(99,102,241,.25)',
  b11: '#4F46E5',
  b12: '#94A3B8', b12Soft: 'rgba(148,163,184,.15)',
  b13: '#CBD5E1',
  b14: '#E2E8F0',
  b15: '#0F172A', b15Alpha: 'rgba(15,23,42,.85)', b15Alpha60: 'rgba(15,23,42,.6)',
  b16: '#3B82F6', b16Soft: 'rgba(59,130,246,.25)',
  b17: '#1E1B4B', b18: '#111827',
  holoEmail: '#60A5FA',

  // BGV extra accents (theme-aware; dark value == original raw literal so the
  // module-scope stylesheet keeps its exact dark look and resolveColors swaps it)
  b19: '#64748B', b20: '#475569', b21: '#818CF8', b22: '#0EA5E9',
  b23: '#052E24', b24: '#86EFAC', b25: '#C4B5FD', b26: '#F1F5F9',
  b27: '#F87171', b28: '#FDE68A', b29: '#FBCFE8', b30: '#FFFFFF',
  b31: '#D97706', b32: '#DB2777',
  // BGV neutral surface / hairline families (dark == original literal)
  ns1: 'rgba(15, 23, 42, 0.75)', ns2: 'rgba(15, 23, 42, 0.8)', ns3: 'rgba(15, 23, 42, 0.85)',
  ns4: 'rgba(30, 27, 75, 0.5)',
  ns5: 'rgba(30, 41, 59, 0.3)', ns6: 'rgba(30, 41, 59, 0.4)', ns7: 'rgba(30, 41, 59, 0.5)',
  ns8: 'rgba(30, 41, 59, 0.6)', ns9: 'rgba(30, 41, 59, 0.7)', ns10: 'rgba(30, 41, 59, 0.8)',
  ns11: 'rgba(148, 163, 184, 0.08)', ns12: 'rgba(148, 163, 184, 0.1)', ns13: 'rgba(148, 163, 184, 0.12)',
  ns14: 'rgba(148, 163, 184, 0.15)', ns15: 'rgba(148, 163, 184, 0.18)', ns16: 'rgba(148, 163, 184, 0.2)',
  ns17: 'rgba(255, 255, 255, 0.05)', ns18: 'rgba(255, 255, 255, 0.06)', ns19: 'rgba(255, 255, 255, 0.08)',
  ns20: 'rgba(255, 255, 255, 0.25)', ns21: 'rgba(148,163,184,0.15)', ns22: 'rgba(30,41,59,0.5)',
  ns23: 'rgba(255,255,255,0.03)', ns24: 'rgba(255,255,255,0.08)', ns25: 'rgba(255,255,255,0.15)',
  // BGV accent-tint families (dark == original raw literal; no-space forms pair
  // with the space-form ns* tokens, space forms get S-suffixed tokens)
  b2S006: 'rgba(16,185,129,0.06)', b2S01: 'rgba(16,185,129,0.1)', b2S02: 'rgba(16,185,129,0.2)',
  b2S03: 'rgba(16, 185, 129, 0.3)', b2S04: 'rgba(16,185,129,0.4)', b2S015: 'rgba(16, 185, 129, 0.15)',
  b2S035: 'rgba(16, 185, 129, 0.35)', b2S03ns: 'rgba(16,185,129,0.3)', b2S015ns: 'rgba(16,185,129,0.15)',
  b3S008: 'rgba(245, 158, 11, 0.08)', b3S012: 'rgba(245, 158, 11, 0.12)', b3S02: 'rgba(245, 158, 11, 0.2)',
  b3S03: 'rgba(245, 158, 11, 0.3)', b3S035: 'rgba(245, 158, 11, 0.35)',
  b4S008: 'rgba(239, 68, 68, 0.08)', b4S015: 'rgba(239, 68, 68, 0.15)', b4S02: 'rgba(239, 68, 68, 0.2)',
  b4S03: 'rgba(239, 68, 68, 0.3)', b4S035: 'rgba(239, 68, 68, 0.35)', b4S025: 'rgba(239, 68, 68, 0.25)',
  b10S015: 'rgba(99, 102, 241, 0.15)', b10S02: 'rgba(99, 102, 241, 0.2)', b10S03: 'rgba(99, 102, 241, 0.3)',
  b10S035: 'rgba(99, 102, 241, 0.35)', b10S04: 'rgba(99, 102, 241, 0.4)',
  b9S015: 'rgba(167, 139, 250, 0.15)', b9S02: 'rgba(167, 139, 250, 0.2)', b9S03: 'rgba(167, 139, 250, 0.3)',
  b25S035: 'rgba(167, 139, 250, 0.35)',
  b5S012: 'rgba(219, 39, 119, 0.12)', b5S015: 'rgba(219, 39, 119, 0.15)', b5S03: 'rgba(244, 114, 182, 0.3)',
  b1S01: 'rgba(56,189,248,0.1)', b1S015ns: 'rgba(56,189,248,0.15)', b1S02: 'rgba(56, 189, 248, 0.2)',
  b1S035: 'rgba(56, 189, 248, 0.35)', b1S04: 'rgba(56, 189, 248, 0.4)', b1S03: 'rgba(56, 189, 248, 0.3)',
  b16S015: 'rgba(59, 130, 246, 0.15)', b16S02: 'rgba(59, 130, 246, 0.2)', b16S04: 'rgba(59, 130, 246, 0.4)',
  b22S: 'rgba(14, 165, 233, 0.15)',
  b27S015: 'rgba(248,113,113,0.15)', b27S03: 'rgba(248,113,113,0.3)', b27S035: 'rgba(248,113,113,0.35)',
  b28S015: 'rgba(251,191,36,0.15)', b28S035: 'rgba(251,191,36,0.35)',
  holoEmailS025: 'rgba(96, 165, 250, 0.25)', holoEmailS03: 'rgba(96, 165, 250, 0.3)',
  // BGV spacing variants (space / no-space forms are distinct strings)
  b2G015sp: 'rgba(52, 211, 153, 0.15)', b2G015: 'rgba(52,211,153,0.15)', b2G035: 'rgba(52,211,153,0.35)',
  b2S02sp: 'rgba(16, 185, 129, 0.2)',
  b2S025: 'rgba(16,185,129,0.25)',
  b16S025sp: 'rgba(59, 130, 246, 0.25)',
  b4S03ns: 'rgba(239,68,68,0.3)',
  b3S015sp: 'rgba(245, 158, 11, 0.15)',
  b1S015sp: 'rgba(56, 189, 248, 0.15)', b1S012sp: 'rgba(56, 189, 248, 0.12)',
  b10S025sp: 'rgba(99, 102, 241, 0.25)',
} as const;

export const LIGHT_SAC = {
  // Core (exact values from sa-dashboard-export.html reference)
  bg:        '#F4F5FA',
  bgPage:    '#F4F5FA',
  panel:     '#FFFFFF',
  panel2:    '#F3F4FA',
  line:      '#E4E6F0',
  line2:     '#D9DCEA',
  text:      '#141726',
  muted:     '#565B70',
  dim:       '#6B7080',
  chrome:    'rgba(244,245,250,.86)',
  chromeSolid:'rgba(255,255,255,.94)',

  // Brand / accent
  violet:    '#6A4FE0',
  violetLt:  '#5B4FE9',
  accentLine:'#D6D2FA',
  tint:      'rgba(106,79,224,.08)',
  tintStrong:'rgba(106,79,224,.14)',
  onTint:    '#3B2FA8',
  onAccent:  '#FFFFFF',

  // Event accents
  ev1: '#5B4FE9', ev2: '#047857', ev3: '#A21C63', ev4: '#B45309', ev5: '#0E6E8C',

  // Semantic
  ok:        '#047857',
  okTint:    'rgba(4,120,87,.10)',
  okLine:    '#A7E3C8',
  amber:     '#B45309',
  warnTint:  'rgba(180,83,9,.10)',
  warnLine:  '#F1D2A5',
  danger:    '#BE123C',
  dangerTint:'rgba(190,18,60,.09)',
  green:     '#047857',
  sky:       '#0E6E8C',

  // Category accents
  cat1: '#4F46C7', cat2: '#0E6E8C', cat3: '#B45309',
  cat4: '#A21C63', cat5: '#047857', cat6: '#1E56C4', cat7: '#5B4FE9',

  // Tile gradients (light mode)
  t1a: '#F1EFFE', t1b: '#FAF9FF',
  t2a: '#E8F7FA', t2b: '#F7FCFD',
  t3a: '#FDF4E6', t3b: '#FEFBF5',
  t4a: '#ECF3FE', t4b: '#F8FBFF',
  t5a: '#E9F8F1', t5b: '#F7FDFA',
  t6a: '#F0EFFE', t6b: '#FAFAFF',
  t7a: '#FCECF4', t7b: '#FEF8FB',
  tline1: '#DCD6FA', tline2: '#C7E7EE', tline3: '#F3DFB9', tline4: '#CFE0F9',
  tline5: '#BFE7D5', tline6: '#DAD7FB', tline7: '#F4CFE2',

  // Dots overlay
  dots: 'rgba(20,23,38,.06)',

  // Shadows
  shadow:    '0 1px 2px rgba(20,23,38,.04), 0 12px 30px rgba(20,23,38,.06)',
  shadowMd:  '0 4px 16px rgba(20,23,38,.08)',

  // Gradients
  gradFrom:  '#7C6BFF',
  gradMid:   '#4C8DF6',
  gradTo:    '#2FB8C6',
  gradEnd:   '#34D3A6',

  // Backward-compatible aliases
  primary:       '#6A4FE0',
  primaryD:      '#4F46C7',
  primaryL:      '#5B4FE9',
  accent:        '#B45309',
  accentBright:  '#D97706',
  card:          '#FFFFFF',
  cardSolid:     '#F3F4FA',
  cardH:         '#F3F4FA',
  border:        '#E4E6F0',
  border2:       '#D9DCEA',
  bg2:           '#FFFFFF',
  red:           '#BE123C',
  blue:          '#1E56C4',
  purple:        '#5B4FE9',
  pink:          '#BE185D',
  teal:          '#0E6E8C',

  // BGV Hub accents (light mode)
  b1: '#0284C7', b1Soft: 'rgba(2,132,199,.10)',
  b2: '#047857', b2Soft: 'rgba(4,120,87,.12)',
  b3: '#B45309', b3Soft: 'rgba(180,83,9,.12)',
  b4: '#BE123C', b4Soft: 'rgba(190,18,60,.12)',
  b5: '#BE185D', b5Soft: 'rgba(190,24,93,.12)',
  b6: '#1D4ED8', b6Soft: 'rgba(29,78,216,.10)',
  b7: '#DC2626', b8: '#047857',
  b9: '#5B4FE9', b9Soft: 'rgba(91,79,233,.14)',
  b10: '#4338CA', b10Soft: 'rgba(67,56,202,.14)',
  b11: '#3730A3',
  b12: '#565B70', b12Soft: 'rgba(86,91,112,.14)',
  b13: '#3E4358',
  b14: '#23283A',
  b15: '#FFFFFF', b15Alpha: 'rgba(255,255,255,.85)', b15Alpha60: 'rgba(255,255,255,.6)',
  b16: '#2563EB', b16Soft: 'rgba(37,99,235,.12)',
  b17: '#EDEAFB', b18: '#F3F4F8',
  holoEmail: '#2563EB',

  // BGV extra accents (light mode)
  b19: '#475569', b20: '#334155', b21: '#4F46E5', b22: '#0369A1',
  b23: '#F0FDF4', b24: '#15803D', b25: '#5B4FE9', b26: '#23283A',
  b27: '#DC2626', b28: '#92400E', b29: '#8E1658', b30: '#141726',
  b31: '#B45309', b32: '#9D1F63',
  // BGV neutral surface / hairline families (light mode)
  ns1: 'rgba(255, 255, 255, 0.9)', ns2: 'rgba(255, 255, 255, 0.92)', ns3: 'rgba(255, 255, 255, 0.95)',
  ns4: 'rgba(226, 232, 255, 0.6)',
  ns5: 'rgba(236, 240, 248, 0.6)', ns6: 'rgba(236, 240, 248, 0.75)', ns7: 'rgba(236, 240, 248, 0.9)',
  ns8: 'rgba(236, 240, 248, 0.95)', ns9: '#EEF1F8', ns10: '#E5E9F2',
  ns11: 'rgba(86, 91, 112, 0.08)', ns12: 'rgba(86, 91, 112, 0.12)', ns13: 'rgba(86, 91, 112, 0.15)',
  ns14: 'rgba(86, 91, 112, 0.18)', ns15: 'rgba(86, 91, 112, 0.22)', ns16: 'rgba(86, 91, 112, 0.28)',
  ns17: 'rgba(20, 23, 38, 0.04)', ns18: 'rgba(20, 23, 38, 0.05)', ns19: 'rgba(20, 23, 38, 0.08)',
  ns20: 'rgba(20, 23, 38, 0.1)', ns21: 'rgba(86,91,112,0.14)', ns22: 'rgba(236,240,248,0.9)',
  ns23: 'rgba(20,23,38,0.03)', ns24: 'rgba(20,23,38,0.06)', ns25: 'rgba(20,23,38,0.1)',
  // BGV accent-tint families (light counterparts; alpha mirrors the dark token)
  b2S006: 'rgba(4,120,87,0.06)', b2S01: 'rgba(4,120,87,0.1)', b2S02: 'rgba(4,120,87,0.2)',
  b2S03: 'rgba(4,120,87,0.3)', b2S04: 'rgba(4,120,87,0.4)', b2S015: 'rgba(4, 120, 87, 0.15)',
  b2S035: 'rgba(4, 120, 87, 0.35)', b2S03ns: 'rgba(4,120,87,0.3)', b2S015ns: 'rgba(4,120,87,0.15)',
  b3S008: 'rgba(180, 83, 9, 0.08)', b3S012: 'rgba(180, 83, 9, 0.12)', b3S02: 'rgba(180, 83, 9, 0.2)',
  b3S03: 'rgba(180, 83, 9, 0.3)', b3S035: 'rgba(180, 83, 9, 0.35)',
  b4S008: 'rgba(190, 18, 60, 0.08)', b4S015: 'rgba(190, 18, 60, 0.15)', b4S02: 'rgba(190, 18, 60, 0.2)',
  b4S03: 'rgba(190, 18, 60, 0.3)', b4S035: 'rgba(190, 18, 60, 0.35)', b4S025: 'rgba(190, 18, 60, 0.25)',
  b10S015: 'rgba(67, 56, 202, 0.15)', b10S02: 'rgba(67, 56, 202, 0.2)', b10S03: 'rgba(67, 56, 202, 0.3)',
  b10S035: 'rgba(67, 56, 202, 0.35)', b10S04: 'rgba(67, 56, 202, 0.4)',
  b9S015: 'rgba(91, 79, 233, 0.15)', b9S02: 'rgba(91, 79, 233, 0.2)', b9S03: 'rgba(91, 79, 233, 0.3)',
  b25S035: 'rgba(91, 79, 233, 0.35)',
  b5S012: 'rgba(190, 24, 93, 0.12)', b5S015: 'rgba(190, 24, 93, 0.15)', b5S03: 'rgba(190, 24, 93, 0.3)',
  b1S01: 'rgba(2,132,199,0.1)', b1S015ns: 'rgba(2,132,199,0.15)', b1S02: 'rgba(2, 132, 199, 0.2)',
  b1S035: 'rgba(2, 132, 199, 0.35)', b1S04: 'rgba(2, 132, 199, 0.4)', b1S03: 'rgba(2, 132, 199, 0.3)',
  b16S015: 'rgba(37, 99, 235, 0.15)', b16S02: 'rgba(37, 99, 235, 0.2)', b16S04: 'rgba(37, 99, 235, 0.4)',
  b22S: 'rgba(3, 105, 161, 0.15)',
  b27S015: 'rgba(220, 38, 38, 0.15)', b27S03: 'rgba(220, 38, 38, 0.3)', b27S035: 'rgba(220, 38, 38, 0.35)',
  b28S015: 'rgba(180, 83, 9, 0.15)', b28S035: 'rgba(180, 83, 9, 0.35)',
  holoEmailS025: 'rgba(37, 99, 235, 0.25)', holoEmailS03: 'rgba(37, 99, 235, 0.3)',
  // BGV spacing variants (light counterparts)
  b2G015sp: 'rgba(4, 120, 87, 0.15)', b2G015: 'rgba(4,120,87,0.15)', b2G035: 'rgba(4,120,87,0.35)',
  b2S02sp: 'rgba(4, 120, 87, 0.2)',
  b2S025: 'rgba(4,120,87,0.25)',
  b16S025sp: 'rgba(37, 99, 235, 0.25)',
  b4S03ns: 'rgba(190, 18, 60, 0.3)',
  b3S015sp: 'rgba(180, 83, 9, 0.15)',
  b1S015sp: 'rgba(2, 132, 199, 0.15)', b1S012sp: 'rgba(2, 132, 199, 0.12)',
  b10S025sp: 'rgba(67, 56, 202, 0.25)',
} as const;

// Static dark tokens — for StyleSheet.create at module scope (fallback)
export const SAC = DARK_SAC;

/** Theme-aware hook — returns the correct token set at render time. */
export function useSAC() {
  const { isDark } = useTheme();
  return isDark ? DARK_SAC : LIGHT_SAC;
}

/** Widened type so resolveColors accepts both DARK_SAC and LIGHT_SAC. */
export type SACTokens = { [K in keyof typeof DARK_SAC]: string };

/**
 * resolveColors — takes a module-scope StyleSheet (with dark SAC colors baked in)
 * and returns a new StyleSheet where those dark colors are swapped for the
 * current theme's colors. Uses a reverse-lookup map for O(1) resolution.
 */
export function resolveColors<T extends Record<string, any>>(sheet: T, tokens: SACTokens): T {
  const darkToToken: Record<string, string> = {};
  for (const [key, val] of Object.entries(DARK_SAC)) {
    darkToToken[val as string] = tokens[key as keyof typeof tokens] as string;
  }

  const result = {} as any;
  for (const key of Object.keys(sheet)) {
    const style = (sheet as any)[key];
    if (!style || typeof style !== 'object') {
      result[key] = style;
      continue;
    }
    const resolved: Record<string, any> = {};
    for (const prop of Object.keys(style)) {
      const val = style[prop];
      resolved[prop] = darkToToken[val as string] ?? val;
    }
    result[key] = resolved;
  }
  return result;
}

/**
 * pristineOf — stable original (dark-baked) snapshot of a module-scope StyleSheet.
 *
 * Call sites theme a shared sheet in place: `Object.assign(sheet, resolveColors(sheet, T))`.
 * `resolveColors` is a *value-keyed* reverse map and is NOT idempotent — a light
 * target that happens to equal a *different* dark token value (e.g. `#FFFFFF` is
 * both `LIGHT.card` and `DARK.b30`) gets re-resolved to the wrong (darker) value on
 * the second call, corrupting backgrounds on every re-render in light mode.
 *
 * By always resolving from the *pristine* snapshot captured before any in-place
 * mutation, repeated calls stay idempotent and theme switching (light↔dark) is
 * correct: dark is an identity map, light resolves from the original dark values.
 */
const pristineCache = new WeakMap<object, Record<string, any>>();
export function pristineOf(sheet: Record<string, any>): Record<string, any> {
  let p = pristineCache.get(sheet);
  if (!p) {
    p = { ...sheet }; // shallow: top-level keys are later REPLACED, nested originals stay intact
    pristineCache.set(sheet, p);
  }
  return p;
}

// Font tokens: one type system for every portal (src/theme/typography.ts).
export { FONTS } from '@/src/theme/typography';
