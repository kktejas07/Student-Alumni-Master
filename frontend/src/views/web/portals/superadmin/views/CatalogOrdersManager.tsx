import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Plus, Trash2, Edit2, Check, X, RefreshCw } from 'lucide-react-native';
import { api } from '@/src/models/services/api';
import { SAC, FONTS } from '../tokens';
import { Card, Field, GradientButton, SecondaryButton, useConfirm } from '../applekit';

export function CatalogOrdersManager({ showcaseId, slug }: { showcaseId: string; slug: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm } = useConfirm();

  const load = async () => {
    try {
      setLoading(true);
      if (!showcaseId) return;
      const [resItems, resOrders, resCoupons] = await Promise.all([
        api.get(`/api/echo/admin/showcases/${showcaseId}/catalog`),
        api.get(`/api/echo/admin/showcases/${showcaseId}/orders`),
        api.get(`/api/echo/admin/coupons?event_slug=${slug}`)
      ]);
      if (resItems.success) setItems(resItems.data || []);
      if (resOrders.success) setOrders(resOrders.data || []);
      if (resCoupons.success) setCoupons(resCoupons.data || []);
    } catch (e) {
      console.error('Failed to load catalog/orders', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [showcaseId]);

  const [editingItem, setEditingItem] = useState<any>(null);

  const saveItem = async (item: any) => {
    if (!item.name || !item.price) return alert('Name and Price are required');
    try {
      let res;
      if (item.id || item._id) {
        res = await api.put(`/api/echo/admin/catalog/${item.id || item._id}`, item);
      } else {
        res = await api.post(`/api/echo/admin/showcases/${showcaseId}/catalog`, item);
      }
      if (res.success) {
        setEditingItem(null);
        load();
      } else {
        alert(res.error || 'Failed to save item');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const deleteItem = async (id: string) => {
    if (!await confirm({ title: 'Delete Item?', message: 'Are you sure you want to delete this catalog item?' })) return;
    try {
      const res = await api.delete(`/api/echo/admin/catalog/${id}`);
      if (res.success) load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Coupons
  const [editingCoupon, setEditingCoupon] = useState<any>(null);

  const saveCoupon = async (coupon: any) => {
    if (!coupon.code || !coupon.discount_value) return alert('Code and Discount Value are required');
    try {
      coupon.event_id = slug; // ensure it's tied to event
      const res = await api.post(`/api/echo/admin/coupons`, coupon);
      if (res.success) {
        setEditingCoupon(null);
        load();
      } else {
        alert(res.error || 'Failed to save coupon');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <RefreshCw size={24} color={SAC.muted} />
        <Text style={{ marginTop: 12, color: SAC.muted }}>Loading Catalog & Orders...</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 24, paddingVertical: 12 }}>
      
      {/* CATALOG SECTION */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: SAC.text }}>Catalog Items ({items.length})</Text>
          <SecondaryButton icon={Plus} label="Add Item" onPress={() => setEditingItem({ category: 'handcraft', stock_limit: 0 })} />
        </View>

        {editingItem && (
          <View style={{ padding: 16, backgroundColor: SAC.panel, borderRadius: 12, borderWidth: 1, borderColor: SAC.border, marginBottom: 16, gap: 12 }}>
            <Text style={{ color: SAC.text, fontFamily: FONTS.med }}>{editingItem.id ? 'Edit Item' : 'New Item'}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Name</Text>
                <Field value={editingItem.name || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, name: v })} placeholder="e.g. Handmade Mug" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Price</Text>
                <Field value={String(editingItem.price || '')} onChangeText={(v: string) => setEditingItem({ ...editingItem, price: Number(v) })} placeholder="0" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Category (food/handcraft)</Text>
                <Field value={editingItem.category || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, category: v })} placeholder="handcraft" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Stock Limit (0 = unlimited)</Text>
                <Field value={String(editingItem.stock_limit || 0)} onChangeText={(v: string) => setEditingItem({ ...editingItem, stock_limit: Number(v) })} placeholder="0" />
              </View>
            </View>
            <View>
              <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Description</Text>
              <Field value={editingItem.description || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, description: v })} placeholder="Description" multiline />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <SecondaryButton label="Cancel" onPress={() => setEditingItem(null)} />
              <GradientButton label="Save Item" onPress={() => saveItem(editingItem)} />
            </View>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {items.map(item => (
            <View key={item.id || item._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: SAC.border, borderRadius: 8 }}>
              <View>
                <Text style={{ fontFamily: FONTS.med, color: SAC.text }}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: SAC.muted }}>{item.category} • ₹{item.price} • Stock: {item.stock_limit || 'Unlimited'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => setEditingItem(item)} style={{ padding: 8 }}>
                  <Edit2 size={16} color={SAC.muted} />
                </Pressable>
                <Pressable onPress={() => deleteItem(item.id || item._id)} style={{ padding: 8 }}>
                  <Trash2 size={16} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          ))}
          {items.length === 0 && !editingItem && <Text style={{ color: SAC.muted, textAlign: 'center', padding: 20 }}>No items in catalog</Text>}
        </View>
      </Card>

      {/* COUPONS SECTION */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: SAC.text }}>Coupons ({coupons.length})</Text>
          <SecondaryButton icon={Plus} label="Create Coupon" onPress={() => setEditingCoupon({ discount_type: 'percentage' })} />
        </View>

        {editingCoupon && (
          <View style={{ padding: 16, backgroundColor: SAC.panel, borderRadius: 12, borderWidth: 1, borderColor: SAC.border, marginBottom: 16, gap: 12 }}>
            <Text style={{ color: SAC.text, fontFamily: FONTS.med }}>New Coupon</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Code</Text>
                <Field value={editingCoupon.code || ''} onChangeText={(v: string) => setEditingCoupon({ ...editingCoupon, code: v.toUpperCase() })} placeholder="e.g. SAVE20" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Type (percentage/fixed)</Text>
                <Field value={editingCoupon.discount_type || 'percentage'} onChangeText={(v: string) => setEditingCoupon({ ...editingCoupon, discount_type: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Discount Value</Text>
                <Field value={String(editingCoupon.discount_value || '')} onChangeText={(v: string) => setEditingCoupon({ ...editingCoupon, discount_value: Number(v) })} placeholder="20" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <SecondaryButton label="Cancel" onPress={() => setEditingCoupon(null)} />
              <GradientButton label="Save Coupon" onPress={() => saveCoupon(editingCoupon)} />
            </View>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {coupons.map(coupon => (
            <View key={coupon.code} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: SAC.border, borderRadius: 8 }}>
              <View>
                <Text style={{ fontFamily: FONTS.med, color: SAC.text }}>{coupon.code}</Text>
                <Text style={{ fontSize: 12, color: SAC.muted }}>{coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : ' INR'} off</Text>
              </View>
              <Text style={{ fontSize: 12, color: SAC.muted }}>Uses: {coupon.uses_count || 0}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* ORDERS SECTION */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: SAC.text }}>Marketplace Orders ({orders.length})</Text>
        </View>
        <View style={{ gap: 12 }}>
          {orders.map(order => (
            <View key={order.id || order._id} style={{ padding: 12, borderWidth: 1, borderColor: SAC.border, borderRadius: 8, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: FONTS.med, color: SAC.text }}>Order #{order.id?.substring(0, 8)}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: order.status === 'paid' ? '#10B981' : '#F59E0B' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' }}>{order.status}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: SAC.muted }}>Total: ₹{order.final_amount} • {new Date(order.created_at).toLocaleString()}</Text>
              
              <View style={{ marginTop: 8, gap: 4 }}>
                {order.items?.map((item: any, i: number) => {
                  const catalogItem = items.find(ci => ci.id === item.item_id || ci._id === item.item_id);
                  return (
                    <Text key={i} style={{ fontSize: 12, color: SAC.text }}>
                      • {catalogItem ? catalogItem.name : item.item_id} (x{item.quantity}) - ₹{item.price_at_time}
                    </Text>
                  );
                })}
              </View>
            </View>
          ))}
          {orders.length === 0 && <Text style={{ color: SAC.muted, textAlign: 'center', padding: 20 }}>No orders yet</Text>}
        </View>
      </Card>

    </View>
  );
}
