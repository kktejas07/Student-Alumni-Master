/**
 * College Admin Portal — Dashboard view (true RN port).
 *
 * Sections:
 *   • Hero greeting
 *   • 4 KPI tiles
 *   • AI Daily Briefing card (Powered by Claude)
 *   • Dept Placement Rates (left) + Upcoming Events (right)
 *   • Recent Activity (left) + Top Recruiters (right)
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GraduationCap, Users, Trophy, CalendarDays, Sparkles, ArrowRight,
  UserPlus, Calendar, Briefcase, Bell, TrendingUp, Building2, Plus,
} from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { Av, Badge, KpiCard } from '../atoms';
import * as MOCK from '../data';
import { usePortalData } from '@/src/lib/portalApi';
import { TierBadge } from '@/src/views/web/TierBadge';
import { LiveStrip } from '@/src/views/web/LiveStrip';

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

export function DashboardView() {
  const { data } = usePortalData<typeof COLLEGE_MOCK>('/admin/college-stats', COLLEGE_MOCK);
  const COLLEGE = data!.college;
  const KPIS = data!.kpis;
  const DEPT_PLACEMENT = data!.deptPlacement;
  const RECENT_ACTIVITY = data!.recentActivity;
  const UPCOMING_EVENTS = data!.upcomingEvents;
  const TOP_RECRUITERS = data!.topRecruiters;

  const { width } = useWindowDimensions();
  const stack = width < 1100;

  const [briefText, setBriefText] = React.useState<string>('');
  const [briefLoading, setBriefLoading] = React.useState<boolean>(false);

  return (
    <View style={{ gap: 16 }}>
      {/* Live counters */}
      <LiveStrip accent="#FCD34D" keys={['students', 'colleges', 'rsvps', 'events']} />

      {/* Hero */}
      <View style={{ flexDirection: stack ? 'column' : 'row', alignItems: stack ? 'flex-start' : 'center', gap: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.heroTitle}>Good morning, {COLLEGE.shortName} {COLLEGE.emoji}</Text>
          <Text style={s.heroSub}>{COLLEGE.placementRate}% placement rate · {COLLEGE.upcomingHighlight}</Text>
        </View>
        {/* TIER BANNER */}
        {(COLLEGE as any).tier && (
          <View style={s.tierBanner}>
            <TierBadge tier={(COLLEGE as any).tier.tier} size="lg" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.tierKicker}>INSTITUTIONAL TIER · NAAC {(COLLEGE as any).tier.naac}</Text>
              <Text style={s.tierTitle}>
                {(COLLEGE as any).tier.tier} <Text style={s.tierScore}>· {(COLLEGE as any).tier.score}/100</Text>
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 4 KPI tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {KPIS.map((k) => {
          const Icon = KPI_ICONS[k.id as keyof typeof KPI_ICONS];
          return <KpiCard key={k.id} Icon={Icon} label={k.label} value={k.value} delta={k.delta} color={k.color} />;
        })}
      </View>

      {/* AI Daily Briefing */}
      <View style={s.briefCard}>
        <View style={s.briefIcon}><Sparkles size={18} color="#FCD34D" /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={s.briefTitle}>AI Daily Briefing</Text>
            <Badge label="Powered by Claude" color="purple" />
          </View>
          <Text style={s.briefBody}>
            {briefText || (
              <>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold }}>Tap Generate AI Brief</Text> for a personalized summary on placement insights, alumni metrics and an action item for today.
              </>
            )}
          </Text>
        </View>
        <Pressable
          onPress={async () => {
            try {
              setBriefLoading(true);
              const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
              const r = await fetch(`${base}/api/ai/daily-brief`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'college' }),
              });
              const j = await r.json();
              setBriefText(j?.brief || 'Could not generate brief.');
            } catch (e: any) { setBriefText('Error: ' + (e?.message || 'unknown')); }
            finally { setBriefLoading(false); }
          }}
          disabled={briefLoading}
          style={({ hovered }: any) => [s.briefBtn, hovered && { backgroundColor: 'rgba(252,211,77,0.20)' }, briefLoading && { opacity: 0.6 }]}
        >
          <Sparkles size={12} color="#FCD34D" />
          <Text style={{ color: '#FCD34D', fontFamily: FONTS.xbold, fontSize: 11.5 }}>
            {briefLoading ? 'Generating…' : (briefText ? 'Regenerate' : 'Generate AI Brief')}
          </Text>
        </Pressable>
      </View>

      {/* Dept Placement + Upcoming Events */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Dept Placement rates */}
        <View style={[s.card, { flex: stack ? undefined : 1.7 }]}>
          <View style={s.cardHead}>
            <Text style={s.kicker}>DEPT. PLACEMENT RATES 2025–26</Text>
            <Pressable><Text style={s.linkRight}>Full report →</Text></Pressable>
          </View>
          <View style={{ gap: 14, marginTop: 14 }}>
            {DEPT_PLACEMENT.map((d) => (
              <View key={d.dept}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={s.deptName}>{d.dept}</Text>
                  <Text style={s.deptValue}>{d.pct}%   <Text style={s.deptCount}>({d.placed} placed)</Text></Text>
                </View>
                <View style={s.deptTrack}>
                  <LinearGradient
                    colors={[d.color, d.color + '80'] as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[s.deptFill, { width: `${d.pct}%` as any }]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming Events */}
        <View style={[s.card, { flex: stack ? undefined : 1 }]}>
          <View style={s.cardHead}>
            <Text style={s.kicker}>UPCOMING EVENTS</Text>
            <Pressable><Text style={s.linkRight}>See all →</Text></Pressable>
          </View>
          <View style={{ gap: 10, marginTop: 12 }}>
            {UPCOMING_EVENTS.map((e) => (
              <View key={e.id} style={s.eventRow}>
                <View style={[s.eventDate, { backgroundColor: e.color + '15', borderColor: e.color + '40' }]}>
                  <Text style={[s.eventDateNum, { color: e.color }]}>17</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={s.eventTitle}>{e.title}</Text>
                  <Text style={s.eventMeta}>{e.date} · {e.attending} attending</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable style={({ hovered }: any) => [s.createBtn, hovered && { backgroundColor: CC.primaryD }]}>
            <Plus size={14} color="#fff" />
            <Text style={s.createBtnText}>Create New Event</Text>
          </Pressable>
        </View>
      </View>

      {/* Recent Activity + Top Recruiters */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Recent Activity */}
        <View style={[s.card, { flex: stack ? undefined : 1.7 }]}>
          <View style={s.cardHead}>
            <Text style={s.kicker}>RECENT ACTIVITY</Text>
            <Pressable><Text style={s.linkRight}>View all →</Text></Pressable>
          </View>
          <View style={{ gap: 12, marginTop: 12 }}>
            {RECENT_ACTIVITY.map((a) => {
              const Icon = ACTIVITY_ICONS[a.icon] || Bell;
              return (
                <View key={a.id} style={s.activityRow}>
                  <View style={[s.activityIcon, { backgroundColor: a.tint + '20', borderColor: a.tint + '50' }]}>
                    <Icon size={14} color={a.tint} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.activityText}>{a.text}</Text>
                    <Text style={s.activityTime}>{a.time}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top Recruiters */}
        <View style={[s.card, { flex: stack ? undefined : 1 }]}>
          <View style={s.cardHead}>
            <Text style={s.kicker}>TOP RECRUITERS</Text>
            <Pressable><Text style={s.linkRight}>All →</Text></Pressable>
          </View>
          <View style={{ gap: 10, marginTop: 12 }}>
            {TOP_RECRUITERS.map((r) => (
              <View key={r.id} style={s.recruiterRow}>
                <View style={[s.recruiterLogo, { backgroundColor: r.color }]}>
                  <Text style={s.recruiterLogoText}>{r.name[0]}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={s.recruiterName}>{r.name}</Text>
                  <Text style={s.recruiterMeta}>{r.offers} offers · {r.ctc}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable style={({ hovered }: any) => [s.alumniCta, hovered && { backgroundColor: CC.cardH }]}>
            <Building2 size={13} color={CC.accentBright} />
            <Text style={s.alumniCtaText}>View Alumni Network</Text>
            <ArrowRight size={13} color={CC.accentBright} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  heroTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.5 },
  heroSub:   { color: CC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },

  tierBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(252,211,77,0.06)',
    borderColor: 'rgba(252,211,77,0.22)', borderWidth: 1, borderRadius: 14,
    padding: 14, minWidth: 280,
  },
  tierKicker: { color: '#FCD34D', fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 1 },
  tierTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.4, marginTop: 2 },
  tierScore: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 13 },

  briefCard: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: 'rgba(99,102,241,0.10)', borderColor: CC.border2, borderWidth: 1,
    borderRadius: 14, padding: 16,
  },
  briefIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(252,211,77,0.15)', borderColor: 'rgba(252,211,77,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  briefBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(252,211,77,0.10)',
    borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  briefTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  briefBody:  { color: CC.muted, fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 19 },

  card: {
    backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14,
    padding: 18,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker:   { color: CC.dim, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1 },
  linkRight:{ color: CC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 },

  deptName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  deptValue:{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  deptCount:{ color: CC.muted, fontFamily: FONTS.med, fontSize: 11 },
  deptTrack:{ height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  deptFill: { height: '100%', borderRadius: 3 },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventDate:{ width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eventDateNum: { fontFamily: FONTS.xbold, fontSize: 14 },
  eventTitle:{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  eventMeta: { color: CC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },

  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, height: 38, borderRadius: 10, backgroundColor: CC.primary, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  createBtnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },

  activityRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  activityIcon: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  activityText: { color: '#fff', fontFamily: FONTS.med, fontSize: 12.5 },
  activityTime: { color: CC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2 },

  recruiterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  recruiterLogo: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  recruiterLogoText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  recruiterName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  recruiterMeta: { color: CC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 1 },

  alumniCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, height: 36, borderRadius: 10, backgroundColor: CC.card, borderWidth: 1, borderColor: CC.border2, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  alumniCtaText: { color: CC.accentBright, fontFamily: FONTS.bold, fontSize: 12 },
});
