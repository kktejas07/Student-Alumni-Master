import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Plus, Trash2, Edit2, RefreshCw, X } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { SAC, FONTS } from '../../superadmin/tokens';
import { Card, GradientButton, SecondaryButton } from '../../superadmin/applekit';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';

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
      fontFamily: FONTS.regular,
    }, props.style]}
    placeholderTextColor={SAC.muted}
    {...props}
  />
);

const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
  <Pressable
    onPress={() => onChange(!value)}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
  >
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

export function VendorCatalogView({ eventSlug }: { eventSlug?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useVendorAuthStore();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await request<any>(`/vendors/catalog`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) setItems(res.data || []);
    } catch (e) {
      console.error('Failed to load vendor catalog', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleImagePick = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const b64 = await fileToBase64(file);
      setEditingItem((prev: any) => ({
        ...prev,
        image_base64: b64,
        images: prev?.images?.length ? prev.images : [],
      }));
    } catch (e) {
      alert('Could not read image file.');
    } finally {
      setUploading(false);
    }
  };

  const saveItem = async (item: any) => {
    if (!item.name || !item.price) return alert('Name and Price are required');
    try {
      let res;
      const payload: any = {
        name: item.name,
        price: Number(item.price),
        category: item.category || 'food',
        stock: Number(item.stock_limit || 0),
        stock_limit: Number(item.stock_limit || 0),
        description: item.description || '',
        servings: item.servings || undefined,
        images: item.images || [],
        image_base64: item.image_base64 || undefined,
        stall_no: item.stall_no || undefined,
        stall_location: item.stall_location || undefined,
        is_active: item.is_active !== false,
        event_id: eventSlug || 'master',
      };
      if (item.id || item._id) {
        res = await request<any>(`/vendors/catalog/${item.id || item._id}`, {
          method: 'PUT',
          body: payload,
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await request<any>(`/vendors/catalog`, {
          method: 'POST',
          body: payload,
          headers: { Authorization: `Bearer ${token}` },
        });
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
      const res = await request<any>(`/vendors/catalog/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <RefreshCw size={24} color={SAC.muted} />
        <Text style={{ marginTop: 12, color: SAC.muted }}>Loading Catalog...</Text>
      </View>
    );
  }

  const editingId = editingItem?.id || editingItem?._id;

  return (
    <View style={{ gap: 24, paddingVertical: 12, maxWidth: 1000, marginHorizontal: 'auto', width: '100%' }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: SAC.text }}>My Catalog ({items.length})</Text>
          <SecondaryButton onPress={() => setEditingItem({ category: 'food', stock_limit: 0, is_active: true })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Plus size={16} color={SAC.text} />
              <Text style={{ color: SAC.text }}>Add Item</Text>
            </View>
          </SecondaryButton>
        </View>

        {editingItem && (
          <View style={{ padding: 16, backgroundColor: SAC.panel, borderRadius: 12, borderWidth: 1, borderColor: SAC.border, marginBottom: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: SAC.text, fontFamily: FONTS.med }}>{editingId ? 'Edit Item' : 'New Item'}</Text>
              <Pressable onPress={() => setEditingItem(null)} style={{ padding: 4 }}>
                <X size={16} color={SAC.muted} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Name</Text>
                <Field value={editingItem.name || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, name: v })} placeholder="e.g. Handmade Mug" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Price (₹)</Text>
                <Field value={String(editingItem.price || '')} onChangeText={(v: string) => setEditingItem({ ...editingItem, price: Number(v) })} placeholder="0" keyboardType="numeric" />
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
                <Field value={String(editingItem.stock_limit ?? editingItem.stock ?? 0)} onChangeText={(v: string) => setEditingItem({ ...editingItem, stock_limit: Number(v) })} placeholder="0" keyboardType="numeric" />
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

            <View>
              <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Description</Text>
              <Field value={editingItem.description || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, description: v })} placeholder="Short description" multiline />
            </View>

            {/* Image upload */}
            <View>
              <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Item Image</Text>
              <View style={[styles.imageRow, { borderColor: SAC.border }]}>
                {editingItem.image_base64 || editingItem.images?.[0] ? (
                  <img
                    src={editingItem.image_base64 || editingItem.images?.[0]}
                    alt="preview"
                    style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }}
                  />
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: SAC.dim, fontSize: 10 }}>No img</Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 8 }}>
                  <Pressable
                    onPress={() => (document.querySelector('#vendor-item-image') as HTMLInputElement)?.click()}
                    style={[styles.uploadBtn, { borderColor: SAC.border }]}
                  >
                    <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>
                      {uploading ? 'Uploading…' : 'Upload Image'}
                    </Text>
                  </Pressable>
                  <input
                    id="vendor-item-image"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImagePick(e.target.files?.[0])}
                  />
                  {editingItem.image_base64 && (
                    <Pressable onPress={() => setEditingItem({ ...editingItem, image_base64: undefined, images: [] })}>
                      <Text style={{ color: '#ef4444', fontFamily: FONTS.bold, fontSize: 11 }}>Remove image</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>

            <Toggle
              value={editingItem.is_active !== false}
              onChange={(v) => setEditingItem({ ...editingItem, is_active: v })}
              label={editingItem.is_active === false ? 'Unavailable (hidden from shoppers)' : 'Available for purchase'}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <SecondaryButton onPress={() => setEditingItem(null)}><Text style={{ color: SAC.text }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={() => saveItem(editingItem)} loading={uploading}>
                <Text style={{ color: SAC.text }}>Save Item</Text>
              </GradientButton>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {items.map(item => (
            <View key={item.id || item._id} style={{ width: 220, borderWidth: 1, borderColor: SAC.border, borderRadius: 12, overflow: 'hidden', backgroundColor: SAC.panel }}>
              {/* Image Section */}
              <View style={{ width: '100%', height: 140, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                {item.image_base64 || item.images?.[0] ? (
                  <img
                    src={item.image_base64 || item.images?.[0]}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: SAC.dim, fontSize: 11 }}>No Image</Text>
                  </View>
                )}
                {item.is_active === false && (
                  <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(245,158,11,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>HIDDEN</Text>
                  </View>
                )}
              </View>

              {/* Details Section */}
              <View style={{ padding: 12 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ fontSize: 13, color: '#10B981', fontFamily: FONTS.bold, marginTop: 4 }}>₹{item.price}</Text>
                
                <Text style={{ fontSize: 11, color: SAC.muted, marginTop: 8 }} numberOfLines={1}>
                  {item.category.toUpperCase()} {item.stall_no ? `• Stall ${item.stall_no}` : ''}
                </Text>
                <Text style={{ fontSize: 11, color: SAC.dim, marginTop: 2 }}>
                  {item.stock_limit ? `Stock: ${item.stock_remaining ?? item.stock_limit}/${item.stock_limit}` : 'Unlimited Stock'}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: SAC.border }}>
                  <Pressable onPress={() => setEditingItem(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 }}>
                    <Edit2 size={14} color={SAC.muted} />
                    <Text style={{ color: SAC.muted, fontSize: 12, fontFamily: FONTS.med }}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteItem(item.id || item._id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 }}>
                    <Trash2 size={14} color="#ef4444" />
                    <Text style={{ color: '#ef4444', fontSize: 12, fontFamily: FONTS.med }}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
          {items.length === 0 && !editingItem && (
            <View style={{ flex: 1, padding: 40, alignItems: 'center' }}>
              <Text style={{ color: SAC.muted, textAlign: 'center' }}>No items in catalog</Text>
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  imageRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  uploadBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
    alignItems: 'center',
  },
});
