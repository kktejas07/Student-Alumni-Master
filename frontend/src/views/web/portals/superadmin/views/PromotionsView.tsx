/**
 * Super Admin → Promotions view (Phase C + marketing suite PM1–PM7).
 *
 * Manages promotional banners that show up on every portal's dashboard.
 *   API:  /api/admin/promotions  (CRUD + duplicate + A/B + analytics)
 *          /api/promotions/active (consumed by <PromoBanner />)
 *          /api/admin/promotion-templates (PM4 library)
 *
 * Features:
 *   • Card list with tone-coloured stripe, badge, audience chips, status.
 *   • Add/Edit modal: title, body, CTA, tone picker, audience multi-select,
 *     badge, dismissible toggle, image upload (Base64, optional), active flag,
 *     schedule window (starts_at / ends_at), recurrence (PM6), and A/B
 *     experiment variants (PM3).
 *   • Live preview of the banner inside the editor.
 *   • PM1 KPI tiles: Active / Scheduled / Expired / Draft.
 *   • PM2 impressions + clicks per promo, 30-day trend chart on demand.
 *   • PM3 A/B testing — two variants, settle-now action, winner badge.
 *   • PM4 template library — start-from-template + save-as-template.
 *   • PM5 one-click duplicate (copy opens inactive in the editor).
 *   • PM6 recurring promos (daily/weekly/monthly, agent rolls forward).
 *   • PM7 "Expiring Soon" badge when ends_at is within 48h.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Megaphone, Plus, X, Check, RefreshCw, ImagePlus, Upload, ArrowRight,
  Sparkles, Copy, FlaskConical, Repeat, FileText, BarChart3, CalendarClock,
} from 'lucide-react-native';
import { SAC, FONTS, resolveColors } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  SearchField, StatusPill, Toast, useToast, EmptyState, LoadingBox,
} from '../applekit';
import { KpiCard } from '../atoms';
import { request, resolveImageUrl } from '@/src/models/services/api';
import { PromoTone } from '@/src/views/web/components/PromoBanner';
import {
  crud, useThemedCrudStyles, RowActions, DeleteConfirmBar, CheckToggle,
  EditorModal, useWebImageInput,
} from './shared/adminCrud';

/* ────────────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────────── */
type Audience = 'student' | 'alumni' | 'college' | 'mentor' | 'super_admin' | 'all';
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

type AbVariant = {
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  badge: string | null;
  tone: PromoTone;
};

type AbExperiment = {
  variant_a: AbVariant;
  variant_b: AbVariant;
  impressions: { a: number; b: number };
  clicks: { a: number; b: number };
  started_at: string | null;
  winner: 'a' | 'b' | null;
  settled_at: string | null;
};

type Promotion = {
  id: string;
  title: string;
  body: string;
  cta_label?: string | null;
  cta_url?: string | null;
  badge?: string | null;
  tone: PromoTone;
  audience: Audience[];
  placement: 'dashboard' | 'inline' | 'modal';
  dismissible: boolean;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  display_order: number;
  image_url?: string | null;
  recurrence?: Recurrence;
  recurrence_parent_id?: string | null;
  ab_experiment?: AbExperiment | null;
  analytics?: { impressions: number; clicks: number };
  created_at?: string | null;
  updated_at?: string | null;
};

type PromoTemplate = {
  id: string;
  name: string;
  payload: Partial<Promotion> & { tone?: PromoTone };
  created_at?: string | null;
};

const TONE_PREVIEW: Record<PromoTone, { from: string; to: string; label: string }> = {
  violet:  { from: '#60A5FA', to: '#2563EB', label: 'Violet'  },
  blue:    { from: '#60A5FA', to: '#2563EB', label: 'Blue'    },
  indigo:  { from: '#818CF8', to: '#4F46E5', label: 'Indigo'  },
  teal:    { from: '#5EEAD4', to: '#0D9488', label: 'Teal'    },
  amber:   { from: '#FDE68A', to: '#D97706', label: 'Amber'   },
  rose:    { from: '#FDA4AF', to: '#E11D48', label: 'Rose'    },
  emerald: { from: '#6EE7B7', to: '#059669', label: 'Emerald' },
};

const RECURRENCE_OPTIONS: Array<{ id: Recurrence; label: string }> = [
  { id: 'none',    label: 'No repeat' },
  { id: 'daily',   label: 'Daily' },
  { id: 'weekly',  label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const AUDIENCE_OPTIONS: Array<{ id: Audience; label: string }> = [
  { id: 'all',         label: 'Everyone' },
  { id: 'student',     label: 'Students' },
  { id: 'alumni',      label: 'Alumni' },
  { id: 'college',     label: 'Colleges' },
  { id: 'mentor',      label: 'Mentors' },
  { id: 'super_admin', label: 'Super Admin' },
];

function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function fmtDT(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function ctr(impressions: number, clicks: number): number {
  return impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0;
}

/* ────────────────────────────────────────────────────────────────────
 * Root
 * ────────────────────────────────────────────────────────────────── */
export function PromotionsView() {
  const T = useThemedCrudStyles();
  Object.assign(s, resolveColors(s, T));
  const { toast, flash, hide } = useToast();
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [serverNow, setServerNow] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [creating, setCreating] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await request<{ items: Promotion[]; now: string }>('/admin/promotions');
      setItems((r.items || []).slice().sort((a, b) => a.display_order - b.display_order));
      setServerNow(r.now || new Date().toISOString());
    } catch { setItems([]); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = items || [];
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(k) || p.body.toLowerCase().includes(k));
    }
    return list;
  }, [items, q]);

  /* PM1 — KPI tiles */
  const kpis = useMemo(() => {
    const nowMs = serverNow ? Date.parse(serverNow) : Date.now();
    const list = items || [];
    let active = 0, scheduled = 0, expired = 0, draft = 0;
    for (const p of list) {
      const endMs = p.ends_at ? Date.parse(p.ends_at) : null;
      const startMs = p.starts_at ? Date.parse(p.starts_at) : null;
      if (endMs !== null && endMs < nowMs) expired += 1;
      else if (p.is_active && startMs !== null && startMs > nowMs) scheduled += 1;
      else if (p.is_active) active += 1;
      else if (!p.starts_at && !p.ends_at) draft += 1;
    }
    return { active, scheduled, expired, draft, total: list.length };
  }, [items, serverNow]);

  const replaceLocal = (next: Promotion) =>
    setItems((cur) => (cur || []).map((p) => (p.id === next.id ? next : p)));
  const removeLocal = (id: string) =>
    setItems((cur) => (cur || []).filter((p) => p.id !== id));

  const toggleActive = async (p: Promotion) => {
    const next = { ...p, is_active: !p.is_active };
    replaceLocal(next);
    try {
      await request(`/admin/promotions/${p.id}`, { method: 'PATCH', body: { is_active: next.is_active } });
      flash(next.is_active ? 'Promotion activated' : 'Promotion paused');
    } catch {
      replaceLocal(p);
      flash('Failed to update', 'error');
    }
  };

  const remove = async (id: string) => {
    const backup = items;
    removeLocal(id);
    try {
      await request(`/admin/promotions/${id}`, { method: 'DELETE' });
      flash('Promotion deleted');
    } catch {
      setItems(backup);
      flash('Delete failed', 'error');
    }
  };

  /* PM5 — duplicate: copy every field, open the (inactive) copy in the editor */
  const duplicate = async (p: Promotion) => {
    try {
      const copy = await request<Promotion>(`/admin/promotions/${p.id}/duplicate`, { method: 'POST' });
      setItems((cur) => [...(cur || []), copy]);
      setEditing(copy);
      setCreating(false);
      flash('Duplicated — review the copy before publishing');
    } catch (e: any) {
      flash(`Duplicate failed: ${e?.message || e}`, 'error');
    }
  };

  /* PM3 — settle an open A/B experiment now */
  const settleAb = async (p: Promotion) => {
    try {
      const r = await request<{ winner?: string; already_settled?: boolean }>(
        `/admin/promotions/${p.id}/ab/settle`, { method: 'POST' },
      );
      flash(r.already_settled ? 'Already settled' : `A/B settled — variant ${String(r.winner || 'a').toUpperCase()} wins`);
      await load();
    } catch (e: any) {
      flash(`Settle failed: ${e?.message || e}`, 'error');
    }
  };

  /* PM4 — apply a template as the seed for a brand-new promo */
  const useTemplate = (t: PromoTemplate) => {
    setTemplateOpen(false);
    const seed = { ...blankPromo(), ...t.payload, id: '' } as Promotion;
    setEditing(seed);
    setCreating(true);
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Header */}
      <Card>
        <View style={crud.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <IconBox size={38}><Megaphone size={18} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={crud.title}>Promotional banners</Text>
              <Text style={crud.sub}>
                Push announcements, deals, or product updates to one or more
                portals. Promotions appear at the top of the dashboard view
                and respect each user's dismissed list.
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SecondaryButton onPress={() => setTemplateOpen(true)}>
              <FileText size={13} color={SAC.muted} />
              <Text style={crud.secText}>From template</Text>
            </SecondaryButton>
            <GradientButton onPress={() => { setEditing(blankPromo()); setCreating(true); }}>
              <Plus size={13} color="#fff" />
              <Text style={crud.btnText}>New promotion</Text>
            </GradientButton>
          </View>
        </View>
      </Card>

      {/* PM1 — KPI tiles */}
      <View style={s.kpiRow}>
        <View style={s.kpiCell}><KpiCard Icon={Check} label="Active" value={String(kpis.active)} delta={`live now · ${kpis.total} total`} color="green" /></View>
        <View style={s.kpiCell}><KpiCard Icon={CalendarClock} label="Scheduled" value={String(kpis.scheduled)} delta="start in the future" color="blue" /></View>
        <View style={s.kpiCell}><KpiCard Icon={X} label="Expired" value={String(kpis.expired)} delta="ends_at in the past" color="red" /></View>
        <View style={s.kpiCell}><KpiCard Icon={FileText} label="Draft" value={String(kpis.draft)} delta="inactive, no dates" color="amber" /></View>
      </View>

      {/* Filters */}
      <Card>
        <View style={crud.filtersRow}>
          <SearchField value={q} onChange={setQ} placeholder="Search by title or body…" width={320} />
          <Pressable onPress={load} style={crud.refreshBtn}>
            <RefreshCw size={11} color={SAC.muted} />
            <Text style={crud.refreshText}>Refresh</Text>
          </Pressable>
        </View>
      </Card>

      {/* List */}
      {busy && !items ? (
        <LoadingBox />
      ) : (filtered.length === 0) ? (
        <EmptyState
          icon={Megaphone}
          title="No promotions yet"
          sub={q
            ? 'No promotions match your search.'
            : 'Click "New promotion" or start from a template to publish your first announcement.'}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((p) => (
            <PromoRow
              key={p.id}
              promo={p}
              nowMs={serverNow ? Date.parse(serverNow) : Date.now()}
              onEdit={() => { setEditing(p); setCreating(false); }}
              onToggle={() => toggleActive(p)}
              onDelete={() => remove(p.id)}
              onDuplicate={() => duplicate(p)}
              onSettle={() => settleAb(p)}
            />
          ))}
        </View>
      )}

      {/* Editor */}
      {editing && (
        <PromoEditor
          initial={editing}
          isCreate={creating}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={(saved, mode) => {
            if (mode === 'created') {
              setItems((cur) => [...(cur || []), saved].sort((a, b) => a.display_order - b.display_order));
              flash('Promotion created');
            } else {
              replaceLocal(saved);
              flash('Promotion updated');
            }
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      {/* PM4 — template library */}
      {templateOpen && (
        <TemplateLibraryModal onClose={() => setTemplateOpen(false)} onUse={useTemplate} />
      )}

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

function blankPromo(): Promotion {
  return {
    id: '', title: '', body: '', cta_label: '', cta_url: '',
    badge: '', tone: 'violet', audience: ['all'], placement: 'dashboard',
    dismissible: true, is_active: true, display_order: 100,
    starts_at: null, ends_at: null, image_url: null,
    recurrence: 'none', recurrence_parent_id: null,
    ab_experiment: null, analytics: { impressions: 0, clicks: 0 },
  };
}

function abVariantEmpty(): AbVariant {
  return { title: '', body: '', cta_label: null, cta_url: null, badge: null, tone: 'violet' };
}

/* ════════════════════════════════════════════════════════════════════
 *  PROMO ROW
 * ══════════════════════════════════════════════════════════════════ */
function PromoRow({
  promo, nowMs, onEdit, onToggle, onDelete, onDuplicate, onSettle,
}: {
  promo: Promotion;
  nowMs: number;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSettle: () => void;
}) {
  const tone = TONE_PREVIEW[promo.tone] || TONE_PREVIEW.violet;
  const [confirmDel, setConfirmDel] = useState(false);

  /* PM7 — "Expiring Soon": live promo ending within 48h */
  const expiringSoon = !!(
    promo.is_active && promo.ends_at
    && Date.parse(promo.ends_at) > nowMs
    && Date.parse(promo.ends_at) - nowMs <= 48 * 3600 * 1000
  );
  const abOpen = !!promo.ab_experiment && !promo.ab_experiment.winner && !promo.ab_experiment.settled_at;
  const abWinner = promo.ab_experiment?.winner;
  const an = promo.analytics || { impressions: 0, clicks: 0 };

  return (
    <Animated.View entering={FadeIn.duration(160)}>
      <View style={[s.row, !promo.is_active && s.rowInactive]}>
        {/* Tone stripe */}
        <LinearGradient
          colors={[tone.from, tone.to]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={s.stripe}
        />

        {/* Order pill */}
        <View style={crud.orderPill}>
          <Text style={crud.orderText}>{promo.display_order}</Text>
        </View>

        {/* Icon / image */}
        {promo.image_url ? (
          <Image source={{ uri: resolveImageUrl(promo.image_url) }} style={s.thumb} resizeMode="cover" />
        ) : (
          <View style={[s.toneIconBox, { backgroundColor: tone.from + '22', borderColor: tone.from + '55' }]}>
            <Sparkles size={15} color={tone.from} />
          </View>
        )}

        {/* Title + body */}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={s.titleRow}>
            {promo.badge ? (
              <View style={[s.badge, { backgroundColor: tone.from + '22', borderColor: tone.from + '55' }]}>
                <Text style={[s.badgeText, { color: tone.from }]}>{promo.badge}</Text>
              </View>
            ) : null}
            <Text style={s.name} numberOfLines={1}>{promo.title}</Text>
            {expiringSoon && (
              <View style={s.expBadge}>
                <CalendarClock size={10} color="#FBBF24" />
                <Text style={s.expBadgeText}>Expiring {fmtDT(promo.ends_at)}</Text>
              </View>
            )}
            {promo.recurrence && promo.recurrence !== 'none' && (
              <View style={s.recBadge}>
                <Repeat size={10} color={SAC.muted} />
                <Text style={s.recBadgeText}>Repeats {promo.recurrence}</Text>
              </View>
            )}
            {abOpen && (
              <View style={s.abBadge}>
                <FlaskConical size={10} color="#FBBF24" />
                <Text style={s.abBadgeText}>A/B open</Text>
              </View>
            )}
            {abWinner && (
              <View style={s.abWinnerBadge}>
                <FlaskConical size={10} color="#34D399" />
                <Text style={s.abWinnerText}>Winner {String(abWinner).toUpperCase()}</Text>
              </View>
            )}
          </View>
          {!!promo.body && <Text style={s.bodyText} numberOfLines={2}>{promo.body}</Text>}
          <View style={s.metaRow}>
            <View style={[s.toneChip, { backgroundColor: tone.from + '15', borderColor: tone.from + '40' }]}>
              <Text style={[s.toneChipText, { color: tone.from }]}>{tone.label}</Text>
            </View>
            {promo.audience.slice(0, 4).map((a) => (
              <View key={a} style={s.audChip}>
                <Text style={s.audChipText}>{AUDIENCE_OPTIONS.find((x) => x.id === a)?.label || a}</Text>
              </View>
            ))}
            {promo.audience.length > 4 && (
              <Text style={crud.muted}>+{promo.audience.length - 4} more</Text>
            )}
            {(promo.starts_at || promo.ends_at) && (
              <Text style={crud.muted}>
                {fmtDT(promo.starts_at)} → {fmtDT(promo.ends_at)}
              </Text>
            )}
            {promo.is_active ? (
              <StatusPill kind="success" label="Live" dot />
            ) : (
              <StatusPill kind="warn" label="Paused" />
            )}
          </View>

          {/* PM2 — mini analytics + 30-day trend */}
          <TrendBox promo={promo} />
        </View>

        {/* PM3 settle + PM5 duplicate + Toggle / Edit / Delete */}
        <View style={{ flexDirection: 'column' as any, gap: 6, alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row' as any, gap: 6 }}>
            {abOpen && (
              <SecondaryButton size="sm" onPress={onSettle}>
                <FlaskConical size={11} color="#FBBF24" />
                <Text style={crud.secText}>Settle A/B</Text>
              </SecondaryButton>
            )}
            <SecondaryButton size="sm" onPress={onDuplicate}>
              <Copy size={11} color={SAC.muted} />
              <Text style={crud.secText}>Duplicate</Text>
            </SecondaryButton>
          </View>
          <RowActions
            active={!!promo.is_active}
            onToggle={onToggle}
            onEdit={onEdit}
            onRequestDelete={() => setConfirmDel(true)}
            onLabel="Live"
            offLabel="Paused"
          />
        </View>
      </View>

      {confirmDel && (
        <DeleteConfirmBar
          name={promo.title}
          onCancel={() => setConfirmDel(false)}
          onConfirm={() => { setConfirmDel(false); onDelete(); }}
        />
      )}
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  PM2 — per-promo analytics mini row + lazy 30-day trend bars
 * ══════════════════════════════════════════════════════════════════ */
function TrendBox({ promo }: { promo: Promotion }) {
  const [open, setOpen] = useState(false);
  const [series, setSeries] = useState<Array<{ day: string; impressions: number; clicks: number }> | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await request<{
        series: Array<{ day: string; impressions: number; clicks: number }>;
      }>(`/admin/promotions/${promo.id}/analytics`);
      setSeries(r.series || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }, [promo.id]);

  if (!open && !series) {
    const an = promo.analytics || { impressions: 0, clicks: 0 };
    return (
      <View style={s.anMini}>
        <BarChart3 size={11} color={SAC.dim} />
        <Text style={s.anStat}>
          <Text style={s.anStatNum}>{an.impressions}</Text> impressions ·{' '}
          <Text style={s.anStatNum}>{an.clicks}</Text> clicks ·{' '}
          <Text style={s.anStatNum}>{ctr(an.impressions, an.clicks)}%</Text> CTR
        </Text>
        <SecondaryButton size="sm" onPress={() => { setOpen(true); load(); }}>
          <Text style={crud.secText}>30-day trend</Text>
        </SecondaryButton>
      </View>
    );
  }

  const maxImp = Math.max(1, ...(series || []).map((d) => d.impressions));
  return (
    <View style={s.anPanel}>
      <View style={{ flexDirection: 'row' as any, gap: 8, alignItems: 'center' }}>
        <BarChart3 size={11} color={SAC.dim} />
        <Text style={crud.muted}>Last 30 days</Text>
        {err ? <Text style={{ color: '#F87171', fontFamily: FONTS.med, fontSize: 10 }}>{err}</Text> : null}
        <SecondaryButton size="sm" onPress={() => { setSeries(null); setOpen(false); setErr(''); }}>
          <X size={10} color={SAC.muted} />
          <Text style={crud.secText}>Hide</Text>
        </SecondaryButton>
      </View>
      {series && (
        <View style={s.anBarRow}>
          {series.map((d, i) => (
            <View key={`${d.day}-${i}`} style={s.anBarPair}>
              <View style={[s.anBar, { height: Math.max(2, (d.impressions / maxImp) * 30) }]} />
              <View style={[s.anBarClicks, { height: Math.max(2, (d.clicks / maxImp) * 30) }]} />
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row' as any, gap: 10, marginTop: 4 }}>
        <Text style={s.anLegend}><Text style={s.anLegendImp}>■</Text> impressions</Text>
        <Text style={s.anLegend}><Text style={s.anLegendClk}>■</Text> clicks</Text>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  EDITOR
 * ══════════════════════════════════════════════════════════════════ */
function PromoEditor({
  initial, isCreate, onClose, onSaved,
}: {
  initial: Promotion;
  isCreate: boolean;
  onClose: () => void;
  onSaved: (p: Promotion, mode: 'created' | 'updated') => void;
}) {
  const [form, setForm] = useState<Partial<Promotion>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<any>(null);

  /* PM3 — A/B variant editor state (seeded from the stored experiment or the base fields) */
  const [abOn, setAbOn] = useState(!!initial.ab_experiment);
  const [ab, setAb] = useState<{ variant_a: AbVariant; variant_b: AbVariant }>(() => {
    const baseA: AbVariant = {
      title: initial.title || '', body: initial.body || '',
      cta_label: initial.cta_label || null, cta_url: initial.cta_url || null,
      badge: initial.badge || null, tone: initial.tone,
    };
    const va = initial.ab_experiment?.variant_a || baseA;
    const vb = initial.ab_experiment?.variant_b || { ...abVariantEmpty(), tone: initial.tone };
    return { variant_a: va, variant_b: vb };
  });
  const patchVariant = (side: 'variant_a' | 'variant_b', patch: Partial<AbVariant>) =>
    setAb((cur) => ({ ...cur, [side]: { ...cur[side], ...patch } }));

  /* PM4 — save current promo into the template library */
  const [savingTmpl, setSavingTmpl] = useState(false);
  const [tmplSaved, setTmplSaved] = useState(false);
  const saveAsTemplate = async () => {
    if (!initial.id || tmplSaved) return;
    setSavingTmpl(true);
    try {
      await request(`/admin/promotions/${initial.id}/save-template`, {
        method: 'POST', body: { name: `${initial.title || 'Promo'} — template` },
      });
      setError(null);
      setTmplSaved(true);
    } catch (e: any) {
      setError(`Save template failed: ${e?.message || e}`);
    } finally { setSavingTmpl(false); }
  };

  const update = (k: keyof Promotion, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const toggleAudience = (a: Audience) => {
    setForm((f) => {
      const current = f.audience || ['all'];
      const has = current.includes(a);
      let next = has ? current.filter((x) => x !== a) : [...current, a];
      // "all" is exclusive
      if (a === 'all' && !has) next = ['all'];
      else if (a !== 'all' && next.includes('all')) next = next.filter((x) => x !== 'all');
      if (next.length === 0) next = ['all'];
      return { ...f, audience: next };
    });
  };

  useWebImageInput(
    [{ ref: fileRef, onDataUri: (uri) => update('image_url', uri) }],
    setError,
    { type: 'Choose a PNG / JPG / SVG', size: 'Image must be under 2 MB' },
  );

  const submit = async () => {
    if (!form.title?.trim()) { setError('Title is required'); return; }
    if (!form.audience || form.audience.length === 0) { setError('Pick at least one audience'); return; }
    if (form.starts_at && form.ends_at && Date.parse(form.ends_at) <= Date.parse(form.starts_at)) {
      setError('Ends at must be after starts at');
      return;
    }
    setBusy(true); setError(null);
    try {
      const payload: any = {
        title: form.title.trim(),
        body: form.body || '',
        cta_label: form.cta_label || null,
        cta_url:   form.cta_url || null,
        badge:     form.badge || null,
        tone: form.tone,
        audience: form.audience,
        placement: form.placement,
        dismissible: form.dismissible,
        is_active: form.is_active,
        display_order: form.display_order || 100,
        image_url: form.image_url || null,
        starts_at: form.starts_at || null,
        ends_at:   form.ends_at || null,
        recurrence: form.recurrence || 'none',
        ab_experiment: abOn ? ab : null,
      };
      let saved: Promotion;
      if (isCreate) {
        saved = await request<Promotion>('/admin/promotions', { method: 'POST', body: payload });
        onSaved(saved, 'created');
      } else {
        saved = await request<Promotion>(`/admin/promotions/${initial.id}`, { method: 'PATCH', body: payload });
        onSaved(saved, 'updated');
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally { setBusy(false); }
  };

  const previewTone = TONE_PREVIEW[form.tone as PromoTone] || TONE_PREVIEW.violet;
  const abData = initial.ab_experiment;

  return (
    <EditorModal
      Icon={Megaphone}
      title={isCreate ? 'New promotion' : 'Edit promotion'}
      subtitle={isCreate
        ? 'Compose the message, pick a tone, and choose which portals see it.'
        : 'Update this promotion. Changes go live immediately.'}
      onClose={onClose}
      maxWidth={760}
      bodyMaxHeight={640}
      error={error}
      busy={busy || savingTmpl}
      submitLabel={isCreate ? 'Publish' : 'Save changes'}
      onSubmit={submit}
    >
            {/* Live preview */}
            <View>
              <SectionLabel>LIVE PREVIEW</SectionLabel>
              <View style={[s.preview, { borderColor: previewTone.from + '55' }]}>
                <LinearGradient
                  colors={[previewTone.from, previewTone.to]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={s.previewStripe}
                />
                {form.image_url ? (
                  <Image source={{ uri: form.image_url }} style={s.previewImg} resizeMode="cover" />
                ) : (
                  <View style={[s.previewIcon, { backgroundColor: previewTone.from + '22', borderColor: previewTone.from + '55' }]}>
                    <Sparkles size={16} color={previewTone.from} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <View style={s.titleRow}>
                    {form.badge ? (
                      <View style={[s.badge, { backgroundColor: previewTone.from + '22', borderColor: previewTone.from + '55' }]}>
                        <Text style={[s.badgeText, { color: previewTone.from }]}>{form.badge}</Text>
                      </View>
                    ) : null}
                    <Text style={s.previewTitle}>{form.title || 'Preview title'}</Text>
                  </View>
                  {!!form.body && <Text style={s.previewBody}>{form.body}</Text>}
                </View>
                {form.cta_label ? (
                  <LinearGradient
                    colors={[previewTone.from, previewTone.to]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.previewCta}
                  >
                    <Text style={s.previewCtaText}>{form.cta_label}</Text>
                    <ArrowRight size={11} color="#fff" />
                  </LinearGradient>
                ) : null}
              </View>
            </View>

            {/* Title */}
            <View>
              <SectionLabel>TITLE</SectionLabel>
              <TextInput
                value={form.title || ''}
                onChangeText={(v) => update('title', v)}
                placeholder="e.g. Year-end placement drive opens Friday"
                placeholderTextColor={SAC.dim}
                style={[crud.input, { marginTop: 8 }]}
              />
            </View>

            {/* Body */}
            <View>
              <SectionLabel>BODY</SectionLabel>
              <TextInput
                value={form.body || ''}
                onChangeText={(v) => update('body', v)}
                placeholder="Short supporting line shown under the title (2 lines max)."
                placeholderTextColor={SAC.dim}
                multiline
                numberOfLines={2}
                style={[crud.input, { marginTop: 8, minHeight: 70 }]}
              />
            </View>

            {/* Badge + Tone */}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}>
                <SectionLabel>BADGE (OPTIONAL)</SectionLabel>
                <TextInput
                  value={form.badge || ''}
                  onChangeText={(v) => update('badge', v)}
                  placeholder="NEW · DEAL · BETA"
                  placeholderTextColor={SAC.dim}
                  maxLength={12}
                  style={[crud.input, { marginTop: 8 }]}
                />
              </View>
              <View style={{ flex: 2, minWidth: 240 }}>
                <SectionLabel>TONE</SectionLabel>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {(Object.keys(TONE_PREVIEW) as PromoTone[]).map((t) => {
                    const tp = TONE_PREVIEW[t];
                    const active = form.tone === t;
                    return (
                      <Pressable key={t} onPress={() => update('tone', t)} style={[s.tonePick, active && { borderColor: tp.from, backgroundColor: tp.from + '22' }]}>
                        <LinearGradient colors={[tp.from, tp.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.toneSwatch} />
                        <Text style={[s.tonePickText, active && { color: tp.from }]}>{tp.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* CTA */}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}>
                <SectionLabel>CTA LABEL (OPTIONAL)</SectionLabel>
                <TextInput
                  value={form.cta_label || ''}
                  onChangeText={(v) => update('cta_label', v)}
                  placeholder="Learn more"
                  placeholderTextColor={SAC.dim}
                  style={[crud.input, { marginTop: 8 }]}
                />
              </View>
              <View style={{ flex: 2, minWidth: 240 }}>
                <SectionLabel>CTA URL (OPTIONAL)</SectionLabel>
                <TextInput
                  value={form.cta_url || ''}
                  onChangeText={(v) => update('cta_url', v)}
                  placeholder="https://… or /super-admin/imports"
                  placeholderTextColor={SAC.dim}
                  style={[crud.input, { marginTop: 8 }]}
                />
              </View>
            </View>

            {/* Schedule window */}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <SectionLabel>STARTS AT (OPTIONAL)</SectionLabel>
                {Platform.OS === 'web' ? (
                  // @ts-ignore native input
                  <input
                    type="datetime-local"
                    value={toLocalInput(form.starts_at)}
                    onChange={(e: any) => update('starts_at', fromLocalInput(e.target.value))}
                    style={s.webInput as any}
                  />
                ) : (
                  <TextInput
                    value={form.starts_at || ''}
                    onChangeText={(v) => update('starts_at', v ? new Date(v).toISOString() : null)}
                    placeholder="ISO datetime, empty = immediately"
                    placeholderTextColor={SAC.dim}
                    style={[crud.input, { marginTop: 8 }]}
                  />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 220 }}>
                <SectionLabel>ENDS AT (OPTIONAL)</SectionLabel>
                {Platform.OS === 'web' ? (
                  // @ts-ignore native input
                  <input
                    type="datetime-local"
                    value={toLocalInput(form.ends_at)}
                    onChange={(e: any) => update('ends_at', fromLocalInput(e.target.value))}
                    style={s.webInput as any}
                  />
                ) : (
                  <TextInput
                    value={form.ends_at || ''}
                    onChangeText={(v) => update('ends_at', v ? new Date(v).toISOString() : null)}
                    placeholder="ISO datetime, empty = until you end it"
                    placeholderTextColor={SAC.dim}
                    style={[crud.input, { marginTop: 8 }]}
                  />
                )}
              </View>
            </View>

            {/* PM6 — recurrence */}
            <View>
              <SectionLabel>REPEAT (PM6)</SectionLabel>
              <Text style={s.hint}>
                Recurring promos are rolled forward automatically by the nightly agent:
                the current period archives and an active clone starts the next period.
              </Text>
              <View style={s.segRow}>
                {RECURRENCE_OPTIONS.map((r) => {
                  const active = (form.recurrence || 'none') === r.id;
                  return (
                    <Pressable key={r.id} onPress={() => update('recurrence', r.id)} style={[s.segBtn, active && s.segBtnOn]}>
                      {active && <Repeat size={10} color={GRAD.to} />}
                      <Text style={[s.segText, active && { color: GRAD.to }]}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* PM3 — A/B experiment */}
            <View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <SectionLabel style={{ marginBottom: 0 }}>A/B TEST (PM3)</SectionLabel>
                <CheckToggle
                  value={abOn}
                  onToggle={() => setAbOn((v) => !v)}
                  label={abOn ? 'Running variant test' : 'Off'}
                />
                {abOn && abData && !abData.settled_at ? (
                  <Text style={s.hint}>
                    live · A {abData.impressions?.a || 0} imp / B {abData.impressions?.b || 0} imp
                  </Text>
                ) : abOn && abData?.settled_at ? (
                  <Text style={s.hint}>settled — winner {String(abData.winner || 'a').toUpperCase()}</Text>
                ) : null}
              </View>
              {abOn && (
                <View style={s.abGrid}>
                  {(['variant_a', 'variant_b'] as const).map((side) => {
                    const v = ab[side];
                    const sideTone = TONE_PREVIEW[v.tone] || TONE_PREVIEW.violet;
                    return (
                      <View key={side} style={s.abCol}>
                        <View style={{ flexDirection: 'row' as any, gap: 8, alignItems: 'center' }}>
                          <LinearGradient colors={[sideTone.from, sideTone.to]} style={s.toneSwatch} />
                          <Text style={[s.abSideLabel, { color: sideTone.from }]}>{side === 'variant_a' ? 'Variant A' : 'Variant B'}</Text>
                          {abData?.winner === side.slice(-1) && <Text style={s.abWinnerText}>winner</Text>}
                        </View>
                        <TextInput
                          value={v.title}
                          onChangeText={(val) => patchVariant(side, { title: val })}
                          placeholder="Variant title"
                          placeholderTextColor={SAC.dim}
                          style={[crud.input, { marginTop: 8 }]}
                        />
                        <TextInput
                          value={v.body}
                          onChangeText={(val) => patchVariant(side, { body: val })}
                          placeholder="Variant body"
                          placeholderTextColor={SAC.dim}
                          multiline
                          numberOfLines={2}
                          style={[crud.input, { marginTop: 6, minHeight: 52 }]}
                        />
                        <View style={{ flexDirection: 'row' as any, gap: 8, flexWrap: 'wrap' }}>
                          <TextInput
                            value={v.cta_label || ''}
                            onChangeText={(val) => patchVariant(side, { cta_label: val || null })}
                            placeholder="CTA label"
                            placeholderTextColor={SAC.dim}
                            style={[crud.input, { flex: 1, minWidth: 120, marginTop: 6 }]}
                          />
                          <TextInput
                            value={v.badge || ''}
                            onChangeText={(val) => patchVariant(side, { badge: val || null })}
                            placeholder="Badge"
                            placeholderTextColor={SAC.dim}
                            style={[crud.input, { width: 96, marginTop: 6 }]}
                          />
                        </View>
                        <TextInput
                          value={v.cta_url || ''}
                          onChangeText={(val) => patchVariant(side, { cta_url: val || null })}
                          placeholder="CTA URL"
                          placeholderTextColor={SAC.dim}
                          style={[crud.input, { marginTop: 6 }]}
                        />
                        <View style={{ flexDirection: 'row' as any, gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {(Object.keys(TONE_PREVIEW) as PromoTone[]).map((t) => {
                            const tp = TONE_PREVIEW[t];
                            const active = v.tone === t;
                            return (
                              <Pressable
                                key={t}
                                onPress={() => patchVariant(side, { tone: t })}
                                style={[s.toneSwatchBtn, active && { borderColor: tp.from, backgroundColor: tp.from + '22' }]}
                              >
                                <LinearGradient colors={[tp.from, tp.to]} style={s.toneSwatch} />
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                  <Text style={s.hint}>
                    Visitors are split 50/50 per session. Auto-settles at 1,000 impressions or 7 days;
                    the winning variant's copy becomes the base promo.
                  </Text>
                </View>
              )}
            </View>

            {/* Audience */}
            <View>
              <SectionLabel>AUDIENCE</SectionLabel>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {AUDIENCE_OPTIONS.map((a) => {
                  const active = (form.audience || ['all']).includes(a.id);
                  return (
                    <Pressable key={a.id} onPress={() => toggleAudience(a.id)} style={[s.audPick, active && s.audPickOn]}>
                      {active && <Check size={11} color={GRAD.to} />}
                      <Text style={[s.audPickText, active && { color: GRAD.to }]}>{a.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Image */}
            <View>
              <SectionLabel>IMAGE (OPTIONAL)</SectionLabel>
              <View style={{ marginTop: 8 }}>
                {form.image_url ? (
                  <View style={s.imgRow}>
                    <Image source={{ uri: form.image_url }} style={s.imgPrev} resizeMode="cover" />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={crud.muted}>{Math.round(form.image_url.length / 1000)} KB (base64)</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <SecondaryButton size="sm" onPress={() => fileRef.current?.click?.()}>
                          <Upload size={11} color={SAC.muted} /><Text style={crud.secText}>Replace</Text>
                        </SecondaryButton>
                        <SecondaryButton size="sm" danger onPress={() => update('image_url', null)}>
                          <X size={11} color="#FCA5A5" /><Text style={[crud.secText, { color: '#FCA5A5' }]}>Remove</Text>
                        </SecondaryButton>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => fileRef.current?.click?.()} style={s.imgDrop}>
                    <ImagePlus size={16} color={GRAD.to} />
                    <Text style={crud.muted}>Click to upload a thumbnail · PNG / JPG · max 2 MB</Text>
                  </Pressable>
                )}
                {Platform.OS === 'web' && (
                  // @ts-ignore native input
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }} />
                )}
              </View>
            </View>

            {/* Order + Visibility + Dismissible + PM4 */}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 140 }}>
                <SectionLabel>DISPLAY ORDER</SectionLabel>
                <TextInput
                  value={String(form.display_order ?? 100)}
                  onChangeText={(v) => update('display_order', parseInt(v) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor={SAC.dim}
                  style={[crud.input, { marginTop: 8 }]}
                />
              </View>
              <View style={{ flex: 1, minWidth: 160 }}>
                <SectionLabel>STATUS</SectionLabel>
                <CheckToggle
                  value={!!form.is_active}
                  onToggle={() => update('is_active', !form.is_active)}
                  label={form.is_active ? 'Live now' : 'Paused (not shown)'}
                  style={{ marginTop: 8 }}
                />
              </View>
              <View style={{ flex: 1, minWidth: 160 }}>
                <SectionLabel>DISMISSIBLE</SectionLabel>
                <CheckToggle
                  value={!!form.dismissible}
                  onToggle={() => update('dismissible', !form.dismissible)}
                  label={form.dismissible ? 'Users can close it' : 'Sticky (no close)'}
                  style={{ marginTop: 8 }}
                />
              </View>
              {!isCreate && (
                <View style={{ flex: 1, minWidth: 160 }}>
                  <SectionLabel>TEMPLATE (PM4)</SectionLabel>
                  <SecondaryButton
                    size="sm"
                    style={{ marginTop: 8 }}
                    onPress={saveAsTemplate}
                    disabled={tmplSaved}
                  >
                    <FileText size={11} color={SAC.muted} />
                    <Text style={crud.secText}>
                      {tmplSaved ? 'Saved to library' : 'Save as template'}
                    </Text>
                  </SecondaryButton>
                </View>
              )}
            </View>
    </EditorModal>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  PM4 — TEMPLATE LIBRARY MODAL
 * ══════════════════════════════════════════════════════════════════ */
function TemplateLibraryModal({
  onClose, onUse,
}: {
  onClose: () => void;
  onUse: (t: PromoTemplate) => void;
}) {
  const { toast, flash, hide } = useToast();
  const [templates, setTemplates] = useState<PromoTemplate[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await request<{ items: PromoTemplate[] }>('/admin/promotion-templates');
      setTemplates(r.items || []);
    } catch { setTemplates([]); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (t: PromoTemplate) => {
    const backup = templates;
    setTemplates((cur) => (cur || []).filter((x) => x.id !== t.id));
    try {
      await request(`/admin/promotion-templates/${t.id}`, { method: 'DELETE' });
      flash('Template deleted');
    } catch {
      setTemplates(backup);
      flash('Delete failed', 'error');
    }
  };

  return (
    <EditorModal
      Icon={FileText}
      title="Promotion templates"
      subtitle="Reusable presets. Pick one to seed a brand-new promotion."
      onClose={onClose}
      maxWidth={640}
      bodyMaxHeight={520}
      error=""
      busy={busy}
      submitLabel="Done"
      onSubmit={onClose}
    >
      {templates && templates.length === 0 ? (
        <View style={s.tmplEmpty}>
          <FileText size={22} color={SAC.dim} />
          <Text style={crud.muted}>
            No templates yet. Open a promotion and use "Save as template" to capture
            its fields here.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {(templates || []).map((t) => (
            <View key={t.id} style={s.tmplRow}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={s.tmplName} numberOfLines={1}>{t.name}</Text>
                <Text style={s.tmplMeta} numberOfLines={1}>
                  {t.payload?.tone ? `${String(t.payload.tone)} · ` : ''}
                  {t.payload?.audience?.length ? `${t.payload.audience.length} audience(s)` : 'no fields'}
                </Text>
              </View>
              <SecondaryButton size="sm" onPress={() => onUse(t)}>
                <Plus size={11} color={GRAD.to} />
                <Text style={crud.secText}>Start from this</Text>
              </SecondaryButton>
              <Pressable onPress={() => remove(t)} style={crud.iconBtn}>
                <X size={12} color="#FCA5A5" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </EditorModal>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Styles
 * ────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({

  /* PM1 KPI row */
  kpiRow: { flexDirection: 'row' as any, gap: 10, flexWrap: 'wrap' as any },
  kpiCell: { flex: 1, minWidth: 170 },

  /* row */
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, paddingLeft: 18,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12,
    overflow: 'hidden',
  },
  rowInactive: { opacity: 0.6 },
  stripe: { position: 'absolute' as any, left: 0, top: 0, bottom: 0, width: 4 },
  thumb: { width: 56, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  toneIconBox: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' as any },
  badge: {
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start',
  },
  badgeText: { fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.6 },
  name: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 13.5, flexShrink: 1 },
  bodyText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' as any, marginTop: 2 },
  toneChip: { paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1 },
  toneChipText: { fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.3 },
  audChip: {
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 7,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  audChipText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10 },

  /* PM7 / PM3 / PM6 row chips */
  expBadge: {
    flexDirection: 'row' as any, alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.14)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.40)',
  },
  expBadgeText: { color: '#FBBF24', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.3 },
  recBadge: {
    flexDirection: 'row' as any, alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: SAC.border,
  },
  recBadgeText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10 },
  abBadge: {
    flexDirection: 'row' as any, alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.14)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.40)',
  },
  abBadgeText: { color: '#FBBF24', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.3 },
  abWinnerBadge: {
    flexDirection: 'row' as any, alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.14)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.40)',
  },
  abWinnerText: { color: '#4ADE80', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.3 },

  /* PM2 analytics */
  anMini: { flexDirection: 'row' as any, alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' as any },
  anStat: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  anStatNum: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 11 },
  anPanel: {
    marginTop: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
  },
  anBarRow: {
    flexDirection: 'row' as any, alignItems: 'flex-end', gap: 3,
    height: 34, marginTop: 8, overflow: 'hidden',
  },
  anBarPair: { flexDirection: 'row' as any, alignItems: 'flex-end', gap: 1, width: 5, flexShrink: 0 as any },
  anBar: { width: 2, borderRadius: 2, backgroundColor: 'rgba(96,165,250,0.65)' },
  anBarClicks: { width: 2, borderRadius: 2, backgroundColor: '#FBBF24' },
  anLegend: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10 },
  anLegendImp: { color: '#60A5FA', fontSize: 9 },
  anLegendClk: { color: '#FBBF24', fontSize: 9 },

  /* editor — shared */
  hint: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, lineHeight: 15, marginTop: 4 },
  segRow: { flexDirection: 'row' as any, gap: 6, marginTop: 8, flexWrap: 'wrap' as any },
  segBtn: {
    flexDirection: 'row' as any, alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  segBtnOn: { borderColor: 'rgba(96,165,250,0.55)', backgroundColor: 'rgba(96,165,250,0.12)' },
  segText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },

  /* editor — A/B */
  abGrid: { flexDirection: 'row' as any, gap: 12, flexWrap: 'wrap' as any, marginTop: 8 },
  abCol: {
    flex: 1, minWidth: 260, gap: 4, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: SAC.border2, backgroundColor: SAC.cardSolid,
  },
  abSideLabel: { fontFamily: FONTS.xbold, fontSize: 11.5, letterSpacing: 0.4 },
  toneSwatchBtn: {
    width: 22, height: 22, borderRadius: 7, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  /* editor — native web inputs */
  webInput: {
    marginTop: 8, padding: 9, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: SAC.border2, borderWidth: 1,
    color: '#F4F4FA', fontFamily: 'Inter, sans-serif' as any, fontSize: 13,
    width: '100%' as any,
  },

  /* modal */

  tonePick: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toneSwatch: { width: 14, height: 14, borderRadius: 4 },
  tonePickText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },

  audPick: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  audPickOn: { borderColor: 'rgba(245,158,11,0.50)', backgroundColor: 'rgba(245,158,11,0.10)' },
  audPickText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },

  /* image picker */
  imgDrop: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
    borderColor: SAC.border2, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  imgRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 10, borderWidth: 1,
    borderColor: SAC.border, backgroundColor: SAC.cardSolid,
  },
  imgPrev: { width: 90, height: 50, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },

  /* preview */
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8,
    paddingVertical: 12, paddingHorizontal: 16, paddingLeft: 18,
    borderRadius: 12, borderWidth: 1,
    backgroundColor: 'rgba(15,20,38,0.78)',
    overflow: 'hidden',
  },
  previewStripe: { position: 'absolute' as any, left: 0, top: 0, bottom: 0, width: 4 },
  previewIcon: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: 56, height: 40, borderRadius: 8 },
  previewTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 13 },
  previewBody:  { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 16 },
  previewCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  previewCtaText: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 11.5 },

  /* PM4 template library */
  tmplEmpty: { alignItems: 'center', gap: 8, paddingVertical: 24, flex: 1 },
  tmplRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10, borderWidth: 1,
    borderColor: SAC.border, backgroundColor: SAC.cardSolid,
  },
  tmplName: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 12.5 },
  tmplMeta: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10 },
});
