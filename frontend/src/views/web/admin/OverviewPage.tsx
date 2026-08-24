/**
 * Admin Overview — KPI grid + Top Colleges table + Monthly enrollments chart + Recent activity.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  GraduationCap, Users, Briefcase, Building2, Calendar,
  Wallet, ShieldCheck, BarChart3,
} from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { AdminLayout } from './AdminLayout';
import { GlassCard, KpiCard, MiniBar, StatusChip, ActionButton } from './primitives';
import { ADMIN_THEME as T } from './theme';

interface OverviewData {
  kpis: any;
  top_colleges: any[];
  recent_activity: any[];
  monthly_enrollments: { label: string; value: number }[];
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await request<OverviewData>('/admin/overview');
        setData(res);
      } finally { setLoading(false); }
    })();
  }, []);

  const k = data?.kpis || {};
  return (
    <AdminLayout title="Overview" subtitle="Platform health at a glance" pendingCount={k.pending_approvals || 0}>
      {loading && (
        <View style={{ alignItems: 'center', padding: 60 }}>
          <ActivityIndicator color={T.light} size="large" />
        </View>
      )}
      {!loading && data && (
        <>
          <View style={styles.kpiGrid}>
            <KpiCard icon={GraduationCap} label="Students"        value={k.students || 0}        note={'+12%'} noteUp />
            <KpiCard icon={Users}         label="Active Mentors"  value={k.mentors || 0}         note={'+5%'}  noteUp />
            <KpiCard icon={Briefcase}     label="Alumni"          value={k.alumni || 0}          note={'+9%'}  noteUp />
            <KpiCard icon={Building2}     label="Colleges"        value={k.colleges || 0} />
            <KpiCard icon={Calendar}      label="Events Hosted"   value={k.events || 0}          note={'+3%'} noteUp />
            <KpiCard icon={BarChart3}     label="Sessions"        value={k.sessions || 0}        note={'+18%'} noteUp />
            <KpiCard icon={ShieldCheck}   label="Pending Approvals" value={k.pending_approvals || 0} />
            <KpiCard icon={Wallet}        label="Revenue"           value={`₹${(k.revenue_inr || 0).toLocaleString('en-IN')}`} />
          </View>

          <View style={styles.row2}>
            {/* Top Colleges */}
            <GlassCard style={{ flex: 2, minWidth: 0 } as any}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Top Colleges</Text>
                <ActionButton label="View all" variant="ghost" />
              </View>
              <View style={[styles.tableHead, { gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' } as any]}>
                <Text style={styles.th}>College</Text>
                <Text style={[styles.th, styles.cellRight]}>Students</Text>
                <Text style={[styles.th, styles.cellRight]}>Mentors</Text>
                <Text style={[styles.th, styles.cellRight]}>Events</Text>
                <Text style={[styles.th, styles.cellRight]}>Status</Text>
              </View>
              {(data.top_colleges || []).map((c: any, i: number) => (
                <View key={i} style={[styles.tableRow, { gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' } as any]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <View style={styles.collegeIcon}><Building2 size={14} color={T.light} /></View>
                    <Text style={styles.collegeName} numberOfLines={1}>{c.name}</Text>
                  </View>
                  <Text style={[styles.td, styles.cellRight]}>{c.students}</Text>
                  <Text style={[styles.td, styles.cellRight]}>{c.mentors}</Text>
                  <Text style={[styles.td, styles.cellRight]}>{c.events}</Text>
                  <View style={{ alignItems: 'flex-end' }}><StatusChip label="Active" tone="good" /></View>
                </View>
              ))}
            </GlassCard>

            {/* Recent Activity */}
            <GlassCard style={{ flex: 1, minWidth: 0 } as any}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Recent Activity</Text>
              </View>
              {(data.recent_activity || []).slice(0, 6).map((a: any) => (
                <View key={a.id} style={styles.activityRow}>
                  <View style={styles.activityDot} />
                  <Text style={styles.activityText} numberOfLines={2}>{a.label}</Text>
                </View>
              ))}
            </GlassCard>
          </View>

          <GlassCard style={{ marginTop: 18 }}>
            <View style={styles.cardHead}>
              <View>
                <Text style={styles.cardTitle}>Monthly Enrollments</Text>
                <Text style={styles.cardSub}>Users joined per month (last 6)</Text>
              </View>
              <Text style={[styles.cardTitle, { color: T.light }]}>
                Total: {data.monthly_enrollments.reduce((s, m) => s + m.value, 0)}
              </Text>
            </View>
            <MiniBar data={data.monthly_enrollments.map(m => m.value)} height={120} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              {data.monthly_enrollments.map((m, i) => (
                <Text key={i} style={styles.barLabel}>{m.label}</Text>
              ))}
            </View>
          </GlassCard>
        </>
      )}
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    ...({ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } as any),
  },
  row2: {
    flexDirection: 'row', gap: 14, marginTop: 18,
    ...({ display: 'grid', gridTemplateColumns: '2fr 1fr', alignItems: 'start' } as any),
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 14, letterSpacing: -0.2 },
  cardSub: { color: T.textMute, fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },

  tableHead: {
    paddingHorizontal: 4, paddingVertical: 10,
    borderBottomColor: T.border, borderBottomWidth: 1,
    ...({ display: 'grid', alignItems: 'center', gap: 12 } as any),
  },
  tableRow: {
    paddingHorizontal: 4, paddingVertical: 11,
    borderBottomColor: 'rgba(245,158,11,0.08)', borderBottomWidth: 1,
    ...({ display: 'grid', alignItems: 'center', gap: 12 } as any),
  },
  th: { color: 'rgba(255,255,255,0.32)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  td: { color: T.text, fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
  cellRight: { textAlign: 'right' },
  collegeIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: T.glassMd, alignItems: 'center', justifyContent: 'center' },
  collegeName: { flex: 1, color: T.text, fontFamily: 'DMSans_600SemiBold', fontSize: 13 },

  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomColor: 'rgba(245,158,11,0.06)', borderBottomWidth: 1 },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.light, marginTop: 5 },
  activityText: { flex: 1, color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 17 },

  barLabel: { color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_500Medium', fontSize: 10, flex: 1, textAlign: 'center' },
});
