/**
 * Alumni Portal — design tokens (orange-glass theme).
 * Mirrors the SA brand orange used during alumni onboarding flow.
 *
 * Layout / surface variables match the student portal so the same
 * components render identically — only hue rotates from purple → orange.
 */
export const SC = {
  bg: '#1A0E05',
  bg2: '#26170A',
  card: 'rgba(249,115,22,0.10)',
  cardSolid: '#2B1407',
  cardH: 'rgba(249,115,22,0.18)',

  border: 'rgba(253,186,116,0.20)',
  border2: 'rgba(253,186,116,0.35)',

  primary: '#F97316',         // primary 500
  primaryD: '#C2410C',        // primary 700 (darker hover)
  primaryL: '#FB923C',        // primary 400 (lighter)
  accent: '#FDBA74',           // soft peach for text/icon accents
  accentBright: '#FED7AA',     // very light peach

  text: 'rgba(255,255,255,0.94)',
  muted: 'rgba(255,255,255,0.66)',  /* WCAG bump: 0.55 → 0.66 (AA) */
  dim: 'rgba(255,255,255,0.46)',    /* WCAG bump: 0.30 → 0.46 (AA-Large) */

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
