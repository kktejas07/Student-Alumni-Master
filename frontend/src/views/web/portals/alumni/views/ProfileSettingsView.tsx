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
import { useRouter } from 'expo-router';
import {
  User, Settings as SettingsIcon, Bell, ShieldCheck, IdCard,
  CheckCircle2, GraduationCap, Award, ExternalLink, Sparkles,
  Briefcase, UsersRound, Eye, CalendarCheck, FileSearch,
  Star, IndianRupee, Building2,
} from '../iconShims';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { ProfileInfoPage } from '@/src/views/web/profile/ProfileInfoPage';
import { ManageProfilePage } from '@/src/views/web/profile/ManageProfilePage';
import { SettingsPage } from '@/src/views/web/profile/SettingsPage';
import { CompletionRing } from '@/src/views/web/profile/CompletionRing';
import { SaveBar, C } from '@/src/views/web/profile/primitives';
import { useToast } from '@/src/views/components';

type TabKey = 'profile-info' | 'manage' | 'settings' | 'notifications' | 'security' | 'digital-id';

type RoleKey = 'student' | 'mentor' | 'alumni' | 'college';

const ROLE_CFG: Record<RoleKey, {
  statsHeading: string;
  idLabel: string;
  verifiedLabel: string;
  fallbackHeadline: string;
  badgeNoun: string;
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
  { key: 'profile-info', label: 'Profile Info',   Icon: User },
  { key: 'manage',       label: 'Manage Profile', Icon: SettingsIcon },
  { key: 'settings',     label: 'Settings',       Icon: SettingsIcon },
  { key: 'notifications',label: 'Notifications',  Icon: Bell },
  { key: 'security',     label: 'Security',       Icon: ShieldCheck },
  { key: 'digital-id',   label: 'Digital ID Card',Icon: IdCard },
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

  const [tab, setTab] = useState<TabKey>('profile-info');
  const [draft, setDraft] = useState<any>(user || {});
  const [completion, setCompletion] = useState<{ percentage: number; items: any[] }>({ percentage: 0, items: [] });
  const [stats, setStats] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

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

  const dirty = useMemo(() => {
    if (!user) return false;
    const watched = [
      'first_name','last_name','full_name','headline','bio','phone','city','state','location',
      'photo_data','face_image_base64','institution','branch','graduation_year','cgpa','stream','department','class_or_year','year_of_study',
      'interests','skills','projects','linkedin_url','github_url','portfolio_url','profile_visibility',
      'section_toggles','primary_skill','preferences',
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
      const payload: any = {};
      const watched = [
        'first_name','last_name','full_name','headline','bio','phone','city','state','location',
        'photo_data','face_image_base64','institution','branch','graduation_year','cgpa','stream','department','class_or_year','year_of_study','year','board_or_university',
        'interests','skills','projects','linkedin_url','github_url','portfolio_url','profile_visibility',
        'section_toggles','primary_skill','preferences',
      ];
      watched.forEach((k) => {
        if (JSON.stringify((draft as any)[k] ?? null) !== JSON.stringify((user as any)[k] ?? null)) {
          payload[k] = (draft as any)[k];
        }
      });
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

  const fullName = (draft.full_name || `${draft.first_name || ''} ${draft.last_name || ''}`).trim() || 'Student';
  const initials = (fullName.split(' ').slice(0, 2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();
  const headline = [draft.branch ? `B.Tech ${draft.branch}` : null, draft.institution].filter(Boolean).join(' · ') ||
                    draft.headline || cfg.fallbackHeadline;
  const photo = draft.photo_data || draft.face_image_base64;
  const saId = draft.unique_id || user?.unique_id || '—';

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center min-h-[320px]">
        {loading ? (
          <ActivityIndicator size="large" color={C.purple} />
        ) : (
          <Text className="text-white">Failed to load profile settings.</Text>
        )}
      </View>
    );
  }

  return (
    <View className="gap-4">
      {/* Header card */}
      <View className="flex-row items-center gap-[18px] bg-glass border border-glass-border rounded-2xl p-[18px]" style={stack ? { flexDirection: 'column' } : {}}>
        <View className="flex-1 flex-row items-center gap-4 min-w-0">
          <View className="relative">
            <View className="w-[84px] h-[84px] rounded-full overflow-hidden items-center justify-center" style={{ backgroundColor: 'rgba(167,139,250,0.20)' }}>
              {photo ? (
                <Image source={{ uri: photo }} className="w-full h-full" />
              ) : (
                <Text style={{ color: '#A78BFA', fontFamily: 'DMSans_800ExtraBold', fontSize: 28 }}>{initials}</Text>
              )}
            </View>
            {draft.is_verified && (
              <View className="absolute bottom-0.5 right-0.5 w-[22px] h-[22px] rounded-full bg-green-500 items-center justify-center" style={{ borderColor: C.bg, borderWidth: 2 }}>
                <CheckCircle2 size={11} color="#fff" />
              </View>
            )}
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-white font-display-bold text-[22px] tracking-tight">{fullName}</Text>
            <Text style={{ color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 4 }}>{headline}</Text>
            <View className="flex-row flex-wrap gap-2 mt-2.5">
              {!!draft.cgpa && (
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full border" style={{ backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.45)' }}>
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11.5, color: '#FBBF24' }}>CGPA {draft.cgpa}</Text>
                </View>
              )}
              {!!stats.sessions_completed && (
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full border" style={{ backgroundColor: 'rgba(20,184,166,0.16)', borderColor: 'rgba(20,184,166,0.45)' }}>
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11.5, color: '#5EEAD4' }}>{stats.sessions_completed} {cfg.badgeNoun}</Text>
                </View>
              )}
              <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full border" style={{ backgroundColor: 'rgba(167,139,250,0.16)', borderColor: 'rgba(167,139,250,0.45)' }}>
                <ShieldCheck size={12} color="#C4B5FD" />
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11.5, color: '#C4B5FD' }}>{cfg.verifiedLabel}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className="gap-4" style={stack ? { flexDirection: 'column' } : { flexDirection: 'row' }}>
        {/* Main column */}
        <View className="flex-1 min-w-0 gap-3.5">
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
                    className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-lg"
                    style={active ? { backgroundColor: C.purple } : Platform.OS === 'web' ? { cursor: 'pointer' } : {}}
                    testID={`pf-tab-${t.key}`}
                  >
                    <Icon size={14} color={active ? '#fff' : C.text2} />
                    <Text style={{ color: active ? '#fff' : C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 }}>{t.label}</Text>
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

          {tab === 'settings' && (
            <SettingsPage
              draft={draft}
              setDraft={setDraft}
              showToast={(m: string) => toast.info(m)}
            />
          )}

          {tab === 'notifications' && <ComingSoon title="Notification Preferences" sub="Granular email / push controls land in Phase 2." />}
          {tab === 'security'      && <ComingSoon title="Security Centre"          sub="2FA, login history & active sessions land in Phase 2." />}

          {/* Save bar */}
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
        <View style={{ width: stack ? '100%' : 320, gap: 14 }}>
          {/* Profile Score card */}
          <View className="bg-glass border border-glass-border rounded-[14px] p-4">
            <View className="items-center gap-2">
              <CompletionRing
                pct={completion.percentage || 0}
                size={120}
                stroke={10}
                color={(completion.percentage || 0) >= 100 ? '#10B981' : '#A78BFA'}
              />
              <Text className="text-white font-body-bold text-sm mt-1">Profile Score</Text>
              <Text style={{ color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5 }}>{(completion.percentage || 0) >= 100 ? 'All complete!' : `${100 - (completion.percentage || 0)}% to go`}</Text>
              <View className="px-2.5 py-1 rounded-md mt-1.5" style={{ backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.35)', borderWidth: 1 }}>
                <Text className="text-purple-300 font-body-bold text-[11.5px] tracking-wider">{saId}</Text>
              </View>
            </View>
          </View>

          {/* Role-aware stats list */}
          <View className="bg-glass border border-glass-border rounded-[14px] p-4">
            <Text style={{ color: C.text2, fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.0 }}>{cfg.statsHeading}</Text>
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

          {/* Role-aware ID card */}
          <View className="bg-glass border border-glass-border rounded-[14px] p-4">
            <View className="flex-row items-center gap-1.5 mb-2">
              <ShieldCheck size={14} color="#A78BFA" />
              <Text className="text-white font-body-bold text-[13px]">{cfg.idLabel}</Text>
            </View>
            <Text className="text-white font-display-bold text-lg tracking-wider mt-0.5">{saId}</Text>
            <Text style={{ color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 4 }}>
              {draft.is_verified ? 'Verified' : 'Active'} · since {new Date(user?.created_at || Date.now()).getFullYear()}
            </Text>
            <Pressable
              onPress={() => router.push('/member-id' as any)}
              className="mt-3 flex-row items-center justify-center gap-1.5 py-3 rounded-[10px]"
              style={{ backgroundColor: C.purple, ...(Platform.OS === 'web' ? { cursor: 'pointer', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' } : {}) }}
              testID="pf-view-digital-id"
            >
              <IdCard size={14} color="#fff" />
              <Text className="text-white font-body-bold text-[12.5px]">View Digital ID Card →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function StatRow({ Icon, label, value, tint, last }: { Icon: any; label: string; value: any; tint: string; last?: boolean }) {
  return (
    <View className="flex-row items-center gap-2.5 py-2.5" style={!last ? { borderBottomColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1 } : {}}>
      <View className="w-[30px] h-[30px] rounded-lg items-center justify-center border" style={{ backgroundColor: tint + '20', borderColor: tint + '50' }}>
        <Icon size={14} color={tint} />
      </View>
      <Text style={{ flex: 1, color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12.5 }}>{label}</Text>
      <Text className="text-white font-display-bold text-base">{value}</Text>
    </View>
  );
}

function ComingSoon({ title, sub }: { title: string; sub: string }) {
  return (
    <View className="bg-glass border border-glass-border rounded-[14px] p-8 items-center gap-2">
      <Sparkles size={28} color="#A78BFA" />
      <Text className="text-white font-body-bold text-base">{title}</Text>
      <Text style={{ color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, textAlign: 'center' }}>{sub}</Text>
    </View>
  );
}

function FooterActions({ dirty, saving, onSave, onDiscard, lastSavedAt }: any) {
  return (
    <View className="flex-row items-center justify-between px-[18px] py-3.5 rounded-xl gap-3" style={{ backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.24)', borderWidth: 1 }}>
      <Text style={{ color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 }}>
        {lastSavedAt ? `Last saved ${lastSavedAt}` : (dirty ? 'You have unsaved changes' : 'All changes saved')}
      </Text>
      <View className="flex-row gap-2">
        <Pressable onPress={onDiscard} disabled={!dirty} className="px-3.5 h-9 rounded-[9px] items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, ...(!dirty ? { opacity: 0.5 } : {}), ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }} testID="pf-discard">
          <Text style={{ color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 }}>Discard Changes</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={!dirty || saving}
          className="flex-row items-center gap-1.5 px-4 h-9 rounded-[9px]"
          style={{ backgroundColor: C.purple, borderColor: C.purple, borderWidth: 1, ...(!dirty || saving ? { opacity: 0.55 } : {}), ...(Platform.OS === 'web' ? { cursor: 'pointer', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' } : {}) }}
          testID="pf-save"
        >
          <CheckCircle2 size={14} color="#fff" />
          <Text className="text-white font-body-bold text-xs">{saving ? 'Saving…' : 'Save Profile'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default ProfileSettingsView;
