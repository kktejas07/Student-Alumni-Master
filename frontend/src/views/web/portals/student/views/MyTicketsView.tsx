import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator, Modal } from 'react-native';
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
    }
  };

  const totalPaid = items.reduce((a, i) => a + Number(i.invoice?.amount || 0), 0);

  return (
    <View className="gap-5">
      <View>
        <Text className="text-text font-display-bold text-[22px] tracking-tight">My Tickets & Passes</Text>
        <Text className="text-muted font-body-medium text-xs mt-1">
          {items.length} event{items.length === 1 ? '' : 's'} · {items.reduce((a, i) => a + i.coupons.length, 0)} coupon{items.reduce((a, i) => a + i.coupons.length, 0) === 1 ? '' : 's'} · total paid ₹{totalPaid.toLocaleString('en-IN')}
        </Text>
      </View>

      {loading ? (
        <View className="py-10 items-center">
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
              <View className="flex-row items-center gap-3">
                <View
                  className="w-[38px] h-[38px] rounded-[10px] border border-glass-border items-center justify-center"
                  style={{ backgroundColor: paid ? 'rgba(34,197,94,0.10)' : 'rgba(251,191,36,0.10)', borderColor: paid ? 'rgba(34,197,94,0.30)' : 'rgba(251,191,36,0.30)' }}
                >
                  <Ticket size={18} color={paid ? '#34D399' : '#FBBF24'} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-text font-body-bold text-sm">{title}</Text>
                  <Text className="text-muted font-body-medium text-[11.5px] mt-[3px]">
                    {reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : ''}
                    {inv?.invoice_no ? ` · ${inv.invoice_no}` : ''}
                  </Text>
                </View>
                <View
                  className="flex-row items-center gap-1 px-[9px] py-1 rounded-full border"
                  style={{ backgroundColor: paid ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)', borderColor: paid ? 'rgba(34,197,94,0.35)' : 'rgba(251,191,36,0.35)' }}
                >
                  <CheckCircle size={11} color={paid ? '#34D399' : '#FBBF24'} />
                  <Text className="font-body-bold text-[10px] tracking-wider" style={{ color: paid ? '#34D399' : '#FBBF24' }}>{paid ? 'PAID' : 'PENDING'}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => openTicket(reg.id || '')}
                className="flex-row items-center gap-[6px] px-[14px] h-9 rounded-[10px] bg-violet"
                style={({ hovered }: any) => hovered && { opacity: 0.85 }}
              >
                <Ticket size={13} color="#fff" />
                <Text className="text-white font-body-bold text-xs">View Event Pass</Text>
              </Pressable>

              {item.coupons.length > 0 && (
                <View className="gap-2">
                  <Text className="text-muted font-display-bold text-[10.5px] tracking-widest mb-[2px]">Session Passes ({item.coupons.length})</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {item.coupons.map((c) => (
                      <Pressable
                        key={c.coupon_code}
                        onPress={() => setPreviewCoupon(c)}
                        className="flex-row items-center gap-2 px-3 py-2 rounded-[10px] bg-white/[0.04] border border-white/[0.08] min-w-[140px]"
                        style={c.used && { opacity: 0.5 }}
                      >
                        <Ticket size={18} color={c.session_locked ? '#F59E0B' : c.used ? '#10B981' : '#A78BFA'} />
                        <View className="flex-1">
                          <Text className="text-text font-body-bold text-xs" numberOfLines={1} style={c.used && { textDecorationLine: 'line-through', color: '#A1A6B7' }}>
                            {c.session_name || c.session_key}
                          </Text>
                          <Text className="text-muted font-body-medium text-[10px] mt-[2px]" style={c.session_locked && { color: 'rgba(255,255,255,0.25)', letterSpacing: 3 }}>
                            {c.session_locked ? '****' : c.coupon_code}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View className="flex-row gap-2 flex-wrap">
                {inv?.invoice_no ? (
                  <Pressable
                    onPress={() => openInvoice(inv.invoice_no)}
                    className="flex-row items-center gap-[6px] px-3 h-8 rounded-lg border border-green/30 bg-green/[0.06]"
                    style={({ hovered }: any) => hovered && { opacity: 0.85 }}
                  >
                    {downloading === inv.invoice_no ? (
                      <ActivityIndicator size="small" color={SC.accentBright} />
                    ) : (
                      <>
                        <Download size={12} color={SC.accentBright} />
                        <Text className="text-green font-body-bold text-[11px]">Invoice</Text>
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
                    className="flex-row items-center gap-[6px] px-3 h-8 rounded-lg border bg-green/[0.06]"
                    style={({ hovered }: any) => [{ borderColor: 'rgba(167,139,250,0.30)' }, hovered && { opacity: 0.85 }]}
                  >
                    <QrCode size={12} color="#A78BFA" />
                    <Text className="font-body-bold text-[11px]" style={{ color: '#C4B5FD' }}>All Coupons</Text>
                  </Pressable>
                ) : null}
              </View>

              <View className="flex-row items-center gap-[6px]">
                <ShieldCheck size={11} color={SC.muted} />
                <Text className="text-muted font-body-medium text-[10.5px]">A copy was emailed to you on registration.</Text>
              </View>
            </GlassCard>
          );
        })
      )}

      {previewCoupon && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewCoupon(null)}>
          <View className="flex-1 bg-black/70 justify-center items-center p-6">
            <View className="bg-[#1a1b3a] rounded-2xl p-6 w-full max-w-[360px] border border-white/10">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white font-display-bold text-base">
                  {previewCoupon.session_name || 'Session Pass'}
                </Text>
                <Pressable onPress={() => setPreviewCoupon(null)} className="p-1">
                  <X size={18} color={SC.muted} />
                </Pressable>
              </View>
              <View className="items-center gap-3">
                <Ticket size={40} color={previewCoupon.session_locked ? '#F59E0B' : '#A78BFA'} />
                <Text className="text-white font-display-bold text-2xl" style={{ letterSpacing: previewCoupon.session_locked ? 3 : 2 }}>
                  {previewCoupon.session_locked ? '****-****-****' : previewCoupon.coupon_code}
                </Text>
                <Text className="text-muted font-body-medium text-[13px]">
                  {previewCoupon.session_locked ? 'This session is currently locked' : previewCoupon.used ? 'Already used' : 'Show this code at the venue'}
                </Text>
                {!previewCoupon.session_locked && previewCoupon.coupon_code && (
                  <View className="mt-2 p-3 bg-white rounded-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://studentalumni.ai'}/echo/scan/${previewCoupon.coupon_code}`)}`}
                      alt={`QR code for ${previewCoupon.coupon_code}`}
                      style={{ width: 200, height: 200 }}
                    />
                  </View>
                )}
                {previewCoupon.session_locked && (
                  <View className="mt-2 p-5 rounded-xl border items-center gap-2" style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
                    <Lock size={28} color="#F59E0B" />
                    <Text className="font-body-bold text-sm" style={{ color: '#FCD34D' }}>Not yet released</Text>
                    <Text className="text-muted font-body-medium text-xs text-center">
                      This session coupon will be available when the session opens.
                    </Text>
                  </View>
                )}
                <Text className="text-muted font-body-medium text-[10px] mt-1">
                  Scan this QR code at the venue
                </Text>
              </View>
              <Pressable
                onPress={() => setPreviewCoupon(null)}
                className="flex-row items-center gap-[6px] px-[14px] h-9 rounded-[10px] bg-violet mt-4 w-full justify-center"
              >
                <Text className="text-white font-body-bold text-xs">Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
