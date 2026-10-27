// @ts-nocheck
/**
 * DashboardView — Pixel-perfect implementation of the Complete Student Alumni
 * Web Dashboard specification (Bundle 2).
 * 
 * Contains:
 *  - HackWave 3.0 & Voice of Generations Hero Carousel with live indicators
 *  - 5 Collab Exclusive Coupon Cards with shimmer sweep
 *  - 4 Circular Ring Stat Cards (Profile Strength 50%, Applications, Network, Events 8)
 *  - Segmented Tab Switcher with sliding indicator (Opportunities vs Intelligence Center)
 *  - Opportunities 12-Column Bento Grid:
 *    • Career Readiness (36% Builder circular SVG ring + ETA ~18 weeks + Continue now)
 *    • Today's Focus · Agent K (interactive checklist with checkmark animations)
 *    • Skill Streak (0 days 🔥 + 7 week day pills)
 *    • Next 1:1 Session (Rahul Sharma Senior SDE @ Google with live countdown timer)
 *    • Applications Breakdown (Saved / Applied / Interviews progress bars)
 *    • Top Matches For You (Boulevard, Demandbase, Jobber with match percentage bars & Apply action)
 *    • Mentors With Capacity (Priya Mehta, Arjun Verma, Vikram Singh with Book actions)
 *    • Network Growth (8 events with animated SVG sparkline chart)
 *    • Upcoming on Campus (Continuous infinite marquee)
 *  - Intelligence Center Tab:
 *    • Goal banner: explore at a Top Company in your field
 *    • 5 Readiness Metric Cards with +8% from last week
 *    • Career Growth Prediction Area Chart (Today 36% -> 7D 44% -> 30D 64% -> 60D 65% -> 90D 71% -> 180D 92%)
 *    • Prediction Insight box
 *  - Digital ID Card Modal Trigger & 3D Flippable Card
 */

import React, { useState, useEffect, useContext } from 'react';
import { Check, X, Star } from 'lucide-react';
import { View, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StudentPortalNavContext } from '../StudentPortalNavContext';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useTheme } from '@/src/theme/ThemeContext';
import { request } from '@/src/models/services/api';

export function DashboardView() {
  const router = useRouter();
  const portalNav = useContext(StudentPortalNavContext);
  const authUser = useAuthStore((u) => u.user);
  const { isDark } = useTheme();

  // Tabs: 'opportunities' | 'intelligence'
  const [activeTab, setActiveTab] = useState<'opportunities' | 'intelligence'>('opportunities');

  // Interactive Checklist State
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Refine your resume for the Google SWE referral', sub: '4 min · closes Friday', done: false },
    { id: 2, text: 'Prep 3 questions for the mentor call', sub: '2 min · tomorrow 6pm', done: true },
    { id: 3, text: 'Apply to 2 matched roles closing this week', sub: '6 min · 2 of 267 matches', done: false },
  ]);

  // Carousel Slide
  const [heroSlide, setHeroSlide] = useState(0);

  // Coupon Copy Feedback
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Live Timer for Next Session
  const [timeLeft, setTimeLeft] = useState('28:14:06');

  // Digital ID Card Modal
  const [showIdModal, setShowIdModal] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Streak Days State
  const [activeStreakDay, setActiveStreakDay] = useState<number | null>(null);
  const [skillStreak, setSkillStreak] = useState(0);

  // Top Matches Data
  const [topMatches, setTopMatches] = useState<any[]>([]);
  const [totalMatches, setTotalMatches] = useState(267);
  const [applyModalJob, setApplyModalJob] = useState<any | null>(null);
  const [topMentors, setTopMentors] = useState<any[]>([]);

  useEffect(() => {
    request<any>('/opportunities?limit=3')
      .then((res) => {
        if (res && res.items) {
          setTopMatches(res.items.slice(0, 3));
          setTotalMatches(res.total || 0);
        }
      })
      .catch(() => {});

    request<any>('/student/network?limit=20')
      .then((res) => {
        if (res && Array.isArray(res)) {
          const mentors = res.filter((u: any) => u.role === 'Mentor').slice(0, 3);
          setTopMentors(mentors);
        } else if (res && Array.isArray(res.items)) {
          const mentors = res.items.filter((u: any) => u.role === 'Mentor').slice(0, 3);
          setTopMentors(mentors);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Ping daily_login to keep the streak alive even if they bypassed the login screen via stored token
    request<any>('/wallet/track', {
      method: 'POST',
      body: { activity_type: 'daily_login' },
    }).finally(() => {
      request<any>('/users/me/stats')
        .then((res) => {
          if (res && typeof res.skill_streak === 'number') {
            setSkillStreak(res.skill_streak);
            if (res.skill_streak > 0) {
              setActiveStreakDay(Math.min(res.skill_streak, 7) - 1);
            } else {
              setActiveStreakDay(-1);
            }
          }
        })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hrs = 28 - (now.getHours() % 12);
      const mins = 59 - now.getMinutes();
      const secs = 59 - now.getSeconds();
      setTimeLeft(`${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatic Hero Carousel Transition
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(slideTimer);
  }, []);

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const copyCoupon = (code: string) => {
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const HERO_SLIDES = [
    {
      tag: 'COLLAB EXCLUSIVE',
      title: 'HackWave 3.0 — 2026',
      sub: 'SEP 04 — 05 2026 · Sreenidhi Institute of Science and Technology, Hyderabad',
      desc: 'In strategic collaboration with CDC & Student Alumni. ₹100 Off with code SAHW100.',
      link: '/echo/snist/register',
      cta: 'Register for HackWave →',
    },
    {
      tag: 'VOICE OF GENERATIONS · VNRVJIT',
      title: 'Alumni took the stage, students took notes.',
      sub: '26 photos, 3 workshops and 5 testimonials from the last showcase.',
      desc: 'Annual flagship networking conference at VNR Vignana Jyothi.',
      link: '/echo/snist',
      cta: 'Open ECHO Showcase →',
    },
    {
      tag: 'CAREER AI · NEW',
      title: 'Your readiness is up 8% this week.',
      sub: 'Agent K rebuilt your roadmap. Next milestone: build your professional resume.',
      desc: 'AI projected career readiness trajectory based on your completed milestones.',
      link: '/agent-k',
      cta: 'Continue now →',
    },
  ];

  const MARQUEE_EVENTS = [
    { name: 'HackWave 3.0', when: 'SEP 04 · Sreenidhi', col: '#A78BFA' },
    { name: 'Voice of Generations', when: 'SEP 12 · VNRVJIT', col: '#34D399' },
    { name: 'Alumni AMA · Product', when: 'SEP 18 · Online', col: '#F1B8D9' },
    { name: 'Resume Clinic', when: 'SEP 21 · Block C', col: '#F59E0B' },
    { name: 'Cloud Bootcamp', when: 'SEP 26 · AWS + SA', col: '#6FD6FF' },
    { name: 'Placement Prep Week', when: 'OCT 02 · Campus', col: '#A78BFA' },
  ];

  if (Platform.OS !== 'web') {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>Student Dashboard</Text>
      </View>
    );
  }

  const completedCount = tasks.filter((t) => t.done).length;

  // Theme-aware tokens for DashboardView:
  const C = isDark ? {
    textPrimary: '#F4F4FA',
    textSecondary: '#8A8A9E',
    textMuted: '#6A6A7E',
    bgCard: '#101019',
    bgCardAlt: '#14141F',
    bgTrack: '#262638',
    borderCard: '#1F1F30',
    borderItem: '#262638',
    borderHover: '#2C2A52',
    shadowCard: '0 1px 0 rgba(255,255,255,.03) inset, 0 18px 40px rgba(0,0,0,.35)',
    shadowCardHover: '0 18px 44px rgba(0,0,0,.45)',
    communityBg: 'linear-gradient(135deg, rgba(124,92,252,0.12) 0%, rgba(16,185,129,0.1) 100%)',
    communityBorder: 'rgba(124,92,252,0.3)',
    couponCardBg: 'linear-gradient(135deg, rgba(124,92,246,0.12) 0%, rgba(245,158,11,0.08) 100%)',
    couponCardBorder: 'rgba(124,92,246,0.2)',
    tabBg: '#101019',
    tabBorder: '#1F1F30',
    tabActiveBg: 'rgba(124,92,252,.18)',
    tabActiveText: '#F4F4FA',
    tabActiveBorder: '#3A2E72',
    goalBannerBg: 'linear-gradient(150deg, #14141F, #101019 60%)',
    goalBannerBorder: '#2C2A52',
    insightBg: 'rgba(124,92,252,.07)',
    insightBorder: '#2C2A52',
    proTipBg: 'rgba(0,0,0,0.3)',
    proTipBorder: '#232338',
    proTipText: '#B4B4CB',
    perkBg: 'linear-gradient(145deg, rgba(124,92,252,0.08) 0%, #14141F 100%)',
    perkBorder: '#3A2E72',
  } : {
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    bgCard: '#FFFFFF',
    bgCardAlt: '#F8FAFC',
    bgTrack: '#E2E8F0',
    borderCard: 'rgba(0, 0, 0, 0.08)',
    borderItem: 'rgba(0, 0, 0, 0.06)',
    borderHover: '#C4B5FD',
    shadowCard: '0 4px 20px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.04)',
    shadowCardHover: '0 10px 28px rgba(124, 92, 252, 0.08)',
    communityBg: 'linear-gradient(135deg, rgba(124,92,252,0.06) 0%, rgba(16,185,129,0.05) 100%)',
    communityBorder: 'rgba(124,92,252,0.2)',
    couponCardBg: 'linear-gradient(135deg, rgba(124,92,246,0.06) 0%, rgba(245,158,11,0.05) 100%)',
    couponCardBorder: 'rgba(124,92,246,0.18)',
    tabBg: '#F1F5F9',
    tabBorder: '#E2E8F0',
    tabActiveBg: '#FFFFFF',
    tabActiveText: '#6D28D9',
    tabActiveBorder: '#DDD6FE',
    goalBannerBg: 'linear-gradient(150deg, #FFFFFF, #F8FAFC 60%)',
    goalBannerBorder: 'rgba(124,92,252,0.2)',
    insightBg: 'rgba(124,92,252,.04)',
    insightBorder: 'rgba(124,92,252,0.18)',
    proTipBg: '#F8FAFC',
    proTipBorder: 'rgba(0, 0, 0, 0.06)',
    proTipText: '#475569',
    perkBg: 'linear-gradient(145deg, rgba(124,92,252,0.04) 0%, #FFFFFF 100%)',
    perkBorder: 'rgba(124,92,252,0.18)',
  };

  return (
    <div
      id="db-page-dash"
      style={{
        width: '100%',
        color: C.textPrimary,
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* ── CSS Tokens & Shimmers ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes db-lockshine {
          0% { transform: translateX(-140%) skewX(-16deg); }
          60%, 100% { transform: translateX(260%) skewX(-16deg); }
        }
        @keyframes db-marq {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes db-flame {
          0%, 100% { transform: scale(1) rotate(-3deg); }
          50% { transform: scale(1.12) rotate(3deg); }
        }
        .db-card {
          background: ${C.bgCard};
          border: 1px solid ${C.borderCard};
          border-radius: 20px;
          box-shadow: ${C.shadowCard};
          transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .db-card:hover {
          border-color: ${C.borderHover};
          box-shadow: ${C.shadowCardHover};
          transform: translateY(-2px);
        }
        .db-coupon {
          position: relative;
          overflow: hidden;
          border: 1px solid ${isDark ? '#4A3410' : '#FDE68A'};
          border-radius: 14px;
          background: ${isDark ? '#14141F' : '#FFFFFF'};
          min-height: 190px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: transform .25s ease, border-color .25s ease;
        }
        .db-coupon:hover {
          transform: translateY(-3px);
          border-color: #F59E0B;
        }
        .db-marq-container:hover .db-marq-track {
          animation-play-state: paused;
        }
      `,
        }}
      />

      {/* ── 1. Hero Event Carousel Banner (HackWave 3.0 & Voice of Generations) ── */}
      <div
        id="db-banner"
        className="db-card"
        style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          border: isDark ? '1px solid #3B2B7A' : '1px solid rgba(124,92,252,0.3)',
          minHeight: '300px',
          background:
            heroSlide === 0
              ? 'linear-gradient(115deg, #5A2DBE 0%, #6B34D6 42%, #4A1F9E 100%)'
              : heroSlide === 1
              ? 'linear-gradient(115deg, #14324D 0%, #0E5548 60%, #103F3A 100%)'
              : 'linear-gradient(115deg, #3A2352 0%, #5B2E5F 55%, #2C1B3F 100%)',
          color: '#FFFFFF',
          transition: 'background 0.7s ease',
        }}
      >
        <div style={{ padding: '34px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ maxWidth: '680px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '3px', color: '#E9DDFF', marginBottom: '12px' }}>
                {HERO_SLIDES[heroSlide].tag}
              </div>
              <h1 style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '-1.4px', lineHeight: 1.1, margin: '0 0 10px', color: '#FFFFFF' }}>
                {HERO_SLIDES[heroSlide].title}
              </h1>
              <div style={{ fontSize: '15px', color: '#DCCEF7', marginBottom: '12px', fontWeight: 500 }}>
                {HERO_SLIDES[heroSlide].sub}
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: '0 0 24px' }}>
                {HERO_SLIDES[heroSlide].desc}
              </p>
              <a
                href={HERO_SLIDES[heroSlide].link}
                target={HERO_SLIDES[heroSlide].link.startsWith('http') ? '_blank' : '_self'}
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#7C5CFC',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 8px 22px rgba(124,92,252,.28)',
                }}
              >
                {HERO_SLIDES[heroSlide].cta}
              </a>
            </div>

            {/* Badge & Promo Block */}
            <div style={{ background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '16px', padding: '20px 24px', textAlign: 'center', minWidth: '200px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', color: '#F6C86B' }}>SA COLLAB SPECIAL</div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '24px', fontWeight: 800, color: '#FFFFFF', margin: '6px 0' }}>SAHW100</div>
              <div style={{ fontSize: '12px', color: '#DCCEF7' }}>₹100 Off per team</div>
            </div>
          </div>

          {/* Slide Indicator Dots */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            {HERO_SLIDES.map((_, i) => (
              <span
                key={i}
                onClick={() => setHeroSlide(i)}
                style={{
                  width: heroSlide === i ? '26px' : '8px',
                  height: '6px',
                  borderRadius: '3px',
                  background: heroSlide === i ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Official Student Alumni Community Channels Banner ── */}
      <div style={{ marginTop: '16px', background: C.communityBg, border: `1px solid ${C.communityBorder}`, borderRadius: '16px', padding: '18px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', color: isDark ? '#38BDF8' : '#0284C7', marginBottom: '4px' }}>
              JOIN OFFICIAL STUDENT ALUMNI COMMUNITY CHANNELS
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>
              Connect with 95,000+ verified students & alumni across India
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="https://chat.whatsapp.com/G2kc2u0gzh68DKSjlOyCxu"
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                background: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)',
                border: isDark ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(16,185,129,0.3)',
                color: isDark ? '#34D399' : '#059669',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>💬</span> WhatsApp Community
            </a>

            <a
              href="https://www.instagram.com/studentalumni.ai/"
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                background: isDark ? 'rgba(236,72,153,0.18)' : 'rgba(236,72,153,0.12)',
                border: isDark ? '1px solid rgba(236,72,153,0.4)' : '1px solid rgba(236,72,153,0.3)',
                color: isDark ? '#F472B6' : '#DB2777',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>📸</span> Instagram (@studentalumni.ai)
            </a>

            <a
              href="https://linkedin.com/company/student-alumni"
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                background: isDark ? 'rgba(56,189,248,0.18)' : 'rgba(56,189,248,0.12)',
                border: isDark ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(56,189,248,0.3)',
                color: isDark ? '#38BDF8' : '#0284C7',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>💼</span> LinkedIn Page
            </a>
          </div>
        </div>
      </div>

      {/* ── 2. Available Coupons — Link to Wallet ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', margin: '10px 0 14px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, letterSpacing: '1.6px', color: isDark ? '#F59E0B' : '#D97706' }}>
            AVAILABLE COUPONS
          </span>
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', background: C.couponCardBg,
            border: `1px solid ${C.couponCardBorder}`, borderRadius: '16px', cursor: 'pointer',
          }}
          onClick={() => window.location.href = '/student-portal?tab=wallet'}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary, marginBottom: '4px' }}>
              🎫 Browse Marketplace & Partner Coupons
            </div>
            <div style={{ fontSize: '13px', color: C.textSecondary }}>
              Find discount codes for food, beverages, partners, and more — all in your wallet.
            </div>
          </div>
          <span style={{ color: isDark ? '#A78BFA' : '#7C5CFC', fontSize: '20px' }}>→</span>
        </div>
      </div>

      {/* ── 3. Top 4 Metric Ring / Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        {/* Profile Strength */}
        <div className="db-card" style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#A78BFA' : '#7C5CFC', marginBottom: '10px' }}>Profile Strength</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1, color: C.textPrimary }}>50%</div>
              <div style={{ fontSize: '12.5px', color: C.textSecondary, marginTop: '8px' }}>Keep going!</div>
            </div>
            <svg width="46" height="46" viewBox="0 0 46 46" style={{ flex: 'none' }}>
              <circle cx="23" cy="23" r="19" style={{ fill: 'none', stroke: C.bgTrack, strokeWidth: 4 }} />
              <circle cx="23" cy="23" r="19" style={{ fill: 'none', stroke: '#7C5CFC', strokeWidth: 4, strokeLinecap: 'round', transform: 'rotate(-90deg)', transformOrigin: '23px 23px', strokeDasharray: 119.4, strokeDashoffset: 59.7 }} />
            </svg>
          </div>
        </div>

        {/* Applications */}
        <div className="db-card" style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#A78BFA' : '#7C5CFC', marginBottom: '10px' }}>Applications</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1, color: C.textPrimary }}>0</div>
              <div style={{ fontSize: '12.5px', color: C.textSecondary, marginTop: '8px' }}>0 applied</div>
            </div>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: isDark ? 'rgba(124,92,252,.14)' : 'rgba(124,92,252,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: isDark ? '#A78BFA' : '#7C5CFC' }}>
              
            </span>
          </div>
        </div>

        {/* Network */}
        <div className="db-card" style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#34D399' : '#059669', marginBottom: '10px' }}>Network</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1, color: C.textPrimary }}>0</div>
              <div style={{ fontSize: '12.5px', color: C.textSecondary, marginTop: '8px' }}>Connections</div>
            </div>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: isDark ? 'rgba(16, 185, 129, 0.13)' : 'rgba(16, 185, 129, 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: isDark ? '#34D399' : '#059669' }}>
              
            </span>
          </div>
        </div>

        {/* Events */}
        <div className="db-card" style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#F0616B' : '#E11D48', marginBottom: '10px' }}>Events</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1, color: C.textPrimary }}>8</div>
              <div style={{ fontSize: '12.5px', color: C.textSecondary, marginTop: '8px' }}>Registered</div>
            </div>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: isDark ? 'rgba(240, 97, 107, 0.13)' : 'rgba(240, 97, 107, 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: isDark ? '#F0616B' : '#E11D48' }}>
              
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. Interactive Tabs Switcher ── */}
      <div style={{ display: 'inline-flex', gap: '6px', padding: '6px', border: `1px solid ${C.tabBorder}`, borderRadius: '14px', background: C.tabBg, width: 'fit-content' }}>
        <span
          onClick={() => setActiveTab('opportunities')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '9px',
            height: '42px',
            padding: '0 20px',
            borderRadius: '10px',
            fontSize: '14.5px',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'opportunities' ? C.tabActiveBg : 'transparent',
            color: activeTab === 'opportunities' ? C.tabActiveText : C.textSecondary,
            border: activeTab === 'opportunities' ? `1px solid ${C.tabActiveBorder}` : '1px solid transparent',
            boxShadow: activeTab === 'opportunities' && !isDark ? '0 2px 6px rgba(109,40,217,0.08)' : 'none',
          }}
        >
           Opportunities
        </span>
        <span
          onClick={() => setActiveTab('intelligence')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '9px',
            height: '42px',
            padding: '0 20px',
            borderRadius: '10px',
            fontSize: '14.5px',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'intelligence' ? C.tabActiveBg : 'transparent',
            color: activeTab === 'intelligence' ? C.tabActiveText : C.textSecondary,
            border: activeTab === 'intelligence' ? `1px solid ${C.tabActiveBorder}` : '1px solid transparent',
            boxShadow: activeTab === 'intelligence' && !isDark ? '0 2px 6px rgba(109,40,217,0.08)' : 'none',
          }}
        >
           Intelligence Center
        </span>
      </div>

      {/* ── 5. Opportunities Tab (Bento Grid) ── */}
      {activeTab === 'opportunities' && (
        <div id="db-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '16px' }}>
          {/* Career Readiness */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 5', gridRow: 'span 2', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: isDark ? '#A78BFA' : '#7C5CFC', marginBottom: '14px' }}>
              CAREER READINESS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '22px' }}>
              <svg width="112" height="112" viewBox="0 0 112 112" style={{ flex: 'none' }}>
                <circle cx="56" cy="56" r="46" style={{ fill: 'none', stroke: C.bgTrack, strokeWidth: 9 }} />
                <circle cx="56" cy="56" r="46" style={{ fill: 'none', stroke: 'url(#dbRingGrad)', strokeWidth: 9, strokeLinecap: 'round', transform: 'rotate(-90deg)', transformOrigin: '56px 56px', strokeDasharray: 289, strokeDashoffset: 185 }} />
                <defs>
                  <linearGradient id="dbRingGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8B7BFF" />
                    <stop offset="1" stopColor="#2FB8C6" />
                  </linearGradient>
                </defs>
                <text x="56" y="63" textAnchor="middle" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 700, fill: C.textPrimary }}>
                  36%
                </text>
              </svg>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.6px', color: C.textPrimary }}>Builder</div>
                <div style={{ fontSize: '13px', color: C.textSecondary, marginTop: '3px' }}> Industry Ready</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', fontWeight: 600, color: isDark ? '#34D399' : '#059669', background: isDark ? 'rgba(16, 185, 129, 0.13)' : 'rgba(16, 185, 129, 0.10)', borderRadius: '7px', padding: '5px 9px' }}>
                  ↗ +8% this week
                </div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.borderItem}`, paddingTop: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: C.textPrimary }}>Build your professional resume</span>
                <span style={{ fontSize: '12.5px', color: isDark ? '#A78BFA' : '#7C5CFC' }}>60%</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: C.bgTrack, overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ height: '100%', width: '60%', borderRadius: '3px', background: 'linear-gradient(90deg, #7C5CFC, #2FB8C6)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '12.5px', color: C.textSecondary }}>ETA ~18 weeks</span>
                <button onClick={() => router.push('/career-ai')} style={{ fontSize: '13px', fontWeight: 600, background: '#7C5CFC', color: '#FFFFFF', borderRadius: '9px', padding: '9px 16px', border: 'none', cursor: 'pointer' }}>
                  Continue now
                </button>
              </div>
            </div>
          </div>

          {/* Today's Focus - Agent K */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 4', gridRow: 'span 2', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: isDark ? '#A78BFA' : '#7C5CFC', marginBottom: '14px' }}>
              TODAY'S FOCUS · AGENT K
            </div>
            <div style={{ display: 'grid', gap: '9px' }}>
              {tasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTask(t.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'max-content minmax(0, 1fr)',
                    gap: '12px',
                    alignItems: 'start',
                    border: `1px solid ${C.borderItem}`,
                    borderRadius: '12px',
                    background: C.bgCardAlt,
                    padding: '13px 14px',
                    cursor: 'pointer',
                    opacity: t.done ? 0.72 : 1,
                  }}
                >
                  <span style={{ width: '18px', height: '18px', borderRadius: '6px', border: `1.5px solid ${t.done ? '#7C5CFC' : (isDark ? '#262638' : '#CBD5E1')}`, background: t.done ? '#7C5CFC' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>
                    {t.done && <Check size={12} color='#FFFFFF' />}
                  </span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? C.textSecondary : C.textPrimary }}>
                      {t.text}
                    </div>
                    <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '12.5px', color: C.textSecondary }}>
              <span style={{ color: isDark ? '#A78BFA' : '#7C5CFC', fontWeight: 600 }}>{completedCount} of 3</span> done today
            </div>
          </div>

          {/* Apply Confirmation Modal */}
          {applyModalJob && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <div className="db-card" style={{ background: C.bgCard, padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px', border: `1px solid ${C.borderCard}` }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: C.textPrimary, marginBottom: '12px' }}>Confirm Application</div>
                <div style={{ fontSize: '14px', color: C.textSecondary, marginBottom: '24px', lineHeight: '1.5' }}>
                  We redirected you to the external application page for <span style={{ color: C.textPrimary, fontWeight: 600 }}>{applyModalJob.title}</span> at <span style={{ color: C.textPrimary, fontWeight: 600 }}>{applyModalJob.company}</span>. 
                  <br /><br />
                  Once you finish submitting your details there, confirm it here to track its progress in your dashboard.
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setApplyModalJob(null)}
                    style={{ padding: '10px 16px', borderRadius: '8px', background: 'transparent', color: C.textSecondary, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await request(`/student/internships/${applyModalJob.id || applyModalJob.job_id}/apply`, { 
                          method: 'POST',
                          body: { student_email: authUser?.email || undefined }
                        });
                        setTopMatches(prev => prev.map(job => (
                          job === applyModalJob || (job.title === applyModalJob.title && job.company === applyModalJob.company)
                        ) ? { ...job, applied: true } : job));
                        setApplyModalJob(null);
                      } catch (e) {
                        setApplyModalJob(null);
                      }
                    }}
                    style={{ padding: '10px 16px', borderRadius: '8px', background: '#34D399', color: '#04291D', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Yes, I applied
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Skill Streak */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 3', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: C.textSecondary, marginBottom: '14px' }}>
              SKILL STREAK
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px' }}>
              <span style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.2px', color: C.textPrimary }}>{skillStreak}</span>
              <span style={{ fontSize: '14px', color: C.textSecondary }}>days</span>
              <span style={{ fontSize: '20px', marginLeft: 'auto', animation: 'db-flame 2.2s ease-in-out infinite', display: 'inline-block' }}>🔥</span>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '16px' }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <span
                  key={idx}
                  style={{
                    flex: 1,
                    height: '26px',
                    borderRadius: '6px',
                    background: activeStreakDay !== null && idx <= activeStreakDay ? 'linear-gradient(180deg, #F59E0B, #C2410C)' : C.bgTrack,
                    cursor: 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: activeStreakDay !== null && idx <= activeStreakDay ? '#FFFFFF' : C.textSecondary,
                  }}
                >
                  {day}
                </span>
              ))}
            </div>
            <div style={{ fontSize: '12.5px', color: skillStreak > 0 ? (isDark ? '#10B981' : '#059669') : (isDark ? '#F0616B' : '#E11D48'), marginTop: '12px' }}>
              {skillStreak > 0 ? "You're on a streak!" : "Start your streak today"}
            </div>
          </div>

          {/* Next 1:1 Session */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 4', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: C.textSecondary, marginBottom: '14px' }}>
              NEXT SESSION
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '13px', marginBottom: '16px' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#7C5CFC', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flex: 'none' }}>
                RS
              </span>
              <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                <div style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary }}>Rahul Sharma</div>
                <div style={{ fontSize: '12.5px', color: C.textSecondary, marginTop: '2px' }}>Senior SDE @ Google</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: isDark ? '#34D399' : '#059669' }}>
                CONFIRMED
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderTop: `1px solid ${C.borderItem}`, paddingTop: '15px' }}>
              <div>
                <div style={{ fontSize: '19px', fontWeight: 700, letterSpacing: '-.4px', color: C.textPrimary }}>{timeLeft}</div>
                <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '3px' }}>Thursday · 6:00 pm IST</div>
              </div>
              <button style={{ fontSize: '13px', fontWeight: 600, background: '#7C5CFC', color: '#FFFFFF', borderRadius: '9px', padding: '9px 16px', border: 'none', cursor: 'pointer' }}>
                Join room
              </button>
            </div>
          </div>

          {/* Applications Breakdown */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 3', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: C.textSecondary, marginBottom: '14px' }}>
              APPLICATIONS
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', marginBottom: '18px' }}>
              <span style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.2px', color: C.textPrimary }}>267</span>
              <span style={{ fontSize: '13.5px', color: C.textSecondary }}>matches open</span>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSecondary, marginBottom: '5px' }}>
                  <span>Saved</span><span>0</span>
                </div>
                <div style={{ height: '5px', borderRadius: '3px', background: C.bgTrack, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '4%', background: '#7C5CFC' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSecondary, marginBottom: '5px' }}>
                  <span>Applied</span><span>0</span>
                </div>
                <div style={{ height: '5px', borderRadius: '3px', background: C.bgTrack, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '0%', background: '#2FB8C6' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSecondary, marginBottom: '5px' }}>
                  <span>Interviews</span><span>0</span>
                </div>
                <div style={{ height: '5px', borderRadius: '3px', background: C.bgTrack, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '0%', background: '#10B981' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Top Matches For You */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 7', padding: '20px 22px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: isDark ? '#A78BFA' : '#7C5CFC' }}>TOP MATCHES FOR YOU</div>
              <span onClick={() => portalNav?.navigate('internships')} style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#A78BFA' : '#7C5CFC', cursor: 'pointer' }}>
                View all {totalMatches} →
              </span>
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {topMatches.length > 0 ? topMatches.map((m, idx) => {
                const initial = m.title ? m.title.charAt(0).toUpperCase() : 'O';
                const colors = [
                  { bg: '#22D3EE', text: '#06323B' },
                  { bg: '#F59E0B', text: '#3A2404' },
                  { bg: '#10B981', text: '#04291D' }
                ];
                const c = colors[idx % colors.length];
                const matchPct = Math.min(100, Math.max(0, Math.round((m.match_score || 0) * 100)));
                const sub = `${m.company || 'Unknown'} · ${m.location || 'Remote'}${m.stipend ? ' · ' + m.stipend : ''}`;
                
                return (
                <div key={m.id || idx} style={{ display: 'grid', gridTemplateColumns: '38px minmax(0, 1fr) 92px max-content', gap: '13px', alignItems: 'center', borderRadius: '11px', padding: '10px 11px', background: C.bgCardAlt, border: `1px solid ${C.borderItem}` }}>
                  <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700 }}>
                    {initial}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: C.textPrimary }}>{m.title}</div>
                    <div style={{ fontSize: '12.5px', color: C.textSecondary, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
                  </div>
                  <div>
                    <div style={{ height: '5px', borderRadius: '3px', background: C.bgTrack, overflow: 'hidden', marginBottom: '4px' }}>
                      <div style={{ height: '100%', width: `${matchPct}%`, background: 'linear-gradient(90deg, #7C5CFC, #34D399)' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: C.textSecondary }}>{matchPct}% match</div>
                  </div>
                  <button 
                    disabled={m.applied}
                    onClick={() => {
                      if (m.applied) return;
                      const url = m.url || (m.source_urls && m.source_urls[0]);
                      if (url) {
                        window.open(url, '_blank');
                        setApplyModalJob(m);
                      } else {
                        portalNav?.navigate('internships');
                      }
                    }}
                    style={{ fontSize: '12.5px', fontWeight: 600, background: m.applied ? (isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0') : '#7C5CFC', color: m.applied ? C.textSecondary : '#FFFFFF', borderRadius: '8px', padding: '8px 14px', border: 'none', cursor: m.applied ? 'default' : 'pointer' }}
                  >
                    {m.applied ? 'Applied' : 'Apply'}
                  </button>
                </div>
              )}) : (
                <div style={{ fontSize: '13px', color: C.textSecondary, padding: '20px', textAlign: 'center' }}>No matches found right now.</div>
              )}
            </div>
          </div>

          {/* Mentors With Capacity */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 5', padding: '20px 22px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: isDark ? '#34D399' : '#059669' }}>MENTORS WITH CAPACITY</div>
              <span onClick={() => portalNav?.navigate('network')} style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#34D399' : '#059669', cursor: 'pointer' }}>
                View all →
              </span>
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {(topMentors && topMentors.length > 0 ? topMentors : []).map((men) => (
                <div key={men.id || men.name} style={{ display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr) max-content', gap: '12px', alignItems: 'center', borderRadius: '11px', padding: '9px 11px', background: C.bgCardAlt, border: `1px solid ${C.borderItem}` }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: men.color || '#10B981', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                    {men.initials || 'M'}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: C.textPrimary }}>{men.name}</div>
                    <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '2px' }}>{men.subline}</div>
                  </div>
                  <button style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#34D399' : '#059669', border: isDark ? '1px solid #17503E' : '1px solid rgba(5,150,105,0.35)', background: isDark ? 'transparent' : 'rgba(5,150,105,0.06)', borderRadius: '8px', padding: '8px 13px', cursor: 'pointer' }}>
                    Book
                  </button>
                </div>
              ))}
              {(!topMentors || topMentors.length === 0) && (
                <div style={{ fontSize: '13px', color: C.textSecondary, padding: '20px', textAlign: 'center' }}>No mentors available with capacity right now.</div>
              )}
            </div>
          </div>

          {/* Network Growth */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 4', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: C.textSecondary, marginBottom: '14px' }}>
              NETWORK GROWTH
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', marginBottom: '12px' }}>
              <span style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.2px', color: C.textPrimary }}>8</span>
              <span style={{ fontSize: '13.5px', color: C.textSecondary }}>events registered</span>
            </div>
            <svg viewBox="0 0 300 90" style={{ width: '100%', height: '90px' }}>
              <defs>
                <linearGradient id="dbSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2FB8C6" stopOpacity="0.3" />
                  <stop offset="1" stopColor="#2FB8C6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M6 78 L60 70 L114 56 L168 58 L222 38 L294 14 L294 88 L6 88 Z" fill="url(#dbSpark)" />
              <path d="M6 78 L60 70 L114 56 L168 58 L222 38 L294 14" fill="none" stroke="#2FB8C6" strokeWidth="2.4" />
            </svg>
            <div style={{ fontSize: '12.5px', color: C.textSecondary }}>
              Profile strength <strong style={{ color: C.textPrimary, fontWeight: 600 }}>50%</strong> · 0 connections yet
            </div>
          </div>

          {/* Continuous Infinite Marquee: Upcoming on Campus */}
          <div className="db-tile db-card db-marq-container" style={{ gridColumn: 'span 12', padding: '20px 22px 22px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: isDark ? '#F59E0B' : '#D97706' }}>UPCOMING ON CAMPUS</div>
              <span onClick={() => portalNav?.navigate('events')} style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#F59E0B' : '#D97706', cursor: 'pointer' }}>
                My events →
              </span>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                className="db-marq-track"
                style={{
                  display: 'flex',
                  width: 'max-content',
                  gap: '10px',
                  animation: 'db-marq 32s linear infinite',
                }}
              >
                {[...MARQUEE_EVENTS, ...MARQUEE_EVENTS].map((ev, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 'none',
                      minWidth: '210px',
                      border: `1px solid ${C.borderItem}`,
                      borderRadius: '12px',
                      background: C.bgCardAlt,
                      padding: '13px 15px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ev.col }} />
                      <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.2px', color: ev.col }}>
                        {ev.when.split(' · ')[0]}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px', color: C.textPrimary }}>{ev.name}</div>
                    <div style={{ fontSize: '12px', color: C.textSecondary }}>{ev.when.split(' · ')[1]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Intelligence Center Tab ── */}
      {activeTab === 'intelligence' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Current Goal Banner */}
          <div className="db-card" style={{ border: `1px solid ${C.goalBannerBorder}`, background: C.goalBannerBg, padding: '26px 28px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#A78BFA' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.6px', color: isDark ? '#A78BFA' : '#7C5CFC' }}>CURRENT GOAL</span>
            </div>
            <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.3px', marginBottom: '12px', color: C.textPrimary }}>
              explore at a Top Company in your field
            </div>
            <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap', fontSize: '13.5px', color: C.textSecondary, marginBottom: '26px' }}>
              <span>✦ Level: <strong style={{ color: isDark ? '#A78BFA' : '#7C5CFC', fontWeight: 600 }}>Builder</strong></span>
              <span>✦ Target: <strong style={{ color: isDark ? '#A78BFA' : '#7C5CFC', fontWeight: 600 }}>Industry Ready</strong></span>
              <span>✦ ETA: <strong style={{ color: isDark ? '#A78BFA' : '#7C5CFC', fontWeight: 600 }}>~18 Weeks</strong></span>
            </div>
          </div>

          {/* 5 Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '14px' }}>
            {[
              { title: 'READINESS SCORE', val: '36%', sub: '+8% from last week', subCol: isDark ? '#34D399' : '#059669' },
              { title: 'TARGET READINESS', val: '100%', sub: 'Industry Ready', subCol: isDark ? '#34D399' : '#059669' },
              { title: 'CAREER LEVEL', val: 'Builder', sub: 'Current Level', subCol: isDark ? '#F59E0B' : '#D97706' },
              { title: 'PROFILE STRENGTH', val: '50%', sub: '+8% from last week', subCol: isDark ? '#34D399' : '#059669' },
              { title: 'SKILL STREAK', val: '0 Days', sub: 'Start your streak!', subCol: isDark ? '#F0616B' : '#E11D48' },
            ].map((stat) => (
              <div key={stat.title} className="db-card" style={{ padding: '18px 20px 20px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.2px', color: C.textSecondary, marginBottom: '12px' }}>
                  {stat.title}
                </div>
                <div style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-1.2px', color: C.textPrimary }}>{stat.val}</div>
                <div style={{ fontSize: '12.5px', color: stat.subCol, marginTop: '8px' }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Career Growth Prediction Area Chart */}
          <div className="db-card" style={{ padding: '24px 26px 26px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, letterSpacing: '1.8px', color: C.textSecondary, marginBottom: '22px' }}>
              CAREER GROWTH PREDICTION
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '24px', alignItems: 'center' }}>
              <div style={{ width: '100%', height: '180px', position: 'relative' }}>
                <svg width="100%" height="100%" viewBox="0 0 780 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="dbCg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#7C5CFC" stopOpacity={isDark ? "0.34" : "0.20"} />
                      <stop offset="1" stopColor="#7C5CFC" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M40 190 L180 168 L320 132 L460 128 L600 106 L740 60 L740 210 L40 210 Z" fill="url(#dbCg)" />
                  <path d="M40 190 L180 168 L320 132 L460 128 L600 106 L740 60" fill="none" stroke={isDark ? "#8B7BFF" : "#7C5CFC"} strokeWidth="2.6" />
                  {[
                    { cx: 40, cy: 190, label: '36%', time: 'Today' },
                    { cx: 180, cy: 168, label: '44%', time: '7 Days' },
                    { cx: 320, cy: 132, label: '64%', time: '30 Days' },
                    { cx: 460, cy: 128, label: '65%', time: '60 Days' },
                    { cx: 600, cy: 106, label: '71%', time: '90 Days' },
                    { cx: 740, cy: 60, label: '92%', time: '180 Days' },
                  ].map((p) => (
                    <g key={p.time}>
                      <circle cx={p.cx} cy={p.cy} r="5" fill={isDark ? "#B9AEFF" : "#7C5CFC"} />
                      <text x={p.cx} y={p.cy - 12} textAnchor="middle" fill={C.textPrimary} fontSize="14" fontWeight="600">
                        {p.label}
                      </text>
                      <text x={p.cx} y={195} textAnchor="middle" fill={C.textSecondary} fontSize="12">
                        {p.time}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div style={{ border: `1px solid ${C.insightBorder}`, borderRadius: '16px', background: C.insightBg, padding: '22px 24px 24px' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '12px', color: C.textPrimary }}>Prediction Insight</div>
                <div style={{ fontSize: '14px', lineHeight: 1.6, color: C.textSecondary, marginBottom: '20px' }}>
                  You're on the right track! Consistent action can take you from <strong style={{ color: isDark ? '#A78BFA' : '#7C5CFC', fontWeight: 600 }}>36%</strong> to <strong style={{ color: isDark ? '#A78BFA' : '#7C5CFC', fontWeight: 600 }}>92%</strong> readiness in 18 weeks.
                </div>
                <button style={{ width: '100%', padding: '11px', fontSize: '13.5px', fontWeight: 600, color: isDark ? '#A78BFA' : '#7C5CFC', border: `1px solid ${C.insightBorder}`, background: 'transparent', borderRadius: '9px', cursor: 'pointer' }}>
                  View Full Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Verticals Perks, Tips & Offers Board ── */}
      <div id="db-verticals-board" style={{ marginTop: '12px' }}>
        <div className="db-card" style={{ padding: '28px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', color: isDark ? '#A78BFA' : '#7C5CFC', marginBottom: '6px' }}>
                PLATFORM VERTICAL PERKS & PRO TIPS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: C.textPrimary }}>
                Tips, Coupons & Offers across all StudentAlumni Verticals
              </div>
              <div style={{ fontSize: '14px', color: C.textSecondary, marginTop: '6px' }}>
                Curated guidance, verified promo codes, and special benefits for Career, ECHO Events, Mentorship, Startups, and Health.
              </div>
            </div>
            <span
              onClick={() => router.push('/deals')}
              style={{
                fontSize: '13px', fontWeight: 700, color: '#FFF',
                background: '#7C5CFC', borderRadius: '100px',
                padding: '10px 20px', cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              Explore All Deals →
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
            {/* 1. Career & Placement */}
            <div style={{ border: `1px solid ${C.perkBorder}`, borderRadius: '18px', background: C.perkBg, padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: isDark ? '#A78BFA' : '#7C5CFC' }}>CAREER & PLACEMENT</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#34D399' : '#059669', background: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', padding: '4px 8px' }}>FEATURED</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: C.textPrimary }}>Resume & Mock Interview Pass</div>
              
              <div style={{ background: C.proTipBg, border: `1px solid ${C.proTipBorder}`, borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, marginBottom: '4px' }}>PRO TIP</div>
                <div style={{ fontSize: '13px', color: C.proTipText, lineHeight: 1.5 }}>
                  Upload your ATS resume 48h before campus CDC drives for 3.2x higher interview callback rates.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px dashed ${isDark ? '#4B3FA8' : '#A78BFA'}`, borderRadius: '12px', padding: '12px 14px', background: isDark ? 'rgba(124,92,252,0.06)' : 'rgba(124,92,252,0.04)' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: isDark ? '#FFF' : '#6D28D9', fontFamily: 'monospace' }}>SA-CAREER-PRO</div>
                  <div style={{ fontSize: '11.5px', color: C.textSecondary }}>100% Free Unlimited ATS Scans</div>
                </div>
                <span
                  onClick={() => {
                    if (navigator.clipboard) navigator.clipboard.writeText('SA-CAREER-PRO');
                    setCopiedCoupon('SA-CAREER-PRO');
                    setTimeout(() => setCopiedCoupon(null), 2500);
                  }}
                  style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#A78BFA' : '#7C5CFC', cursor: 'pointer', background: isDark ? 'rgba(124,92,252,0.18)' : 'rgba(124,92,252,0.12)', borderRadius: '6px', padding: '6px 12px' }}
                >
                  {copiedCoupon === 'SA-CAREER-PRO' ? 'COPIED ✓' : 'COPY'}
                </span>
              </div>
            </div>

            {/* 2. ECHO Events & Hackathons */}
            <div style={{ border: `1px solid ${isDark ? 'rgba(52,211,153,0.3)' : 'rgba(52,211,153,0.25)'}`, borderRadius: '18px', background: isDark ? 'linear-gradient(145deg, rgba(52,211,153,0.08) 0%, #14141F 100%)' : 'linear-gradient(145deg, rgba(52,211,153,0.05) 0%, #FFFFFF 100%)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: isDark ? '#34D399' : '#059669' }}>ECHO EVENTS & HACKATHONS</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#34D399' : '#059669', background: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', padding: '4px 8px' }}>LIVE OFFER</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: C.textPrimary }}>VIP Gate Pass & Meal Voucher</div>
              
              <div style={{ background: C.proTipBg, border: `1px solid ${C.proTipBorder}`, borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, marginBottom: '4px' }}>PRO TIP</div>
                <div style={{ fontSize: '13px', color: C.proTipText, lineHeight: 1.5 }}>
                  Check in early at Gate 2 with your SA ID to receive VIP front-row seating & complimentary breakfast combos.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px dashed ${isDark ? 'rgba(52,211,153,0.4)' : 'rgba(52,211,153,0.5)'}`, borderRadius: '12px', padding: '12px 14px', background: isDark ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.04)' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: isDark ? '#FFF' : '#047857', fontFamily: 'monospace' }}>ECHO-VIP-500</div>
                  <div style={{ fontSize: '11.5px', color: C.textSecondary }}>₹500 OFF Premium Pass</div>
                </div>
                <span
                  onClick={() => {
                    if (navigator.clipboard) navigator.clipboard.writeText('ECHO-VIP-500');
                    setCopiedCoupon('ECHO-VIP-500');
                    setTimeout(() => setCopiedCoupon(null), 2500);
                  }}
                  style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#34D399' : '#059669', cursor: 'pointer', background: isDark ? 'rgba(52,211,153,0.18)' : 'rgba(52,211,153,0.12)', borderRadius: '6px', padding: '6px 12px' }}
                >
                  {copiedCoupon === 'ECHO-VIP-500' ? 'COPIED ✓' : 'COPY'}
                </span>
              </div>
            </div>

            {/* 3. Alumni Mentorship */}
            <div style={{ border: `1px solid ${isDark ? 'rgba(245,179,66,0.3)' : 'rgba(245,179,66,0.25)'}`, borderRadius: '18px', background: isDark ? 'linear-gradient(145deg, rgba(245,179,66,0.08) 0%, #14141F 100%)' : 'linear-gradient(145deg, rgba(245,179,66,0.05) 0%, #FFFFFF 100%)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: isDark ? '#F59E0B' : '#D97706' }}>ALUMNI MENTORSHIP</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#F59E0B' : '#D97706', background: isDark ? 'rgba(245,179,66,0.12)' : 'rgba(245,179,66,0.10)', border: '1px solid rgba(245,179,66,0.3)', borderRadius: '6px', padding: '4px 8px' }}>POPULAR</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: C.textPrimary }}>1-on-1 Mentor Session Credit</div>
              
              <div style={{ background: C.proTipBg, border: `1px solid ${C.proTipBorder}`, borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, marginBottom: '4px' }}>PRO TIP</div>
                <div style={{ fontSize: '13px', color: C.proTipText, lineHeight: 1.5 }}>
                  Prepare 3 specific domain questions before booking a 1-on-1 session to receive direct referral recommendations.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px dashed ${isDark ? 'rgba(245,179,66,0.4)' : 'rgba(245,179,66,0.5)'}`, borderRadius: '12px', padding: '12px 14px', background: isDark ? 'rgba(245,179,66,0.06)' : 'rgba(245,179,66,0.04)' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: isDark ? '#FFF' : '#B45309', fontFamily: 'monospace' }}>MENTOR-100-FREE</div>
                  <div style={{ fontSize: '11.5px', color: C.textSecondary }}>100% OFF First 1-on-1 Booking</div>
                </div>
                <span
                  onClick={() => {
                    if (navigator.clipboard) navigator.clipboard.writeText('MENTOR-100-FREE');
                    setCopiedCoupon('MENTOR-100-FREE');
                    setTimeout(() => setCopiedCoupon(null), 2500);
                  }}
                  style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#F59E0B' : '#D97706', cursor: 'pointer', background: isDark ? 'rgba(245,179,66,0.18)' : 'rgba(245,179,66,0.12)', borderRadius: '6px', padding: '6px 12px' }}
                >
                  {copiedCoupon === 'MENTOR-100-FREE' ? 'COPIED ✓' : 'COPY'}
                </span>
              </div>
            </div>

            {/* 4. Startups & Incubator */}
            <div style={{ border: `1px solid ${C.perkBorder}`, borderRadius: '18px', background: C.perkBg, padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: isDark ? '#A78BFA' : '#7C5CFC' }}>STARTUPS & INCUBATOR</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#A78BFA' : '#7C5CFC', background: isDark ? 'rgba(124,92,252,0.15)' : 'rgba(124,92,252,0.10)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '6px', padding: '4px 8px' }}>GRANT PERK</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: C.textPrimary }}>$1,000 Cloud Credits & Legal Support</div>
              
              <div style={{ background: C.proTipBg, border: `1px solid ${C.proTipBorder}`, borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, marginBottom: '4px' }}>PRO TIP</div>
                <div style={{ fontSize: '13px', color: C.proTipText, lineHeight: 1.5 }}>
                  Submit your prototype pitch deck before Friday to qualify for the $5,000 SA Innovation Seed Grant.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px dashed ${isDark ? '#4B3FA8' : '#A78BFA'}`, borderRadius: '12px', padding: '12px 14px', background: isDark ? 'rgba(124,92,252,0.06)' : 'rgba(124,92,252,0.04)' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: isDark ? '#FFF' : '#6D28D9', fontFamily: 'monospace' }}>AWS-CLOUD-1000</div>
                  <div style={{ fontSize: '11.5px', color: C.textSecondary }}>$1,000 AWS & Cloud Vouchers</div>
                </div>
                <span
                  onClick={() => {
                    if (navigator.clipboard) navigator.clipboard.writeText('AWS-CLOUD-1000');
                    setCopiedCoupon('AWS-CLOUD-1000');
                    setTimeout(() => setCopiedCoupon(null), 2500);
                  }}
                  style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#A78BFA' : '#7C5CFC', cursor: 'pointer', background: isDark ? 'rgba(124,92,252,0.18)' : 'rgba(124,92,252,0.12)', borderRadius: '6px', padding: '6px 12px' }}
                >
                  {copiedCoupon === 'AWS-CLOUD-1000' ? 'COPIED ✓' : 'COPY'}
                </span>
              </div>
            </div>

            {/* 5. Student Health & SA Care */}
            <div style={{ border: `1px solid ${isDark ? 'rgba(52,211,153,0.3)' : 'rgba(52,211,153,0.25)'}`, borderRadius: '18px', background: isDark ? 'linear-gradient(145deg, rgba(52,211,153,0.08) 0%, #14141F 100%)' : 'linear-gradient(145deg, rgba(52,211,153,0.05) 0%, #FFFFFF 100%)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: isDark ? '#34D399' : '#059669' }}>STUDENT HEALTH & CARE</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#34D399' : '#059669', background: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', padding: '4px 8px' }}>WELLNESS PERK</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: C.textPrimary }}>Annual Health & Telehealth Pass</div>
              
              <div style={{ background: C.proTipBg, border: `1px solid ${C.proTipBorder}`, borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, marginBottom: '4px' }}>PRO TIP</div>
                <div style={{ fontSize: '13.5px', color: C.proTipText, lineHeight: 1.5 }}>
                  Schedule your annual preventive health checkup on campus to claim your free fitness & wellness passes.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px dashed ${isDark ? 'rgba(52,211,153,0.4)' : 'rgba(52,211,153,0.5)'}`, borderRadius: '12px', padding: '12px 14px', background: isDark ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.04)' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: isDark ? '#FFF' : '#047857', fontFamily: 'monospace' }}>CARE-CHECKUP-FREE</div>
                  <div style={{ fontSize: '11.5px', color: C.textSecondary }}>100% Covered Dental & Health Scan</div>
                </div>
                <span
                  onClick={() => {
                    if (navigator.clipboard) navigator.clipboard.writeText('CARE-CHECKUP-FREE');
                    setCopiedCoupon('CARE-CHECKUP-FREE');
                    setTimeout(() => setCopiedCoupon(null), 2500);
                  }}
                  style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#34D399' : '#059669', cursor: 'pointer', background: isDark ? 'rgba(52,211,153,0.18)' : 'rgba(52,211,153,0.12)', borderRadius: '6px', padding: '6px 12px' }}
                >
                  {copiedCoupon === 'CARE-CHECKUP-FREE' ? 'COPIED ✓' : 'COPY'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
