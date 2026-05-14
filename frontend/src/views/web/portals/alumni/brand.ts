/**
 * Alumni Portal — brand gradient constants.
 *
 * Mirrors the role of `student/portalkit.tsx::GRAD` so any view can
 * upgrade a solid CTA to a `LinearGradient` with the LinkedIn blue
 * identity. Token-level brand colour (`SC.primary`) is sourced from
 * `PORTAL_ACCENTS.alumni` in `src/theme/nexus.ts`.
 */
export const GRAD = {
  from: '#0A66C2',   // LinkedIn blue 500
  to:   '#004182',   // LinkedIn blue 800
  deep: '#002048',
  soft: ['rgba(10,102,194,0.22)', 'rgba(0,65,130,0.10)'] as const,
  ring:     'rgba(10,102,194,0.32)',
  ringSoft: 'rgba(10,102,194,0.12)',
  hero: ['#378FE9', '#0A66C2', '#004182'] as const,
} as const;
