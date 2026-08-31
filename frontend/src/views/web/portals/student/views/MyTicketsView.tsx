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
  used_at?: string;
  scanned_lat?: number;
  scanned_lng?: number;
  qr_url?: string;
  session_locked?: boolean;
};

type Registration = {
  id?: string;
  slug?: string;
  status?: string;
  checked_in_at?: string;
  scanned_lat?: number;
  scanned_lng?: number;
  email?: string;
  event_title?: string;
  showcase_title?: string;
  payment_status?: string;
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
    const w = window.open('', '_blank');
    if (!w) {
      alert("Popup blocked! Please allow popups to view your invoice.");
      return;
    }
    w.document.write('<div style="font-family:sans-serif;padding:20px;color:#888;">Generating invoice...</div>');
    setDownloading(invoiceNo);
    try {
      const data = await api.getEchoInvoice(invoiceNo);
      w.document.open();
      w.document.write(data.html);
      w.document.close();
      w.focus();
      w.print();
    } catch {
      w.close();
      alert("Failed to load invoice.");
    } finally {
      setDownloading(null);
    }
  };

  const openTicket = async (regId: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const w = window.open('', '_blank');
    if (!w) {
      alert("Popup blocked! Please allow popups to view your event pass.");
      return;
    }
    w.document.write('<div style="font-family:sans-serif;padding:20px;color:#888;">Loading event pass...</div>');
    try {
      const data = await api.getEchoTicket(regId);
      w.document.open();
      w.document.write(data.html);
      w.document.close();
      w.focus();
    } catch {
      w.close();
      alert("Failed to load event pass.");
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
            <GlassCard key={reg.id || idx} delay={idx * 40} radius={18} padding={0} style={{ overflow: 'hidden' }}>
              <View style={s.ticketContainer}>
                {/* Left Section: Event Info */}
                <View style={s.ticketLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.eventLabel}>ECHO EVENT</Text>
                      <Text style={s.title}>{title}</Text>
                      <Text style={s.meta}>
                        {reg.registered_at ? new Date(reg.registered_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                        {inv?.invoice_no ? ` · Invoice #${inv.invoice_no}` : ''}
                      </Text>
                    </View>
                    <View style={[s.paidPill, { backgroundColor: paid ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)', borderColor: paid ? 'rgba(34,197,94,0.35)' : 'rgba(251,191,36,0.35)' }]}>
                      <CheckCircle size={11} color={paid ? '#34D399' : '#FBBF24'} />
                      <Text style={[s.paidText, { color: paid ? '#34D399' : '#FBBF24' }]}>{paid ? 'PAID' : 'PENDING'}</Text>
                    </View>
                  </View>

                  <View style={s.actionRow}>
                    <Pressable
                      onPress={() => openTicket(reg.id || '')}
                      style={({ hovered }: any) => [s.primaryBtn, hovered && { opacity: 0.85 }]}
                    >
                      <Ticket size={13} color="#fff" />
                      <Text style={s.btnText}>View Event Pass</Text>
                    </Pressable>
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
                        style={({ hovered }: any) => [s.secondaryBtn, { borderColor: 'rgba(167,139,250,0.30)', backgroundColor: 'rgba(167,139,250,0.06)' }, hovered && { opacity: 0.85 }]}
                      >
                        <QrCode size={12} color="#A78BFA" />
                        <Text style={[s.secondaryBtnText, { color: '#C4B5FD' }]}>All Coupons</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
                    <ShieldCheck size={11} color={SC.muted} />
                    <Text style={s.footNote}>A copy was emailed to you on registration.</Text>
                  </View>
                </View>

                {/* Perforated Divider */}
                {/* Use a web-only dashed border for a ticket-like separation */}
                {Platform.OS === 'web' ? (
                  <div style={{ width: 1, borderLeft: '2px dashed rgba(255, 255, 255, 0.1)', margin: '16px 0', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: -32, left: -11, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#07070E' }} />
                    <div style={{ position: 'absolute', bottom: -32, left: -11, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#07070E' }} />
                  </div>
                ) : (
                  <View style={{ width: 1, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.1)', marginVertical: 16 }} />
                )}

                {/* Right Section: Coupons */}
                <View style={s.ticketRight}>
                  <Text style={s.sectionTitle}>SESSION PASSES</Text>
                  {item.coupons.length > 0 ? (
                    <View style={s.couponGrid}>
                      {item.coupons.map((c) => (
                        <Pressable
                          key={c.coupon_code}
                          onPress={() => setPreviewCoupon(c)}
                          style={[s.couponCompactChip, c.used && s.couponChipUsed]}
                        >
                          <Ticket size={16} color={c.session_locked ? '#F59E0B' : c.used ? '#10B981' : '#A78BFA'} />
                          <View style={{ flex: 1 }}>
                            <Text style={[s.couponNameCompact, c.used && s.couponNameUsed]} numberOfLines={1}>
                              {c.session_name || c.session_key}
                            </Text>
                            <Text style={[s.couponCodeCompact, c.session_locked && { color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }]}>
                              {c.session_locked ? '****' : c.coupon_code}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 8 }}>
                      No session passes
                    </Text>
                  )}
                </View>
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
                {!previewCoupon.session_locked && previewCoupon.coupon_code && !previewCoupon.used && (
                  <View style={{ marginTop: 8, padding: 12, backgroundColor: '#fff', borderRadius: 12 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://studentalumni.ai'}/echo/scan/${previewCoupon.coupon_code}`)}`}
                      alt={`QR code for ${previewCoupon.coupon_code}`}
                      style={{ width: 200, height: 200 }}
                    />
                  </View>
                )}
                {/* Details if used */}
                {previewCoupon.used && (
                  <View style={{ marginTop: 8, padding: 20, backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', alignItems: 'center', gap: 8, width: '100%' }}>
                    <CheckCircle size={28} color="#10B981" />
                    <Text style={{ color: '#34D399', fontFamily: FONTS.bold, fontSize: 14 }}>Coupon Availed</Text>
                    {previewCoupon.used_at && (
                      <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' }}>
                        At: {new Date(previewCoupon.used_at).toLocaleString()}
                      </Text>
                    )}
                    {previewCoupon.scanned_lat && previewCoupon.scanned_lng && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${previewCoupon.scanned_lat},${previewCoupon.scanned_lng}`} target="_blank" rel="noopener noreferrer" style={{ marginTop: 4, textDecoration: 'none' }}>
                        <Text style={{ color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 12, textAlign: 'center' }}>
                          View Check-in Location
                        </Text>
                      </a>
                    )}
                  </View>
                )}
                {previewCoupon.session_locked && (
                  <View style={{ marginTop: 8, padding: 20, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', alignItems: 'center', gap: 8, width: '100%' }}>
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
  h1: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 24, letterSpacing: -0.6 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 4 },
  
  ticketContainer: {
    // using web-only layout props for responsive flex wrap where supported, otherwise just row
    ...(Platform.OS === 'web' ? { display: 'flex', flexWrap: 'wrap' as 'wrap', flexDirection: 'row' } : { flexDirection: 'row' }),
  },
  ticketLeft: {
    flex: 1,
    minWidth: 280,
    padding: 24,
    paddingRight: 30,
  },
  ticketRight: {
    flex: 1,
    minWidth: 240,
    maxWidth: Platform.OS === 'web' ? 320 : '100%',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  
  eventLabel: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20, letterSpacing: -0.3 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 6 },
  
  paidPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  paidText: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.6 },
  
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 24 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 38, borderRadius: 10,
    backgroundColor: SC.accentBright,
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.30)', backgroundColor: 'rgba(34,197,94,0.06)',
  },
  btnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  secondaryBtnText: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 12 },
  footNote: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11 },
  
  sectionTitle: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1.2, marginBottom: 12 },
  couponGrid: { gap: 10 },
  couponCompactChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  couponChipUsed: { opacity: 0.5 },
  couponNameCompact: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  couponNameUsed: { textDecorationLine: 'line-through', color: SC.muted },
  couponCodeCompact: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 1 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#11111c', borderRadius: 20, padding: 28, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
});
