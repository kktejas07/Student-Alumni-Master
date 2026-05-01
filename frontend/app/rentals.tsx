/**
 * /rentals — Housing, Vehicles, Farmhouses, Hotels, Vacation, Coworking
 * (matches SA Rentals.html spec).
 */
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import {
  House, Car, TreePine, Hotel, Sun, Laptop, LayoutGrid, BadgeCheck,
  Star, MapPin, Sparkles, ShieldCheck, Wifi,
} from 'lucide-react-native';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

const CATS = [
  { id: 'all', label: 'All Rentals', count: 18, color: '#C4B5FD', Icon: LayoutGrid },
  { id: 'housing', label: 'Housing', count: 5, color: '#3B82F6', Icon: House },
  { id: 'vehicle', label: 'Vehicles', count: 4, color: '#F59E0B', Icon: Car },
  { id: 'farmhouse', label: 'Farmhouses', count: 3, color: '#22C55E', Icon: TreePine },
  { id: 'hotel', label: 'Hotels', count: 3, color: '#EF4444', Icon: Hotel },
  { id: 'vacation', label: 'Vacation Homes', count: 3, color: '#14B8A6', Icon: Sun },
  { id: 'coworking', label: 'Offices / Cowork', count: 2, color: '#8B5CF6', Icon: Laptop },
];

type Rental = { id: string; title: string; type: string; location: string; rent: string; orig: string; discount: string; amenities: string[]; rating: number; reviews: number; beds: string; available: number; color: string; category: string; featured?: boolean; emoji: string; perk?: string };

const RENTALS: Rental[] = [
  { id: 'H1', title: 'CampusPG — IIT Bombay Area', type: 'PG / Hostel', location: 'Powai, Mumbai', rent: '₹6,500/mo', orig: '₹9,000/mo', discount: '28%', amenities: ['WiFi', 'Meals 2x/day', 'AC', 'Laundry'], rating: 4.6, reviews: 142, beds: 'Single / Double', available: 3, color: '#3B82F6', category: 'housing', featured: true, emoji: '🏠', perk: '10% off with SA-ID' },
  { id: 'H2', title: 'StayAbode Smart Hostel', type: 'PG / Hostel', location: 'Andheri West, Mumbai', rent: '₹8,000/mo', orig: '₹10,500/mo', discount: '24%', amenities: ['Co-working', 'Gym', 'Netflix lounge', '24x7 security'], rating: 4.4, reviews: 89, beds: 'Dorm / Private', available: 7, color: '#8B5CF6', category: 'housing', emoji: '🏨', perk: 'Free first week' },
  { id: 'H3', title: '1BHK near IIT Bombay', type: 'Apartment', location: 'Hiranandani, Powai', rent: '₹18,000/mo', orig: '₹22,000/mo', discount: '18%', amenities: ['Furnished', 'Near metro', 'Parking'], rating: 4.3, reviews: 34, beds: '1BHK Furnished', available: 1, color: '#14B8A6', category: 'housing', emoji: '🏢', perk: '₹2,000 off first month' },
  { id: 'H4', title: 'Studio Flat — Koramangala', type: 'Apartment', location: 'Koramangala, Bengaluru', rent: '₹14,000/mo', orig: '₹17,000/mo', discount: '18%', amenities: ['AC', 'Geyser', 'Parking'], rating: 4.5, reviews: 67, beds: 'Studio', available: 2, color: '#22C55E', category: 'housing', featured: true, emoji: '🛋️', perk: '15% for SA' },
  { id: 'H5', title: '3BHK Shared — HSR Layout', type: 'Shared Flat', location: 'HSR Layout, Bengaluru', rent: '₹9,500/mo', orig: '₹12,000/mo', discount: '21%', amenities: ['Shared kitchen', 'WiFi 200Mbps', 'Gym'], rating: 4.2, reviews: 18, beds: '1 room in 3BHK', available: 1, color: '#F97316', category: 'housing', emoji: '🛏️', perk: '₹1,000 off deposit' },

  { id: 'V1', title: 'Rapido Bike Subscription', type: 'Two-Wheeler', location: 'All major cities', rent: '₹1,499/mo', orig: '₹2,200/mo', discount: '32%', amenities: ['All-India', 'Insurance', 'Free helmet'], rating: 4.7, reviews: 890, beds: 'Honda Activa / TVS', available: 50, color: '#F59E0B', category: 'vehicle', featured: true, emoji: '🛵', perk: '1 month free for new SA users' },
  { id: 'V2', title: 'Bounce Infinite Bike', type: 'Two-Wheeler', location: 'Bengaluru · Hyderabad', rent: '₹999/mo', orig: '₹1,499/mo', discount: '33%', amenities: ['Zero petrol', 'App unlock', 'Swap battery'], rating: 4.4, reviews: 340, beds: 'Electric scooter', available: 25, color: '#22C55E', category: 'vehicle', emoji: '⚡', perk: '10% extra off' },
  { id: 'V3', title: 'Zoomcar Monthly Rental', type: 'Car', location: 'Mumbai · Delhi · Bengaluru', rent: '₹8,999/mo', orig: '₹12,000/mo', discount: '25%', amenities: ['1500km/mo free', 'Self-drive', 'Insurance'], rating: 4.3, reviews: 210, beds: 'Hatchback / Sedan', available: 8, color: '#EF4444', category: 'vehicle', emoji: '🚗', perk: '₹500 off with SA-ID' },
  { id: 'V4', title: 'Yulu Campus Cycle Plan', type: 'Cycle', location: 'Bengaluru · Pune', rent: '₹299/mo', orig: '₹499/mo', discount: '40%', amenities: ['Zero emission', 'App unlock', 'No licence'], rating: 4.5, reviews: 1200, beds: 'Electric cycle', available: 100, color: '#14B8A6', category: 'vehicle', emoji: '🚲', perk: '2 months free' },

  { id: 'F1', title: 'Nashik Farmhouse Estate', type: 'Weekend Getaway', location: 'Nashik, Maharashtra', rent: '₹8,000/night', orig: '₹12,000/night', discount: '33%', amenities: ['Private pool', 'Vineyard walk', 'BBQ'], rating: 4.8, reviews: 56, beds: '8 guests · 4 rooms', available: 5, color: '#22C55E', category: 'farmhouse', featured: true, emoji: '🌳', perk: '₹2,000 off for alumni groups' },
  { id: 'F2', title: 'Lonavala Hill Farm', type: 'Group Retreat', location: 'Lonavala, Maharashtra', rent: '₹15,000/night', orig: '₹20,000/night', discount: '25%', amenities: ['Bonfire', 'Indoor games', 'Catering'], rating: 4.6, reviews: 42, beds: '15 guests · 6 rooms', available: 3, color: '#F97316', category: 'farmhouse', emoji: '🏕️', perk: '₹3,000 off 2+ nights' },
  { id: 'F3', title: 'Coorg Coffee Plantation Stay', type: 'Weekend Getaway', location: 'Coorg, Karnataka', rent: '₹5,500/night', orig: '₹7,500/night', discount: '27%', amenities: ['Plantation tour', 'Jungle trek', 'Homefood'], rating: 4.9, reviews: 78, beds: '6 guests · 3 rooms', available: 2, color: '#8B5CF6', category: 'farmhouse', emoji: '☕', perk: '15% off for SA' },

  { id: 'HO1', title: 'OYO Student Stay', type: 'Budget Hotel', location: 'Pan India', rent: '₹599/night', orig: '₹999/night', discount: '40%', amenities: ['Breakfast', 'WiFi', 'AC'], rating: 4.0, reviews: 4500, beds: 'Single / Twin', available: 200, color: '#EF4444', category: 'hotel', emoji: '🏨', perk: 'Additional 15% via SA-ID' },
  { id: 'HO2', title: 'Lemon Tree Intern Pack', type: 'Business Hotel', location: 'Bengaluru · Mumbai · Delhi', rent: '₹1,999/night', orig: '₹3,200/night', discount: '38%', amenities: ['Breakfast', 'Gym', 'Co-working desk'], rating: 4.5, reviews: 890, beds: 'Deluxe room', available: 20, color: '#F59E0B', category: 'hotel', featured: true, emoji: '🛎️', perk: '20% off for interns · 3+ nights' },
  { id: 'HO3', title: 'Rajputana Haveli — Jaipur', type: 'Heritage Hotel', location: 'Jaipur, Rajasthan', rent: '₹3,500/night', orig: '₹5,500/night', discount: '36%', amenities: ['Heritage', 'Pool', 'Traditional food'], rating: 4.8, reviews: 210, beds: 'Suite', available: 4, color: '#6366F1', category: 'hotel', emoji: '🕌', perk: '₹500 off per night' },

  { id: 'VH1', title: 'Goa Beachfront Villa', type: 'Beach House', location: 'Anjuna Beach, Goa', rent: '₹4,500/night', orig: '₹7,000/night', discount: '36%', amenities: ['Beach access', 'Jacuzzi', 'Housekeeping'], rating: 4.9, reviews: 88, beds: '10 guests · 4BHK', available: 2, color: '#3B82F6', category: 'vacation', featured: true, emoji: '🏖️', perk: '₹1,000 off for SA groups' },
  { id: 'VH2', title: 'Manali Snow Cabin', type: 'Mountain Cabin', location: 'Manali, Himachal', rent: '₹3,200/night', orig: '₹4,800/night', discount: '33%', amenities: ['Mountain view', 'Bonfire', 'Snow activities'], rating: 4.7, reviews: 62, beds: '6 guests · 2 rooms', available: 3, color: '#14B8A6', category: 'vacation', emoji: '⛰️', perk: 'Free breakfast' },
  { id: 'VH3', title: 'Alleppey Houseboat', type: 'Houseboat', location: 'Alleppey, Kerala', rent: '₹6,000/night', orig: '₹9,000/night', discount: '33%', amenities: ['Backwater cruise', 'Chef on board', 'WiFi'], rating: 4.8, reviews: 44, beds: '4 guests · 2 cabins', available: 1, color: '#22C55E', category: 'vacation', emoji: '⛵', perk: 'SA exclusive — 33% off' },

  { id: 'CO1', title: 'WeWork Hot Desk Student', type: 'Hot Desk', location: 'Bengaluru · Mumbai · Delhi', rent: '₹3,999/mo', orig: '₹6,500/mo', discount: '38%', amenities: ['High-speed net', 'Coffee', 'Meeting rooms'], rating: 4.6, reviews: 340, beds: 'Hot desk · Flexible', available: 30, color: '#8B5CF6', category: 'coworking', featured: true, emoji: '💼', perk: 'Free 3-day trial' },
  { id: 'CO2', title: 'IndiQube Private Cabin', type: 'Private Cabin', location: 'Bengaluru · Hyderabad', rent: '₹7,999/mo', orig: '₹11,000/mo', discount: '27%', amenities: ['Dedicated net', 'Reception', '24x7 access'], rating: 4.5, reviews: 180, beds: '2-person cabin', available: 5, color: '#6366F1', category: 'coworking', emoji: '🧑‍💻', perk: '₹1,000 off first month' },
];

export default function RentalsPage() {
  const [cat, setCat] = useState('all');
  const visible = useMemo(() => cat === 'all' ? RENTALS : RENTALS.filter(r => r.category === cat), [cat]);

  return (
    <FeaturePageShell
      title="Find Your Perfect Stay"
      subtitle="Verified student accommodations, vehicles, hotels and coworking with exclusive SA discounts"
      heroEmoji="🏠"
      accent="#5F259F"
      rightSlot={<View style={s.verifyPill}><ShieldCheck size={12} color="#86EFAC" /><Text style={s.verifyText}>All SA Verified</Text></View>}
    >
      <View style={s.statsRow}>
        <Stat label="TOTAL LISTINGS" value="18" sub="All categories" color="#C4B5FD" Icon={LayoutGrid} />
        <Stat label="SA VERIFIED" value="18" sub="Guaranteed authenticity" color="#22C55E" Icon={BadgeCheck} />
        <Stat label="FEATURED" value="6" sub="Top picks" color="#F59E0B" Icon={Sparkles} />
        <Stat label="SA DISCOUNTS" value="18" sub="Exclusive savings" color="#5F259F" Icon={Star} />
      </View>

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

      <View style={s.grid}>
        {visible.map((r) => <RentalCard key={r.id} r={r} />)}
      </View>
    </FeaturePageShell>
  );
}

function RentalCard({ r }: { r: Rental }) {
  return (
    <View style={[s.card, { borderColor: r.color + '44' }]}>
      <View style={[s.cover, { backgroundColor: r.color + '1F', borderColor: r.color + '33' }]}>
        <Text style={s.coverEmoji}>{r.emoji}</Text>
        <View style={s.coverBadgeRow}>
          <View style={s.badgeVerify}><BadgeCheck size={10} color="#86EFAC" /><Text style={s.badgeVerifyText}>Verified</Text></View>
          {r.featured && <View style={s.badgeFeat}><Star size={10} color="#FCD34D" /><Text style={s.badgeFeatText}>Featured</Text></View>}
        </View>
        <View style={[s.discBadge, { backgroundColor: r.color + 'CC' }]}>
          <Text style={s.discText}>{r.discount} OFF</Text>
        </View>
      </View>
      <View style={{ padding: 14, gap: 8 }}>
        <View>
          <Text style={s.title}>{r.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <MapPin size={11} color={C.text3} />
            <Text style={s.loc}>{r.location}</Text>
            <Text style={s.dot}>·</Text>
            <Text style={s.type}>{r.type}</Text>
          </View>
        </View>

        <View style={s.amenRow}>
          {r.amenities.slice(0, 3).map((a, i) => (
            <View key={i} style={s.amenChip}><Text style={s.amenText}>{a}</Text></View>
          ))}
        </View>

        <View style={s.ratingRow}>
          <Star size={12} color="#FCD34D" />
          <Text style={s.ratingText}>{r.rating}</Text>
          <Text style={s.ratingCount}>({r.reviews})</Text>
          <View style={{ flex: 1 }} />
          <Text style={s.available}>{r.available} left</Text>
        </View>

        <View style={[s.perkBar, { borderColor: r.color + '55', backgroundColor: r.color + '18' }]}>
          <Sparkles size={10} color={r.color} />
          <Text style={[s.perkText, { color: r.color }]} numberOfLines={1}>{r.perk}</Text>
        </View>

        <View style={s.priceRow}>
          <View>
            <Text style={s.priceOrig}>{r.orig}</Text>
            <Text style={[s.priceRent, { color: r.color }]}>{r.rent}</Text>
          </View>
          <Pressable style={[s.bookBtn, { backgroundColor: r.color }]}>
            <Text style={s.bookText}>Book Now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value, sub, color, Icon }: any) {
  return (
    <View style={s.statCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.statIcon, { backgroundColor: color + '22', borderColor: color + '55' }]}><Icon size={14} color={color} /></View>
        <Text style={s.statLabel}>{label}</Text>
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  verifyPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.40)', borderWidth: 1 },
  verifyText: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },

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
  card: { flexGrow: 1, flexBasis: 300, maxWidth: 360, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden' },
  cover: { height: 130, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  coverEmoji: { fontSize: 44 },
  coverBadgeRow: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 5 },
  badgeVerify: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.20)', borderColor: 'rgba(34,197,94,0.40)', borderWidth: 1 },
  badgeVerifyText: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 9 },
  badgeFeat: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(252,211,77,0.18)', borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1 },
  badgeFeatText: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 9 },
  discBadge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  discText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5, letterSpacing: 0.4 },

  title: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  loc: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  dot: { color: C.text3, fontSize: 11 },
  type: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 11 },

  amenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  amenChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1 },
  amenText: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 10 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  ratingCount: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 10.5 },
  available: { color: '#86EFAC', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  perkBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  perkText: { flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 },
  priceOrig: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11, textDecorationLine: 'line-through' },
  priceRent: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16, marginTop: 1 },
  bookBtn: { paddingHorizontal: 14, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  bookText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 11.5, letterSpacing: 0.3 },
});
