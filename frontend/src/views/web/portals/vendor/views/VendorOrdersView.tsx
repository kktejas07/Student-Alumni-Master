import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Pressable } from 'react-native';
import { request } from '@/src/models/services/api';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

const POLL_MS = 5000;

const COLORS = {
  bg: '#0A0A12',
  panel: 'rgba(255,255,255,0.03)',
  panelSolid: '#12121C',
  border: 'rgba(255,255,255,0.09)',
  violet: '#8B5CF6',
  violetLt: '#A78BFA',
  violetFaint: 'rgba(139,92,246,0.12)',
  text: '#FFFFFF',
  muted: '#9CA3AF',
  dim: '#55556B',
  ok: '#10B981',
  okFaint: 'rgba(16,185,129,0.12)',
  warn: '#F59E0B',
  warnFaint: 'rgba(245,158,11,0.12)',
};

export function VendorOrdersView() {
  const { token } = useVendorAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const res = await request<any>('/vendors/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) {
        setData(res);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('Failed to load vendor orders', e);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(() => fetchOrders(true), POLL_MS);
    return () => clearInterval(id);
  }, [fetchOrders]);

  const onRefresh = () => { setRefreshing(true); fetchOrders(true); };

  if (loading && !data) {
    return <ActivityIndicator color={COLORS.violet} style={{ marginTop: 40 }} />;
  }
  if (!data) {
    return <Text style={{ color: COLORS.text }}>Failed to load orders.</Text>;
  }

  const pending = data.pending_orders || [];
  const fulfilled = data.fulfilled_orders || [];
  const totalSales = data.total_sales ?? (data.stats?.total_sales ?? 0);
  const pendingCount = data.pending_count ?? (data.stats?.pending_items ?? pending.length);
  const fulfilledCount = data.fulfilled_count ?? (data.stats?.fulfilled_items ?? fulfilled.length);

  const StatChip = ({ label, value, color, tint }: { label: string; value: string | number; color: string; tint: string }) => (
    <View style={{ flex: 1, minWidth: 110, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: tint }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 11.5, fontWeight: '600', color: COLORS.muted, marginTop: 2, letterSpacing: .3 }}>{label}</Text>
    </View>
  );

  const renderOrder = (order: any, filled: boolean) => {
    const orderPendingCount = order.items.filter((i: any) => i.fulfillment_status !== 'FULFILLED').length;
    return (
      <View key={order.order_id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>#{order.order_id}</Text>
            <Text style={styles.orderUser}>{order.user_name || 'Customer'}</Text>
          </View>
          <View style={[styles.statusPill, filled ? styles.statusFulfilled : styles.statusPending]}>
            <Text style={[styles.statusText, { color: filled ? COLORS.ok : (orderPendingCount > 0 ? COLORS.warn : COLORS.ok) }]}>
              {filled ? 'FULFILLED' : 'PENDING'}
            </Text>
          </View>
        </View>

        <Text style={styles.orderTime}>{new Date(order.created_at).toLocaleString()}</Text>

        <View style={styles.divider} />

        {order.items.map((item: any, idx: number) => {
          const isFulfilled = item.fulfillment_status === 'FULFILLED';
          return (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FontAwesome5 name={isFulfilled ? 'check-circle' : 'clock'} size={13} color={isFulfilled ? COLORS.ok : COLORS.warn} />
                  <Text style={[styles.itemName, { numberOfLines: 1 } as any]}>{item.quantity}x {item.name || 'Item'}</Text>
                </View>
                {(item.stall_no || item.stall_location) && (
                  <Text style={styles.itemStall}>
                    {item.stall_no ? `Stall ${item.stall_no}` : ''}{item.stall_no && item.stall_location ? ' · ' : ''}{item.stall_location || ''} • ₹{item.price || 0}
                  </Text>
                )}
              </View>
              <Text style={[styles.itemStatus, { color: isFulfilled ? COLORS.ok : COLORS.warn }]}>
                {isFulfilled ? 'DONE' : 'PENDING'}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.violet} />}
    >
      <LinearGradient
        colors={[COLORS.violetFaint, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 18, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border }}
      >
        <Text style={styles.header}>Orders</Text>
        <Text style={styles.subheader}>Track and fulfill marketplace orders in real time</Text>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <StatChip label="Total Sales" value={`₹${totalSales.toLocaleString()}`} color={COLORS.violetLt} tint={COLORS.violetFaint} />
          <StatChip label="Pending Items" value={pendingCount} color={COLORS.warn} tint={COLORS.warnFaint} />
          <StatChip label="Fulfilled" value={fulfilledCount} color={COLORS.ok} tint={COLORS.okFaint} />
        </View>
      </LinearGradient>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionHeader}>Pending ({pending.length})</Text>
        <Pressable onPress={() => fetchOrders(true)} style={styles.refreshBtn}>
          <FontAwesome5 name="sync-alt" size={12} color={COLORS.violetLt} />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>
      {lastUpdated && (
        <Text style={styles.meta}>Auto-updates every few seconds • Updated {lastUpdated.toLocaleTimeString()}</Text>
      )}

      {pending.length === 0 ? (
        <View style={styles.emptyCard}>
          <FontAwesome5 name="inbox" size={26} color={COLORS.dim} />
          <Text style={styles.emptyText}>No pending orders. New orders appear here automatically.</Text>
        </View>
      ) : (
        <View style={{ gap: 14, marginBottom: 28 }}>{pending.map((o: any) => renderOrder(o, false))}</View>
      )}

      <Text style={styles.sectionHeader}>Fulfilled ({fulfilled.length})</Text>
      {fulfilled.length === 0 ? (
        <View style={styles.emptyCard}>
          <FontAwesome5 name="check-double" size={26} color={COLORS.dim} />
          <Text style={styles.emptyText}>No fulfilled orders yet.</Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>{fulfilled.map((o: any) => renderOrder(o, true))}</View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -.5 },
  subheader: { fontSize: 13.5, color: COLORS.muted, marginTop: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sectionHeader: { fontSize: 19, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.violetFaint },
  refreshText: { color: COLORS.violetLt, fontWeight: '600', fontSize: 12.5 },
  meta: { color: COLORS.dim, fontSize: 12, marginBottom: 16 },
  orderCard: {
    backgroundColor: COLORS.panelSolid,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 20,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  orderId: { color: COLORS.text, fontWeight: '800', fontSize: 16.5, letterSpacing: -.3, fontFamily: 'monospace' },
  orderUser: { color: COLORS.muted, fontSize: 13.5, marginTop: 3 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusFulfilled: { backgroundColor: COLORS.okFaint, borderColor: 'rgba(16,185,129,0.35)' },
  statusPending: { backgroundColor: COLORS.warnFaint, borderColor: 'rgba(245,158,11,0.35)' },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  orderTime: { color: COLORS.dim, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 14, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  itemName: { color: COLORS.text, fontSize: 14.5, fontWeight: '600', flexShrink: 1 },
  itemStall: { color: COLORS.dim, fontSize: 12, marginTop: 3 },
  itemStatus: { fontSize: 12, fontWeight: '700', marginLeft: 8 },
  emptyCard: { alignItems: 'center', gap: 10, padding: 28, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.panel, marginBottom: 24 },
  emptyText: { color: COLORS.muted, fontSize: 13.5, textAlign: 'center' },
});
