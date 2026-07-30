/**
 * NexusOS Intelligence Center — Reusable Components
 * ==================================================
 * Extracted from /app/nexus-os.tsx so the Student Portal Dashboard
 * (and future portals) can re-use the dark-glass sparkline KPIs,
 * smooth-area chart, ring progress and activity stream.
 *
 * Pure React Native (Expo) — no web-only deps.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
  runOnJS, useDerivedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle, Path, Defs, LinearGradient as SvgLG, Stop, Line, G, Text as SvgText,
} from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ── Tokens ───────────────────────────────────────────
export const NX = {
  bg:        '#07070A',
  surface1:  '#0E0E12',
  surface2:  '#121218',
  surface3:  '#1A1A22',
  border:    'rgba(255,255,255,0.06)',
  borderHi:  'rgba(255,255,255,0.10)',

  textP:     '#F4F4F6',
  textS:     '#8A8A95',
  textT:     '#5A5A66',

  blue:      '#3B82F6',
  cyan:      '#06B6D4',
  purple:    '#A855F7',
  amber:     '#F59E0B',

  success:   '#10B981',
  danger:    '#EF4444',
  successBg: 'rgba(16,185,129,0.12)',
  dangerBg:  'rgba(239,68,68,0.12)',
};

const FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: '"Inter", -apple-system, BlinkMacSystemFont, "Geist", system-ui, sans-serif',
}) as string;

// ── FadeUp entrance ─────────────────────────────────
export function FadeUp({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, [delay, v]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * 8 }],
  }));
  return <Animated.View style={[aStyle, style]}>{children}</Animated.View>;
}

// ── PressLift ───────────────────────────────────────
export function PressLift({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onPress={onPress}
      style={[
        style,
        Platform.OS === 'web' ? ({ transitionProperty: 'box-shadow, border-color', transitionDuration: '200ms', transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' } as any) : null,
        hover && Platform.OS === 'web' ? ({ borderColor: NX.borderHi, boxShadow: `0 0 0 1px rgba(59,130,246,0.20), inset 0 1px 0 rgba(255,255,255,0.04)` } as any) : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

// ── CountUp ─────────────────────────────────────────
export function CountUp({
  to, prefix = '', suffix = '', decimals = 0, style, duration = 1100,
}: { to: number; prefix?: string; suffix?: string; decimals?: number; style?: any; duration?: number }) {
  const sv = useSharedValue(0);
  const [text, setText] = useState(`${prefix}${(0).toFixed(decimals)}${suffix}`);
  useEffect(() => {
    sv.value = withTiming(to, { duration, easing: Easing.out(Easing.cubic) });
  }, [to, sv, duration]);
  useDerivedValue(() => {
    const n = sv.value;
    const formatted = decimals === 0
      ? Math.round(n).toLocaleString('en-US')
      : n.toFixed(decimals);
    runOnJS(setText)(`${prefix}${formatted}${suffix}`);
    return n;
  }, [sv]);
  return <Text style={style}>{text}</Text>;
}

// ── Sparkline ───────────────────────────────────────
export function Sparkline({
  data, color, width = 240, height = 56,
}: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((v, i) => ({ x: i * stepX, y: height - ((v - min) / range) * (height - 8) - 4 }));
  let stroke = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    stroke += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  const fill = `${stroke} L ${width},${height} L 0,${height} Z`;
  const gradId = `g-${color.replace('#', '')}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgLG id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgLG>
      </Defs>
      <Path d={fill} fill={`url(#${gradId})`} />
      <Path d={stroke} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

// ── RingProgress ────────────────────────────────────
export function RingProgress({ pct, size = 72, color = NX.blue }: { pct: number; size?: number; color?: string }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const sv = useSharedValue(c);
  useEffect(() => { sv.value = withTiming(offset, { duration: 900, easing: Easing.out(Easing.cubic) }); }, [offset, sv]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ color: NX.textP, fontFamily: FONT, fontSize: 14, fontWeight: '600' }}>{pct}%</Text>
    </View>
  );
}

// ── TrendPill ───────────────────────────────────────
export function TrendPill({ value, positive }: { value: string; positive: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      backgroundColor: positive ? NX.successBg : NX.dangerBg,
    }}>
      <MaterialCommunityIcons
        name={positive ? 'arrow-up-bold' : 'arrow-down-bold'}
        size={10}
        color={positive ? NX.success : NX.danger}
      />
      <Text style={{ color: positive ? NX.success : NX.danger, fontFamily: FONT, fontSize: 11, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

// ── Card shell ──────────────────────────────────────
export function NxCard({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) {
  return (
    <PressLift
      style={[{
        backgroundColor: NX.surface2,
        borderRadius: 18,
        borderWidth: 1, borderColor: NX.border,
        ...(Platform.OS === 'web' ? ({ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' } as any) : {}),
      }, style]}
      onPress={onPress}
    >
      {children}
    </PressLift>
  );
}

// ── KPI Card ────────────────────────────────────────
export type KpiBase = {
  label: string;
  value: string;
  numeric?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: any;
  accent: string;
  trend?: { value: string; positive: boolean };
};
export type KpiSpark = KpiBase & { kind: 'spark'; spark: number[] };
export type KpiRing  = KpiBase & { kind: 'ring'; ringPct: number; metaLine?: string };

export function KpiCard({ data, delay, sparkWidth }: { data: KpiSpark | KpiRing; delay: number; sparkWidth?: number }) {
  return (
    <FadeUp delay={delay} style={{ flex: 1, minWidth: 220 }}>
      <NxCard style={{ padding: 18, height: 180 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: NX.surface3, alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialCommunityIcons name={data.icon} size={18} color={data.accent} />
          </View>
          {data.trend && <TrendPill value={data.trend.value} positive={data.trend.positive} />}
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ color: NX.textT, fontFamily: FONT, fontSize: 11, fontWeight: '600', letterSpacing: 1.2 }}>
            {data.label.toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
            {data.numeric !== undefined ? (
              <CountUp
                to={data.numeric}
                prefix={data.prefix || ''}
                suffix={data.suffix || ''}
                decimals={data.decimals || 0}
                style={{ color: NX.textP, fontFamily: FONT, fontSize: 30, fontWeight: '600', letterSpacing: -0.4, fontVariant: ['tabular-nums'] }}
              />
            ) : (
              <Text style={{ color: NX.textP, fontFamily: FONT, fontSize: 30, fontWeight: '600', letterSpacing: -0.4 }}>
                {data.value}
              </Text>
            )}
            {data.kind === 'ring' && <RingProgress pct={data.ringPct} size={64} color={data.accent} />}
          </View>
          {data.kind === 'ring' && data.metaLine && (
            <Text style={{ color: NX.textT, fontFamily: FONT, fontSize: 11, marginTop: 4 }}>{data.metaLine}</Text>
          )}
        </View>

        {data.kind === 'spark' && (
          <View style={{ position: 'absolute', left: 18, right: 18, bottom: 14 }}>
            <Sparkline data={data.spark} color={data.accent} width={sparkWidth ?? 260} height={36} />
          </View>
        )}
      </NxCard>
    </FadeUp>
  );
}

// ── Range Toggle ────────────────────────────────────
export function RangeToggle<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: T[] }) {
  return (
    <View style={{
      flexDirection: 'row', backgroundColor: NX.surface3,
      padding: 3, borderRadius: 999, borderWidth: 1, borderColor: NX.border,
    }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            accessibilityRole="button"
            accessibilityLabel={`Range ${o}`}
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
              backgroundColor: active ? NX.textP : 'transparent',
              ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
            }}
          >
            <Text style={{
              color: active ? '#000' : NX.textS, fontFamily: FONT, fontSize: 12, fontWeight: '600',
            }}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Area Chart Card ─────────────────────────────────
export type AreaPoint = { m: string; v: number };
export function AreaChartCard({
  delay = 0,
  title = 'Audience Growth',
  subtitle = 'Monthly active users over time',
  data,
  color = NX.blue,
  yMax,
  ranges = ['1M', '3M', '1Y'],
  initialRange = '1M',
}: {
  delay?: number;
  title?: string;
  subtitle?: string;
  data: AreaPoint[] | Record<string, { title?: string; subtitle?: string; data: AreaPoint[] } | AreaPoint[]>;
  color?: string;
  yMax?: number;
  ranges?: string[];
  initialRange?: string;
}) {
  const [range, setRange] = useState<string>(initialRange);

  // Safely extract active range data
  const isRecord = data && !Array.isArray(data);
  const activeRangeData = isRecord ? (data as any)[range] : null;

  const chartData = activeRangeData
    ? (Array.isArray(activeRangeData) ? activeRangeData : activeRangeData.data)
    : (Array.isArray(data) ? data : []);

  const safeData = chartData && chartData.length > 0 ? chartData : [{ m: 'No Data', v: 0 }];

  const displayTitle = (activeRangeData && !Array.isArray(activeRangeData) && activeRangeData.title) || title;
  const displaySubtitle = (activeRangeData && !Array.isArray(activeRangeData) && activeRangeData.subtitle) || subtitle;

  const W = 720, H = 320;
  const padL = 36, padR = 16, padT = 12, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = yMax ?? Math.max(10, ...safeData.map((d) => d.v)) * 1.15;
  const xs = safeData.map((_, i) => padL + (i / Math.max(1, safeData.length - 1)) * innerW);
  const ys = safeData.map((d) => padT + innerH - (d.v / max) * innerH);

  let stroke = `M ${xs[0]},${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i - 1] ?? xs[i], y0 = ys[i - 1] ?? ys[i];
    const x1 = xs[i], y1 = ys[i];
    const x2 = xs[i + 1], y2 = ys[i + 1];
    const x3 = xs[i + 2] ?? x2, y3 = ys[i + 2] ?? y2;
    const cp1x = x1 + (x2 - x0) / 6, cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6, cp2y = y2 - (y3 - y1) / 6;
    stroke += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
  }
  const fill = `${stroke} L ${xs[xs.length - 1]},${padT + innerH} L ${xs[0]},${padT + innerH} Z`;
  const gradId = `area-fill-${color.replace('#', '')}`;
  // 4 evenly spaced gridlines
  const gridSteps = 4;
  const gridValues = Array.from({ length: gridSteps }, (_, i) => Math.round((max / gridSteps) * (i + 1)));

  return (
    <FadeUp delay={delay} style={{ flex: 2, minWidth: 380 }}>
      <NxCard style={{ padding: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <View>
            <Text style={{ color: NX.textP, fontFamily: FONT, fontSize: 18, fontWeight: '600', letterSpacing: -0.2 }}>{displayTitle}</Text>
            <Text style={{ color: NX.textS, fontFamily: FONT, fontSize: 12, marginTop: 2 }}>{displaySubtitle}</Text>
          </View>
          <RangeToggle value={range} onChange={setRange} options={ranges} />
        </View>

        <View style={{ width: '100%' }}>
          <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <Defs>
              <SvgLG id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity="0.35" />
                <Stop offset="1" stopColor={color} stopOpacity="0" />
              </SvgLG>
            </Defs>
            {gridValues.map((v) => {
               const y = padT + innerH - (v / max) * innerH;
               return (
                 <G key={v}>
                   <Line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 4" />
                   <SvgText x={padL - 8} y={y + 3} fill={NX.textT} fontSize="11" textAnchor="end" fontFamily="Inter">{v.toLocaleString()}</SvgText>
                 </G>
               );
            })}
            <Path d={fill} fill={`url(#${gradId})`} />
            <Path d={stroke} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {safeData.map((d, i) => (
              <G key={d.m}>
                <Circle cx={xs[i]} cy={ys[i]} r={3.5} fill={NX.surface2} stroke={color} strokeWidth="2" />
                <SvgText x={xs[i]} y={H - 8} fill={NX.textT} fontSize="11" textAnchor="middle" fontFamily="Inter">{d.m}</SvgText>
              </G>
            ))}
          </Svg>
        </View>
      </NxCard>
    </FadeUp>
  );
}

// ── Activity Card ───────────────────────────────────
export type ActivityItem = {
  title: string;
  sub: string;
  amount?: string | null;
  amountTone?: 'positive' | 'neutral' | null;
  time: string;
  icon: any;
  tint: string;
  bgTint: string;
};

export function ActivityCard({
  delay = 0,
  title = 'Recent Activity',
  items,
  ctaLabel = 'View All Activity',
  onCta,
}: {
  delay?: number;
  title?: string;
  items: ActivityItem[];
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <FadeUp delay={delay} style={{ flex: 1, minWidth: 320 }}>
      <NxCard style={{ padding: 22, flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: NX.textP, fontFamily: FONT, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, marginBottom: 14 }}>
            {title}
          </Text>
          <View style={{ gap: 14 }}>
            {items.map((a, i) => <ActivityRow key={i} item={a} />)}
          </View>
        </View>
        <Pressable
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={({ hovered }: any) => ({
            marginTop: 18, paddingVertical: 11, borderRadius: 999,
            backgroundColor: hovered ? NX.borderHi : NX.surface3, alignItems: 'center',
            ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
          })}
        >
          <Text style={{ color: NX.textP, fontFamily: FONT, fontSize: 13, fontWeight: '600' }}>{ctaLabel}</Text>
        </Pressable>
      </NxCard>
    </FadeUp>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: item.bgTint, alignItems: 'center', justifyContent: 'center',
      }}>
        <MaterialCommunityIcons name={item.icon as any} size={16} color={item.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: NX.textP, fontFamily: FONT, fontSize: 13.5, fontWeight: '600' }}>{item.title}</Text>
        <Text style={{ color: NX.textS, fontFamily: FONT, fontSize: 12, marginTop: 2 }}>{item.sub}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {item.amount && (
          <Text style={{ color: item.amountTone === 'positive' ? NX.success : NX.textP, fontFamily: FONT, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {item.amount}
          </Text>
        )}
        <Text style={{ color: NX.textT, fontFamily: FONT, fontSize: 11, marginTop: item.amount ? 2 : 0 }}>{item.time}</Text>
      </View>
    </View>
  );
}

// ── Page Header (NexusOS style) ────────────────────
export function NxPageHeader({
  title,
  subtitle,
  statusLabel = 'System Operational',
  ctaLabel,
  onCta,
}: {
  title: string;
  subtitle: string;
  statusLabel?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  return (
    <View style={{
      flexDirection: isPhone ? 'column' : 'row',
      alignItems: isPhone ? 'flex-start' : 'flex-end',
      justifyContent: 'space-between',
      gap: 16, marginBottom: 8,
    }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: NX.textP, fontFamily: FONT, fontSize: isPhone ? 22 : 28, fontWeight: '600', letterSpacing: -0.5 }}>{title}</Text>
        <Text style={{ color: NX.textS, fontFamily: FONT, fontSize: 13, marginTop: 4 }}>{subtitle}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 7,
          paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
          backgroundColor: NX.surface2, borderWidth: 1, borderColor: NX.border,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: NX.success }} />
          <Text style={{ color: NX.textP, fontFamily: FONT, fontSize: 12, fontWeight: '500' }}>{statusLabel}</Text>
        </View>
        {ctaLabel && (
          <Pressable
            onPress={onCta}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            style={({ hovered, pressed }: any) => ({
              paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999,
              backgroundColor: '#fff',
              transform: [{ scale: pressed ? 0.97 : hovered ? 1.02 : 1 }],
              ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
            })}
          >
            <Text style={{ color: '#0F172A', fontFamily: FONT, fontSize: 13, fontWeight: '600' }}>{ctaLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
