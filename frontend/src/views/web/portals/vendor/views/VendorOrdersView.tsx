import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Pressable, Platform, TextInput, Modal } from 'react-native';
import { request } from '@/src/models/services/api';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

const POLL_MS = 5000;

const COLORS = {
  bg: '#0A0A12',
  panel: 'rgba(255,255,255,0.03)',
  panelSolid: '#12121C',
  panelAlt: '#16162A',
  border: 'rgba(255,255,255,0.09)',
  borderLight: 'rgba(255,255,255,0.05)',
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
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'fulfilled'>('pending');
  const [refundModal, setRefundModal] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('Item sold out');
  const [refunding, setRefunding] = useState(false);

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

  const orders = activeTab === 'pending' ? pending : fulfilled;

  const StatChip = ({ label, value, color, tint }: { label: string; value: string | number; color: string; tint: string }) => (
    <View style={{ flex: 1, minWidth: 100, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: tint }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.muted, marginTop: 2, letterSpacing: .3 }}>{label}</Text>
    </View>
  );

  const formatItems = (items: any[]) => {
    return items.map((it: any) => `${it.quantity}x ${it.name || 'Item'}`).join(', ');
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(prev => prev === orderId ? null : orderId);
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
        style={{ borderRadius: 16, padding: 20, marginBottom: 18, borderWidth: 1, borderColor: COLORS.border }}
      >
        <Text style={styles.header}>Orders</Text>
        <Text style={styles.subheader}>Track and fulfill marketplace orders</Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <StatChip label="Sales" value={`₹${totalSales.toLocaleString()}`} color={COLORS.violetLt} tint={COLORS.violetFaint} />
          <StatChip label="Pending" value={pendingCount} color={COLORS.warn} tint={COLORS.warnFaint} />
          <StatChip label="Done" value={fulfilledCount} color={COLORS.ok} tint={COLORS.okFaint} />
        </View>

        {/* How it works */}
        <View style={{ marginTop: 14, padding: 10, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' }}>
          <Text style={{ color: COLORS.violetLt, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>📋 How Order Status Works</Text>
          <Text style={{ color: COLORS.muted, fontSize: 10.5, lineHeight: 16 }}>
            1. Click an order to expand details. {"\n"}
            2. Update status: <Text style={{ color: '#10B981', fontWeight: '600' }}>Confirm</Text> → <Text style={{ color: '#F59E0B', fontWeight: '600' }}>Preparing</Text> → <Text style={{ color: '#3B82F6', fontWeight: '600' }}>Out for Delivery</Text> → <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>Delivered</Text>. {"\n"}
            3. Customer receives email notification at each step. {"\n"}
            4. For "Deliver to Table" orders, check the table/team name in delivery info.
          </Text>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('pending')}
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
        >
          <FontAwesome5 name="clock" size={13} color={activeTab === 'pending' ? COLORS.warn : COLORS.muted} />
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>Pending ({pending.length})</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('fulfilled')}
          style={[styles.tab, activeTab === 'fulfilled' && styles.tabActive]}
        >
          <FontAwesome5 name="check-double" size={13} color={activeTab === 'fulfilled' ? COLORS.ok : COLORS.muted} />
          <Text style={[styles.tabText, activeTab === 'fulfilled' && styles.tabTextActive]}>Fulfilled ({fulfilled.length})</Text>
        </Pressable>
      </View>

      {lastUpdated && (
        <Text style={styles.meta}>Auto-refreshes every 5s · Updated {lastUpdated.toLocaleTimeString()}</Text>
      )}

      {/* Table */}
      {orders.length === 0 ? (
        <View style={styles.emptyCard}>
          <FontAwesome5 name={activeTab === 'pending' ? 'inbox' : 'check-double'} size={26} color={COLORS.dim} />
          <Text style={styles.emptyText}>
            {activeTab === 'pending' ? 'No pending orders. New orders appear here automatically.' : 'No fulfilled orders yet.'}
          </Text>
        </View>
      ) : (
        <View style={styles.tableWrap}>
          {/* Table header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.th, { width: 90 }]}>Order</Text>
            <Text style={[styles.th, { flex: 1 }]}>Customer</Text>
            <Text style={[styles.th, { flex: 1.5 }]} numberOfLines={1}>Items</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>Status</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>Time</Text>
          </View>

          {orders.map((order: any) => {
            const isExpanded = expandedOrder === order.order_id;
            const vendorItems = order.items || [];
            const pendingItems = vendorItems.filter((i: any) => i.fulfillment_status !== 'FULFILLED');
            const fulfilledItems = vendorItems.filter((i: any) => i.fulfillment_status === 'FULFILLED');
            const allFulfilled = pendingItems.length === 0;

            return (
              <View key={order.order_id}>
                <Pressable
                  onPress={() => toggleExpand(order.order_id)}
                  style={[styles.tableRow, isExpanded && styles.tableRowExpanded]}
                >
                  <View style={{ width: 90 }}>
                    <Text style={styles.cellId} numberOfLines={1}>#{order.order_id}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cellName} numberOfLines={1}>{order.user_name || 'Guest'}</Text>
                    {order.delivery_method === 'delivery' && order.delivery_info && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <FontAwesome5 name="truck" size={9} color="#10B981" />
                        <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '600' }} numberOfLines={1}>Deliver: {order.delivery_info}</Text>
                      </View>
                    )}
                    {order.delivery_method === 'pickup' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <FontAwesome5 name="hand-paper" size={9} color={COLORS.muted} />
                        <Text style={{ fontSize: 10, color: COLORS.dim, fontWeight: '500' }}>Self Pickup</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1.5, minWidth: 0 }}>
                    <Text style={styles.cellItems} numberOfLines={isExpanded ? 4 : 1}>{formatItems(vendorItems)}</Text>
                    <Text style={styles.cellSub}>{vendorItems.length} item{vendorItems.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={{ width: 80, alignItems: 'center' }}>
                    <View style={[styles.statusDot, { backgroundColor: allFulfilled ? COLORS.ok : COLORS.warn }]}>
                      <Text style={styles.statusDotText}>{allFulfilled ? 'DONE' : `${pendingItems.length} PEND`}</Text>
                    </View>
                  </View>
                  <View style={{ width: 80, alignItems: 'flex-end' }}>
                    <Text style={styles.cellTime}>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                    </Text>
                    <Text style={styles.cellTimeSub}>
                      {order.created_at ? new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                </Pressable>

                {/* Expanded detail */}
                {isExpanded && (
                  <View style={styles.expandedDetail}>
                    <View style={styles.detailRow}>
                      <FontAwesome5 name="user" size={12} color={COLORS.muted} />
                      <Text style={styles.detailLabel}>Customer</Text>
                      <Text style={styles.detailValue}>{order.user_name || 'Guest'}</Text>
                    </View>
                    {order.user_email && (
                      <View style={styles.detailRow}>
                        <FontAwesome5 name="envelope" size={12} color={COLORS.muted} />
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{order.user_email}</Text>
                      </View>
                    )}
                    {order.delivery_method && (
                      <View style={styles.detailRow}>
                        <FontAwesome5 name={order.delivery_method === 'delivery' ? 'truck' : 'hand-paper'} size={12} color={COLORS.muted} />
                        <Text style={styles.detailLabel}>{order.delivery_method === 'delivery' ? 'Deliver To' : 'Pickup'}</Text>
                        <Text style={[styles.detailValue, { color: order.delivery_method === 'delivery' ? '#10B981' : COLORS.text }]}>
                          {order.delivery_method === 'delivery' ? (order.delivery_info || 'Table not specified') : 'Self Pickup'}
                        </Text>
                      </View>
                    )}
                    {/* Quick Call Button */}
                    {order.user_phone && (
                      <Pressable
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.open(`tel:${order.user_phone}`, '_self');
                          }
                        }}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                          padding: 10, borderRadius: 10, marginTop: 8,
                          backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
                          cursor: 'pointer',
                        }}
                      >
                        <FontAwesome5 name="phone-alt" size={12} color="#10B981" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>Call Customer</Text>
                          <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 1 }}>{order.user_phone}</Text>
                        </View>
                        <FontAwesome5 name="external-link-alt" size={10} color="#10B981" />
                      </Pressable>
                    )}
                    {/* Order Status Pipeline */}
                    <View style={{ height: 1, backgroundColor: COLORS.borderLight, marginVertical: 10 }} />
                    <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Order Status</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { key: 'confirmed', label: 'Confirm', icon: 'check-circle', color: '#10B981' },
                        { key: 'preparing', label: 'Preparing', icon: 'fire', color: '#F59E0B' },
                        { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'truck', color: '#3B82F6' },
                        { key: 'delivered', label: 'Delivered', icon: 'check-double', color: '#8B5CF6' },
                      ].map((s) => {
                        const currentStatus = order.order_status || 'confirmed';
                        const statusOrder = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'];
                        const currentIdx = statusOrder.indexOf(currentStatus);
                        const btnIdx = statusOrder.indexOf(s.key);
                        const isCurrent = currentStatus === s.key;
                        const isPast = btnIdx < currentIdx;
                        const isNext = btnIdx === currentIdx + 1;
                        return (
                          <Pressable
                            key={s.key}
                            onPress={async () => {
                              if (!isNext && !isCurrent) return;
                              try {
                                await request('/vendors/order-status', {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${token}` },
                                  body: { order_id: order.order_id || order.id, status: s.key },
                                });
                                fetchOrders();
                              } catch (e: any) { alert(e?.message || 'Failed'); }
                            }}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 5,
                              paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                              borderWidth: 1, borderColor: isCurrent ? s.color : isPast ? 'rgba(255,255,255,0.1)' : isNext ? `${s.color}40` : 'rgba(255,255,255,0.05)',
                              backgroundColor: isCurrent ? `${s.color}20` : isPast ? 'rgba(255,255,255,0.03)' : 'transparent',
                              opacity: isNext || isCurrent ? 1 : 0.4,
                              cursor: isNext || isCurrent ? 'pointer' : 'auto',
                            }}
                          >
                            <FontAwesome5 name={s.icon} size={11} color={isCurrent ? s.color : isPast ? COLORS.dim : isNext ? s.color : COLORS.dim} />
                            <Text style={{ fontSize: 11, fontWeight: isCurrent ? '800' : '600', color: isCurrent ? s.color : isPast ? COLORS.dim : isNext ? s.color : COLORS.dim }}>
                              {s.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {/* Refund Button */}
                    {order.order_status !== 'delivered' && order.refund_status !== 'refunded' && (
                      <View style={{ marginTop: 10 }}>
                        <Pressable
                          onPress={() => {
                            setRefundReason('Item sold out');
                            setRefundModal(order);
                          }}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                            padding: 10, borderRadius: 8,
                            backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
                          }}
                        >
                          <FontAwesome5 name="undo" size={11} color="#EF4444" />
                          <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Refund Order</Text>
                        </Pressable>
                      </View>
                    )}
                    {order.refund_status === 'refunded' && (
                      <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <FontAwesome5 name="check-circle" size={11} color="#EF4444" />
                          <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Refunded ₹{order.refund_amount}</Text>
                        </View>
                        <Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 4 }}>{order.refund_reason}</Text>
                      </View>
                    )}
                    {order.user_phone && (
                      <View style={styles.detailRow}>
                        <FontAwesome5 name="phone" size={12} color={COLORS.muted} />
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{order.user_phone}</Text>
                      </View>
                    )}
                    <View style={{ height: 1, backgroundColor: COLORS.borderLight, marginVertical: 10 }} />
                    <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Items</Text>
                    {vendorItems.map((item: any, idx: number) => {
                      const isItemFulfilled = item.fulfillment_status === 'FULFILLED';
                      return (
                        <View key={idx} style={styles.detailItemRow}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.detailItemName} numberOfLines={1}>{item.quantity}x {item.name || 'Item'}</Text>
                            {(item.stall_no || item.stall_location) && (
                              <Text style={styles.detailItemMeta}>
                                {item.stall_no ? `Stall ${item.stall_no}` : ''}{item.stall_no && item.stall_location ? ' · ' : ''}{item.stall_location || ''}
                              </Text>
                            )}
                          </View>
                          <Text style={{ color: COLORS.dim, fontSize: 12, fontWeight: '600' }}>₹{(item.price || 0) * (item.quantity || 1)}</Text>
                          <View style={[styles.itemStatusBadge, { backgroundColor: isItemFulfilled ? COLORS.okFaint : COLORS.warnFaint }]}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: isItemFulfilled ? COLORS.ok : COLORS.warn }}>
                              {isItemFulfilled ? 'DONE' : 'PENDING'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
      
      {/* Refund Modal */}
      {refundModal && (
        <Modal transparent animationType="fade" visible onRequestClose={() => !refunding && setRefundModal(null)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
            <View style={{ width: 420, maxWidth: '90%', backgroundColor: COLORS.panelSolid, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.border, ...(Platform.OS === 'web' ? { boxShadow: '0 24px 64px rgba(0,0,0,0.55)', backdropFilter: 'blur(18px)' } as any : {}) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesome5 name="undo" size={14} color="#FCA5A5" />
                </View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Refund Order #{refundModal.order_id || refundModal.id}</Text>
              </View>
              
              <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13.5, marginBottom: 8 }}>Reason for refund (e.g. Item sold out):</Text>
              <TextInput
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, color: COLORS.text, padding: 12, fontSize: 14, outlineStyle: 'none' } as any}
                value={refundReason}
                onChangeText={setRefundReason}
                placeholder="Item sold out"
                placeholderTextColor={COLORS.dim}
                autoFocus
              />
              
              <View style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' }}>
                <Text style={{ color: '#FCD34D', fontSize: 12.5, fontWeight: '600' }}>
                  This will refund ₹{refundModal.total_amount || refundModal.final_amount || '?'} to {refundModal.user_name || 'the customer'}. This action cannot be undone.
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <Pressable 
                  onPress={() => !refunding && setRefundModal(null)} 
                  style={{ paddingHorizontal: 16, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.04)' }}
                  disabled={refunding}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Pressable 
                  onPress={async () => {
                    if (!refundReason.trim()) return;
                    setRefunding(true);
                    try {
                      const res = await request<any>('/vendors/refund', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: { order_id: refundModal.order_id || refundModal.id, reason: refundReason.trim() },
                      });
                      if (res.success) {
                        alert(`Refund of ₹${res.amount} initiated. Refund ID: ${res.refund_id}`);
                        fetchOrders();
                        setRefundModal(null);
                      } else {
                        alert(res.message || 'Refund failed');
                      }
                    } catch (e: any) { 
                      alert(e?.message || 'Refund failed'); 
                    } finally {
                      setRefunding(false);
                    }
                  }} 
                  style={{ paddingHorizontal: 16, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DC2626', opacity: refunding ? 0.7 : 1 }}
                  disabled={refunding}
                >
                  {refunding ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Confirm Refund</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -.5 },
  subheader: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  meta: { color: COLORS.dim, fontSize: 11.5, marginBottom: 12 },

  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.panel,
  },
  tabActive: {
    backgroundColor: COLORS.violetFaint,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  tabText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.text },

  tableWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.panelSolid,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tableRowExpanded: {
    backgroundColor: 'rgba(139,92,246,0.04)',
  },
  tableHeader: {
    backgroundColor: COLORS.panelAlt,
    paddingVertical: 10,
  },
  th: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cellId: { color: COLORS.violetLt, fontSize: 13, fontWeight: '700', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  cellName: { color: COLORS.text, fontSize: 13.5, fontWeight: '600' },
  cellSub: { color: COLORS.dim, fontSize: 11.5, marginTop: 1 },
  cellItems: { color: COLORS.text, fontSize: 12.5, fontWeight: '500' },
  cellTime: { color: COLORS.muted, fontSize: 11.5, fontWeight: '600' },
  cellTimeSub: { color: COLORS.dim, fontSize: 10.5 },

  statusDot: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDotText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },

  expandedDetail: {
    backgroundColor: 'rgba(139,92,246,0.03)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  detailLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600', width: 70 },
  detailValue: { color: COLORS.text, fontSize: 13, fontWeight: '500', flex: 1 },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  detailItemName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  detailItemMeta: { color: COLORS.dim, fontSize: 11, marginTop: 1 },
  itemStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    marginLeft: 6,
  },

  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.panel,
  },
  emptyText: { color: COLORS.muted, fontSize: 13.5, textAlign: 'center' },
});
