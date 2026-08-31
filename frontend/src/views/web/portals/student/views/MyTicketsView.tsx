/**
 * Student → My Tickets — Echo event registrations, passes, coupons, and invoices.
 * Redesigned for a compact, premium ticket-stub aesthetic.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ticket, CheckCircle, Download, ShieldCheck, QrCode, X, Lock, Calendar, MapPin, User, ArrowRight } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { EmptyState } from '../EmptyState';
import { api } from '@/src/models/services/api';

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
  email?: string;
  full_name?: string;
  event_title?: string;
  showcase_title?: string;
  payment_status?: string;
  registered_at?: string;
  registration_type?: string;
  team_name?: string;
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

function sessionColor(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('lunch') || n.includes('meal'))
    return { bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.30)', text: '#FB923C', icon: '#FB923C' };
  if (n.includes('breakfast'))
    return { bg: 'rgba(34,211,238,0.10)', border: 'rgba(34,211,238,0.25)', text: '#22D3EE', icon: '#22D3EE' };
  if (n.includes('dinner') || n.includes('snack'))
    return { bg: 'rgba(232,121,249,0.10)', border: 'rgba(232,121,249,0.25)', text: '#E879F9', icon: '#E879F9' };
  if (n.includes('swag') || n.includes('shirt') || n.includes('kit'))
    return { bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', text: '#FCD34D', icon: '#FCD34D' };
  return { bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)', text: '#A78BFA', icon: '#A78BFA' };
}

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
    } catch { /* not authed / empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openInvoice = async (invoiceNo: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const w = window.open('', '_blank');
    if (!w) { alert('Popup blocked! Please allow popups to view your invoice.'); return; }
    w.document.write('<div style="font-family:sans-serif;padding:20px;color:#888;">Generating invoice...</div>');
    setDownloading(invoiceNo);
    try {
      const data = await api.getEchoInvoice(invoiceNo);
      w.document.open(); w.document.write(data.html); w.document.close(); w.focus(); w.print();
    } catch { w.close(); alert('Failed to load invoice.'); }
    finally { setDownloading(null); }
  };

  const openTicket = async (regId: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const w = window.open('', '_blank');
    if (!w) { alert('Popup blocked! Please allow popups to view your event pass.'); return; }
    w.document.write('<div style="font-family:sans-serif;padding:20px;color:#888;">Loading event pass...</div>');
    try {
      const data = await api.getEchoTicket(regId);
      w.document.open(); w.document.write(data.html); w.document.close(); w.focus();
    } catch { w.close(); alert('Failed to load event pass.'); }
  };

  const totalPaid = items.reduce((a, i) => a + Number(i.invoice?.amount || 0), 0);
  const totalCoupons = items.reduce((a, i) => a + i.coupons.length, 0);
  const usedCoupons = items.reduce((a, i) => a + i.coupons.filter(c => c.used).length, 0);

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60 }}>
        <ActivityIndicator size="large" color={SC.accentBright} />
        <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 12 }}>Loading tickets...</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 20 }}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.h1}>My Tickets & Passes</Text>
          <Text style={s.sub}>
            {items.length} event{items.length !== 1 ? 's' : ''} · {totalCoupons} pass{totalCoupons !== 1 ? 'es' : ''} · ₹{totalPaid.toLocaleString('en-IN')} paid
          </Text>
        </View>
        {usedCoupons > 0 && (
          <View style={s.usedBadge}>
            <CheckCircle size={11} color="#34D399" />
            <Text style={{ color: '#34D399', fontFamily: FONTS.bold, fontSize: 11 }}>{usedCoupons} used</Text>
          </View>
        )}
      </View>

      {items.length === 0 ? (
        <EmptyState
          variant="generic"
          title="No tickets yet"
          body="When you register for an ECHO event, your ticket and session passes will appear here."
          compact
        />
      ) : (
        items.map((item, idx) => {
          const reg = item.registration;
          const inv = item.invoice;
          const slug = reg.slug || '';
          const title = reg.event_title || reg.showcase_title || 'Event';
          const paid = reg.payment_status === 'paid';
          const checkedIn = !!reg.checked_in_at;

          return (
            <View key={reg.id || idx} style={s.ticketCard}>
              {/* Accent bar */}
              <View style={[s.accentBar, { backgroundColor: checkedIn ? '#10B981' : paid ? '#6366F1' : '#F59E0B' }]} />

              <View style={s.ticketBody}>
                {/* Left / main section */}
                <View style={s.ticketMain}>
                  <View style={s.topRow}>
                    <View style={s.echoBadge}>
                      <Text style={s.echoLabel}>ECHO EVENT</Text>
                    </View>
                    <View style={[s.statusChip,
                      checkedIn
                        ? { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' }
                        : paid
                          ? { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)' }
                          : { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }
                    ]}>
                      {checkedIn
                        ? <CheckCircle size={10} color="#34D399" />
                        : paid
                          ? <Ticket size={10} color="#818CF8" />
                          : null}
                      <Text style={[s.statusText, { color: checkedIn ? '#34D399' : paid ? '#818CF8' : '#F59E0B' }]}>
                        {checkedIn ? 'CHECKED IN' : paid ? 'CONFIRMED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.eventTitle}>{title}</Text>

                  <View style={s.metaRow}>
                    {reg.registered_at && (
                      <View style={s.metaItem}>
                        <Calendar size={10} color={SC.muted} />
                        <Text style={s.metaText}>
                          {new Date(reg.registered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                    )}
                    {reg.registration_type === 'team' && reg.team_name && (
                      <View style={s.metaItem}>
                        <User size={10} color={SC.muted} />
                        <Text style={s.metaText}>{reg.team_name}</Text>
                      </View>
                    )}
                    {inv?.invoice_no && (
                      <Text style={[s.metaText, { color: 'rgba(255,255,255,0.2)' }]}>#{inv.invoice_no}</Text>
                    )}
                  </View>

                  {checkedIn && reg.checked_in_at && (
                    <View style={s.checkinBadge}>
                      <CheckCircle size={12} color="#10B981" />
                      <Text style={{ color: '#34D399', fontFamily: FONTS.bold, fontSize: 12 }}>
                        Attended · {new Date(reg.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}

                  <View style={s.actionRow}>
                    <Pressable
                      onPress={() => openTicket(reg.id || '')}
                      style={({ hovered }: any) => [s.primaryBtn, hovered && { opacity: 0.85 }]}
                    >
                      <Ticket size={12} color="#fff" />
                      <Text style={s.btnText}>View Pass</Text>
                      <ArrowRight size={12} color="rgba(255,255,255,0.5)" />
                    </Pressable>
                    {inv?.invoice_no && (
                      <Pressable
                        onPress={() => openInvoice(inv.invoice_no)}
                        style={({ hovered }: any) => [s.ghostBtn, hovered && { opacity: 0.85 }]}
                      >
                        {downloading === inv.invoice_no
                          ? <ActivityIndicator size="small" color={SC.muted} />
                          : <><Download size={11} color={SC.muted} /><Text style={s.ghostBtnText}>Invoice</Text></>}
                      </Pressable>
                    )}
                    {slug && (
                      <Pressable
                        onPress={() => {
                          if (Platform.OS === 'web') window.location.href = `/echo/${slug}/coupons`;
                          else router.push(`/echo/${slug}/coupons` as any);
                        }}
                        style={({ hovered }: any) => [s.ghostBtn, { borderColor: 'rgba(167,139,250,0.2)' }, hovered && { opacity: 0.85 }]}
                      >
                        <QrCode size={11} color="#A78BFA" />
                        <Text style={[s.ghostBtnText, { color: '#C4B5FD' }]}>All Passes</Text>
                      </Pressable>
                    )}
                  </View>

                  <View style={s.footNote}>
                    <ShieldCheck size={10} color="rgba(255,255,255,0.18)" />
                    <Text style={s.footText}>Emailed to you on registration.</Text>
                  </View>
                </View>

                {/* Perforated divider */}
                {item.coupons.length > 0 && (
                  Platform.OS === 'web' ? (
                    <div style={{ width: 1, borderLeft: '2px dashed rgba(255,255,255,0.07)', margin: '0', position: 'relative', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: -1, left: -9, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#0c0c18' }} />
                      <div style={{ position: 'absolute', bottom: -1, left: -9, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#0c0c18' }} />
                    </div>
                  ) : (
                    <View style={{ width: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.07)' }} />
                  )
                )}

                {/* Right panel: passes */}
                {item.coupons.length > 0 && (
                  <View style={s.passesPanel}>
                    <Text style={s.passesTitle}>SESSION PASSES</Text>
                    <View style={s.passGrid}>
                      {item.coupons.map((c) => {
                        const col = c.used
                          ? { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', text: '#34D399', icon: '#34D399' }
                          : c.session_locked
                            ? { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)', text: '#FCD34D', icon: '#F59E0B' }
                            : sessionColor(c.session_name || '');
                        return (
                          <Pressable
                            key={c.coupon_code}
                            onPress={() => setPreviewCoupon(c)}
                            style={({ hovered }: any) => [s.passChip, { backgroundColor: col.bg, borderColor: col.border }, hovered && { opacity: 0.78 }]}
                          >
                            <View style={[s.passIcon, { backgroundColor: col.bg, borderColor: col.border }]}>
                              {c.session_locked
                                ? <Lock size={10} color={col.icon} />
                                : c.used
                                  ? <CheckCircle size={10} color={col.icon} />
                                  : <Ticket size={10} color={col.icon} />}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={[s.passName, { color: col.text }]} numberOfLines={1}>
                                {c.session_name || c.session_key}
                              </Text>
                              <Text style={s.passCode} numberOfLines={1}>
                                {c.session_locked ? '****-****' : c.coupon_code}
                              </Text>
                            </View>
                            {c.used && <View style={s.usedDot} />}
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={s.tapHint}>Tap to view QR code</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Coupon modal */}
      {previewCoupon && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewCoupon(null)}>
          <View style={s.overlay}>
            <View style={s.modal}>
              <View style={s.modalHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={s.modalTitle}>{previewCoupon.session_name || 'Session Pass'}</Text>
                  <Text style={s.modalSub}>
                    {previewCoupon.used ? '✓ Availed' : previewCoupon.session_locked ? 'Session locked' : 'Show at venue counter'}
                  </Text>
                </View>
                <Pressable onPress={() => setPreviewCoupon(null)} style={s.closeBtn}>
                  <X size={16} color={SC.muted} />
                </Pressable>
              </View>

              <View style={s.modalBody}>
                {previewCoupon.session_locked ? (
                  <View style={s.lockedBox}>
                    <Lock size={36} color="#F59E0B" />
                    <Text style={s.lockedTitle}>Not yet released</Text>
                    <Text style={s.lockedSub}>This pass will unlock when the session opens.</Text>
                  </View>
                ) : previewCoupon.used ? (
                  <View style={s.usedBox}>
                    <CheckCircle size={40} color="#10B981" />
                    <Text style={s.usedTitle}>Pass Availed ✓</Text>
                    {previewCoupon.used_at && (
                      <Text style={s.usedAt}>
                        {new Date(previewCoupon.used_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                    {previewCoupon.scanned_lat && previewCoupon.scanned_lng && (
                      <Pressable onPress={() => {
                        if (typeof window !== 'undefined')
                          window.open(`https://www.google.com/maps/search/?api=1&query=${previewCoupon!.scanned_lat},${previewCoupon!.scanned_lng}`, '_blank');
                      }}>
                        <View style={s.mapLink}>
                          <MapPin size={12} color="#A78BFA" />
                          <Text style={{ color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 12 }}>View scan location</Text>
                        </View>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <>
                    <View style={s.qrBox}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://studentalumni.ai'}/echo/scan/${previewCoupon.coupon_code}`)}`}
                        alt={`QR for ${previewCoupon.coupon_code}`}
                        style={{ width: 200, height: 200, display: 'block' }}
                      />
                    </View>
                    <Text style={s.codeText}>{previewCoupon.coupon_code}</Text>
                    <Text style={s.codeSub}>Show this at the session counter</Text>
                  </>
                )}
              </View>

              <Pressable onPress={() => setPreviewCoupon(null)} style={s.doneBtn}>
                <Text style={s.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const CARD_BG = 'rgba(255,255,255,0.035)';
const CARD_BORDER = 'rgba(255,255,255,0.07)';

const s = StyleSheet.create({
  h1: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.5 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 3 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  usedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.10)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },

  ticketCard: { backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 16, overflow: 'hidden' },
  accentBar: { height: 3, width: '100%' },
  ticketBody: { ...(Platform.OS === 'web' ? { display: 'flex', flexDirection: 'row' } : { flexDirection: 'row' }) },
  ticketMain: { flex: 1, minWidth: 260, padding: 20, paddingRight: 22 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  echoBadge: { backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  echoLabel: { color: '#818CF8', fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 1.5 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.6 },

  eventTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.3, marginBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12 },

  checkinBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', alignSelf: 'flex-start' },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: '#4F46E5' },
  btnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
  ghostBtnText: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 12 },

  footNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  footText: { color: 'rgba(255,255,255,0.2)', fontFamily: FONTS.med, fontSize: 10 },

  passesPanel: { width: Platform.OS === 'web' ? 230 : '100%', minWidth: 200, padding: 18, backgroundColor: 'rgba(0,0,0,0.2)' },
  passesTitle: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 1.4, marginBottom: 10 },
  passGrid: { gap: 7 },
  passChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  passIcon: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  passName: { fontFamily: FONTS.bold, fontSize: 12 },
  passCode: { color: 'rgba(255,255,255,0.25)', fontFamily: FONTS.med, fontSize: 10, letterSpacing: 0.4, marginTop: 1 },
  usedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  tapHint: { color: 'rgba(255,255,255,0.15)', fontFamily: FONTS.med, fontSize: 10, marginTop: 10, textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#111120', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  modalSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },

  modalBody: { alignItems: 'center', gap: 12, marginBottom: 20 },
  qrBox: { backgroundColor: '#fff', borderRadius: 14, padding: 10 },
  codeText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: 2, textAlign: 'center' },
  codeSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },

  lockedBox: { alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 16, backgroundColor: 'rgba(245,158,11,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', width: '100%' },
  lockedTitle: { color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 15 },
  lockedSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },

  usedBox: { alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 16, backgroundColor: 'rgba(16,185,129,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', width: '100%' },
  usedTitle: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 15 },
  usedAt: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },

  doneBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
});
