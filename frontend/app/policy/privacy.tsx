import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { ShieldCheck, FileText, Check, AlertTriangle, Info, Download } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

const JUMP_SECTIONS = [
  { id: 'pr-0', label: 'Who we are' },
  { id: 'pr-1', label: 'What we collect' },
  { id: 'pr-2', label: 'Why we process it, and our lawful basis' },
  { id: 'pr-3', label: 'Your rights in India — DPDP Act, 2023' },
  { id: 'pr-4', label: 'Your rights in the United States' },
  { id: 'pr-5', label: 'Global transfers and other regions' },
  { id: 'pr-6', label: 'How long we keep it' },
  { id: 'pr-7', label: 'Changes and how to complain' },
  { id: 'tm-0', label: 'Terms: Agreement and eligibility' },
  { id: 'tm-1', label: 'Terms: What the service is — and is not' },
  { id: 'tm-2', label: 'Terms: Your responsibilities' },
  { id: 'tm-3', label: 'Terms: Payments, refunds and cancellations' },
  { id: 'tm-4', label: 'Terms: Your content and our platform' },
  { id: 'tm-5', label: 'Terms: Liability' },
  { id: 'tm-6', label: 'Terms: Suspension, termination and survival' },
  { id: 'tm-7', label: 'Terms: Governing law and disputes' },
];

export default function PrivacyPolicyPage() {
  const { width } = useWindowDimensions();
  const [activeSection, setActiveSection] = useState('pr-0');
  const isMobile = width < 860;

  // Scroll spy on Web
  useEffect(() => {
    if (!IS_WEB) return;
    const handleScroll = () => {
      let currentSection = 'pr-0';
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
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#A78BFA] bg-[#7C5CFC]/18 rounded-full px-4 py-1.5 uppercase">
              <FileText size={13} color="#A78BFA" />
              LEGAL · PRIVACY & TERMS
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mt-5 mb-4">
              Privacy & Terms
            </h1>
            <p className="text-base sm:text-lg text-[#8A8A9E] leading-relaxed mb-6">
              What we collect from students, alumni and colleges, why we hold it, and the rights you can exercise — under India’s DPDP Act, the GDPR, and US federal and state law.
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

          {/* Warning Banner */}
          <div className="flex items-start gap-3.5 border border-[#4A3410] rounded-2xl bg-[#F5B342]/7 p-4.5 max-w-[780px] mb-8">
            <AlertTriangle size={17} color="#F5B342" className="mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-[#8A8A9E] leading-relaxed">
              This is a drafting template written to reflect the obligations named below. It has not been reviewed by counsel — have a qualified lawyer in each jurisdiction you operate in review and adapt it before you publish.
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
              
              {/* Section 01: Who we are */}
              <div id="pr-0" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">01</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Who we are</h2>
                </div>
                <p>
                  StudentAlumni operates studentalumni.ai and the StudentAlumni mobile applications. For personal data you give us directly we are the <strong className="text-white font-semibold">Data Fiduciary</strong> under India’s Digital Personal Data Protection Act, 2023, and the <strong className="text-white font-semibold">controller</strong> under the GDPR.
                </p>
                <p>
                  Where your college uses our platform to run its own placement programme, that institution is the controller for the records it uploads and we act as its <strong className="text-white font-semibold">Data Processor</strong>, bound by a written data processing agreement.
                </p>
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>Grievance Officer (India, DPDP s.13): <span className="text-white font-medium">grievance@studentalumni.ai</span></span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>Data Protection Officer (EU/UK): <span className="text-white font-medium">dpo@studentalumni.ai</span></span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span>US privacy requests: <span className="text-white font-medium">privacy@studentalumni.ai</span></span>
                  </div>
                </div>
              </div>

              {/* Section 02: What we collect */}
              <div id="pr-1" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">02</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">What we collect</h2>
                </div>
                
                {/* Data Collection Table */}
                <div className="border border-[#292940] rounded-xl overflow-hidden my-4">
                  <div className="grid grid-cols-3 gap-3 bg-[#161622] p-3.5 text-xs font-bold tracking-wider text-[#8A8A9E] uppercase">
                    <div>CATEGORY</div>
                    <div>EXAMPLES</div>
                    <div>SOURCE</div>
                  </div>
                  {[
                    { cat: 'Identity', ex: 'Name, photo, date of birth, SA ID', src: 'You' },
                    { cat: 'Contact', ex: 'Email, phone, city, state', src: 'You' },
                    { cat: 'Academic', ex: 'College, branch, year, CGPA, graduation year', src: 'You or your college' },
                    { cat: 'Verification', ex: 'College email domain, student ID, Aadhaar (last 4 shown), DigiLocker credentials', src: 'You, UIDAI, DigiLocker' },
                    { cat: 'Career', ex: 'Resume, projects, skills, goals, readiness score, applications', src: 'You and our models' },
                    { cat: 'Activity', ex: 'Sessions booked, events attended, tickets, roadmap progress', src: 'Your use of the service' },
                    { cat: 'Payment', ex: 'Transaction ID, amount, status, last 4 of instrument', src: 'Razorpay (we never see full card data)' },
                    { cat: 'Technical', ex: 'IP address, device and browser, crash logs', src: 'Automatic' },
                  ].map((row, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-3 border-t border-[#1F1F30] p-3.5 text-xs sm:text-sm">
                      <span className="font-semibold text-white">{row.cat}</span>
                      <span className="text-[#8A8A9E]">{row.ex}</span>
                      <span className="text-[#8A8A9E]">{row.src}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-3 border border-[#2C2A52] rounded-xl bg-[#7C5CFC]/7 p-4">
                  <Info size={16} color="#A78BFA" className="mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Sensitive categories</div>
                    <div className="text-xs sm:text-sm text-[#8A8A9E]">
                      We do not ask for caste, religion, health, biometric templates or political views. Aadhaar numbers are stored encrypted, masked in every interface, and used only to verify identity against UIDAI — never for profiling or advertising.
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 03: Lawful Basis */}
              <div id="pr-2" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">03</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Why we process it, and our lawful basis</h2>
                </div>
                
                <div className="border border-[#292940] rounded-xl overflow-hidden my-4">
                  <div className="grid grid-cols-3 gap-3 bg-[#161622] p-3.5 text-xs font-bold tracking-wider text-[#8A8A9E] uppercase">
                    <div>PURPOSE</div>
                    <div>DPDP BASIS (INDIA)</div>
                    <div>GDPR BASIS</div>
                  </div>
                  {[
                    { p: 'Create and run your account', dpdp: 'Consent', gdpr: 'Contract, Art. 6(1)(b)' },
                    { p: 'Verify student/alumnus status', dpdp: 'Consent', gdpr: 'Contract / legal obligation' },
                    { p: 'Match mentors, roles & events', dpdp: 'Consent', gdpr: 'Contract' },
                    { p: 'Payments, invoices & refunds', dpdp: 'Legitimate use — contract', gdpr: 'Contract / legal obligation' },
                    { p: 'Security & fraud prevention', dpdp: 'Legitimate use', gdpr: 'Legitimate interests, Art. 6(1)(f)' },
                    { p: 'Product analytics & improvement', dpdp: 'Consent', gdpr: 'Legitimate interests' },
                    { p: 'Marketing email', dpdp: 'Consent', gdpr: 'Consent, Art. 6(1)(a)' },
                    { p: 'Tax & regulatory duties', dpdp: 'Legitimate use — law', gdpr: 'Legal obligation, Art. 6(1)(c)' },
                  ].map((row, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-3 border-t border-[#1F1F30] p-3.5 text-xs sm:text-sm">
                      <span className="font-semibold text-white">{row.p}</span>
                      <span className="text-[#8A8A9E]">{row.dpdp}</span>
                      <span className="text-[#8A8A9E]">{row.gdpr}</span>
                    </div>
                  ))}
                </div>
                <p>
                  We do not sell personal data, and we do not share it for cross-context behavioural advertising. There is no automated decision that produces a legal effect on you: your readiness score and match percentages are advisory, always visible to you, and never the sole reason an application is rejected.
                </p>
              </div>

              {/* Section 04: Your rights in India — DPDP Act, 2023 */}
              <div id="pr-3" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">04</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Your rights in India — DPDP Act, 2023</h2>
                </div>
                <p>
                  As a <strong className="text-white font-semibold">Data Principal</strong> you may exercise the following at any time from Profile → Security → Your data, or by writing to our Grievance Officer. We respond within 30 days.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span><strong className="text-white font-semibold">Access (s.11)</strong> — a summary of the personal data we process and the identities we have shared it with.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span><strong className="text-white font-semibold">Correction and erasure (s.12)</strong> — correct inaccurate data, complete incomplete data, and have data erased once the purpose it was collected for is served.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span><strong className="text-white font-semibold">Grievance redressal (s.13)</strong> — raise a complaint with our Grievance Officer before approaching the Data Protection Board of India.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span><strong className="text-white font-semibold">Nomination (s.14)</strong> — nominate another person to exercise your rights in the event of your death or incapacity.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span><strong className="text-white font-semibold">Withdraw consent (s.6(4))</strong> — as easily as it was given; we stop processing within a reasonable period.</span>
                  </div>
                </div>
              </div>

              {/* Section 05: Your rights in the US */}
              <div id="pr-4" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">05</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Your rights in the United States</h2>
                </div>
                <p>
                  There is no single federal privacy statute, so your rights depend on your state and on the kind of record involved. We apply the strongest applicable standard rather than the minimum.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span><strong className="text-white font-semibold">CCPA / CPRA (California)</strong> — know, access, delete, correct, portability, limit use of sensitive personal information, and opt out of sale or sharing. We do not sell or share.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={15} color="#A78BFA" className="mt-1 flex-shrink-0" />
                    <span><strong className="text-white font-semibold">FERPA</strong> — where a US institution engages us as a school official, education records are processed only under its direction.</span>
                  </div>
                </div>
              </div>

              {/* Section 06: Global transfers */}
              <div id="pr-5" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">06</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Global transfers and other regions</h2>
                </div>
                <p>
                  Our primary data centres are in India (Mumbai) with a secondary region in Singapore. Where personal data moves out of its region of origin we rely on GDPR Chapter V Standard Contractual Clauses and DPDP s.16 rules.
                </p>
              </div>

              {/* Section 07: Retention */}
              <div id="pr-6" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">07</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">How long we keep it</h2>
                </div>
                <div className="border border-[#292940] rounded-xl overflow-hidden my-4">
                  <div className="grid grid-cols-3 gap-3 bg-[#161622] p-3.5 text-xs font-bold tracking-wider text-[#8A8A9E] uppercase">
                    <div>DATA</div>
                    <div>RETENTION</div>
                    <div>WHY</div>
                  </div>
                  {[
                    { d: 'Active account', r: 'While account is open', w: 'To provide the service' },
                    { d: 'Closed account', r: 'Deleted within 30 days', w: 'DPDP purpose limitation' },
                    { d: 'Payment records', r: '8 financial years', w: 'Indian tax & audit law' },
                    { d: 'Verification logs', r: '3 years', w: 'Fraud prevention' },
                    { d: 'Security event logs', r: '12 months', w: 'Incident investigation' },
                  ].map((row, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-3 border-t border-[#1F1F30] p-3.5 text-xs sm:text-sm">
                      <span className="font-semibold text-white">{row.d}</span>
                      <span className="text-[#8A8A9E]">{row.r}</span>
                      <span className="text-[#8A8A9E]">{row.w}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 08: Changes & Complaints */}
              <div id="pr-7" className="border-t border-[#1F1F30] pt-7 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-[#6A6A7E]">08</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Changes and how to complain</h2>
                </div>
                <p>
                  We notify you in the product and by email at least 14 days before a material change takes effect. If we have not resolved your concern, you may escalate to the Data Protection Board of India or your local supervisory authority.
                </p>
              </div>

              {/* TERMS OF USE SECTION */}
              <div className="pt-10 mt-10 border-t border-[#292940]">
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#A78BFA] bg-[#7C5CFC]/18 rounded-full px-4 py-1.5 uppercase mb-8">
                  TERMS OF USE
                </span>

                <div id="tm-0" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">01. Agreement and eligibility</h3>
                  <p>
                    By creating an account you accept these terms. Student accounts require a verified college affiliation. You must be at least 16 to hold an account in your own name; between 13 and 18 you need verifiable parental consent.
                  </p>
                </div>

                <div id="tm-1" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">02. What the service is — and is not</h3>
                  <div className="flex items-start gap-3 border border-[#2C2A52] rounded-xl bg-[#7C5CFC]/7 p-4">
                    <Info size={16} color="#A78BFA" className="mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-white mb-1">No guarantee of outcome</div>
                      <div className="text-xs sm:text-sm text-[#8A8A9E]">
                        We provide tools: career roadmaps, mentor introductions, event tickets and verified identity. We do not promise a job, internship, interview, referral or specific salary.
                      </div>
                    </div>
                  </div>
                </div>

                <div id="tm-2" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">03. Your responsibilities</h3>
                  <p>
                    Keep your academic credentials accurate. Do not impersonate anyone, misstate qualifications, scrape platform data, or upload malware. Respect community etiquette.
                  </p>
                </div>

                <div id="tm-3" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">04. Payments, refunds and cancellations</h3>
                  <p>
                    Event tickets: full refund up to 24 hours before event starts. Mentor sessions: full refund if cancelled 12 hours ahead. Subscriptions can be cancelled at any time before renewal.
                  </p>
                </div>

                <div id="tm-4" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">05. Your content and our platform</h3>
                  <p>
                    You retain full ownership of resumes, projects, and photos you upload. You grant us a non-exclusive licence to display that content to deliver the service.
                  </p>
                </div>

                <div id="tm-5" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">06. Liability</h3>
                  <p>
                    Our total aggregate liability is limited to the amount paid in the preceding 12 months, or INR 5,000. Statutory consumer rights remain unaffected.
                  </p>
                </div>

                <div id="tm-6" className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">07. Suspension and termination</h3>
                  <p>
                    You may close your account at any time. We may terminate on 30 days notice, or immediately for serious fraud, harassment or security breaches.
                  </p>
                </div>

                <div id="tm-7" className="space-y-4">
                  <h3 className="text-xl font-bold text-white tracking-tight">08. Governing law and disputes</h3>
                  <p>
                    Governed by the laws of India with exclusive jurisdiction in courts at Hyderabad, Telangana.
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
