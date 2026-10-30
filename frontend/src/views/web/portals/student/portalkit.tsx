/**
 * Student Portal — Apple HIG / Purple "PortalKit" design primitives.
 *
 * Thin wrapper over the shared kit factory (`../shared/kit`). The only
 * portal-specific pieces are:
 *   • Gradient identity is BRAND PURPLE (#7B3DBF → #5F259F)
 *   • Pulls tokens from the student `tokens.ts` (`SC`, `FONTS`)
 *
 * Exports:
 *   GRAD, GradientButton, SecondaryButton, Card, SectionLabel,
 *   IconBox, StatusPill, GradientPill, TopTabs, SearchField,
 *   useToast, Toast, KpiTile, EmptyState, LoadingBox
 *
 * Usage:
 *   import {
 *     GRAD, Card, IconBox, GradientButton, SectionLabel, KpiTile,
 *   } from '../portalkit';
 */
import { Info, Loader } from 'lucide-react-native';
import { createKit } from '../shared/kit';
import { SC, FONTS } from './tokens';

export type { PillKind, ToastKind } from '../shared/kit';
export { useToast } from '../shared/kit';

/* ─────────────────────────────────────────────────────────────────
 * Gradient palette — Brand PURPLE (consistent identity)
 * ───────────────────────────────────────────────────────────────── */
export const GRAD = {
  from: '#7B3DBF',                                // purple 500
  to:   '#5F259F',                                // purple 700
  deep: '#3D1468',                                // purple 900
  soft: ['rgba(123,61,191,0.22)', 'rgba(95,37,159,0.10)'] as const,
  ring: 'rgba(123,61,191,0.32)',
  ringSoft: 'rgba(123,61,191,0.12)',
  hero: ['#7B3DBF', '#5F259F', '#EC4899'] as const,
} as const;

const kit = createKit({
  grad: GRAD,
  fonts: FONTS,
  accentStop: 'from',
  colors: {
    text: SC.text,
    strongText: SC.text,
    onGradient: '#FFFFFF',
    searchInputText: SC.text,
    toastText: '#fff',
    muted: SC.muted,
    dim: SC.dim,
    border: SC.border,
    card: SC.card,
    cardSolid: SC.cardSolid,
    green: SC.green,
    brandPill: '#93C5FD',
    secondarySpinner: '#7C3AED',
  },
  toast: {
    info: {
      Icon: Info,
      accent: '#A78BFA',
      iconColor: '#DDD6FE',
      iconBg: 'rgba(124,58,237,0.18)',
      border: 'rgba(167,139,250,0.4)',
      bg: 'rgba(14, 10, 24, 0.94)',
    },
    pending: {
      Icon: Loader,
      accent: '#8B5CF6',
      iconColor: '#C4B5FD',
      iconBg: 'rgba(139,92,246,0.18)',
      border: 'rgba(139,92,246,0.4)',
      bg: 'rgba(14, 10, 24, 0.94)',
    },
  },
});

export const {
  GradientButton, SecondaryButton, Card, SectionLabel, IconBox,
  StatusPill, GradientPill, TopTabs, SearchField, Toast,
  KpiTile, EmptyState, LoadingBox,
} = kit;
