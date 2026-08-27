import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'expo-router';
import { Menu, X } from 'lucide-react';
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A14]/90 backdrop-blur-md border-b border-[#1F1F30] py-3.5 transition-all">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <button
            onClick={() => handleTabClick('home')}
            className="flex items-center gap-2.5 cursor-pointer text-left group bg-transparent border-0 p-0"
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
            <span className="text-[17px] font-bold tracking-tight text-white group-hover:text-purple-200 transition-colors">
              StudentAlumni
            </span>
          </button>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => handleTabClick('home')}
              className={`relative py-1 text-[14.5px] font-medium transition-colors cursor-pointer bg-transparent border-0 ${
                activeTab === 'home' ? 'text-white font-bold' : 'text-[#8A8A9E] hover:text-white'
              }`}
            >
              <span>Home</span>
              {activeTab === 'home' && (
                <motion.div
                  layoutId="navTabUnderline"
                  className="absolute left-0 right-0 -bottom-[15px] h-[2.5px] bg-[#7C5CFC] rounded-full"
                />
              )}
            </button>

            <button
              onClick={() => handleTabClick('echo')}
              className={`relative py-1 text-[14.5px] font-medium transition-colors cursor-pointer bg-transparent border-0 ${
                activeTab === 'echo' ? 'text-white font-bold' : 'text-[#8A8A9E] hover:text-white'
              }`}
            >
              <span>ECHO</span>
              {activeTab === 'echo' && (
                <motion.div
                  layoutId="navTabUnderline"
                  className="absolute left-0 right-0 -bottom-[15px] h-[2.5px] bg-[#7C5CFC] rounded-full"
                />
              )}
            </button>

            <button
              onClick={() => handleTabClick('verify')}
              className={`relative py-1 text-[14.5px] font-medium transition-colors cursor-pointer bg-transparent border-0 ${
                activeTab === 'verify' ? 'text-white font-bold' : 'text-[#8A8A9E] hover:text-white'
              }`}
            >
              <span>Verify</span>
              {activeTab === 'verify' && (
                <motion.div
                  layoutId="navTabUnderline"
                  className="absolute left-0 right-0 -bottom-[15px] h-[2.5px] bg-[#7C5CFC] rounded-full"
                />
              )}
            </button>

            <button
              onClick={() => handleTabClick('contact')}
              className={`relative py-1 text-[14.5px] font-medium transition-colors cursor-pointer bg-transparent border-0 ${
                activeTab === 'contact' ? 'text-white font-bold' : 'text-[#8A8A9E] hover:text-white'
              }`}
            >
              <span>Contact Us</span>
              {activeTab === 'contact' && (
                <motion.div
                  layoutId="navTabUnderline"
                  className="absolute left-0 right-0 -bottom-[15px] h-[2.5px] bg-[#7C5CFC] rounded-full"
                />
              )}
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-4">
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
                className="px-6 py-2.5 rounded-full text-[14px] font-bold bg-[#5B4FE9] hover:bg-[#4F43D6] text-white transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push('/(auth)/login')}
                  className="hidden sm:inline-block text-[14px] font-medium text-[#8A8A9E] hover:text-white px-2 py-1 cursor-pointer transition-colors bg-transparent border-0"
                >
                  Sign in
                </button>
                <button
                  onClick={() => router.push('/get-started')}
                  className="px-6 py-2.5 rounded-full text-[14px] font-bold text-white bg-[#5B4FE9] hover:bg-[#4F43D6] shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 cursor-pointer whitespace-nowrap border-0"
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
            className="md:hidden bg-[#0A0A14] border-b border-[#1F1F30] overflow-hidden px-6 py-5 space-y-3"
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
              onClick={() => handleTabClick('echo')}
              className={`block w-full text-left py-2 text-sm font-semibold ${
                activeTab === 'echo' ? 'text-[#8B84FF]' : 'text-gray-300'
              }`}
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