import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, useWindowDimensions, Linking } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { HelpCircle, Search, ChevronDown, ChevronRight, X } from 'lucide-react-native';

// Mock Articles Database
const ARTICLES: Record<string, Array<{ title: string; desc: string }>> = {
  account: [
    { title: 'Verify your college email', desc: 'Which domains we accept, and what to do when yours is new' },
    { title: 'Verify with a student ID instead', desc: 'The fallback route when email verification fails' },
    { title: 'Connect DigiLocker in one click', desc: 'Pull degrees, marksheets and ABC credentials automatically' },
    { title: 'Aadhaar (UIDAI) verification explained', desc: 'What we store, what we mask, and why we ask' },
    { title: 'Understanding your SA ID', desc: 'How the ID is formed and where it is accepted' },
    { title: 'Raise your profile completion score', desc: 'The nine items that move the number' },
    { title: 'Change your college or graduation year', desc: 'Re-verification steps after a transfer' },
    { title: 'Recover an account you cannot sign into', desc: 'Email, phone and identity-based recovery' },
  ],
  payments: [
    { title: 'How Razorpay charges appear on your statement', desc: 'Descriptor names and settlement timing' },
    { title: 'Download an invoice or GST receipt', desc: 'From My Tickets and My Bookings' },
    { title: 'Request a refund on an event ticket', desc: 'The 24-hour window and what happens after it' },
    { title: 'A payment failed but money left my account', desc: 'Auto-reversal timelines and how to escalate' },
    { title: 'Apply a coupon or perk code', desc: 'Where codes go and why one may be rejected' },
    { title: 'Team registration billing', desc: 'Who pays, how the fee is split, and per-member passes' },
    { title: 'Security deposits on rentals', desc: 'How much is held, and when it returns' },
  ],
  mentors: [
    { title: 'Book your first mentor session', desc: 'Choosing a mentor and preparing for the call' },
    { title: 'Reschedule or cancel a session', desc: 'The 12-hour rule and no-show credits' },
    { title: 'What to bring to a session', desc: 'The three questions that make a call useful' },
    { title: 'Session etiquette and what to expect', desc: 'Format, length and follow-up' },
    { title: 'Ask a mentor for a referral', desc: 'When to ask, and how to make it easy to say yes' },
    { title: 'Rate a mentor and give feedback', desc: 'How ratings work and who sees them' },
    { title: 'Become a mentor', desc: 'Eligibility, verification and payout setup' },
  ],
  events: [
    { title: 'Register for an ECHO event', desc: 'Individual and team registration, step by step' },
    { title: 'Form a team at the venue', desc: 'The 2–5 member rule and how to find teammates' },
    { title: 'Check in on campus', desc: 'Your entry pass, QR code and what ID to carry' },
    { title: 'Change your track or theme on event day', desc: 'Why the field is optional at registration' },
    { title: 'Get your participation certificate', desc: 'When it is issued and where to download it' },
    { title: 'Receive passes and invoices on WhatsApp', desc: 'Opting in and out of delivery' },
    { title: 'Event cancelled or postponed', desc: 'Automatic refunds and rescheduling' },
    { title: 'Host an ECHO event at your college', desc: 'What the CDC needs to provide' },
  ],
  rentals: [
    { title: 'Book a PG, hostel or flexi desk', desc: 'Search, filter and confirm a listing' },
    { title: 'Understand the price breakdown', desc: 'Rate, SA savings, service fee and deposit' },
    { title: 'Cancel a rental booking', desc: 'Per-listing cancellation terms' },
    { title: 'Report an issue with a host or property', desc: 'Our verification promise and dispute process' },
    { title: 'Top up and use SA Wallet', desc: 'Balances, refunds and expiry' },
    { title: 'Self-drive vehicle requirements', desc: 'Licence, age and insurance conditions' },
  ],
  privacy: [
    { title: 'Export all of your data', desc: 'The 72-hour archive and what it contains' },
    { title: 'Correct inaccurate information', desc: 'Your right under DPDP s.12 and GDPR Art. 16' },
    { title: 'Delete your account and data', desc: 'The 30-day process and what we must retain' },
    { title: 'Control who sees your profile and resume', desc: 'Mentor, recruiter and college visibility' },
    { title: 'Withdraw a consent you gave', desc: 'Per-purpose withdrawal, as easy as giving it' },
    { title: 'Manage cookie preferences', desc: 'Necessary, preferences, analytics and marketing' },
    { title: 'Raise a grievance with our Grievance Officer', desc: 'Escalating to the Data Protection Board of India' },
  ]
};

const CATEGORIES = [
  { id: 'account', title: 'Account & verification', desc: 'College email, DigiLocker, Aadhaar, SA ID and profile completion.', count: 8, bg: 'rgba(124,92,252,.12)', stroke: '#A78BFA' },
  { id: 'payments', title: 'Payments & tickets', desc: 'Razorpay charges, invoices, refunds, coupons and entry passes.', count: 7, bg: 'rgba(47,184,198,.12)', stroke: '#6FD6FF' },
  { id: 'mentors', title: 'Mentors & sessions', desc: 'Booking, rescheduling, session etiquette and mentor payouts.', count: 7, bg: 'rgba(52,211,153,.12)', stroke: '#34D399' },
  { id: 'events', title: 'Events & ECHO', desc: 'Registration, team formation, on-campus check-in and certificates.', count: 8, bg: 'rgba(245,179,66,.12)', stroke: '#F5B342' },
  { id: 'rentals', title: 'Rentals & wallet', desc: 'Bookings, deposits, cancellations and SA Wallet balances.', count: 6, bg: 'rgba(124,92,252,.12)', stroke: '#A78BFA' },
  { id: 'privacy', title: 'Privacy & your data', desc: 'Export, correct or erase your data, and manage consent.', count: 7, bg: 'rgba(245,140,140,.12)', stroke: '#F58C8C' },
];

const FAQS = [
  {
    q: "My college email isn't being accepted",
    a: "We verify against the domain your institution registered with us. If your domain is new or was recently changed, ask your placement office to confirm it, or verify with your student ID card instead — both routes issue the same SA ID."
  },
  {
    q: "Can I get a refund on an event ticket?",
    a: "Yes — in full up to 24 hours before the event starts, from My Tickets. Refunds return to the original payment method via Razorpay and settle in 5–7 working days. After that window the organiser decides, and we pass your request on."
  },
  {
    q: "Who can see my profile and resume?",
    a: "Only people you share it with. Mentors see what you send them for a session; recruiters see a profile only after you apply or explicitly accept an approach. Your college's placement office sees aggregate cohort data, not individual documents, unless you opt in."
  },
  {
    q: "How do I export or delete my data?",
    a: "Profile → Security → Your data. Export delivers a machine-readable archive by email within 72 hours. Deletion removes your profile, documents and activity within 30 days; we keep only what tax and payment law requires us to retain, and tell you exactly what that is."
  },
  {
    q: "Is StudentAlumni free for students?",
    a: "The account, roadmap, network and job matching are free for verified students. Paid items are optional and always priced up front: some mentor sessions, some workshops, event tickets and rentals."
  }
];

export default function HelpCenterPage() {
  const { width } = useWindowDimensions();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const isMobile = width < 860;

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  return (
    <View style={styles.outerWrap}>
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body, #root { background: #0A0A14 !important; font-family: 'Outfit', sans-serif !important; }
          .help-glow-left {
            position: absolute; left: -14%; top: -22%; width: 780px; height: 620px;
            background: radial-gradient(circle, rgba(124,92,252,.18), transparent 68%);
            filter: blur(70px);
          }
          .help-glow-right {
            position: absolute; right: -18%; top: 34%; width: 680px; height: 560px;
            background: radial-gradient(circle, rgba(91,79,233,.13), transparent 70%);
            filter: blur(80px);
          }
        `
      }} />

      {/* Cosmic background glows */}
      <View style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <View className="help-glow-left" />
        <View className="help-glow-right" />
      </View>

      <Navbar activeTab="contact" />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <section className="pt-32 pb-16 px-6 max-w-[1400px] mx-auto w-full relative z-10">
          
          {/* Header Search Panel */}
          <div className="border border-[#1F1F30] rounded-3xl bg-[#11111C] p-8 text-center max-w-[1360px] mx-auto mb-10 shadow-xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">How can we help?</h1>
            <p className="text-sm sm:text-base text-[#8A8A9E] mt-2.5 mb-6">
              Search the guides, or reach the team directly — we answer within one working day.
            </p>
            <div className="flex items-center gap-3 max-w-[620px] mx-auto border border-[#292940] rounded-2xl bg-[#161622] px-4 py-3.5 cursor-text">
              <Search size={17} color="#8A8A9E" />
              <span className="text-sm text-[#5C6273]">Search articles — verification, payments, tickets…</span>
            </div>
            <div className="flex gap-2 justify-center flex-wrap mt-4">
              <span className="text-xs text-[#8A8A9E]">Popular:</span>
              <span onClick={() => { setActiveCategory('account'); handleSectionJump('rs-cat-panel'); }} className="text-xs font-semibold text-[#A78BFA] cursor-pointer hover:underline">College email not verifying</span>
              <span className="text-xs text-[#5C6273]">·</span>
              <span onClick={() => { setActiveCategory('payments'); handleSectionJump('rs-cat-panel'); }} className="text-xs font-semibold text-[#A78BFA] cursor-pointer hover:underline">Refund an event ticket</span>
              <span className="text-xs text-[#5C6273]">·</span>
              <span onClick={() => { setActiveCategory('privacy'); handleSectionJump('rs-cat-panel'); }} className="text-xs font-semibold text-[#A78BFA] cursor-pointer hover:underline">Download my data</span>
            </div>
          </div>

          {/* Categories Grid */}
          <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} mb-10`}>
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id === activeCategory ? null : cat.id); }}
                className="group border border-[#1F1F30] hover:border-[#7C5CFC] rounded-2xl bg-[#11111C] shadow-lg p-6 cursor-pointer transition-all duration-300"
                style={{ borderColor: activeCategory === cat.id ? '#7C5CFC' : '#1F1F30' }}
              >
                <span 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: cat.bg }}
                >
                  <HelpCircle size={18} color={cat.stroke} />
                </span>
                <h3 className="text-base font-bold text-white group-hover:text-[#A78BFA] transition-colors">{cat.title}</h3>
                <p className="text-sm leading-relaxed text-[#8A8A9E] mt-2 mb-3.5">{cat.desc}</p>
                <span className="text-xs font-semibold" style={{ color: cat.stroke }}>{cat.count} articles</span>
              </div>
            ))}
          </div>

          {/* Category Panel (Visible when a category is clicked) */}
          {activeCategory && (
            <div id="rs-cat-panel" className="border border-[#1F1F30] rounded-2xl bg-[#11111C] p-6 mb-10 transition-all duration-300">
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-[#A78BFA] uppercase mb-1.5">
                    {ARTICLES[activeCategory].length} ARTICLES
                  </div>
                  <div className="text-xl font-bold text-white capitalize">{activeCategory.replace('-', ' ')}</div>
                </div>
                <button
                  onClick={() => setActiveCategory(null)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#8A8A9E] border border-[#292940] hover:border-[#7C5CFC] rounded-full px-3.5 py-2 cursor-pointer transition-all bg-transparent"
                >
                  <X size={13} color="currentColor" />
                  Close
                </button>
              </div>
              <div className="divide-y divide-[#1F1F30]">
                {ARTICLES[activeCategory].map((art, idx) => (
                  <div 
                    key={idx} 
                    className="grid grid-cols-[1fr_max-content] gap-4 items-center py-4 cursor-pointer hover:bg-[#7C5CFC]/5 px-2 rounded-lg transition-all"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white mb-1">{art.title}</div>
                      <div className="text-xs text-[#8A8A9E]">{art.desc}</div>
                    </div>
                    <ChevronRight size={15} color="#5C6273" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Questions & Sidebar Layout */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-12'}`} style={{ alignItems: 'start' }}>
            
            {/* Common Questions Accordion */}
            <div className={`md:col-span-8 border border-[#1F1F30] rounded-2xl bg-[#11111C] p-6`}>
              <h2 className="text-lg font-bold text-white mb-6">Common questions</h2>
              <div className="divide-y divide-[#1F1F30]">
                {FAQS.map((faq, index) => (
                  <div key={index} className="py-4.5 cursor-pointer" onClick={() => toggleFaq(index)}>
                    <div className="flex align-center justify-between gap-4">
                      <span className="text-sm font-semibold text-white">{faq.q}</span>
                      <span 
                        style={{ transform: expandedFaq === index ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        className="transition-transform duration-300"
                      >
                        <ChevronDown size={16} color="#8A8A9E" />
                      </span>
                    </div>
                    {expandedFaq === index && (
                      <div className="text-xs sm:text-sm line-relaxed text-[#8A8A9E] pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar stuck box */}
            <div className="md:col-span-4 space-y-4">
              <div className="border border-[#2C2A52] rounded-2xl bg-gradient-to-br from-[#7C5CFC]/10 to-[#11111C]/30 p-6">
                <h3 className="text-base font-bold text-white mb-2">Still stuck?</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-[#8A8A9E] mb-5">
                  Real people, one working day. Include your SA ID and we'll be faster.
                </p>
                <div className="grid gap-2.5">
                  <button
                    onClick={() => handleLinkPress('mailto:support@studentalumni.ai')}
                    className="bg-[#5B4FE9] hover:bg-[#4F43D6] text-white text-xs font-semibold py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Contact support
                  </button>
                  <button
                    onClick={() => handleLinkPress('https://wa.me/')}
                    className="border border-[#292940] hover:border-[#7C5CFC] text-white text-xs font-semibold py-3 rounded-xl bg-transparent transition-all cursor-pointer text-center"
                  >
                    WhatsApp us
                  </button>
                </div>
              </div>

              {/* Response Times Box */}
              <div className="border border-[#1F1F30] rounded-2xl bg-[#11111C] p-6">
                <div className="text-[10px] font-bold tracking-widest text-[#8A8A9E] mb-4">RESPONSE TIMES</div>
                <div className="space-y-3">
                  <div className="flex align-center justify-between border-b border-[#1F1F30] pb-2">
                    <span className="text-xs text-[#8A8A9E]">Support email</span>
                    <span className="text-xs font-semibold text-white">&lt; 24 h</span>
                  </div>
                  <div className="flex align-center justify-between border-b border-[#1F1F30] pb-2">
                    <span className="text-xs text-[#8A8A9E]">Payment issues</span>
                    <span className="text-xs font-semibold text-white">&lt; 12 h</span>
                  </div>
                  <div className="flex align-center justify-between border-b border-[#1F1F30] pb-2">
                    <span className="text-xs text-[#8A8A9E]">Privacy requests</span>
                    <span className="text-xs font-semibold text-white">&lt; 30 days</span>
                  </div>
                  <div className="flex align-center justify-between">
                    <span className="text-xs text-[#8A8A9E]">Security reports</span>
                    <span className="text-xs font-semibold text-[#34D399]">&lt; 4 h</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </section>

        <Footer />
      </ScrollView>
    </View>
  );
}

// Inline helper for smooth section scrolling
const handleSectionJump = (id: string) => {
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
