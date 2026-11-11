// @ts-nocheck
/**
 * Revenue analytics dashboard (PY4).
 *
 * Date-ranged revenue reporting: trend (daily/monthly), revenue by source,
 * top events by revenue, and KPIs with delta % against the previous period.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Platform,
} from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';
import {
  TrendingUp, Wallet, Receipt, Percent, RefreshCw, Calendar,
  Layers, ChevronDown,
} from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors, pristineOf } from '../tokens';
import {
  GRAD, Card, IconBox, StatusPill, GradientButton, SecondaryButton,
  SectionLabel, useToast, Toast,
} from '../applekit';
import { request } from '@/src/models/services/api';

type TrendPoint = { label: string; value: number };

type RevenueData = {
  ok: boolean;
  range: { preset: string; from: string; to: string; days: number };
  kpi: {
    gross: number; transactions: number; avg_order: number;
    refunds: number; refund_count: number; net: number;
  };
  previous: {
    gross: number; transactions: number; avg_order: number;
    refunds: number; net: number;
  };
  delta: {
    gross_pct: number | null; transactions_pct: number | null;
    avg_order_pct: number | null; net_pct: number | null;
    refunds_pct: number | null;
  };
  trend: TrendPoint[];
  previous_trend: TrendPoint[];
  by_source: { label: string; value: number; count: number }[];
  top_events: { slug: string; title: string; revenue: number; count: number }[];
};

const RANGES: { id: string; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
  { id: 'custom', label: 'Custom' },
];

const money = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const money2 = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function deltaLabel(pct: number | null): { text: string; kind: 'success' | 'danger' | 'neutral' } {
  if (pct === null || pct === undefined) return { text: 'no prior data', kind: 'neutral' };
  const up = pct >= 0;
  return {
    text: `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`,
    kind: up ? 'success' : 'danger',
  };
}

/* ── Trend chart with optional previous-period overlay ───────────── */
function TrendChart({
  current, previous, compare, accent,
}: {
  current: TrendPoint[]; previous: TrendPoint[]; compare: boolean; accent: string;
}) {
  const W = 720;
  const H = 240;
  const padL = 54;
  const padR = 16;
  const padT = 16;
  const padB = 30;

  const n = Math.max(current.length, 1);
  const max = Math.max(
    ...current.map((p) => p.value),
    ...(compare ? previous.map((p) => p.value) : [0]),
    1,
  );

  const x = (i) => padL + (i * (W - padL - padR)) / Math.max(n - 1, 1);
  const y = (v) => H - padB - (v / max) * (H - padT - padB);

  const curPts = current.map((p, i) => [x(i), y(p.value)] as [number, number]);
  const prevPts = previous.map((p, i) => [x(i), y(p.value)] as [number, number]);

  const poly = curPts.map((p) => `${p[0]},${p[1]}`).join(' ');
  const area = curPts.length
    ? `${padL},${H - padB} ${poly} ${W - padR},${H - padB}`
    : '';
  const prevPoly = prevPts.map((p) => `${p[0]},${p[1]}`).join(' ');

  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: H - padB - f * (H - padT - padB),
    label: money(max * f),
  }));

  // Label every Nth x-axis point so ticks don't overlap.
  const tickEvery = Math.max(1, Math.ceil(n / 8));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {grid.map((g, i) => (
          <React.Fragment key={`g${i}`}>
            <Line
              x1={padL} y1={g.y} x2={W - padR} y2={g.y}
              stroke={SAC.border} strokeWidth={1} strokeDasharray="3 5"
            />
            <SvgText
              x={padL - 8} y={g.y + 3.5} textAnchor="end"
              fill={SAC.dim} fontSize={9}
            >
              {g.label}
            </SvgText>
          </React.Fragment>
        ))}

        {current.length > 0 && (
          <>
            <Path d={`M ${area} Z`} fill="rgba(245,158,11,0.12)" />
            {compare && previous.length > 1 && (
              <Polyline
                points={prevPoly} fill="none" stroke={SAC.dim}
                strokeWidth={1.6} strokeDasharray="4 4"
                strokeLinecap="round" strokeLinejoin="round"
              />
            )}
            <Polyline
              points={poly} fill="none" stroke={accent}
              strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
            />
            {curPts.map((p, i) => (
              <Circle key={`c${i}`} cx={p[0]} cy={p[1]} r={2.4} fill={accent} />
            ))}
          </>
        )}

        {current.length === 0 && (
          <SvgText x={W / 2} y={H / 2} textAnchor="middle" fill={SAC.dim} fontSize={12}>
            No revenue recorded in this window
          </SvgText>
        )}

        {current.map((p, i) =>
          i % tickEvery === 0 ? (
            <SvgText
              key={`t${i}`} x={x(i)} y={H - 10} textAnchor="middle"
              fill={SAC.dim} fontSize={9}
            >
              {p.label}
            </SvgText>
          ) : null
        )}
      </Svg>
    </ScrollView>
  );
}

/* ── Horizontal bar for revenue by source ───────────────────────── */
function SourceBars({ rows, accent }: { rows: RevenueData['by_source']; accent: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 6 }}>
          <View style={ra.srcHead}>
            <Text style={ra.srcLabel}>{r.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={ra.srcCount}>{r.count} txns</Text>
              <Text style={ra.srcValue}>{money2(r.value)}</Text>
            </View>
          </View>
          <View style={ra.barTrack}>
            <View
              style={[
                ra.barFill,
                {
                  width: `${Math.max((r.value / max) * 100, 2)}%`,
                  backgroundColor: accent,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/* ── Main panel ─────────────────────────────────────────────────── */
export function RevenueAnalytics() {
  const T = useSAC();
  Object.assign(ra, resolveColors(pristineOf(ra), T));
  const { toast, flash, hide } = useToast();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [compare, setCompare] = useState(false);

  const load = useCallback(async (preset: string, frm?: string, toDate?: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ range: preset });
      if (preset === 'custom') {
        if (frm) qs.set('from', frm);
        if (toDate) qs.set('to', toDate);
      }
      const res: any = await request<any>(`/admin/revenue/analytics?${qs.toString()}`, {
        method: 'GET',
        auth: true,
      });
      setData(res);
    } catch (e: any) {
      flash(e?.message || 'Failed to load revenue analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range]);

  const applyCustom = () => {
    setShowPicker(false);
    load('custom', from.trim(), to.trim());
  };

  const accent = GRAD.to;

  const kpi = data?.kpi;
  const delta = data?.delta;

  return (
    <Card>
      <View style={ra.headRow}>
        <IconBox size={38}><TrendingUp size={18} color={GRAD.to} /></IconBox>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={ra.title}>Revenue Analytics</Text>
          <Text style={ra.sub}>
            Monthly trend, revenue by source and top events — with delta % against the previous period.
          </Text>
        </View>
        <SecondaryButton onPress={() => load(range, from, to)}>
          <RefreshCw size={12} color={SAC.muted} />
          <Text style={ra.secText}>Refresh</Text>
        </SecondaryButton>
      </View>

      {/* Range picker */}
      <View style={ra.rangeRow}>
        <View style={ra.rangeSeg}>
          {RANGES.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setRange(r.id)}
              style={[ra.rangeBtn, range === r.id && ra.rangeActive]}
            >
              <Text style={[ra.rangeText, range === r.id && ra.rangeTextActive]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setShowPicker((v) => !v)}
          style={ra.dateBtn}
        >
          <Calendar size={12} color={SAC.muted} />
          <Text style={ra.dateBtnText}>
            {range === 'custom' && from
              ? `${from} → ${to || 'today'}`
              : `${data?.range?.from || ''} → ${data?.range?.to || ''}`}
          </Text>
          <ChevronDown size={12} color={SAC.muted} />
        </Pressable>

        <Pressable
          onPress={() => setCompare((v) => !v)}
          style={[ra.compareBtn, compare && ra.compareActive]}
        >
          <Layers size={12} color={compare ? GRAD.to : SAC.muted} />
          <Text style={[ra.compareText, compare && { color: GRAD.to }]}>Compare</Text>
        </Pressable>
      </View>

      {showPicker && (
        <View style={ra.picker}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={ra.pickerLabel}>From (YYYY-MM-DD)</Text>
              <TextInput
                value={from}
                onChangeText={setFrom}
                placeholder="2026-01-01"
                placeholderTextColor={SAC.dim}
                autoCapitalize="none"
                style={ra.input}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={ra.pickerLabel}>To (YYYY-MM-DD)</Text>
              <TextInput
                value={to}
                onChangeText={setTo}
                placeholder="2026-11-01"
                placeholderTextColor={SAC.dim}
                autoCapitalize="none"
                style={ra.input}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <SecondaryButton onPress={() => { setShowPicker(false); setRange('30d'); }} style={{ flex: 1 }}>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
            </SecondaryButton>
            <GradientButton onPress={applyCustom} style={{ flex: 1 }}>
              <Calendar size={13} color="#fff" />
              <Text style={{ color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12 }}>Apply</Text>
            </GradientButton>
          </View>
        </View>
      )}

      {loading && !data && (
        <View style={ra.loadingBox}>
          <ActivityIndicator color={GRAD.to} />
          <Text style={ra.loadingText}>Loading revenue…</Text>
        </View>
      )}

      {kpi && (
        <>
          {/* KPI row */}
          <View style={ra.kpiRow}>
            <Kpi
              label="Gross revenue" value={money2(kpi.gross)}
              delta={deltaLabel(delta?.gross_pct)} icon={Wallet}
            />
            <Kpi
              label="Net revenue" value={money2(kpi.net)}
              delta={deltaLabel(delta?.net_pct)} icon={TrendingUp}
            />
            <Kpi
              label="Transactions" value={String(kpi.transactions)}
              delta={deltaLabel(delta?.transactions_pct)} icon={Receipt}
            />
            <Kpi
              label="Avg order" value={money2(kpi.avg_order)}
              delta={deltaLabel(delta?.avg_order_pct)} icon={Percent}
            />
          </View>

          <View style={ra.refundRow}>
            <StatusPill kind={kpi.refunds > 0 ? 'warn' : 'neutral'} label={`${kpi.refund_count} refunds`} />
            <Text style={ra.refundText}>
              Refunded {money2(kpi.refunds)} in this window
              {compare && delta?.refunds_pct !== null && delta?.refunds_pct !== undefined
                ? ` · ${deltaLabel(delta.refunds_pct).text} vs previous`
                : ''}
            </Text>
          </View>

          {/* Trend */}
          <View style={ra.section}>
            <View style={ra.sectionHead}>
              <SectionLabel>Revenue trend</SectionLabel>
              {compare && (
                <View style={ra.legend}>
                  <View style={[ra.legendDot, { backgroundColor: accent }]} />
                  <Text style={ra.legendText}>Current</Text>
                  <View style={[ra.legendDot, { backgroundColor: SAC.dim }]} />
                  <Text style={ra.legendText}>Previous</Text>
                </View>
              )}
            </View>
            <TrendChart
              current={data?.trend || []}
              previous={data?.previous_trend || []}
              compare={compare}
              accent={accent}
            />
          </View>

          {/* By source */}
          <View style={ra.section}>
            <SectionLabel>Revenue by source</SectionLabel>
            {(data?.by_source || []).length === 0 ? (
              <Text style={ra.emptyText}>No revenue recorded in this window.</Text>
            ) : (
              <SourceBars rows={data!.by_source} accent={accent} />
            )}
          </View>

          {/* Top events */}
          <View style={ra.section}>
            <SectionLabel>Top events</SectionLabel>
            {(data?.top_events || []).length === 0 ? (
              <Text style={ra.emptyText}>No event revenue recorded in this window.</Text>
            ) : (
              data!.top_events.map((e, i) => (
                <View key={e.slug || i} style={ra.eventRow}>
                  <View style={ra.eventRank}>
                    <Text style={ra.eventRankText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={ra.eventTitle}>{e.title}</Text>
                    <Text numberOfLines={1} style={ra.eventMeta}>
                      {e.slug} · {e.count} registrations
                    </Text>
                  </View>
                  <Text style={ra.eventRevenue}>{money2(e.revenue)}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </Card>
  );
}

/* Small KPI card (local, since KpiTile has no value/delta layout control) */
function Kpi({ label, value, delta, icon: Icon }: any) {
  const d = delta || { text: '', kind: 'neutral' };
  const color = d.kind === 'success' ? '#34D399' : d.kind === 'danger' ? '#F87171' : SAC.dim;
  return (
    <View style={ra.kpiCard}>
      <IconBox><Icon size={16} color={GRAD.to} /></IconBox>
      <Text style={ra.kpiLabel}>{label}</Text>
      <Text style={ra.kpiValue} numberOfLines={1}>{value}</Text>
      <Text style={[ra.kpiDelta, { color }]}>{d.text}</Text>
    </View>
  );
}

const ra = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 15 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4, lineHeight: 17, maxWidth: 640 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  rangeSeg: { flexDirection: 'row', gap: 4, backgroundColor: '#0f172a', borderWidth: 1, borderColor: SAC.border, borderRadius: 10, padding: 4 },
  rangeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  rangeActive: { backgroundColor: 'rgba(245,158,11,0.18)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' },
  rangeText: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 11.5 },
  rangeTextActive: { color: '#FCD34D' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  dateBtnText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  compareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  compareActive: { backgroundColor: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.4)' },
  compareText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  picker: { marginTop: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: SAC.border, borderRadius: 12, padding: 14 },
  pickerLabel: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { height: 38, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.06)', color: '#F4F4FA', fontFamily: FONTS.mono, fontSize: 12, paddingHorizontal: 11 },
  loadingBox: { alignItems: 'center', gap: 8, paddingVertical: 26 },
  loadingText: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 12 },
  kpiRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  kpiCard: { flexGrow: 1, flexBasis: 150, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: SAC.border, borderRadius: 12, padding: 13, gap: 4 },
  kpiLabel: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
  kpiValue: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 17 },
  kpiDelta: { fontFamily: FONTS.bold, fontSize: 10.5 },
  refundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  refundText: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11 },
  section: { marginTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10 },
  emptyText: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 12, paddingVertical: 10 },
  srcHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  srcLabel: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12.5 },
  srcCount: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 },
  srcValue: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 13 },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 999 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SAC.border },
  eventRank: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,158,11,0.14)' },
  eventRankText: { color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 11.5 },
  eventTitle: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12.5 },
  eventMeta: { color: SAC.dim, fontFamily: FONTS.mono, fontSize: 10, marginTop: 2 },
  eventRevenue: { color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 13 },
});
