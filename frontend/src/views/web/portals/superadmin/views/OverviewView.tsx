/**
 * Super Admin Portal — Overview/Dashboard view (true RN port).
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform, Image, TextInput, ScrollView } from 'react-native';
import {
  Building2, GraduationCap, UserCheck, Users, CreditCard, Calendar,
  CheckCircle, BarChart3, Sparkles, AlertTriangle, FileText, Eye,
  Image as ImageIcon, Link, Save, X, Upload, Trash2, Plus, Megaphone, TrendingUp
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS, useSAC, resolveColors } from '../tokens';
import { Av } from '../atoms';
import { GRAD, GradientButton, SecondaryButton, KpiTile, IconBox, useToast, Toast } from '../applekit';
import * as MOCK from '../data';
import { usePortalData, postPortal, fetchPortal } from '@/src/lib/portalApi';
import { resolveImageUrl } from '@/src/models/services/api';
import { LiveStrip } from '@/src/views/web/LiveStrip';
import { CouponBanner } from '@/src/views/web/components/CouponBanner';
import { uploadImage, fileNameToLabel } from '@/src/lib/image';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useConfirm } from '@/src/views/components';

const KPI_ICONS: Record<string, any> = {
  Building2, GraduationCap, UserCheck, Users, CreditCard, Calendar, CheckCircle, BarChart3,
};
const ACT_ICONS: Record<string, any> = {
  Building2, Sparkles, Users, CreditCard, AlertTriangle,
};

type AdDraft = {
  label: string;
  image_url: string;
  redirect_url: string;
  key: string;
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
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const user = useAuthStore((s) => s.user);
  const firstName = (user?.full_name || 'ADMIN').split(' ')[0];

  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);

  const { data: analytics } = usePortalData<any>('/analytics/super-admin', {}, 30_000);
  
  const realStudents = analytics?.kpis?.students || 0;
  const realMentors = analytics?.kpis?.mentors || 0;
  const realEvents = analytics?.kpis?.total_events || 0;
  const realBookings = analytics?.kpis?.total_bookings || 0;
  const realColleges = analytics?.kpis?.colleges || 0;
  const realAlumni = analytics?.kpis?.alumni || 0;
  const realPending = analytics?.kpis?.pending_mentors || 0;
  const mtd = analytics?.revenue?.mtd || 0;
  const revenueFormatted = mtd > 0 ? `₹${(mtd/100000).toFixed(1)}L` : '₹0';
  
  const KPIS_MAPPED = [
    { id: 'colleges',    icon: 'Building2',     label: 'Total Colleges',         value: String(realColleges),    delta: '↑ verified',     color: 'amber'  as const },
    { id: 'students',    icon: 'GraduationCap', label: 'Total Students',         value: String(realStudents),    delta: '↑ active',       color: 'amber'  as const },
    { id: 'mentors',     icon: 'UserCheck',     label: 'Active Mentors',         value: String(realMentors),     delta: `↑ ${realPending} pending`,  color: 'amber'  as const },
    { id: 'alumni',      icon: 'Users',         label: 'Alumni Network',         value: String(realAlumni),      delta: '↑ joined',       color: 'amber'  as const },
    { id: 'revenue',     icon: 'CreditCard',    label: 'Revenue This Month',     value: revenueFormatted,        delta: '↑ MTD',          color: 'amber'  as const },
    { id: 'events',      icon: 'Calendar',      label: 'Active Events',          value: String(realEvents),      delta: `↑ ${realBookings} bookings`, color: 'amber'  as const },
    { id: 'approvals',   icon: 'CheckCircle',   label: 'Pending Approvals',      value: String(realPending),     delta: '↑ review needed',color: 'amber'  as const },
    { id: 'engagement',  icon: 'BarChart3',     label: 'Platform Engagement',    value: '0%',                    delta: '↑ ratio',        color: 'amber'  as const },
  ];

  const recentAct = analytics?.recent_bookings?.length ? analytics.recent_bookings.map(b => ({
    id: b.id, text: `New booking: ${b.event?.title}`, sub: b.mentor?.full_name, time: 'Just now'
  })) : MOCK.RECENT_ACTIVITY;

  const PLATFORM_USERS = analytics?.role_distribution || MOCK.PLATFORM_USERS;
  const MONTHLY_ENROLLMENTS = analytics?.monthly_enrollments?.length ? analytics.monthly_enrollments : MOCK.MONTHLY_ENROLLMENTS;
  const REVENUE_BREAKDOWN = analytics?.revenue?.by_source || MOCK.REVENUE_BREAKDOWN;

  useEffect(() => {
    if (Platform.OS === 'web') {
      const applyBg = (el: HTMLElement) => {
        const bg = el.dataset.bg;
        if (bg && !el.style.background.includes('linear-gradient')) {
          el.style.background = bg;
        }
      };

      const elements = document.querySelectorAll('.db-tile, .sa-hero, .sa-banner');
      elements.forEach((card) => {
        applyBg(card as HTMLElement);
        
        if (card.classList.contains('db-tile')) {
          const oldSpot = card.querySelector('.sa-spot');
          if (oldSpot) card.removeChild(oldSpot);

          const spot = document.createElement('span');
          spot.className = 'sa-spot';
          card.appendChild(spot);

          const onMove = (e: MouseEvent) => {
            const r = card.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            spot.style.opacity = '1';
            spot.style.transform = `translate(${x}px, ${y}px)`;
          };
          const onLeave = () => {
            (card as HTMLElement).style.transform = '';
            (card as HTMLElement).style.borderColor = '';
            spot.style.opacity = '0';
          };
          
          const oldMove = (card as any)._onMove;
          const oldLeave = (card as any)._onLeave;
          if (oldMove) card.removeEventListener('mousemove', oldMove);
          if (oldLeave) card.removeEventListener('mouseleave', oldLeave);
          
          (card as any)._onMove = onMove;
          (card as any)._onLeave = onLeave;
          
          card.addEventListener('mousemove', onMove as any);
          card.addEventListener('mouseleave', onLeave);
        }
      });
    }
  });

  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const maxEnroll = Math.max(...MONTHLY_ENROLLMENTS.map((m) => m.value));

  // ── Ad Manager state (multi-ad) ──────────────────────────────────────
  const { flash: flashToast, toast, hide } = useToast();
  const { confirm } = useConfirm();
  const [ads, setAds] = useState<any[]>([]);
  const [showAdEditor, setShowAdEditor] = useState(false);
  const [editingAdIdx, setEditingAdIdx] = useState<number | null>(null);
  const [editorItems, setEditorItems] = useState<AdDraft[]>([]);
  const [adSaving, setAdSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAds = () => {
    fetchPortal<{ ads: any[] }>('/ad/image')
      .then((res) => { if (res.ads) setAds(res.ads); })
      .catch(() => {});
  };

  useEffect(() => { loadAds(); }, []);

  const handleFilesSelected = async (e: any) => {
    const files: File[] = Array.from(e.target?.files || []);
    if (!files.length) return;
    if (e.target) e.target.value = '';
    const drafts: AdDraft[] = [];
    for (const file of files) {
      try {
        const url = await uploadImage(file, 'ads');
        drafts.push({
          label: fileNameToLabel(file.name),
          image_url: url,
          redirect_url: '',
          key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        });
      } catch {
        // skip files that fail to upload
      }
    }
    if (drafts.length) setEditorItems((prev) => [...prev, ...drafts]);
  };

  const updateDraft = (key: string, patch: Partial<AdDraft>) => {
    setEditorItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const removeDraft = (key: string) => {
    setEditorItems((prev) => prev.filter((it) => it.key !== key));
  };

  const hasSavableItems = editorItems.some((it) => it.image_url || (it.label.trim() && it.redirect_url.trim()));

  const handleSaveAd = async () => {
    const validItems = editorItems.filter((it) => it.image_url || (it.label.trim() && it.redirect_url.trim()));
    if (!validItems.length || adSaving) return;
    setAdSaving(true);
    const prevAds = [...ads];
    try {
      const newItems = [...ads];
      if (editingAdIdx !== null) {
        const first = validItems[0];
        newItems[editingAdIdx] = { label: first.label.trim(), image_url: first.image_url, redirect_url: first.redirect_url.trim() };
        for (const it of validItems.slice(1)) {
          newItems.push({ label: it.label.trim(), image_url: it.image_url, redirect_url: it.redirect_url.trim() });
        }
      } else {
        for (const it of validItems) {
          newItems.push({ label: it.label.trim(), image_url: it.image_url, redirect_url: it.redirect_url.trim() });
        }
      }
      await postPortal('/admin/ad/image', { body: { items: newItems } });
      setAds(newItems);
      setShowAdEditor(false);
      setEditingAdIdx(null);
      setEditorItems([]);
      flashToast(editingAdIdx !== null ? 'Advertisement updated' : 'Advertisement saved');
    } catch (e: any) {
      console.error('Failed to save ad', e);
      flashToast(e?.message || 'Failed to save advertisement', 'error');
      setAds(prevAds);
    } finally {
      setAdSaving(false);
    }
  };

  const openEditor = (idx: number | null) => {
    if (idx !== null) {
      const ad = ads[idx];
      setEditorItems([{
        label: ad.label || '',
        image_url: ad.image_url || '',
        redirect_url: ad.redirect_url || '',
        key: 'edit',
      }]);
      setEditingAdIdx(idx);
    } else {
      setEditorItems([]);
      setEditingAdIdx(null);
    }
    setShowAdEditor(true);
  };

  const deleteAd = async (idx: number) => {
    const ok = await confirm({
      title: 'Delete advertisement',
      message: 'Remove this advertisement from the board?',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const newItems = ads.filter((_, i) => i !== idx);
    const prevAds = [...ads];
    try {
      await postPortal('/admin/ad/image', { body: { items: newItems } });
      setAds(newItems);
      flashToast('Advertisement deleted');
    } catch (e: any) {
      console.error('Failed to delete ad', e);
      flashToast(e?.message || 'Failed to delete advertisement', 'error');
      setAds(prevAds);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Live counters */}
      <LiveStrip accent={GRAD.to} keys={['users', 'students', 'mentors', 'colleges', 'bookings']} />

      {/* Hero Banner from sa-dashboard-export.html */}
      <View className="db-r sa-hero" style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, padding: 30, paddingBottom: 32, paddingHorizontal: 34, marginBottom: 18, shadowColor: '#101220', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.22, shadowRadius: 60, elevation: 10, backgroundImage: 'linear-gradient(150deg, #FFFFFF 0%, #F4F2FF 44%, #EAF6FA 100%)' } as any}>
        {Platform.OS === 'web' && (
          <div dangerouslySetInnerHTML={{ __html: `
            <div style="position: absolute; right: -6%; top: -46%; width: 460px; height: 460px; border-radius: 50%; background: radial-gradient(circle, rgba(124,92,252,.20), transparent 66%); pointer-events: none;"></div>
            <div style="position: absolute; left: 28%; bottom: -60%; width: 420px; height: 420px; border-radius: 50%; background: radial-gradient(circle, rgba(47,184,198,.16), transparent 68%); pointer-events: none;"></div>
            <svg viewBox="0 0 220 90" style="position: absolute; right: 26px; bottom: 18px; width: 200px; height: auto; pointer-events: none; overflow: visible;">
              <path d="M6 70 C 46 70 44 22 84 22 C 118 22 116 58 150 54 C 178 51 186 30 208 16" style="--len: 260; fill: none; stroke: #4B3FD6; stroke-width: 2.4; stroke-linecap: round; opacity: .5; stroke-dasharray: 260; animation: db-draw 1.8s cubic-bezier(.4,0,.2,1) .3s both;"></path>
              <path d="M198 12 l12 6 -10 9" style="--len: 40; fill: none; stroke: #4B3FD6; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; opacity: .5; stroke-dasharray: 40; animation: db-draw .5s ease 2s both;"></path>
            </svg>
            <svg viewBox="0 0 40 40" style="position: absolute; left: 50%; top: 20px; width: 26px; height: 26px; pointer-events: none; animation: db-twinkle 4.2s ease-in-out infinite;">
              <path d="M20 3 L23.6 15.4 L36 20 L23.6 24.6 L20 37 L16.4 24.6 L4 20 L16.4 15.4 Z" fill="#C08BFF" opacity=".55"></path>
            </svg>
            <svg viewBox="0 0 30 30" style="position: absolute; left: 62%; top: 54px; width: 16px; height: 16px; pointer-events: none; animation: db-twinkle 5.6s ease-in-out 1.2s infinite;">
              <path d="M15 2 L17.6 11.4 L27 15 L17.6 18.6 L15 28 L12.4 18.6 L3 15 L12.4 11.4 Z" fill="#2FB8C6" opacity=".5"></path>
            </svg>
          ` }} />
        )}
        <View style={{ flexDirection: stack ? 'column' : 'row', gap: 30, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(75,63,168,.10)', borderRadius: 100, paddingVertical: 7, paddingHorizontal: 13 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B2FA8' }} />
              <Text style={{ fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 1.5, color: '#3B2FA8' }}>THIS WEEK</Text>
            </View>
            <View style={{ marginTop: 16, marginBottom: 10 }}>
              <Text style={{ fontSize: 33, fontFamily: FONTS.bold, letterSpacing: -1.4, lineHeight: 38, color: '#141726' }}>You're 8% closer than last Monday.</Text>
            </View>
            <Text style={{ fontSize: 15.5, lineHeight: 24, color: '#4A4F63', maxWidth: 520 }}>Three actions left before Friday's referral window closes. Agent K has ordered them by impact.</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
               <Pressable style={{ backgroundColor: '#4B3FD6', borderRadius: 11, paddingVertical: 13, paddingHorizontal: 22 }}>
                  <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: '#FFFFFF' }}>Open today's plan</Text>
               </Pressable>
               <Pressable style={{ borderColor: '#CFC9F3', borderWidth: 1, borderRadius: 11, paddingVertical: 13, paddingHorizontal: 22 }}>
                  <Text style={{ fontSize: 14, fontFamily: FONTS.semi, color: '#2E2A55' }}>See what changed</Text>
               </Pressable>
            </View>
          </View>
          
          {!stack && (
            <View style={{ flexDirection: 'row', gap: 26 }}>
              <View>
                <Text style={{ fontSize: 10.5, fontFamily: FONTS.bold, letterSpacing: 1.3, color: '#5F6474', marginBottom: 8 }}>READINESS</Text>
                <Text style={{ fontSize: 30, fontFamily: FONTS.bold, letterSpacing: -1.1, color: '#4B3FD6' }}>36%</Text>
                <Text style={{ fontSize: 12, color: '#047857', marginTop: 5 }}>↗ +8 pts</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10.5, fontFamily: FONTS.bold, letterSpacing: 1.3, color: '#5F6474', marginBottom: 8 }}>MATCHES</Text>
                <Text style={{ fontSize: 30, fontFamily: FONTS.bold, letterSpacing: -1.1, color: '#0E6E8C' }}>267</Text>
                <Text style={{ fontSize: 12, color: '#6B7080', marginTop: 5 }}>12 new</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10.5, fontFamily: FONTS.bold, letterSpacing: 1.3, color: '#5F6474', marginBottom: 8 }}>SESSIONS</Text>
                <Text style={{ fontSize: 30, fontFamily: FONTS.bold, letterSpacing: -1.1, color: '#A21C63' }}>1</Text>
                <Text style={{ fontSize: 12, color: '#6B7080', marginTop: 5 }}>Thu 6pm</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Echo Promo Banner */}
      <View className="sa-banner" style={{ borderRadius: 20, overflow: 'hidden', borderColor: '#3B2B7A', borderWidth: 1, minHeight: stack ? 200 : 300, marginBottom: 18, backgroundImage: 'linear-gradient(115deg, #5A2DBE 0%, #6B34D6 42%, #4A1F9E 100%)' } as any}>
         <View style={{ flexDirection: stack ? 'column' : 'row', alignItems: 'stretch', flex: 1 }}>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, paddingVertical: 28, paddingHorizontal: 22, paddingLeft: 30, flex: 1.35 }}>
             <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 22, paddingHorizontal: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 34, fontFamily: FONTS.bold, lineHeight: 34, color: '#2B6CB0', letterSpacing: -1 }}>HackWave</Text>
                <Text style={{ fontSize: 40, fontFamily: FONTS.bold, lineHeight: 40, color: '#2B6CB0', letterSpacing: -1 }}>3.0</Text>
                <Text style={{ fontSize: 26, fontFamily: FONTS.bold, color: '#C05621', marginTop: 4 }}>2026</Text>
             </View>
             <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: FONTS.semi, letterSpacing: 3, color: '#E9DDFF', marginBottom: 12 }}>HACKWAVE 3.0 · 2026</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                   <Text style={{ fontSize: 17, fontFamily: FONTS.semi, color: '#F0E7FF' }}>SEP</Text>
                   <Text style={{ fontSize: 52, fontFamily: FONTS.bold, lineHeight: 52, letterSpacing: -2, color: '#FFFFFF' }}>04</Text>
                   <Text style={{ fontSize: 34, fontFamily: FONTS.med, color: '#CDB8FF' }}>—</Text>
                   <Text style={{ fontSize: 52, fontFamily: FONTS.bold, lineHeight: 52, letterSpacing: -2, color: '#E4D6FF' }}>05</Text>
                   <Text style={{ fontSize: 20, fontFamily: FONTS.semi, color: '#F6C86B' }}>2026</Text>
                </View>
                <Text style={{ fontSize: 14.5, color: '#DCCEF7' }}>Sreenidhi Institute of Science and Technology, Hyderabad</Text>
             </View>
           </View>
           
           {!stack && (
             <View style={{ borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,.14)', padding: 24, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch', marginBottom: 16 }}>
                   <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 26, height: 26, borderRadius: 4, backgroundColor: '#E8590C' }} />
                      <View>
                         <Text style={{ fontSize: 12.5, fontFamily: FONTS.bold, color: '#1A365D', lineHeight: 14 }}>SREENIDHI</Text>
                         <Text style={{ fontSize: 9, fontFamily: FONTS.semi, color: '#4A5568', letterSpacing: 0.6 }}>EDUCATIONAL GROUP</Text>
                      </View>
                   </View>
                   <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 8, fontFamily: FONTS.semi, color: '#718096', letterSpacing: 0.8 }}>POWERED BY</Text>
                      <Text style={{ fontSize: 11, fontFamily: FONTS.bold, color: '#B7791F', marginTop: 3 }}>CDC</Text>
                   </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                   <Text style={{ fontSize: 10.5, fontFamily: FONTS.semi, letterSpacing: 1.8, color: '#C9B4F5' }}>IN COLLABORATION WITH</Text>
                   {Platform.OS === 'web' && (
                      <div dangerouslySetInnerHTML={{ __html: `<svg width="22" height="25" viewBox="0 0 300 350"><path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="#FFFFFF"></path><text x="150" y="210" text-anchor="middle" style="font-family: 'Outfit', sans-serif; font-size: 120px; font-weight: 700; fill: #5A2DBE;">SA</text></svg>` }} />
                   )}
                   <Text style={{ fontSize: 15, fontFamily: FONTS.semi, color: '#FFFFFF' }}>Student Alumni</Text>
                   <Text style={{ fontSize: 12.5, color: '#C9B4F5' }}>studentalumni.ai</Text>
                </View>
             </View>
           )}
         </View>
      </View>

      {/* Ad Manager — multi-ad management */}
      <View style={s.adManagerWrap}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ImageIcon size={14} color={T.accentBright} />
            <Text style={s.adManagerTitle}>Advertisement Board ({ads.length})</Text>
          </View>
          <Pressable onPress={() => openEditor(null)} style={s.adEditBtn}>
            <Text style={s.adEditBtnText}>+ Add Ad</Text>
          </Pressable>
        </View>
        {ads.length > 0 ? (
          <ScrollView
            style={{ maxHeight: 216, marginTop: 8 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <View style={{ gap: 8 }}>
              {ads.map((ad, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.panel2, borderRadius: 8, padding: 8 }}>
                  <Image
                    source={{ uri: resolveImageUrl(ad.image_url) }}
                    style={{ width: 50, height: 34, borderRadius: 4 }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: T.text, fontFamily: FONTS.bold, fontSize: 11 }} numberOfLines={1}>
                      {ad.label}
                    </Text>
                    <Text style={{ color: T.muted, fontSize: 9 }} numberOfLines={1}>
                      {ad.redirect_url}
                    </Text>
                  </View>
                  <Pressable onPress={() => openEditor(i)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: T.accentBright, fontSize: 11, fontFamily: FONTS.bold }}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteAd(i)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: '#EF4444', fontSize: 11, fontFamily: FONTS.bold }}>Del</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={{ color: T.dim, fontSize: 11, marginTop: 6 }}>
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={s.adEditorTitle}>{editingAdIdx !== null ? 'Edit Advertisement' : 'New Advertisements'}</Text>
              <Pressable onPress={() => { setShowAdEditor(false); setEditingAdIdx(null); setEditorItems([]); }}><X size={18} color={T.muted} /></Pressable>
            </View>

            {Platform.OS === 'web' && (
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFilesSelected}
                style={{ display: 'none' }}
              />
            )}

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12 }}>
                {editorItems.length === 0 ? (
                  <View style={s.adEmptyDrop}>
                    <ImageIcon size={20} color={T.accentBright} />
                    <Text style={{ color: T.muted, fontFamily: FONTS.med, fontSize: 11.5, textAlign: 'center' }}>
                      No banners added yet. Select one or more banner images below.
                    </Text>
                  </View>
                ) : editorItems.map((it) => (
                  <View key={it.key} style={s.adDraftCard}>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      {it.image_url ? (
                        <Image source={{ uri: resolveImageUrl(it.image_url) }} style={{ width: 64, height: 42, borderRadius: 6 }} resizeMode="cover" />
                      ) : (
                        <View style={{ width: 64, height: 42, borderRadius: 6, backgroundColor: T.bg2, borderColor: T.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={14} color={T.dim} />
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                        <TextInput
                          style={[s.adFieldInput, { paddingVertical: 7 }]}
                          value={it.label}
                          onChangeText={(v) => updateDraft(it.key, { label: v })}
                          placeholder="Label / Title (e.g. EBS 2026)"
                          placeholderTextColor={T.dim}
                        />
                        <TextInput
                          style={[s.adFieldInput, { paddingVertical: 7 }]}
                          value={it.redirect_url}
                          onChangeText={(v) => updateDraft(it.key, { redirect_url: v })}
                          placeholder="Redirect URL (optional)"
                          placeholderTextColor={T.dim}
                          autoCapitalize="none"
                        />
                        {Platform.OS !== 'web' && (
                          <TextInput
                            style={[s.adFieldInput, { paddingVertical: 7, fontSize: 10 }]}
                            value={it.image_url}
                            onChangeText={(v) => updateDraft(it.key, { image_url: v })}
                            placeholder="Paste image URL"
                            placeholderTextColor={T.dim}
                          />
                        )}
                      </View>
                      <Pressable onPress={() => removeDraft(it.key)} hitSlop={6} style={{ padding: 4, marginTop: 2 }}>
                        <Trash2 size={14} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {Platform.OS === 'web' ? (
              <Pressable
                onPress={() => fileInputRef.current?.click()}
                style={[s.adFilePicker, { marginTop: 12 }]}
              >
                <Upload size={14} color={T.accentBright} />
                <Text style={{ color: T.accentBright, fontFamily: FONTS.bold, fontSize: 12 }}>
                  {editorItems.length ? 'Add More Banner Images' : 'Select Banner Image(s)'}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleSaveAd}
              disabled={adSaving || !hasSavableItems}
              style={[s.adSaveBtn, (adSaving || !hasSavableItems) && { opacity: 0.5 }]}
            >
              <Save size={14} color="#fff" />
              <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 12 }}>
                {adSaving ? 'Saving...' : editingAdIdx !== null ? 'Save Advertisement' : `Save Advertisement${editorItems.length > 1 ? 's' : ''}`}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 8 KPI tiles in 2 rows */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {KPIS_MAPPED.map((k) => {
          const Icon = KPI_ICONS[k.icon] || Building2;
          const isUp = (k.delta || '').includes('↑');
          return (
            <View
              key={k.id}
              className="db-tile sa-stat-card"
              style={[s.card, { width: stack ? '100%' : '23.5%', minWidth: 200, padding: 18, overflow: 'hidden' }]}
            >
              <View style={{ position: 'relative', zIndex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                   <Icon size={18} color={T.dim} />
                </View>
                <View style={{ marginTop: 14 }}>
                   <Text style={{ fontFamily: FONTS.med, fontSize: 13, color: T.muted }}>{k.label}</Text>
                   <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 24, letterSpacing: -0.5, color: T.text }}>{k.value}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isUp ? T.okTint : T.bg2, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 }}>
                         {isUp && <TrendingUp size={12} color={T.ok} style={{ marginRight: 4 }} />}
                         <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: isUp ? T.ok : T.dim }}>{k.delta.replace('↑ ', '')}</Text>
                      </View>
                   </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Recent Activity + Platform Users */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Recent Activity */}
        <View style={[s.card, { flex: stack ? undefined : 1.7, overflow: 'hidden' }]} className="db-tile sa-stat-card">
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Recent Activity</Text>
            <Pressable onPress={() => onNavigate?.('analytics')}><Text style={s.linkRight}>View all →</Text></Pressable>
          </View>
          <View style={{ gap: 9 }}>
            {recentAct.slice(0, 3).map((a: any) => {
              const isChecked = checkedTasks.includes(a.id);
              return (
                <Pressable
                  key={a.id}
                  className="db-task"
                  style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: isChecked ? T.violet : T.line2, borderRadius: 12, backgroundColor: isChecked ? 'rgba(124,92,252,0.1)' : T.panel2, padding: 13 }}
                  onPress={() => setCheckedTasks(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                >
                   <View className="db-check" style={{ width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: isChecked ? T.violet : T.line2, backgroundColor: isChecked ? T.violet : 'transparent', marginTop: 1, alignItems: 'center', justifyContent: 'center' }}>
                     {isChecked && <CheckCircle size={12} color="#FFF" strokeWidth={3} />}
                   </View>
                   <View style={{ flex: 1, minWidth: 0 }}>
                     <Text style={{ fontFamily: FONTS.semi, fontSize: 14, lineHeight: 20, color: T.text }} numberOfLines={2}>{a.text}</Text>
                     <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: T.dim, marginTop: 4 }}>{a.sub} · {a.time}</Text>
                   </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={() => onNavigate?.('users')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 12.5, color: T.amber }}>{realPending} pending approvals</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: T.muted }}>awaiting review</Text>
          </Pressable>
        </View>

        {/* Platform Users distribution */}
        <View style={[s.card, { flex: stack ? undefined : 1, overflow: 'hidden' }]} className="db-tile sa-stat-card">
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
                  <Text style={[s.barValue, { color: isLast ? T.accentBright : T.dim }]}>{(m.value / 1000).toFixed(1)}k</Text>
                  <LinearGradient
                    colors={[isLast ? T.accentBright : T.primary, isLast ? T.accent : T.primaryD] as any}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                    style={{ width: '100%', height: h, borderTopLeftRadius: 5, borderTopRightRadius: 5, opacity: isLast ? 1 : 0.7 }}
                  />
                  <Text style={[s.barMonth, isLast && { color: '#F4F4FA', fontFamily: FONTS.bold }]}>{m.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Revenue Breakdown */}
        <View style={[s.card, { flex: stack ? undefined : 1 }]}>
          <Text style={s.cardTitle}>Revenue Breakdown</Text>
          <Text style={s.cardSub}>Revenue by event · {REVENUE_BREAKDOWN.length} sources</Text>
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

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
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
  heroTitle:  { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 19, letterSpacing: -0.4 },
  heroPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: SAC.primary, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  heroPrimaryText: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 12 },
  heroSec: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10,    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  heroSecText: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12 },

  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 15, letterSpacing: -0.2 },
  cardSub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },
  linkRight: { color: SAC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 },

  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  activityText: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 13 },
  activitySub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  activityDot: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11 },
  activityTime: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11 },

  distLabel: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12.5 },
  distPct:   { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 12.5 },
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
  adManagerTitle: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 13 },
  adEditBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: SAC.primary,
  },
  adEditBtnText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 11 },

  adEditorOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)', zIndex: 1000,
    justifyContent: 'center', alignItems: 'center',
    ...(Platform.OS === 'web' ? { position: 'fixed' } as any : {}),
  },
  adEditorModal: {
    backgroundColor: '#101019', borderColor: SAC.border, borderWidth: 1,
    borderRadius: 16, padding: 20, width: '90%', maxWidth: 440,
    gap: 8,
    ...(Platform.OS === 'web' ? { boxShadow: '0 24px 80px rgba(0,0,0,0.60)' } as any : {}),
  },
  adEditorTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 15 },
  adFieldLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, marginTop: 6 },
  adFieldInput: {
    backgroundColor: SAC.bg2, borderColor: SAC.border, borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    color: '#F4F4FA', fontFamily: FONTS.med, fontSize: 13,
  },
  adEmptyDrop: {
    alignItems: 'center', gap: 8, paddingVertical: 22, paddingHorizontal: 12,
    backgroundColor: SAC.bg2, borderColor: SAC.border, borderWidth: 1, borderStyle: 'dashed',
    borderRadius: 10,
  },
  adDraftCard: {
    backgroundColor: SAC.bg2, borderColor: SAC.border, borderWidth: 1,
    borderRadius: 10, padding: 10, gap: 6,
  },
  adFilePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
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
