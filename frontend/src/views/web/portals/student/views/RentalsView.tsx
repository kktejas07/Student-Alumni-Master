// @ts-nocheck
/**
 * RentalsView — SA Stay Rentals Marketplace from Bundle 2.
 * 
 * Features:
 *  - Verified student housing, vehicles, stays & coworking with exclusive SA discounts
 *  - 3 Hero Promo Banners (PGs, Mobility, Coworking)
 *  - 4 Quick Stat Tiles (Total 42, Verified 42, Featured 13, SA Discounts 25%)
 *  - 16-City Filter Bar & 8 Category Tags
 *  - 8 Interactive Listing Cards with verified badges & discount flags
 *  - Listing Detail Modal with amenities & inclusions
 *  - Booking Flow Modal with stay dates, guest count (+/-) & live price breakdown
 *  - Booking Confirmation Dialog with reference ID
 *  - "My Active Bookings" Modal with status timeline & cancellation trigger
 */

import React, { useState } from 'react';
import { usePortalData } from '@/src/lib/portalApi';
import { request } from '@/src/models/services/api';
import { View, Text, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/src/theme/ThemeContext';


/* ── API shapes (backend/rentals_marketplace.py) and adapters to the card shape this view renders ── */
type ApiListing = {
  id: string; category: string; title: string; type: string; city?: string; location?: string;
  rent_inr: number; rent_label?: string; orig_inr?: number; orig_label?: string; discount?: string;
  amenities?: string[]; rating?: number | null; reviews?: number; available?: number; color?: string;
  perk?: string; verified?: boolean; description?: string; tags?: string[];
};
type ApiBooking = {
  booking_id: string; status: string; guests: number; check_in: string; check_out: string;
  listing_snapshot?: ApiListing; cost_breakdown?: { total_inr: number };
};
const fmtDay = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const toCard = (l: ApiListing) => {
  const per = (l.rent_label || '').includes('/mo') ? '/mo' : '/day';
  return {
    id: l.id,
    name: l.title,
    loc: l.location || l.city || '',
    city: l.city || '',
    cat: l.type,
    rate: l.rating != null ? String(l.rating) : null,
    revs: l.reviews ? String(l.reviews) : null,
    left: l.available != null ? String(l.available) : null,
    perk: l.perk || '',
    was: l.orig_label || '',
    now: (l.rent_label || `₹${l.rent_inr}`).replace(/\/(mo|day|night).*$/, ''),
    unitNum: l.rent_inr,
    per,
    off: l.discount ? `${l.discount} OFF` : '',
    col: l.color || '#7C5CFC',
    tags: l.amenities || l.tags || [],
    desc: l.description || '',
    verified: !!l.verified,
  };
};
const toBookingRow = (b: ApiBooking) => ({
  id: b.booking_id,
  name: b.listing_snapshot?.title || 'Listing',
  loc: b.listing_snapshot?.location || b.listing_snapshot?.city || '',
  checkIn: fmtDay(b.check_in),
  checkOut: fmtDay(b.check_out),
  guests: `${b.guests || 1} guest${(b.guests || 1) > 1 ? 's' : ''}`,
  amt: '₹' + Math.round(b.cost_breakdown?.total_inr || 0).toLocaleString('en-IN'),
  status: (b.status || 'confirmed').toUpperCase(),
});

export function RentalsView() {
  const { isDark } = useTheme();

  const colors = {
    text: isDark ? '#F4F4FA' : '#0F172A',
    text2: isDark ? '#8A8A9E' : '#475569',
    text3: isDark ? '#6A6A7E' : '#94A3B8',
    cardBg: isDark ? '#101019' : '#FFFFFF',
    cardBorder: isDark ? '#1F1F30' : '#E2E8F0',
    cardShadow: isDark ? '0 18px 40px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.06)',
    pillBg: isDark ? '#14141F' : '#F8FAFC',
    pillBorder: isDark ? '#262638' : '#CBD5E1',
    inputBg: isDark ? '#101019' : '#FFFFFF',
    inputBorder: isDark ? '#262638' : '#CBD5E1',
    inputColor: isDark ? '#FFFFFF' : '#0F172A',
    modalOverlay: isDark ? 'rgba(4,4,10,0.85)' : 'rgba(15,23,42,0.60)',
    modalBg: isDark ? '#101019' : '#FFFFFF',
    modalBorder: isDark ? '#1F1F30' : '#E2E8F0',
    modalShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.15)',
    subCardBg: isDark ? '#14141F' : '#F8FAFC',
    subCardBorder: isDark ? '#262638' : '#E2E8F0',
    tagBg: isDark ? 'transparent' : '#F1F5F9',
    tagBorder: isDark ? '#262638' : '#E2E8F0',
    tagText: isDark ? '#8A8A9E' : '#475569',
    perkBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(99, 102, 241, 0.06)',
    myBookingsBtnBg: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7',
    myBookingsBtnBorder: isDark ? '#4A3410' : '#FDE68A',
    myBookingsBtnText: isDark ? '#F59E0B' : '#B45309',
    verifiedBadgeBg: isDark ? 'rgba(16, 185, 129, 0.13)' : '#ECFDF5',
    verifiedBadgeBorder: isDark ? '#17503E' : '#A7F3D0',
    verifiedBadgeText: isDark ? '#34D399' : '#059669',
  };

  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [bookingListing, setBookingListing] = useState<any | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [showMyBookings, setShowMyBookings] = useState(false);

  // Booking form state — defaults to a 30-day stay starting tomorrow.
  const isoDay = (d: Date) => d.toISOString().slice(0, 10);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const plus30 = new Date(tomorrow); plus30.setDate(plus30.getDate() + 30);
  const checkIn = isoDay(tomorrow);
  const [checkOut, setCheckOut] = useState(isoDay(plus30));
  const [guests, setGuests] = useState(1);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Live data from /api/rentals/* ───────────────────────────────────────
  // This view used to ship its own hardcoded listings and a pre-filled
  // "CONFIRMED" booking, and "Confirm booking" never left the browser.
  const { data: listingsRes, loading: listingsLoading, error: listingsError } =
    usePortalData<{ listings: ApiListing[] }>('/rentals/listings', { listings: [] }, 0);
  const { data: bookingsRes, refresh: refreshBookings } =
    usePortalData<{ bookings: ApiBooking[] }>('/rentals/bookings', { bookings: [] }, 0);

  const LISTINGS = (listingsRes?.listings || []).map(toCard);
  const activeBookings = (bookingsRes?.bookings || []).map(toBookingRow);

  const CITIES = ['All Cities', ...Array.from(new Set(LISTINGS.map((l) => l.city).filter(Boolean))).sort()];

  const CATEGORY_COLORS: Record<string, string> = {
    'Flexi Desk': '#7C5CFC', 'PG / Hostel': '#2FB8C6', 'Car': '#F59E0B', 'Two-Wheeler': '#DB2777',
    'Beach House': '#4C8DF6', 'Apartment': '#34D399', 'Hot Desk': '#A78BFA', 'Weekend Getaway': '#F0616B',
  };
  const CATEGORIES = Array.from(new Set(LISTINGS.map((l) => l.cat).filter(Boolean)))
    .map((name) => ({ name, col: CATEGORY_COLORS[name] || '#7C5CFC' }));

  const filteredListings = LISTINGS.filter((item) => {
    const matchCity = selectedCity === 'All Cities' || item.city === selectedCity || item.loc.toLowerCase().includes(selectedCity.toLowerCase());
    const matchCategory = !selectedCategory || item.cat === selectedCategory;
    const matchQuery = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.loc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCity && matchCategory && matchQuery;
  });

  const money = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  const handleStartBooking = (item: any) => {
    setSelectedListing(null);
    setBookingListing(item);
  };

  const handleConfirmBooking = async () => {
    if (!bookingListing || submitting) return;
    setSubmitting(true);
    setBookingError(null);
    try {
      const res = await request<{ ok: boolean; booking: ApiBooking }>('/rentals/book', {
        method: 'POST',
        body: { listing_id: bookingListing.id, check_in: checkIn, check_out: checkOut, guests, notes: bookingNotes },
      });
      setConfirmedBooking(toBookingRow(res.booking));
      setBookingListing(null);
      refreshBookings();
    } catch (e: any) {
      setBookingError(e?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    try {
      await request(`/rentals/bookings/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
      refreshBookings();
    } catch (e: any) {
      setBookingError(e?.message || 'Could not cancel this booking.');
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Rentals Marketplace</Text>
      </View>
    );
  }

  return (
    <div
      id="db-page-rentals"
      style={{
        width: '100%',
        color: colors.text,
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* ── Top Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.8px', margin: '0 0 6px', color: colors.text }}>
            SA Stay Rentals Marketplace
          </h1>
          <p style={{ fontSize: '14.5px', color: colors.text2, margin: 0 }}>
            Verified student housing, vehicles, stays &amp; coworking with exclusive SA discounts
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowMyBookings(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: colors.myBookingsBtnText,
              border: `1px solid ${colors.myBookingsBtnBorder}`,
              background: colors.myBookingsBtnBg,
              borderRadius: '100px',
              padding: '9px 16px',
              cursor: 'pointer',
            }}
          >
            My Bookings <span style={{ background: '#F59E0B', color: '#FFFFFF', fontWeight: 700, borderRadius: '100px', padding: '1px 8px' }}>{activeBookings.length}</span>
          </button>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: colors.verifiedBadgeText,
              border: `1px solid ${colors.verifiedBadgeBorder}`,
              background: colors.verifiedBadgeBg,
              borderRadius: '100px',
              padding: '9px 16px',
            }}
          >
            ✓ All SA Verified
          </span>
        </div>
      </div>

      {/* ── 3 Promo Banners ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
        {[
          { title: 'Verified student PGs\nnear campus', tag: 'Move in with', price: 'from ₹6,500/mo', cta: 'Browse stays', grad: 'linear-gradient(150deg, #6D4BE8, #4B2FC7)', textColor: '#D9CBFF' },
          { title: 'Self-drive cars &\nscooter subscriptions', tag: 'Ride anywhere with', price: 'from ₹1,499/mo', cta: 'Explore mobility', grad: 'linear-gradient(150deg, #A6389B, #6E2A78)', textColor: '#FFD5EE' },
          { title: 'Coworking desks\n& day passes', tag: 'Work better from', price: 'from ₹599/day', cta: 'View desks', grad: 'linear-gradient(150deg, #1E6FE0, #1246A8)', textColor: '#CFE8FF' },
        ].map((promo, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '20px',
              color: '#FFFFFF',
              background: promo.grad,
              boxShadow: isDark ? '0 18px 40px rgba(0,0,0,0.35)' : '0 10px 25px rgba(0,0,0,0.1)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '232px',
            }}
          >
            <div style={{ fontSize: '13px', opacity: 0.92, marginBottom: '10px' }}>{promo.tag}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.7px', whiteSpace: 'pre-line' }}>
              {promo.title}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: promo.textColor, margin: '8px 0 16px' }}>
              {promo.price}
            </div>
            <button
              style={{
                marginTop: 'auto',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.5)',
                background: 'transparent',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {promo.cta}
            </button>
          </div>
        ))}
      </div>

      {/* ── 4 Quick Stat Metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
        {[
          { label: 'TOTAL LISTINGS', val: '42', sub: 'All categories', col: '#7C5CFC' },
          { label: 'SA VERIFIED', val: '42', sub: 'Guaranteed authenticity', col: isDark ? '#34D399' : '#059669' },
          { label: 'FEATURED', val: '13', sub: 'Top picks this month', col: isDark ? '#F59E0B' : '#D97706' },
          { label: 'SA DISCOUNTS', val: '25%', sub: 'Member savings', col: '#7C5CFC' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: '14px',
              background: colors.cardBg,
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
              padding: '14px 16px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.1px', color: colors.text2 }}>{stat.label}</div>
              <div style={{ fontSize: '12px', color: colors.text3, marginTop: '2px' }}>{stat.sub}</div>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: stat.col }}>{stat.val}</div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bars ── */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search PG, city, vehicle, hotel, amenities..."
          style={{
            width: '100%',
            padding: '15px 18px',
            borderRadius: '14px',
            border: `1px solid ${colors.inputBorder}`,
            background: colors.inputBg,
            color: colors.inputColor,
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '14px',
            boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
          }}
        />

        {/* City Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '14px' }}>
          {CITIES.map((city) => {
            const isSelected = selectedCity === city;
            return (
              <span
                key={city}
                onClick={() => setSelectedCity(city)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 500,
                  padding: '9px 15px',
                  borderRadius: '100px',
                  border: `1px solid ${isSelected ? (isDark ? '#7C5CFC' : '#6366F1') : colors.cardBorder}`,
                  background: isSelected ? (isDark ? 'rgba(124, 92, 252, 0.18)' : '#EEF2FF') : (isDark ? 'transparent' : '#FFFFFF'),
                  color: isSelected ? (isDark ? '#FFFFFF' : '#4F46E5') : colors.text2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: !isSelected && !isDark ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                }}
              >
                {city}
              </span>
            );
          })}
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '9px', overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <span
                key={cat.name}
                onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${isSelected ? cat.col : colors.cardBorder}`,
                  background: isSelected ? (isDark ? 'rgba(255, 255, 255, 0.08)' : `${cat.col}18`) : colors.subCardBg,
                  color: isSelected ? (isDark ? '#FFFFFF' : cat.col) : colors.text,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: !isDark ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '3px', background: cat.col }} />
                {cat.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── 8 Verified Rental Listing Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        {listingsLoading && <div style={{ color: colors.text2, padding: '24px 0' }}>Loading listings…</div>}
        {!listingsLoading && listingsError && <div style={{ color: '#EF4444', padding: '24px 0' }}>Could not load listings: {listingsError}</div>}
        {!listingsLoading && !listingsError && filteredListings.length === 0 && <div style={{ color: colors.text2, padding: '24px 0' }}>No listings match these filters.</div>}
        {filteredListings.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedListing(item)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: '18px',
              background: colors.cardBg,
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: colors.cardShadow,
            }}
          >
            {/* Card Header Icon & Badges */}
            <div style={{ position: 'relative', height: '104px', background: isDark ? `linear-gradient(140deg, ${item.col}2E, #14141F)` : `linear-gradient(140deg, ${item.col}18, #F1F5F9)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', top: '12px', fontSize: '10.5px', fontWeight: 700, color: colors.verifiedBadgeText, background: colors.verifiedBadgeBg, border: `1px solid ${colors.verifiedBadgeBorder}`, borderRadius: '100px', padding: '4px 9px' }}>
                ✓ Verified
              </span>
              <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '10.5px', fontWeight: 700, color: '#FFFFFF', background: item.col, borderRadius: '7px', padding: '4px 8px' }}>
                {item.off}
              </span>
            </div>

            {/* Card Content */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '12.5px', color: colors.text2 }}>{item.loc}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: item.col }}>{item.cat}</span>
                </div>
              </div>

              {/* Tag Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {item.tags.map((t) => (
                  <span key={t} style={{ fontSize: '11px', color: colors.tagText, border: `1px solid ${colors.tagBorder}`, background: colors.tagBg, borderRadius: '7px', padding: '3px 7px' }}>
                    ✓ {t}
                  </span>
                ))}
              </div>

              {/* Rating & Availability */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: colors.text }}>
                <span>{item.rate ? <>★ <strong style={{ color: colors.text }}>{item.rate}</strong> <span style={{ color: colors.text2 }}>({item.revs || 0})</span></> : <span style={{ color: colors.text2 }}>No reviews yet</span>}</span>
                <span style={{ color: isDark ? '#34D399' : '#059669', fontWeight: 600 }}>{item.left != null ? `${item.left} left` : ''}</span>
              </div>

              {/* Perk Box */}
              <div style={{ fontSize: '12px', fontWeight: 600, color: item.col, background: isDark ? 'rgba(255,255,255,0.04)' : `${item.col}10`, border: `1px solid ${item.col}44`, borderRadius: '9px', padding: '8px 10px' }}>
                ✦ {item.perk}
              </div>

              {/* Pricing & CTA */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px' }}>
                <div>
                  <div style={{ fontSize: '11.5px', color: colors.text3, textDecoration: 'line-through' }}>{item.was}</div>
                  <div style={{ fontSize: '19px', fontWeight: 700, color: colors.text }}>
                    {item.now}<span style={{ fontSize: '12px', color: colors.text2 }}>{item.per}</span>
                  </div>
                </div>
                <button style={{ fontSize: '12.5px', fontWeight: 600, background: item.col, color: '#FFFFFF', borderRadius: '9px', padding: '9px 14px', border: 'none', cursor: 'pointer' }}>
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Detail Modal ── */}
      {selectedListing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: colors.modalOverlay, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', background: colors.modalBg, border: `1px solid ${colors.modalBorder}`, borderRadius: '22px', padding: '28px', boxSizing: 'border-box', boxShadow: colors.modalShadow, color: colors.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px', color: colors.text }}>{selectedListing.name}</h2>
                <div style={{ fontSize: '14px', color: colors.text2 }}>{selectedListing.loc} · <strong style={{ color: selectedListing.col }}>{selectedListing.cat}</strong></div>
              </div>
              <span onClick={() => setSelectedListing(null)} style={{ color: colors.text2, cursor: 'pointer' }}><X size={20} color={colors.text2} /></span>
            </div>

            <p style={{ fontSize: '14px', color: colors.text2, lineHeight: 1.6, margin: '0 0 20px' }}>
              {selectedListing.desc}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {selectedListing.tags.map((t: string) => (
                <span key={t} style={{ fontSize: '12.5px', color: colors.tagText, border: `1px solid ${colors.tagBorder}`, background: colors.tagBg, borderRadius: '8px', padding: '6px 12px' }}>
                  ✓ {t}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.subCardBg, border: `1px solid ${colors.subCardBorder}`, borderRadius: '16px', padding: '18px 20px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: colors.text3, textDecoration: 'line-through' }}>{selectedListing.was}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: colors.text }}>{selectedListing.now}{selectedListing.per}</div>
              </div>
              <button
                onClick={() => handleStartBooking(selectedListing)}
                style={{
                  background: '#F59E0B',
                  color: '#1E293B',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Proceed to Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Modal ── */}
      {bookingListing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 160, background: colors.modalOverlay, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', background: colors.modalBg, border: `1px solid ${colors.modalBorder}`, borderRadius: '22px', padding: '28px', boxSizing: 'border-box', boxShadow: colors.modalShadow, color: colors.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px', color: colors.text }}>Book {bookingListing.name}</h2>
                <div style={{ fontSize: '13px', color: colors.text2 }}>{bookingListing.loc}</div>
              </div>
              <span onClick={() => setBookingListing(null)} style={{ color: colors.text2, cursor: 'pointer' }}><X size={20} color={colors.text2} /></span>
            </div>

            {/* Guest Counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.subCardBg, border: `1px solid ${colors.subCardBorder}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>Guests / Members</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setGuests(Math.max(1, guests - 1))} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${colors.cardBorder}`, background: colors.cardBg, color: colors.text, fontSize: '18px', cursor: 'pointer' }}>−</button>
                <span style={{ fontSize: '15px', fontWeight: 700, color: colors.text }}>{guests}</span>
                <button onClick={() => setGuests(Math.min(8, guests + 1))} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${colors.cardBorder}`, background: colors.cardBg, color: colors.text, fontSize: '18px', cursor: 'pointer' }}>+</button>
              </div>
            </div>

            {/* Price Breakdown */}
            <div style={{ background: colors.subCardBg, border: `1px solid ${colors.subCardBorder}`, borderRadius: '16px', padding: '16px 18px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '8px', color: colors.text2 }}>
                <span>Base Rate</span>
                <span style={{ color: colors.text, fontWeight: 600 }}>{money(bookingListing.unitNum * guests)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '8px', color: colors.text2 }}>
                <span>SA Member Savings</span>
                <span style={{ color: isDark ? '#34D399' : '#059669', fontWeight: 700 }}>− ₹1,500</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '8px', color: colors.text2 }}>
                <span>Service Fee (4%)</span>
                <span style={{ color: colors.text }}>{money(bookingListing.unitNum * 0.04)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, borderTop: `1px solid ${colors.cardBorder}`, paddingTop: '12px', marginTop: '12px' }}>
                <span style={{ color: colors.text }}>Total Payable</span>
                <span style={{ color: isDark ? '#F59E0B' : '#D97706' }}>{money(bookingListing.unitNum * guests * 1.04)}</span>
              </div>
            </div>

            {bookingError && <div style={{ color: '#EF4444', fontSize: '13px', marginBottom: '10px' }}>{bookingError}</div>}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setBookingListing(null)} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: `1px solid ${colors.cardBorder}`, background: isDark ? 'transparent' : '#FFFFFF', color: colors.text2, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleConfirmBooking} disabled={submitting} style={{ flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: '#F59E0B', color: '#1E293B', fontSize: '14.5px', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Booking…' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── My Bookings Modal ── */}
      {showMyBookings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 170, background: colors.modalOverlay, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', background: colors.modalBg, border: `1px solid ${colors.modalBorder}`, borderRadius: '22px', padding: '28px', boxSizing: 'border-box', boxShadow: colors.modalShadow, color: colors.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: colors.text }}>My Active Bookings</h2>
              <span onClick={() => setShowMyBookings(false)} style={{ color: colors.text2, cursor: 'pointer' }}><X size={20} color={colors.text2} /></span>
            </div>

            {activeBookings.length > 0 ? (
              activeBookings.map((b) => (
                <div key={b.id} style={{ border: `1px solid ${isDark ? '#4A3410' : '#FED7AA'}`, borderRadius: '18px', background: isDark ? '#14141F' : '#FFFBEB', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: colors.text }}>{b.name}</div>
                      <div style={{ fontSize: '12.5px', color: colors.text2, marginTop: '2px' }}>{b.loc}</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: b.status.includes('CONFIRMED') ? (isDark ? '#34D399' : '#059669') : '#EF4444', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: '100px', padding: '4px 10px' }}>
                      {b.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12.5px', color: colors.text2, marginBottom: '16px' }}>
                    <span>📅 {b.checkIn} — {b.checkOut}</span>
                    <span>👥 {b.guests}</span>
                    <span style={{ color: isDark ? '#F59E0B' : '#D97706', fontWeight: 700 }}>{b.amt}</span>
                  </div>
                  {b.status.includes('CONFIRMED') && (
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #EF4444',
                        background: 'transparent',
                        color: '#EF4444',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: colors.text2 }}>No active bookings.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
