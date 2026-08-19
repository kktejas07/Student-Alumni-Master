/**
 * Mentor Portal — design tokens
 * (FinTax360 Jewel-glass navy palette + Teal accent identity)
 *
 * Adopts the same dark-navy glass canvas as every other portal so
 * cross-portal navigation feels seamless. Only the brand accent
 * (teal/cyan family) rotates per portal — that's the Mentor identity.
 */
import { NX, PORTAL_ACCENTS } from '@/src/theme/nexus';

const A = PORTAL_ACCENTS.mentor;

export const MC = {
  // FinTax360 navy surfaces (shared)
  bg:        NX.bg,
  bg2:       NX.surface1,
  card:      NX.surface2,
  cardSolid: NX.surface3,
  cardH:     NX.surface3,

  border:    NX.border,
  border2:   NX.borderHi,

  // Mentor accent identity (teal family)
  teal:      A.primary,        // 500 — CTAs, active rail
  tealD:     A.primaryD,       // 700 — pressed
  tealP:     A.primaryL,       // 400 — hover / soft

  // Legacy aliases (kept so existing views don't break)
  primary:   A.primary,
  primaryD:  A.primaryD,
  primaryL:  A.primaryL,
  accent:    A.accent,
  accentBright: '#5EEAD4',

  // Text on light surface
  text:  NX.textP,
  muted: NX.textS,
  dim:   NX.textT,

  // Status / utility
  green: NX.success,
  amber: NX.amber,
  red:   NX.danger,
  blue:  NX.blue,
  purple: NX.purple,
  pink:  '#EC4899',

  // Soft tinted surface for inline highlights
  surf:  A.accentSoft,
} as const;

export const FONTS = {
  bold:  'DMSans_700Bold',
  semi:  'DMSans_600SemiBold',
  med:   'DMSans_500Medium',
  xbold: 'DMSans_800ExtraBold',
};
