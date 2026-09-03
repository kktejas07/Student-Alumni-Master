import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, Platform } from 'react-native';
import { Plus, Trash2, Edit2, Check, X, RefreshCw } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { SAC, FONTS } from '../tokens';
import { Card, GradientButton, SecondaryButton } from '../applekit';

const Field = (props: any) => (
  <TextInput
    style={[{
      backgroundColor: SAC.bg,
      color: SAC.text,
      borderWidth: 1,
      borderColor: SAC.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      fontFamily: FONTS.regular
    }, props.style]}
    placeholderTextColor={SAC.muted}
    {...props}
  />
);

const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
  <Pressable onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
    <View
      style={[{
        width: 40, height: 22, borderRadius: 11, padding: 2,
        backgroundColor: value ? '#10B981' : 'rgba(255,255,255,0.12)',
        justifyContent: value ? 'flex-end' : 'flex-start',
      }]}
    >
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
    </View>
    <Text style={{ color: SAC.text, fontFamily: FONTS.med, fontSize: 13 }}>{label}</Text>
  </Pressable>
);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CatalogOrdersManager({ showcaseId, slug }: { showcaseId: string; slug: string }) {
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
      const res = await request<any>(`/echo/admin/coupons`, { method: 'POST', body: coupon });
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
          <SecondaryButton onPress={() => setEditingItem({ category: 'handcraft', stock_limit: 0 })}><Text style={{ color: SAC.text }}>Add Item</Text></SecondaryButton>
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
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Category</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={editingItem.category || 'food'}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    style={{
                      backgroundColor: SAC.bg, color: SAC.text, borderWidth: 1,
                      borderColor: SAC.border, borderRadius: 8, padding: 10, fontSize: 14,
                      fontFamily: FONTS.regular, width: '100%', outline: 'none',
                    }}
                  >
                    <option value="food">Food</option>
                    <option value="beverages">Beverages</option>
                    <option value="snacks">Snacks</option>
                    <option value="cafe">Cafe / Coffee</option>
                    <option value="handcraft">Handcraft</option>
                    <option value="merchandise">Merchandise</option>
                    <option value="stationery">Stationery</option>
                    <option value="apparel">Apparel / Clothing</option>
                    <option value="accessories">Accessories</option>
                    <option value="electronics">Electronics</option>
                    <option value="health">Health & Wellness</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <Field value={editingItem.category || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, category: v })} placeholder="Select category" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Stock Limit (0 = unlimited)</Text>
                <Field value={String(editingItem.stock_limit || 0)} onChangeText={(v: string) => setEditingItem({ ...editingItem, stock_limit: Number(v) })} placeholder="0" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Vendor Name</Text>
                <Field value={editingItem.vendor_name || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, vendor_name: v })} placeholder="e.g. Tasty Tacos" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Vendor ID</Text>
                <Field value={editingItem.vendor_id || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, vendor_id: v })} placeholder="vendor123" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Stall No.</Text>
                <Field value={editingItem.stall_no || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, stall_no: v })} placeholder="e.g. B-12" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Stall Location</Text>
                <Field value={editingItem.stall_location || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, stall_location: v })} placeholder="e.g. Food Court, Block A" />
              </View>
            </View>
            <View>
              <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Servings / Portion Info</Text>
              <Field value={editingItem.servings || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, servings: v })} placeholder="e.g. Serves 2-3, 500ml, 1 piece" />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Image URL (Optional)</Text>
                <Field value={editingItem.images?.[0] || editingItem.image_base64 || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, image_base64: v, images: v ? [v] : [] })} placeholder="https://... or paste base64" />
              </View>
              <View style={{ width: 120, justifyContent: 'flex-end', paddingBottom: 4 }}>
                <Pressable
                  onPress={() => (document.querySelector('#admin-cat-image') as HTMLInputElement)?.click()}
                  style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, alignItems: 'center' }}
                >
                  <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>Upload</Text>
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
            <View>
              <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Description</Text>
              <Field value={editingItem.description || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, description: v })} placeholder="Description" multiline />
            </View>
            <Toggle
              value={editingItem.is_active !== false}
              onChange={(v) => setEditingItem({ ...editingItem, is_active: v })}
              label={editingItem.is_active === false ? 'Unavailable (hidden from shoppers)' : 'Available for purchase'}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <SecondaryButton onPress={() => setEditingItem(null)}><Text style={{ color: SAC.text }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={() => saveItem(editingItem)}><Text style={{ color: SAC.text }}>Save Item</Text></GradientButton>
            </View>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {items.map(item => (
            <View key={item.id || item._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: SAC.border, borderRadius: 8 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: FONTS.med, color: SAC.text }}>{item.name}</Text>
                {item.is_active === false && (
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>HIDDEN</Text>
                )}
              </View>
              <Text style={{ fontSize: 12, color: SAC.muted }}>
                {item.category} • ₹{item.price}{item.stall_no ? ` • Stall ${item.stall_no}` : ''}
                {item.stock_limit ? ` • Stock: ${item.stock_remaining ?? item.stock_limit}/${item.stock_limit}` : ' • Unlimited'}
              </Text>
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

      {/* VENDORS SECTION */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: SAC.text }}>Vendors ({vendors.length})</Text>
          <SecondaryButton onPress={() => setEditingVendor({})}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Plus size={16} color={SAC.text} /><Text style={{ color: SAC.text }}>New Vendor</Text></View></SecondaryButton>
        </View>

        {editingVendor && (
          <View style={{ padding: 16, backgroundColor: SAC.panel, borderRadius: 12, borderWidth: 1, borderColor: SAC.border, marginBottom: 16, gap: 12 }}>
            <Text style={{ color: SAC.text, fontFamily: FONTS.med }}>New Vendor Account</Text>
            <Text style={{ color: SAC.muted, fontSize: 12 }}>Vendors sign in at /vendor-portal/login with these credentials.</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Vendor ID</Text>
                <Field value={editingVendor.vendor_id || ''} onChangeText={(v: string) => setEditingVendor({ ...editingVendor, vendor_id: v.replace(/\\s+/g, '_') })} placeholder="e.g. tastytacos" autoCapitalize="none" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Passcode</Text>
                <Field value={editingVendor.passcode || ''} onChangeText={(v: string) => setEditingVendor({ ...editingVendor, passcode: v })} placeholder="e.g. 1234" keyboardType="number-pad" secureTextEntry />
              </View>
            </View>
            <View>
              <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Name (optional)</Text>
              <Field value={editingVendor.name || ''} onChangeText={(v: string) => setEditingVendor({ ...editingVendor, name: v })} placeholder="e.g. Tasty Tacos" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <SecondaryButton onPress={() => setEditingVendor(null)}><Text style={{ color: SAC.text }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={() => saveVendor(editingVendor)}><Text style={{ color: SAC.text }}>Create Vendor</Text></GradientButton>
            </View>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {vendors.map(vendor => (
            <View key={vendor.vendor_id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: SAC.border, borderRadius: 8 }}>
              <View>
                <Text style={{ fontFamily: FONTS.med, color: SAC.text }}>{vendor.name || vendor.vendor_id}</Text>
                <Text style={{ fontSize: 12, color: SAC.muted }}>ID: {vendor.vendor_id}</Text>
              </View>
              <Pressable onPress={() => deleteVendor(vendor.vendor_id)} style={{ padding: 8 }}>
                <Trash2 size={16} color="#ef4444" />
              </Pressable>
            </View>
          ))}
          {vendors.length === 0 && <Text style={{ color: SAC.muted, textAlign: 'center', padding: 20 }}>No vendors yet — create one so they can log in</Text>}
        </View>
      </Card>

      {/* COUPONS SECTION */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: SAC.text }}>Coupons ({coupons.length})</Text>
          <SecondaryButton onPress={() => setEditingCoupon({ discount_type: 'percentage' })}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Plus size={16} color={SAC.text} /><Text style={{ color: SAC.text }}>Create Coupon</Text></View></SecondaryButton>
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
              <SecondaryButton onPress={() => setEditingCoupon(null)}><Text style={{ color: SAC.text }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={() => saveCoupon(editingCoupon)}><Text style={{ color: SAC.text }}>Save Coupon</Text></GradientButton>
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
