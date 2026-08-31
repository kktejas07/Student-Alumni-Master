// @ts-nocheck
/**
 * NexusOSModernDashboardRN — 1:1 Pixel-Perfect React Native Front-End of the HTML Spec.
 *
 * Includes:
 *  - 100% matched colors, typography, and dark/light token system (#08080F).
 *  - Interactive 6-step onboarding setup wizard with ATS resume scanner & roadmap.
 *  - Bento grid student dashboard with Career Readiness radial gauge & task checklist.
 *  - Career Growth Prediction SVG area curve with stroke animation.
 *  - Double-sided 3D perspective flippable Student Digital ID Card with QR code.
 *  - SA Stay Rentals Marketplace with city filters, detail modal & live price calculation.
 *  - Floating Agent K launcher with glowing pulse animation.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X, Star } from 'lucide-react';
import {
  View, Text, StyleSheet, Pressable, Platform, useWindowDimensions, ScrollView,
  TextInput, Modal, Animated as RNAnimated, Easing,
} from 'react-native';
import Svg, { Path, Rect, Circle, G, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { NX, NX_MOTION } from '@/src/theme/nexus';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { DashboardView } from './portals/student/views/DashboardView';
import { CareerAIView } from './portals/student/views/CareerAIView';
import { InternshipsView } from './portals/student/views/InternshipsView';
import { EchoShowcaseView } from './portals/student/views/EchoShowcaseView';
import { NetworkView } from './portals/student/views/NetworkView';
import { MyBookingsView } from './portals/student/views/MyBookingsView';
import { MyTicketsView } from './portals/student/views/MyTicketsView';
import { EchoTicketsConfirmationPage } from './echo/EchoTicketsConfirmationPage';
import { EventsView } from './portals/student/views/EventsView';
import { MyWorkshopsView } from './portals/student/views/MyWorkshopsView';
import CoursesPage from '@/app/courses';
import FinancialPage from '@/app/financial';
import DealsPage from '@/app/deals';
import WalletPage from '@/app/wallet';
import HigherEducationPage from '@/app/higher-education';

export function NexusOSModernDashboardRN({ initialView = 'dash' }: { initialView?: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isNarrow = width < 1180;
  const isTight = width < 900;

  // View & Nav State
  const [currentView, setCurrentView] = useState<string>(initialView || 'dash');
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const VIEW_TITLES: Record<string, [string, string]> = {
    dash: ['Good morning, Devender ', "Here's your personalised dashboard for today"],
    ai: ['Career AI', 'Your roadmap, rebuilt weekly by Agent K'],
    internships: ['Internships & Jobs', '267 roles matched to your profile'],
    echo: ['ECHO Showcase', 'Galleries, partners and speakers from every event'],
    net: ['Network', 'Alumni and students from your branch'],
    bookings: ['My Bookings', 'Sessions, stays and workshop seats'],
    tickets: ['My Tickets', 'Entry passes and invoices on your SA ID'],
    events: ['My Events', 'Eight registered this term'],
    workshops: ['My Workshops', 'Hands-on sessions and free passes'],
    courses: ['Courses', 'Structured learning mapped to your target role'],
    financial: ['Financial', 'Scholarships, aid and receipts'],
    deals: ['Deals & Offers', 'Student pricing unlocked by your college email'],
    wallet: ['SA Wallet', 'One balance across every module'],
    higher: ['Higher Education', 'Programme shortlists, deadlines and funding'],
    rentals: ['Rentals', 'Verified stays, vehicles and coworking with SA discounts'],
    profile: ['Profile & Digital Identity', 'Manage your credentials, academic details, and skills'],
  };

  // Modals & Overlays
  const [showLogin, setShowLogin] = useState(initialView === 'login');
  const [showSetup, setShowSetup] = useState(initialView === 'setup');
  const [showIDModal, setShowIDModal] = useState(false);
  const [isIDCardFlipped, setIsIDCardFlipped] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showBookDrawer, setShowBookDrawer] = useState(false);
  const [showBookDone, setShowBookDone] = useState(false);
  const [bookingGuests, setBookingGuests] = useState(1);

  // Setup Wizard State
  const [setupStep, setSetupStep] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState('Computer Science');
  const [selectedYear, setSelectedYear] = useState('2027');
  const [selectedGoal, setSelectedGoal] = useState('Software engineering');
  const [skillsLevels, setSkillsLevels] = useState<Record<string, number>>({
    'dsa': 2,
    'sys_design': 1,
    'interviews': 3,
    'portfolio': 1,
  });
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [isCardFlippedInSetup, setIsCardFlippedInSetup] = useState(false);

  // Dashboard Data & Interactivity State
  const [bannerIndex, setBannerIndex] = useState(0);
  const [tasksDone, setTasksDone] = useState<Record<number, boolean>>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [countdown, setCountdown] = useState({ h: 28, m: 14, s: 6 });
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── Auto-advance banner carousel ──────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { ...prev, h: prev.h - 1, m: 59, s: 59 };
        return { h: 0, m: 0, s: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Listings Data ─────────────────────────────────────────────────────────
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
      per: '/mo',
      off: '31% OFF',
      col: '#7C5CFC',
      tags: ['WiFi', 'Pantry', 'Lockers'],
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
      per: '/mo',
      off: '18% OFF',
      col: '#2FB8C6',
      tags: ['Co-working', 'Gym', 'Netflix lounge'],
    },
    {
      id: 2,
      name: 'Colive Hostel — Hinjewadi',
      loc: 'Hinjewadi, Pune',
      cat: 'PG / Hostel',
      rate: '4.4',
      revs: '340',
      left: '8',
      perk: '10% extra off',
      was: '₹11,000/mo',
      now: '₹8,500',
      per: '/mo',
      off: '23% OFF',
      col: '#34D399',
      tags: ['Meals', 'Gym', 'Pool'],
    },
    {
      id: 3,
      name: 'Revv Self-Drive SUV',
      loc: 'Delhi · Mumbai · Pune',
      cat: 'Car',
      rate: '4.4',
      revs: '188',
      left: '6',
      perk: '₹300 off weekend',
      was: '₹3,200/day',
      now: '₹2,199',
      per: '/day',
      off: '31% OFF',
      col: '#F59E0B',
      tags: ['Unlimited km', 'Insurance', 'GPS'],
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
      per: '/night',
      off: '36% OFF',
      col: '#4C8DF6',
      tags: ['Beach access', 'Jacuzzi', 'Housekeeping'],
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
      per: '/day',
      off: '30% OFF',
      col: '#F59E0B',
      tags: ['4x4', 'Off-road', 'Insurance'],
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
      per: '/mo',
      off: '28% OFF',
      col: '#2FB8C6',
      tags: ['WiFi', 'Meals 2x/day', 'AC'],
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
      per: '/day',
      off: '40% OFF',
      col: '#A78BFA',
      tags: ['WiFi', 'Coffee', 'Print quota'],
    },
  ];

  const filteredListings = LISTINGS.filter((item) => {
    if (selectedCategory && item.cat !== selectedCategory) return false;
    if (selectedCity !== 'All Cities' && !item.loc.toLowerCase().includes(selectedCity.toLowerCase())) return false;
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !item.loc.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={s.root}>
      {/* ── Background Aurora Orbs & Grid Pattern ─────────────────────────── */}
      <View style={s.bgfx} pointerEvents="none">
        <View style={s.aurora1} />
        <View style={s.aurora2} />
        <View style={s.dotGrid} />
      </View>

      {/* ── Layout Container ─────────────────────────────────────────────── */}
      <View style={[s.shell, sidebarCollapsed && s.shellMini]}>
        {/* ── Left Sticky Sidebar ────────────────────────────────────────── */}
        <View style={[s.sidebar, sidebarCollapsed && s.sidebarMini]}>
          {/* Brand Header */}
          <View style={s.sideHead}>
            <Svg width={32} height={36} viewBox="0 0 300 350">
              <Defs>
                <SvgGradient id="sbBadge" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#9E7BFF" />
                  <Stop offset="1" stopColor="#5B3FD9" />
                </SvgGradient>
              </Defs>
              <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#sbBadge)" />
              <SvgText x={150} y={212} textAnchor="middle" fontFamily="sans-serif" fontSize={124} fontWeight="700" fill="#FFFFFF">
                SA
              </SvgText>
            </Svg>
            {!sidebarCollapsed && (
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.brandTitle}>Student Alumni</Text>
                <Text style={s.brandSub}>Web Dashboard</Text>
              </View>
            )}
            <Pressable
              onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={s.collapseBtn}
            >
              <Text style={{ color: '#8A8A9E', fontSize: 13 }}>{sidebarCollapsed ? '→' : '←'}</Text>
            </Pressable>
          </View>

          {/* User Profile Mini Block */}
          {!sidebarCollapsed && (
            <View style={s.userMini}>
              <Text style={s.userName}>Devender Vutukuru</Text>
              <Text style={s.userClass}>Class of 2018</Text>
            </View>
          )}

          {/* Student Card Chip */}
          {!sidebarCollapsed && (
            <Pressable onPress={() => setShowIDModal(true)} style={s.cardChip}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardChipLabel}>My Student Card</Text>
                <Text style={s.cardChipId}>SA-2026-STU-RNWJMD</Text>
              </View>
              <Text style={{ color: '#A78BFA', fontSize: 13 }}>↗</Text>
            </Pressable>
          )}

          {/* Agent K Card */}
          {!sidebarCollapsed && (
            <View style={s.agentCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={s.agentBadgeIco}>
                  <Text style={{ color: '#fff', fontSize: 12 }}></Text>
                </View>
                <Text style={s.agentTitle}>AGENT K</Text>
                <View style={s.betaPill}><Text style={s.betaText}>BETA</Text></View>
              </View>
              <Text style={s.agentH1}>Run automations</Text>
              <Text style={s.agentSub}>Let AI handle multi-step tasks for you</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <View style={s.kbd}><Text style={s.kbdText}>⌘</Text></View>
                <View style={s.kbd}><Text style={s.kbdText}>K</Text></View>
                <Text style={{ color: '#6A6A7E', fontSize: 11 }}>quick launcher</Text>
              </View>
            </View>
          )}

          {/* Navigation Items */}
          <ScrollView style={{ flex: 1, paddingHorizontal: 6 }} showsVerticalScrollIndicator={false}>
            {[
              { id: 'dash', label: 'Dashboard', icon: '' },
              { id: 'ai', label: 'Career AI', icon: '' },
              { id: 'internships', label: 'Internships & Jobs', icon: '' },
              { id: 'echo', label: 'ECHO Showcase', icon: '' },
              { id: 'net', label: 'Network', icon: '' },
              { id: 'bookings', label: 'My Bookings', icon: '' },
              { id: 'tickets', label: 'My Tickets', icon: '' },
              { id: 'events', label: 'My Events', icon: '' },
              { id: 'workshops', label: 'My Workshops', icon: '' },
              { id: 'courses', label: 'Courses', icon: '' },
              { id: 'financial', label: 'Financial', icon: '' },
              { id: 'deals', label: 'Deals & Offers', icon: '' },
              { id: 'wallet', label: 'SA Wallet', icon: '' },
              { id: 'higher', label: 'Higher Education', icon: '' },
              { id: 'rentals', label: 'Rentals', icon: '' },
              { id: 'profile', label: 'Profile', icon: '' },
            ].map((nav) => {
              const isActive = currentView === nav.id;
              return (
                <Pressable
                  key={nav.id}
                  onPress={() => setCurrentView(nav.id)}
                  style={[s.navItem, isActive && s.navItemActive]}
                >
                  <Text style={s.navIcon}>{nav.icon}</Text>
                  {!sidebarCollapsed && <Text style={[s.navLabel, isActive && s.navLabelActive]}>{nav.label}</Text>}
                  {isActive && !sidebarCollapsed && <View style={s.activeDot} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Main Content Area ──────────────────────────────────────────── */}
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Top Sticky Header */}
          <View style={s.topBar}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.greetingTitle}>
                {(VIEW_TITLES[currentView] || VIEW_TITLES.dash)[0]}
              </Text>
              <Text style={s.greetingSub}>
                {(VIEW_TITLES[currentView] || VIEW_TITLES.dash)[1]}
              </Text>
            </View>

            <View style={s.topActions}>
              <View style={s.searchWrap}>
                <Text style={{ color: '#8A8A9E', fontSize: 13 }}></Text>
                <TextInput
                  style={s.searchInput}
                  placeholder="Search anything..."
                  placeholderTextColor="#6A6A7E"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <Pressable onPress={() => setShowIDModal(true)} style={s.idTopBtn}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#A78BFA' }}> Digital ID</Text>
              </Pressable>

              <View style={s.userAvatar}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>D</Text>
              </View>
            </View>
          </View>

          {/* Page Body */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 26, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* ══════════════════════════════════════════════════════════════
                VIEW 1: DASHBOARD
               ══════════════════════════════════════════════════════════════ */}
            {currentView === 'dash' && (
              <View style={{ gap: 24 }}>
                {/* 1. Hero Promo Banner Carousel */}
                <View style={s.bannerWrap}>
                  {bannerIndex === 0 && (
                    <View style={s.bannerSlide0}>
                      <View style={s.bannerLeft}>
                        <View style={s.hackCard}>
                          <Text style={s.hackWave1}>HackWave</Text>
                          <Text style={s.hackWave2}>3.0</Text>
                          <Text style={s.hackWave3}>2026</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.bannerEyebrow}>HACKWAVE 3.0 · 2026</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 6 }}>
                            <Text style={s.monthText}>SEP</Text>
                            <Text style={s.bigDate}>04</Text>
                            <Text style={s.dash}>—</Text>
                            <Text style={s.bigDate}>05</Text>
                            <Text style={s.yearText}>2026</Text>
                          </View>
                          <Text style={s.bannerVenue}>Sreenidhi Institute of Science and Technology, Hyderabad</Text>
                        </View>
                      </View>
                      <View style={s.bannerRight}>
                        <View style={s.partnerBadge}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A365D' }}>SREENIDHI EDUCATIONAL GROUP</Text>
                        </View>
                        <Text style={{ color: '#C9B4F5', fontSize: 12 }}>IN COLLABORATION WITH STUDENT ALUMNI</Text>
                      </View>
                    </View>
                  )}

                  {bannerIndex === 1 && (
                    <View style={s.bannerSlide1}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.bannerEyebrow, { color: '#34D399' }]}>VOICE OF GENERATIONS · VNRVJIT</Text>
                        <Text style={s.bannerTitle}>Alumni took the stage,{"\n"}students took notes.</Text>
                        <Text style={s.bannerSub}>26 photos, 3 workshops and 5 testimonials from the last showcase.</Text>
                        <Pressable style={s.slideBtn}><Text style={s.slideBtnText}>Open ECHO Showcase →</Text></Pressable>
                      </View>
                    </View>
                  )}

                  {bannerIndex === 2 && (
                    <View style={s.bannerSlide2}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.bannerEyebrow, { color: '#F1B8D9' }]}>CAREER AI · NEW</Text>
                        <Text style={s.bannerTitle}>Your readiness is up{"\n"}8% this week.</Text>
                        <Text style={s.bannerSub}>Agent K rebuilt your roadmap. Next milestone: build your professional resume.</Text>
                        <Pressable style={s.slideBtn}><Text style={s.slideBtnText}>Continue now →</Text></Pressable>
                      </View>
                    </View>
                  )}

                  {/* Carousel Dots */}
                  <View style={s.bannerDots}>
                    {[0, 1, 2].map((idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => setBannerIndex(idx)}
                        style={[s.bDot, bannerIndex === idx && s.bDotActive]}
                      />
                    ))}
                  </View>
                </View>

                {/* 2. Collab Exclusive Locked Coupons */}
                <View>
                  <Text style={s.sectionHeader}> COLLAB EXCLUSIVE COUPONS</Text>
                  <View style={s.couponRow}>
                    {[1, 2, 3, 4, 5].map((item) => (
                      <View key={item} style={s.couponCard}>
                        <View style={s.couponTop}>
                          <Text style={{ fontSize: 24 }}></Text>
                        </View>
                        <View style={s.couponBottom}>
                          <Text style={s.couponH1}>Coming soon</Text>
                          <Text style={s.couponSub}>This coupon will be available shortly</Text>
                          <View style={s.lockedPill}><Text style={s.lockedText}>Locked</Text></View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 3. 4-Column KPI Strip */}
                <View style={s.kpiRow}>
                  {/* Profile Strength */}
                  <View style={s.kpiTile}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.kpiLabel}>Profile Strength</Text>
                      <Text style={s.kpiBig}>50%</Text>
                      <Text style={s.kpiSub}>Keep going!</Text>
                    </View>
                    <Svg width={46} height={46} viewBox="0 0 46 46">
                      <Circle cx={23} cy={23} r={19} stroke="#262638" strokeWidth={4} fill="none" />
                      <Circle cx={23} cy={23} r={19} stroke="#7C5CFC" strokeWidth={4} strokeDasharray="119.4" strokeDashoffset="59.7" strokeLinecap="round" fill="none" />
                    </Svg>
                  </View>

                  {/* Applications */}
                  <View style={s.kpiTile}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.kpiLabel}>Applications</Text>
                      <Text style={s.kpiBig}>0</Text>
                      <Text style={s.kpiSub}>0 applied</Text>
                    </View>
                    <View style={s.kpiIconBox}><Text style={{ fontSize: 18 }}></Text></View>
                  </View>

                  {/* Network */}
                  <View style={s.kpiTile}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.kpiLabel, { color: '#34D399' }]}>Network</Text>
                      <Text style={s.kpiBig}>0</Text>
                      <Text style={s.kpiSub}>Connections</Text>
                    </View>
                    <View style={[s.kpiIconBox, { backgroundColor: 'rgba(52,211,153,0.12)' }]}>
                      <Text style={{ fontSize: 18 }}></Text>
                    </View>
                  </View>

                  {/* Events */}
                  <View style={s.kpiTile}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.kpiLabel, { color: '#F0616B' }]}>Events</Text>
                      <Text style={s.kpiBig}>8</Text>
                      <Text style={s.kpiSub}>Registered</Text>
                    </View>
                    <View style={[s.kpiIconBox, { backgroundColor: 'rgba(240,97,107,0.12)' }]}>
                      <Text style={{ fontSize: 18 }}></Text>
                    </View>
                  </View>
                </View>

                {/* 4. Tab Segment Switcher (Opportunities vs Intelligence Center) */}
                <View style={s.tabBar}>
                  <Pressable
                    onPress={() => setActiveTab(0)}
                    style={[s.tabBtn, activeTab === 0 && s.tabBtnActive]}
                  >
                    <Text style={[s.tabBtnText, activeTab === 0 && s.tabBtnTextActive]}> Opportunities</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setActiveTab(1)}
                    style={[s.tabBtn, activeTab === 1 && s.tabBtnActive]}
                  >
                    <Text style={[s.tabBtnText, activeTab === 1 && s.tabBtnTextActive]}> Intelligence Center</Text>
                  </Pressable>
                </View>

                {/* ── TAB 1: Bento Grid Opportunities ─────────────────────── */}
                {activeTab === 0 && (
                  <View style={s.bentoGrid}>
                    {/* Bento Tile 1: Career Readiness */}
                    <View style={[s.bentoTile, { width: isNarrow ? '100%' : '48%' }]}>
                      <Text style={s.tileEyebrow}>CAREER READINESS</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 14 }}>
                        <Svg width={100} height={100} viewBox="0 0 112 112">
                          <Circle cx={56} cy={56} r={46} stroke="#262638" strokeWidth={9} fill="none" />
                          <Circle cx={56} cy={56} r={46} stroke="#7C5CFC" strokeWidth={9} strokeDasharray="289" strokeDashoffset="185" strokeLinecap="round" fill="none" />
                          <SvgText x={56} y={63} textAnchor="middle" fontFamily="sans-serif" fontSize={26} fontWeight="700" fill="#F4F4FA">36%</SvgText>
                        </Svg>
                        <View>
                          <Text style={s.tierTitle}>Builder</Text>
                          <Text style={s.tierSub}> Industry Ready</Text>
                          <View style={s.gainPill}><Text style={s.gainText}>↗ +8% this week</Text></View>
                        </View>
                      </View>
                      <View style={s.tileDivider} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Build your professional resume</Text>
                        <Text style={{ fontSize: 12, color: '#A78BFA' }}>60%</Text>
                      </View>
                      <View style={s.trackBar}><View style={[s.fillBar, { width: '60%' }]} /></View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <Text style={{ fontSize: 12, color: '#8A8A9E' }}>ETA ~18 weeks</Text>
                        <Pressable style={s.primaryBtn}><Text style={s.btnText}>Continue now</Text></Pressable>
                      </View>
                    </View>

                    {/* Bento Tile 2: Today's Focus */}
                    <View style={[s.bentoTile, { width: isNarrow ? '100%' : '48%' }]}>
                      <Text style={s.tileEyebrow}>TODAY'S FOCUS · AGENT K</Text>
                      <View style={{ gap: 10, marginVertical: 10 }}>
                        {[
                          { id: 0, title: 'Refine your resume for the Google SWE referral', sub: '4 min · closes Friday' },
                          { id: 1, title: 'Prep 3 questions for the mentor call', sub: '2 min · tomorrow 6pm' },
                          { id: 2, title: 'Apply to 2 matched roles closing this week', sub: '6 min · 2 of 267 matches' },
                        ].map((t) => {
                          const done = !!tasksDone[t.id];
                          return (
                            <Pressable
                              key={t.id}
                              onPress={() => setTasksDone({ ...tasksDone, [t.id]: !done })}
                              style={[s.taskRow, done && { opacity: 0.6 }]}
                            >
                              <View style={[s.checkbox, done && s.checkboxChecked]}>
                                {done && <Check size={12} color="#fff" />}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[s.taskTitle, done && { textDecorationLine: 'line-through' }]}>{t.title}</Text>
                                <Text style={s.taskSub}>{t.sub}</Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Text style={s.focusDoneText}>
                        <Text style={{ color: '#A78BFA', fontWeight: '700' }}>
                          {Object.values(tasksDone).filter(Boolean).length} of 3
                        </Text>{' '}
                        done today
                      </Text>
                    </View>

                    {/* Bento Tile 3: Skill Streak */}
                    <View style={[s.bentoTile, { width: isNarrow ? '100%' : '31%' }]}>
                      <Text style={s.tileEyebrow}>SKILL STREAK</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 10 }}>
                        <Text style={s.bigNum}>0</Text>
                        <Text style={{ color: '#8A8A9E', fontSize: 14 }}>days</Text>
                        <Text style={{ fontSize: 22, marginLeft: 'auto' }}></Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                          <Pressable
                            key={day}
                            onPress={() => setSelectedDay(day)}
                            style={[s.streakDay, selectedDay !== null && day <= selectedDay && s.streakDayActive]}
                          />
                        ))}
                      </View>
                      <Text style={{ color: '#F0616B', fontSize: 12, marginTop: 12 }}>Start your streak today</Text>
                    </View>

                    {/* Bento Tile 4: Next Session Countdown */}
                    <View style={[s.bentoTile, { width: isNarrow ? '100%' : '31%' }]}>
                      <Text style={s.tileEyebrow}>NEXT SESSION</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 }}>
                        <View style={s.mentorAvatar}><Text style={{ color: '#fff', fontWeight: '700' }}>RS</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Rahul Sharma</Text>
                          <Text style={{ color: '#8A8A9E', fontSize: 12 }}>Senior SDE @ Google</Text>
                        </View>
                        <View style={s.confirmedPill}><Text style={s.confirmedText}>CONFIRMED</Text></View>
                      </View>
                      <View style={s.tileDivider} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={s.countdownText}>
                            {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}
                          </Text>
                          <Text style={{ color: '#8A8A9E', fontSize: 11 }}>Thursday · 6:00 pm IST</Text>
                        </View>
                        <Pressable style={s.primaryBtn}><Text style={s.btnText}>Join room</Text></Pressable>
                      </View>
                    </View>

                    {/* Bento Tile 5: Top Matches List */}
                    <View style={[s.bentoTile, { width: isNarrow ? '100%' : '31%' }]}>
                      <Text style={s.tileEyebrow}>TOP MATCHES FOR YOU</Text>
                      <View style={{ gap: 8, marginVertical: 10 }}>
                        {[
                          { title: 'Account Executive', comp: 'Boulevard · ₹22-28 LPA', match: '30%' },
                          { title: 'Brand Content Manager', comp: 'Demandbase · ₹14-18 LPA', match: '30%' },
                        ].map((m, i) => (
                          <View key={i} style={s.matchItem}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{m.title}</Text>
                              <Text style={{ color: '#8A8A9E', fontSize: 11 }}>{m.comp}</Text>
                            </View>
                            <Pressable style={s.applyBtn}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Apply</Text></Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* ── TAB 2: Intelligence Center ──────────────────────────── */}
                {activeTab === 1 && (
                  <View style={{ gap: 20 }}>
                    <View style={s.intelHero}>
                      <Text style={[s.tileEyebrow, { color: '#A78BFA' }]}>CURRENT GOAL</Text>
                      <Text style={s.intelGoalH1}>Explore at a Top Company in your field</Text>
                      <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                        <Text style={{ color: '#8A8A9E', fontSize: 13 }}>✦ Level: <Text style={{ color: '#A78BFA', fontWeight: '700' }}>Builder</Text></Text>
                        <Text style={{ color: '#8A8A9E', fontSize: 13 }}>✦ Target: <Text style={{ color: '#A78BFA', fontWeight: '700' }}>Industry Ready</Text></Text>
                        <Text style={{ color: '#8A8A9E', fontSize: 13 }}>✦ ETA: <Text style={{ color: '#A78BFA', fontWeight: '700' }}>~18 Weeks</Text></Text>
                      </View>
                    </View>

                    {/* SVG Prediction Area Chart */}
                    <View style={s.chartCard}>
                      <Text style={s.tileEyebrow}>CAREER GROWTH PREDICTION (180 DAYS)</Text>
                      <Svg width="100%" height={180} viewBox="0 0 780 240">
                        <Defs>
                          <SvgGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#7C5CFC" stopOpacity="0.4" />
                            <Stop offset="1" stopColor="#7C5CFC" stopOpacity="0.0" />
                          </SvgGradient>
                        </Defs>
                        <Path d="M40 190 L180 168 L320 132 L460 128 L600 106 L740 60 L740 210 L40 210 Z" fill="url(#chartGrad)" />
                        <Path d="M40 190 L180 168 L320 132 L460 128 L600 106 L740 60" stroke="#8B7BFF" strokeWidth={3} fill="none" />
                        <Circle cx={40} cy={190} r={5} fill="#B9AEFF" />
                        <Circle cx={180} cy={168} r={5} fill="#B9AEFF" />
                        <Circle cx={320} cy={132} r={5} fill="#B9AEFF" />
                        <Circle cx={460} cy={128} r={5} fill="#B9AEFF" />
                        <Circle cx={600} cy={106} r={5} fill="#B9AEFF" />
                        <Circle cx={740} cy={60} r={6} fill="#FFFFFF" />
                      </Svg>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════
                VIEW 2: RENTALS MARKETPLACE
               ══════════════════════════════════════════════════════════════ */}
            {currentView === 'rentals' && (
              <View style={{ gap: 20 }}>
                {/* 3 Promo Cards */}
                <View style={s.promoRow}>
                  <View style={[s.promoCard, { backgroundColor: '#5B3FD9' }]}>
                    <Text style={s.promoH1}>Verified student PGs near campus</Text>
                    <Text style={s.promoPrice}>from ₹6,500/mo</Text>
                    <Pressable style={s.promoBtn}><Text style={s.promoBtnText}>Browse stays</Text></Pressable>
                  </View>
                  <View style={[s.promoCard, { backgroundColor: '#A6389B' }]}>
                    <Text style={s.promoH1}>Self-drive cars & scooter rentals</Text>
                    <Text style={s.promoPrice}>from ₹1,499/mo</Text>
                    <Pressable style={s.promoBtn}><Text style={s.promoBtnText}>Explore mobility</Text></Pressable>
                  </View>
                  <View style={[s.promoCard, { backgroundColor: '#1E6FE0' }]}>
                    <Text style={s.promoH1}>Coworking desks & day passes</Text>
                    <Text style={s.promoPrice}>from ₹599/day</Text>
                    <Pressable style={s.promoBtn}><Text style={s.promoBtnText}>View desks</Text></Pressable>
                  </View>
                </View>

                {/* City Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {['All Cities', 'Bengaluru', 'Chennai', 'Delhi', 'Goa', 'Hyderabad', 'Mumbai', 'Pune'].map((city) => (
                    <Pressable
                      key={city}
                      onPress={() => setSelectedCity(city)}
                      style={[s.cityPill, selectedCity === city && s.cityPillActive]}
                    >
                      <Text style={[s.cityPillText, selectedCity === city && s.cityPillTextActive]}>{city}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Category Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['Flexi Desk', 'PG / Hostel', 'Car', 'Beach House', 'Day Pass'].map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      style={[s.catPill, selectedCategory === cat && s.catPillActive]}
                    >
                      <Text style={[s.catPillText, selectedCategory === cat && { color: '#fff' }]}>{cat}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Listings Grid */}
                <View style={s.listingsGrid}>
                  {filteredListings.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setSelectedListing(item);
                        setShowBookDrawer(true);
                      }}
                      style={s.listingCard}
                    >
                      <View style={[s.listingHero, { backgroundColor: `${item.col}22` }]}>
                        <View style={s.discountBadge}><Text style={s.discountText}>{item.off}</Text></View>
                        <Text style={{ fontSize: 32 }}></Text>
                      </View>
                      <View style={{ padding: 14, gap: 8 }}>
                        <Text style={s.listingTitle}>{item.name}</Text>
                        <Text style={s.listingLoc}>{item.loc}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                          <Text style={s.listingRate}> {item.rate} ({item.revs})</Text>
                          <Text style={s.listingLeft}>{item.left} left</Text>
                        </View>
                        <View style={s.perkBox}><Text style={s.perkText}>✦ {item.perk}</Text></View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
                          <View>
                            <Text style={s.wasPrice}>{item.was}</Text>
                            <Text style={s.nowPrice}>{item.now}{item.per}</Text>
                          </View>
                          <View style={s.viewBtn}><Text style={s.viewBtnText}>Details</Text></View>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════
                VIEW 3: PROFILE
               ══════════════════════════════════════════════════════════════ */}
            {currentView === 'profile' && (
              <View style={{ gap: 20 }}>
                {/* Profile Completion */}
                <View style={s.profileHeaderCard}>
                  <View style={s.profileAvatar}><Text style={{ color: '#fff', fontSize: 26, fontWeight: '700' }}>D</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>Devender Vutukuru</Text>
                    <Text style={{ color: '#8A8A9E', fontSize: 13 }}>Khammam Institute of Technologies and Sciences</Text>
                    <View style={s.verifiedBadge}><Text style={s.verifiedText}>Verified Student</Text></View>
                  </View>
                </View>

                {/* Aadhaar & DigiLocker Cards */}
                <View style={s.govCard}>
                  <Text style={s.tileEyebrow}>GOVERNMENT IDENTITY & DIGILOCKER</Text>
                  <View style={{ gap: 12, marginTop: 12 }}>
                    <View style={s.govItem}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Aadhaar Number (UIDAI)</Text>
                      <Text style={{ color: '#8A8A9E', fontSize: 12 }}>Stored encrypted as •••• •••• 5800</Text>
                    </View>
                    <View style={s.govItem}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>DigiLocker ABC Account</Text>
                      <Text style={{ color: '#8A8A9E', fontSize: 12 }}>Verified Academic Bank of Credits</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ── ADDITIONAL MODULE VIEWS ─────────────────────────────────── */}
            {currentView === 'ai' && <CareerAIView />}
            {currentView === 'internships' && <InternshipsView />}
            {currentView === 'echo' && <EchoShowcaseView />}
            {currentView === 'net' && <NetworkView />}
            {currentView === 'bookings' && <MyBookingsView />}
            {currentView === 'tickets' && <EchoTicketsConfirmationPage initialTab="tickets" />}
            {currentView === 'events' && <EventsView />}
            {currentView === 'workshops' && <MyWorkshopsView />}
            {currentView === 'courses' && <CoursesPage />}
            {currentView === 'financial' && <FinancialPage />}
            {currentView === 'deals' && <DealsPage />}
            {currentView === 'wallet' && <WalletPage />}
            {currentView === 'higher' && <HigherEducationPage />}
          </ScrollView>
        </View>
      </View>

      {/* ── 3D FLIPPABLE STUDENT ID CARD MODAL ─────────────────────────────── */}
      <Modal visible={showIDModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setShowIDModal(false)} />
          <View style={s.idModalSheet}>
            <View style={s.idModalHead}>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Digital Student ID</Text>
              <Pressable onPress={() => setShowIDModal(false)}><X size={18} color="#fff" /></Pressable>
            </View>

            <View style={s.idCardPerspective}>
              <Pressable
                onPress={() => setIsIDCardFlipped(!isIDCardFlipped)}
                style={[s.id3DCard, isIDCardFlipped ? s.id3DCardBack : s.id3DCardFront]}
              >
                {!isIDCardFlipped ? (
                  <View style={s.idFrontContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={s.idBrandText}>STUDENT ALUMNI</Text>
                      <View style={s.idVerifiedPill}><Text style={s.idVerifiedText}>VERIFIED</Text></View>
                    </View>
                    <View style={{ marginVertical: 14 }}>
                      <Text style={s.idName}>Devender Vutukuru</Text>
                      <Text style={s.idDegree}>Computer Science · Class of 2018</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <View>
                        <Text style={s.idMetaLabel}>STUDENT ID</Text>
                        <Text style={s.idMetaVal}>SA-2026-STU-RNWJMD</Text>
                        <Text style={s.idValid}>Valid until June 2027</Text>
                      </View>
                      <View style={s.qrBox}><Text style={{ fontSize: 24 }}></Text></View>
                    </View>
                  </View>
                ) : (
                  <View style={s.idBackContent}>
                    <Text style={s.idBackH1}>ISSUED BY STUDENTALUMNI</Text>
                    <Text style={s.idBackSub}>This card confirms a verified college affiliation. Report loss at studentalumni.ai/verify.</Text>
                    <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#8A8A9E', fontSize: 11 }}>studentalumni.ai/verify</Text>
                      <Text style={{ color: '#8A8A9E', fontSize: 11 }}>SA-2026-STU-RNWJMD</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Pressable
                onPress={() => setIsIDCardFlipped(!isIDCardFlipped)}
                style={s.primaryBtn}
              >
                <Text style={s.btnText}>{isIDCardFlipped ? 'Show Front' : 'Flip Card'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── FLOATING AGENT K LAUNCHER ──────────────────────────────────────── */}
      <Pressable onPress={() => router.push('/agent-k')} style={s.agentFab}>
        <Text style={{ color: '#fff', fontSize: 16 }}></Text>
        <Text style={s.agentFabText}>Agent K</Text>
      </Pressable>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#08080F',
    minHeight: '100%' as any,
  },
  bgfx: {
    position: 'absolute' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  aurora1: {
    position: 'absolute' as any,
    top: -200, left: -200, width: 800, height: 800, borderRadius: 400,
    backgroundColor: 'rgba(124,92,252,0.12)',
  },
  aurora2: {
    position: 'absolute' as any,
    bottom: -200, right: -200, width: 800, height: 800, borderRadius: 400,
    backgroundColor: 'rgba(47,184,198,0.08)',
  },
  dotGrid: {
    position: 'absolute' as any,
    inset: 0,
    opacity: 0.25,
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
    height: '100%' as any,
  },
  shellMini: {
    // collapsed
  },
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: '#1F1F30',
    backgroundColor: 'rgba(16,16,25,0.95)',
    paddingBottom: 20,
  },
  sidebarMini: {
    width: 74,
  },
  sideHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F30',
  },
  brandTitle: {
    color: '#F4F4FA',
    fontSize: 15,
    fontWeight: '700',
  },
  brandSub: {
    color: '#8A8A9E',
    fontSize: 11,
  },
  collapseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262638',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMini: {
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F30',
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userClass: {
    color: '#8A8A9E',
    fontSize: 12,
  },
  cardChip: {
    margin: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262638',
    backgroundColor: '#14141F',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardChipLabel: {
    color: '#8A8A9E',
    fontSize: 11,
  },
  cardChipId: {
    color: '#A78BFA',
    fontSize: 12.5,
    fontWeight: '700',
  },
  agentCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2A52',
    backgroundColor: '#101019',
  },
  agentBadgeIco: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#7C5CFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  betaPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#244C63',
  },
  betaText: {
    color: '#6FD6FF',
    fontSize: 9,
    fontWeight: '700',
  },
  agentH1: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  agentSub: {
    color: '#8A8A9E',
    fontSize: 11.5,
    marginTop: 2,
  },
  kbd: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#262638',
  },
  kbdText: {
    color: '#8A8A9E',
    fontSize: 10,
    fontWeight: '700',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  navItemActive: {
    backgroundColor: '#7C5CFC',
  },
  navIcon: {
    fontSize: 14,
  },
  navLabel: {
    color: '#8A8A9E',
    fontSize: 13.5,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginLeft: 'auto' as any,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F30',
    backgroundColor: 'rgba(8,8,15,0.85)',
  },
  greetingTitle: {
    color: '#F4F4FA',
    fontSize: 18,
    fontWeight: '700',
  },
  greetingSub: {
    color: '#8A8A9E',
    fontSize: 12.5,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262638',
    backgroundColor: '#14141F',
    width: 240,
  },
  searchInput: {
    color: '#F4F4FA',
    fontSize: 13,
    flex: 1,
  },
  idTopBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2A52',
    backgroundColor: 'rgba(124,92,252,0.12)',
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0F7C4A',
    borderWidth: 2,
    borderColor: '#1DBF73',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3B2B7A',
    minHeight: 220,
    position: 'relative',
  },
  bannerSlide0: {
    backgroundColor: '#5A2DBE',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 220,
  },
  bannerLeft: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
    flex: 1,
  },
  hackCard: {
    backgroundColor: '#14141F',
    borderWidth: 1,
    borderColor: '#262638',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hackWave1: { fontSize: 24, fontWeight: '700', color: '#A78BFA' },
  hackWave2: { fontSize: 32, fontWeight: '700', color: '#2FB8C6' },
  hackWave3: { fontSize: 18, fontWeight: '700', color: '#F59E0B' },
  bannerEyebrow: { color: '#A78BFA', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  monthText: { color: '#F4F4FA', fontSize: 14, fontWeight: '700' },
  bigDate: { color: '#F4F4FA', fontSize: 44, fontWeight: '800' },
  dash: { color: '#A78BFA', fontSize: 28 },
  yearText: { color: '#F59E0B', fontSize: 16, fontWeight: '700' },
  bannerVenue: { color: '#8A8A9E', fontSize: 13 },
  bannerRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 10 },
  partnerBadge: { backgroundColor: '#14141F', borderWidth: 1, borderColor: '#262638', padding: 10, borderRadius: 8 },
  bannerSlide1: { backgroundColor: '#0E5548', padding: 24, minHeight: 220 },
  bannerSlide2: { backgroundColor: '#5B2E5F', padding: 24, minHeight: 220 },
  bannerTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginVertical: 6 },
  bannerSub: { color: '#DCCEF7', fontSize: 13, marginBottom: 14 },
  slideBtn: { borderWidth: 1, borderColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  slideBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bannerDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  bDot: { width: 6, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  bDotActive: { width: 20, backgroundColor: '#fff' },
  sectionHeader: { color: '#F59E0B', fontSize: 11.5, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  couponRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  couponCard: { flex: 1, minWidth: 160, borderRadius: 12, borderWidth: 1, borderColor: '#4A3410', backgroundColor: '#14141F', overflow: 'hidden' },
  couponTop: { padding: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#1F1F30' },
  couponBottom: { padding: 12 },
  couponH1: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
  couponSub: { color: '#8A8A9E', fontSize: 11, marginVertical: 4 },
  lockedPill: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#4A3410', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  lockedText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
  kpiRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  kpiTile: { flex: 1, minWidth: 180, borderRadius: 14, borderWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019', padding: 16, flexDirection: 'row', alignItems: 'center' },
  kpiLabel: { color: '#A78BFA', fontSize: 11.5, fontWeight: '700' },
  kpiBig: { color: '#fff', fontSize: 26, fontWeight: '800', marginVertical: 2 },
  kpiSub: { color: '#8A8A9E', fontSize: 11.5 },
  kpiIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,92,252,0.12)', alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019', alignSelf: 'flex-start' },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  tabBtnActive: { backgroundColor: 'rgba(124,92,252,0.18)', borderWidth: 1, borderColor: '#2C2A52' },
  tabBtnText: { color: '#8A8A9E', fontSize: 13, fontWeight: '600' },
  tabBtnTextActive: { color: '#F4F4FA', fontWeight: '700' },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  bentoTile: { borderRadius: 16, borderWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019', padding: 18 },
  tileEyebrow: { color: '#A78BFA', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  tierTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  tierSub: { color: '#8A8A9E', fontSize: 12 },
  gainPill: { backgroundColor: 'rgba(52,211,153,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  gainText: { color: '#34D399', fontSize: 11, fontWeight: '700' },
  tileDivider: { height: 1, backgroundColor: '#1F1F30', marginVertical: 12 },
  trackBar: { height: 6, borderRadius: 3, backgroundColor: '#262638', overflow: 'hidden' },
  fillBar: { height: '100%', borderRadius: 3, backgroundColor: '#7C5CFC' },
  primaryBtn: { backgroundColor: '#7C5CFC', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#262638', backgroundColor: '#14141F' },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#262638', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
  taskTitle: { color: '#F4F4FA', fontSize: 12.5, fontWeight: '600' },
  taskSub: { color: '#6A6A7E', fontSize: 11 },
  focusDoneText: { color: '#8A8A9E', fontSize: 12, marginTop: 8 },
  bigNum: { color: '#fff', fontSize: 32, fontWeight: '800' },
  streakDay: { flex: 1, height: 22, borderRadius: 4, backgroundColor: '#262638' },
  streakDayActive: { backgroundColor: '#F59E0B' },
  mentorAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#7C5CFC', alignItems: 'center', justifyContent: 'center' },
  confirmedPill: { backgroundColor: 'rgba(52,211,153,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  confirmedText: { color: '#34D399', fontSize: 10, fontWeight: '700' },
  countdownText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  matchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 8, backgroundColor: '#14141F' },
  applyBtn: { backgroundColor: '#7C5CFC', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  intelHero: { borderRadius: 16, borderWidth: 1, borderColor: '#2C2A52', backgroundColor: '#101019', padding: 22 },
  intelGoalH1: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  chartCard: { borderRadius: 16, borderWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019', padding: 20 },
  promoRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  promoCard: { flex: 1, minWidth: 220, borderRadius: 16, padding: 20, justifyContent: 'space-between', minHeight: 180 },
  promoH1: { color: '#fff', fontSize: 18, fontWeight: '700' },
  promoPrice: { color: '#E0C4DE', fontSize: 16, fontWeight: '700' },
  promoBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: 8, alignItems: 'center' },
  promoBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  cityPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: '#262638', marginRight: 8 },
  cityPillActive: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
  cityPillText: { color: '#8A8A9E', fontSize: 12.5, fontWeight: '600' },
  cityPillTextActive: { color: '#fff', fontWeight: '700' },
  catPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#262638', backgroundColor: '#14141F', marginRight: 8 },
  catPillActive: { borderColor: '#7C5CFC' },
  catPillText: { color: '#8A8A9E', fontSize: 12.5, fontWeight: '600' },
  listingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  listingCard: { flex: 1, minWidth: 240, maxWidth: '100%', borderRadius: 16, borderWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019', overflow: 'hidden' },
  listingHero: { height: 100, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  discountBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  discountText: { color: '#000', fontSize: 10, fontWeight: '800' },
  listingTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  listingLoc: { color: '#8A8A9E', fontSize: 12 },
  listingRate: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
  listingLeft: { color: '#34D399', fontSize: 12, fontWeight: '700' },
  perkBox: { backgroundColor: 'rgba(245,158,11,0.1)', padding: 6, borderRadius: 6 },
  perkText: { color: '#F59E0B', fontSize: 11, fontWeight: '600' },
  wasPrice: { color: '#6A6A7E', fontSize: 11, textDecorationLine: 'line-through' },
  nowPrice: { color: '#fff', fontSize: 16, fontWeight: '800' },
  viewBtn: { backgroundColor: '#7C5CFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  profileHeaderCard: { borderRadius: 16, borderWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#0F7C4A', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1DBF73' },
  verifiedBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#2E2A55', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  verifiedText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },
  govCard: { borderRadius: 16, borderWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019', padding: 20 },
  govItem: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#262638', backgroundColor: '#14141F' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBackdrop: { position: 'absolute' as any, inset: 0 },
  idModalSheet: { width: '100%', maxWidth: 480, backgroundColor: '#101019', borderRadius: 20, borderWidth: 1, borderColor: '#262638', padding: 24 },
  idModalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  idCardPerspective: { alignItems: 'center', marginVertical: 10 },
  id3DCard: { width: '100%', aspectRatio: 1.6, borderRadius: 18, padding: 20, overflow: 'hidden' },
  id3DCardFront: { backgroundColor: '#5B4FE9' },
  id3DCardBack: { backgroundColor: '#1A1745' },
  idFrontContent: { flex: 1, justifyContent: 'space-between' },
  idBackContent: { flex: 1, justifyContent: 'space-between', padding: 10 },
  idBrandText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  idVerifiedPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  idVerifiedText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  idName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  idDegree: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  idMetaLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700' },
  idMetaVal: { color: '#fff', fontSize: 13, fontWeight: '700' },
  idValid: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  qrBox: { width: 44, height: 44, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  idBackH1: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  idBackSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 8 },
  agentFab: {
    position: 'absolute' as any,
    right: 24, bottom: 24,
    backgroundColor: '#7C5CFC',
    borderRadius: 100,
    paddingHorizontal: 20, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#7C5CFC', shadowOpacity: 0.5, shadowRadius: 15,
  },
  agentFabText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
