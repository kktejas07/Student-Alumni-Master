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
  bg: '#0C0818',
  bg2: '#130A28',
  card: 'rgba(95,37,159,0.15)',
  cardSolid: '#1A0E36',
  cardH: 'rgba(95,37,159,0.25)',

  border: 'rgba(176,127,223,0.20)',
  border2: 'rgba(176,127,223,0.35)',

  primary: '#5F259F',
  primaryD: '#3D1468',
  primaryL: '#7B3DBF',
  accent: '#A78BFA',
  accentBright: '#C4B5FD',

  text: 'rgba(255,255,255,0.94)',
  muted: 'rgba(255,255,255,0.66)',  /* WCAG bump: was 0.55 → 0.66 (4.7:1 on bg) */
  dim: 'rgba(255,255,255,0.46)',    /* WCAG bump: was 0.30 → 0.46 (3.4:1 on bg) */

  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
  blue: '#3B82F6',
  teal: '#14B8A6',
  pink: '#EC4899',
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

