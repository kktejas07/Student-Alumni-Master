// Alumni design tokens - source of truth for all portals
import { NX, PORTAL_ACCENTS } from '@/src/theme/nexus';

const A = PORTAL_ACCENTS.alumni;

export const SC = {
  // NexusOS deep surfaces (dark; see src/theme/nexus.ts)
  bg:        NX.bg,
  bg2:       NX.surface1,
  card:      NX.surface2,
  cardSolid: NX.surface3,
  cardH:     NX.surface3,

  border:    NX.border,
  border2:   NX.borderHi,

  // Alumni-specific accent identity (orange family)
  primary:   A.primary,
  primaryD:  A.primaryD,
  primaryL:  A.primaryL,
  accent:    A.accent,
  accentBright: '#FED7AA',

  // Text on dark surface
  text:  NX.textP,
  muted: NX.textS,
  dim:   NX.textT,

  // Status / utility
  green: NX.success,
  amber: NX.amber,
  red:   NX.danger,
  blue:  NX.blue,
  teal:  NX.cyan,
  tealP: NX.cyan,
  tealD: '#0891B2',
  tealSoft: 'rgba(34,211,238,0.15)',
  surf:  NX.surface2,
  purple: '#2563EB',
  pink:  '#EC4899',
} as const;

export { FONTS } from '@/src/theme/typography';

export const PALETTE = {
  // Canvas
  bg0: SC.bg,
  bg1: SC.bg2,
  bg2: SC.card,

  // Accents
  violet: SC.primary,
  violetD: SC.primaryD,
  violetL: SC.primaryL,

  blue:   SC.blue,
  teal:   SC.teal,
  amber:  SC.amber,
  rose:   SC.red,

  // Text
  text:   SC.text,
  muted:  SC.muted,
  dim:    SC.dim,

  // Glass surfaces — derived from the NX dark palette so they always match
  // SC.text (white). These were briefly hardcoded white during a light-mode
  // experiment, which left white text on white cards once NX went dark again.
  glass:        NX.surface2,
  glassStrong:  NX.surface3,
  glassSoft:    NX.surface1,
  glassHover:   NX.surface3,
  glassBorder:  NX.border,
  glassBorderHi:NX.borderHi,
  glassHighlight:'rgba(255,255,255,0.06)',

  // Shadows / glows (web boxShadow strings)
  glassShadow:  '0 8px 24px rgba(0,0,0,0.28)',
  violetGlow:   `0 4px 16px ${A.primary}33`,
} as const;

export { TYPO } from '@/src/theme/typography';

export function useColors() {
  return SC;
}
