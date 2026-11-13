/**
 * src/ui/theme.ts — one semantic token set for every portal.
 *
 * Portals used to carry their own token files (student/tokens.ts,
 * alumni/tokens.ts, superadmin/tokens.ts, …) with different names for the
 * same thing (SC.bg2 / SAC.panel / NX.surface1). This module resolves ONE
 * semantic vocabulary from the global palette plus the portal's accent, in
 * light or dark, and hands it to components through `usePortalTheme()`.
 *
 *   <PortalThemeProvider portal="alumni">
 *     const t = usePortalTheme();   // t.accent is orange here
 *
 * Only the accent family rotates per portal; surfaces, text and status
 * colours are shared so cross-portal navigation feels like one product.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import { useTheme, ForceDarkTheme } from '@/src/theme/ThemeContext';
import { COLORS } from '@/src/theme/tokens';
import { TYPO, FONTS } from '@/src/theme/typography';

export type PortalKey = 'student' | 'alumni' | 'mentor' | 'college' | 'superadmin' | 'vendor';

/** Accent families. Values come from the brand palette in src/theme/tokens.ts. */
export const PORTAL_ACCENT: Record<PortalKey, { accent: string; accentD: string; accentL: string; onAccent: string }> = {
  student:    { accent: COLORS.primary, accentD: COLORS.primaryDark, accentL: COLORS.primaryLight, onAccent: '#FFFFFF' },
  superadmin: { accent: COLORS.primary, accentD: COLORS.primaryDark, accentL: COLORS.primaryLight, onAccent: '#FFFFFF' },
  vendor:     { accent: COLORS.purple,  accentD: '#7C3AED',          accentL: COLORS.purpleL,      onAccent: '#FFFFFF' },
  alumni:     { accent: '#FB923C', accentD: '#F97316', accentL: '#FDBA74', onAccent: '#1A1A1A' },
  mentor:     { accent: '#F59E0B', accentD: '#D97706', accentL: '#FBBF24', onAccent: '#1A1A1A' },
  college:    { accent: '#3B82F6', accentD: '#2563EB', accentL: '#60A5FA', onAccent: '#FFFFFF' },
};

const DARK = {
  bg: '#0B1220',
  bgGradient: ['#0B1220', '#0F172A', '#0B1220'] as readonly string[],
  surface: '#111827',
  surface2: '#1E293B',
  surfaceGlass: 'rgba(30, 41, 59, 0.72)',
  hover: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  borderHi: 'rgba(255,255,255,0.14)',
  text: '#F8FAFC',
  textMuted: '#CBD5E1',
  textDim: '#94A3B8',
  chrome: 'rgba(17, 24, 39, 0.88)',
  rail: '#111827',
  scrim: 'rgba(5,6,12,0.62)',
  onAccentSoft: 'rgba(255,255,255,0.22)',
  success: '#34D399', successBg: 'rgba(52,211,153,0.14)',
  warning: '#F59E0B', warningBg: 'rgba(245,158,11,0.14)',
  danger: '#F0616B',  dangerBg: 'rgba(240,97,107,0.14)',
  info: '#60A5FA',    infoBg: 'rgba(96,165,250,0.14)',
  shadow: Platform.OS === 'web' ? '0 18px 40px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.03)' : undefined,
  shadowSm: Platform.OS === 'web' ? '0 4px 16px rgba(0,0,0,.25)' : undefined,
};

const LIGHT: typeof DARK = {
  bg: '#F8FAFC',
  bgGradient: ['#F8FAFC', '#F1F5F9', '#F8FAFC'],
  surface: '#FFFFFF',
  surface2: '#F1F5F9',
  surfaceGlass: 'rgba(255,255,255,0.82)',
  hover: 'rgba(20,23,38,0.05)',
  border: '#E2E8F0',
  borderHi: '#CBD5E1',
  text: '#0F172A',
  textMuted: '#475569',
  textDim: '#64748B',
  chrome: 'rgba(248,250,252,0.88)',
  rail: '#FFFFFF',
  scrim: 'rgba(20,23,38,0.45)',
  onAccentSoft: 'rgba(255,255,255,0.28)',
  success: '#047857', successBg: 'rgba(4,120,87,.10)',
  warning: '#B45309', warningBg: 'rgba(180,83,9,.10)',
  danger: '#BE123C',  dangerBg: 'rgba(190,18,60,.09)',
  info: '#1E56C4',    infoBg: 'rgba(30,86,196,.10)',
  shadow: Platform.OS === 'web' ? '0 1px 2px rgba(20,23,38,.04), 0 12px 30px rgba(20,23,38,.06)' : undefined,
  shadowSm: Platform.OS === 'web' ? '0 4px 16px rgba(20,23,38,.08)' : undefined,
};

export type UiTokens = typeof DARK & (typeof PORTAL_ACCENT)[PortalKey] & {
  portal: PortalKey;
  isDark: boolean;
  accentSoft: string;
  accentGlow?: string;
  fonts: typeof FONTS;
  typo: typeof TYPO;
};

export const SPACE = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 } as const;
export const RADIUS = { sm: 8, md: 10, lg: 12, card: 16, modal: 20, pill: 999 } as const;

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function buildTokens(portal: PortalKey, isDark: boolean): UiTokens {
  const base = isDark ? DARK : LIGHT;
  const acc = PORTAL_ACCENT[portal];
  return {
    ...base,
    ...acc,
    portal,
    isDark,
    accentSoft: hexToRgba(acc.accent, isDark ? 0.16 : 0.10),
    accentGlow: Platform.OS === 'web' ? `0 8px 22px ${hexToRgba(acc.accent, 0.28)}` : undefined,
    fonts: FONTS,
    typo: TYPO,
  };
}

const PortalCtx = createContext<{ portal: PortalKey; darkOnly: boolean }>({ portal: 'student', darkOnly: false });

/**
 * `darkOnly` pins the portal to the dark token set regardless of the user's
 * theme. Use it for portals whose views still hardcode dark colours (alumni,
 * mentor, college, vendor) until those views read tokens; the shell also
 * hides the theme toggle for them.
 */
export function PortalThemeProvider({ portal, darkOnly = false, children }: { portal: PortalKey; darkOnly?: boolean; children: React.ReactNode }) {
  const value = useMemo(() => ({ portal, darkOnly }), [portal, darkOnly]);
  // Pin the global theme too, so views that read `useTheme()` directly can't
  // render light content inside a dark shell.
  const inner = darkOnly ? React.createElement(ForceDarkTheme, null, children) : children;
  return React.createElement(PortalCtx.Provider, { value }, inner);
}

/** Resolved tokens for the nearest portal in light/dark. */
export function usePortalTheme(): UiTokens {
  const { portal, darkOnly } = useContext(PortalCtx);
  const { isDark } = useTheme();
  const dark = darkOnly || isDark;
  return useMemo(() => buildTokens(portal, dark), [portal, dark]);
}

export function usePortalKey(): PortalKey {
  return useContext(PortalCtx).portal;
}

/** Web-only style helper: returns {} on native so callers can spread safely. */
export const web = (style: Record<string, any>): any => (Platform.OS === 'web' ? style : {});
