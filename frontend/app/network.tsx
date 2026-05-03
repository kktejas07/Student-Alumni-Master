/**
 * Network Screen — Discover / My Connections / Requests.
 *
 * Discover sections (each up to 12 cards):
 *   • Matched by Interest
 *   • Matched by Career Path
 *   • From Your College
 *   • Recommended Mentors
 *   • Expand Your Horizons
 *
 * Each PersonCard shows photo/initials, name, role+title, college,
 * interest/skill chips, and a Connect / Pending / Connected action
 * button. Mentors also get a "Book session" link.
 *
 * Wired to:
 *   GET  /api/network/discover
 *   GET  /api/network/connections
 *   GET  /api/network/requests
 *   POST /api/network/connect/{id}
 *   POST /api/network/accept/{id}
 *   POST /api/network/reject/{id}
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable,
  TextInput, Linking, Image, Platform, useWindowDimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Search, UserPlus, Check, Clock, X as CloseX,
  GraduationCap, Briefcase, Users, Link2, Github,
  Star, MapPin, Heart, UserCheck, Compass, Calendar, MessageSquare,
  ChevronDown, ChevronUp, SlidersHorizontal, Crown, Code2, Eye,
} from 'lucide-react-native';
import { NetworkSidebar, TopHero, ChatPhonePopup, BookingDrawer } from '@/src/views/web/network/NetworkShell';
import { request } from '@/src/models/services/api';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';
import { useAuth } from '@/src/viewmodels/hooks';
import { HoverGlowCard } from '@/src/views/web/HoverGlowCard';
import { MaterialBadgeChip } from '@/src/views/components/MaterialBadgeChip';

interface Person {
  id: string;
  full_name: string;
  role: string;
  institution?: string;
  city?: string;
  state?: string;
  branch?: string;
  year?: any;
  graduation_year?: any;
  career_path?: string;
  interests?: string[];
  skills?: string[];
  primary_skill?: string;
  job_title?: string;
  organization?: string;
  category?: string;
  rating?: number;
  sessions?: number;
  expected_rate_inr?: number;
  linkedin_url?: string;
  github_url?: string;
  photo_data?: string;
  wants_to_mentor?: boolean;
  is_online?: boolean;
  mutual_connections?: number;
  sa_id?: string;
  badges?: Array<{ id: string; label: string; tier: string; icon?: string; kind?: string; category?: string }>;
  badges_total?: number;
  connection_state: 'none' | 'pending' | 'connected' | 'incoming';
  requested_at?: string;
}
interface Section { key: string; title: string; subtitle: string; icon?: string; tint?: string; items: Person[]; }

const SECTION_ICONS: Record<string, any> = {
  Heart, Briefcase, GraduationCap, UserCheck, Compass, Code2,
};

type TabKey = 'discover' | 'connections' | 'requests';

export default function NetworkScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width: winW } = useWindowDimensions();
  // Responsive column count: 4 on wide desktop, 3 on small desktop, 2 on tablet, 1 on phone
  const cols = winW >= 1280 ? 4 : winW >= 960 ? 3 : winW >= 640 ? 2 : 1;
  const isMobile = winW < 640;
  const gap = isMobile ? 10 : 12;
  const horizontalPadding = isMobile ? 24 : 32; // 12/16 each side
  const cardWidth = Math.floor((winW - horizontalPadding - (cols - 1) * gap) / cols);
  const [tab, setTab] = useState<TabKey>('discover');
  const [sections, setSections] = useState<Section[]>([]);
  const [conns, setConns] = useState<Person[]>([]);
  const [reqs, setReqs] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  // Polish state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{ role?: string; skill?: string; year?: string; city?: string }>({});
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Standalone shell state
  const [typeFilter, setTypeFilter] = useState<'all' | 'student' | 'alumni' | 'mentor'>('all');
  const [chatPerson, setChatPerson] = useState<Person | null>(null);
  const [bookingMentor, setBookingMentor] = useState<Person | null>(null);
  const [freeSessionsRemaining, setFreeSessionsRemaining] = useState<number>(2);
  const isWideShell = winW >= 1100; // sidebar visible at 1100+ desktops
  const sidebarWidth = isWideShell ? 268 : 0;

  const PAGE_SIZE = 8;

  const showToast = useCallback((m: string) => {
    setToast(m); setTimeout(() => setToast(null), 2200);
  }, []);

  const handleAuthError = useCallback((e: any) => {
    const msg = (e?.message || '').toLowerCase();
    if (msg.includes('not authenticated') || msg.includes('401') || msg.includes('unauthorized')) {
      try { router.replace('/(auth)/login'); } catch {}
      return true;
    }
    return false;
  }, [router]);

  const loadDiscover = useCallback(async () => {
    setLoading(true);
    try {
      const r = await request<{ sections: Section[] }>(`/network/discover?q=${encodeURIComponent(q)}`);
      setSections(r.sections);
    } catch (e: any) {
      if (!handleAuthError(e)) {
        setSections([]);
        setToast(e?.message || 'Could not load network');
        setTimeout(() => setToast(null), 2500);
      }
    } finally { setLoading(false); }
  }, [q, handleAuthError]);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const r = await request<{ items: Person[] }>('/network/connections');
      setConns(r.items);
    } catch (e: any) {
      if (!handleAuthError(e)) {
        setConns([]);
        setToast(e?.message || 'Could not load connections');
        setTimeout(() => setToast(null), 2500);
      }
    } finally { setLoading(false); }
  }, [handleAuthError]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const r = await request<{ items: Person[] }>('/network/requests');
      setReqs(r.items);
    } catch (e: any) {
      if (!handleAuthError(e)) {
        setReqs([]);
        setToast(e?.message || 'Could not load requests');
        setTimeout(() => setToast(null), 2500);
      }
    } finally { setLoading(false); }
  }, [handleAuthError]);

  useEffect(() => {
    if (tab === 'discover') {
      const t = setTimeout(loadDiscover, q ? 300 : 0);
      return () => clearTimeout(t);
    }
    if (tab === 'connections') loadConnections();
    if (tab === 'requests')    loadRequests();
  }, [tab, q, loadDiscover, loadConnections, loadRequests]);

  // Connect (from Discover)
  const handleConnect = async (p: Person) => {
    setSections((prev) => prev.map((sec) => ({
      ...sec,
      items: sec.items.map((it) => it.id === p.id ? { ...it, connection_state: 'pending' } : it),
    })));
    try {
      const r = await request<{ action: string }>(`/network/connect/${p.id}`, { method: 'POST' } as any);
      if (r.action === 'auto_accepted') {
        setSections((prev) => prev.map((sec) => ({
          ...sec,
          items: sec.items.map((it) => it.id === p.id ? { ...it, connection_state: 'connected' } : it),
        })));
        showToast('Connected!');
      } else if (r.action === 'already_connected') {
        showToast('Already connected');
      } else {
        showToast('Request sent');
      }
    } catch {
      // rollback
      setSections((prev) => prev.map((sec) => ({
        ...sec,
        items: sec.items.map((it) => it.id === p.id ? { ...it, connection_state: 'none' } : it),
      })));
    }
  };

  // Accept incoming request
  const handleAccept = async (p: Person) => {
    try {
      await request(`/network/accept/${p.id}`, { method: 'POST' } as any);
      setReqs((prev) => prev.filter((x) => x.id !== p.id));
      showToast(`Connected with ${p.full_name.split(' ')[0]}`);
      loadConnections();
    } catch (e) { showToast('Failed to accept'); }
  };
  // Reject incoming request
  const handleReject = async (p: Person) => {
    try {
      await request(`/network/reject/${p.id}`, { method: 'POST' } as any);
      setReqs((prev) => prev.filter((x) => x.id !== p.id));
      showToast('Request declined');
    } catch (e) { showToast('Failed to reject'); }
  };

  // ── Filtering / pagination derived data ────────────────────────────────
  const matchesFilters = useCallback((p: Person): boolean => {
    if (typeFilter !== 'all' && p.role !== typeFilter) return false;
    if (filters.role && p.role !== filters.role) return false;
    if (filters.skill) {
      const s = filters.skill.toLowerCase();
      const skills = (p.skills || []).map((x) => x.toLowerCase());
      const interests = (p.interests || []).map((x) => x.toLowerCase());
      if (!skills.includes(s) && !interests.includes(s) && (p.primary_skill || '').toLowerCase() !== s) return false;
    }
    if (filters.year) {
      const y = String(p.graduation_year ?? p.year ?? '');
      if (!y.includes(filters.year)) return false;
    }
    if (filters.city) {
      const c = (p.city || '').toLowerCase();
      if (!c.includes(filters.city.toLowerCase())) return false;
    }
    return true;
  }, [filters, typeFilter]);

  // Build a unique skill / city / year option list from loaded sections
  const filterOptions = useMemo(() => {
    const skills = new Set<string>();
    const cities = new Set<string>();
    const years = new Set<string>();
    for (const sec of sections) {
      for (const p of sec.items) {
        (p.skills || []).forEach((s) => s && skills.add(s));
        (p.interests || []).forEach((s) => s && skills.add(s));
        if (p.primary_skill) skills.add(p.primary_skill);
        if (p.city) cities.add(p.city);
        const y = p.graduation_year ?? p.year;
        if (y != null && String(y).trim()) years.add(String(y));
      }
    }
    return {
      skills: Array.from(skills).slice(0, 12),
      cities: Array.from(cities).slice(0, 8),
      years: Array.from(years).sort().slice(0, 8),
    };
  }, [sections]);

  // Flat search/filter view: when q is non-empty OR any filter active, merge sections into a single dedupe'd list
  const isSearching = q.trim().length > 0 || Object.values(filters).some(Boolean);
  const flatResults = useMemo<Person[]>(() => {
    if (!isSearching) return [];
    const seen = new Set<string>();
    const out: Person[] = [];
    for (const sec of sections) {
      for (const p of sec.items) {
        if (seen.has(p.id)) continue;
        if (!matchesFilters(p)) continue;
        seen.add(p.id);
        out.push(p);
      }
    }
    return out;
  }, [isSearching, sections, matchesFilters]);

  // Filtered sections for non-search mode (hide empty)
  const visibleSections = useMemo<Section[]>(() => {
    if (isSearching) return [];
    return sections
      .map((s) => ({ ...s, items: s.items.filter(matchesFilters) }))
      .filter((s) => s.items.length > 0);
  }, [sections, matchesFilters, isSearching]);

  const toggleExpanded = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const clearFilters = () => setFilters({});
  const filterCount = Object.values(filters).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {isWideShell && (
          <NetworkSidebar
            me={user}
            tab={tab}
            onTabChange={setTab}
            typeFilter={typeFilter}
            onTypeFilter={setTypeFilter}
            connectionsCount={conns.length}
            requestsCount={reqs.length}
            freeSessionsRemaining={freeSessionsRemaining}
          />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="net-back">
          <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Network</Text>
          <Text style={styles.subtitle}>Discover · Connect · Grow</Text>
        </View>
      </View>

      {/* Tabs (only show when sidebar is hidden — sidebar has its own nav) */}
      {!isWideShell && (
      <View style={styles.tabs}>
        {([
          { key: 'discover',    label: 'Discover',     count: null },
          { key: 'connections', label: 'Connections',  count: conns.length },
          { key: 'requests',    label: 'Requests',     count: reqs.length },
        ] as { key: TabKey; label: string; count: number | null }[]).map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            testID={`net-tab-${t.key}-mobile`}
          >
            <Text style={[styles.tabText, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
            {t.count != null && (
              <View style={[styles.tabBadge, tab === t.key && { backgroundColor: 'rgba(255,255,255,0.20)' }]}>
                <Text style={[styles.tabBadgeText, tab === t.key && { color: '#fff' }]}>{t.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
      )}

      {/* Top hero (Discover only) */}
      {tab === 'discover' && isWideShell && <TopHero me={user} />}

      {/* Advisor + AI block (Discover tab only) */}
      {tab === 'discover' && (
        <View style={{ paddingHorizontal: isMobile ? 12 : 16, marginTop: 12 }}>
          <AdvisorAIBlock
            context="network"
            advisorTitle="Talk to a Network Advisor"
            advisorDesc="Need warm intros? Our advisors curate mentors, alumni & founders for your goals."
            aiTitle="Ask the Network AI"
            aiDesc="Who should I connect with this week? How do I write a great cold message? Ask 24×7."
            advisorAccent="#A78BFA"
            aiAccent="#10B981"
            advisorIcon="account-group"
            aiIcon="robot-excited"
          />
        </View>
      )}

      {/* Search + Filters (Discover only) */}
      {tab === 'discover' && (
        <View style={{ paddingHorizontal: isMobile ? 12 : 16 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={[styles.searchBar, { flex: 1, marginHorizontal: 0 }]}>
              <Search size={15} color="rgba(255,255,255,0.45)" />
              <TextInput
                style={styles.searchInput}
                value={q}
                onChangeText={setQ}
                placeholder="Search by name, skill, college…"
                placeholderTextColor="rgba(255,255,255,0.30)"
                testID="net-search"
              />
              {!!q && (
                <Pressable onPress={() => setQ('')} testID="net-search-clear">
                  <CloseX size={14} color="rgba(255,255,255,0.55)" />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => setShowFilters((s) => !s)}
              style={[styles.filterBtn, (showFilters || filterCount > 0) && styles.filterBtnActive]}
              testID="net-filter-toggle"
            >
              <SlidersHorizontal size={14} color={(showFilters || filterCount > 0) ? '#A78BFA' : 'rgba(255,255,255,0.65)'} />
              <Text style={[styles.filterBtnText, (showFilters || filterCount > 0) && { color: '#A78BFA' }]}>
                Filters{filterCount > 0 ? ` (${filterCount})` : ''}
              </Text>
            </Pressable>
          </View>

          {/* Filter chips */}
          {showFilters && (
            <View style={styles.filterPanel}>
              <FilterRow
                label="Role"
                value={filters.role}
                options={['student', 'alumni', 'mentor', 'college']}
                onPick={(v) => setFilters((f) => ({ ...f, role: f.role === v ? undefined : v }))}
              />
              {filterOptions.skills.length > 0 && (
                <FilterRow
                  label="Skill"
                  value={filters.skill}
                  options={filterOptions.skills}
                  onPick={(v) => setFilters((f) => ({ ...f, skill: f.skill === v ? undefined : v }))}
                />
              )}
              {filterOptions.years.length > 0 && (
                <FilterRow
                  label="Year"
                  value={filters.year}
                  options={filterOptions.years}
                  onPick={(v) => setFilters((f) => ({ ...f, year: f.year === v ? undefined : v }))}
                />
              )}
              {filterOptions.cities.length > 0 && (
                <FilterRow
                  label="City"
                  value={filters.city}
                  options={filterOptions.cities}
                  onPick={(v) => setFilters((f) => ({ ...f, city: f.city === v ? undefined : v }))}
                />
              )}
              {filterCount > 0 && (
                <Pressable onPress={clearFilters} style={styles.clearFilters} testID="net-filter-clear">
                  <CloseX size={11} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11 }}>Clear all</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator color="#A78BFA" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'discover' && isSearching && (
            <View>
              <View style={[styles.sectionHeader, { paddingHorizontal: isMobile ? 12 : 16 }]}>
                <View style={[styles.sectionIcon, { backgroundColor: '#A78BFA24', borderColor: '#A78BFA60' }]}>
                  <Search size={15} color="#A78BFA" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.sectionTitle}>Search results</Text>
                    <View style={[styles.sectionCount, { backgroundColor: '#A78BFA24', borderColor: '#A78BFA60' }]}>
                      <Text style={[styles.sectionCountText, { color: '#A78BFA' }]}>{flatResults.length}</Text>
                    </View>
                  </View>
                  <Text style={styles.sectionSubtitle}>
                    {q ? `Matching "${q}"` : 'Filtered'}{filterCount > 0 ? ` · ${filterCount} filter${filterCount > 1 ? 's' : ''} applied` : ''}
                  </Text>
                </View>
              </View>
              {flatResults.length === 0 ? (
                <View style={styles.emptyState}>
                  <Search size={36} color="rgba(255,255,255,0.30)" />
                  <Text style={styles.emptyTitle}>No matches</Text>
                  <Text style={styles.emptyText}>Try a different search term or remove some filters.</Text>
                </View>
              ) : (
                <View style={[styles.grid, { paddingHorizontal: isMobile ? 12 : 16, columnGap: gap, rowGap: gap }]}>
                  {flatResults.map((p) => (
                    <PersonCard key={p.id} person={p} width={cardWidth}
                      onConnect={() => p.role === 'mentor' ? setBookingMentor(p) : handleConnect(p)}
                      onOpen={() => setBookingMentor(p)}
                      onChat={() => setChatPerson(p)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {tab === 'discover' && !isSearching && visibleSections.map((sec) => {
            const SecIcon = sec.icon ? SECTION_ICONS[sec.icon] : null;
            const tint = sec.tint || '#A78BFA';
            const isExpanded = expanded[sec.key];
            const itemsToShow = isExpanded ? sec.items : sec.items.slice(0, PAGE_SIZE);
            const hasMore = sec.items.length > PAGE_SIZE;
            return (
            <View key={sec.key} style={{ marginBottom: 22 }}>
              <View style={[styles.sectionHeader, { paddingHorizontal: isMobile ? 12 : 16 }]}>
                {SecIcon && (
                  <View style={[styles.sectionIcon, { backgroundColor: tint + '24', borderColor: tint + '60' }]}>
                    <SecIcon size={15} color={tint} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.sectionTitle}>{sec.title}</Text>
                    {sec.items.length > 0 && (
                      <View style={[styles.sectionCount, { backgroundColor: tint + '24', borderColor: tint + '60' }]}>
                        <Text style={[styles.sectionCountText, { color: tint }]}>{sec.items.length}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sectionSubtitle}>{sec.subtitle}</Text>
                </View>
              </View>
              <View style={[styles.grid, { paddingHorizontal: isMobile ? 12 : 16, columnGap: gap, rowGap: gap }]}>
                {itemsToShow.map((p) => (
                  <PersonCard key={p.id} person={p} width={cardWidth}
                    onConnect={() => p.role === 'mentor' ? setBookingMentor(p) : handleConnect(p)}
                    onOpen={() => setBookingMentor(p)}
                    onChat={() => setChatPerson(p)}
                  />
                ))}
              </View>
              {hasMore && (
                <Pressable
                  onPress={() => toggleExpanded(sec.key)}
                  style={[styles.expandPill, { borderColor: tint + '50', backgroundColor: tint + '14' }]}
                  testID={`net-expand-${sec.key}`}
                >
                  {isExpanded ? <ChevronUp size={13} color={tint} /> : <ChevronDown size={13} color={tint} />}
                  <Text style={[styles.expandText, { color: tint }]}>
                    {isExpanded ? 'Show less' : `Show all (${sec.items.length})`}
                  </Text>
                </Pressable>
              )}
            </View>
          );})}

          {tab === 'discover' && !isSearching && visibleSections.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Compass size={36} color="rgba(255,255,255,0.30)" />
              <Text style={styles.emptyTitle}>Building your network…</Text>
              <Text style={styles.emptyText}>Complete your profile to see personalized recommendations.</Text>
            </View>
          )}

          {tab === 'connections' && (
            <View style={{ paddingHorizontal: isMobile ? 12 : 16, gap: 12 }}>
              {conns.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users size={36} color="rgba(255,255,255,0.30)" />
                  <Text style={styles.emptyTitle}>No connections yet</Text>
                  <Text style={styles.emptyText}>Head to Discover and connect with people who share your goals.</Text>
                </View>
              ) : (
                <View style={[styles.grid, { columnGap: gap, rowGap: gap }]}>
                  {conns.map((p) => <PersonCard key={p.id} person={p} width={cardWidth}
                    onOpen={() => setBookingMentor(p)}
                    onChat={() => setChatPerson(p)}
                  />)}
                </View>
              )}
            </View>
          )}

          {tab === 'requests' && (
            <View style={{ paddingHorizontal: isMobile ? 12 : 16, gap: 12 }}>
              {reqs.length === 0 ? (
                <View style={styles.emptyState}>
                  <UserPlus size={36} color="rgba(255,255,255,0.30)" />
                  <Text style={styles.emptyTitle}>No pending requests</Text>
                  <Text style={styles.emptyText}>When someone wants to connect with you, they'll show up here.</Text>
                </View>
              ) : (
                <View style={[styles.grid, { columnGap: gap, rowGap: gap }]}>
                  {reqs.map((p) => (
                    <PersonCard
                      key={p.id} person={p} width={cardWidth}
                      onAccept={() => handleAccept(p)}
                      onReject={() => handleReject(p)}
                      onOpen={() => setSelectedPerson(p)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Check size={14} color="#10B981" />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* Profile detail slide-in */}
      <Modal
        transparent
        animationType="fade"
        visible={!!selectedPerson}
        onRequestClose={() => setSelectedPerson(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedPerson(null)}>
          <Pressable style={[styles.modalPanel, { width: isMobile ? '100%' : 480 }]} onPress={(e) => e.stopPropagation()}>
            {selectedPerson && (
              <ProfileDetailContent
                person={selectedPerson}
                onClose={() => setSelectedPerson(null)}
                onConnect={() => { handleConnect(selectedPerson); setSelectedPerson(null); }}
                onChat={() => showToast('Direct messages coming soon ✨')}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Chat / Phone popup */}
      <ChatPhonePopup
        visible={!!chatPerson}
        person={chatPerson}
        onClose={() => setChatPerson(null)}
        onBookSession={() => chatPerson && setBookingMentor(chatPerson)}
      />

      {/* Booking drawer */}
      <BookingDrawer
        visible={!!bookingMentor}
        mentor={bookingMentor}
        freeRemaining={freeSessionsRemaining}
        onClose={() => setBookingMentor(null)}
        onConfirm={(p) => {
          if (p.isFree) setFreeSessionsRemaining((n) => Math.max(0, n - 1));
          setBookingMentor(null);
          showToast(`Session booked for ${p.date} at ${p.time}`);
        }}
      />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── FilterRow component ──────────────────────────────────────────────────
function FilterRow({ label, value, options, onPick }: {
  label: string; value?: string; options: string[];
  onPick: (v: string) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {options.map((opt) => {
          const active = (value || '').toLowerCase() === opt.toLowerCase();
          return (
            <Pressable
              key={`${label}-${opt}`}
              onPress={() => onPick(opt)}
              style={[styles.filterOpt, active && styles.filterOptActive]}
              testID={`net-filter-${label.toLowerCase()}-${opt}`}
            >
              <Text style={[styles.filterOptText, active && { color: '#fff' }]} numberOfLines={1}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── ProfileDetailContent ─────────────────────────────────────────────────
function ProfileDetailContent({ person, onClose, onConnect, onChat }: {
  person: Person; onClose: () => void; onConnect: () => void; onChat: () => void;
}) {
  const initials = (person.full_name || '?').split(' ').slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
  const tint = person.role === 'mentor' ? '#10B981'
            : person.role === 'alumni' ? '#22D3EE'
            : person.role === 'college' ? '#10B981' : '#A78BFA';
  const isMentor = person.role === 'mentor';
  const titleLine = [person.job_title, person.organization].filter(Boolean).join(' · ');
  const collegeLine = [person.institution, person.graduation_year || person.year].filter(Boolean).join(' · ');
  const allSkills = Array.from(new Set([...(person.skills || []), ...(person.interests || [])]));

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {person.role}
        </Text>
        <Pressable onPress={onClose} style={styles.modalClose} testID="profile-detail-close">
          <CloseX size={18} color="rgba(255,255,255,0.65)" />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <View style={{ position: 'relative' }}>
          {person.photo_data ? (
            <Image source={{ uri: person.photo_data }} style={{ width: 72, height: 72, borderRadius: 36 }} />
          ) : (
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: tint + '24', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: tint, fontFamily: 'DMSans_800ExtraBold', fontSize: 24 }}>{initials}</Text>
            </View>
          )}
          {person.is_online && <View style={[styles.onlineDot, { width: 16, height: 16, borderRadius: 8, right: -2, bottom: -2, borderWidth: 3 }]} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 18 }}>{person.full_name}</Text>
          {!!titleLine && <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 4 }}>{titleLine}</Text>}
          {!!collegeLine && <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 2 }}>{collegeLine}</Text>}
          {isMentor && person.rating != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 }}>{Number(person.rating).toFixed(1)}</Text>
              </View>
              {person.sessions != null && (
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 12 }}>{person.sessions} sessions</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {!!person.sa_id && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>SA-ID</Text>
          <Text style={styles.detailValue}>{person.sa_id}</Text>
        </View>
      )}

      {/* Badges */}
      {person.badges && person.badges.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={styles.detailLabel}>Credentials & Badges</Text>
          <View style={styles.badgeRow}>
            {person.badges.map((b, i) => <BadgePill key={`mb-${i}`} badge={b} />)}
          </View>
        </View>
      )}

      {/* Skills */}
      {allSkills.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={styles.detailLabel}>Skills & Interests</Text>
          <View style={styles.chips}>
            {allSkills.map((s, i) => {
              const isPrimary = (person.primary_skill || '').toLowerCase() === s.toLowerCase();
              return (
                <View key={`s-${i}`} style={isPrimary ? styles.chipPrimary : styles.chipNeutral}>
                  <Text style={isPrimary ? styles.chipPrimaryText : styles.chipNeutralText}>{s}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Mutual */}
      {person.mutual_connections != null && person.mutual_connections > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Users size={13} color="rgba(255,255,255,0.55)" />
          <Text style={styles.metaText}>{person.mutual_connections} mutual connection{person.mutual_connections !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {/* Social */}
      {(person.linkedin_url || person.github_url) && (
        <View style={{ gap: 8 }}>
          <Text style={styles.detailLabel}>Connect via</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {person.linkedin_url && (
              <Pressable
                onPress={() => Platform.OS === 'web' ? (window as any).open(person.linkedin_url, '_blank') : Linking.openURL(person.linkedin_url!)}
                style={[styles.linkedinBtn, { width: 36, height: 36, borderRadius: 9 }]}
              >
                <Link2 size={16} color="#0B5FFF" />
              </Pressable>
            )}
            {person.github_url && (
              <Pressable
                onPress={() => Platform.OS === 'web' ? (window as any).open(person.github_url, '_blank') : Linking.openURL(person.github_url!)}
                style={[styles.linkedinBtn, { width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }]}
              >
                <Github size={16} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Action footer */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {person.connection_state === 'connected' ? (
          <View style={[styles.btn, styles.btnFlex, { backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1, height: 38, borderRadius: 9 }]}>
            <Check size={14} color="#10B981" />
            <Text style={[styles.btnText, { color: '#10B981' }]}>Connected</Text>
          </View>
        ) : person.connection_state === 'pending' ? (
          <View style={[styles.btn, styles.btnFlex, { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.40)', borderWidth: 1, height: 38, borderRadius: 9 }]}>
            <Clock size={14} color="#F59E0B" />
            <Text style={[styles.btnText, { color: '#F59E0B' }]}>Pending</Text>
          </View>
        ) : isMentor ? (
          <Pressable onPress={onConnect} style={[styles.btn, styles.btnFlex, styles.btnGreen, { height: 38, borderRadius: 9 }]}>
            <Calendar size={14} color="#fff" />
            <Text style={[styles.btnAccentText, { fontSize: 13 }]}>Book Session</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onConnect} style={[styles.btn, styles.btnFlex, styles.btnAccent, { height: 38, borderRadius: 9 }]}>
            <UserPlus size={14} color="#fff" />
            <Text style={[styles.btnAccentText, { fontSize: 13 }]}>Connect</Text>
          </Pressable>
        )}
        <Pressable onPress={onChat} style={[styles.btn, styles.btnGhost, { height: 38, paddingHorizontal: 14, borderRadius: 9 }]}>
          <MessageSquare size={14} color="rgba(255,255,255,0.85)" />
          <Text style={styles.btnGhostText}>Message</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── BadgePill (used inside ProfileDetailContent) ─────────────────────────
// Now a thin wrapper around MaterialBadgeChip for unified Material You styling.
function BadgePill({ badge }: { badge: { id: string; label: string; tier: string; icon?: string; kind?: string; category?: string } }) {
  return <MaterialBadgeChip badge={badge} size="xs" />;
}

// ── PersonCard ───────────────────────────────────────────────────────────
function PersonCard({
  person, width, onConnect, onAccept, onReject, onOpen, onChat,
}: {
  person: Person;
  width?: number;
  onConnect?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onOpen?: () => void;
  onChat?: () => void;
}) {
  const initials = (person.full_name || '?').split(' ').slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
  const tint = person.role === 'mentor' ? '#10B981'
            : person.role === 'alumni' ? '#22D3EE'
            : person.role === 'college' ? '#10B981' : '#A78BFA';
  const isMentor = person.role === 'mentor';
  // Compose subtitle line: "Job Title · Org" / "College · Year"
  const titleLine = [person.job_title, person.organization].filter(Boolean).join(' · ');
  const collegeLine = [person.institution, person.graduation_year || person.year].filter(Boolean).join(' · ');

  return (
    <HoverGlowCard tint={tint} radius={16} intensity="high" style={[styles.cardSlot, width ? { width } : null]}>
      <View style={styles.personInner}>
        {/* Top: Avatar + Identity (clickable for profile detail) */}
        <Pressable
          onPress={onOpen}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) }}
          testID={`net-card-open-${person.id}`}
        >
          <View style={{ position: 'relative' }}>
            {person.photo_data ? (
              <Image source={{ uri: person.photo_data }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: tint + '24', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={[styles.avatarText, { color: tint }]}>{initials}</Text>
              </View>
            )}
            {person.is_online && <View style={styles.onlineDot} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{person.full_name}</Text>
              {/* Active/Busy pill — only when we know online state */}
              {person.is_online === true && (
                <View style={styles.activePill}><Text style={styles.activePillText}>Active</Text></View>
              )}
              {person.is_online === false && (
                <View style={styles.busyPill}><Text style={styles.busyPillText}>Away</Text></View>
              )}
            </View>
            {!!titleLine && (
              <Text style={styles.subline} numberOfLines={1}>{titleLine}</Text>
            )}
            {!!collegeLine && (
              <Text style={styles.metaText} numberOfLines={1}>{collegeLine}</Text>
            )}
            {/* Mentor signals — rating + sessions + price */}
            {isMentor && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 }}>
                {person.rating != null && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Star size={11} color="#F59E0B" fill="#F59E0B" />
                    <Text style={[styles.metaText, { color: '#fff' }]}>{Number(person.rating).toFixed(1)}</Text>
                  </View>
                )}
                {person.sessions != null && (
                  <Text style={styles.metaText}>{person.sessions} sessions</Text>
                )}
                {person.expected_rate_inr != null && person.expected_rate_inr > 0 && (
                  <Text style={[styles.metaText, { color: '#10B981', fontFamily: 'DMSans_700Bold' }]}>
                    ₹{Number(person.expected_rate_inr).toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
            )}
          </View>
        </Pressable>

        {/* Badges (with gold Tier-1) */}
        {person.badges && person.badges.length > 0 && (
          <View style={styles.badgeRow}>
            {person.badges.slice(0, 3).map((b, idx) => <BadgePill key={`b-${idx}`} badge={b} />)}
            {person.badges_total != null && person.badges_total > 3 && (
              <View style={[styles.badgeChip, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }]}>
                <Text style={[styles.badgeChipText, { color: 'rgba(255,255,255,0.65)' }]}>+{person.badges_total - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Skills / Interests row — primary highlighted in green, others grey */}
        {(person.interests?.length || person.skills?.length) ? (
          <View style={styles.chips}>
            {(() => {
              const all = [...(person.skills || []), ...(person.interests || [])];
              const primary = person.primary_skill;
              const seen = new Set<string>();
              const ordered: string[] = [];
              if (primary) { ordered.push(primary); seen.add(primary.toLowerCase()); }
              for (const s of all) {
                if (s && !seen.has(s.toLowerCase())) { ordered.push(s); seen.add(s.toLowerCase()); }
                if (ordered.length >= 4) break;
              }
              return ordered.map((s, i) => {
                const isPrimary = primary && s.toLowerCase() === primary.toLowerCase();
                return (
                  <View
                    key={`skill-${i}`}
                    style={isPrimary ? styles.chipPrimary : styles.chipNeutral}
                  >
                    <Text style={isPrimary ? styles.chipPrimaryText : styles.chipNeutralText}>{s}</Text>
                  </View>
                );
              });
            })()}
          </View>
        ) : null}

        {/* Mutual connections */}
        {person.mutual_connections != null && person.mutual_connections > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Users size={11} color="rgba(255,255,255,0.50)" />
            <Text style={styles.metaText}>{person.mutual_connections} mutual connection{person.mutual_connections !== 1 ? 's' : ''}</Text>
          </View>
        )}

        {/* Connect via — LinkedIn / GitHub */}
        {(person.linkedin_url || person.github_url) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.metaText, { fontSize: 10.5 }]}>Connect via</Text>
            {person.linkedin_url && (
              <Pressable
                onPress={() => Platform.OS === 'web' ? (window as any).open(person.linkedin_url, '_blank') : Linking.openURL(person.linkedin_url!)}
                style={[styles.socialBtn, { backgroundColor: 'rgba(11,95,255,0.10)', borderColor: 'rgba(11,95,255,0.30)' }]}
                testID={`net-linkedin-${person.id}`}
              >
                <Link2 size={11} color="#0B5FFF" />
              </Pressable>
            )}
            {person.github_url && (
              <Pressable
                onPress={() => Platform.OS === 'web' ? (window as any).open(person.github_url, '_blank') : Linking.openURL(person.github_url!)}
                style={[styles.socialBtn, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }]}
                testID={`net-github-${person.id}`}
              >
                <Github size={11} color="#fff" />
              </Pressable>
            )}
          </View>
        )}

        {/* Primary action footer */}
        <View style={styles.footer}>
          {onAccept && onReject ? (
            <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
              <Pressable onPress={onReject} style={[styles.btn, styles.btnGhost, { flex: 1 }]} testID={`net-reject-${person.id}`}>
                <CloseX size={13} color="rgba(255,255,255,0.65)" />
                <Text style={styles.btnGhostText}>Decline</Text>
              </Pressable>
              <Pressable onPress={onAccept} style={[styles.btn, styles.btnAccent, { flex: 1 }]} testID={`net-accept-${person.id}`}>
                <Check size={13} color="#fff" />
                <Text style={styles.btnAccentText}>Accept</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
              {/* State-aware primary CTA fills width */}
              {person.connection_state === 'connected' ? (
                <View style={[styles.btn, styles.btnFlex, { backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1 }]}>
                  <Check size={13} color="#10B981" />
                  <Text style={[styles.btnText, { color: '#10B981' }]}>Connected</Text>
                </View>
              ) : person.connection_state === 'pending' ? (
                <View style={[styles.btn, styles.btnFlex, { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.40)', borderWidth: 1 }]}>
                  <Clock size={13} color="#F59E0B" />
                  <Text style={[styles.btnText, { color: '#F59E0B' }]}>Pending</Text>
                </View>
              ) : isMentor ? (
                <Pressable onPress={onConnect} style={[styles.btn, styles.btnFlex, styles.btnGreen]} testID={`net-book-${person.id}`}>
                  <Calendar size={13} color="#fff" />
                  <Text style={styles.btnAccentText}>Book Session</Text>
                </Pressable>
              ) : (
                <Pressable onPress={onConnect} style={[styles.btn, styles.btnFlex, styles.btnAccent]} testID={`net-connect-${person.id}`}>
                  <UserPlus size={13} color="#fff" />
                  <Text style={styles.btnAccentText}>Connect</Text>
                </Pressable>
              )}
              {/* Always-visible secondary chat icon */}
              <Pressable onPress={onChat} style={[styles.btn, styles.iconOnly, styles.btnGhost]} testID={`net-chat-${person.id}`}>
                <MessageSquare size={14} color="rgba(255,255,255,0.65)" />
              </Pressable>
            </View>
          )}
        </View>

        {/* View Profile — full-width secondary CTA (Standalone v3) */}
        {onOpen && (
          <Pressable onPress={onOpen} style={styles.viewProfileBtn} testID={`net-view-${person.id}`}>
            <Eye size={12} color="rgba(255,255,255,0.65)" />
            <Text style={styles.viewProfileText}>View Profile</Text>
          </Pressable>
        )}
      </View>
    </HoverGlowCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0C0818' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  title: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 19 },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },

  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  tabActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  tabText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.10)' },
  tabBadgeText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_700Bold', fontSize: 10 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
  },
  searchInput: { flex: 1, color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 13, ...({ outlineStyle: 'none' } as any) },

  content: { paddingTop: 12, paddingBottom: 30 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionIcon: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  sectionCount: {
    paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, borderWidth: 1,
    minWidth: 22, alignItems: 'center',
  },
  sectionCountText: { fontFamily: 'DMSans_700Bold', fontSize: 10.5 },
  sectionTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15 },
  sectionSubtitle: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },
  empty: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular', fontSize: 12, paddingHorizontal: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15, marginTop: 14 },
  emptyText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12.5, marginTop: 6, textAlign: 'center' },

  // ── Grid + Card slot
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cardSlot: { marginBottom: 0 },

  // ── Card
  personInner: { padding: 14, gap: 10, borderRadius: 14, overflow: 'hidden' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 15 },
  onlineDot: {
    position: 'absolute', right: -1, bottom: -1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981',
    borderColor: '#0C0818', borderWidth: 2,
  },
  name: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14, flexShrink: 1 },
  roleChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 9, letterSpacing: 0.6 },
  subline: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 3 },
  metaText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 11 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badgeChip: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
    maxWidth: 130,
  },
  badgeChipText: { fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 0.2 },
  chipPurple: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4,
    backgroundColor: 'rgba(167,139,250,0.10)',
  },
  chipPurpleText: { color: '#C4B5FD', fontFamily: 'DMSans_500Medium', fontSize: 10.5 },
  chipPrimary: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4,
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1,
  },
  chipPrimaryText: { color: '#34D399', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },
  chipNeutral: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipNeutralText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 10.5 },

  socialBtn: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: 1,
    paddingTop: 8, marginTop: 4,
  },
  linkedinBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: 'rgba(11,95,255,0.10)',
    borderColor: 'rgba(11,95,255,0.30)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 12, height: 30, borderRadius: 7,
    ...({ cursor: 'pointer' } as any),
  },
  btnFlex: { flex: 1 },
  iconOnly: { width: 30, paddingHorizontal: 0 },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
  },
  btnGhostText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  btnAccent: { backgroundColor: '#A78BFA', borderColor: '#A78BFA', borderWidth: 1 },
  btnGreen: { backgroundColor: '#10B981', borderColor: '#10B981', borderWidth: 1 },
  btnAccentText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  btnText: { fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  toast: {
    position: 'absolute', bottom: 30, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderColor: 'rgba(16,185,129,0.50)', borderWidth: 1,
  },
  toastText: { color: '#10B981', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  // ── Filters
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  filterBtnActive: {
    backgroundColor: 'rgba(167,139,250,0.14)',
    borderColor: 'rgba(167,139,250,0.50)',
  },
  filterBtnText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  filterPanel: {
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 12, gap: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
  },
  filterLabel: {
    color: 'rgba(255,255,255,0.50)', fontFamily: 'DMSans_700Bold', fontSize: 10.5,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  filterOpt: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  filterOptActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  filterOptText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
  clearFilters: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(244,63,94,0.18)', borderColor: 'rgba(244,63,94,0.40)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },

  // ── Expand "Show all" pill
  expandPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center',
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, ...({ cursor: 'pointer' } as any),
  },
  expandText: { fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  // ── Modal / Profile detail
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch',
  },
  modalPanel: {
    backgroundColor: '#0C0818',
    maxHeight: Platform.OS === 'web' ? '100%' : '92%',
    height: Platform.OS === 'web' ? '100%' : 'auto',
    borderTopLeftRadius: Platform.OS === 'web' ? 0 : 20,
    borderTopRightRadius: Platform.OS === 'web' ? 0 : 20,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalClose: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1,
  },
  detailLabel: { color: 'rgba(255,255,255,0.50)', fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  detailValue: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 12.5 },

  // Standalone v3 — Active/Busy pills + View Profile CTA
  activePill: {
    paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1,
  },
  activePillText: { color: '#34D399', fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.5 },
  busyPill: {
    paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
  },
  busyPillText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.5 },
  viewProfileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, marginTop: 6, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  viewProfileText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
});
