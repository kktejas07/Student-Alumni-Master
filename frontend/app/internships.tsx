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
import {View, Text, ScrollView, ActivityIndicator, Pressable, TextInput, Image, Linking, Platform} from 'react-native';
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


const styles = {
  screen: { screen: '{ flex: 1' },
  title: { title: '{ color: '#fff'' },
  subtitle: { color: 'rgba(255,255,255,0.06)' },
  tabs: { tabs: '{ flexDirection: 'row'' },
  tab: { flexDirection: 'row', paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.06)', cursor: 'pointer' },
  tabActive: { backgroundColor: 'ACCENT' },
  tabText: { color: 'rgba(255,255,255,0.06)' },
  tabBadge: { tabBadge: '{ paddingHorizontal: 6' },
  tabBadgeText: { color: 'rgba(255,255,255,0.06)' },
  empty: { empty: '{ alignItems: 'center'' },
  emptyTitle: { emptyTitle: '{ color: '#fff'' },
  emptyText: { color: 'rgba(255,255,255,0.06)' },
  list: { list: '{ padding: 16' },
  toastText: { toastText: '{ color: '#10B981'' },
  cardHeader: { cardHeader: '{ flexDirection: 'row'' },
  cardImg: { cardImg: '{ width: 44' },
  cardCompany: { color: 'rgba(255,255,255,0.06)' },
  typeChip: { typeChip: '{ paddingHorizontal: 6' },
  typeChipText: { typeChipText: '{ fontFamily: 'DMSans_800ExtraBold'' },
  cardTitle: { cardTitle: '{ color: '#fff'' },
  matchPill: { flexDirection: 'row', paddingHorizontal: 8 },
  matchText: { matchText: '{ fontFamily: 'DMSans_800ExtraBold'' },
  metaRow: { metaRow: '{ flexDirection: 'row'' },
  cardDesc: { color: 'rgba(255,255,255,0.06)' },
  skills: { skills: '{ flexDirection: 'row'' },
  skillText: { skillText: '{ color: '#C4B5FD'' },
  footerMeta: { color: 'rgba(255,255,255,0.06)' },
  iconBtn: { width: 34, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', cursor: 'pointer' },
  applyBtn: { flexDirection: 'row', paddingHorizontal: 12, backgroundColor: 'ACCENT', cursor: 'pointer' },
  applyText: { applyText: '{ color: '#fff'' },
  metaText: { color: 'rgba(255,255,255,0.06)' },
  filterChipWrapper: { position: 'relative', zIndex: 10, web: '{ overflow: 'visible'' },
  filterChip: { flexDirection: 'row', paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.06)', cursor: 'pointer' },
  filterChipLabel: { color: 'rgba(255,255,255,0.06)' },
  filterChipValue: { filterChipValue: '{ color: '#fff'' },
  dropdownItem: { dropdownItem: '{ paddingHorizontal: 12' },
  dropdownText: { dropdownText: '{ color: '#fff'' },
};

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
      <View className="flex-row px-4">
        <Pressable onPress={() => router.back()} className="items-center w-9" testID="opps-back">
          <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Jobs & Opportunities</Text>
          <Text style={styles.subtitle}>{user?.full_name?.split(' ')[0]} · personalized matches</Text>
        </View>
      </View>

      {/* Search */}
      <View className="flex-row px-4 mx-4">
        <Search size={15} color="rgba(255,255,255,0.45)" />
        <TextInput
          className="flex-1"
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
        <View className="flex-row px-4">
          <FilterChip
            label="Type"
            value={filterType ? (filterType === 'internship' ? 'Opportunities' : 'Jobs') : 'All'}
            options={[
              { v: '', l: 'All Types' },
              { v: 'internship', l: 'Opportunities' },
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
        </View>
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
        <View className="flex-row px-4 absolute" pointerEvents="none">
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
    <View className="rounded-xl p-4">
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
            <View key={s} className="px-2">
              <Text style={styles.skillText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View className="flex-row pt-3">
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
    <View className="flex-row px-2">
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
    <View style={[styles.filterChipWrapper, open && { zIndex: 200 }]}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[styles.filterChip, open && { borderColor: '#A78BFA' }]}
      >
        <Filter size={11} color="rgba(255,255,255,0.55)" />
        <Text style={styles.filterChipLabel}>{label}:</Text>
        <Text style={styles.filterChipValue}>{value}</Text>
      </Pressable>
      {open && (
        <View className="overflow-hidden absolute">
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

