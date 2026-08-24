import { NX } from '@/src/theme/tokens';

export const AC = {
  bgFrom:    NX.surface1,
  bgVia:     NX.bg,
  bgTo:      '#040408',
  brandFrom: '#5B21B6',
  brandTo:   '#7C3AED',
  primary:   '#7C3AED',
  primaryL:  '#9D5CF6',
  primaryD:  '#5B21B6',
  student:   '#7C3AED',
  mentor:    '#F59E0B',
  alumni:    '#FB923C',
  college:   '#3B82F6',
  card:      'rgba(255,255,255,0.04)',
  cardHover: 'rgba(255,255,255,0.08)',
  cardOn:    'rgba(124,58,237,0.10)',
  border:    NX.border,
  borderOn:  'rgba(124,58,237,0.50)',
  glass:     'rgba(255,255,255,0.08)',
  text:      NX.textP,
  textSub:   'rgba(255,255,255,0.70)',
  muted:     'rgba(255,255,255,0.55)',
  dim:       'rgba(255,255,255,0.30)',
  green:     NX.success,
  red:       NX.danger,
  amber:     NX.amber,
};

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
