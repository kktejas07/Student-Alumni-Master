/**
 * Student Portal — Design Tokens (FinTax360 Glass-Dark theme, v0.18.0).
 *
 * Theme philosophy
 * ─────────────────
 *   "Glass-morphism Dark + Multi-color Gradient" — a deep-navy canvas with
 *   four drifting colored orbs (violet · blue · teal · rose) refracted by
 *   frosted-glass surfaces. Typography is intentionally not Inter/Roboto:
 *   Outfit for display, Plus Jakarta Sans for body, JetBrains Mono for
 *   numerics (KPI values, hashes, IDs).
 *
 * Backward-compat
 * ────────────────
 *   The legacy `SC` keys (`bg`, `bg2`, `card`, `cardSolid`, `cardH`,
 *   `border`, `border2`, `primary*`, `accent*`, `text`, `muted`, `dim`,
 *   `green/amber/red/blue/teal/pink`) are still exported so views that
 *   haven't been migrated continue to render. We just point them at the
 *   new palette.
 */
import { useTheme } from '@/src/theme/ThemeContext';

/* ─────────────────────────────────────────────────────────────────
 * Brand palette — FinTax360 Glass-Dark
 * ───────────────────────────────────────────────────────────────── */
export const PALETTE = {
  // Canvas
  bg0: '#0a0f1e',   // deep navy base
  bg1: '#0d1326',   // mid-tone
  bg2: '#131938',   // top of body gradient

  // Accents
  violet: '#6366F1',  // primary
  violetD: '#4F46E5',  // primary deep (used in button gradient bottom)
  violetL: '#818CF8',  // primary soft (hover)

  blue:   '#3B82F6',  // secondary
  teal:   '#10B981',  // success
  amber:  '#F59E0B',  // warning
  rose:   '#f43f5e',  // critical

  // Text
  text:   '#F4F4F8',
  muted:  '#A1A6B7',
  dim:    '#6E7388',

  // Glass surfaces
  glass:        'rgba(20, 26, 45, 0.55)',
  glassStrong:  'rgba(20, 26, 45, 0.72)',
  glassSoft:    'rgba(255,255,255,0.04)',
  glassHover:   'rgba(99, 102, 241, 0.10)',
  glassBorder:  'rgba(255,255,255,0.08)',
  glassBorderHi:'rgba(99, 102, 241, 0.40)',
  glassHighlight:'rgba(255,255,255,0.10)',

  // Shadows / glows (web boxShadow strings)
  glassShadow:  '0 16px 48px rgba(2,6,23,0.45), 0 1px 0 rgba(255,255,255,0.06) inset',
  violetGlow:   '0 10px 30px rgba(99,102,241,0.35), 0 0 0 1px rgba(99,102,241,0.20)',
} as const;

/* ─────────────────────────────────────────────────────────────────
 * SC — backward-compat shim. New code should use PALETTE.
 * ───────────────────────────────────────────────────────────────── */
export const SC = {
  bg:        PALETTE.bg0,
  bg2:       PALETTE.bg1,
  card:      PALETTE.glassSoft,
  cardSolid: PALETTE.bg1,
  cardH:     PALETTE.glassHover,

  border:    PALETTE.glassBorder,
  border2:   PALETTE.glassBorderHi,

  // Glass-morphism layer (legacy aliases — point at new palette)
  glassBg:        PALETTE.glass,
  glassBgStrong:  PALETTE.glassStrong,
  glassBgSoft:    PALETTE.glassSoft,
  glassBorder:    PALETTE.glassBorder,
  glassBorderHi:  PALETTE.glassBorderHi,
  glassHighlight: PALETTE.glassHighlight,
  glassShadow:    PALETTE.glassShadow,

  // Brand — violet is the new purple
  primary:      PALETTE.violet,
  primaryD:     PALETTE.violetD,
  primaryL:     PALETTE.violetL,
  accent:       PALETTE.violet,
  accentBright: PALETTE.violetL,

  text:  PALETTE.text,
  muted: PALETTE.muted,
  dim:   PALETTE.dim,

  green: PALETTE.teal,
  amber: PALETTE.amber,
  red:   PALETTE.rose,
  blue:  PALETTE.blue,
  teal:  PALETTE.teal,
  pink:  PALETTE.rose,
} as const;

/* ─── Light variant (kept as a careful translation, rarely used) ──── */
const SC_LIGHT = {
  bg: '#F5F5F7',
  bg2: '#FFFFFF',
  card: 'rgba(99,102,241,0.06)',
  cardSolid: '#FFFFFF',
  cardH: 'rgba(99,102,241,0.10)',
  border: 'rgba(0,0,0,0.10)',
  border2: 'rgba(99,102,241,0.30)',
  glassBg: 'rgba(255,255,255,0.55)',
  glassBgStrong: 'rgba(255,255,255,0.78)',
  glassBgSoft: 'rgba(99,102,241,0.06)',
  glassBorder: 'rgba(0,0,0,0.06)',
  glassBorderHi: 'rgba(99,102,241,0.32)',
  glassHighlight: 'rgba(255,255,255,0.6)',
  glassShadow: '0 12px 40px rgba(15,23,42,0.10), 0 1px 0 rgba(255,255,255,0.6) inset',
  primary: '#6366F1',
  primaryD: '#4F46E5',
  primaryL: '#818CF8',
  accent: '#6366F1',
  accentBright: '#818CF8',
  text: '#0a0f1e',
  muted: '#475569',
  dim: '#94A3B8',
  green: '#0ea876',
  amber: '#D97706',
  red: '#DC2626',
  blue: '#2563EB',
  teal: '#0d9488',
  pink: '#e11d48',
} as const;

/**
 * useColors — theme-reactive token resolver. Returns the FinTax360 dark
 * palette by default; light variant is provided for completeness.
 */
export function useColors(): typeof SC {
  const { isDark } = useTheme();
  return (isDark ? SC : (SC_LIGHT as unknown as typeof SC));
}

/* ─────────────────────────────────────────────────────────────────
 * Typography — FinTax360 stack
 * ───────────────────────────────────────────────────────────────── *
 *  • Outfit            → display / hero headings
 *  • Plus Jakarta Sans → body text (default UI)
 *  • JetBrains Mono    → numerics (KPI, IDs, hashes)
 *
 *  We keep `FONTS.bold/semi/med/xbold` (DMSans aliases) for backward
 *  compatibility with views that haven't been migrated — those will
 *  render in DMSans until ported. New views should use `TYPO`.
 * ───────────────────────────────────────────────────────────────── */
export const TYPO = {
  // Display (Outfit)
  display400: 'Outfit_400Regular',
  display500: 'Outfit_500Medium',
  display600: 'Outfit_600SemiBold',
  display700: 'Outfit_700Bold',
  display800: 'Outfit_800ExtraBold',

  // Body (Plus Jakarta Sans)
  body400:  'PlusJakartaSans_400Regular',
  body500:  'PlusJakartaSans_500Medium',
  body600:  'PlusJakartaSans_600SemiBold',
  body700:  'PlusJakartaSans_700Bold',

  // Mono (JetBrains Mono — KPI / numbers / hashes)
  mono400:  'JetBrainsMono_400Regular',
  mono500:  'JetBrainsMono_500Medium',
  mono600:  'JetBrainsMono_600SemiBold',
  mono700:  'JetBrainsMono_700Bold',
} as const;

// Legacy alias — DMSans paths still work, but now also expose Outfit/Jakarta
// shortcuts so a global find-replace can land the new fonts gradually.
export const FONTS = {
  bold:  'PlusJakartaSans_700Bold',
  semi:  'PlusJakartaSans_600SemiBold',
  med:   'PlusJakartaSans_500Medium',
  xbold: 'Outfit_800ExtraBold',

  // Convenience aliases that explicitly map to the new stack
  display: TYPO.display700,
  body:    TYPO.body500,
  mono:    TYPO.mono600,
};
