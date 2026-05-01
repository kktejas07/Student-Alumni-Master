/**
 * Student Alumni - Brand Theme
 * Purple + Glass + Gradient design system
 * Based on official brand sheet specifications
 */
import { Platform } from 'react-native';
const Palette = {
  brandPurple: '#5F259F',
  deepPurple: '#3D1468',
  midPurple: '#7B3DBF',
  lightPurple: '#B07FDF',
  palePurple: '#EDE0F7',
  paleLavender: '#F7F1FB',
  white: '#FFFFFF',
  ink: '#1A1A2E',

  // Functional
  background: '#F7F1FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EDE0F7',
  textPrimary: '#1A1A2E',
  textSecondary: '#52527A',
  textMuted: '#8B8BA8',
  textOnPurple: '#FFFFFF',
  textOnPurpleMuted: 'rgba(255,255,255,0.78)',
  border: 'rgba(26,26,46,0.08)',
  borderStrong: 'rgba(26,26,46,0.16)',
  borderOnPurple: 'rgba(255,255,255,0.18)',
  borderOnPurpleStrong: 'rgba(255,255,255,0.28)',

  // Semantic — accessibility-first. Use brand purple for primary actions,
  // a calmer amber/orange for warnings, and a SUBDUED red only where strictly necessary.
  // (Per Material Design 3 guidance: prefer brand colors for emphasis, reserve red for destructive actions.)
  success: '#0F9D58',     // Material green — WCAG AA on white
  danger: '#B3261E',      // Material error red — only for destructive / form errors
  dangerSoft: '#FCE8E6',  // Soft pink fill for error containers (low intensity)
  warning: '#E8A317',     // Amber warning — accessible on white
  warningSoft: '#FEF3C7',
  info: '#1A73E8',        // Material blue — links / info
  infoSoft: '#E8F0FE',

  // Glass
  glassFill: 'rgba(255,255,255,0.10)',
  glassFillStrong: 'rgba(255,255,255,0.18)',
  glassFillLight: 'rgba(255,255,255,0.55)',

  // Backward-compat accent aliases (from previous Neo-Brutalist theme).
  // Mapped to brand-aligned purples / soft accents.
  accentYellow: '#FFD166',
  accentMint: '#06D6A0',
  accentPink: '#EF476F',
  accentBlue: '#7B3DBF',
  accentPurple: '#5F259F',
  accentOrange: '#FFB454',
  primary: '#5F259F',
  primaryText: '#FFFFFF',
  shadow: '#3D1468',
};

// Export with backward-compat `.light` accessor for older screens.
export const Colors = { ...Palette, light: { ...Palette } };

/** Linear gradient stops, ready for expo-linear-gradient */
export const Gradients = {
  hero: ['#3D1468', '#5F259F', '#7B3DBF'] as const, // top → bottom
  heroDiagonal: ['#3D1468', '#5F259F'] as const,
  card: ['#5F259F', '#7B3DBF'] as const,
  cardSoft: ['#7B3DBF', '#B07FDF'] as const,
  splash: ['#3D1468', '#5F259F', '#B07FDF'] as const,
  splashRadial: ['#7B3DBF', '#3D1468'] as const,
  accent: ['#B07FDF', '#7B3DBF'] as const,
  pale: ['#F7F1FB', '#EDE0F7'] as const,
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
