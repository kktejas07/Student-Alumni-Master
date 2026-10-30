/**
 * Typography — the one type system for StudentAlumni.
 *
 *   Body / UI   DM Sans   (DMSans_400Regular … DMSans_800ExtraBold)
 *   Display     Outfit    (Outfit_400Regular … Outfit_800ExtraBold)
 *   Mono        SpaceMono (bundled assets/fonts/SpaceMono-Regular.ttf, one weight)
 *
 * These are the only families loaded in app/_layout.tsx. Older code referred
 * to "PlusJakartaSans_*" (which actually loaded Manrope) and "JetBrainsMono_*"
 * (which loaded SpaceMono); those names are gone. Import from here instead of
 * typing font names in components.
 */
import { Platform } from 'react-native';

/** Registered font-face names (as passed to useFonts). */
export const FONT = {
  body: {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    semibold: 'DMSans_600SemiBold',
    bold: 'DMSans_700Bold',
    extrabold: 'DMSans_800ExtraBold',
  },
  display: {
    regular: 'Outfit_400Regular',
    medium: 'Outfit_500Medium',
    semibold: 'Outfit_600SemiBold',
    bold: 'Outfit_700Bold',
    extrabold: 'Outfit_800ExtraBold',
  },
  mono: 'SpaceMono',
} as const;

/** Short aliases used by the portal kits: FONTS.bold etc. (body family). */
export const FONTS = {
  regular: FONT.body.regular,
  med: FONT.body.medium,
  semi: FONT.body.semibold,
  bold: FONT.body.bold,
  xbold: FONT.body.extrabold,
  display: FONT.display.bold,
  body: FONT.body.medium,
  mono: FONT.mono,
} as const;

/** Weight-indexed names used by the TYPO objects in the portal token files. */
export const TYPO = {
  display400: FONT.display.regular,
  display500: FONT.display.medium,
  display600: FONT.display.semibold,
  display700: FONT.display.bold,
  display800: FONT.display.extrabold,
  body400: FONT.body.regular,
  body500: FONT.body.medium,
  body600: FONT.body.semibold,
  body700: FONT.body.bold,
  // SpaceMono ships one weight; all mono slots resolve to it.
  mono400: FONT.mono,
  mono500: FONT.mono,
  mono600: FONT.mono,
  mono700: FONT.mono,
} as const;

/** CSS font-family stacks for web-only surfaces (raw <div style>, CSS files). */
export const FONT_STACK = {
  body: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  display: 'Outfit, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: 'SpaceMono, ui-monospace, "SFMono-Regular", Menlo, monospace',
} as const;

/** Native system font fallback when a custom face is not wanted. */
export const SYSTEM_FONT = Platform.select({ ios: 'System', android: 'sans-serif', default: FONT_STACK.body }) as string;

/** Type scale (sizes in px / pt). */
export const TYPE_SCALE = {
  xs: 11,
  sm: 12.5,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 44,
} as const;

export const TYPE_STYLE = {
  display: { letterSpacing: -0.025, weight: '600' as const },
  title: { letterSpacing: -0.02, weight: '600' as const },
  body: { letterSpacing: -0.01, weight: '400' as const },
  uiMedium: { letterSpacing: -0.005, weight: '500' as const },
  caption: { letterSpacing: 0, weight: '500' as const },
} as const;
