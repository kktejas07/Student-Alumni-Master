// @ts-nocheck
/**
 * Refund management (PY1).
 *
 * Lists every refund-eligible transaction with the amount still refundable,
 * issues full/partial refunds with a mandatory reason, and shows the
 * append-only refund ledger with CSV export.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView,
  ActivityIndicator, Platform, Modal,
} from 'react-native';
import {
  Undo2, RotateCcw, AlertTriangle, CheckCircle2, X, Download,
  Search, Wallet, ShieldCheck,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { GRAD, Card, IconBox, StatusPill, GradientButton, SecondaryButton, SectionLabel, useToast, Toast } from '../applekit';
import { request } from '@/src/models/services/api';

type Candidate = {
  payment_id: string;
  gateway: string;
  source: string;
  description: string;
  reference: string;
  payer: string;
  payer_email: string;
  date: string;
  amount: number;
  currency: string;
  refunded: number;
  refund_count: number;
  refundable: number;
  last_refund_reason: string;
};

type Refund = {
  id: string;
  payment_id: string;
  gateway: string;
  gateway_refund_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  description: string;
  payer: string;
  payer_email: string;
  created_at: string;
  requested_by?: { email?: string };
};

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function RefundsPanel() {
  const { toast, flash, hide } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [gateways, setGateways] = useState<any>({});
  const [totals, setTotals] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [active, setActive] = useState<'refund' | 'history'>('refund');

  const [target, setTarget] = useState<Candidate | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        request<any>('/admin/refunds/candidates', { method: 'GET', auth: true }),
        request<any>('/admin/refunds?limit=100', { method: 'GET', auth: true }),
      ]);
      setCandidates(c?.candidates || []);
      setReasons(c?.reasons || []);
      setGateways(c?.gateways || {});
      setTotals(c?.totals || {});
      setRefunds(r?.items || []);
    } catch (e: any) {
      flash(e?.message || 'Failed to load refunds', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const openRefund = (c: Candidate) => {
    setTarget(c);
    setAmount(String(c.refundable));
    setReason('');
    setNote('');
    setFormError(null);
  };

  const submitRefund = async () => {
    if (!target) return;
    setFormError(null);
    if (!reason) { setFormError('Choose a refund reason.'); return; }
    const value = Number(amount);
    if (!value || value <= 0) { setFormError('Enter a valid refund amount.'); return; }
    if (value > target.refundable) {
      setFormError(`Maximum refundable is ${money(target.refundable)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const r: any = await request<any>('/admin/refunds', {
        method: 'POST',
        auth: true,
        body: {
          payment_id: target.payment_id,
          amount: value,
          reason,
          reason_note: note.trim() || undefined,
        },
      });
      flash(r?.message || 'Refund processed');
      setTarget(null);
      await load();
    } catch (e: any) {
      setFormError(e?.message || 'Refund failed');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = async () => {
    try {
      const { tokenStore } = await import('@/src/models/services/api');
      const { getBaseUrl } = await import('@/src/lib/env');
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${getBaseUrl()}/api/admin/refunds/export.csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`Export failed (${resp.status})`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'refunds_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      flash('Refund ledger exported');
    } catch (e: any) {
      flash(e?.message || 'Export failed', 'error');
    }
  };

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? candidates.filter((c) =>
        [c.payer, c.payer_email, c.payment_id, c.description].join(' ').toLowerCase().includes(needle)
      )
    : candidates;

  return (
    <Card>
      <View style={rf.headRow}>
        <IconBox size={38}><Undo2 size={18} color={GRAD.to} /></IconBox>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={rf.title}>Refund Management</Text>
          <Text style={rf.sub}>
            Issue full or partial refunds with a reason through the payment gateway.
            Every refund is written to the append-only refund ledger.
          </Text>
        </View>
        <SecondaryButton onPress={exportCsv}><Download size={12} color={SAC.muted} /><Text style={rf.secText}>Export CSV</Text></SecondaryButton>
      </View>

      {/* Gateway status */}
      <View style={rf.gwRow}>
        <View style={rf.gwChip}>
          <ShieldCheck size={12} color={gateways.stripe ? '#34D399' : '#64748b'} />
          <Text style={[rf.gwText, { color: gateways.stripe ? '#34D399' : '#64748b' }]}>
            Stripe {gateways.stripe ? 'connected' : 'not connected'}
          </Text>
        </View>
        <View style={rf.gwChip}>
          <ShieldCheck size={12} color={gateways.razorpay ? '#34D399' : '#64748b'} />
          <Text style={[rf.gwText, { color: gateways.razorpay ? '#34D399' : '#64748b' }]}>
            Razorpay {gateways.razorpay ? 'connected' : 'not connected'}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={rf.totalText}>
          {totals.count || 0} txns · {money(totals.refundable || 0)} refundable
        </Text>
      </View>

      {/* Sub-tabs */}
      <View style={rf.seg}>
        {([['refund', 'Refund Queue'], ['history', `History (${refunds.length})`]] as const).map(([id, label]) => (
          <Pressable key={id} onPress={() => setActive(id)} style={[rf.segBtn, active === id && rf.segActive]}>
            <Text style={[rf.segText, active === id && rf.segTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {active === 'refund' && (
        <>
          <View style={rf.searchRow}>
            <Search size={14} color={SAC.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search payer, email, payment id…"
              placeholderTextColor={SAC.dim}
              autoCapitalize="none"
              style={rf.searchInput}
            />
          </View>

          {loading && !candidates.length && (
            <View style={rf.emptyBox}>
              <ActivityIndicator color={GRAD.to} />
              <Text style={rf.emptyText}>Loading transactions…</Text>
            </View>
          )}

          {!loading && filtered.length === 0 && (
            <View style={rf.emptyBox}>
              <Wallet size={20} color={SAC.dim} />
              <Text style={rf.emptyText}>No refundable transactions found.</Text>
            </View>
          )}

          {filtered.map((c) => (
            <View key={c.payment_id} style={rf.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={rf.rowTitle}>{c.description}</Text>
                <Text numberOfLines={1} style={rf.rowMeta}>
                  {c.payer} · {c.date} · {c.gateway}
                </Text>
                <Text numberOfLines={1} style={rf.rowId}>{c.payment_id}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Text style={rf.rowAmt}>{money(c.amount)}</Text>
                {c.refunded > 0 && (
                  <Text style={rf.rowRefunded}>−{money(c.refunded)} refunded</Text>
                )}
                <Text style={rf.rowRefundable}>{money(c.refundable)} left</Text>
              </View>
              <Pressable
                onPress={() => openRefund(c)}
                disabled={c.refundable <= 0}
                style={[rf.refundBtn, c.refundable <= 0 && rf.refundBtnDisabled]}
              >
                <RotateCcw size={13} color={c.refundable <= 0 ? '#64748b' : '#FCA5A5'} />
                <Text style={[rf.refundBtnText, c.refundable <= 0 && { color: '#64748b' }]}>Refund</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}

      {active === 'history' && (
        <View style={{ marginTop: 4 }}>
          {refunds.length === 0 ? (
            <View style={rf.emptyBox}>
              <Undo2 size={20} color={SAC.dim} />
              <Text style={rf.emptyText}>No refunds issued yet.</Text>
            </View>
          ) : (
            refunds.map((r) => (
              <View key={r.id} style={rf.row}>
                <View style={rf.histIcon}>
                  {r.status === 'succeeded'
                    ? <CheckCircle2 size={14} color="#34D399" />
                    : <AlertTriangle size={14} color="#F87171" />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={rf.rowTitle}>{r.description || r.payment_id}</Text>
                  <Text numberOfLines={1} style={rf.rowMeta}>
                    {r.reason} · {r.type} · {String(r.created_at || '').slice(0, 10)}
                  </Text>
                  <Text numberOfLines={1} style={rf.rowId}>{r.payment_id}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text style={rf.rowAmt}>−{money(r.amount)}</Text>
                  <StatusPill kind={r.status === 'succeeded' ? 'success' : 'danger'} label={String(r.status || '').toUpperCase()} />
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Refund dialog */}
      <Modal visible={!!target} transparent animationType="fade" onRequestClose={() => setTarget(null)}>
        <View style={rf.overlay}>
          <View style={rf.modal}>
            <View style={rf.modalHead}>
              <Text style={rf.modalTitle}>Issue Refund</Text>
              <Pressable onPress={() => setTarget(null)} style={rf.xBtn}><X size={16} color={SAC.muted} /></Pressable>
            </View>

            {target && (
              <>
                <View style={rf.modalMeta}>
                  <Text style={rf.modalMetaLabel}>Transaction</Text>
                  <Text style={rf.modalMetaValue}>{target.description}</Text>
                  <Text style={rf.modalMetaLabel}>Paid</Text>
                  <Text style={rf.modalMetaValue}>{money(target.amount)} via {target.gateway}</Text>
                  <Text style={rf.modalMetaLabel}>Refundable</Text>
                  <Text style={[rf.modalMetaValue, { color: '#86EFAC' }]}>{money(target.refundable)}</Text>
                </View>

                <Text style={rf.fieldLabel}>Refund amount (₹)</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder={String(target.refundable)}
                  placeholderTextColor={SAC.dim}
                  style={rf.input}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Pressable onPress={() => setAmount(String(target.refundable))} style={rf.chip}>
                    <Text style={rf.chipText}>Full · {money(target.refundable)}</Text>
                  </Pressable>
                  <Pressable onPress={() => setAmount(String(Math.round(target.refundable / 2 * 100) / 100))} style={rf.chip}>
                    <Text style={rf.chipText}>Half</Text>
                  </Pressable>
                </View>

                <Text style={[rf.fieldLabel, { marginTop: 14 }]}>Reason *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
                  {reasons.map((r) => (
                    <Pressable key={r} onPress={() => setReason(r)} style={[rf.chip, reason === r && rf.chipActive]}>
                      <Text style={[rf.chipText, reason === r && { color: '#F4F4FA' }]}>{r}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[rf.fieldLabel, { marginTop: 14 }]}>Note (optional)</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Extra context for the audit trail…"
                  placeholderTextColor={SAC.dim}
                  style={[rf.input, { height: 56, textAlignVertical: 'top' }]}
                  multiline
                />

                {formError && (
                  <View style={rf.errorBox}>
                    <AlertTriangle size={13} color="#F87171" />
                    <Text style={rf.errorText}>{formError}</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <SecondaryButton onPress={() => setTarget(null)} style={{ flex: 1 }}>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
                  </SecondaryButton>
                  <GradientButton onPress={submitRefund} loading={submitting} disabled={!reason} style={{ flex: 1 }}>
                    <RotateCcw size={13} color="#fff" />
                    <Text style={{ color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12 }}>
                      {submitting ? 'Processing…' : `Refund ${amount ? money(Number(amount)) : ''}`}
                    </Text>
                  </GradientButton>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </Card>
  );
}

const rf = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 15 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4, lineHeight: 17, maxWidth: 640 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  gwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  gwChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.border },
  gwText: { fontFamily: FONTS.bold, fontSize: 10.5 },
  totalText: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11 },
  seg: { flexDirection: 'row', gap: 6, marginTop: 14, marginBottom: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: SAC.border, borderRadius: 10, padding: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segActive: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)' },
  segText: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 12.5 },
  segTextActive: { color: '#FCD34D' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: SAC.border, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, color: '#e2e8f0', fontFamily: FONTS.med, fontSize: 12.5, paddingVertical: 10 },
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 26 },
  emptyText: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: SAC.border },
  rowTitle: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12.5 },
  rowMeta: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2 },
  rowId: { color: '#A78BFA', fontFamily: FONTS.mono, fontSize: 10, marginTop: 2 },
  rowAmt: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 13 },
  rowRefunded: { color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 10 },
  rowRefundable: { color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 10 },
  refundBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.10)', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  refundBtnDisabled: { borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  refundBtnText: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 11 },
  histIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  overlay: { flex: 1, backgroundColor: SAC.panel2, justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 18, maxWidth: 480, width: '100%', alignSelf: 'center' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 15 },
  xBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  modalMeta: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, marginBottom: 14, gap: 3 },
  modalMetaLabel: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 5 },
  modalMetaValue: { color: '#F4F4FA', fontFamily: FONTS.med, fontSize: 12 },
  fieldLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, marginBottom: 6 },
  input: { height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', color: '#F4F4FA', fontFamily: FONTS.med, fontSize: 13, paddingHorizontal: 12 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: SAC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  chipActive: { backgroundColor: 'rgba(245,158,11,0.20)', borderColor: 'rgba(245,158,11,0.45)' },
  chipText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 10, padding: 10, marginTop: 12 },
  errorText: { color: '#F87171', fontFamily: FONTS.med, fontSize: 12, flex: 1 },
});
