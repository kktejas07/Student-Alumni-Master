/**
 * Alumni Portal — gradient palette (copper / orange-glass theme).
 *
 * Mirrors the structure of student/gradients.ts but tuned to the
 * orange brand used across alumni onboarding and dashboard surfaces.
 */
type G2 = readonly [string, string];
type G3 = readonly [string, string, string];

export const GRADS = {
  // Primary brand — used on hero cards, sidebar active, primary CTAs.
  brand:    ['#C2410C', '#7C2D12'] as G2,
  brandSoft:['#F97316', '#FB923C'] as G2,
  brandHero:['#EA580C', '#FB923C', '#C2410C'] as G3,
  brandGlow:['rgba(249,115,22,0.55)', 'rgba(124,45,18,0.0)'] as G2,

  // Tier — Bronze < Silver < Gold < Platinum (matches student)
  bronze:   ['#92400E', '#B45309'] as G2,
  silver:   ['#94A3B8', '#CBD5E1'] as G2,
  gold:     ['#F59E0B', '#FBBF24'] as G2,
  goldDeep: ['#B45309', '#F59E0B', '#FCD34D'] as G3,
  platinum: ['#A78BFA', '#C4B5FD'] as G2,

  success:  ['#15803D', '#22C55E'] as G2,
  successSoft: ['rgba(34,197,94,0.18)', 'rgba(34,197,94,0.04)'] as G2,
  danger:   ['#991B1B', '#EF4444'] as G2,
  dangerSoft:['rgba(239,68,68,0.18)', 'rgba(239,68,68,0.04)'] as G2,
  info:     ['#1E40AF', '#3B82F6'] as G2,
  infoSoft: ['rgba(59,130,246,0.18)', 'rgba(59,130,246,0.04)'] as G2,
  amber:    ['#B45309', '#F59E0B'] as G2,
  amberSoft:['rgba(245,158,11,0.18)', 'rgba(245,158,11,0.04)'] as G2,

  premium:  ['#C2410C', '#FB923C', '#FCD34D'] as G3,
  glass:    ['rgba(251,146,60,0.18)', 'rgba(124,45,18,0.06)'] as G2,
  glassDark:['rgba(124,45,18,0.20)', 'rgba(13,8,5,0.6)'] as G2,
  card:     ['rgba(43,20,7,0.85)', 'rgba(13,8,5,0.85)'] as G2,
} as const;

export type GradKey = keyof typeof GRADS;

export const tierGrad = (tier?: string): G2 | G3 => {
  switch ((tier || '').toLowerCase()) {
    case 'bronze':   return GRADS.bronze;
    case 'silver':   return GRADS.silver;
    case 'gold':     return GRADS.gold;
    case 'platinum': return GRADS.platinum;
    default:         return GRADS.brand;
  }
};
