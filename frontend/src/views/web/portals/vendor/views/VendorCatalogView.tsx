import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Plus, Trash2, Edit2, RefreshCw, X } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { SAC, FONTS } from '../../superadmin/tokens';
import { Card, GradientButton, SecondaryButton } from '../../superadmin/applekit';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import {
  fileToBase64, FormLabel, EDITOR_PANEL_STYLE, SectionHeader,
  NamePriceRow, CategoryStockRow, StallRow, ServingsField, DescriptionField, AvailabilityToggle,
} from '../../shared/catalog';

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
  const patch = (p: Record<string, any>) => setEditingItem((prev: any) => ({ ...prev, ...p }));

  return (
    <View style={{ gap: 24, paddingVertical: 12, maxWidth: 1000, marginHorizontal: 'auto', width: '100%' }}>
      <Card>
        <SectionHeader
          title={`My Catalog (${items.length})`}
          right={(
            <SecondaryButton onPress={() => setEditingItem({ category: 'food', stock_limit: 0, is_active: true })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Plus size={16} color={SAC.text} />
                <Text style={{ color: SAC.text }}>Add Item</Text>
              </View>
            </SecondaryButton>
          )}
        />

        {editingItem && (
          <View style={EDITOR_PANEL_STYLE}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: SAC.text, fontFamily: FONTS.med }}>{editingId ? 'Edit Item' : 'New Item'}</Text>
              <Pressable onPress={() => setEditingItem(null)} style={{ padding: 4 }}>
                <X size={16} color={SAC.muted} />
              </Pressable>
            </View>

            <NamePriceRow item={editingItem} onChange={patch} priceLabel="Price (₹)" numericPrice />
            <CategoryStockRow
              item={editingItem}
              onChange={patch}
              stockValue={String(editingItem.stock_limit ?? editingItem.stock ?? 0)}
              numericStock
            />
            <StallRow item={editingItem} onChange={patch} />
            <ServingsField item={editingItem} onChange={patch} />
            <DescriptionField item={editingItem} onChange={patch} placeholder="Short description" />

            {/* Image upload */}
            <View>
              <FormLabel>Item Image</FormLabel>
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

            <AvailabilityToggle item={editingItem} onChange={patch} />

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
