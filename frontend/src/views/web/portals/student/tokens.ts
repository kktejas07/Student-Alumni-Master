/**
 * Student Portal — design tokens (purple-glass theme).
 * Mirrors the SA brand palette used across the platform.
 */
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

export const FONTS = {
  bold: 'DMSans_700Bold',
  semi: 'DMSans_600SemiBold',
  med: 'DMSans_500Medium',
  xbold: 'DMSans_800ExtraBold',
};
