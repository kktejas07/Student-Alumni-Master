/**
 * /rentals — SA Stay (Rentals Marketplace)
 * Categories: Student Housing · Vehicles · Hotels & Stays · Coworking
 * Live data from /api/rentals/* with MongoDB-persisted bookings.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, TextInput, Modal, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import { FAB } from '@/src/views/web/md3';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';
import { request } from '@/src/models/services/api';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Listing = {
  id: string; category: string; title: string; type: string;
  city: string; location: string;
  rent_inr: number; rent_label: string; orig_inr: number; orig_label: string;
  discount: string; amenities: string[]; rating: number; reviews: number;
  beds: string; available: number; color: string; emoji: string;
  perk?: string; verified?: boolean; featured?: boolean; tags?: string[];
};

type CategoryDef = { id: string; label: string; icon: IconName; color: string;
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

const C = {
  text: '#fff', text2: 'rgba(255,255,255,0.72)', text3: 'rgba(255,255,255,0.46)',
  border: 'rgba(255,255,255,0.10)', card: 'rgba(255,255,255,0.04)',
};

const ALL_CAT: CategoryDef = { id: 'all', label: 'All Rentals', icon: 'view-grid',
  color: '#C4B5FD', tagline: 'Everything in one place', count: 0 };

const fmtINR = (n?: number) => '₹' + (n || 0).toLocaleString('en-IN');
const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN',
    { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

export default function RentalsPage() {
  const [cat, setCat] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [city, setCity] = useState<string>('all');
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, featured: 0 });
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsOpen, setBookingsOpen] = useState(false);

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

  return (
    <FeaturePageShell
      title="Find Your Perfect Stay"
      subtitle="Verified housing, vehicles, hotels & coworking with exclusive SA discounts"
      heroEmoji="🏠"
      accent="#5F259F"
      rightSlot={
        <View style={s.rightRow}>
          <Pressable onPress={() => setBookingsOpen(true)} style={s.bookingsPill}>
            <MaterialCommunityIcons name="ticket-confirmation" size={13} color="#FCD34D" />
            <Text style={s.bookingsPillText}>My Bookings</Text>
            {bookings.length > 0 && (
              <View style={s.bookingsBadge}>
                <Text style={s.bookingsBadgeText}>{bookings.length}</Text>
              </View>
            )}
          </Pressable>
          <View style={s.verifyPill}>
            <MaterialCommunityIcons name="shield-check" size={12} color="#86EFAC" />
            <Text style={s.verifyText}>All SA Verified</Text>
          </View>
        </View>
      }
    >
      {/* Stats */}
      <View style={s.statsRow}>
        <Stat label="TOTAL LISTINGS" value={String(stats.total)} sub="All categories"
              color="#C4B5FD" icon="view-grid" />
        <Stat label="SA VERIFIED" value={String(stats.verified)} sub="Guaranteed authenticity"
              color="#22C55E" icon="check-decagram" />
        <Stat label="FEATURED" value={String(stats.featured)} sub="Top picks of the month"
              color="#F59E0B" icon="star-circle" />
        <Stat label="MIN. DISCOUNT" value="18%" sub="Exclusive SA savings"
              color="#5F259F" icon="tag-multiple" />
      </View>

      {/* Search + city */}
      <View style={s.filterRow}>
        <View style={s.searchBox}>
          <MaterialCommunityIcons name="magnify" size={16} color={C.text3} />
          <TextInput
            style={s.searchInput}
            placeholder="Search PG, city, vehicle, hotel…"
            placeholderTextColor={C.text3}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={14} color={C.text3} />
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}>
          {cities.map((cv) => {
            const active = city === cv;
            return (
              <Pressable key={cv} onPress={() => setCity(cv)}
                style={[s.cityPill, active && { backgroundColor: '#5F259F33',
                                                borderColor: '#5F259F' }]}>
                <MaterialCommunityIcons name="map-marker" size={11}
                  color={active ? '#C4B5FD' : C.text3} />
                <Text style={[s.cityPillText, active && { color: '#C4B5FD' }]}>
                  {cv === 'all' ? 'All Cities' : cv}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Text style={s.kicker}>BROWSE BY CATEGORY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {categories.map((c) => {
          const active = cat === c.id;
          return (
            <Pressable key={c.id} onPress={() => setCat(c.id)}
              style={[s.tab, active && { backgroundColor: c.color + '22',
                                         borderColor: c.color + '66' }]}>
              <MaterialCommunityIcons name={c.icon} size={14}
                color={active ? c.color : 'rgba(255,255,255,0.65)'} />
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

      {/* Grid */}
      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#C4B5FD" />
          <Text style={s.loadingText}>Loading verified listings…</Text>
        </View>
      ) : visibleListings.length === 0 ? (
        <View style={s.emptyBox}>
          <MaterialCommunityIcons name="home-search" size={40} color={C.text3} />
          <Text style={s.emptyTitle}>No listings match your filters</Text>
          <Text style={s.emptySub}>Try clearing the search or switching city</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {visibleListings.map((r) => (
            <RentalCard key={r.id} r={r}
              onBook={() => setBookingFor(r)} />
          ))}
        </View>
      )}

      {/* Advisor AI block */}
      <View style={{ marginTop: 18 }}>
        <AdvisorAIBlock
          context="rentals"
          advisorTitle="Talk to a Stay Advisor"
          advisorDesc="Looking for housing near campus, a road-trip car, or a group retreat? Our advisors curate options in 4 hours."
          aiTitle="Ask the SA Stay AI"
          aiDesc="Tell us your budget, city & vibe. Our AI ranks the best 6 picks instantly."
          advisorAccent="#F472B6"
          aiAccent="#22D3EE"
          advisorIcon="account-tie-voice"
          aiIcon="brain"
        />
      </View>

      {/* Booking sheet */}
      <BookingModal
        listing={bookingFor}
        onClose={() => setBookingFor(null)}
        onSuccess={(b) => { setConfirmedBooking(b); setBookingFor(null); loadData(); }}
      />

      {/* Confirmation */}
      <ConfirmationModal
        booking={confirmedBooking}
        onClose={() => setConfirmedBooking(null)}
        onViewBookings={() => { setConfirmedBooking(null); setBookingsOpen(true); }}
      />

      {/* My bookings drawer */}
      <BookingsDrawer
        open={bookingsOpen}
        bookings={bookings}
        onClose={() => setBookingsOpen(false)}
        onCancelled={loadData}
      />

      {/* MD3 Floating Action Button — open My Bookings */}
      <FAB icon="ticket-confirmation" label="My Bookings" color="#5F259F"
            onPress={() => setBookingsOpen(true)} />
    </FeaturePageShell>
  );
}

/* ─── Card ──────────────────────────────────────────────────── */
function RentalCard({ r, onBook }: { r: Listing; onBook: () => void }) {
  return (
    <View style={[s.card, { borderColor: r.color + '44' }]}>
      <View style={[s.cover,
        { backgroundColor: r.color + '1F', borderColor: r.color + '33' }]}>
        <Text style={s.coverEmoji}>{r.emoji}</Text>
        <View style={s.coverBadgeRow}>
          {r.verified && (
            <View style={s.badgeVerify}>
              <MaterialCommunityIcons name="check-decagram" size={10} color="#86EFAC" />
              <Text style={s.badgeVerifyText}>Verified</Text>
            </View>
          )}
          {r.featured && (
            <View style={s.badgeFeat}>
              <MaterialCommunityIcons name="star-four-points" size={10} color="#FCD34D" />
              <Text style={s.badgeFeatText}>Featured</Text>
            </View>
          )}
        </View>
        <View style={[s.discBadge, { backgroundColor: r.color + 'CC' }]}>
          <Text style={s.discText}>{r.discount} OFF</Text>
        </View>
      </View>
      <View style={{ padding: 14, gap: 8 }}>
        <View>
          <Text style={s.title} numberOfLines={1}>{r.title}</Text>
          <View style={s.metaRow}>
            <MaterialCommunityIcons name="map-marker" size={11} color={C.text3} />
            <Text style={s.loc} numberOfLines={1}>{r.location}</Text>
            <Text style={s.dot}>·</Text>
            <Text style={s.type}>{r.type}</Text>
          </View>
        </View>

        <View style={s.amenRow}>
          {(r.amenities || []).slice(0, 3).map((a, i) => (
            <View key={i} style={s.amenChip}><Text style={s.amenText}>{a}</Text></View>
          ))}
        </View>

        <View style={s.ratingRow}>
          <MaterialCommunityIcons name="star" size={12} color="#FCD34D" />
          <Text style={s.ratingText}>{r.rating}</Text>
          <Text style={s.ratingCount}>({r.reviews})</Text>
          <View style={{ flex: 1 }} />
          <Text style={s.available}>{r.available} left</Text>
        </View>

        {!!r.perk && (
          <View style={[s.perkBar,
            { borderColor: r.color + '55', backgroundColor: r.color + '18' }]}>
            <MaterialCommunityIcons name="sparkles" size={10} color={r.color} />
            <Text style={[s.perkText, { color: r.color }]} numberOfLines={1}>
              {r.perk}
            </Text>
          </View>
        )}

        <View style={s.priceRow}>
          <View>
            <Text style={s.priceOrig}>{r.orig_label}</Text>
            <Text style={[s.priceRent, { color: r.color }]}>{r.rent_label}</Text>
          </View>
          <Pressable onPress={onBook}
            style={[s.bookBtn, { backgroundColor: r.color }]}>
            <MaterialCommunityIcons name="calendar-check" size={13} color="#fff" />
            <Text style={s.bookText}>Book Now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* ─── Booking Modal ─────────────────────────────────────────── */
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
  const deposit = listing && (listing.category === 'housing'
                              || listing.category === 'coworking')
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
    <Modal visible={!!listing} transparent animationType="fade"
           onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {listing && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.sheetHeader}>
                <View style={[s.sheetEmojiBox,
                  { backgroundColor: listing.color + '22',
                    borderColor: listing.color + '55' }]}>
                  <Text style={{ fontSize: 26 }}>{listing.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetTitle}>{listing.title}</Text>
                  <View style={s.metaRow}>
                    <MaterialCommunityIcons name="map-marker" size={11} color={C.text3} />
                    <Text style={s.loc} numberOfLines={1}>{listing.location}</Text>
                  </View>
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={20} color={C.text2} />
                </Pressable>
              </View>

              <Text style={s.sectionLabel}>STAY DETAILS</Text>
              <View style={s.fieldRow}>
                <Field label={isMonthly ? 'Move-in date' : 'Check-in'}
                       icon="calendar-arrow-right" value={checkIn} onChange={setCheckIn}
                       placeholder="YYYY-MM-DD" />
                <Field label={isMonthly ? 'End date' : 'Check-out'}
                       icon="calendar-arrow-left" value={checkOut} onChange={setCheckOut}
                       placeholder="YYYY-MM-DD" />
              </View>
              <View style={s.fieldRow}>
                <Field label="Guests / Members"
                       icon="account-multiple" value={guests} onChange={setGuests}
                       keyboardType="numeric" />
                <View style={{ flex: 1 }} />
              </View>
              <Field label="Notes for host (optional)"
                     icon="note-text" value={notes} onChange={setNotes}
                     placeholder="Special requests, parking, late check-in…"
                     multiline />

              <Text style={s.sectionLabel}>PRICE BREAKDOWN</Text>
              <View style={s.priceTable}>
                <Row k={`${listing.rent_label} × ${units} ${unitWord}`}
                     v={fmtINR(subtotal)} />
                {savings > 0 && (
                  <Row k="SA member savings" v={`− ${fmtINR(savings)}`}
                       valColor="#86EFAC" />
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
                  <MaterialCommunityIcons name="alert-circle" size={13} color="#FCA5A5" />
                  <Text style={s.errText}>{err}</Text>
                </View>
              )}

              <View style={s.actionRow}>
                <Pressable onPress={onClose} style={s.cancelBtn}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submit} disabled={busy}
                  style={[s.confirmBtn,
                    { backgroundColor: listing.color, opacity: busy ? 0.7 : 1 }]}>
                  {busy ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <MaterialCommunityIcons name="lock-check" size={14} color="#fff" />
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

function Field({ label, icon, value, onChange, placeholder,
                 keyboardType, multiline }:
  { label: string; icon: IconName; value: string;
    onChange: (s: string) => void;
    placeholder?: string; keyboardType?: any; multiline?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.fieldBox, multiline && { height: 64, alignItems: 'flex-start',
                                                paddingTop: 10 }]}>
        <MaterialCommunityIcons name={icon} size={14} color={C.text3} />
        <TextInput style={[s.fieldInput, multiline && { textAlignVertical: 'top' }]}
                   placeholder={placeholder || ''}
                   placeholderTextColor={C.text3}
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
      <Text style={[s.tableK, bold && { color: '#fff', fontFamily: 'DMSans_800ExtraBold' }]}>
        {k}
      </Text>
      <Text style={[s.tableV,
        bold && { fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
        valColor ? { color: valColor } : null]}>
        {v}
      </Text>
    </View>
  );
}

/* ─── Confirmation modal ────────────────────────────────────── */
function ConfirmationModal({ booking, onClose, onViewBookings }:
  { booking: Booking | null; onClose: () => void; onViewBookings: () => void }) {
  return (
    <Modal visible={!!booking} transparent animationType="fade"
           onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.confirmSheet}>
          {booking && (
            <>
              <View style={s.confirmIconBox}>
                <MaterialCommunityIcons name="party-popper" size={42} color="#FCD34D" />
              </View>
              <Text style={s.confirmHeading}>Booking Confirmed!</Text>
              <Text style={s.confirmSub}>
                {booking.listing_snapshot?.title}
              </Text>
              <View style={s.confirmIdPill}>
                <MaterialCommunityIcons name="ticket" size={11} color="#C4B5FD" />
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
                  <Text style={[s.confirmCellValue, { color: '#86EFAC' }]}>
                    {fmtINR(booking.cost_breakdown?.total_inr)}
                  </Text>
                </View>
              </View>

              {booking.cost_breakdown?.sa_savings_inr > 0 && (
                <View style={s.savingsPill}>
                  <MaterialCommunityIcons name="sparkles" size={12} color="#FCD34D" />
                  <Text style={s.savingsText}>
                    You saved {fmtINR(booking.cost_breakdown.sa_savings_inr)} via SA-ID
                  </Text>
                </View>
              )}

              <Pressable onPress={onViewBookings} style={s.confirmCTA}>
                <MaterialCommunityIcons name="format-list-bulleted-square"
                  size={14} color="#fff" />
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

/* ─── My bookings drawer ────────────────────────────────────── */
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
              <MaterialCommunityIcons name="ticket-confirmation"
                size={18} color="#FCD34D" />
              <Text style={s.drawerTitle}>My Bookings</Text>
              <View style={s.drawerCountBadge}>
                <Text style={s.drawerCountText}>{bookings.length}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={20} color={C.text2} />
            </Pressable>
          </View>

          {bookings.length === 0 ? (
            <View style={s.emptyDrawer}>
              <MaterialCommunityIcons name="calendar-blank" size={40} color={C.text3} />
              <Text style={s.emptyTitle}>No bookings yet</Text>
              <Text style={s.emptySub}>
                Book a stay, ride or workspace to see it here.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 30 }}>
              {bookings.map((b) => (
                <View key={b.booking_id}
                  style={[s.bookingCard,
                    { borderColor: (b.listing_snapshot?.color || '#5F259F') + '55' }]}>
                  <View style={s.bookingTop}>
                    <View style={[s.bookingEmoji,
                      { backgroundColor: (b.listing_snapshot?.color || '#5F259F') + '22' }]}>
                      <Text style={{ fontSize: 22 }}>
                        {b.listing_snapshot?.emoji || '🏠'}
                      </Text>
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
                        {b.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={s.bookingFacts}>
                    <Fact icon="calendar-arrow-right" v={fmtDate(b.check_in)} />
                    <Fact icon="calendar-arrow-left"  v={fmtDate(b.check_out)} />
                    <Fact icon="account-multiple"     v={`${b.guests} guest${b.guests > 1 ? 's' : ''}`} />
                    <Fact icon="cash"                 v={fmtINR(b.cost_breakdown?.total_inr)} bold />
                  </View>

                  {b.status !== 'cancelled' && (
                    <View style={s.bookingTimeline}>
                      {b.timeline?.map((t, i) => (
                        <View key={t.id} style={s.tlStep}>
                          <View style={[s.tlDot,
                            t.status === 'done' && { backgroundColor: '#22C55E' },
                            t.status === 'current' && { backgroundColor: '#FCD34D' },
                            t.status === 'pending' && { backgroundColor: 'rgba(255,255,255,0.18)' }]} />
                          <Text style={[s.tlLabel,
                            t.status === 'done' && { color: '#86EFAC' },
                            t.status === 'current' && { color: '#FCD34D' }]}>
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
                          <ActivityIndicator size="small" color="#FCA5A5" />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="cancel"
                              size={12} color="#FCA5A5" />
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

function Fact({ icon, v, bold }: { icon: IconName; v: string; bold?: boolean }) {
  return (
    <View style={s.factCell}>
      <MaterialCommunityIcons name={icon} size={11} color={C.text3} />
      <Text style={[s.factText, bold && { color: '#86EFAC',
                                          fontFamily: 'DMSans_800ExtraBold' }]}>
        {v}
      </Text>
    </View>
  );
}

const statusStyle = (status: string) => {
  if (status === 'confirmed')
    return { color: '#86EFAC', backgroundColor: 'rgba(34,197,94,0.18)',
             borderColor: 'rgba(34,197,94,0.45)' };
  if (status === 'pending')
    return { color: '#FCD34D', backgroundColor: 'rgba(252,211,77,0.18)',
             borderColor: 'rgba(252,211,77,0.45)' };
  if (status === 'cancelled')
    return { color: '#FCA5A5', backgroundColor: 'rgba(239,68,68,0.18)',
             borderColor: 'rgba(239,68,68,0.45)' };
  return { color: '#C4B5FD', backgroundColor: 'rgba(196,181,253,0.18)',
           borderColor: 'rgba(196,181,253,0.45)' };
};

/* ─── Stat ───────────────────────────────────────────────────── */
function Stat({ label, value, sub, color, icon }:
  { label: string; value: string; sub: string; color: string; icon: IconName }) {
  return (
    <View style={s.statCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.statIcon,
          { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <MaterialCommunityIcons name={icon} size={14} color={color} />
        </View>
        <Text style={s.statLabel}>{label}</Text>
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────── */
const s = StyleSheet.create({
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookingsPill: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(252,211,77,0.14)',
    borderColor: 'rgba(252,211,77,0.45)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  bookingsPillText: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },
  bookingsBadge: { paddingHorizontal: 6, height: 16, borderRadius: 999,
    backgroundColor: '#FCD34D', alignItems: 'center', justifyContent: 'center' },
  bookingsBadgeText: { color: '#1F2937', fontFamily: 'DMSans_800ExtraBold', fontSize: 9 },

  verifyPill: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderColor: 'rgba(34,197,94,0.40)', borderWidth: 1 },
  verifyText: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },

  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 180, padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border,
    borderWidth: 1, gap: 6 },
  statIcon: { width: 28, height: 28, borderRadius: 7, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: C.text3, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 10, letterSpacing: 1, flex: 1 },
  statValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 24, marginTop: 2 },
  statSub: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },

  filterRow: { gap: 8, marginTop: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border,
    borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: 'DMSans_500Medium',
    fontSize: 13, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  cityPillText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11, letterSpacing: 1.2, marginTop: 6 },

  tab: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  tabText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  tabCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)' },
  tabCountText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  loadingBox: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  loadingText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  emptyBox: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14, marginTop: 4 },
  emptySub: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { flexGrow: 1, flexBasis: 300, maxWidth: 360, borderRadius: 14,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden' },
  cover: { height: 130, borderBottomWidth: 1, alignItems: 'center',
    justifyContent: 'center', position: 'relative' },
  coverEmoji: { fontSize: 44 },
  coverBadgeRow: { position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', gap: 5 },
  badgeVerify: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.20)',
    borderColor: 'rgba(34,197,94,0.40)', borderWidth: 1 },
  badgeVerifyText: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 9 },
  badgeFeat: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(252,211,77,0.18)',
    borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1 },
  badgeFeatText: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 9 },
  discBadge: { position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  discText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 10.5, letterSpacing: 0.4 },

  title: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  loc: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11, flex: 1 },
  dot: { color: C.text3, fontSize: 11 },
  type: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 11 },

  amenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  amenChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1 },
  amenText: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 10 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  ratingCount: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 10.5 },
  available: { color: '#86EFAC', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  perkBar: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  perkText: { flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginTop: 2 },
  priceOrig: { color: C.text3, fontFamily: 'DMSans_500Medium',
    fontSize: 11, textDecorationLine: 'line-through' },
  priceRent: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16, marginTop: 1 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, height: 34, borderRadius: 999,
    justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  bookText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11.5, letterSpacing: 0.3 },

  /* Modal */
  overlay: { flex: 1, backgroundColor: 'rgba(7,2,15,0.78)',
    justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 540, maxHeight: '92%',
    backgroundColor: '#13031F', borderRadius: 18, padding: 18,
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 14 },
  sheetEmojiBox: { width: 52, height: 52, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },

  sectionLabel: { color: C.text3, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 10, letterSpacing: 1.2, marginTop: 14, marginBottom: 8 },
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  fieldLabel: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, height: 40, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1 },
  fieldInput: { flex: 1, color: '#fff', fontFamily: 'DMSans_500Medium',
    fontSize: 13, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },

  priceTable: { gap: 7, padding: 14, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center' },
  tableK: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, flex: 1 },
  tableV: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  priceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },

  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderColor: 'rgba(239,68,68,0.40)', borderWidth: 1, marginTop: 12 },
  errText: { color: '#FCA5A5', fontFamily: 'DMSans_600SemiBold', fontSize: 11.5 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { paddingHorizontal: 18, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
  cancelBtnText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  confirmBtn: { flex: 1, height: 44, borderRadius: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    ...({ cursor: 'pointer' } as any) },
  confirmBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },

  fineprint: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 10.5,
    textAlign: 'center', marginTop: 10 },

  /* Confirmation */
  confirmSheet: { width: '100%', maxWidth: 460, backgroundColor: '#13031F',
    borderRadius: 18, padding: 22, borderColor: 'rgba(252,211,77,0.30)',
    borderWidth: 1, alignItems: 'center' },
  confirmIconBox: { width: 76, height: 76, borderRadius: 999,
    backgroundColor: 'rgba(252,211,77,0.16)',
    borderColor: 'rgba(252,211,77,0.45)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center' },
  confirmHeading: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 20, marginTop: 14 },
  confirmSub: { color: C.text2, fontFamily: 'DMSans_500Medium',
    fontSize: 13, textAlign: 'center', marginTop: 4 },
  confirmIdPill: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(196,181,253,0.14)',
    borderColor: 'rgba(196,181,253,0.40)', borderWidth: 1, marginTop: 10 },
  confirmIdText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },
  confirmGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginTop: 16, width: '100%' },
  confirmCell: { flexBasis: '48%', flexGrow: 1, padding: 11, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1 },
  confirmCellLabel: { color: C.text3, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 9, letterSpacing: 1 },
  confirmCellValue: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 13, marginTop: 4 },
  savingsPill: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(252,211,77,0.14)',
    borderColor: 'rgba(252,211,77,0.45)', borderWidth: 1, marginTop: 14 },
  savingsText: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 11.5 },
  confirmCTA: { flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, height: 42, borderRadius: 10,
    backgroundColor: '#5F259F', alignSelf: 'stretch', justifyContent: 'center',
    marginTop: 16, ...({ cursor: 'pointer' } as any) },
  confirmCTAText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  confirmDismiss: { paddingVertical: 8, alignSelf: 'stretch',
    alignItems: 'center', marginTop: 4, ...({ cursor: 'pointer' } as any) },
  confirmDismissText: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 12 },

  /* Bookings drawer */
  drawer: { width: '100%', maxWidth: 600, maxHeight: '92%',
    backgroundColor: '#13031F', borderRadius: 18, padding: 18,
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14 },
  drawerTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  drawerCountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    backgroundColor: 'rgba(196,181,253,0.18)',
    borderColor: 'rgba(196,181,253,0.40)', borderWidth: 1 },
  drawerCountText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },
  emptyDrawer: { paddingVertical: 60, alignItems: 'center', gap: 6 },

  bookingCard: { padding: 14, borderRadius: 12, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)' },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingEmoji: { width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center' },
  bookingTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13.5 },
  bookingMeta: { color: C.text3, fontFamily: 'DMSans_500Medium',
    fontSize: 11, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1 },
  statusText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 9, letterSpacing: 0.6 },

  bookingFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  factCell: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)' },
  factText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  bookingTimeline: { marginTop: 12, gap: 4 },
  tlStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tlDot: { width: 8, height: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)' },
  tlBar: { width: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.10)',
    marginLeft: 3 },
  tlLabel: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },

  bookingActionRow: { flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: 10 },
  cancelLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.30)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  cancelLinkText: { color: '#FCA5A5', fontFamily: 'DMSans_700Bold', fontSize: 11 },
});
