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

// Font tokens: one type system for every portal (src/theme/typography.ts).
export { FONTS } from '@/src/theme/typography';
