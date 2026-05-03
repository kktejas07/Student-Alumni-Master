/**
 * Profile (Phase 4 — SA Profile Web)
 * Three-page editor: Profile Information / Manage Profile / Settings & Preferences.
 * Shell with sidebar navigation (collapses to top tabs on mobile) + save bar.
 */
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  useWindowDimensions, Platform, Image, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft, User, Settings as SettingsIcon, SlidersHorizontal,
  LogOut, Check, X as CloseX, IdCard, Bell, ShieldCheck, PencilLine,
  CalendarDays, UsersRound, Eye, Target, Send, ShieldCheck as ShieldIcon,
  Download, Share2, RotateCw, Copy as CopyIcon,
  CalendarCheck, Zap, Building2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { request } from '@/src/models/services/api';
import { tokenStore } from '@/src/models/services/api';
import { useAuth } from '@/src/viewmodels/hooks';
import { ProfileInfoPage } from '@/src/views/web/profile/ProfileInfoPage';
import { ManageProfilePage } from '@/src/views/web/profile/ManageProfilePage';
import { SettingsPage } from '@/src/views/web/profile/SettingsPage';
import { SaveBar, C } from '@/src/views/web/profile/primitives';
import { MemberIdCard } from '@/src/views/components/MemberIdCard';

type PageKey = 'info' | 'digitalid' | 'manage' | 'notifications' | 'privacy' | 'settings';

interface CompletionData {
  percentage: number;
  items: { key: string; label: string; done: boolean; weight: number }[];
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const { width: winW } = useWindowDimensions();
  const isMobile = winW < 900;

  const [page, setPage] = useState<PageKey>('info');
  const [draft, setDraft] = useState<any>({});
  const [original, setOriginal] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState<CompletionData>({ percentage: 0, items: [] });
  const [badges, setBadges] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const showToast = useCallback((m: string) => {
    setToast(m); setTimeout(() => setToast(null), 2400);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [me, comp, bg] = await Promise.all([
        request<any>('/auth/me'),
        request<CompletionData>('/users/me/completion'),
        request<{ badges: any[] }>('/users/me/badges'),
      ]);
      setDraft(me); setOriginal(me);
      setCompletion(comp);
      setBadges(bg.badges || []);
    } catch (e) {
      // ignore — show empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const dirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(original);
  }, [draft, original]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Split prefs from main update
      const { preferences, ...rest } = draft;
      await request('/users/me', { method: 'PUT', body: rest } as any);
      if (preferences) {
        await request('/users/me/preferences', { method: 'PATCH', body: preferences } as any);
      }
      setOriginal(draft);
      const now = new Date();
      setLastSavedAt(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast('Saved ✓');
      // Refresh completion
      try {
        const comp = await request<CompletionData>('/users/me/completion');
        setCompletion(comp);
      } catch {}
      try { await refreshUser?.(); } catch {}
    } catch (e: any) {
      showToast(e?.message || 'Save failed');
    }
    setSaving(false);
  };

  const handleDiscard = () => setDraft(original);

  const handleUploadPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, quality: 0.7, base64: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
      setDraft((d: any) => ({ ...d, photo_data: dataUrl, face_image_base64: dataUrl }));
      showToast('Photo selected — Save to apply');
    } catch (e: any) {
      showToast('Failed to pick image');
    }
  };

  const handleLogout = async () => {
    try { await tokenStore.clear(); } catch {}
    try { await logout?.(); } catch {}
    showToast('Logged out — see you soon 👋');
    setTimeout(() => router.replace('/welcome'), 400);
  };

  const NAV_PROFILE: { key: PageKey; label: string; icon: any; sub: string }[] = [
    { key: 'info', label: 'Profile Information', icon: User, sub: 'Identity, education, social, skills' },
    { key: 'manage', label: 'Manage Profile', icon: SlidersHorizontal, sub: 'Visibility, resume, sections, badges' },
  ];
  const NAV_ACCOUNT: { key: PageKey; label: string; icon: any; sub: string }[] = [
    { key: 'settings', label: 'Settings', icon: SettingsIcon, sub: 'AI coach, language, theme, account' },
    { key: 'notifications', label: 'Notifications', icon: Bell, sub: 'Choose what we ping you about' },
    { key: 'privacy', label: 'Security', icon: ShieldCheck, sub: 'Privacy, 2FA, password, data' },
  ];
  const NAV = [...NAV_PROFILE, ...NAV_ACCOUNT];
  const currentNav = NAV.find((n) => n.key === page) || NAV[0];
  const topTab: 'edit' | 'digitalid' = page === 'digitalid' ? 'digitalid' : 'edit';

  const headlineStr = draft.headline || [
    draft.branch || draft.school_info?.branch_or_stream,
    draft.institution || draft.school_info?.institution_name,
  ].filter(Boolean).join(' · ') || 'Add a headline…';
  const cgpaChip = draft.cgpa;
  const sessionsChip = draft.sessions_completed || draft.mentor_sessions_used;
  const stats = {
    sessions: draft.sessions_completed || 0,
    connections: draft.connections_count || 0,
    profile_views: draft.profile_views || 0,
    mentor_sessions: draft.mentor_sessions_used || 0,
    applications: draft.applications_count || 0,
  };

  // Derive a displayable SA ID (prefers unique_id → sa_id → student_id)
  const sidToDisplay = draft.sa_id || draft.unique_id || draft.student_id || '';

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.purple} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={[styles.layout, isMobile && { flexDirection: 'column' }]}>
        {/* Sidebar */}
        {!isMobile && (
          <View style={styles.sidebar}>
            {/* Brand */}
            <View style={styles.brandRow}>
              <View style={styles.brandBox}><Text style={styles.brandBoxText}>SA</Text></View>
              <View>
                <Text style={styles.brandName}>Student Alumni</Text>
                <Text style={styles.brandKicker}>PROFILE SETTINGS</Text>
              </View>
            </View>

            <View style={styles.miniCard}>
              <View style={styles.miniAvatar}>
                {draft.photo_data || draft.face_image_base64 ? (
                  <Image source={{ uri: draft.photo_data || draft.face_image_base64 }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={styles.miniAvatarText}>{((draft.full_name || '?').split(' ').slice(0,2).map((s: string) => s[0] || '').join('') || '?').toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={styles.miniName} numberOfLines={1}>{draft.full_name || 'Your name'}</Text>
                <Text style={styles.miniMeta} numberOfLines={1}>{[
                  draft.institution || draft.school_info?.institution_name,
                  draft.branch || draft.school_info?.branch_or_stream,
                ].filter(Boolean).join(' · ') || '—'}</Text>
                {(() => {
                  const gy = draft.graduation_year || draft.school_info?.graduation_year;
                  return gy ? <Text style={styles.miniMeta2} numberOfLines={1}>{`'${String(gy).slice(-2)}`}</Text> : null;
                })()}
              </View>
              <View style={styles.miniPct}>
                <Text style={styles.miniPctText}>{completion.percentage}%</Text>
              </View>
            </View>

            <Text style={styles.navHeader}>PROFILE</Text>
            {NAV_PROFILE.map((n) => {
              const Icon = n.icon; const active = page === n.key;
              return (
                <Pressable key={n.key} onPress={() => setPage(n.key)} style={[styles.navItem, active && styles.navItemActive]} testID={`profile-nav-${n.key}`}>
                  <Icon size={15} color={active ? '#fff' : C.text2} />
                  <Text style={[styles.navText, active && { color: '#fff' }]}>{n.label}</Text>
                </Pressable>
              );
            })}

            <Text style={[styles.navHeader, { marginTop: 14 }]}>ACCOUNT</Text>
            {NAV_ACCOUNT.map((n) => {
              const Icon = n.icon; const active = page === n.key;
              return (
                <Pressable key={n.key} onPress={() => setPage(n.key)} style={[styles.navItem, active && styles.navItemActive]} testID={`profile-nav-${n.key}`}>
                  <Icon size={15} color={active ? '#fff' : C.text2} />
                  <Text style={[styles.navText, active && { color: '#fff' }]}>{n.label}</Text>
                </Pressable>
              );
            })}
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => {
              // Contextual back: if on a sub-page → return to Profile Info; if already on Info → go to Dashboard
              if (page !== 'info') {
                showToast('Back to Profile');
                setPage('info');
              } else {
                showToast('Returning to dashboard…');
                router.replace('/platform');
              }
            }} style={styles.backBtn} testID="profile-back">
              <ArrowLeft size={14} color={C.text2} /><Text style={styles.backText}>{page !== 'info' ? 'Back to Profile' : 'Back to Dashboard'}</Text>
            </Pressable>
          </View>
        )}

        {/* Main */}
        <View style={[styles.main, isMobile && { paddingHorizontal: 14 }]}>
          {/* Top bar — Edit Profile primary + Digital ID toggle + score pill + avatar */}
          <View style={styles.topBar}>
            {isMobile && (
              <Pressable onPress={() => { showToast('Returning to dashboard…'); router.replace('/platform'); }} style={styles.backBtnSm}><ArrowLeft size={16} color="#fff" /></Pressable>
            )}
            {/* Primary Edit Profile button */}
            <Pressable onPress={() => setPage('info')} style={[styles.tbEditBtn, topTab === 'edit' && styles.tbEditBtnActive]} testID="profile-topbar-edit">
              <User size={14} color="#fff" />
              <Text style={styles.tbEditText}>Edit Profile</Text>
            </Pressable>
            {/* Digital ID Card outline button */}
            <Pressable onPress={() => setPage('digitalid')} style={[styles.tbIdBtn, topTab === 'digitalid' && styles.tbIdBtnActive]} testID="profile-topbar-digitalid">
              <IdCard size={13} color={topTab === 'digitalid' ? '#fff' : C.text2} />
              <Text style={[styles.tbIdText, topTab === 'digitalid' && { color: '#fff' }]}>Digital ID Card</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <View style={styles.scorePill}>
              <Text style={styles.scorePillText}>Profile {completion.percentage}%</Text>
            </View>
            <View style={styles.topAvatar}>
              {draft.photo_data || draft.face_image_base64 ? (
                <Image source={{ uri: draft.photo_data || draft.face_image_base64 }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={styles.topAvatarText}>{((draft.full_name || '?').split(' ').slice(0,2).map((s: string) => s[0] || '').join('') || '?').toUpperCase()}</Text>
              )}
            </View>
          </View>

          {/* Mobile tab pills */}
          {isMobile && (
            <View style={styles.mobileTabs}>
              {NAV.map((n) => (
                <Pressable key={n.key} onPress={() => setPage(n.key)} style={[styles.mTab, page === n.key && styles.mTabActive]}>
                  <Text style={[styles.mTabText, page === n.key && { color: '#fff' }]} numberOfLines={1}>{n.label.split(' ')[0]}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Main body — 2-column layout (content + right rail) on desktop */}
          <View style={[styles.bodyRow, isMobile && { flexDirection: 'column' }]}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              {/* HERO CARD (only on info page) */}
              {page === 'info' && (
                <View style={styles.heroCard}>
                  <View style={styles.heroAvatar}>
                    {draft.photo_data || draft.face_image_base64 ? (
                      <Image source={{ uri: draft.photo_data || draft.face_image_base64 }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Text style={styles.heroAvatarText}>{((draft.full_name || '?').split(' ').slice(0,2).map((s: string) => s[0] || '').join('') || '?').toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
                    <Text style={styles.heroName} numberOfLines={1}>{draft.full_name || 'Your name'}</Text>
                    <Text style={styles.heroSub} numberOfLines={1}>{headlineStr}</Text>
                    <View style={styles.heroChips}>
                      {cgpaChip && (
                        <View style={[styles.heroChip, { borderColor: 'rgba(252,211,77,0.45)' }]}>
                          <Text style={[styles.heroChipText, { color: '#FCD34D' }]}>CGPA {cgpaChip}</Text>
                        </View>
                      )}
                      {sessionsChip != null && sessionsChip > 0 && (
                        <View style={[styles.heroChip, { borderColor: 'rgba(52,211,153,0.45)' }]}>
                          <Text style={[styles.heroChipText, { color: '#34D399' }]}>{sessionsChip} sessions</Text>
                        </View>
                      )}
                      <View style={[styles.heroChipSolid]}>
                        <ShieldIcon size={11} color="#C4B5FD" />
                        <Text style={[styles.heroChipText, { color: '#C4B5FD' }]}>Verified {draft.role === 'mentor' ? 'Mentor' : draft.role === 'alumni' ? 'Alumni' : 'Student'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {page === 'info' && (
                <ProfileInfoPage draft={draft} setDraft={setDraft} completion={completion} onUploadPhoto={handleUploadPhoto} />
              )}
              {page === 'digitalid' && (
                <DigitalIdCardInline userId={user?.id} isMobile={isMobile} draft={draft} completion={completion} showToast={showToast} />
              )}
              {page === 'manage' && (
                <ManageProfilePage draft={draft} setDraft={setDraft} badges={badges} onCertChange={loadAll} showToast={showToast} />
              )}
              {page === 'notifications' && (
                <SettingsPage draft={draft} setDraft={setDraft} showToast={showToast} section="notifications" />
              )}
              {page === 'privacy' && (
                <SettingsPage draft={draft} setDraft={setDraft} showToast={showToast} section="privacy" />
              )}
              {page === 'settings' && (
                <SettingsPage draft={draft} setDraft={setDraft} showToast={showToast} section="general" />
              )}
              <View style={{ height: 12 }} />
              {page !== 'digitalid' && (
                <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={handleDiscard} lastSavedAt={lastSavedAt} />
              )}
            </ScrollView>

            {/* Right rail */}
            {!isMobile && winW >= 1150 && (
              <View style={styles.rightRail}>
                <View style={styles.rrCard}>
                  <Text style={styles.rrKicker}>STUDENT STATS</Text>
                  <View style={{ marginTop: 10 }}>
                    <StatRow Icon={CalendarDays} label="Sessions Completed" value={stats.sessions} color="#34D399" />
                    <View style={styles.rrDivider} />
                    <StatRow Icon={UsersRound} label="Connections Made" value={stats.connections} color="#60A5FA" />
                    <View style={styles.rrDivider} />
                    <StatRow Icon={Eye} label="Profile Views" value={stats.profile_views} color="#C4B5FD" />
                    <View style={styles.rrDivider} />
                    <StatRow Icon={CalendarDays} label="Mentor Sessions" value={stats.mentor_sessions} color="#FCD34D" />
                    <View style={styles.rrDivider} />
                    <StatRow Icon={Send} label="Applications Sent" value={stats.applications} color="#FB923C" />
                  </View>
                </View>
                <View style={styles.rrIdCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShieldIcon size={14} color="#A78BFA" /><Text style={styles.rrIdKicker}>Student ID</Text>
                  </View>
                  <Text style={styles.rrIdMono}>{sidToDisplay || '—'}</Text>
                  <Text style={styles.rrIdMeta}>Verified · Active since {new Date(draft.created_at || Date.now()).getFullYear()}</Text>
                  <Pressable onPress={() => setPage('digitalid')} style={styles.rrIdBtn} testID="rr-view-id">
                    <Text style={styles.rrIdBtnText}>View Digital ID Card →</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Check size={14} color={C.green} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Digital ID Card inline — 3-slide carousel, hover glow, real download/share
function DigitalIdCardInline({ userId, isMobile, draft, completion, showToast }: { userId?: string; isMobile: boolean; draft: any; completion: any; showToast: (m: string) => void }) {
  const router = useRouter();
  const [slide, setSlide] = useState(0); // 0 front, 1 back, 2 perks
  const [hoverCard, setHoverCard] = useState(false);
  const cardRef = useRef<any>(null);
  const sid = draft?.sa_id || draft?.unique_id || draft?.student_id || 'SA-2026-XXXXXX';
  const fullName = draft?.full_name || 'Your Name';
  const institution = draft?.institution || draft?.school_info?.institution_name || 'Your Institution';
  const branch = draft?.branch || draft?.school_info?.branch_or_stream || '';
  const gradYear = draft?.graduation_year || draft?.school_info?.graduation_year || '';
  const validUntil = gradYear ? `Jun ${gradYear}` : '—';
  const initials = (fullName.split(' ').slice(0,2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();
  const qrValue = typeof window !== 'undefined' ? `${window.location.origin}/verify/${sid}` : `verify/${sid}`;

  const onCopyId = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(sid);
      }
      showToast('Student ID copied to clipboard 📋');
    } catch { showToast('Unable to copy ID'); }
  };

  // Real Download — html2canvas → PNG → trigger download
  const onDownload = async () => {
    showToast('Generating your ID Card…');
    try {
      if (Platform.OS === 'web') {
        const html2canvas = (await import('html2canvas')).default;
        const node = cardRef.current as unknown as HTMLElement;
        if (!node) { showToast('Card not ready yet'); return; }
        const canvas = await html2canvas(node, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `SA-ID-${sid}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        showToast('ID Card downloaded ✓');
      } else {
        router.push('/id-card');
      }
    } catch {
      showToast('Download failed — please try again');
    }
  };

  // Real Share — Web Share API (with image file if supported) → fallback to clipboard copy
  const onShare = async () => {
    try {
      const shareText = `My Student Alumni Digital ID\n${sid}\n${qrValue}`;
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        const nav = navigator as any;
        if (nav.share) {
          try {
            const html2canvas = (await import('html2canvas')).default;
            const node = cardRef.current as unknown as HTMLElement;
            if (node && nav.canShare) {
              const canvas = await html2canvas(node, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
              const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
              if (blob) {
                const file = new File([blob], `SA-ID-${sid}.png`, { type: 'image/png' });
                if (nav.canShare({ files: [file] })) {
                  await nav.share({ title: 'My Student Alumni ID', text: shareText, files: [file] });
                  showToast('Shared ✓'); return;
                }
              }
            }
          } catch {}
          await nav.share({ title: 'My Student Alumni ID', text: shareText, url: qrValue });
          showToast('Shared ✓'); return;
        }
        await navigator.clipboard.writeText(qrValue);
        showToast('Share link copied to clipboard 🔗');
      } else {
        await Share.share({ message: shareText });
        showToast('Shared ✓');
      }
    } catch { showToast('Share cancelled'); }
  };

  const goSlide = (n: number) => {
    const next = Math.max(0, Math.min(1, n));
    setSlide(next);
    const labels = ['Front', 'Back'];
    showToast(`Card: ${labels[next]}`);
  };

  return (
    <View style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
      <LinearGradient
        colors={['rgba(139,92,246,0.22)', 'rgba(88,28,135,0.32)', 'rgba(30,20,55,0.92)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ padding: isMobile ? 18 : 28, gap: 18 }}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: isMobile ? 22 : 28, letterSpacing: -0.3 }}>Student Alumni</Text>
          <Text style={{ color: 'rgba(255,255,255,0.70)', fontFamily: 'DMSans_500Medium', fontSize: 13 }}>Your verified digital identity · Used across all platform features</Text>
        </View>

        {/* INTERACTIVE FLIP CARD (replaces previous slide carousel) */}
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 500, gap: 12 }}>
          <MemberIdCard
            uniqueId={sid}
            role={(user?.role as any) || 'student'}
            tier={((user as any)?.ranking_tier as any) || 'gold'}
            qrBase64={user?.qr_code_base64}
            validFromYear={new Date(user?.created_at || Date.now()).getFullYear()}
          />
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 11, textAlign: 'center' }}>Tap card to flip · Front &amp; back</Text>
        </View>

        {/* YOUR STUDENT ID box */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.1 }}>YOUR STUDENT ID</Text>
            <Text style={{ color: '#fff', fontFamily: Platform.OS === 'web' ? 'monospace' : 'DMSans_800ExtraBold', fontSize: 22, marginTop: 6, letterSpacing: 0.3, fontWeight: '700' as any }}>{sid}</Text>
          </View>
          <Pressable onPress={onCopyId} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 9, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1, ...(Platform.OS === 'web' ? ({ boxShadow: '0 4px 14px rgba(124,58,237,0.25)' } as any) : {}), ...({ cursor: 'pointer' } as any) }} testID="did-copy-id">
            <CopyIcon size={13} color="#C4B5FD" />
            <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 }}>Copy ID</Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Pressable onPress={onDownload} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, height: 40, borderRadius: 10, backgroundColor: C.purple, ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 55%, #6D28D9 100%)', boxShadow: '0 8px 22px rgba(124,58,237,0.45)' } as any) : {}), ...({ cursor: 'pointer' } as any) }} testID="did-download">
            <Download size={14} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 }}>Download ID Card</Text>
          </Pressable>
          <Pressable onPress={onShare} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, height: 40, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1, ...(Platform.OS === 'web' ? ({ boxShadow: '0 6px 18px rgba(124,58,237,0.25)' } as any) : {}), ...({ cursor: 'pointer' } as any) }} testID="did-share">
            <Share2 size={14} color="#C4B5FD" />
            <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 }}>Share ID</Text>
          </Pressable>
          <Pressable onPress={() => goSlide((slide + 1) % 2)} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, height: 40, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1, ...(Platform.OS === 'web' ? ({ boxShadow: '0 6px 18px rgba(124,58,237,0.25)' } as any) : {}), ...({ cursor: 'pointer' } as any) }} testID="did-flip">
            <RotateCw size={14} color="#C4B5FD" />
            <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 }}>Next Card</Text>
          </Pressable>
        </View>

        {/* MEMBER PERKS — separate widget (purple palette matching theme) */}
        <View style={{ padding: 20, borderRadius: 16, backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.4 }}>SA · MEMBER PERKS</Text>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(252,211,77,0.16)', borderColor: 'rgba(252,211,77,0.45)', borderWidth: 1 }}>
              <Text style={{ color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 }}>TIER · STUDENT</Text>
            </View>
          </View>
          <Text style={{ color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 19 }}>Unlocked Benefits</Text>
          {[
            { label: 'Free mentor sessions', v: '3 / month' },
            { label: 'Partner workshops', v: 'Free entry' },
            { label: 'Resume review credits', v: '5' },
            { label: 'Knowledge Room access', v: 'Unlimited' },
          ].map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomColor: 'rgba(255,255,255,0.08)', borderBottomWidth: i < 3 ? 1 : 0 }}>
              <Text style={{ color: 'rgba(255,255,255,0.80)', fontFamily: 'DMSans_500Medium', fontSize: 13 }}>{r.label}</Text>
              <Text style={{ color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 }}>{r.v}</Text>
            </View>
          ))}
        </View>

        {/* THIS ID WORKS ACROSS THE PLATFORM */}
        <View style={{ gap: 12, marginTop: 4 }}>
          <Text style={{ color: 'rgba(255,255,255,0.60)', fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.2 }}>THIS ID WORKS ACROSS THE PLATFORM</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { Icon: CalendarCheck, title: 'Event Registration', sub: 'Tap to check in at meetups', color: '#A78BFA' },
              { Icon: UsersRound, title: 'Book a Session', sub: 'Mentor slots auto-verified', color: '#34D399' },
              { Icon: Building2, title: 'College Verification', sub: 'Campus gate & partner access', color: '#F472B6' },
              { Icon: Zap, title: 'Instant Connect', sub: 'Share profile via QR scan', color: '#FCD34D' },
            ].map((f, i) => (
              <PerkCard key={i} Icon={f.Icon} title={f.title} sub={f.sub} color={f.color} />
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// Tiny perk card with hover lift on web
function PerkCard({ Icon, title, sub, color }: { Icon: any; title: string; sub: string; color: string }) {
  const [h, setH] = useState(false);
  const webProps: any = Platform.OS === 'web' ? { onMouseEnter: () => setH(true), onMouseLeave: () => setH(false) } : {};
  return (
    <View
      {...webProps}
      style={{
        flex: 1, minWidth: 180, padding: 14, borderRadius: 12,
        backgroundColor: h ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        borderColor: h ? color + '66' : 'rgba(255,255,255,0.09)', borderWidth: 1,
        ...(Platform.OS === 'web' ? ({ transition: 'all .25s ease', transform: h ? 'translateY(-2px)' : 'translateY(0)' } as any) : {}),
      } as any}
    >
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: color + '22', borderColor: color + '55', borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
        <Icon size={15} color={color} />
      </View>
      <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 }}>{title}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.60)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 4 }}>{sub}</Text>
    </View>
  );
}

// Reusable hover-border-gradient wrapper — applies a purple conic-gradient ring
// only when the pointer hovers. Works on web only; on native it renders passthrough.
function HoverGlow({ children, style, padding = 2, radius = 16 }: { children: any; style?: any; padding?: number; radius?: number }) {
  const [h, setH] = useState(false);
  if (Platform.OS !== 'web') return <View style={style}>{children}</View>;
  return (
    <View
      // @ts-ignore
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={[{ position: 'relative', padding, borderRadius: radius + padding, transition: 'transform .3s ease', transform: h ? 'translateY(-3px)' : 'translateY(0)' } as any, style]}
    >
      <View
        // @ts-ignore
        style={{
          position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: radius + padding + 2,
          backgroundImage: 'conic-gradient(from 140deg, #A78BFA, #C4B5FD, #7C3AED, #6D28D9, #A78BFA)',
          opacity: h ? 0.9 : 0,
          filter: h ? 'blur(8px)' : 'blur(3px)',
          transition: 'opacity .3s ease, filter .3s ease',
          pointerEvents: 'none',
        } as any}
      />
      <View style={{ borderRadius: radius, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

// Small helper for right-rail stats rows (uses Lucide icons)
function StatRow({ Icon, label, value, color }: { Icon: any; label: string; value: number | string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: color + '22', borderColor: color + '44', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </View>
      <Text style={{ color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  layout: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 268, paddingHorizontal: 18, paddingVertical: 22, gap: 6,
    borderRightColor: 'rgba(255,255,255,0.06)', borderRightWidth: 1,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  brandBox: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  brandBoxText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  brandName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  brandKicker: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.8, marginTop: 2 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  backText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
  miniCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
  },
  miniAvatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA, #7C3AED 55%, #6D28D9)' } as any) : {}) },
  miniAvatarText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  miniName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13.5 },
  miniMeta: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 1 },
  miniMeta2: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 10.5, marginTop: 1 },
  miniPct: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(251,146,60,0.14)', borderColor: 'rgba(251,146,60,0.45)', borderWidth: 1 },
  miniPctText: { color: '#FB923C', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },

  navHeader: { color: 'rgba(255,255,255,0.40)', fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 0.8, marginTop: 4, marginBottom: 4, paddingHorizontal: 4 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9,
    ...({ cursor: 'pointer' } as any),
  },
  navItemActive: { backgroundColor: 'rgba(167,139,250,0.16)' },
  navText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12.5 },

  main: { flex: 1, paddingHorizontal: 28, paddingTop: 18 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtnSm: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  title: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 19 },
  subtitle: { color: C.text2, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(252,211,77,0.14)', borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1 },
  scorePillText: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },
  topAvatar: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1, ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA, #7C3AED 55%, #6D28D9)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' } as any) : {}) },
  topAvatarText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },

  // Hero card
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 22, padding: 24, marginBottom: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1 },
  heroAvatar: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA, #7C3AED 55%, #6D28D9)', boxShadow: '0 10px 28px rgba(124,58,237,0.35)' } as any) : {}) },
  heroAvatarText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 30 },
  heroName: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 26, letterSpacing: -0.3 },
  heroSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 13 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  heroChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1, backgroundColor: 'transparent' },
  heroChipSolid: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(167,139,250,0.45)', backgroundColor: 'rgba(167,139,250,0.10)' },
  heroChipText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },

  // Right rail
  bodyRow: { flex: 1, flexDirection: 'row', gap: 18 },
  rightRail: { width: 280, gap: 14 },
  rrCard: { padding: 18, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1 },
  rrKicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5, letterSpacing: 1.1 },
  rrDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  rrIdCard: { padding: 18, borderRadius: 14, backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, gap: 4 },
  rrIdKicker: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 12, letterSpacing: 0.3 },
  rrIdMono: { color: '#fff', fontFamily: Platform.OS === 'web' ? 'monospace' : 'DMSans_800ExtraBold', fontSize: 22, marginTop: 6, letterSpacing: 0.3, fontWeight: '700' as any },
  rrIdMeta: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 2 },
  rrIdBtn: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, backgroundColor: C.purple, alignItems: 'center', ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 55%, #6D28D9 100%)', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' } as any) : {}), ...({ cursor: 'pointer' } as any) },
  rrIdBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  // Top bar buttons (Edit Profile = primary purple gradient, Digital ID Card = outline that becomes gradient when active)
  tbEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, height: 38, borderRadius: 9, backgroundColor: C.purple, ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 55%, #6D28D9 100%)', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' } as any) : {}), ...({ cursor: 'pointer' } as any) },
  tbEditBtnActive: { backgroundColor: C.purple, ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 55%, #6D28D9 100%)' } as any) : {}) },
  tbEditText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  tbIdBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, height: 38, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  tbIdBtnActive: { backgroundColor: C.purple, borderColor: '#7C3AED', ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 55%, #6D28D9 100%)', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' } as any) : {}) },
  tbIdText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12.5 },

  // Top tab toggle (legacy, kept for possible reuse)
  toggleWrap: {
    flexDirection: 'row', gap: 4, padding: 4, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1,
  },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 28, borderRadius: 7, ...({ cursor: 'pointer' } as any) },
  toggleBtnActive: { backgroundColor: C.purple },
  toggleText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  // Digital ID Card inline
  idCardShell: { gap: 14 },
  idCardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 18, borderRadius: 14, backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1 },
  idCardTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 16 },
  idCardSub: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 3 },
  idCardBtn: { paddingHorizontal: 14, height: 34, borderRadius: 8, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  idCardBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  idCardFrame: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#0C0818', borderColor: C.border, borderWidth: 1 },
  idCardFallback: { padding: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, alignItems: 'center' },
  idCardFallbackText: { color: '#A78BFA', fontFamily: 'DMSans_700Bold', fontSize: 13 },

  mobileTabs: { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  mTab: { flex: 1, paddingVertical: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1, alignItems: 'center', ...({ cursor: 'pointer' } as any) },
  mTabActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  mTabText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  toast: {
    position: 'absolute', bottom: 30, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderColor: 'rgba(16,185,129,0.50)', borderWidth: 1,
  },
  toastText: { color: C.green, fontFamily: 'DMSans_700Bold', fontSize: 12 },
});
