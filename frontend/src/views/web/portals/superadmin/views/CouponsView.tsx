/**
 * Super Admin → Coupons management page.
 *
 * Dedicated page for managing ALL platform coupons:
 *  - Marketplace coupons (food, beverages, handcrafts)
 *  - Partner coupons (Coursera, Uber, Notion, etc.)
 *  - Event registration coupons (HackWave, MRIT, etc.)
 *  - Promo coupons (general platform promotions)
 *
 * One source of truth — no more hardcoded duplicates.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView, Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import {
  Tag, Plus, Pencil, Trash2, RefreshCw, Search, X,
  Percent, DollarSign, Gift, Ticket, Users, BarChart3,
  Lock, Unlock, Info, Globe, Upload, Image,
} from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, SectionLabel, StatusPill,
  KpiTile, EmptyState, useToast, Toast,
} from '../applekit';
import { request } from '@/src/models/services/api';

const Field = (props: any) => (
  <TextInput
    style={[{
      backgroundColor: SAC.cardSolid,
      color: SAC.text,
      borderWidth: 1,
      borderColor: SAC.border,
      borderRadius: 9,
      padding: 10,
      fontSize: 13,
      fontFamily: FONTS.regular,
    }, props.style]}
    placeholderTextColor={SAC.dim}
    {...props}
  />
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ color: SAC.muted, fontSize: 11, marginBottom: 5, fontFamily: FONTS.bold, letterSpacing: 0.3 }}>{children}</Text>
);

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Tag },
  { id: 'marketplace', label: 'Marketplace', icon: Tag, color: '#8B5CF6' },
  { id: 'partner', label: 'Partner', icon: Users, color: '#3B82F6' },
  { id: 'event', label: 'Event', icon: Ticket, color: '#10B981' },
  { id: 'promo', label: 'Promo', icon: Gift, color: '#F59E0B' },
];

const CATEGORY_COLORS: Record<string, string> = {
  marketplace: '#8B5CF6',
  partner: '#3B82F6',
  event: '#10B981',
  promo: '#F59E0B',
};

export function CouponsView() {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));

  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [showcases, setShowcases] = useState<any[]>([]);
  const { toast, flash, hide } = useToast();

  const fetchCoupons = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await request<any>('/echo/admin/coupons');
      if (res.success) setCoupons(res.data || []);
    } catch (e) {
      console.error('Failed to load coupons', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await request<any>('/echo/admin/vendors');
      const list = Array.isArray(res) ? res : (res?.data || res?.vendors || []);
      setVendors(list || []);
    } catch (e) {}
  }, []);

  const fetchShowcases = useCallback(async () => {
    try {
      const res = await request<any>('/echo/admin/showcases');
      const list = Array.isArray(res) ? res : (res?.items || res?.showcases || []);
      setShowcases(list || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchCoupons();
    fetchVendors();
    fetchShowcases();
  }, [fetchCoupons, fetchVendors, fetchShowcases]);

  const onRefresh = () => { setRefreshing(true); fetchCoupons(true); };

  const saveCoupon = async (coupon: any) => {
    try {
      const payload = {
        code: coupon.code,
        discount_type: coupon.discount_type || 'percentage',
        discount_value: Number(coupon.discount_value) || 0,
        duration_months: coupon.duration_months || null,
        event_id: coupon.event_id || null,
        vendor_id: coupon.vendor_id || null,
        vendor_name: coupon.vendor_name || null,
        partner_name: coupon.partner_name || null,
        max_uses: Number(coupon.max_uses) || 0,
        min_order_value: Number(coupon.min_order_value) || 0,
        max_discount: Number(coupon.max_discount) || 0,
        per_user_limit: Number(coupon.per_user_limit) || 0,
        description: coupon.description || '',
        category: coupon.category || 'marketplace',
        locked: coupon.locked || false,
        instructions: coupon.instructions || '',
        website_url: coupon.website_url || null,
        logo_url: coupon.logo_url || null,
      };
      if (coupon._id) {
        await request(`/echo/admin/coupons/${coupon._id}`, { method: 'PUT', body: payload });
        flash('Coupon updated successfully', 'success');
      } else {
        await request('/echo/admin/coupons', { method: 'POST', body: payload });
        flash('Coupon created successfully', 'success');
      }
      setEditing(null);
      fetchCoupons(true);
    } catch (e: any) {
      flash(e?.message || 'Failed to save coupon', 'error');
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await request(`/echo/admin/coupons/${id}`, { method: 'DELETE' });
      flash('Coupon removed', 'success');
      fetchCoupons(true);
    } catch (e: any) {
      flash(e?.message || 'Failed to delete coupon', 'error');
    }
  };

  const filtered = coupons.filter(c => {
    if (activeCategory !== 'all' && c.category !== activeCategory) return false;
    if (search && !c.code?.toLowerCase().includes(search.toLowerCase()) && !c.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.active !== false).length;
  const totalUses = coupons.reduce((a, c) => a + (c.uses_count || 0), 0);
  const categoryCounts = CATEGORIES.filter(c => c.id !== 'all').reduce((acc, c) => {
    acc[c.id] = coupons.filter(cp => cp.category === c.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SAC.violet} />}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 24, color: SAC.text }}>Coupons</Text>
          <Text style={{ fontSize: 13, color: SAC.muted, marginTop: 2 }}>Manage all platform discount codes</Text>
        </View>
        <GradientButton onPress={() => setEditing({ discount_type: 'percentage', category: 'marketplace' })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Plus size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontFamily: FONTS.bold }}>Create Coupon</Text>
          </View>
        </GradientButton>
      </View>

      {/* KPI Tiles */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiTile Icon={Tag} label="Total Coupons" value={String(totalCoupons)} />
        <KpiTile Icon={BarChart3} label="Total Uses" value={String(totalUses)} />
        <KpiTile Icon={Ticket} label="Event" value={String(categoryCounts.event || 0)} />
        <KpiTile Icon={Users} label="Partner" value={String(categoryCounts.partner || 0)} />
        <KpiTile Icon={Gift} label="Promo" value={String(categoryCounts.promo || 0)} />
      </View>

      {/* Category Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setActiveCategory(cat.id)}
              style={[s.tab, isActive && s.tabActive]}
            >
              <Icon size={14} color={isActive ? '#FFF' : (cat.color || SAC.muted)} />
              <Text style={[s.tabText, isActive && { color: '#FFF' }]}>{cat.label}</Text>
              {cat.id !== 'all' && (
                <View style={[s.badge, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : (cat.color || SAC.muted) + '22' }]}>
                  <Text style={[s.badgeText, { color: isActive ? '#FFF' : (cat.color || SAC.muted) }]}>{categoryCounts[cat.id] || 0}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Search */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, borderRadius: 10, paddingHorizontal: 12 }}>
        <Search size={16} color={SAC.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search coupons..."
          placeholderTextColor={SAC.dim}
          style={{ flex: 1, padding: '12px 0', color: SAC.text, fontSize: 14, fontFamily: FONTS.regular, outlineStyle: 'none' } as any}
        />
        {search ? <Pressable onPress={() => setSearch('')}><X size={16} color={SAC.muted} /></Pressable> : null}
      </View>

      {/* Edit Form */}
      {editing && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text, marginBottom: 12 }}>{editing._id ? 'Edit Coupon' : 'Create Coupon'}</Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 2 }}>
                <Label>Code</Label>
                <Field value={editing.code || ''} onChangeText={(v: string) => setEditing({ ...editing, code: v.toUpperCase() })} placeholder="e.g. SAVE20" />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Category</Label>
                <select
                  value={editing.category || 'marketplace'}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  style={{ backgroundColor: SAC.cardSolid, color: SAC.text, borderWidth: 1, borderColor: SAC.border, borderRadius: 9, padding: 10, fontSize: 13, fontFamily: FONTS.regular, width: '100%', outline: 'none' } as any}
                >
                  <option value="marketplace">Marketplace</option>
                  <option value="partner">Partner</option>
                  <option value="event">Event</option>
                  <option value="promo">Promo</option>
                </select>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Label>Event (leave empty for all events)</Label>
                <select
                  value={editing.event_id || ''}
                  onChange={(e) => setEditing({ ...editing, event_id: e.target.value || null })}
                  style={{ backgroundColor: SAC.cardSolid, color: SAC.text, borderWidth: 1, borderColor: SAC.border, borderRadius: 9, padding: 10, fontSize: 13, fontFamily: FONTS.regular, width: '100%', outline: 'none' } as any}
                >
                  <option value="">All Events (global)</option>
                  {showcases.map((sc: any) => (
                    <option key={sc.slug || sc.id} value={sc.slug || sc.id}>{sc.title || sc.slug}</option>
                  ))}
                </select>
              </View>
              <View style={{ flex: 1 }}>
                <Label>Discount Type</Label>
                <select
                  value={editing.discount_type || 'percentage'}
                  onChange={(e) => setEditing({ ...editing, discount_type: e.target.value, duration_months: e.target.value !== 'duration' ? null : (editing.duration_months || 3) })}
                  style={{ backgroundColor: SAC.cardSolid, color: SAC.text, borderWidth: 1, borderColor: SAC.border, borderRadius: 9, padding: 10, fontSize: 13, fontFamily: FONTS.regular, width: '100%', outline: 'none' } as any}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                  <option value="duration">Duration (months)</option>
                </select>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {editing.discount_type === 'duration' ? (
                <View style={{ flex: 1 }}>
                  <Label>Duration (months)</Label>
                  <select
                    value={String(editing.duration_months || 3)}
                    onChange={(e) => setEditing({ ...editing, duration_months: Number(e.target.value) })}
                    style={{ backgroundColor: SAC.cardSolid, color: SAC.text, borderWidth: 1, borderColor: SAC.border, borderRadius: 9, padding: 10, fontSize: 13, fontFamily: FONTS.regular, width: '100%', outline: 'none' } as any}
                  >
                    <option value="1">1 Month</option>
                    <option value="2">2 Months</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                  </select>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <Label>Discount Value</Label>
                  <Field value={String(editing.discount_value || '')} onChangeText={(v: string) => setEditing({ ...editing, discount_value: Number(v) })} placeholder="20" keyboardType="numeric" />
                </View>
              )}
            </View>
            <View>
              <Label>Vendor (leave empty for all)</Label>
              <select
                value={editing.vendor_id || ''}
                onChange={(e) => {
                  const vid = e.target.value;
                  const vname = vendors.find((v: any) => v.vendor_id === vid)?.name || '';
                  setEditing({ ...editing, vendor_id: vid || null, vendor_name: vname || null });
                }}
                style={{ backgroundColor: SAC.cardSolid, color: SAC.text, borderWidth: 1, borderColor: SAC.border, borderRadius: 9, padding: 10, fontSize: 13, fontFamily: FONTS.regular, width: '100%', outline: 'none' } as any}
              >
                <option value="">All Vendors (global)</option>
                {vendors.map((v: any) => (
                  <option key={v.vendor_id} value={v.vendor_id}>{v.name || v.vendor_id}</option>
                ))}
              </select>
            </View>
            <View>
              <Label>Partner / Brand Name (for partner coupons)</Label>
              <Field value={editing.partner_name || ''} onChangeText={(v: string) => setEditing({ ...editing, partner_name: v })} placeholder="e.g. Coursera, Spotify, Uber" />
            </View>
            <View>
              <Label>Website URL (where coupon is redeemed)</Label>
              <Field value={editing.website_url || ''} onChangeText={(v: string) => setEditing({ ...editing, website_url: v })} placeholder="https://coursera.org" />
            </View>
            <View>
              <Label>Logo URL (brand logo image)</Label>
              <Field value={editing.logo_url || ''} onChangeText={(v: string) => setEditing({ ...editing, logo_url: v })} placeholder="https://example.com/logo.png or paste image URL" />
            </View>
            <View>
              <Label>Description</Label>
              <Field value={editing.description || ''} onChangeText={(v: string) => setEditing({ ...editing, description: v })} placeholder="e.g. 20% off on all food items" />
            </View>
            <View>
              <Label>Redemption Instructions (shown to users)</Label>
              <Field value={editing.instructions || ''} onChangeText={(v: string) => setEditing({ ...editing, instructions: v })} placeholder="e.g. Show this code at Stall 5 to get discount" multiline numberOfLines={2} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <Pressable
                onPress={() => setEditing({ ...editing, locked: !editing.locked })}
                style={[s.lockToggle, editing.locked ? s.lockedActive : s.lockedInactive]}
              >
                {editing.locked ? <Lock size={16} color="#EF4444" /> : <Unlock size={16} color="#10B981" />}
                <Text style={{ fontSize: 13, fontWeight: '600', color: editing.locked ? '#EF4444' : '#10B981' }}>
                  {editing.locked ? 'Locked (unavailable)' : 'Unlocked (active)'}
                </Text>
              </Pressable>
              <Text style={{ fontSize: 11, color: SAC.muted }}>Locked coupons can't be used at checkout</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Label>Min Order Value (₹)</Label>
                <Field value={String(editing.min_order_value || '')} onChangeText={(v: string) => setEditing({ ...editing, min_order_value: Number(v) })} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Max Discount (₹)</Label>
                <Field value={String(editing.max_discount || '')} onChangeText={(v: string) => setEditing({ ...editing, max_discount: Number(v) })} placeholder="0 = no cap" keyboardType="numeric" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Label>Max Uses (0 = unlimited)</Label>
                <Field value={String(editing.max_uses || '')} onChangeText={(v: string) => setEditing({ ...editing, max_uses: Number(v) })} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Per User Limit (0 = unlimited)</Label>
                <Field value={String(editing.per_user_limit || '')} onChangeText={(v: string) => setEditing({ ...editing, per_user_limit: Number(v) })} placeholder="0" keyboardType="numeric" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <SecondaryButton onPress={() => setEditing(null)}><Text style={{ color: SAC.text }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={() => saveCoupon(editing)}><Text style={{ color: '#FFF' }}>{editing._id ? 'Update' : 'Create'}</Text></GradientButton>
            </View>
          </View>
        </Card>
      )}

      {/* Coupon List */}
      {loading ? (
        <ActivityIndicator color={SAC.violet} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Tag} title="No coupons found" sub={search ? 'Try a different search' : 'Create your first coupon to get started'} />
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map(coupon => {
            const catColor = CATEGORY_COLORS[coupon.category] || SAC.muted;
            return (
              <Card key={coupon._id || coupon.code} style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {coupon.logo_url ? (
                    <img src={coupon.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: `1px solid ${SAC.border}` } as any} />
                  ) : (
                    <View style={[s.categoryDot, { backgroundColor: catColor + '22', borderColor: catColor + '44' }]}>
                      <Tag size={14} color={catColor} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>{coupon.code}</Text>
                      <View style={[s.categoryBadge, { backgroundColor: catColor + '18', borderColor: catColor + '33' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: catColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{coupon.category || 'marketplace'}</Text>
                      </View>
                      {coupon.locked && (
                        <View style={[s.categoryBadge, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                          <Lock size={10} color="#EF4444" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444', marginLeft: 3 }}>LOCKED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: SAC.muted, marginTop: 2 }}>
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% off` :
                       coupon.discount_type === 'duration' ? `${coupon.duration_months || '?'} month${(coupon.duration_months || 0) !== 1 ? 's' : ''} access` :
                       `₹${coupon.discount_value} off`}
                      {coupon.partner_name ? ` · ${coupon.partner_name}` : coupon.vendor_name ? ` · ${coupon.vendor_name}` : ' · All vendors'}
                      {coupon.min_order_value ? ` · Min ₹${coupon.min_order_value}` : ''}
                    </Text>
                    {coupon.description ? (
                      <Text style={{ fontSize: 11, color: SAC.dim, marginTop: 2 }} numberOfLines={1}>{coupon.description}</Text>
                    ) : null}
                    {coupon.website_url ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Globe size={10} color="#10B981" />
                        <Text style={{ fontSize: 10.5, color: '#10B981' }} numberOfLines={1}>{coupon.website_url}</Text>
                      </View>
                    ) : null}
                    {coupon.instructions ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Info size={10} color="#3B82F6" />
                        <Text style={{ fontSize: 10.5, color: '#3B82F6' }} numberOfLines={1}>{coupon.instructions}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 11, color: SAC.muted }}>Used: {coupon.uses_count || 0}{coupon.max_uses ? `/${coupon.max_uses}` : ''}</Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Pressable onPress={() => setEditing(coupon)} style={s.actionBtn}>
                        <Pencil size={13} color="#A78BFA" />
                      </Pressable>
                      <Pressable onPress={() => deleteCoupon(coupon._id)} style={s.actionBtn}>
                        <Trash2 size={13} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tabActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  categoryDot: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  actionBtn: { padding: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  lockToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  lockedActive: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  lockedInactive: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
});
