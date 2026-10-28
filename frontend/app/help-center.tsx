import React, { useState } from 'react';
import { WebOnlyRoute } from '@/src/lib/nativeGuard';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';

type HelpArticle = { title: string; sub: string };
type HelpCategory = {
  key: string;
  title: string;
  desc: string;
  /** Count shown on the overview card. */
  count: string;
  /** Eyebrow label shown inside the expanded panel. */
  panelLabel: string;
  color: string;
  iconBg: string;
  icon: React.ReactNode;
  articles: HelpArticle[];
};

const CATEGORIES: HelpCategory[] = [
  {
    key: "account",
    title: "Account & verification",
    desc: "College email, DigiLocker, Aadhaar, SA ID and profile completion.",
    count: "14 articles",
    panelLabel: "8 ARTICLES",
    color: "var(--violet-lt)",
    iconBg: "var(--tint-strong)",
    icon: <><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z"></path><path d="M9 12l2 2 4-4"></path></>,
    articles: [
      { title: "Verify your college email", sub: "Which domains we accept, and what to do when yours is new" },
      { title: "Verify with a student ID instead", sub: "The fallback route when email verification fails" },
      { title: "Connect DigiLocker in one click", sub: "Pull degrees, marksheets and ABC credentials automatically" },
      { title: "Aadhaar (UIDAI) verification explained", sub: "What we store, what we mask, and why we ask" },
      { title: "Understanding your SA ID", sub: "How the ID is formed and where it is accepted" },
      { title: "Raise your profile completion score", sub: "The nine items that move the number" },
      { title: "Change your college or graduation year", sub: "Re-verification steps after a transfer" },
      { title: "Recover an account you cannot sign into", sub: "Email, phone and identity-based recovery" },
    ],
  },
  {
    key: "payments",
    title: "Payments & tickets",
    desc: "Razorpay charges, invoices, refunds, coupons and entry passes.",
    count: "11 articles",
    panelLabel: "7 ARTICLES",
    color: "var(--sky)",
    iconBg: "rgba(47,184,198,.12)",
    icon: <><rect x="3" y="5.5" width="18" height="13" rx="2.5"></rect><path d="M3 10h18"></path></>,
    articles: [
      { title: "How Razorpay charges appear on your statement", sub: "Descriptor names and settlement timing" },
      { title: "Download an invoice or GST receipt", sub: "From My Tickets and My Bookings" },
      { title: "Request a refund on an event ticket", sub: "The 24-hour window and what happens after it" },
      { title: "A payment failed but money left my account", sub: "Auto-reversal timelines and how to escalate" },
      { title: "Apply a coupon or perk code", sub: "Where codes go and why one may be rejected" },
      { title: "Team registration billing", sub: "Who pays, how the fee is split, and per-member passes" },
      { title: "Security deposits on rentals", sub: "How much is held, and when it returns" },
    ],
  },
  {
    key: "mentors",
    title: "Mentors & sessions",
    desc: "Booking, rescheduling, session etiquette and mentor payouts.",
    count: "9 articles",
    panelLabel: "7 ARTICLES",
    color: "var(--ok)",
    iconBg: "var(--ok-tint)",
    icon: <><circle cx="9" cy="9" r="3"></circle><path d="M3 19q6-6 12 0M16.5 7a3 3 0 010 6"></path></>,
    articles: [
      { title: "Book your first mentor session", sub: "Choosing a mentor and preparing for the call" },
      { title: "Reschedule or cancel a session", sub: "The 12-hour rule and no-show credits" },
      { title: "What to bring to a session", sub: "The three questions that make a call useful" },
      { title: "Session etiquette and what to expect", sub: "Format, length and follow-up" },
      { title: "Ask a mentor for a referral", sub: "When to ask, and how to make it easy to say yes" },
      { title: "Rate a mentor and give feedback", sub: "How ratings work and who sees them" },
      { title: "Become a mentor", sub: "Eligibility, verification and payout setup" },
    ],
  },
  {
    key: "events",
    title: "Events & ECHO",
    desc: "Registration, team formation, on-campus check-in and certificates.",
    count: "12 articles",
    panelLabel: "8 ARTICLES",
    color: "var(--amber)",
    iconBg: "var(--warn-tint)",
    icon: <><rect x="3.5" y="5" width="17" height="15" rx="2.5"></rect><path d="M3.5 10h17M8 5V2.5M16 5V2.5"></path></>,
    articles: [
      { title: "Register for an ECHO event", sub: "Individual and team registration, step by step" },
      { title: "Form a team at the venue", sub: "The 2–5 member rule and how to find teammates" },
      { title: "Check in on campus", sub: "Your entry pass, QR code and what ID to carry" },
      { title: "Change your track or theme on event day", sub: "Why the field is optional at registration" },
      { title: "Get your participation certificate", sub: "When it is issued and where to download it" },
      { title: "Receive passes and invoices on WhatsApp", sub: "Opting in and out of delivery" },
      { title: "Event cancelled or postponed", sub: "Automatic refunds and rescheduling" },
      { title: "Host an ECHO event at your college", sub: "What the CDC needs to provide" },
    ],
  },
  {
    key: "rentals",
    title: "Rentals & wallet",
    desc: "Bookings, deposits, cancellations and SA Wallet balances.",
    count: "8 articles",
    panelLabel: "6 ARTICLES",
    color: "var(--violet-lt)",
    iconBg: "var(--tint-strong)",
    icon: <><path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5"></path></>,
    articles: [
      { title: "Book a PG, hostel or flexi desk", sub: "Search, filter and confirm a listing" },
      { title: "Understand the price breakdown", sub: "Rate, SA savings, service fee and deposit" },
      { title: "Cancel a rental booking", sub: "Per-listing cancellation terms" },
      { title: "Report an issue with a host or property", sub: "Our verification promise and dispute process" },
      { title: "Top up and use SA Wallet", sub: "Balances, refunds and expiry" },
      { title: "Self-drive vehicle requirements", sub: "Licence, age and insurance conditions" },
    ],
  },
  {
    key: "privacy",
    title: "Privacy & your data",
    desc: "Export, correct or erase your data, and manage consent.",
    count: "7 articles",
    panelLabel: "7 ARTICLES",
    color: "var(--tag-danger)",
    iconBg: "rgba(240,97,107,.12)",
    icon: <><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9.5a2.5 2.5 0 113 2.4v1.3M12 16.5v.01"></path></>,
    articles: [
      { title: "Export all of your data", sub: "The 72-hour archive and what it contains" },
      { title: "Correct inaccurate information", sub: "Your right under DPDP s.12 and GDPR Art. 16" },
      { title: "Delete your account and data", sub: "The 30-day process and what we must retain" },
      { title: "Control who sees your profile and resume", sub: "Mentor, recruiter and college visibility" },
      { title: "Withdraw a consent you gave", sub: "Per-purpose withdrawal, as easy as giving it" },
      { title: "Manage cookie preferences", sub: "Necessary, preferences, analytics and marketing" },
      { title: "Raise a grievance with our Grievance Officer", sub: "Escalating to the Data Protection Board of India" },
    ],
  },
];

const FAQS: Array<{ q: string; a: string }> = [
  { q: "My college email isn't being accepted", a: "We verify against the domain your institution registered with us. If your domain is new or was recently changed, ask your placement office to confirm it, or verify with your student ID card instead — both routes issue the same SA ID." },
  { q: "Can I get a refund on an event ticket?", a: "Yes — in full up to 24 hours before the event starts, from My Tickets. Refunds return to the original payment method via Razorpay and settle in 5–7 working days. After that window the organiser decides, and we pass your request on." },
  { q: "Who can see my profile and resume?", a: "Only people you share it with. Mentors see what you send them for a session; recruiters see a profile only after you apply or explicitly accept an approach. Your college's placement office sees aggregate cohort data, not individual documents, unless you opt in." },
  { q: "How do I export or delete my data?", a: "Profile → Security → Your data. Export delivers a machine-readable archive by email within 72 hours. Deletion removes your profile, documents and activity within 30 days; we keep only what tax and payment law requires us to retain, and tell you exactly what that is." },
  { q: "Is StudentAlumni free for students?", a: "The account, roadmap, network and job matching are free for verified students. Paid items are optional and always priced up front: some mentor sessions, some workshops, event tickets and rentals." },
];

function HelpCenterPage() {
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
      {CATEGORIES.map((c) => (
        <div key={c.key} className="rs-card rs-cat" data-cat={c.key} onClick={() => toggleCategory(c.key)} style={{"border":"1px solid var(--line)","borderRadius":"18px","background":"var(--panel)","boxShadow":"var(--shadow)","padding":"22px 24px 24px","cursor":"pointer","transition":"transform .25s cubic-bezier(.2,.8,.2,1)"}}>
          <span style={{"width":"40px","height":"40px","borderRadius":"12px","background":c.iconBg,"display":"flex","alignItems":"center","justifyContent":"center","marginBottom":"16px"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{"fill":"none","stroke":c.color,"strokeWidth":"1.8"}}>{c.icon}</svg>
          </span>
          <div style={{"fontSize":"17px","fontWeight":"700"}}>{c.title}</div>
          <div style={{"fontSize":"13.5px","lineHeight":"1.6","color":"var(--muted)","margin":"7px 0 14px"}}>{c.desc}</div>
          <div style={{"fontSize":"12.5px","fontWeight":"600","color":c.color}}>{c.count}</div>
        </div>
      ))}
    </div>

    <div className="rs-r">
      {CATEGORIES.map((c) => (
        <div key={c.key} id={`catpanel-${c.key}`} className="rs-catpanel" data-cat={c.key} style={{ display: activeCat === c.key ? 'block' : 'none', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '22px 26px 10px', marginTop: '18px' }}>
          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px","marginBottom":"6px","flexWrap":"wrap"}}>
            <div>
              <div style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"1.3px","color":c.color,"marginBottom":"6px"}}>{c.panelLabel}</div>
              <div style={{"fontSize":"20px","fontWeight":"700","letterSpacing":"-.5px"}}>{c.title}</div>
            </div>
            <span className="rs-catclose" onClick={() => setActiveCat(null)} style={{"display":"inline-flex","alignItems":"center","gap":"8px","fontSize":"13px","fontWeight":"600","color":"var(--muted)","border":"1px solid var(--line2)","borderRadius":"100px","padding":"8px 14px","cursor":"pointer","transition":"background .2s ease, filter .2s ease, transform .2s ease"}}>
              <svg width="13" height="13" viewBox="0 0 16 16" style={{"fill":"none","stroke":"currentColor","strokeWidth":"1.9"}}><path d="M4 4l8 8M12 4l-8 8"></path></svg>Close
            </span>
          </div>
          {c.articles.map((a) => (
            <div key={a.title} className="rs-art" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) max-content","gap":"16px","alignItems":"center","borderTop":"1px solid var(--line)","padding":"15px 4px","cursor":"pointer","transition":"background .2s ease"}}>
              <div style={{"minWidth":"0"}}>
                <div style={{"fontSize":"15px","fontWeight":"600","marginBottom":"4px"}}>{a.title}</div>
                <div style={{"fontSize":"13px","color":"var(--muted)"}}>{a.sub}</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--dim)","strokeWidth":"2","flex":"none"}}><path d="M9 6l6 6-6 6"></path></svg>
            </div>
          ))}
        </div>
      ))}
    </div>

    <div className="rs-r rs-help2" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) 380px","gap":"20px","marginTop":"22px","alignItems":"start"}}>
      <div style={{"border":"1px solid var(--line)","borderRadius":"18px","background":"var(--panel)","padding":"24px 26px 8px"}}>
        <div style={{"fontSize":"19px","fontWeight":"700","letterSpacing":"-.4px","marginBottom":"6px"}}>Common questions</div>
        {FAQS.map((f, i) => (
          <div key={f.q} className="rs-acc" onClick={() => toggleAcc(i)} style={{ borderTop: '1px solid var(--line)', padding: '18px 0', cursor: 'pointer' }}>
            <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px"}}>
              <span style={{"fontSize":"15px","fontWeight":"600"}}>{f.q}</span>
              <span className="rs-acc-ico" style={{ flex: 'none', transition: 'transform .3s ease', transform: openAcc[i] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" style={{"fill":"none","stroke":"var(--muted)","strokeWidth":"2"}}><path d="M6 9l6 6 6-6"></path></svg>
              </span>
            </div>
            <div className="rs-acc-body" style={{ display: openAcc[i] ? 'block' : 'none', fontSize: '14px', lineHeight: '1.65', color: 'var(--muted)', paddingTop: '12px' }}>{f.a}</div>
          </div>
        ))}
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

/**
 * Native guard — this route renders web-only UI. On iOS/Android show a
 * placeholder that opens the page on studentalumni.ai instead of crashing.
 */
export default function HelpCenterPageRoute() {
  if (Platform.OS !== 'web') return <WebOnlyRoute path="/help-center" />;
  return <HelpCenterPage />;
}
