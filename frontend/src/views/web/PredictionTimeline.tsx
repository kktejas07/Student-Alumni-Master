/**
 * PredictionTimeline.tsx
 *
 * Career Growth Prediction line chart + Prediction Insight card.
 *
 * Renders only what the skill-intelligence service actually computed
 * (7d / 30d / 90d projections). No default scores: when predictions have
 * not been computed yet, the card shows an empty state instead of a
 * fabricated curve.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Line } from 'react-native-svg';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';

interface Predictions {
  current?: number;
  predictions?: {
    '7d'?: { score: number; gain: number };
    '30d'?: { score: number; gain: number };
    '90d'?: { score: number; gain: number };
  };
}

interface Point {
  label: string;
  score: number;
  x: number;
  y: number;
}

const CHART = { left: 36, right: 444, top: 30, bottom: 140 };

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Map a 0–100 readiness score to SVG y coordinates (higher score = higher). */
const yFor = (score: number): number => {
  const clamped = Math.min(100, Math.max(0, score));
  return CHART.bottom - (clamped / 100) * (CHART.bottom - CHART.top);
};

/** Catmull-Rom → cubic Bézier smoothing through the given points. */
function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function PredictionTimeline({ data }: { data?: Predictions }) {
  const current = num(data?.current);

  const slots = (
    [
      { label: '7 Days', v: num(data?.predictions?.['7d']?.score) },
      { label: '30 Days', v: num(data?.predictions?.['30d']?.score) },
      { label: '90 Days', v: num(data?.predictions?.['90d']?.score) },
    ] as Array<{ label: string; v: number | null }>
  ).filter((p): p is { label: string; v: number } => p.v != null);

  const hasData = current != null && slots.length > 0;

  // Evenly space points across the plot width; y comes from the actual scores.
  const step = slots.length > 0 ? (CHART.right - CHART.left) / (slots.length + 1) : 0;
  const points: Point[] = hasData
    ? [
        { label: 'Today', score: current, x: CHART.left, y: yFor(current) },
        ...slots.map((p, i) => ({
          label: p.label,
          score: p.v,
          x: Math.round(CHART.left + (i + 1) * step),
          y: yFor(p.v),
        })),
      ]
    : [];

  const pathD = smoothPath(points);
  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x} ${CHART.bottom} L ${points[0].x} ${CHART.bottom} Z`
      : '';

  const last = points[points.length - 1];

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>CAREER GROWTH PREDICTION</Text>
      </View>

      {hasData ? (
        <>
          {/* Main Content Split: Chart (Left 75%) + Insight Card (Right 25%) */}
          <View style={s.body}>
            {/* Left Chart Area */}
            <View style={s.chartArea}>
              <Svg width="100%" height={160} viewBox="0 0 480 160" preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#818CF8" />
                    <Stop offset="50%" stopColor="#6366F1" />
                    <Stop offset="100%" stopColor="#A5B4FC" />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} />
                    <Stop offset="100%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </SvgLinearGradient>
                </Defs>

                {/* Grid Lines */}
                <Line x1="20" y1="145" x2="460" y2="145" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <Line x1="20" y1="90" x2="460" y2="90" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
                <Line x1="20" y1="35" x2="460" y2="35" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />

                {/* Area Fill */}
                {areaD ? <Path d={areaD} fill="url(#areaGrad)" /> : null}

                {/* Main Curve Line */}
                {pathD ? <Path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="3" /> : null}

                {/* Dots */}
                {points.map((p, i) => (
                  <Circle key={i} cx={p.x} cy={p.y} r={5} fill="#A5B4FC" stroke="#18162A" strokeWidth="2" />
                ))}
              </Svg>

              <View style={s.overlayLabels}>
                {points.map((p, i) => (
                  <View key={i} style={[s.pointCol, { left: `${(p.x / 480) * 100}%` }]}>
                    <Text style={s.scoreText}>{Math.round(p.score)}%</Text>
                    <Text style={s.labelText} numberOfLines={1}>{p.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Right Insight Card */}
            <View style={s.insightCard}>
              <Text style={s.insightTitle}>Prediction Insight</Text>
              <Text style={s.insightDesc}>
                Projected growth from <Text style={s.boldVal}>{Math.round(current)}%</Text> readiness to{' '}
                <Text style={s.boldVal}>{Math.round(last.score)}%</Text> {last.label.toLowerCase()}.
              </Text>
              <Pressable
                accessibilityRole="button"
                style={({ pressed, hovered }: any) => [
                  s.insightBtn,
                  (pressed || hovered) && s.insightBtnHover,
                ]}
              >
                <Text style={s.insightBtnText}>View Full Analysis</Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : (
        /* Empty state — the service has not produced predictions yet */
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No predictions yet</Text>
          <Text style={s.emptyBody}>Predictions appear after your first readiness score</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#0A0A2A',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.lg,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(0,0,0,0.35)' } as any : {}),
  },
  header: {
    marginBottom: 4,
  },
  title: {
    color: 'rgba(238,240,255,0.45)',
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.lg,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as any,
  },
  body: {
    flexDirection: Platform.OS === 'web' ? ('row' as any) : 'column',
    gap: SPACING.xl,
    alignItems: 'stretch',
  },
  chartArea: {
    flex: 3,
    position: 'relative',
    minHeight: 160,
    justifyContent: 'flex-end',
  },
  overlayLabels: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    pointerEvents: 'none' as any,
  },
  pointCol: {
    position: 'absolute',
    alignItems: 'center',
    width: 80,
    marginLeft: -40,
    height: '100%' as any,
  },
  scoreText: {
    color: '#FFF',
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 13,
    marginTop: 8,
  },
  labelText: {
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.med,
    fontSize: 12,
    position: 'absolute',
    bottom: 8,
    width: '100%',
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.huge ?? 64,
    gap: SPACING.xs,
  },
  emptyTitle: {
    color: '#FFF',
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.md,
  },
  emptyBody: {
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.med,
    fontSize: 13,
  },
  insightCard: {
    flex: 1,
    backgroundColor: 'rgba(67, 56, 202, 0.12)',
    borderColor: 'rgba(129, 140, 248, 0.25)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    justifyContent: 'space-between',
    gap: SPACING.md,
    minWidth: 220,
  },
  insightTitle: {
    color: '#FFF',
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.lg,
  },
  insightDesc: {
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.med,
    fontSize: 13,
    lineHeight: 19,
  },
  boldVal: {
    color: COLORS.purpleL,
    fontFamily: FONT_FAMILIES.bold,
  },
  insightBtn: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderColor: 'rgba(129, 140, 248, 0.35)',
    borderWidth: 1,
    borderRadius: RADIUS.btn,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBtnHover: {
    backgroundColor: 'rgba(129, 140, 248, 0.25)',
  },
  insightBtnText: {
    color: COLORS.purpleL,
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 13,
  },
});
