/**
 * Student → My Tickets — Echo event registrations, session passes, coupons,
 * invoices, and marketplace orders.
 *
 * Latest student-portal design language: GlassCard surfaces, SC/FONTS tokens,
 * purple brand identity, section headers. Functional parity with the previous
 * ticket-stub view, plus a new "Marketplace Orders" section that lists food &
 * merchandise orders placed through the ECHO marketplace.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ticket, CheckCircle, Download, ShieldCheck, QrCode, X, Lock, Calendar, MapPin, User, ArrowRight, AlertCircle, Clock, Store, IndianRupee, Tag, Truck } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GRADS } from '../gradients';

const GRAD = {
  from: GRADS.brand[0],
  to: GRADS.brand[1],
  ring: 'rgba(123,61,191,0.32)',
  ringSoft: 'rgba(123,61,191,0.12)',
};
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../glass';
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
  payment?: {
    status?: string;
    amount?: number;
    payment_id?: string;
    gateway?: string;
    method?: string;
    failed_reason?: string;
    failed_reason_code?: string;
    paid_at?: string;
    failed_at?: string;
    currency?: string;
  };
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

type MarketplaceItem = {
  item_id?: string;
  vendor_id?: string;
  vendor_name?: string;
  name?: string;
  category?: string;
  price?: number;
  price_at_time?: number;
  quantity?: number;
  line_total?: number;
  fulfillment_status?: string | null;
  stall_no?: string | null;
  stall_location?: string | null;
};

type MarketplaceOrder = {
  id: string;
  event_id?: string;
  user_name?: string;
  user_email?: string;
  items?: MarketplaceItem[];
  subtotal?: number;
  discount?: number;
  gst_total?: number;
  final_amount?: number;
  currency?: string;
  coupon_code?: string | null;
  status?: string;
  payment_status?: string;
  order_status?: string;
  delivery_method?: 'pickup' | 'delivery';
  delivery_info?: string;
  created_at?: string;
  razorpay_order_id?: string;
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

const inr = (n: number | undefined) => (n || 0).toLocaleString('en-IN');

export function MyTicketsView() {
  const router = useRouter();
  const [items, setItems] = useState<RegItem[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewCoupon, setPreviewCoupon] = useState<Coupon | null>(null);
  const [previewReg, setPreviewReg] = useState<Registration | null>(null);
  const [authError, setAuthError] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.myEchoRegistrations();
      setItems(r?.items || []);
      setAuthError(false);
    } catch (e: any) {
      if (e?.message?.includes('401') || e?.message?.includes('Authentication')) {
        setAuthError(true);
      }
    }
    try {
      const o = await api.myMarketplaceOrders();
      const data = (o?.data || o?.items || []);
      setOrders(Array.isArray(data) ? data : []);
    } catch { /* not authed / empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Real-time polling for order status updates (every 15 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const o = await api.myMarketplaceOrders();
        const data = (o?.data || o?.items || []);
        if (Array.isArray(data)) setOrders(data);
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, []);

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
    if (!w) { alert('Popup blocked! Please allow popups to view your ticket.'); return; }
    w.document.write('<div style="font-family:sans-serif;padding:20px;color:#888;">Loading your entry pass...</div>');
    setDownloading(regId || '__ticket__');
    try {
      const data = await api.getEchoTicket(regId);
      if (data?.html) { w.document.open(); w.document.write(data.html); w.document.close(); }
      else { w.document.write('<div style="font-family:sans-serif;padding:20px;color:#888;">No ticket found.</div>'); }
    } catch { w.close(); alert('Failed to load your ticket.'); }
    finally { setDownloading(null); }
  };

  const openMarketplaceInvoice = async (orderId: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const w = window.open('', '_blank');
    if (!w) { alert('Popup blocked! Please allow popups to view your invoice.'); return; }
    w.document.write('<div style="font-family:sans-serif;padding:20px;color:#888;">Generating invoice...</div>');
    setDownloading('mp_' + orderId);
    try {
      const data = await api.myMarketplaceInvoice(orderId);
      const html = data?.html || data?.raw;
      if (html) { w.document.open(); w.document.write(html); w.document.close(); w.focus(); w.print(); }
      else { w.close(); alert('Failed to load invoice.'); }
    } catch { w.close(); alert('Failed to load invoice.'); }
    finally { setDownloading(null); }
  };

  const openMarketplaceQr = async (orderId: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const w = window.open('', '_blank');
    if (!w) { alert('Popup blocked! Please allow popups to view your pickup QR.'); return; }
    w.document.write('<div style="font-family:sans-serif;padding:20px;color:#888;">Generating pickup QR...</div>');
    setDownloading('qr_' + orderId);
    try {
      const data = await api.myMarketplaceOrderQr(orderId);
      if (data?.qr_image) {
        const img = data.qr_image.startsWith('data:') ? data.qr_image : `data:image/png;base64,${data.qr_image}`;
        w.document.open();
        w.document.write(`<div style="font-family:sans-serif;text-align:center;padding:32px;color:#1e293b;">
          <h2 style="margin:0 0 4px;">Pickup QR</h2>
          <p style="color:#64748b;margin:0 0 20px;font-size:14px;">Order #${orderId} — show at the F&B stall to collect</p>
          <img src="${img}" width="280" height="280" style="border-radius:12px;border:1px solid #e2e8f0;" />
        </div>`);
        w.document.close(); w.focus();
      } else { w.close(); alert('No QR available for this order.'); }
    } catch { w.close(); alert('Could not load pickup QR.'); }
    finally { setDownloading(null); }
  };

  const totalPaid = items.reduce((a, i) => a + Number(i.invoice?.amount || 0), 0);
  const totalCoupons = items.reduce((a, i) => a + i.coupons.length, 0);
  const usedCoupons = items.reduce((a, i) => a + i.coupons.filter(c => c.used).length, 0);
  const mpPaid = orders.reduce((a, o) => a + (o.payment_status === 'paid' || o.status === 'paid' ? Number(o.final_amount || 0) : 0), 0);

  const hasTickets = items.length > 0;

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
            {orders.length > 0 && ` · ${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        {usedCoupons > 0 && (
          <View style={s.usedBadge}>
            <CheckCircle size={11} color="#34D399" />
            <Text style={{ color: '#34D399', fontFamily: FONTS.bold, fontSize: 11 }}>{usedCoupons} used</Text>
          </View>
        )}
      </View>

      {/* ── Event Tickets ── */}
      <View style={s.sectionHeader}>
        <View style={s.sectionIcon}><Ticket size={13} color={GRAD.from} /></View>
        <Text style={s.sectionTitle}>{items.length > 0 ? `${items[0].registration.event_title?.toUpperCase() || items[0].registration.showcase_title?.toUpperCase() || 'ECHO 2026'} TICKETS` : 'EVENT TICKETS'}</Text>
      </View>

      {authError ? (
        <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 600, color: '#F87171', textAlign: 'center' }}>
            Please sign in to view your tickets
          </Text>
          <Text style={{ fontSize: 13, color: SC.muted, textAlign: 'center', maxWidth: 360 }}>
            Your session may have expired. Sign in again to access your event registrations and session passes.
          </Text>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={{ marginTop: 8, backgroundColor: GRAD.from, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
          >
            <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>Sign In</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
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
          const title = reg.event_title || reg.showcase_title || 'Hack Wave 3.0';
          const payment = reg.payment || {};
          const isWeb = Platform.OS === 'web';
          const subTitle = reg.slug?.toLowerCase().includes('test') || !reg.slug ? 'Sreenidhi Institute of Science & Technology, Hyderabad' : reg.slug?.toUpperCase();

          return (
            <View key={reg.id || idx} style={isWeb ? s.tkGrid : s.tkGridMobile}>
              {/* Left Column: Main Ticket */}
              <Pressable onPress={() => setPreviewReg(reg)} style={({ hovered }: any) => [s.mainTicket, hovered && { transform: [{ scale: 0.99 }] }]}>
                <LinearGradient
                  colors={['#5B2DBE', '#4B3FD6', '#2FB8C6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={s.mainTicketContent}>
                  <View style={s.ticketTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={s.tkLogo}>SA</Text>
                      <View>
                        <Text style={s.tkLogoSub}>ENTRY PASS</Text>
                        <Text style={s.tkLogoSubLight}>studentalumni.ai/verify</Text>
                      </View>
                    </View>
                    <View style={s.validBadge}>
                      <View style={s.validDot} />
                      <Text style={s.validText}>VALID</Text>
                    </View>
                  </View>
                  
                  <Text style={s.tkEventTitle}>{title}</Text>
                  <Text style={s.tkEventSub}>{subTitle}</Text>
                  
                  <View style={s.tkMetaGrid}>
                    <View>
                      <Text style={s.tkMetaLabel}>DATE</Text>
                      <Text style={s.tkMetaValue}>Sep 04–05</Text>
                    </View>
                    <View>
                      <Text style={s.tkMetaLabel}>GATES OPEN</Text>
                      <Text style={s.tkMetaValue}>08:00 AM</Text>
                    </View>
                    <View>
                      <Text style={s.tkMetaLabel}>SEAT</Text>
                      <Text style={s.tkMetaValue}>GA · Block C</Text>
                    </View>
                  </View>
                </View>
                
                {/* Dashed separator */}
                <View style={s.tkSeparator}>
                  <View style={[s.tkCutout, { left: -12 }]} />
                  <View style={[s.tkCutout, { right: -12 }]} />
                  <View style={s.tkDashLine} />
                </View>
                
                {/* Bottom Section */}
                <View style={s.tkBottomSection}>
                  <View style={[s.tkQrBox, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <QrCode size={22} color="#2B1E6E" />
                    <Text style={{ color: '#2B1E6E', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 }}>TAP FOR QR</Text>
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    <Text style={s.tkMetaLabel}>TICKET NUMBER</Text>
                    <Text style={s.tkNumber}>SA-TKT-{reg.id?.substring(0, 6).toUpperCase() || 'XXXXXX'}</Text>
                    <Text style={s.tkName}>{reg.full_name || 'Guest'} - {reg.email}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1.5, marginBottom: 2 }}>PAID</Text>
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 18 }}>₹{payment.amount || inv?.amount || 599}</Text>
                  </View>
                </View>
              </Pressable>

              {/* Right Column: Passes */}
              <View style={s.passesCol}>
                {item.coupons.length > 0 ? item.coupons.map((c, i) => {
                  const isUsed = c.used;
                  return (
                    <Pressable 
                      key={c.coupon_code || i} 
                      onPress={() => setPreviewCoupon(c)}
                      style={({ hovered }: any) => [
                        s.sessionPassCard, 
                        isUsed && s.sessionPassUsed,
                        hovered && { opacity: 0.85 }
                      ]}
                    >
                      {isUsed && (
                        <View style={s.usedWatermark}>
                          <Text style={s.usedWatermarkText}>USED</Text>
                        </View>
                      )}
                      <View style={s.sessionPassHeader}>
                        <View style={s.sessionPassIcon}>
                          <Ticket size={20} color={isUsed ? '#34D399' : '#A78BFA'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.sessionPassName} numberOfLines={1}>{c.session_name || 'Session Pass'}</Text>
                          <Text style={s.sessionPassSub} numberOfLines={1}>{isUsed ? `Used at ${new Date(c.used_at || '').toLocaleTimeString()}` : 'Ready to use'}</Text>
                        </View>
                        {!isUsed && (
                          <View style={s.readyBadge}>
                            <Text style={s.readyBadgeText}>READY</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={s.spSeparator}>
                        <View style={[s.spCutout, { left: -9 }]} />
                        <View style={[s.spCutout, { right: -9 }]} />
                      </View>
                      
                      <View style={s.sessionPassFooter}>
                        <Text style={s.spCode}>{c.coupon_code}</Text>
                        <Text style={s.spActionText}>Show QR →</Text>
                      </View>
                    </Pressable>
                  );
                }) : (
                  <Text style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 13, marginTop: 10 }}>No session passes.</Text>
                )}
                
                {item.coupons.length > 0 && (
                  <View style={s.spNoteBox}>
                    <ShieldCheck size={16} color="#A78BFA" />
                    <Text style={s.spNoteText}>Passes are bound to your SA ID and cannot be transferred. Screenshots will not scan.</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* ── Marketplace Orders ── */}
      <View style={[s.sectionHeader, { marginTop: 6 }]}>
        <View style={s.sectionIcon}><Store size={13} color={GRAD.from} /></View>
        <Text style={s.sectionTitle}>MARKETPLACE ORDERS</Text>
        {orders.length > 0 && <Text style={s.sectionMeta}>₹{mpPaid.toLocaleString('en-IN')} paid</Text>}
      </View>

      {orders.length === 0 ? (
        <EmptyState
          variant="generic"
          title="No marketplace orders yet"
          body="Food and merchandise you order from the ECHO marketplace will show up here with pickup QR codes."
          compact
        />
      ) : (
        <View style={s.passGrid}>
          {orders.map((order, idx) => {
          const oItems = order.items || [];
          const paid = order.payment_status === 'paid' || order.status === 'paid';
          const free = order.payment_status === 'free' || (order.final_amount === 0 && paid);
          const pending = order.payment_status === 'pending' || order.status === 'pending';
          const allFulfilled = oItems.length > 0 && oItems.every((it: any) => it.fulfillment_status === 'FULFILLED');
          const isDelivery = order.delivery_method === 'delivery';
          const orderStatusKey = order.order_status || 'confirmed';
          const statusMap: Record<string, { c: string; label: string; icon: any }> = {
            confirmed: { c: '#10B981', label: 'ORDER CONFIRMED', icon: CheckCircle },
            preparing: { c: '#F59E0B', label: 'BEING PREPARED', icon: Clock },
            out_for_delivery: { c: '#3B82F6', label: isDelivery ? 'OUT FOR DELIVERY' : 'READY FOR PICKUP', icon: Truck },
            delivered: { c: '#8B5CF6', label: 'DELIVERED', icon: CheckCircle },
          };
          const orderStatus = allFulfilled
            ? { c: '#6366F1', label: 'COLLECTED', icon: CheckCircle }
            : statusMap[orderStatusKey] || (free || paid
              ? { c: '#34D399', label: isDelivery ? 'PAID · DELIVER TO TABLE' : 'PAID · COLLECT AT STALL', icon: CheckCircle }
              : pending
                ? { c: '#FBBF24', label: 'PENDING PAYMENT', icon: Clock }
                : { c: '#FB7185', label: 'NOT PAID', icon: AlertCircle });
          const OrderStatusIcon = orderStatus.icon;

          return (
            <Pressable 
              key={order.id} 
              onPress={() => !allFulfilled && openMarketplaceQr(order.id)}
              style={({ hovered }: any) => [
                s.sessionPassCard, 
                allFulfilled && s.sessionPassUsed,
                hovered && !allFulfilled && { opacity: 0.85 }
              ]}
            >
              {allFulfilled && (
                <View style={s.usedWatermark}>
                  <Text style={s.usedWatermarkText}>DONE</Text>
                </View>
              )}
              <View style={s.sessionPassHeader}>
                <View style={[s.sessionPassIcon, { backgroundColor: `${orderStatus.c}1A`, borderColor: `${orderStatus.c}33` }]}>
                  <OrderStatusIcon size={20} color={orderStatus.c} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sessionPassName} numberOfLines={1}>Order #{order.id.substring(0, 8).toUpperCase()}</Text>
                  <Text style={s.sessionPassSub} numberOfLines={1}>
                    {oItems.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                  </Text>
                </View>
                <View style={[s.readyBadge, { borderColor: `${orderStatus.c}4D` }]}>
                  <Text style={[s.readyBadgeText, { color: orderStatus.c }]}>{orderStatus.label.split(' · ')[0]}</Text>
                </View>
              </View>
              
              {isDelivery && order.delivery_info && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>📍 Deliver to: {order.delivery_info}</Text>
                </View>
              )}
              
              <View style={s.spSeparator}>
                <View style={[s.spCutout, { left: -9 }]} />
                <View style={[s.spCutout, { right: -9 }]} />
              </View>
              
              <View style={s.sessionPassFooter}>
                <Text style={s.spCode}>₹{inr(order.final_amount)} paid</Text>
                {!allFulfilled ? (
                  <Text style={s.spActionText}>Show QR →</Text>
                ) : (
                  <Text style={[s.spActionText, { color: '#6366F1' }]}>Collected ✓</Text>
                )}
              </View>
            </Pressable>
          );
        })}
        </View>
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

      {/* Ticket QR Modal */}
      {previewReg && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewReg(null)}>
          <View style={s.overlay}>
            <View style={s.modal}>
              <View style={s.modalHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={s.modalTitle}>{previewReg.event_title || previewReg.showcase_title || 'Event Ticket'}</Text>
                  <Text style={s.modalSub}>Entry Pass · Show at gates</Text>
                </View>
                <Pressable onPress={() => setPreviewReg(null)} style={s.closeBtn}>
                  <X size={16} color={SC.muted} />
                </Pressable>
              </View>

              <View style={s.modalBody}>
                <View style={s.qrBox}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://studentalumni.ai'}/echo/scan/${previewReg.id}`)}`}
                    alt={`QR for Ticket`}
                    style={{ width: 200, height: 200, display: 'block' }}
                  />
                </View>
                <Text style={s.codeText}>{previewReg.id?.substring(0, 8).toUpperCase()}</Text>
                <Text style={s.codeSub}>Hold this code near the scanner</Text>
              </View>

              <Pressable onPress={() => setPreviewReg(null)} style={s.doneBtn}>
                <Text style={s.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tkGrid: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  tkGridMobile: { flexDirection: 'column', gap: 20 },
  mainTicket: { flex: 1, minWidth: 320, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 26 }, shadowOpacity: 0.45, shadowRadius: 60, elevation: 10 },
  mainTicketContent: { padding: 24, paddingBottom: 20 },
  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  tkLogo: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 32, letterSpacing: -1.5 },
  tkLogoSub: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 1.4 },
  tkLogoSubLight: { color: 'rgba(255,255,255,0.78)', fontSize: 10.5, marginTop: 2 },
  validBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100, paddingHorizontal: 11, paddingVertical: 6 },
  validDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7BFFC4' },
  validText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1.1 },
  tkEventTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 27, letterSpacing: -1, marginBottom: 4 },
  tkEventSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  tkMetaGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  tkMetaLabel: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 },
  tkMetaValue: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
  tkSeparator: { height: 24, justifyContent: 'center' },
  tkCutout: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: SC.bg },
  tkDashLine: { height: 2, marginHorizontal: 18, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' },
  tkBottomSection: { flexDirection: 'row', alignItems: 'center', padding: 18, paddingHorizontal: 26, paddingBottom: 24 },
  tkQrBox: { backgroundColor: '#fff', padding: 8, borderRadius: 8 },
  tkNumber: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16, letterSpacing: 0.6 },
  tkName: { color: 'rgba(255,255,255,0.78)', fontSize: 11.5, marginTop: 6 },
  tkPaidAmount: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
  
  passesCol: { flex: 1, minWidth: 320, gap: 16 },
  sessionPassCard: { borderRadius: 18, borderWidth: 1, borderColor: SC.border, backgroundColor: SC.cardSolid, overflow: 'hidden' },
  sessionPassUsed: { opacity: 0.68 },
  usedWatermark: { position: 'absolute', right: -34, top: 22, transform: [{ rotate: '38deg' }], backgroundColor: SC.border, paddingVertical: 6, paddingHorizontal: 46, zIndex: 10 },
  usedWatermarkText: { color: SC.dim, fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 1.6 },
  sessionPassHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, paddingHorizontal: 20 },
  sessionPassIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center' },
  sessionPassName: { color: SC.text, fontFamily: FONTS.bold, fontSize: 15.5 },
  sessionPassSub: { color: SC.muted, fontSize: 12.5, marginTop: 3 },
  readyBadge: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  readyBadgeText: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 11 },
  spSeparator: { height: 18, justifyContent: 'center', borderTopWidth: 1, borderTopColor: SC.border, borderStyle: 'dashed' },
  spCutout: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: SC.bg, top: -9 },
  sessionPassFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 4, paddingHorizontal: 20, paddingBottom: 18 },
  spCode: { color: SC.text, fontFamily: FONTS.bold, fontSize: 13, letterSpacing: 0.4 },
  spActionText: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 12.5 },
  spNoteBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: SC.border, borderRadius: 16, backgroundColor: SC.glassBgSoft, padding: 16, paddingHorizontal: 18 },
  spNoteText: { color: SC.muted, fontSize: 12.5, lineHeight: 18, flex: 1 },


  h1: { color: SC.text, fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.5 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 3 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  usedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.10)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  sectionIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: GRAD.ringSoft, borderWidth: 1, borderColor: GRAD.ring, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: SC.text, fontFamily: FONTS.xbold, fontSize: 12, letterSpacing: 1.4 },
  sectionMeta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginLeft: 'auto' },

  // Ticket card
  accentBar: { height: 3, width: '100%' },
  ticketBody: { ...(Platform.OS === 'web' ? { display: 'flex', flexDirection: 'row' } : { flexDirection: 'row' }) },
  ticketMain: { flex: 1, minWidth: 260, padding: 20, paddingRight: 22 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  echoBadge: { backgroundColor: 'rgba(124,58,237,0.14)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  echoLabel: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 1.5 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.6 },

  eventTitle: { color: SC.text, fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.3, marginBottom: 8 },
  failureReason: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  failureReasonText: { color: '#FB7185', fontFamily: FONTS.med, fontSize: 12.5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12 },

  checkinBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', alignSelf: 'flex-start' },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: GRAD.from },
  btnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: SC.border, backgroundColor: SC.glassBgSoft },
  ghostBtnText: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 12 },

  footNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  footText: { color: SC.dim, fontFamily: FONTS.med, fontSize: 10 },

  passesPanel: { width: Platform.OS === 'web' ? 230 : '100%', minWidth: 200, padding: 18, backgroundColor: SC.glassBgSoft },
  passesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  passesTitle: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 1.4 },
  passesCount: { color: SC.dim, fontFamily: FONTS.bold, fontSize: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  passGrid: { gap: 7 },
  passChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  passIcon: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  passName: { fontFamily: FONTS.bold, fontSize: 12 },
  passCode: { color: SC.dim, fontFamily: FONTS.med, fontSize: 10, letterSpacing: 0.4, marginTop: 1 },
  usedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  tapHint: { color: SC.dim, fontFamily: FONTS.med, fontSize: 10, marginTop: 10, textAlign: 'center' },

  // Marketplace order card
  mpBody: { padding: 18 },
  mpHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  mpTitle: { color: SC.text, fontFamily: FONTS.xbold, fontSize: 15 },
  mpMeta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 1 },
  mpItems: { gap: 8, marginBottom: 14 },
  mpItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: SC.glassBgSoft, borderRadius: 10 },
  mpCat: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mpItemName: { color: SC.text, fontFamily: FONTS.bold, fontSize: 13 },
  mpItemMeta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 1 },
  mpQty: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 12, minWidth: 24, textAlign: 'right' },
  mpPrice: { color: SC.text, fontFamily: FONTS.bold, fontSize: 13, minWidth: 56, textAlign: 'right' },
  mpTotals: { gap: 6, borderTopWidth: 1, borderTopColor: SC.border, paddingTop: 12 },
  mpTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mpTotalLabel: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5 },
  mpTotalValue: { color: SC.text, fontFamily: FONTS.bold, fontSize: 12.5 },
  mpGrandRow: { marginTop: 2 },
  mpGrandLabel: { color: SC.text, fontFamily: FONTS.xbold, fontSize: 14 },
  mpGrandValue: { color: SC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  mpActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: SC.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, borderWidth: 1, borderColor: SC.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { color: SC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  modalSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },

  modalBody: { alignItems: 'center', gap: 12, marginBottom: 20 },
  qrBox: { backgroundColor: '#fff', borderRadius: 14, padding: 10 },
  codeText: { color: SC.text, fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: 2, textAlign: 'center' },
  codeSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },

  lockedBox: { alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 16, backgroundColor: 'rgba(245,158,11,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', width: '100%' },
  lockedTitle: { color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 15 },
  lockedSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },

  usedBox: { alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 16, backgroundColor: 'rgba(16,185,129,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', width: '100%' },
  usedTitle: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 15 },
  usedAt: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },

  doneBtn: { backgroundColor: GRAD.from, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
});
