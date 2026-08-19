/**
 * Mentor Portal — Dashboard view (RN port of spec DashboardView).
 *
 * Layout (matches spec):
 *  Left column:
 *    - AI Daily Briefing card
 *    - 4 stat cards in a grid
 *    - Today's Sessions list
 *    - My Connections preview (3 students with progress bars)
 *  Right column (260 fixed width):
 *    - Earnings widget with Withdraw CTA
 *    - Feedback Summary widget with star distribution
 *    - Upcoming sessions mini list
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions, Linking, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar, Users, Coins, Star as StarIcon, Sparkles, ArrowUpRight,
  ChevronRight,
} from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, StarRow, Countdown } from '../atoms';
import * as MOCK from '../data';
import { usePortalData } from '@/src/lib/portalApi';
import { TierBadge } from '@/src/views/web/TierBadge';
import { api, request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { AdBanner } from '@/src/views/web/components/AdBanner';
import { CouponBanner } from '@/src/views/web/components/CouponBanner';

interface Props {
  onNav: (id: string) => void;
  demoMode?: boolean;
  setDemoMode?: (val: boolean) => void;
}

interface MentorDashboardData {
  mentor: any;
  kpis: any[];
  todaySessions: any[];
  monthly: any[];
  pendingRequests: number;
  ratingDist?: any[];
}

const MENTOR_EMPTY: MentorDashboardData = {
  mentor: {},
  kpis: [],
  todaySessions: [],
  monthly: [],
  pendingRequests: 0,
};

export function DashboardView({ onNav, demoMode = false, setDemoMode }: Props) {
  const user = useAuthStore((s) => s.user);
  const dashPath = user?.email
    ? `/mentor/dashboard?mentor_email=${encodeURIComponent(user.email)}`
    : '/mentor/dashboard';

  // Fetch live data; falls back to empty if API unreachable.
  const { data, loading } = usePortalData<MentorDashboardData>(dashPath, MENTOR_EMPTY);
  const liveMentor = data?.mentor as any;
  const tier = liveMentor?.tier;
  const [students, setStudents] = React.useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadDashboardConnections() {
      if (!user || !user.email) {
        setStudentsLoading(false);
        return;
      }
      try {
        const connRes = await api.mentorConnections(user?.email);
        const items = connRes?.items || [];
        const connectedItems = items.filter(
          (item: any) =>
            item.status !== 'none' &&
            item.status !== 'withdrawn' &&
            item.status !== 'declined' &&
            item.status !== 'rejected'
        );
        setStudents(connectedItems);
      } catch (e) {
        console.warn('Dashboard connections fetch failed:', e);
      } finally {
        setStudentsLoading(false);
      }
    }
    loadDashboardConnections();
  }, [user]);

  const TODAY_SESSIONS = data?.todaySessions || [];
  const STUDENTS = students.length > 0 ? students : (demoMode ? MOCK.STUDENTS : []);
  const RATING_DIST = demoMode ? (data?.ratingDist || []) : [
    { stars: 5, pct: 0, count: 0 },
    { stars: 4, pct: 0, count: 0 },
    { stars: 3, pct: 0, count: 0 },
    { stars: 2, pct: 0, count: 0 },
    { stars: 1, pct: 0, count: 0 }
  ];

  const { width } = useWindowDimensions();
  const isWide = width >= 1080;

  if (loading || studentsLoading) {
    return (
      <View style={{ flex: 1, padding: 60, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={MC.tealP} size="large" />
      </View>
    );
  }

  const STATS = [
    { Icon: Calendar, label: 'Sessions Today', value: String(TODAY_SESSIONS.length), sub: TODAY_SESSIONS[0] ? 'Next at ' + TODAY_SESSIONS[0].time : 'No more today', subColor: TODAY_SESSIONS[0] ? MC.tealP : MC.muted },
    { Icon: Users,    label: 'Total Students', value: String(STUDENTS.length),       sub: demoMode ? '↑ 2 this week' : (STUDENTS.length > 0 ? `${STUDENTS.length} active connection${STUDENTS.length === 1 ? '' : 's'}` : 'No active students'), subColor: (demoMode || STUDENTS.length > 0) ? MC.green : MC.muted },
    { Icon: Coins,    label: 'This Month',     value: demoMode ? (data?.kpis?.find((k: any) => k.id === 'earnings')?.value || '₹500') : '₹0', sub: demoMode ? '↑ 12% vs last' : 'Start mentoring to earn', subColor: demoMode ? MC.green : MC.muted },
    { Icon: StarIcon, label: 'Rating',         value: demoMode ? String(liveMentor?.rating || '4.9') : '—',                          sub: demoMode ? `${data?.kpis?.find((k: any) => k.id === 'rating')?.delta || '42 student reviews'}` : 'No student reviews yet',             subColor: demoMode ? MC.amber : MC.muted },
  ];

  const upcoming = STUDENTS.filter((s) => s.nextSession).slice(0, 3);

  return (
    <View style={[s.root, !isWide && { flexDirection: 'column' }]}>
      {/* ── Left column ─────────────────────────────── */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {demoMode && (
          <View style={s.demoBadgeBanner}>
            <Text style={s.demoBadgeText}>
              Demo Mode · Sample data is displayed for demonstration purposes.{' '}
              <Text 
                onPress={() => setDemoMode?.(false)}
                style={{ textDecorationLine: 'underline', color: '#1C1C1E', fontFamily: FONTS.bold }}
              >
                Switch to Live Mode
              </Text>
            </Text>
          </View>
        )}
        {/* Ad Banner */}
        <AdBanner />

        {/* Exclusive Coupons — below the ad banner */}
        <CouponBanner portal="mentor" />

        {/* AI Daily Briefing */}
        <AIDailyBriefing onNav={onNav} demoMode={demoMode} />

        {/* TIER BANNER — mentor */}
        {tier?.tier && (
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A', '#FEF9C3'] as any}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.tierBanner}
          >
            {/* Shimmer highlight overlay */}
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)'] as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }}
              pointerEvents="none"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18 }}
            />
            <TierBadge tier={tier.tier} size="lg" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.tierKicker}>YOUR MENTOR TIER · BASED ON EXPERIENCE • COMPANY • SESSIONS • RATING</Text>
              <Text style={s.tierTitle}>
                {tier.tier} <Text style={s.tierScore}>· {tier.score}/100</Text>
              </Text>
              <Text style={s.tierSub}>
                {tier.tier === 'Platinum' && 'Top 5% mentor — featured to Platinum students.'}
                {tier.tier === 'Gold' && 'Senior mentor — Gold-tier students will see you first.'}
                {tier.tier === 'Silver' && 'Active mentor — keep building sessions to reach Gold.'}
                {tier.tier === 'Bronze' && 'New mentor — complete more sessions to climb tiers.'}
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* Stat cards */}
        <View style={s.statsGrid}>
          {STATS.map((stat, i) => (
            <View key={i} style={s.statCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <View style={s.statIcon}>
                  <stat.Icon size={17} color={MC.tealP} />
                </View>
                <Text style={{ color: MC.muted, fontFamily: FONTS.semi, fontSize: 12 }}>{stat.label}</Text>
              </View>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={{ color: stat.subColor, fontFamily: FONTS.bold, fontSize: 12 }}>{stat.sub}</Text>
            </View>
          ))}
        </View>

        {/* Today's Sessions */}
        <View style={s.cardBox}>
          <View style={s.cardHead}>
            <Text style={s.cardKicker}>TODAY SESSIONS</Text>
            <Pressable onPress={() => onNav('sessions')}><Text style={s.linkText}>View all →</Text></Pressable>
          </View>
          <View style={{ gap: 8 }}>
            {TODAY_SESSIONS.length > 0 ? (
              TODAY_SESSIONS.map((sess, i) => (
                <View key={i} style={s.sessionRow}>
                  <Av initials={sess.avatar} size={40} color={sess.color} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 13 }}>{sess.student}</Text>
                    <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11 }}>{sess.topic}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                    <Text style={{ color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 13 }}>{sess.time}</Text>
                    <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{sess.duration} min</Text>
                  </View>
                  <Pressable
                    onPress={() => Linking.openURL('https://meet.google.com/new')}
                    style={({ hovered }: any) => [s.joinBtn, hovered && { backgroundColor: MC.tealD }]}
                  >
                    <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 11 }}>Join →</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={[s.sessionRow, { justifyContent: 'center', paddingVertical: 20 }]}>
                <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 13 }}>there were no sessions</Text>
              </View>
            )}
          </View>
        </View>

        {/* My Connections preview */}
        <View style={[s.cardBox, { marginTop: 16 }]}>
          <View style={s.cardHead}>
            <Text style={s.cardKicker}>MY CONNECTIONS</Text>
            <Pressable onPress={() => onNav('students')}>
              <Text style={s.linkText}>View all {STUDENTS.length} →</Text>
            </Pressable>
          </View>
          <View style={s.connGrid}>
            {STUDENTS.slice(0, 3).map((stu) => (
              <View key={stu.id} style={s.connCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Av initials={stu.avatar} size={34} color={stu.color} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 12 }}>{stu.name}</Text>
                    <Text numberOfLines={1} style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 10 }}>{stu.college}</Text>
                  </View>
                </View>
                <View style={s.progTrack}>
                  <LinearGradient
                    colors={(stu.progress === 100
                      ? [MC.green, '#16A34A']
                      : stu.progress > 60
                        ? [MC.teal, MC.tealD]
                        : [MC.amber, '#D97706']) as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ height: '100%', width: `${stu.progress}%`, borderRadius: 2 }}
                  />
                </View>
                <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 10 }}>
                  {stu.progress}% · {stu.sessionsCompleted}/{stu.sessionsTotal} sessions
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Right column ─────────────────────────────── */}
      <View style={[s.rightCol, !isWide && { width: '100%', marginTop: 16 }]}>
        {/* Earnings widget */}
        <LinearGradient
          colors={['#ECFDF5', '#D1FAE5'] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.widget, { borderColor: '#6EE7B7', borderWidth: 1.5 }]}
        >
          <Text style={s.widgetKicker}>EARNINGS</Text>
          <Text style={s.widgetBigLight}>{demoMode ? (data?.kpis?.find((k: any) => k.id === 'earnings')?.value || '₹500') : '₹500'}</Text>
          <View style={s.miniTrack}>
            <LinearGradient colors={['#22C55E', '#16A34A'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: '100%', width: '100%', borderRadius: 2 }} />
          </View>
          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginBottom: 12 }}>
            This month · <Text style={{ color: '#1C1C1E', fontFamily: FONTS.bold }}>0%</Text>
          </Text>
          <Pressable
            onPress={() => onNav('earnings')}
            style={({ hovered }: any) => [
              s.withdrawBtn,
              hovered && { backgroundColor: 'rgba(34,197,94,0.12)' }
            ]}
          >
            <Text style={{ color: '#16A34A', fontFamily: FONTS.xbold, fontSize: 12 }}>
              Withdraw ₹500 →
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Feedback Summary */}
        <View style={s.widgetCard}>
          <Text style={s.widgetKicker}>FEEDBACK SUMMARY</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Text style={{ color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 34 }}>{demoMode ? (liveMentor?.rating || '0.0') : '—'}</Text>
            <View>
              <StarRow rating={demoMode ? Math.round(Number(liveMentor?.rating || 0)) : 0} size={14} />
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 3 }}>
                {demoMode ? (data?.kpis?.find((k: any) => k.id === 'rating')?.delta || '0 reviews') : 'No reviews yet'}
              </Text>
            </View>
          </View>
          {RATING_DIST.slice(0, 3).map((d) => (
            <View key={d.stars} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 10, width: 18 }}>{d.stars}★</Text>
              <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <LinearGradient colors={[MC.teal, MC.tealD] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ height: '100%', width: `${d.pct}%`, borderRadius: 3 }} />
              </View>
              <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 10, width: 12, textAlign: 'right' }}>{d.count}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => demoMode && onNav('feedback')}
            disabled={!demoMode}
            style={({ hovered }: any) => [
              s.feedbackBtn,
              !demoMode && { opacity: 0.5 },
              demoMode && hovered && { backgroundColor: 'rgba(20,184,166,0.12)', borderColor: MC.border2 }
            ]}
          >
            <Text style={{ color: demoMode ? MC.tealP : MC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>View all reviews →</Text>
          </Pressable>
        </View>

        {/* Upcoming */}
        <View style={s.widgetCard}>
          <Text style={s.widgetKicker}>UPCOMING</Text>
          {upcoming.map((stu, i) => (
            <View key={stu.id} style={[s.upcomingRow, i < upcoming.length - 1 && { borderBottomWidth: 1, borderBottomColor: MC.border }]}>
              <Av initials={stu.avatar} size={30} color={stu.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 11 }}>{stu.name}</Text>
                <Text numberOfLines={1} style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 10 }}>
                  {stu.nextSession!.date} · {stu.nextSession!.time}
                </Text>
              </View>
              <Countdown days={stu.nextSession!.daysAway} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** AI Daily Briefing card — prominent purple-tinted glass with CTA */
function AIDailyBriefing({ onNav, demoMode = false }: { onNav: (id: string) => void; demoMode?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const firstName = (user as any)?.first_name || (user?.full_name || '').split(' ')[0] || 'Mentor';
  const [briefText, setBriefText] = React.useState<string>('');
  const [briefLoading, setBriefLoading] = React.useState<boolean>(false);

  const generate = async () => {
    if (!demoMode) return;
    try {
      setBriefLoading(true);
      const j = await request<any>('/ai/daily-brief', {
        method: 'POST',
        body: { role: 'mentor' },
      });
      setBriefText(j?.brief || 'Could not generate brief.');
    } catch (e: any) { setBriefText('Error: ' + (e?.message || 'unknown')); }
    finally { setBriefLoading(false); }
  };

  return (
    <LinearGradient
      colors={['rgba(255, 241, 204, 0.9)', 'rgba(255, 250, 235, 0.6)']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={s.briefingCard}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <View style={s.briefingIcon}>
          <Sparkles size={16} color="#FCD34D" />
        </View>
        <Text style={{ color: '#FCD34D', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.6 }}>AI DAILY BRIEFING</Text>
        <View style={{ flex: 1 }} />
        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(252,211,77,0.15)', borderColor: 'rgba(252,211,77,0.30)', borderWidth: 1 }}>
          <Text style={{ color: '#FCD34D', fontFamily: FONTS.xbold, fontSize: 9 }}>POWERED BY CLAUDE</Text>
        </View>
      </View>
      <Text style={{ color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 16, lineHeight: 22, marginBottom: 8 }}>
        {briefText ? 'Today\'s briefing' : (demoMode ? `Good morning, ${firstName} ✨` : 'AI Morning Summary')}
      </Text>
      <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18, marginBottom: 12 }}>
        {demoMode ? (
          briefText || (
            <>
              You have <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>3 sessions today</Text>{' '}
              starting at <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>10:00 AM</Text>.{' '}
              Tap <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>Generate AI Brief</Text> for a personalized morning summary based on your tier, sessions and rating.
            </>
          )
        ) : (
          'Welcome to your AI workspace! AI morning briefs will generate here once you have sessions scheduled. Keep your availability up-to-date to receive bookings.'
        )}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Pressable
          onPress={generate}
          disabled={briefLoading || !demoMode}
          style={({ hovered }: any) => [
            s.briefingPrimary,
            !demoMode && { opacity: 0.5, cursor: 'default' },
            demoMode && hovered && { transform: [{ translateY: -1 }] },
            briefLoading && { opacity: 0.6 }
          ]}
        >
          <Sparkles size={12} color={MC.bg} />
          <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 11.5 }}>
            {briefLoading ? 'Generating…' : (briefText ? 'Regenerate Brief' : (demoMode ? 'Generate AI Brief' : 'Generate AI Brief (Requires active sessions)'))}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onNav('sessions')}
          style={({ hovered }: any) => [
            s.briefingSecondary,
            demoMode && hovered && { borderColor: MC.tealP }
          ]}
        >
          <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11.5 }}>View Today's Schedule</Text>
          <ChevronRight size={12} color={MC.tealP} />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const hovered2 = (b: boolean) => b;

const s = StyleSheet.create({
  root: { flexDirection: 'row', gap: 20 },

  /* Tier banner */
  tierBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden',
    borderColor: '#F59E0B', borderWidth: 1.5, borderRadius: 18,
    padding: 20, marginBottom: 16,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 8px 32px -8px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.6)',
    } as any) : {}),
  },
  tierKicker: { color: '#92400E', fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 1.2 },
  tierTitle: { color: '#78350F', fontFamily: FONTS.xbold, fontSize: 24, letterSpacing: -0.4, marginTop: 4 },
  tierScore: { color: '#B45309', fontFamily: FONTS.bold, fontSize: 14 },
  tierSub: { color: '#92400E', fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },

  /* AI Daily Briefing */
  briefingCard: {
    borderColor: 'rgba(255,255,255,0.7)',
    borderTopColor: 'rgba(255,255,255,1)',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? ({
      backdropFilter: 'blur(16px)',
      boxShadow: '0 12px 40px -12px rgba(245,158,11,0.25)',
    } as any) : {}),
  },
  briefingIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 2px 8px rgba(245,158,11,0.15)' } as any) : {}),
  },
  briefingPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 38, borderRadius: 12,
    backgroundColor: '#FBBF24',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms', boxShadow: '0 4px 12px rgba(251,191,36,0.4)' } as any) : {})
  },
  briefingSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: '#A7F3D0',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms', backdropFilter: 'blur(4px)' } as any) : {})
  },

  /* Stats */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, flexBasis: 180, minWidth: 180,
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
    borderRadius: 14, padding: 16,
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderColor: MC.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.5, marginBottom: 4 },

  /* Card boxes */
  cardBox: {
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
    borderRadius: 14, padding: 18,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardKicker: { color: MC.muted, fontFamily: FONTS.xbold, fontSize: 12, letterSpacing: 1 },
  linkText: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 },

  /* Session row */
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(20,184,166,0.05)',
    borderColor: MC.border, borderWidth: 1,
    borderRadius: 11, padding: 12,
  },
  joinBtn: {
    paddingHorizontal: 14, height: 32, borderRadius: 9,
    backgroundColor: MC.tealP,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },

  /* Connections grid */
  connGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  connCard: {
    flex: 1, flexBasis: 180, minWidth: 180,
    backgroundColor: 'rgba(20,184,166,0.05)',
    borderColor: MC.border, borderWidth: 1,
    borderRadius: 11, padding: 12,
  },
  progTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 5 },

  /* Right column */
  rightCol: { width: 260, gap: 12 },
  widget: { borderRadius: 14, borderWidth: 1, borderColor: MC.border, padding: 16 },
  widgetCard: {
    borderRadius: 14, borderWidth: 1, borderColor: MC.border,
    backgroundColor: MC.card, padding: 16,
  },
  widgetKicker: { color: MC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  widgetKickerDark: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1 },
  widgetBigDark: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 28, letterSpacing: -0.5, marginBottom: 8 },
  widgetBigLight: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 34, letterSpacing: -1, marginVertical: 8 },
  miniTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(20,184,166,0.20)', overflow: 'hidden', marginBottom: 8 },
  withdrawBtn: {
    paddingVertical: 11, alignItems: 'center', borderRadius: 10,
    borderWidth: 1, borderColor: '#22C55E', backgroundColor: 'transparent',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  feedbackBtn: {
    marginTop: 10, paddingVertical: 9, alignItems: 'center', borderRadius: 9,
    backgroundColor: MC.surf, borderWidth: 1, borderColor: MC.border,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  demoBadgeBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  demoBadgeText: {
    color: '#FBBF24',
    fontFamily: FONTS.bold,
    fontSize: 12,
    textAlign: 'center',
  },
});
