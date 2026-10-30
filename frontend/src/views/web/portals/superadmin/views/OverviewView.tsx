/**
 * Super Admin Portal — Overview/Dashboard view (true RN port).
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform, Image, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import {
  Building2, GraduationCap, UserCheck, Users, CreditCard, Calendar,
  CheckCircle, BarChart3, Sparkles,
  Image as ImageIcon, Save, X, Upload, Trash2, TrendingUp, RefreshCw,
  Activity, Server, Database, HardDrive, Timer, ChevronDown
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS, useSAC, resolveColors } from '../tokens';
import { GRAD, useToast, Toast } from '../applekit';
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

type AdDraft = {
  label: string;
  image_url: string;
  redirect_url: string;
  key: string;
};

// ── Response shapes ────────────────────────────────────────────────────
// GET /api/analytics/super-admin  (backend/analytics.py::super_admin_analytics)
type SuperAdminAnalytics = {
  kpis: {
    total_users: number; students: number; alumni: number; mentors: number; colleges: number;
    pending_mentors: number; total_bookings: number; total_events: number;
    total_courses: number; total_internships: number;
  };
  role_distribution: { label: string; value: number; color: string }[];
  recent_bookings: { type: 'booking'; topic?: string | null; status?: string | null; at: string }[];
  recent_signups: { type: 'signup'; name?: string | null; role?: string | null; at: string }[];
  monthly_enrollments: { month: string; value: number }[];
  // `revenue` is intentionally NOT used: the backend estimates it from booking counts
  // when no payments exist, which is not a real figure.
};

// GET /api/admin/super-overview  (backend/portals.py::super_admin_overview)
// Only the revenue pieces are used here: they are summed from paid ECHO registrations.
type SuperOverview = {
  kpis: { id: string; value: string }[];
  revenueBreakdown: { source: string; amount: string; pct: number; color: string }[];
};

// GET /api/admin/system-health  (backend/portals.py::system_health_endpoint)
type SystemHealth = {
  api: {
    avg_response_ms: number; p50_response_ms: number; p95_response_ms: number;
    error_rate_pct: number; requests_24h: number;
  };
  database: { status: string; connections_active: number; connections_max: number; slow_queries_24h: number };
  background_jobs: {
    [key: string]: { last_run_at: string | null; items_processed: number | null } | {
      pending: number; sent_24h: number; failed_24h: number;
    };
  };
  storage: { uploads_size_mb: number; db_size_mb: number };
  uptime_seconds: number;
};

type ActivityItem = { id: string; text: string; sub: string; at: string };

const EMPTY_REVENUE_PLACEHOLDER = 'No paid registrations yet';

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function titleCase(v?: string | null): string {
  if (!v) return '';
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatUptime(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  if (m < 60) return `${m}m ${totalSeconds % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

// Green / amber / red for a named status dot
function statusColor(kind: string, T: any): string {
  if (kind === 'up') return T.ok;
  if (kind === 'down') return T.danger;
  return T.amber;
}

export function OverviewView({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const user = useAuthStore((st) => st.user);
  const firstName = (user?.full_name || 'Admin').split(' ')[0];

  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);

  const {
    data: analytics, loading: analyticsLoading, error: analyticsError, refresh: refreshAnalytics,
  } = usePortalData<SuperAdminAnalytics | null>('/analytics/super-admin', null, 30_000);
  const {
    data: overview, loading: overviewLoading, error: overviewError, refresh: refreshOverview,
  } = usePortalData<SuperOverview | null>('/admin/super-overview', null, 60_000);
  const {
    data: health, loading: healthLoading, error: healthError,
  } = usePortalData<SystemHealth | null>('/admin/system-health', null, 60_000);
  const [healthExpanded, setHealthExpanded] = useState(true);

  const k = analytics?.kpis;
  const realStudents = k?.students ?? 0;
  const realMentors = k?.mentors ?? 0;
  const realEvents = k?.total_events ?? 0;
  const realBookings = k?.total_bookings ?? 0;
  const realColleges = k?.colleges ?? 0;
  const realAlumni = k?.alumni ?? 0;
  const realPending = k?.pending_mentors ?? 0;
  const realCourses = k?.total_courses ?? 0;

  // Revenue comes from /admin/super-overview (sum of paid registrations this month).
  const revenueKpi = overview?.kpis?.find((x) => x.id === 'revenue')?.value;
  const revenueValue = overviewError && !overview ? 'Unavailable' : (revenueKpi ?? (overviewLoading ? '...' : '₹0'));

  const KPIS_MAPPED = [
    { id: 'colleges',    icon: 'Building2',     label: 'Total Colleges',       value: String(realColleges), delta: 'registered' },
    { id: 'students',    icon: 'GraduationCap', label: 'Total Students',       value: String(realStudents), delta: 'accounts' },
    { id: 'mentors',     icon: 'UserCheck',     label: 'Mentors',              value: String(realMentors),  delta: `${realPending} pending` },
    { id: 'alumni',      icon: 'Users',         label: 'Alumni Network',       value: String(realAlumni),   delta: 'accounts' },
    { id: 'revenue',     icon: 'CreditCard',    label: 'Revenue This Month',   value: revenueValue,         delta: 'paid registrations' },
    { id: 'events',      icon: 'Calendar',      label: 'Events',               value: String(realEvents),   delta: `${realBookings} bookings` },
    { id: 'approvals',   icon: 'CheckCircle',   label: 'Pending Approvals',    value: String(realPending),  delta: realPending > 0 ? 'review needed' : 'all clear' },
    { id: 'courses',     icon: 'BarChart3',     label: 'Courses Listed',       value: String(realCourses),  delta: 'in catalog' },
  ];

  // Recent activity: real bookings + signups with real timestamps, newest first.
  const recentAct: ActivityItem[] = [
    ...(analytics?.recent_bookings ?? []).map((b, i) => ({
      id: `b-${i}-${b.at}`,
      text: `New booking: ${b.topic || 'Mentor session'}`,
      sub: b.status ? `Status: ${titleCase(b.status)}` : 'Booking',
      at: b.at,
    })),
    ...(analytics?.recent_signups ?? []).map((u, i) => ({
      id: `u-${i}-${u.at}`,
      text: `${u.name || 'New user'} joined${u.role ? ` as ${titleCase(u.role)}` : ''}`,
      sub: 'User onboarded',
      at: u.at,
    })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  // Role distribution: compute percentages from real counts.
  const roleRows = analytics?.role_distribution ?? [];
  const roleTotal = roleRows.reduce((acc, r) => acc + (r.value || 0), 0);
  const PLATFORM_USERS = roleRows.map((r) => ({
    label: r.label,
    count: r.value || 0,
    pct: roleTotal > 0 ? Math.round(((r.value || 0) / roleTotal) * 100) : 0,
    color: r.color,
  }));

  const MONTHLY_ENROLLMENTS = analytics?.monthly_enrollments ?? [];
  const enrollTotal = MONTHLY_ENROLLMENTS.reduce((acc, m) => acc + (m.value || 0), 0);

  // Revenue breakdown: drop the backend's placeholder row so an empty state renders instead.
  const REVENUE_BREAKDOWN = (overview?.revenueBreakdown ?? []).filter(
    (r) => r.source !== EMPTY_REVENUE_PLACEHOLDER,
  );

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
  const maxEnroll = Math.max(1, ...MONTHLY_ENROLLMENTS.map((m) => m.value || 0));

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
              <Text style={{ fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 1.5, color: '#3B2FA8' }}>PLATFORM OVERVIEW</Text>
            </View>
            <View style={{ marginTop: 16, marginBottom: 10 }}>
              <Text style={{ fontSize: 33, fontFamily: FONTS.bold, letterSpacing: -1.4, lineHeight: 38, color: '#141726' }}>Welcome back, {firstName}.</Text>
            </View>
            <Text style={{ fontSize: 15.5, lineHeight: 24, color: '#4A4F63', maxWidth: 520 }}>
              {analyticsLoading && !analytics
                ? 'Loading live platform numbers...'
                : realPending > 0
                  ? `${realPending} mentor application${realPending === 1 ? '' : 's'} awaiting your review.`
                  : 'No mentor applications are waiting for review.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
               <Pressable onPress={() => onNavigate?.('users')} style={{ backgroundColor: '#4B3FD6', borderRadius: 11, paddingVertical: 13, paddingHorizontal: 22 }}>
                  <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: '#FFFFFF' }}>Review approvals</Text>
               </Pressable>
               <Pressable onPress={() => onNavigate?.('analytics')} style={{ borderColor: '#CFC9F3', borderWidth: 1, borderRadius: 11, paddingVertical: 13, paddingHorizontal: 22 }}>
                  <Text style={{ fontSize: 14, fontFamily: FONTS.semi, color: '#2E2A55' }}>Open analytics</Text>
               </Pressable>
            </View>
          </View>

          {!stack && analytics && (
            <View style={{ flexDirection: 'row', gap: 26 }}>
              <View>
                <Text style={{ fontSize: 10.5, fontFamily: FONTS.bold, letterSpacing: 1.3, color: '#5F6474', marginBottom: 8 }}>USERS</Text>
                <Text style={{ fontSize: 30, fontFamily: FONTS.bold, letterSpacing: -1.1, color: '#4B3FD6' }}>{k?.total_users ?? 0}</Text>
                <Text style={{ fontSize: 12, color: '#6B7080', marginTop: 5 }}>all roles</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10.5, fontFamily: FONTS.bold, letterSpacing: 1.3, color: '#5F6474', marginBottom: 8 }}>BOOKINGS</Text>
                <Text style={{ fontSize: 30, fontFamily: FONTS.bold, letterSpacing: -1.1, color: '#0E6E8C' }}>{realBookings}</Text>
                <Text style={{ fontSize: 12, color: '#6B7080', marginTop: 5 }}>all time</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10.5, fontFamily: FONTS.bold, letterSpacing: 1.3, color: '#5F6474', marginBottom: 8 }}>INTERNSHIPS</Text>
                <Text style={{ fontSize: 30, fontFamily: FONTS.bold, letterSpacing: -1.1, color: '#A21C63' }}>{k?.total_internships ?? 0}</Text>
                <Text style={{ fontSize: 12, color: '#6B7080', marginTop: 5 }}>listed</Text>
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

      {/* Platform analytics load error (KPIs, activity, users, enrollments) */}
      {analyticsError && !analytics && (
        <View style={[s.card, s.stateRow]}>
          <Text style={s.stateText}>Could not load platform analytics: {analyticsError}</Text>
          <Pressable onPress={refreshAnalytics} style={s.retryBtn}>
            <RefreshCw size={12} color={T.accentBright} />
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* 8 KPI tiles in 2 rows */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {KPIS_MAPPED.map((kpi) => {
          const Icon = KPI_ICONS[kpi.icon] || Building2;
          const isRevenue = kpi.id === 'revenue';
          const tileLoading = isRevenue ? (overviewLoading && !overview) : (analyticsLoading && !analytics);
          const tileError = isRevenue ? (overviewError && !overview) : (analyticsError && !analytics);
          const highlight = kpi.id === 'approvals' && realPending > 0;
          return (
            <View
              key={kpi.id}
              className="db-tile sa-stat-card"
              style={[s.card, { width: stack ? '100%' : '23.5%', minWidth: 200, padding: 18, overflow: 'hidden' }]}
            >
              <View style={{ position: 'relative', zIndex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                   <Icon size={18} color={T.dim} />
                   {tileLoading && <ActivityIndicator size="small" color={T.dim} />}
                </View>
                <View style={{ marginTop: 14 }}>
                   <Text style={{ fontFamily: FONTS.med, fontSize: 13, color: T.muted }}>{kpi.label}</Text>
                   <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: tileError ? 16 : 24, letterSpacing: -0.5, color: tileError ? T.muted : T.text }}>
                        {tileError ? 'Unavailable' : tileLoading ? '...' : kpi.value}
                      </Text>
                      {!tileError && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: highlight ? T.okTint : T.bg2, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 }}>
                           {highlight && <TrendingUp size={12} color={T.ok} style={{ marginRight: 4 }} />}
                           <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: highlight ? T.ok : T.dim }}>{kpi.delta}</Text>
                        </View>
                      )}
                   </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* System Health widget (SA2) */}
      {healthError && !health ? (
        <View style={[s.card, s.stateRow]}>
          <Text style={s.stateText}>System health could not be loaded.</Text>
        </View>
      ) : health || healthLoading ? (
        <View style={[s.card, { width: '100%' }]} className="db-tile sa-stat-card">
          <Pressable onPress={() => setHealthExpanded((v) => !v)} style={s.cardHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color={T.accent} />
              <Text style={s.cardTitle}>System Health</Text>
              {health && (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <View style={{ backgroundColor: statusColor(health.database.status, T), width: 7, height: 7, borderRadius: 4 }} />
                  <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: T.muted }}>
                    {health.database.status === 'up' ? 'all systems normal' : 'database down'}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={s.linkRight}>{healthExpanded ? 'Collapse' : 'Expand'}</Text>
              <ChevronDown size={14} color={T.dim} style={{ transform: [{ rotate: healthExpanded ? '0deg' : '-90deg' }] }} />
            </View>
          </Pressable>
          {healthLoading && !health ? (
            <View style={s.stateRow}><ActivityIndicator size="small" color={T.dim} /><Text style={s.stateText}>Loading system health...</Text></View>
          ) : health && healthExpanded ? (
            <View style={{ marginTop: 14, gap: 14 }}>
              {/* Status row */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={[s.healthChip, { backgroundColor: T.bg2 }]}>
                  <Server size={13} color={T.dim} />
                  <View style={{ gap: 2 }}>
                    <Text style={s.healthChipText}>API</Text>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: T.text }}>{health.api.requests_24h.toLocaleString()} req/24h</Text>
                    <Text style={s.healthChipSub}>avg {health.api.avg_response_ms}ms · p95 {health.api.p95_response_ms}ms</Text>
                  </View>
                </View>
                <View style={[s.healthChip, { backgroundColor: T.bg2 }]}>
                  <Database size={13} color={statusColor(health.database.status, T)} />
                  <View style={{ gap: 2 }}>
                    <Text style={s.healthChipText}>Database</Text>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: health.database.status === 'up' ? T.text : T.danger }}>
                      {health.database.status === 'up' ? 'up' : 'down'}
                    </Text>
                    <Text style={s.healthChipSub}>{health.database.connections_active} connections</Text>
                  </View>
                </View>
                <View style={[s.healthChip, { backgroundColor: T.bg2 }]}>
                  <HardDrive size={13} color={T.dim} />
                  <View style={{ gap: 2 }}>
                    <Text style={s.healthChipText}>Storage</Text>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: T.text }}>{health.storage.db_size_mb} MB db</Text>
                    <Text style={s.healthChipSub}>{health.storage.uploads_size_mb} MB uploads</Text>
                  </View>
                </View>
                <View style={[s.healthChip, { backgroundColor: T.bg2 }]}>
                  <Timer size={13} color={T.dim} />
                  <View style={{ gap: 2 }}>
                    <Text style={s.healthChipText}>Uptime</Text>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: T.text }}>{formatUptime(health.uptime_seconds)}</Text>
                  </View>
                </View>
              </View>
              {/* Background jobs */}
              <View>
                <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: T.muted, marginBottom: 8 }}>Background jobs</Text>
                <View style={{ gap: 6 }}>
                  {(['aggregator_deals', 'aggregator_rentals', 'aggregator_courses', 'aggregator_higher_ed', 'aggregator_financial'] as const).map((key) => {
                    const job: any = health.background_jobs[key];
                    const lastAt = job?.last_run_at ? relativeTime(job.last_run_at) : null;
                    const stale = lastAt ? /day|week|month/.test(lastAt) : true;
                    return (
                      <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: !job?.last_run_at ? T.muted : (stale ? T.amber : T.ok) }} />
                          <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: T.text }}>{titleCase(key)}</Text>
                        </View>
                        <Text style={{ fontFamily: FONTS.reg, fontSize: 11, color: T.muted }}>
                          {job?.items_processed != null ? `${job.items_processed} items · ` : ''}{lastAt ?? 'never run'}
                        </Text>
                      </View>
                    );
                  })}
                  {(() => {
                    const eq: any = health.background_jobs.email_queue;
                    if (!eq) return null;
                    const failed = eq.failed_24h;
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: failed > 0 ? T.danger : T.ok }} />
                          <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: T.text }}>Email queue</Text>
                        </View>
                        <Text style={{ fontFamily: FONTS.reg, fontSize: 11, color: T.muted }}>
                          {eq.sent_24h} sent · {failed} failed (24h)
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Recent Activity + Platform Users */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Recent Activity */}
        <View style={[s.card, { flex: stack ? undefined : 1.7, overflow: 'hidden' }]} className="db-tile sa-stat-card">
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Recent Activity</Text>
            <Pressable onPress={() => onNavigate?.('analytics')}><Text style={s.linkRight}>View all</Text></Pressable>
          </View>
          <View style={{ gap: 9, marginTop: 12 }}>
            {analyticsLoading && !analytics ? (
              <View style={s.stateRow}><ActivityIndicator size="small" color={T.dim} /><Text style={s.stateText}>Loading activity...</Text></View>
            ) : analyticsError && !analytics ? (
              <View style={s.stateRow}>
                <Text style={s.stateText}>Activity could not be loaded.</Text>
                <Pressable onPress={refreshAnalytics} style={s.retryBtn}>
                  <RefreshCw size={12} color={T.accentBright} />
                  <Text style={s.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : recentAct.length === 0 ? (
              <Text style={s.emptyText}>No activity yet. New bookings and sign-ups will appear here.</Text>
            ) : recentAct.slice(0, 5).map((a) => {
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
                     <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: T.dim, marginTop: 4 }}>{a.sub}{relativeTime(a.at) ? ` · ${relativeTime(a.at)}` : ''}</Text>
                   </View>
                </Pressable>
              );
            })}
          </View>
          {analytics && (
            <Pressable onPress={() => onNavigate?.('users')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12.5, color: T.amber }}>{realPending} pending approval{realPending === 1 ? '' : 's'}</Text>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: T.muted }}>awaiting review</Text>
            </Pressable>
          )}
        </View>

        {/* Platform Users distribution */}
        <View style={[s.card, { flex: stack ? undefined : 1, overflow: 'hidden' }]} className="db-tile sa-stat-card">
          <Text style={s.cardTitle}>Platform Users</Text>
          <View style={{ gap: 14, marginTop: 14 }}>
            {analyticsLoading && !analytics ? (
              <View style={s.stateRow}><ActivityIndicator size="small" color={T.dim} /><Text style={s.stateText}>Loading...</Text></View>
            ) : analyticsError && !analytics ? (
              <View style={s.stateRow}>
                <Text style={s.stateText}>Could not load user counts.</Text>
                <Pressable onPress={refreshAnalytics} style={s.retryBtn}>
                  <RefreshCw size={12} color={T.accentBright} />
                  <Text style={s.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : roleTotal === 0 ? (
              <Text style={s.emptyText}>No users yet.</Text>
            ) : PLATFORM_USERS.map((u) => (
              <View key={u.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={s.distLabel}>{u.label}</Text>
                  <Text style={s.distPct}>{u.pct}%</Text>
                </View>
                <View style={s.distTrack}>
                  <View style={[s.distFill, { width: `${u.pct}%` as any, backgroundColor: u.color }]} />
                </View>
                <Text style={s.distCount}>{u.count.toLocaleString('en-IN')}</Text>
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
          <Text style={s.cardSub}>New student accounts per month, last 6 months</Text>
          {analyticsLoading && !analytics ? (
            <View style={[s.stateRow, { height: 130, marginTop: 22 }]}><ActivityIndicator size="small" color={T.dim} /><Text style={s.stateText}>Loading...</Text></View>
          ) : analyticsError && !analytics ? (
            <View style={[s.stateRow, { marginTop: 22 }]}>
              <Text style={s.stateText}>Could not load enrollments.</Text>
              <Pressable onPress={refreshAnalytics} style={s.retryBtn}>
                <RefreshCw size={12} color={T.accentBright} />
                <Text style={s.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : MONTHLY_ENROLLMENTS.length === 0 || enrollTotal === 0 ? (
            <View style={{ height: 130, marginTop: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={s.emptyText}>No student enrollments in the last 6 months.</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 130, marginTop: 22, paddingHorizontal: 4 }}>
              {MONTHLY_ENROLLMENTS.map((m, i) => {
                const isLast = i === MONTHLY_ENROLLMENTS.length - 1;
                const h = Math.max(2, Math.round(((m.value || 0) / maxEnroll) * 110));
                return (
                  <View key={`${m.month}-${i}`} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={[s.barValue, { color: isLast ? T.accentBright : T.dim }]}>{(m.value || 0).toLocaleString('en-IN')}</Text>
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
          )}
        </View>

        {/* Revenue Breakdown */}
        <View style={[s.card, { flex: stack ? undefined : 1 }]}>
          <Text style={s.cardTitle}>Revenue Breakdown</Text>
          <Text style={s.cardSub}>
            {REVENUE_BREAKDOWN.length > 0
              ? `Paid registrations by event · ${REVENUE_BREAKDOWN.length} source${REVENUE_BREAKDOWN.length === 1 ? '' : 's'}`
              : 'Paid registrations by event'}
          </Text>
          <View style={{ gap: 12, marginTop: 16 }}>
            {overviewLoading && !overview ? (
              <View style={s.stateRow}><ActivityIndicator size="small" color={T.dim} /><Text style={s.stateText}>Loading...</Text></View>
            ) : overviewError && !overview ? (
              <View style={s.stateRow}>
                <Text style={s.stateText}>Could not load revenue: {overviewError}</Text>
                <Pressable onPress={refreshOverview} style={s.retryBtn}>
                  <RefreshCw size={12} color={T.accentBright} />
                  <Text style={s.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : REVENUE_BREAKDOWN.length === 0 ? (
              <Text style={s.emptyText}>No paid registrations yet.</Text>
            ) : REVENUE_BREAKDOWN.map((r, i) => (
              <View key={`${r.source}-${i}`}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={s.distLabel} numberOfLines={1}>{r.source}</Text>
                  <Text style={s.revAmount}>{r.amount}</Text>
                </View>
                <View style={s.distTrack}>
                  <View style={[s.distFill, { width: `${Math.min(100, Math.max(0, r.pct))}%` as any, backgroundColor: r.color }]} />
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

  // System Health widget
  healthChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    borderColor: SAC.border, borderWidth: 1,
  },
  healthChipText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  healthChipSub: { color: SAC.dim, fontFamily: FONTS.reg, fontSize: 10.5 },

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

  // Loading / empty / error states
  stateRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  stateText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, flexShrink: 1 },
  emptyText: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', paddingVertical: 12 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderColor: SAC.border, borderWidth: 1, backgroundColor: SAC.bg2,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  retryText: { color: SAC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 },

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
