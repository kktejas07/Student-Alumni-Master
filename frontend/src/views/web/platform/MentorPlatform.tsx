/**
 * Mentor Web Platform — green-tinted sidebar dashboard for role=mentor.
 * Spec: /tmp/ui_specs/platform-mentor.jsx
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Sidebar, GlassCard, KpiTile, Avatar, BellIcon, PageHeader, PrimaryButton,
  SectionLabel, EmptyState, NavItem,
} from './components';
import { SA, SAGradients } from './tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api } from '@/src/models/services/api';
import {
  MentorStudents, MentorSessions, MentorPostJobs, MentorAnalyticsScreen,
} from './screens/MentorScreens';

import {
  Home as HomeIcon, Users, Calendar, MessageCircle, User as UserIcon,
  DollarSign, Star, Plus,
} from 'lucide-react-native';
import { MentorDashboardView } from '@/src/views/web/MentorDashboardView';

const NAV: NavItem[] = [
  { id: 'home',      Icon: HomeIcon,       label: 'Dashboard',    color: '#2DD4BF' },
  { id: 'students',  Icon: Users,          label: 'Students',     color: '#34D399' },
  { id: 'sessions',  Icon: Calendar,       label: 'Calendar',     color: '#A7F3D0' },
  { id: 'messages',  Icon: MessageCircle,  label: 'Messages',     color: '#60A5FA' },
  { id: 'profile',   Icon: UserIcon,       label: 'Profile',      color: '#F472B6' },
  { id: 'jobs',      Icon: DollarSign,     label: 'Earnings',     color: '#FCD34D' },
  { id: 'analytics', Icon: Star,           label: 'Feedback',     color: '#FB923C' },
  { id: 'create',    Icon: Plus,           label: 'Create Event', color: '#2DD4BF' },
];

export default function MentorPlatform() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [screen, setScreen] = useState<string>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const initials = (user?.full_name || 'SA').split(' ').slice(0, 2).map((p) => p[0] || '').join('').toUpperCase();
  const onLogout = async () => { await logout(); router.replace('/welcome'); };

  return (
    <LinearGradient
      colors={['#071412', '#0A1F1A', '#0F2E26'] as any}
      locations={[0, 0.5, 1] as any}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      {isWide && (
        <Sidebar
          navItems={NAV}
          activeId={screen}
          onNav={setScreen}
          brandSubtitle="Mentor Portal"
          bgColor={'rgba(10,26,22,0.95)'}
          railColor={'#14B8A6'}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          user={{
            initials,
            primary: user?.full_name || 'Mentor',
            secondary: 'Approved Mentor · ⭐ 4.9',
            gradient: SAGradients.green,
          }}
          onLogout={onLogout}
        />
      )}
      <View style={{ flex: 1 }}>
        {screen === 'home' && (
          <MentorDashboardView
            userName={user?.full_name || 'Mentor'}
            notifCount={2}
            onOpenNotifications={() => router.push('/notifications')}
            onOpenProfile={() => setScreen('profile')}
            onActionPress={(id) => {
              if (id === 'create-event') setScreen('create');
              else if (id === 'earnings')  setScreen('jobs');
              else if (id === 'feedback')  setScreen('analytics');
              else if (id === 'analytics') setScreen('analytics');
            }}
          />
        )}
        {screen !== 'home' && (
          <ScrollView contentContainerStyle={styles.main}>
            {screen === 'students' && <MentorStudents />}
            {screen === 'sessions' && <MentorSessions />}
            {screen === 'jobs' && <MentorPostJobs />}
            {screen === 'analytics' && <MentorAnalyticsScreen />}
            {screen === 'messages' && <EmptyState title="Messages" description="Mentor messages coming soon." />}
            {screen === 'profile' && <EmptyState title="Profile" description="Profile editor coming soon." />}
            {screen === 'create' && <EmptyState title="Create Event" description="Event creation coming soon." />}
          </ScrollView>
        )}
      </View>
    </LinearGradient>
  );
}

function Home({ onNav }: { onNav: (id: string) => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [b, r, n] = await Promise.all([
        api.myBookings().catch(() => ({ bookings: [] })),
        api.mentorReviews(user.id).catch(() => ({ reviews: [], items: [], stats: null })),
        api.notifications().catch(() => ({ unread: 0 })),
      ]);
      setBookings(b.bookings || []);
      const list = r.reviews || r.items || [];
      setReviews(list.slice(0, 4));
      setReviewStats(r.stats || null);
      setUnread(n.unread || 0);
    })();
  }, [user]);

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const pending = bookings.filter((b) => b.status === 'pending');
  const completed = bookings.filter((b) => b.status === 'completed');
  const totalHours = (completed.reduce((s, b) => s + (b.duration_minutes || 30), 0) / 60).toFixed(1);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName} 👋`}
        subtitle={`You have ${pending.length} pending session requests and ${reviews.length} recent reviews.`}
        rightSlot={
          <>
            <BellIcon count={unread} onPress={() => router.push('/notifications')} />
            <PrimaryButton label="+ Post a Job" onPress={() => onNav('jobs')} />
          </>
        }
      />

      <View style={[styles.kpiRow, !isWide && { flexDirection: 'column' }]}>
        <KpiTile emoji="📅" label="Total Sessions" value={String(bookings.length)} note={`${pending.length} pending`} noteColor={SA.warn} />
        <KpiTile emoji="⏱️" label="Hours Mentored" value={`${totalHours}h`} note="This year" noteColor={SA.purplePale} />
        <KpiTile emoji="⭐" label="Rating" value={reviewStats?.total > 0 ? String(reviewStats.average) : '—'} note={reviewStats?.total ? `${reviewStats.total} reviews` : 'No reviews yet'} noteColor={SA.success} />
        <KpiTile emoji="💰" label="Est. Earnings" value={`₹${(completed.length * 500).toLocaleString('en-IN')}`} note="Last 30 days" noteColor={SA.warn} />
      </View>

      <View style={[styles.split, !isWide && { flexDirection: 'column' }]}>
        <View style={{ flex: 1, gap: 18 }}>
          {/* Pending session requests */}
          <GlassCard pad={22}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <SectionLabel>⚡ PENDING SESSION REQUESTS</SectionLabel>
              <Text style={{ color: SA.warn, fontFamily: SA.fontBold, fontSize: 12 }}>{pending.length} new</Text>
            </View>
            {pending.length === 0 ? (
              <Text style={{ color: SA.textFaint, fontSize: 13, paddingVertical: 16 }}>
                No pending requests right now — great inbox-zero!
              </Text>
            ) : (
              pending.slice(0, 4).map((b, i) => {
                const inits = (b.student_name || 'S').split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();
                return (
                  <View key={i} style={styles.pendingRow}>
                    <Avatar initials={inits} size={38} gradient={SAGradients.green} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 14 }} numberOfLines={1}>
                        {b.student_name || 'Student'}
                      </Text>
                      <Text style={{ color: SA.textFaint, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {b.topic || 'Career session'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => api.confirmBooking(b.id).then(() => setBookings((bs) => bs.map((x) => x.id === b.id ? { ...x, status: 'confirmed' } : x)))}
                      style={({ hovered }: any) => [styles.acceptBtn, hovered && { transform: [{ translateY: -1 }] }]}
                    >
                      <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 12 }}>Accept</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => api.declineBooking(b.id).then(() => setBookings((bs) => bs.map((x) => x.id === b.id ? { ...x, status: 'cancelled' } : x)))}
                      style={styles.declineBtn}
                    >
                      <Text style={{ color: SA.danger, fontFamily: SA.fontBold, fontSize: 12 }}>Decline</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </GlassCard>

          {/* Upcoming sessions */}
          <GlassCard pad={22}>
            <SectionLabel>📆 UPCOMING SESSIONS</SectionLabel>
            {bookings.filter((b) => b.status === 'confirmed').slice(0, 5).map((b, i) => (
              <View key={i} style={styles.upcomingRow}>
                <View style={styles.upcomingDate}>
                  <Text style={{ color: SA.success, fontFamily: SA.fontBold, fontSize: 14 }}>✓</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 13 }} numberOfLines={1}>
                    {b.student_name || 'Student'}
                  </Text>
                  <Text style={{ color: SA.textFaint, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {b.topic} · {formatDate(b.scheduled_at || b.slot_start_iso)}
                  </Text>
                </View>
                <Text style={{ color: SA.success, fontFamily: SA.fontSemi, fontSize: 11 }}>CONFIRMED</Text>
              </View>
            ))}
            {bookings.filter((b) => b.status === 'confirmed').length === 0 && (
              <EmptyState icon="📅" title="No upcoming sessions" sub="Post a slot to start receiving bookings." />
            )}
          </GlassCard>
        </View>

        <View style={{ width: isWide ? 320 : '100%', gap: 16 }}>
          {/* Recent reviews */}
          <GlassCard pad={20}>
            <SectionLabel>⭐ RECENT REVIEWS</SectionLabel>
            {reviews.length === 0 && <Text style={{ color: SA.textFaint, fontSize: 13 }}>Reviews appear here after sessions.</Text>}
            {reviews.map((r, i) => (
              <View key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: i < reviews.length - 1 ? 1 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {[...Array(5)].map((_, idx) => (
                    <Text key={idx} style={{ color: idx < r.rating ? SA.warn : 'rgba(255,255,255,0.18)', fontSize: 13 }}>★</Text>
                  ))}
                </View>
                {r.comment && (
                  <Text style={{ color: SA.white, fontSize: 12, marginTop: 6, lineHeight: 17 }} numberOfLines={3}>
                    "{r.comment}"
                  </Text>
                )}
                <Text style={{ color: SA.textFaint, fontSize: 11, marginTop: 4 }}>
                  — {r.user_name || 'Anonymous student'}
                </Text>
              </View>
            ))}
          </GlassCard>

          {/* Quick actions */}
          <GlassCard pad={18}>
            <SectionLabel>⚡ QUICK ACTIONS</SectionLabel>
            {[
              { emoji: '📅', label: 'Post a Session', sub: 'Open a 1:1 or group slot', onPress: () => onNav('sessions') },
              { emoji: '📊', label: 'Full Analytics', sub: 'Mentor KPIs & growth', onPress: () => onNav('analytics') },
              { emoji: '💬', label: 'Knowledge Rooms', sub: 'Host live discussions', onPress: () => router.push('/rooms' as any) },
            ].map((q, i, arr) => (
              <Pressable
                key={i}
                onPress={q.onPress}
                style={[styles.qrRow, i < arr.length - 1 && { borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1 }]}
              >
                <Text style={{ fontSize: 18 }}>{q.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: SA.white, fontFamily: SA.fontSemi, fontSize: 13 }}>{q.label}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginTop: 1 }}>{q.sub}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>›</Text>
              </Pressable>
            ))}
          </GlassCard>
        </View>
      </View>
    </>
  );
}

function Stub({ title, emoji, sub }: { title: string; emoji: string; sub: string }) {
  return (
    <>
      <PageHeader title={`${title} ${emoji}`} subtitle={sub} />
      <GlassCard pad={28}>
        <EmptyState icon={emoji} title={`${title} hub coming soon`} sub="This view ships in the next iteration — use mobile or the dashboard for now." />
      </GlassCard>
    </>
  );
}

function formatDate(iso?: string) {
  if (!iso) return 'Date TBD';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', height: '100%' as any },
  main: { padding: 36, paddingBottom: 80 },
  kpiRow: { flexDirection: 'row', gap: 14, marginBottom: 24, flexWrap: 'wrap' as const },
  split: { flexDirection: 'row', gap: 20 },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1,
  },
  acceptBtn: {
    backgroundColor: '#0F9D58',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  declineBtn: {
    borderColor: 'rgba(252,165,165,0.4)', borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    ...({ cursor: 'pointer' } as any),
  },
  upcomingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11,
    borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1,
  },
  upcomingDate: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(22,163,74,0.18)',
    borderColor: 'rgba(134,239,172,0.4)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  qrRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    ...({ cursor: 'pointer' } as any),
  },
});
