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
  card:      'rgba(59,130,246,0.08)',   // subtle blue-tinted card
  cardSolid: '#121218',                 // solid card surface-2
  cardH:     'rgba(59,130,246,0.14)',   // card hover

  border:    'rgba(255,255,255,0.06)',  // hairline
  border2:   'rgba(59,130,246,0.30)',   // accent border

  // Brand purple is preserved as semantic accent
  primary:      '#3B82F6',              // NexusOS blue
  primaryD:     '#1E40AF',
  primaryL:     '#60A5FA',
  accent:       '#06B6D4',              // NexusOS cyan
  accentBright: '#67E8F9',

  text:  '#F4F4F6',                     // NexusOS primary text
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

