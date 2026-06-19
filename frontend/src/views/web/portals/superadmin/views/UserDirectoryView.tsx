// @ts-nocheck
/**
 * UserDirectoryView — shared reusable directory for Student / Alumni / Mentor
 * (and the catch-all "All Users") menus.
 *
 * Pulls from the same `users` collection that the Imports flow writes into,
 * so newly imported users automatically appear in their matching menu.
 *
 * Renders a ProfileCard grid in the Amber-Admin theme and exposes per-card
 * Approve · Disable · Restore · Delete · Edit · View actions.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Modal, ScrollView, TextInput,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Users, GraduationCap, UserCheck, Sparkles, Briefcase, X, Check,
  Pencil, Trash2, ShieldCheck, ShieldOff, RefreshCw, AlertTriangle,
  Filter, Mail, Phone, MapPin, Building2, ExternalLink, Calendar, FileText,
  SquareCheck, Square, CheckSquare,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { SAC, FONTS } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  TopTabs, SearchField, StatusPill, Toast, useToast, EmptyState, LoadingBox, KpiTile,
} from '../applekit';
import { request } from '@/src/models/services/api';
import { ProfileCard, ProfileCardSkeleton } from './ProfileCard';
import type { ProfileCardCategory } from './ProfileCard';

type Cat = 'all' | 'student' | 'masters' | 'alumni' | 'mentor';

const CAT_META = {
  all:     { label: 'All',       icon: Users,          color: GRAD.to },
  student: { label: 'Student',   icon: GraduationCap,  color: '#FCD34D' },
  masters: { label: "Master's",  icon: Briefcase,      color: '#F59E0B' },
  alumni:  { label: 'Alumni',    icon: UserCheck,      color: '#D97706' },
  mentor:  { label: 'Mentor',    icon: Sparkles,       color: '#B45309' },
} as const;

export function UserDirectoryView({
  category = 'all',
  title,
  subtitle,
  showCategoryTabs = false,
}: {
  category?: Cat;
  title?: string;
  subtitle?: string;
  showCategoryTabs?: boolean;
}) {
  const meta = CAT_META[category];
  const [cat, setCat] = useState<Cat>(category);
  const [q, setQ]     = useState('');
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [bump, setBump] = useState(0);
  /* Bulk selection */
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const { toast, flash } = useToast();

  const goToPage = useCallback((p: number) => {
    setPage(p);
    setBusy(true);
    (async () => {
      try {
        const r = await request<any>(`/admin/users/list?category=${cat}&q=${encodeURIComponent(q)}&page=${p}&limit=24`);
        setData(r);
        setPages(r.pages || 1);
      } catch (e: any) {
        if (/401|Not authenticated/i.test(String(e?.message || ''))) {
          await new Promise((r) => setTimeout(r, 600));
          try {
            const r = await request<any>(`/admin/users/list?category=${cat}&q=${encodeURIComponent(q)}&page=${p}&limit=24`);
            setData(r); setPages(r.pages || 1); return;
          } catch {}
        }
        console.warn('Users list load failed', e);
        setData({ items: [], total: 0, counts: {} });
      } finally { setBusy(false); }
    })();
  }, [cat, q, bump]);
  const load = useCallback(() => { goToPage(1); }, [goToPage]);
  useEffect(() => { load(); }, [load]);

  const counts = data?.counts || {};
  const items = useMemo(() => {
    const list = data?.items || [];
    return pendingOnly ? list.filter((u: any) => !u.approved) : list;
  }, [data, pendingOnly]);

  /* Per-card actions */
  const approve = async (id: string) => {
    try { await request(`/admin/users/profile/${id}/approve`, { method: 'POST' });
      flash('Approved · now active');
      setData((d: any) => d ? { ...d, items: d.items.map((u: any) => u.id === id ? { ...u, approved: true, is_new: false } : u) } : d);
    } catch { flash('Failed to approve'); }
  };
  const disable = async (id: string) => {
    try { await request(`/admin/users/profile/${id}/disable`, { method: 'POST' });
      flash('Disabled · profile inactive');
      setData((d: any) => d ? { ...d, items: d.items.map((u: any) => u.id === id ? { ...u, approved: false, disabled: true } : u) } : d);
    } catch { flash('Failed to disable'); }
  };
  const restore = async (id: string) => {
    try { await request(`/admin/users/profile/${id}/restore`, { method: 'POST' });
      flash('Restored · profile active');
      setBump((b) => b + 1);
    } catch { flash('Failed to restore'); }
  };
  const remove = async (id: string) => {
    try { await request(`/admin/users/profile/${id}`, { method: 'DELETE' });
      flash('Deleted · auto-restored on next import');
      setData((d: any) => d ? { ...d, items: d.items.filter((u: any) => u.id !== id) } : d);
    } catch { flash('Failed to delete'); }
  };

  /* ── Bulk actions ── */
  const toggleSelect = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectAll = () => {
    const all: Record<string, boolean> = {};
    (data?.items || []).forEach((u: any) => { all[u.id] = true; });
    setSelected(all);
  };
  const clearSelection = () => setSelected({});
  const bulkRun = async (kind: 'approve' | 'disable' | 'delete', label: string) => {
    const ids = selectedIds;
    if (ids.length === 0) return;
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        if (kind === 'approve') await request(`/admin/users/profile/${id}/approve`, { method: 'POST' });
        else if (kind === 'disable') await request(`/admin/users/profile/${id}/disable`, { method: 'POST' });
        else await request(`/admin/users/profile/${id}`, { method: 'DELETE' });
        ok++;
      } catch { fail++; }
    }
    flash(`${label} · ${ok} done${fail > 0 ? ` · ${fail} failed` : ''}`);
    clearSelection();
    setSelectMode(false);
    setBump((b) => b + 1);
  };

  const Icon = meta.icon;
  const pendingCount = counts.pending_approval || 0;

  const directoryTabs = [
    { id: 'all',     label: 'All',      count: counts.all     || 0 },
    { id: 'student', label: 'Students', count: counts.student || 0 },
    { id: 'masters', label: "Master's", count: counts.masters || 0 },
    { id: 'alumni',  label: 'Alumni',   count: counts.alumni  || 0 },
    { id: 'mentor',  label: 'Mentors',  count: counts.mentor  || 0 },
  ] as const;

  return (
    <View style={{ gap: 14 }}>
      {/* Header banner */}
      <Card>
        <View style={st.headRow}>
          <IconBox size={38}><Icon size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.title}>{title || meta.label + 's'}</Text>
            <Text style={st.sub}>
              {subtitle || `Browse and manage ${meta.label.toLowerCase()} profiles imported into the system. Approve new arrivals, disable inactive ones, or restore any previously archived record.`}
            </Text>
          </View>
        </View>
      </Card>

      {/* KPI strip */}
      <View style={st.kpiRow}>
        <KpiTile Icon={Users}          label="TOTAL"             value={String(counts.all || 0)} />
        <KpiTile Icon={ShieldCheck}    label="APPROVED"          value={String((counts.all || 0) - pendingCount)} delta="active" deltaKind="success" />
        <KpiTile Icon={AlertTriangle}  label="PENDING APPROVAL"  value={String(pendingCount)} delta={pendingCount > 0 ? 'review' : 'all clear'} deltaKind={pendingCount > 0 ? 'warn' : 'success'} />
        <KpiTile Icon={Sparkles}       label="NEW (THIS WEEK)"   value={String(Math.min(pendingCount, counts.all || 0))} />
      </View>

      {/* Tabs + Search */}
      <Card>
        <View style={st.browseHead}>
          {showCategoryTabs ? (
            <TopTabs<Cat> tabs={directoryTabs as any} active={cat} onChange={setCat} />
          ) : null}
          <SearchField value={q} onChange={setQ} placeholder={`Search ${meta.label.toLowerCase()}s…`} width={300} />
          <Pressable onPress={() => { setSelectMode(!selectMode); if (selectMode) clearSelection(); }} style={[st.toggleBtn, selectMode && { borderColor: GRAD.to, backgroundColor: 'rgba(245,158,11,0.10)' }]}>
            <CheckSquare size={11} color={selectMode ? GRAD.to : SAC.muted} />
            <Text style={[st.toggleBtnText, selectMode && { color: GRAD.to }]}>
              {selectMode ? 'Cancel selection' : 'Select'}
            </Text>
          </Pressable>
          {pendingCount > 0 && (
            <Pressable onPress={() => setPendingOnly(!pendingOnly)} style={st.toggleBtn}>
              <Filter size={11} color={pendingOnly ? GRAD.to : SAC.muted} />
              <Text style={[st.toggleBtnText, pendingOnly && { color: GRAD.to }]}>
                {pendingOnly ? 'Showing pending only' : 'Show pending only'}
              </Text>
            </Pressable>
          )}
        </View>
      </Card>

      {/* Grid */}
      {busy && !data ? (
        <View style={st.cardGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={st.gridCell}><ProfileCardSkeleton /></View>
          ))}
        </View>
      ) : (items || []).length === 0 ? (
        <EmptyState
          icon={meta.icon}
          title={`No ${meta.label.toLowerCase()}s yet`}
          sub={q ? 'No results match your search.' : 'Upload a spreadsheet in the Imports menu to populate this view.'}
        />
      ) : (
        <View style={st.cardGrid}>
          {items.map((u: any) => (
            <View key={u.id} style={st.gridCell}>
              <ProfileCardWithActions
                user={u}
                onView={(id) => selectMode ? toggleSelect(id) : setProfileId(id)}
                onApprove={approve}
                onDisable={disable}
                onRestore={restore}
                onRemove={remove}
                selectMode={selectMode}
                selected={!!selected[u.id]}
                onToggleSelect={() => toggleSelect(u.id)}
              />
            </View>
          ))}
        </View>
      )}

      {items.length > 0 && (
        <Text style={[st.muted, { textAlign: 'center', paddingVertical: 6 }]}>
          Showing {items.length} of {data?.total || 0}
        </Text>
      )}

      {pages > 1 && (
        <View style={st.pagination}>
          <Pressable style={[st.pageBtn, page <= 1 && { opacity: 0.4 }]}
            onPress={() => page > 1 && goToPage(page - 1)}>
            <Text style={st.pageBtnText}>Prev</Text>
          </Pressable>
          <Text style={st.pageInfo}>{page} / {pages}</Text>
          <Pressable style={[st.pageBtn, page >= pages && { opacity: 0.4 }]}
            onPress={() => page < pages && goToPage(page + 1)}>
            <Text style={st.pageBtnText}>Next</Text>
          </Pressable>
        </View>
      )}

      <ProfilePanel userId={profileId} onClose={() => setProfileId(null)} onSaved={() => { flash('Updated'); setBump((b) => b + 1); }} />
      <Toast text={toast.text} visible={toast.visible} />

      {/* Floating bulk action bar */}
      {selectMode && selectedIds.length > 0 && (
        <Animated.View entering={FadeInDown.duration(200)} style={st.bulkBar}>
          <Text style={st.bulkText}>{selectedIds.length} selected</Text>
          <Pressable onPress={selectAll} style={st.bulkLinkBtn}>
            <Text style={st.bulkLink}>Select all ({(data?.items || []).length})</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <SecondaryButton onPress={() => bulkRun('approve', 'Approved')}>
            <ShieldCheck size={12} color={SAC.muted} /><Text style={st.secText}>Approve</Text>
          </SecondaryButton>
          <SecondaryButton onPress={() => bulkRun('disable', 'Disabled')}>
            <ShieldOff size={12} color={SAC.muted} /><Text style={st.secText}>Disable</Text>
          </SecondaryButton>
          <SecondaryButton danger onPress={() => bulkRun('delete', 'Deleted')}>
            <Trash2 size={12} color={'#FCA5A5'} /><Text style={[st.secText, { color: '#FCA5A5' }]}>Delete</Text>
          </SecondaryButton>
          <Pressable onPress={clearSelection} style={st.bulkClose}>
            <X size={13} color="#fff" />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────
 *  ProfileCard wrapper that adds the admin overflow menu (Disable / Restore)
 * ────────────────────────────────────────────────────────────────── */
function ProfileCardWithActions({ user, onView, onApprove, onDisable, onRestore, onRemove, selectMode, selected, onToggleSelect }: {
  user: any;
  onView: (id: string) => void;
  onApprove: (id: string) => void;
  onDisable: (id: string) => void;
  onRestore: (id: string) => void;
  onRemove: (id: string) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={{ position: 'relative' }}>
      <View style={selectMode && selected ? st.selectedHalo : null}>
        <ProfileCard
        user={{
          id: user.id,
          firstName: user.first_name || (user.name || '').split(' ')[0] || '',
          lastName:  user.last_name  || (user.name || '').split(' ').slice(1).join(' ') || '',
          status: user.disabled ? 'archived' : user.approved ? 'active' : 'inactive',
          degree: user.degree || '',
          institution: user.college || '',
          batchYear: user.graduation_year || undefined,
          category: (user.category as ProfileCardCategory) || 'student',
          isNew: !!user.is_new,
          approved: !!user.approved,
        }}
        goals={user.designation ? [
          user.company ? `Working as ${user.designation} @ ${user.company}` : `Career: ${user.designation}`,
        ] : (user.category === 'student' ? ['Build strong fundamentals', 'Find the right first role'] : undefined)}
        progress={user.experience_years != null ? {
          percent: Math.min(100, Math.round(((user.experience_years || 0) / 4) * 100)),
          sessionsCompleted: 0, sessionsTotal: 0,
        } : undefined}
        tags={user.tags || []}
        socials={{ linkedinUrl: user.linkedin_url || undefined }}
        onViewProfile={onView}
        onApprove={!user.approved && !user.disabled ? onApprove : undefined}
        onRemove={onRemove}
      />
      </View>

      {/* Selection checkbox (top-left, only in select mode) */}
      {selectMode && (
        <Pressable onPress={onToggleSelect} style={st.selectBox}>
          {selected
            ? <SquareCheck size={20} color={GRAD.to} fill="rgba(245,158,11,0.18)" />
            : <Square size={20} color="rgba(255,255,255,0.6)" />}
        </Pressable>
      )}

      {/* Floating menu trigger (top-right of the card) — hidden in select mode */}
      {!selectMode && (
      <Pressable
        onPress={() => setMenuOpen((m) => !m)}
        style={st.menuTrigger}
        accessibilityLabel="More actions"
      >
        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 14, lineHeight: 14 }}>⋯</Text>
      </Pressable>
      )}

      {menuOpen && !selectMode && (
        <Animated.View entering={FadeInDown.duration(140)} style={st.menu}>
          {!user.approved && !user.disabled ? (
            <MenuItem icon={ShieldCheck} label="Approve" onPress={() => { setMenuOpen(false); onApprove(user.id); }} />
          ) : null}
          {user.approved && !user.disabled ? (
            <MenuItem icon={ShieldOff} label="Disable" onPress={() => { setMenuOpen(false); onDisable(user.id); }} />
          ) : null}
          {(user.disabled || !user.approved) ? (
            <MenuItem icon={RefreshCw} label="Restore" onPress={() => { setMenuOpen(false); onRestore(user.id); }} />
          ) : null}
          <MenuItem icon={Pencil} label="Edit" onPress={() => { setMenuOpen(false); onView(user.id); }} />
          <MenuItem icon={Trash2} label="Delete" danger onPress={() => { setMenuOpen(false); onRemove(user.id); }} />
        </Animated.View>
      )}
    </View>
  );
}

function MenuItem({ icon: Icon, label, onPress, danger }: any) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [
      st.menuItem,
      hovered && Platform.OS === 'web' ? { backgroundColor: 'rgba(245,158,11,0.10)' } : null,
    ]}>
      <Icon size={12} color={danger ? '#FCA5A5' : SAC.muted} />
      <Text style={[st.menuLabel, danger && { color: '#FCA5A5' }]}>{label}</Text>
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────────
 *  Reused profile drawer (kept compact — mirrors ImportsView)
 * ────────────────────────────────────────────────────────────────── */
function ProfilePanel({ userId, onClose, onSaved }: { userId: string | null; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!userId) { setData(null); setEdit(false); return; }
    (async () => {
      try { const r = await request<any>(`/admin/users/profile/${userId}`); setData(r); setDraft({}); } catch {}
    })();
  }, [userId]);

  if (!userId) return null;

  const save = async () => {
    try {
      await request(`/admin/users/profile/${userId}`, { method: 'PATCH', body: draft });
      const r = await request<any>(`/admin/users/profile/${userId}`);
      setData(r); setEdit(false); setDraft({});
      onSaved();
    } catch { flash('Failed to save changes'); }
  };
  const del = async () => {
    try { await request(`/admin/users/profile/${userId}`, { method: 'DELETE' }); onClose(); onSaved(); } catch { flash('Failed to delete'); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalBg}>
        <Animated.View entering={FadeInDown.duration(220)} style={st.modalCard}>
          {!data ? <View style={{ padding: 60 }}><LoadingBox /></View> : (
            <>
              <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.modalHero}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.modalTitle} numberOfLines={1}>{data.full_name || '—'}</Text>
                  <Text style={[st.muted, { marginTop: 4 }]}>{data.designation || ''}{data.company ? ` @ ${data.company}` : ''}</Text>
                </View>
                <Pressable onPress={onClose}><X size={16} color={SAC.muted} /></Pressable>
              </LinearGradient>
              <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
                <View>
                  <SectionLabel>EDUCATION</SectionLabel>
                  <View style={{ marginTop: 8, gap: 8 }}>
                    {!edit
                      ? <DetailRow Icon={GraduationCap} label="College" value={data.college || '—'} />
                      : <EditRow label="College" value={draft.college ?? data.college} onChange={(v) => setDraft({ ...draft, college: v })} />}
                    {!edit
                      ? <DetailRow Icon={FileText} label="Degree" value={data.degree || '—'} />
                      : <EditRow label="Degree" value={draft.degree ?? data.degree} onChange={(v) => setDraft({ ...draft, degree: v })} />}
                    <DetailRow Icon={Calendar} label="Graduation year" value={data.graduation_year ? String(data.graduation_year) : '—'} />
                  </View>
                </View>
                <View>
                  <SectionLabel>EXPERIENCE</SectionLabel>
                  <View style={{ marginTop: 8, gap: 8 }}>
                    {!edit
                      ? <DetailRow Icon={Briefcase} label="Designation" value={data.designation || '—'} />
                      : <EditRow label="Designation" value={draft.designation ?? data.designation} onChange={(v) => setDraft({ ...draft, designation: v })} />}
                    {!edit
                      ? <DetailRow Icon={Building2} label="Company" value={data.company || '—'} />
                      : <EditRow label="Company" value={draft.company ?? data.company} onChange={(v) => setDraft({ ...draft, company: v })} />}
                    <DetailRow Icon={Sparkles} label="Years of experience" value={`${data.experience_years ?? 0} yrs`} />
                  </View>
                </View>
                <View>
                  <SectionLabel>CONTACT</SectionLabel>
                  <View style={{ marginTop: 8, gap: 8 }}>
                    <LinkRow Icon={Mail} label="Email" value={data.email} href={data.email ? `mailto:${data.email}` : undefined} />
                    <LinkRow Icon={Phone} label="Phone" value={data.phone || '—'} href={data.phone ? `tel:${data.phone}` : undefined} />
                    <LinkRow Icon={ExternalLink} label="LinkedIn" value={data.linkedin_url || '—'} href={data.linkedin_url} />
                    <DetailRow Icon={MapPin} label="Location" value={data.location || '—'} />
                  </View>
                </View>
                <View style={st.actionsRow}>
                  {!edit ? (
                    <>
                      <SecondaryButton onPress={() => setEdit(true)}>
                        <Pencil size={12} color={SAC.muted} />
                        <Text style={st.secText}>Edit</Text>
                      </SecondaryButton>
                      <SecondaryButton danger onPress={() => setConfirmDel(true)}>
                        <Trash2 size={12} color={'#FCA5A5'} />
                        <Text style={[st.secText, { color: '#FCA5A5' }]}>Delete</Text>
                      </SecondaryButton>
                    </>
                  ) : (
                    <>
                      <SecondaryButton onPress={() => { setEdit(false); setDraft({}); }}>
                        <Text style={st.secText}>Cancel</Text>
                      </SecondaryButton>
                      <GradientButton onPress={save}>
                        <Check size={13} color="#fff" />
                        <Text style={st.btnText}>Save changes</Text>
                      </GradientButton>
                    </>
                  )}
                </View>
                {confirmDel && (
                  <View style={st.warnBox}>
                    <AlertTriangle size={13} color={'#FCA5A5'} />
                    <Text style={[st.muted, { color: '#FCA5A5', flex: 1 }]}>Permanently delete this profile?</Text>
                    <SecondaryButton size="sm" onPress={() => setConfirmDel(false)}><Text style={st.secText}>No</Text></SecondaryButton>
                    <Pressable onPress={del} style={st.destructiveBtn}><Text style={st.btnText}>Yes, delete</Text></Pressable>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function DetailRow({ Icon, label, value }: any) {
  return (
    <View style={st.detailRow}>
      <Icon size={13} color={SAC.muted} />
      <Text style={st.detailLabel}>{label}</Text>
      <Text style={st.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}
function LinkRow({ Icon, label, value, href }: any) {
  const open = () => { if (href) Linking.openURL(href).catch(() => {}); };
  return (
    <Pressable onPress={href ? open : undefined} style={st.detailRow}>
      <Icon size={13} color={SAC.muted} />
      <Text style={st.detailLabel}>{label}</Text>
      <Text style={[st.detailValue, href && { color: GRAD.to, textDecorationLine: 'underline' }]} numberOfLines={1}>{value}</Text>
      {href && <ExternalLink size={11} color={GRAD.to} />}
    </Pressable>
  );
}
function EditRow({ label, value, onChange }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={[st.detailLabel, { width: 120 }]}>{label}</Text>
      <TextInput value={value || ''} onChangeText={onChange} placeholderTextColor={SAC.dim} style={st.formInput} />
    </View>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 760 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  browseHead: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' },
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 16,
    ...(Platform.OS === 'web' ? ({ display: 'grid' as any, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' as any, gap: 16 } as any) : {}),
  },
  gridCell: { minWidth: 320, flexBasis: 320, flexGrow: 1 },

  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toggleBtnText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },

  /* card overflow menu */
  menuTrigger: {
    position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)', borderColor: 'rgba(251,146,60,0.25)', borderWidth: 1,
    zIndex: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  menu: {
    position: 'absolute', top: 48, right: 14, minWidth: 160, zIndex: 20,
    backgroundColor: '#170D04', borderColor: 'rgba(251,146,60,0.30)', borderWidth: 1,
    borderRadius: 10, padding: 6, gap: 2,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 32px rgba(0,0,0,0.55)' } as any) : {}),
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 7, paddingHorizontal: 10, borderRadius: 7,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  menuLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },

  /* selection */
  selectBox: {
    position: 'absolute', top: 14, left: 14, width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderColor: 'rgba(251,146,60,0.25)', borderWidth: 1,
    zIndex: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  selectedHalo: {
    borderRadius: 22, borderWidth: 2, borderColor: GRAD.to,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 0 4px rgba(251,146,60,0.18)' } as any) : {}),
  },

  /* floating bulk-action bar */
  bulkBar: {
    position: 'absolute', bottom: 18, left: 0, right: 0,
    marginHorizontal: 'auto', maxWidth: 880,
    flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: '#1A0E04', borderColor: 'rgba(251,146,60,0.45)', borderWidth: 1,
    borderRadius: 14,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 18px 50px rgba(0,0,0,0.65), 0 0 0 4px rgba(251,146,60,0.10)',
      position: 'sticky' as any, bottom: 18,
    } as any) : {}),
  },
  bulkText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  bulkLinkBtn: { ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  bulkLink: { color: GRAD.to, fontFamily: FONTS.bold, fontSize: 12 },
  bulkClose: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  /* modal */
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
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5, width: 130 },
  detailValue: { color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  formInput: {
    flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 9,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  destructiveBtn: { backgroundColor: SAC.red, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)' },
  btnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 14 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SAC.card, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  pageBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  pageInfo: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
});
