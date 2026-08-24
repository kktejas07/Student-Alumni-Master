/**
 * Super Admin → Promotions view (Phase C).
 *
 * Manages promotional banners that show up on every portal's dashboard.
 *   API:  /api/admin/promotions  (CRUD)
 *         /api/promotions/active (consumed by <PromoBanner />)
 *
 * Features:
 *   • Card list with tone-coloured stripe, badge, audience chips, status.
 *   • Add/Edit modal: title, body, CTA, tone picker, audience multi-select,
 *     badge, dismissible toggle, image upload (Base64, optional), active flag.
 *   • Live preview of the banner inside the editor.
 *   • Activate/deactivate toggle + delete with inline confirm.
 *   • Search by title.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView, Platform, Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  Megaphone, Plus, Pencil, Trash2, X, Check, AlertTriangle, Eye, EyeOff,
  RefreshCw, ImagePlus, Upload, ArrowRight, Sparkles,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  SearchField, StatusPill, Toast, useToast, EmptyState, LoadingBox,
} from '../applekit';
import { request, resolveImageUrl } from '@/src/models/services/api';
import { PromoTone } from '@/src/views/web/components/PromoBanner';

/* ────────────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────────── */
type Audience = 'student' | 'alumni' | 'college' | 'mentor' | 'super_admin' | 'all';

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
  created_at?: string | null;
  updated_at?: string | null;
};

const TONE_PREVIEW: Record<PromoTone, { from: string; to: string; label: string }> = {
  violet:  { from: '#A78BFA', to: '#7C3AED', label: 'Violet'  },
  blue:    { from: '#60A5FA', to: '#2563EB', label: 'Blue'    },
  indigo:  { from: '#818CF8', to: '#4F46E5', label: 'Indigo'  },
  teal:    { from: '#5EEAD4', to: '#0D9488', label: 'Teal'    },
  amber:   { from: '#FDE68A', to: '#D97706', label: 'Amber'   },
  rose:    { from: '#FDA4AF', to: '#E11D48', label: 'Rose'    },
  emerald: { from: '#6EE7B7', to: '#059669', label: 'Emerald' },
};

const AUDIENCE_OPTIONS: Array<{ id: Audience; label: string }> = [
  { id: 'all',         label: 'Everyone' },
  { id: 'student',     label: 'Students' },
  { id: 'alumni',      label: 'Alumni' },
  { id: 'college',     label: 'Colleges' },
  { id: 'mentor',      label: 'Mentors' },
  { id: 'super_admin', label: 'Super Admin' },
];

/* ────────────────────────────────────────────────────────────────────
 * Root
 * ────────────────────────────────────────────────────────────────── */
export function PromotionsView() {
  const { toast, flash, hide } = useToast();
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await request<{ items: Promotion[] }>('/admin/promotions');
      setItems((r.items || []).slice().sort((a, b) => a.display_order - b.display_order));
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
      flash('Failed to update');
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
      flash('Delete failed');
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Header */}
      <Card>
        <View style={s.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <IconBox size={38}><Megaphone size={18} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>Promotional banners</Text>
              <Text style={s.sub}>
                Push announcements, deals, or product updates to one or more
                portals. Promotions appear at the top of the dashboard view
                and respect each user's dismissed list.
              </Text>
            </View>
          </View>
          <GradientButton onPress={() => { setEditing(blankPromo()); setCreating(true); }}>
            <Plus size={13} color="#fff" />
            <Text style={s.btnText}>New promotion</Text>
          </GradientButton>
        </View>
      </Card>

      {/* Filters */}
      <Card>
        <View style={s.filtersRow}>
          <SearchField value={q} onChange={setQ} placeholder="Search by title or body…" width={320} />
          <Pressable onPress={load} style={s.refreshBtn}>
            <RefreshCw size={11} color={SAC.muted} />
            <Text style={s.refreshText}>Refresh</Text>
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
            : 'Click "New promotion" to publish your first announcement to one or more portals.'}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((p) => (
            <PromoRow
              key={p.id}
              promo={p}
              onEdit={() => { setEditing(p); setCreating(false); }}
              onToggle={() => toggleActive(p)}
              onDelete={() => remove(p.id)}
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
  };
}

/* ════════════════════════════════════════════════════════════════════
 *  PROMO ROW
 * ══════════════════════════════════════════════════════════════════ */
function PromoRow({
  promo, onEdit, onToggle, onDelete,
}: {
  promo: Promotion;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const tone = TONE_PREVIEW[promo.tone] || TONE_PREVIEW.violet;
  const [confirmDel, setConfirmDel] = useState(false);

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
        <View style={s.orderPill}>
          <Text style={s.orderText}>{promo.display_order}</Text>
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
              <Text style={s.muted}>+{promo.audience.length - 4} more</Text>
            )}
            {promo.is_active ? (
              <StatusPill kind="success" label="Live" dot />
            ) : (
              <StatusPill kind="warn" label="Paused" />
            )}
          </View>
        </View>

        {/* Toggle */}
        <Pressable onPress={onToggle} style={[s.toggleBtn, promo.is_active && s.toggleBtnOn]}>
          {promo.is_active
            ? <Eye  size={12} color={GRAD.to} />
            : <EyeOff size={12} color={SAC.muted} />}
          <Text style={[s.toggleText, promo.is_active && { color: GRAD.to }]}>
            {promo.is_active ? 'Live' : 'Paused'}
          </Text>
        </Pressable>

        {/* Edit / Delete */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={onEdit} style={s.iconBtn}>
            <Pencil size={12} color={SAC.muted} />
          </Pressable>
          <Pressable onPress={() => setConfirmDel(true)} style={[s.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
            <Trash2 size={12} color="#FCA5A5" />
          </Pressable>
        </View>
      </View>

      {confirmDel && (
        <Animated.View entering={FadeIn.duration(160)} style={s.confirmBar}>
          <AlertTriangle size={13} color="#FCA5A5" />
          <Text style={[s.muted, { color: '#FCA5A5', flex: 1 }]}>
            Delete "{promo.title}"? This cannot be undone.
          </Text>
          <SecondaryButton size="sm" onPress={() => setConfirmDel(false)}>
            <Text style={s.secText}>Cancel</Text>
          </SecondaryButton>
          <Pressable onPress={() => { setConfirmDel(false); onDelete(); }} style={s.destructiveBtn}>
            <Trash2 size={11} color="#fff" />
            <Text style={s.btnText}>Delete</Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
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
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<any>(null);

  const update = (k: keyof Promotion, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const toggleAudience = (a: Audience) => {
    setForm((f) => {
      const has = f.audience.includes(a);
      let next = has ? f.audience.filter((x) => x !== a) : [...f.audience, a];
      // "all" is exclusive
      if (a === 'all' && !has) next = ['all'];
      else if (a !== 'all' && next.includes('all')) next = next.filter((x) => x !== 'all');
      if (next.length === 0) next = ['all'];
      return { ...f, audience: next };
    });
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = fileRef.current;
    if (!el) return;
    const h = (e: any) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { setError('Choose a PNG / JPG / SVG'); return; }
      if (f.size > 2_000_000)       { setError('Image must be under 2 MB'); return; }
      setError(null);
      const r = new FileReader();
      r.onload = () => update('image_url', String(r.result));
      r.readAsDataURL(f);
    };
    el.addEventListener('change', h);
    return () => el.removeEventListener('change', h);
  }, []);

  const submit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (form.audience.length === 0) { setError('Pick at least one audience'); return; }
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

  const previewTone = TONE_PREVIEW[form.tone] || TONE_PREVIEW.violet;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBg}>
        <Animated.View entering={FadeInDown.duration(220)} style={s.modalCard}>
          <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
            <IconBox size={40}><Megaphone size={20} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.modalTitle}>{isCreate ? 'New promotion' : 'Edit promotion'}</Text>
              <Text style={s.muted}>
                {isCreate
                  ? 'Compose the message, pick a tone, and choose which portals see it.'
                  : 'Update this promotion. Changes go live immediately.'}
              </Text>
            </View>
            <Pressable onPress={onClose}><X size={16} color={SAC.muted} /></Pressable>
          </LinearGradient>

          <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
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
                value={form.title}
                onChangeText={(v) => update('title', v)}
                placeholder="e.g. Year-end placement drive opens Friday"
                placeholderTextColor={SAC.dim}
                style={[s.input, { marginTop: 8 }]}
              />
            </View>

            {/* Body */}
            <View>
              <SectionLabel>BODY</SectionLabel>
              <TextInput
                value={form.body}
                onChangeText={(v) => update('body', v)}
                placeholder="Short supporting line shown under the title (2 lines max)."
                placeholderTextColor={SAC.dim}
                multiline
                numberOfLines={2}
                style={[s.input, { marginTop: 8, minHeight: 70 }]}
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
                  style={[s.input, { marginTop: 8 }]}
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
                  style={[s.input, { marginTop: 8 }]}
                />
              </View>
              <View style={{ flex: 2, minWidth: 240 }}>
                <SectionLabel>CTA URL (OPTIONAL)</SectionLabel>
                <TextInput
                  value={form.cta_url || ''}
                  onChangeText={(v) => update('cta_url', v)}
                  placeholder="https://… or /super-admin/imports"
                  placeholderTextColor={SAC.dim}
                  style={[s.input, { marginTop: 8 }]}
                />
              </View>
            </View>

            {/* Audience */}
            <View>
              <SectionLabel>AUDIENCE</SectionLabel>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {AUDIENCE_OPTIONS.map((a) => {
                  const active = form.audience.includes(a.id);
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
                      <Text style={s.muted}>{Math.round(form.image_url.length / 1000)} KB (base64)</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <SecondaryButton size="sm" onPress={() => fileRef.current?.click?.()}>
                          <Upload size={11} color={SAC.muted} /><Text style={s.secText}>Replace</Text>
                        </SecondaryButton>
                        <SecondaryButton size="sm" danger onPress={() => update('image_url', null)}>
                          <X size={11} color="#FCA5A5" /><Text style={[s.secText, { color: '#FCA5A5' }]}>Remove</Text>
                        </SecondaryButton>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => fileRef.current?.click?.()} style={s.imgDrop}>
                    <ImagePlus size={16} color={GRAD.to} />
                    <Text style={s.muted}>Click to upload a thumbnail · PNG / JPG · max 2 MB</Text>
                  </Pressable>
                )}
                {Platform.OS === 'web' && (
                  // @ts-ignore native input
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }} />
                )}
              </View>
            </View>

            {/* Order + Visibility + Dismissible */}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 140 }}>
                <SectionLabel>DISPLAY ORDER</SectionLabel>
                <TextInput
                  value={String(form.display_order)}
                  onChangeText={(v) => update('display_order', parseInt(v) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor={SAC.dim}
                  style={[s.input, { marginTop: 8 }]}
                />
              </View>
              <View style={{ flex: 1, minWidth: 160 }}>
                <SectionLabel>STATUS</SectionLabel>
                <Pressable onPress={() => update('is_active', !form.is_active)} style={[s.toggleRow, { marginTop: 8 }]}>
                  <View style={[s.checkBox, form.is_active && { backgroundColor: GRAD.to, borderColor: GRAD.to }]}>
                    {form.is_active && <Check size={11} color="#fff" />}
                  </View>
                  <Text style={s.checkLabel}>{form.is_active ? 'Live now' : 'Paused (not shown)'}</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1, minWidth: 160 }}>
                <SectionLabel>DISMISSIBLE</SectionLabel>
                <Pressable onPress={() => update('dismissible', !form.dismissible)} style={[s.toggleRow, { marginTop: 8 }]}>
                  <View style={[s.checkBox, form.dismissible && { backgroundColor: GRAD.to, borderColor: GRAD.to }]}>
                    {form.dismissible && <Check size={11} color="#fff" />}
                  </View>
                  <Text style={s.checkLabel}>{form.dismissible ? 'Users can close it' : 'Sticky (no close)'}</Text>
                </Pressable>
              </View>
            </View>

            {error && (
              <View style={s.warnBox}>
                <AlertTriangle size={12} color="#FCA5A5" />
                <Text style={[s.muted, { color: '#FCA5A5', flex: 1 }]}>{error}</Text>
              </View>
            )}

            <View style={s.actionsRow}>
              <SecondaryButton onPress={onClose}>
                <Text style={s.secText}>Cancel</Text>
              </SecondaryButton>
              <GradientButton onPress={submit} loading={busy}>
                <Check size={13} color="#fff" />
                <Text style={s.btnText}>{isCreate ? 'Publish' : 'Save changes'}</Text>
              </GradientButton>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Styles
 * ────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 720 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  btnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },

  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' as any },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  refreshText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },

  /* row */
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, paddingLeft: 18,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12,
    overflow: 'hidden',
  },
  rowInactive: { opacity: 0.6 },
  stripe: { position: 'absolute' as any, left: 0, top: 0, bottom: 0, width: 4 },
  orderPill: {
    width: 30, height: 24, borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  orderText: { color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 11 },
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
  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5, flexShrink: 1 },
  bodyText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' as any, marginTop: 2 },
  toneChip: { paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1 },
  toneChipText: { fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.3 },
  audChip: {
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 7,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  audChipText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10 },

  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toggleBtnOn: { borderColor: 'rgba(245,158,11,0.45)', backgroundColor: 'rgba(245,158,11,0.10)' },
  toggleText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },

  iconBtn: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  confirmBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    paddingVertical: 10, paddingHorizontal: 14, marginTop: -4,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  destructiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SAC.red, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  /* modal */
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxWidth: 720, maxHeight: '92%',
    backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}),
  },
  modalHero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },

  input: {
    color: '#fff', fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

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

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  checkBox: { width: 16, height: 16, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 11.5, flex: 1 },

  warnBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 9,
    backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)',
  },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },

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
  previewTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  previewBody:  { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 16 },
  previewCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  previewCtaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
});
