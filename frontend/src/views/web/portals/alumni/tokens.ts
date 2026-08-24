/**
 * Alumni Portal — design tokens (NexusOS dark glass + orange accent).
 *
 * Adopts the shared NexusOS palette (deep neutrals, glass surfaces)
 * and layers the orange brand identity on top so users still feel
 * the alumni-specific personality (orange CTAs, peach text accents).
 *
 * Surface variables match every other portal so cross-portal navigation
 * feels seamless. Only the `primary / accent` family rotates per portal.
 */
import { NX, PORTAL_ACCENTS } from '@/src/theme/nexus';

const A = PORTAL_ACCENTS.alumni;

export const SC = {
  // NexusOS deep surfaces
  bg:        NX.bg,
  bg2:       NX.surface1,
  card:      NX.surface2,
  cardSolid: NX.surface3,
  cardH:     NX.surface3,

  border:    NX.border,
  border2:   NX.borderHi,

  // Alumni-specific accent identity (orange family)
  primary:   A.primary,        // 500 — CTAs, active rail
  primaryD:  A.primaryD,       // 700 — pressed
  primaryL:  A.primaryL,       // 400 — hover
  accent:    A.accent,         // peach — kicker labels
  accentBright: '#FED7AA',     // very light peach

  // Text on dark NexusOS surface
  text:  NX.textP,                          // primary
  muted: 'rgba(255,255,255,0.66)',          // WCAG AA
  dim:   'rgba(255,255,255,0.46)',          // WCAG AA-Large

  // Status / utility
  green: NX.success,
  amber: NX.amber,
  red:   NX.danger,
  blue:  NX.blue,
  teal:  NX.cyan,
  pink:  '#EC4899',
} as const;

export const FONTS = {
  bold:  'DMSans_700Bold',
  semi:  'DMSans_600SemiBold',
  med:   'DMSans_500Medium',
  xbold: 'DMSans_800ExtraBold',
};
