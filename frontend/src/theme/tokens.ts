import { Platform } from 'react-native';

export const COLORS = {
  bg: '#08080F',
  bgNavy: '#0a0f1e',
  surface1: '#101019',
  surface2: '#14141F',
  surface3: 'rgba(20, 20, 31, 0.75)',
  surface4: 'rgba(30, 30, 48, 0.90)',
  line: '#1F1F30',
  line2: '#262638',
  accentLine: '#2C2A52',
  border: 'rgba(255,255,255,0.08)',
  borderHi: 'rgba(255,255,255,0.14)',
  borderLo: 'rgba(255,255,255,0.04)',
  textP: '#F4F4FA',
  textS: '#8A8A9E',
  textT: '#6A6A7E',
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primaryLight: '#A78BFA',
  primarySoft: 'rgba(124,58,237,0.15)',
  violet: '#7C5CFC',
  violetLt: '#A78BFA',
  blue: '#3B82F6',
  blueSoft: 'rgba(59,130,246,0.15)',
  cyan: '#22D3EE',
  cyanSoft: 'rgba(34,211,238,0.15)',
  purple: '#8B5CF6',
  purpleSoft: 'rgba(139,92,246,0.15)',
  amber: '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.15)',
  categories: {
    cat1: '#7C5CFC',
    cat2: '#2FB8C6',
    cat3: '#F59E0B',
    cat4: '#DB2777',
    cat5: '#34D399',
    cat6: '#4C8DF6',
    cat7: '#A78BFA',
  },
} as const;

export const PORTAL_ACCENTS = {
  student: { primary: '#7C3AED', primaryD: '#5B21B6', primaryL: '#A78BFA', accent: '#7C3AED', accentSoft: 'rgba(124,58,237,0.18)' },
  alumni: { primary: '#FB923C', primaryD: '#F97316', primaryL: '#FDBA74', accent: '#FB923C', accentSoft: 'rgba(251,146,60,0.18)' },
  college: { primary: '#3B82F6', primaryD: '#2563EB', primaryL: '#60A5FA', accent: '#3B82F6', accentSoft: 'rgba(59,130,246,0.18)' },
  mentor: { primary: '#F59E0B', primaryD: '#D97706', primaryL: '#FBBF24', accent: '#F59E0B', accentSoft: 'rgba(245,158,11,0.18)' },
  admin: { primary: '#EAB308', primaryD: '#CA8A04', primaryL: '#FACC15', accent: '#EAB308', accentSoft: 'rgba(234,179,8,0.18)' },
} as const;

export type PortalKey = keyof typeof PORTAL_ACCENTS;

export const SPACING = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, mega: 48, giga: 64 } as const;

export const RADIUS = { sm: 8, md: 10, lg: 12, card: 16, modal: 20, hero: 24, max: 28 } as const;

export const GLASS = {
  card: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.hero,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardElevated: {
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.hero,
    borderWidth: 1,
    borderColor: COLORS.borderHi,
  },
  topbar: {
    backgroundColor: COLORS.surface1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sidebar: {
    backgroundColor: COLORS.surface1,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  pillNeutral: {
    backgroundColor: COLORS.surface3,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 999,
  },
} as const;

export const STATUS = {
  success: '#34D399',
  successBg: 'rgba(16,185,129,0.12)',
  danger: '#F0616B',
  dangerBg: 'rgba(240,97,107,0.13)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.12)',
  info: '#3B82F6',
  infoBg: 'rgba(59,130,246,0.12)',
} as const;

export const FONT_FAMILIES = {
  display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif',
  body: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif',
  sans: 'Inter, system-ui, sans-serif',
  mono: 'JetBrains Mono, monospace',
  bold: 'Inter, system-ui, sans-serif',
  med: 'Inter, system-ui, sans-serif',
  xbold: 'Inter, system-ui, sans-serif',
};

export const TYPE = {
  display: { letterSpacing: -0.025, weight: '600' as const },
  title: { letterSpacing: -0.020, weight: '600' as const },
  body: { letterSpacing: -0.010, weight: '400' as const },
  uiMedium: { letterSpacing: -0.005, weight: '500' as const },
  caption: { letterSpacing: 0, weight: '500' as const },
} as const;

export const BRAND = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primaryLight: '#A78BFA',
  primarySoft: 'rgba(124,58,237,0.15)',
} as const;

export const APPLE_SEMANTIC = {
  blue: '#0071E3',
  green: '#30D158',
  red: '#FF3B30',
  orange: '#FF9500',
  purple: '#AF52DE',
  pink: '#FF375F',
  yellow: '#FFD60A',
  teal: '#5AC8FA',
} as const;

export const LIGHT = {
  name: 'light' as const,
  bg: '#F5F5F7',
  bgElevated: '#FFFFFF',
  bgGlass: 'rgba(255,255,255,0.72)',
  bgInset: '#EBEBEF',
  text: '#1D1D1F',
  textSec: '#6E6E73',
  textTer: '#8E8E93',
  textDis: '#C7C7CC',
  hairline: 'rgba(0,0,0,0.08)',
  divider: 'rgba(0,0,0,0.06)',
  separator: 'rgba(60,60,67,0.18)',
  primary: BRAND.primary,
  ...APPLE_SEMANTIC,
  shadow: {
    sm: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
    md: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    lg: { shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } },
    xl: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 64, shadowOffset: { width: 0, height: 24 } },
  },
} as const;

export const DARK = {
  name: 'dark' as const,
  bg: '#07070A',
  bgElevated: '#121218',
  bgGlass: 'rgba(14,14,18,0.72)',
  bgInset: '#0E0E12',
  text: '#F4F4F6',
  textSec: '#8A8A95',
  textTer: '#5A5A66',
  textDis: 'rgba(255,255,255,0.20)',
  hairline: 'rgba(255,255,255,0.06)',
  divider: 'rgba(255,255,255,0.06)',
  separator: 'rgba(255,255,255,0.10)',
  primary: COLORS.primary,
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  orange: '#F59E0B',
  purple: '#A855F7',
  pink: '#EC4899',
  yellow: '#FFD60A',
  teal: '#06B6D4',
  shadow: {
    sm: { shadowColor: '#000', shadowOpacity: 0.40, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
    md: { shadowColor: '#000', shadowOpacity: 0.50, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    lg: { shadowColor: '#000', shadowOpacity: 0.60, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } },
    xl: { shadowColor: '#000', shadowOpacity: 0.70, shadowRadius: 64, shadowOffset: { width: 0, height: 24 } },
  },
} as const;

export type Theme = typeof LIGHT;

export const FONT_FAMILY = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif',
}) as string;

export const NX = COLORS;

export const NX_TYPE = {
  largeTitle: { size: 32, weight: '700', lineHeight: 38, tracking: -0.5 },
  title1: { size: 28, weight: '600', lineHeight: 34, tracking: -0.4 },
  title2: { size: 22, weight: '600', lineHeight: 28, tracking: -0.3 },
  title3: { size: 18, weight: '600', lineHeight: 24, tracking: -0.2 },
  body: { size: 14, weight: '500', lineHeight: 20, tracking: 0 },
  bodySm: { size: 12, weight: '500', lineHeight: 16, tracking: 0 },
  caption: { size: 11, weight: '600', lineHeight: 14, tracking: 0.4 },
  microKick: { size: 10, weight: '700', lineHeight: 12, tracking: 1.2 },
} as const;

export const NX_FONT = Platform.select({
  ios: 'Outfit',
  android: 'sans-serif',
  default: '"Outfit", -apple-system, BlinkMacSystemFont, "Manrope", system-ui, sans-serif',
}) as string;

export const NX_SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32, mega: 40 } as const;

export const NX_RADIUS = { xs: 6, sm: 8, md: 10, lg: 14, xl: 18, xxl: 22, pill: 999 } as const;

export const NX_SHADOW = {
  card: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.35, shadowRadius: 40 } as const,
    android: { elevation: 8 } as const,
    default: { boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 18px 40px rgba(0,0,0,0.35)' } as any,
  }),
  glow: (color: string) => Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 18 } as const,
    android: { elevation: 8 } as const,
    default: { boxShadow: `0 0 0 1px ${color}33, 0 0 18px ${color}55` } as any,
  }),
} as const;

export const NX_MOTION = {
  fast: 160,
  base: 220,
  slow: 320,
  cinematic: 480,
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(.2,.8,.2,1)',
  easeInOut: 'cubic-bezier(.4,0,.2,1)',
  spring: 'cubic-bezier(.2,.9,.3,1)',
  durations: {
    fast: 160,
    normal: 220,
    slow: 320,
    cinematic: 480,
    aurora: 34000,
  }
} as const;

export const nxWebTransition = (props = 'background-color, border-color, transform, box-shadow', dur = NX_MOTION.base) =>
  (Platform.OS === 'web' ? ({
    transitionProperty: props,
    transitionDuration: `${dur}ms`,
    transitionTimingFunction: NX_MOTION.ease,
  } as any) : {});

export const nxRadialGlow = (a = 0.06, b = 0.05) =>
  (Platform.OS === 'web' ? ({
    backgroundImage:
      `radial-gradient(circle at 90% 0%, rgba(6,182,212,${a}) 0%, rgba(7,7,10,0) 50%),` +
      ` radial-gradient(circle at 10% 100%, rgba(168,85,247,${b}) 0%, rgba(7,7,10,0) 60%)`,
  } as any) : {});

export const nxGlass = GLASS;

export const SP = SPACING;

export const RADII = RADIUS;

export const FONT_SIZES = {
  xxs: 10,
  xs: 12,
  sm: 14,
  md: 16,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 30,
} as const;

export const ELEVATION = {
  sm: 2,
  md: 4,
  lg: 8,
} as const;

export const WEB_TRANSITIONS = {
  all200: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const PROGRESS_HEIGHTS = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;

export const BREAKPOINTS = {
  phone: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;
