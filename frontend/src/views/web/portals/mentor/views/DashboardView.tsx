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
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions, Linking } from 'react-native';
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
import { LiveStrip } from '@/src/views/web/LiveStrip';

interface Props { onNav: (id: string) => void; }

const MENTOR_MOCK = {
  mentor: { ...MOCK.MENTOR, tier: undefined as any },
  kpis: [],
  todaySessions: MOCK.TODAY_SESSIONS,
  monthly: MOCK.MONTHLY,
  pendingRequests: MOCK.SESSION_REQUESTS.length,
};

export function DashboardView({ onNav }: Props) {
  // Fetch live data; falls back to mock if API unreachable.
  const { data } = usePortalData<typeof MENTOR_MOCK>('/mentor/dashboard', MENTOR_MOCK);
  const liveMentor = data?.mentor as any;
  const tier = liveMentor?.tier;
  // For now we still consume MOCK.* directly inside the JSX since the
  // existing render references local arrays. The fetch call above primes
  // the cache so subsequent views see fresh data; full prop mapping will
  // happen as views are rebuilt against the API contract.
  const TODAY_SESSIONS = MOCK.TODAY_SESSIONS;
  const STUDENTS = MOCK.STUDENTS;
  const RATING_DIST = MOCK.RATING_DIST;

  const { width } = useWindowDimensions();
  const isWide = width >= 1080;

  const STATS = [
    { Icon: Calendar, label: 'Sessions Today', value: String(TODAY_SESSIONS.length), sub: 'Next at ' + TODAY_SESSIONS[0].time, subColor: MC.tealP },
    { Icon: Users,    label: 'Total Students', value: String(STUDENTS.length),       sub: '↑ 2 this week',                  subColor: MC.green },
    { Icon: Coins,    label: 'This Month',     value: '₹28,500',                       sub: '↑ 12% vs last',                   subColor: MC.green },
    { Icon: StarIcon, label: 'Rating',         value: '4.9',                          sub: '42 student reviews',             subColor: MC.amber },
  ];

  const upcoming = STUDENTS.filter((s) => s.nextSession).slice(0, 3);

  return (
    <View style={[s.root, !isWide && { flexDirection: 'column' }]}>
      {/* ── Left column ─────────────────────────────── */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* LIVE counters */}
        <View style={{ marginBottom: 14 }}>
          <LiveStrip accent="#5EEAD4" keys={['mentors', 'bookings_today', 'bookings', 'courses']} />
        </View>

        {/* AI Daily Briefing */}
        <AIDailyBriefing onNav={onNav} />

        {/* TIER BANNER — mentor */}
        {tier?.tier && (
          <View style={s.tierBanner}>
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
          </View>
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
            <Text style={s.cardKicker}>TODAY'S SESSIONS</Text>
            <Pressable onPress={() => onNav('sessions')}><Text style={s.linkText}>View all →</Text></Pressable>
          </View>
          <View style={{ gap: 8 }}>
            {TODAY_SESSIONS.map((sess, i) => (
              <View key={i} style={s.sessionRow}>
                <Av initials={sess.avatar} size={40} color={sess.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{sess.student}</Text>
                  <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11 }}>{sess.topic}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{sess.time}</Text>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{sess.duration} min</Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL('https://meet.google.com/new')}
                  style={({ hovered }: any) => [s.joinBtn, hovered && { backgroundColor: MC.tealD }]}
                >
                  <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 11 }}>Join →</Text>
                </Pressable>
              </View>
            ))}
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
                    <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{stu.name}</Text>
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
          colors={['#0D2E2A', '#0A3D35'] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.widget}
        >
          <Text style={s.widgetKicker}>EARNINGS</Text>
          <Text style={s.widgetBig}>₹28,500</Text>
          <View style={s.miniTrack}>
            <LinearGradient colors={[MC.teal, MC.tealD] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: '100%', width: '72%', borderRadius: 2 }} />
          </View>
          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginBottom: 12 }}>
            This month · <Text style={{ color: MC.green, fontFamily: FONTS.bold }}>↑ 12%</Text>
          </Text>
          <Pressable
            onPress={() => onNav('earnings')}
            style={({ hovered }: any) => [s.withdrawBtn, hovered && { backgroundColor: 'rgba(20,184,166,0.10)' }]}
          >
            <Text style={{ color: MC.tealP, fontFamily: FONTS.xbold, fontSize: 12 }}>Withdraw ₹6,000 →</Text>
          </Pressable>
        </LinearGradient>

        {/* Feedback Summary */}
        <View style={s.widgetCard}>
          <Text style={s.widgetKicker}>FEEDBACK SUMMARY</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 34 }}>4.9</Text>
            <View>
              <StarRow rating={5} size={14} />
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 3 }}>42 reviews</Text>
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
          <Pressable onPress={() => onNav('feedback')} style={({ hovered }: any) => [s.feedbackBtn, hovered && { backgroundColor: 'rgba(20,184,166,0.12)', borderColor: MC.border2 }]}>
            <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>View all reviews →</Text>
          </Pressable>
        </View>

        {/* Upcoming */}
        <View style={s.widgetCard}>
          <Text style={s.widgetKicker}>UPCOMING</Text>
          {upcoming.map((stu, i) => (
            <View key={stu.id} style={[s.upcomingRow, i < upcoming.length - 1 && { borderBottomWidth: 1, borderBottomColor: MC.border }]}>
              <Av initials={stu.avatar} size={30} color={stu.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 11 }}>{stu.name}</Text>
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
function AIDailyBriefing({ onNav }: { onNav: (id: string) => void }) {
  const [briefText, setBriefText] = React.useState<string>('');
  const [briefLoading, setBriefLoading] = React.useState<boolean>(false);

  const generate = async () => {
    try {
      setBriefLoading(true);
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
      const r = await fetch(`${base}/api/ai/daily-brief`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'mentor' }),
      });
      const j = await r.json();
      setBriefText(j?.brief || 'Could not generate brief.');
    } catch (e: any) { setBriefText('Error: ' + (e?.message || 'unknown')); }
    finally { setBriefLoading(false); }
  };

  return (
    <View style={s.briefingCard}>
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
      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16, lineHeight: 22, marginBottom: 8 }}>
        {briefText ? 'Today\'s briefing' : 'Good morning, Mentor ✨'}
      </Text>
      <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18, marginBottom: 12 }}>
        {briefText || (
          <>
            You have <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>3 sessions today</Text>{' '}
            starting at <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>10:00 AM</Text>.{' '}
            Tap <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>Generate AI Brief</Text> for a personalized morning summary based on your tier, sessions and rating.
          </>
        )}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Pressable
          onPress={generate}
          disabled={briefLoading}
          style={({ hovered }: any) => [s.briefingPrimary, hovered && { transform: [{ translateY: -1 }] }, briefLoading && { opacity: 0.6 }]}
        >
          <Sparkles size={12} color={MC.bg} />
          <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 11.5 }}>
            {briefLoading ? 'Generating…' : (briefText ? 'Regenerate Brief' : 'Generate AI Brief')}
          </Text>
        </Pressable>
        <Pressable onPress={() => onNav('sessions')} style={({ hovered }: any) => [s.briefingSecondary, hovered && { borderColor: MC.tealP }]}>
          <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11.5 }}>View Today's Schedule</Text>
          <ChevronRight size={12} color={MC.tealP} />
        </Pressable>
      </View>
    </View>
  );
}

const hovered2 = (b: boolean) => b;

const s = StyleSheet.create({
  root: { flexDirection: 'row', gap: 20 },

  /* Tier banner */
  tierBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14,
    padding: 16, marginBottom: 16,
  },
  tierKicker: { color: MC.tealP, fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 1 },
  tierTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, marginTop: 2 },
  tierScore: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 14 },
  tierSub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },

  /* AI Daily Briefing */
  briefingCard: {
    backgroundColor: 'rgba(252,211,77,0.06)',
    borderColor: 'rgba(252,211,77,0.22)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 8px 30px -12px rgba(252,211,77,0.20)' } as any) : {}),
  },
  briefingIcon: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(252,211,77,0.18)',
    borderColor: 'rgba(252,211,77,0.35)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  briefingPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, height: 36, borderRadius: 10,
    backgroundColor: '#FCD34D',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  briefingSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, height: 36, borderRadius: 10,
    borderWidth: 1, borderColor: MC.border2,
    backgroundColor: 'rgba(20,184,166,0.07)',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
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
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderColor: MC.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.5, marginBottom: 4 },

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
  widgetBig: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 28, letterSpacing: -0.5, marginBottom: 8 },
  miniTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(20,184,166,0.20)', overflow: 'hidden', marginBottom: 8 },
  withdrawBtn: {
    paddingVertical: 11, alignItems: 'center', borderRadius: 10,
    borderWidth: 1, borderColor: MC.tealP, backgroundColor: 'transparent',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  feedbackBtn: {
    marginTop: 10, paddingVertical: 9, alignItems: 'center', borderRadius: 9,
    backgroundColor: MC.surf, borderWidth: 1, borderColor: MC.border,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
});
