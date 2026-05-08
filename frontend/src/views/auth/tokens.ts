/**
 * Auth Design Tokens — NexusOS dark glass + purple identity.
 *
 * Keeps the purple primary that drives all auth CTAs but pulls
 * background, card and border surfaces from the shared NexusOS
 * palette so login/signup/2FA pages match the rest of the app.
 *
 * Per-role gradients are unchanged (mentor=gold, alumni=orange,
 * college=blue, student=purple) — they remain the way users
 * "feel" their chosen role during signup.
 */
import { NX } from '@/src/theme/nexus';

export const AC = {
  // Background gradient (NexusOS dark)
  bgFrom:    NX.surface1,                    // top
  bgVia:     NX.bg,                          // middle
  bgTo:      '#040408',                      // bottom (slightly darker)

  // Brand panel left (preserves purple hero identity)
  brandFrom: '#5B21B6',
  brandTo:   '#7C3AED',

  // Primary purple (auth identity)
  primary:   '#7C3AED',
  primaryL:  '#9D5CF6',
  primaryD:  '#5B21B6',

  // Role colors (preserved — drive PrimaryButton via RoleThemeContext)
  student:   '#7C3AED',
  mentor:    '#F59E0B',
  alumni:    '#FB923C',
  college:   '#3B82F6',

  // Surface (NexusOS-aligned glass)
  card:      'rgba(255,255,255,0.04)',
  cardHover: 'rgba(255,255,255,0.08)',
  cardOn:    'rgba(124,58,237,0.10)',
  border:    NX.border,
  borderOn:  'rgba(124,58,237,0.50)',
  glass:     'rgba(255,255,255,0.08)',

  // Text on dark surface
  text:      NX.textP,
  textSub:   'rgba(255,255,255,0.70)',
  muted:     'rgba(255,255,255,0.55)',
  dim:       'rgba(255,255,255,0.30)',

  // Status
  green:     NX.success,
  red:       NX.danger,
  amber:     NX.amber,
};

// Per-role gradient stops used by PrimaryButton via RoleThemeContext.
export const ROLE_GRADIENTS: Record<string, [string, string]> = {
  student: ['#7C3AED', '#9D5CF6'],
  mentor:  ['#F59E0B', '#FBBF24'],
  alumni:  ['#FB923C', '#F59E0B'],
  college: ['#3B82F6', '#6366F1'],
};

export const FONTS = {
  med:   'DMSans_500Medium',
  bold:  'DMSans_700Bold',
  xbold: 'DMSans_700Bold',
};
