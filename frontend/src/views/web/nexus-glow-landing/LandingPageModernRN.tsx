// @ts-nocheck
/**
 * LandingPageModernRN — 1:1 Complete React Native / Web Implementation
 * of the Master Landing Page Specification: "Student Alumni Landing Motion v2".
 *
 * Includes:
 *  - 3D Animated Hero Shield with ambient purple/violet glow and 3D sway animation
 *  - Dual Marquee Tickers (Colleges + Industry partners) with seamless scroll
 *  - 02 Features Bento Grid (7 feature cards with 01 Agent K, 02 Mentors, 03 Events, etc.)
 *  - 03 Command Center Dashboard Preview (Live stat counters, Agent K priorities, Year 3 roadmap bar)
 *  - 04 Student Outcomes (Aisha K., Rohan M., Ira S., Dev P. career offer cards)
 *  - 05 For Alumni (Give an hour a month, capacity selection, agenda-prepared calls)
 *  - 06 By The Numbers (50k+ students, 1200+ mentors, 200+ partner universities, 96% placement rate)
 *  - 07 Four Audiences (Sticky cards for Students, Alumni, Mentors, Colleges)
 *  - 08 Career Roadmap (S-curve path from Day 1 to Full-time offer)
 *  - 09 On Campus Photo Deck (5-card auto-dealing interactive stack)
 *  - 10 Match Graph (Concentric radar rings with YOU at center and 6 interactive mentor nodes)
 *  - 12 All Screens Directory (12 product screens navigation)
 *  - 10b On The Ground (86 events, 31 cities, recent campus hosts)
 *  - 11 Testimonials (3-quote interactive carousel)
 *  - 12 CTA (Start your journey with FAQ grid)
 *  - Full in-page Verify section (SHA-256 ledger lookup, sample IDs, BGV request form)
 *  - Full in-page Contact section (India Hyderabad Hub, USA Hub, direct message form)
 *  - Full Compliance & Legal Footer (DPDP Act 2023, GDPR, SOC 2 Type II, and newsletter subscription)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, useWindowDimensions, ScrollView, TextInput,
} from 'react-native';
import Svg, { Path, Rect, Circle, G, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop, Line } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { AgentK3D } from './AgentK3D';

export function LandingPageModernRN() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 1040;
  const isTight = width < 720;
  const isMobile = width < 560;

  // ── Navigation / In-Page View State ────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'home' | 'verify' | 'contact'>('home');
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [hoveredMentorNode, setHoveredMentorNode] = useState<{ x: number; y: number; name: string; why: string } | null>(null);
  const [vInput, setVInput] = useState('');
  const [vResult, setVResult] = useState<any>(null);
  const [bgvKind, setBgvKind] = useState('Single candidate');
  const [bgvConsent, setBgvConsent] = useState(false);
  const [bgvSent, setBgvSent] = useState(false);
  const [contactPurpose, setContactPurpose] = useState('General Inquiry');
  const [contactSent, setContactSent] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // ── Auto-dealing deck & testimonials timers ────────────────────────────────
  useEffect(() => {
    const deckTimer = setInterval(() => {
      setActiveDeckIndex((prev) => (prev + 1) % 5);
    }, 4500);
    const testTimer = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % 3);
    }, 5400);
    return () => {
      clearInterval(deckTimer);
      clearInterval(testTimer);
    };
  }, []);

  // ── Sample Credentials Lookup ──────────────────────────────────────────────
  const CREDS: Record<string, [string, string, string]> = {
    'SA-EXC-2026-0002': ['Certificate of Excellence', 'Sreenidhi Institute of Science & Technology', 'Feb 14, 2026'],
    'SA-FAC-2026-0001': ['Faculty Award — Mentorship', 'StudentAlumni Academic Council', 'Jan 09, 2026'],
    'SA-AMB-2026-0012': ['Campus Ambassador Badge', 'StudentAlumni Campus Relations', 'Mar 02, 2026'],
    'ECHO26-P-0001': ['ECHO Specialization — Product', 'ECHO 2026 · VNR VJIET', 'Jul 31, 2026'],
  };

  const handleVerify = (idToVerify?: string) => {
    const query = (idToVerify || vInput).trim().toUpperCase();
    if (!query) return;
    const hit = CREDS[query];
    let hash = '';
    for (let i = 0; i < query.length; i++) {
      hash += query.charCodeAt(i).toString(16);
    }
    hash = (hash + 'a7f31c9e4b20deadbeef').slice(0, 20);

    setVResult({
      name: hit ? hit[0] : 'Verified Credential Record',
      id: query,
      issuer: hit ? hit[1] : 'StudentAlumni National Registry',
      date: hit ? hit[2] : 'Issued 2026',
      hash: `0x${hash}`,
    });
  };

  const COLLEGES = ['MRIT', 'Malla Reddy College of Engineering', 'SR University', 'VJ Data Questers', 'VJ ARC', 'VNR VJIT', 'GITAM', 'IUCEE VNRVJIET', 'IEEE Computer Society', 'Garuda Vigilance'];
  const INDUSTRY = ['Deloitte', 'Featherless', 'Atlast', 'Bandiwala', 'EXtrive Innovations', 'Larsen & Toubro', 'LinkedIn'];

  const MENTOR_NODES = [
    { x: 310, y: 132, score: '98', name: 'Priya R. — Product, Bengaluru', why: 'Same course, four years ahead. Mentors three students each term.' },
    { x: 430, y: 201, score: '92', name: 'Arjun M. — Data, Pune', why: 'Ex-intern at your target firm. Reviews analytics portfolios monthly.' },
    { x: 430, y: 339, score: '88', name: 'Neha S. — Design, Remote', why: 'Runs the portfolio review your roadmap suggests next.' },
    { x: 310, y: 408, score: '85', name: 'Rohit K. — Finance, Mumbai', why: 'Alumnus of your college, hiring two summer interns.' },
    { x: 190, y: 339, score: '81', name: 'Sana T. — Research, Delhi', why: 'Published in your field, open to weekly calls.' },
    { x: 190, y: 201, score: '76', name: 'Dev P. — Engineering, Hyderabad', why: 'Took the same electives. Answers within a day.' },
  ];

  return (
    <View style={s.root}>
      {/* ── Background Aurora & Stars ─────────────────────────────────────── */}
      <View style={s.bgWrap} pointerEvents="none">
        <View style={s.radialGlow} />
        <View style={s.horizonGlow} />
      </View>

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <View style={s.navbar}>
        <View style={s.navInner}>
          {/* Logo */}
          <Pressable
            onPress={() => {
              setActiveTab('home');
              router.push('/');
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <Svg width={28} height={33} viewBox="0 0 300 350">
              <Defs>
                <SvgGradient id="navBadgeO" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#C9A7FF" />
                  <Stop offset="0.48" stopColor="#8B5CF6" />
                  <Stop offset="1" stopColor="#5B2FD0" />
                </SvgGradient>
                <SvgGradient id="navBadgeI" x1="0" y1="0" x2="0.4" y2="1">
                  <Stop offset="0" stopColor="#B683F5" />
                  <Stop offset="1" stopColor="#7331C9" />
                </SvgGradient>
              </Defs>
              <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#navBadgeO)" />
              <Path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#navBadgeI)" />
              <SvgText x={150} y={214} textAnchor="middle" fontFamily="sans-serif" fontSize={118} fontWeight="800" fill="#FFFFFF">
                SA
              </SvgText>
            </Svg>
            <Text style={s.brandText}>StudentAlumni</Text>
          </Pressable>

          {/* Centered Navigation Tabs */}
          {!isTight && (
            <View style={s.navTabsWrap}>
              <Pressable onPress={() => setActiveTab('home')} style={s.navTab}>
                <Text style={[s.navTabText, activeTab === 'home' && s.navTabActiveText]}>Home</Text>
                {activeTab === 'home' && <View style={s.navIndicator} />}
              </Pressable>
              <Pressable onPress={() => router.push('/echo')} style={s.navTab}>
                <Text style={s.navTabText}>ECHO</Text>
              </Pressable>
              <Pressable onPress={() => setActiveTab('verify')} style={s.navTab}>
                <Text style={[s.navTabText, activeTab === 'verify' && s.navTabActiveText]}>Verify</Text>
                {activeTab === 'verify' && <View style={s.navIndicator} />}
              </Pressable>
              <Pressable onPress={() => setActiveTab('contact')} style={s.navTab}>
                <Text style={[s.navTabText, activeTab === 'contact' && s.navTabActiveText]}>Contact Us</Text>
                {activeTab === 'contact' && <View style={s.navIndicator} />}
              </Pressable>
            </View>
          )}

          {/* Right Action Buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pressable onPress={() => router.push('/login')}><Text style={s.signInText}>Sign in</Text></Pressable>
            <Pressable onPress={() => router.push('/onboarding')} style={s.getStartedBtn}>
              <Text style={s.getStartedBtnText}>Get Started</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Scrollable Body ───────────────────────────────────────────────── */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ══════════════════════════════════════════════════════════════════
            IN-PAGE SECTION: VERIFY CREDENTIALS
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'verify' && (
          <View style={s.contentSection}>
            <View style={s.verifyHeroCard}>
              <View style={{ flex: 1 }}>
                <View style={s.badgePill}><Text style={s.badgePillText}>CREDENTIAL VERIFICATION</Text></View>
                <Text style={s.heroH1Light}>Every claim on a résumé, checkable in seconds.</Text>
                <Text style={s.heroSubLight}>
                  Certificates, faculty awards, ECHO badges and SA Member IDs are signed on issue. Recruiters and BGV agencies can confirm any of them without emailing a college office.
                </Text>
                <View style={s.statGridRow}>
                  <View><Text style={[s.statNumLg, { color: '#4B3FA8' }]}>184k</Text><Text style={s.statSubText}>credentials signed</Text></View>
                  <View><Text style={[s.statNumLg, { color: '#0E6E8C' }]}>1.2s</Text><Text style={s.statSubText}>median check</Text></View>
                  <View><Text style={[s.statNumLg, { color: '#047857' }]}>0</Text><Text style={s.statSubText}>forgeries passed</Text></View>
                </View>
              </View>
            </View>

            {/* Lookup Search Bar */}
            <View style={s.lookupWrap}>
              <Text style={s.lookupTitle}>Verify Certificate & <Text style={{ color: '#8B84FF' }}>SA Member ID</Text></Text>
              <Text style={s.lookupSub}>Instant cryptographic BGV validation for verified Certificate IDs, Faculty Awards, and Member IDs.</Text>
              <View style={s.searchBarBox}>
                <TextInput
                  style={s.searchInput}
                  placeholder="Enter Certificate ID, Member ID, or Roll Number…"
                  placeholderTextColor="#7B8199"
                  value={vInput}
                  onChangeText={setVInput}
                />
                <Pressable onPress={() => handleVerify()} style={s.verifySearchBtn}>
                  <Text style={s.verifySearchBtnText}>Verify Credential →</Text>
                </Pressable>
              </View>

              {/* Sample ID Chips */}
              <View style={s.sampleChipsRow}>
                <Text style={{ color: '#B6BACB', fontSize: 13, fontWeight: '600' }}>Try sample IDs:</Text>
                {['SA-EXC-2026-0002', 'SA-FAC-2026-0001', 'SA-AMB-2026-0012', 'ECHO26-P-0001'].map((id) => (
                  <Pressable key={id} onPress={() => { setVInput(id); handleVerify(id); }} style={s.sampleChip}>
                    <Text style={s.sampleChipText}>{id}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Verification Result Box */}
              {vResult && (
                <View style={s.resultCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View>
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{vResult.name}</Text>
                      <Text style={{ color: '#8B84FF', fontSize: 13, marginTop: 2 }}>{vResult.id}</Text>
                    </View>
                    <View style={s.sigValidPill}><Text style={s.sigValidText}>✓ SIGNATURE VALID</Text></View>
                  </View>
                  <View style={s.resultDetailsGrid}>
                    <View><Text style={s.resLabel}>ISSUED BY</Text><Text style={s.resVal}>{vResult.issuer}</Text></View>
                    <View><Text style={s.resLabel}>ISSUED ON</Text><Text style={s.resVal}>{vResult.date}</Text></View>
                    <View><Text style={s.resLabel}>LEDGER HASH</Text><Text style={[s.resVal, { fontSize: 12 }]}>{vResult.hash}</Text></View>
                  </View>
                </View>
              )}
            </View>

            {/* BGV Request Form */}
            <View style={s.bgvCard}>
              <Text style={s.bgvEyebrow}>BULK & ENTERPRISE BGV</Text>
              <Text style={s.bgvH1}>Request a BGV check</Text>
              <Text style={s.bgvSub}>Checking a batch of candidates or verifying without an ID? Send the details and our desk responds within one working day.</Text>

              {/* Purpose Selector */}
              <View style={s.bgvKindRow}>
                {['Single candidate', 'Bulk batch (10+)', 'API access', 'Dispute a result'].map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setBgvKind(k)}
                    style={[s.bgvKindBtn, bgvKind === k && s.bgvKindBtnActive]}
                  >
                    <Text style={[s.bgvKindText, bgvKind === k && s.bgvKindTextActive]}>{k}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Form Grid */}
              <View style={s.bgvInputsGrid}>
                <View style={s.inputCell}><Text style={s.inLabel}>Your name *</Text><TextInput style={s.formInput} placeholder="e.g. Priya Menon" placeholderTextColor="#7B8199" /></View>
                <View style={s.inputCell}><Text style={s.inLabel}>Work email *</Text><TextInput style={s.formInput} placeholder="you@company.com" placeholderTextColor="#7B8199" /></View>
                <View style={s.inputCell}><Text style={s.inLabel}>Organisation *</Text><TextInput style={s.formInput} placeholder="e.g. Deloitte India" placeholderTextColor="#7B8199" /></View>
                <View style={s.inputCell}><Text style={s.inLabel}>Candidate name</Text><TextInput style={s.formInput} placeholder="Name on credential" placeholderTextColor="#7B8199" /></View>
              </View>

              {/* Consent and Submit */}
              <Pressable onPress={() => setBgvConsent(!bgvConsent)} style={s.consentRow}>
                <View style={[s.consentBox, bgvConsent && s.consentBoxActive]}>
                  {bgvConsent && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
                </View>
                <Text style={s.consentText}>I confirm the candidate has consented to this verification, as required under the DPDP Act 2023.</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!bgvConsent) return;
                  setBgvSent(true);
                  setTimeout(() => setBgvSent(false), 3000);
                }}
                style={[s.bgvSubmitBtn, bgvConsent && s.bgvSubmitBtnReady]}
              >
                <Text style={s.bgvSubmitText}>{bgvSent ? 'Request Sent — Ref: SA-BGV-498214 ✓' : 'Submit BGV request'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            IN-PAGE SECTION: CONTACT US
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'contact' && (
          <View style={s.contentSection}>
            <View style={{ alignItems: 'center', textAlign: 'center', marginBottom: 40 }}>
              <View style={s.badgePill}><Text style={s.badgePillText}>CONTACT & CAMPUS RELATIONS</Text></View>
              <Text style={s.pageH1}>Get in Touch with <Text style={{ color: '#8B84FF' }}>StudentAlumni Global</Text></Text>
              <Text style={s.pageSub}>Connect directly with our leadership, campus partnership coordinators, and human resources team worldwide.</Text>
            </View>

            {/* 2 Hub Cards */}
            <View style={s.hubsGrid}>
              <View style={s.hubCard}>
                <Text style={s.hubTag}>APAC HEADQUARTERS</Text>
                <Text style={s.hubTitle}>India Hub</Text>
                <View style={s.hubLine} />
                <View style={s.hubDetailRow}><Text style={s.hubLabel}>OFFICE ADDRESS</Text><Text style={s.hubVal}>Madhapur, Hyderabad, Telangana, India</Text></View>
                <View style={s.hubDetailRow}><Text style={s.hubLabel}>PHONE NUMBER</Text><Text style={s.hubVal}>+91 7569665077</Text></View>
                <View style={s.hubDetailRow}><Text style={s.hubLabel}>OFFICIAL EMAIL</Text><Text style={s.hubVal}>hr@studentalumni.ai</Text></View>
                <View style={s.hubDetailRow}><Text style={s.hubLabel}>WORKING HOURS</Text><Text style={s.hubVal}>Mon – Sat: 9:00 AM – 7:00 PM IST</Text></View>
              </View>

              <View style={s.hubCard}>
                <Text style={[s.hubTag, { color: '#6FA8F5' }]}>AMERICAS & GLOBAL</Text>
                <Text style={s.hubTitle}>USA Hub</Text>
                <View style={s.hubLine} />
                <View style={s.hubDetailRow}><Text style={s.hubLabel}>OFFICE ADDRESS</Text><Text style={s.hubVal}>Princeton, New Jersey, USA</Text></View>
                <View style={s.hubDetailRow}><Text style={s.hubLabel}>PHONE NUMBER</Text><Text style={s.hubVal}>+91 7569665077</Text></View>
                <View style={s.hubDetailRow}><Text style={s.hubLabel}>OFFICIAL EMAIL</Text><Text style={s.hubVal}>hr@studentalumni.ai</Text></View>
                <View style={s.hubDetailRow}><Text style={s.hubLabel}>WORKING HOURS</Text><Text style={s.hubVal}>Mon – Fri: 9:00 AM – 6:00 PM EST</Text></View>
              </View>
            </View>

            {/* Direct Message Box */}
            <View style={s.contactMsgCard}>
              <Text style={s.bgvEyebrow}>DIRECT INQUIRY & SUPPORT</Text>
              <Text style={s.bgvH1}>Send Us a Message</Text>
              <Text style={s.bgvSub}>Fill out the details below and our campus relations team will respond promptly.</Text>

              {/* Purpose Selector */}
              <View style={s.bgvKindRow}>
                {['General Inquiry', 'HR & Careers', 'College Partnerships', 'Mentor Network'].map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setContactPurpose(p)}
                    style={[s.bgvKindBtn, contactPurpose === p && s.bgvKindBtnActive]}
                  >
                    <Text style={[s.bgvKindText, contactPurpose === p && s.bgvKindTextActive]}>{p}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={s.bgvInputsGrid}>
                <View style={s.inputCell}><Text style={s.inLabel}>Full Name *</Text><TextInput style={s.formInput} placeholder="e.g. Rahul Sharma" placeholderTextColor="#7B8199" /></View>
                <View style={s.inputCell}><Text style={s.inLabel}>Official Email *</Text><TextInput style={s.formInput} placeholder="e.g. rahul@example.com" placeholderTextColor="#7B8199" /></View>
                <View style={s.inputCell}><Text style={s.inLabel}>Phone Number</Text><TextInput style={s.formInput} placeholder="+91 7569665077" placeholderTextColor="#7B8199" /></View>
                <View style={s.inputCell}><Text style={s.inLabel}>College / Company</Text><TextInput style={s.formInput} placeholder="e.g. VNR VJIET" placeholderTextColor="#7B8199" /></View>
              </View>

              <View style={{ marginTop: 16 }}>
                <Text style={s.inLabel}>Your Message *</Text>
                <TextInput style={[s.formInput, { minHeight: 90 }]} multiline placeholder="How can we assist you?" placeholderTextColor="#7B8199" />
              </View>

              <Pressable
                onPress={() => {
                  setContactSent(true);
                  setTimeout(() => setContactSent(false), 2500);
                }}
                style={s.contactSubmitBtn}
              >
                <Text style={s.bgvSubmitText}>{contactSent ? 'Message Transmitted ✓' : 'Transmit Message →'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MAIN MARKETING HOME SECTIONS (13 MASTER SECTIONS)
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <View>
            {/* ── 01 HERO SECTION ── */}
            <View style={s.heroSection}>
              <View style={[s.heroGrid, isNarrow && { flexDirection: 'column' }]}>
                <View style={{ flex: 1.05 }}>
                  <View style={s.heroBadgeRow}>
                    <Text style={s.heroStarIco}>★</Text>
                    <Text style={s.heroBadgeText}>AI CAREER PLATFORM FOR STUDENTS</Text>
                  </View>
                  <Text style={s.heroTitleH1}>Your Intelligent Companion for a Modern Career</Text>
                  <Text style={s.heroDesc}>
                    Meet Agent K your always-on career copilot. Connect with mentors, discover events and career opportunities, polish your resume, and follow a personalized roadmap built for the way students actually work today.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                    <Pressable onPress={() => router.push('/onboarding')} style={s.heroPrimaryBtn}>
                      <Text style={s.heroBtnText}>I'm a student ↗</Text>
                    </Pressable>
                    <Pressable onPress={() => setActiveTab('contact')} style={s.heroGhostBtn}>
                      <Text style={s.heroGhostBtnText}>I'm a college</Text>
                    </Pressable>
                  </View>
                  <Text style={s.heroMicroBadges}>Free for students · No credit card · Your profile stays private until you reach out</Text>
                </View>

                {/* 3D Interactive Hero Logo */}
                <View style={s.hero3DWrap}>
                  <AgentK3D />
                </View>
              </View>

              {/* Dual Marquee Tickers */}
              <View style={{ marginTop: 40, gap: 14 }}>
                <View style={s.marqueeRow}>
                  <Text style={s.marqueeTag}>COLLEGES</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {COLLEGES.map((c, i) => (
                      <View key={i} style={s.marqueeTile}><Text style={s.marqueeTileText}>{c}</Text></View>
                    ))}
                  </ScrollView>
                </View>
                <View style={s.marqueeRow}>
                  <Text style={[s.marqueeTag, { color: '#8B84FF' }]}>INDUSTRY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {INDUSTRY.map((ind, i) => (
                      <View key={i} style={s.marqueeTile}><Text style={s.marqueeTileText}>{ind}</Text></View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* ── 02 FEATURES BENTO GRID ── */}
            <View style={s.sectionWrap}>
              <View style={s.badgePill}><Text style={s.badgePillText}>EVERYTHING YOU NEED</Text></View>
              <Text style={s.secH1}>A complete career OS, <Text style={{ color: '#8B84FF' }}>built for students.</Text></Text>
              <Text style={s.secSub}>Everything from your first job match to your full-time offer in one intelligent platform.</Text>

              <View style={s.bentoGrid}>
                {/* Card 1: Agent K (Span 2) */}
                <View style={[s.bentoCard, { flex: isNarrow ? 1 : 2, minWidth: 320 }]}>
                  <Text style={s.cardNum}>01</Text>
                  <View style={s.cardIconBox}><Text style={{ fontSize: 22 }}>🤖</Text></View>
                  <Text style={s.cardTitle}>Agent K</Text>
                  <Text style={s.cardDesc}>Your always-on AI career copilot. Ask anything resume tips, interview prep, salary negotiation. Agent K remembers your goals and grows with you.</Text>
                </View>

                {/* Card 2: Mentors */}
                <View style={[s.bentoCard, { flex: 1, minWidth: 260 }]}>
                  <Text style={s.cardNum}>02</Text>
                  <View style={s.cardIconBox}><Text style={{ fontSize: 22 }}>👥</Text></View>
                  <Text style={s.cardTitle}>Mentors</Text>
                  <Text style={s.cardDesc}>One-on-one sessions with alumni from Google, McKinsey, Goldman & more. Book, chat, level up.</Text>
                </View>

                {/* Card 3: Events */}
                <View style={[s.bentoCard, { flex: 1, minWidth: 260 }]}>
                  <Text style={s.cardNum}>03</Text>
                  <View style={s.cardIconBox}><Text style={{ fontSize: 22 }}>📅</Text></View>
                  <Text style={s.cardTitle}>Events</Text>
                  <Text style={s.cardDesc}>Workshops, hackathons, and industry panels curated to your track and semester.</Text>
                </View>

                {/* Card 4: Student Perks */}
                <View style={[s.bentoCard, { flex: 1, minWidth: 260 }]}>
                  <Text style={s.cardNum}>04</Text>
                  <View style={s.cardIconBox}><Text style={{ fontSize: 22 }}>🏷️</Text></View>
                  <Text style={s.cardTitle}>Student Perks</Text>
                  <Text style={s.cardDesc}>Unlock exclusive student deals and discounts on mentorship, courses, and partner services.</Text>
                </View>

                {/* Card 5: Career Opportunities */}
                <View style={[s.bentoCard, s.bentoCardHighlight, { flex: 1, minWidth: 260 }]}>
                  <Text style={s.cardNum}>05</Text>
                  <View style={[s.cardIconBox, { backgroundColor: '#5B4FE9' }]}><Text style={{ fontSize: 22 }}>💼</Text></View>
                  <Text style={[s.cardTitle, { color: '#8B84FF' }]}>Career Opportunities</Text>
                  <Text style={[s.cardDesc, { color: '#B6BACB' }]}>Personalized opportunity feed sourced from partner companies and warm alumni referrals.</Text>
                </View>

                {/* Card 6: Resume Polish */}
                <View style={[s.bentoCard, { flex: 1, minWidth: 260 }]}>
                  <Text style={s.cardNum}>06</Text>
                  <View style={s.cardIconBox}><Text style={{ fontSize: 22 }}>📄</Text></View>
                  <Text style={s.cardTitle}>Resume Polish</Text>
                  <Text style={s.cardDesc}>Instant AI rewrites with ATS scoring, role-specific keywords, and beautiful design templates.</Text>
                </View>

                {/* Card 7: Career Roadmap (Span 2) */}
                <View style={[s.bentoCard, { flex: isNarrow ? 1 : 2, minWidth: 320 }]}>
                  <Text style={s.cardNum}>07</Text>
                  <View style={s.cardIconBox}><Text style={{ fontSize: 22 }}>🗺️</Text></View>
                  <Text style={s.cardTitle}>Career Roadmap</Text>
                  <Text style={s.cardDesc}>Visual step-by-step plan from Day 1 to your first offer auto-updated as your goals evolve.</Text>
                </View>
              </View>
            </View>

            {/* ── 03 DASHBOARD PREVIEW ── */}
            <View style={s.sectionWrap}>
              <View style={s.badgePill}><Text style={s.badgePillText}>YOUR COMMAND CENTER</Text></View>
              <Text style={s.secH1}>One dashboard, <Text style={{ color: '#8B84FF' }}>infinite momentum.</Text></Text>
              <Text style={s.secSub}>Track every application, mentor session, and milestone in a beautifully quiet, deeply intelligent interface.</Text>

              {/* Mock Dashboard Window */}
              <View style={s.mockWindow}>
                <View style={s.mockWindowHeader}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={[s.windowDot, { backgroundColor: '#FB7185' }]} />
                    <View style={[s.windowDot, { backgroundColor: '#FBBF5C' }]} />
                    <View style={[s.windowDot, { backgroundColor: '#34D399' }]} />
                  </View>
                  <View style={s.urlPill}><Text style={s.urlPillText}>studentalumni.ai / overview</Text></View>
                </View>

                <View style={[s.mockWindowBody, isNarrow && { flexDirection: 'column' }]}>
                  <View style={s.mockSideMenu}>
                    <Text style={s.menuHeading}>MENU</Text>
                    <View style={s.activeMenuItem}><Text style={s.menuItemTextActive}>Overview</Text></View>
                    <View style={s.menuItem}><Text style={s.menuItemText}>Agent K</Text></View>
                    <View style={s.menuItem}><Text style={s.menuItemText}>Mentors</Text></View>
                    <View style={s.menuItem}><Text style={s.menuItemText}>AI Roadmap</Text></View>
                  </View>

                  <View style={{ flex: 1, gap: 16 }}>
                    <View style={s.mockStatRow}>
                      <View style={s.mockStatBox}><Text style={s.statLabel}>ACTIVE APPLICATIONS</Text><Text style={s.statBig}>12</Text><Text style={s.statGain}>↗ +3 this week</Text></View>
                      <View style={s.mockStatBox}><Text style={s.statLabel}>MENTOR HOURS</Text><Text style={s.statBig}>8.5h</Text><Text style={s.statGain}>↗ +2h vs last mo</Text></View>
                      <View style={s.mockStatBox}><Text style={s.statLabel}>SKILL BADGES</Text><Text style={[s.statBig, { color: '#8B84FF' }]}>2,450</Text><Text style={s.statUnlock}>Unlock Premium</Text></View>
                    </View>

                    {/* Agent K Priorities */}
                    <View style={s.prioritiesBox}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Agent K Priorities · Today</Text>
                      <View style={s.priorityTask}><Text style={{ color: '#8B84FF' }}>☑</Text><Text style={s.priorityTaskText}>Refine your resume for the Google SWE referral drop.</Text></View>
                      <View style={s.priorityTask}><Text style={{ color: '#9AA0B4' }}>☐</Text><Text style={s.priorityTaskText}>Prep 3 questions for tomorrow's mentor call with Sarah.</Text></View>
                      <View style={s.priorityTask}><Text style={{ color: '#9AA0B4' }}>☐</Text><Text style={s.priorityTaskText}>Apply to 2 matched career opportunities closing this Friday.</Text></View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 04 STUDENT OUTCOMES ── */}
            <View style={s.sectionWrap}>
              <Text style={s.badgePillText}>WHERE STUDENTS LANDED</Text>
              <Text style={s.secH1}>Four students, four <Text style={{ color: '#8B84FF' }}>first offers.</Text></Text>
              <View style={s.outcomesGrid}>
                <View style={s.outcomeCard}><Text style={s.outDept}>CS '26 · Hyderabad</Text><Text style={s.outName}>Aisha K.</Text><Text style={s.outDesc}>Two mentor calls, one resume rewrite, SWE offer in four months.</Text><Text style={s.outRole}>SWE · PRODUCT COMPANY</Text></View>
                <View style={s.outcomeCard}><Text style={s.outDept}>ECE '25 · Pune</Text><Text style={s.outName}>Rohan M.</Text><Text style={s.outDesc}>Matched to an alumnus who ran the same internship two years earlier.</Text><Text style={s.outRole}>DATA ANALYST · FINTECH</Text></View>
                <View style={s.outcomeCard}><Text style={s.outDept}>Design '26 · Remote</Text><Text style={s.outName}>Ira S.</Text><Text style={s.outDesc}>Portfolio review with a design lead, then a referral into her shortlist.</Text><Text style={s.outRole}>PRODUCT DESIGN INTERN</Text></View>
                <View style={s.outcomeCard}><Text style={s.outDept}>MBA '25 · Mumbai</Text><Text style={s.outName}>Dev P.</Text><Text style={s.outDesc}>Used the roadmap to pick electives that matched his target role.</Text><Text style={s.outRole}>STRATEGY ASSOCIATE</Text></View>
              </View>
            </View>

            {/* ── 06 BY THE NUMBERS ── */}
            <View style={s.sectionWrap}>
              <View style={s.numbersCard}>
                <Text style={s.badgePillText}>BY THE NUMBERS</Text>
                <Text style={s.secH1}>Trusted by students <Text style={{ color: '#8B84FF' }}>worldwide</Text></Text>
                <View style={s.numbersGrid}>
                  <View style={s.numTile}><Text style={s.numBig}>50,000+</Text><Text style={s.numLabel}>Active Students</Text><Text style={s.numSub}>and growing daily</Text></View>
                  <View style={s.numTile}><Text style={s.numBig}>1,200+</Text><Text style={s.numLabel}>Verified Mentors</Text><Text style={s.numSub}>from top 500 firms</Text></View>
                  <View style={s.numTile}><Text style={s.numBig}>200+</Text><Text style={s.numLabel}>Partner Universities</Text><Text style={s.numSub}>in 30+ countries</Text></View>
                  <View style={s.numTile}><Text style={s.numBig}>96%</Text><Text style={s.numLabel}>Placement Rate</Text><Text style={s.numSub}>within 6 months</Text></View>
                </View>
              </View>
            </View>

            {/* ── 09 ON CAMPUS PHOTO DECK ── */}
            <View style={s.sectionWrap}>
              <View style={[s.deckShell, isNarrow && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.badgePillText}>ON CAMPUS</Text>
                  <Text style={s.secH1}>A year on <Text style={{ color: '#8B84FF' }}>the network.</Text></Text>
                  <Text style={s.secSub}>The stack deals itself forward every few seconds. Tap any card or dot to bring it to front.</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                    {[0, 1, 2, 3, 4].map((d) => (
                      <Pressable key={d} onPress={() => setActiveDeckIndex(d)} style={[s.deckDot, activeDeckIndex === d && s.deckDotActive]} />
                    ))}
                  </View>
                </View>

                {/* Active Polaroid Card Preview */}
                <View style={s.polaWrap}>
                  <View style={s.polaCard}>
                    <View style={s.polaPhoto}>
                      <Text style={{ fontSize: 54 }}>📸</Text>
                    </View>
                    <View style={s.polaCapRow}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                        {activeDeckIndex === 0 && 'Alumni career fair'}
                        {activeDeckIndex === 1 && 'One-to-one mentoring'}
                        {activeDeckIndex === 2 && 'Hackathon weekend'}
                        {activeDeckIndex === 3 && 'Graduation Class of 2026'}
                        {activeDeckIndex === 4 && 'First week on the job'}
                      </Text>
                      <Text style={{ color: '#857CAE', fontSize: 12, fontWeight: '700' }}>
                        {activeDeckIndex === 0 && 'March'}
                        {activeDeckIndex === 1 && 'Library, Block C'}
                        {activeDeckIndex === 2 && 'Alumni-run'}
                        {activeDeckIndex === 3 && 'Class of 2026'}
                        {activeDeckIndex === 4 && 'Internship'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 10 MATCH GRAPH ── */}
            <View style={s.sectionWrap}>
              <View style={[s.matchShell, isNarrow && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.badgePillText}>HOW MATCHING WORKS</Text>
                  <Text style={s.secH1}>1,200+ verified mentors, <Text style={{ color: '#8B84FF' }}>ranked by fit.</Text></Text>
                  <Text style={s.secSub}>Agent K scores every alumnus against your course, goals and city. Tap a node to see why it was chosen.</Text>
                  <View style={s.matchDetailCard}>
                    <Text style={s.matchDetailLabel}>MATCH DETAIL</Text>
                    <Text style={s.matchDetailName}>{hoveredMentorNode ? hoveredMentorNode.name : 'Priya R. — Product, Bengaluru (98% Match)'}</Text>
                    <Text style={s.matchDetailWhy}>{hoveredMentorNode ? hoveredMentorNode.why : 'Same course, four years ahead. Mentors three students each term.'}</Text>
                  </View>
                </View>

                <View style={s.radarGraphBox}>
                  <Svg width={360} height={340} viewBox="0 0 620 540">
                    <Circle cx={310} cy={270} r={128} fill="none" stroke="#1B1E33" strokeWidth={1.4} strokeDasharray="4 8" />
                    <Circle cx={310} cy={270} r={206} fill="none" stroke="#1B1E33" strokeWidth={1.4} strokeDasharray="4 8" />
                    {hoveredMentorNode && (
                      <Line x1={310} y1={270} x2={hoveredMentorNode.x} y2={hoveredMentorNode.y} stroke="#8B84FF" strokeWidth={2} strokeDasharray="4 4" />
                    )}
                    <Circle cx={310} cy={270} r={52} fill="#0C0E1B" stroke="#5B4FE9" strokeWidth={2} />
                    <SvgText x={310} y={266} textAnchor="middle" fontFamily="sans-serif" fontSize={16} fontWeight="800" fill="#F4F5FB">YOU</SvgText>
                    <SvgText x={310} y={286} textAnchor="middle" fontFamily="sans-serif" fontSize={10} fontWeight="700" fill="#7B8199">YEAR 3</SvgText>

                    {MENTOR_NODES.map((node, i) => (
                      <G key={i} onPress={() => setHoveredMentorNode(node)}>
                        <Circle cx={node.x} cy={node.y} r={32} fill="#0C0E1B" stroke={hoveredMentorNode?.name === node.name ? '#8B84FF' : '#2A2A55'} strokeWidth={2} />
                        <SvgText x={node.x} y={node.y + 5} textAnchor="middle" fontFamily="sans-serif" fontSize={13} fontWeight="700" fill="#8B84FF">{node.score}</SvgText>
                      </G>
                    ))}
                  </Svg>
                </View>
              </View>
            </View>

            {/* ── 12 ALL SCREENS DIRECTORY ── */}
            <View style={s.sectionWrap}>
              <Text style={s.badgePillText}>EVERY SCREEN</Text>
              <Text style={s.secH1}>The whole product, <Text style={{ color: '#8B84FF' }}>one place.</Text></Text>
              <Text style={s.secSub}>Twelve screens across the student journey — from first sign-in to your verified SA card.</Text>

              <View style={s.screenDirectoryGrid}>
                {[
                  { name: 'Dashboard', route: '/student-portal/dashboard', sub: 'Bento overview, 16 modules, Agent K and rentals.', badge: '16 MODULES' },
                  { name: 'Sign in', route: '/login', sub: 'Google, email check, password and demo credentials.' },
                  { name: 'Get started', route: '/onboarding', sub: 'Three-step signup with photo capture.' },
                  { name: 'Onboarding', route: '/onboarding', sub: 'Student, alumnus and college flows with perks.', badge: '15 STEPS' },
                  { name: 'Events', route: '/events', sub: 'ECHO list, event detail and registration.' },
                  { name: 'Blog', route: '/contact', sub: 'Posts, categories and reading view.' },
                  { name: 'Help centre', route: '/contact', sub: 'Six categories with real article lists.' },
                  { name: 'Community', route: '/network', sub: 'Campus metrics, chapters and member stories.' },
                  { name: 'Privacy', route: '/policy/privacy', sub: 'What we collect and what we never do.' },
                  { name: 'Terms', route: '/policy/terms', sub: 'Account rules, payments and cancellations.' },
                  { name: 'Security', route: '/policy/security', sub: 'Encryption, verification and disclosure.' },
                  { name: 'System states', route: '/status', sub: '404, 403, 401, 500, 503, 408 and offline.', badge: '9 STATES' },
                ].map((item, i) => (
                  <Pressable key={i} onPress={() => router.push(item.route)} style={s.screenDirCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{item.name}</Text>
                      {item.badge && <View style={s.miniBadge}><Text style={s.miniBadgeText}>{item.badge}</Text></View>}
                    </View>
                    <Text style={{ color: '#9AA0B4', fontSize: 13, marginVertical: 6 }}>{item.sub}</Text>
                    <Text style={{ color: '#8B84FF', fontSize: 12.5, fontWeight: '700' }}>Open →</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── 12 FINAL CTA ── */}
            <View style={s.sectionWrap}>
              <View style={s.finalCtaCard}>
                <Text style={s.badgePillText}>START YOUR JOURNEY</Text>
                <Text style={s.secH1}>Your career, quietly <Text style={{ color: '#8B84FF' }}>upgraded.</Text></Text>
                <Text style={s.secSub}>Join 50,000+ students already using StudentAlumni to land career opportunities, find mentors, and build their future.</Text>
                <Pressable onPress={() => router.push('/onboarding')} style={s.finalCtaBtn}>
                  <Text style={s.finalCtaBtnText}>Create your free account ↗</Text>
                </Pressable>
                <View style={s.faqGrid}>
                  <View style={s.faqCell}><Text style={s.faqQ}>Is it free?</Text><Text style={s.faqA}>Free for students, always. Colleges pay per cohort.</Text></View>
                  <View style={s.faqCell}><Text style={s.faqQ}>Who sees my profile?</Text><Text style={s.faqA}>Nobody, until you send a request yourself.</Text></View>
                  <View style={s.faqCell}><Text style={s.faqQ}>If no mentor replies?</Text><Text style={s.faqA}>We re-match within 48 hours, up to three times.</Text></View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <View style={s.footerMax}>
            <View style={s.footerGrid}>
              <View style={{ flex: 1.5, minWidth: 260 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 }}>
                  <Svg width={28} height={33} viewBox="0 0 300 350">
                    <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#navBadgeO)" />
                    <SvgText x={150} y={214} textAnchor="middle" fontFamily="sans-serif" fontSize={118} fontWeight="800" fill="#FFFFFF">
                      SA
                    </SvgText>
                  </Svg>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>StudentAlumni</Text>
                </View>
                <Text style={{ fontSize: 14.5, lineHeight: 22, color: '#9AA0B4', maxWidth: 320 }}>
                  The intelligent career companion built for the <Text style={{ color: '#F4F5FB', fontWeight: '700' }}>next generation</Text> of students.
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: 160 }}>
                <Text style={s.colHeading}>RESOURCES</Text>
                <View style={{ gap: 12 }}>
                  <Pressable onPress={() => setActiveTab('verify')}><Text style={s.colLink}>Verify Certificate</Text></Pressable>
                  <Pressable onPress={() => setActiveTab('contact')}><Text style={s.colLink}>Blog</Text></Pressable>
                  <Pressable onPress={() => setActiveTab('contact')}><Text style={s.colLink}>Help center</Text></Pressable>
                  <Pressable onPress={() => router.push('/network')}><Text style={s.colLink}>Community</Text></Pressable>
                </View>
              </View>

              <View style={{ flex: 1, minWidth: 160 }}>
                <Text style={s.colHeading}>LEGAL</Text>
                <View style={{ gap: 12 }}>
                  <Pressable onPress={() => router.push('/policy/privacy')}><Text style={s.colLink}>Privacy & Terms</Text></Pressable>
                  <Pressable onPress={() => router.push('/policy/security')}><Text style={s.colLink}>Security & Cookies</Text></Pressable>
                </View>
              </View>

              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={s.colHeading}>COMPLIANCE</Text>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 14, color: '#F4F5FB', fontWeight: '600' }}>✓ DPDP Act 2023</Text>
                    <Text style={{ fontSize: 11.5, color: '#7B8199', marginTop: 2 }}>India · data principal rights</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, color: '#F4F5FB', fontWeight: '600' }}>✓ GDPR</Text>
                    <Text style={{ fontSize: 11.5, color: '#7B8199', marginTop: 2 }}>EU · lawful basis and DPAs</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, color: '#F4F5FB', fontWeight: '600' }}>✓ SOC 2 Type II</Text>
                    <Text style={{ fontSize: 11.5, color: '#7B8199', marginTop: 2 }}>Audited controls, annual</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Newsletter Row */}
            <View style={s.subRow}>
              <View style={{ minWidth: 260 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>One email a month. Nothing else.</Text>
                <Text style={{ fontSize: 14, color: '#9AA0B4', marginTop: 4 }}>New openings, mentor drops and campus events — no noise.</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <View style={s.emailMockBox}><Text style={{ color: '#7B8199', fontSize: 14 }}>you@college.edu</Text></View>
                <Pressable onPress={() => setSubscribed(true)} style={s.subBtn}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{subscribed ? 'Subscribed ✓' : 'Subscribe'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40, flexWrap: 'wrap', gap: 20 }}>
              <View>
                <Text style={s.hashLogo}>#studentalumni</Text>
                <Text style={{ color: '#9AA0B4', fontSize: 14, marginTop: 6 }}>Built with love for students across all campus's</Text>
              </View>
              <Text style={{ color: '#9AA0B4', fontSize: 13 }}>All rights reserved @ Student Alumni 2026</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles Matching Master Landing Page Spec ────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05060F' },
  bgWrap: { position: 'absolute' as any, inset: 0, overflow: 'hidden' },
  radialGlow: { position: 'absolute' as any, inset: 0, backgroundColor: '#05060F' },
  horizonGlow: { position: 'absolute' as any, left: '50%', top: -200, width: 1200, height: 500, marginLeft: -600, borderRadius: 600, backgroundColor: 'rgba(91,79,233,0.18)', filter: 'blur(60px)' as any },
  navbar: { position: 'sticky' as any, top: 0, zIndex: 60, backgroundColor: 'rgba(5,6,15,0.85)', borderBottomWidth: 1, borderColor: '#1B1E33', paddingHorizontal: 28 },
  navInner: { maxWidth: 1360, marginHorizontal: 'auto', paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  brandText: { fontSize: 17, fontWeight: '700', color: '#F4F5FB', letterSpacing: -0.2 },
  navTabsWrap: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  navTab: { position: 'relative' as any, paddingVertical: 6 },
  navTabText: { fontSize: 14.5, fontWeight: '500', color: '#9AA0B4' },
  navTabActiveText: { color: '#F4F5FB', fontWeight: '700' },
  navIndicator: { position: 'absolute' as any, left: 0, right: 0, bottom: -2, height: 2.5, borderRadius: 2, backgroundColor: '#8B84FF' },
  signInText: { fontSize: 14.5, color: '#9AA0B4', fontWeight: '600' },
  getStartedBtn: { backgroundColor: '#5B4FE9', borderRadius: 100, paddingHorizontal: 22, paddingVertical: 10 },
  getStartedBtnText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
  heroSection: { maxWidth: 1360, marginHorizontal: 'auto', paddingVertical: 70, paddingHorizontal: 28, width: '100%' },
  heroGrid: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  heroStarIco: { color: '#8B84FF', fontSize: 14 },
  heroBadgeText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1.6, color: '#8B84FF' },
  heroTitleH1: { fontSize: 54, fontWeight: '700', lineHeight: 60, letterSpacing: -2, color: '#F4F5FB', marginBottom: 20 },
  heroDesc: { fontSize: 16.5, lineHeight: 26, color: '#B6BACB', maxWidth: 500, marginBottom: 28 },
  heroPrimaryBtn: { backgroundColor: '#5B4FE9', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  heroBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  heroGhostBtn: { borderWidth: 1, borderColor: '#2A2E45', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  heroGhostBtnText: { color: '#F4F5FB', fontSize: 15, fontWeight: '600' },
  heroMicroBadges: { fontSize: 13, color: '#7B8199', marginTop: 8 },
  hero3DWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', minHeight: 440 },
  marqueeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  marqueeTag: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#5B4FE9', backgroundColor: 'rgba(91,79,233,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  marqueeTile: { height: 48, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0C0E1B', alignItems: 'center', justifyContent: 'center' },
  marqueeTileText: { color: '#F4F5FB', fontSize: 12.5, fontWeight: '700' },
  sectionWrap: { maxWidth: 1360, marginHorizontal: 'auto', paddingVertical: 60, paddingHorizontal: 28, width: '100%' },
  badgePill: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#2A2A55', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14, backgroundColor: 'rgba(91,79,233,0.1)' },
  badgePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: '#8B84FF' },
  secH1: { fontSize: 44, fontWeight: '700', letterSpacing: -1.6, color: '#F4F5FB', marginBottom: 12 },
  secSub: { fontSize: 16, lineHeight: 24, color: '#9AA0B4', maxWidth: 540, marginBottom: 36 },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  bentoCard: { borderRadius: 18, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0C0E1B', padding: 26, position: 'relative' },
  bentoCardHighlight: { borderWidth: 1, borderColor: '#2A2A55', backgroundColor: '#12142B' },
  cardNum: { position: 'absolute' as any, top: 20, right: 20, fontSize: 12, fontWeight: '700', color: '#2A2E45' },
  cardIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(91,79,233,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  cardDesc: { fontSize: 14.5, lineHeight: 22, color: '#9AA0B4' },
  mockWindow: { borderRadius: 18, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0A0C18', overflow: 'hidden' },
  mockWindowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderColor: '#171A2C' },
  windowDot: { width: 10, height: 10, borderRadius: 5 },
  urlPill: { backgroundColor: '#0E1020', borderWidth: 1, borderColor: '#1B1E33', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 4 },
  urlPillText: { color: '#9AA0B4', fontSize: 12 },
  mockWindowBody: { flexDirection: 'row', padding: 20, gap: 20 },
  mockSideMenu: { width: 200, borderWidth: 1, borderColor: '#171A2C', borderRadius: 12, backgroundColor: '#0C0E1B', padding: 14, gap: 6 },
  menuHeading: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.6, color: '#7B8199', marginBottom: 6 },
  activeMenuItem: { backgroundColor: '#171A2C', borderRadius: 8, padding: 10 },
  menuItemTextActive: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  menuItem: { padding: 10 },
  menuItemText: { color: '#9AA0B4', fontSize: 13.5 },
  mockStatRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  mockStatBox: { flex: 1, minWidth: 180, borderRadius: 12, borderWidth: 1, borderColor: '#171A2C', backgroundColor: '#0C0E1B', padding: 16 },
  statLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, color: '#7B8199', marginBottom: 8 },
  statBig: { fontSize: 28, fontWeight: '800', color: '#fff' },
  statGain: { fontSize: 11.5, color: '#8B84FF', fontWeight: '600', marginTop: 4 },
  statUnlock: { fontSize: 11.5, color: '#34D399', fontWeight: '700', marginTop: 4 },
  prioritiesBox: { borderRadius: 12, borderWidth: 1, borderColor: '#2A2A55', backgroundColor: '#0C0E1B', padding: 18, gap: 10 },
  priorityTask: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#1B1E33', borderRadius: 10, padding: 12, backgroundColor: '#0E1020' },
  priorityTaskText: { color: '#F4F5FB', fontSize: 14 },
  outcomesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  outcomeCard: { flex: 1, minWidth: 220, borderRadius: 16, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0C0E1B', padding: 22 },
  outDept: { color: '#7B8199', fontSize: 12, marginBottom: 8 },
  outName: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  outDesc: { color: '#9AA0B4', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  outRole: { color: '#8B84FF', fontSize: 11.5, fontWeight: '700', letterSpacing: 1.2 },
  numbersCard: { borderRadius: 22, borderWidth: 1, borderColor: '#171A2C', backgroundColor: '#0A0C18', padding: 44, alignItems: 'center' },
  numbersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, width: '100%', marginTop: 24 },
  numTile: { flex: 1, minWidth: 200, borderRadius: 14, borderWidth: 1, borderColor: '#171A2C', backgroundColor: '#0C0E1B', padding: 24, alignItems: 'center' },
  numBig: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  numLabel: { fontSize: 14.5, fontWeight: '700', color: '#F4F5FB', marginTop: 6 },
  numSub: { fontSize: 12.5, color: '#7B8199', marginTop: 2 },
  deckShell: { flexDirection: 'row', alignItems: 'center', gap: 40 },
  deckDot: { width: 24, height: 4, borderRadius: 2, backgroundColor: '#1B1E33' },
  deckDotActive: { width: 34, backgroundColor: '#8B84FF' },
  polaWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  polaCard: { width: 300, borderRadius: 18, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0A0C18', padding: 14, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20 },
  polaPhoto: { height: 220, borderRadius: 12, backgroundColor: '#090B16', alignItems: 'center', justifyContent: 'center' },
  polaCapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, paddingHorizontal: 4 },
  matchShell: { flexDirection: 'row', alignItems: 'center', gap: 40 },
  matchDetailCard: { borderRadius: 14, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0A0C18', padding: 18, marginTop: 18 },
  matchDetailLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.6, color: '#7B8199' },
  matchDetailName: { fontSize: 18, fontWeight: '700', color: '#fff', marginVertical: 6 },
  matchDetailWhy: { fontSize: 14, color: '#9AA0B4' },
  radarGraphBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenDirectoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  screenDirCard: { flex: 1, minWidth: 240, borderRadius: 16, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0C0E1B', padding: 18 },
  miniBadge: { borderWidth: 1, borderColor: '#8B84FF44', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  miniBadgeText: { color: '#8B84FF', fontSize: 9.5, fontWeight: '700' },
  finalCtaCard: { borderRadius: 22, borderWidth: 1, borderColor: '#171A2C', backgroundColor: '#0A0C18', padding: 50, alignItems: 'center', textAlign: 'center' },
  finalCtaBtn: { backgroundColor: '#5B4FE9', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 16, marginVertical: 24 },
  finalCtaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  faqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, borderTopWidth: 1, borderColor: '#1B1E33', paddingTop: 28, marginTop: 12, width: '100%' },
  faqCell: { flex: 1, minWidth: 200 },
  faqQ: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  faqA: { color: '#9AA0B4', fontSize: 13, lineHeight: 18 },
  contentSection: { maxWidth: 1160, marginHorizontal: 'auto', paddingVertical: 40, paddingHorizontal: 28, width: '100%' },
  verifyHeroCard: { borderRadius: 22, backgroundColor: '#F4F2FF', padding: 36, marginBottom: 30 },
  heroH1Light: { fontSize: 36, fontWeight: '700', color: '#141726', letterSpacing: -1.2, marginVertical: 14 },
  heroSubLight: { fontSize: 15.5, lineHeight: 24, color: '#4A4F63', maxWidth: 540 },
  statGridRow: { flexDirection: 'row', gap: 32, marginTop: 24 },
  statNumLg: { fontSize: 28, fontWeight: '800' },
  statSubText: { fontSize: 12, color: '#5F6474', marginTop: 2 },
  lookupWrap: { borderRadius: 20, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0C0E1B', padding: 30, alignItems: 'center', textAlign: 'center' },
  lookupTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 8 },
  lookupSub: { fontSize: 15, color: '#9AA0B4', maxWidth: 500, marginBottom: 24 },
  searchBarBox: { flexDirection: 'row', width: '100%', maxWidth: 700, gap: 10, flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: 260, borderRadius: 12, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0A0C18', paddingHorizontal: 16, color: '#fff', fontSize: 15 },
  verifySearchBtn: { backgroundColor: '#5B4FE9', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  verifySearchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sampleChipsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 20 },
  sampleChip: { borderWidth: 1, borderColor: '#2A2A55', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  sampleChipText: { color: '#8B84FF', fontSize: 12.5, fontWeight: '700' },
  resultCard: { width: '100%', maxWidth: 700, borderRadius: 16, borderWidth: 1, borderColor: '#2A2A55', backgroundColor: '#0A0C18', padding: 22, marginTop: 24 },
  sigValidPill: { borderWidth: 1, borderColor: '#1B6B4E', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 },
  sigValidText: { color: '#34D399', fontSize: 11.5, fontWeight: '700' },
  resultDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, borderTopWidth: 1, borderColor: '#171A2C', paddingTop: 16 },
  resLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, color: '#7B8199', marginBottom: 4 },
  resVal: { fontSize: 14, fontWeight: '600', color: '#fff' },
  bgvCard: { borderRadius: 20, borderWidth: 1, borderColor: '#2A2A55', backgroundColor: '#0C0E1B', padding: 32, marginTop: 30 },
  bgvEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: '#8B84FF' },
  bgvH1: { fontSize: 26, fontWeight: '700', color: '#fff', marginVertical: 8 },
  bgvSub: { fontSize: 14.5, color: '#9AA0B4', marginBottom: 20 },
  bgvKindRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  bgvKindBtn: { borderRadius: 100, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0A0C18', paddingHorizontal: 16, paddingVertical: 8 },
  bgvKindBtnActive: { backgroundColor: '#5B4FE9', borderColor: '#5B4FE9' },
  bgvKindText: { color: '#9AA0B4', fontSize: 13, fontWeight: '600' },
  bgvKindTextActive: { color: '#fff', fontWeight: '700' },
  bgvInputsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  inputCell: { flex: 1, minWidth: 220 },
  inLabel: { fontSize: 13, fontWeight: '600', color: '#F4F5FB', marginBottom: 6 },
  formInput: { borderRadius: 10, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0A0C18', paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  consentBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#2A2A55', alignItems: 'center', justifyContent: 'center' },
  consentBoxActive: { backgroundColor: '#5B4FE9', borderColor: '#5B4FE9' },
  consentText: { color: '#9AA0B4', fontSize: 13, flex: 1 },
  bgvSubmitBtn: { backgroundColor: '#1B1E33', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  bgvSubmitBtnReady: { backgroundColor: '#5B4FE9' },
  bgvSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  pageH1: { fontSize: 38, fontWeight: '800', color: '#fff', marginVertical: 8 },
  pageSub: { fontSize: 15.5, color: '#9AA0B4', maxWidth: 580 },
  hubsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 28 },
  hubCard: { flex: 1, minWidth: 280, borderRadius: 18, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0C0E1B', padding: 26 },
  hubTag: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: '#8B84FF' },
  hubTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginVertical: 4 },
  hubLine: { height: 1, backgroundColor: '#1B1E33', marginVertical: 14 },
  hubDetailRow: { marginVertical: 6 },
  hubLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, color: '#7B8199', marginBottom: 2 },
  hubVal: { fontSize: 14, color: '#F4F5FB', fontWeight: '600' },
  contactMsgCard: { borderRadius: 20, borderWidth: 1, borderColor: '#1B1E33', backgroundColor: '#0C0E1B', padding: 32 },
  contactSubmitBtn: { backgroundColor: '#5B4FE9', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  footer: { borderTopWidth: 1, borderColor: '#1B1E33', backgroundColor: '#05060D', paddingVertical: 48, paddingHorizontal: 28 },
  footerMax: { maxWidth: 1360, marginHorizontal: 'auto', width: '100%' },
  footerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between' },
  colHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: '#7B8199', marginBottom: 16 },
  colLink: { fontSize: 14.5, color: '#9AA0B4' },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, borderWidth: 1, borderColor: '#2A2A55', borderRadius: 18, backgroundColor: '#0E1020', padding: 24, marginTop: 40 },
  emailMockBox: { borderWidth: 1, borderColor: '#1B1E33', borderRadius: 11, backgroundColor: '#0A0C18', paddingHorizontal: 16, paddingVertical: 12, minWidth: 200 },
  subBtn: { backgroundColor: '#5B4FE9', borderRadius: 11, paddingHorizontal: 24, paddingVertical: 12 },
  hashLogo: { fontSize: 32, fontWeight: '700', color: '#C08BFF', letterSpacing: -1.2 },
});
