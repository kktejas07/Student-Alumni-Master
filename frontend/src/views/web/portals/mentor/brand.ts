/**
 * Mentor Portal — brand gradient constants.
 *
 * Teal identity ("guidance, calm"). The mentor portal already uses
 * `MC.teal`/`MC.tealD` everywhere, so this file just exposes the
 * same stops as a `GRAD` constant matching the other portals.
 */
export const GRAD = {
  from: '#0D9488',   // teal 600
  to:   '#115E59',   // teal 800
  deep: '#0F3F3D',
  soft: ['rgba(13,148,136,0.22)', 'rgba(17,94,89,0.10)'] as const,
  ring:     'rgba(13,148,136,0.32)',
  ringSoft: 'rgba(13,148,136,0.12)',
  hero: ['#14B8A6', '#0D9488', '#115E59'] as const,
} as const;
