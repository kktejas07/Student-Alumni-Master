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
  // Ultra-deep background (#08080F) & FinTax360 navy glass palette
  bg:        '#08080F',
  bgNavy:    '#0a0f1e',
  surface1:  '#101019',
  surface2:  '#14141F',   // secondary panel surface
  surface3:  'rgba(20, 20, 31, 0.75)',   // glass card fill
  surface4:  'rgba(30, 30, 48, 0.90)',   // elevated glass surface

  // Structural lines & borders
  line:      '#1F1F30',
  line2:     '#262638',
  accentLine:'#2C2A52',
  border:    'rgba(255,255,255,0.08)',
  borderHi:  'rgba(255,255,255,0.14)',
  borderLo:  'rgba(255,255,255,0.04)',

  // Text scale (primary → secondary → tertiary)
  textP:     '#F4F4FA',
  textS:     '#8A8A9E',
  textT:     '#6A6A7E',

  // Brand accents
  violet:    '#7C5CFC',
  violetLt:  '#A78BFA',
  blue:      '#3B82F6',
  blueSoft:  'rgba(59,130,246,0.15)',
  cyan:      '#22D3EE',
  cyanSoft:  'rgba(34,211,238,0.15)',
  purple:    '#8B5CF6',
  purpleSoft:'rgba(139,92,246,0.15)',
  amber:     '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.15)',

  // Category palette (for multi-category tiles and tags)
  categories: {
    cat1: '#7C5CFC', // Flexi Desk / Technical
    cat2: '#2FB8C6', // PG & Hostel
    cat3: '#F59E0B', // Car & Mobility
    cat4: '#DB2777', // Two-wheeler
    cat5: '#34D399', // Verified Stays / AI
    cat6: '#4C8DF6', // Beach House / Villa
    cat7: '#A78BFA', // Day Pass / Coworking
  },

  // Status colours
  success:   '#34D399',
  successBg: 'rgba(16,185,129,0.12)',
  danger:    '#F0616B',
  dangerBg:  'rgba(240,97,107,0.13)',
  warning:   '#F59E0B',
  warningBg: 'rgba(245,158,11,0.12)',
  info:      '#3B82F6',
  infoBg:    'rgba(59,130,246,0.12)',
} as const;

// Per-portal accent identity overlays — FinTax360 Jewel palette
// Each portal shares the same dark-navy glass canvas; only the
// primary CTA / chip / active-rail / hover-border colour shifts per
// portal so users can tell which portal they're in at a glance.
export const PORTAL_ACCENTS = {
  // Student — Purple (matches auth RoleTheme)
  student: { primary: '#7C3AED', primaryD: '#5B21B6', primaryL: '#A78BFA', accent: '#7C3AED', accentSoft: 'rgba(124,58,237,0.18)' },
  // Alumni — Orange (matches auth RoleTheme)
  alumni:  { primary: '#FB923C', primaryD: '#F97316', primaryL: '#FDBA74', accent: '#FB923C', accentSoft: 'rgba(251,146,60,0.18)' },
  // College — Blue (matches auth RoleTheme)
  college: { primary: '#3B82F6', primaryD: '#2563EB', primaryL: '#60A5FA', accent: '#3B82F6', accentSoft: 'rgba(59,130,246,0.18)' },
  // Mentor — Amber (matches auth RoleTheme)
  mentor:  { primary: '#F59E0B', primaryD: '#D97706', primaryL: '#FBBF24', accent: '#F59E0B', accentSoft: 'rgba(245,158,11,0.18)' },
  // Super Admin — Gold (distinct from Mentor amber)
  admin:   { primary: '#EAB308', primaryD: '#CA8A04', primaryL: '#FACC15', accent: '#EAB308', accentSoft: 'rgba(234,179,8,0.18)' },
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

// ── Motion & timing constants ─────────────────────────────────
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
