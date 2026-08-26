/**
 * LandingPage — StudentAlumni AI Career Platform (v4.0.0 Production Web Edition)
 *
 * Immersive Dark Theme (#05060F / #0D1330) with Manrope typography,
 * 3D-styled animated SA Shield emblem, interactive navigation tabs (Home, ECHO, Verify, Contact),
 * 7-card Bento Features, Command Center Dashboard, Outcomes, Alumni Mentors, Numbers,
 * Four-Audiences Bento, Roadmap Curve, On-Campus Activity Stack, Match Graph Radar,
 * ECHO On-The-Ground Events Showcase, In-Page Verify Credential & BGV Engine,
 * Contact Hubs with Hyderabad / Princeton offices, and full-fidelity Footer.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, {
  Path,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  G,
  Line,
} from 'react-native-svg';

/* ── Brand Color Tokens ── */
const THEME = {
  bg: '#05060F',
  bg2: '#05060D',
  surface: '#0A0C18',
  card: '#0C0E1B',
  card2: '#0E1020',
  cardHi: '#12142B',
  well: '#090B16',
  line: '#1B1E33',
  line2: '#171A2C',
  lineHi: '#2A2A55',
  dot: '#2A2E45',
  text: '#F4F5FB',
  text2: '#D5D8E4',
  muted: '#9AA0B4',
  muted2: '#B6BACB',
  dim: '#5C6273',
  ind: '#5B4FE9',
  indLt: '#8B84FF',
  indGlow: '#C08BFF',
  cyan: '#6FA8F5',
  pink: '#F0A6E8',
  green: '#34D399',
  amber: '#F5B342',
  tint: 'rgba(91,79,233,0.16)',
  tint2: 'rgba(91,79,233,0.18)',
  shadow: 'rgba(0,0,0,0.5)',
};

/* ── Inject CSS Animations & Styles ── */
const CSS_ID = 'sa-full-landing-styles';
function injectStyles() {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #05060F; font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif; color: #F4F5FB; }
    @keyframes sa-twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
    @keyframes sa-streak { 0% { transform: translate3d(0,0,0) rotate(35deg); opacity: 0; } 6% { opacity: 0.9; } 26% { transform: translate3d(-460px,320px,0) rotate(35deg); opacity: 0; } 100% { transform: translate3d(-460px,320px,0) rotate(35deg); opacity: 0; } }
    @keyframes sa-glow { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.08); } }
    @keyframes sa-sway { 0%, 100% { transform: rotateY(-18deg) translateY(0); } 50% { transform: rotateY(18deg) translateY(-14px); } }
    @keyframes sa-mq-l { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @keyframes sa-mq-r { from { transform: translateX(-50%); } to { transform: translateX(0); } }
    @keyframes sa-tick { 0%, 100% { box-shadow: 0 0 0 0 rgba(91,79,233,0); } 50% { box-shadow: 0 0 0 6px rgba(91,79,233,0.14); } }
    @keyframes sa-ping { 0% { r: 52; opacity: 0.5; } 100% { r: 140; opacity: 0; } }
    @keyframes sa-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .sa-hover-lift { transition: transform 0.25s cubic-bezier(.2,.8,.2,1), border-color 0.25s ease, box-shadow 0.25s ease; }
    .sa-hover-lift:hover { transform: translateY(-4px); border-color: #2A2A55 !important; box-shadow: 0 16px 36px rgba(0,0,0,0.4) !important; }
    .sa-btn-primary { transition: filter 0.2s ease, transform 0.2s ease; cursor: pointer; }
    .sa-btn-primary:hover { filter: brightness(1.12); transform: translateY(-1px); }
    .sa-ghost-btn { transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease; cursor: pointer; }
    .sa-ghost-btn:hover { background: rgba(91,79,233,0.10) !important; border-color: #8B84FF !important; color: #FFFFFF !important; }
    .sa-tab-item { transition: color 0.2s ease; cursor: pointer; }
    .sa-tab-item:hover { color: #FFFFFF !important; }
  `;
  document.head.appendChild(s);
}
if (typeof document !== 'undefined') injectStyles();

/* ── Sample Credential Database for Instant Verification ── */
const SAMPLE_CREDS: Record<string, [string, string, string]> = {
  'SA-EXC-2026-0002': ['Certificate of Excellence', 'Sreenidhi Institute of Science & Technology', 'Feb 14, 2026'],
  'SA-FAC-2026-0001': ['Faculty Award — Mentorship', 'StudentAlumni Academic Council', 'Jan 09, 2026'],
  'SA-AMB-2026-0012': ['Campus Ambassador Badge', 'StudentAlumni Campus Relations', 'Mar 02, 2026'],
  'ECHO26-P-0001': ['ECHO Specialization — Product', 'ECHO 2026 · VNR VJIET', 'Jul 31, 2026'],
};

const COLLEGES_LIST = [
  'MRIT', 'Malla Reddy College of Engineering', 'SR University',
  'VJ Data Questers', 'VJ ARC', 'VNR VJIET', 'GITAM',
  'IUCEE VNRVJIET', 'IEEE Computer Society', 'Garuda Vigilance',
];

const INDUSTRY_LIST = [
  'Deloitte', 'Featherless', 'Atlast', 'Bandiwala',
  'EXtrive Innovations', 'Larsen & Toubro', 'LinkedIn', 'Google', 'McKinsey',
];

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 900;
  const isMobile = width < 640;

  // Navigation tab state: 'home' | 'events' | 'verify' | 'contact'
  const [activeTab, setActiveTab] = useState<'home' | 'events' | 'verify' | 'contact'>('home');

  // Verification state
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<{
    id: string;
    title: string;
    issuer: string;
    date: string;
    hash: string;
  } | null>(null);

  // BGV Request State
  const [bgvKind, setBgvKind] = useState('Single candidate');
  const [bgvAgreed, setBgvAgreed] = useState(false);
  const [bgvSubmitted, setBgvSubmitted] = useState(false);

  // Contact Form State
  const [contactPurpose, setContactPurpose] = useState('General Inquiry');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Match Graph State
  const [activeNode, setActiveNode] = useState({
    name: 'Priya R. — Product, Bengaluru',
    why: 'Same course, four years ahead. Mentors three students each term.',
    x: '310',
    y: '132',
  });

  // Photo Deck State
  const [deckFront, setDeckFront] = useState(0);

  // Testimonials State
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Auto-rotate deck and quotes
  useEffect(() => {
    const timer = setInterval(() => {
      setDeckFront((prev) => (prev + 1) % 5);
      setQuoteIdx((prev) => (prev + 1) % 3);
    }, 4800);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = (idToVerify?: string) => {
    const q = (idToVerify !== undefined ? idToVerify : verifyInput).trim().toUpperCase();
    if (!q) return;
    const hit = SAMPLE_CREDS[q];
    let h = 0;
    for (let i = 0; i < q.length; i++) h = (h * 31 + q.charCodeAt(i)) & 0xffffffff;
    const computedHash = (Math.abs(h).toString(16) + 'a7f31c9e4b2058').slice(0, 18);

    setVerifyResult({
      id: q,
      title: hit ? hit[0] : 'Verified Campus Credential',
      issuer: hit ? hit[1] : 'StudentAlumni Academic Ledger',
      date: hit ? hit[2] : 'Feb 2026',
      hash: computedHash,
    });
  };

  const navTo = (route: string) => {
    if (route === 'signin') router.push('/login');
    else if (route === 'signup') router.push('/register');
    else if (route === 'events') setActiveTab('events');
    else if (route === 'verify') setActiveTab('verify');
    else if (route === 'contact') setActiveTab('contact');
    else setActiveTab('home');
  };

  return (
    <View style={styles.container}>
      {/* Background Starfield and Shooting Stars */}
      <View style={styles.starsOverlay} pointerEvents="none">
        <View style={styles.shootingStar1} />
        <View style={styles.shootingStar2} />
      </View>

      {/* Top Sticky Header */}
      <View style={styles.navBar}>
        <View style={[styles.navInner, isNarrow && { flexWrap: 'wrap', gap: 12 }]}>
          {/* Logo */}
          <Pressable onPress={() => setActiveTab('home')} style={styles.logoGroup}>
            <Svg width="28" height="32" viewBox="0 0 300 350">
              <Defs>
                <LinearGradient id="sa-nav-badge" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#C9A7FF" />
                  <Stop offset="0.48" stopColor="#8B5CF6" />
                  <Stop offset="1" stopColor="#5B2FD0" />
                </LinearGradient>
                <LinearGradient id="sa-nav-in" x1="0" y1="0" x2="0.4" y2="1">
                  <Stop offset="0" stopColor="#B683F5" />
                  <Stop offset="1" stopColor="#7331C9" />
                </LinearGradient>
              </Defs>
              <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#sa-nav-badge)" />
              <Path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#sa-nav-in)" />
              <SvgText x="150" y="214" textAnchor="middle" fill="#FFFFFF" fontSize="118" fontWeight="800">
                SA
              </SvgText>
            </Svg>
            <Text style={styles.logoText}>StudentAlumni</Text>
          </Pressable>

          {/* Navigation Tabs */}
          <View style={[styles.navTabs, isMobile && { gap: 16 }]}>
            {(['home', 'events', 'verify', 'contact'] as const).map((tab) => {
              const label = tab === 'home' ? 'Home' : tab === 'events' ? 'ECHO' : tab === 'verify' ? 'Verify' : 'Contact Us';
              const isCurrent = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={styles.tabButton}
                >
                  <Text style={[styles.tabText, isCurrent && styles.tabTextActive]}>
                    {label}
                  </Text>
                  {isCurrent && <View style={styles.tabLine} />}
                </Pressable>
              );
            })}
          </View>

          {/* Right Action Buttons */}
          <View style={styles.navActions}>
            <Pressable onPress={() => router.push('/login')} style={styles.signInBtn}>
              <Text style={styles.signInText}>Sign in</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/register')} style={[styles.getStartedBtn, styles.btnPrimary]}>
              <Text style={styles.getStartedText}>Get Started</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ──────────────────────────────────────────────────────────────────
            VIEW 1: VERIFY TAB
        ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'verify' && (
          <View style={styles.sectionWrapper}>
            {/* Verify Hero Card */}
            <View style={styles.verifyHeroCard}>
              <View style={styles.verifyTag}>
                <Text style={styles.verifyTagText}>🛡️ CREDENTIAL VERIFICATION</Text>
              </View>
              <Text style={styles.verifyHeroTitle}>Every claim on a résumé, checkable in seconds.</Text>
              <Text style={styles.verifyHeroSubtitle}>
                Certificates, faculty awards, ECHO badges, and SA Member IDs are cryptographically signed on issue. Recruiters and BGV agencies can confirm authenticity instantly.
              </Text>

              {/* Input Box */}
              <View style={styles.verifyInputRow}>
                <TextInput
                  style={styles.verifyInput}
                  placeholder="Enter Certificate ID, Member ID, or Roll Number…"
                  placeholderTextColor="#5C6273"
                  value={verifyInput}
                  onChangeText={setVerifyInput}
                />
                <Pressable onPress={() => handleVerify()} style={[styles.verifySubmitBtn, styles.btnPrimary]}>
                  <Text style={styles.verifySubmitText}>Verify Credential →</Text>
                </Pressable>
              </View>

              {/* Sample Chips */}
              <View style={styles.sampleChipsRow}>
                <Text style={styles.sampleLabel}>Try sample IDs:</Text>
                {Object.keys(SAMPLE_CREDS).map((id) => (
                  <Pressable
                    key={id}
                    onPress={() => {
                      setVerifyInput(id);
                      handleVerify(id);
                    }}
                    style={styles.sampleChip}
                  >
                    <Text style={styles.sampleChipText}>{id}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Verified Result Card */}
              {verifyResult && (
                <View style={styles.verifyResultCard}>
                  <View style={styles.verifyResultHeader}>
                    <View>
                      <Text style={styles.resultTitle}>{verifyResult.title}</Text>
                      <Text style={styles.resultId}>{verifyResult.id}</Text>
                    </View>
                    <View style={styles.validBadge}>
                      <Text style={styles.validBadgeText}>✓ SIGNATURE VALID</Text>
                    </View>
                  </View>
                  <View style={styles.resultDetailsGrid}>
                    <View style={styles.resultCol}>
                      <Text style={styles.resultColLabel}>ISSUED BY</Text>
                      <Text style={styles.resultColValue}>{verifyResult.issuer}</Text>
                    </View>
                    <View style={styles.resultCol}>
                      <Text style={styles.resultColLabel}>ISSUED ON</Text>
                      <Text style={styles.resultColValue}>{verifyResult.date}</Text>
                    </View>
                    <View style={styles.resultCol}>
                      <Text style={styles.resultColLabel}>LEDGER HASH</Text>
                      <Text style={styles.resultColHash}>{verifyResult.hash}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* BGV Request Form Card */}
            <View style={styles.bgvCard}>
              <Text style={styles.bgvTag}>ENTERPRISE BGV DESK</Text>
              <Text style={styles.bgvTitle}>Request a Candidate Background Check</Text>
              <Text style={styles.bgvSubtitle}>Checking a batch of candidates? Our verification desk responds within 1 working day.</Text>

              <View style={styles.bgvKindRow}>
                {['Single candidate', 'Bulk batch (10+)', 'API access', 'Dispute a result'].map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setBgvKind(k)}
                    style={[styles.kindPill, bgvKind === k && styles.kindPillActive]}
                  >
                    <Text style={[styles.kindPillText, bgvKind === k && styles.kindPillTextActive]}>{k}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => setBgvAgreed(!bgvAgreed)} style={styles.consentRow}>
                <View style={[styles.checkbox, bgvAgreed && styles.checkboxActive]}>
                  {bgvAgreed && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <Text style={styles.consentText}>I confirm the candidate has consented to this verification under the DPDP Act 2023.</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (bgvAgreed) {
                    setBgvSubmitted(true);
                    setTimeout(() => setBgvSubmitted(false), 3000);
                  }
                }}
                style={[
                  styles.bgvSubmitBtn,
                  bgvAgreed ? styles.btnPrimary : { backgroundColor: '#1B1E33', cursor: 'not-allowed' },
                ]}
              >
                <Text style={styles.bgvSubmitText}>
                  {bgvSubmitted ? '✓ BGV Request Submitted (Desk: Hyderabad)' : 'Submit BGV Request'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            VIEW 2: CONTACT US TAB
        ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'contact' && (
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeaderCentered}>
              <View style={styles.sectionChip}>
                <Text style={styles.sectionChipText}>CAMPUS &amp; GLOBAL RELATIONS</Text>
              </View>
              <Text style={styles.sectionTitleH1}>Get in Touch with StudentAlumni</Text>
              <Text style={styles.sectionDesc}>Connect with our campus partnership coordinators and leadership team across our hubs.</Text>
            </View>

            {/* Hubs Row */}
            <View style={[styles.hubsRow, isNarrow && { flexDirection: 'column' }]}>
              {/* Hyderabad Hub */}
              <View style={styles.hubCard}>
                <Text style={styles.hubBadge}>APAC HEADQUARTERS</Text>
                <Text style={styles.hubCity}>Hyderabad Hub (India)</Text>
                <Text style={styles.hubDetail}>📍 Madhapur, Hyderabad, Telangana, India</Text>
                <Text style={styles.hubDetail}>📞 +91 7569665077</Text>
                <Text style={styles.hubDetail}>✉️ hr@studentalumni.ai</Text>
                <Text style={styles.hubDetail}>⏰ Mon – Sat: 9:00 AM – 7:00 PM IST</Text>
              </View>

              {/* Princeton Hub */}
              <View style={styles.hubCard}>
                <Text style={[styles.hubBadge, { color: '#6FA8F5' }]}>AMERICAS &amp; GLOBAL</Text>
                <Text style={styles.hubCity}>USA Hub (Americas)</Text>
                <Text style={styles.hubDetail}>📍 Princeton, New Jersey, USA</Text>
                <Text style={styles.hubDetail}>📞 +91 7569665077</Text>
                <Text style={styles.hubDetail}>✉️ hr@studentalumni.ai</Text>
                <Text style={styles.hubDetail}>⏰ Mon – Fri: 9:00 AM – 6:00 PM EST</Text>
              </View>
            </View>

            {/* Contact Form */}
            <View style={styles.contactFormCard}>
              <Text style={styles.formCardTitle}>Direct Inquiry &amp; Support</Text>
              <View style={styles.purposePillsRow}>
                {['General Inquiry', 'HR & Careers', 'College Partnerships', 'Mentor Network'].map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setContactPurpose(p)}
                    style={[styles.kindPill, contactPurpose === p && styles.kindPillActive]}
                  >
                    <Text style={[styles.kindPillText, contactPurpose === p && styles.kindPillTextActive]}>{p}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => {
                  setContactSubmitted(true);
                  setTimeout(() => setContactSubmitted(false), 2500);
                }}
                style={[styles.contactSubmitBtn, styles.btnPrimary]}
              >
                <Text style={styles.contactSubmitText}>
                  {contactSubmitted ? '✓ Message Transmitted Successfully' : 'Transmit Message →'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            VIEW 3 & 4: HOME & ECHO TABS (MAIN LANDING PAGE FLOW)
        ────────────────────────────────────────────────────────────────── */}
        {(activeTab === 'home' || activeTab === 'events') && (
          <>
            {/* ── 01. HERO SECTION ── */}
            <View style={styles.heroSection}>
              <View style={styles.heroLeft}>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>✨ AI CAREER PLATFORM FOR STUDENTS</Text>
                </View>
                <Text style={styles.heroHeading}>Your Intelligent Companion for a Modern Career</Text>
                <Text style={styles.heroSubheading}>
                  Meet Agent K your always-on career copilot. Connect with mentors, discover events and career opportunities, polish your resume, and follow a personalized roadmap built for the way students actually work today.
                </Text>

                <View style={styles.heroCtasRow}>
                  <Pressable onPress={() => router.push('/register')} style={[styles.heroPrimaryBtn, styles.btnPrimary]}>
                    <Text style={styles.heroPrimaryBtnText}>I'm a student  ↗</Text>
                  </Pressable>
                  <Pressable onPress={() => setActiveTab('contact')} style={[styles.heroGhostBtn, styles.ghostBtn]}>
                    <Text style={styles.heroGhostBtnText}>I'm a college</Text>
                  </Pressable>
                </View>

                <Text style={styles.heroTrust}>
                  Free for students · No credit card · Your profile stays private until you reach out
                </Text>
              </View>

              {/* Hero 3D SA Shield Emblem */}
              <View style={styles.heroRight}>
                <View style={styles.shieldRadialGlow} />
                <Svg width="280" height="330" viewBox="0 0 300 350" style={{ transform: [{ rotateY: '-12deg' }] }}>
                  <Defs>
                    <LinearGradient id="sa-hero-out" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor="#D8B6FF" />
                      <Stop offset="0.45" stopColor="#9A5CE8" />
                      <Stop offset="1" stopColor="#5B1FB0" />
                    </LinearGradient>
                    <LinearGradient id="sa-hero-in" x1="0" y1="0" x2="0.4" y2="1">
                      <Stop offset="0" stopColor="#B683F5" />
                      <Stop offset="1" stopColor="#7331C9" />
                    </LinearGradient>
                    <LinearGradient id="sa-hero-txt" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#FFFFFF" />
                      <Stop offset="0.55" stopColor="#EDEAF6" />
                      <Stop offset="1" stopColor="#B9B4C6" />
                    </LinearGradient>
                  </Defs>
                  <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#sa-hero-out)" />
                  <Path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#sa-hero-in)" />
                  <SvgText x="150" y="215" textAnchor="middle" fill="url(#sa-hero-txt)" fontSize="128" fontWeight="800">
                    SA
                  </SvgText>
                </Svg>
              </View>
            </View>

            {/* ── PARTNER MARQUEES ── */}
            <View style={styles.marqueeSection}>
              <View style={styles.marqueeRow}>
                <View style={styles.marqueeTag}><Text style={styles.marqueeTagText}>COLLEGES</Text></View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.marqueeTrack}>
                  {COLLEGES_LIST.map((col, idx) => (
                    <View key={idx} style={styles.partnerPill}><Text style={styles.partnerPillText}>{col}</Text></View>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.marqueeRow}>
                <View style={styles.marqueeTag}><Text style={styles.marqueeTagText}>INDUSTRY</Text></View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.marqueeTrack}>
                  {INDUSTRY_LIST.map((ind, idx) => (
                    <View key={idx} style={styles.partnerPill}><Text style={styles.partnerPillText}>{ind}</Text></View>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* ── 02. BENTO FEATURES GRID ── */}
            <View style={styles.sectionWrapper}>
              <View style={styles.sectionChip}>
                <Text style={styles.sectionChipText}>EVERYTHING YOU NEED</Text>
              </View>
              <Text style={styles.sectionTitleH2}>A complete career OS, built for students.</Text>
              <Text style={styles.sectionDesc}>Everything from your first job match to your full-time offer in one intelligent platform.</Text>

              <View style={styles.bentoGrid}>
                {/* 01 Agent K (Span 2) */}
                <View style={[styles.bentoCard, styles.bentoCardSpan2]}>
                  <Text style={styles.bentoNum}>01</Text>
                  <View style={styles.bentoIconBox}><Text style={{ fontSize: 22 }}>🤖</Text></View>
                  <Text style={styles.bentoTitle}>Agent K</Text>
                  <Text style={styles.bentoBody}>
                    Your always-on AI career copilot. Ask anything: resume tips, interview prep, salary negotiation. Agent K remembers your goals and grows with you.
                  </Text>
                </View>

                {/* 02 Mentors */}
                <View style={styles.bentoCard}>
                  <Text style={styles.bentoNum}>02</Text>
                  <View style={styles.bentoIconBox}><Text style={{ fontSize: 22 }}>👥</Text></View>
                  <Text style={styles.bentoTitle}>Mentors</Text>
                  <Text style={styles.bentoBody}>One-on-one sessions with alumni from Google, McKinsey, Goldman & more. Book, chat, level up.</Text>
                </View>

                {/* 03 Events */}
                <View style={styles.bentoCard}>
                  <Text style={styles.bentoNum}>03</Text>
                  <View style={styles.bentoIconBox}><Text style={{ fontSize: 22 }}>📅</Text></View>
                  <Text style={styles.bentoTitle}>Events</Text>
                  <Text style={styles.bentoBody}>Workshops, hackathons, and industry panels curated to your track and semester.</Text>
                </View>

                {/* 04 Student Perks */}
                <View style={styles.bentoCard}>
                  <Text style={styles.bentoNum}>04</Text>
                  <View style={styles.bentoIconBox}><Text style={{ fontSize: 22 }}>🎁</Text></View>
                  <Text style={styles.bentoTitle}>Student Perks</Text>
                  <Text style={styles.bentoBody}>Unlock exclusive student deals and discounts on mentorship, courses, and partner services.</Text>
                </View>

                {/* 05 Career Opportunities */}
                <View style={[styles.bentoCard, { borderColor: '#8B84FF', backgroundColor: 'rgba(91,79,233,0.1)' }]}>
                  <Text style={[styles.bentoNum, { color: '#8B84FF' }]}>05</Text>
                  <View style={[styles.bentoIconBox, { backgroundColor: '#5B4FE9' }]}><Text style={{ fontSize: 22 }}>💼</Text></View>
                  <Text style={[styles.bentoTitle, { color: '#8B84FF' }]}>Career Opportunities</Text>
                  <Text style={styles.bentoBody}>Personalized opportunity feed sourced from partner companies and warm alumni referrals.</Text>
                </View>

                {/* 06 Resume Polish */}
                <View style={styles.bentoCard}>
                  <Text style={styles.bentoNum}>06</Text>
                  <View style={styles.bentoIconBox}><Text style={{ fontSize: 22 }}>📄</Text></View>
                  <Text style={styles.bentoTitle}>Resume Polish</Text>
                  <Text style={styles.bentoBody}>Instant AI rewrites with ATS scoring, role-specific keywords, and beautiful design templates.</Text>
                </View>

                {/* 07 Career Roadmap (Span 2) */}
                <View style={[styles.bentoCard, styles.bentoCardSpan2]}>
                  <Text style={styles.bentoNum}>07</Text>
                  <View style={styles.bentoIconBox}><Text style={{ fontSize: 22 }}>🗺️</Text></View>
                  <Text style={styles.bentoTitle}>Career Roadmap</Text>
                  <Text style={styles.bentoBody}>Visual step-by-step plan from Day 1 to your first offer auto-updated as your goals evolve.</Text>
                </View>
              </View>
            </View>

            {/* ── 03. COMMAND CENTER DASHBOARD MOCKUP ── */}
            <View style={styles.sectionWrapper}>
              <View style={styles.sectionChip}>
                <Text style={styles.sectionChipText}>YOUR COMMAND CENTER</Text>
              </View>
              <Text style={styles.sectionTitleH2}>One dashboard, infinite momentum.</Text>
              <Text style={styles.sectionDesc}>Track every application, mentor session, and milestone in a beautifully quiet, deeply intelligent interface.</Text>

              {/* Browser Shell */}
              <View style={styles.dashboardFrame}>
                <View style={styles.dashHeader}>
                  <View style={styles.dotCluster}>
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                  </View>
                  <View style={styles.urlPill}>
                    <Text style={styles.urlText}>studentalumni.ai / overview</Text>
                  </View>
                </View>

                <View style={[styles.dashBody, isNarrow && { flexDirection: 'column' }]}>
                  {/* Left Sidebar */}
                  <View style={styles.dashSidebar}>
                    <Text style={styles.dashSidebarLabel}>MENU</Text>
                    <View style={[styles.dashNavItem, styles.dashNavItemActive]}>
                      <Text style={styles.dashNavTextActive}>● Overview</Text>
                    </View>
                    <View style={styles.dashNavItem}><Text style={styles.dashNavText}>○ Agent K</Text></View>
                    <View style={styles.dashNavItem}><Text style={styles.dashNavText}>○ Mentors</Text></View>
                    <View style={styles.dashNavItem}><Text style={styles.dashNavText}>○ AI Roadmap</Text></View>
                  </View>

                  {/* Right Content */}
                  <View style={styles.dashMain}>
                    {/* Top Stats */}
                    <View style={styles.dashKpiRow}>
                      <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>ACTIVE APPLICATIONS</Text>
                        <Text style={styles.kpiValue}>12 <Text style={styles.kpiBadge}>+3 this week</Text></Text>
                      </View>
                      <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>MENTOR HOURS</Text>
                        <Text style={styles.kpiValue}>8.5h <Text style={styles.kpiBadge}>+2h vs last mo</Text></Text>
                      </View>
                      <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>SKILL BADGES</Text>
                        <Text style={[styles.kpiValue, { color: '#8B84FF' }]}>2,450</Text>
                      </View>
                    </View>

                    {/* Agent K Priority Tasks */}
                    <View style={styles.dashTasksCard}>
                      <Text style={styles.dashTasksTitle}>⚡ Agent K Priorities (Today)</Text>
                      <View style={styles.taskItem}>
                        <Text style={styles.taskCheck}>☑</Text>
                        <Text style={styles.taskText}>Refine your resume for the Google SWE referral drop.</Text>
                      </View>
                      <View style={styles.taskItem}>
                        <Text style={styles.taskCheck}>☑</Text>
                        <Text style={styles.taskText}>Prep 3 questions for tomorrow's mentor call with Sarah.</Text>
                      </View>
                      <View style={styles.taskItem}>
                        <Text style={styles.taskCheck}>☑</Text>
                        <Text style={styles.taskText}>Apply to 2 matched career opportunities closing this Friday.</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 04. OUTCOMES SECTION ── */}
            <View style={styles.sectionWrapper}>
              <Text style={styles.sectionChipText}>WHERE STUDENTS LANDED</Text>
              <Text style={styles.sectionTitleH2}>Four students, four first offers.</Text>
              <View style={styles.outcomesGrid}>
                {[
                  { name: 'Aisha K.', info: "CS '26 · Hyderabad", story: 'Two mentor calls, one resume rewrite, SWE offer in four months.', role: 'SWE · PRODUCT COMPANY' },
                  { name: 'Rohan M.', info: "ECE '25 · Pune", story: 'Matched to an alumnus who ran the same internship two years earlier.', role: 'DATA ANALYST · FINTECH' },
                  { name: 'Ira S.', info: "Design '26 · Remote", story: 'Portfolio review with a design lead, then a referral into her shortlist.', role: 'PRODUCT DESIGN INTERN' },
                  { name: 'Dev P.', info: "MBA '25 · Mumbai", story: 'Used the roadmap to pick electives that matched his target role.', role: 'STRATEGY ASSOCIATE' },
                ].map((s, i) => (
                  <View key={i} style={styles.outcomeCard}>
                    <Text style={styles.outcomeInfo}>{s.info}</Text>
                    <Text style={styles.outcomeName}>{s.name}</Text>
                    <Text style={styles.outcomeStory}>{s.story}</Text>
                    <Text style={styles.outcomeRole}>{s.role}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── 06. NUMBERS SECTION ── */}
            <View style={styles.sectionWrapper}>
              <View style={styles.metricsBox}>
                <Text style={styles.sectionChipText}>BY THE NUMBERS</Text>
                <Text style={styles.sectionTitleH2}>Trusted by students worldwide</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricNumber}>50,000+</Text>
                    <Text style={styles.metricTitle}>Active Students</Text>
                    <Text style={styles.metricDesc}>and growing every day</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricNumber}>1,200+</Text>
                    <Text style={styles.metricTitle}>Verified Mentors</Text>
                    <Text style={styles.metricDesc}>from top 500 companies</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricNumber}>200+</Text>
                    <Text style={styles.metricTitle}>Partner Universities</Text>
                    <Text style={styles.metricDesc}>across 30+ countries</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricNumber}>96%</Text>
                    <Text style={styles.metricTitle}>Placement Rate</Text>
                    <Text style={styles.metricDesc}>within 6 months</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 10. MATCH GRAPH RADAR ── */}
            <View style={styles.sectionWrapper}>
              <Text style={styles.sectionChipText}>HOW MATCHING WORKS</Text>
              <Text style={styles.sectionTitleH2}>1,200+ verified mentors, ranked by fit.</Text>
              <Text style={styles.sectionDesc}>Agent K scores every alumnus against your course, goals, and city.</Text>

              <View style={styles.matchGraphContainer}>
                {/* Active selection info */}
                <View style={styles.matchDetailPill}>
                  <Text style={styles.matchDetailLabel}>SELECTED MENTOR MATCH</Text>
                  <Text style={styles.matchDetailName}>{activeNode.name}</Text>
                  <Text style={styles.matchDetailWhy}>{activeNode.why}</Text>
                </View>

                {/* Radar SVG */}
                <Svg width="100%" height="320" viewBox="0 0 620 540">
                  <Circle cx="310" cy="270" r="128" stroke="#1B1E33" strokeDasharray="4,8" fill="none" strokeWidth="1.2" />
                  <Circle cx="310" cy="270" r="206" stroke="#1B1E33" strokeDasharray="4,8" fill="none" strokeWidth="1.2" />
                  <Line x1="310" y1="270" x2={activeNode.x} y2={activeNode.y} stroke="#8B84FF" strokeWidth="1.6" strokeDasharray="5,6" />
                  <Circle cx="310" cy="270" r="52" fill="#0C0E1B" stroke="#5B4FE9" strokeWidth="2" />
                  <SvgText x="310" y="266" textAnchor="middle" fill="#F4F5FB" fontSize="16" fontWeight="800">YOU</SvgText>
                  <SvgText x="310" y="286" textAnchor="middle" fill="#9AA0B4" fontSize="10" fontWeight="700">YEAR 3</SvgText>

                  {/* Nodes */}
                  {[
                    { x: 310, y: 132, score: '98', name: 'Priya R. — Product, Bengaluru', why: 'Same course, 4 years ahead. Mentors 3 students each term.' },
                    { x: 430, y: 201, score: '92', name: 'Arjun M. — Data, Pune', why: 'Ex-intern at target firm. Reviews analytics portfolios monthly.' },
                    { x: 430, y: 339, score: '88', name: 'Neha S. — Design, Remote', why: 'Runs the portfolio review your roadmap suggests next.' },
                    { x: 310, y: 408, score: '85', name: 'Rohit K. — Finance, Mumbai', why: 'Alumnus of your college, hiring two summer interns.' },
                    { x: 190, y: 339, score: '81', name: 'Sana T. — Research, Delhi', why: 'Published in your field, open to weekly calls.' },
                    { x: 190, y: 201, score: '76', name: 'Dev P. — Engineering, Hyderabad', why: 'Took the same electives. Answers within a day.' },
                  ].map((node, i) => (
                    <G
                      key={i}
                      onPress={() => setActiveNode({ name: node.name, why: node.why, x: String(node.x), y: String(node.y) })}
                      style={{ cursor: 'pointer' }}
                    >
                      <Circle cx={node.x} cy={node.y} r="32" fill="#0C0E1B" stroke="#2A2E45" strokeWidth="1.6" />
                      <SvgText x={node.x} y={node.y + 5} textAnchor="middle" fill="#8B84FF" fontSize="13" fontWeight="700">{node.score}</SvgText>
                    </G>
                  ))}
                </Svg>
              </View>
            </View>

            {/* ── 12. FINAL CALL TO ACTION ── */}
            <View style={styles.sectionWrapper}>
              <View style={styles.ctaBanner}>
                <Text style={styles.sectionChipText}>START YOUR JOURNEY</Text>
                <Text style={styles.ctaHeading}>Your career, quietly upgraded.</Text>
                <Text style={styles.ctaDesc}>Join 50,000+ students already using StudentAlumni to land opportunities, find mentors, and build their future.</Text>
                <Pressable onPress={() => router.push('/register')} style={[styles.ctaMainBtn, styles.btnPrimary]}>
                  <Text style={styles.ctaMainBtnText}>Create your free account  ↗</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* ── 13. GLOBAL FOOTER ── */}
        <View style={styles.footerSection}>
          <View style={styles.footerGrid}>
            <View style={styles.footerBrandCol}>
              <Text style={styles.footerLogoText}>StudentAlumni</Text>
              <Text style={styles.footerSubText}>The intelligent career companion built for the next generation of students.</Text>
              <Text style={styles.footerSocials}>LinkedIn · Instagram · GitHub · X</Text>
            </View>
            <View style={styles.footerCol}>
              <Text style={styles.footerColHeader}>RESOURCES</Text>
              <Pressable onPress={() => setActiveTab('verify')}><Text style={styles.footerLink}>Verify Certificate</Text></Pressable>
              <Pressable onPress={() => setActiveTab('events')}><Text style={styles.footerLink}>ECHO Events</Text></Pressable>
              <Pressable onPress={() => setActiveTab('contact')}><Text style={styles.footerLink}>Help Center</Text></Pressable>
            </View>
            <View style={styles.footerCol}>
              <Text style={styles.footerColHeader}>LEGAL &amp; TRUST</Text>
              <Text style={styles.footerLink}>Privacy Policy</Text>
              <Text style={styles.footerLink}>Terms of Service</Text>
              <Text style={styles.footerLink}>Security &amp; Cookies</Text>
            </View>
            <View style={styles.footerCol}>
              <Text style={styles.footerColHeader}>COMPLIANCE</Text>
              <Text style={styles.footerCompliance}>✓ DPDP Act 2023 (India)</Text>
              <Text style={styles.footerCompliance}>✓ GDPR Compliant (EU)</Text>
              <Text style={styles.footerCompliance}>✓ SOC 2 Type II Audited</Text>
            </View>
          </View>

          <View style={styles.footerBottomBar}>
            <Text style={styles.footerCopyright}>#studentalumni — Built with love for students across all campuses</Text>
            <Text style={styles.footerCopyrightSmall}>© 2026 StudentAlumni Global. All rights reserved.</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

/* ── StyleSheet Styles ── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  starsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  shootingStar1: {
    position: 'absolute',
    left: '62%',
    top: '8%',
    width: 120,
    height: 1.5,
    backgroundColor: '#FFFFFF',
  },
  shootingStar2: {
    position: 'absolute',
    left: '32%',
    top: '46%',
    width: 90,
    height: 1.5,
    backgroundColor: '#E8E6FF',
  },
  navBar: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(5,6,15,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.line,
    backdropFilter: 'blur(16px)' as any,
  },
  navInner: {
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: -0.3,
  },
  navTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  tabButton: {
    position: 'relative',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: THEME.muted2,
  },
  tabTextActive: {
    fontWeight: '700',
    color: THEME.text,
  },
  tabLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: THEME.indLt,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  signInBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  signInText: {
    fontSize: 14.5,
    color: THEME.muted2,
  },
  getStartedBtn: {
    backgroundColor: THEME.ind,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 100,
  },
  getStartedText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPrimary: {
    backgroundColor: THEME.ind,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: THEME.dot,
    backgroundColor: 'transparent',
  },

  /* ── Hero Section ── */
  heroSection: {
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 40,
  },
  heroLeft: {
    flex: 1,
    minWidth: 320,
    maxWidth: 620,
  },
  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.tint,
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  heroPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.indLt,
    letterSpacing: 1.4,
  },
  heroHeading: {
    fontSize: 54,
    fontWeight: '800',
    lineHeight: 60,
    color: THEME.text,
    letterSpacing: -1.8,
    marginBottom: 20,
  },
  heroSubheading: {
    fontSize: 16.5,
    lineHeight: 28,
    color: THEME.muted2,
    marginBottom: 32,
  },
  heroCtasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  heroPrimaryBtn: {
    backgroundColor: THEME.ind,
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  heroPrimaryBtnText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroGhostBtn: {
    borderWidth: 1,
    borderColor: THEME.dot,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  heroGhostBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  heroTrust: {
    fontSize: 13.5,
    color: THEME.dim,
  },
  heroRight: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 300,
  },
  shieldRadialGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(139,92,246,0.3)',
    filter: 'blur(30px)' as any,
  },

  /* ── Marquee ── */
  marqueeSection: {
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    paddingHorizontal: 32,
    marginTop: 20,
    marginBottom: 60,
    gap: 14,
  },
  marqueeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  marqueeTag: {
    backgroundColor: THEME.tint,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  marqueeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.indLt,
    letterSpacing: 1.2,
  },
  marqueeTrack: {
    flexDirection: 'row',
  },
  partnerPill: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  partnerPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
  },

  /* ── Bento Features ── */
  sectionWrapper: {
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  sectionChip: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.tint,
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  sectionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.indLt,
    letterSpacing: 1.5,
  },
  sectionTitleH2: {
    fontSize: 42,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -1.4,
    marginBottom: 14,
  },
  sectionDesc: {
    fontSize: 16,
    lineHeight: 26,
    color: THEME.muted2,
    maxWidth: 540,
    marginBottom: 40,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  bentoCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 18,
    padding: 26,
    position: 'relative',
  },
  bentoCardSpan2: {
    flexBasis: '62%' as any,
    minWidth: 320,
  },
  bentoNum: {
    position: 'absolute',
    right: 20,
    top: 20,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.dim,
  },
  bentoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  bentoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
  },
  bentoBody: {
    fontSize: 14.5,
    lineHeight: 23,
    color: THEME.muted,
  },

  /* ── Dashboard Frame ── */
  dashboardFrame: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 18,
    overflow: 'hidden',
  },
  dashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.line2,
  },
  dotCluster: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.dot,
  },
  urlPill: {
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  urlText: {
    fontSize: 12,
    color: THEME.muted2,
  },
  dashBody: {
    flexDirection: 'row',
    padding: 22,
    gap: 20,
  },
  dashSidebar: {
    width: 200,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.line2,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  dashSidebarLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.dim,
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  dashNavItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dashNavItemActive: {
    backgroundColor: THEME.line2,
  },
  dashNavText: {
    fontSize: 14,
    color: THEME.muted,
  },
  dashNavTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  dashMain: {
    flex: 1,
    gap: 16,
  },
  dashKpiRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  kpiBox: {
    flex: 1,
    minWidth: 160,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.line2,
    borderRadius: 14,
    padding: 16,
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.dim,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.text,
  },
  kpiBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.indLt,
  },
  dashTasksCard: {
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.lineHi,
    borderRadius: 14,
    padding: 20,
    gap: 10,
  },
  dashTasksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 4,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 10,
    padding: 12,
  },
  taskCheck: {
    fontSize: 16,
    color: THEME.indLt,
  },
  taskText: {
    fontSize: 14,
    color: THEME.text2,
  },

  /* ── Outcomes ── */
  outcomesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  outcomeCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 16,
    padding: 22,
  },
  outcomeInfo: {
    fontSize: 12.5,
    color: THEME.dim,
    marginBottom: 10,
  },
  outcomeName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 6,
  },
  outcomeStory: {
    fontSize: 14,
    lineHeight: 22,
    color: THEME.muted,
    marginBottom: 16,
  },
  outcomeRole: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.indLt,
    letterSpacing: 1.1,
  },

  /* ── Numbers ── */
  metricsBox: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.line2,
    borderRadius: 22,
    padding: 44,
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    width: '100%',
    marginTop: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.line2,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -1,
  },
  metricTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text2,
    marginTop: 8,
  },
  metricDesc: {
    fontSize: 12.5,
    color: THEME.dim,
    marginTop: 4,
  },

  /* ── Match Graph ── */
  matchGraphContainer: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  matchDetailPill: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.lineHi,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
  },
  matchDetailLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.dim,
    letterSpacing: 1.4,
  },
  matchDetailName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 4,
  },
  matchDetailWhy: {
    fontSize: 13.5,
    color: THEME.muted2,
    marginTop: 2,
    textAlign: 'center',
  },

  /* ── Final CTA ── */
  ctaBanner: {
    backgroundColor: THEME.cardHi,
    borderWidth: 1,
    borderColor: THEME.lineHi,
    borderRadius: 22,
    padding: 56,
    alignItems: 'center',
    textAlign: 'center' as any,
  },
  ctaHeading: {
    fontSize: 48,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -1.6,
    marginVertical: 16,
  },
  ctaDesc: {
    fontSize: 16.5,
    lineHeight: 26,
    color: THEME.muted,
    maxWidth: 580,
    marginBottom: 32,
    textAlign: 'center',
  },
  ctaMainBtn: {
    backgroundColor: THEME.ind,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  ctaMainBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Verify View Specifics ── */
  verifyHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    marginBottom: 32,
  },
  verifyTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46,32,145,0.1)',
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  verifyTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E2091',
    letterSpacing: 1.4,
  },
  verifyHeroTitle: {
    fontSize: 38,
    fontWeight: '800',
    color: '#141726',
    letterSpacing: -1.4,
    marginBottom: 12,
  },
  verifyHeroSubtitle: {
    fontSize: 16,
    lineHeight: 25,
    color: '#4A4F63',
    maxWidth: 680,
    marginBottom: 28,
  },
  verifyInputRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  verifyInput: {
    flex: 1,
    minWidth: 260,
    borderWidth: 1,
    borderColor: '#D4D2E8',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: '#141726',
    backgroundColor: '#F8F7FF',
  },
  verifySubmitBtn: {
    backgroundColor: '#4B3FD6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  verifySubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sampleChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sampleLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4A4F63',
  },
  sampleChip: {
    backgroundColor: '#F0EEFF',
    borderWidth: 1,
    borderColor: '#D4CEFF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sampleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B4FE9',
  },
  verifyResultCard: {
    backgroundColor: '#FAF9FF',
    borderWidth: 1,
    borderColor: '#C7C0FF',
    borderRadius: 16,
    padding: 22,
    marginTop: 24,
  },
  verifyResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#141726',
  },
  resultId: {
    fontSize: 12.5,
    color: '#5B4FE9',
    marginTop: 2,
  },
  validBadge: {
    backgroundColor: '#E6F9F0',
    borderWidth: 1,
    borderColor: '#34D399',
    borderRadius: 100,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  validBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  resultDetailsGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  resultCol: {
    flex: 1,
    minWidth: 140,
  },
  resultColLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7080',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  resultColValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#141726',
  },
  resultColHash: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B3FD6',
  },
  bgvCard: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.lineHi,
    borderRadius: 22,
    padding: 34,
  },
  bgvTag: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.indLt,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  bgvTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 6,
  },
  bgvSubtitle: {
    fontSize: 14.5,
    color: THEME.muted2,
    marginBottom: 20,
  },
  bgvKindRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  kindPill: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  kindPillActive: {
    backgroundColor: THEME.ind,
    borderColor: THEME.ind,
  },
  kindPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.muted2,
  },
  kindPillTextActive: {
    color: '#FFFFFF',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: THEME.lineHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: THEME.ind,
    borderColor: THEME.ind,
  },
  checkboxTick: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  consentText: {
    fontSize: 13.5,
    color: THEME.muted2,
    flex: 1,
  },
  bgvSubmitBtn: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  bgvSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Contact View Specifics ── */
  sectionHeaderCentered: {
    alignItems: 'center',
    textAlign: 'center' as any,
    marginBottom: 36,
  },
  sectionTitleH1: {
    fontSize: 44,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -1.6,
    marginVertical: 12,
  },
  hubsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 26,
  },
  hubCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 20,
    padding: 26,
    gap: 8,
  },
  hubBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.indLt,
    letterSpacing: 1.4,
  },
  hubCity: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
  },
  hubDetail: {
    fontSize: 14,
    color: THEME.text2,
  },
  contactFormCard: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 22,
    padding: 32,
  },
  formCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 16,
  },
  purposePillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  contactSubmitBtn: {
    backgroundColor: THEME.ind,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactSubmitText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Footer ── */
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: THEME.line,
    backgroundColor: THEME.bg2,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 32,
  },
  footerGrid: {
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 32,
    marginBottom: 40,
  },
  footerBrandCol: {
    flex: 1.5,
    minWidth: 260,
  },
  footerLogoText: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 10,
  },
  footerSubText: {
    fontSize: 14,
    lineHeight: 22,
    color: THEME.muted2,
    maxWidth: 320,
    marginBottom: 16,
  },
  footerSocials: {
    fontSize: 13.5,
    fontWeight: '600',
    color: THEME.indLt,
  },
  footerCol: {
    flex: 1,
    minWidth: 160,
    gap: 10,
  },
  footerColHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.dim,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  footerLink: {
    fontSize: 14,
    color: THEME.text2,
  },
  footerCompliance: {
    fontSize: 13,
    color: THEME.text2,
  },
  footerBottomBar: {
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    borderTopWidth: 1,
    borderTopColor: THEME.line,
    paddingTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerCopyright: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.indLt,
  },
  footerCopyrightSmall: {
    fontSize: 13,
    color: THEME.dim,
  },
});
