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
import { Ticket, CheckCircle, Download, ShieldCheck, QrCode, X, Lock, Calendar, MapPin, User, ArrowRight, AlertCircle, Clock, Store, IndianRupee, Tag } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GRADS } from '../gradients';

const GRAD = {
  from: GRADS.brand[0],
  to: GRADS.brand[1],
  ring: 'rgba(123,61,191,0.32)',
  ringSoft: 'rgba(123,61,191,0.12)',
};
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

  const load = useCallback(async () => {
    try {
      const r = await api.myEchoRegistrations();
      setItems(r?.items || []);
    } catch { /* not authed / empty */ }
    try {
      const o = await api.myMarketplaceOrders();
      const data = (o?.data || o?.items || []);
      setOrders(Array.isArray(data) ? data : []);
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
        <Text style={s.sectionTitle}>EVENT TICKETS</Text>
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
          const payment = reg.payment || {};
          const paymentStatus = payment.status || reg.payment_status || 'pending';
          const paid = paymentStatus === 'paid';
          const paymentFailed = paymentStatus === 'failed' || paymentStatus === 'expired';
          const checkedIn = !!reg.checked_in_at;

          const statusCfg = checkedIn
            ? { bg: 'rgba(16,185,129,0.12)', bc: 'rgba(16,185,129,0.30)', c: '#34D399', icon: CheckCircle, label: 'CHECKED IN' }
            : paid
              ? { bg: 'rgba(124,58,237,0.14)', bc: 'rgba(124,58,237,0.32)', c: GRAD.from, icon: Ticket, label: 'CONFIRMED' }
              : paymentFailed
                ? { bg: 'rgba(244,63,94,0.12)', bc: 'rgba(244,63,94,0.30)', c: '#FB7185', icon: AlertCircle, label: 'PAYMENT FAILED' }
                : { bg: 'rgba(245,158,11,0.10)', bc: 'rgba(245,158,11,0.28)', c: '#FBBF24', icon: Clock, label: 'PENDING' };
          const StatusIcon = statusCfg.icon;

          return (
            <GlassCard key={reg.id || idx} delay={idx * 40} radius={16} padding={0} style={{ overflow: 'hidden' }}>
              {/* Accent bar */}
              <View style={[s.accentBar, { backgroundColor: statusCfg.c }]} />

              <View style={s.ticketBody}>
                {/* Main section */}
                <View style={s.ticketMain}>
                  <View style={s.topRow}>
                    <View style={s.echoBadge}>
                      <Text style={s.echoLabel}>ECHO EVENT</Text>
                    </View>
                    <View style={[s.statusChip, { backgroundColor: statusCfg.bg, borderColor: statusCfg.bc }]}>
                      <StatusIcon size={10} color={statusCfg.c} />
                      <Text style={[s.statusText, { color: statusCfg.c }]}>{statusCfg.label}</Text>
                    </View>
                  </View>

                  <Text style={s.eventTitle}>{title}</Text>

                  {/* Failure reason */}
                  {paymentFailed && payment.failed_reason && (
                    <View style={s.failureReason}>
                      <AlertCircle size={10} color="#FB7185" />
                      <Text style={s.failureReasonText}>
                        {payment.failed_reason}
                        {payment.failed_reason_code && ` (${payment.failed_reason_code})`}
                      </Text>
                    </View>
                  )}

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
                      <Text style={[s.metaText, { color: SC.dim }]}>#{inv.invoice_no}</Text>
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
                    {paymentFailed ? (
                      <Pressable
                        onPress={() => {
                          if (Platform.OS === 'web') window.location.href = `/echo/${slug}/register?view=reg&event=${slug}`;
                          else router.push(`/echo/${slug}/register` as any);
                        }}
                        style={({ hovered }: any) => [s.primaryBtn, hovered && { opacity: 0.85 }]}
                      >
                        <AlertCircle size={12} color="#fff" />
                        <Text style={s.btnText}>Retry payment</Text>
                        <ArrowRight size={12} color="rgba(255,255,255,0.5)" />
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => openTicket(reg.id || '')}
                        style={({ hovered }: any) => [s.primaryBtn, hovered && { opacity: 0.85 }]}
                      >
                        <Ticket size={12} color="#fff" />
                        <Text style={s.btnText}>View Pass</Text>
                        <ArrowRight size={12} color="rgba(255,255,255,0.5)" />
                      </Pressable>
                    )}
                    {paid && inv?.invoice_no && (
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
                        style={({ hovered }: any) => [s.ghostBtn, { borderColor: 'rgba(167,139,250,0.24)' }, hovered && { opacity: 0.85 }]}
                      >
                        <QrCode size={11} color="#A78BFA" />
                        <Text style={[s.ghostBtnText, { color: '#C4B5FD' }]}>All Passes</Text>
                      </Pressable>
                    )}
                  </View>

                  <View style={s.footNote}>
                    <ShieldCheck size={10} color={SC.dim} />
                    <Text style={s.footText}>Emailed to you on registration.</Text>
                  </View>
                </View>

                {/* Right panel: passes */}
                {item.coupons.length > 0 && (
                  <View style={s.passesPanel}>
                    <View style={s.passesHeader}>
                      <Text style={s.passesTitle}>SESSION PASSES</Text>
                      <Text style={s.passesCount}>{item.coupons.length}</Text>
                    </View>
                    <View style={s.passGrid}>
                      {item.coupons.map((c, i) => {
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
            </GlassCard>
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
          body="Food and merchandise you order from the ECHO marketplace will show up here with pickup QR codes and invoices."
          compact
        />
      ) : (
        orders.map((order, idx) => {
          const oItems = order.items || [];
          const paid = order.payment_status === 'paid' || order.status === 'paid';
          const free = order.payment_status === 'free' || (order.final_amount === 0 && paid);
          const pending = order.payment_status === 'pending' || order.status === 'pending';
          const orderStatus = free
            ? { c: '#34D399', label: 'PAID · COLLECT AT STALL', icon: CheckCircle }
            : paid
              ? { c: '#34D399', label: 'PAID · COLLECT AT STALL', icon: CheckCircle }
              : pending
                ? { c: '#FBBF24', label: 'PENDING PAYMENT', icon: Clock }
                : { c: '#FB7185', label: 'NOT PAID', icon: AlertCircle };
          const OrderStatusIcon = orderStatus.icon;

          return (
            <GlassCard key={order.id} delay={idx * 40} radius={16} padding={0} style={{ overflow: 'hidden' }}>
              <View style={[s.accentBar, { backgroundColor: orderStatus.c }]} />
              <View style={s.mpBody}>
                <View style={s.mpHeaderRow}>
                  <View>
                    <Text style={s.mpTitle}>{oItems.length} item{oItems.length !== 1 ? 's' : ''} · #{order.id}</Text>
                    <Text style={s.mpMeta}>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                      {order.event_id ? ` · ${order.event_id}` : ''}
                    </Text>
                  </View>
                  <View style={[s.statusChip, { backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.28)' }]}>
                    <OrderStatusIcon size={10} color={orderStatus.c} />
                    <Text style={[s.statusText, { color: orderStatus.c }]}>{orderStatus.label}</Text>
                  </View>
                </View>

                {/* Items */}
                <View style={s.mpItems}>
                  {oItems.map((it, i) => (
                    <View key={it.item_id || i} style={s.mpItemRow}>
                      <View style={[s.mpCat, { backgroundColor: 'rgba(124,58,237,0.12)' }]}>
                        <Tag size={11} color={GRAD.from} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.mpItemName} numberOfLines={1}>{it.name}</Text>
                        <Text style={s.mpItemMeta} numberOfLines={1}>
                          {it.vendor_name ? `${it.vendor_name}` : 'Marketplace'}
                          {it.stall_no ? ` · Stall ${it.stall_no}` : ''}
                          {it.stall_location ? ` · ${it.stall_location}` : ''}
                        </Text>
                      </View>
                      <Text style={s.mpQty}>{it.quantity}×</Text>
                      <Text style={s.mpPrice}>₹{inr(it.line_total ?? (it.price_at_time ?? it.price) ?? 0)}</Text>
                    </View>
                  ))}
                </View>

                {/* Totals / coupon */}
                <View style={s.mpTotals}>
                  <View style={s.mpTotalRow}>
                    <Text style={s.mpTotalLabel}>Subtotal</Text>
                    <Text style={s.mpTotalValue}>₹{inr(order.subtotal)}</Text>
                  </View>
                  {order.coupon_code && (
                    <View style={s.mpTotalRow}>
                      <Text style={s.mpTotalLabel}>Coupon · {order.coupon_code}</Text>
                      <Text style={[s.mpTotalValue, { color: '#34D399' }]}>−₹{inr(order.discount)}</Text>
                    </View>
                  )}
                  {(order.gst_total ?? 0) > 0 && (
                    <View style={s.mpTotalRow}>
                      <Text style={s.mpTotalLabel}>GST</Text>
                      <Text style={s.mpTotalValue}>₹{inr(order.gst_total)}</Text>
                    </View>
                  )}
                  <View style={[s.mpTotalRow, s.mpGrandRow]}>
                    <Text style={s.mpGrandLabel}>Total (incl. GST)</Text>
                    <Text style={s.mpGrandValue}>₹{inr(order.final_amount)}</Text>
                  </View>
                </View>

                {/* Actions */}
                {(paid || free) && (
                  <View style={s.mpActions}>
                    <Pressable
                      onPress={() => openMarketplaceQr(order.id)}
                      style={({ hovered }: any) => [s.primaryBtn, hovered && { opacity: 0.85 }]}
                    >
                      {downloading === 'qr_' + order.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <><QrCode size={12} color="#fff" /><Text style={s.btnText}>Pickup QR</Text></>}
                    </Pressable>
                    <Pressable
                      onPress={() => openMarketplaceInvoice(order.id)}
                      style={({ hovered }: any) => [s.ghostBtn, hovered && { opacity: 0.85 }]}
                    >
                      {downloading === 'mp_' + order.id
                        ? <ActivityIndicator size="small" color={SC.muted} />
                        : <><Download size={11} color={SC.muted} /><Text style={s.ghostBtnText}>Invoice</Text></>}
                    </Pressable>
                    {pending && (
                      <Pressable
                        onPress={() => { if (Platform.OS === 'web' && order.event_id) window.location.href = `/echo/${order.event_id}`; }}
                        style={({ hovered }: any) => [s.ghostBtn, { borderColor: 'rgba(245,158,11,0.28)' }, hovered && { opacity: 0.85 }]}
                      >
                        <IndianRupee size={11} color="#FBBF24" />
                        <Text style={[s.ghostBtnText, { color: '#FCD34D' }]}>Retry Payment</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </GlassCard>
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

const s = StyleSheet.create({
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
