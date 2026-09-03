import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Pressable } from 'react-native';
import { request } from '@/src/models/services/api';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { FontAwesome5 } from '@expo/vector-icons';

const POLL_MS = 5000;

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
    return <ActivityIndicator color="#8B5CF6" style={{ marginTop: 40 }} />;
  }
  if (!data) {
    return <Text style={{ color: 'white' }}>Failed to load orders.</Text>;
  }

  const pending = data.pending_orders || [];
  const fulfilled = data.fulfilled_orders || [];

  const renderOrder = (order: any, fulfilledOrder: boolean) => (
    <View key={order.order_id} style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{order.order_id?.substring(0, 8)}</Text>
        <View style={[styles.statusPill, fulfilledOrder ? styles.statusFulfilled : styles.statusPending]}>
          <Text style={[styles.statusText, { color: fulfilledOrder ? '#10B981' : '#F59E0B' }]}>
            {fulfilledOrder ? 'FULFILLED' : 'PENDING'}
          </Text>
        </View>
      </View>
      <Text style={styles.orderUser}>{order.user_name}</Text>
      <Text style={styles.orderTime}>{new Date(order.created_at).toLocaleString()}</Text>
      <View style={styles.divider} />
      {order.items.map((item: any, idx: number) => (
        <View key={idx} style={styles.itemRow}>
          <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
          <Text style={[styles.itemStatus, { color: item.fulfillment_status === 'FULFILLED' ? '#10B981' : '#F59E0B' }]}>
            {item.fulfillment_status || 'PENDING'}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
    >
      <View style={styles.topRow}>
        <Text style={styles.header}>Orders</Text>
        <Pressable onPress={() => fetchOrders(true)} style={styles.refreshBtn}>
          <FontAwesome5 name="sync-alt" size={13} color="#8B5CF6" />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>
      {lastUpdated && (
        <Text style={styles.meta}>
          Auto-updates every few seconds • Last updated {lastUpdated.toLocaleTimeString()}
        </Text>
      )}

      <Text style={styles.sectionHeader}>Pending ({pending.length})</Text>
      {pending.length === 0 ? (
        <Text style={{ color: '#9CA3AF', marginBottom: 24 }}>No pending orders. New orders appear here automatically.</Text>
      ) : (
        <View style={{ gap: 16, marginBottom: 24 }}>{pending.map((o: any) => renderOrder(o, false))}</View>
      )}

      <Text style={styles.sectionHeader}>Fulfilled ({fulfilled.length})</Text>
      {fulfilled.length === 0 ? (
        <Text style={{ color: '#9CA3AF' }}>No fulfilled orders yet.</Text>
      ) : (
        <View style={{ gap: 16 }}>{fulfilled.map((o: any) => renderOrder(o, true))}</View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  header: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.12)' },
  refreshText: { color: '#8B5CF6', fontWeight: '600', fontSize: 13 },
  meta: { color: '#6B7280', fontSize: 12, marginBottom: 24 },
  sectionHeader: { fontSize: 20, fontWeight: '600', color: '#FFF', marginBottom: 16 },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusFulfilled: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' },
  statusPending: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  orderUser: { color: '#D1D5DB', fontSize: 14 },
  orderTime: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { color: '#FFF', fontSize: 15 },
  itemStatus: { fontSize: 13, fontWeight: '600' },
});
