import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet as WalletIcon, ArrowDown, ArrowUp, Gift, Plus } from 'lucide-react-native';
import { SC, FONTS } from '../tokens';
import { Badge } from '../atoms';

const BALANCE = 2_400;
const REFER_EARN = 1_200;
const TX = [
  { id:'TX-7012', date:'May 1, 2026',  desc:'Mentor session — Dr. Suresh Rao', amount:-999,  kind:'debit'  as const },
  { id:'TX-6998', date:'Apr 28, 2026', desc:'Refer & earn bonus (Sneha joined)',amount: 200,  kind:'credit' as const },
  { id:'TX-6964', date:'Apr 25, 2026', desc:'Wallet top-up via UPI',            amount: 1500, kind:'credit' as const },
  { id:'TX-6912', date:'Apr 18, 2026', desc:'Event ticket: System Design class',amount:-499,  kind:'debit'  as const },
  { id:'TX-6877', date:'Apr 12, 2026', desc:'Refer & earn bonus (Aman joined)', amount: 200,  kind:'credit' as const },
];

export function WalletView() {
  const { width } = useWindowDimensions();
  const stack = width < 980;
  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
      <View style={{ flex: stack ? undefined : 1.6, gap: 16 }}>
        <LinearGradient colors={[SC.primary, SC.primaryD] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.balCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <WalletIcon size={14} color="#fff" />
            <Text style={s.kicker}>SA WALLET BALANCE</Text>
          </View>
          <Text style={s.bigBal}>₹{BALANCE.toLocaleString('en-IN')}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable style={s.primaryCta}><Plus size={13} color={SC.primaryD} /><Text style={s.primaryCtaText}>Top up</Text></Pressable>
            <Pressable style={s.outlineCta}><Text style={s.outlineCtaText}>Withdraw</Text></Pressable>
          </View>
        </LinearGradient>

        <View style={s.card}>
          <Text style={s.cardTitle}>Recent Transactions</Text>
          <View style={{ marginTop: 8 }}>
            {TX.map((t) => (
              <View key={t.id} style={s.txRow}>
                <View style={[s.txIcon, t.kind === 'debit' ? { backgroundColor: 'rgba(239,68,68,0.10)' } : { backgroundColor: 'rgba(34,197,94,0.10)' }]}>
                  {t.kind === 'debit' ? <ArrowDown size={13} color={SC.red} /> : <ArrowUp size={13} color={SC.green} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={s.txDesc}>{t.desc}</Text>
                  <Text style={s.txMeta}>{t.id} · {t.date}</Text>
                </View>
                <Text style={[s.txAmount, { color: t.kind === 'debit' ? SC.red : SC.green }]}>
                  {t.kind === 'debit' ? '-' : '+'}₹{Math.abs(t.amount).toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={{ width: stack ? '100%' : 320, gap: 12 }}>
        <View style={[s.card, { borderColor: SC.border2 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Gift size={14} color={SC.accent} />
            <Text style={{ color: SC.accent, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.6 }}>REFER & EARN</Text>
          </View>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, marginTop: 8 }}>₹{REFER_EARN.toLocaleString('en-IN')} earned</Text>
          <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 6 }}>You get ₹200 in wallet for every friend who joins SA. They get a free mentor session.</Text>
          <Pressable style={s.referCta}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>Share invite link</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  balCard: { borderRadius: 16, padding: 22 },
  kicker: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.8 },
  bigBal: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 38, letterSpacing: -0.8, marginTop: 8 },
  primaryCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: '#fff' },
  primaryCtaText: { color: SC.primaryD, fontFamily: FONTS.xbold, fontSize: 12 },
  outlineCta: { paddingHorizontal: 14, height: 36, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center' },
  outlineCtaText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },

  card: { backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SC.border },
  txIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  txDesc: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  txMeta: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11 },
  txAmount: { fontFamily: FONTS.xbold, fontSize: 13 },
  referCta: { marginTop: 12, height: 36, borderRadius: 10, backgroundColor: SC.primary, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
});
