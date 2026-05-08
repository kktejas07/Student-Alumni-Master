/**
 * Super Admin Portal — design tokens (NexusOS dark glass + purple accent).
 *
 * Pivots from the old warm-orange to a premium purple identity so it
 * feels distinct from the alumni orange portal while still using the
 * shared NexusOS dark glass surfaces. Amber preserved as secondary.
 */
import { NX, PORTAL_ACCENTS } from '@/src/theme/nexus';

const A = PORTAL_ACCENTS.admin;

export const SAC = {
  // NexusOS deep surfaces
  bg:        NX.bg,
  bg2:       NX.surface1,
  card:      NX.surface2,
  cardSolid: NX.surface3,
  cardH:     NX.surface3,

  border:    NX.border,
  border2:   NX.borderHi,

  // Super Admin accent identity (purple + amber)
  primary:   A.primary,        // purple 500
  primaryD:  A.primaryD,       // 700
  primaryL:  A.primaryL,       // 400
  accent:    A.accent,         // amber
  accentBright: '#FCD34D',

  // Text on dark NexusOS surface
  text:  NX.textP,
  muted: 'rgba(255,255,255,0.66)',
  dim:   'rgba(255,255,255,0.46)',

  // Status / utility
  green:  NX.success,
  amber:  NX.amber,
  red:    NX.danger,
  blue:   NX.blue,
  purple: NX.purple,
  pink:   '#EC4899',
  teal:   NX.cyan,
} as const;

export const FONTS = {
  bold:  'DMSans_700Bold',
  semi:  'DMSans_600SemiBold',
  med:   'DMSans_500Medium',
  xbold: 'DMSans_800ExtraBold',
};
