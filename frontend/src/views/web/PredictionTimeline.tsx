/**
 * PredictionTimeline.tsx
 *
 * Single unified Career Growth Prediction line chart + Prediction Insight card.
 * Matches Image 1 reference design.
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
    '60d'?: { score: number; gain: number };
    '90d'?: { score: number; gain: number };
    '180d'?: { score: number; gain: number };
  };
}

export function PredictionTimeline({ data }: { data?: any }) {
  const current = Number(data?.current || 33);
  const p7 = Number(data?.predictions?.['7d']?.score || 40);
  const p30 = Number(data?.predictions?.['30d']?.score || 51);
  const p60 = Number(data?.predictions?.['60d']?.score || 65);
  const p90 = Number(data?.predictions?.['90d']?.score || 78);
  const p180 = Number(data?.predictions?.['180d']?.score || 92);

  const points = [
    { label: 'Today', score: current, x: 40, y: 110 },
    { label: '7 Days', score: p7, x: 120, y: 92 },
    { label: '30 Days', score: p30, x: 200, y: 72 },
    { label: '60 Days', score: p60, x: 280, y: 52 },
    { label: '90 Days', score: p90, x: 360, y: 34 },
    { label: '180 Days', score: p180, x: 440, y: 16 },
  ];

  // SVG Smooth Path d string
  const pathD = `M 40 110 C 80 102, 100 92, 120 92 C 160 84, 180 72, 200 72 C 240 60, 260 52, 280 52 C 320 42, 340 34, 360 34 C 400 24, 420 16, 440 16`;
  const areaD = `${pathD} L 440 145 L 40 145 Z`;

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>CAREER GROWTH PREDICTION</Text>
      </View>

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

            {/* Grid Line */}
            <Line x1="20" y1="145" x2="460" y2="145" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <Line x1="20" y1="90" x2="460" y2="90" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
            <Line x1="20" y1="35" x2="460" y2="35" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />

            {/* Area Fill */}
            <Path d={areaD} fill="url(#areaGrad)" />

            {/* Main Curve Line */}
            <Path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="3" />

            {/* Dots and Labels */}
            {points.map((p, i) => (
              <React.Fragment key={i}>
                <Circle cx={p.x} cy={p.y} r={5} fill="#A5B4FC" stroke="#18162A" strokeWidth="2" />
              </React.Fragment>
            ))}
          </Svg>

          <View style={s.overlayLabels}>
            {points.map((p, i) => (
              <View key={i} style={[s.pointCol, { left: `${(p.x / 480) * 100}%` }]}>
                <Text style={s.scoreText}>{p.score}%</Text>
                <Text style={s.labelText} numberOfLines={1}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Right Insight Card */}
        <View style={s.insightCard}>
          <Text style={s.insightTitle}>Prediction Insight</Text>
          <Text style={s.insightDesc}>
            You're on the right track! Consistent action can take you from <Text style={s.boldVal}>{current}%</Text> to <Text style={s.boldVal}>{p180}%</Text> readiness in 18 weeks.
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
    fontSize: 18,
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
    fontSize: 16,
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
