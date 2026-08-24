import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, ActivityIndicator, Linking, Image, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search, Trash2, CheckCircle, XCircle, MapPin, Briefcase, GraduationCap, Star, X, Mail, ExternalLink, Calendar, UserPlus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { request, tokenStore, resolveImageUrl } from '@/src/models/services/api';
import { SAC, FONTS } from '../tokens';
import { GRAD } from '../applekit';

interface TalentProfile {
  id: string; sa_id?: string; full_name: string; headline?: string; email?: string; phone?: string;
  linkedin_url?: string; github_url?: string; location?: string; skills: string[];
  experience_years?: number; current_company?: string; current_role?: string; education?: string;
  graduation_year?: number; photo_url?: string; photo_data?: string; bio?: string;
  source: string; is_active: boolean; is_registered_user?: boolean; account_status?: string;
  certificate_id?: string; bgv_id?: string; visa?: string; exp_level?: string; c2c_w2?: string;
  f2f?: string; interest_status?: string; preferred_location?: string; source_platform_user_id?: string;
  about?: string; screening_notes?: string; last_synced_at?: string; imported_at?: string;
}

export function TalentPoolView() {
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

  const openPromoteModal = (p: TalentProfile) => { setCandidateToPromote(p); setPromoteCategory('alumni'); setPromoteSendInvite(true); setPromoteModalVisible(true); };

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

  const selectAllOnPage = () => { const next = new Set(selected); const allSelected = profiles.every(p => next.has(p.id)); profiles.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id)); setSelected(next); };

  const onSyncLinkedIn = async () => { setSyncing(true); setMessage(''); try { const res = await request<{ ok: boolean; synced: number; message?: string }>('/admin/talent-pool/sync-linkedin', { method: 'POST' }); setMessage(res.message || `Synced ${res.synced} profiles`); if (res.synced > 0) fetchProfiles(page); } catch (e: any) { setMessage('Sync failed: ' + (e?.message || '')); } finally { setSyncing(false); } };
  const onSyncFromUsers = async () => { setSyncing(true); setMessage(''); try { const res = await request<{ ok: boolean; synced: number }>('/admin/talent-pool/sync-from-users', { method: 'POST' }); setMessage(`Synced ${res.synced} platform users`); } catch (e: any) { setMessage('Sync failed: ' + (e?.message || '')); } finally { setSyncing(false); } };

  const onImportCSV = () => { if (Platform.OS !== 'web') return; const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls,.csv,.pdf,.docx,.doc'; input.onchange = async (e: any) => { const file = e.target.files?.[0]; if (!file) return; setImporting(true); setMessage(''); try { const accessToken = await tokenStore.getAccess(); const formData = new FormData(); formData.append('file', file); const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''; const res = await fetch(`${baseUrl}/api/admin/talent-pool/import/csv`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData }); const data = await res.json(); if (!data.ok) throw new Error(data.detail || 'Import failed'); const commitRes = await request<any>('/admin/talent-pool/import/commit', { method: 'POST', body: { rows: data.preview } }); setMessage(`Imported ${commitRes.upserted} profiles`); fetchProfiles(1); } catch (e: any) { setMessage('Import error: ' + (e?.message || '')); } finally { setImporting(false); } }; input.click(); };

  const onToggleActive = async (id: string, activate: boolean) => { try { await request(`/admin/talent-pool/${id}`, { method: 'PATCH', body: { is_active: activate } }); fetchProfiles(page); } catch (e: any) { setMessage('Error: ' + (e?.message || '')); } };
  const onBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => { if (selected.size === 0) return; try { await request('/admin/talent-pool/bulk-action', { method: 'POST', body: { ids: Array.from(selected), action } }); setSelected(new Set()); fetchProfiles(page); setMessage(`${action}d ${selected.size} profiles`); } catch (e: any) { setMessage('Error: ' + (e?.message || '')); } };

  const sourceLabel = (s: string) => { switch (s) { case 'linkedin': return 'LI'; case 'csv': return 'CSV'; case 'platform': return 'PL'; case 'import': return 'IMP'; default: return s; } };
  const sourceColor = (s: string) => { switch (s) { case 'linkedin': return '#0A66C2'; case 'csv': return '#22C55E'; case 'platform': return '#8B5CF6'; case 'import': return '#F59E0B'; default: return SAC.muted; } };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <View>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 22 }}>Talent Pool & Contacts</Text>
          <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 2 }}>{total} unified candidate and contact profiles</Text>
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
            <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{syncing ? 'Syncing...' : 'Sync LinkedIn'}</Text>
          </Pressable>
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: SAC.border }} onPress={onSyncFromUsers} disabled={syncing}>
            <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Sync Users</Text>
          </Pressable>
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#8B5CF6' }} onPress={onImportCSV} disabled={importing}>
            {importing ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{importing ? 'Importing...' : 'Import File (500MB)'}</Text>
          </Pressable>
        </View>
      </View>

      {message ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <Text style={{ color: '#A78BFA', fontFamily: FONTS.med, fontSize: 12, flex: 1 }} numberOfLines={2}>{message}</Text>
          <Pressable onPress={() => setMessage('')}><XCircle size={14} color={SAC.muted} /></Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.border, borderRadius: 10, paddingHorizontal: 12, height: 38, gap: 8 }}>
          <Search size={14} color={SAC.muted} />
          <TextInput style={{ flex: 1, color: '#fff', fontSize: 13, fontFamily: FONTS.med, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }} value={search} onChangeText={setSearch} placeholder="Search by name, skills, company, location..." placeholderTextColor={SAC.muted} onSubmitEditing={() => goToPage(1)} />
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: SAC.card, borderRadius: 8, padding: 3, borderWidth: 1, borderColor: SAC.border }}>
          <Pressable onPress={() => setViewMode('spreadsheet')} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, ...(viewMode === 'spreadsheet' ? { backgroundColor: '#8B5CF6' } : {}), ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}) }}>
            <Text style={{ color: viewMode === 'spreadsheet' ? '#fff' : SAC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>Spreadsheet</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode('grid')} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, ...(viewMode === 'grid' ? { backgroundColor: '#8B5CF6' } : {}), ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}) }}>
            <Text style={{ color: viewMode === 'grid' ? '#fff' : SAC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>Cards</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {['', 'linkedin', 'csv', 'import', 'platform', 'manual'].map((src) => (
            <Pressable key={src || 'all'} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: SAC.card, borderWidth: 1, borderColor: sourceFilter === src ? '#8B5CF6' : SAC.border, ...(sourceFilter === src ? { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' } : {}) }} onPress={() => { setSourceFilter(src); setPage(1); }}>
              <Text style={{ color: sourceFilter === src ? '#fff' : SAC.muted, fontSize: 11, fontFamily: FONTS.bold }}>{src || 'All'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {selected.size > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 8, padding: 8, marginBottom: 10 }}>
          <Text style={{ color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 12, marginRight: 8 }}>{selected.size} selected</Text>
          <Pressable style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#22C55E' }} onPress={() => onBulkAction('activate')}><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 11 }}>Activate</Text></Pressable>
          <Pressable style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#F59E0B' }} onPress={() => onBulkAction('deactivate')}><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 11 }}>Deactivate</Text></Pressable>
          <Pressable style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#EF4444' }} onPress={() => onBulkAction('delete')}><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 11 }}>Delete</Text></Pressable>
        </View>
      )}

      {!loading && profiles.length > 0 && (
        <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4, marginBottom: 8 }} onPress={selectAllOnPage}>
          <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center', ...(profiles.every(p => selected.has(p.id)) ? { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.15)' } : {}) }}>
            {profiles.every(p => selected.has(p.id)) && <CheckCircle size={12} color="#8B5CF6" />}
          </View>
          <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>{profiles.every(p => selected.has(p.id)) ? 'Deselect all' : 'Select all on this page'}</Text>
        </Pressable>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}><ActivityIndicator size="large" color="#8B5CF6" /></View>
      ) : profiles.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}><Text style={{ color: '#E2E8F0', fontFamily: FONTS.bold, fontSize: 15 }}>No profiles found</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4 }}>Import a file or sync LinkedIn to get started</Text></View>
      ) : viewMode === 'spreadsheet' ? (
        <View style={{ backgroundColor: SAC.card, borderRadius: 12, borderWidth: 1, borderColor: SAC.border, overflow: 'hidden' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                {['#', 'SA-ID', 'ACCOUNT', 'CERT / BGV', 'NAME & CANDIDATE', 'VISA', 'EVAL EXP', 'C2C / W2', 'F2F', 'INTEREST', 'PREF LOCATION', 'SOURCE', 'JOB TITLE / ROLE', 'COMPANY', 'LOCATION', 'EMAIL', 'LINKEDIN', 'EDUCATION', 'TOP SKILLS', 'STATUS', 'ACTIONS'].map((h, i) => (
                  <Text key={i} style={{ color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1.2, paddingRight: 10, width: [36, 110, 120, 110, 220, 95, 85, 90, 80, 120, 130, 80, 180, 160, 130, 200, 110, 180, 180, 90, 120][i] }}>{h}</Text>
                ))}
              </View>
              {profiles.map((p) => {
                const isSelected = selected.has(p.id);
                const saId = p.sa_id || `SA-${p.id.slice(-6).toUpperCase()}`;
                const certId = p.certificate_id || p.bgv_id || null;
                const isRegistered = !!(p.is_registered_user || p.account_status === 'registered');
                return (
                  <Pressable key={p.id} onPress={() => { setDetailProfile(p); setDetailModalVisible(true); }} style={({ hovered }: any) => [{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SAC.border }, hovered && { backgroundColor: 'rgba(255,255,255,0.03)' }, isSelected && { backgroundColor: 'rgba(139,92,246,0.08)' }]}>
                    <Pressable onPress={(e: any) => { e.stopPropagation?.(); const next = new Set(selected); next.has(p.id) ? next.delete(p.id) : next.add(p.id); setSelected(next); }} style={{ width: 36, justifyContent: 'center' }}>
                      <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center', ...(isSelected ? { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.15)' } : {}) }}>{isSelected && <CheckCircle size={12} color="#8B5CF6" />}</View>
                    </Pressable>
                    <View style={{ width: 110, justifyContent: 'center' }}>
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', alignSelf: 'flex-start' }}><Text style={{ color: '#FBBF24', fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.3 }}>{saId}</Text></View>
                    </View>
                    <View style={{ width: 120, justifyContent: 'center' }}>
                      {isRegistered ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', alignSelf: 'flex-start' }}><View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22C55E' }} /><Text style={{ color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 10 }}>Registered</Text></View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, backgroundColor: 'rgba(148,163,184,0.12)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)', alignSelf: 'flex-start' }}><View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#94A3B8' }} /><Text style={{ color: '#CBD5E1', fontFamily: FONTS.med, fontSize: 10 }}>Non-User</Text></View>
                      )}
                    </View>
                    <View style={{ width: 110, justifyContent: 'center' }}>
                      {certId ? (<View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(168,85,247,0.12)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', alignSelf: 'flex-start' }}><Text style={{ color: '#D8B4FE', fontFamily: FONTS.bold, fontSize: 10 }}>{certId}</Text></View>) : (<Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>—</Text>)}
                    </View>
                    <View style={{ width: 220, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                      {(p as any).photo_url || (p as any).photo_data ? (<Image source={{ uri: resolveImageUrl((p as any).photo_url) || (p as any).photo_data }} style={{ width: 28, height: 28, borderRadius: 14 }} />) : (<View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.25)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 11 }}>{(p.full_name || '?')[0].toUpperCase()}</Text></View>)}
                      <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{p.full_name || 'Unknown'}</Text><Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 }}>{p.email || p.id.slice(-6)}</Text></View>
                    </View>
                    <View style={{ width: 95, justifyContent: 'center' }}>
                      {p.visa ? (<View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(59,130,246,0.12)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', alignSelf: 'flex-start' }}><Text style={{ color: '#93C5FD', fontFamily: FONTS.bold, fontSize: 10 }}>{p.visa}</Text></View>) : (<Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>—</Text>)}
                    </View>
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 11.5, paddingRight: 10, width: 85 }}>{p.exp_level || (p.experience_years != null ? `${p.experience_years}y` : '—')}</Text>
                    <View style={{ width: 90, justifyContent: 'center' }}>
                      {p.c2c_w2 ? (<View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', alignSelf: 'flex-start' }}><Text style={{ color: '#6EE7B7', fontFamily: FONTS.bold, fontSize: 10 }}>{p.c2c_w2}</Text></View>) : (<Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>—</Text>)}
                    </View>
                    <Text style={{ color: p.f2f?.toLowerCase().includes('yes') ? '#86EFAC' : SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, paddingRight: 10, width: 80 }}>{p.f2f || '—'}</Text>
                    <View style={{ width: 120, justifyContent: 'center' }}>
                      {p.interest_status ? (<View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(236,72,153,0.12)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)', alignSelf: 'flex-start' }}><Text style={{ color: '#F472B6', fontFamily: FONTS.bold, fontSize: 10 }} numberOfLines={1}>{p.interest_status}</Text></View>) : (<Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>—</Text>)}
                    </View>
                    <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, paddingRight: 10, width: 130 }}>{p.preferred_location || p.location || '—'}</Text>
                    <View style={{ width: 80, justifyContent: 'center' }}><View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: sourceColor(p.source) + '20', borderColor: sourceColor(p.source), borderWidth: 0.5, alignSelf: 'flex-start' }}><Text style={{ fontSize: 9, fontFamily: FONTS.bold, letterSpacing: 0.3, color: sourceColor(p.source) }}>{sourceLabel(p.source)}</Text></View></View>
                    <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 11.5, paddingRight: 10, width: 180 }}>{p.current_role || p.headline || '—'}</Text>
                    <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, paddingRight: 10, width: 160 }}>{p.current_company || '—'}</Text>
                    <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, paddingRight: 10, width: 130 }}>{p.location || '—'}</Text>
                    <Pressable onPress={(e) => { e.stopPropagation(); if (p.email) (Platform.OS === 'web' ? window.open(`mailto:${p.email}`) : Linking.openURL(`mailto:${p.email}`)); }} style={{ width: 200 }}>
                      <Text numberOfLines={1} style={{ color: p.email ? '#93C5FD' : SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, paddingRight: 10, width: 200 }}>{p.email || '—'}</Text>
                    </Pressable>
                    <View style={{ width: 110, justifyContent: 'center' }}>
                      {p.linkedin_url ? (<Pressable onPress={(e) => { e.stopPropagation(); Platform.OS === 'web' ? (window as any).open(p.linkedin_url, '_blank') : Linking.openURL(p.linkedin_url!); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><ExternalLink size={11} color="#60A5FA" /><Text style={{ color: '#60A5FA', fontFamily: FONTS.med, fontSize: 11 }}>Profile</Text></Pressable>) : (<Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>—</Text>)}
                    </View>
                    <View style={{ width: 180 }}>
                      <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 11, paddingRight: 10, width: 180 }}>{p.education || '—'}</Text>
                      {p.graduation_year && <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10 }}>Grad: {p.graduation_year}</Text>}
                    </View>
                    <View style={{ width: 180, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                      {(p.skills || []).slice(0, 2).map((sk, i) => (<View key={i} style={{ backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}><Text style={{ color: '#A78BFA', fontSize: 10, fontFamily: FONTS.bold }}>{sk}</Text></View>))}
                      {(p.skills || []).length > 2 && <Text style={{ color: SAC.muted, fontSize: 10, alignSelf: 'center' }}>+{p.skills.length - 2}</Text>}
                    </View>
                    <View style={{ width: 90, justifyContent: 'center' }}><View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, backgroundColor: p.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', alignSelf: 'flex-start' }}><Text style={{ color: p.is_active ? '#22C55E' : '#EF4444', fontFamily: FONTS.bold, fontSize: 10 }}>{p.is_active ? 'Active' : 'Inactive'}</Text></View></View>
                    <View style={{ width: 170, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Pressable onPress={(e) => { e.stopPropagation(); setDetailProfile(p); setDetailModalVisible(true); }} style={{ paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' }}><Text style={{ color: '#fff', fontSize: 10, fontFamily: FONTS.bold }}>View</Text></Pressable>
                      <Pressable onPress={(e) => { e.stopPropagation(); openPromoteModal(p); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: 'rgba(139,92,246,0.14)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' }}>
                        <UserPlus size={9} color="#C4B5FD" /><Text style={{ color: '#C4B5FD', fontSize: 9.5, fontFamily: FONTS.bold }}>{p.source_platform_user_id ? 'Linked' : 'Promote'}</Text>
                      </Pressable>
                      <Pressable onPress={(e) => { e.stopPropagation(); onToggleActive(p.id, !p.is_active); }} style={{ paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: p.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }}>
                        <Text style={{ color: p.is_active ? '#EF4444' : '#22C55E', fontSize: 9.5, fontFamily: FONTS.bold }}>{p.is_active ? 'Disable' : 'Enable'}</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, textAlign: 'center', paddingVertical: 8 }}>Showing {profiles.length} profiles of {total} · Scroll horizontally to view all columns</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {profiles.map((p) => (
            <Pressable key={p.id} style={{ width: 'calc(33.333% - 8px)' as any, minWidth: 300, flex: 1, backgroundColor: SAC.card, borderRadius: 12, borderWidth: 1, borderColor: SAC.border, padding: 14, flexDirection: 'row', gap: 10, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}), ...(!p.is_active ? { opacity: 0.45 } : {}) }} onPress={() => { setDetailProfile(p); setDetailModalVisible(true); }}>
              <Pressable style={{ paddingTop: 2 }} onPress={(e: any) => { e.stopPropagation?.(); const next = new Set(selected); next.has(p.id) ? next.delete(p.id) : next.add(p.id); setSelected(next); }}>
                <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center', ...(selected.has(p.id) ? { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.15)' } : {}) }}>{selected.has(p.id) && <CheckCircle size={12} color="#8B5CF6" />}</View>
              </Pressable>
              {(p as any).photo_url || (p as any).photo_data ? (<Image source={{ uri: resolveImageUrl((p as any).photo_url) || (p as any).photo_data }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SAC.card }} />) : (<View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(139,92,246,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' }}><Text style={{ color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 14 }}>{(p.full_name || '?')[0].toUpperCase()}</Text></View>)}
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14, flex: 1 }} numberOfLines={1}>{p.full_name}</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Pressable onPress={(e) => { e.stopPropagation(); openPromoteModal(p); }} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(139,92,246,0.14)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' }}><Text style={{ color: '#C4B5FD', fontSize: 9.5, fontFamily: FONTS.bold }}>Promote</Text></Pressable>
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: sourceColor(p.source) + '22', borderWidth: 0.5 }}><Text style={{ fontSize: 9, fontFamily: FONTS.bold, letterSpacing: 0.3, color: sourceColor(p.source) }}>{sourceLabel(p.source)}</Text></View>
                  </View>
                </View>
                {(p.headline || p.current_role) && <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginBottom: 6, lineHeight: 15 }} numberOfLines={2}>{p.headline || p.current_role}</Text>}
                <View style={{ gap: 3, marginBottom: 6 }}>
                  {p.current_company && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Briefcase size={11} color={SAC.muted} /><Text style={{ color: '#94A3B8', fontFamily: FONTS.med, fontSize: 11, flex: 1 }} numberOfLines={1}>{p.current_company}</Text></View>}
                  {p.location && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><MapPin size={11} color={SAC.muted} /><Text style={{ color: '#94A3B8', fontFamily: FONTS.med, fontSize: 11, flex: 1 }} numberOfLines={1}>{p.location}</Text></View>}
                  {p.education && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><GraduationCap size={11} color={SAC.muted} /><Text style={{ color: '#94A3B8', fontFamily: FONTS.med, fontSize: 11, flex: 1 }} numberOfLines={1}>{p.education}{p.graduation_year ? ` · ${p.graduation_year}` : ''}</Text></View>}
                  {p.experience_years != null && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Star size={11} color="#F59E0B" /><Text style={{ color: '#94A3B8', fontFamily: FONTS.med, fontSize: 11 }}>{p.experience_years} years</Text></View>}
                </View>
                {p.skills && p.skills.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {p.skills.slice(0, 5).map((sk, i) => (<View key={i} style={{ backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}><Text style={{ color: '#A78BFA', fontSize: 10, fontFamily: FONTS.bold }}>{sk}</Text></View>))}
                    {p.skills.length > 5 && <Text style={{ color: SAC.muted, fontSize: 10, alignSelf: 'center' }}>+{p.skills.length - 5}</Text>}
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  {p.linkedin_url && <Pressable style={{ backgroundColor: '#0A66C2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }} onPress={(e: any) => { e.stopPropagation?.(); Platform.OS === 'web' ? (window as any).open(p.linkedin_url, '_blank') : Linking.openURL(p.linkedin_url!); }}><Text style={{ color: '#fff', fontSize: 10, fontFamily: FONTS.bold }}>LinkedIn</Text></Pressable>}
                  {p.github_url && <Pressable style={{ backgroundColor: '#24292e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }} onPress={(e: any) => { e.stopPropagation?.(); Platform.OS === 'web' ? (window as any).open(p.github_url, '_blank') : Linking.openURL(p.github_url!); }}><Text style={{ color: '#fff', fontSize: 10, fontFamily: FONTS.bold }}>GitHub</Text></Pressable>}
                  <View style={{ flex: 1 }} />
                  <Pressable style={{ width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: p.is_active ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)' }} onPress={(e: any) => { e.stopPropagation?.(); onToggleActive(p.id, !p.is_active); }}>
                    {p.is_active ? <XCircle size={13} color="#EF4444" /> : <CheckCircle size={13} color="#22C55E" />}
                  </Pressable>
                  <Pressable style={{ width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.12)' }} onPress={(e: any) => { e.stopPropagation?.(); onToggleActive(p.id, false); }}>
                    <Trash2 size={13} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {pages > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 14 }}>
          <Pressable style={{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SAC.card, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, ...(page <= 1 ? { opacity: 0.4 } : {}) }} onPress={() => page > 1 && goToPage(page - 1)}><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Prev</Text></Pressable>
          <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 }}>{page} / {pages}</Text>
          <Pressable style={{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SAC.card, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, ...(page >= pages ? { opacity: 0.4 } : {}) }} onPress={() => page < pages && goToPage(page + 1)}><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Next</Text></Pressable>
        </View>
      )}

      <ProfileDetailModal visible={detailModalVisible} profile={detailProfile} onClose={() => { setDetailModalVisible(false); setTimeout(() => setDetailProfile(null), 200); }} onPromote={(p) => { setDetailModalVisible(false); setTimeout(() => openPromoteModal(p), 200); }} />

      <Modal visible={promoteModalVisible} transparent animationType="fade" onRequestClose={() => setPromoteModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}) }}>
          <Animated.View entering={FadeInDown.duration(200)} style={{ width: '100%', maxWidth: 480, maxHeight: '92%', backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, paddingRight: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.2)', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={18} color="#C4B5FD" /></View>
              <View style={{ flex: 1 }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>Promote to Platform User</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 2 }}>Create a registered user account in the directory</Text></View>
              <Pressable onPress={() => setPromoteModalVisible(false)}><X size={16} color={SAC.muted} /></Pressable>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <View style={{ padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.border }}>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{candidateToPromote?.full_name}</Text>
                <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>{candidateToPromote?.email || 'No email provided'}</Text>
                {candidateToPromote?.current_company && <Text style={{ color: '#93C5FD', fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>{candidateToPromote.current_role} @ {candidateToPromote.current_company}</Text>}
              </View>
              <View>
                <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 }}>TARGET USER CATEGORY</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {(['student', 'alumni', 'mentor', 'masters'] as const).map((cat) => (
                    <Pressable key={cat} onPress={() => setPromoteCategory(cat)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: SAC.card, borderWidth: 1, borderColor: promoteCategory === cat ? '#8B5CF6' : SAC.border, ...(promoteCategory === cat ? { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' } : {}) }}>
                      <Text style={{ color: promoteCategory === cat ? '#fff' : SAC.muted, fontSize: 11, fontFamily: FONTS.bold }}>{cat.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Pressable onPress={() => setPromoteSendInvite(!promoteSendInvite)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center', ...(promoteSendInvite ? { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.15)' } : {}) }}>{promoteSendInvite && <CheckCircle size={13} color="#8B5CF6" />}</View>
                <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12 }}>Send branded account claim email immediately</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <Pressable onPress={() => setPromoteModalVisible(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: SAC.border }}><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text></Pressable>
                <Pressable onPress={handlePromoteCandidate} disabled={promoting} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#8B5CF6' }}>
                  {promoting ? <ActivityIndicator size="small" color="#fff" /> : <UserPlus size={13} color="#fff" />}
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{promoting ? 'Promoting…' : 'Confirm Promotion'}</Text>
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
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 }}>{aiCandidateResult.full_name}</Text>
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

function ProfileDetailModal({ visible, profile, onClose, onPromote }: { visible: boolean; profile: TalentProfile | null; onClose: () => void; onPromote: (p: TalentProfile) => void }) {
  if (!profile) return null;
  const p = profile;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}) }}>
        <Animated.View entering={FadeInDown.duration(220)} style={{ width: '100%', maxWidth: 540, maxHeight: '92%', backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}) }}>
          <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, paddingRight: 12 }}>
            {p.photo_url || p.photo_data ? (<Image source={{ uri: resolveImageUrl(p.photo_url) || p.photo_data! }} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }} />) : (<View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 18 }}>{(p.full_name || '?')[0].toUpperCase()}</Text></View>)}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }} numberOfLines={1}>{p.full_name}</Text>
              {(p.headline || p.current_role) && <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{p.headline || p.current_role}</Text>}
              {p.current_company && <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.med, fontSize: 11, marginTop: 1 }}>{p.current_company}</Text>}
            </View>
            <Pressable onPress={onClose} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><X size={16} color="#fff" /></Pressable>
          </LinearGradient>
          <ScrollView style={{ maxHeight: 540 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={{ backgroundColor: 'rgba(139,92,246,0.06)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', borderRadius: 10, padding: 14 }}>
              <Text style={{ color: '#C4B5FD', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8, marginBottom: 8 }}>RECRUITER EVALUATION & IDENTIFIERS</Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Star size={13} color="#FBBF24" /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>Student Alumni ID</Text><Text style={{ color: '#FBBF24', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 }}>{p.sa_id || `SA-${p.id.slice(-6).toUpperCase()}`}</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><CheckCircle size={13} color={p.is_registered_user ? '#22C55E' : '#94A3B8'} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>Account Status</Text><Text style={{ color: p.is_registered_user ? '#86EFAC' : '#CBD5E1', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 }}>{p.is_registered_user ? 'Registered User' : 'Non-User / Prospect (Unregistered)'}</Text></View>
                {p.certificate_id && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Star size={13} color="#A78BFA" /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>Certification ID</Text><Text style={{ color: '#D8B4FE', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 }}>{p.certificate_id}</Text></View>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Briefcase size={13} color="#60A5FA" /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>Visa Status</Text><Text style={{ color: '#93C5FD', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 }}>{p.visa || '—'}</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Calendar size={13} color="#F59E0B" /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>Evaluated Exp</Text><Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 }}>{p.exp_level || (p.experience_years != null ? `${p.experience_years} years` : '—')}</Text></View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingBottom: 6 }}>
              <Pressable onPress={() => onPromote(p)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: '#8B5CF6' }}>
                <UserPlus size={13} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{p.source_platform_user_id ? 'Re-Sync Platform User' : 'Promote to Platform User'}</Text>
              </Pressable>
            </View>
            {(p.about || p.headline) && (<View><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 }}>ABOUT</Text><Text style={{ color: '#CBD5E1', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 19, marginTop: 8 }}>{p.about || p.headline}</Text></View>)}
            {p.skills && p.skills.length > 0 && (
              <View><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 }}>SKILLS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {p.skills.map((sk, i) => (<View key={i} style={{ backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' }}><Text style={{ color: '#A78BFA', fontSize: 11, fontFamily: FONTS.bold }}>{sk}</Text></View>))}
                </View>
              </View>
            )}
            <View>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 }}>CONTACT</Text>
              <View style={{ marginTop: 8, gap: 8 }}>
                {p.email && <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => { if (Platform.OS === 'web') (window as any).open(`mailto:${p.email}`); else Linking.openURL(`mailto:${p.email!}`); }}><Mail size={13} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>Email</Text><Text style={{ color: GRAD.to, fontFamily: FONTS.med, fontSize: 12.5, flex: 1, textDecorationLine: 'underline' }}>{p.email}</Text></Pressable>}
                {p.location && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><MapPin size={13} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>Location</Text><Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 }}>{p.location}</Text></View>}
                {p.linkedin_url && <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => Platform.OS === 'web' ? (window as any).open(p.linkedin_url, '_blank') : Linking.openURL(p.linkedin_url!)}><ExternalLink size={13} color="#0A66C2" /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>LinkedIn</Text><Text style={{ color: '#0A66C2', fontFamily: FONTS.med, fontSize: 12.5, flex: 1, textDecorationLine: 'underline' }} numberOfLines={1}>{p.linkedin_url}</Text></Pressable>}
              </View>
            </View>
            <View>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 }}>META</Text>
              <View style={{ marginTop: 8, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Calendar size={13} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>Source</Text><Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 }}>{p.source.toUpperCase()}</Text></View>
                {p.imported_at && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Calendar size={13} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>Imported</Text><Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 }}>{new Date(p.imported_at).toLocaleDateString()}</Text></View>}
                {p.last_synced_at && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Calendar size={13} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>Last synced</Text><Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 }}>{new Date(p.last_synced_at).toLocaleDateString()}</Text></View>}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
