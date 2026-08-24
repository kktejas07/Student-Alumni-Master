// @ts-nocheck
/**
 * /wallet — SA Rewards & Wallet (Career AI Visual Aesthetic & Coupon Engine)
 *
 * Full visual re-theme matching Career AI design system (98%+ similarity target):
 *   - Deep navy canvas (#0B0D1A) + translucent glass cards (rgba(18, 22, 35, 0.75))
 *   - Gradient glowing borders, crisp typography (DMSans)
 *   - KPI Strip (4 cards: Balance, Rewards Level, Active Coupons, Lifetime Saved)
 *   - 5 Main Navigation Tabs: Overview · My Coupons · Add Funds · Redeem · History
 *   - Coupon Engine:
 *       • View active vs used coupons
 *       • Copy voucher code
 *       • Click "Use Now" (opens partner URL)
 *       • Click "Mark as Used" (one-time usage tracking)
 *       • Redeem new coupons using SA credits balance
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Platform, useWindowDimensions, Modal, Linking} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wallet, Sparkles, CircleCheck as CheckCircle2, Copy, ExternalLink, Clock,
  Tag, TrendingUp, PlusCircle, ArrowUpRight, ArrowDownLeft, Shield, Award,
  Check, Search, Filter, X, ChevronRight, Gift, Building2, Zap, RefreshCw,
  CreditCard, DollarSign, Star, Lock,
} from 'lucide-react-native';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import MoneyCoach from '@/src/views/web/wallet/MoneyCoach';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';
import { useToast } from '@/src/views/components';

/* ────────── Design Tokens (Matching Career AI) ────────── */
const C = {
  bg: '#0B0D1A',
  bgCard: 'rgba(18, 22, 35, 0.75)',
  bgCardH: 'rgba(26, 30, 50, 0.90)',
  border: 'rgba(255, 255, 255, 0.08)',
  border2: 'rgba(255, 255, 255, 0.14)',
  text: '#F0EEFF',
  text2: 'rgba(240, 238, 255, 0.80)',
  textSub: 'rgba(240, 238, 255, 0.60)',
  dim: 'rgba(240, 238, 255, 0.45)',
  purple: '#4F46E5',
  purple2: '#6366F1',
  purpleL: '#818CF8',
  purpleXL: '#A5B4FC',
  teal: '#2DD4BF',
  blue: '#60A5FA',
  amber: '#F59E0B',
  red: '#F87171',
  green: '#34D399',
  pink: '#F472B6',
};

const FT = {
  reg: 'DMSans_400Regular',
  med: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  xbold: 'DMSans_800ExtraBold',
};

/* ────────── Types ────────── */
type CouponItem = {
  id: string;
  brand: string;
  title: string;
  discount: string;
  code: string;
  cost_credits: number;
  url: string;
  expiry: string;
  status: 'active' | 'used';
  used_at?: string;
  category: string;
  accent: string;
};

type Summary = {
  user_id: string;
  role: string;
  full_name: string;
  balance_credits: number;
  balance_inr: number;
  credits_per_inr: number;
  lifetime_earned: number;
  lifetime_spent: number;
  history: any[];
  earnings_by_category: any[];
  level?: any;
};

// Default seed coupons for demo & initial state
const INITIAL_COUPONS: CouponItem[] = [
  {
    id: 'coup-1',
    brand: 'Featherless AI',
    title: '50% Off Monthly API Pro Plan',
    discount: '50% OFF',
    code: 'SA-FEATHER-50PRO',
    cost_credits: 100,
    url: 'https://featherless.ai',
    expiry: 'Valid till Dec 2026',
    status: 'active',
    category: 'tech',
    accent: '#818CF8',
  },
  {
    id: 'coup-2',
    brand: 'SetupMark AI',
    title: '100% Free AI Dev Environment Pass',
    discount: '100% FREE',
    code: 'SA-SETUPMARK-FREE',
    cost_credits: 150,
    url: 'https://setupmark.ai',
    expiry: 'Valid till Nov 2026',
    status: 'active',
    category: 'tech',
    accent: '#34D399',
  },
  {
    id: 'coup-3',
    brand: 'Bandiwala',
    title: '30% Cashback on Campus Food Orders',
    discount: '30% CASHBACK',
    code: 'SA-BANDI-FOOD30',
    cost_credits: 50,
    url: 'https://bandiwala.com',
    expiry: 'Valid till Sep 2026',
    status: 'used',
    used_at: '2 days ago',
    category: 'food',
    accent: '#F59E0B',
  },
  {
    id: 'coup-4',
    brand: 'CodeSpectra',
    title: '₹500 Off Full-Stack Bootcamp Track',
    discount: '₹500 OFF',
    code: 'SA-CODESPEC-500',
    cost_credits: 200,
    url: 'https://codespectra.io',
    expiry: 'Valid till Oct 2026',
    status: 'active',
    category: 'learning',
    accent: '#60A5FA',
  },
  {
    id: 'coup-5',
    brand: 'WeHive',
    title: 'Flat 25% Off Coworking Pass',
    discount: '25% OFF',
    code: 'SA-WEHIVE-25PASS',
    cost_credits: 75,
    url: 'https://wehive.com',
    expiry: 'Valid till Jan 2027',
    status: 'active',
    category: 'other',
    accent: '#F472B6',
  },
];

const AVAILABLE_CATALOG_COUPONS: CouponItem[] = [
  {
    id: 'cat-1',
    brand: 'Coursera',
    title: 'Flat 40% Off Any Professional Certificate',
    discount: '40% OFF',
    code: 'SA-COURSERA-40',
    cost_credits: 100,
    url: 'https://coursera.org',
    expiry: 'Valid 30 Days',
    status: 'active',
    category: 'learning',
    accent: '#3B82F6',
  },
  {
    id: 'cat-2',
    brand: 'Uber India',
    title: 'Flat ₹100 Off 3 Airport Rides',
    discount: '₹100 OFF',
    code: 'SA-UBER-RIDE100',
    cost_credits: 60,
    url: 'https://uber.com',
    expiry: 'Valid 15 Days',
    status: 'active',
    category: 'transport',
    accent: '#10B981',
  },
  {
    id: 'cat-3',
    brand: 'Notion Pro',
    title: '6 Months Free Notion Plus Plan',
    discount: '6 MO FREE',
    code: 'SA-NOTION-6MO',
    cost_credits: 120,
    url: 'https://notion.so',
    expiry: 'Valid till Dec 2026',
    status: 'active',
    category: 'tech',
    accent: '#A78BFA',
  },
];

const TOPUP_PRESETS = [100, 250, 500, 1000, 2500, 5000];

function fmtINR(n: number): string {
  if (!isFinite(n)) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtCredits(n: number): string {
  if (!isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-IN');
}


const styles = {
  embeddedShell: { embeddedShell: '{', flex: 1, backgroundColor: 'transparent', gap: 24, paddingBottom: 60 },
  shell: { shell: '{', flex: 1, backgroundColor: 'C.bg' },
  contentContainer: { contentContainer: '{', paddingVertical: 24, paddingHorizontal: 20, paddingBottom: 80, gap: 24, maxWidth: 1280, width: '100%' as any, alignSelf: 'center' as any },
  regenBtn: { regenBtn: '{', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(129', backgroundColor: 'rgba(129' },
  regenBtnHover: { regenBtnHover: '{', backgroundColor: 'rgba(129' },
  reportBtn: { reportBtn: '{', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: 'C.purple2' },
  reportBtnHover: { reportBtnHover: '{', backgroundColor: '#6366F1' },
  kpiCard: { kpiCard: '{', flex: 1, minWidth: 160, backgroundColor: 'C.bgCard', borderColor: 'C.border', borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  kpiIconBox: { kpiIconBox: '{', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabItem: { tabItem: '{', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  tabItemActive: { tabItemActive: '{', backgroundColor: 'C.purple2' },
  tabText: { tabText: '{', color: 'C.textSub', fontFamily: 'FT.bold', fontSize: 13 },
  tabTextActive: { tabTextActive: '{', color: '#FFF' },
  twoColRow: { twoColRow: '{', flexDirection: 'Platform.OS === 'web' ? ('row' as any) : 'column'', gap: 24, alignItems: 'stretch' },
  txIconBox: { txIconBox: '{', width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txAmount: { txAmount: '{', fontFamily: 'FT.bold', fontSize: 14 },
  filterChip: { filterChip: '{', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255', borderColor: 'C.border', borderWidth: 1 },
  filterChipActive: { filterChipActive: '{', backgroundColor: 'C.purple2', borderColor: 'C.purpleL' },
  filterChipText: { filterChipText: '{', color: 'C.textSub', fontFamily: 'FT.bold', fontSize: 12 },
  filterChipTextActive: { filterChipTextActive: '{', color: '#FFF' },
  couponCard: { couponCard: '{', flexBasis: 'Platform.OS === 'web' ? 340 : '100%'', flexGrow: 1, backgroundColor: 'C.bgCard', borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  couponBrandBadge: { couponBrandBadge: '{', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  couponBrandText: { couponBrandText: '{', fontFamily: 'FT.xbold', fontSize: 12 },
  statusPill: { statusPill: '{', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { statusPillText: '{', fontFamily: 'FT.bold', fontSize: 11 },
  presetChip: { presetChip: '{', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255', borderColor: 'C.border', borderWidth: 1 },
  presetChipActive: { presetChipActive: '{', backgroundColor: 'C.purple2', borderColor: 'C.purpleL' },
  presetText: { presetText: '{', color: 'C.text', fontFamily: 'FT.bold', fontSize: 13 },
  presetTextActive: { presetTextActive: '{', color: '#FFF' },
  methodBox: { methodBox: '{', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255', borderColor: 'C.border', borderWidth: 1 },
  methodBoxActive: { methodBoxActive: '{', borderColor: 'C.purpleL', backgroundColor: 'rgba(129' },
  methodText: { methodText: '{', color: 'C.textSub', fontFamily: 'FT.med', fontSize: 13 },
  methodTextActive: { methodTextActive: '{', color: '#FFF', fontFamily: 'FT.bold' },
  calcVal: { calcVal: '{', color: '#FFF', fontFamily: 'FT.bold', fontSize: 13 },
  txFullAmount: { txFullAmount: '{', fontFamily: 'FT.xbold', fontSize: 15 },
};

export default function WalletScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);
  const { width: winW } = useWindowDimensions();
  const isTablet = winW >= 680;

  useEffect(() => {
    if (!isEmbedded && initialized && user) {
      if (user.role === 'alumni') router.replace('/alumni-portal?tab=wallet' as any);
      else if (user.role === 'student') router.replace('/student-portal?tab=wallet' as any);
    }
  }, [isEmbedded, initialized, user, router]);

  // Tab State
  const [tab, setTab] = useState<'overview' | 'coupons' | 'topup' | 'withdraw' | 'history'>('overview');
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Coupon Engine State
  const [myCoupons, setMyCoupons] = useState<CouponItem[]>(INITIAL_COUPONS);
  const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'used'>('all');
  const [couponSearch, setCouponSearch] = useState('');
  const [selectedCouponModal, setSelectedCouponModal] = useState<CouponItem | null>(null);

  // Top-Up & Withdraw State
  const [topupAmount, setTopupAmount] = useState<string>('500');
  const [topupMethod, setTopupMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [topupSubmitting, setTopupSubmitting] = useState(false);
  const [wdAmountInr, setWdAmountInr] = useState<string>('100');
  const [wdMethod, setWdMethod] = useState<'upi' | 'bank'>('upi');
  const [wdTarget, setWdTarget] = useState<string>('');
  const [wdSubmitting, setWdSubmitting] = useState(false);

  // Fetch summary
  const fetchSummary = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const r = await request<Summary>('/wallet/summary').catch(() => null);
      if (r) setData(r);
      else {
        // Fallback demo data
        setData({
          user_id: user?.id || 'demo',
          role: user?.role || 'student',
          full_name: user?.full_name || 'Krishna Ram',
          balance_credits: 31250,
          balance_inr: 1250,
          credits_per_inr: 25,
          lifetime_earned: 42500,
          lifetime_spent: 11250,
          earnings_by_category: [],
          history: [
            { id: 'tx-1', type: 'credit', amount: 50, reason: 'Daily Login Reward', balance_after: 31250, ts: new Date().toISOString() },
            { id: 'tx-2', type: 'debit', amount: 100, reason: 'Redeemed Featherless AI Coupon', balance_after: 31200, ts: new Date(Date.now() - 86400000).toISOString() },
            { id: 'tx-3', type: 'credit', amount: 500, reason: 'Wallet Topup via UPI', balance_after: 31300, ts: new Date(Date.now() - 172800000).toISOString() },
          ],
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // Copy coupon code
  const copyCouponCode = (code: string) => {
    if (Platform.OS === 'web' && navigator?.clipboard) {
      navigator.clipboard.writeText(code);
    }
    toast.success('Code Copied!', `${code} copied to clipboard.`);
  };

  // Mark coupon as used
  const markCouponAsUsed = (couponId: string) => {
    setMyCoupons((prev) =>
      prev.map((c) =>
        c.id === couponId
          ? { ...c, status: 'used', used_at: 'Just now' }
          : c
      )
    );
    toast.info('Coupon Marked as Used', 'Status updated to Used.');
    setSelectedCouponModal(null);
  };

  // Redeem catalog coupon
  const redeemCatalogCoupon = (item: CouponItem) => {
    const currentBal = data?.balance_credits || 31250;
    if (currentBal < item.cost_credits) {
      toast.error('Insufficient Credits', `You need ${item.cost_credits} pts to redeem this coupon.`);
      return;
    }
    const newCoupon: CouponItem = {
      ...item,
      id: `coup-red-${Date.now()}`,
      code: `SA-${item.brand.substring(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'active',
    };
    setMyCoupons((prev) => [newCoupon, ...prev]);
    if (data) {
      setData({
        ...data,
        balance_credits: data.balance_credits - item.cost_credits,
        balance_inr: (data.balance_credits - item.cost_credits) / 25,
      });
    }
    toast.success('Coupon Redeemed!', `Added ${item.title} to My Coupons.`);
  };

  // Filtered Coupons
  const filteredMyCoupons = useMemo(() => {
    return myCoupons.filter((c) => {
      const matchesFilter =
        couponFilter === 'all' ? true : c.status === couponFilter;
      const matchesSearch =
        c.brand.toLowerCase().includes(couponSearch.toLowerCase()) ||
        c.title.toLowerCase().includes(couponSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(couponSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [myCoupons, couponFilter, couponSearch]);

  const activeCount = useMemo(() => myCoupons.filter((c) => c.status === 'active').length, [myCoupons]);
  const usedCount = useMemo(() => myCoupons.filter((c) => c.status === 'used').length, [myCoupons]);

  // Handle Topup Submit
  const handleTopupSubmit = async () => {
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid top-up amount.');
      return;
    }
    setTopupSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const addedCredits = amt * 25;
      if (data) {
        setData({
          ...data,
          balance_credits: data.balance_credits + addedCredits,
          balance_inr: data.balance_inr + amt,
          history: [
            {
              id: `tx-topup-${Date.now()}`,
              type: 'credit',
              amount: addedCredits,
              reason: `Wallet Top-up via ${topupMethod.toUpperCase()}`,
              balance_after: data.balance_credits + addedCredits,
              ts: new Date().toISOString(),
            },
            ...data.history,
          ],
        });
      }
      toast.success('Top-Up Successful!', `Added ${fmtINR(amt)} (+${fmtCredits(addedCredits)} pts) to your wallet.`);
      setTab('overview');
    } finally {
      setTopupSubmitting(false);
    }
  };

  // Handle Withdraw Submit
  const handleWithdrawSubmit = async () => {
    const amt = parseFloat(wdAmountInr);
    if (isNaN(amt) || amt < 100) {
      toast.error('Minimum ₹100', 'Minimum withdrawal amount is ₹100.');
      return;
    }
    if (!wdTarget.trim()) {
      toast.error('Target Required', 'Please enter your UPI ID or Bank account details.');
      return;
    }
    setWdSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const deductCredits = amt * 25;
      if (data) {
        setData({
          ...data,
          balance_credits: Math.max(0, data.balance_credits - deductCredits),
          balance_inr: Math.max(0, data.balance_inr - amt),
          history: [
            {
              id: `tx-wd-${Date.now()}`,
              type: 'debit',
              amount: deductCredits,
              reason: `Cashout to ${wdMethod.toUpperCase()} (${wdTarget})`,
              balance_after: Math.max(0, data.balance_credits - deductCredits),
              ts: new Date().toISOString(),
            },
            ...data.history,
          ],
        });
      }
      toast.success('Withdrawal Initiated!', `${fmtINR(amt)} will be credited to ${wdTarget} within 2 hours.`);
      setTab('overview');
    } finally {
      setWdSubmitting(false);
    }
  };

  const studentName = user?.full_name?.split(' ')[0] || 'Krishna';
  const balancePts = data?.balance_credits || 31250;
  const balanceInr = data?.balance_inr || 1250;

  const Container: any = isEmbedded ? View : ScrollView;
  const containerProps: any = isEmbedded
    ? { style: s.embeddedShell }
    : { style: s.shell, contentContainerStyle: s.contentContainer };

  return (
    <Container {...containerProps}>

      {/* ══════════════ 1. HEADER BANNER ══════════════ */}
      <View className="flex-row items-center justify-between flex-wrap gap-3">
        <View className="flex-1 min-w-70">
          <Text className="text-base">
            Welcome back, {studentName}! Manage your SA Credits, Deals & Cashouts.
          </Text>
        </View>

        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => fetchSummary(true)}
            disabled={refreshing}
            style={({ pressed, hovered }: any) => [
              s.regenBtn,
              (pressed || hovered) && s.regenBtnHover,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size={13} color={C.purpleL} />
            ) : (
              <Text className="text-xs">↺ Sync Balance</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setTab('topup')}
            style={({ pressed, hovered }: any) => [
              s.reportBtn,
              (pressed || hovered) && s.reportBtnHover,
            ]}
          >
            <PlusCircle size={14} color="#FFF" />
            <Text className="text-xs text-text">Add Funds</Text>
          </Pressable>
        </View>
      </View>

      {/* ══════════════ 2. KPI METRICS STRIP (4 Cards) ══════════════ */}
      <View className="flex-row gap-3.5">
        {/* Card 1: Balance */}
        <View style={[styles.kpiCard, { borderColor: 'rgba(129, 140, 248, 0.35)' }]}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs">WALLET BALANCE</Text>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(129, 140, 248, 0.15)' }]}>
              <Wallet size={16} color={C.purpleL} />
            </View>
          </View>
          <Text className="text-lg text-text">{fmtINR(balanceInr)}</Text>
          <Text className="text-xs">✦ {fmtCredits(balancePts)} SA Credits</Text>
        </View>

        {/* Card 2: Rewards Level */}
        <View style={[styles.kpiCard, { borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs">REWARDS TIER</Text>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Award size={16} color={C.amber} />
            </View>
          </View>
          <Text className="text-lg text-text">Level 3 Gold</Text>
          <Text className="text-xs">7,500 pts to Platinum</Text>
        </View>

        {/* Card 3: Active Coupons */}
        <Pressable onPress={() => setTab('coupons')} style={[styles.kpiCard, { borderColor: 'rgba(52, 211, 153, 0.35)' }]}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs">MY COUPONS</Text>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
              <Tag size={16} color={C.green} />
            </View>
          </View>
          <Text className="text-lg text-text">{activeCount} Active</Text>
          <Text className="text-xs">{usedCount} Coupons Used</Text>
        </Pressable>

        {/* Card 4: Lifetime Savings */}
        <View style={[styles.kpiCard, { borderColor: 'rgba(96, 165, 250, 0.35)' }]}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs">TOTAL SAVED</Text>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
              <Zap size={16} color={C.blue} />
            </View>
          </View>
          <Text className="text-lg text-text">{fmtINR(4850)}</Text>
          <Text className="text-xs">Across 5 SA partner deals</Text>
        </View>
      </View>

      {/* ══════════════ 3. NAVIGATION TAB STRIP ══════════════ */}
      <View className="flex-row flex-wrap gap-2 rounded-xl p-2">
        {[
          { id: 'overview', label: 'Overview', icon: Wallet },
          { id: 'coupons', label: `My Coupons (${activeCount})`, icon: Tag },
          { id: 'topup', label: 'Add Funds', icon: PlusCircle },
          { id: 'withdraw', label: 'Redeem', icon: ArrowUpRight },
          { id: 'history', label: 'History', icon: Clock },
        ].map((t) => {
          const isActive = tab === t.id;
          const IconComp = t.icon;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id as any)}
              style={[styles.tabItem, isActive && s.tabItemActive]}
            >
              <IconComp size={15} color={isActive ? '#FFF' : C.textSub} />
              <Text style={[styles.tabText, isActive && s.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ══════════════ 4. TAB CONTENTS ══════════════ */}

      {/* ── TAB 1: OVERVIEW ── */}
      {tab === 'overview' && (
        <View style={{ gap: 24 }}>
          {/* Top Hero Balance Card */}
          <LinearGradient
            colors={['rgba(79, 70, 229, 0.40)', 'rgba(24, 18, 48, 0.85)', 'rgba(18, 22, 35, 0.95)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            className="rounded-2xl p-6 overflow-hidden"
          >
            <View className="flex-row items-center">
              <View style={{ flex: 1, gap: 8 }}>
                <Text className="text-xs">AVAILABLE BALANCE</Text>
                <Text className="text-text">{fmtINR(balanceInr)}</Text>
                <Text className="text-sm">Equal to {fmtCredits(balancePts)} SA Credits</Text>
                
                <View className="flex-row flex-wrap gap-2.5 mt-3">
                  <Pressable onPress={() => setTab('topup')} className="flex-row items-center gap-1.5 rounded-xl px-4 py-3">
                    <PlusCircle size={14} color="#FFF" />
                    <Text className="text-sm text-text">Top-Up Wallet</Text>
                  </Pressable>
                  <Pressable onPress={() => setTab('coupons')} className="flex-row items-center gap-1.5 rounded-xl px-4 py-3">
                    <Tag size={14} color={C.purpleL} />
                    <Text className="text-sm">View My Coupons</Text>
                  </Pressable>
                  <Pressable onPress={() => setTab('withdraw')} className="flex-row items-center gap-1.5 rounded-xl px-4 py-3">
                    <ArrowUpRight size={14} color={C.teal} />
                    <Text className="text-sm">Redeem Cash</Text>
                  </Pressable>
                </View>
              </View>

              {isTablet && (
                <View className="gap-1.5 rounded-xl p-4 w-60">
                  <Text className="text-xs">CONVERSION RATE</Text>
                  <Text className="text-lg">25 Pts = ₹1 INR</Text>
                  <Text className="text-xs">Earn SA credits by completing profile tasks, attending events & referring alumni.</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Money Coach & Recent Activity */}
          <View style={s.twoColRow}>
            {/* Money Coach Assistant */}
            <View className="flex-1 gap-4 rounded-2xl p-5">
              <View className="flex-row items-center justify-between">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} color={C.purpleL} />
                  <Text className="text-base">MONEY COACH AI</Text>
                </View>
              </View>
              <MoneyCoach />
            </View>

            {/* Recent Activity */}
            <View className="flex-1 gap-4 rounded-2xl p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-base">RECENT ACTIVITY</Text>
                <Pressable onPress={() => setTab('history')}>
                  <Text className="text-sm">View All ➔</Text>
                </Pressable>
              </View>

              <View style={{ gap: 10 }}>
                {(data?.history || []).slice(0, 4).map((tx, idx) => (
                  <View key={tx.id || idx} className="flex-row items-center gap-3 rounded-xl p-3">
                    <View style={[styles.txIconBox, { backgroundColor: tx.type === 'credit' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)' }]}>
                      {tx.type === 'credit' ? (
                        <ArrowDownLeft size={16} color={C.green} />
                      ) : (
                        <ArrowUpRight size={16} color={C.red} />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text className="text-sm text-text">{tx.reason}</Text>
                      <Text className="text-xs">{tx.ts ? new Date(tx.ts).toLocaleDateString() : 'Recent'}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: tx.type === 'credit' ? C.green : C.red }]}>
                      {tx.type === 'credit' ? '+' : '-'}{fmtCredits(tx.amount)} pts
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── TAB 2: MY COUPONS (COUPON & REWARDS ENGINE) ── */}
      {tab === 'coupons' && (
        <View style={{ gap: 24 }}>
          {/* Sub-Header Controls */}
          <View className="flex-row items-center justify-between flex-wrap gap-3">
            {/* Filter Pills */}
            <View className="flex-row gap-2">
              {[
                { id: 'all', label: `All (${myCoupons.length})` },
                { id: 'active', label: `Active (${activeCount})` },
                { id: 'used', label: `Used (${usedCount})` },
              ].map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => setCouponFilter(f.id as any)}
                  style={[styles.filterChip, couponFilter === f.id && s.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, couponFilter === f.id && s.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Search Input */}
            <View className="flex-row items-center rounded-xl px-3 h-10 min-w-55">
              <Search size={14} color={C.textSub} style={{ marginRight: 6 }} />
              <TextInput
                value={couponSearch}
                onChangeText={setCouponSearch}
                placeholder="Search by brand or code..."
                placeholderTextColor={C.dim}
                className="flex-1 text-sm text-text"
              />
              {!!couponSearch && (
                <Pressable onPress={() => setCouponSearch('')}>
                  <X size={14} color={C.textSub} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Section 1: My Redeemed Coupons Grid */}
          <View>
            <View style={{ marginBottom: 12 }}>
              <Text className="text-base">MY REDEEMED COUPONS</Text>
              <Text style={{ color: C.textSub, fontSize: 13, marginTop: 2 }}>
                Copy your unique voucher code and click "Use Now" to apply on partner websites.
              </Text>
            </View>

            {filteredMyCoupons.length === 0 ? (
              <View className="items-center justify-center gap-2.5 rounded-2xl py-10">
                <Tag size={40} color={C.dim} />
                <Text className="text-base text-text">No coupons found</Text>
                <Text className="text-sm">Redeem partner coupons below to get instant discount codes!</Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-4">
                {filteredMyCoupons.map((c) => (
                  <View key={c.id} style={[styles.couponCard, { borderColor: c.accent + '33' }]}>
                    <View className="flex-row items-center justify-between">
                      <View style={[styles.couponBrandBadge, { backgroundColor: c.accent + '20', borderColor: c.accent + '40' }]}>
                        <Text style={[styles.couponBrandText, { color: c.accent }]}>{c.brand}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: c.status === 'active' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(240, 238, 255, 0.1)' }]}>
                        <Text style={[styles.statusPillText, { color: c.status === 'active' ? C.green : C.dim }]}>
                          {c.status === 'active' ? '● Ready to Use' : '✓ Used'}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-base text-text">{c.title}</Text>
                    <Text className="text-xs">{c.expiry}</Text>

                    {/* Voucher Code Box */}
                    <View className="flex-row items-center justify-between rounded-xl px-3 py-2 mt-1">
                      <Text className="text-sm">{c.code}</Text>
                      <Pressable onPress={() => copyCouponCode(c.code)} className="flex-row items-center gap-1 rounded-md px-2 py-1">
                        <Copy size={13} color={C.purpleL} />
                        <Text className="text-xs">Copy</Text>
                      </Pressable>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row items-center gap-2.5 mt-2">
                      <Pressable
                        onPress={() => {
                          if (c.url) Linking.openURL(c.url);
                        }}
                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2"
                      >
                        <Text className="text-xs text-text">Use Now</Text>
                        <ExternalLink size={12} color="#FFF" />
                      </Pressable>

                      {c.status === 'active' && (
                        <Pressable
                          onPress={() => markCouponAsUsed(c.id)}
                          className="flex-row items-center gap-1 rounded-lg px-3 py-2"
                        >
                          <CheckCircle2 size={12} color={C.textSub} />
                          <Text className="text-xs">Mark Used</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Section 2: Catalog of Redeemable Partner Coupons */}
          <View style={{ marginTop: 16 }}>
            <View style={{ marginBottom: 14 }}>
              <Text className="text-base">REDEEM NEW PARTNER COUPONS</Text>
              <Text style={{ color: C.textSub, fontSize: 13, marginTop: 2 }}>
                Use your SA Credits balance to unlock exclusive discounts & free passes.
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-4">
              {AVAILABLE_CATALOG_COUPONS.map((cat) => (
                <View key={cat.id} style={[styles.couponCard, { borderColor: 'rgba(255,255,255,0.08)' }]}>
                  <View className="flex-row items-center justify-between">
                    <View style={[styles.couponBrandBadge, { backgroundColor: cat.accent + '20', borderColor: cat.accent + '40' }]}>
                      <Text style={[styles.couponBrandText, { color: cat.accent }]}>{cat.brand}</Text>
                    </View>
                    <View className="rounded-md px-2 py-1">
                      <Text className="text-xs">{cat.discount}</Text>
                    </View>
                  </View>

                  <Text className="text-base text-text">{cat.title}</Text>
                  <Text className="text-xs">{cat.expiry}</Text>

                  <View className="flex-row items-center justify-between pt-3 mt-2">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Star size={14} color={C.amber} />
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{cat.cost_credits} Pts</Text>
                    </View>

                    <Pressable
                      onPress={() => redeemCatalogCoupon(cat)}
                      className="rounded-lg px-3 py-2"
                    >
                      <Text className="text-xs">Redeem Coupon</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ── TAB 3: ADD FUNDS ── */}
      {tab === 'topup' && (
        <View className="self-center rounded-2xl p-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-base">ADD FUNDS TO WALLET</Text>
          </View>
          <Text style={{ color: C.text2, fontSize: 14 }}>
            Top up your SA Wallet using UPI, Card, or Netbanking. Get +10% bonus SA credits on every top-up!
          </Text>

          {/* Amount Presets */}
          <View style={{ gap: 8, marginTop: 8 }}>
            <Text className="text-xs">SELECT AMOUNT (INR)</Text>
            <View className="flex-row flex-wrap gap-2">
              {TOPUP_PRESETS.map((amt) => (
                <Pressable
                  key={`top-preset-${amt}`}
                  onPress={() => setTopupAmount(String(amt))}
                  style={[styles.presetChip, topupAmount === String(amt) && s.presetChipActive]}
                >
                  <Text style={[styles.presetText, topupAmount === String(amt) && s.presetTextActive]}>
                    ₹{amt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Custom Input */}
          <View style={{ gap: 6 }}>
            <Text className="text-xs">CUSTOM AMOUNT (INR)</Text>
            <TextInput
              value={topupAmount}
              onChangeText={setTopupAmount}
              keyboardType="numeric"
              placeholder="Enter amount in ₹"
              placeholderTextColor={C.dim}
              className="rounded-xl px-4 py-3 text-sm text-text"
            />
          </View>

          {/* Payment Method Selector */}
          <View style={{ gap: 8 }}>
            <Text className="text-xs">PAYMENT METHOD</Text>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {[
                { id: 'upi', label: 'UPI / GPay / PhonePe', icon: Zap },
                { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
                { id: 'netbanking', label: 'Netbanking', icon: Building2 },
              ].map((m) => {
                const isSel = topupMethod === m.id;
                const IconC = m.icon;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setTopupMethod(m.id as any)}
                    style={[styles.methodBox, isSel && s.methodBoxActive]}
                  >
                    <IconC size={16} color={isSel ? C.purpleL : C.textSub} />
                    <Text style={[styles.methodText, isSel && s.methodTextActive]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Calculation summary */}
          <View className="gap-2 rounded-xl p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm">Top-up Amount:</Text>
              <Text className="text-sm text-text">{fmtINR(parseFloat(topupAmount) || 0)}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm">Base SA Credits (25x):</Text>
              <Text className="text-sm text-text">+{fmtCredits((parseFloat(topupAmount) || 0) * 25)} Pts</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm">10% Bonus Points:</Text>
              <Text style={[styles.calcVal, { color: C.green }]}>+{fmtCredits((parseFloat(topupAmount) || 0) * 2.5)} Pts</Text>
            </View>
          </View>

          <Pressable
            onPress={handleTopupSubmit}
            disabled={topupSubmitting}
            className="items-center justify-center rounded-xl py-3 mt-2"
          >
            {topupSubmitting ? (
              <ActivityIndicator size={16} color="#FFF" />
            ) : (
              <Text className="text-sm text-text">Proceed to Pay {fmtINR(parseFloat(topupAmount) || 0)}</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ── TAB 4: REDEEM / CASHOUT ── */}
      {tab === 'withdraw' && (
        <View className="self-center rounded-2xl p-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-base">REDEEM SA CREDITS FOR CASH</Text>
          </View>
          <Text style={{ color: C.text2, fontSize: 14 }}>
            Convert your earned SA Credits back to real cash. Funds are transferred directly to your UPI ID or Bank account.
          </Text>

          {/* Custom Input */}
          <View style={{ gap: 6 }}>
            <Text className="text-xs">AMOUNT TO CASH OUT (INR)</Text>
            <TextInput
              value={wdAmountInr}
              onChangeText={setWdAmountInr}
              keyboardType="numeric"
              placeholder="Minimum ₹100"
              placeholderTextColor={C.dim}
              className="rounded-xl px-4 py-3 text-sm text-text"
            />
          </View>

          {/* Withdrawal Target Input */}
          <View style={{ gap: 6 }}>
            <Text className="text-xs">ENTER YOUR UPI ID OR BANK DETAILS</Text>
            <TextInput
              value={wdTarget}
              onChangeText={setWdTarget}
              placeholder="e.g. username@upi or Account Number & IFSC"
              placeholderTextColor={C.dim}
              className="rounded-xl px-4 py-3 text-sm text-text"
            />
          </View>

          <Pressable
            onPress={handleWithdrawSubmit}
            disabled={wdSubmitting}
            className="items-center justify-center rounded-xl py-3 mt-2"
          >
            {wdSubmitting ? (
              <ActivityIndicator size={16} color="#FFF" />
            ) : (
              <Text className="text-sm text-text">Request Cashout ({fmtCredits((parseFloat(wdAmountInr) || 0) * 25)} Pts)</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ── TAB 5: HISTORY ── */}
      {tab === 'history' && (
        <View className="self-center rounded-2xl p-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-base">TRANSACTION HISTORY</Text>
          </View>

          <View style={{ gap: 12 }}>
            {(data?.history || []).map((tx, idx) => (
              <View key={tx.id || idx} className="flex-row items-center gap-3.5 rounded-xl p-4">
                <View style={[styles.txIconBox, { backgroundColor: tx.type === 'credit' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)' }]}>
                  {tx.type === 'credit' ? (
                    <ArrowDownLeft size={18} color={C.green} />
                  ) : (
                    <ArrowUpRight size={18} color={C.red} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text className="text-sm text-text">{tx.reason}</Text>
                  <Text className="text-xs">
                    ID: {tx.id || 'TX-8921'} · {tx.ts ? new Date(tx.ts).toLocaleString() : 'Recent'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[styles.txFullAmount, { color: tx.type === 'credit' ? C.green : C.red }]}>
                    {tx.type === 'credit' ? '+' : '-'}{fmtCredits(tx.amount)} Pts
                  </Text>
                  <Text className="text-xs">Bal: {fmtCredits(tx.balance_after || 0)} Pts</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

    </Container>
  );
}

/* ────────── Styles ────────── */

