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
import {View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Image, Linking, Modal, useWindowDimensions, Platform, Animated, Easing} from 'react-native';
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
const styles = {
  root: {root:'{ flex: 1'},
  headerRow: {headerRow:'{ flexDirection: 'row''},
  backBtn: {backBtn:'{ width: 36'},
  h1: {h1:'{ color: C.text'},
  subtitle: {subtitle:'{ color: C.textMuted'},
  hostBtn: {hostBtn:'{ flexDirection: 'row''},
  hostBtnText: {hostBtnText:'{ color: '#fff''},
  newPill: {newPill:'{ flexDirection: 'row''},
  newPillText: {newPillText:'{ color: '#fff''},
  searchWrap: {searchWrap:'{ flexDirection: 'row''},
  searchInput: {searchInput:'{ flex: 1'},
  tabsRow: {tabsRow:'{ flexDirection: 'row''},
  tabBtn: {tabBtn:'{ flexDirection: 'row''},
  tabBtnActive: {tabBtnActive:'{ backgroundColor: C.primary'},
  tabText: {tabText:'{ color: C.textMuted'},
  tabTextActive: {tabTextActive:'{ color: '#fff''},
  tabBadge: {tabBadge:'{ paddingHorizontal: 6'},
  tabBadgeActive: {tabBadgeActive:'{ backgroundColor: 'rgba(255'},
  tabBadgeText: {tabBadgeText:'{ color: C.textMuted'},
  pill: {pill:'{ flexDirection: 'row''},
  pillText: {pillText:'{ color: C.textMuted'},
  pillCount: {pillCount:'{ paddingHorizontal: 6'},
  pillCountText: {pillCountText:'{ color: C.textMuted'},
  scopeToggle: {scopeToggle:'{ flexDirection: 'row''},
  scopeBtn: {scopeBtn:'{ flexDirection: 'row''},
  scopeBtnActive: {scopeBtnActive:'{ backgroundColor: C.primary'},
  scopeFlag: {scopeFlag:'{ fontSize: 14'},
  scopeText: {scopeText:'{ color: C.textMuted'},
  ddBtn: {ddBtn:'{ flexDirection: 'row''},
  ddBtnText: {ddBtnText:'{ color: C.text'},
  aiBtn: {aiBtn:'{ flexDirection: 'row''},
  aiBtnText: {aiBtnText:'{ color: '#FCD34D''},
  ddPanel: {ddPanel:'{ marginHorizontal: 16'},
  ddOpt: {ddOpt:'{ paddingVertical: 10'},
  ddOptActive: {ddOptActive:'{ backgroundColor: C.primary'},
  ddOptText: {ddOptText:'{ color: C.text'},
  sectionHead: {sectionHead:'{ flexDirection: 'row''},
  sectionTitle: {sectionTitle:'{ color: C.text'},
  sectionSub: {sectionSub:'{ color: C.textMuted'},
  empty: {empty:'{ alignItems: 'center''},
  emptyTitle: {emptyTitle:'{ color: C.text'},
  emptySub: {emptySub:'{ color: C.textMuted'},
  grid: {grid:'{ flexDirection: 'row''},
  approvalRow: {approvalRow:'{ flexDirection: 'row''},
  approveBtn: {approveBtn:'{ flex: 1'},
  approveBtnText: {approveBtnText:'{ color: '#fff''},
  toast: {toast:'{ position: 'absolute''},
  toastText: {toastText:'{ color: C.text'},
  carouselArrows: {carouselArrows:'{ flexDirection: 'row''},
  arrowBtn: {arrowBtn:'{ width: 32'},
  card: {card:'{', backgroundColor:'C.card', overflow:'hidden', transitionProperty:'transform'},
  cardHover: {cardHover:'{ borderColor: C.primary + '99''},
  cardImg: {cardImg:'{ width: '100%''},
  cardTopRow: {cardTopRow:'{ position: 'absolute''},
  typeChip: {typeChip:'{ flexDirection: 'row''},
  typeChipText: {typeChipText:'{ fontSize: 10'},
  featPill: {featPill:'{ flexDirection: 'row''},
  featPillText: {featPillText:'{ color: '#fff''},
  priceTopRight: {priceTopRight:'{ position: 'absolute''},
  priceBadge: {priceBadge:'{ paddingHorizontal: 10'},
  priceBadgeText: {priceBadgeText:'{ fontSize: 11'},
  saveBtn: {saveBtn:'{ position: 'absolute''},
  cardTitle: {cardTitle:'{ color: C.text'},
  matchPill: {matchPill:'{ alignSelf: 'flex-start''},
  matchPillText: {matchPillText:'{ color: C.green'},
  metaRow: {metaRow:'{ flexDirection: 'row''},
  metaText: {metaText:'{ color: C.textMuted'},
  urgent: {urgent:'{ paddingHorizontal: 6'},
  urgentText: {urgentText:'{ color: C.amber'},
  desc: {desc:'{ color: C.textDim'},
  topicRow: {topicRow:'{ flexDirection: 'row''},
  topicPill: {topicPill:'{ paddingHorizontal: 8'},
  topicPillText: {topicPillText:'{ color: '#94A3B8''},
  cardFooter: {cardFooter:'{ flexDirection: 'row''},
  regChip: {regChip:'{ flexDirection: 'row''},
  regChipText: {regChipText:'{ fontSize: 10'},
  registerBtnSmall: {registerBtnSmall:'{ flexDirection: 'row''},
  registerBtnSmallText: {registerBtnSmallText:'{ color: '#fff''},
  modalBackdrop: {modalBackdrop:'{ flex: 1'},
  panel: {panel:'{ backgroundColor: C.bg'},
  panelBanner: {panelBanner:'{ width: '100%''},
  closeBtn: {closeBtn:'{ position: 'absolute''},
  panelTitle: {panelTitle:'{ color: C.text'},
  panelOrg: {panelOrg:'{ color: C.textMuted'},
  panelTabsRow: {panelTabsRow:'{ flexDirection: 'row''},
  panelTab: {panelTab:'{ flexDirection: 'row''},
  panelTabText: {panelTabText:'{ color: C.textMuted'},
  panelDesc: {panelDesc:'{ color: C.text'},
  detailCard: {detailCard:'{ backgroundColor: C.card'},
  detailRow: {detailRow:'{ flexDirection: 'row''},
  detailKey: {detailKey:'{ color: C.textMuted'},
  detailVal: {detailVal:'{ color: C.text'},
  registeredBanner: {registeredBanner:'{ flexDirection: 'row''},
  registeredBannerText: {registeredBannerText:'{ color: C.green'},
  linkBtn: {linkBtn:'{ flexDirection: 'row''},
  linkBtnText: {linkBtnText:'{ color: C.primary'},
  creditToggle: {creditToggle:'{ flexDirection: 'row''},
  checkbox: {checkbox:'{ width: 18'},
  creditToggleText: {creditToggleText:'{ color: C.text'},
  registerCta: {registerCta:'{ flexDirection: 'row''},
  registerCtaText: {registerCtaText:'{ color: '#fff''},
  fpSectionTitle: {fpSectionTitle:'{ color: C.text'},
  fpRow: {fpRow:'{ flexDirection: 'row''},
  fpRowText: {fpRowText:'{ color: C.text'},
  radio: {radio:'{ width: 18'},
  radioDot: {radioDot:'{ width: 8'},
  tagChip: {tagChip:'{ paddingHorizontal: 12'},
  tagChipText: {tagChipText:'{ color: C.textMuted'},
  formInput: {formInput:'{ marginTop: 6'},
};

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
    // Redirect to the dedicated event registration page to get the QR code
    router.push({
      pathname: `/event/${ev.event_id}` as any,
      params: {
        id: ev.event_id,
        title: ev.title,
        start_date: ev.event_date_start,
        venue: ev.location_city || 'Online',
        registration_deadline: ev.event_date_start,
        category: ev.event_type || 'Workshop',
        organizer: ev.organizer_name || 'Institution Partner',
        image: ev.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400',
        url: ev.registration_url || '',
        tags: ev.topic_keywords ? ev.topic_keywords.join(',') : '',
        price: ev.price_amount !== undefined && ev.price_amount !== null ? String(ev.price_amount) : '',
      }
    });
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
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>Events</Text>
            <Text style={styles.subtitle}>Discover hackathons, talks, workshops & meetups</Text>
          </View>
          {canHost && (
            <Pressable onPress={() => setShowHostModal(true)} style={styles.hostBtn}>
              <MaterialCommunityIcons name="plus-circle" size={16} color="#fff" />
              <Text style={styles.hostBtnText}>{me?.role === 'college' ? 'Publish Event' : 'Host Event'}</Text>
            </Pressable>
          )}
          {newCount > 0 && (
            <Pressable onPress={() => { setNewCount(0); load(); }} style={styles.newPill}>
              <MaterialCommunityIcons name="bell-ring" size={14} color="#fff" />
              <Text style={styles.newPillText}>{newCount} new</Text>
            </Pressable>
          )}
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { marginHorizontal: 16 }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={C.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search events, organizers, cities…"
            placeholderTextColor={C.textDim}
            style={styles.searchInput}
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
        <View style={styles.tabsRow}>
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
              style={[styles.tabBtn, tab === t.id && s.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
              {t.n > 0 && (
                <View style={[styles.tabBadge, tab === t.id && s.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, tab === t.id && { color: '#fff' }]}>{t.n}</Text>
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
                  style={[styles.pill, active && { backgroundColor: tint, borderColor: tint }]}
                >
                  {t.id !== 'all' && (
                    <MaterialCommunityIcons
                      name={TYPE_ICONS[t.id]} size={14}
                      color={active ? '#fff' : tint}
                    />
                  )}
                  <Text style={[styles.pillText, active && { color: '#fff' }]}>{t.label}</Text>
                  {n > 0 && (
                    <View style={[styles.pillCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <Text style={[styles.pillCountText, active && { color: '#fff' }]}>{n}</Text>
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
            <View style={styles.scopeToggle}>
              <Pressable
                onPress={() => setScope('india')}
                style={[styles.scopeBtn, scope === 'india' && s.scopeBtnActive]}
              >
                <Text style={styles.scopeFlag}>🇮🇳</Text>
                <Text style={[styles.scopeText, scope === 'india' && { color: '#fff' }]}>India</Text>
              </Pressable>
              <Pressable
                onPress={() => setScope('global')}
                style={[styles.scopeBtn, scope === 'global' && s.scopeBtnActive]}
              >
                <MaterialCommunityIcons name="earth" size={14} color={scope === 'global' ? '#fff' : C.textMuted} />
                <Text style={[styles.scopeText, scope === 'global' && { color: '#fff' }]}>Global</Text>
              </Pressable>
            </View>

            {scope === 'india' && (
              <Pressable onPress={() => setShowCityDD(!showCityDD)} style={styles.ddBtn}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={C.textMuted} />
                <Text style={styles.ddBtnText}>{city}</Text>
                <MaterialCommunityIcons name="chevron-down" size={14} color={C.textMuted} />
              </Pressable>
            )}

            <Pressable onPress={() => setShowPriceDD(!showPriceDD)} style={styles.ddBtn}>
              <MaterialCommunityIcons name="cash" size={14} color={C.textMuted} />
              <Text style={styles.ddBtnText}>{price === 'all' ? 'All prices' : price === 'free' ? 'Free' : 'Paid'}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={C.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => setAiOn(!aiOn)}
              style={[styles.aiBtn, aiOn && { backgroundColor: C.primary, borderColor: C.primary }]}
            >
              <MaterialCommunityIcons name={aiOn ? 'star' : 'star-outline'} size={14} color={aiOn ? '#fff' : '#FCD34D'} />
              <Text style={[styles.aiBtnText, aiOn && { color: '#fff' }]}>AI Best Events for Me</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowFilterPanel(true)}
              style={[styles.ddBtn, activeFilterCount > 0 && { borderColor: C.primary }]}
            >
              <MaterialCommunityIcons name="tune-variant" size={14} color={activeFilterCount > 0 ? C.primary : C.textMuted} />
              <Text style={[styles.ddBtnText, activeFilterCount > 0 && { color: C.primary }]}>
                Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
              </Text>
            </Pressable>
          </View>
        )}

        {/* City DD popover */}
        {showCityDD && (
          <View style={styles.ddPanel}>
            {INDIAN_CITIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => { setCity(c); setShowCityDD(false); }}
                style={[styles.ddOpt, city === c && s.ddOptActive]}
              >
                <Text style={[styles.ddOptText, city === c && { color: '#fff' }]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {showPriceDD && (
          <View style={styles.ddPanel}>
            {[
              { id: 'all', label: 'All Events' },
              { id: 'free', label: 'Free Events Only' },
              { id: 'paid', label: 'Paid Events Only' },
            ].map((p) => (
              <Pressable
                key={p.id}
                onPress={() => { setPrice(p.id as any); setShowPriceDD(false); }}
                style={[styles.ddOpt, price === p.id && s.ddOptActive]}
              >
                <Text style={[styles.ddOptText, price === p.id && { color: '#fff' }]}>{p.label}</Text>
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
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                {tab === 'saved' ? 'Saved Events' :
                 tab === 'registered' ? 'My Registrations' :
                 aiOn ? '✨ AI Best Events for You' : 'More Events'}
              </Text>
              <Text style={styles.sectionSub}>{listToShow.length} {listToShow.length === 1 ? 'event' : 'events'}</Text>
            </View>

            {listToShow.length === 0 ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={56} color={C.textDim} />
                <Text style={styles.emptyTitle}>
                  {tab === 'saved' ? 'No saved events yet' :
                   tab === 'registered' ? 'No registrations yet' : 'No matching events'}
                </Text>
                <Text style={styles.emptySub}>
                  {tab === 'saved' ? 'Tap the bookmark on any card to save it.' :
                   tab === 'registered' ? 'RSVP to events to see them here.' :
                   'Try adjusting your filters or search.'}
                </Text>
              </View>
            ) : (
              <View style={[styles.grid, { gap: 14 }]}>
                {listToShow.map((ev) => (
                  <View key={ev.event_id} style={{ width: cols === 1 ? '100%' : cols === 2 ? '48.5%' : '32.5%' }}>
                    <EventCard
                      ev={ev}
                      onPress={() => setSelected(ev)}
                      onSave={(e) => handleSave(ev, e)}
                    />
                    {tab === 'approvals' && (
                      <View style={styles.approvalRow}>
                        <Pressable onPress={() => handleApprove(ev)} style={[styles.approveBtn, { backgroundColor: C.green }]}>
                          <MaterialCommunityIcons name="check" size={14} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </Pressable>
                        <Pressable onPress={() => handleReject(ev)} style={[styles.approveBtn, { backgroundColor: C.red }]}>
                          <MaterialCommunityIcons name="close" size={14} color="#fff" />
                          <Text style={styles.approveBtnText}>Reject</Text>
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
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
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
      <View style={[styles.sectionHead, { paddingHorizontal: 16 }]}>
        <View>
          <Text style={styles.sectionTitle}>Featured Events</Text>
          <Text style={styles.sectionSub}>Handpicked for your interests</Text>
        </View>
        <View style={styles.carouselArrows}>
          <Pressable
            onPress={() => {
              idx.current = Math.max(0, idx.current - 1);
              scrollRef.current?.scrollTo({ x: idx.current * (cardW + gap), animated: true });
            }}
            style={styles.arrowBtn}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={C.primary} />
          </Pressable>
          <Pressable
            onPress={() => {
              idx.current = Math.min(items.length - 1, idx.current + 1);
              scrollRef.current?.scrollTo({ x: idx.current * (cardW + gap), animated: true });
            }}
            style={styles.arrowBtn}
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
        <Image source={{ uri: ev.image_url }} style={styles.cardImg} />
      ) : (
        <LinearGradient
          colors={[tint + '40', tint + '15']}
          style={styles.cardImg}
        >
          <MaterialCommunityIcons name={icon} size={42} color={tint} style={{ alignSelf: 'center', marginTop: 36 }} />
        </LinearGradient>
      )}

      {/* Top row: type chip + featured + price */}
      <View style={styles.cardTopRow}>
        <View style={[styles.typeChip, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
          <MaterialCommunityIcons name={icon} size={12} color={tint} />
          <Text style={[styles.typeChipText, { color: tint }]}>{TYPE_LABELS[ev.event_type] || ev.event_type}</Text>
        </View>
        {featured && (
          <View style={styles.featPill}>
            <MaterialCommunityIcons name="star" size={11} color="#fff" />
            <Text style={styles.featPillText}>Featured</Text>
          </View>
        )}
      </View>

      <View style={[s.priceTopRight]}>
        {isFree ? (
          <View style={[styles.priceBadge, { backgroundColor: C.green + '22', borderColor: C.green }]}>
            <Text style={[styles.priceBadgeText, { color: C.green }]}>FREE</Text>
          </View>
        ) : (
          <View style={[styles.priceBadge, { backgroundColor: C.primary + '22', borderColor: C.primary }]}>
            <Text style={[styles.priceBadgeText, { color: '#A78BFA' }]}>₹{ev.price_amount}</Text>
          </View>
        )}
      </View>

      {/* Save bookmark */}
      <Pressable onPress={(e) => onSave(e)} style={styles.saveBtn} hitSlop={8}>
        <MaterialCommunityIcons name={ev.is_saved ? 'bookmark' : 'bookmark-outline'} size={18} color={ev.is_saved ? C.amber : '#fff'} />
      </Pressable>

      <View style={{ padding: 14, paddingTop: 10 }}>
        <Text style={styles.cardTitle} numberOfLines={2}>{ev.title}</Text>
        {ev.match_score !== undefined && (
          <View style={styles.matchPill}>
            <Text style={styles.matchPillText}>★ {ev.match_score}% match</Text>
          </View>
        )}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={13} color={C.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {ev.location_city || 'Online'}{ev.location_country ? ` · ${ev.location_country}` : ''}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="calendar-outline" size={13} color={C.textMuted} />
          <Text style={styles.metaText}>{fmtRange(ev.event_date_start, ev.event_date_end)}</Text>
          {dDays !== null && dDays >= 0 && dDays <= 7 && (
            <View style={[styles.urgent, dDays <= 3 && { backgroundColor: C.red + '33', borderColor: C.red }]}>
              <Text style={[styles.urgentText, dDays <= 3 && { color: '#FCA5A5' }]}>
                {dDays === 0 ? 'today' : dDays === 1 ? 'tomorrow' : `in ${dDays}d`}
              </Text>
            </View>
          )}
        </View>
        {ev.description ? (
          <Text style={styles.desc} numberOfLines={2}>{ev.description}</Text>
        ) : null}

        {ev.topic_keywords && ev.topic_keywords.length > 0 && (
          <View style={styles.topicRow}>
            {ev.topic_keywords.slice(0, 3).map((tk) => (
              <View key={tk} style={styles.topicPill}>
                <Text style={styles.topicPillText}>{tk.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="account-multiple" size={13} color={C.textMuted} />
            <Text style={styles.metaText}>{ev.attendee_count || 0}</Text>
            {ev.spots_left !== null && ev.spots_left !== undefined && ev.spots_left <= 20 && ev.spots_left > 0 && (
              <Text style={[styles.metaText, { color: C.amber, fontWeight: '700', marginLeft: 4 }]}>
                · {ev.spots_left} spots left
              </Text>
            )}
          </View>
          {ev.rsvp_status ? (
            <View style={[styles.regChip, ev.rsvp_status === 'waitlisted' && { backgroundColor: C.amber + '22', borderColor: C.amber }]}>
              <MaterialCommunityIcons name="check-circle" size={12} color={ev.rsvp_status === 'waitlisted' ? C.amber : C.green} />
              <Text style={[styles.regChipText, { color: ev.rsvp_status === 'waitlisted' ? C.amber : C.green }]}>
                {ev.rsvp_status === 'waitlisted' ? 'Waitlisted' : 'Registered'}
              </Text>
            </View>
          ) : (
            <View style={styles.registerBtnSmall}>
              <Text style={styles.registerBtnSmallText}>Register</Text>
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
    <Pressable onPress={onClose} style={styles.modalBackdrop}>
      <Pressable onPress={(e) => e.stopPropagation()} style={[
        s.panel,
        isWide ? { right: 0, top: 0, height: '100%', width: 600, position: 'absolute' as any } :
                 { bottom: 0, left: 0, right: 0, height: '92%', position: 'absolute' as any },
      ]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          {/* Banner */}
          <View style={{ position: 'relative' }}>
            {ev.image_url ? (
              <Image source={{ uri: ev.image_url }} style={styles.panelBanner} />
            ) : (
              <LinearGradient colors={[tint + '60', tint + '20']} style={styles.panelBanner}>
                <MaterialCommunityIcons name={icon} size={64} color={tint} style={{ alignSelf: 'center', marginTop: 64 }} />
              </LinearGradient>
            )}
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Header */}
          <View style={{ padding: 20 }}>
            <View style={[styles.typeChip, { backgroundColor: tint + '22', borderColor: tint + '55', alignSelf: 'flex-start' }]}>
              <MaterialCommunityIcons name={icon} size={12} color={tint} />
              <Text style={[styles.typeChipText, { color: tint }]}>{TYPE_LABELS[ev.event_type]}</Text>
            </View>
            <Text style={styles.panelTitle}>{ev.title}</Text>
            <Text style={styles.panelOrg}>by {ev.organizer_name || 'Unknown'}</Text>

            <View style={[styles.metaRow, { marginTop: 10 }]}>
              <MaterialCommunityIcons name="map-marker" size={14} color={C.textMuted} />
              <Text style={styles.metaText}>
                {ev.location_city || 'Online'}{ev.location_country ? ` · ${ev.location_country}` : ''}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="calendar" size={14} color={C.textMuted} />
              <Text style={styles.metaText}>{fmtRange(ev.event_date_start, ev.event_date_end)}</Text>
            </View>
            {ev.capacity ? (
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="account-multiple" size={14} color={C.textMuted} />
                <Text style={styles.metaText}>{ev.attendee_count}/{ev.capacity} attendees{ev.spots_left ? ` · ${ev.spots_left} left` : ''}</Text>
              </View>
            ) : null}
          </View>

          {/* Tabs */}
          <View style={styles.panelTabsRow}>
            {[
              { id: 'overview', label: 'Overview', icon: 'text-box-outline' },
              { id: 'register', label: 'Register', icon: 'ticket-outline' },
              { id: 'track', label: 'Track', icon: 'check-circle-outline' },
            ].map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id as any)}
                style={[styles.panelTab, tab === t.id && { borderBottomColor: C.primary }]}
              >
                <MaterialCommunityIcons name={t.icon as any} size={14} color={tab === t.id ? C.primary : C.textMuted} />
                <Text style={[styles.panelTabText, tab === t.id && { color: C.primary }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Tab content */}
          <View style={{ padding: 20, gap: 14 }}>
            {tab === 'overview' && (
              <>
                <Text style={styles.panelDesc}>{ev.description || 'No description provided.'}</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Date</Text>
                    <Text style={styles.detailVal}>{fmtRange(ev.event_date_start, ev.event_date_end)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Location</Text>
                    <Text style={styles.detailVal}>{ev.location_city}, {ev.location_country}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Price</Text>
                    <Text style={styles.detailVal}>
                      {isFree ? <Text style={{ color: C.green, fontWeight: '700' }}>Free</Text> :
                        <Text style={{ color: '#A78BFA', fontWeight: '700' }}>₹{ev.price_amount}</Text>}
                    </Text>
                  </View>
                  {ev.capacity ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Capacity</Text>
                      <Text style={styles.detailVal}>{ev.capacity} attendees</Text>
                    </View>
                  ) : null}
                </View>
                {ev.why && ev.why.length > 0 && (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailKey}>Why we recommend this</Text>
                    {ev.why.map((w, i) => (
                      <Text key={i} style={[styles.detailVal, { marginTop: 4 }]}>• {w}</Text>
                    ))}
                  </View>
                )}
              </>
            )}

            {tab === 'register' && (
              <>
                {ev.rsvp_status ? (
                  <View style={styles.registeredBanner}>
                    <MaterialCommunityIcons name="check-circle" size={20} color={C.green} />
                    <Text style={styles.registeredBannerText}>
                      You're {ev.rsvp_status === 'waitlisted' ? 'on the waitlist' : 'registered'}
                    </Text>
                  </View>
                ) : (
                  <>
                    {ev.registration_url && (
                      <Pressable onPress={() => Linking.openURL(ev.registration_url!)} style={styles.linkBtn}>
                        <MaterialCommunityIcons name="open-in-new" size={16} color={C.primary} />
                        <Text style={styles.linkBtnText}>Register on {ev.organizer_name || 'organizer'}'s site</Text>
                      </Pressable>
                    )}
                    {!isFree && (
                      <Pressable onPress={() => setUseCredits(!useCredits)} style={styles.creditToggle}>
                        <View style={[styles.checkbox, useCredits && { backgroundColor: C.primary }]}>
                          {useCredits && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
                        </View>
                        <Text style={styles.creditToggleText}>Use SA Credits to pay (₹{ev.price_amount})</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => onRegister(useCredits)} style={[styles.registerCta, { backgroundColor: C.primary }]}>
                      <Text style={styles.registerCtaText}>
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
                  <Text style={styles.panelDesc}>You haven't registered yet. Switch to the Register tab.</Text>
                ) : (
                  <>
                    <View style={styles.detailCard}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailKey}>Status</Text>
                        <Text style={[styles.detailVal, { color: ev.rsvp_status === 'waitlisted' ? C.amber : C.green, fontWeight: '700' }]}>
                          {ev.rsvp_status === 'waitlisted' ? 'Waitlisted' : 'Registered'}
                        </Text>
                      </View>
                    </View>
                    <Pressable onPress={onDownloadIcs} style={styles.linkBtn}>
                      <MaterialCommunityIcons name="calendar-export" size={16} color={C.primary} />
                      <Text style={styles.linkBtnText}>Add to Calendar (.ics)</Text>
                    </Pressable>
                    <Pressable onPress={onShare} style={styles.linkBtn}>
                      <MaterialCommunityIcons name="share-variant" size={16} color={C.primary} />
                      <Text style={styles.linkBtnText}>Share event</Text>
                    </Pressable>
                    <Pressable onPress={onCancel} style={[styles.linkBtn, { borderColor: C.red + '55' }]}>
                      <MaterialCommunityIcons name="close-circle" size={16} color={C.red} />
                      <Text style={[styles.linkBtnText, { color: C.red }]}>Cancel registration</Text>
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
    <Pressable onPress={onClose} style={styles.modalBackdrop}>
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
            <Text style={styles.fpSectionTitle}>Institution Tier</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {TIER_OPTIONS.map((t) => {
                const active = tiers.includes(t.id);
                return (
                  <Pressable key={t.id} onPress={() => toggleArr(tiers, setTiers, t.id)} style={styles.fpRow}>
                    <View style={[styles.checkbox, active && { backgroundColor: C.primary, borderColor: C.primary }]}>
                      {active && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
                    </View>
                    <Text style={styles.fpRowText}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Event Mode */}
          <View>
            <Text style={styles.fpSectionTitle}>Event Mode</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {MODE_OPTIONS.map((m) => {
                const active = mode === m.id;
                return (
                  <Pressable key={m.id} onPress={() => setMode(m.id)} style={styles.fpRow}>
                    <View style={[styles.radio, active && { borderColor: C.primary }]}>
                      {active && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.fpRowText}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Price Type */}
          <View>
            <Text style={styles.fpSectionTitle}>Price Type</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {[{ id: 'all', label: 'All' }, { id: 'free', label: 'Free' }, { id: 'paid', label: 'Paid' }].map((p) => {
                const active = price === p.id;
                return (
                  <Pressable key={p.id} onPress={() => setPrice(p.id)} style={styles.fpRow}>
                    <View style={[styles.radio, active && { borderColor: C.primary }]}>
                      {active && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.fpRowText}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Region India */}
          <View>
            <Text style={styles.fpSectionTitle}>Region (India)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {INDIAN_CITIES.map((c) => (
                <Pressable key={c} onPress={() => setCity(c)} style={[styles.tagChip, city === c && { backgroundColor: C.primary, borderColor: C.primary }]}>
                  <Text style={[styles.tagChipText, city === c && { color: '#fff' }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Topic Keywords */}
          <View>
            <Text style={styles.fpSectionTitle}>Topic Keywords</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {TOPIC_OPTIONS.map((t) => {
                const active = topics.includes(t.id);
                return (
                  <Pressable key={t.id} onPress={() => toggleArr(topics, setTopics, t.id)} style={[styles.tagChip, active && { backgroundColor: C.primary, borderColor: C.primary }]}>
                    <Text style={[styles.tagChipText, active && { color: '#fff' }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, gap: 8, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border }}>
          <Pressable onPress={onClose} style={[styles.registerCta, { backgroundColor: C.primary }]}>
            <Text style={styles.registerCtaText}>Apply Filters</Text>
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
    <Pressable onPress={onClose} style={styles.modalBackdrop}>
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
            <Text style={styles.fpSectionTitle}>Title <Text style={{ color: C.red }}>*</Text></Text>
            <TextInput
              value={form.title}
              onChangeText={(v) => update('title', v)}
              placeholder="e.g. AI/ML Bootcamp 2026"
              placeholderTextColor={C.textDim}
              style={styles.formInput}
            />
          </View>

          {/* Description */}
          <View>
            <Text style={styles.fpSectionTitle}>Description</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => update('description', v)}
              placeholder="What attendees will learn / experience"
              placeholderTextColor={C.textDim}
              multiline numberOfLines={4}
              style={[styles.formInput, { minHeight: 88, textAlignVertical: 'top' }]}
            />
          </View>

          {/* Event Type */}
          <View>
            <Text style={styles.fpSectionTitle}>Event Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {allowedTypes.map((t) => {
                const active = form.event_type === t;
                const tint = TYPE_TINTS[t];
                return (
                  <Pressable key={t} onPress={() => update('event_type', t)}
                    style={[styles.tagChip, active && { backgroundColor: tint, borderColor: tint }]}>
                    <Text style={[styles.tagChipText, active && { color: '#fff' }]}>{TYPE_LABELS[t]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Date pickers */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fpSectionTitle}>Start Date <Text style={{ color: C.red }}>*</Text></Text>
              <TextInput
                value={form.event_date_start}
                onChangeText={(v) => update('event_date_start', v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textDim}
                style={styles.formInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fpSectionTitle}>End Date</Text>
              <TextInput
                value={form.event_date_end}
                onChangeText={(v) => update('event_date_end', v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textDim}
                style={styles.formInput}
              />
            </View>
          </View>

          {/* Location */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fpSectionTitle}>City</Text>
              <TextInput
                value={form.location_city}
                onChangeText={(v) => update('location_city', v)}
                placeholder="Bangalore"
                placeholderTextColor={C.textDim}
                style={styles.formInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fpSectionTitle}>Country</Text>
              <TextInput
                value={form.location_country}
                onChangeText={(v) => update('location_country', v)}
                placeholder="India"
                placeholderTextColor={C.textDim}
                style={styles.formInput}
              />
            </View>
          </View>

          {/* Price */}
          <View>
            <Text style={styles.fpSectionTitle}>Pricing</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {['free', 'paid'].map((p) => (
                <Pressable key={p} onPress={() => update('price_type', p)}
                  style={[styles.tagChip, form.price_type === p && { backgroundColor: p === 'free' ? C.green : C.primary, borderColor: p === 'free' ? C.green : C.primary }]}>
                  <Text style={[styles.tagChipText, form.price_type === p && { color: '#fff' }]}>{p === 'free' ? 'Free' : 'Paid'}</Text>
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
                style={[styles.formInput, { marginTop: 8 }]}
              />
            )}
          </View>

          {/* Capacity */}
          <View>
            <Text style={styles.fpSectionTitle}>Capacity</Text>
            <TextInput
              value={String(form.capacity)}
              onChangeText={(v) => update('capacity', v.replace(/[^0-9]/g, ''))}
              placeholder="100 (0 = unlimited)"
              placeholderTextColor={C.textDim}
              keyboardType="numeric"
              style={styles.formInput}
            />
          </View>

          {/* External registration URL */}
          <View>
            <Text style={styles.fpSectionTitle}>External Registration URL (optional)</Text>
            <TextInput
              value={form.registration_url}
              onChangeText={(v) => update('registration_url', v)}
              placeholder="https://..."
              placeholderTextColor={C.textDim}
              style={styles.formInput}
              autoCapitalize="none"
            />
          </View>

          {/* Image URL */}
          <View>
            <Text style={styles.fpSectionTitle}>Banner Image URL (optional)</Text>
            <TextInput
              value={form.image_url}
              onChangeText={(v) => update('image_url', v)}
              placeholder="https://..."
              placeholderTextColor={C.textDim}
              style={styles.formInput}
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
            style={[styles.registerCta, { backgroundColor: submitting ? C.primaryDim : C.primary }]}>
            {submitting ? <ActivityIndicator color="#fff" /> :
              <>
                <Text style={styles.registerCtaText}>{isCollege ? 'Submit for Approval' : 'Publish Event'}</Text>
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

