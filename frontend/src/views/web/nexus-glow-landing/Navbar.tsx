
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
import { useTheme } from '@/src/theme/ThemeContext';

interface NavbarProps {
  activeTab?: 'home' | 'echo' | 'verify' | 'contact';
  onTabChange?: (tab: 'home' | 'echo' | 'verify' | 'contact') => void;
}

export function Navbar({ activeTab: propActiveTab, onTabChange }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!user;
  const { theme, isDark, setMode } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Track active tab state
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
    setMenuOpen(false);
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
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: isDark ? 'rgba(10, 10, 20, 0.94)' : 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${isDark ? '#1F1F30' : '#E5E5EA'}`,
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            width: '100%',
            margin: '0 auto',
            padding: isMobile ? '0 16px' : '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Unified High-Res SA Shield Badge Logo */}
          <svg width="32" height="38" viewBox="0 0 300 350" style={{ flexShrink: 0, display: 'block', filter: 'drop-shadow(0 2px 8px rgba(139,92,246,0.35))' }}>
            <defs>
              <linearGradient id="saNavGrad1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#C9A7FF" />
                <stop offset="48%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#5B2FD0" />
              </linearGradient>
              <linearGradient id="saNavGrad2" x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0%" stopColor="#B683F5" />
                <stop offset="100%" stopColor="#7331C9" />
              </linearGradient>
            </defs>
            <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#saNavGrad1)" />
            <path d="M150 28 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#saNavGrad2)" />
            <text x="150" y="218" textAnchor="middle" fill="#FFFFFF" fontWeight="900" fontSize="128" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">SA</text>
          </svg>
          <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#FFFFFF', fontFamily: "'Outfit', 'Manrope', -apple-system, sans-serif" }}>
            StudentAlumni<span style={{ color: '#8B5CF6' }}>.ai</span>
          </span>
        </button>

        {/* Center Desktop Navigation Tabs */}
        <nav
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            zIndex: 999,
            backgroundColor: isDark ? 'rgba(10, 10, 20, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: `1px solid ${isDark ? '#1F1F30' : '#E5E5EA'}`,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {tabs.map((tab) => {
            const isSelected = selectedTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#7C5CFC' : theme.text,
                  background: isSelected ? (isDark ? 'rgba(124,92,252,0.1)' : 'rgba(124,92,252,0.06)') : 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontFamily: "'Outfit', 'Manrope', sans-serif",
                }}
              >
                {tab.label}
              </button>
            );
          })}
          {/* Mobile auth buttons */}
          <div style={{ borderTop: `1px solid ${isDark ? '#1F1F30' : '#E5E5EA'}`, marginTop: '8px', paddingTop: '12px', display: 'flex', gap: '10px' }}>
            {isLoggedIn ? (
              <button
                onClick={() => {
                  setMenuOpen(false);
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
                  flex: 1,
                  backgroundColor: '#5B4FE9',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '100px',
                  padding: '10px 20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Outfit', 'Manrope', sans-serif",
                }}
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setMenuOpen(false); router.push('/(auth)/login'); }}
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: theme.text,
                    background: 'transparent',
                    border: `1px solid ${isDark ? '#1F1F30' : '#E5E5EA'}`,
                    borderRadius: '100px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontFamily: "'Outfit', 'Manrope', sans-serif",
                  }}
                >
                  Sign in
                </button>
                <button
                  onClick={() => { setMenuOpen(false); router.push('/get-started'); }}
                  style={{
                    flex: 1,
                    backgroundColor: '#5B4FE9',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '100px',
                    padding: '10px 16px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Outfit', 'Manrope', sans-serif",
                  }}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
    </div>
  );
}

export default Navbar;
