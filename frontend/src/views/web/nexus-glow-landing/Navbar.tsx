import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeContext';
import { getBaseUrl } from '@/src/lib/env';

interface NavbarProps {
  activeTab?: 'home' | 'echo' | 'careers' | 'marketplace' | 'verify' | 'contact';
  onTabChange?: (tab: 'home' | 'echo' | 'careers' | 'marketplace' | 'verify' | 'contact') => void;
}

export function Navbar({ activeTab: propActiveTab, onTabChange }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, isDark, setMode } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchFlags = async () => {
      try {
        const base = getBaseUrl();
        const res = await fetch(`${base}/api/public/feature-flags`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.feature_flags) {
            setShowMarketplace(Boolean(data.feature_flags.show_marketplace));
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    };
    fetchFlags();
    return () => {
      isMounted = false;
    };
  }, []);

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
  const [selectedTab, setSelectedTab] = useState<'home' | 'echo' | 'careers' | 'marketplace' | 'verify' | 'contact'>(() => {
    if (propActiveTab) return propActiveTab as any;
    if (pathname?.includes('/careers')) return 'careers';
    if (pathname?.includes('/marketplace')) return 'marketplace';
    if (pathname?.includes('/echo')) return 'echo';
    if (pathname?.includes('/verify')) return 'verify';
    if (pathname?.includes('/contact')) return 'contact';
    return 'home';
  });

  useEffect(() => {
    if (propActiveTab) {
      setSelectedTab(propActiveTab as any);
    } else {
      if (pathname?.includes('/careers')) setSelectedTab('careers');
      else if (pathname?.includes('/marketplace')) setSelectedTab('marketplace');
      else if (pathname?.includes('/echo')) setSelectedTab('echo');
      else if (pathname?.includes('/verify')) setSelectedTab('verify');
      else if (pathname?.includes('/contact')) setSelectedTab('contact');
      else setSelectedTab('home');
    }
  }, [propActiveTab, pathname]);

  const handleTabClick = (tabKey: 'home' | 'echo' | 'careers' | 'marketplace' | 'verify' | 'contact') => {
    setSelectedTab(tabKey);
    setMenuOpen(false);
    if (tabKey === 'careers') {
      router.push('/careers' as any);
      return;
    }
    if (tabKey === 'marketplace') {
      router.push('/marketplace' as any);
      return;
    }
    if (typeof onTabChange === 'function') {
      onTabChange(tabKey as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (tabKey === 'home') router.push('/');
      else if (tabKey === 'echo') router.push('/echo');
      else if (tabKey === 'verify') router.push('/certificates/verify' as any);
      else if (tabKey === 'contact') router.push('/contact' as any);
    }
  };

  const toggleTheme = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  const tabs = [
    { key: 'home' as const, label: 'Home' },
    { key: 'echo' as const, label: 'ECHO' },
    { key: 'careers' as const, label: 'Careers' },
    ...(showMarketplace ? [{ key: 'marketplace' as const, label: 'Marketplace' }] : []),
    { key: 'verify' as const, label: 'Verify' },
    { key: 'contact' as const, label: 'Contact Us' },
  ];

  return (
    <>
      <header
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
            {!isMobile && (
              <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px', color: theme.text, fontFamily: "'Outfit', 'Manrope', sans-serif", transition: 'color 0.3s ease' }}>
                StudentAlumni
              </span>
            )}
          </button>

          {/* Desktop Navigation Tabs — hidden on mobile */}
          {!isMobile && (
            <nav
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '36px',
              }}
            >
              {tabs.map((tab) => {
                const isSelected = selectedTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabClick(tab.key)}
                    style={{
                      position: 'relative',
                      fontSize: '14.5px',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? theme.text : theme.textSec,
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
          )}

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px' }}>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Desktop auth buttons — hidden on mobile */}
            {!isMobile && (
              <>
                <button
                  onClick={() => router.push('/(auth)/login')}
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: theme.textSec,
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

            {/* Hamburger menu button — visible on mobile only */}
            {isMobile && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                {menuOpen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="2" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div
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
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
