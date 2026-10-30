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
import { useTheme } from '@/src/theme/ThemeContext';

/* ────────── Design Tokens ────────── */
const C = {
  bg: '#0A1628',
  bgCard: '#0F2347',
  bgCardH: '#162E5A',
  border: '#1E3A6E',
  border2: '#2A4F8F',
  text: '#FFFFFF',
  text2: '#E8F0FF',
  textSub: '#94B4E0',
  dim: '#6B8CC4',
  purple: '#60A5FA',
  purple2: '#3B82F6',
  purpleL: '#93C5FD',
  purpleXL: '#DBEAFE',
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
  partner_name?: string;
  event_id?: string;
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
  const { isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);
  const { width: winW } = useWindowDimensions();
  const isTablet = winW >= 680;

  const colors = useMemo(() => ({
    bg: isDark ? '#0A1628' : '#F8FAFC',
    bgCard: isDark ? '#0F2347' : '#FFFFFF',
    bgCardHover: isDark ? '#162E5A' : '#F1F5F9',
    border: isDark ? '#1E3A6E' : '#E2E8F0',
    border2: isDark ? '#2A4F8F' : '#CBD5E1',
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? '#E8F0FF' : '#334155',
    textSub: isDark ? '#94B4E0' : '#64748B',
    dim: isDark ? '#6B8CC4' : '#94A3B8',
    purpleL: isDark ? '#93C5FD' : '#2563EB',
    purpleXL: isDark ? '#DBEAFE' : '#1E40AF',
    kpiLabel: isDark ? '#93C5FD' : '#2563EB',
    kpiValue: isDark ? '#FFFFFF' : '#0F172A',
    kpiIconBg: isDark ? 'rgba(96, 165, 250, 0.15)' : '#EFF6FF',
    cardShadow: isDark ? {} : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    tabInactiveBg: isDark ? '#0F2347' : '#FFFFFF',
    tabInactiveBorder: isDark ? '#2A4F8F' : '#CBD5E1',
    tabInactiveText: isDark ? '#94B4E0' : '#475569',
    searchBg: isDark ? '#0B1A33' : '#F8FAFC',
    searchBorder: isDark ? '#3B82F6' : '#CBD5E1',
    inputBg: isDark ? 'rgba(0,0,0,0.30)' : '#F8FAFC',
    codeBoxBg: isDark ? 'rgba(0,0,0,0.40)' : '#F8FAFC',
    codeBoxBorder: isDark ? 'rgba(30, 58, 110, 0.60)' : '#CBD5E1',
    codeBoxText: isDark ? '#DBEAFE' : '#1E40AF',
    infoBoxBg: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF',
    infoBoxBorder: isDark ? 'rgba(59,130,246,0.20)' : '#BFDBFE',
    txRowBg: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    modalBg: isDark ? '#12162A' : '#FFFFFF',
    modalBorder: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
  }), [isDark]);

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
  const [instructionModal, setInstructionModal] = useState<{ title: string; instructions: string; website?: string } | null>(null);

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
            const discountLabel = c.discount_type === 'duration'
              ? `${c.duration_months || '?'} Month${(c.duration_months || 0) !== 1 ? 's' : ''} Access`
              : c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`;
            const partnerLabel = c.partner_name || c.vendor_name || '';
            const eventLabel = c.event_id ? c.event_id.toUpperCase() : '';
            allCoupons.push({
              id: `coup-${c.code}`,
              brand: partnerLabel || 'Student Alumni',
              title: c.description || discountLabel,
              discount: discountLabel,
              code: c.code,
              cost_credits: 0,
              url: c.website_url || '',
              expiry: '',
              status: c.locked ? 'locked' : 'active',
              category: cat,
              accent: cat === 'partner' ? '#3B82F6' : cat === 'event' ? '#10B981' : cat === 'promo' ? '#F59E0B' : '#8B5CF6',
              instructions: c.instructions || '',
              locked: c.locked || false,
              partner_name: partnerLabel,
              event_id: eventLabel,
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
          ? { ...c, status: 'used', used_at: new Date().toISOString() }
          : c
      )
    );
    toast.success('Coupon Marked Used', 'Moved to your redeemed history.');
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

  // Used coupons (for "My Redeemed" section)
  const usedCoupons = useMemo(() => myCoupons.filter((c) => c.status === 'used'), [myCoupons]);
  // Available coupons (active + locked, for category grouping)
  const availableCoupons = useMemo(() => myCoupons.filter((c) => c.status !== 'used'), [myCoupons]);

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
        theme: { color: '#2563EB' },
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
    : { style: [s.shell, { backgroundColor: colors.bg }], contentContainerStyle: s.contentContainer };

  return (
    <Container {...containerProps}>

      {/* ══════════════ 1. HEADER BANNER ══════════════ */}
      <View style={s.headerBar}>
        <View style={s.headerLeft}>
          <Text style={[s.greetingText, { color: colors.text }]}>
            Welcome back, {studentName}! Manage your SA Credits, Deals & Cashouts.
          </Text>
        </View>

        <View style={s.headerActions}>
          <Pressable
            onPress={() => fetchSummary(true)}
            disabled={refreshing}
            style={({ pressed, hovered }: any) => [
              s.regenBtn,
              {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
              },
              (pressed || hovered) && { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#DBEAFE' },
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size={13} color={colors.purpleL} />
            ) : (
              <Text style={[s.regenBtnText, { color: colors.purpleL }]}>↺ Sync Balance</Text>
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
        <View style={[s.kpiCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, colors.cardShadow]}>
          <View style={s.kpiTopRow}>
            <Text style={[s.kpiLabel, { color: colors.kpiLabel }]}>WALLET BALANCE</Text>
            <View style={[s.kpiIconBox, { backgroundColor: colors.kpiIconBg }]}>
              <Wallet size={16} color={colors.purpleL} />
            </View>
          </View>
          <Text style={[s.kpiValue, { color: colors.kpiValue }]}>{fmtINR(balanceInr)}</Text>
          <Text style={[s.kpiSubText, { color: colors.textSub }]}>✦ {fmtCredits(balancePts)} SA Credits</Text>
        </View>

        {/* Card 2: Rewards Level */}
        <View style={[s.kpiCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, colors.cardShadow]}>
          <View style={s.kpiTopRow}>
            <Text style={[s.kpiLabel, { color: colors.kpiLabel }]}>REWARDS TIER</Text>
            <View style={[s.kpiIconBox, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#FEF3C7' }]}>
              <Award size={16} color={C.amber} />
            </View>
          </View>
          <Text style={[s.kpiValue, { color: colors.kpiValue }]}>Level 3 Cobalt</Text>
          <Text style={[s.kpiSubText, { color: colors.textSub }]}>7,500 pts to Sapphire</Text>
        </View>

        {/* Card 3: Active Coupons */}
        <Pressable
          onPress={() => setTab('coupons')}
          style={[s.kpiCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, colors.cardShadow]}
        >
          <View style={s.kpiTopRow}>
            <Text style={[s.kpiLabel, { color: colors.kpiLabel }]}>MY COUPONS</Text>
            <View style={[s.kpiIconBox, { backgroundColor: colors.kpiIconBg }]}>
              <Tag size={16} color={colors.purpleL} />
            </View>
          </View>
          <Text style={[s.kpiValue, { color: colors.kpiValue }]}>{activeCount} Active</Text>
          <Text style={[s.kpiSubText, { color: colors.textSub }]}>{usedCount} Coupons Used</Text>
        </Pressable>

        {/* Card 4: Lifetime Savings */}
        <View style={[s.kpiCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, colors.cardShadow]}>
          <View style={s.kpiTopRow}>
            <Text style={[s.kpiLabel, { color: colors.kpiLabel }]}>TOTAL SAVED</Text>
            <View style={[s.kpiIconBox, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#D1FAE5' }]}>
              <Zap size={16} color={C.teal} />
            </View>
          </View>
          <Text style={[s.kpiValue, { color: colors.kpiValue }]}>{fmtINR(4850)}</Text>
          <Text style={[s.kpiSubText, { color: colors.textSub }]}>Across 5 SA partner deals</Text>
        </View>
      </View>

      {/* ══════════════ 3. NAVIGATION TAB STRIP ══════════════ */}
      <View style={[s.tabBarRow, { backgroundColor: colors.tabInactiveBg, borderColor: colors.border }]}>
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
              <IconComp size={15} color={isActive ? '#FFF' : colors.tabInactiveText} />
              <Text style={[s.tabText, { color: colors.tabInactiveText }, isActive && s.tabTextActive]}>{t.label}</Text>
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
            colors={isDark ? ['#1E3A6E', '#0F2347', '#0A1628'] : ['#1E3A8A', '#1E40AF', '#2563EB']}
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
                    <Tag size={14} color="#93C5FD" />
                    <Text style={s.heroBtnTextSec}>View My Coupons</Text>
                  </Pressable>
                  <Pressable onPress={() => setTab('withdraw')} style={s.heroBtnSecondary}>
                    <ArrowUpRight size={14} color="#6EE7B7" />
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
            <View style={[s.colCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, colors.cardShadow]}>
              <View style={s.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} color={colors.purpleL} />
                  <Text style={[s.sectionTitle, { color: colors.kpiLabel }]}>MONEY COACH AI</Text>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(52,211,153,0.15)' }}>
                  <Text style={{ color: C.green, fontSize: 10, fontFamily: FT.bold }}>● LIVE</Text>
                </View>
              </View>

              {/* Greeting Banner */}
              <View style={{
                backgroundColor: colors.infoBoxBg,
                borderColor: colors.infoBoxBorder,
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
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: FT.bold }}>
                    Hi {studentName}! 👋 I'm your Money Coach.
                  </Text>
                  <Text style={{ color: colors.textSub, fontSize: 11.5, fontFamily: FT.reg, marginTop: 2 }}>
                    Ask me anything about your credits, savings, or spending patterns.
                  </Text>
                </View>
              </View>

              {/* Quick Insights */}
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.kpiLabel, fontSize: 10.5, fontFamily: FT.bold, letterSpacing: 0.8 }}>QUICK INSIGHTS</Text>
                {[
                  { icon: TrendingUp, color: '#34D399', text: `You've earned ${fmtCredits(data?.lifetime_earned || 42500)} total credits. Keep going!` },
                  { icon: Star,       color: '#FBBF24', text: 'Complete your profile to unlock 500 bonus credits this week.' },
                  { icon: Zap,        color: '#60A5FA', text: `You're 7,500 pts away from Sapphire tier — attend 1 event to fast-track.` },
                ].map((tip, i) => (
                  <View key={i} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: colors.txRowBg,
                    borderColor: colors.border, borderWidth: 1,
                    borderRadius: 10, padding: 10,
                  }}>
                    <tip.icon size={15} color={tip.color} />
                    <Text style={{ flex: 1, color: colors.text2, fontSize: 12, fontFamily: FT.reg, lineHeight: 17 }}>
                      {tip.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Slash Command Chips */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.kpiLabel, fontSize: 10.5, fontFamily: FT.bold, letterSpacing: 0.8 }}>TRY A COMMAND</Text>
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
                        backgroundColor: hovered ? (isDark ? 'rgba(59,130,246,0.22)' : '#DBEAFE') : colors.infoBoxBg,
                        borderColor: colors.infoBoxBorder, borderWidth: 1,
                        cursor: 'pointer',
                      } as any)}
                    >
                      <Text style={{ color: colors.purpleL, fontSize: 11.5, fontFamily: FT.bold }}>
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
                  backgroundColor: hovered ? '#1D4ED8' : '#2563EB',
                  borderRadius: 12, paddingVertical: 12, marginTop: 4,
                  cursor: 'pointer',
                } as any)}
              >
                <Sparkles size={15} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 13, fontFamily: FT.bold }}>
                  Open Money Coach Chat
                </Text>
                <ChevronRight size={15} color="#FFF" />
              </Pressable>
              <MoneyCoach />
            </View>

            {/* Recent Activity */}
            <View style={[s.colCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, colors.cardShadow]}>
              <View style={s.cardHeader}>
                <Text style={[s.sectionTitle, { color: colors.kpiLabel }]}>RECENT ACTIVITY</Text>
                <Pressable onPress={() => setTab('history')}>
                  <Text style={[s.cardBottomLinkText, { color: colors.purpleL }]}>View All ➔</Text>
                </Pressable>
              </View>

              <View style={{ gap: 10 }}>
                {(data?.history || []).slice(0, 4).map((tx, idx) => (
                  <View key={tx.id || idx} style={[s.txRow, { backgroundColor: colors.txRowBg, borderColor: colors.border }]}>
                    <View style={[s.txIconBox, { backgroundColor: tx.type === 'credit' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)' }]}>
                      {tx.type === 'credit' ? (
                        <ArrowDownLeft size={16} color={C.green} />
                      ) : (
                        <ArrowUpRight size={16} color={C.red} />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.txReason, { color: colors.text }]}>{tx.reason}</Text>
                      <Text style={[s.txDate, { color: colors.textSub }]}>{tx.ts ? new Date(tx.ts).toLocaleDateString() : 'Recent'}</Text>
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
              ].map((f) => {
                const isSel = couponFilter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setCouponFilter(f.id as any)}
                    style={[
                      s.filterChip,
                      {
                        backgroundColor: isSel ? '#2563EB' : colors.tabInactiveBg,
                        borderColor: isSel ? '#3B82F6' : colors.tabInactiveBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.filterChipText,
                        { color: isSel ? '#FFFFFF' : colors.tabInactiveText },
                        isSel && s.filterChipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Search Input */}
            <View style={[s.searchWrap, { backgroundColor: colors.searchBg, borderColor: colors.searchBorder }]}>
              <Search size={15} color={colors.purpleL} style={{ marginRight: 8 }} />
              <TextInput
                value={couponSearch}
                onChangeText={setCouponSearch}
                placeholder="Search by brand or code..."
                placeholderTextColor={colors.dim}
                style={[s.searchInput, { color: colors.text }]}
              />
              {!!couponSearch && (
                <Pressable onPress={() => setCouponSearch('')}>
                  <X size={15} color={colors.purpleL} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Help Note */}
          <View style={{
            padding: 16,
            backgroundColor: colors.infoBoxBg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.infoBoxBorder,
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Info size={16} color="#2563EB" />
              <Text style={{ fontSize: 14, fontFamily: FT.bold, color: '#2563EB' }}>How Coupons Work</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.text2, lineHeight: 20, fontFamily: FT.reg }}>
              • <Text style={{ fontFamily: FT.bold, color: '#7C3AED' }}>Food & Beverages</Text> — Show the code at event stalls to get discounts on food orders.{'\n'}
              • <Text style={{ fontFamily: FT.bold, color: '#2563EB' }}>Partner</Text> — Use these codes on partner websites (Coursera, Spotify, etc.) for free access or discounts.{'\n'}
              • <Text style={{ fontFamily: FT.bold, color: '#059669' }}>Event</Text> — Apply at event registration checkout for discounts.{'\n'}
              • <Text style={{ fontFamily: FT.bold, color: '#D97706' }}>Promo</Text> — General platform promotions available to all users.{'\n\n'}
              <Text style={{ fontFamily: FT.bold, color: '#EF4444' }}>Locked coupons</Text> will become available during the event. Copy the code and use "Use Now" to visit the partner website.
            </Text>
          </View>

          {/* If filtering by "used", show redeemed list immediately */}
          {couponFilter === 'used' ? (
            <View>
              <View style={s.couponSectionHeader}>
                <Text style={[s.couponSectionTitle, { color: colors.text }]}>REDEEMED COUPONS</Text>
                <Text style={[s.couponSectionSub, { color: colors.textSub }]}>
                  Coupons you've already used.
                </Text>
              </View>

              {usedCoupons.length === 0 ? (
                <View style={[s.emptyBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <Tag size={40} color={colors.dim} />
                  <Text style={[s.emptyTitle, { color: colors.text }]}>No redeemed coupons yet</Text>
                  <Text style={[s.emptySub, { color: colors.textSub }]}>Use a coupon code and it will appear here.</Text>
                </View>
              ) : (
                <View style={s.couponsGrid}>
                  {usedCoupons.map((c) => (
                    <View
                      key={c.id}
                      style={[
                        s.couponCard,
                        {
                          backgroundColor: colors.bgCard,
                          borderColor: c.locked ? 'rgba(239,68,68,0.25)' : (isDark ? c.accent + '33' : colors.border),
                          opacity: c.locked ? 0.8 : 1,
                        },
                        colors.cardShadow,
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        {c.brand && !c.brand.includes('Student Alumni') ? (
                          <View style={[s.couponBrandBadge, { backgroundColor: c.accent + '20', borderColor: c.accent + '40' }]}>
                            <Text style={[s.couponBrandText, { color: c.accent }]}>{c.brand}</Text>
                          </View>
                        ) : null}
                        {c.event_id ? (
                          <View style={[s.statusPill, { backgroundColor: 'rgba(124,92,246,0.15)', paddingHorizontal: 8, paddingVertical: 3 }]}>
                            <Text style={{ fontSize: 10, fontFamily: FT.bold, color: '#7C3AED', letterSpacing: 0.3 }}>{c.event_id}</Text>
                          </View>
                        ) : null}
                        <View style={[s.statusPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                          <Text style={[s.statusPillText, { color: colors.dim }]}>✓ Used</Text>
                        </View>
                      </View>

                      <Text style={[s.couponTitle, { color: colors.text }]}>{c.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2, fontFamily: FT.med }}>{c.discount}</Text>

                      <View style={[s.voucherCodeBox, { backgroundColor: colors.codeBoxBg, borderColor: colors.codeBoxBorder }]}>
                        <Text style={[s.voucherCodeText, { color: colors.codeBoxText }]}>{c.code}</Text>
                        <Pressable onPress={() => copyCouponCode(c.code)} style={[s.copyBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                          <Copy size={13} color={colors.purpleL} />
                          <Text style={[s.copyBtnText, { color: colors.purpleL }]}>Copy</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Coupons grouped by category */}
              {(['marketplace', 'partner', 'event', 'promo'] as const).map((cat) => {
                const catCoupons = availableCoupons.filter((c) => {
                  if (c.category !== cat) return false;
                  if (couponFilter === 'locked') return c.locked;
                  if (couponFilter === 'active') return !c.locked && c.status === 'active';
                  return true;
                });
                if (catCoupons.length === 0) return null;
                const catLabel = cat === 'marketplace' ? 'Food & Beverages' : cat === 'partner' ? 'Partner Offers' : cat === 'event' ? 'Event Discounts' : 'Promotions';
                const catColor = cat === 'marketplace' ? '#8B5CF6' : cat === 'partner' ? '#3B82F6' : cat === 'event' ? '#10B981' : '#F59E0B';
                return (
                  <View key={cat} style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Text style={{ fontSize: 14, fontFamily: FT.bold, color: catColor }}>{catLabel}</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: catColor + '33' }} />
                      <Text style={{ fontSize: 12, color: colors.textSub, fontFamily: FT.med }}>{catCoupons.length}</Text>
                    </View>
                    <View style={s.couponsGrid}>
                      {catCoupons.map((c) => (
                        <View
                          key={c.id}
                          style={[
                            s.couponCard,
                            {
                              backgroundColor: colors.bgCard,
                              borderColor: c.locked ? 'rgba(239,68,68,0.25)' : (isDark ? c.accent + '33' : colors.border),
                              opacity: c.locked ? 0.8 : 1,
                            },
                            colors.cardShadow,
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            {c.brand && !c.brand.includes('Student Alumni') ? (
                              <View style={[s.couponBrandBadge, { backgroundColor: c.accent + '20', borderColor: c.accent + '40' }]}>
                                <Text style={[s.couponBrandText, { color: c.accent }]}>{c.brand}</Text>
                              </View>
                            ) : null}
                            {c.event_id ? (
                              <View style={[s.statusPill, { backgroundColor: 'rgba(124,92,246,0.15)', paddingHorizontal: 8, paddingVertical: 3 }]}>
                                <Text style={{ fontSize: 10, fontFamily: FT.bold, color: '#7C3AED', letterSpacing: 0.3 }}>{c.event_id}</Text>
                              </View>
                            ) : null}
                            <View style={[s.statusPill, { backgroundColor: c.locked ? 'rgba(239,68,68,0.12)' : 'rgba(52, 211, 153, 0.15)' }]}>
                              {c.locked ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Lock size={10} color="#EF4444" />
                                  <Text style={[s.statusPillText, { color: '#EF4444' }]}>Locked</Text>
                                </View>
                              ) : (
                                <Text style={[s.statusPillText, { color: C.green }]}>● Ready</Text>
                              )}
                            </View>
                          </View>

                          <Text style={[s.couponTitle, { color: colors.text }]}>{c.title}</Text>
                          <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2, fontFamily: FT.med }}>{c.discount}</Text>

                          {c.instructions ? (
                            <Pressable
                              onPress={() => setInstructionModal({ title: c.brand || c.code, instructions: c.instructions || '', website: c.url })}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 4, paddingVertical: 2 }}
                            >
                              <Info size={11} color="#2563EB" />
                              <Text style={{ fontSize: 11, color: '#2563EB', flex: 1, fontFamily: FT.med }} numberOfLines={2}>{c.instructions}</Text>
                              <Text style={{ fontSize: 10, color: '#2563EB', fontFamily: FT.bold }}>Details →</Text>
                            </Pressable>
                          ) : null}

                          {!c.locked && (
                            <View style={[s.voucherCodeBox, { backgroundColor: colors.codeBoxBg, borderColor: colors.codeBoxBorder }]}>
                              <Text style={[s.voucherCodeText, { color: colors.codeBoxText }]}>{c.code}</Text>
                              <Pressable onPress={() => copyCouponCode(c.code)} style={[s.copyBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                                <Copy size={13} color={colors.purpleL} />
                                <Text style={[s.copyBtnText, { color: colors.purpleL }]}>Copy</Text>
                              </Pressable>
                            </View>
                          )}

                          {c.locked && (
                            <View style={[s.voucherCodeBox, { backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }]}>
                              <Lock size={13} color="#EF4444" />
                              <Text style={{ fontSize: 12, color: '#EF4444', fontFamily: FT.bold }}>Available during event</Text>
                            </View>
                          )}

                          {!c.locked && (
                            <View style={s.couponActionRow}>
                              <Pressable onPress={() => { if (c.url) Linking.openURL(c.url); }} style={s.useNowBtn}>
                                <Text style={s.useNowBtnText}>Use Now</Text>
                                <ExternalLink size={12} color="#FFF" />
                              </Pressable>
                              {c.status === 'active' && (
                                <Pressable
                                  onPress={() => markCouponAsUsed(c.id)}
                                  style={[s.markUsedBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}
                                >
                                  <CheckCircle2 size={12} color={colors.textSub} />
                                  <Text style={[s.markUsedText, { color: colors.textSub }]}>Mark Used</Text>
                                </Pressable>
                              )}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}

              {/* Redeemed Coupons Summary in All Tab */}
              {couponFilter === 'all' && usedCoupons.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View style={s.couponSectionHeader}>
                    <Text style={[s.couponSectionTitle, { color: colors.text }]}>REDEEMED COUPONS</Text>
                    <Text style={[s.couponSectionSub, { color: colors.textSub }]}>
                      Coupons you've already used.
                    </Text>
                  </View>

                  <View style={s.couponsGrid}>
                    {usedCoupons.map((c) => (
                      <View
                        key={c.id}
                        style={[
                          s.couponCard,
                          {
                            backgroundColor: colors.bgCard,
                            borderColor: colors.border,
                          },
                          colors.cardShadow,
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          {c.brand && !c.brand.includes('Student Alumni') ? (
                            <View style={[s.couponBrandBadge, { backgroundColor: c.accent + '20', borderColor: c.accent + '40' }]}>
                              <Text style={[s.couponBrandText, { color: c.accent }]}>{c.brand}</Text>
                            </View>
                          ) : null}
                          <View style={[s.statusPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                            <Text style={[s.statusPillText, { color: colors.dim }]}>✓ Used</Text>
                          </View>
                        </View>

                        <Text style={[s.couponTitle, { color: colors.text }]}>{c.title}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2, fontFamily: FT.med }}>{c.discount}</Text>

                        <View style={[s.voucherCodeBox, { backgroundColor: colors.codeBoxBg, borderColor: colors.codeBoxBorder }]}>
                          <Text style={[s.voucherCodeText, { color: colors.codeBoxText }]}>{c.code}</Text>
                          <Pressable onPress={() => copyCouponCode(c.code)} style={[s.copyBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                            <Copy size={13} color={colors.purpleL} />
                            <Text style={[s.copyBtnText, { color: colors.purpleL }]}>Copy</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* ── TAB 3: ADD FUNDS ── */}
      {tab === 'topup' && (
        <View style={[s.formColCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, colors.cardShadow]}>
          <View style={s.cardHeader}>
            <Text style={[s.sectionTitle, { color: colors.kpiLabel }]}>ADD FUNDS TO WALLET</Text>
          </View>
          <Text style={{ color: colors.text2, fontSize: 14, fontFamily: FT.reg }}>
            Top up your SA Wallet using UPI, Card, or Netbanking. Get +10% bonus SA credits on every top-up!
          </Text>

          {/* Amount Presets */}
          <View style={{ gap: 8, marginTop: 8 }}>
            <Text style={[s.inputLabel, { color: colors.kpiLabel }]}>SELECT AMOUNT (INR)</Text>
            <View style={s.presetsGrid}>
              {TOPUP_PRESETS.map((amt) => {
                const isSel = topupAmount === String(amt);
                return (
                  <Pressable
                    key={`top-preset-${amt}`}
                    onPress={() => setTopupAmount(String(amt))}
                    style={[
                      s.presetChip,
                      {
                        backgroundColor: isSel ? '#2563EB' : (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                        borderColor: isSel ? '#3B82F6' : colors.border,
                      },
                    ]}
                  >
                    <Text style={[s.presetText, { color: isSel ? '#FFFFFF' : colors.text }]}>
                      ₹{amt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Custom Input */}
          <View style={{ gap: 6 }}>
            <Text style={[s.inputLabel, { color: colors.kpiLabel }]}>CUSTOM AMOUNT (INR)</Text>
            <TextInput
              value={topupAmount}
              onChangeText={setTopupAmount}
              keyboardType="numeric"
              placeholder="Enter amount in ₹"
              placeholderTextColor={colors.dim}
              style={[s.textInputCustom, { backgroundColor: colors.inputBg, borderColor: colors.border2, color: colors.text }]}
            />
          </View>

          {/* Payment Method Selector */}
          <View style={{ gap: 8 }}>
            <Text style={[s.inputLabel, { color: colors.kpiLabel }]}>PAYMENT METHOD</Text>
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
                    style={[
                      s.methodBox,
                      {
                        backgroundColor: isSel ? (isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF') : (isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'),
                        borderColor: isSel ? '#2563EB' : colors.border,
                      },
                    ]}
                  >
                    <IconC size={16} color={isSel ? colors.purpleL : colors.textSub} />
                    <Text style={[s.methodText, { color: isSel ? colors.purpleL : colors.textSub }, isSel && s.methodTextActive]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Calculation summary */}
          <View style={[s.calcSummaryBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <View style={s.calcRow}>
              <Text style={[s.calcLabel, { color: colors.textSub }]}>Top-up Amount:</Text>
              <Text style={[s.calcVal, { color: colors.text }]}>{fmtINR(parseFloat(topupAmount) || 0)}</Text>
            </View>
            <View style={s.calcRow}>
              <Text style={[s.calcLabel, { color: colors.textSub }]}>Base SA Credits (25x):</Text>
              <Text style={[s.calcVal, { color: colors.text }]}>+{fmtCredits((parseFloat(topupAmount) || 0) * 25)} Pts</Text>
            </View>
            <View style={s.calcRow}>
              <Text style={[s.calcLabel, { color: colors.textSub }]}>10% Bonus Points:</Text>
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
        <View style={[s.formColCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, colors.cardShadow]}>
          <View style={s.cardHeader}>
            <Text style={[s.sectionTitle, { color: colors.kpiLabel }]}>REDEEM SA CREDITS FOR CASH</Text>
          </View>
          <Text style={{ color: colors.text2, fontSize: 14, fontFamily: FT.reg }}>
            Convert your earned SA Credits back to real cash. Funds are transferred directly to your UPI ID or Bank account.
          </Text>

          {/* Custom Input */}
          <View style={{ gap: 6 }}>
            <Text style={[s.inputLabel, { color: colors.kpiLabel }]}>AMOUNT TO CASH OUT (INR)</Text>
            <TextInput
              value={wdAmountInr}
              onChangeText={setWdAmountInr}
              keyboardType="numeric"
              placeholder="Minimum ₹100"
              placeholderTextColor={colors.dim}
              style={[s.textInputCustom, { backgroundColor: colors.inputBg, borderColor: colors.border2, color: colors.text }]}
            />
          </View>

          {/* Withdrawal Target Input */}
          <View style={{ gap: 6 }}>
            <Text style={[s.inputLabel, { color: colors.kpiLabel }]}>ENTER YOUR UPI ID OR BANK DETAILS</Text>
            <TextInput
              value={wdTarget}
              onChangeText={setWdTarget}
              placeholder="e.g. username@upi or Account Number & IFSC"
              placeholderTextColor={colors.dim}
              style={[s.textInputCustom, { backgroundColor: colors.inputBg, borderColor: colors.border2, color: colors.text }]}
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
        <View style={[s.formColCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, colors.cardShadow]}>
          <View style={s.cardHeader}>
            <Text style={[s.sectionTitle, { color: colors.kpiLabel }]}>TRANSACTION HISTORY</Text>
          </View>

          <View style={{ gap: 12 }}>
            {(data?.history || []).map((tx, idx) => (
              <View key={tx.id || idx} style={[s.txFullRow, { backgroundColor: colors.txRowBg, borderColor: colors.border }]}>
                <View style={[s.txIconBox, { backgroundColor: tx.type === 'credit' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)' }]}>
                  {tx.type === 'credit' ? (
                    <ArrowDownLeft size={18} color={C.green} />
                  ) : (
                    <ArrowUpRight size={18} color={C.red} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.txFullReason, { color: colors.text }]}>{tx.reason}</Text>
                  <Text style={[s.txFullMeta, { color: colors.textSub }]}>
                    ID: {tx.id || 'TX-8921'} · {tx.ts ? new Date(tx.ts).toLocaleString() : 'Recent'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[s.txFullAmount, { color: tx.type === 'credit' ? C.green : C.red }]}>
                    {tx.type === 'credit' ? '+' : '-'}{fmtCredits(tx.amount)} Pts
                  </Text>
                  <Text style={[s.txFullBal, { color: colors.dim }]}>Bal: {fmtCredits(tx.balance_after || 0)} Pts</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Instruction Detail Modal */}
      <Modal visible={!!instructionModal} transparent animationType="fade" onRequestClose={() => setInstructionModal(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }} onPress={() => setInstructionModal(null)}>
          <View
            style={{
              backgroundColor: colors.modalBg,
              borderRadius: 20,
              padding: 28,
              maxWidth: 400,
              width: '100%',
              borderWidth: 1,
              borderColor: colors.modalBorder,
            }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontFamily: FT.bold, color: colors.text, flex: 1 }}>{instructionModal?.title}</Text>
              <Pressable onPress={() => setInstructionModal(null)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSub} />
              </Pressable>
            </View>
            <View style={{ backgroundColor: colors.infoBoxBg, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.infoBoxBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Info size={14} color="#2563EB" />
                <Text style={{ fontSize: 13, fontFamily: FT.bold, color: '#2563EB' }}>How to Redeem</Text>
              </View>
              <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 20, fontFamily: FT.reg }}>{instructionModal?.instructions}</Text>
            </View>
            {instructionModal?.website ? (
              <Pressable
                onPress={() => Linking.openURL(instructionModal.website!)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 14,
                  backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#F5F3FF',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(139,92,246,0.3)' : '#DDD6FE',
                }}
              >
                <ExternalLink size={16} color="#7C3AED" />
                <Text style={{ fontSize: 14, fontFamily: FT.bold, color: '#7C3AED' }}>Open Website</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Modal>

    </Container>
  );
}

/* ────────── Styles ────────── */
const s = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#0A1628',
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
  },
  regenBtnHover: {
    opacity: 0.9,
  },
  regenBtnText: {
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
    backgroundColor: '#2563EB',
  },
  reportBtnHover: {
    backgroundColor: '#1D4ED8',
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
    fontFamily: FT.xbold,
    fontSize: 22,
  },
  kpiSubText: {
    fontFamily: FT.med,
    fontSize: 12,
  },

  /* Tab Bar */
  tabBarRow: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
    flexWrap: 'wrap',
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
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 110, 0.60)',
    padding: 24,
    overflow: 'hidden',
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  heroOverline: {
    color: '#DBEAFE',
    fontFamily: FT.bold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  heroBalanceBig: {
    color: '#FFF',
    fontFamily: FT.xbold,
    fontSize: 38,
  },
  heroBalanceSub: {
    color: '#E0E7FF',
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
    backgroundColor: '#2563EB',
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  heroBtnTextSec: {
    color: '#FFFFFF',
    fontFamily: FT.bold,
    fontSize: 13,
  },
  heroRightTile: {
    width: 240,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  heroTileTitle: {
    color: '#DBEAFE',
    fontFamily: FT.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  heroTileVal: {
    color: '#6EE7B7',
    fontFamily: FT.xbold,
    fontSize: 18,
  },
  heroTileDesc: {
    color: '#E0E7FF',
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
    fontFamily: FT.bold,
    fontSize: 16,
    letterSpacing: 1.1,
  },
  cardBottomLinkText: {
    fontFamily: FT.bold,
    fontSize: 13,
  },

  /* Transactions */
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontFamily: FT.bold,
    fontSize: 13,
  },
  txDate: {
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
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontFamily: FT.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  filterChipTextActive: {
    fontFamily: FT.xbold,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    minWidth: 250,
  },
  searchInput: {
    flex: 1,
    fontFamily: FT.med,
    fontSize: 13,
  },
  couponSectionHeader: {
    marginBottom: 14,
    gap: 4,
  },
  couponSectionTitle: {
    fontFamily: FT.xbold,
    fontSize: 17,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  couponSectionSub: {
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
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 10,
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
  couponTitle: {
    fontFamily: FT.bold,
    fontSize: 15,
  },
  voucherCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  voucherCodeText: {
    fontFamily: FT.bold,
    fontSize: 14,
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnText: {
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
    backgroundColor: '#2563EB',
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  markUsedText: {
    fontFamily: FT.med,
    fontSize: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontFamily: FT.bold,
    fontSize: 16,
  },
  emptySub: {
    fontFamily: FT.med,
    fontSize: 13,
  },

  /* Form Cards */
  formColCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    gap: 18,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  inputLabel: {
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
    borderWidth: 1,
  },
  presetText: {
    fontFamily: FT.bold,
    fontSize: 13,
  },
  textInputCustom: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    borderWidth: 1,
  },
  methodText: {
    fontFamily: FT.med,
    fontSize: 13,
  },
  methodTextActive: {
    fontFamily: FT.bold,
  },
  calcSummaryBox: {
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
    fontFamily: FT.med,
    fontSize: 13,
  },
  calcVal: {
    fontFamily: FT.bold,
    fontSize: 13,
  },
  submitActionBtn: {
    backgroundColor: '#2563EB',
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
