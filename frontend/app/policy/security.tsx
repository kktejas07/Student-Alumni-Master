import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { ShieldCheck, Lock, Check, AlertTriangle, Info, Download, Key, Server } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

const JUMP_SECTIONS = [
  { id: 'sc-0', label: '01. Frameworks we are measured against' },
  { id: 'sc-1', label: '02. Encryption and key management' },
  { id: 'sc-2', label: '03. Access control' },
  { id: 'sc-3', label: '04. Infrastructure and resilience' },
  { id: 'sc-4', label: '05. Testing and assurance' },
  { id: 'sc-5', label: '06. Incident response and breach notification' },
  { id: 'sc-6', label: '07. Report a vulnerability' },
  { id: 'ck-0', label: 'Cookies: How we treat consent' },
  { id: 'ck-1', label: 'Cookies: Manage your preferences' },
  { id: 'ck-2', label: 'Cookies: Every cookie we set' },
  { id: 'ck-3', label: 'Cookies: Third parties' },
  { id: 'ck-4', label: 'Cookies: Other technologies' },
];

export default function SecurityPage() {
  const { width } = useWindowDimensions();
  const [activeSection, setActiveSection] = useState('sc-0');
  const isMobile = width < 860;

  // Scroll spy on Web
  useEffect(() => {
    if (!IS_WEB) return;
    const handleScroll = () => {
      let currentSection = 'sc-0';
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
              <ShieldCheck size={13} color="#34D399" />
              LEGAL · SECURITY & COOKIES
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mt-5 mb-4">
              Security & Cookies
            </h1>
            <p className="text-base sm:text-lg text-[#8A8A9E] leading-relaxed mb-6">
              How student data is protected in practice — the controls, the frameworks we measure against, and what happens in the first hours of an incident.
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
              
              {/* Section 01: Frameworks */}
              <div id="sc-0" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">01</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Frameworks we are measured against</h2>
                </div>
                <p>
                  We do not invent our own standard. Our control set is mapped to recognised frameworks so it can be audited by someone other than us.
                </p>
                <div className="border border-[#292940] rounded-xl overflow-hidden my-4">
                  <div className="grid grid-cols-3 gap-3 bg-[#161622] p-3.5 text-xs font-bold tracking-wider text-[#8A8A9E] uppercase">
                    <div>FRAMEWORK</div>
                    <div>SCOPE</div>
                    <div>STATUS</div>
                  </div>
                  {[
                    { f: 'ISO/IEC 27001:2022', s: 'Information security management system', st: 'Certified' },
                    { f: 'SOC 2 Type II', s: 'Security, availability and confidentiality', st: 'Annual report' },
                    { f: 'NIST CSF 2.0', s: 'Govern, identify, protect, detect, respond, recover', st: 'Mapped' },
                    { f: 'NIST SP 800-171', s: 'Protecting controlled unclassified information', st: 'Aligned' },
                    { f: 'PCI DSS', s: 'Card data — handled entirely by Razorpay', st: 'Out of scope by design' },
                    { f: 'CIS Benchmarks', s: 'Cloud and OS hardening baselines', st: 'Enforced' },
                    { f: 'DPDP Act s.8(5)', s: 'Reasonable security safeguards', st: 'Compliant' },
                    { f: 'GDPR Art. 32', s: 'Security of processing', st: 'Compliant' },
                  ].map((row, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-3 border-t border-[#1F1F30] p-3.5 text-xs sm:text-sm">
                      <span className="font-semibold text-white">{row.f}</span>
                      <span className="text-[#8A8A9E]">{row.s}</span>
                      <span className="text-[#8A8A9E]">{row.st}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 02: Encryption */}
              <div id="sc-1" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">02</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Encryption and key management</h2>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>TLS 1.3 for all data in transit, with HSTS preload and modern ciphers only. TLS 1.0 and 1.1 are disabled.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>AES-256 at rest for databases, object storage, backups and log archives.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>Aadhaar numbers and payment references encrypted at field level with separate keys.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>Passwords hashed with Argon2id. We never store, log or email plaintext passwords.</span>
                  </div>
                </div>
              </div>

              {/* Section 03: Access Control */}
              <div id="sc-2" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">03</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Access control</h2>
                </div>
                <p>
                  Least privilege by default, granted by role and reviewed quarterly. Mandatory multi-factor authentication and SSO for every internal account. Just-in-time time-boxed production access.
                </p>
              </div>

              {/* Section 04: Infrastructure */}
              <div id="sc-3" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">04</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Infrastructure and resilience</h2>
                </div>
                <p>
                  Segmented private networks, WAF rate limiting, primary region in Mumbai with secondary in Singapore. Encrypted backups every 6 hours (retained 35 days). RPO 6 hours, RTO 4 hours.
                </p>
                
                {/* Patch Targets Table */}
                <div className="border border-[#292940] rounded-xl overflow-hidden my-4">
                  <div className="grid grid-cols-3 gap-3 bg-[#161622] p-3.5 text-xs font-bold tracking-wider text-[#8A8A9E] uppercase">
                    <div>SEVERITY</div>
                    <div>TRIAGE</div>
                    <div>PATCH TARGET</div>
                  </div>
                  {[
                    { sev: 'Critical', tr: 'Within 2 hours', pt: '24 hours' },
                    { sev: 'High', tr: 'Within 8 hours', pt: '7 days' },
                    { sev: 'Medium', tr: 'Within 3 days', pt: '30 days' },
                    { sev: 'Low', tr: 'Next cycle', pt: '90 days' },
                  ].map((row, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-3 border-t border-[#1F1F30] p-3.5 text-xs sm:text-sm">
                      <span className="font-semibold text-white">{row.sev}</span>
                      <span className="text-[#8A8A9E]">{row.tr}</span>
                      <span className="text-[#8A8A9E]">{row.pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 05: Testing */}
              <div id="sc-4" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">05</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Testing and assurance</h2>
                </div>
                <p>
                  Independent third-party penetration test at least annually. Automated SAST, DAST and dependency scanning in continuous integration pipelines.
                </p>
              </div>

              {/* Section 06: Incident Response */}
              <div id="sc-5" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">06</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Incident response and breach notification</h2>
                </div>
                <p>
                  Documented incident response plan with a named on-call commander. CERT-In notification within 6 hours, GDPR Art. 33 notification within 72 hours.
                </p>
              </div>

              {/* Section 07: Report a vulnerability */}
              <div id="sc-6" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">07</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Report a vulnerability</h2>
                </div>
                <p>
                  Write to <span className="text-white font-medium">security@studentalumni.ai</span>. We acknowledge within 4 hours and give a substantive response within 72 hours.
                </p>
              </div>

              {/* COOKIE POLICY SECTION */}
              <div className="pt-10 mt-10 border-t border-[#292940]">
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#34D399] bg-[#34D399]/13 rounded-full px-4 py-1.5 uppercase mb-8">
                  COOKIE POLICY
                </span>

                <div id="ck-0" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">How we treat consent</h3>
                  <p>
                    Only strictly necessary cookies are set before you choose. Everything else — analytics, preferences, future marketing — waits for your consent.
                  </p>
                </div>

                <div id="ck-1" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">Manage your preferences</h3>
                  <p>
                    You can manage your consent settings at any time in Profile → Security or via browser settings.
                  </p>
                </div>

                <div id="ck-2" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">Every cookie we set</h3>
                  <div className="border border-[#292940] rounded-xl overflow-hidden my-4">
                    <div className="grid grid-cols-4 gap-2 bg-[#161622] p-3 text-xs font-bold tracking-wider text-[#8A8A9E] uppercase">
                      <div>NAME</div>
                      <div>PURPOSE</div>
                      <div>TYPE</div>
                      <div>EXPIRES</div>
                    </div>
                    {[
                      { n: 'sa_session', p: 'Keeps you signed in', t: 'Necessary', e: 'Session' },
                      { n: 'sa_csrf', p: 'CSRF protection', t: 'Necessary', e: 'Session' },
                      { n: 'sa_lb', p: 'Load balancer sticky route', t: 'Necessary', e: '1 hour' },
                      { n: 'sa_consent', p: 'Records cookie choices', t: 'Necessary', e: '12 months' },
                      { n: 'sa_theme', p: 'Dark/light preference', t: 'Preferences', e: '12 months' },
                      { n: 'sa_anon_id', p: 'De-identified analytics', t: 'Analytics', e: '13 months' },
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

                <div id="ck-3" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">Third parties</h3>
                  <p>
                    There are no advertising networks, no social pixels and no data brokers. Payment processing is handled by Razorpay, CDN security by Cloudflare, and credential verification by DigiLocker/UIDAI.
                  </p>
                </div>

                <div id="ck-4" className="space-y-4">
                  <h3 className="text-xl font-bold text-white tracking-tight">Other technologies</h3>
                  <p>
                    We use LocalStorage for draft form input, SessionStorage for transient UI states, and Service Workers for static asset caching.
                  </p>
                </div>
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
