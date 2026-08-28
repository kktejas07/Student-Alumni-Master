import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { FileText, Check, AlertTriangle, Info, Download } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

const JUMP_SECTIONS = [
  { id: 'tm-0', label: '01. Agreement and eligibility' },
  { id: 'tm-1', label: '02. What the service is — and is not' },
  { id: 'tm-2', label: '03. Your responsibilities' },
  { id: 'tm-3', label: '04. Payments, refunds and cancellations' },
  { id: 'tm-4', label: '05. Your content and our platform' },
  { id: 'tm-5', label: '06. Liability' },
  { id: 'tm-6', label: '07. Suspension, termination and survival' },
  { id: 'tm-7', label: '08. Governing law and disputes' },
];

export default function TermsOfServicePage() {
  const { width } = useWindowDimensions();
  const [activeSection, setActiveSection] = useState('tm-0');
  const isMobile = width < 860;

  // Scroll spy on Web
  useEffect(() => {
    if (!IS_WEB) return;
    const handleScroll = () => {
      let currentSection = 'tm-0';
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

      <SAWatermark fixed={true} right={-60} top={80} opacity={0.12} size={780} glow={true} />
      <Navbar />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <div className="pt-32 pb-20 px-6 max-w-[1400px] mx-auto w-full relative z-10">
          
          {/* Header */}
          <div className="max-w-[780px] mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#A78BFA] bg-[#7C5CFC]/18 rounded-full px-4 py-1.5 uppercase">
              <FileText size={13} color="#A78BFA" />
              LEGAL · TERMS OF USE
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mt-5 mb-4">
              Terms of Use
            </h1>
            <p className="text-base sm:text-lg text-[#8A8A9E] leading-relaxed mb-6">
              Terms and conditions governing your access to StudentAlumni platform, mentor connections, event passes, and AI career tools.
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
              
              <div id="tm-0" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">01</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Agreement and eligibility</h2>
                </div>
                <p>
                  By creating an account you accept these terms. If you are accepting on behalf of a college or company, you confirm you have authority to bind it.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>You must be at least 16 to hold an account in your own name; between 13 and 18 you need verifiable parental consent.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>Student accounts require a verified college affiliation. Alumni accounts require proof of graduation.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>One account per person. Accounts are personal and may not be sold or transferred.</span>
                  </div>
                </div>
              </div>

              <div id="tm-1" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">02</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">What the service is — and is not</h2>
                </div>
                <p>
                  We provide tools: a career roadmap, mentor introductions, job and internship matching, event registration, verified identity and a rentals marketplace.
                </p>
                <div className="flex items-start gap-3 border border-[#2C2A52] rounded-xl bg-[#7C5CFC]/7 p-4">
                  <Info size={16} color="#A78BFA" className="mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">No guarantee of outcome</div>
                    <div className="text-xs sm:text-sm text-[#8A8A9E]">
                      We do not promise a job, an internship, an interview, a referral, a specific salary, admission to any programme, or a particular readiness score. Match percentages and roadmaps are advisory estimates, not commitments by us or by any employer.
                    </div>
                  </div>
                </div>
              </div>

              <div id="tm-2" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">03</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Your responsibilities</h2>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>Keep your information accurate — particularly academic details, which others rely on.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>Do not impersonate anyone, misstate your qualifications, or forge a verification document.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>Do not scrape, crawl, resell or bulk-export data about other users.</span>
                  </div>
                </div>
              </div>

              <div id="tm-3" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">04</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Payments, refunds and cancellations</h2>
                </div>
                <p>
                  Prices are shown inclusive of applicable taxes before you pay. Payments are processed by Razorpay. Event tickets are fully refundable up to 24 hours before the event starts. Mentor sessions are fully refundable if cancelled 12 hours ahead.
                </p>
              </div>

              <div id="tm-4" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">05</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Your content and our platform</h2>
                </div>
                <p>
                  You keep ownership of everything you upload — your resume, projects, photos and posts. You grant us a non-exclusive, royalty-free licence to display that content to operate the service.
                </p>
              </div>

              <div id="tm-5" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">06</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Liability</h2>
                </div>
                <p>
                  Neither party is liable for indirect, incidental, special or consequential loss. Our total aggregate liability is limited to the greater of the amount paid in the preceding 12 months, or INR 5,000.
                </p>
              </div>

              <div id="tm-6" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">07</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Suspension and termination</h2>
                </div>
                <p>
                  You may close your account at any time from Profile → Security. We may terminate on 30 days notice, or immediately for a serious breach.
                </p>
              </div>

              <div id="tm-7" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">08</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Governing law and disputes</h2>
                </div>
                <p>
                  These terms are governed by the laws of India, and the courts at Hyderabad, Telangana have exclusive jurisdiction.
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
