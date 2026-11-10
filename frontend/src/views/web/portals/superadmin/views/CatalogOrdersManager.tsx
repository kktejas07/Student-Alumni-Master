import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Plus, Trash2, Edit2, RefreshCw } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { SAC, useSAC, FONTS } from '../tokens';
import { Card, GradientButton, SecondaryButton } from '../applekit';
import {
  Field, fileToBase64, FormLabel, EDITOR_PANEL_STYLE, SectionHeader, WEB_SELECT_STYLE,
  NamePriceRow, CategoryStockRow, StallRow, ServingsField, DescriptionField, AvailabilityToggle,
} from '../../shared/catalog';

export function CatalogOrdersManager({ showcaseId, slug }: { showcaseId: string; slug: string }) {
  const T = useSAC();
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      if (!showcaseId) return;
      const [resItems, resOrders, resCoupons, resVendors] = await Promise.all([
        request<any>(`/echo/admin/showcases/${showcaseId}/catalog`),
        request<any>(`/echo/admin/showcases/${showcaseId}/orders`),
        request<any>(`/echo/admin/coupons?event_slug=${slug}`),
        request<any>('/echo/admin/vendors').catch(() => ({ success: false }))
      ]);
      if (resItems.success) setItems(resItems.data || []);
      if (resOrders.success) setOrders(resOrders.data || []);
      if (resCoupons.success) setCoupons(resCoupons.data || []);
      if (resVendors.success) setVendors(resVendors.data || []);
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
        res = await request<any>(`/echo/admin/catalog/${item.id || item._id}`, { method: 'PUT', body: item });
      } else {
        res = await request<any>(`/echo/admin/showcases/${showcaseId}/catalog`, { method: 'POST', body: item });
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
    if (!window.confirm('Are you sure you want to delete this catalog item?')) return;
    try {
      const res = await request<any>(`/echo/admin/catalog/${id}`, { method: 'DELETE' });
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
      let res;
      if (coupon._id) {
        // Update existing
        res = await request<any>(`/echo/admin/coupons/${coupon._id}`, { method: 'PUT', body: coupon });
      } else {
        // Create new
        res = await request<any>(`/echo/admin/coupons`, { method: 'POST', body: coupon });
      }
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

  const deleteCoupon = async (couponId: string) => {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      const res = await request<any>(`/echo/admin/coupons/${couponId}`, { method: 'DELETE' });
      if (res.success) load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Vendors (provision login accounts)
  const [editingVendor, setEditingVendor] = useState<any>(null);

  const saveVendor = async (vendor: any) => {
    if (!vendor.vendor_id || !vendor.passcode) return alert('Vendor ID and Passcode are required');
    try {
      const res = await request<any>(`/echo/admin/vendors`, { method: 'POST', body: vendor });
      if (res.success) {
        setEditingVendor(null);
        load();
      } else {
        alert(res.error || 'Failed to create vendor');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const deleteVendor = async (vendorId: string) => {
    if (!window.confirm(`Delete vendor "${vendorId}"? This disables their login.`)) return;
    try {
      const res = await request<any>(`/echo/admin/vendors/${vendorId}`, { method: 'DELETE' });
      if (res.success) load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const patch = (p: Record<string, any>) => setEditingItem((prev: any) => ({ ...prev, ...p }));

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <RefreshCw size={24} color={T.muted} />
        <Text style={{ marginTop: 12, color: T.muted }}>Loading Catalog & Orders...</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 24, paddingVertical: 12 }}>
      
      {/* CATALOG SECTION */}
      <Card>
        <SectionHeader
          title={`Catalog Items (${items.length})`}
          right={<SecondaryButton onPress={() => setEditingItem({ category: 'handcraft', stock_limit: 0 })}><Text style={{ color: T.text }}>Add Item</Text></SecondaryButton>}
        />

        {editingItem && (
          <View style={EDITOR_PANEL_STYLE}>
            <Text style={{ color: T.text, fontFamily: FONTS.med }}>{editingItem.id ? 'Edit Item' : 'New Item'}</Text>
            <NamePriceRow item={editingItem} onChange={patch} />
            <CategoryStockRow item={editingItem} onChange={patch} stockValue={String(editingItem.stock_limit || 0)} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormLabel>Vendor Name</FormLabel>
                <Field value={editingItem.vendor_name || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, vendor_name: v })} placeholder="e.g. Tasty Tacos" />
              </View>
              <View style={{ flex: 1 }}>
                <FormLabel>Vendor ID</FormLabel>
                <Field value={editingItem.vendor_id || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, vendor_id: v })} placeholder="vendor123" />
              </View>
            </View>
            <StallRow item={editingItem} onChange={patch} />
            <ServingsField item={editingItem} onChange={patch} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormLabel>Image URL (Optional)</FormLabel>
                <Field value={editingItem.images?.[0] || editingItem.image_base64 || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, image_base64: v, images: v ? [v] : [] })} placeholder="https://... or paste base64" />
              </View>
              <View style={{ width: 120, justifyContent: 'flex-end', paddingBottom: 4 }}>
                <Pressable
                  onPress={() => (document.querySelector('#admin-cat-image') as HTMLInputElement)?.click()}
                  style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border, alignItems: 'center' }}
                >
                  <Text style={{ color: T.text, fontFamily: FONTS.bold, fontSize: 12 }}>Upload</Text>
                </Pressable>
                <input
                  id="admin-cat-image"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const b64 = await fileToBase64(f);
                      setEditingItem({ ...editingItem, image_base64: b64, images: [b64] });
                    }
                    e.target.value = '';
                  }}
                />
              </View>
            </View>
            <DescriptionField item={editingItem} onChange={patch} />
            <AvailabilityToggle item={editingItem} onChange={patch} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <SecondaryButton onPress={() => setEditingItem(null)}><Text style={{ color: T.text }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={() => saveItem(editingItem)}><Text style={{ color: T.text }}>Save Item</Text></GradientButton>
            </View>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {items.map(item => (
            <View key={item.id || item._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: T.border, borderRadius: 8 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: FONTS.med, color: T.text }}>{item.name}</Text>
                {item.is_active === false && (
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>HIDDEN</Text>
                )}
              </View>
              <Text style={{ fontSize: 12, color: T.muted }}>
                {item.category} • ₹{item.price}{item.stall_no ? ` • Stall ${item.stall_no}` : ''}
                {item.stock_limit ? ` • Stock: ${item.stock_remaining ?? item.stock_limit}/${item.stock_limit}` : ' • Unlimited'}
              </Text>
            </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => setEditingItem(item)} style={{ padding: 8 }}>
                  <Edit2 size={16} color={T.muted} />
                </Pressable>
                <Pressable onPress={() => deleteItem(item.id || item._id)} style={{ padding: 8 }}>
                  <Trash2 size={16} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          ))}
          {items.length === 0 && !editingItem && <Text style={{ color: T.muted, textAlign: 'center', padding: 20 }}>No items in catalog</Text>}
        </View>
      </Card>

      {/* VENDORS SECTION */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: T.text }}>Vendors ({vendors.length})</Text>
          <SecondaryButton onPress={() => setEditingVendor({})}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Plus size={16} color={T.text} /><Text style={{ color: T.text }}>New Vendor</Text></View></SecondaryButton>
        </View>

        {editingVendor && (
          <View style={EDITOR_PANEL_STYLE}>
            <Text style={{ color: T.text, fontFamily: FONTS.med }}>New Vendor Account</Text>
            <Text style={{ color: T.muted, fontSize: 12 }}>Vendors sign in at /vendor-portal/login with these credentials.</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormLabel>Vendor ID</FormLabel>
                <Field value={editingVendor.vendor_id || ''} onChangeText={(v: string) => setEditingVendor({ ...editingVendor, vendor_id: v.replace(/\\s+/g, '_') })} placeholder="e.g. tastytacos" autoCapitalize="none" />
              </View>
              <View style={{ flex: 1 }}>
                <FormLabel>Passcode</FormLabel>
                <Field value={editingVendor.passcode || ''} onChangeText={(v: string) => setEditingVendor({ ...editingVendor, passcode: v })} placeholder="e.g. 1234" keyboardType="number-pad" secureTextEntry />
              </View>
            </View>
            <View>
              <FormLabel>Name (optional)</FormLabel>
              <Field value={editingVendor.name || ''} onChangeText={(v: string) => setEditingVendor({ ...editingVendor, name: v })} placeholder="e.g. Tasty Tacos" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <SecondaryButton onPress={() => setEditingVendor(null)}><Text style={{ color: T.text }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={() => saveVendor(editingVendor)}><Text style={{ color: T.text }}>Create Vendor</Text></GradientButton>
            </View>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {vendors.map(vendor => (
            <View key={vendor.vendor_id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: T.border, borderRadius: 8 }}>
              <View>
                <Text style={{ fontFamily: FONTS.med, color: T.text }}>{vendor.name || vendor.vendor_id}</Text>
                <Text style={{ fontSize: 12, color: T.muted }}>ID: {vendor.vendor_id}</Text>
              </View>
              <Pressable onPress={() => deleteVendor(vendor.vendor_id)} style={{ padding: 8 }}>
                <Trash2 size={16} color="#ef4444" />
              </Pressable>
            </View>
          ))}
          {vendors.length === 0 && <Text style={{ color: T.muted, textAlign: 'center', padding: 20 }}>No vendors yet — create one so they can log in</Text>}
        </View>
      </Card>

      {/* COUPONS SECTION */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: T.text }}>Coupons ({coupons.length})</Text>
          <SecondaryButton onPress={() => setEditingCoupon({ discount_type: 'percentage' })}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Plus size={16} color={T.text} /><Text style={{ color: T.text }}>Create Coupon</Text></View></SecondaryButton>
        </View>

        {editingCoupon && (
          <View style={EDITOR_PANEL_STYLE}>
            <Text style={{ color: T.text, fontFamily: FONTS.med }}>{editingCoupon._id ? 'Edit Coupon' : 'New Coupon'}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormLabel>Code</FormLabel>
                <Field value={editingCoupon.code || ''} onChangeText={(v: string) => setEditingCoupon({ ...editingCoupon, code: v.toUpperCase() })} placeholder="e.g. SAVE20" />
              </View>
              <View style={{ flex: 1 }}>
                <FormLabel>Type (percentage/fixed)</FormLabel>
                <Field value={editingCoupon.discount_type || 'percentage'} onChangeText={(v: string) => setEditingCoupon({ ...editingCoupon, discount_type: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <FormLabel>Discount Value</FormLabel>
                <Field value={String(editingCoupon.discount_value || '')} onChangeText={(v: string) => setEditingCoupon({ ...editingCoupon, discount_value: Number(v) })} placeholder="20" />
              </View>
            </View>
            <View>
              <FormLabel>Vendor (leave empty for all vendors)</FormLabel>
              {Platform.OS === 'web' ? (
                <select
                  value={editingCoupon.vendor_id || ''}
                  onChange={(e) => {
                    const vid = e.target.value;
                    const vname = vendors.find((v: any) => v.vendor_id === vid)?.name || '';
                    setEditingCoupon({ ...editingCoupon, vendor_id: vid || null, vendor_name: vname || null });
                  }}
                  style={WEB_SELECT_STYLE}
                >
                  <option value="">All Vendors (global)</option>
                  {vendors.map((v: any) => (
                    <option key={v.vendor_id} value={v.vendor_id}>{v.name || v.vendor_id}</option>
                  ))}
                </select>
              ) : (
                <Field value={editingCoupon.vendor_id || ''} onChangeText={(v: string) => setEditingCoupon({ ...editingCoupon, vendor_id: v })} placeholder="Vendor ID (optional)" />
              )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <SecondaryButton onPress={() => setEditingCoupon(null)}><Text style={{ color: T.text }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={() => saveCoupon(editingCoupon)}><Text style={{ color: T.text }}>Save Coupon</Text></GradientButton>
            </View>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {coupons.map(coupon => (
            <View key={coupon.code} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: T.border, borderRadius: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.med, color: T.text }}>{coupon.code}</Text>
                <Text style={{ fontSize: 12, color: T.muted }}>{coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : ' INR'} off{coupon.vendor_name ? ` · ${coupon.vendor_name}` : ' · All vendors'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, color: T.muted }}>Uses: {coupon.uses_count || 0}</Text>
                <Pressable onPress={() => setEditingCoupon(coupon)} style={{ padding: 6 }}>
                  <Edit2 size={14} color="#A78BFA" />
                </Pressable>
                <Pressable onPress={() => deleteCoupon(coupon._id)} style={{ padding: 6 }}>
                  <Trash2 size={14} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* ORDERS SECTION */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: T.text }}>Marketplace Orders ({orders.length})</Text>
        </View>
        <View style={{ gap: 12 }}>
          {orders.map(order => (
            <View key={order.id || order._id} style={{ padding: 12, borderWidth: 1, borderColor: T.border, borderRadius: 8, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: FONTS.med, color: T.text }}>Order #{order.id?.substring(0, 8)}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: order.status === 'paid' ? '#10B981' : '#F59E0B' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' }}>{order.status}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: T.muted }}>Total: ₹{order.final_amount} • {new Date(order.created_at).toLocaleString()}</Text>
              
              <View style={{ marginTop: 8, gap: 4 }}>
                {order.items?.map((item: any, i: number) => {
                  const catalogItem = items.find(ci => ci.id === item.item_id || ci._id === item.item_id);
                  return (
                    <Text key={i} style={{ fontSize: 12, color: T.text }}>
                      • {catalogItem ? catalogItem.name : item.item_id} (x{item.quantity}) - ₹{item.price_at_time}
                    </Text>
                  );
                })}
              </View>
            </View>
          ))}
          {orders.length === 0 && <Text style={{ color: T.muted, textAlign: 'center', padding: 20 }}>No orders yet</Text>}
        </View>
      </Card>

    </View>
  );
}
