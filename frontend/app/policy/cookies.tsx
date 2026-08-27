import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { Cookie, ShieldCheck, Check, Info, Download } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

const JUMP_SECTIONS = [
  { id: 'ck-0', label: '01. How we treat consent' },
  { id: 'ck-1', label: '02. Manage your preferences' },
  { id: 'ck-2', label: '03. Every cookie we set' },
  { id: 'ck-3', label: '04. Third parties' },
  { id: 'ck-4', label: '05. Other technologies' },
  { id: 'ck-5', label: '06. Browser controls' },
];

export default function CookiePolicyPage() {
  const { width } = useWindowDimensions();
  const [activeSection, setActiveSection] = useState('ck-0');
  const isMobile = width < 860;

  // Scroll spy on Web
  useEffect(() => {
    if (!IS_WEB) return;
    const handleScroll = () => {
      let currentSection = 'ck-0';
      for (const sec of JUMP_SECTIONS) {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140) {
            currentSection = sec.id;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleJump = (id: string) => {
    if (IS_WEB) {
      const el = document.getElementById(id);
      if (el) {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 108,
          behavior: 'smooth',
        });
      }
    }
  };

  return (
    <View style={styles.outerWrap}>
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body, #root { background: #0A0A14 !important; font-family: 'Outfit', sans-serif !important; }
          .policy-glow-left {
            position: absolute; left: -14%; top: -22%; width: 780px; height: 620px;
            background: radial-gradient(circle, rgba(124,92,252,.18), transparent 68%);
            filter: blur(70px);
          }
          .policy-glow-right {
            position: absolute; right: -18%; top: 34%; width: 680px; height: 560px;
            background: radial-gradient(circle, rgba(91,79,233,.13), transparent 70%);
            filter: blur(80px);
          }
          .jump-item[data-on="true"] {
            color: #F4F4FA !important;
            border-left-color: #7C5CFC !important;
          }
        `
      }} />

      {/* Background ambient glows */}
      <View style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <View className="policy-glow-left" />
        <View className="policy-glow-right" />
      </View>

      <Navbar />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <div className="pt-32 pb-20 px-6 max-w-[1400px] mx-auto w-full relative z-10">
          
          {/* Header */}
          <div className="max-w-[780px] mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#34D399] bg-[#34D399]/13 rounded-full px-4 py-1.5 uppercase">
              <Cookie size={13} color="#34D399" />
              LEGAL · COOKIE POLICY
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mt-5 mb-4">
              Cookie Policy & Preferences
            </h1>
            <p className="text-base sm:text-lg text-[#8A8A9E] leading-relaxed mb-6">
              Transparency on how we use essential cookies, local storage tokens, and preference options.
            </p>

            <div className="flex flex-wrap gap-2.5 items-center">
              <span className="text-xs text-[#8A8A9E] border border-[#292940] rounded-full px-3.5 py-1.5">Version 3.0</span>
              <span className="text-xs text-[#8A8A9E] border border-[#292940] rounded-full px-3.5 py-1.5">Effective August 22, 2026</span>
              <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-white border border-[#292940] hover:border-[#7C5CFC] rounded-full px-4 py-1.5 bg-[#11111C] cursor-pointer transition-all">
                <Download size={13} color="currentColor" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className={`grid gap-10 ${isMobile ? 'grid-cols-1' : 'grid-cols-12'}`} style={{ alignItems: 'start' }}>
            
            {/* Sticky Sidebar Navigation (Web) */}
            <div className={`md:col-span-4 ${isMobile ? 'hidden' : 'block'}`} style={{ position: 'sticky', top: 92 }}>
              <div className="text-xs font-bold tracking-wider text-[#6A6A7E] mb-3.5">ON THIS PAGE</div>
              {JUMP_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handleJump(sec.id)}
                  data-on={activeSection === sec.id ? 'true' : 'false'}
                  className="jump-item block text-left text-[13.5px] leading-snug text-[#8A8A9E] hover:text-white border-l-2 border-[#292940] pl-3.5 py-2 cursor-pointer transition-all w-full"
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {/* Document Content */}
            <div className="md:col-span-8 space-y-10 text-[15px] leading-relaxed text-[#8A8A9E] max-w-[780px]">
              
              <div id="ck-0" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">01</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">How we treat consent</h2>
                </div>
                <p>
                  Only strictly necessary cookies are set before you choose. Everything else — analytics, preferences, any future marketing — waits for your consent, and withdrawing it is as easy as giving it.
                </p>
              </div>

              <div id="ck-1" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">02</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Manage your preferences</h2>
                </div>
                <p>
                  You can manage or adjust your consent choices at any time in Profile → Security or directly within browser settings.
                </p>
              </div>

              <div id="ck-2" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">03</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Every cookie we set</h2>
                </div>
                
                <div className="border border-[#292940] rounded-xl overflow-hidden my-4">
                  <div className="grid grid-cols-4 gap-2 bg-[#161622] p-3.5 text-xs font-bold tracking-wider text-[#8A8A9E] uppercase">
                    <div>NAME</div>
                    <div>PURPOSE</div>
                    <div>TYPE</div>
                    <div>EXPIRES</div>
                  </div>
                  {[
                    { n: 'sa_session', p: 'Keeps you signed in', t: 'Necessary', e: 'Session' },
                    { n: 'sa_csrf', p: 'Blocks CSRF attacks', t: 'Necessary', e: 'Session' },
                    { n: 'sa_lb', p: 'Load balancer sticky route', t: 'Necessary', e: '1 hour' },
                    { n: 'sa_consent', p: 'Records cookie choices', t: 'Necessary', e: '12 months' },
                    { n: 'sa_theme', p: 'Dark/light preference', t: 'Preferences', e: '12 months' },
                    { n: 'sa_locale', p: 'Language and region', t: 'Preferences', e: '12 months' },
                    { n: 'sa_anon_id', p: 'De-identified analytics', t: 'Analytics', e: '13 months' },
                    { n: 'sa_ab', p: 'Experiment variant', t: 'Analytics', e: '90 days' },
                  ].map((row, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 border-t border-[#1F1F30] p-3 text-xs sm:text-sm">
                      <span className="font-semibold text-white">{row.n}</span>
                      <span className="text-[#8A8A9E]">{row.p}</span>
                      <span className="text-[#8A8A9E]">{row.t}</span>
                      <span className="text-[#8A8A9E]">{row.e}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div id="ck-3" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">04</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Third parties</h2>
                </div>
                <p>
                  We keep this list short: Razorpay for payments, Cloudflare for CDN & DDoS protection, and DigiLocker / UIDAI for identity verification. No ad brokers or social pixels.
                </p>
              </div>

              <div id="ck-4" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">05</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Other technologies</h2>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span><strong className="text-white font-semibold">Local storage:</strong> Stores draft inputs and roadmap state locally.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span><strong className="text-white font-semibold">Session storage:</strong> Short-lived UI state discarded when tab closes.</span>
                  </div>
                </div>
              </div>

              <div id="ck-5" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">06</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Browser controls</h2>
                </div>
                <p>
                  You can block or delete cookies in your browser settings. Questions: email <span className="text-white font-medium">privacy@studentalumni.ai</span>.
                </p>
              </div>

            </div>
          </div>

        </div>

        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: '#0A0A14',
    minHeight: '100vh' as any,
  },
  scrollContainer: {
    flexGrow: 1,
  },
});
