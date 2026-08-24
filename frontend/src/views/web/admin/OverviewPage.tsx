/**
 * Admin Overview — KPI grid + Top Colleges table + Monthly enrollments chart + Recent activity.
 */
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
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
        <View className="items-center" style={{ padding: 60 }}>
          <ActivityIndicator color={T.light} size="large" />
        </View>
      )}
      {!loading && data && (
        <>
          <View className="flex-row flex-wrap gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } as any}>
            <KpiCard icon={GraduationCap} label="Students"        value={k.students || 0}        note={'+12%'} noteUp />
            <KpiCard icon={Users}         label="Active Mentors"  value={k.mentors || 0}         note={'+5%'}  noteUp />
            <KpiCard icon={Briefcase}     label="Alumni"          value={k.alumni || 0}          note={'+9%'}  noteUp />
            <KpiCard icon={Building2}     label="Colleges"        value={k.colleges || 0} />
            <KpiCard icon={Calendar}      label="Events Hosted"   value={k.events || 0}          note={'+3%'} noteUp />
            <KpiCard icon={BarChart3}     label="Sessions"        value={k.sessions || 0}        note={'+18%'} noteUp />
            <KpiCard icon={ShieldCheck}   label="Pending Approvals" value={k.pending_approvals || 0} />
            <KpiCard icon={Wallet}        label="Revenue"           value={`₹${(k.revenue_inr || 0).toLocaleString('en-IN')}`} />
          </View>

          <View className="flex-row gap-3" style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '2fr 1fr', alignItems: 'start' } as any}>
            <GlassCard style={{ flex: 2, minWidth: 0 } as any}>
              <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
                <Text className="text-text font-body-bold text-sm" style={{ letterSpacing: -0.2 }}>Top Colleges</Text>
                <ActionButton label="View all" variant="ghost" />
              </View>
              <View className="flex-row items-center gap-3" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', paddingHorizontal: 4, paddingVertical: 10, borderBottomColor: T.border, borderBottomWidth: 1 } as any}>
                <Text style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>College</Text>
                <Text className="text-right" style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>Students</Text>
                <Text className="text-right" style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>Mentors</Text>
                <Text className="text-right" style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>Events</Text>
                <Text className="text-right" style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>Status</Text>
              </View>
              {(data.top_colleges || []).map((c: any, i: number) => (
                <View key={i} className="flex-row items-center gap-3" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', paddingHorizontal: 4, paddingVertical: 11, borderBottomColor: 'rgba(245,158,11,0.08)', borderBottomWidth: 1 } as any}>
                  <View className="flex-row items-center gap-3" style={{ minWidth: 0 }}>
                    <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: T.glassMd }}>
                      <Building2 size={14} color={T.light} />
                    </View>
                    <Text className="text-text font-body-semibold text-sm" style={{ flex: 1 }} numberOfLines={1}>{c.name}</Text>
                  </View>
                  <Text className="text-text text-sm text-right" style={{ fontFamily: 'DMSans_500Medium' }}>{c.students}</Text>
                  <Text className="text-text text-sm text-right" style={{ fontFamily: 'DMSans_500Medium' }}>{c.mentors}</Text>
                  <Text className="text-text text-sm text-right" style={{ fontFamily: 'DMSans_500Medium' }}>{c.events}</Text>
                  <View className="items-end"><StatusChip label="Active" tone="good" /></View>
                </View>
              ))}
            </GlassCard>

            <GlassCard style={{ flex: 1, minWidth: 0 } as any}>
              <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
                <Text className="text-text font-body-bold text-sm" style={{ letterSpacing: -0.2 }}>Recent Activity</Text>
              </View>
              {(data.recent_activity || []).slice(0, 6).map((a: any) => (
                <View key={a.id} className="flex-row items-start gap-3 py-2" style={{ borderBottomColor: 'rgba(245,158,11,0.06)', borderBottomWidth: 1 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.light, marginTop: 5 }} />
                  <Text style={{ flex: 1, color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 17 }} numberOfLines={2}>{a.label}</Text>
                </View>
              ))}
            </GlassCard>
          </View>

          <GlassCard style={{ marginTop: 18 }}>
            <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
              <View>
                <Text className="text-text font-body-bold text-sm" style={{ letterSpacing: -0.2 }}>Monthly Enrollments</Text>
                <Text className="text-muted text-xs" style={{ marginTop: 2 }}>Users joined per month (last 6)</Text>
              </View>
              <Text className="text-text font-body-bold text-sm" style={{ color: T.light }}>
                Total: {data.monthly_enrollments.reduce((s, m) => s + m.value, 0)}
              </Text>
            </View>
            <MiniBar data={data.monthly_enrollments.map(m => m.value)} height={120} />
            <View className="flex-row justify-between" style={{ marginTop: 6 }}>
              {data.monthly_enrollments.map((m, i) => (
                <Text key={i} className="text-muted text-xs" style={{ fontFamily: 'DMSans_500Medium', flex: 1, textAlign: 'center' }}>{m.label}</Text>
              ))}
            </View>
          </GlassCard>
        </>
      )}
    </AdminLayout>
  );
}
