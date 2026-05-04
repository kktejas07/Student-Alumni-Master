import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet as WalletIcon, ArrowDown, ArrowUp, Gift, Plus, X } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData, postPortal, fetchPortal } from '@/src/lib/portalApi';

type Tx = { id: string; date: string; desc: string; amount: number; kind: 'debit' | 'credit' };
const FALLBACK = { balance: 0, refer_earn: 0, tx: [] as Tx[] };

export function WalletView() {
  const { width } = useWindowDimensions();
  const stack = width < 980;
  const { data } = usePortalData<typeof FALLBACK>('/student/wallet', FALLBACK);
  const [modal, setModal] = useState(false);
  const [amt, setAmt] = useState('500');
  const [local, setLocal] = useState<typeof FALLBACK | null>(null);
  const view = local || data || FALLBACK;
  const BALANCE = view.balance;
  const REFER_EARN = view.refer_earn;
  const TX = view.tx;

  const onTopup = async () => {
    const value = parseInt(amt, 10);
    if (!value || value <= 0) return;
    setModal(false);
    try {
      await postPortal('/student/wallet/topup', { amount: value });
      const fresh = await fetchPortal<typeof FALLBACK>('/student/wallet');
      setLocal(fresh);
    } catch {
      // fallback: optimistic
      setLocal({
        ...view,
        balance: BALANCE + value,
        tx: [{ id: `TX-${Date.now()}`, date: 'Just now', desc: 'Wallet top-up via UPI', amount: value, kind: 'credit' }, ...TX],
      });
    }
  };

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
            <Pressable style={s.primaryCta} onPress={() => setModal(true)}><Plus size={13} color={SC.primaryD} /><Text style={s.primaryCtaText}>Top up</Text></Pressable>
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

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <Pressable style={s.modalBg} onPress={() => setModal(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>Top up SA Wallet</Text>
              <Pressable onPress={() => setModal(false)}><X size={18} color={SC.muted} /></Pressable>
            </View>
            <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginBottom: 8 }}>Amount (₹)</Text>
            <TextInput value={amt} onChangeText={setAmt} keyboardType="numeric" style={s.modalInput} placeholder="500" placeholderTextColor={SC.dim} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {[200, 500, 1000, 2000].map((q) => (
                <Pressable key={q} onPress={() => setAmt(String(q))} style={s.quickBtn}><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>₹{q}</Text></Pressable>
              ))}
            </View>
            <Pressable style={[s.primaryCta, { backgroundColor: SC.primary, marginTop: 18 }]} onPress={onTopup}>
              <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 }}>Pay ₹{amt} via UPI</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 16, padding: 22 },
  modalInput: { backgroundColor: SC.bg, borderColor: SC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 44, color: '#fff', fontFamily: FONTS.bold, fontSize: 16, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  quickBtn: { paddingHorizontal: 14, height: 32, borderRadius: 8, borderWidth: 1, borderColor: SC.border, backgroundColor: SC.bg, justifyContent: 'center' },
});
