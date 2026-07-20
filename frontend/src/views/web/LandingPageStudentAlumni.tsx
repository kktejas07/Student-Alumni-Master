/**
 * LandingPageStudentAlumni — Marketing landing page using the FinTax360 Jewel &
 * Luxury Glassmorphism theme, with a cinematic motion layer on top: a
 * three.js "alumni graph" hero scene, scroll-triggered reveals, magnetic
 * CTAs, a scroll-aware navbar, a bento feature grid with spotlight/tilt
 * hover, and an auto-scrolling testimonial marquee. Web-only.
 *
 * Sections:
 *   1. Sticky glass navbar (scroll-aware blur + top progress bar)
 *   2. Hero (three.js network backdrop, split-text headline, magnetic CTAs, live counters)
 *   3. Feature pillars (asymmetric bento grid, tilt + cursor-spotlight cards)
 *   4. How it works (3 numbered glass steps + animated connector)
 *   5. Testimonials (auto-scrolling marquee, pause on hover)
 *   6. Stats strip (4 hero numerics that count up on scroll-into-view)
 *   7. CTA banner (violet gradient pill block, magnetic CTA)
 *   8. Footer (glass dark, links, social, brand)
 *
 * Theme contract: re-uses FinTax360 primitives from /views/web/portals/student.
 * NEVER applies to any other portal — landing page is "neutral surface" that
 * happens to inherit the student dark-glass look as the brand identity.
 */
import React from 'react';
import {
  View, Text, StyleSheet, Pressable,
  useWindowDimensions, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import ReanimatedNS, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation,
  withTiming, Easing,
} from 'react-native-reanimated';
import {
  ArrowRight, Sparkles, Users, Calendar, Briefcase, Wallet,
  Mail, ChevronRight, Star, MessageSquare,
} from 'lucide-react-native';

import {
  FadeInView, PressScale, ParallaxCard, ShimmerGradient,
  RevealOnScroll, RevealStagger, MagneticButton, CursorSpotlight,
  SplitHeadline, AnimatedCounter, useInView, useReducedMotion,
} from '@/src/views/web/portals/student/motion';
import {
  AnimatedAurora, GridOverlay, GlassCard, AiCopilotFab, StatusChip, Kicker,
} from '@/src/views/web/portals/student/glass';
import { PALETTE, TYPO } from '@/src/views/web/portals/student/tokens';
import { SponsorStrip } from '@/src/views/web/components/SponsorStrip';
import NetworkScene from '@/src/views/web/portals/student/NetworkScene';

// ─────────────────────────────────────────────────────────────────────────
// CUSTOM BRAND SVG ICONS
// (lucide-react-native v0.x dropped brand logos, so we ship them inline.
//  Paths are the official simple-icons spec — single-color, 24x24 viewbox.)
// ─────────────────────────────────────────────────────────────────────────
type BrandIconProps = { size?: number; color?: string };

function XIcon({ size = 14, color = '#fff' }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        fill={color}
      />
    </Svg>
  );
}

function LinkedInIcon({ size = 14, color = '#fff' }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.268 2.37 4.268 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.064 2.063 2.063 0 112.063 2.064zm1.778 13.019H3.555V9h3.56v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        fill={color}
      />
    </Svg>
  );
}

function InstagramIcon({ size = 14, color = '#fff' }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
        fill={color}
      />
    </Svg>
  );
}

function GitHubIcon({ size = 14, color = '#fff' }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
        fill={color}
      />
    </Svg>
  );
}

function MailIcon({ size = 14, color = '#fff' }: BrandIconProps) {
  return <Mail size={size} color={color} strokeWidth={1.6} />;
}

// ─────────────────────────────────────────────────────────────────────────
// LANDING PAGE ROOT
// ─────────────────────────────────────────────────────────────────────────
export default function LandingPageStudentAlumni() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  const scrollY = useSharedValue(0);
  const scrollProgress = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    const maxScroll = Math.max(1, (event.contentSize?.height || 0) - (event.layoutMeasurement?.height || 0));
    scrollProgress.value = Math.min(1, Math.max(0, event.contentOffset.y / maxScroll));
  });
  const progressStyle = useAnimatedStyle(() => ({ width: `${scrollProgress.value * 100}%` as any }));

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.bg0 }}>
      {/* Body gradient + animated aurora + grid */}
      <LinearGradient
        colors={[PALETTE.bg0, PALETTE.bg2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
        pointerEvents="none"
      />
      <AnimatedAurora intensity="normal" />
      <GridOverlay />
      <CursorSpotlight />

      <ReanimatedNS.ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 0 }}
      >
        <Navbar isDesktop={isDesktop} router={router} scrollY={scrollY} progressStyle={progressStyle} />

        <Hero isDesktop={isDesktop} router={router} />

        <FeaturePillars isDesktop={isDesktop} isTablet={isTablet} />

        {/* Sponsored Collaboration Partners — manually curated from Super Admin.
            Hides automatically when no active partners exist. */}
        <SponsorStrip variant="section" />

        <HowItWorks isDesktop={isDesktop} />

        <StatsStrip isDesktop={isDesktop} />

        <Testimonials isDesktop={isDesktop} />

        <CTABanner router={router} />

        <Footer isDesktop={isDesktop} />
      </ReanimatedNS.ScrollView>

      {/* Persistent floating Agent K access — visible on landing too */}
      <AiCopilotFab onPress={() => router.push('/login')} label="Try Agent K" />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 1. NAVBAR — scroll-aware glass + top progress bar
// ─────────────────────────────────────────────────────────────────────────
function Navbar({ isDesktop, router, scrollY, progressStyle }: {
  isDesktop: boolean; router: ReturnType<typeof useRouter>; scrollY: any; progressStyle: any;
}) {
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(10,15,30,${interpolate(scrollY.value, [0, 80], [0.35, 0.85], Extrapolation.CLAMP)})`,
    borderBottomColor: `rgba(255,255,255,${interpolate(scrollY.value, [0, 80], [0.02, 0.08], Extrapolation.CLAMP)})`,
  }));

  return (
    <ReanimatedNS.View style={[nav.bar, bgStyle, Platform.OS === 'web' && ({
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    } as any)]}>
      <View style={[nav.inner, { maxWidth: 1280 }]}>
        <Pressable onPress={() => router.push('/')} style={nav.brand}>
          <View style={nav.logoMark}>
            <Sparkles size={18} color="#fff" />
          </View>
          <Text style={nav.brandText}>StudentAlumni</Text>
        </Pressable>

        {isDesktop && (
          <View style={nav.links}>
            <NavLink label="Features" />
            <NavLink label="Mentors" />
            <NavLink label="Events" />
            <NavLink label="Pricing" />
            <NavLink label="Blog" />
          </View>
        )}

        <View style={nav.ctas}>
          <Pressable onPress={() => router.push('/login')} style={nav.signin}>
            <Text style={nav.signinText}>Sign in</Text>
          </Pressable>
          <MagneticButton onPress={() => router.push('/register')} strength={8} scaleOnHover={1.04}>
            <LinearGradient
              colors={[PALETTE.violet, PALETTE.violetD]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={nav.cta}
            >
              <Text style={nav.ctaText}>Get Started</Text>
              <ArrowRight size={14} color="#fff" />
            </LinearGradient>
          </MagneticButton>
        </View>
      </View>

      {/* Scroll progress hairline */}
      <View style={nav.progressTrack} pointerEvents="none">
        <ReanimatedNS.View style={[nav.progressFill, progressStyle]} />
      </View>
    </ReanimatedNS.View>
  );
}

function NavLink({ label }: { label: string }) {
  return (
    <View style={nav.linkWrap}>
      <Text style={nav.link}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 2. HERO — three.js network backdrop + split-text headline + live counters
// ─────────────────────────────────────────────────────────────────────────
function Hero({ isDesktop, router }: { isDesktop: boolean; router: ReturnType<typeof useRouter> }) {
  return (
    <View style={[hero.section, { paddingTop: isDesktop ? 132 : 100, paddingBottom: 88 }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <NetworkScene intensity={isDesktop ? 1 : 0.7} />
      </View>
      <ShimmerGradient colors={[PALETTE.violet, PALETTE.blue, PALETTE.teal]} style={hero.heroGlow} />

      <RevealOnScroll distance={16} duration={600} style={{ alignItems: 'center', maxWidth: 920 }}>
        <View style={hero.pill}>
          <View style={hero.pillDot} />
          <Text style={hero.pillText}>AI-backed student success network</Text>
        </View>

        <SplitHeadline
          text="A private career network for"
          baseDelay={140}
          gap={55}
          style={[hero.headline, { fontSize: isDesktop ? 72 : 44, lineHeight: isDesktop ? 76 : 50 }]}
        />
        <SplitHeadline
          text="students and alumni."
          baseDelay={480}
          gap={65}
          style={[hero.headline, { fontSize: isDesktop ? 72 : 44, lineHeight: isDesktop ? 76 : 50, marginTop: isDesktop ? -6 : -2 }]}
          wordStyle={hero.headlineGradient}
        />

        <Text style={[hero.sub, { maxWidth: 720, fontSize: isDesktop ? 18 : 16 }]}>
          Mentors, internships, events and AI coaching — built to help you launch faster, learn smarter and stay connected.
        </Text>

        <View style={hero.ctaRow}>
          <MagneticButton onPress={() => router.push('/register')} style={hero.ctaPrimary} strength={14}>
            <LinearGradient
              colors={[PALETTE.violet, PALETTE.violetD]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={hero.ctaPrimaryInner}
            >
              <Text style={hero.ctaPrimaryText}>Start free</Text>
              <ArrowRight size={16} color="#fff" />
            </LinearGradient>
          </MagneticButton>
          <MagneticButton onPress={() => router.push('/login')} style={hero.ctaSecondary} strength={10}>
            <Text style={hero.ctaSecondaryText}>Explore mentors</Text>
            <ChevronRight size={14} color="rgba(255,255,255,0.88)" />
          </MagneticButton>
        </View>

        <View style={[hero.trust, { flexDirection: isDesktop ? 'row' : 'column' }]}>
          <TrustCounter target={12500} suffix="+" v="students onboarded" />
          <TrustDot show={isDesktop} />
          <TrustCounter target={850} suffix="+" v="verified mentors" />
          <TrustDot show={isDesktop} />
          <TrustCounter target={200} suffix="+" v="events / year" />
          <TrustDot show={isDesktop} />
          <TrustItem k="4.9/5" v="avg. session rating" />
        </View>
      </RevealOnScroll>
    </View>
  );
}
function TrustCounter({ target, suffix = '', v }: { target: number; suffix?: string; v: string }) {
  const [ref, inView] = useInView(0.4);
  return (
    <View ref={ref} style={{ alignItems: 'center' }}>
      <AnimatedCounter
        value={inView ? target : 0}
        suffix={suffix}
        duration={1400}
        style={{ fontFamily: TYPO.mono600, fontSize: 22, color: '#fff', letterSpacing: -0.5 }}
      />
      <Text style={{ fontFamily: TYPO.body500, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2, letterSpacing: 0.3 }}>{v}</Text>
    </View>
  );
}
function TrustItem({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: TYPO.mono600, fontSize: 22, color: '#fff', letterSpacing: -0.5 }}>{k}</Text>
      <Text style={{ fontFamily: TYPO.body500, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2, letterSpacing: 0.3 }}>{v}</Text>
    </View>
  );
}
function TrustDot({ show }: { show: boolean }) {
  if (!show) return <View style={{ height: 14 }} />;
  return <View style={{ width: 4, height: 4, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.20)' }} />;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. FEATURE PILLARS — asymmetric bento grid, tilt + spotlight hover
// ─────────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Sparkles,      tone: PALETTE.violet, kicker: 'Agent K',       title: 'AI career copilot',   body: 'Weekly career briefs, resume polish, interview questions and action steps tailored to your goals.', big: true },
  { icon: Users,         tone: '#3B82F6',      kicker: 'Network',       title: 'Alumni graph',        body: 'Find verified alumni by college, company or role.' },
  { icon: MessageSquare, tone: '#10B981',      kicker: 'Mentor sessions', title: '1-on-1 guidance',    body: 'Book sessions, keep notes, turn conversations into next steps.' },
  { icon: Calendar,      tone: '#F59E0B',      kicker: 'Events',        title: 'Campus experiences',  body: 'Hackathons, workshops and career fairs matched to your interests.' },
  { icon: Briefcase,     tone: '#A78BFA',      kicker: 'Opportunities', title: 'Internships & jobs',  body: 'Curated roles filtered by major, year and target company.' },
  { icon: Wallet,        tone: '#22D3EE',      kicker: 'Wallet',        title: 'Student benefits',    body: 'Scholarships, discounts and referral credits for your journey.' },
];

const BENTO_SPANS = [
  { gridColumn: '1 / span 4', gridRow: '1 / span 2' },
  { gridColumn: '5 / span 2', gridRow: '1 / span 1' },
  { gridColumn: '5 / span 2', gridRow: '2 / span 1' },
  { gridColumn: '1 / span 2', gridRow: '3 / span 1' },
  { gridColumn: '3 / span 2', gridRow: '3 / span 1' },
  { gridColumn: '5 / span 2', gridRow: '3 / span 1' },
];

function FeaturePillars({ isDesktop, isTablet }: { isDesktop: boolean; isTablet: boolean }) {
  const useBento = isDesktop && Platform.OS === 'web';
  const cols = isDesktop ? 3 : isTablet ? 2 : 1;
  const gap = 20;
  const cardW = `${100 / cols}%` as any;

  return (
    <Section
      kicker="What you can do"
      title="Everything students need in one platform"
      sub="Move faster with networked mentorship, verified opportunities, and AI guidance across your campus journey."
    >
      {useBento ? (
        <View
          // @ts-ignore — web-only CSS grid
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridAutoRows: 168,
            gap,
            marginTop: 32,
          }}
        >
          {FEATURES.map((f, idx) => (
            // @ts-ignore
            <View key={f.title} style={BENTO_SPANS[idx]}>
              <RevealOnScroll delay={idx * 70} distance={20} style={{ height: '100%' }}>
                <BentoCard tone={f.tone} big={f.big}>
                  <View style={[feat.iconWrap, f.big && { width: 52, height: 52, borderRadius: 14 }, { backgroundColor: f.tone + '18', borderColor: f.tone + '35' }]}>
                    <f.icon size={f.big ? 24 : 20} color={f.tone} />
                  </View>
                  <Kicker color={f.tone}>{f.kicker}</Kicker>
                  <Text style={[feat.title, f.big && { fontSize: 24, lineHeight: 28, marginTop: 4 }]}>{f.title}</Text>
                  <Text style={[feat.body, f.big && { fontSize: 15, lineHeight: 22, maxWidth: 420 }]}>{f.body}</Text>
                </BentoCard>
              </RevealOnScroll>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2, marginTop: 32 }}>
          {FEATURES.map((f, idx) => (
            <ParallaxCard key={f.title} style={{ width: cardW, padding: gap / 2 }}>
              <GlassCard delay={idx * 60} radius={18} padding={22} style={{ minHeight: 220, gap: 12 }}>
                <View style={[feat.iconWrap, { backgroundColor: f.tone + '18', borderColor: f.tone + '35' }]}>
                  <f.icon size={20} color={f.tone} />
                </View>
                <Kicker color={f.tone}>{f.kicker}</Kicker>
                <Text style={feat.title}>{f.title}</Text>
                <Text style={feat.body}>{f.body}</Text>
              </GlassCard>
            </ParallaxCard>
          ))}
        </View>
      )}
    </Section>
  );
}

/* Tilt + cursor-spotlight card used by the desktop bento grid (web only). */
function BentoCard({ children, tone, big }: { children: React.ReactNode; tone: string; big?: boolean }) {
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const mx = useSharedValue(50);
  const my = useSharedValue(50);
  const glow = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 } as any,
      { rotateX: `${rx.value}deg` } as any,
      { rotateY: `${ry.value}deg` } as any,
    ],
  }));
  const spotStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    // @ts-ignore — web-only CSS
    background: `radial-gradient(360px circle at ${mx.value}% ${my.value}%, ${tone}22, transparent 70%)`,
  }));

  return (
    <ReanimatedNS.View
      style={[
        cardStyle,
        { height: '100%', width: '100%' },
        Platform.OS === 'web' ? ({ transformStyle: 'preserve-3d' } as any) : null,
      ]}
      // @ts-ignore — web-only pointer events
      onMouseMove={Platform.OS === 'web' ? (e: any) => {
        const r = e.currentTarget.getBoundingClientRect?.();
        if (!r) return;
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        rx.value = (0.5 - py) * 7;
        ry.value = (px - 0.5) * 9;
        mx.value = px * 100;
        my.value = py * 100;
        glow.value = 1;
      } : undefined}
      // @ts-ignore
      onMouseLeave={Platform.OS === 'web' ? () => { rx.value = 0; ry.value = 0; glow.value = 0; } : undefined}
    >
      <GlassCard radius={20} padding={big ? 26 : 22} style={{ height: '100%', gap: 10 }}>
        <ReanimatedNS.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, spotStyle]} />
        {children}
      </GlassCard>
    </ReanimatedNS.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 4. HOW IT WORKS — 3 numbered glass steps + animated connector
// ─────────────────────────────────────────────────────────────────────────
const STEPS = [
  { n: '01', title: 'Sign up & verify',    body: 'Email verification, college identity check and one-tap onboarding. Get a referral code from a friend? Apply it for instant credits.' },
  { n: '02', title: 'Discover your graph', body: 'Browse alumni, mentors and peers from your college or domain. Bookmark events, save internships, schedule 1-on-1s.' },
  { n: '03', title: 'Activate Agent K',    body: 'Plug in your AI key (Claude / GPT / Gemini), and Agent K writes you weekly career briefs, resume edits and scheduled automations.' },
];

function HowItWorks({ isDesktop }: { isDesktop: boolean }) {
  const [trackRef, inView] = useInView(0.3);
  const fill = useSharedValue(0);
  React.useEffect(() => {
    if (inView) fill.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [inView, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` as any }));

  return (
    <Section
      kicker="How it works"
      title="Three steps. Lifetime value."
      sub="The flow is intentionally simple — we let the depth come from the data, not the UI."
    >
      {isDesktop && Platform.OS === 'web' && (
        <View ref={trackRef} style={how.connectorTrack}>
          <ReanimatedNS.View style={[how.connectorFill, fillStyle]} />
        </View>
      )}
      <ReanimatedNS.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          flexGrow: 1,
          gap: 20,
          paddingTop: 12,
          paddingBottom: 12,
          paddingHorizontal: Platform.OS === 'web' ? 0 : 20,
        }}
        style={{ marginTop: 20, marginBottom: -12 }}
      >
        {STEPS.map((s, idx) => (
          <RevealOnScroll key={s.n} delay={idx * 110} distance={22} style={{ flex: 1, minWidth: isDesktop ? 300 : 280 }}>
            <ParallaxCard intensity={4}>
              <GlassCard radius={16} padding={24} style={{ gap: 12, position: 'relative' }}>
                <Text style={how.bigNum}>{s.n}</Text>
                <Text style={how.title}>{s.title}</Text>
                <Text style={how.body}>{s.body}</Text>
                <View style={how.line} />
              </GlassCard>
            </ParallaxCard>
          </RevealOnScroll>
        ))}
      </ReanimatedNS.ScrollView>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 5. STATS STRIP — 4 large numerics, count up on scroll-into-view
// ─────────────────────────────────────────────────────────────────────────
const STATS = [
  { target: 12500, suffix: '+', label: 'Active students' },
  { target: 850,   suffix: '+', label: 'Verified mentors' },
  { target: 4200,  suffix: '+', label: 'Sessions completed' },
  { target: 42,    label: 'Scholarships unlocked', format: (n: number) => `₹${(n / 10).toFixed(1)} Cr` },
];

function StatsStrip({ isDesktop }: { isDesktop: boolean }) {
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 40 }}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <RevealOnScroll distance={20}>
          <GlassCard radius={20} padding={isDesktop ? 36 : 24} strong glow>
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 28 }}>
              {STATS.map((s, idx) => (
                <StatTile key={s.label} {...s} delay={idx * 100} isDesktop={isDesktop} />
              ))}
            </View>
          </GlassCard>
        </RevealOnScroll>
      </View>
    </View>
  );
}
function StatTile({ target, suffix, label, format, delay, isDesktop }: {
  target: number; suffix?: string; label: string; format?: (n: number) => string; delay: number; isDesktop: boolean;
}) {
  const [ref, inView] = useInView(0.4);
  return (
    <FadeInView delay={delay} style={{ flex: 1, alignItems: isDesktop ? 'flex-start' : 'center' }}>
      <View ref={ref}>
        <AnimatedCounter
          value={inView ? target : 0}
          suffix={suffix}
          format={format}
          duration={1500}
          style={stats.num}
        />
        <Text style={stats.label}>{label}</Text>
      </View>
    </FadeInView>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 6. TESTIMONIALS — auto-scrolling marquee, pause on hover
// ─────────────────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Aanya R.',   role: 'BTech CS, 3rd year',  quote: 'Agent K wrote my entire intern application list, ranked by fit. I got 6 callbacks in week one.', tone: PALETTE.violet, avatar: 'A' },
  { name: 'Karthik M.', role: 'MBA, IIM Bangalore', quote: 'Booked a 45-min call with an alumnus at McKinsey. Worth more than a semester of generic career counseling.', tone: '#10B981', avatar: 'K' },
  { name: 'Reema S.',   role: 'Final year, NIT Trichy', quote: 'The wallet alone covered 4 SaaS subscriptions for my hackathon team. The mentor network is the cherry on top.', tone: '#F59E0B', avatar: 'R' },
];

function Testimonials({ isDesktop }: { isDesktop: boolean }) {
  const card = (t: typeof TESTIMONIALS[number]) => (
    <GlassCard radius={16} padding={22} style={{ width: isDesktop ? 340 : 280, gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} color="#FBBF24" fill="#FBBF24" />)}
      </View>
      <Text style={testi.quote}>{`“${t.quote}”`}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <View style={[testi.avatar, { backgroundColor: t.tone }]}>
          <Text style={{ color: '#fff', fontFamily: TYPO.display700 }}>{t.avatar}</Text>
        </View>
        <View>
          <Text style={testi.name}>{t.name}</Text>
          <Text style={testi.role}>{t.role}</Text>
        </View>
      </View>
    </GlassCard>
  );

  return (
    <Section
      kicker="What students say"
      title="Built on real outcomes"
      sub="Verified reviews from students who shipped something — internships, fellowships, hackathon wins."
    >
      <View style={{ marginTop: 20 }}>
        <MarqueeRow items={TESTIMONIALS} renderItem={card} duration={30} />
      </View>
    </Section>
  );
}

/* Seamless auto-scroll row. Web: CSS keyframe animation, paused on hover.
   Native / no-JS fallback: static row (page never actually mounts on native). */
function MarqueeRow({ items, renderItem, duration = 30, gap = 20 }: {
  items: any[]; renderItem: (item: any) => React.ReactNode; duration?: number; gap?: number;
}) {
  const [hovered, setHovered] = React.useState(false);
  const reduced = useReducedMotion();

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flexDirection: 'row', gap, flexWrap: 'wrap', justifyContent: 'center' }}>
        {items.map((it, i) => <React.Fragment key={i}>{renderItem(it)}</React.Fragment>)}
      </View>
    );
  }

  const doubled = [...items, ...items];

  return (
    <View
      // @ts-ignore — web-only
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ overflow: 'hidden', width: '100%', paddingVertical: 4 }}
    >
      {/* @ts-ignore — web-only inline keyframes, matches AnimatedAurora pattern */}
      <style>{`@keyframes saMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <View
        style={[
          { flexDirection: 'row', gap, width: 'max-content' as any },
          !reduced ? ({
            animationName: 'saMarquee',
            animationDuration: `${duration}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationPlayState: hovered ? 'paused' : 'running',
          } as any) : {},
        ]}
      >
        {doubled.map((it, i) => <React.Fragment key={i}>{renderItem(it)}</React.Fragment>)}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 7. CTA BANNER
// ─────────────────────────────────────────────────────────────────────────
function CTABanner({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 80, marginBottom: 80 }}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <RevealOnScroll distance={24}>
          <LinearGradient
            colors={['rgba(139,92,246,0.20)', 'rgba(59,130,246,0.20)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={cta.banner}
          >
            <View pointerEvents="none" style={cta.glow} />
            <Kicker color="rgba(167,139,250,0.9)">Launch with confidence</Kicker>
            <Text style={cta.headline}>Get mentors, AI guidance and student opportunities in one place.</Text>
            <Text style={cta.sub}>
              Join StudentAlumni today — free for students, no card required, and built for every step of your career journey.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
              <MagneticButton onPress={() => router.push('/register')} style={cta.btnWrap} strength={14}>
                <LinearGradient
                  colors={[PALETTE.violet, PALETTE.violetD]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={cta.btn}
                >
                  <Text style={cta.btnText}>Start free</Text>
                  <ArrowRight size={16} color="#fff" />
                </LinearGradient>
              </MagneticButton>
              <MagneticButton onPress={() => router.push('/login')} style={cta.ghost} strength={10}>
                <Text style={cta.ghostText}>Sign in</Text>
              </MagneticButton>
            </View>
          </LinearGradient>
        </RevealOnScroll>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 8. FOOTER
// ─────────────────────────────────────────────────────────────────────────
function Footer({ isDesktop }: { isDesktop: boolean }) {
  return (
    <View style={[footer.wrap, Platform.OS === 'web' && ({
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    } as any)]}>
      <View style={[footer.inner, { maxWidth: 1280 }]}>
        <RevealOnScroll distance={16}>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 40 }}>
            {/* Brand */}
            <View style={{ flex: isDesktop ? 1.4 : undefined, gap: 12 }}>
              <Pressable style={nav.brand}>
                <View style={nav.logoMark}><Sparkles size={18} color="#fff" /></View>
                <Text style={nav.brandText}>StudentAlumni</Text>
              </Pressable>
              <Text style={footer.tag}>
                The private career network for India's top students and alumni.
                Built mobile-first, AI-native, and student-owned.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Social Icon={XIcon}        label="X (Twitter)" />
                <Social Icon={LinkedInIcon} label="LinkedIn" />
                <Social Icon={InstagramIcon} label="Instagram" />
                <Social Icon={GitHubIcon}   label="GitHub" />
                <Social Icon={MailIcon}     label="Email" />
              </View>
            </View>

            {/* Link columns */}
            <FootCol heading="Product" links={['Features', 'Agent K', 'Mentors', 'Events', 'Internships', 'Wallet']} />
            <FootCol heading="Company" links={['About', 'Careers', 'Press', 'Blog', 'Contact']} />
            <FootCol heading="Legal"   links={['Privacy', 'Terms', 'Cookies', 'Refunds', 'Security']} />
          </View>
        </RevealOnScroll>

        <View style={footer.bottomDivider} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <Text style={footer.copy}>© 2026 StudentAlumni Pvt. Ltd. All rights reserved.</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={footer.copy}>v0.19.1</Text>
            <StatusChip tone="success">All systems normal</StatusChip>
          </View>
        </View>
      </View>
    </View>
  );
}

function FootCol({ heading, links }: { heading: string; links: string[] }) {
  return (
    <View style={{ gap: 10, minWidth: 140 }}>
      <Text style={footer.colHead}>{heading}</Text>
      {links.map((l) => (
        <Text key={l} style={[footer.colLink, { paddingVertical: 2 }]}>{l}</Text>
      ))}
    </View>
  );
}

function Social({ Icon, label }: { Icon: React.ComponentType<{ size?: number; color?: string }>; label?: string }) {
  return (
    <View
      accessibilityLabel={label ? `${label} social icon` : 'Social icon'}
      style={footer.social}
    >
      <Icon size={14} color="rgba(255,255,255,0.80)" />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Reusable: <Section /> wrapper with consistent kicker + title + sub
// ─────────────────────────────────────────────────────────────────────────
function Section({ kicker, title, sub, children }: { kicker: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 80, marginBottom: 20 }}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <RevealOnScroll distance={18} style={{ alignItems: 'center', maxWidth: 720, alignSelf: 'center' }}>
          <Kicker color="rgba(167,139,250,0.85)">{kicker}</Kicker>
          <Text style={[section.title, { textAlign: 'center' }]}>{title}</Text>
          {sub && <Text style={[section.sub, { textAlign: 'center' }]}>{sub}</Text>}
        </RevealOnScroll>
        {children}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────
const nav = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    width: '100%',
    zIndex: 50,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignSelf: 'center',
    width: '100%',
  },
  progressTrack: { height: 2, width: '100%', backgroundColor: 'transparent' },
  progressFill: {
    height: 2,
    backgroundColor: PALETTE.violet,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 8px rgba(139,92,246,0.8)' } as any) : {}),
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: PALETTE.violet,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 18px rgba(139,92,246,0.55)' } as any) : {}),
  },
  brandText: { color: '#fff', fontFamily: TYPO.display700, fontSize: 17, letterSpacing: -0.3 },
  links: { flexDirection: 'row', gap: 4 },
  linkWrap: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  link: { color: 'rgba(255,255,255,0.75)', fontFamily: TYPO.body500, fontSize: 13.5 },
  ctas: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signin: { paddingHorizontal: 14, paddingVertical: 8 },
  signinText: { color: 'rgba(255,255,255,0.85)', fontFamily: TYPO.body600, fontSize: 13.5 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 20px rgba(139,92,246,0.30)' } as any) : {}),
  },
  ctaText: { color: '#fff', fontFamily: TYPO.body700, fontSize: 13.5 },
});

const hero = StyleSheet.create({
  section: { paddingHorizontal: 20, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(139,92,246,0.10)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
    borderRadius: 9999, marginBottom: 24,
  },
  pillDot: { width: 7, height: 7, borderRadius: 9999, backgroundColor: PALETTE.violet },
  pillText: { color: 'rgba(255,255,255,0.85)', fontFamily: TYPO.body500, fontSize: 12 },
  headline: {
    color: '#fff',
    fontFamily: TYPO.display800,
    textAlign: 'center',
    letterSpacing: -2,
  },
  headlineGradient: {
    ...(Platform.OS === 'web' ? ({
      backgroundImage: `linear-gradient(120deg, ${PALETTE.violet}, #22D3EE, #EC4899)`,
      WebkitBackgroundClip: 'text', backgroundClip: 'text',
      WebkitTextFillColor: 'transparent', color: 'transparent',
    } as any) : { color: PALETTE.violet }),
  },
  sub: {
    color: 'rgba(255,255,255,0.70)',
    fontFamily: TYPO.body500,
    textAlign: 'center',
    marginTop: 22,
    lineHeight: 26,
  },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 0, paddingVertical: 0, borderRadius: 10,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 28px rgba(139,92,246,0.45)' } as any) : {}),
  },
  ctaPrimaryInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 10,
  },
  ctaPrimaryText: { color: '#fff', fontFamily: TYPO.body700, fontSize: 15 },
  ctaSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  ctaSecondaryText: { color: 'rgba(255,255,255,0.92)', fontFamily: TYPO.body600, fontSize: 14 },
  heroGlow: {
    position: 'absolute', width: 520, height: 520, borderRadius: 9999,
    backgroundColor: PALETTE.violet,
    opacity: 0.14,
    top: -120, left: '50%' as any,
    transform: [{ translateX: -260 } as any],
    ...(Platform.OS === 'web' ? ({ filter: 'blur(120px)' } as any) : {}),
  },
  trust: { marginTop: 56, gap: 24, alignItems: 'center', justifyContent: 'center' },
});

const section = StyleSheet.create({
  title: {
    color: '#fff',
    fontFamily: TYPO.display700,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  sub: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: TYPO.body500,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    textAlign: 'center',
    maxWidth: 640,
  },
});

const feat = StyleSheet.create({
  iconWrap: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  title: { color: '#fff', fontFamily: TYPO.display700, fontSize: 18, lineHeight: 22 },
  body:  { color: 'rgba(255,255,255,0.65)', fontFamily: TYPO.body500, fontSize: 13.5, lineHeight: 20, marginTop: 2 },
});

const how = StyleSheet.create({
  bigNum: { color: 'rgba(139,92,246,0.5)', fontFamily: TYPO.mono600, fontSize: 28, letterSpacing: -1 },
  title:  { color: '#fff', fontFamily: TYPO.display700, fontSize: 19 },
  body:   { color: 'rgba(255,255,255,0.65)', fontFamily: TYPO.body500, fontSize: 13.5, lineHeight: 20 },
  line:   { height: 1, width: 38, backgroundColor: 'rgba(139,92,246,0.40)', marginTop: 4 },
  connectorTrack: {
    height: 2, width: '100%', marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden',
  },
  connectorFill: {
    height: '100%', backgroundColor: PALETTE.violet, borderRadius: 1,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 10px rgba(139,92,246,0.7)' } as any) : {}),
  },
});

const stats = StyleSheet.create({
  num:   { color: '#fff', fontFamily: TYPO.mono600, fontSize: 32, letterSpacing: -1.2 },
  label: { color: 'rgba(255,255,255,0.55)', fontFamily: TYPO.body500, fontSize: 13, marginTop: 4 },
});

const testi = StyleSheet.create({
  quote: { color: 'rgba(255,255,255,0.92)', fontFamily: TYPO.body500, fontSize: 14.5, lineHeight: 22 },
  avatar: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  name:  { color: '#fff', fontFamily: TYPO.body700, fontSize: 13 },
  role:  { color: 'rgba(255,255,255,0.55)', fontFamily: TYPO.body500, fontSize: 11.5 },
});

const cta = StyleSheet.create({
  banner: {
    paddingHorizontal: 32, paddingVertical: 48,
    borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.30)',
    alignItems: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({
      backdropFilter: 'blur(22px) saturate(180%)',
      WebkitBackdropFilter: 'blur(22px) saturate(180%)',
    } as any) : {}),
  },
  glow: {
    position: 'absolute',
    width: 320, height: 320, borderRadius: 9999,
    backgroundColor: PALETTE.violet,
    opacity: 0.18,
    top: -160, left: '50%' as any,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)', transform: [{ translateX: -160 } as any] } as any) : {}),
  },
  headline: {
    color: '#fff', fontFamily: TYPO.display800,
    fontSize: 36, lineHeight: 42, textAlign: 'center', letterSpacing: -1, marginTop: 8,
  },
  sub: {
    color: 'rgba(255,255,255,0.72)', fontFamily: TYPO.body500,
    fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 14, maxWidth: 560,
  },
  btnWrap: { borderRadius: 10, overflow: 'hidden' },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 28px rgba(139,92,246,0.45)' } as any) : {}),
  },
  btnText: { color: '#fff', fontFamily: TYPO.body700, fontSize: 15 },
  ghost: {
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  ghostText: { color: 'rgba(255,255,255,0.92)', fontFamily: TYPO.body600, fontSize: 14 },
});

const footer = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(10,15,30,0.72)',
    borderTopWidth: 1, borderTopColor: PALETTE.glassBorder,
    paddingHorizontal: 20, paddingVertical: 56,
    marginTop: 0,
  },
  inner: { width: '100%', alignSelf: 'center', gap: 32 },
  tag:   { color: 'rgba(255,255,255,0.55)', fontFamily: TYPO.body500, fontSize: 13.5, lineHeight: 20, maxWidth: 360 },
  colHead: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: TYPO.body700, fontSize: 11,
    letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 4,
  },
  colLink: { color: 'rgba(255,255,255,0.78)', fontFamily: TYPO.body500, fontSize: 13.5 },
  social: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  bottomDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 8 },
  copy: { color: 'rgba(255,255,255,0.45)', fontFamily: TYPO.body500, fontSize: 12 },
});
