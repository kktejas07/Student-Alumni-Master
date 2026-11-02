/**
 * /wallet — SA Wallet (W10 light-theme redesign)
 *
 * - Light #F8FAFC canvas, white cards (dark theme honored via useTheme)
 * - KPI strip: Balance / Rewards Level / Active Coupons / Login Streak
 * - 5 tabs: Overview, Coupons, Rewards, Analytics, History
 * - Quick actions: UPI top-up (app grid, deep link, QR, status polling),
 *   card top-up (Razorpay), withdraw, peer transfer
 * - Money Coach lives in the floating bubble (MoneyCoach.tsx)
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  TextInput, Platform, useWindowDimensions, Modal, Linking, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Rect, Line, Polyline, G, Text as SvgText } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import {
  Wallet, CircleCheck as CheckCircle2, Copy, ExternalLink, Clock,
  Tag, TrendingUp, ArrowUpRight, ArrowDownLeft, Award,
  Check, Search, X, ChevronRight, Gift, Zap, RefreshCw,
  CreditCard, Info, Send, QrCode, Target, Flame, Star,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import MoneyCoach from '@/src/views/web/wallet/MoneyCoach';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';
import { useToast } from '@/src/views/components';
import { useTheme } from '@/src/theme/ThemeContext';

const FT = {
  reg: 'DMSans_400Regular',
  med: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  xbold: 'DMSans_800ExtraBold',
};

/* Validated dataviz palette (CVD-safe fixed categorical order, light + dark). */
const CHART_PALETTE = {
  light: {
    cat: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    ink: { primary: '#0b0b0b', secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', baseline: '#c3c2b7' },
  },
  dark: {
    cat: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
    ink: { primary: '#f0efec', secondary: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', baseline: '#383835' },
  },
};

const TOPUP_PRESETS = [100, 250, 500, 1000, 2500, 5000];
const UPI_ICON_BY_APP: Record<string, string> = {
  gpay: 'google-wallet',
  phonepe: 'phone',
  paytm: 'credit-card',
  bhim: 'cash',
};

function fmtINR(n: number): string {
  if (!isFinite(n)) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtCredits(n: number): string {
  if (!isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-IN');
}

function fmtDate(ts?: string): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(ts?: string): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function domainFrom(partner: string, logo?: string): string {
  const src = logo?.trim();
  if (src) {
    try {
      return new URL(src, 'https://x').hostname;
    } catch { /* fall through to partner name */ }
  }
  return partner.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function brandInitials(partner: string): string {
  const words = partner.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return partner.slice(0, 2).toUpperCase();
}

function BrandLogo({ partner, logo, size = 36 }: { partner: string; logo?: string; size?: number }) {
  const { isDark } = useTheme();
  const [failed, setFailed] = useState(false);
  const domain = useMemo(() => domainFrom(partner, logo), [partner, logo]);
  if (!domain || failed) {
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 4,
        backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
        borderWidth: 1, borderColor: isDark ? 'rgba(59,130,246,0.35)' : '#BFDBFE',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: FT.xbold, fontSize: size / 3.2, color: isDark ? '#93C5FD' : '#1E40AF' }}>
          {brandInitials(partner)}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: `https://logo.clearbit.com/${domain}` }}
      style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: isDark ? '#0F2347' : '#F8FAFC' }}
      onError={() => setFailed(true)}
    />
  );
}

/* ────────── Charts (react-native-svg, dataviz-validated palette) ────────── */

function DonutChart({ slices, size = 180, trackColor, ink, centerLabel, centerValue }: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
  trackColor: string;
  ink: { primary: string; secondary: string; muted: string };
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total <= 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: ink.muted, fontFamily: FT.med, fontSize: 12 }}>No earnings yet in this period</Text>
      </View>
    );
  }
  const cx = size / 2;
  const radius = size / 2 - 16;
  const C = 2 * Math.PI * radius;
  let acc = 0;
  const gap = slices.length > 1 ? 2 : 0;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${cx} ${cx}`}>
          <Circle cx={cx} cy={cx} r={radius} stroke={trackColor} strokeWidth={18} fill="none" />
          {slices.map((s) => {
            const frac = s.value / total;
            const dash = Math.max(frac * C - gap, 0.5);
            const seg = (
              <Circle
                key={s.label}
                cx={cx}
                cy={cx}
                r={radius}
                stroke={s.color}
                strokeWidth={18}
                fill="none"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-acc}
              />
            );
            acc += frac * C;
            return seg;
          })}
        </G>
        <SvgText x={cx} y={cx - 4} textAnchor="middle" fontSize={19} fontWeight={800} fill={ink.primary}>{centerValue}</SvgText>
        <SvgText x={cx} y={cx + 14} textAnchor="middle" fontSize={10} fontWeight={500} fill={ink.muted}>{centerLabel}</SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, maxWidth: size + 80, alignItems: 'center', justifyContent: 'center' }}>
        {slices.map((sl) => (
          <View key={sl.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: sl.color }} />
            <Text style={{ color: ink.secondary, fontSize: 10.5, fontFamily: FT.med }}>{sl.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BarsChart({ items, width = 300, height = 190, barColor, ink }: {
  items: { label: string; value: number }[];
  width?: number;
  height?: number;
  barColor: string;
  ink: { primary: string; secondary: string; muted: string; grid: string; baseline: string };
}) {
  const data = items.length > 6
    ? [...items.slice(0, 5), { label: 'Other', value: items.slice(5).reduce((a, i) => a + i.value, 0) }]
    : items;
  if (!data.length || data.every((d) => d.value <= 0)) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', width }}>
        <Text style={{ color: ink.muted, fontSize: 12, fontFamily: FT.med }}>No spending yet in this period</Text>
      </View>
    );
  }
  const padT = 18, padB = 26, padX = 4;
  const plotH = height - padT - padB;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = (width - padX * 2) / data.length;
  const barW = Math.max(Math.min(step - 8, 52), 14);
  return (
    <Svg width={width} height={height}>
      {[0.25, 0.5, 0.75].map((f) => (
        <Line key={f} x1={padX} x2={width - padX} y1={padT + plotH * (1 - f)} y2={padT + plotH * (1 - f)} stroke={ink.grid} strokeWidth={1} strokeDasharray="3 3" />
      ))}
      <Line x1={padX} x2={width - padX} y1={padT + plotH} y2={padT + plotH} stroke={ink.baseline} strokeWidth={1} />
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * plotH, d.value > 0 ? 2 : 0);
        const x = padX + i * step + (step - barW) / 2;
        const y = padT + plotH - h;
        const label = d.label.length > 12 ? `${d.label.slice(0, 11)}...` : d.label;
        return (
          <G key={`${d.label}-${i}`}>
            {h > 0 && <Rect x={x} y={y} width={barW} height={h} rx={3} fill={barColor} />}
            <SvgText x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={ink.secondary}>{fmtCredits(d.value)}</SvgText>
            <SvgText x={x + barW / 2} y={padT + plotH + 14} textAnchor="middle" fontSize={9} fontWeight={500} fill={ink.muted}>{label}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function TrendLines({ points, width = 300, height = 190, colors, ink, gridColor }: {
  points: { date: string; in: number; out: number; net: number }[];
  width?: number;
  height?: number;
  colors: { in: string; out: string; net: string };
  ink: { primary: string; secondary: string; muted: string; baseline: string };
  gridColor?: string;
}) {
  if (!points.length) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', width }}>
        <Text style={{ color: ink.muted, fontSize: 12, fontFamily: FT.med }}>No activity yet in this period</Text>
      </View>
    );
  }
  const padL = 10, padR = 10, padT = 12, padB = 22;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const vals = points.flatMap((p) => [p.in || 0, p.out || 0, p.net || 0]);
  const maxV = Math.max(...vals, 1);
  const minV = Math.min(...vals, 0);
  const span = maxV - minV || 1;
  const x = (i: number) => (points.length === 1 ? padL + plotW / 2 : padL + (i / (points.length - 1)) * plotW);
  const y = (v: number) => padT + (1 - (v - minV) / span) * plotH;
  const toPoly = (k: 'in' | 'out' | 'net') => points.map((p, i) => `${x(i).toFixed(1)},${y(p[k] || 0).toFixed(1)}`).join(' ');
  const stride = Math.max(1, Math.ceil(points.length / 6));
  const tickIdx = Array.from(new Set(
    points.map((_, i) => i).filter((i) => i % stride === 0 || i === points.length - 1),
  ));
  return (
    <Svg width={width} height={height}>
      {[0, 0.5, 1].map((f) => {
        const yy = padT + plotH * (1 - f);
        return (
          <Line
            key={f}
            x1={padL}
            x2={width - padR}
            y1={yy}
            y2={yy}
            stroke={f === 1 ? ink.baseline : (gridColor || ink.muted)}
            strokeWidth={1}
            strokeDasharray={f === 1 ? undefined : '3 3'}
          />
        );
      })}
      {(['in', 'out', 'net'] as const).map((k) => (
        <Polyline key={k} points={toPoly(k)} fill="none" stroke={colors[k]} strokeWidth={2} />
      ))}
      {points.length <= 31 && points.map((p, i) => (
        <G key={`pt-${i}`}>
          {(['in', 'out', 'net'] as const).map((k) => (
            <Circle key={k} cx={x(i)} cy={y(p[k] || 0)} r={4} fill={colors[k]} />
          ))}
        </G>
      ))}
      {tickIdx.map((i) => (
        <SvgText
          key={`tick-${i}`}
          x={x(i)}
          y={height - 6}
          textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
          fontSize={8.5}
          fontWeight={500}
          fill={ink.muted}
        >
          {new Date(points[i].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </SvgText>
      ))}
    </Svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Small presentational primitives (module-level, use theme directly)
   ────────────────────────────────────────────────────────────────────────── */

function KpiCard({ icon, label, value, sub, children, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  children?: React.ReactNode;
  accent?: boolean;
}) {
  const { isDark } = useTheme();
  const card = isDark ? '#111B2E' : '#FFFFFF';
  const border = isDark ? 'rgba(148,163,184,0.18)' : '#E2E8F0';
  const textSub = isDark ? '#94A3B8' : '#64748B';
  const text = isDark ? '#F8FAFC' : '#0F172A';
  const iconBg = accent ? (isDark ? 'rgba(59,130,246,0.18)' : '#EFF6FF') : (isDark ? 'rgba(148,163,184,0.12)' : '#F1F5F9');
  const iconColor = accent ? (isDark ? '#93C5FD' : '#2563EB') : (isDark ? '#CBD5E1' : '#475569');
  return (
    <View style={{
      backgroundColor: card,
      borderColor: border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      flex: 1,
      minWidth: 150,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{
          width: 30, height: 30, borderRadius: 9, backgroundColor: iconBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {React.cloneElement(icon as any, { size: 16, color: iconColor })}
        </View>
        <Text style={{ fontFamily: FT.med, fontSize: 11, color: textSub, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: FT.xbold, fontSize: 22, color: text, marginTop: 10, lineHeight: 24 }}>{value}</Text>
      {sub ? <Text style={{ fontFamily: FT.reg, fontSize: 11, color: textSub, marginTop: 2 }}>{sub}</Text> : null}
      {children ? <View style={{ marginTop: 10 }}>{children}</View> : null}
    </View>
  );
}

function SectionHeader({ title, right, sub }: { title: string; sub?: string; right?: React.ReactNode }) {
  const { isDark } = useTheme();
  const text = isDark ? '#F8FAFC' : '#0F172A';
  const textSub = isDark ? '#94A3B8' : '#64748B';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontFamily: FT.bold, fontSize: 15, color: text }}>{title}</Text>
        {sub ? <Text style={{ fontFamily: FT.reg, fontSize: 11.5, color: textSub, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function Chip({ label, active, onPress, tone }: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'neutral';
}) {
  const { isDark } = useTheme();
  const bg = active
    ? (isDark ? 'rgba(59,130,246,0.22)' : '#EFF6FF')
    : (isDark ? 'rgba(148,163,184,0.10)' : '#F1F5F9');
  const fg = active ? (isDark ? '#93C5FD' : '#1E40AF') : (isDark ? '#CBD5E1' : '#475569');
  const ring = active ? 'rgba(59,130,246,0.4)' : 'transparent';
  const toneFg: Record<string, string> = {
    blue: isDark ? '#93C5FD' : '#1E40AF',
    green: isDark ? '#4ADE80' : '#047857',
    amber: isDark ? '#FBBF24' : '#B45309',
    red: isDark ? '#F87171' : '#B91C1C',
    neutral: fg,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderColor: ring,
        borderWidth: ring !== 'transparent' ? 1 : 0,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ fontFamily: FT.med, fontSize: 12, color: tone ? toneFg[tone] : fg }}>{label}</Text>
    </Pressable>
  );
}

function DashedCodeBox({ code, onCopy, isDark, codeBoxBorder }: {
  code: string;
  onCopy: () => void;
  isDark: boolean;
  codeBoxBorder: string;
}) {
  const codeBoxBg = isDark ? 'rgba(0,0,0,0.4)' : '#F8FAFC';
  const codeBoxText = isDark ? '#DBEAFE' : '#1E40AF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copy code ${code}`}
      onPress={onCopy}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: codeBoxBorder,
        backgroundColor: codeBoxBg,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ fontFamily: FT.bold, fontSize: 13, color: codeBoxText, letterSpacing: 1 }}>{code}</Text>
      <Copy size={13} color={codeBoxText} />
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Main screen
   ────────────────────────────────────────────────────────────────────────── */

export default function WalletScreen() {
  const router = useRouter();
  const toast = useToast();
  const { isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);
  const { width: winW } = useWindowDimensions();
  const isTablet = winW >= 680;

  const colors = useMemo(() => ({
    bg: isDark ? '#0B1220' : '#F8FAFC',
    card: isDark ? '#111B2E' : '#FFFFFF',
    cardHover: isDark ? '#17253A' : '#F1F5F9',
    border: isDark ? 'rgba(148,163,184,0.18)' : '#E2E8F0',
    border2: isDark ? 'rgba(148,163,184,0.28)' : '#CBD5E1',
    text: isDark ? '#F8FAFC' : '#0F172A',
    text2: isDark ? '#CBD5E1' : '#334155',
    textSub: isDark ? '#94A3B8' : '#64748B',
    dim: isDark ? '#64748B' : '#94A3B8',
    accent: isDark ? '#93C5FD' : '#2563EB',
    accentDeep: isDark ? '#DBEAFE' : '#1E40AF',
    accentSoft: isDark ? 'rgba(59,130,246,0.14)' : '#EFF6FF',
    success: isDark ? '#4ADE80' : '#059669',
    danger: isDark ? '#F87171' : '#DC2626',
    hero: ['#1E3A8A', '#1E40AF', '#2563EB'] as const,
  }), [isDark]);

  const ink = CHART_PALETTE[isDark ? 'dark' : 'light'].ink;
  const cat = CHART_PALETTE[isDark ? 'dark' : 'light'].cat;

  // Portal redirect
  useEffect(() => {
    if (!isEmbedded && initialized && user) {
      if (user.role === 'alumni') router.replace('/alumni-portal?tab=wallet' as any);
      else if (user.role === 'student') router.replace('/student-portal?tab=wallet' as any);
    }
  }, [isEmbedded, initialized, user, router]);

  const [tab, setTab] = useState<'overview' | 'coupons' | 'rewards' | 'analytics' | 'history'>('overview');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // W1 coupons
  const [mineCoupons, setMineCoupons] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'used'>('active');
  const [couponSearch, setCouponSearch] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [instructionModal, setInstructionModal] = useState<any>(null);

  // W2 rewards
  const [rewards, setRewards] = useState<any[]>([]);
  const [redeemHistory, setRedeemHistory] = useState<any[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<{ title: string; code: string; ref: string } | null>(null);

  // W3 analytics
  const [analytics, setAnalytics] = useState<any>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '365d'>('30d');

  // W6 streak
  const [streak, setStreak] = useState<any>(null);

  // Modals
  const [modal, setModal] = useState<null | 'upi' | 'card' | 'withdraw' | 'transfer'>(null);
  const [topupAmount, setTopupAmount] = useState<string>('500');
  const [upiPayment, setUpiPayment] = useState<any>(null);
  const [upiBusy, setUpiBusy] = useState(false);
  const [upiSettled, setUpiSettled] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [wdAmountInr, setWdAmountInr] = useState<string>('');
  const [wdMethod, setWdMethod] = useState<'upi' | 'bank'>('upi');
  const [wdTarget, setWdTarget] = useState<string>('');
  const [wdSubmitting, setWdSubmitting] = useState(false);

  const [xfRecipient, setXfRecipient] = useState<string>('');
  const [xfAmount, setXfAmount] = useState<string>('');
  const [xfNote, setXfNote] = useState<string>('');
  const [xfSubmitting, setXfSubmitting] = useState(false);

  // ── Summary (W0 backend) ──
  const fetchSummary = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const r = await request<any>('/wallet/summary').catch(() => null);
      if (r) setData(r);
      else setData({
        user_id: user?.id || 'demo',
        role: user?.role || 'student',
        full_name: user?.full_name || 'Your Wallet',
        balance_credits: 31250,
        balance_inr: 1250,
        credits_per_inr: 25,
        lifetime_earned: 42500,
        lifetime_spent: 11250,
        topup_bonus_pct: 5,
        level: { level: 4, name: 'Elite', progress_pct: 62, next_level_name: 'Legend', credits_to_next: 4250 },
        streak_days: 12,
        earnings_by_category: [
          { category: 'events', credits: 12500 },
          { category: 'referrals', credits: 8200 },
          { category: 'courses', credits: 5600 },
          { category: 'daily', credits: 4950 },
        ],
        activity_breakdown: [],
        history: [
          { id: 'tx-1', type: 'credit', amount: 50, reason: 'Daily Login Reward', balance_after: 31250, ts: new Date().toISOString() },
          { id: 'tx-2', type: 'debit', amount: 100, reason: 'Redeemed Featherless AI Coupon', balance_after: 31200, ts: new Date(Date.now() - 86400000).toISOString() },
          { id: 'tx-3', type: 'credit', amount: 500, reason: 'Wallet Top-Up ₹20 via UPI', balance_after: 31300, ts: new Date(Date.now() - 172800000).toISOString() },
        ],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // ── W1 coupons ──
  const fetchCoupons = useCallback(async () => {
    try {
      const mine = await request<any>('/wallet/coupons/mine?limit=100').catch(() => null);
      setMineCoupons(mine?.coupons || []);
    } catch { /* keep empty */ }
    try {
      const cat = await request<any>(`/wallet/coupons/catalog?role=${user?.role || 'student'}`).catch(() => null);
      setCatalog((cat?.coupons || []).filter((c: any) => c.active !== false));
    } catch { /* keep empty */ }
  }, [user?.role]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const activeCouponCount = useMemo(() => mineCoupons.filter((c) => c.status === 'active').length, [mineCoupons]);

  const claimCoupon = async (couponId: string) => {
    setClaimingId(couponId);
    try {
      const r = await request<any>('/wallet/coupons/claim', { method: 'POST', body: { coupon_id: couponId } });
      if (r?.ok) {
        toast.success('Coupon Claimed!', `Code ${r.code} added — expires ${fmtDate(r.expires_at)}.`);
        fetchCoupons();
        fetchSummary(true);
      } else {
        toast.warning('Already Claimed', 'This coupon is already in your wallet.');
      }
    } catch (e: any) {
      toast.error('Claim Failed', e?.message || 'Please try again.');
    } finally {
      setClaimingId(null);
    }
  };

  const markCouponUsed = async (userCouponId: string) => {
    try {
      const r = await request<any>('/wallet/coupons/mark-used', { method: 'POST', body: { user_coupon_id: userCouponId } });
      if (r?.ok) {
        setMineCoupons((prev) => prev.map((c) => c.id === userCouponId ? { ...c, status: 'used', used_at: new Date().toISOString() } : c));
        toast.success('Coupon Marked Used', 'Moved to your redeemed history.');
      }
    } catch (e: any) {
      toast.error('Update Failed', e?.message || 'Please try again.');
    }
  };

  const copyCode = (code: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => { /* noop */ });
    }
    toast.success('Code Copied!', `${code} copied to clipboard.`);
  };

  // ── W2 rewards ──
  const fetchRewards = useCallback(async () => {
    try {
      const r = await request<any>('/wallet/rewards').catch(() => null);
      if (r?.rewards) setRewards(r.rewards);
    } catch { /* keep empty */ }
    try {
      const h = await request<any>('/wallet/redeem/history').catch(() => null);
      if (h?.redemptions) setRedeemHistory(h.redemptions);
    } catch { /* keep empty */ }
  }, []);

  useEffect(() => { fetchRewards(); }, [fetchRewards]);

  const redeemReward = async (rewardId: string, title: string) => {
    setRedeemingId(rewardId);
    try {
      const r = await request<any>('/wallet/redeem', { method: 'POST', body: { reward_id: rewardId } });
      if (r?.ok) {
        toast.success('Reward Redeemed!', `Your ${title} code is ready.`);
        setRedeemedCode({ title, code: r.code || '—', ref: r.fulfillment_ref || '' });
        fetchRewards();
        fetchSummary(true);
      } else {
        toast.warning('Not available', 'This reward is out of stock or you hit the daily limit.');
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
        toast.error('Insufficient Credits', 'Top up your wallet to redeem this reward.');
      } else {
        toast.error('Redemption Failed', msg || 'Please try again.');
      }
    } finally {
      setRedeemingId(null);
    }
  };

  // ── W3 analytics ──
  const fetchAnalytics = useCallback(async (p: string) => {
    try {
      const r = await request<any>(`/wallet/analytics?period=${p}`).catch(() => null);
      if (r) setAnalytics(r);
    } catch { /* keep previous */ }
  }, []);

  useEffect(() => { fetchAnalytics(period); }, [fetchAnalytics, period]);

  // ── W6 streak ──
  useEffect(() => {
    request<any>('/wallet/streak').then((r) => setStreak(r)).catch(() => setStreak(null));
  }, [data?.streak_days]);

  // ── UPI top-up polling (W7) ──
  const stopPolling = () => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  };
  useEffect(() => () => { stopPolling(); }, []);

  const startUpiPayment = async () => {
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid top-up amount.');
      return;
    }
    setUpiBusy(true);
    setUpiSettled(false);
    stopPolling();
    try {
      const r = await request<any>(`/wallet/topup/upi?amount_inr=${amt}`);
      if (!r?.ok) {
        toast.error('UPI Not Available', r?.note || 'Could not start UPI payment.');
        setUpiBusy(false);
        return;
      }
      setUpiPayment({ ...r, ref: r.ref });
      let tries = 0;
      pollTimer.current = setInterval(async () => {
        tries += 1;
        if (tries > 40) { stopPolling(); setUpiBusy(false); return; }
        try {
          const s = await request<any>(`/wallet/topup/status/${r.ref}`);
          if (s?.status === 'settled') {
            stopPolling();
            setUpiSettled(true);
            setUpiBusy(false);
            toast.success('Payment Settled!', `₹${amt} credited (+${fmtCredits(s.expected_credits || s.credits || 0)} SA pts).`);
            fetchSummary(true);
            setTimeout(() => { setModal(null); setUpiPayment(null); setUpiSettled(false); }, 900);
          }
        } catch { /* keep polling */ }
      }, 3000);
    } catch (e: any) {
      toast.error('UPI Not Available', e?.message || 'Please try again.');
      setUpiBusy(false);
    }
  };

  const cancelUpiPayment = () => {
    stopPolling();
    setModal(null);
    setUpiPayment(null);
    setUpiSettled(false);
    setUpiBusy(false);
  };

  // ── Card top-up (Razorpay) ──
  const handleCardTopup = async () => {
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid top-up amount.');
      return;
    }
    setCardSubmitting(true);
    try {
      const orderRes = await request<any>('/wallet/topup/create-order', { method: 'POST', body: { amount_inr: amt } });
      if (!orderRes?.ok) {
        toast.error('Payment Failed', orderRes?.detail || 'Could not create payment order.');
        setCardSubmitting(false);
        return;
      }
      const loadSDK = (): Promise<boolean> => {
        if ((window as any).Razorpay) return Promise.resolve(true);
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };
      const sdkLoaded = await loadSDK();
      if (!sdkLoaded) {
        toast.error('Payment Failed', 'Could not load payment gateway. Check your connection.');
        setCardSubmitting(false);
        return;
      }
      const rzp = new (window as any).Razorpay({
        key: orderRes.key_id,
        amount: orderRes.amount * 100,
        currency: 'INR',
        name: 'Student Alumni',
        description: `Wallet Top-Up ₹${amt}`,
        order_id: orderRes.order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await request<any>('/wallet/topup/verify', {
              method: 'POST',
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount_inr: amt,
              },
            });
            if (verifyRes?.ok) {
              toast.success('Top-Up Successful!', `Added ₹${amt} (+${fmtCredits(verifyRes.total_credits || 0)} SA pts).`);
              setModal(null);
              fetchSummary(true);
            } else {
              toast.error('Verification Failed', 'Payment received but verification failed. Contact support.');
            }
          } catch {
            toast.error('Verification Failed', 'Payment received but verification failed. Contact support.');
          }
          setCardSubmitting(false);
        },
        prefill: { name: user?.full_name || user?.name || '', email: user?.email || '' },
        theme: { color: '#2563EB' },
      });
      rzp.on('payment.failed', () => {
        toast.error('Payment Failed', 'Payment was cancelled or failed. Please try again.');
        setCardSubmitting(false);
      });
      rzp.open();
    } catch (e: any) {
      toast.error('Payment Failed', e?.message || 'Something went wrong. Please try again.');
      setCardSubmitting(false);
    }
  };

  // ── Withdraw (W11 backend POST /wallet/withdraw) ──
  const handleWithdraw = async () => {
    const amt = parseFloat(wdAmountInr);
    if (isNaN(amt) || amt < 100) {
      toast.error('Minimum ₹100', 'Minimum withdrawal amount is ₹100.');
      return;
    }
    if (!wdTarget.trim()) {
      toast.error('Target Required', 'Please enter your UPI ID or bank account details.');
      return;
    }
    setWdSubmitting(true);
    try {
      const r = await request<any>('/wallet/withdraw', {
        method: 'POST',
        body: { amount_inr: amt, method: wdMethod, target: wdTarget.trim() },
      });
      if (r?.ok) {
        toast.success('Withdrawal Requested', `₹${amt} is processing — expected in ${r.eta || '24-48h'}.`);
        setModal(null);
        setWdAmountInr('');
        setWdTarget('');
        fetchSummary(true);
      } else {
        toast.error('Withdrawal Failed', r?.detail || 'Please check your details.');
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.toLowerCase().includes('insufficient')) {
        toast.error('Insufficient Balance', 'You do not have enough credits for this withdrawal.');
      } else {
        toast.error('Withdrawal Failed', msg || 'Please try again.');
      }
    } finally {
      setWdSubmitting(false);
    }
  };

  // ── Transfer (W11 backend POST /wallet/transfer) ──
  const handleTransfer = async () => {
    const amt = parseFloat(xfAmount);
    if (isNaN(amt) || amt < 10) {
      toast.error('Minimum 10 SA pts', 'You can transfer a minimum of 10 SA points.');
      return;
    }
    if (amt > 500) {
      toast.error('Maximum 500 SA pts', 'You can transfer a maximum of 500 SA points per transfer.');
      return;
    }
    if (!xfRecipient.trim()) {
      toast.error('Recipient Required', 'Enter the recipient\'s name or user ID.');
      return;
    }
    setXfSubmitting(true);
    try {
      const r = await request<any>('/wallet/transfer', {
        method: 'POST',
        body: { recipient: xfRecipient.trim(), amount: amt, note: xfNote.trim() || undefined },
      });
      if (r?.ok) {
        toast.success('Transfer Sent', `${fmtCredits(amt)} SA pts sent to ${r.recipient?.name || xfRecipient}.`);
        setModal(null);
        setXfRecipient('');
        setXfAmount('');
        setXfNote('');
        fetchSummary(true);
      } else {
        toast.error('Transfer Failed', r?.detail || 'Please check the recipient and amount.');
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('429') || msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('per day')) {
        toast.error('Daily Limit Reached', 'You can send up to 3 transfers per day. Try again tomorrow.');
      } else if (msg.toLowerCase().includes('insufficient')) {
        toast.error('Insufficient Credits', 'You do not have enough credits for this transfer.');
      } else {
        toast.error('Transfer Failed', msg || 'Please try again.');
      }
    } finally {
      setXfSubmitting(false);
    }
  };

  // ── Derived ──
  const balanceInr = data?.balance_inr ?? 0;
  const balanceCredits = data?.balance_credits ?? 0;
  const bonusPct = data?.topup_bonus_pct ?? 5;
  const level = data?.level;

  const filteredMine = useMemo(() => {
    return mineCoupons.filter((c) => {
      if (couponFilter !== 'all' && c.status !== couponFilter) return false;
      const q = couponSearch.toLowerCase();
      if (q && !`${c.coupon?.partner || ''} ${c.coupon?.title || ''} ${c.code || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [mineCoupons, couponFilter, couponSearch]);

  const donutSlices = useMemo(() => {
    const src = analytics?.earnings_by_category || data?.earnings_by_category || [];
    return src.map((s: any, i: number) => ({
      label: s.category,
      value: s.credits || 0,
      color: cat[i % cat.length],
    }));
  }, [analytics, data, cat]);

  const barItems = useMemo(() => {
    const src = analytics?.spending_by_type || [];
    return src.map((s: any) => ({ label: s.type, value: s.credits || 0 }));
  }, [analytics]);

  const trendPoints = useMemo(() => analytics?.trend || [], [analytics]);

  const projection = analytics?.projection;
  const milestones = analytics?.milestones || [];

  // ── Tab bodies ──
  const renderOverview = () => (
    <View style={{ gap: 14 }}>
      {/* Hero balance */}
      <LinearGradient colors={[...colors.hero]} style={{ borderRadius: 18, padding: 18, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontFamily: FT.med, fontSize: 11, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.8 }}>SA Wallet Balance</Text>
            <Text style={{ fontFamily: FT.xbold, fontSize: 30, color: '#FFFFFF', marginTop: 4, lineHeight: 34 }}>{fmtINR(balanceInr)}</Text>
            <Text style={{ fontFamily: FT.reg, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{fmtCredits(balanceCredits)} SA points · 1 pt = ₹{(1 / (data?.credits_per_inr || 25)).toFixed(2)}</Text>
          </View>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={24} color="#FFFFFF" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }}>
          <View>
            <Text style={{ fontFamily: FT.reg, fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lifetime Earned</Text>
            <Text style={{ fontFamily: FT.bold, fontSize: 15, color: '#FFFFFF', marginTop: 2 }}>{fmtCredits(data?.lifetime_earned ?? 0)}</Text>
          </View>
          <View>
            <Text style={{ fontFamily: FT.reg, fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lifetime Spent</Text>
            <Text style={{ fontFamily: FT.bold, fontSize: 15, color: '#FFFFFF', marginTop: 2 }}>{fmtCredits(data?.lifetime_spent ?? 0)}</Text>
          </View>
          {data?.withdraw_threshold_inr ? (
            <View>
              <Text style={{ fontFamily: FT.reg, fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Withdraw At</Text>
              <Text style={{ fontFamily: FT.bold, fontSize: 15, color: '#FFFFFF', marginTop: 2 }}>{fmtINR(data.withdraw_threshold_inr)}</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      {/* Quick actions */}
      <View>
        <SectionHeader title="Quick Actions" sub="Top up, withdraw, or send to a friend" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            { key: 'upi', label: 'UPI Top-Up', sub: `+${bonusPct}% bonus`, Icon: QrCode, tone: colors.accent },
            { key: 'card', label: 'Card Top-Up', sub: 'Razorpay', Icon: CreditCard, tone: colors.success },
            { key: 'withdraw', label: 'Withdraw', sub: 'To UPI / Bank', Icon: ArrowDownLeft, tone: colors.danger },
            { key: 'transfer', label: 'Send to Friend', sub: '10-500 pts', Icon: Send, tone: '#7C3AED' },
          ].map((a) => (
            <Pressable
              key={a.key}
              accessibilityRole="button"
              accessibilityLabel={`${a.label} — ${a.sub}`}
              onPress={() => { setModal(a.key as any); setUpiSettled(false); }}
              style={({ pressed }) => ({
                flex: isTablet ? 1 : 1,
                minWidth: 130,
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{
                width: 38, height: 38, borderRadius: 11,
                backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : colors.cardHover,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <a.Icon size={19} color={a.tone as any} />
              </View>
              <Text style={{ fontFamily: FT.bold, fontSize: 13, color: colors.text, marginTop: 10 }}>{a.label}</Text>
              <Text style={{ fontFamily: FT.reg, fontSize: 11, color: colors.textSub, marginTop: 1 }}>{a.sub}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Earnings breakdown + recent */}
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 280 }}>
          <SectionHeader title="Earnings by Category" />
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' }}>
            <DonutChart slices={donutSlices} trackColor={isDark ? '#17253A' : '#F1F5F9'} ink={ink} centerValue={fmtCredits(donutSlices.reduce((a, s) => a + s.value, 0))} centerLabel="Total pts" />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 280 }}>
          <SectionHeader title="Recent Activity" right={
            <Pressable accessibilityRole="button" onPress={() => setTab('history')} style={{ padding: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontFamily: FT.med, fontSize: 11.5, color: colors.accent }}>View all</Text>
                <ChevronRight size={13} color={colors.accent} />
              </View>
            </Pressable>
          } />
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 4 }}>
            {(data?.history || []).slice(0, 5).map((t: any, i: number) => (
              <View key={t.id || i} style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                padding: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: t.type === 'credit' ? (isDark ? 'rgba(74,222,128,0.14)' : '#ECFDF5') : (isDark ? 'rgba(248,113,113,0.14)' : '#FEF2F2'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.type === 'credit' ? <ArrowUpRight size={16} color={colors.success} /> : <ArrowDownLeft size={16} color={colors.danger} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FT.med, fontSize: 12.5, color: colors.text, overflow: 'hidden' }}>{t.reason}</Text>
                  <Text style={{ fontFamily: FT.reg, fontSize: 10.5, color: colors.textSub, marginTop: 1 }}>{fmtDateTime(t.ts)}</Text>
                </View>
                <Text style={{ fontFamily: FT.bold, fontSize: 13, color: t.type === 'credit' ? colors.success : colors.danger }}>
                  {t.type === 'credit' ? '+' : '-'}{fmtCredits(t.amount)}
                </Text>
              </View>
            ))}
            {(!data?.history || data.history.length === 0) ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontFamily: FT.reg, fontSize: 12, color: colors.textSub }}>No activity yet. Start earning with events, referrals, and logins.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );

  const renderCoupons = () => (
    <View style={{ gap: 14 }}>
      <View>
        <SectionHeader title="My Coupons" sub={`${activeCouponCount} active`} right={
          <Pressable accessibilityRole="button" onPress={() => setInstructionModal({ title: 'How to use coupons', instructions: 'Paste your code at the partner checkout. Codes are single-use and expire as listed. Open the partner website and apply the code in the discount field.' })} style={{ padding: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Info size={13} color={colors.textSub} />
              <Text style={{ fontFamily: FT.med, fontSize: 11.5, color: colors.textSub }}>How it works</Text>
            </View>
          </Pressable>
        } />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {(['active', 'all', 'used'] as const).map((f) => (
            <Chip key={f} label={f[0].toUpperCase() + f.slice(1)} active={couponFilter === f} onPress={() => setCouponFilter(f)} />
          ))}
          <View style={{ flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, gap: 6 }}>
            <Search size={15} color={colors.textSub} />
            <TextInput
              value={couponSearch}
              onChangeText={setCouponSearch}
              placeholder="Search partner or code"
              placeholderTextColor={colors.dim}
              style={{ flex: 1, fontFamily: FT.reg, fontSize: 13, color: colors.text, paddingVertical: 8 }}
            />
            {couponSearch ? (
              <Pressable accessibilityRole="button" onPress={() => setCouponSearch('')}><X size={14} color={colors.textSub} /></Pressable>
            ) : null}
          </View>
        </View>
        {filteredMine.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 24, alignItems: 'center' }}>
            <Tag size={28} color={colors.dim} />
            <Text style={{ fontFamily: FT.med, fontSize: 13, color: colors.text2, marginTop: 8 }}>No coupons here yet.</Text>
            <Text style={{ fontFamily: FT.reg, fontSize: 12, color: colors.textSub, marginTop: 2, textAlign: 'center' }}>Claim one from the catalog below, or earn more credits to unlock premium codes.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredMine.map((c: any) => (
              <View key={c.id} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <BrandLogo partner={c.coupon?.partner || 'Partner'} logo={c.coupon?.logo} size={40} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ fontFamily: FT.bold, fontSize: 13.5, color: colors.text }}>{c.coupon?.partner || 'Partner'}</Text>
                        <View style={{
                          backgroundColor: isDark ? 'rgba(59,130,246,0.16)' : '#EFF6FF',
                          borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
                        }}>
                          <Text style={{ fontFamily: FT.bold, fontSize: 10.5, color: c.status === 'active' ? (isDark ? '#93C5FD' : '#1E40AF') : colors.dim }}>{c.coupon?.display || 'DEAL'}</Text>
                        </View>
                      </View>
                      <Chip
                        label={c.status === 'active' ? 'Active' : c.status === 'used' ? 'Used' : 'Expired'}
                        tone={c.status === 'active' ? 'green' : c.status === 'used' ? 'neutral' : 'amber'}
                      />
                    </View>
                    <Text style={{ fontFamily: FT.reg, fontSize: 12, color: colors.textSub, overflow: 'hidden' }}>{c.coupon?.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <DashedCodeBox
                        code={c.code || '---'}
                        onCopy={() => copyCode(c.code || '')}
                        isDark={isDark}
                        codeBoxBorder={isDark ? 'rgba(30,58,110,0.6)' : '#CBD5E1'}
                      />
                      <Text style={{ fontFamily: FT.reg, fontSize: 11, color: colors.textSub }}>
                        {c.status === 'used' ? `Used ${fmtDate(c.used_at)}` : `Expires ${fmtDate(c.expires_at)}`}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {c.coupon?.url ? (
                    <Pressable accessibilityRole="button" onPress={() => { Linking.openURL(c.coupon.url).catch(() => {}); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, borderRadius: 9, backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : colors.accentSoft }}>
                      <ExternalLink size={13} color={colors.accent} />
                      <Text style={{ fontFamily: FT.med, fontSize: 11.5, color: colors.accent }}>Open Partner</Text>
                    </Pressable>
                  ) : null}
                  {c.status === 'active' ? (
                    <Pressable accessibilityRole="button" onPress={() => markCouponUsed(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, borderRadius: 9, backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : colors.cardHover }}>
                      <Check size={13} color={colors.text2} />
                      <Text style={{ fontFamily: FT.med, fontSize: 11.5, color: colors.text2 }}>Mark as Used</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View>
        <SectionHeader title="Coupon Catalog" sub="Claim premium codes with your credits" />
        {catalog.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 20, alignItems: 'center' }}>
            <Text style={{ fontFamily: FT.reg, fontSize: 12.5, color: colors.textSub }}>No available coupons right now. Check back soon.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {catalog.map((c: any) => {
              const alreadyClaimed = mineCoupons.some((m: any) => m.coupon?.id === c.id);
              const affordable = balanceCredits >= (c.credits_cost || 0);
              return (
                <View key={c.id} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <BrandLogo partner={c.partner} logo={c.logo} size={42} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ fontFamily: FT.bold, fontSize: 13.5, color: colors.text }}>{c.partner}</Text>
                        <View style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontFamily: FT.bold, fontSize: 10.5, color: isDark ? '#4ADE80' : '#047857' }}>{c.display}</Text>
                        </View>
                      </View>
                      <Text style={{ fontFamily: FT.reg, fontSize: 12, color: colors.textSub, overflow: 'hidden' }}>{c.title}</Text>
                      <Text style={{ fontFamily: FT.reg, fontSize: 10.5, color: colors.dim, marginTop: 2 }}>
                        {c.max_claims ? `${c.max_claims - (c.claims || 0)} of ${c.max_claims} claimed · ` : ''}{c.expiry_days ? `Expires in ${c.expiry_days} days` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontFamily: FT.bold, fontSize: 14, color: affordable ? colors.text : colors.danger }}>{fmtCredits(c.credits_cost || 0)}</Text>
                      <Text style={{ fontFamily: FT.reg, fontSize: 9.5, color: colors.dim, marginTop: 1 }}>pts</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    {alreadyClaimed ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, borderRadius: 9, backgroundColor: isDark ? 'rgba(16,185,129,0.14)' : '#ECFDF5' }}>
                        <CheckCircle2 size={14} color={colors.success} />
                        <Text style={{ fontFamily: FT.med, fontSize: 11.5, color: colors.success }}>Already in your wallet</Text>
                      </View>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Claim ${c.partner} coupon for ${c.credits_cost} points`}
                        disabled={!affordable || claimingId === c.id}
                        onPress={() => claimCoupon(c.id)}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          padding: 9, borderRadius: 10,
                          backgroundColor: affordable ? colors.accent : colors.dim,
                          opacity: (pressed || claimingId === c.id) ? 0.85 : 1,
                        })}
                      >
                        {claimingId === c.id
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Gift size={14} color="#fff" />}
                        <Text style={{ fontFamily: FT.bold, fontSize: 12, color: '#fff' }}>
                          {affordable ? 'Claim' : 'Not enough credits'}
                        </Text>
                      </Pressable>
                    )}
                    {c.url ? (
                      <Pressable accessibilityRole="button" onPress={() => { Linking.openURL(c.url).catch(() => {}); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 9, borderRadius: 10, backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : colors.cardHover }}>
                        <ExternalLink size={13} color={colors.text2} />
                        <Text style={{ fontFamily: FT.med, fontSize: 11.5, color: colors.text2 }}>Visit</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );

  const renderRewards = () => (
    <View style={{ gap: 14 }}>
      <View>
        <SectionHeader title="Reward Marketplace" sub="Spend your credits on real perks" />
        {rewards.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 24, alignItems: 'center' }}>
            <Award size={28} color={colors.dim} />
            <Text style={{ fontFamily: FT.med, fontSize: 13, color: colors.text2, marginTop: 8 }}>No rewards available right now.</Text>
            <Text style={{ fontFamily: FT.reg, fontSize: 12, color: colors.textSub, marginTop: 2 }}>Earn more credits and check back.</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {rewards.map((r: any) => {
              const affordable = balanceCredits >= r.cost;
              const out = r.stock_remaining !== undefined ? r.stock_remaining <= 0 : false;
              const limited = r.daily_limit && r.used_today >= r.daily_limit;
              return (
                <View key={r.id} style={{
                  flex: 1, minWidth: 240, maxWidth: 420,
                  backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
                  borderRadius: 16, padding: 16,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? 'rgba(59,130,246,0.14)' : colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Gift size={20} color={colors.accent} />
                    </View>
                    {r.hot ? (
                      <View style={{ backgroundColor: isDark ? 'rgba(251,146,60,0.18)' : '#FFF7ED', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Flame size={12} color={isDark ? '#FB923C' : '#C2410C'} />
                        <Text style={{ fontFamily: FT.bold, fontSize: 10, color: isDark ? '#FB923C' : '#C2410C' }}>HOT</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontFamily: FT.bold, fontSize: 14, color: colors.text, marginTop: 12 }}>{r.title}</Text>
                  <Text style={{ fontFamily: FT.reg, fontSize: 12, color: colors.textSub, marginTop: 4, lineHeight: 16 }}>{r.desc}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    <View>
                      <Text style={{ fontFamily: FT.xbold, fontSize: 17, color: affordable ? colors.text : colors.danger }}>{fmtCredits(r.cost)}</Text>
                      <Text style={{ fontFamily: FT.reg, fontSize: 9.5, color: colors.dim, marginTop: 1 }}>SA points</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Redeem ${r.title} for ${r.cost} points`}
                      disabled={!affordable || out || limited || redeemingId === r.id}
                      onPress={() => redeemReward(r.id, r.title)}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10,
                        backgroundColor: (!affordable || out || limited) ? colors.dim : colors.accent,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      {redeemingId === r.id ? <ActivityIndicator size="small" color="#fff" /> : <Zap size={14} color="#fff" />}
                      <Text style={{ fontFamily: FT.bold, fontSize: 12, color: '#fff' }}>
                        {!affordable ? 'Need more' : out ? 'Sold out' : limited ? 'Limit hit' : 'Redeem'}
                      </Text>
                    </Pressable>
                  </View>
                  {r.stock_remaining !== undefined && !out ? (
                    <Text style={{ fontFamily: FT.reg, fontSize: 10.5, color: colors.dim, marginTop: 8 }}>{r.stock_remaining} left</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {redeemHistory.length > 0 ? (
        <View>
          <SectionHeader title="Redemption History" />
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 4 }}>
            {redeemHistory.slice(0, 10).map((h: any) => (
              <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(74,222,128,0.14)' : '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FT.med, fontSize: 12.5, color: colors.text, overflow: 'hidden' }}>{h.title}</Text>
                  <Text style={{ fontFamily: FT.reg, fontSize: 10.5, color: colors.textSub, marginTop: 1 }}>{fmtDateTime(h.ts)} · {fmtCredits(h.cost_credits)} pts</Text>
                </View>
                {h.code ? <Text style={{ fontFamily: FT.bold, fontSize: 11.5, color: colors.accentDeep }}>{h.code}</Text> : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderAnalytics = () => (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionHeader title="Analytics" sub={period.toUpperCase()} />
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {(['7d', '30d', '90d', '365d'] as const).map((p) => (
            <Chip key={p} label={p === '365d' ? '1Y' : p === '90d' ? '90D' : p.toUpperCase()} active={period === p} onPress={() => setPeriod(p)} />
          ))}
        </View>
      </View>

      {/* Summary tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          { label: 'Earned', value: fmtCredits(analytics?.summary?.earned ?? 0), Icon: TrendingUp, tone: colors.success },
          { label: 'Spent', value: fmtCredits(analytics?.summary?.spent ?? 0), Icon: TrendingUp, tone: colors.danger },
          { label: 'Net', value: `${(analytics?.summary?.net ?? 0) >= 0 ? '+' : ''}${fmtCredits(analytics?.summary?.net ?? 0)}`, Icon: Target, tone: colors.accent },
          { label: 'Balance', value: fmtCredits(analytics?.summary?.balance_credits ?? balanceCredits), Icon: Wallet, tone: colors.text2 },
        ].map((t) => (
          <View key={t.label} style={{ flex: 1, minWidth: 120, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 13, padding: 13 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <t.Icon size={14} color={t.tone as any} />
              <Text style={{ fontFamily: FT.med, fontSize: 11, color: colors.textSub, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.label}</Text>
            </View>
            <Text style={{ fontFamily: FT.xbold, fontSize: 18, color: colors.text, marginTop: 8 }}>{t.value}</Text>
          </View>
        ))}
      </View>

      {/* Charts */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <View style={{ flex: 1, minWidth: 280, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center' }}>
          <SectionHeader title="Earnings by Category" />
          <DonutChart slices={donutSlices} trackColor={isDark ? '#17253A' : '#F1F5F9'} ink={ink} centerValue={fmtCredits(donutSlices.reduce((a, s) => a + s.value, 0))} centerLabel="pts" />
        </View>
        <View style={{ flex: 1, minWidth: 280, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center' }}>
          <SectionHeader title="Spending by Type" />
          <View style={{ width: '100%', alignItems: 'center' }}>
            <BarsChart items={barItems} width={Math.min(340, winW - 80)} barColor={cat[1]} ink={ink} />
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16 }}>
        <SectionHeader title="Trend" sub={`in · out · net over ${period}`} />
        <View style={{ width: '100%' }}>
          <TrendLines points={trendPoints} width={Math.min(640, winW - 80)} colors={{ in: cat[0], out: cat[1], net: cat[2] }} ink={ink} gridColor={ink.grid} />
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          {[{ k: 'in', l: 'In', c: cat[0] }, { k: 'out', l: 'Out', c: cat[1] }, { k: 'net', l: 'Net', c: cat[2] }].map((s) => (
            <View key={s.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.c }} />
              <Text style={{ fontFamily: FT.med, fontSize: 11, color: ink.secondary }}>{s.l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Projection + milestones */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <View style={{ flex: 1, minWidth: 280, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16 }}>
          <SectionHeader title="Level Projection" sub={projection?.note} />
          {projection ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: FT.med, fontSize: 12.5, color: colors.text2 }}>{projection.current_level_name} → {projection.next_level_name || 'Max'}</Text>
                <Text style={{ fontFamily: FT.bold, fontSize: 12.5, color: colors.accent }}>
                  {projection.eta_days != null ? `${projection.eta_days} days` : projection.note || '—'}
                </Text>
              </View>
              <Text style={{ fontFamily: FT.reg, fontSize: 11.5, color: colors.textSub }}>
                Daily rate {fmtCredits(projection.daily_rate_credits || 0)} pts · need {fmtCredits(projection.credits_to_next || 0)} more
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: FT.reg, fontSize: 12, color: colors.textSub }}>Not enough data to project yet. Keep earning!</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 280, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16 }}>
          <SectionHeader title="Milestones" />
          <View style={{ gap: 9 }}>
            {(milestones.length ? milestones : (level ? [{ level, name: level.name, icon: 'award', color: level.color, threshold: level.next_level_at, achieved: level.progress_pct >= 100, current: balanceCredits }] : [])).map((m: any, i: number) => {
              const done = m.achieved || m.progress_pct >= 100;
              return (
                <View key={`${m.level}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 9,
                    backgroundColor: done ? (isDark ? 'rgba(74,222,128,0.16)' : '#ECFDF5') : (isDark ? 'rgba(148,163,184,0.12)' : colors.cardHover),
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Star size={14} color={done ? colors.success : colors.dim} fill={done ? colors.success : 'transparent'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.text }}>{m.name} {m.level ? `· Lv ${m.level}` : ''}</Text>
                    <Text style={{ fontFamily: FT.reg, fontSize: 10.5, color: colors.textSub, marginTop: 1 }}>
                      {done ? 'Achieved' : `${fmtCredits(m.current ?? 0)} / ${fmtCredits(m.threshold ?? 0)} pts`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );

  const renderHistory = () => {
    const rows = data?.history || [];
    return (
      <View>
        <SectionHeader title="Transaction History" sub={`${rows.length} entries`} right={
          <Pressable accessibilityRole="button" onPress={() => fetchSummary(false)} style={{ padding: 4 }}>
            <RefreshCw size={14} color={colors.textSub} />
          </Pressable>
        } />
        <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 4 }}>
          {rows.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontFamily: FT.reg, fontSize: 12.5, color: colors.textSub }}>No transactions yet.</Text>
            </View>
          ) : rows.map((t: any, i: number) => (
            <View key={t.id || i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 13, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border,
            }}>
              <View style={{
                width: 36, height: 36, borderRadius: 11,
                backgroundColor: t.type === 'credit' ? (isDark ? 'rgba(74,222,128,0.14)' : '#ECFDF5') : (isDark ? 'rgba(248,113,113,0.14)' : '#FEF2F2'),
                alignItems: 'center', justifyContent: 'center',
              }}>
                {t.type === 'credit' ? <ArrowUpRight size={17} color={colors.success} /> : <ArrowDownLeft size={17} color={colors.danger} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FT.med, fontSize: 13, color: colors.text, overflow: 'hidden' }}>{t.reason}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <Clock size={11} color={colors.dim} />
                  <Text style={{ fontFamily: FT.reg, fontSize: 10.5, color: colors.textSub }}>{fmtDateTime(t.ts)}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: FT.bold, fontSize: 13.5, color: t.type === 'credit' ? colors.success : colors.danger }}>
                  {t.type === 'credit' ? '+' : '-'}{fmtCredits(t.amount)}
                </Text>
                <Text style={{ fontFamily: FT.reg, fontSize: 10, color: colors.dim, marginTop: 2 }}>Bal {fmtCredits(t.balance_after ?? 0)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const TABS: { key: typeof tab; label: string; Icon: any }[] = [
    { key: 'overview', label: 'Overview', Icon: Wallet },
    { key: 'coupons', label: 'Coupons', Icon: Tag },
    { key: 'rewards', label: 'Rewards', Icon: Gift },
    { key: 'analytics', label: 'Analytics', Icon: TrendingUp },
    { key: 'history', label: 'History', Icon: Clock },
  ];

  return (
    <View style={[s.shell, { backgroundColor: colors.bg }]}>
      <View style={s.container}>
        {/* KPI strip */}
        <View style={[s.kpiRow, { justifyContent: isTablet ? 'flex-start' : 'space-between' }]}>
          <KpiCard icon={<Wallet />} label="Balance" value={fmtINR(balanceInr)} sub={`${fmtCredits(balanceCredits)} SA points`} accent />
          <KpiCard icon={<Award />} label="Rewards Level" value={level?.name || '—'} sub={level?.next_level_name ? `Next: ${level.next_level_name}` : 'Max level'}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(148,163,184,0.16)' : '#E2E8F0', overflow: 'hidden' }}>
              <View style={{
                height: '100%', width: `${Math.min(100, level?.progress_pct ?? 0)}%`,
                borderRadius: 3, backgroundColor: level?.color || colors.accent,
              }} />
            </View>
            <Text style={{ fontFamily: FT.reg, fontSize: 10, color: colors.textSub, marginTop: 4 }}>
              {level?.credits_to_next ? `${fmtCredits(level.credits_to_next)} pts to ${level.next_level_name}` : 'Top tier reached'}
            </Text>
          </KpiCard>
          <KpiCard icon={<Tag />} label="Active Coupons" value={String(activeCouponCount)} sub={`${catalog.length} in catalog`} />
          <KpiCard icon={<Flame />} label="Login Streak" value={`${streak?.current ?? data?.streak_days ?? 0} days`} sub={streak?.recoverable ? `Missed? Recover for ${streak.recovery_cost} pts` : 'Keep it going'}>
            <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap', maxHeight: 26 }}>
              {(streak?.calendar || []).slice(0, 21).map((d: any, i: number) => (
                <View key={`${d.date}-${i}`} style={{
                  width: 11, height: 11, borderRadius: 3,
                  backgroundColor: d.active ? colors.success : (d.recovered ? colors.accent : (isDark ? 'rgba(148,163,184,0.18)' : '#E2E8F0')),
                }} />
              ))}
            </View>
          </KpiCard>
        </View>

        {/* Tab strip */}
        <View style={s.tabStrip}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.key }}
              onPress={() => setTab(t.key)}
              style={({ pressed }) => ([
                s.tabItem,
                tab === t.key ? s.tabItemActive : s.tabItemInactive,
                { backgroundColor: tab === t.key ? (isDark ? 'rgba(59,130,246,0.18)' : colors.accentSoft) : colors.card, opacity: pressed ? 0.9 : 1 },
              ])}
            >
              <t.Icon size={15} color={tab === t.key ? colors.accent : colors.textSub} />
              <Text style={{ fontFamily: FT.med, fontSize: 12, color: tab === t.key ? colors.accent : colors.text2, marginLeft: 6 }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Content */}
        {loading ? (
          <View style={s.loader}><ActivityIndicator size="large" color={colors.accent} /></View>
        ) : (
          <View>
            {tab === 'overview' && renderOverview()}
            {tab === 'coupons' && renderCoupons()}
            {tab === 'rewards' && renderRewards()}
            {tab === 'analytics' && renderAnalytics()}
            {tab === 'history' && renderHistory()}
          </View>
        )}
      </View>

      {/* ── UPI / Card Top-Up Modal ── */}
      <Modal visible={modal === 'upi' || modal === 'card'} transparent animationType="fade" onRequestClose={() => { setModal(null); setUpiPayment(null); setUpiSettled(false); }}>
        <View style={[s.modalWrap, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxWidth: 460 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontFamily: FT.xbold, fontSize: 17, color: colors.text }}>{modal === 'upi' ? 'UPI Top-Up' : 'Card Top-Up'}</Text>
                <Text style={{ fontFamily: FT.reg, fontSize: 11.5, color: colors.textSub, marginTop: 2 }}>{modal === 'upi' ? `Earn a ${bonusPct}% bonus on UPI payments` : 'Pay securely via Razorpay'}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => { setModal(null); cancelUpiPayment(); }} style={s.modalClose}>
                <X size={18} color={colors.text2} />
              </Pressable>
            </View>

            <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.text2, marginBottom: 8 }}>Amount (₹)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {TOPUP_PRESETS.map((p) => (
                <Chip key={p} label={fmtINR(p)} active={topupAmount === String(p)} onPress={() => setTopupAmount(String(p))} />
              ))}
            </View>
            <TextInput
              value={topupAmount}
              onChangeText={setTopupAmount}
              keyboardType="numeric"
              placeholder="Custom amount"
              placeholderTextColor={colors.dim}
              style={[s.input, { backgroundColor: colors.cardHover, borderColor: colors.border, color: colors.text }]}
              maxLength={6}
            />
            <Text style={{ fontFamily: FT.reg, fontSize: 11.5, color: colors.textSub, marginTop: 8, marginBottom: 16 }}>
              You will receive {fmtCredits((parseFloat(topupAmount) || 0) * (data?.credits_per_inr || 25))} SA pts ({bonusPct}% bonus included).
            </Text>

            {modal === 'upi' ? (
              upiPayment ? (
                <View style={{ gap: 14 }}>
                  {upiSettled ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: isDark ? 'rgba(74,222,128,0.14)' : '#ECFDF5' }}>
                      <CheckCircle2 size={20} color={colors.success} />
                      <Text style={{ fontFamily: FT.med, fontSize: 13, color: colors.success }}>Payment settled — {fmtCredits(upiPayment.expected_credits || 0)} pts credited.</Text>
                    </View>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
                        {upiPayment.upi?.qr_payload ? <QRCode value={upiPayment.upi.qr_payload} size={148} color={isDark ? '#FFFFFF' : '#0F172A'} backgroundColor={isDark ? '#111B2E' : '#FFFFFF'} /> : null}
                        <View style={{ gap: 8, flex: 1, minWidth: 150 }}>
                          <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.text2 }}>Pay via any UPI app</Text>
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            {(upiPayment.upi?.apps || []).map((a: any) => (
                              <Pressable key={a.id} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, borderRadius: 9, backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : colors.cardHover, opacity: pressed ? 0.85 : 1 })}>
                                <MaterialCommunityIcons name={(UPI_ICON_BY_APP[a.id] || 'wallet-outline') as any} size={15} color={colors.accent} />
                                <Text style={{ fontFamily: FT.med, fontSize: 11.5, color: colors.text2 }}>{a.name}</Text>
                              </Pressable>
                            ))}
                          </View>
                          {upiPayment.upi?.deep_link ? (
                            <Pressable accessibilityRole="button" onPress={() => { Linking.openURL(upiPayment.upi.deep_link).catch(() => { toast.warning('Open UPI app', 'No UPI app found on this device.'); }); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 })}>
                              <ExternalLink size={14} color="#fff" />
                              <Text style={{ fontFamily: FT.bold, fontSize: 12, color: '#fff' }}>Open UPI App</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable accessibilityRole="button" onPress={() => { setUpiPayment({ ...upiPayment, status: 'checking' }); toast.info('Checking status', 'Waiting for your UPI payment to settle…'); }} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 11, borderRadius: 10, backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : colors.cardHover, opacity: pressed ? 0.9 : 1 })}>
                          <RefreshCw size={14} color={colors.text2} />
                          <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.text2 }}>Check Status</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={cancelUpiPayment} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 11, borderRadius: 10, backgroundColor: isDark ? 'rgba(248,113,113,0.14)' : '#FEF2F2', opacity: pressed ? 0.9 : 1 })}>
                          <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.danger }}>Cancel</Text>
                        </Pressable>
                      </View>
                      {upiBusy ? <ActivityIndicator size="small" color={colors.accent} style={{ alignSelf: 'center' }} /> : null}
                    </>
                  )}
                </View>
              ) : (
                <Pressable accessibilityRole="button" disabled={upiBusy} onPress={startUpiPayment} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 11, backgroundColor: upiBusy ? colors.dim : colors.accent, opacity: pressed ? 0.9 : 1 })}>
                  <QrCode size={16} color="#fff" />
                  <Text style={{ fontFamily: FT.bold, fontSize: 13, color: '#fff' }}>{upiBusy ? 'Starting…' : 'Generate UPI Payment'}</Text>
                </Pressable>
              )
            ) : (
              <Pressable accessibilityRole="button" disabled={cardSubmitting} onPress={handleCardTopup} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 11, backgroundColor: cardSubmitting ? colors.dim : colors.accent, opacity: pressed ? 0.9 : 1 })}>
                {cardSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <CreditCard size={16} color="#fff" />}
                <Text style={{ fontFamily: FT.bold, fontSize: 13, color: '#fff' }}>{cardSubmitting ? 'Processing…' : 'Pay with Card'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Withdraw Modal ── */}
      <Modal visible={modal === 'withdraw'} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={[s.modalWrap, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxWidth: 440 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: FT.xbold, fontSize: 17, color: colors.text }}>Withdraw</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setModal(null)} style={s.modalClose}><X size={18} color={colors.text2} /></Pressable>
            </View>
            <Text style={{ fontFamily: FT.reg, fontSize: 12, color: colors.textSub, marginBottom: 14 }}>
              Balance: {fmtINR(balanceInr)} · Minimum ₹100 · Processed to your chosen method.
            </Text>
            <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.text2, marginBottom: 8 }}>Amount (₹)</Text>
            <TextInput
              value={wdAmountInr}
              onChangeText={setWdAmountInr}
              keyboardType="numeric"
              placeholder="e.g. 500"
              placeholderTextColor={colors.dim}
              style={[s.input, { backgroundColor: colors.cardHover, borderColor: colors.border, color: colors.text }]}
            />
            <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.text2, marginTop: 14, marginBottom: 8 }}>Method</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <Chip label="UPI" active={wdMethod === 'upi'} onPress={() => setWdMethod('upi')} />
              <Chip label="Bank" active={wdMethod === 'bank'} onPress={() => setWdMethod('bank')} />
            </View>
            <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.text2, marginBottom: 8 }}>{wdMethod === 'upi' ? 'UPI ID' : 'Bank Account'}</Text>
            <TextInput
              value={wdTarget}
              onChangeText={setWdTarget}
              placeholder={wdMethod === 'upi' ? 'name@upi' : 'Account • IFSC'}
              placeholderTextColor={colors.dim}
              autoCapitalize="none"
              style={[s.input, { backgroundColor: colors.cardHover, borderColor: colors.border, color: colors.text }]}
            />
            <Pressable accessibilityRole="button" disabled={wdSubmitting} onPress={handleWithdraw} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 13, borderRadius: 11, backgroundColor: wdSubmitting ? colors.dim : colors.accent, opacity: pressed ? 0.9 : 1 })}>
              {wdSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <ArrowDownLeft size={16} color="#fff" />}
              <Text style={{ fontFamily: FT.bold, fontSize: 13, color: '#fff' }}>{wdSubmitting ? 'Submitting…' : 'Request Withdrawal'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Transfer Modal ── */}
      <Modal visible={modal === 'transfer'} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={[s.modalWrap, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxWidth: 440 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: FT.xbold, fontSize: 17, color: colors.text }}>Send to a Friend</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setModal(null)} style={s.modalClose}><X size={18} color={colors.text2} /></Pressable>
            </View>
            <Text style={{ fontFamily: FT.reg, fontSize: 12, color: colors.textSub, marginBottom: 14 }}>
              Balance: {fmtCredits(balanceCredits)} SA pts · 10-500 pts per transfer · up to 3 per day.
            </Text>
            <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.text2, marginBottom: 8 }}>Recipient (name or ID)</Text>
            <TextInput
              value={xfRecipient}
              onChangeText={setXfRecipient}
              placeholder="e.g. Tejas K. or user_123"
              placeholderTextColor={colors.dim}
              style={[s.input, { backgroundColor: colors.cardHover, borderColor: colors.border, color: colors.text }]}
            />
            <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.text2, marginTop: 14, marginBottom: 8 }}>Amount (SA pts)</Text>
            <TextInput
              value={xfAmount}
              onChangeText={setXfAmount}
              keyboardType="numeric"
              placeholder="e.g. 100"
              placeholderTextColor={colors.dim}
              style={[s.input, { backgroundColor: colors.cardHover, borderColor: colors.border, color: colors.text }]}
              maxLength={4}
            />
            <Text style={{ fontFamily: FT.med, fontSize: 12, color: colors.text2, marginTop: 14, marginBottom: 8 }}>Note (optional)</Text>
            <TextInput
              value={xfNote}
              onChangeText={setXfNote}
              placeholder="Thanks for the referral!"
              placeholderTextColor={colors.dim}
              style={[s.input, { backgroundColor: colors.cardHover, borderColor: colors.border, color: colors.text }]}
            />
            <Pressable accessibilityRole="button" disabled={xfSubmitting} onPress={handleTransfer} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 13, borderRadius: 11, backgroundColor: xfSubmitting ? colors.dim : colors.accent, opacity: pressed ? 0.9 : 1 })}>
              {xfSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Send size={16} color="#fff" />}
              <Text style={{ fontFamily: FT.bold, fontSize: 13, color: '#fff' }}>{xfSubmitting ? 'Sending…' : 'Send Points'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Redeemed code reveal ── */}
      <Modal visible={!!redeemedCode} transparent animationType="fade" onRequestClose={() => setRedeemedCode(null)}>
        <View style={[s.modalWrap, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxWidth: 400, alignItems: 'center' }]}>
            <View style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: isDark ? 'rgba(74,222,128,0.16)' : '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <CheckCircle2 size={28} color={colors.success} />
            </View>
            <Text style={{ fontFamily: FT.xbold, fontSize: 17, color: colors.text }}>Reward Redeemed</Text>
            <Text style={{ fontFamily: FT.reg, fontSize: 12.5, color: colors.textSub, marginTop: 4, textAlign: 'center' }}>{redeemedCode?.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border2, backgroundColor: colors.cardHover, width: '100%' }}>
              <Text style={{ fontFamily: FT.xbold, fontSize: 20, color: colors.accentDeep, letterSpacing: 2, flex: 1, textAlign: 'center' }}>{redeemedCode?.code}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Copy code" onPress={() => copyCode(redeemedCode?.code || '')} style={{ padding: 4 }}>
                <Copy size={17} color={colors.accent} />
              </Pressable>
            </View>
            {redeemedCode?.ref ? <Text style={{ fontFamily: FT.reg, fontSize: 10.5, color: colors.dim, marginTop: 8 }}>Ref: {redeemedCode.ref}</Text> : null}
            <Pressable accessibilityRole="button" onPress={() => setRedeemedCode(null)} style={({ pressed }) => ({ marginTop: 18, paddingVertical: 11, paddingHorizontal: 24, borderRadius: 10, backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 })}>
              <Text style={{ fontFamily: FT.bold, fontSize: 13, color: '#fff' }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Instruction modal ── */}
      <Modal visible={!!instructionModal} transparent animationType="fade" onRequestClose={() => setInstructionModal(null)}>
        <View style={[s.modalWrap, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxWidth: 420 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: FT.xbold, fontSize: 16, color: colors.text }}>{instructionModal?.title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setInstructionModal(null)} style={s.modalClose}><X size={17} color={colors.text2} /></Pressable>
            </View>
            <Text style={{ fontFamily: FT.reg, fontSize: 13, color: colors.text2, lineHeight: 20 }}>{instructionModal?.instructions}</Text>
          </View>
        </View>
      </Modal>

      {/* Money Coach — single instance at root */}
      <MoneyCoach />
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Styles
   ────────────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, padding: 18, gap: 16 },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  tabStrip: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tabItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: 11, borderWidth: 1,
  },
  tabItemActive: {},
  tabItemInactive: {},
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalCard: { width: '100%', borderRadius: 18, borderWidth: 1, padding: 20 },
  modalClose: {
    width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: FT.reg, fontSize: 13,
  },
});
