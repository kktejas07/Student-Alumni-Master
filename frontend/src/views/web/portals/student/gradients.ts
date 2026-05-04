/**
 * Student Portal — universal gradient palette.
 *
 * Curated to mirror the production "Student Alumni" purple-glass theme
 * across every CTA, hero card, badge, and tier indicator. Use these
 * presets via expo-linear-gradient:
 *
 *   <LinearGradient colors={GRADS.brand} start={{x:0,y:0}} end={{x:1,y:1}} />
 *
 * Picked after auditing the Wallet hero, Dashboard tier card, KPI tiles,
 * Money Coach bubble and Member Deals hero — the values below land
 * cleanly on every existing surface.
 */

// Tuple form to satisfy expo-linear-gradient's `[ColorValue, ColorValue, ...]`
type G2 = readonly [string, string];
type G3 = readonly [string, string, string];

export const GRADS = {
  // Primary brand — used on hero cards, sidebar active, primary CTAs.
  brand:    ['#5F259F', '#3D1468'] as G2,
  brandSoft:['#7B3DBF', '#A78BFA'] as G2,                  // for progress bars, ring fills
  brandHero:['#6F2FBE', '#B07FDF', '#5F259F'] as G3,       // 3-stop wallet hero
  brandGlow:['rgba(123,61,191,0.55)', 'rgba(95,37,159,0.0)'] as G2, // animated aura

  // Tier — Bronze < Silver < Gold < Platinum
  bronze:   ['#92400E', '#B45309'] as G2,
  silver:   ['#94A3B8', '#CBD5E1'] as G2,
  gold:     ['#F59E0B', '#FBBF24'] as G2,
  goldDeep: ['#B45309', '#F59E0B', '#FCD34D'] as G3,
  platinum: ['#A78BFA', '#C4B5FD'] as G2,

  // Status semantic gradients
  success:  ['#15803D', '#22C55E'] as G2,
  successSoft: ['rgba(34,197,94,0.18)', 'rgba(34,197,94,0.04)'] as G2,
  danger:   ['#991B1B', '#EF4444'] as G2,
  dangerSoft:['rgba(239,68,68,0.18)', 'rgba(239,68,68,0.04)'] as G2,
  info:     ['#1E40AF', '#3B82F6'] as G2,
  infoSoft: ['rgba(59,130,246,0.18)', 'rgba(59,130,246,0.04)'] as G2,
  amber:    ['#B45309', '#F59E0B'] as G2,
  amberSoft:['rgba(245,158,11,0.18)', 'rgba(245,158,11,0.04)'] as G2,

  // Specialty
  premium:  ['#5F259F', '#A78BFA', '#FCD34D'] as G3,       // Premium / pro plan
  glass:    ['rgba(176,127,223,0.18)', 'rgba(95,37,159,0.06)'] as G2,
  glassDark:['rgba(95,37,159,0.18)', 'rgba(13,8,24,0.6)'] as G2,
  card:     ['rgba(30,16,55,0.85)', 'rgba(13,8,24,0.85)'] as G2,
} as const;

export type GradKey = keyof typeof GRADS;

/**
 * Resolve a tier name (case-insensitive) to its preferred gradient.
 * Falls back to brand for unknown tiers.
 */
export const tierGrad = (tier?: string): G2 | G3 => {
  switch ((tier || '').toLowerCase()) {
    case 'bronze':   return GRADS.bronze;
    case 'silver':   return GRADS.silver;
    case 'gold':     return GRADS.gold;
    case 'platinum': return GRADS.platinum;
    default:         return GRADS.brand;
  }
};
