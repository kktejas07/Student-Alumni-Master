/**
 * /wallet — SA Credits Wallet (5-tab)
 *   Overview · Add Money · Withdraw · Credits · History
 *
 * Wired to:
 *   GET  /api/wallet/summary
 *   POST /api/wallet/topup
 *   POST /api/wallet/withdraw
 *   POST /api/wallet/track
 *   POST /api/wallet/seed-demo-earnings
 *
 * Conversion: 25 credits = ₹1 INR (CREDITS_PER_INR=25)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
  TextInput, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import MoneyCoach from '@/src/views/web/wallet/MoneyCoach';
import { request } from '@/src/models/services/api';

// ─── Types ───────────────────────────────────────────────────────────────
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type LevelInfo = {
  level: number;
  name: string;
  icon: IconName;
  color: string;
  next_level_name?: string | null;
  next_level_at?: number | null;
  progress_pct: number;
  credits_to_next: number;
};

type EarningRule = {
  activity_type: string;
  label: string;
  icon: IconName;
  credits: number;
  category?: string;
  once?: boolean;
  max_per_day?: number;
};

type ActivityItem = {
  activity_type: string;
  label: string;
  icon: IconName;
  credits: number;
  count: number;
  last_at: string;
};

type CategoryGroup = {
  category: string;
  credits: number;
  items: ActivityItem[];
};

type Txn = {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  balance_after: number;
  metadata?: any;
  ts: string;
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
  withdraw_threshold_credits: number;
  withdraw_threshold_inr: number;
  topup_bonus_pct: number;
  level: LevelInfo;
  streak_days: number;
  active_days_30: number;
  earnings_by_category: CategoryGroup[];
  activity_breakdown: ActivityItem[];
  earning_rules: EarningRule[];
  history: Txn[];
};

// ─── Constants ───────────────────────────────────────────────────────────
const C = {
  text: '#fff',
  text2: 'rgba(255,255,255,0.72)',
  text3: 'rgba(255,255,255,0.46)',
  border: 'rgba(255,255,255,0.10)',
  borderHi: 'rgba(255,255,255,0.20)',
  card: 'rgba(255,255,255,0.06)',
  cardHi: 'rgba(255,255,255,0.10)',
  good: '#34D399',
  bad: '#F87171',
  accent: '#A78BFA',
  warn: '#F59E0B',
};

const CATEGORY_META: Record<string, { label: string; icon: IconName; color: string }> = {
  engagement: { label: 'Engagement',  icon: 'fire',                color: '#F97316' },
  milestones: { label: 'Milestones',  icon: 'trophy-variant',      color: '#FCD34D' },
  sessions:   { label: 'Sessions',    icon: 'video-account',       color: '#22D3EE' },
  events:     { label: 'Events',      icon: 'calendar-star',       color: '#F472B6' },
  referrals:  { label: 'Referrals',   icon: 'account-multiple-plus', color: '#34D399' },
  other:      { label: 'Other',       icon: 'star-circle-outline', color: '#A78BFA' },
};

const TABS: { id: 'overview' | 'topup' | 'withdraw' | 'credits' | 'history'; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview',   icon: 'view-dashboard' },
  { id: 'topup',    label: 'Add Money',  icon: 'plus-circle' },
  { id: 'withdraw', label: 'Withdraw',   icon: 'cash-fast' },
  { id: 'credits',  label: 'Credits',    icon: 'star-four-points' },
  { id: 'history',  label: 'History',    icon: 'history' },
];

const TOPUP_PRESETS = [100, 250, 500, 1000, 2500, 5000];
const WITHDRAW_PRESETS_INR = [100, 250, 500, 1000];

function fmtINR(n: number): string {
  if (!isFinite(n)) return '₹0';
  const v = Math.round(n);
  return `₹${v.toLocaleString('en-IN')}`;
}
function fmtCredits(n: number): string {
  if (!isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-IN');
}
function relTime(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

// ─── Component ───────────────────────────────────────────────────────────
export default function WalletScreen() {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('overview');
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Top-up state
  const [topupAmount, setTopupAmount] = useState<string>('500');
  const [topupMethod, setTopupMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [topupSubmitting, setTopupSubmitting] = useState(false);
  const [topupResult, setTopupResult] = useState<any | null>(null);

  // Withdraw state
  const [wdAmountInr, setWdAmountInr] = useState<string>('100');
  const [wdMethod, setWdMethod] = useState<'upi' | 'bank'>('upi');
  const [wdTarget, setWdTarget] = useState<string>('');
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdResult, setWdResult] = useState<any | null>(null);

  // Seeding state
  const [seeding, setSeeding] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      setErrorMsg(null);
      const r = await request<Summary>('/wallet/summary');
      setData(r);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not load wallet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const onRefresh = () => { setRefreshing(true); fetchSummary(); };

  const onSeedDemo = async () => {
    setSeeding(true);
    try {
      await request<any>('/wallet/seed-demo-earnings', { method: 'POST', body: {} });
      await fetchSummary();
    } catch {} finally { setSeeding(false); }
  };

  const onTopup = async () => {
    const inr = Number(topupAmount);
    if (!inr || inr <= 0) return;
    setTopupSubmitting(true); setTopupResult(null);
    try {
      const r = await request<any>('/wallet/topup', {
        method: 'POST',
        body: { amount_inr: inr, payment_method: topupMethod },
      });
      setTopupResult(r);
      await fetchSummary();
    } catch (e: any) {
      setTopupResult({ ok: false, error: e?.message || 'Top-up failed' });
    } finally { setTopupSubmitting(false); }
  };

  const onWithdraw = async () => {
    const inr = Number(wdAmountInr);
    if (!inr || inr <= 0) return;
    setWdSubmitting(true); setWdResult(null);
    try {
      const r = await request<any>('/wallet/withdraw', {
        method: 'POST',
        body: { amount_inr: inr, method: wdMethod, target: wdTarget || (wdMethod === 'upi' ? 'demo@upi' : 'XXXX1234') },
      });
      setWdResult(r);
      await fetchSummary();
    } catch (e: any) {
      setWdResult({ ok: false, error: e?.message || 'Withdraw failed' });
    } finally { setWdSubmitting(false); }
  };

  const headerRight = useMemo(() => (
    <View style={s.heroPill}>
      <MaterialCommunityIcons name={(data?.level?.icon as IconName) || 'medal'} size={14} color={data?.level?.color || '#FCD34D'} />
      <Text style={s.heroPillText}>{data?.level?.name || 'Bronze'}</Text>
    </View>
  ), [data]);

  if (loading) {
    return (
      <FeaturePageShell title="Wallet" subtitle="Your SA Credits + earnings" heroEmoji="💰" accent="#5F259F">
        <View style={s.loaderBox}>
          <ActivityIndicator color="#A78BFA" size="large" />
          <Text style={s.loaderText}>Loading your wallet…</Text>
        </View>
      </FeaturePageShell>
    );
  }

  return (
    <FeaturePageShell
      title="Wallet"
      subtitle="Earn credits by being active. Convert to ₹ when you cross the threshold."
      heroEmoji="💰"
      accent="#5F259F"
      rightSlot={headerRight}
    >
      {errorMsg ? (
        <View style={s.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#F87171" />
          <Text style={s.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Hero balance card */}
      {data && <BalanceHero data={data} onSeedDemo={onSeedDemo} seeding={seeding} />}

      {/* Tab strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 12 }}
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[s.tab, active && s.tabActive]}
            >
              <MaterialCommunityIcons name={t.icon} size={14} color={active ? '#fff' : 'rgba(255,255,255,0.65)'} />
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Refresh control wrapper — nested in FeaturePageShell's ScrollView, so just render content */}
      <View style={{ paddingVertical: 4, gap: 18 }}>
        {data && tab === 'overview' && <OverviewTab data={data} onJump={(t) => setTab(t)} />}
        {data && tab === 'topup' && (
          <TopupTab
            data={data}
            amount={topupAmount} setAmount={setTopupAmount}
            method={topupMethod} setMethod={setTopupMethod}
            submitting={topupSubmitting} onSubmit={onTopup} result={topupResult}
          />
        )}
        {data && tab === 'withdraw' && (
          <WithdrawTab
            data={data}
            amountInr={wdAmountInr} setAmountInr={setWdAmountInr}
            method={wdMethod} setMethod={setWdMethod}
            target={wdTarget} setTarget={setWdTarget}
            submitting={wdSubmitting} onSubmit={onWithdraw} result={wdResult}
          />
        )}
        {data && tab === 'credits' && <CreditsTab data={data} onSeedDemo={onSeedDemo} seeding={seeding} />}
        {data && tab === 'history' && <HistoryTab data={data} />}
      </View>

      {/* Floating Money Coach */}
      <MoneyCoach />
    </FeaturePageShell>
  );
}

// ─── Hero card ───────────────────────────────────────────────────────────
function BalanceHero({ data, onSeedDemo, seeding }: { data: Summary; onSeedDemo: () => void; seeding: boolean }) {
  const lvl = data.level;
  return (
    <LinearGradient
      colors={['#5F259F', '#7C3AED', '#A855F7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.heroCard}
    >
      <View style={s.heroTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>SA WALLET BALANCE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 }}>
            <Text style={s.heroBalance}>{fmtCredits(data.balance_credits)}</Text>
            <Text style={s.heroInr}>≈ {fmtINR(data.balance_inr)}</Text>
          </View>
          <View style={s.verifiedPill}>
            <MaterialCommunityIcons name="shield-check" size={11} color="#6EE7B7" />
            <Text style={s.verifiedPillText}>SA Verified · Instant transfers</Text>
          </View>
          <Text style={s.heroSub}>1 ₹ = {data.credits_per_inr} credits</Text>
        </View>

        <View style={s.levelBadge}>
          <MaterialCommunityIcons name={lvl.icon} size={20} color={lvl.color} />
          <Text style={s.levelName}>{lvl.name}</Text>
          <Text style={s.levelTier}>Tier {lvl.level}</Text>
        </View>
      </View>

      {/* Level progress bar */}
      <View style={s.heroProgressWrap}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={s.heroProgressLabel}>
            {lvl.next_level_name
              ? `${fmtCredits(lvl.credits_to_next)} credits to ${lvl.next_level_name}`
              : 'Max tier reached 🎉'}
          </Text>
          <Text style={s.heroProgressPct}>{Math.round(lvl.progress_pct)}%</Text>
        </View>
        <View style={s.heroProgressTrack}>
          <View style={[s.heroProgressFill, { width: `${Math.min(100, lvl.progress_pct)}%` }]} />
        </View>
      </View>

      {/* Quick stats row */}
      <View style={s.heroStatsRow}>
        <HeroStat icon="fire"  label="Streak"          value={`${data.streak_days}d`}                  tint="#F97316" />
        <HeroStat icon="trophy" label="Lifetime earned" value={fmtCredits(data.lifetime_earned)}        tint="#FCD34D" />
        <HeroStat icon="bank-transfer-out" label="Spent" value={fmtCredits(data.lifetime_spent)}        tint="#F472B6" />
      </View>

      {data.lifetime_earned <= 0 && (
        <Pressable style={s.heroSeed} onPress={onSeedDemo} disabled={seeding}>
          {seeding
            ? <ActivityIndicator color="#fff" />
            : <>
                <MaterialCommunityIcons name="auto-fix" size={14} color="#fff" />
                <Text style={s.heroSeedText}>Seed demo earnings</Text>
              </>}
        </Pressable>
      )}
    </LinearGradient>
  );
}

function HeroStat({ icon, label, value, tint }: { icon: IconName; label: string; value: string; tint: string }) {
  return (
    <View style={s.heroStat}>
      <View style={[s.heroStatIcon, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
        <MaterialCommunityIcons name={icon} size={14} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.heroStatLabel}>{label}</Text>
        <Text style={s.heroStatValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Overview tab ────────────────────────────────────────────────────────
function OverviewTab({ data, onJump }: { data: Summary; onJump: (t: any) => void }) {
  const topEarners = (data.activity_breakdown || []).slice(0, 5);
  const recent = (data.history || []).slice(0, 6);

  return (
    <View style={{ gap: 16 }}>
      {/* Quick actions */}
      <View style={s.qaRow}>
        <QuickAction icon="plus-circle" label="Add Money" tint="#34D399" onPress={() => onJump('topup')} />
        <QuickAction icon="cash-fast" label="Withdraw" tint="#F472B6" onPress={() => onJump('withdraw')} />
        <QuickAction icon="star-four-points" label="Earn More" tint="#FCD34D" onPress={() => onJump('credits')} />
        <QuickAction icon="history" label="History" tint="#A78BFA" onPress={() => onJump('history')} />
      </View>

      {/* Earnings by category */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <MaterialCommunityIcons name="chart-donut" size={16} color={C.accent} />
          <Text style={s.sectionTitle}>Earnings by category</Text>
        </View>
        {data.earnings_by_category.length === 0 ? (
          <Text style={s.emptyText}>No earnings yet — start by completing your profile or attending an event.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {data.earnings_by_category.map((c) => {
              const meta = CATEGORY_META[c.category] || CATEGORY_META.other;
              const total = data.lifetime_earned || 1;
              const pct = (c.credits / total) * 100;
              return (
                <View key={c.category} style={s.catRow}>
                  <View style={[s.catIcon, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
                    <MaterialCommunityIcons name={meta.icon} size={16} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={s.catLabel}>{meta.label}</Text>
                      <Text style={s.catCredits}>{fmtCredits(c.credits)} cr</Text>
                    </View>
                    <View style={s.catTrack}>
                      <View style={[s.catFill, { width: `${Math.min(100, pct)}%`, backgroundColor: meta.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Top earning activities */}
      {topEarners.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHead}>
            <MaterialCommunityIcons name="medal" size={16} color="#FCD34D" />
            <Text style={s.sectionTitle}>Top earning activities</Text>
          </View>
          <View style={{ gap: 8 }}>
            {topEarners.map((it) => (
              <View key={it.activity_type} style={s.activityRow}>
                <View style={[s.actIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                  <MaterialCommunityIcons name={it.icon || 'trophy'} size={16} color="#FCD34D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actLabel}>{it.label}</Text>
                  <Text style={s.actMeta}>×{it.count} · last {relTime(it.last_at)}</Text>
                </View>
                <Text style={s.actCredits}>+{fmtCredits(it.credits)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recent activity */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <MaterialCommunityIcons name="history" size={16} color={C.accent} />
          <Text style={s.sectionTitle}>Recent transactions</Text>
          <Pressable onPress={() => onJump('history')} style={{ marginLeft: 'auto' }}>
            <Text style={s.linkText}>See all</Text>
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <Text style={s.emptyText}>No transactions yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {recent.map((t) => <TxnRow key={t.id} t={t} />)}
          </View>
        )}
      </View>
    </View>
  );
}

function QuickAction({ icon, label, tint, onPress }: { icon: IconName; label: string; tint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.qa, { borderColor: tint + '55' }]}>
      <View style={[s.qaIcon, { backgroundColor: tint + '22' }]}>
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
      </View>
      <Text style={s.qaLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── Top-up tab ──────────────────────────────────────────────────────────
function TopupTab(props: {
  data: Summary;
  amount: string; setAmount: (v: string) => void;
  method: 'upi' | 'card' | 'netbanking'; setMethod: (m: any) => void;
  submitting: boolean; onSubmit: () => void; result: any;
}) {
  const { data, amount, setAmount, method, setMethod, submitting, onSubmit, result } = props;
  const inr = Number(amount) || 0;
  const baseCredits = inr * data.credits_per_inr;
  const bonusCredits = Math.round(baseCredits * (data.topup_bonus_pct / 100));
  const totalCredits = baseCredits + bonusCredits;

  return (
    <View style={{ gap: 16 }}>
      <View style={s.section}>
        <View style={s.sectionHead}>
          <MaterialCommunityIcons name="plus-circle" size={16} color={C.good} />
          <Text style={s.sectionTitle}>Add money to your wallet</Text>
        </View>

        {/* Preset chips */}
        <View style={s.presetRow}>
          {TOPUP_PRESETS.map((v) => (
            <Pressable
              key={v}
              onPress={() => setAmount(String(v))}
              style={[s.preset, Number(amount) === v && s.presetActive]}
            >
              <Text style={[s.presetText, Number(amount) === v && s.presetTextActive]}>{fmtINR(v)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Custom amount */}
        <Text style={s.fieldLabel}>Amount (₹)</Text>
        <View style={s.inputWrap}>
          <Text style={s.inputPrefix}>₹</Text>
          <TextInput
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="500"
            placeholderTextColor={C.text3}
            style={s.input}
          />
        </View>

        {/* Conversion preview */}
        <View style={s.previewBox}>
          <View style={s.previewRow}>
            <Text style={s.previewLabel}>You pay</Text>
            <Text style={s.previewValue}>{fmtINR(inr)}</Text>
          </View>
          <View style={s.previewRow}>
            <Text style={s.previewLabel}>Base credits ({data.credits_per_inr}/₹)</Text>
            <Text style={s.previewValue}>{fmtCredits(baseCredits)} cr</Text>
          </View>
          <View style={s.previewRow}>
            <Text style={[s.previewLabel, { color: '#86EFAC' }]}>+ Bonus ({data.topup_bonus_pct}%)</Text>
            <Text style={[s.previewValue, { color: '#86EFAC' }]}>+{fmtCredits(bonusCredits)} cr</Text>
          </View>
          <View style={[s.previewRow, s.previewTotalRow]}>
            <Text style={s.previewTotalLabel}>You get</Text>
            <Text style={s.previewTotalValue}>{fmtCredits(totalCredits)} credits</Text>
          </View>
        </View>

        {/* Payment method */}
        <Text style={s.fieldLabel}>Payment method</Text>
        <View style={s.methodRow}>
          {(['upi', 'card', 'netbanking'] as const).map((m) => {
            const active = method === m;
            const icon: IconName = m === 'upi' ? 'qrcode' : m === 'card' ? 'credit-card' : 'bank';
            const label = m === 'upi' ? 'UPI' : m === 'card' ? 'Card' : 'NetBanking';
            return (
              <Pressable key={m} onPress={() => setMethod(m)} style={[s.methodChip, active && s.methodChipActive]}>
                <MaterialCommunityIcons name={icon} size={16} color={active ? '#fff' : C.text2} />
                <Text style={[s.methodText, active && { color: '#fff' }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Submit */}
        <Pressable
          style={[s.primaryBtn, { backgroundColor: C.good, opacity: submitting || inr <= 0 ? 0.6 : 1 }]}
          onPress={onSubmit}
          disabled={submitting || inr <= 0}
        >
          {submitting ? <ActivityIndicator color="#0A2E1A" /> : <>
            <MaterialCommunityIcons name="check-circle" size={16} color="#0A2E1A" />
            <Text style={[s.primaryBtnText, { color: '#0A2E1A' }]}>Pay {fmtINR(inr)} & get {fmtCredits(totalCredits)} credits</Text>
          </>}
        </Pressable>

        {/* Result */}
        {result?.ok && (
          <View style={[s.resultBox, { borderColor: '#34D39966', backgroundColor: 'rgba(52,211,153,0.08)' }]}>
            <MaterialCommunityIcons name="check-decagram" size={18} color="#34D399" />
            <View style={{ flex: 1 }}>
              <Text style={s.resultTitle}>Top-up successful</Text>
              <Text style={s.resultSub}>+{fmtCredits(result.total_credits)} credits added · New balance {fmtCredits(result.balance_credits)} cr (≈ {fmtINR(result.balance_inr)})</Text>
            </View>
          </View>
        )}
        {result && !result.ok && (
          <View style={[s.resultBox, { borderColor: '#F8717166', backgroundColor: 'rgba(248,113,113,0.08)' }]}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#F87171" />
            <Text style={[s.resultSub, { color: '#FCA5A5', flex: 1 }]}>{result.error || 'Failed'}</Text>
          </View>
        )}

        <Text style={s.smallNote}>
          Mock gateway — wires to a real payment provider in production. Bonus credits are added instantly.
        </Text>
      </View>
    </View>
  );
}

// ─── Withdraw tab ────────────────────────────────────────────────────────
function WithdrawTab(props: {
  data: Summary;
  amountInr: string; setAmountInr: (v: string) => void;
  method: 'upi' | 'bank'; setMethod: (m: any) => void;
  target: string; setTarget: (v: string) => void;
  submitting: boolean; onSubmit: () => void; result: any;
}) {
  const { data, amountInr, setAmountInr, method, setMethod, target, setTarget, submitting, onSubmit, result } = props;
  const inr = Number(amountInr) || 0;
  const credits = inr * data.credits_per_inr;
  const eligible = data.balance_credits >= data.withdraw_threshold_credits;
  const enough = credits > 0 && credits >= data.withdraw_threshold_credits && credits <= data.balance_credits;
  const requiresOtp = inr > 500;

  // OTP modal state
  const [otpStep, setOtpStep] = useState<null | 'review' | 'otp'>(null);
  const [otp, setOtp] = useState('');
  const [otpResendIn, setOtpResendIn] = useState(0);

  // Mock OTP — in prod this comes from MSG91/Twilio
  const MOCK_OTP = '123456';

  useEffect(() => {
    if (otpStep === 'otp' && otpResendIn > 0) {
      const t = setTimeout(() => setOtpResendIn((v) => v - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpStep, otpResendIn]);

  const startSubmit = () => {
    if (!enough) return;
    setOtpStep('review');
  };

  const handleConfirmReview = () => {
    if (requiresOtp) {
      setOtpStep('otp');
      setOtpResendIn(30);
      setOtp('');
    } else {
      // No OTP needed for ≤ ₹500
      onSubmit();
      setOtpStep(null);
    }
  };

  const handleOtpSubmit = () => {
    if (otp.trim() !== MOCK_OTP) return; // UI-side check; backend would verify too
    onSubmit();
    setOtpStep(null);
    setOtp('');
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={s.section}>
        <View style={s.sectionHead}>
          <MaterialCommunityIcons name="cash-fast" size={16} color="#F472B6" />
          <Text style={s.sectionTitle}>Withdraw to bank / UPI</Text>
        </View>

        {/* Threshold banner */}
        <View style={[s.banner, eligible ? s.bannerOk : s.bannerWarn]}>
          <MaterialCommunityIcons
            name={eligible ? 'check-decagram' : 'information'}
            size={16}
            color={eligible ? '#86EFAC' : '#FCD34D'}
          />
          <Text style={s.bannerText}>
            {eligible
              ? `Eligible — you can withdraw up to ${fmtCredits(data.balance_credits)} credits (${fmtINR(data.balance_inr)})`
              : `Earn ${fmtCredits(data.withdraw_threshold_credits - data.balance_credits)} more credits to unlock withdrawal (min ${fmtINR(data.withdraw_threshold_inr)})`}
          </Text>
        </View>

        {/* Preset chips */}
        <View style={s.presetRow}>
          {WITHDRAW_PRESETS_INR.map((v) => (
            <Pressable
              key={v}
              onPress={() => setAmountInr(String(v))}
              style={[s.preset, Number(amountInr) === v && s.presetActive]}
            >
              <Text style={[s.presetText, Number(amountInr) === v && s.presetTextActive]}>{fmtINR(v)}</Text>
            </Pressable>
          ))}
          {data.balance_inr >= data.withdraw_threshold_inr && (
            <Pressable
              onPress={() => setAmountInr(String(Math.floor(data.balance_inr)))}
              style={[s.preset, { borderColor: '#A78BFA66' }]}
            >
              <Text style={[s.presetText, { color: '#A78BFA' }]}>Max</Text>
            </Pressable>
          )}
        </View>

        <Text style={s.fieldLabel}>Amount (₹)</Text>
        <View style={s.inputWrap}>
          <Text style={s.inputPrefix}>₹</Text>
          <TextInput
            value={amountInr}
            onChangeText={(v) => setAmountInr(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="100"
            placeholderTextColor={C.text3}
            style={s.input}
          />
        </View>

        {/* Conversion preview */}
        <View style={s.previewBox}>
          <View style={s.previewRow}>
            <Text style={s.previewLabel}>You receive</Text>
            <Text style={s.previewValue}>{fmtINR(inr)}</Text>
          </View>
          <View style={s.previewRow}>
            <Text style={s.previewLabel}>Credits debited ({data.credits_per_inr}/₹)</Text>
            <Text style={s.previewValue}>−{fmtCredits(credits)} cr</Text>
          </View>
          <View style={[s.previewRow, s.previewTotalRow]}>
            <Text style={s.previewTotalLabel}>Balance after</Text>
            <Text style={s.previewTotalValue}>{fmtCredits(Math.max(0, data.balance_credits - credits))} cr</Text>
          </View>
        </View>

        {/* Method */}
        <Text style={s.fieldLabel}>Payout method</Text>
        <View style={s.methodRow}>
          {(['upi', 'bank'] as const).map((m) => {
            const active = method === m;
            const icon: IconName = m === 'upi' ? 'qrcode' : 'bank';
            const label = m === 'upi' ? 'UPI' : 'Bank Account';
            return (
              <Pressable key={m} onPress={() => setMethod(m)} style={[s.methodChip, active && s.methodChipActive]}>
                <MaterialCommunityIcons name={icon} size={16} color={active ? '#fff' : C.text2} />
                <Text style={[s.methodText, active && { color: '#fff' }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.fieldLabel}>{method === 'upi' ? 'UPI ID' : 'Account number'}</Text>
        <TextInput
          value={target}
          onChangeText={setTarget}
          placeholder={method === 'upi' ? 'yourname@upi' : 'XXXX XXXX 1234'}
          placeholderTextColor={C.text3}
          style={[s.input, { paddingLeft: 14 }]}
        />

        <Pressable
          style={[s.primaryBtn, { backgroundColor: '#F472B6', opacity: submitting || !enough ? 0.55 : 1 }]}
          onPress={startSubmit}
          disabled={submitting || !enough}
        >
          {submitting ? <ActivityIndicator color="#3F0518" /> : <>
            <MaterialCommunityIcons
              name={requiresOtp ? 'shield-lock' : 'bank-transfer-out'}
              size={16} color="#3F0518" />
            <Text style={[s.primaryBtnText, { color: '#3F0518' }]}>
              {requiresOtp ? 'Confirm withdrawal' : 'Withdraw '} {fmtINR(inr)}
            </Text>
          </>}
        </Pressable>

        {result?.ok && (
          <View style={[s.resultBox, { borderColor: '#F472B666', backgroundColor: 'rgba(244,114,182,0.08)' }]}>
            <MaterialCommunityIcons name="check-decagram" size={18} color="#F472B6" />
            <View style={{ flex: 1 }}>
              <Text style={s.resultTitle}>Withdrawal initiated</Text>
              <Text style={s.resultSub}>{fmtINR(result.amount_inr)} → {result.method?.toUpperCase()} · ETA {result.eta}</Text>
            </View>
          </View>
        )}
        {result && !result.ok && (
          <View style={[s.resultBox, { borderColor: '#F8717166', backgroundColor: 'rgba(248,113,113,0.08)' }]}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#F87171" />
            <Text style={[s.resultSub, { color: '#FCA5A5', flex: 1 }]}>{result.error || 'Failed'}</Text>
          </View>
        )}

        <Text style={s.smallNote}>
          Mock cash-out — settles in 1–2 business days. Real bank/UPI integration to be wired with payment provider.
        </Text>
      </View>

      {/* Review modal (₹500 fast-track) */}
      {otpStep === 'review' && (
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Confirm Withdrawal</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              <ReviewRow label="Amount" value={fmtINR(inr)} bold />
              <ReviewRow label="To" value={target || (method === 'upi' ? '—' : 'Saved bank account')} />
              <ReviewRow label="Mode" value={method === 'upi' ? 'UPI · Instant' : 'Bank · IMPS'} />
              <ReviewRow label="Fee" value="₹0" tint="#6EE7B7" />
              <View style={{ height: 1, backgroundColor: '#2A2636', marginVertical: 6 }} />
              <ReviewRow label="You'll receive" value={fmtINR(inr)} bold tint="#fff" />
              {requiresOtp && (
                <View style={s.otpHintBox}>
                  <MaterialCommunityIcons name="shield-lock" size={13} color="#FCD34D" />
                  <Text style={s.otpHintText}>
                    Amounts above ₹500 require an OTP for security
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Pressable onPress={() => setOtpStep(null)} style={s.modalCancelBtn}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirmReview} style={s.modalConfirmBtn}>
                <Text style={s.modalConfirmText}>
                  {requiresOtp ? 'Send OTP' : 'Confirm withdrawal'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* OTP modal */}
      {otpStep === 'otp' && (
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.otpIconCircle}>
              <MaterialCommunityIcons name="shield-lock" size={22} color="#FCD34D" />
            </View>
            <Text style={s.modalTitle}>Enter OTP</Text>
            <Text style={s.modalBody}>
              We sent a 6-digit code to your registered mobile (•••• 1234).{'\n'}
              <Text style={{ color: '#FCD34D' }}>Demo OTP: 123456</Text>
            </Text>
            <TextInput
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="numeric"
              placeholder="• • • • • •"
              placeholderTextColor="#7B7593"
              style={s.otpInput}
              autoFocus
              maxLength={6}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between',
                            alignItems: 'center', marginTop: 6 }}>
              <Pressable
                onPress={() => otpResendIn === 0 && setOtpResendIn(30)}
                disabled={otpResendIn > 0}>
                <Text style={[s.resendText,
                  otpResendIn > 0 && { color: '#7B7593' }]}>
                  {otpResendIn > 0
                    ? `Resend in ${otpResendIn}s`
                    : 'Resend OTP'}
                </Text>
              </Pressable>
              {otp.length === 6 && otp !== '123456' && (
                <Text style={s.otpError}>Wrong OTP</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable onPress={() => setOtpStep(null)} style={s.modalCancelBtn}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleOtpSubmit}
                disabled={otp.length !== 6 || submitting}
                style={[s.modalConfirmBtn,
                  (otp.length !== 6 || submitting) && { opacity: 0.5 }]}>
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalConfirmText}>Verify & Withdraw</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function ReviewRow({ label, value, bold, tint }: { label: string; value: string; bold?: boolean; tint?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={s.reviewLabel}>{label}</Text>
      <Text style={[s.reviewValue,
        bold && { fontFamily: 'DMSans_900Black', fontSize: 15 },
        tint && { color: tint }]}>{value}</Text>
    </View>
  );
}

// ─── Credits / Earn tab ──────────────────────────────────────────────────
function CreditsTab({ data, onSeedDemo, seeding }: { data: Summary; onSeedDemo: () => void; seeding: boolean }) {
  // Group earning rules by category
  const grouped: Record<string, EarningRule[]> = {};
  for (const r of data.earning_rules) {
    const cat = r.category || 'other';
    (grouped[cat] = grouped[cat] || []).push(r);
  }
  const earnedMap: Record<string, ActivityItem> = {};
  for (const a of data.activity_breakdown) earnedMap[a.activity_type] = a;

  // Tier progress (gold-themed) — use level info
  const lvl = data.level;
  const balance = data.balance_credits;
  const nextAt = lvl?.next_level_at || (balance + (lvl?.credits_to_next || 100));
  const nextName = lvl?.next_level_name || 'Silver';
  const pct = Math.max(0, Math.min(100, lvl?.progress_pct || 0));
  const toNext = lvl?.credits_to_next || (nextAt - balance);

  return (
    <View style={{ gap: 16 }}>
      {/* SA Credits gold progress card (matches master spec) */}
      <View style={s.creditsProgressCard}>
        <View style={s.creditsHeaderRow}>
          <View style={s.creditsCoinCircle}>
            <MaterialCommunityIcons name="star-four-points" size={22} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.creditsTitle}>SA Credits</Text>
            <Text style={s.creditsSub}>Earn & redeem for perks</Text>
          </View>
          <View style={s.tierBadge}>
            <MaterialCommunityIcons name={(lvl?.icon as IconName) || 'medal'}
              size={12} color={lvl?.color || '#FCD34D'} />
            <Text style={[s.tierBadgeText, { color: lvl?.color || '#FCD34D' }]}>
              {lvl?.name || 'Bronze'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
          <Text style={s.creditsBig}>{balance.toLocaleString()}</Text>
          <Text style={s.creditsUnit}>credits</Text>
        </View>

        <View style={s.creditsBarBg}>
          <LinearGradient
            colors={['#F59E0B', '#F97316']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { width: `${pct}%`, borderRadius: 999 } as any]}
          />
        </View>
        <Text style={s.creditsProgressText}>
          {toNext > 0 ? `${toNext} more to ${nextName} status` : '🎉 Top tier reached'}
        </Text>
      </View>

      {/* Credit Earning Optimizer CTA */}
      <Pressable
        onPress={() => {
          if (Platform.OS === 'web') {
            window.dispatchEvent(new CustomEvent('open-money-coach',
              { detail: { cmd: '/credit-plan' } }));
          }
        }}
        style={s.optimizerCard}>
        <View style={s.optimizerSparkle}>
          <MaterialCommunityIcons name="auto-fix" size={18} color="#F59E0B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.optimizerTitle}>Credit Earning Optimizer</Text>
          <Text style={s.optimizerSub}>
            {toNext > 0
              ? `${toNext} credits to ${nextName} · I'll find the fastest path`
              : 'Optimize for next reward redemptions'}
          </Text>
        </View>
        <View style={s.optimizerCta}>
          <MaterialCommunityIcons name="star-four-points" size={12} color="#fff" />
          <Text style={s.optimizerCtaText}>Get My Plan</Text>
        </View>
      </Pressable>

      {/* Redeem catalog */}
      <RedeemPanel balance={balance} />

      {/* Earnings summary card */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <MaterialCommunityIcons name="star-four-points" size={16} color="#FCD34D" />
          <Text style={s.sectionTitle}>How you earn — {roleLabel(data.role)}</Text>
          {data.lifetime_earned <= 0 && (
            <Pressable onPress={onSeedDemo} disabled={seeding} style={[s.seedBtn, { marginLeft: 'auto' }]}>
              {seeding ? <ActivityIndicator color="#fff" size="small" /> : <>
                <MaterialCommunityIcons name="auto-fix" size={12} color="#fff" />
                <Text style={s.seedBtnText}>Seed demo</Text>
              </>}
            </Pressable>
          )}
        </View>

        <Text style={s.helperText}>
          Each action you take in the app earns you credits. {data.credits_per_inr} credits = ₹1.
        </Text>
      </View>

      {/* Rules grouped by category */}
      {Object.keys(grouped).map((cat) => {
        const meta = CATEGORY_META[cat] || CATEGORY_META.other;
        return (
          <View key={cat} style={s.section}>
            <View style={s.sectionHead}>
              <MaterialCommunityIcons name={meta.icon} size={16} color={meta.color} />
              <Text style={s.sectionTitle}>{meta.label}</Text>
            </View>
            <View style={{ gap: 8 }}>
              {grouped[cat].map((r) => {
                const earned = earnedMap[r.activity_type];
                const earnedCredits = earned?.credits || 0;
                return (
                  <View key={r.activity_type} style={s.ruleRow}>
                    <View style={[s.actIcon, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
                      <MaterialCommunityIcons name={r.icon} size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.ruleLabel}>{r.label}</Text>
                      <Text style={s.ruleSub}>
                        {r.once
                          ? 'One-time'
                          : r.max_per_day
                            ? `Up to ${r.max_per_day}/day`
                            : 'Unlimited'}
                        {earned ? ` · earned ×${earned.count}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.ruleCredits, { color: meta.color }]}>+{fmtCredits(r.credits)}</Text>
                      {earnedCredits > 0 && (
                        <Text style={s.ruleEarned}>{fmtCredits(earnedCredits)} earned</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ─── Redeem Panel ──────────────────────────────────────────────────── */
type Reward = { id: string; title: string; desc: string; cost: number;
                tone: string; hot: boolean };
const TONE_COLORS: Record<string, string> = {
  teal: '#2DD4BF', indigo: '#A5B4FC', orange: '#FB923C',
  green: '#6EE7B7', gold: '#FCD34D', pink: '#F9A8D4',
};

function RedeemPanel({ balance }: { balance: number }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<Reward | null>(null);
  const [success, setSuccess] = useState<{ code: string; reward: Reward } | null>(null);

  useEffect(() => {
    request<{ rewards: Reward[] }>('/wallet/rewards')
      .then((r) => setRewards(r.rewards))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onConfirm = async () => {
    if (!confirmFor) return;
    setRedeeming(confirmFor.id);
    try {
      const r = await request<{ code: string; reward: Reward }>(
        '/wallet/redeem',
        { method: 'POST', body: { reward_id: confirmFor.id } });
      setSuccess({ code: r.code, reward: r.reward });
      setConfirmFor(null);
    } catch (e: any) {
      // surface inline
    } finally { setRedeeming(null); }
  };

  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <MaterialCommunityIcons name="gift-outline" size={16} color="#F9A8D4" />
        <Text style={s.sectionTitle}>Redeem Credits</Text>
        <View style={[s.balPill, { marginLeft: 'auto' }]}>
          <Text style={s.balPillText}>{balance.toLocaleString()} cr available</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#A78BFA" />
      ) : (
        <View style={{ gap: 8 }}>
          {rewards.map((rw) => {
            const tint = TONE_COLORS[rw.tone] || '#A78BFA';
            const canRedeem = balance >= rw.cost;
            return (
              <Pressable key={rw.id}
                onPress={() => canRedeem && setConfirmFor(rw)}
                style={[s.rewardRow, !canRedeem && { opacity: 0.55 }]}>
                <View style={[s.rewardIcon,
                  { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
                  <MaterialCommunityIcons name="gift" size={16} color={tint} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.rewardTitle}>{rw.title}</Text>
                    {rw.hot && (
                      <View style={s.hotPill}>
                        <Text style={s.hotPillText}>HOT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.rewardDesc}>{rw.desc}</Text>
                </View>
                <View style={[s.costPill,
                  { backgroundColor: tint + '22' }]}>
                  <Text style={[s.costPillText, { color: tint }]}>
                    {rw.cost}cr
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Confirm modal */}
      {confirmFor && (
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Redeem {confirmFor.cost} credits?</Text>
            <Text style={s.modalBody}>
              You'll redeem <Text style={{ color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold' }}>
                {confirmFor.title}</Text>.
              {' '}Remaining balance: {(balance - confirmFor.cost).toLocaleString()} credits.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable onPress={() => setConfirmFor(null)} style={s.modalCancelBtn}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onConfirm} disabled={!!redeeming}
                style={[s.modalConfirmBtn, !!redeeming && { opacity: 0.6 }]}>
                {redeeming
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalConfirmText}>Confirm redeem</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Success modal */}
      {success && (
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, { borderColor: '#10B98166' }]}>
            <View style={s.successCircle}>
              <MaterialCommunityIcons name="check" size={28} color="#fff" />
            </View>
            <Text style={s.modalTitle}>Redeemed! 🎉</Text>
            <Text style={s.modalBody}>
              Your code for <Text style={{ color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold' }}>
                {success.reward.title}</Text>:
            </Text>
            <View style={s.codeBox}>
              <Text style={s.codeText}>{success.code}</Text>
            </View>
            <Pressable onPress={() => setSuccess(null)} style={s.modalConfirmBtn}>
              <Text style={s.modalConfirmText}>Done</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function roleLabel(role: string): string {
  return ({
    student: 'Student', mentor: 'Mentor', alumni: 'Alumni', college: 'College', admin: 'Admin',
  } as any)[role] || role;
}

// ─── History tab ─────────────────────────────────────────────────────────
function HistoryTab({ data }: { data: Summary }) {
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Txn | null>(null);

  // Derive category options from history
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    (data.history || []).forEach((t) => {
      const c = (t.metadata?.category || t.metadata?.kind || 'other') as string;
      seen.add(c);
    });
    return ['all', ...Array.from(seen).sort()];
  }, [data.history]);

  const items = useMemo(() => {
    return (data.history || []).filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      const cat = (t.metadata?.category || t.metadata?.kind || 'other') as string;
      if (categoryFilter !== 'all' && cat !== categoryFilter) return false;
      if (search.trim()) {
        const blob = `${t.reason} ${cat}`.toLowerCase();
        if (!blob.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [data.history, filter, categoryFilter, search]);

  const filtersActive = filter !== 'all' || categoryFilter !== 'all' || !!search.trim();

  return (
    <View style={{ gap: 16 }}>
      <View style={s.section}>
        <View style={s.sectionHead}>
          <MaterialCommunityIcons name="history" size={16} color={C.accent} />
          <Text style={s.sectionTitle}>Transaction history</Text>
          <View style={[s.balPill, { marginLeft: 'auto' }]}>
            <Text style={s.balPillText}>{items.length} txn{items.length === 1 ? '' : 's'}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={s.histSearchBox}>
          <MaterialCommunityIcons name="magnify" size={15} color={C.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search description or category…"
            placeholderTextColor={C.text3}
            style={s.histSearchInput}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={14} color={C.text3} />
            </Pressable>
          )}
        </View>

        {/* Type filter */}
        <View style={s.filterRow}>
          {(['all', 'credit', 'debit'] as const).map((f) => {
            const active = filter === f;
            return (
              <Pressable key={f} onPress={() => setFilter(f)} style={[s.filterChip, active && s.filterChipActive]}>
                <Text style={[s.filterText, active && s.filterTextActive]}>
                  {f === 'all' ? 'All types' : f === 'credit' ? '+ Credits' : '− Debits'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Category filter — horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingRight: 12 }}>
          {categoryOptions.map((c) => {
            const active = categoryFilter === c;
            const meta = CATEGORY_META[c] || CATEGORY_META.other;
            return (
              <Pressable key={c} onPress={() => setCategoryFilter(c)}
                style={[s.histCatChip, active && {
                  backgroundColor: meta.color, borderColor: meta.color }]}>
                {c !== 'all' && (
                  <MaterialCommunityIcons name={meta.icon} size={11}
                    color={active ? '#fff' : meta.color} />
                )}
                <Text style={[s.histCatText, active && { color: '#fff' }]}>
                  {c === 'all' ? 'All sources' : meta.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active chips */}
        {filtersActive && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {filter !== 'all' && (
              <Pressable onPress={() => setFilter('all')} style={s.removableChip}>
                <Text style={s.removableChipText}>
                  Type: {filter === 'credit' ? 'Credits' : 'Debits'}
                </Text>
                <MaterialCommunityIcons name="close" size={11} color="#C4B5FD" />
              </Pressable>
            )}
            {categoryFilter !== 'all' && (
              <Pressable onPress={() => setCategoryFilter('all')} style={s.removableChip}>
                <Text style={s.removableChipText}>Source: {categoryFilter}</Text>
                <MaterialCommunityIcons name="close" size={11} color="#C4B5FD" />
              </Pressable>
            )}
            {!!search.trim() && (
              <Pressable onPress={() => setSearch('')} style={s.removableChip}>
                <Text style={s.removableChipText}>"{search.trim()}"</Text>
                <MaterialCommunityIcons name="close" size={11} color="#C4B5FD" />
              </Pressable>
            )}
            <Pressable
              onPress={() => { setFilter('all'); setCategoryFilter('all'); setSearch(''); }}
              style={[s.removableChip, { backgroundColor: 'rgba(255,255,255,0.04)',
                                          borderColor: '#2A2636' }]}>
              <Text style={[s.removableChipText, { color: C.text2 }]}>Clear all</Text>
            </Pressable>
          </View>
        )}

        {items.length === 0 ? (
          <Text style={s.emptyText}>No transactions match these filters.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {items.map((t) => (
              <Pressable key={t.id} onPress={() => setDetail(t)}>
                <TxnRow t={t} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Detail drawer (in-page) */}
      {detail && <TxnDetailDrawer txn={detail} onClose={() => setDetail(null)} />}
    </View>
  );
}

function TxnDetailDrawer({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  const isCredit = txn.type === 'credit';
  const meta = txn.metadata || {};
  const tint = isCredit ? '#34D399' : '#F87171';
  return (
    <View style={s.drawerBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={s.drawerPanel}>
        <View style={s.drawerHeader}>
          <Text style={s.drawerTitle}>Transaction details</Text>
          <Pressable onPress={onClose} style={s.modalCancelBtn}>
            <MaterialCommunityIcons name="close" size={16} color={C.text2} />
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 14 }}>
          <View style={[s.txnHero, { backgroundColor: tint + '14',
                                      borderColor: tint + '40' }]}>
            <Text style={[s.txnHeroAmount, { color: tint }]}>
              {isCredit ? '+' : '−'}{fmtCredits(txn.amount)} cr
            </Text>
            <Text style={s.txnHeroReason}>{txn.reason}</Text>
            <Text style={s.txnHeroTime}>{relTime(txn.ts)}</Text>
          </View>
          <View style={{ gap: 10 }}>
            <DetailRow label="Type" value={isCredit ? 'Credit (incoming)' : 'Debit (outgoing)'} />
            <DetailRow label="Category" value={meta.category || meta.kind || 'other'} />
            <DetailRow label="Balance after" value={`${fmtCredits(txn.balance_after)} cr`} />
            {meta.related_module && <DetailRow label="Source module" value={meta.related_module} />}
            {meta.external_ref && <DetailRow label="Reference" value={String(meta.external_ref)} />}
            <DetailRow label="Transaction ID" value={txn.id} />
          </View>
          <Pressable style={s.receiptBtn}
            onPress={() => Platform.OS === 'web' && window.print && window.print()}>
            <MaterialCommunityIcons name="receipt" size={14} color="#A78BFA" />
            <Text style={s.receiptBtnText}>Download receipt (PDF)</Text>
          </Pressable>
          <Pressable style={[s.receiptBtn, { backgroundColor: 'rgba(248,113,113,0.10)',
                                              borderColor: 'rgba(248,113,113,0.30)' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#FCA5A5" />
            <Text style={[s.receiptBtnText, { color: '#FCA5A5' }]}>Report issue</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 11 }}>
        {label}
      </Text>
      <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12, maxWidth: '60%' }}
        numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function TxnRow({ t }: { t: Txn }) {
  const isCredit = t.type === 'credit';
  const meta = t.metadata || {};
  const icon: IconName = meta.kind === 'topup'
    ? 'plus-circle'
    : meta.kind === 'withdraw'
      ? 'cash-fast'
      : (meta.icon as IconName) || (isCredit ? 'arrow-down-bold-circle' : 'arrow-up-bold-circle');
  const tint = isCredit ? '#34D399' : '#F87171';
  return (
    <View style={s.txnRow}>
      <View style={[s.actIcon, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
        <MaterialCommunityIcons name={icon} size={16} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.txnReason} numberOfLines={1}>{t.reason}</Text>
        <Text style={s.txnMeta}>{relTime(t.ts)} · balance {fmtCredits(t.balance_after)}</Text>
      </View>
      <Text style={[s.txnAmount, { color: tint }]}>{isCredit ? '+' : '−'}{fmtCredits(t.amount)}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  loaderBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 14 },
  loaderText: { color: C.text2, fontSize: 13 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.40)', borderWidth: 1,
  },
  errorText: { color: '#FCA5A5', fontSize: 13, flex: 1 },

  // Hero card
  heroCard: {
    borderRadius: 22,
    padding: 22,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    gap: 18,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroLabel: { color: 'rgba(255,255,255,0.70)', fontSize: 11, letterSpacing: 1.4, fontWeight: '700' },
  heroBalance: { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  heroInr: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.60)', fontSize: 11.5, marginTop: 4 },
  levelBadge: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderColor: 'rgba(255,255,255,0.20)', borderWidth: 1,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 2, minWidth: 92,
  },
  levelName: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 },
  levelTier: { color: 'rgba(255,255,255,0.65)', fontSize: 10 },

  heroProgressWrap: { gap: 4 },
  heroProgressLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 11.5 },
  heroProgressPct: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  heroProgressTrack: {
    height: 8, borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.30)',
    overflow: 'hidden',
  },
  heroProgressFill: { height: '100%', backgroundColor: '#FCD34D' },

  heroStatsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  heroStat: {
    flex: 1, minWidth: 130,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
  },
  heroStatIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  heroStatLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10.5, letterSpacing: 0.6 },
  heroStatValue: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 1 },

  heroSeed: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderColor: 'rgba(255,255,255,0.20)', borderWidth: 1,
    paddingVertical: 10, borderRadius: 12,
  },
  heroSeedText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },

  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(252,211,77,0.18)',
    borderColor: 'rgba(252,211,77,0.45)', borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  heroPillText: { color: '#FCD34D', fontSize: 11.5, fontWeight: '700' },

  // Tabs
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: C.border, borderWidth: 1,
  },
  tabActive: {
    backgroundColor: 'rgba(124,58,237,0.30)',
    borderColor: 'rgba(167,139,250,0.55)',
  },
  tabText: { color: C.text2, fontSize: 12.5, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  // Quick actions
  qaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  qa: {
    flex: 1, minWidth: 130,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 14,
    backgroundColor: C.card, borderWidth: 1,
  },
  qaIcon: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  qaLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Sections
  section: {
    backgroundColor: C.card,
    borderColor: C.border, borderWidth: 1,
    borderRadius: 18, padding: 16, gap: 12,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#fff', fontSize: 14.5, fontWeight: '700' },
  emptyText: { color: C.text3, fontSize: 12.5, fontStyle: 'italic' },
  helperText: { color: C.text2, fontSize: 12.5, lineHeight: 18 },
  linkText: { color: C.accent, fontSize: 12, fontWeight: '700' },

  // Categories
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  catLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  catCredits: { color: C.text2, fontSize: 12, fontWeight: '700' },
  catTrack: { marginTop: 6, height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  catFill: { height: '100%' },

  // Activities
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  actIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: C.border,
  },
  actLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actMeta: { color: C.text3, fontSize: 11, marginTop: 2 },
  actCredits: { color: '#FCD34D', fontSize: 13, fontWeight: '700' },

  // Rules
  ruleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ruleLabel: { color: '#fff', fontSize: 13.5, fontWeight: '600' },
  ruleSub: { color: C.text3, fontSize: 11, marginTop: 2 },
  ruleCredits: { fontSize: 14, fontWeight: '800' },
  ruleEarned: { color: C.text3, fontSize: 10.5, marginTop: 1 },

  /* Verified pill on hero */
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1,
    marginTop: 8, alignSelf: 'flex-start' },
  verifiedPillText: { color: '#6EE7B7', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  /* Withdraw — review row */
  reviewLabel: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  reviewValue: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12.5 },

  /* OTP modal */
  otpHintBox: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: 'rgba(252,211,77,0.10)',
    borderColor: 'rgba(252,211,77,0.30)', borderWidth: 1, marginTop: 6 },
  otpHintText: { color: '#FCD34D', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },
  otpIconCircle: { width: 48, height: 48, borderRadius: 999,
    backgroundColor: 'rgba(252,211,77,0.16)',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 6 },
  otpInput: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: '#2A2636', borderWidth: 1,
    color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 22,
    textAlign: 'center', letterSpacing: 6, marginTop: 12,
    outlineWidth: 0 } as any,
  resendText: { color: '#A78BFA', fontFamily: 'DMSans_700Bold', fontSize: 11 },
  otpError: { color: '#FCA5A5', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  /* History — search box & category chips */
  histSearchBox: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: '#2A2636', borderWidth: 1 },
  histSearchInput: { flex: 1, color: '#fff', fontFamily: 'DMSans_600SemiBold',
    fontSize: 12, outlineWidth: 0 } as any,
  histCatChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: '#2A2636', borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  histCatText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11 },
  removableChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.16)',
    borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  removableChipText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  /* Detail drawer */
  drawerBackdrop: { ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,5,22,0.65)',
    zIndex: 9999, justifyContent: 'flex-end', alignItems: 'flex-end' },
  drawerPanel: { width: 460, maxWidth: '100%', height: '100%',
    backgroundColor: '#14121C', borderLeftWidth: 1, borderColor: '#2A2636' },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: '#2A2636' },
  drawerTitle: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 16, flex: 1 },
  txnHero: { padding: 18, borderRadius: 14, borderWidth: 1, gap: 4 },
  txnHeroAmount: { fontFamily: 'DMSans_900Black', fontSize: 28,
    ...({ fontVariantNumeric: 'tabular-nums' } as any) },
  txnHeroReason: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  txnHeroTime: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 10,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  receiptBtnText: { color: '#A78BFA', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },

  /* ─── Credits tab — Gold progress card ─────────────────────── */
  creditsProgressCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1,
    borderRadius: 20, padding: 22, gap: 6 },
  creditsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  creditsCoinCircle: { width: 44, height: 44, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.18)',
    alignItems: 'center', justifyContent: 'center' },
  creditsTitle: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 16 },
  creditsSub: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 11.5 },
  creditsBig: { color: '#F59E0B', fontFamily: 'DMSans_900Black',
    fontSize: 44, ...({ fontVariantNumeric: 'tabular-nums' } as any) },
  creditsUnit: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  creditsBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999, overflow: 'hidden', marginTop: 8 },
  creditsProgressText: { color: C.text2, fontFamily: 'DMSans_600SemiBold',
    fontSize: 11.5, marginTop: 6 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(252,211,77,0.12)',
    borderColor: 'rgba(252,211,77,0.30)', borderWidth: 1 },
  tierBadgeText: { fontFamily: 'DMSans_900Black', fontSize: 10.5 },

  /* Optimizer CTA */
  optimizerCard: { flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16,
    backgroundColor: '#14121C', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.30)',
    ...({ cursor: 'pointer' } as any) },
  optimizerSparkle: { width: 36, height: 36, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center', justifyContent: 'center' },
  optimizerTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  optimizerSub: { color: C.text2, fontFamily: 'DMSans_600SemiBold',
    fontSize: 11.5, marginTop: 2 },
  optimizerCta: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#F59E0B' },
  optimizerCtaText: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 11.5 },

  /* Redeem panel rows */
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: '#2A2636', borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  rewardIcon: { width: 36, height: 36, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center' },
  rewardTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  rewardDesc: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  hotPill: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    backgroundColor: '#EF4444' },
  hotPillText: { color: '#fff', fontFamily: 'DMSans_900Black',
    fontSize: 8.5, letterSpacing: 0.6 },
  costPill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  costPillText: { fontFamily: 'DMSans_900Black', fontSize: 11.5,
    ...({ fontVariantNumeric: 'tabular-nums' } as any) },
  balPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1 },
  balPillText: { color: '#FCD34D', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  /* Confirm/Success modals (in-page) */
  modalBackdrop: { ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,5,22,0.80)',
    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    padding: 20 },
  modalCard: { width: 380, maxWidth: '100%', backgroundColor: '#14121C',
    borderRadius: 16, padding: 22, gap: 6, borderWidth: 1,
    borderColor: '#2A2636' },
  modalTitle: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 16 },
  modalBody: { color: C.text2, fontFamily: 'DMSans_600SemiBold',
    fontSize: 12.5, lineHeight: 19, marginTop: 4 },
  modalCancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: '#2A2636', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
  modalCancelText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  modalConfirmBtn: { flex: 1, paddingVertical: 11, borderRadius: 999,
    backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
  modalConfirmText: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 12 },
  successCircle: { width: 56, height: 56, borderRadius: 999,
    backgroundColor: '#10B981', alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  codeBox: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: 'rgba(252,211,77,0.10)',
    borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1,
    marginVertical: 12 },
  codeText: { color: '#FCD34D', fontFamily: 'DMSans_900Black', fontSize: 18,
    textAlign: 'center', letterSpacing: 1.5 },

  seedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.20)',
    borderColor: 'rgba(167,139,250,0.45)', borderWidth: 1,
  },
  seedBtnText: { color: '#A78BFA', fontSize: 10.5, fontWeight: '700' },

  // Inputs
  fieldLabel: { color: C.text2, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderColor: C.border, borderWidth: 1, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    paddingHorizontal: 12,
  },
  inputPrefix: { color: C.text2, fontSize: 16, marginRight: 4 },
  input: {
    flex: 1, color: '#fff', fontSize: 16, fontWeight: '700',
    paddingVertical: 12,
    ...Platform.select({ web: { outlineWidth: 0 as any } as any, default: {} }),
  },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderColor: C.border, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  presetActive: {
    borderColor: 'rgba(167,139,250,0.55)',
    backgroundColor: 'rgba(124,58,237,0.30)',
  },
  presetText: { color: C.text2, fontSize: 12.5, fontWeight: '700' },
  presetTextActive: { color: '#fff' },

  previewBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14, padding: 14, gap: 8,
    borderColor: C.border, borderWidth: 1,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { color: C.text2, fontSize: 12.5 },
  previewValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  previewTotalRow: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 },
  previewTotalLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  previewTotalValue: { color: '#FCD34D', fontSize: 16, fontWeight: '800' },

  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
    borderColor: C.border, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  methodChipActive: {
    borderColor: 'rgba(167,139,250,0.55)',
    backgroundColor: 'rgba(124,58,237,0.30)',
  },
  methodText: { color: C.text2, fontSize: 12.5, fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '800' },

  resultBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12,
    borderWidth: 1, marginTop: 4,
  },
  resultTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  resultSub: { color: C.text2, fontSize: 11.5, marginTop: 2 },

  smallNote: { color: C.text3, fontSize: 10.5, fontStyle: 'italic', marginTop: 4 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  bannerOk: { backgroundColor: 'rgba(52,211,153,0.10)', borderColor: 'rgba(52,211,153,0.40)' },
  bannerWarn: { backgroundColor: 'rgba(252,211,77,0.10)', borderColor: 'rgba(252,211,77,0.40)' },
  bannerText: { color: '#fff', fontSize: 12, flex: 1 },

  // Filters & txns
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border, borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: 'rgba(124,58,237,0.30)',
    borderColor: 'rgba(167,139,250,0.55)',
  },
  filterText: { color: C.text2, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  txnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  txnReason: { color: '#fff', fontSize: 13, fontWeight: '600' },
  txnMeta: { color: C.text3, fontSize: 11, marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: '800' },
});
