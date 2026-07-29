/**
 * Mentor Portal — Earnings view: High-fidelity redesign with detailed statistics,
 * interactive tab sheets, custom chart highlighting, and simulations.
 */
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
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
  ArrowRight
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
    <View style={{ flexDirection: 'column', gap: 16 }}>
      {demoMode && (
        <View style={s.demoBadgeBanner}>
          <Text style={s.demoBadgeText}>
            Demo Mode · Sample data is displayed for demonstration purposes.{' '}
            <Text 
              onPress={() => setDemoMode?.(false)}
              style={{ textDecorationLine: 'underline', color: '#fff', fontFamily: FONTS.bold }}
            >
              Switch to Live Mode
            </Text>
          </Text>
        </View>
      )}
      {/* Header and Subtitle */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.mainTitle}>Earnings</Text>
          <Text style={s.mainSubtitle}>Lifetime · withdrawals · by student</Text>
        </View>
      </View>

      {/* Modern tab pill selectors */}
      <View style={s.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBarScroll}>
          {TABS.map((t) => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <Pressable
                key={t.id}
                onPress={() => setActiveTab(t.id as any)}
                style={[s.tabPill, active && s.tabPillActive]}
              >
                <Icon size={13} color={active ? '#fff' : MC.muted} />
                <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── TAB PAGES ─── */}
      <View style={{ gap: 16 }}>
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View style={{ gap: 16 }}>
            {/* AI Insights accord */}
            <View style={s.insightsCard}>
              <View style={s.insightsHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color="#F59E0B" />
                  <Text style={s.insightsKicker}>AI EARNINGS INSIGHTS</Text>
                </View>
                <Pressable 
                  onPress={() => setShowInsights(!showInsights)}
                  style={[s.insightsButton, showInsights && s.insightsButtonActive]}
                >
                  <Sparkles size={12} color={showInsights ? '#fff' : '#F59E0B'} />
                  <Text style={[s.insightsButtonText, showInsights && s.insightsButtonTextActive]}>
                    {showInsights ? 'Hide Insights' : 'AI Insights'}
                  </Text>
                </Pressable>
              </View>
              
              {showInsights && (
                <View style={s.insightsContent}>
                  {demoMode ? (
                    <>
                      <Text style={s.insightsDetailText}>
                        🚀 <Text style={{ fontFamily: FONTS.bold, color: '#fff' }}>Boost your weekly conversions by 18%:</Text>
                      </Text>
                      <Text style={s.insightsBullets}>
                        • Add 4 evening slots on Tuesday & Thursday (6:00 PM - 8:00 PM) — your highest-converting student booking windows.{"\n"}
                        • Run a Saturday AMA session on "Advanced System Design interviews" to fill up empty weekend slots.{"\n"}
                        • 20% of your free/pro-bono mock sessions currently convert into recurring, high-paying weekly sessions.
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 }}>
                      🔒 AI Earnings Insights are locked. Complete at least 3 paid mentoring sessions to unlock conversion and slot recommendations.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Total Earned Card */}
            <View style={s.totalEarnedCard}>
              <Text style={s.totalEarnedKicker}>TOTAL EARNED</Text>
              <Text style={s.totalEarnedValue}>₹500</Text>
              <Text style={s.totalEarnedSubtext}>
                Default mentor wallet balance · Welcome bonus
              </Text>
              
              <View style={s.metricGrid}>
                <View style={s.metricItem}>
                  <Text style={s.metricItemLabel}>THIS MONTH</Text>
                  <Text style={s.metricItemVal}>{demoMode ? '₹500' : '₹0'}</Text>
                  <Text style={s.metricItemSub}>{demoMode ? '1 session' : '0 sessions'}</Text>
                </View>
                
                <View style={[s.metricItem, s.metricItemBorder]}>
                  <Text style={s.metricItemLabel}>THIS WEEK</Text>
                  <Text style={s.metricItemVal}>₹500</Text>
                  <Text style={s.metricItemSub}>1 session</Text>
                </View>
                
                <View style={s.metricItem}>
                  <Text style={s.metricItemLabel}>TODAY</Text>
                  <Text style={s.metricItemVal}>₹{availableWithdraw.toLocaleString('en-IN')}</Text>
                  <Text style={s.metricItemSub}>Available</Text>
                </View>
              </View>

              {demoMode && availableWithdraw > 0 ? (
                <Pressable onPress={handleWithdrawPendingClick} style={s.withdrawPendingBtn}>
                  <Text style={s.withdrawPendingText}>Withdraw ₹{availableWithdraw.toLocaleString('en-IN')} Pending →</Text>
                </Pressable>
              ) : (
                <View style={[s.withdrawAllSettled, !demoMode && { borderColor: MC.border, backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                  <Check size={14} color={demoMode ? MC.green : MC.muted} />
                  <Text style={[s.withdrawAllSettledText, !demoMode && { color: MC.muted }]}>
                    {demoMode ? 'All available earnings have been withdrawn' : 'No balance available'}
                  </Text>
                </View>
              )}
            </View>

            {/* AI Revenue Forecast Accordion */}
            <View style={s.forecastCard}>
              <Pressable 
                onPress={() => setShowForecast(!showForecast)}
                style={s.forecastHeader}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} color={demoMode ? '#22C55E' : MC.muted} />
                  <Text style={[s.forecastTitle, !demoMode && { color: MC.muted }]}>AI Revenue Forecast — What will I earn next month?</Text>
                </View>
                {showForecast ? <ChevronUp size={16} color={MC.muted} /> : <ChevronDown size={16} color={MC.muted} />}
              </Pressable>
              
              {showForecast && (
                <View style={s.forecastContent}>
                  {demoMode ? (
                    <>
                      <Text style={s.forecastText}>
                        Based on your current 12% monthly growth rate, average conversion, and active recurring student commitments, you are projected to make <Text style={{ color: '#5EEAD4', fontFamily: FONTS.bold }}>₹33,000</Text> next month (June 2026).
                      </Text>
                      <Text style={[s.forecastText, { marginTop: 6 }]}>
                        🚀 <Text style={{ fontFamily: FONTS.bold, color: '#fff' }}>Pro Tip:</Text> Offering a "3-session package discount" can secure up to ₹42,000 in advanced bookings.
                      </Text>
                    </>
                  ) : (
                    <Text style={s.forecastText}>
                      🔒 AI Revenue Forecast will be available after completing 5 paid mentoring sessions.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Monthly Earnings Chart */}
            <View style={s.chartCard}>
              <View style={s.chartHeaderRow}>
                <View>
                  <Text style={s.chartTitle}>Monthly Earnings</Text>
                  <Text style={s.chartSubtitle}>Last 6 months</Text>
                </View>
                {demoMode ? (
                  <View style={s.growthBadge}>
                    <TrendingUp size={12} color="#86EFAC" />
                    <Text style={s.growthBadgeText}>12% vs last month</Text>
                  </View>
                ) : (
                  <View style={[s.growthBadge, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <Text style={[s.growthBadgeText, { color: MC.muted }]}>No trend data</Text>
                  </View>
                )}
              </View>
              
              {demoMode ? (
                <View style={s.customChartContainer}>
                  {MOCK_MONTHLY_CHART.map((c) => {
                    const isApr = c.month === 'Apr';
                    const maxVal = 31000;
                    const barHeight = Math.round((c.amount / maxVal) * 105);
                    
                    return (
                      <View key={c.month} style={s.chartBarColumn}>
                        <Text style={[s.chartBarLabel, isApr && s.chartBarLabelActive]}>
                          {c.label}
                        </Text>
                        <View 
                          style={[
                            s.chartBarTrack, 
                            { height: barHeight },
                            isApr ? s.chartBarActive : s.chartBarInactive
                          ]} 
                        />
                        <Text style={[s.chartBarMonth, isApr && s.chartBarMonthActive]}>
                          {c.month}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={[s.customChartContainer, { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: MC.border, borderRadius: 10, height: 120 }]}>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 }}>
                    Timeline for monthly earnings will appear here after you conduct paid sessions.
                  </Text>
                </View>
              )}
            </View>

            {/* Highlights Grid */}
            <View style={s.highlightGrid}>
              <View style={s.highlightCard}>
                <View style={[s.highlightIndicator, { backgroundColor: demoMode ? MC.green : MC.border }]} />
                <View style={s.highlightContent}>
                  <Text style={s.highlightVal}>{demoMode ? '₹1000' : '₹0'}</Text>
                  <Text style={s.highlightLabel}>Avg/Session</Text>
                </View>
              </View>
              
              <View style={s.highlightCard}>
                <View style={[s.highlightIndicator, { backgroundColor: demoMode ? MC.amber : MC.border }]} />
                <View style={s.highlightContent}>
                  <Text style={s.highlightVal}>{demoMode ? 'Mar - ₹31k' : '—'}</Text>
                  <Text style={s.highlightLabel}>Best Month</Text>
                </View>
              </View>
              
              <View style={s.highlightCard}>
                <View style={[s.highlightIndicator, { backgroundColor: demoMode ? MC.teal : MC.border }]} />
                <View style={s.highlightContent}>
                  <Text style={s.highlightVal}>{demoMode ? '6' : '0'}</Text>
                  <Text style={s.highlightLabel}>Paid Sessions</Text>
                </View>
              </View>
              
              <View style={s.highlightCard}>
                <View style={[s.highlightIndicator, { backgroundColor: demoMode ? MC.purple : MC.border }]} />
                <View style={s.highlightContent}>
                  <Text style={s.highlightVal}>{demoMode ? '2' : '0'}</Text>
                  <Text style={s.highlightLabel}>Free Sessions</Text>
                </View>
              </View>
            </View>

            {/* TDS details & Form 16 Card */}
            <View style={s.tdsCard}>
              <View style={s.tdsDetails}>
                <FileText size={16} color="#FCD34D" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  {demoMode ? (
                    <>
                      <Text style={s.tdsText}>
                        <Text style={{ fontFamily: FONTS.bold, color: '#FCD34D' }}>TDS (10%):</Text> Gross ₹1,42,000 - Deducted ₹14,200 - <Text style={{ fontFamily: FONTS.bold, color: '#fff' }}>Net ₹1,27,800</Text>
                      </Text>
                      <Text style={s.tdsSubtext}>Taxes withheld under Section 194J. Net proceeds settled directly.</Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.tdsText}>
                        <Text style={{ fontFamily: FONTS.bold, color: '#FCD34D' }}>TDS (10%):</Text> Gross ₹0 - Deducted ₹0 - <Text style={{ fontFamily: FONTS.bold, color: '#fff' }}>Net ₹0</Text>
                      </Text>
                      <Text style={s.tdsSubtext}>TDS details and Form 16 will be generated after your first paid session.</Text>
                    </>
                  )}
                </View>
              </View>
              
              <Pressable 
                onPress={handleDownloadForm16}
                disabled={isDownloadingForm16 || !demoMode}
                style={[s.downloadBtn, !demoMode && { opacity: 0.5, cursor: 'default' }]}
              >
                {isDownloadingForm16 ? (
                  <ActivityIndicator size="small" color="#FCD34D" />
                ) : (
                  <>
                    <Download size={14} color="#FCD34D" />
                    <Text style={s.downloadBtnText}>Download Form 16</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* 2. TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          demoMode ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Recent Transactions</Text>
              <View style={s.transactionsList}>
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
                    <View key={t.id} style={s.txRow}>
                      {/* Circle avatar initials */}
                      <View style={[s.txAvatar, { backgroundColor: t.color + '25', borderColor: t.color + '60' }]}>
                        <Text style={[s.txAvatarText, { color: t.color }]}>{t.avatar}</Text>
                      </View>
                      
                      {/* Transaction topic info */}
                      <View style={s.txInfoWrap}>
                        <Text style={s.txStudentName}>{t.name}</Text>
                        <Text style={s.txTopicText}>{t.topic}</Text>
                        <Text style={s.txMetaText}>{t.duration} min · {t.date}</Text>
                      </View>
                      
                      {/* Amount & Status Badges */}
                      <View style={s.txRightWrap}>
                        <Text style={[
                          s.txAmountText, 
                          isFree && s.txAmountFree,
                          isPending && s.txAmountPending
                        ]}>
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
            <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
              <FileText size={48} color={MC.dim} style={{ marginBottom: 12 }} />
              <Text style={[s.cardTitle, { marginBottom: 4 }]}>No transactions yet</Text>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }}>
                Transactions appear here once students book and complete paid sessions with you.
              </Text>
            </View>
          )
        )}

        {/* 3. BY STUDENT TAB */}
        {activeTab === 'student' && (
          demoMode ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Earnings by Student</Text>
              <View style={s.studentList}>
                {MOCK_BY_STUDENT.map((item) => {
                  const isFree = item.isFree;
                  const progressWidth = `${item.progress * 100}%`;
                  
                  return (
                    <View key={item.id} style={s.studentCard}>
                      <View style={s.studentHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={[s.txAvatar, { backgroundColor: item.color + '25', borderColor: item.color + '60', width: 34, height: 34, borderRadius: 17 }]}>
                            <Text style={[s.txAvatarText, { color: item.color, fontSize: 11 }]}>{item.avatar}</Text>
                          </View>
                          <View>
                            <Text style={s.studentNameText}>{item.name}</Text>
                            <Text style={s.studentSessionsCount}>{item.sessions} sessions</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[s.studentAmountText, isFree && s.studentAmountFree]}>
                            {isFree ? 'Pro-bono' : `₹${item.amount.toLocaleString('en-IN')}`}
                          </Text>
                          <Text style={s.studentRateText}>{item.rate}</Text>
                        </View>
                      </View>
                      
                      {/* Dynamic horizontal percentage progress bar */}
                      <View style={s.progressBarTrack}>
                        <View style={[
                          s.progressBarFill, 
                          { 
                            width: progressWidth as any,
                            backgroundColor: item.color 
                          }
                        ]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
              <Users size={48} color={MC.dim} style={{ marginBottom: 12 }} />
              <Text style={[s.cardTitle, { marginBottom: 4 }]}>No student earnings yet</Text>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }}>
                Once you have active student connections, their session breakdown and earnings will appear here.
              </Text>
            </View>
          )
        )}

        {/* 4. WITHDRAWALS TAB */}
        {activeTab === 'withdrawals' && (
          <View style={{ gap: 16 }}>
            {/* Cashout balance status */}
            <LinearGradient 
              colors={['rgba(20,184,166,0.15)', 'rgba(15,118,110,0.05)']} 
              style={s.withdrawBanner}
            >
              <Text style={s.withdrawKicker}>AVAILABLE TO WITHDRAW</Text>
              <Text style={s.withdrawMainAmount}>₹{demoMode ? availableWithdraw.toLocaleString('en-IN') : '0'}</Text>
              <Text style={s.withdrawSubtext}>
                {demoMode && availableWithdraw > 0 
                  ? 'From 2 settled sessions · Credited in 2-3 business days' 
                  : 'No balance available for withdrawal.'}
              </Text>
              
              {demoMode && availableWithdraw > 0 && (
                <View style={s.withdrawOptionsRow}>
                  <Pressable 
                    onPress={() => setWithdrawMethod('upi')}
                    style={[s.methodButton, withdrawMethod === 'upi' && s.methodButtonActive]}
                  >
                    <ArrowRight size={12} color={withdrawMethod === 'upi' ? '#fff' : MC.tealP} style={{ transform: [{ rotate: '-45deg' }] }} />
                    <Text style={[s.methodBtnText, withdrawMethod === 'upi' && s.methodBtnTextActive]}>UPI / PhonePe</Text>
                  </Pressable>
                  
                  <Pressable 
                    onPress={() => setWithdrawMethod('bank')}
                    style={[s.methodButton, withdrawMethod === 'bank' && s.methodButtonActive]}
                  >
                    <ArrowRight size={12} color={withdrawMethod === 'bank' ? '#fff' : MC.tealP} style={{ transform: [{ rotate: '-45deg' }] }} />
                    <Text style={[s.methodBtnText, withdrawMethod === 'bank' && s.methodBtnTextActive]}>Bank Transfer</Text>
                  </Pressable>
                  
                  <Pressable 
                    onPress={() => setWithdrawMethod('paytm')}
                    style={[s.methodButton, withdrawMethod === 'paytm' && s.methodButtonActive]}
                  >
                    <ArrowRight size={12} color={withdrawMethod === 'paytm' ? '#fff' : MC.tealP} style={{ transform: [{ rotate: '-45deg' }] }} />
                    <Text style={[s.methodBtnText, withdrawMethod === 'paytm' && s.methodBtnTextActive]}>Paytm</Text>
                  </Pressable>
                </View>
              )}
              
              {/* Confirm details subform drawer */}
              {demoMode && availableWithdraw > 0 && withdrawMethod && (
                <View style={s.withdrawDrawer}>
                  {withdrawMethod === 'upi' && (
                    <View style={s.drawerForm}>
                      <Text style={s.inputLabel}>Enter UPI ID / VPA</Text>
                      <TextInput
                        value={upiId}
                        onChangeText={setUpiId}
                        placeholder="e.g. sureshrao@okicici"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={s.textInput}
                      />
                    </View>
                  )}
                  
                  {withdrawMethod === 'bank' && (
                    <View style={s.drawerForm}>
                      <Text style={s.inputLabel}>Bank Account Number</Text>
                      <TextInput
                        value={bankAccount}
                        onChangeText={setBankAccount}
                        placeholder="Account Number"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={[s.textInput, { marginBottom: 10 }]}
                      />
                      <Text style={s.inputLabel}>IFSC Code</Text>
                      <TextInput
                        value={bankIfsc}
                        onChangeText={setBankIfsc}
                        placeholder="IFSC Code"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={s.textInput}
                      />
                    </View>
                  )}
                  
                  {withdrawMethod === 'paytm' && (
                    <View style={s.drawerForm}>
                      <Text style={s.inputLabel}>Paytm Registered Mobile Number</Text>
                      <TextInput
                        value={paytmNumber}
                        onChangeText={setPaytmNumber}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={s.textInput}
                        keyboardType="phone-pad"
                      />
                    </View>
                  )}
                  
                  <Pressable 
                    onPress={handleConfirmWithdraw}
                    disabled={isWithdrawing}
                    style={s.confirmWithdrawBtn}
                  >
                    {isWithdrawing ? (
                      <ActivityIndicator size="small" color={MC.bg} />
                    ) : (
                      <Text style={s.confirmWithdrawText}>Confirm Withdrawal of ₹{availableWithdraw.toLocaleString('en-IN')}</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </LinearGradient>
            
            {/* AI Tax Summary */}
            <View style={s.forecastCard}>
              <Pressable 
                onPress={() => setShowTaxSummary(!showTaxSummary)}
                style={s.forecastHeader}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} color={demoMode ? '#A78BFA' : MC.muted} />
                  <Text style={[s.forecastTitle, !demoMode && { color: MC.muted }]}>AI Tax Summary — What do I owe?</Text>
                </View>
                {showTaxSummary ? <ChevronUp size={16} color={MC.muted} /> : <ChevronDown size={16} color={MC.muted} />}
              </Pressable>
              
              {showTaxSummary && (
                <View style={s.forecastContent}>
                  {demoMode ? (
                    <>
                      <Text style={s.forecastText}>
                        Professional fee settlements are subject to a flat <Text style={{ color: '#FCD34D', fontFamily: FONTS.bold }}>10% TDS</Text> under Section 194J of the Income Tax Act.
                      </Text>
                      <Text style={[s.forecastText, { marginTop: 6 }]}>
                        • Total deducted this fiscal year: <Text style={{ color: '#fff', fontFamily: FONTS.bold }}>₹14,200</Text>{"\n"}
                        • Consolidated Form 16 can be downloaded from the Overview tab. This TDS will automatically reflect in your Form 26AS for tax offsetting.
                      </Text>
                    </>
                  ) : (
                    <Text style={s.forecastText}>
                      🔒 AI Tax Summary will be available after your first paid session.
                    </Text>
                  )}
                </View>
              )}
            </View>
            
            {/* Withdrawal UTR history */}
            <View style={s.card}>
              <Text style={s.cardTitle}>WITHDRAWAL HISTORY</Text>
              {demoMode ? (
                <View style={{ gap: 10 }}>
                  {withdrawalHistory.map((w) => (
                    <View key={w.id} style={s.withdrawalHistoryRow}>
                      <View style={s.withdrawalIconBox}>
                        <Clock size={15} color={MC.teal} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.withdrawalAmountText}>₹{w.amount.toLocaleString('en-IN')}</Text>
                        <Text style={s.withdrawalMetaText}>{w.date} · {w.utr}</Text>
                      </View>
                      <Badge label={w.status} color="green" />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 13 }}>No withdrawal history found.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 5. SA WALLET TAB */}
        {activeTab === 'wallet' && (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <View style={[s.withdrawalIconBox, { backgroundColor: 'rgba(20,184,166,0.15)' }]}>
                <Wallet size={20} color={MC.teal} />
              </View>
              <View>
                <Text style={s.cardTitle}>SA Smart Wallet</Text>
                <Text style={s.withdrawalMetaText}>Instant student settlements & zero gateway fees</Text>
              </View>
            </View>
            
            <LinearGradient 
              colors={['rgba(20,184,166,0.15)', 'rgba(20,12,40,0.85)']} 
              style={[s.withdrawBanner, { borderWidth: 1, borderColor: 'rgba(20,184,166,0.30)' }]}
            >
              <Text style={s.withdrawKicker}>SA WALLET BALANCE</Text>
              <Text style={s.withdrawMainAmount}>{demoMode ? '₹45,500' : '₹0'}</Text>
              <Text style={s.withdrawSubtext}>Linked with your verified institutional student account</Text>
              
              <View style={[s.withdrawOptionsRow, { marginTop: 16 }]}>
                <Pressable 
                  style={[s.methodButton, !demoMode && { opacity: 0.5, borderColor: MC.border }]} 
                  disabled={!demoMode}
                  onPress={() => toast.success('Transfer Initiated', 'Transferring funds to your bank account...')}
                >
                  <Text style={[s.methodBtnText, !demoMode && { color: MC.muted }]}>Transfer to Bank</Text>
                </Pressable>
                <Pressable 
                  style={[s.methodButton, !demoMode && { opacity: 0.5, borderColor: MC.border }]} 
                  disabled={!demoMode}
                  onPress={() => toast.info('Smart Wallet Linked', 'Smart wallet details are verified.')}
                >
                  <Text style={[s.methodBtnText, !demoMode && { color: MC.muted }]}>Wallet Settings</Text>
                </Pressable>
              </View>
            </LinearGradient>
            
            <View style={{ marginTop: 20, gap: 12 }}>
              <View style={s.infoBlockRow}>
                <Check size={16} color={MC.green} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>Instant Clearing</Text>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11 }}>Funds cleared within 60 seconds of session completion.</Text>
                </View>
              </View>
              
              <View style={s.infoBlockRow}>
                <Check size={16} color={MC.green} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>Zero Fee Gateway</Text>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11 }}>Zero convenience fees on both student payouts and alumni receipts.</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mainTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 12,
    marginTop: 2,
  },
  tabBarContainer: {
    marginBottom: 8,
  },
  tabBarScroll: {
    flexDirection: 'row',
    gap: 10,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.border,
    cursor: 'pointer',
  } as any,
  tabPillActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0F766E',
  },
  tabText: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 13,
  },
  tabTextActive: {
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  card: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 15,
    marginBottom: 16,
  },
  insightsCard: {
    backgroundColor: 'rgba(245,158,11,0.03)',
    borderColor: 'rgba(245,158,11,0.25)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  insightsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  insightsKicker: {
    color: '#F59E0B',
    fontFamily: FONTS.xbold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  insightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    backgroundColor: 'rgba(245,158,11,0.06)',
    cursor: 'pointer',
  } as any,
  insightsButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
  },
  insightsButtonText: {
    color: '#FCD34D',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  insightsButtonTextActive: {
    color: '#fff',
  },
  insightsContent: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245,158,11,0.15)',
    gap: 8,
  },
  insightsDetailText: {
    color: '#FCD34D',
    fontFamily: FONTS.med,
    fontSize: 12.5,
  },
  insightsBullets: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 12,
    lineHeight: 19,
  },
  totalEarnedCard: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  totalEarnedKicker: {
    color: MC.dim,
    fontFamily: FONTS.xbold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  totalEarnedValue: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 38,
    letterSpacing: -1,
    marginBottom: 4,
  },
  totalEarnedSubtext: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 13.5,
    marginBottom: 20,
  },
  metricGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: MC.border,
    paddingVertical: 16,
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: MC.border,
  },
  metricItemLabel: {
    color: MC.dim,
    fontFamily: FONTS.xbold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  metricItemVal: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 16.5,
  },
  metricItemSub: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
  },
  withdrawPendingBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  } as any,
  withdrawPendingText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  withdrawAllSettled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderRadius: 12,
  },
  withdrawAllSettledText: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 12.5,
  },
  forecastCard: {
    backgroundColor: 'rgba(34,197,94,0.03)',
    borderColor: 'rgba(34,197,94,0.20)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  } as any,
  forecastTitle: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  forecastContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(34,197,94,0.15)',
  },
  forecastText: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 12,
    lineHeight: 18,
  },
  chartCard: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  chartTitle: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14.5,
  },
  chartSubtitle: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 11,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  growthBadgeText: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  customChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 125,
    paddingHorizontal: 4,
    marginTop: 10,
  },
  chartBarColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  chartBarLabel: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 10,
  },
  chartBarLabelActive: {
    color: '#F97316',
    fontFamily: FONTS.xbold,
  },
  chartBarTrack: {
    width: '65%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  chartBarInactive: {
    backgroundColor: MC.teal,
    opacity: 0.5,
  },
  chartBarActive: {
    backgroundColor: '#F97316',
    opacity: 1,
  },
  chartBarMonth: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10,
  },
  chartBarMonthActive: {
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  highlightGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  highlightCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightIndicator: {
    width: 3,
    height: '70%',
    borderRadius: 2,
  },
  highlightContent: {
    gap: 2,
  },
  highlightVal: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13.5,
  },
  highlightLabel: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 10.5,
  },
  tdsCard: {
    backgroundColor: 'rgba(252,211,77,0.03)',
    borderColor: 'rgba(252,211,77,0.20)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  tdsDetails: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
    minWidth: 260,
  },
  tdsText: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 12,
    lineHeight: 18,
  },
  tdsSubtext: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5,
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'transparent',
    cursor: 'pointer',
  } as any,
  downloadBtnText: {
    color: '#FCD34D',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  transactionsList: {
    gap: 12,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  txAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txAvatarText: {
    fontFamily: FONTS.bold,
    fontSize: 12.5,
  },
  txInfoWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  txStudentName: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13.5,
  },
  txTopicText: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 12,
  },
  txMetaText: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5,
  },
  txRightWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  txAmountText: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 13.5,
  },
  txAmountFree: {
    color: MC.dim,
  },
  txAmountPending: {
    color: '#FCD34D',
  },
  studentList: {
    gap: 14,
  },
  studentCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentNameText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13.5,
  },
  studentSessionsCount: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 11,
  },
  studentAmountText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13.5,
  },
  studentAmountFree: {
    color: MC.dim,
  },
  studentRateText: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  withdrawBanner: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.25)',
  },
  withdrawKicker: {
    color: MC.muted,
    fontFamily: FONTS.xbold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  withdrawMainAmount: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 34,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  withdrawSubtext: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12.5,
    marginBottom: 16,
  },
  withdrawOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(20,184,166,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.25)',
    cursor: 'pointer',
  } as any,
  methodButtonActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0F766E',
  },
  methodBtnText: {
    color: MC.tealP,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  methodBtnTextActive: {
    color: '#fff',
  },
  withdrawDrawer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  drawerForm: {
    gap: 6,
  },
  inputLabel: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 11.5,
  },
  textInput: {
    backgroundColor: 'rgba(20,12,40,0.6)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 12.5,
  },
  confirmWithdrawBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginTop: 4,
  } as any,
  confirmWithdrawText: {
    color: MC.bg,
    fontFamily: FONTS.xbold,
    fontSize: 12.5,
  },
  withdrawalHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  withdrawalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(20,184,166,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawalAmountText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13.5,
  },
  withdrawalMetaText: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 11,
  },
  infoBlockRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  demoBadgeBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  demoBadgeText: {
    color: '#FBBF24',
    fontFamily: FONTS.bold,
    fontSize: 12,
    textAlign: 'center',
  },
});
