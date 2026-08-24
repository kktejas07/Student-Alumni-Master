/**
 * PaymentsPage — KPIs + Revenue/Payouts dual bar + Transactions table.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Wallet, ArrowDownRight, ArrowUpRight, Receipt } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { AdminLayout } from './AdminLayout';
import { GlassCard, KpiCard, StatusChip } from './primitives';
import { ADMIN_THEME as T } from './theme';

export default function PaymentsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try { setData(await request('/admin/payments')); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <AdminLayout title="Payments" subtitle="Transactions & payouts">
      <View style={{ alignItems: 'center', padding: 60 }}><ActivityIndicator color={T.light} /></View>
    </AdminLayout>
  );

  const k = data?.kpis || {};
  const months = data?.monthly || [];
  const max = Math.max(1, ...months.flatMap((m: any) => [m.revenue, m.payouts]));

  return (
    <AdminLayout title="Payments" subtitle="Transactions & payouts">
      <View style={styles.kpiGrid}>
        <KpiCard icon={Wallet}          label="Revenue (₹)"  value={`₹${k.revenue_total?.toLocaleString('en-IN')}`} note="+15%" noteUp />
        <KpiCard icon={ArrowDownRight}  label="Payouts (₹)"  value={`₹${k.payouts_total?.toLocaleString('en-IN')}`} note="+8%" noteUp />
        <KpiCard icon={ArrowUpRight}    label="Net (₹)"      value={`₹${k.net?.toLocaleString('en-IN')}`} note="+22%" noteUp />
        <KpiCard icon={Receipt}         label="Transactions" value={k.tx_count || 0} />
      </View>

      <GlassCard style={{ marginTop: 18 }}>
        <View style={styles.cardHead}>
          <View>
            <Text style={styles.cardTitle}>Revenue vs Payouts</Text>
            <Text style={styles.cardSub}>Last 6 months · Mocked until Stripe wires in</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, height: 160 }}>
          {months.map((m: any, i: number) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 130 }}>
                <View style={{ width: 14, height: (m.revenue / max) * 130, backgroundColor: T.mid, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                <View style={{ width: 14, height: (m.payouts / max) * 130, backgroundColor: T.accent + 'AA', borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
              </View>
              <Text style={styles.barLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
          <Legend color={T.mid} label="Revenue" />
          <Legend color={T.accent + 'AA'} label="Payouts" />
        </View>
      </GlassCard>

      <GlassCard style={{ marginTop: 18 }}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Recent Transactions</Text>
          <Text style={[styles.cardTitle, { color: T.light }]}>{(data?.transactions || []).length}</Text>
        </View>
        <View style={[styles.tableHead, { gridTemplateColumns: '1fr 2fr 1.5fr 1fr 1fr' } as any]}>
          <Text style={styles.th}>ID</Text><Text style={styles.th}>User</Text>
          <Text style={styles.th}>Type</Text><Text style={[styles.th, { textAlign: 'right' }]}>Amount</Text>
          <Text style={[styles.th, { textAlign: 'right' }]}>Status</Text>
        </View>
        {(data?.transactions || []).map((t: any) => (
          <View key={t.id} style={[styles.tableRow, { gridTemplateColumns: '1fr 2fr 1.5fr 1fr 1fr' } as any]}>
            <Text style={[styles.td, { color: T.light, fontFamily: 'DMSans_700Bold' }]}>{t.id}</Text>
            <Text style={styles.td} numberOfLines={1}>{t.user}</Text>
            <Text style={styles.td}>{t.kind}</Text>
            <Text style={[styles.td, { textAlign: 'right' }]}>₹{t.amount.toLocaleString('en-IN')}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <StatusChip label={t.status} tone={t.status === 'completed' ? 'good' : t.status === 'pending' ? 'warn' : 'bad'} />
            </View>
          </View>
        ))}
      </GlassCard>
    </AdminLayout>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: T.textDim, fontFamily: 'DMSans_500Medium', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { ...({ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 } as any) },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 14 },
  cardSub: { color: T.textMute, fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },
  barLabel: { color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 4 },
  tableHead: {
    paddingHorizontal: 4, paddingVertical: 10,
    borderBottomColor: T.border, borderBottomWidth: 1,
    ...({ display: 'grid', alignItems: 'center', gap: 12 } as any),
  },
  tableRow: {
    paddingHorizontal: 4, paddingVertical: 11,
    borderBottomColor: 'rgba(245,158,11,0.06)', borderBottomWidth: 1,
    ...({ display: 'grid', alignItems: 'center', gap: 12 } as any),
  },
  th: { color: 'rgba(255,255,255,0.32)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  td: { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
});
