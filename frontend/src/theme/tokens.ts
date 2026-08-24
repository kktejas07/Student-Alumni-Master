import { Platform } from 'react-native';

export const PRIMARY = '#7C3AED';
export const PRIMARY_DARK = '#5B21B6';
export const PRIMARY_LIGHT = '#A78BFA';
export const PRIMARY_SOFT = 'rgba(124,58,237,0.18)';

export const FONT_FAMILY = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif',
}) as string;

export const TYPE = {
  display:  { letterSpacing: -0.025, weight: '600' as const },
  title:    { letterSpacing: -0.020, weight: '600' as const },
  body:     { letterSpacing: -0.010, weight: '400' as const },
  uiMedium: { letterSpacing: -0.005, weight: '500' as const },
  caption:  { letterSpacing:  0,     weight: '500' as const },
} as const;

export const SP = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, mega: 48, giga: 64 } as const;
export const RADII = { sm: 8, md: 10, lg: 12, card: 16, modal: 20, hero: 24, max: 28 } as const;

export const APPLE_SEMANTIC = {
  blue:   '#0071E3',
  green:  '#30D158',
  red:    '#FF3B30',
  orange: '#FF9500',
  purple: '#AF52DE',
  pink:   '#FF375F',
  yellow: '#FFD60A',
  teal:   '#5AC8FA',
} as const;

export const COLORS = {
  bg: '#030712',
  card: '#0B0F17',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardHover: 'rgba(26, 30, 50, 0.90)',
  cardSolid: '#0B0F17',
  chipBg: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderMed: 'rgba(255, 255, 255, 0.14)',
  text: '#F0EEFF',
  textPrimary: '#F9FAFB',
  text2: 'rgba(240, 238, 255, 0.80)',
  textSecondary: '#C4C9D4',
  textSub: 'rgba(240, 238, 255, 0.60)',
  dim: 'rgba(240, 238, 255, 0.45)',
  purple: PRIMARY,
  purpleL: PRIMARY_LIGHT,
  cyan: '#06B6D4',
  amber: '#F59E0B',
  green: '#10B981',
  blue: '#3B82F6',
  pink: '#EC4899',
  red: '#EF4444',
};

export const FONT_FAMILIES = {
  sans: 'Inter, system-ui, sans-serif',
  mono: 'JetBrains Mono, monospace',
  bold: 'Inter, system-ui, sans-serif',
  med: 'Inter, system-ui, sans-serif',
  xbold: 'Inter, system-ui, sans-serif',
};

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
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
  card: 16,
  chip: 8,
  btn: 12,
  icon: 8,
};

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const ELEVATION = {
  sm: 2,
  md: 4,
  lg: 8,
};

export const WEB_TRANSITIONS = {
  all200: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
};

export const PROGRESS_HEIGHTS = {
  sm: 4,
  md: 8,
  lg: 12,
};

export const BREAKPOINTS = {
  phone: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

export const NX = {
  bg:        '#0a0f1e',
  surface1:  '#0E1428',
  surface2:  'rgba(20, 26, 45, 0.55)',
  surface3:  'rgba(30, 38, 60, 0.72)',
  surface4:  'rgba(40, 50, 78, 0.85)',
  border:    'rgba(255,255,255,0.08)',
  borderHi:  'rgba(255,255,255,0.14)',
  borderLo:  'rgba(255,255,255,0.04)',
  textP:     '#F8FAFC',
  textS:     'rgba(255,255,255,0.70)',
  textT:     'rgba(255,255,255,0.50)',
  blue:      '#3B82F6',
  blueSoft:  'rgba(59,130,246,0.15)',
  cyan:      '#22D3EE',
  cyanSoft:  'rgba(34,211,238,0.15)',
  purple:    PRIMARY,
  purpleSoft: PRIMARY_SOFT,
  amber:     '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.15)',
  success:   '#10B981',
  successBg: 'rgba(16,185,129,0.12)',
  danger:    '#EF4444',
  dangerBg:  'rgba(239,68,68,0.12)',
  warning:   '#F59E0B',
  warningBg: 'rgba(245,158,11,0.12)',
  info:      '#3B82F6',
  infoBg:    'rgba(59,130,246,0.12)',
} as const;

export const PORTAL_ACCENTS = {
  student: { primary: PRIMARY, primaryD: PRIMARY_DARK, primaryL: PRIMARY_LIGHT, accent: PRIMARY, accentSoft: PRIMARY_SOFT },
  alumni:  { primary: '#FB923C', primaryD: '#F97316', primaryL: '#FDBA74', accent: '#FB923C', accentSoft: 'rgba(251,146,60,0.18)' },
  college: { primary: '#3B82F6', primaryD: '#2563EB', primaryL: '#60A5FA', accent: '#3B82F6', accentSoft: 'rgba(59,130,246,0.18)' },
  mentor:  { primary: '#F59E0B', primaryD: '#D97706', primaryL: '#FBBF24', accent: '#F59E0B', accentSoft: 'rgba(245,158,11,0.18)' },
  admin:   { primary: '#EAB308', primaryD: '#CA8A04', primaryL: '#FACC15', accent: '#EAB308', accentSoft: 'rgba(234,179,8,0.18)' },
} as const;

export type PortalKey = keyof typeof PORTAL_ACCENTS;

export const NX_TYPE = {
  largeTitle: { size: 32, weight: '700', lineHeight: 38, tracking: -0.5 },
  title1:     { size: 28, weight: '600', lineHeight: 34, tracking: -0.4 },
  title2:     { size: 22, weight: '600', lineHeight: 28, tracking: -0.3 },
  title3:     { size: 18, weight: '600', lineHeight: 24, tracking: -0.2 },
  body:       { size: 14, weight: '500', lineHeight: 20, tracking: 0 },
  bodySm:     { size: 12, weight: '500', lineHeight: 16, tracking: 0 },
  caption:    { size: 11, weight: '600', lineHeight: 14, tracking: 0.4 },
  microKick:  { size: 10, weight: '700', lineHeight: 12, tracking: 1.2 },
} as const;

export const NX_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: '"Inter", -apple-system, BlinkMacSystemFont, "Geist", system-ui, sans-serif',
}) as string;

export const NX_SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32, mega: 40 } as const;
export const NX_RADIUS = { xs: 6, sm: 8, md: 10, lg: 14, xl: 18, xxl: 22, pill: 999 } as const;

export const NX_SHADOW = {
  card: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24 } as const,
    android: { elevation: 6 } as const,
    default: { boxShadow: '0 8px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)' } as any,
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

export const nxGlass = {
  card: {
    backgroundColor: NX.surface2,
    borderRadius: NX_RADIUS.xl,
    borderWidth: 1,
    borderColor: NX.border,
  },
  cardElevated: {
    backgroundColor: NX.surface3,
    borderRadius: NX_RADIUS.xl,
    borderWidth: 1,
    borderColor: NX.borderHi,
  },
  topbar: {
    backgroundColor: NX.surface1,
    borderBottomWidth: 1,
    borderBottomColor: NX.border,
  },
  sidebar: {
    backgroundColor: NX.surface1,
    borderRightWidth: 1,
    borderRightColor: NX.border,
  },
  pillNeutral: {
    backgroundColor: NX.surface3,
    borderColor: NX.border,
    borderWidth: 1,
    borderRadius: NX_RADIUS.pill,
  },
} as const;

export const BRAND = {
  primary:     PRIMARY,
  primaryDark: PRIMARY_DARK,
  primaryLight:PRIMARY_LIGHT,
  primarySoft: PRIMARY_LIGHT,
} as const;

export const LIGHT = {
  name: 'light' as const,
  bg:        '#F5F5F7',
  bgElevated:'#FFFFFF',
  bgGlass:   'rgba(255,255,255,0.72)',
  bgInset:   '#EBEBEF',
  text:      '#1D1D1F',
  textSec:   '#6E6E73',
  textTer:   '#8E8E93',
  textDis:   '#C7C7CC',
  hairline:  'rgba(0,0,0,0.08)',
  divider:   'rgba(0,0,0,0.06)',
  separator: 'rgba(60,60,67,0.18)',
  primary: PRIMARY,
  ...APPLE_SEMANTIC,
  shadow: {
    sm: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3,  shadowOffset: { width: 0, height: 1 } },
    md: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    lg: { shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } },
    xl: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 64, shadowOffset: { width: 0, height: 24 } },
  },
} as const;

export const DARK = {
  name: 'dark' as const,
  bg:        '#07070A',
  bgElevated:'#121218',
  bgGlass:   'rgba(14,14,18,0.72)',
  bgInset:   '#0E0E12',
  text:      '#F4F4F6',
  textSec:   '#8A8A95',
  textTer:   '#5A5A66',
  textDis:   'rgba(255,255,255,0.20)',
  hairline:  'rgba(255,255,255,0.06)',
  divider:   'rgba(255,255,255,0.06)',
  separator: 'rgba(255,255,255,0.10)',
  primary:  '#3B82F6',
  blue:     '#3B82F6',
  green:    '#10B981',
  red:      '#EF4444',
  orange:   '#F59E0B',
  purple:   '#A855F7',
  pink:     '#EC4899',
  yellow:   '#FFD60A',
  teal:     '#06B6D4',
  shadow: {
    sm: { shadowColor: '#000', shadowOpacity: 0.40, shadowRadius: 3,  shadowOffset: { width: 0, height: 1 } },
    md: { shadowColor: '#000', shadowOpacity: 0.50, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    lg: { shadowColor: '#000', shadowOpacity: 0.60, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } },
    xl: { shadowColor: '#000', shadowOpacity: 0.70, shadowRadius: 64, shadowOffset: { width: 0, height: 24 } },
  },
} as const;

export type Theme = typeof LIGHT;
