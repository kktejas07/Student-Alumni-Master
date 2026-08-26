/**
 * LandingPage — StudentAlumni AI Career Platform
 * High-Performance Vector SVGs, Real-Time Radar Hover Scan, Scroll-Linked S-Curve & 3D Interactive Motion
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
  Animated,
  Easing,
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

/* ── Brand Color Palette ── */
const T = {
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

/* ── Global Styles Injection for Web ── */
const STYLES_KEY = 'sa-interactive-motion-css';
function injectGlobalStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLES_KEY)) return;
  const s = document.createElement('style');
  s.id = STYLES_KEY;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #05060F; font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif; color: #F4F5FB; overflow-x: hidden; }
    
    @keyframes sa-pulse-glow { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.08); } }
    @keyframes sa-radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes sa-float-slow { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }

    .sa-shield-glow { animation: sa-pulse-glow 7s ease-in-out infinite; }
    .sa-radar-spin { transform-origin: 310px 270px; animation: sa-radar-spin 7s linear infinite; }
    .sa-float-slow { animation: sa-float-slow 5s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
}
if (typeof document !== 'undefined') injectGlobalStyles();

/* ── Sample Verifiable Credentials Database ── */
const SAMPLE_CREDS: Record<string, [string, string, string]> = {
  'SA-EXC-2026-0002': ['Certificate of Excellence', 'Sreenidhi Institute of Science & Technology', 'Feb 14, 2026'],
  'SA-FAC-2026-0001': ['Faculty Award — Mentorship', 'StudentAlumni Academic Council', 'Jan 09, 2026'],
  'SA-AMB-2026-0012': ['Campus Ambassador Badge', 'StudentAlumni Campus Relations', 'Mar 02, 2026'],
  'ECHO26-P-0001': ['ECHO Specialization — Product', 'ECHO 2026 · VNR VJIET', 'Jul 31, 2026'],
};

const COLLEGES_MARQUEE = [
  'MRIT', 'Malla Reddy College of Engineering', 'SR University',
  'VJ Data Questers', 'VJ ARC', 'VNR VJIET', 'GITAM',
  'IUCEE VNRVJIET', 'IEEE Computer Society', 'Garuda Vigilance',
];

const INDUSTRY_MARQUEE = [
  'Deloitte', 'Featherless', 'Atlast', 'Bandiwala',
  'EXtrive Innovations', 'Larsen & Toubro', 'LinkedIn', 'Google', 'McKinsey',
];

/* ── Scroll-Triggered Animated Number Counter Component ── */
function ScrollCounter({
  target,
  suffix = '',
  trigger = true,
  style,
}: {
  target: number;
  suffix?: string;
  trigger?: boolean;
  style?: any;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let startTime: number | null = null;
    const duration = 1600;

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * target));

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      } else {
        setDisplayValue(target);
      }
    };

    const handle = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(handle);
  }, [target, trigger]);

  return <Text style={style}>{displayValue.toLocaleString('en-IN')}{suffix}</Text>;
}

/* ── Pure React Native Animated Marquee Component ── */
function Marquee({
  items,
  duration = 26000,
  reverse = false,
}: {
  items: string[];
  duration?: number;
  reverse?: boolean;
}) {
  const [singleWidth, setSingleWidth] = useState(1400);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    x.setValue(reverse ? -singleWidth : 0);
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue: reverse ? 0 : -singleWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    anim.start();
    return () => anim.stop();
  }, [singleWidth, duration, reverse]);

  return (
    <View style={{ overflow: 'hidden', flex: 1 }}>
      <Animated.View
        style={{
          flexDirection: 'row',
          transform: [{ translateX: x }],
          width: 'max-content' as any,
        }}
      >
        <View
          style={{ flexDirection: 'row' }}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - singleWidth) > 10) setSingleWidth(w);
          }}
        >
          {items.map((item, idx) => (
            <View key={`set1-${idx}`} style={styles.marqueePill}>
              <Text style={styles.marqueePillText}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row' }}>
          {items.map((item, idx) => (
            <View key={`set2-${idx}`} style={styles.marqueePill}>
              <Text style={styles.marqueePillText}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row' }}>
          {items.map((item, idx) => (
            <View key={`set3-${idx}`} style={styles.marqueePill}>
              <Text style={styles.marqueePillText}>{item}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

/* ── Interactive 3D Card Component with Web Physics ── */
function HoverLiftCard({
  children,
  style,
  hoverBorderColor = '#5B4FE9',
  scaleOnHover = 1.018,
}: {
  children: React.ReactNode;
  style?: any;
  hoverBorderColor?: string;
  scaleOnHover?: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <View
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={[
        style,
        {
          transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.32s ease',
          cursor: 'pointer',
        } as any,
        hovered && {
          transform: [{ translateY: -7 }, { scale: scaleOnHover }],
          borderColor: hoverBorderColor,
          shadowColor: '#5B4FE9',
          shadowOffset: { width: 0, height: 18 },
          shadowOpacity: 0.45,
          shadowRadius: 36,
        },
      ]}
    >
      {children}
    </View>
  );
}

/* ── Interactive Button with Hover Lift & Glow ── */
function GlowButton({
  onPress,
  children,
  style,
  textStyle,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  textStyle?: any;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={[
        style,
        {
          transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
        } as any,
        hovered && {
          transform: [{ translateY: -3 }],
          filter: 'brightness(1.18)',
          shadowColor: '#5B4FE9',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.55,
          shadowRadius: 24,
        },
      ]}
    >
      {typeof children === 'string' ? <Text style={textStyle}>{children}</Text> : children}
    </Pressable>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 960;
  const isMobile = width < 640;
  const containerPadding = isMobile ? 20 : isNarrow ? 32 : 44;

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'home' | 'events' | 'verify' | 'contact'>('home');

  // Scroll position & sticky bar
  const [scrollY, setScrollY] = useState(0);
  const showStickyBar = scrollY > 600;

  // Verify view state
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<{
    id: string;
    title: string;
    issuer: string;
    date: string;
    hash: string;
  } | null>(null);

  // BGV desk state
  const [bgvKind, setBgvKind] = useState('Single candidate');
  const [bgvConsent, setBgvConsent] = useState(false);
  const [bgvSent, setBgvSent] = useState(false);

  // Contact view state
  const [contactPurpose, setContactPurpose] = useState('General Inquiry');
  const [contactSent, setContactSent] = useState(false);

  // Match graph radar state
  const [selectedNode, setSelectedNode] = useState({
    name: 'Priya R. — Product, Bengaluru',
    why: 'Same course, four years ahead. Mentors three students each term.',
    x: '310',
    y: '132',
  });

  // On Campus Polaroid Deck & Testimonials auto-cycling
  const [deckIdx, setDeckIdx] = useState(0);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [subscribed, setSubscribed] = useState(false);

  // Swaying shield animated value
  const swayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, {
          toValue: 1,
          duration: 7000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(swayAnim, {
          toValue: 0,
          duration: 7000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [swayAnim]);

  const shieldRotateY = swayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-16deg', '16deg'],
  });
  const shieldTranslateY = swayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  // Dynamic Cursor Glow
  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Deck auto-cycling
  useEffect(() => {
    const timer = setInterval(() => {
      setDeckIdx((p) => (p + 1) % 5);
      setQuoteIdx((p) => (p + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Scroll-linked Roadmap S-Curve filling calculation
  const roadmapScrollProgress = Math.min(1, Math.max(0, (scrollY - 1500) / 750));
  const PATH_TOTAL_LENGTH = 1350;
  const roadmapStrokeDashoffset = PATH_TOTAL_LENGTH * (1 - roadmapScrollProgress);

  // Numbers Section Trigger
  const numbersTrigger = scrollY > 1200 || activeTab !== 'home';

  const triggerVerification = (targetId?: string) => {
    const q = (targetId !== undefined ? targetId : verifyInput).trim().toUpperCase();
    if (!q) return;
    const hit = SAMPLE_CREDS[q];
    let h = 0;
    for (let i = 0; i < q.length; i++) h = (h * 31 + q.charCodeAt(i)) & 0xffffffff;
    const hash = (Math.abs(h).toString(16) + 'a7f31c9e4b2044').slice(0, 18);

    setVerifyResult({
      id: q,
      title: hit ? hit[0] : 'Verified Campus Credential',
      issuer: hit ? hit[1] : 'StudentAlumni Academic Council',
      date: hit ? hit[2] : 'Feb 2026',
      hash,
    });
  };

  return (
    <View style={styles.root}>
      {/* Dynamic Cursor Glow */}
      {Platform.OS === 'web' && (
        <View
          style={[
            styles.cursorGlow,
            {
              left: mousePos.x,
              top: mousePos.y,
              opacity: mousePos.x > 0 ? 1 : 0,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Starfield */}
      <View style={styles.starfield} pointerEvents="none" />

      {/* Top Fixed Scroll Progress Bar */}
      <View style={[styles.progressBar, { width: `${Math.min(100, (scrollY / 3800) * 100)}%` }]} />

      {/* Top Navbar */}
      <View style={styles.navBar}>
        <View style={[styles.navInner, { paddingHorizontal: containerPadding }, isNarrow && { flexWrap: 'wrap', gap: 14 }]}>
          {/* Brand Logo */}
          <Pressable onPress={() => setActiveTab('home')} style={styles.navLogoGroup}>
            <Svg width="28" height="33" viewBox="0 0 300 350">
              <Defs>
                <LinearGradient id="sa-badge" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#C9A7FF" />
                  <Stop offset="0.48" stopColor="#8B5CF6" />
                  <Stop offset="1" stopColor="#5B2FD0" />
                </LinearGradient>
                <LinearGradient id="sa-badge-in" x1="0" y1="0" x2="0.4" y2="1">
                  <Stop offset="0" stopColor="#B683F5" />
                  <Stop offset="1" stopColor="#7331C9" />
                </LinearGradient>
              </Defs>
              <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#sa-badge)" />
              <Path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#sa-badge-in)" />
              <SvgText x="150" y="214" textAnchor="middle" fill="#FFFFFF" fontSize="118" fontWeight="800">
                SA
              </SvgText>
            </Svg>
            <Text style={styles.navLogoText}>StudentAlumni</Text>
          </Pressable>

          {/* Navigation Tabs */}
          <View style={[styles.navTabs, isMobile && { gap: 16 }]}>
            {(['home', 'events', 'verify', 'contact'] as const).map((tab) => {
              const label = tab === 'home' ? 'Home' : tab === 'events' ? 'ECHO' : tab === 'verify' ? 'Verify' : 'Contact Us';
              const isSelected = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={styles.navTabBtn}
                >
                  <Text style={[styles.navTabText, isSelected && styles.navTabTextActive]}>{label}</Text>
                  {isSelected && <View style={styles.navActiveLine} />}
                </Pressable>
              );
            })}
          </View>

          {/* Right Action Buttons */}
          <View style={styles.navActions}>
            <Pressable onPress={() => router.push('/login')} style={styles.navSignIn}>
              <Text style={styles.navSignInText}>Sign in</Text>
            </Pressable>
            <GlowButton onPress={() => router.push('/register')} style={styles.navGetStarted} textStyle={styles.navGetStartedText}>
              Get Started
            </GlowButton>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >

        {/* ══════════════════════════════════════════════════════════════════
            TAB: VERIFY CREDENTIALS & BGV DESK
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'verify' && (
          <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
            {/* Verify Hero Card */}
            <View style={styles.verifyHeroCard}>
              <View style={styles.verifyTagPill}>
                <Svg width="14" height="14" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                  <Path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" stroke="#2E2091" strokeWidth="2.2" fill="none" />
                </Svg>
                <Text style={styles.verifyTagPillText}>CREDENTIAL VERIFICATION</Text>
              </View>
              <Text style={styles.verifyHeroTitle}>Every claim on a résumé, checkable in seconds.</Text>
              <Text style={styles.verifyHeroSubtitle}>
                Certificates, faculty awards, ECHO badges, and SA Member IDs are signed on issue. Recruiters and background-verification agencies can confirm any of them without emailing a college office.
              </Text>

              {/* 3 Metric Stats */}
              <View style={styles.verifyHeroStatsRow}>
                <View>
                  <Text style={[styles.verifyStatNum, { color: '#4B3FA8' }]}>184k</Text>
                  <Text style={styles.verifyStatLabel}>credentials signed</Text>
                </View>
                <View>
                  <Text style={[styles.verifyStatNum, { color: '#0E6E8C' }]}>1.2s</Text>
                  <Text style={styles.verifyStatLabel}>median check</Text>
                </View>
                <View>
                  <Text style={[styles.verifyStatNum, { color: '#047857' }]}>0</Text>
                  <Text style={styles.verifyStatLabel}>forgeries passed</Text>
                </View>
              </View>

              {/* Verify Search Box */}
              <View style={styles.verifyInputRow}>
                <TextInput
                  style={styles.verifySearchInput}
                  placeholder="Enter Certificate ID, Member ID, or Roll Number…"
                  placeholderTextColor="#5C6273"
                  value={verifyInput}
                  onChangeText={setVerifyInput}
                />
                <GlowButton onPress={() => triggerVerification()} style={styles.verifySubmitBtn} textStyle={styles.verifySubmitBtnText}>
                  Verify Credential →
                </GlowButton>
              </View>

              {/* Sample Chips */}
              <View style={styles.sampleChipsRow}>
                <Text style={styles.sampleChipsLabel}>Try sample IDs:</Text>
                {Object.keys(SAMPLE_CREDS).map((id) => (
                  <Pressable
                    key={id}
                    onPress={() => {
                      setVerifyInput(id);
                      triggerVerification(id);
                    }}
                    style={styles.sampleChip}
                  >
                    <Text style={styles.sampleChipText}>{id}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Verification Result Box */}
              {verifyResult && (
                <View style={styles.verifyResultBox}>
                  <View style={styles.verifyResultTop}>
                    <View>
                      <Text style={styles.verifyResultTitle}>{verifyResult.title}</Text>
                      <Text style={styles.verifyResultId}>{verifyResult.id}</Text>
                    </View>
                    <View style={styles.validStatusBadge}>
                      <Svg width="12" height="12" viewBox="0 0 24 24" style={{ marginRight: 5 }}>
                        <Path d="M5 13l4 4L19 7" stroke="#34D399" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                      <Text style={styles.validStatusText}>SIGNATURE VALID</Text>
                    </View>
                  </View>
                  <View style={styles.verifyResultGrid}>
                    <View style={styles.resultCol}>
                      <Text style={styles.resultColHeader}>ISSUED BY</Text>
                      <Text style={styles.resultColVal}>{verifyResult.issuer}</Text>
                    </View>
                    <View style={styles.resultCol}>
                      <Text style={styles.resultColHeader}>ISSUED ON</Text>
                      <Text style={styles.resultColVal}>{verifyResult.date}</Text>
                    </View>
                    <View style={styles.resultCol}>
                      <Text style={styles.resultColHeader}>LEDGER HASH</Text>
                      <Text style={styles.resultColHash}>{verifyResult.hash}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* What We Verify */}
            <View style={styles.whatWeVerifyRow}>
              <HoverLiftCard style={styles.verifyFeatureCard}>
                <View style={styles.verifySvgIconBox}>
                  <Svg width="18" height="18" viewBox="0 0 24 24">
                    <Path d="M5 12.5l4 4 10-10.5" stroke="#0E6E8C" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
                <Text style={styles.verifyFeatureTitle}>Certificates</Text>
                <Text style={styles.verifyFeatureDesc}>Workshop and course completion, with issuing body and date.</Text>
              </HoverLiftCard>
              <HoverLiftCard style={styles.verifyFeatureCard}>
                <View style={styles.verifySvgIconBox}>
                  <Svg width="18" height="18" viewBox="0 0 24 24">
                    <Path d="M5 12.5l4 4 10-10.5" stroke="#5B4FE9" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
                <Text style={styles.verifyFeatureTitle}>Member IDs</Text>
                <Text style={styles.verifyFeatureDesc}>Confirms live college affiliation, department, and graduation year.</Text>
              </HoverLiftCard>
              <HoverLiftCard style={styles.verifyFeatureCard}>
                <View style={styles.verifySvgIconBox}>
                  <Svg width="18" height="18" viewBox="0 0 24 24">
                    <Path d="M5 12.5l4 4 10-10.5" stroke="#B45309" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
                <Text style={styles.verifyFeatureTitle}>ECHO Badges</Text>
                <Text style={styles.verifyFeatureDesc}>Non-transferable, cryptographically bound, scannable at the campus gate.</Text>
              </HoverLiftCard>
            </View>

            {/* BGV Request Desk Form Card */}
            <View style={styles.bgvDeskCard}>
              <View style={styles.sectionPill}><Text style={styles.sectionPillText}>BULK &amp; ENTERPRISE BGV</Text></View>
              <Text style={styles.bgvDeskHeading}>Request a BGV Check</Text>
              <Text style={styles.bgvDeskSub}>Checking a candidate batch? Our verification desk responds within 1 working day.</Text>

              <View style={styles.kindSelectorRow}>
                {['Single candidate', 'Bulk batch (10+)', 'API access', 'Dispute a result'].map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setBgvKind(k)}
                    style={[styles.kindPill, bgvKind === k && styles.kindPillOn]}
                  >
                    <Text style={[styles.kindPillText, bgvKind === k && styles.kindPillTextOn]}>{k}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => setBgvConsent(!bgvConsent)} style={styles.consentCheckboxRow}>
                <View style={[styles.checkboxSquare, bgvConsent && styles.checkboxSquareOn]}>
                  {bgvConsent && (
                    <Svg width="12" height="12" viewBox="0 0 24 24">
                      <Path d="M5 13l4 4L19 7" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </Svg>
                  )}
                </View>
                <Text style={styles.consentLabel}>I confirm the candidate has consented to this verification under the DPDP Act 2023.</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (bgvConsent) {
                    setBgvSent(true);
                    setTimeout(() => setBgvSent(false), 3000);
                  }
                }}
                style={[
                  styles.bgvSubmitButton,
                  bgvConsent ? styles.btnGlow : { backgroundColor: T.line, cursor: 'not-allowed' },
                ]}
              >
                <Text style={styles.bgvSubmitButtonText}>
                  {bgvSent ? 'Request Sent — SA-BGV-894102 (Desk: Hyderabad)' : 'Submit BGV Request'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: CONTACT US
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'contact' && (
          <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
            <View style={styles.centeredHeader}>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>CONTACT &amp; CAMPUS RELATIONS</Text>
              </View>
              <Text style={styles.pageTitleH1}>Get in Touch with StudentAlumni Global</Text>
              <Text style={styles.pageSubtitle}>Connect directly with our leadership, campus partnership coordinators, and human resources team.</Text>
            </View>

            {/* Hubs */}
            <View style={[styles.hubsGrid, isNarrow && { flexDirection: 'column' }]}>
              <HoverLiftCard style={styles.hubCard}>
                <Text style={styles.hubRegionTag}>APAC HEADQUARTERS</Text>
                <Text style={styles.hubTitle}>India Hub (Hyderabad)</Text>
                <View style={styles.hubIconRow}>
                  <Svg width="16" height="16" viewBox="0 0 24 24"><Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" stroke="#8B84FF" strokeWidth="1.8" fill="none" /></Svg>
                  <Text style={styles.hubLine}>Madhapur, Hyderabad, Telangana, India</Text>
                </View>
                <View style={styles.hubIconRow}>
                  <Svg width="16" height="16" viewBox="0 0 24 24"><Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="#8B84FF" strokeWidth="1.8" fill="none" /></Svg>
                  <Text style={styles.hubLine}>+91 7569665077</Text>
                </View>
                <View style={styles.hubIconRow}>
                  <Svg width="16" height="16" viewBox="0 0 24 24"><Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#8B84FF" strokeWidth="1.8" fill="none" /><Path d="M22 6l-10 7L2 6" stroke="#8B84FF" strokeWidth="1.8" fill="none" /></Svg>
                  <Text style={styles.hubLine}>hr@studentalumni.ai</Text>
                </View>
                <View style={styles.hubIconRow}>
                  <Svg width="16" height="16" viewBox="0 0 24 24"><Circle cx="12" cy="12" r="10" stroke="#8B84FF" strokeWidth="1.8" fill="none" /><Path d="M12 6v6l4 2" stroke="#8B84FF" strokeWidth="1.8" fill="none" /></Svg>
                  <Text style={styles.hubLine}>Mon – Sat: 9:00 AM – 7:00 PM IST</Text>
                </View>
              </HoverLiftCard>

              <HoverLiftCard style={styles.hubCard}>
                <Text style={[styles.hubRegionTag, { color: '#6FA8F5' }]}>AMERICAS &amp; GLOBAL</Text>
                <Text style={styles.hubTitle}>USA Hub (Princeton)</Text>
                <View style={styles.hubIconRow}>
                  <Svg width="16" height="16" viewBox="0 0 24 24"><Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" stroke="#6FA8F5" strokeWidth="1.8" fill="none" /></Svg>
                  <Text style={styles.hubLine}>Princeton, New Jersey, USA</Text>
                </View>
                <View style={styles.hubIconRow}>
                  <Svg width="16" height="16" viewBox="0 0 24 24"><Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="#6FA8F5" strokeWidth="1.8" fill="none" /></Svg>
                  <Text style={styles.hubLine}>+91 7569665077</Text>
                </View>
                <View style={styles.hubIconRow}>
                  <Svg width="16" height="16" viewBox="0 0 24 24"><Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#6FA8F5" strokeWidth="1.8" fill="none" /><Path d="M22 6l-10 7L2 6" stroke="#6FA8F5" strokeWidth="1.8" fill="none" /></Svg>
                  <Text style={styles.hubLine}>hr@studentalumni.ai</Text>
                </View>
                <View style={styles.hubIconRow}>
                  <Svg width="16" height="16" viewBox="0 0 24 24"><Circle cx="12" cy="12" r="10" stroke="#6FA8F5" strokeWidth="1.8" fill="none" /><Path d="M12 6v6l4 2" stroke="#6FA8F5" strokeWidth="1.8" fill="none" /></Svg>
                  <Text style={styles.hubLine}>Mon – Fri: 9:00 AM – 6:00 PM EST</Text>
                </View>
              </HoverLiftCard>
            </View>

            {/* Inquiry Form */}
            <View style={styles.inquiryCard}>
              <Text style={styles.inquiryHeading}>Direct Inquiry &amp; Support</Text>
              <Text style={styles.inquirySub}>Fill out the details below and our campus relations team will respond promptly.</Text>

              <View style={styles.purposePillsRow}>
                {['General Inquiry', 'HR & Careers', 'College Partnerships', 'Mentor Network'].map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setContactPurpose(p)}
                    style={[styles.kindPill, contactPurpose === p && styles.kindPillOn]}
                  >
                    <Text style={[styles.kindPillText, contactPurpose === p && styles.kindPillTextOn]}>{p}</Text>
                  </Pressable>
                ))}
              </View>

              <GlowButton
                onPress={() => {
                  setContactSent(true);
                  setTimeout(() => setContactSent(false), 2500);
                }}
                style={styles.inquirySubmitBtn}
                textStyle={styles.inquirySubmitBtnText}
              >
                {contactSent ? 'Message Transmitted Successfully' : 'Transmit Message →'}
              </GlowButton>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: HOME & ECHO
        ══════════════════════════════════════════════════════════════════ */}
        {(activeTab === 'home' || activeTab === 'events') && (
          <>
            {/* ── 01. HERO SECTION ── */}
            <View style={[styles.heroSection, { paddingHorizontal: containerPadding }]}>
              <View style={styles.heroLeftCol}>
                <View style={[styles.heroChip, { className: 'sa-float-slow' } as any]}>
                  <Svg width="14" height="14" viewBox="0 0 16 16" style={{ marginRight: 6 }}>
                    <Path d="M8 0 l1.8 4.6 L14.5 6 l-3.6 3.1 1 4.9 L8 11.6 4.1 14 l1-4.9 L1.5 6 l4.7 -1.4 Z" fill="#8B84FF" />
                  </Svg>
                  <Text style={styles.heroChipText}>AI CAREER PLATFORM FOR STUDENTS</Text>
                </View>
                <Text style={styles.heroHeadline}>Your Intelligent Companion for a Modern Career</Text>
                <Text style={styles.heroSubhead}>
                  Meet Agent K your always-on career copilot. Connect with mentors, discover events and career opportunities, polish your resume, and follow a personalized roadmap built for the way students actually work today.
                </Text>

                <View style={styles.heroCtaRow}>
                  <GlowButton onPress={() => router.push('/register')} style={styles.heroBtnStudent} textStyle={styles.heroBtnStudentText}>
                    I'm a student  ↗
                  </GlowButton>
                  <GlowButton onPress={() => setActiveTab('contact')} style={styles.heroBtnCollege} textStyle={styles.heroBtnCollegeText}>
                    I'm a college
                  </GlowButton>
                </View>

                <Text style={styles.heroTrustLine}>
                  Free for students · No credit card · Your profile stays private until you reach out
                </Text>
              </View>

              {/* 3D Swaying SA Shield Emblem */}
              <View style={styles.heroRightCol}>
                <View style={[styles.shieldBackdropGlow, { className: 'sa-shield-glow' } as any]} />
                <Animated.View
                  style={{
                    transform: [
                      { perspective: 1200 },
                      { rotateY: shieldRotateY },
                      { translateY: shieldTranslateY },
                    ],
                  }}
                >
                  <Svg width="320" height="360" viewBox="0 0 300 350">
                    <Defs>
                      <LinearGradient id="sa-sh-out" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor="#D8B6FF" />
                        <Stop offset="0.45" stopColor="#9A5CE8" />
                        <Stop offset="1" stopColor="#5B1FB0" />
                      </LinearGradient>
                      <LinearGradient id="sa-sh-in" x1="0" y1="0" x2="0.4" y2="1">
                        <Stop offset="0" stopColor="#B683F5" />
                        <Stop offset="1" stopColor="#7331C9" />
                      </LinearGradient>
                      <LinearGradient id="sa-sh-txt" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#FFFFFF" />
                        <Stop offset="0.55" stopColor="#EDEAF6" />
                        <Stop offset="1" stopColor="#B9B4C6" />
                      </LinearGradient>
                    </Defs>
                    <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#sa-sh-out)" />
                    <Path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#sa-sh-in)" />
                    <SvgText x="150" y="215" textAnchor="middle" fill="url(#sa-sh-txt)" fontSize="128" fontWeight="800">
                      SA
                    </SvgText>
                  </Svg>
                </Animated.View>
              </View>
            </View>

            {/* ── DUAL-ROW CONTINUOUS PARTNER MARQUEES ── */}
            <View style={[styles.marqueeContainer, { paddingHorizontal: containerPadding }]}>
              {/* Row 1: Colleges */}
              <View style={styles.marqueeRow}>
                <View style={styles.marqueeBadge}><Text style={styles.marqueeBadgeText}>COLLEGES</Text></View>
                <Marquee items={COLLEGES_MARQUEE} duration={26000} reverse={false} />
              </View>
              {/* Row 2: Industry */}
              <View style={styles.marqueeRow}>
                <View style={styles.marqueeBadge}><Text style={styles.marqueeBadgeText}>INDUSTRY</Text></View>
                <Marquee items={INDUSTRY_MARQUEE} duration={24000} reverse={true} />
              </View>
            </View>

            {/* ── 02. EVERYTHING YOU NEED (7-CARD BENTO GRID) ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>• EVERYTHING YOU NEED</Text>
              </View>
              <Text style={styles.sectionHeadingH2}>A complete career OS,<br /><Text style={{ color: T.indLt }}>built for students.</Text></Text>
              <Text style={styles.sectionDesc}>Everything from your first job match to your full-time offer in one intelligent platform.</Text>

              <View style={styles.bentoGridContainer}>
                {/* ROW 1: 01 Agent K (Large) + 02 Mentors */}
                <View style={[styles.bentoRow, isNarrow && { flexDirection: 'column' }]}>
                  {/* 01 Agent K */}
                  <HoverLiftCard style={[styles.bentoCard, { flex: 1.68, minWidth: 320 }]}>
                    <Text style={styles.bentoNumber}>01</Text>
                    <View style={styles.bentoIconBadge}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Rect x="4" y="8" width="16" height="11" rx="3" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                        <Path d="M12 8 V4 M9 13 h.01 M15 13 h.01 M9.5 16 h5" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <Text style={styles.bentoTitle}>Agent K</Text>
                    <Text style={styles.bentoBody}>
                      Your always-on AI career copilot. Ask anything: resume tips, interview prep, salary negotiation. Agent K remembers your goals and grows with you.
                    </Text>
                  </HoverLiftCard>

                  {/* 02 Mentors */}
                  <HoverLiftCard style={[styles.bentoCard, { flex: 1, minWidth: 260 }]}>
                    <Text style={styles.bentoNumber}>02</Text>
                    <View style={styles.bentoIconBadge}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Circle cx="9" cy="9" r="3.2" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                        <Path d="M3 19 q6 -6 12 0 M16 7 a3 3 0 0 1 0 6 M18 19 q1.5 -3 3 -4" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <Text style={styles.bentoTitle}>Mentors</Text>
                    <Text style={styles.bentoBody}>One-on-one sessions with alumni from Google, McKinsey, Goldman &amp; more. Book, chat, level up.</Text>
                  </HoverLiftCard>
                </View>

                {/* ROW 2: 03 Events + 04 Student Perks + 05 Career Opportunities */}
                <View style={[styles.bentoRow, isNarrow && { flexDirection: 'column' }]}>
                  {/* 03 Events */}
                  <HoverLiftCard style={[styles.bentoCard, { flex: 1, minWidth: 220 }]}>
                    <Text style={styles.bentoNumber}>03</Text>
                    <View style={styles.bentoIconBadge}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Rect x="4" y="6" width="16" height="14" rx="3" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                        <Path d="M4 10.5 h16 M9 6 V3.5 M15 6 V3.5 M8 14.5 h2.5 M13.5 14.5 h2.5" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <Text style={styles.bentoTitle}>Events</Text>
                    <Text style={styles.bentoBody}>Workshops, hackathons, and industry panels curated to your track and semester.</Text>
                  </HoverLiftCard>

                  {/* 04 Student Perks */}
                  <HoverLiftCard style={[styles.bentoCard, { flex: 1, minWidth: 220 }]}>
                    <Text style={styles.bentoNumber}>04</Text>
                    <View style={styles.bentoIconBadge}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Rect x="3.5" y="9" width="17" height="11" rx="2" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                        <Path d="M3.5 13 h17 M12 9 v11 M12 9 c-4 0 -5 -5 0 -5 c5 0 4 5 0 5" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <Text style={styles.bentoTitle}>Student Perks</Text>
                    <Text style={styles.bentoBody}>Unlock exclusive student deals and discounts on mentorship, courses, and partner services.</Text>
                  </HoverLiftCard>

                  {/* 05 Career Opportunities */}
                  <HoverLiftCard style={[styles.bentoCard, { flex: 1.45, minWidth: 280, borderColor: '#5B4FE9', backgroundColor: 'rgba(91,79,233,0.08)' }]} hoverBorderColor="#8B84FF">
                    <Text style={[styles.bentoNumber, { color: '#8B84FF' }]}>05</Text>
                    <View style={[styles.bentoIconBadge, { backgroundColor: '#5B4FE9', borderColor: '#8B84FF' }]}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Rect x="3.5" y="7.5" width="17" height="12" rx="2.5" stroke="#FFFFFF" strokeWidth="1.8" fill="none" />
                        <Path d="M9 7.5 V5.5 h6 v2 M3.5 13 h17 M12 12 v2" stroke="#FFFFFF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <Text style={[styles.bentoTitle, { color: '#8B84FF' }]}>Career Opportunities</Text>
                    <Text style={styles.bentoBody}>Personalized opportunity feed sourced from partner companies and warm alumni referrals.</Text>
                  </HoverLiftCard>
                </View>

                {/* ROW 3: 06 Resume Polish + 07 Career Roadmap */}
                <View style={[styles.bentoRow, isNarrow && { flexDirection: 'column' }]}>
                  {/* 06 Resume Polish */}
                  <HoverLiftCard style={[styles.bentoCard, { flex: 1, minWidth: 260 }]}>
                    <Text style={styles.bentoNumber}>06</Text>
                    <View style={styles.bentoIconBadge}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Path d="M6 3.5 h8 l4 4 v13 h-12 Z M14 3.5 v4 h4 M9 12 h6 M9 16 h4" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <Text style={styles.bentoTitle}>Resume Polish</Text>
                    <Text style={styles.bentoBody}>Instant AI rewrites with ATS scoring, role-specific keywords, and beautiful design templates.</Text>
                  </HoverLiftCard>

                  {/* 07 Career Roadmap */}
                  <HoverLiftCard style={[styles.bentoCard, { flex: 1.68, minWidth: 320 }]}>
                    <Text style={styles.bentoNumber}>07</Text>
                    <View style={styles.bentoIconBadge}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Path d="M4 6 l5 -2 6 2 5 -2 v14 l-5 2 -6 -2 -5 2 Z M9 4 v14 M15 6 v14" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <Text style={styles.bentoTitle}>Career Roadmap</Text>
                    <Text style={styles.bentoBody}>Visual step-by-step plan from Day 1 to your first offer auto-updated as your goals evolve.</Text>
                  </HoverLiftCard>
                </View>
              </View>
            </View>

            {/* ── 03. COMMAND CENTER DASHBOARD ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>▲ YOUR COMMAND CENTER</Text>
              </View>
              <Text style={styles.sectionHeadingH2}>One dashboard,<br /><Text style={{ color: T.indLt }}>infinite momentum.</Text></Text>
              <Text style={styles.sectionDesc}>Track every application, mentor session, and milestone in a beautifully quiet, deeply intelligent interface.</Text>

              {/* Browser Shell Frame */}
              <View style={styles.dashBrowserFrame}>
                <View style={styles.dashBrowserHeader}>
                  <View style={styles.dotsGroup}>
                    <View style={styles.dotCircle} />
                    <View style={styles.dotCircle} />
                    <View style={styles.dotCircle} />
                  </View>
                  <View style={styles.dashUrlPill}>
                    <Svg width="10" height="10" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                      <Circle cx="12" cy="12" r="10" stroke="#8B84FF" strokeWidth="2.5" fill="none" />
                    </Svg>
                    <Text style={styles.dashUrlText}>studentalumni.ai / overview</Text>
                  </View>
                </View>

                <View style={[styles.dashBodySplit, isNarrow && { flexDirection: 'column' }]}>
                  {/* Left Sidebar */}
                  <View style={styles.dashSidebarCol}>
                    <Text style={styles.dashMenuLabel}>MENU</Text>
                    <View style={[styles.dashSidebarItem, styles.dashSidebarItemActive]}>
                      <Text style={styles.dashSidebarTextActive}>Overview</Text>
                    </View>
                    <View style={styles.dashSidebarItem}><Text style={styles.dashSidebarText}>Agent K</Text></View>
                    <View style={styles.dashSidebarItem}><Text style={styles.dashSidebarText}>Mentors</Text></View>
                    <View style={styles.dashSidebarItem}><Text style={styles.dashSidebarText}>AI Roadmap</Text></View>
                  </View>

                  {/* Right Main Stats */}
                  <View style={styles.dashMainCol}>
                    <View style={styles.kpiTilesRow}>
                      <HoverLiftCard style={styles.kpiTile}>
                        <Text style={styles.kpiHeader}>ACTIVE APPLICATIONS</Text>
                        <Text style={styles.kpiNumber}>12 <Text style={styles.kpiSub}>↗ +3 this week</Text></Text>
                      </HoverLiftCard>
                      <HoverLiftCard style={styles.kpiTile}>
                        <Text style={styles.kpiHeader}>MENTOR HOURS</Text>
                        <Text style={styles.kpiNumber}>8.5h <Text style={styles.kpiSub}>↗ +2h vs last mo</Text></Text>
                      </HoverLiftCard>
                      <HoverLiftCard style={styles.kpiTile}>
                        <Text style={styles.kpiHeader}>SKILL BADGES</Text>
                        <Text style={[styles.kpiNumber, { color: '#8B84FF' }]}>2,450</Text>
                      </HoverLiftCard>
                    </View>

                    {/* Agent K Priority Checklist */}
                    <View style={styles.agentKCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <Svg width="18" height="18" viewBox="0 0 24 24">
                          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#8B84FF" strokeWidth="2" fill="#5B4FE9" />
                        </Svg>
                        <Text style={styles.agentKCardTitle}>Agent K Priorities</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: T.indLt, marginBottom: 8 }}>Curated for you today</Text>
                      <View style={styles.checklistRow}>
                        <Svg width="16" height="16" viewBox="0 0 24 24">
                          <Circle cx="12" cy="12" r="10" stroke="#8B84FF" strokeWidth="2" fill="none" />
                          <Path d="M8 12l3 3 5-5" stroke="#8B84FF" strokeWidth="2" fill="none" />
                        </Svg>
                        <Text style={styles.checkText}>Refine your resume for the Google SWE referral drop.</Text>
                      </View>
                      <View style={styles.checklistRow}>
                        <Svg width="16" height="16" viewBox="0 0 24 24">
                          <Circle cx="12" cy="12" r="10" stroke="#8B84FF" strokeWidth="2" fill="none" />
                          <Path d="M8 12l3 3 5-5" stroke="#8B84FF" strokeWidth="2" fill="none" />
                        </Svg>
                        <Text style={styles.checkText}>Prep 3 questions for tomorrow's mentor call with Sarah.</Text>
                      </View>
                      <View style={styles.checklistRow}>
                        <Svg width="16" height="16" viewBox="0 0 24 24">
                          <Circle cx="12" cy="12" r="10" stroke="#8B84FF" strokeWidth="2" fill="none" />
                          <Path d="M8 12l3 3 5-5" stroke="#8B84FF" strokeWidth="2" fill="none" />
                        </Svg>
                        <Text style={styles.checkText}>Apply to 2 matched career opportunities closing this Friday.</Text>
                      </View>
                    </View>

                    {/* Semester Roadmap progress */}
                    <View style={{ backgroundColor: T.card, borderWidth: 1, borderColor: T.line2, borderRadius: 14, padding: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }}>Career Roadmap</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: T.muted2, backgroundColor: T.line2, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 100 }}>YEAR 3 · SEM 1</Text>
                      </View>
                      <View style={{ height: 8, backgroundColor: T.line2, borderRadius: 100, overflow: 'hidden' }}>
                        <View style={{ width: '45%', height: '100%', backgroundColor: T.ind, borderRadius: 100 }} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: T.dim }}>FOUNDATIONS</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: T.indLt }}>OPPORTUNITIES</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: T.dim }}>FULL-TIME</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 04. OUTCOMES ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <Text style={styles.sectionPillText}>WHERE STUDENTS LANDED</Text>
              <Text style={styles.sectionHeadingH2}>Four students, four <Text style={{ color: T.indLt }}>first offers.</Text></Text>
              <View style={styles.outcomesGrid}>
                {[
                  { name: 'Aisha K.', info: "CS '26 · Hyderabad", story: 'Two mentor calls, one resume rewrite, SWE offer in four months.', role: 'SWE · PRODUCT COMPANY' },
                  { name: 'Rohan M.', info: "ECE '25 · Pune", story: 'Matched to an alumnus who ran the same internship two years earlier.', role: 'DATA ANALYST · FINTECH' },
                  { name: 'Ira S.', info: "Design '26 · Remote", story: 'Portfolio review with a design lead, then a referral into her shortlist.', role: 'PRODUCT DESIGN INTERN' },
                  { name: 'Dev P.', info: "MBA '25 · Mumbai", story: 'Used the roadmap to pick electives that matched his target role.', role: 'STRATEGY ASSOCIATE' },
                ].map((item, i) => (
                  <HoverLiftCard key={i} style={styles.outcomeTile}>
                    <Text style={styles.outcomeInfo}>{item.info}</Text>
                    <Text style={styles.outcomeName}>{item.name}</Text>
                    <Text style={styles.outcomeStory}>{item.story}</Text>
                    <Text style={styles.outcomeRole}>{item.role}</Text>
                  </HoverLiftCard>
                ))}
              </View>
            </View>

            {/* ── 05. FOR ALUMNI ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={[styles.alumniRow, isNarrow && { flexDirection: 'column' }]}>
                <View style={styles.alumniLeftCol}>
                  <View style={styles.sectionPill}><Text style={styles.sectionPillText}>IF YOU ARE AN ALUMNUS</Text></View>
                  <Text style={styles.sectionHeadingH2}>One hour a month, <Text style={{ color: T.indLt }}>clearly spent.</Text></Text>
                  <Text style={styles.sectionDesc}>You set your capacity. Nothing is proposed that you have not agreed to. Every hour is logged against your college's placement record, so the contribution is visible where it counts.</Text>
                  <GlowButton onPress={() => router.push('/register')} style={styles.heroBtnCollege} textStyle={styles.heroBtnCollegeText}>
                    Become a mentor
                  </GlowButton>
                </View>
                <View style={styles.alumniRightCol}>
                  <View style={styles.alumniPillarBox}>
                    <Text style={styles.alumniPillarNum}>01</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alumniPillarTitle}>You choose the load</Text>
                      <Text style={styles.alumniPillarSub}>One call, one review, or answer questions in writing only.</Text>
                    </View>
                  </View>
                  <View style={styles.alumniPillarBox}>
                    <Text style={styles.alumniPillarNum}>02</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alumniPillarTitle}>Agendas arrive prepared</Text>
                      <Text style={styles.alumniPillarSub}>Each session opens with the student's roadmap and three questions.</Text>
                    </View>
                  </View>
                  <View style={styles.alumniPillarBox}>
                    <Text style={styles.alumniPillarNum}>03</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alumniPillarTitle}>Answers compound</Text>
                      <Text style={styles.alumniPillarSub}>Anything you answer once is archived, so it is never asked again.</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 07. AUDIENCES (4 BENTO PANELS WITH ANIMATED MOTION) ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={styles.sectionPill}><Text style={styles.sectionPillText}>• WHO IT IS FOR</Text></View>
              <Text style={styles.sectionHeadingH2}>Four points of view, <Text style={{ color: T.indLt }}>one graph.</Text></Text>
              <View style={styles.audiencesGrid}>
                {/* 01 Students */}
                <HoverLiftCard style={styles.audienceCard} hoverBorderColor="#8B84FF">
                  <View style={styles.audienceContent}>
                    <Text style={styles.audienceTag}>01 / STUDENTS</Text>
                    <Text style={styles.audienceTitle}>A roadmap, not a guess</Text>
                    <Text style={styles.audienceDesc}>Term-by-term steps built from your course, goals and gaps — with the alumnus who has already walked it attached to each step.</Text>
                  </View>
                  <View style={styles.audienceSvgBox}>
                    <Svg width="160" height="130" viewBox="0 0 300 190">
                      <Path d="M104 78 L150 54 L196 78 L150 102 Z" fill="#8B84FF" />
                      <Path d="M196 78 v24" stroke="#8B84FF" strokeWidth="4" />
                      <Rect x="60" y="120" width="180" height="18" rx="4" fill="#3B2F8F" />
                      <Rect x="74" y="138" width="152" height="18" rx="4" fill="#8B84FF" opacity="0.55" />
                      <Rect x="60" y="156" width="180" height="18" rx="4" fill="#3B2F8F" />
                    </Svg>
                  </View>
                </HoverLiftCard>

                {/* 02 Alumni */}
                <HoverLiftCard style={styles.audienceCard} hoverBorderColor="#8B84FF">
                  <View style={styles.audienceContent}>
                    <Text style={styles.audienceTag}>02 / ALUMNI</Text>
                    <Text style={styles.audienceTitle}>Give an hour a month</Text>
                    <Text style={styles.audienceDesc}>Answer questions, post a role, run a portfolio review. Contribution is tracked and visible to your college.</Text>
                  </View>
                  <View style={styles.audienceSvgBox}>
                    <Svg width="160" height="130" viewBox="0 0 300 190">
                      <Circle cx="150" cy="80" r="38" fill="#2A2E45" />
                      <Circle cx="150" cy="80" r="24" fill="#5B4FE9" opacity="0.5" />
                      <Path d="M124 128 l-14 44 26 -12 M176 128 l14 44 -26 -12" fill="#5B4FE9" />
                    </Svg>
                  </View>
                </HoverLiftCard>

                {/* 03 Mentors */}
                <HoverLiftCard style={styles.audienceCard} hoverBorderColor="#8B84FF">
                  <View style={styles.audienceContent}>
                    <Text style={styles.audienceTag}>03 / MENTORS</Text>
                    <Text style={styles.audienceTitle}>Calls with an agenda</Text>
                    <Text style={styles.audienceDesc}>Every session opens with prompts drawn from the student roadmap, so the first fifteen minutes are never wasted.</Text>
                  </View>
                  <View style={styles.audienceSvgBox}>
                    <Svg width="160" height="130" viewBox="0 0 300 190">
                      <Path d="M52 44 h120 q10 0 10 10 v46 q0 10 -10 10 h-72 l-22 18 v-18 h-26 q-10 0 -10 -10 v-46 q0 -10 10 -10 Z" fill="#3B82F6" opacity="0.85" />
                      <Path d="M148 92 h96 q10 0 10 10 v40 q0 10 -10 10 h-60 l-20 16 v-16 h-16 q-10 0 -10 -10 v-40 q0 -10 10 -10 Z" fill="#1E3A6B" />
                    </Svg>
                  </View>
                </HoverLiftCard>

                {/* 04 Colleges */}
                <HoverLiftCard style={styles.audienceCard} hoverBorderColor="#8B84FF">
                  <View style={styles.audienceContent}>
                    <Text style={styles.audienceTag}>04 / COLLEGES</Text>
                    <Text style={styles.audienceTitle}>Placement, in one view</Text>
                    <Text style={styles.audienceDesc}>Engagement, mentorship hours and placement outcomes reported per cohort, per department, per term.</Text>
                  </View>
                  <View style={styles.audienceSvgBox}>
                    <Svg width="160" height="130" viewBox="0 0 300 190">
                      <Rect x="40" y="112" width="60" height="58" fill="#4F46C7" />
                      <Rect x="108" y="72" width="84" height="98" fill="#A78BFA" opacity="0.8" />
                      <Rect x="200" y="98" width="60" height="72" fill="#4F46C7" />
                      <Path d="M108 72 L150 44 L192 72 Z" fill="#A78BFA" />
                      <Rect x="30" y="170" width="240" height="8" rx="4" fill="#4F46C7" />
                    </Svg>
                  </View>
                </HoverLiftCard>
              </View>
            </View>

            {/* ── 06. NUMBERS WITH VIEWPORT-TRIGGERED LIVE COUNTERS ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={styles.numbersWrapper}>
                <Text style={styles.sectionPillText}>BY THE NUMBERS</Text>
                <Text style={styles.sectionHeadingH2}>Trusted by students <Text style={{ color: T.indLt }}>worldwide</Text></Text>
                <View style={styles.numbersGrid}>
                  <HoverLiftCard style={styles.numberItem}>
                    <View style={styles.numberIconBox}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Circle cx="9" cy="9" r="3.2" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                        <Path d="M3 19 q6 -6 12 0 M16 7 a3 3 0 0 1 0 6 M18 19 q1.5 -3 3 -4" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <ScrollCounter target={50000} suffix="+" trigger={numbersTrigger} style={styles.statBig} />
                    <Text style={styles.statTitle}>Active Students</Text>
                    <Text style={styles.statDesc}>and growing every day</Text>
                  </HoverLiftCard>

                  <HoverLiftCard style={styles.numberItem}>
                    <View style={styles.numberIconBox}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Circle cx="12" cy="9" r="5" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                        <Path d="M9 14 l-2 8 5 -3 5 3 -2 -8" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <ScrollCounter target={1200} suffix="+" trigger={numbersTrigger} style={styles.statBig} />
                    <Text style={styles.statTitle}>Verified Mentors</Text>
                    <Text style={styles.statDesc}>from top 500 companies</Text>
                  </HoverLiftCard>

                  <HoverLiftCard style={styles.numberItem}>
                    <View style={styles.numberIconBox}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Path d="M5 20 V7 l7 -3 v16 M12 20 V10 l7 3 v7 M8 11 h1 M8 15 h1 M15 15 h1" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <ScrollCounter target={200} suffix="+" trigger={numbersTrigger} style={styles.statBig} />
                    <Text style={styles.statTitle}>Partner Universities</Text>
                    <Text style={styles.statDesc}>across 30+ countries</Text>
                  </HoverLiftCard>

                  <HoverLiftCard style={styles.numberItem}>
                    <View style={styles.numberIconBox}>
                      <Svg width="22" height="22" viewBox="0 0 24 24">
                        <Path d="M4 17 l5 -5 3 3 6 -7 M14 8 h5 v5" stroke="#8B84FF" strokeWidth="1.8" fill="none" />
                      </Svg>
                    </View>
                    <ScrollCounter target={96} suffix="%" trigger={numbersTrigger} style={styles.statBig} />
                    <Text style={styles.statTitle}>Placement Rate</Text>
                    <Text style={styles.statDesc}>within 6 months of joining</Text>
                  </HoverLiftCard>
                </View>
              </View>
            </View>

            {/* ── 08. ROADMAP TIMELINE S-CURVE (SCROLL-LINKED FILLING PATH) ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={styles.roadmapHeadingRow}>
                <Text style={styles.sectionHeadingH2}>The roadmap fills in <Text style={{ color: T.indLt }}>as you scroll.</Text></Text>
                <Text style={styles.roadmapSub}>DAY 1 → FIRST OFFER</Text>
              </View>
              <View style={{ alignItems: 'center', width: '100%', marginVertical: 20 }}>
                <Svg width="100%" height="240" viewBox="0 0 1280 300">
                  {/* Background Base Curve */}
                  <Path
                    d="M30 230 C 210 230 220 70 360 70 S 560 230 700 230 S 880 60 1010 60 S 1220 170 1250 170"
                    stroke="#1E2238"
                    strokeWidth="5"
                    fill="none"
                  />
                  
                  {/* Scroll-Driven Active Filling Stroke */}
                  <Path
                    d="M30 230 C 210 230 220 70 360 70 S 560 230 700 230 S 880 60 1010 60 S 1220 170 1250 170"
                    stroke="#8B84FF"
                    strokeWidth="5"
                    fill="none"
                    strokeDasharray={String(PATH_TOTAL_LENGTH)}
                    strokeDashoffset={String(roadmapStrokeDashoffset)}
                  />
                  
                  {/* Milestone 01: Foundations */}
                  {roadmapScrollProgress >= 0.05 && (
                    <Circle cx="30" cy="230" r="16" fill="#5B4FE9" opacity="0.4" />
                  )}
                  <Circle cx="30" cy="230" r="9" fill={roadmapScrollProgress >= 0.05 ? '#8B84FF' : '#05060F'} stroke="#8B84FF" strokeWidth="3.5" />
                  <SvgText x="30" y="275" textAnchor="middle" fill={roadmapScrollProgress >= 0.05 ? '#F4F5FB' : '#5C6273'} fontSize="18" fontWeight="700">01 Foundations</SvgText>

                  {/* Milestone 02: Skill plan */}
                  {roadmapScrollProgress >= 0.35 && (
                    <Circle cx="360" cy="70" r="16" fill="#5B4FE9" opacity="0.4" />
                  )}
                  <Circle cx="360" cy="70" r="9" fill={roadmapScrollProgress >= 0.35 ? '#8B84FF' : '#05060F'} stroke="#8B84FF" strokeWidth="3.5" />
                  <SvgText x="360" y="35" textAnchor="middle" fill={roadmapScrollProgress >= 0.35 ? '#F4F5FB' : '#5C6273'} fontSize="18" fontWeight="700">02 Skill plan</SvgText>

                  {/* Milestone 03: Opportunities */}
                  {roadmapScrollProgress >= 0.70 && (
                    <Circle cx="700" cy="230" r="16" fill="#5B4FE9" opacity="0.4" />
                  )}
                  <Circle cx="700" cy="230" r="9" fill={roadmapScrollProgress >= 0.70 ? '#8B84FF' : '#05060F'} stroke="#8B84FF" strokeWidth="3.5" />
                  <SvgText x="700" y="275" textAnchor="middle" fill={roadmapScrollProgress >= 0.70 ? '#F4F5FB' : '#5C6273'} fontSize="18" fontWeight="700">03 Opportunities</SvgText>

                  {/* Milestone 04: Full-time */}
                  {roadmapScrollProgress >= 0.95 && (
                    <Circle cx="1010" cy="60" r="16" fill="#5B4FE9" opacity="0.4" />
                  )}
                  <Circle cx="1010" cy="60" r="9" fill={roadmapScrollProgress >= 0.95 ? '#8B84FF' : '#05060F'} stroke="#8B84FF" strokeWidth="3.5" />
                  <SvgText x="1010" y="25" textAnchor="middle" fill={roadmapScrollProgress >= 0.95 ? '#F4F5FB' : '#5C6273'} fontSize="18" fontWeight="700">04 Full-time</SvgText>
                </Svg>
              </View>
            </View>

            {/* ── 09. ON CAMPUS (PHYSICAL 3D LAYERED POLAROID CARD STACK) ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={[styles.campusRow, isNarrow && { flexDirection: 'column' }]}>
                <View style={styles.campusLeftCol}>
                  <View style={styles.sectionPill}><Text style={styles.sectionPillText}>ON CAMPUS</Text></View>
                  <Text style={styles.sectionHeadingH2}>A year on <Text style={{ color: T.indLt }}>the network.</Text></Text>
                  <Text style={styles.sectionDesc}>The stack deals itself forward every few seconds. Click any marker or the card below to bring the next moment to the front.</Text>
                  <View style={styles.deckDotsRow}>
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => setDeckIdx(idx)}
                        style={[styles.deckDot, deckIdx === idx && styles.deckDotActive]}
                      />
                    ))}
                  </View>
                </View>

                {/* 3D Stack Container */}
                <View style={styles.campusRightCol}>
                  <Pressable
                    onPress={() => setDeckIdx((p) => (p + 1) % 5)}
                    style={styles.cardStackWrapper}
                  >
                    {/* Stack Card 2 (Deep Background) */}
                    <View
                      style={[
                        styles.polaroidCard,
                        styles.stackedCardDeep,
                        { transform: [{ translateY: 24 }, { rotate: '-4deg' }, { scale: 0.92 }] },
                      ]}
                    />

                    {/* Stack Card 1 (Mid Background) */}
                    <View
                      style={[
                        styles.polaroidCard,
                        styles.stackedCardMid,
                        { transform: [{ translateY: 12 }, { rotate: '3deg' }, { scale: 0.96 }] },
                      ]}
                    />

                    {/* Active Top Card */}
                    <View
                      style={[
                        styles.polaroidCard,
                        styles.stackedCardTop,
                        {
                          transform: [{ translateY: 0 }, { rotate: '-1.5deg' }, { scale: 1 }],
                          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                        } as any,
                      ]}
                    >
                      {/* SVG 0: Alumni Career Fair */}
                      {deckIdx === 0 && (
                        <Svg width="100%" height="240" viewBox="0 0 320 260">
                          <Circle cx="252" cy="60" r="46" fill="#2A2E45" />
                          <Path d="M40 96 h240" stroke="#8B84FF" strokeWidth="3" />
                          <Path d="M56 96 v-22 h208 v22" fill="none" stroke="#5B4FE9" strokeWidth="3" />
                          <Rect x="92" y="46" width="136" height="30" rx="6" fill="#5B4FE9" />
                          <Circle cx="96" cy="150" r="14" fill="#D5D8E4" />
                          <Path d="M76 208 q0 -34 20 -34 q20 0 20 34 Z" fill="#5B4FE9" />
                          <Circle cx="160" cy="142" r="16" fill="#8B84FF" />
                          <Path d="M137 209 q0 -39 23 -39 q23 0 23 39 Z" fill="#2A2E45" />
                          <Circle cx="226" cy="152" r="13" fill="#A78BFA" />
                          <Path d="M207 207 q0 -32 19 -32 q19 0 19 32 Z" fill="#5B4FE9" />
                        </Svg>
                      )}
                      {/* SVG 1: One to One Mentoring */}
                      {deckIdx === 1 && (
                        <Svg width="100%" height="240" viewBox="0 0 320 260">
                          <Circle cx="70" cy="66" r="40" fill="#2A2E45" />
                          <Circle cx="96" cy="120" r="15" fill="#D5D8E4" />
                          <Path d="M74 184 q0 -37 22 -37 q22 0 22 37 Z" fill="#5B4FE9" />
                          <Circle cx="224" cy="120" r="15" fill="#8B84FF" />
                          <Path d="M202 184 q0 -37 22 -37 q22 0 22 37 Z" fill="#2A2E45" />
                          <Rect x="52" y="186" width="216" height="12" rx="6" fill="#8B84FF" />
                          <Path d="M146 54 h74 q10 0 10 10 v30 q0 10 -10 10 h-46 l-18 16 v-16 q-10 0 -10 -10 v-30 q0 -10 10 -10 Z" fill="#5B4FE9" />
                        </Svg>
                      )}
                      {/* SVG 2: Hackathon Weekend */}
                      {deckIdx === 2 && (
                        <Svg width="100%" height="240" viewBox="0 0 320 260">
                          <Circle cx="88" cy="74" r="12" fill="#8B84FF" />
                          <Circle cx="232" cy="74" r="12" fill="#A78BFA" />
                          <Rect x="66" y="128" width="188" height="112" rx="8" fill="#2A2E45" />
                          <Rect x="80" y="142" width="160" height="82" rx="4" fill="#090B16" />
                          <Path d="M94 162 h48 M94 178 h72 M94 194 h36 M94 210 h60" stroke="#5B4FE9" strokeWidth="4" />
                        </Svg>
                      )}
                      {/* SVG 3: Graduation */}
                      {deckIdx === 3 && (
                        <Svg width="100%" height="240" viewBox="0 0 320 260">
                          <Circle cx="160" cy="130" r="86" fill="#2A2E45" />
                          <Circle cx="160" cy="128" r="21" fill="#D5D8E4" />
                          <Path d="M130 214 q0 -51 30 -51 q30 0 30 51 Z" fill="#5B4FE9" />
                          <Path d="M112 92 L160 68 L208 92 L160 116 Z" fill="#8B84FF" />
                          <Path d="M208 92 v26" stroke="#8B84FF" strokeWidth="4" />
                        </Svg>
                      )}
                      {/* SVG 4: First week on the job */}
                      {deckIdx === 4 && (
                        <Svg width="100%" height="240" viewBox="0 0 320 260">
                          <Rect x="44" y="176" width="232" height="12" rx="6" fill="#8B84FF" />
                          <Rect x="118" y="96" width="120" height="72" rx="6" fill="#2A2E45" />
                          <Rect x="130" y="108" width="96" height="48" rx="3" fill="#3B82F6" opacity="0.45" />
                          <Circle cx="88" cy="118" r="14" fill="#D5D8E4" />
                          <Path d="M68 176 q0 -34 20 -34 q20 0 20 34 Z" fill="#5B4FE9" />
                        </Svg>
                      )}
                      <View style={styles.polaroidCaptionRow}>
                        <Text style={styles.polaroidTitle}>
                          {['Alumni career fair', 'One-to-one mentoring', 'Hackathon weekend', 'Graduation', 'First week on the job'][deckIdx]}
                        </Text>
                        <Text style={styles.polaroidMonth}>
                          {['March', 'Library, block C', 'Alumni-run', 'Class of 2026', 'Internship'][deckIdx]}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* ── 10. MATCH GRAPH ORBITAL RADAR (SWEEPING RADAR BEAM & HOVER NODES) ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={styles.sectionPill}><Text style={styles.sectionPillText}>• HOW MATCHING WORKS</Text></View>
              <Text style={styles.sectionHeadingH2}>1,200+ verified mentors,<br /><Text style={{ color: T.indLt }}>ranked by fit.</Text></Text>
              <Text style={styles.sectionDesc}>Agent K scores every alumnus against your course, goals and city. Hover a node to see the connection and why it was chosen.</Text>

              <View style={[styles.matchGraphRow, isNarrow && { flexDirection: 'column' }]}>
                {/* Detail Box */}
                <HoverLiftCard style={styles.matchDetailBanner}>
                  <Text style={styles.matchDetailHeader}>MATCH DETAIL</Text>
                  <Text style={styles.matchDetailName}>{selectedNode.name}</Text>
                  <Text style={styles.matchDetailWhy}>{selectedNode.why}</Text>
                </HoverLiftCard>

                {/* Radar SVG with active rotating beam scanner */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Svg width="100%" height="340" viewBox="0 0 620 540">
                    <Defs>
                      <LinearGradient id="radarSweepGrad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor="#8B84FF" stopOpacity="0.45" />
                        <Stop offset="0.6" stopColor="#5B4FE9" stopOpacity="0.12" />
                        <Stop offset="1" stopColor="transparent" stopOpacity="0" />
                      </LinearGradient>
                    </Defs>

                    {/* Orbital Rings */}
                    <Circle cx="310" cy="270" r="128" stroke="#1B1E33" strokeDasharray="4,8" fill="none" strokeWidth="1.2" />
                    <Circle cx="310" cy="270" r="206" stroke="#1B1E33" strokeDasharray="4,8" fill="none" strokeWidth="1.2" />
                    
                    {/* Rotating Radar Scanner Beam */}
                    <G style={{ className: 'sa-radar-spin' } as any}>
                      <Path d="M310 270 L 516 270 A 206 206 0 0 1 455 415 Z" fill="url(#radarSweepGrad)" />
                    </G>

                    {/* Selected Node Target Line */}
                    <Line x1="310" y1="270" x2={selectedNode.x} y2={selectedNode.y} stroke="#8B84FF" strokeWidth="2.4" strokeDasharray="5,6" />
                    
                    {/* Center User Hub */}
                    <Circle cx="310" cy="270" r="52" fill="#0C0E1B" stroke="#8B84FF" strokeWidth="2.5" />
                    <SvgText x="310" y="266" textAnchor="middle" fill="#F4F5FB" fontSize="16" fontWeight="800">YOU</SvgText>
                    <SvgText x="310" y="286" textAnchor="middle" fill="#9AA0B4" fontSize="10" fontWeight="700">YEAR 3</SvgText>

                    {[
                      { x: 310, y: 132, score: '98', name: 'Priya R. — Product, Bengaluru', why: 'Same course, 4 years ahead. Mentors 3 students each term.' },
                      { x: 430, y: 201, score: '92', name: 'Arjun M. — Data, Pune', why: 'Ex-intern at target firm. Reviews analytics portfolios monthly.' },
                      { x: 430, y: 339, score: '88', name: 'Neha S. — Design, Remote', why: 'Runs the portfolio review your roadmap suggests next.' },
                      { x: 310, y: 408, score: '85', name: 'Rohit K. — Finance, Mumbai', why: 'Alumnus of your college, hiring two summer interns.' },
                      { x: 190, y: 339, score: '81', name: 'Sana T. — Research, Delhi', why: 'Published in your field, open to weekly calls.' },
                      { x: 190, y: 201, score: '76', name: 'Dev P. — Engineering, Hyderabad', why: 'Took the same electives. Answers within a day.' },
                    ].map((node, i) => {
                      const isSelected = selectedNode.x === String(node.x) && selectedNode.y === String(node.y);
                      return (
                        <G
                          key={i}
                          onPress={() => setSelectedNode({ name: node.name, why: node.why, x: String(node.x), y: String(node.y) })}
                          onMouseEnter={() => setSelectedNode({ name: node.name, why: node.why, x: String(node.x), y: String(node.y) })}
                          style={{ cursor: 'pointer' }}
                        >
                          {isSelected && (
                            <Circle cx={node.x} cy={node.y} r="38" fill="#5B4FE9" opacity="0.4" />
                          )}
                          <Circle
                            cx={node.x}
                            cy={node.y}
                            r="32"
                            fill="#0C0E1B"
                            stroke={isSelected ? '#8B84FF' : '#2A2E45'}
                            strokeWidth={isSelected ? 2.8 : 1.6}
                          />
                          <SvgText
                            x={node.x}
                            y={node.y + 5}
                            textAnchor="middle"
                            fill={isSelected ? '#FFFFFF' : '#8B84FF'}
                            fontSize="13"
                            fontWeight="700"
                          >
                            {node.score}
                          </SvgText>
                        </G>
                      );
                    })}
                  </Svg>
                </View>
              </View>
            </View>

            {/* ── 10b. ON THE GROUND ECHO EVENTS ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <HoverLiftCard style={styles.onTheGroundCard}>
                <View style={styles.otgTag}><Text style={styles.otgTagText}>• ON THE GROUND</Text></View>
                <Text style={styles.otgTitle}>The network is a feed until it meets in person.</Text>
                <Text style={styles.otgDesc}>Eighty-six ECHO events across thirty-one campuses. Alumni in the room, recruiters at the table, and a build sprint that runs overnight.</Text>
                <View style={styles.otgStatsRow}>
                  <View><Text style={[styles.otgStatNum, { color: '#4B3FA8' }]}>86</Text><Text style={styles.otgStatLabel}>events run</Text></View>
                  <View><Text style={[styles.otgStatNum, { color: '#0E6E8C' }]}>31</Text><Text style={styles.otgStatLabel}>cities</Text></View>
                  <View><Text style={[styles.otgStatNum, { color: '#A21C63' }]}>4.8</Text><Text style={styles.otgStatLabel}>average rating</Text></View>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
                  <GlowButton onPress={() => setActiveTab('events')} style={[styles.verifySubmitBtn, { backgroundColor: '#4B3FD6' }]} textStyle={styles.verifySubmitBtnText}>
                    See the events
                  </GlowButton>
                  <GlowButton onPress={() => setActiveTab('contact')} style={[styles.heroBtnCollege, { borderColor: '#CFC9F3' }]} textStyle={[styles.heroBtnCollegeText, { color: '#2E2A55' }]}>
                    Host on your campus
                  </GlowButton>
                </View>
                <View style={styles.otgHostsRow}>
                  <Text style={styles.otgHostsHeader}>RECENT HOSTS: </Text>
                  {['Sreenidhi Institute', 'VNR VJIET', 'Khammam Institute', 'CBIT Hyderabad'].map((h, idx) => (
                    <Text key={idx} style={styles.otgHostPill}>{h}</Text>
                  ))}
                </View>
              </HoverLiftCard>
            </View>

            {/* ── 11. TESTIMONIALS (INTERACTIVE PROGRESS DECK) ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={styles.sectionPill}><Text style={styles.sectionPillText}>FROM THE NETWORK</Text></View>
              <Text style={styles.sectionHeadingH2}>Students, alumni <Text style={{ color: T.indLt }}>and offices.</Text></Text>
              <HoverLiftCard style={styles.testimonialCard}>
                <Text style={styles.testimonialQuote}>
                  {[
                    '“I had no idea who to ask in my final year. Two mentor calls turned a vague plan into an actual offer.”',
                    '“One hour a month, and three of my mentees have internships this summer.”',
                    '“Placement reporting took our office three weeks a term. It is now a dashboard we read on a Monday.”',
                  ][quoteIdx]}
                </Text>
                <Text style={styles.testimonialAuthor}>
                  {[
                    'AISHA · YEAR 4, COMPUTER SCIENCE',
                    'ARJUN · ALUMNUS, DATA SCIENCE',
                    'R. IYER · CAREER SERVICES, PARTNER COLLEGE',
                  ][quoteIdx]}
                </Text>
              </HoverLiftCard>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                {[0, 1, 2].map((idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setQuoteIdx(idx)}
                    style={{ width: 34, height: 5, borderRadius: 3, backgroundColor: quoteIdx === idx ? T.indLt : T.line, cursor: 'pointer' }}
                  />
                ))}
              </View>
            </View>

            {/* ── 12. FINAL CALL TO ACTION ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={styles.ctaCardBanner}>
                <View style={styles.sectionPill}>
                  <Svg width="12" height="12" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#8B84FF" strokeWidth="2" fill="#5B4FE9" />
                  </Svg>
                  <Text style={styles.sectionPillText}>START YOUR JOURNEY</Text>
                </View>
                <Text style={styles.ctaTitleH2}>Your career, quietly<br /><Text style={{ color: T.indLt }}>upgraded.</Text></Text>
                <Text style={styles.ctaSubtitle}>Join 50,000+ students already using StudentAlumni to land career opportunities, find mentors, and build their future. No credit card required.</Text>
                <GlowButton onPress={() => router.push('/register')} style={styles.ctaActionButton} textStyle={styles.ctaActionButtonText}>
                  Create your free account ↗
                </GlowButton>

                {/* 3 FAQ Columns */}
                <View style={styles.ctaFaqRow}>
                  <View style={styles.faqCol}>
                    <Text style={styles.faqTitle}>Is it free?</Text>
                    <Text style={styles.faqDesc}>Free for students, always. Colleges pay per cohort.</Text>
                  </View>
                  <View style={styles.faqCol}>
                    <Text style={styles.faqTitle}>Who sees my profile?</Text>
                    <Text style={styles.faqDesc}>Nobody, until you send a request yourself.</Text>
                  </View>
                  <View style={styles.faqCol}>
                    <Text style={styles.faqTitle}>If no mentor replies?</Text>
                    <Text style={styles.faqDesc}>We re-match within 48 hours, up to three times.</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 1.6, color: T.dim, marginTop: 30 }}>TAKES LESS THAN 60 SECONDS TO SET UP</Text>
              </View>
            </View>
          </>
        )}

        {/* ── 13. GLOBAL FOOTER ── */}
        <View style={styles.footerSection}>
          <View style={[styles.footerInner, { paddingHorizontal: containerPadding }]}>
            <View style={styles.footerBrandCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Svg width="24" height="28" viewBox="0 0 300 350">
                  <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="#8B84FF" />
                  <SvgText x="150" y="214" textAnchor="middle" fill="#FFFFFF" fontSize="118" fontWeight="800">SA</SvgText>
                </Svg>
                <Text style={styles.footerBrandTitle}>StudentAlumni</Text>
              </View>
              <Text style={styles.footerBrandSub}>The intelligent career companion built for the <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>next generation</Text> of students.</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* LinkedIn SVG */}
                <View style={styles.socialBox}>
                  <Svg width="18" height="18" viewBox="0 0 24 24">
                    <Rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.4" stroke="#B6BACB" strokeWidth="1.9" fill="none" />
                    <Path d="M7.6 10.4v6.2" stroke="#B6BACB" strokeWidth="1.9" fill="none" />
                    <Circle cx="7.6" cy="7.4" r="0.9" fill="#B6BACB" />
                    <Path d="M11.6 16.6v-3.4a2.6 2.6 0 015.2 0v3.4M11.6 16.6v-6.2" stroke="#B6BACB" strokeWidth="1.9" fill="none" />
                  </Svg>
                </View>
                {/* Instagram SVG */}
                <View style={styles.socialBox}>
                  <Svg width="18" height="18" viewBox="0 0 24 24">
                    <Rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" stroke="#B6BACB" strokeWidth="1.9" fill="none" />
                    <Circle cx="12" cy="12" r="4.1" stroke="#B6BACB" strokeWidth="1.9" fill="none" />
                    <Circle cx="16.9" cy="7.1" r="1.05" fill="#B6BACB" />
                  </Svg>
                </View>
              </View>
            </View>
            <View style={styles.footerLinksCol}>
              <Text style={styles.footerColHeader}>RESOURCES</Text>
              <Pressable onPress={() => setActiveTab('verify')}><Text style={styles.footerLinkText}>Verify Certificate</Text></Pressable>
              <Pressable onPress={() => setActiveTab('events')}><Text style={styles.footerLinkText}>Blog</Text></Pressable>
              <Pressable onPress={() => setActiveTab('contact')}><Text style={styles.footerLinkText}>Help center</Text></Pressable>
              <Pressable onPress={() => setActiveTab('home')}><Text style={styles.footerLinkText}>Community</Text></Pressable>
            </View>
            <View style={styles.footerLinksCol}>
              <Text style={styles.footerColHeader}>LEGAL</Text>
              <Text style={styles.footerLinkText}>Privacy &amp; Terms</Text>
              <Text style={styles.footerLinkText}>Security &amp; Cookies</Text>
            </View>
            <View style={styles.footerLinksCol}>
              <Text style={styles.footerColHeader}>COMPLIANCE</Text>
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Svg width="14" height="14" viewBox="0 0 24 24"><Path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" stroke="#34D399" strokeWidth="2" fill="none" /><Path d="M9 12l2 2 4-4" stroke="#34D399" strokeWidth="2" fill="none" /></Svg>
                  <Text style={styles.footerComplianceText}>DPDP Act 2023</Text>
                </View>
                <Text style={{ fontSize: 12, color: T.dim }}>India · data principal rights</Text>
              </View>
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Svg width="14" height="14" viewBox="0 0 24 24"><Path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" stroke="#34D399" strokeWidth="2" fill="none" /><Path d="M9 12l2 2 4-4" stroke="#34D399" strokeWidth="2" fill="none" /></Svg>
                  <Text style={styles.footerComplianceText}>GDPR</Text>
                </View>
                <Text style={{ fontSize: 12, color: T.dim }}>EU · lawful basis and DPAs</Text>
              </View>
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Svg width="14" height="14" viewBox="0 0 24 24"><Path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" stroke="#34D399" strokeWidth="2" fill="none" /><Path d="M9 12l2 2 4-4" stroke="#34D399" strokeWidth="2" fill="none" /></Svg>
                  <Text style={styles.footerComplianceText}>SOC 2 Type II</Text>
                </View>
                <Text style={{ fontSize: 12, color: T.dim }}>Audited controls, annual</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Svg width="14" height="14" viewBox="0 0 24 24"><Path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" stroke="#8B84FF" strokeWidth="2" fill="none" /></Svg>
                <Text style={{ fontSize: 13.5, color: T.indLt, fontWeight: '600' }}>Responsible disclosure</Text>
              </View>
            </View>
          </View>

          {/* Newsletter Box */}
          <View style={[styles.newsletterRow, { marginHorizontal: 'auto' as any, maxWidth: 1360, width: '100%' }]}>
            <View style={{ flex: 1, minWidth: 260 }}>
              <Text style={styles.newsletterTitle}>One email a month. Nothing else.</Text>
              <Text style={styles.newsletterSub}>New openings, mentor drops and campus events — no noise.</Text>
            </View>
            <View style={styles.newsletterControl}>
              <TextInput
                placeholder="you@college.edu"
                placeholderTextColor={T.dim}
                style={styles.newsletterInput}
              />
              <GlowButton
                onPress={() => {
                  setSubscribed(true);
                  setTimeout(() => setSubscribed(false), 2200);
                }}
                style={styles.subscribeBtn}
                textStyle={styles.subscribeBtnText}
              >
                {subscribed ? 'Subscribed ✓' : 'Subscribe'}
              </GlowButton>
            </View>
          </View>

          <View style={[styles.footerBottomBar, { marginHorizontal: 'auto' as any, maxWidth: 1360, width: '100%', paddingHorizontal: containerPadding }]}>
            <View>
              <Text style={styles.footerBrandGrad}>#studentalumni</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <Text style={styles.footerCopyright}>Built with love for students</Text>
                <Svg width="14" height="14" viewBox="0 0 24 24">
                  <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#8B84FF" />
                </Svg>
                <Text style={styles.footerCopyright}>across all campus's</Text>
              </View>
            </View>
            <Text style={styles.footerCopyrightSmall}>All rights reserved @ Student Alumni 2026</Text>
          </View>
        </View>

      </ScrollView>

      {/* Sticky Bottom Bar on Scroll */}
      {showStickyBar && (
        <View style={[styles.stickyBottomBar, { paddingHorizontal: containerPadding }]}>
          <Text style={styles.stickyBottomText}>Free for students · about a minute to set up</Text>
          <View style={styles.stickyBottomActions}>
            <Pressable onPress={() => setActiveTab('contact')} style={styles.stickyGhostBtn}>
              <Text style={styles.stickyGhostBtnText}>For colleges</Text>
            </Pressable>
            <GlowButton onPress={() => router.push('/register')} style={styles.stickyCtaBtn} textStyle={styles.stickyCtaBtnText}>
              Get started
            </GlowButton>
          </View>
        </View>
      )}
    </View>
  );
}

/* ── StyleSheet Styles ── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: 'center',
    width: '100%',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    width: '100%',
    paddingBottom: 20,
    alignItems: 'center',
  },
  cursorGlow: {
    position: 'fixed' as any,
    width: 480,
    height: 480,
    borderRadius: 240,
    marginTop: -240,
    marginLeft: -240,
    backgroundColor: 'rgba(139,132,255,0.07)',
    filter: 'blur(60px)' as any,
    zIndex: 99,
  },
  starfield: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  progressBar: {
    position: 'fixed' as any,
    left: 0,
    top: 0,
    height: 2,
    backgroundColor: T.indLt,
    zIndex: 200,
  },

  /* ── Header ── */
  navBar: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 100,
    width: '100%',
    backgroundColor: 'rgba(5,6,15,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    backdropFilter: 'blur(16px)' as any,
    alignItems: 'center',
  },
  navInner: {
    width: '100%',
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLogoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navLogoText: {
    fontSize: 16.5,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.2,
  },
  navTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 34,
  },
  navTabBtn: {
    position: 'relative',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: T.muted2,
  },
  navTabTextActive: {
    fontWeight: '700',
    color: T.text,
  },
  navActiveLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: T.indLt,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  navSignIn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navSignInText: {
    fontSize: 14.5,
    color: T.muted2,
  },
  navGetStarted: {
    backgroundColor: T.ind,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
  },
  navGetStartedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnGlow: {
    shadowColor: T.ind,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },

  /* ── 01 Hero ── */
  heroSection: {
    width: '100%',
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    paddingTop: 90,
    paddingBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 50,
  },
  heroLeftCol: {
    flex: 1,
    minWidth: 320,
    maxWidth: 620,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: T.tint,
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 26,
  },
  heroChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: T.indLt,
    letterSpacing: 1.6,
  },
  heroHeadline: {
    fontSize: 58,
    fontWeight: '700',
    lineHeight: 64,
    color: T.text,
    letterSpacing: -2,
    marginBottom: 26,
  },
  heroSubhead: {
    fontSize: 17,
    lineHeight: 28,
    color: T.muted2,
    maxWidth: 480,
    marginBottom: 38,
  },
  heroCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  heroBtnStudent: {
    backgroundColor: T.ind,
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: 10,
  },
  heroBtnStudentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroBtnCollege: {
    borderWidth: 1,
    borderColor: T.dot,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  heroBtnCollegeText: {
    fontSize: 15,
    fontWeight: '500',
    color: T.text,
  },
  heroTrustLine: {
    fontSize: 13.5,
    color: T.muted,
  },
  heroRightCol: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 320,
  },
  shieldBackdropGlow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(139,90,255,0.45)',
    filter: 'blur(20px)' as any,
  },

  /* ── Marquees ── */
  marqueeContainer: {
    width: '100%',
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    marginTop: 40,
    marginBottom: 60,
    gap: 18,
  },
  marqueeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    overflow: 'hidden',
  },
  marqueeBadge: {
    backgroundColor: T.tint,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexShrink: 0,
  },
  marqueeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: T.indLt,
    letterSpacing: 1.6,
  },
  marqueePill: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginRight: 14,
    height: 58,
    justifyContent: 'center',
    flexShrink: 0,
  },
  marqueePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: T.text,
    letterSpacing: 0.2,
  },

  /* ── Shared Sections ── */
  sectionContainer: {
    width: '100%',
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    paddingVertical: 100,
  },
  sectionPill: {
    alignSelf: 'flex-start',
    backgroundColor: T.tint,
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: T.indLt,
    letterSpacing: 1.6,
  },
  sectionHeadingH2: {
    fontSize: 48,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -1.8,
    lineHeight: 52,
    marginBottom: 22,
  },
  sectionDesc: {
    fontSize: 16.5,
    lineHeight: 26,
    color: T.muted2,
    maxWidth: 480,
    marginBottom: 56,
  },

  /* ── 02 Bento ── */
  bentoGridContainer: {
    width: '100%',
    gap: 20,
  },
  bentoRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 20,
  },
  bentoCard: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 18,
    padding: 30,
    position: 'relative',
  },
  bentoNumber: {
    position: 'absolute',
    right: 24,
    top: 22,
    fontSize: 12,
    fontWeight: '700',
    color: T.dot,
  },
  bentoIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(91,79,233,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(91,79,233,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  bentoTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: T.text,
    marginBottom: 10,
  },
  bentoBody: {
    fontSize: 14.5,
    lineHeight: 23,
    color: T.muted,
  },

  /* ── 03 Dashboard Frame ── */
  dashBrowserFrame: {
    width: '100%',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 18,
    overflow: 'hidden',
  },
  dashBrowserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.line2,
    position: 'relative',
  },
  dotsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  dotCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.dot,
  },
  dashUrlPill: {
    backgroundColor: T.card2,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashUrlText: {
    fontSize: 12.5,
    color: T.muted2,
  },
  dashBodySplit: {
    flexDirection: 'row',
    padding: 22,
    gap: 20,
  },
  dashSidebarCol: {
    width: 260,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line2,
    borderRadius: 14,
    padding: 20,
    gap: 4,
  },
  dashMenuLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: T.dim,
    letterSpacing: 1.6,
    marginBottom: 16,
  },
  dashSidebarItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  dashSidebarItemActive: {
    backgroundColor: T.line2,
  },
  dashSidebarText: {
    fontSize: 14.5,
    color: T.muted,
  },
  dashSidebarTextActive: {
    fontSize: 14.5,
    fontWeight: '600',
    color: T.text,
  },
  dashMainCol: {
    flex: 1,
    gap: 20,
  },
  kpiTilesRow: {
    flexDirection: 'row',
    gap: 18,
    flexWrap: 'wrap',
  },
  kpiTile: {
    flex: 1,
    minWidth: 160,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line2,
    borderRadius: 14,
    padding: 20,
  },
  kpiHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    color: T.dim,
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  kpiNumber: {
    fontSize: 30,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -1,
  },
  kpiSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: T.indLt,
  },
  agentKCard: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.lineHi,
    borderRadius: 14,
    padding: 24,
    gap: 12,
  },
  agentKCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.text,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: T.card2,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 12,
    padding: 16,
  },
  checkText: {
    fontSize: 15,
    color: T.text,
  },

  /* ── 04 Outcomes ── */
  outcomesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  outcomeTile: {
    flex: 1,
    minWidth: 240,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 16,
    padding: 26,
  },
  outcomeInfo: {
    fontSize: 13,
    color: T.dim,
    marginBottom: 18,
  },
  outcomeName: {
    fontSize: 19,
    fontWeight: '700',
    color: T.text,
    marginBottom: 6,
  },
  outcomeStory: {
    fontSize: 14.5,
    lineHeight: 23,
    color: T.muted,
    marginBottom: 18,
  },
  outcomeRole: {
    fontSize: 12.5,
    fontWeight: '700',
    color: T.indLt,
    letterSpacing: 1.2,
  },

  /* ── 05 For Alumni ── */
  alumniRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 64,
    alignItems: 'center',
  },
  alumniLeftCol: {
    flex: 1,
  },
  alumniRightCol: {
    flex: 1,
    gap: 14,
  },
  alumniPillarBox: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'baseline',
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 14,
    padding: 22,
  },
  alumniPillarNum: {
    fontSize: 13,
    fontWeight: '700',
    color: T.indLt,
  },
  alumniPillarTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    color: T.text,
    marginBottom: 4,
  },
  alumniPillarSub: {
    fontSize: 14,
    color: T.muted,
  },

  /* ── 07 Audiences ── */
  audiencesGrid: {
    width: '100%',
    gap: 28,
  },
  audienceCard: {
    width: '100%',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 20,
    padding: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 34,
  },
  audienceContent: {
    flex: 1,
  },
  audienceSvgBox: {
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.well,
    borderRadius: 12,
    padding: 16,
  },
  audienceTag: {
    fontSize: 11,
    fontWeight: '700',
    color: T.indLt,
    letterSpacing: 1.8,
    marginBottom: 14,
  },
  audienceTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -1.2,
    marginBottom: 12,
  },
  audienceDesc: {
    fontSize: 15.5,
    lineHeight: 26,
    color: T.muted,
  },

  /* ── 06 Numbers ── */
  numbersWrapper: {
    width: '100%',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line2,
    borderRadius: 22,
    padding: 54,
    alignItems: 'center',
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 22,
    width: '100%',
    marginTop: 20,
  },
  numberItem: {
    flex: 1,
    minWidth: 200,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line2,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
  },
  numberIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(91,79,233,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(91,79,233,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  statBig: {
    fontSize: 38,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -1.4,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: T.text,
    marginTop: 10,
  },
  statDesc: {
    fontSize: 13,
    color: T.dim,
    marginTop: 6,
  },

  /* ── 08 Roadmap ── */
  roadmapHeadingRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 40,
    marginBottom: 50,
  },
  roadmapSub: {
    fontSize: 11,
    fontWeight: '700',
    color: T.dim,
    letterSpacing: 1.8,
  },

  /* ── 09 On Campus ── */
  campusRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 70,
    alignItems: 'center',
  },
  campusLeftCol: {
    flex: 1,
  },
  campusRightCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckDotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  deckDot: {
    width: 26,
    height: 3,
    borderRadius: 2,
    backgroundColor: T.line,
  },
  deckDotActive: {
    backgroundColor: T.indLt,
  },
  cardStackWrapper: {
    position: 'relative',
    width: 320,
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  stackedCardDeep: {
    position: 'absolute',
    top: 0,
    opacity: 0.35,
    backgroundColor: '#090B16',
    borderColor: '#171A2C',
    zIndex: 1,
  },
  stackedCardMid: {
    position: 'absolute',
    top: 0,
    opacity: 0.65,
    backgroundColor: '#0A0C18',
    borderColor: '#1E2238',
    zIndex: 2,
  },
  stackedCardTop: {
    position: 'absolute',
    top: 0,
    zIndex: 3,
  },
  polaroidCard: {
    width: 320,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 18,
    padding: 14,
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
  },
  polaroidCaptionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 14,
  },
  polaroidTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: T.text,
  },
  polaroidMonth: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: T.dim,
  },

  /* ── 10 Match Graph ── */
  matchGraphRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 60,
    alignItems: 'center',
  },
  matchDetailBanner: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 16,
    padding: 22,
    minHeight: 110,
    justifyContent: 'center',
  },
  matchDetailHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    color: T.dim,
    letterSpacing: 1.6,
  },
  matchDetailName: {
    fontSize: 20,
    fontWeight: '700',
    color: T.text,
    marginTop: 10,
  },
  matchDetailWhy: {
    fontSize: 14.5,
    color: T.muted,
    marginTop: 5,
  },

  /* ── 10b On the Ground ── */
  onTheGroundCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 42,
  },
  otgTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46,32,145,0.1)',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  otgTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E2091',
    letterSpacing: 1.6,
  },
  otgTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#141726',
    letterSpacing: -1.8,
    lineHeight: 46,
    marginBottom: 14,
  },
  otgDesc: {
    fontSize: 16.5,
    lineHeight: 26,
    color: '#4A4F63',
    maxWidth: 500,
    marginBottom: 28,
  },
  otgStatsRow: {
    flexDirection: 'row',
    gap: 36,
    marginBottom: 28,
  },
  otgStatNum: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  otgStatLabel: {
    fontSize: 12.5,
    color: '#5F6474',
    marginTop: 5,
  },
  otgHostsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: 'rgba(20,23,38,0.1)',
    paddingTop: 24,
    marginTop: 32,
  },
  otgHostsHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#5F6474',
    letterSpacing: 1.6,
  },
  otgHostPill: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#2E2A55',
    backgroundColor: 'rgba(20,23,38,0.05)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 100,
  },

  /* ── 11 Testimonials ── */
  testimonialCard: {
    width: '100%',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 20,
    padding: 44,
    minHeight: 200,
    justifyContent: 'center',
  },
  testimonialQuote: {
    fontSize: 27,
    fontWeight: '600',
    lineHeight: 38,
    letterSpacing: -1,
    color: T.text,
    marginBottom: 24,
    maxWidth: 880,
  },
  testimonialAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: T.indLt,
    letterSpacing: 1.6,
  },

  /* ── 12 CTA ── */
  ctaCardBanner: {
    width: '100%',
    backgroundColor: T.cardHi,
    borderWidth: 1,
    borderColor: T.line2,
    borderRadius: 22,
    padding: 80,
    alignItems: 'center',
    textAlign: 'center' as any,
  },
  ctaTitleH2: {
    fontSize: 58,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -2.2,
    lineHeight: 64,
    marginVertical: 26,
  },
  ctaSubtitle: {
    fontSize: 16.5,
    lineHeight: 28,
    color: T.muted,
    maxWidth: 620,
    marginBottom: 42,
    textAlign: 'center',
  },
  ctaActionButton: {
    backgroundColor: T.ind,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  ctaActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ctaFaqRow: {
    flexDirection: 'row',
    gap: 28,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 34,
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: T.line,
    maxWidth: 720,
    width: '100%',
  },
  faqCol: {
    flex: 1,
    minWidth: 180,
  },
  faqTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: T.text,
    marginBottom: 5,
  },
  faqDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    color: T.muted,
  },

  /* ── Sticky Bottom Bar ── */
  stickyBottomBar: {
    position: 'fixed' as any,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 150,
    backgroundColor: 'rgba(5,6,15,0.9)',
    borderTopWidth: 1,
    borderTopColor: T.line,
    backdropFilter: 'blur(16px)' as any,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20,
  },
  stickyBottomText: {
    fontSize: 14.5,
    color: T.muted2,
  },
  stickyBottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stickyGhostBtn: {
    borderWidth: 1,
    borderColor: T.dot,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  stickyGhostBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: T.text,
  },
  stickyCtaBtn: {
    backgroundColor: T.ind,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  stickyCtaBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* ── Verify View ── */
  verifyHeroCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 42,
    marginBottom: 34,
  },
  verifyTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46,32,145,0.1)',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyTagPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E2091',
    letterSpacing: 1.6,
  },
  verifyHeroTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#141726',
    letterSpacing: -1.8,
    lineHeight: 46,
    marginBottom: 14,
  },
  verifyHeroSubtitle: {
    fontSize: 16.5,
    lineHeight: 26,
    color: '#4A4F63',
    maxWidth: 500,
    marginBottom: 28,
  },
  verifyHeroStatsRow: {
    flexDirection: 'row',
    gap: 36,
    marginBottom: 28,
  },
  verifyStatNum: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  verifyStatLabel: {
    fontSize: 12.5,
    color: '#5F6474',
    marginTop: 5,
  },
  verifyInputRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  verifySearchInput: {
    flex: 1,
    minWidth: 260,
    borderWidth: 1,
    borderColor: '#D4D2E8',
    borderRadius: 14,
    paddingHorizontal: 19,
    paddingVertical: 17,
    fontSize: 15,
    color: '#141726',
    backgroundColor: '#F8F7FF',
  },
  verifySubmitBtn: {
    backgroundColor: '#4B3FD6',
    paddingVertical: 17,
    paddingHorizontal: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  verifySubmitBtnText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sampleChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 22,
  },
  sampleChipsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.muted2,
  },
  sampleChip: {
    borderWidth: 1,
    borderColor: T.lineHi,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  sampleChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: T.indLt,
  },
  verifyResultBox: {
    borderWidth: 1,
    borderColor: T.lineHi,
    borderRadius: 18,
    backgroundColor: T.card,
    padding: 26,
    marginTop: 26,
  },
  verifyResultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyResultTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: T.text,
  },
  verifyResultId: {
    fontSize: 12.5,
    color: T.muted2,
    marginTop: 3,
  },
  validStatusBadge: {
    borderWidth: 1,
    borderColor: '#1B6B4E',
    borderRadius: 100,
    paddingVertical: 7,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  validStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 1.2,
  },
  verifyResultGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  resultCol: {
    flex: 1,
    minWidth: 140,
  },
  resultColHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    color: T.dim,
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  resultColVal: {
    fontSize: 14,
    fontWeight: '600',
    color: T.text,
  },
  resultColHash: {
    fontSize: 13,
    fontWeight: '600',
    color: T.indLt,
  },
  whatWeVerifyRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 60,
    marginBottom: 32,
  },
  verifySvgIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(91,79,233,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(91,79,233,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  verifyFeatureCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 18,
    padding: 26,
  },
  verifyFeatureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: T.text,
  },
  verifyFeatureDesc: {
    fontSize: 14,
    lineHeight: 22,
    color: T.muted2,
  },
  bgvDeskCard: {
    width: '100%',
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.lineHi,
    borderRadius: 22,
    padding: 34,
    marginTop: 60,
  },
  bgvDeskHeading: {
    fontSize: 29,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -1.2,
    marginVertical: 16,
  },
  bgvDeskSub: {
    fontSize: 15.5,
    lineHeight: 24,
    color: T.muted2,
    marginBottom: 26,
  },
  kindSelectorRow: {
    flexDirection: 'row',
    gap: 9,
    flexWrap: 'wrap',
    marginBottom: 26,
  },
  kindPill: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 17,
  },
  kindPillOn: {
    backgroundColor: T.ind,
    borderColor: T.ind,
  },
  kindPillText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: T.muted2,
  },
  kindPillTextOn: {
    color: '#FFFFFF',
  },
  consentCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: T.lineHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquareOn: {
    backgroundColor: T.ind,
    borderColor: T.ind,
  },
  consentLabel: {
    fontSize: 13.5,
    lineHeight: 22,
    color: T.muted2,
    flex: 1,
  },
  bgvSubmitButton: {
    paddingVertical: 17,
    borderRadius: 13,
    alignItems: 'center',
  },
  bgvSubmitButtonText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Contact View ── */
  centeredHeader: {
    width: '100%',
    alignItems: 'center',
    textAlign: 'center' as any,
    marginBottom: 44,
  },
  pageTitleH1: {
    fontSize: 50,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -2.2,
    lineHeight: 56,
    marginVertical: 22,
  },
  pageSubtitle: {
    fontSize: 16.5,
    lineHeight: 26,
    color: T.muted2,
    maxWidth: 640,
    textAlign: 'center',
  },
  hubsGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  hubCard: {
    flex: 1,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 20,
    padding: 28,
    gap: 10,
  },
  hubRegionTag: {
    fontSize: 11,
    fontWeight: '700',
    color: T.indLt,
    letterSpacing: 1.5,
  },
  hubTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  hubIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  hubLine: {
    fontSize: 14.5,
    fontWeight: '500',
    color: T.text2,
  },
  inquiryCard: {
    width: '100%',
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 22,
    padding: 34,
    marginTop: 20,
  },
  inquiryHeading: {
    fontSize: 30,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -1.2,
    marginVertical: 16,
  },
  inquirySub: {
    fontSize: 15.5,
    color: T.muted2,
    marginBottom: 28,
  },
  purposePillsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 28,
  },
  inquirySubmitBtn: {
    backgroundColor: T.ind,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 26,
  },
  inquirySubmitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── 13 Footer ── */
  footerSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: T.line,
    backgroundColor: T.bg2,
    paddingTop: 70,
    paddingBottom: 80,
    marginTop: 130,
    alignItems: 'center',
  },
  footerInner: {
    width: '100%',
    maxWidth: 1360,
    marginHorizontal: 'auto' as any,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 36,
    marginBottom: 60,
  },
  footerBrandCol: {
    flex: 1.5,
    minWidth: 260,
  },
  footerBrandTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: T.text,
  },
  footerBrandSub: {
    fontSize: 15,
    lineHeight: 24,
    color: T.muted2,
    maxWidth: 340,
    marginBottom: 24,
  },
  socialBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: T.card2,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLinksCol: {
    flex: 1,
    minWidth: 160,
    gap: 14,
  },
  footerColHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: T.dim,
    letterSpacing: 1.6,
    marginBottom: 20,
  },
  footerLinkText: {
    fontSize: 15,
    color: T.text2,
  },
  footerComplianceText: {
    fontSize: 14.5,
    color: T.text2,
  },
  newsletterRow: {
    width: '100%',
    maxWidth: 1360,
    borderWidth: 1,
    borderColor: T.lineHi,
    borderRadius: 18,
    backgroundColor: T.card2,
    padding: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 22,
    marginBottom: 56,
  },
  newsletterTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.4,
  },
  newsletterSub: {
    fontSize: 14.5,
    color: T.muted2,
    marginTop: 5,
  },
  newsletterControl: {
    flexDirection: 'row',
    flex: 1,
    minWidth: 340,
    flexWrap: 'wrap',
    gap: 10,
  },
  newsletterInput: {
    flex: 1,
    minWidth: 220,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 11,
    backgroundColor: T.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14.5,
    color: T.text,
  },
  subscribeBtn: {
    backgroundColor: T.ind,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 11,
  },
  subscribeBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerBottomBar: {
    width: '100%',
    maxWidth: 1360,
    paddingTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 32,
  },
  footerBrandGrad: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1.4,
    lineHeight: 38,
    color: '#C08BFF',
  },
  footerCopyright: {
    fontSize: 15,
    color: T.muted2,
  },
  footerCopyrightSmall: {
    fontSize: 14,
    color: T.muted2,
  },
});
