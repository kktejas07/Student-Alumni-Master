/**
 * NexusOS — Shared Design System
 * ===============================
 * Single source of truth for the NexusOS dark-glass palette,
 * spacing scale, radii, motion/timing constants, and shadow recipes.
 *
 * Every portal (Student, Alumni, College, Super Admin) consumes
 * these tokens so the visual language stays unified while each
 * portal layers its own accent identity (orange / cyan / blue / red).
 *
 * Usage:
 *   import { NX } from '@/src/theme/nexus';
 *   <View style={{ backgroundColor: NX.surface2, borderColor: NX.border }} />
 */
import { Platform } from 'react-native';

// ── Core palette ─────────────────────────────────────────────
export const NX = {
  // Deep backgrounds (page → card → elevated)
  bg:        '#07070A',
  surface1:  '#0E0E12',
  surface2:  '#121218',
  surface3:  '#1A1A22',
  surface4:  '#22222C',

  // Dividers / strokes
  border:    'rgba(255,255,255,0.06)',
  borderHi:  'rgba(255,255,255,0.10)',
  borderLo:  'rgba(255,255,255,0.04)',

  // Text scale (primary → secondary → tertiary)
  textP:     '#F4F4F6',
  textS:     '#8A8A95',
  textT:     '#5A5A66',

  // Brand accents (used across portals)
  blue:      '#3B82F6',
  blueSoft:  'rgba(59,130,246,0.15)',
  cyan:      '#06B6D4',
  cyanSoft:  'rgba(6,182,212,0.15)',
  purple:    '#A855F7',
  purpleSoft:'rgba(168,85,247,0.15)',
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

// Per-portal accent identity overlays
// Each portal still uses NX surfaces, but its primary CTA / chip /
// active-rail colour stays distinct so users can tell which portal
// they're in at a glance.
export const PORTAL_ACCENTS = {
  student: { primary: NX.blue,   primaryD: '#1D4ED8', primaryL: '#60A5FA', accent: NX.cyan,   accentSoft: NX.cyanSoft   },
  alumni:  { primary: '#F97316', primaryD: '#C2410C', primaryL: '#FB923C', accent: '#FDBA74', accentSoft: 'rgba(253,186,116,0.18)' },
  // College keeps its established indigo + cyan identity
  college: { primary: '#6366F1', primaryD: '#4338CA', primaryL: '#818CF8', accent: '#22D3EE', accentSoft: 'rgba(34,211,238,0.18)' },
  // Super Admin pivots to purple (premium/elevated feel) — distinct from alumni's orange
  admin:   { primary: NX.purple, primaryD: '#7E22CE', primaryL: '#C084FC', accent: '#FBBF24', accentSoft: NX.amberSoft },
} as const;

export type PortalKey = keyof typeof PORTAL_ACCENTS;

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

// ── Motion timing ───────────────────────────────────────────
export const NX_MOTION = {
  fast: 160,
  base: 220,
  slow: 320,
  cinematic: 480,
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
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
