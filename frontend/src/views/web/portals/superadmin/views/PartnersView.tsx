import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Platform, Modal, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Handshake, Plus, Pencil, Trash2, X, Check, Upload, ArrowUp, ArrowDown, GraduationCap, Building2, Sparkles, GripVertical, AlertTriangle, Eye, EyeOff, ImagePlus, RefreshCw, Search } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel, TopTabs, SearchField, StatusPill, Toast, useToast, EmptyState, LoadingBox } from '../applekit';
import { request, resolveImageUrl } from '@/src/models/services/api';
import { useSubTab } from '@/src/views/web/portals/portalUrl';

type PartnerCategory = 'college' | 'company' | 'sponsor';
type Partner = { id: string; name: string; category: PartnerCategory; logo_url: string; logo_white_url?: string | null; display_order: number; is_active: boolean; created_at?: string | null; updated_at?: string | null; };
const CAT_META: Record<PartnerCategory, { label: string; color: string; Icon: any }> = { college: { label: 'Academic', color: '#A78BFA', Icon: GraduationCap }, company: { label: 'Collaboration', color: '#3B82F6', Icon: Building2 }, sponsor: { label: 'Sponsor', color: '#F59E0B', Icon: Sparkles } };
const TAB_OPTIONS = [{ id: 'all', label: 'All' }, { id: 'college', label: 'Academic' }, { id: 'company', label: 'Collaboration' }, { id: 'sponsor', label: 'Sponsor' }] as const;
type TabId = (typeof TAB_OPTIONS)[number]['id'];

export function PartnersView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const { toast, flash, hide } = useToast();
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useSubTab<TabId>(['all', 'college', 'company', 'sponsor'], 'all', { sub, onSub });
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partner | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => { setBusy(true); try { const r = await request<{ items: Partner[] }>('/admin/partners'); setPartners((r.items || []).slice().sort((a, b) => a.display_order - b.display_order)); } catch { setPartners([]); } finally { setBusy(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => { let list = partners || []; if (tab !== 'all') list = list.filter((p) => p.category === tab); if (q.trim()) { const k = q.trim().toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(k)); } return list; }, [partners, tab, q]);
  const replaceLocal = (next: Partner) => setPartners((cur) => (cur || []).map((p) => (p.id === next.id ? next : p)));
  const removeLocal = (id: string) => setPartners((cur) => (cur || []).filter((p) => p.id !== id));

  const persistReorder = async (orderedIds: string[]) => { try { await request('/admin/partners/reorder', { method: 'POST', body: { ordered_ids: orderedIds } }); flash('Order saved'); } catch { flash('Reorder failed'); load(); } };
  const moveBy = (idx: number, delta: -1 | 1) => { if (!partners) return; const list = partners.slice(); const target = idx + delta; if (target < 0 || target >= list.length) return; [list[idx], list[target]] = [list[target], list[idx]]; list.forEach((p, i) => { p.display_order = (i + 1) * 10; }); setPartners(list); persistReorder(list.map((p) => p.id)); };
  const moveTo = (sourceId: string, targetId: string) => { if (!partners || sourceId === targetId) return; const list = partners.slice(); const src = list.findIndex((p) => p.id === sourceId); const tgt = list.findIndex((p) => p.id === targetId); if (src < 0 || tgt < 0) return; const [moved] = list.splice(src, 1); list.splice(tgt, 0, moved); list.forEach((p, i) => { p.display_order = (i + 1) * 10; }); setPartners(list); persistReorder(list.map((p) => p.id)); };

  const toggleActive = async (p: Partner) => { const next = { ...p, is_active: !p.is_active }; replaceLocal(next); try { await request(`/admin/partners/${p.id}`, { method: 'PATCH', body: { is_active: next.is_active } }); flash(next.is_active ? 'Activated' : 'Deactivated'); } catch { replaceLocal(p); flash('Failed to update'); } };
  const remove = async (id: string) => { const backup = partners; removeLocal(id); try { await request(`/admin/partners/${id}`, { method: 'DELETE' }); flash('Partner deleted'); } catch { setPartners(backup); flash('Delete failed'); } };

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <IconBox size={38}><Handshake size={18} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>Collaboration Partners</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 720 }}>Logos displayed on the public landing page and the dashboard footer of every portal. Reorder using arrows or drag-and-drop, toggle visibility, or upload new partners with Base64 logos.</Text></View>
          </View>
          <GradientButton onPress={() => { setEditing({} as Partner); setCreating(true); }}><Plus size={13} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>Add partner</Text></GradientButton>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <TopTabs<TabId> tabs={TAB_OPTIONS as any} active={tab} onChange={setTab} />
          <SearchField value={q} onChange={setQ} placeholder="Search by name…" width={280} />
          <Pressable onPress={load} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}>
            <RefreshCw size={11} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>Refresh</Text>
          </Pressable>
        </View>
      </Card>

      {busy && !partners ? (<LoadingBox />) : (filtered.length === 0) ? (<EmptyState icon={Handshake} title="No partners yet" sub={q || tab !== 'all' ? 'No partners match the current filter. Try a different category or clear the search.' : 'Click "Add partner" to upload your first collaboration logo. It will appear instantly on the landing page and dashboard footers.'} />) : (
        <View style={{ gap: 10 }}>
          {filtered.map((p, idx) => { const globalIdx = (partners || []).findIndex((x) => x.id === p.id); return (<PartnerRow key={p.id} partner={p} globalIdx={globalIdx} totalCount={(partners || []).length} onMoveUp={() => moveBy(globalIdx, -1)} onMoveDown={() => moveBy(globalIdx, 1)} onMoveTo={moveTo} onEdit={() => { setEditing(p); setCreating(false); }} onToggleActive={() => toggleActive(p)} onDelete={() => remove(p.id)} canFilter={tab !== 'all' || !!q.trim()} />); })}
        </View>
      )}

      {editing && (<PartnerEditor initial={editing} isCreate={creating} onClose={() => { setEditing(null); setCreating(false); }} onSaved={(p, mode) => { if (mode === 'created') { setPartners((cur) => [...(cur || []), p].sort((a, b) => a.display_order - b.display_order)); flash('Partner added'); } else { replaceLocal(p); flash('Partner updated'); } setEditing(null); setCreating(false); }} />)}

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

function PartnerRow({ partner, globalIdx, totalCount, onMoveUp, onMoveDown, onMoveTo, onEdit, onToggleActive, onDelete, canFilter }: { partner: Partner; globalIdx: number; totalCount: number; onMoveUp: () => void; onMoveDown: () => void; onMoveTo: (sourceId: string, targetId: string) => void; onEdit: () => void; onToggleActive: () => void; onDelete: () => void; canFilter: boolean }) {
  const cat = CAT_META[partner.category];
  const Icon = cat.Icon;
  const [confirmDel, setConfirmDel] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const dragHandlers = (Platform.OS === 'web' && !canFilter) ? { draggable: true, onDragStart: (e: any) => { e.dataTransfer.setData('partner-id', partner.id); e.dataTransfer.effectAllowed = 'move'; }, onDragOver: (e: any) => { e.preventDefault(); setDragOver(true); }, onDragLeave: () => setDragOver(false), onDrop: (e: any) => { e.preventDefault(); setDragOver(false); const sourceId = e.dataTransfer.getData('partner-id'); if (sourceId && sourceId !== partner.id) onMoveTo(sourceId, partner.id); } } as any : {};

  return (
    <Animated.View entering={FadeIn.duration(160)}>
      <View {...dragHandlers} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12, ...(Platform.OS === 'web' ? ({ transitionDuration: '160ms' } as any) : {}), ...(!partner.is_active ? { opacity: 0.62, backgroundColor: 'rgba(255,255,255,0.02)' } : {}), ...(dragOver ? { borderColor: GRAD.to, backgroundColor: 'rgba(245,158,11,0.06)' } : {}) }}>
        {Platform.OS === 'web' && !canFilter && (<View style={{ width: 18, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'grab' } as any) : {}) }}><GripVertical size={14} color={SAC.dim} /></View>)}
        <View style={{ width: 30, height: 24, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.10)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 11 }}>{globalIdx + 1}</Text></View>
        <View style={{ gap: 3 }}>
          <Pressable onPress={onMoveUp} disabled={globalIdx === 0} style={{ width: 22, height: 18, borderRadius: 6, backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...(globalIdx === 0 ? { opacity: 0.4, ...(Platform.OS === 'web' ? ({ cursor: 'not-allowed' } as any) : {}) } : { ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }) }}>
            <ArrowUp size={12} color={globalIdx === 0 ? SAC.dim : SAC.muted} />
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={globalIdx === totalCount - 1} style={{ width: 22, height: 18, borderRadius: 6, backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...(globalIdx === totalCount - 1 ? { opacity: 0.4, ...(Platform.OS === 'web' ? ({ cursor: 'not-allowed' } as any) : {}) } : { ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }) }}>
            <ArrowDown size={12} color={globalIdx === totalCount - 1 ? SAC.dim : SAC.muted} />
          </Pressable>
        </View>
        <View style={{ width: 78, height: 44, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
          {partner.logo_url ? (<Image source={{ uri: resolveImageUrl(partner.logo_url) }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />) : (<ImagePlus size={18} color={SAC.dim} />)}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 }} numberOfLines={1}>{partner.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start', backgroundColor: cat.color + '22', borderColor: cat.color + '55' }}>
              <Icon size={10} color={cat.color} /><Text style={{ fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.3, color: cat.color }}>{cat.label}</Text>
            </View>
            {partner.is_active ? (<StatusPill kind="success" label="Live" dot />) : (<StatusPill kind="warn" label="Hidden" />)}
          </View>
        </View>
        <Pressable onPress={onToggleActive} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: partner.is_active ? 'rgba(245,158,11,0.45)' : SAC.border, backgroundColor: partner.is_active ? 'rgba(245,158,11,0.10)' : SAC.cardSolid, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}>
          {partner.is_active ? <Eye size={12} color={GRAD.to} /> : <EyeOff size={12} color={SAC.muted} />}
          <Text style={{ color: partner.is_active ? GRAD.to : SAC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{partner.is_active ? 'Visible' : 'Hidden'}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={onEdit} style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><Pencil size={12} color={SAC.muted} /></Pressable>
          <Pressable onPress={() => setConfirmDel(true)} style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)', backgroundColor: SAC.cardSolid, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><Trash2 size={12} color="#FCA5A5" /></Pressable>
        </View>
      </View>
      {confirmDel && (
        <Animated.View entering={FadeIn.duration(160)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingVertical: 10, paddingHorizontal: 14, marginTop: -4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.06)' }}>
          <AlertTriangle size={13} color="#FCA5A5" /><Text style={{ color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 11.5, flex: 1 }}>Delete "{partner.name}"? This cannot be undone.</Text>
          <SecondaryButton size="sm" onPress={() => setConfirmDel(false)}><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text></SecondaryButton>
          <Pressable onPress={() => { setConfirmDel(false); onDelete(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SAC.red, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}>
            <Trash2 size={11} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>Delete</Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function PartnerEditor({ initial, isCreate, onClose, onSaved }: { initial: Partner; isCreate: boolean; onClose: () => void; onSaved: (p: Partner, mode: 'created' | 'updated') => void }) {
  const [form, setForm] = useState({ name: initial?.name || '', category: (initial?.category as PartnerCategory) || 'company', logo_url: initial?.logo_url || '', logo_white_url: initial?.logo_white_url || '', display_order: initial?.display_order ?? 100, is_active: initial?.is_active ?? true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorFileRef = useRef<any>(null);
  const whiteFileRef = useRef<any>(null);
  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const readAsDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file); });

  useEffect(() => { if (Platform.OS !== 'web') return; const c = colorFileRef.current; const w = whiteFileRef.current; const wire = (el: any, target: 'logo_url' | 'logo_white_url') => { if (!el) return () => {}; const handler = async (e: any) => { const f = e.target.files?.[0]; if (!f) return; if (!/^image\//.test(f.type)) { setError('Please choose an image file (PNG, JPG, SVG)'); return; } if (f.size > 2_000_000) { setError('Logo must be under 2 MB'); return; } setError(null); const dataUri = await readAsDataURL(f); update(target, dataUri); }; el.addEventListener('change', handler); return () => el.removeEventListener('change', handler); }; const off1 = wire(c, 'logo_url'); const off2 = wire(w, 'logo_white_url'); return () => { off1(); off2(); }; }, []);

  const submit = async () => { if (!form.name.trim()) { setError('Name is required'); return; } if (!form.logo_url) { setError('Logo is required'); return; } setBusy(true); setError(null); try { const payload: any = { name: form.name.trim(), category: form.category, logo_url: form.logo_url, logo_white_url: form.logo_white_url || null, display_order: form.display_order || 100, is_active: form.is_active }; let saved: Partner; if (isCreate) { saved = await request<Partner>('/admin/partners', { method: 'POST', body: payload }); onSaved(saved, 'created'); } else { saved = await request<Partner>(`/admin/partners/${initial.id}`, { method: 'PATCH', body: payload }); onSaved(saved, 'updated'); } } catch (e: any) { setError(String(e?.message || e)); } finally { setBusy(false); } };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}) }}>
        <Animated.View entering={FadeInDown.duration(220)} style={{ width: '100%', maxWidth: 640, maxHeight: '92%', backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}) }}>
          <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border }}>
            <IconBox size={40}><Handshake size={20} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>{isCreate ? 'Add collaboration partner' : 'Edit partner'}</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>{isCreate ? 'Upload a logo and choose the category — it will appear instantly on the public landing page.' : 'Update the partner details.'}</Text></View>
            <Pressable onPress={onClose}><X size={16} color={SAC.muted} /></Pressable>
          </LinearGradient>
          <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View><SectionLabel>PARTNER NAME</SectionLabel><TextInput value={form.name} onChangeText={(v) => update('name', v)} placeholder="e.g. Acme University, Bright Pvt Ltd" placeholderTextColor={SAC.dim} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }} /></View>
            <View><SectionLabel>CATEGORY</SectionLabel><View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>{(['college', 'company', 'sponsor'] as PartnerCategory[]).map((c) => { const m = CAT_META[c]; const CatIcon = m.Icon; const active = form.category === c; return (<Pressable key={c} onPress={() => update('category', c)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: active ? m.color : SAC.border, backgroundColor: active ? m.color + '22' : SAC.cardSolid, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><CatIcon size={13} color={active ? m.color : SAC.muted} /><Text style={{ color: active ? m.color : SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{m.label}</Text></Pressable>); })}</View></View>
            <View><SectionLabel>COLOR LOGO (required)</SectionLabel><LogoPicker value={form.logo_url} onPick={() => colorFileRef.current?.click?.()} onClear={() => update('logo_url', '')} hint="Used on the landing page sponsor strip — color background recommended." />{Platform.OS === 'web' && (<input ref={colorFileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }} />)}</View>
            <View><SectionLabel>WHITE / INVERTED LOGO (optional)</SectionLabel><LogoPicker value={form.logo_white_url} onPick={() => whiteFileRef.current?.click?.()} onClear={() => update('logo_white_url', '')} hint="Used on the dark dashboard footer strip. If empty, the color logo is auto-inverted." dark />{Platform.OS === 'web' && (<input ref={whiteFileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }} />)}</View>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}><SectionLabel>DISPLAY ORDER</SectionLabel><TextInput value={String(form.display_order)} onChangeText={(v) => update('display_order', parseInt(v) || 0)} keyboardType="numeric" placeholderTextColor={SAC.dim} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }} /><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 }}>Lower numbers appear first. (You can drag to reorder after saving.)</Text></View>
              <View style={{ flex: 1, minWidth: 160 }}><SectionLabel>VISIBILITY</SectionLabel><Pressable onPress={() => update('is_active', !form.is_active)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, marginTop: 8, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}><View style={{ width: 16, height: 16, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2, alignItems: 'center', justifyContent: 'center', ...(form.is_active ? { backgroundColor: GRAD.to, borderColor: GRAD.to } : {}) }}>{form.is_active && <Check size={11} color="#fff" />}</View><Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 11.5, flex: 1 }}>{form.is_active ? 'Visible on landing & footer' : 'Hidden (saved but not shown publicly)'}</Text></Pressable></View>
            </View>
            {error && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 9, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)' }}><AlertTriangle size={12} color="#FCA5A5" /><Text style={{ color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 11.5, flex: 1 }}>{error}</Text></View>)}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}><SecondaryButton onPress={onClose}><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text></SecondaryButton><GradientButton onPress={submit} loading={busy}><Check size={13} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>{isCreate ? 'Add partner' : 'Save changes'}</Text></GradientButton></View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function LogoPicker({ value, onPick, onClear, hint, dark }: { value?: string; onPick: () => void; onClear: () => void; hint: string; dark?: boolean }) {
  return (
    <View style={{ marginTop: 8, gap: 8 }}>
      {value ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, backgroundColor: dark ? '#0a0f1e' : '#fff', ...(dark ? { borderColor: SAC.border2 } : {}) }}>
          <Image source={{ uri: value }} style={{ width: 110, height: 50 }} resizeMode="contain" />
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>Logo uploaded · {Math.round((value.length / 1000))} KB (base64)</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <SecondaryButton size="sm" onPress={onPick}><Upload size={11} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Replace</Text></SecondaryButton>
              <SecondaryButton size="sm" danger onPress={onClear}><X size={11} color="#FCA5A5" /><Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12 }}>Remove</Text></SecondaryButton>
            </View>
          </View>
        </View>
      ) : (
        <Pressable onPress={onPick} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: SAC.border2, backgroundColor: dark ? 'rgba(0,0,0,0.35)' : SAC.cardSolid, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }}>
          <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}><ImagePlus size={18} color={GRAD.to} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 }}>Click to upload</Text>
            <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>{hint}</Text>
            <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 }}>PNG · JPG · SVG · max 2 MB</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
