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
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable,
  TextInput, Linking, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Search, UserPlus, Check, Clock, X as CloseX,
  GraduationCap, Briefcase, Users, Link2, Github,
  Star, MapPin, Heart, UserCheck, Compass, Calendar, MessageSquare,
} from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useAuth } from '@/src/viewmodels/hooks';
import { HoverGlowCard } from '@/src/views/web/HoverGlowCard';

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
  Heart, Briefcase, GraduationCap, UserCheck, Compass,
};

type TabKey = 'discover' | 'connections' | 'requests';

export default function NetworkScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('discover');
  const [sections, setSections] = useState<Section[]>([]);
  const [conns, setConns] = useState<Person[]>([]);
  const [reqs, setReqs] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((m: string) => {
    setToast(m); setTimeout(() => setToast(null), 2200);
  }, []);

  const loadDiscover = useCallback(async () => {
    setLoading(true);
    try {
      const r = await request<{ sections: Section[] }>(`/network/discover?q=${encodeURIComponent(q)}`);
      setSections(r.sections);
    } finally { setLoading(false); }
  }, [q]);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const r = await request<{ items: Person[] }>('/network/connections');
      setConns(r.items);
    } finally { setLoading(false); }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const r = await request<{ items: Person[] }>('/network/requests');
      setReqs(r.items);
    } finally { setLoading(false); }
  }, []);

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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
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

      {/* Tabs */}
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
            testID={`net-tab-${t.key}`}
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

      {/* Search (Discover only) */}
      {tab === 'discover' && (
        <View style={styles.searchBar}>
          <Search size={15} color="rgba(255,255,255,0.45)" />
          <TextInput
            style={styles.searchInput}
            value={q}
            onChangeText={setQ}
            placeholder="Search by name…"
            placeholderTextColor="rgba(255,255,255,0.30)"
            testID="net-search"
          />
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator color="#A78BFA" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'discover' && sections.map((sec) => {
            const SecIcon = sec.icon ? SECTION_ICONS[sec.icon] : null;
            const tint = sec.tint || '#A78BFA';
            return (
            <View key={sec.key} style={{ marginBottom: 22 }}>
              <View style={[styles.sectionHeader, { paddingHorizontal: 16 }]}>
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
              {sec.items.length === 0 ? (
                <Text style={styles.empty}>No matches in this section yet.</Text>
              ) : (
                <View style={styles.grid}>
                  {sec.items.map((p) => (
                    <PersonCard key={p.id} person={p} onConnect={() => handleConnect(p)} />
                  ))}
                </View>
              )}
            </View>
          );})}

          {tab === 'connections' && (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {conns.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users size={36} color="rgba(255,255,255,0.30)" />
                  <Text style={styles.emptyTitle}>No connections yet</Text>
                  <Text style={styles.emptyText}>Head to Discover and connect with people who share your goals.</Text>
                </View>
              ) : (
                conns.map((p) => <PersonCard key={p.id} person={p} />)
              )}
            </View>
          )}

          {tab === 'requests' && (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {reqs.length === 0 ? (
                <View style={styles.emptyState}>
                  <UserPlus size={36} color="rgba(255,255,255,0.30)" />
                  <Text style={styles.emptyTitle}>No pending requests</Text>
                  <Text style={styles.emptyText}>When someone wants to connect with you, they'll show up here.</Text>
                </View>
              ) : (
                reqs.map((p) => (
                  <PersonCard
                    key={p.id} person={p}
                    onAccept={() => handleAccept(p)}
                    onReject={() => handleReject(p)}
                  />
                ))
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
    </SafeAreaView>
  );
}

// ── PersonCard ───────────────────────────────────────────────────────────
function PersonCard({
  person, onConnect, onAccept, onReject,
}: {
  person: Person;
  onConnect?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}) {
  const initials = (person.full_name || '?').split(' ').slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
  const tint = person.role === 'mentor' ? '#10B981'
            : person.role === 'alumni' ? '#22D3EE'
            : person.role === 'college' ? '#10B981' : '#A78BFA';
  const isMentor = person.role === 'mentor';
  // Compose subtitle line: "Job Title · Org" / "College · Year"
  const titleLine = [person.job_title, person.organization].filter(Boolean).join(' \u00b7 ');
  const collegeLine = [person.institution, person.graduation_year || person.year].filter(Boolean).join(' \u00b7 ');

  return (
    <HoverGlowCard tint={tint} radius={16} intensity="medium" style={styles.cardSlot}>
      <View style={styles.personInner}>
        {/* Top: Avatar + Identity */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
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
            <Text style={styles.name} numberOfLines={1}>{person.full_name}</Text>
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
                    \u20b9{Number(person.expected_rate_inr).toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Badges */}
        {person.badges && person.badges.length > 0 && (
          <View style={styles.badgeRow}>
            {person.badges.slice(0, 3).map((b, idx) => {
              const tColor =
                b.tier === 'special'  ? '#A78BFA'
              : b.tier === 'high'     ? '#F59E0B'
              : b.tier === 'verified' ? '#10B981'
              : b.tier === 'moderate' ? '#2DD4BF'
              :                          '#94A3B8';
              return (
                <View key={`b-${idx}`} style={[styles.badgeChip, { backgroundColor: tColor + '1F', borderColor: tColor + '60' }]}>
                  <Text style={[styles.badgeChipText, { color: tColor }]} numberOfLines={1}>{b.label}</Text>
                </View>
              );
            })}
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
              <Pressable style={[styles.btn, styles.iconOnly, styles.btnGhost]}>
                <MessageSquare size={14} color="rgba(255,255,255,0.65)" />
              </Pressable>
            </View>
          )}
        </View>
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
  sectionHeader: { paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15 },
  sectionSubtitle: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },
  empty: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular', fontSize: 12, paddingHorizontal: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15, marginTop: 14 },
  emptyText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12.5, marginTop: 6, textAlign: 'center' },

  // ── Card
  personInner: { padding: 14, gap: 10, borderRadius: 14, overflow: 'hidden' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 15 },
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
  chipNeutral: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipNeutralText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 10.5 },

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
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 30, borderRadius: 7,
    ...({ cursor: 'pointer' } as any),
  },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
  },
  btnGhostText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  btnAccent: { backgroundColor: '#A78BFA', borderColor: '#A78BFA', borderWidth: 1 },
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
});
