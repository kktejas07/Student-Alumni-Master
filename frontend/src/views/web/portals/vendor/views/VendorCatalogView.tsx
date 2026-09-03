import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Plus, Trash2, Edit2, RefreshCw } from 'lucide-react-native';
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
      fontFamily: FONTS.regular
    }, props.style]}
    placeholderTextColor={SAC.muted}
    {...props}
  />
);

export function VendorCatalogView({ eventSlug }: { eventSlug?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useVendorAuthStore();
  const [editingItem, setEditingItem] = useState<any>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await request<any>(`/vendors/catalog`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
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

  const saveItem = async (item: any) => {
    if (!item.name || !item.price) return alert('Name and Price are required');
    try {
      let res;
      // Default event slug to master if not passed (though we might need vendor to specify or infer)
      const payload = {
        ...item,
        event_id: eventSlug || 'master' 
      };

      if (item.id || item._id) {
        res = await request<any>(`/vendors/catalog/${item.id || item._id}`, { 
          method: 'PUT', 
          body: payload,
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        res = await request<any>(`/vendors/catalog`, { 
          method: 'POST', 
          body: payload,
          headers: { Authorization: `Bearer ${token}` }
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
        headers: { Authorization: `Bearer ${token}` }
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

  return (
    <View style={{ gap: 24, paddingVertical: 12, maxWidth: 1000, marginHorizontal: 'auto', width: '100%' }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: SAC.text }}>My Catalog ({items.length})</Text>
          <SecondaryButton onPress={() => setEditingItem({ category: 'food', stock: 0 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Plus size={16} color={SAC.text} />
              <Text style={{ color: SAC.text }}>Add Item</Text>
            </View>
          </SecondaryButton>
        </View>

        {editingItem && (
          <View style={{ padding: 16, backgroundColor: SAC.panel, borderRadius: 12, borderWidth: 1, borderColor: SAC.border, marginBottom: 16, gap: 12 }}>
            <Text style={{ color: SAC.text, fontFamily: FONTS.med }}>{editingItem.id || editingItem._id ? 'Edit Item' : 'New Item'}</Text>
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
                <Field value={editingItem.category || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, category: v })} placeholder="food" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Stock Limit (0 = unlimited)</Text>
                <Field value={String(editingItem.stock || 0)} onChangeText={(v: string) => setEditingItem({ ...editingItem, stock: Number(v) })} placeholder="0" />
              </View>
            </View>
            <View>
              <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Image URL (Optional)</Text>
              <Field value={editingItem.images?.[0] || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, images: v ? [v] : [] })} placeholder="https://..." />
            </View>
            <View>
              <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>Description</Text>
              <Field value={editingItem.description || ''} onChangeText={(v: string) => setEditingItem({ ...editingItem, description: v })} placeholder="Description" multiline />
            </View>
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
                <Text style={{ fontFamily: FONTS.med, color: SAC.text }}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: SAC.muted }}>{item.category} • ₹{item.price} • Stock: {item.stock || 'Unlimited'}</Text>
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
    </View>
  );
}
