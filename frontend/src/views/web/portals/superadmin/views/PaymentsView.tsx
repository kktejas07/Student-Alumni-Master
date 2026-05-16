// @ts-nocheck
/**
 * PaymentsView — Amber Admin theme.
 * KPI tiles + Stripe ledger + balance card, all using applekit primitives.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { ArrowDown, ArrowUp, CreditCard, Download, IndianRupee, TrendingUp, AlertTriangle, BadgePercent } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '../tokens';
import { GRAD, Card, IconBox, KpiTile, StatusPill, GradientButton, SecondaryButton, SectionLabel } from '../applekit';
import { usePortalData } from '@/src/lib/portalApi';
import { request } from '@/src/models/services/api';

type Tx = { id: string; date: string; desc: string; type: string; amount: number; by: string; status: string };
type Tier = { tier: string; cut: string; count: number };
const FALLBACK = {
  kpi: { gross: '₹0', payouts: '₹0', pending: '₹0', net: '₹0' },
  ledger: [] as Tx[],
  stripe_balance: '₹0',
  tiers: [] as Tier[],
};

export function PaymentsView() {
  const [exporting, setExporting] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutDone, setPayoutDone] = useState(false);
  const { data, refresh } = usePortalData<typeof FALLBACK>('/admin/super/payments', FALLBACK);
  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const totalMentors = data.tiers.reduce((a, t) => a + t.count, 0);

  const doExport = async () => {
    setExporting(true);
    try {
      const r = await request<{ url: string }>('/admin/export/payments', { method: 'GET' });
      if (r?.url && Platform.OS === 'web') {
        window.open(r.url, '_blank');
      }
    } catch { /* silent */ } finally { setExporting(false); }
  };

  const doPayout = async () => {
    setPayoutLoading(true);
    try {
      await request('/admin/super/payouts/initiate', { method: 'POST' });
      setPayoutDone(true);
      setTimeout(() => setPayoutDone(false), 3000);
    } catch { /* silent */ } finally { setPayoutLoading(false); }
  };

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={st.headRow}>
          <IconBox size={38}><IndianRupee size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.title}>Payments</Text>
            <Text style={st.sub}>Stripe ledger, mentor payouts and refund queue across the platform.</Text>
          </View>
          <SecondaryButton onPress={doExport} loading={exporting}><Download size={12} color={SAC.muted} /><Text style={st.secText}>{exporting ? 'Exporting…' : 'Export CSV'}</Text></SecondaryButton>
        </View>
      </Card>

      {/* KPIs */}
      <View style={st.kpiRow}>
        <KpiTile Icon={TrendingUp}     label="GROSS REVENUE"   value={data.kpi.gross}   delta="↑ 18% MoM"        deltaKind="success" />
        <KpiTile Icon={ArrowUp}        label="PAYOUTS PAID"    value={data.kpi.payouts} delta={`${totalMentors} mentors`} deltaKind="info" />
        <KpiTile Icon={AlertTriangle}  label="PENDING REFUNDS" value={data.kpi.pending} delta="7 disputes"        deltaKind="warn" />
        <KpiTile Icon={IndianRupee}    label="NET REVENUE"     value={data.kpi.net}     delta="↑ 14% MoM"         deltaKind="success" />
      </View>

      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        <Card style={{ flex: stack ? undefined : 2.4 }}>
          <View style={st.cardHead}>
            <Text style={st.cardTitle}>Stripe Ledger</Text>
            <StatusPill kind="info" label={`${data.ledger.length} txns`} />
          </View>
          <View style={{ marginTop: 14 }}>
            {data.ledger.map((t) => {
              const isOut = t.type === 'payout' || t.type === 'refund';
              return (
                <View key={t.id} style={st.txRow}>
                  <View style={[st.txIcon, isOut ? { backgroundColor: 'rgba(239,68,68,0.12)' } : { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                    {isOut ? <ArrowUp size={13} color="#FCA5A5" /> : <ArrowDown size={13} color="#86EFAC" />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={st.txDesc}>{t.desc}</Text>
                    <Text numberOfLines={1} style={st.txMeta}>{t.id} · {t.date} · {t.by}</Text>
                  </View>
                  {t.status === 'pending'
                    ? <StatusPill kind="warn" label="PENDING" />
                    : <StatusPill kind={t.type === 'refund' ? 'danger' : t.type === 'payout' ? 'info' : 'success'} label={t.type.toUpperCase()} />}
                  <Text style={[st.txAmount, { color: isOut ? '#FCA5A5' : '#86EFAC' }]}>
                    {isOut ? '-' : '+'}₹{t.amount.toLocaleString('en-IN')}
                  </Text>
                </View>
              );
            })}
            {data.ledger.length === 0 && (
              <Text style={[st.muted, { textAlign: 'center', paddingVertical: 24 }]}>No transactions yet.</Text>
            )}
          </View>
        </Card>

        <View style={{ width: stack ? '100%' : 320, gap: 12 }}>
          <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.gradCard}>
            <View style={[st.iconBox, { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.30)' }]}>
              <CreditCard size={16} color="#fff" />
            </View>
            <Text style={st.gradKicker}>STRIPE BALANCE</Text>
            <Text style={st.gradVal}>{data.stripe_balance}</Text>
            <Text style={st.gradSub}>Settles on May 5 to HDFC ****8821</Text>
            <Pressable style={st.gradCta} onPress={doPayout} disabled={payoutLoading}>
              {payoutLoading ? (
                <Text style={st.gradCtaText}>Processing…</Text>
              ) : payoutDone ? (
                <Text style={st.gradCtaText}>Payout Initiated!</Text>
              ) : (
                <Text style={st.gradCtaText}>Initiate payout</Text>
              )}
            </Pressable>
          </LinearGradient>

          <Card>
            <SectionLabel>PAYOUT TIERS</SectionLabel>
            <View style={{ marginTop: 12, gap: 10 }}>
              {data.tiers.map((t) => (
                <View key={t.tier} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[st.tierDot, { backgroundColor: GRAD.to }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={st.tierName}>{t.tier}</Text>
                    <Text numberOfLines={1} style={st.tierSub}>{t.count} active mentor{t.count === 1 ? '' : 's'}</Text>
                  </View>
                  <View style={st.tierCutPill}>
                    <BadgePercent size={11} color={GRAD.to} />
                    <Text style={st.tierCut}>{t.cut}</Text>
                  </View>
                </View>
              ))}
              {data.tiers.length === 0 && (
                <Text style={[st.muted, { paddingVertical: 8 }]}>No tiers configured.</Text>
              )}
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 760 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  txIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  txDesc: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  txMeta: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2 },
  txAmount: { fontFamily: FONTS.xbold, fontSize: 13, minWidth: 90, textAlign: 'right' },

  gradCard: { borderRadius: 16, padding: 18, gap: 4 },
  gradKicker: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.8, marginTop: 10 },
  gradVal: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 32, marginTop: 4, letterSpacing: -0.6 },
  gradSub: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.med, fontSize: 11.5, marginTop: 6 },
  gradCta: {
    marginTop: 14, height: 38, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  gradCtaText: { color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 12 },

  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  tierSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  tierCutPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.10)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.30)',
  },
  tierCut: { color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 12 },
});
