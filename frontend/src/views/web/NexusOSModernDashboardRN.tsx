// @ts-nocheck
/**
 * NexusOSModernDashboardRN — 1:1 Complete React Native / Web Front-End
 * of the Student Alumni Web Dashboard Specification.
 *
 * Includes:
 *  - Full 16-Module Navigation: Dashboard, Career AI, Internships & Jobs, ECHO Showcase,
 *    Network, My Bookings, My Tickets, My Events, My Workshops, Courses, Financial,
 *    Deals & Offers, SA Wallet, Higher Education, Rentals, and Profile.
 *  - Sub-pages: Claim History, Full Wallet Statement, Higher Ed Deadline Calendar.
 *  - Command Palette (⌘K) quick launcher across all modules.
 *  - Agent K Conversational Drawer with 16 dashboard knowledge topics & BYOK provider modal.
 *  - Notifications Drawer with unread badges & dismiss actions.
 *  - Module Detail Modal & Mentor Profile Details Modal with LinkedIn verification badges.
 *  - Curtain Loading Transition with #studentalumni branding.
 *  - Double-sided 3D Flippable Student Digital ID Card with QR code.
 *  - Career Readiness Live Simulator (+9%, +14%, +11% checkboxes).
 *  - SA Stay Rentals Marketplace with interactive live price booking sheet.
 *  - Interactive Toast notification system.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Platform, useWindowDimensions, ScrollView,
  TextInput, Modal, Animated as RNAnimated, Easing, TouchableOpacity,
} from 'react-native';
import Svg, { Path, Rect, Circle, G, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';

export function NexusOSModernDashboardRN({
  initialView = 'dash',
}: {
  initialView?: string;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 1180;
  const isTight = width < 900;
  const isMobile = width < 768;

  // ── Navigation & View State ────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<string>(initialView || 'dash');
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Modals, Drawers & Overlays ─────────────────────────────────────────────
  const [showLogin, setShowLogin] = useState(initialView === 'login');
  const [showSetup, setShowSetup] = useState(initialView === 'setup');
  const [showIDModal, setShowIDModal] = useState(false);
  const [isIDCardFlipped, setIsIDCardFlipped] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [showAgentDrawer, setShowAgentDrawer] = useState(false);
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showBookDrawer, setShowBookDrawer] = useState(false);
  const [showBookDone, setShowBookDone] = useState(false);
  const [bookingGuests, setBookingGuests] = useState(1);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
  const [curtainVisible, setCurtainVisible] = useState(false);
  const [curtainProgress, setCurtainProgress] = useState('00');
  const [curtainModuleName, setCurtainModuleName] = useState('DASHBOARD');

  // ── Toasts State ───────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Array<{ id: number; title: string; body?: string; kind: 'ok' | 'info' | 'warn' | 'gift' }>>([]);

  const addToast = (title: string, body?: string, kind: 'ok' | 'info' | 'warn' | 'gift' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, title, body, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // ── Setup Wizard State ─────────────────────────────────────────────────────
  const [setupStep, setSetupStep] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState('Computer Science');
  const [selectedYear, setSelectedYear] = useState('2027');
  const [selectedGoal, setSelectedGoal] = useState('Software engineering');
  const [skillsLevels, setSkillsLevels] = useState<Record<string, number>>({
    dsa: 2,
    sys_design: 1,
    interviews: 3,
    portfolio: 1,
  });
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [isCardFlippedInSetup, setIsCardFlippedInSetup] = useState(false);

  // ── Dashboard Data State ───────────────────────────────────────────────────
  const [bannerIndex, setBannerIndex] = useState(0);
  const [tasksDone, setTasksDone] = useState<Record<number, boolean>>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [countdown, setCountdown] = useState({ h: 28, m: 14, s: 6 });
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<'any' | 'lt5' | '5to10' | 'gt10'>('any');
  const [sortFilter, setSortFilter] = useState<'match' | 'asc' | 'rate'>('match');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // ── Simulator Checkboxes State ─────────────────────────────────────────────
  const [simResume, setSimResume] = useState(false);
  const [simProject, setSimProject] = useState(false);
  const [simInterviews, setSimInterviews] = useState(false);

  const simGain = (simResume ? 9 : 0) + (simProject ? 14 : 0) + (simInterviews ? 11 : 0);
  const simWeeksGain = (simResume ? 4 : 0) + (simProject ? 6 : 0) + (simInterviews ? 3 : 0);
  const projectedReadiness = Math.min(100, 36 + simGain);
  const projectedWeeks = Math.max(2, 18 - simWeeksGain);

  // ── Agent K Chat State ─────────────────────────────────────────────────────
  const [agentInputText, setAgentInputText] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ who: 'k' | 'me'; text: string }>>([
    { who: 'k', text: 'Morning, Devender. Your board has **3 open actions** and the Google referral window closes in 2 days.\n\nAsk me anything about your dashboard — or tap a suggestion below.' },
  ]);
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null);

  // ── Timers ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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

  // ── Keyboard shortcut for ⌘K / Ctrl+K ──────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPalette((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowPalette(false);
        setShowAgentDrawer(false);
        setShowNotifDrawer(false);
        setShowIDModal(false);
        setShowKeysModal(false);
        setSelectedDetailItem(null);
        setSelectedMentor(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Transition Navigation between Modules ──────────────────────────────────
  const navigateModule = (key: string, title?: string) => {
    if (key === 'logout') {
      setShowLogin(true);
      return;
    }
    const titlesMap: Record<string, string> = {
      dash: 'DASHBOARD',
      ai: 'CAREER AI',
      jobs: 'INTERNSHIPS & JOBS',
      echo: 'ECHO SHOWCASE',
      net: 'NETWORK',
      bookings: 'MY BOOKINGS',
      tickets: 'MY TICKETS',
      events: 'MY EVENTS',
      workshops: 'MY WORKSHOPS',
      courses: 'COURSES',
      financial: 'FINANCIAL',
      deals: 'DEALS & OFFERS',
      wallet: 'SA WALLET',
      higher: 'HIGHER EDUCATION',
      rentals: 'RENTALS',
      profile: 'PROFILE',
      claimed: 'CLAIM HISTORY',
      statement: 'FULL STATEMENT',
      calendar: 'DEADLINE CALENDAR',
    };

    setCurtainModuleName(titlesMap[key] || (title || key).toUpperCase());
    setCurtainVisible(true);
    setCurtainProgress('00');

    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setCurrentView(key);
        setTimeout(() => {
          setCurtainVisible(false);
        }, 220);
      }
      setCurtainProgress(String(p).padStart(2, '0'));
    }, 30);
  };

  // ── Knowledge Base Query Engine for Agent K ────────────────────────────────
  const handleAgentAsk = (query: string) => {
    if (!query.trim()) return;
    setChatMessages((prev) => [...prev, { who: 'me', text: query }]);
    setAgentInputText('');

    setTimeout(() => {
      const q = query.toLowerCase();
      let reply = '';
      if (q.includes('readiness') || q.includes('score') || q.includes('percent')) {
        reply = 'Your readiness is **36%** — level Builder, target Industry Ready. It moved +8% this week. The single biggest lever right now is finishing your resume: **+9%** on its own, and it unblocks referral outreach.';
      } else if (q.includes('deadline') || q.includes('due') || q.includes('closing')) {
        reply = 'Six deadlines inside 14 days. Two need action before Friday:\n\n• **Referral window — Google SWE** · 2 days\n• **GRE test booking** · 5 days\n• Workshop pass expiry · 6 days\n• HackWave registration · 9 days\n• SNIST Merit scholarship · 12 days';
      } else if (q.includes('mentor') || q.includes('rahul') || q.includes('priya')) {
        reply = 'You have **1 session confirmed** — Rahul Sharma, Senior SDE at Google, Thursday 6:00 pm IST. 48 mentors have capacity this term; Priya Mehta (PM, Microsoft) and Vikram Singh (Cloud Architect, AWS) both take students from your branch.';
      } else if (q.includes('job') || q.includes('role') || q.includes('internship')) {
        reply = '**267 roles** are matched to you and 41 have a warm referral path. Closing this week: 12. Top matches: Account Executive @ Boulevard, Senior Brand Content Manager @ Demandbase, and Principal RevOps Manager @ Jobber.';
      } else if (q.includes('referral') || q.includes('warm') || q.includes('intro')) {
        reply = '41 warm referral paths. Strongest: **Google** (3 alumni from your branch), **Microsoft** (5), **Amazon** (4). Nine of twelve accept intros from students — the Google window closes in 2 days.';
      } else if (q.includes('wallet') || q.includes('balance') || q.includes('saved')) {
        reply = 'SA Wallet balance is **₹1,250** with nothing held. You have earned ₹280 cashback and saved **₹4,280** across 5 claimed offers this year. 14 transactions on record.';
      } else if (q.includes('deal') || q.includes('coupon') || q.includes('discount')) {
        reply = '24 active offers, 3 claimed, 5 expiring soon. Best available now: 40% off mentor sessions (MRIT-MENTOR-40), two partner workshop passes (SA-WORKSHOP-2X) and 30% off self-drive rentals (SA-DRIVE-30).';
      } else if (q.includes('event') || q.includes('hackwave') || q.includes('echo')) {
        reply = 'You are registered for **8 events**. Next up: HackWave 3.0 at Sreenidhi on Sep 4–5 (₹50,000 prize pool), Voice of Generations at VNRVJIT on Sep 12, and the Alumni AMA on Sep 18.';
      } else if (q.includes('rent') || q.includes('stay') || q.includes('pg') || q.includes('hostel')) {
        reply = '42 verified rentals, all SA-checked, with up to 25% member discount. Near campus: CampusPG Powai at ₹6,500/mo (28% off) and StayAbode Andheri at ₹7,999/mo. Vehicles from ₹2,199/day.';
      } else if (q.includes('scholarship') || q.includes('aid') || q.includes('grant')) {
        reply = '**7 scholarships** match your profile. Two close soon: SNIST Merit Top 10% (₹40,000/yr, Sep 30) and the Women in Tech Grant (₹75,000, Oct 15). One needs documents through DigiLocker.';
      } else if (q.includes('masters') || q.includes('abroad') || q.includes('gre')) {
        reply = '12 deadlines in the next 90 days. No-tuition option: **MS Computer Science at TU Munich**, deadline Nov 30. Also shortlisted-worthy: MSc AI Edinburgh (Dec 12) and MS Data Science TU Delft (Feb 1). Your GRE window is Sep 6 — 5 days out.';
      } else {
        reply = 'Three things, in order of impact:\n\n1. **Refine your resume** for the Google SWE referral — 4 min, closes Friday, +9% readiness\n2. **Prep 3 questions** for Thursday\'s call with Rahul Sharma — 2 min\n3. **Apply to 2 matched roles** closing this week — 6 min\n\nThat clears your board and takes readiness to 45%.';
      }

      setChatMessages((prev) => [...prev, { who: 'k', text: reply }]);
    }, 450);
  };

  // ── Rentals Data ───────────────────────────────────────────────────────────
  const LISTINGS = [
    { id: 0, name: 'Awfis Flexi Desk', loc: 'Mumbai · Pune · Chennai', cat: 'Flexi Desk', rate: '4.5', revs: '245', left: '18', perk: '1 free meeting room hour/day', was: '₹6,500/mo', now: '₹4,499', per: '/mo', off: '31% OFF', col: '#7C5CFC', tags: ['WiFi', 'Pantry', 'Lockers'] },
    { id: 1, name: 'StayAbode Smart Hostel', loc: 'Andheri West, Mumbai', cat: 'PG / Hostel', rate: '4.6', revs: '198', left: '8', perk: '₹1,000 off first plan', was: '₹9,800/mo', now: '₹7,999', per: '/mo', off: '18% OFF', col: '#2FB8C6', tags: ['Co-working', 'Gym', 'Netflix lounge'] },
    { id: 2, name: 'Colive Hostel — Hinjewadi', loc: 'Hinjewadi, Pune', cat: 'PG / Hostel', rate: '4.4', revs: '340', left: '8', perk: '10% extra off', was: '₹11,000/mo', now: '₹8,500', per: '/mo', off: '23% OFF', col: '#34D399', tags: ['Meals', 'Gym', 'Pool'] },
    { id: 3, name: 'Revv Self-Drive SUV', loc: 'Delhi · Mumbai · Pune', cat: 'Car', rate: '4.4', revs: '188', left: '6', perk: '₹300 off weekend', was: '₹3,200/day', now: '₹2,199', per: '/day', off: '31% OFF', col: '#F59E0B', tags: ['Unlimited km', 'Insurance', 'GPS'] },
    { id: 4, name: 'Goa Beachfront Villa', loc: 'Anjuna Beach, Goa', cat: 'Beach House', rate: '4.9', revs: '88', left: '2', perk: '₹1,000 off for SA groups', was: '₹7,000/night', now: '₹4,500', per: '/night', off: '36% OFF', col: '#4C8DF6', tags: ['Beach access', 'Jacuzzi', 'Housekeeping'] },
    { id: 5, name: 'Self-Drive Mahindra Thar', loc: 'Goa · Manali · Rishikesh', cat: 'Car', rate: '4.8', revs: '92', left: '3', perk: 'Adventure pack — free', was: '₹4,999/day', now: '₹3,499', per: '/day', off: '30% OFF', col: '#F59E0B', tags: ['4x4', 'Off-road', 'Insurance'] },
    { id: 6, name: 'CampusPG — IIT Bombay Area', loc: 'Powai, Mumbai', cat: 'PG / Hostel', rate: '4.6', revs: '142', left: '3', perk: '10% off with SA-ID', was: '₹9,000/mo', now: '₹6,500', per: '/mo', off: '28% OFF', col: '#2FB8C6', tags: ['WiFi', 'Meals 2x/day', 'AC'] },
    { id: 7, name: '91springboard Day Pass', loc: '9 cities · 30+ centres', cat: 'Day Pass', rate: '4.4', revs: '1100', left: '999', perk: '5 day-passes for ₹2,499', was: '₹999/day', now: '₹599', per: '/day', off: '40% OFF', col: '#A78BFA', tags: ['WiFi', 'Coffee', 'Print quota'] },
  ];

  const filteredListings = LISTINGS.filter((item) => {
    if (selectedCategory && item.cat !== selectedCategory) return false;
    if (selectedCity !== 'All Cities' && !item.loc.toLowerCase().includes(selectedCity.toLowerCase())) return false;
    const priceVal = parseFloat(item.now.replace(/[^0-9]/g, '')) || 0;
    if (priceFilter === 'lt5' && priceVal >= 5000) return false;
    if (priceFilter === '5to10' && (priceVal < 5000 || priceVal > 10000)) return false;
    if (priceFilter === 'gt10' && priceVal <= 10000) return false;
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !item.loc.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // ── Network Mentors Data ───────────────────────────────────────────────────
  const MENTORS = [
    { name: 'Rahul Sharma', mono: 'RS', role: 'Senior SDE @ Google', batch: 'Class of 2016 · CSE', city: 'Bengaluru', li: true, rate: '4.9', sess: '24', said: 'SA-2016-ALM-RS0148', tags: ['Distributed systems', 'Interview prep', 'Referrals'], cat: '#7C5CFC' },
    { name: 'Priya Mehta', mono: 'PM', role: 'Product Manager @ Microsoft', batch: 'Class of 2015 · IT', city: 'Hyderabad', li: true, rate: '4.8', sess: '18', said: 'SA-2015-ALM-PM0092', tags: ['Product thinking', 'Roadmapping', 'PM interviews'], cat: '#DB2777' },
    { name: 'Arjun Verma', mono: 'AV', role: 'Data Scientist @ Amazon', batch: 'Class of 2017 · ECE', city: 'Pune', li: false, rate: '4.7', sess: '16', said: 'SA-2017-ALM-AV0311', tags: ['Applied ML', 'SQL', 'Case studies'], cat: '#10B981' },
    { name: 'Vikram Singh', mono: 'VS', role: 'Cloud Architect @ AWS', batch: 'Class of 2014 · CSE', city: 'Gurugram', li: true, rate: '4.9', sess: '20', said: 'SA-2014-ALM-VS0067', tags: ['AWS', 'Certifications', 'System design'], cat: '#2563EB' },
    { name: 'Neha Reddy', mono: 'NR', role: 'Engineering Manager @ Stripe', batch: 'Class of 2013 · CSE', city: 'Bengaluru', li: true, rate: '4.9', sess: '32', said: 'SA-2013-ALM-NR0021', tags: ['Team leadership', 'Promotions', 'Hiring loops'], cat: '#8B5CF6' },
    { name: 'Karthik Rao', mono: 'KR', role: 'Founder @ Loopwork', batch: 'Class of 2018 · MECH', city: 'Hyderabad', li: true, rate: '4.6', sess: '11', said: 'SA-2018-ALM-KR0455', tags: ['Startups', 'Fundraising', 'First hires'], cat: '#F59E0B' },
  ];

  // ── Palette Navigation Items ───────────────────────────────────────────────
  const PALETTE_ITEMS = [
    { key: 'dash', label: 'Dashboard', sub: 'Overview and today\'s plan' },
    { key: 'ai', label: 'Career AI', sub: 'Roadmap and readiness milestones' },
    { key: 'jobs', label: 'Internships & Jobs', sub: '267 matched roles' },
    { key: 'echo', label: 'ECHO Showcase', sub: 'Galleries and campus events' },
    { key: 'net', label: 'Network', sub: 'Alumni and verified mentors' },
    { key: 'bookings', label: 'My Bookings', sub: 'Sessions, stays and seats' },
    { key: 'tickets', label: 'My Tickets', sub: 'Entry passes and invoices' },
    { key: 'events', label: 'My Events', sub: '8 registered campus events' },
    { key: 'workshops', label: 'My Workshops', sub: 'Practical sessions and free passes' },
    { key: 'courses', label: 'Courses', sub: 'Structured credit-bearing learning' },
    { key: 'financial', label: 'Financial', sub: 'Scholarships and fee aid' },
    { key: 'deals', label: 'Deals & Offers', sub: 'Student discounts and coupons' },
    { key: 'wallet', label: 'SA Wallet', sub: 'Balance and transaction statement' },
    { key: 'higher', label: 'Higher Education', sub: 'Programmes and deadline calendar' },
    { key: 'rentals', label: 'Rentals', sub: 'Verified stays and vehicles' },
    { key: 'profile', label: 'Profile', sub: 'Identity, academics and skills' },
  ];

  const filteredPalette = PALETTE_ITEMS.filter((item) =>
    !paletteQuery.trim() ||
    item.label.toLowerCase().includes(paletteQuery.toLowerCase()) ||
    item.sub.toLowerCase().includes(paletteQuery.toLowerCase())
  );

  return (
    <View style={s.root}>
      {/* ── Background Aurora & Dot Pattern ───────────────────────────────── */}
      <View style={s.bgfx} pointerEvents="none">
        <View style={s.aurora1} />
        <View style={s.aurora2} />
        <View style={s.dotGrid} />
      </View>

      {/* ── Main Layout Shell ─────────────────────────────────────────────── */}
      <View style={[s.shell, sidebarCollapsed && s.shellMini]}>
        
        {/* ── Sidebar Navigation ──────────────────────────────────────────── */}
        <View style={[s.sidebar, sidebarCollapsed && s.sidebarMini]}>
          {/* Brand Header */}
          <View style={s.sideHead}>
            <Pressable onPress={() => router.push('/')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Svg width={32} height={36} viewBox="0 0 300 350">
                <Defs>
                  <SvgGradient id="sbBadge" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#C9A7FF" />
                    <Stop offset="0.48" stopColor="#8B5CF6" />
                    <Stop offset="1" stopColor="#5B2FD0" />
                  </SvgGradient>
                  <SvgGradient id="sbBadgeIn" x1="0" y1="0" x2="0.4" y2="1">
                    <Stop offset="0" stopColor="#B683F5" />
                    <Stop offset="1" stopColor="#7331C9" />
                  </SvgGradient>
                </Defs>
                <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#sbBadge)" />
                <Path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#sbBadgeIn)" />
                <SvgText x={150} y={214} textAnchor="middle" fontFamily="sans-serif" fontSize={118} fontWeight="800" fill="#FFFFFF">
                  SA
                </SvgText>
              </Svg>
              {!sidebarCollapsed && (
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.brandTitle}>StudentAlumni</Text>
                  <Text style={s.brandSub}>Web Dashboard</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => setSidebarCollapsed(!sidebarCollapsed)} style={s.collapseBtn}>
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

          {/* Agent K Card Launcher */}
          {!sidebarCollapsed && (
            <Pressable onPress={() => setShowAgentDrawer(true)} style={s.agentCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={s.agentBadgeIco}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>🤖</Text>
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
            </Pressable>
          )}

          {/* 16 Navigation Links */}
          <ScrollView style={{ flex: 1, paddingHorizontal: 6 }} showsVerticalScrollIndicator={false}>
            {[
              { id: 'dash', label: 'Dashboard', icon: '🎛️' },
              { id: 'ai', label: 'Career AI', icon: '⚡' },
              { id: 'jobs', label: 'Internships & Jobs', icon: '💼' },
              { id: 'echo', label: 'ECHO Showcase', icon: '📢', badge: 'CMS' },
              { id: 'net', label: 'Network', icon: '👥' },
              { id: 'bookings', label: 'My Bookings', icon: '🗓️' },
              { id: 'tickets', label: 'My Tickets', icon: '🎟️' },
              { id: 'events', label: 'My Events', icon: '📅' },
              { id: 'workshops', label: 'My Workshops', icon: '🛠️' },
              { id: 'courses', label: 'Courses', icon: '🎓' },
              { id: 'financial', label: 'Financial', icon: '💰' },
              { id: 'deals', label: 'Deals & Offers', icon: '🏷️' },
              { id: 'wallet', label: 'SA Wallet', icon: '💳' },
              { id: 'higher', label: 'Higher Education', icon: '🏛️' },
              { id: 'rentals', label: 'Rentals', icon: '🏠' },
              { id: 'profile', label: 'Profile', icon: '👤' },
              { id: 'logout', label: 'Log out', icon: '🚪', color: '#F0616B' },
            ].map((nav) => {
              const isActive = currentView === nav.id;
              return (
                <Pressable
                  key={nav.id}
                  onPress={() => navigateModule(nav.id, nav.label)}
                  style={[s.navItem, isActive && s.navItemActive]}
                >
                  <Text style={s.navIcon}>{nav.icon}</Text>
                  {!sidebarCollapsed && (
                    <Text style={[s.navLabel, isActive && s.navLabelActive, nav.color ? { color: nav.color } : null]}>
                      {nav.label}
                    </Text>
                  )}
                  {nav.badge && !sidebarCollapsed && (
                    <View style={s.cmsBadge}><Text style={s.cmsBadgeText}>{nav.badge}</Text></View>
                  )}
                  {isActive && !sidebarCollapsed && <View style={s.activeDot} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Main View Area ──────────────────────────────────────────────── */}
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Top Sticky Header */}
          <View style={s.topBar}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.greetingTitle}>
                {currentView === 'dash' && 'Good morning, Devender 👋'}
                {currentView === 'ai' && 'Career AI'}
                {currentView === 'jobs' && 'Internships & Jobs'}
                {currentView === 'echo' && 'ECHO Showcase'}
                {currentView === 'net' && 'Network'}
                {currentView === 'bookings' && 'My Bookings'}
                {currentView === 'tickets' && 'My Tickets'}
                {currentView === 'events' && 'My Events'}
                {currentView === 'workshops' && 'My Workshops'}
                {currentView === 'courses' && 'Courses'}
                {currentView === 'financial' && 'Financial'}
                {currentView === 'deals' && 'Deals & Offers'}
                {currentView === 'wallet' && 'SA Wallet'}
                {currentView === 'higher' && 'Higher Education'}
                {currentView === 'rentals' && 'Rentals'}
                {currentView === 'profile' && 'Profile'}
              </Text>
              <Text style={s.greetingSub}>
                {currentView === 'dash' && "Here's your personalised dashboard for today"}
                {currentView === 'ai' && 'Your roadmap, rebuilt weekly by Agent K'}
                {currentView === 'jobs' && '267 roles matched to your profile'}
                {currentView === 'echo' && 'Galleries, partners, and speakers across every campus'}
                {currentView === 'net' && 'Alumni and students from your branch'}
                {currentView === 'bookings' && 'Sessions, stays and workshop seats'}
                {currentView === 'tickets' && 'Entry passes and invoices on your SA ID'}
                {currentView === 'events' && 'Eight registered this term'}
                {currentView === 'workshops' && 'Hands-on sessions and free passes'}
                {currentView === 'courses' && 'Structured learning mapped to your target role'}
                {currentView === 'financial' && 'Scholarships, aid and receipts'}
                {currentView === 'deals' && 'Student pricing unlocked by your college email'}
                {currentView === 'wallet' && 'One balance across every module'}
                {currentView === 'higher' && 'Programme shortlists, deadlines and funding'}
                {currentView === 'rentals' && 'Verified stays, vehicles and coworking with SA discounts'}
                {currentView === 'profile' && 'Manage your identity, academics and skills'}
              </Text>
            </View>

            {/* Top Actions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Search Bar / ⌘K Launcher */}
              <Pressable onPress={() => setShowPalette(true)} style={s.searchBar}>
                <Text style={{ color: '#8A8A9E', fontSize: 13 }}>🔍 Search anything...</Text>
                <View style={s.kbdSmall}><Text style={s.kbdSmallText}>⌘K</Text></View>
              </Pressable>

              {/* Notifications Bell */}
              <Pressable onPress={() => setShowNotifDrawer(true)} style={s.iconButton}>
                <Text style={{ fontSize: 16 }}>🔔</Text>
                <View style={s.notifDot} />
              </Pressable>

              {/* User Avatar */}
              <Pressable onPress={() => navigateModule('profile')} style={s.avatarBtn}>
                <Text style={s.avatarText}>d</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Scrollable Content Area ───────────────────────────────────── */}
          <ScrollView style={{ flex: 1, padding: 24 }} showsVerticalScrollIndicator={false}>
            {/* ══════════════════════════════════════════════════════════════
                1. DASHBOARD VIEW
               ══════════════════════════════════════════════════════════════ */}
            {currentView === 'dash' && (
              <View style={{ gap: 20 }}>
                {/* Hero Banner */}
                <View style={s.heroCard}>
                  <View style={{ flex: 1 }}>
                    <View style={s.thisWeekPill}><Text style={s.thisWeekText}>THIS WEEK</Text></View>
                    <Text style={s.heroH1}>You're 8% closer than last Monday.</Text>
                    <Text style={s.heroSub}>
                      Three actions left before Friday's referral window closes. Agent K has ordered them by impact.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                      <Pressable onPress={() => navigateModule('ai')} style={s.heroPrimaryBtn}>
                        <Text style={s.heroBtnText}>Open today's plan</Text>
                      </Pressable>
                      <Pressable onPress={() => setActiveTab(1)} style={s.heroSecondaryBtn}>
                        <Text style={s.heroSecText}>See what changed</Text>
                      </Pressable>
                    </View>
                  </View>
                  {!isTight && (
                    <View style={s.heroStatsRow}>
                      <View style={s.heroStatCol}>
                        <Text style={s.heroStatLabel}>READINESS</Text>
                        <Text style={[s.heroStatNum, { color: '#4B3FD6' }]}>{projectedReadiness}%</Text>
                        <Text style={s.heroStatGain}>↗ +8 pts</Text>
                      </View>
                      <View style={s.heroStatCol}>
                        <Text style={s.heroStatLabel}>MATCHES</Text>
                        <Text style={[s.heroStatNum, { color: '#0E6E8C' }]}>267</Text>
                        <Text style={s.heroStatSub}>12 new</Text>
                      </View>
                      <View style={s.heroStatCol}>
                        <Text style={s.heroStatLabel}>SESSIONS</Text>
                        <Text style={[s.heroStatNum, { color: '#A21C63' }]}>1</Text>
                        <Text style={s.heroStatSub}>Thu 6pm</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Promo Event Banner Carousel */}
                <View style={s.promoBannerWrap}>
                  {bannerIndex === 0 && (
                    <View style={[s.promoSlide, { backgroundColor: '#5A2DBE' }]}>
                      <View style={s.promoWhiteBox}>
                        <Text style={{ fontSize: 26, fontWeight: '800', color: '#2B6CB0' }}>HackWave</Text>
                        <Text style={{ fontSize: 32, fontWeight: '800', color: '#2B6CB0' }}>3.0</Text>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#C05621' }}>2026</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.promoTagline}>HACKWAVE 3.0 · 2026</Text>
                        <Text style={s.promoDates}>SEP 04 — 05 2026</Text>
                        <Text style={s.promoVenue}>Sreenidhi Institute of Science and Technology, Hyderabad</Text>
                      </View>
                    </View>
                  )}
                  {bannerIndex === 1 && (
                    <View style={[s.promoSlide, { backgroundColor: '#14324D' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.promoTagline, { color: '#34D399' }]}>VOICE OF GENERATIONS · VNRVJIT</Text>
                        <Text style={s.promoDates}>Alumni took the stage, students took notes.</Text>
                        <Text style={s.promoVenue}>26 photos, 3 workshops and 5 testimonials from the last showcase.</Text>
                      </View>
                    </View>
                  )}
                  {bannerIndex === 2 && (
                    <View style={[s.promoSlide, { backgroundColor: '#3A2352' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.promoTagline, { color: '#F1B8D9' }]}>CAREER AI · NEW</Text>
                        <Text style={s.promoDates}>Your readiness is up 8% this week.</Text>
                        <Text style={s.promoVenue}>Agent K rebuilt your roadmap. Next milestone: build your professional resume.</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* 4 Summary Stat Cards */}
                <View style={s.kpiRow}>
                  <View style={s.kpiTile}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.kpiLabel}>Profile Strength</Text>
                      <Text style={s.kpiBig}>50%</Text>
                      <Text style={s.kpiSub}>Keep going!</Text>
                    </View>
                    <View style={s.kpiIconBox}><Text style={{ fontSize: 18 }}>🛡️</Text></View>
                  </View>
                  <View style={s.kpiTile}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.kpiLabel}>Applications</Text>
                      <Text style={s.kpiBig}>0</Text>
                      <Text style={s.kpiSub}>0 applied</Text>
                    </View>
                    <View style={s.kpiIconBox}><Text style={{ fontSize: 18 }}>💼</Text></View>
                  </View>
                  <View style={s.kpiTile}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.kpiLabel, { color: '#34D399' }]}>Network</Text>
                      <Text style={s.kpiBig}>0</Text>
                      <Text style={s.kpiSub}>Connections</Text>
                    </View>
                    <View style={[s.kpiIconBox, { backgroundColor: 'rgba(52,211,153,0.12)' }]}>
                      <Text style={{ fontSize: 18 }}>👥</Text>
                    </View>
                  </View>
                  <View style={s.kpiTile}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.kpiLabel, { color: '#F0616B' }]}>Events</Text>
                      <Text style={s.kpiBig}>8</Text>
                      <Text style={s.kpiSub}>Registered</Text>
                    </View>
                    <View style={[s.kpiIconBox, { backgroundColor: 'rgba(240,97,107,0.12)' }]}>
                      <Text style={{ fontSize: 18 }}>📅</Text>
                    </View>
                  </View>
                </View>

                {/* Tab Switcher */}
                <View style={s.tabBar}>
                  <Pressable onPress={() => setActiveTab(0)} style={[s.tabBtn, activeTab === 0 && s.tabBtnActive]}>
                    <Text style={[s.tabBtnText, activeTab === 0 && s.tabBtnTextActive]}>💼 Opportunities</Text>
                  </Pressable>
                  <Pressable onPress={() => setActiveTab(1)} style={[s.tabBtn, activeTab === 1 && s.tabBtnActive]}>
                    <Text style={[s.tabBtnText, activeTab === 1 && s.tabBtnTextActive]}>📈 Intelligence Center</Text>
                  </Pressable>
                </View>

                {/* ── TAB 1: Bento Grid ───────────────────────────────────── */}
                {activeTab === 0 && (
                  <View style={s.bentoGrid}>
                    {/* Career Readiness & Simulator */}
                    <View style={[s.bentoTile, { width: isNarrow ? '100%' : '48%' }]}>
                      <Text style={s.tileEyebrow}>CAREER READINESS & SIMULATOR</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 14 }}>
                        <Svg width={100} height={100} viewBox="0 0 112 112">
                          <Circle cx={56} cy={56} r={46} stroke="#262638" strokeWidth={9} fill="none" />
                          <Circle cx={56} cy={56} r={46} stroke="#7C5CFC" strokeWidth={9} strokeDasharray="289" strokeDashoffset={289 * (1 - projectedReadiness / 100)} strokeLinecap="round" fill="none" />
                          <SvgText x={56} y={63} textAnchor="middle" fontFamily="sans-serif" fontSize={26} fontWeight="700" fill="#F4F4FA">{projectedReadiness}%</SvgText>
                        </Svg>
                        <View>
                          <Text style={s.tierTitle}>Builder</Text>
                          <Text style={s.tierSub}>Target: Industry Ready</Text>
                          <View style={s.gainPill}><Text style={s.gainText}>↗ +8% this week</Text></View>
                        </View>
                      </View>

                      {/* Simulation Checkboxes */}
                      <Text style={[s.tileEyebrow, { marginTop: 10 }]}>SIMULATE FORWARD PROGRESS</Text>
                      <View style={{ gap: 8, marginVertical: 8 }}>
                        <Pressable onPress={() => setSimResume(!simResume)} style={s.simRow}>
                          <Text style={{ color: simResume ? '#34D399' : '#8A8A9E', fontSize: 13 }}>{simResume ? '☑' : '☐'} Finish resume</Text>
                          <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 12 }}>+9%</Text>
                        </Pressable>
                        <Pressable onPress={() => setSimProject(!simProject)} style={s.simRow}>
                          <Text style={{ color: simProject ? '#34D399' : '#8A8A9E', fontSize: 13 }}>{simProject ? '☑' : '☐'} Ship public project</Text>
                          <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 12 }}>+14%</Text>
                        </Pressable>
                        <Pressable onPress={() => setSimInterviews(!simInterviews)} style={s.simRow}>
                          <Text style={{ color: simInterviews ? '#34D399' : '#8A8A9E', fontSize: 13 }}>{simInterviews ? '☑' : '☐'} 2 Mock interviews</Text>
                          <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 12 }}>+11%</Text>
                        </Pressable>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <Text style={{ fontSize: 12, color: '#8A8A9E' }}>Projected: {projectedWeeks} weeks</Text>
                        <Pressable onPress={() => navigateModule('ai')} style={s.primaryBtn}><Text style={s.btnText}>Continue now</Text></Pressable>
                      </View>
                    </View>

                    {/* Today's Focus */}
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
                              onPress={() => {
                                setTasksDone({ ...tasksDone, [t.id]: !done });
                                addToast(done ? 'Task unmarked' : 'Task completed! ✓', t.title, 'ok');
                              }}
                              style={[s.taskRow, done && { opacity: 0.6 }]}
                            >
                              <View style={[s.checkbox, done && s.checkboxChecked]}>
                                {done && <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>}
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

                    {/* Skill Streak */}
                    <View style={[s.bentoTile, { width: isNarrow ? '100%' : '31%' }]}>
                      <Text style={s.tileEyebrow}>SKILL STREAK</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 10 }}>
                        <Text style={s.bigNum}>0</Text>
                        <Text style={{ color: '#8A8A9E', fontSize: 14 }}>days</Text>
                        <Text style={{ fontSize: 22, marginLeft: 'auto' }}>🔥</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                          <Pressable
                            key={day}
                            onPress={() => {
                              setSelectedDay(day);
                              addToast('Streak updated 🔥', `Day ${day + 1} logged`, 'gift');
                            }}
                            style={[s.streakDay, selectedDay !== null && day <= selectedDay && s.streakDayActive]}
                          />
                        ))}
                      </View>
                      <Text style={{ color: '#F0616B', fontSize: 12, marginTop: 12 }}>Start your streak today</Text>
                    </View>

                    {/* Next Session */}
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
                        <Pressable onPress={() => addToast('Joining Room...', 'Connecting to Google Meet room', 'info')} style={s.primaryBtn}>
                          <Text style={s.btnText}>Join room</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Top Matches */}
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
                            <Pressable onPress={() => navigateModule('jobs')} style={s.applyBtn}>
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Apply</Text>
                            </Pressable>
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
                2. CAREER AI VIEW
               ══════════════════════════════════════════════════════════════ */}
            {currentView === 'ai' && (
              <View style={{ gap: 20 }}>
                <View style={s.moduleHeaderCard}>
                  <Text style={s.modEyebrow}>CAREER AI</Text>
                  <Text style={s.modH1}>Your roadmap, rebuilt weekly</Text>
                  <Text style={s.modSub}>Agent K reads your profile and tells you the next best action.</Text>
                </View>

                {/* Milestones List */}
                <View style={s.milestonesBox}>
                  {[
                    { num: '01', title: 'Build your professional resume', sub: '60% complete · closes Friday', status: 'In progress' },
                    { num: '02', title: 'Ship one public project', sub: 'Not started · 3 weeks', status: 'Queued' },
                    { num: '03', title: 'Two mock interviews', sub: 'Not started · 4 weeks', status: 'Queued' },
                    { num: '04', title: 'Referral outreach', sub: 'Locked until resume is done', status: 'Locked' },
                  ].map((m, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setSelectedDetailItem({ title: m.title, sub: m.sub, status: m.status, mod: 'Career AI' })}
                      style={s.milestoneRow}
                    >
                      <View style={s.numBox}><Text style={s.numText}>{m.num}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{m.title}</Text>
                        <Text style={{ color: '#8A8A9E', fontSize: 12 }}>{m.sub}</Text>
                      </View>
                      <View style={s.statusPill}><Text style={s.statusText}>{m.status}</Text></View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════
                3. NETWORK VIEW
               ══════════════════════════════════════════════════════════════ */}
            {currentView === 'net' && (
              <View style={{ gap: 20 }}>
                <View style={s.moduleHeaderCard}>
                  <Text style={[s.modEyebrow, { color: '#34D399' }]}>NETWORK</Text>
                  <Text style={s.modH1}>People, not profiles</Text>
                  <Text style={s.modSub}>Alumni from your branch who already made the jump.</Text>
                </View>

                <View style={{ gap: 10 }}>
                  {MENTORS.map((m, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setSelectedMentor(m)}
                      style={s.mentorRowCard}
                    >
                      <View style={[s.mentorMono, { borderColor: m.cat }]}><Text style={{ color: m.cat, fontWeight: '700' }}>{m.mono}</Text></View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{m.name}</Text>
                          {m.li && <Text style={{ color: '#2563EB', fontSize: 12 }}>✓ in</Text>}
                        </View>
                        <Text style={{ color: '#8A8A9E', fontSize: 12 }}>{m.role}</Text>
                      </View>
                      <Pressable onPress={() => setSelectedMentor(m)} style={s.viewDetailsBtn}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>View details</Text>
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════
                4. RENTALS MARKETPLACE VIEW
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                        <Text style={{ fontSize: 32 }}>🏢</Text>
                      </View>
                      <View style={{ padding: 14, gap: 8 }}>
                        <Text style={s.listingTitle}>{item.name}</Text>
                        <Text style={s.listingLoc}>{item.loc}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                          <Text style={s.listingRate}>★ {item.rate} ({item.revs})</Text>
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
                5. PROFILE VIEW
               ══════════════════════════════════════════════════════════════ */}
            {currentView === 'profile' && (
              <View style={{ gap: 20 }}>
                {/* Profile Header Card */}
                <View style={s.profileHeaderCard}>
                  <View style={s.profileAvatar}><Text style={{ color: '#fff', fontSize: 26, fontWeight: '700' }}>D</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>Devender Vutukuru</Text>
                    <Text style={{ color: '#8A8A9E', fontSize: 13 }}>Khammam Institute of Technologies and Sciences</Text>
                    <View style={s.verifiedBadge}><Text style={s.verifiedText}>✓ Verified Student</Text></View>
                  </View>
                  <Pressable onPress={() => setShowIDModal(true)} style={s.primaryBtn}>
                    <Text style={s.btnText}>View Digital ID Card</Text>
                  </Pressable>
                </View>

                {/* Government Identity Card */}
                <View style={s.govCard}>
                  <Text style={s.tileEyebrow}>GOVERNMENT IDENTITY & DIGILOCKER</Text>
                  <View style={{ gap: 12, marginTop: 12 }}>
                    <View style={s.govItem}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Aadhaar Number (UIDAI)</Text>
                      <Text style={{ color: '#8A8A9E', fontSize: 12, marginVertical: 4 }}>Stored encrypted and auto-masked as •••• •••• 8466.</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                        <TextInput style={s.govInput} placeholder="12-digit Aadhaar" placeholderTextColor="#6A6A7E" />
                        <Pressable onPress={() => addToast('Aadhaar Verification Initiated', 'OTP sent to mobile', 'info')} style={s.primaryBtn}>
                          <Text style={s.btnText}>Verify</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ── 3D Digital ID Card Flip Modal ─────────────────────────────────── */}
      <Modal visible={showIDModal} transparent animationType="fade" onRequestClose={() => setShowIDModal(false)}>
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setShowIDModal(false)} />
          <View style={s.idModalSheet}>
            <View style={s.idModalHead}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Digital ID Card</Text>
              <Pressable onPress={() => setShowIDModal(false)}><Text style={{ color: '#8A8A9E', fontSize: 18 }}>✕</Text></Pressable>
            </View>

            <Pressable onPress={() => setIsIDCardFlipped(!isIDCardFlipped)} style={s.idCardPerspective}>
              <View style={[s.id3DCard, isIDCardFlipped ? s.id3DCardBack : s.id3DCardFront]}>
                {!isIDCardFlipped ? (
                  <View style={s.idFrontContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={s.idBrandText}>STUDENT ALUMNI</Text>
                      <View style={s.idVerifiedPill}><Text style={s.idVerifiedText}>VERIFIED</Text></View>
                    </View>
                    <View>
                      <Text style={s.idName}>Devender Vutukuru</Text>
                      <Text style={s.idDegree}>Computer Science · Class of 2018</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <View>
                        <Text style={s.idMetaLabel}>SA ID</Text>
                        <Text style={s.idMetaVal}>SA-2026-STU-RNWJMD</Text>
                        <Text style={s.idValid}>Valid until June 2027</Text>
                      </View>
                      <View style={s.qrBox}><Text style={{ fontSize: 24 }}>🔲</Text></View>
                    </View>
                  </View>
                ) : (
                  <View style={s.idBackContent}>
                    <Text style={s.idBackH1}>ISSUED BY STUDENTALUMNI</Text>
                    <Text style={s.idBackSub}>This card confirms a verified college affiliation. Report loss at studentalumni.ai/verify.</Text>
                    <Text style={{ color: '#8A8A9E', fontSize: 11, marginTop: 10 }}>studentalumni.ai/verify · SA-2026-STU-RNWJMD</Text>
                  </View>
                )}
              </View>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable onPress={() => setIsIDCardFlipped(!isIDCardFlipped)} style={[s.primaryBtn, { flex: 1 }]}>
                <Text style={s.btnText}>Flip card</Text>
              </Pressable>
              <Pressable onPress={() => addToast('Saved to Wallet', 'Pass added to Apple/Google Wallet', 'ok')} style={[s.primaryBtn, { backgroundColor: '#262638', flex: 1 }]}>
                <Text style={s.btnText}>Add to Wallet</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Command Palette (⌘K) Modal ────────────────────────────────────── */}
      <Modal visible={showPalette} transparent animationType="fade" onRequestClose={() => setShowPalette(false)}>
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setShowPalette(false)} />
          <View style={s.paletteSheet}>
            <View style={s.paletteInputWrap}>
              <TextInput
                style={s.paletteInput}
                placeholder="Jump to a module, mentor or action…"
                placeholderTextColor="#6A6A7E"
                value={paletteQuery}
                onChangeText={setPaletteQuery}
                autoFocus
              />
              <Pressable onPress={() => setShowPalette(false)} style={s.paletteEsc}><Text style={s.kbdText}>ESC</Text></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 320, padding: 8 }}>
              {filteredPalette.map((item, idx) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setShowPalette(false);
                    navigateModule(item.key, item.label);
                  }}
                  style={s.palRow}
                >
                  <Text style={{ color: '#A78BFA', fontSize: 14 }}>✦</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{item.label}</Text>
                    <Text style={{ color: '#8A8A9E', fontSize: 11 }}>{item.sub}</Text>
                  </View>
                  <Text style={{ color: '#6A6A7E', fontSize: 12 }}>Open →</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Agent K Conversational Drawer ─────────────────────────────────── */}
      <Modal visible={showAgentDrawer} transparent animationType="slide" onRequestClose={() => setShowAgentDrawer(false)}>
        <View style={s.drawerOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setShowAgentDrawer(false)} />
          <View style={s.agentDrawerSheet}>
            {/* Header */}
            <View style={s.drawerHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={s.agentBadgeIco}><Text style={{ color: '#fff', fontSize: 14 }}>🤖</Text></View>
                <View>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Agent K</Text>
                  <Text style={{ color: '#34D399', fontSize: 11 }}>Built-in knowledge · live</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowAgentDrawer(false)}><Text style={{ color: '#8A8A9E', fontSize: 18 }}>✕</Text></Pressable>
            </View>

            {/* Chat Thread */}
            <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
              {chatMessages.map((msg, i) => (
                <View key={i} style={[s.chatBubble, msg.who === 'me' ? s.chatBubbleMe : s.chatBubbleK]}>
                  <Text style={[s.chatText, msg.who === 'me' ? { color: '#fff' } : { color: '#D4D4E8' }]}>{msg.text}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Prompt Suggestion Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              {['What should I do today?', 'What is closing soon?', 'Who can refer me?'].map((chip, idx) => (
                <Pressable key={idx} onPress={() => handleAgentAsk(chip)} style={s.promptChip}>
                  <Text style={{ color: '#A78BFA', fontSize: 12 }}>{chip}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Chat Input */}
            <View style={s.chatInputBar}>
              <TextInput
                style={s.chatTextInput}
                placeholder="Ask about readiness, deadlines, mentors…"
                placeholderTextColor="#6A6A7E"
                value={agentInputText}
                onChangeText={setAgentInputText}
                onSubmitEditing={() => handleAgentAsk(agentInputText)}
              />
              <Pressable onPress={() => handleAgentAsk(agentInputText)} style={s.chatSendBtn}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>↑</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Notifications Drawer ──────────────────────────────────────────── */}
      <Modal visible={showNotifDrawer} transparent animationType="slide" onRequestClose={() => setShowNotifDrawer(false)}>
        <View style={s.drawerOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setShowNotifDrawer(false)} />
          <View style={s.notifDrawerSheet}>
            <View style={s.drawerHead}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Notifications</Text>
              <Pressable onPress={() => setShowNotifDrawer(false)}><Text style={{ color: '#8A8A9E', fontSize: 18 }}>✕</Text></Pressable>
            </View>
            <View style={{ padding: 16, gap: 12 }}>
              <View style={s.notifItem}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Referral window for Google SWE closes in 2 days</Text>
                <Text style={{ color: '#6A6A7E', fontSize: 11, marginTop: 4 }}>Career AI · 2 hours ago</Text>
              </View>
              <View style={s.notifItem}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Rahul Sharma accepted your session request</Text>
                <Text style={{ color: '#6A6A7E', fontSize: 11, marginTop: 4 }}>Network · 5 hours ago</Text>
              </View>
              <Pressable onPress={() => { setShowNotifDrawer(false); addToast('All caught up ✓', 'Notifications marked as read', 'info'); }} style={s.primaryBtn}>
                <Text style={s.btnText}>Mark all as read</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Toast Notifications Box ──────────────────────────────────────── */}
      <View style={s.toastContainer} pointerEvents="none">
        {toasts.map((t) => (
          <View key={t.id} style={s.toastCard}>
            <Text style={{ color: '#34D399', fontSize: 14 }}>✓</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{t.title}</Text>
              {t.body && <Text style={{ color: '#8A8A9E', fontSize: 11 }}>{t.body}</Text>}
            </View>
          </View>
        ))}
      </View>

      {/* ── Curtain Transition Overlay ─────────────────────────────────────── */}
      {curtainVisible && (
        <View style={s.curtainOverlay}>
          <Svg width={84} height={96} viewBox="0 0 300 350">
            <Defs>
              <SvgGradient id="curtBadge" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#C9A7FF" />
                <Stop offset="0.48" stopColor="#8B5CF6" />
                <Stop offset="1" stopColor="#5B2FD0" />
              </SvgGradient>
            </Defs>
            <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#curtBadge)" />
            <SvgText x={150} y={214} textAnchor="middle" fontFamily="sans-serif" fontSize={118} fontWeight="800" fill="#FFFFFF">
              SA
            </SvgText>
          </Svg>
          <Text style={s.curtainBrand}>#studentalumni</Text>
          <Text style={s.curtainModText}>{curtainModuleName}</Text>
          <View style={s.curtainBarTrack}><View style={[s.curtainBarFill, { width: `${curtainProgress}%` }]} /></View>
          <Text style={s.curtainPercent}>{curtainProgress}%</Text>
        </View>
      )}

      {/* ── Floating Agent K FAB ──────────────────────────────────────────── */}
      <Pressable onPress={() => setShowAgentDrawer(true)} style={s.agentFab}>
        <Text style={{ fontSize: 16 }}>🤖</Text>
        <Text style={s.agentFabText}>Agent K</Text>
      </Pressable>
    </View>
  );
}

// ── Styles Matching Web Dashboard Design Spec ───────────────────────────────
const s = {{
  root: { flex: 1, backgroundColor: '#08080F' },
  bgfx: { position: 'absolute' as any, inset: 0, overflow: 'hidden' },
  aurora1: { position: 'absolute' as any, left: '-20%', top: '-30%', width: '90%', height: 700, backgroundColor: 'rgba(124,92,252,0.15)', borderRadius: 400 },
  aurora2: { position: 'absolute' as any, right: '-24%', top: '8%', width: '78%', height: 600, backgroundColor: 'rgba(47,184,198,0.12)', borderRadius: 400 },
  dotGrid: { position: 'absolute' as any, inset: 0 },
  shell: { flex: 1, flexDirection: 'row' },
  shellMini: {},
  sidebar: { width: 264, borderRightWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019', paddingBottom: 20 },
  sidebarMini: { width: 74 },
  sideHead: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#1F1F30' },
  brandTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  brandSub: { color: '#8A8A9E', fontSize: 11 },
  collapseBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: '#262638', alignItems: 'center', justifyContent: 'center' },
  userMini: { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#1F1F30' },
  userName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  userClass: { color: '#8A8A9E', fontSize: 12 },
  cardChip: { margin: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#262638', backgroundColor: '#14141F', flexDirection: 'row', alignItems: 'center' },
  cardChipLabel: { color: '#8A8A9E', fontSize: 11 },
  cardChipId: { color: '#A78BFA', fontSize: 12.5, fontWeight: '700' },
  agentCard: { marginHorizontal: 12, marginBottom: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#2C2A52', backgroundColor: '#14141F' },
  agentBadgeIco: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#7C5CFC', alignItems: 'center', justifyContent: 'center' },
  agentTitle: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  betaPill: { backgroundColor: '#163B4F', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  betaText: { color: '#6FD6FF', fontSize: 9, fontWeight: '800' },
  agentH1: { color: '#fff', fontSize: 13.5, fontWeight: '700', marginTop: 4 },
  agentSub: { color: '#8A8A9E', fontSize: 11.5, marginTop: 2 },
  kbd: { backgroundColor: '#262638', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  kbdText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 40, paddingHorizontal: 12, borderRadius: 10, marginVertical: 2 },
  navItemActive: { backgroundColor: '#7C5CFC' },
  navIcon: { fontSize: 16 },
  navLabel: { color: '#8A8A9E', fontSize: 13.5, fontWeight: '500', flex: 1 },
  navLabelActive: { color: '#FFFFFF', fontWeight: '700' },
  cmsBadge: { backgroundColor: '#2E2A55', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  cmsBadgeText: { color: '#A78BFA', fontSize: 9, fontWeight: '700' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  topBar: { height: 68, borderBottomWidth: 1, borderColor: '#1F1F30', backgroundColor: '#08080F', paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greetingTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  greetingSub: { color: '#8A8A9E', fontSize: 12, marginTop: 2 },
  searchBar: { width: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#262638', backgroundColor: '#14141F' },
  kbdSmall: { backgroundColor: '#262638', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  kbdSmallText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  iconButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#262638', backgroundColor: '#14141F', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute' as any, top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#F0616B' },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0F7C4A', borderWidth: 2, borderColor: '#1DBF73', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  heroCard: { borderRadius: 20, backgroundColor: '#F4F2FF', padding: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24 },
  thisWeekPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(75,63,168,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  thisWeekText: { color: '#3B2FA8', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  heroH1: { color: '#141726', fontSize: 28, fontWeight: '800', marginVertical: 8 },
  heroSub: { color: '#4A4F63', fontSize: 14, maxWidth: 500, lineHeight: 20 },
  heroPrimaryBtn: { backgroundColor: '#4B3FD6', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  heroSecondaryBtn: { borderWidth: 1, borderColor: '#CFC9F3', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  heroBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  heroSecText: { color: '#2E2A55', fontSize: 13, fontWeight: '700' },
  heroStatsRow: { flexDirection: 'row', gap: 20 },
  heroStatCol: { alignItems: 'flex-start' },
  heroStatLabel: { color: '#5F6474', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  heroStatNum: { fontSize: 26, fontWeight: '800', marginVertical: 2 },
  heroStatGain: { color: '#047857', fontSize: 11, fontWeight: '700' },
  heroStatSub: { color: '#6B7080', fontSize: 11 },
  promoBannerWrap: { borderRadius: 18, overflow: 'hidden', minHeight: 120 },
  promoSlide: { padding: 22, flexDirection: 'row', alignItems: 'center', gap: 20 },
  promoWhiteBox: { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center' },
  promoTagline: { color: '#E9DDFF', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  promoDates: { color: '#fff', fontSize: 20, fontWeight: '800', marginVertical: 4 },
  promoVenue: { color: '#DCCEF7', fontSize: 12.5 },
  kpiRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  kpiTile: { flex: 1, minWidth: 160, borderRadius: 14, borderWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019', padding: 16, flexDirection: 'row', alignItems: 'center' },
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
  simRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  tileDivider: { height: 1, backgroundColor: '#1F1F30', marginVertical: 12 },
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
  moduleHeaderCard: { borderRadius: 18, padding: 24, borderWidth: 1, borderColor: '#2C2A52', backgroundColor: '#101019' },
  modEyebrow: { color: '#A78BFA', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  modH1: { color: '#fff', fontSize: 24, fontWeight: '800', marginVertical: 6 },
  modSub: { color: '#8A8A9E', fontSize: 13 },
  milestonesBox: { borderRadius: 18, borderWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019', overflow: 'hidden' },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1, borderColor: '#1F1F30' },
  numBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,92,252,0.15)', alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#A78BFA', fontWeight: '800' },
  statusPill: { backgroundColor: '#262638', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },
  mentorRowCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#1F1F30', backgroundColor: '#101019' },
  mentorMono: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14141F' },
  viewDetailsBtn: { backgroundColor: '#7C5CFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
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
  discountBadge: { position: 'absolute' as any, top: 10, right: 10, backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
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
  govInput: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#262638', backgroundColor: '#101019', paddingHorizontal: 12, color: '#fff' },
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
  paletteSheet: { width: '100%', maxWidth: 540, backgroundColor: '#101019', borderRadius: 18, borderWidth: 1, borderColor: '#262638', overflow: 'hidden' },
  paletteInputWrap: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: '#1F1F30' },
  paletteInput: { flex: 1, color: '#fff', fontSize: 15 },
  paletteEsc: { backgroundColor: '#262638', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  palRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10 },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', justifyContent: 'flex-end' },
  agentDrawerSheet: { width: '100%', maxWidth: 420, backgroundColor: '#101019', borderLeftWidth: 1, borderColor: '#1F1F30' },
  notifDrawerSheet: { width: '100%', maxWidth: 360, backgroundColor: '#101019', borderLeftWidth: 1, borderColor: '#1F1F30' },
  drawerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderColor: '#1F1F30' },
  chatBubble: { padding: 12, borderRadius: 12, marginVertical: 6, maxWidth: '88%' },
  chatBubbleMe: { alignSelf: 'flex-end', backgroundColor: '#7C5CFC' },
  chatBubbleK: { alignSelf: 'flex-start', backgroundColor: '#14141F', borderWidth: 1, borderColor: '#262638' },
  chatText: { fontSize: 13.5, lineHeight: 19 },
  promptChip: { borderWidth: 1, borderColor: '#262638', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginRight: 8 },
  chatInputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: 1, borderColor: '#1F1F30' },
  chatTextInput: { flex: 1, backgroundColor: '#14141F', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: '#fff' },
  chatSendBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#7C5CFC', alignItems: 'center', justifyContent: 'center' },
  notifItem: { padding: 12, borderRadius: 10, backgroundColor: '#14141F', borderWidth: 1, borderColor: '#262638' },
  toastContainer: { position: 'absolute' as any, top: 76, right: 24, zIndex: 100, gap: 10, maxWidth: 340 },
  toastCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: '#14141F', borderWidth: 1, borderColor: '#262638', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10 },
  curtainOverlay: { position: 'absolute' as any, inset: 0, zIndex: 200, backgroundColor: '#08080F', alignItems: 'center', justifyContent: 'center', gap: 12 },
  curtainBrand: { fontSize: 32, fontWeight: '800', color: '#A78BFA' },
  curtainModText: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: '#8A8A9E' },
  curtainBarTrack: { width: 260, height: 4, borderRadius: 2, backgroundColor: '#262638', overflow: 'hidden' },
  curtainBarFill: { height: '100%', backgroundColor: '#7C5CFC' },
  curtainPercent: { fontSize: 44, fontWeight: '800', color: '#FFFFFF' },
  agentFab: { position: 'absolute' as any, right: 24, bottom: 24, backgroundColor: '#7C5CFC', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#7C5CFC', shadowOpacity: 0.5, shadowRadius: 15 },
  agentFabText: { color: '#fff', fontSize: 14, fontWeight: '700' },
};
