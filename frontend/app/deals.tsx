// @ts-nocheck
/**
 * /deals — SA Member Deals (real-time + Tag Engine + AI accordions)
 *
 * Wired to:
 *   GET  /api/deals/all?category=&country=IN
 *   GET  /api/deals/stats              — AI Savings Advisor + Smart Bundle
 *   POST /api/deals/refresh            — bypass cache
 *   POST /api/deals/claim/{deal_id}    — +20 SA credits, max 3/day
 *   POST /api/deals/ai-generate        — Claude trending generator
 *
 * Theme-aware (light/dark) for crystal clear legibility.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
  Image, Linking, Modal, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { request, resolveImageUrl } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ─── Types ───────────────────────────────────────────────────────────────
type Tag =
  | 'HOT' | 'OFF_30' | 'STUDENT_VERIFIED' | 'INSTANT'
  | 'ENDING_SOON' | 'NEW' | 'TRENDING' | 'INDIA_EXCLUSIVE'
  | 'NO_EXPIRY' | 'BEST_VALUE';

type Deal = {
  deal_id: string;
  brand: string;
  provider: string;
  title: string;
  category: string;
  description: string;
  price_inr: number;
  price_unit: string;
  price_label: string;
  original_inr: number;
  original_label: string;
  discount_pct: number;
  discount_label: string;
  absolute_savings_inr: number;
  affiliate_url: string;
  code: string;
  logo_url?: string;
  accent: string;
  student_only: boolean;
  auto_apply: boolean;
  country: 'IN' | 'GLOBAL';
  available_globally: boolean;
  source: string;
  tags: Tag[];
};

type DealsResponse = {
  deals: Deal[];
  total_count: number;
  last_updated: string | null;
  sources: { name: string; status: string; deals: number }[];
  category: string;
  country: string;
};

type Stats = {
  total_deals: number;
  free_deals: number;
  hot_deals: number;
  total_savings_inr: number;
  yearly_savings_inr: number;
  top_category: { id: string; savings: number };
  best_roi: { brand: string; title: string; savings_inr: number } | null;
  smart_bundle: { deal_id: string; title: string; brand: string;
                  savings_inr: number; price_label: string;
                  logo_url?: string; accent: string }[];
  smart_bundle_total_savings_inr: number;
};

// ─── Tag styling ─────────────────────────────────────────────────────────
const TAG_META: Record<Tag, { label: string; icon: IconName; bg: string; fg: string; solid?: boolean }> = {
  HOT:              { label: 'HOT',              icon: 'fire',                  bg: '#EF4444',  fg: '#fff', solid: true },
  OFF_30:           { label: '30%+ OFF',         icon: 'sale',                  bg: '#F97316',  fg: '#fff', solid: true },
  STUDENT_VERIFIED: { label: 'Student Verified', icon: 'school',                bg: '#7C3AED',  fg: '#fff' },
  INSTANT:          { label: 'Instant',          icon: 'flash',                 bg: '#06B6D4',  fg: '#fff' },
  ENDING_SOON:      { label: 'Ending Soon',      icon: 'clock-alert-outline',   bg: '#F59E0B',  fg: '#1A1410' },
  NEW:              { label: 'New',              icon: 'sparkles',              bg: '#10B981',  fg: '#fff' },
  TRENDING:         { label: 'Trending',         icon: 'trending-up',           bg: '#EC4899',  fg: '#fff' },
  INDIA_EXCLUSIVE:  { label: 'India Exclusive',  icon: 'map-marker',            bg: '#6366F1',  fg: '#fff' },
  NO_EXPIRY:        { label: 'No Expiry',        icon: 'infinity',              bg: '#64748B',  fg: '#fff' },
  BEST_VALUE:       { label: 'Best Value',       icon: 'medal',                 bg: '#059669',  fg: '#fff' },
};

const CATEGORY_META: Record<string, { label: string; icon: IconName; color: string }> = {
  all:           { label: 'All',           icon: 'view-grid',                color: '#7C3AED' },
  tech:          { label: 'Tech & Tools',  icon: 'laptop',                   color: '#2563EB' },
  food:          { label: 'Food',          icon: 'food',                     color: '#EA580C' },
  learning:      { label: 'Learning',      icon: 'school',                   color: '#7C3AED' },
  entertainment: { label: 'Entertainment', icon: 'play-circle',              color: '#16A34A' },
  insurance:     { label: 'Insurance',     icon: 'shield-check',             color: '#DC2626' },
  transport:     { label: 'Transport',     icon: 'bus',                      color: '#16A34A' },
  travel:        { label: 'Travel',        icon: 'airplane',                 color: '#0284C7' },
  fashion:       { label: 'Fashion',       icon: 'tshirt-crew',              color: '#DB2777' },
  grocery:       { label: 'Grocery',       icon: 'basket',                   color: '#65A30D' },
};

const CATEGORY_ORDER = ['all', 'tech', 'food', 'learning', 'entertainment',
                        'insurance', 'transport', 'travel', 'fashion', 'grocery'];

// ─── Utils ───────────────────────────────────────────────────────────────
function fmtINR(n: number): string {
  if (!isFinite(n) || n === 0) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
function relTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return '—'; }
}

// ─── Component ───────────────────────────────────────────────────────────
export default function DealsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);

  const colors = useMemo(() => ({
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? 'rgba(255, 255, 255, 0.72)' : '#334155',
    text3: isDark ? 'rgba(255, 255, 255, 0.46)' : '#64748B',
    border: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
    card: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
    tabInactiveBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
    tabInactiveBorder: isDark ? 'rgba(255, 255, 255, 0.10)' : '#CBD5E1',
    tabInactiveText: isDark ? 'rgba(255, 255, 255, 0.75)' : '#475569',
    tabInactiveIcon: isDark ? 'rgba(255, 255, 255, 0.65)' : '#64748B',
    aiTrendBg: isDark ? 'rgba(167, 139, 250, 0.10)' : '#EDE9FE',
    aiTrendBorder: isDark ? 'rgba(167, 139, 250, 0.45)' : '#C4B5FD',
    aiTrendText: isDark ? '#A78BFA' : '#6D28D9',
    priceFree: isDark ? '#86EFAC' : '#059669',
    pricePaid: isDark ? '#FCD34D' : '#D97706',
    priceOrig: isDark ? 'rgba(255, 255, 255, 0.46)' : '#94A3B8',
    metricBg: isDark ? 'rgba(0, 0, 0, 0.20)' : '#F8FAFC',
    metricBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    modalBg: isDark ? '#1A1626' : '#FFFFFF',
    modalBorder: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
    modalSavingsBg: isDark ? 'rgba(0, 0, 0, 0.30)' : '#F8FAFC',
  }), [isDark]);

  useEffect(() => {
    if (!isEmbedded && initialized && user) {
      if (user.role === 'alumni') {
        router.replace('/alumni-portal?tab=deals' as any);
      } else if (user.role === 'student') {
        router.replace('/student-portal?tab=deals' as any);
      }
    }
  }, [isEmbedded, initialized, user, router]);

  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sources, setSources] = useState<{ name: string; status: string; deals: number }[]>([]);
  const [tab, setTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimDeal, setClaimDeal] = useState<Deal | null>(null);
  const [claimResult, setClaimResult] = useState<any | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);

  const load = useCallback(async (cat: string, opts?: { refresh?: boolean }) => {
    setError(null);
    try {
      const path = `/deals/all?category=${cat}&country=IN${opts?.refresh ? '&refresh=true' : ''}`;
      const [r, s] = await Promise.all([
        request<DealsResponse>(path),
        request<Stats>('/deals/stats').catch(() => null as any),
      ]);
      setDeals(r.deals || []);
      setLastUpdated(r.last_updated || null);
      setSources(r.sources || []);
      if (s) setStats(s);
    } catch (e: any) {
      setError(e?.message || 'Failed to load deals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  const onRefresh = () => { setRefreshing(true); load(tab, { refresh: true }); };

  const onAiTrending = async () => {
    setAiBusy(true);
    try {
      await request<any>('/deals/ai-generate', { method: 'POST', body: { refresh: false } });
      await load(tab, { refresh: true });
    } catch (e: any) {
      setError(e?.message || 'AI generator failed');
    } finally { setAiBusy(false); }
  };

  const openClaim = (d: Deal) => { setClaimDeal(d); setClaimResult(null); };
  const closeClaim = () => { setClaimDeal(null); setClaimResult(null); };

  const onClaimConfirm = async () => {
    if (!claimDeal) return;
    setClaimBusy(true);
    try {
      const r = await request<any>(`/deals/claim/${claimDeal.deal_id}`, { method: 'POST', body: {} });
      setClaimResult(r);
      // Open the affiliate URL in a new tab/external browser
      try {
        if (r?.affiliate_url) {
          if (Platform.OS === 'web') {
            (window as any).open(r.affiliate_url, '_blank', 'noopener,noreferrer');
          } else {
            await Linking.openURL(r.affiliate_url);
          }
        }
      } catch {}
    } catch (e: any) {
      setClaimResult({ ok: false, error: e?.message || 'Claim failed' });
    } finally { setClaimBusy(false); }
  };

  const hotDeals = useMemo(() => (deals || []).filter((d) => d.tags?.includes('HOT')), [deals]);
  const otherDeals = useMemo(() => (deals || []).filter((d) => !d.tags?.includes('HOT')), [deals]);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <FeaturePageShell
      title="Exclusive SA Member Deals"
      subtitle={`${deals?.length || 0} active deals · Verified for ${user?.full_name || 'You'} · SA-ID: ${user ? formatSAID(user) : '—'}`}
      heroEmoji="🎁"
      accent="#F59E0B"
      rightSlot={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={s.savePill}>
            <MaterialCommunityIcons name="star-four-points" size={12} color="#D97706" />
            <Text style={s.savePillText}>SA Exclusive</Text>
          </View>
          <Pressable style={s.refreshBtn} onPress={onRefresh} disabled={refreshing}>
            {refreshing ? <ActivityIndicator color="#fff" size="small" /> :
              <MaterialCommunityIcons name="refresh" size={14} color="#fff" />}
            <Text style={s.refreshText}>Refresh</Text>
          </Pressable>
        </View>
      }
    >
      {/* Last updated */}
      {lastUpdated && (
        <Text style={[s.lastUpdated, { color: colors.text3 }]}>
          Last updated {relTime(lastUpdated)} · Sources: {sources.length || 1}
        </Text>
      )}

      {error ? (
        <View style={s.errBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={s.errText}>{error}</Text>
        </View>
      ) : null}

      {/* AI Savings Advisor (amber) */}
      <Accordion
        open={advisorOpen}
        onToggle={() => setAdvisorOpen(!advisorOpen)}
        title="AI Savings Advisor — How much can you save?"
        icon="auto-fix"
        tint="#D97706"
        bg={isDark ? 'rgba(245,158,11,0.10)' : '#FFFBEB'}
        border={isDark ? 'rgba(245,158,11,0.40)' : '#FDE68A'}
      >
        {!stats ? (
          <ActivityIndicator color="#D97706" />
        ) : (
          <View style={{ gap: 12 }}>
            <View style={s.advisorRow}>
              <AdvisorMetric label="Estimated yearly savings" value={fmtINR(stats.yearly_savings_inr)} icon="cash-multiple" tint="#059669" isDark={isDark} colors={colors} />
              <AdvisorMetric label="Top category" value={CATEGORY_META[stats.top_category.id]?.label || stats.top_category.id} icon="trophy" tint="#D97706" isDark={isDark} colors={colors} />
              <AdvisorMetric label="Best ROI" value={stats.best_roi ? fmtINR(stats.best_roi.savings_inr) : '—'} icon="medal" tint="#7C3AED" isDark={isDark} colors={colors} />
            </View>
            {stats.best_roi && (
              <Text style={[s.advisorSummary, { color: colors.text2 }]}>
                You can save up to <Text style={{ color: '#D97706', fontWeight: '700' }}>{fmtINR(stats.total_savings_inr)}</Text> across{' '}
                <Text style={{ color: '#D97706', fontWeight: '700' }}>{stats.total_deals}</Text> active deals.
                Your biggest single saving: <Text style={{ color: '#D97706', fontWeight: '700' }}>{stats.best_roi.brand}</Text> — {stats.best_roi.title} ({fmtINR(stats.best_roi.savings_inr)}).
                Top category by savings: <Text style={{ color: '#D97706', fontWeight: '700' }}>{CATEGORY_META[stats.top_category.id]?.label || stats.top_category.id}</Text>.
              </Text>
            )}
          </View>
        )}
      </Accordion>

      {/* AI Smart Bundle (pink) */}
      <Accordion
        open={bundleOpen}
        onToggle={() => setBundleOpen(!bundleOpen)}
        title="AI Smart Bundle — Best deals combo for me"
        icon="cube-outline"
        tint="#DB2777"
        bg={isDark ? 'rgba(236,72,153,0.10)' : '#FDF2F8'}
        border={isDark ? 'rgba(236,72,153,0.40)' : '#FBCFE8'}
      >
        {!stats ? (
          <ActivityIndicator color="#DB2777" />
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={[s.bundleSummary, { color: colors.text2 }]}>
              These 4 deals together save you{' '}
              <Text style={{ color: isDark ? '#FBCFE8' : '#BE185D', fontWeight: '800' }}>{fmtINR(stats.smart_bundle_total_savings_inr)}</Text>.
            </Text>
            <View style={s.bundleGrid}>
              {stats.smart_bundle.map((b) => (
                <View
                  key={b.deal_id}
                  style={[
                    s.bundleItem,
                    {
                      backgroundColor: colors.metricBg,
                      borderColor: isDark ? b.accent + '55' : '#E2E8F0',
                    },
                  ]}
                >
                  {b.logo_url ? (
                    <Image source={{ uri: resolveImageUrl(b.logo_url) }} style={s.bundleLogo} resizeMode="contain" />
                  ) : (
                    <View style={[s.bundleLogoFallback, { backgroundColor: b.accent + '33' }]}>
                      <Text style={{ color: b.accent, fontSize: 14, fontWeight: '800' }}>{b.brand?.[0] || '?'}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.bundleBrand, { color: colors.text3 }]}>{b.brand}</Text>
                    <Text style={[s.bundleTitle, { color: colors.text }]} numberOfLines={1}>{b.title}</Text>
                    <Text style={[s.bundleSavings, { color: isDark ? '#FBCFE8' : '#DB2777' }]}>save {fmtINR(b.savings_inr)}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable style={s.claimAllBtn}>
              <MaterialCommunityIcons name="auto-fix" size={14} color="#FFFFFF" />
              <Text style={s.claimAllText}>Claim all 4</Text>
            </Pressable>
          </View>
        )}
      </Accordion>

      {/* AI Trending button */}
      <Pressable
        style={[
          s.aiTrendBtn,
          { backgroundColor: colors.aiTrendBg, borderColor: colors.aiTrendBorder },
        ]}
        onPress={onAiTrending}
        disabled={aiBusy}
      >
        {aiBusy ? <ActivityIndicator color={colors.aiTrendText} /> :
          <MaterialCommunityIcons name="auto-fix" size={14} color={colors.aiTrendText} />}
        <Text style={[s.aiTrendText, { color: colors.aiTrendText }]}>
          {aiBusy ? 'Generating…' : 'AI · Refresh trending hot deals (Claude)'}
        </Text>
      </Pressable>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {CATEGORY_ORDER.map((id) => {
          const meta = CATEGORY_META[id];
          const active = tab === id;
          return (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              style={[
                s.tab,
                {
                  backgroundColor: active ? meta.color + (isDark ? '22' : '15') : colors.tabInactiveBg,
                  borderColor: active ? meta.color + (isDark ? '66' : '55') : colors.tabInactiveBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={meta.icon}
                size={14}
                color={active ? meta.color : colors.tabInactiveIcon}
              />
              <Text
                style={[
                  s.tabText,
                  { color: active ? meta.color : colors.tabInactiveText },
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Loading */}
      {loading && !deals ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color="#7C3AED" size="large" />
          <Text style={{ color: colors.text2, marginTop: 8 }}>Loading deals…</Text>
        </View>
      ) : (
        <>
          {/* Hot Deals */}
          {hotDeals.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <MaterialCommunityIcons name="fire" size={18} color="#EF4444" />
                <Text style={[s.sectionTitle, { color: colors.text }]}>Hot Deals</Text>
                <Text style={[s.sectionSub, { color: colors.text3 }]}>Limited time — grab these before they expire!</Text>
              </View>
              <View style={s.grid}>
                {hotDeals.map((d) => <DealCard key={d.deal_id} d={d} onClaim={openClaim} isDark={isDark} colors={colors} />)}
              </View>
            </View>
          )}

          {/* All Deals */}
          {otherDeals.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <MaterialCommunityIcons name="view-grid" size={18} color="#7C3AED" />
                <Text style={[s.sectionTitle, { color: colors.text }]}>All Deals</Text>
                <Text style={[s.sectionSub, { color: colors.text3 }]}>Curated for SA members across {CATEGORY_META[tab]?.label || 'all'} categories</Text>
              </View>
              <View style={s.grid}>
                {otherDeals.map((d) => <DealCard key={d.deal_id} d={d} onClaim={openClaim} isDark={isDark} colors={colors} />)}
              </View>
            </View>
          )}

          {(!hotDeals.length && !otherDeals.length) && (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <MaterialCommunityIcons name="package-variant" size={32} color={colors.text3} />
              <Text style={{ color: colors.text3, marginTop: 8 }}>No deals in this category yet.</Text>
            </View>
          )}

          {/* Sources strip */}
          <View style={[s.sourcesStrip, { borderTopColor: colors.border }]}>
            <MaterialCommunityIcons name="api" size={12} color={colors.text3} />
            <Text style={[s.sourcesText, { color: colors.text3 }]}>
              Sourced from: {sources.map(s => s.name).join(' · ') || 'curated'} · Cache 60 min
            </Text>
          </View>
        </>
      )}

      {/* Claim Modal */}
      <Modal visible={!!claimDeal} animationType="fade" transparent onRequestClose={closeClaim}>
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, { backgroundColor: colors.modalBg, borderColor: colors.modalBorder }]}>
            {claimDeal && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {claimDeal.logo_url ? (
                    <Image source={{ uri: resolveImageUrl(claimDeal.logo_url) }} style={s.modalLogo} resizeMode="contain" />
                  ) : (
                    <View style={[s.modalLogoFallback, { backgroundColor: claimDeal.accent + '33' }]}>
                      <Text style={{ color: claimDeal.accent, fontSize: 18, fontWeight: '800' }}>{claimDeal.brand[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modalBrand, { color: colors.text3 }]}>{claimDeal.brand}</Text>
                    <Text style={[s.modalTitle, { color: colors.text }]}>{claimDeal.title}</Text>
                  </View>
                  <Pressable onPress={closeClaim} hitSlop={8}>
                    <MaterialCommunityIcons name="close" size={20} color={colors.text2} />
                  </Pressable>
                </View>

                <View style={[s.modalSavingsBox, { backgroundColor: colors.modalSavingsBg, borderColor: colors.border }]}>
                  <Text style={[s.modalSavingsLabel, { color: colors.text3 }]}>You save</Text>
                  <Text style={[s.modalSavingsValue, { color: claimDeal.accent }]}>
                    {fmtINR(claimDeal.absolute_savings_inr)}
                  </Text>
                  <Text style={[s.modalSavingsSub, { color: colors.text2 }]}>
                    {claimDeal.original_label} → {claimDeal.price_label} ({claimDeal.discount_label})
                  </Text>
                </View>

                {claimDeal.code ? (
                  <View style={[s.codeBox, { backgroundColor: isDark ? 'rgba(167,139,250,0.10)' : '#F5F3FF', borderColor: isDark ? 'rgba(167,139,250,0.45)' : '#C4B5FD' }]}>
                    <Text style={[s.codeLabel, { color: colors.text3 }]}>Code</Text>
                    <Text style={[s.codeValue, { color: isDark ? '#FFFFFF' : '#6D28D9' }]}>{claimDeal.code}</Text>
                    <MaterialCommunityIcons name="content-copy" size={14} color="#7C3AED" />
                  </View>
                ) : (
                  <Text style={[s.modalNote, { color: colors.text3 }]}>No code needed — discount applied automatically at checkout.</Text>
                )}

                {claimResult?.ok && (
                  <View style={[s.claimSuccess, { backgroundColor: isDark ? 'rgba(52,211,153,0.10)' : '#ECFDF5', borderColor: isDark ? 'rgba(52,211,153,0.45)' : '#A7F3D0' }]}>
                    <MaterialCommunityIcons name="check-decagram" size={16} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.claimSuccessTitle, { color: colors.text }]}>
                        {claimResult.credits_awarded > 0
                          ? `+${claimResult.credits_awarded} SA points earned!`
                          : 'Daily quota reached — redirecting'}
                      </Text>
                      <Text style={[s.claimSuccessSub, { color: colors.text2 }]}>
                        Today {claimResult.todays_claims || 0}/{claimResult.max_per_day || 3} claims used
                      </Text>
                    </View>
                  </View>
                )}
                {claimResult && !claimResult.ok && (
                  <View style={[s.claimSuccess, { backgroundColor: isDark ? 'rgba(248,113,113,0.10)' : '#FEF2F2', borderColor: isDark ? 'rgba(248,113,113,0.45)' : '#FECACA' }]}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={[s.claimSuccessSub, { color: '#DC2626' }]}>{claimResult.error}</Text>
                  </View>
                )}

                <Pressable
                  style={[s.modalCTA, { backgroundColor: claimDeal.accent }]}
                  disabled={claimBusy}
                  onPress={onClaimConfirm}
                >
                  {claimBusy ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <MaterialCommunityIcons name="open-in-new" size={14} color="#fff" />
                      <Text style={s.modalCTAText}>Continue to {claimDeal.brand}</Text>
                    </>
                  )}
                </Pressable>
                <Text style={[s.modalNote, { color: colors.text3 }]}>+20 SA points earned per claim · max 3 claims/day</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </FeaturePageShell>
  );
}

function formatSAID(user: any): string {
  const id = String(user?.id || user?._id || user?.user_id || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (!id) return '—';
  return `SA-26-${id.slice(0, 6).padStart(6, '0')}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────
function Accordion({ open, onToggle, title, icon, tint, bg, border, children }: {
  open: boolean; onToggle: () => void; title: string; icon: IconName;
  tint: string; bg: string; border: string; children: React.ReactNode;
}) {
  return (
    <View style={[s.accordion, { backgroundColor: bg, borderColor: border }]}>
      <Pressable onPress={onToggle} style={s.accordionHead}>
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
        <Text style={[s.accordionTitle, { color: tint }]}>{title}</Text>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18} color={tint}
          style={{ marginLeft: 'auto' }}
        />
      </Pressable>
      {open && <View style={s.accordionBody}>{children}</View>}
    </View>
  );
}

function AdvisorMetric({ label, value, icon, tint, isDark, colors }: { label: string; value: string; icon: IconName; tint: string; isDark: boolean; colors: any }) {
  return (
    <View style={[s.advisorMetric, { backgroundColor: colors.metricBg, borderColor: colors.metricBorder }]}>
      <MaterialCommunityIcons name={icon} size={14} color={tint} />
      <Text style={[s.advisorMetricLabel, { color: colors.text3 }]}>{label}</Text>
      <Text style={[s.advisorMetricValue, { color: tint }]}>{value}</Text>
    </View>
  );
}

function DealCard({ d, onClaim, isDark, colors }: { d: Deal; onClaim: (d: Deal) => void; isDark: boolean; colors: any }) {
  const visible = (d.tags || []).filter((t) => t !== 'HOT').slice(0, 3);
  const overflow = (d.tags || []).filter((t) => t !== 'HOT').length - visible.length;
  const isFree = d.price_inr === 0 || d.price_label?.toUpperCase().includes('FREE');

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: d.accent + (isDark ? '44' : '35') }]}>
      {/* Wrap top details in a flex: 1 view to push CTA to the bottom */}
      <View style={{ flex: 1, gap: 8 }}>
        {/* Top: Logo + title/brand + prices */}
        <View style={s.cardTop}>
          {/* Col 1: Logo */}
          <View style={[s.cardLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
            {d.logo_url ? (
              <Image source={{ uri: resolveImageUrl(d.logo_url) }} style={s.cardLogo} resizeMode="contain" />
            ) : (
              <View style={[s.cardLogoFallback, { backgroundColor: d.accent + '22' }]}>
                <Text style={{ color: d.accent, fontSize: 18, fontWeight: '800' }}>{d.brand[0]}</Text>
              </View>
            )}
          </View>

          {/* Col 2: Brand + Title */}
          <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
            <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>{d.title}</Text>
            <Text style={[s.cardBrand, { color: colors.text3 }]}>{d.brand}</Text>
          </View>

          {/* Col 3: Prices */}
          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text style={[s.cardPrice, { color: isFree ? (isDark ? '#86EFAC' : '#059669') : (isDark ? '#FCD34D' : '#D97706') }]}>
              {d.price_label}
            </Text>
            {d.original_inr > d.price_inr && (
              <Text style={[s.cardOrig, { color: colors.text3 }]}>{d.original_label}</Text>
            )}
            {d.discount_pct > 0 && (
              <Text style={[s.cardPct, { color: isDark ? '#FCD34D' : '#D97706' }]}>{d.discount_pct}% off</Text>
            )}
          </View>
        </View>

        {/* HOT badge */}
        {d.tags?.includes('HOT') && (
          <View style={s.hotChip}>
            <MaterialCommunityIcons name="fire" size={10} color="#fff" />
            <Text style={s.hotChipText}>HOT</Text>
          </View>
        )}

        {/* Description */}
        <Text style={[s.cardDesc, { color: colors.text2 }]} numberOfLines={2}>{d.description}</Text>

        {/* Tag pills */}
        {visible.length > 0 && (
          <View style={s.tagRow}>
            {visible.map((t) => <TagPill key={t} tag={t} isDark={isDark} />)}
            {overflow > 0 && (
              <View style={[s.overflowPill, { backgroundColor: colors.tabInactiveBg, borderColor: colors.border }]}>
                <Text style={[s.overflowText, { color: colors.text2 }]}>+{overflow}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* CTA */}
      <Pressable
        style={[s.cardCTA, { backgroundColor: '#5D2EE6', marginTop: 'auto' }]}
        onPress={() => onClaim(d)}
      >
        <Text style={s.cardCTAText}>Claim Deal</Text>
      </Pressable>
    </View>
  );
}

function TagPill({ tag, isDark }: { tag: Tag; isDark: boolean }) {
  const meta = TAG_META[tag];
  if (!meta) return null;
  const solid = meta.solid;
  return (
    <View style={[
      s.tagPill,
      solid
        ? { backgroundColor: meta.bg, borderColor: meta.bg }
        : { backgroundColor: meta.bg + (isDark ? '22' : '15'), borderColor: meta.bg + (isDark ? '66' : '35') },
    ]}>
      <MaterialCommunityIcons
        name={meta.icon}
        size={10}
        color={solid ? meta.fg : meta.bg}
      />
      <Text style={[s.tagText, { color: solid ? meta.fg : meta.bg }]}>{meta.label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  savePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.35)', borderWidth: 1,
  },
  savePillText: { color: '#D97706', fontSize: 10.5, fontWeight: '800' },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#7C3AED',
    borderWidth: 1, borderColor: '#7C3AED',
    ...({ cursor: 'pointer' } as any),
  },
  refreshText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  lastUpdated: { fontSize: 11, marginTop: -10 },

  errBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.40)', borderWidth: 1,
  },
  errText: { color: '#EF4444', fontSize: 12.5, flex: 1 },

  // Accordion
  accordion: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    ...({ cursor: 'pointer' } as any),
  },
  accordionTitle: { fontSize: 13.5, fontWeight: '700', flex: 1 },
  accordionBody: {
    paddingHorizontal: 16, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 14,
  },

  advisorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  advisorMetric: {
    flex: 1, minWidth: 130,
    padding: 12, borderRadius: 12,
    borderWidth: 1, gap: 4,
  },
  advisorMetricLabel: { fontSize: 10.5, marginTop: 2 },
  advisorMetricValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  advisorSummary: { fontSize: 12.5, lineHeight: 18 },

  bundleSummary: { fontSize: 13 },
  bundleGrid: { gap: 8 },
  bundleItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12,
    borderWidth: 1,
  },
  bundleLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff' },
  bundleLogoFallback: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  bundleBrand: { fontSize: 10.5 },
  bundleTitle: { fontSize: 13, fontWeight: '600' },
  bundleSavings: { fontSize: 12, fontWeight: '700' },
  claimAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#DB2777',
    paddingVertical: 10, borderRadius: 10,
    ...({ cursor: 'pointer' } as any),
  },
  claimAllText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },

  // AI trending button
  aiTrendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 11, borderRadius: 12,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  aiTrendText: { fontSize: 12.5, fontWeight: '700' },

  // Tabs
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  tabText: { fontSize: 12.5, fontWeight: '600' },

  // Sections
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionSub: { fontSize: 12, marginLeft: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  // Card
  card: {
    flexGrow: 1, flexBasis: 260, maxWidth: 340,
    padding: 14, borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)' as any,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, position: 'relative' },
  cardLogoWrap: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
  cardLogo: { width: 44, height: 44, backgroundColor: '#fff' },
  cardLogoFallback: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardPrice: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  cardOrig: { fontSize: 11, textDecorationLine: 'line-through' },
  cardPct: { fontSize: 11, fontWeight: '700' },
  hotChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    alignSelf: 'flex-start',
  },
  hotChipText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },

  cardTitle: { fontSize: 14.5, fontWeight: '800' },
  cardBrand: { fontSize: 11.5 },
  cardDesc: { fontSize: 12, lineHeight: 17 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: '700' },
  overflowPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    borderWidth: 1,
  },
  overflowText: { fontSize: 10, fontWeight: '700' },

  cardCTA: {
    paddingVertical: 11, borderRadius: 10,
    alignItems: 'center', marginTop: 6,
    ...({ cursor: 'pointer' } as any),
  },
  cardCTAText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  sourcesStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 16, paddingBottom: 8,
    borderTopWidth: 1,
  },
  sourcesText: { fontSize: 11 },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modalCard: {
    width: '100%', maxWidth: 460,
    borderRadius: 18, padding: 20, gap: 14,
    borderWidth: 1,
    boxShadow: '0 24px 60px rgba(0,0,0,0.25)' as any,
  },
  modalLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff' },
  modalLogoFallback: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBrand: { fontSize: 11 },
  modalTitle: { fontSize: 15, fontWeight: '700' },

  modalSavingsBox: {
    padding: 14, borderRadius: 12,
    alignItems: 'center', gap: 4,
    borderWidth: 1,
  },
  modalSavingsLabel: { fontSize: 11, letterSpacing: 0.5 },
  modalSavingsValue: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  modalSavingsSub: { fontSize: 12 },

  codeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, borderRadius: 10,
    borderWidth: 1, borderStyle: 'dashed',
  },
  codeLabel: { fontSize: 11 },
  codeValue: { fontSize: 14, fontWeight: '800', letterSpacing: 1, flex: 1 },

  modalNote: { fontSize: 11, fontStyle: 'italic' },

  claimSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10,
    borderWidth: 1,
  },
  claimSuccessTitle: { fontSize: 13, fontWeight: '700' },
  claimSuccessSub: { fontSize: 11.5, marginTop: 2 },

  modalCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: 12,
    ...({ cursor: 'pointer' } as any),
  },
  modalCTAText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
