/**
 * Super Admin — Analytics period controls + previous-period comparison.
 *
 * The toolbar picks a date window (7d / 30d / 90d / YTD / custom) and toggles
 * the comparison overlay. The comparison card draws the selected window's daily
 * series on top of the immediately preceding window of equal length.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, Check, GitCompare, TrendingDown, TrendingUp } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Card } from '../applekit';

export type RangeKey = '7d' | '30d' | '90d' | 'ytd' | 'custom';

export type PeriodDaily = { date: string; signups: number; activity_events: number; revenue: number };
export type PeriodWindow = {
  signups: number; active_users: number; bookings: number; revenue: number;
  revenue_by_source: { label: string; value: number }[];
  daily: PeriodDaily[];
};
export type PeriodBlock = {
  range: { key: RangeKey; label: string; start: string; end: string; days: number; previous_start: string; previous_end: string };
  current: PeriodWindow;
  previous: PeriodWindow;
  delta_pct: { signups: number | null; active_users: number | null; bookings: number | null; revenue: number | null };
  previous_label: string;
};

export const RANGE_PRESETS: { id: RangeKey; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
  { id: 'custom', label: 'Custom' },
];

export const EMPTY_PERIOD: PeriodBlock = {
  range: { key: '30d', label: 'Last 30 days', start: '', end: '', days: 30, previous_start: '', previous_end: '' },
  current: { signups: 0, active_users: 0, bookings: 0, revenue: 0, revenue_by_source: [], daily: [] },
  previous: { signups: 0, active_users: 0, bookings: 0, revenue: 0, revenue_by_source: [], daily: [] },
  delta_pct: { signups: null, active_users: null, bookings: null, revenue: null },
  previous_label: '',
};

export function formatDelta(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return 'no prior data';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

export function deltaKind(pct: number | null | undefined): 'success' | 'danger' | 'neutral' {
  if (pct === null || pct === undefined) return 'neutral';
  return pct >= 0 ? 'success' : 'danger';
}

/** Range picker + compare toggle. Custom dates are applied explicitly. */
export function PeriodToolbar({
  range, start, end, compare, onChange,
}: {
  range: RangeKey; start: string; end: string; compare: boolean;
  onChange: (next: { range: RangeKey; start: string; end: string; compare: boolean }) => void;
}) {
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);

  const pick = (id: RangeKey) => {
    if (id === 'custom') {
      onChange({ range: 'custom', start: draftStart || start, end: draftEnd || end, compare });
      return;
    }
    onChange({ range: id, start: '', end: '', compare });
  };

  const applyCustom = () => onChange({ range: 'custom', start: draftStart, end: draftEnd, compare });

  const dateInput = (value: string, onV: (v: string) => void, label: string) => (
    Platform.OS === 'web' ? (
      // @ts-ignore native input
      <input
        type="date"
        value={value}
        onChange={(e: any) => onV(e.target.value)}
        style={s.dateInput}
      />
    ) : (
      <TextInput
        value={value}
        onChangeText={onV}
        placeholder={label}
        placeholderTextColor={SAC.dim}
        style={[s.dateInput, { marginTop: 0 }]}
      />
    )
  );

  return (
    <Card style={{ padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <CalendarDays size={15} color="#A78BFA" />
          {RANGE_PRESETS.map((p) => {
            const active = range === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => pick(p.id)}
                accessibilityRole="button"
                accessibilityLabel={`Date range ${p.label}`}
                style={[s.pill, active && s.pillActive]}
              >
                {active && (
                  <LinearGradient colors={['#FB923C', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.pillGrad}>
                    <Text style={s.pillActiveText}>{p.label}</Text>
                  </LinearGradient>
                )}
                {!active && <Text style={s.pillText}>{p.label}</Text>}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => onChange({ range, start, end, compare: !compare })}
          accessibilityRole="switch"
          accessibilityState={{ checked: compare }}
          accessibilityLabel="Compare with previous period"
          style={[s.compareBtn, compare && s.compareBtnOn]}
        >
          <GitCompare size={13} color={compare ? '#fff' : SAC.muted} />
          <Text style={[s.compareText, compare && { color: '#fff' }]}>
            {compare ? 'Comparing on' : 'Compare previous period'}
          </Text>
          {compare && <Check size={13} color="#fff" />}
        </Pressable>
      </View>

      {range === 'custom' && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <View style={{ gap: 4 }}>
            <Text style={s.fieldLabel}>FROM</Text>
            {dateInput(draftStart, setDraftStart, 'YYYY-MM-DD')}
          </View>
          <View style={{ gap: 4 }}>
            <Text style={s.fieldLabel}>TO</Text>
            {dateInput(draftEnd, setDraftEnd, 'YYYY-MM-DD')}
          </View>
          <Pressable onPress={applyCustom} style={s.applyBtn}>
            <Text style={s.applyText}>Apply range</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

/**
 * Current window vs previous window — a KPI delta strip plus an overlaid
 * daily series so the two periods can be read against each other.
 */
export function PeriodComparisonCard({
  period, compare, metric,
}: {
  period: PeriodBlock; compare: boolean;
  metric: 'signups' | 'revenue' | 'activity_events';
}) {
  const metricLabel = metric === 'signups' ? 'Signups' : metric === 'revenue' ? 'Revenue' : 'Activity events';
  const isCurrency = metric === 'revenue';

  const current = period.current.daily;
  const previous = period.previous.daily;

  const totals = useMemo(() => ({
    current: current.reduce((s, d) => s + (d[metric] as number), 0),
    previous: previous.reduce((s, d) => s + (d[metric] as number), 0),
  }), [current, previous, metric]);

  const maxVal = Math.max(
    ...current.map((d) => d[metric] as number),
    ...previous.map((d) => d[metric] as number),
    1,
  );

  const display = (v: number) => {
    if (!isCurrency) return String(Math.round(v));
    return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${Math.round(v).toLocaleString('en-IN')}`;
  };

  const deltaPct = period.delta_pct[metric === 'activity_events' ? 'signups' : metric];

  const length = Math.max(current.length, previous.length);
  const rows = Array.from({ length }, (_, i) => ({
    current: current[i]?.[metric] as number ?? 0,
    previous: previous[i]?.[metric] as number ?? 0,
    date: current[i]?.date || previous[i]?.date || '',
  }));

  return (
    <Card style={{ padding: 20, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <GitCompare size={16} color="#A78BFA" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: T.text }}>Period Comparison</Text>
        </View>
        <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>
          {period.range.label} · vs {period.previous_label || 'previous period'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 130, padding: 10, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.08)' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#A78BFA' }}>{display(totals.current)}</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>{metricLabel} · current</Text>
        </View>
        <View style={{ flex: 1, minWidth: 130, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>{display(totals.previous)}</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>{metricLabel} · previous</Text>
        </View>
        <View style={{ flex: 1, minWidth: 130, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {deltaKind(deltaPct) === 'danger'
              ? <TrendingDown size={14} color="#EF4444" />
              : <TrendingUp size={14} color={deltaKind(deltaPct) === 'success' ? '#22C55E' : SAC.muted} />}
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: deltaKind(deltaPct) === 'success' ? '#22C55E' : deltaKind(deltaPct) === 'danger' ? '#EF4444' : SAC.muted }}>
              {formatDelta(deltaPct)}
            </Text>
          </View>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Change vs previous</Text>
        </View>
      </View>

      {/* Overlaid daily series — previous period drawn behind the current one */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 120, paddingTop: 8 }}>
        {rows.map((r, i) => (
          <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
            {compare && (
              <View
                style={{
                  position: 'absolute', bottom: 0, width: '80%',
                  height: `${(r.previous / maxVal) * 100}%`,
                  borderRadius: 3,
                  borderWidth: 1,
                  borderColor: 'rgba(167,139,250,0.45)',
                  backgroundColor: 'rgba(167,139,250,0.12)',
                }}
              />
            )}
            <View
              style={{
                width: '80%',
                height: `${(r.current / maxVal) * 100}%`,
                borderRadius: 3,
                backgroundColor: compare ? 'rgba(251,146,60,0.55)' : '#FB923C',
              }}
            />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#FB923C' }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Current period</Text>
        </View>
        {compare && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(167,139,250,0.6)', backgroundColor: 'rgba(167,139,250,0.15)' }} />
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Previous period</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  pill: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: SAC.border },
  pillActive: { borderColor: 'transparent' },
  pillGrad: { paddingHorizontal: 12, paddingVertical: 6 },
  pillActiveText: { fontFamily: FONTS.bold, fontSize: 11, color: '#fff' },
  pillText: { fontFamily: FONTS.med, fontSize: 11, color: SAC.muted, paddingHorizontal: 12, paddingVertical: 6 },
  compareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  compareBtnOn: { backgroundColor: 'rgba(167,139,250,0.35)', borderColor: 'rgba(167,139,250,0.5)' },
  compareText: { fontFamily: FONTS.med, fontSize: 11, color: SAC.muted },
  fieldLabel: { fontFamily: FONTS.semi, fontSize: 9, color: SAC.dim, letterSpacing: 0.5 },
  dateInput: {
    color: '#F4F4FA',
    backgroundColor: SAC.cardSolid,
    borderWidth: 1,
    borderColor: SAC.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    minWidth: 140,
  },
  applyBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8,
    backgroundColor: 'rgba(251,146,60,0.9)',
  },
  applyText: { fontFamily: FONTS.bold, fontSize: 11, color: '#1A1205' },
});
