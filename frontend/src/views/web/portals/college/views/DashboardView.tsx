import React from 'react';
import { View, Text, Pressable, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GraduationCap, Users, Trophy, CalendarDays, Sparkles, ArrowRight,
  UserPlus, Calendar, Briefcase, Bell, TrendingUp, Building2, Plus,
} from 'lucide-react-native';
import { CC } from '../tokens';
import { Av, Badge, KpiCard } from '../atoms';
import * as MOCK from '../data';
import { usePortalData } from '@/src/lib/portalApi';
import { TierBadge } from '@/src/views/web/TierBadge';

import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { request } from '@/src/models/services/api';
import type { CollegeNavId } from '../Sidebar';
import { AdBanner } from '@/src/views/web/components/AdBanner';
import { CouponBanner } from '@/src/views/web/components/CouponBanner';

const KPI_ICONS = { students: GraduationCap, alumni: Users, placement: Trophy, events: CalendarDays } as const;

const ACTIVITY_ICONS: Record<string, any> = {
  GraduationCap, UserPlus, Calendar, Briefcase, Bell, TrendingUp,
};

const COLLEGE_MOCK = {
  college: MOCK.COLLEGE,
  kpis: MOCK.KPIS,
  deptPlacement: MOCK.DEPT_PLACEMENT,
  recentActivity: MOCK.RECENT_ACTIVITY,
  upcomingEvents: MOCK.UPCOMING_EVENTS,
  topRecruiters: MOCK.TOP_RECRUITERS,
};

export function DashboardView({
  onOpenProfile,
  onNavigate,
}: {
  onOpenProfile?: () => void;
  onNavigate?: (id: CollegeNavId) => void;
}) {
  const user = useAuthStore((state) => state.user);
  const collegeName = (user as any)?.institution || user?.college_info?.institution_name || user?.school_info?.institution_name || '';

  const { data, loading } = usePortalData<typeof COLLEGE_MOCK>(
    collegeName
      ? `/admin/college-stats?college_name=${encodeURIComponent(collegeName)}`
      : '/admin/college-stats',
    COLLEGE_MOCK
  );

  const { width } = useWindowDimensions();
  const stack = width < 1100;

  const [briefText, setBriefText] = React.useState<string>('');
  const [briefLoading, setBriefLoading] = React.useState<boolean>(false);

  if (loading && data === COLLEGE_MOCK) {
    return (
      <View className="flex-1 justify-center items-center min-h-[400px]">
        <ActivityIndicator size="large" color="#FCD34D" />
      </View>
    );
  }

  const COLLEGE = data!.college;
  const KPIS = data!.kpis;
  const DEPT_PLACEMENT = data!.deptPlacement;
  const RECENT_ACTIVITY = data!.recentActivity;
  const UPCOMING_EVENTS = data!.upcomingEvents;
  const TOP_RECRUITERS = data!.topRecruiters;

  return (
    <View className="gap-4">
      <View className={stack ? 'flex-col gap-4' : 'flex-row items-center gap-4'}>
        <View className="flex-1 min-w-0">
          <Text className="text-text font-display-bold text-[22px] tracking-tight">Good morning, {(user?.full_name || 'Admin').split(' ')[0]} 👋</Text>
          <Text className="text-muted font-body text-[12.5px] mt-1">{COLLEGE.placementRate}% placement rate · {COLLEGE.upcomingHighlight}</Text>
        </View>
        {(COLLEGE as any).tier && (
          <View className="flex-row items-center gap-3 bg-[rgba(252,211,77,0.06)] border border-[rgba(252,211,77,0.22)] rounded-[14px] p-[14px] min-w-[280px]">
            <TierBadge tier={(COLLEGE as any).tier.tier} size="lg" />
            <View className="flex-1 min-w-0">
              <Text className="text-[#FCD34D] font-display-bold text-[9.5px] tracking-widest">INSTITUTIONAL TIER · NAAC {(COLLEGE as any).tier.naac}</Text>
              <Text className="text-text font-display-bold text-[18px] tracking-tight mt-[2px]">
                {(COLLEGE as any).tier.tier} <Text className="text-muted font-body-bold text-[13px]">· {(COLLEGE as any).tier.score}/100</Text>
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className="flex-row flex-wrap gap-3">
        {KPIS.map((k) => {
          const Icon = KPI_ICONS[k.id as keyof typeof KPI_ICONS];
          return <KpiCard key={k.id} Icon={Icon} label={k.label} value={k.value} delta={k.delta} color={k.color} />;
        })}
      </View>

      <AdBanner />

      <CouponBanner portal="college" />

      <View className="flex-row gap-[14px] items-start bg-[rgba(99,102,241,0.10)] border border-glass-border rounded-[14px] p-4">
        <View className="w-9 h-9 rounded-[10px] bg-[rgba(252,211,77,0.15)] border border-[rgba(252,211,77,0.30)] items-center justify-center">
          <Sparkles size={18} color="#FCD34D" />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-text font-display-bold text-[14px]">AI Daily Briefing</Text>
            <Badge label="Powered by Claude" color="purple" />
          </View>
          <Text className="text-muted font-body text-[12.5px] leading-[19px]">
            {briefText || (
              <>
                <Text className="text-text font-body-bold">Tap Generate AI Brief</Text> for a personalized summary on placement insights, alumni metrics and an action item for today.
              </>
            )}
          </Text>
        </View>
        <Pressable
          onPress={async () => {
            try {
              setBriefLoading(true);
              const j = await request<any>('/ai/daily-brief', {
                method: 'POST',
                body: { role: 'college' },
              });
              setBriefText(j?.brief || 'Could not generate brief.');
            } catch (e: any) { setBriefText('Error: ' + (e?.message || 'unknown')); }
            finally { setBriefLoading(false); }
          }}
          disabled={briefLoading}
          className={`flex-row items-center gap-[5px] px-3 h-8 rounded-lg bg-[rgba(252,211,77,0.10)] border border-[rgba(252,211,77,0.40)] ${briefLoading ? 'opacity-60' : ''}`}
          style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
          <Sparkles size={12} color="#FCD34D" />
          <Text className="text-[#FCD34D] font-display-bold text-[11.5px]">
            {briefLoading ? 'Generating…' : (briefText ? 'Regenerate' : 'Generate AI Brief')}
          </Text>
        </Pressable>
      </View>

      <View className={stack ? 'flex-col gap-4' : 'flex-row gap-4'}>
        <View className={`bg-glass-soft border border-glass-border rounded-[14px] p-[18px] ${stack ? '' : 'flex-[1.7]'}`}>
          <View className="flex-row items-center justify-between">
            <Text className="text-dim font-display-bold text-[10.5px] tracking-widest">DEPT. PLACEMENT RATES 2025–26</Text>
            <Pressable onPress={() => onNavigate?.('analytics')}><Text className="text-teal font-body-bold text-[11.5px]">Full report →</Text></Pressable>
          </View>
          <View className="gap-[14px] mt-[14px]">
            {DEPT_PLACEMENT.map((d) => (
              <View key={d.dept}>
                <View className="flex-row justify-between mb-[6px]">
                  <Text className="text-text font-body-bold text-[12.5px]">{d.dept}</Text>
                  <Text className="text-text font-display-bold text-[13px]">{d.pct}%   <Text className="text-muted font-body text-[11px]">({d.placed} placed)</Text></Text>
                </View>
                <View className="h-[5px] rounded-[3px] bg-[rgba(255,255,255,0.04)] overflow-hidden">
                  <LinearGradient
                    colors={[d.color, d.color + '80'] as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    className="h-full rounded-[3px]"
                    style={{ width: `${d.pct}%` as any }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className={`bg-glass-soft border border-glass-border rounded-[14px] p-[18px] ${stack ? '' : 'flex-1'}`}>
          <View className="flex-row items-center justify-between">
            <Text className="text-dim font-display-bold text-[10.5px] tracking-widest">UPCOMING EVENTS</Text>
            <Pressable onPress={() => onNavigate?.('events')}><Text className="text-teal font-body-bold text-[11.5px]">See all →</Text></Pressable>
          </View>
          <View className="gap-[10px] mt-3">
            {UPCOMING_EVENTS.map((e) => (
              <View key={e.id} className="flex-row items-center gap-[10px]">
                <View className="w-9 h-9 rounded-lg border items-center justify-center" style={{ backgroundColor: e.color + '15', borderColor: e.color + '40' }}>
                  <Text className="font-display-bold text-[14px]" style={{ color: e.color }}>17</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text numberOfLines={1} className="text-text font-body-bold text-[12.5px]">{e.title}</Text>
                  <Text className="text-muted font-body text-[11px] mt-[2px]">{e.date} · {e.attending} attending</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable onPress={() => onNavigate?.('create-event')}
            className="flex-row items-center justify-center gap-[6px] mt-[14px] h-[38px] rounded-[10px] bg-violet"
            style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}}>
            <Plus size={14} color="#fff" />
            <Text className="text-text font-display-bold text-[12.5px]">Create New Event</Text>
          </Pressable>
        </View>
      </View>

      <View className={stack ? 'flex-col gap-4' : 'flex-row gap-4'}>
        <View className={`bg-glass-soft border border-glass-border rounded-[14px] p-[18px] ${stack ? '' : 'flex-[1.7]'}`}>
          <View className="flex-row items-center justify-between">
            <Text className="text-dim font-display-bold text-[10.5px] tracking-widest">RECENT ACTIVITY</Text>
            <Pressable onPress={() => onNavigate?.('analytics')}><Text className="text-teal font-body-bold text-[11.5px]">View all →</Text></Pressable>
          </View>
          <View className="gap-3 mt-3">
            {RECENT_ACTIVITY.map((a) => {
              const Icon = ACTIVITY_ICONS[a.icon] || Bell;
              return (
                <View key={a.id} className="flex-row gap-[10px] items-center">
                  <View className="w-8 h-8 rounded-lg border items-center justify-center" style={{ backgroundColor: a.tint + '20', borderColor: a.tint + '50' }}>
                    <Icon size={14} color={a.tint} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-text font-body text-[12.5px]">{a.text}</Text>
                    <Text className="text-dim font-body text-[10.5px] mt-[2px]">{a.time}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View className={`bg-glass-soft border border-glass-border rounded-[14px] p-[18px] ${stack ? '' : 'flex-1'}`}>
          <View className="flex-row items-center justify-between">
            <Text className="text-dim font-display-bold text-[10.5px] tracking-widest">TOP RECRUITERS</Text>
            <Pressable onPress={() => onNavigate?.('placements')}><Text className="text-teal font-body-bold text-[11.5px]">All →</Text></Pressable>
          </View>
          <View className="gap-[10px] mt-3">
            {TOP_RECRUITERS.map((r) => (
              <View key={r.id} className="flex-row items-center gap-[10px] py-1">
                <View className="w-[30px] h-[30px] rounded-lg items-center justify-center" style={{ backgroundColor: r.color }}>
                  <Text className="text-text font-display-bold text-xs">{r.name[0]}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text numberOfLines={1} className="text-text font-body-bold text-[12.5px]">{r.name}</Text>
                  <Text className="text-muted font-body text-[10.5px] mt-[2px]">{r.offers} offers · {r.ctc}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable onPress={() => onNavigate?.('alumni')}
            className="flex-row items-center justify-center gap-[6px] mt-[14px] h-9 rounded-[10px] bg-glass-soft border border-glass-border"
            style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}}>
            <Building2 size={13} color={CC.accentBright} />
            <Text className="text-teal font-body-bold text-xs">View Alumni Network</Text>
            <ArrowRight size={13} color={CC.accentBright} />
          </Pressable>
        </View>
      </View>

      {COLLEGE.tier && (
        <LinearGradient
          colors={[CC.primary, CC.primaryD] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          className="flex-row items-center gap-4 rounded-[16px] p-[18px] mt-4">
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2 mb-[6px]">
              <Text className="text-[rgba(255,255,255,0.85)] font-display-bold text-[11.5px] tracking-wider">Profile Score</Text>
              <View className="bg-[rgba(255,255,255,0.15)] rounded-md px-2 py-[2px]">
                <Text className="text-text font-display-bold text-[11px]">{COLLEGE.tier.score}%</Text>
              </View>
            </View>
            <Text className="text-text font-body-bold text-[14px] mt-1">Complete your profile to unlock Platinum status</Text>
            <View className="flex-row flex-wrap gap-[6px] mt-2">
              {(!user?.college_info?.logo) && <View className="px-[10px] py-1 rounded-md bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.15)]"><Text className="text-text font-body-bold text-[10.5px]">Logo</Text></View>}
              {(!user?.college_info?.cover_photo) && <View className="px-[10px] py-1 rounded-md bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.15)]"><Text className="text-text font-body-bold text-[10.5px]">Cover Photo</Text></View>}
              {(!user?.college_info?.bio) && <View className="px-[10px] py-1 rounded-md bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.15)]"><Text className="text-text font-body-bold text-[10.5px]">Description / Bio</Text></View>}
              {(user?.college_info?.accreditations?.length || 0) === 0 && <View className="px-[10px] py-1 rounded-md bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.15)]"><Text className="text-text font-body-bold text-[10.5px]">Accreditations</Text></View>}
              {(!user?.college_info?.official_website) && <View className="px-[10px] py-1 rounded-md bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.15)]"><Text className="text-text font-body-bold text-[10.5px]">Official Website</Text></View>}
            </View>
          </View>
          <Pressable onPress={onOpenProfile}
            className="px-[18px] h-10 rounded-[10px] bg-[rgba(255,255,255,0.92)] items-center justify-center"
            style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}}>
            <Text className="text-violet font-display-bold text-[12.5px]">Complete Profile →</Text>
          </Pressable>
        </LinearGradient>
      )}
    </View>
  );
}
