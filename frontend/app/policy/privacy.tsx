import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';

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
  { id: 'tm-1', label: 'Terms: What the service is' },
  { id: 'tm-2', label: 'Terms: Your responsibilities' },
  { id: 'tm-3', label: 'Terms: Payments & Refunds' },
  { id: 'tm-4', label: 'Terms: Your content' },
  { id: 'tm-5', label: 'Terms: Liability' },
  { id: 'tm-6', label: 'Terms: Termination' },
  { id: 'tm-7', label: 'Terms: Governing law' },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('pr-0');

  useEffect(() => {
    if (!IS_WEB) return;
    const handleScroll = () => {
      let currentSection = 'pr-0';
      for (const sec of JUMP_SECTIONS) {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 160) {
            currentSection = sec.id;
          }
        }
      }
      setActiveSection(currentSection);

      const jumps = document.querySelectorAll('.rs-jump');
      jumps.forEach((jElem) => { const j = jElem as HTMLElement;
        if (j.getAttribute('data-target') === currentSection) {
          j.setAttribute('data-on', '1');
          j.style.color = '#F4F4FA';
          j.style.borderLeftColor = '#7C5CFC';
          j.style.fontWeight = '600';
        } else {
          j.removeAttribute('data-on');
          j.style.color = '#8A8A9E';
          j.style.borderLeftColor = '#292940';
          j.style.fontWeight = '400';
        }
      });
    };

    // Capture phase listener so it catches scrolls on ScrollView container and window
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleJump = (id) => {
    if (IS_WEB && id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          .rs-sec {
            scroll-margin-top: 108px;
          }
          .rs-jump[data-on="1"] {
            color: #F4F4FA !important;
            border-left-color: #7C5CFC !important;
            font-weight: 600 !important;
          }
          :root {
            --tag-accent: #A78BFA;
            --tint-strong: rgba(124,92,252,.18);
            --muted: #8A8A9E;
            --line2: #292940;
            --line: #1F1F30;
            --warn-line: #4A3410;
            --amber: #F5B342;
            --dim: #6A6A7E;
            --violet-lt: #A78BFA;
            --panel2: #161622;
            --text: #F4F4FA;
            --accent-line: #2C2A52;
          }
        `
      }} />

      {/* Right Hand Side SA Watermark Logo */}
      <SAWatermark fixed={true} right={-60} top={80} opacity={0.12} size={780} glow={true} />

      {/* Background ambient glows */}
      <View style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <View className="policy-glow-left" />
        <View className="policy-glow-right" />
      </View>

      <Navbar />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <div id="rs-page-privacy" className="rs-page" style={{"display":"block","position":"relative","zIndex":"1","maxWidth":"1400px","margin":"0 auto","padding":"34px 28px 90px"}}>
    <div className="rs-r" style={{"maxWidth":"780px"}}>
      <span style={{"display":"inline-flex","alignItems":"center","gap":"8px","fontSize":"11.5px","fontWeight":"700","letterSpacing":"1.4px","color":"var(--tag-accent)","background":"var(--tint-strong)","borderRadius":"100px","padding":"7px 14px"}}>LEGAL · PRIVACY &amp; TERMS</span>
      <div style={{"fontSize":"40px","fontWeight":"700","letterSpacing":"-1.6px","margin":"20px 0 12px"}}>Privacy &amp; Terms</div>
      <div style={{"fontSize":"16px","lineHeight":"1.65","color":"var(--muted)"}}>What we collect from students, alumni and colleges, why we hold it, and the rights you can exercise — under India’s DPDP Act, the GDPR, and US federal and state law.</div>
      <div style={{"display":"flex","gap":"10px","flexWrap":"wrap","marginTop":"22px"}}>
        <span style={{"fontSize":"12.5px","color":"var(--muted)","border":"1px solid var(--line2)","borderRadius":"100px","padding":"7px 14px"}}>Version 3.0</span>
        <span style={{"fontSize":"12.5px","color":"var(--muted)","border":"1px solid var(--line2)","borderRadius":"100px","padding":"7px 14px"}}>Effective August 22, 2026</span>
        <span className="rs-ghostb" style={{"fontSize":"12.5px","fontWeight":"600","border":"1px solid var(--line2)","borderRadius":"100px","padding":"7px 14px","cursor":"pointer","transition":"background .2s ease, filter .2s ease, transform .2s ease"}}>Download PDF</span>
      </div>
    </div>
    <div className="rs-r" style={{"display":"grid","gridTemplateColumns":"20px minmax(0, 1fr)","gap":"13px","border":"1px solid var(--warn-line)","borderRadius":"14px","background":"rgba(245,179,66,.07)","padding":"16px 18px","marginTop":"22px","maxWidth":"780px"}}>
      <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--amber)","strokeWidth":"1.9","marginTop":"3px"}}><path d="M12 3l9 16H3Z"></path><path d="M12 9v4.5M12 16.5v.01"></path></svg>
      <div style={{"fontSize":"13.5px","lineHeight":"1.65","color":"var(--muted)"}}>This is a drafting template written to reflect the obligations named below. It has not been reviewed by counsel — have a qualified lawyer in each jurisdiction you operate in review and adapt it before you publish.</div>
    </div>
    <div className="rs-r rs-legal" style={{"display":"grid","gridTemplateColumns":"250px minmax(0, 1fr)","gap":"40px","marginTop":"30px","alignItems":"start"}}>
      <div className="rs-jumpwrap" style={{"position":"sticky","top":"92px"}}>
        <div style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.3px","color":"var(--muted)","marginBottom":"14px"}}>ON THIS PAGE</div>
        <span className="rs-jump" onClick={(e) => handleJump(e.currentTarget.getAttribute("data-target"))} data-target="pr-0" data-on="1" style={{"display":"block","fontSize":"13.5px","lineHeight":"1.45","color":"var(--muted)","borderLeft":"2px solid var(--line2)","padding":"9px 0 9px 14px","cursor":"pointer","transition":"color .2s ease, border-color .2s ease"}}>Who we are</span>
        <span className="rs-jump" onClick={(e) => handleJump(e.currentTarget.getAttribute("data-target"))} data-target="pr-1" style={{"display":"block","fontSize":"13.5px","lineHeight":"1.45","color":"var(--muted)","borderLeft":"2px solid var(--line2)","padding":"9px 0 9px 14px","cursor":"pointer","transition":"color .2s ease, border-color .2s ease"}}>What we collect</span>
        <span className="rs-jump" onClick={(e) => handleJump(e.currentTarget.getAttribute("data-target"))} data-target="pr-2" style={{"display":"block","fontSize":"13.5px","lineHeight":"1.45","color":"var(--muted)","borderLeft":"2px solid var(--line2)","padding":"9px 0 9px 14px","cursor":"pointer","transition":"color .2s ease, border-color .2s ease"}}>Why we process it, and our lawful basis</span>
        <span className="rs-jump" onClick={(e) => handleJump(e.currentTarget.getAttribute("data-target"))} data-target="pr-3" style={{"display":"block","fontSize":"13.5px","lineHeight":"1.45","color":"var(--muted)","borderLeft":"2px solid var(--line2)","padding":"9px 0 9px 14px","cursor":"pointer","transition":"color .2s ease, border-color .2s ease"}}>Your rights in India — DPDP Act, 2023</span>
        <span className="rs-jump" onClick={(e) => handleJump(e.currentTarget.getAttribute("data-target"))} data-target="pr-4" style={{"display":"block","fontSize":"13.5px","lineHeight":"1.45","color":"var(--muted)","borderLeft":"2px solid var(--line2)","padding":"9px 0 9px 14px","cursor":"pointer","transition":"color .2s ease, border-color .2s ease"}}>Your rights in the United States</span>
        <span className="rs-jump" onClick={(e) => handleJump(e.currentTarget.getAttribute("data-target"))} data-target="pr-5" style={{"display":"block","fontSize":"13.5px","lineHeight":"1.45","color":"var(--muted)","borderLeft":"2px solid var(--line2)","padding":"9px 0 9px 14px","cursor":"pointer","transition":"color .2s ease, border-color .2s ease"}}>Global transfers and other regions</span>
        <span className="rs-jump" onClick={(e) => handleJump(e.currentTarget.getAttribute("data-target"))} data-target="pr-6" style={{"display":"block","fontSize":"13.5px","lineHeight":"1.45","color":"var(--muted)","borderLeft":"2px solid var(--line2)","padding":"9px 0 9px 14px","cursor":"pointer","transition":"color .2s ease, border-color .2s ease"}}>How long we keep it</span>
        <span className="rs-jump" onClick={(e) => handleJump(e.currentTarget.getAttribute("data-target"))} data-target="pr-7" style={{"display":"block","fontSize":"13.5px","lineHeight":"1.45","color":"var(--muted)","borderLeft":"2px solid var(--line2)","padding":"9px 0 9px 14px","cursor":"pointer","transition":"color .2s ease, border-color .2s ease"}}>Changes and how to complain</span>
      </div>
      <div style={{"minWidth":"0"}}>
      <div className="rs-sec" id="pr-0" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>01</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Who we are</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>StudentAlumni operates studentalumni.ai and the StudentAlumni mobile applications. For personal data you give us directly we are the <strong style={{"color":"var(--text)","fontWeight":"600"}}>Data Fiduciary</strong> under India’s Digital Personal Data Protection Act, 2023, and the <strong style={{"color":"var(--text)","fontWeight":"600"}}>controller</strong> under the GDPR.</div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>Where your college uses our platform to run its own placement programme, that institution is the controller for the records it uploads and we act as its <strong style={{"color":"var(--text)","fontWeight":"600"}}>Data Processor</strong>, bound by a written data processing agreement.</div>
        <div style={{"display":"grid","gap":"11px","marginBottom":"18px"}}>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Grievance Officer (India, DPDP s.13): grievance@studentalumni.ai</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Data Protection Officer (EU/UK): dpo@studentalumni.ai</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>US privacy requests: privacy@studentalumni.ai</div>
          </div>
        </div>
      </div>
      <div className="rs-sec" id="pr-1" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>02</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>What we collect</span>
        </div>
        <div style={{"border":"1px solid var(--line2)","borderRadius":"14px","overflow":"hidden","marginBottom":"20px"}}>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)","gap":"14px","background":"var(--panel2)","padding":"13px 16px"}}>
            <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.1px","color":"var(--muted)"}}>CATEGORY</span>
            <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.1px","color":"var(--muted)"}}>EXAMPLES</span>
            <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.1px","color":"var(--muted)"}}>SOURCE</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Identity</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Name, photo, date of birth, SA ID</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>You</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Contact</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Email, phone, city, state</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>You</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Academic</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>College, branch, year, CGPA, graduation year</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>You or your college</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Verification</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>College email domain, student ID, Aadhaar (last 4 shown), DigiLocker credentials</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>You, UIDAI, DigiLocker</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Career</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Resume, projects, skills, goals, readiness score, applications</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>You and our models</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Activity</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Sessions booked, events attended, tickets, roadmap progress</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Your use of the service</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Payment</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Transaction ID, amount, status, last 4 of instrument</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Razorpay (we never see full card data)</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Technical</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>IP address, device and browser, crash logs</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Automatic</span>
          </div>
        </div>
        <div style={{"display":"grid","gridTemplateColumns":"20px minmax(0, 1fr)","gap":"13px","border":"1px solid var(--accent-line)","borderRadius":"14px","background":"rgba(124,92,252,.07)","padding":"16px 18px","marginBottom":"18px"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"1.9","marginTop":"3px"}}><circle cx="12" cy="12" r="9"></circle><path d="M12 8v.01M12 11v5"></path></svg>
          <div>
            <div style={{"fontSize":"14.5px","fontWeight":"600","marginBottom":"5px"}}>Sensitive categories</div>
            <div style={{"fontSize":"13.5px","lineHeight":"1.65","color":"var(--muted)"}}>We do not ask for caste, religion, health, biometric templates or political views. Aadhaar numbers are stored encrypted, masked in every interface, and used only to verify identity against UIDAI — never for profiling or advertising.</div>
          </div>
        </div>
      </div>
      <div className="rs-sec" id="pr-2" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>03</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Why we process it, and our lawful basis</span>
        </div>
        <div style={{"border":"1px solid var(--line2)","borderRadius":"14px","overflow":"hidden","marginBottom":"20px"}}>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"14px","background":"var(--panel2)","padding":"13px 16px"}}>
            <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.1px","color":"var(--muted)"}}>PURPOSE</span>
            <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.1px","color":"var(--muted)"}}>DPDP BASIS (INDIA)</span>
            <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.1px","color":"var(--muted)"}}>GDPR BASIS</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Create and run your account</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Consent</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Contract, Art. 6(1)(b)</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Verify you are a student or alumnus</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Consent</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Contract / legal obligation</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Match you to mentors, roles and events</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Consent</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Contract</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Payments, invoices and refunds</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Legitimate use — contract</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Contract / legal obligation</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Security, fraud and abuse prevention</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Legitimate use</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Legitimate interests, Art. 6(1)(f)</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Product analytics and improvement</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Consent</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Legitimate interests</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Marketing email</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Consent</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Consent, Art. 6(1)(a)</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Meeting tax and regulatory duties</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Legitimate use — law</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Legal obligation, Art. 6(1)(c)</span>
          </div>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>We do not sell personal data, and we do not share it for cross-context behavioural advertising. There is no automated decision that produces a legal effect on you: your readiness score and match percentages are advisory, always visible to you, and never the sole reason an application is rejected.</div>
      </div>
      <div className="rs-sec" id="pr-3" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>04</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Your rights in India — DPDP Act, 2023</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>As a <strong style={{"color":"var(--text)","fontWeight":"600"}}>Data Principal</strong> you may exercise the following at any time from Profile → Security → Your data, or by writing to our Grievance Officer. We respond within 30 days.</div>
        <div style={{"display":"grid","gap":"11px","marginBottom":"18px"}}>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div><strong style={{"color":"var(--text)","fontWeight":"600"}}>Access</strong> (s.11) — a summary of the personal data we process and the identities we have shared it with.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div><strong style={{"color":"var(--text)","fontWeight":"600"}}>Correction and erasure</strong> (s.12) — correct inaccurate data, complete incomplete data, and have data erased once the purpose it was collected for is served.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div><strong style={{"color":"var(--text)","fontWeight":"600"}}>Grievance redressal</strong> (s.13) — raise a complaint with our Grievance Officer before approaching the Data Protection Board of India.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div><strong style={{"color":"var(--text)","fontWeight":"600"}}>Nomination</strong> (s.14) — nominate another person to exercise your rights in the event of your death or incapacity.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div><strong style={{"color":"var(--text)","fontWeight":"600"}}>Withdraw consent</strong> (s.6(4)) — as easily as it was given; we stop processing within a reasonable period.</div>
          </div>
        </div>
        <div style={{"display":"grid","gridTemplateColumns":"20px minmax(0, 1fr)","gap":"13px","border":"1px solid var(--accent-line)","borderRadius":"14px","background":"rgba(124,92,252,.07)","padding":"16px 18px","marginBottom":"18px"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"1.9","marginTop":"3px"}}><circle cx="12" cy="12" r="9"></circle><path d="M12 8v.01M12 11v5"></path></svg>
          <div>
            <div style={{"fontSize":"14.5px","fontWeight":"600","marginBottom":"5px"}}>Students under 18</div>
            <div style={{"fontSize":"13.5px","lineHeight":"1.65","color":"var(--muted)"}}>Under DPDP s.9 we require verifiable parental or guardian consent before processing the data of a child, and we do not undertake tracking, behavioural monitoring or targeted advertising directed at children. Age is checked at sign-up; where a college onboards a cohort, the institution warrants that it holds the necessary consents.</div>
          </div>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>You also have a duty under s.15 not to impersonate another person, suppress material information, or file a frivolous complaint.</div>
      </div>
      <div className="rs-sec" id="pr-4" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>05</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Your rights in the United States</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>There is no single federal privacy statute, so your rights depend on your state and on the kind of record involved. We apply the strongest applicable standard rather than the minimum.</div>
        <div style={{"display":"grid","gap":"11px","marginBottom":"18px"}}>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div><strong style={{"color":"var(--text)","fontWeight":"600"}}>CCPA / CPRA (California)</strong> — know, access, delete, correct, portability, limit use of sensitive personal information, and opt out of sale or sharing. We do not sell or share as those terms are defined. No discrimination for exercising a right.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div><strong style={{"color":"var(--text)","fontWeight":"600"}}>Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana and other state acts</strong> — access, correction, deletion, portability, opt-out of targeted advertising and profiling, and appeal of a refused request.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div><strong style={{"color":"var(--text)","fontWeight":"600"}}>FERPA</strong> — where a US institution engages us as a school official, education records are processed only under its direction, used solely for the purpose it authorised, and never redisclosed without consent.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div><strong style={{"color":"var(--text)","fontWeight":"600"}}>COPPA</strong> — we do not knowingly collect personal information from children under 13.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div><strong style={{"color":"var(--text)","fontWeight":"600"}}>Authorised agents</strong> — you may use an agent to make a request; we verify their authority and your identity.</div>
          </div>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>Requests go to privacy@studentalumni.ai. We confirm receipt within 10 days and substantively respond within 45 days, extendable once by a further 45 where reasonably necessary.</div>
      </div>
      <div className="rs-sec" id="pr-5" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>06</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Global transfers and other regions</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>Our primary data centres are in India (Mumbai) with a secondary region in Singapore. Where personal data moves out of its region of origin we rely on:</div>
        <div style={{"display":"grid","gap":"11px","marginBottom":"18px"}}>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>GDPR Chapter V — the European Commission’s Standard Contractual Clauses, the UK International Data Transfer Addendum, and a transfer impact assessment per corridor.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>DPDP s.16 — transfers only to countries not restricted by the Central Government, subject to any notified conditions.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Sub-processors under written contract, audited annually, each listed with its location and purpose in our sub-processor register.</div>
          </div>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>If you are in Brazil (LGPD), Canada (PIPEDA), Australia (Privacy Act) or another jurisdiction with comparable rights, we honour access, correction, deletion and complaint rights on the same terms as above.</div>
      </div>
      <div className="rs-sec" id="pr-6" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>07</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>How long we keep it</span>
        </div>
        <div style={{"border":"1px solid var(--line2)","borderRadius":"14px","overflow":"hidden","marginBottom":"20px"}}>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)","gap":"14px","background":"var(--panel2)","padding":"13px 16px"}}>
            <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.1px","color":"var(--muted)"}}>DATA</span>
            <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.1px","color":"var(--muted)"}}>RETENTION</span>
            <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.1px","color":"var(--muted)"}}>WHY</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Active account</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>While your account is open</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>To provide the service</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Closed account</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Deleted within 30 days</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>DPDP purpose limitation</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Payment records</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>8 financial years</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Indian tax and audit law</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Verification logs</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>3 years</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Fraud prevention, dispute resolution</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Support tickets</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>2 years</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Service quality and appeals</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Security event logs</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>12 months</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Incident investigation</span>
          </div>
          <div className="rs-trow" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)","gap":"14px","borderTop":"1px solid var(--line)","padding":"14px 16px"}}>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--text)","fontWeight":"600"}}>Aggregate analytics</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>Indefinite, de-identified</span>
            <span style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","fontWeight":"400"}}>No longer personal data</span>
          </div>
        </div>
      </div>
      <div className="rs-sec" id="pr-7" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>08</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Changes and how to complain</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>We notify you in the product and by email at least 14 days before a material change takes effect, and keep every prior version available for download. Continuing to use the service after the effective date means you accept the revised policy.</div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>If we have not resolved your concern, you may escalate to the <strong style={{"color":"var(--text)","fontWeight":"600"}}>Data Protection Board of India</strong>, to your EU or UK supervisory authority, to your state Attorney General in the US, or to the regulator in your own country. We will cooperate with any of them.</div>
      </div>
      </div>
    </div>
  
          <div style={{"marginTop":"46px","paddingTop":"40px","borderTop":"1px solid var(--line)"}}>
            <div style={{"display":"inline-flex","alignItems":"center","gap":"8px","fontSize":"10.5px","fontWeight":"700","letterSpacing":"1.5px","color":"var(--violet-lt)","background":"var(--tint-strong)","borderRadius":"100px","padding":"7px 13px","marginBottom":"18px"}}>TERMS OF USE</div>
            <div style={{"maxWidth":"780px"}}>
      <div style={{"minWidth":"0"}}>
      <div className="rs-sec" id="tm-0" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>01</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Agreement and eligibility</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>By creating an account you accept these terms. If you are accepting on behalf of a college or company, you confirm you have authority to bind it.</div>
        <div style={{"display":"grid","gap":"11px","marginBottom":"18px"}}>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>You must be at least 16 to hold an account in your own name; between 13 and 18 you need verifiable consent from a parent or guardian.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Student accounts require a verified college affiliation. Alumni accounts require proof of graduation.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>One account per person. Accounts are personal and may not be sold, shared or transferred.</div>
          </div>
        </div>
      </div>
      <div className="rs-sec" id="tm-1" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>02</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>What the service is — and is not</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>We provide tools: a career roadmap, mentor introductions, job and internship matching, event registration, verified identity and a rentals marketplace.</div>
        <div style={{"display":"grid","gridTemplateColumns":"20px minmax(0, 1fr)","gap":"13px","border":"1px solid var(--accent-line)","borderRadius":"14px","background":"rgba(124,92,252,.07)","padding":"16px 18px","marginBottom":"18px"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"1.9","marginTop":"3px"}}><circle cx="12" cy="12" r="9"></circle><path d="M12 8v.01M12 11v5"></path></svg>
          <div>
            <div style={{"fontSize":"14.5px","fontWeight":"600","marginBottom":"5px"}}>No guarantee of outcome</div>
            <div style={{"fontSize":"13.5px","lineHeight":"1.65","color":"var(--muted)"}}>We do not promise a job, an internship, an interview, a referral, a specific salary, admission to any programme, or a particular readiness score. Match percentages and roadmaps are advisory estimates, not commitments by us or by any employer.</div>
          </div>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>Mentors are independent individuals, not our employees. Employers, colleges, event organisers and rental hosts are third parties. We verify identity and affiliation, but we do not underwrite the advice they give, the roles they post, or the property they list.</div>
      </div>
      <div className="rs-sec" id="tm-2" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>03</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Your responsibilities</span>
        </div>
        <div style={{"display":"grid","gap":"11px","marginBottom":"18px"}}>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Keep your information accurate — particularly academic details, which others rely on.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Keep your credentials secure and tell us promptly if you suspect misuse.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Do not impersonate anyone, misstate your qualifications, or forge a verification document.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Do not scrape, crawl, resell or bulk-export data about other users, or use the platform to recruit for a competing service.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Do not upload malware, attempt to breach our systems, or probe them without written permission.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Respect the community code of conduct in every space we operate.</div>
          </div>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>We may suspend or terminate an account that breaches these terms. Where the breach is not severe we give notice and a chance to fix it first; for fraud, harassment or a security attack, suspension is immediate.</div>
      </div>
      <div className="rs-sec" id="tm-3" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>04</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Payments, refunds and cancellations</span>
        </div>
        <div style={{"display":"grid","gap":"11px","marginBottom":"18px"}}>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Prices are shown inclusive of applicable taxes before you pay. Payments are processed by Razorpay; we do not store your card details.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Event tickets: full refund up to 24 hours before the event begins. After that the organiser’s policy applies and we pass your request on.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Mentor sessions: full refund if cancelled 12 hours ahead, or if the mentor does not attend.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Rentals: the cancellation terms shown on the listing apply; security deposits are refundable less verified damage.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Subscriptions renew until cancelled, and you may cancel any time before the next renewal date.</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"18px minmax(0, 1fr)","gap":"12px","fontSize":"14.5px","lineHeight":"1.7","color":"var(--muted)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"2.2","marginTop":"5px"}}><path d="M5 12.5l4 4 9-9.5"></path></svg>
            <div>Coupons and perks are personal, non-transferable and have no cash value.</div>
          </div>
        </div>
      </div>
      <div className="rs-sec" id="tm-4" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>05</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Your content and our platform</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>You keep ownership of everything you upload — your resume, projects, photos and posts. You grant us a worldwide, non-exclusive, royalty-free licence to host, reproduce and display that content solely to operate and improve the service, and to show it to the people you choose to share it with. The licence ends when you delete the content, except for copies in backups that expire on our normal cycle.</div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>Our software, design, trade marks, the SA mark and the ECHO brand remain ours. Nothing here grants you a licence to use them beyond ordinary use of the service.</div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>If you believe content on the platform infringes your rights, write to legal@studentalumni.ai with enough detail to identify the material. We act on valid notices and reinstate content wrongly removed.</div>
      </div>
      <div className="rs-sec" id="tm-5" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>06</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Liability</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>We provide the service with reasonable skill and care, but it is offered as-is. To the maximum extent permitted by law we exclude implied warranties of merchantability, fitness for a particular purpose and non-infringement.</div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>Neither party is liable for indirect, incidental, special or consequential loss, or for loss of profit, revenue, data or opportunity. Our total aggregate liability to you is limited to the greater of the amount you paid us in the 12 months before the claim, or INR 5,000.</div>
        <div style={{"display":"grid","gridTemplateColumns":"20px minmax(0, 1fr)","gap":"13px","border":"1px solid var(--accent-line)","borderRadius":"14px","background":"rgba(124,92,252,.07)","padding":"16px 18px","marginBottom":"18px"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"1.9","marginTop":"3px"}}><circle cx="12" cy="12" r="9"></circle><path d="M12 8v.01M12 11v5"></path></svg>
          <div>
            <div style={{"fontSize":"14.5px","fontWeight":"600","marginBottom":"5px"}}>What we never exclude</div>
            <div style={{"fontSize":"13.5px","lineHeight":"1.65","color":"var(--muted)"}}>Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited — including your non-waivable statutory rights as a consumer.</div>
          </div>
        </div>
      </div>
      <div className="rs-sec" id="tm-6" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>07</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Suspension, termination and survival</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>You may close your account at any time from Profile → Security. We may terminate on 30 days’ notice, or immediately for a serious breach. On termination your right to use the service stops, and we delete your data as described in the Privacy Policy.</div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>Provisions that by their nature should survive — content licences already granted to recipients, liability limits, payment obligations already incurred, and dispute resolution — continue after termination.</div>
      </div>
      <div className="rs-sec" id="tm-7" style={{"borderTop":"1px solid var(--line)","padding":"30px 0 4px"}}>
        <div style={{"display":"flex","alignItems":"baseline","gap":"12px","marginBottom":"14px"}}>
          <span style={{"fontSize":"12px","fontWeight":"700","color":"var(--dim)","flex":"none"}}>08</span>
          <span style={{"fontSize":"21px","fontWeight":"700","letterSpacing":"-.5px"}}>Governing law and disputes</span>
        </div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>These terms are governed by the laws of India, and the courts at Hyderabad, Telangana have exclusive jurisdiction — except that if you are a consumer resident in the EU, UK or a US state, you keep the right to bring proceedings in your local courts under your local law.</div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>Before litigation, both sides agree to try to resolve the dispute in good faith within 30 days of written notice. We do not require you to waive any right to a class action or jury trial where that waiver is unenforceable in your jurisdiction.</div>
        <div style={{"fontSize":"15px","lineHeight":"1.75","color":"var(--muted)","marginBottom":"16px"}}>Questions about these terms: legal@studentalumni.ai</div>
      </div>
      </div>
    </div>
  
          </div></div>

  

  

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
