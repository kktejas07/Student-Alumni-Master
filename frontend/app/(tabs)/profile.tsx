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
    { key: 'digitalid', label: 'Digital ID Card', icon: IdCard, sub: 'Your SA-ID card — shareable & downloadable' },
    { key: 'manage', label: 'Manage Profile', icon: SlidersHorizontal, sub: 'Visibility, resume, sections, badges' },
  ];
  const NAV_ACCOUNT: { key: PageKey; label: string; icon: any; sub: string }[] = [
    { key: 'notifications', label: 'Notification Preferences', icon: Bell, sub: 'Choose what we ping you about' },
    { key: 'privacy', label: 'Privacy & Security', icon: ShieldCheck, sub: 'Control who sees what about you' },
    { key: 'settings', label: 'Settings & Preferences', icon: SettingsIcon, sub: 'AI coach, language, theme, account' },
  ];
  const NAV = [...NAV_PROFILE, ...NAV_ACCOUNT];
  const currentNav = NAV.find((n) => n.key === page) || NAV[0];
  // Top tabs: Edit Profile (any page except digitalid) / Digital ID Card
  const topTab: 'edit' | 'digitalid' = page === 'digitalid' ? 'digitalid' : 'edit';

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
        {/* Sidebar (or top header on mobile) */}
        {!isMobile && (
          <View style={styles.sidebar}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} testID="profile-back">
              <ArrowLeft size={16} color={C.text2} /><Text style={styles.backText}>Back to Dashboard</Text>
            </Pressable>

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
                <Text style={styles.miniMeta} numberOfLines={1}>{(draft.role || 'student').toUpperCase()} · {completion.percentage}% complete</Text>
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
            <Pressable onPress={handleLogout} style={[styles.navItem, { marginTop: 6 }]} testID="profile-logout">
              <LogOut size={15} color={C.text2} /><Text style={styles.navText}>Sign Out</Text>
            </Pressable>
          </View>
        )}

        {/* Main */}
        <View style={[styles.main, isMobile && { paddingHorizontal: 14 }]}>
          {/* Top bar with Edit Profile / Digital ID Card tab toggle */}
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backBtnSm}><ArrowLeft size={16} color="#fff" /></Pressable>
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

          <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  layout: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 268, paddingHorizontal: 18, paddingVertical: 22, gap: 6,
    borderRightColor: 'rgba(255,255,255,0.06)', borderRightWidth: 1,
  },
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
    paddingVertical: 12, paddingHorizontal: 12, marginTop: 12, marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
  },
  miniAvatar: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', backgroundColor: 'rgba(167,139,250,0.30)', alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  miniName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  miniMeta: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 10.5, marginTop: 2 },

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
  scorePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(167,139,250,0.14)', borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1 },
  scorePillText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 11 },

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
