/**
 * /rentals — SA Rentals (housing + vehicles) standalone page.
 * Matches SA Rentals.html artifact: categories, featured rentals,
 * SA Member rental benefits block.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import { Home, Car, Bike, Sofa, Search, MapPin, Star } from 'lucide-react-native';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'pg', label: 'PG / Hostels' },
  { id: 'apt', label: 'Apartments' },
  { id: 'bike', label: 'Bikes' },
  { id: 'car', label: 'Cars' },
  { id: 'furn', label: 'Furniture' },
];

const RENTALS = [
  { title: 'Zolo Spirit PG', loc: 'HSR Layout · Bangalore', rate: '₹11,500/mo', rating: 4.6, tag: 'Featured first', verified: true, type: 'pg' },
  { title: 'Stanza Living Aria', loc: 'Koramangala · Bangalore', rate: '₹14,200/mo', rating: 4.8, tag: 'Highest rated', verified: true, type: 'pg' },
  { title: 'Royal Enfield Classic', loc: 'Indiranagar · Bangalore', rate: '₹650/day', rating: 4.5, tag: 'Featured first', verified: true, type: 'bike' },
  { title: '2-BHK Studio Apt', loc: 'Powai · Mumbai', rate: '₹34,000/mo', rating: 4.3, tag: '', verified: false, type: 'apt' },
  { title: 'IKEA Study Desk + Chair', loc: 'Anywhere', rate: '₹499/mo', rating: 4.7, tag: '', verified: true, type: 'furn' },
  { title: 'Swift Dzire · Self-drive', loc: 'Gachibowli · Hyderabad', rate: '₹1,800/day', rating: 4.4, tag: '', verified: true, type: 'car' },
];

const BENEFITS = [
  { Icon: Home, title: 'Security deposit waived', sub: 'SA students get 1-month deposit waived at partners' },
  { Icon: Star, title: 'Priority verification', sub: 'Digital ID auto-verifies — no paperwork needed' },
  { Icon: Sofa, title: 'Free furniture setup', sub: '₹2,000 credit for first-month furniture rental' },
];

export default function RentalsPage() {
  const [cat, setCat] = useState('all');
  const list = cat === 'all' ? RENTALS : RENTALS.filter((r) => r.type === cat);

  return (
    <FeaturePageShell
      title="Rentals"
      subtitle="Homes, bikes, cars & furniture — verified for students"
      heroEmoji="🏠"
      accent="#A78BFA"
    >
      <View style={s.statsRow}>
        {[{ k: '2,400+', v: 'Listings' }, { k: '180+', v: 'Verified' }, { k: '4.6★', v: 'Avg rating' }, { k: '₹50K', v: 'Saved' }].map((x, i) => (
          <View key={i} style={s.stat}><Text style={s.statK}>{x.k}</Text><Text style={s.statV}>{x.v}</Text></View>
        ))}
      </View>

      <View style={s.searchRow}><Search size={15} color={C.text3} /><Text style={s.searchPlaceholder}>Search by city, type, price…</Text></View>

      <Text style={s.kicker}>CATEGORIES</Text>
      <View style={s.chipsRow}>
        {CATEGORIES.map((c) => (
          <Pressable key={c.id} onPress={() => setCat(c.id)} style={[s.chip, cat === c.id && s.chipActive]}>
            <Text style={[s.chipText, cat === c.id && { color: '#fff' }]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.kicker}>SA MEMBER RENTAL BENEFITS</Text>
      <View style={s.benefitRow}>
        {BENEFITS.map((b, i) => (
          <View key={i} style={s.benefit}>
            <View style={s.benIcon}><b.Icon size={16} color="#A78BFA" /></View>
            <Text style={s.benTitle}>{b.title}</Text>
            <Text style={s.benSub}>{b.sub}</Text>
          </View>
        ))}
      </View>

      <Text style={s.kicker}>AVAILABLE NEAR YOU</Text>
      <View style={s.grid}>
        {list.map((r, i) => (
          <View key={i} style={s.card}>
            <View style={s.cardHead}>
              <View style={s.thumb} />
              {r.verified && <View style={s.verified}><Text style={s.verifiedText}>✓ Verified</Text></View>}
            </View>
            <Text style={s.cardTitle}>{r.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} color={C.text3} />
              <Text style={s.cardLoc}>{r.loc}</Text>
            </View>
            <View style={s.cardFoot}>
              <Text style={s.cardRate}>{r.rate}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Star size={11} color="#FCD34D" />
                <Text style={s.cardRating}>{r.rating}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </FeaturePageShell>
  );
}

const s = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 120, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 4 },
  statK: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 20 },
  statV: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1 },
  searchPlaceholder: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 13 },
  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.border, borderWidth: 1 },
  chipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  chipText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  benefitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  benefit: { flex: 1, minWidth: 240, padding: 14, borderRadius: 12, backgroundColor: 'rgba(167,139,250,0.06)', borderColor: 'rgba(167,139,250,0.25)', borderWidth: 1, gap: 6 },
  benIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.20)', alignItems: 'center', justifyContent: 'center' },
  benTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13, marginTop: 4 },
  benSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { flex: 1, minWidth: 280, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 6 },
  cardHead: { position: 'relative', marginBottom: 4 },
  thumb: { height: 140, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.15)' },
  verified: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.25)', borderColor: 'rgba(16,185,129,0.55)', borderWidth: 1 },
  verifiedText: { color: '#34D399', fontFamily: 'DMSans_800ExtraBold', fontSize: 9.5, letterSpacing: 0.4 },
  cardTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  cardLoc: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  cardRate: { color: '#34D399', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  cardRating: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
});
