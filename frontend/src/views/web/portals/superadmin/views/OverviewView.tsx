/**
 * Super Admin Portal — Overview/Dashboard view (true RN port).
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform, Image, TextInput } from 'react-native';
import {
  Building2, GraduationCap, UserCheck, Users, CreditCard, Calendar,
  CheckCircle, BarChart3, Sparkles, AlertTriangle, FileText, Eye,
  Image as ImageIcon, Link, Save, X, Upload,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '../tokens';
import { Av } from '../atoms';
import { GRAD, GradientButton, SecondaryButton, KpiTile, IconBox } from '../applekit';
import * as MOCK from '../data';
import { usePortalData, postPortal, fetchPortal } from '@/src/lib/portalApi';
import { LiveStrip } from '@/src/views/web/LiveStrip';
import { CouponBanner } from '@/src/views/web/components/CouponBanner';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const KPI_ICONS: Record<string, any> = {
  Building2, GraduationCap, UserCheck, Users, CreditCard, Calendar, CheckCircle, BarChart3,
};
const ACT_ICONS: Record<string, any> = {
  Building2, Sparkles, Users, CreditCard, AlertTriangle,
};

const SUPER_MOCK = {
  admin: MOCK.ADMIN,
  kpis: MOCK.KPIS,
  recentActivity: MOCK.RECENT_ACTIVITY,
  platformUsers: MOCK.PLATFORM_USERS,
  monthlyEnrollments: MOCK.MONTHLY_ENROLLMENTS,
  revenueBreakdown: MOCK.REVENUE_BREAKDOWN,
};

export function OverviewView({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const firstName = (user?.full_name || 'ADMIN').split(' ')[0];

  const { data } = usePortalData<typeof SUPER_MOCK>('/admin/super-overview', SUPER_MOCK);
  const ADMIN = data!.admin;
  const KPIS = data!.kpis;
  const RECENT_ACTIVITY = data!.recentActivity;
  const PLATFORM_USERS = data!.platformUsers;
  const MONTHLY_ENROLLMENTS = data!.monthlyEnrollments;
  const REVENUE_BREAKDOWN = data!.revenueBreakdown;

  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const maxEnroll = Math.max(...MONTHLY_ENROLLMENTS.map((m) => m.value));

  // ── Ad Manager state (multi-ad) ──────────────────────────────────────
  const [ads, setAds] = useState<any[]>([]);
  const [showAdEditor, setShowAdEditor] = useState(false);
  const [editingAdIdx, setEditingAdIdx] = useState<number | null>(null);
  const [adLabel, setAdLabel] = useState('');
  const [adImage, setAdImage] = useState('');
  const [adUrl, setAdUrl] = useState('');
  const [adSaving, setAdSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAds = () => {
    fetchPortal<{ ads: any[] }>('/ad/image')
      .then((res) => { if (res.ads) setAds(res.ads); })
      .catch(() => {});
  };

  useEffect(() => { loadAds(); }, []);

  const handleFileSelect = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAdImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAd = async () => {
    if (!adLabel.trim() || !adImage || !adUrl.trim()) return;
    setAdSaving(true);
    const prevAds = [...ads];
    try {
      const newItems = [...ads];
      if (editingAdIdx !== null) {
        newItems[editingAdIdx] = { label: adLabel, image_url: adImage, redirect_url: adUrl };
      } else {
        newItems.push({ label: adLabel, image_url: adImage, redirect_url: adUrl });
      }
      await postPortal('/admin/ad/image', { body: { items: newItems } });
      setAds(newItems);
      setShowAdEditor(false);
      setEditingAdIdx(null);
    } catch (e: any) {
      console.error('Failed to save ad', e);
      if (Platform.OS === 'web') {
        window.alert(e?.message || 'Failed to save advertisement');
      }
      setAds(prevAds);
    } finally {
      setAdSaving(false);
    }
  };

  const openEditor = (idx: number | null) => {
    if (idx !== null) {
      const ad = ads[idx];
      setAdLabel(ad.label || '');
      setAdImage(ad.image_url || '');
      setAdUrl(ad.redirect_url || '');
      setEditingAdIdx(idx);
    } else {
      setAdLabel('');
      setAdImage('');
      setAdUrl('');
      setEditingAdIdx(null);
    }
    setShowAdEditor(true);
  };

  const deleteAd = async (idx: number) => {
    const newItems = ads.filter((_, i) => i !== idx);
    const prevAds = [...ads];
    try {
      await postPortal('/admin/ad/image', { body: { items: newItems } });
      setAds(newItems);
    } catch (e: any) {
      console.error('Failed to delete ad', e);
      if (Platform.OS === 'web') {
        window.alert(e?.message || 'Failed to delete advertisement');
      }
      setAds(prevAds);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Live counters */}
      <LiveStrip accent={GRAD.to} keys={['users', 'students', 'mentors', 'colleges', 'bookings']} />

      {/* Ad Manager — multi-ad management */}
      <View style={s.adManagerWrap}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ImageIcon size={14} color={SAC.accentBright} />
            <Text style={s.adManagerTitle}>Advertisement Board ({ads.length})</Text>
          </View>
          <Pressable onPress={() => openEditor(null)} style={s.adEditBtn}>
            <Text style={s.adEditBtnText}>+ Add Ad</Text>
          </Pressable>
        </View>
        {ads.length > 0 ? (
          <View style={{ gap: 8, marginTop: 8 }}>
            {ads.map((ad, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 8 }}>
                <Image
                  source={{ uri: ad.image_url }}
                  style={{ width: 50, height: 34, borderRadius: 4 }}
                  resizeMode="cover"
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 11 }} numberOfLines={1}>
                    {ad.label}
                  </Text>
                  <Text style={{ color: SAC.muted, fontSize: 9 }} numberOfLines={1}>
                    {ad.redirect_url}
                  </Text>
                </View>
                <Pressable onPress={() => openEditor(i)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: SAC.accentBright, fontSize: 11, fontFamily: FONTS.bold }}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => deleteAd(i)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: '#EF4444', fontSize: 11, fontFamily: FONTS.bold }}>Del</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: SAC.dim, fontSize: 11, marginTop: 6 }}>
            No advertisements set yet. Click "+ Add Ad" to add one.
          </Text>
        )}
      </View>

      {/* Exclusive Coupons — shown only on the overview page */}
      <CouponBanner portal="super_admin" editable />

      {/* Ad Editor Modal */}
      {showAdEditor && (
        <View style={s.adEditorOverlay}>
          <View style={s.adEditorModal}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={s.adEditorTitle}>{editingAdIdx !== null ? 'Edit Advertisement' : 'New Advertisement'}</Text>
              <Pressable onPress={() => { setShowAdEditor(false); setEditingAdIdx(null); }}><X size={18} color={SAC.muted} /></Pressable>
            </View>

            <Text style={s.adFieldLabel}>Label / Title</Text>
            <TextInput
              style={s.adFieldInput}
              value={adLabel}
              onChangeText={setAdLabel}
              placeholder="e.g. EBS 2026"
              placeholderTextColor={SAC.dim}
            />

            <Text style={s.adFieldLabel}>Redirect URL</Text>
            <TextInput
              style={s.adFieldInput}
              value={adUrl}
              onChangeText={setAdUrl}
              placeholder="https://events.forgetechno.com/"
              placeholderTextColor={SAC.dim}
              autoCapitalize="none"
            />

            <Text style={s.adFieldLabel}>Image</Text>
            {Platform.OS === 'web' ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <Pressable
                  onPress={() => fileInputRef.current?.click()}
                  style={s.adFilePicker}
                >
                  <Upload size={14} color={SAC.accentBright} />
                  <Text style={{ color: SAC.accentBright, fontFamily: FONTS.bold, fontSize: 12 }}>
                    {adImage ? 'Change Image' : 'Choose Image'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <TextInput
                style={[s.adFieldInput, { fontSize: 10 }]}
                value={adImage}
                onChangeText={setAdImage}
                placeholder="Paste image URL"
                placeholderTextColor={SAC.dim}
              />
            )}
            {adImage ? (
              <View style={{ marginTop: 8 }}>
                <Image source={{ uri: adImage }} style={{ width: '100%', height: 100, borderRadius: 8 }} resizeMode="cover" />
              </View>
            ) : null}

            <Pressable
              onPress={handleSaveAd}
              disabled={adSaving || !adLabel.trim() || !adImage || !adUrl.trim()}
              style={[s.adSaveBtn, (adSaving || !adLabel.trim() || !adImage || !adUrl.trim()) && { opacity: 0.5 }]}
            >
              <Save size={14} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>
                {adSaving ? 'Saving...' : 'Save Advertisement'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Hero */}
      <View style={s.hero}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.heroKicker}>GOOD MORNING, {firstName.toUpperCase()}</Text>
          <Text style={s.heroTitle}>Platform is healthy. 12 items need your attention.</Text>
        </View>
        <GradientButton size="md" onPress={() => onNavigate?.('approvals')}>
          <CheckCircle size={14} color="#fff" />
          <Text style={s.heroPrimaryText}>Review Approvals</Text>
        </GradientButton>
        <SecondaryButton size="md" onPress={() => onNavigate?.('analytics')}>
          <FileText size={14} color={SAC.muted} />
          <Text style={s.heroSecText}>Full Report</Text>
        </SecondaryButton>
      </View>

      {/* 8 KPI tiles in 2 rows */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {KPIS.map((k) => {
          const Icon = KPI_ICONS[k.icon] || Building2;
          const isUp = (k.delta || '').includes('↑');
          return (
            <KpiTile
              key={k.id}
              Icon={Icon}
              label={k.label}
              value={k.value}
              delta={k.delta}
              deltaKind={isUp ? 'success' : 'neutral'}
            />
          );
        })}
      </View>

      {/* Recent Activity + Platform Users */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Recent Activity */}
        <View style={[s.card, { flex: stack ? undefined : 1.7 }]}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Recent Activity</Text>
            <Pressable onPress={() => onNavigate?.('analytics')}><Text style={s.linkRight}>View all →</Text></Pressable>
          </View>
          <View style={{ gap: 14, marginTop: 14 }}>
            {RECENT_ACTIVITY.map((a) => {
              const Icon = ACT_ICONS[a.icon] || Building2;
              return (
                <View key={a.id} style={s.activityRow}>
                  <View style={s.activityIcon}><Icon size={14} color={GRAD.to} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={s.activityText}>{a.text}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={s.activitySub}>{a.sub}</Text>
                      <Text style={s.activityDot}>·</Text>
                      <Text style={s.activityTime}>{a.time}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Platform Users distribution */}
        <View style={[s.card, { flex: stack ? undefined : 1 }]}>
          <Text style={s.cardTitle}>Platform Users</Text>
          <View style={{ gap: 14, marginTop: 14 }}>
            {PLATFORM_USERS.map((u) => (
              <View key={u.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={s.distLabel}>{u.label}</Text>
                  <Text style={s.distPct}>{u.pct}%</Text>
                </View>
                <View style={s.distTrack}>
                  <View style={[s.distFill, { width: `${u.pct}%` as any, backgroundColor: u.color }]} />
                </View>
                <Text style={s.distCount}>{u.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Monthly Enrollments + Revenue Breakdown */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Bar chart */}
        <View style={[s.card, { flex: stack ? undefined : 1.5 }]}>
          <Text style={s.cardTitle}>Monthly Enrollments</Text>
          <Text style={s.cardSub}>New students / month</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 130, marginTop: 22, paddingHorizontal: 4 }}>
            {MONTHLY_ENROLLMENTS.map((m, i) => {
              const isLast = i === MONTHLY_ENROLLMENTS.length - 1;
              const h = Math.round((m.value / maxEnroll) * 110);
              return (
                <View key={m.month} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={[s.barValue, { color: isLast ? SAC.accentBright : SAC.dim }]}>{(m.value / 1000).toFixed(1)}k</Text>
                  <LinearGradient
                    colors={[isLast ? SAC.accentBright : SAC.primary, isLast ? SAC.accent : SAC.primaryD] as any}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                    style={{ width: '100%', height: h, borderTopLeftRadius: 5, borderTopRightRadius: 5, opacity: isLast ? 1 : 0.7 }}
                  />
                  <Text style={[s.barMonth, isLast && { color: '#fff', fontFamily: FONTS.bold }]}>{m.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Revenue Breakdown */}
        <View style={[s.card, { flex: stack ? undefined : 1 }]}>
          <Text style={s.cardTitle}>Revenue Breakdown</Text>
          <Text style={s.cardSub}>This month · ₹28.4L total</Text>
          <View style={{ gap: 12, marginTop: 16 }}>
            {REVENUE_BREAKDOWN.map((r) => (
              <View key={r.source}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={s.distLabel}>{r.source}</Text>
                  <Text style={s.revAmount}>{r.amount}</Text>
                </View>
                <View style={s.distTrack}>
                  <View style={[s.distFill, { width: `${r.pct}%` as any, backgroundColor: r.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 22, paddingVertical: 18,
  },
  heroKicker: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1.2, marginBottom: 6 },
  heroTitle:  { color: '#fff', fontFamily: FONTS.xbold, fontSize: 19, letterSpacing: -0.4 },
  heroPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: SAC.primary, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  heroPrimaryText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  heroSec: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  heroSecText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },

  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15, letterSpacing: -0.2 },
  cardSub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },
  linkRight: { color: SAC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 },

  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  activityText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  activitySub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  activityDot: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11 },
  activityTime: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11 },

  distLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  distPct:   { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },
  distCount: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 5 },
  distTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  distFill:  { height: '100%', borderRadius: 3 },
  revAmount: { color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 12.5 },

  barValue: { fontFamily: FONTS.bold, fontSize: 10 },
  barMonth: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 },

  // Ad Manager
  adManagerWrap: {
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1,
    borderRadius: 14, padding: 14,
  },
  adManagerTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  adEditBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: SAC.primary,
  },
  adEditBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11 },

  adEditorOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
    justifyContent: 'center', alignItems: 'center',
    ...(Platform.OS === 'web' ? { position: 'fixed' } as any : {}),
  },
  adEditorModal: {
    backgroundColor: '#0E1428', borderColor: SAC.border, borderWidth: 1,
    borderRadius: 16, padding: 20, width: '90%', maxWidth: 420,
    gap: 8,
    ...(Platform.OS === 'web' ? { boxShadow: '0 24px 80px rgba(0,0,0,0.60)' } as any : {}),
  },
  adEditorTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  adFieldLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, marginTop: 6 },
  adFieldInput: {
    backgroundColor: SAC.bg2, borderColor: SAC.border, borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    color: '#fff', fontFamily: FONTS.med, fontSize: 13,
  },
  adFilePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SAC.bg2, borderColor: SAC.border, borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  adSaveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    backgroundColor: SAC.accent, borderRadius: 10,
    paddingVertical: 12, marginTop: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
});
