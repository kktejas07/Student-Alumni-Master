/**
 * Student Portal — gradient palette (NexusOS dark / Apple light).
 *
 * Provides static gradient presets used by Sidebar, KPI tiles, modals etc.
 * For per-mode gradients prefer `useGradients()` which switches the active
 * sidebar gradient between NexusOS blue→cyan (dark) and brand purple (light).
 */
type G2 = readonly [string, string];
type G3 = readonly [string, string, string];

export const GRADS = {
  // Brand identity — purple gradient (consistent across dark & light)
  brand:    ['#7B3DBF', '#5F259F'] as G2,                  // purple 500 → 700
  brandSoft:['#A78BFA', '#C4B5FD'] as G2,                  // soft lavender
  brandHero:['#7B3DBF', '#5F259F', '#EC4899'] as G3,       // purple → magenta
  brandGlow:['rgba(123,61,191,0.55)', 'rgba(7,7,10,0.0)'] as G2,

  bronze:   ['#92400E', '#B45309'] as G2,
  silver:   ['#94A3B8', '#CBD5E1'] as G2,
  gold:     ['#F59E0B', '#FBBF24'] as G2,
  goldDeep: ['#B45309', '#F59E0B', '#FCD34D'] as G3,
  platinum: ['#A78BFA', '#C4B5FD'] as G2,

  success:  ['#15803D', '#10B981'] as G2,
  successSoft: ['rgba(16,185,129,0.18)', 'rgba(16,185,129,0.04)'] as G2,
  danger:   ['#991B1B', '#EF4444'] as G2,
  dangerSoft:['rgba(239,68,68,0.18)', 'rgba(239,68,68,0.04)'] as G2,
  info:     ['#1E40AF', '#3B82F6'] as G2,
  infoSoft: ['rgba(59,130,246,0.18)', 'rgba(59,130,246,0.04)'] as G2,
  amber:    ['#B45309', '#F59E0B'] as G2,
  amberSoft:['rgba(245,158,11,0.18)', 'rgba(245,158,11,0.04)'] as G2,

  premium:  ['#7B3DBF', '#A78BFA', '#FCD34D'] as G3,
  glass:    ['rgba(123,61,191,0.10)', 'rgba(7,7,10,0.06)'] as G2,
  glassDark:['rgba(123,61,191,0.18)', 'rgba(7,7,10,0.6)'] as G2,
  card:     ['rgba(20,16,33,0.85)', 'rgba(7,7,10,0.85)'] as G2,
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
