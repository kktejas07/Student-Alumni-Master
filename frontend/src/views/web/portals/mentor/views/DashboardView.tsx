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
import { View, Text, Pressable, Platform, useWindowDimensions, Linking, ActivityIndicator } from 'react-native';
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
      <View className="flex-1 p-[60px] items-center justify-center">
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
    <View className="flex-row gap-5" style={!isWide ? { flexDirection: 'column' } : undefined}>
      {/* Left column */}
      <View className="flex-1 min-w-0">
        {demoMode && (
          <View className="bg-amber/[0.08] border border-amber/30 rounded-xl py-2.5 px-4 items-center mb-4">
            <Text className="text-amber font-body-bold text-xs text-center">
              Demo Mode · Sample data is displayed for demonstration purposes.{' '}
              <Text 
                onPress={() => setDemoMode?.(false)}
                className="underline text-white font-body-bold"
              >
                Switch to Live Mode
              </Text>
            </Text>
          </View>
        )}
        <AdBanner />
        <CouponBanner portal="mentor" />
        <AIDailyBriefing onNav={onNav} demoMode={demoMode} />

        {tier?.tier && (
          <View className="flex-row items-center gap-3.5 bg-card border border-glass-border rounded-[14px] p-4 mb-4">
            <TierBadge tier={tier.tier} size="lg" />
            <View className="flex-1 min-w-0">
              <Text className="text-tealP font-display-bold text-[9.5px] tracking-[1px]">YOUR MENTOR TIER · BASED ON EXPERIENCE • COMPANY • SESSIONS • RATING</Text>
              <Text className="text-white font-display-bold text-[22px] tracking-[-0.4px] mt-0.5">
                {tier.tier} <Text className="text-muted font-body-bold text-sm">· {tier.score}/100</Text>
              </Text>
              <Text className="text-muted font-body-semibold text-xs mt-0.5">
                {tier.tier === 'Platinum' && 'Top 5% mentor — featured to Platinum students.'}
                {tier.tier === 'Gold' && 'Senior mentor — Gold-tier students will see you first.'}
                {tier.tier === 'Silver' && 'Active mentor — keep building sessions to reach Gold.'}
                {tier.tier === 'Bronze' && 'New mentor — complete more sessions to climb tiers.'}
              </Text>
            </View>
          </View>
        )}

        <View className="flex-row flex-wrap gap-3 mb-5">
          {STATS.map((stat, i) => (
            <View key={i} className="flex-1 min-w-[180px] bg-card border border-glass-border rounded-[14px] p-4">
              <View className="flex-row items-center gap-2 mb-2.5">
                <View className="w-[34px] h-[34px] rounded-[10px] bg-teal/[0.12] border border-glass-border items-center justify-center">
                  <stat.Icon size={17} color={MC.tealP} />
                </View>
                <Text className="text-muted font-body-semibold text-xs">{stat.label}</Text>
              </View>
              <Text className="text-white font-display-bold text-[26px] tracking-[-0.5px] mb-1">{stat.value}</Text>
              <Text className="text-[12px] font-body-bold" style={{ color: stat.subColor }}>{stat.sub}</Text>
            </View>
          ))}
        </View>

        <View className="bg-card border border-glass-border rounded-[14px] p-[18px]">
          <View className="flex-row justify-between items-center mb-3.5">
            <Text className="text-muted font-display-bold text-xs tracking-[1px]">TODAY SESSIONS</Text>
            <Pressable onPress={() => onNav('sessions')}><Text className="text-tealP font-body-bold text-xs">View all →</Text></Pressable>
          </View>
          <View className="gap-2">
            {TODAY_SESSIONS.length > 0 ? (
              TODAY_SESSIONS.map((sess, i) => (
                <View key={i} className="flex-row items-center gap-3 bg-teal/[0.05] border border-glass-border rounded-[11px] p-3">
                  <Av initials={sess.avatar} size={40} color={sess.color} />
                  <View className="flex-1 min-w-0">
                    <Text className="text-white font-body-bold text-[13px]">{sess.student}</Text>
                    <Text className="text-muted font-body-semibold text-[11px]">{sess.topic}</Text>
                  </View>
                  <View className="items-end mr-2.5">
                    <Text className="text-white font-body-bold text-[13px]">{sess.time}</Text>
                    <Text className="text-dim font-body-semibold text-[11px]">{sess.duration} min</Text>
                  </View>
                  <Pressable
                    onPress={() => Linking.openURL('https://meet.google.com/new')}
                    className="items-center justify-center rounded-[9px]"
                    style={({ hovered }: any) => ({
                      paddingHorizontal: 14, height: 32, backgroundColor: MC.tealP,
                      ...(hovered ? { backgroundColor: MC.tealD } : {}),
                    })}
                  >
                    <Text className="text-bg font-display-bold text-[11px]">Join →</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <View className="flex-row items-center justify-center py-5">
                <Text className="text-muted font-body-semibold text-[13px]">there were no sessions</Text>
              </View>
            )}
          </View>
        </View>

        <View className="bg-card border border-glass-border rounded-[14px] p-[18px] mt-4">
          <View className="flex-row justify-between items-center mb-3.5">
            <Text className="text-muted font-display-bold text-xs tracking-[1px]">MY CONNECTIONS</Text>
            <Pressable onPress={() => onNav('students')}>
              <Text className="text-tealP font-body-bold text-xs">View all {STUDENTS.length} →</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-2.5">
            {STUDENTS.slice(0, 3).map((stu) => (
              <View key={stu.id} className="flex-1 min-w-[180px] bg-teal/[0.05] border border-glass-border rounded-[11px] p-3">
                <View className="flex-row items-center gap-2 mb-2">
                  <Av initials={stu.avatar} size={34} color={stu.color} />
                  <View className="flex-1 min-w-0">
                    <Text numberOfLines={1} className="text-white font-body-bold text-xs">{stu.name}</Text>
                    <Text numberOfLines={1} className="text-dim font-body-semibold text-[10px]">{stu.college}</Text>
                  </View>
                </View>
                <View className="h-1 rounded-[2px] bg-white/[0.07] overflow-hidden mb-1">
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
                <Text className="text-dim font-body-semibold text-[10px]">
                  {stu.progress}% · {stu.sessionsCompleted}/{stu.sessionsTotal} sessions
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Right column */}
      <View className="w-[260px] gap-3" style={!isWide ? { width: '100%', marginTop: 16 } : undefined}>
        <LinearGradient
          colors={['#0D2E2A', '#0A3D35'] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          className="rounded-[14px] border border-glass-border p-4"
        >
          <Text className="text-muted font-display-bold text-[11px] tracking-[1px] mb-2.5">EARNINGS</Text>
          <Text className="text-white font-display-bold text-[28px] tracking-[-0.5px] mb-2">{demoMode ? (data?.kpis?.find((k: any) => k.id === 'earnings')?.value || '₹500') : '₹500'}</Text>
          <View className="h-[3px] rounded-[2px] bg-teal/[0.20] overflow-hidden mb-2">
            <LinearGradient colors={[MC.teal, MC.tealD] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: '100%', width: '100%', borderRadius: 2 }} />
          </View>
          <Text className="text-muted font-body-semibold text-xs mb-3">
            This month · <Text className="text-muted font-body-bold">0%</Text>
          </Text>
          <Pressable
            onPress={() => onNav('earnings')}
            className="items-center rounded-[10px] py-[11px] border border-tealP bg-transparent"
            style={({ hovered }: any) => hovered ? { backgroundColor: 'rgba(20,184,166,0.10)' } : undefined}
          >
            <Text className="text-tealP font-display-bold text-xs">
              Withdraw ₹500 →
            </Text>
          </Pressable>
        </LinearGradient>

        <View className="rounded-[14px] border border-glass-border bg-card p-4">
          <Text className="text-muted font-display-bold text-[11px] tracking-[1px] mb-2.5">FEEDBACK SUMMARY</Text>
          <View className="flex-row items-center gap-2.5 mb-3">
            <Text className="text-white font-display-bold text-[34px]">{demoMode ? (liveMentor?.rating || '0.0') : '—'}</Text>
            <View>
              <StarRow rating={demoMode ? Math.round(Number(liveMentor?.rating || 0)) : 0} size={14} />
              <Text className="text-muted font-body-semibold text-[11px] mt-[3px]">
                {demoMode ? (data?.kpis?.find((k: any) => k.id === 'rating')?.delta || '0 reviews') : 'No reviews yet'}
              </Text>
            </View>
          </View>
          {RATING_DIST.slice(0, 3).map((d) => (
            <View key={d.stars} className="flex-row items-center gap-2 mb-[5px]">
              <Text className="text-dim font-body-semibold text-[10px] w-[18px]">{d.stars}★</Text>
              <View className="flex-1 h-[5px] rounded-[3px] bg-white/[0.07] overflow-hidden">
                <LinearGradient colors={[MC.teal, MC.tealD] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ height: '100%', width: `${d.pct}%`, borderRadius: 3 }} />
              </View>
              <Text className="text-dim font-body-semibold text-[10px] w-3 text-right">{d.count}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => demoMode && onNav('feedback')}
            disabled={!demoMode}
            className="mt-2.5 items-center rounded-[9px] py-2 bg-surf border border-glass-border"
            style={({ hovered }: any) => ({
              ...(!demoMode ? { opacity: 0.5 } : {}),
              ...(demoMode && hovered ? { backgroundColor: 'rgba(20,184,166,0.12)', borderColor: MC.border2 } : {}),
            })}
          >
            <Text className="text-[12px] font-body-bold" style={{ color: demoMode ? MC.tealP : MC.muted }}>View all reviews →</Text>
          </Pressable>
        </View>

        <View className="rounded-[14px] border border-glass-border bg-card p-4">
          <Text className="text-muted font-display-bold text-[11px] tracking-[1px] mb-2.5">UPCOMING</Text>
          {upcoming.map((stu, i) => (
            <View key={stu.id} className="flex-row items-center gap-2 py-[7px]" style={i < upcoming.length - 1 ? { borderBottomWidth: 1, borderBottomColor: MC.border } : undefined}>
              <Av initials={stu.avatar} size={30} color={stu.color} />
              <View className="flex-1 min-w-0">
                <Text numberOfLines={1} className="text-white font-body-bold text-[11px]">{stu.name}</Text>
                <Text numberOfLines={1} className="text-dim font-body-semibold text-[10px]">
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
    <View className="rounded-[16px] border p-[18px] mb-4" style={{ backgroundColor: 'rgba(252,211,77,0.06)', borderColor: 'rgba(252,211,77,0.22)' }}>
      <View className="flex-row items-center gap-2.5 mb-2">
        <View className="w-7 h-7 rounded-[9px] items-center justify-center" style={{ backgroundColor: 'rgba(252,211,77,0.18)', borderColor: 'rgba(252,211,77,0.35)', borderWidth: 1 }}>
          <Sparkles size={16} color="#FCD34D" />
        </View>
        <Text className="text-amber font-display-bold text-[11px] tracking-[0.6px]">AI DAILY BRIEFING</Text>
        <View className="flex-1" />
        <View className="px-[7px] py-0.5 rounded-md border" style={{ backgroundColor: 'rgba(252,211,77,0.15)', borderColor: 'rgba(252,211,77,0.30)' }}>
          <Text className="text-amber font-display-bold text-[9px]">POWERED BY CLAUDE</Text>
        </View>
      </View>
      <Text className="text-white font-display-bold text-base leading-[22px] mb-2">
        {briefText ? 'Today\'s briefing' : (demoMode ? `Good morning, ${firstName} ✨` : 'AI Morning Summary')}
      </Text>
      <Text className="text-muted font-body-semibold text-[12.5px] leading-[18px] mb-3">
        {demoMode ? (
          briefText || (
            <>
              You have <Text className="text-tealP font-body-bold">3 sessions today</Text>{' '}
              starting at <Text className="text-tealP font-body-bold">10:00 AM</Text>.{' '}
              Tap <Text className="text-tealP font-body-bold">Generate AI Brief</Text> for a personalized morning summary based on your tier, sessions and rating.
            </>
          )
        ) : (
          'Welcome to your AI workspace! AI morning briefs will generate here once you have sessions scheduled. Keep your availability up-to-date to receive bookings.'
        )}
      </Text>
      <View className="flex-row gap-2 flex-wrap">
        <Pressable
          onPress={generate}
          disabled={briefLoading || !demoMode}
          className="flex-row items-center gap-1.5 px-[14px] h-9 rounded-[10px]"
          style={({ hovered }: any) => ({
            backgroundColor: '#FCD34D',
            cursor: 'pointer', transitionDuration: '160ms',
            ...(!demoMode ? { opacity: 0.5, cursor: 'default' } : {}),
            ...(demoMode && hovered ? { transform: [{ translateY: -1 }] } : {}),
            ...(briefLoading ? { opacity: 0.6 } : {}),
          } as any)}
        >
          <Sparkles size={12} color={MC.bg} />
          <Text className="text-bg font-display-bold text-[11.5px]">
            {briefLoading ? 'Generating…' : (briefText ? 'Regenerate Brief' : (demoMode ? 'Generate AI Brief' : 'Generate AI Brief (Requires active sessions)'))}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onNav('sessions')}
          className="flex-row items-center gap-1.5 px-[14px] h-9 rounded-[10px] border bg-teal/[0.07]"
          style={({ hovered }: any) => ({
            borderColor: MC.border2,
            cursor: 'pointer', transitionDuration: '160ms',
            ...(demoMode && hovered ? { borderColor: MC.tealP } : {}),
          })}
        >
          <Text className="text-tealP font-body-bold text-[11.5px]">View Today's Schedule</Text>
          <ChevronRight size={12} color={MC.tealP} />
        </Pressable>
      </View>
    </View>
  );
}
