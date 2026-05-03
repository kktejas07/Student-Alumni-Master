/**
 * Jobs & Internships — comprehensive opportunity feed.
 *
 * Tabs:        Recommended / Saved / Applied
 * Filters:     Type (Internship/Job) · Domain · Mode · Search
 * Each card:   Match score, company, title, type/mode/stipend chips, skills,
 *              applicants, deadline, Save (bookmark) + Apply buttons.
 *
 * Wired to:
 *   GET    /api/opportunities          (?type=&domain=&mode=&q=)
 *   GET    /api/opportunities/me/saved
 *   GET    /api/opportunities/me/applied
 *   POST   /api/opportunities/{id}/save
 *   POST   /api/opportunities/{id}/apply
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable,
  TextInput, Image, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Search, Bookmark, BookmarkCheck, Clock, MapPin,
  Briefcase, Filter, Users, Sparkles, Check, ExternalLink,
} from 'lucide-react-native';
import { Colors as C } from '@/src/theme';
import { useAuth } from '@/src/viewmodels/hooks';
import { request } from '@/src/models/services/api';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';
import { HoverGlowCard } from '@/src/views/web/HoverGlowCard';

interface Opp {
  id: string;
  title: string;
  company: string;
  type: 'internship' | 'job';
  domain?: string;
  mode?: 'remote' | 'hybrid' | 'onsite';
  location?: string;
  stipend?: string;
  duration?: string;
  description?: string;
  skills?: string[];
  image?: string;
  url?: string;
  deadline?: string;
  applicants_count?: number;
  match_score?: number;
  saved?: boolean;
  applied?: boolean;
}

type TabKey = 'recommended' | 'saved' | 'applied';

export default function JobsInternshipsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('recommended');
  const [items, setItems] = useState<Opp[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<'' | 'internship' | 'job'>('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterMode, setFilterMode] = useState<'' | 'remote' | 'hybrid' | 'onsite'>('');
  const [q, setQ] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const refreshCounts = useCallback(async () => {
    try {
      const s = await request<{ items: Opp[] }>('/opportunities/me/saved');
      setSavedCount(s.items.length);
    } catch {}
    try {
      const a = await request<{ items: Opp[] }>('/opportunities/me/applied');
      setAppliedCount(a.items.length);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'saved') {
        const r = await request<{ items: Opp[] }>('/opportunities/me/saved');
        setItems(r.items || []);
      } else if (tab === 'applied') {
        const r = await request<{ items: Opp[] }>('/opportunities/me/applied');
        setItems(r.items || []);
      } else {
        const params = new URLSearchParams();
        if (filterType) params.set('type', filterType);
        if (filterDomain) params.set('domain', filterDomain);
        if (filterMode) params.set('mode', filterMode);
        if (q.trim()) params.set('q', q.trim());
        const r = await request<{ items: Opp[]; domains: string[] }>(
          `/opportunities?${params.toString()}`,
        );
        setItems(r.items || []);
        setDomains(r.domains || []);
      }
    } finally { setLoading(false); }
  }, [tab, filterType, filterDomain, filterMode, q]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => { refreshCounts(); }, [refreshCounts, items]);

  const handleSave = async (opp: Opp) => {
    setItems((prev) => prev.map((p) => p.id === opp.id ? { ...p, saved: !p.saved } : p));
    try {
      const r = await request<{ action: string }>(`/opportunities/${opp.id}/save`, { method: 'POST' } as any);
      showToast(r.action === 'saved' ? 'Saved for later' : 'Removed from saved');
      refreshCounts();
    } catch {
      // revert on error
      setItems((prev) => prev.map((p) => p.id === opp.id ? { ...p, saved: !p.saved } : p));
    }
  };

  const handleApply = async (opp: Opp) => {
    setItems((prev) => prev.map((p) => p.id === opp.id ? { ...p, applied: true } : p));
    try {
      const r = await request<{ action: string; url?: string }>(`/opportunities/${opp.id}/apply`, { method: 'POST' } as any);
      showToast(r.action === 'already_applied' ? 'Already applied' : 'Applied! Opening company page…');
      if (r.url) {
        if (Platform.OS === 'web') (window as any).open(r.url, '_blank');
        else Linking.openURL(r.url);
      }
      refreshCounts();
    } catch {
      setItems((prev) => prev.map((p) => p.id === opp.id ? { ...p, applied: false } : p));
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="opps-back">
          <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Jobs & Internships</Text>
          <Text style={styles.subtitle}>{user?.full_name?.split(' ')[0]} · personalized matches</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={15} color="rgba(255,255,255,0.45)" />
        <TextInput
          style={styles.searchInput}
          value={q}
          onChangeText={setQ}
          placeholder="Search role, company, skill…"
          placeholderTextColor="rgba(255,255,255,0.30)"
          testID="opps-search"
        />
      </View>

      {/* Advisor + AI block */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <AdvisorAIBlock
          context="internships"
          advisorTitle="Talk to a Career Advisor"
          advisorDesc="Need help shortlisting roles or polishing your resume? Connect with a career advisor."
          aiTitle="Ask the Career AI"
          aiDesc="What roles match my skills? How do I crack this interview? Ask anything 24×7."
          advisorAccent="#A78BFA"
          aiAccent="#10B981"
          advisorIcon="briefcase-account"
          aiIcon="robot-excited"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([
          { key: 'recommended', label: 'Recommended', count: null },
          { key: 'saved',       label: 'Saved',       count: savedCount },
          { key: 'applied',     label: 'Applied',     count: appliedCount },
        ] as { key: TabKey; label: string; count: number | null }[]).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
              testID={`opps-tab-${t.key}`}
            >
              <Text style={[styles.tabText, active && { color: '#fff' }]}>{t.label}</Text>
              {t.count != null && (
                <View style={[styles.tabBadge, active && { backgroundColor: 'rgba(255,255,255,0.20)' }]}>
                  <Text style={[styles.tabBadgeText, active && { color: '#fff' }]}>{t.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Filters (recommended tab only) */}
      {tab === 'recommended' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <FilterChip
            label="Type"
            value={filterType ? (filterType === 'internship' ? 'Internships' : 'Jobs') : 'All'}
            options={[
              { v: '', l: 'All Types' },
              { v: 'internship', l: 'Internships' },
              { v: 'job', l: 'Jobs' },
            ]}
            onChange={(v: any) => setFilterType(v)}
          />
          <FilterChip
            label="Mode"
            value={filterMode ? filterMode.charAt(0).toUpperCase() + filterMode.slice(1) : 'All'}
            options={[
              { v: '', l: 'All Modes' },
              { v: 'remote', l: 'Remote' },
              { v: 'hybrid', l: 'Hybrid' },
              { v: 'onsite', l: 'On-site' },
            ]}
            onChange={(v: any) => setFilterMode(v)}
          />
          <FilterChip
            label="Domain"
            value={filterDomain || 'All'}
            options={[{ v: '', l: 'All Domains' }, ...domains.map((d) => ({ v: d, l: d }))]}
            onChange={(v: any) => setFilterDomain(v)}
          />
        </ScrollView>
      )}

      {/* List */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator color="#A78BFA" size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Briefcase size={36} color="rgba(255,255,255,0.30)" />
          <Text style={styles.emptyTitle}>
            {tab === 'saved' ? 'Nothing saved yet' : tab === 'applied' ? 'No applications yet' : 'No matches found'}
          </Text>
          <Text style={styles.emptyText}>
            {tab === 'saved'
              ? 'Bookmark opportunities to revisit them later.'
              : tab === 'applied'
              ? 'Hit Apply on a card and it will appear here.'
              : 'Try removing filters or broadening your search.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((o) => (
            <OppCard key={o.id} opp={o} onSave={() => handleSave(o)} onApply={() => handleApply(o)} />
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Toast */}
      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Check size={14} color="#10B981" />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── OppCard ──────────────────────────────────────────────────────────────
function OppCard({ opp, onSave, onApply }: { opp: Opp; onSave: () => void; onApply: () => void }) {
  const matchColor =
    (opp.match_score || 0) >= 80 ? '#10B981'
  : (opp.match_score || 0) >= 60 ? '#F59E0B' : '#A78BFA';
  // Tint hover glow by opportunity type — amber for jobs, teal for internships
  const tint = opp.type === 'job' ? '#F59E0B' : '#22D3EE';
  return (
    <HoverGlowCard tint={tint} radius={14} intensity="medium" testID={`opp-card-${opp.id}`} style={{ marginBottom: 12 }}>
    <View style={styles.cardInner}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        {opp.image ? (
          <Image source={{ uri: opp.image }} style={styles.cardImg} />
        ) : (
          <View style={[styles.cardImg, { backgroundColor: 'rgba(167,139,250,0.20)', alignItems: 'center', justifyContent: 'center' }]}>
            <Briefcase size={20} color="#A78BFA" />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <Text style={styles.cardCompany} numberOfLines={1}>{opp.company}</Text>
            <View style={[styles.typeChip, { backgroundColor: opp.type === 'job' ? 'rgba(245,158,11,0.16)' : 'rgba(34,211,238,0.16)' }]}>
              <Text style={[styles.typeChipText, { color: opp.type === 'job' ? '#F59E0B' : '#22D3EE' }]}>
                {opp.type === 'job' ? 'JOB' : 'INTERN'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{opp.title}</Text>
        </View>
        {/* Match pill */}
        {opp.match_score != null && (
          <View style={[styles.matchPill, { backgroundColor: matchColor + '24', borderColor: matchColor + '70' }]}>
            <Sparkles size={10} color={matchColor} />
            <Text style={[styles.matchText, { color: matchColor }]}>{opp.match_score}%</Text>
          </View>
        )}
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {opp.mode && <MetaPill icon={MapPin} label={opp.mode === 'onsite' ? 'On-site' : opp.mode.charAt(0).toUpperCase() + opp.mode.slice(1)} />}
        {opp.location && <MetaPill label={opp.location} />}
        {opp.stipend && <MetaPill icon={Briefcase} label={opp.stipend} />}
        {opp.duration && <MetaPill icon={Clock} label={opp.duration} />}
      </View>

      {/* Description */}
      {opp.description && (
        <Text style={styles.cardDesc} numberOfLines={2}>{opp.description}</Text>
      )}

      {/* Skills */}
      {opp.skills && opp.skills.length > 0 && (
        <View style={styles.skills}>
          {opp.skills.slice(0, 5).map((s) => (
            <View key={s} style={styles.skillChip}>
              <Text style={styles.skillText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={{ flexDirection: 'row', gap: 14, flex: 1 }}>
          {opp.applicants_count != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={11} color="rgba(255,255,255,0.45)" />
              <Text style={styles.footerMeta}>{opp.applicants_count.toLocaleString('en-IN')} applicants</Text>
            </View>
          )}
          {opp.deadline && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={11} color="rgba(255,255,255,0.45)" />
              <Text style={styles.footerMeta}>By {new Date(opp.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={onSave}
            style={[styles.iconBtn, opp.saved && { backgroundColor: 'rgba(167,139,250,0.20)', borderColor: '#A78BFA' }]}
            testID={`opp-save-${opp.id}`}
          >
            {opp.saved ? <BookmarkCheck size={14} color="#A78BFA" /> : <Bookmark size={14} color="rgba(255,255,255,0.65)" />}
          </Pressable>
          <Pressable
            onPress={onApply}
            disabled={opp.applied}
            style={[styles.applyBtn, opp.applied && { backgroundColor: 'rgba(16,185,129,0.20)', borderColor: '#10B981' }]}
            testID={`opp-apply-${opp.id}`}
          >
            {opp.applied
              ? <><Check size={13} color="#10B981" /><Text style={[styles.applyText, { color: '#10B981' }]}>Applied</Text></>
              : <><ExternalLink size={13} color="#fff" /><Text style={styles.applyText}>Apply</Text></>}
          </Pressable>
        </View>
      </View>
    </View>
    </HoverGlowCard>
  );
}

function MetaPill({ icon: Icon, label }: { icon?: any; label: string }) {
  return (
    <View style={styles.metaPill}>
      {Icon && <Icon size={10} color="rgba(255,255,255,0.55)" />}
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

// ── FilterChip (custom dropdown without native) ──────────────────────────
function FilterChip({ label, value, options, onChange }:
  { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[styles.filterChip, open && { borderColor: '#A78BFA' }]}
      >
        <Filter size={11} color="rgba(255,255,255,0.55)" />
        <Text style={styles.filterChipLabel}>{label}:</Text>
        <Text style={styles.filterChipValue}>{value}</Text>
      </Pressable>
      {open && (
        <View style={styles.dropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt.v}
              onPress={() => { onChange(opt.v); setOpen(false); }}
              style={[styles.dropdownItem, value === (opt.l) && { backgroundColor: 'rgba(167,139,250,0.10)' }]}
            >
              <Text style={styles.dropdownText}>{opt.l}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const ACCENT = '#A78BFA';
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

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 4,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
  },
  searchInput: {
    flex: 1, color: '#fff',
    fontFamily: 'DMSans_500Medium', fontSize: 13,
    ...({ outlineStyle: 'none' } as any),
  },

  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  tabActive: {
    backgroundColor: ACCENT, borderColor: ACCENT,
  },
  tabText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.10)' },
  tabBadgeText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_700Bold', fontSize: 10 },

  filters: { marginBottom: 10, maxHeight: 44 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  filterChipLabel: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
  filterChipValue: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  dropdown: {
    position: 'absolute', top: 38, left: 0, minWidth: 140, zIndex: 100,
    backgroundColor: '#1B102D',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '0 12px 30px rgba(0,0,0,0.6)' } as any, default: {} }),
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 9, ...({ cursor: 'pointer' } as any) },
  dropdownText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 12 },

  list: { padding: 16, gap: 14 },
  cardInner: {
    padding: 14, gap: 10,
    borderRadius: 14, overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardImg: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  cardCompany: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_500Medium', fontSize: 12, flexShrink: 1 },
  typeChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeChipText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 9, letterSpacing: 0.6 },
  cardTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15, lineHeight: 20 },

  matchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  matchText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
  },
  metaText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 11 },

  cardDesc: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_400Regular', fontSize: 12.5, lineHeight: 18 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  skillChip: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4,
    backgroundColor: 'rgba(167,139,250,0.10)',
  },
  skillText: { color: '#C4B5FD', fontFamily: 'DMSans_500Medium', fontSize: 10.5 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: 1,
    paddingTop: 10, marginTop: 4, gap: 8,
  },
  footerMeta: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 11 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 34, borderRadius: 8,
    backgroundColor: ACCENT, borderColor: ACCENT, borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  applyText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15, marginTop: 14 },
  emptyText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12.5, marginTop: 6, textAlign: 'center' },

  toast: {
    position: 'absolute', bottom: 30, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderColor: 'rgba(16,185,129,0.50)', borderWidth: 1,
  },
  toastText: { color: '#10B981', fontFamily: 'DMSans_700Bold', fontSize: 12 },
});
