// @ts-nocheck
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
import { View, Text, Pressable, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles, Briefcase, BookOpen, Users, TrendingUp, Calendar, MapPin,
  Star, ArrowRight, Check, ExternalLink,
} from '../iconShims';
import { SC, FONTS } from '../tokens';
import { Av, Badge, KpiCard } from '../atoms';
import * as MOCK from '../../student/data';
import { usePortalData } from '@/src/lib/portalApi';
import { TierBadge } from '@/src/views/web/TierBadge';
import { LiveStrip } from '@/src/views/web/LiveStrip';
import { request } from '@/src/models/services/api';
import { AdBanner } from '@/src/views/web/components/AdBanner';
import { CouponBanner } from '@/src/views/web/components/CouponBanner';
import { useToast } from '@/src/views/components';

const KPI_ICONS = { matches: Briefcase, applications: Briefcase, courses: BookOpen, mentors: Users, score: TrendingUp, events: Calendar } as const;

const STUDENT_MOCK = {
  student: MOCK.STUDENT,
  kpis: MOCK.KPIS,
  topMatches: MOCK.TOP_MATCHES,
  recommendedMentors: MOCK.RECOMMENDED_MENTORS,
  upcomingEvents: MOCK.UPCOMING_EVENTS,
  profileCompletion: MOCK.PROFILE_COMPLETION,
};

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
  const { data } = usePortalData<typeof STUDENT_MOCK>('/student/dashboard', STUDENT_MOCK);
  const { data: live } = usePortalData<any>('/live/counters', null as any, 15_000);
  const STUDENT = data!.student;
  const KPIS = data!.kpis;
  const TOP_MATCHES = data!.topMatches;
  const RECOMMENDED_MENTORS = data!.recommendedMentors;
  const UPCOMING_EVENTS = data!.upcomingEvents;
  const PROFILE_COMPLETION = data!.profileCompletion;

  const [briefText, setBriefText] = React.useState<string>('');
  const [briefLoading, setBriefLoading] = React.useState<boolean>(false);

  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const matchW = stack ? '100%' : '64%';
  const mentorW = stack ? '100%' : '34%';

  return (
    <View className="gap-4">
      {/* Ad Banner */}
      <AdBanner />

      {/* Exclusive Coupons — below the ad banner */}
      <CouponBanner portal="alumni" />

      {/* AI Daily Brief banner */}
      <View className="flex-row items-center gap-3 bg-glass border border-glass-border rounded-[14px] py-3.5 px-[18px]">
        <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(10,102,194,0.18)' }}>
          <Sparkles size={18} color={SC.accentBright} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-white font-display-bold text-sm">AI Daily Brief</Text>
          <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 1 }}>{briefText || 'Your personalised morning summary'}</Text>
        </View>
        <Pressable
          style={({ hovered }: any) => [{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 10, backgroundColor: SC.primary, ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } : {}) }, hovered && { backgroundColor: SC.primaryL }, briefLoading && { opacity: 0.6 }]}
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
          <Text className="text-white font-display-bold text-xs">{briefLoading ? 'Generating…' : 'Generate Brief'}</Text>
        </Pressable>
      </View>

      {/* LIVE-COUNTERS strip */}
      <LiveStrip accent="#22C55E" keys={['users', 'bookings', 'applications', 'workshops']} />

      {/* TIER BANNER */}
      {STUDENT.tier && (
        <View className="bg-glass border border-glass-border rounded-[14px] p-[18px]">
          <View className="flex-row items-center gap-3.5">
            <TierBadge tier={STUDENT.tier.tier} size="lg" />
            <View className="flex-1 min-w-0">
              <Text style={{ color: SC.accent, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1 }}>YOUR TIER · BASED ON COLLEGE • SKILLS • PROFILE</Text>
              <Text className="text-white font-display-bold text-[22px] tracking-tight mt-0.5">
                {STUDENT.tier.tier} <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 14 }}>· {STUDENT.tier.score}/100</Text>
              </Text>
              <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>
                {STUDENT.tier.tier === 'Platinum' && 'You unlock FAANG, OpenAI & Stripe-level opportunities.'}
                {STUDENT.tier.tier === 'Gold' && 'Top Indian tech & senior roles are pinned for you.'}
                {STUDENT.tier.tier === 'Silver' && 'Solid foundation — keep building your stack to reach Gold.'}
                {STUDENT.tier.tier === 'Bronze' && 'Build your portfolio — first projects unlock Silver tier.'}
              </Text>
            </View>
          </View>

          {/* Tier suggestions row */}
          {STUDENT.tier.suggestions && (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {(STUDENT.tier.suggestions.skills || []).slice(0, 3).map((skill: string) => (
                <View key={skill} className="flex-row items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(10,102,194,0.12)', borderColor: 'rgba(10,102,194,0.32)', borderWidth: 1 }}>
                  <Sparkles size={10} color={STUDENT.tier.visuals?.glow || '#378FE9'} />
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: STUDENT.tier.visuals?.glow || '#378FE9' }}>{skill}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* AI Career Assistant Roadmap */}
      <View className="bg-glass border border-glass-border rounded-2xl p-[22px]">
        <View className="flex-row items-center gap-1.5 mb-3.5">
          <Sparkles size={13} color={SC.accent} />
          <Text style={{ color: SC.accent, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1 }}>AI CAREER ASSISTANT · PERSONALISED ROADMAP</Text>
        </View>
        <Text className="text-white font-display-bold text-[26px] tracking-tight">You're {STUDENT.career.progressPct}% toward your goal:</Text>
        <Text style={{ color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, marginTop: 4 }}>{STUDENT.career.goal}</Text>

        <View className="mt-3.5">
          <View className="flex-row justify-between mb-1.5">
            <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.2 }}>Career Progress</Text>
            <Text style={{ color: SC.accent, fontFamily: FONTS.xbold, fontSize: 12 }}>{STUDENT.career.progressPct}%</Text>
          </View>
          <View className="h-1.5 rounded bg-white/5 overflow-hidden">
            <LinearGradient
              colors={['#0A66C2', '#378FE9'] as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              className="h-full rounded"
              style={{ width: `${STUDENT.career.progressPct}%` }}
            />
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2.5 mt-4">
          <Pressable
            style={({ hovered }: any) => [{ paddingHorizontal: 16, height: 36, borderRadius: 10, backgroundColor: SC.primary, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } : {}) }, hovered && { backgroundColor: SC.primaryL }]}
            onPress={onOpenCareerAi || (() => toast.info('Career roadmap', 'Open the full career roadmap from the Career AI tab.'))}
          >
            <Text className="text-white font-display-bold text-[12.5px]">View Full Roadmap →</Text>
          </Pressable>
          <Pressable
            style={({ hovered }: any) => [{ paddingHorizontal: 16, height: 36, borderRadius: 10, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } : {}) }, hovered && { backgroundColor: SC.cardH }]}
            onPress={onOpenInternships || (() => toast.info('Internships', 'Open Internships from the sidebar to browse roles.'))}
          >
            <Text style={{ color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 12.5 }}>Browse Internships</Text>
          </Pressable>
        </View>
      </View>

      {/* 4 KPI tiles */}
      <View className="flex-row flex-wrap gap-3">
        {KPIS.map((k) => {
          const Icon = KPI_ICONS[k.id as keyof typeof KPI_ICONS];
          return <KpiCard key={k.id} Icon={Icon} label={k.label} value={k.value} delta={k.delta} color={k.color} />;
        })}
      </View>

      {/* Top Matches + Recommended Mentors */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Top Matches */}
        <View style={{ width: matchW as any, flex: stack ? undefined : 1.9 }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-display-bold text-base tracking-tight">Top Matches for You</Text>
            <Pressable onPress={onOpenInternships}><Text style={{ color: SC.accent, fontFamily: FONTS.bold, fontSize: 11.5 }}>See all →</Text></Pressable>
          </View>
          <View className="gap-2.5">
            {TOP_MATCHES.slice(0, 3).map((m) => (
              <Pressable key={m.id} style={({ hovered }: any) => [{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } : {}) }, hovered && { backgroundColor: SC.cardH }]}>
                <View className="w-[38px] h-[38px] rounded-[10px] items-center justify-center" style={{ backgroundColor: m.logoBg }}>
                  <Text className="text-white font-display-bold text-sm">{m.logo}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text numberOfLines={1} className="text-white font-body-bold text-[13.5px]">{m.role}</Text>
                  <View className="flex-row items-center gap-1.5 mt-0.5">
                    <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>{m.company}</Text>
                    <Text style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 11 }}>·</Text>
                    <MapPin size={10} color={SC.muted} />
                    <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>{m.location}</Text>
                  </View>
                </View>
                <View className="flex-row gap-1.5">
                  <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.30)', borderWidth: 1 }}>
                    <Text className="text-green-300 font-body-bold text-[11px]">✦ {m.match}% match</Text>
                  </View>
                  <Badge label={m.type} color="purple" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recommended Mentors */}
        <View style={{ width: mentorW as any, flex: stack ? undefined : 1 }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-display-bold text-base tracking-tight">Recommended Mentors</Text>
            <Pressable onPress={onOpenNetwork}><Text style={{ color: SC.accent, fontFamily: FONTS.bold, fontSize: 11.5 }}>See all →</Text></Pressable>
          </View>
          <View className="gap-2.5">
            {RECOMMENDED_MENTORS.slice(0, 2).map((m) => (
              <View key={m.id} className="bg-glass border border-glass-border rounded-xl p-3.5">
                <View className="flex-row items-center gap-2.5">
                  <Av initials={m.initials} size={42} color={m.color} />
                  <View className="flex-1 min-w-0">
                    <Text numberOfLines={1} className="text-white font-body-bold text-[13.5px]">{m.name}</Text>
                    <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 }}>{m.role} · {m.company}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-3.5 mt-2.5 justify-between">
                  <View className="flex-row items-center gap-1">
                    <Star size={11} color={SC.amber} fill={SC.amber} />
                    <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{m.rating}</Text>
                    <Calendar size={11} color={SC.muted} style={{ marginLeft: 6 }} />
                    <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{m.sessions} sessions</Text>
                  </View>
                  <Text style={{ color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 12 }}>₹{m.price}/session</Text>
                </View>
                <Pressable
                  onPress={() => router.push({
                    pathname: '/mentor/[id]',
                    params: {
                      id: m.id,
                      name: m.name,
                      title: m.role,
                      bio: (m.bio || 'Experienced professional ready to share industry insights, career strategies, and guidance.').slice(0, 200) + ((m.bio || '').length > 200 ? '...' : ''),
                      avatar: m.avatar || `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200`,
                      rating: String(m.rating),
                      sessions: String(m.sessions),
                      tags: m.skills?.join(',') || 'System Design,Career Strategy',
                    }
                  } as any)}
                  style={({ hovered }: any) => [{ flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, marginTop: 12, height: 34, borderRadius: 8, backgroundColor: SC.primary, ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } : {}) }, hovered && { backgroundColor: SC.primaryL }]}
                >
                  <Calendar size={12} color="#fff" />
                  <Text className="text-white font-display-bold text-xs">Book Session</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Upcoming Events */}
      <View>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white font-display-bold text-base tracking-tight">Upcoming Events</Text>
          <Pressable onPress={onOpenEvents}><Text style={{ color: SC.accent, fontFamily: FONTS.bold, fontSize: 11.5 }}>See all →</Text></Pressable>
        </View>
        <View className="flex-row flex-wrap gap-3">
          {UPCOMING_EVENTS.map((e) => (
            <Pressable key={e.id} style={({ hovered }: any) => [{ flex: 1, minWidth: 220, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12, padding: 14, ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } : {}) }, hovered && { backgroundColor: SC.cardH }]}>
              <View className="flex-row items-center justify-between mb-3.5">
                <View className="w-[30px] h-[30px] rounded-lg items-center justify-center border" style={{ backgroundColor: e.accent + '22', borderColor: e.accent + '40' }}>
                  <Calendar size={14} color={e.accent} />
                </View>
                <Badge label={e.kind === 'free' ? 'FREE' : `₹${e.price}`} color={e.kind === 'free' ? 'green' : 'amber'} />
              </View>
              <Text numberOfLines={2} className="text-white font-body-bold text-[13.5px] leading-[18px]">{e.title}</Text>
              <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 }}>{e.date} · {e.mode}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Profile completion CTA */}
      <LinearGradient
        colors={[SC.primary, SC.primaryD] as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        className="flex-row items-center gap-4 rounded-2xl p-[18px]"
      >
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 mb-1.5">
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.xbold, fontSize: 11.5, letterSpacing: 0.5 }}>Profile Score</Text>
            <View className="bg-white/15 rounded-md px-2 py-0.5">
              <Text className="text-white font-display-bold text-[11px]">{PROFILE_COMPLETION.score}%</Text>
            </View>
          </View>
          <Text className="text-white font-body-bold text-sm mt-1">Complete your profile to unlock more opportunities</Text>
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {PROFILE_COMPLETION.missing.map((m) => (
              <View key={m} className="bg-white/10 rounded-md px-2.5 py-1 border" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                <Text className="text-white font-body-bold text-[10.5px]">{m}</Text>
              </View>
            ))}
          </View>
        </View>
        <Pressable onPress={onOpenProfile} style={({ hovered }: any) => [{ paddingHorizontal: 18, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } : {}) }, hovered && { backgroundColor: '#fff' }]}>
          <Text style={{ color: SC.primaryD, fontFamily: FONTS.xbold, fontSize: 12.5 }}>Complete Profile →</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
