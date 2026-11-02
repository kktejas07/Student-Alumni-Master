/**
 * Super Admin → Partners view.
 *
 * Manages "Sponsored Collaboration Partners" that show up on the public
 * landing page and the dashboard footer sponsor strip on every portal.
 *
 *   API base:  /api/admin/partners  (CRUD)
 *              /api/admin/partners/reorder  (bulk reorder)
 *              /api/admin/partners/import/preview + /commit  (PT7 CSV import)
 *              /api/admin/partners/{id}/analytics  (PT5 30-day trend)
 *              /api/landing/partners        (public read — consumed by SponsorStrip)
 *
 * UX:
 *   • KPI summary tiles (PT1): active, inactive, by category.
 *   • Card grid with logo preview, category badge, tier badge, active toggle.
 *   • Up / Down arrow reorder (always reliable on Expo Web) + drag-and-drop.
 *   • Website link (PT2), white-logo upload (PT3), tier picker (PT4),
 *     contract dates with remaining-days badge (PT6), per-card analytics bar (PT5).
 *   • Add / Edit modal with Base64 logo upload (web file picker).
 *   • Bulk CSV import with preview-then-commit + duplicate detection (PT7).
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
  ImagePlus, RefreshCw, ExternalLink, Award,
  UploadCloud, Download, FileText,
} from 'lucide-react-native';
import { SAC, FONTS, resolveColors } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  TopTabs, SearchField, StatusPill, Toast, useToast, EmptyState, LoadingBox,
} from '../applekit';
import { KpiCard, Badge } from '../atoms';
import { request, resolveImageUrl } from '@/src/models/services/api';
import { useSubTab } from '@/src/views/web/portals/portalUrl';
import {
  crud, useThemedCrudStyles, RowActions, DeleteConfirmBar, CheckToggle, EditorModal, useWebImageInput,
} from './shared/adminCrud';

/* ────────────────────────────────────────────────────────────────────
 * Types & constants
 * ────────────────────────────────────────────────────────────────── */
type PartnerCategory = 'college' | 'company' | 'sponsor';
type PartnerTier = 'gold' | 'silver' | 'bronze' | 'standard';

type Partner = {
  id: string;
  name: string;
  category: PartnerCategory;
  logo_url: string;
  logo_white_url?: string | null;
  website_url?: string | null;
  tier?: PartnerTier;
  contract_start?: string | null;
  contract_end?: string | null;
  display_order: number;
  is_active: boolean;
  analytics?: { impressions: number; clicks: number };
  created_at?: string | null;
  updated_at?: string | null;
};

const CAT_META: Record<PartnerCategory, { label: string; color: string; Icon: any }> = {
  college: { label: 'Academic',       color: '#60A5FA', Icon: GraduationCap },
  company: { label: 'Collaboration',  color: '#3B82F6', Icon: Building2 },
  sponsor: { label: 'Sponsor',        color: '#F59E0B', Icon: Sparkles },
};

const TIER_META: Record<PartnerTier, { label: string; color: string; Icon: any }> = {
  gold:     { label: 'Gold',     color: '#F5C518', Icon: Award },
  silver:   { label: 'Silver',   color: '#C0C7D4', Icon: Award },
  bronze:   { label: 'Bronze',   color: '#C88B5A', Icon: Award },
  standard: { label: 'Standard', color: '#8b93a7', Icon: Award },
};

const TAB_OPTIONS = [
  { id: 'all',     label: 'All' },
  { id: 'college', label: 'Academic' },
  { id: 'company', label: 'Collaboration' },
  { id: 'sponsor', label: 'Sponsor' },
] as const;
type TabId = (typeof TAB_OPTIONS)[number]['id'];

/* Remaining-days badge for contract end (PT6): red <7d, amber <30d, gray otherwise. */
function contractDays(p: Partner): { days: number; color: string; label: string } | null {
  if (!p.contract_end) return null;
  const end = new Date(p.contract_end);
  if (Number.isNaN(end.getTime())) return null;
  const msPerDay = 86_400_000;
  const days = Math.ceil((end.getTime() - Date.now()) / msPerDay);
  if (days < 0)   return { days, color: '#F87171', label: `Expired ${Math.abs(days)}d ago` };
  if (days === 0) return { days, color: '#F87171', label: 'Ends today' };
  if (days < 7)   return { days, color: '#F87171', label: `${days}d left` };
  if (days < 30)  return { days, color: '#F59E0B', label: `${days}d left` };
  return { days, color: '#8b93a7', label: `ends ${p.contract_end}` };
}

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
  const [importOpen, setImportOpen] = useState(false);

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

  /* ── PT1: KPI tiles ── */
  const kpis = useMemo(() => {
    const all = partners || [];
    const active = all.filter((p) => p.is_active);
    const byCat: Record<string, number> = {};
    for (const p of active) byCat[p.category] = (byCat[p.category] || 0) + 1;
    return {
      total: all.length,
      active: active.length,
      inactive: all.length - active.length,
      academic: byCat.college || 0,
      collaboration: byCat.company || 0,
      sponsor: byCat.sponsor || 0,
    };
  }, [partners]);

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
                every portal. Reorder, tier, link, contract dates and analytics are all managed here.
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SecondaryButton onPress={() => setImportOpen(true)}>
              <UploadCloud size={13} color={SAC.muted} />
              <Text style={crud.secText}>Import CSV</Text>
            </SecondaryButton>
            <GradientButton onPress={() => { setEditing({} as Partner); setCreating(true); }}>
              <Plus size={13} color="#fff" />
              <Text style={crud.btnText}>Add partner</Text>
            </GradientButton>
          </View>
        </View>
      </Card>

      {/* PT1: KPI tiles */}
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard Icon={Handshake} label="Active" value={String(kpis.active)} delta={`${kpis.total} total partners`} color="green" />
        <KpiCard Icon={Handshake} label="Hidden" value={String(kpis.inactive)} delta="saved, not public" color="amber" />
        <KpiCard Icon={GraduationCap} label="Academic" value={String(kpis.academic)} delta="active partners" color="blue" />
        <KpiCard Icon={Building2} label="Collaboration" value={String(kpis.collaboration)} delta="active partners" color="purple" />
        <KpiCard Icon={Sparkles} label="Sponsors" value={String(kpis.sponsor)} delta="active partners" color="amber" />
      </View>

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
            : 'Click "Add partner" to upload your first collaboration logo, or "Import CSV" to bring in a batch.'}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((p, idx) => {
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

      {/* PT7: CSV import modal */}
      {importOpen && (
        <CsvImportModal
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); load(); }}
          flash={flash}
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
  const tier = TIER_META[partner.tier || 'standard'] || TIER_META.standard;
  const [confirmDel, setConfirmDel] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [trend, setTrend] = useState<Analytics | null>(null);
  const daysLeft = contractDays(partner);
  const a = partner.analytics || { impressions: 0, clicks: 0 };
  const ctr = a.impressions ? Math.round((a.clicks / a.impressions) * 100) : 0;

  const loadTrend = useCallback(async () => {
    if (showTrend || trend) { setShowTrend(false); return; }
    setShowTrend(true);
    try {
      const r = await request<Analytics>(`/admin/partners/${partner.id}/analytics`);
      setTrend(r);
    } catch {
      setShowTrend(false);
    }
  }, [showTrend, trend, partner.id]);

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
      if (sourceId && sourceId !== partner.id) onMoveTo(sourceId, partner.id);
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
          (partner.tier === 'gold') && s.rowGold,
        ]}
      >
        {/* Drag handle (web only) */}
        {Platform.OS === 'web' && !canFilter && (
          <View style={s.handle}><GripVertical size={14} color={SAC.dim} /></View>
        )}

        {/* Order pill */}
        <View style={crud.orderPill}>
          <Text style={crud.orderText}>{globalIdx + 1}</Text>
        </View>

        {/* Up / Down arrows */}
        <View style={s.arrowCol}>
          <Pressable onPress={onMoveUp} disabled={globalIdx === 0}
            style={[s.arrowBtn, globalIdx === 0 && s.arrowBtnDisabled]}>
            <ArrowUp size={12} color={globalIdx === 0 ? SAC.dim : SAC.muted} />
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={globalIdx === totalCount - 1}
            style={[s.arrowBtn, globalIdx === totalCount - 1 && s.arrowBtnDisabled]}>
            <ArrowDown size={12} color={globalIdx === totalCount - 1 ? SAC.dim : SAC.muted} />
          </Pressable>
        </View>

        {/* Logo — gold renders larger (PT4) */}
        <View style={[(partner.tier === 'gold') ? s.logoBoxGold : s.logoBox]}>
          {partner.logo_url ? (
            <Image source={{ uri: resolveImageUrl(partner.logo_url) }} style={s.logoImg} resizeMode="contain" />
          ) : (
            <ImagePlus size={18} color={SAC.dim} />
          )}
        </View>

        {/* Name + badges */}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={s.nameLine}>
            <Text style={s.name} numberOfLines={1}>{partner.name}</Text>
            {/* PT4 tier badge */}
            <View style={[s.tierBadge, { backgroundColor: tier.color + '1f', borderColor: tier.color + '55' }]}>
              {(() => { const TIcon = tier.Icon; return <TIcon size={9} color={tier.color} />; })()}
              <Text style={[s.tierBadgeText, { color: tier.color }]}>{tier.label}</Text>
            </View>
            {/* PT2 website link */}
            {!!partner.website_url && (
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.open(partner.website_url, '_blank', 'noopener,noreferrer');
                  }
                }}
                style={s.webLink}
              >
                <ExternalLink size={12} color={SAC.muted} />
                <Text style={s.webLinkText} numberOfLines={1}>{partner.website_url.replace(/^https?:\/\//, '')}</Text>
              </Pressable>
            )}
          </View>
          <View style={s.metaLine}>
            <View style={[s.catBadge, { backgroundColor: cat.color + '22', borderColor: cat.color + '55' }]}>
              <Icon size={10} color={cat.color} />
              <Text style={[s.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            {/* PT6 remaining-days badge */}
            {daysLeft && daysLeft.days <= 30 && (
              <View style={[s.catBadge, { backgroundColor: daysLeft.color + '1f', borderColor: daysLeft.color + '55' }]}>
                <Text style={[s.catBadgeText, { color: daysLeft.color }]}>{daysLeft.label}</Text>
              </View>
            )}
            {partner.is_active ? (
              <StatusPill kind="success" label="Live" dot />
            ) : (
              <StatusPill kind="warn" label="Hidden" />
            )}
          </View>
        </View>

        {/* PT5 mini analytics bar */}
        <View style={s.analyticsBox}>
          <Pressable onPress={loadTrend} style={s.analytics}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={s.anRow}>
                <Text style={s.anLabel}>Imp</Text>
                <Text style={s.anValue}>{a.impressions}</Text>
                <Text style={s.anMuted}>{a.clicks} clk · {ctr}% ctr</Text>
              </View>
              {showTrend && trend && (
                <View style={s.anBarRow}>
                  {(trend.series || []).slice(-14).map((pt, i) => {
                    const max = Math.max(1, ...trend.series.map((x) => Math.max(x.impressions, x.clicks)));
                    const h = Math.max(2, Math.round(((pt.impressions + pt.clicks) / max) * 18));
                    return <View key={i} style={[s.anBar, { height: h, opacity: i / Math.max(1, (trend.series || []).length - 1) || 1 }]} />;
                  })}
                </View>
              )}
            </View>
            <Text style={s.anMore}>{showTrend ? '30d ✓' : 'trend'}</Text>
          </Pressable>
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

type Analytics = {
  series: { day: string; impressions: number; clicks: number }[];
  impressions: number;
  clicks: number;
};

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
    tier: PartnerTier;
    logo_url: string;
    logo_white_url: string;
    website_url: string;
    contract_start: string;
    contract_end: string;
    display_order: number;
    is_active: boolean;
  }>({
    name: initial?.name || '',
    category: (initial?.category as PartnerCategory) || 'company',
    tier: (initial?.tier as PartnerTier) || 'standard',
    logo_url: initial?.logo_url || '',
    logo_white_url: initial?.logo_white_url || '',
    website_url: initial?.website_url || '',
    contract_start: initial?.contract_start || '',
    contract_end: initial?.contract_end || '',
    display_order: initial?.display_order ?? 100,
    is_active: initial?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorFileRef = useRef<any>(null);
  const whiteFileRef = useRef<any>(null);

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

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
    if (form.website_url && !/^https?:\/\//i.test(form.website_url.trim())) {
      setError('Website URL must start with http:// or https://');
      return;
    }
    if (form.contract_start && form.contract_end && form.contract_start > form.contract_end) {
      setError('Contract end must be after the start date');
      return;
    }
    setBusy(true); setError(null);
    try {
      const payload: any = {
        name: form.name.trim(),
        category: form.category,
        tier: form.tier,
        logo_url: form.logo_url,
        logo_white_url: form.logo_white_url || null,
        website_url: form.website_url.trim() || null,
        contract_start: form.contract_start || null,
        contract_end: form.contract_end || null,
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

  const dateInput = (value: string, onV: (v: string) => void, label: string) => (
    Platform.OS === 'web' ? (
      // @ts-ignore native input
      <input
        type="date"
        value={value}
        onChange={(e: any) => onV(e.target.value)}
        style={{ ...s.dateInput, color: '#F4F4FA', background: SAC.cardSolid, border: `1px solid ${SAC.border}`, borderRadius: 8, padding: '8px 10px', marginTop: 8, width: '100%' }}
      />
    ) : (
      <TextInput value={value} onChangeText={onV} placeholder={label} placeholderTextColor={SAC.dim} style={[crud.input, { marginTop: 8 }]} />
    )
  );

  return (
    <EditorModal
      Icon={Handshake}
      title={isCreate ? 'Add collaboration partner' : 'Edit partner'}
      subtitle={isCreate ? 'Upload a logo, choose a tier & category, and set a website link and contract dates.' : 'Update the partner details.'}
      onClose={onClose}
      maxWidth={640}
      bodyMaxHeight={600}
      error={error}
      busy={busy}
      submitLabel={isCreate ? 'Add partner' : 'Save changes'}
      onSubmit={submit}
    >
      {/* Name */}
      <View>
        <SectionLabel>PARTNER NAME</SectionLabel>
        <TextInput value={form.name} onChangeText={(v) => update('name', v)}
          placeholder="e.g. Acme University, Bright Pvt Ltd" placeholderTextColor={SAC.dim}
          style={[crud.input, { marginTop: 8 }]} />
      </View>

      {/* Category picker */}
      <View>
        <SectionLabel>CATEGORY</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {(['college', 'company', 'sponsor'] as PartnerCategory[]).map((c) => {
            const m = CAT_META[c]; const CIcon = m.Icon;
            const active = form.category === c;
            return (
              <Pressable key={c} onPress={() => update('category', c)}
                style={[s.catPick, active && { borderColor: m.color, backgroundColor: m.color + '22' }]}>
                <CIcon size={13} color={active ? m.color : SAC.muted} />
                <Text style={[s.catPickText, active && { color: m.color }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* PT4 Tier picker */}
      <View>
        <SectionLabel>TIER</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {(Object.keys(TIER_META) as PartnerTier[]).map((t) => {
            const m = TIER_META[t]; const TIcon = m.Icon;
            const active = form.tier === t;
            return (
              <Pressable key={t} onPress={() => update('tier', t)}
                style={[s.catPick, active && { borderColor: m.color, backgroundColor: m.color + '22' }]}>
                <TIcon size={13} color={active ? m.color : SAC.muted} />
                <Text style={[s.catPickText, active && { color: m.color }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[crud.muted, { marginTop: 4 }]}>Gold partners render larger and sort first on the public strip.</Text>
      </View>

      {/* Color logo */}
      <View>
        <SectionLabel>COLOR LOGO (required)</SectionLabel>
        <LogoPicker value={form.logo_url} onPick={() => colorFileRef.current?.click?.()}
          onClear={() => update('logo_url', '')}
          hint="Used on the landing page sponsor strip — color background recommended." />
        {Platform.OS === 'web' && (
          // @ts-ignore native input
          <input ref={colorFileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }} />
        )}
      </View>

      {/* White/inverted logo (PT3) */}
      <View>
        <SectionLabel>WHITE / INVERTED LOGO (optional)</SectionLabel>
        <LogoPicker value={form.logo_white_url} onPick={() => whiteFileRef.current?.click?.()}
          onClear={() => update('logo_white_url', '')}
          hint="Used on the dark dashboard footer strip. If empty, the color logo is auto-inverted." dark />
        {Platform.OS === 'web' && (
          // @ts-ignore native input
          <input ref={whiteFileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }} />
        )}
      </View>

      {/* PT2 Website URL */}
      <View>
        <SectionLabel>WEBSITE URL (optional)</SectionLabel>
        <TextInput value={form.website_url} onChangeText={(v) => update('website_url', v)}
          placeholder="https://partner.example.com" placeholderTextColor={SAC.dim}
          autoCapitalize="none" keyboardType="url"
          style={[crud.input, { marginTop: 8 }]} />
      </View>

      {/* PT6 Contract dates */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <SectionLabel>CONTRACT START</SectionLabel>
          {dateInput(form.contract_start, (v) => update('contract_start', v), 'YYYY-MM-DD')}
        </View>
        <View style={{ flex: 1 }}>
          <SectionLabel>CONTRACT END</SectionLabel>
          {dateInput(form.contract_end, (v) => update('contract_end', v), 'YYYY-MM-DD')}
          <Text style={[crud.muted, { marginTop: 4 }]}>Expired contracts auto-deactivate on the nightly run.</Text>
        </View>
      </View>

      {/* Display order & Active */}
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <SectionLabel>DISPLAY ORDER</SectionLabel>
          <TextInput value={String(form.display_order)} onChangeText={(v) => update('display_order', parseInt(v) || 0)}
            keyboardType="numeric" placeholderTextColor={SAC.dim} style={[crud.input, { marginTop: 8 }]} />
          <Text style={[crud.muted, { marginTop: 4 }]}>Lower numbers appear first. (You can drag to reorder after saving.)</Text>
        </View>
        <View style={{ flex: 1, minWidth: 160 }}>
          <SectionLabel>VISIBILITY</SectionLabel>
          <CheckToggle value={form.is_active} onToggle={() => update('is_active', !form.is_active)}
            label={form.is_active ? 'Visible on landing & footer' : 'Hidden (saved but not shown publicly)'}
            style={{ marginTop: 8 }} />
        </View>
      </View>
    </EditorModal>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  PT7 — CSV IMPORT (preview → commit)
 * ══════════════════════════════════════════════════════════════════ */
type ImportRow = {
  line: number;
  name: string;
  category: string;
  tier: string;
  website_url?: string | null;
  logo_url?: string | null;
  logo_white_url?: string | null;
  duplicate?: boolean;
  error?: string | null;
};

function CsvImportModal({ onClose, onImported, flash }: {
  onClose: () => void;
  onImported: () => void;
  flash: (msg: string, kind?: 'success' | 'error') => void;
}) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{ rows: ImportRow[]; new: number; duplicates: number } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitResult, setCommitResult] = useState<{ imported: number } | null>(null);
  const fileRef = useRef<any>(null);

  const runPreview = async () => {
    if (!text.trim()) { flash('Paste a CSV or choose a .csv file', 'error'); return; }
    setPreviewBusy(true);
    try {
      const r = await request<{ rows: ImportRow[]; new: number; duplicates: number }>('/admin/partners/import/preview', {
        method: 'POST',
        body: { csv_text: text },
      });
      setPreview({ rows: r.rows, new: r.new, duplicates: r.duplicates });
    } catch (e: any) {
      flash(`Preview failed: ${e?.message || e}`, 'error');
    } finally { setPreviewBusy(false); }
  };

  const commit = async () => {
    if (!preview) return;
    setCommitBusy(true);
    try {
      const r = await request<{ imported: number }>('/admin/partners/import/commit', {
        method: 'POST',
        body: { rows: preview.rows, skip_duplicates: true },
      });
      setCommitResult({ imported: r.imported });
      flash(`Imported ${r.imported} partner(s)`);
      onImported();
    } catch (e: any) {
      flash(`Import failed: ${e?.message || e}`, 'error');
    } finally { setCommitBusy(false); }
  };

  const readableRows = (preview?.rows || []).filter((r) => !r.duplicate);

  return (
    <EditorModal
      Icon={UploadCloud}
      title="Import partners from CSV"
      subtitle="Header: name, category, website_url, tier, logo_url[, logo_white_url]. Duplicates by name are skipped."
      onClose={onClose}
      maxWidth={680}
      bodyMaxHeight={560}
      error=""
      busy={previewBusy || commitBusy}
      submitLabel={commitResult ? 'Done' : 'Import'}
      onSubmit={commitResult ? onImported : commit}
    >
      <View>
        <SectionLabel>PASTE CSV OR CHOOSE A FILE</SectionLabel>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={'name,category,website_url,tier,logo_url\nAcme College,college,https://acme.edu,standard,https://acme.edu/logo.png'}
          placeholderTextColor={SAC.dim}
          multiline
          style={[crud.input, { marginTop: 8, height: 96, textAlignVertical: 'top' }]}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <SecondaryButton size="sm" onPress={() => fileRef.current?.click?.()}>
            <FileText size={11} color={SAC.muted} />
            <Text style={crud.secText}>Choose .csv</Text>
          </SecondaryButton>
          <SecondaryButton size="sm" onPress={runPreview} disabled={previewBusy}>
            <Download size={11} color={SAC.muted} />
            <Text style={crud.secText}>Preview</Text>
          </SecondaryButton>
        </View>
        {Platform.OS === 'web' && (
          // @ts-ignore native input
          <input ref={fileRef} type="file" accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e: any) => {
              const f = e.target?.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => setText(String(reader.result || ''));
              reader.readAsText(f);
            }}
          />
        )}
      </View>

      {preview && (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <Text style={crud.muted}>{preview.rows.length} row(s):</Text>
            <Badge label={`${readableRows.length} new`} color="green" />
            {!!preview.duplicates && <Badge label={`${preview.duplicates} duplicate(s)`} color="amber" />}
          </View>
          <View style={{ gap: 6, maxHeight: 220, overflow: 'scroll' }}>
            {preview.rows.map((r) => (
              <View key={r.line} style={[s.importRow, r.duplicate && { opacity: 0.55 }]}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={[s.name, { fontSize: 12 }]} numberOfLines={1}>{r.name}</Text>
                    {r.duplicate && <Badge label="duplicate" color="amber" />}
                    {r.error && <Badge label={r.error} color="red" />}
                  </View>
                  <Text style={crud.muted} numberOfLines={1}>
                    {r.category} · {r.tier}{r.logo_url ? ` · ${r.logo_url.slice(0, 40)}` : ' · no logo'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          {commitResult && (
            <Text style={{ color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 12, marginTop: 8 }}>
              Imported {commitResult.imported} partner(s).
            </Text>
          )}
        </View>
      )}
    </EditorModal>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  LOGO PICKER
 * ══════════════════════════════════════════════════════════════════ */
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
            <Text style={crud.muted}>Logo uploaded · {Math.round(value.length / 1000)} KB (base64)</Text>
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
          <View style={s.logoDropIcon}><ImagePlus size={18} color={GRAD.to} /></View>
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
  rowGold: { borderColor: 'rgba(245,197,24,0.35)' },

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
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  logoBoxGold: {
    width: 104, height: 56, borderRadius: 10,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(245,197,24,0.45)',
  },
  logoImg: { width: '100%', height: '100%' },

  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 13.5 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start',
  },
  catBadgeText: { fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.3 },

  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1,
  },
  tierBadgeText: { fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 0.3, textTransform: 'uppercase' },

  webLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999,
    backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  webLinkText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, maxWidth: 160 },

  /* PT5 analytics box */
  analyticsBox: { width: 150 },
  analytics: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  anRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  anLabel: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 9 },
  anValue: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 12 },
  anMuted: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 9.5 },
  anMore: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 9 },
  anBarRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 18 },
  anBar: { width: 4, borderRadius: 1, backgroundColor: GRAD.to },

  /* modal */
  catPick: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  catPickText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },

  dateInput: {},

  /* import */
  importRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1,
  },

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
