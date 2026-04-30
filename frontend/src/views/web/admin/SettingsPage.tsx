/**
 * SettingsPage — admin users management.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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
        <View style={styles.head}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={styles.icon}><UserCog size={16} color={T.light} /></View>
            <View>
              <Text style={styles.title}>Admin Users</Text>
              <Text style={styles.sub}>People who can access this dashboard.</Text>
            </View>
          </View>
        </View>
        {loading && <View style={{ padding: 30, alignItems: 'center' }}><ActivityIndicator color={T.light} /></View>}
        {!loading && admins.length === 0 && (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Text style={{ color: T.textMute }}>No admin users yet.</Text>
          </View>
        )}
        {!loading && admins.map((a) => (
          <View key={a.id} style={styles.row}>
            <View style={styles.avatar}><ShieldCheck size={14} color={T.light} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>{a.name}</Text>
              <Text style={styles.email} numberOfLines={1}>{a.email}</Text>
            </View>
            <StatusChip label={a.role} tone="warn" />
            {a.two_fa_enabled ? <StatusChip label="2FA" tone="good" /> : <StatusChip label="No 2FA" tone="bad" />}
            <Text style={styles.date}>{new Date(a.created_at).toLocaleDateString()}</Text>
          </View>
        ))}
      </GlassCard>

      <GlassCard style={{ marginTop: 14 }}>
        <Text style={styles.title}>Roles & Permissions</Text>
        <Text style={styles.sub}>Coming soon — fine-grained role configuration.</Text>
      </GlassCard>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 15 },
  sub:   { color: T.textMute, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomColor: 'rgba(245,158,11,0.06)', borderBottomWidth: 1 },
  avatar: { width: 32, height: 32, borderRadius: 9, backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  name: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  email: { color: T.textMute, fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },
  date: { color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
});
