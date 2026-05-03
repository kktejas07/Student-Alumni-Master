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
 * Adapts the user's web spec strictly to React Native primitives.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
  Image, Linking, Modal, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

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
  all:           { label: 'All',           icon: 'view-grid',                color: '#A78BFA' },
  tech:          { label: 'Tech & Tools',  icon: 'laptop',                   color: '#3B82F6' },
  food:          { label: 'Food',          icon: 'food',                     color: '#FC8019' },
  learning:      { label: 'Learning',      icon: 'school',                   color: '#8B5CF6' },
  entertainment: { label: 'Entertainment', icon: 'play-circle',              color: '#1DB954' },
  insurance:     { label: 'Insurance',     icon: 'shield-check',             color: '#EF4444' },
  transport:     { label: 'Transport',     icon: 'bus',                      color: '#22C55E' },
  travel:        { label: 'Travel',        icon: 'airplane',                 color: '#06B6D4' },
  fashion:       { label: 'Fashion',       icon: 'tshirt-crew',              color: '#F472B6' },
  grocery:       { label: 'Grocery',       icon: 'basket',                   color: '#84C225' },
};

const CATEGORY_ORDER = ['all', 'tech', 'food', 'learning', 'entertainment',
                        'insurance', 'transport', 'travel', 'fashion', 'grocery'];

const C = {
  text: '#fff',
  text2: 'rgba(255,255,255,0.72)',
  text3: 'rgba(255,255,255,0.46)',
  border: 'rgba(255,255,255,0.10)',
  card: 'rgba(255,255,255,0.04)',
};

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
  const user = useAuthStore((s) => s.user);
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
            <MaterialCommunityIcons name="star-four-points" size={12} color="#FCD34D" />
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
        <Text style={s.lastUpdated}>
          Last updated {relTime(lastUpdated)} · Sources: {sources.length || 1}
        </Text>
      )}

      {error ? (
        <View style={s.errBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#F87171" />
          <Text style={s.errText}>{error}</Text>
        </View>
      ) : null}

      {/* AI Savings Advisor (amber) */}
      <Accordion
        open={advisorOpen}
        onToggle={() => setAdvisorOpen(!advisorOpen)}
        title="AI Savings Advisor — How much can you save?"
        icon="auto-fix"
        tint="#F59E0B"
        bg="rgba(245,158,11,0.10)"
        border="rgba(245,158,11,0.40)"
      >
        {!stats ? (
          <ActivityIndicator color="#F59E0B" />
        ) : (
          <View style={{ gap: 12 }}>
            <View style={s.advisorRow}>
              <AdvisorMetric label="Estimated yearly savings" value={fmtINR(stats.yearly_savings_inr)} icon="cash-multiple" tint="#34D399" />
              <AdvisorMetric label="Top category" value={CATEGORY_META[stats.top_category.id]?.label || stats.top_category.id} icon="trophy" tint="#FCD34D" />
              <AdvisorMetric label="Best ROI" value={stats.best_roi ? fmtINR(stats.best_roi.savings_inr) : '—'} icon="medal" tint="#A78BFA" />
            </View>
            {stats.best_roi && (
              <Text style={s.advisorSummary}>
                You can save up to <Text style={{ color: '#FCD34D', fontWeight: '700' }}>{fmtINR(stats.total_savings_inr)}</Text> across{' '}
                <Text style={{ color: '#FCD34D', fontWeight: '700' }}>{stats.total_deals}</Text> active deals.
                Your biggest single saving: <Text style={{ color: '#FCD34D', fontWeight: '700' }}>{stats.best_roi.brand}</Text> — {stats.best_roi.title} ({fmtINR(stats.best_roi.savings_inr)}).
                Top category by savings: <Text style={{ color: '#FCD34D', fontWeight: '700' }}>{CATEGORY_META[stats.top_category.id]?.label || stats.top_category.id}</Text>.
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
        tint="#EC4899"
        bg="rgba(236,72,153,0.10)"
        border="rgba(236,72,153,0.40)"
      >
        {!stats ? (
          <ActivityIndicator color="#EC4899" />
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={s.bundleSummary}>
              These 4 deals together save you{' '}
              <Text style={{ color: '#FBCFE8', fontWeight: '800' }}>{fmtINR(stats.smart_bundle_total_savings_inr)}</Text>.
            </Text>
            <View style={s.bundleGrid}>
              {stats.smart_bundle.map((b) => (
                <View key={b.deal_id} style={[s.bundleItem, { borderColor: b.accent + '55' }]}>
                  {b.logo_url ? (
                    <Image source={{ uri: b.logo_url }} style={s.bundleLogo} resizeMode="contain" />
                  ) : (
                    <View style={[s.bundleLogoFallback, { backgroundColor: b.accent + '33' }]}>
                      <Text style={{ color: b.accent, fontSize: 14, fontWeight: '800' }}>{b.brand?.[0] || '?'}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.bundleBrand}>{b.brand}</Text>
                    <Text style={s.bundleTitle} numberOfLines={1}>{b.title}</Text>
                    <Text style={[s.bundleSavings, { color: '#FBCFE8' }]}>save {fmtINR(b.savings_inr)}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable style={s.claimAllBtn}>
              <MaterialCommunityIcons name="auto-fix" size={14} color="#3F0518" />
              <Text style={s.claimAllText}>Claim all 4</Text>
            </Pressable>
          </View>
        )}
      </Accordion>

      {/* AI Trending button */}
      <Pressable style={s.aiTrendBtn} onPress={onAiTrending} disabled={aiBusy}>
        {aiBusy ? <ActivityIndicator color="#A78BFA" /> :
          <MaterialCommunityIcons name="auto-fix" size={14} color="#A78BFA" />}
        <Text style={s.aiTrendText}>
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
              style={[s.tab, active && { backgroundColor: meta.color + '22', borderColor: meta.color + '66' }]}
            >
              <MaterialCommunityIcons name={meta.icon} size={14} color={active ? meta.color : 'rgba(255,255,255,0.65)'} />
              <Text style={[s.tabText, active && { color: meta.color }]}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Loading */}
      {loading && !deals ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color="#FCD34D" size="large" />
          <Text style={{ color: C.text2, marginTop: 8 }}>Loading deals…</Text>
        </View>
      ) : (
        <>
          {/* Hot Deals */}
          {hotDeals.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <MaterialCommunityIcons name="fire" size={18} color="#EF4444" />
                <Text style={s.sectionTitle}>Hot Deals</Text>
                <Text style={s.sectionSub}>Limited time — grab these before they expire!</Text>
              </View>
              <View style={s.grid}>
                {hotDeals.map((d) => <DealCard key={d.deal_id} d={d} onClaim={openClaim} />)}
              </View>
            </View>
          )}

          {/* All Deals */}
          {otherDeals.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <MaterialCommunityIcons name="view-grid" size={18} color="#A78BFA" />
                <Text style={s.sectionTitle}>All Deals</Text>
                <Text style={s.sectionSub}>Curated for SA members across {CATEGORY_META[tab]?.label || 'all'} categories</Text>
              </View>
              <View style={s.grid}>
                {otherDeals.map((d) => <DealCard key={d.deal_id} d={d} onClaim={openClaim} />)}
              </View>
            </View>
          )}

          {(!hotDeals.length && !otherDeals.length) && (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <MaterialCommunityIcons name="package-variant" size={32} color={C.text3} />
              <Text style={{ color: C.text3, marginTop: 8 }}>No deals in this category yet.</Text>
            </View>
          )}

          {/* Sources strip */}
          <View style={s.sourcesStrip}>
            <MaterialCommunityIcons name="api" size={12} color={C.text3} />
            <Text style={s.sourcesText}>
              Sourced from: {sources.map(s => s.name).join(' · ') || 'curated'} · Cache 60 min
            </Text>
          </View>
        </>
      )}

      {/* Claim Modal */}
      <Modal visible={!!claimDeal} animationType="fade" transparent onRequestClose={closeClaim}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            {claimDeal && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {claimDeal.logo_url ? (
                    <Image source={{ uri: claimDeal.logo_url }} style={s.modalLogo} resizeMode="contain" />
                  ) : (
                    <View style={[s.modalLogoFallback, { backgroundColor: claimDeal.accent + '33' }]}>
                      <Text style={{ color: claimDeal.accent, fontSize: 18, fontWeight: '800' }}>{claimDeal.brand[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalBrand}>{claimDeal.brand}</Text>
                    <Text style={s.modalTitle}>{claimDeal.title}</Text>
                  </View>
                  <Pressable onPress={closeClaim} hitSlop={8}>
                    <MaterialCommunityIcons name="close" size={20} color={C.text2} />
                  </Pressable>
                </View>

                <View style={s.modalSavingsBox}>
                  <Text style={s.modalSavingsLabel}>You save</Text>
                  <Text style={[s.modalSavingsValue, { color: claimDeal.accent }]}>
                    {fmtINR(claimDeal.absolute_savings_inr)}
                  </Text>
                  <Text style={s.modalSavingsSub}>
                    {claimDeal.original_label} → {claimDeal.price_label} ({claimDeal.discount_label})
                  </Text>
                </View>

                {claimDeal.code ? (
                  <View style={s.codeBox}>
                    <Text style={s.codeLabel}>Code</Text>
                    <Text style={s.codeValue}>{claimDeal.code}</Text>
                    <MaterialCommunityIcons name="content-copy" size={14} color="#A78BFA" />
                  </View>
                ) : (
                  <Text style={s.modalNote}>No code needed — discount applied automatically at checkout.</Text>
                )}

                {claimResult?.ok && (
                  <View style={s.claimSuccess}>
                    <MaterialCommunityIcons name="check-decagram" size={16} color="#34D399" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.claimSuccessTitle}>
                        {claimResult.credits_awarded > 0
                          ? `+${claimResult.credits_awarded} SA Credits earned!`
                          : 'Daily quota reached — redirecting'}
                      </Text>
                      <Text style={s.claimSuccessSub}>
                        Today {claimResult.todays_claims || 0}/{claimResult.max_per_day || 3} claims used
                      </Text>
                    </View>
                  </View>
                )}
                {claimResult && !claimResult.ok && (
                  <View style={[s.claimSuccess, { backgroundColor: 'rgba(248,113,113,0.10)', borderColor: 'rgba(248,113,113,0.45)' }]}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color="#F87171" />
                    <Text style={[s.claimSuccessSub, { color: '#FCA5A5' }]}>{claimResult.error}</Text>
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
                <Text style={s.modalNote}>+20 SA Credits earned per claim · max 3 claims/day</Text>
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

function AdvisorMetric({ label, value, icon, tint }: { label: string; value: string; icon: IconName; tint: string }) {
  return (
    <View style={[s.advisorMetric, { borderColor: tint + '44' }]}>
      <MaterialCommunityIcons name={icon} size={14} color={tint} />
      <Text style={s.advisorMetricLabel}>{label}</Text>
      <Text style={[s.advisorMetricValue, { color: tint }]}>{value}</Text>
    </View>
  );
}

function DealCard({ d, onClaim }: { d: Deal; onClaim: (d: Deal) => void }) {
  const visible = (d.tags || []).slice(0, 3);
  const overflow = (d.tags || []).length - visible.length;
  return (
    <View style={[s.card, { borderColor: d.accent + '44' }]}>
      {/* Top: Logo + brand + HOT badge */}
      <View style={s.cardTop}>
        <View style={s.cardLogoWrap}>
          {d.logo_url ? (
            <Image source={{ uri: d.logo_url }} style={s.cardLogo} resizeMode="contain" />
          ) : (
            <View style={[s.cardLogoFallback, { backgroundColor: d.accent + '33' }]}>
              <Text style={{ color: d.accent, fontSize: 18, fontWeight: '800' }}>{d.brand[0]}</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={[s.cardPrice, { color: d.accent }]}>{d.price_label}</Text>
          {d.original_inr > d.price_inr && (
            <Text style={s.cardOrig}>{d.original_label}</Text>
          )}
          {d.discount_pct > 0 && (
            <Text style={[s.cardPct, { color: d.accent }]}>{d.discount_pct}% off</Text>
          )}
        </View>

        {d.tags?.includes('HOT') && (
          <View style={s.hotChip}>
            <MaterialCommunityIcons name="fire" size={10} color="#fff" />
            <Text style={s.hotChipText}>HOT</Text>
          </View>
        )}
      </View>

      {/* Brand + title */}
      <View style={{ marginTop: 10, gap: 2 }}>
        <Text style={s.cardTitle} numberOfLines={1}>{d.title}</Text>
        <Text style={s.cardBrand}>{d.brand}</Text>
      </View>

      {/* Description */}
      <Text style={s.cardDesc} numberOfLines={2}>{d.description}</Text>

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

      {/* CTA */}
      <Pressable
        style={[s.cardCTA, { backgroundColor: d.accent }]}
        onPress={() => onClaim(d)}
      >
        <Text style={s.cardCTAText}>Claim Deal</Text>
      </Pressable>
    </View>
  );
}

function TagPill({ tag }: { tag: Tag }) {
  const meta = TAG_META[tag];
  if (!meta) return null;
  const solid = meta.solid;
  return (
    <View style={[
      s.tagPill,
      solid
        ? { backgroundColor: meta.bg, borderColor: meta.bg }
        : { backgroundColor: meta.bg + '22', borderColor: meta.bg + '66' },
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
    backgroundColor: 'rgba(252,211,77,0.12)',
    borderColor: 'rgba(252,211,77,0.35)', borderWidth: 1,
  },
  savePillText: { color: '#FCD34D', fontSize: 10.5, fontWeight: '800' },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.20)', borderWidth: 1,
  },
  refreshText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  lastUpdated: { color: C.text3, fontSize: 11, marginTop: -10 },

  errBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.40)', borderWidth: 1,
  },
  errText: { color: '#FCA5A5', fontSize: 12.5, flex: 1 },

  // Accordion
  accordion: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  accordionTitle: { fontSize: 13.5, fontWeight: '700', flex: 1 },
  accordionBody: {
    paddingHorizontal: 16, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 14,
  },

  advisorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  advisorMetric: {
    flex: 1, minWidth: 130,
    padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1, gap: 4,
  },
  advisorMetricLabel: { color: C.text3, fontSize: 10.5, marginTop: 2 },
  advisorMetricValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  advisorSummary: { color: C.text2, fontSize: 12.5, lineHeight: 18 },

  bundleSummary: { color: C.text2, fontSize: 13 },
  bundleGrid: { gap: 8 },
  bundleItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1,
  },
  bundleLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff' },
  bundleLogoFallback: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  bundleBrand: { color: C.text3, fontSize: 10.5 },
  bundleTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  bundleSavings: { fontSize: 12, fontWeight: '700' },
  claimAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#EC4899',
    paddingVertical: 10, borderRadius: 10,
  },
  claimAllText: { color: '#3F0518', fontSize: 12.5, fontWeight: '800' },

  // AI trending button
  aiTrendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.45)', borderWidth: 1,
  },
  aiTrendText: { color: '#A78BFA', fontSize: 12.5, fontWeight: '700' },

  // Tabs
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border, borderWidth: 1,
  },
  tabText: { color: C.text2, fontSize: 12.5, fontWeight: '600' },

  // Sections
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sectionSub: { color: C.text3, fontSize: 12, marginLeft: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  // Card
  card: {
    flexGrow: 1, flexBasis: 260, maxWidth: 340,
    padding: 14, borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, position: 'relative' },
  cardLogoWrap: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
  cardLogo: { width: 44, height: 44, backgroundColor: '#fff' },
  cardLogoFallback: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardPrice: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  cardOrig: { color: C.text3, fontSize: 11, textDecorationLine: 'line-through' },
  cardPct: { fontSize: 11, fontWeight: '700' },
  hotChip: {
    position: 'absolute', top: -4, right: -4,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  hotChipText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },

  cardTitle: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  cardBrand: { color: C.text3, fontSize: 11.5 },
  cardDesc: { color: C.text2, fontSize: 12, lineHeight: 17 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: '700' },
  overflowPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1,
  },
  overflowText: { color: C.text2, fontSize: 10, fontWeight: '700' },

  cardCTA: {
    paddingVertical: 11, borderRadius: 10,
    alignItems: 'center', marginTop: 6,
  },
  cardCTAText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  sourcesStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 16, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  sourcesText: { color: C.text3, fontSize: 11 },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modalCard: {
    width: '100%', maxWidth: 460,
    borderRadius: 18, padding: 20, gap: 14,
    backgroundColor: '#1A1626',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
  },
  modalLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff' },
  modalLogoFallback: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBrand: { color: C.text3, fontSize: 11 },
  modalTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },

  modalSavingsBox: {
    backgroundColor: 'rgba(0,0,0,0.30)',
    padding: 14, borderRadius: 12,
    alignItems: 'center', gap: 4,
    borderColor: C.border, borderWidth: 1,
  },
  modalSavingsLabel: { color: C.text3, fontSize: 11, letterSpacing: 0.5 },
  modalSavingsValue: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  modalSavingsSub: { color: C.text2, fontSize: 12 },

  codeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, borderRadius: 10,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.45)', borderWidth: 1, borderStyle: 'dashed',
  },
  codeLabel: { color: C.text3, fontSize: 11 },
  codeValue: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1, flex: 1 },

  modalNote: { color: C.text3, fontSize: 11, fontStyle: 'italic' },

  claimSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderColor: 'rgba(52,211,153,0.45)', borderWidth: 1,
  },
  claimSuccessTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  claimSuccessSub: { color: C.text2, fontSize: 11.5, marginTop: 2 },

  modalCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: 12,
  },
  modalCTAText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
