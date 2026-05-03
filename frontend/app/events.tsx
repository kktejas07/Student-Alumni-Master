/**
 * Events Screen v2 — comprehensive aggregator UI per Prompts 1-12.
 *
 * Features:
 *   - Top filter pills (All + 8 event types) with live counts
 *   - India / Global toggle + Indian city dropdown
 *   - Price filter (All / Free / Paid)
 *   - "AI Best Events for Me" toggle (uses /events/me/recommendations)
 *   - Featured Events horizontal carousel (auto-rotates 8s, pauses on hover)
 *   - More Events 3/2/1-col responsive grid w/ load-more
 *   - Detail SidePanel: Overview / Register / Track tabs
 *   - RSVP w/ capacity caps, waitlist, SA Credits payment
 *   - Save bookmark, .ics download, share
 *   - Polling refresh every 30s for new events
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  TextInput, Image, Linking, Modal, useWindowDimensions, Platform,
  Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request, tokenStore } from '@/src/models/services/api';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';

// ─── Constants ────────────────────────────────────────────────────────
const C = {
  bg: '#0A051A',
  card: '#111827',
  border: '#1F2937',
  primary: '#7C3AED',
  primaryDim: '#5B21B6',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textDim: '#64748B',
};

const TYPE_TINTS: Record<string, string> = {
  hackathon:    '#3B82F6',
  codethon:     '#10B981',
  workshop:     '#F97316',
  tech_talk:    '#8B5CF6',
  training:     '#14B8A6',
  founder_talk: '#EC4899',
  meetup:       '#64748B',
  fest:         '#F59E0B',
  boot_camp:    '#A855F7',
};

const TYPE_ICONS: Record<string, any> = {
  hackathon: 'rocket-launch',
  codethon: 'code-tags',
  workshop: 'wrench',
  tech_talk: 'microphone',
  training: 'school',
  founder_talk: 'account-tie',
  meetup: 'account-group',
  fest: 'party-popper',
  boot_camp: 'fire',
};

const TYPE_LABELS: Record<string, string> = {
  hackathon: 'Hackathon',
  codethon: 'Codethon',
  workshop: 'Workshop',
  tech_talk: 'Tech Talk',
  training: 'Training',
  founder_talk: 'Founder Talk',
  meetup: 'Meetup',
  fest: 'Fest',
  boot_camp: 'Boot Camp',
};

const INDIAN_CITIES = ['All', 'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Gurgaon', 'Cochin', 'Online'];

const TIER_OPTIONS = [
  { id: 'top_tier', label: 'Top Tier (IITs, ISB, MIT)' },
  { id: 'tier_one', label: 'Tier 1 (NITs, BITS, IIIT)' },
  { id: 'tier_two', label: 'Tier 2 (State, Private)' },
  { id: 'regional', label: 'Regional / Community' },
];

const MODE_OPTIONS = [
  { id: 'all', label: 'All Modes' },
  { id: 'virtual', label: 'Virtual' },
  { id: 'in_person', label: 'In-Person' },
  { id: 'hybrid', label: 'Hybrid' },
];

const TOPIC_OPTIONS = [
  { id: 'ai', label: 'AI' },
  { id: 'machine_learning', label: 'ML' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'startup', label: 'Startup' },
  { id: 'innovation', label: 'Innovation' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'technical', label: 'Technical' },
  { id: 'leadership', label: 'Leadership' },
];

// ─── Types ────────────────────────────────────────────────────────────
type EventItem = {
  event_id: string;
  title: string;
  description?: string;
  event_type: string;
  tint?: string;
  location_country?: string;
  location_city?: string;
  event_date_start?: string;
  event_date_end?: string;
  price_type: 'free' | 'paid';
  price_amount?: number;
  currency?: string;
  registration_url?: string;
  organizer_name?: string;
  attendee_count?: number;
  capacity?: number;
  spots_left?: number | null;
  image_url?: string;
  is_saved?: boolean;
  rsvp_status?: 'registered' | 'waitlisted' | 'cancelled' | null;
  is_featured?: boolean;
  match_score?: number;
  why?: string[];
  topic_keywords?: string[];
  event_mode?: 'virtual' | 'in_person' | 'hybrid';
  institution_tier?: 'top_tier' | 'tier_one' | 'tier_two' | 'regional';
};

// ─── Helpers ──────────────────────────────────────────────────────────
function fmtDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso || ''; }
}
function fmtRange(start?: string, end?: string): string {
  if (!start) return '';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const sf = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  if (!e || sf(s) === sf(e)) return sf(s) + ', ' + s.getFullYear();
  return `${sf(s)} – ${sf(e)}`;
}
function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  try {
    const d = new Date(iso).getTime() - Date.now();
    return Math.ceil(d / 86400000);
  } catch { return null; }
}

// ─── Main Screen ──────────────────────────────────────────────────────
export default function EventsScreen() {
  const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const cols = winW >= 1280 ? 3 : winW >= 800 ? 2 : 1;
  const featCols = winW >= 1280 ? 5 : winW >= 800 ? 3 : 1.5; // mobile shows 1.5 to hint scroll

  const [tab, setTab] = useState<'all' | 'saved' | 'registered' | 'hosted' | 'approvals'>('all');
  const [type, setType] = useState<string>('all');
  const [scope, setScope] = useState<'india' | 'global'>('india');
  const [city, setCity] = useState<string>('All');
  const [price, setPrice] = useState<'all' | 'free' | 'paid'>('all');
  const [mode, setMode] = useState<'all' | 'virtual' | 'in_person' | 'hybrid'>('all');
  const [tiers, setTiers] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [aiOn, setAiOn] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [hostedItems, setHostedItems] = useState<EventItem[]>([]);
  const [pendingItems, setPendingItems] = useState<EventItem[]>([]);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [featured, setFeatured] = useState<EventItem[]>([]);
  const [more, setMore] = useState<EventItem[]>([]);
  const [aiRecs, setAiRecs] = useState<EventItem[]>([]);
  const [savedItems, setSavedItems] = useState<EventItem[]>([]);
  const [registeredItems, setRegisteredItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [newCount, setNewCount] = useState<number>(0);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [showCityDD, setShowCityDD] = useState(false);
  const [showPriceDD, setShowPriceDD] = useState(false);

  const lastSig = useRef<string>('');

  const showToast = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }, []);

  // Build query string
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (type !== 'all') p.set('event_type', type);
    if (scope === 'india') p.set('location_country', 'India');
    if (scope === 'india' && city !== 'All') p.set('location_city', city);
    if (price !== 'all') p.set('price_type', price);
    if (mode !== 'all') p.set('event_mode', mode);
    if (tiers.length) p.set('institution_tier', tiers.join(','));
    if (topics.length) p.set('topic', topics.join(','));
    if (search.trim()) p.set('q', search.trim());
    p.set('limit', '24');
    p.set('page', '1');
    return p.toString();
  }, [type, scope, city, price, mode, tiers, topics, search]);

  const activeFilterCount = (price !== 'all' ? 1 : 0) + (mode !== 'all' ? 1 : 0) + tiers.length + topics.length + (city !== 'All' ? 1 : 0);
  const resetAllFilters = useCallback(() => {
    setType('all'); setCity('All'); setPrice('all'); setMode('all');
    setTiers([]); setTopics([]); setSearch('');
  }, []);

  const handleAuthErr = useCallback((e: any) => {
    const m = (e?.message || '').toLowerCase();
    if (m.includes('not authenticated') || m.includes('401')) {
      try { router.replace('/(auth)/login'); } catch {}
      return true;
    }
    return false;
  }, [router]);

  // Initial / filter-driven load
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [searchData, countsData] = await Promise.all([
        request<any>(`/events/search?${qs}`).catch(() => ({ results: [], total_count: 0, has_more: false })),
        request<any>('/events/category-counts').catch(() => ({})),
      ]);
      const items: EventItem[] = searchData.results || [];
      setCounts(countsData || {});
      setFeatured(items.filter((x) => x.is_featured).slice(0, 8));
      setMore(items.filter((x) => !x.is_featured));
      setHasMore(!!searchData.has_more);
      setPage(1);

      // change-signature for "new events" toast
      const sig = items.map((x) => x.event_id).slice(0, 10).join('|');
      if (lastSig.current && lastSig.current !== sig && !silent) {
        // first load skip toast
      } else if (lastSig.current && silent) {
        const fresh = items.filter((x) => !lastSig.current.includes(x.event_id));
        if (fresh.length > 0) setNewCount(fresh.length);
      }
      lastSig.current = sig;
    } catch (e: any) {
      if (!handleAuthErr(e)) {
        showToast(e?.message || 'Failed to load events');
      }
    } finally {
      setLoading(false);
    }
  }, [qs, handleAuthErr, showToast]);

  const loadAi = useCallback(async () => {
    try {
      const r = await request<{ items: EventItem[] }>('/events/me/recommendations?limit=10');
      setAiRecs(r.items || []);
    } catch (e: any) {
      handleAuthErr(e);
    }
  }, [handleAuthErr]);

  const loadSaved = useCallback(async () => {
    try {
      const r = await request<{ items: EventItem[] }>('/events/me/saved');
      setSavedItems(r.items || []);
    } catch (e) { handleAuthErr(e); }
  }, [handleAuthErr]);

  const loadRegistered = useCallback(async () => {
    try {
      const r = await request<{ items: EventItem[] }>('/events/me/registered');
      setRegisteredItems(r.items || []);
    } catch (e) { handleAuthErr(e); }
  }, [handleAuthErr]);

  const loadHosted = useCallback(async () => {
    try {
      const r = await request<{ items: EventItem[] }>('/events/me/hosted');
      setHostedItems(r.items || []);
    } catch (e) { handleAuthErr(e); }
  }, [handleAuthErr]);

  const loadPending = useCallback(async () => {
    try {
      const r = await request<{ items: EventItem[] }>('/admin/events/pending');
      setPendingItems(r.items || []);
    } catch (e) { handleAuthErr(e); }
  }, [handleAuthErr]);

  const loadMe = useCallback(async () => {
    try {
      const r = await request<any>('/auth/me');
      setMe(r);
    } catch (e) { handleAuthErr(e); }
  }, [handleAuthErr]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAi(); }, [loadAi]);
  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => { if (tab === 'saved') loadSaved(); }, [tab, loadSaved]);
  useEffect(() => { if (tab === 'registered') loadRegistered(); }, [tab, loadRegistered]);
  useEffect(() => { if (tab === 'hosted') loadHosted(); }, [tab, loadHosted]);
  useEffect(() => { if (tab === 'approvals') loadPending(); }, [tab, loadPending]);

  const canHost = me?.role === 'mentor' || me?.role === 'college' || me?.role === 'alumni' || me?.role === 'admin';
  const isAdmin = me?.role === 'admin';

  // Polling every 30s for new events (silent)
  useEffect(() => {
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const handleSave = async (ev: EventItem, e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    try {
      const r = await request<{ action: 'saved' | 'unsaved' }>(`/events/${ev.event_id}/save`, { method: 'POST' });
      const upd = (arr: EventItem[]) => arr.map((it) =>
        it.event_id === ev.event_id ? { ...it, is_saved: r.action === 'saved' } : it
      );
      setFeatured(upd); setMore(upd); setAiRecs(upd); setSavedItems(upd);
      showToast(r.action === 'saved' ? '✓ Saved to your list' : 'Removed from saved');
      if (r.action === 'unsaved' && tab === 'saved') loadSaved();
    } catch (err) { handleAuthErr(err); }
  };

  const handleRegister = async (ev: EventItem, useCredits = false) => {
    try {
      const r = await request<any>(`/events/${ev.event_id}/rsvp`, {
        method: 'POST', body: { use_credits: useCredits },
      });
      const status: 'registered' | 'waitlisted' = r.status;
      const upd = (arr: EventItem[]) => arr.map((it) =>
        it.event_id === ev.event_id ? { ...it, rsvp_status: status, attendee_count: (it.attendee_count || 0) + (status === 'registered' ? 1 : 0) } : it
      );
      setFeatured(upd); setMore(upd); setAiRecs(upd);
      if (status === 'waitlisted') {
        showToast(`Event full — added to waitlist (#${r.waitlist_position})`);
      } else {
        showToast(`✓ Registered! Confirmation: ${r.confirmation_id}`);
      }
      // Update detail panel
      if (selected?.event_id === ev.event_id) {
        setSelected({ ...selected, rsvp_status: status });
      }
      loadRegistered();
    } catch (err: any) {
      if (!handleAuthErr(err)) showToast(err?.message || 'Could not register');
    }
  };

  const handleCancelRsvp = async (ev: EventItem) => {
    try {
      const r = await request<any>(`/events/${ev.event_id}/cancel-rsvp`, { method: 'POST' });
      const upd = (arr: EventItem[]) => arr.map((it) =>
        it.event_id === ev.event_id ? { ...it, rsvp_status: null } : it
      );
      setFeatured(upd); setMore(upd); setAiRecs(upd);
      showToast(r.refunded_credits ? `Cancelled — ${r.refunded_credits} credits refunded` : 'Cancelled');
      if (selected?.event_id === ev.event_id) setSelected({ ...selected, rsvp_status: null });
      loadRegistered();
    } catch (err: any) {
      if (!handleAuthErr(err)) showToast(err?.message || 'Could not cancel');
    }
  };

  const handleDownloadIcs = async (ev: EventItem) => {
    const tok = await tokenStore.getAccess();
    const url = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/events/${ev.event_id}/ics`;
    if (Platform.OS === 'web') {
      try {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${tok || ''}` } });
        const blob = await r.blob();
        const a = document.createElement('a');
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        a.download = `${ev.event_id}.ics`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objUrl);
        showToast('Calendar event downloaded');
      } catch { showToast('Download failed'); }
    } else {
      Linking.openURL(url);
    }
  };

  const handleShare = async (ev: EventItem) => {
    const text = `${ev.title} — ${fmtRange(ev.event_date_start, ev.event_date_end)} @ ${ev.location_city}`;
    const url = ev.registration_url || '';
    if (Platform.OS === 'web' && (navigator as any).share) {
      try { await (navigator as any).share({ title: ev.title, text, url }); return; } catch {}
    }
    if (Platform.OS === 'web' && (navigator as any).clipboard) {
      try { await (navigator as any).clipboard.writeText(`${text}\n${url}`); showToast('Link copied'); return; } catch {}
    }
    Linking.openURL(url || 'https://google.com');
  };

  // Listings to render
  const listToShow: EventItem[] = useMemo(() => {
    if (tab === 'saved') return savedItems;
    if (tab === 'registered') return registeredItems;
    if (tab === 'hosted') return hostedItems;
    if (tab === 'approvals') return pendingItems;
    if (aiOn) return aiRecs;
    return more;
  }, [tab, aiOn, more, aiRecs, savedItems, registeredItems, hostedItems, pendingItems]);

  const handleApprove = async (ev: EventItem) => {
    try {
      await request<any>(`/admin/events/${ev.event_id}/approve`, { method: 'POST' });
      showToast('✓ Event approved & published');
      loadPending();
      load();
    } catch (e: any) { showToast(e?.message || 'Approve failed'); }
  };

  const handleReject = async (ev: EventItem) => {
    try {
      await request<any>(`/admin/events/${ev.event_id}/reject`, {
        method: 'POST', body: { reason: 'Rejected by admin' },
      });
      showToast('✗ Event rejected');
      loadPending();
    } catch (e: any) { showToast(e?.message || 'Reject failed'); }
  };

  const handleHostCreate = async (form: any) => {
    try {
      const r = await request<any>('/events', { method: 'POST', body: form });
      if (r.needs_approval) {
        showToast('Submitted for admin approval');
      } else {
        showToast('✓ Event published successfully!');
      }
      setShowHostModal(false);
      loadHosted();
      load();
    } catch (e: any) {
      showToast(e?.message || 'Failed to create event');
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>Events</Text>
            <Text style={s.subtitle}>Discover hackathons, talks, workshops & meetups</Text>
          </View>
          {canHost && (
            <Pressable onPress={() => setShowHostModal(true)} style={s.hostBtn}>
              <MaterialCommunityIcons name="plus-circle" size={16} color="#fff" />
              <Text style={s.hostBtnText}>{me?.role === 'college' ? 'Publish Event' : 'Host Event'}</Text>
            </Pressable>
          )}
          {newCount > 0 && (
            <Pressable onPress={() => { setNewCount(0); load(); }} style={s.newPill}>
              <MaterialCommunityIcons name="bell-ring" size={14} color="#fff" />
              <Text style={s.newPillText}>{newCount} new</Text>
            </Pressable>
          )}
        </View>

        {/* Search */}
        <View style={[s.searchWrap, { marginHorizontal: 16 }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={C.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search events, organizers, cities…"
            placeholderTextColor={C.textDim}
            style={s.searchInput}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={C.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Advisor + AI block */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <AdvisorAIBlock
            context="events"
            advisorTitle="Talk to an Events Advisor"
            advisorDesc="Need help discovering the right hackathons or workshops? Our advisors curate them for you."
            aiTitle="Ask the Events AI"
            aiDesc="What's trending this week? Which event matches my profile? Ask anything 24×7."
            advisorAccent="#A78BFA"
            aiAccent="#10B981"
            advisorIcon="calendar-account"
            aiIcon="robot-excited"
          />
        </View>

        {/* Tabs */}
        <View style={s.tabsRow}>
          {[
            { id: 'all', label: 'Discover', n: counts.all || 0, show: true },
            { id: 'saved', label: 'Saved', n: savedItems.length, show: true },
            { id: 'registered', label: 'Registered', n: registeredItems.length, show: true },
            { id: 'hosted', label: 'My Events', n: hostedItems.length, show: canHost },
            { id: 'approvals', label: 'Approvals', n: pendingItems.length, show: isAdmin },
          ].filter((t) => t.show).map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id as any)}
              style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
            >
              <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
              {t.n > 0 && (
                <View style={[s.tabBadge, tab === t.id && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeText, tab === t.id && { color: '#fff' }]}>{t.n}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Type pills */}
        {tab === 'all' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            style={{ marginTop: 14 }}
          >
            {[{ id: 'all', label: 'All' }].concat(
              Object.entries(TYPE_LABELS).map(([id, label]) => ({ id, label }))
            ).map((t) => {
              const active = type === t.id;
              const tint = TYPE_TINTS[t.id] || C.primary;
              const n = t.id === 'all' ? counts.all || 0 : counts[t.id] || 0;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setType(t.id)}
                  style={[s.pill, active && { backgroundColor: tint, borderColor: tint }]}
                >
                  {t.id !== 'all' && (
                    <MaterialCommunityIcons
                      name={TYPE_ICONS[t.id]} size={14}
                      color={active ? '#fff' : tint}
                    />
                  )}
                  <Text style={[s.pillText, active && { color: '#fff' }]}>{t.label}</Text>
                  {n > 0 && (
                    <View style={[s.pillCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <Text style={[s.pillCountText, active && { color: '#fff' }]}>{n}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* India / Global toggle + Price + AI */}
        {tab === 'all' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12 }}>
            <View style={s.scopeToggle}>
              <Pressable
                onPress={() => setScope('india')}
                style={[s.scopeBtn, scope === 'india' && s.scopeBtnActive]}
              >
                <Text style={s.scopeFlag}>🇮🇳</Text>
                <Text style={[s.scopeText, scope === 'india' && { color: '#fff' }]}>India</Text>
              </Pressable>
              <Pressable
                onPress={() => setScope('global')}
                style={[s.scopeBtn, scope === 'global' && s.scopeBtnActive]}
              >
                <MaterialCommunityIcons name="earth" size={14} color={scope === 'global' ? '#fff' : C.textMuted} />
                <Text style={[s.scopeText, scope === 'global' && { color: '#fff' }]}>Global</Text>
              </Pressable>
            </View>

            {scope === 'india' && (
              <Pressable onPress={() => setShowCityDD(!showCityDD)} style={s.ddBtn}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={C.textMuted} />
                <Text style={s.ddBtnText}>{city}</Text>
                <MaterialCommunityIcons name="chevron-down" size={14} color={C.textMuted} />
              </Pressable>
            )}

            <Pressable onPress={() => setShowPriceDD(!showPriceDD)} style={s.ddBtn}>
              <MaterialCommunityIcons name="cash" size={14} color={C.textMuted} />
              <Text style={s.ddBtnText}>{price === 'all' ? 'All prices' : price === 'free' ? 'Free' : 'Paid'}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={C.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => setAiOn(!aiOn)}
              style={[s.aiBtn, aiOn && { backgroundColor: C.primary, borderColor: C.primary }]}
            >
              <MaterialCommunityIcons name={aiOn ? 'star' : 'star-outline'} size={14} color={aiOn ? '#fff' : '#FCD34D'} />
              <Text style={[s.aiBtnText, aiOn && { color: '#fff' }]}>AI Best Events for Me</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowFilterPanel(true)}
              style={[s.ddBtn, activeFilterCount > 0 && { borderColor: C.primary }]}
            >
              <MaterialCommunityIcons name="tune-variant" size={14} color={activeFilterCount > 0 ? C.primary : C.textMuted} />
              <Text style={[s.ddBtnText, activeFilterCount > 0 && { color: C.primary }]}>
                Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
              </Text>
            </Pressable>
          </View>
        )}

        {/* City DD popover */}
        {showCityDD && (
          <View style={s.ddPanel}>
            {INDIAN_CITIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => { setCity(c); setShowCityDD(false); }}
                style={[s.ddOpt, city === c && s.ddOptActive]}
              >
                <Text style={[s.ddOptText, city === c && { color: '#fff' }]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {showPriceDD && (
          <View style={s.ddPanel}>
            {[
              { id: 'all', label: 'All Events' },
              { id: 'free', label: 'Free Events Only' },
              { id: 'paid', label: 'Paid Events Only' },
            ].map((p) => (
              <Pressable
                key={p.id}
                onPress={() => { setPrice(p.id as any); setShowPriceDD(false); }}
                style={[s.ddOpt, price === p.id && s.ddOptActive]}
              >
                <Text style={[s.ddOptText, price === p.id && { color: '#fff' }]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Featured carousel */}
        {tab === 'all' && !aiOn && featured.length > 0 && (
          <FeaturedCarousel
            items={featured}
            visibleCols={featCols}
            onSelect={setSelected}
            onSave={handleSave}
          />
        )}

        {/* Listing */}
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
        ) : (
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>
                {tab === 'saved' ? 'Saved Events' :
                 tab === 'registered' ? 'My Registrations' :
                 aiOn ? '✨ AI Best Events for You' : 'More Events'}
              </Text>
              <Text style={s.sectionSub}>{listToShow.length} {listToShow.length === 1 ? 'event' : 'events'}</Text>
            </View>

            {listToShow.length === 0 ? (
              <View style={s.empty}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={56} color={C.textDim} />
                <Text style={s.emptyTitle}>
                  {tab === 'saved' ? 'No saved events yet' :
                   tab === 'registered' ? 'No registrations yet' : 'No matching events'}
                </Text>
                <Text style={s.emptySub}>
                  {tab === 'saved' ? 'Tap the bookmark on any card to save it.' :
                   tab === 'registered' ? 'RSVP to events to see them here.' :
                   'Try adjusting your filters or search.'}
                </Text>
              </View>
            ) : (
              <View style={[s.grid, { gap: 14 }]}>
                {listToShow.map((ev) => (
                  <View key={ev.event_id} style={{ width: cols === 1 ? '100%' : cols === 2 ? '48.5%' : '32.5%' }}>
                    <EventCard
                      ev={ev}
                      onPress={() => setSelected(ev)}
                      onSave={(e) => handleSave(ev, e)}
                    />
                    {tab === 'approvals' && (
                      <View style={s.approvalRow}>
                        <Pressable onPress={() => handleApprove(ev)} style={[s.approveBtn, { backgroundColor: C.green }]}>
                          <MaterialCommunityIcons name="check" size={14} color="#fff" />
                          <Text style={s.approveBtnText}>Approve</Text>
                        </Pressable>
                        <Pressable onPress={() => handleReject(ev)} style={[s.approveBtn, { backgroundColor: C.red }]}>
                          <MaterialCommunityIcons name="close" size={14} color="#fff" />
                          <Text style={s.approveBtnText}>Reject</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Detail SidePanel */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <DetailPanel
            ev={selected}
            onClose={() => setSelected(null)}
            onSave={(e) => handleSave(selected, e)}
            onRegister={(useCredits) => handleRegister(selected, useCredits)}
            onCancel={() => handleCancelRsvp(selected)}
            onDownloadIcs={() => handleDownloadIcs(selected)}
            onShare={() => handleShare(selected)}
            isWide={winW >= 900}
          />
        )}
      </Modal>

      {/* Filter Panel */}
      <Modal visible={showFilterPanel} transparent animationType="slide" onRequestClose={() => setShowFilterPanel(false)}>
        <FilterPanel
          mode={mode} setMode={setMode}
          tiers={tiers} setTiers={setTiers}
          topics={topics} setTopics={setTopics}
          city={city} setCity={setCity}
          price={price} setPrice={setPrice}
          isWide={winW >= 900}
          onClose={() => setShowFilterPanel(false)}
          onClear={resetAllFilters}
          activeCount={activeFilterCount}
        />
      </Modal>

      {/* Host Event Modal */}
      <Modal visible={showHostModal} transparent animationType="slide" onRequestClose={() => setShowHostModal(false)}>
        <HostEventModal
          isWide={winW >= 900}
          role={me?.role || ''}
          onClose={() => setShowHostModal(false)}
          onSubmit={handleHostCreate}
        />
      </Modal>

      {/* Toast */}
      {toast && (
        <View style={s.toast}>
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Featured Carousel Component ──────────────────────────────────────
function FeaturedCarousel({
  items, visibleCols, onSelect, onSave,
}: {
  items: EventItem[];
  visibleCols: number;
  onSelect: (ev: EventItem) => void;
  onSave: (ev: EventItem, e?: any) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [paused, setPaused] = useState(false);
  const idx = useRef(0);
  const cardW = 280;
  const gap = 14;

  useEffect(() => {
    if (paused || items.length <= visibleCols) return;
    const t = setInterval(() => {
      idx.current = (idx.current + 1) % Math.max(1, items.length - Math.floor(visibleCols) + 1);
      scrollRef.current?.scrollTo({ x: idx.current * (cardW + gap), animated: true });
    }, 8000);
    return () => clearInterval(t);
  }, [paused, items.length, visibleCols]);

  return (
    <View style={{ marginTop: 26 }}>
      <View style={[s.sectionHead, { paddingHorizontal: 16 }]}>
        <View>
          <Text style={s.sectionTitle}>Featured Events</Text>
          <Text style={s.sectionSub}>Handpicked for your interests</Text>
        </View>
        <View style={s.carouselArrows}>
          <Pressable
            onPress={() => {
              idx.current = Math.max(0, idx.current - 1);
              scrollRef.current?.scrollTo({ x: idx.current * (cardW + gap), animated: true });
            }}
            style={s.arrowBtn}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={C.primary} />
          </Pressable>
          <Pressable
            onPress={() => {
              idx.current = Math.min(items.length - 1, idx.current + 1);
              scrollRef.current?.scrollTo({ x: idx.current * (cardW + gap), animated: true });
            }}
            style={s.arrowBtn}
          >
            <MaterialCommunityIcons name="chevron-right" size={20} color={C.primary} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap, marginTop: 12 }}
        onScrollBeginDrag={() => setPaused(true)}
        onScrollEndDrag={() => setPaused(false)}
        // @ts-ignore web hover
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {items.map((ev) => (
          <View key={ev.event_id} style={{ width: cardW }}>
            <EventCard ev={ev} onPress={() => onSelect(ev)} onSave={(e) => onSave(ev, e)} featured />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────
function EventCard({
  ev, onPress, onSave, featured = false,
}: {
  ev: EventItem;
  onPress: () => void;
  onSave: (e?: any) => void;
  featured?: boolean;
}) {
  const tint = ev.tint || TYPE_TINTS[ev.event_type] || C.primary;
  const icon = TYPE_ICONS[ev.event_type] || 'calendar';
  const dDays = daysUntil(ev.event_date_start);
  const isFree = ev.price_type === 'free';

  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [
      s.card,
      hovered && Platform.OS === 'web' && s.cardHover,
    ]}>
      {/* Image banner if available */}
      {ev.image_url ? (
        <Image source={{ uri: ev.image_url }} style={s.cardImg} />
      ) : (
        <LinearGradient
          colors={[tint + '40', tint + '15']}
          style={s.cardImg}
        >
          <MaterialCommunityIcons name={icon} size={42} color={tint} style={{ alignSelf: 'center', marginTop: 36 }} />
        </LinearGradient>
      )}

      {/* Top row: type chip + featured + price */}
      <View style={s.cardTopRow}>
        <View style={[s.typeChip, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
          <MaterialCommunityIcons name={icon} size={12} color={tint} />
          <Text style={[s.typeChipText, { color: tint }]}>{TYPE_LABELS[ev.event_type] || ev.event_type}</Text>
        </View>
        {featured && (
          <View style={s.featPill}>
            <MaterialCommunityIcons name="star" size={11} color="#fff" />
            <Text style={s.featPillText}>Featured</Text>
          </View>
        )}
      </View>

      <View style={[s.priceTopRight]}>
        {isFree ? (
          <View style={[s.priceBadge, { backgroundColor: C.green + '22', borderColor: C.green }]}>
            <Text style={[s.priceBadgeText, { color: C.green }]}>FREE</Text>
          </View>
        ) : (
          <View style={[s.priceBadge, { backgroundColor: C.primary + '22', borderColor: C.primary }]}>
            <Text style={[s.priceBadgeText, { color: '#A78BFA' }]}>₹{ev.price_amount}</Text>
          </View>
        )}
      </View>

      {/* Save bookmark */}
      <Pressable onPress={(e) => onSave(e)} style={s.saveBtn} hitSlop={8}>
        <MaterialCommunityIcons name={ev.is_saved ? 'bookmark' : 'bookmark-outline'} size={18} color={ev.is_saved ? C.amber : '#fff'} />
      </Pressable>

      <View style={{ padding: 14, paddingTop: 10 }}>
        <Text style={s.cardTitle} numberOfLines={2}>{ev.title}</Text>
        {ev.match_score !== undefined && (
          <View style={s.matchPill}>
            <Text style={s.matchPillText}>★ {ev.match_score}% match</Text>
          </View>
        )}
        <View style={s.metaRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={13} color={C.textMuted} />
          <Text style={s.metaText} numberOfLines={1}>
            {ev.location_city || 'Online'}{ev.location_country ? ` · ${ev.location_country}` : ''}
          </Text>
        </View>
        <View style={s.metaRow}>
          <MaterialCommunityIcons name="calendar-outline" size={13} color={C.textMuted} />
          <Text style={s.metaText}>{fmtRange(ev.event_date_start, ev.event_date_end)}</Text>
          {dDays !== null && dDays >= 0 && dDays <= 7 && (
            <View style={[s.urgent, dDays <= 3 && { backgroundColor: C.red + '33', borderColor: C.red }]}>
              <Text style={[s.urgentText, dDays <= 3 && { color: '#FCA5A5' }]}>
                {dDays === 0 ? 'today' : dDays === 1 ? 'tomorrow' : `in ${dDays}d`}
              </Text>
            </View>
          )}
        </View>
        {ev.description ? (
          <Text style={s.desc} numberOfLines={2}>{ev.description}</Text>
        ) : null}

        {ev.topic_keywords && ev.topic_keywords.length > 0 && (
          <View style={s.topicRow}>
            {ev.topic_keywords.slice(0, 3).map((tk) => (
              <View key={tk} style={s.topicPill}>
                <Text style={s.topicPillText}>{tk.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.cardFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="account-multiple" size={13} color={C.textMuted} />
            <Text style={s.metaText}>{ev.attendee_count || 0}</Text>
            {ev.spots_left !== null && ev.spots_left !== undefined && ev.spots_left <= 20 && ev.spots_left > 0 && (
              <Text style={[s.metaText, { color: C.amber, fontWeight: '700', marginLeft: 4 }]}>
                · {ev.spots_left} spots left
              </Text>
            )}
          </View>
          {ev.rsvp_status ? (
            <View style={[s.regChip, ev.rsvp_status === 'waitlisted' && { backgroundColor: C.amber + '22', borderColor: C.amber }]}>
              <MaterialCommunityIcons name="check-circle" size={12} color={ev.rsvp_status === 'waitlisted' ? C.amber : C.green} />
              <Text style={[s.regChipText, { color: ev.rsvp_status === 'waitlisted' ? C.amber : C.green }]}>
                {ev.rsvp_status === 'waitlisted' ? 'Waitlisted' : 'Registered'}
              </Text>
            </View>
          ) : (
            <View style={s.registerBtnSmall}>
              <Text style={s.registerBtnSmallText}>Register</Text>
              <MaterialCommunityIcons name="arrow-right" size={14} color="#fff" />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Detail Side Panel ────────────────────────────────────────────────
function DetailPanel({
  ev, onClose, onSave, onRegister, onCancel, onDownloadIcs, onShare, isWide,
}: {
  ev: EventItem;
  onClose: () => void;
  onSave: (e?: any) => void;
  onRegister: (useCredits: boolean) => void;
  onCancel: () => void;
  onDownloadIcs: () => void;
  onShare: () => void;
  isWide: boolean;
}) {
  const [tab, setTab] = useState<'overview' | 'register' | 'track'>('overview');
  const tint = ev.tint || TYPE_TINTS[ev.event_type] || C.primary;
  const icon = TYPE_ICONS[ev.event_type] || 'calendar';
  const isFree = ev.price_type === 'free';
  const [useCredits, setUseCredits] = useState(false);

  return (
    <Pressable onPress={onClose} style={s.modalBackdrop}>
      <Pressable onPress={(e) => e.stopPropagation()} style={[
        s.panel,
        isWide ? { right: 0, top: 0, height: '100%', width: 600, position: 'absolute' as any } :
                 { bottom: 0, left: 0, right: 0, height: '92%', position: 'absolute' as any },
      ]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          {/* Banner */}
          <View style={{ position: 'relative' }}>
            {ev.image_url ? (
              <Image source={{ uri: ev.image_url }} style={s.panelBanner} />
            ) : (
              <LinearGradient colors={[tint + '60', tint + '20']} style={s.panelBanner}>
                <MaterialCommunityIcons name={icon} size={64} color={tint} style={{ alignSelf: 'center', marginTop: 64 }} />
              </LinearGradient>
            )}
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Header */}
          <View style={{ padding: 20 }}>
            <View style={[s.typeChip, { backgroundColor: tint + '22', borderColor: tint + '55', alignSelf: 'flex-start' }]}>
              <MaterialCommunityIcons name={icon} size={12} color={tint} />
              <Text style={[s.typeChipText, { color: tint }]}>{TYPE_LABELS[ev.event_type]}</Text>
            </View>
            <Text style={s.panelTitle}>{ev.title}</Text>
            <Text style={s.panelOrg}>by {ev.organizer_name || 'Unknown'}</Text>

            <View style={[s.metaRow, { marginTop: 10 }]}>
              <MaterialCommunityIcons name="map-marker" size={14} color={C.textMuted} />
              <Text style={s.metaText}>
                {ev.location_city || 'Online'}{ev.location_country ? ` · ${ev.location_country}` : ''}
              </Text>
            </View>
            <View style={s.metaRow}>
              <MaterialCommunityIcons name="calendar" size={14} color={C.textMuted} />
              <Text style={s.metaText}>{fmtRange(ev.event_date_start, ev.event_date_end)}</Text>
            </View>
            {ev.capacity ? (
              <View style={s.metaRow}>
                <MaterialCommunityIcons name="account-multiple" size={14} color={C.textMuted} />
                <Text style={s.metaText}>{ev.attendee_count}/{ev.capacity} attendees{ev.spots_left ? ` · ${ev.spots_left} left` : ''}</Text>
              </View>
            ) : null}
          </View>

          {/* Tabs */}
          <View style={s.panelTabsRow}>
            {[
              { id: 'overview', label: 'Overview', icon: 'text-box-outline' },
              { id: 'register', label: 'Register', icon: 'ticket-outline' },
              { id: 'track', label: 'Track', icon: 'check-circle-outline' },
            ].map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id as any)}
                style={[s.panelTab, tab === t.id && { borderBottomColor: C.primary }]}
              >
                <MaterialCommunityIcons name={t.icon as any} size={14} color={tab === t.id ? C.primary : C.textMuted} />
                <Text style={[s.panelTabText, tab === t.id && { color: C.primary }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Tab content */}
          <View style={{ padding: 20, gap: 14 }}>
            {tab === 'overview' && (
              <>
                <Text style={s.panelDesc}>{ev.description || 'No description provided.'}</Text>
                <View style={s.detailCard}>
                  <View style={s.detailRow}>
                    <Text style={s.detailKey}>Date</Text>
                    <Text style={s.detailVal}>{fmtRange(ev.event_date_start, ev.event_date_end)}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailKey}>Location</Text>
                    <Text style={s.detailVal}>{ev.location_city}, {ev.location_country}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailKey}>Price</Text>
                    <Text style={s.detailVal}>
                      {isFree ? <Text style={{ color: C.green, fontWeight: '700' }}>Free</Text> :
                        <Text style={{ color: '#A78BFA', fontWeight: '700' }}>₹{ev.price_amount}</Text>}
                    </Text>
                  </View>
                  {ev.capacity ? (
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>Capacity</Text>
                      <Text style={s.detailVal}>{ev.capacity} attendees</Text>
                    </View>
                  ) : null}
                </View>
                {ev.why && ev.why.length > 0 && (
                  <View style={s.detailCard}>
                    <Text style={s.detailKey}>Why we recommend this</Text>
                    {ev.why.map((w, i) => (
                      <Text key={i} style={[s.detailVal, { marginTop: 4 }]}>• {w}</Text>
                    ))}
                  </View>
                )}
              </>
            )}

            {tab === 'register' && (
              <>
                {ev.rsvp_status ? (
                  <View style={s.registeredBanner}>
                    <MaterialCommunityIcons name="check-circle" size={20} color={C.green} />
                    <Text style={s.registeredBannerText}>
                      You're {ev.rsvp_status === 'waitlisted' ? 'on the waitlist' : 'registered'}
                    </Text>
                  </View>
                ) : (
                  <>
                    {ev.registration_url && (
                      <Pressable onPress={() => Linking.openURL(ev.registration_url!)} style={s.linkBtn}>
                        <MaterialCommunityIcons name="open-in-new" size={16} color={C.primary} />
                        <Text style={s.linkBtnText}>Register on {ev.organizer_name || 'organizer'}'s site</Text>
                      </Pressable>
                    )}
                    {!isFree && (
                      <Pressable onPress={() => setUseCredits(!useCredits)} style={s.creditToggle}>
                        <View style={[s.checkbox, useCredits && { backgroundColor: C.primary }]}>
                          {useCredits && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
                        </View>
                        <Text style={s.creditToggleText}>Use SA Credits to pay (₹{ev.price_amount})</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => onRegister(useCredits)} style={[s.registerCta, { backgroundColor: C.primary }]}>
                      <Text style={s.registerCtaText}>
                        {isFree ? 'Register — Free' : useCredits ? `Pay & Register (${ev.price_amount} credits)` : `Register Here · ₹${ev.price_amount}`}
                      </Text>
                      <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                    </Pressable>
                  </>
                )}
              </>
            )}

            {tab === 'track' && (
              <>
                {!ev.rsvp_status ? (
                  <Text style={s.panelDesc}>You haven't registered yet. Switch to the Register tab.</Text>
                ) : (
                  <>
                    <View style={s.detailCard}>
                      <View style={s.detailRow}>
                        <Text style={s.detailKey}>Status</Text>
                        <Text style={[s.detailVal, { color: ev.rsvp_status === 'waitlisted' ? C.amber : C.green, fontWeight: '700' }]}>
                          {ev.rsvp_status === 'waitlisted' ? 'Waitlisted' : 'Registered'}
                        </Text>
                      </View>
                    </View>
                    <Pressable onPress={onDownloadIcs} style={s.linkBtn}>
                      <MaterialCommunityIcons name="calendar-export" size={16} color={C.primary} />
                      <Text style={s.linkBtnText}>Add to Calendar (.ics)</Text>
                    </Pressable>
                    <Pressable onPress={onShare} style={s.linkBtn}>
                      <MaterialCommunityIcons name="share-variant" size={16} color={C.primary} />
                      <Text style={s.linkBtnText}>Share event</Text>
                    </Pressable>
                    <Pressable onPress={onCancel} style={[s.linkBtn, { borderColor: C.red + '55' }]}>
                      <MaterialCommunityIcons name="close-circle" size={16} color={C.red} />
                      <Text style={[s.linkBtnText, { color: C.red }]}>Cancel registration</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}


// ─── FilterPanel: slide-in left sidebar with collapsible sections ────
function FilterPanel({
  mode, setMode, tiers, setTiers, topics, setTopics, city, setCity, price, setPrice,
  isWide, onClose, onClear, activeCount,
}: {
  mode: any; setMode: (m: any) => void;
  tiers: string[]; setTiers: (t: string[]) => void;
  topics: string[]; setTopics: (t: string[]) => void;
  city: string; setCity: (c: string) => void;
  price: any; setPrice: (p: any) => void;
  isWide: boolean;
  onClose: () => void;
  onClear: () => void;
  activeCount: number;
}) {
  const toggleArr = (arr: string[], setArr: (a: string[]) => void, id: string) => {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };
  return (
    <Pressable onPress={onClose} style={s.modalBackdrop}>
      <Pressable onPress={(e) => e.stopPropagation()} style={[
        s.panel,
        isWide ? { left: 0, top: 0, height: '100%', width: 360, position: 'absolute' as any } :
                 { bottom: 0, left: 0, right: 0, height: '88%', position: 'absolute' as any },
      ]}>
        <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>Filters</Text>
            {activeCount > 0 && (
              <View style={{ backgroundColor: C.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{activeCount}</Text>
              </View>
            )}
          </View>
          <Pressable onPress={onClear}><Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>Clear all</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 22, paddingBottom: 100 }}>
          {/* Institution Tier */}
          <View>
            <Text style={s.fpSectionTitle}>Institution Tier</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {TIER_OPTIONS.map((t) => {
                const active = tiers.includes(t.id);
                return (
                  <Pressable key={t.id} onPress={() => toggleArr(tiers, setTiers, t.id)} style={s.fpRow}>
                    <View style={[s.checkbox, active && { backgroundColor: C.primary, borderColor: C.primary }]}>
                      {active && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
                    </View>
                    <Text style={s.fpRowText}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Event Mode */}
          <View>
            <Text style={s.fpSectionTitle}>Event Mode</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {MODE_OPTIONS.map((m) => {
                const active = mode === m.id;
                return (
                  <Pressable key={m.id} onPress={() => setMode(m.id)} style={s.fpRow}>
                    <View style={[s.radio, active && { borderColor: C.primary }]}>
                      {active && <View style={s.radioDot} />}
                    </View>
                    <Text style={s.fpRowText}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Price Type */}
          <View>
            <Text style={s.fpSectionTitle}>Price Type</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {[{ id: 'all', label: 'All' }, { id: 'free', label: 'Free' }, { id: 'paid', label: 'Paid' }].map((p) => {
                const active = price === p.id;
                return (
                  <Pressable key={p.id} onPress={() => setPrice(p.id)} style={s.fpRow}>
                    <View style={[s.radio, active && { borderColor: C.primary }]}>
                      {active && <View style={s.radioDot} />}
                    </View>
                    <Text style={s.fpRowText}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Region India */}
          <View>
            <Text style={s.fpSectionTitle}>Region (India)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {INDIAN_CITIES.map((c) => (
                <Pressable key={c} onPress={() => setCity(c)} style={[s.tagChip, city === c && { backgroundColor: C.primary, borderColor: C.primary }]}>
                  <Text style={[s.tagChipText, city === c && { color: '#fff' }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Topic Keywords */}
          <View>
            <Text style={s.fpSectionTitle}>Topic Keywords</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {TOPIC_OPTIONS.map((t) => {
                const active = topics.includes(t.id);
                return (
                  <Pressable key={t.id} onPress={() => toggleArr(topics, setTopics, t.id)} style={[s.tagChip, active && { backgroundColor: C.primary, borderColor: C.primary }]}>
                    <Text style={[s.tagChipText, active && { color: '#fff' }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, gap: 8, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border }}>
          <Pressable onPress={onClose} style={[s.registerCta, { backgroundColor: C.primary }]}>
            <Text style={s.registerCtaText}>Apply Filters</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}



// ─── HostEventModal: form for mentors / colleges / alumni / admin ────
function HostEventModal({
  isWide, role, onClose, onSubmit,
}: {
  isWide: boolean;
  role: string;
  onClose: () => void;
  onSubmit: (form: any) => void;
}) {
  const [form, setForm] = useState<any>({
    title: '', description: '', event_type: 'workshop',
    location_country: 'India', location_city: 'Bangalore',
    event_date_start: '', event_date_end: '',
    price_type: 'free', price_amount: 0,
    capacity: 100, registration_url: '', image_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isCollege = role === 'college';
  const allowedTypes = isCollege
    ? ['hackathon', 'fest', 'codethon', 'workshop', 'training', 'meetup']
    : ['workshop', 'tech_talk', 'founder_talk', 'training', 'meetup', 'boot_camp'];

  const update = (k: string, v: any) => setForm({ ...form, [k]: v });

  const submit = async () => {
    if (!form.title.trim()) { setErr('Please enter a title'); return; }
    if (!form.event_date_start) { setErr('Please pick a start date'); return; }
    setErr(null); setSubmitting(true);
    const startIso = new Date(form.event_date_start).toISOString();
    const endIso = form.event_date_end ? new Date(form.event_date_end).toISOString() : startIso;
    try {
      await onSubmit({
        ...form,
        event_date_start: startIso,
        event_date_end: endIso,
        price_amount: form.price_type === 'paid' ? Number(form.price_amount) || 0 : 0,
        capacity: Number(form.capacity) || 0,
      });
    } finally { setSubmitting(false); }
  };

  return (
    <Pressable onPress={onClose} style={s.modalBackdrop}>
      <Pressable onPress={(e) => e.stopPropagation()} style={[
        s.panel,
        isWide ? { right: 0, top: 0, height: '100%', width: 560, position: 'absolute' as any } :
                 { bottom: 0, left: 0, right: 0, height: '94%', position: 'absolute' as any },
      ]}>
        <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
              {isCollege ? 'Publish Event' : 'Host an Event'}
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
              {isCollege ? 'Submitted for admin approval' : 'Goes live immediately'}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <MaterialCommunityIcons name="close" size={22} color={C.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 120 }}>
          {/* Title */}
          <View>
            <Text style={s.fpSectionTitle}>Title <Text style={{ color: C.red }}>*</Text></Text>
            <TextInput
              value={form.title}
              onChangeText={(v) => update('title', v)}
              placeholder="e.g. AI/ML Bootcamp 2026"
              placeholderTextColor={C.textDim}
              style={s.formInput}
            />
          </View>

          {/* Description */}
          <View>
            <Text style={s.fpSectionTitle}>Description</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => update('description', v)}
              placeholder="What attendees will learn / experience"
              placeholderTextColor={C.textDim}
              multiline numberOfLines={4}
              style={[s.formInput, { minHeight: 88, textAlignVertical: 'top' }]}
            />
          </View>

          {/* Event Type */}
          <View>
            <Text style={s.fpSectionTitle}>Event Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {allowedTypes.map((t) => {
                const active = form.event_type === t;
                const tint = TYPE_TINTS[t];
                return (
                  <Pressable key={t} onPress={() => update('event_type', t)}
                    style={[s.tagChip, active && { backgroundColor: tint, borderColor: tint }]}>
                    <Text style={[s.tagChipText, active && { color: '#fff' }]}>{TYPE_LABELS[t]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Date pickers */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fpSectionTitle}>Start Date <Text style={{ color: C.red }}>*</Text></Text>
              <TextInput
                value={form.event_date_start}
                onChangeText={(v) => update('event_date_start', v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textDim}
                style={s.formInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fpSectionTitle}>End Date</Text>
              <TextInput
                value={form.event_date_end}
                onChangeText={(v) => update('event_date_end', v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textDim}
                style={s.formInput}
              />
            </View>
          </View>

          {/* Location */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fpSectionTitle}>City</Text>
              <TextInput
                value={form.location_city}
                onChangeText={(v) => update('location_city', v)}
                placeholder="Bangalore"
                placeholderTextColor={C.textDim}
                style={s.formInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fpSectionTitle}>Country</Text>
              <TextInput
                value={form.location_country}
                onChangeText={(v) => update('location_country', v)}
                placeholder="India"
                placeholderTextColor={C.textDim}
                style={s.formInput}
              />
            </View>
          </View>

          {/* Price */}
          <View>
            <Text style={s.fpSectionTitle}>Pricing</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {['free', 'paid'].map((p) => (
                <Pressable key={p} onPress={() => update('price_type', p)}
                  style={[s.tagChip, form.price_type === p && { backgroundColor: p === 'free' ? C.green : C.primary, borderColor: p === 'free' ? C.green : C.primary }]}>
                  <Text style={[s.tagChipText, form.price_type === p && { color: '#fff' }]}>{p === 'free' ? 'Free' : 'Paid'}</Text>
                </Pressable>
              ))}
            </View>
            {form.price_type === 'paid' && (
              <TextInput
                value={String(form.price_amount)}
                onChangeText={(v) => update('price_amount', v.replace(/[^0-9]/g, ''))}
                placeholder="Price in ₹ (SA Credits)"
                placeholderTextColor={C.textDim}
                keyboardType="numeric"
                style={[s.formInput, { marginTop: 8 }]}
              />
            )}
          </View>

          {/* Capacity */}
          <View>
            <Text style={s.fpSectionTitle}>Capacity</Text>
            <TextInput
              value={String(form.capacity)}
              onChangeText={(v) => update('capacity', v.replace(/[^0-9]/g, ''))}
              placeholder="100 (0 = unlimited)"
              placeholderTextColor={C.textDim}
              keyboardType="numeric"
              style={s.formInput}
            />
          </View>

          {/* External registration URL */}
          <View>
            <Text style={s.fpSectionTitle}>External Registration URL (optional)</Text>
            <TextInput
              value={form.registration_url}
              onChangeText={(v) => update('registration_url', v)}
              placeholder="https://..."
              placeholderTextColor={C.textDim}
              style={s.formInput}
              autoCapitalize="none"
            />
          </View>

          {/* Image URL */}
          <View>
            <Text style={s.fpSectionTitle}>Banner Image URL (optional)</Text>
            <TextInput
              value={form.image_url}
              onChangeText={(v) => update('image_url', v)}
              placeholder="https://..."
              placeholderTextColor={C.textDim}
              style={s.formInput}
              autoCapitalize="none"
            />
          </View>

          {err && (
            <View style={{ padding: 10, backgroundColor: C.red + '22', borderRadius: 8, borderWidth: 1, borderColor: C.red }}>
              <Text style={{ color: C.red, fontSize: 13 }}>{err}</Text>
            </View>
          )}
        </ScrollView>

        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, gap: 8, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border }}>
          <Pressable onPress={submit} disabled={submitting}
            style={[s.registerCta, { backgroundColor: submitting ? C.primaryDim : C.primary }]}>
            {submitting ? <ActivityIndicator color="#fff" /> :
              <>
                <Text style={s.registerCtaText}>{isCollege ? 'Submit for Approval' : 'Publish Event'}</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
              </>
            }
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}



// ─── Styles ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 6 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  h1: { color: C.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  newPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.green, borderRadius: 999 },
  newPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 44, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginTop: 10 },
  searchInput: { flex: 1, color: C.text, fontSize: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },

  tabsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 16 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  tabBadge: { paddingHorizontal: 6, height: 16, minWidth: 16, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { color: C.textMuted, fontSize: 10, fontWeight: '700' },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card, borderRadius: 999, borderWidth: 1, borderColor: C.border },
  pillText: { color: C.textMuted, fontSize: 12, fontWeight: '600' },
  pillCount: { paddingHorizontal: 6, height: 16, minWidth: 16, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  pillCountText: { color: C.textMuted, fontSize: 10, fontWeight: '700' },

  scopeToggle: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 999, borderWidth: 1, borderColor: C.border, padding: 3 },
  scopeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  scopeBtnActive: { backgroundColor: C.primary },
  scopeFlag: { fontSize: 14 },
  scopeText: { color: C.textMuted, fontSize: 12, fontWeight: '600' },

  ddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  ddBtnText: { color: C.text, fontSize: 12, fontWeight: '600' },
  ddPanel: { marginHorizontal: 16, marginTop: 6, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingVertical: 4 },
  ddOpt: { paddingVertical: 10, paddingHorizontal: 14 },
  ddOptActive: { backgroundColor: C.primary },
  ddOptText: { color: C.text, fontSize: 13, fontWeight: '500' },

  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: '#FCD34D55' },
  aiBtnText: { color: '#FCD34D', fontSize: 12, fontWeight: '700' },

  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  sectionSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },

  carouselArrows: { flexDirection: 'row', gap: 6 },
  arrowBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', position: 'relative',
    ...(Platform.OS === 'web' ? { transitionProperty: 'transform, border-color, box-shadow', transitionDuration: '200ms' } : {}) as any,
  },
  cardHover: { borderColor: C.primary + '99', transform: [{ translateY: -2 }] as any, ...(Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(124,58,237,0.18)' } : {}) as any },
  cardImg: { width: '100%', height: 130, backgroundColor: C.bg },
  cardTopRow: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  typeChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  featPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F59E0B' },
  featPillText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  priceTopRight: { position: 'absolute', top: 10, right: 50 },
  priceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  priceBadgeText: { fontSize: 11, fontWeight: '800' },
  saveBtn: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  matchPill: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#10B98122', borderWidth: 1, borderColor: C.green + '55' },
  matchPillText: { color: C.green, fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaText: { color: C.textMuted, fontSize: 12 },
  urgent: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: C.amber + '22', borderWidth: 1, borderColor: C.amber, marginLeft: 4 },
  urgentText: { color: C.amber, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  desc: { color: C.textDim, fontSize: 12, marginTop: 8, lineHeight: 17 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  registerBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: C.primary },
  registerBtnSmallText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  regChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.green + '22', borderWidth: 1, borderColor: C.green },
  regChipText: { fontSize: 10, fontWeight: '700' },

  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: C.textMuted, fontSize: 12, textAlign: 'center', maxWidth: 320 },

  // Side panel
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  panel: { backgroundColor: C.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  panelBanner: { width: '100%', height: 200, backgroundColor: C.card },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  panelTitle: { color: C.text, fontSize: 22, fontWeight: '800', marginTop: 8 },
  panelOrg: { color: C.textMuted, fontSize: 13, marginTop: 4 },
  panelTabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16 },
  panelTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  panelTabText: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
  panelDesc: { color: C.text, fontSize: 14, lineHeight: 22 },
  detailCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailKey: { color: C.textMuted, fontSize: 12, fontWeight: '600' },
  detailVal: { color: C.text, fontSize: 13 },

  registeredBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: C.green + '22', borderWidth: 1, borderColor: C.green },
  registeredBannerText: { color: C.green, fontWeight: '700' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  linkBtnText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  creditToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  creditToggleText: { color: C.text, fontSize: 13 },
  registerCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 },
  registerCtaText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  toast: { position: 'absolute', bottom: 32, alignSelf: 'center', backgroundColor: '#0F172A', borderWidth: 1, borderColor: C.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, ...(Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(0,0,0,0.4)' } : {}) as any },
  toastText: { color: C.text, fontSize: 13, fontWeight: '500' },

  // FilterPanel styles
  fpSectionTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  fpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  fpRowText: { color: C.text, fontSize: 13 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  tagChipText: { color: C.textMuted, fontSize: 12, fontWeight: '600' },

  // Match score circle (top-right of card)
  matchCircle: { position: 'absolute', top: 50, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  matchCircleText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Closed overlay for past events
  closedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  closedBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: C.red, borderWidth: 1, borderColor: '#fff' },
  closedBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  // Countdown banner
  countdownBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: C.amber },
  countdownText: { color: C.amber, fontSize: 13, fontWeight: '600', flex: 1 },

  // Topic tag pills row
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  topicPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  topicPillText: { color: '#94A3B8', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  // Host event button + approvals row
  hostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.primary, borderRadius: 999, ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(124,58,237,0.4)' } : {}) as any },
  hostBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  approvalRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  approveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  formInput: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 13, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
});
