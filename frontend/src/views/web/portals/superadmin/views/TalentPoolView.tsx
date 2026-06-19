/**
 * Super Admin — Talent Pool Management
 * Profile cards with CSV import, LinkedIn sync, bulk manage
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator, Linking, Image, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search, Trash2, CheckCircle, XCircle, MapPin, Briefcase, GraduationCap, Star, X, Mail, Building2, ExternalLink, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { request, tokenStore } from '@/src/models/services/api';
import { SAC, FONTS } from '../tokens';
import { GRAD } from '../applekit';

interface TalentProfile {
  id: string;
  full_name: string;
  headline?: string;
  email?: string;
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
  bio?: string;
  source: string;
  is_active: boolean;
  last_synced_at?: string;
  imported_at?: string;
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
  const [detailProfile, setDetailProfile] = useState<TalentProfile | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('page', String(p));
        params.set('limit', '24');
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
    input.type = 'file'; input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true); setMessage('');
      try {
        const accessToken = await tokenStore.getAccess();
        const formData = new FormData(); formData.append('file', file);
        const res = await fetch('https://studentalumni.ai/api/admin/talent-pool/import/csv', {
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
    switch (s) { case 'linkedin': return 'LI'; case 'csv': return 'CSV'; case 'platform': return 'PL'; default: return s; }
  };
  const sourceColor = (s: string) => {
    switch (s) { case 'linkedin': return '#0A66C2'; case 'csv': return '#22C55E'; case 'platform': return '#8B5CF6'; default: return SAC.muted; }
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Talent Pool</Text>
          <Text style={s.sub}>{total} profiles</Text>
        </View>
        <View style={s.headerActions}>
          <Pressable style={[s.btn, s.btnOutline]} onPress={onSyncLinkedIn} disabled={syncing}>
            {syncing ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={s.btnText}>{syncing ? 'Syncing...' : 'Sync LinkedIn'}</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnOutline]} onPress={onSyncFromUsers} disabled={syncing}>
            <Text style={s.btnText}>Sync Users</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnPrimary]} onPress={onImportCSV} disabled={importing}>
            {importing ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={s.btnText}>{importing ? 'Importing...' : 'Import CSV'}</Text>
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
            placeholder="Search by name, skills, company..." placeholderTextColor={SAC.muted}
            onSubmitEditing={() => goToPage(1)} />
        </View>
        <View style={s.filterBtns}>
          {['', 'linkedin', 'csv', 'platform', 'manual'].map((src) => (
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

      {/* Cards Grid */}
      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#8B5CF6" /></View>
      ) : profiles.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyTitle}>No profiles found</Text>
          <Text style={s.emptySub}>Import a CSV or sync LinkedIn to get started</Text>
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
              {p.photo_url ? (
                <Image source={{ uri: p.photo_url }} style={s.avatar} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitial}>{(p.full_name || '?')[0].toUpperCase()}</Text>
                </View>
              )}

              {/* Card content */}
              <View style={{ flex: 1, minWidth: 0 }}>
                {/* Name + source badge */}
                <View style={s.cardTop}>
                  <Text style={s.cardName} numberOfLines={1}>{p.full_name || 'Unknown'}</Text>
                  <View style={[s.sourceBadge, { backgroundColor: sourceColor(p.source) + '20', borderColor: sourceColor(p.source) }]}>
                    <Text style={[s.sourceBadgeText, { color: sourceColor(p.source) }]}>{sourceLabel(p.source)}</Text>
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
      />
    </View>
  );
}

function ProfileDetailModal({ visible, profile, onClose }: { visible: boolean; profile: TalentProfile | null; onClose: () => void }) {
  if (!profile) return null;
  const p = profile;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBg}>
        <Animated.View entering={FadeInDown.duration(220)} style={s.modalCard}>
          {/* Hero */}
          <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
            {p.photo_url ? (
              <Image source={{ uri: p.photo_url }} style={s.modalAvatar} />
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
            {/* Bio */}
            {p.bio && (
              <View>
                <Text style={s.modalSectionLabel}>ABOUT</Text>
                <Text style={s.modalBio}>{p.bio}</Text>
              </View>
            )}

            {/* Experience */}
            <View>
              <Text style={s.modalSectionLabel}>EXPERIENCE</Text>
              <View style={{ marginTop: 8, gap: 8 }}>
                {p.current_role && (
                  <View style={s.modalDetailRow}>
                    <Briefcase size={13} color={SAC.muted} />
                    <Text style={s.modalDetailLabel}>Role</Text>
                    <Text style={s.modalDetailValue}>{p.current_role}</Text>
                  </View>
                )}
                {p.current_company && (
                  <View style={s.modalDetailRow}>
                    <Building2 size={13} color={SAC.muted} />
                    <Text style={s.modalDetailLabel}>Company</Text>
                    <Text style={s.modalDetailValue}>{p.current_company}</Text>
                  </View>
                )}
                {p.experience_years != null && (
                  <View style={s.modalDetailRow}>
                    <Star size={13} color="#F59E0B" />
                    <Text style={s.modalDetailLabel}>Experience</Text>
                    <Text style={s.modalDetailValue}>{p.experience_years} years</Text>
                  </View>
                )}
                {p.education && (
                  <View style={s.modalDetailRow}>
                    <GraduationCap size={13} color={SAC.muted} />
                    <Text style={s.modalDetailLabel}>Education</Text>
                    <Text style={s.modalDetailValue}>{p.education}{p.graduation_year ? ` · ${p.graduation_year}` : ''}</Text>
                  </View>
                )}
              </View>
            </View>

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
                {p.github_url && (
                  <Pressable style={s.modalDetailRow} onPress={() => Platform.OS === 'web' ? (window as any).open(p.github_url, '_blank') : Linking.openURL(p.github_url!)}>
                    <ExternalLink size={13} color="#fff" />
                    <Text style={s.modalDetailLabel}>GitHub</Text>
                    <Text style={[s.modalDetailValue, { color: '#fff', textDecorationLine: 'underline' }]} numberOfLines={1}>{p.github_url}</Text>
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
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnOutline: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: SAC.border },
  btnPrimary: { backgroundColor: '#8B5CF6' },
  btnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  msgBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 8, padding: 10, marginBottom: 12 },
  msgText: { color: '#A78BFA', fontFamily: FONTS.med, fontSize: 12, flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.border, borderRadius: 10, paddingHorizontal: 12, height: 38, gap: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, fontFamily: FONTS.med, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  filterBtns: { flexDirection: 'row', gap: 4 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.border },
  filterChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  filterChipText: { color: SAC.muted, fontSize: 11, fontFamily: FONTS.bold },
  filterChipTextActive: { color: '#fff' },
  bulkBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 8, padding: 8, marginBottom: 10 },
  bulkText: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 12, marginRight: 8 },
  bulkBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  bulkBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11 },
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
  modalAvatarInitial: { color: '#fff', fontFamily: FONTS.bold, fontSize: 18 },
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxWidth: 540, maxHeight: '92%',
    backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2, overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}),
  },
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, paddingRight: 12 },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  modalRole: { color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  modalCompany: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.med, fontSize: 11, marginTop: 1 },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  modalSectionLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 },
  modalBio: { color: '#CBD5E1', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 19, marginTop: 8 },
  modalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalDetailLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 },
  modalDetailValue: { color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
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
  cardName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, flex: 1 },
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
  actionBtnText: { color: '#fff', fontSize: 10, fontFamily: FONTS.bold },
  iconBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#E2E8F0', fontFamily: FONTS.bold, fontSize: 15 },
  emptySub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 14 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SAC.card, borderRadius: 8, borderWidth: 1, borderColor: SAC.border },
  pageBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  pageInfo: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
});
