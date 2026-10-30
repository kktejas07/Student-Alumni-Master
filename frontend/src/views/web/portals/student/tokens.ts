import { useTheme } from '@/src/theme/ThemeContext';
import { COLORS, PORTAL_ACCENTS } from '@/src/theme/tokens';

export const PALETTE_DARK = {
  bg0: '#0a0f1e',
  bg1: '#0d1326',
  bg2: '#131938',
  violet: COLORS.primary,
  violetD: COLORS.primaryDark,
  violetL: COLORS.primaryLight,
  blue:   COLORS.blue,
  teal:   COLORS.green,
  amber:  COLORS.amber,
  rose:   '#f43f5e',
  text:   '#F4F4F8',
  muted:  '#A1A6B7',
  dim:    '#6E7388',
  glass:        'rgba(20, 26, 45, 0.55)',
  glassStrong:  'rgba(20, 26, 45, 0.72)',
  glassSoft:    'rgba(255,255,255,0.04)',
  glassHover:   'rgba(124, 58, 237, 0.10)',
  glassBorder:  'rgba(255,255,255,0.08)',
  glassBorderHi:'rgba(124, 58, 237, 0.40)',
  glassHighlight:'rgba(255,255,255,0.10)',
  glassShadow:  '0 16px 48px rgba(2,6,23,0.45), 0 1px 0 rgba(255,255,255,0.06) inset',
  violetGlow:   '0 10px 30px rgba(124,58,237,0.35), 0 0 0 1px rgba(124,58,237,0.20)',
} as const;

export const PALETTE_LIGHT = {
  bg0: '#F5F5F7',
  bg1: '#FFFFFF',
  bg2: '#EDEBF8',
  violet: COLORS.primary,
  violetD: COLORS.primaryDark,
  violetL: COLORS.primaryLight,
  blue:   '#2563EB',
  teal:   '#0ea876',
  amber:  '#D97706',
  rose:   '#DC2626',
  text:   '#0f172a',
  muted:  '#475569',
  dim:    '#94A3B8',
  glass:        'rgba(255, 255, 255, 0.75)',
  glassStrong:  'rgba(255, 255, 255, 0.90)',
  glassSoft:    'rgba(0, 0, 0, 0.04)',
  glassHover:   'rgba(124, 58, 237, 0.08)',
  glassBorder:  'rgba(0, 0, 0, 0.08)',
  glassBorderHi:'rgba(124, 58, 237, 0.35)',
  glassHighlight:'rgba(255, 255, 255, 0.8)',
  glassShadow:  '0 12px 36px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
  violetGlow:   '0 8px 24px rgba(124, 58, 237, 0.15)',
} as const;

export const PALETTE = PALETTE_DARK;

export function usePalette(): typeof PALETTE_DARK {
  const { isDark } = useTheme();
  return (isDark ? PALETTE_DARK : (PALETTE_LIGHT as unknown as typeof PALETTE_DARK));
}

export const SC = {
  bg:        PALETTE.bg0,
  bg2:       PALETTE.bg1,
  card:      PALETTE.glassSoft,
  cardSolid: PALETTE.bg1,
  cardH:     PALETTE.glassHover,
  border:    PALETTE.glassBorder,
  border2:   PALETTE.glassBorderHi,
  glassBg:        PALETTE.glass,
  glassBgStrong:  PALETTE.glassStrong,
  glassBgSoft:    PALETTE.glassSoft,
  glassBorder:    PALETTE.glassBorder,
  glassBorderHi:  PALETTE.glassBorderHi,
  glassHighlight: PALETTE.glassHighlight,
  glassShadow:    PALETTE.glassShadow,
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

const SC_LIGHT = {
  bg: '#F5F5F7',
  bg2: '#FFFFFF',
  card: 'rgba(124,58,237,0.06)',
  cardSolid: '#FFFFFF',
  cardH: 'rgba(124,58,237,0.10)',
  border: 'rgba(0,0,0,0.10)',
  border2: 'rgba(124,58,237,0.30)',
  glassBg: 'rgba(255,255,255,0.55)',
  glassBgStrong: 'rgba(255,255,255,0.78)',
  glassBgSoft: 'rgba(124,58,237,0.06)',
  glassBorder: 'rgba(0,0,0,0.06)',
  glassBorderHi: 'rgba(124,58,237,0.32)',
  glassHighlight: 'rgba(255,255,255,0.6)',
  glassShadow: '0 12px 40px rgba(15,23,42,0.10), 0 1px 0 rgba(255,255,255,0.6) inset',
  primary: COLORS.primary,
  primaryD: COLORS.primaryDark,
  primaryL: COLORS.primaryLight,
  accent: COLORS.primary,
  accentBright: COLORS.primaryLight,
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

export function useColors(): typeof SC {
  const { isDark } = useTheme();
  return (isDark ? SC : (SC_LIGHT as unknown as typeof SC));
}

export { TYPO } from '@/src/theme/typography';

export { FONTS } from '@/src/theme/typography';
