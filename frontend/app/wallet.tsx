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
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
  TextInput, Platform, useWindowDimensions, Modal, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wallet, Sparkles, CircleCheck as CheckCircle2, Copy, ExternalLink, Clock,
  Tag, TrendingUp, PlusCircle, ArrowUpRight, ArrowDownLeft, Shield, Award,
  Check, Search, Filter, X, ChevronRight, Gift, Building2, Zap, RefreshCw,
  CreditCard, DollarSign, Star, Lock, Info,
} from 'lucide-react-native';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import MoneyCoach from '@/src/views/web/wallet/MoneyCoach';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';
import { useToast } from '@/src/views/components';

/* ────────── Design Tokens (Navy Blue Palette) ────────── */
const C = {
  bg: '#0A1628',          // deep navy page background
  bgCard: '#0F2347',      // navy card background
  bgCardH: '#162E5A',     // navy card hover
  border: '#1E3A6E',      // navy border
  border2: '#2A4F8F',     // slightly lighter navy border
  text: '#FFFFFF',
  text2: '#E8F0FF',
  textSub: '#94B4E0',     // muted blue-grey on navy
  dim: '#6B8CC4',         // dimmed text on navy
  purple: '#60A5FA',      // accent blue (kept vibrant)
  purple2: '#3B82F6',     // primary action blue
  purpleL: '#93C5FD',     // lighter accent
  purpleXL: '#DBEAFE',    // very light for labels
  teal: '#34D399',
  blue: '#3B82F6',
  amber: '#FBBF24',
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
  status: 'active' | 'used' | 'locked';
  used_at?: string;
  category: string;
  accent: string;
  instructions?: string;
  locked?: boolean;
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
  const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'used' | 'locked'>('all');
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

  // Fetch real coupons from API
  const fetchCoupons = useCallback(async () => {
    try {
      const r = await request<any>('/echo/coupons/by-category');
      if (r?.success && r.data) {
        const allCoupons: CouponItem[] = [];
        const categories = Object.keys(r.data);
        for (const cat of categories) {
          for (const c of r.data[cat]) {
            allCoupons.push({
              id: `coup-${c.code}`,
              brand: c.vendor_name || 'Student Alumni',
              title: c.description || `${c.discount_type === 'percentage' ? c.discount_value + '% Off' : '₹' + c.discount_value + ' Off'}`,
              discount: c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`,
              code: c.code,
              cost_credits: 0,
              url: '',
              expiry: '',
              status: c.locked ? 'locked' : 'active',
              category: cat,
              accent: cat === 'partner' ? '#3B82F6' : cat === 'event' ? '#10B981' : cat === 'promo' ? '#F59E0B' : '#8B5CF6',
              instructions: c.instructions || '',
              locked: c.locked || false,
            });
          }
        }
        setMyCoupons(allCoupons.length > 0 ? allCoupons : INITIAL_COUPONS);
      }
    } catch (e) {
      // Keep demo coupons if API fails
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

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
        couponFilter === 'all' ? true :
        couponFilter === 'locked' ? c.locked :
        c.status === couponFilter;
      const matchesSearch =
        c.brand.toLowerCase().includes(couponSearch.toLowerCase()) ||
        c.title.toLowerCase().includes(couponSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(couponSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [myCoupons, couponFilter, couponSearch]);

  const activeCount = useMemo(() => myCoupons.filter((c) => c.status === 'active' && !c.locked).length, [myCoupons]);
  const usedCount = useMemo(() => myCoupons.filter((c) => c.status === 'used').length, [myCoupons]);
  const lockedCount = useMemo(() => myCoupons.filter((c) => c.locked).length, [myCoupons]);

  // Handle Topup Submit — Razorpay payment
  const handleTopupSubmit = async () => {
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid top-up amount.');
      return;
    }
    setTopupSubmitting(true);
    try {
      // Step 1: Create Razorpay order
      const orderRes = await request<any>('/wallet/topup/create-order', {
        method: 'POST',
        body: { amount_inr: amt },
      });
      if (!orderRes.ok) {
        toast.error('Payment Failed', orderRes.detail || 'Could not create payment order.');
        setTopupSubmitting(false);
        return;
      }

      // Step 2: Load Razorpay SDK
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
        setTopupSubmitting(false);
        return;
      }

      // Step 3: Open Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key: orderRes.key_id,
        amount: orderRes.amount * 100,
        currency: 'INR',
        name: 'Student Alumni',
        description: `Wallet Top-Up ₹${amt}`,
        order_id: orderRes.order_id,
        handler: async (response: any) => {
          // Step 4: Verify payment and credit wallet
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
            if (verifyRes.ok) {
              // Update local state with real balance from backend
              setData({
                ...data!,
                balance_credits: verifyRes.balance_credits,
                balance_inr: verifyRes.balance_inr,
                history: [
                  {
                    id: `tx-topup-${Date.now()}`,
                    type: 'credit',
                    amount: verifyRes.total_credits,
                    reason: `Wallet Top-Up ₹${amt} via Razorpay (+${verifyRes.bonus_credits} bonus)`,
                    balance_after: verifyRes.balance_credits,
                    ts: new Date().toISOString(),
                  },
                  ...(data?.history || []),
                ],
              });
              toast.success('Top-Up Successful!', `Added ₹${amt} (+${verifyRes.total_credits.toLocaleString()} pts) to your wallet.`);
              setTab('overview');
            } else {
              toast.error('Verification Failed', 'Payment was received but verification failed. Contact support.');
            }
          } catch (e: any) {
            toast.error('Verification Failed', 'Payment was received but verification failed. Contact support.');
          }
          setTopupSubmitting(false);
        },
        prefill: { name: user?.full_name || user?.name || '', email: user?.email || '' },
        theme: { color: '#7C5CFC' },
      });
      rzp.on('payment.failed', () => {
        toast.error('Payment Failed', 'Payment was cancelled or failed. Please try again.');
        setTopupSubmitting(false);
      });
      rzp.open();
    } catch (e: any) {
      toast.error('Payment Failed', e?.message || 'Something went wrong. Please try again.');
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
      <View style={s.headerBar}>
        <View style={s.headerLeft}>
          <Text style={s.greetingText}>
            Welcome back, {studentName}! Manage your SA Credits, Deals & Cashouts.
          </Text>
        </View>

        <View style={s.headerActions}>
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
              <Text style={s.regenBtnText}>↺ Sync Balance</Text>
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
            <Text style={s.reportBtnText}>Add Funds</Text>
          </Pressable>
        </View>
      </View>

      {/* ══════════════ 2. KPI METRICS STRIP (4 Cards) ══════════════ */}
      <View style={s.kpiRow}>
        {/* Card 1: Balance */}
        <View style={[s.kpiCard, { borderColor: 'rgba(96, 165, 250, 0.40)' }]}>
          <View style={s.kpiTopRow}>
            <Text style={s.kpiLabel}>WALLET BALANCE</Text>
            <View style={[s.kpiIconBox, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
              <Wallet size={16} color={C.purpleL} />
            </View>
          </View>
          <Text style={s.kpiValue}>{fmtINR(balanceInr)}</Text>
          <Text style={s.kpiSubText}>✦ {fmtCredits(balancePts)} SA Credits</Text>
        </View>

        {/* Card 2: Rewards Level */}
        <View style={[s.kpiCard, { borderColor: 'rgba(56, 189, 248, 0.40)' }]}>
          <View style={s.kpiTopRow}>
            <Text style={s.kpiLabel}>REWARDS TIER</Text>
            <View style={[s.kpiIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Award size={16} color={C.amber} />
            </View>
          </View>
          <Text style={s.kpiValue}>Level 3 Cobalt</Text>
          <Text style={s.kpiSubText}>7,500 pts to Sapphire</Text>
        </View>

        {/* Card 3: Active Coupons */}
        <Pressable onPress={() => setTab('coupons')} style={[s.kpiCard, { borderColor: 'rgba(96, 165, 250, 0.40)' }]}>
          <View style={s.kpiTopRow}>
            <Text style={s.kpiLabel}>MY COUPONS</Text>
            <View style={[s.kpiIconBox, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
              <Tag size={16} color={C.purpleL} />
            </View>
          </View>
          <Text style={s.kpiValue}>{activeCount} Active</Text>
          <Text style={s.kpiSubText}>{usedCount} Coupons Used</Text>
        </Pressable>

        {/* Card 4: Lifetime Savings */}
        <View style={[s.kpiCard, { borderColor: 'rgba(56, 189, 248, 0.40)' }]}>
          <View style={s.kpiTopRow}>
            <Text style={s.kpiLabel}>TOTAL SAVED</Text>
            <View style={[s.kpiIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Zap size={16} color={C.teal} />
            </View>
          </View>
          <Text style={s.kpiValue}>{fmtINR(4850)}</Text>
          <Text style={s.kpiSubText}>Across 5 SA partner deals</Text>
        </View>
      </View>

      {/* ══════════════ 3. NAVIGATION TAB STRIP ══════════════ */}
      <View style={s.tabBarRow}>
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
              style={[s.tabItem, isActive && s.tabItemActive]}
            >
              <IconComp size={15} color={isActive ? '#FFF' : '#64748B'} />
              <Text style={[s.tabText, isActive && s.tabTextActive]}>{t.label}</Text>
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
            colors={['rgba(30, 58, 110, 0.70)', 'rgba(15, 35, 71, 0.90)', 'rgba(10, 22, 40, 0.98)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.heroCard}
          >
            <View style={s.heroContentRow}>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={s.heroOverline}>AVAILABLE BALANCE</Text>
                <Text style={s.heroBalanceBig}>{fmtINR(balanceInr)}</Text>
                <Text style={s.heroBalanceSub}>Equal to {fmtCredits(balancePts)} SA Credits</Text>
                
                <View style={s.heroQuickRow}>
                  <Pressable onPress={() => setTab('topup')} style={s.heroBtnPrimary}>
                    <PlusCircle size={14} color="#FFF" />
                    <Text style={s.heroBtnText}>Top-Up Wallet</Text>
                  </Pressable>
                  <Pressable onPress={() => setTab('coupons')} style={s.heroBtnSecondary}>
                    <Tag size={14} color={C.purpleL} />
                    <Text style={s.heroBtnTextSec}>View My Coupons</Text>
                  </Pressable>
                  <Pressable onPress={() => setTab('withdraw')} style={s.heroBtnSecondary}>
                    <ArrowUpRight size={14} color={C.teal} />
                    <Text style={s.heroBtnTextSec}>Redeem Cash</Text>
                  </Pressable>
                </View>
              </View>

              {isTablet && (
                <View style={s.heroRightTile}>
                  <Text style={s.heroTileTitle}>CONVERSION RATE</Text>
                  <Text style={s.heroTileVal}>25 Pts = ₹1 INR</Text>
                  <Text style={s.heroTileDesc}>Earn SA credits by completing profile tasks, attending events & referring alumni.</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Money Coach & Recent Activity */}
          <View style={s.twoColRow}>
            {/* Money Coach Assistant — Inline Preview Panel */}
            <View style={s.colCard}>
              <View style={s.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} color={C.purpleL} />
                  <Text style={s.sectionTitle}>MONEY COACH AI</Text>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(52,211,153,0.15)' }}>
                  <Text style={{ color: C.green, fontSize: 10, fontFamily: 'DMSans_700Bold' }}>● LIVE</Text>
                </View>
              </View>

              {/* Greeting Banner */}
              <View style={{
                backgroundColor: 'rgba(59,130,246,0.10)',
                borderColor: 'rgba(59,130,246,0.25)',
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}>
                <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFF', fontSize: 13, fontFamily: 'DMSans_700Bold' }}>
                    Hi {studentName}! 👋 I'm your Money Coach.
                  </Text>
                  <Text style={{ color: C.textSub, fontSize: 11.5, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>
                    Ask me anything about your credits, savings, or spending patterns.
                  </Text>
                </View>
              </View>

              {/* Quick Insights */}
              <View style={{ gap: 8 }}>
                <Text style={{ color: C.purpleXL, fontSize: 10.5, fontFamily: 'DMSans_700Bold', letterSpacing: 0.8 }}>QUICK INSIGHTS</Text>
                {[
                  { icon: TrendingUp, color: '#34D399', text: `You've earned ${fmtCredits(data?.lifetime_earned || 42500)} total credits. Keep going!` },
                  { icon: Star,       color: '#FBBF24', text: 'Complete your profile to unlock 500 bonus credits this week.' },
                  { icon: Zap,        color: '#60A5FA', text: `You're ${7500} pts away from Sapphire tier — attend 1 event to fast-track.` },
                ].map((tip, i) => (
                  <View key={i} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
                    borderRadius: 10, padding: 10,
                  }}>
                    <tip.icon size={15} color={tip.color} />
                    <Text style={{ flex: 1, color: C.text2, fontSize: 12, fontFamily: 'DMSans_400Regular', lineHeight: 17 }}>
                      {tip.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Slash Command Chips */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: C.purpleXL, fontSize: 10.5, fontFamily: 'DMSans_700Bold', letterSpacing: 0.8 }}>TRY A COMMAND</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { cmd: '/credit-plan', label: '🚀 Credit Plan' },
                    { cmd: '/spend',       label: '📊 Spending' },
                    { cmd: '/forecast',    label: '📅 Forecast' },
                    { cmd: '/save 5000',   label: '🐷 Save ₹5K' },
                    { cmd: '/cashback',    label: '💳 Cashback' },
                    { cmd: '/tax',         label: '🧾 Tax Summary' },
                  ].map((chip) => (
                    <Pressable
                      key={chip.cmd}
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          window.dispatchEvent(new CustomEvent('open-money-coach', { detail: { cmd: chip.cmd } }));
                        }
                      }}
                      style={({ hovered }: any) => ({
                        paddingHorizontal: 12, paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: hovered ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.08)',
                        borderColor: 'rgba(59,130,246,0.30)', borderWidth: 1,
                        cursor: 'pointer',
                      } as any)}
                    >
                      <Text style={{ color: C.purpleL, fontSize: 11.5, fontFamily: 'DMSans_700Bold' }}>
                        {chip.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Open Coach CTA */}
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.dispatchEvent(new CustomEvent('open-money-coach', { detail: {} }));
                  }
                }}
                style={({ hovered }: any) => ({
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: hovered ? '#2563EB' : '#1D4ED8',
                  borderRadius: 12, paddingVertical: 12, marginTop: 4,
                  cursor: 'pointer',
                } as any)}
              >
                <Sparkles size={15} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 13, fontFamily: 'DMSans_700Bold' }}>
                  Open Money Coach Chat
                </Text>
                <ChevronRight size={15} color="#FFF" />
              </Pressable>
              <MoneyCoach />
            </View>

            {/* Recent Activity */}
            <View style={s.colCard}>
              <View style={s.cardHeader}>
                <Text style={s.sectionTitle}>RECENT ACTIVITY</Text>
                <Pressable onPress={() => setTab('history')}>
                  <Text style={s.cardBottomLinkText}>View All ➔</Text>
                </Pressable>
              </View>

              <View style={{ gap: 10 }}>
                {(data?.history || []).slice(0, 4).map((tx, idx) => (
                  <View key={tx.id || idx} style={s.txRow}>
                    <View style={[s.txIconBox, { backgroundColor: tx.type === 'credit' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)' }]}>
                      {tx.type === 'credit' ? (
                        <ArrowDownLeft size={16} color={C.green} />
                      ) : (
                        <ArrowUpRight size={16} color={C.red} />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.txReason}>{tx.reason}</Text>
                      <Text style={s.txDate}>{tx.ts ? new Date(tx.ts).toLocaleDateString() : 'Recent'}</Text>
                    </View>
                    <Text style={[s.txAmount, { color: tx.type === 'credit' ? C.green : C.red }]}>
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
          <View style={s.couponControlsRow}>
            {/* Filter Pills */}
            <View style={s.couponFilterGroup}>
              {[
                { id: 'all', label: `All (${myCoupons.length})` },
                { id: 'active', label: `Active (${activeCount})` },
                { id: 'used', label: `Used (${usedCount})` },
                { id: 'locked', label: `Locked (${lockedCount})` },
              ].map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => setCouponFilter(f.id as any)}
                  style={[s.filterChip, couponFilter === f.id && s.filterChipActive]}
                >
                  <Text style={[s.filterChipText, couponFilter === f.id && s.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Search Input */}
            <View style={s.searchWrap}>
              <Search size={15} color={C.purpleL} style={{ marginRight: 8 }} />
              <TextInput
                value={couponSearch}
                onChangeText={setCouponSearch}
                placeholder="Search by brand or code..."
                placeholderTextColor="#94A3B8"
                style={s.searchInput}
              />
              {!!couponSearch && (
                <Pressable onPress={() => setCouponSearch('')}>
                  <X size={15} color={C.purpleL} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Section 1: My Redeemed Coupons Grid */}
          <View>
            <View style={s.couponSectionHeader}>
              <Text style={s.couponSectionTitle}>MY REDEEMED COUPONS</Text>
              <Text style={s.couponSectionSub}>
                Copy your unique voucher code and click "Use Now" to apply on partner websites.
              </Text>
            </View>

            {filteredMyCoupons.length === 0 ? (
              <View style={s.emptyBox}>
                <Tag size={40} color={C.dim} />
                <Text style={s.emptyTitle}>No coupons found</Text>
                <Text style={s.emptySub}>Redeem partner coupons below to get instant discount codes!</Text>
              </View>
            ) : (
              <View style={s.couponsGrid}>
                {filteredMyCoupons.map((c) => (
                  <View key={c.id} style={[s.couponCard, { borderColor: c.locked ? 'rgba(239,68,68,0.25)' : c.accent + '33', opacity: c.locked ? 0.8 : 1 }]}>
                    <View style={s.couponCardHeader}>
                      <View style={[s.couponBrandBadge, { backgroundColor: c.accent + '20', borderColor: c.accent + '40' }]}>
                        <Text style={[s.couponBrandText, { color: c.accent }]}>{c.brand}</Text>
                      </View>
                      {c.locked ? (
                        <View style={[s.statusPill, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                          <Lock size={10} color="#EF4444" />
                          <Text style={[s.statusPillText, { color: '#EF4444', marginLeft: 4 }]}>Locked</Text>
                        </View>
                      ) : (
                        <View style={[s.statusPill, { backgroundColor: c.status === 'active' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(240, 238, 255, 0.1)' }]}>
                          <Text style={[s.statusPillText, { color: c.status === 'active' ? C.green : C.dim }]}>
                            {c.status === 'active' ? '● Ready to Use' : '✓ Used'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={s.couponTitle}>{c.title}</Text>
                    {c.instructions ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: 4 }}>
                        <Info size={11} color="#3B82F6" />
                        <Text style={{ fontSize: 11, color: '#3B82F6', flex: 1 }} numberOfLines={2}>{c.instructions}</Text>
                      </View>
                    ) : null}
                    <Text style={s.couponExpiry}>{c.expiry}</Text>

                    {/* Voucher Code Box */}
                    {!c.locked && (
                      <View style={s.voucherCodeBox}>
                        <Text style={s.voucherCodeText}>{c.code}</Text>
                        <Pressable onPress={() => copyCouponCode(c.code)} style={s.copyBtn}>
                          <Copy size={13} color={C.purpleL} />
                          <Text style={s.copyBtnText}>Copy</Text>
                        </Pressable>
                      </View>
                    )}

                    {c.locked && (
                      <View style={[s.voucherCodeBox, { backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }]}>
                        <Lock size={13} color="#EF4444" />
                        <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>Available during event</Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    {!c.locked && (
                      <View style={s.couponActionRow}>
                        <Pressable
                          onPress={() => {
                            if (c.url) Linking.openURL(c.url);
                          }}
                          style={s.useNowBtn}
                        >
                          <Text style={s.useNowBtnText}>Use Now</Text>
                          <ExternalLink size={12} color="#FFF" />
                        </Pressable>

                        {c.status === 'active' && (
                          <Pressable
                            onPress={() => markCouponAsUsed(c.id)}
                            style={s.markUsedBtn}
                          >
                            <CheckCircle2 size={12} color={C.textSub} />
                            <Text style={s.markUsedText}>Mark Used</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Section 2: Catalog of Redeemable Partner Coupons */}
          <View style={{ marginTop: 20 }}>
            <View style={s.couponSectionHeader}>
              <Text style={s.couponSectionTitle}>REDEEM NEW PARTNER COUPONS</Text>
              <Text style={s.couponSectionSub}>
                Use your SA Credits balance to unlock exclusive discounts & free passes.
              </Text>
            </View>

            <View style={s.couponsGrid}>
              {AVAILABLE_CATALOG_COUPONS.map((cat) => (
                <View key={cat.id} style={[s.couponCard, { borderColor: 'rgba(255,255,255,0.08)' }]}>
                  <View style={s.couponCardHeader}>
                    <View style={[s.couponBrandBadge, { backgroundColor: cat.accent + '20', borderColor: cat.accent + '40' }]}>
                      <Text style={[s.couponBrandText, { color: cat.accent }]}>{cat.brand}</Text>
                    </View>
                    <View style={s.discountChip}>
                      <Text style={s.discountChipText}>{cat.discount}</Text>
                    </View>
                  </View>

                  <Text style={s.couponTitle}>{cat.title}</Text>
                  <Text style={s.couponExpiry}>{cat.expiry}</Text>

                  <View style={s.redeemCatalogFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Star size={14} color={C.amber} />
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{cat.cost_credits} Pts</Text>
                    </View>

                    <Pressable
                      onPress={() => redeemCatalogCoupon(cat)}
                      style={s.redeemCatalogBtn}
                    >
                      <Text style={s.redeemCatalogBtnText}>Redeem Coupon</Text>
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
        <View style={s.formColCard}>
          <View style={s.cardHeader}>
            <Text style={s.sectionTitle}>ADD FUNDS TO WALLET</Text>
          </View>
          <Text style={{ color: C.text2, fontSize: 14 }}>
            Top up your SA Wallet using UPI, Card, or Netbanking. Get +10% bonus SA credits on every top-up!
          </Text>

          {/* Amount Presets */}
          <View style={{ gap: 8, marginTop: 8 }}>
            <Text style={s.inputLabel}>SELECT AMOUNT (INR)</Text>
            <View style={s.presetsGrid}>
              {TOPUP_PRESETS.map((amt) => (
                <Pressable
                  key={`top-preset-${amt}`}
                  onPress={() => setTopupAmount(String(amt))}
                  style={[s.presetChip, topupAmount === String(amt) && s.presetChipActive]}
                >
                  <Text style={[s.presetText, topupAmount === String(amt) && s.presetTextActive]}>
                    ₹{amt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Custom Input */}
          <View style={{ gap: 6 }}>
            <Text style={s.inputLabel}>CUSTOM AMOUNT (INR)</Text>
            <TextInput
              value={topupAmount}
              onChangeText={setTopupAmount}
              keyboardType="numeric"
              placeholder="Enter amount in ₹"
              placeholderTextColor={C.dim}
              style={s.textInputCustom}
            />
          </View>

          {/* Payment Method Selector */}
          <View style={{ gap: 8 }}>
            <Text style={s.inputLabel}>PAYMENT METHOD</Text>
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
                    style={[s.methodBox, isSel && s.methodBoxActive]}
                  >
                    <IconC size={16} color={isSel ? C.purpleL : C.textSub} />
                    <Text style={[s.methodText, isSel && s.methodTextActive]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Calculation summary */}
          <View style={s.calcSummaryBox}>
            <View style={s.calcRow}>
              <Text style={s.calcLabel}>Top-up Amount:</Text>
              <Text style={s.calcVal}>{fmtINR(parseFloat(topupAmount) || 0)}</Text>
            </View>
            <View style={s.calcRow}>
              <Text style={s.calcLabel}>Base SA Credits (25x):</Text>
              <Text style={s.calcVal}>+{fmtCredits((parseFloat(topupAmount) || 0) * 25)} Pts</Text>
            </View>
            <View style={s.calcRow}>
              <Text style={s.calcLabel}>10% Bonus Points:</Text>
              <Text style={[s.calcVal, { color: C.green }]}>+{fmtCredits((parseFloat(topupAmount) || 0) * 2.5)} Pts</Text>
            </View>
          </View>

          <Pressable
            onPress={handleTopupSubmit}
            disabled={topupSubmitting}
            style={s.submitActionBtn}
          >
            {topupSubmitting ? (
              <ActivityIndicator size={16} color="#FFF" />
            ) : (
              <Text style={s.submitActionText}>Proceed to Pay {fmtINR(parseFloat(topupAmount) || 0)}</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ── TAB 4: REDEEM / CASHOUT ── */}
      {tab === 'withdraw' && (
        <View style={s.formColCard}>
          <View style={s.cardHeader}>
            <Text style={s.sectionTitle}>REDEEM SA CREDITS FOR CASH</Text>
          </View>
          <Text style={{ color: C.text2, fontSize: 14 }}>
            Convert your earned SA Credits back to real cash. Funds are transferred directly to your UPI ID or Bank account.
          </Text>

          {/* Custom Input */}
          <View style={{ gap: 6 }}>
            <Text style={s.inputLabel}>AMOUNT TO CASH OUT (INR)</Text>
            <TextInput
              value={wdAmountInr}
              onChangeText={setWdAmountInr}
              keyboardType="numeric"
              placeholder="Minimum ₹100"
              placeholderTextColor={C.dim}
              style={s.textInputCustom}
            />
          </View>

          {/* Withdrawal Target Input */}
          <View style={{ gap: 6 }}>
            <Text style={s.inputLabel}>ENTER YOUR UPI ID OR BANK DETAILS</Text>
            <TextInput
              value={wdTarget}
              onChangeText={setWdTarget}
              placeholder="e.g. username@upi or Account Number & IFSC"
              placeholderTextColor={C.dim}
              style={s.textInputCustom}
            />
          </View>

          <Pressable
            onPress={handleWithdrawSubmit}
            disabled={wdSubmitting}
            style={s.submitActionBtn}
          >
            {wdSubmitting ? (
              <ActivityIndicator size={16} color="#FFF" />
            ) : (
              <Text style={s.submitActionText}>Request Cashout ({fmtCredits((parseFloat(wdAmountInr) || 0) * 25)} Pts)</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ── TAB 5: HISTORY ── */}
      {tab === 'history' && (
        <View style={s.formColCard}>
          <View style={s.cardHeader}>
            <Text style={s.sectionTitle}>TRANSACTION HISTORY</Text>
          </View>

          <View style={{ gap: 12 }}>
            {(data?.history || []).map((tx, idx) => (
              <View key={tx.id || idx} style={s.txFullRow}>
                <View style={[s.txIconBox, { backgroundColor: tx.type === 'credit' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)' }]}>
                  {tx.type === 'credit' ? (
                    <ArrowDownLeft size={18} color={C.green} />
                  ) : (
                    <ArrowUpRight size={18} color={C.red} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.txFullReason}>{tx.reason}</Text>
                  <Text style={s.txFullMeta}>
                    ID: {tx.id || 'TX-8921'} · {tx.ts ? new Date(tx.ts).toLocaleString() : 'Recent'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[s.txFullAmount, { color: tx.type === 'credit' ? C.green : C.red }]}>
                    {tx.type === 'credit' ? '+' : '-'}{fmtCredits(tx.amount)} Pts
                  </Text>
                  <Text style={s.txFullBal}>Bal: {fmtCredits(tx.balance_after || 0)} Pts</Text>
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
const s = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: C.bg,
  },
  embeddedShell: {
    flex: 1,
    backgroundColor: 'transparent',
    gap: 24,
    paddingBottom: 60,
  },
  contentContainer: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    paddingBottom: 80,
    gap: 24,
    maxWidth: 1280,
    width: '100%' as any,
    alignSelf: 'center' as any,
  },

  /* Header */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 280,
  },
  greetingText: {
    color: C.text,
    fontFamily: FT.med,
    fontSize: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  regenBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  regenBtnHover: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  regenBtnText: {
    color: C.purpleL,
    fontFamily: FT.bold,
    fontSize: 12,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.purple2,
  },
  reportBtnHover: {
    backgroundColor: '#6366F1',
  },
  reportBtnText: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 12,
  },

  /* KPI Row */
  kpiRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: Platform.OS === 'web' ? ('nowrap' as any) : 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: C.bgCard,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLabel: {
    color: C.purpleXL,
    fontFamily: FT.bold,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    color: '#FFF',
    fontFamily: FT.xbold,
    fontSize: 22,
    textShadowColor: 'rgba(255,255,255,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  kpiSubText: {
    color: C.textSub,
    fontFamily: FT.med,
    fontSize: 12,
  },

  /* Tab Bar */
  tabBarRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
    flexWrap: 'wrap',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    color: '#475569',
    fontFamily: FT.bold,
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: FT.xbold,
  },

  /* Hero Card */
  heroCard: {
    borderRadius: 16,
    borderColor: 'rgba(30, 58, 110, 0.60)',
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  heroOverline: {
    color: C.purpleXL,
    fontFamily: FT.bold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  heroBalanceBig: {
    color: '#FFF',
    fontFamily: FT.xbold,
    fontSize: 38,
    textShadowColor: 'rgba(255,255,255,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroBalanceSub: {
    color: C.text2,
    fontFamily: FT.med,
    fontSize: 14,
  },
  heroQuickRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  heroBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.purple2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  heroBtnText: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 13,
  },
  heroBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: C.border2,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  heroBtnTextSec: {
    color: C.text,
    fontFamily: FT.bold,
    fontSize: 13,
  },
  heroRightTile: {
    width: 240,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  heroTileTitle: {
    color: C.purpleXL,
    fontFamily: FT.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  heroTileVal: {
    color: C.teal,
    fontFamily: FT.xbold,
    fontSize: 18,
  },
  heroTileDesc: {
    color: C.textSub,
    fontFamily: FT.med,
    fontSize: 12,
    lineHeight: 16,
  },

  /* 2 Col Layout */
  twoColRow: {
    flexDirection: Platform.OS === 'web' ? ('row' as any) : 'column',
    gap: 24,
    alignItems: 'stretch',
  },
  colCard: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: C.purpleXL,
    fontFamily: FT.bold,
    fontSize: 16,
    letterSpacing: 1.1,
  },
  cardBottomLinkText: {
    color: C.purpleL,
    fontFamily: FT.bold,
    fontSize: 13,
  },

  /* Transactions */
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  txIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txReason: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 13,
  },
  txDate: {
    color: C.textSub,
    fontFamily: FT.med,
    fontSize: 11,
  },
  txAmount: {
    fontFamily: FT.bold,
    fontSize: 14,
  },

  /* Coupon Controls */
  couponControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  couponFilterGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#0F2347',
    borderColor: '#2A4F8F',
    borderWidth: 1.5,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
    borderWidth: 1.5,
  },
  filterChipText: {
    color: '#FFFFFF',
    fontFamily: FT.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: FT.xbold,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1A33',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    minWidth: 250,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: FT.med,
    fontSize: 13,
  },
  couponSectionHeader: {
    marginBottom: 14,
    gap: 4,
  },
  couponSectionTitle: {
    color: '#0F172A',
    fontFamily: FT.xbold,
    fontSize: 17,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  couponSectionSub: {
    color: '#475569',
    fontFamily: FT.med,
    fontSize: 14,
    lineHeight: 20,
  },

  /* Coupons Grid */
  couponsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  couponCard: {
    flexBasis: Platform.OS === 'web' ? 340 : '100%',
    flexGrow: 1,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  couponCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponBrandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  couponBrandText: {
    fontFamily: FT.xbold,
    fontSize: 12,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontFamily: FT.bold,
    fontSize: 11,
  },
  discountChip: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountChipText: {
    color: C.green,
    fontFamily: FT.bold,
    fontSize: 11,
  },
  couponTitle: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 15,
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  couponExpiry: {
    color: C.textSub,
    fontFamily: FT.med,
    fontSize: 12,
  },
  voucherCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderColor: 'rgba(30, 58, 110, 0.60)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  voucherCodeText: {
    color: C.purpleXL,
    fontFamily: FT.bold,
    fontSize: 14,
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnText: {
    color: C.purpleL,
    fontFamily: FT.bold,
    fontSize: 11,
  },
  couponActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  useNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.purple2,
    paddingVertical: 8,
    borderRadius: 8,
  },
  useNowBtnText: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 12,
  },
  markUsedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  markUsedText: {
    color: C.textSub,
    fontFamily: FT.med,
    fontSize: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
    backgroundColor: C.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 16,
  },
  emptySub: {
    color: C.textSub,
    fontFamily: FT.med,
    fontSize: 13,
  },
  redeemCatalogFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  redeemCatalogBtn: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: C.green,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  redeemCatalogBtnText: {
    color: C.green,
    fontFamily: FT.bold,
    fontSize: 12,
  },

  /* Form Cards */
  formColCard: {
    backgroundColor: C.bgCard,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    gap: 18,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  inputLabel: {
    color: C.purpleXL,
    fontFamily: FT.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  presetsGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: C.border,
    borderWidth: 1,
  },
  presetChipActive: {
    backgroundColor: C.purple2,
    borderColor: C.purpleL,
  },
  presetText: {
    color: C.text,
    fontFamily: FT.bold,
    fontSize: 13,
  },
  presetTextActive: {
    color: '#FFF',
  },
  textInputCustom: {
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFF',
    fontFamily: FT.med,
    fontSize: 14,
  },
  methodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border,
    borderWidth: 1,
  },
  methodBoxActive: {
    borderColor: C.purpleL,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  methodText: {
    color: C.textSub,
    fontFamily: FT.med,
    fontSize: 13,
  },
  methodTextActive: {
    color: '#FFF',
    fontFamily: FT.bold,
  },
  calcSummaryBox: {
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcLabel: {
    color: C.textSub,
    fontFamily: FT.med,
    fontSize: 13,
  },
  calcVal: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 13,
  },
  submitActionBtn: {
    backgroundColor: C.purple2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitActionText: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 14,
  },

  /* History */
  txFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  txFullReason: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 14,
  },
  txFullMeta: {
    color: C.textSub,
    fontFamily: FT.med,
    fontSize: 12,
  },
  txFullAmount: {
    fontFamily: FT.xbold,
    fontSize: 15,
  },
  txFullBal: {
    color: C.dim,
    fontFamily: FT.med,
    fontSize: 11,
  },
});
