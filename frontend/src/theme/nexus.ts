import { Platform } from 'react-native';
import { PORTAL_ACCENTS, NX_MOTION } from '@/src/theme/tokens';
export { PORTAL_ACCENTS, NX_MOTION };
export type { PortalKey } from '@/src/theme/tokens';

// ── Core palette ─────────────────────────────────────────────
export const NX = {
  // Deep backgrounds — FinTax360 Jewel-glass navy palette
  // (Previously near-black #07070A; now matches the Student portal's
  //  body gradient #0a0f1e → #131938 with elevated surfaces.)
  bg:        '#0a0f1e',
  surface1:  '#0E1428',
  surface2:  'rgba(20, 26, 45, 0.55)',   // glass card fill — frosted
  surface3:  'rgba(30, 38, 60, 0.72)',   // hover / elevated glass
  surface4:  'rgba(40, 50, 78, 0.85)',   // deepest elevation

  // Dividers / strokes — neutral white (per Jewel spec)
  border:    'rgba(255,255,255,0.08)',
  borderHi:  'rgba(255,255,255,0.14)',
  borderLo:  'rgba(255,255,255,0.04)',

  // Text scale (primary → secondary → tertiary)
  textP:     '#F8FAFC',
  textS:     'rgba(255,255,255,0.70)',
  textT:     'rgba(255,255,255,0.50)',

  // Brand accents (used across portals)
  blue:      '#3B82F6',
  blueSoft:  'rgba(59,130,246,0.15)',
  cyan:      '#22D3EE',
  cyanSoft:  'rgba(34,211,238,0.15)',
  purple:    '#8B5CF6',
  purpleSoft:'rgba(139,92,246,0.15)',
  amber:     '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.15)',

  // Status colours
  success:   '#10B981',
  successBg: 'rgba(16,185,129,0.12)',
  danger:    '#EF4444',
  dangerBg:  'rgba(239,68,68,0.12)',
  warning:   '#F59E0B',
  warningBg: 'rgba(245,158,11,0.12)',
  info:      '#3B82F6',
  infoBg:    'rgba(59,130,246,0.12)',
} as const;

// ── Type scale (Apple HIG-aligned, fluid) ────────────────────
export const NX_TYPE = {
  // size, weight, lineHeight, tracking
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

// ── Spacing & radii (8pt grid) ──────────────────────────────
export const NX_SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32, mega: 40 } as const;
export const NX_RADIUS = { xs: 6, sm: 8, md: 10, lg: 14, xl: 18, xxl: 22, pill: 999 } as const;

// ── Shadow / glass recipes ──────────────────────────────────
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



// ── Web helpers (no-op on native) ───────────────────────────
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

// ── Glass surface helpers ────────────────────────────────────
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
