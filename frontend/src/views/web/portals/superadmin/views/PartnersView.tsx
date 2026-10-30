/**
 * Super Admin → Partners view (Phase A).
 *
 * Manages "Sponsored Collaboration Partners" that show up on the public
 * landing page and the dashboard footer sponsor strip on every portal.
 *
 *   API base:  /api/admin/partners  (CRUD)
 *              /api/admin/partners/reorder  (bulk reorder)
 *              /api/landing/partners        (public read — consumed by SponsorStrip)
 *
 * UX:
 *   • Card grid with logo preview, category badge, active toggle.
 *   • Up / Down arrow reorder (always reliable on Expo Web).
 *   • Native HTML-5 drag-and-drop reorder on web (parallel feature).
 *   • Add / Edit modal with Base64 logo upload (web file picker).
 *   • Delete with inline confirm.
 *   • Warm-amber gradient identity matching the rest of Super Admin.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Platform, Image,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Handshake, Plus, X, Upload, ArrowUp, ArrowDown,
  GraduationCap, Building2, Sparkles, GripVertical,
  ImagePlus, RefreshCw, Search,
} from 'lucide-react-native';
import { SAC, FONTS, resolveColors } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  TopTabs, SearchField, StatusPill, Toast, useToast, EmptyState, LoadingBox,
} from '../applekit';
import { request, resolveImageUrl } from '@/src/models/services/api';
import { useSubTab } from '@/src/views/web/portals/portalUrl';
import {
  crud, useThemedCrudStyles, RowActions, DeleteConfirmBar, CheckToggle, EditorModal, useWebImageInput,
} from './shared/adminCrud';

/* ────────────────────────────────────────────────────────────────────
 * Types & constants
 * ────────────────────────────────────────────────────────────────── */
type PartnerCategory = 'college' | 'company' | 'sponsor';

type Partner = {
  id: string;
  name: string;
  category: PartnerCategory;
  logo_url: string;
  logo_white_url?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

const CAT_META: Record<PartnerCategory, { label: string; color: string; Icon: any }> = {
  college: { label: 'Academic',       color: '#60A5FA', Icon: GraduationCap },
  company: { label: 'Collaboration',  color: '#3B82F6', Icon: Building2 },
  sponsor: { label: 'Sponsor',        color: '#F59E0B', Icon: Sparkles },
};

const TAB_OPTIONS = [
  { id: 'all',     label: 'All' },
  { id: 'college', label: 'Academic' },
  { id: 'company', label: 'Collaboration' },
  { id: 'sponsor', label: 'Sponsor' },
] as const;
type TabId = (typeof TAB_OPTIONS)[number]['id'];

/* ────────────────────────────────────────────────────────────────────
 * Root
 * ────────────────────────────────────────────────────────────────── */
export function PartnersView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const T = useThemedCrudStyles();
  Object.assign(s, resolveColors(s, T));
  const { toast, flash, hide } = useToast();
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useSubTab<TabId>(['all', 'college', 'company', 'sponsor'], 'all', { sub, onSub });
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partner | null>(null);   // null = no modal; {} = create
  const [creating, setCreating] = useState(false);

  /* ── Load ── */
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await request<{ items: Partner[] }>('/admin/partners');
      setPartners((r.items || []).slice().sort((a, b) => a.display_order - b.display_order));
    } catch (e) {
      console.warn('Partners load failed', e);
      setPartners([]);
    } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    let list = partners || [];
    if (tab !== 'all') list = list.filter((p) => p.category === tab);
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(k));
    }
    return list;
  }, [partners, tab, q]);

  /* ── Optimistic helpers ── */
  const replaceLocal = (next: Partner) => {
    setPartners((cur) => (cur || []).map((p) => (p.id === next.id ? next : p)));
  };
  const removeLocal = (id: string) => {
    setPartners((cur) => (cur || []).filter((p) => p.id !== id));
  };

  /* ── Persist reorder (uses the FULL ordered list to avoid drift) ── */
  const persistReorder = async (orderedIds: string[]) => {
    try {
      await request('/admin/partners/reorder', {
        method: 'POST',
        body: { ordered_ids: orderedIds },
      });
      flash('Order saved');
    } catch (e) {
      flash('Reorder failed');
      load();
    }
  };

  const moveBy = (idx: number, delta: -1 | 1) => {
    if (!partners) return;
    const list = partners.slice();
    const target = idx + delta;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    // Reassign display_order locally
    list.forEach((p, i) => { p.display_order = (i + 1) * 10; });
    setPartners(list);
    persistReorder(list.map((p) => p.id));
  };

  const moveTo = (sourceId: string, targetId: string) => {
    if (!partners || sourceId === targetId) return;
    const list = partners.slice();
    const src = list.findIndex((p) => p.id === sourceId);
    const tgt = list.findIndex((p) => p.id === targetId);
    if (src < 0 || tgt < 0) return;
    const [moved] = list.splice(src, 1);
    list.splice(tgt, 0, moved);
    list.forEach((p, i) => { p.display_order = (i + 1) * 10; });
    setPartners(list);
    persistReorder(list.map((p) => p.id));
  };

  /* ── Toggle active ── */
  const toggleActive = async (p: Partner) => {
    const next = { ...p, is_active: !p.is_active };
    replaceLocal(next);
    try {
      await request(`/admin/partners/${p.id}`, {
        method: 'PATCH',
        body: { is_active: next.is_active },
      });
      flash(next.is_active ? 'Activated' : 'Deactivated');
    } catch {
      replaceLocal(p);
      flash('Failed to update');
    }
  };

  /* ── Delete ── */
  const remove = async (id: string) => {
    const backup = partners;
    removeLocal(id);
    try {
      await request(`/admin/partners/${id}`, { method: 'DELETE' });
      flash('Partner deleted');
    } catch {
      setPartners(backup);
      flash('Delete failed');
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Header */}
      <Card>
        <View style={crud.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <IconBox size={38}><Handshake size={18} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={crud.title}>Collaboration Partners</Text>
              <Text style={crud.sub}>
                Logos displayed on the public landing page and the dashboard footer of
                every portal. Reorder using arrows or drag-and-drop, toggle visibility,
                or upload new partners with Base64 logos.
              </Text>
            </View>
          </View>
          <GradientButton onPress={() => { setEditing({} as Partner); setCreating(true); }}>
            <Plus size={13} color="#fff" />
            <Text style={crud.btnText}>Add partner</Text>
          </GradientButton>
        </View>
      </Card>

      {/* Filters */}
      <Card>
        <View style={crud.filtersRow}>
          <TopTabs<TabId>
            tabs={TAB_OPTIONS as any}
            active={tab}
            onChange={setTab}
          />
          <SearchField value={q} onChange={setQ} placeholder="Search by name…" width={280} />
          <Pressable onPress={load} style={crud.refreshBtn}>
            <RefreshCw size={11} color={SAC.muted} />
            <Text style={crud.refreshText}>Refresh</Text>
          </Pressable>
        </View>
      </Card>

      {/* List */}
      {busy && !partners ? (
        <LoadingBox />
      ) : (filtered.length === 0) ? (
        <EmptyState
          icon={Handshake}
          title="No partners yet"
          sub={q || tab !== 'all'
            ? 'No partners match the current filter. Try a different category or clear the search.'
            : 'Click "Add partner" to upload your first collaboration logo. It will appear instantly on the landing page and dashboard footers.'}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((p, idx) => {
            // For drag-drop we need the GLOBAL index in `partners`, not the
            // filtered list, so reorder works correctly with category filters.
            const globalIdx = (partners || []).findIndex((x) => x.id === p.id);
            return (
              <PartnerRow
                key={p.id}
                partner={p}
                globalIdx={globalIdx}
                totalCount={(partners || []).length}
                onMoveUp={() => moveBy(globalIdx, -1)}
                onMoveDown={() => moveBy(globalIdx, 1)}
                onMoveTo={moveTo}
                onEdit={() => { setEditing(p); setCreating(false); }}
                onToggleActive={() => toggleActive(p)}
                onDelete={() => remove(p.id)}
                canFilter={tab !== 'all' || !!q.trim()}
              />
            );
          })}
        </View>
      )}

      {/* Create / Edit modal */}
      {editing && (
        <PartnerEditor
          initial={editing}
          isCreate={creating}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={(p, mode) => {
            if (mode === 'created') {
              setPartners((cur) => [...(cur || []), p]
                .sort((a, b) => a.display_order - b.display_order));
              flash('Partner added');
            } else {
              replaceLocal(p);
              flash('Partner updated');
            }
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  PARTNER ROW
 * ══════════════════════════════════════════════════════════════════ */
function PartnerRow({
  partner, globalIdx, totalCount,
  onMoveUp, onMoveDown, onMoveTo,
  onEdit, onToggleActive, onDelete, canFilter,
}: {
  partner: Partner;
  globalIdx: number;
  totalCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveTo: (sourceId: string, targetId: string) => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  canFilter: boolean;
}) {
  const cat = CAT_META[partner.category];
  const Icon = cat.Icon;
  const [confirmDel, setConfirmDel] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Drag-drop only on web — disable when filtering (would be confusing)
  const dragHandlers = (Platform.OS === 'web' && !canFilter) ? {
    draggable: true,
    onDragStart: (e: any) => {
      e.dataTransfer.setData('partner-id', partner.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e: any) => { e.preventDefault(); setDragOver(true); },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: any) => {
      e.preventDefault();
      setDragOver(false);
      const sourceId = e.dataTransfer.getData('partner-id');
      if (sourceId && sourceId !== partner.id) {
        onMoveTo(sourceId, partner.id);
      }
    },
  } as any : {};

  return (
    <Animated.View entering={FadeIn.duration(160)}>
      <View
        // @ts-ignore — web-only DnD props
        {...dragHandlers}
        style={[
          s.row,
          !partner.is_active && s.rowInactive,
          dragOver && s.rowDragOver,
        ]}
      >
        {/* Drag handle (web only) */}
        {Platform.OS === 'web' && !canFilter && (
          <View style={s.handle}>
            <GripVertical size={14} color={SAC.dim} />
          </View>
        )}

        {/* Order pill */}
        <View style={crud.orderPill}>
          <Text style={crud.orderText}>{globalIdx + 1}</Text>
        </View>

        {/* Up / Down arrows */}
        <View style={s.arrowCol}>
          <Pressable
            onPress={onMoveUp}
            disabled={globalIdx === 0}
            style={[s.arrowBtn, globalIdx === 0 && s.arrowBtnDisabled]}
          >
            <ArrowUp size={12} color={globalIdx === 0 ? SAC.dim : SAC.muted} />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={globalIdx === totalCount - 1}
            style={[s.arrowBtn, globalIdx === totalCount - 1 && s.arrowBtnDisabled]}
          >
            <ArrowDown size={12} color={globalIdx === totalCount - 1 ? SAC.dim : SAC.muted} />
          </Pressable>
        </View>

        {/* Logo */}
        <View style={s.logoBox}>
          {partner.logo_url ? (
            <Image source={{ uri: resolveImageUrl(partner.logo_url) }} style={s.logoImg} resizeMode="contain" />
          ) : (
            <ImagePlus size={18} color={SAC.dim} />
          )}
        </View>

        {/* Name + category */}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={s.name} numberOfLines={1}>{partner.name}</Text>
          <View style={s.metaLine}>
            <View style={[s.catBadge, { backgroundColor: cat.color + '22', borderColor: cat.color + '55' }]}>
              <Icon size={10} color={cat.color} />
              <Text style={[s.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            {partner.is_active ? (
              <StatusPill kind="success" label="Live" dot />
            ) : (
              <StatusPill kind="warn" label="Hidden" />
            )}
          </View>
        </View>

        {/* Toggle active / Edit / Delete */}
        <RowActions
          active={!!partner.is_active}
          onToggle={onToggleActive}
          onEdit={onEdit}
          onRequestDelete={() => setConfirmDel(true)}
          onLabel="Visible"
          offLabel="Hidden"
        />
      </View>

      {/* Inline delete confirm */}
      {confirmDel && (
        <DeleteConfirmBar
          name={partner.name}
          onCancel={() => setConfirmDel(false)}
          onConfirm={() => { setConfirmDel(false); onDelete(); }}
        />
      )}
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  PARTNER EDITOR (Add / Edit modal)
 * ══════════════════════════════════════════════════════════════════ */
function PartnerEditor({
  initial, isCreate, onClose, onSaved,
}: {
  initial: Partner;
  isCreate: boolean;
  onClose: () => void;
  onSaved: (p: Partner, mode: 'created' | 'updated') => void;
}) {
  const [form, setForm] = useState<{
    name: string;
    category: PartnerCategory;
    logo_url: string;
    logo_white_url: string;
    display_order: number;
    is_active: boolean;
  }>({
    name: initial?.name || '',
    category: (initial?.category as PartnerCategory) || 'company',
    logo_url: initial?.logo_url || '',
    logo_white_url: initial?.logo_white_url || '',
    display_order: initial?.display_order ?? 100,
    is_active: initial?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorFileRef = useRef<any>(null);
  const whiteFileRef = useRef<any>(null);

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Web file picker hookup
  useWebImageInput(
    [
      { ref: colorFileRef, onDataUri: (uri) => update('logo_url', uri) },
      { ref: whiteFileRef, onDataUri: (uri) => update('logo_white_url', uri) },
    ],
    setError,
    { type: 'Please choose an image file (PNG, JPG, SVG)', size: 'Logo must be under 2 MB' },
  );

  const submit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.logo_url)    { setError('Logo is required'); return; }
    setBusy(true); setError(null);
    try {
      const payload: any = {
        name: form.name.trim(),
        category: form.category,
        logo_url: form.logo_url,
        logo_white_url: form.logo_white_url || null,
        display_order: form.display_order || 100,
        is_active: form.is_active,
      };
      let saved: Partner;
      if (isCreate) {
        saved = await request<Partner>('/admin/partners', { method: 'POST', body: payload });
        onSaved(saved, 'created');
      } else {
        saved = await request<Partner>(`/admin/partners/${initial.id}`, { method: 'PATCH', body: payload });
        onSaved(saved, 'updated');
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally { setBusy(false); }
  };

  return (
    <EditorModal
      Icon={Handshake}
      title={isCreate ? 'Add collaboration partner' : 'Edit partner'}
      subtitle={isCreate ? 'Upload a logo and choose the category — it will appear instantly on the public landing page.' : 'Update the partner details.'}
      onClose={onClose}
      maxWidth={640}
      bodyMaxHeight={560}
      error={error}
      busy={busy}
      submitLabel={isCreate ? 'Add partner' : 'Save changes'}
      onSubmit={submit}
    >
            {/* Name */}
            <View>
              <SectionLabel>PARTNER NAME</SectionLabel>
              <TextInput
                value={form.name}
                onChangeText={(v) => update('name', v)}
                placeholder="e.g. Acme University, Bright Pvt Ltd"
                placeholderTextColor={SAC.dim}
                style={[crud.input, { marginTop: 8 }]}
              />
            </View>

            {/* Category picker */}
            <View>
              <SectionLabel>CATEGORY</SectionLabel>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {(['college', 'company', 'sponsor'] as PartnerCategory[]).map((c) => {
                  const m = CAT_META[c];
                  const Icon = m.Icon;
                  const active = form.category === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => update('category', c)}
                      style={[
                        s.catPick,
                        active && {
                          borderColor: m.color,
                          backgroundColor: m.color + '22',
                        },
                      ]}
                    >
                      <Icon size={13} color={active ? m.color : SAC.muted} />
                      <Text style={[s.catPickText, active && { color: m.color }]}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Color logo */}
            <View>
              <SectionLabel>COLOR LOGO (required)</SectionLabel>
              <LogoPicker
                value={form.logo_url}
                onPick={() => colorFileRef.current?.click?.()}
                onClear={() => update('logo_url', '')}
                hint="Used on the landing page sponsor strip — color background recommended."
              />
              {Platform.OS === 'web' && (
                // @ts-ignore native input
                <input ref={colorFileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }} />
              )}
            </View>

            {/* White/inverted logo (optional) */}
            <View>
              <SectionLabel>WHITE / INVERTED LOGO (optional)</SectionLabel>
              <LogoPicker
                value={form.logo_white_url}
                onPick={() => whiteFileRef.current?.click?.()}
                onClear={() => update('logo_white_url', '')}
                hint="Used on the dark dashboard footer strip. If empty, the color logo is auto-inverted."
                dark
              />
              {Platform.OS === 'web' && (
                // @ts-ignore native input
                <input ref={whiteFileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }} />
              )}
            </View>

            {/* Display order & Active */}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}>
                <SectionLabel>DISPLAY ORDER</SectionLabel>
                <TextInput
                  value={String(form.display_order)}
                  onChangeText={(v) => update('display_order', parseInt(v) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor={SAC.dim}
                  style={[crud.input, { marginTop: 8 }]}
                />
                <Text style={[crud.muted, { marginTop: 4 }]}>Lower numbers appear first. (You can drag to reorder after saving.)</Text>
              </View>
              <View style={{ flex: 1, minWidth: 160 }}>
                <SectionLabel>VISIBILITY</SectionLabel>
                <CheckToggle
                  value={form.is_active}
                  onToggle={() => update('is_active', !form.is_active)}
                  label={form.is_active ? 'Visible on landing & footer' : 'Hidden (saved but not shown publicly)'}
                  style={{ marginTop: 8 }}
                />
              </View>
            </View>
    </EditorModal>
  );
}

function LogoPicker({
  value, onPick, onClear, hint, dark,
}: {
  value?: string;
  onPick: () => void;
  onClear: () => void;
  hint: string;
  dark?: boolean;
}) {
  return (
    <View style={{ marginTop: 8, gap: 8 }}>
      {value ? (
        <View style={[s.logoPreview, dark && s.logoPreviewDark]}>
          <Image source={{ uri: value }} style={s.logoPreviewImg} resizeMode="contain" />
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text style={crud.muted}>Logo uploaded · {Math.round((value.length / 1000))} KB (base64)</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <SecondaryButton size="sm" onPress={onPick}>
                <Upload size={11} color={SAC.muted} />
                <Text style={crud.secText}>Replace</Text>
              </SecondaryButton>
              <SecondaryButton size="sm" danger onPress={onClear}>
                <X size={11} color="#FCA5A5" />
                <Text style={[crud.secText, { color: '#FCA5A5' }]}>Remove</Text>
              </SecondaryButton>
            </View>
          </View>
        </View>
      ) : (
        <Pressable onPress={onPick} style={[s.logoDrop, dark && s.logoDropDark]}>
          <View style={s.logoDropIcon}>
            <ImagePlus size={18} color={GRAD.to} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.logoDropTitle}>Click to upload</Text>
            <Text style={crud.muted}>{hint}</Text>
            <Text style={[crud.muted, { marginTop: 2 }]}>PNG · JPG · SVG · max 2 MB</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Styles
 * ────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({

  /* row */
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12,
    ...(Platform.OS === 'web' ? ({ transitionDuration: '160ms' } as any) : {}),
  },
  rowInactive: { opacity: 0.62, backgroundColor: 'rgba(255,255,255,0.02)' },
  rowDragOver: { borderColor: GRAD.to, backgroundColor: 'rgba(245,158,11,0.06)' },

  handle: {
    width: 18, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'grab' } as any) : {}),
  },

  arrowCol: { gap: 3 },
  arrowBtn: {
    width: 22, height: 18, borderRadius: 6,
    backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  arrowBtnDisabled: { opacity: 0.4, ...(Platform.OS === 'web' ? ({ cursor: 'not-allowed' } as any) : {}) },

  logoBox: {
    width: 78, height: 44, borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  logoImg: { width: '100%', height: '100%' },

  name: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 13.5 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start',
  },
  catBadgeText: { fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.3 },

  /* modal */

  catPick: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  catPickText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },

  /* logo picker */
  logoDrop: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
    borderColor: SAC.border2, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  logoDropDark: { backgroundColor: SAC.panel2 },
  logoDropIcon: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  logoDropTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 13 },

  logoPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, borderWidth: 1,
    borderColor: SAC.border, backgroundColor: '#fff',
  },
  logoPreviewDark: { backgroundColor: '#0a0f1e', borderColor: SAC.border2 },
  logoPreviewImg: { width: 110, height: 50 },
});
