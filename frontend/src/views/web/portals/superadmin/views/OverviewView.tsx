/**
 * Super Admin Portal — Overview/Dashboard view (true RN port).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import {
  Building2, GraduationCap, UserCheck, Users, CreditCard, Calendar,
  CheckCircle, BarChart3, Sparkles, AlertTriangle, FileText, Eye,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '../tokens';
import { Av, KpiCard } from '../atoms';
import * as MOCK from '../data';
import { usePortalData } from '@/src/lib/portalApi';
import { LiveStrip } from '@/src/views/web/LiveStrip';

const KPI_ICONS: Record<string, any> = {
  Building2, GraduationCap, UserCheck, Users, CreditCard, Calendar, CheckCircle, BarChart3,
};
const ACT_ICONS: Record<string, any> = {
  Building2, Sparkles, Users, CreditCard, AlertTriangle,
};

const SUPER_MOCK = {
  admin: MOCK.ADMIN,
  kpis: MOCK.KPIS,
  recentActivity: MOCK.RECENT_ACTIVITY,
  platformUsers: MOCK.PLATFORM_USERS,
  monthlyEnrollments: MOCK.MONTHLY_ENROLLMENTS,
  revenueBreakdown: MOCK.REVENUE_BREAKDOWN,
};

export function OverviewView() {
  const { data } = usePortalData<typeof SUPER_MOCK>('/admin/super-overview', SUPER_MOCK);
  const ADMIN = data!.admin;
  const KPIS = data!.kpis;
  const RECENT_ACTIVITY = data!.recentActivity;
  const PLATFORM_USERS = data!.platformUsers;
  const MONTHLY_ENROLLMENTS = data!.monthlyEnrollments;
  const REVENUE_BREAKDOWN = data!.revenueBreakdown;

  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const maxEnroll = Math.max(...MONTHLY_ENROLLMENTS.map((m) => m.value));

  return (
    <View style={{ gap: 16 }}>
      {/* Live counters */}
      <LiveStrip accent="#A78BFA" keys={['users', 'students', 'mentors', 'colleges', 'bookings']} />

      {/* Hero */}
      <View style={s.hero}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.heroKicker}>GOOD MORNING, ADMIN 👋</Text>
          <Text style={s.heroTitle}>Platform is healthy. 12 items need your attention.</Text>
        </View>
        <Pressable style={({ hovered }: any) => [s.heroPrimary, hovered && { backgroundColor: SAC.primaryD }]}>
          <CheckCircle size={14} color="#fff" />
          <Text style={s.heroPrimaryText}>Review Approvals</Text>
        </Pressable>
        <Pressable style={({ hovered }: any) => [s.heroSec, hovered && { backgroundColor: SAC.cardH }]}>
          <FileText size={14} color={SAC.muted} />
          <Text style={s.heroSecText}>Full Report</Text>
        </Pressable>
      </View>

      {/* 8 KPI tiles in 2 rows */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {KPIS.map((k) => {
          const Icon = KPI_ICONS[k.icon] || Building2;
          return <KpiCard key={k.id} Icon={Icon} label={k.label} value={k.value} delta={k.delta} />;
        })}
      </View>

      {/* Recent Activity + Platform Users */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Recent Activity */}
        <View style={[s.card, { flex: stack ? undefined : 1.7 }]}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Recent Activity</Text>
            <Pressable><Text style={s.linkRight}>View all →</Text></Pressable>
          </View>
          <View style={{ gap: 14, marginTop: 14 }}>
            {RECENT_ACTIVITY.map((a) => {
              const Icon = ACT_ICONS[a.icon] || Building2;
              return (
                <View key={a.id} style={s.activityRow}>
                  <View style={s.activityIcon}><Icon size={14} color={SAC.accent} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={s.activityText}>{a.text}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={s.activitySub}>{a.sub}</Text>
                      <Text style={s.activityDot}>·</Text>
                      <Text style={s.activityTime}>{a.time}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Platform Users distribution */}
        <View style={[s.card, { flex: stack ? undefined : 1 }]}>
          <Text style={s.cardTitle}>Platform Users</Text>
          <View style={{ gap: 14, marginTop: 14 }}>
            {PLATFORM_USERS.map((u) => (
              <View key={u.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={s.distLabel}>{u.label}</Text>
                  <Text style={s.distPct}>{u.pct}%</Text>
                </View>
                <View style={s.distTrack}>
                  <View style={[s.distFill, { width: `${u.pct}%` as any, backgroundColor: u.color }]} />
                </View>
                <Text style={s.distCount}>{u.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Monthly Enrollments + Revenue Breakdown */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Bar chart */}
        <View style={[s.card, { flex: stack ? undefined : 1.5 }]}>
          <Text style={s.cardTitle}>Monthly Enrollments</Text>
          <Text style={s.cardSub}>New students / month</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 130, marginTop: 22, paddingHorizontal: 4 }}>
            {MONTHLY_ENROLLMENTS.map((m, i) => {
              const isLast = i === MONTHLY_ENROLLMENTS.length - 1;
              const h = Math.round((m.value / maxEnroll) * 110);
              return (
                <View key={m.month} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={[s.barValue, { color: isLast ? SAC.accentBright : SAC.dim }]}>{(m.value / 1000).toFixed(1)}k</Text>
                  <LinearGradient
                    colors={[isLast ? SAC.accentBright : SAC.primary, isLast ? SAC.accent : SAC.primaryD] as any}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                    style={{ width: '100%', height: h, borderTopLeftRadius: 5, borderTopRightRadius: 5, opacity: isLast ? 1 : 0.7 }}
                  />
                  <Text style={[s.barMonth, isLast && { color: '#fff', fontFamily: FONTS.bold }]}>{m.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Revenue Breakdown */}
        <View style={[s.card, { flex: stack ? undefined : 1 }]}>
          <Text style={s.cardTitle}>Revenue Breakdown</Text>
          <Text style={s.cardSub}>This month · ₹28.4L total</Text>
          <View style={{ gap: 12, marginTop: 16 }}>
            {REVENUE_BREAKDOWN.map((r) => (
              <View key={r.source}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={s.distLabel}>{r.source}</Text>
                  <Text style={s.revAmount}>{r.amount}</Text>
                </View>
                <View style={s.distTrack}>
                  <View style={[s.distFill, { width: `${r.pct}%` as any, backgroundColor: r.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 22, paddingVertical: 18,
  },
  heroKicker: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1.2, marginBottom: 6 },
  heroTitle:  { color: '#fff', fontFamily: FONTS.xbold, fontSize: 19, letterSpacing: -0.4 },
  heroPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: SAC.primary, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  heroPrimaryText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  heroSec: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  heroSecText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },

  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15, letterSpacing: -0.2 },
  cardSub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },
  linkRight: { color: SAC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 },

  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.20)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  activityText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  activitySub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  activityDot: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11 },
  activityTime: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11 },

  distLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  distPct:   { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },
  distCount: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 5 },
  distTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  distFill:  { height: '100%', borderRadius: 3 },
  revAmount: { color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 12.5 },

  barValue: { fontFamily: FONTS.bold, fontSize: 10 },
  barMonth: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 },
});
