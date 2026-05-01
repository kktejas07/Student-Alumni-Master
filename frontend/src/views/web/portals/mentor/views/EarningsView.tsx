/**
 * Mentor Portal — Earnings view: bar chart of last 6 months, transactions, AI advisor.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Sparkles, ArrowDown, ArrowUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { BarChart } from '../atoms';
import { MONTHLY, TRANSACTIONS } from '../data';

export function EarningsView() {
  const { width } = useWindowDimensions();
  const stack = width < 980;

  const total = MONTHLY.reduce((s, m) => s + m.amount, 0);
  const thisMonth = MONTHLY[MONTHLY.length - 1].amount;
  const lastMonth = MONTHLY[MONTHLY.length - 2].amount;
  const delta = ((thisMonth - lastMonth) / lastMonth) * 100;

  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
        {/* Big stats */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[s.statBox, { flex: 1 }]}>
            <Text style={s.kicker}>THIS MONTH</Text>
            <Text style={s.big}>₹{thisMonth.toLocaleString('en-IN')}</Text>
            <Text style={{ color: delta >= 0 ? MC.green : MC.red, fontFamily: FONTS.bold, fontSize: 12 }}>
              {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}% vs last
            </Text>
          </View>
          <View style={[s.statBox, { flex: 1 }]}>
            <Text style={s.kicker}>TOTAL EARNED</Text>
            <Text style={s.big}>₹{total.toLocaleString('en-IN')}</Text>
            <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12 }}>Lifetime</Text>
          </View>
          <View style={[s.statBox, { flex: 1 }]}>
            <Text style={s.kicker}>SESSIONS</Text>
            <Text style={s.big}>{MONTHLY.reduce((sum, m) => sum + m.sessions, 0)}</Text>
            <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12 }}>Across 6 months</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Earnings · last 6 months</Text>
          <BarChart data={MONTHLY} />
        </View>

        {/* Transactions */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Recent Transactions</Text>
          <View style={{ marginTop: 4 }}>
            {TRANSACTIONS.map((t) => (
              <View key={t.id} style={s.txRow}>
                <View style={[s.txIcon, t.amount < 0 ? { backgroundColor: 'rgba(239,68,68,0.10)' } : { backgroundColor: 'rgba(34,197,94,0.10)' }]}>
                  {t.amount < 0 ? <ArrowDown size={14} color={MC.red} /> : <ArrowUp size={14} color={MC.green} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{t.desc}</Text>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{t.id} · {t.date}</Text>
                </View>
                <Text style={{ color: t.amount < 0 ? MC.red : MC.green, fontFamily: FONTS.xbold, fontSize: 13.5 }}>
                  {t.amount < 0 ? '-' : '+'}₹{Math.abs(t.amount).toLocaleString('en-IN')}
                </Text>
                <View style={{ marginLeft: 8 }}>
                  <Badge label={t.status === 'paid' ? 'Paid' : 'Pending'} color={t.status === 'paid' ? 'green' : 'amber'} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Right column */}
      <View style={{ width: stack ? '100%' : 280, gap: 12 }}>
        <LinearGradient colors={[MC.teal + '40', MC.tealD + '40'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.card, { borderColor: MC.border2 }]}>
          <Text style={s.kicker}>AVAILABLE TO WITHDRAW</Text>
          <Text style={[s.big, { fontSize: 32 }]}>₹6,000</Text>
          <Pressable style={s.withdrawCta}><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Withdraw to Bank →</Text></Pressable>
          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 8 }}>Settles in 2-3 business days</Text>
        </LinearGradient>

        <View style={[s.card, { borderColor: 'rgba(252,211,77,0.30)', backgroundColor: 'rgba(252,211,77,0.05)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Sparkles size={14} color="#FCD34D" />
            <Text style={{ color: '#FCD34D', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.5 }}>AI ADVISOR</Text>
          </View>
          <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13, marginBottom: 6 }}>Boost June earnings by 18%</Text>
          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 18 }}>
            Add 4 evening slots on Tue & Thu — your highest-converting times. Run an AMA on system design to fill empty Saturdays.
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  statBox: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  card: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14, marginBottom: 14 },
  kicker: { color: MC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1, marginBottom: 6 },
  big: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.5, marginBottom: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: MC.border },
  txIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  withdrawCta: { paddingVertical: 11, alignItems: 'center', borderRadius: 10, backgroundColor: MC.tealP, marginTop: 4 },
});
