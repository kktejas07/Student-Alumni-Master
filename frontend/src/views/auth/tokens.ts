/**
 * Auth Design Tokens — Purple-violet palette matching the HTML spec
 */
export const AC = {
  // Background gradients
  bgFrom:    '#1a1230',
  bgVia:     '#0F0E1A',
  bgTo:      '#0A0817',

  // Brand panel left
  brandFrom: '#5B21B6',
  brandTo:   '#7C3AED',

  // Primary purple
  primary:   '#7C3AED',
  primaryL:  '#9D5CF6',
  primaryD:  '#5B21B6',

  // Role colors
  student:   '#7C3AED',
  mentor:    '#F59E0B',   // GOLD — propagates to all CTA buttons in mentor flow
  alumni:    '#FB923C',   // Orange
  college:   '#3B82F6',   // Blue

  // Surface
  card:      'rgba(255,255,255,0.04)',
  cardHover: 'rgba(255,255,255,0.08)',
  cardOn:    'rgba(124,58,237,0.10)',
  border:    'rgba(255,255,255,0.10)',
  borderOn:  'rgba(124,58,237,0.50)',
  glass:     'rgba(255,255,255,0.08)',

  // Text
  text:      '#FFFFFF',
  textSub:   'rgba(255,255,255,0.7)',
  muted:     'rgba(255,255,255,0.5)',
  dim:       'rgba(255,255,255,0.3)',

  // Status
  green:     '#22C55E',
  red:       '#EF4444',
  amber:     '#F59E0B',
};

// Per-role gradient stops used by PrimaryButton via RoleThemeContext.
// Each pair is [start, end] for a top-left → bottom-right LinearGradient.
export const ROLE_GRADIENTS: Record<string, [string, string]> = {
  student: ['#7C3AED', '#9D5CF6'],   // Purple
  mentor:  ['#F59E0B', '#FBBF24'],   // GOLD
  alumni:  ['#FB923C', '#F59E0B'],   // Orange
  college: ['#3B82F6', '#6366F1'],   // Blue
};

export const FONTS = {
  med:   'DMSans_500Medium',
  bold:  'DMSans_700Bold',
  xbold: 'DMSans_700Bold',
};
