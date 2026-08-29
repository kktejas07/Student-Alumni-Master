/**
 * Super Admin — Talent Pool Management
 * Profile cards with CSV import, LinkedIn sync, bulk manage
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator, Linking, Image, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search, Trash2, CheckCircle, XCircle, MapPin, Briefcase, GraduationCap, Star, X, Mail, Building2, ExternalLink, Calendar, UserPlus, Send, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { request, tokenStore, resolveImageUrl } from '@/src/models/services/api';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import { GRAD } from '../applekit';

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
}

export function TalentPoolView() {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
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
});
