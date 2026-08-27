import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { FileText, Check, AlertTriangle, Info, Download } from 'lucide-react-native';

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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontWeight: '700', letterSpacing: '1.4px', color: '#A78BFA', background: 'rgba(124,92,252,.18)', borderRadius: '100px', padding: '7px 14px' }}>
              LEGAL · PRIVACY &amp; TERMS
            </span>
            <div style={{ fontSize: '40px', fontWeight: '700', letterSpacing: '-1.6px', margin: '20px 0 12px', color: '#F4F4FA' }}>
              Privacy &amp; Terms
            </div>
            <div style={{ fontSize: '16px', lineHeight: '1.65', color: '#8A8A9E', marginBottom: '22px' }}>
              What we collect from students, alumni and colleges, why we hold it, and the rights you can exercise — under India’s DPDP Act, the GDPR, and US federal and state law.
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12.5px', color: '#8A8A9E', border: '1px solid #292940', borderRadius: '100px', padding: '7px 14px' }}>Version 3.0</span>
              <span style={{ fontSize: '12.5px', color: '#8A8A9E', border: '1px solid #292940', borderRadius: '100px', padding: '7px 14px' }}>Effective August 22, 2026</span>
              <button style={{ fontSize: '12.5px', fontWeight: '600', color: '#F4F4FA', border: '1px solid #292940', borderRadius: '100px', padding: '7px 14px', background: 'transparent', cursor: 'pointer' }}>
                Download PDF
              </button>
            </div>
          </div>

          {/* Warning Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: '13px', border: '1px solid #4A3410', borderRadius: '14px', background: 'rgba(245,179,66,.07)', padding: '16px 18px', marginTop: '22px', maxWidth: '780px', marginBottom: '30px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#F5B342', strokeWidth: 1.9, marginTop: '3px' }}>
              <path d="M12 3l9 16H3Z"></path>
              <path d="M12 9v4.5M12 16.5v.01"></path>
            </svg>
            <div style={{ fontSize: '13.5px', lineHeight: '1.65', color: '#8A8A9E' }}>
              This is a drafting template written to reflect the obligations named below. It has not been reviewed by counsel — have a qualified lawyer in each jurisdiction you operate in review and adapt it before you publish.
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className={`grid gap-10 ${isMobile ? 'grid-cols-1' : 'grid-cols-12'}`} style={{ alignItems: 'start' }}>
            
            {/* Sticky Sidebar Navigation (Web) */}
            <div className={`md:col-span-4 ${isMobile ? 'hidden' : 'block'}`} style={{ position: 'sticky', top: 92 }}>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.3px', color: '#8A8A9E', marginBottom: '14px' }}>ON THIS PAGE</div>
              {JUMP_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handleJump(sec.id)}
                  data-on={activeSection === sec.id ? 'true' : 'false'}
                  className="jump-item"
                  style={{
                    display: 'block',
                    fontSize: '13.5px',
                    lineHeight: '1.45',
                    color: '#8A8A9E',
                    borderLeft: '2px solid #292940',
                    padding: '9px 0 9px 14px',
                    cursor: 'pointer',
                    transition: 'color .2s ease, border-color .2s ease',
                    textAlign: 'left',
                    width: '100%',
                    background: 'transparent',
                  }}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {/* Document Content */}
            <div className="md:col-span-8 max-w-[760px] min-w-0">
              
              {/* Section 01: Who we are */}
              <div className="rs-sec" id="pr-0" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>01</span>
                  <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Who we are</span>
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  StudentAlumni operates studentalumni.ai and the StudentAlumni mobile applications. For personal data you give us directly we are the <strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Data Fiduciary</strong> under India’s Digital Personal Data Protection Act, 2023, and the <strong style={{ color: '#F4F4FA', fontWeight: '600' }}>controller</strong> under the GDPR.
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  Where your college uses our platform to run its own placement programme, that institution is the controller for the records it uploads and we act as its <strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Data Processor</strong>, bound by a written data processing agreement.
                </div>
                <div style={{ display: 'grid', gap: '11px', marginBottom: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div>Grievance Officer (India, DPDP s.13): grievance@studentalumni.ai</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div>Data Protection Officer (EU/UK): dpo@studentalumni.ai</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div>US privacy requests: privacy@studentalumni.ai</div>
                  </div>
                </div>
              </div>

              {/* Section 02: What we collect */}
              <div className="rs-sec" id="pr-1" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>02</span>
                  <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>What we collect</span>
                </div>
                
                {/* Data Collection Table */}
                <div style={{ border: '1px solid #292940', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)', gap: '14px', background: '#161622', padding: '13px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', color: '#8A8A9E' }}>CATEGORY</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', color: '#8A8A9E' }}>EXAMPLES</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', color: '#8A8A9E' }}>SOURCE</span>
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
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)', gap: '14px', borderTop: '1px solid #1F1F30', padding: '14px 16px' }}>
                      <span style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#F4F4FA', fontWeight: '600' }}>{row.cat}</span>
                      <span style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#8A8A9E', fontWeight: '400' }}>{row.ex}</span>
                      <span style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#8A8A9E', fontWeight: '400' }}>{row.src}</span>
                    </div>
                  ))}
                </div>

                {/* Sensitive Categories Callout Box */}
                <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: '13px', border: '1px solid #2C2A52', borderRadius: '14px', background: 'rgba(124,92,252,.07)', padding: '16px 18px', marginBottom: '18px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 1.9, marginTop: '3px' }}>
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 8v.01M12 11v5"></path>
                  </svg>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: '600', marginBottom: '5px', color: '#F4F4FA' }}>Sensitive categories</div>
                    <div style={{ fontSize: '13.5px', lineHeight: '1.65', color: '#8A8A9E' }}>
                      We do not ask for caste, religion, health, biometric templates or political views. Aadhaar numbers are stored encrypted, masked in every interface, and used only to verify identity against UIDAI — never for profiling or advertising.
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 03: Lawful Basis */}
              <div className="rs-sec" id="pr-2" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>03</span>
                  <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Why we process it, and our lawful basis</span>
                </div>
                
                <div style={{ border: '1px solid #292940', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)', gap: '14px', background: '#161622', padding: '13px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', color: '#8A8A9E' }}>PURPOSE</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', color: '#8A8A9E' }}>DPDP BASIS (INDIA)</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', color: '#8A8A9E' }}>GDPR BASIS</span>
                  </div>
                  {[
                    { p: 'Create and run your account', dpdp: 'Consent', gdpr: 'Contract, Art. 6(1)(b)' },
                    { p: 'Verify you are a student or alumnus', dpdp: 'Consent', gdpr: 'Contract / legal obligation' },
                    { p: 'Match you to mentors, roles and events', dpdp: 'Consent', gdpr: 'Contract' },
                    { p: 'Payments, invoices and refunds', dpdp: 'Legitimate use — contract', gdpr: 'Contract / legal obligation' },
                    { p: 'Security, fraud and abuse prevention', dpdp: 'Legitimate use', gdpr: 'Legitimate interests, Art. 6(1)(f)' },
                    { p: 'Product analytics and improvement', dpdp: 'Consent', gdpr: 'Legitimate interests' },
                    { p: 'Marketing email', dpdp: 'Consent', gdpr: 'Consent, Art. 6(1)(a)' },
                    { p: 'Meeting tax and regulatory duties', dpdp: 'Legitimate use — law', gdpr: 'Legal obligation, Art. 6(1)(c)' },
                  ].map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)', gap: '14px', borderTop: '1px solid #1F1F30', padding: '14px 16px' }}>
                      <span style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#F4F4FA', fontWeight: '600' }}>{row.p}</span>
                      <span style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#8A8A9E', fontWeight: '400' }}>{row.dpdp}</span>
                      <span style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#8A8A9E', fontWeight: '400' }}>{row.gdpr}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  We do not sell personal data, and we do not share it for cross-context behavioural advertising. There is no automated decision that produces a legal effect on you: your readiness score and match percentages are advisory, always visible to you, and never the sole reason an application is rejected.
                </div>
              </div>

              {/* Section 04: Your rights in India — DPDP Act, 2023 */}
              <div className="rs-sec" id="pr-3" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>04</span>
                  <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Your rights in India — DPDP Act, 2023</span>
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  As a <strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Data Principal</strong> you may exercise the following at any time from Profile → Security → Your data, or by writing to our Grievance Officer. We respond within 30 days.
                </div>
                <div style={{ display: 'grid', gap: '11px', marginBottom: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div><strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Access</strong> (s.11) — a summary of the personal data we process and the identities we have shared it with.</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div><strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Correction and erasure</strong> (s.12) — correct inaccurate data, complete incomplete data, and have data erased once the purpose it was collected for is served.</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div><strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Grievance redressal</strong> (s.13) — raise a complaint with our Grievance Officer before approaching the Data Protection Board of India.</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div><strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Nomination</strong> (s.14) — nominate another person to exercise your rights in the event of your death or incapacity.</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div><strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Withdraw consent</strong> (s.6(4)) — as easily as it was given; we stop processing within a reasonable period.</div>
                  </div>
                </div>

                {/* Students under 18 Callout Box */}
                <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: '13px', border: '1px solid #2C2A52', borderRadius: '14px', background: 'rgba(124,92,252,.07)', padding: '16px 18px', marginBottom: '18px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 1.9, marginTop: '3px' }}>
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 8v.01M12 11v5"></path>
                  </svg>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: '600', marginBottom: '5px', color: '#F4F4FA' }}>Students under 18</div>
                    <div style={{ fontSize: '13.5px', lineHeight: '1.65', color: '#8A8A9E' }}>
                      Under DPDP s.9 we require verifiable parental or guardian consent before processing the data of a child, and we do not undertake tracking, behavioural monitoring or targeted advertising directed at children. Age is checked at sign-up; where a college onboards a cohort, the institution warrants that it holds the necessary consents.
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  You also have a duty under s.15 not to impersonate another person, suppress material information, or file a frivolous complaint.
                </div>
              </div>

              {/* Section 05: Your rights in the US */}
              <div className="rs-sec" id="pr-4" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>05</span>
                  <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Your rights in the United States</span>
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  There is no single federal privacy statute, so your rights depend on your state and on the kind of record involved. We apply the strongest applicable standard rather than the minimum.
                </div>
                <div style={{ display: 'grid', gap: '11px', marginBottom: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div><strong style={{ color: '#F4F4FA', fontWeight: '600' }}>CCPA / CPRA (California)</strong> — know, access, delete, correct, portability, limit use of sensitive personal information, and opt out of sale or sharing. We do not sell or share as those terms are defined. No discrimination for exercising a right.</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div><strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana and other state acts</strong> — access, correction, deletion, portability, opt-out of targeted advertising and profiling, and appeal of a refused request.</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div><strong style={{ color: '#F4F4FA', fontWeight: '600' }}>FERPA</strong> — where a US institution engages us as a school official, education records are processed only under its direction, used solely for the purpose it authorised, and never redisclosed without consent.</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div><strong style={{ color: '#F4F4FA', fontWeight: '600' }}>COPPA</strong> — we do not knowingly collect personal information from children under 13.</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div><strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Authorised agents</strong> — you may use an agent to make a request; we verify their authority and your identity.</div>
                  </div>
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  Requests go to privacy@studentalumni.ai. We confirm receipt within 10 days and substantively respond within 45 days, extendable once by a further 45 where reasonably necessary.
                </div>
              </div>

              {/* Section 06: Global transfers */}
              <div className="rs-sec" id="pr-5" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>06</span>
                  <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Global transfers and other regions</span>
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  Our primary data centres are in India (Mumbai) with a secondary region in Singapore. Where personal data moves out of its region of origin we rely on:
                </div>
                <div style={{ display: 'grid', gap: '11px', marginBottom: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div>GDPR Chapter V — the European Commission’s Standard Contractual Clauses, the UK International Data Transfer Addendum, and a transfer impact assessment per corridor.</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div>DPDP s.16 — transfers only to countries not restricted by the Central Government, subject to any notified conditions.</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div>Sub-processors under written contract, audited annually, each listed with its location and purpose in our sub-processor register.</div>
                  </div>
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  If you are in Brazil (LGPD), Canada (PIPEDA), Australia (Privacy Act) or another jurisdiction with comparable rights, we honour access, correction, deletion and complaint rights on the same terms as above.
                </div>
              </div>

              {/* Section 07: Retention */}
              <div className="rs-sec" id="pr-6" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>07</span>
                  <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>How long we keep it</span>
                </div>
                <div style={{ border: '1px solid #292940', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)', gap: '14px', background: '#161622', padding: '13px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', color: '#8A8A9E' }}>DATA</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', color: '#8A8A9E' }}>RETENTION</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', color: '#8A8A9E' }}>WHY</span>
                  </div>
                  {[
                    { d: 'Active account', r: 'While your account is open', w: 'To provide the service' },
                    { d: 'Closed account', r: 'Deleted within 30 days', w: 'DPDP purpose limitation' },
                    { d: 'Payment records', r: '8 financial years', w: 'Indian tax and audit law' },
                    { d: 'Verification logs', r: '3 years', w: 'Fraud prevention, dispute resolution' },
                    { d: 'Support tickets', r: '2 years', w: 'Service quality and appeals' },
                    { d: 'Security event logs', r: '12 months', w: 'Incident investigation' },
                    { d: 'Aggregate analytics', r: 'Indefinite, de-identified', w: 'No longer personal data' },
                  ].map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)', gap: '14px', borderTop: '1px solid #1F1F30', padding: '14px 16px' }}>
                      <span style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#F4F4FA', fontWeight: '600' }}>{row.d}</span>
                      <span style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#8A8A9E', fontWeight: '400' }}>{row.r}</span>
                      <span style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#8A8A9E', fontWeight: '400' }}>{row.w}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 08: Changes and how to complain */}
              <div className="rs-sec" id="pr-7" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>08</span>
                  <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Changes and how to complain</span>
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  We notify you in the product and by email at least 14 days before a material change takes effect, and keep every prior version available for download. Continuing to use the service after the effective date means you accept the revised policy.
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                  If we have not resolved your concern, you may escalate to the <strong style={{ color: '#F4F4FA', fontWeight: '600' }}>Data Protection Board of India</strong>, to your EU or UK supervisory authority, to your state Attorney General in the US, or to the regulator in your own country. We will cooperate with any of them.
                </div>
              </div>

              {/* TERMS OF USE SECTION */}
              <div style={{ marginTop: '46px', paddingTop: '40px', borderTop: '1px solid #1F1F30' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', fontWeight: '700', letterSpacing: '1.5px', color: '#A78BFA', background: 'rgba(124,92,252,.18)', borderRadius: '100px', padding: '7px 13px', marginBottom: '18px' }}>
                  TERMS OF USE
                </div>

                <div className="rs-sec" id="tm-0" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>01</span>
                    <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Agreement and eligibility</span>
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                    By creating an account you accept these terms. If you are accepting on behalf of a college or company, you confirm you have authority to bind it.
                  </div>
                  <div style={{ display: 'grid', gap: '11px', marginBottom: '18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                      <div>You must be at least 16 to hold an account in your own name; between 13 and 18 you need verifiable consent from a parent or guardian.</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                      <div>Student accounts require a verified college affiliation. Alumni accounts require proof of graduation.</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                      <div>One account per person. Accounts are personal and may not be sold, shared or transferred.</div>
                    </div>
                  </div>
                </div>

                <div className="rs-sec" id="tm-1" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>02</span>
                    <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>What the service is — and is not</span>
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                    We provide tools: a career roadmap, mentor introductions, job and internship matching, event registration, verified identity and a rentals marketplace.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: '13px', border: '1px solid #2C2A52', borderRadius: '14px', background: 'rgba(124,92,252,.07)', padding: '16px 18px', marginBottom: '18px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 1.9, marginTop: '3px' }}>
                      <circle cx="12" cy="12" r="9"></circle>
                      <path d="M12 8v.01M12 11v5"></path>
                    </svg>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: '600', marginBottom: '5px', color: '#F4F4FA' }}>No guarantee of outcome</div>
                      <div style={{ fontSize: '13.5px', lineHeight: '1.65', color: '#8A8A9E' }}>
                        We do not promise a job, an internship, an interview, a referral, a specific salary, admission to any programme, or a particular readiness score. Match percentages and roadmaps are advisory estimates, not commitments by us or by any employer.
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                    Mentors are independent individuals, not our employees. Employers, colleges, event organisers and rental hosts are third parties. We verify identity and affiliation, but we do not underwrite the advice they give, the roles they post, or the property they list.
                  </div>
                </div>

                <div className="rs-sec" id="tm-2" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>03</span>
                    <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Your responsibilities</span>
                  </div>
                  <div style={{ display: 'grid', gap: '11px', marginBottom: '18px' }}>
                    {[
                      'Keep your information accurate — particularly academic details, which others rely on.',
                      'Keep your credentials secure and tell us promptly if you suspect misuse.',
                      'Do not impersonate anyone, misstate your qualifications, or forge a verification document.',
                      'Do not scrape, crawl, resell or bulk-export data about other users, or use the platform to recruit for a competing service.',
                      'Do not upload malware, attempt to breach our systems, or probe them without written permission.',
                      'Respect the community code of conduct in every space we operate.'
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                        <div>{item}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rs-sec" id="tm-3" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>04</span>
                    <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Payments, refunds and cancellations</span>
                  </div>
                  <div style={{ display: 'grid', gap: '11px', marginBottom: '18px' }}>
                    {[
                      'Prices are shown inclusive of applicable taxes before you pay. Payments are processed by Razorpay; we do not store your card details.',
                      'Event tickets: full refund up to 24 hours before the event begins. After that the organiser’s policy applies and we pass your request on.',
                      'Mentor sessions: full refund if cancelled 12 hours ahead, or if the mentor does not attend.',
                      'Rentals: the cancellation terms shown on the listing apply; security deposits are refundable less verified damage.',
                      'Subscriptions renew until cancelled, and you may cancel any time before the next renewal date.',
                      'Coupons and perks are personal, non-transferable and have no cash value.'
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '12px', fontSize: '14.5px', lineHeight: '1.7', color: '#8A8A9E' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 2.2, marginTop: '5px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                        <div>{item}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rs-sec" id="tm-4" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>05</span>
                    <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Your content and our platform</span>
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                    You keep ownership of everything you upload — your resume, projects, photos and posts. You grant us a worldwide, non-exclusive, royalty-free licence to host, reproduce and display that content solely to operate and improve the service.
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                    Our software, design, trade marks, the SA mark and the ECHO brand remain ours.
                  </div>
                </div>

                <div className="rs-sec" id="tm-5" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>06</span>
                    <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Liability</span>
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                    Neither party is liable for indirect, incidental, special or consequential loss. Our total aggregate liability to you is limited to the greater of the amount you paid us in the 12 months before the claim, or INR 5,000.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: '13px', border: '1px solid #2C2A52', borderRadius: '14px', background: 'rgba(124,92,252,.07)', padding: '16px 18px', marginBottom: '18px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#A78BFA', strokeWidth: 1.9, marginTop: '3px' }}>
                      <circle cx="12" cy="12" r="9"></circle>
                      <path d="M12 8v.01M12 11v5"></path>
                    </svg>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: '600', marginBottom: '5px', color: '#F4F4FA' }}>What we never exclude</div>
                      <div style={{ fontSize: '13.5px', lineHeight: '1.65', color: '#8A8A9E' }}>
                        Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rs-sec" id="tm-6" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>07</span>
                    <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Suspension, termination and survival</span>
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                    You may close your account at any time from Profile → Security. We may terminate on 30 days’ notice, or immediately for a serious breach.
                  </div>
                </div>

                <div className="rs-sec" id="tm-7" style={{ borderTop: '1px solid #1F1F30', padding: '30px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#6A6A7E', flex: 'none' }}>08</span>
                    <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.5px', color: '#F4F4FA' }}>Governing law and disputes</span>
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.75', color: '#8A8A9E', marginBottom: '16px' }}>
                    These terms are governed by the laws of India, and the courts at Hyderabad, Telangana have exclusive jurisdiction.
                  </div>
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
