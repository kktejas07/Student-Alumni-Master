/**
 * Mentor Portal — Profile & Settings (Phase 1).
 *
 * Mirrors the Student ProfileSettingsView architecture but rendered with the
 * mentor teal palette and mentor-relevant sidebar stats:
 *
 *   • Header card — Avatar + name + (Role · Company) + Rating ★ · Sessions ·
 *     Verified Mentor + tier pill.
 *   • Tab bar — Profile Info | Manage Profile | Settings | Notifications |
 *     Security | Digital ID Card.
 *   • Right sidebar — Profile Score ring · Mentor Stats list
 *     (Sessions Hosted, Active Mentees, Profile Views, ★ Rating, Earnings)
 *     · Mentor ID card with View Digital ID Card →.
 *   • Save bar — Discard / Save Profile w/ "last saved" timestamp.
 *
 * Backend wiring: identical to student version
 *   GET    /auth/me              · GET /users/me/completion · GET /users/me/stats
 *   PUT    /users/me             — diff-aware save.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Image, Platform,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Settings as SettingsIcon, Bell, ShieldCheck, IdCard,
  CheckCircle2, Award, Sparkles, CalendarCheck, UsersRound, Eye,
  Star, IndianRupee,
} from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { ProfileInfoPage } from '@/src/views/web/profile/ProfileInfoPage';
import { ManageProfilePage } from '@/src/views/web/profile/ManageProfilePage';
import { SettingsPage } from '@/src/views/web/profile/SettingsPage';
import { CompletionRing } from '@/src/views/web/profile/CompletionRing';
import { useToast } from '@/src/views/components';
import { MC, FONTS } from '../tokens';

type TabKey = 'profile-info' | 'manage' | 'settings' | 'notifications' | 'security' | 'digital-id';

const TABS: { key: TabKey; label: string; Icon: any }[] = [
  { key: 'profile-info',  label: 'Profile Info',    Icon: User },
  { key: 'manage',        label: 'Manage Profile',  Icon: SettingsIcon },
  { key: 'settings',      label: 'Settings',        Icon: SettingsIcon },
  { key: 'notifications', label: 'Notifications',   Icon: Bell },
  { key: 'security',      label: 'Security',        Icon: ShieldCheck },
  { key: 'digital-id',    label: 'Digital ID Card', Icon: IdCard },
];

export function MentorProfileSettingsView() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  const { width: winW } = useWindowDimensions();
  const stack = winW < 1100;

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

  const fullName = (draft.full_name || `${draft.first_name || ''} ${draft.last_name || ''}`).trim() || 'Mentor';
  const initials = (fullName.split(' ').slice(0, 2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();
  // Mentor "headline" prefers role · company
  const mInfo: any = (draft as any).mentor_info || {};
  const headline = [mInfo.current_role || draft.primary_skill, mInfo.current_company || draft.institution]
    .filter(Boolean).join(' · ') || draft.headline || 'Verified Mentor';
  const photo = draft.photo_data || draft.face_image_base64;
  const saId = draft.unique_id || user?.unique_id || '—';

  if (loading && !user) {
    return <View style={st.loaderWrap}><ActivityIndicator size="large" color={MC.tealP} /></View>;
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
              {!!stats.avg_rating && stats.avg_rating > 0 && (
                <View style={[st.headerBadge, { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.45)' }]}>
                  <Star size={11} color="#FBBF24" />
                  <Text style={[st.headerBadgeText, { color: '#FBBF24' }]}>{stats.avg_rating}{stats.rating_count ? ` · ${stats.rating_count} reviews` : ''}</Text>
                </View>
              )}
              {!!stats.sessions_completed && (
                <View style={[st.headerBadge, { backgroundColor: 'rgba(20,184,166,0.16)', borderColor: 'rgba(20,184,166,0.45)' }]}>
                  <Text style={[st.headerBadgeText, { color: MC.tealP }]}>{stats.sessions_completed} sessions</Text>
                </View>
              )}
              <View style={[st.headerBadge, { backgroundColor: 'rgba(94,234,212,0.16)', borderColor: 'rgba(94,234,212,0.45)' }]}>
                <ShieldCheck size={12} color={MC.tealP} />
                <Text style={[st.headerBadgeText, { color: MC.tealP }]}>Verified Mentor</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={[stack ? { flexDirection: 'column' } : { flexDirection: 'row' }, { gap: 16 }]}>
        {/* Main */}
        <View style={{ flex: 1, minWidth: 0, gap: 14 }}>
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
                    testID={`mpf-tab-${t.key}`}
                  >
                    <Icon size={14} color={active ? '#0F2922' : MC.muted} />
                    <Text style={[st.tabText, active && { color: '#0F2922' }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

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
          {tab === 'settings' && (
            <SettingsPage
              draft={draft}
              setDraft={(updater: any) => setDraft(typeof updater === 'function' ? updater(draft) : updater)}
              showToast={(m: string) => toast.info(m)}
            />
          )}
          {tab === 'notifications' && <ComingSoon title="Notification Preferences" sub="Granular email / push controls land in Phase 2." />}
          {tab === 'security'      && <ComingSoon title="Security Centre" sub="2FA, login history & active sessions land in Phase 2." />}

          {(tab === 'profile-info' || tab === 'manage' || tab === 'settings') && (
            <View style={{ marginTop: 4 }}>
              <FooterActions dirty={dirty} saving={saving} onSave={onSave} onDiscard={onDiscard} lastSavedAt={lastSavedAt} />
            </View>
          )}
        </View>

        {/* Sidebar */}
        <View style={{ width: stack ? '100%' : 320, gap: 14 }}>
          <View style={st.sideCard}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <CompletionRing
                pct={completion.percentage || 0}
                size={120}
                stroke={10}
                color={(completion.percentage || 0) >= 100 ? '#10B981' : MC.tealP}
              />
              <Text style={st.sideTitle}>Profile Score</Text>
              <Text style={st.sideSub}>{(completion.percentage || 0) >= 100 ? 'All complete!' : `${100 - (completion.percentage || 0)}% to go`}</Text>
              <View style={st.idChip}><Text style={st.idChipText}>{saId}</Text></View>
            </View>
          </View>

          <View style={st.sideCard}>
            <Text style={st.sideHeading}>MENTOR STATS</Text>
            <View style={{ marginTop: 10, gap: 4 }}>
              <StatRow Icon={CalendarCheck} label="Sessions Hosted"  value={stats.sessions_completed ?? 0} tint="#10B981" />
              <StatRow Icon={UsersRound}    label="Active Mentees"   value={stats.connections_made ?? 0}   tint="#60A5FA" />
              <StatRow Icon={Eye}           label="Profile Views"    value={stats.profile_views ?? 0}      tint={MC.tealP} />
              <StatRow Icon={Star}          label="Avg Rating"       value={stats.avg_rating ? `${stats.avg_rating}★` : '—'} tint="#F59E0B" />
              <StatRow Icon={IndianRupee}   label="Earnings (Month)" value={stats.earnings_this_month ? `₹${stats.earnings_this_month}` : '₹0'} tint="#22C55E" last />
            </View>
          </View>

          <View style={st.sideCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <ShieldCheck size={14} color={MC.tealP} />
              <Text style={st.idTitle}>Mentor ID</Text>
            </View>
            <Text style={st.idValue}>{saId}</Text>
            <Text style={st.idMeta}>
              {draft.is_verified ? 'Verified' : 'Active'} · since {new Date(user?.created_at || Date.now()).getFullYear()}
            </Text>
            <Pressable
              onPress={() => router.push('/member-id' as any)}
              style={st.viewIdBtn}
              testID="mpf-view-digital-id"
            >
              <IdCard size={14} color="#0F2922" />
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
      <Sparkles size={28} color={MC.tealP} />
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
        <Pressable onPress={onDiscard} disabled={!dirty} style={[st.btnGhost, !dirty && { opacity: 0.5 }]} testID="mpf-discard">
          <Text style={st.btnGhostText}>Discard Changes</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={!dirty || saving}
          style={[st.btnPrimary, (!dirty || saving) && { opacity: 0.55 }]}
          testID="mpf-save"
        >
          <CheckCircle2 size={14} color="#0F2922" />
          <Text style={st.btnPrimaryText}>{saving ? 'Saving…' : 'Save Profile'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 320 },

  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 18,
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
    borderRadius: 16, padding: 18,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42, overflow: 'hidden',
    backgroundColor: 'rgba(20,184,166,0.20)', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { color: MC.tealP, fontFamily: FONTS.xbold, fontSize: 28 },
  avatarCheck: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center', borderColor: MC.bg, borderWidth: 2,
  },
  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.3 },
  subline: { color: MC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  headerBadgeText: { fontFamily: FONTS.bold, fontSize: 11.5 },

  tabBar: {
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
    borderRadius: 12, padding: 6,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  tabActive: { backgroundColor: MC.tealP },
  tabText: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 12 },

  sideCard: {
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
    borderRadius: 14, padding: 16,
  },
  sideTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, marginTop: 4 },
  sideSub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  sideHeading: { color: MC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1.0 },
  idChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(94,234,212,0.10)', borderColor: 'rgba(94,234,212,0.35)', borderWidth: 1,
    marginTop: 6,
  },
  idChipText: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.5 },

  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  statRowDivider: { borderBottomColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1 },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statLabel: { flex: 1, color: MC.muted, fontFamily: FONTS.med, fontSize: 12.5 },
  statValue: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },

  idTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  idValue: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: 0.5, marginTop: 2 },
  idMeta: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 },
  viewIdBtn: {
    marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: MC.tealP,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', boxShadow: '0 6px 18px rgba(20,184,166,0.35)' } as any) : {}),
  },
  viewIdBtnText: { color: '#0F2922', fontFamily: FONTS.bold, fontSize: 12.5 },

  comingCard: {
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14,
    padding: 32, alignItems: 'center', gap: 8,
  },
  comingTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
  comingSub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },

  footerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: 'rgba(20,184,166,0.08)',
    borderColor: 'rgba(20,184,166,0.24)', borderWidth: 1,
    borderRadius: 12, gap: 12,
  },
  footerStatus: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12 },
  btnGhost: {
    paddingHorizontal: 14, height: 36, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: MC.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  btnGhostText: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, height: 36, borderRadius: 9,
    backgroundColor: MC.tealP, borderColor: MC.tealP, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', boxShadow: '0 6px 18px rgba(20,184,166,0.35)' } as any) : {}),
  },
  btnPrimaryText: { color: '#0F2922', fontFamily: FONTS.bold, fontSize: 12 },
});

export default MentorProfileSettingsView;
