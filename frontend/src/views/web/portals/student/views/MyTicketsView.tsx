/**
 * Student → My Tickets — Echo event registrations, passes, coupons, and invoices.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ticket, CheckCircle, Download, ShieldCheck, Eye, QrCode, ExternalLink, X, Lock } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GlassCard } from '../glass';
import { EmptyState } from '../EmptyState';
import { api, tokenStore } from '@/src/models/services/api';
import { resolveImageUrl } from '@/src/models/services/api';

type Coupon = {
  coupon_code: string;
  session_name?: string;
  session_key?: string;
  used?: boolean;
  qr_url?: string;
  session_locked?: boolean;
};

type Registration = {
  id?: string;
  slug?: string;
  full_name?: string;
  email?: string;
  event_title?: string;
  showcase_title?: string;
  payment_status?: string;
  status?: string;
  registered_at?: string;
};

type Invoice = {
  invoice_no: string;
  event_title?: string;
  amount?: number;
  currency?: string;
  payment_id?: string;
};

type RegItem = {
  registration: Registration;
  coupons: Coupon[];
  invoice: Invoice | null;
};

export function MyTicketsView() {
  const router = useRouter();
  const [items, setItems] = useState<RegItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewCoupon, setPreviewCoupon] = useState<Coupon | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.myEchoRegistrations();
      setItems(r?.items || []);
    } catch {
      /* not authed / empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openInvoice = async (invoiceNo: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    setDownloading(invoiceNo);
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${base}/api/echo/invoices/${invoiceNo}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error('not available');
      const data = await resp.json();
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(data.html);
        w.document.close();
        w.focus();
        w.print();
      }
    } catch {
      /* ignore */
    } finally {
      setDownloading(null);
    }
  };

  const openTicket = async (regId: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${base}/api/echo/tickets/${regId}?format=json`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error('not available');
      const data = await resp.json();
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(data.html);
        w.document.close();
        w.focus();
      }
    } catch {
      /* ignore */
    }
  };

  const totalPaid = items.reduce((a, i) => a + Number(i.invoice?.amount || 0), 0);

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Text style={s.h1}>My Tickets & Passes</Text>
        <Text style={s.sub}>
          {items.length} event{items.length === 1 ? '' : 's'} · {items.reduce((a, i) => a + i.coupons.length, 0)} coupon{items.reduce((a, i) => a + i.coupons.length, 0) === 1 ? '' : 's'} · total paid ₹{totalPaid.toLocaleString('en-IN')}
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={SC.accentBright} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          variant="generic"
          title="No tickets yet"
          body="When you register and pay for an ECHO event, your ticket, passes and coupons will appear here."
          compact
        />
      ) : (
        items.map((item, idx) => {
          const reg = item.registration;
          const inv = item.invoice;
          const slug = reg.slug || '';
          const title = reg.event_title || reg.showcase_title || 'Event';
          const paid = reg.payment_status === 'paid';

          return (
            <GlassCard key={reg.id || idx} delay={idx * 40} radius={14} padding={16} style={{ gap: 14 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[s.iconBox, { backgroundColor: paid ? 'rgba(34,197,94,0.10)' : 'rgba(251,191,36,0.10)', borderColor: paid ? 'rgba(34,197,94,0.30)' : 'rgba(251,191,36,0.30)' }]}>
                  <Ticket size={18} color={paid ? '#34D399' : '#FBBF24'} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.title}>{title}</Text>
                  <Text style={s.meta}>
                    {reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : ''}
                    {inv?.invoice_no ? ` · ${inv.invoice_no}` : ''}
                  </Text>
                </View>
                <View style={[s.paidPill, { backgroundColor: paid ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)', borderColor: paid ? 'rgba(34,197,94,0.35)' : 'rgba(251,191,36,0.35)' }]}>
                  <CheckCircle size={11} color={paid ? '#34D399' : '#FBBF24'} />
                  <Text style={[s.paidText, { color: paid ? '#34D399' : '#FBBF24' }]}>{paid ? 'PAID' : 'PENDING'}</Text>
                </View>
              </View>

              {/* Pass / Ticket button */}
              <Pressable
                onPress={() => openTicket(reg.id || '')}
                style={({ hovered }: any) => [s.primaryBtn, hovered && { opacity: 0.85 }]}
              >
                <Ticket size={13} color="#fff" />
                <Text style={s.btnText}>View Event Pass</Text>
              </Pressable>

              {/* Coupons section */}
              {item.coupons.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={s.sectionTitle}>Session Passes ({item.coupons.length})</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {item.coupons.map((c) => (
                      <Pressable
                        key={c.coupon_code}
                        onPress={() => setPreviewCoupon(c)}
                        style={[s.couponChip, c.used && s.couponChipUsed]}
                      >
                        <Ticket size={18} color={c.session_locked ? '#F59E0B' : c.used ? '#10B981' : '#A78BFA'} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.couponName, c.used && s.couponNameUsed]} numberOfLines={1}>
                            {c.session_name || c.session_key}
                          </Text>
                          <Text style={[s.couponCode, c.session_locked && { color: 'rgba(255,255,255,0.25)', letterSpacing: 3 }]}>
                            {c.session_locked ? '****' : c.coupon_code}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Invoice + actions */}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {inv?.invoice_no ? (
                  <Pressable
                    onPress={() => openInvoice(inv.invoice_no)}
                    style={({ hovered }: any) => [s.secondaryBtn, hovered && { opacity: 0.85 }]}
                  >
                    {downloading === inv.invoice_no ? (
                      <ActivityIndicator size="small" color={SC.accentBright} />
                    ) : (
                      <>
                        <Download size={12} color={SC.accentBright} />
                        <Text style={s.secondaryBtnText}>Invoice</Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
                {slug ? (
                  <Pressable
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.location.href = `/echo/${slug}/coupons`;
                      } else {
                        router.push(`/echo/${slug}/coupons`);
                      }
                    }}
                    style={({ hovered }: any) => [s.secondaryBtn, { borderColor: 'rgba(167,139,250,0.30)' }, hovered && { opacity: 0.85 }]}
                  >
                    <QrCode size={12} color="#A78BFA" />
                    <Text style={[s.secondaryBtnText, { color: '#C4B5FD' }]}>All Coupons</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={11} color={SC.muted} />
                <Text style={s.footNote}>A copy was emailed to you on registration.</Text>
              </View>
            </GlassCard>
          );
        })
      )}

      {/* Coupon preview modal */}
      {previewCoupon && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewCoupon(null)}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 16 }}>
                  {previewCoupon.session_name || 'Session Pass'}
                </Text>
                <Pressable onPress={() => setPreviewCoupon(null)} style={{ padding: 4 }}>
                  <X size={18} color={SC.muted} />
                </Pressable>
              </View>
              <View style={{ alignItems: 'center', gap: 12 }}>
                <Ticket size={40} color={previewCoupon.session_locked ? '#F59E0B' : '#A78BFA'} />
                <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 24, letterSpacing: previewCoupon.session_locked ? 3 : 2 }}>
                  {previewCoupon.session_locked ? '****-****-****' : previewCoupon.coupon_code}
                </Text>
                <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 13 }}>
                  {previewCoupon.session_locked ? 'This session is currently locked' : previewCoupon.used ? 'Already used' : 'Show this code at the venue'}
                </Text>
                {/* QR Code image — only when unlocked */}
                {!previewCoupon.session_locked && previewCoupon.coupon_code && (
                  <View style={{ marginTop: 8, padding: 12, backgroundColor: '#fff', borderRadius: 12 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://studentalumni.ai'}/echo/scan/${previewCoupon.coupon_code}`)}`}
                      alt={`QR code for ${previewCoupon.coupon_code}`}
                      style={{ width: 200, height: 200 }}
                    />
                  </View>
                )}
                {previewCoupon.session_locked && (
                  <View style={{ marginTop: 8, padding: 20, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', alignItems: 'center', gap: 8 }}>
                    <Lock size={28} color="#F59E0B" />
                    <Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 14 }}>Not yet released</Text>
                    <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' }}>
                      This session coupon will be available when the session opens.
                    </Text>
                  </View>
                )}
                <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 10, marginTop: 4 }}>
                  Scan this QR code at the venue
                </Text>
              </View>
              <Pressable
                onPress={() => setPreviewCoupon(null)}
                style={[s.primaryBtn, { marginTop: 16, width: '100%', justifyContent: 'center' }]}
              >
                <Text style={s.btnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  h1: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },
  iconBox: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },
  paidPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  paidText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.6 },
  sectionTitle: { color: SC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.8, marginBottom: 2 },
  couponChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 140,
  },
  couponChipUsed: { opacity: 0.5 },
  couponIcon: { fontSize: 18 },
  couponName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  couponNameUsed: { textDecorationLine: 'line-through', color: SC.muted },
  couponCode: { color: SC.muted, fontFamily: FONTS.med, fontSize: 10, marginTop: 2 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10,
    backgroundColor: SC.accentBright,
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.30)', backgroundColor: 'rgba(34,197,94,0.06)',
  },
  btnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  secondaryBtnText: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 11 },
  footNote: { color: SC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1a1b3a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
});
