/**
 * Admin Approvals — pending mentor queue with approve/reject actions.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Check, X, Clock, Briefcase, Linkedin } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { AdminLayout } from './AdminLayout';
import { GlassCard, StatusChip, ActionButton } from './primitives';
import { ADMIN_THEME as T } from './theme';

type TabKey = 'pending' | 'approved' | 'rejected';
const TABS: { key: TabKey; label: string; tone: 'warn' | 'good' | 'bad' }[] = [
  { key: 'pending',  label: 'Pending',  tone: 'warn' },
  { key: 'approved', label: 'Approved', tone: 'good' },
  { key: 'rejected', label: 'Rejected', tone: 'bad'  },
];

export default function AdminApprovalsPage() {
  const [tab, setTab] = useState<TabKey>('pending');
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({ pending: 0, approved: 0, rejected: 0 };

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await request<{ items: any[]; counts: any }>(`/admin/approvals?status=${tab}`);
      setItems(r.items || []);
      setCounts(r.counts || {};

    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setWorking(id);
    try {
      await request(`/admin/mentors/${id}/${action}`, { method: 'POST' };

      await load();
    } finally { setWorking(null); }
  };

  return (
    <AdminLayout
      title="Approvals"
      subtitle="Mentor applications awaiting your review"
      pendingCount={counts.pending || 0}
    >
      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key] || 0;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              testID={`approvals-tab-${t.key}`}
              style={({ hovered }: any) => [
                styles.tab, active && styles.tabActive,
                hovered && !active && { backgroundColor: 'rgba(245,158,11,0.06)' },
              ]}
            >
              <Text style={[styles.tabText, active && { color: T.text }]}>{t.label}</Text>
              <View style={[styles.tabCount, active && { backgroundColor: T.accent }]}>
                <Text style={[styles.tabCountText, active && { color: T.text }]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {loading && (
        <View style={{ alignItems: 'center', padding: 60 }}>
          <ActivityIndicator color={T.light} size="large" />
        </View>
      )}

      {!loading && items.length === 0 && (
        <GlassCard style={{ alignItems: 'center', padding: 40 }}>
          <Clock size={36} color={T.textMute} />
          <Text style={[styles.emptyText, { marginTop: 14 }]}>No {tab} requests at the moment.</Text>
        </GlassCard>
      )}

      {!loading && items.map((m) => (
        <GlassCard key={m.id} style={{ marginBottom: 14 }}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <View style={styles.avatar}><Briefcase size={16} color={T.light} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.email} numberOfLines={1}>{m.email}</Text>
                </View>
                {m.priority === 'high' && <StatusChip label="High Priority" tone="warn" />}
              </View>
              <View style={styles.metaRow}>
                {!!m.title && <Text style={styles.meta}>💼 {m.title}</Text>}
                {!!m.organization && <Text style={styles.meta}>🏢 {m.organization}</Text>}
                {!!m.category && <Text style={styles.meta}>🏷️ {m.category.replace(/_/g, ' ')}</Text>}
                {m.years_of_experience != null && <Text style={styles.meta}>⏱ {m.years_of_experience} yrs exp</Text>}
                {!!m.linkedin_url && (
                  <Pressable onPress={() => Linking.openURL(m.linkedin_url)}>
                    <View style={[styles.meta, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Linkedin size={11} color={T.light} />
                      <Text style={[styles.metaLink]}>LinkedIn</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            </View>
            {tab === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <ActionButton
                  label={working === m.id ? 'Working…' : 'Approve'}
                  icon={Check}
                  onPress={() => act(m.id, 'approve')}
                  testID={`approve-${m.id}`}
                />
                <ActionButton
                  label="Reject"
                  variant="danger"
                  icon={X}
                  onPress={() => act(m.id, 'reject')}
                  testID={`reject-${m.id}`}
                />
              </View>
            )}
            {tab !== 'pending' && (
              <StatusChip label={tab === 'approved' ? 'Approved' : 'Rejected'} tone={tab === 'approved' ? 'good' : 'bad'} />
            )}
          </View>
        </GlassCard>
      ))}
    </AdminLayout>
  );
}

const styles = {
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: T.glass, borderColor: T.border, borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  tabActive: { backgroundColor: T.glassMd, borderColor: T.borderMd },
  tabText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  tabCount: { minWidth: 22, paddingHorizontal: 6, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  tabCountText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 11 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  name: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 14 },
  email: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
  meta: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_500Medium', fontSize: 12 },
  metaLink: { color: T.light, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  emptyText: { color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 13 },
};
