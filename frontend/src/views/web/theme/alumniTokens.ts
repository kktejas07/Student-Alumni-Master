// Alumni design tokens - source of truth for all portals
import { NX, PORTAL_ACCENTS } from '@/src/theme/nexus';

const A = PORTAL_ACCENTS.alumni;

export const SC = {
  // NexusOS deep surfaces (Light Mode by default for Alumni)
  bg:        NX.bg,        // #F8F9FA
  bg2:       NX.surface1,  // #FFFFFF
  card:      NX.surface2,  // #FFFFFF
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

  // Text on light surface (Dark text)
  text:  NX.textP, // #1C1C1E (Black)
  muted: NX.textS, // #71717A (Gray)
  dim:   NX.textT, // #A1A1AA

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

export const FONTS = {
  bold:  'DMSans_700Bold',
  semi:  'DMSans_600SemiBold',
  med:   'DMSans_500Medium',
  xbold: 'DMSans_800ExtraBold',
};

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

  // Text (Maps to SC which is now Dark text for light mode)
  text:   SC.text,   // Black
  muted:  SC.muted,  // Gray
  dim:    SC.dim,

  // Glass surfaces - Clean White with soft borders for high contrast
  glass:        '#FFFFFF', 
  glassStrong:  '#FFFFFF', 
  glassSoft:    '#F8FAFC', 
  glassHover:   '#F1F5F9',
  glassBorder:  'rgba(226, 232, 240, 0.9)',
  glassBorderHi:'rgba(37, 99, 235, 0.4)',
  glassHighlight:'rgba(255, 255, 255, 1)',

  // Shadows / glows (web boxShadow strings)
  glassShadow:  '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
  violetGlow:   '0 4px 16px rgba(37,99,235,0.12)',
} as const;

export const TYPO = {
  // Display (Outfit)
  display400: 'Outfit_400Regular',
  display500: 'Outfit_500Medium',
  display600: 'Outfit_600SemiBold',
  display700: 'Outfit_700Bold',
  display800: 'Outfit_800ExtraBold',

  // Body (Plus Jakarta Sans)
  body400:  'PlusJakartaSans_400Regular',
  body500:  'PlusJakartaSans_500Medium',
  body600:  'PlusJakartaSans_600SemiBold',
  body700:  'PlusJakartaSans_700Bold',

  // Mono (JetBrains Mono)
  mono400:  'JetBrainsMono_400Regular',
  mono500:  'JetBrainsMono_500Medium',
  mono600:  'JetBrainsMono_600SemiBold',
  mono700:  'JetBrainsMono_700Bold',
} as const;

export function useColors() {
  return SC;
}
