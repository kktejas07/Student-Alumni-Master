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
import { View, Text, TextInput, Platform } from 'react-native';
import { Info, Loader, Search } from 'lucide-react-native';
import { createKit } from '../shared/kit';
import { SAC, useSAC, FONTS, resolveColors } from './tokens';
import { useTheme } from '@/src/theme/ThemeContext';

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
    strongText: SAC.text,
    onGradient: '#F4F4FA',
    searchInputText: SAC.text,
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
    Object.assign(sheet, resolveColors(sheet, T));
  },
});

const {
  GradientButton, SecondaryButton, Card, SectionLabel, IconBox,
  GradientPill, TopTabs, Toast, EmptyState, LoadingBox,
} = kit;

export {
  GradientButton, SecondaryButton, Card, SectionLabel, IconBox,
  GradientPill, TopTabs, Toast, EmptyState, LoadingBox,
};

export function SearchField({ value, onChange, placeholder = 'Search…', width = 260 }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number | string;
}) {
  const { isDark } = useTheme();
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: width as any,
      minWidth: 0,
      height: 36,
      paddingHorizontal: 11,
      borderRadius: 10,
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderColor: isDark ? '#1E293B' : '#E2E8F0',
      borderWidth: 1,
    }}>
      <Search size={13} color={isDark ? '#64748B' : '#94A3B8'} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
        style={[{
          flex: 1,
          minWidth: 0,
          color: isDark ? '#FFFFFF' : '#0F172A',
          fontFamily: FONTS.med,
          fontSize: 12,
        }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]}
      />
    </View>
  );
}

export function KpiTile({
  Icon,
  label,
  value,
  delta,
  deltaKind = 'success',
  hint,
}: {
  Icon: any;
  label: string;
  value: string | number;
  delta?: string;
  deltaKind?: 'success' | 'warn' | 'info' | 'danger' | 'brand' | 'neutral';
  hint?: string;
}) {
  const { isDark } = useTheme();
  const deltaColor = {
    success: isDark ? '#34D399' : '#047857',
    warn: isDark ? '#FCD34D' : '#92400E',
    info: isDark ? '#93C5FD' : '#1D4ED8',
    danger: isDark ? '#FDA4AF' : '#BE123C',
    brand: isDark ? '#C4B5FD' : '#5B21B6',
    neutral: isDark ? '#CBD5E1' : '#475569',
  }[deltaKind];

  return (
    <View style={{
      flex: 1,
      minWidth: 160,
      paddingVertical: 16,
      paddingHorizontal: 18,
      backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : '#FFFFFF',
      borderColor: isDark ? '#1E293B' : '#E2E8F0',
      borderWidth: 1,
      borderRadius: 14,
      gap: 10,
      ...(Platform.OS === 'web' ? ({ boxShadow: '0 1px 2px rgba(15,23,42,0.05)' } as any) : {}),
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB',
        }}>
          <Icon size={15} color={isDark ? '#FCD34D' : '#B45309'} />
        </View>
        <Text style={{
          color: isDark ? '#CBD5E1' : '#334155',
          fontFamily: FONTS.bold,
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>{label}</Text>
      </View>
      <Text style={{
        color: isDark ? '#FFFFFF' : '#0F172A',
        fontFamily: FONTS.xbold,
        fontSize: 26,
        letterSpacing: -0.5,
      }}>{value}</Text>
      {!!(delta || hint) && (
        <Text style={{
          color: delta ? deltaColor : (isDark ? '#34D399' : '#047857'),
          fontFamily: FONTS.bold,
          fontSize: 11,
          marginTop: -4,
        }}>{delta || hint}</Text>
      )}
    </View>
  );
}

export function StatusPill({ label, kind = 'neutral', dot = false }: {
  label: string;
  kind?: 'success' | 'warn' | 'info' | 'danger' | 'brand' | 'neutral';
  dot?: boolean;
}) {
  const { isDark } = useTheme();
  const palette = {
    success: {
      bg: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
      border: isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0',
      text: isDark ? '#6EE7B7' : '#047857',
    },
    warn: {
      bg: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB',
      border: isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A',
      text: isDark ? '#FCD34D' : '#92400E',
    },
    info: {
      bg: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
      border: isDark ? 'rgba(59,130,246,0.3)' : '#BFDBFE',
      text: isDark ? '#93C5FD' : '#1D4ED8',
    },
    danger: {
      bg: isDark ? 'rgba(239,68,68,0.15)' : '#FFF1F2',
      border: isDark ? 'rgba(239,68,68,0.3)' : '#FECDD3',
      text: isDark ? '#FCA5A5' : '#BE123C',
    },
    brand: {
      bg: isDark ? 'rgba(124,58,237,0.15)' : '#EEF2FF',
      border: isDark ? 'rgba(124,58,237,0.3)' : '#C7D2FE',
      text: isDark ? '#C4B5FD' : '#5B21B6',
    },
    neutral: {
      bg: isDark ? '#1E293B' : '#F1F5F9',
      border: isDark ? '#334155' : '#E2E8F0',
      text: isDark ? '#CBD5E1' : '#334155',
    },
  }[kind];
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 3.5,
      borderRadius: 999,
      borderWidth: 1,
      alignSelf: 'flex-start',
      backgroundColor: palette.bg,
      borderColor: palette.border,
    }}>
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.text }} />}
      <Text style={{
        color: palette.text,
        fontFamily: FONTS.xbold,
        fontSize: 10.5,
        letterSpacing: 0.3,
      }}>{label}</Text>
    </View>
  );
}
