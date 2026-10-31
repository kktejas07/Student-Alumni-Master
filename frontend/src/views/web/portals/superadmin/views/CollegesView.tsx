// @ts-nocheck
/**
 * CollegesView — college-card grid in the standard super-admin theme.
 *
 * Pulls from `/api/admin/colleges/list` — the colleges collection is
 * auto-populated as users are imported with a college name, and enriched
 * in the background using free public APIs (Hipolabs + Wikipedia).
 *
 * Each card supports admin actions (Approve · View on Wiki · Reenrich ·
 * Disable · Restore · Delete · Edit) once status moves past pending.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Modal, ScrollView, TextInput, Image,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Building2, Search, X, Check, Pencil, Trash2, ShieldCheck, ShieldOff, RefreshCw,
  AlertTriangle, ExternalLink, Sparkles, Award, MapPin, Users, Globe, BookOpen, Plus, Download,
  ListChecks, Eye,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  TopTabs, SearchField, StatusPill, Toast, useToast, EmptyState, LoadingBox, KpiTile,
} from '../applekit';
import { request, resolveImageUrl } from '@/src/models/services/api';
import { useSubTab, usePortalUrl } from '@/src/views/web/portals/portalUrl';

type Status = 'all' | 'pending' | 'active' | 'paused';

export function CollegesView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const { go } = usePortalUrl();
  const goStudentsProfile = (uid: string) => {
    try { go('students', uid); } catch { go('students'); }
  };
  const [tab, setTab] = useSubTab<Status>(['all', 'pending', 'active', 'paused'], 'all', { sub, onSub });
  const [q, setQ] = useState('');
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState<any>(null); // detail-modal college
  const [bump, setBump] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast, flash, hide } = useToast();

  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const clearSel = () => setSelected(new Set());

  const BULK_LABEL: Record<string, string> = { approve: 'Approved', disable: 'Disabled', reenrich: 'Re-enriched', delete: 'Deleted' };
  const runBulk = async (action: 'approve' | 'disable' | 'reenrich' | 'delete') => {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const r: any = await request('/admin/colleges/bulk', { method: 'POST', body: { action, ids } });
      const ok = r?.succeeded?.length || 0;
      const bad = r?.failed?.length || 0;
      clearSel();
      setBump((b) => b + 1);
      if (bad) flash(`${BULK_LABEL[action]} ${ok} · ${bad} failed`, 'error');
      else flash(`${BULK_LABEL[action]} ${ok}`);
    } catch { flash(`Bulk ${action} failed`, 'error'); }
    finally { setBulkBusy(false); }
  };
  const startBulk = (action: 'approve' | 'disable' | 'reenrich' | 'delete') => {
    if (!selected.size || bulkBusy) return;
    if (action === 'delete') { setConfirmDelete(true); return; }
    runBulk(action);
  };

  const backfill = async () => {
    setBackfilling(true);
    try {
      const r: any = await request('/admin/colleges/backfill', { method: 'POST' });
      flash(`Backfill done · ${r?.newly_created ?? 0} created, ${r?.reenriched_existing ?? 0} refreshed`);
      setBump((b) => b + 1);
    } catch { flash('Backfill failed'); }
    finally { setBackfilling(false); }
  };

  const goToPage = useCallback((p: number) => {
    setPage(p);
    setBusy(true);
    (async () => {
      try {
        const r = await request<any>(`/admin/colleges/list?status=${tab}&q=${encodeURIComponent(q)}&page=${p}&limit=24`);
        setData(r || { items: [], total: 0, counts: { all: 0, pending: 0, active: 0, paused: 0 } });
        setPages(r?.pages || 1);
      } catch (e: any) {
        if (/401|Not authenticated/i.test(String(e?.message || ''))) {
          await new Promise((r) => setTimeout(r, 600));
          try {
            const r = await request<any>(`/admin/colleges/list?status=${tab}&q=${encodeURIComponent(q)}&page=${p}&limit=24`);
            setData(r || { items: [], total: 0, counts: { all: 0, pending: 0, active: 0, paused: 0 } }); setPages(r?.pages || 1); return;
          } catch {}
        }
        console.warn('Colleges list load failed', e);
        setData({ items: [], total: 0, counts: { all: 0, pending: 0, active: 0, paused: 0 } });
      } finally { setBusy(false); }
    })();
  }, [tab, q, bump]);
  const load = useCallback(() => { goToPage(1); }, [goToPage]);
  useEffect(() => { load(); }, [load]);

  const counts = data?.counts || {};
  const items: any[] = data?.items || [];
  const allSelected = items.length > 0 && items.every((c) => selected.has(c.id));
  const selectAll = () => setSelected(allSelected ? new Set() : new Set(items.map((c) => c.id)));

  const tabs = [
    { id: 'all',     label: 'All',                count: counts.all      || 0 },
    { id: 'pending', label: 'Pending verification', count: counts.pending || 0 },
    { id: 'active',  label: 'Active',             count: counts.active   || 0 },
    { id: 'paused',  label: 'Paused',             count: counts.paused   || 0 },
  ] as const;

  const approve = async (id: string) => {
    try { await request(`/admin/colleges/${id}/approve`, { method: 'POST' }); flash('Approved'); setBump((b) => b + 1); }
    catch { flash('Failed to approve'); }
  };
  const disable = async (id: string) => {
    try { await request(`/admin/colleges/${id}/disable`, { method: 'POST' }); flash('Disabled'); setBump((b) => b + 1); }
    catch { flash('Failed'); }
  };
  const restore = async (id: string) => {
    try { await request(`/admin/colleges/${id}/restore`, { method: 'POST' }); flash('Restored'); setBump((b) => b + 1); }
    catch { flash('Failed'); }
  };
  const remove = async (id: string) => {
    try { await request(`/admin/colleges/${id}`, { method: 'DELETE' }); flash('Removed · archived'); setBump((b) => b + 1); }
    catch { flash('Failed'); }
  };
  const reenrich = async (id: string) => {
    try { await request(`/admin/colleges/${id}/reenrich`, { method: 'POST' }); flash('Re-enriched'); setBump((b) => b + 1); }
    catch { flash('Failed'); }
  };

  const createCollege = async () => {
    if (!newName.trim()) return;
    try {
      await request('/admin/colleges', { method: 'POST', body: { name: newName.trim() } });
      flash('Onboarded · enriching in background');
      setNewName(''); setCreating(false); setBump((b) => b + 1);
    } catch { flash('Failed to onboard'); }
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Header */}
      <Card>
        <View style={s.headRow}>
          <IconBox size={38}><Building2 size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title}>Colleges</Text>
            <Text style={s.sub}>
              Institutions auto-onboarded from imported users. The system enriches each entry from
              Hipolabs and Wikipedia — including NAAC accreditation, NIRF ranking and key specialties —
              and queues it for super-admin verification.
            </Text>
          </View>
          <GradientButton onPress={() => setCreating(true)}>
            <Plus size={13} color="#fff" /><Text style={s.btnText}>Onboard college</Text>
          </GradientButton>
          <SecondaryButton onPress={backfill} disabled={backfilling}>
            <Download size={12} color={T.muted} />
            <Text style={s.secText}>{backfilling ? 'Backfilling…' : 'Backfill from users'}</Text>
          </SecondaryButton>
        </View>
      </Card>

      {/* KPI */}
      <View style={s.kpiRow}>
        <KpiTile Icon={Building2}   label="TOTAL"             value={String(counts.all     || 0)} />
        <KpiTile Icon={AlertTriangle} label="PENDING REVIEW"  value={String(counts.pending || 0)} delta={counts.pending ? 'awaiting' : 'clear'} deltaKind={counts.pending ? 'warn' : 'success'} />
        <KpiTile Icon={ShieldCheck} label="ACTIVE"            value={String(counts.active  || 0)} deltaKind="success" />
        <KpiTile Icon={ShieldOff}   label="PAUSED"            value={String(counts.paused  || 0)} />
      </View>

      {/* Tabs + Search + Select-all */}
      <Card>
        <View style={s.browseHead}>
          <TopTabs<Status> tabs={tabs as any} active={tab} onChange={setTab} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Pressable
              onPress={selectAll}
              style={[s.checkToggle, allSelected && s.checkToggleOn]}
            >
              {allSelected ? <Check size={11} color="#fff" /> : <ListChecks size={13} color={T.muted} />}
              <Text style={[s.checkToggleText, allSelected && { color: '#fff' }]}>Select all ({items.length})</Text>
            </Pressable>
            <SearchField value={q} onChange={setQ} placeholder="Search colleges, cities…" width={300} />
          </View>
        </View>
      </Card>

      {/* Grid */}
      {busy && !data ? (
        <View style={s.cardGrid}>{Array.from({ length: 4 }).map((_, i) => (<View key={i} style={s.gridCell}><CollegeCardSkeleton /></View>))}</View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No colleges yet"
          sub={q ? 'No results match your search.' : 'Colleges are auto-onboarded when users are imported. Or onboard one manually with the button above.'}
        />
      ) : (
        <View style={s.cardGrid}>
          {items.map((c) => (
            <View key={c.id} style={s.gridCell}>
              <CollegeCard
                college={c}
                selected={selected.has(c.id)}
                onToggleSelect={() => toggleSel(c.id)}
                onOpen={() => setOpen(c)}
                onApprove={approve} onDisable={disable} onRestore={restore} onRemove={remove}
                onReenrich={reenrich}
              />
            </View>
          ))}
        </View>
      )}

      {/* Floating bulk action bar */}
      {selected.size > 0 && !confirmDelete && (
        <View style={s.bulkBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.bulkCount}>{selected.size} selected</Text>
            <Pressable onPress={clearSel} style={s.bulkClear}><X size={12} color={T.muted} /></Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Pressable onPress={() => startBulk('approve')} style={[s.bulkBtn, bulkBusy && { opacity: 0.5 }]}>
              <ShieldCheck size={12} color={GRAD.from} /><Text style={s.bulkBtnText}>Approve ({selected.size})</Text>
            </Pressable>
            <Pressable onPress={() => startBulk('disable')} style={[s.bulkBtn, bulkBusy && { opacity: 0.5 }]}>
              <ShieldOff size={12} color={T.muted} /><Text style={s.bulkBtnText}>Disable ({selected.size})</Text>
            </Pressable>
            <Pressable onPress={() => startBulk('reenrich')} style={[s.bulkBtn, bulkBusy && { opacity: 0.5 }]}>
              <RefreshCw size={12} color={T.muted} /><Text style={s.bulkBtnText}>Re-enrich ({selected.size})</Text>
            </Pressable>
            <Pressable onPress={() => startBulk('delete')} style={[s.bulkBtn, s.bulkBtnDanger, bulkBusy && { opacity: 0.5 }]}>
              <Trash2 size={12} color={T.danger} /><Text style={[s.bulkBtnText, { color: T.danger }]}>Delete ({selected.size})</Text>
            </Pressable>
            {bulkBusy && <Text style={s.muted}>Working…</Text>}
          </View>
        </View>
      )}

      {/* Bulk delete confirmation */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, { maxWidth: 420 }]}>
            <View style={{ padding: 20, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <IconBox size={36}><AlertTriangle size={16} color={T.danger} /></IconBox>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalTitle}>Delete {selected.size} {selected.size === 1 ? 'college' : 'colleges'}?</Text>
                  <Text style={s.muted}>They will be moved to the colleges archive, not wiped.</Text>
                </View>
              </View>
              <View style={s.warnBox}>
                <AlertTriangle size={13} color={T.danger} />
                <Text style={[s.muted, { color: T.danger, flex: 1 }]}>{selected.size} selected</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <SecondaryButton onPress={() => setConfirmDelete(false)}><Text style={s.secText}>Cancel</Text></SecondaryButton>
                <Pressable
                  onPress={() => { setConfirmDelete(false); runBulk('delete'); }}
                  style={[s.destructiveBtn, bulkBusy && { opacity: 0.5 }]}
                >
                  <Text style={s.btnText}>Delete {selected.size}</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {items.length > 0 && (
        <Text style={[s.muted, { textAlign: 'center', paddingVertical: 6 }]}>
          Showing {items.length} of {data?.total || 0}
        </Text>
      )}

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

      <CollegeDetail
        college={open}
        onClose={() => setOpen(null)}
        onSaved={() => { flash('Updated'); setBump((b) => b + 1); }}
        onError={(msg: string) => flash(msg, 'error')}
        onOpenStudent={(uid: string) => { setOpen(null); goStudentsProfile(uid); }}
      />

      {/* New college modal */}
      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, { maxWidth: 420 }]}>
            <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
              <IconBox size={36}><Building2 size={16} color={GRAD.to} /></IconBox>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Onboard a college</Text>
                <Text style={s.muted}>Just type the name — enrichment runs automatically.</Text>
              </View>
              <Pressable onPress={() => setCreating(false)}><X size={16} color={T.muted} /></Pressable>
            </LinearGradient>
            <View style={{ padding: 18, gap: 12 }}>
              <TextInput
                value={newName} onChangeText={setNewName}
                placeholder="e.g. Indian Institute of Technology Bombay"
                placeholderTextColor={T.dim} style={s.input} autoFocus
                onSubmitEditing={createCollege}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <SecondaryButton onPress={() => setCreating(false)}><Text style={s.secText}>Cancel</Text></SecondaryButton>
                <GradientButton onPress={createCollege} disabled={!newName.trim()}>
                  <Check size={13} color="#fff" /><Text style={s.btnText}>Onboard</Text>
                </GradientButton>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  CollegeCard
 * ══════════════════════════════════════════════════════════════════ */
function CollegeCard({ college: c, selected, onToggleSelect, onOpen, onApprove, onDisable, onRestore, onRemove, onReenrich }: any) {
  const T = useSAC();
  const [menuOpen, setMenuOpen] = useState(false);

  const enrichBadge = c.enrichment_status === 'enriched'
    ? { label: 'Enriched', kind: 'success' as const }
    : c.enrichment_status === 'partial'
      ? { label: 'Partial data', kind: 'warn' as const }
      : c.enrichment_status === 'pending'
        ? { label: 'Enriching…', kind: 'info' as const }
        : { label: 'No data', kind: 'neutral' as const };

  const statusBadge =
    c.status === 'active'  ? { label: 'Active',              kind: 'success' as const, dot: true } :
    c.status === 'paused'  ? { label: 'Paused',              kind: 'neutral' as const } :
                             { label: 'Pending verification', kind: 'warn' as const };

  return (
    <Pressable onPress={onOpen} style={({ hovered }: any) => [
      s.card,
      hovered && Platform.OS === 'web' ? s.cardHover : null,
    ]}>
      <View style={{ padding: 22 }}>
        {/* Header — checkbox, logo, name, location */}
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <Pressable
            onPress={(e: any) => { e?.stopPropagation?.(); onToggleSelect?.(); }}
            style={[s.checkbox, selected && s.checkboxOn]}
            hitSlop={6}
          >
            {selected && <Check size={13} color="#fff" />}
          </Pressable>
          {c.logo_url ? (
            <Image source={{ uri: resolveImageUrl(c.logo_url) }} style={s.logo} resizeMode="cover" />
          ) : (
            <View style={[s.logo, { backgroundColor: T.warnTint, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: T.onTint, fontFamily: FONTS.xbold, fontSize: 19 }}>{c.initials}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.cName} numberOfLines={2}>{c.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <MapPin size={11} color={T.dim} />
              <Text style={s.cLine} numberOfLines={1}>
                {[c.city, c.state, c.country].filter(Boolean).join(', ') || '—'}
              </Text>
            </View>
            {!!c.type && (
              <Text style={[s.cLine, { marginTop: 2 }]} numberOfLines={1}>{c.type}</Text>
            )}
          </View>
          <Pressable onPress={(e: any) => { e?.stopPropagation?.(); setMenuOpen((m) => !m); }} style={s.menuTrigger}>
            <Text style={{ color: T.text, fontFamily: FONTS.xbold, fontSize: 14, lineHeight: 14 }}>⋯</Text>
          </Pressable>
        </View>

        {/* Stats: students + accreditation */}
        <View style={s.statRow}>
          <View style={s.statBox}>
            <Users size={11} color={T.amber} />
            <View>
              <Text style={s.statVal}>{c.student_count?.toLocaleString?.('en-IN') || 0}</Text>
              <Text style={s.statLbl}>STUDENTS</Text>
            </View>
          </View>
          {(c.accreditation || []).slice(0, 2).map((a: string, i: number) => (
            <View key={i} style={s.tag}><Award size={10} color={T.amber} /><Text style={s.tagText}>{a}</Text></View>
          ))}
        </View>

        {/* Ranking + specialties */}
        {(c.ranking?.length || c.specialties?.length) ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            {(c.ranking || []).length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(c.ranking || []).map((r: string, i: number) => (
                  <View key={i} style={s.rankPill}>
                    <Sparkles size={9} color={T.amber} />
                    <Text style={s.rankText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}
            {(c.specialties || []).length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(c.specialties || []).slice(0, 4).map((sp: string, i: number) => (
                  <View key={i} style={s.tag}><BookOpen size={9} color={T.dim} /><Text style={s.tagText}>{sp}</Text></View>
                ))}
                {(c.specialties || []).length > 4 && (
                  <Text style={s.muted}>+{(c.specialties || []).length - 4} more</Text>
                )}
              </View>
            )}
          </View>
        ) : null}

        {/* Status row */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          <StatusPill kind={statusBadge.kind} label={statusBadge.label} dot={!!statusBadge.dot} />
          <StatusPill kind={enrichBadge.kind} label={enrichBadge.label} />
        </View>

        {/* Action row */}
        <View style={s.actionRow}>
          <Pressable onPress={(e: any) => { e?.stopPropagation?.(); onOpen(); }} style={{ flex: 1 }}>
            <LinearGradient colors={[GRAD.from, GRAD.to, GRAD.deep]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.viewBtn}>
              <Text style={s.viewBtnText}>View details</Text>
            </LinearGradient>
          </Pressable>
          {c.website ? (
            <Pressable onPress={(e: any) => { e?.stopPropagation?.(); Linking.openURL(c.website).catch(() => {}); }} style={s.socialBtn}>
              <Globe size={16} color={T.text} />
            </Pressable>
          ) : null}
          {c.linkedin_url ? (
            <Pressable onPress={(e: any) => { e?.stopPropagation?.(); Linking.openURL(c.linkedin_url).catch(() => {}); }} style={[s.socialBtn, { backgroundColor: '#0A66C2' }]}>
              <Text style={{ color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 12, letterSpacing: -0.5 }}>in</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Floating menu */}
      {menuOpen && (
        <Animated.View entering={FadeInDown.duration(140)} style={s.menu}>
          {c.status === 'pending' ? (
            <MenuItem icon={ShieldCheck} label="Approve" onPress={() => { setMenuOpen(false); onApprove(c.id); }} />
          ) : null}
          {c.status === 'active' ? (
            <MenuItem icon={ShieldOff} label="Disable" onPress={() => { setMenuOpen(false); onDisable(c.id); }} />
          ) : null}
          {c.status !== 'active' ? (
            <MenuItem icon={RefreshCw} label="Restore / Activate" onPress={() => { setMenuOpen(false); onRestore(c.id); }} />
          ) : null}
          <MenuItem icon={Sparkles} label="Re-enrich" onPress={() => { setMenuOpen(false); onReenrich(c.id); }} />
          <MenuItem icon={Pencil} label="Edit" onPress={() => { setMenuOpen(false); onOpen(); }} />
          <MenuItem icon={Trash2} label="Delete" danger onPress={() => { setMenuOpen(false); onRemove(c.id); }} />
        </Animated.View>
      )}
    </Pressable>
  );
}

function MenuItem({ icon: Icon, label, onPress, danger }: any) {
  const T = useSAC();
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [
      s.menuItem, hovered && Platform.OS === 'web' ? { backgroundColor: T.warnTint } : null,
    ]}>
      <Icon size={12} color={danger ? T.danger : T.muted} />
      <Text style={[s.menuLabel, danger && { color: T.danger }]}>{label}</Text>
    </Pressable>
  );
}

function CollegeCardSkeleton() {
  return (
    <View style={[s.card, { padding: 22 }]}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View style={s.logo} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={[s.skBox, { width: '70%', height: 14 }]} />
          <View style={[s.skBox, { width: '50%', height: 11 }]} />
        </View>
      </View>
      <View style={[s.skBox, { width: '100%', height: 6, marginTop: 14, borderRadius: 99 }]} />
      <View style={[s.skBox, { width: '100%', height: 44, marginTop: 14 }]} />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  Detail modal
 * ══════════════════════════════════════════════════════════════════ */
function CollegeDetail({ college, onClose, onSaved, onError, onOpenStudent }: any) {
  const T = useSAC();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const [dtab, setDtab] = useState<'overview' | 'students'>('overview');
  const [stu, setStu] = useState<any>(null);
  const [stuBusy, setStuBusy] = useState(false);
  const [stuPage, setStuPage] = useState(1);

  useEffect(() => {
    if (dtab !== 'students' || !college?.id) return;
    let on = true;
    setStuBusy(true);
    (async () => {
      try {
        const r: any = await request(`/admin/colleges/${college.id}/students?page=${stuPage}&limit=20`);
        if (on) setStu(r);
      } catch { if (on) setStu({ items: [], total: 0, pages: 1, page: stuPage }); }
      finally { if (on) setStuBusy(false); }
    })();
    return () => { on = false; };
  }, [college?.id, dtab, stuPage]);

  if (!college) return null;
  const c = { ...college, ...draft };

  const save = async () => {
    try {
      await request(`/admin/colleges/${college.id}`, { method: 'PATCH', body: draft });
      setEdit(false); setDraft({}); onSaved(); onClose();
    } catch (e: any) {
      onError?.(e?.message || 'Failed to save college');
    }
  };
  const del = async () => {
    try {
      await request(`/admin/colleges/${college.id}`, { method: 'DELETE' });
      onClose(); onSaved();
    } catch (e: any) {
      onError?.(e?.message || 'Failed to delete college');
    }
  };
  const set = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBg}>
        <Animated.View entering={FadeInDown.duration(220)} style={[s.modalCard, dtab === 'students' ? { maxWidth: 780 } : null]}>
          <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
            {c.logo_url ? (
              <Image source={{ uri: resolveImageUrl(c.logo_url) }} style={[s.logo, { width: 48, height: 48 }]} />
            ) : (
              <View style={[s.logo, { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: T.warnTint }]}>
                <Text style={{ color: T.text, fontFamily: FONTS.xbold, fontSize: 15 }}>{c.initials}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.modalTitle} numberOfLines={1}>{c.name}</Text>
              <Text style={[s.muted, { marginTop: 2 }]} numberOfLines={1}>
                {[c.city, c.state, c.country].filter(Boolean).join(', ') || '—'}
              </Text>
            </View>
            <Pressable onPress={onClose}><X size={16} color={T.muted} /></Pressable>
          </LinearGradient>

          <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
          <TopTabs
            tabs={[
              { id: 'overview', label: 'Overview', icon: Building2 },
              { id: 'students', label: `Students (${stu?.total ?? c.student_count ?? 0})`, icon: Users },
            ] as any}
            active={dtab}
            onChange={(t) => setDtab(t as any)}
          />

          {dtab === 'students' ? (
            <StudentTable collegeId={college.id} stu={stu} busy={stuBusy} page={stuPage}
              onPrev={() => stuPage > 1 && setStuPage(stuPage - 1)}
              onNext={() => stuPage < (stu?.pages || 1) && setStuPage(stuPage + 1)}
              onOpenStudent={onOpenStudent} />
          ) : (
          <>
          {!!c.description && (
              <View>
                <SectionLabel>ABOUT</SectionLabel>
                <Text style={[s.muted, { marginTop: 6, lineHeight: 18, color: T.muted }]} numberOfLines={6}>{c.description}</Text>
                {!!c.wiki_url && (
                  <Pressable onPress={() => Linking.openURL(c.wiki_url).catch(() => {})} style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ExternalLink size={10} color={GRAD.to} />
                    <Text style={{ color: GRAD.to, fontFamily: FONTS.bold, fontSize: 11 }}>Open Wikipedia</Text>
                  </Pressable>
                )}
              </View>
            )}

            {(c.accreditation?.length || c.ranking?.length) ? (
              <View>
                <SectionLabel>RECOGNITIONS</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {(c.accreditation || []).map((a: string, i: number) => (
                    <View key={'a' + i} style={s.tag}><Award size={10} color={T.amber} /><Text style={s.tagText}>{a}</Text></View>
                  ))}
                  {(c.ranking || []).map((r: string, i: number) => (
                    <View key={'r' + i} style={s.rankPill}><Sparkles size={9} color={T.amber} /><Text style={s.rankText}>{r}</Text></View>
                  ))}
                </View>
              </View>
            ) : null}

            {(c.specialties?.length) ? (
              <View>
                <SectionLabel>SPECIALTIES</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {c.specialties.map((sp: string, i: number) => (
                    <View key={i} style={s.tag}><BookOpen size={9} color={T.dim} /><Text style={s.tagText}>{sp}</Text></View>
                  ))}
                </View>
              </View>
            ) : null}

            <View>
              <SectionLabel>DETAILS</SectionLabel>
              <View style={{ marginTop: 8, gap: 8 }}>
                {edit ? (
                  <>
                    <EditRow label="Name" value={draft.name ?? c.name} onChange={(v) => set('name', v)} />
                    <EditRow label="City" value={draft.city ?? c.city} onChange={(v) => set('city', v)} />
                    <EditRow label="State" value={draft.state ?? c.state} onChange={(v) => set('state', v)} />
                    <EditRow label="Country" value={draft.country ?? c.country} onChange={(v) => set('country', v)} />
                    <EditRow label="Website" value={draft.website ?? c.website} onChange={(v) => set('website', v)} />
                    <EditRow label="LinkedIn" value={draft.linkedin_url ?? c.linkedin_url} onChange={(v) => set('linkedin_url', v)} />
                    <EditRow label="Type" value={draft.type ?? c.type} onChange={(v) => set('type', v)} />
                  </>
                ) : (
                  <>
                    <DetailRow label="Type" value={c.type || '—'} />
                    <DetailRow label="Website" value={c.website || '—'} href={c.website} />
                    <DetailRow label="LinkedIn" value={c.linkedin_url || '—'} href={c.linkedin_url} />
                    <DetailRow label="Students" value={(c.student_count || 0).toString()} />
                    <DetailRow label="Domains" value={(c.domains || []).join(', ') || '—'} />
                    <DetailRow label="Source" value={(c.enrichment_sources || []).join(', ') || '—'} />
                  </>
                )}
              </View>
            </View>

            <View style={s.actionsRow}>
              {!edit ? (
                <>
                  <SecondaryButton onPress={() => setEdit(true)}>
                    <Pencil size={12} color={T.muted} /><Text style={s.secText}>Edit</Text>
                  </SecondaryButton>
                  <SecondaryButton danger onPress={() => setConfirmDel(true)}>
                    <Trash2 size={12} color={T.danger} /><Text style={[s.secText, { color: T.danger }]}>Delete</Text>
                  </SecondaryButton>
                </>
              ) : (
                <>
                  <SecondaryButton onPress={() => { setEdit(false); setDraft({}); }}>
                    <Text style={s.secText}>Cancel</Text>
                  </SecondaryButton>
                  <GradientButton onPress={save}>
                    <Check size={13} color="#fff" /><Text style={s.btnText}>Save changes</Text>
                  </GradientButton>
                </>
              )}
            </View>

            {confirmDel && (
              <View style={s.warnBox}>
                <AlertTriangle size={13} color={T.danger} />
                <Text style={[s.muted, { color: T.danger, flex: 1 }]}>Archive this college?</Text>
                <SecondaryButton size="sm" onPress={() => setConfirmDel(false)}><Text style={s.secText}>No</Text></SecondaryButton>
                <Pressable onPress={del} style={s.destructiveBtn}><Text style={s.btnText}>Yes, archive</Text></Pressable>
              </View>
            )}
          </>
          )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, href }: { label: string; value: string; href?: string }) {
  const open = href ? () => Linking.openURL(href).catch(() => {}) : undefined;
  return (
    <Pressable onPress={open} style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, href && { color: GRAD.to }]} numberOfLines={2}>{value}</Text>
    </Pressable>
  );
}
function EditRow({ label, value, onChange }: any) {
  const T = useSAC();
  return (
    <View style={s.detailRow}>
      <Text style={[s.detailLabel, { width: 120 }]}>{label}</Text>
      <TextInput value={value || ''} onChangeText={onChange} placeholderTextColor={T.dim} style={s.input} />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  Students tab — paginated table inside the detail modal
 * ══════════════════════════════════════════════════════════════════ */
function StudentTable({ collegeId, stu, busy, page, onPrev, onNext, onOpenStudent }: any) {
  const T = useSAC();
  const items: any[] = stu?.items || [];
  const stuKind = (st: string) => st === 'active' ? 'success' : st === 'archived' ? 'danger' : 'warn';
  return (
    <View style={{ gap: 8 }}>
      {busy && !stu ? (
        <LoadingBox label="Loading students…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No linked students"
          sub="Students whose college matches this name will appear here as they are imported." />
      ) : (
        <>
          <View style={s.stuHeadRow}>
            <View style={{ flex: 1.4, minWidth: 0 }}><Text style={s.stuTh}>NAME</Text></View>
            <View style={{ flex: 1.2, minWidth: 0 }}><Text style={s.stuTh}>EMAIL</Text></View>
            <View style={{ flex: 0.7, minWidth: 0 }}><Text style={s.stuTh}>ROLL NO.</Text></View>
            <View style={{ width: 72 }}><Text style={s.stuTh}>STATUS</Text></View>
            <View style={{ width: 104 }}><Text style={s.stuTh}>JOINED</Text></View>
            <View style={{ width: 34 }} />
          </View>
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            {items.map((u) => (
              <View key={u.id} style={s.stuRow}>
                <View style={{ flex: 1.4, minWidth: 0, gap: 1 }}>
                  <Text style={s.stuName} numberOfLines={1}>{u.name || '—'}</Text>
                  <Text style={s.stuSub} numberOfLines={1}>{u.college || '—'}</Text>
                </View>
                <View style={{ flex: 1.2, minWidth: 0, justifyContent: 'center' }}>
                  <Text style={s.stuCell} numberOfLines={1}>{u.email || '—'}</Text>
                </View>
                <View style={{ flex: 0.7, minWidth: 0, justifyContent: 'center' }}>
                  <Text style={s.stuCell} numberOfLines={1}>{u.roll_number || '—'}</Text>
                </View>
                <View style={{ width: 72, justifyContent: 'center' }}>
                  <StatusPill kind={stuKind(u.status)} label={u.status ? u.status.toUpperCase() : '—'} />
                </View>
                <View style={{ width: 104, justifyContent: 'center' }}>
                  <Text style={s.stuCell} numberOfLines={1}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={`Open ${u.name || 'student'} profile in Students`}
                  onPress={() => onOpenStudent?.(u.id)}
                  style={({ hovered }: any) => [s.stuViewBtn, hovered && Platform.OS === 'web' ? { backgroundColor: T.okTint } : null]}
                >
                  <Eye size={12} color={T.muted} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <View style={s.stuPager}>
            <Pressable style={[s.pageBtn, page <= 1 && { opacity: 0.4 }]} onPress={onPrev}>
              <Text style={s.pageBtnText}>Prev</Text>
            </Pressable>
            <Text style={s.pageInfo}>{page} / {stu?.pages || 1}</Text>
            <Pressable style={[s.pageBtn, page >= (stu?.pages || 1) && { opacity: 0.4 }]} onPress={onNext}>
              <Text style={s.pageBtnText}>Next</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 760 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  btnText: { color: SAC.onAccent, fontFamily: FONTS.xbold, fontSize: 12 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },

  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  browseHead: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' },
  checkToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999,
    backgroundColor: SAC.panel2, borderWidth: 1, borderColor: SAC.line,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  checkToggleOn: { backgroundColor: GRAD.from, borderColor: GRAD.from },
  checkToggleText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  checkbox: {
    width: 22, height: 22, borderRadius: 7, borderWidth: 1.5,
    borderColor: SAC.line, backgroundColor: SAC.panel2,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  checkboxOn: { backgroundColor: GRAD.from, borderColor: GRAD.from },
  bulkBar: {
    alignSelf: 'stretch',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    marginHorizontal: 2, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 14, backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.line,
    ...(Platform.OS === 'web' ? ({ position: 'sticky', bottom: 18, zIndex: 40, boxShadow: SAC.shadowMd } as any) : {}),
  },
  bulkCount: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 12 },
  bulkClear: {
    width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SAC.panel2,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  bulkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9,
    backgroundColor: SAC.panel2, borderWidth: 1, borderColor: SAC.line,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  bulkBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 11.5 },
  bulkBtnDanger: { backgroundColor: SAC.dangerTint, borderColor: SAC.danger },
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 16,
    ...(Platform.OS === 'web' ? ({ display: 'grid' as any, gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' as any, gap: 16 } as any) : {}),
  },
  gridCell: { minWidth: 340, flexBasis: 340, flexGrow: 1 },

  /* card */
  card: {
    borderRadius: 20, borderWidth: 1, borderColor: SAC.line,
    backgroundColor: SAC.card, position: 'relative',
    ...(Platform.OS === 'web' ? ({ boxShadow: SAC.shadow, transitionDuration: '200ms', cursor: 'pointer' } as any) : {}),
  },
  cardHover: {
    borderColor: SAC.line2,
    transform: [{ translateY: -2 }],
    ...(Platform.OS === 'web' ? ({ boxShadow: SAC.shadowMd } as any) : {}),
  },

  logo: { width: 60, height: 60, borderRadius: 14, backgroundColor: SAC.dots },

  cName: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 14.5, lineHeight: 18 },
  cLine: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },

  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  statBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: SAC.warnTint, borderWidth: 1, borderColor: SAC.warnLine,
  },
  statVal: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 14 },
  statLbl: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 9, letterSpacing: 0.8 },

  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4.5, borderRadius: 999,
    backgroundColor: SAC.dots, borderWidth: 1, borderColor: SAC.line,
  },
  tagText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10.5 },

  rankPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    backgroundColor: SAC.warnTint, borderWidth: 1, borderColor: SAC.warnLine,
  },
  rankText: { color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 10.5 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  viewBtn: { height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  viewBtnText: { color: SAC.onAccent, fontFamily: FONTS.xbold, fontSize: 13 },
  socialBtn: {
    width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SAC.panel2, borderColor: SAC.line, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  menuTrigger: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SAC.panel2, borderColor: SAC.line, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  menu: {
    position: 'absolute', top: 58, right: 18, minWidth: 180, zIndex: 20,
    backgroundColor: SAC.card, borderColor: SAC.line, borderWidth: 1,
    borderRadius: 10, padding: 6, gap: 2,
    ...(Platform.OS === 'web' ? ({ boxShadow: SAC.shadow } as any) : {}),
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 7, paddingHorizontal: 10, borderRadius: 7,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  menuLabel: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },

  /* modal */
  modalBg: {
    flex: 1, backgroundColor: SAC.panel2, alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxWidth: 620, maxHeight: '92%',
    backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2, overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}),
  },
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border },
  modalTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 15 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5, width: 110 },
  detailValue: { color: SAC.text, fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  input: {
    flex: 1, color: SAC.text, fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  destructiveBtn: { backgroundColor: SAC.red, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: SAC.dangerTint, borderWidth: 1, borderColor: SAC.danger },

  skBox: { backgroundColor: SAC.dots, borderRadius: 6 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 14 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SAC.cardSolid, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  pageBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  pageInfo: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },

  stuHeadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: SAC.panel2, borderRadius: 10, borderWidth: 1, borderColor: SAC.line,
  },
  stuTh: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 9, letterSpacing: 0.8 },
  stuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, backgroundColor: SAC.panel2, borderWidth: 1, borderColor: SAC.line,
  },
  stuName: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 11.5 },
  stuSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10 },
  stuCell: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  stuViewBtn: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.line,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  stuPager: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
});
