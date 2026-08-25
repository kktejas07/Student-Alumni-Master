import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Shield, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  onTabChange?: (tab: 'home' | 'verify' | 'contact') => void;
}

export function Footer({ onTabChange }: FooterProps) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');

  const handleSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setTimeout(() => {
      setSubscribed(false);
      setEmail('');
    }, 3000);
  };

  return (
    <footer className="relative bg-[#05060D] border-t border-white/10 pt-16 pb-16 text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <svg width="28" height="32" viewBox="0 0 300 350" className="flex-shrink-0">
                <defs>
                  <linearGradient id="sa-foot-badge" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#C9A7FF" />
                    <stop offset="48%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#5B2FD0" />
                  </linearGradient>
                </defs>
                <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#sa-foot-badge)" />
                <text x="150" y="214" textAnchor="middle" className="font-sans text-[118px] font-extrabold fill-white">
                  SA
                </text>
              </svg>
              <span className="text-xl font-bold tracking-tight">StudentAlumni</span>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              The intelligent career companion built for the <strong className="text-white">next generation</strong> of students.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 rounded-xl bg-[#0E1020] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#8B84FF] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-xl bg-[#0E1020] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#8B84FF] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Resources Column */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Resources</div>
            <div>
              <button
                onClick={() => onTabChange ? onTabChange('verify') : router.push('/certificates/verify')}
                className="text-gray-300 hover:text-white transition-colors cursor-pointer text-left"
              >
                Verify Certificate
              </button>
            </div>
            <div>
              <button
                onClick={() => router.push('/blogs')}
                className="text-gray-300 hover:text-white transition-colors cursor-pointer text-left"
              >
                Blog
              </button>
            </div>
            <div>
              <button
                onClick={() => router.push('/help-center')}
                className="text-gray-300 hover:text-white transition-colors cursor-pointer text-left"
              >
                Help center
              </button>
            </div>
            <div>
              <button
                onClick={() => router.push('/community')}
                className="text-gray-300 hover:text-white transition-colors cursor-pointer text-left"
              >
                Community
              </button>
            </div>
          </div>

          {/* Legal Column */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Legal</div>
            <div>
              <button
                onClick={() => router.push('/policy/privacy')}
                className="text-gray-300 hover:text-white transition-colors cursor-pointer text-left"
              >
                Privacy &amp; Terms
              </button>
            </div>
            <div>
              <button
                onClick={() => router.push('/policy/security')}
                className="text-gray-300 hover:text-white transition-colors cursor-pointer text-left"
              >
                Security &amp; Cookies
              </button>
            </div>
          </div>

          {/* Compliance Column */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Compliance</div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>DPDP Act 2023</span>
              </div>
              <div className="text-[11px] text-gray-500 pl-5.5">India · data principal rights</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>GDPR</span>
              </div>
              <div className="text-[11px] text-gray-500 pl-5.5">EU · lawful basis and DPAs</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="text-[11px] text-gray-500 pl-5.5">Audited controls, annual</div>
            </div>
            <div className="pt-1">
              <button
                onClick={() => router.push('/policy/security')}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#8B84FF] hover:underline cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Responsible disclosure</span>
              </button>
            </div>
          </div>
        </div>

        {/* Newsletter Subscription Row */}
        <div className="my-10 p-6 rounded-2xl bg-[#0E1020] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="text-base font-bold text-white">One email a month. Nothing else.</div>
            <div className="text-xs text-gray-400 mt-1">New openings, mentor drops and campus events — zero spam.</div>
          </div>

          <form onSubmit={handleSub} className="flex gap-2.5 w-full md:w-auto">
            <input
              type="email"
              required
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-[#12142B] border border-white/10 text-white text-xs outline-none focus:border-[#8B84FF] min-w-[220px]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#5B4FE9] hover:bg-[#4F43D6] text-white transition-all cursor-pointer whitespace-nowrap"
            >
              {subscribed ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          </form>
        </div>

        {/* Bottom Tagline & Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs text-gray-400">
          <div className="text-center sm:text-left">
            <div className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0A6E8] via-[#C08BFF] to-[#6FA8F5]">
              #studentalumni
            </div>
            <div className="mt-1 text-gray-400">
              Built with love for students across all campus's
            </div>
          </div>

          <div className="text-gray-500 text-center sm:text-right">
            All right are recived @ Studt Alumni 2026
          </div>
        </div>
      </div>
    </footer>
  );
}