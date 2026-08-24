/**
 * AnalyticsPage — career path + stream + mentor category breakdown + engagement.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { TrendingUp, Activity, Users, Clock } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { AdminLayout } from './AdminLayout';
import { GlassCard, KpiCard } from './primitives';
import { ADMIN_THEME as T } from './theme';

export default function AnalyticsPage() {
  const [d, setD] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try { setD(await request('/admin/analytics')); }
      finally { setLoading(false); }
    })();
  }, []);
  if (loading) return (
    <AdminLayout title="Analytics" subtitle="Engagement & growth">
      <View style={{ alignItems: 'center', padding: 60 }}><ActivityIndicator color={T.light} /></View>
    </AdminLayout>
  );
  const e = d?.engagement || {};
  return (
    <AdminLayout title="Analytics" subtitle="Engagement & growth">
      <View style={styles.kpiGrid}>
        <KpiCard icon={Activity} label="Session Completion" value={`${Math.round((e.session_completion || 0) * 100)}%`} note="+4%" noteUp />
        <KpiCard icon={Clock}    label="Avg Mentor Response" value={`${e.mentor_response_avg_hr || 0}h`} />
        <KpiCard icon={TrendingUp} label="Avg Placement"   value={`${Math.round((e.placement_avg || 0) * 100)}%`} note="+2%" noteUp />
        <KpiCard icon={Users}    label="DAU · MAU"           value={`${e.active_dau || 0} · ${e.active_mau || 0}`} />
      </View>

      <View style={styles.row2}>
        <Breakdown title="Career Paths" data={d.career_paths || []} />
        <Breakdown title="Top Streams" data={d.top_streams || []} />
      </View>
      <View style={[styles.row2, { marginTop: 18 }]}>
        <Breakdown title="Mentor Categories" data={d.mentor_categories || []} />
        <GlassCard>
          <Text style={styles.cardTitle}>Engagement Heatmap</Text>
          <Text style={styles.cardSub}>Coming soon — needs DAU time-series storage.</Text>
        </GlassCard>
      </View>
    </AdminLayout>
  );
}

function Breakdown({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <GlassCard>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>Total: {data.reduce((s, d) => s + d.value, 0)}</Text>
      <View style={{ marginTop: 14, gap: 10 }}>
        {data.map((d, i) => (
          <View key={i}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.barName} numberOfLines={1}>{d.label || 'Other'}</Text>
              <Text style={styles.barValue}>{d.value}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(d.value / max) * 100}%` as any }]} />
            </View>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { ...({ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 } as any) },
  row2: { ...({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 } as any) },
  cardTitle: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 14, letterSpacing: -0.2 },
  cardSub: { color: T.textMute, fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 4 },
  barName: { flex: 1, color: T.textDim, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  barValue: { color: T.light, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(245,158,11,0.08)' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: T.mid },
});
