// @ts-nocheck
/**
 * /rentals — SA Stay (Rentals Marketplace)
 * Re-themed with Career AI visual aesthetics, background artwork, Lucide icons (no emojis),
 * and a 2-step booking flow: View Details -> Proceed to Book.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, TextInput, Modal, Platform, Linking, ImageBackground,
} from 'react-native';
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
  bg: '#FFFFFF',
  bgCard: 'rgba(0, 0, 0, 0.02)',
  bgCardHover: 'rgba(0, 0, 0, 0.04)',
  border: 'rgba(0, 0, 0, 0.12)',
  border2: 'rgba(0, 0, 0, 0.12)',
  borderAccent: 'rgba(37, 99, 235, 0.25)',
  text: '#000000',
  text2: 'rgba(0, 0, 0, 0.85)',
  textSub: 'rgba(0, 0, 0, 0.65)',
  dim: 'rgba(0, 0, 0, 0.55)',
  purple: '#2563EB',
  purple2: '#2563EB',
  purpleL: '#1E40AF',
  purpleXL: '#1D4ED8',
  teal: '#2563EB',
  blue: '#2563EB',
  amber: '#2563EB',
  red: '#DC2626',
  green: '#2563EB',
  pink: '#2563EB',
};

const FT = {
  reg: 'DMSans_400Regular',
  med: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  xbold: 'DMSans_800ExtraBold',
};

const ALL_CAT: CategoryDef = { id: 'all', label: 'All Rentals', iconKey: 'grid',
  color: '#2563EB', tagline: 'Everything in one place', count: 0 };

const getCategoryIcon = (catId: string, color: string = '#2563EB', size: number = 18) => {
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
      accent="#2563EB"
      rightSlot={
        <View style={s.rightRow}>
          <Pressable onPress={() => setBookingsOpen(true)} style={s.bookingsPill}>
            <Ticket size={13} color={C.blue} />
            <Text style={s.bookingsPillText}>My Bookings</Text>
            {bookings.length > 0 && (
              <View style={s.bookingsBadge}>
                <Text style={s.bookingsBadgeText}>{bookings.length}</Text>
              </View>
            )}
          </Pressable>
          <View style={s.verifyPill}>
            <ShieldCheck size={13} color={C.blue} />
            <Text style={s.verifyText}>All SA Verified</Text>
          </View>
        </View>
      }
    >
      {/* ── Career AI Ambient Glass Hero Artwork Background Container ── */}
      <View style={s.heroArtBox}>
        <LinearGradient
          colors={['rgba(37, 99, 235, 0.12)', 'rgba(37, 99, 235, 0.04)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={s.heroArtContent}>
          <View style={s.heroBadge}>
            <Sparkles size={14} color={C.purpleL} />
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
              color={C.blue} Icon={LayoutGrid} />
        <Stat label="SA VERIFIED" value={String(stats.verified)} sub="Guaranteed authenticity"
              color={C.blue} Icon={ShieldCheck} />
        <Stat label="FEATURED" value={String(stats.featured)} sub="Top picks of the month"
              color={C.blue} Icon={Star} />
        <Stat label="SA DISCOUNTS" value="Up to 25%" sub="Exclusive member savings"
              color={C.blue} Icon={Tag} />
      </View>

      {/* Search + City filter */}
      <View style={s.filterRow}>
        <View style={s.searchBox}>
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
                style={[s.cityPill, active && s.cityPillActive]}>
                <MapPin size={11} color={active ? '#2563EB' : C.dim} />
                <Text style={[s.cityPillText, active && { color: '#2563EB' }]}>
                  {cv === 'all' ? 'All Cities' : cv}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Category Tabs */}
      <Text style={s.kicker}>BROWSE BY CATEGORY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {categories.map((c) => {
          const active = cat === c.id;
          return (
            <Pressable key={c.id} onPress={() => setCat(c.id)}
              style={[s.tab, active && { backgroundColor: c.color + '22', borderColor: c.color + '66' }]}>
              {getCategoryIcon(c.id, active ? c.color : C.textSub, 15)}
              <Text style={[s.tabText, active && { color: c.color }]}>
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
          <ActivityIndicator color="#2563EB" size="large" />
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
          <View style={[s.advisorCard, { borderColor: 'rgba(37, 99, 235, 0.3)' }]}>
            <View style={[s.advisorIconBox, { backgroundColor: 'rgba(37, 99, 235, 0.15)', borderColor: 'rgba(37, 99, 235, 0.4)' }]}>
              <PhoneCall size={20} color="#2563EB" />
            </View>
            <Text style={s.advisorTitle}>Talk to a Stay Advisor</Text>
            <Text style={s.advisorDesc}>
              Need custom housing, road-trip rentals, or group bookings near your university? Our advisors curate verified options in 4 hours.
            </Text>
            <Pressable
              style={[s.advisorCTA, { backgroundColor: '#2563EB' }]}
              onPress={() => setAdvisorOpen(!advisorOpen)}
            >
              <Phone size={14} color="#fff" />
              <Text style={s.advisorCTAText}>Connect with Advisor</Text>
            </Pressable>
            {advisorOpen && (
              <View style={s.advisorExpanded}>
                <Pressable style={s.advisorLinkRow} onPress={() => Linking.openURL('tel:+919876543210').catch(() => {})}>
                  <Phone size={14} color="#2563EB" />
                  <Text style={[s.advisorLinkText, { color: '#2563EB' }]}>+91 9876543210</Text>
                </Pressable>
                <Pressable style={s.advisorLinkRow} onPress={() => Linking.openURL('mailto:advisor@studentalumni.in?subject=Help with rentals').catch(() => {})}>
                  <Mail size={14} color="#2563EB" />
                  <Text style={[s.advisorLinkText, { color: '#2563EB' }]}>advisor@studentalumni.in</Text>
                </Pressable>
                <Text style={s.advisorNote}>Mon–Fri · 9am – 7pm IST · response within 4 hours</Text>
              </View>
            )}
          </View>

          {/* My Bookings Card */}
          <View style={[s.advisorCard, { borderColor: 'rgba(37, 99, 235, 0.3)' }]}>
            <View style={[s.advisorIconBox, { backgroundColor: 'rgba(37, 99, 235, 0.15)', borderColor: 'rgba(37, 99, 235, 0.4)' }]}>
              <Ticket size={20} color="#2563EB" />
            </View>
            <Text style={s.advisorTitle}>My Active Bookings</Text>
            {bookings.length > 0 ? (
              <View style={{ gap: 6, flexGrow: 1 }}>
                <Text style={s.advisorDesc} numberOfLines={1}>
                  <Text style={{ fontWeight: '800', color: C.text }}>Current Stay:</Text> {currentStay.listing_snapshot?.title || 'Active Booking'}
                </Text>
                <Text style={s.advisorDesc}>
                  <Text style={{ fontWeight: '800', color: C.text }}>Dates:</Text> {fmtDate(currentStay.check_in)} – {fmtDate(currentStay.check_out)}
                </Text>
                <Text style={s.advisorDesc}>
                  <Text style={{ fontWeight: '800', color: C.text }}>Status:</Text>{' '}
                  <Text style={{ color: C.green, fontWeight: '800' }}>{currentStay.status?.toUpperCase() || 'UNKNOWN'}</Text>
                </Text>
                {displayCount > 1 && (
                  <Text style={[s.advisorDesc, { color: C.dim, marginTop: 2 }]}>
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
              style={[s.advisorCTA, { backgroundColor: C.purple }]}
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
      <FAB icon="brain" label="Ask Stay AI" color={C.purple}
            onPress={() => setAiChatOpen(true)} />
    </FeaturePageShell>
  );
}

/* ─── Rental Card Component ─────────────────────────────────── */
function RentalCard({ r, onViewDetails }: { r: Listing; onViewDetails: () => void }) {
  return (
    <View style={[s.card, { borderColor: 'rgba(37,99,235,0.20)' }]}>
      <View style={[s.cover, { backgroundColor: 'rgba(37,99,235,0.12)', borderColor: 'rgba(37,99,235,0.20)' }]}>
        <View style={s.coverCategoryBadge}>
          {getCategoryIcon(r.category, '#FFFFFF', 20)}
        </View>

        <View style={s.coverBadgeRow}>
          {r.verified && (
            <View style={s.badgeVerify}>
              <ShieldCheck size={11} color="#2563EB" />
              <Text style={s.badgeVerifyText}>Verified</Text>
            </View>
          )}
          {r.featured && (
            <View style={s.badgeFeat}>
              <Star size={11} color="#1E40AF" />
              <Text style={s.badgeFeatText}>Featured</Text>
            </View>
          )}
        </View>
        <View style={[s.discBadge, { backgroundColor: '#2563EB' }]}>
          <Text style={s.discText}>{r.discount} OFF</Text>
        </View>
      </View>

      <View style={{ padding: 16, gap: 10 }}>
        {!!r.emoji && (
          <View style={s.logoCircle}>
            <Text style={s.logoEmoji}>{r.emoji}</Text>
          </View>
        )}
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
              <Check size={10} color="#2563EB" />
              <Text style={s.amenText}>{a}</Text>
            </View>
          ))}
        </View>

        {/* Rating & Availability */}
        <View style={s.ratingRow}>
          <Star size={13} color="#2563EB" fill="#2563EB" />
          <Text style={s.ratingText}>{r.rating}</Text>
          <Text style={s.ratingCount}>({r.reviews} reviews)</Text>
          <View style={{ flex: 1 }} />
          <Text style={s.available}>{r.available} left</Text>
        </View>

        {!!r.perk && (
          <View style={[s.perkBar, { borderColor: 'rgba(37,99,235,0.25)', backgroundColor: 'rgba(37,99,235,0.08)' }]}>
            <Sparkles size={11} color="#2563EB" />
            <Text style={[s.perkText, { color: '#2563EB' }]} numberOfLines={1}>
              {r.perk}
            </Text>
          </View>
        )}

        {/* Price & Action Button */}
        <View style={s.priceRow}>
          <View>
            <Text style={s.priceOrig}>{r.orig_label}</Text>
            <Text style={[s.priceRent, { color: '#2563EB' }]}>{r.rent_label}</Text>
          </View>
          <Pressable onPress={onViewDetails}
            style={[s.bookBtn, { borderColor: C.border }]}>
            <Eye size={13} color={C.text2} />
            <Text style={s.bookText}>View Details</Text>
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
      <View style={s.overlay}>
        <View style={s.detailsSheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header / Hero Cover */}
            <View style={[s.detailsHero, { backgroundColor: 'rgba(37,99,235,0.13)', borderColor: 'rgba(37,99,235,0.25)' }]}>
              <View style={s.detailsCategoryBox}>
                {getCategoryIcon(listing.category, '#2563EB', 32)}
              </View>
              <Pressable onPress={onClose} style={s.detailsCloseBtn} hitSlop={12}>
                <X size={18} color="#FFFFFF" />
              </Pressable>

              <View style={s.detailsBadgeContainer}>
                {listing.verified && (
                  <View style={s.badgeVerify}>
                    <ShieldCheck size={11} color="#2563EB" />
                    <Text style={s.badgeVerifyText}>SA Verified</Text>
                  </View>
                )}
                {listing.featured && (
                  <View style={s.badgeFeat}>
                    <Star size={11} color="#1E40AF" />
                    <Text style={s.badgeFeatText}>Featured Pick</Text>
                  </View>
                )}
                <View style={[s.discBadge, { backgroundColor: '#2563EB', position: 'relative', top: 0, right: 0 }]}>
                  <Text style={s.discText}>{listing.discount} OFF</Text>
                </View>
              </View>
            </View>

            <View style={{ padding: 20, gap: 16 }}>
              {/* Title & Location */}
              <View>
                <Text style={s.detailsTitle}>{listing.title}</Text>
                <View style={[s.metaRow, { marginTop: 6 }]}>
                  <MapPin size={14} color="#2563EB" />
                  <Text style={[s.loc, { fontSize: 13, color: C.text2 }]}>{listing.location}, {listing.city}</Text>
                  <Text style={s.dot}>·</Text>
                  <Text style={[s.type, { fontSize: 13, color: '#2563EB' }]}>{listing.type}</Text>
                </View>
              </View>

              {/* Rating & Availability Grid */}
              <View style={s.detailsStatsRow}>
                <View style={s.detailsStatItem}>
                  <Text style={s.detailsStatKey}>RATING</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Star size={14} color="#2563EB" fill="#2563EB" />
                    <Text style={s.detailsStatVal}>{listing.rating} ({listing.reviews} reviews)</Text>
                  </View>
                </View>
                <View style={s.detailsStatItem}>
                  <Text style={s.detailsStatKey}>AVAILABILITY</Text>
                  <Text style={[s.detailsStatVal, { color: '#2563EB' }]}>{listing.available} units remaining</Text>
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
                  <View style={[s.perkBar, { borderColor: 'rgba(37,99,235,0.25)', backgroundColor: 'rgba(37,99,235,0.08)', marginTop: 10 }]}>
                    <Sparkles size={13} color="#2563EB" />
                    <Text style={[s.perkText, { color: '#2563EB', fontSize: 12 }]}>
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
                    <View key={i} style={s.detailsAmenCell}>
                      <CheckCircle2 size={13} color="#34D399" />
                      <Text style={s.detailsAmenText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Price & Action */}
              <View style={s.detailsFooterBox}>
                <View>
                  <Text style={s.priceOrig}>{listing.orig_label}</Text>
                  <Text style={[s.priceRent, { color: listing.color, fontSize: 20 }]}>{listing.rent_label}</Text>
                  <Text style={{ color: C.dim, fontSize: 11, fontFamily: FT.med }}>Inclusive of all SA discount perks</Text>
                </View>

                <Pressable
                  onPress={() => onProceedToBook(listing)}
                  style={[s.confirmBtn, { backgroundColor: listing.color, paddingHorizontal: 24 }]}
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
      <View style={s.overlay}>
        <View style={s.sheet}>
          {listing && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.sheetHeader}>
                <View style={[s.sheetIconBox, { backgroundColor: listing.color + '22', borderColor: listing.color + '55' }]}>
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
                <View style={s.errBox}>
                  <Info size={14} color="#F87171" />
                  <Text style={s.errText}>{err}</Text>
                </View>
              )}

              <View style={s.actionRow}>
                <Pressable onPress={onClose} style={s.cancelBtn}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submit} disabled={busy}
                  style={[s.confirmBtn, { backgroundColor: listing.color, opacity: busy ? 0.7 : 1 }]}>
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
      <View style={[s.fieldBox, multiline && { height: 64, alignItems: 'flex-start', paddingTop: 10 }]}>
        <Icon size={14} color={C.dim} />
        <TextInput style={[s.fieldInput, multiline && { textAlignVertical: 'top' }]}
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
      <Text style={[s.tableK, bold && { color: '#fff', fontFamily: FT.xbold }]}>
        {k}
      </Text>
      <Text style={[s.tableV, bold && { fontFamily: FT.xbold, fontSize: 14 }, valColor ? { color: valColor } : null]}>
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
      <View style={s.overlay}>
        <View style={s.confirmSheet}>
          {booking && (
            <>
              <View style={s.confirmIconBox}>
                <Sparkles size={36} color="#F59E0B" />
              </View>
              <Text style={s.confirmHeading}>Booking Confirmed!</Text>
              <Text style={s.confirmSub}>
                {booking.listing_snapshot?.title}
              </Text>
              <View style={s.confirmIdPill}>
                <Ticket size={12} color="#A5B4FC" />
                <Text style={s.confirmIdText}>{booking.booking_id}</Text>
              </View>

              <View style={s.confirmGrid}>
                <View style={s.confirmCell}>
                  <Text style={s.confirmCellLabel}>CHECK-IN</Text>
                  <Text style={s.confirmCellValue}>{fmtDate(booking.check_in)}</Text>
                </View>
                <View style={s.confirmCell}>
                  <Text style={s.confirmCellLabel}>CHECK-OUT</Text>
                  <Text style={s.confirmCellValue}>{fmtDate(booking.check_out)}</Text>
                </View>
                <View style={s.confirmCell}>
                  <Text style={s.confirmCellLabel}>DURATION</Text>
                  <Text style={s.confirmCellValue}>
                    {booking.duration?.value} {booking.duration?.unit}
                  </Text>
                </View>
                <View style={s.confirmCell}>
                  <Text style={s.confirmCellLabel}>TOTAL</Text>
                  <Text style={[s.confirmCellValue, { color: '#34D399' }]}>
                    {fmtINR(booking.cost_breakdown?.total_inr)}
                  </Text>
                </View>
              </View>

              {booking.cost_breakdown?.sa_savings_inr > 0 && (
                <View style={s.savingsPill}>
                  <Sparkles size={12} color="#F59E0B" />
                  <Text style={s.savingsText}>
                    You saved {fmtINR(booking.cost_breakdown.sa_savings_inr)} via SA-ID
                  </Text>
                </View>
              )}

              <Pressable onPress={onViewBookings} style={s.confirmCTA}>
                <Ticket size={14} color="#fff" />
                <Text style={s.confirmCTAText}>View My Bookings</Text>
              </Pressable>
              <Pressable onPress={onClose} style={s.confirmDismiss}>
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
      <View style={s.overlay}>
        <View style={s.drawer}>
          <View style={s.drawerHeader}>
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
                  style={[s.bookingCard, { borderColor: (b.listing_snapshot?.color || '#6366F1') + '44' }]}>
                  <View style={s.bookingTop}>
                    <View style={[s.bookingIconBox, { backgroundColor: (b.listing_snapshot?.color || '#6366F1') + '22' }]}>
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
                    <View style={[s.statusPill, statusStyle(b.status)]}>
                      <Text style={[s.statusText, { color: statusStyle(b.status).color }]}>
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
                          <View style={[s.tlDot,
                            t.status === 'done' && { backgroundColor: '#34D399' },
                            t.status === 'current' && { backgroundColor: '#F59E0B' },
                            t.status === 'pending' && { backgroundColor: C.dim }]} />
                          <Text style={[s.tlLabel,
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
                        style={s.cancelLinkBtn}>
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
    <View style={s.factCell}>
      <Icon size={11} color={C.dim} />
      <Text style={[s.factText, bold && { color: '#34D399', fontFamily: FT.xbold }]}>
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

const statusStyle = (status: string) => {
  if (status === 'confirmed')
    return { color: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.15)', borderColor: 'rgba(37, 99, 235, 0.35)' };
  if (status === 'pending')
    return { color: '#1E40AF', backgroundColor: 'rgba(30, 64, 175, 0.12)', borderColor: 'rgba(30, 64, 175, 0.30)' };
  if (status === 'cancelled')
    return { color: '#DC2626', backgroundColor: 'rgba(220, 38, 38, 0.12)', borderColor: 'rgba(220, 38, 38, 0.30)' };
  return { color: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.12)', borderColor: 'rgba(37, 99, 235, 0.30)' };
};

/* ────────── Career AI Styles ────────── */
const s = StyleSheet.create({
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookingsPill: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(37, 99, 235, 0.35)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  bookingsPillText: { color: '#2563EB', fontFamily: FT.xbold, fontSize: 11 },
  bookingsBadge: { paddingHorizontal: 6, height: 16, borderRadius: 999,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  bookingsBadgeText: { color: '#FFFFFF', fontFamily: FT.xbold, fontSize: 9 },

  verifyPill: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(37, 99, 235, 0.35)', borderWidth: 1 },
  verifyText: { color: '#2563EB', fontFamily: FT.xbold, fontSize: 11 },

  /* Hero Artwork Box */
  heroArtBox: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 1,
    borderColor: C.border2, backgroundColor: C.bgCard,
    marginBottom: 16, position: 'relative',
  },
  heroArtContent: { padding: 20, gap: 8 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.15)', alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.35)' },
  heroBadgeText: { color: '#2563EB', fontFamily: FT.xbold, fontSize: 10, letterSpacing: 0.8 },
  heroTitle: { color: C.text, fontFamily: FT.xbold, fontSize: 22 },
  heroSub: { color: C.textSub, fontFamily: FT.med, fontSize: 13, lineHeight: 19, maxWidth: 720 },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 180, padding: 14, borderRadius: 14,
    backgroundColor: C.bgCard, borderColor: C.border,
    borderWidth: 1, gap: 6 },
  statIcon: { width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: C.dim, fontFamily: FT.xbold,
    fontSize: 10, letterSpacing: 1, flex: 1 },
  statValue: { fontFamily: FT.xbold, fontSize: 24, marginTop: 2 },
  statSub: { color: C.dim, fontFamily: FT.med, fontSize: 11 },

  filterRow: { gap: 10, marginTop: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, height: 42, borderRadius: 12,
    backgroundColor: C.bgCard, borderColor: C.border2,
    borderWidth: 1 },
  searchInput: { flex: 1, color: C.text, fontFamily: FT.med,
    fontSize: 13.5, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: C.bgCard, borderColor: C.border,
    borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  cityPillActive: { backgroundColor: 'rgba(37, 99, 235, 0.15)', borderColor: '#2563EB' },
  cityPillText: { color: C.textSub, fontFamily: FT.bold, fontSize: 11.5 },

  kicker: { color: C.dim, fontFamily: FT.xbold,
    fontSize: 11, letterSpacing: 1.2, marginTop: 12 },

  tab: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: C.bgCard, borderColor: C.border,
    borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  tabText: { color: C.textSub, fontFamily: FT.bold, fontSize: 12.5 },
  tabCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.12)' },
  tabCountText: { color: '#2563EB', fontFamily: FT.xbold, fontSize: 10 },

  loadingBox: { paddingVertical: 50, alignItems: 'center', gap: 12 },
  loadingText: { color: C.textSub, fontFamily: FT.med, fontSize: 13 },
  emptyBox: { paddingVertical: 50, alignItems: 'center', gap: 10 },
  emptyTitle: { color: C.text, fontFamily: FT.xbold, fontSize: 15, marginTop: 4 },
  emptySub: { color: C.dim, fontFamily: FT.med, fontSize: 12.5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flexGrow: 1, flexBasis: 300, maxWidth: 360, borderRadius: 16,
    borderWidth: 1, backgroundColor: C.bgCard, overflow: 'hidden' },
  cover: { height: 110, borderBottomWidth: 1, alignItems: 'center',
    justifyContent: 'center', position: 'relative' },
  coverCategoryBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center' },
  coverBadgeRow: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  badgeVerify: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(37, 99, 235, 0.30)', borderWidth: 1 },
  badgeVerifyText: { color: '#2563EB', fontFamily: FT.xbold, fontSize: 9.5 },
  badgeFeat: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(30, 64, 175, 0.12)',
    borderColor: 'rgba(30, 64, 175, 0.30)', borderWidth: 1 },
  badgeFeatText: { color: '#1E40AF', fontFamily: FT.xbold, fontSize: 9.5 },
  discBadge: { position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  discText: { color: '#fff', fontFamily: FT.xbold, fontSize: 10.5, letterSpacing: 0.4 },

  title: { color: C.text, fontFamily: FT.xbold, fontSize: 14.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  loc: { color: C.textSub, fontFamily: FT.med, fontSize: 11.5, flex: 1 },
  dot: { color: C.dim, fontSize: 11 },
  type: { color: C.purpleL, fontFamily: FT.bold, fontSize: 11.5 },

  amenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amenChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: C.border, borderWidth: 1 },
  amenText: { color: C.textSub, fontFamily: FT.bold, fontSize: 10.5 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { color: C.text, fontFamily: FT.xbold, fontSize: 12.5 },
  ratingCount: { color: C.dim, fontFamily: FT.med, fontSize: 11 },
  available: { color: '#2563EB', fontFamily: FT.bold, fontSize: 11 },

  perkBar: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  perkText: { flex: 1, fontFamily: FT.bold, fontSize: 11 },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginTop: 4 },
  priceOrig: { color: C.dim, textDecorationLine: 'line-through', fontFamily: FT.med, fontSize: 12 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  bookText: { color: C.text2, fontFamily: FT.bold, fontSize: 11.5 },
  logoCircle: { width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 26 },

  /* Modal Base */
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.60)',
    justifyContent: 'center', alignItems: 'center', padding: 16 },

  /* STEP 1: Details Sheet */
  detailsSheet: { width: '100%', maxWidth: 580, maxHeight: '92%',
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderColor: C.border, borderWidth: 1, overflow: 'hidden' },
  detailsHero: { height: 130, padding: 16, justifyContent: 'space-between',
    position: 'relative', borderBottomWidth: 1 },
  detailsCategoryBox: { width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  detailsCloseBtn: { position: 'absolute', top: 14, right: 14, width: 32, height: 32,
    borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  detailsBadgeContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  detailsTitle: { color: C.text, fontFamily: FT.xbold, fontSize: 20 },
  detailsStatsRow: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12,
    backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1 },
  detailsStatItem: { flex: 1 },
  detailsStatKey: { color: C.dim, fontFamily: FT.xbold, fontSize: 9.5, letterSpacing: 0.8 },
  detailsStatVal: { color: C.text, fontFamily: FT.bold, fontSize: 12.5, marginTop: 2 },
  detailsSection: { gap: 8 },
  detailsDesc: { color: C.textSub, fontFamily: FT.med, fontSize: 13, lineHeight: 20 },
  detailsAmenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailsAmenCell: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1 },
  detailsAmenText: { color: C.text2, fontFamily: FT.bold, fontSize: 11.5 },
  detailsFooterBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 14, backgroundColor: C.bgCard, borderColor: C.borderAccent, borderWidth: 1, marginTop: 6 },

  /* STEP 2: Booking Sheet */
  sheet: { width: '100%', maxWidth: 540, maxHeight: '92%',
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    borderColor: C.border, borderWidth: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sheetIconBox: { width: 48, height: 48, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { color: C.text, fontFamily: FT.xbold, fontSize: 16.5 },

  sectionLabel: { color: C.dim, fontFamily: FT.xbold,
    fontSize: 10.5, letterSpacing: 1.2, marginTop: 12, marginBottom: 6 },
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  fieldLabel: { color: C.textSub, fontFamily: FT.bold, fontSize: 11.5 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, height: 42, borderRadius: 10,
    backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1 },
  fieldInput: { flex: 1, color: C.text, fontFamily: FT.med,
    fontSize: 13, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },

  priceTable: { gap: 8, padding: 14, borderRadius: 12,
    backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tableK: { color: C.textSub, fontFamily: FT.med, fontSize: 12.5, flex: 1 },
  tableV: { color: C.text, fontFamily: FT.bold, fontSize: 12.5 },
  priceDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },

  errBox: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: 'rgba(248, 113, 113, 0.40)', borderWidth: 1, marginTop: 12 },
  errText: { color: '#F87171', fontFamily: FT.bold, fontSize: 12 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 20, height: 44, borderRadius: 12,
    backgroundColor: C.bgCard, borderColor: C.border,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  cancelBtnText: { color: C.textSub, fontFamily: FT.bold, fontSize: 13 },
  confirmBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  confirmBtnText: { color: '#fff', fontFamily: FT.xbold, fontSize: 13.5 },

  fineprint: { color: C.dim, fontFamily: FT.med, fontSize: 10.5,
    textAlign: 'center', marginTop: 12 },

  /* Confirmation Modal */
  confirmSheet: { width: '100%', maxWidth: 460, backgroundColor: '#FFFFFF',
    borderRadius: 20, padding: 24, borderColor: C.border,
    borderWidth: 1, alignItems: 'center' },
  confirmIconBox: { width: 72, height: 72, borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.40)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center' },
  confirmHeading: { color: C.text, fontFamily: FT.xbold,
    fontSize: 20, marginTop: 14 },
  confirmSub: { color: C.textSub, fontFamily: FT.med,
    fontSize: 13, textAlign: 'center', marginTop: 4 },
  confirmIdPill: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(165, 180, 252, 0.15)',
    borderColor: 'rgba(165, 180, 252, 0.35)', borderWidth: 1, marginTop: 12 },
  confirmIdText: { color: C.purple, fontFamily: FT.xbold, fontSize: 11.5 },
  confirmGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginTop: 16, width: '100%' },
  confirmCell: { flexBasis: '48%', flexGrow: 1, padding: 12, borderRadius: 10,
    backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1 },
  confirmCellLabel: { color: C.dim, fontFamily: FT.xbold,
    fontSize: 9.5, letterSpacing: 1 },
  confirmCellValue: { color: C.text, fontFamily: FT.xbold,
    fontSize: 13, marginTop: 4 },
  savingsPill: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.40)', borderWidth: 1, marginTop: 14 },
  savingsText: { color: C.amber, fontFamily: FT.xbold, fontSize: 12 },
  confirmCTA: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, height: 44, borderRadius: 12,
    backgroundColor: C.purple, alignSelf: 'stretch', justifyContent: 'center',
    marginTop: 16, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  confirmCTAText: { color: '#fff', fontFamily: FT.xbold, fontSize: 13.5 },
  confirmDismiss: { paddingVertical: 8, alignSelf: 'stretch',
    alignItems: 'center', marginTop: 4, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  confirmDismissText: { color: C.dim, fontFamily: FT.bold, fontSize: 12.5 },

  /* Bookings Drawer */
  drawer: { width: '100%', maxWidth: 600, maxHeight: '92%',
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    borderColor: C.border, borderWidth: 1 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16 },
  drawerTitle: { color: C.text, fontFamily: FT.xbold, fontSize: 17 },
  drawerCountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(165, 180, 252, 0.15)',
    borderColor: 'rgba(165, 180, 252, 0.35)', borderWidth: 1 },
  drawerCountText: { color: C.purple, fontFamily: FT.xbold, fontSize: 11 },
  emptyDrawer: { paddingVertical: 60, alignItems: 'center', gap: 8 },

  bookingCard: { padding: 16, borderRadius: 14, borderWidth: 1,
    backgroundColor: C.bgCard },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingIconBox: { width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center' },
  bookingTitle: { color: C.text, fontFamily: FT.xbold, fontSize: 14 },
  bookingMeta: { color: C.dim, fontFamily: FT.med, fontSize: 11.5, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusText: { fontFamily: FT.xbold, fontSize: 9.5, letterSpacing: 0.6 },

  bookingFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  factCell: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)' },
  factText: { color: C.textSub, fontFamily: FT.bold, fontSize: 11.5 },

  bookingTimeline: { marginTop: 12, gap: 4 },
  tlStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tlDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: C.dim },
  tlBar: { width: 1, height: 8, backgroundColor: C.border, marginLeft: 3 },
  tlLabel: { color: C.dim, fontFamily: FT.bold, fontSize: 11 },

  bookingActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  cancelLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.35)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  cancelLinkText: { color: '#F87171', fontFamily: FT.bold, fontSize: 11.5 },

  advisorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  advisorCard: {
    flex: 1, minWidth: 270,
    padding: 20, borderRadius: 16,
    backgroundColor: C.bgCard,
    borderWidth: 1, gap: 12,
    flexDirection: 'column',
  },
  advisorIconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  advisorTitle: { color: C.text, fontSize: 16, fontFamily: FT.xbold, marginTop: 2 },
  advisorDesc: { color: C.textSub, fontSize: 13, lineHeight: 19, fontFamily: FT.med },
  advisorCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 10, marginTop: 'auto',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  advisorCTAText: { color: '#fff', fontSize: 13, fontFamily: FT.xbold },
  advisorExpanded: {
    marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.border,
    gap: 10,
  },
  advisorLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  advisorLinkText: { fontSize: 13, fontFamily: FT.bold },
  advisorNote: { color: C.dim, fontSize: 11, fontStyle: 'italic', marginTop: 2, fontFamily: FT.med },
});
