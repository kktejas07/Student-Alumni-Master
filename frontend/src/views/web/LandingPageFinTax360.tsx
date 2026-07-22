/**
 * LandingPageFinTax360 — Redesigned with 3D Illustrations (v0.21.0)
 *
 * Features 3D SVG illustrations, perspective effects, layered depth,
 * scroll-triggered animations, and enhanced glassmorphism.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image,
  useWindowDimensions, Animated, Easing, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowRight, Sparkles, Users, Calendar, Briefcase, Wallet,
  Mail, Star, MessageSquare, Zap, Target,
  GraduationCap, TrendingUp, Shield, Rocket, CheckCircle2,
  Play, Brain, Network,
} from 'lucide-react-native';

import {
  AnimatedAurora, GridOverlay, AiCopilotFab, StatusChip, Kicker,
} from '@/src/views/web/portals/student/glass';
import { PALETTE, TYPO } from '@/src/views/web/portals/student/tokens';
import { SponsorStrip } from '@/src/views/web/components/SponsorStrip';

const GLOBAL_STYLES = `
@keyframes floatUp {
  0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
  10%  { opacity: 0.6; }
  90%  { opacity: 0.6; }
  100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
}
@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes orbFloat1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25%      { transform: translate(30px, -40px) scale(1.05); }
  50%      { transform: translate(-20px, -60px) scale(0.95); }
  75%      { transform: translate(40px, -20px) scale(1.02); }
}
@keyframes orbFloat2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(-40px, 30px) scale(1.08); }
  66%      { transform: translate(30px, -30px) scale(0.92); }
}
@keyframes orbFloat3 {
  0%, 100% { transform: translate(0, 0); }
  20%      { transform: translate(50px, -20px); }
  40%      { transform: translate(-30px, 40px); }
  60%      { transform: translate(20px, -50px); }
  80%      { transform: translate(-40px, 10px); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.3), 0 0 60px rgba(139,92,246,0.1); }
  50%      { box-shadow: 0 0 40px rgba(139,92,246,0.5), 0 0 80px rgba(139,92,246,0.2); }
}
@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes float3d {
  0%, 100% { transform: translateY(0px) rotateX(2deg) rotateY(-2deg); }
  50%      { transform: translateY(-15px) rotateX(-2deg) rotateY(2deg); }
}
@keyframes shimmer3d {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes orbit {
  from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
}
@keyframes pulse3d {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50%      { transform: scale(1.05); opacity: 1; }
}
@keyframes rotateGlobe {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes dashFlow {
  to { stroke-dashoffset: -20; }
}
`;

type BrandIconProps = { size?: number; color?: string };

function XIcon({ size = 14, color = '#fff' }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill={color} />
    </Svg>
  );
}
function LinkedInIcon({ size = 14, color = '#fff' }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.268 2.37 4.268 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.064 2.063 2.063 0 112.063 2.064zm1.778 13.019H3.555V9h3.56v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill={color} />
    </Svg>
  );
}
function InstagramIcon({ size = 14, color = '#fff' }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill={color} />
    </Svg>
  );
}
function GitHubIcon({ size = 14, color = '#fff' }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" fill={color} />
    </Svg>
  );
}
function MailIcon({ size = 14, color = '#fff' }: BrandIconProps) {
  return <Mail size={size} color={color} strokeWidth={1.6} />;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D SVG ILLUSTRATIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Hero — clean flat dashboard mockup illustration */
function Hero3DIllustration() {
  const barData = [65, 40, 80, 55, 90, 70, 45, 85, 60, 75, 50, 88];
  const barColors = [PALETTE.violet, PALETTE.blue, PALETTE.teal, PALETTE.violet, PALETTE.blue, PALETTE.teal, PALETTE.violet, PALETTE.blue, PALETTE.teal, PALETTE.violet, PALETTE.blue, PALETTE.teal];
  return (
    <View style={{ width: 520, height: 340, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.20)', backgroundColor: 'rgba(15,20,40,0.85)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.50), 0 0 60px rgba(139,92,246,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any}>
      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' }} />
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F59E0B' }} />
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
        </View>
        <View style={{ width: 120, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.20)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.30)' }} />
      </View>
      {/* Content */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Sidebar */}
        <View style={{ width: 140, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)', paddingVertical: 12, paddingHorizontal: 12, gap: 6 }}>
          {[PALETTE.violet, PALETTE.blue, PALETTE.teal, 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.15)'].map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: i === 0 ? 'rgba(139,92,246,0.12)' : 'transparent' }}>
              <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c, opacity: i === 0 ? 1 : 0.6 }} />
              <View style={{ width: 50 + (i % 3) * 10, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </View>
          ))}
        </View>
        {/* Main area */}
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[{ v: '12.5K', l: 'Students', c: PALETTE.violet }, { v: '850+', l: 'Mentors', c: PALETTE.blue }, { v: '4.2K', l: 'Sessions', c: PALETTE.teal }].map((s, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={{ fontFamily: TYPO.mono700, fontSize: 16, color: s.c, letterSpacing: -0.5 }}>{s.v}</Text>
                <Text style={{ fontFamily: TYPO.body500, fontSize: 9, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>{s.l}</Text>
              </View>
            ))}
          </View>
          {/* Chart */}
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 12, justifyContent: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: '100%' }}>
              {barData.map((h, i) => (
                <View key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 3, backgroundColor: barColors[i], opacity: 0.7 }} />
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/** AI illustration — clean neural network node cluster */
function AI3DBrain({ color = PALETTE.violet }: { color?: string }) {
  return (
    <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center', position: 'relative' } as any}>
      {/* Outer ring */}
      <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: color + '20', borderStyle: 'dashed' as any } as any} />
      {/* Middle ring */}
      <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: color + '30' } as any} />
      {/* Core glow */}
      <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: color + '15', borderWidth: 1, borderColor: color + '35', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${color}30, 0 0 80px ${color}15` } as any}>
        <Brain size={32} color={color} />
      </View>
      {/* Orbital nodes */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const r = 75;
        const x = Math.cos(rad) * r;
        const y = Math.sin(rad) * r;
        const nodeColors = [PALETTE.violet, PALETTE.blue, PALETTE.teal, '#EC4899', PALETTE.amber, PALETTE.violet];
        return (
          <View key={i} style={{ position: 'absolute', left: 110 + x - 8, top: 110 + y - 8, width: 16, height: 16, borderRadius: 8, backgroundColor: nodeColors[i] + '25', borderWidth: 1, borderColor: nodeColors[i] + '50', boxShadow: `0 0 12px ${nodeColors[i]}25` } as any} />
        );
      })}
      {/* Connecting lines (using thin Views) */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const r = 45;
        const len = 30;
        const x = Math.cos(rad) * r;
        const y = Math.sin(rad) * r;
        const angle = deg;
        return (
          <View key={`line-${i}`} style={{ position: 'absolute', left: 110 + x, top: 110 + y - 0.5, width: len, height: 1, backgroundColor: color + '20', transformOrigin: 'left center' as any, transform: `rotate(${angle}deg)` } as any} />
        );
      })}
    </View>
  );
}

/** Feature icon — styled container with lucide icon */
function Feature3DIcon({ color, icon }: { color: string; icon: React.ReactNode }) {
  return (
    <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: color + '15', borderWidth: 1, borderColor: color + '30', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${color}18` } as any}>
      {icon}
    </View>
  );
}

/** Step illustration — styled numbered badge */
function Step3DIllustration({ number, color }: { number: string; color: string }) {
  return (
    <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: color + '12', borderWidth: 1, borderColor: color + '30', alignItems: 'center', justifyContent: 'center', boxShadow: `0 12px 32px ${color}15` } as any}>
      <Text style={{ fontFamily: TYPO.display800, fontSize: 28, color, opacity: 0.85 }}>{number}</Text>
    </View>
  );
}

/** Globe illustration — clean wireframe circle with glow */
function Globe3D() {
  return (
    <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' } as any}>
      {/* Outer glow */}
      <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: PALETTE.violet, opacity: 0.08, filter: 'blur(20px)' } as any} />
      {/* Main circle */}
      <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: 'rgba(139,92,246,0.35)', backgroundColor: 'rgba(139,92,246,0.05)' } as any} />
      {/* Equator ellipse (horizontal) */}
      <View style={{ position: 'absolute', width: 80, height: 30, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(139,92,246,0.20)', transform: 'rotateX(60deg)' } as any} />
      {/* Meridian ellipse (vertical) */}
      <View style={{ position: 'absolute', width: 40, height: 80, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)' } as any} />
      {/* Center dot */}
      <View style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: PALETTE.violet, boxShadow: `0 0 12px ${PALETTE.violet}60` } as any} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FLOATING PARTICLES
// ═══════════════════════════════════════════════════════════════════════════
function FloatingParticles() {
  if (Platform.OS !== 'web') return null;
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 4,
    duration: 15 + Math.random() * 25,
    delay: Math.random() * 20,
    color: [PALETTE.violet, PALETTE.blue, PALETTE.teal, '#EC4899'][i % 4],
    opacity: 0.15 + Math.random() * 0.25,
  }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      {particles.map((p) => (
        <View
          key={p.id}
          style={{
            position: 'absolute', bottom: -20, left: p.left,
            width: p.size, height: p.size, borderRadius: 9999,
            backgroundColor: p.color, opacity: p.opacity,
            animation: `floatUp ${p.duration}s linear ${p.delay}s infinite`,
          } as any}
        />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCROLL REVEAL HOOK
// ═══════════════════════════════════════════════════════════════════════════
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') { setVisible(true); return; }
    const el = ref.current as any;
    if (!el) return;
    const observer = new (window as any).IntersectionObserver(
      ([entry]: any) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function AnimatedCounter({ target, suffix = '', prefix = '', duration = 2000 }: {
  target: number; suffix?: string; prefix?: string; duration?: number;
}) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useScrollReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [visible, target, duration]);
  return (
    <View ref={ref as any}>
      <Text style={{ fontFamily: TYPO.mono700, fontSize: 42, color: '#fff', letterSpacing: -1.5 }}>
        {prefix}{count.toLocaleString()}{suffix}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function LandingPageFinTax360() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.bg0 }}>
      {Platform.OS === 'web' && <style>{GLOBAL_STYLES}</style>}
      <LinearGradient colors={[PALETTE.bg0, PALETTE.bg2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject as any} pointerEvents="none" />
      <AnimatedAurora intensity="normal" />
      <GridOverlay />
      <FloatingParticles />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: 20 }}>
        <Navbar isDesktop={isDesktop} router={router} />
        <HeroSection isDesktop={isDesktop} isTablet={isTablet} router={router} />
        <TrustStrip isDesktop={isDesktop} />
        <FeaturePillars isDesktop={isDesktop} isTablet={isTablet} />
        <SponsorStrip variant="section" />
        <HowItWorks isDesktop={isDesktop} />
        <StatsStrip isDesktop={isDesktop} />
        <AIShowcase isDesktop={isDesktop} router={router} />
        <Testimonials isDesktop={isDesktop} />
        <CTABanner router={router} />
      </ScrollView>
      <Footer isDesktop={isDesktop} />
      <AiCopilotFab onPress={() => router.push('/login')} label="Try Agent K" />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════════════════
function Navbar({ isDesktop, router }: { isDesktop: boolean; router: ReturnType<typeof useRouter> }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const barStyle: any = {
    ...nav.bar,
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderBottomColor: scrolled ? 'rgba(139,92,246,0.20)' : PALETTE.glassBorder,
  };

  return (
    <View style={barStyle}>
      <View style={[nav.inner, { maxWidth: 1280 }]}>
        <Pressable onPress={() => router.push('/')} style={nav.brand}>
          <Image source={require('@/assets/images/sa-icon.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
          <Text style={nav.brandText}>StudentAlumni</Text>
        </Pressable>
        {isDesktop && (
          <View style={nav.links}>
            {['Features', 'Mentors', 'Events', 'Pricing', 'Blog'].map((l) => (
              <Pressable key={l} style={nav.linkWrap}>
                <Text style={nav.link}>{l}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={nav.ctas}>
          <Pressable onPress={() => router.push('/login')} style={nav.signin}>
            <Text style={nav.signinText}>Sign in</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/register')}>
            <LinearGradient colors={[PALETTE.violet, PALETTE.violetD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={nav.cta}>
              <Text style={nav.ctaText}>Get Started</Text>
              <ArrowRight size={14} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HERO — with 3D illustration
// ═══════════════════════════════════════════════════════════════════════════
function HeroSection({ isDesktop, isTablet, router }: {
  isDesktop: boolean; isTablet: boolean; router: ReturnType<typeof useRouter>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(40)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[hero.section, { paddingTop: isDesktop ? 120 : 90, paddingBottom: 40 }]}>
      {Platform.OS === 'web' && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
          <View style={[hero.orb, { top: '10%', left: '5%', width: 300, height: 300, backgroundColor: PALETTE.violet, opacity: 0.12, filter: 'blur(100px)', animation: 'orbFloat1 18s ease-in-out infinite' } as any]} />
          <View style={[hero.orb, { top: '20%', right: '10%', width: 250, height: 250, backgroundColor: PALETTE.blue, opacity: 0.10, filter: 'blur(100px)', animation: 'orbFloat2 22s ease-in-out infinite' } as any]} />
          <View style={[hero.orb, { bottom: '15%', left: '30%', width: 350, height: 350, backgroundColor: PALETTE.teal, opacity: 0.08, filter: 'blur(120px)', animation: 'orbFloat3 25s ease-in-out infinite' } as any]} />
        </View>
      )}

      <Animated.View style={{ opacity, transform: [{ translateY: ty }, { scale }], alignItems: 'center', maxWidth: 1100 }}>
        <View style={hero.pill}>
          <View style={hero.pillDot} />
          <Text style={hero.pillText}>Student Alumni with AI ATS</Text>
          <View style={{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 4 }} />
          <Text style={hero.pillLink}>New</Text>
        </View>

        <Text style={[hero.headline, { fontSize: isDesktop ? 80 : isTablet ? 60 : 42, lineHeight: isDesktop ? 88 : isTablet ? 66 : 48 }]}>
          Your <Text style={{ color: PALETTE.violet }}>career</Text>,{'\n'}
          <Text style={hero.headlineGradient}>reimagined.</Text>
        </Text>

        <Text style={[hero.sub, { maxWidth: 680, fontSize: isDesktop ? 19 : 16 }]}>
          The all-in-one platform connecting students with alumni mentors,
          AI-powered career guidance, curated internships, events and
          workshops — all built on a private network you can trust.
        </Text>

        <View style={hero.ctaRow}>
          <Pressable onPress={() => router.push('/register')}>
            <LinearGradient colors={[PALETTE.violet, PALETTE.violetD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={hero.ctaPrimary}>
              <Rocket size={16} color="#fff" />
              <Text style={hero.ctaPrimaryText}>Start free</Text>
              <ArrowRight size={16} color="#fff" />
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => router.push('/login')}
            style={({ hovered }: any) => [hero.ctaSecondary, hovered && { borderColor: 'rgba(255,255,255,0.30)', backgroundColor: 'rgba(255,255,255,0.08)' }]}
          >
            <Play size={14} color="rgba(255,255,255,0.80)" />
            <Text style={hero.ctaSecondaryText}>Watch demo</Text>
          </Pressable>
        </View>

        <View style={[hero.trust, { flexDirection: isDesktop ? 'row' : 'column' }]}>
          <TrustBadge icon={<CheckCircle2 size={14} color={PALETTE.teal} />} text="Free forever" />
          <TrustBadge icon={<Shield size={14} color={PALETTE.blue} />} text="Privacy-first" />
          <TrustBadge icon={<Zap size={14} color={PALETTE.amber} />} text="AI-powered" />
        </View>

        {/* 3D Hero Illustration */}
        <View style={[hero.illustrationWrap, { marginTop: isDesktop ? 48 : 32 }]}>
          <View style={{
            animation: 'float3d 6s ease-in-out infinite',
            perspective: '1000px' as any,
          } as any}>
            <Hero3DIllustration />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Text style={{ fontFamily: TYPO.body500, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{text}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRUST STRIP
// ═══════════════════════════════════════════════════════════════════════════
function TrustStrip({ isDesktop }: { isDesktop: boolean }) {
  const { ref, visible } = useScrollReveal(0.2);
  const logos = ['Google', 'Microsoft', 'Amazon', 'Flipkart', 'Razorpay', 'Zerodha', 'Swiggy', 'Razorpay'];

  return (
    <View ref={ref as any} style={{ paddingVertical: 40, borderTopWidth: 1, borderTopColor: PALETTE.glassBorder, borderBottomWidth: 1, borderBottomColor: PALETTE.glassBorder, overflow: 'hidden', opacity: visible ? 1 : 0, transform: [{ translateY: visible ? 0 : 20 }], transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
      <View style={{ maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 20 }}>
        <Text style={{ textAlign: 'center', fontFamily: TYPO.body500, fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase' as any, marginBottom: 20 }}>
          Trusted by students at
        </Text>
      </View>
      {Platform.OS === 'web' ? (
        <View style={{ overflow: 'hidden' } as any}>
          <View style={{ display: 'flex', flexDirection: 'row', gap: 60, animation: 'marquee 30s linear infinite', width: 'fit-content' as any } as any}>
            {[...logos, ...logos].map((name, i) => (
              <Text key={`${name}-${i}`} style={{ fontFamily: TYPO.display700, fontSize: 18, color: 'rgba(255,255,255,0.20)', whiteSpace: 'nowrap' as any, letterSpacing: -0.3 }}>{name}</Text>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24, paddingHorizontal: 20 }}>
          {logos.slice(0, 5).map((name) => (
            <Text key={name} style={{ fontFamily: TYPO.display700, fontSize: 16, color: 'rgba(255,255,255,0.20)' }}>{name}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE PILLARS — with 3D icons
// ═══════════════════════════════════════════════════════════════════════════
const FEATURES = [
  { icon: Brain, tone: PALETTE.violet, kicker: 'Agent K · BYO-AI', title: 'AI career copilot', body: 'Bring your own OpenAI / Anthropic / Gemini key. Get personalized prescriptions: roadmaps, resume polish, interview prep, scheduled automations.' },
  { icon: Network, tone: '#3B82F6', kicker: 'Network', title: 'Alumni & peer graph', body: 'Search by company, role, city or college. Send context-rich connection requests. Filter by graduation year, industry and openness to mentor.' },
  { icon: MessageSquare, tone: '#10B981', kicker: 'Mentor sessions', title: '1-on-1 mentoring', body: 'Book 30 to 60 minute calls with verified mentors. Built-in calendar sync, video room, post-session feedback and refund flow.' },
  { icon: Calendar, tone: '#F59E0B', kicker: 'Events', title: 'Events & workshops', body: 'Hackathons, webinars, study circles, alumni meetups. Bookable seats, capacity caps, certificates of attendance and replays.' },
  { icon: Briefcase, tone: '#A78BFA', kicker: 'Opportunities', title: 'Internships & jobs', body: 'Aggregated feed from LinkedIn, Naukri, Internshala, Glassdoor — deduped and filtered by your major, year and target role.' },
  { icon: Wallet, tone: '#22D3EE', kicker: 'Wallet & deals', title: 'Student wallet', body: 'Curated discounts on tools and learning platforms, on-campus deals, scholarship discovery and referral cashback.' },
];

function FeaturePillars({ isDesktop, isTablet }: { isDesktop: boolean; isTablet: boolean }) {
  const { ref: sectionRef, visible: sectionVisible } = useScrollReveal(0.1);
  const cols = isDesktop ? 3 : isTablet ? 2 : 1;
  const gap = 20;
  const cardW = `${100 / cols}%` as any;

  return (
    <View ref={sectionRef as any} style={{ paddingHorizontal: 20, marginTop: 80, marginBottom: 20, opacity: sectionVisible ? 1 : 0, transform: [{ translateY: sectionVisible ? 0 : 30 }], transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', maxWidth: 720, alignSelf: 'center' }}>
          <Kicker color="rgba(167,139,250,0.85)">Everything in one place</Kicker>
          <Text style={[section.title, { textAlign: 'center' }]}>Built for the next decade of student life</Text>
          <Text style={[section.sub, { textAlign: 'center' }]}>Five modular surfaces stitched into one private network. Mobile-first. Glass-dark. Lightning fast.</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2, marginTop: 32 }}>
          {FEATURES.map((f, idx) => (
            <FeatureCard key={f.title} feature={f} index={idx} cardW={cardW} gap={gap} />
          ))}
        </View>
      </View>
    </View>
  );
}

function FeatureCard({ feature: f, index: idx, cardW, gap }: {
  feature: typeof FEATURES[0]; index: number; cardW: any; gap: number;
}) {
  const { ref, visible } = useScrollReveal(0.1);
  const [hovered, setHovered] = useState(false);
  const Icon = f.icon;

  const cardStyle: any = {
    backgroundColor: hovered ? 'rgba(20,26,45,0.65)' : PALETTE.glass,
    borderWidth: 1, borderColor: hovered ? f.tone + '50' : PALETTE.glassBorder,
    borderRadius: 16, padding: 24, minHeight: 280, gap: 12, overflow: 'hidden',
    backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'default',
    transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
    boxShadow: hovered ? `0 24px 60px rgba(0,0,0,0.35), 0 0 0 1px ${f.tone}30, 0 0 40px ${f.tone}15` : PALETTE.glassShadow,
  };

  return (
    <View ref={ref as any} style={{ width: cardW, padding: gap / 2, opacity: visible ? 1 : 0, transform: [{ translateY: visible ? 0 : 30 }], transition: `opacity 0.5s ease ${idx * 80}ms, transform 0.5s ease ${idx * 80}ms` }}>
      <View onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={cardStyle}>
        <View pointerEvents="none" style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 9999, backgroundColor: f.tone, opacity: hovered ? 0.15 : 0.08, filter: 'blur(50px)', transition: 'opacity 0.3s ease' } as any} />
        <View style={{ marginBottom: 4 }}>
          <Feature3DIcon color={f.tone} icon={<Icon size={20} color={f.tone} />} />
        </View>
        <Kicker color={f.tone}>{f.kicker}</Kicker>
        <Text style={feat.title}>{f.title}</Text>
        <Text style={feat.body}>{f.body}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOW IT WORKS — with 3D step illustrations
// ═══════════════════════════════════════════════════════════════════════════
const STEPS = [
  { n: '01', title: 'Sign up & verify', body: 'Email verification, college identity check and one-tap onboarding. Get a referral code from a friend? Apply it for instant credits.', color: PALETTE.violet },
  { n: '02', title: 'Discover your graph', body: 'Browse alumni, mentors and peers from your college or domain. Bookmark events, save internships, schedule 1-on-1s.', color: PALETTE.blue },
  { n: '03', title: 'Activate Agent K', body: 'Plug in your AI key (Claude / GPT / Gemini), and Agent K writes you weekly career briefs, resume edits and scheduled automations.', color: PALETTE.teal },
];

function HowItWorks({ isDesktop }: { isDesktop: boolean }) {
  const { ref: sectionRef, visible: sectionVisible } = useScrollReveal(0.1);
  return (
    <View ref={sectionRef as any} style={{ paddingHorizontal: 20, marginTop: 80, marginBottom: 20, opacity: sectionVisible ? 1 : 0, transform: [{ translateY: sectionVisible ? 0 : 30 }], transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', maxWidth: 720, alignSelf: 'center' }}>
          <Kicker color="rgba(167,139,250,0.85)">How it works</Kicker>
          <Text style={[section.title, { textAlign: 'center' }]}>Three steps. Lifetime value.</Text>
          <Text style={[section.sub, { textAlign: 'center' }]}>The flow is intentionally simple — we let the depth come from the data, not the UI.</Text>
        </View>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 0 : 16, marginTop: 40 }}>
          {STEPS.map((s, idx) => (
            <StepCard key={s.n} step={s} index={idx} isDesktop={isDesktop} isLast={idx === STEPS.length - 1} />
          ))}
        </View>
      </View>
    </View>
  );
}

function StepCard({ step: s, index: idx, isDesktop, isLast }: {
  step: typeof STEPS[0]; index: number; isDesktop: boolean; isLast: boolean;
}) {
  const { ref, visible } = useScrollReveal(0.2);
  const [hovered, setHovered] = useState(false);

  const cardStyle: any = {
    flex: 1, backgroundColor: PALETTE.glass, borderWidth: 1,
    borderColor: hovered ? s.color + '50' : PALETTE.glassBorder,
    borderRadius: 16, padding: 28, gap: 16, position: 'relative', overflow: 'hidden',
    backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'default',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: hovered ? `0 20px 50px rgba(0,0,0,0.3), 0 0 30px ${s.color}15` : PALETTE.glassShadow,
  };

  return (
    <View ref={ref as any} style={{ flex: isDesktop ? 1 : undefined, flexDirection: 'row', alignItems: 'flex-start', opacity: visible ? 1 : 0, transform: [{ translateY: visible ? 0 : 30 }], transition: `opacity 0.5s ease ${idx * 150}ms, transform 0.5s ease ${idx * 150}ms` }}>
      <View onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={cardStyle}>
        <Text style={{ position: 'absolute', top: -10, right: 10, fontFamily: TYPO.display800, fontSize: 100, color: s.color, opacity: 0.06, letterSpacing: -4 } as any}>{s.n}</Text>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <Step3DIllustration number={s.n} color={s.color} />
        </View>
        <Text style={{ color: '#fff', fontFamily: TYPO.display700, fontSize: 20 }}>{s.title}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontFamily: TYPO.body500, fontSize: 14, lineHeight: 21 }}>{s.body}</Text>
      </View>
      {isDesktop && !isLast && (
        <View style={{ width: 60, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
          <View style={{ width: 40, height: 1, backgroundColor: 'rgba(255,255,255,0.12)', position: 'relative' } as any}>
            <View style={{ position: 'absolute', right: -4, top: -3, width: 0, height: 0, borderLeftWidth: 6, borderLeftColor: 'rgba(255,255,255,0.30)', borderTopWidth: 3.5, borderTopColor: 'transparent', borderBottomWidth: 3.5, borderBottomColor: 'transparent' }} />
          </View>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS STRIP — with 3D globe
// ═══════════════════════════════════════════════════════════════════════════
function StatsStrip({ isDesktop }: { isDesktop: boolean }) {
  const { ref, visible } = useScrollReveal(0.2);
  const containerStyle: any = {
    backgroundColor: PALETTE.glass, borderWidth: 1, borderColor: PALETTE.glassBorder,
    borderRadius: 24, padding: isDesktop ? 40 : 28, overflow: 'hidden', position: 'relative',
    backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)',
    boxShadow: PALETTE.glassShadow,
  };

  return (
    <View ref={ref as any} style={{ paddingHorizontal: 20, marginTop: 40, opacity: visible ? 1 : 0, transform: [{ translateY: visible ? 0 : 30 }], transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <View style={containerStyle}>
          <View pointerEvents="none" style={{ position: 'absolute', top: -80, left: '50%', width: 400, height: 400, borderRadius: 9999, backgroundColor: PALETTE.violet, opacity: 0.08, filter: 'blur(100px)' } as any} />
          {isDesktop && (
            <View style={{ position: 'absolute', right: 40, top: '50%', transform: [{ translateY: -60 }] } as any}>
              <Globe3D />
            </View>
          )}
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 0 : 28 }}>
            {[
              { value: 12500, suffix: '+', label: 'Active students' },
              { value: 850, suffix: '+', label: 'Verified mentors' },
              { value: 4200, suffix: '+', label: 'Sessions completed' },
              { value: 42, prefix: '₹', suffix: ' Cr', label: 'Scholarships unlocked' },
            ].map((s, idx) => (
              <View key={s.label} style={{ flex: 1, alignItems: isDesktop ? 'flex-start' : 'center', paddingLeft: isDesktop && idx > 0 ? 28 : 0, borderLeftWidth: isDesktop && idx > 0 ? 1 : 0, borderLeftColor: 'rgba(255,255,255,0.06)' }}>
                <AnimatedCounter target={s.value} prefix={s.prefix} suffix={s.suffix} />
                <Text style={{ fontFamily: TYPO.body500, fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: 0.3 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AI SHOWCASE — with 3D brain
// ═══════════════════════════════════════════════════════════════════════════
function AIShowcase({ isDesktop, router }: { isDesktop: boolean; router: ReturnType<typeof useRouter> }) {
  const { ref, visible } = useScrollReveal(0.1);
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    { label: 'Resume Polish', icon: Target, desc: 'Agent K rewrites your resume for ATS optimization, tailored to each job description.' },
    { label: 'Interview Prep', icon: GraduationCap, desc: 'Mock interviews with AI feedback. Practice STAR method responses with real-time scoring.' },
    { label: 'Career Roadmap', icon: TrendingUp, desc: 'Personalized 6-month career plan based on your goals, skills, and market trends.' },
    { label: 'Job Matching', icon: Briefcase, desc: 'AI-curated job feed ranked by fit score. Auto-applies to matching positions.' },
  ];

  const outerStyle: any = {
    backgroundColor: PALETTE.glass, borderWidth: 1, borderColor: PALETTE.glassBorder,
    borderRadius: 20, overflow: 'hidden',
    backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)',
    boxShadow: PALETTE.glassShadow,
  };

  return (
    <View ref={ref as any} style={{ paddingHorizontal: 20, marginTop: 80, marginBottom: 20, opacity: visible ? 1 : 0, transform: [{ translateY: visible ? 0 : 30 }], transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', maxWidth: 720, alignSelf: 'center' }}>
          <Kicker color="rgba(167,139,250,0.85)">Powered by AI</Kicker>
          <Text style={[section.title, { textAlign: 'center' }]}>Meet Agent K</Text>
          <Text style={[section.sub, { textAlign: 'center' }]}>Your personal AI career copilot. Bring your own key — we never store your data.</Text>
        </View>
        <View style={{ marginTop: 40, ...outerStyle }}>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', borderBottomWidth: 1, borderBottomColor: PALETTE.glassBorder }}>
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === idx;
              return (
                <Pressable key={tab.label} onPress={() => setActiveTab(idx)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: isActive ? PALETTE.violet + '15' : 'transparent', borderBottomWidth: isActive ? 2 : 0, borderBottomColor: PALETTE.violet, transition: 'all 0.2s ease', cursor: 'pointer' } as any}>
                  <Icon size={18} color={isActive ? PALETTE.violet : 'rgba(255,255,255,0.40)'} />
                  <Text style={{ fontFamily: isActive ? TYPO.body700 : TYPO.body500, fontSize: 13, color: isActive ? '#fff' : 'rgba(255,255,255,0.55)' }}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ padding: isDesktop ? 40 : 24, minHeight: 200 }}>
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 32, alignItems: 'center' }}>
              <View style={{ flex: 1, gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: PALETTE.violet + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} color={PALETTE.violet} />
                  </View>
                  <Text style={{ fontFamily: TYPO.display700, fontSize: 22, color: '#fff' }}>{tabs[activeTab].label}</Text>
                </View>
                <Text style={{ fontFamily: TYPO.body500, fontSize: 15, color: 'rgba(255,255,255,0.70)', lineHeight: 24 }}>{tabs[activeTab].desc}</Text>
                <Pressable onPress={() => router.push('/register')} style={{ marginTop: 8 }}>
                  <LinearGradient colors={[PALETTE.violet, PALETTE.violetD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 }}>
                    <Text style={{ fontFamily: TYPO.body700, fontSize: 13, color: '#fff' }}>Try it free</Text>
                    <ArrowRight size={14} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </View>
              <View style={{ flex: 1, width: isDesktop ? undefined : '100%', alignItems: 'center' }}>
                <AI3DBrain />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTIMONIALS
// ═══════════════════════════════════════════════════════════════════════════
const TESTIMONIALS = [
  { name: 'Aanya R.', role: 'BTech CS, 3rd year', quote: 'Agent K wrote my entire intern application list, ranked by fit. I got 6 callbacks in week one.', tone: PALETTE.violet, avatar: 'A' },
  { name: 'Karthik M.', role: 'MBA, IIM Bangalore', quote: 'Booked a 45-min call with an alumnus at McKinsey. Worth more than a semester of generic career counseling.', tone: '#10B981', avatar: 'K' },
  { name: 'Reema S.', role: 'Final year, NIT Trichy', quote: 'The wallet alone covered 4 SaaS subscriptions for my hackathon team. The mentor network is the cherry on top.', tone: '#F59E0B', avatar: 'R' },
];

function Testimonials({ isDesktop }: { isDesktop: boolean }) {
  const { ref: sectionRef, visible: sectionVisible } = useScrollReveal(0.1);
  return (
    <View ref={sectionRef as any} style={{ paddingHorizontal: 20, marginTop: 80, marginBottom: 20, opacity: sectionVisible ? 1 : 0, transform: [{ translateY: sectionVisible ? 0 : 30 }], transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', maxWidth: 720, alignSelf: 'center' }}>
          <Kicker color="rgba(167,139,250,0.85)">What students say</Kicker>
          <Text style={[section.title, { textAlign: 'center' }]}>Built on real outcomes</Text>
          <Text style={[section.sub, { textAlign: 'center' }]}>Verified reviews from students who shipped something — internships, fellowships, hackathon wins.</Text>
        </View>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20, marginTop: 32 }}>
          {TESTIMONIALS.map((t, idx) => (
            <TestimonialCard key={t.name} testimonial={t} index={idx} isDesktop={isDesktop} />
          ))}
        </View>
      </View>
    </View>
  );
}

function TestimonialCard({ testimonial: t, index: idx, isDesktop }: {
  testimonial: typeof TESTIMONIALS[0]; index: number; isDesktop: boolean;
}) {
  const { ref, visible } = useScrollReveal(0.15);
  const [hovered, setHovered] = useState(false);
  const cardStyle: any = {
    flex: isDesktop ? 1 : undefined, backgroundColor: PALETTE.glass, borderWidth: 1,
    borderColor: hovered ? t.tone + '40' : PALETTE.glassBorder,
    borderRadius: 16, padding: 24, gap: 16, overflow: 'hidden', position: 'relative',
    backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'default',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: hovered ? `0 20px 50px rgba(0,0,0,0.3), 0 0 20px ${t.tone}15` : PALETTE.glassShadow,
  };
  return (
    <View ref={ref as any} style={{ flex: isDesktop ? 1 : undefined, opacity: visible ? 1 : 0, transform: [{ translateY: visible ? 0 : 30 }], transition: `opacity 0.5s ease ${idx * 100}ms, transform 0.5s ease ${idx * 100}ms` }}>
      <View onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={cardStyle}>
        <View pointerEvents="none" style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 9999, backgroundColor: t.tone, opacity: 0.10, filter: 'blur(40px)' } as any} />
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} color="#FBBF24" fill="#FBBF24" />)}
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.92)', fontFamily: TYPO.body500, fontSize: 15, lineHeight: 23 }}>{`\u201C${t.quote}\u201D`}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.tone + '25', borderWidth: 1, borderColor: t.tone + '40', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: t.tone, fontFamily: TYPO.display700, fontSize: 16 }}>{t.avatar}</Text>
          </View>
          <View>
            <Text style={{ color: '#fff', fontFamily: TYPO.body700, fontSize: 14 }}>{t.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.50)', fontFamily: TYPO.body500, fontSize: 12 }}>{t.role}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CTA BANNER
// ═══════════════════════════════════════════════════════════════════════════
function CTABanner({ router }: { router: ReturnType<typeof useRouter> }) {
  const { ref, visible } = useScrollReveal(0.2);
  const bannerStyle: any = {
    backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
    borderRadius: 28, paddingHorizontal: 32, paddingVertical: 56, alignItems: 'center',
    overflow: 'hidden', position: 'relative',
    backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)',
    animation: 'pulseGlow 4s ease-in-out infinite',
  };
  return (
    <View ref={ref as any} style={{ paddingHorizontal: 20, marginTop: 80, marginBottom: 80, opacity: visible ? 1 : 0, transform: [{ translateY: visible ? 0 : 30 }], transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <View style={bannerStyle}>
          <View pointerEvents="none" style={{ position: 'absolute', top: -100, left: '30%', width: 300, height: 300, borderRadius: 9999, backgroundColor: PALETTE.violet, opacity: 0.12, filter: 'blur(80px)' } as any} />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: -80, right: '20%', width: 250, height: 250, borderRadius: 9999, backgroundColor: PALETTE.blue, opacity: 0.08, filter: 'blur(80px)' } as any} />
          <Kicker color="rgba(167,139,250,0.8)">Ready when you are</Kicker>
          <Text style={{ color: '#fff', fontFamily: TYPO.display800, fontSize: 40, lineHeight: 46, textAlign: 'center', letterSpacing: -1.2, marginTop: 8 }}>Start your next chapter{'\n'}today.</Text>
          <Text style={{ color: 'rgba(255,255,255,0.70)', fontFamily: TYPO.body500, fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 16, maxWidth: 520 }}>Sign up free. No credit card required. Bring your own AI key when you're ready.</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Pressable onPress={() => router.push('/register')}>
              <LinearGradient colors={[PALETTE.violet, PALETTE.violetD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, boxShadow: '0 12px 32px rgba(139,92,246,0.40)' }}>
                <Rocket size={16} color="#fff" />
                <Text style={{ fontFamily: TYPO.body700, fontSize: 15, color: '#fff' }}>Create account</Text>
                <ArrowRight size={16} color="#fff" />
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => router.push('/login')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
              <Text style={{ fontFamily: TYPO.body600, fontSize: 14, color: 'rgba(255,255,255,0.92)' }}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════
function Footer({ isDesktop }: { isDesktop: boolean }) {
  return (
    <View style={[footer.wrap, Platform.OS === 'web' && ({ backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as any)]}>
      <View style={[footer.inner, { maxWidth: 1280 }]}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 40 }}>
          <View style={{ flex: isDesktop ? 1.4 : undefined, gap: 12 }}>
            <Pressable style={nav.brand}>
              <Image source={require('@/assets/images/sa-icon.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
              <Text style={nav.brandText}>StudentAlumni</Text>
            </Pressable>
            <Text style={footer.tag}>The private career network for India's top students and alumni. Built mobile-first, AI-native, and student-owned.</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Social Icon={XIcon} label="X (Twitter)" />
              <Social Icon={LinkedInIcon} label="LinkedIn" />
              <Social Icon={InstagramIcon} label="Instagram" />
              <Social Icon={GitHubIcon} label="GitHub" />
              <Social Icon={MailIcon} label="Email" />
            </View>
          </View>
          <FootCol heading="Product" links={['Features', 'Agent K', 'Mentors', 'Events', 'Internships', 'Wallet']} />
          <FootCol heading="Company" links={['About', 'Careers', 'Press', 'Blog', 'Contact']} />
          <FootCol heading="Legal" links={['Privacy', 'Terms', 'Cookies', 'Refunds', 'Security']} />
        </View>
        <View style={footer.bottomDivider} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <Text style={footer.copy}>© 2026 StudentAlumni Pvt. Ltd. All rights reserved.</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={footer.copy}>v0.21.0</Text>
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
      {links.map((l) => <Text key={l} style={[footer.colLink, { paddingVertical: 2 }]}>{l}</Text>)}
    </View>
  );
}

function Social({ Icon, label }: { Icon: React.ComponentType<{ size?: number; color?: string }>; label?: string }) {
  return (
    <View accessibilityLabel={label ? `${label} social icon` : 'Social icon'} style={footer.social}>
      <Icon size={14} color="rgba(255,255,255,0.80)" />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const nav = StyleSheet.create({
  bar: { backgroundColor: 'rgba(10,15,30,0.80)', borderBottomWidth: 1, borderBottomColor: PALETTE.glassBorder, width: '100%', zIndex: 50 },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, alignSelf: 'center', width: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoGlow: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', boxShadow: '0 0 20px rgba(139,92,246,0.30)' },
  brandText: { color: '#fff', fontFamily: TYPO.display700, fontSize: 17, letterSpacing: -0.3 },
  links: { flexDirection: 'row', gap: 4 },
  linkWrap: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  link: { color: 'rgba(255,255,255,0.75)', fontFamily: TYPO.body500, fontSize: 13.5 },
  ctas: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signin: { paddingHorizontal: 14, paddingVertical: 8 },
  signinText: { color: 'rgba(255,255,255,0.85)', fontFamily: TYPO.body600, fontSize: 13.5 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9, boxShadow: '0 0 20px rgba(139,92,246,0.30)' },
  ctaText: { color: '#fff', fontFamily: TYPO.body700, fontSize: 13.5 },
});

const hero = StyleSheet.create({
  section: { paddingHorizontal: 20, alignItems: 'center', position: 'relative' },
  orb: { position: 'absolute', borderRadius: 9999 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(139,92,246,0.10)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', borderRadius: 9999, marginBottom: 28 },
  pillDot: { width: 7, height: 7, borderRadius: 9999, backgroundColor: PALETTE.violet },
  pillText: { color: 'rgba(255,255,255,0.85)', fontFamily: TYPO.body500, fontSize: 12 },
  pillLink: { color: PALETTE.violet, fontFamily: TYPO.body700, fontSize: 12 },
  headline: { color: '#fff', fontFamily: TYPO.display800, textAlign: 'center', letterSpacing: -3 },
  headlineGradient: { color: PALETTE.violet, backgroundImage: `linear-gradient(120deg, ${PALETTE.violet}, #22D3EE, #EC4899, ${PALETTE.violet})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', backgroundSize: '200% auto', animation: 'gradientShift 4s ease infinite' },
  sub: { color: 'rgba(255,255,255,0.70)', fontFamily: TYPO.body500, textAlign: 'center', marginTop: 24, lineHeight: 28 },
  ctaRow: { flexDirection: 'row', gap: 14, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center' },
  ctaPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, boxShadow: '0 8px 32px rgba(139,92,246,0.40)' },
  ctaPrimaryText: { color: '#fff', fontFamily: TYPO.body700, fontSize: 15 },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  ctaSecondaryText: { color: 'rgba(255,255,255,0.92)', fontFamily: TYPO.body600, fontSize: 14 },
  trust: { marginTop: 48, gap: 20, alignItems: 'center', justifyContent: 'center' },
  illustrationWrap: { alignItems: 'center', width: '100%' },
});

const section = StyleSheet.create({
  title: { color: '#fff', fontFamily: TYPO.display700, fontSize: 38, lineHeight: 44, letterSpacing: -0.8, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.65)', fontFamily: TYPO.body500, fontSize: 16, lineHeight: 24, marginTop: 14, textAlign: 'center', maxWidth: 640 },
});

const feat = StyleSheet.create({
  title: { color: '#fff', fontFamily: TYPO.display700, fontSize: 19, lineHeight: 24 },
  body: { color: 'rgba(255,255,255,0.65)', fontFamily: TYPO.body500, fontSize: 14, lineHeight: 21, marginTop: 2 },
});

const footer = StyleSheet.create({
  wrap: { backgroundColor: 'rgba(10,15,30,0.72)', borderTopWidth: 1, borderTopColor: PALETTE.glassBorder, paddingHorizontal: 20, paddingVertical: 56 },
  inner: { width: '100%', alignSelf: 'center', gap: 32 },
  tag: { color: 'rgba(255,255,255,0.55)', fontFamily: TYPO.body500, fontSize: 13.5, lineHeight: 20, maxWidth: 360 },
  colHead: { color: 'rgba(255,255,255,0.55)', fontFamily: TYPO.body700, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 4 },
  colLink: { color: 'rgba(255,255,255,0.78)', fontFamily: TYPO.body500, fontSize: 13.5 },
  social: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  bottomDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 8 },
  copy: { color: 'rgba(255,255,255,0.45)', fontFamily: TYPO.body500, fontSize: 12 },
});
