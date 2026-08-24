import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Platform, Modal, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Megaphone, Plus, Pencil, Trash2, X, Check, AlertTriangle, Eye, EyeOff, RefreshCw, ImagePlus, Upload, ArrowRight, Sparkles } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel, SearchField, StatusPill, Toast, useToast, EmptyState, LoadingBox } from '../applekit';
import { request, resolveImageUrl } from '@/src/models/services/api';
import { PromoTone } from '@/src/views/web/components/PromoBanner';

type Audience = 'student' | 'alumni' | 'college' | 'mentor' | 'super_admin' | 'all';
type Promotion = { id: string; title: string; body: string; cta_label?: string | null; cta_url?: string | null; badge?: string | null; tone: PromoTone; audience: Audience[]; placement: 'dashboard' | 'inline' | 'modal'; dismissible: boolean; is_active: boolean; starts_at?: string | null; ends_at?: string | null; display_order: number; image_url?: string | null; created_at?: string | null; updated_at?: string | null; };

const TONE_PREVIEW: Record<PromoTone, { from: string; to: string; label: string }> = { violet: { from: '#A78BFA', to: '#7C3AED', label: 'Violet' }, blue: { from: '#60A5FA', to: '#2563EB', label: 'Blue' }, indigo: { from: '#818CF8', to: '#4F46E5', label: 'Indigo' }, teal: { from: '#5EEAD4', to: '#0D9488', label: 'Teal' }, amber: { from: '#FDE68A', to: '#D97706', label: 'Amber' }, rose: { from: '#FDA4AF', to: '#E11D48', label: 'Rose' }, emerald: { from: '#6EE7B7', to: '#059669', label: 'Emerald' } };
const AUDIENCE_OPTIONS: Array<{ id: Audience; label: string }> = [{ id: 'all', label: 'Everyone' }, { id: 'student', label: 'Students' }, { id: 'alumni', label: 'Alumni' }, { id: 'college', label: 'Colleges' }, { id: 'mentor', label: 'Mentors' }, { id: 'super_admin', label: 'Super Admin' }];

export function PromotionsView() {
  const { toast, flash, hide } = useToast();
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => { setBusy(true); try { const r = await request<{ items: Promotion[] }>('/admin/promotions'); setItems((r.items || []).slice().sort((a, b) => a.display_order - b.display_order)); } catch { setItems([]); } finally { setBusy(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => { let list = items || []; if (q.trim()) { const k = q.trim().toLowerCase(); list = list.filter((p) => p.title.toLowerCase().includes(k) || p.body.toLowerCase().includes(k)); } return list; }, [items, q]);
  const replaceLocal = (next: Promotion) => setItems((cur) => (cur || []).map((p) => (p.id === next.id ? next : p)));
  const removeLocal = (id: string) => setItems((cur) => (cur || []).filter((p) => p.id !== id));

  const toggleActive = async (p: Promotion) => { const next = { ...p, is_active: !p.is_active }; replaceLocal(next); try { await request(`/admin/promotions/${p.id}`, { method: 'PATCH', body: { is_active: next.is_active } }); flash(next.is_active ? 'Promotion activated' : 'Promotion paused'); } catch { replaceLocal(p); flash('Failed to update'); } };
  const remove = async (id: string) => { const backup = items; removeLocal(id); try { await request(`/admin/promotions/${id}`, { method: 'DELETE' }); flash('Promotion deleted'); } catch { setItems(backup); flash('Delete failed'); } };

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <IconBox size={38}><Megaphone size={18} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>Promotional banners</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 720 }}>Push announcements, deals, or product updates to one or more portals. Promotions appear at the top of the dashboard view and respect each user's dismissed list.</Text></View>
          </View>
          <GradientButton onPress={() => { setEditing(blankPromo()); setCreating(true); }}><Plus size={13} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>New promotion</Text></GradientButton>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <SearchField value={q} onChange={setQ} placeholder="Search by title or body…" width={320} />
          <Pressable onPress={load} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}>
            <RefreshCw size={11} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>Refresh</Text>
          </Pressable>
        </View>
      </Card>

      {busy && !items ? (<LoadingBox />) : (filtered.length === 0) ? (<EmptyState icon={Megaphone} title="No promotions yet" sub={q ? 'No promotions match your search.' : 'Click "New promotion" to publish your first announcement to one or more portals.'} />) : (
        <View style={{ gap: 10 }}>
          {filtered.map((p) => (<PromoRow key={p.id} promo={p} onEdit={() => { setEditing(p); setCreating(false); }} onToggle={() => toggleActive(p)} onDelete={() => remove(p.id)} />))}
        </View>
      )}

      {editing && (<PromoEditor initial={editing} isCreate={creating} onClose={() => { setEditing(null); setCreating(false); }} onSaved={(saved, mode) => { if (mode === 'created') { setItems((cur) => [...(cur || []), saved].sort((a, b) => a.display_order - b.display_order)); flash('Promotion created'); } else { replaceLocal(saved); flash('Promotion updated'); } setEditing(null); setCreating(false); }} />)}

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

function blankPromo(): Promotion { return { id: '', title: '', body: '', cta_label: '', cta_url: '', badge: '', tone: 'violet', audience: ['all'], placement: 'dashboard', dismissible: true, is_active: true, display_order: 100, starts_at: null, ends_at: null, image_url: null }; }

function PromoRow({ promo, onEdit, onToggle, onDelete }: { promo: Promotion; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const tone = TONE_PREVIEW[promo.tone] || TONE_PREVIEW.violet;
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <Animated.View entering={FadeIn.duration(160)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, paddingLeft: 18, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12, overflow: 'hidden', ...(!promo.is_active ? { opacity: 0.6 } : {}) }}>
        <LinearGradient colors={[tone.from, tone.to]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 }} />
        <View style={{ width: 30, height: 24, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.10)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 11 }}>{promo.display_order}</Text></View>
        {promo.image_url ? (<Image source={{ uri: resolveImageUrl(promo.image_url) }} style={{ width: 56, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' }} resizeMode="cover" />) : (<View style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.from + '22', borderColor: tone.from + '55' }}><Sparkles size={15} color={tone.from} /></View>)}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {promo.badge ? (<View style={{ paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start', backgroundColor: tone.from + '22', borderColor: tone.from + '55' }}><Text style={{ fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.6, color: tone.from }}>{promo.badge}</Text></View>) : null}
            <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5, flexShrink: 1 }} numberOfLines={1}>{promo.title}</Text>
          </View>
          {!!promo.body && <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 17 }} numberOfLines={2}>{promo.body}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1, backgroundColor: tone.from + '15', borderColor: tone.from + '40' }}><Text style={{ fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.3, color: tone.from }}>{tone.label}</Text></View>
            {promo.audience.slice(0, 4).map((a) => (<View key={a} style={{ paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 7, borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.03)' }}><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10 }}>{AUDIENCE_OPTIONS.find((x) => x.id === a)?.label || a}</Text></View>))}
            {promo.audience.length > 4 && <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>+{promo.audience.length - 4} more</Text>}
            {promo.is_active ? (<StatusPill kind="success" label="Live" dot />) : (<StatusPill kind="warn" label="Paused" />)}
          </View>
        </View>
        <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: promo.is_active ? 'rgba(245,158,11,0.45)' : SAC.border, backgroundColor: promo.is_active ? 'rgba(245,158,11,0.10)' : SAC.cardSolid, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}>
          {promo.is_active ? <Eye size={12} color={GRAD.to} /> : <EyeOff size={12} color={SAC.muted} />}
          <Text style={{ color: promo.is_active ? GRAD.to : SAC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{promo.is_active ? 'Live' : 'Paused'}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={onEdit} style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><Pencil size={12} color={SAC.muted} /></Pressable>
          <Pressable onPress={() => setConfirmDel(true)} style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)', backgroundColor: SAC.cardSolid, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><Trash2 size={12} color="#FCA5A5" /></Pressable>
        </View>
      </View>
      {confirmDel && (
        <Animated.View entering={FadeIn.duration(160)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingVertical: 10, paddingHorizontal: 14, marginTop: -4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.06)' }}>
          <AlertTriangle size={13} color="#FCA5A5" /><Text style={{ color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 11.5, flex: 1 }}>Delete "{promo.title}"? This cannot be undone.</Text>
          <SecondaryButton size="sm" onPress={() => setConfirmDel(false)}><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text></SecondaryButton>
          <Pressable onPress={() => { setConfirmDel(false); onDelete(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SAC.red, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}>
            <Trash2 size={11} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>Delete</Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function PromoEditor({ initial, isCreate, onClose, onSaved }: { initial: Promotion; isCreate: boolean; onClose: () => void; onSaved: (p: Promotion, mode: 'created' | 'updated') => void }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<any>(null);
  const update = (k: keyof Promotion, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleAudience = (a: Audience) => { setForm((f) => { const has = f.audience.includes(a); let next = has ? f.audience.filter((x) => x !== a) : [...f.audience, a]; if (a === 'all' && !has) next = ['all']; else if (a !== 'all' && next.includes('all')) next = next.filter((x) => x !== 'all'); if (next.length === 0) next = ['all']; return { ...f, audience: next }; }); };

  useEffect(() => { if (Platform.OS !== 'web') return; const el = fileRef.current; if (!el) return; const h = (e: any) => { const f = e.target.files?.[0]; if (!f) return; if (!/^image\//.test(f.type)) { setError('Choose a PNG / JPG / SVG'); return; } if (f.size > 2_000_000) { setError('Image must be under 2 MB'); return; } setError(null); const r = new FileReader(); r.onload = () => update('image_url', String(r.result)); r.readAsDataURL(f); }; el.addEventListener('change', h); return () => el.removeEventListener('change', h); }, []);

  const submit = async () => { if (!form.title.trim()) { setError('Title is required'); return; } if (form.audience.length === 0) { setError('Pick at least one audience'); return; } setBusy(true); setError(null); try { const payload: any = { title: form.title.trim(), body: form.body || '', cta_label: form.cta_label || null, cta_url: form.cta_url || null, badge: form.badge || null, tone: form.tone, audience: form.audience, placement: form.placement, dismissible: form.dismissible, is_active: form.is_active, display_order: form.display_order || 100, image_url: form.image_url || null }; let saved: Promotion; if (isCreate) { saved = await request<Promotion>('/admin/promotions', { method: 'POST', body: payload }); onSaved(saved, 'created'); } else { saved = await request<Promotion>(`/admin/promotions/${initial.id}`, { method: 'PATCH', body: payload }); onSaved(saved, 'updated'); } } catch (e: any) { setError(String(e?.message || e)); } finally { setBusy(false); } };

  const previewTone = TONE_PREVIEW[form.tone] || TONE_PREVIEW.violet;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}) }}>
        <Animated.View entering={FadeInDown.duration(220)} style={{ width: '100%', maxWidth: 720, maxHeight: '92%', backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}) }}>
          <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border }}>
            <IconBox size={40}><Megaphone size={20} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>{isCreate ? 'New promotion' : 'Edit promotion'}</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>{isCreate ? 'Compose the message, pick a tone, and choose which portals see it.' : 'Update this promotion. Changes go live immediately.'}</Text></View>
            <Pressable onPress={onClose}><X size={16} color={SAC.muted} /></Pressable>
          </LinearGradient>
          <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View>
              <SectionLabel>LIVE PREVIEW</SectionLabel>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, paddingVertical: 12, paddingHorizontal: 16, paddingLeft: 18, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(15,20,38,0.78)', overflow: 'hidden', borderColor: previewTone.from + '55' }}>
                <LinearGradient colors={[previewTone.from, previewTone.to]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 }} />
                {form.image_url ? (<Image source={{ uri: form.image_url }} style={{ width: 56, height: 40, borderRadius: 8 }} resizeMode="cover" />) : (<View style={{ width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: previewTone.from + '22', borderColor: previewTone.from + '55' }}><Sparkles size={16} color={previewTone.from} /></View>)}
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {form.badge ? (<View style={{ paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start', backgroundColor: previewTone.from + '22', borderColor: previewTone.from + '55' }}><Text style={{ fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.6, color: previewTone.from }}>{form.badge}</Text></View>) : null}
                    <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 }}>{form.title || 'Preview title'}</Text>
                  </View>
                  {!!form.body && <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 16 }}>{form.body}</Text>}
                </View>
                {form.cta_label ? (<LinearGradient colors={[previewTone.from, previewTone.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 }}>{form.cta_label}</Text><ArrowRight size={11} color="#fff" /></LinearGradient>) : null}
              </View>
            </View>
            <View><SectionLabel>TITLE</SectionLabel><TextInput value={form.title} onChangeText={(v) => update('title', v)} placeholder="e.g. Year-end placement drive opens Friday" placeholderTextColor={SAC.dim} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }} /></View>
            <View><SectionLabel>BODY</SectionLabel><TextInput value={form.body} onChangeText={(v) => update('body', v)} placeholder="Short supporting line shown under the title (2 lines max)." placeholderTextColor={SAC.dim} multiline numberOfLines={2} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, minHeight: 70, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }} /></View>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}><SectionLabel>BADGE (OPTIONAL)</SectionLabel><TextInput value={form.badge || ''} onChangeText={(v) => update('badge', v)} placeholder="NEW · DEAL · BETA" placeholderTextColor={SAC.dim} maxLength={12} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }} /></View>
              <View style={{ flex: 2, minWidth: 240 }}><SectionLabel>TONE</SectionLabel><View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>{(Object.keys(TONE_PREVIEW) as PromoTone[]).map((t) => { const tp = TONE_PREVIEW[t]; const active = form.tone === t; return (<Pressable key={t} onPress={() => update('tone', t)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: active ? tp.from : SAC.border, backgroundColor: active ? tp.from + '22' : SAC.cardSolid, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><LinearGradient colors={[tp.from, tp.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 14, height: 14, borderRadius: 4 }} /><Text style={{ color: active ? tp.from : SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 }}>{tp.label}</Text></Pressable>); })}</View></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}><SectionLabel>CTA LABEL (OPTIONAL)</SectionLabel><TextInput value={form.cta_label || ''} onChangeText={(v) => update('cta_label', v)} placeholder="Learn more" placeholderTextColor={SAC.dim} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }} /></View>
              <View style={{ flex: 2, minWidth: 240 }}><SectionLabel>CTA URL (OPTIONAL)</SectionLabel><TextInput value={form.cta_url || ''} onChangeText={(v) => update('cta_url', v)} placeholder="https://… or /super-admin/imports" placeholderTextColor={SAC.dim} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }} /></View>
            </View>
            <View><SectionLabel>AUDIENCE</SectionLabel><View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>{AUDIENCE_OPTIONS.map((a) => { const active = form.audience.includes(a.id); return (<Pressable key={a.id} onPress={() => toggleAudience(a.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: active ? 'rgba(245,158,11,0.50)' : SAC.border, backgroundColor: active ? 'rgba(245,158,11,0.10)' : SAC.cardSolid, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}>{active && <Check size={11} color={GRAD.to} />}<Text style={{ color: active ? GRAD.to : SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 }}>{a.label}</Text></Pressable>); })}</View></View>
            <View><SectionLabel>IMAGE (OPTIONAL)</SectionLabel><View style={{ marginTop: 8 }}>{form.image_url ? (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid }}><Image source={{ uri: form.image_url }} style={{ width: 90, height: 50, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' }} resizeMode="cover" /><View style={{ flex: 1, gap: 6 }}><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>{Math.round(form.image_url.length / 1000)} KB (base64)</Text><View style={{ flexDirection: 'row', gap: 6 }}><SecondaryButton size="sm" onPress={() => fileRef.current?.click?.()}><Upload size={11} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Replace</Text></SecondaryButton><SecondaryButton size="sm" danger onPress={() => update('image_url', null)}><X size={11} color="#FCA5A5" /><Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12 }}>Remove</Text></SecondaryButton></View></View></View>) : (<Pressable onPress={() => fileRef.current?.click?.()} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: SAC.border2, backgroundColor: SAC.cardSolid, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><ImagePlus size={16} color={GRAD.to} /><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>Click to upload a thumbnail · PNG / JPG · max 2 MB</Text></Pressable>)}{Platform.OS === 'web' && (<input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }} />)}</View></View>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 140 }}><SectionLabel>DISPLAY ORDER</SectionLabel><TextInput value={String(form.display_order)} onChangeText={(v) => update('display_order', parseInt(v) || 0)} keyboardType="numeric" placeholderTextColor={SAC.dim} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }} /></View>
              <View style={{ flex: 1, minWidth: 160 }}><SectionLabel>STATUS</SectionLabel><Pressable onPress={() => update('is_active', !form.is_active)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, marginTop: 8, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><View style={{ width: 16, height: 16, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2, alignItems: 'center', justifyContent: 'center', ...(form.is_active ? { backgroundColor: GRAD.to, borderColor: GRAD.to } : {}) }}>{form.is_active && <Check size={11} color="#fff" />}</View><Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 11.5, flex: 1 }}>{form.is_active ? 'Live now' : 'Paused (not shown)'}</Text></Pressable></View>
              <View style={{ flex: 1, minWidth: 160 }}><SectionLabel>DISMISSIBLE</SectionLabel><Pressable onPress={() => update('dismissible', !form.dismissible)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, marginTop: 8, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><View style={{ width: 16, height: 16, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2, alignItems: 'center', justifyContent: 'center', ...(form.dismissible ? { backgroundColor: GRAD.to, borderColor: GRAD.to } : {}) }}>{form.dismissible && <Check size={11} color="#fff" />}</View><Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 11.5, flex: 1 }}>{form.dismissible ? 'Users can close it' : 'Sticky (no close)'}</Text></Pressable></View>
            </View>
            {error && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 9, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)' }}><AlertTriangle size={12} color="#FCA5A5" /><Text style={{ color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 11.5, flex: 1 }}>{error}</Text></View>)}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}><SecondaryButton onPress={onClose}><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text></SecondaryButton><GradientButton onPress={submit} loading={busy}><Check size={13} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>{isCreate ? 'Publish' : 'Save changes'}</Text></GradientButton></View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
