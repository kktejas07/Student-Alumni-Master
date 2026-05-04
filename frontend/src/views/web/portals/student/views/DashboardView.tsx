/**
 * Student Portal — Dashboard view (true RN port of HTML spec).
 *
 * Layout (3-column responsive):
 *   • AI Daily Brief banner
 *   • AI Career Assistant Roadmap card
 *   • 4 KPI tiles
 *   • Top Matches list (left col) + Recommended Mentors (right col)
 *   • Upcoming Events row
 *   • Profile completion CTA
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles, Briefcase, BookOpen, Users, TrendingUp, Calendar, MapPin,
  Star, ArrowRight, Check, ExternalLink,
} from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GRADS } from '../gradients';
import { FadeInView, Stagger, PressScale, SparkIcon, ShimmerGradient, AnimatedRingFill } from '../motion';
import { Av, Badge, KpiCard } from '../atoms';
import * as MOCK from '../data';
import { usePortalData } from '@/src/lib/portalApi';
import { TierBadge } from '@/src/views/web/TierBadge';
import { LiveStrip } from '@/src/views/web/LiveStrip';
import { TrendingCompaniesWidget } from './TrendingCompaniesWidget';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KPI_ICONS = { matches: Briefcase, courses: BookOpen, mentors: Users, score: TrendingUp } as const;

const STUDENT_MOCK = {
  student: MOCK.STUDENT,
  kpis: MOCK.KPIS,
  topMatches: MOCK.TOP_MATCHES,
  recommendedMentors: MOCK.RECOMMENDED_MENTORS,
  upcomingEvents: MOCK.UPCOMING_EVENTS,
  profileCompletion: MOCK.PROFILE_COMPLETION,
};

export function DashboardView() {
  // Authenticated user — drives per-user dashboard data.
  const authUser = useAuthStore((u) => u.user);
  const dashPath = authUser?.email
    ? `/student/dashboard?student_email=${encodeURIComponent(authUser.email)}`
    : '/student/dashboard';
  const { data } = usePortalData<typeof STUDENT_MOCK>(dashPath, STUDENT_MOCK);
  // Live counters polled every 15s so users can SEE auto-refresh working
  const { data: live } = usePortalData<any>('/live/counters', null as any, 15_000);
  const STUDENT = data!.student;
  const KPIS = data!.kpis;
  const TOP_MATCHES = data!.topMatches;
  const RECOMMENDED_MENTORS = data!.recommendedMentors;
  const UPCOMING_EVENTS = data!.upcomingEvents;
  const PROFILE_COMPLETION = data!.profileCompletion;

  const [briefText, setBriefText] = React.useState<string>('');
  const [briefLoading, setBriefLoading] = React.useState<boolean>(false);
  const [briefProvider, setBriefProvider] = React.useState<string>('');

  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const matchW = stack ? '100%' : '64%';
  const mentorW = stack ? '100%' : '34%';

  return (
    <View style={{ gap: 16 }}>
      {/* AI Daily Brief banner — shimmer aura behind hero icon */}
      <FadeInView delay={20}>
      <View style={s.briefRow}>
        <View style={s.briefIcon}>
          <ShimmerGradient colors={GRADS.brandGlow} duration={4200} />
          <SparkIcon Icon={Sparkles} size={18} color={SC.accentBright} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.briefTitle}>AI Daily Brief</Text>
          <Text style={s.briefSub}>{briefText || 'Your personalised morning summary'}</Text>
          {!!briefProvider && !!briefText && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                             backgroundColor: 'rgba(167,139,250,0.16)',
                             borderColor: 'rgba(167,139,250,0.45)', borderWidth: 1 }}>
                <Text style={{ color: '#C4B5FD', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.4 }}>
                  ⚡ Powered by {briefProvider}
                </Text>
              </View>
            </View>
          )}
        </View>
        <PressScale
          style={[s.briefCta, briefLoading && { opacity: 0.6 }]}
          disabled={briefLoading}
          onPress={async () => {
            try {
              setBriefLoading(true);
              const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
              const token = await AsyncStorage.getItem('scd_access_token');
              const r = await fetch(`${base}/api/ai/daily-brief`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ force: false }),
              });
              const j = await r.json();
              setBriefText(j?.brief || j?.detail || 'Could not generate brief.');
              setBriefProvider(j?.provider_label || '');
            } catch (e: any) { setBriefText('Error: ' + (e?.message || 'unknown')); }
            finally { setBriefLoading(false); }
          }}
        >
          <Sparkles size={13} color="#fff" />
          <Text style={s.briefCtaText}>{briefLoading ? 'Generating…' : 'Generate Brief'}</Text>
        </PressScale>
      </View>
      </FadeInView>

      {/* LIVE-COUNTERS strip — refreshes every 15s to demo auto-refresh */}
      <LiveStrip accent="#22C55E" keys={['users', 'bookings', 'applications', 'workshops']} />

      {/* TIER BANNER — glowing badge + score + tier-driven suggestions */}
      {STUDENT.tier && (
        <View style={s.tierCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TierBadge tier={STUDENT.tier.tier} size="lg" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.tierKicker}>YOUR TIER · BASED ON COLLEGE • SKILLS • PROFILE</Text>
              <Text style={s.tierTitle}>
                {STUDENT.tier.tier} <Text style={s.tierScore}>· {STUDENT.tier.score}/100</Text>
              </Text>
              <Text style={s.tierSub}>
                {STUDENT.tier.tier === 'Platinum' && 'You unlock FAANG, OpenAI & Stripe-level opportunities.'}
                {STUDENT.tier.tier === 'Gold' && 'Top Indian tech & senior roles are pinned for you.'}
                {STUDENT.tier.tier === 'Silver' && 'Solid foundation — keep building your stack to reach Gold.'}
                {STUDENT.tier.tier === 'Bronze' && 'Build your portfolio — first projects unlock Silver tier.'}
              </Text>
            </View>
          </View>

          {/* Tier suggestions row */}
          {STUDENT.tier.suggestions && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {(STUDENT.tier.suggestions.skills || []).slice(0, 3).map((skill: string) => (
                <View key={skill} style={s.tierChip}>
                  <Sparkles size={10} color={STUDENT.tier.visuals?.glow || '#A78BFA'} />
                  <Text style={[s.tierChipText, { color: STUDENT.tier.visuals?.glow || '#A78BFA' }]}>{skill}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* AI Career Assistant Roadmap */}
      <View style={s.roadmapCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Sparkles size={13} color={SC.accent} />
          <Text style={s.kicker}>AI CAREER ASSISTANT · PERSONALISED ROADMAP</Text>
        </View>
        <Text style={s.roadmapTitle}>You’re {STUDENT.career.progressPct}% toward your goal:</Text>
        <Text style={s.roadmapGoal}>{STUDENT.career.goal}</Text>

        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={s.progLabel}>Career Progress</Text>
            <Text style={s.progPct}>{STUDENT.career.progressPct}%</Text>
          </View>
          <View style={s.progTrack}>
            <AnimatedRingFill progress={STUDENT.career.progressPct} height={6} fillColors={GRADS.brandSoft} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          <Pressable
            style={({ hovered }: any) => [s.primaryCta, hovered && { backgroundColor: SC.primaryL }]}
            onPress={() => alert('Open full roadmap')}
          >
            <Text style={s.primaryCtaText}>View Full Roadmap →</Text>
          </Pressable>
          <Pressable
            style={({ hovered }: any) => [s.secCta, hovered && { backgroundColor: SC.cardH }]}
            onPress={() => alert('Browse internships')}
          >
            <Text style={s.secCtaText}>Browse Internships</Text>
          </Pressable>
        </View>
      </View>

      {/* 4 KPI tiles — staggered fade-in for visual rhythm */}
      <Stagger gap={70} baseDelay={120}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {KPIS.map((k) => {
            const Icon = KPI_ICONS[k.id as keyof typeof KPI_ICONS];
            return <KpiCard key={k.id} Icon={Icon} label={k.label} value={k.value} delta={k.delta} color={k.color} />;
          })}
        </View>
      </Stagger>

      {/* Trending Companies — live from /api/jobs/trending-companies */}
      <TrendingCompaniesWidget />

      {/* Top Matches + Recommended Mentors */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Top Matches */}
        <View style={[s.col, { width: matchW as any, flex: stack ? undefined : 1.9 }]}>
          <View style={s.colHead}>
            <Text style={s.colTitle}>Top Matches for You</Text>
            <Pressable><Text style={s.seeAll}>See all →</Text></Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {TOP_MATCHES.slice(0, 3).map((m) => (
              <Pressable key={m.id} style={({ hovered }: any) => [s.matchRow, hovered && { backgroundColor: SC.cardH }]}>
                <View style={[s.companyLogo, { backgroundColor: m.logoBg }]}><Text style={s.companyLogoText}>{m.logo}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={s.matchRole}>{m.role}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={s.matchCompany}>{m.company}</Text>
                    <Text style={s.matchDot}>·</Text>
                    <MapPin size={10} color={SC.muted} />
                    <Text style={s.matchCompany}>{m.location}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={s.matchPill}><Text style={s.matchPillText}>✦ {m.match}% match</Text></View>
                  <Badge label={m.type} color="purple" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recommended Mentors */}
        <View style={[s.col, { width: mentorW as any, flex: stack ? undefined : 1 }]}>
          <View style={s.colHead}>
            <Text style={s.colTitle}>Recommended Mentors</Text>
            <Pressable><Text style={s.seeAll}>See all →</Text></Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {RECOMMENDED_MENTORS.slice(0, 2).map((m) => (
              <View key={m.id} style={s.mentorCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Av initials={m.initials} size={42} color={m.color} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={s.mentorName}>{m.name}</Text>
                    <Text style={s.mentorRole}>{m.role} · {m.company}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Star size={11} color={SC.amber} fill={SC.amber} />
                    <Text style={s.mentorMeta}>{m.rating}</Text>
                    <Calendar size={11} color={SC.muted} style={{ marginLeft: 6 }} />
                    <Text style={s.mentorMeta}>{m.sessions} sessions</Text>
                  </View>
                  <Text style={s.mentorPrice}>₹{m.price}/session</Text>
                </View>
                <Pressable style={({ hovered }: any) => [s.bookCta, hovered && { backgroundColor: SC.primaryL }]}>
                  <Calendar size={12} color="#fff" />
                  <Text style={s.bookCtaText}>Book Session</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Upcoming Events */}
      <View>
        <View style={s.colHead}>
          <Text style={s.colTitle}>Upcoming Events</Text>
          <Pressable><Text style={s.seeAll}>See all →</Text></Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {UPCOMING_EVENTS.map((e) => (
            <Pressable key={e.id} style={({ hovered }: any) => [s.eventCard, hovered && { backgroundColor: SC.cardH }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={[s.eventIcon, { backgroundColor: e.accent + '22', borderColor: e.accent + '40' }]}>
                  <Calendar size={14} color={e.accent} />
                </View>
                <Badge label={e.kind === 'free' ? 'FREE' : `₹${e.price}`} color={e.kind === 'free' ? 'green' : 'amber'} />
              </View>
              <Text numberOfLines={2} style={s.eventTitle}>{e.title}</Text>
              <Text style={s.eventDate}>{e.date} · {e.mode}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Profile completion CTA */}
      <LinearGradient
        colors={[SC.primary, SC.primaryD] as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.completionCard}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={s.completionLabel}>Profile Score</Text>
            <View style={s.completionScorePill}><Text style={s.completionScoreText}>{PROFILE_COMPLETION.score}%</Text></View>
          </View>
          <Text style={s.completionTitle}>Complete your profile to unlock more opportunities</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {PROFILE_COMPLETION.missing.map((m) => (
              <View key={m} style={s.missingChip}><Text style={s.missingText}>{m}</Text></View>
            ))}
          </View>
        </View>
        <Pressable style={({ hovered }: any) => [s.completeCta, hovered && { backgroundColor: '#fff' }]}>
          <Text style={s.completeCtaText}>Complete Profile →</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  briefRowPad: { padding: 14, paddingHorizontal: 18 },
  briefRowInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  briefRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 18,
  },
  briefIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(176,127,223,0.15)', alignItems: 'center', justifyContent: 'center' },
  briefTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  briefSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 1 },
  briefCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 10, backgroundColor: SC.primary, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  briefCtaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },

  liveStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderColor: 'rgba(34,197,94,0.25)', borderWidth: 1,
  },
  livePulse: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 8px #22C55E, 0 0 14px #22C55E' } as any) : {}),
  },
  liveLabel: { color: '#22C55E', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1 },
  liveTxt: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12 },
  liveAsOf: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11, fontStyle: 'italic' },

  tierCard: {
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14,
    padding: 18,
  },
  tierKicker: { color: SC.accent, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1 },
  tierTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, marginTop: 2 },
  tierScore: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 14 },
  tierSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  tierChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
  },
  tierChipText: { fontFamily: FONTS.bold, fontSize: 11 },

  roadmapCard: {
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 16,
    padding: 22,
  },
  kicker: { color: SC.accent, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1 },
  roadmapTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.6 },
  roadmapGoal: { color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, marginTop: 4 },
  progLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.2 },
  progPct:   { color: SC.accent, fontFamily: FONTS.xbold, fontSize: 12 },
  progTrack: { height: 6, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progFill:  { height: '100%', borderRadius: 4 },

  primaryCta: { paddingHorizontal: 16, height: 36, borderRadius: 10, backgroundColor: SC.primary, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  primaryCtaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },
  secCta: { paddingHorizontal: 16, height: 36, borderRadius: 10, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  secCtaText: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 12.5 },

  col: {},
  colHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  colTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16, letterSpacing: -0.3 },
  seeAll: { color: SC.accent, fontFamily: FONTS.bold, fontSize: 11.5 },

  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  companyLogo: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  companyLogoText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  matchRole: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  matchCompany: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  matchDot: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11 },
  matchPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.30)', borderWidth: 1 },
  matchPillText: { color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 11 },

  mentorCard: {
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12,
    padding: 14,
  },
  mentorName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  mentorRole: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  mentorMeta: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  mentorPrice: { color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 12 },
  bookCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, height: 34, borderRadius: 8, backgroundColor: SC.primary, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  bookCtaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },

  eventCard: {
    flex: 1, minWidth: 220,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12,
    padding: 14,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  eventIcon: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5, lineHeight: 18 },
  eventDate: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 },

  completionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 16, padding: 18,
  },
  completionLabel: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.xbold, fontSize: 11.5, letterSpacing: 0.5 },
  completionScorePill: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  completionScoreText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11 },
  completionTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, marginTop: 4 },
  missingChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  missingText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 10.5 },
  completeCta: { paddingHorizontal: 18, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  completeCtaText: { color: SC.primaryD, fontFamily: FONTS.xbold, fontSize: 12.5 },
});
