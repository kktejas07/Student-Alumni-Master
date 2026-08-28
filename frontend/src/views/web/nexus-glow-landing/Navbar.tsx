
if (typeof document !== 'undefined' && !document.getElementById('sa-nav-ticker-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'sa-nav-ticker-styles';
  styleEl.innerHTML = `
    @keyframes saNavTickerAnim {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .sa-nav-ticker-track {
      display: flex !important;
      width: max-content !important;
      animation: saNavTickerAnim 30s linear infinite !important;
    }
    .sa-nav-ticker-track:hover {
      animation-play-state: paused !important;
    }
  `;
  document.head.appendChild(styleEl);
}

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

interface NavbarProps {
  activeTab?: 'home' | 'echo' | 'verify' | 'contact';
  onTabChange?: (tab: 'home' | 'echo' | 'verify' | 'contact') => void;
}

export function Navbar({ activeTab: propActiveTab, onTabChange }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!user;

  // Track active tab state so it stays highlighted until user clicks another menu item
  const [selectedTab, setSelectedTab] = useState<'home' | 'echo' | 'verify' | 'contact'>(() => {
    if (propActiveTab) return propActiveTab;
    if (pathname?.includes('/echo')) return 'echo';
    if (pathname?.includes('/verify')) return 'verify';
    if (pathname?.includes('/contact')) return 'contact';
    return 'home';
  });

  useEffect(() => {
    if (propActiveTab) {
      setSelectedTab(propActiveTab);
    } else {
      if (pathname?.includes('/echo')) setSelectedTab('echo');
      else if (pathname?.includes('/verify')) setSelectedTab('verify');
      else if (pathname?.includes('/contact')) setSelectedTab('contact');
      else setSelectedTab('home');
    }
  }, [propActiveTab, pathname]);

  const handleTabClick = (tabKey: 'home' | 'echo' | 'verify' | 'contact') => {
    setSelectedTab(tabKey);
    if (typeof onTabChange === 'function') {
      onTabChange(tabKey);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (tabKey === 'home') router.push('/');
      else if (tabKey === 'echo') router.push('/echo');
      else if (tabKey === 'verify') router.push('/certificates/verify');
      else if (tabKey === 'contact') router.push('/contact');
    }
  };

  const tickerItems = [
    "HackWave 3.0 · Sep 4–5 · Sreenidhi (SNIST) · ₹2,00,000 Mega Grand Pool (₹50,000 Track Pool)",
    "86 ECHO events across 31 campuses",
    "Verified by your college email — free forever for students",
    "267 roles matched, 41 with a warm referral path",
    "The network is a feed until it meets in person",
    "Built with love for students across all campuses"
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
      {/* ── Top Announcement Marquee Ticker Strip ── */}
      <div style={{ background: '#090B18', borderBottom: '1px solid rgba(255,255,255,0.08)', height: '36px', overflow: 'hidden', display: 'flex', alignItems: 'center', width: '100%' }}>
        <div className="sa-nav-ticker-track">
          {tickerItems.concat(tickerItems).map((item, idx) => (
            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 500, fontFamily: "'Outfit', 'Manrope', sans-serif" }}>{item}</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8B5CF6', flex: 'none' }} />
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Sticky Navbar ── */}
      <header
        style={{
          position: 'relative',
          backgroundColor: 'rgba(10, 10, 20, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #1F1F30',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
      <div
        style={{
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <button
          onClick={() => handleTabClick('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'left',
          }}
        >
          {/* 1:1 SA Shield Badge Logo matching bottom screenshot */}
          <svg width="28" height="33" viewBox="0 0 300 350" style={{ flexShrink: 0, display: 'block' }}>
            <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="#8B84FF" />
            <path d="M150 28 L268 64 v112 c0 72 -58 110 -118 132 C90 288 32 250 32 178 V64 Z" fill="#5B4FE9" />
            <text
              x="150"
              y="214"
              textAnchor="middle"
              style={{
                fontFamily: "'Outfit', 'Manrope', -apple-system, sans-serif",
                fontSize: '124px',
                fontWeight: 800,
                fill: '#FFFFFF',
              }}
            >
              SA
            </text>
          </svg>
          <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px', color: '#FFFFFF', fontFamily: "'Outfit', 'Manrope', sans-serif" }}>
            StudentAlumni
          </span>
        </button>

        {/* Center Desktop Navigation Tabs */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '36px',
          }}
        >
          {(
            [
              { key: 'home', label: 'Home' },
              { key: 'echo', label: 'ECHO' },
              { key: 'verify', label: 'Verify' },
              { key: 'contact', label: 'Contact Us' },
            ] as const
          ).map((tab) => {
            const isSelected = selectedTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                style={{
                  position: 'relative',
                  fontSize: '14.5px',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#FFFFFF' : '#8A8A9E',
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 2px',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  fontFamily: "'Outfit', 'Manrope', sans-serif",
                }}
              >
                <span>{tab.label}</span>
                {isSelected && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: '-18px',
                      height: '3px',
                      borderRadius: '2px',
                      backgroundColor: '#7C5CFC',
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {isLoggedIn ? (
            <button
              onClick={() => {
                const role = user?.role || 'student';
                const portal =
                  role === 'super_admin' ? '/super-admin' :
                  role === 'mentor' ? '/mentor-portal' :
                  role === 'alumni' ? '/alumni-portal' :
                  role === 'college' ? '/college-portal' :
                  '/student-portal';
                router.push(portal);
              }}
              style={{
                backgroundColor: '#5B4FE9',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '100px',
                padding: '9px 24px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Outfit', 'Manrope', sans-serif",
                boxShadow: '0 4px 14px rgba(91,79,233,0.35)',
                transition: 'transform 0.2s ease, filter 0.2s ease',
              }}
            >
              Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push('/(auth)/login')}
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#8A8A9E',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 4px',
                  transition: 'color 0.2s ease',
                  fontFamily: "'Outfit', 'Manrope', sans-serif",
                }}
              >
                Sign in
              </button>
              <button
                onClick={() => router.push('/get-started')}
                style={{
                  backgroundColor: '#5B4FE9',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '100px',
                  padding: '9px 24px',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Outfit', 'Manrope', sans-serif",
                  boxShadow: '0 4px 14px rgba(91,79,233,0.35)',
                  transition: 'transform 0.2s ease, filter 0.2s ease',
                }}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
    </div>
  );
}

export default Navbar;