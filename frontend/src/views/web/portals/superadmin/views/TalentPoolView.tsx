/**
 * Super Admin — Talent Pool Management
 * CSV import, LinkedIn sync, manage profiles
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Search, Trash2, CheckCircle, XCircle } from 'lucide-react-native';
import { request, tokenStore } from '@/src/models/services/api';
import { SAC, FONTS } from '../tokens';

interface TalentProfile {
  id: string;
  full_name: string;
  headline?: string;
  email?: string;
  linkedin_url?: string;
  location?: string;
  skills: string[];
  current_company?: string;
  current_role?: string;
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

  const fetchProfiles = useCallback(async (p: number = 1) => {
    setLoading(true);
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
  }, [search, sourceFilter]);

  useEffect(() => { fetchProfiles(1); }, []);

  const onSearch = () => { setPage(1); fetchProfiles(1); };

  const onSyncLinkedIn = async () => {
    setSyncing(true); setMessage('');
    try {
      const res = await request<{ ok: boolean; synced: number; message?: string }>(
        '/admin/talent-pool/sync-linkedin', { method: 'POST' }
      );
      setMessage(res.message || `Synced ${res.synced} profiles`);
      if (res.synced > 0) fetchProfiles(page);
    } catch (e: any) {
      setMessage('Sync failed: ' + (e?.message || ''));
    } finally { setSyncing(false); }
  };

  const onSyncFromUsers = async () => {
    setSyncing(true); setMessage('');
    try {
      const res = await request<{ ok: boolean; synced: number }>(
        '/admin/talent-pool/sync-from-users', { method: 'POST' }
      );
      setMessage(`Synced ${res.synced} platform users`);
    } catch (e: any) {
      setMessage('Sync failed: ' + (e?.message || ''));
    } finally { setSyncing(false); }
  };

  const onImportCSV = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.xlsx,.xls';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true); setMessage('');
        try {
          const accessToken = await tokenStore.getAccess();
          const formData = new FormData();
          formData.append('file', file);
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
        } catch (e: any) {
          setMessage('Import error: ' + (e?.message || ''));
        } finally { setImporting(false); }
      };
      input.click();
    }
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
      setSelected(new Set());
      fetchProfiles(page);
      setMessage(`${action}d ${selected.size} profiles`);
    } catch (e: any) { setMessage('Error: ' + (e?.message || '')); }
  };

  const sourceColor = (s: string) => {
    switch (s) {
      case 'linkedin': return '#0A66C2';
      case 'csv': return '#22C55E';
      case 'platform': return '#8B5CF6';
      default: return SAC.muted;
    }
  };

  return (
    <View style={s.root}>
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

      {message ? (
        <View style={s.msgBar}>
          <Text style={s.msgText} numberOfLines={2}>{message}</Text>
          <Pressable onPress={() => setMessage('')}><XCircle size={14} color={SAC.muted} /></Pressable>
        </View>
      ) : null}

      <View style={s.toolbar}>
        <View style={s.searchWrap}>
          <Search size={14} color={SAC.muted} />
          <TextInput style={s.searchInput} value={search} onChangeText={setSearch}
            placeholder="Search profiles..." placeholderTextColor={SAC.muted} onSubmitEditing={onSearch} />
        </View>
        <View style={s.filterBtns}>
          {['', 'linkedin', 'csv', 'platform', 'manual'].map((src) => (
            <Pressable key={src || 'all'} style={[s.filterChip, sourceFilter === src && s.filterChipActive]}
              onPress={() => { setSourceFilter(src); setPage(1); }}>
              <Text style={[s.filterChipText, sourceFilter === src && s.filterChipTextActive]}>
                {src || 'All'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {selected.size > 0 && (
        <View style={s.bulkBar}>
          <Text style={s.bulkText}>{selected.size} selected</Text>
          <Pressable style={[s.bulkBtn, { backgroundColor: '#22C55E' }]} onPress={() => onBulkAction('activate')}>
            <Text style={s.bulkBtnText}>Activate</Text>
          </Pressable>
          <Pressable style={[s.bulkBtn, { backgroundColor: '#F59E0B' }]} onPress={() => onBulkAction('deactivate')}>
            <Text style={s.bulkBtnText}>Deactivate</Text>
          </Pressable>
          <Pressable style={[s.bulkBtn, { backgroundColor: '#EF4444' }]} onPress={() => onBulkAction('delete')}>
            <Text style={s.bulkBtnText}>Delete</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#8B5CF6" /></View>
      ) : (
        <ScrollView style={s.tableScroll} horizontal>
          <View style={{ minWidth: 800 }}>
            <View style={s.tableRow}>
              <View style={{ width: 40 }} />
              <Text style={[s.th, { width: 160 }]}>Name</Text>
              <Text style={[s.th, { width: 140 }]}>Role</Text>
              <Text style={[s.th, { width: 140 }]}>Company</Text>
              <Text style={[s.th, { width: 100 }]}>Location</Text>
              <Text style={[s.th, { width: 70 }]}>Source</Text>
              <Text style={[s.th, { width: 70 }]}>Status</Text>
              <Text style={[s.th, { width: 100 }]}>Actions</Text>
            </View>
            {profiles.map((p) => (
              <View key={p.id} style={[s.tableRow, !p.is_active && s.rowInactive]}>
                <Pressable style={{ width: 40, alignItems: 'center' }}
                  onPress={() => { const next = new Set(selected); next.has(p.id) ? next.delete(p.id) : next.add(p.id); setSelected(next); }}>
                  <View style={[s.checkbox, selected.has(p.id) && s.checkboxActive]}>
                    {selected.has(p.id) && <CheckCircle size={14} color="#8B5CF6" />}
                  </View>
                </Pressable>
                <Text style={[s.cell, { width: 160 }]} numberOfLines={1}>{p.full_name}</Text>
                <Text style={[s.cell, { width: 140 }]} numberOfLines={1}>{p.headline || p.current_role || '-'}</Text>
                <Text style={[s.cell, { width: 140 }]} numberOfLines={1}>{p.current_company || '-'}</Text>
                <Text style={[s.cell, { width: 100 }]} numberOfLines={1}>{p.location || '-'}</Text>
                <Text style={[s.cell, { width: 70, color: sourceColor(p.source) }]}>{p.source}</Text>
                <Text style={[s.cell, { width: 70, color: p.is_active ? '#22C55E' : '#EF4444' }]}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </Text>
                <View style={{ width: 100, flexDirection: 'row', gap: 4 }}>
                  <Pressable style={[s.rowBtn, { backgroundColor: p.is_active ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }]}
                    onPress={() => onToggleActive(p.id, !p.is_active)}>
                    {p.is_active ? <XCircle size={12} color="#EF4444" /> : <CheckCircle size={12} color="#22C55E" />}
                  </Pressable>
                  <Pressable style={[s.rowBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
                    onPress={() => onToggleActive(p.id, false)}>
                    <Trash2 size={12} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {pages > 1 && (
        <View style={s.pagination}>
          <Pressable style={[s.pageBtn, page <= 1 && { opacity: 0.4 }]}
            onPress={() => page > 1 && (setPage(page - 1), fetchProfiles(page - 1))}>
            <Text style={s.pageBtnText}>Prev</Text>
          </Pressable>
          <Text style={s.pageInfo}>{page} / {pages}</Text>
          <Pressable style={[s.pageBtn, page >= pages && { opacity: 0.4 }]}
            onPress={() => page < pages && (setPage(page + 1), fetchProfiles(page + 1))}>
            <Text style={s.pageBtnText}>Next</Text>
          </Pressable>
        </View>
      )}
    </View>
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
  tableScroll: { flex: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  rowInactive: { opacity: 0.4 },
  th: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  cell: { color: '#E2E8F0', fontFamily: FONTS.med, fontSize: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.1)' },
  rowBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 14 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SAC.card, borderRadius: 8, borderWidth: 1, borderColor: SAC.border },
  pageBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  pageInfo: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
});
