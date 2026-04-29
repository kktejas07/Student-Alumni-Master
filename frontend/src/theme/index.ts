/**
 * Theme tokens - Neo-Brutalist Pastel & Soft (Gen-Z Variant)
 * Based on /app/design_guidelines.json
 */
export const Colors = {
  light: {
    background: '#FDFBF7',
    surface: '#FFFFFF',
    surfaceMuted: '#F5F2EC',
    textPrimary: '#121212',
    textSecondary: '#52525B',
    textMuted: '#8B8B92',
    border: '#121212',
    primary: '#121212',
    primaryText: '#FFFFFF',
    accentYellow: '#FFD166',
    accentMint: '#06D6A0',
    accentPink: '#EF476F',
    accentBlue: '#118AB2',
    accentPurple: '#9B5DE5',
    accentOrange: '#F77F00',
    danger: '#EF476F',
    success: '#06D6A0',
    warning: '#FFD166',
    shadow: '#121212',
    overlay: 'rgba(18,18,18,0.5)',
  },
};

export type ThemeColors = typeof Colors.light;

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
  lg: 16,
  xl: 24,
  pill: 9999,
} as const;

export const Typography = {
  h1: { fontFamily: 'Outfit_700Bold', fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  h2: { fontFamily: 'Outfit_700Bold', fontSize: 32, lineHeight: 36, letterSpacing: -0.5 },
  h3: { fontFamily: 'Outfit_600SemiBold', fontSize: 24, lineHeight: 28, letterSpacing: -0.5 },
  h4: { fontFamily: 'Outfit_600SemiBold', fontSize: 20, lineHeight: 24 },
  bodyLg: { fontFamily: 'Manrope_500Medium', fontSize: 18, lineHeight: 28 },
  body: { fontFamily: 'Manrope_400Regular', fontSize: 16, lineHeight: 24 },
  bodyBold: { fontFamily: 'Manrope_600SemiBold', fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: 'Manrope_500Medium', fontSize: 14, lineHeight: 20 },
  caption: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

/** Neo-Brutalist hard shadow card style */
export const NeoCard = {
  borderWidth: 2,
  borderColor: Colors.light.border,
  borderRadius: Radius.lg,
  backgroundColor: Colors.light.surface,
  shadowColor: Colors.light.shadow,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
};

export const NeoCardSm = {
  ...NeoCard,
  shadowOffset: { width: 2, height: 2 },
};
