/**
 * Web Platform Design Tokens — derived from /tmp/ui_specs (SA Brand Sheet & sa-components.jsx).
 * Used ONLY by the web-authenticated platform shells (Student/Mentor/College).
 * Mobile stays untouched.
 */
export const SA = {
  // Core purples
  purple: '#5F259F',
  purpleDark: '#3D1468',
  purpleMid: '#7B3DBF',
  purpleLight: '#B07FDF',
  purplePale: '#D4AAFF',
  pageBgGradient: ['#1A0438', '#2D0760', '#5F259F'] as const,
  pageBgGradientStops: [0, 0.45, 1] as const,

  // Sidebar tints (per role)
  sideStudent: 'rgba(26,4,56,0.9)',          // dark navy
  sideMentor: 'rgba(5,67,48,0.7)',           // green-tinted
  sideCollege: 'rgba(15,36,89,0.75)',        // blue-tinted

  // Page background gradients (per role) — matches /tmp/ui_specs JSX
  pageBgStudent: ['#1A0438', '#2D0760', '#5F259F'] as const,
  pageBgMentor: ['#0A1F0F', '#133D2A', '#2D7A4F'] as const,
  pageBgCollege: ['#0F1729', '#1A2453', '#2E4480'] as const,

  // Active rail accent (per role)
  railStudent: '#B07FDF',
  railMentor: '#6EC9A8',
  railCollege: '#7A9FE8',

  // Glass & borders
  glass: 'rgba(255,255,255,0.10)',
  glassMid: 'rgba(255,255,255,0.16)',
  border: 'rgba(255,255,255,0.16)',
  borderSoft: 'rgba(255,255,255,0.07)',

  // Text colors over dark
  white: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.65)',
  textFaint: 'rgba(255,255,255,0.45)',
  textWhisper: 'rgba(255,255,255,0.32)',

  // Status colors
  success: '#86EFAC',
  warn: '#FCD34D',
  danger: '#FCA5A5',
  info: '#D4AAFF',

  // Font
  font: 'DMSans_400Regular',
  fontBold: 'DMSans_700Bold',
  fontSemi: 'DMSans_600SemiBold',
  fontMedium: 'DMSans_500Medium',
};

// gradient strings for buttons/lines
export const SAGradients = {
  purple: ['#7B3DBF', '#B07FDF'] as const,
  purpleSoft: ['#7B3DBF', '#D4AAFF'] as const,
  green: ['#0A6B4A', '#6EC9A8'] as const,
  blue: ['#1A3C8F', '#4A7FE8'] as const,
  copper: ['#B87333', '#E8936E'] as const,
};
