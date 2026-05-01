import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDown, ArrowUp, CreditCard, Download, IndianRupee } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

type Tx = { id: string; date: string; desc: string; type: string; amount: number; by: string; status: string };
type Tier = { tier: string; cut: string; count: number };
const FALLBACK = {
  kpi: { gross: '₹0', payouts: '₹0', pending: '₹0', net: '₹0' },
  ledger: [] as Tx[],
  stripe_balance: '₹0',
  tiers: [] as Tier[],
};

export function PaymentsView() {
  const { data } = usePortalData<typeof FALLBACK>('/admin/super/payments', FALLBACK);
  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const KPI = [
    { label: 'GROSS REVENUE',   value: data.kpi.gross,   delta: '↑ 18% MoM',   color: SAC.accentBright },
    { label: 'PAYOUTS PAID',    value: data.kpi.payouts, delta: `${data.tiers.reduce((a, t) => a + t.count, 0)} mentors`, color: SAC.green },
    { label: 'PENDING REFUNDS', value: data.kpi.pending, delta: '7 disputes',   color: SAC.red },
    { label: 'NET REVENUE',     value: data.kpi.net,     delta: '↑ 14% MoM',   color: SAC.primaryL },
  ];
  const LEDGER = data.ledger || [];
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        {KPI.map((k) => (
          <View key={k.label} style={s.kpi}>
            <Text style={s.kpiLabel}>{k.label}</Text>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiDelta}>{k.delta}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        <View style={[s.card, { flex: stack ? undefined : 2.4 }]}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Stripe Ledger</Text>
            <Pressable style={s.exportCta}><Download size={12} color={SAC.muted} /><Text style={s.exportText}>Export CSV</Text></Pressable>
          </View>
          <View style={{ marginTop: 14 }}>
            {LEDGER.map((t) => {
              const isOut = t.type === 'payout' || t.type === 'refund';
              return (
                <View key={t.id} style={s.txRow}>
                  <View style={[s.txIcon, isOut ? { backgroundColor: 'rgba(239,68,68,0.10)' } : { backgroundColor: 'rgba(34,197,94,0.10)' }]}>
                    {isOut ? <ArrowUp size={13} color={SAC.red} /> : <ArrowDown size={13} color={SAC.green} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={s.txDesc}>{t.desc}</Text>
                    <Text numberOfLines={1} style={s.txMeta}>{t.id} · {t.date} · {t.by}</Text>
                  </View>
                  {t.status === 'pending'
                    ? <Badge label="PENDING" color="amber" />
                    : <Badge label={t.type.toUpperCase()} color={t.type === 'refund' ? 'red' : t.type === 'payout' ? 'orange' : 'green'} />}
                  <Text style={[s.txAmount, { color: isOut ? SAC.red : SAC.green }]}>{isOut ? '-' : '+'}₹{t.amount.toLocaleString('en-IN')}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ width: stack ? '100%' : 320, gap: 12 }}>
          <LinearGradient colors={[SAC.primary, SAC.primaryD] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.gradCard}>
            <CreditCard size={16} color="#fff" />
            <Text style={s.gradKicker}>STRIPE BALANCE</Text>
            <Text style={s.gradVal}>{data.stripe_balance}</Text>
            <Text style={s.gradSub}>Settles on May 5 to HDFC ****8821</Text>
            <Pressable style={s.gradCta}><Text style={s.gradCtaText}>Initiate payout</Text></Pressable>
          </LinearGradient>

          <View style={[s.card, { padding: 16 }]}>
            <Text style={s.cardTitle}>Payout Tiers</Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              {data.tiers.map((t) => (
                <View key={t.tier} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{t.tier}</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 }}>{t.count} active</Text></View>
                  <Text style={{ color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 13 }}>{t.cut}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  kpi: { flex: 1, minWidth: 200, padding: 16, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14 },
  kpiLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.6, marginBottom: 8 },
  kpiValue: { fontFamily: FONTS.xbold, fontSize: 24, letterSpacing: -0.4 },
  kpiDelta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 4 },

  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  exportCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, height: 30, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  exportText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: SAC.border },
  txIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  txDesc: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  txMeta: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2 },
  txAmount: { fontFamily: FONTS.xbold, fontSize: 13, minWidth: 90, textAlign: 'right' },

  gradCard: { borderRadius: 16, padding: 18 },
  gradKicker: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.8, marginTop: 8 },
  gradVal: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 32, marginTop: 6, letterSpacing: -0.6 },
  gradSub: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.med, fontSize: 11.5, marginTop: 8 },
  gradCta: { marginTop: 14, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  gradCtaText: { color: SAC.primaryD, fontFamily: FONTS.xbold, fontSize: 12 },
});
