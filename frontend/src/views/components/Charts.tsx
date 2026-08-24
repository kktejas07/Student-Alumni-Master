import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Rect, Circle, Line, G, Text as SvgText, Defs, LinearGradient as SvgLG, Stop } from 'react-native-svg';
import { Colors as C, Typography, Spacing, Radius, Shadows } from '@/src/theme';

export function KpiCard({ label, value, suffix, trend, accent = C.brandPurple, testID }: {
  label: string; value: number | string; suffix?: string; trend?: number; accent?: string; testID?: string;
}) {
  return (
    <View className="bg-white/[0.04] rounded-lg p-3.5 min-w-[150px] flex-1" style={{ borderLeftWidth: 4, borderLeftColor: accent, ...Shadows.sm } as any} testID={testID}>
      <Text className="text-gray-500 text-[9px] mb-1" style={Typography.label}>{label.toUpperCase()}</Text>
      <View className="flex-row items-baseline gap-1">
        <Text className="font-display-bold text-[24px] leading-7" style={{ color: accent }}>{value}</Text>
        {suffix && <Text className="text-gray-500 text-sm" style={Typography.bodySm}>{suffix}</Text>}
      </View>
      {typeof trend === 'number' && (
        <Text className="text-sm mt-1 font-semibold text-[11px]" style={{ color: trend >= 0 ? '#0F9D58' : C.danger }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </Text>
      )}
    </View>
  );
}

export function LineChart({ data, height = 140, color = C.brandPurple }: {
  data: Array<{ label?: string; value: number }>; height?: number; color?: string;
}) {
  const padding = 16;
  const W = 320;
  const H = height;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const stepX = (W - padding * 2) / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({
    x: padding + i * stepX,
    y: H - padding - (d.value / maxV) * (H - padding * 2),
  }));
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
      <Line x1={padding} y1={H - padding} x2={W - padding} y2={H - padding}
        stroke={C.border} strokeWidth="1" />
      <Path d={fillPath} fill="url(#lineFill)" />
      <Path d={path} stroke={color} strokeWidth="2.5" fill="none" />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </Svg>
  );
}

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
    <View className="flex-row items-center gap-4">
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
      <View className="flex-1 gap-1.5">
        {data.map((d, i) => (
          <View key={d.label} className="flex-row items-center gap-2">
            <View className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: d.color || palette[i % palette.length] }} />
            <Text className="flex-1 text-sm" style={Typography.bodySm} numberOfLines={1}>{d.label}</Text>
            <Text className="text-white font-bold" style={Typography.bodyBold}>{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ChartSection({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <View className="bg-white/[0.04] rounded-lg p-3.5 mb-3.5" style={Shadows.sm as any}>
      <View className="mb-3">
        <Text className="text-white text-lg font-bold" style={Typography.h4}>{title}</Text>
        {subtitle && <Text className="text-gray-500 text-sm mt-0.5" style={Typography.bodySm}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}
