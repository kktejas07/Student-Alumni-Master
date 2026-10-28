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
import { View, Text, Platform } from 'react-native';

export function RentalsView() {
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [bookingListing, setBookingListing] = useState<any | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [showMyBookings, setShowMyBookings] = useState(false);

  // Booking form state
  const [checkIn, setCheckIn] = useState('2026-08-22');
  const [checkOut, setCheckOut] = useState('2026-09-21');
  const [guests, setGuests] = useState(1);
  const [bookingNotes, setBookingNotes] = useState('');

  // Active bookings list
  const [activeBookings, setActiveBookings] = useState([
    {
      id: 'SA-RNT-491920',
      name: '91springboard Day Pass',
      loc: '9 cities · 30+ centres',
      checkIn: '22 Aug 2026',
      checkOut: '21 Sept 2026',
      guests: '1 guest',
      amt: '₹19,288',
      status: 'CONFIRMED',
    },
  ]);

  const CITIES = [
    'All Cities', 'Alleppey', 'Bengaluru', 'Chennai', 'Coorg', 'Delhi',
    'Delhi NCR', 'Goa', 'Hyderabad', 'Jaipur', 'Kolkata', 'Lonavala',
    'Lucknow', 'Manali', 'Mumbai', 'Pune'
  ];

  const CATEGORIES = [
    { name: 'Flexi Desk', col: '#7C5CFC' },
    { name: 'PG / Hostel', col: '#2FB8C6' },
    { name: 'Car', col: '#F59E0B' },
    { name: 'Two-Wheeler', col: '#DB2777' },
    { name: 'Beach House', col: '#4C8DF6' },
    { name: 'Apartment', col: '#34D399' },
    { name: 'Hot Desk', col: '#A78BFA' },
    { name: 'Weekend Getaway', col: '#F0616B' },
  ];

  const LISTINGS = [
    {
      id: 0,
      name: 'Awfis Flexi Desk',
      loc: 'Mumbai · Pune · Chennai',
      cat: 'Flexi Desk',
      rate: '4.5',
      revs: '245',
      left: '18',
      perk: '1 free meeting room hour/day',
      was: '₹6,500/mo',
      now: '₹4,499',
      unitNum: 4499,
      per: '/mo',
      off: '31% OFF',
      col: '#7C5CFC',
      tags: ['WiFi', 'Pantry', 'Lockers'],
      desc: 'Verified flexi desk listing with guaranteed high-speed internet, power backup, pantry access, and student discounts.',
    },
    {
      id: 1,
      name: 'StayAbode Smart Hostel',
      loc: 'Andheri West, Mumbai',
      cat: 'PG / Hostel',
      rate: '4.6',
      revs: '198',
      left: '8',
      perk: '₹1,000 off first plan',
      was: '₹9,800/mo',
      now: '₹7,999',
      unitNum: 7999,
      per: '/mo',
      off: '18% OFF',
      col: '#2FB8C6',
      tags: ['Co-working', 'Gym', 'Netflix lounge'],
      desc: 'Premium student coliving hub with fully furnished rooms, dedicated study desks, gym, and complimentary breakfast.',
    },
    {
      id: 2,
      name: 'Colive Hostel — Hinjewadi',
      loc: 'Hinjewadi, Pune',
      cat: 'PG / Hostel',
      rate: '4.4',
      revs: '340',
      left: '8',
      perk: '10% extra off with SA-ID',
      was: '₹11,000/mo',
      now: '₹8,500',
      unitNum: 8500,
      per: '/mo',
      off: '23% OFF',
      col: '#34D399',
      tags: ['Meals', 'Gym', 'Pool'],
      desc: 'Modern tech-corridor student accommodation with 3 daily meals, swimming pool, shuttle service to campuses, and fast WiFi.',
    },
    {
      id: 3,
      name: 'Revv Self-Drive SUV',
      loc: 'Delhi · Mumbai · Pune',
      cat: 'Car',
      rate: '4.4',
      revs: '188',
      left: '6',
      perk: '₹300 off weekend booking',
      was: '₹3,200/day',
      now: '₹2,199',
      unitNum: 2199,
      per: '/day',
      off: '31% OFF',
      col: '#F59E0B',
      tags: ['Unlimited km', 'Insurance', 'GPS'],
      desc: 'Verified self-drive car rental with zero security deposit for verified SA students, door delivery, and comprehensive insurance.',
    },
    {
      id: 4,
      name: 'Goa Beachfront Villa',
      loc: 'Anjuna Beach, Goa',
      cat: 'Beach House',
      rate: '4.9',
      revs: '88',
      left: '2',
      perk: '₹1,000 off for SA groups',
      was: '₹7,000/night',
      now: '₹4,500',
      unitNum: 4500,
      per: '/night',
      off: '36% OFF',
      col: '#4C8DF6',
      tags: ['Beach access', 'Jacuzzi', 'Housekeeping'],
      desc: 'Exclusive private villa for student getaways with direct beach access, private pool, high-speed WiFi, and chef on demand.',
    },
    {
      id: 5,
      name: 'Self-Drive Mahindra Thar',
      loc: 'Goa · Manali · Rishikesh',
      cat: 'Car',
      rate: '4.8',
      revs: '92',
      left: '3',
      perk: 'Adventure pack — free',
      was: '₹4,999/day',
      now: '₹3,499',
      unitNum: 3499,
      per: '/day',
      off: '30% OFF',
      col: '#F59E0B',
      tags: ['4x4', 'Off-road', 'Insurance'],
      desc: 'Convertible 4x4 Thar with off-road tires, camp accessories included, and 24/7 roadside assistance.',
    },
    {
      id: 6,
      name: 'CampusPG — IIT Bombay Area',
      loc: 'Powai, Mumbai',
      cat: 'PG / Hostel',
      rate: '4.6',
      revs: '142',
      left: '3',
      perk: '10% off with SA-ID',
      was: '₹9,000/mo',
      now: '₹6,500',
      unitNum: 6500,
      per: '/mo',
      off: '28% OFF',
      col: '#2FB8C6',
      tags: ['WiFi', 'Meals 2x/day', 'AC'],
      desc: 'Walking distance to campus with quiet study zones, 2 meals daily, laundry service, and biometric entry.',
    },
    {
      id: 7,
      name: '91springboard Day Pass',
      loc: '9 cities · 30+ centres',
      cat: 'Day Pass',
      rate: '4.4',
      revs: '1100',
      left: '999',
      perk: '5 day-passes for ₹2,499',
      was: '₹999/day',
      now: '₹599',
      unitNum: 599,
      per: '/day',
      off: '40% OFF',
      col: '#A78BFA',
      tags: ['WiFi', 'Coffee', 'Print quota'],
      desc: 'Plug-and-play coworking pass across 30+ centers in India with unlimited artisanal coffee, high-speed WiFi, and printing.',
    },
  ];

  const filteredListings = LISTINGS.filter((item) => {
    const matchCity = selectedCity === 'All Cities' || item.loc.toLowerCase().includes(selectedCity.toLowerCase());
    const matchCategory = !selectedCategory || item.cat === selectedCategory;
    const matchQuery = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.loc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCity && matchCategory && matchQuery;
  });

  const money = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  const handleStartBooking = (item: any) => {
    setSelectedListing(null);
    setBookingListing(item);
  };

  const handleConfirmBooking = () => {
    if (!bookingListing) return;
    const unit = bookingListing.unitNum;
    const multiplier = bookingListing.per === '/mo' ? 1 : 30;
    const gross = unit * multiplier * guests;
    const fee = Math.round(gross * 0.04);
    const dep = Math.round(unit);
    const total = gross + fee + dep;

    const newBooking = {
      id: `SA-RNT-${Math.floor(100000 + Math.random() * 899999)}`,
      name: bookingListing.name,
      loc: bookingListing.loc,
      checkIn,
      checkOut,
      guests: `${guests} guest${guests > 1 ? 's' : ''}`,
      amt: money(total),
      status: 'CONFIRMED',
    };

    setActiveBookings([newBooking, ...activeBookings]);
    setConfirmedBooking(newBooking);
    setBookingListing(null);
  };

  const handleCancelBooking = (id: string) => {
    setActiveBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'CANCELLED · Refunded' } : b))
    );
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>Rentals Marketplace</Text>
      </View>
    );
  }

  return (
    <div
      id="db-page-rentals"
      style={{
        width: '100%',
        color: '#F4F4FA',
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* ── Top Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
            SA Stay Rentals Marketplace
          </h1>
          <p style={{ fontSize: '14.5px', color: '#8A8A9E', margin: 0 }}>
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
              color: '#F59E0B',
              border: '1px solid #4A3410',
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '100px',
              padding: '9px 16px',
              cursor: 'pointer',
            }}
          >
            My Bookings <span style={{ background: '#F59E0B', color: '#201200', borderRadius: '100px', padding: '1px 8px' }}>{activeBookings.length}</span>
          </button>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#34D399',
              border: '1px solid #17503E',
              background: 'rgba(16, 185, 129, 0.13)',
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
              boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
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
          { label: 'SA VERIFIED', val: '42', sub: 'Guaranteed authenticity', col: '#34D399' },
          { label: 'FEATURED', val: '13', sub: 'Top picks this month', col: '#F59E0B' },
          { label: 'SA DISCOUNTS', val: '25%', sub: 'Member savings', col: '#A78BFA' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: '1px solid #1F1F30',
              borderRadius: '14px',
              background: '#101019',
              padding: '14px 16px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.1px', color: '#8A8A9E' }}>{stat.label}</div>
              <div style={{ fontSize: '12px', color: '#6A6A7E', marginTop: '2px' }}>{stat.sub}</div>
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
            border: '1px solid #262638',
            background: '#101019',
            color: '#FFFFFF',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '14px',
          }}
        />

        {/* City Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '14px' }}>
          {CITIES.map((city) => (
            <span
              key={city}
              onClick={() => setSelectedCity(city)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '13px',
                fontWeight: 500,
                padding: '9px 15px',
                borderRadius: '100px',
                border: `1px solid ${selectedCity === city ? '#7C5CFC' : '#262638'}`,
                background: selectedCity === city ? 'rgba(124, 92, 252, 0.18)' : 'transparent',
                color: selectedCity === city ? '#FFFFFF' : '#8A8A9E',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              📍 {city}
            </span>
          ))}
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '9px', overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORIES.map((cat) => (
            <span
              key={cat.name}
              onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
                padding: '10px 16px',
                borderRadius: '12px',
                border: `1px solid ${selectedCategory === cat.name ? cat.col : '#262638'}`,
                background: selectedCategory === cat.name ? 'rgba(255, 255, 255, 0.08)' : '#14141F',
                color: '#FFFFFF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '3px', background: cat.col }} />
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* ── 8 Verified Rental Listing Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        {filteredListings.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedListing(item)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #1F1F30',
              borderRadius: '18px',
              background: '#101019',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
            }}
          >
            {/* Card Header Icon & Badges */}
            <div style={{ position: 'relative', height: '104px', background: `linear-gradient(140deg, ${item.col}2E, #14141F)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', top: '12px', fontSize: '10.5px', fontWeight: 700, color: '#34D399', background: 'rgba(16, 185, 129, 0.13)', border: '1px solid #17503E', borderRadius: '100px', padding: '4px 9px' }}>
                ✓ Verified
              </span>
              <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '10.5px', fontWeight: 700, color: '#FFFFFF', background: item.col, borderRadius: '7px', padding: '4px 8px' }}>
                {item.off}
              </span>
            </div>

            {/* Card Content */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '12.5px', color: '#8A8A9E' }}>{item.loc}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: item.col }}>{item.cat}</span>
                </div>
              </div>

              {/* Tag Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {item.tags.map((t) => (
                  <span key={t} style={{ fontSize: '11px', color: '#8A8A9E', border: '1px solid #262638', borderRadius: '7px', padding: '3px 7px' }}>
                    ✓ {t}
                  </span>
                ))}
              </div>

              {/* Rating & Availability */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <span>⭐ <strong>{item.rate}</strong> ({item.revs})</span>
                <span style={{ color: '#34D399', fontWeight: 600 }}>{item.left} left</span>
              </div>

              {/* Perk Box */}
              <div style={{ fontSize: '12px', fontWeight: 600, color: item.col, background: 'rgba(255,255,255,0.04)', border: `1px solid ${item.col}44`, borderRadius: '9px', padding: '8px 10px' }}>
                ✦ {item.perk}
              </div>

              {/* Pricing & CTA */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px' }}>
                <div>
                  <div style={{ fontSize: '11.5px', color: '#6A6A7E', textDecoration: 'line-through' }}>{item.was}</div>
                  <div style={{ fontSize: '19px', fontWeight: 700 }}>
                    {item.now}<span style={{ fontSize: '12px', color: '#8A8A9E' }}>{item.per}</span>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(4,4,10,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', background: '#101019', border: '1px solid #1F1F30', borderRadius: '22px', padding: '28px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>{selectedListing.name}</h2>
                <div style={{ fontSize: '14px', color: '#8A8A9E' }}>{selectedListing.loc} · <strong style={{ color: selectedListing.col }}>{selectedListing.cat}</strong></div>
              </div>
              <span onClick={() => setSelectedListing(null)} style={{ fontSize: '20px', color: '#8A8A9E', cursor: 'pointer' }}>✕</span>
            </div>

            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: '0 0 20px' }}>
              {selectedListing.desc}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {selectedListing.tags.map((t: string) => (
                <span key={t} style={{ fontSize: '12.5px', color: '#8A8A9E', border: '1px solid #262638', borderRadius: '8px', padding: '6px 12px' }}>
                  ✓ {t}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#14141F', border: '1px solid #262638', borderRadius: '16px', padding: '18px 20px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6A6A7E', textDecoration: 'line-through' }}>{selectedListing.was}</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{selectedListing.now}{selectedListing.per}</div>
              </div>
              <button
                onClick={() => handleStartBooking(selectedListing)}
                style={{
                  background: '#F59E0B',
                  color: '#201200',
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(4,4,10,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', background: '#101019', border: '1px solid #1F1F30', borderRadius: '22px', padding: '28px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px' }}>Book {bookingListing.name}</h2>
                <div style={{ fontSize: '13px', color: '#8A8A9E' }}>{bookingListing.loc}</div>
              </div>
              <span onClick={() => setBookingListing(null)} style={{ fontSize: '20px', color: '#8A8A9E', cursor: 'pointer' }}>✕</span>
            </div>

            {/* Guest Counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#14141F', border: '1px solid #262638', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Guests / Members</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setGuests(Math.max(1, guests - 1))} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #262638', background: '#101019', color: '#FFFFFF', fontSize: '18px', cursor: 'pointer' }}>−</button>
                <span style={{ fontSize: '15px', fontWeight: 700 }}>{guests}</span>
                <button onClick={() => setGuests(Math.min(8, guests + 1))} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #262638', background: '#101019', color: '#FFFFFF', fontSize: '18px', cursor: 'pointer' }}>+</button>
              </div>
            </div>

            {/* Price Breakdown */}
            <div style={{ background: '#14141F', border: '1px solid #262638', borderRadius: '16px', padding: '16px 18px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '8px', color: '#8A8A9E' }}>
                <span>Base Rate</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{money(bookingListing.unitNum * guests)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '8px', color: '#8A8A9E' }}>
                <span>SA Member Savings</span>
                <span style={{ color: '#34D399', fontWeight: 700 }}>− ₹1,500</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '8px', color: '#8A8A9E' }}>
                <span>Service Fee (4%)</span>
                <span style={{ color: '#FFFFFF' }}>{money(bookingListing.unitNum * 0.04)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, borderTop: '1px solid #262638', paddingTop: '12px', marginTop: '12px' }}>
                <span>Total Payable</span>
                <span style={{ color: '#F59E0B' }}>{money(bookingListing.unitNum * guests * 1.04)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setBookingListing(null)} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #262638', background: 'transparent', color: '#8A8A9E', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleConfirmBooking} style={{ flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: '#F59E0B', color: '#201200', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer' }}>
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── My Bookings Modal ── */}
      {showMyBookings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 170, background: 'rgba(4,4,10,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', background: '#101019', border: '1px solid #1F1F30', borderRadius: '22px', padding: '28px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>My Active Bookings</h2>
              <span onClick={() => setShowMyBookings(false)} style={{ fontSize: '20px', color: '#8A8A9E', cursor: 'pointer' }}>✕</span>
            </div>

            {activeBookings.length > 0 ? (
              activeBookings.map((b) => (
                <div key={b.id} style={{ border: '1px solid #4A3410', borderRadius: '18px', background: '#14141F', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 700 }}>{b.name}</div>
                      <div style={{ fontSize: '12.5px', color: '#8A8A9E', marginTop: '2px' }}>{b.loc}</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: b.status.includes('CONFIRMED') ? '#34D399' : '#EF4444', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', padding: '4px 10px' }}>
                      {b.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12.5px', color: '#8A8A9E', marginBottom: '16px' }}>
                    <span>📅 {b.checkIn} — {b.checkOut}</span>
                    <span>👤 {b.guests}</span>
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>{b.amt}</span>
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
                      ✕ Cancel Booking
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: '#8A8A9E' }}>No active bookings.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
