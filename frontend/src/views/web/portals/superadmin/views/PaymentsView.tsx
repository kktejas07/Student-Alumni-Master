// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, Pressable, Platform, useWindowDimensions, TextInput, ScrollView, Modal } from 'react-native';
import { ArrowDown, ArrowUp, CreditCard, Download, IndianRupee, TrendingUp, AlertTriangle, BadgePercent, Edit3, Trash2, X, Check, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '../tokens';
import { GRAD, Card, IconBox, KpiTile, StatusPill, GradientButton, SecondaryButton, SectionLabel, useToast, Toast } from '../applekit';
import { usePortalData } from '@/src/lib/portalApi';
import { request } from '@/src/models/services/api';

type Tx = { id: string; date: string; desc: string; type: string; amount: number; by: string; status: string };
type Tier = { id?: string; tier: string; cut: string; count: number; color?: string };
type FlatTier = { id?: string; name: string; cut_percent: number; color: string; sort_order: number };
const FALLBACK = { kpi: { gross: '₹0', payouts: '₹0', pending: '₹0', net: '₹0' }, ledger: [] as Tx[], stripe_balance: '₹0', has_live_stripe: false, tiers: [] as Tier[], echo: { paid_count: 0, pending_count: 0, revenue: 0, events: [] as any[] }, bookings_count: 0, wallet_revenue: 0 };

function PayoutTiersEditor({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [tiers, setTiers] = useState<FlatTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<FlatTier>({ name: '', cut_percent: 50, color: '#F59E0B', sort_order: 0 });

  const loadTiers = async () => { setLoading(true); try { const r = await request<{ ok: boolean; tiers: FlatTier[] }>('/admin/super/payout-tiers', { method: 'GET' }); if (r?.ok) setTiers(r.tiers); } catch {} finally { setLoading(false); } };
  React.useEffect(() => { if (visible) { setForm({ name: '', cut_percent: 50, color: '#F59E0B', sort_order: 0 }); setEditIdx(null); loadTiers(); } }, [visible]);
  React.useEffect(() => { if (tiers.length > 0 && editIdx === null) { const t = tiers[0]; setForm({ name: t.name, cut_percent: t.cut_percent, color: t.color, sort_order: t.sort_order }); setEditIdx(0); } }, [tiers]);
  const save = async () => { if (!form.name) return; setLoading(true); try { if (editIdx !== null && tiers[editIdx]?.id) { await request(`/admin/super/payout-tiers/${tiers[editIdx].id}`, { method: 'PUT', body: JSON.stringify(form), headers: { 'Content-Type': 'application/json' } }); } else { await request('/admin/super/payout-tiers', { method: 'POST', body: JSON.stringify(form), headers: { 'Content-Type': 'application/json' } }); } setForm({ name: '', cut_percent: 50, color: '#F59E0B', sort_order: 0 }); setEditIdx(null); await loadTiers(); } catch {} finally { setLoading(false); } };
  const remove = async (idx: number) => { const t = tiers[idx]; if (!t?.id) return; setLoading(true); try { await request(`/admin/super/payout-tiers/${t.id}`, { method: 'DELETE' }); await loadTiers(); } catch {} finally { setLoading(false); } };
  const startEdit = (idx: number) => { const t = tiers[idx]; setForm({ name: t.name, cut_percent: t.cut_percent, color: t.color, sort_order: t.sort_order }); setEditIdx(idx); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#1a1a2e', borderRadius: 16, padding: 18, maxWidth: 440, width: '100%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>Payout Tiers</Text>
            <Pressable onPress={onClose} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}><X size={16} color={SAC.muted} /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 340 }}>
            {tiers.map((t, i) => (
              <View key={t.id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.color }} />
                <View style={{ flex: 1 }}><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 }}>{t.name}</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 1 }}>{t.cut_percent}% cut</Text></View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable onPress={() => startEdit(i)} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}><Edit3 size={12} color={SAC.muted} /></Pressable>
                  <Pressable onPress={() => remove(i)} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}><Trash2 size={12} color="#FCA5A5" /></Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ marginTop: 14, gap: 8 }}>
            <Text style={{ color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.5 }}>{editIdx !== null ? 'Edit tier' : 'New tier'}</Text>
            <TextInput style={{ height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, paddingHorizontal: 12 }} placeholder="Name" placeholderTextColor={SAC.dim} value={form.name} onChangeText={v => setForm(s => ({ ...s, name: v }))} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={{ height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, paddingHorizontal: 12, flex: 1 }} placeholder="Cut %" placeholderTextColor={SAC.dim} value={String(form.cut_percent)} onChangeText={v => setForm(s => ({ ...s, cut_percent: Number(v) || 0 }))} keyboardType="numeric" />
              <TextInput style={{ height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, paddingHorizontal: 12, flex: 1 }} placeholder="Color hex" placeholderTextColor={SAC.dim} value={form.color} onChangeText={v => setForm(s => ({ ...s, color: v }))} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <SecondaryButton onPress={() => { setForm({ name: '', cut_percent: 50, color: '#F59E0B', sort_order: 0 }); setEditIdx(null); onClose(); }} style={{ flex: 1 }}><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={save} loading={loading} disabled={!form.name} style={{ flex: 1 }}><Check size={13} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{editIdx !== null ? 'Update' : 'Add'}</Text></GradientButton>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function PaymentsView() {
  const { toast, flash, hide } = useToast();
  const [exporting, setExporting] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutDone, setPayoutDone] = useState(false);
  const [tiersEditorOpen, setTiersEditorOpen] = useState(false);
  const { data, refresh } = usePortalData<typeof FALLBACK>('/admin/super/payments', FALLBACK);
  const { width } = useWindowDimensions();
  const stack = width < 1100;

  const doExport = async () => { setExporting(true); try { const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || ''; const tokenStore = (await import('@/src/models/services/api')).tokenStore; const token = await tokenStore.getAccess(); const resp = await fetch(base + '/api/admin/export/payments', { headers: token ? { Authorization: `Bearer ${token}` } : {} }); if (resp.ok) { const blob = await resp.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'payments_export.csv'; a.click(); URL.revokeObjectURL(url); flash('Payments CSV exported'); } else { flash('Export failed', 'error'); } } catch (e: any) { flash(e?.message || 'Export failed', 'error'); } finally { setExporting(false); } };
  const doPayout = async () => { setPayoutLoading(true); try { const r = await request<{ ok: boolean; message: string }>('/admin/super/payouts/initiate', { method: 'POST' }); setPayoutDone(true); flash(r?.message || 'Payout initiated'); setTimeout(() => setPayoutDone(false), 3000); } catch (e: any) { flash(e?.message || 'Payout failed', 'error'); } finally { setPayoutLoading(false); } };

  return (
    <View style={{ gap: 14 }}>
      <PayoutTiersEditor visible={tiersEditorOpen} onClose={() => { setTiersEditorOpen(false); refresh(); }} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <IconBox size={38}><IndianRupee size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>Payments</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 760 }}>Stripe ledger, mentor payouts and refund queue across the platform.</Text></View>
          <SecondaryButton onPress={doExport} loading={exporting}><Download size={12} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{exporting ? 'Exporting…' : 'Export CSV'}</Text></SecondaryButton>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <KpiTile Icon={TrendingUp} label="GROSS REVENUE" value={data.kpi.gross} delta={`${data.echo?.paid_count || 0} paid registrations`} deltaKind="success" />
        <KpiTile Icon={ArrowUp} label="PAYOUTS (EST)" value={data.kpi.payouts} delta="10% platform fee" deltaKind="info" />
        <KpiTile Icon={AlertTriangle} label="PENDING PAYMENTS" value={data.kpi.pending} delta={`${data.echo?.pending_count || 0} awaiting payment`} deltaKind="warn" />
        <KpiTile Icon={IndianRupee} label="NET REVENUE" value={data.kpi.net} delta={`${data.bookings_count || 0} bookings`} deltaKind="success" />
      </View>

      {(data.echo?.events?.length || 0) > 0 && (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>Event Revenue</Text><StatusPill kind="info" label={`${data.echo.events.length} events`} /></View>
          <View style={{ marginTop: 12, gap: 8 }}>
            {data.echo.events.map((ev: any, i: number) => (
              <View key={ev.slug + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GRAD.to }} />
                <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 }}>{ev.title}</Text><Text numberOfLines={1} style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 1 }}>{ev.count} paid · {ev.slug}</Text></View>
                <Text style={{ color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 12.5 }}>₹{Number(ev.revenue || 0).toLocaleString('en-IN')}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        <Card style={{ flex: stack ? undefined : 2.4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>Stripe Ledger</Text><StatusPill kind="info" label={`${data.ledger.length} txns`} /></View>
          <View style={{ marginTop: 14 }}>
            {data.ledger.map((t) => {
              const isOut = t.type === 'payout' || t.type === 'refund';
              return (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                  <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: isOut ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)' }}>
                    {isOut ? <ArrowUp size={13} color="#FCA5A5" /> : <ArrowDown size={13} color="#86EFAC" />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 }}>{t.desc}</Text><Text numberOfLines={1} style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2 }}>{t.id} · {t.date} · {t.by}</Text></View>
                  {t.status === 'pending' ? <StatusPill kind="warn" label="PENDING" /> : <StatusPill kind={t.type === 'refund' ? 'danger' : t.type === 'payout' ? 'info' : 'success'} label={t.type.toUpperCase()} />}
                  <Text style={{ fontFamily: FONTS.xbold, fontSize: 13, minWidth: 90, textAlign: 'right', color: isOut ? '#FCA5A5' : '#86EFAC' }}>{isOut ? '-' : '+'}₹{t.amount.toLocaleString('en-IN')}</Text>
                </View>
              );
            })}
            {data.ledger.length === 0 && <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, textAlign: 'center', paddingVertical: 24 }}>No transactions yet.</Text>}
          </View>
        </Card>

        <View style={{ width: stack ? '100%' : 320, gap: 12 }}>
          <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 18, gap: 4 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.30)' }}><CreditCard size={16} color="#fff" /></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.8, marginTop: 10 }}>STRIPE BALANCE</Text>
              {data.has_live_stripe && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}><Zap size={10} color="#86EFAC" /><Text style={{ color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 9 }}>LIVE</Text></View>)}
            </View>
            <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 32, marginTop: 4, letterSpacing: -0.6 }}>{data.stripe_balance}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.med, fontSize: 11.5, marginTop: 6 }}>{data.has_live_stripe ? 'Live Stripe balance' : 'Connect Stripe in Settings for live balance'}</Text>
            <Pressable style={{ marginTop: 14, height: 38, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }} onPress={doPayout} disabled={payoutLoading}>
              <Text style={{ color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 12 }}>{payoutLoading ? 'Processing…' : payoutDone ? 'Payout Initiated!' : 'Initiate payout'}</Text>
            </Pressable>
          </LinearGradient>

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionLabel>PAYOUT TIERS</SectionLabel>
              <Pressable onPress={() => setTiersEditorOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.10)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.30)' }}>
                <Edit3 size={11} color={GRAD.to} /><Text style={{ color: GRAD.to, fontFamily: FONTS.bold, fontSize: 10.5 }}>Edit</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: 12, gap: 10 }}>
              {data.tiers.map((t, i) => (
                <View key={t.tier + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.color || GRAD.to }} />
                  <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{t.tier}</Text><Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 }}>{t.count} active mentor{t.count === 1 ? '' : 's'}</Text></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.10)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.30)' }}>
                    <BadgePercent size={11} color={GRAD.to} /><Text style={{ color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 12 }}>{t.cut}</Text>
                  </View>
                </View>
              ))}
              {data.tiers.length === 0 && <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, paddingVertical: 8 }}>No tiers configured.</Text>}
            </View>
          </Card>
        </View>
      </View>
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}
