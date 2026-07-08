/**
 * NexusOS — Intelligence Center
 * ============================================================
 * Single-page admin dashboard. Dark, glassy, premium SaaS feel.
 * Adapted to React Native (Expo) — original spec targeted Next.js.
 * Uses react-native-svg for charts/rings/sparklines and the Apple
 * primitives shipped earlier (ToastProvider/ThemeProvider).
 *
 * Components live inline because this is a single route with a
 * cohesive design system that doesn't need to be exported.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform,
  NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
  withSpring, runOnJS, useDerivedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle, Path, Defs, LinearGradient as SvgLG, Stop, Line, G, Text as SvgText,
} from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ── NexusOS Tokens ───────────────────────────────────────────
const T = {
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

// ── Mock Data (lib/mock-data equivalent) ─────────────────────
const SPARK_REVENUE = [12, 18, 14, 22, 19, 26, 24, 30, 28, 34, 32, 41];
const SPARK_USERS   = [40, 42, 41, 45, 48, 50, 49, 53, 56, 58, 60, 64];
const SPARK_CONV    = [55, 53, 52, 50, 51, 49, 48, 47, 46, 45, 46, 44];

const AUDIENCE_DATA = [
  { m: 'Jan', v: 1750 }, { m: 'Feb', v: 1380 }, { m: 'Mar', v: 1280 },
  { m: 'Apr', v: 1820 }, { m: 'May', v: 2240 }, { m: 'Jun', v: 2880 },
  { m: 'Jul', v: 3160 }, { m: 'Aug', v: 3680 }, { m: 'Sep', v: 3960 },
];

const ACTIVITY = [
  { kind: 'payment',  title: 'Payment Received',  sub: 'Stripe • Invoice #4920',     amount: '+$1,250', amountTone: 'positive', time: '2m ago', icon: 'arrow-down-bold-circle-outline', tint: T.blue,    bgTint: 'rgba(59,130,246,0.15)' },
  { kind: 'team',     title: 'New Team Member',   sub: 'Sarah Jenkins joined Design', amount: null,      amountTone: null,        time: '1h ago', icon: 'account-plus',                    tint: T.purple,  bgTint: 'rgba(168,85,247,0.15)' },
  { kind: 'system',   title: 'System Update',     sub: 'v2.4.1 deployed successfully', amount: null,      amountTone: null,        time: '3h ago', icon: 'cloud-upload-outline',           tint: T.textS,   bgTint: 'rgba(255,255,255,0.06)' },
  { kind: 'warning',  title: 'API Limit Warning', sub: '85% of monthly quota reached', amount: null,      amountTone: null,        time: '5h ago', icon: 'alert-outline',                  tint: T.danger,  bgTint: T.dangerBg },
];

// ── Hooks ────────────────────────────────────────────────────
function useResponsive() {
  const { width } = useWindowDimensions();
  return {
    width,
    isPhone:   width < 768,
    isTablet:  width >= 768 && width < 1280,
    isDesktop: width >= 1280,
  };
}

// ── FadeUp entrance (framer-motion equivalent) ───────────────
function FadeUp({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
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

// ── PressLift (cards rise + glow on hover) ───────────────────
function PressLift({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onPress={onPress}
      style={[
        style,
        Platform.OS === 'web' ? ({ transitionProperty: 'box-shadow, border-color', transitionDuration: '200ms', transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' } as any) : null,
        hover && Platform.OS === 'web' ? ({ borderColor: T.borderHi, boxShadow: `0 0 0 1px rgba(59,130,246,0.20), inset 0 1px 0 rgba(255,255,255,0.04)` } as any) : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

// ── AnimatedCounter (count-up on mount) ──────────────────────
function CountUp({ to, prefix = '', suffix = '', decimals = 0, style }: { to: number; prefix?: string; suffix?: string; decimals?: number; style?: any }) {
  const sv = useSharedValue(0);
  const [text, setText] = useState(`${prefix}${(0).toFixed(decimals)}${suffix}`);
  useEffect(() => {
    sv.value = withTiming(to, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [to, sv]);
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

// ── Sparkline (smooth area, gradient fill) ───────────────────
function Sparkline({ data, color, width = 240, height = 56 }: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  // Smooth monotone path (Catmull-Rom-ish)
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

// ── RingProgress (3px stroke, % center) ──────────────────────
function RingProgress({ pct, size = 72, color = T.blue }: { pct: number; size?: number; color?: string }) {
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
      <Text style={{ color: T.textP, fontFamily: FONT, fontSize: 14, fontWeight: '600' }}>{pct}%</Text>
    </View>
  );
}

// ── TrendPill (▲ % green / ▼ % red) ──────────────────────────
function TrendPill({ value, positive }: { value: string; positive: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      backgroundColor: positive ? T.successBg : T.dangerBg,
    }}>
      <MaterialCommunityIcons
        name={positive ? 'arrow-up-bold' : 'arrow-down-bold'}
        size={10}
        color={positive ? T.success : T.danger}
      />
      <Text style={{ color: positive ? T.success : T.danger, fontFamily: FONT, fontSize: 11, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

// ── Card shell ──────────────────────────────────────────────
function Card({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) {
  return (
    <PressLift
      style={[{
        backgroundColor: T.surface2,
        borderRadius: 18,
        borderWidth: 1, borderColor: T.border,
        ...(Platform.OS === 'web' ? ({ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' } as any) : {}),
      }, style]}
      onPress={onPress}
    >
      {children}
    </PressLift>
  );
}

// ── KPI Card ────────────────────────────────────────────────
type KpiBase = {
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
type KpiSpark = KpiBase & { kind: 'spark'; spark: number[] };
type KpiRing  = KpiBase & { kind: 'ring'; ringPct: number; metaLine?: string };

function KpiCard({ data, delay }: { data: KpiSpark | KpiRing; delay: number }) {
  return (
    <FadeUp delay={delay} style={{ flex: 1, minWidth: 220 }}>
      <Card style={{ padding: 18, height: 180 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: T.surface3, alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialCommunityIcons name={data.icon} size={18} color={data.accent} />
          </View>
          {data.trend && <TrendPill value={data.trend.value} positive={data.trend.positive} />}
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ color: T.textT, fontFamily: FONT, fontSize: 11, fontWeight: '600', letterSpacing: 1.2 }}>
            {data.label.toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
            {data.numeric !== undefined ? (
              <CountUp
                to={data.numeric}
                prefix={data.prefix || ''}
                suffix={data.suffix || ''}
                decimals={data.decimals || 0}
                style={{ color: T.textP, fontFamily: FONT, fontSize: 30, fontWeight: '600', letterSpacing: -0.4, fontVariant: ['tabular-nums'] }}
              />
            ) : (
              <Text style={{ color: T.textP, fontFamily: FONT, fontSize: 30, fontWeight: '600', letterSpacing: -0.4 }}>
                {data.value}
              </Text>
            )}
            {data.kind === 'ring' && <RingProgress pct={data.ringPct} size={64} color={data.accent} />}
          </View>
          {data.kind === 'ring' && data.metaLine && (
            <Text style={{ color: T.textT, fontFamily: FONT, fontSize: 11, marginTop: 4 }}>{data.metaLine}</Text>
          )}
        </View>

        {data.kind === 'spark' && (
          <View style={{ position: 'absolute', left: 18, right: 18, bottom: 14 }}>
            <Sparkline data={data.spark} color={data.accent} width={undefined as any} height={36} />
          </View>
        )}
      </Card>
    </FadeUp>
  );
}

// ── Audience Growth area chart ──────────────────────────────
function AreaChartCard({ delay }: { delay: number }) {
  const [range, setRange] = useState<'1M' | '3M' | '1Y'>('1M');
  const W = 720, H = 320;
  const padL = 36, padR = 16, padT = 12, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xs = AUDIENCE_DATA.map((_, i) => padL + (i / (AUDIENCE_DATA.length - 1)) * innerW);
  const max = 4000;
  const ys = AUDIENCE_DATA.map((d) => padT + innerH - (d.v / max) * innerH);

  // Smooth path
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

  return (
    <FadeUp delay={delay} style={{ flex: 2, minWidth: 380 }}>
      <Card style={{ padding: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <View>
            <Text style={{ color: T.textP, fontFamily: FONT, fontSize: 18, fontWeight: '600', letterSpacing: -0.2 }}>Audience Growth</Text>
            <Text style={{ color: T.textS, fontFamily: FONT, fontSize: 12, marginTop: 2 }}>Monthly active users over time</Text>
          </View>
          <RangeToggle value={range} onChange={setRange} />
        </View>

        <View style={{ width: '100%' }}>
          <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <Defs>
              <SvgLG id="audience-fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={T.blue} stopOpacity="0.35" />
                <Stop offset="1" stopColor={T.blue} stopOpacity="0" />
              </SvgLG>
            </Defs>
            {/* Y-axis dashed gridlines */}
            {[1000, 2000, 3000, 4000].map((v) => {
              const y = padT + innerH - (v / max) * innerH;
              return (
                <G key={v}>
                  <Line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 4" />
                  <SvgText x={padL - 8} y={y + 3} fill={T.textT} fontSize="11" textAnchor="end" fontFamily="Inter">{v.toLocaleString()}</SvgText>
                </G>
              );
            })}
            <Path d={fill} fill="url(#audience-fill)" />
            <Path d={stroke} stroke={T.blue} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {AUDIENCE_DATA.map((d, i) => (
              <G key={d.m}>
                <Circle cx={xs[i]} cy={ys[i]} r={3.5} fill={T.surface2} stroke={T.blue} strokeWidth="2" />
                <SvgText x={xs[i]} y={H - 8} fill={T.textT} fontSize="11" textAnchor="middle" fontFamily="Inter">{d.m}</SvgText>
              </G>
            ))}
          </Svg>
        </View>
      </Card>
    </FadeUp>
  );
}

function RangeToggle({ value, onChange }: { value: '1M' | '3M' | '1Y'; onChange: (v: '1M' | '3M' | '1Y') => void }) {
  const opts: ('1M' | '3M' | '1Y')[] = ['1M', '3M', '1Y'];
  return (
    <View style={{
      flexDirection: 'row', backgroundColor: T.surface3,
      padding: 3, borderRadius: 999, borderWidth: 1, borderColor: T.border,
    }}>
      {opts.map((o) => {
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
              backgroundColor: active ? T.textP : 'transparent',
              ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
            }}
          >
            <Text style={{
              color: active ? '#000' : T.textS, fontFamily: FONT, fontSize: 12, fontWeight: '600',
            }}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Activity Card ───────────────────────────────────────────
function ActivityCard({ delay }: { delay: number }) {
  const router = useRouter();
  return (
    <FadeUp delay={delay} style={{ flex: 1, minWidth: 320 }}>
      <Card style={{ padding: 22, flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: T.textP, fontFamily: FONT, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, marginBottom: 14 }}>
            Recent Activity
          </Text>
          <View style={{ gap: 14 }}>
            {ACTIVITY.map((a, i) => <ActivityRow key={i} item={a} />)}
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel="View All Activity"
          style={({ hovered }: any) => ({
            marginTop: 18, paddingVertical: 11, borderRadius: 999,
            backgroundColor: hovered ? T.borderHi : T.surface3, alignItems: 'center',
            ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
          })}
        >
          <Text style={{ color: T.textP, fontFamily: FONT, fontSize: 13, fontWeight: '600' }}>View All Activity</Text>
        </Pressable>
      </Card>
    </FadeUp>
  );
}

function ActivityRow({ item }: { item: typeof ACTIVITY[number] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: item.bgTint, alignItems: 'center', justifyContent: 'center',
      }}>
        <MaterialCommunityIcons name={item.icon as any} size={16} color={item.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: T.textP, fontFamily: FONT, fontSize: 13.5, fontWeight: '600' }}>{item.title}</Text>
        <Text style={{ color: T.textS, fontFamily: FONT, fontSize: 12, marginTop: 2 }}>{item.sub}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {item.amount && (
          <Text style={{ color: item.amountTone === 'positive' ? T.success : T.textP, fontFamily: FONT, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {item.amount}
          </Text>
        )}
        <Text style={{ color: T.textT, fontFamily: FONT, fontSize: 11, marginTop: item.amount ? 2 : 0 }}>{item.time}</Text>
      </View>
    </View>
  );
}

// ── Sidebar ────────────────────────────────────────────────
const NAV_OVERVIEW = [
  { id: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', active: true },
  { id: 'analytics', label: 'Analytics', icon: 'chart-pie',              active: false },
  { id: 'finance',   label: 'Finance',   icon: 'wallet-outline',         active: false, badge: 'New' },
];
const NAV_MGMT = [
  { id: 'team',     label: 'Team Members', icon: 'account-group-outline', active: false },
  { id: 'products', label: 'Products',     icon: 'package-variant',        active: false },
  { id: 'security', label: 'Security',     icon: 'shield-outline',         active: false },
];

function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const w = collapsed ? 64 : 260;
  return (
    <View style={{
      width: w, height: '100%' as any, backgroundColor: T.surface1,
      borderRightWidth: 1, borderRightColor: T.border,
      paddingHorizontal: collapsed ? 8 : 16, paddingTop: 18, paddingBottom: 16,
      gap: 6,
    }}>
      {/* Brand */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22, paddingHorizontal: collapsed ? 0 : 4 }}>
        <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="apple" size={16} color="#fff" />
        </View>
        {!collapsed && <Text style={{ color: T.textP, fontFamily: FONT, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 }}>NexusOS</Text>}
      </View>

      {/* User card */}
      {!collapsed && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          padding: 10, borderRadius: 12, backgroundColor: T.surface2,
          borderWidth: 1, borderColor: T.border, marginBottom: 14,
        }}>
          <View style={{ position: 'relative' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#3F2F6E', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontFamily: FONT, fontWeight: '700', fontSize: 12 }}>AR</Text>
            </View>
            <View style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: T.success, borderWidth: 2, borderColor: T.surface2 }} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: T.textP, fontFamily: FONT, fontSize: 13, fontWeight: '600' }}>Alexander Reed</Text>
            <Text style={{ color: T.textS, fontFamily: FONT, fontSize: 11 }}>Admin Workspace</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={14} color={T.textS} />
        </View>
      )}

      <SectionLabel collapsed={collapsed} label="OVERVIEW" />
      {NAV_OVERVIEW.map((n) => <NavItem key={n.id} item={n} collapsed={collapsed} />)}

      <View style={{ height: 14 }} />
      <SectionLabel collapsed={collapsed} label="MANAGEMENT" />
      {NAV_MGMT.map((n) => <NavItem key={n.id} item={n} collapsed={collapsed} />)}

      <View style={{ flex: 1 }} />
      <NavItem item={{ id: 'settings', label: 'Settings', icon: 'cog-outline', active: false }} collapsed={collapsed} />
      <NavItem item={{ id: 'logout', label: 'Log Out', icon: 'logout', active: false, danger: true }} collapsed={collapsed} />
    </View>
  );
}

function SectionLabel({ collapsed, label }: { collapsed: boolean; label: string }) {
  if (collapsed) return <View style={{ height: 6 }} />;
  return (
    <Text style={{ color: T.textT, fontFamily: FONT, fontSize: 11, fontWeight: '600', letterSpacing: 1, paddingHorizontal: 4, paddingVertical: 6 }}>
      {label}
    </Text>
  );
}

function NavItem({ item, collapsed }: { item: any; collapsed: boolean }) {
  const [hover, setHover] = useState(false);
  const c = item.danger ? T.danger : (item.active ? T.textP : T.textS);
  return (
    <Pressable
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: !!item.active }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 11,
        paddingHorizontal: collapsed ? 0 : 12, paddingVertical: 9, borderRadius: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        backgroundColor: item.active ? 'rgba(59,130,246,0.10)' : (hover ? T.surface3 : 'transparent'),
        position: 'relative',
        ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
      }}
    >
      {item.active && !collapsed && (
        <View style={{ position: 'absolute', left: -16, top: 8, bottom: 8, width: 2, borderRadius: 1, backgroundColor: T.blue }} />
      )}
      <MaterialCommunityIcons name={item.icon} size={16} color={c} />
      {!collapsed && (
        <Text style={{ color: c, fontFamily: FONT, fontSize: 13.5, fontWeight: '500', flex: 1 }}>{item.label}</Text>
      )}
      {!collapsed && item.badge && (
        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(168,85,247,0.20)' }}>
          <Text style={{ color: '#fff', fontFamily: FONT, fontSize: 10, fontWeight: '600' }}>{item.badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Top Bar ────────────────────────────────────────────────
function TopBar() {
  const r = useResponsive();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: r.isPhone ? 16 : 28, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface1,
    }}>
      <View style={{
        flex: 1, maxWidth: 520, height: 38, paddingHorizontal: 14,
        borderRadius: 999, backgroundColor: T.surface2, borderWidth: 1, borderColor: T.border,
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
        <MaterialCommunityIcons name="magnify" size={14} color={T.textS} />
        <TextInput
          placeholder="Search commands, users, or data..."
          placeholderTextColor={T.textT}
          accessibilityLabel="Global search"
          style={{ flex: 1, color: T.textP, fontFamily: FONT, fontSize: 13, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }}
        />
        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: T.surface3, borderWidth: 1, borderColor: T.border }}>
          <Text style={{ color: T.textS, fontFamily: FONT, fontSize: 11, fontWeight: '600' }}>⌘K</Text>
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <IconBtn icon="bell-outline" badge accessibilityLabel="Notifications" />
      <IconBtn icon="arrow-expand-all" accessibilityLabel="Toggle fullscreen" />
    </View>
  );
}

function IconBtn({ icon, badge = false, accessibilityLabel }: { icon: any; badge?: boolean; accessibilityLabel?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: hover ? T.surface3 : 'transparent',
        borderWidth: 1, borderColor: hover ? T.borderHi : 'transparent',
        alignItems: 'center', justifyContent: 'center',
        ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
      }}
    >
      <MaterialCommunityIcons name={icon} size={16} color={T.textP} />
      {badge && (
        <View style={{ position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: T.blue, borderWidth: 1.5, borderColor: T.surface1 }} />
      )}
    </Pressable>
  );
}

// ── Page Header ────────────────────────────────────────────
function PageHeader() {
  const r = useResponsive();
  return (
    <View style={{
      flexDirection: r.isPhone ? 'column' : 'row',
      alignItems: r.isPhone ? 'flex-start' : 'flex-end',
      justifyContent: 'space-between',
      gap: 16, marginBottom: 24,
    }}>
      <View>
        <Text style={{ color: T.textP, fontFamily: FONT, fontSize: r.isPhone ? 24 : 32, fontWeight: '600', letterSpacing: -0.5 }}>Intelligence Center</Text>
        <Text style={{ color: T.textS, fontFamily: FONT, fontSize: 14, marginTop: 4 }}>Real-time metrics and system performance.</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 7,
          paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
          backgroundColor: T.surface2, borderWidth: 1, borderColor: T.border,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: T.success }} />
          <Text style={{ color: T.textP, fontFamily: FONT, fontSize: 12, fontWeight: '500' }}>System Operational</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generate Report"
          style={({ hovered, pressed }: any) => ({
            paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999,
            backgroundColor: '#fff',
            transform: [{ scale: pressed ? 0.97 : hovered ? 1.02 : 1 }],
            ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
          })}
        >
          <Text style={{ color: '#000', fontFamily: FONT, fontSize: 13, fontWeight: '600' }}>Generate Report</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function NexusOS() {
  const r = useResponsive();
  const sidebarCollapsed = !r.isDesktop && !r.isPhone; // tablet → 64px rail

  // KPI data
  const KPIS: (KpiSpark | KpiRing)[] = [
    {
      kind: 'spark', label: 'Total Revenue', value: '$84,502.00',
      numeric: 84502, prefix: '$', decimals: 2, suffix: '',
      icon: 'currency-usd', accent: T.blue,
      trend: { value: '12.5%', positive: true }, spark: SPARK_REVENUE,
    },
    {
      kind: 'spark', label: 'Active Users', value: '12,493', numeric: 12493,
      icon: 'account-group', accent: T.purple,
      trend: { value: '8.2%', positive: true }, spark: SPARK_USERS,
    },
    {
      kind: 'spark', label: 'Conversion Rate', value: '4.6%', numeric: 4.6, suffix: '%', decimals: 1,
      icon: 'lightning-bolt', accent: T.cyan,
      trend: { value: '1.4%', positive: false }, spark: SPARK_CONV,
    },
    {
      kind: 'ring', label: 'System Load', value: 'Optimal',
      icon: 'tune-vertical', accent: T.blue, ringPct: 78,
      metaLine: 'Last checked: 2m ago',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, flexDirection: 'row' }}>
      {/* Radial glow accent */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, {
            // @ts-ignore
            background: `radial-gradient(circle at 90% 0%, rgba(6,182,212,0.06) 0%, rgba(7,7,10,0) 50%)`,
          } as any]} />
        ) : null}
      </View>

      {!r.isPhone && <Sidebar collapsed={sidebarCollapsed} />}

      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: r.isPhone ? 16 : 28, paddingTop: 28, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          <FadeUp delay={0}><PageHeader /></FadeUp>

          {/* KPI cards row */}
          <View style={{
            flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16,
          }}>
            {KPIS.map((k, i) => {
              const w = r.isPhone ? '100%' : (r.isTablet ? ('48%' as any) : undefined);
              return (
                <View key={k.label} style={{ flex: r.isDesktop ? 1 : undefined, minWidth: r.isPhone ? 0 : 220, width: w }}>
                  <KpiCard data={k} delay={50 + i * 80} />
                </View>
              );
            })}
          </View>

          {/* Main row: chart (2fr) + activity (1fr) */}
          <View style={{
            flexDirection: r.isDesktop ? 'row' : 'column',
            gap: 16, alignItems: 'stretch',
          }}>
            <AreaChartCard delay={400} />
            <ActivityCard delay={480} />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
