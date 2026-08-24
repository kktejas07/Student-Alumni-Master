/**
 * Lightweight chart primitives using react-native-svg (no extra deps).
 * Used in the analytics dashboard. All charts respect the SA brand palette.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Line, G, Text as SvgText, Defs, LinearGradient as SvgLG, Stop } from 'react-native-svg';
import { Colors as C, Typography, Spacing, Radius, Shadows } from '@/src/theme';

// ---------------------------------------------------------------------------
// KPI card (number + label + optional trend)
// ---------------------------------------------------------------------------
export function KpiCard({ label, value, suffix, trend, accent = C.brandPurple, testID }: {
  label: string; value: number | string; suffix?: string; trend?: number; accent?: string; testID?: string;
}) {
  return (
    <View style={[styles.kpi, { borderLeftColor: accent }]} testID={testID}>
      <Text style={styles.kpiLabel}>{label.toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={[styles.kpiValue, { color: accent }]}>{value}</Text>
        {suffix && <Text style={styles.kpiSuffix}>{suffix}</Text>}
      </View>
      {typeof trend === 'number' && (
        <Text style={[styles.kpiTrend, { color: trend >= 0 ? '#0F9D58' : C.danger }]}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Line chart (smooth) — for time-series like growth, weekly bookings
// ---------------------------------------------------------------------------
export function LineChart({ data, height = 140, color = C.brandPurple }: {
  data: Array<{ label?: string; value: number }>; height?: number; color?: string;
}) {
  const padding = 16;
  const W = 320;  // logical width; SVG scales via viewBox
  const H = height;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const stepX = (W - padding * 2) / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({
    x: padding + i * stepX,
    y: H - padding - (d.value / maxV) * (H - padding * 2),
  }));
  // Simple smooth curve via cubic Bezier
  const path = points.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }, '');
  const fillPath = `${path} L${points[points.length - 1].x},${H - padding} L${padding},${H - padding} Z`;

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <SvgLG id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.25" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgLG>
      </Defs>
      {/* Grid baseline */}
      <Line x1={padding} y1={H - padding} x2={W - padding} y2={H - padding}
        stroke={C.border} strokeWidth="1" />
      {/* Filled area */}
      <Path d={fillPath} fill="url(#lineFill)" />
      {/* Line */}
      <Path d={path} stroke={color} strokeWidth="2.5" fill="none" />
      {/* Points */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Bar chart (vertical) — for distributions
// ---------------------------------------------------------------------------
export function BarChart({ data, height = 160, color = C.brandPurple }: {
  data: Array<{ label: string; value: number }>; height?: number; color?: string;
}) {
  const padding = 24;
  const W = 320;
  const H = height;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const barW = (W - padding * 2) / data.length - 8;
  return (
    <Svg width="100%" height={H + 22} viewBox={`0 0 ${W} ${H + 22}`}>
      {data.map((d, i) => {
        const barH = (d.value / maxV) * (H - padding * 2);
        const x = padding + i * ((W - padding * 2) / data.length) + 4;
        const y = H - padding - barH;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} rx={6}
              fill={color} opacity={0.9 - (i * 0.08)} />
            <SvgText x={x + barW / 2} y={y - 6} fontSize="10"
              textAnchor="middle" fill={C.textPrimary}
              fontWeight="600" fontFamily="DMSans_600SemiBold">
              {d.value}
            </SvgText>
            <SvgText x={x + barW / 2} y={H - 6} fontSize="9"
              textAnchor="middle" fill={C.textSecondary} fontFamily="DMSans_500Medium">
              {d.label.length > 8 ? d.label.slice(0, 8) + '…' : d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Donut chart — for role distribution etc.
// ---------------------------------------------------------------------------
export function DonutChart({ data, size = 140, thickness = 22 }: {
  data: Array<{ label: string; value: number; color?: string }>; size?: number; thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const palette = [C.brandPurple, '#00A78E', '#F4A22C', '#3B82F6', '#EC4899', '#10B981', '#A855F7'];

  function arc(start: number, end: number, color: string) {
    const startAngle = (start / total) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (end / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = end - start > total / 2 ? 1 : 0;
    return (
      <Path
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
        stroke={color} strokeWidth={thickness} fill="none" strokeLinecap="butt"
      />
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={C.border} strokeWidth={thickness} fill="none" />
        {data.map((d, i) => {
          const node = arc(cumulative, cumulative + d.value, d.color || palette[i % palette.length]);
          cumulative += d.value;
          return <G key={i}>{node}</G>;
        })}
        <SvgText x={cx} y={cy - 4} fontSize="20" textAnchor="middle"
          fill={C.textPrimary} fontWeight="700" fontFamily="DMSans_700Bold">{total}</SvgText>
        <SvgText x={cx} y={cy + 14} fontSize="10" textAnchor="middle"
          fill={C.textSecondary} fontFamily="DMSans_500Medium">TOTAL</SvgText>
      </Svg>
      <View style={{ flex: 1, gap: 6 }}>
        {data.map((d, i) => (
          <View key={d.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5,
              backgroundColor: d.color || palette[i % palette.length] }} />
            <Text style={[Typography.bodySm, { flex: 1 }]} numberOfLines={1}>{d.label}</Text>
            <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------
export function ChartSection({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={{ marginBottom: 12 }}>
        <Text style={[Typography.h4, { color: C.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 2 }]}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  kpi: {
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    padding: 14,
    borderLeftWidth: 4,
    minWidth: 150,
    flex: 1,
    ...Shadows.sm,
  },
  kpiLabel: {
    ...Typography.label,
    color: C.textSecondary,
    fontSize: 9,
    marginBottom: 4,
  },
  kpiValue: { ...Typography.h2, fontSize: 24, lineHeight: 28 },
  kpiSuffix: { ...Typography.bodySm, color: C.textSecondary },
  kpiTrend: { ...Typography.bodySm, fontFamily: 'DMSans_600SemiBold', fontSize: 11, marginTop: 4 },
  section: {
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
});
