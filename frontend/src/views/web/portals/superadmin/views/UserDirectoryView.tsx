// @ts-nocheck
/**
 * UserDirectoryView — shared reusable directory for Student / Alumni / Mentor
 * (and the catch-all "All Users") menus.
 *
 * Supports Dual View Modes:
 *   1. Visual Card Grid View (ProfileCard with real email, college, onboarding status)
 *   2. Compact High-Density Table View (for high-volume SuperAdmin management)
 *
 * Pulls from the same `users` collection that the Imports flow writes into,
 * with live search, filters, pagination, bulk operations, and CSV export.
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
  SquareCheck, Square, CheckSquare, LayoutGrid, List, FileDown, Eye, Copy,
  CheckCircle2, Clock, Target, ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  TopTabs, SearchField, StatusPill, Toast, useToast, EmptyState, LoadingBox, KpiTile,
} from '../applekit';
import { request } from '@/src/models/services/api';
import { ProfileCard, ProfileCardSkeleton } from './ProfileCard';
import type { ProfileCardCategory } from './ProfileCard';

type Cat = 'all' | 'student' | 'masters' | 'alumni' | 'mentor';
type ViewMode = 'grid' | 'table';

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
  const T = useSAC();
  Object.assign(st, resolveColors(st, T));
  const meta = CAT_META[category];
  const [cat, setCat] = useState<Cat>(category);
  const [q, setQ]     = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showExportModal, setShowExportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id?: string; name?: string; count?: number; isBulk?: boolean } | null>(null);
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
  const { toast, flash, hide } = useToast();

  const goToPage = useCallback((p: number) => {
    setPage(p);
    setBusy(true);
    (async () => {
      try {
        const r = await request<any>(`/admin/users/list?category=${cat}&q=${encodeURIComponent(q)}&page=${p}&limit=24`);
        setData(r || { items: [], total: 0, counts: {} });
        setPages(r?.pages || 1);
      } catch (e: any) {
        if (/401|Not authenticated/i.test(String(e?.message || ''))) {
          await new Promise((r) => setTimeout(r, 600));
          try {
            const r = await request<any>(`/admin/users/list?category=${cat}&q=${encodeURIComponent(q)}&page=${p}&limit=24`);
            setData(r || { items: [], total: 0, counts: {} }); setPages(r?.pages || 1); return;
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

  const askRemove = (id: string, name?: string) => {
    setDeleteTarget({ id, name: name || 'this user account' });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.isBulk) {
      await bulkRun('delete', 'Deleted');
    } else if (deleteTarget.id) {
      await remove(deleteTarget.id);
    }
    setDeleteTarget(null);
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

  /* Export CSV function */
  const exportCsv = () => {
    const rows = (items || []).map((u: any) => ({
      ID: u.id,
      Name: u.name || u.full_name || '',
      Email: u.email || '',
      Phone: u.phone || '',
      Role: u.role || u.category || '',
      College: u.college || u.institution || '',
      Degree: u.degree || '',
      GraduationYear: u.graduation_year || '',
      CareerPath: u.career_path || '',
      OnboardingStatus: u.onboarding_completed ? 'Completed' : 'Pending',
      CompletenessScore: `${u.completeness_score || 0}%`,
      AccountStatus: u.disabled ? 'Disabled' : u.approved ? 'Active' : 'Pending Approval',
      RegisteredOn: u.created_at || '',
    }));

    if (rows.length === 0) {
      flash('No records to export');
      return;
    }

    if (Platform.OS === 'web') {
      const headers = Object.keys(rows[0]).join(',');
      const csvLines = rows.map((r) =>
        Object.values(r)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );
      const csvData = [headers, ...csvLines].join('\n');
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cat}_directory_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
    flash(`Exported ${rows.length} ${meta.label.toLowerCase()} records to CSV`);
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

      {/* Toolbar: Tabs + Search + View Switcher + Actions */}
      <Card>
        <View style={st.browseHead}>
          {showCategoryTabs ? (
            <TopTabs<Cat> tabs={directoryTabs as any} active={cat} onChange={setCat} />
          ) : null}

          <SearchField value={q} onChange={setQ} placeholder={`Search ${meta.label.toLowerCase()}s by name, email, college…`} width={300} />

          {/* View Mode Switcher (Grid vs Table) */}
          <View style={st.viewSwitcher}>
            <ActionTooltip text="Switch to Card Grid View">
              <Pressable
                accessibilityLabel="Switch to Card Grid View"
                onPress={() => setViewMode('grid')}
                style={[st.viewModeBtn, viewMode === 'grid' && st.viewModeBtnActive]}
              >
                <LayoutGrid size={13} color={viewMode === 'grid' ? '#fff' : SAC.muted} />
                <Text style={[st.viewModeBtnText, viewMode === 'grid' && { color: '#fff' }]}>Grid</Text>
              </Pressable>
            </ActionTooltip>
            <ActionTooltip text="Switch to Data Table View">
              <Pressable
                accessibilityLabel="Switch to Data Table View"
                onPress={() => setViewMode('table')}
                style={[st.viewModeBtn, viewMode === 'table' && st.viewModeBtnActive]}
              >
                <List size={13} color={viewMode === 'table' ? '#fff' : SAC.muted} />
                <Text style={[st.viewModeBtnText, viewMode === 'table' && { color: '#fff' }]}>Table</Text>
              </Pressable>
            </ActionTooltip>
          </View>

          {/* Export CSV Button */}
          <ActionTooltip text="Export filtered directory to CSV">
            <Pressable
              accessibilityLabel="Export filtered student directory to CSV"
              onPress={() => setShowExportModal(true)}
              style={st.toggleBtn}
            >
              <FileDown size={12} color={SAC.muted} />
              <Text style={st.toggleBtnText}>Export CSV</Text>
            </Pressable>
          </ActionTooltip>

          {/* Select Mode Toggle */}
          <ActionTooltip text={selectMode ? "Cancel multi-select mode" : "Enable multi-select mode for bulk actions"}>
            <Pressable
              accessibilityLabel={selectMode ? "Cancel multi-select mode" : "Enable multi-select mode for bulk actions"}
              onPress={() => { setSelectMode(!selectMode); if (selectMode) clearSelection(); }}
              style={[st.toggleBtn, selectMode && { borderColor: GRAD.to, backgroundColor: 'rgba(245,158,11,0.10)' }]}
            >
              <CheckSquare size={11} color={selectMode ? GRAD.to : SAC.muted} />
              <Text style={[st.toggleBtnText, selectMode && { color: GRAD.to }]}>
                {selectMode ? 'Cancel' : 'Select'}
              </Text>
            </Pressable>
          </ActionTooltip>

          {/* Pending filter toggle */}
          {pendingCount > 0 && (
            <ActionTooltip text={pendingOnly ? "Showing pending accounts" : "Filter accounts pending approval"}>
              <Pressable
                accessibilityLabel={pendingOnly ? "Showing accounts pending approval" : "Filter by accounts pending approval"}
                onPress={() => setPendingOnly(!pendingOnly)}
                style={st.toggleBtn}
              >
                <Filter size={11} color={pendingOnly ? GRAD.to : SAC.muted} />
                <Text style={[st.toggleBtnText, pendingOnly && { color: GRAD.to }]}>
                  {pendingOnly ? 'Showing pending' : 'Show pending'}
                </Text>
              </Pressable>
            </ActionTooltip>
          )}
        </View>
      </Card>

      {/* Main Content: Card Grid vs Data Table */}
      {busy && !data ? (
        viewMode === 'grid' ? (
          <View style={st.cardGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={st.gridCell}><ProfileCardSkeleton /></View>
            ))}
          </View>
        ) : (
          <LoadingBox label="Loading user directory…" />
        )
      ) : (items || []).length === 0 ? (
        <EmptyState
          icon={meta.icon}
          title={`No ${meta.label.toLowerCase()}s found`}
          sub={q ? 'No results match your search query.' : 'No student accounts found in this category.'}
        />
      ) : viewMode === 'grid' ? (
        /* ── Card Grid View ── */
        <View style={st.cardGrid}>
          {items.map((u: any) => (
            <View key={u.id} style={st.gridCell}>
              <ProfileCardWithActions
                user={u}
                onView={(id) => selectMode ? toggleSelect(id) : setProfileId(id)}
                onApprove={approve}
                onDisable={disable}
                onRestore={restore}
                onRemove={(id) => askRemove(id, u.name || u.full_name || u.email)}
                selectMode={selectMode}
                selected={!!selected[u.id]}
                onToggleSelect={() => toggleSelect(u.id)}
              />
            </View>
          ))}
        </View>
      ) : (
        /* ── High-Density Data Table View ── */
        <UserDirectoryTable
          items={items}
          selectMode={selectMode}
          selected={selected}
          onToggleSelect={toggleSelect}
          onView={(id) => selectMode ? toggleSelect(id) : setProfileId(id)}
          onApprove={approve}
          onDisable={disable}
          onRestore={restore}
          onRemove={(id, name) => askRemove(id, name)}
          onFlash={flash}
        />
      )}

      {items.length > 0 && (
        <Text style={[st.muted, { textAlign: 'center', paddingVertical: 6 }]}>
          Showing {items.length} of {data?.total || 0}
        </Text>
      )}

      {pages > 1 && (
        <View style={st.pagination}>
          <Pressable
            style={[st.pageBtn, page <= 1 && { opacity: 0.4 }]}
            onPress={() => page > 1 && goToPage(page - 1)}
          >
            <Text style={st.pageBtnText}>Prev</Text>
          </Pressable>
          <Text style={st.pageInfo}>{page} / {pages}</Text>
          <Pressable
            style={[st.pageBtn, page >= pages && { opacity: 0.4 }]}
            onPress={() => page < pages && goToPage(page + 1)}
          >
            <Text style={st.pageBtnText}>Next</Text>
          </Pressable>
        </View>
      )}

      <ProfilePanel userId={profileId} onClose={() => setProfileId(null)} onSaved={() => { flash('Updated'); setBump((b) => b + 1); }} />
      <ExportConfirmModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={exportCsv}
        count={items.length}
        totalCount={data?.total || items.length}
        category={meta.label}
        fileName={`${cat}_directory_${new Date().toISOString().slice(0, 10)}.csv`}
      />
      <DeleteConfirmModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />

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
          <SecondaryButton danger onPress={() => setDeleteTarget({ count: selectedIds.length, isBulk: true })}>
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
 *  ActionTooltip — Instant Floating Tooltip for Web & Mobile
 * ────────────────────────────────────────────────────────────────── */
function ActionTooltip({
  text,
  children,
  position = 'top',
  align = 'center',
}: {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  align?: 'center' | 'right' | 'left';
}) {
  const [hovered, setHovered] = useState(false);

  if (!text) return <>{children}</>;

  return (
    <View
      style={{ position: 'relative', alignItems: 'center' }}
      // @ts-ignore — web mouse events
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && Platform.OS === 'web' && (
        <View
          pointerEvents="none"
          style={[
            st.customTooltip,
            position === 'top' ? st.tooltipTop : st.tooltipBottom,
            align === 'right' ? { right: 0, alignItems: 'flex-end' } :
            align === 'left' ? { left: 0, alignItems: 'flex-start' } :
            { alignSelf: 'center' },
          ]}
        >
          <Text style={st.customTooltipText} numberOfLines={1}>
            {text}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────
 *  UserDirectoryTable — Compact Data Table for High-Volume Management
 * ────────────────────────────────────────────────────────────────── */
function UserDirectoryTable({
  items,
  selectMode,
  selected,
  onToggleSelect,
  onView,
  onApprove,
  onDisable,
  onRestore,
  onRemove,
  onFlash,
}: {
  items: any[];
  selectMode: boolean;
  selected: Record<string, boolean>;
  onToggleSelect: (id: string) => void;
  onView: (id: string) => void;
  onApprove: (id: string) => void;
  onDisable: (id: string) => void;
  onRestore: (id: string) => void;
  onRemove: (id: string, name?: string) => void;
  onFlash: (msg: string) => void;
}) {
  const copyText = (text: string, label: string) => {
    if (!text) return;
    if (Platform.OS === 'web' && navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      onFlash(`Copied ${label}`);
    }
  };

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }}>
        <View style={{ minWidth: 960, width: '100%' }}>
          {/* Table Header */}
          <View style={st.tableHeadRow}>
            <View style={{ width: 44, alignItems: 'center' }}>
              <Text style={st.thText}>#</Text>
            </View>
            <View style={{ width: 240, paddingHorizontal: 8 }}>
              <Text style={st.thText}>STUDENT / USER</Text>
            </View>
            <View style={{ width: 200, paddingHorizontal: 8 }}>
              <Text style={st.thText}>COLLEGE / INSTITUTION</Text>
            </View>
            <View style={{ width: 140, paddingHorizontal: 8 }}>
              <Text style={st.thText}>PROGRAM & BATCH</Text>
            </View>
            <View style={{ width: 150, paddingHorizontal: 8 }}>
              <Text style={st.thText}>CAREER TRACK</Text>
            </View>
            <View style={{ width: 160, paddingHorizontal: 8 }}>
              <Text style={st.thText}>PROFILE COMPLETION</Text>
            </View>
            <View style={{ width: 100, paddingHorizontal: 8 }}>
              <Text style={st.thText}>STATUS</Text>
            </View>
            <View style={{ width: 130, paddingHorizontal: 8, alignItems: 'flex-end' }}>
              <Text style={st.thText}>ACTIONS</Text>
            </View>
          </View>

          {/* Table Rows */}
          {items.map((u, idx) => {
            const isSelected = !!selected[u.id];
            const name = u.name || u.full_name || '—';
            const initials = ((u.first_name?.[0] || name[0] || '') + (u.last_name?.[0] || name.split(' ')[1]?.[0] || '')).toUpperCase() || '?';
            const college = u.college || u.institution || 'Pending onboarding';
            const isCollegePending = !u.college && !u.institution;
            const completion = u.completeness_score || (u.onboarding_completed ? 100 : 35);
            const status = u.disabled ? 'archived' : u.approved ? 'active' : 'inactive';

            return (
              <Pressable
                key={u.id}
                onPress={() => selectMode ? onToggleSelect(u.id) : onView(u.id)}
                style={({ hovered }: any) => [
                  st.tableRow,
                  isSelected && st.tableRowSelected,
                  hovered && Platform.OS === 'web' ? st.tableRowHover : null,
                ]}
              >
                {/* Select / Index Checkbox */}
                <View style={{ width: 44, alignItems: 'center' }}>
                  {selectMode ? (
                    <ActionTooltip text={isSelected ? "Deselect student" : "Select student"}>
                      <Pressable
                        accessibilityLabel={isSelected ? "Deselect student" : "Select student"}
                        onPress={() => onToggleSelect(u.id)}
                      >
                        {isSelected ? (
                          <SquareCheck size={18} color={GRAD.to} />
                        ) : (
                          <Square size={18} color="rgba(255,255,255,0.4)" />
                        )}
                      </Pressable>
                    </ActionTooltip>
                  ) : (
                    <Text style={{ color: SAC.muted, fontSize: 11, fontFamily: FONTS.med }}>{idx + 1}</Text>
                  )}
                </View>

                {/* Student Avatar + Name + Email */}
                <View style={{ width: 240, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={st.tableAvatar}>
                    <Text style={st.tableAvatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.tableName} numberOfLines={1}>{name}</Text>
                    {u.email ? (
                      <ActionTooltip text={`Copy email: ${u.email}`} align="left">
                        <Pressable
                          accessibilityLabel={`Click to copy email: ${u.email}`}
                          onPress={(e: any) => { e?.stopPropagation?.(); copyText(u.email, 'email'); }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
                        >
                          <Mail size={10} color={SAC.muted} />
                          <Text style={st.tableEmail} numberOfLines={1}>{u.email}</Text>
                        </Pressable>
                      </ActionTooltip>
                    ) : null}
                  </View>
                </View>

                {/* College / Institution */}
                <View style={{ width: 200, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} color={isCollegePending ? SAC.muted : '#FDBA74'} />
                  <Text style={[st.tableCellText, isCollegePending && { color: SAC.muted, fontStyle: 'italic' }]} numberOfLines={2}>
                    {college}
                  </Text>
                </View>

                {/* Program & Batch */}
                <View style={{ width: 140, paddingHorizontal: 8 }}>
                  <Text style={st.tableCellText} numberOfLines={1}>{u.degree || '—'}</Text>
                  {u.graduation_year ? (
                    <Text style={{ color: SAC.muted, fontSize: 11, fontFamily: FONTS.med, marginTop: 2 }}>
                      Batch {u.graduation_year}
                    </Text>
                  ) : null}
                </View>

                {/* Career Track */}
                <View style={{ width: 150, paddingHorizontal: 8 }}>
                  {u.career_path ? (
                    <View style={st.careerPill}>
                      <Text style={st.careerPillText} numberOfLines={1}>🎯 {u.career_path}</Text>
                    </View>
                  ) : (
                    <Text style={{ color: SAC.muted, fontSize: 11.5, fontFamily: FONTS.med }}>—</Text>
                  )}
                </View>

                {/* Profile Completion */}
                <View style={{ width: 160, paddingHorizontal: 8, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: u.onboarding_completed ? '#86EFAC' : '#FCD34D', fontSize: 10, fontFamily: FONTS.bold }}>
                      {u.onboarding_completed ? '✓ Onboarded' : '⏳ Incomplete'}
                    </Text>
                    <Text style={{ color: SAC.text, fontSize: 10.5, fontFamily: FONTS.xbold }}>{completion}%</Text>
                  </View>
                  <View style={st.progressBarTrack}>
                    <View
                      style={[
                        st.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(5, completion))}%`,
                          backgroundColor: u.onboarding_completed ? '#22C55E' : GRAD.to,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Status Pill */}
                <View style={{ width: 100, paddingHorizontal: 8 }}>
                  <View style={[
                    st.statusBadge,
                    status === 'active' && st.statusActive,
                    status === 'inactive' && st.statusInactive,
                    status === 'archived' && st.statusArchived,
                  ]}>
                    <Text style={[
                      st.statusBadgeText,
                      status === 'active' && { color: '#86EFAC' },
                      status === 'inactive' && { color: '#FCD34D' },
                      status === 'archived' && { color: '#FCA5A5' },
                    ]}>
                      {status === 'active' ? 'Active' : status === 'archived' ? 'Disabled' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={{ width: 140, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  {/* View Profile */}
                  <ActionTooltip text="View Student Profile" align="right">
                    <Pressable
                      accessibilityLabel="View & Edit Student Profile"
                      onPress={(e: any) => { e?.stopPropagation?.(); onView(u.id); }}
                      style={st.tableActionBtn}
                    >
                      <Eye size={12} color="#fff" />
                      <Text style={st.tableActionBtnText}>View</Text>
                    </Pressable>
                  </ActionTooltip>

                  {/* Approve */}
                  {!u.approved && !u.disabled && (
                    <ActionTooltip text="Approve Student Account" align="right">
                      <Pressable
                        accessibilityLabel="Approve Student Account"
                        onPress={(e: any) => { e?.stopPropagation?.(); onApprove(u.id); }}
                        style={[st.tableIconBtn, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.35)' }]}
                      >
                        <ShieldCheck size={12} color="#86EFAC" />
                      </Pressable>
                    </ActionTooltip>
                  )}

                  {/* Restore / Disable */}
                  {u.disabled ? (
                    <ActionTooltip text="Restore Disabled Account" align="right">
                      <Pressable
                        accessibilityLabel="Restore Disabled Account"
                        onPress={(e: any) => { e?.stopPropagation?.(); onRestore(u.id); }}
                        style={[st.tableIconBtn, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.35)' }]}
                      >
                        <RefreshCw size={11} color="#FCD34D" />
                      </Pressable>
                    </ActionTooltip>
                  ) : (
                    <ActionTooltip text="Disable Student Account" align="right">
                      <Pressable
                        accessibilityLabel="Disable Student Account"
                        onPress={(e: any) => { e?.stopPropagation?.(); onDisable(u.id); }}
                        style={[st.tableIconBtn, { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.30)' }]}
                      >
                        <ShieldOff size={11} color="#FCA5A5" />
                      </Pressable>
                    </ActionTooltip>
                  )}

                  {/* Delete */}
                  <ActionTooltip text="Delete Student Account" align="right">
                    <Pressable
                      accessibilityLabel="Delete Student Account"
                      onPress={(e: any) => { e?.stopPropagation?.(); onRemove(u.id, u.name || u.full_name || u.email); }}
                      style={[st.tableIconBtn, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }]}
                    >
                      <Trash2 size={11} color="#FCA5A5" />
                    </Pressable>
                  </ActionTooltip>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────
 *  ProfileCard wrapper that adds real student fields & menu actions
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

  // Derive real goals / details rather than static placeholders
  const realGoals = user.designation ? [
    user.company ? `Working as ${user.designation} @ ${user.company}` : `Career: ${user.designation}`,
  ] : user.career_path ? [
    `Target Track: ${user.career_path}`,
    user.college ? `Campus: ${user.college}` : 'Onboarding in progress'
  ] : (user.category === 'student' ? [
    user.college ? `Campus: ${user.college}` : 'Campus: Pending onboarding',
    user.email ? `Email: ${user.email}` : 'Registered Student'
  ] : undefined);

  return (
    <View style={{ position: 'relative' }}>
      <View style={selectMode && selected ? st.selectedHalo : null}>
        <ProfileCard
          user={{
            id: user.id,
            firstName: user.first_name || (user.name || '').split(' ')[0] || '',
            lastName:  user.last_name  || (user.name || '').split(' ').slice(1).join(' ') || '',
            email: user.email || '',
            phone: user.phone || '',
            status: user.disabled ? 'archived' : user.approved ? 'active' : 'inactive',
            degree: user.degree || '',
            institution: user.college || user.institution || '',
            batchYear: user.graduation_year || undefined,
            category: (user.category as ProfileCardCategory) || 'student',
            isNew: !!user.is_new,
            approved: !!user.approved,
            onboardingCompleted: user.onboarding_completed,
            careerPath: user.career_path || '',
          }}
          goals={realGoals}
          progress={user.completeness_score != null ? {
            percent: user.completeness_score,
            sessionsCompleted: 0, sessionsTotal: 0,
          } : (user.experience_years != null ? {
            percent: Math.min(100, Math.round(((user.experience_years || 0) / 4) * 100)),
            sessionsCompleted: 0, sessionsTotal: 0,
          } : undefined)}
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
          <Text style={{ color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 14, lineHeight: 14 }}>⋯</Text>
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
 *  Reused profile drawer
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
    try {
      await request(`/admin/users/profile/${userId}`, { method: 'DELETE' });
      onSaved(); onClose();
    } catch { flash('Failed to delete'); }
  };

  const name = data?.name || data?.full_name || '—';
  const role = data?.category || data?.role || 'student';

  return (
    <Modal visible={!!userId} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.modalBg} onPress={onClose}>
        <Pressable style={st.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={st.modalHero}>
            <View style={{ flex: 1 }}>
              <Text style={st.modalTitle}>{name}</Text>
              <Text style={st.muted}>{role.toUpperCase()} · {data?.college || data?.company || 'No affiliation'}</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <X size={16} color={SAC.muted} />
            </Pressable>
          </View>

          <ScrollView style={{ padding: 18, maxHeight: 520 }} contentContainerStyle={{ gap: 14 }}>
            {edit ? (
              <>
                <EditRow label="Full Name" value={draft.name ?? data?.name ?? ''} onChange={(v) => setDraft((d: any) => ({ ...d, name: v }))} />
                <EditRow label="Email" value={draft.email ?? data?.email ?? ''} onChange={(v) => setDraft((d: any) => ({ ...d, email: v }))} />
                <EditRow label="Phone" value={draft.phone ?? data?.phone ?? ''} onChange={(v) => setDraft((d: any) => ({ ...d, phone: v }))} />
                <EditRow label="College / Institution" value={draft.college ?? data?.college ?? ''} onChange={(v) => setDraft((d: any) => ({ ...d, college: v }))} />
                <EditRow label="Degree / Branch" value={draft.degree ?? data?.degree ?? ''} onChange={(v) => setDraft((d: any) => ({ ...d, degree: v }))} />
                <EditRow label="Graduation Year" value={draft.graduation_year ?? data?.graduation_year ?? ''} onChange={(v) => setDraft((d: any) => ({ ...d, graduation_year: v }))} />
                <EditRow label="Career Path / Target" value={draft.career_path ?? data?.career_path ?? ''} onChange={(v) => setDraft((d: any) => ({ ...d, career_path: v }))} />
              </>
            ) : (
              <>
                <DetailRow icon={Mail} label="Email" value={data?.email || '—'} />
                <DetailRow icon={Phone} label="Phone" value={data?.phone || '—'} />
                <DetailRow icon={Building2} label="College" value={data?.college || data?.institution || '—'} />
                <DetailRow icon={GraduationCap} label="Degree & Year" value={`${data?.degree || '—'}${data?.graduation_year ? ` (Batch ${data.graduation_year})` : ''}`} />
                <DetailRow icon={Target} label="Career Path" value={data?.career_path || '—'} />
                <DetailRow icon={Clock} label="Registered On" value={data?.created_at ? new Date(data.created_at).toLocaleString() : '—'} />
                <DetailRow icon={ShieldCheck} label="Onboarding" value={data?.onboarding_completed ? 'Completed' : 'Pending'} />
              </>
            )}

            {confirmDel && (
              <View style={st.warnBox}>
                <AlertTriangle size={13} color={SAC.red} />
                <Text style={{ color: SAC.red, fontSize: 11, fontFamily: FONTS.med, flex: 1 }}>
                  Are you sure? This will delete the user account.
                </Text>
                <Pressable onPress={del} style={st.destructiveBtn}>
                  <Text style={st.btnText}>Confirm</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          <View style={[st.modalHero, { borderTopWidth: 1, borderTopColor: SAC.border, justifyContent: 'space-between' }]}>
            {!confirmDel ? (
              <SecondaryButton danger onPress={() => setConfirmDel(true)}>
                <Trash2 size={12} color={'#FCA5A5'} /><Text style={[st.secText, { color: '#FCA5A5' }]}>Delete</Text>
              </SecondaryButton>
            ) : <View />}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {edit ? (
                <>
                  <SecondaryButton onPress={() => { setEdit(false); setDraft({}); }}>
                    <Text style={st.secText}>Cancel</Text>
                  </SecondaryButton>
                  <GradientButton title="Save Changes" onPress={save} />
                </>
              ) : (
                <GradientButton title="Edit Profile" Icon={Pencil} onPress={() => setEdit(true)} />
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailRow({ icon: Icon, label, value }: any) {
  return (
    <View style={st.detailRow}>
      <Icon size={14} color={SAC.muted} />
      <Text style={st.detailLabel}>{label}</Text>
      <Text style={st.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function EditRow({ label, value, onChange }: any) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={st.detailLabel}>{label}</Text>
      <TextInput
        value={String(value || '')}
        onChangeText={onChange}
        style={st.formInput}
        placeholderTextColor={SAC.muted}
      />
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────
 *  ExportConfirmModal — Premium Confirmation Alert for CSV Downloads
 * ────────────────────────────────────────────────────────────────── */
function ExportConfirmModal({
  visible,
  onClose,
  onConfirm,
  count,
  totalCount,
  category,
  fileName,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  totalCount: number;
  category: string;
  fileName: string;
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.modalBg} onPress={onClose}>
        <Pressable style={st.exportModalCard} onPress={(e) => e.stopPropagation()}>
          {/* Top glowing amber gradient bar */}
          <LinearGradient
            colors={[GRAD.from, GRAD.to]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 4, width: '100%' }}
          />

          <View style={{ padding: 22, gap: 16 }}>
            {/* Header with glowing badge */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <View style={st.exportIconBadge}>
                <LinearGradient
                  colors={['rgba(251,146,60,0.30)', 'rgba(245,158,11,0.12)']}
                  style={st.exportIconGrad}
                >
                  <FileDown size={22} color={GRAD.to} />
                </LinearGradient>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={st.exportModalTitle}>Confirm Export</Text>
                  <Pressable
                    title="Close dialog"
                    accessibilityLabel="Close export dialog"
                    onPress={onClose}
                    style={{ padding: 4 }}
                  >
                    <X size={16} color={SAC.muted} />
                  </Pressable>
                </View>
                <Text style={st.exportModalSub}>
                  Are you sure you want to download the <Text style={{ color: '#FDBA74', fontFamily: FONTS.bold }}>{category}</Text> directory data?
                </Text>
              </View>
            </View>

            {/* Premium Info Summary Box */}
            <View style={st.exportInfoPanel}>
              <View style={st.exportInfoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Users size={13} color={GRAD.to} />
                  <Text style={st.exportInfoLabel}>Records to Export</Text>
                </View>
                <View style={st.exportCountBadge}>
                  <Text style={st.exportCountBadgeText}>{count} displayed ({totalCount} total)</Text>
                </View>
              </View>

              <View style={st.exportInfoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <FileText size={13} color={GRAD.to} />
                  <Text style={st.exportInfoLabel}>File Name</Text>
                </View>
                <Text style={st.exportInfoVal} numberOfLines={1}>{fileName}</Text>
              </View>

              <View style={st.exportInfoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <ShieldCheck size={13} color="#86EFAC" />
                  <Text style={st.exportInfoLabel}>Format & Authorization</Text>
                </View>
                <Text style={[st.exportInfoVal, { color: '#86EFAC' }]}>UTF-8 CSV · SuperAdmin</Text>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 4 }}>
                <Text style={{ color: SAC.muted, fontSize: 11, fontFamily: FONTS.med, lineHeight: 15 }}>
                  Includes: Name, Email, Phone, College, Degree, Batch, Career Track, Onboarding Progress %, and Account Status.
                </Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <SecondaryButton title="Cancel" onPress={onClose} />
              <GradientButton
                title="Download CSV"
                Icon={FileDown}
                onPress={() => {
                  onClose();
                  onConfirm();
                }}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────────────
 *  DeleteConfirmModal — Premium Confirmation Alert for Accidental Deletion
 * ────────────────────────────────────────────────────────────────── */
function DeleteConfirmModal({
  target,
  onClose,
  onConfirm,
}: {
  target: { id?: string; name?: string; count?: number; isBulk?: boolean } | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;

  const isBulk = !!target.isBulk;
  const count = target.count || 1;
  const name = target.name || 'this user account';

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.modalBg} onPress={onClose}>
        <Pressable style={st.deleteModalCard} onPress={(e) => e.stopPropagation()}>
          {/* Top glowing crimson red accent bar */}
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 4, width: '100%' }}
          />

          <View style={{ padding: 22, gap: 16 }}>
            {/* Header with warning icon */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <View style={st.deleteIconBadge}>
                <LinearGradient
                  colors={['rgba(239,68,68,0.30)', 'rgba(220,38,38,0.12)']}
                  style={st.deleteIconGrad}
                >
                  <AlertTriangle size={22} color="#EF4444" />
                </LinearGradient>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={st.deleteModalTitle}>
                    {isBulk ? 'Delete Selected Users' : 'Delete User Account'}
                  </Text>
                  <Pressable
                    title="Close dialog"
                    accessibilityLabel="Close delete confirmation dialog"
                    onPress={onClose}
                    style={{ padding: 4 }}
                  >
                    <X size={16} color={SAC.muted} />
                  </Pressable>
                </View>
                <Text style={st.deleteModalSub}>
                  {isBulk
                    ? `Are you sure you want to delete ${count} selected user account${count > 1 ? 's' : ''}?`
                    : `Are you sure you want to delete the account for `}
                  {!isBulk && (
                    <Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold }}>{name}</Text>
                  )}
                  {!isBulk ? '?' : ''}
                </Text>
              </View>
            </View>

            {/* Warning info panel */}
            <View style={st.deleteWarnPanel}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Trash2 size={14} color="#EF4444" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: '#FCA5A5', fontSize: 12, fontFamily: FONTS.bold }}>
                    Warning: Accidental Deletion Prevention
                  </Text>
                  <Text style={{ color: SAC.muted, fontSize: 11, fontFamily: FONTS.med, lineHeight: 15 }}>
                    {isBulk
                      ? `Deleting ${count} accounts will immediately remove their profiles, career tracking data, and access permissions.`
                      : `Deleting this profile will remove their records and login access from the active directory.`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <SecondaryButton title="Cancel" onPress={onClose} />
              <Pressable
                title="Confirm and delete"
                accessibilityLabel="Confirm and delete user account"
                onPress={onConfirm}
                style={st.deleteConfirmBtn}
              >
                <Trash2 size={13} color="#FFFFFF" />
                <Text style={st.deleteConfirmBtnText}>
                  {isBulk ? `Delete ${count} Users` : 'Delete Account'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.2 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 2 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  browseHead: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },

  /* View Switcher */
  viewSwitcher: {
    flexDirection: 'row',
    backgroundColor: SAC.cardSolid,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: SAC.border,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  viewModeBtnActive: {
    backgroundColor: GRAD.to,
  },
  viewModeBtnText: {
    color: SAC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11,
  },

  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    ...(Platform.OS === 'web' ? ({ display: 'grid' as any, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' as any, gap: 16 } as any) : {}),
  },
  gridCell: { minWidth: 320, flexBasis: 320, flexGrow: 1 },

  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toggleBtnText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },

  /* Data Table Styles */
  tableHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251,146,60,0.15)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  thText: {
    color: '#FDBA74',
    fontFamily: FONTS.xbold,
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'background-color 0.15s ease' } as any) : {}),
  },
  tableRowHover: {
    backgroundColor: 'rgba(251,146,60,0.06)',
  },
  tableRowSelected: {
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  tableAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#26170B',
    borderWidth: 1,
    borderColor: GRAD.to,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableAvatarText: {
    color: '#FDBA74',
    fontFamily: FONTS.xbold,
    fontSize: 11,
  },
  tableName: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 12.5,
  },
  tableEmail: {
    color: SAC.muted,
    fontFamily: FONTS.med,
    fontSize: 11,
  },
  tableCellText: {
    color: '#E2E8F0',
    fontFamily: FONTS.med,
    fontSize: 12,
  },
  careerPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(251,146,60,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.25)',
  },
  careerPillText: {
    color: '#FDBA74',
    fontFamily: FONTS.bold,
    fontSize: 10.5,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusActive: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.35)',
  },
  statusInactive: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.35)',
  },
  statusArchived: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  statusBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10.5,
  },
  tableActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: GRAD.to,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  tableActionBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  tableIconBtn: {
    padding: 5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  /* Card overflow menu */
  menuTrigger: {
    position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: SAC.panel2, borderColor: 'rgba(251,146,60,0.25)', borderWidth: 1,
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
  menuLabel: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12 },

  /* selection */
  selectBox: {
    position: 'absolute', top: 14, left: 14, width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: SAC.panel2, borderColor: 'rgba(251,146,60,0.25)', borderWidth: 1,
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
  bulkText: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 13 },
  bulkLinkBtn: { ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  bulkLink: { color: GRAD.to, fontFamily: FONTS.bold, fontSize: 12 },
  bulkClose: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  /* modal */
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
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border },
  modalTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 15 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5, width: 130 },
  detailValue: { color: '#F4F4FA', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  formInput: {
    flex: 1, color: '#F4F4FA', fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 9,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  destructiveBtn: { backgroundColor: SAC.red, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)' },
  btnText: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 12 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 14 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SAC.card, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  pageBtnText: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12 },
  pageInfo: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },

  /* Premium Export Modal */
  exportModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#160D04',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.35)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 24px 70px rgba(0,0,0,0.85), 0 0 0 1px rgba(251,146,60,0.15)',
    } as any) : {}),
  },
  exportIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.40)',
  },
  exportIconGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportModalTitle: {
    color: '#FFFFFF',
    fontFamily: FONTS.xbold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  exportModalSub: {
    color: SAC.muted,
    fontFamily: FONTS.med,
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 17,
  },
  exportInfoPanel: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.18)',
    padding: 14,
    gap: 10,
  },
  exportInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exportInfoLabel: {
    color: SAC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11.5,
  },
  exportInfoVal: {
    color: '#F4F4FA',
    fontFamily: FONTS.bold,
    fontSize: 11.5,
  },
  exportCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(251,146,60,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.30)',
  },
  exportCountBadgeText: {
    color: '#FDBA74',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },

  /* Premium Delete Modal */
  deleteModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#160B0B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 24px 70px rgba(0,0,0,0.85), 0 0 0 1px rgba(239,68,68,0.15)',
    } as any) : {}),
  },
  deleteIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.40)',
  },
  deleteIconGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalTitle: {
    color: '#FFFFFF',
    fontFamily: FONTS.xbold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  deleteModalSub: {
    color: SAC.muted,
    fontFamily: FONTS.med,
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 17,
  },
  deleteWarnPanel: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    padding: 14,
  },
  deleteConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.15s ease' } as any) : {}),
  },
  deleteConfirmBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 12.5,
  },

  /* Action Tooltips */
  customTooltip: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
    backgroundColor: '#1A0E04',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.40)',
    zIndex: 99999,
    minWidth: 40,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 8px 22px rgba(0,0,0,0.85), 0 0 0 1px rgba(251,146,60,0.18)',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      userSelect: 'none',
    } as any) : {}),
  },
  tooltipTop: {
    bottom: '100%',
    marginBottom: 7,
  },
  tooltipBottom: {
    top: '100%',
    marginTop: 7,
  },
  customTooltipText: {
    color: '#FDBA74',
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
