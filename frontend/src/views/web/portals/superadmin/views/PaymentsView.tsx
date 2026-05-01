import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDown, ArrowUp, CreditCard, Download, IndianRupee } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';

const KPI = [
  { label:'GROSS REVENUE',  value:'₹28.4L', delta:'↑ 18% MoM',  color: SAC.accentBright },
  { label:'PAYOUTS PAID',   value:'₹6.2L',  delta:'118 mentors',  color: SAC.green },
  { label:'PENDING REFUNDS',value:'₹42K',   delta:'7 disputes',   color: SAC.red },
  { label:'NET REVENUE',    value:'₹22.2L', delta:'↑ 14% MoM',  color: SAC.primaryL },
];

const LEDGER = [
  { id:'pi_3OqVxR', date:'May 1', desc:'Mentor session — Aanya Mehta',    type:'payout' as const, amount: 1499, by:'Priya Nair',  status:'success' as const },
  { id:'pi_3OqVxQ', date:'May 1', desc:'Subscription — XCM Premium MoU',  type:'income' as const, amount: 50000, by:"St. Xavier's",  status:'success' as const },
  { id:'pi_3OqVxP', date:'Apr 30',desc:'Event ticket — Sys Design class', type:'income' as const, amount: 499,   by:'Aryan Kapoor',  status:'success' as const },
  { id:'pi_3OqVxO', date:'Apr 30',desc:'Refund — Resume Review',          type:'refund' as const, amount: 299,   by:'Ankit Verma',   status:'pending' as const },
  { id:'pi_3OqVxN', date:'Apr 29',desc:'Mentor payout — Dr. Suresh Rao',  type:'payout' as const, amount: 14400, by:'Dr. Suresh Rao',status:'success' as const },
  { id:'pi_3OqVxM', date:'Apr 29',desc:'Subscription — IIT Kanpur Premium',type:'income' as const,amount: 80000, by:'IIT Kanpur',    status:'success' as const },
  { id:'pi_3OqVxL', date:'Apr 28',desc:'Refund — Hackathon No-show',      type:'refund' as const, amount: 199,   by:'Mohit Sinha',  status:'success' as const },
];

export function PaymentsView() {
  const { width } = useWindowDimensions();
  const stack = width < 1100;
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
            <Text style={s.gradVal}>₹14.8 L</Text>
            <Text style={s.gradSub}>Settles on May 5 to HDFC ****8821</Text>
            <Pressable style={s.gradCta}><Text style={s.gradCtaText}>Initiate payout</Text></Pressable>
          </LinearGradient>

          <View style={[s.card, { padding: 16 }]}>
            <Text style={s.cardTitle}>Payout Tiers</Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              {[
                { tier:'Platinum mentor', cut:'70%', count:8 },
                { tier:'Gold mentor',     cut:'60%', count:42 },
                { tier:'Silver mentor',   cut:'50%', count:128 },
                { tier:'College MoU',     cut:'30%', count:48 },
              ].map((t) => (
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
