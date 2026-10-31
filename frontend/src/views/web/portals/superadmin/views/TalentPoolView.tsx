/**
 * Super Admin — Talent Pool Management
 * Profile cards with CSV import, LinkedIn sync, bulk manage
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator, Linking, Image, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search, Trash2, CheckCircle, XCircle, MapPin, Briefcase, GraduationCap, Star, X, Mail, ExternalLink, Calendar, UserPlus, Send, Sparkles, Cpu, Copy, BarChart3, Zap, TrendingUp, Tags, Shield, Database, RefreshCw, ClipboardCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { request, tokenStore, resolveImageUrl } from '@/src/models/services/api';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import { GRAD } from '../applekit';
import { useSubTab } from '@/src/views/web/portals/portalUrl';

interface TalentProfile {
  id: string;
  sa_id?: string;
  full_name: string;
  headline?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  github_url?: string;
  location?: string;
  skills: string[];
  experience_years?: number;
  current_company?: string;
  current_role?: string;
  education?: string;
  graduation_year?: number;
  photo_url?: string;
  photo_data?: string;
  bio?: string;
  source: string;
  is_active: boolean;
  is_registered_user?: boolean;
  account_status?: string;
  certificate_id?: string;
  bgv_id?: string;
  // Recruiter Evaluation Columns:
  visa?: string;
  exp_level?: string;
  c2c_w2?: string;
  f2f?: string;
  interest_status?: string;
  preferred_location?: string;
  source_platform_user_id?: string;
  about?: string;
  screening_notes?: string;
  last_synced_at?: string;
  imported_at?: string;
  // TP24 quality scanner (persisted on talent_pool docs):
  quality_score?: number | null;
  needs_attention?: boolean;
  quality_missing?: string[];
  // TP18 match engine (persisted on the audit collection; may be null until a match run):
  match_score?: number | null;
  match_badge?: string;
  match_opening?: string;
}

// TP agent suite sub-tabs (URL-driven via useSubTab)
const TAB_IDS = ['profiles', 'agents', 'duplicates', 'quality', 'activity', 'insights', 'drip', 'external-jobs', 'ranker', 'interviews', 'skills', 'compliance'] as const;
type TabId = (typeof TAB_IDS)[number];
const TAB_LABELS: Record<TabId, string> = {
  profiles: 'Profiles',
  agents: 'AI Agents',
  duplicates: 'Duplicates',
  quality: 'Quality',
  activity: 'Activity',
  insights: 'Insights',
  drip: 'Drip Campaigns',
  'external-jobs': 'External Jobs',
  ranker: 'Ranker',
  interviews: 'Interviews',
  skills: 'Skills',
  compliance: 'Compliance & ATS',
};

export function TalentPoolView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const [tab, setTab] = useSubTab<TabId>(TAB_IDS, 'profiles', { sub, onSub });
  const [profiles, setProfiles] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'grid'>('spreadsheet');
  const [detailProfile, setDetailProfile] = useState<TalentProfile | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [promoteModalVisible, setPromoteModalVisible] = useState(false);
  const [candidateToPromote, setCandidateToPromote] = useState<TalentProfile | null>(null);
  const [promoteCategory, setPromoteCategory] = useState<'student' | 'alumni' | 'mentor' | 'masters'>('alumni');
  const [promoteSendInvite, setPromoteSendInvite] = useState(true);
  const [promoting, setPromoting] = useState(false);

  const openPromoteModal = (p: TalentProfile) => {
    setCandidateToPromote(p);
    setPromoteCategory('alumni');
    setPromoteSendInvite(true);
    setPromoteModalVisible(true);
  };

  // ── AI Scraping Agent State ──
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [aiScraping, setAiScraping] = useState(false);
  const [aiCandidateResult, setAiCandidateResult] = useState<any>(null);

  const handleRunAiScrape = async () => {
    if (!aiInput.trim()) {
      setMessage('Please enter a LinkedIn/GitHub URL or resume text');
      return;
    }
    setAiScraping(true);
    try {
      const res: any = await request('/admin/talent-pool/ai/scrape-and-store', {
        method: 'POST',
        body: {
          url_or_text: aiInput.trim(),
          recruiter_notes: aiNotes.trim() || undefined,
          save_to_db: true,
        },
      });
      if (res?.candidate) {
        setAiCandidateResult(res.candidate);
        setMessage(`AI Scraper Agent: ${res.candidate.full_name} (${res.candidate.current_role}) successfully stored!`);
        fetchProfiles(page);
      }
    } catch (e: any) {
      setMessage('AI Scraping failed: ' + (e?.message || ''));
    } finally {
      setAiScraping(false);
    }
  };

  const handlePromoteCandidate = async () => {
    if (!candidateToPromote) return;
    setPromoting(true);
    try {
      const res = await request<any>('/admin/talent-pool/promote-to-user', {
        method: 'POST',
        body: {
          profile_id: candidateToPromote.id,
          category: promoteCategory,
          send_invite: promoteSendInvite,
        },
      });
      setMessage(`Successfully promoted ${candidateToPromote.full_name} to ${promoteCategory}${res.invite_sent ? ' (Invite email sent)' : ''}`);
      setPromoteModalVisible(false);
      setCandidateToPromote(null);
      fetchProfiles(page);
    } catch (e: any) {
      setMessage('Promotion failed: ' + (e?.message || ''));
    } finally {
      setPromoting(false);
    }
  };

  const goToPage = useCallback((p: number) => {
    setPage(p);
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('page', String(p));
        params.set('limit', '50');
        if (search.trim()) params.set('q', search.trim());
        if (sourceFilter) params.set('source', sourceFilter);
        const data = await request<{ items: TalentProfile[]; total: number; pages: number }>(
          `/admin/talent-pool?${params.toString()}`
        );
        setProfiles(data.items);
        setTotal(data.total);
        setPages(data.pages);
      } catch (e: any) {
        setMessage('Error: ' + (e?.message || 'Failed to load'));
      } finally { setLoading(false); }
    })();
  }, [search, sourceFilter]);

  const fetchProfiles = useCallback(async (p: number = 1) => { goToPage(p); }, [goToPage]);

  useEffect(() => { fetchProfiles(1); }, []);

  const selectAllOnPage = () => {
    const next = new Set(selected);
    const allSelected = profiles.every(p => next.has(p.id));
    profiles.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id));
    setSelected(next);
  };

  const onSyncLinkedIn = async () => {
    setSyncing(true); setMessage('');
    try {
      const res = await request<{ ok: boolean; synced: number; message?: string }>(
        '/admin/talent-pool/sync-linkedin', { method: 'POST' }
      );
      setMessage(res.message || `Synced ${res.synced} profiles`);
      if (res.synced > 0) fetchProfiles(page);
    } catch (e: any) { setMessage('Sync failed: ' + (e?.message || '')); }
    finally { setSyncing(false); }
  };

  const onSyncFromUsers = async () => {
    setSyncing(true); setMessage('');
    try {
      const res = await request<{ ok: boolean; synced: number }>(
        '/admin/talent-pool/sync-from-users', { method: 'POST' }
      );
      setMessage(`Synced ${res.synced} platform users`);
    } catch (e: any) { setMessage('Sync failed: ' + (e?.message || '')); }
    finally { setSyncing(false); }
  };

  const onImportCSV = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv,.pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true); setMessage('');
      try {
        const accessToken = await tokenStore.getAccess();
        const formData = new FormData(); formData.append('file', file);
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch(`${baseUrl}/api/admin/talent-pool/import/csv`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` }, body: formData,
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.detail || 'Import failed');
        const commitRes = await request<any>('/admin/talent-pool/import/commit', {
          method: 'POST', body: { rows: data.preview },
        });
        setMessage(`Imported ${commitRes.upserted} profiles`);
        fetchProfiles(1);
      } catch (e: any) { setMessage('Import error: ' + (e?.message || '')); }
      finally { setImporting(false); }
    };
    input.click();
  };

  const onToggleActive = async (id: string, activate: boolean) => {
    try {
      await request(`/admin/talent-pool/${id}`, { method: 'PATCH', body: { is_active: activate } });
      fetchProfiles(page);
    } catch (e: any) { setMessage('Error: ' + (e?.message || '')); }
  };

  const onBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selected.size === 0) return;
    try {
      await request('/admin/talent-pool/bulk-action', { method: 'POST', body: { ids: Array.from(selected), action } });
      setSelected(new Set()); fetchProfiles(page);
      setMessage(`${action}d ${selected.size} profiles`);
    } catch (e: any) { setMessage('Error: ' + (e?.message || '')); }
  };

  const sourceLabel = (s: string) => {
    switch (s) { case 'linkedin': return 'LI'; case 'csv': return 'CSV'; case 'platform': return 'PL'; case 'import': return 'IMP'; default: return s; }
  };
  const sourceColor = (s: string) => {
    switch (s) { case 'linkedin': return '#0A66C2'; case 'csv': return '#22C55E'; case 'platform': return '#8B5CF6'; case 'import': return '#F59E0B'; default: return SAC.muted; }
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Talent Pool & Contacts</Text>
          <Text style={s.sub}>{total} unified candidate and contact profiles</Text>
        </View>
        <View style={s.headerActions}>
          <Pressable
            style={[s.btn, { backgroundColor: '#7C3AED', borderColor: '#8B5CF6', borderWidth: 1 }]}
            onPress={() => {
              setAiInput('');
              setAiNotes('');
              setAiCandidateResult(null);
              setAiModalVisible(true);
            }}
          >
            <Sparkles size={14} color="#fff" />
            <Text style={s.btnText}>Scrape with AI</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnOutline]} onPress={onSyncLinkedIn} disabled={syncing}>
            {syncing ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={s.btnText}>{syncing ? 'Syncing...' : 'Sync LinkedIn'}</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnOutline]} onPress={onSyncFromUsers} disabled={syncing}>
            <Text style={s.btnText}>Sync Users</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnPrimary]} onPress={onImportCSV} disabled={importing}>
            {importing ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={s.btnText}>{importing ? 'Importing...' : 'Import File (500MB)'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Message */}
      {message ? (
        <View style={s.msgBar}>
          <Text style={s.msgText} numberOfLines={2}>{message}</Text>
          <Pressable onPress={() => setMessage('')}><XCircle size={14} color={SAC.muted} /></Pressable>
        </View>
      ) : null}

      {/* Toolbar */}
      <View style={s.toolbar}>
        <View style={s.searchWrap}>
          <Search size={14} color={SAC.muted} />
          <TextInput style={s.searchInput} value={search} onChangeText={setSearch}
            placeholder="Search by name, skills, company, location..." placeholderTextColor={SAC.muted}
            onSubmitEditing={() => goToPage(1)} />
        </View>

        {/* View mode toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: SAC.card, borderRadius: 8, padding: 3, borderWidth: 1, borderColor: SAC.border }}>
          <Pressable
            onPress={() => setViewMode('spreadsheet')}
            style={[s.viewModeBtn, viewMode === 'spreadsheet' && { backgroundColor: '#8B5CF6' }]}
          >
            <Text style={[s.viewModeBtnText, viewMode === 'spreadsheet' && { color: SAC.text }]}>Spreadsheet</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('grid')}
            style={[s.viewModeBtn, viewMode === 'grid' && { backgroundColor: '#8B5CF6' }]}
          >
            <Text style={[s.viewModeBtnText, viewMode === 'grid' && { color: SAC.text }]}>Cards</Text>
          </Pressable>
        </View>

        <View style={s.filterBtns}>
          {['', 'linkedin', 'csv', 'import', 'platform', 'manual'].map((src) => (
            <Pressable key={src || 'all'} style={[s.filterChip, sourceFilter === src && s.filterChipActive]}
              onPress={() => { setSourceFilter(src); setPage(1); }}>
              <Text style={[s.filterChipText, sourceFilter === src && s.filterChipTextActive]}>{src || 'All'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Sub-tabs (TP agent suite) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
        {TAB_IDS.map((id) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[s.filterChip, tab === id && s.filterChipActive]}
          >
            <Text style={[s.filterChipText, tab === id && s.filterChipTextActive]}>{TAB_LABELS[id]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'profiles' ? (<>
      {/* Bulk bar */}
      {selected.size > 0 && (
        <View style={s.bulkBar}>
          <Text style={s.bulkText}>{selected.size} selected</Text>
          <Pressable style={[s.bulkBtn, { backgroundColor: '#22C55E' }]} onPress={() => onBulkAction('activate')}><Text style={s.bulkBtnText}>Activate</Text></Pressable>
          <Pressable style={[s.bulkBtn, { backgroundColor: '#F59E0B' }]} onPress={() => onBulkAction('deactivate')}><Text style={s.bulkBtnText}>Deactivate</Text></Pressable>
          <Pressable style={[s.bulkBtn, { backgroundColor: '#EF4444' }]} onPress={() => onBulkAction('delete')}><Text style={s.bulkBtnText}>Delete</Text></Pressable>
        </View>
      )}

      {/* Select All */}
      {!loading && profiles.length > 0 && (
        <Pressable style={s.selectAllBar} onPress={selectAllOnPage}>
          <View style={[s.checkbox, profiles.every(p => selected.has(p.id)) && s.checkboxActive]}>
            {profiles.every(p => selected.has(p.id)) && <CheckCircle size={12} color="#8B5CF6" />}
          </View>
          <Text style={s.selectAllText}>
            {profiles.every(p => selected.has(p.id)) ? 'Deselect all' : 'Select all on this page'}
          </Text>
        </Pressable>
      )}

      {/* Content: Spreadsheet Data Grid or Cards Grid */}
      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#8B5CF6" /></View>
      ) : profiles.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyTitle}>No profiles found</Text>
          <Text style={s.emptySub}>Import a file or sync LinkedIn to get started</Text>
        </View>
      ) : viewMode === 'spreadsheet' ? (
        <View style={{ backgroundColor: SAC.card, borderRadius: 12, borderWidth: 1, borderColor: SAC.border, overflow: 'hidden' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={s.tableHead}>
                <Text style={[s.th, { width: 36 }]}>#</Text>
                <Text style={[s.th, { width: 110 }]}>SA-ID</Text>
                <Text style={[s.th, { width: 110 }]}>QUALITY</Text>
                <Text style={[s.th, { width: 120 }]}>ACCOUNT</Text>
                <Text style={[s.th, { width: 110 }]}>CERT / BGV</Text>
                <Text style={[s.th, { width: 220 }]}>NAME & CANDIDATE</Text>
                {/* Dedicated Recruiter Evaluation Columns */}
                <Text style={[s.th, { width: 95 }]}>VISA</Text>
                <Text style={[s.th, { width: 85 }]}>EVAL EXP</Text>
                <Text style={[s.th, { width: 90 }]}>C2C / W2</Text>
                <Text style={[s.th, { width: 80 }]}>F2F</Text>
                <Text style={[s.th, { width: 120 }]}>INTEREST</Text>
                <Text style={[s.th, { width: 130 }]}>PREF LOCATION</Text>
                {/* Standard Contact/Candidate Fields */}
                <Text style={[s.th, { width: 80 }]}>SOURCE</Text>
                <Text style={[s.th, { width: 180 }]}>JOB TITLE / ROLE</Text>
                <Text style={[s.th, { width: 160 }]}>COMPANY</Text>
                <Text style={[s.th, { width: 130 }]}>LOCATION</Text>
                <Text style={[s.th, { width: 200 }]}>EMAIL</Text>
                <Text style={[s.th, { width: 110 }]}>LINKEDIN</Text>
                <Text style={[s.th, { width: 180 }]}>EDUCATION</Text>
                <Text style={[s.th, { width: 180 }]}>TOP SKILLS</Text>
                <Text style={[s.th, { width: 90 }]}>STATUS</Text>
                <Text style={[s.th, { width: 120 }]}>ACTIONS</Text>
              </View>

              {profiles.map((p) => {
                const isSelected = selected.has(p.id);
                const saId = p.sa_id || `SA-${p.id.slice(-6).toUpperCase()}`;
                const certId = p.certificate_id || p.bgv_id || null;
                const isRegistered = !!(p.is_registered_user || p.account_status === 'registered');

                return (
                  <Pressable
                    key={p.id}
                    onPress={() => { setDetailProfile(p); setDetailModalVisible(true); }}
                    style={({ hovered }: any) => [
                      s.tableRow,
                      hovered && { backgroundColor: 'rgba(255,255,255,0.03)' },
                      isSelected && { backgroundColor: 'rgba(139,92,246,0.08)' },
                    ]}
                  >
                    {/* Select */}
                    <Pressable
                      onPress={(e: any) => {
                        e.stopPropagation?.();
                        const next = new Set(selected);
                        next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                        setSelected(next);
                      }}
                      style={{ width: 36, justifyContent: 'center' }}
                    >
                      <View style={[s.checkbox, isSelected && s.checkboxActive]}>
                        {isSelected && <CheckCircle size={12} color="#8B5CF6" />}
                      </View>
                    </Pressable>

                    {/* SA-ID (Unique Candidate Identifier) */}
                    <View style={{ width: 110, justifyContent: 'center' }}>
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', alignSelf: 'flex-start' }}>
                        <Text style={{ color: '#FBBF24', fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.3 }}>
                          {saId}
                        </Text>
                      </View>
                    </View>

                    {/* TP24 Quality Score pill (real, persisted by the quality scanner) */}
                    <View style={{ width: 110, justifyContent: 'center' }}>
                      {typeof p.quality_score === 'number' ? (
                        <View
                          style={{
                            paddingHorizontal: 7,
                            paddingVertical: 2.5,
                            borderRadius: 999,
                            backgroundColor: p.quality_score >= 80 ? 'rgba(16,185,129,0.15)' : p.quality_score >= 30 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                            borderWidth: 1,
                            borderColor: p.quality_score >= 80 ? 'rgba(16,185,129,0.3)' : p.quality_score >= 30 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.35)',
                            alignSelf: 'flex-start',
                          }}
                        >
                          <Text
                            style={{
                              color: p.quality_score >= 80 ? '#10B981' : p.quality_score >= 30 ? '#F59E0B' : '#EF4444',
                              fontFamily: FONTS.bold,
                              fontSize: 10.5,
                            }}
                          >
                            {p.needs_attention ? '⚠ ' : ''}{p.quality_score}%{p.match_score != null ? ` · ${Math.round(p.match_score)}% fit` : ''}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, paddingLeft: 7 }}>— unscored</Text>
                      )}
                    </View>

                    {/* Account Status */}
                    <View style={{ width: 120, justifyContent: 'center' }}>
                      {isRegistered ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', alignSelf: 'flex-start' }}>
                          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22C55E' }} />
                          <Text style={{ color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 10 }}>Registered</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, backgroundColor: 'rgba(148,163,184,0.12)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)', alignSelf: 'flex-start' }}>
                          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#94A3B8' }} />
                          <Text style={{ color: '#CBD5E1', fontFamily: FONTS.med, fontSize: 10 }}>Non-User</Text>
                        </View>
                      )}
                    </View>

                    {/* Certificate / BGV ID */}
                    <View style={{ width: 110, justifyContent: 'center' }}>
                      {certId ? (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(168,85,247,0.12)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', alignSelf: 'flex-start' }}>
                          <Text style={{ color: '#D8B4FE', fontFamily: FONTS.bold, fontSize: 10 }}>{certId}</Text>
                        </View>
                      ) : (
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>—</Text>
                      )}
                    </View>

                    {/* Name + Avatar */}
                    <View style={{ width: 220, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                      {(p as any).photo_url || (p as any).photo_data ? (
                        <Image source={{ uri: resolveImageUrl((p as any).photo_url) || (p as any).photo_data }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                      ) : (
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 11 }}>{(p.full_name || '?')[0].toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>
                          {p.full_name || 'Unknown'}
                        </Text>
                        <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 }}>
                          {p.email || p.id.slice(-6)}
                        </Text>
                      </View>
                    </View>

                    {/* Recruiter Evaluation: Visa Status */}
                    <View style={{ width: 95, justifyContent: 'center' }}>
                      {p.visa ? (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(59,130,246,0.12)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', alignSelf: 'flex-start' }}>
                          <Text style={{ color: '#93C5FD', fontFamily: FONTS.bold, fontSize: 10 }}>{p.visa}</Text>
                        </View>
                      ) : (
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>—</Text>
                      )}
                    </View>

                    {/* Recruiter Evaluation: Evaluated Experience */}
                    <Text style={[s.td, { width: 85, color: SAC.text, fontFamily: FONTS.bold }]}>
                      {p.exp_level || (p.experience_years != null ? `${p.experience_years}y` : '—')}
                    </Text>

                    {/* Recruiter Evaluation: C2C / W2 */}
                    <View style={{ width: 90, justifyContent: 'center' }}>
                      {p.c2c_w2 ? (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', alignSelf: 'flex-start' }}>
                          <Text style={{ color: '#6EE7B7', fontFamily: FONTS.bold, fontSize: 10 }}>{p.c2c_w2}</Text>
                        </View>
                      ) : (
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>—</Text>
                      )}
                    </View>

                    {/* Recruiter Evaluation: F2F Interview */}
                    <Text style={[s.td, { width: 80, color: p.f2f?.toLowerCase().includes('yes') ? '#86EFAC' : SAC.muted }]}>
                      {p.f2f || '—'}
                    </Text>

                    {/* Recruiter Evaluation: Candidate Interest Status */}
                    <View style={{ width: 120, justifyContent: 'center' }}>
                      {p.interest_status ? (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(236,72,153,0.12)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)', alignSelf: 'flex-start' }}>
                          <Text style={{ color: '#F472B6', fontFamily: FONTS.bold, fontSize: 10 }} numberOfLines={1}>{p.interest_status}</Text>
                        </View>
                      ) : (
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>—</Text>
                      )}
                    </View>

                    {/* Recruiter Evaluation: Preferred Location */}
                    <Text numberOfLines={1} style={[s.td, { width: 130, color: SAC.muted }]}>
                      {p.preferred_location || p.location || '—'}
                    </Text>

                    {/* Source */}
                    <View style={{ width: 80, justifyContent: 'center' }}>
                      <View style={[s.sourceBadge, { backgroundColor: sourceColor(p.source) + '20', borderColor: sourceColor(p.source), alignSelf: 'flex-start' }]}>
                        <Text style={[s.sourceBadgeText, { color: sourceColor(p.source) }]}>{sourceLabel(p.source)}</Text>
                      </View>
                    </View>

                    {/* Role / Headline */}
                    <Text numberOfLines={1} style={[s.td, { width: 180 }]}>
                      {p.current_role || p.headline || '—'}
                    </Text>

                    {/* Company */}
                    <Text numberOfLines={1} style={[s.td, { width: 160, color: SAC.muted }]}>
                      {p.current_company || '—'}
                    </Text>

                    {/* Location */}
                    <Text numberOfLines={1} style={[s.td, { width: 130, color: SAC.muted }]}>
                      {p.location || '—'}
                    </Text>

                    {/* Email */}
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); if (p.email) (Platform.OS === 'web' ? window.open(`mailto:${p.email}`) : Linking.openURL(`mailto:${p.email}`)); }}
                      style={{ width: 200 }}
                    >
                      <Text numberOfLines={1} style={[s.td, { color: p.email ? '#93C5FD' : SAC.muted, width: 200 }]}>
                        {p.email || '—'}
                      </Text>
                    </Pressable>

                    {/* LinkedIn */}
                    <View style={{ width: 110, justifyContent: 'center' }}>
                      {p.linkedin_url ? (
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); Platform.OS === 'web' ? (window as any).open(p.linkedin_url, '_blank') : Linking.openURL(p.linkedin_url!); }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <ExternalLink size={11} color="#60A5FA" />
                          <Text style={{ color: '#60A5FA', fontFamily: FONTS.med, fontSize: 11 }}>Profile</Text>
                        </Pressable>
                      ) : (
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>—</Text>
                      )}
                    </View>

                    {/* Education */}
                    <View style={{ width: 180 }}>
                      <Text numberOfLines={1} style={[s.td, { width: 180, color: SAC.text, fontSize: 11 }]}>
                        {p.education || '—'}
                      </Text>
                      {p.graduation_year && (
                        <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10 }}>
                          Grad: {p.graduation_year}
                        </Text>
                      )}
                    </View>

                    {/* Skills */}
                    <View style={{ width: 180, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                      {(p.skills || []).slice(0, 2).map((sk, i) => (
                        <View key={i} style={s.skillChip}>
                          <Text style={s.skillChipText}>{sk}</Text>
                        </View>
                      ))}
                      {(p.skills || []).length > 2 && (
                        <Text style={s.moreSkills}>+{p.skills.length - 2}</Text>
                      )}
                    </View>

                    {/* Status */}
                    <View style={{ width: 90, justifyContent: 'center' }}>
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, backgroundColor: p.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', alignSelf: 'flex-start' }}>
                        <Text style={{ color: p.is_active ? '#22C55E' : '#EF4444', fontFamily: FONTS.bold, fontSize: 10 }}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={{ width: 170, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Pressable
                        onPress={(e) => { e.stopPropagation(); setDetailProfile(p); setDetailModalVisible(true); }}
                        style={{ paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' }}
                      >
                        <Text style={{ color: SAC.text, fontSize: 10, fontFamily: FONTS.bold }}>View</Text>
                      </Pressable>
                      <Pressable
                        onPress={(e) => { e.stopPropagation(); openPromoteModal(p); }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: 'rgba(139,92,246,0.14)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' }}
                      >
                        <UserPlus size={9} color="#C4B5FD" />
                        <Text style={{ color: '#C4B5FD', fontSize: 9.5, fontFamily: FONTS.bold }}>
                          {p.source_platform_user_id ? 'Linked' : 'Promote'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={(e) => { e.stopPropagation(); onToggleActive(p.id, !p.is_active); }}
                        style={{ paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: p.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }}
                      >
                        <Text style={{ color: p.is_active ? '#EF4444' : '#22C55E', fontSize: 9.5, fontFamily: FONTS.bold }}>
                          {p.is_active ? 'Disable' : 'Enable'}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Text style={[s.selectAllText, { textAlign: 'center', paddingVertical: 8 }]}>
            Showing {profiles.length} profiles of {total} · Scroll horizontally to view all columns
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
          {profiles.map((p) => (
            <Pressable
              key={p.id}
              style={[s.card, !p.is_active && s.cardInactive]}
              onPress={() => { setDetailProfile(p); setDetailModalVisible(true); }}
            >
              {/* Select checkbox */}
              <Pressable style={s.selectWrap} onPress={(e: any) => { e.stopPropagation?.(); const next = new Set(selected); next.has(p.id) ? next.delete(p.id) : next.add(p.id); setSelected(next); }}>
                <View style={[s.checkbox, selected.has(p.id) && s.checkboxActive]}>
                  {selected.has(p.id) && <CheckCircle size={12} color="#8B5CF6" />}
                </View>
              </Pressable>

              {/* Photo */}
              {(p as any).photo_url || (p as any).photo_data ? (
                <Image source={{ uri: resolveImageUrl((p as any).photo_url) || (p as any).photo_data }} style={s.avatar} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitial}>{(p.full_name || '?')[0].toUpperCase()}</Text>
                </View>
              )}

              {/* Card content */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={s.cardName} numberOfLines={1}>{p.full_name}</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); openPromoteModal(p); }}
                      style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(139,92,246,0.14)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' }}
                    >
                      <Text style={{ color: '#C4B5FD', fontSize: 9.5, fontFamily: FONTS.bold }}>Promote</Text>
                    </Pressable>
                    <View style={[s.sourceBadge, { backgroundColor: sourceColor(p.source) + '22' }]}>
                      <Text style={[s.sourceBadgeText, { color: sourceColor(p.source) }]}>{sourceLabel(p.source)}</Text>
                    </View>
                  </View>
                </View>

                {/* Headline / Role */}
                {(p.headline || p.current_role) && (
                  <Text style={s.cardHeadline} numberOfLines={2}>
                    {p.headline || p.current_role}
                  </Text>
                )}

                {/* Details row */}
                <View style={s.cardDetails}>
                  {p.current_company && (
                    <View style={s.detailRow}>
                      <Briefcase size={11} color={SAC.muted} />
                      <Text style={s.detailText} numberOfLines={1}>{p.current_company}</Text>
                    </View>
                  )}
                  {p.location && (
                    <View style={s.detailRow}>
                      <MapPin size={11} color={SAC.muted} />
                      <Text style={s.detailText} numberOfLines={1}>{p.location}</Text>
                    </View>
                  )}
                  {p.education && (
                    <View style={s.detailRow}>
                      <GraduationCap size={11} color={SAC.muted} />
                      <Text style={s.detailText} numberOfLines={1}>
                        {p.education}{p.graduation_year ? ` · ${p.graduation_year}` : ''}
                      </Text>
                    </View>
                  )}
                  {p.experience_years != null && (
                    <View style={s.detailRow}>
                      <Star size={11} color="#F59E0B" />
                      <Text style={s.detailText}>{p.experience_years} years</Text>
                    </View>
                  )}
                </View>

                {/* Skills chips */}
                {p.skills && p.skills.length > 0 && (
                  <View style={s.skillsRow}>
                    {p.skills.slice(0, 5).map((sk, i) => (
                      <View key={i} style={s.skillChip}>
                        <Text style={s.skillChipText}>{sk}</Text>
                      </View>
                    ))}
                    {p.skills.length > 5 && (
                      <Text style={s.moreSkills}>+{p.skills.length - 5}</Text>
                    )}
                  </View>
                )}

                {/* Action row */}
                <View style={s.cardActions}>
                  {p.linkedin_url && (
                    <Pressable style={s.actionBtn} onPress={(e: any) => { e.stopPropagation?.(); Platform.OS === 'web' ? (window as any).open(p.linkedin_url, '_blank') : Linking.openURL(p.linkedin_url!); }}>
                      <Text style={s.actionBtnText}>LinkedIn</Text>
                    </Pressable>
                  )}
                  {p.github_url && (
                    <Pressable style={[s.actionBtn, { backgroundColor: '#24292e' }]} onPress={(e: any) => { e.stopPropagation?.(); Platform.OS === 'web' ? (window as any).open(p.github_url, '_blank') : Linking.openURL(p.github_url!); }}>
                      <Text style={s.actionBtnText}>GitHub</Text>
                    </Pressable>
                  )}
                  <View style={{ flex: 1 }} />
                  <Pressable style={[s.iconBtn, { backgroundColor: p.is_active ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)' }]}
                    onPress={(e: any) => { e.stopPropagation?.(); onToggleActive(p.id, !p.is_active); }}>
                    {p.is_active ? <XCircle size={13} color="#EF4444" /> : <CheckCircle size={13} color="#22C55E" />}
                  </Pressable>
                  <Pressable style={[s.iconBtn, { backgroundColor: 'rgba(239,68,68,0.12)' }]}
                    onPress={(e: any) => { e.stopPropagation?.(); onToggleActive(p.id, false); }}>
                    <Trash2 size={13} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <View style={s.pagination}>
          <Pressable style={[s.pageBtn, page <= 1 && { opacity: 0.4 }]}
            onPress={() => page > 1 && goToPage(page - 1)}>
            <Text style={s.pageBtnText}>Prev</Text>
          </Pressable>
          <Text style={s.pageInfo}>{page} / {pages}</Text>
          <Pressable style={[s.pageBtn, page >= pages && { opacity: 0.4 }]}
            onPress={() => page < pages && goToPage(page + 1)}>
            <Text style={s.pageBtnText}>Next</Text>
          </Pressable>
        </View>
      )}
      </>) : (
        <PanelSwitch
          tab={tab}
          notify={setMessage}
        />
      )}

      {/* Profile Detail Modal */}
      <ProfileDetailModal
        visible={detailModalVisible}
        profile={detailProfile}
        onClose={() => { setDetailModalVisible(false); setTimeout(() => setDetailProfile(null), 200); }}
        onPromote={(p) => {
          setDetailModalVisible(false);
          setTimeout(() => openPromoteModal(p), 200);
        }}
      />

      {/* Promote to Platform User Modal */}
      <Modal visible={promoteModalVisible} transparent animationType="fade" onRequestClose={() => setPromoteModalVisible(false)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, { maxWidth: 480 }]}>
            <View style={s.modalHero}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={18} color="#C4B5FD" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Promote to Platform User</Text>
                <Text style={s.sub}>Create a registered user account in the directory</Text>
              </View>
              <Pressable onPress={() => setPromoteModalVisible(false)}><X size={16} color={SAC.muted} /></Pressable>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <View style={{ padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.border }}>
                <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 13 }}>{candidateToPromote?.full_name}</Text>
                <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>{candidateToPromote?.email || 'No email provided'}</Text>
                {candidateToPromote?.current_company && (
                  <Text style={{ color: '#93C5FD', fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>{candidateToPromote.current_role} @ {candidateToPromote.current_company}</Text>
                )}
              </View>

              {/* Category selector */}
              <View>
                <Text style={s.modalSectionLabel}>TARGET USER CATEGORY</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {(['student', 'alumni', 'mentor', 'masters'] as const).map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setPromoteCategory(cat)}
                      style={[
                        s.filterChip,
                        promoteCategory === cat && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }
                      ]}
                    >
                      <Text style={[s.filterChipText, promoteCategory === cat && { color: SAC.text }]}>
                        {cat.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Email Invite Checkbox */}
              <Pressable
                onPress={() => setPromoteSendInvite(!promoteSendInvite)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
              >
                <View style={[s.checkbox, promoteSendInvite && s.checkboxActive]}>
                  {promoteSendInvite && <CheckCircle size={13} color="#8B5CF6" />}
                </View>
                <Text style={{ color: SAC.text, fontFamily: FONTS.med, fontSize: 12 }}>
                  Send branded account claim email immediately
                </Text>
              </Pressable>

              {/* Modal buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <Pressable onPress={() => setPromoteModalVisible(false)} style={[s.btn, s.btnOutline]}>
                  <Text style={s.btnText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handlePromoteCandidate} disabled={promoting} style={[s.btn, s.btnPrimary]}>
                  {promoting ? <ActivityIndicator size="small" color="#fff" /> : <UserPlus size={13} color="#fff" />}
                  <Text style={s.btnText}>{promoting ? 'Promoting…' : 'Confirm Promotion'}</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* AI Talent Scraper Modal */}
      <Modal visible={aiModalVisible} transparent animationType="fade" onRequestClose={() => setAiModalVisible(false)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, { maxWidth: 580 }]}>
            <LinearGradient colors={['#7C3AED', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalHero}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>AI Talent Web Scraper & Ingestion Agent</Text>
                <Text style={s.modalRole}>Extracts skills, work history, and links from LinkedIn, GitHub, or Resumes</Text>
              </View>
              <Pressable onPress={() => setAiModalVisible(false)} style={s.modalCloseBtn}>
                <X size={16} color="#fff" />
              </Pressable>
            </LinearGradient>

            <ScrollView style={{ padding: 18, maxHeight: 480 }} contentContainerStyle={{ gap: 14 }}>
              <View style={{ gap: 6 }}>
                <Text style={s.modalSectionLabel}>LINKEDIN / GITHUB / PORTFOLIO URL OR RESUME TEXT *</Text>
                <TextInput
                  value={aiInput}
                  onChangeText={setAiInput}
                  placeholder="e.g. https://linkedin.com/in/username or https://github.com/developer"
                  placeholderTextColor={SAC.muted}
                  multiline
                  style={[s.searchInput, { minHeight: 70, borderRadius: 8, padding: 10, textAlignVertical: 'top' as any }]}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={s.modalSectionLabel}>RECRUITER / SCREENING NOTES (OPTIONAL)</Text>
                <TextInput
                  value={aiNotes}
                  onChangeText={setAiNotes}
                  placeholder="e.g. Top hackathon finalist, strong system design background"
                  placeholderTextColor={SAC.muted}
                  style={[s.searchInput, { borderRadius: 8, padding: 10 }]}
                />
              </View>

              {/* Candidate Result Card */}
              {aiCandidateResult && (
                <View style={{ padding: 14, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.1)', borderColor: '#7C3AED', borderWidth: 1, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 14 }}>{aiCandidateResult.full_name}</Text>
                    <View style={{ backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#34D399', fontFamily: FONTS.bold, fontSize: 11 }}>{aiCandidateResult.seniority} Level</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#DDD6FE', fontFamily: FONTS.med, fontSize: 12 }}>
                    {aiCandidateResult.current_role} at {aiCandidateResult.current_company} · {aiCandidateResult.experience_years} yrs exp
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {aiCandidateResult.skills?.map((sk: string, idx: number) => (
                      <View key={idx} style={{ backgroundColor: 'rgba(124,58,237,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ color: '#C4B5FD', fontSize: 10.5, fontFamily: FONTS.bold }}>{sk}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <Pressable
                  onPress={() => setAiModalVisible(false)}
                  style={[s.btn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                >
                  <Text style={s.btnText}>Close</Text>
                </Pressable>
                <Pressable
                  onPress={handleRunAiScrape}
                  disabled={aiScraping}
                  style={[s.btn, { backgroundColor: '#7C3AED' }]}
                >
                  {aiScraping ? <ActivityIndicator size="small" color="#fff" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={14} color="#fff" />
                      <Text style={s.btnText}>Scrape & Store</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

/* ── TP Agent Suite Sub-Tab Panels ────────────────────────────────── */

// shared panel shell + kpi helpers
function PanelShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={s.panelCard}>
      <View style={s.panelHeader}>
        <Cpu size={16} color="#8B5CF6" />
        <View>
          <Text style={s.panelTitle}>{title}</Text>
          {subtitle ? <Text style={s.panelSub}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function KpiRow({ items }: { items: { label: string; value: string | number; accent?: string }[] }) {
  return (
    <View style={s.kpiRow}>
      {items.map((k, i) => (
        <View key={i} style={s.kpiTile}>
          <Text style={[s.kpiValue, k.accent ? { color: k.accent } : null]}>{k.value}</Text>
          <Text style={s.kpiLabel}>{k.label}</Text>
        </View>
      ))}
    </View>
  );
}

function BusyMsg({ loading, error }: { loading: boolean; error?: string }) {
  if (loading) return <View style={s.centered}><ActivityIndicator size="small" color="#8B5CF6" /></View>;
  if (error) return <View style={s.msgBar}><Text style={s.msgText}>{error}</Text></View>;
  return null;
}

// ── Agents Panel ─────────────────────────────────────────────────────
function AgentsPanel({ notify }: { notify: (m: string) => void }) {
  const [agents, setAgents] = useState<Record<string, any>>({});
  const [sched, setSched] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [a, s] = await Promise.all([
        request<any>('/admin/talent-pool/agents/status'),
        request<any>('/admin/talent-pool/agents/scheduler-status'),
      ]);
      setAgents(a?.agents ?? a ?? {});
      setSched(s);
    } catch (e: any) { setErr(e?.message || 'Failed to load agent status'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const agentList = Object.values(agents) as any[];
  const steps: any[] = sched?.steps ?? [];

  return (
    <PanelShell
      title="Talent Pool AI Agents"
      subtitle={`${agentList.length} autonomous agents · in-process asyncio scheduler (not Celery Beat) · fastembed/numpy hybrid embeddings`}
    >
      <BusyMsg loading={loading} error={err} />
      {!loading && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
          {/* Master gate badge */}
          {sched && (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <View style={[s.kpiTile, { backgroundColor: sched.master_enabled ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                <Text style={[s.kpiValue, { color: sched.master_enabled ? '#10B981' : '#EF4444' }]}>{sched.master_enabled ? 'ENABLED' : 'DISABLED'}</Text>
                <Text style={s.kpiLabel}>TP_SCHEDULER_ENABLED</Text>
              </View>
              <View style={s.kpiTile}>
                <Text style={s.kpiValue}>{sched.settings_id || 'tp23_scheduler'}</Text>
                <Text style={s.kpiLabel}>scheduler doc</Text>
              </View>
            </View>
          )}

          {/* Agent card grid */}
          {agentList.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {agentList.map((a: any, i: number) => {
                  const st = a.status;
                  const stText = typeof st === 'object' ? Object.values(st).join(' · ') : (st || 'ok');
                  return (
                    <View key={i} style={s.agentCard}>
                      <View style={s.agentCardTop}>
                        <Text style={s.agentCardName}>{a.name}</Text>
                        <View style={[s.pill, a.priority === 'P1' ? { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)' } : { backgroundColor: 'rgba(148,163,184,0.12)', borderColor: 'rgba(148,163,184,0.3)' }]}>
                          <Text style={[s.pillText, { color: a.priority === 'P1' ? '#EF4444' : '#94A3B8' }]}>{a.priority}</Text>
                        </View>
                      </View>
                      <Text style={s.agentCardMeta}>group: {a.group}</Text>
                      <Text style={s.agentCardMeta} numberOfLines={2}>{stText}</Text>
                      {a.est_cost_per_month ? <Text style={[s.agentCardMeta, { color: '#10B981' }]}>{a.est_cost_per_month}</Text> : null}
                      {a.last_run_at ? <Text style={[s.agentCardMeta, { fontSize: 10 }]}>{new Date(a.last_run_at).toLocaleString()}</Text> : null}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Scheduler step registry */}
          {steps.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>SCHEDULER STEP REGISTRY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View>
                  <View style={s.dataTableHead}>
                    <Text style={[s.dataTh, { width: 160 }]}>STEP</Text>
                    <Text style={[s.dataTh, { width: 70 }]}>CADENCE</Text>
                    <Text style={[s.dataTh, { width: 140 }]}>GATE</Text>
                    <Text style={[s.dataTh, { width: 260 }]}>MODULE</Text>
                    <Text style={[s.dataTh, { width: 160 }]}>LAST RUN</Text>
                  </View>
                  {steps.map((st: any, i: number) => (
                    <View key={i} style={s.dataTableRow}>
                      <Text style={[s.dataTd, { width: 160, fontFamily: FONTS.bold, color: '#C4B5FD' }]}>{st.key}</Text>
                      <Text style={[s.dataTd, { width: 70 }]}>{st.cadence_hours === 0 ? 'every cycle' : `${st.cadence_hours}h`}</Text>
                      <Text style={[s.dataTd, { width: 140, fontSize: 10.5 }]}>{st.gate}</Text>
                      <Text style={[s.dataTd, { width: 260, fontSize: 10.5 }]} numberOfLines={1}>{st.module}</Text>
                      <Text style={[s.dataTd, { width: 160, fontSize: 10.5 }]}>
                        {st.last_run_at ? new Date(st.last_run_at).toLocaleString() : '— never'}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable style={[s.btn, s.btnOutline]} onPress={load}>
              <RefreshCw size={13} color="#C4B5FD" />
              <Text style={s.btnText}>Refresh</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </PanelShell>
  );
}

// ── Duplicates Panel ─────────────────────────────────────────────────
function DuplicatesPanel({ notify }: { notify: (m: string) => void }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [openGroups, setOpenGroups] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [merging, setMerging] = useState(false);
  const [selKeepers, setSelKeepers] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await request<any>('/admin/talent-pool/duplicates');
      setGroups(res?.groups ?? []);
      setOpenGroups(res?.open_groups ?? 0);
      // default keeper = suggested_keeper
      const init: Record<string, string> = {};
      (res?.groups ?? []).forEach((g: any) => {
        if (g.suggested_keeper) init[g.group_id] = String(g.suggested_keeper);
      });
      setSelKeepers(init);
    } catch (e: any) { setErr(e?.message || 'Failed to load duplicates'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rescan = async () => {
    setScanning(true);
    try {
      const res = await request<any>('/admin/talent-pool/duplicates/rescan', { method: 'POST' });
      notify(`Rescan complete: ${res?.groups_found ?? 0} groups from ${res?.pairs_checked ?? 0} pairs checked`);
      load();
    } catch (e: any) { notify('Rescan failed: ' + (e?.message || '')); }
    finally { setScanning(false); }
  };

  const mergeGroup = async (g: any) => {
    const keeper = selKeepers[g.group_id];
    if (!keeper) { notify('Select a keeper profile for this group'); return; }
    setMerging(true);
    try {
      const dropRefs = (g.members ?? []).filter((m: any) => String(m.id) !== keeper && m.collection !== 'talent_pool');
      const dropTalent = (g.members ?? []).filter((m: any) => String(m.id) !== keeper && m.collection === 'talent_pool').map((m: any) => m.id);
      const dropContacts = dropRefs.map((m: any) => `contacts:${m.id}`);
      const res = await request<any>('/admin/talent-pool/duplicates/merge', {
        method: 'POST',
        body: { group_id: g.group_id, keep_ref: keeper, drop_refs: [...dropTalent, ...dropContacts], reasons: [g.reasons?.join?.(', ') || 'manual merge'] },
      });
      notify(`Merged ${res?.merged ?? 0} duplicate profiles`);
      load();
    } catch (e: any) { notify('Merge failed: ' + (e?.message || '')); }
    finally { setMerging(false); }
  };

  const memberKey = (m: any) => `${m.collection}:${m.id}`;

  return (
    <PanelShell title="Duplicate Groups" subtitle={`${openGroups} open groups · entity resolution across talent_pool + contacts`}>
      <BusyMsg loading={loading} error={err} />
      {!loading && groups.length === 0 && (
        <View style={s.centered}>
          <CheckCircle size={24} color="#10B981" />
          <Text style={s.emptyTitle}>No open duplicate groups</Text>
        </View>
      )}
      {groups.length > 0 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable style={[s.btn, s.btnOutline]} onPress={rescan} disabled={scanning}>
              {scanning ? <ActivityIndicator size="small" color="#C4B5FD" /> : <Search size={13} color="#C4B5FD" />}
              <Text style={s.btnText}>{scanning ? 'Scanning…' : 'Rescan Pool'}</Text>
            </Pressable>
          </View>
          {groups.map((g: any) => (
            <View key={g.group_id} style={s.dedupGroupCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={s.sectionLabel}>GROUP · {(g.reasons || []).join(', ') || g.group_id}</Text>
                <Text style={{ color: SAC.muted, fontSize: 10 }}>{new Date(g.found_at || g.updated_at || 0).toLocaleDateString()}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(g.members ?? []).map((m: any) => {
                    const isKeeper = selKeepers[g.group_id] === String(m.id);
                    return (
                      <Pressable key={memberKey(m)} onPress={() => setSelKeepers(prev => ({ ...prev, [g.group_id]: String(m.id) }))}
                        style={[s.dedupMemberCard, isKeeper && s.dedupMemberCardKeeper]}>
                        {isKeeper && <View style={{ ...s.dedupKeeperDot }} />}
                        <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 11 }} numberOfLines={1}>{m.full_name || m.id}</Text>
                        <Text style={{ color: SAC.muted, fontSize: 10, fontFamily: FONTS.med }} numberOfLines={1}>{m.email || m.collection}</Text>
                        {isKeeper && <Text style={{ color: '#10B981', fontSize: 10, fontFamily: FONTS.bold }}>KEEPER</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Pressable style={[s.btn, s.btnPrimary]} onPress={() => mergeGroup(g)} disabled={merging}>
                  {merging ? <ActivityIndicator size="small" color="#fff" /> : <Copy size={12} color="#fff" />}
                  <Text style={s.btnText}>Merge Group</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </PanelShell>
  );
}

// ── Quality Panel ────────────────────────────────────────────────────
function QualityPanel({ notify }: { notify: (m: string) => void }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setReport(await request<any>('/admin/talent-pool/quality/report')); }
    catch (e: any) { setErr(e?.message || 'Failed to load quality report'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const runScanner = async () => {
    setRunning(true);
    try {
      const res = await request<any>('/admin/talent-pool/quality/run', { method: 'POST' });
      notify(`Quality scanner: scored ${res?.scored} profiles, ${res?.changed} changed, ${res?.needs_attention} need attention`);
      load();
    } catch (e: any) { notify('Scanner failed: ' + (e?.message || '')); }
    finally { setRunning(false); }
  };

  const dims: [string, number][] = report?.avg_per_dimension ? Object.entries(report.avg_per_dimension) as [string, number][] : [];
  const lowScoring: any[] = report?.low_scoring ?? [];

  return (
    <PanelShell title="Data Quality (TP24)" subtitle="Deterministic 100-point rubric · runs every 6 hours via TP23 scheduler">
      <BusyMsg loading={loading} error={err} />
      {!loading && report && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
          <KpiRow items={[
            { label: 'Total Profiles', value: report.total },
            { label: 'Scored', value: report.scored },
            { label: 'Mean Score', value: `${report.mean_score ?? 0}%`, accent: (report.mean_score ?? 0) >= 60 ? '#10B981' : '#F59E0B' },
            { label: 'Needs Attention', value: report.needs_attention, accent: report.needs_attention > 0 ? '#EF4444' : '#10B981' },
          ]} />
          {/* Distribution buckets */}
          {report.buckets && (
            <View>
              <Text style={s.sectionLabel}>SCORE DISTRIBUTION</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                {Object.entries(report.buckets as Record<string, number>).map(([range, count]) => (
                  <View key={range} style={s.kpiTile}>
                    <Text style={s.kpiValue}>{count}</Text>
                    <Text style={s.kpiLabel}>{range}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {/* Dimension pass rates */}
          {dims.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>DIMENSION PASS RATES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {dims.map(([k, v]) => (
                    <View key={k} style={[s.kpiTile, { backgroundColor: v >= 80 ? 'rgba(16,185,129,0.1)' : v >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)' }]}>
                      <Text style={[s.kpiValue, { color: v >= 80 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444' }]}>{v}%</Text>
                      <Text style={s.kpiLabel}>{k}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
          {/* Low-scoring queue */}
          {lowScoring.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>LOW-SCORING QUEUE (bottom {lowScoring.length})</Text>
              <ScrollView style={{ marginTop: 8, maxHeight: 200 }} contentContainerStyle={{ gap: 6 }}>
                {lowScoring.map((p: any, i: number) => (
                  <View key={i} style={s.listRow}>
                    <Text style={[s.listRowTitle, { color: '#F59E0B' }]}>{p.full_name || p.id}</Text>
                    <Text style={s.listRowSub}>{p.quality_score}% · missing: {(p.missing || []).join(', ') || 'n/a'}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable style={[s.btn, s.btnPrimary]} onPress={runScanner} disabled={running}>
              {running ? <ActivityIndicator size="small" color="#fff" /> : <Zap size={13} color="#fff" />}
              <Text style={s.btnText}>{running ? 'Scoring…' : 'Run Scanner Now'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </PanelShell>
  );
}

// ── Activity Panel ───────────────────────────────────────────────────
function ActivityPanel({ notify }: { notify: (m: string) => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [profileId, setProfileId] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (profileId.trim()) params.set('profile_id', profileId.trim());
      const res = await request<any>(`/admin/talent-pool/activity?${params.toString()}`);
      setEvents(res?.events ?? []);
    } catch (e: any) { setErr(e?.message || 'Failed to load activity'); }
    finally { setLoading(false); }
  }, [profileId]);
  useEffect(() => { load(); }, [load]);

  return (
    <PanelShell title="Activity Log" subtitle="Unified event stream from agent runs, promotions, syncs and manual edits">
      <BusyMsg loading={loading} error={err} />
      {!loading && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput style={[s.formInput, { flex: 1 }]} value={profileId} onChangeText={setProfileId}
              placeholder="Filter by profile ID (optional)" placeholderTextColor={SAC.muted} />
            <Pressable style={[s.btn, s.btnOutline]} onPress={load}><Text style={s.btnText}>Filter</Text></Pressable>
          </View>
          {events.length === 0 ? <Text style={{ color: SAC.muted, fontSize: 12, fontFamily: FONTS.med }}>No events yet</Text> : null}
          <ScrollView style={{ flex: 1, maxHeight: 400 }} contentContainerStyle={{ gap: 6 }}>
            {events.map((ev: any, i: number) => (
              <View key={i} style={s.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.listRowTitle}>{ev.action || ev.type}</Text>
                  <Text style={s.listRowSub} numberOfLines={2}>
                    {[ev.actor, ev.object_type, ev.summary].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text style={{ color: SAC.muted, fontSize: 10, fontFamily: FONTS.med }}>{ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </PanelShell>
  );
}

// ── Insights Panel ───────────────────────────────────────────────────
function InsightsPanel({ notify }: { notify: (m: string) => void }) {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [genBusy, setGenBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await request<any>('/admin/talent-pool/insights?limit=4');
      setInsights(res?.insights ?? []);
    } catch (e: any) { setErr(e?.message || 'Failed to load insights'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenBusy(true);
    try {
      const res = await request<any>('/admin/talent-pool/insights/generate', { method: 'POST' });
      notify('Insights regenerated: ' + JSON.stringify(res?.summary ?? res ?? ''));
      load();
    } catch (e: any) { notify('Generate failed: ' + (e?.message || '')); }
    finally { setGenBusy(false); }
  };

  const latest = insights[0];

  return (
    <PanelShell title="Pool Insights (TP27)" subtitle="Weekly cohort analytics · source effectiveness, skill trends, geo, pipeline velocity, conversion funnel">
      <BusyMsg loading={loading} error={err} />
      {!loading && !latest && <Text style={{ color: SAC.muted, fontSize: 12, fontFamily: FONTS.med }}>No insights yet — run the generator or wait for the weekly scheduler step.</Text>}
      {!loading && latest && (
        <View style={{ gap: 12 }}>
          <Text style={s.sectionLabel}>WEEK OF {new Date(latest.week_start).toLocaleDateString()} · computed {new Date(latest.computed_at).toLocaleString()}</Text>
          {latest.payload && (
            <View style={{ gap: 10 }}>
              {latest.payload.source_effectiveness && (
                <View>
                  <Text style={s.sectionLabel}>SOURCE EFFECTIVENESS</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {Object.entries(latest.payload.source_effectiveness).map(([src, v]: [string, any]) => (
                      <View key={src} style={s.kpiTile}>
                        <Text style={s.kpiValue}>{typeof v === 'number' ? v : JSON.stringify(v)}</Text>
                        <Text style={s.kpiLabel}>{src}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {latest.payload.skill_trends && (
                <View>
                  <Text style={s.sectionLabel}>SKILL TRENDS</Text>
                  <Text style={{ color: SAC.muted, fontSize: 11, fontFamily: FONTS.med, marginTop: 4 }}>
                    {JSON.stringify(latest.payload.skill_trends, null, 0)}
                  </Text>
                </View>
              )}
              {latest.payload.pipeline_velocity && (
                <View>
                  <Text style={s.sectionLabel}>PIPELINE VELOCITY</Text>
                  <Text style={{ color: SAC.muted, fontSize: 11, fontFamily: FONTS.med, marginTop: 4 }}>
                    {JSON.stringify(latest.payload.pipeline_velocity, null, 0)}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable style={[s.btn, s.btnPrimary]} onPress={generate} disabled={genBusy}>
              {genBusy ? <ActivityIndicator size="small" color="#fff" /> : <TrendingUp size={13} color="#fff" />}
              <Text style={s.btnText}>{genBusy ? 'Generating…' : 'Generate Now'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </PanelShell>
  );
}

// ── Drip Campaigns Panel ─────────────────────────────────────────────
function DripPanel({ notify }: { notify: (m: string) => void }) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [openingRef, setOpeningRef] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await request<any>('/admin/talent-pool/drips');
      setCampaigns(res?.campaigns ?? []);
    } catch (e: any) { setErr(e?.message || 'Failed to load drips'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const createCampaign = async () => {
    if (!campaignName.trim()) { notify('Campaign name required'); return; }
    setBusy(true);
    try {
      await request('/admin/talent-pool/drips/create', {
        method: 'POST', body: { name: campaignName.trim(), opening_ref: openingRef.trim() || undefined },
      });
      notify(`Created drip campaign "${campaignName.trim()}"`);
      setCampaignName(''); setOpeningRef('');
      load();
    } catch (e: any) { notify('Create failed: ' + (e?.message || '')); }
    finally { setBusy(false); }
  };

  const runCampaign = async (id: string) => {
    setBusy(true);
    try {
      const res = await request<any>(`/admin/talent-pool/drips/run?campaign_id=${id}`, { method: 'POST' });
      notify(`Drip run: ${JSON.stringify(res ?? '')}`);
      load();
    } catch (e: any) { notify('Run failed: ' + (e?.message || '')); }
    finally { setBusy(false); }
  };

  return (
    <PanelShell title="Email Drip Campaigns (TP21)" subtitle="Gated by TP_DRIP_ENABLED · real email sends only after explicit deploy opt-in">
      <BusyMsg loading={loading} error={err} />
      {!loading && (
        <View style={{ gap: 12 }}>
          {/* Create form */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextInput style={[s.formInput, { flex: 1, minWidth: 160 }]} value={campaignName} onChangeText={setCampaignName}
              placeholder="Campaign name" placeholderTextColor={SAC.muted} />
            <TextInput style={[s.formInput, { flex: 1, minWidth: 140 }]} value={openingRef} onChangeText={setOpeningRef}
              placeholder="Opening ref (optional)" placeholderTextColor={SAC.muted} />
            <Pressable style={[s.btn, s.btnPrimary]} onPress={createCampaign} disabled={busy}>
              <UserPlus size={12} color="#fff" /><Text style={s.btnText}>Create</Text>
            </Pressable>
          </View>
          {/* Campaign list */}
          {campaigns.length === 0 && <Text style={{ color: SAC.muted, fontSize: 12, fontFamily: FONTS.med }}>No drip campaigns yet.</Text>}
          <ScrollView style={{ flex: 1, maxHeight: 300 }} contentContainerStyle={{ gap: 8 }}>
            {campaigns.map((c: any) => (
              <View key={c.id} style={s.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.listRowTitle}>{c.name}</Text>
                  <Text style={s.listRowSub}>
                    status: {c.status} · {c.recipients ?? 0} recipients · {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                    {c.stats ? ` · sent: ${c.stats.sent ?? 0} / open: ${c.stats.open_rate_pct ?? 0}% / click: ${c.stats.click_rate_pct ?? 0}%` : ''}
                  </Text>
                </View>
                <Pressable style={[s.btn, s.btnOutline]} onPress={() => runCampaign(c.id)} disabled={busy}>
                  <Zap size={11} color="#C4B5FD" /><Text style={s.btnText}>Run</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </PanelShell>
  );
}

// ── External Jobs Panel ──────────────────────────────────────────────
function ExternalJobsPanel({ notify }: { notify: (m: string) => void }) {
  const [listings, setListings] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [j, d] = await Promise.all([
        request<any>('/admin/talent-pool/external-jobs?limit=30'),
        request<any>('/admin/talent-pool/external-jobs/deadlines?days=7').catch(() => ({ alerts: [] })),
      ]);
      setListings(j?.listings ?? []);
      setDeadlines(d?.alerts ?? d ?? []);
    } catch (e: any) { setErr(e?.message || 'Failed to load external jobs'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const refetch = async () => {
    setFetching(true);
    try {
      const res = await request<any>('/admin/talent-pool/external-jobs/fetch?limit=50', { method: 'POST' });
      notify(`Fetched ${res?.listings?.length ?? 0} new listings`);
      load();
    } catch (e: any) { notify('Fetch failed: ' + (e?.message || '')); }
    finally { setFetching(false); }
  };

  return (
    <PanelShell title="External Job Boards (TP28/TP29)" subtitle="Naukri + Internshala spider · fetched every 12h · matched to pool skills">
      <BusyMsg loading={loading} error={err} />
      {!loading && (
        <View style={{ gap: 12 }}>
          {/* Deadline alerts */}
          {deadlines.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>DEADLINE ALERTS (next 7 days)</Text>
              <ScrollView style={{ maxHeight: 150, marginTop: 8 }} contentContainerStyle={{ gap: 6 }}>
                {deadlines.map((d: any, i: number) => (
                  <View key={i} style={[s.listRow, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listRowTitle}>{d.title} — {d.company}</Text>
                      <Text style={s.listRowSub}>
                        {d.location ? `${d.location} · ` : ''}{d.salary_text || ''} · deadline in {d.days_left}d
                      </Text>
                    </View>
                    {d.url ? <ExternalLink size={13} color="#EF4444" /> : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          {/* Listings */}
          {listings.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>RECENT LISTINGS ({listings.length})</Text>
              <ScrollView style={{ marginTop: 8, maxHeight: 300 }} contentContainerStyle={{ gap: 6 }}>
                {listings.map((l: any, i: number) => (
                  <View key={i} style={s.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listRowTitle} numberOfLines={1}>{l.title} {l.company ? `— ${l.company}` : ''}</Text>
                      <Text style={s.listRowSub} numberOfLines={1}>
                        {[l.board, l.location, l.salary_text, l.matched ? `matched: ${l.matched}` : ''].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text style={{ color: '#10B981', fontSize: 10, fontFamily: FONTS.bold }}>{l.status || 'active'}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          {listings.length === 0 && deadlines.length === 0 && (
            <Text style={{ color: SAC.muted, fontSize: 12, fontFamily: FONTS.med }}>No listings fetched yet.</Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable style={[s.btn, s.btnPrimary]} onPress={refetch} disabled={fetching}>
              {fetching ? <ActivityIndicator size="small" color="#fff" /> : <Database size={13} color="#fff" />}
              <Text style={s.btnText}>{fetching ? 'Fetching…' : 'Fetch Now'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </PanelShell>
  );
}

// ── Ranker Panel ─────────────────────────────────────────────────────
function RankerPanel({ notify }: { notify: (m: string) => void }) {
  const [results, setResults] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [minExp, setMinExp] = useState('');
  const [maxExp, setMaxExp] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const runRanker = async () => {
    setLoading(true); setErr('');
    try {
      const p = new URLSearchParams();
      p.set('k', '10');
      if (jobTitle.trim()) p.set('title', jobTitle.trim());
      if (skills.trim()) p.set('skills', skills.trim());
      if (minExp.trim()) p.set('min_experience', minExp.trim());
      if (maxExp.trim()) p.set('max_experience', maxExp.trim());
      const res = await request<any>(`/admin/talent-pool/ranker?${p.toString()}`);
      setResults(res?.results ?? []);
      setMeta({ model: res?.model_used, labels: res?.label_count, health: res?.health, topFactors: res?.top_factors_global });
    } catch (e: any) { setErr(e?.message || 'Ranker failed'); }
    finally { setLoading(false); }
  };

  const retrain = async () => {
    setLoading(true);
    try {
      const res = await request<any>('/admin/talent-pool/ranker/retrain', { method: 'POST' });
      notify(`Ranker retrained: ${JSON.stringify(res ?? '')}`);
      runRanker();
    } catch (e: any) { notify('Retrain failed: ' + (e?.message || '')); }
    finally { setLoading(false); }
  };

  return (
    <PanelShell title="Candidate Ranker (TP19)" subtitle="ML model · daily retrain via TP23 scheduler · fallback: cold-start cosine scoring">
      <BusyMsg loading={loading} error={err} />
      <View style={{ gap: 10, marginBottom: 12 }}>
        <TextInput style={s.formInput} value={jobTitle} onChangeText={setJobTitle} placeholder="Job title (e.g. Full Stack Developer)" placeholderTextColor={SAC.muted} />
        <TextInput style={s.formInput} value={skills} onChangeText={setSkills} placeholder="Comma-separated skills (e.g. React, Node, PostgreSQL)" placeholderTextColor={SAC.muted} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput style={[s.formInput, { flex: 1 }]} value={minExp} onChangeText={setMinExp} placeholder="Min years" placeholderTextColor={SAC.muted} keyboardType="numeric" />
          <TextInput style={[s.formInput, { flex: 1 }]} value={maxExp} onChangeText={setMaxExp} placeholder="Max years" placeholderTextColor={SAC.muted} keyboardType="numeric" />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
          <Pressable style={[s.btn, s.btnOutline]} onPress={retrain} disabled={loading}>
            <RefreshCw size={12} color="#C4B5FD" /><Text style={s.btnText}>Retrain Model</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnPrimary]} onPress={runRanker} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <BarChart3 size={13} color="#fff" />}
            <Text style={s.btnText}>Rank</Text>
          </Pressable>
        </View>
      </View>
      {meta && (
        <Text style={{ color: SAC.muted, fontSize: 11, fontFamily: FONTS.med, marginBottom: 8 }}>
          model: {meta.model} · labels: {meta.labels} · health: {JSON.stringify(meta.health)}
        </Text>
      )}
      {results.length > 0 && (
        <ScrollView style={{ flex: 1, maxHeight: 360 }} contentContainerStyle={{ gap: 6 }}>
          {results.map((r: any, i: number) => (
            <View key={i} style={s.listRow}>
              <View style={[s.rankBadge, { backgroundColor: r.score >= 0.8 ? 'rgba(16,185,129,0.15)' : r.score >= 0.5 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                <Text style={{ color: r.score >= 0.8 ? '#10B981' : r.score >= 0.5 ? '#F59E0B' : '#EF4444', fontFamily: FONTS.bold, fontSize: 13 }}>
                  {Math.round((r.score ?? 0) * 100)}%
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.listRowTitle}>{r.full_name || r.candidate_id}</Text>
                <Text style={s.listRowSub} numberOfLines={1}>
                  {((r.matched_skills || []).slice(0, 4).join(', ')) || 'no skill match'}
                  {r.missing_skills?.length ? ` · missing: ${r.missing_skills.slice(0, 3).join(', ')}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </PanelShell>
  );
}

// ── Interviews Panel ─────────────────────────────────────────────────
function InterviewsPanel({ notify }: { notify: (m: string) => void }) {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedBusy, setSchedBusy] = useState(false);
  const [err, setErr] = useState('');
  const [schedProfile, setSchedProfile] = useState('');
  const [schedStart, setSchedStart] = useState('');
  const [schedInvitee, setSchedInvitee] = useState('');
  const [schedCal, setSchedCal] = useState('auto');
  const [fbInterview, setFbInterview] = useState<any>(null);
  const [fbDecision, setFbDecision] = useState('');
  const [fbNotes, setFbNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await request<any>('/admin/talent-pool/interviews?limit=30');
      setInterviews(res?.interviews ?? []);
    } catch (e: any) { setErr(e?.message || 'Failed to load interviews'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const schedule = async () => {
    if (!schedProfile.trim()) { notify('Profile ID required'); return; }
    setSchedBusy(true);
    try {
      const res = await request<any>('/admin/talent-pool/interviews', {
        method: 'POST',
        body: {
          profile_id: schedProfile.trim(),
          start: schedStart.trim() || new Date(Date.now() + 2 * 3600_000).toISOString(),
          duration_min: 45,
          invitee_email: schedInvitee.trim() || undefined,
          calendar: schedCal,
        },
      });
      if (res?.error) notify(`Schedule: ${res.error}`);
      else notify(`Interview ${res?.interview_id || ''} created via ${res?.backend || 'calendar'}`);
      load();
    } catch (e: any) { notify('Schedule failed: ' + (e?.message || '')); }
    finally { setSchedBusy(false); }
  };

  const submitFeedback = async () => {
    if (!fbInterview || !fbDecision) { notify('Select a decision'); return; }
    setSchedBusy(true);
    try {
      await request('/admin/talent-pool/interviews/' + fbInterview.interview_id + '/feedback', {
        method: 'POST', body: { decision: fbDecision, notes: fbNotes.trim() || undefined },
      });
      notify('Feedback recorded');
      setFbInterview(null); setFbDecision(''); setFbNotes('');
      load();
    } catch (e: any) { notify('Feedback failed: ' + (e?.message || '')); }
    finally { setSchedBusy(false); }
  };

  return (
    <PanelShell title="Interviews & Calendar (TP32)" subtitle="Auto / Google / MS365 / ICS backends · syncs via TP23 calendar_sync step">
      <BusyMsg loading={loading} error={err} />
      {!loading && (
        <View style={{ gap: 10 }}>
          {/* Schedule form */}
          <View>
            <Text style={s.sectionLabel}>SCHEDULE NEW INTERVIEW</Text>
            <View style={{ gap: 8, marginTop: 8, flexWrap: 'wrap', flexDirection: 'row' }}>
              <TextInput style={[s.formInput, { flex: 1, minWidth: 120 }]} value={schedProfile} onChangeText={setSchedProfile} placeholder="Profile ID" placeholderTextColor={SAC.muted} />
              <TextInput style={[s.formInput, { flex: 1, minWidth: 160 }]} value={schedStart} onChangeText={setSchedStart} placeholder="Start (ISO or blank = 2h)" placeholderTextColor={SAC.muted} />
              <TextInput style={[s.formInput, { flex: 1, minWidth: 140 }]} value={schedInvitee} onChangeText={setSchedInvitee} placeholder="Invitee email" placeholderTextColor={SAC.muted} />
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(['auto', 'gcal', 'ms365', 'ics'] as const).map(c => (
                  <Pressable key={c} style={[s.filterChip, schedCal === c && s.filterChipActive]} onPress={() => setSchedCal(c)}>
                    <Text style={[s.filterChipText, schedCal === c && s.filterChipTextActive]}>{c.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={[s.btn, s.btnPrimary]} onPress={schedule} disabled={schedBusy}>
                <Calendar size={12} color="#fff" /><Text style={s.btnText}>Schedule</Text>
              </Pressable>
            </View>
          </View>
          {/* Feedback modal */}
          {fbInterview && (
            <View style={{ backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', borderRadius: 10, padding: 12, gap: 8 }}>
              <Text style={s.sectionLabel}>FEEDBACK FOR {fbInterview.interview_id}</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {['strong_yes', 'yes', 'neutral', 'no', 'strong_no'].map(d => (
                  <Pressable key={d} style={[s.filterChip, fbDecision === d && s.filterChipActive]} onPress={() => setFbDecision(d)}>
                    <Text style={[s.filterChipText, fbDecision === d && s.filterChipTextActive]}>{d.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput style={s.formInput} value={fbNotes} onChangeText={setFbNotes} placeholder="Notes (optional)" placeholderTextColor={SAC.muted} />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                <Pressable style={[s.btn, s.btnOutline]} onPress={() => { setFbInterview(null); setFbDecision(''); }}><Text style={s.btnText}>Cancel</Text></Pressable>
                <Pressable style={[s.btn, s.btnPrimary]} onPress={submitFeedback} disabled={schedBusy}><Text style={s.btnText}>Submit</Text></Pressable>
              </View>
            </View>
          )}
          {/* List */}
          {interviews.length === 0 && <Text style={{ color: SAC.muted, fontSize: 12, fontFamily: FONTS.med }}>No interviews yet.</Text>}
          <ScrollView style={{ flex: 1, maxHeight: 300 }} contentContainerStyle={{ gap: 6 }}>
            {interviews.map((iv: any, i: number) => (
              <View key={i} style={s.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.listRowTitle}>{iv.full_name || iv.profile_id}</Text>
                  <Text style={s.listRowSub}>
                    {iv.start_at ? new Date(iv.start_at).toLocaleString() : ''} · {iv.status || 'scheduled'} · {iv.sync_status || '—'}
                  </Text>
                </View>
                <Pressable style={[s.btn, s.btnOutline]} onPress={() => setFbInterview(iv)}>
                  <ClipboardCheck size={11} color="#C4B5FD" /><Text style={s.btnText}>Feedback</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </PanelShell>
  );
}

// ── Skills Panel ─────────────────────────────────────────────────────
function SkillsPanel({ notify }: { notify: (m: string) => void }) {
  const [taxonomy, setTaxonomy] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [canonInput, setCanonInput] = useState('');
  const [aliasInput, setAliasInput] = useState('');
  const [canonTest, setCanonTest] = useState('');
  const [canonResult, setCanonResult] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [t, st] = await Promise.all([
        request<any>('/admin/talent-pool/skills/taxonomy'),
        request<any>('/admin/talent-pool/skills/status'),
      ]);
      setTaxonomy(t); setStatus(st);
    } catch (e: any) { setErr(e?.message || 'Failed to load skills'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const promote = async () => {
    if (!canonInput.trim()) { notify('Canonical skill name required'); return; }
    try {
      const aliases = aliasInput.split(',').map(a => a.trim()).filter(Boolean);
      const res = await request<any>('/admin/talent-pool/skills/promote', {
        method: 'POST', body: { canonical: canonInput.trim(), aliases },
      });
      notify(`Promoted "${canonInput.trim()}" · backfilled ${res?.backfilled ?? 0} profiles`);
      load();
    } catch (e: any) { notify('Promote failed: ' + (e?.message || '')); }
  };

  const canonicalize = async () => {
    if (!canonTest.trim()) return;
    try {
      const aliases = canonTest.split(',').map(a => a.trim()).filter(Boolean);
      const res = await request<any>('/admin/talent-pool/skills/canonicalize', {
        method: 'POST', body: aliases,
      });
      setCanonResult(res?.canonical ?? []);
    } catch (e: any) { notify('Canonicalize failed: ' + (e?.message || '')); }
  };

  const top: any[] = taxonomy?.top_used ?? [];

  return (
    <PanelShell title="Skill Taxonomy (TP22)" subtitle="rapidfuzz token_set matching · local only · seeded daily via TP23 scheduler">
      <BusyMsg loading={loading} error={err} />
      {!loading && taxonomy && (
        <View style={{ gap: 12 }}>
          <KpiRow items={[
            { label: 'Canonical Skills', value: taxonomy.total_canonical ?? 0 },
            { label: 'Aliases Loaded', value: status?.aliases_loaded ?? 0 },
            { label: 'Pending Review', value: taxonomy.pending_review ?? 0, accent: (taxonomy.pending_review ?? 0) > 0 ? '#F59E0B' : undefined },
          ]} />
          {/* Top skills */}
          {top.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>TOP SKILLS BY USAGE</Text>
              <ScrollView style={{ maxHeight: 200, marginTop: 8 }} contentContainerStyle={{ gap: 6 }}>
                {top.slice(0, 20).map((sk: any, i: number) => (
                  <View key={i} style={s.listRow}>
                    <Text style={[s.listRowTitle, { flex: 1 }]} numberOfLines={1}>{sk.canonical}</Text>
                    <Text style={{ color: SAC.muted, fontSize: 11 }}>{sk.usage_count} uses</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          {/* Promote form */}
          <View>
            <Text style={s.sectionLabel}>PROMOTE TO CANONICAL</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <TextInput style={[s.formInput, { flex: 1, minWidth: 120 }]} value={canonInput} onChangeText={setCanonInput} placeholder="Canonical name" placeholderTextColor={SAC.muted} />
              <TextInput style={[s.formInput, { flex: 1, minWidth: 140 }]} value={aliasInput} onChangeText={setAliasInput} placeholder="Comma-separated aliases" placeholderTextColor={SAC.muted} />
              <Pressable style={[s.btn, s.btnPrimary]} onPress={promote}><Tags size={12} color="#fff" /><Text style={s.btnText}>Promote</Text></Pressable>
            </View>
          </View>
          {/* Canonicalize test */}
          <View>
            <Text style={s.sectionLabel}>CANONICALIZE TEST (raw alias → canonical)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 6 }}>
                <TextInput style={s.formInput} value={canonTest} onChangeText={setCanonTest} placeholder="e.g. react, nodejs, typescript" placeholderTextColor={SAC.muted} />
                {canonResult.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                    {canonResult.map((c, i) => (
                      <View key={i} style={s.skillChip}><Text style={s.skillChipText}>{c}</Text></View>
                    ))}
                  </View>
                )}
              </View>
              <Pressable style={[s.btn, s.btnOutline]} onPress={canonicalize}><Text style={s.btnText}>Run</Text></Pressable>
            </View>
          </View>
        </View>
      )}
    </PanelShell>
  );
}

// ── Compliance / ATS / WhatsApp Panel ────────────────────────────────
function CompliancePanel({ notify }: { notify: (m: string) => void }) {
  const [report, setReport] = useState<any>(null);
  const [ats, setAts] = useState<any>(null);
  const [wapp, setWapp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [r, a, w] = await Promise.all([
        request<any>('/admin/talent-pool/compliance/report'),
        request<any>('/admin/talent-pool/ats/status').catch(() => null),
        request<any>('/admin/talent-pool/whatsapp/usage-alert').catch(() => null),
      ]);
      setReport(r); setAts(a); setWapp(w);
    } catch (e: any) { setErr(e?.message || 'Failed to load compliance'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const encryptPii = async () => {
    try {
      await request('/admin/talent-pool/compliance/encrypt-pii', { method: 'POST' });
      notify('PII encryption triggered');
      load();
    } catch (e: any) { notify('Encrypt PII failed: ' + (e?.message || '')); }
  };

  const atsPush = async () => {
    try {
      const res = await request<any>('/admin/talent-pool/ats/push', { method: 'POST' });
      notify(`ATS push: ${JSON.stringify(res ?? '')}`);
      load();
    } catch (e: any) { notify('ATS push failed: ' + (e?.message || '')); }
  };

  return (
    <PanelShell title="Compliance, ATS & WhatsApp" subtitle="DPDP posture · PII Fernet encryption · Zoho/FreshTeam/webhook push · Meta Cloud API free-tier">
      <BusyMsg loading={loading} error={err} />
      {!loading && report && (
        <View style={{ gap: 14 }}>
          {/* KPI row */}
          <KpiRow items={[
            { label: 'Active Profiles', value: report.active_profiles ?? 0 },
            { label: 'PII Encrypted', value: `${report.pii_encryption_coverage_pct ?? 0}%`, accent: (report.pii_encryption_coverage_pct ?? 0) >= 90 ? '#10B981' : '#F59E0B' },
            { label: 'Consent Records', value: report.consent_records_active ?? 0 },
            { label: 'DPDP Posture', value: report.dpdp_posture || '—', accent: '#10B981' },
          ]} />

          {/* Erasure / opt-outs */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <KpiRow items={[
              { label: 'Outreach Opt-outs', value: report.outreach_opt_outs ?? 0, accent: (report.outreach_opt_outs ?? 0) > 0 ? '#F59E0B' : undefined },
              { label: 'Erasure Events', value: report.erasure_events_total ?? 0 },
            ]} />
          </View>

          {/* ATS status */}
          {ats && (
            <View>
              <Text style={s.sectionLabel}>ATS / CRM PUSH (TP31)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Text style={{ color: SAC.muted, fontSize: 11, fontFamily: FONTS.med }}>
                  Enabled: {ats.enabled_ats?.length || 0} · Last push: {ats.last_push_at ? new Date(ats.last_push_at).toLocaleString() : '—'}
                </Text>
                <Pressable style={[s.btn, s.btnOutline]} onPress={atsPush}>
                  <Send size={11} color="#C4B5FD" /><Text style={s.btnText}>Push Now</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* WhatsApp */}
          {wapp && (
            <View>
              <Text style={s.sectionLabel}>WHATSAPP FREE-TIER USAGE (TP30)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <KpiRow items={[
                  { label: `Used / ${wapp.free_tier} msgs`, value: wapp.used, accent: (wapp.pct ?? 0) >= 90 ? '#EF4444' : (wapp.pct ?? 0) >= 70 ? '#F59E0B' : '#10B981' },
                  { label: 'Alert', value: wapp.alert ? 'ALERT' : 'OK', accent: wapp.alert ? '#EF4444' : '#10B981' },
                ]} />
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <Pressable style={[s.btn, s.btnOutline]} onPress={encryptPii}><Shield size={12} color="#C4B5FD" /><Text style={s.btnText}>Encrypt PII Now</Text></Pressable>
            <Pressable style={[s.btn, s.btnOutline]} onPress={load}><RefreshCw size={12} color="#C4B5FD" /><Text style={s.btnText}>Refresh</Text></Pressable>
          </View>
        </View>
      )}
    </PanelShell>
  );
}

// ── Panel Switch ─────────────────────────────────────────────────────
function PanelSwitch({ tab, notify }: { tab: TabId; notify: (m: string) => void }) {
  switch (tab) {
    case 'agents':        return <AgentsPanel notify={notify} />;
    case 'duplicates':    return <DuplicatesPanel notify={notify} />;
    case 'quality':       return <QualityPanel notify={notify} />;
    case 'activity':      return <ActivityPanel notify={notify} />;
    case 'insights':      return <InsightsPanel notify={notify} />;
    case 'drip':          return <DripPanel notify={notify} />;
    case 'external-jobs': return <ExternalJobsPanel notify={notify} />;
    case 'ranker':        return <RankerPanel notify={notify} />;
    case 'interviews':    return <InterviewsPanel notify={notify} />;
    case 'skills':        return <SkillsPanel notify={notify} />;
    case 'compliance':    return <CompliancePanel notify={notify} />;
    default:             return null;
  }
}

/* ── Profile Detail Modal ─────────────────────────────────────────── */
function ProfileDetailModal({
  visible,
  profile,
  onClose,
  onPromote,
}: {
  visible: boolean;
  profile: TalentProfile | null;
  onClose: () => void;
  onPromote: (p: TalentProfile) => void;
}) {
  if (!profile) return null;
  const p = profile;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBg}>
        <Animated.View entering={FadeInDown.duration(220)} style={s.modalCard}>
          {/* Hero */}
          <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
            {p.photo_url || p.photo_data ? (
              <Image source={{ uri: resolveImageUrl(p.photo_url) || p.photo_data! }} style={s.modalAvatar} />
            ) : (
              <View style={s.modalAvatarPlaceholder}>
                <Text style={s.modalAvatarInitial}>{(p.full_name || '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.modalTitle} numberOfLines={1}>{p.full_name}</Text>
              {(p.headline || p.current_role) && (
                <Text style={s.modalRole} numberOfLines={1}>{p.headline || p.current_role}</Text>
              )}
              {p.current_company && (
                <Text style={s.modalCompany}>{p.current_company}</Text>
              )}
            </View>
            <Pressable onPress={onClose} style={s.modalCloseBtn}><X size={16} color="#fff" /></Pressable>
          </LinearGradient>

          <ScrollView style={{ maxHeight: 540 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
            {/* Recruiter Evaluation & Identifiers */}
            <View style={{ backgroundColor: 'rgba(139,92,246,0.06)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', borderRadius: 10, padding: 14 }}>
              <Text style={[s.modalSectionLabel, { color: '#C4B5FD', marginBottom: 8 }]}>RECRUITER EVALUATION & IDENTIFIERS</Text>
              <View style={{ gap: 8 }}>
                <View style={s.modalDetailRow}>
                  <Star size={13} color="#FBBF24" />
                  <Text style={s.modalDetailLabel}>Student Alumni ID</Text>
                  <Text style={[s.modalDetailValue, { color: '#FBBF24', fontFamily: FONTS.bold }]}>
                    {p.sa_id || `SA-${p.id.slice(-6).toUpperCase()}`}
                  </Text>
                </View>
                <View style={s.modalDetailRow}>
                  <CheckCircle size={13} color={p.is_registered_user ? '#22C55E' : '#94A3B8'} />
                  <Text style={s.modalDetailLabel}>Account Status</Text>
                  <Text style={[s.modalDetailValue, { color: p.is_registered_user ? '#86EFAC' : '#CBD5E1' }]}>
                    {p.is_registered_user ? 'Registered User' : 'Non-User / Prospect (Unregistered)'}
                  </Text>
                </View>
                {p.certificate_id && (
                  <View style={s.modalDetailRow}>
                    <Star size={13} color="#A78BFA" />
                    <Text style={s.modalDetailLabel}>Certification ID</Text>
                    <Text style={[s.modalDetailValue, { color: '#D8B4FE', fontFamily: FONTS.bold }]}>{p.certificate_id}</Text>
                  </View>
                )}
                <View style={s.modalDetailRow}>
                  <Briefcase size={13} color="#60A5FA" />
                  <Text style={s.modalDetailLabel}>Visa Status</Text>
                  <Text style={[s.modalDetailValue, { color: '#93C5FD' }]}>{p.visa || '—'}</Text>
                </View>
                <View style={s.modalDetailRow}>
                  <Calendar size={13} color="#F59E0B" />
                  <Text style={s.modalDetailLabel}>Evaluated Exp</Text>
                  <Text style={s.modalDetailValue}>{p.exp_level || (p.experience_years != null ? `${p.experience_years} years` : '—')}</Text>
                </View>
              </View>
            </View>

            {/* Promote Action Bar */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingBottom: 6 }}>
              <Pressable
                onPress={() => onPromote(p)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: '#8B5CF6' }}
              >
                <UserPlus size={13} color="#fff" />
                <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>
                  {p.source_platform_user_id ? 'Re-Sync Platform User' : 'Promote to Platform User'}
                </Text>
              </Pressable>
            </View>

            {/* About */}
            {(p.about || p.headline) && (
              <View>
                <Text style={s.modalSectionLabel}>ABOUT</Text>
                <Text style={s.modalAboutText}>{p.about || p.headline}</Text>
              </View>
            )}

            {/* Skills */}
            {p.skills && p.skills.length > 0 && (
              <View>
                <Text style={s.modalSectionLabel}>SKILLS</Text>
                <View style={s.modalSkillsGrid}>
                  {p.skills.map((sk, i) => (
                    <View key={i} style={s.modalSkillChip}>
                      <Text style={s.modalSkillChipText}>{sk}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Contact */}
            <View>
              <Text style={s.modalSectionLabel}>CONTACT</Text>
              <View style={{ marginTop: 8, gap: 8 }}>
                {p.email && (
                  <Pressable style={s.modalDetailRow} onPress={() => { if (Platform.OS === 'web') (window as any).open(`mailto:${p.email}`); else Linking.openURL(`mailto:${p.email!}`); }}>
                    <Mail size={13} color={SAC.muted} />
                    <Text style={s.modalDetailLabel}>Email</Text>
                    <Text style={[s.modalDetailValue, { color: GRAD.to, textDecorationLine: 'underline' }]}>{p.email}</Text>
                  </Pressable>
                )}
                {p.location && (
                  <View style={s.modalDetailRow}>
                    <MapPin size={13} color={SAC.muted} />
                    <Text style={s.modalDetailLabel}>Location</Text>
                    <Text style={s.modalDetailValue}>{p.location}</Text>
                  </View>
                )}
                {p.linkedin_url && (
                  <Pressable style={s.modalDetailRow} onPress={() => Platform.OS === 'web' ? (window as any).open(p.linkedin_url, '_blank') : Linking.openURL(p.linkedin_url!)}>
                    <ExternalLink size={13} color="#0A66C2" />
                    <Text style={s.modalDetailLabel}>LinkedIn</Text>
                    <Text style={[s.modalDetailValue, { color: '#0A66C2', textDecorationLine: 'underline' }]} numberOfLines={1}>{p.linkedin_url}</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Meta */}
            <View>
              <Text style={s.modalSectionLabel}>META</Text>
              <View style={{ marginTop: 8, gap: 8 }}>
                <View style={s.modalDetailRow}>
                  <Calendar size={13} color={SAC.muted} />
                  <Text style={s.modalDetailLabel}>Source</Text>
                  <Text style={s.modalDetailValue}>{p.source.toUpperCase()}</Text>
                </View>
                {p.imported_at && (
                  <View style={s.modalDetailRow}>
                    <Calendar size={13} color={SAC.muted} />
                    <Text style={s.modalDetailLabel}>Imported</Text>
                    <Text style={s.modalDetailValue}>{new Date(p.imported_at).toLocaleDateString()}</Text>
                  </View>
                )}
                {p.last_synced_at && (
                  <View style={s.modalDetailRow}>
                    <Calendar size={13} color={SAC.muted} />
                    <Text style={s.modalDetailLabel}>Last synced</Text>
                    <Text style={s.modalDetailValue}>{new Date(p.last_synced_at).toLocaleDateString()}</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 22 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnOutline: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: SAC.border },
  btnPrimary: { backgroundColor: '#8B5CF6' },
  btnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  msgBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 8, padding: 10, marginBottom: 12 },
  msgText: { color: '#A78BFA', fontFamily: FONTS.med, fontSize: 12, flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.border, borderRadius: 10, paddingHorizontal: 12, height: 38, gap: 8 },
  searchInput: { flex: 1, color: SAC.text, fontSize: 13, fontFamily: FONTS.med, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  filterBtns: { flexDirection: 'row', gap: 4 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.border },
  filterChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  filterChipText: { color: SAC.muted, fontSize: 11, fontFamily: FONTS.bold },
  filterChipTextActive: { color: SAC.text },
  bulkBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 8, padding: 8, marginBottom: 10 },
  bulkText: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 12, marginRight: 8 },
  bulkBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  bulkBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 11 },
  selectAllBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4, marginBottom: 8 },
  selectAllText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 40 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: SAC.card },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(139,92,246,0.2)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  avatarInitial: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 14 },
  modalAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  modalAvatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  modalAvatarInitial: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 18 },
  modalBg: {
    flex: 1, backgroundColor: SAC.panel2,
    alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxWidth: 540, maxHeight: '92%',
    backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2, overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}),
  },
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, paddingRight: 12 },
  modalTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  modalRole: { color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  modalCompany: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.med, fontSize: 11, marginTop: 1 },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: SAC.panel2, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  modalSectionLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 },
  modalBio: { color: '#CBD5E1', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 19, marginTop: 8 },
  modalAboutText: { color: '#CBD5E1', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 19, marginTop: 8 },
  modalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalDetailLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 },
  modalDetailValue: { color: SAC.text, fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  modalSkillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  modalSkillChip: { backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' },
  modalSkillChipText: { color: '#A78BFA', fontSize: 11, fontFamily: FONTS.bold },
  card: {
    width: 'calc(33.333% - 8px)' as any, minWidth: 300, flex: 1,
    backgroundColor: SAC.card, borderRadius: 12, borderWidth: 1, borderColor: SAC.border,
    padding: 14, flexDirection: 'row', gap: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  cardInactive: { opacity: 0.45 },
  selectWrap: { paddingTop: 2 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.15)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 14, flex: 1 },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 0.5 },
  sourceBadgeText: { fontSize: 9, fontFamily: FONTS.bold, letterSpacing: 0.3 },
  cardHeadline: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginBottom: 6, lineHeight: 15 },
  cardDetails: { gap: 3, marginBottom: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { color: '#94A3B8', fontFamily: FONTS.med, fontSize: 11, flex: 1 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  skillChip: { backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  skillChipText: { color: '#A78BFA', fontSize: 10, fontFamily: FONTS.bold },
  moreSkills: { color: SAC.muted, fontSize: 10, alignSelf: 'center' },
  cardActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionBtn: { backgroundColor: '#0A66C2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  actionBtnText: { color: SAC.text, fontSize: 10, fontFamily: FONTS.bold },
  iconBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#E2E8F0', fontFamily: FONTS.bold, fontSize: 15 },
  emptySub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 14 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SAC.card, borderRadius: 8, borderWidth: 1, borderColor: SAC.border },
  pageBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  pageInfo: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  viewModeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  viewModeBtnText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  tableHead: {
    flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  th: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1.2, paddingRight: 10 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  td: { color: SAC.text, fontFamily: FONTS.med, fontSize: 11.5, paddingRight: 10 },
  // ── TP agent suite panel styles ──
  panelCard: {
    flex: 1, backgroundColor: SAC.card, borderRadius: 14, borderWidth: 1, borderColor: SAC.border,
    padding: 18, gap: 14, overflow: 'hidden',
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 15 },
  panelSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kpiTile: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: SAC.border, minWidth: 100, flex: 1, gap: 4,
  },
  kpiValue: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 18 },
  kpiLabel: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10 },
  sectionLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 },
  formInput: {
    flex: 1, color: SAC.text, fontSize: 12, fontFamily: FONTS.med,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: SAC.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  agentCard: {
    width: 190, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: SAC.border, padding: 12, gap: 5,
  },
  agentCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  agentCardName: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12, flex: 1, flexShrink: 1 },
  agentCardMeta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  pill: {
    paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1,
  },
  pillText: { fontFamily: FONTS.bold, fontSize: 9.5 },
  dataTableHead: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderTopLeftRadius: 10, borderTopRightRadius: 10,
    borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  dataTh: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.6 },
  dataTableRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: SAC.border,
  },
  dataTd: { color: SAC.text, fontFamily: FONTS.med, fontSize: 11 },
  dedupGroupCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1,
    borderColor: SAC.border, padding: 14, gap: 10,
  },
  dedupMemberCard: {
    width: 140, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border, padding: 10, gap: 3, position: 'relative',
  },
  dedupMemberCardKeeper: {
    borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)',
  },
  dedupKeeperDot: {
    position: 'absolute', top: 6, right: 6, width: 6, height: 6,
    borderRadius: 3, backgroundColor: '#10B981',
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border, padding: 10,
  },
  listRowTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  listRowSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2 },
  rankBadge: {
    width: 48, height: 48, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
