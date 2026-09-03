import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { request } from '@/src/models/services/api';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { FontAwesome5 } from '@expo/vector-icons';

export function VendorDashboardView() {
  const { token, vendor } = useVendorAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      const res = await request<any>('/vendors/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) {
        setData(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  if (loading) {
    return <ActivityIndicator color="#8B5CF6" style={{ marginTop: 40 }} />;
  }

  if (!data) {
    return <Text style={{ color: 'white' }}>Failed to load dashboard.</Text>;
  }

  const { stats, pending_orders } = data;

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDashboard} tintColor="#8B5CF6" />}
    >
      <Text style={styles.header}>Welcome, {vendor?.name || vendor?.vendor_id}!</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <FontAwesome5 name="rupee-sign" size={24} color="#10B981" />
          <Text style={styles.statValue}>₹{stats.total_sales}</Text>
          <Text style={styles.statLabel}>Total Sales</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome5 name="clock" size={24} color="#F59E0B" />
          <Text style={styles.statValue}>{stats.pending_items}</Text>
          <Text style={styles.statLabel}>Pending Items</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome5 name="check-circle" size={24} color="#3B82F6" />
          <Text style={styles.statValue}>{stats.fulfilled_items}</Text>
          <Text style={styles.statLabel}>Fulfilled Items</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Pending Orders ({pending_orders.length})</Text>
      
      {pending_orders.length === 0 ? (
        <Text style={{ color: '#9CA3AF' }}>No pending orders.</Text>
      ) : (
        <View style={{ gap: 16 }}>
          {pending_orders.map((order: any) => (
            <View key={order.order_id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.order_id.substring(0, 8)}</Text>
                <Text style={styles.orderUser}>{order.user_name}</Text>
              </View>
              <View style={styles.divider} />
              {order.items.map((item: any, idx: number) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
                  <Text style={styles.itemStatus}>
                    {item.fulfillment_status || 'PENDING'}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 24,
    minWidth: 160,
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  orderUser: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    color: '#FFF',
    fontSize: 15,
  },
  itemStatus: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
  }
});
