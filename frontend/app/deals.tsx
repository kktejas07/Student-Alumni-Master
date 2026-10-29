// @ts-nocheck
/**
 * /deals — Deals & Offers (D2 light-theme redesign)
 *
 * Forces the light palette for this page only (#F8FAFC background, white
 * cards, #7C5CFC accent). Layout:
 *   1. Header "Deals & Offers" + "{count} deals · Updated {time}" + search + refresh
 *   2. AI bar — 3 compact pills: Savings Calculator / Smart Bundle / AI Deals
 *   3. Deal-type tabs (All | Student | Coupons | Cashback | Bank Offers | …)
 *   4. Category chips auto-populated from the deal set (NOT hardcoded)
 *   5. Bank card filter, visible when Bank Offers is active
 *   6. Responsive grid — 4-col desktop / 2-col tablet / 1-col phone
 *   7. Card: brand logo (fallback circle) + type badge + verification +
 *      prices + "Claim Deal"
 *   8. Phone bottom nav: Home · Career AI · Deals · Network · Courses
 *
 * API:
 *   GET  /api/deals/all?category=all&country=IN   (client-side filtering)
 *   GET  /api/deals/stats                          (AI advisor + smart bundle)
 *   POST /api/deals/claim/{deal_id}
 *   POST /api/deals/ai-generate
 *
 * Pure filtering logic lives in ./dealsFilters (unit-tested).
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator,
  Image, Linking, Modal, Platform, useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { request, resolveImageUrl } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';
import { ForceLightTheme } from '@/src/theme/ThemeContext';
import {
  DEAL_TYPE_TABS, DEAL_TYPE_META, BANK_CARDS,
  buildAutoCategories, filterDealsByType, filterDealsSearch,
  filterBankOffers, inferDealType, categoryLabel,
} from './dealsFilters';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Deal = {
  deal_id: string;
  brand: string;
  provider?: string;
  title: string;
  category?: string;
  description?: string;
  price_inr: number;
  price_unit?: string;
  price_label?: string;
  original_inr?: number;
  original_label?: string;
  discount_pct?: number;
  discount_label?: string;
  absolute_savings_inr?: number;
  affiliate_url?: string;
  code?: string;
  logo_url?: string;
  accent?: string;
  student_only?: boolean;
  auto_apply?: boolean;
  country?: string;
  available_globally?: boolean;
  source?: string;
  tags?: string[];
  deal_type?: string;
  bank_name?: string;
  card_type?: string;
  code_verified?: boolean;
  success_rate?: number;
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
  total_savings_inr: number;
  yearly_savings_inr: number;
  top_category: { id: string; savings: number };
  best_roi: { brand: string; title: string; savings_inr: number } | null;
  smart_bundle: { deal_id: string; title: string; brand: string;
                 savings_inr: number; price_label: string;
                 logo_url?: string; accent: string }[];
  smart_bundle_total_savings_inr: number;
};

// ─── Light palette (D2) ────────────────────────────────────────────────
const L = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  accent: '#7C5CFC',
  accentBg: '#F3EEFF',
  accentBorder: '#D6CCFA',
  border: '#E2E8F0',
  chipBg: '#FFFFFF',
  chipBorder: '#CBD5E1',
  priceFree: '#059669',
  pricePaid: '#D97706',
};

const TAG_META: Record<string, { label: string; icon: IconName; bg: string; fg: string; solid?: boolean }> = {
  HOT:              { label: 'HOT',              icon: 'fire',                  bg: '#EF4444', fg: '#fff', solid: true },
  OFF_30:           { label: '30%+ OFF',         icon: 'sale',                  bg: '#F97316', fg: '#fff', solid: true },
  STUDENT_VERIFIED: { label: 'Student Verified', icon: 'school',                bg: '#EDE9FE', fg: '#5B21B6' },
  INSTANT:          { label: 'Instant',          icon: 'flash',                 bg: '#CFFAFE', fg: '#0E7490' },
  ENDING_SOON:      { label: 'Ending Soon',      icon: 'clock-alert-outline',   bg: '#FEF3C7', fg: '#B45309' },
  NEW:              { label: 'New',              icon: 'sparkles',              bg: '#D1FAE5', fg: '#047857' },
  TRENDING:         { label: 'Trending',         icon: 'trending-up',           bg: '#FCE7F3', fg: '#BE185D' },
  INDIA_EXCLUSIVE:  { label: 'India Exclusive',  icon: 'map-marker',            bg: '#E0E7FF', fg: '#4338CA' },
  NO_EXPIRY:        { label: 'No Expiry',        icon: 'infinity',              bg: '#E2E8F0', fg: '#475569' },
  BEST_VALUE:       { label: 'Best Value',       icon: 'medal',                 bg: '#D1FAE5', fg: '#047857' },
};

// ─── Utils ─────────────────────────────────────────────────────────────
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

const BOTTOM_NAV: { icon: IconName; label: string; route: string; active?: boolean }[] = [
  { icon: 'home-variant',  label: 'Home',      route: '/platform' },
  { icon: 'brain',         label: 'Career AI', route: '/career-ai' },
  { icon: 'gift',          label: 'Deals',     route: '/deals', active: true },
  { icon: 'account-group', label: 'Network',   route: '/network' },
  { icon: 'school',        label: 'Courses',   route: '/explore-courses' },
];

// ─── Component ─────────────────────────────────────────────────────────
export default function DealsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);
  const { width } = useWindowDimensions();
  const isMobile = width > 0 && width < 640;
  const isDesktop = width >= 1024;
  const cols = isDesktop ? 4 : isMobile ? 1 : 2;

  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sources, setSources] = useState<{ name: string; status: string; deals: number }[]>([]);
  const [typeTab, setTypeTab] = useState<string>('all');
  const [catTab, setCatTab] = useState<string>('all');
  const [cardSel, setCardSel] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [aiPanel, setAiPanel] = useState<'calc' | 'bundle' | 'ai' | 'none'>('none');
  const [aiBusy, setAiBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimDeal, setClaimDeal] = useState<Deal | null>(null);
  const [claimResult, setClaimResult] = useState<any | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);

  useEffect(() => {
    if (!isEmbedded && initialized && user) {
      if (user.role === 'alumni') {
        router.replace('/alumni-portal?tab=deals' as any);
      } else if (user.role === 'student') {
        router.replace('/student-portal?tab=deals' as any);
      }
    }
  }, [isEmbedded, initialized, user, router]);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    setError(null);
    try {
      const path = `/deals/all?category=all&country=IN${opts?.refresh ? '&refresh=true' : ''}`;
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

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load({ refresh: true }); };

  const onAiTrending = async () => {
    setAiBusy(true);
    try {
      await request<any>('/deals/ai-generate', { method: 'POST', body: { refresh: false } });
      await load({ refresh: true });
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

  // ─── Derived, client-side pipeline: type → category → search → bank ──
  const allDeals = useMemo(() => deals || [], [deals]);

  const typeDeals = useMemo(
    () => filterDealsByType(allDeals, typeTab as any),
    [allDeals, typeTab],
  );

  const autoCats = useMemo(() => buildAutoCategories(typeDeals), [typeDeals]);

  const catDeals = useMemo(() => {
    if (catTab === 'all') return typeDeals;
    return typeDeals.filter((d) => (d.category || 'other') === catTab);
  }, [typeDeals, catTab]);

  const searched = useMemo(() => filterDealsSearch(catDeals, search), [catDeals, search]);

  const shown = useMemo(() => {
    if (typeTab !== 'bank_offer') return searched;
    const chosen = cardSel
      .map((k) => BANK_CARDS.find((c) => `${c.bank}|${c.name}` === k))
      .filter(Boolean) as any[];
    return filterBankOffers(searched, chosen);
  }, [typeTab, searched, cardSel]);

  const dealById = useMemo(() => new Map(allDeals.map((d) => [d.deal_id, d])), [allDeals]);

  const pickType = (id: string) => {
    setTypeTab(id);
    setCatTab('all');
    setCardSel([]);
  };

  const toggleCard = (k: string) =>
    setCardSel((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const bankGroups = useMemo(() => {
    const m: Record<string, { bank: string; name: string }[]> = {};
    for (const c of BANK_CARDS) (m[c.bank] = m[c.bank] || []).push(c);
    return Object.entries(m);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <ForceLightTheme>
      <FeaturePageShell
        title="Deals & Offers"
        subtitle={`${allDeals.length || 0} deals · Updated ${relTime(lastUpdated)}`}
        heroEmoji="🎁"
        accent="#7C5CFC"
        rightSlot={
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <TextInput
              placeholder="Search deals, brands, codes…"
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              style={s.searchInput}
            />
            <Pressable style={s.refreshBtn} onPress={onRefresh} disabled={refreshing}>
              {refreshing
                ? <ActivityIndicator color="#fff" size="small" />
                : <MaterialCommunityIcons name="refresh" size={14} color="#fff" />}
              <Text style={s.refreshText}>Refresh</Text>
            </Pressable>
          </View>
        }
      >
        <View style={s.panel}>
          {error ? (
            <View style={s.errBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={s.errText}>{error}</Text>
            </View>
          ) : null}

          {/* ── 2. AI bar — 3 compact pills ── */}
          <View style={s.aiBar}>
            <AiPill
              icon="calculator-variant" label="Savings Calculator"
              active={aiPanel === 'calc'}
              onPress={() => setAiPanel(aiPanel === 'calc' ? 'none' : 'calc')}
            />
            <AiPill
              icon="cube-outline" label="Smart Bundle"
              active={aiPanel === 'bundle'}
              onPress={() => setAiPanel(aiPanel === 'bundle' ? 'none' : 'bundle')}
            />
            <AiPill
              icon="auto-fix" label="AI Deals"
              active={aiPanel === 'ai'}
              busy={aiBusy}
              onPress={() => { setAiPanel(aiPanel === 'ai' ? 'none' : 'ai'); onAiTrending(); }}
            />
          </View>

          {aiPanel === 'calc' && (
            <View style={s.aiPanelBox}>
              {!stats ? (
                <ActivityIndicator color={L.accent} />
              ) : (
                <>
                  <View style={s.advisorRow}>
                    <AdvisorMetric label="Estimated yearly savings" value={fmtINR(stats.yearly_savings_inr)} icon="cash-multiple" />
                    <AdvisorMetric label="Top category" value={categoryLabel(stats.top_category?.id || 'other')} icon="trophy" />
                    <AdvisorMetric label="Best ROI" value={stats.best_roi ? fmtINR(stats.best_roi.savings_inr) : '—'} icon="medal" />
                  </View>
                  {stats.best_roi && (
                    <Text style={s.advisorSummary}>
                      You can save up to <Text style={{ color: L.accent, fontWeight: '700' }}>{fmtINR(stats.total_savings_inr)}</Text> across{' '}
                      <Text style={{ color: L.accent, fontWeight: '700' }}>{stats.total_deals}</Text> deals.
                      Best single save: <Text style={{ color: L.accent, fontWeight: '700' }}>{stats.best_roi.brand}</Text> — {stats.best_roi.title}.
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          {aiPanel === 'bundle' && (
            <View style={s.aiPanelBox}>
              {!stats ? (
                <ActivityIndicator color={L.accent} />
              ) : (
                <>
                  <Text style={s.advisorSummary}>
                    These {stats.smart_bundle?.length || 0} deals together save you{' '}
                    <Text style={{ color: L.accent, fontWeight: '800' }}>{fmtINR(stats.smart_bundle_total_savings_inr)}</Text>.
                  </Text>
                  <View style={s.bundleGrid}>
                    {(stats.smart_bundle || []).map((b: any) => (
                      <View key={b.deal_id} style={s.bundleItem}>
                        {b.logo_url ? (
                          <Image source={{ uri: resolveImageUrl(b.logo_url) }} style={s.bundleLogo} resizeMode="contain" />
                        ) : (
                          <View style={[s.bundleLogoFallback, { backgroundColor: (b.accent || L.accent) + '22' }]}>
                            <Text style={{ color: b.accent || L.accent, fontSize: 14, fontWeight: '800' }}>{b.brand?.[0] || '?'}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={s.bundleBrand}>{b.brand}</Text>
                          <Text style={s.bundleTitle} numberOfLines={1}>{b.title}</Text>
                          <Text style={s.bundleSavings}>save {fmtINR(b.savings_inr)}</Text>
                        </View>
                        <Pressable style={s.bundleClaimBtn} onPress={() => {
                          const d = dealById.get(b.deal_id);
                          if (d) openClaim(d);
                        }}>
                          <Text style={s.bundleClaimText}>Claim</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {aiPanel === 'ai' && (
            <View style={s.aiPanelBox}>
              {aiBusy ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color={L.accent} />
                  <Text style={s.advisorSummary}>Generating trending deals…</Text>
                </View>
              ) : (
                <Text style={s.advisorSummary}>
                  Trending deals refreshed — {shown.length} matching offers above.
                </Text>
              )}
            </View>
          )}

          {/* ── 3. Deal-type tabs ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
            {DEAL_TYPE_TABS.map((t) => {
              const active = typeTab === t.id;
              return (
                <Pressable
                  key={t.id}
                  accessibilityLabel={`deal type ${t.label}`}
                  onPress={() => pickType(t.id)}
                  style={[s.tab, { backgroundColor: active ? L.accent : L.chipBg, borderColor: active ? L.accent : L.chipBorder }]}
                >
                  <Text style={[s.tabText, { color: active ? '#fff' : L.text2 }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── 4. Auto-populated category chips ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
            {autoCats.map((c) => {
              const active = catTab === c.id;
              return (
                <Pressable
                  key={c.id}
                  accessibilityLabel={`category ${c.label}`}
                  onPress={() => setCatTab(c.id)}
                  style={[s.chip, { backgroundColor: active ? L.accentBg : L.chipBg, borderColor: active ? L.accentBorder : L.chipBorder }]}
                >
                  <Text style={[s.chipText, { color: active ? '#5B21B6' : L.text2 }]}>
                    {c.label} <Text style={{ opacity: 0.65 }}>{c.count}</Text>
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── 5. Bank card filter (Bank Offers active only) ── */}
          {typeTab === 'bank_offer' && (
            <View style={s.bankFilter}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <MaterialCommunityIcons name="credit-card-outline" size={14} color={L.accent} />
                <Text style={s.bankFilterTitle}>Your cards — offers that work with them</Text>
                {cardSel.length > 0 && (
                  <Pressable onPress={() => setCardSel([])}>
                    <Text style={s.bankFilterClear}>Clear</Text>
                  </Pressable>
                )}
              </View>
              {bankGroups.map(([bank, opts]) => (
                <View key={bank} style={{ gap: 6 }}>
                  <Text style={s.bankGroupLabel}>{bank}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
                    {opts.map((c) => {
                      const k = `${c.bank}|${c.name}`;
                      const on = cardSel.includes(k);
                      return (
                        <Pressable
                          key={k}
                          accessibilityLabel={`card ${bank} ${c.name}`}
                          onPress={() => toggleCard(k)}
                          style={[s.chip, { backgroundColor: on ? L.accentBg : L.chipBg, borderColor: on ? L.accent : L.chipBorder }]}
                        >
                          <MaterialCommunityIcons
                            name={on ? 'check' : 'plus'} size={11}
                            color={on ? L.accent : L.text3}
                          />
                          <Text style={[s.chipText, { color: on ? '#5B21B6' : L.text2 }]}>{c.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}
            </View>
          )}

          {/* ── 6. Responsive grid ── */}
          {loading && !deals ? (
            <View style={s.centerBlock}>
              <ActivityIndicator color={L.accent} size="large" />
              <Text style={s.centerText}>Loading deals…</Text>
            </View>
          ) : (
            <>
              {shown.length === 0 && (
                <View style={s.centerBlock}>
                  <MaterialCommunityIcons name="package-variant" size={32} color={L.text3} />
                  <Text style={s.centerText}>No deals match these filters yet.</Text>
                </View>
              )}
              <View style={s.grid}>
                {shown.map((d) => (
                  <DealCard key={d.deal_id} d={d} onClaim={openClaim} cardStyle={s.cardCell(cols)} />
                ))}
              </View>
            </>
          )}

          {/* Sources strip */}
          <View style={s.sourcesStrip}>
            <MaterialCommunityIcons name="api" size={12} color={L.text3} />
            <Text style={s.sourcesText}>
              Sourced from: {sources.map((x) => x.name).join(' · ') || 'curated'}
            </Text>
          </View>
        </View>

        {/* ── 8. Phone bottom nav ── */}
        {isMobile && !isEmbedded && Platform.OS === 'web' && (
          <View style={s.bottomNav} pointerEvents="box-none">
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', flex: 1 }}>
              {BOTTOM_NAV.map((n) => (
                <Pressable
                  key={n.route}
                  onPress={() => !n.active && router.replace(n.route as any)}
                  style={s.bottomNavItem}
                >
                  <MaterialCommunityIcons
                    name={n.icon} size={20}
                    color={n.active ? L.accent : L.text3}
                  />
                  <Text style={[s.bottomNavLabel, { color: n.active ? L.accent : L.text3 }]}>
                    {n.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ── 7. Claim modal ── */}
        <Modal visible={!!claimDeal} animationType="fade" transparent onRequestClose={closeClaim}>
          <View style={s.modalBackdrop}>
            <View style={s.modalCard}>
              {claimDeal && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {claimDeal.logo_url ? (
                      <Image source={{ uri: resolveImageUrl(claimDeal.logo_url) }} style={s.modalLogo} resizeMode="contain" />
                    ) : (
                      <View style={[s.modalLogoFallback, { backgroundColor: L.accentBg }]}>
                        <Text style={{ color: L.accent, fontSize: 18, fontWeight: '800' }}>{(claimDeal.brand || '?')[0]}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalBrand}>{(claimDeal.brand || '').toUpperCase()}</Text>
                      <Text style={s.modalTitle}>{claimDeal.title}</Text>
                    </View>
                    <Pressable onPress={closeClaim} hitSlop={8}>
                      <MaterialCommunityIcons name="close" size={20} color={L.text2} />
                    </Pressable>
                  </View>

                  <View style={s.modalSavingsBox}>
                    <Text style={s.modalSavingsLabel}>You save</Text>
                    <Text style={[s.modalSavingsValue, { color: L.accent }]}>
                      {fmtINR(claimDeal.absolute_savings_inr || 0)}
                    </Text>
                    <Text style={s.modalSavingsSub}>
                      {claimDeal.original_label || '—'} → {claimDeal.price_label || 'Free'}{claimDeal.discount_label ? ` (${claimDeal.discount_label})` : ''}
                    </Text>
                  </View>

                  {claimDeal.code ? (
                    <View style={s.codeBox}>
                      <Text style={s.codeLabel}>Code</Text>
                      <Text style={[s.codeValue, { color: '#5B21B6' }]}>{claimDeal.code}</Text>
                      <MaterialCommunityIcons name="content-copy" size={14} color={L.accent} />
                    </View>
                  ) : (
                    <Text style={s.modalNote}>No code needed — discount applied automatically at checkout.</Text>
                  )}

                  {claimResult?.ok && (
                    <View style={s.claimSuccess}>
                      <MaterialCommunityIcons name="check-decagram" size={16} color="#059669" />
                      <View style={{ flex: 1 }}>
                        <Text style={s.claimSuccessTitle}>
                          {claimResult.credits_awarded > 0
                            ? `+${claimResult.credits_awarded} SA points earned!`
                            : 'Daily quota reached — redirecting'}
                        </Text>
                        <Text style={s.claimSuccessSub}>
                          Today {claimResult.todays_claims || 0}/{claimResult.max_per_day || 3} claims used
                        </Text>
                      </View>
                    </View>
                  )}
                  {claimResult && !claimResult.ok && (
                    <View style={s.claimFail}>
                      <MaterialCommunityIcons name="alert-circle" size={16} color="#DC2626" />
                      <Text style={s.claimFailText}>{claimResult.error}</Text>
                    </View>
                  )}

                  <Pressable style={s.modalCTA} disabled={claimBusy} onPress={onClaimConfirm}>
                    {claimBusy ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <MaterialCommunityIcons name="open-in-new" size={14} color="#fff" />
                        <Text style={s.modalCTAText}>Continue to {claimDeal.brand}</Text>
                      </>
                    )}
                  </Pressable>
                  <Text style={s.modalNote}>+20 SA points earned per claim · max 3 claims/day</Text>
                </>
              )}
            </View>
          </View>
        </Modal>
      </FeaturePageShell>
    </ForceLightTheme>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────
function AiPill({ icon, label, active, busy, onPress }: {
  icon: IconName; label: string; active: boolean; busy?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      disabled={busy}
      style={[s.aiPill, { backgroundColor: active ? L.accent : L.chipBg, borderColor: active ? L.accent : L.chipBorder }]}
    >
      {busy ? <ActivityIndicator size="small" color={active ? '#fff' : L.accent} /> :
        <MaterialCommunityIcons name={icon} size={13} color={active ? '#fff' : L.accent} />}
      <Text style={[s.aiPillText, { color: active ? '#fff' : L.text }]}>
        {busy ? 'Generating…' : label}
      </Text>
    </Pressable>
  );
}

function AdvisorMetric({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <View style={s.advisorMetric}>
      <MaterialCommunityIcons name={icon} size={14} color={L.accent} />
      <Text style={s.advisorMetricLabel}>{label}</Text>
      <Text style={s.advisorMetricValue}>{value}</Text>
    </View>
  );
}

function TagPill({ tag }: { tag: string }) {
  const meta = TAG_META[tag];
  if (!meta) return null;
  const solid = meta.solid;
  return (
    <View style={[s.tagPill, { backgroundColor: solid ? meta.bg : meta.bg, borderColor: solid ? meta.bg : meta.bg }]}
      accessibilityLabel={`tag ${meta.label}`}>
      <MaterialCommunityIcons name={meta.icon} size={10} color={meta.fg} />
      <Text style={[s.tagText, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  );
}

export function DealCard({ d, onClaim, cardStyle }: { d: Deal; onClaim: (d: Deal) => void; cardStyle?: object }) {
  const dt = DEAL_TYPE_META[inferDealType(d as any)] || { label: 'Deal', bg: '#F1F5F9', fg: '#475569' };
  const visible = (d.tags || []).filter((t) => t !== 'HOT' && t !== 'STUDENT_VERIFIED').slice(0, 3);
  const overflow = (d.tags || []).filter((t) => t !== 'HOT' && t !== 'STUDENT_VERIFIED').length - visible.length;
  const isFree = d.price_inr === 0 || (d.price_label || '').toUpperCase().includes('FREE');
  const verified = d.tags?.includes('STUDENT_VERIFIED') || d.code_verified === true;

  return (
    <View style={[s.card, cardStyle]} accessibilityLabel={`deal ${d.brand} ${d.title}`}>
      <View style={{ flex: 1, gap: 8 }}>
        {/* Logo + brand/title + prices */}
        <View style={s.cardTop}>
          {d.logo_url ? (
            <View style={s.cardLogoWrap}>
              <Image source={{ uri: resolveImageUrl(d.logo_url) }} style={s.cardLogo} resizeMode="contain" />
            </View>
          ) : (
            <View style={[s.cardLogoWrap, s.cardLogoFallback]}>
              <Text style={s.cardLogoInitial}>{(d.brand || '?')[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
            <Text style={s.cardTitle} numberOfLines={1}>{d.title}</Text>
            <Text style={s.cardBrand}>{(d.brand || d.provider || '').toUpperCase()}</Text>
          </View>
        </View>

        {/* Badges: deal type + verification + HOT */}
        <View style={s.badgeRow}>
          <View style={[s.typeBadge, { backgroundColor: dt.bg }]}>
            <Text style={[s.typeBadgeText, { color: dt.fg }]}>{dt.label}</Text>
          </View>
          {verified && (
            <View style={s.verifyBadge}>
              <MaterialCommunityIcons name="check-decagram" size={10} color="#059669" />
              <Text style={s.verifyBadgeText}>Verified</Text>
            </View>
          )}
          {d.tags?.includes('HOT') && (
            <View style={s.hotChip}>
              <MaterialCommunityIcons name="fire" size={10} color="#fff" />
              <Text style={s.hotChipText}>HOT</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {!!d.description && (
          <Text style={s.cardDesc} numberOfLines={2}>{d.description}</Text>
        )}

        {/* Tag pills */}
        {visible.length > 0 && (
          <View style={s.tagRow}>
            {visible.map((t) => <TagPill key={t} tag={t} />)}
            {overflow > 0 && (
              <View style={s.overflowPill}>
                <Text style={s.overflowText}>+{overflow}</Text>
              </View>
            )}
          </View>
        )}

        {/* Price row */}
        <View style={s.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardPrice, { color: isFree ? L.priceFree : L.pricePaid }]}>
              {d.price_label || (d.price_inr ? fmtINR(d.price_inr) : 'Free')}
            </Text>
            {!!d.original_label && (d.original_inr || 0) > (d.price_inr || 0) && (
              <Text style={s.cardOrig}>{d.original_label}</Text>
            )}
          </View>
          {!!d.discount_pct && d.discount_pct > 0 && (
            <View style={s.pctChip}>
              <Text style={s.pctText}>{d.discount_pct}% off</Text>
            </View>
          )}
        </View>
      </View>

      <Pressable
        accessibilityLabel={`claim deal ${d.brand}`}
        style={s.cardCTA}
        onPress={() => onClaim(d)}
      >
        <MaterialCommunityIcons name="open-in-new" size={13} color="#fff" />
        <Text style={s.cardCTAText}>Claim Deal</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles (light) ────────────────────────────────────────────────────
const s = StyleSheet.create({
  panel: {
    flex: 1,
    gap: 14,
    backgroundColor: L.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: L.border,
    padding: 16,
    paddingBottom: 72,
    ...({ cursor: 'default' } as any),
  },

  searchInput: {
    flex: 1,
    minWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: L.border,
    backgroundColor: L.card,
    color: L.text,
    fontSize: 12.5,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: L.accent,
    borderWidth: 1,
    borderColor: L.accent,
    ...({ cursor: 'pointer' } as any),
  },
  refreshText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  errBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  errText: { color: '#EF4444', fontSize: 12.5, flex: 1 },

  // AI bar
  aiBar: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  aiPillText: { fontSize: 11.5, fontWeight: '700' },
  aiPanelBox: {
    backgroundColor: L.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: L.border,
    padding: 14,
    gap: 10,
  },

  advisorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  advisorMetric: {
    flex: 1,
    minWidth: 130,
    padding: 12,
    borderRadius: 12,
    backgroundColor: L.bg,
    borderWidth: 1,
    borderColor: L.border,
    gap: 4,
  },
  advisorMetricLabel: { fontSize: 10.5, color: L.text2, marginTop: 2 },
  advisorMetricValue: { fontSize: 16, fontWeight: '800', color: L.text },
  advisorSummary: { fontSize: 12.5, lineHeight: 18, color: L.text2 },

  bundleGrid: { gap: 8 },
  bundleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: L.border,
    backgroundColor: L.bg,
  },
  bundleLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff' },
  bundleLogoFallback: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bundleBrand: { fontSize: 10.5, color: L.text3 },
  bundleTitle: { fontSize: 13, fontWeight: '600', color: L.text },
  bundleSavings: { fontSize: 12, fontWeight: '700', color: L.accent },
  bundleClaimBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: L.accentBg,
    borderWidth: 1,
    borderColor: L.accentBorder,
    ...({ cursor: 'pointer' } as any),
  },
  bundleClaimText: { fontSize: 11, fontWeight: '700', color: '#5B21B6' },

  // Deal-type tabs + chips
  tabRow: { gap: 8, paddingRight: 12, paddingVertical: 2 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  tabText: { fontSize: 12.5, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  chipText: { fontSize: 12, fontWeight: '600' },

  // Bank filter
  bankFilter: {
    gap: 8,
    backgroundColor: L.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: L.border,
    padding: 12,
  },
  bankFilterTitle: { fontSize: 12.5, fontWeight: '800', color: L.text },
  bankFilterClear: { fontSize: 11, fontWeight: '700', color: L.accent },
  bankGroupLabel: { fontSize: 10, fontWeight: '800', color: L.text3, letterSpacing: 0.5 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  centerBlock: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  centerText: { color: L.text3, fontSize: 12.5 },

  // Card
  card: {
    flex: 1,
    minBasis: 0,
    padding: 14,
    borderRadius: 16,
    backgroundColor: L.card,
    borderWidth: 1,
    borderColor: L.border,
    gap: 8,
    ...({ boxShadow: '0 2px 8px rgba(15,23,42,0.04)', cursor: 'default' } as any),
  } as any,
  cardCell: (n: number) => ({
    flexBasis: `${Math.max(100 / n - 1.5, 20).toFixed(2)}%`,
    flexGrow: 1,
    maxWidth: 380,
  }),

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardLogoWrap: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
  cardLogo: { width: 44, height: 44, backgroundColor: '#fff' },
  cardLogoFallback: {
    backgroundColor: L.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLogoInitial: { color: L.accent, fontSize: 18, fontWeight: '800' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: L.text },
  cardBrand: { fontSize: 10.5, color: L.text3, fontWeight: '600', letterSpacing: 0.4 },

  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeBadgeText: { fontSize: 9.5, fontWeight: '800' },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
  },
  verifyBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#059669' },
  hotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  hotChipText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },

  cardDesc: { fontSize: 12, lineHeight: 17, color: L.text2 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: '700' },
  overflowPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: L.border,
    backgroundColor: L.bg,
  },
  overflowText: { fontSize: 10, fontWeight: '700', color: L.text2 },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  cardPrice: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  cardOrig: { fontSize: 11, color: L.text3, textDecorationLine: 'line-through' },
  pctChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: L.accentBg,
  },
  pctText: { fontSize: 11, fontWeight: '800', color: '#5B21B6' },

  cardCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 'auto',
    backgroundColor: L.accent,
    ...({ cursor: 'pointer' } as any),
  },
  cardCTAText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  sourcesStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: L.border,
  },
  sourcesText: { fontSize: 11, color: L.text3 },

  // Bottom nav (phone)
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: L.border,
    paddingHorizontal: 8,
    ...({ backdropFilter: 'blur(12px)', zIndex: 60 } as any),
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
    ...({ cursor: 'pointer' } as any),
  },
  bottomNavLabel: { fontSize: 10, fontWeight: '700' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 18,
    padding: 20,
    gap: 14,
    backgroundColor: L.card,
    ...({ boxShadow: '0 24px 60px rgba(15,23,42,0.25)' } as any),
  },
  modalLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff' },
  modalLogoFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBrand: { fontSize: 11, color: L.text3, fontWeight: '700', letterSpacing: 0.4 },
  modalTitle: { fontSize: 15, fontWeight: '700', color: L.text },

  modalSavingsBox: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    backgroundColor: L.bg,
    borderWidth: 1,
    borderColor: L.border,
  },
  modalSavingsLabel: { fontSize: 11, color: L.text2, letterSpacing: 0.5 },
  modalSavingsValue: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  modalSavingsSub: { fontSize: 12, color: L.text2 },

  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: L.accentBorder,
    backgroundColor: L.accentBg,
  },
  codeLabel: { fontSize: 11, color: L.text2 },
  codeValue: { fontSize: 14, fontWeight: '800', letterSpacing: 1, flex: 1 },

  modalNote: { fontSize: 11, color: L.text3, fontStyle: 'italic' },

  claimSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  claimSuccessTitle: { fontSize: 13, fontWeight: '700', color: L.text },
  claimSuccessSub: { fontSize: 11.5, color: L.text2, marginTop: 2 },

  claimFail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  claimFailText: { fontSize: 11.5, color: '#DC2626', flex: 1 },

  modalCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: L.accent,
    ...({ cursor: 'pointer' } as any),
  },
  modalCTAText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
