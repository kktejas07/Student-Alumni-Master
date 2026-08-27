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
  ClipPath,
} from 'react-native-svg';
import CommonFooter from '@/src/views/components/CommonFooter';

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
    
    @keyframes sa-twinkle {
      0%, 100% { opacity: 0.25; transform: scale(0.85); }
      50% { opacity: 1; transform: scale(1.15); }
    }
    @keyframes sa-pulse-glow {
      0%, 100% { opacity: 0.35; transform: scale(1); }
      50% { opacity: 0.75; transform: scale(1.08); }
    }
    @keyframes sa-radar-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes sa-float-slow {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes sa-sway {
      0%, 100% { transform: perspective(1200px) rotateY(-14deg) translateY(0); }
      50% { transform: perspective(1200px) rotateY(14deg) translateY(-14px); }
    }
    @keyframes sa-ping {
      0% { r: 52px; opacity: 0.6; }
      100% { r: 140px; opacity: 0; }
    }
    @keyframes sa-tick {
      0%, 100% { box-shadow: 0 0 0 0 rgba(91,79,233,0); }
      50% { box-shadow: 0 0 0 6px rgba(91,79,233,0.22); }
    }
    @keyframes sa-shine-sweep {
      0% { transform: translateX(-180px) translateY(-180px) rotate(25deg); opacity: 0; }
      18% { opacity: 0.95; }
      46% { transform: translateX(420px) translateY(420px) rotate(25deg); opacity: 0; }
      100% { transform: translateX(420px) translateY(420px) rotate(25deg); opacity: 0; }
    }
    @keyframes sa-text-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes sa-badge-pulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(139,132,255,0.45)); }
      50% { transform: scale(1.04); filter: drop-shadow(0 0 35px rgba(139,132,255,0.85)); }
    }
    @keyframes sa-marquee-l {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes sa-marquee-r {
      0% { transform: translateX(-50%); }
      100% { transform: translateX(0); }
    }
    .sa-mq-wrap-l {
      display: flex !important;
      flex-direction: row !important;
      width: max-content !important;
      animation: sa-marquee-l 26s linear infinite !important;
    }
    .sa-mq-wrap-r {
      display: flex !important;
      flex-direction: row !important;
      width: max-content !important;
      animation: sa-marquee-r 24s linear infinite !important;
    }
    .sa-mq-wrap-l:hover, .sa-mq-wrap-r:hover {
      animation-play-state: paused !important;
    }

    @keyframes sa-dash-flow {
      from { stroke-dashoffset: 34; }
      to { stroke-dashoffset: 0; }
    }
    .sa-dash-flowing {
      animation: sa-dash-flow 1.2s linear infinite !important;
    }
    .sa-dash-fast {
      animation: sa-dash-flow 0.8s linear infinite !important;
    }

    .sa-shield-glow { animation: sa-pulse-glow 6s ease-in-out infinite; }
    .sa-shield-sway { animation: sa-sway 8s ease-in-out infinite; transform-style: preserve-3d; }
    .sa-radar-spin { transform-origin: 310px 270px; animation: sa-radar-spin 7s linear infinite; }
    .sa-float-slow { animation: sa-float-slow 5s ease-in-out infinite; }
    .sa-shine-anim { animation: sa-shine-sweep 3.6s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
    .sa-ping-ring { animation: sa-ping 3.6s ease-out infinite; transform-origin: 310px 270px; }
    .sa-ping-ring-delayed { animation: sa-ping 3.6s ease-out infinite 1.8s; transform-origin: 310px 270px; }
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

/* ── Subtle Left-Center SA Logo Background Watermark ── */
function BackgroundWatermark() {
  return (
    <div
      style={{
        position: 'fixed',
        left: '-5%',
        top: '25%',
        width: '520px',
        height: '620px',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.045,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 300 350">
        <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="#8B84FF" />
        <path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="#5B4FE9" />
        <text x="150" y="214" textAnchor="middle" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '118px', fontWeight: 800, fill: '#FFFFFF' }}>
          SA
        </text>
      </svg>
    </div>
  );
}

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

/* ── Pure Continuous Smooth Marquee Component ── */
function Marquee({
  items,
  duration = 26,
  reverse = false,
}: {
  items: string[];
  duration?: number;
  reverse?: boolean;
}) {
  return (
    <View style={{ overflow: 'hidden', flex: 1 }}>
      <div
        className={reverse ? 'sa-mq-wrap-r' : 'sa-mq-wrap-l'}
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: 'max-content',
          animationDuration: `${duration}s`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {items.map((item, idx) => (
            <div
              key={`set1-${idx}`}
              style={{
                backgroundColor: '#0C0E1B',
                border: '1px solid #1B1E33',
                borderRadius: '12px',
                padding: '12px 18px',
                marginRight: '14px',
                height: '58px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#F4F5FB',
                letterSpacing: '0.2px',
              }}
            >
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {items.map((item, idx) => (
            <div
              key={`set2-${idx}`}
              style={{
                backgroundColor: '#0C0E1B',
                border: '1px solid #1B1E33',
                borderRadius: '12px',
                padding: '12px 18px',
                marginRight: '14px',
                height: '58px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#F4F5FB',
                letterSpacing: '0.2px',
              }}
            >
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </View>
  );
}

/* ── Interactive 3D Card Component with 3D Tilt & Physics ── */
function HoverLiftCard({
  children,
  style,
  hoverBorderColor = '#5B4FE9',
  enableTilt = true,
}: {
  children: React.ReactNode;
  style?: any;
  hoverBorderColor?: string;
  enableTilt?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [tiltStyle, setTiltStyle] = useState('');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    setTiltStyle(`perspective(1000px) rotateY(${(dx * 4.5).toFixed(2)}deg) rotateX(${(-dy * 4.5).toFixed(2)}deg) translateY(-6px)`);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setTiltStyle('perspective(1000px) rotateY(0deg) rotateX(0deg) translateY(0px)');
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        transition: hovered
          ? 'transform 0.1s ease-out, border-color 0.3s ease, box-shadow 0.3s ease'
          : 'transform 0.5s cubic-bezier(0.2, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease',
        transform: hovered && tiltStyle ? tiltStyle : 'translateY(0px)',
        cursor: 'pointer',
        willChange: 'transform',
      }}
    >
      <View
        style={[
          style,
          {
            flex: 1,
            width: '100%',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          } as any,
          hovered && {
            borderColor: hoverBorderColor,
            shadowColor: '#5B4FE9',
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.35,
            shadowRadius: 32,
          },
        ]}
      >
        {children}
      </View>
    </div>
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
  // Active navigation tab with query / history URL sync
  const [activeTab, setActiveTab] = useState<'home' | 'verify' | 'contact'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'verify' || tabParam === 'contact') return tabParam;
      if (window.location.hash.includes('verify')) return 'verify';
      if (window.location.hash.includes('contact')) return 'contact';
      if (window.location.pathname.includes('/verify') || window.location.pathname.includes('/certificates/verify')) return 'verify';
      if (window.location.pathname.includes('/contact')) return 'contact';
    }
    return 'home';
  });

  // Browser URL popstate sync (back/forward buttons)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'verify' || tabParam === 'contact') {
        setActiveTab(tabParam);
      } else {
        setActiveTab('home');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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
  const [bgvName, setBgvName] = useState('');
  const [bgvEmail, setBgvEmail] = useState('');
  const [bgvOrg, setBgvOrg] = useState('');
  const [bgvPhone, setBgvPhone] = useState('');
  const [bgvCandName, setBgvCandName] = useState('');
  const [bgvCredNo, setBgvCredNo] = useState('');
  const [bgvNotes, setBgvNotes] = useState('');
  const [bgvConsent, setBgvConsent] = useState(false);
  const [bgvSent, setBgvSent] = useState(false);

  // Contact view state
  const [contactPurpose, setContactPurpose] = useState('General Inquiry');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactOrg, setContactOrg] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Match graph radar state
  const [selectedNode, setSelectedNode] = useState({
    name: 'Arjun M. — Data, Pune',
    why: 'Ex-intern at target firm. Reviews analytics portfolios monthly.',
    score: '92',
    x: 430,
    y: 201,
  });

  // Cinematic Page Transition Curtain State
  const [curtainVisible, setCurtainVisible] = useState(true);
  const [curtainLabel, setCurtainLabel] = useState('LOADING');
  const [curtainCount, setCurtainCount] = useState(0);
  const [curtainTransform, setCurtainTransform] = useState('translateY(0)');
  const [curtainOpacity, setCurtainOpacity] = useState(1);
  const [curtainPointerEvents, setCurtainPointerEvents] = useState<'auto' | 'none'>('auto');

  // Initial load animation
  useEffect(() => {
    let start: number | null = null;
    const duration = 950;
    const animateInitial = (time: number) => {
      if (!start) start = time;
      const progress = Math.min(1, (time - start) / duration);
      const easeVal = 1 - Math.pow(1 - progress, 3);
      setCurtainCount(Math.round(easeVal * 100));

      if (progress < 1) {
        requestAnimationFrame(animateInitial);
      } else {
        setCurtainTransform('translateY(-100%)');
        setCurtainOpacity(0);
        setCurtainPointerEvents('none');
        setTimeout(() => {
          setCurtainVisible(false);
        }, 700);
      }
    };
    const reqId = requestAnimationFrame(animateInitial);
    return () => cancelAnimationFrame(reqId);
  }, []);

  // Smooth Tab Switch with Curtain Motion Effect & URL Sync
  const handleTabSwitch = (newTab: 'home' | 'verify' | 'contact') => {
    if (newTab === activeTab) {
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Sync browser URL in address bar without full page reload
    if (typeof window !== 'undefined' && window.history) {
      const newUrl = newTab === 'home' ? '/' : `/?tab=${newTab}`;
      window.history.pushState({ tab: newTab }, '', newUrl);
    }
    
    const labelMap: Record<string, string> = {
      home: 'STUDENTALUMNI',
      verify: 'CREDENTIAL VERIFICATION',
      contact: 'CONTACT & CAMPUS RELATIONS',
    };
    
    setCurtainLabel(labelMap[newTab] || 'LOADING');
    setCurtainCount(0);
    setCurtainVisible(true);
    setCurtainTransform('translateY(0)');
    setCurtainOpacity(1);
    setCurtainPointerEvents('auto');

    let start: number | null = null;
    const duration = 460;

    const animateTransition = (time: number) => {
      if (!start) start = time;
      const progress = Math.min(1, (time - start) / duration);
      const easeVal = 1 - Math.pow(1 - progress, 3);
      setCurtainCount(Math.round(easeVal * 100));

      if (progress < 0.5) {
        requestAnimationFrame(animateTransition);
      } else {
        setActiveTab(newTab);
        if (typeof window !== 'undefined') window.scrollTo(0, 0);
        if (progress < 1) {
          requestAnimationFrame(animateTransition);
        } else {
          setCurtainTransform('translateY(-100%)');
          setCurtainOpacity(0);
          setCurtainPointerEvents('none');
          setTimeout(() => {
            setCurtainVisible(false);
          }, 650);
        }
      }
    };
    requestAnimationFrame(animateTransition);
  };

  // Nav with transition
  const handleNavWithCurtain = (route: string, label: string) => {
    setCurtainLabel(label.toUpperCase());
    setCurtainCount(0);
    setCurtainVisible(true);
    setCurtainTransform('translateY(0)');
    setCurtainOpacity(1);
    setCurtainPointerEvents('auto');

    let start: number | null = null;
    const duration = 480;

    const animateOut = (time: number) => {
      if (!start) start = time;
      const progress = Math.min(1, (time - start) / duration);
      const easeVal = 1 - Math.pow(1 - progress, 3);
      setCurtainCount(Math.round(easeVal * 100));

      if (progress < 1) {
        requestAnimationFrame(animateOut);
      } else {
        router.push(route as any);
      }
    };
    requestAnimationFrame(animateOut);
  };

  // On Campus Polaroid Deck & Testimonials auto-cycling
  const [deckIdx, setDeckIdx] = useState(0);
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Dynamic Cursor Glow Follower
  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });
  const [cursorVisible, setCursorVisible] = useState(false);

  // Exact Viewport Scroll-Linked Roadmap S-Curve Progress
  const [roadmapProgress, setRoadmapProgress] = useState(0);
  const [bubblePos, setBubblePos] = useState({ x: 30, y: 230 });

  const updateScrollProgress = (y: number) => {
    setScrollY(y);

    if (Platform.OS === 'web') {
      const roadSec = document.getElementById('sa-road-sec');
      if (roadSec) {
        const r = roadSec.getBoundingClientRect();
        const windowH = window.innerHeight || 800;
        const startY = windowH * 0.88;
        const endY = windowH * 0.15;
        const totalDist = (startY - endY) + r.height * 0.5;
        const currentDist = startY - r.top;
        const p = Math.max(0, Math.min(1, currentDist / totalDist));
        setRoadmapProgress(p);

        // Instant DOM update for silky smooth 60fps animation
        const roadLine = document.getElementById('sa-roadline') as any;
        if (roadLine) {
          roadLine.style.strokeDashoffset = String(Math.round(1000 * (1 - p)));
          try {
            const totalLen = typeof roadLine.getTotalLength === 'function' ? roadLine.getTotalLength() : 1350;
            const pt = roadLine.getPointAtLength(Math.max(0.1, Math.min(totalLen, p * totalLen)));
            setBubblePos({ x: pt.x, y: pt.y });

            const bubbleEl = document.getElementById('sa-travel-bubble');
            if (bubbleEl) {
              bubbleEl.setAttribute('transform', `translate(${pt.x}, ${pt.y})`);
              bubbleEl.style.opacity = p > 0.01 && p < 0.99 ? '1' : '0';
            }
          } catch (_) {}
        }
      }
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      setCursorVisible(true);
    };
    const handleWindowScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      updateScrollProgress(y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    updateScrollProgress(0);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, []);

  // Deck auto-cycling
  useEffect(() => {
    const timer = setInterval(() => {
      setDeckIdx((p) => (p + 1) % 5);
      setQuoteIdx((p) => (p + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Verification Search Logic
  const triggerVerification = (forceId?: string) => {
    const q = (forceId || verifyInput).trim().toUpperCase();
    if (!q) return;
    const hit = SAMPLE_CREDS[q];
    let hashNum = 0;
    for (let i = 0; i < q.length; i++) hashNum = (hashNum * 31 + q.charCodeAt(i)) & 0xffffffff;
    const hash = (Math.abs(hashNum).toString(16) + 'a7f31c9e4b2058').slice(0, 18);

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
      {/* Subtle Left-Center SA Logo Background Watermark */}
      <BackgroundWatermark />

      {/* Interactive Cursor Glow Follower */}
      {cursorVisible && (
        <div
          id="sa-cursor"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,132,255,0.15), rgba(91,79,233,0.08) 42%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
            zIndex: 55,
            transform: `translate3d(${mousePos.x - 240}px, ${mousePos.y - 240}px, 0)`,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* ── CINEMATIC PAGE TRANSITION & LOADER CURTAIN ── */}
      {curtainVisible && (
        <div
          id="sa-curtain"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: '#07070E',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '0 44px 40px',
            pointerEvents: curtainPointerEvents,
            transform: curtainTransform,
            opacity: curtainOpacity,
            transition: 'transform 0.65s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.45s ease',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          {/* Centered Brand Content with Logo Shine and Text Shimmer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '0 32px',
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                animation: 'sa-badge-pulse 2.4s ease-in-out infinite',
                overflow: 'hidden',
                borderRadius: '24px',
                padding: '4px',
              }}
            >
              <svg width="146" height="170" viewBox="0 0 300 350" style={{ display: 'block', maxWidth: '32vw', height: 'auto' }}>
                <defs>
                  <linearGradient id="sa-curtain-badge" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#C9A7FF" />
                    <stop offset="50%" stopColor="#8B84FF" />
                    <stop offset="100%" stopColor="#5B4FE9" />
                  </linearGradient>
                </defs>
                <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#sa-curtain-badge)" />
                <text x="150" y="212" textAnchor="middle" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '122px', fontWeight: 800, letterSpacing: '-6px', fill: '#FFFFFF' }}>
                  SA
                </text>
              </svg>
              {/* Sweeping diagonal laser shine light beam */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 80%)',
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  animation: 'sa-shine-sweep 2.2s ease-in-out infinite',
                }}
              />
            </div>
            
            <div
              style={{
                fontSize: '44px',
                fontWeight: 800,
                letterSpacing: '-1.9px',
                lineHeight: 1.1,
                marginTop: '28px',
                whiteSpace: 'nowrap',
                background: 'linear-gradient(96deg, #F0A6E8 0%, #C08BFF 25%, #FFFFFF 50%, #8B84FF 75%, #6FA8F5 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'sa-text-shimmer 2.8s linear infinite',
              }}
            >
              #studentalumni
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '15px',
                fontWeight: 600,
                color: 'rgba(244,245,251,0.9)',
                marginTop: '14px',
                whiteSpace: 'nowrap',
                background: 'linear-gradient(90deg, rgba(244,245,251,0.7) 0%, #FFFFFF 50%, rgba(244,245,251,0.7) 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'sa-text-shimmer 3.2s linear infinite 0.5s',
              }}
            >
              Built with love for students
              <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: '#8B84FF', flex: 'none' }}>
                <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7.6 4.6 4.6 0 0 1 20 10.6C20 16.1 12 21 12 21Z" />
              </svg>
              across all campus's
            </div>
          </div>

          {/* Bottom Loading Metrics Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '30px',
              maxWidth: '1360px',
              width: '100%',
              margin: '0 auto',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '3.4px', color: 'rgba(244,245,251,0.62)' }}>
              {curtainLabel}
            </div>
            <div
              style={{
                fontSize: '76px',
                fontWeight: 700,
                letterSpacing: '-3.2px',
                lineHeight: 0.85,
                fontVariantNumeric: 'tabular-nums',
                color: '#F4F5FB',
              }}
            >
              {String(curtainCount).padStart(2, '0')}
            </div>
          </div>
          <div style={{ maxWidth: '1360px', width: '100%', margin: '16px auto 0', height: '2px', background: 'rgba(244,245,251,0.14)' }}>
            <div
              style={{
                height: '100%',
                width: `${curtainCount}%`,
                background: 'linear-gradient(90deg, #5B4FE9, #8B84FF)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        </div>
      )}

      {/* Top Fixed Scroll Progress Bar */}
      <View style={[styles.progressBar, { width: `${Math.min(100, (scrollY / 3800) * 100)}%` }]} />

      {/* Top Navbar */}
      <View style={styles.navBar}>
        <View style={[styles.navInner, { paddingHorizontal: containerPadding }, isNarrow && { flexWrap: 'wrap', gap: 14 }]}>
          {/* Brand Logo */}
          <Pressable onPress={() => handleTabSwitch('home')} style={styles.navLogoGroup}>
            <Svg width="28" height="33" viewBox="0 0 300 350">
              <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="#8B84FF" />
              <Path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="#6A49DF" />
              <SvgText x="150" y="214" textAnchor="middle" fill="#FFFFFF" fontSize="118" fontWeight="800">
                SA
              </SvgText>
            </Svg>
            <Text style={styles.navLogoText}>StudentAlumni</Text>
          </Pressable>

          {/* Navigation Tabs */}
          <View style={[styles.navTabs, isMobile && { gap: 16 }]}>
            {(['home', 'verify', 'contact'] as const).map((tab) => {
              const label = tab === 'home' ? 'Home' : tab === 'verify' ? 'Verify' : 'Contact Us';
              const isSelected = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => handleTabSwitch(tab)}
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
            <Pressable onPress={() => handleNavWithCurtain('/login', 'Sign In')} style={styles.navSignIn}>
              <Text style={styles.navSignInText}>Sign in</Text>
            </Pressable>
            <GlowButton onPress={() => handleNavWithCurtain('/register', 'Get Started')} style={styles.navGetStarted} textStyle={styles.navGetStartedText}>
              Get Started
            </GlowButton>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => updateScrollProgress(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >

        {/* ══════════════════════════════════════════════════════════════════
            TAB: VERIFY CREDENTIALS & BGV DESK
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'verify' && (
          <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
            {/* 1. Verify Hero Card with 3 Metric Stats & Who Uses This Box */}
            <View style={styles.verifyHeroCard}>
              <View style={[styles.verifyHeroRow, isNarrow && { flexDirection: 'column', gap: 28 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.verifyTagPill}>
                    <Svg width="13" height="13" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                      <Path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z" stroke="#2E2091" strokeWidth="2.2" fill="none" />
                      <Path d="M9 12l2 2 4-4" stroke="#2E2091" strokeWidth="2.2" fill="none" />
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

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                    <GlowButton onPress={() => {}} style={styles.verifyHeroBtnPrimary} textStyle={styles.verifyHeroBtnPrimaryText}>
                      Verify a credential
                    </GlowButton>
                    <Pressable onPress={() => {}} style={styles.verifyHeroBtnSecondary}>
                      <Text style={styles.verifyHeroBtnSecondaryText}>Request a BGV check</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Who Uses This Box */}
                <View style={styles.whoUsesBox}>
                  <Text style={styles.whoUsesHeader}>WHO USES THIS</Text>
                  {[
                    'Recruiters and HR teams',
                    'Background-verification agencies',
                    'Accreditation bodies',
                    'Placement cells and admin',
                  ].map((user, idx) => (
                    <View key={idx} style={styles.whoUsesItem}>
                      <Svg width="15" height="15" viewBox="0 0 24 24" style={{ marginRight: 10 }}>
                        <Path d="M5 12.5l4 4 10-10.5" stroke="#047857" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                      <Text style={styles.whoUsesText}>{user}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* 2. Main Verification Search Area */}
            <View style={styles.verifySearchSection}>
              <Text style={styles.verifySearchH2}>
                Verify Certificate &amp;{' '}
                <Text style={{ color: T.indLt }}>SA Member ID</Text>
              </Text>
              <Text style={styles.verifySearchDesc}>
                Instant cryptographic BGV validation for verified Certificate IDs, Faculty Awards, ECHO Badges, and SA Member IDs across campuses.
              </Text>

              {/* Input Bar */}
              <View style={styles.verifyInputRow}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Svg width="18" height="18" viewBox="0 0 16 16" style={{ marginRight: 12 }}>
                    <Circle cx="7" cy="7" r="4.6" stroke="#5C6273" strokeWidth="1.8" fill="none" />
                    <Path d="M10.5 10.5L14 14" stroke="#5C6273" strokeWidth="1.8" />
                  </Svg>
                  <TextInput
                    style={styles.verifySearchInput}
                    placeholder="Enter Certificate ID, Member ID, or Roll Number…"
                    placeholderTextColor="#5C6273"
                    value={verifyInput}
                    onChangeText={setVerifyInput}
                    onSubmitEditing={() => triggerVerification()}
                  />
                </View>
                <GlowButton onPress={() => triggerVerification()} style={styles.verifySubmitBtn} textStyle={styles.verifySubmitBtnText}>
                  Verify Credential →
                </GlowButton>
              </View>

              {/* Sample Chips */}
              <View style={styles.sampleChipsRow}>
                <Text style={styles.sampleChipsLabel}>Try sample IDs:</Text>
                {[
                  { id: 'SA-EXC-2026-0002', tag: 'Excellence' },
                  { id: 'SA-FAC-2026-0001', tag: 'Faculty' },
                  { id: 'SA-AMB-2026-0012', tag: 'Ambassador' },
                  { id: 'ECHO26-P-0001', tag: 'Specialization' },
                ].map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setVerifyInput(item.id);
                      triggerVerification(item.id);
                    }}
                    style={styles.sampleChip}
                  >
                    <Text style={styles.sampleChipText}>
                      {item.id} <Text style={{ color: T.muted2, fontWeight: '500' }}>({item.tag})</Text>
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Verification Result Box */}
              {verifyResult && (
                <View style={styles.verifyResultBox}>
                  <View style={styles.verifyResultTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={styles.validStatusIcon}>
                        <Svg width="18" height="18" viewBox="0 0 24 24">
                          <Path d="M5 12.5l4 4 10-10.5" stroke="#34D399" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      </View>
                      <View>
                        <Text style={styles.verifyResultTitle}>{verifyResult.title}</Text>
                        <Text style={styles.verifyResultId}>{verifyResult.id}</Text>
                      </View>
                    </View>
                    <View style={styles.validStatusBadge}>
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

            {/* 3. Built on Cryptographic Trust (4 Cards) */}
            <View style={{ width: '100%', marginVertical: 40, alignItems: 'center' }}>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>• ENTERPRISE INTEGRITY</Text>
              </View>
              <Text style={styles.sectionHeadingH2}>Built on Cryptographic Trust</Text>
              <Text style={styles.sectionDesc}>
                Designed for high-speed background verification across campuses, employers, and accreditation bodies.
              </Text>
              <View style={[styles.cryptoTrustGrid, isNarrow && { flexDirection: 'column' }]}>
                {[
                  { num: '01', title: 'Cryptographic SHA-256 Ledger', desc: 'Every certificate and credential is signed with an immutable hash, preventing forgery and unauthorized duplication.' },
                  { num: '02', title: 'Instant Multi-Campus BGV', desc: 'Instant verification for recruiters, HR teams, and academic institutions across thousands of partner colleges.' },
                  { num: '03', title: 'Tamper-Proof Digital ID Cards', desc: 'Unified member IDs linked to verified student portfolios, campus achievements, and alumni career roadmaps.' },
                  { num: '04', title: 'Autonomous Verification API', desc: 'Real-time programmatic query support for background verification agencies, automated scanners, and ATS systems.' },
                ].map((item, idx) => (
                  <HoverLiftCard key={idx} style={styles.cryptoCard}>
                    <Text style={styles.cryptoNum}>{item.num}</Text>
                    <Text style={styles.cryptoTitle}>{item.title}</Text>
                    <Text style={styles.cryptoDesc}>{item.desc}</Text>
                  </HoverLiftCard>
                ))}
              </View>
            </View>

            {/* 4. What We Verify (3 Cards) */}
            <View style={{ width: '100%', marginVertical: 20 }}>
              <Text style={styles.whatWeVerifyHeader}>WHAT WE VERIFY</Text>
              <View style={[styles.whatWeVerifyRow, isNarrow && { flexDirection: 'column' }]}>
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
            </View>

            {/* 5. BGV Request Desk Form Card with Sidebars */}
            <View style={styles.bgvDeskCard}>
              <View style={[styles.bgvDeskRow, isNarrow && { flexDirection: 'column' }]}>
                {/* Form Column */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.sectionPill}><Text style={styles.sectionPillText}>• BULK &amp; ENTERPRISE BGV</Text></View>
                  <Text style={styles.bgvDeskHeading}>Request a BGV Check</Text>
                  <Text style={styles.bgvDeskSub}>Checking a candidate batch, or verifying something without an ID? Our verification desk responds within 1 working day.</Text>

                  <Text style={styles.bgvSectionLabel}>WHAT DO YOU NEED VERIFIED?</Text>
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

                  {/* Form Grid */}
                  <View style={[styles.formGrid2, isNarrow && { flexDirection: 'column' }]}>
                    <View style={styles.formCol}>
                      <Text style={styles.formFieldLabel}>Your name <Text style={{ color: T.indLt }}>*</Text></Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. Priya Menon"
                        placeholderTextColor="#5C6273"
                        value={bgvName}
                        onChangeText={setBgvName}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.formFieldLabel}>Work email <Text style={{ color: T.indLt }}>*</Text></Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="you@company.com"
                        placeholderTextColor="#5C6273"
                        value={bgvEmail}
                        onChangeText={setBgvEmail}
                      />
                    </View>
                  </View>

                  <View style={[styles.formGrid2, isNarrow && { flexDirection: 'column' }, { marginTop: 14 }]}>
                    <View style={styles.formCol}>
                      <Text style={styles.formFieldLabel}>Organisation <Text style={{ color: T.indLt }}>*</Text></Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g. Deloitte India"
                        placeholderTextColor="#5C6273"
                        value={bgvOrg}
                        onChangeText={setBgvOrg}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.formFieldLabel}>Phone</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="+91 …"
                        placeholderTextColor="#5C6273"
                        value={bgvPhone}
                        onChangeText={setBgvPhone}
                      />
                    </View>
                  </View>

                  <View style={[styles.formGrid2, isNarrow && { flexDirection: 'column' }, { marginTop: 14 }]}>
                    <View style={styles.formCol}>
                      <Text style={styles.formFieldLabel}>Candidate name</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Name as on credential"
                        placeholderTextColor="#5C6273"
                        value={bgvCandName}
                        onChangeText={setBgvCandName}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.formFieldLabel}>Credential or roll number</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="If you have one"
                        placeholderTextColor="#5C6273"
                        value={bgvCredNo}
                        onChangeText={setBgvCredNo}
                      />
                    </View>
                  </View>

                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.formFieldLabel}>Anything else we should know</Text>
                    <TextInput
                      style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                      placeholder="Volume, turnaround needed, or issuing institution…"
                      placeholderTextColor="#5C6273"
                      multiline
                      value={bgvNotes}
                      onChangeText={setBgvNotes}
                    />
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
                  <Text style={styles.bgvFooterNote}>Response within one working day · verification desk, Hyderabad</Text>
                </View>

                {/* Sidebar Column */}
                <View style={styles.bgvSidebarCol}>
                  <View style={styles.bgvSideCard}>
                    <Text style={styles.bgvSideHeader}>TURNAROUND</Text>
                    <View style={styles.turnaroundRow}><Text style={styles.turnaroundLabel}>Instant ID lookup</Text><Text style={styles.turnaroundVal}>Seconds</Text></View>
                    <View style={styles.turnaroundRow}><Text style={styles.turnaroundLabel}>Single candidate</Text><Text style={styles.turnaroundVal}>1 working day</Text></View>
                    <View style={styles.turnaroundRow}><Text style={styles.turnaroundLabel}>Bulk batch</Text><Text style={styles.turnaroundVal}>2–3 days</Text></View>
                    <View style={styles.turnaroundRow}><Text style={styles.turnaroundLabel}>API onboarding</Text><Text style={styles.turnaroundVal}>Same week</Text></View>
                  </View>

                  <View style={styles.bgvSideCard}>
                    <Text style={styles.bgvSideHeader}>HANDLED UNDER</Text>
                    <View style={styles.handledItem}>
                      <Svg width="14" height="14" viewBox="0 0 24 24" style={{ marginRight: 8 }}><Path d="M5 12.5l4 4 10-10.5" stroke="#34D399" strokeWidth="2.3" fill="none" /></Svg>
                      <Text style={styles.handledText}>DPDP Act 2023</Text>
                    </View>
                    <View style={styles.handledItem}>
                      <Svg width="14" height="14" viewBox="0 0 24 24" style={{ marginRight: 8 }}><Path d="M5 12.5l4 4 10-10.5" stroke="#34D399" strokeWidth="2.3" fill="none" /></Svg>
                      <Text style={styles.handledText}>GDPR</Text>
                    </View>
                    <View style={styles.handledItem}>
                      <Svg width="14" height="14" viewBox="0 0 24 24" style={{ marginRight: 8 }}><Path d="M5 12.5l4 4 10-10.5" stroke="#34D399" strokeWidth="2.3" fill="none" /></Svg>
                      <Text style={styles.handledText}>SOC 2 Type II</Text>
                    </View>
                  </View>

                  <View style={[styles.bgvSideCard, { backgroundColor: 'rgba(91,79,233,0.08)', borderColor: 'rgba(139,132,255,0.3)' }]}>
                    <Text style={styles.preferEmailTitle}>Prefer email?</Text>
                    <Text style={styles.preferEmailDesc}>Write to <Text style={{ color: T.indLt, fontWeight: '700' }}>verify@studentalumni.ai</Text> with the credential ID in the subject line.</Text>
                  </View>
                </View>
              </View>
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
                <Text style={styles.sectionPillText}>• CONTACT &amp; CAMPUS RELATIONS</Text>
              </View>
              <Text style={styles.pageTitleH1}>
                Get in Touch with{' '}
                <Text style={{ color: T.indLt }}>StudentAlumni Global</Text>
              </Text>
              <Text style={styles.pageSubtitle}>
                Connect directly with our leadership, campus partnership coordinators, and human resources team. We are dedicated to supporting students, alumni, and educational institutions worldwide.
              </Text>
            </View>

            {/* 1. Global Hubs (India Hub & USA Hub) */}
            <View style={[styles.hubsGrid, isNarrow && { flexDirection: 'column' }]}>
              {/* India Hub */}
              <HoverLiftCard style={styles.hubCard}>
                <View style={styles.hubHeaderRow}>
                  <View style={styles.hubIconContainer}>
                    <Svg width="20" height="20" viewBox="0 0 24 24">
                      <Path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11Z" stroke="#8B84FF" strokeWidth="1.9" fill="none" />
                      <Circle cx="12" cy="10" r="2.4" fill="#8B84FF" />
                    </Svg>
                  </View>
                  <View>
                    <Text style={styles.hubRegionTag}>APAC HEADQUARTERS</Text>
                    <Text style={styles.hubTitle}>India Hub</Text>
                  </View>
                </View>

                <View style={styles.hubDetailRow}>
                  <Text style={styles.hubDetailLabel}>OFFICE ADDRESS</Text>
                  <Text style={styles.hubDetailVal}>Madhapur, Hyderabad, Telangana, India</Text>
                </View>

                <View style={styles.hubDetailRow}>
                  <Text style={styles.hubDetailLabel}>PHONE NUMBER</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.hubDetailVal}>+91 7569665077</Text>
                    <Pressable onPress={() => handleCopy('+91 7569665077', 'india-phone')} style={styles.copyChip}>
                      <Text style={styles.copyChipText}>{copiedKey === 'india-phone' ? 'Copied ✓' : 'Copy'}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.hubDetailRow}>
                  <Text style={styles.hubDetailLabel}>OFFICIAL EMAIL</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.hubDetailVal}>hr@studentalumni.ai</Text>
                    <Pressable onPress={() => handleCopy('hr@studentalumni.ai', 'india-email')} style={styles.copyChip}>
                      <Text style={styles.copyChipText}>{copiedKey === 'india-email' ? 'Copied ✓' : 'Copy'}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.hubDetailRow}>
                  <Text style={styles.hubDetailLabel}>WORKING HOURS</Text>
                  <Text style={styles.hubDetailVal}>Mon – Sat: 9:00 AM – 7:00 PM IST</Text>
                </View>
              </HoverLiftCard>

              {/* USA Hub */}
              <HoverLiftCard style={styles.hubCard}>
                <View style={styles.hubHeaderRow}>
                  <View style={[styles.hubIconContainer, { backgroundColor: 'rgba(111,168,245,0.14)', borderColor: 'rgba(111,168,245,0.34)' }]}>
                    <Svg width="20" height="20" viewBox="0 0 24 24">
                      <Circle cx="12" cy="12" r="9" stroke="#6FA8F5" strokeWidth="1.9" fill="none" />
                      <Path d="M3 12h18M12 3c4 4.5 4 13.5 0 18M12 3c-4 4.5-4 13.5 0 18" stroke="#6FA8F5" strokeWidth="1.9" fill="none" />
                    </Svg>
                  </View>
                  <View>
                    <Text style={[styles.hubRegionTag, { color: '#6FA8F5' }]}>AMERICAS &amp; GLOBAL</Text>
                    <Text style={styles.hubTitle}>USA Hub</Text>
                  </View>
                </View>

                <View style={styles.hubDetailRow}>
                  <Text style={styles.hubDetailLabel}>OFFICE ADDRESS</Text>
                  <Text style={styles.hubDetailVal}>Princeton, New Jersey, USA</Text>
                </View>

                <View style={styles.hubDetailRow}>
                  <Text style={styles.hubDetailLabel}>PHONE NUMBER</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.hubDetailVal}>+91 7569665077</Text>
                    <Pressable onPress={() => handleCopy('+91 7569665077', 'usa-phone')} style={styles.copyChip}>
                      <Text style={styles.copyChipText}>{copiedKey === 'usa-phone' ? 'Copied ✓' : 'Copy'}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.hubDetailRow}>
                  <Text style={styles.hubDetailLabel}>OFFICIAL EMAIL</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.hubDetailVal}>hr@studentalumni.ai</Text>
                    <Pressable onPress={() => handleCopy('hr@studentalumni.ai', 'usa-email')} style={styles.copyChip}>
                      <Text style={styles.copyChipText}>{copiedKey === 'usa-email' ? 'Copied ✓' : 'Copy'}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.hubDetailRow}>
                  <Text style={styles.hubDetailLabel}>WORKING HOURS</Text>
                  <Text style={styles.hubDetailVal}>Mon – Fri: 9:00 AM – 6:00 PM EST</Text>
                </View>
              </HoverLiftCard>
            </View>

            {/* 2. Direct Inquiry & Support Form (Send Us a Message) */}
            <View style={styles.inquiryCard}>
              <View style={styles.sectionPill}><Text style={styles.sectionPillText}>• DIRECT INQUIRY &amp; SUPPORT</Text></View>
              <Text style={styles.inquiryHeading}>Send Us a Message</Text>
              <Text style={styles.inquirySub}>Fill out the details below and our campus relations team will respond promptly.</Text>

              <Text style={styles.bgvSectionLabel}>SELECT PURPOSE</Text>
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

              {/* Form Grid */}
              <View style={[styles.formGrid2, isNarrow && { flexDirection: 'column' }]}>
                <View style={styles.formCol}>
                  <Text style={styles.formFieldLabel}>Full Name <Text style={{ color: T.indLt }}>*</Text></Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor="#5C6273"
                    value={contactName}
                    onChangeText={setContactName}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formFieldLabel}>Official Email <Text style={{ color: T.indLt }}>*</Text></Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. rahul@example.com"
                    placeholderTextColor="#5C6273"
                    value={contactEmail}
                    onChangeText={setContactEmail}
                  />
                </View>
              </View>

              <View style={[styles.formGrid2, isNarrow && { flexDirection: 'column' }, { marginTop: 16 }]}>
                <View style={styles.formCol}>
                  <Text style={styles.formFieldLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="+91 7569665077"
                    placeholderTextColor="#5C6273"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formFieldLabel}>College / University / Company</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Princeton / VNR VJIET"
                    placeholderTextColor="#5C6273"
                    value={contactOrg}
                    onChangeText={setContactOrg}
                  />
                </View>
              </View>

              <View style={{ marginTop: 16 }}>
                <Text style={styles.formFieldLabel}>Your Message <Text style={{ color: T.indLt }}>*</Text></Text>
                <TextInput
                  style={[styles.formInput, { height: 110, textAlignVertical: 'top' }]}
                  placeholder="How can we assist you with our platform, mentorship, or institutional onboarding?"
                  placeholderTextColor="#5C6273"
                  multiline
                  value={contactMessage}
                  onChangeText={setContactMessage}
                />
              </View>

              <GlowButton
                onPress={() => {
                  setContactSent(true);
                  setTimeout(() => setContactSent(false), 2500);
                }}
                style={styles.inquirySubmitBtn}
                textStyle={styles.inquirySubmitBtnText}
              >
                {contactSent ? 'Message Transmitted Successfully ✓' : 'Transmit Message →'}
              </GlowButton>
            </View>

            {/* 3. Three Trust Badges at Bottom */}
            <View style={[styles.contactBadgesRow, isNarrow && { flexDirection: 'column' }]}>
              <View style={styles.contactBadgeItem}>
                <Svg width="17" height="17" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                  <Path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z" stroke="#34D399" strokeWidth="1.9" fill="none" />
                  <Path d="M9 12l2 2 4-4" stroke="#34D399" strokeWidth="1.9" fill="none" />
                </Svg>
                <Text style={styles.contactBadgeText}>Verified Institutional Support</Text>
              </View>

              <View style={styles.contactBadgeItem}>
                <Svg width="17" height="17" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                  <Circle cx="12" cy="12" r="8.5" stroke="#6FA8F5" strokeWidth="1.9" fill="none" />
                  <Path d="M12 8v4.5l3 1.8" stroke="#6FA8F5" strokeWidth="1.9" fill="none" />
                </Svg>
                <Text style={styles.contactBadgeText}>Direct Response Guarantee</Text>
              </View>

              <View style={styles.contactBadgeItem}>
                <Svg width="17" height="17" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                  <Circle cx="12" cy="12" r="9" stroke="#C08BFF" strokeWidth="1.9" fill="none" />
                  <Path d="M3 12h18M12 3c4 4.5 4 13.5 0 18M12 3c-4 4.5-4 13.5 0 18" stroke="#C08BFF" strokeWidth="1.9" fill="none" />
                </Svg>
                <Text style={styles.contactBadgeText}>Accredited Global Campus Network</Text>
              </View>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: HOME
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
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

              {/* 3D Swaying SA Shield Emblem with Pure Shine Effect */}
              <View style={styles.heroRightCol}>
                <div
                  className="sa-shield-glow"
                  style={{
                    position: 'absolute',
                    width: '380px',
                    height: '380px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,90,255,0.45), rgba(139,90,255,0) 68%)',
                    filter: 'blur(20px)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  className="sa-shield-sway"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <svg width="320" height="360" viewBox="0 0 300 350" style={{ overflow: 'visible' }}>
                    <defs>
                      <clipPath id="saShieldClip">
                        <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" />
                      </clipPath>

                      <linearGradient id="saShineBeam" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                        <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.8" />
                        <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.95" />
                        <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Outer Shield: Solid Vibrant Purple */}
                    <path
                      d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z"
                      fill="#7053EC"
                    />

                    {/* Inner Shield: Solid Deep Purple */}
                    <path
                      d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z"
                      fill="#5C3BD4"
                    />

                    {/* Solid Crisp White SA Emblem Text */}
                    <text
                      x="150"
                      y="215"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="128"
                      fontWeight="800"
                      fontFamily="'Manrope', sans-serif"
                      letterSpacing="-4px"
                    >
                      SA
                    </text>

                    {/* Dynamic Sweeping Shine Effect (Clipped to Shield) */}
                    <g clipPath="url(#saShieldClip)">
                      <g className="sa-shine-anim">
                        <rect
                          x="-60"
                          y="-100"
                          width="90"
                          height="600"
                          fill="url(#saShineBeam)"
                        />
                      </g>
                    </g>
                  </svg>
                </div>
              </View>
            </View>

            {/* ── DUAL-ROW CONTINUOUS PARTNER MARQUEES ── */}
            <View style={[styles.marqueeContainer, { paddingHorizontal: containerPadding }]}>
              {/* Row 1: Colleges (Left-to-Right / Rightward Continuous Loop) */}
              <View style={styles.marqueeRow}>
                <View style={styles.marqueeBadge}><Text style={styles.marqueeBadgeText}>COLLEGES</Text></View>
                <Marquee items={COLLEGES_MARQUEE} duration={26} reverse={false} />
              </View>
              {/* Row 2: Industry (Continuous Smooth Scrolling Loop) */}
              <View style={styles.marqueeRow}>
                <View style={styles.marqueeBadge}><Text style={styles.marqueeBadgeText}>INDUSTRY</Text></View>
                <Marquee items={INDUSTRY_MARQUEE} duration={24} reverse={true} />
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

            {/* ── 07. AUDIENCES: STICKY STACKING OVERLAPPING CARDS (FOUR POINTS OF VIEW, ONE GRAPH) ── */}
            <View style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <View style={styles.sectionPill}><Text style={styles.sectionPillText}>• WHO IT IS FOR</Text></View>
              <Text style={styles.sectionHeadingH2}>Four points of view, <Text style={{ color: T.indLt }}>one graph.</Text></Text>
              
              <div style={{ display: 'grid', gap: '28px', width: '100%', position: 'relative' }}>
                {/* 01 Students - Sticky Card 1 */}
                <div
                  style={{
                    position: isNarrow ? 'static' : 'sticky',
                    top: '96px',
                    zIndex: 1,
                  }}
                >
                  <HoverLiftCard
                    style={[
                      styles.audienceCard,
                      {
                        backgroundColor: '#0A0C18',
                        borderColor: '#1B1E33',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
                      },
                    ]}
                    hoverBorderColor="#8B84FF"
                  >
                    <View style={styles.audienceContent}>
                      <Text style={styles.audienceTag}>01 / STUDENTS</Text>
                      <Text style={styles.audienceTitle}>A roadmap, not a guess</Text>
                      <Text style={styles.audienceDesc}>Term-by-term steps built from your course, goals and gaps — with the alumnus who has already walked it attached to each step.</Text>
                    </View>
                    <View style={styles.audienceSvgBox}>
                      <svg width="220" height="144" viewBox="0 0 300 190" style={{ width: '100%', height: 'auto', display: 'block' }}>
                        <path d="M104 78 L150 54 L196 78 L150 102 Z" fill="#8B84FF" />
                        <path d="M196 78 v24" stroke="#8B84FF" strokeWidth="4" />
                        <rect x="60" y="120" width="180" height="18" rx="4" fill="#3B2F8F" />
                        <rect x="74" y="138" width="152" height="18" rx="4" fill="#8B84FF" opacity="0.55" />
                        <rect x="60" y="156" width="180" height="18" rx="4" fill="#3B2F8F" />
                      </svg>
                    </View>
                  </HoverLiftCard>
                </div>

                {/* 02 Alumni - Sticky Card 2 */}
                <div
                  style={{
                    position: isNarrow ? 'static' : 'sticky',
                    top: '114px',
                    zIndex: 2,
                  }}
                >
                  <HoverLiftCard
                    style={[
                      styles.audienceCard,
                      {
                        backgroundColor: '#0A0C18',
                        borderColor: '#1B1E33',
                        boxShadow: '0 26px 65px rgba(0,0,0,0.7)',
                      },
                    ]}
                    hoverBorderColor="#8B84FF"
                  >
                    <View style={styles.audienceContent}>
                      <Text style={styles.audienceTag}>02 / ALUMNI</Text>
                      <Text style={styles.audienceTitle}>Give an hour a month</Text>
                      <Text style={styles.audienceDesc}>Answer questions, post a role, run a portfolio review. Contribution is tracked and visible to your college.</Text>
                    </View>
                    <View style={styles.audienceSvgBox}>
                      <svg width="220" height="144" viewBox="0 0 300 190" style={{ width: '100%', height: 'auto', display: 'block' }}>
                        <circle cx="150" cy="80" r="38" fill="#2A2E45" />
                        <circle cx="150" cy="80" r="24" fill="#5B4FE9" opacity="0.5" />
                        <path d="M124 128 l-14 44 26 -12 M176 128 l14 44 -26 -12" fill="#5B4FE9" />
                      </svg>
                    </View>
                  </HoverLiftCard>
                </div>

                {/* 03 Mentors - Sticky Card 3 */}
                <div
                  style={{
                    position: isNarrow ? 'static' : 'sticky',
                    top: '132px',
                    zIndex: 3,
                  }}
                >
                  <HoverLiftCard
                    style={[
                      styles.audienceCard,
                      {
                        backgroundColor: '#0A0C18',
                        borderColor: '#1B1E33',
                        boxShadow: '0 28px 70px rgba(0,0,0,0.75)',
                      },
                    ]}
                    hoverBorderColor="#8B84FF"
                  >
                    <View style={styles.audienceContent}>
                      <Text style={styles.audienceTag}>03 / MENTORS</Text>
                      <Text style={styles.audienceTitle}>Calls with an agenda</Text>
                      <Text style={styles.audienceDesc}>Every session opens with prompts drawn from the student roadmap, so the first fifteen minutes are never wasted.</Text>
                    </View>
                    <View style={styles.audienceSvgBox}>
                      <svg width="220" height="144" viewBox="0 0 300 190" style={{ width: '100%', height: 'auto', display: 'block' }}>
                        <path d="M52 44 h120 q10 0 10 10 v46 q0 10 -10 10 h-72 l-22 18 v-18 h-26 q-10 0 -10 -10 v-46 q0 -10 10 -10 Z" fill="#3B82F6" opacity="0.85" />
                        <path d="M148 92 h96 q10 0 10 10 v40 q0 10 -10 10 h-60 l-20 16 v-16 h-16 q-10 0 -10 -10 v-40 q0 -10 10 -10 Z" fill="#1E3A6B" />
                      </svg>
                    </View>
                  </HoverLiftCard>
                </div>

                {/* 04 Colleges - Sticky Card 4 */}
                <div
                  style={{
                    position: isNarrow ? 'static' : 'sticky',
                    top: '150px',
                    zIndex: 4,
                  }}
                >
                  <HoverLiftCard
                    style={[
                      styles.audienceCard,
                      {
                        backgroundColor: '#0A0C18',
                        borderColor: '#1B1E33',
                        boxShadow: '0 30px 75px rgba(0,0,0,0.8)',
                      },
                    ]}
                    hoverBorderColor="#8B84FF"
                  >
                    <View style={styles.audienceContent}>
                      <Text style={styles.audienceTag}>04 / COLLEGES</Text>
                      <Text style={styles.audienceTitle}>Placement, in one view</Text>
                      <Text style={styles.audienceDesc}>Engagement, mentorship hours and placement outcomes reported per cohort, per department, per term.</Text>
                    </View>
                    <View style={styles.audienceSvgBox}>
                      <svg width="220" height="144" viewBox="0 0 300 190" style={{ width: '100%', height: 'auto', display: 'block' }}>
                        <rect x="40" y="112" width="60" height="58" fill="#4F46C7" />
                        <rect x="108" y="72" width="84" height="98" fill="#A78BFA" opacity="0.8" />
                        <rect x="200" y="98" width="60" height="72" fill="#4F46C7" />
                        <path d="M108 72 L150 44 L192 72 Z" fill="#A78BFA" />
                        <rect x="30" y="170" width="240" height="8" rx="4" fill="#4F46C7" />
                      </svg>
                    </View>
                  </HoverLiftCard>
                </div>
              </div>
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

            {/* ── 08. ROADMAP TIMELINE S-CURVE (SCROLL-LINKED FILLING PATH & GLOWING FLOW MOTION) ── */}
            <View nativeID="sa-road-sec" style={[styles.sectionContainer, { paddingHorizontal: containerPadding }]}>
              <div id="sa-road-sec" style={{ width: '100%' }}>
                <View style={styles.roadmapHeadingRow}>
                  <Text style={styles.sectionHeadingH2}>The roadmap fills in <Text style={{ color: T.indLt }}>as you scroll.</Text></Text>
                  <Text style={styles.roadmapSub}>DAY 1 → FIRST OFFER</Text>
                </View>
                <View style={{ alignItems: 'center', width: '100%', marginVertical: 20 }}>
                  <svg width="100%" height="240" viewBox="0 0 1280 300" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="saRoadmapGlowGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#5B4FE9" />
                        <stop offset="50%" stopColor="#8B84FF" />
                        <stop offset="100%" stopColor="#C08BFF" />
                      </linearGradient>
                    </defs>

                    {/* Background Base Curve */}
                    <path
                      d="M30 230 C 210 230 220 70 360 70 S 560 230 700 230 S 880 60 1010 60 S 1220 170 1250 170"
                      stroke="#1E2238"
                      strokeWidth="4"
                      fill="none"
                    />
                    
                    {/* Scroll-Driven Active Filling Stroke with Integer pathLength 1000 */}
                    <path
                      id="sa-roadline"
                      d="M30 230 C 210 230 220 70 360 70 S 560 230 700 230 S 880 60 1010 60 S 1220 170 1250 170"
                      pathLength="1000"
                      stroke="url(#saRoadmapGlowGrad)"
                      strokeWidth="5"
                      fill="none"
                      strokeDasharray="1000"
                      strokeDashoffset={Math.round(1000 * (1 - roadmapProgress))}
                      style={{ transition: 'stroke-dashoffset 0.12s ease-out' }}
                    />

                    {/* Flowing Dash Motion Beam along the Roadmap Line */}
                    <path
                      d="M30 230 C 210 230 220 70 360 70 S 560 230 700 230 S 880 60 1010 60 S 1220 170 1250 170"
                      pathLength="1000"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray="12 28"
                      strokeDashoffset={Math.round(1000 * (1 - roadmapProgress))}
                      className="sa-dash-flowing"
                      opacity={roadmapProgress > 0.05 ? 0.85 : 0}
                    />
                    
                    {/* Active Traveling Head Bubble */}
                    <g
                      id="sa-travel-bubble"
                      transform={`translate(${bubblePos.x}, ${bubblePos.y})`}
                      style={{
                        opacity: roadmapProgress > 0.01 && roadmapProgress < 0.99 ? 1 : 0.4,
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      <circle r="24" fill="#5B4FE9" opacity="0.35" />
                      <circle r="14" fill="#8B84FF" opacity="0.8" stroke="#FFFFFF" strokeWidth="2" />
                      <circle r="6" fill="#FFFFFF" />
                    </g>

                    {/* Milestone 01: Foundations */}
                    <g style={{ opacity: roadmapProgress >= 0.05 ? 1 : 0.35, transition: 'opacity 0.4s ease' }}>
                      {roadmapProgress >= 0.05 ? (
                        <>
                          <circle cx="30" cy="230" r="22" fill="#5B4FE9" opacity="0.35" />
                          <circle cx="30" cy="230" r="12" fill="#8B84FF" stroke="#FFFFFF" strokeWidth="2.2" />
                          <circle cx="30" cy="230" r="4.5" fill="#FFFFFF" />
                        </>
                      ) : (
                        <>
                          <circle cx="30" cy="230" r="10" fill="#0C0E1B" stroke="#2A2E45" strokeWidth="2" />
                          <circle cx="30" cy="230" r="3" fill="#4B4E65" />
                        </>
                      )}
                      <text x="30" y="278" textAnchor="middle" fill={roadmapProgress >= 0.05 ? '#F4F5FB' : '#5C6273'} fontSize="17" fontWeight="700" fontFamily="'Manrope', sans-serif">01 Foundations</text>
                    </g>

                    {/* Milestone 02: Skill plan */}
                    <g style={{ opacity: roadmapProgress >= 0.30 ? 1 : 0.35, transition: 'opacity 0.4s ease' }}>
                      {roadmapProgress >= 0.30 ? (
                        <>
                          <circle cx="360" cy="70" r="22" fill="#5B4FE9" opacity="0.35" />
                          <circle cx="360" cy="70" r="12" fill="#8B84FF" stroke="#FFFFFF" strokeWidth="2.2" />
                          <circle cx="360" cy="70" r="4.5" fill="#FFFFFF" />
                        </>
                      ) : (
                        <>
                          <circle cx="360" cy="70" r="10" fill="#0C0E1B" stroke="#2A2E45" strokeWidth="2" />
                          <circle cx="360" cy="70" r="3" fill="#4B4E65" />
                        </>
                      )}
                      <text x="360" y="32" textAnchor="middle" fill={roadmapProgress >= 0.30 ? '#F4F5FB' : '#5C6273'} fontSize="18" fontWeight="700" fontFamily="'Manrope', sans-serif">02 Skill plan</text>
                    </g>

                    {/* Milestone 03: Opportunities */}
                    <g style={{ opacity: roadmapProgress >= 0.56 ? 1 : 0.35, transition: 'opacity 0.4s ease' }}>
                      {roadmapProgress >= 0.56 ? (
                        <>
                          <circle cx="700" cy="230" r="22" fill="#5B4FE9" opacity="0.35" />
                          <circle cx="700" cy="230" r="12" fill="#8B84FF" stroke="#FFFFFF" strokeWidth="2.2" />
                          <circle cx="700" cy="230" r="4.5" fill="#FFFFFF" />
                        </>
                      ) : (
                        <>
                          <circle cx="700" cy="230" r="10" fill="#0C0E1B" stroke="#2A2E45" strokeWidth="2" />
                          <circle cx="700" cy="230" r="3" fill="#4B4E65" />
                        </>
                      )}
                      <text x="700" y="278" textAnchor="middle" fill={roadmapProgress >= 0.56 ? '#F4F5FB' : '#5C6273'} fontSize="18" fontWeight="700" fontFamily="'Manrope', sans-serif">03 Opportunities</text>
                    </g>

                    {/* Milestone 04: Full-time */}
                    <g style={{ opacity: roadmapProgress >= 0.82 ? 1 : 0.35, transition: 'opacity 0.4s ease' }}>
                      {roadmapProgress >= 0.82 ? (
                        <>
                          <circle cx="1010" cy="60" r="22" fill="#5B4FE9" opacity="0.35" />
                          <circle cx="1010" cy="60" r="12" fill="#8B84FF" stroke="#FFFFFF" strokeWidth="2.2" />
                          <circle cx="1010" cy="60" r="4.5" fill="#FFFFFF" />
                        </>
                      ) : (
                        <>
                          <circle cx="1010" cy="60" r="10" fill="#0C0E1B" stroke="#2A2E45" strokeWidth="2" />
                          <circle cx="1010" cy="60" r="3" fill="#4B4E65" />
                        </>
                      )}
                      <text x="1010" y="22" textAnchor="middle" fill={roadmapProgress >= 0.82 ? '#F4F5FB' : '#5C6273'} fontSize="18" fontWeight="700" fontFamily="'Manrope', sans-serif">04 Full-time</text>
                    </g>
                  </svg>
                </View>
              </div>
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
              <View style={[styles.matchGraphRow, isNarrow && { flexDirection: 'column' }]}>
                {/* Left Column: Heading, description, and Match Detail card */}
                <View style={{ flex: 1, maxWidth: isNarrow ? '100%' : 480, justifyContent: 'center' }}>
                  <View style={styles.sectionPill}><Text style={styles.sectionPillText}>• HOW MATCHING WORKS</Text></View>
                  <Text style={styles.sectionHeadingH2}>1,200+ verified mentors,<br /><Text style={{ color: T.indLt }}>ranked by fit.</Text></Text>
                  <Text style={[styles.sectionDesc, { marginBottom: 28 }]}>Agent K scores every alumnus against your course, goals and city. Hover a node to see the connection and why it was chosen.</Text>

                  {/* Detail Box */}
                  <HoverLiftCard style={styles.matchDetailBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={styles.matchDetailHeader}>MATCH DETAIL</Text>
                      <View style={{ backgroundColor: 'rgba(91,79,233,0.18)', borderWidth: 1, borderColor: '#8B84FF', borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B84FF' }}>{selectedNode.score}% FIT</Text>
                      </View>
                    </View>
                    <Text style={styles.matchDetailName}>{selectedNode.name}</Text>
                    <Text style={styles.matchDetailWhy}>{selectedNode.why}</Text>
                  </HoverLiftCard>
                </View>

                {/* Right Column: Full-Scale Orbital Radar Graph SVG */}
                <View style={{ flex: 1.15, alignItems: 'center', width: '100%', maxWidth: 620 }}>
                  <svg width="100%" height="auto" viewBox="0 0 620 540" style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}>
                    <defs>
                      <linearGradient id="radarSweepGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#8B84FF" stopOpacity="0.45" />
                        <stop offset="60%" stopColor="#5B4FE9" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Orbital Concentric Rings */}
                    <g fill="none" stroke="#1B1E33" strokeWidth="1.2">
                      <circle cx="310" cy="270" r="128" strokeDasharray="4 8" />
                      <circle cx="310" cy="270" r="206" strokeDasharray="4 8" />
                    </g>
                    
                    {/* Center Radar Pulsating Ping Waves */}
                    <circle cx="310" cy="270" r="52" fill="none" stroke="#8B84FF" strokeWidth="1.4" className="sa-ping-ring" style={{ transformOrigin: '310px 270px' }} />
                    <circle cx="310" cy="270" r="52" fill="none" stroke="#8B84FF" strokeWidth="1.4" className="sa-ping-ring-delayed" style={{ transformOrigin: '310px 270px' }} />

                    {/* Rotating Radar Scanner Beam */}
                    <g className="sa-radar-spin" style={{ transformOrigin: '310px 270px' }}>
                      <path d="M310 270 L 516 270 A 206 206 0 0 1 455 415 Z" fill="url(#radarSweepGrad)" />
                    </g>

                    {/* Selected Node Target Line with Laser Glow & Flowing Dash */}
                    <line x1="310" y1="270" x2={selectedNode.x} y2={selectedNode.y} stroke="#5B4FE9" strokeWidth="6" opacity="0.35" />
                    <line x1="310" y1="270" x2={selectedNode.x} y2={selectedNode.y} stroke="#8B84FF" strokeWidth="2.5" strokeDasharray="6 6" className="sa-dash-fast" />
                    
                    {/* Center User Hub */}
                    <circle cx="310" cy="270" r="52" fill="#0C0E1B" stroke="#5B4FE9" strokeWidth="2.4" />
                    <text x="310" y="266" textAnchor="middle" fill="#F4F5FB" fontSize="16" fontWeight="800" fontFamily="'Manrope', sans-serif">YOU</text>
                    <text x="310" y="286" textAnchor="middle" fill="#9AA0B4" fontSize="9.5" fontWeight="700" letterSpacing="1.4" fontFamily="'Manrope', sans-serif">YEAR 3</text>

                    {[
                      { x: 310, y: 132, score: '98', name: 'Priya R. — Product, Bengaluru', why: 'Same course, four years ahead. Mentors three students each term.' },
                      { x: 430, y: 201, score: '92', name: 'Arjun M. — Data, Pune', why: 'Ex-intern at target firm. Reviews analytics portfolios monthly.' },
                      { x: 430, y: 339, score: '88', name: 'Neha S. — Design, Remote', why: 'Runs the portfolio review your roadmap suggests next.' },
                      { x: 310, y: 408, score: '85', name: 'Rohit K. — Finance, Mumbai', why: 'Alumnus of your college, hiring two summer interns.' },
                      { x: 190, y: 339, score: '81', name: 'Sana T. — Research, Delhi', why: 'Published in your field, open to weekly calls.' },
                      { x: 190, y: 201, score: '76', name: 'Dev P. — Engineering, Hyderabad', why: 'Took the same electives. Answers within a day.' },
                    ].map((node, i) => {
                      const isSelected = selectedNode.x === node.x && selectedNode.y === node.y;
                      return (
                        <g
                          key={i}
                          onClick={() => setSelectedNode({ name: node.name, why: node.why, score: node.score, x: node.x, y: node.y })}
                          onMouseEnter={() => setSelectedNode({ name: node.name, why: node.why, score: node.score, x: node.x, y: node.y })}
                          style={{ cursor: 'pointer' }}
                        >
                          {isSelected && (
                            <circle cx={node.x} cy={node.y} r="40" fill="#5B4FE9" opacity="0.35" />
                          )}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={isSelected ? 34 : 30}
                            fill="#0C0E1B"
                            stroke={isSelected ? '#8B84FF' : '#2A2E45'}
                            strokeWidth={isSelected ? 2.8 : 1.6}
                            style={{ transition: 'all 0.25s ease' }}
                          />
                          <text
                            x={node.x}
                            y={node.y + 5}
                            textAnchor="middle"
                            fill={isSelected ? '#FFFFFF' : '#8B84FF'}
                            fontSize={isSelected ? '14' : '13'}
                            fontWeight="700"
                            fontFamily="'Manrope', sans-serif"
                          >
                            {node.score}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
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
                  <GlowButton onPress={() => setActiveTab('contact')} style={[styles.verifySubmitBtn, { backgroundColor: '#4B3FD6' }]} textStyle={styles.verifySubmitBtnText}>
                    Host on your campus
                  </GlowButton>
                  <GlowButton onPress={() => router.push('/register')} style={[styles.heroBtnCollege, { borderColor: '#CFC9F3' }]} textStyle={[styles.heroBtnCollegeText, { color: '#2E2A55' }]}>
                    Join the network
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

        {/* ── 13. GLOBAL UNIFIED FOOTER ── */}
        <CommonFooter onTabChange={(tab) => handleTabSwitch(tab)} />

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
    paddingVertical: 38,
    paddingHorizontal: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 34,
    minHeight: 230,
  },
  audienceContent: {
    flex: 1,
  },
  audienceSvgBox: {
    width: 220,
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.well,
    borderRadius: 14,
    padding: 12,
    flexShrink: 0,
  },
  audienceTag: {
    fontSize: 11,
    fontWeight: '700',
    color: T.indLt,
    letterSpacing: 1.8,
    marginBottom: 14,
  },
  audienceTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -1.2,
    marginBottom: 12,
  },
  audienceDesc: {
    fontSize: 15.5,
    lineHeight: 26,
    color: T.muted,
    maxWidth: 540,
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
    padding: 38,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(20,23,38,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },
  verifyHeroRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 40,
    alignItems: 'center',
  },
  verifyTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46,32,145,0.1)',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 18,
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
    fontSize: 38,
    fontWeight: '700',
    color: '#141726',
    letterSpacing: -1.6,
    lineHeight: 44,
    marginBottom: 14,
  },
  verifyHeroSubtitle: {
    fontSize: 15.5,
    lineHeight: 24,
    color: '#4A4F63',
    maxWidth: 520,
    marginBottom: 24,
  },
  verifyHeroStatsRow: {
    flexDirection: 'row',
    gap: 36,
    marginBottom: 24,
  },
  verifyStatNum: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  verifyStatLabel: {
    fontSize: 12.5,
    color: '#5F6474',
    marginTop: 4,
  },
  verifyHeroBtnPrimary: {
    backgroundColor: '#4B3FD6',
    borderRadius: 11,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  verifyHeroBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifyHeroBtnSecondary: {
    borderWidth: 1,
    borderColor: '#CFC9F3',
    borderRadius: 11,
    paddingVertical: 14,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  verifyHeroBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E2A55',
  },
  whoUsesBox: {
    width: 320,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(20,23,38,0.12)',
    borderRadius: 18,
    padding: 24,
  },
  whoUsesHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#6B7080',
    marginBottom: 16,
  },
  whoUsesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  whoUsesText: {
    fontSize: 14,
    color: '#2E2A55',
    fontWeight: '500',
  },

  /* Verify Search Area */
  verifySearchSection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 30,
  },
  verifySearchH2: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    color: T.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  verifySearchDesc: {
    fontSize: 16.5,
    lineHeight: 26,
    color: T.muted2,
    maxWidth: 620,
    textAlign: 'center',
    marginBottom: 32,
  },
  verifyInputRow: {
    width: '100%',
    maxWidth: 820,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
  },
  verifySearchInput: {
    flex: 1,
    minWidth: 200,
    fontSize: 15,
    color: T.text,
    backgroundColor: 'transparent',
    paddingVertical: 12,
  },
  verifySubmitBtn: {
    backgroundColor: T.ind,
    paddingVertical: 16,
    paddingHorizontal: 26,
    borderRadius: 14,
    justifyContent: 'center',
  },
  verifySubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sampleChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 10,
    marginBottom: 20,
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
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: T.surface,
  },
  sampleChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: T.indLt,
  },
  verifyResultBox: {
    width: '100%',
    maxWidth: 820,
    borderWidth: 1,
    borderColor: T.lineHi,
    borderRadius: 18,
    backgroundColor: T.card,
    padding: 24,
    marginTop: 24,
  },
  verifyResultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  validStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(52,211,153,0.13)',
    borderWidth: 1,
    borderColor: '#1B6B4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyResultTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: T.text,
  },
  verifyResultId: {
    fontSize: 12.5,
    color: T.muted2,
    marginTop: 2,
  },
  validStatusBadge: {
    borderWidth: 1,
    borderColor: '#1B6B4E',
    borderRadius: 100,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: 'rgba(52,211,153,0.08)',
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

  /* Cryptographic Trust Cards */
  cryptoTrustGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: 18,
    flexWrap: 'wrap',
    marginTop: 32,
  },
  cryptoCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 18,
    padding: 26,
  },
  cryptoNum: {
    fontSize: 13,
    fontWeight: '700',
    color: T.dim,
    letterSpacing: 1,
    marginBottom: 14,
  },
  cryptoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  cryptoDesc: {
    fontSize: 14,
    lineHeight: 22,
    color: T.muted2,
  },

  /* What We Verify */
  whatWeVerifyHeader: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: T.dim,
    marginBottom: 16,
  },
  whatWeVerifyRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
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
    marginBottom: 6,
  },
  verifyFeatureDesc: {
    fontSize: 14,
    lineHeight: 22,
    color: T.muted2,
  },

  /* BGV Desk Form Card & Sidebar */
  bgvDeskCard: {
    width: '100%',
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.lineHi,
    borderRadius: 22,
    padding: 34,
    marginTop: 40,
  },
  bgvDeskRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 40,
    alignItems: 'flex-start',
  },
  bgvDeskHeading: {
    fontSize: 29,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -1.2,
    marginTop: 14,
    marginBottom: 8,
  },
  bgvDeskSub: {
    fontSize: 15,
    lineHeight: 24,
    color: T.muted2,
    marginBottom: 24,
    maxWidth: 580,
  },
  bgvSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: T.dim,
    marginBottom: 12,
  },
  kindSelectorRow: {
    flexDirection: 'row',
    gap: 9,
    flexWrap: 'wrap',
    marginBottom: 24,
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
  formGrid2: {
    width: '100%',
    flexDirection: 'row',
    gap: 16,
  },
  formCol: {
    flex: 1,
    minWidth: 0,
  },
  formFieldLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: T.text,
    marginBottom: 8,
  },
  formInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 12,
    backgroundColor: T.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14.5,
    color: T.text,
  },
  consentCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
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
  bgvFooterNote: {
    fontSize: 12.5,
    color: T.dim,
    textAlign: 'center',
    marginTop: 12,
  },
  bgvSidebarCol: {
    width: 320,
    gap: 14,
  },
  bgvSideCard: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 16,
    padding: 20,
  },
  bgvSideHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: T.dim,
    marginBottom: 14,
  },
  turnaroundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  turnaroundLabel: {
    fontSize: 13.5,
    color: T.muted2,
  },
  turnaroundVal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: T.text,
  },
  handledItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  handledText: {
    fontSize: 13.5,
    color: T.text2,
    fontWeight: '500',
  },
  preferEmailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: T.text,
    marginBottom: 6,
  },
  preferEmailDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: T.muted2,
  },

  /* ── Contact View ── */
  centeredHeader: {
    width: '100%',
    alignItems: 'center',
    textAlign: 'center' as any,
    marginBottom: 40,
  },
  pageTitleH1: {
    fontSize: 48,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -2,
    lineHeight: 54,
    marginVertical: 18,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: T.muted2,
    maxWidth: 640,
    textAlign: 'center',
  },
  hubsGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  hubCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 20,
    padding: 26,
  },
  hubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    marginBottom: 14,
  },
  hubIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(139,132,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(139,132,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 2,
  },
  hubDetailRow: {
    marginVertical: 8,
  },
  hubDetailLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: T.dim,
    marginBottom: 4,
  },
  hubDetailVal: {
    fontSize: 15,
    fontWeight: '600',
    color: T.text,
  },
  copyChip: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.lineHi,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  copyChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: T.indLt,
  },
  inquiryCard: {
    width: '100%',
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 22,
    padding: 34,
    marginTop: 10,
    marginBottom: 20,
  },
  inquiryHeading: {
    fontSize: 30,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -1.2,
    marginTop: 14,
    marginBottom: 6,
  },
  inquirySub: {
    fontSize: 15,
    color: T.muted2,
    marginBottom: 24,
  },
  purposePillsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 26,
  },
  inquirySubmitBtn: {
    backgroundColor: T.ind,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  inquirySubmitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactBadgesRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 16,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 18,
    padding: 22,
    marginTop: 10,
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  contactBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactBadgeText: {
    fontSize: 14,
    color: T.text2,
    fontWeight: '500',
  },
});
