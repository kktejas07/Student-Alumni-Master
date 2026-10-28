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
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles, Briefcase, BookOpen, Users, TrendingUp, Calendar, MapPin,
  Star, ArrowRight, Check, ExternalLink,
} from '../iconShims';
import { SC, FONTS } from '../tokens';
import { Av, Badge, KpiCard } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';
import { TierBadge } from '@/src/views/web/TierBadge';
import { LiveStrip } from '@/src/views/web/LiveStrip';
import { request } from '@/src/models/services/api';
import { AdBanner } from '@/src/views/web/components/AdBanner';
import { CouponBanner } from '@/src/views/web/components/CouponBanner';
import { useToast } from '@/src/views/components';

const KPI_ICONS = { matches: Briefcase, applications: Briefcase, courses: BookOpen, mentors: Users, score: TrendingUp, events: Calendar } as const;

/**
 * Response shape of GET /api/student/dashboard (backend/portals.py,
 * `student_dashboard`). Lists may be empty; `tier` may be absent.
 */
type StudentTier = {
  tier: string;
  score: number;
  visuals?: { glow?: string; [k: string]: any };
  suggestions?: { skills?: string[]; [k: string]: any };
};
type StudentDashboard = {
  student: {
    id: string;
    name: string;
    initials: string;
    year: string;
    saId: string | null;
    career: { goal: string; progressPct: number };
    career_score: number;
    tier: StudentTier | null;
  };
  stats?: Record<string, string | number>;
  kpis: { id: string; label: string; value: string; delta: string; color: string }[];
  topMatches: { id: string; role: string; company: string; location: string; match: number; type: string; logo: string; logoBg: string }[];
  recommendedMentors: {
    id: string; name: string; initials: string; role: string; company: string;
    rating: number; sessions: number; price: number; color: string;
    bio?: string; skills?: string[]; avatar?: string;
  }[];
  upcomingEvents: { id: string | number; title: string; date: string; mode: string; kind: string; price?: number; accent: string }[];
  profileCompletion: { score: number; missing: string[] };
};

const EMPTY: StudentDashboard = {
  student: {
    id: '', name: '', initials: '', year: '', saId: null,
    career: { goal: '', progressPct: 0 },
    career_score: 0,
    tier: null,
  },
  kpis: [],
  topMatches: [],
  recommendedMentors: [],
  upcomingEvents: [],
  profileCompletion: { score: 0, missing: [] },
};

/** Labels for the four KPI tiles, shown only as placeholders when the API has no numbers. */
const KPI_PLACEHOLDERS: StudentDashboard['kpis'] = [
  { id: 'matches',      label: 'Profile Strength',   value: '--', delta: 'No data yet', color: 'purple' },
  { id: 'applications', label: 'Applications',       value: '--', delta: 'No data yet', color: 'blue' },
  { id: 'mentors',      label: 'Mentor Connections', value: '--', delta: 'No data yet', color: 'green' },
  { id: 'events',       label: 'Events',             value: '--', delta: 'No data yet', color: 'red' },
];

function SkeletonBlock({ height, flex }: { height: number; flex?: number }) {
  return <View style={[s.skeleton, { height }, flex !== undefined && { flex }]} />;
}

function EmptyLine({ text }: { text: string }) {
  return <Text style={s.emptyLine}>{text}</Text>;
}

export function DashboardView({
  onOpenProfile, onOpenInternships, onOpenNetwork, onOpenEvents, onOpenCareerAi,
}: {
  onOpenProfile?: () => void;
  onOpenInternships?: () => void;
  onOpenNetwork?: () => void;
  onOpenEvents?: () => void;
  onOpenCareerAi?: () => void;
} = {}) {
  const router = useRouter();
  const toast = useToast();
  const { data, loading, error, refresh } = usePortalData<StudentDashboard>('/student/dashboard', EMPTY);
  const view: StudentDashboard = data || EMPTY;
  const STUDENT = view.student;
  // The API always returns four KPI entries; an empty list means nothing has loaded.
  const hasData = view.kpis.length > 0;
  const KPIS = hasData ? view.kpis : KPI_PLACEHOLDERS;
  const TOP_MATCHES = view.topMatches;
  const RECOMMENDED_MENTORS = view.recommendedMentors;
  const UPCOMING_EVENTS = view.upcomingEvents;
  const PROFILE_COMPLETION = view.profileCompletion;
  const tier = STUDENT.tier;
  const tierGlow = tier?.visuals?.glow || '#378FE9';

  const [briefText, setBriefText] = React.useState<string>('');
  const [briefLoading, setBriefLoading] = React.useState<boolean>(false);

  // Referral requests inbox + open-to-referrals toggle (alumni/mentor)
  const [referralRequests, setReferralRequests] = React.useState<any[]>([]);
  const [referralLoading, setReferralLoading] = React.useState<boolean>(false);
  const [openToReferrals, setOpenToReferrals] = React.useState<boolean>(true);
  const [savingOpenFlag, setSavingOpenFlag] = React.useState<boolean>(false);
  const [meRole, setMeRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me: any = await request('/auth/me').catch(() => null);
        if (me?.role) {
          setMeRole(me.role);
          if (me.role === 'alumni' || me.role === 'mentor') {
            setOpenToReferrals(me.accepts_referrals !== false);
          }
        }
        setReferralLoading(true);
        const inbox: any = await request('/referrals/inbox').catch(() => ({ items: [] }));
        if (!cancelled) setReferralRequests(inbox?.items || []);
      } catch { }
      finally { if (!cancelled) setReferralLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const isReferralCapable = meRole === 'alumni' || meRole === 'mentor';

  const toggleOpenToReferrals = async () => {
    const next = !openToReferrals;
    setSavingOpenFlag(true);
    try {
      await request('/users/me/referral-settings', { method: 'PATCH', body: { accepts_referrals: next } });
      setOpenToReferrals(next);
    } catch (e: any) {
      toast.error('Could not update settings', e?.message || 'Please try again.');
    } finally {
      setSavingOpenFlag(false);
    }
  };

  const respondReferral = async (id: string, status: 'accepted' | 'declined' | 'referred') => {
    try {
      await request(`/referrals/${id}/respond`, { method: 'POST', body: { status } });
      setReferralRequests((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
      if (status === 'accepted' || status === 'referred') {
        toast.success('Referral handled', 'You have notified the student.');
      } else {
        toast.info('Referral declined', 'The student has been notified.');
      }
    } catch (e: any) {
      toast.error('Could not respond', e?.message || 'Please try again.');
    }
  };

  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const matchW = stack ? '100%' : '64%';
  const mentorW = stack ? '100%' : '34%';

  if (loading && !hasData) {
    return (
      <View style={{ gap: 16 }}>
        <SkeletonBlock height={64} />
        <SkeletonBlock height={160} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height={104} flex={1} />)}
        </View>
        <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
          <SkeletonBlock height={220} flex={stack ? undefined : 1.9} />
          <SkeletonBlock height={220} flex={stack ? undefined : 1} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <ActivityIndicator size="small" color={SC.primary} />
          <Text style={s.emptyLine}>Loading dashboard</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {/* Error banner: request failed. Any previously loaded data stays on screen. */}
      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>Could not load dashboard data. {error}</Text>
          <Pressable onPress={refresh} style={({ hovered }: any) => [s.retryBtn, hovered && { opacity: 0.9 }]}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Ad Banner */}
      <AdBanner />

      {/* Exclusive Coupons — below the ad banner */}
      <CouponBanner portal="alumni" />

      {/* AI Daily Brief banner */}
      <View style={s.briefRow}>
        <View style={s.briefIcon}><Sparkles size={18} color={SC.accentBright} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.briefTitle}>AI Daily Brief</Text>
          <Text style={s.briefSub}>{briefText || 'Your personalised morning summary'}</Text>
        </View>
        <Pressable
          style={({ hovered }: any) => [s.briefCta, hovered && { backgroundColor: SC.primaryL }, briefLoading && { opacity: 0.6 }]}
          disabled={briefLoading}
          onPress={async () => {
            try {
              setBriefLoading(true);
              const j = await request<any>('/ai/daily-brief', {
                method: 'POST',
                body: { role: 'alumni' },
              });
              setBriefText(j?.brief || 'Could not generate brief.');
            } catch (e: any) { setBriefText('Error: ' + (e?.message || 'unknown')); }
            finally { setBriefLoading(false); }
          }}
        >
          <Sparkles size={13} color="#fff" />
          <Text style={s.briefCtaText}>{briefLoading ? 'Generating…' : 'Generate Brief'}</Text>
        </Pressable>
      </View>

      {/* LIVE-COUNTERS strip — refreshes every 15s to demo auto-refresh */}
      <LiveStrip accent="#22C55E" keys={['users', 'bookings', 'applications', 'workshops']} />

      {/* TIER BANNER — glowing badge + score + tier-driven suggestions */}
      {tier && (
        <View style={s.tierCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TierBadge tier={tier.tier} size="lg" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.tierKicker}>YOUR TIER · BASED ON COLLEGE • SKILLS • PROFILE</Text>
              <Text style={s.tierTitle}>
                {tier.tier} <Text style={s.tierScore}>· {tier.score}/100</Text>
              </Text>
            </View>
          </View>

          {/* Tier suggestions row (only skills the API suggested) */}
          {(tier.suggestions?.skills || []).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {(tier.suggestions?.skills || []).slice(0, 3).map((skill: string) => (
                <View key={skill} style={s.tierChip}>
                  <Sparkles size={10} color={tierGlow} />
                  <Text style={[s.tierChipText, { color: tierGlow }]}>{skill}</Text>
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
        {hasData && STUDENT.career.goal ? (
          <>
            <Text style={s.roadmapTitle}>You’re {STUDENT.career.progressPct}% toward your goal:</Text>
            <Text style={s.roadmapGoal}>{STUDENT.career.goal}</Text>
          </>
        ) : (
          <>
            <Text style={s.roadmapTitle}>No career goal set yet</Text>
            <Text style={s.emptyLine}>Set a goal in Career AI to track your progress here.</Text>
          </>
        )}

        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={s.progLabel}>Career Progress</Text>
            <Text style={s.progPct}>{STUDENT.career.progressPct}%</Text>
          </View>
          <View style={s.progTrack}>
            <LinearGradient
              colors={['#0A66C2', '#378FE9'] as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.progFill, { width: `${STUDENT.career.progressPct}%` as any }]}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          <Pressable
            style={({ hovered }: any) => [s.primaryCta, hovered && { backgroundColor: SC.primaryL }]}
            onPress={onOpenCareerAi || (() => toast.info('Career roadmap', 'Open the full career roadmap from the Career AI tab.'))}
          >
            <Text style={s.primaryCtaText}>View Full Roadmap →</Text>
          </Pressable>
          <Pressable
            style={({ hovered }: any) => [s.secCta, hovered && { backgroundColor: SC.cardH }]}
            onPress={onOpenInternships || (() => toast.info('Internships', 'Open Internships from the sidebar to browse roles.'))}
          >
            <Text style={s.secCtaText}>Browse Internships</Text>
          </Pressable>
        </View>
      </View>

      {/* 4 KPI tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {KPIS.map((k) => {
          const Icon = KPI_ICONS[k.id as keyof typeof KPI_ICONS];
          return <KpiCard key={k.id} Icon={Icon} label={k.label} value={k.value} delta={k.delta} color={k.color} />;
        })}
      </View>

      {/* Referral requests — alumni/mentors only */}
      {isReferralCapable && (
        <View style={s.referralCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 220 }}>
              <View style={s.referralIcon}><Users size={16} color={SC.accentBright} /></View>
              <View>
                <Text style={s.referralTitle}>Referral requests</Text>
                <Text style={s.referralSub}>
                  Students at your college can ask you to refer them for open roles.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={toggleOpenToReferrals}
              disabled={savingOpenFlag}
              style={({ hovered }: any) => [s.referralToggle, openToReferrals && { backgroundColor: SC.primary }, hovered && { opacity: 0.9 }, savingOpenFlag && { opacity: 0.6 }]}
            >
              <View style={[s.referralToggleKnob, openToReferrals && { transform: [{ translateX: 22 }] }]} />
              <Text style={[s.referralToggleLabel, openToReferrals && { color: '#fff' }]}>
                {savingOpenFlag ? 'Saving…' : openToReferrals ? 'Open to referrals' : 'Not accepting referrals'}
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 14, gap: 10 }}>
            {referralLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={SC.primary} />
                <Text style={s.emptyLine}>Loading referral requests</Text>
              </View>
            ) : referralRequests.length === 0 ? (
              <EmptyLine text="No referral requests yet. Students will see your profile on matching job cards." />
            ) : (
              referralRequests.slice(0, 5).map((r: any) => (
                <View key={r.id} style={s.referralRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={s.referralStudent}>
                      {r.student_name || r.student_id}
                      <Text style={s.referralMeta}>  ·  {r.job_title || 'role'} @ {r.job_company || 'company'}</Text>
                    </Text>
                    {r.note ? <Text numberOfLines={2} style={s.referralNote}>{r.note}</Text> : null}
                  </View>
                  {r.status === 'requested' ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => respondReferral(r.id, 'referred')}
                        style={({ hovered }: any) => [s.referralAccept, hovered && { backgroundColor: '#0A66C2' }]}
                      >
                        <Check size={11} color="#fff" />
                        <Text style={s.referralAcceptText}>Refer</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => respondReferral(r.id, 'accepted')}
                        style={({ hovered }: any) => [s.referralDecline, hovered && { opacity: 0.85 }]}
                      >
                        <Text style={s.referralDeclineText}>Accept</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => respondReferral(r.id, 'declined')}
                        style={({ hovered }: any) => [s.referralDecline, hovered && { opacity: 0.85 }]}
                      >
                        <Text style={s.referralDeclineText}>Decline</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Badge label={r.status.toUpperCase()} color={r.status === 'declined' ? 'red' : 'green'} />
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {/* Top Matches + Recommended Mentors */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Top Matches */}
        <View style={[s.col, { width: matchW as any, flex: stack ? undefined : 1.9 }]}>
          <View style={s.colHead}>
            <Text style={s.colTitle}>Top Matches for You</Text>
            <Pressable onPress={onOpenInternships}><Text style={s.seeAll}>See all →</Text></Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {TOP_MATCHES.length === 0 && <EmptyLine text="No matches yet. Complete your profile to get recommendations." />}
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
                  {typeof m.match === 'number' ? <View style={s.matchPill}><Text style={s.matchPillText}>{m.match}% match</Text></View> : null}
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
            <Pressable onPress={onOpenNetwork}><Text style={s.seeAll}>See all →</Text></Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {RECOMMENDED_MENTORS.length === 0 && <EmptyLine text="No mentor recommendations yet." />}
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
                <Pressable
                  onPress={() => router.push({
                    pathname: '/mentor/[id]',
                    params: {
                      id: m.id,
                      name: m.name,
                      title: m.role,
                      bio: (m.bio || '').slice(0, 200) + ((m.bio || '').length > 200 ? '...' : ''),
                      avatar: m.avatar || '',
                      rating: String(m.rating),
                      sessions: String(m.sessions),
                      tags: m.skills?.join(',') || '',
                    }
                  } as any)}
                  style={({ hovered }: any) => [s.bookCta, hovered && { backgroundColor: SC.primaryL }]}
                >
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
          <Pressable onPress={onOpenEvents}><Text style={s.seeAll}>See all →</Text></Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {UPCOMING_EVENTS.length === 0 && <EmptyLine text="No upcoming events." />}
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

      {/* Profile completion CTA (only once a real score is available) */}
      {hasData && (
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
            <Text style={s.completionTitle}>
              {PROFILE_COMPLETION.score >= 100 ? 'Your profile is complete' : 'Complete your profile to unlock more opportunities'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {PROFILE_COMPLETION.missing.map((m) => (
                <View key={m} style={s.missingChip}><Text style={s.missingText}>{m}</Text></View>
              ))}
            </View>
          </View>
          <Pressable onPress={onOpenProfile} style={({ hovered }: any) => [s.completeCta, hovered && { backgroundColor: '#fff' }]}>
            <Text style={s.completeCtaText}>{PROFILE_COMPLETION.score >= 100 ? 'View Profile →' : 'Complete Profile →'}</Text>
          </Pressable>
        </LinearGradient>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  /* Loading / empty / error states */
  skeleton:  { borderRadius: 14, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, minWidth: 120 },
  emptyLine: { color: SC.dim, fontFamily: FONTS.med, fontSize: 12 },
  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.08)' },
  errorText: { flex: 1, minWidth: 160, color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 12 },
  retryBtn:  { paddingHorizontal: 12, height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.45)', alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12 },

  briefRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 18,
  },
  briefIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(10,102,194,0.18)', alignItems: 'center', justifyContent: 'center' },
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
    backgroundColor: 'rgba(10,102,194,0.12)', borderColor: 'rgba(10,102,194,0.32)', borderWidth: 1,
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

  /* Referral requests (alumni/mentors) */
  referralCard: {
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14,
    padding: 18,
  },
  referralIcon: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  referralTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  referralSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 1 },
  referralToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, height: 30, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: SC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  referralToggleKnob: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff',
  },
  referralToggleLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  referralRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: SC.border, borderWidth: 1, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  referralStudent: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  referralMeta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  referralNote: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  referralAccept: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 10, height: 28, borderRadius: 8, backgroundColor: SC.primary,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  referralAcceptText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11 },
  referralDecline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 10, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: SC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  referralDeclineText: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 },
});
