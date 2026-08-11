/**
 * Student → My Tickets — paid event registrations with downloadable invoices.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Ticket, CheckCircle, Download, ShieldCheck } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GlassCard } from '../glass';
import { EmptyState } from '../EmptyState';
import { api, tokenStore } from '@/src/models/services/api';

type Inv = {
  invoice_no: string;
  event_title?: string;
  event_date?: string;
  full_name?: string;
  amount?: number;
  currency?: string;
  payment_id?: string;
  paid_at?: string;
};

export function MyTicketsView() {
  const [items, setItems] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.myEchoInvoices();
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

  const total = items.reduce((a, i) => a + Number(i.amount || 0), 0);

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Text style={s.h1}>My Tickets & Invoices</Text>
        <Text style={s.sub}>{items.length} ticket{items.length === 1 ? '' : 's'} · total paid {items[0]?.currency || '₹'}{total.toLocaleString('en-IN')}</Text>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={SC.accentBright} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          variant="generic"
          title="No tickets yet"
          body="When you register and pay for an ECHO event, your ticket and invoice will appear here for download."
          compact
        />
      ) : (
        items.map((inv, idx) => (
          <GlassCard key={inv.invoice_no} delay={idx * 40} radius={14} padding={16} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[s.iconBox, { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.30)' }]}>
                <Ticket size={18} color="#34D399" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.title}>{inv.event_title || 'Event Registration'}</Text>
                <Text style={s.meta}>
                  {inv.event_date ? `${inv.event_date} · ` : ''}{inv.invoice_no} · {inv.payment_id || ''}
                </Text>
              </View>
              <View style={s.paidPill}>
                <CheckCircle size={11} color="#34D399" />
                <Text style={s.paidText}>PAID</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={s.amountLabel}>AMOUNT PAID</Text>
                <Text style={s.amount}>{inv.currency || '₹'}{Number(inv.amount || 0).toLocaleString('en-IN')}</Text>
              </View>
              <Pressable
                onPress={() => openInvoice(inv.invoice_no)}
                style={({ hovered }: any) => [s.dlBtn, hovered && { opacity: 0.85 }]}
              >
                {downloading === inv.invoice_no ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Download size={13} color="#fff" />
                    <Text style={s.dlText}>Download Invoice</Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={11} color={SC.muted} />
              <Text style={s.footNote}>A copy was also emailed to you on payment.</Text>
            </View>
          </GlassCard>
        ))
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
  paidPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.35)', borderWidth: 1 },
  paidText: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.6 },
  amountLabel: { color: SC.muted, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.8 },
  amount: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20, marginTop: 2 },
  dlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 9,
    backgroundColor: SC.accentBright, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  dlText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  footNote: { color: SC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
});
