/**
 * College Portal — brand gradient constants.
 *
 * Indigo identity ("academic prestige"). Token-level brand colour
 * (`CC.primary`) is sourced from `PORTAL_ACCENTS.college` in
 * `src/theme/nexus.ts`.
 */
export const GRAD = {
  from: '#4F46E5',   // indigo 600
  to:   '#3730A3',   // indigo 800
  deep: '#1E1B4B',
  soft: ['rgba(79,70,229,0.22)', 'rgba(55,48,163,0.10)'] as const,
  ring:     'rgba(79,70,229,0.32)',
  ringSoft: 'rgba(79,70,229,0.12)',
  hero: ['#818CF8', '#4F46E5', '#3730A3'] as const,
} as const;
