/**
 * /deals — Deals & Perks standalone (matches SA Deals.html spec).
 * Sections: Top stats (4) · Category tabs (7) · Deal card grid · CTA footer.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import {
  Gift, Flame, ShieldCheck, LayoutGrid, Laptop, Utensils, Music,
  GraduationCap, Bus, Sparkles, Tag, BadgeCheck, Zap,
} from 'lucide-react-native';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

const CATS = [
  { id: 'all', label: 'All Deals', count: 58, color: '#C4B5FD', Icon: LayoutGrid },
  { id: 'insurance', label: 'Insurance', count: 10, color: '#EF4444', Icon: ShieldCheck },
  { id: 'tech', label: 'Tech & Tools', count: 6, color: '#3B82F6', Icon: Laptop },
  { id: 'food', label: 'Food & Delivery', count: 4, color: '#F97316', Icon: Utensils },
  { id: 'enter', label: 'Entertainment', count: 4, color: '#1DB954', Icon: Music },
  { id: 'learn', label: 'Learning', count: 4, color: '#8B5CF6', Icon: GraduationCap },
  { id: 'transport', label: 'Transport', count: 4, color: '#22C55E', Icon: Bus },
];

type Deal = { id: string; title: string; partner: string; desc: string; discount: string; category: string; color: string; hot?: boolean; orig: string; stud: string; code: string; emoji: string };

const DEALS: Deal[] = [
  { id: 'd1', title: 'Star Student Health Care', partner: 'Star Health', desc: 'Hospitalisation · Day care · OPD · Telemedicine', discount: '32%', category: 'insurance', color: '#EF4444', hot: true, orig: '₹2,200/yr', stud: '₹1,499/yr', code: 'SAHEALTH30', emoji: '❤️' },
  { id: 'd2', title: 'Niva Bupa Student Plan', partner: 'Niva Bupa', desc: 'Mental health · Cashless 7000+ hospitals · No co-pay', discount: '23%', category: 'insurance', color: '#EC4899', orig: '₹2,999/yr', stud: '₹2,299/yr', code: 'SANIVA20', emoji: '🏥' },
  { id: 'd3', title: 'SBI Education Protector', partner: 'SBI Life', desc: 'Loan protection · EMI waiver · Tax benefit 80C', discount: '20%', category: 'insurance', color: '#3B82F6', orig: '₹1,499/yr', stud: '₹1,200/yr', code: 'SAEDUSBI', emoji: '🎓' },
  { id: 'd4', title: 'Bajaj Student Guard', partner: 'Bajaj Allianz', desc: 'Exam fee reimburse · Sponsor protection · Accident cover', discount: '23%', category: 'insurance', color: '#8B5CF6', orig: '₹1,299/yr', stud: '₹999/yr', code: 'SABAJAJ', emoji: '🛡️' },
  { id: 'd5', title: 'ICICI Student Travel', partner: 'ICICI Lombard', desc: 'Trip cancellation · Lost baggage · Medical abroad', discount: '29%', category: 'insurance', color: '#14B8A6', hot: true, orig: '₹1,400', stud: '₹999 (6mo)', code: 'SATRAVEL29', emoji: '✈️' },
  { id: 'd6', title: 'Tata AIG Multi-Trip', partner: 'Tata AIG', desc: 'Unlimited trips/yr · Adventure sports · Emergency evac', discount: '25%', category: 'insurance', color: '#22C55E', orig: '₹1,999/yr', stud: '₹1,499/yr', code: 'SATATA25', emoji: '🗺️' },
  { id: 'd7', title: 'Care Overseas Student', partner: 'Care Health', desc: 'US & UK university accepted · Mental health · OPD', discount: '19%', category: 'insurance', color: '#6366F1', hot: true, orig: '₹4,299/yr', stud: '₹3,499/yr', code: 'SAINTL19', emoji: '🌍' },
  { id: 'd8', title: 'HDFC Ergo Global Health', partner: 'HDFC Ergo', desc: 'Cashless worldwide · Dental emergency · Repatriation', discount: '17%', category: 'insurance', color: '#3B82F6', orig: '₹5,999/yr', stud: '₹4,999/yr', code: 'SAHDFC17', emoji: '🩺' },
  { id: 'd9', title: 'Acko Two-Wheeler Plan', partner: 'Acko Insurance', desc: 'Zero depreciation · Roadside assistance · Instant claim', discount: '24%', category: 'insurance', color: '#F97316', hot: true, orig: '₹1,699/yr', stud: '₹1,299/yr', code: 'SAACKO24', emoji: '🏍️' },
  { id: 'd10', title: 'Go Digit Bike Insurance', partner: 'Go Digit', desc: '10% off · 1400+ cashless garages · Digital process', discount: '17%', category: 'insurance', color: '#22C55E', orig: '₹1,199/yr', stud: '₹999/yr', code: 'SADIGIT', emoji: '🛵' },

  { id: 'd11', title: 'GitHub Pro (Free)', partner: 'GitHub', desc: 'Private repos, Codespaces, Actions — free for students', discount: '100%', category: 'tech', color: '#E8EAF0', hot: true, orig: '$4/mo', stud: 'FREE', code: 'Via GitHub Education', emoji: '💻' },
  { id: 'd12', title: 'JetBrains All Products', partner: 'JetBrains', desc: 'IntelliJ, PyCharm, WebStorm, DataGrip — all free', discount: '100%', category: 'tech', color: '#F97316', hot: true, orig: '₹8,000/yr', stud: 'FREE', code: 'Via JetBrains Student', emoji: '🧠' },
  { id: 'd13', title: 'Microsoft Azure Credits', partner: 'Microsoft', desc: '$100 Azure credits + dev tools via Azure Dev Tools', discount: 'Free', category: 'tech', color: '#00A4EF', orig: '—', stud: '$100 credit', code: 'Via SA + Azure', emoji: '☁️' },
  { id: 'd14', title: 'Notion Pro Plan', partner: 'Notion', desc: 'Unlimited blocks, AI add-on, team workspace', discount: '100%', category: 'tech', color: '#FFFFFF', orig: '₹1,600/yr', stud: 'FREE', code: 'SA-NOTION', emoji: '📝' },
  { id: 'd15', title: 'Figma Education', partner: 'Figma', desc: 'Full Professional plan — unlimited projects, dev mode', discount: '100%', category: 'tech', color: '#F24E1E', hot: true, orig: '₹6,000/yr', stud: 'FREE', code: 'Via Figma Education', emoji: '🎨' },
  { id: 'd16', title: 'Canva Pro', partner: 'Canva', desc: 'Premium templates, background remover, brand kits', discount: '100%', category: 'tech', color: '#00C4CC', orig: '₹3,999/yr', stud: 'FREE (1 yr)', code: 'SA-CANVA-EDU', emoji: '🖼️' },

  { id: 'd17', title: 'Swiggy One Student', partner: 'Swiggy', desc: 'Unlimited free delivery + exclusive restaurant deals', discount: '67%', category: 'food', color: '#FC8019', hot: true, orig: '₹299/mo', stud: '₹99/mo', code: 'SWIGGY-SA', emoji: '🍽️' },
  { id: 'd18', title: 'Zomato Gold Student', partner: 'Zomato', desc: '1+1 on food and flat 20% off. Verified via SA-ID', discount: '50%', category: 'food', color: '#EF4444', orig: '₹299/mo', stud: '₹149/mo', code: 'ZOMATO-SA', emoji: '🍕' },
  { id: 'd19', title: 'Dunzo Campus Pass', partner: 'Dunzo', desc: 'Free delivery on groceries. Perfect for hostel students', discount: '75%', category: 'food', color: '#1DB954', orig: '₹199/mo', stud: '₹49/mo', code: 'DUNZO-SA', emoji: '🛍️' },
  { id: 'd20', title: 'Blinkit Express', partner: 'Blinkit', desc: 'Zero delivery fee for 3 months on grocery orders', discount: 'Free', category: 'food', color: '#F59E0B', hot: true, orig: '₹99/order', stud: '₹0 (3mo)', code: 'BLINKIT-3MO', emoji: '🛒' },

  { id: 'd21', title: 'Spotify Student', partner: 'Spotify', desc: 'Ad-free music, podcasts + Gaana premium bundled', discount: '50%', category: 'enter', color: '#1DB954', orig: '₹119/mo', stud: '₹59/mo', code: 'SPOTIFY-SA', emoji: '🎵' },
  { id: 'd22', title: 'Amazon Prime Student', partner: 'Amazon', desc: 'Prime Video, Music, free delivery, early access', discount: '33%', category: 'enter', color: '#F59E0B', hot: true, orig: '₹1,499/yr', stud: '₹999/yr', code: 'AMZN-SA-EDU', emoji: '📺' },
  { id: 'd23', title: 'YouTube Premium', partner: 'Google', desc: 'Ad-free YouTube, YouTube Music, background play', discount: '53%', category: 'enter', color: '#EF4444', orig: '₹189/mo', stud: '₹89/mo', code: 'YT-SA-53', emoji: '▶️' },
  { id: 'd24', title: 'BookMyShow Insider', partner: 'BookMyShow', desc: 'Priority access to events, student-only shows', discount: '67%', category: 'enter', color: '#F97316', orig: '₹599/yr', stud: '₹199/yr', code: 'BMS-SA-2026', emoji: '🎫' },

  { id: 'd25', title: 'Coursera Plus Student', partner: 'Coursera', desc: '7000+ courses, certificates, professional certs', discount: '67%', category: 'learn', color: '#3B82F6', hot: true, orig: '₹5,999/yr', stud: '₹1,999/yr', code: 'COURSERA-SA67', emoji: '🎓' },
  { id: 'd26', title: 'LinkedIn Learning', partner: 'LinkedIn', desc: '3 months of Learning + Premium career insights', discount: '100%', category: 'learn', color: '#0A66C2', orig: '₹1,800', stud: 'FREE (3mo)', code: 'LI-SALEARN', emoji: '💼' },
  { id: 'd27', title: 'NPTEL Certification', partner: 'IIT Madras', desc: 'NPTEL online courses with proctored exams', discount: '33%', category: 'learn', color: '#8B5CF6', orig: '₹1,500', stud: '₹1,000/course', code: 'NPTEL-SA', emoji: '📚' },
  { id: 'd28', title: 'Udemy Course Bundle', partner: 'Udemy', desc: 'Top-rated DSA, ML, Web Dev courses at ₹499 flat', discount: '86%', category: 'learn', color: '#A435F0', hot: true, orig: '₹3,499', stud: '₹499/course', code: 'UDEMY-SA86', emoji: '🎥' },

  { id: 'd29', title: 'Indian Railways Concession', partner: 'Indian Railways', desc: 'SL 50%, AC 25%, Rajdhani special rates', discount: 'Up to 75%', category: 'transport', color: '#22C55E', orig: 'Full fare', stud: '25–75% off', code: 'Via Railway Counter', emoji: '🚆' },
  { id: 'd30', title: 'Rapido Campus Ride', partner: 'Rapido', desc: 'First 5 rides free via SA-ID. Bike + auto', discount: 'Free', category: 'transport', color: '#F59E0B', hot: true, orig: '₹30–60/ride', stud: '₹0 (first 5)', code: 'RAPIDO-SA5', emoji: '🛵' },
  { id: 'd31', title: 'RedBus Student Saver', partner: 'RedBus', desc: 'Flat 15% discount on all bus bookings', discount: '15%', category: 'transport', color: '#EF4444', orig: 'MRP', stud: '15% off', code: 'REDBUS-SA15', emoji: '🚌' },
  { id: 'd32', title: 'IndiGo Student Fare', partner: 'IndiGo', desc: 'Book 7+ days in advance via SA portal', discount: '10%', category: 'transport', color: '#6366F1', orig: 'Regular fare', stud: '10% off', code: 'INDIGO-SA10', emoji: '✈️' },
];

export default function DealsPage() {
  const [cat, setCat] = useState('all');
  const visible = useMemo(() => cat === 'all' ? DEALS : DEALS.filter(d => d.category === cat), [cat]);

  return (
    <FeaturePageShell
      title="Unlock Exclusive Student Savings"
      subtitle="Deals & Perks curated for you · tech, insurance, food, learning and more"
      heroEmoji="🎁"
      accent="#F59E0B"
      rightSlot={<View style={s.savePill}><Sparkles size={12} color="#FCD34D" /><Text style={s.savePillText}>SA Exclusive</Text></View>}
    >
      {/* Top stats */}
      <View style={s.statsRow}>
        <Stat label="TOTAL DEALS" value="58" sub="Verified deals available" color="#C4B5FD" Icon={LayoutGrid} />
        <Stat label="FREE DEALS" value="8" sub="100% off offers" color="#22C55E" Icon={Gift} />
        <Stat label="HOT DEALS" value="7" sub="Trending & popular" color="#EF4444" Icon={Flame} />
        <Stat label="INSURANCE PLANS" value="10" sub="Student-specific coverage" color="#EF4444" Icon={ShieldCheck} />
      </View>

      {/* Tabs */}
      <Text style={s.kicker}>BROWSE BY CATEGORY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {CATS.map((c) => {
          const active = cat === c.id;
          return (
            <Pressable key={c.id} onPress={() => setCat(c.id)} style={[s.tab, active && { backgroundColor: c.color + '22', borderColor: c.color + '66' }]}>
              <c.Icon size={14} color={active ? c.color : 'rgba(255,255,255,0.65)'} />
              <Text style={[s.tabText, active && { color: c.color }]}>{c.label}</Text>
              <View style={s.tabCount}><Text style={s.tabCountText}>{c.count}</Text></View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Deal grid */}
      <View style={s.grid}>
        {visible.map((d) => <DealCard key={d.id} d={d} />)}
      </View>

      {/* Footer CTA */}
      <View style={s.ctaCard}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.ctaTitle}>Got your SA-ID ready?</Text>
          <Text style={s.ctaSub}>Present your SA Student ID at any partner to unlock the verified discount — instantly.</Text>
        </View>
        <Pressable style={s.ctaBtn}><BadgeCheck size={14} color="#0C0818" /><Text style={s.ctaBtnText}>Show SA-ID</Text></Pressable>
      </View>
    </FeaturePageShell>
  );
}

function DealCard({ d }: { d: Deal }) {
  return (
    <View style={[s.card, { borderColor: d.color + '44' }]}>
      {/* Banner */}
      <View style={[s.banner, { backgroundColor: d.color + '22', borderColor: d.color + '44' }]}>
        <Text style={[s.bannerEmoji]}>{d.emoji}</Text>
        <Text style={[s.bannerDisc, { color: d.color }]}>{d.discount}</Text>
        <Text style={[s.bannerOff, { color: d.color }]}>OFF</Text>
        {d.hot && <View style={s.hotPill}><Flame size={10} color="#FCA5A5" /><Text style={s.hotText}>HOT</Text></View>}
      </View>
      {/* Body */}
      <View style={{ padding: 14, gap: 8 }}>
        <View>
          <Text style={s.cardTitle}>{d.title}</Text>
          <Text style={s.cardPartner}>{d.partner}</Text>
        </View>
        <Text style={s.cardDesc} numberOfLines={2}>{d.desc}</Text>
        <View style={s.priceRow}>
          <View>
            <Text style={s.priceOrig}>{d.orig}</Text>
            <Text style={[s.priceStud, { color: d.color }]}>{d.stud}</Text>
          </View>
          <View style={s.codePill}><Tag size={10} color="rgba(255,255,255,0.55)" /><Text style={s.codeText}>{d.code}</Text></View>
        </View>
        <Pressable style={[s.claimBtn, { backgroundColor: d.color + '22', borderColor: d.color + '66' }]}>
          <Zap size={12} color={d.color} />
          <Text style={[s.claimText, { color: d.color }]}>Claim</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ label, value, sub, color, Icon }: any) {
  return (
    <View style={s.statCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.statIcon, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Icon size={14} color={color} />
        </View>
        <Text style={s.statLabel}>{label}</Text>
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  savePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(252,211,77,0.12)', borderColor: 'rgba(252,211,77,0.35)', borderWidth: 1 },
  savePillText: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },

  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 180, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 6 },
  statIcon: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 1, flex: 1 },
  statValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 24, marginTop: 2 },
  statSub: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },

  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.2 },

  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  tabText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  tabCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  tabCountText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { flexGrow: 1, flexBasis: 280, maxWidth: 340, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden' },
  banner: { height: 90, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bannerEmoji: { fontSize: 26 },
  bannerDisc: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, marginTop: 2 },
  bannerOff: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 2, marginTop: -2 },
  hotPill: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(239,68,68,0.20)', borderColor: 'rgba(239,68,68,0.45)', borderWidth: 1 },
  hotText: { color: '#FCA5A5', fontFamily: 'DMSans_800ExtraBold', fontSize: 9, letterSpacing: 0.5 },

  cardTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  cardPartner: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 2 },
  cardDesc: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, lineHeight: 16 },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  priceOrig: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11, textDecorationLine: 'line-through' },
  priceStud: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14, marginTop: 1 },
  codePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1 },
  codeText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 9.5 },

  claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9, borderWidth: 1, marginTop: 4, ...({ cursor: 'pointer' } as any) },
  claimText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 12, letterSpacing: 0.4 },

  ctaCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 14, backgroundColor: 'rgba(252,211,77,0.08)', borderColor: 'rgba(252,211,77,0.28)', borderWidth: 1, flexWrap: 'wrap' },
  ctaTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  ctaSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 38, borderRadius: 999, backgroundColor: '#FCD34D', ...({ cursor: 'pointer' } as any) },
  ctaBtnText: { color: '#0C0818', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
});
