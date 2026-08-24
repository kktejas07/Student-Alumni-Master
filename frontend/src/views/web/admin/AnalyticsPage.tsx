/**
 * AnalyticsPage — career path + stream + mentor category breakdown + engagement.
 */
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
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
      <View className="items-center" style={{ padding: 60 }}><ActivityIndicator color={T.light} /></View>
    </AdminLayout>
  );
  const e = d?.engagement || {};
  return (
    <AdminLayout title="Analytics" subtitle="Engagement & growth">
      <View className="flex-row flex-wrap gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } as any}>
        <KpiCard icon={Activity} label="Session Completion" value={`${Math.round((e.session_completion || 0) * 100)}%`} note="+4%" noteUp />
        <KpiCard icon={Clock}    label="Avg Mentor Response" value={`${e.mentor_response_avg_hr || 0}h`} />
        <KpiCard icon={TrendingUp} label="Avg Placement"   value={`${Math.round((e.placement_avg || 0) * 100)}%`} note="+2%" noteUp />
        <KpiCard icon={Users}    label="DAU · MAU"           value={`${e.active_dau || 0} · ${e.active_mau || 0}`} />
      </View>

      <View className="flex-row flex-wrap gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 18 } as any}>
        <Breakdown title="Career Paths" data={d.career_paths || []} />
        <Breakdown title="Top Streams" data={d.top_streams || []} />
      </View>
      <View className="flex-row flex-wrap gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 18 } as any}>
        <Breakdown title="Mentor Categories" data={d.mentor_categories || []} />
        <GlassCard>
          <Text className="text-text font-body-bold text-sm" style={{ letterSpacing: -0.2 }}>Engagement Heatmap</Text>
          <Text className="text-muted text-xs" style={{ marginTop: 4 }}>Coming soon — needs DAU time-series storage.</Text>
        </GlassCard>
      </View>
    </AdminLayout>
  );
}

function Breakdown({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <GlassCard>
      <Text className="text-text font-body-bold text-sm" style={{ letterSpacing: -0.2 }}>{title}</Text>
      <Text className="text-muted text-xs" style={{ marginTop: 4 }}>Total: {data.reduce((s, d) => s + d.value, 0)}</Text>
      <View style={{ marginTop: 14, gap: 10 }}>
        {data.map((d, i) => (
          <View key={i}>
            <View className="flex-row justify-between" style={{ marginBottom: 4 }}>
              <Text className="text-dim text-sm" style={{ flex: 1, fontFamily: 'DMSans_500Medium' }} numberOfLines={1}>{d.label || 'Other'}</Text>
              <Text style={{ color: T.light, fontFamily: 'DMSans_700Bold', fontSize: 12 }}>{d.value}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(245,158,11,0.08)' }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: T.mid, width: `${(d.value / max) * 100}%` as any }} />
            </View>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}
