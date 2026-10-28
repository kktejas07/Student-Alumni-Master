import { Platform } from 'react-native';

export { SPACING as Spacing, RADIUS as Radius, TYPE as Typography, FONT_FAMILY, BRAND, APPLE_SEMANTIC, LIGHT, DARK, FONT_SIZES } from './tokens';

const Palette = {
  brandPurple: '#7C3AED',
  deepPurple: '#5B21B6',
  midPurple: '#7B3DBF',
  lightPurple: '#A78BFA',
  palePurple: '#EDE0F7',
  paleLavender: '#F7F1FB',
  white: '#FFFFFF',
  ink: '#1A1A2E',
  background: '#F7F1FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EDE0F7',
  text: '#1A1A2E',
  textPrimary: '#1A1A2E',
  textSecondary: '#52527A',
  textMuted: '#8B8BA8',
  textOnPurple: '#FFFFFF',
  textOnPurpleMuted: 'rgba(255,255,255,0.78)',
  bg: '#F7F1FB',
  border: 'rgba(26,26,46,0.08)',
  borderStrong: 'rgba(26,26,46,0.16)',
  borderOnPurple: 'rgba(255,255,255,0.18)',
  borderOnPurpleStrong: 'rgba(255,255,255,0.28)',
  success: '#0F9D58',
  danger: '#B3261E',
  dangerSoft: '#FCE8E6',
  warning: '#E8A317',
  warningSoft: '#FEF3C7',
  info: '#1A73E8',
  infoSoft: '#E8F0FE',
  glassFill: 'rgba(255,255,255,0.10)',
  glassFillStrong: 'rgba(255,255,255,0.18)',
  glassFillLight: 'rgba(255,255,255,0.55)',
  accentYellow: '#FFD166',
  accentMint: '#06D6A0',
  accentPink: '#EF476F',
  accentBlue: '#7B3DBF',
  accentPurple: '#7C3AED',
  accentOrange: '#FFB454',
  primary: '#7C3AED',
  primaryText: '#FFFFFF',
  shadow: '#5B21B6',
};

export const Colors = { ...Palette, light: { ...Palette } };

export const Gradients = {
  hero: ['#5B21B6', '#7C3AED', '#7B3DBF'] as const,
  heroDiagonal: ['#5B21B6', '#7C3AED'] as const,
  card: ['#7C3AED', '#7B3DBF'] as const,
  cardSoft: ['#7B3DBF', '#A78BFA'] as const,
  splash: ['#5B21B6', '#7C3AED', '#A78BFA'] as const,
  splashRadial: ['#7B3DBF', '#5B21B6'] as const,
  accent: ['#A78BFA', '#7B3DBF'] as const,
  pale: ['#F7F1FB', '#EDE0F7'] as const,
};

export const Shadows = {
  sm: Platform.select({
    web: { boxShadow: '0 4px 12px rgba(91,33,182,0.08)' } as any,
    default: {
      boxShadow: '0px 4px 12px rgba(91,33,182,0.08)',
      elevation: 3,
    },
  }) as any,
  md: Platform.select({
    web: { boxShadow: '0 8px 24px rgba(91,33,182,0.14)' } as any,
    default: {
      boxShadow: '0px 8px 24px rgba(91,33,182,0.14)',
      elevation: 8,
    },
  }) as any,
  lg: Platform.select({
    web: { boxShadow: '0 16px 36px rgba(91,33,182,0.22)' } as any,
    default: {
      boxShadow: '0px 16px 36px rgba(91,33,182,0.22)',
      elevation: 14,
    },
  }) as any,
};

export const Layout = {
  floatingOffset: 90,
} as const;
