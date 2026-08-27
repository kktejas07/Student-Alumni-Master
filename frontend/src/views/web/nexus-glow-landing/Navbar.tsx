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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-detect active tab from pathname if prop is not explicitly passed
  let activeTab: 'home' | 'echo' | 'verify' | 'contact' = propActiveTab || 'home';
  if (!propActiveTab) {
    if (pathname === '/' || pathname === '') activeTab = 'home';
    else if (pathname?.includes('/echo')) activeTab = 'echo';
    else if (pathname?.includes('/verify')) activeTab = 'verify';
    else if (pathname?.includes('/contact')) activeTab = 'contact';
    else activeTab = 'home';
  }

  const handleTabClick = (tabKey: 'home' | 'echo' | 'verify' | 'contact') => {
    setMobileOpen(false);
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

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(10, 10, 20, 0.92)',
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
          <svg width="28" height="33" viewBox="0 0 300 350" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="sa-nav-badge" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#C9A7FF" />
                <stop offset="48%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#5B2FD0" />
              </linearGradient>
              <linearGradient id="sa-nav-in" x1="0" y1="0" x2="0.4" y2="1">
                <stop offset="0%" stopColor="#B683F5" />
                <stop offset="100%" stopColor="#7331C9" />
              </linearGradient>
            </defs>
            <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#sa-nav-badge)" />
            <path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#sa-nav-in)" />
            <text x="150" y="214" textAnchor="middle" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '118px', fontWeight: 800, fill: '#FFFFFF' }}>
              SA
            </text>
          </svg>
          <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px', color: '#FFFFFF', fontFamily: "'Outfit', sans-serif" }}>
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
            const isSelected = activeTab === tab.key;
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
                  fontFamily: "'Outfit', sans-serif",
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
                fontFamily: "'Outfit', sans-serif",
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
                  fontFamily: "'Outfit', sans-serif",
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
                  fontFamily: "'Outfit', sans-serif",
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
  );
}

export default Navbar;