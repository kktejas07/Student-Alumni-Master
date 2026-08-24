/**
 * PredictionTimeline.tsx
 *
 * Single unified Career Growth Prediction line chart + Prediction Insight card.
 * Matches Image 1 reference design.
 */
import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
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
    <View className="bg-bg2 border border-glass-border rounded-xl p-4 gap-4">
      <View style={{ marginBottom: 4 }}>
        <Text className="text-xs font-body-bold tracking-widest uppercase" style={{ color: 'rgba(238,240,255,0.45)' }}>CAREER GROWTH PREDICTION</Text>
      </View>

      <View className="gap-4" style={{ flexDirection: Platform.OS === 'web' ? ('row' as any) : 'column', alignItems: 'stretch' }}>
        <View className="flex-[3] relative" style={{ minHeight: 160, justifyContent: 'flex-end' }}>
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
            <Line x1="20" y1="145" x2="460" y2="145" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <Line x1="20" y1="90" x2="460" y2="90" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
            <Line x1="20" y1="35" x2="460" y2="35" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
            <Path d={areaD} fill="url(#areaGrad)" />
            <Path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="3" />
            {points.map((p, i) => (
              <React.Fragment key={i}>
                <Circle cx={p.x} cy={p.y} r={5} fill="#A5B4FC" stroke="#18162A" strokeWidth="2" />
              </React.Fragment>
            ))}
          </Svg>

          <View className="absolute inset-0" style={{ pointerEvents: 'none' as any }}>
            {points.map((p, i) => (
              <View key={i} className="absolute items-center" style={{ left: `${(p.x / 480) * 100}%`, width: 80, marginLeft: -40, height: '100%' as any }}>
                <Text className="text-white font-body-bold text-sm" style={{ marginTop: 8 }}>{p.score}%</Text>
                <Text className="font-body-semibold text-xs" style={{ color: COLORS.text2, position: 'absolute', bottom: 8, width: '100%', textAlign: 'center' }} numberOfLines={1}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="flex-1 rounded-xl p-3 gap-3" style={{ backgroundColor: 'rgba(67, 56, 202, 0.12)', borderColor: 'rgba(129, 140, 248, 0.25)', borderWidth: 1, justifyContent: 'space-between', minWidth: 220 }}>
          <Text className="text-white font-body-bold text-lg">Prediction Insight</Text>
          <Text className="text-sm" style={{ color: COLORS.text2, fontFamily: FONT_FAMILIES.med, lineHeight: 19 }}>
            You're on the right track! Consistent action can take you from <Text style={{ color: COLORS.purpleL, fontFamily: FONT_FAMILIES.bold }}>{current}%</Text> to <Text style={{ color: COLORS.purpleL, fontFamily: FONT_FAMILIES.bold }}>{p180}%</Text> readiness in 18 weeks.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="rounded-xl items-center justify-center"
            style={({ pressed, hovered }: any) => ({
              backgroundColor: (pressed || hovered) ? 'rgba(129, 140, 248, 0.25)' : 'rgba(129, 140, 248, 0.15)',
              borderColor: 'rgba(129, 140, 248, 0.35)',
              borderWidth: 1,
              paddingVertical: 10,
              paddingHorizontal: 14,
            })}
          >
            <Text className="font-body-bold text-sm" style={{ color: COLORS.purpleL }}>View Full Analysis</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
