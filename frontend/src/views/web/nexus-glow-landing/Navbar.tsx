import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'expo-router';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

interface NavbarProps {
  activeTab?: 'home' | 'verify' | 'contact';
  onTabChange?: (tab: 'home' | 'verify' | 'contact') => void;
}

export function Navbar({ activeTab = 'home', onTabChange }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!user;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY || document.documentElement.scrollTop || 0;
      setScrolled(top > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleTabClick = (tabKey: 'home' | 'verify' | 'contact') => {
    setMobileOpen(false);
    if (typeof onTabChange === 'function') {
      onTabChange(tabKey);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (tabKey === 'home') router.push('/');
      else if (tabKey === 'verify') router.push('/certificates/verify');
      else if (tabKey === 'contact') router.push('/contact');
    }
  };

  const goToEcho = () => {
    setMobileOpen(false);
    router.push('/echo');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen
          ? 'py-3 bg-[#05060F]/90 backdrop-blur-lg border-b border-white/10 shadow-2xl'
          : 'py-5 bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <button
            onClick={() => handleTabClick('home')}
            className="flex items-center gap-3 cursor-pointer text-left"
          >
            <svg width="28" height="33" viewBox="0 0 300 350" className="flex-shrink-0">
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
              <text x="150" y="214" textAnchor="middle" className="font-sans text-[118px] font-extrabold fill-white">
                SA
              </text>
            </svg>
            <span className="text-base font-extrabold tracking-tight text-white">
              StudentAlumni
            </span>
          </button>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => handleTabClick('home')}
              className={`relative py-1 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'home' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Home</span>
              {activeTab === 'home' && (
                <motion.div
                  layoutId="navTabUnderline"
                  className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[#8B84FF] rounded-full"
                />
              )}
            </button>

            <button
              onClick={goToEcho}
              className="relative py-1 text-sm font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>ECHO</span>
            </button>

            <button
              onClick={() => handleTabClick('verify')}
              className={`relative py-1 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'verify' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Verify</span>
              {activeTab === 'verify' && (
                <motion.div
                  layoutId="navTabUnderline"
                  className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[#8B84FF] rounded-full"
                />
              )}
            </button>

            <button
              onClick={() => handleTabClick('contact')}
              className={`relative py-1 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'contact' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Contact Us</span>
              {activeTab === 'contact' && (
                <motion.div
                  layoutId="navTabUnderline"
                  className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[#8B84FF] rounded-full"
                />
              )}
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
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
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#5B4FE9] hover:bg-[#4F43D6] text-white transition-all cursor-pointer"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push('/(auth)/login')}
                  className="hidden sm:inline-block text-xs font-bold text-gray-300 hover:text-white px-3 py-2 cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  onClick={() => router.push('/get-started')}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#5B4FE9] hover:bg-[#4F43D6] shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
                >
                  Get Started
                </button>
              </>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0C0C0D] border-b border-white/10 overflow-hidden px-6 py-5 space-y-3"
          >
            <button
              onClick={() => handleTabClick('home')}
              className={`block w-full text-left py-2 text-sm font-semibold ${
                activeTab === 'home' ? 'text-[#8B84FF]' : 'text-gray-300'
              }`}
            >
              Home
            </button>
            <button
              onClick={goToEcho}
              className="block w-full text-left py-2 text-sm font-semibold text-gray-300"
            >
              ECHO
            </button>
            <button
              onClick={() => handleTabClick('verify')}
              className={`block w-full text-left py-2 text-sm font-semibold ${
                activeTab === 'verify' ? 'text-[#8B84FF]' : 'text-gray-300'
              }`}
            >
              Verify Certificate
            </button>
            <button
              onClick={() => handleTabClick('contact')}
              className={`block w-full text-left py-2 text-sm font-semibold ${
                activeTab === 'contact' ? 'text-[#8B84FF]' : 'text-gray-300'
              }`}
            >
              Contact Us
            </button>

            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              {!isLoggedIn && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    router.push('/(auth)/login');
                  }}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-bold text-gray-300 border border-white/10"
                >
                  Sign in
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}