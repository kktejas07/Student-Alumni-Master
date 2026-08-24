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
 * Adapts the user's web spec strictly to React Native primitives.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator,
  Image, Linking, Modal, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { request, resolveImageUrl } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';

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
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);

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
          <View className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(252,211,77,0.12)', borderColor: 'rgba(252,211,77,0.35)', borderWidth: 1 }}>
            <MaterialCommunityIcons name="star-four-points" size={12} color="#FCD34D" />
            <Text className="font-body-bold" style={{ color: '#FCD34D', fontSize: 10.5 }}>SA Exclusive</Text>
          </View>
          <Pressable className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.20)", borderWidth: 1 }} onPress={onRefresh} disabled={refreshing}>
            {refreshing ? <ActivityIndicator color="#fff" size="small" /> :
              <MaterialCommunityIcons name="refresh" size={14} color="#fff" />}
            <Text className="text-text font-body-bold text-xs">Refresh</Text>
          </Pressable>
        </View>
      }
    >
      {/* Last updated */}
      {lastUpdated && (
        <Text className="text-dim text-xs" style={{ marginTop: -10 }}>
          Last updated {relTime(lastUpdated)} · Sources: {sources.length || 1}
        </Text>
      )}

      {error ? (
        <View className="flex-row items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(248,113,113,0.10)", borderColor: "rgba(248,113,113,0.40)", borderWidth: 1 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#F87171" />
          <Text className="text-rose text-sm flex-1">{error}</Text>
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
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              <AdvisorMetric label="Estimated yearly savings" value={fmtINR(stats.yearly_savings_inr)} icon="cash-multiple" tint="#34D399" />
              <AdvisorMetric label="Top category" value={CATEGORY_META[stats.top_category.id]?.label || stats.top_category.id} icon="trophy" tint="#FCD34D" />
              <AdvisorMetric label="Best ROI" value={stats.best_roi ? fmtINR(stats.best_roi.savings_inr) : '—'} icon="medal" tint="#A78BFA" />
            </View>
            {stats.best_roi && (
              <Text className="text-muted text-sm" style={{ lineHeight: 18 }}>
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
            <Text className="text-muted text-sm">
              These 4 deals together save you{' '}
              <Text style={{ color: '#FBCFE8', fontWeight: '800' }}>{fmtINR(stats.smart_bundle_total_savings_inr)}</Text>.
            </Text>
            <View className="gap-2">
              {stats.smart_bundle.map((b) => (
                <View key={b.deal_id} style={[s.bundleItem, { borderColor: b.accent + '55' }]}>
                  {b.logo_url ? (
                    <Image source={{ uri: resolveImageUrl(b.logo_url) }} className="w-9 h-9 rounded-xl bg-white" resizeMode="contain" />
                  ) : (
                    <View style={[s.bundleLogoFallback, { backgroundColor: b.accent + '33' }]}>
                      <Text style={{ color: b.accent, fontSize: 14, fontWeight: '800' }}>{b.brand?.[0] || '?'}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text className="text-dim text-xs">{b.brand}</Text>
                    <Text className="text-text font-body-semibold text-sm" numberOfLines={1}>{b.title}</Text>
                    <Text style={[s.bundleSavings, { color: '#FBCFE8' }]}>save {fmtINR(b.savings_inr)}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl" style={{ backgroundColor: "#EC4899" }}>
              <MaterialCommunityIcons name="auto-fix" size={14} color="#3F0518" />
              <Text className="font-body-bold text-sm" style={{ color: "#3F0518" }}>Claim all 4</Text>
            </Pressable>
          </View>
        )}
      </Accordion>

      {/* AI Trending button */}
      <Pressable className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl" style={{ backgroundColor: "rgba(167,139,250,0.10)", borderColor: "rgba(167,139,250,0.45)", borderWidth: 1 }} onPress={onAiTrending} disabled={aiBusy}>
        {aiBusy ? <ActivityIndicator color="#A78BFA" /> :
          <MaterialCommunityIcons name="auto-fix" size={14} color="#A78BFA" />}
        <Text className="text-violet font-body-bold text-sm">
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
            <View className="gap-3">
              <View className="flex-row items-center gap-2 flex-wrap">
                <MaterialCommunityIcons name="fire" size={18} color="#EF4444" />
                <Text className="text-text font-display-bold text-lg">Hot Deals</Text>
                <Text className="text-dim text-xs ml-1">Limited time — grab these before they expire!</Text>
              </View>
              <View className="flex-row flex-wrap" style={{ gap: 14 }}>
                {hotDeals.map((d) => <DealCard key={d.deal_id} d={d} onClaim={openClaim} />)}
              </View>
            </View>
          )}

          {/* All Deals */}
          {otherDeals.length > 0 && (
            <View className="gap-3">
              <View className="flex-row items-center gap-2 flex-wrap">
                <MaterialCommunityIcons name="view-grid" size={18} color="#A78BFA" />
                <Text className="text-text font-display-bold text-lg">All Deals</Text>
                <Text className="text-dim text-xs ml-1">Curated for SA members across {CATEGORY_META[tab]?.label || 'all'} categories</Text>
              </View>
              <View className="flex-row flex-wrap" style={{ gap: 14 }}>
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
          <View className="flex-row items-center gap-1.5 pt-4 pb-2" style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)" }}>
            <MaterialCommunityIcons name="api" size={12} color={C.text3} />
            <Text className="text-dim text-xs">
              Sourced from: {sources.map(s => s.name).join(' · ') || 'curated'} · Cache 60 min
            </Text>
          </View>
        </>
      )}

      {/* Claim Modal */}
      <Modal visible={!!claimDeal} animationType="fade" transparent onRequestClose={closeClaim}>
        <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.65)" }}>
          <View className="w-full rounded-2xl p-5 gap-3.5" style={{ maxWidth: 460, backgroundColor: "#1A1626", borderColor: "rgba(255,255,255,0.10)", borderWidth: 1 }}>
            {claimDeal && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {claimDeal.logo_url ? (
                    <Image source={{ uri: resolveImageUrl(claimDeal.logo_url) }} className="w-12 h-12 rounded-xl bg-white" resizeMode="contain" />
                  ) : (
                    <View style={[s.modalLogoFallback, { backgroundColor: claimDeal.accent + '33' }]}>
                      <Text style={{ color: claimDeal.accent, fontSize: 18, fontWeight: '800' }}>{claimDeal.brand[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text className="text-dim text-xs">{claimDeal.brand}</Text>
                    <Text className="text-text font-body-bold text-base">{claimDeal.title}</Text>
                  </View>
                  <Pressable onPress={closeClaim} hitSlop={8}>
                    <MaterialCommunityIcons name="close" size={20} color={C.text2} />
                  </Pressable>
                </View>

                <View className="items-center rounded-xl p-3.5" style={{ backgroundColor: "rgba(0,0,0,0.30)", borderColor: "rgba(255,255,255,0.10)", borderWidth: 1, gap: 4 }}>
                  <Text className="text-dim text-xs" style={{ letterSpacing: 0.5 }}>You save</Text>
                  <Text style={[s.modalSavingsValue, { color: claimDeal.accent }]}>
                    {fmtINR(claimDeal.absolute_savings_inr)}
                  </Text>
                  <Text className="text-muted text-xs">
                    {claimDeal.original_label} → {claimDeal.price_label} ({claimDeal.discount_label})
                  </Text>
                </View>

                {claimDeal.code ? (
                  <View className="flex-row items-center gap-2.5 p-2.5 rounded-xl" style={{ backgroundColor: "rgba(167,139,250,0.10)", borderColor: "rgba(167,139,250,0.45)", borderWidth: 1, borderStyle: "dashed" }}>
                    <Text className="text-dim text-xs">Code</Text>
                    <Text className="text-text font-body-bold text-sm flex-1" style={{ letterSpacing: 1 }}>{claimDeal.code}</Text>
                    <MaterialCommunityIcons name="content-copy" size={14} color="#A78BFA" />
                  </View>
                ) : (
                  <Text className="text-dim text-xs italic">No code needed — discount applied automatically at checkout.</Text>
                )}

                {claimResult?.ok && (
                  <View className="flex-row items-center gap-2.5 p-3 rounded-xl" style={{ backgroundColor: "rgba(52,211,153,0.10)", borderColor: "rgba(52,211,153,0.45)", borderWidth: 1 }}>
                    <MaterialCommunityIcons name="check-decagram" size={16} color="#34D399" />
                    <View style={{ flex: 1 }}>
                      <Text className="text-text font-body-bold text-sm">
                        {claimResult.credits_awarded > 0
                          ? `+${claimResult.credits_awarded} SA points earned!`
                          : 'Daily quota reached — redirecting'}
                      </Text>
                      <Text className="text-muted text-xs mt-0.5">
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
                      <Text className="text-text font-body-bold text-sm">Continue to {claimDeal.brand}</Text>
                    </>
                  )}
                </Pressable>
                <Text className="text-dim text-xs italic">+20 SA points earned per claim · max 3 claims/day</Text>
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
    <View className="rounded-xl overflow-hidden" style={[{ backgroundColor: bg, borderColor: border }]}>
      <Pressable onPress={onToggle} className="flex-row items-center gap-2.5 px-4 py-3.5">
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
        <Text style={[s.accordionTitle, { color: tint }]}>{title}</Text>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18} color={tint}
          style={{ marginLeft: 'auto' }}
        />
      </Pressable>
      {open && <View className="px-4 pb-4 pt-3.5" style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>{children}</View>}
    </View>
  );
}

function AdvisorMetric({ label, value, icon, tint }: { label: string; value: string; icon: IconName; tint: string }) {
  return (
    <View style={[s.advisorMetric, { borderColor: tint + '44' }]}>
      <MaterialCommunityIcons name={icon} size={14} color={tint} />
      <Text className="text-dim text-xs mt-0.5">{label}</Text>
      <Text style={[s.advisorMetricValue, { color: tint }]}>{value}</Text>
    </View>
  );
}

function DealCard({ d, onClaim }: { d: Deal; onClaim: (d: Deal) => void }) {
  const visible = (d.tags || []).filter((t) => t !== 'HOT').slice(0, 3);
  const overflow = (d.tags || []).filter((t) => t !== 'HOT').length - visible.length;
  return (
    <View style={[s.card, { borderColor: d.accent + '44' }]}>
      {/* Wrap top details in a flex: 1 view to push CTA to the bottom */}
      <View style={{ flex: 1, gap: 8 }}>
        {/* Top: Logo + title/brand + prices */}
        <View className="flex-row items-center gap-2.5 relative">
          {/* Col 1: Logo */}
          <View className="w-11 h-11 rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            {d.logo_url ? (
              <Image source={{ uri: resolveImageUrl(d.logo_url) }} className="w-11 h-11 bg-white" resizeMode="contain" />
            ) : (
              <View style={[s.cardLogoFallback, { backgroundColor: d.accent + '33' }]}>
                <Text style={{ color: d.accent, fontSize: 18, fontWeight: '800' }}>{d.brand[0]}</Text>
              </View>
            )}
          </View>

          {/* Col 2: Brand + Title */}
          <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
            <Text className="text-text font-display-bold text-sm" numberOfLines={1} numberOfLines={1}>{d.title}</Text>
            <Text className="text-dim text-xs">{d.brand}</Text>
          </View>

          {/* Col 3: Prices */}
          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text style={[s.cardPrice, { color: '#86EFAC' }]}>{d.price_label}</Text>
            {d.original_inr > d.price_inr && (
              <Text className="text-dim text-xs line-through">{d.original_label}</Text>
            )}
            {d.discount_pct > 0 && (
              <Text style={[s.cardPct, { color: '#FCD34D' }]}>{d.discount_pct}% off</Text>
            )}
          </View>
        </View>

        {/* HOT badge (rendered completely inline right above the description) */}
        {d.tags?.includes('HOT') && (
          <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-md self-start" style={{ backgroundColor: "#EF4444" }}>
            <MaterialCommunityIcons name="fire" size={10} color="#fff" />
            <Text className="text-text font-body-bold" style={{ fontSize: 9, letterSpacing: 0.4 }}>HOT</Text>
          </View>
        )}

        {/* Description */}
        <Text className="text-muted text-xs" numberOfLines={2} style={{ lineHeight: 17 }} numberOfLines={2}>{d.description}</Text>

        {/* Tag pills */}
        {visible.length > 0 && (
          <View className="flex-row flex-wrap mt-1" style={{ gap: 6 }}>
            {visible.map((t) => <TagPill key={t} tag={t} />)}
            {overflow > 0 && (
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)", borderWidth: 1 }}>
                <Text className="text-muted font-body-bold text-xs">+{overflow}</Text>
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
        <Text className="text-text font-body-bold text-sm">Claim Deal</Text>
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


