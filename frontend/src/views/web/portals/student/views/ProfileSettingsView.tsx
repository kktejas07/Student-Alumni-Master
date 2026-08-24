/**
 * Profile & Settings — comprehensive view for the Student Portal.
 *
 * Layout:
 *   ┌─ Header card (Avatar + Name + Headline + Badges) ─────┬─ Profile Score (sidebar) ─┐
 *   ├─ Tab bar (6 tabs)                                     ├─ Student Stats           ─┤
 *   ├─ Tab content                                          ├─ Student ID card         ─┤
 *   └─ Save bar (Discard / Save Profile)                                                 ┘
 *
 * Tabs (in order):
 *   • Profile Info  ← rich form (uses existing ProfileInfoPage component)
 *   • Manage Profile ← visibility, sections, resume, certs, badges
 *   • Settings       ← preferences
 *   • Notifications  ← stub (Phase 2)
 *   • Security       ← stub (Phase 2)
 *   • Digital ID Card ← deep-link to /member-id
 *
 * Backend wiring:
 *   GET    /auth/me                 — load user
 *   GET    /users/me/completion     — { percentage, items[] }
 *   GET    /users/me/stats          — sessions / connections / views / mentor_sessions / applications
 *   PUT    /users/me                — save profile changes
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, Image, Platform,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  User, Settings as SettingsIcon, Bell, ShieldCheck, IdCard,
  CheckCircle2, GraduationCap, Award, ExternalLink, Sparkles,
  Briefcase, UsersRound, Eye, CalendarCheck, FileSearch,
  Star, IndianRupee, Building2, Plug,
} from '../iconShims';
import { Upload, Camera } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { ProfileInfoPage } from '@/src/views/web/profile/ProfileInfoPage';
import { ManageProfilePage } from '@/src/views/web/profile/ManageProfilePage';
import { SettingsPage } from '@/src/views/web/profile/SettingsPage';
import { IntegrationsView } from '@/src/views/web/profile/IntegrationsView';
import { CompletionRing } from '@/src/views/web/profile/CompletionRing';
import { SaveBar, C } from '@/src/views/web/profile/primitives';
import { useToast } from '@/src/views/components';
import * as ImagePicker from 'expo-image-picker';
import { WebcamModal } from '@/src/views/components/WebcamModal';

type TabKey = 'profile-info' | 'manage' | 'integrations' | 'settings' | 'notifications' | 'security' | 'digital-id';

/**
 * Role-aware copy & sidebar stat configuration.
 * Visual theme stays unified (purple) — only labels & stats list rotate per role.
 */
type RoleKey = 'student' | 'mentor' | 'alumni' | 'college';

const ROLE_CFG: Record<RoleKey, {
  statsHeading: string;
  idLabel: string;
  verifiedLabel: string;
  fallbackHeadline: string;
  badgeNoun: string;          // "sessions" / "mentees" / "students"
  stats: (s: any) => { Icon: any; label: string; value: any; tint: string }[];
}> = {
  student: {
    statsHeading: 'STUDENT STATS',
    idLabel: 'Student ID',
    verifiedLabel: 'Verified Student',
    fallbackHeadline: 'Student Alumni Member',
    badgeNoun: 'sessions',
    stats: (s) => [
      { Icon: CalendarCheck, label: 'Sessions Completed', value: s.sessions_completed ?? 0, tint: '#10B981' },
      { Icon: UsersRound,    label: 'Connections Made',   value: s.connections_made ?? 0,   tint: '#60A5FA' },
      { Icon: Eye,           label: 'Profile Views',      value: s.profile_views ?? 0,      tint: '#A78BFA' },
      { Icon: Sparkles,      label: 'Mentor Sessions',    value: s.mentor_sessions ?? 0,    tint: '#F59E0B' },
      { Icon: FileSearch,    label: 'Applications Sent',  value: s.applications_sent ?? 0,  tint: '#F97316' },
    ],
  },
  mentor: {
    statsHeading: 'MENTOR STATS',
    idLabel: 'Mentor ID',
    verifiedLabel: 'Verified Mentor',
    fallbackHeadline: 'Verified Mentor',
    badgeNoun: 'sessions hosted',
    stats: (s) => [
      { Icon: CalendarCheck, label: 'Sessions Hosted',  value: s.sessions_completed ?? 0,                     tint: '#10B981' },
      { Icon: UsersRound,    label: 'Active Mentees',   value: s.connections_made ?? 0,                       tint: '#60A5FA' },
      { Icon: Eye,           label: 'Profile Views',    value: s.profile_views ?? 0,                          tint: '#A78BFA' },
      { Icon: Star,          label: 'Avg Rating',       value: s.avg_rating ? `${s.avg_rating}★` : '—',       tint: '#F59E0B' },
      { Icon: IndianRupee,   label: 'Earnings (Month)', value: s.earnings_this_month ? `₹${s.earnings_this_month}` : '₹0', tint: '#22C55E' },
    ],
  },
  alumni: {
    statsHeading: 'ALUMNI STATS',
    idLabel: 'Alumni ID',
    verifiedLabel: 'Verified Alumni',
    fallbackHeadline: 'Verified Alumni',
    badgeNoun: 'sessions',
    stats: (s) => [
      { Icon: CalendarCheck, label: 'Mentor Sessions',  value: s.sessions_completed ?? 0, tint: '#10B981' },
      { Icon: UsersRound,    label: 'Network Size',     value: s.connections_made ?? 0,   tint: '#60A5FA' },
      { Icon: Eye,           label: 'Profile Views',    value: s.profile_views ?? 0,      tint: '#A78BFA' },
      { Icon: Briefcase,     label: 'Referrals Given',  value: s.referrals_given ?? 0,    tint: '#F59E0B' },
      { Icon: Sparkles,      label: 'Talks Hosted',     value: s.talks_hosted ?? 0,       tint: '#F97316' },
    ],
  },
  college: {
    statsHeading: 'INSTITUTION STATS',
    idLabel: 'College ID',
    verifiedLabel: 'Institution Partner',
    fallbackHeadline: 'Institution Partner',
    badgeNoun: 'students',
    stats: (s) => [
      { Icon: GraduationCap, label: 'Total Students',   value: s.total_students ?? 0,    tint: '#10B981' },
      { Icon: UsersRound,    label: 'Active Mentors',   value: s.active_mentors ?? 0,    tint: '#60A5FA' },
      { Icon: Eye,           label: 'Profile Views',    value: s.profile_views ?? 0,     tint: '#A78BFA' },
      { Icon: Sparkles,      label: 'Events Hosted',    value: s.events_hosted ?? 0,     tint: '#F59E0B' },
      { Icon: Building2,     label: 'Placements (YR)',  value: s.placements_year ?? 0,   tint: '#F97316' },
    ],
  },
};

const TABS: { key: TabKey; label: string; Icon: any }[] = [
  { key: 'profile-info',  label: 'Profile Info',        Icon: User },
  { key: 'manage',        label: 'Manage Profile',      Icon: SettingsIcon },
  { key: 'integrations',  label: 'Tools & Integrations',Icon: Plug },
  { key: 'settings',      label: 'Settings',            Icon: SettingsIcon },
  { key: 'notifications', label: 'Notifications',       Icon: Bell },
  { key: 'security',      label: 'Security',            Icon: ShieldCheck },
  { key: 'digital-id',    label: 'Digital ID Card',     Icon: IdCard },
];

export function ProfileSettingsView(props: { roleOverride?: RoleKey } = {}) {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  const { width: winW } = useWindowDimensions();
  const stack = winW < 1100;

  const role: RoleKey = (props.roleOverride || (user?.role as RoleKey) || 'student');
  const cfg = ROLE_CFG[role] || ROLE_CFG.student;

  const { ptab, section } = useLocalSearchParams<{ ptab?: string, section?: string }>();
  const [tab, setTab] = useState<TabKey>((ptab as TabKey) || 'profile-info');

  useEffect(() => {
    if (ptab && ptab !== tab) {
      setTab(ptab as TabKey);
    }
  }, [ptab]);

  useEffect(() => {
    if (Platform.OS === 'web' && section) {
      const t = setTimeout(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500); // Wait for render
      return () => clearTimeout(t);
    }
  }, [section, tab]);
  const [draft, setDraft] = useState<any>(user || {});
  const [completion, setCompletion] = useState<{ percentage: number; items: any[] }>({ percentage: 0, items: [] });
  const [stats, setStats] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [webcamVisible, setWebcamVisible] = useState(false);

  const onTakeSelfie = useCallback(async () => {
    if (Platform.OS === 'web') {
      setWebcamVisible(true);
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast.error('Camera', 'Permission denied.'); return; }
      const res = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled && res.assets[0]?.base64) {
        const base64Photo = `data:image/jpeg;base64,${res.assets[0].base64}`;
        setDraft((d: any) => ({ ...d, photo_data: base64Photo, face_image_base64: base64Photo }));
      }
    } catch {
      toast.error('Camera', 'Could not open camera.');
    }
  }, [toast]);

  // Hydrate
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const me = await refreshUser();
      if (me) setDraft({ ...me });
      const [comp, st] = await Promise.all([
        request<any>('/users/me/completion').catch(() => ({ percentage: 0, items: [] })),
        request<any>('/users/me/stats').catch(() => ({})),
      ]);
      setCompletion(comp);
      setStats(st);
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => { reload(); }, [reload]);

  const draftPhoto = draft.photo_data || draft.face_image_base64;
  useEffect(() => {
    const userPhoto = user?.photo_data || user?.face_image_base64;
    if (draftPhoto !== userPhoto) {
      useAuthStore.getState().setPhotoOverride(draftPhoto || '');
    } else {
      useAuthStore.getState().setPhotoOverride(null);
    }
  }, [draftPhoto, user]);

  useEffect(() => {
    return () => {
      useAuthStore.getState().setPhotoOverride(null);
    };
  }, []);

  // Track if draft changed vs last server snapshot
  const dirty = useMemo(() => {
    if (!user) return false;
    const watched = [
      'first_name','last_name','full_name','headline','bio','phone','city','state','location',
      'photo_data','face_image_base64','institution','branch','graduation_year','cgpa','stream','department','class_or_year','year_of_study',
      'interests','skills','projects','linkedin_url','github_url','portfolio_url','profile_visibility',
      'section_toggles','primary_skill','preferences','banner_data','college_logo_data'
    ];
    return watched.some((k) => JSON.stringify((draft as any)[k] ?? null) !== JSON.stringify((user as any)[k] ?? null));
  }, [draft, user]);

  const onUploadPhoto = useCallback(async () => {
    if (Platform.OS !== 'web') { toast.info('Photo upload', 'Available on web'); return; }
    const input = (document as any).createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = (e: any) => {
      const f = e.target.files?.[0]; if (!f) return;
      if (f.size > 5 * 1024 * 1024) { toast.error('Too large', 'Max 5 MB'); return; }
      const r = new FileReader();
      r.onload = () => { setDraft((d: any) => ({ ...d, photo_data: r.result, face_image_base64: r.result })); };
      r.readAsDataURL(f);
    };
    input.click();
  }, [toast]);

  const onSave = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    try {
      // Build payload from changed fields only (still safe-listed server-side)
      const payload: any = {};
      const watched = [
        'first_name','last_name','full_name','headline','bio','phone','city','state','location',
        'photo_data','face_image_base64','institution','branch','graduation_year','cgpa','stream','department','class_or_year','year_of_study','year','board_or_university',
        'interests','skills','projects','linkedin_url','github_url','portfolio_url','profile_visibility',
        'section_toggles','primary_skill','preferences','banner_data','college_logo_data'
      ];
      watched.forEach((k) => {
        if (JSON.stringify((draft as any)[k] ?? null) !== JSON.stringify((user as any)[k] ?? null)) {
          payload[k] = (draft as any)[k];
        }
      });
      // Coerce numbers
      if ('graduation_year' in payload && payload.graduation_year)
        payload.graduation_year = Number(payload.graduation_year) || payload.graduation_year;
      if ('cgpa' in payload && payload.cgpa !== '' && payload.cgpa != null)
        payload.cgpa = parseFloat(payload.cgpa) || payload.cgpa;

      await request('/users/me', { method: 'PUT', body: payload } as any);
      const now = new Date();
      setLastSavedAt(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      toast.success('Saved', 'Profile updated successfully.');
      await reload();
    } catch (e: any) {
      toast.error('Save failed', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDiscard = () => {
    if (user) setDraft({ ...user });
    toast.info('Reverted', 'Changes discarded.');
  };

  // Header + sidebar derived
  const fullName = (draft.full_name || `${draft.first_name || ''} ${draft.last_name || ''}`).trim() || 'Student';
  const initials = (fullName.split(' ').slice(0, 2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();
  const headline = role === 'college' 
    ? (draft.headline) 
    : ([draft.branch ? `B.Tech ${draft.branch}` : null, draft.institution].filter(Boolean).join(' · ') || draft.headline || cfg.fallbackHeadline);
  const photo = draft.photo_data || draft.face_image_base64;
  const saId = draft.unique_id || user?.unique_id || '—';

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center" style={{ minHeight: 320 }}>
        {loading ? (
          <ActivityIndicator size="large" color={C.purple} />
        ) : (
          <Text style={{ color: '#fff' }}>Failed to load profile settings.</Text>
        )}
      </View>
    );
  }

  return (
    <View className="gap-4">
      {/* Header card */}
      <View className={`flex-row items-center bg-glass border border-glass-border rounded-2xl p-5 ${stack ? 'flex-col' : ''}`}>
        <View className="flex-1 flex-row items-center gap-4" style={{ minWidth: 0 }}>
          <View className="relative">
            <View className="w-[84px] h-[84px] rounded-full overflow-hidden bg-violet/20 items-center justify-center">
              {photo ? (
                <Image source={{ uri: photo }} className="w-full h-full" />
              ) : (
                <Text className="text-violet text-2xl font-extrabold">{initials}</Text>
              )}
            </View>
            {draft.is_verified && (
              <View className="absolute bottom-0.5 right-0.5 w-[22px] h-[22px] rounded-full bg-emerald-500 items-center justify-center border-2 border-navy">
                <CheckCircle2 size={11} color="#fff" />
              </View>
            )}
          </View>
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Text className="text-white font-bold text-xl" style={{ letterSpacing: -0.3 }}>{fullName}</Text>
            {role === 'college' && !!draft.institution && (
              <Text className="text-indigo-100 text-sm font-medium" style={{ marginBottom: 6, marginTop: -2 }}>{draft.institution}</Text>
            )}
            {!!headline && <Text className="text-muted text-sm font-medium mt-1">{headline}</Text>}
            <View className="flex-row flex-wrap gap-2 mt-2.5">
              {!!draft.cgpa && (
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full border" style={{ backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.45)' }}>
                  <Text className="font-bold text-xs" style={{ color: '#FBBF24' }}>CGPA {draft.cgpa}</Text>
                </View>
              )}
              {!!stats.sessions_completed && (
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full border" style={{ backgroundColor: 'rgba(20,184,166,0.16)', borderColor: 'rgba(20,184,166,0.45)' }}>
                  <Text className="font-bold text-xs" style={{ color: '#5EEAD4' }}>{stats.sessions_completed} {cfg.badgeNoun}</Text>
                </View>
              )}
              <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full border" style={{ backgroundColor: 'rgba(167,139,250,0.16)', borderColor: 'rgba(167,139,250,0.45)' }}>
                <ShieldCheck size={12} color="#C4B5FD" />
                <Text className="font-bold text-xs" style={{ color: '#C4B5FD' }}>{cfg.verifiedLabel}</Text>
              </View>
            </View>
          </View>
          
          {role === 'college' && (
            <View className="flex-row gap-2 flex-wrap justify-end ml-auto">
              <Pressable onPress={onUploadPhoto} className="bg-violet px-3.5 py-2.5 rounded-lg flex-row items-center gap-1.5">
                <Upload size={14} color="#FFF" />
                <Text className="text-white text-[13px] font-semibold">Upload Photo</Text>
              </Pressable>
              <Pressable onPress={onTakeSelfie} className="bg-violet px-3.5 py-2.5 rounded-lg flex-row items-center gap-1.5">
                <Camera size={14} color="#FFF" />
                <Text className="text-white text-[13px] font-semibold">Take Selfie</Text>
              </Pressable>
              {photo && (
                <Pressable onPress={() => setDraft((d: any) => ({ ...d, photo_data: '', face_image_base64: '' }))} className="bg-white/15 px-3.5 py-2.5 rounded-lg flex-row items-center gap-1.5">
                  <Text className="text-white text-[13px] font-semibold">Remove</Text>
                </Pressable>
              )}
            </View>
          )}

        </View>
      </View>

      <View className={`gap-4 ${stack ? 'flex-col' : 'flex-row'}`}>
        {/* Main column */}
        <View className="flex-1 gap-3.5" style={{ minWidth: 0 }}>
          {/* Tab bar */}
          <View className="bg-glass border border-glass-border rounded-xl p-1.5">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 6 }}>
              {TABS.map((t) => {
                const Icon = t.Icon; const active = tab === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => {
                      if (t.key === 'digital-id') { router.push('/member-id' as any); return; }
                      setTab(t.key);
                    }}
                    className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-lg ${active ? 'bg-violet' : ''}`}
                    testID={`pf-tab-${t.key}`}
                  >
                    <Icon size={14} color={active ? '#fff' : C.text2} />
                    <Text className={`font-bold text-xs ${active ? 'text-white' : 'text-muted'}`}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Tab content */}
          {tab === 'profile-info' && (
            <ProfileInfoPage
              draft={draft}
              setDraft={setDraft}
              completion={completion}
              onUploadPhoto={onUploadPhoto}
              onTakeSelfie={onTakeSelfie}
            />
          )}

          {tab === 'manage' && (
            <ManageProfilePage
              draft={draft}
              setDraft={setDraft}
              badges={draft.badges || []}
              onCertChange={() => reload()}
              showToast={(m: string) => toast.info(m)}
            />
          )}

          {tab === 'integrations' && <IntegrationsView />}

          {tab === 'settings' && (
            <SettingsPage
              draft={draft}
              setDraft={setDraft}
              showToast={(m: string) => toast.info(m)}
            />
          )}

          {tab === 'notifications' && <ComingSoon title="Notification Preferences" sub="Granular email / push controls land in Phase 2." />}
          {tab === 'security'      && <ComingSoon title="Security Centre"          sub="2FA, login history & active sessions land in Phase 2." />}

          {(tab === 'profile-info' || tab === 'manage' || tab === 'settings') && (
            <View className="mt-1 z-10 relative">
              <FooterActions
                dirty={dirty}
                saving={saving}
                onSave={onSave}
                onDiscard={onDiscard}
                lastSavedAt={lastSavedAt}
              />
            </View>
          )}
        </View>

        {/* Right sidebar */}
        <View className="gap-3.5" style={{ width: stack ? '100%' : 320 }}>
          {/* Profile Score card */}
          <View className="bg-glass border border-glass-border rounded-[14px] p-4">
            <View className="items-center gap-2">
              <CompletionRing
                pct={completion.percentage || 0}
                size={120}
                stroke={10}
                color={(completion.percentage || 0) >= 100 ? '#10B981' : '#A78BFA'}
              />
              <Text className="text-white font-bold text-sm mt-1">Profile Score</Text>
              <Text className="text-muted font-medium text-xs">{(completion.percentage || 0) >= 100 ? 'All complete!' : `${100 - (completion.percentage || 0)}% to go`}</Text>
              
              {role === 'college' ? (
                <View className="w-full mt-4 border-t border-glass-border pt-4 gap-2">
                  <Text className="text-dim font-extrabold text-[11px] tracking-widest text-left mb-1">PROFILE COMPLETION</Text>
                  <Text className="text-[12px] text-muted mb-1">Complete your profile to unlock features.</Text>
                  {completion.items?.map((it: any) => (
                    <View key={it.key} className="flex-row items-center gap-2">
                      {it.done ? <CheckCircle2 size={16} color={C.green} /> : <View className="w-[14px] h-[14px] rounded-full border border-dim ml-px" />}
                      <Text className={`text-[13px] flex-1 ${it.done ? 'text-text' : 'text-muted'}`}>{it.label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="px-2.5 py-1 rounded-md bg-violet/10 border border-violet/35 mt-1.5">
                  <Text className="text-violet-300 font-bold text-xs" style={{ letterSpacing: 0.5 }}>{saId}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Role-aware stats list */}
          {role !== 'college' && (
            <View className="bg-glass border border-glass-border rounded-[14px] p-4">
              <Text className="text-dim font-extrabold text-[11px] tracking-widest">{cfg.statsHeading}</Text>
              <View className="mt-2.5 gap-1">
                {cfg.stats(stats).map((row, i, arr) => (
                  <StatRow
                    key={row.label}
                    Icon={row.Icon}
                    label={row.label}
                    value={row.value}
                    tint={row.tint}
                    last={i === arr.length - 1}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Role-aware ID card */}
          <View className="bg-glass border border-glass-border rounded-[14px] p-4">
            <View className="flex-row items-center gap-1.5 mb-2">
              <ShieldCheck size={14} color="#A78BFA" />
              <Text className="text-white font-bold text-sm">{cfg.idLabel}</Text>
            </View>
            <Text className="text-white font-extrabold text-lg mt-0.5" style={{ letterSpacing: 0.5 }}>{saId}</Text>
            <Text className="text-muted font-medium text-xs mt-1">
              {draft.is_verified ? 'Verified' : 'Active'} · since {new Date(user?.created_at || Date.now()).getFullYear()}
            </Text>
            <Pressable
              onPress={() => router.push('/member-id' as any)}
              className="mt-3 flex-row items-center justify-center gap-1.5 py-3 rounded-[10px] bg-violet"
              testID="pf-view-digital-id"
            >
              <IdCard size={14} color="#fff" />
              <Text className="text-white font-bold text-[12.5px]">View Digital ID Card →</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <WebcamModal
        visible={webcamVisible}
        onClose={() => setWebcamVisible(false)}
        onCapture={(base64) => {
          setDraft((d: any) => ({ ...d, photo_data: base64, face_image_base64: base64 }));
          setWebcamVisible(false);
          toast.success('Selfie captured!', 'Save profile to update.');
        }}
      />
    </View>
  );
}

/* ---------- helpers ---------- */
function StatRow({ Icon, label, value, tint, last }: { Icon: any; label: string; value: any; tint: string; last?: boolean }) {
  return (
    <View className={`flex-row items-center gap-2.5 py-2.5 ${!last ? 'border-b border-white/5' : ''}`}>
      <View className="w-[30px] h-[30px] rounded-lg items-center justify-center border" style={{ backgroundColor: tint + '20', borderColor: tint + '50' }}>
        <Icon size={14} color={tint} />
      </View>
      <Text className="flex-1 text-muted font-medium text-[12.5px]">{label}</Text>
      <Text className="text-white font-extrabold text-base">{value}</Text>
    </View>
  );
}

function ComingSoon({ title, sub }: { title: string; sub: string }) {
  return (
    <View className="bg-glass border border-glass-border rounded-[14px] p-8 items-center gap-2">
      <Sparkles size={28} color="#A78BFA" />
      <Text className="text-white font-bold text-base">{title}</Text>
      <Text className="text-muted font-medium text-xs text-center">{sub}</Text>
    </View>
  );
}

function FooterActions({ dirty, saving, onSave, onDiscard, lastSavedAt }: any) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5 bg-violet/8 border border-violet/24 rounded-xl gap-3">
      <Text className="text-muted font-medium text-xs">
        {lastSavedAt ? `Last saved ${lastSavedAt}` : (dirty ? 'You have unsaved changes' : 'All changes saved')}
      </Text>
      <View className="flex-row gap-2">
        <Pressable onPress={onDiscard} disabled={!dirty} className={`px-3.5 h-9 rounded-[9px] bg-white/4 border border-glass-border items-center justify-center ${!dirty ? 'opacity-50' : ''}`} testID="pf-discard">
          <Text className="text-muted font-bold text-xs">Discard Changes</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={!dirty || saving}
          className={`flex-row items-center gap-1.5 px-4 h-9 rounded-[9px] bg-violet border border-violet ${!dirty || saving ? 'opacity-55' : ''}`}
          testID="pf-save"
        >
          <CheckCircle2 size={14} color="#fff" />
          <Text className="text-white font-bold text-xs">{saving ? 'Saving…' : 'Save Profile'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default ProfileSettingsView;
