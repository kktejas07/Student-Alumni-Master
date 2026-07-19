/**
 * LandingPage — v3.0.0 Premium Dark (3D illustrations · motion frames · scroll chapters)
 *
 * Immersive full-screen hero · marquee · animated stats · device dashboard ·
 * feature narratives · career timeline · alumni 3D cards · AI chat · stories carousel ·
 * FAQ · CTA · premium footer with newsletter
 *
 * Brand: dark navy #080B12 + violet #8B5CF6
 */
import React, { useEffect, useRef, useState, useCallback, createRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image,
  useWindowDimensions, Platform, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { motion } from 'framer-motion';
import Svg, { Circle, Rect, Defs, LinearGradient, Stop, Text as SvgText, Path, G } from 'react-native-svg';
import {
  Sparkles, GraduationCap, Bot, Users, Star,
  ChevronRight, Target, MessageCircle, ArrowUpRight, Activity,
} from 'lucide-react-native';
import { SunsetHero } from '@/src/components/ui/aurora-hero-bg-1';

import { TYPO } from '@/src/views/web/portals/student/tokens';

/* ── Brand Palette (violet dark) ──────────────────────────────────────── */
const C = {
  bg: '#080B12', bg2: '#0D1326', bg3: '#131938',
  card: 'rgba(255,255,255,0.03)', cardH: 'rgba(139,92,246,0.10)',
  border: 'rgba(255,255,255,0.06)', borderH: 'rgba(139,92,246,0.30)',
  text: '#F4F4F8', text2: '#A1A6B7', text3: '#6E7388', text4: '#4A4F65',
  primary: '#8B5CF6', primaryD: '#7C3AED', primaryL: '#A78BFA', primaryS: 'rgba(139,92,246,0.12)',
  secondary: '#3B82F6', accent: '#10B981', accentS: 'rgba(16,185,129,0.12)',
  amber: '#F59E0B', rose: '#f43f5e',
  shadow: '0 16px 48px rgba(2,6,23,0.45), 0 1px 0 rgba(255,255,255,0.06) inset',
  shadowLg: '0 24px 64px rgba(2,6,23,0.55), 0 1px 0 rgba(255,255,255,0.08) inset',
};

/* ── Inject CSS Keyframes ─────────────────────────────────────────────── */
const ANIM_ID = 'sa-landing-anim';
function injectKeyframes() {
  if (typeof document === 'undefined' || document.getElementById(ANIM_ID)) return;
  const style = document.createElement('style');
  style.id = ANIM_ID;
  style.textContent = `
    @keyframes saFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes saFloat2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes saFloat3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes saShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes saGlow { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
    @keyframes saPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    @keyframes saMarquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes saSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    @keyframes saBreathe { 0%,100%{transform:scale(1) rotate(0deg)} 50%{transform:scale(1.02) rotate(0.5deg)} }
    @keyframes saRipple { 0%{box-shadow:0 0 0 0 rgba(139,92,246,0.4)} 100%{box-shadow:0 0 0 20px rgba(139,92,246,0)} }
    @keyframes saSlideUp { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes saProgressFill { 0%{width:0%} 100%{width:var(--target)} }
    .sa-hover-lift:hover { transform:translateY(-4px) !important; box-shadow:0 24px 64px rgba(2,6,23,0.5), 0 1px 0 rgba(139,92,246,0.15) inset !important; }
    .sa-hover-glow:hover { border-color:rgba(139,92,246,0.4) !important; box-shadow:0 0 24px rgba(139,92,246,0.08) !important; }
    .sa-card-3d { transition:transform 0.4s cubic-bezier(.23,1,.32,1), box-shadow 0.4s ease; transform-style:preserve-3d; }
    .sa-card-3d:hover { transform:perspective(800px) rotateX(-2deg) rotateY(2deg) translateY(-4px); }
    .sa-marquee:hover .sa-marquee-inner { animation-play-state:paused !important; }
    .sa-gradient-text { background:linear-gradient(135deg,#8B5CF6,#A78BFA,#3B82F6,#10B981); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-size:200% 200%; animation:saShimmer 4s ease infinite; }
    .sa-float-anim { animation:saFloat 3s ease-in-out infinite; }
    .sa-float-anim-2 { animation:saFloat2 3.5s ease-in-out infinite 0.5s; }
    .sa-float-anim-3 { animation:saFloat3 4s ease-in-out infinite 1s; }
    .sa-glow-pulse { animation:saGlow 2s ease-in-out infinite; }
    .sa-shimmer-bg { background:linear-gradient(90deg,transparent,rgba(139,92,246,0.06),transparent); background-size:200% 100%; animation:saShimmer 3s ease infinite; }
    .sa-ripple-btn { animation:saRipple 2s ease-out infinite; }
    .sa-breathe { animation:saBreathe 6s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}
if (typeof document !== 'undefined') injectKeyframes();

/* ── Hooks ─────────────────────────────────────────────────────────────── */
type RevealDir = 'up' | 'left' | 'right' | 'scale';
function useScrollReveal(opts: { threshold?: number; direction?: RevealDir } = {}) {
  const { threshold = 0.1, direction = 'up' } = opts;
  const ref = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') { setVisible(true); return; }
    const el = ref.current as any;
    if (!el) return;
    const o = new (window as any).IntersectionObserver(
      ([e]: any) => { if (e.isIntersecting) { setVisible(true); o.disconnect(); } },
      { threshold }
    );
    o.observe(el);
    return () => o.disconnect();
  }, [threshold]);
  const hidden = (d: RevealDir) => {
    const m = 50;
    switch (d) {
      case 'up': return [{ translateY: m }];
      case 'left': return [{ translateX: -m }];
      case 'right': return [{ translateX: m }];
      case 'scale': return [{ scale: 0.92 }];
    }
  };
  const revealStyle = {
    opacity: visible ? 1 : 0,
    transform: visible ? [] : hidden(direction),
    ...(Platform.OS === 'web' ? { transition: 'opacity 0.7s cubic-bezier(.23,1,.32,1), transform 0.7s cubic-bezier(.23,1,.32,1)' } : {}),
    ...(Platform.OS === 'web' && direction === 'scale' ? { transform: visible ? [{ scale: 1 }] : [{ scale: 0.92 }] } : {}),
  } as any;
  return { ref, visible, revealStyle };
}

function useScrollPosition() {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const h = () => setY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    h();
    return () => window.removeEventListener('scroll', h);
  }, []);
  return y;
}

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useScrollReveal({ threshold: 0.2 });
  useEffect(() => {
    if (!visible) return;
    const start = Date.now();
    const go = () => { const p = Math.min((Date.now() - start) / 2200, 1); setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) requestAnimationFrame(go); };
    requestAnimationFrame(go);
  }, [visible, target]);
  return <Text ref={ref as any} style={st.counter}>{prefix}{count.toLocaleString()}{suffix}</Text>;
}

/* ── Main Export ───────────────────────────────────────────────────────── */
export default function LandingPage() {
  useEffect(() => { if (Platform.OS === 'web') injectKeyframes(); }, []);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desk = width >= 1024;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: 20 }}>
        <Navbar router={router} desk={desk} />
        <Hero router={router} desk={desk} />
        <MarqueeSection />
        <StatsSection />
        <DashboardShowcase desk={desk} />
        <FeatureNarratives desk={desk} />
        <CareerTimeline desk={desk} />
        <AlumniShowcase desk={desk} />
        <SuccessCarousel />
        <AIChatSection />
        <FAQSection />
        <CTASection router={router} desk={desk} />
        <FooterSection />
      </ScrollView>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Navbar ─────────────────────────────────────────────────────────── */
function Navbar({ router, desk }: { router: any; desk: boolean }) {
  const [sc, setSc] = useState(false);
  useEffect(() => { if (Platform.OS !== 'web') return; const h = () => setSc(window.scrollY > 20); window.addEventListener('scroll', h, { passive: true }); return () => window.removeEventListener('scroll', h); }, []);
  return (
    <View style={[nb.bar, sc && nb.barSc]}>
      <View style={nb.in}>
        <Pressable onPress={() => router.push('/')} style={nb.br}>
          <Image source={require('@/assets/images/sa-icon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
          <Text style={nb.brT}>Student<span style={{ color: C.primary }}>Alumni</span></Text>
        </Pressable>
        {desk && (
          <View style={nb.lk}>
            {['Platform', 'For Students', 'For Alumni', 'Pricing'].map((l, i) => (
              <Pressable key={l} style={({ hovered }: any) => [nb.lkI, hovered && { backgroundColor: C.primaryS }]}>
                <Text style={[nb.lkT, { color: i === 0 ? C.primary : C.text2 }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={nb.ct}>
          <Pressable onPress={() => router.push('/login')} style={({ hovered }: any) => [nb.si, hovered && { backgroundColor: C.primaryS }]}><Text style={nb.siT}>Sign in</Text></Pressable>
          <Pressable onPress={() => router.push('/register')} style={({ hovered }: any) => [nb.cta, hovered && { backgroundColor: C.primaryD }]}><Text style={nb.ctaT}>Get started</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Hero (Immersive split · left copy + right 3D illustration) ─────── */
const MView = motion(View);
const MText = motion(Text);
function Hero({ router, desk }: { router: any; desk: boolean }) {
  const metrics = [
    { v: '12.5K', l: 'Students', c: C.primary },
    { v: '850+', l: 'Mentors', c: C.accent },
    { v: '46', l: 'Colleges', c: C.secondary },
  ];
  return (
    <SunsetHero>
      <View style={{ width: '100%', maxWidth: 1400, marginHorizontal: 'auto', paddingHorizontal: 24, paddingTop: desk ? 120 : 90, paddingBottom: desk ? 80 : 50, flexDirection: desk ? 'row' : 'column', alignItems: 'center', gap: desk ? 48 : 0 } as any}>
        {/* Left — Copy */}
        <MView
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ flex: 1, alignItems: desk ? 'flex-start' : 'center', paddingTop: desk ? 40 : 0, zIndex: 2 } as any}
        >
          <MView
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primaryS, borderWidth: 1, borderColor: C.borderH, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 20, ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}) } as any}>
              <Sparkles size={10} color={C.primary} />
              <Text style={{ fontFamily: TYPO.body600, fontSize: 9.5, color: C.primary, letterSpacing: 0.3 }}>India's trusted alumni network</Text>
            </Pressable>
          </MView>

          <View style={{ marginBottom: 16 }}>
            <Text style={[hro.h1, { fontSize: desk ? 50 : 34, lineHeight: desk ? 56 : 40, textAlign: desk ? 'left' : 'center', letterSpacing: -1.2 }]}>
              Your college network{'\n'}
              <Text style={{ color: C.primary }}>meets AI-powered careers.</Text>
            </Text>
          </View>

          <MText
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            style={{
              fontFamily: TYPO.body400,
              fontSize: desk ? 15 : 13.5,
              color: C.text2,
              lineHeight: desk ? 24 : 22,
              textAlign: desk ? 'left' : 'center',
              maxWidth: 540,
              marginBottom: 24,
            }}
          >
            Connect with verified alumni, get AI career guidance, book 1-on-1 mentoring, and unlock exclusive opportunities.
          </MText>

          <MView
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            style={{ alignSelf: desk ? 'auto' : 'center' } as any}
          >
            <View style={[hro.cr, { alignSelf: desk ? 'auto' : 'center' }]}>
              <Pressable onPress={() => router.push('/register')} style={({ hovered }: any) => [{ paddingHorizontal: 24, paddingVertical: 13, borderRadius: 10, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', gap: 6 }, hovered && { backgroundColor: C.primaryD, transform: [{ translateY: -1 }] as any }]}>
                <Text style={{ color: '#fff', fontFamily: TYPO.body700, fontSize: 14 }}>Start free</Text>
                <ArrowUpRight size={14} color="#fff" />
              </Pressable>
              <Pressable onPress={() => router.push('/login')} style={({ hovered }: any) => [{ paddingHorizontal: 22, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: C.border }, hovered && { borderColor: C.borderH, backgroundColor: C.primaryS }]}>
                <Text style={{ color: C.text2, fontFamily: TYPO.body600, fontSize: 13 }}>Sign in</Text>
              </Pressable>
            </View>
          </MView>

          {/* Floating trust metrics */}
          <MView
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            style={{ flexDirection: 'row', gap: 16, marginTop: 28, flexWrap: 'wrap', alignSelf: desk ? 'auto' : 'center' } as any}
          >
            {metrics.map((m, i) => (
              <View key={m.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.c }} />
                <Text style={{ color: C.text, fontFamily: TYPO.mono700, fontSize: 14, letterSpacing: -0.5 }}>{m.v}</Text>
                <Text style={{ color: C.text3, fontFamily: TYPO.body500, fontSize: 11 }}>{m.l}</Text>
              </View>
            ))}
          </MView>

          {/* Trust indicators */}
          <MView
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 } as any}
          >
            <View style={{ flexDirection: 'row' }}>{[0,1,2,3,4].map(s => <Text key={s} style={{ color: '#FBBF24', fontSize: 11 }}>★</Text>)}</View>
            <Text style={{ color: C.text3, fontFamily: TYPO.body500, fontSize: 11 }}>4.9 from 2,400+ reviews</Text>
          </MView>
        </MView>
        {/* Right — Product Image Carousel */}
        <MView
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ flex: 1, width: '100%' } as any}
        >
          <HeroCarousel desk={desk} />
        </MView>
      </View>
    </SunsetHero>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Hero Image Carousel (product screenshots) ───────────────────────── */
const SLIDES = [
  { label: 'Dashboard', sub: 'Analytics, network & activity — unified', img: require('@/assets/images/sa-hero-1.jpg') },
  { label: 'AI Career Chat', sub: 'Agent K learns your goals & recommends', img: require('@/assets/images/sa-hero-2.jpg') },
  { label: 'Mentor Network', sub: 'Verified alumni from top companies', img: require('@/assets/images/sa-hero-3.jpg') },
];

function HeroCarousel({ desk }: { desk: boolean }) {
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setActive(c => (c + 1) % SLIDES.length), 3500);
  }, []);
  useEffect(() => { start(); return () => { if (timer.current) clearInterval(timer.current); }; }, [start]);
  const slide = SLIDES[active];
  return (
    <View style={{ flex: 1, minHeight: desk ? 440 : 300, marginTop: desk ? 0 : 32 }}>
      <View style={{ width: '100%', aspectRatio: 4 / 3, ...(Platform.OS === 'web' ? { transformStyle: 'preserve-3d', perspective: '1000px' } : {}) } as any}>
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden', backgroundColor: C.card, ...(Platform.OS === 'web' ? { boxShadow: '0 20px 60px rgba(0,0,0,0.35)', transition: 'opacity 0.4s ease' } : {}) } as any}>
          <Image
            source={slide.img}
            style={{ width: '100%', height: '100%', aspectRatio: 4 / 3, backgroundColor: C.bg2 }}
            resizeMode="cover"
          />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, ...(Platform.OS === 'web' ? { background: 'linear-gradient(transparent, rgba(8,11,18,0.95))' } : {}) } as any}>
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, justifyContent: 'flex-end', flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }} />
                <Text style={{ color: C.primary, fontFamily: TYPO.body700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{slide.label}</Text>
              </View>
              <Text style={{ color: C.text3, fontFamily: TYPO.body500, fontSize: 11 }}>{slide.sub}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} onPress={() => { setActive(i); start(); }} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: i === active ? C.primary : C.text4, transition: 'all 0.3s ease' } as any} />
        ))}
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Marquee (Trusted Universities) ───────────────────────────────────── */
const COLLEGES = ['IIT Delhi', 'IIT Bombay', 'IIT Kanpur', 'IIT Kharagpur', 'IIM Ahmedabad', 'IIM Bangalore', 'NIT Trichy', 'BITS Pilani', 'DTU Delhi', 'NSUT Delhi', 'IIT Roorkee', 'IIIT Hyderabad', 'VIT Vellore', 'COEP Pune'];
function MarqueeSection() {
  const [paused, setPaused] = useState(false);
  return (
    <View style={{ paddingVertical: 28, alignItems: 'center', overflow: 'hidden' }}>
      <Text style={{ fontFamily: TYPO.body500, fontSize: 10, color: C.text3, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>Trusted by India's top institutions</Text>
      {Platform.OS === 'web' ? (
        <View style={{ width: '100%', overflow: 'hidden' } as any} {...{ onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false) } as any}>
          <View style={{ flexDirection: 'row', gap: 12, animationName: 'saMarquee', animationDuration: '30s', animationTimingFunction: 'linear', animationIterationCount: 'infinite', animationPlayState: paused ? 'paused' : 'running', width: 'max-content' } as any}>
            {[...Array(2)].map((_, r) => COLLEGES.map((c, i) => (
              <View key={`${c}${r}${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 7, whiteSpace: 'nowrap' } as any}>
                <GraduationCap size={10} color={C.primary} />
                <Text style={{ color: C.text2, fontFamily: TYPO.body500, fontSize: 10.5 }}>{c}</Text>
              </View>
            )))}
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 24 }}>
          {COLLEGES.map(c => (
            <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 6 }}>
              <GraduationCap size={10} color={C.primary} />
              <Text style={{ color: C.text2, fontFamily: TYPO.body500, fontSize: 10.5 }}>{c}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Animated Stats ──────────────────────────────────────────────────── */
function StatsSection() {
  const items = [
    { v: 12500, s: '+', l: 'Active students', icon: Users, c: C.primary },
    { v: 850, s: '+', l: 'Verified mentors', icon: GraduationCap, c: C.secondary },
    { v: 4200, s: '+', l: 'Sessions held', icon: MessageCircle, c: C.accent },
    { v: 96, s: '%', l: 'Satisfaction', icon: Star, c: C.amber },
  ];
  const { ref, visible, revealStyle } = useScrollReveal({ threshold: 0.15, direction: 'scale' });
  return (
    <View ref={ref as any} style={[revealStyle, { paddingHorizontal: 24, marginVertical: 12 }]}>
      <View style={{ maxWidth: 1300, width: '100%', alignSelf: 'center', flexDirection: 'row', padding: 28, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)', boxShadow: C.shadow } : {}) } as any}>
        {items.map((it, i) => {
          const Ic = it.icon;
          return (
            <View key={it.l} style={{ flex: 1, minWidth: 130, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: C.border, ...(Platform.OS === 'web' ? { transitionDelay: `${i * 0.12}s`, transition: 'opacity 0.5s ease, transform 0.5s ease', opacity: visible ? 1 : 0, transform: [{ translateY: visible ? 0 : 15 }] } : {}) } as any}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: it.c + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Ic size={15} color={it.c} />
              </View>
              <Text style={st.counter}><AnimatedCounter target={it.v} suffix={it.s} /></Text>
              <Text style={{ fontFamily: TYPO.body500, fontSize: 11, color: C.text3, marginTop: 2 }}>{it.l}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Dashboard Showcase (device frame) ───────────────────────────────── */
function DashboardShowcase({ desk }: { desk: boolean }) {
  const { ref, revealStyle } = useScrollReveal({ threshold: 0.1, direction: 'left' });
  return (
    <View ref={ref as any} style={[revealStyle, { paddingHorizontal: 24, marginVertical: 12 }]}>
      <View style={{ maxWidth: 1300, width: '100%', alignSelf: 'center', alignItems: 'center' }}>
        <Text style={sec.badge}>Product</Text>
        <Text style={sec.h2}>Your entire network in one dashboard</Text>
        <Text style={sec.p}>Analytics, mentorship, events, AI insights, and career tracking — unified.</Text>
        {/* Laptop frame */}
        <View style={{ width: '100%', maxWidth: 1100, marginTop: 28, ...(Platform.OS === 'web' ? { perspective: '1200px', transformStyle: 'preserve-3d' } : {}) } as any}>
          <View style={{ backgroundColor: '#1a1a2e', borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...(Platform.OS === 'web' ? { boxShadow: '0 32px 80px rgba(0,0,0,0.5)', transform: desk ? 'perspective(1200px) rotateX(4deg)' : 'none', transition: 'transform 0.6s ease' } : {}) } as any}>
            {/* Screen */}
            <View style={{ padding: 3 }}>
              <Svg width="100%" height="100%" viewBox="0 0 800 500">
                <Rect width="800" height="500" rx="12" fill={C.bg2} />
                {/* Dashboard content inside */}
                <Rect x="20" y="16" width="760" height="32" rx="8" fill="rgba(255,255,255,0.03)" />
                <Circle cx="36" cy="32" r="4" fill="#EF4444" /><Circle cx="52" cy="32" r="4" fill="#F59E0B" /><Circle cx="68" cy="32" r="4" fill="#22C55E" />
                <SvgText x="400" y="37" fill={C.text2} fontFamily="PlusJakartaSans_600SemiBold" fontSize="12" textAnchor="middle">StudentAlumni · Dashboard</SvgText>
                {/* Grid layout */}
                <Rect x="20" y="60" width="220" height="428" rx="10" fill="rgba(255,255,255,0.015)" stroke={C.border} strokeWidth="1" />
                <Rect x="252" y="60" width="300" height="200" rx="10" fill="rgba(139,92,246,0.04)" stroke={C.borderH} strokeWidth="1" />
                <Rect x="564" y="60" width="216" height="200" rx="10" fill="rgba(16,185,129,0.03)" stroke="rgba(16,185,129,0.15)" strokeWidth="1" />
                <Rect x="252" y="272" width="216" height="216" rx="10" fill="rgba(59,130,246,0.03)" stroke="rgba(59,130,246,0.12)" strokeWidth="1" />
                <Rect x="480" y="272" width="300" height="216" rx="10" fill="rgba(245,158,11,0.03)" stroke="rgba(245,158,11,0.12)" strokeWidth="1" />
                {/* Mini labels */}
                <SvgText x="272" y="90" fill={C.primary} fontFamily="PlusJakartaSans_700Bold" fontSize="10">Student Growth</SvgText>
                {[60,45,80,55,90,70].map((h,i) => (
                  <Rect key={i} x={280 + i * 38} y={150 - h * 0.5} width="24" height={h * 0.5} rx="3" fill={C.primary} opacity={0.5 + i * 0.08} />
                ))}
                <SvgText x={580} y={90} fill={C.accent} fontFamily="PlusJakartaSans_700Bold" fontSize="10">Mentor Sessions</SvgText>
                <SvgText x={580} y={220} fill={C.accent} fontFamily="PlusJakartaSans_700Bold" fontSize="28">420</SvgText>
                <SvgText x={580} y={240} fill={C.text3} fontFamily="PlusJakartaSans_500Medium" fontSize="9">this month</SvgText>
                <SvgText x={272} y={300} fill={C.secondary} fontFamily="PlusJakartaSans_700Bold" fontSize="10">Upcoming Events</SvgText>
                <SvgText x={500} y={300} fill={C.amber} fontFamily="PlusJakartaSans_700Bold" fontSize="10">Job Matches</SvgText>
                {/* Chart bars bottom row */}
                {[3,5,2,7,4].map((h,i) => (
                  <Rect key={`b${i}`} x={500 + i * 52} y={360 - h * 8} width="36" height={h * 8} rx="3" fill={C.amber} opacity={0.5 + i * 0.1} />
                ))}
              </Svg>
            </View>
            {/* Bottom bar (laptop base) */}
            <View style={{ height: 12, backgroundColor: '#12121e', borderTopWidth: 1, borderTopColor: C.border }} />
          </View>
        </View>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Feature Narratives (alternating) ────────────────────────────────── */
const FEATURES = [
  { l: 'AI Career Copilot', d: 'Agent K learns your goals, writes career briefs, edits resumes, and recommends opportunities.', icon: Bot, t: C.primary, sides: ['left', 'right'] },
  { l: 'Mentor Network', d: 'Search verified alumni by company, role, or college. Send requests and book 1-on-1 sessions instantly.', icon: Users, t: C.secondary, sides: ['right', 'left'] },
];

function FeatureNarratives({ desk }: { desk: boolean }) {
  return (
    <View style={{ paddingHorizontal: 24, marginTop: 52, marginBottom: 12 }}>
      <View style={{ maxWidth: 1300, width: '100%', alignSelf: 'center', gap: 40 }}>
        <Text style={[sec.badge, { textAlign: 'center' }]}>Platform capabilities</Text>
        <Text style={[sec.h2, { textAlign: 'center' }]}>Everything you need in one place</Text>
        <Text style={[sec.p, { textAlign: 'center', alignSelf: 'center' }]}>From AI-powered career guidance to mentor matching, events, and analytics.</Text>
        {FEATURES.map((f, i) => {
          const Ic = f.icon;
          const isReversed = i % 2 === 1;
          const { ref, revealStyle } = useScrollReveal({ threshold: 0.1, direction: i % 2 === 0 ? 'right' : 'left' });
          return (
            <View key={f.l} ref={ref as any} style={[revealStyle, { flexDirection: desk ? (isReversed ? 'row-reverse' : 'row') : 'column', gap: 28, alignItems: 'center' }]}>
              <View style={{ flex: 1, minWidth: 260, gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: f.t + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic size={18} color={f.t} />
                </View>
                <Text style={{ color: C.text, fontFamily: TYPO.display700, fontSize: 20 }}>{f.l}</Text>
                <Text style={{ color: C.text2, fontFamily: TYPO.body400, fontSize: 13.5, lineHeight: 20 }}>{f.d}</Text>
                <Pressable style={({ hovered }: any) => [{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }, hovered && { opacity: 0.8 }]}>
                  <Text style={{ color: f.t, fontFamily: TYPO.body600, fontSize: 12 }}>Learn more</Text>
                  <ChevronRight size={12} color={f.t} />
                </Pressable>
              </View>
              <View style={{ flex: 1, minWidth: 260, minHeight: 200, width: '100%' }}>
                {i === 0 ? <AgentKMiniSVG /> : <MentorMiniSVG />}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AgentKMiniSVG() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 460 280">
      <Rect width="460" height="280" rx="14" fill={C.bg2} stroke={C.border} strokeWidth="1" />
      <Rect x="16" y="12" width="428" height="28" rx="8" fill="rgba(255,255,255,0.03)" />
      <Circle cx="30" cy="26" r="3.5" fill="#EF4444" /><Circle cx="44" cy="26" r="3.5" fill="#F59E0B" /><Circle cx="58" cy="26" r="3.5" fill="#22C55E" />
      {/* Chat messages */}
      <Rect x="20" y="52" width="200" height="36" rx="10" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
      <SvgText x="32" y="75" fill={C.accent} fontFamily="PlusJakartaSans_600SemiBold" fontSize="10">Agent K: Your brief is ready ✦</SvgText>
      <Rect x={240} y="96" width="180" height="36" rx="10" fill={C.primaryS} stroke={C.borderH} strokeWidth="1" />
      <SvgText x={252} y={120} fill={C.text} fontFamily="PlusJakartaSans_500Medium" fontSize="10">Show me top companies</SvgText>
      <Rect x="20" y="140" width="280" height="48" rx="10" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.15)" strokeWidth="1" />
      <SvgText x="32" y={160} fill={C.accent} fontFamily="PlusJakartaSans_500Medium" fontSize="10">Top 5 companies hiring in your domain this week</SvgText>
      <SvgText x="32" y={178} fill={C.text3} fontFamily="PlusJakartaSans_500Medium" fontSize="8">1. Google · 2. Microsoft · 3. Razorpay · 4. Amazon · 5. Stripe</SvgText>
      <Rect x="20" y="200" width="420" height="32" rx="8" fill="rgba(255,255,255,0.02)" stroke={C.border} strokeWidth="1" />
      <SvgText x="32" y={221} fill={C.text3} fontFamily="PlusJakartaSans_500Medium" fontSize="9.5">Ask Agent K anything...</SvgText>
    </Svg>
  );
}

function MentorMiniSVG() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 460 280">
      <Rect width="460" height="280" rx="14" fill={C.bg2} stroke={C.border} strokeWidth="1" />
      <Rect x="16" y="12" width="428" height="28" rx="8" fill="rgba(255,255,255,0.03)" />
      <Circle cx="30" cy="26" r="3.5" fill="#EF4444" /><Circle cx="44" cy="26" r="3.5" fill="#F59E0B" /><Circle cx="58" cy="26" r="3.5" fill="#22C55E" />
      <Rect x="20" y="52" width="160" height="28" rx="6" fill={C.primaryS} stroke={C.borderH} strokeWidth="1" />
      <SvgText x="32" y="71" fill={C.primary} fontFamily="PlusJakartaSans_700Bold" fontSize="11">Find your mentor</SvgText>
      {[
        {n:'Rahul Sharma',r:'Senior SDE @ Google',c:C.primary},
        {n:'Priya Patel',r:'PM @ Amazon',c:C.secondary},
        {n:'Arjun Mehta',r:'DS @ Microsoft',c:C.accent},
      ].map((m,i) => (
        <React.Fragment key={m.n}>
          <Rect x="20" y={94 + i * 52} width="420" height="44" rx="8" fill={i === 0 ? 'rgba(139,92,246,0.04)' : 'transparent'} stroke={C.border} strokeWidth="1" />
          <Circle cx={40} cy={116 + i * 52} r="14" fill={m.c + '18'} />
          <SvgText x="64" y={114 + i * 52} fill={C.text} fontFamily="PlusJakartaSans_600SemiBold" fontSize="11">{m.n}</SvgText>
          <SvgText x="64" y={130 + i * 52} fill={C.text3} fontFamily="PlusJakartaSans_500Medium" fontSize="9">{m.r}</SvgText>
          <Rect x={400} y={104 + i * 52} width="26" height="26" rx="6" fill={m.c} opacity="0.8" />
          <SvgText x={405} y={122 + i * 52} fill="#fff" fontFamily="PlusJakartaSans_700Bold" fontSize="9">→</SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Career Timeline ─────────────────────────────────────────────────── */
const MILESTONES = [
  { n: '01', t: 'Student joins', d: 'Signs up with college email. Instant verification.', c: C.primary, icon: GraduationCap },
  { n: '02', t: 'Creates profile', d: 'Adds skills, goals, target roles. Agent K activates.', c: C.secondary, icon: Target },
  { n: '03', t: 'AI recommends', d: 'Agent K suggests alumni, events, and internships.', c: C.accent, icon: Bot },
  { n: '04', t: 'Connects', d: 'Finds mentor, books 1-on-1, joins community.', c: C.amber, icon: Users },
  { n: '05', t: 'Grows', d: 'Attends events, gains referrals, builds network.', c: '#A78BFA', icon: Activity },
];

function CareerTimeline({ desk }: { desk: boolean }) {
  const { ref, visible, revealStyle } = useScrollReveal({ threshold: 0.08, direction: 'scale' });
  return (
    <View ref={ref as any} style={[revealStyle, { paddingHorizontal: 24, marginTop: 52, marginBottom: 12 }]}>
      <View style={{ maxWidth: 1300, width: '100%', alignSelf: 'center' }}>
        <Text style={[sec.badge, { textAlign: 'center' }]}>Career journey</Text>
        <Text style={[sec.h2, { textAlign: 'center' }]}>Your path from campus to career</Text>
        <Text style={[sec.p, { textAlign: 'center', alignSelf: 'center', marginBottom: 28 }]}>Five stages. One platform. Endless possibilities.</Text>
        {/* Timeline */}
        <View style={{ position: 'relative' }}>
          {desk && <View style={{ position: 'absolute', top: 28, left: '5%', right: '5%', height: 2, backgroundColor: C.border }} />}
          <View style={{ flexDirection: desk ? 'row' : 'column', gap: 12, justifyContent: 'space-between' }}>
            {MILESTONES.map((m, i) => {
              const Ic = m.icon;
              return (
                <View key={m.n} style={{ flex: 1, alignItems: 'center', gap: 10, ...(Platform.OS === 'web' ? { transitionDelay: `${i * 0.15}s`, transition: 'opacity 0.5s ease, transform 0.5s ease', opacity: visible ? 1 : 0, transform: [{ translateY: visible ? 0 : 20 }] } : {}) } as any}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: m.c + '14', borderWidth: 1.5, borderColor: m.c + '25', alignItems: 'center', justifyContent: 'center', zIndex: 1, ...(Platform.OS === 'web' ? { transition: 'all 0.3s ease' } : {}) } as any}>
                    <Ic size={18} color={m.c} />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: C.text, fontFamily: TYPO.body600, fontSize: 12.5, textAlign: 'center' }}>{m.t}</Text>
                    <Text style={{ color: C.text3, fontFamily: TYPO.body400, fontSize: 10.5, textAlign: 'center', marginTop: 2, maxWidth: 150, lineHeight: 15 }}>{m.d}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Alumni Showcase (3D cards) ───────────────────────────────────────── */
const ALUMNI = [
  { n: 'Rahul S.', r: 'Senior SDE @ Google', sk: ['Python', 'System Design', 'Mentoring'], c: C.primary },
  { n: 'Priya P.', r: 'Product @ Amazon', sk: ['Strategy', 'Analytics', 'Leadership'], c: C.secondary },
  { n: 'Arjun M.', r: 'Data Science @ Microsoft', sk: ['ML', 'Stats', 'Python'], c: C.accent },
];

function AlumniShowcase({ desk }: { desk: boolean }) {
  const { ref, visible, revealStyle } = useScrollReveal({ threshold: 0.1, direction: 'up' });
  return (
    <View ref={ref as any} style={[revealStyle, { paddingHorizontal: 24, marginTop: 52, marginBottom: 12 }]}>
      <View style={{ maxWidth: 1300, width: '100%', alignSelf: 'center' }}>
        <Text style={sec.badge}>Alumni network</Text>
        <Text style={sec.h2}>Meet your mentors</Text>
        <Text style={sec.p}>Verified alumni from top companies ready to guide you.</Text>
        <View style={{ flexDirection: desk ? 'row' : 'column', gap: 12, marginTop: 24 }}>
          {ALUMNI.map((m, i) => (
            <View key={m.n} style={{ flex: 1, padding: 20, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)', boxShadow: C.shadow, transition: 'all 0.35s cubic-bezier(.23,1,.32,1), opacity 0.5s ease, transform 0.5s ease', transformStyle: 'preserve-3d', cursor: 'pointer', transitionDelay: `${i * 0.12}s`, opacity: visible ? 1 : 0, transform: visible ? [] : [{ translateY: 20 }] } : {}) } as any}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: m.c + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: m.c, fontFamily: TYPO.body700, fontSize: 16 }}>{m.n[0]}</Text>
                </View>
                <View><Text style={{ color: C.text, fontFamily: TYPO.body600, fontSize: 13 }}>{m.n}</Text><Text style={{ color: C.text2, fontFamily: TYPO.body500, fontSize: 11 }}>{m.r}</Text></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
                {m.sk.map(s => (
                  <View key={s} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, backgroundColor: m.c + '10', borderWidth: 1, borderColor: m.c + '15' }}>
                    <Text style={{ color: m.c + 'cc', fontFamily: TYPO.body500, fontSize: 9.5 }}>{s}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent }} />
                  <Text style={{ color: C.text3, fontFamily: TYPO.body500, fontSize: 10 }}>Available this week</Text>
                </View>
                <Pressable style={({ hovered }: any) => [{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: m.c }, hovered && { opacity: 0.9 }]}>
                  <Text style={{ color: '#fff', fontFamily: TYPO.body700, fontSize: 10.5 }}>Book session</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Success Stories Carousel ─────────────────────────────────────────── */
const STORIES = [
  { n: 'Aanya R.', r: 'BTech CS · NIT Trichy', p: 'Google', s: '24 LPA', q: 'Agent K wrote my entire internship application list. I got 6 callbacks in week one. The mentorship network is unreal.', c: C.primary },
  { n: 'Karthik M.', r: 'MBA · IIM Bangalore', p: 'McKinsey', s: '35 LPA', q: 'A 45-minute call with an alumnus was worth more than a semester of generic career counseling.', c: C.secondary },
  { n: 'Reema S.', r: 'Final Year · DTU Delhi', p: 'Microsoft', s: '28 LPA', q: 'The wallet covered 4 SaaS subscriptions. But honestly, the mentor matching is the killer feature.', c: C.accent },
];

function SuccessCarousel() {
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useCallback(() => { if (timer.current) clearInterval(timer.current); timer.current = setInterval(() => setActive(c => (c + 1) % STORIES.length), 5000); }, []);
  useEffect(() => { start(); return () => { if (timer.current) clearInterval(timer.current); }; }, [start]);
  const s = STORIES[active];

  return (
    <View style={{ paddingHorizontal: 24, marginTop: 52, marginBottom: 12 }}>
      <View style={{ maxWidth: 960, width: '100%', alignSelf: 'center' }}>
        <Text style={sec.badge}>Student success</Text>
        <Text style={sec.h2}>Real outcomes from real students</Text>
        <View style={{ marginTop: 24, padding: 28, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}) } as any}>
          <View style={{ flexDirection: 'row', gap: 2, marginBottom: 14 }}>{[0,1,2,3,4].map(s => <Text key={s} style={{ color: '#FBBF24', fontSize: 14 }}>★</Text>)}</View>
          <Text style={{ color: C.text2, fontFamily: TYPO.body400, fontSize: 15, lineHeight: 24, marginBottom: 18 }}>{`\u201C${s.q}\u201D`}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: s.c + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: s.c, fontFamily: TYPO.body700, fontSize: 14 }}>{s.n[0]}</Text>
              </View>
              <View>
                <Text style={{ color: C.text, fontFamily: TYPO.body600, fontSize: 13 }}>{s.n}</Text>
                <Text style={{ color: C.text3, fontFamily: TYPO.body500, fontSize: 11 }}>{s.r}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: s.c, fontFamily: TYPO.mono700, fontSize: 18 }}>{s.s}</Text>
              <Text style={{ color: C.text3, fontFamily: TYPO.body500, fontSize: 10 }}>at {s.p}</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {STORIES.map((_, i) => (
            <Pressable key={i} onPress={() => { setActive(i); start(); }} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === active ? C.primary : C.text4, transition: 'all 0.3s ease' } as any} />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── AI Chat Section ──────────────────────────────────────────────────── */
function AIChatSection() {
  const { ref, revealStyle } = useScrollReveal({ threshold: 0.1, direction: 'right' });
  return (
    <View ref={ref as any} style={[revealStyle, { paddingHorizontal: 24, marginTop: 52, marginBottom: 12 }]}>
      <View style={{ maxWidth: 1300, width: '100%', alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 24, padding: 32, borderRadius: 18, borderWidth: 1, borderColor: C.borderH, backgroundColor: C.primaryS, ...(Platform.OS === 'web' ? { boxShadow: '0 0 60px rgba(139,92,246,0.06)' } : {}) } as any}>
        <View style={{ flex: 1, minWidth: 260, gap: 14 }}>
          <Text style={sec.badge}>AI Career Copilot</Text>
          <Text style={[sec.h2, { fontSize: 26 }]}>Meet Agent K{'\n'}<Text style={{ color: C.accent }}>your career AI.</Text></Text>
          <Text style={[sec.p, { maxWidth: 480 }]}>
            Agent K learns your profile, tracks industry trends, and delivers weekly career briefs — so you never miss an opportunity.
          </Text>
          <View style={{ gap: 10, marginTop: 4 }}>
            {[
              { l: 'Weekly career briefs tailored to your domain', c: C.accent },
              { l: 'AI-powered resume edits with score tracking', c: C.primary },
              { l: 'Smart mentor matching based on your goals', c: C.secondary },
              { l: 'Proactive alerts for jobs and events', c: C.amber },
            ].map(f => (
              <View key={f.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: f.c + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: f.c, fontSize: 10, fontFamily: TYPO.body700 }}>✓</Text>
                </View>
                <Text style={{ color: C.text2, fontFamily: TYPO.body500, fontSize: 12 }}>{f.l}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 260, minHeight: 280 }}>
          <Svg width="100%" height="100%" viewBox="0 0 460 300">
            <Defs>
              <LinearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="rgba(16,185,129,0.15)" />
                <Stop offset="1" stopColor="rgba(16,185,129,0.02)" />
              </LinearGradient>
            </Defs>
            <Rect width="460" height="300" rx="16" fill={C.bg2} stroke={C.border} strokeWidth="1" />
            <Rect width="460" height="300" rx="16" fill="url(#chatGrad)" />
            <Rect x="16" y="12" width="428" height="28" rx="8" fill="rgba(255,255,255,0.03)" />
            <Circle cx="30" cy="26" r="3.5" fill="#EF4444" /><Circle cx="44" cy="26" r="3.5" fill="#F59E0B" /><Circle cx="58" cy="26" r="3.5" fill="#22C55E" />
            <Rect x="18" y="50" width="120" height="24" rx="6" fill={C.accentS} stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
            <SvgText x="26" y="66" fill={C.accent} fontFamily="PlusJakartaSans_700Bold" fontSize="9.5">Agent K · Online</SvgText>
            {/* Chat bubbles */}
            <Rect x="20" y="84" width="220" height="36" rx="10" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.15)" strokeWidth="1" />
            <SvgText x="32" y="107" fill={C.accent} fontFamily="PlusJakartaSans_500Medium" fontSize="10">Hey! Here's your weekly brief ✦</SvgText>
            <Rect x={240} y="128" width="160" height="36" rx="10" fill={C.primaryS} stroke={C.borderH} strokeWidth="1" />
            <SvgText x={252} y={152} fill={C.text} fontFamily="PlusJakartaSans_500Medium" fontSize="10">Show me opportunities →</SvgText>
            <Rect x="20" y="172" width="300" height="60" rx="10" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.12)" strokeWidth="1" />
            <SvgText x="32" y={192} fill={C.accent} fontFamily="PlusJakartaSans_600SemiBold" fontSize="10.5">Top matches this week</SvgText>
            <SvgText x="32" y={210} fill={C.text2} fontFamily="PlusJakartaSans_500Medium" fontSize="9">Google · Microsoft · Razorpay · Amazon</SvgText>
            <SvgText x="32" y={224} fill={C.text3} fontFamily="PlusJakartaSans_500Medium" fontSize="8">Resume score: 84/100 (+12%)</SvgText>
            <Rect x="20" y="244" width="420" height="32" rx="8" fill="rgba(255,255,255,0.02)" stroke={C.border} strokeWidth="1" />
            <SvgText x="32" y={265} fill={C.text3} fontFamily="PlusJakartaSans_500Medium" fontSize="9.5">Ask me anything about your career...</SvgText>
          </Svg>
        </View>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── FAQ ─────────────────────────────────────────────────────────────── */
const FAQS = [
  { q: 'Is StudentAlumni free?', a: 'Yes — completely free for students. Premium AI integration (bring your own API key) and analytics dashboards are available as optional upgrades.' },
  { q: 'How do I find a mentor?', a: 'Use the Mentor Network to search by company, role, or college. Send a connection request with your goals and book a session once accepted.' },
  { q: 'How does Agent K work?', a: 'Agent K is your AI career copilot. Connect your own API key (OpenAI, Anthropic, or Gemini) and get weekly career briefs, resume edits, and personalized recommendations.' },
  { q: 'Can alumni benefit too?', a: 'Absolutely. Alumni can mentor students, host events, post job openings, grow their professional network, and give back to their alma mater.' },
  { q: 'What kind of events are on the platform?', a: 'Hackathons, webinars, study circles, alumni meetups, resume workshops, and career fairs — both online and on-campus across 100+ institutions.' },
  { q: 'How is my data protected?', a: 'We use end-to-end encryption for sessions, SOC 2 compliant infrastructure, and never share your data without consent.' },
];

function FAQSection() {
  const { ref, revealStyle } = useScrollReveal({ threshold: 0.08, direction: 'up' });
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View ref={ref as any} style={[revealStyle, { paddingHorizontal: 24, marginTop: 52, marginBottom: 12 }]}>
      <View style={{ maxWidth: 960, width: '100%', alignSelf: 'center' }}>
        <Text style={sec.badge}>Common questions</Text>
        <Text style={sec.h2}>Everything you need to know</Text>
        <Text style={[sec.p, { marginBottom: 20 }]}>Can't find what you're looking for? Email us at hello@studentalumni.in</Text>
        <View style={{ gap: 6 }}>
          {FAQS.map((f, i) => (
            <View key={i} style={{ borderRadius: 10, borderWidth: 1, borderColor: open === i ? C.borderH : C.border, backgroundColor: C.card, overflow: 'hidden', ...(Platform.OS === 'web' ? { transition: 'all 0.3s ease' } : {}) } as any}>
              <Pressable onPress={() => setOpen(open === i ? null : i)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
                <Text style={{ color: C.text, fontFamily: TYPO.body600, fontSize: 12.5, flex: 1 }}>{f.q}</Text>
                <View style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: open === i ? C.primaryS : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: open === i ? C.primary : C.text3, fontSize: 14, fontFamily: TYPO.body600 }}>{open === i ? '−' : '+'}</Text>
                </View>
              </Pressable>
              {open === i && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, ...(Platform.OS === 'web' ? { animationName: 'saSlideUp', animationDuration: '0.3s' } : {}) } as any}>
                  <View style={{ height: 1, backgroundColor: C.border, marginBottom: 10 }} />
                  <Text style={{ color: C.text2, fontFamily: TYPO.body400, fontSize: 12, lineHeight: 18 }}>{f.a}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── CTA ─────────────────────────────────────────────────────────────── */
function CTASection({ router, desk }: { router: any; desk: boolean }) {
  const { ref, revealStyle } = useScrollReveal({ threshold: 0.12, direction: 'scale' });
  return (
    <View ref={ref as any} style={[revealStyle, { paddingHorizontal: 24, marginTop: 52, marginBottom: 12 }]}>
      <View style={{ maxWidth: 1200, width: '100%', alignSelf: 'center', padding: desk ? 48 : 32, borderRadius: 18, borderWidth: 1, borderColor: C.borderH, backgroundColor: C.primaryS, alignItems: 'center', overflow: 'hidden', position: 'relative', ...(Platform.OS === 'web' ? { boxShadow: '0 0 60px rgba(139,92,246,0.06)' } : {}) } as any}>
        {/* Decorative */}
        <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(139,92,246,0.06)', top: -80, right: -60, ...(Platform.OS === 'web' ? { filter: 'blur(40px)' } : {}) } as any} />
        <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(16,185,129,0.04)', bottom: -40, left: -50, ...(Platform.OS === 'web' ? { filter: 'blur(30px)' } : {}) } as any} />
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...(Platform.OS === 'web' ? { animationName: 'saPulse', animationDuration: '2s', animationIterationCount: 'infinite' } : {}) } as any}>
          <Sparkles size={22} color={C.primary} />
        </View>
        <Text style={{ color: C.text, fontFamily: TYPO.display700, fontSize: 28, lineHeight: 34, textAlign: 'center' }}>Ready to grow your network?</Text>
        <Text style={{ color: C.text2, fontFamily: TYPO.body500, fontSize: 13.5, textAlign: 'center', marginTop: 8, maxWidth: 440, lineHeight: 20 }}>Join 12,500+ students and alumni already on the platform. It's free to sign up.</Text>
        <Pressable onPress={() => router.push('/register')} style={({ hovered }: any) => [{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', gap: 8 }, hovered && { backgroundColor: C.primaryD }]}>
          <Text style={{ fontFamily: TYPO.body700, fontSize: 14, color: '#fff' }}>Create your account</Text>
          <ChevronRight size={15} color="#fff" />
        </Pressable>
        <Text style={{ color: C.text3, fontFamily: TYPO.body500, fontSize: 10.5, marginTop: 10 }}>No credit card required · 2-minute signup</Text>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Premium Footer ──────────────────────────────────────────────────── */
function FooterSection() {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 24, paddingVertical: 44, marginTop: 32 }}>
      <View style={{ maxWidth: 1300, width: '100%', alignSelf: 'center', gap: 32 }}>
        {/* Newsletter + Brand */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 14, maxWidth: 380 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={require('@/assets/images/sa-icon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
              <Text style={{ color: C.text, fontFamily: TYPO.display700, fontSize: 14 }}>StudentAlumni</Text>
            </View>
            <Text style={{ color: C.text2, fontFamily: TYPO.body400, fontSize: 12, lineHeight: 18 }}>
              The private career network for India's top students and alumni. AI-powered mentoring, events, internships, and career growth.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[{l:'X'},{l:'Li'},{l:'IG'},{l:'GH'}].map(s => (
                <Pressable key={s.l} style={({ hovered }: any) => [{ width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }, hovered && { borderColor: C.borderH, backgroundColor: C.primaryS }]}>
                  <Text style={{ color: C.text2, fontFamily: TYPO.body600, fontSize: 9 }}>{s.l}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {/* Newsletter */}
          <View style={{ gap: 10, maxWidth: 400 }}>
            <Text style={{ color: C.text, fontFamily: TYPO.body600, fontSize: 13 }}>Stay updated</Text>
            <Text style={{ color: C.text3, fontFamily: TYPO.body500, fontSize: 11 }}>Get weekly career tips, event invites, and alumni stories.</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <Text style={{ color: C.text3, fontFamily: TYPO.body500, fontSize: 11 }}>your@email.com</Text>
              </View>
              <Pressable style={({ hovered }: any) => [{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: C.primary }, hovered && { backgroundColor: C.primaryD }]}>
                <Text style={{ color: '#fff', fontFamily: TYPO.body700, fontSize: 11 }}>Subscribe</Text>
              </Pressable>
            </View>
          </View>
        </View>
        {/* Links */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between' }}>
          <FC h="Platform" l={['Features', 'Agent K', 'Mentors', 'Events', 'Internships']} />
          <FC h="Company" l={['About', 'Careers', 'Blog', 'Press', 'Contact']} />
          <FC h="Legal" l={['Privacy', 'Terms', 'Cookies', 'Refunds']} />
          <FC h="Resources" l={['Help Center', 'Guides', 'API Docs', 'Status']} />
        </View>
        {/* Animated divider */}
        <View style={{ height: 1, backgroundColor: C.border, position: 'relative', overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 0, left: '-50%', width: '100%', height: 1, ...(Platform.OS === 'web' ? { background: 'linear-gradient(90deg,transparent,#8B5CF6,transparent)', animationName: 'saMarquee', animationDuration: '3s', animationIterationCount: 'infinite' } : { backgroundColor: C.primary }) } as any} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Text style={{ color: C.text3, fontFamily: TYPO.body400, fontSize: 11 }}>© 2026 StudentAlumni Pvt. Ltd.</Text>
          <Text style={{ color: C.text3, fontFamily: TYPO.body400, fontSize: 11 }}>Built for India's next generation of leaders.</Text>
        </View>
      </View>
    </View>
  );
}

function FC({ h, l }: { h: string; l: string[] }) {
  return (
    <View style={{ gap: 8, minWidth: 110 }}>
      <Text style={{ color: C.text3, fontFamily: TYPO.body700, fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' }}>{h}</Text>
      {l.map(s => (
        <Pressable key={s} style={({ hovered }: any) => [{ paddingVertical: 2 }, hovered && {}]}>
          <Text style={{ color: C.text2, fontFamily: TYPO.body500, fontSize: 11.5, ...(Platform.OS === 'web' ? { transition: 'color 0.15s ease' } : {}) } as any}>{s}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ── Styles ──────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  counter: { fontFamily: TYPO.mono700, fontSize: 30, color: C.text, letterSpacing: -1.5 },
});

const sec = StyleSheet.create({
  badge: { fontFamily: TYPO.body600, fontSize: 9.5, color: C.primary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  h2: { color: C.text, fontFamily: TYPO.display700, fontSize: 24, letterSpacing: -0.5 },
  p: { color: C.text2, fontFamily: TYPO.body400, fontSize: 13, marginTop: 6, maxWidth: 600, lineHeight: 19 },
});

const nb = StyleSheet.create({
  bar: { backgroundColor: 'rgba(8,11,18,0.85)', borderBottomWidth: 1, borderBottomColor: C.border, width: '100%', zIndex: 50 } as any,
  barSc: { backgroundColor: 'rgba(8,11,18,0.92)', borderBottomColor: C.borderH } as any,
  in: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12, maxWidth: 1400, alignSelf: 'center', width: '100%' },
  br: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brT: { color: C.text, fontFamily: TYPO.display700, fontSize: 14, letterSpacing: -0.2 },
  lk: { flexDirection: 'row', gap: 2 },
  lkI: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 } as any,
  lkT: { fontFamily: TYPO.body500, fontSize: 12 },
  ct: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  si: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 } as any,
  siT: { color: C.text2, fontFamily: TYPO.body600, fontSize: 12 },
  cta: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 7, backgroundColor: C.primary } as any,
  ctaT: { color: '#fff', fontFamily: TYPO.body700, fontSize: 12 },
});

const hro = StyleSheet.create({
  h1: { color: C.text, fontFamily: TYPO.display800 },
  sub: { color: C.text2, fontFamily: TYPO.body400, marginTop: 16, lineHeight: 25, fontSize: 14.5, maxWidth: 520 },
  cr: { flexDirection: 'row', gap: 10, marginTop: 24, flexWrap: 'wrap' },
});
