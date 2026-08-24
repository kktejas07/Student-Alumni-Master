// @ts-nocheck
/**
 * /rentals — SA Stay (Rentals Marketplace)
 * Re-themed with Career AI visual aesthetics, background artwork, Lucide icons (no emojis),
 * and a 2-step booking flow: View Details -> Proceed to Book.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Modal, Platform, Linking, ImageBackground} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Home, Car, Hotel, Building2, LayoutGrid, ShieldCheck, Star, Sparkles,
  Tag, MapPin, Calendar, CheckCircle2, Info, User, Clock, ArrowRight, X,
  ChevronRight, Search, Filter, Phone, PhoneCall, Mail, Ticket, Award, Check, Eye,
  Lock, MessageSquare, Flame, FileText, ArrowLeft, RefreshCw, Zap, Users,
} from 'lucide-react-native';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { FAB } from '@/src/views/web/md3';
import AIRentalAdvisor from '@/src/views/web/AIRentalAdvisor';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';

type Listing = {
  id: string; category: string; title: string; type: string;
  city: string; location: string;
  rent_inr: number; rent_label: string; orig_inr: number; orig_label: string;
  discount: string; amenities: string[]; rating: number; reviews: number;
  beds: string; available: number; color: string; emoji?: string;
  perk?: string; verified?: boolean; featured?: boolean; tags?: string[];
  description?: string; rules?: string[]; deposit_inr?: number;
};

type CategoryDef = { id: string; label: string; iconKey: string; color: string;
                     tagline: string; count: number };

type Booking = {
  booking_id: string; listing_id: string; status: string;
  category: string; guests: number; check_in: string; check_out: string;
  duration: { value: number; unit: string; days: number };
  cost_breakdown: { rate_per_unit_inr: number; units: number; unit: string;
                    subtotal_inr: number; sa_savings_inr: number;
                    service_fee_inr: number; security_deposit_inr: number;
                    total_inr: number };
  listing_snapshot: Listing;
  timeline: { id: string; label: string; date: string; status: string }[];
  days_until_checkout?: number | null;
};

/* ────────── Career AI Design Tokens ────────── */
const C = {
  bg: '#0B0D1A',
  bgCard: 'rgba(18, 22, 35, 0.75)',
  bgCardHover: 'rgba(26, 30, 50, 0.90)',
  border: 'rgba(255, 255, 255, 0.08)',
  border2: 'rgba(255, 255, 255, 0.14)',
  borderAccent: 'rgba(99, 102, 241, 0.25)',
  text: '#F0EEFF',
  text2: 'rgba(240, 238, 255, 0.80)',
  textSub: 'rgba(240, 238, 255, 0.60)',
  dim: 'rgba(240, 238, 255, 0.45)',
  purple: '#4F46E5',
  purple2: '#6366F1',
  purpleL: '#818CF8',
  purpleXL: '#A5B4FC',
  teal: '#2DD4BF',
  blue: '#60A5FA',
  amber: '#F59E0B',
  red: '#F87171',
  green: '#34D399',
  pink: '#F472B6',
};

const FT = {
  reg: 'DMSans_400Regular',
  med: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  xbold: 'DMSans_800ExtraBold',
};

const ALL_CAT: CategoryDef = { id: 'all', label: 'All Rentals', iconKey: 'grid',
  color: '#A5B4FC', tagline: 'Everything in one place', count: 0 };

const getCategoryIcon = (catId: string, color: string = '#818CF8', size: number = 18) => {
  switch (catId) {
    case 'housing': return <Home size={size} color={color} />;
    case 'vehicle': return <Car size={size} color={color} />;
    case 'hotels': return <Hotel size={size} color={color} />;
    case 'coworking': return <Building2 size={size} color={color} />;
    default: return <LayoutGrid size={size} color={color} />;
  }
};

const fmtINR = (n?: number) => '₹' + (n || 0).toLocaleString('en-IN');
const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN',
      { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};


const styles = {
  rightRow: { rightRow: '{ flexDirection: 'row'' },
  bookingsPillText: { bookingsPillText: '{ color: '#F59E0B'' },
  bookingsBadge: { bookingsBadge: '{ paddingHorizontal: 6', backgroundColor: '#F59E0B' },
  bookingsBadgeText: { bookingsBadgeText: '{ color: '#0B0D1A'' },
  verifyText: { verifyText: '{ color: '#34D399'' },
  heroArtContent: { heroArtContent: '{ padding: 20' },
  heroBadgeText: { heroBadgeText: '{ color: '#A5B4FC'' },
  heroTitle: { heroTitle: '{ color: C.text' },
  heroSub: { heroSub: '{ color: C.textSub' },
  statsRow: { statsRow: '{ flexDirection: 'row'' },
  filterRow: { filterRow: '{ gap: 10' },
  searchInput: { searchInput: '{ flex: 1', fontSize: 13.5 },
  cityPill: { cityPill: '{ flexDirection: 'row'', paddingHorizontal: 12, backgroundColor: 'C.bgCard', borderWidth: 1 },
  cityPillActive: { cityPillActive: '{ backgroundColor: 'rgba(99' },
  cityPillText: { cityPillText: '{ color: C.textSub' },
  tab: { tab: '{ flexDirection: 'row'', paddingHorizontal: 14, backgroundColor: 'C.bgCard', borderWidth: 1 },
  tabText: { tabText: '{ color: C.textSub' },
  tabCount: { tabCount: '{ paddingHorizontal: 7', backgroundColor: 'rgba(255' },
  tabCountText: { tabCountText: '{ color: '#fff'' },
  loadingBox: { loadingBox: '{ paddingVertical: 50' },
  loadingText: { loadingText: '{ color: C.textSub' },
  emptyBox: { emptyBox: '{ paddingVertical: 50' },
  emptyTitle: { emptyTitle: '{ color: '#fff'' },
  emptySub: { emptySub: '{ color: C.dim' },
  grid: { grid: '{ flexDirection: 'row'' },
  advisorRow: { advisorRow: '{ flexDirection: 'row'' },
  advisorCard: { advisorCard: '{', flex: 1, padding: 20, backgroundColor: 'C.bgCard', borderWidth: 1, flexDirection: 'column' },
  advisorIconBox: { advisorIconBox: '{', width: 44, alignItems: 'center', borderWidth: 1 },
  advisorTitle: { advisorTitle: '{ color: C.text' },
  advisorDesc: { advisorDesc: '{ color: C.textSub' },
  advisorCTA: { advisorCTA: '{', flexDirection: 'row', paddingVertical: 12, cursor: 'pointer' },
  advisorCTAText: { advisorCTAText: '{ color: '#fff'' },
  advisorLinkRow: { advisorLinkRow: '{ flexDirection: 'row'' },
  advisorLinkText: { advisorLinkText: '{ fontSize: 13' },
  advisorNote: { advisorNote: '{ color: C.dim' },
  card: { card: '{ flexGrow: 1', borderWidth: 1 },
  cover: { cover: '{ height: 110', justifyContent: 'center' },
  coverBadgeRow: { coverBadgeRow: '{ position: 'absolute'' },
  badgeVerifyText: { badgeVerifyText: '{ color: '#34D399'' },
  badgeFeatText: { badgeFeatText: '{ color: '#F59E0B'' },
  discBadge: { discBadge: '{ position: 'absolute'', paddingHorizontal: 8 },
  discText: { discText: '{ color: '#fff'' },
  title: { title: '{ color: C.text' },
  metaRow: { metaRow: '{ flexDirection: 'row'' },
  loc: { loc: '{ color: C.textSub' },
  dot: { dot: '{ color: C.dim' },
  type: { type: '{ color: C.purpleL' },
  amenRow: { amenRow: '{ flexDirection: 'row'' },
  amenChip: { amenChip: '{ flexDirection: 'row'', backgroundColor: 'rgba(255', borderColor: 'C.border' },
  amenText: { amenText: '{ color: C.textSub' },
  ratingRow: { ratingRow: '{ flexDirection: 'row'' },
  ratingText: { ratingText: '{ color: '#fff'' },
  ratingCount: { ratingCount: '{ color: C.dim' },
  available: { available: '{ color: '#34D399'' },
  perkBar: { perkBar: '{ flexDirection: 'row'', paddingHorizontal: 10 },
  perkText: { perkText: '{ flex: 1' },
  priceOrig: { priceOrig: '{ color: C.dim', fontSize: 11.5 },
  priceRent: { priceRent: '{ fontFamily: FT.xbold' },
  bookBtn: { bookBtn: '{ flexDirection: 'row'', paddingHorizontal: 14, justifyContent: 'center' },
  detailsSheet: { detailsSheet: '{ width: '100%'', backgroundColor: '#0F1222', borderColor: 'C.border2' },
  detailsHero: { detailsHero: '{ height: 130', position: 'relative' },
  detailsCategoryBox: { detailsCategoryBox: '{ width: 56', backgroundColor: 'rgba(255' },
  detailsBadgeContainer: { detailsBadgeContainer: '{ flexDirection: 'row'' },
  detailsTitle: { detailsTitle: '{ color: C.text' },
  detailsStatsRow: { detailsStatsRow: '{ flexDirection: 'row'', backgroundColor: 'C.bgCard' },
  detailsStatItem: { detailsStatItem: '{ flex: 1' },
  detailsStatKey: { detailsStatKey: '{ color: C.dim' },
  detailsStatVal: { detailsStatVal: '{ color: C.text' },
  detailsSection: { detailsSection: '{ gap: 8' },
  sectionLabel: { sectionLabel: '{ color: C.dim', fontSize: 10.5 },
  detailsDesc: { detailsDesc: '{ color: C.textSub' },
  detailsAmenGrid: { detailsAmenGrid: '{ flexDirection: 'row'' },
  detailsAmenText: { detailsAmenText: '{ color: C.text2' },
  confirmBtn: { confirmBtn: '{ flex: 1', alignItems: 'center', cursor: 'pointer' },
  confirmBtnText: { confirmBtnText: '{ color: '#fff'' },
  fineprint: { fineprint: '{ color: C.dim', textAlign: 'center' },
  sheet: { sheet: '{ width: '100%'', backgroundColor: '#0F1222', borderColor: 'C.border2' },
  sheetHeader: { sheetHeader: '{ flexDirection: 'row'' },
  sheetIconBox: { sheetIconBox: '{ width: 48', borderWidth: 1 },
  sheetTitle: { sheetTitle: '{ color: C.text' },
  fieldRow: { fieldRow: '{ flexDirection: 'row'' },
  priceTable: { priceTable: '{ gap: 8', backgroundColor: 'C.bgCard' },
  priceDivider: { priceDivider: '{ height: 1' },
  errText: { errText: '{ color: '#F87171'' },
  actionRow: { actionRow: '{ flexDirection: 'row'' },
  cancelBtn: { cancelBtn: '{ paddingHorizontal: 20', backgroundColor: 'C.bgCard', borderWidth: 1, cursor: 'pointer' },
  cancelBtnText: { cancelBtnText: '{ color: C.textSub' },
  fieldLabel: { fieldLabel: '{ color: C.textSub' },
  fieldBox: { fieldBox: '{ flexDirection: 'row'', paddingHorizontal: 12, backgroundColor: 'C.bgCard' },
  fieldInput: { fieldInput: '{ flex: 1', fontSize: 13 },
  tableRow: { tableRow: '{ flexDirection: 'row'' },
  tableK: { tableK: '{ color: C.textSub' },
  tableV: { tableV: '{ color: C.text' },
  confirmIdText: { confirmIdText: '{ color: '#A5B4FC'' },
  confirmCell: { confirmCell: '{ flexBasis: '48%'', backgroundColor: 'C.bgCard' },
  confirmCellLabel: { confirmCellLabel: '{ color: C.dim', fontSize: 9.5 },
  confirmCellValue: { confirmCellValue: '{ color: C.text', fontSize: 13 },
  savingsText: { savingsText: '{ color: '#F59E0B'' },
  confirmCTAText: { confirmCTAText: '{ color: '#fff'' },
  confirmDismissText: { confirmDismissText: '{ color: C.dim' },
  drawer: { drawer: '{ width: '100%'', backgroundColor: '#0F1222', borderColor: 'C.border2' },
  drawerTitle: { drawerTitle: '{ color: C.text' },
  drawerCountBadge: { drawerCountBadge: '{ paddingHorizontal: 8', backgroundColor: 'rgba(165', borderColor: 'rgba(165' },
  drawerCountText: { drawerCountText: '{ color: '#A5B4FC'' },
  emptyDrawer: { emptyDrawer: '{ paddingVertical: 60' },
  bookingCard: { bookingCard: '{ padding: 16', backgroundColor: 'C.bgCard' },
  bookingTop: { bookingTop: '{ flexDirection: 'row'' },
  bookingIconBox: { bookingIconBox: '{ width: 44', alignItems: 'center' },
  bookingTitle: { bookingTitle: '{ color: C.text' },
  bookingMeta: { bookingMeta: '{ color: C.dim' },
  statusPill: { statusPill: '{ paddingHorizontal: 10' },
  statusText: { statusText: '{ fontFamily: FT.xbold' },
  bookingFacts: { bookingFacts: '{ flexDirection: 'row'' },
  bookingTimeline: { bookingTimeline: '{ marginTop: 12' },
  tlStep: { tlStep: '{ flexDirection: 'row'' },
  tlDot: { tlDot: '{ width: 8' },
  tlLabel: { tlLabel: '{ color: C.dim' },
  tlBar: { tlBar: '{ width: 1' },
  bookingActionRow: { bookingActionRow: '{ flexDirection: 'row'' },
  cancelLinkText: { cancelLinkText: '{ color: '#F87171'' },
  factText: { factText: '{ color: C.textSub' },
  statCard: { statCard: '{ flex: 1', backgroundColor: 'C.bgCard', borderWidth: 1 },
  statIcon: { statIcon: '{ width: 30', alignItems: 'center' },
  statValue: { statValue: '{ fontFamily: FT.xbold' },
  statSub: { statSub: '{ color: C.dim' },
};

export default function RentalsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);

  useEffect(() => {
    if (!isEmbedded && initialized && user) {
      if (user.role === 'alumni') {
        router.replace('/alumni-portal?tab=rentals' as any);
      } else if (user.role === 'student') {
        router.replace('/student-portal?tab=rentals' as any);
      }
    }
  }, [isEmbedded, initialized, user, router]);

  const [cat, setCat] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [city, setCity] = useState<string>('all');
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, featured: 0 });
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [advisorOpen, setAdvisorOpen] = useState(false);

  // Flow states: detailsFor -> bookingFor -> confirmedBooking
  const [detailsFor, setDetailsFor] = useState<Listing | null>(null);
  const [bookingFor, setBookingFor] = useState<Listing | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catsR, listR, bookR] = await Promise.all([
        request<any>('/rentals/categories'),
        request<any>(`/rentals/listings?category=${cat}&city=${city}` +
                     (query ? `&q=${encodeURIComponent(query)}` : '')),
        request<any>('/rentals/bookings').catch(() => ({ bookings: [] })),
      ]);
      setCategories([{ ...ALL_CAT, count: catsR.total || 0 }, ...(catsR.categories || [])]);
      setStats({ total: catsR.total || 0,
                 verified: catsR.verified || 0,
                 featured: catsR.featured || 0 });
      setListings(listR.listings || []);
      setBookings(bookR.bookings || []);
    } catch (e: any) {
      console.warn('rentals load err', e?.message);
    } finally {
      setLoading(false);
    }
  }, [cat, city, query]);

  useEffect(() => { loadData(); }, [loadData]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    listings.forEach(l => l.city && set.add(l.city));
    return ['all', ...Array.from(set).sort()];
  }, [listings]);

  const visibleListings = useMemo(() => listings, [listings]);
  const activeBookings = useMemo(() => bookings.filter(b => b.status === 'confirmed' || b.status === 'pending'), [bookings]);
  const currentStay = activeBookings[0] || bookings[0];
  const displayCount = activeBookings.length > 0 ? activeBookings.length : bookings.length;

  return (
    <FeaturePageShell
      title="SA Stay Rentals Marketplace"
      subtitle="Verified student housing, vehicles, stays & coworking with exclusive SA discounts"
      accent="#6366F1"
      rightSlot={
        <View style={s.rightRow}>
          <Pressable onPress={() => setBookingsOpen(true)} className="px-3">
            <Ticket size={13} color="#F59E0B" />
            <Text style={s.bookingsPillText}>My Bookings</Text>
            {bookings.length > 0 && (
              <View style={s.bookingsBadge}>
                <Text style={s.bookingsBadgeText}>{bookings.length}</Text>
              </View>
            )}
          </Pressable>
          <View className="px-3">
            <ShieldCheck size={13} color="#34D399" />
            <Text style={s.verifyText}>All SA Verified</Text>
          </View>
        </View>
      }
    >
      {/* ── Career AI Ambient Glass Hero Artwork Background Container ── */}
      <View className="rounded-2xl mb-4">
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.15)', 'rgba(45, 212, 191, 0.05)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={s.heroArtContent}>
          <View className="px-3">
            <Sparkles size={14} color="#A5B4FC" />
            <Text style={s.heroBadgeText}>AI-MATCHED ACCOMMODATIONS & VEHICLES</Text>
          </View>
          <Text style={s.heroTitle}>Premium Stays & Mobility Near Campus</Text>
          <Text style={s.heroSub}>
            Explore verified student PGs, cars, scooters, hotels, and coworking desks. Tap any listing to view details and check live availability.
          </Text>
        </View>
      </View>

      {/* KPI Stats Strip */}
      <View style={s.statsRow}>
        <Stat label="TOTAL LISTINGS" value={String(stats.total)} sub="All categories"
              color="#A5B4FC" Icon={LayoutGrid} />
        <Stat label="SA VERIFIED" value={String(stats.verified)} sub="Guaranteed authenticity"
              color="#34D399" Icon={ShieldCheck} />
        <Stat label="FEATURED" value={String(stats.featured)} sub="Top picks of the month"
              color="#F59E0B" Icon={Star} />
        <Stat label="SA DISCOUNTS" value="Up to 25%" sub="Exclusive member savings"
              color="#6366F1" Icon={Tag} />
      </View>

      {/* Search + City filter */}
      <View style={s.filterRow}>
        <View className="px-4">
          <Search size={16} color={C.dim} />
          <TextInput
            style={s.searchInput}
            placeholder="Search PG, city, vehicle, hotel, amenities…"
            placeholderTextColor={C.dim}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')}>
              <X size={14} color={C.dim} />
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}>
          {cities.map((cv) => {
            const active = city === cv;
            return (
              <Pressable key={cv} onPress={() => setCity(cv)}
                style={[styles.cityPill, active && s.cityPillActive]}>
                <MapPin size={11} color={active ? '#A5B4FC' : C.dim} />
                <Text style={[styles.cityPillText, active && { color: '#A5B4FC' }]}>
                  {cv === 'all' ? 'All Cities' : cv}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Category Tabs */}
      <Text className="text-xs">BROWSE BY CATEGORY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {categories.map((c) => {
          const active = cat === c.id;
          return (
            <Pressable key={c.id} onPress={() => setCat(c.id)}
              style={[styles.tab, active && { backgroundColor: c.color + '22', borderColor: c.color + '66' }]}>
              {getCategoryIcon(c.id, active ? c.color : C.textSub, 15)}
              <Text style={[styles.tabText, active && { color: c.color }]}>
                {c.label}
              </Text>
              <View style={s.tabCount}>
                <Text style={s.tabCountText}>{c.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Grid of Rentals */}
      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#A5B4FC" size="large" />
          <Text style={s.loadingText}>Fetching live verified rentals…</Text>
        </View>
      ) : visibleListings.length === 0 ? (
        <View style={s.emptyBox}>
          <Building2 size={40} color={C.dim} />
          <Text style={s.emptyTitle}>No listings match your filters</Text>
          <Text style={s.emptySub}>Try clearing the search query or switching city</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {visibleListings.map((r) => (
            <RentalCard
              key={r.id}
              r={r}
              onViewDetails={() => setDetailsFor(r)}
            />
          ))}
        </View>
      )}

      {/* Advisor & My Bookings Block */}
      <View style={{ marginTop: 24 }}>
        <View style={s.advisorRow}>
          {/* Advisor Card */}
          <View style={[styles.advisorCard, { borderColor: 'rgba(244, 114, 182, 0.3)' }]}>
            <View style={[styles.advisorIconBox, { backgroundColor: 'rgba(244, 114, 182, 0.15)', borderColor: 'rgba(244, 114, 182, 0.4)' }]}>
              <PhoneCall size={20} color="#F472B6" />
            </View>
            <Text style={s.advisorTitle}>Talk to a Stay Advisor</Text>
            <Text style={s.advisorDesc}>
              Need custom housing, road-trip rentals, or group bookings near your university? Our advisors curate verified options in 4 hours.
            </Text>
            <Pressable
              style={[styles.advisorCTA, { backgroundColor: '#EC4899' }]}
              onPress={() => setAdvisorOpen(!advisorOpen)}
            >
              <Phone size={14} color="#fff" />
              <Text style={s.advisorCTAText}>Connect with Advisor</Text>
            </Pressable>
            {advisorOpen && (
              <View className="gap-2.5 mt-2">
                <Pressable style={s.advisorLinkRow} onPress={() => Linking.openURL('tel:+919876543210').catch(() => {})}>
                  <Phone size={14} color="#F472B6" />
                  <Text style={[styles.advisorLinkText, { color: '#F472B6' }]}>+91 9876543210</Text>
                </Pressable>
                <Pressable style={s.advisorLinkRow} onPress={() => Linking.openURL('mailto:advisor@studentalumni.in?subject=Help with rentals').catch(() => {})}>
                  <Mail size={14} color="#F472B6" />
                  <Text style={[styles.advisorLinkText, { color: '#F472B6' }]}>advisor@studentalumni.in</Text>
                </Pressable>
                <Text style={s.advisorNote}>Mon–Fri · 9am – 7pm IST · response within 4 hours</Text>
              </View>
            )}
          </View>

          {/* My Bookings Card */}
          <View style={[styles.advisorCard, { borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
            <View style={[styles.advisorIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.4)' }]}>
              <Ticket size={20} color="#8B5CF6" />
            </View>
            <Text style={s.advisorTitle}>My Active Bookings</Text>
            {bookings.length > 0 ? (
              <View style={{ gap: 6, flexGrow: 1 }}>
                <Text style={s.advisorDesc} numberOfLines={1}>
                  <Text style={{ fontWeight: '800', color: '#fff' }}>Current Stay:</Text> {currentStay.listing_snapshot?.title || 'Active Booking'}
                </Text>
                <Text style={s.advisorDesc}>
                  <Text style={{ fontWeight: '800', color: '#fff' }}>Dates:</Text> {fmtDate(currentStay.check_in)} – {fmtDate(currentStay.check_out)}
                </Text>
                <Text style={s.advisorDesc}>
                  <Text style={{ fontWeight: '800', color: '#fff' }}>Status:</Text>{' '}
                  <Text style={{ color: '#34D399', fontWeight: '800' }}>{currentStay.status?.toUpperCase() || 'UNKNOWN'}</Text>
                </Text>
                {displayCount > 1 && (
                  <Text style={[styles.advisorDesc, { color: C.dim, marginTop: 2 }]}>
                    + {displayCount - 1} more active booking(s)
                  </Text>
                )}
              </View>
            ) : (
              <Text style={s.advisorDesc}>
                No active stays or bookings found. Browse housing, hostels, vehicles, or coworking desks from the catalog above.
              </Text>
            )}
            <Pressable
              style={[styles.advisorCTA, { backgroundColor: '#6366F1' }]}
              onPress={() => setBookingsOpen(true)}
            >
              <Ticket size={14} color="#fff" />
              <Text style={s.advisorCTAText}>Show My Bookings</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── STEP 1: Listing Details Modal ("View Details") ── */}
      <ListingDetailsModal
        listing={detailsFor}
        onClose={() => setDetailsFor(null)}
        onProceedToBook={(r) => {
          setDetailsFor(null);
          setBookingFor(r);
        }}
      />

      {/* ── STEP 2: Booking Form Modal ── */}
      <BookingModal
        listing={bookingFor}
        onClose={() => setBookingFor(null)}
        onSuccess={(b) => { setConfirmedBooking(b); setBookingFor(null); loadData(); }}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        booking={confirmedBooking}
        onClose={() => setConfirmedBooking(null)}
        onViewBookings={() => { setConfirmedBooking(null); setBookingsOpen(true); }}
      />

      {/* My Bookings Drawer */}
      <BookingsDrawer
        open={bookingsOpen}
        bookings={bookings}
        onClose={() => setBookingsOpen(false)}
        onCancelled={loadData}
      />

      {/* Floating Stay AI Assistant Chat */}
      <AIRentalAdvisor
        open={aiChatOpen}
        setOpen={setAiChatOpen}
      />

      {/* MD3 Floating Action Button — open Stay AI Chat */}
      <FAB icon="brain" label="Ask Stay AI" color="#6366F1"
            onPress={() => setAiChatOpen(true)} />
    </FeaturePageShell>
  );
}

/* ─── Rental Card Component ─────────────────────────────────── */
function RentalCard({ r, onViewDetails }: { r: Listing; onViewDetails: () => void }) {
  return (
    <View style={[styles.card, { borderColor: r.color + '33' }]}>
      <View style={[styles.cover, { backgroundColor: r.color + '1F', borderColor: r.color + '33' }]}>
        <View className="items-center">
          {getCategoryIcon(r.category, '#FFFFFF', 20)}
        </View>

        <View style={s.coverBadgeRow}>
          {r.verified && (
            <View className="px-2">
              <ShieldCheck size={11} color="#34D399" />
              <Text style={s.badgeVerifyText}>Verified</Text>
            </View>
          )}
          {r.featured && (
            <View className="px-2">
              <Star size={11} color="#F59E0B" />
              <Text style={s.badgeFeatText}>Featured</Text>
            </View>
          )}
        </View>
        <View style={[styles.discBadge, { backgroundColor: r.color + 'DD' }]}>
          <Text style={s.discText}>{r.discount} OFF</Text>
        </View>
      </View>

      <View style={{ padding: 16, gap: 10 }}>
        <View>
          <Text style={s.title} numberOfLines={1}>{r.title}</Text>
          <View style={s.metaRow}>
            <MapPin size={12} color={C.dim} />
            <Text style={s.loc} numberOfLines={1}>{r.location}</Text>
            <Text style={s.dot}>·</Text>
            <Text style={s.type}>{r.type}</Text>
          </View>
        </View>

        {/* Amenities pills */}
        <View style={s.amenRow}>
          {(r.amenities || []).slice(0, 3).map((a, i) => (
            <View key={i} style={s.amenChip}>
              <Check size={10} color="#A5B4FC" />
              <Text style={s.amenText}>{a}</Text>
            </View>
          ))}
        </View>

        {/* Rating & Availability */}
        <View style={s.ratingRow}>
          <Star size={13} color="#F59E0B" fill="#F59E0B" />
          <Text style={s.ratingText}>{r.rating}</Text>
          <Text style={s.ratingCount}>({r.reviews} reviews)</Text>
          <View style={{ flex: 1 }} />
          <Text style={s.available}>{r.available} left</Text>
        </View>

        {!!r.perk && (
          <View style={[styles.perkBar, { borderColor: r.color + '44', backgroundColor: r.color + '15' }]}>
            <Sparkles size={11} color={r.color} />
            <Text style={[styles.perkText, { color: r.color }]} numberOfLines={1}>
              {r.perk}
            </Text>
          </View>
        )}

        {/* Price & Action Button */}
        <View className="justify-between">
          <View>
            <Text style={s.priceOrig}>{r.orig_label}</Text>
            <Text style={[styles.priceRent, { color: r.color }]}>{r.rent_label}</Text>
          </View>
          <Pressable onPress={onViewDetails}
            style={[styles.bookBtn, { backgroundColor: r.color }]}>
            <Eye size={13} color="#fff" />
            <Text className="text-xs">View Details</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* ─── STEP 1: Listing Details Modal ("View Details") ─────────── */
function ListingDetailsModal({
  listing, onClose, onProceedToBook,
}: {
  listing: Listing | null;
  onClose: () => void;
  onProceedToBook: (r: Listing) => void;
}) {
  if (!listing) return null;

  return (
    <Modal visible={!!listing} transparent animationType="fade" onRequestClose={onClose}>
      <View className="justify-center">
        <View style={s.detailsSheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header / Hero Cover */}
            <View style={[styles.detailsHero, { backgroundColor: listing.color + '22', borderColor: listing.color + '44' }]}>
              <View style={s.detailsCategoryBox}>
                {getCategoryIcon(listing.category, listing.color, 32)}
              </View>
              <Pressable onPress={onClose} className="rounded-full" hitSlop={12}>
                <X size={18} color="#FFFFFF" />
              </Pressable>

              <View style={s.detailsBadgeContainer}>
                {listing.verified && (
                  <View className="px-2">
                    <ShieldCheck size={11} color="#34D399" />
                    <Text style={s.badgeVerifyText}>SA Verified</Text>
                  </View>
                )}
                {listing.featured && (
                  <View className="px-2">
                    <Star size={11} color="#F59E0B" />
                    <Text style={s.badgeFeatText}>Featured Pick</Text>
                  </View>
                )}
                <View style={[styles.discBadge, { backgroundColor: listing.color, position: 'relative', top: 0, right: 0 }]}>
                  <Text style={s.discText}>{listing.discount} OFF</Text>
                </View>
              </View>
            </View>

            <View style={{ padding: 20, gap: 16 }}>
              {/* Title & Location */}
              <View>
                <Text style={s.detailsTitle}>{listing.title}</Text>
                <View style={[styles.metaRow, { marginTop: 6 }]}>
                  <MapPin size={14} color="#A5B4FC" />
                  <Text style={[styles.loc, { fontSize: 13, color: C.text2 }]}>{listing.location}, {listing.city}</Text>
                  <Text style={s.dot}>·</Text>
                  <Text style={[styles.type, { fontSize: 13, color: '#A5B4FC' }]}>{listing.type}</Text>
                </View>
              </View>

              {/* Rating & Availability Grid */}
              <View style={s.detailsStatsRow}>
                <View style={s.detailsStatItem}>
                  <Text style={s.detailsStatKey}>RATING</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                    <Text style={s.detailsStatVal}>{listing.rating} ({listing.reviews} reviews)</Text>
                  </View>
                </View>
                <View style={s.detailsStatItem}>
                  <Text style={s.detailsStatKey}>AVAILABILITY</Text>
                  <Text style={[styles.detailsStatVal, { color: '#34D399' }]}>{listing.available} units remaining</Text>
                </View>
                <View style={s.detailsStatItem}>
                  <Text style={s.detailsStatKey}>ACCOMMODATION</Text>
                  <Text style={s.detailsStatVal}>{listing.beds || 'Standard'}</Text>
                </View>
              </View>

              {/* Description & Perk */}
              <View style={s.detailsSection}>
                <Text style={s.sectionLabel}>ABOUT THIS PROPERTY</Text>
                <Text style={s.detailsDesc}>
                  {listing.description ||
                    `Premium ${listing.category} listing located in ${listing.location}. Fully verified by StudentAlumni stay advisors with guaranteed high-speed internet, security, and student-friendly terms.`}
                </Text>

                {!!listing.perk && (
                  <View style={[styles.perkBar, { borderColor: listing.color + '44', backgroundColor: listing.color + '15', marginTop: 10 }]}>
                    <Sparkles size={13} color={listing.color} />
                    <Text style={[styles.perkText, { color: listing.color, fontSize: 12 }]}>
                      {listing.perk}
                    </Text>
                  </View>
                )}
              </View>

              {/* Amenities List */}
              <View style={s.detailsSection}>
                <Text style={s.sectionLabel}>AMENITIES & INCLUSIONS</Text>
                <View style={s.detailsAmenGrid}>
                  {(listing.amenities || ['WiFi', 'AC', 'Security', 'Power Backup']).map((a, i) => (
                    <View key={i} className="rounded-lg">
                      <CheckCircle2 size={13} color="#34D399" />
                      <Text style={s.detailsAmenText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Price & Action */}
              <View className="p-4">
                <View>
                  <Text style={s.priceOrig}>{listing.orig_label}</Text>
                  <Text style={[styles.priceRent, { color: listing.color, fontSize: 20 }]}>{listing.rent_label}</Text>
                  <Text style={{ color: C.dim, fontSize: 11, fontFamily: FT.med }}>Inclusive of all SA discount perks</Text>
                </View>

                <Pressable
                  onPress={() => onProceedToBook(listing)}
                  style={[styles.confirmBtn, { backgroundColor: listing.color, paddingHorizontal: 24 }]}
                >
                  <Calendar size={16} color="#fff" />
                  <Text style={s.confirmBtnText}>Proceed to Book</Text>
                </Pressable>
              </View>

              <Text style={s.fineprint}>
                SA Verified Listing · Free Cancellation up to 24h before move-in date
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ─── STEP 2: Booking Sheet Modal ────────────────────────────── */
function BookingModal({ listing, onClose, onSuccess }:
  { listing: Listing | null; onClose: () => void;
    onSuccess: (b: Booking) => void }) {

  const todayPlus = (d: number) => {
    const t = new Date(); t.setDate(t.getDate() + d);
    return t.toISOString().slice(0, 10);
  };
  const [checkIn, setCheckIn] = useState(todayPlus(2));
  const [checkOut, setCheckOut] = useState(todayPlus(4));
  const [guests, setGuests] = useState('1');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (listing) {
      setCheckIn(todayPlus(2));
      setCheckOut(todayPlus(listing.category === 'housing' || listing.category === 'coworking' ? 32 : 4));
      setGuests('1'); setNotes(''); setErr(null);
    }
  }, [listing]);

  const days = useMemo(() => {
    try {
      const a = new Date(checkIn).getTime();
      const b = new Date(checkOut).getTime();
      return Math.max(1, Math.round((b - a) / 86400000));
    } catch { return 1; }
  }, [checkIn, checkOut]);

  const isMonthly = (listing?.rent_label || '').toLowerCase().includes('/mo');
  const units = isMonthly ? Math.max(1, Math.floor(days / 30)) || 1 : days;
  const unitWord = isMonthly ? (units === 1 ? 'month' : 'months')
                             : (units === 1 ? 'night' : 'nights');
  const subtotal = (listing?.rent_inr || 0) * units;
  const origSubtotal = (listing?.orig_inr || 0) * units;
  const savings = Math.max(0, origSubtotal - subtotal);
  const fee = Math.round(subtotal * 0.04);
  const deposit = listing && (listing.category === 'housing' || listing.category === 'coworking')
    ? listing.rent_inr : 0;
  const total = subtotal + fee + deposit;

  const submit = async () => {
    if (!listing) return;
    setBusy(true); setErr(null);
    try {
      const r = await request<any>('/rentals/book', {
        method: 'POST',
        body: { listing_id: listing.id, check_in: checkIn,
                check_out: checkOut, guests: parseInt(guests) || 1, notes },
      });
      onSuccess(r.booking);
    } catch (e: any) {
      setErr(e?.message || 'Could not book. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={!!listing} transparent animationType="fade" onRequestClose={onClose}>
      <View className="justify-center">
        <View style={s.sheet}>
          {listing && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.sheetHeader}>
                <View style={[styles.sheetIconBox, { backgroundColor: listing.color + '22', borderColor: listing.color + '55' }]}>
                  {getCategoryIcon(listing.category, listing.color, 24)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetTitle}>{listing.title}</Text>
                  <View style={s.metaRow}>
                    <MapPin size={11} color={C.dim} />
                    <Text style={s.loc} numberOfLines={1}>{listing.location}</Text>
                  </View>
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <X size={20} color={C.text2} />
                </Pressable>
              </View>

              <Text style={s.sectionLabel}>STAY DATES & GUESTS</Text>
              <View style={s.fieldRow}>
                <Field label={isMonthly ? 'Move-in date' : 'Check-in'}
                       Icon={Calendar} value={checkIn} onChange={setCheckIn}
                       placeholder="YYYY-MM-DD" />
                <Field label={isMonthly ? 'End date' : 'Check-out'}
                       Icon={Calendar} value={checkOut} onChange={setCheckOut}
                       placeholder="YYYY-MM-DD" />
              </View>
              <View style={s.fieldRow}>
                <Field label="Guests / Members"
                       Icon={Users} value={guests} onChange={setGuests}
                       keyboardType="numeric" />
                <View style={{ flex: 1 }} />
              </View>
              <Field label="Notes for host (optional)"
                     Icon={FileText} value={notes} onChange={setNotes}
                     placeholder="Special requests, parking, late check-in…"
                     multiline />

              <Text style={s.sectionLabel}>PRICE BREAKDOWN</Text>
              <View style={s.priceTable}>
                <Row k={`${listing.rent_label} × ${units} ${unitWord}`}
                     v={fmtINR(subtotal)} />
                {savings > 0 && (
                  <Row k="SA member savings" v={`− ${fmtINR(savings)}`}
                       valColor="#34D399" />
                )}
                <Row k="Service fee (4%)" v={fmtINR(fee)} />
                {deposit > 0 && (
                  <Row k="Refundable security deposit" v={fmtINR(deposit)} />
                )}
                <View style={s.priceDivider} />
                <Row k="Total payable today" v={fmtINR(total)} bold valColor="#fff" />
              </View>

              {err && (
                <View className="px-3">
                  <Info size={14} color="#F87171" />
                  <Text style={s.errText}>{err}</Text>
                </View>
              )}

              <View style={s.actionRow}>
                <Pressable onPress={onClose} style={s.cancelBtn}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submit} disabled={busy}
                  style={[styles.confirmBtn, { backgroundColor: listing.color, opacity: busy ? 0.7 : 1 }]}>
                  {busy ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Lock size={14} color="#fff" />
                      <Text style={s.confirmBtnText}>
                        Confirm Booking · {fmtINR(total)}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              <Text style={s.fineprint}>
                Free cancellation up to 24 h before check-in · SA Verified host
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, Icon, value, onChange, placeholder, keyboardType, multiline }:
  { label: string; Icon: any; value: string;
    onChange: (s: string) => void;
    placeholder?: string; keyboardType?: any; multiline?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBox, multiline && { height: 64, alignItems: 'flex-start', paddingTop: 10 }]}>
        <Icon size={14} color={C.dim} />
        <TextInput style={[styles.fieldInput, multiline && { textAlignVertical: 'top' }]}
                   placeholder={placeholder || ''}
                   placeholderTextColor={C.dim}
                   value={value}
                   onChangeText={onChange}
                   keyboardType={keyboardType}
                   multiline={multiline} />
      </View>
    </View>
  );
}

function Row({ k, v, bold, valColor }:
  { k: string; v: string; bold?: boolean; valColor?: string }) {
  return (
    <View style={s.tableRow}>
      <Text style={[styles.tableK, bold && { color: '#fff', fontFamily: FT.xbold }]}>
        {k}
      </Text>
      <Text style={[styles.tableV, bold && { fontFamily: FT.xbold, fontSize: 14 }, valColor ? { color: valColor } : null]}>
        {v}
      </Text>
    </View>
  );
}

/* ─── Confirmation modal ────────────────────────────────────── */
function ConfirmationModal({ booking, onClose, onViewBookings }:
  { booking: Booking | null; onClose: () => void; onViewBookings: () => void }) {
  return (
    <Modal visible={!!booking} transparent animationType="fade" onRequestClose={onClose}>
      <View className="justify-center">
        <View className="rounded-2xl">
          {booking && (
            <>
              <View className="items-center">
                <Sparkles size={36} color="#F59E0B" />
              </View>
              <Text className="text-lg">Booking Confirmed!</Text>
              <Text className="text-sm">
                {booking.listing_snapshot?.title}
              </Text>
              <View className="px-3">
                <Ticket size={12} color="#A5B4FC" />
                <Text style={s.confirmIdText}>{booking.booking_id}</Text>
              </View>

              <View className="mt-4">
                <View style={s.confirmCell}>
                  <Text style={s.confirmCellLabel}>CHECK-IN</Text>
                  <Text className="text-sm">{fmtDate(booking.check_in)}</Text>
                </View>
                <View style={s.confirmCell}>
                  <Text style={s.confirmCellLabel}>CHECK-OUT</Text>
                  <Text className="text-sm">{fmtDate(booking.check_out)}</Text>
                </View>
                <View style={s.confirmCell}>
                  <Text style={s.confirmCellLabel}>DURATION</Text>
                  <Text className="text-sm">
                    {booking.duration?.value} {booking.duration?.unit}
                  </Text>
                </View>
                <View style={s.confirmCell}>
                  <Text style={s.confirmCellLabel}>TOTAL</Text>
                  <Text style={[styles.confirmCellValue, { color: '#34D399' }]}>
                    {fmtINR(booking.cost_breakdown?.total_inr)}
                  </Text>
                </View>
              </View>

              {booking.cost_breakdown?.sa_savings_inr > 0 && (
                <View className="px-4">
                  <Sparkles size={12} color="#F59E0B" />
                  <Text style={s.savingsText}>
                    You saved {fmtINR(booking.cost_breakdown.sa_savings_inr)} via SA-ID
                  </Text>
                </View>
              )}

              <Pressable onPress={onViewBookings} className="px-5 mt-4">
                <Ticket size={14} color="#fff" />
                <Text style={s.confirmCTAText}>View My Bookings</Text>
              </Pressable>
              <Pressable onPress={onClose} className="items-center">
                <Text style={s.confirmDismissText}>Done</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ─── My Bookings Drawer ────────────────────────────────────── */
function BookingsDrawer({ open, bookings, onClose, onCancelled }:
  { open: boolean; bookings: Booking[];
    onClose: () => void; onCancelled: () => void }) {

  const [busyId, setBusyId] = useState<string | null>(null);
  const cancel = async (id: string) => {
    setBusyId(id);
    try {
      await request<any>(`/rentals/bookings/${id}/cancel`, { method: 'POST' });
      onCancelled();
    } catch (e: any) { console.warn(e?.message); }
    finally { setBusyId(null); }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="justify-center">
        <View style={s.drawer}>
          <View className="justify-between">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ticket size={18} color="#F59E0B" />
              <Text style={s.drawerTitle}>My Bookings</Text>
              <View style={s.drawerCountBadge}>
                <Text style={s.drawerCountText}>{bookings.length}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} color={C.text2} />
            </Pressable>
          </View>

          {bookings.length === 0 ? (
            <View style={s.emptyDrawer}>
              <Calendar size={40} color={C.dim} />
              <Text style={s.emptyTitle}>No bookings yet</Text>
              <Text style={s.emptySub}>
                Book a stay, ride or workspace to see it here.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 30 }}>
              {bookings.map((b) => (
                <View key={b.booking_id}
                  style={[styles.bookingCard, { borderColor: (b.listing_snapshot?.color || '#6366F1') + '44' }]}>
                  <View style={s.bookingTop}>
                    <View style={[styles.bookingIconBox, { backgroundColor: (b.listing_snapshot?.color || '#6366F1') + '22' }]}>
                      {getCategoryIcon(b.listing_snapshot?.category || 'housing', b.listing_snapshot?.color || '#818CF8', 20)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bookingTitle} numberOfLines={1}>
                        {b.listing_snapshot?.title}
                      </Text>
                      <Text style={s.bookingMeta} numberOfLines={1}>
                        {b.listing_snapshot?.location}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, statusStyle(b.status)]}>
                      <Text style={[styles.statusText, { color: statusStyle(b.status).color }]}>
                        {b.status?.toUpperCase() || 'UNKNOWN'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.bookingFacts}>
                    <Fact Icon={Calendar} v={fmtDate(b.check_in)} />
                    <Fact Icon={Calendar} v={fmtDate(b.check_out)} />
                    <Fact Icon={Users} v={`${b.guests} guest${b.guests > 1 ? 's' : ''}`} />
                    <Fact Icon={Tag} v={fmtINR(b.cost_breakdown?.total_inr)} bold />
                  </View>

                  {b.status !== 'cancelled' && (
                    <View style={s.bookingTimeline}>
                      {b.timeline?.map((t, i) => (
                        <View key={t.id} style={s.tlStep}>
                          <View style={[styles.tlDot,
                            t.status === 'done' && { backgroundColor: '#34D399' },
                            t.status === 'current' && { backgroundColor: '#F59E0B' },
                            t.status === 'pending' && { backgroundColor: C.dim }]} />
                          <Text style={[styles.tlLabel,
                            t.status === 'done' && { color: '#34D399' },
                            t.status === 'current' && { color: '#F59E0B' }]}>
                            {t.label}
                          </Text>
                          {i < b.timeline.length - 1 && <View style={s.tlBar} />}
                        </View>
                      ))}
                    </View>
                  )}

                  {b.status === 'confirmed' && (
                    <View style={s.bookingActionRow}>
                      <Pressable onPress={() => cancel(b.booking_id)}
                        disabled={busyId === b.booking_id}
                        className="px-3">
                        {busyId === b.booking_id ? (
                          <ActivityIndicator size="small" color="#F87171" />
                        ) : (
                          <>
                            <X size={12} color="#F87171" />
                            <Text style={s.cancelLinkText}>Cancel booking</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Fact({ Icon, v, bold }: { Icon: any; v: string; bold?: boolean }) {
  return (
    <View className="px-2">
      <Icon size={11} color={C.dim} />
      <Text style={[styles.factText, bold && { color: '#34D399', fontFamily: FT.xbold }]}>
        {v}
      </Text>
    </View>
  );
}

function Stat({ label, value, sub, color, Icon }:
  { label: string; value: string; sub: string; color: string; Icon: any }) {
  return (
    <View style={s.statCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.statIcon, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Icon size={14} color={color} />
        </View>
        <Text className="text-xs">{label}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

const statusStyle = (status: string) => {
  if (status === 'confirmed')
    return { color: '#34D399', backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.35)' };
  if (status === 'pending')
    return { color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.35)' };
  if (status === 'cancelled')
    return { color: '#F87171', backgroundColor: 'rgba(248, 113, 113, 0.15)', borderColor: 'rgba(248, 113, 113, 0.35)' };
  return { color: '#A5B4FC', backgroundColor: 'rgba(165, 180, 252, 0.15)', borderColor: 'rgba(165, 180, 252, 0.35)' };
};

/* ────────── Career AI Styles ────────── */

