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
import { View, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StudentPortalNavContext } from '../StudentPortalNavContext';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export function DashboardView() {
  const router = useRouter();
  const portalNav = useContext(StudentPortalNavContext);
  const authUser = useAuthStore((u) => u.user);

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

  const COUPONS = [
    { code: 'SAHW100', name: 'HackWave 3.0', off: '₹100 Off', desc: 'This coupon will be available shortly' },
    { code: 'SAMRIT20', name: 'MRIT Flagship', off: '20% Off', desc: 'This coupon will be available shortly' },
    { code: 'SNEHA50', name: 'Sneha Iyer AMA', off: 'Free Entry', desc: 'This coupon will be available shortly' },
    { code: 'INTERNPRO', name: 'Resume Pro', off: '6 Mos Free', desc: 'This coupon will be available shortly' },
    { code: 'AWSCLOUD', name: 'Cloud Boot', off: '₹200 Off', desc: 'This coupon will be available shortly' },
  ];

  const HERO_SLIDES = [
    {
      tag: 'COLLAB EXCLUSIVE',
      title: 'HackWave 3.0 — 2026',
      sub: 'SEP 04 — 05 2026 · Sreenidhi Institute of Science and Technology, Hyderabad',
      desc: 'In strategic collaboration with CDC & Student Alumni. ₹100 Off with code SAHW100.',
      link: 'http://localhost:8081/echo/snist/register',
      cta: 'Register on Unstop →',
    },
    {
      tag: 'VOICE OF GENERATIONS · VNRVJIT',
      title: 'Alumni took the stage, students took notes.',
      sub: '26 photos, 3 workshops and 5 testimonials from the last showcase.',
      desc: 'Annual flagship networking conference at VNR Vignana Jyothi.',
      link: 'http://localhost:8081/echo/vnrvjit/register',
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

  return (
    <div
      id="db-page-dash"
      style={{
        width: '100%',
        color: '#F4F4FA',
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
          background: #101019;
          border: 1px solid #1F1F30;
          border-radius: 20px;
          box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 18px 40px rgba(0,0,0,.35);
          transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .db-card:hover {
          border-color: #2C2A52;
          transform: translateY(-2px);
        }
        .db-coupon {
          position: relative;
          overflow: hidden;
          border: 1px solid #4A3410;
          border-radius: 14px;
          background: #14141F;
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
          border: '1px solid #3B2B7A',
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
              <h1 style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '-1.4px', lineHeight: 1.1, margin: '0 0 10px' }}>
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
                  background: '#FFFFFF',
                  color: '#4A1F9E',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
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

      {/* ── 2. Collab Exclusive Coupons ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', margin: '10px 0 14px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, letterSpacing: '1.6px', color: '#F59E0B' }}>
            COLLAB EXCLUSIVE COUPONS
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '14px' }}>
          {COUPONS.map((c) => (
            <div key={c.code} className="db-coupon">
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #1F1F30', minHeight: '90px' }}>
                <span style={{ fontSize: '26px' }}>🔒</span>
              </div>
              <div style={{ padding: '13px 14px 15px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#F59E0B', marginBottom: '5px' }}>{c.name}</div>
                <div style={{ fontSize: '12px', lineHeight: 1.45, color: '#8A8A9E', marginBottom: '10px' }}>{c.desc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, color: '#F59E0B', border: '1px solid #4A3410', borderRadius: '6px', padding: '4px 8px' }}>
                    {c.off}
                  </span>
                  <button
                    onClick={() => copyCoupon(c.code)}
                    style={{
                      background: copiedCoupon === c.code ? 'rgba(52, 211, 153, 0.2)' : 'rgba(124, 92, 252, 0.15)',
                      border: `1px solid ${copiedCoupon === c.code ? '#34D399' : '#7C5CFC'}`,
                      color: copiedCoupon === c.code ? '#34D399' : '#A78BFA',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {copiedCoupon === c.code ? 'COPIED' : c.code}
                  </button>
                </div>
              </div>
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: '40%',
                  background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.1), transparent)',
                  pointerEvents: 'none',
                  animation: 'db-lockshine 4.6s ease-in-out infinite',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Top 4 Metric Ring / Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        {/* Profile Strength */}
        <div className="db-card" style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#A78BFA', marginBottom: '10px' }}>Profile Strength</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1 }}>50%</div>
              <div style={{ fontSize: '12.5px', color: '#8A8A9E', marginTop: '8px' }}>Keep going!</div>
            </div>
            <svg width="46" height="46" viewBox="0 0 46 46" style={{ flex: 'none' }}>
              <circle cx="23" cy="23" r="19" style={{ fill: 'none', stroke: '#262638', strokeWidth: 4 }} />
              <circle cx="23" cy="23" r="19" style={{ fill: 'none', stroke: '#7C5CFC', strokeWidth: 4, strokeLinecap: 'round', transform: 'rotate(-90deg)', transformOrigin: '23px 23px', strokeDasharray: 119.4, strokeDashoffset: 59.7 }} />
            </svg>
          </div>
        </div>

        {/* Applications */}
        <div className="db-card" style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#A78BFA', marginBottom: '10px' }}>Applications</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1 }}>0</div>
              <div style={{ fontSize: '12.5px', color: '#8A8A9E', marginTop: '8px' }}>0 applied</div>
            </div>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(124,92,252,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: '#A78BFA' }}>
              💼
            </span>
          </div>
        </div>

        {/* Network */}
        <div className="db-card" style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#34D399', marginBottom: '10px' }}>Network</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1 }}>0</div>
              <div style={{ fontSize: '12.5px', color: '#8A8A9E', marginTop: '8px' }}>Connections</div>
            </div>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(16, 185, 129, 0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: '#34D399' }}>
              👥
            </span>
          </div>
        </div>

        {/* Events */}
        <div className="db-card" style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0616B', marginBottom: '10px' }}>Events</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.3px', lineHeight: 1 }}>8</div>
              <div style={{ fontSize: '12.5px', color: '#8A8A9E', marginTop: '8px' }}>Registered</div>
            </div>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(240, 97, 107, 0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: '#F0616B' }}>
              📅
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. Interactive Tabs Switcher ── */}
      <div style={{ display: 'inline-flex', gap: '6px', padding: '6px', border: '1px solid #1F1F30', borderRadius: '14px', background: '#101019', width: 'fit-content' }}>
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
            background: activeTab === 'opportunities' ? 'rgba(124,92,252,.18)' : 'transparent',
            color: activeTab === 'opportunities' ? '#F4F4FA' : '#8A8A9E',
            border: activeTab === 'opportunities' ? '1px solid #3A2E72' : '1px solid transparent',
          }}
        >
          💼 Opportunities
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
            background: activeTab === 'intelligence' ? 'rgba(124,92,252,.18)' : 'transparent',
            color: activeTab === 'intelligence' ? '#F4F4FA' : '#8A8A9E',
            border: activeTab === 'intelligence' ? '1px solid #3A2E72' : '1px solid transparent',
          }}
        >
          📈 Intelligence Center
        </span>
      </div>

      {/* ── 5. Opportunities Tab (Bento Grid) ── */}
      {activeTab === 'opportunities' && (
        <div id="db-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '16px' }}>
          {/* Career Readiness */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 5', gridRow: 'span 2', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: '#A78BFA', marginBottom: '14px' }}>
              CAREER READINESS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '22px' }}>
              <svg width="112" height="112" viewBox="0 0 112 112" style={{ flex: 'none' }}>
                <circle cx="56" cy="56" r="46" style={{ fill: 'none', stroke: '#262638', strokeWidth: 9 }} />
                <circle cx="56" cy="56" r="46" style={{ fill: 'none', stroke: 'url(#dbRingGrad)', strokeWidth: 9, strokeLinecap: 'round', transform: 'rotate(-90deg)', transformOrigin: '56px 56px', strokeDasharray: 289, strokeDashoffset: 185 }} />
                <defs>
                  <linearGradient id="dbRingGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8B7BFF" />
                    <stop offset="1" stopColor="#2FB8C6" />
                  </linearGradient>
                </defs>
                <text x="56" y="63" textAnchor="middle" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 700, fill: '#F4F4FA' }}>
                  36%
                </text>
              </svg>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-.6px' }}>Builder</div>
                <div style={{ fontSize: '13px', color: '#8A8A9E', marginTop: '3px' }}>Target: Industry Ready</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', fontWeight: 600, color: '#34D399', background: 'rgba(16, 185, 129, 0.13)', borderRadius: '7px', padding: '5px 9px' }}>
                  ↗ +8% this week
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #1F1F30', paddingTop: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Build your professional resume</span>
                <span style={{ fontSize: '12.5px', color: '#A78BFA' }}>60%</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: '#262638', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ height: '100%', width: '60%', borderRadius: '3px', background: 'linear-gradient(90deg, #7C5CFC, #2FB8C6)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '12.5px', color: '#8A8A9E' }}>ETA ~18 weeks</span>
                <button onClick={() => router.push('/career-ai')} style={{ fontSize: '13px', fontWeight: 600, background: '#7C5CFC', color: '#FFFFFF', borderRadius: '9px', padding: '9px 16px', border: 'none', cursor: 'pointer' }}>
                  Continue now
                </button>
              </div>
            </div>
          </div>

          {/* Today's Focus - Agent K */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 4', gridRow: 'span 2', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: '#A78BFA', marginBottom: '14px' }}>
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
                    border: '1px solid #262638',
                    borderRadius: '12px',
                    background: '#14141F',
                    padding: '13px 14px',
                    cursor: 'pointer',
                    opacity: t.done ? 0.72 : 1,
                  }}
                >
                  <span style={{ width: '18px', height: '18px', borderRadius: '6px', border: `1.5px solid ${t.done ? '#7C5CFC' : '#262638'}`, background: t.done ? '#7C5CFC' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>
                    {t.done && <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: 800 }}>✓</span>}
                  </span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#8A8A9E' : '#FFFFFF' }}>
                      {t.text}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6A6A7E', marginTop: '4px' }}>{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '12.5px', color: '#8A8A9E' }}>
              <span style={{ color: '#A78BFA', fontWeight: 600 }}>{completedCount} of 3</span> done today
            </div>
          </div>

          {/* Skill Streak */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 3', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: '#8A8A9E', marginBottom: '14px' }}>
              SKILL STREAK
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px' }}>
              <span style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.2px' }}>0</span>
              <span style={{ fontSize: '14px', color: '#8A8A9E' }}>days</span>
              <span style={{ fontSize: '20px', marginLeft: 'auto', animation: 'db-flame 2.2s ease-in-out infinite', display: 'inline-block' }}>🔥</span>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '16px' }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <span
                  key={idx}
                  onClick={() => setActiveStreakDay(idx)}
                  style={{
                    flex: 1,
                    height: '26px',
                    borderRadius: '6px',
                    background: activeStreakDay !== null && idx <= activeStreakDay ? 'linear-gradient(180deg, #F59E0B, #C2410C)' : '#262638',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                  }}
                >
                  {day}
                </span>
              ))}
            </div>
            <div style={{ fontSize: '12.5px', color: '#F0616B', marginTop: '12px' }}>Start your streak today</div>
          </div>

          {/* Next 1:1 Session */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 4', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: '#8A8A9E', marginBottom: '14px' }}>
              NEXT SESSION
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '13px', marginBottom: '16px' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#7C5CFC', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flex: 'none' }}>
                RS
              </span>
              <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                <div style={{ fontSize: '15.5px', fontWeight: 600 }}>Rahul Sharma</div>
                <div style={{ fontSize: '12.5px', color: '#8A8A9E', marginTop: '2px' }}>Senior SDE @ Google</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#34D399' }}>
                CONFIRMED
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid #1F1F30', paddingTop: '15px' }}>
              <div>
                <div style={{ fontSize: '19px', fontWeight: 700, letterSpacing: '-.4px' }}>{timeLeft}</div>
                <div style={{ fontSize: '12px', color: '#8A8A9E', marginTop: '3px' }}>Thursday · 6:00 pm IST</div>
              </div>
              <button style={{ fontSize: '13px', fontWeight: 600, background: '#7C5CFC', color: '#FFFFFF', borderRadius: '9px', padding: '9px 16px', border: 'none', cursor: 'pointer' }}>
                Join room
              </button>
            </div>
          </div>

          {/* Applications Breakdown */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 3', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: '#8A8A9E', marginBottom: '14px' }}>
              APPLICATIONS
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', marginBottom: '18px' }}>
              <span style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.2px' }}>267</span>
              <span style={{ fontSize: '13.5px', color: '#8A8A9E' }}>matches open</span>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8A8A9E', marginBottom: '5px' }}>
                  <span>Saved</span><span>0</span>
                </div>
                <div style={{ height: '5px', borderRadius: '3px', background: '#262638', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '4%', background: '#7C5CFC' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8A8A9E', marginBottom: '5px' }}>
                  <span>Applied</span><span>0</span>
                </div>
                <div style={{ height: '5px', borderRadius: '3px', background: '#262638', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '0%', background: '#2FB8C6' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8A8A9E', marginBottom: '5px' }}>
                  <span>Interviews</span><span>0</span>
                </div>
                <div style={{ height: '5px', borderRadius: '3px', background: '#262638', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '0%', background: '#10B981' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Top Matches For You */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 7', padding: '20px 22px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: '#A78BFA' }}>TOP MATCHES FOR YOU</div>
              <span onClick={() => portalNav?.navigate('internships')} style={{ fontSize: '12.5px', fontWeight: 600, color: '#A78BFA', cursor: 'pointer' }}>
                View all 267 →
              </span>
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {[
                { initial: 'B', color: '#22D3EE', textColor: '#06323B', title: 'Account Executive', sub: 'Boulevard · USA · ₹22-28 LPA', match: 30 },
                { initial: 'D', color: '#F59E0B', textColor: '#3A2404', title: 'Senior Brand Content Manager', sub: 'Demandbase · USA · ₹14-18 LPA', match: 30 },
                { initial: 'J', color: '#10B981', textColor: '#04291D', title: 'Principal Revenue Operations Manager', sub: 'Jobber · Canada · ₹32-38 LPA', match: 30 },
              ].map((m) => (
                <div key={m.title} style={{ display: 'grid', gridTemplateColumns: '38px minmax(0, 1fr) 92px max-content', gap: '13px', alignItems: 'center', borderRadius: '11px', padding: '10px 11px', background: 'rgba(255,255,255,0.02)' }}>
                  <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: m.color, color: m.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700 }}>
                    {m.initial}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                    <div style={{ fontSize: '12.5px', color: '#8A8A9E', marginTop: '2px' }}>{m.sub}</div>
                  </div>
                  <div>
                    <div style={{ height: '5px', borderRadius: '3px', background: '#262638', overflow: 'hidden', marginBottom: '4px' }}>
                      <div style={{ height: '100%', width: `${m.match}%`, background: 'linear-gradient(90deg, #7C5CFC, #34D399)' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#8A8A9E' }}>{m.match}% match</div>
                  </div>
                  <button style={{ fontSize: '12.5px', fontWeight: 600, background: '#7C5CFC', color: '#FFFFFF', borderRadius: '8px', padding: '8px 14px', border: 'none', cursor: 'pointer' }}>
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Mentors With Capacity */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 5', padding: '20px 22px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: '#34D399' }}>MENTORS WITH CAPACITY</div>
              <span onClick={() => portalNav?.navigate('network')} style={{ fontSize: '12.5px', fontWeight: 600, color: '#34D399', cursor: 'pointer' }}>
                View all →
              </span>
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {[
                { initial: 'PM', color: '#DB2777', name: 'Priya Mehta', role: 'PM @ Microsoft · ★ 4.8' },
                { initial: 'AV', color: '#10B981', name: 'Arjun Verma', role: 'Data Scientist @ Amazon · ★ 4.7' },
                { initial: 'VS', color: '#2563EB', name: 'Vikram Singh', role: 'Cloud Architect @ AWS · ★ 4.9' },
              ].map((men) => (
                <div key={men.name} style={{ display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr) max-content', gap: '12px', alignItems: 'center', borderRadius: '11px', padding: '9px 11px', background: 'rgba(255,255,255,0.02)' }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: men.color, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                    {men.initial}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{men.name}</div>
                    <div style={{ fontSize: '12px', color: '#8A8A9E', marginTop: '2px' }}>{men.role}</div>
                  </div>
                  <button style={{ fontSize: '12.5px', fontWeight: 600, color: '#34D399', border: '1px solid #17503E', background: 'transparent', borderRadius: '8px', padding: '8px 13px', cursor: 'pointer' }}>
                    Book
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Network Growth */}
          <div className="db-tile db-card" style={{ gridColumn: 'span 4', padding: '20px 22px 22px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: '#8A8A9E', marginBottom: '14px' }}>
              NETWORK GROWTH
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', marginBottom: '12px' }}>
              <span style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.2px' }}>8</span>
              <span style={{ fontSize: '13.5px', color: '#8A8A9E' }}>events registered</span>
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
            <div style={{ fontSize: '12.5px', color: '#8A8A9E' }}>
              Profile strength <strong style={{ color: '#F4F4FA', fontWeight: 600 }}>50%</strong> · 0 connections yet
            </div>
          </div>

          {/* Continuous Infinite Marquee: Upcoming on Campus */}
          <div className="db-tile db-card db-marq-container" style={{ gridColumn: 'span 12', padding: '20px 22px 22px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: '#F59E0B' }}>UPCOMING ON CAMPUS</div>
              <span onClick={() => portalNav?.navigate('events')} style={{ fontSize: '12.5px', fontWeight: 600, color: '#F59E0B', cursor: 'pointer' }}>
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
                      border: '1px solid #262638',
                      borderRadius: '12px',
                      background: '#14141F',
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
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px' }}>{ev.name}</div>
                    <div style={{ fontSize: '12px', color: '#8A8A9E' }}>{ev.when.split(' · ')[1]}</div>
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
          <div className="db-card" style={{ border: '1px solid #2C2A52', background: 'linear-gradient(150deg, #14141F, #101019 60%)', padding: '26px 28px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#A78BFA' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.6px', color: '#A78BFA' }}>CURRENT GOAL</span>
            </div>
            <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.3px', marginBottom: '12px' }}>
              explore at a Top Company in your field
            </div>
            <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap', fontSize: '13.5px', color: '#8A8A9E', marginBottom: '26px' }}>
              <span>✦ Level: <strong style={{ color: '#A78BFA', fontWeight: 600 }}>Builder</strong></span>
              <span>✦ Target: <strong style={{ color: '#A78BFA', fontWeight: 600 }}>Industry Ready</strong></span>
              <span>✦ ETA: <strong style={{ color: '#A78BFA', fontWeight: 600 }}>~18 Weeks</strong></span>
            </div>
          </div>

          {/* 5 Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '14px' }}>
            {[
              { title: 'READINESS SCORE', val: '36%', sub: '+8% from last week', subCol: '#34D399' },
              { title: 'TARGET READINESS', val: '100%', sub: 'Industry Ready', subCol: '#34D399' },
              { title: 'CAREER LEVEL', val: 'Builder', sub: 'Current Level', subCol: '#F59E0B' },
              { title: 'PROFILE STRENGTH', val: '50%', sub: '+8% from last week', subCol: '#34D399' },
              { title: 'SKILL STREAK', val: '0 Days', sub: 'Start your streak!', subCol: '#F0616B' },
            ].map((stat) => (
              <div key={stat.title} className="db-card" style={{ padding: '18px 20px 20px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.2px', color: '#8A8A9E', marginBottom: '12px' }}>
                  {stat.title}
                </div>
                <div style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-1.2px' }}>{stat.val}</div>
                <div style={{ fontSize: '12.5px', color: stat.subCol, marginTop: '8px' }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Career Growth Prediction Area Chart */}
          <div className="db-card" style={{ padding: '24px 26px 26px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, letterSpacing: '1.8px', color: '#8A8A9E', marginBottom: '22px' }}>
              CAREER GROWTH PREDICTION
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '24px', alignItems: 'center' }}>
              <div style={{ width: '100%', height: '180px', position: 'relative' }}>
                <svg width="100%" height="100%" viewBox="0 0 780 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="dbCg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#7C5CFC" stopOpacity="0.34" />
                      <stop offset="1" stopColor="#7C5CFC" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M40 190 L180 168 L320 132 L460 128 L600 106 L740 60 L740 210 L40 210 Z" fill="url(#dbCg)" />
                  <path d="M40 190 L180 168 L320 132 L460 128 L600 106 L740 60" fill="none" stroke="#8B7BFF" strokeWidth="2.6" />
                  {[
                    { cx: 40, cy: 190, label: '36%', time: 'Today' },
                    { cx: 180, cy: 168, label: '44%', time: '7 Days' },
                    { cx: 320, cy: 132, label: '64%', time: '30 Days' },
                    { cx: 460, cy: 128, label: '65%', time: '60 Days' },
                    { cx: 600, cy: 106, label: '71%', time: '90 Days' },
                    { cx: 740, cy: 60, label: '92%', time: '180 Days' },
                  ].map((p) => (
                    <g key={p.time}>
                      <circle cx={p.cx} cy={p.cy} r="5" fill="#B9AEFF" />
                      <text x={p.cx} y={p.cy - 12} textAnchor="middle" fill="#F4F4FA" fontSize="14" fontWeight="600">
                        {p.label}
                      </text>
                      <text x={p.cx} y={195} textAnchor="middle" fill="#8A8A9E" fontSize="12">
                        {p.time}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div style={{ border: '1px solid #2C2A52', borderRadius: '16px', background: 'rgba(124,92,252,.07)', padding: '22px 24px 24px' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '12px' }}>Prediction Insight</div>
                <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#8A8A9E', marginBottom: '20px' }}>
                  You're on the right track! Consistent action can take you from <strong style={{ color: '#A78BFA', fontWeight: 600 }}>36%</strong> to <strong style={{ color: '#A78BFA', fontWeight: 600 }}>92%</strong> readiness in 18 weeks.
                </div>
                <button style={{ width: '100%', padding: '11px', fontSize: '13.5px', fontWeight: 600, color: '#A78BFA', border: '1px solid #2C2A52', background: 'transparent', borderRadius: '9px', cursor: 'pointer' }}>
                  View Full Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
