/**
 * Apple HIG Theme — light + dark, with brand purple preserved as primary.
 *
 * Single source of truth for the new design system. Consumed by every
 * Apple-style primitive in src/motion/apple/. Pair with ThemeContext.tsx
 * for runtime light/dark switching.
 *
 * Key choices (locked with user):
 *   • Brand primary stays Student-Alumni purple #5F259F
 *   • Apple semantic colors for status (blue/green/red/orange/purple/pink)
 *   • Hairline borders (rgba(0,0,0,0.08) light · rgba(255,255,255,0.10) dark)
 *   • SF Pro fallback chain — falls back to system on web/native
 *   • 4px grid spacing, Apple-spec radii
 */
import { Platform } from 'react-native';
export { BRAND } from '@/src/theme/tokens';

// ── Typography ─────────────────────────────────────────────────────────
export const FONT_FAMILY = Platform.select({
  ios: 'System',                                 // SF Pro on iOS
  android: 'sans-serif',                         // Roboto fallback
  default:                                       // web → SF Pro chain
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif',
}) as string;

export const TYPE = {
  // Letter-spacing in pts (RN doesn't support em — converted ratios)
  display:  { letterSpacing: -0.025, weight: '600' as const },
  title:    { letterSpacing: -0.020, weight: '600' as const },
  body:     { letterSpacing: -0.010, weight: '400' as const },
  uiMedium: { letterSpacing: -0.005, weight: '500' as const },
  caption:  { letterSpacing:  0,     weight: '500' as const },
} as const;

// ── Brand (preserved purple) + Apple semantic palette ──────────────────


export const APPLE_SEMANTIC = {
  blue:   '#0071E3',  // info / link
  green:  '#30D158',  // success
  red:    '#FF3B30',  // destructive / error
  orange: '#FF9500',  // warning
  purple: '#AF52DE',  // accent
  pink:   '#FF375F',  // accent
  yellow: '#FFD60A',
  teal:   '#5AC8FA',
} as const;

// ── Light theme ────────────────────────────────────────────────────────
export const LIGHT = {
  name: 'light' as const,

  // Surfaces (Apple light system)
  bg:        '#F5F5F7',                 // page background
  bgElevated:'#FFFFFF',                 // cards, modals
  bgGlass:   'rgba(255,255,255,0.72)',  // glass topbar/sheet
  bgInset:   '#EBEBEF',                 // inset/grouped lists

  // Text
  text:      '#1D1D1F',
  textSec:   '#6E6E73',
  textTer:   '#8E8E93',
  textDis:   '#C7C7CC',

  // Borders & dividers
  hairline:  'rgba(0,0,0,0.08)',
  divider:   'rgba(0,0,0,0.06)',
  separator: 'rgba(60,60,67,0.18)',     // Apple iOS separator

  // Brand & semantics
  primary: BRAND.primary,
  ...APPLE_SEMANTIC,

  // Shadows (Apple-style elevations)
  shadow: {
    sm: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3,  shadowOffset: { width: 0, height: 1 } },
    md: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    lg: { shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } },
    xl: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 64, shadowOffset: { width: 0, height: 24 } },
  },
} as const;

// ── Dark theme — NexusOS palette (near-black canvas, cyan/blue glow) ─
export const DARK = {
  name: 'dark' as const,

  bg:        '#07070A',                 // near-black with hint of blue
  bgElevated:'#121218',                 // cards, panels (surface-2)
  bgGlass:   'rgba(14,14,18,0.72)',     // glass topbar
  bgInset:   '#0E0E12',                 // sidebar, top bar (surface-1)

  text:      '#F4F4F6',
  textSec:   '#8A8A95',
  textTer:   '#5A5A66',
  textDis:   'rgba(255,255,255,0.20)',

  hairline:  'rgba(255,255,255,0.06)',
  divider:   'rgba(255,255,255,0.06)',
  separator: 'rgba(255,255,255,0.10)',

  // NexusOS accents — primary is Apple blue (matches active Dashboard pill);
  // brand purple is preserved as the `purple` semantic token.
  primary:  '#3B82F6',
  blue:     '#3B82F6',
  green:    '#10B981',
  red:      '#EF4444',
  orange:   '#F59E0B',
  purple:   '#A855F7',
  pink:     '#EC4899',
  yellow:   '#FFD60A',
  teal:     '#06B6D4',           // NexusOS cyan

  shadow: {
    sm: { shadowColor: '#000', shadowOpacity: 0.40, shadowRadius: 3,  shadowOffset: { width: 0, height: 1 } },
    md: { shadowColor: '#000', shadowOpacity: 0.50, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    lg: { shadowColor: '#000', shadowOpacity: 0.60, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } },
    xl: { shadowColor: '#000', shadowOpacity: 0.70, shadowRadius: 64, shadowOffset: { width: 0, height: 24 } },
  },
} as const;

export type Theme = typeof LIGHT;

// ── Spacing (4px grid) + Radii (Apple) ────────────────────────────────
export const SP = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, mega: 48, giga: 64 } as const;
export const RADII = { sm: 8, md: 10, lg: 12, card: 16, modal: 20, hero: 24, max: 28 } as const;
