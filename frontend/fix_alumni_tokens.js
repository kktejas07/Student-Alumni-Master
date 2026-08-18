const fs = require('fs');

const content = `// Alumni design tokens - source of truth for all portals
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

  // Glass surfaces - Deep Premium Navy (#0A0A2A tint) requested by user
  glass:        'rgba(10, 10, 42, 0.90)', 
  glassStrong:  'rgba(10, 10, 42, 0.98)', 
  glassSoft:    'rgba(10, 10, 42, 0.50)', 
  glassHover:   'rgba(20, 20, 60, 0.80)',
  glassBorder:  'rgba(148, 163, 184, 0.15)',
  glassBorderHi:'rgba(148, 163, 184, 0.30)',
  glassHighlight:'rgba(255, 255, 255, 0.12)',

  // Shadows / glows (web boxShadow strings)
  glassShadow:  '0 16px 48px rgba(2,6,23,0.25), 0 1px 0 rgba(255,255,255,0.08) inset',
  violetGlow:   '0 10px 30px rgba(10,10,42,0.20), 0 0 0 1px rgba(10,10,42,0.15)',
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
`;

fs.writeFileSync('src/views/web/theme/alumniTokens.ts', content, 'utf8');
