/**
 * /deals — SA Deals & Offers standalone page.
 * Matches the SA Deals.html artifact: exclusive student discounts,
 * categorised deals, member-exclusive block.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import { Tag, Gift, TrendingUp, Search, Check } from 'lucide-react-native';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)', pink: '#F472B6', accent: '#A78BFA' };

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'tech', label: 'Tech' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'travel', label: 'Travel' },
  { id: 'books', label: 'Books' },
  { id: 'edu', label: 'Edu Tools' },
];

const DEALS = [
  { brand: 'Zomato', title: '50% off on first 3 orders', code: 'ZSTUDENT50', category: 'food', discount: '50% OFF', studentPrice: '₹149', mrp: '₹299' },
  { brand: 'Swiggy', title: 'Student Meal Box ₹99', code: 'SWIGGY99', category: 'food', discount: '40% OFF', studentPrice: '₹99', mrp: '₹169' },
  { brand: 'Notion', title: 'Notion Pro Free for 1 Year', code: 'EDU-YEAR', category: 'edu', discount: 'FREE', studentPrice: '₹0', mrp: '₹499/mo' },
  { brand: 'Canva', title: 'Canva Pro 50% off', code: 'CANVA50', category: 'edu', discount: '50% OFF', studentPrice: '₹239/mo', mrp: '₹499/mo' },
  { brand: 'Amazon', title: 'Kindle Unlimited — 3 months free', code: 'KINDLESTU3', category: 'books', discount: 'FREE', studentPrice: '₹0', mrp: '₹999' },
  { brand: 'Uber', title: '₹150 off on next 5 rides', code: 'UBERSTU5', category: 'travel', discount: '₹150 × 5', studentPrice: '₹750 OFF', mrp: '—' },
];

export default function DealsPage() {
  const [cat, setCat] = useState('all');
  const list = cat === 'all' ? DEALS : DEALS.filter((d) => d.category === cat);

  return (
    <FeaturePageShell
      title="Deals & Offers"
      subtitle="Exclusive student discounts — verified with your SA Digital ID"
      heroEmoji="🎁"
      accent={C.pink}
      rightSlot={<View style={s.trendBadge}><TrendingUp size={13} color="#F472B6" /><Text style={s.trendText}>Hot Deals Only</Text></View>}
    >
      {/* Search */}
      <View style={s.searchRow}><Search size={15} color={C.text3} /><Text style={s.searchPlaceholder}>Search offers, brand, code…</Text></View>

      {/* Categories */}
      <Text style={s.kicker}>CATEGORIES</Text>
      <View style={s.chipsRow}>
        {CATEGORIES.map((c) => (
          <Pressable key={c.id} onPress={() => setCat(c.id)} style={[s.chip, cat === c.id && s.chipActive]}>
            <Text style={[s.chipText, cat === c.id && { color: '#fff' }]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Member-exclusive banner */}
      <View style={s.memberCard}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Check size={13} color="#34D399" />
            <Text style={s.memberKicker}>SA MEMBER EXCLUSIVE</Text>
          </View>
          <Text style={s.memberTitle}>Unlock premium-only deals with your verified Student ID</Text>
          <Text style={s.memberSub}>Flash your SA Digital ID at checkout — partners auto-verify via QR scan.</Text>
        </View>
        <Pressable style={s.memberBtn} onPress={() => {}}><Text style={s.memberBtnText}>View My ID →</Text></Pressable>
      </View>

      {/* Deal cards */}
      <View style={s.grid}>
        {list.map((d, i) => (
          <View key={i} style={s.dealCard}>
            <View style={s.dealHead}>
              <View style={s.brandDot}><Text style={s.brandDotText}>{d.brand[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.brandName}>{d.brand}</Text>
                <Text style={s.brandTag}>{d.discount}</Text>
              </View>
              <View style={s.hotPill}><Text style={s.hotPillText}>HOT</Text></View>
            </View>
            <Text style={s.dealTitle}>{d.title}</Text>
            <View style={s.priceRow}>
              <Text style={s.studentPrice}>{d.studentPrice}</Text>
              {d.mrp !== '—' && <Text style={s.mrp}>{d.mrp}</Text>}
              <Text style={s.studentLabel}>· Student Price</Text>
            </View>
            <View style={s.codeRow}>
              <View style={s.codeBox}><Text style={s.codeText}>{d.code}</Text></View>
              <Pressable style={s.claimBtn}><Tag size={13} color="#fff" /><Text style={s.claimText}>Claim Deal</Text></Pressable>
            </View>
          </View>
        ))}
        {list.length === 0 && (
          <View style={s.emptyCard}><Gift size={28} color={C.text3} /><Text style={s.emptyText}>No deals found in this category</Text></View>
        )}
      </View>
    </FeaturePageShell>
  );
}

const s = StyleSheet.create({
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(244,114,182,0.15)', borderColor: 'rgba(244,114,182,0.45)', borderWidth: 1 },
  trendText: { color: '#F472B6', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1 },
  searchPlaceholder: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 13 },
  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.border, borderWidth: 1 },
  chipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  chipText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 14, backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1 },
  memberKicker: { color: '#34D399', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5, letterSpacing: 1.1 },
  memberTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15, marginTop: 4 },
  memberSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 4 },
  memberBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: '#7C3AED' },
  memberBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  dealCard: { flex: 1, minWidth: 300, padding: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 10 },
  dealHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandDot: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  brandDotText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  brandName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13.5 },
  brandTag: { color: '#F472B6', fontFamily: 'DMSans_700Bold', fontSize: 11, marginTop: 2 },
  hotPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(251,146,60,0.15)', borderColor: 'rgba(251,146,60,0.50)', borderWidth: 1 },
  hotPillText: { color: '#FB923C', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },
  dealTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  studentPrice: { color: '#34D399', fontFamily: 'DMSans_800ExtraBold', fontSize: 18 },
  mrp: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 12, textDecorationLine: 'line-through' },
  studentLabel: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  codeBox: { flex: 1, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, borderStyle: 'dashed' as any },
  codeText: { color: '#FCD34D', fontFamily: 'monospace' as any, fontSize: 12, fontWeight: '700' as any },
  claimBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 8, backgroundColor: '#7C3AED' },
  claimText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  emptyCard: { flex: 1, padding: 30, borderRadius: 14, alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 },
  emptyText: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 13 },
});
