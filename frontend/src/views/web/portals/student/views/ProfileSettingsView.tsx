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
  View, Text, Pressable, StyleSheet, ScrollView, Image, Platform,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Settings as SettingsIcon, Bell, ShieldCheck, IdCard,
  CheckCircle2, GraduationCap, Award, ExternalLink, Sparkles,
  Briefcase, UsersRound, Eye, CalendarCheck, FileSearch,
  Star, IndianRupee, Building2, Plug,
} from '../iconShims';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { ProfileInfoPage } from '@/src/views/web/profile/ProfileInfoPage';
import { ManageProfilePage } from '@/src/views/web/profile/ManageProfilePage';
import { SettingsPage } from '@/src/views/web/profile/SettingsPage';
import { IntegrationsView } from '@/src/views/web/profile/IntegrationsView';
import { CompletionRing } from '@/src/views/web/profile/CompletionRing';
import { SaveBar, C } from '@/src/views/web/profile/primitives';
import { useToast } from '@/src/views/components';

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

  const [tab, setTab] = useState<TabKey>('profile-info');
  const [draft, setDraft] = useState<any>(user || {});
  const [completion, setCompletion] = useState<{ percentage: number; items: any[] }>({ percentage: 0, items: [] });
  const [stats, setStats] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

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

  // Track if draft changed vs last server snapshot
  const dirty = useMemo(() => {
    if (!user) return false;
    const watched = [
      'first_name','last_name','full_name','headline','bio','phone','city','state','location',
      'photo_data','face_image_base64','institution','branch','graduation_year','cgpa',
      'interests','skills','linkedin_url','github_url','portfolio_url','profile_visibility',
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
      // Build payload from changed fields only (still safe-listed server-side)
      const payload: any = {};
      const watched = [
        'first_name','last_name','full_name','headline','bio','phone','city','state','location',
        'photo_data','face_image_base64','institution','branch','graduation_year','cgpa',
        'interests','skills','linkedin_url','github_url','portfolio_url','profile_visibility',
        'section_toggles','primary_skill','preferences',
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
  const headline = [draft.branch ? `B.Tech ${draft.branch}` : null, draft.institution].filter(Boolean).join(' · ') ||
                    draft.headline || cfg.fallbackHeadline;
  const photo = draft.photo_data || draft.face_image_base64;
  const saId = draft.unique_id || user?.unique_id || '—';

  if (loading && !user) {
    return (
      <View style={st.loaderWrap}><ActivityIndicator size="large" color={C.purple} /></View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {/* Header card */}
      <View style={[st.headerCard, stack && { flexDirection: 'column' }]}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <View style={st.avatar}>
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={st.avatarText}>{initials}</Text>
            )}
            {draft.is_verified && (
              <View style={st.avatarCheck}><CheckCircle2 size={11} color="#fff" /></View>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.name}>{fullName}</Text>
            <Text style={st.subline}>{headline}</Text>
            <View style={st.badgeRow}>
              {!!draft.cgpa && (
                <View style={[st.headerBadge, { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.45)' }]}>
                  <Text style={[st.headerBadgeText, { color: '#FBBF24' }]}>CGPA {draft.cgpa}</Text>
                </View>
              )}
              {!!stats.sessions_completed && (
                <View style={[st.headerBadge, { backgroundColor: 'rgba(20,184,166,0.16)', borderColor: 'rgba(20,184,166,0.45)' }]}>
                  <Text style={[st.headerBadgeText, { color: '#5EEAD4' }]}>{stats.sessions_completed} {cfg.badgeNoun}</Text>
                </View>
              )}
              <View style={[st.headerBadge, { backgroundColor: 'rgba(167,139,250,0.16)', borderColor: 'rgba(167,139,250,0.45)' }]}>
                <ShieldCheck size={12} color="#C4B5FD" />
                <Text style={[st.headerBadgeText, { color: '#C4B5FD' }]}>{cfg.verifiedLabel}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={[stack ? { flexDirection: 'column' } : { flexDirection: 'row' }, { gap: 16 }]}>
        {/* Main column */}
        <View style={{ flex: 1, minWidth: 0, gap: 14 }}>
          {/* Tab bar */}
          <View style={st.tabBar}>
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
                    style={[st.tab, active && st.tabActive]}
                    testID={`pf-tab-${t.key}`}
                  >
                    <Icon size={14} color={active ? '#fff' : C.text2} />
                    <Text style={[st.tabText, active && { color: '#fff' }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Tab content */}
          {tab === 'profile-info' && (
            <ProfileInfoPage
              draft={draft}
              setDraft={(updater: any) => setDraft(typeof updater === 'function' ? updater(draft) : updater)}
              completion={completion}
              onUploadPhoto={onUploadPhoto}
            />
          )}

          {tab === 'manage' && (
            <ManageProfilePage
              draft={draft}
              setDraft={(updater: any) => setDraft(typeof updater === 'function' ? updater(draft) : updater)}
              badges={draft.badges || []}
              onCertChange={() => reload()}
              showToast={(m: string) => toast.info(m)}
            />
          )}

          {tab === 'integrations' && <IntegrationsView />}

          {tab === 'settings' && (
            <SettingsPage
              draft={draft}
              setDraft={(updater: any) => setDraft(typeof updater === 'function' ? updater(draft) : updater)}
              showToast={(m: string) => toast.info(m)}
            />
          )}

          {tab === 'notifications' && <ComingSoon title="Notification Preferences" sub="Granular email / push controls land in Phase 2." />}
          {tab === 'security'      && <ComingSoon title="Security Centre"          sub="2FA, login history & active sessions land in Phase 2." />}

          {(tab === 'profile-info' || tab === 'manage' || tab === 'settings') && (
            <View style={{ marginTop: 4 }}>
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
          <View style={st.sideCard}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <CompletionRing
                pct={completion.percentage || 0}
                size={120}
                stroke={10}
                color={(completion.percentage || 0) >= 100 ? '#10B981' : '#A78BFA'}
              />
              <Text style={st.sideTitle}>Profile Score</Text>
              <Text style={st.sideSub}>{(completion.percentage || 0) >= 100 ? 'All complete!' : `${100 - (completion.percentage || 0)}% to go`}</Text>
              <View style={st.idChip}>
                <Text style={st.idChipText}>{saId}</Text>
              </View>
            </View>
          </View>

          {/* Role-aware stats list */}
          <View style={st.sideCard}>
            <Text style={st.sideHeading}>{cfg.statsHeading}</Text>
            <View style={{ marginTop: 10, gap: 4 }}>
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
          <View style={st.sideCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <ShieldCheck size={14} color="#A78BFA" />
              <Text style={st.idTitle}>{cfg.idLabel}</Text>
            </View>
            <Text style={st.idValue}>{saId}</Text>
            <Text style={st.idMeta}>
              {draft.is_verified ? 'Verified' : 'Active'} · since {new Date(user?.created_at || Date.now()).getFullYear()}
            </Text>
            <Pressable
              onPress={() => router.push('/member-id' as any)}
              style={st.viewIdBtn}
              testID="pf-view-digital-id"
            >
              <IdCard size={14} color="#fff" />
              <Text style={st.viewIdBtnText}>View Digital ID Card →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ---------- helpers ---------- */
function StatRow({ Icon, label, value, tint, last }: { Icon: any; label: string; value: any; tint: string; last?: boolean }) {
  return (
    <View style={[st.statRow, !last && st.statRowDivider]}>
      <View style={[st.statIcon, { backgroundColor: tint + '20', borderColor: tint + '50' }]}>
        <Icon size={14} color={tint} />
      </View>
      <Text style={st.statLabel}>{label}</Text>
      <Text style={st.statValue}>{value}</Text>
    </View>
  );
}

function ComingSoon({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={st.comingCard}>
      <Sparkles size={28} color="#A78BFA" />
      <Text style={st.comingTitle}>{title}</Text>
      <Text style={st.comingSub}>{sub}</Text>
    </View>
  );
}

function FooterActions({ dirty, saving, onSave, onDiscard, lastSavedAt }: any) {
  return (
    <View style={st.footerBar}>
      <Text style={st.footerStatus}>
        {lastSavedAt ? `Last saved ${lastSavedAt}` : (dirty ? 'You have unsaved changes' : 'All changes saved')}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={onDiscard} disabled={!dirty} style={[st.btnGhost, !dirty && { opacity: 0.5 }]} testID="pf-discard">
          <Text style={st.btnGhostText}>Discard Changes</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={!dirty || saving}
          style={[st.btnPrimary, (!dirty || saving) && { opacity: 0.55 }]}
          testID="pf-save"
        >
          <CheckCircle2 size={14} color="#fff" />
          <Text style={st.btnPrimaryText}>{saving ? 'Saving…' : 'Save Profile'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 320 },

  /* Header */
  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 18,
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 16, padding: 18,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42, overflow: 'hidden',
    backgroundColor: 'rgba(167,139,250,0.20)', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { color: '#A78BFA', fontFamily: 'DMSans_800ExtraBold', fontSize: 28 },
  avatarCheck: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
    borderColor: C.bg, borderWidth: 2,
  },
  name: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 22, letterSpacing: -0.3 },
  subline: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  headerBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  /* Tabs */
  tabBar: {
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 12, padding: 6,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  tabActive: { backgroundColor: C.purple },
  tabText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },

  /* Sidebar */
  sideCard: {
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 14, padding: 16,
  },
  sideTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14, marginTop: 4 },
  sideSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
  sideHeading: { color: C.text2, fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.0 },
  idChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.35)', borderWidth: 1,
    marginTop: 6,
  },
  idChipText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 11.5, letterSpacing: 0.5 },

  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  statRowDivider: { borderBottomColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1 },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statLabel: { flex: 1, color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
  statValue: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },

  idTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  idValue: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 18, letterSpacing: 0.5, marginTop: 2 },
  idMeta: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 4 },
  viewIdBtn: {
    marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: C.purple,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' } as any) : {}),
  },
  viewIdBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },

  /* Coming soon */
  comingCard: {
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14,
    padding: 32, alignItems: 'center', gap: 8,
  },
  comingTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 16 },
  comingSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, textAlign: 'center' },

  /* Footer save */
  footerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderColor: 'rgba(167,139,250,0.24)', borderWidth: 1,
    borderRadius: 12, gap: 12,
  },
  footerStatus: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  btnGhost: {
    paddingHorizontal: 14, height: 36, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  btnGhostText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, height: 36, borderRadius: 9,
    backgroundColor: C.purple, borderColor: C.purple, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' } as any) : {}),
  },
  btnPrimaryText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
});

export default ProfileSettingsView;
