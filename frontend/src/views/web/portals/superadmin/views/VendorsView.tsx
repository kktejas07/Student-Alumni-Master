/**
 * Super Admin → Vendors view.
 *
 * Dedicated management page for ECHO marketplace vendor login accounts:
 *  - KPI tiles: vendors, total revenue, orders, items sold
 *  - Vendor table with per-vendor revenue/order/fulfilment stats
 *  - Actions: create (emails credentials), edit, password-reset (emails),
 *    resend credentials, delete
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView, Platform, RefreshControl,
} from 'react-native';
import {
  Store, Plus, Pencil, KeyRound, Mail, Trash2, RefreshCw, Search, X,
  Wallet, ShoppingBag, Package,
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
      backgroundColor: T.cardSolid,
      color: T.text,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 9,
      padding: 10,
      fontSize: 13,
      fontFamily: FONTS.regular,
    }, props.style]}
    placeholderTextColor={T.dim}
    {...props}
  />
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ color: T.muted, fontSize: 11, marginBottom: 5, fontFamily: FONTS.bold, letterSpacing: 0.3 }}>{children}</Text>
);

const invRaw = (v: any) => v ?? 0;

export function VendorsView() {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const { toast, flash, hide } = useToast();

  const [vendors, setVendors] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({ revenue: 0, orders: 0, items_sold: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({});
  const [editing, setEditing] = useState<any>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [vRes, stRes] = await Promise.all([
        request<any>('/echo/admin/vendors'),
        request<any>('/echo/admin/vendors/stats'),
      ]);
      if (vRes.success) setVendors(vRes.data || []);
      if (stRes.success) {
        setStats(stRes.data || []);
        setTotals(stRes.totals || { revenue: 0, orders: 0, items_sold: 0 });
      }
    } catch (e) {
      console.error('Failed to load vendors', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleCreate = async () => {
    if (!form.vendor_id || !form.passcode) {
      flash('Vendor ID and Passcode are required', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await request<any>('/echo/admin/vendors', { method: 'POST', body: form });
      if (res.success) {
        const emailSent = res.email?.sent;
        flash(emailSent ? `Created ${form.vendor_id} and emailed credentials` : 'Vendor created (email not sent — no provider/address)', emailSent ? 'success' : 'warning');
        setCreating(false);
        setForm({});
        load(true);
      } else {
        flash(res.error || 'Failed to create vendor', 'error');
      }
    } catch (e: any) {
      flash(e.message || 'Failed to create vendor', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const res = await request<any>(`/echo/admin/vendors/${editing.vendor_id}`, {
        method: 'PUT',
        body: { name: editing.name, email: editing.email },
      });
      if (res.success) {
        flash('Vendor updated');
        setEditing(null);
        load(true);
      } else {
        flash(res.error || 'Update failed', 'error');
      }
    } catch (e: any) {
      flash(e.message || 'Update failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async (vendor: any) => {
    const pass = window.prompt(`New passcode for ${vendor.name || vendor.vendor_id} (emailed to ${vendor.email || 'no email on file'}):`, '');
    if (pass === null || !pass.trim()) {
      if (pass === '') flash('Passcode cannot be empty', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await request<any>(`/echo/admin/vendors/${vendor.vendor_id}/password-reset`, {
        method: 'POST',
        body: { passcode: pass.trim() },
      });
      if (res.success) {
        const emailSent = res.email?.sent;
        flash(emailSent ? 'Passcode reset and emailed' : 'Passcode reset (email not sent)', emailSent ? 'success' : 'warning');
        load(true);
      } else {
        flash(res.error || 'Reset failed', 'error');
      }
    } catch (e: any) {
      flash(e.message || 'Reset failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSendCredentials = async (vendor: any) => {
    setBusy(true);
    try {
      const res = await request<any>(`/echo/admin/vendors/${vendor.vendor_id}/send-credentials`, { method: 'POST' });
      if (res.success && res.email?.sent) {
        flash('Credentials emailed');
      } else {
        flash(`Could not send (${res.email?.detail || 'no email'})`, 'warning');
      }
    } catch (e: any) {
      flash(e.message || 'Send failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (vendor: any) => {
    if (!window.confirm(`Delete vendor "${vendor.name || vendor.vendor_id}"? This disables their portal login. Catalog items are kept.`)) return;
    setBusy(true);
    try {
      const res = await request<any>(`/echo/admin/vendors/${vendor.vendor_id}`, { method: 'DELETE' });
      if (res.success) {
        flash('Vendor deleted');
        load(true);
      } else {
        flash(res.error || 'Delete failed', 'error');
      }
    } catch (e: any) {
      flash(e.message || 'Delete failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const statMap: Record<string, any> = {};
  stats.forEach((st: any) => { statMap[st.vendor_id] = st; });

  const filtered = vendors.filter((v) => {
    const q = query.toLowerCase();
    return !q || (v.name || '').toLowerCase().includes(q) || (v.vendor_id || '').toLowerCase().includes(q) || (v.email || '').toLowerCase().includes(q);
  });

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 18, paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GRAD.to} />}
    >
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />

      {/* Header + create */}
      <View style={s.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <SectionLabel>ECHO MARKETPLACE</SectionLabel>
          <Text style={s.title}>Vendors</Text>
          <Text style={s.subtitle}>Manage vendor login accounts, track revenue & fulfil orders.</Text>
        </View>
        <GradientButton onPress={() => { setCreating((c) => !c); setEditing(null); }} loading={busy}>
          <Plus size={15} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 }}>New Vendor</Text>
        </GradientButton>
      </View>

      {/* KPI tiles */}
      <View style={s.kpiRow}>
        <KpiTile Icon={Store} label="Vendors" value={String(vendors.length)} />
        <KpiTile Icon={Wallet} label="Total Revenue" value={`₹${(totals.revenue || 0).toLocaleString('en-IN')}`} />
        <KpiTile Icon={ShoppingBag} label="Orders" value={String(totals.orders || 0)} />
        <KpiTile Icon={Package} label="Items Sold" value={String(totals.items_sold || 0)} />
        <KpiTile Icon={RefreshCw} label="Refunded" value={`₹${(totals.refunded_amount || 0).toLocaleString('en-IN')}`} />
      </View>

      {/* Create form */}
      {creating && (
        <Card>
          <View style={s.formHeader}>
            <Text style={{ color: T.text, fontFamily: FONTS.xbold, fontSize: 15 }}>Create Vendor Account</Text>
            <Pressable onPress={() => setCreating(false)} hitSlop={8}><X size={16} color={T.muted} /></Pressable>
          </View>
          <Text style={{ color: T.muted, fontSize: 12, marginBottom: 14 }}>The vendor signs in at <Text style={{ color: GRAD.to }}>/vendor-portal/login</Text> with these credentials. Credentials are emailed to the address below on creation.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Label>Vendor ID *</Label>
              <Field value={form.vendor_id || ''} onChangeText={(v: string) => setForm({ ...form, vendor_id: v.replace(/\s+/g, '_') })} placeholder="e.g. tastytacos" autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Label>Passcode *</Label>
              <Field value={form.passcode || ''} onChangeText={(v: string) => setForm({ ...form, passcode: v })} placeholder="e.g. 4821" secureTextEntry />
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Label>Name</Label>
              <Field value={form.name || ''} onChangeText={(v: string) => setForm({ ...form, name: v })} placeholder="e.g. Tasty Tacos" />
            </View>
            <View style={{ flex: 2, minWidth: 260 }}>
              <Label>Email (for login credentials)</Label>
              <Field value={form.email || ''} onChangeText={(v: string) => setForm({ ...form, email: v })} placeholder="vendor@example.com" autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <SecondaryButton onPress={() => setCreating(false)}><Text style={{ color: T.text }}>Cancel</Text></SecondaryButton>
            <GradientButton onPress={handleCreate} loading={busy}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 }}>Create & Email Credentials</Text></GradientButton>
          </View>
        </Card>
      )}

      {/* Vendors table */}
      <Card padded={false}>
        <View style={s.tableHeader}>
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Store size={16} color={GRAD.to} />
            <Text style={{ color: T.text, fontFamily: FONTS.xbold, fontSize: 15 }}>Vendor Accounts</Text>
            <StatusPill label={`${vendors.length}`} kind="info" />
          </View>
          <View style={s.searchWrap}>
            <Search size={13} color={T.dim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, ID or email…"
              placeholderTextColor={T.dim}
              style={s.searchInput}
            />
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
            <RefreshCw size={20} color={GRAD.to} />
            <Text style={{ color: T.muted, fontFamily: FONTS.med, fontSize: 12 }}>Loading vendors…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 24 }}>
            <EmptyState icon={Store} title={vendors.length === 0 ? 'No vendors yet' : 'No matches'}
              sub={vendors.length === 0 ? 'Create a vendor account so they can access the portal & sell at the event.' : 'Try a different search.'} />
          </View>
        ) : (
          <View style={s.tableBody}>
            {/* Head */}
            <View style={s.row}>
              <Text style={[s.th, { flex: 2.2 }]}>Vendor</Text>
              <Text style={[s.th, { flex: 1 }]}>Email</Text>
              <Text style={[s.th, { flex: 0.8, textAlign: 'right' }]}>Revenue</Text>
              <Text style={[s.th, { flex: 0.6, textAlign: 'right' }]}>Orders</Text>
              <Text style={[s.th, { flex: 0.7, textAlign: 'right' }]}>Fulfilled</Text>
              <Text style={[s.th, { flex: 0.6, textAlign: 'right' }]}>Refunded</Text>
              <Text style={[s.th, { flex: 1.2, textAlign: 'right' }]}>Actions</Text>
            </View>
            {filtered.map((v) => {
              const st = statMap[v.vendor_id];
              const revenue = st ? invRaw(st.revenue) : 0;
              const orders = st ? invRaw(st.orders) : 0;
              const fulfilled = st ? invRaw(st.fulfilled_items) : 0;
              const pending = st ? invRaw(st.pending_items) : 0;
              const refunded = st ? invRaw(st.refunded_items) : 0;
              const refundedAmt = st ? invRaw(st.refunded_amount) : 0;
              return (
                <View key={v.vendor_id} style={s.row}>
                  <View style={{ flex: 2.2, minWidth: 0 }}>
                    <Text style={{ color: T.text, fontFamily: FONTS.semi, fontSize: 13.5 }} numberOfLines={1}>{v.name || v.vendor_id}</Text>
                    <Text style={{ color: T.dim, fontSize: 11.5, fontFamily: FONTS.regular }}>{v.vendor_id}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: T.text, fontSize: 12.5 }} numberOfLines={1}>{v.email || '—'}</Text>
                    {v.email && <Pressable onPress={() => handleSendCredentials(v)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Mail size={10} color={GRAD.to} /><Text style={{ color: GRAD.to, fontFamily: FONTS.bold, fontSize: 10.5 }}>Email credentials</Text>
                    </Pressable>}
                  </View>
                  <Text style={{ flex: 0.8, textAlign: 'right', color: '#A3E635', fontFamily: FONTS.bold, fontSize: 13 }}>₹{revenue.toLocaleString('en-IN')}</Text>
                  <Text style={{ flex: 0.6, textAlign: 'right', color: T.text, fontFamily: FONTS.semi, fontSize: 13 }}>{orders}</Text>
                  <View style={{ flex: 0.7, alignItems: 'flex-end' }}>
                    {fulfilled + pending > 0 ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: T.green, fontFamily: FONTS.semi, fontSize: 12.5 }}>{fulfilled}</Text>
                        {pending > 0 && <Text style={{ color: '#FBBF24', fontSize: 10.5 }}>{pending} pending</Text>}
                      </View>
                    ) : <Text style={{ color: T.dim, fontSize: 12.5 }}>—</Text>}
                  </View>
                  <View style={{ flex: 0.6, alignItems: 'flex-end' }}>
                    {refunded > 0 ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: '#F87171', fontFamily: FONTS.semi, fontSize: 12.5 }}>{refunded}</Text>
                        <Text style={{ color: '#F87171', fontSize: 10.5 }}>₹{refundedAmt.toLocaleString('en-IN')}</Text>
                      </View>
                    ) : <Text style={{ color: T.dim, fontSize: 12.5 }}>—</Text>}
                  </View>
                  <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
                    <Pressable onPress={() => setEditing(v)} style={s.iconBtn}><Pencil size={14} color={T.muted} /></Pressable>
                    <Pressable onPress={() => handlePasswordReset(v)} style={s.iconBtn}><KeyRound size={14} color="#FBBF24" /></Pressable>
                    <Pressable onPress={() => handleDelete(v)} style={s.iconBtn}><Trash2 size={14} color="#F87171" /></Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Edit modal */}
      {editing && (
        <View style={s.overlay}>
          <Card style={{ width: 460, maxWidth: '92vw' as any }}>
            <View style={s.formHeader}>
              <Text style={{ color: T.text, fontFamily: FONTS.xbold, fontSize: 15 }}>Edit {editing.name || editing.vendor_id}</Text>
              <Pressable onPress={() => setEditing(null)} hitSlop={8}><X size={16} color={T.muted} /></Pressable>
            </View>
            <View style={{ gap: 12, marginTop: 6 }}>
              <View>
                <Label>Name</Label>
                <Field value={editing.name || ''} onChangeText={(val: string) => setEditing({ ...editing, name: val })} />
              </View>
              <View>
                <Label>Email</Label>
                <Field value={editing.email || ''} onChangeText={(val: string) => setEditing({ ...editing, email: val })} autoCapitalize="none" keyboardType="email-address" />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
                <SecondaryButton onPress={() => setEditing(null)}><Text style={{ color: T.text }}>Cancel</Text></SecondaryButton>
                <GradientButton onPress={handleUpdate} loading={busy}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 }}>Save Changes</Text></GradientButton>
              </View>
            </View>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  title: { color: T.text, fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.6, marginTop: 4 },
  subtitle: { color: T.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 6 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: T.border, flexWrap: 'wrap' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 7, height: 32, paddingHorizontal: 10,
    borderRadius: 9, backgroundColor: T.cardSolid, borderWidth: 1, borderColor: T.border,
    width: 240, maxWidth: '100%',
  },
  searchInput: { flex: 1, color: T.text, fontFamily: FONTS.med, fontSize: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  tableBody: { padding: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  th: { color: T.dim, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '120ms' } as any) : {}),
  },
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
});
