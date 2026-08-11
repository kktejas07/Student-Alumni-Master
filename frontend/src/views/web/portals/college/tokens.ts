/**
 * College Admin Portal — design tokens (NexusOS dark glass + indigo accent).
 *
 * Adopts shared NexusOS palette (deep neutrals, glass surfaces) and
 * layers the established indigo+cyan college identity on top so cross-
 * portal navigation feels seamless. Surfaces match every other portal.
 */
import { NX, PORTAL_ACCENTS } from '@/src/theme/nexus';

const A = PORTAL_ACCENTS.college;

export const CC = {
  // NexusOS deep surfaces
  bg:        NX.bg,
  bg2:       NX.surface1,
  card:      NX.surface2,
  cardSolid: NX.surface3,
  cardH:     NX.surface3,

  border:    NX.border,
  border2:   NX.borderHi,

  // College accent identity (indigo + cyan)
  primary:   A.primary,        // 500
  primaryD:  A.primaryD,       // 700
  primaryL:  A.primaryL,       // 400
  accent:    A.accent,         // cyan accent
  accentBright: '#67E8F9',
  accent2:   NX.purple,        // purple highlight

  // Text on light surface
  text:  NX.textP,
  muted: NX.textS,
  dim:   NX.textT,

  // Status / utility
  green:  NX.success,
  amber:  NX.amber,
  red:    NX.danger,
  blue:   NX.blue,
  pink:   '#EC4899',
  orange: '#F97316',
} as const;

export const FONTS = {
  bold:  'DMSans_700Bold',
  semi:  'DMSans_600SemiBold',
  med:   'DMSans_500Medium',
  xbold: 'DMSans_800ExtraBold',
};
