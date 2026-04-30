/**
 * Profile (Phase 4 — SA Profile Web)
 * Three-page editor: Profile Information / Manage Profile / Settings & Preferences.
 * Shell with sidebar navigation (collapses to top tabs on mobile) + save bar.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  useWindowDimensions, Platform, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft, User, Settings as SettingsIcon, SlidersHorizontal,
  LogOut, Check, X as CloseX, IdCard, Bell, ShieldCheck, PencilLine,
} from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { tokenStore } from '@/src/models/services/api';
import { useAuth } from '@/src/viewmodels/hooks';
import { ProfileInfoPage } from '@/src/views/web/profile/ProfileInfoPage';
import { ManageProfilePage } from '@/src/views/web/profile/ManageProfilePage';
import { SettingsPage } from '@/src/views/web/profile/SettingsPage';
import { SaveBar, C } from '@/src/views/web/profile/primitives';

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
    router.replace('/(auth)/login');
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

  const headlineStr = draft.headline || [draft.branch, draft.institution].filter(Boolean).join(' · ') || 'Add a headline…';
  const cgpaChip = draft.cgpa;
  const sessionsChip = draft.sessions_completed || draft.mentor_sessions_used;
  const stats = {
    sessions: draft.sessions_completed || 0,
    connections: draft.connections_count || 0,
    profile_views: draft.profile_views || 0,
    mentor_sessions: draft.mentor_sessions_used || 0,
    applications: draft.applications_count || 0,
  };

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
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.miniName} numberOfLines={1}>{draft.full_name || 'Your name'}</Text>
                <Text style={styles.miniMeta} numberOfLines={1}>{[draft.institution, draft.branch, draft.graduation_year ? `'${String(draft.graduation_year).slice(-2)}` : null].filter(Boolean).join(' · ') || '—'}</Text>
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
            <Pressable onPress={() => router.back()} style={styles.backBtn} testID="profile-back">
              <ArrowLeft size={14} color={C.text2} /><Text style={styles.backText}>Back to Dashboard</Text>
            </Pressable>
          </View>
        )}

        {/* Main */}
        <View style={[styles.main, isMobile && { paddingHorizontal: 14 }]}>
          {/* Top bar with Edit Profile / Digital ID Card tab toggle */}
          <View style={styles.topBar}>
            {isMobile && (
              <Pressable onPress={() => router.back()} style={styles.backBtnSm}><ArrowLeft size={16} color="#fff" /></Pressable>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title}>{currentNav.label}</Text>
              <Text style={styles.subtitle}>{currentNav.sub}</Text>
            </View>
            {/* Tab toggle */}
            <View style={styles.toggleWrap}>
              <Pressable onPress={() => setPage('info')} style={[styles.toggleBtn, topTab === 'edit' && styles.toggleBtnActive]} testID="profile-topbar-edit">
                <PencilLine size={12} color={topTab === 'edit' ? '#fff' : C.text2} />
                <Text style={[styles.toggleText, topTab === 'edit' && { color: '#fff' }]}>Edit Profile</Text>
              </Pressable>
              <Pressable onPress={() => setPage('digitalid')} style={[styles.toggleBtn, topTab === 'digitalid' && styles.toggleBtnActive]} testID="profile-topbar-digitalid">
                <IdCard size={12} color={topTab === 'digitalid' ? '#fff' : C.text2} />
                <Text style={[styles.toggleText, topTab === 'digitalid' && { color: '#fff' }]}>Digital ID Card</Text>
              </Pressable>
            </View>
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
                  <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                    <Text style={styles.heroName} numberOfLines={1}>{draft.full_name || 'Your name'}</Text>
                    <Text style={styles.heroSub} numberOfLines={1}>{headlineStr}</Text>
                    <View style={styles.heroChips}>
                      {cgpaChip && <View style={[styles.heroChip, { backgroundColor: 'rgba(252,211,77,0.12)', borderColor: 'rgba(252,211,77,0.40)' }]}><Text style={[styles.heroChipText, { color: '#FCD34D' }]}>CGPA {cgpaChip}</Text></View>}
                      {sessionsChip != null && sessionsChip > 0 && <View style={[styles.heroChip, { backgroundColor: 'rgba(167,139,250,0.12)', borderColor: 'rgba(167,139,250,0.40)' }]}><Text style={[styles.heroChipText, { color: '#C4B5FD' }]}>{sessionsChip} sessions</Text></View>}
                      <View style={[styles.heroChip, { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.40)', flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                        <Check size={10} color="#34D399" /><Text style={[styles.heroChipText, { color: '#34D399' }]}>Verified {draft.role === 'mentor' ? 'Mentor' : draft.role === 'alumni' ? 'Alumni' : 'Student'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {page === 'info' && (
                <ProfileInfoPage draft={draft} setDraft={setDraft} completion={completion} onUploadPhoto={handleUploadPhoto} />
              )}
              {page === 'digitalid' && (
                <DigitalIdCardInline userId={user?.id} isMobile={isMobile} />
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
            {!isMobile && winW >= 1150 && page !== 'digitalid' && (
              <View style={styles.rightRail}>
                <View style={styles.rrCard}>
                  <Text style={styles.rrKicker}>STUDENT STATS</Text>
                  <View style={{ gap: 10, marginTop: 8 }}>
                    <StatRow icon="📅" label="Sessions Completed" value={stats.sessions} color="#34D399" />
                    <StatRow icon="👥" label="Connections Made" value={stats.connections} color="#C4B5FD" />
                    <StatRow icon="👁" label="Profile Views" value={stats.profile_views} color="#22D3EE" />
                    <StatRow icon="🎯" label="Mentor Sessions" value={stats.mentor_sessions} color="#FCD34D" />
                    <StatRow icon="📨" label="Applications Sent" value={stats.applications} color="#F472B6" />
                  </View>
                </View>
                {draft.sa_id && (
                  <View style={styles.rrIdCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <IdCard size={13} color="#34D399" /><Text style={styles.rrIdKicker}>STUDENT ID</Text>
                    </View>
                    <Text style={styles.rrIdMono}>{draft.sa_id}</Text>
                    <Text style={styles.rrIdMeta}>Verified · Active since {new Date(draft.created_at || Date.now()).getFullYear()}</Text>
                    <Pressable onPress={() => setPage('digitalid')} style={styles.rrIdBtn} testID="rr-view-id">
                      <Text style={styles.rrIdBtnText}>View Digital ID Card →</Text>
                    </Pressable>
                  </View>
                )}
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

// ── Digital ID Card inline — navigates to existing /id-card route with back button
function DigitalIdCardInline({ userId, isMobile }: { userId?: string; isMobile: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.idCardShell}>
      <View style={styles.idCardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.idCardTitle}>Digital ID Card</Text>
          <Text style={styles.idCardSub}>Your shareable SA Digital ID — QR-scannable at events & campuses.</Text>
        </View>
        <Pressable onPress={() => router.push('/id-card')} style={styles.idCardBtn} testID="profile-open-id-card">
          <Text style={styles.idCardBtnText}>Open Full-screen</Text>
        </Pressable>
      </View>
      {Platform.OS === 'web' ? (
        // Embed the existing route in an iframe for a preview experience
        // eslint-disable-next-line react/no-unknown-property
        <View style={[styles.idCardFrame, { height: isMobile ? 520 : 640 }]}>
          {/* @ts-ignore react-native-web supports rendering HTML iframes */}
          <iframe src="/id-card" style={{ border: 0, width: '100%', height: '100%', borderRadius: 14, backgroundColor: '#0C0818' }} title="Digital ID Card" />
        </View>
      ) : (
        <Pressable onPress={() => router.push('/id-card')} style={styles.idCardFallback}>
          <Text style={styles.idCardFallbackText}>Open Digital ID Card →</Text>
        </Pressable>
      )}
    </View>
  );
}

// Small helper for right-rail stats rows
function StatRow({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 12 }}>{icon}</Text>
      </View>
      <Text style={{ color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, flex: 1 }}>{label}</Text>
      <Text style={{ color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 }}>{value}</Text>
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
  miniAvatar: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', backgroundColor: 'rgba(167,139,250,0.30)', alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  miniName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  miniMeta: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 10.5, marginTop: 2 },
  miniPct: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(252,211,77,0.14)', borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1 },
  miniPctText: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },

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
  topAvatar: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', backgroundColor: 'rgba(167,139,250,0.30)', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1 },
  topAvatarText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },

  // Hero card
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20, marginBottom: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1 },
  heroAvatar: { width: 78, height: 78, borderRadius: 39, overflow: 'hidden', backgroundColor: 'rgba(167,139,250,0.30)', alignItems: 'center', justifyContent: 'center' },
  heroAvatarText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 24 },
  heroName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 20 },
  heroSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  heroChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  heroChipText: { fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  // Right rail
  bodyRow: { flex: 1, flexDirection: 'row', gap: 18 },
  rightRail: { width: 280, gap: 14 },
  rrCard: { padding: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1 },
  rrKicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 0.8 },
  rrIdCard: { padding: 16, borderRadius: 14, backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.30)', borderWidth: 1, gap: 6 },
  rrIdKicker: { color: '#34D399', fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 0.6 },
  rrIdMono: { color: '#fff', fontFamily: Platform.OS === 'web' ? 'monospace' : 'DMSans_800ExtraBold', fontSize: 17, marginTop: 4, letterSpacing: 0.3 },
  rrIdMeta: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  rrIdBtn: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: C.purple, alignItems: 'center', ...({ cursor: 'pointer' } as any) },
  rrIdBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  // Top tab toggle (Edit Profile / Digital ID Card)
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
