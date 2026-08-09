/**
 * CouponBanner — cross-portal coupon display.
 *
 * Loads active coupons and renders each as a clickable image card. Clicking a
 * card opens a modal with the full redemption info: code, discount, partner
 * website link, and step-by-step instructions.
 *
 * When `editable` is true (super admin Overview), it fetches the full coupon
 * list via /admin/coupons and shows an inline "+ Add Coupon" button plus
 * edit/delete controls on each card, mirroring the Advertisement Board manager.
 *
 * Mounted on every role's dashboard (student / alumni / mentor / college /
 * super_admin). The editable variant is mounted on the super admin Overview
 * page only.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Image, Modal, Linking, ScrollView, TextInput, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Ticket, ExternalLink, X, Copy, Check, Tag, Plus, Pencil, Trash2, Save, Upload, AlertTriangle } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { uploadImage } from '@/src/lib/image';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export type Coupon = {
  id: string;
  code: string;
  description?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_pct?: number;
  max_uses?: number;
  used_count?: number;
  expires_at?: string | null;
  image_url?: string | null;
  partner_name?: string | null;
  partner_website_url?: string | null;
  instructions?: string;
  audience?: string[];
  active?: boolean;
};

function discountLabel(c: Coupon): string {
  if (c.discount_type === 'fixed' && c.discount_pct)
    return `$${c.discount_pct}`;
  if (c.discount_pct)
    return `${c.discount_pct}% OFF`;
  return 'DEAL';
}

function CouponModal({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyCode = useCallback(() => {
    if (Platform.OS !== 'web') return;
    try {
      window.navigator.clipboard.writeText(coupon?.code || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  }, [coupon]);

  const openPartner = useCallback(() => {
    if (!coupon?.partner_website_url) return;
    if (Platform.OS === 'web') {
      window.open(coupon.partner_website_url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(coupon.partner_website_url).catch(() => {});
    }
  }, [coupon]);

  if (!coupon) return null;

  const steps = (coupon.instructions || '')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <Pressable style={m.backdrop} onPress={onClose} />
        <View style={m.box}>
          {/* Header image */}
          <View style={m.heroWrap}>
            {coupon.image_url ? (
              <Image source={{ uri: coupon.image_url }} style={m.hero} resizeMode="contain" />
            ) : (
              <View style={[m.hero, m.heroFallback]}>
                <Ticket size={44} color="#A78BFA" />
                <Text style={m.heroFallbackText}>Special Offer</Text>
              </View>
            )}
            <Pressable style={m.close} onPress={onClose}>
              <X size={16} color="#fff" />
            </Pressable>
            <View style={m.badge}>
              <Text style={m.badgeText}>
                {discountLabel(coupon)}
              </Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 420 }}>
            <View style={m.body}>
              <Text style={m.partner}>
                {coupon.partner_name || 'Partner Offer'}
              </Text>
              <Text style={m.title}>{coupon.description || 'Exclusive discount for you'}</Text>

              {/* Code + copy */}
              <View style={m.codeRow}>
                <Text style={m.codeLabel}>Coupon Code</Text>
                <View style={m.codeBox}>
                  <Text style={m.code}>{coupon.code}</Text>
                  <Pressable onPress={copyCode} style={m.copyBtn}>
                    {copied
                      ? <Check size={14} color="#34D399" />
                      : <Copy size={14} color="#A78BFA" />}
                    <Text style={[m.copyText, copied && { color: '#34D399' }]}>
                      {copied ? 'Copied' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Usage meta */}
              <View style={m.metaRow}>
                <Text style={m.meta}>
                  {coupon.max_uses
                    ? `Used ${coupon.used_count || 0}/${coupon.max_uses}`
                    : 'Unlimited uses'}
                </Text>
                {coupon.expires_at ? (
                  <Text style={m.meta}>
                    Expires {new Date(coupon.expires_at).toLocaleDateString()}
                  </Text>
                ) : null}
              </View>

              {/* Instructions */}
              {steps.length > 0 && (
                <View style={m.steps}>
                  <Text style={m.stepsTitle}>How to redeem</Text>
                  {steps.map((step, i) => (
                    <View key={i} style={m.stepRow}>
                      <View style={m.stepNum}><Text style={m.stepNumText}>{i + 1}</Text></View>
                      <Text style={m.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Partner CTA */}
              {coupon.partner_website_url ? (
                <Pressable onPress={openPartner} style={m.cta}>
                  <ExternalLink size={15} color="#fff" />
                  <Text style={m.ctaText}>
                    Visit {coupon.partner_name || 'Partner'} Website
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const AUDIENCE_OPTIONS = [
  { id: 'all', label: 'Everyone' },
  { id: 'student', label: 'Students' },
  { id: 'alumni', label: 'Alumni' },
  { id: 'mentor', label: 'Mentors' },
  { id: 'college', label: 'Colleges' },
  { id: 'super_admin', label: 'Super Admins' },
];

function CouponEditor({
  coupon, onClose, onSaved, onError,
}: {
  coupon: Coupon | null;
  onClose: () => void;
  onSaved: (created?: Coupon | null) => void;
  onError: (msg: string) => void;
}) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [maxUses, setMaxUses] = useState('100');
  const [imageUrl, setImageUrl] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerWebsite, setPartnerWebsite] = useState('');
  const [instructions, setInstructions] = useState('');
  const [audience, setAudience] = useState<string[]>(['all']);
  const [expiresAt, setExpiresAt] = useState('');
  const [activeToggle, setActiveToggle] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<any>(null);

  const handleFileSelect = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'coupons');
      setImageUrl(url);
    } catch {
      // upload failed silently
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code);
      setDescription(coupon.description || '');
      setDiscountType(coupon.discount_type === 'fixed' ? 'fixed' : 'percentage');
      setDiscountValue(String(coupon.discount_pct ?? 0));
      setMaxUses(String(coupon.max_uses || 1));
      setImageUrl(coupon.image_url || '');
      setPartnerName(coupon.partner_name || '');
      setPartnerWebsite(coupon.partner_website_url || '');
      setInstructions(coupon.instructions || '');
      setAudience(coupon.audience?.length ? coupon.audience : ['all']);
      setExpiresAt(coupon.expires_at || '');
      setActiveToggle(coupon.active ?? true);
    } else {
      setCode(''); setDescription(''); setDiscountType('percentage'); setDiscountValue('10'); setMaxUses('100');
      setImageUrl(''); setPartnerName(''); setPartnerWebsite(''); setInstructions('');
      setAudience(['all']); setExpiresAt(''); setActiveToggle(true);
    }
  }, [coupon]);

  const toggleAudience = (a: string) => {
    if (a === 'all') { setAudience(['all']); return; }
    setAudience((prev) => {
      const has = prev.includes(a);
      const next = has ? prev.filter((x) => x !== a) : [...prev.filter((x) => x !== 'all'), a];
      return next.length ? next : ['all'];
    });
  };

  const handleSave = async () => {
    if (!code.trim() || saving) return;
    setSaving(true);
    const payload: any = {
      description, discount_type: discountType, discount_pct: parseInt(discountValue) || 0, max_uses: parseInt(maxUses) || 1,
      image_url: imageUrl.trim() || null, partner_name: partnerName.trim() || null,
      partner_website_url: partnerWebsite.trim() || null,
      instructions: instructions.trim(), audience, expires_at: expiresAt || null,
      active: activeToggle,
    };
    try {
      if (coupon) {
        await request(`/admin/coupons/${coupon.id}`, { method: 'PATCH', body: payload });
        onSaved(null);
      } else {
        const res = await request<{ coupon?: Coupon }>('/admin/coupons', { method: 'POST', body: { code: code.toUpperCase(), ...payload } });
        onSaved(res?.coupon || null);
      }
      onClose();
    } catch (e: any) {
      onError(e?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <Pressable style={m.backdrop} onPress={onClose} />
        <ScrollView style={{ maxHeight: '90%', width: '92%', maxWidth: 560 }} contentContainerStyle={{ alignItems: 'center' }}>
          <View style={[m.editBox, { width: '100%' }]}>
            <View style={m.editHead}>
              <Text style={m.editTitle}>{coupon ? 'Edit Coupon' : 'New Coupon'}</Text>
              <Pressable onPress={onClose} style={m.editClose}><X size={18} color="#fff" /></Pressable>
            </View>

            <Text style={m.fieldLabel}>Coupon Code</Text>
            <TextInput style={m.fieldInput} value={code} onChangeText={setCode} placeholder="e.g. STUDENT10" placeholderTextColor="rgba(255,255,255,0.35)" autoCapitalize="characters" editable={!coupon} />

            <Text style={m.fieldLabel}>Description</Text>
            <TextInput style={m.fieldInput} value={description} onChangeText={setDescription} placeholder="e.g. 10% off your first order" placeholderTextColor="rgba(255,255,255,0.35)" />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={m.fieldLabel}>Discount</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                  <Pressable
                    onPress={() => setDiscountType('percentage')}
                    style={[m.togglePill, discountType === 'percentage' && m.togglePillActive]}
                  >
                    <Text style={[m.togglePillText, discountType === 'percentage' && { color: '#fff' }]}>%</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setDiscountType('fixed')}
                    style={[m.togglePill, discountType === 'fixed' && m.togglePillActive]}
                  >
                    <Text style={[m.togglePillText, discountType === 'fixed' && { color: '#fff' }]}>$</Text>
                  </Pressable>
                  <TextInput
                    style={[m.fieldInput, { flex: 1 }]}
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    placeholder={discountType === 'percentage' ? '10' : '49'}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={m.fieldLabel}>Max Uses</Text>
                <TextInput style={[m.fieldInput, { marginTop: 5 }]} value={maxUses} onChangeText={setMaxUses} placeholder="100" placeholderTextColor="rgba(255,255,255,0.35)" keyboardType="numeric" />
              </View>
            </View>

            <Text style={m.fieldLabel}>Expires (ISO date, optional)</Text>
            <TextInput style={m.fieldInput} value={expiresAt} onChangeText={setExpiresAt} placeholder="2026-12-31T23:59:59Z" placeholderTextColor="rgba(255,255,255,0.35)" />

            <Text style={m.fieldLabel}>Partner Name</Text>
            <TextInput style={m.fieldInput} value={partnerName} onChangeText={setPartnerName} placeholder="e.g. Swiggy" placeholderTextColor="rgba(255,255,255,0.35)" />

            <Text style={m.fieldLabel}>Partner Website (redemption link)</Text>
            <TextInput style={m.fieldInput} value={partnerWebsite} onChangeText={setPartnerWebsite} placeholder="https://partner.com/coupons" placeholderTextColor="rgba(255,255,255,0.35)" autoCapitalize="none" />

            <Text style={m.fieldLabel}>Card Image</Text>
            {Platform.OS === 'web' && (
              // @ts-ignore
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" onChange={handleFileSelect} style={{ display: 'none' }} />
            )}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <Pressable onPress={() => fileRef.current?.click?.()} style={[m.uploadBtn, uploading && { opacity: 0.5 }]} disabled={uploading}>
                <Upload size={12} color="#A78BFA" />
                <Text style={m.uploadBtnText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
              </Pressable>
              <TextInput
                style={[m.fieldInput, { flex: 1 }]}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="Or paste image URL"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="none"
              />
            </View>
            {imageUrl ? (
              <View style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden' }}>
                <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 90, backgroundColor: '#070b19' }} resizeMode="contain" />
              </View>
            ) : null}

            <Text style={m.fieldLabel}>Redemption Instructions (one step per line)</Text>
            <TextInput
              style={[m.fieldInput, { minHeight: 90, textAlignVertical: 'top' }]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder={'1. Visit the partner website\n2. Add items to cart\n3. Enter the coupon code at checkout'}
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
            />

            <Text style={m.fieldLabel}>Show To (audience)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {AUDIENCE_OPTIONS.map((a) => {
                const active = audience.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => toggleAudience(a.id)}
                    style={[m.audienceChip, active && m.audienceChipActive]}
                  >
                    <Text style={[m.audienceChipText, active && { color: '#fff' }]}>{a.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => setActiveToggle((v) => !v)} style={m.activeRow}>
              <View style={[m.toggleDot, activeToggle && m.toggleDotOn]} />
              <Text style={m.activeRowText}>{activeToggle ? 'Active — visible to selected audience' : 'Inactive — hidden everywhere'}</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving || !code.trim()}
              style={[m.saveBtn, (saving || !code.trim()) && { opacity: 0.5 }]}
            >
              <Save size={14} color="#fff" />
              <Text style={m.saveBtnText}>{saving ? 'Saving...' : 'Save Coupon'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const CARDS_PER_PAGE = 4;
const CARD_GAP = 16;
const CARD_WIDTH = 270;
// Offset between the start of one 4-card page and the next: 4 cards + 4 gaps.
const PAGE_STRIDE = CARDS_PER_PAGE * (CARD_WIDTH + CARD_GAP);

export function CouponBanner({ portal, editable }: { portal: string; editable?: boolean }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selected, setSelected] = useState<Coupon | null>(null);
  const [editor, setEditor] = useState<Coupon | null | 'new'>(null);
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const toastTimer = useRef<any>(null);
  const user = useAuthStore((s) => s.user);

  const flash = useCallback((text: string, kind: 'success' | 'error' = 'success') => {
    setToast({ text, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const loadCoupons = useCallback(async () => {
    if (!user) { setCoupons([]); return; }
    try {
      const r = await request<{ coupons: Coupon[] }>(editable ? '/admin/coupons' : '/coupons/active');
      setCoupons(r.coupons || []);
    } catch {
      setCoupons([]);
    }
  }, [editable, user]);

  useEffect(() => {
    loadCoupons();
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [loadCoupons, portal]);

  const deleteCoupon = async (c: Coupon) => {
    try {
      await request(`/admin/coupons/${c.id}`, { method: 'DELETE' });
      setCoupons((prev) => prev.filter((x) => x.id !== c.id));
      flash('Coupon deleted');
    } catch (e: any) {
      flash(e?.message || 'Failed to delete coupon', 'error');
    }
  };

  const handleSaved = useCallback((created?: Coupon | null) => {
    if (created) {
      setCoupons((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      flash('Coupon created');
    } else {
      loadCoupons();
      flash('Coupon updated');
    }
  }, [flash, loadCoupons]);

  if (!editable && !coupons.length) return null;

  const totalPages = Math.ceil(coupons.length / CARDS_PER_PAGE);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentWidth = e.nativeEvent.contentSize.width;
    const containerWidth = e.nativeEvent.layoutMeasurement.width;
    const scrollX = e.nativeEvent.contentOffset.x;
    if (contentWidth <= containerWidth) {
      setCurrentPage(0);
      return;
    }
    const page = Math.round(scrollX / PAGE_STRIDE);
    setCurrentPage(Math.min(page, totalPages - 1));
  };

  const scrollToPage = (page: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ x: page * PAGE_STRIDE, animated: true });
  };

  return (
    <View style={s.wrap}>
      <View style={s.headRow}>
        <Tag size={13} color="#A78BFA" />
        <Text style={s.headText}>Exclusive Coupons{editable ? ` (${coupons.length})` : ''}</Text>
        {editable && (
          <>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setEditor('new')} style={s.addBtn}>
              <Plus size={12} color="#fff" />
              <Text style={s.addBtnText}>Add Coupon</Text>
            </Pressable>
          </>
        )}
      </View>

      {coupons.length > 0 ? (
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.row}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            snapToInterval={PAGE_STRIDE}
            decelerationRate="fast"
          >
            {coupons.map((c) => (
              <Pressable key={c.id} onPress={() => setSelected(c)} style={[s.card, editable && !c.active && s.cardInactive]}>
                <View style={s.cardImgWrap}>
                  {c.image_url ? (
                    <Image source={{ uri: c.image_url }} style={s.cardImg} resizeMode="contain" />
                  ) : (
                    <View style={[s.cardImg, s.cardImgFallback]}>
                      <Ticket size={22} color="#A78BFA" />
                    </View>
                  )}
                  {editable && (
                    <View style={s.cardAdmin}>
                      <Pressable onPress={() => setEditor(c)} style={s.cardAdminBtn} hitSlop={6}>
                        <Pencil size={11} color="#fff" />
                      </Pressable>
                      <Pressable onPress={() => deleteCoupon(c)} style={s.cardAdminBtn} hitSlop={6}>
                        <Trash2 size={11} color="#F87171" />
                      </Pressable>
                    </View>
                  )}
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardPartner} numberOfLines={1}>
                    {c.partner_name || 'Partner Offer'}
                  </Text>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {c.discount_pct ? discountLabel(c) : c.description || 'Coupon'}
                  </Text>
                  <View style={s.cardCode}>
                    <Text style={s.cardCodeText}>{c.code}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          {totalPages > 1 && (
            <View style={s.dotsRow}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => scrollToPage(i)}
                  style={[s.dot, i === currentPage && s.dotActive]}
                />
              ))}
            </View>
          )}
        </>
      ) : editable ? (
        <Text style={s.emptyText}>No coupons created yet. Click "Add Coupon" to create one.</Text>
      ) : null}

      <CouponModal coupon={selected} onClose={() => setSelected(null)} />
      {(editor === 'new' || editor) && (
        <CouponEditor
          coupon={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
          onError={(msg) => flash(msg, 'error')}
        />
      )}

      {toast && (
        <View pointerEvents="none" style={[cbToast.wrap, toast.kind === 'error' && cbToast.error]}>
          {toast.kind === 'error'
            ? <AlertTriangle size={12} color="#F87171" />
            : <Check size={12} color="#34D399" />}
          <Text style={cbToast.text}>{toast.text}</Text>
        </View>
      )}
    </View>
  );
}

const m = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  box: {
    width: '92%', maxWidth: 440, backgroundColor: '#0d1326', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: '0 24px 80px rgba(0,0,0,0.60)' } as any : {}),
  },
  heroWrap: { position: 'relative' },
  hero: { width: '100%', aspectRatio: 21 / 9, backgroundColor: '#070b19' },
  heroFallback: {
    backgroundColor: '#141a33', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  heroFallbackText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 15, color: '#fff' },
  close: {
    position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  badge: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: 'rgba(124,58,237,0.92)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12, letterSpacing: 0.6 },
  body: { padding: 20, gap: 12 },
  partner: { fontFamily: 'DMSans_800ExtraBold', fontSize: 12, color: '#A78BFA', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { fontFamily: 'DMSans_800ExtraBold', fontSize: 19, color: '#fff' },
  codeRow: { gap: 6 },
  codeLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.6 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(124,58,237,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
  },
  code: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: '#fff', letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.2)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  copyText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: '#A78BFA' },
  metaRow: { flexDirection: 'row', gap: 14 },
  meta: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  steps: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, gap: 10 },
  stepsTitle: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: '#fff' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(167,139,250,0.25)',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  stepNumText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 11, color: '#C4B5FD' },
  stepText: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 12.5, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 13,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  ctaText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 13, color: '#fff' },

  // ── Coupon editor modal ──
  editBox: {
    backgroundColor: '#0d1326', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
    ...(Platform.OS === 'web' ? { boxShadow: '0 24px 80px rgba(0,0,0,0.60)' } as any : {}),
  },
  editHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  editTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16, color: '#fff' },
  editClose: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  fieldLabel: {
    fontFamily: 'DMSans_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10, marginBottom: 5,
  },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 13,
  },
  togglePill: {
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
    backgroundColor: 'transparent', paddingHorizontal: 12, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  togglePillActive: { backgroundColor: 'rgba(124,58,237,0.25)', borderColor: '#7C3AED' },
  togglePillText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  audienceChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  audienceChipActive: { backgroundColor: 'rgba(124,58,237,0.22)', borderColor: '#7C3AED' },
  audienceChipText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  activeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toggleDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#3F4151', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleDotOn: { backgroundColor: '#34D399', borderColor: '#34D399' },
  activeRowText: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 13, marginTop: 16,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  saveBtnText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 13, color: '#fff' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(167,139,250,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  uploadBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: '#A78BFA' },
});

const s = StyleSheet.create({
  wrap: { marginBottom: 18, gap: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#7C3AED',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  addBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: '#fff' },
  emptyText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  row: { gap: CARD_GAP, paddingBottom: 4 },
  card: {
    width: CARD_WIDTH, borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(15,20,38,0.9)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    ...(Platform.OS === 'web' ? ({
      cursor: 'pointer',
      transitionDuration: '200ms',
      ':hover': { transform: 'translateY(-3px)', borderColor: 'rgba(167,139,250,0.55)', boxShadow: '0 8px 24px rgba(124,58,237,0.15)' },
    } as any) : {}),
  },
  cardInactive: { opacity: 0.5 },
  cardImgWrap: { position: 'relative' },
  cardImg: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#070b19' },
  cardImgFallback: {
    backgroundColor: 'rgba(124,58,237,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  cardAdmin: {
    position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6,
  },
  cardAdminBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  cardBody: { padding: 14, gap: 6 },
  cardPartner: { fontFamily: 'DMSans_700Bold', fontSize: 11.5, color: '#A78BFA' },
  cardTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14.5, color: '#fff' },
  cardCode: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(124,58,237,0.18)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4,
  },
  cardCodeText: { fontFamily: 'DMSans_700Bold', fontSize: 11.5, color: '#C4B5FD', letterSpacing: 1.2 },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(167,139,250,0.2)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '200ms' } as any : {}),
  },
  dotActive: { backgroundColor: '#A78BFA', width: 22 },
});

const cbToast = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 84, right: 24, zIndex: 9999,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0d1326', borderColor: 'rgba(52,211,153,0.45)', borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ position: 'fixed', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' } as any) : {}),
  },
  error: { borderColor: 'rgba(248,113,113,0.45)' },
  text: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: '#fff' },
});
