/**
 * Student Alumni - Brand Theme
 * Blue + Glass + Gradient design system
 */
import { Platform } from 'react-native';
const Palette = {
  brandPurple: '#1D4ED8',    // → Royal Blue
  deepPurple:  '#1E3A8A',    // → Dark Navy Blue
  midPurple:   '#2563EB',    // → Primary Blue
  lightPurple: '#93C5FD',    // → Light Blue
  palePurple:  '#EFF6FF',    // → Pale Blue
  paleLavender:'#F0F9FF',    // → Light Sky Blue
  white: '#FFFFFF',
  ink: '#1A1A2E',

  // Functional
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#EFF6FF',
  textPrimary: '#1A1A2E',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textOnPurple: '#FFFFFF',
  textOnPurpleMuted: 'rgba(255,255,255,0.85)',
  border: 'rgba(26,26,46,0.08)',
  borderStrong: 'rgba(26,26,46,0.16)',
  borderOnPurple: 'rgba(255,255,255,0.20)',
  borderOnPurpleStrong: 'rgba(255,255,255,0.30)',

  // Semantic
  success: '#0F9D58',
  danger: '#B3261E',
  dangerSoft: '#FCE8E6',
  warning: '#E8A317',
  warningSoft: '#FEF3C7',
  info: '#1A73E8',
  infoSoft: '#E8F0FE',

  // Glass
  glassFill: 'rgba(255,255,255,0.10)',
  glassFillStrong: 'rgba(255,255,255,0.18)',
  glassFillLight: 'rgba(255,255,255,0.55)',

  // Backward-compat accent aliases — all mapped to blue family
  accentYellow: '#FFD166',
  accentMint:   '#06D6A0',
  accentPink:   '#EF476F',
  accentBlue:   '#2563EB',
  accentPurple: '#1D4ED8',
  accentOrange: '#FFB454',
  primary:      '#2563EB',
  primaryText:  '#FFFFFF',
  shadow:       '#1E3A8A',
};

// Export with backward-compat `.light` accessor for older screens.
export const Colors = { ...Palette, light: { ...Palette } };

/** Linear gradient stops — blue family */
export const Gradients = {
  hero:         ['#1E3A8A', '#1D4ED8', '#3B82F6'] as const,
  heroDiagonal: ['#1E3A8A', '#2563EB'] as const,
  card:         ['#1D4ED8', '#3B82F6'] as const,
  cardSoft:     ['#3B82F6', '#93C5FD'] as const,
  splash:       ['#1E3A8A', '#1D4ED8', '#93C5FD'] as const,
  splashRadial: ['#3B82F6', '#1E3A8A'] as const,
  accent:       ['#93C5FD', '#3B82F6'] as const,
  pale:         ['#F0F9FF', '#EFF6FF'] as const,
};


export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 9999,
} as const;

/** DM Sans typography from brand sheet */
export const Typography = {
  display: { fontFamily: 'DMSans_700Bold', fontSize: 44, lineHeight: 48, letterSpacing: -1.2 },
  displaySm: { fontFamily: 'DMSans_700Bold', fontSize: 36, lineHeight: 40, letterSpacing: -0.9 },
  h1: { fontFamily: 'DMSans_700Bold', fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },
  h2: { fontFamily: 'DMSans_700Bold', fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
  h3: { fontFamily: 'DMSans_700Bold', fontSize: 22, lineHeight: 26, letterSpacing: -0.3 },
  subheading: { fontFamily: 'DMSans_600SemiBold', fontSize: 18, lineHeight: 24, letterSpacing: -0.18 },
  bodyLg: { fontFamily: 'DMSans_500Medium', fontSize: 16, lineHeight: 24 },
  body: { fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 22 },
  bodyBold: { fontFamily: 'DMSans_600SemiBold', fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  // Backward-compat aliases for older screens
  h4: { fontFamily: 'DMSans_600SemiBold', fontSize: 18, lineHeight: 24, letterSpacing: -0.18 },
  caption: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
} as const;

export const Shadows = {
  sm: Platform.select({
    web: { boxShadow: '0 4px 12px rgba(61,20,104,0.08)' } as any,
    default: {
      boxShadow: '0px 4px 12px rgba(61,20,104,0.08)',
      elevation: 3,
    },
  }) as any,
  md: Platform.select({
    web: { boxShadow: '0 8px 24px rgba(61,20,104,0.14)' } as any,
    default: {
      boxShadow: '0px 8px 24px rgba(61,20,104,0.14)',
      elevation: 8,
    },
  }) as any,
  lg: Platform.select({
    web: { boxShadow: '0 16px 36px rgba(61,20,104,0.22)' } as any,
    default: {
      boxShadow: '0px 16px 36px rgba(61,20,104,0.22)',
      elevation: 14,
    },
  }) as any,
};

export const Layout = {
  floatingOffset: 90,
} as const;

