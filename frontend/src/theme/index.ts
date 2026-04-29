/**
 * Student Alumni - Brand Theme
 * Purple + Glass + Gradient design system
 * Based on official brand sheet specifications
 */
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

  // Semantic
  success: '#06D6A0',
  danger: '#EF476F',
  warning: '#FFB454',
  info: '#118AB2',

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
  sm: {
    shadowColor: '#3D1468',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  md: {
    shadowColor: '#3D1468',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  lg: {
    shadowColor: '#3D1468',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 36,
    elevation: 14,
  },
};
