/**
 * Mentor Portal — Earnings view: High-fidelity redesign with detailed statistics,
 * interactive tab sheets, custom chart highlighting, and simulations.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import {
  Sparkles,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Users,
  CreditCard,
  Wallet,
  Download,
  Clock,
  Check,
  FileText,
  TrendingUp,
  ArrowRight,
  Lock
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { useToast } from '@/src/views/components';

// ── Mock data matching screenshots precisely
const MOCK_MONTHLY_CHART = [
  { month: 'Nov', amount: 18000, label: '₹18k' },
  { month: 'Dec', amount: 22000, label: '₹22k' },
  { month: 'Jan', amount: 25000, label: '₹25k' },
  { month: 'Feb', amount: 28000, label: '₹28k' },
  { month: 'Mar', amount: 31000, label: '₹31k' },
  { month: 'Apr', amount: 29000, label: '₹29k', isCurrent: true },
];

const MOCK_TRANSACTIONS = [
  { id: 'TX-9901', name: 'Arjun Sharma', topic: 'System Design Mock', duration: 30, date: 'Today', amount: 999, status: 'settled', avatar: 'AS', color: '#14B8A6' },
  { id: 'TX-9902', name: 'Meera Pillai', topic: 'APM Case Study Prep', duration: 30, date: 'Today', amount: 999, status: 'settled', avatar: 'MP', color: '#F59E0B' },
  { id: 'TX-9903', name: 'Kabir Das', topic: 'Investor Pitch Review', duration: 30, date: 'Apr 29', amount: 999, status: 'pending', avatar: 'KD', color: '#F97316' },
  { id: 'TX-9904', name: 'Priya Nair', topic: 'Research Career Paths', duration: 30, date: 'Apr 28', amount: 0, status: 'free', avatar: 'PN', color: '#EC4899' },
  { id: 'TX-9905', name: 'Tanvi Rao', topic: 'Consulting to PM Switch', duration: 30, date: 'Apr 25', amount: 999, status: 'settled', avatar: 'TR', color: '#8B5CF6' },
  { id: 'TX-9906', name: 'Dev Anand', topic: 'System Design Basics', duration: 30, date: 'Apr 22', amount: 0, status: 'free', avatar: 'DA', color: '#22C55E' },
  { id: 'TX-9907', name: 'Arjun Sharma', topic: 'LLD Patterns & OOP', duration: 30, date: 'Apr 22', amount: 999, status: 'settled', avatar: 'AS', color: '#14B8A6' },
  { id: 'TX-9908', name: 'Riya Shah', topic: 'System Design Prep', duration: 30, date: 'Apr 22', amount: 999, status: 'settled', avatar: 'RS', color: '#FCD34D' },
];

const MOCK_BY_STUDENT = [
  { id: 's1', name: 'Kabir Das', sessions: 6, amount: 5994, rate: '₹999/session', avatar: 'KD', color: '#F97316', progress: 1.0 },
  { id: 's2', name: 'Rohan Bhat', sessions: 5, amount: 4995, rate: '₹999/session', avatar: 'RB', color: '#14B8A6', progress: 0.83 },
  { id: 's3', name: 'Arjun Sharma', sessions: 3, amount: 2997, rate: '₹999/session', avatar: 'AS', color: '#5EEAD4', progress: 0.5 },
  { id: 's4', name: 'Meera Pillai', sessions: 2, amount: 1998, rate: '₹999/session', avatar: 'MP', color: '#FCD34D', progress: 0.33 },
  { id: 's5', name: 'Priya Nair', sessions: 2, amount: 0, rate: 'Free sessions', avatar: 'PN', color: '#EC4899', progress: 0.33, isFree: true },
];

const INITIAL_WITHDRAWAL_HISTORY = [
  { id: 'wh1', amount: 24000, date: 'Apr 1, 2026', utr: 'UTR8823411', status: 'Completed' },
  { id: 'wh2', amount: 28000, date: 'Mar 1, 2026', utr: 'UTR7712300', status: 'Completed' },
  { id: 'wh3', amount: 22000, date: 'Feb 1, 2026', utr: 'UTR6601988', status: 'Completed' },
];

export function EarningsView({ demoMode = false, setDemoMode }: { demoMode?: boolean; setDemoMode?: (val: boolean) => void }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const stack = width < 980;

  // Active sub-tab sheets state
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'student' | 'withdrawals' | 'wallet'>('overview');

  // Accordion open/close flags
  const [showInsights, setShowInsights] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [showTaxSummary, setShowTaxSummary] = useState(false);

  // Form 16 download state
  const [isDownloadingForm16, setIsDownloadingForm16] = useState(false);

  // Stateful cashout simulator
  const [availableWithdraw, setAvailableWithdraw] = useState(500);
  const [withdrawMethod, setWithdrawMethod] = useState<'upi' | 'bank' | 'paytm' | null>(null);
  const [upiId, setUpiId] = useState('sureshrao@okicici');
  const [bankAccount, setBankAccount] = useState('50200012345678');
  const [bankIfsc, setBankIfsc] = useState('HDFC0000124');
  const [paytmNumber, setPaytmNumber] = useState('9876543210');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState(INITIAL_WITHDRAWAL_HISTORY);

  // Redirection & configuration triggers
  const handleWithdrawPendingClick = () => {
    setActiveTab('withdrawals');
    if (!withdrawMethod) {
      setWithdrawMethod('upi');
    }
  };

  const handleDownloadForm16 = () => {
    if (isDownloadingForm16) return;
    setIsDownloadingForm16(true);
    setTimeout(() => {
      setIsDownloadingForm16(false);
      toast.success('Form 16 Downloaded', 'Form 16 statement for FY 2025-26 has been successfully downloaded.');
    }, 1500);
  };

  const handleConfirmWithdraw = () => {
    if (availableWithdraw <= 0) return;
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      const newRecord = {
        id: `wh-${Date.now()}`,
        amount: availableWithdraw,
        date: 'Today',
        utr: `UTR${Math.floor(1000000 + Math.random() * 9000000)}`,
        status: 'Completed'
      };
      setWithdrawalHistory([newRecord, ...withdrawalHistory]);
      setAvailableWithdraw(0);
      setWithdrawMethod(null);
      toast.success('Cashout Successful', `₹${availableWithdraw.toLocaleString('en-IN')} has been transferred to your selected account.`);
    }, 1500);
  };

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'student', label: 'By Student', icon: Users },
    { id: 'withdrawals', label: 'Withdrawals', icon: CreditCard },
    { id: 'wallet', label: 'SA Wallet', icon: Wallet },
  ];

  return (
    <View className="flex flex-col gap-4">
      {demoMode && (
        <View className="bg-amber-500/[0.08] border border-amber-500/30 rounded-xl py-2.5 px-4 items-center mb-4">
          <Text className="text-amber-400 font-body-bold text-xs text-center">
            Demo Mode · Sample data is displayed for demonstration purposes.{' '}
            <Text
              onPress={() => setDemoMode?.(false)}
              className="text-white font-body-bold underline"
            >
              Switch to Live Mode
            </Text>
          </Text>
        </View>
      )}
      {/* Header and Subtitle */}
      <View className="flex-row items-center justify-between mb-1">
        <View>
          <Text className="text-white font-display-bold text-[22px] tracking-tight">Earnings</Text>
          <Text className="text-dim font-body-medium text-xs mt-0.5">Lifetime · withdrawals · by student</Text>
        </View>
      </View>

      {/* Modern tab pill selectors */}
      <View className="mb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 10 }}>
          {TABS.map((t) => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <Pressable
                key={t.id}
                onPress={() => setActiveTab(t.id as any)}
                className={`flex-row items-center gap-2 px-4 py-2.5 rounded-[20px] border ${active ? 'bg-[#0D9488] border-[#0F766E]' : 'border-glass-border'}`}
                style={!active ? { backgroundColor: MC.card } : undefined}
              >
                <Icon size={13} color={active ? '#fff' : MC.muted} />
                <Text className={active ? 'text-white font-body-bold text-[13px]' : 'text-muted font-body-semibold text-[13px]'}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── TAB PAGES ─── */}
      <View className="gap-4">
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View className="gap-4">
            {/* AI Insights accord */}
            <View className="bg-amber-500/[0.03] border border-amber-500/25 rounded-2xl p-4">
              <View className="flex-row items-center justify-between flex-wrap gap-2.5">
                <View className="flex-row items-center gap-1.5">
                  <Sparkles size={14} color="#F59E0B" />
                  <Text className="text-amber-400 font-display-bold text-[11px] tracking-wider uppercase">AI EARNINGS INSIGHTS</Text>
                </View>
                <Pressable
                  onPress={() => setShowInsights(!showInsights)}
                  className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border ${showInsights ? 'bg-amber-500 border-amber-600' : 'border-amber-500/35 bg-amber-500/[0.06]'}`}
                >
                  <Sparkles size={12} color={showInsights ? '#fff' : '#F59E0B'} />
                  <Text className={showInsights ? 'text-white font-body-bold text-[11px]' : 'text-amber-300 font-body-bold text-[11px]'}>
                    {showInsights ? 'Hide Insights' : 'AI Insights'}
                  </Text>
                </Pressable>
              </View>

              {showInsights && (
                <View className="mt-3.5 pt-3.5 border-t border-amber-500/15 gap-2">
                  {demoMode ? (
                    <>
                      <Text className="text-amber-300 font-body-medium text-[12.5px]">
                        🚀 <Text className="font-body-bold text-white">Boost your weekly conversions by 18%:</Text>
                      </Text>
                      <Text className="text-muted font-body-medium text-xs leading-[19px]">
                        • Add 4 evening slots on Tuesday & Thursday (6:00 PM - 8:00 PM) — your highest-converting student booking windows.{"\n"}
                        • Run a Saturday AMA session on "Advanced System Design interviews" to fill up empty weekend slots.{"\n"}
                        • 20% of your free/pro-bono mock sessions currently convert into recurring, high-paying weekly sessions.
                      </Text>
                    </>
                  ) : (
                    <Text className="text-muted font-body-medium text-[12.5px] leading-[18px]">
                      <Lock size={14} color="#F59E0B" /> AI Earnings Insights are locked. Complete at least 3 paid mentoring sessions to unlock conversion and slot recommendations.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Total Earned Card */}
            <View className="bg-card border border-glass-border rounded-2xl p-5">
              <Text className="text-dim font-display-bold text-[11px] tracking-wider uppercase mb-1">TOTAL EARNED</Text>
              <Text className="text-white font-display-bold text-[38px] tracking-tight mb-1">₹500</Text>
              <Text className="text-muted font-body-semibold text-[13.5px] mb-5">
                Default mentor wallet balance · Welcome bonus
              </Text>

              <View className="flex-row border-t border-b border-glass-border py-4 mb-4">
                <View className="flex-1 items-center gap-1">
                  <Text className="text-dim font-display-bold text-[10px] tracking-wider">THIS MONTH</Text>
                  <Text className="text-white font-body-bold text-[16.5px]">{demoMode ? '₹500' : '₹0'}</Text>
                  <Text className="text-muted font-body-medium text-[11.5px]">{demoMode ? '1 session' : '0 sessions'}</Text>
                </View>

                <View className="flex-1 items-center gap-1 border-l border-r border-glass-border">
                  <Text className="text-dim font-display-bold text-[10px] tracking-wider">THIS WEEK</Text>
                  <Text className="text-white font-body-bold text-[16.5px]">₹500</Text>
                  <Text className="text-muted font-body-medium text-[11.5px]">1 session</Text>
                </View>

                <View className="flex-1 items-center gap-1">
                  <Text className="text-dim font-display-bold text-[10px] tracking-wider">TODAY</Text>
                  <Text className="text-white font-body-bold text-[16.5px]">₹{availableWithdraw.toLocaleString('en-IN')}</Text>
                  <Text className="text-muted font-body-medium text-[11.5px]">Available</Text>
                </View>
              </View>

              {demoMode && availableWithdraw > 0 ? (
                <Pressable onPress={handleWithdrawPendingClick} className="bg-[#0D9488] rounded-xl py-3 items-center justify-center cursor-pointer">
                  <Text className="text-white font-body-bold text-[13px]">Withdraw ₹{availableWithdraw.toLocaleString('en-IN')} Pending →</Text>
                </Pressable>
              ) : (
                <View
                  className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl border"
                  style={!demoMode
                    ? { borderColor: MC.border, backgroundColor: 'rgba(255,255,255,0.03)' }
                    : { backgroundColor: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.15)' }
                  }
                >
                  <Check size={14} color={demoMode ? MC.green : MC.muted} />
                  <Text
                    className="font-body-bold text-[12.5px]"
                    style={{ color: !demoMode ? MC.muted : '#86EFAC' }}
                  >
                    {demoMode ? 'All available earnings have been withdrawn' : 'No balance available'}
                  </Text>
                </View>
              )}
            </View>

            {/* AI Revenue Forecast Accordion */}
            <View className="bg-green-500/[0.03] border border-green-500/20 rounded-2xl p-4">
              <Pressable
                onPress={() => setShowForecast(!showForecast)}
                className="flex-row items-center justify-between cursor-pointer"
              >
                <View className="flex-row items-center gap-2">
                  <Sparkles size={14} color={demoMode ? '#22C55E' : MC.muted} />
                  <Text
                    className="font-body-bold text-[13px]"
                    style={{ color: demoMode ? '#86EFAC' : MC.muted }}
                  >AI Revenue Forecast — What will I earn next month?</Text>
                </View>
                {showForecast ? <ChevronUp size={16} color={MC.muted} /> : <ChevronDown size={16} color={MC.muted} />}
              </Pressable>

              {showForecast && (
                <View className="mt-3 pt-3 border-t border-green-500/15">
                  {demoMode ? (
                    <>
                      <Text className="text-muted font-body-medium text-xs leading-[18px]">
                        Based on your current 12% monthly growth rate, average conversion, and active recurring student commitments, you are projected to make <Text className="text-teal-300 font-body-bold">₹33,000</Text> next month (June 2026).
                      </Text>
                      <Text className="text-muted font-body-medium text-xs leading-[18px] mt-1.5">
                        🚀 <Text className="font-body-bold text-white">Pro Tip:</Text> Offering a "3-session package discount" can secure up to ₹42,000 in advanced bookings.
                      </Text>
                    </>
                  ) : (
                    <Text className="text-muted font-body-medium text-xs leading-[18px]">
                      <Lock size={14} color="#F59E0B" /> AI Revenue Forecast will be available after completing 5 paid mentoring sessions.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Monthly Earnings Chart */}
            <View className="bg-card border border-glass-border rounded-2xl p-5">
              <View className="flex-row items-center justify-between mb-5">
                <View>
                  <Text className="text-white font-body-bold text-[14.5px]">Monthly Earnings</Text>
                  <Text className="text-dim font-body-medium text-[11px]">Last 6 months</Text>
                </View>
                {demoMode ? (
                  <View className="flex-row items-center gap-1 bg-green-500/[0.15] px-2 py-1 rounded-lg">
                    <TrendingUp size={12} color="#86EFAC" />
                    <Text className="text-green-300 font-body-bold text-[11px]">12% vs last month</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-1 bg-white/[0.05] px-2 py-1 rounded-lg">
                    <Text className="text-muted font-body-bold text-[11px]">No trend data</Text>
                  </View>
                )}
              </View>

              {demoMode ? (
                <View className="flex-row items-end justify-between h-[125px] px-1 mt-2.5">
                  {MOCK_MONTHLY_CHART.map((c) => {
                    const isApr = c.month === 'Apr';
                    const maxVal = 31000;
                    const barHeight = Math.round((c.amount / maxVal) * 105);

                    return (
                      <View key={c.month} className="flex-1 items-center gap-1.5">
                        <Text className={`font-body-bold text-[10px] ${isApr ? 'text-[#F97316] font-display-bold' : 'text-dim'}`}>
                          {c.label}
                        </Text>
                        <View
                          className="w-[65%] rounded-t-md"
                          style={{
                            height: barHeight,
                            backgroundColor: isApr ? '#F97316' : MC.teal,
                            opacity: isApr ? 1 : 0.5
                          }}
                        />
                        <Text className={`font-body-medium text-[10px] ${isApr ? 'text-white font-body-bold' : 'text-dim'}`}>
                          {c.month}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="flex-row items-center justify-center h-[120px] border border-dashed border-glass-border rounded-[10px]">
                  <Text className="text-dim font-body-medium text-xs text-center px-5">
                    Timeline for monthly earnings will appear here after you conduct paid sessions.
                  </Text>
                </View>
              )}
            </View>

            {/* Highlights Grid */}
            <View className="flex-row gap-3 flex-wrap">
              <View className="flex-1 min-w-[130px] bg-card border border-glass-border rounded-xl py-3 px-3.5 flex-row items-center gap-2">
                <View className="w-[3px] h-[70%] rounded-sm" style={{ backgroundColor: demoMode ? MC.green : MC.border }} />
                <View className="gap-0.5">
                  <Text className="text-white font-body-bold text-[13.5px]">{demoMode ? '₹1000' : '₹0'}</Text>
                  <Text className="text-muted font-body-medium text-[10.5px]">Avg/Session</Text>
                </View>
              </View>

              <View className="flex-1 min-w-[130px] bg-card border border-glass-border rounded-xl py-3 px-3.5 flex-row items-center gap-2">
                <View className="w-[3px] h-[70%] rounded-sm" style={{ backgroundColor: demoMode ? MC.amber : MC.border }} />
                <View className="gap-0.5">
                  <Text className="text-white font-body-bold text-[13.5px]">{demoMode ? 'Mar - ₹31k' : '—'}</Text>
                  <Text className="text-muted font-body-medium text-[10.5px]">Best Month</Text>
                </View>
              </View>

              <View className="flex-1 min-w-[130px] bg-card border border-glass-border rounded-xl py-3 px-3.5 flex-row items-center gap-2">
                <View className="w-[3px] h-[70%] rounded-sm" style={{ backgroundColor: demoMode ? MC.teal : MC.border }} />
                <View className="gap-0.5">
                  <Text className="text-white font-body-bold text-[13.5px]">{demoMode ? '6' : '0'}</Text>
                  <Text className="text-muted font-body-medium text-[10.5px]">Paid Sessions</Text>
                </View>
              </View>

              <View className="flex-1 min-w-[130px] bg-card border border-glass-border rounded-xl py-3 px-3.5 flex-row items-center gap-2">
                <View className="w-[3px] h-[70%] rounded-sm" style={{ backgroundColor: demoMode ? MC.purple : MC.border }} />
                <View className="gap-0.5">
                  <Text className="text-white font-body-bold text-[13.5px]">{demoMode ? '2' : '0'}</Text>
                  <Text className="text-muted font-body-medium text-[10.5px]">Free Sessions</Text>
                </View>
              </View>
            </View>

            {/* TDS details & Form 16 Card */}
            <View className="bg-amber-500/[0.03] border border-amber-500/20 rounded-2xl p-4 flex-row items-center justify-between flex-wrap gap-3">
              <View className="flex-row gap-2.5 flex-1 min-w-[260px]">
                <FileText size={16} color="#FCD34D" style={{ marginTop: 2 }} />
                <View className="flex-1">
                  {demoMode ? (
                    <>
                      <Text className="text-muted font-body-medium text-xs leading-[18px]">
                        <Text className="font-body-bold text-amber-300">TDS (10%):</Text> Gross ₹1,42,000 - Deducted ₹14,200 - <Text className="font-body-bold text-white">Net ₹1,27,800</Text>
                      </Text>
                      <Text className="text-dim font-body-medium text-[10.5px] mt-0.5">Taxes withheld under Section 194J. Net proceeds settled directly.</Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-muted font-body-medium text-xs leading-[18px]">
                        <Text className="font-body-bold text-amber-300">TDS (10%):</Text> Gross ₹0 - Deducted ₹0 - <Text className="font-body-bold text-white">Net ₹0</Text>
                      </Text>
                      <Text className="text-dim font-body-medium text-[10.5px] mt-0.5">TDS details and Form 16 will be generated after your first paid session.</Text>
                    </>
                  )}
                </View>
              </View>

              <Pressable
                onPress={handleDownloadForm16}
                disabled={isDownloadingForm16 || !demoMode}
                className="flex-row items-center gap-1.5 border border-amber-300 rounded-[10px] px-3 py-[7px] bg-transparent cursor-pointer"
                style={(!demoMode ? { opacity: 0.5, cursor: 'default' } : undefined) as any}
              >
                {isDownloadingForm16 ? (
                  <ActivityIndicator size="small" color="#FCD34D" />
                ) : (
                  <>
                    <Download size={14} color="#FCD34D" />
                    <Text className="text-amber-300 font-body-bold text-[11px]">Download Form 16</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* 2. TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          demoMode ? (
            <View className="bg-card border border-glass-border rounded-2xl p-5">
              <Text className="text-white font-display-bold text-[15px] mb-4">Recent Transactions</Text>
              <View className="gap-3">
                {MOCK_TRANSACTIONS.map((t) => {
                  const isFree = t.status === 'free';
                  const isPending = t.status === 'pending';
                  const amountText = isFree ? 'Free' : `₹${t.amount}`;

                  let badgeColor: any = 'green';
                  let badgeLabel = 'Settled';
                  if (isFree) {
                    badgeColor = 'gray';
                    badgeLabel = 'Free';
                  } else if (isPending) {
                    badgeColor = 'amber';
                    badgeLabel = 'Pending';
                  }

                  return (
                    <View key={t.id} className="flex-row items-center gap-3 py-3 border-b border-glass-border">
                      {/* Circle avatar initials */}
                      <View className="w-[38px] h-[38px] rounded-[19px] border items-center justify-center" style={{ backgroundColor: t.color + '25', borderColor: t.color + '60' }}>
                        <Text className="font-body-bold text-[12.5px]" style={{ color: t.color }}>{t.avatar}</Text>
                      </View>

                      {/* Transaction topic info */}
                      <View className="flex-1 min-w-0 gap-0.5">
                        <Text className="text-white font-body-bold text-[13.5px]">{t.name}</Text>
                        <Text className="text-muted font-body-medium text-xs">{t.topic}</Text>
                        <Text className="text-dim font-body-medium text-[10.5px]">{t.duration} min · {t.date}</Text>
                      </View>

                      {/* Amount & Status Badges */}
                      <View className="items-end gap-1.5">
                        <Text
                          className="font-body-bold text-[13.5px]"
                          style={{ color: isFree ? MC.dim : isPending ? '#FCD34D' : '#86EFAC' }}
                        >
                          {amountText}
                        </Text>
                        <Badge label={badgeLabel} color={badgeColor} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View className="bg-card border border-glass-border rounded-2xl p-5 items-center py-10">
              <FileText size={48} color={MC.dim} style={{ marginBottom: 12 }} />
              <Text className="text-white font-display-bold text-[15px] mb-1">No transactions yet</Text>
              <Text className="text-muted font-body-medium text-[13px] text-center px-5">
                Transactions appear here once students book and complete paid sessions with you.
              </Text>
            </View>
          )
        )}

        {/* 3. BY STUDENT TAB */}
        {activeTab === 'student' && (
          demoMode ? (
            <View className="bg-card border border-glass-border rounded-2xl p-5">
              <Text className="text-white font-display-bold text-[15px] mb-4">Earnings by Student</Text>
              <View className="gap-3.5">
                {MOCK_BY_STUDENT.map((item) => {
                  const isFree = item.isFree;
                  const progressWidth = `${item.progress * 100}%`;

                  return (
                    <View key={item.id} className="bg-white/[0.02] border border-glass-border rounded-[14px] p-3.5 gap-2.5">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2.5">
                          <View className="w-[34px] h-[34px] rounded-[17px] border items-center justify-center" style={{ backgroundColor: item.color + '25', borderColor: item.color + '60' }}>
                            <Text className="font-body-bold text-[11px]" style={{ color: item.color }}>{item.avatar}</Text>
                          </View>
                          <View>
                            <Text className="text-white font-body-bold text-[13.5px]">{item.name}</Text>
                            <Text className="text-dim font-body-medium text-[11px]">{item.sessions} sessions</Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text
                            className="font-body-bold text-[13.5px]"
                            style={{ color: isFree ? MC.dim : '#fff' }}
                          >
                            {isFree ? 'Pro-bono' : `₹${item.amount.toLocaleString('en-IN')}`}
                          </Text>
                          <Text className="text-dim font-body-medium text-[10.5px]">{item.rate}</Text>
                        </View>
                      </View>

                      {/* Dynamic horizontal percentage progress bar */}
                      <View className="h-[6px] bg-white/[0.06] rounded-[3px] overflow-hidden">
                        <View
                          className="h-full rounded-[3px]"
                          style={{
                            width: progressWidth as any,
                            backgroundColor: item.color
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View className="bg-card border border-glass-border rounded-2xl p-5 items-center py-10">
              <Users size={48} color={MC.dim} style={{ marginBottom: 12 }} />
              <Text className="text-white font-display-bold text-[15px] mb-1">No student earnings yet</Text>
              <Text className="text-muted font-body-medium text-[13px] text-center px-5">
                Once you have active student connections, their session breakdown and earnings will appear here.
              </Text>
            </View>
          )
        )}

        {/* 4. WITHDRAWALS TAB */}
        {activeTab === 'withdrawals' && (
          <View className="gap-4">
            {/* Cashout balance status */}
            <LinearGradient
              colors={['rgba(20,184,166,0.15)', 'rgba(15,118,110,0.05)']}
              className="rounded-2xl p-5 border border-teal-500/25"
            >
              <Text className="text-muted font-display-bold text-[11px] tracking-wider uppercase mb-1">AVAILABLE TO WITHDRAW</Text>
              <Text className="text-white font-display-bold text-[34px] tracking-tight mb-1">₹{demoMode ? availableWithdraw.toLocaleString('en-IN') : '0'}</Text>
              <Text className="text-muted font-body-semibold text-[12.5px] mb-4">
                {demoMode && availableWithdraw > 0
                  ? 'From 2 settled sessions · Credited in 2-3 business days'
                  : 'No balance available for withdrawal.'}
              </Text>

              {demoMode && availableWithdraw > 0 && (
                <View className="flex-row flex-wrap gap-2.5">
                  <Pressable
                    onPress={() => setWithdrawMethod('upi')}
                    className={`flex-row items-center gap-1.5 px-3.5 py-[9px] rounded-[10px] bg-teal-500/[0.08] border ${withdrawMethod === 'upi' ? 'bg-[#0D9488] border-[#0F766E]' : 'border-teal-500/25'}`}
                  >
                    <ArrowRight size={12} color={withdrawMethod === 'upi' ? '#fff' : MC.tealP} style={{ transform: [{ rotate: '-45deg' }] }} />
                    <Text className={`font-body-bold text-xs ${withdrawMethod === 'upi' ? 'text-white' : ''}`} style={{ color: withdrawMethod === 'upi' ? '#fff' : MC.tealP }}>UPI / PhonePe</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setWithdrawMethod('bank')}
                    className={`flex-row items-center gap-1.5 px-3.5 py-[9px] rounded-[10px] bg-teal-500/[0.08] border ${withdrawMethod === 'bank' ? 'bg-[#0D9488] border-[#0F766E]' : 'border-teal-500/25'}`}
                  >
                    <ArrowRight size={12} color={withdrawMethod === 'bank' ? '#fff' : MC.tealP} style={{ transform: [{ rotate: '-45deg' }] }} />
                    <Text className={`font-body-bold text-xs ${withdrawMethod === 'bank' ? 'text-white' : ''}`} style={{ color: withdrawMethod === 'bank' ? '#fff' : MC.tealP }}>Bank Transfer</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setWithdrawMethod('paytm')}
                    className={`flex-row items-center gap-1.5 px-3.5 py-[9px] rounded-[10px] bg-teal-500/[0.08] border ${withdrawMethod === 'paytm' ? 'bg-[#0D9488] border-[#0F766E]' : 'border-teal-500/25'}`}
                  >
                    <ArrowRight size={12} color={withdrawMethod === 'paytm' ? '#fff' : MC.tealP} style={{ transform: [{ rotate: '-45deg' }] }} />
                    <Text className={`font-body-bold text-xs ${withdrawMethod === 'paytm' ? 'text-white' : ''}`} style={{ color: withdrawMethod === 'paytm' ? '#fff' : MC.tealP }}>Paytm</Text>
                  </Pressable>
                </View>
              )}

              {/* Confirm details subform drawer */}
              {demoMode && availableWithdraw > 0 && withdrawMethod && (
                <View className="mt-4 pt-4 border-t border-white/[0.08] gap-3">
                  {withdrawMethod === 'upi' && (
                    <View className="gap-1.5">
                      <Text className="text-muted font-body-semibold text-[11.5px]">Enter UPI ID / VPA</Text>
                      <TextInput
                        value={upiId}
                        onChangeText={setUpiId}
                        placeholder="e.g. sureshrao@okicici"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        className="bg-black/[0.6] border border-glass-border rounded-[10px] px-3 py-2 text-white font-body-medium text-[12.5px]"
                      />
                    </View>
                  )}

                  {withdrawMethod === 'bank' && (
                    <View className="gap-1.5">
                      <Text className="text-muted font-body-semibold text-[11.5px]">Bank Account Number</Text>
                      <TextInput
                        value={bankAccount}
                        onChangeText={setBankAccount}
                        placeholder="Account Number"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        className="bg-black/[0.6] border border-glass-border rounded-[10px] px-3 py-2 text-white font-body-medium text-[12.5px] mb-2.5"
                      />
                      <Text className="text-muted font-body-semibold text-[11.5px]">IFSC Code</Text>
                      <TextInput
                        value={bankIfsc}
                        onChangeText={setBankIfsc}
                        placeholder="IFSC Code"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        className="bg-black/[0.6] border border-glass-border rounded-[10px] px-3 py-2 text-white font-body-medium text-[12.5px]"
                      />
                    </View>
                  )}

                  {withdrawMethod === 'paytm' && (
                    <View className="gap-1.5">
                      <Text className="text-muted font-body-semibold text-[11.5px]">Paytm Registered Mobile Number</Text>
                      <TextInput
                        value={paytmNumber}
                        onChangeText={setPaytmNumber}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        className="bg-black/[0.6] border border-glass-border rounded-[10px] px-3 py-2 text-white font-body-medium text-[12.5px]"
                        keyboardType="phone-pad"
                      />
                    </View>
                  )}

                  <Pressable
                    onPress={handleConfirmWithdraw}
                    disabled={isWithdrawing}
                    className="bg-[#0D9488] rounded-[10px] py-2.5 items-center justify-center cursor-pointer mt-1"
                  >
                    {isWithdrawing ? (
                      <ActivityIndicator size="small" color={MC.bg} />
                    ) : (
                      <Text className="text-bg font-display-bold text-[12.5px]">Confirm Withdrawal of ₹{availableWithdraw.toLocaleString('en-IN')}</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </LinearGradient>

            {/* AI Tax Summary */}
            <View className="bg-green-500/[0.03] border border-green-500/20 rounded-2xl p-4">
              <Pressable
                onPress={() => setShowTaxSummary(!showTaxSummary)}
                className="flex-row items-center justify-between cursor-pointer"
              >
                <View className="flex-row items-center gap-2">
                  <Sparkles size={14} color={demoMode ? '#A78BFA' : MC.muted} />
                  <Text
                    className="font-body-bold text-[13px]"
                    style={{ color: demoMode ? '#86EFAC' : MC.muted }}
                  >AI Tax Summary — What do I owe?</Text>
                </View>
                {showTaxSummary ? <ChevronUp size={16} color={MC.muted} /> : <ChevronDown size={16} color={MC.muted} />}
              </Pressable>

              {showTaxSummary && (
                <View className="mt-3 pt-3 border-t border-green-500/15">
                  {demoMode ? (
                    <>
                      <Text className="text-muted font-body-medium text-xs leading-[18px]">
                        Professional fee settlements are subject to a flat <Text className="text-amber-300 font-body-bold">10% TDS</Text> under Section 194J of the Income Tax Act.
                      </Text>
                      <Text className="text-muted font-body-medium text-xs leading-[18px] mt-1.5">
                        • Total deducted this fiscal year: <Text className="text-white font-body-bold">₹14,200</Text>{"\n"}
                        • Consolidated Form 16 can be downloaded from the Overview tab. This TDS will automatically reflect in your Form 26AS for tax offsetting.
                      </Text>
                    </>
                  ) : (
                    <Text className="text-muted font-body-medium text-xs leading-[18px]">
                      <Lock size={14} color="#F59E0B" /> AI Tax Summary will be available after your first paid session.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Withdrawal UTR history */}
            <View className="bg-card border border-glass-border rounded-2xl p-5">
              <Text className="text-white font-display-bold text-[15px] mb-4">WITHDRAWAL HISTORY</Text>
              {demoMode ? (
                <View className="gap-2.5">
                  {withdrawalHistory.map((w) => (
                    <View key={w.id} className="flex-row items-center gap-3 py-3 border-b border-glass-border">
                      <View className="w-9 h-9 rounded-[10px] bg-teal-500/10 items-center justify-center">
                        <Clock size={15} color={MC.teal} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-body-bold text-[13.5px]">₹{w.amount.toLocaleString('en-IN')}</Text>
                        <Text className="text-dim font-body-medium text-[11px]">{w.date} · {w.utr}</Text>
                      </View>
                      <Badge label={w.status} color="green" />
                    </View>
                  ))}
                </View>
              ) : (
                <View className="py-2.5 items-center">
                  <Text className="text-dim font-body-medium text-[13px]">No withdrawal history found.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 5. SA WALLET TAB */}
        {activeTab === 'wallet' && (
          <View className="bg-card border border-glass-border rounded-2xl p-5">
            <View className="flex-row items-center gap-2.5 mb-4">
              <View className="w-9 h-9 rounded-[10px] bg-teal-500/[0.15] items-center justify-center">
                <Wallet size={20} color={MC.teal} />
              </View>
              <View>
                <Text className="text-white font-display-bold text-[15px]">SA Smart Wallet</Text>
                <Text className="text-dim font-body-medium text-[11px]">Instant student settlements & zero gateway fees</Text>
              </View>
            </View>

            <LinearGradient
              colors={['rgba(20,184,166,0.15)', 'rgba(20,12,40,0.85)']}
              className="rounded-2xl p-5 border border-teal-500/30"
            >
              <Text className="text-muted font-display-bold text-[11px] tracking-wider uppercase mb-1">SA WALLET BALANCE</Text>
              <Text className="text-white font-display-bold text-[34px] tracking-tight mb-1">{demoMode ? '₹45,500' : '₹0'}</Text>
              <Text className="text-muted font-body-semibold text-[12.5px] mb-4">Linked with your verified institutional student account</Text>

              <View className="flex-row flex-wrap gap-2.5 mt-4">
                <Pressable
                  style={!demoMode ? { opacity: 0.5, borderColor: MC.border } : undefined}
                  className="flex-row items-center gap-1.5 px-3.5 py-[9px] rounded-[10px] bg-teal-500/[0.08] border border-teal-500/25"
                  disabled={!demoMode}
                  onPress={() => toast.success('Transfer Initiated', 'Transferring funds to your bank account...')}
                >
                  <Text style={{ color: !demoMode ? MC.muted : MC.tealP }} className="font-body-bold text-xs">Transfer to Bank</Text>
                </Pressable>
                <Pressable
                  style={!demoMode ? { opacity: 0.5, borderColor: MC.border } : undefined}
                  className="flex-row items-center gap-1.5 px-3.5 py-[9px] rounded-[10px] bg-teal-500/[0.08] border border-teal-500/25"
                  disabled={!demoMode}
                  onPress={() => toast.info('Smart Wallet Linked', 'Smart wallet details are verified.')}
                >
                  <Text style={{ color: !demoMode ? MC.muted : MC.tealP }} className="font-body-bold text-xs">Wallet Settings</Text>
                </Pressable>
              </View>
            </LinearGradient>

            <View className="mt-5 gap-3">
              <View className="flex-row gap-2.5 items-start">
                <Check size={16} color={MC.green} />
                <View className="flex-1">
                  <Text className="text-white font-body-bold text-[13px]">Instant Clearing</Text>
                  <Text className="text-dim font-body-medium text-[11px]">Funds cleared within 60 seconds of session completion.</Text>
                </View>
              </View>

              <View className="flex-row gap-2.5 items-start">
                <Check size={16} color={MC.green} />
                <View className="flex-1">
                  <Text className="text-white font-body-bold text-[13px]">Zero Fee Gateway</Text>
                  <Text className="text-dim font-body-medium text-[11px]">Zero convenience fees on both student payouts and alumni receipts.</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
