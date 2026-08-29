import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';

export default function HelpCenterPage() {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [openAcc, setOpenAcc] = useState<Record<number, boolean>>({});

  const toggleCategory = (catKey: string) => {
    if (activeCat === catKey) {
      setActiveCat(null);
    } else {
      setActiveCat(catKey);
      setTimeout(() => {
        const el = document.getElementById('catpanel-' + catKey);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const toggleAcc = (idx: number) => {
    setOpenAcc(prev => ({ ...prev, [idx]: !prev[idx] }));
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
          .rs-catpanel {
            scroll-margin-top: 108px;
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
            --sky: #6FD6FF;
            --sky-tint: rgba(47,184,198,.12);
            --sky-line: #1F4E5C;
            --ok: #34D399;
            --ok-tint: rgba(16,185,129,.13);
            --ok-line: #17503E;
            --warn-tint: rgba(245,179,66,.13);
            --tag-danger: #F58C8C;
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

      <Navbar activeTab="verify" />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <div id="rs-page-help" className="rs-page" style={{"display":"block","position":"relative","zIndex":"1","maxWidth":"1400px","margin":"0 auto","padding":"34px 28px 90px"}}>
    <div className="rs-r" style={{"border":"1px solid var(--line)","borderRadius":"20px","background":"var(--panel)","padding":"34px 32px 36px","textAlign":"center"}}>
      <div style={{"fontSize":"36px","fontWeight":"700","letterSpacing":"-1.4px"}}>How can we help?</div>
      <div style={{"fontSize":"15.5px","color":"var(--muted)","margin":"10px 0 26px"}}>Search the guides, or reach the team directly — we answer within one working day.</div>
      <div className="rs-field" style={{"display":"flex","alignItems":"center","gap":"12px","maxWidth":"620px","margin":"0 auto","border":"1px solid var(--line2)","borderRadius":"14px","background":"var(--panel2)","padding":"16px 18px","cursor":"text"}}>
        <svg width="17" height="17" viewBox="0 0 16 16" style={{"fill":"none","stroke":"var(--muted)","strokeWidth":"1.7","flex":"none"}}><circle cx="7" cy="7" r="4.6"></circle><path d="M10.5 10.5L14 14"></path></svg>
        <span style={{"fontSize":"15px","color":"var(--dim)"}}>Search articles — verification, payments, tickets…</span>
      </div>
      <div style={{"display":"flex","gap":"8px","justifyContent":"center","flexWrap":"wrap","marginTop":"18px"}}>
        <span style={{"fontSize":"12.5px","color":"var(--muted)"}}>Popular:</span>
        <span className="rs-link" style={{"fontSize":"12.5px","fontWeight":"600","color":"var(--violet-lt)","cursor":"pointer"}}>College email not verifying</span>
        <span style={{"color":"var(--dim)"}}>·</span>
        <span className="rs-link" style={{"fontSize":"12.5px","fontWeight":"600","color":"var(--violet-lt)","cursor":"pointer"}}>Refund an event ticket</span>
        <span style={{"color":"var(--dim)"}}>·</span>
        <span className="rs-link" style={{"fontSize":"12.5px","fontWeight":"600","color":"var(--violet-lt)","cursor":"pointer"}}>Download my data</span>
      </div>
    </div>

    <div className="rs-r rs-grid3" style={{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0, 1fr))","gap":"18px","marginTop":"22px"}}>
      <div className="rs-card rs-cat" data-cat="account" onClick={() => toggleCategory('account')} style={{"border":"1px solid var(--line)","borderRadius":"18px","background":"var(--panel)","boxShadow":"var(--shadow)","padding":"22px 24px 24px","cursor":"pointer","transition":"transform .25s cubic-bezier(.2,.8,.2,1)"}}>
        <span style={{"width":"40px","height":"40px","borderRadius":"12px","background":"var(--tint-strong)","display":"flex","alignItems":"center","justifyContent":"center","marginBottom":"16px"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"1.8"}}><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z"></path><path d="M9 12l2 2 4-4"></path></svg>
        </span>
        <div style={{"fontSize":"17px","fontWeight":"700"}}>Account &amp; verification</div>
        <div style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","margin":"7px 0 14px"}}>College email, DigiLocker, Aadhaar, SA ID and profile completion.</div>
        <div style={{"fontSize":"12.5px","fontWeight":"600","color":"var(--violet-lt)"}}>14 articles</div>
      </div>
      <div className="rs-card rs-cat" data-cat="payments" onClick={() => toggleCategory('payments')} style={{"border":"1px solid var(--line)","borderRadius":"18px","background":"var(--panel)","boxShadow":"var(--shadow)","padding":"22px 24px 24px","cursor":"pointer","transition":"transform .25s cubic-bezier(.2,.8,.2,1)"}}>
        <span style={{"width":"40px","height":"40px","borderRadius":"12px","background":"rgba(47,184,198,.12)","display":"flex","alignItems":"center","justifyContent":"center","marginBottom":"16px"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--sky)","strokeWidth":"1.8"}}><rect x="3" y="5.5" width="18" height="13" rx="2.5"></rect><path d="M3 10h18"></path></svg>
        </span>
        <div style={{"fontSize":"17px","fontWeight":"700"}}>Payments &amp; tickets</div>
        <div style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","margin":"7px 0 14px"}}>Razorpay charges, invoices, refunds, coupons and entry passes.</div>
        <div style={{"fontSize":"12.5px","fontWeight":"600","color":"var(--sky)"}}>11 articles</div>
      </div>
      <div className="rs-card rs-cat" data-cat="mentors" onClick={() => toggleCategory('mentors')} style={{"border":"1px solid var(--line)","borderRadius":"18px","background":"var(--panel)","boxShadow":"var(--shadow)","padding":"22px 24px 24px","cursor":"pointer","transition":"transform .25s cubic-bezier(.2,.8,.2,1)"}}>
        <span style={{"width":"40px","height":"40px","borderRadius":"12px","background":"var(--ok-tint)","display":"flex","alignItems":"center","justifyContent":"center","marginBottom":"16px"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--ok)","strokeWidth":"1.8"}}><circle cx="9" cy="9" r="3"></circle><path d="M3 19q6-6 12 0M16.5 7a3 3 0 010 6"></path></svg>
        </span>
        <div style={{"fontSize":"17px","fontWeight":"700"}}>Mentors &amp; sessions</div>
        <div style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","margin":"7px 0 14px"}}>Booking, rescheduling, session etiquette and mentor payouts.</div>
        <div style={{"fontSize":"12.5px","fontWeight":"600","color":"var(--ok)"}}>9 articles</div>
      </div>
      <div className="rs-card rs-cat" data-cat="events" onClick={() => toggleCategory('events')} style={{"border":"1px solid var(--line)","borderRadius":"18px","background":"var(--panel)","boxShadow":"var(--shadow)","padding":"22px 24px 24px","cursor":"pointer","transition":"transform .25s cubic-bezier(.2,.8,.2,1)"}}>
        <span style={{"width":"40px","height":"40px","borderRadius":"12px","background":"var(--warn-tint)","display":"flex","alignItems":"center","justifyContent":"center","marginBottom":"16px"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--amber)","strokeWidth":"1.8"}}><rect x="3.5" y="5" width="17" height="15" rx="2.5"></rect><path d="M3.5 10h17M8 5V2.5M16 5V2.5"></path></svg>
        </span>
        <div style={{"fontSize":"17px","fontWeight":"700"}}>Events &amp; ECHO</div>
        <div style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","margin":"7px 0 14px"}}>Registration, team formation, on-campus check-in and certificates.</div>
        <div style={{"fontSize":"12.5px","fontWeight":"600","color":"var(--amber)"}}>12 articles</div>
      </div>
      <div className="rs-card rs-cat" data-cat="rentals" onClick={() => toggleCategory('rentals')} style={{"border":"1px solid var(--line)","borderRadius":"18px","background":"var(--panel)","boxShadow":"var(--shadow)","padding":"22px 24px 24px","cursor":"pointer","transition":"transform .25s cubic-bezier(.2,.8,.2,1)"}}>
        <span style={{"width":"40px","height":"40px","borderRadius":"12px","background":"var(--tint-strong)","display":"flex","alignItems":"center","justifyContent":"center","marginBottom":"16px"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--violet-lt)","strokeWidth":"1.8"}}><path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5"></path></svg>
        </span>
        <div style={{"fontSize":"17px","fontWeight":"700"}}>Rentals &amp; wallet</div>
        <div style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","margin":"7px 0 14px"}}>Bookings, deposits, cancellations and SA Wallet balances.</div>
        <div style={{"fontSize":"12.5px","fontWeight":"600","color":"var(--violet-lt)"}}>8 articles</div>
      </div>
      <div className="rs-card rs-cat" data-cat="privacy" onClick={() => toggleCategory('privacy')} style={{"border":"1px solid var(--line)","borderRadius":"18px","background":"var(--panel)","boxShadow":"var(--shadow)","padding":"22px 24px 24px","cursor":"pointer","transition":"transform .25s cubic-bezier(.2,.8,.2,1)"}}>
        <span style={{"width":"40px","height":"40px","borderRadius":"12px","background":"rgba(240,97,107,.12)","display":"flex","alignItems":"center","justifyContent":"center","marginBottom":"16px"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--tag-danger)","strokeWidth":"1.8"}}><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9.5a2.5 2.5 0 113 2.4v1.3M12 16.5v.01"></path></svg>
        </span>
        <div style={{"fontSize":"17px","fontWeight":"700"}}>Privacy &amp; your data</div>
        <div style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","margin":"7px 0 14px"}}>Export, correct or erase your data, and manage consent.</div>
        <div style={{"fontSize":"12.5px","fontWeight":"600","color":"var(--tag-danger)"}}>7 articles</div>
      </div>
    </div>

    <div className="rs-r">
      <div id="catpanel-account" className="rs-catpanel" data-cat="account" style={{ display: activeCat === 'account' ? 'block' : 'none', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 26px 10px', marginTop: '18px' }}>
        <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px","marginBottom":"6px","flexWrap":"wrap"}}>
          <div>
            <div style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.3px","color":"var(--violet-lt)","marginBottom":"6px"}}>8 ARTICLES</div>
            <div style={{"fontSize":"20px","fontWeight":"700","letterSpacing":"-.5px"}}>Account &amp; verification</div>
          </div>
          <span className="rs-catclose" onClick={() => setActiveCat(null)} style={{"display":"inline-flex","alignItems":"center","gap":"8px","fontSize":"13px","fontWeight":"600","color":"var(--muted)","border":"1px solid var(--line2)","borderRadius":"100px","padding":"8px 14px","cursor":"pointer","transition":"background .2s ease, filter .2s ease, transform .2s ease"}}>
            <svg width="13" height="13" viewBox="0 0 16 16" style={{"fill":"none","stroke":"currentColor","strokeWidth":"1.9"}}><path d="M4 4l8 8M12 4l-8 8"></path></svg>Close
          </span>
        </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Verify your college email</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Which domains we accept, and what to do when yours is new</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Verify with a student ID instead</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>The fallback route when email verification fails</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Connect DigiLocker in one click</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Pull degrees, marksheets and ABC credentials automatically</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Aadhaar (UIDAI) verification explained</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>What we store, what we mask, and why we ask</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Understanding your SA ID</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>How the ID is formed and where it is accepted</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Raise your profile completion score</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>The nine items that move the number</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Change your college or graduation year</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Re-verification steps after a transfer</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Recover an account you cannot sign into</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Email, phone and identity-based recovery</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
      </div>
      <div id="catpanel-payments" className="rs-catpanel" data-cat="payments" style={{ display: activeCat === 'payments' ? 'block' : 'none', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 26px 10px', marginTop: '18px' }}>
        <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px","marginBottom":"6px","flexWrap":"wrap"}}>
          <div>
            <div style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.3px","color":"var(--sky)","marginBottom":"6px"}}>7 ARTICLES</div>
            <div style={{"fontSize":"20px","fontWeight":"700","letterSpacing":"-.5px"}}>Payments &amp; tickets</div>
          </div>
          <span className="rs-catclose" onClick={() => setActiveCat(null)} style={{"display":"inline-flex","alignItems":"center","gap":"8px","fontSize":"13px","fontWeight":"600","color":"var(--muted)","border":"1px solid var(--line2)","borderRadius":"100px","padding":"8px 14px","cursor":"pointer","transition":"background .2s ease, filter .2s ease, transform .2s ease"}}>
            <svg width="13" height="13" viewBox="0 0 16 16" style={{"fill":"none","stroke":"currentColor","strokeWidth":"1.9"}}><path d="M4 4l8 8M12 4l-8 8"></path></svg>Close
          </span>
        </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>How Razorpay charges appear on your statement</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Descriptor names and settlement timing</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Download an invoice or GST receipt</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>From My Tickets and My Bookings</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Request a refund on an event ticket</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>The 24-hour window and what happens after it</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>A payment failed but money left my account</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Auto-reversal timelines and how to escalate</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Apply a coupon or perk code</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Where codes go and why one may be rejected</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Team registration billing</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Who pays, how the fee is split, and per-member passes</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Security deposits on rentals</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>How much is held, and when it returns</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
      </div>
      <div id="catpanel-mentors" className="rs-catpanel" data-cat="mentors" style={{ display: activeCat === 'mentors' ? 'block' : 'none', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 26px 10px', marginTop: '18px' }}>
        <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px","marginBottom":"6px","flexWrap":"wrap"}}>
          <div>
            <div style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.3px","color":"var(--ok)","marginBottom":"6px"}}>7 ARTICLES</div>
            <div style={{"fontSize":"20px","fontWeight":"700","letterSpacing":"-.5px"}}>Mentors &amp; sessions</div>
          </div>
          <span className="rs-catclose" onClick={() => setActiveCat(null)} style={{"display":"inline-flex","alignItems":"center","gap":"8px","fontSize":"13px","fontWeight":"600","color":"var(--muted)","border":"1px solid var(--line2)","borderRadius":"100px","padding":"8px 14px","cursor":"pointer","transition":"background .2s ease, filter .2s ease, transform .2s ease"}}>
            <svg width="13" height="13" viewBox="0 0 16 16" style={{"fill":"none","stroke":"currentColor","strokeWidth":"1.9"}}><path d="M4 4l8 8M12 4l-8 8"></path></svg>Close
          </span>
        </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Book your first mentor session</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Choosing a mentor and preparing for the call</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Reschedule or cancel a session</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>The 12-hour rule and no-show credits</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>What to bring to a session</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>The three questions that make a call useful</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Session etiquette and what to expect</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Format, length and follow-up</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Ask a mentor for a referral</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>When to ask, and how to make it easy to say yes</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Rate a mentor and give feedback</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>How ratings work and who sees them</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Become a mentor</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Eligibility, verification and payout setup</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
      </div>
      <div id="catpanel-events" className="rs-catpanel" data-cat="events" style={{ display: activeCat === 'events' ? 'block' : 'none', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 26px 10px', marginTop: '18px' }}>
        <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px","marginBottom":"6px","flexWrap":"wrap"}}>
          <div>
            <div style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.3px","color":"var(--amber)","marginBottom":"6px"}}>8 ARTICLES</div>
            <div style={{"fontSize":"20px","fontWeight":"700","letterSpacing":"-.5px"}}>Events &amp; ECHO</div>
          </div>
          <span className="rs-catclose" onClick={() => setActiveCat(null)} style={{"display":"inline-flex","alignItems":"center","gap":"8px","fontSize":"13px","fontWeight":"600","color":"var(--muted)","border":"1px solid var(--line2)","borderRadius":"100px","padding":"8px 14px","cursor":"pointer","transition":"background .2s ease, filter .2s ease, transform .2s ease"}}>
            <svg width="13" height="13" viewBox="0 0 16 16" style={{"fill":"none","stroke":"currentColor","strokeWidth":"1.9"}}><path d="M4 4l8 8M12 4l-8 8"></path></svg>Close
          </span>
        </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Register for an ECHO event</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Individual and team registration, step by step</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Form a team at the venue</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>The 2–5 member rule and how to find teammates</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Check in on campus</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Your entry pass, QR code and what ID to carry</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Change your track or theme on event day</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Why the field is optional at registration</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Get your participation certificate</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>When it is issued and where to download it</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Receive passes and invoices on WhatsApp</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Opting in and out of delivery</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Event cancelled or postponed</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Automatic refunds and rescheduling</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Host an ECHO event at your college</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>What the CDC needs to provide</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
      </div>
      <div id="catpanel-rentals" className="rs-catpanel" data-cat="rentals" style={{ display: activeCat === 'rentals' ? 'block' : 'none', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 26px 10px', marginTop: '18px' }}>
        <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px","marginBottom":"6px","flexWrap":"wrap"}}>
          <div>
            <div style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.3px","color":"var(--violet-lt)","marginBottom":"6px"}}>6 ARTICLES</div>
            <div style={{"fontSize":"20px","fontWeight":"700","letterSpacing":"-.5px"}}>Rentals &amp; wallet</div>
          </div>
          <span className="rs-catclose" onClick={() => setActiveCat(null)} style={{"display":"inline-flex","alignItems":"center","gap":"8px","fontSize":"13px","fontWeight":"600","color":"var(--muted)","border":"1px solid var(--line2)","borderRadius":"100px","padding":"8px 14px","cursor":"pointer","transition":"background .2s ease, filter .2s ease, transform .2s ease"}}>
            <svg width="13" height="13" viewBox="0 0 16 16" style={{"fill":"none","stroke":"currentColor","strokeWidth":"1.9"}}><path d="M4 4l8 8M12 4l-8 8"></path></svg>Close
          </span>
        </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Book a PG, hostel or flexi desk</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Search, filter and confirm a listing</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Understand the price breakdown</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Rate, SA savings, service fee and deposit</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Cancel a rental booking</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Per-listing cancellation terms</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Report an issue with a host or property</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Our verification promise and dispute process</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Top up and use SA Wallet</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Balances, refunds and expiry</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Self-drive vehicle requirements</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Licence, age and insurance conditions</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
      </div>
      <div id="catpanel-privacy" className="rs-catpanel" data-cat="privacy" style={{ display: activeCat === 'privacy' ? 'block' : 'none', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 26px 10px', marginTop: '18px' }}>
        <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px","marginBottom":"6px","flexWrap":"wrap"}}>
          <div>
            <div style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.3px","color":"var(--tag-danger)","marginBottom":"6px"}}>7 ARTICLES</div>
            <div style={{"fontSize":"20px","fontWeight":"700","letterSpacing":"-.5px"}}>Privacy &amp; your data</div>
          </div>
          <span className="rs-catclose" onClick={() => setActiveCat(null)} style={{"display":"inline-flex","alignItems":"center","gap":"8px","fontSize":"13px","fontWeight":"600","color":"var(--muted)","border":"1px solid var(--line2)","borderRadius":"100px","padding":"8px 14px","cursor":"pointer","transition":"background .2s ease, filter .2s ease, transform .2s ease"}}>
            <svg width="13" height="13" viewBox="0 0 16 16" style={{"fill":"none","stroke":"currentColor","strokeWidth":"1.9"}}><path d="M4 4l8 8M12 4l-8 8"></path></svg>Close
          </span>
        </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Export all of your data</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>The 72-hour archive and what it contains</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Correct inaccurate information</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Your right under DPDP s.12 and GDPR Art. 16</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Delete your account and data</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>The 30-day process and what we must retain</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Control who sees your profile and resume</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Mentor, recruiter and college visibility</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Withdraw a consent you gave</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Per-purpose withdrawal, as easy as giving it</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Manage cookie preferences</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Necessary, preferences, analytics and marketing</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
            <div className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>Raise a grievance with our Grievance Officer</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>Escalating to the Data Protection Board of India</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
      </div>
    </div>

    <div className="rs-r rs-help2" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) 380px","gap":"20px","marginTop":"22px","alignItems":"start"}}>
      <div style={{"border":"1px solid var(--line)","borderRadius":"18px","background":"var(--panel)","padding":"24px 26px 8px"}}>
        <div style={{"fontSize":"19px","fontWeight":"700","letterSpacing":"-.4px","marginBottom":"6px"}}>Common questions</div>
        <div className="rs-acc" onClick={() => toggleAcc(0)} style={{ borderTop: '1px solid var(--line)', padding: '18px 0', cursor: 'pointer' }}>
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px"}}>
            <span style={{"fontSize":"15px","fontWeight":"600"}}>My college email isn't being accepted</span>
            <span className="rs-acc-ico" style={{ flex: 'none', transition: 'transform .3s ease', transform: openAcc[0] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--muted)","strokeWidth":"2"}}><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </div>
          <div className="rs-acc-body" style={{ display: openAcc[0] ? 'block' : 'none', fontSize: '14px', lineHeight: '1.65', color: 'var(--muted)', paddingTop: '12px' }}>We verify against the domain your institution registered with us. If your domain is new or was recently changed, ask your placement office to confirm it, or verify with your student ID card instead — both routes issue the same SA ID.</div>
        </div>
        <div className="rs-acc" onClick={() => toggleAcc(1)} style={{ borderTop: '1px solid var(--line)', padding: '18px 0', cursor: 'pointer' }}>
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px"}}>
            <span style={{"fontSize":"15px","fontWeight":"600"}}>Can I get a refund on an event ticket?</span>
            <span className="rs-acc-ico" style={{ flex: 'none', transition: 'transform .3s ease', transform: openAcc[1] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--muted)","strokeWidth":"2"}}><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </div>
          <div className="rs-acc-body" style={{ display: openAcc[1] ? 'block' : 'none', fontSize: '14px', lineHeight: '1.65', color: 'var(--muted)', paddingTop: '12px' }}>Yes — in full up to 24 hours before the event starts, from My Tickets. Refunds return to the original payment method via Razorpay and settle in 5–7 working days. After that window the organiser decides, and we pass your request on.</div>
        </div>
        <div className="rs-acc" onClick={() => toggleAcc(2)} style={{ borderTop: '1px solid var(--line)', padding: '18px 0', cursor: 'pointer' }}>
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px"}}>
            <span style={{"fontSize":"15px","fontWeight":"600"}}>Who can see my profile and resume?</span>
            <span className="rs-acc-ico" style={{ flex: 'none', transition: 'transform .3s ease', transform: openAcc[2] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--muted)","strokeWidth":"2"}}><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </div>
          <div className="rs-acc-body" style={{ display: openAcc[2] ? 'block' : 'none', fontSize: '14px', lineHeight: '1.65', color: 'var(--muted)', paddingTop: '12px' }}>Only people you share it with. Mentors see what you send them for a session; recruiters see a profile only after you apply or explicitly accept an approach. Your college's placement office sees aggregate cohort data, not individual documents, unless you opt in.</div>
        </div>
        <div className="rs-acc" onClick={() => toggleAcc(3)} style={{ borderTop: '1px solid var(--line)', padding: '18px 0', cursor: 'pointer' }}>
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px"}}>
            <span style={{"fontSize":"15px","fontWeight":"600"}}>How do I export or delete my data?</span>
            <span className="rs-acc-ico" style={{ flex: 'none', transition: 'transform .3s ease', transform: openAcc[3] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--muted)","strokeWidth":"2"}}><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </div>
          <div className="rs-acc-body" style={{ display: openAcc[3] ? 'block' : 'none', fontSize: '14px', lineHeight: '1.65', color: 'var(--muted)', paddingTop: '12px' }}>Profile → Security → Your data. Export delivers a machine-readable archive by email within 72 hours. Deletion removes your profile, documents and activity within 30 days; we keep only what tax and payment law requires us to retain, and tell you exactly what that is.</div>
        </div>
        <div className="rs-acc" onClick={() => toggleAcc(4)} style={{ borderTop: '1px solid var(--line)', padding: '18px 0', cursor: 'pointer' }}>
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px"}}>
            <span style={{"fontSize":"15px","fontWeight":"600"}}>Is StudentAlumni free for students?</span>
            <span className="rs-acc-ico" style={{ flex: 'none', transition: 'transform .3s ease', transform: openAcc[4] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--muted)","strokeWidth":"2"}}><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </div>
          <div className="rs-acc-body" style={{ display: openAcc[4] ? 'block' : 'none', fontSize: '14px', lineHeight: '1.65', color: 'var(--muted)', paddingTop: '12px' }}>The account, roadmap, network and job matching are free for verified students. Paid items are optional and always priced up front: some mentor sessions, some workshops, event tickets and rentals.</div>
        </div>
      </div>
      <div style={{"display":"grid","gap":"16px"}}>
        <div style={{"border":"1px solid var(--accent-line)","borderRadius":"18px","background":"linear-gradient(155deg, var(--tint), var(--panel) 62%)","padding":"24px 26px 26px"}}>
          <div style={{"fontSize":"17px","fontWeight":"700","marginBottom":"8px"}}>Still stuck?</div>
          <div style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","marginBottom":"20px"}}>Real people, one working day. Include your SA ID and we'll be faster.</div>
          <div style={{"display":"grid","gap":"10px"}}>
            <span className="rs-btn" style={{"display":"flex","alignItems":"center","justifyContent":"center","gap":"9px","fontSize":"14px","fontWeight":"600","background":"var(--violet)","color":"#FFFFFF","borderRadius":"11px","padding":"13px","cursor":"pointer","transition":"background .2s ease, filter .2s ease, transform .2s ease"}}>Contact support</span>
            <span className="rs-ghostb" style={{"display":"flex","alignItems":"center","justifyContent":"center","gap":"9px","fontSize":"14px","fontWeight":"600","border":"1px solid var(--line2)","borderRadius":"11px","padding":"13px","cursor":"pointer","transition":"background .2s ease, filter .2s ease, transform .2s ease"}}>WhatsApp us</span>
          </div>
        </div>
        <div style={{"border":"1px solid var(--line)","borderRadius":"18px","background":"var(--panel)","padding":"22px 24px"}}>
          <div style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.3px","color":"var(--muted)","marginBottom":"16px"}}>RESPONSE TIMES</div>
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","padding":"9px 0","borderBottom":"1px solid var(--line)"}}>
            <span style={{"fontSize":"13.5px","color":"var(--muted)"}}>Support email</span><span style={{"fontSize":"13.5px","fontWeight":"600"}}>&lt; 24 h</span>
          </div>
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","padding":"9px 0","borderBottom":"1px solid var(--line)"}}>
            <span style={{"fontSize":"13.5px","color":"var(--muted)"}}>Payment issues</span><span style={{"fontSize":"13.5px","fontWeight":"600"}}>&lt; 12 h</span>
          </div>
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","padding":"9px 0","borderBottom":"1px solid var(--line)"}}>
            <span style={{"fontSize":"13.5px","color":"var(--muted)"}}>Privacy requests</span><span style={{"fontSize":"13.5px","fontWeight":"600"}}>&lt; 30 days</span>
          </div>
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","padding":"9px 0"}}>
            <span style={{"fontSize":"13.5px","color":"var(--muted)"}}>Security reports</span><span style={{"fontSize":"13.5px","fontWeight":"600","color":"var(--ok)"}}>&lt; 4 h</span>
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
