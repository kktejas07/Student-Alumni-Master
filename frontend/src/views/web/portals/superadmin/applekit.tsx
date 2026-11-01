/**
 * Apple HIG Design Kit — Super Admin portal.
 *
 * Thin wrapper over the shared kit factory (`../shared/kit`) so every Super
 * Admin view (Overview, Approvals, Colleges, Students, Mentors, Alumni,
 * Events, Payments, Analytics, AI Insights, Workflows) renders with the same
 * warm-orange gradient identity, hairline borders, 14px radii, and
 * Apple-style auto-save toast.
 *
 * Import as:
 *   import { GRAD, GradientButton, Card, IconBox, StatusPill, TopTabs,
 *            SearchField, useToast, Toast, SectionLabel } from '../applekit';
 */
import { Info, Loader } from 'lucide-react-native';
import { createKit } from '../shared/kit';
import { SAC, useSAC, FONTS, resolveColors, pristineOf } from './tokens';

export type { PillKind, ToastKind } from '../shared/kit';
export { useToast } from '../shared/kit';

/* ─────────────────────────────────────────────────────────────────
 * Gradient palette (warm orange → amber, matches Settings spec)
 * ───────────────────────────────────────────────────────────────── */
export const GRAD = {
  from: '#FB923C',   // orange 400
  to:   '#F59E0B',   // amber 500
  deep: '#D97706',   // amber 600
  soft: ['rgba(251,146,60,0.20)', 'rgba(245,158,11,0.10)'] as const,
  ring: 'rgba(245,158,11,0.30)',
  ringSoft: 'rgba(245,158,11,0.10)',
} as const;

const kit = createKit({
  grad: GRAD,
  fonts: FONTS,
  accentStop: 'to',
  colors: {
    text: SAC.text,
    strongText: '#FFFFFF',
    onGradient: '#F4F4FA',
    searchInputText: '#F4F4FA',
    toastText: SAC.text,
    muted: SAC.muted,
    dim: SAC.dim,
    border: SAC.border,
    card: SAC.card,
    cardSolid: SAC.cardSolid,
    green: SAC.green,
    brandPill: '#C4B5FD',
    secondarySpinner: '#7C3AED',
  },
  toast: {
    info: {
      Icon: Info,
      accent: '#818CF8',
      iconColor: '#C7D2FE',
      iconBg: 'rgba(99,102,241,0.18)',
      border: 'rgba(129,140,248,0.4)',
      bg: 'rgba(12, 12, 24, 0.94)',
    },
    pending: {
      Icon: Loader,
      accent: '#FB923C',
      iconColor: '#FDBA74',
      iconBg: 'rgba(251,146,60,0.18)',
      border: 'rgba(251,146,60,0.4)',
      bg: 'rgba(18, 12, 8, 0.94)',
    },
  },
  // Theme-aware: swap the baked-in dark SAC colours for the active theme's
  // tokens at render time (same behaviour as the previous in-file kit).
  useThemedSheet: (sheet) => {
    const T = useSAC();
    // Resolve from the pristine dark-baked snapshot (not the live sheet) so
    // repeated in-place mutation stays idempotent across re-renders / theme flips.
    Object.assign(sheet, resolveColors(pristineOf(sheet), T));
  },
});

export const {
  GradientButton, SecondaryButton, Card, SectionLabel, IconBox,
  StatusPill, GradientPill, TopTabs, SearchField, Toast,
  KpiTile, EmptyState, LoadingBox,
} = kit;
