/**
 * Student Portal — design tokens (purple-glass theme).
 * Mirrors the SA brand palette used across the platform.
 *
 * The legacy `SC` export is preserved (DARK theme) for views that haven't
 * been migrated yet. New / migrated views should use `useColors()` which
 * returns the right palette for the current theme.
 */
import { useTheme } from '@/src/theme/ThemeContext';

export const SC = {
  bg:        '#07070A',                 // NexusOS near-black canvas
  bg2:       '#0E0E12',                 // sidebar / topbar surface-1
  card:      'rgba(123,61,191,0.10)',   // subtle purple-tinted card
  cardSolid: '#141021',                 // solid card surface-2 (deep violet-black)
  cardH:     'rgba(123,61,191,0.16)',   // card hover

  border:    'rgba(255,255,255,0.06)',  // hairline
  border2:   'rgba(123,61,191,0.32)',   // accent purple border

  // ── Glass-morphism layer (Dashboard) ──
  // Lower-alpha translucent surfaces that sit on top of the Aurora blobs;
  // pair `glassBg` with `backdropFilter: blur(…)` on web / `BlurView` on
  // native to achieve the frosted glass effect.
  glassBg:        'rgba(20,16,33,0.55)',         // primary glass card fill
  glassBgStrong:  'rgba(20,16,33,0.72)',         // dialogs / KPI tiles needing legibility
  glassBgSoft:    'rgba(123,61,191,0.10)',       // hover / row-level glass
  glassBorder:    'rgba(167,139,250,0.22)',      // lavender hairline
  glassBorderHi:  'rgba(167,139,250,0.40)',      // active state
  glassHighlight: 'rgba(255,255,255,0.08)',      // top inner highlight (1px)
  glassShadow:    '0 12px 40px rgba(95,37,159,0.18), 0 1px 0 rgba(255,255,255,0.06) inset' as string,

  // Brand purple — unified across dark & light for consistent identity
  primary:      '#7B3DBF',              // brand purple 500
  primaryD:     '#5F259F',              // brand purple 700
  primaryL:     '#A78BFA',              // soft lavender (hover)
  accent:       '#7B3DBF',              // purple accent
  accentBright: '#C4B5FD',              // bright lavender for highlights on dark

  text:  '#F4F4F6',                     // primary text on dark
  muted: '#8A8A95',                     // secondary
  dim:   '#5A5A66',                     // tertiary

  green: '#10B981',
  amber: '#F59E0B',
  red:   '#EF4444',
  blue:  '#3B82F6',
  teal:  '#06B6D4',
  pink:  '#EC4899',
} as const;

/* ─── Light variant (Apple HIG) — used by useColors() in light mode ── */
const SC_LIGHT = {
  bg: '#F5F5F7',
  bg2: '#FFFFFF',
  card: 'rgba(95,37,159,0.06)',
  cardSolid: '#FFFFFF',
  cardH: 'rgba(95,37,159,0.10)',

  border: 'rgba(0,0,0,0.10)',
  border2: 'rgba(95,37,159,0.30)',

  primary: '#5F259F',
  primaryD: '#3D1468',
  primaryL: '#7B3DBF',
  accent: '#5F259F',         // darker for legibility on light
  accentBright: '#7B3DBF',

  text: '#1D1D1F',
  muted: '#6E6E73',
  dim: '#8E8E93',

  green: '#16A34A',
  amber: '#D97706',
  red: '#DC2626',
  blue: '#0071E3',
  teal: '#0D9488',
  pink: '#DB2777',
} as const;

/**
 * useColors — theme-reactive token resolver. Returns DARK palette by
 * default (preserves brand purple-glass) and switches to LIGHT in light
 * mode. Drop-in for views that previously imported `SC`.
 *
 * Usage:
 *   const C = useColors();
 *   <View style={{ backgroundColor: C.bg2, borderColor: C.border }} />
 */
export function useColors(): typeof SC {
  const { isDark } = useTheme();
  return (isDark ? SC : (SC_LIGHT as unknown as typeof SC));
}

export const FONTS = {
  bold: 'DMSans_700Bold',
  semi: 'DMSans_600SemiBold',
  med: 'DMSans_500Medium',
  xbold: 'DMSans_800ExtraBold',
};

