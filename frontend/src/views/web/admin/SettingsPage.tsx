/**
 * SettingsPage — admin users management.
 */
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { ShieldCheck, UserCog } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { AdminLayout } from './AdminLayout';
import { GlassCard, StatusChip } from './primitives';
import { ADMIN_THEME as T } from './theme';

export default function SettingsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await request<{ items: any[] }>('/admin/settings/admins');
        setAdmins(r.items || []);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <AdminLayout title="Settings" subtitle="Admin users & permissions">
      <GlassCard>
        <View className="flex-row justify-between items-center" style={{ marginBottom: 14 }}>
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1 }}>
              <UserCog size={16} color={T.light} />
            </View>
            <View>
              <Text className="text-text font-body-bold text-base" style={{ fontSize: 15 }}>Admin Users</Text>
              <Text className="text-muted text-xs" style={{ marginTop: 4 }}>People who can access this dashboard.</Text>
            </View>
          </View>
        </View>
        {loading && <View className="items-center" style={{ padding: 30 }}><ActivityIndicator color={T.light} /></View>}
        {!loading && admins.length === 0 && (
          <View className="items-center" style={{ padding: 30 }}>
            <Text className="text-muted">No admin users yet.</Text>
          </View>
        )}
        {!loading && admins.map((a) => (
          <View key={a.id} className="flex-row items-center gap-3 py-3" style={{ borderBottomColor: 'rgba(245,158,11,0.06)', borderBottomWidth: 1 }}>
            <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1 }}>
              <ShieldCheck size={14} color={T.light} />
            </View>
            <View className="flex-1">
              <Text className="text-text font-body-bold text-sm" numberOfLines={1}>{a.name}</Text>
              <Text className="text-muted" style={{ fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 }} numberOfLines={1}>{a.email}</Text>
            </View>
            <StatusChip label={a.role} tone="warn" />
            {a.two_fa_enabled ? <StatusChip label="2FA" tone="good" /> : <StatusChip label="No 2FA" tone="bad" />}
            <Text className="text-muted" style={{ fontFamily: 'DMSans_500Medium', fontSize: 11.5 }}>{new Date(a.created_at).toLocaleDateString()}</Text>
          </View>
        ))}
      </GlassCard>

      <GlassCard style={{ marginTop: 14 }}>
        <Text className="text-text font-body-bold text-base" style={{ fontSize: 15 }}>Roles & Permissions</Text>
        <Text className="text-muted text-xs" style={{ marginTop: 4 }}>Coming soon — fine-grained role configuration.</Text>
      </GlassCard>
    </AdminLayout>
  );
}
