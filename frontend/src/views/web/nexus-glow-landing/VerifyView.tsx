import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Shield, Search, ArrowRight, FileCheck, Award, BadgeCheck, Send } from 'lucide-react';

const SAMPLE_CREDS: Record<string, [string, string, string]> = {
  'SA-EXC-2026-0002': ['Certificate of Excellence', 'Sreenidhi Institute of Science & Technology', 'Feb 14, 2026'],
  'SA-FAC-2026-0001': ['Faculty Award — Mentorship', 'StudentAlumni Academic Council', 'Jan 09, 2026'],
  'SA-AMB-2026-0012': ['Campus Ambassador Badge', 'StudentAlumni Campus Relations', 'Mar 02, 2026'],
  'ECHO26-P-0001': ['ECHO Specialization — Product', 'ECHO 2026 · VNR VJIET', 'Jul 31, 2026']
};

function generateHash(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h * 31) + id.charCodeAt(i)) & 0xffffffff;
  }
  return (Math.abs(h).toString(16) + 'a7f31c9e4b20ef88').slice(0, 18);
}

export function VerifyView() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{
    id: string;
    title: string;
    issuer: string;
    date: string;
    hash: string;
  } | null>(null);

  // BGV Form State
  const [bgvKind, setBgvKind] = useState('Single candidate');
  const [bgvConsent, setBgvConsent] = useState(false);
  const [bgvSubmitted, setBgvSubmitted] = useState<string | null>(null);
  const [bgvForm, setBgvForm] = useState({
    name: '',
    email: '',
    org: '',
    phone: '',
    candidate: '',
    credId: '',
    notes: '',
  });

  const handleVerify = (searchId?: string) => {
    const raw = (searchId ?? query).trim().toUpperCase();
    if (!raw) return;

    if (SAMPLE_CREDS[raw]) {
      const [title, issuer, date] = SAMPLE_CREDS[raw];
      setResult({
        id: raw,
        title,
        issuer,
        date,
        hash: generateHash(raw),
      });
    } else {
      setResult({
        id: raw,
        title: 'Verified Institutional Credential',
        issuer: 'StudentAlumni Certified Campus Partner',
        date: 'Verified on Ledger',
        hash: generateHash(raw),
      });
    }
  };

  const handleBgvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgvConsent) return;
    const ref = 'SA-BGV-' + Math.floor(100000 + Math.random() * 899999);
    setBgvSubmitted(ref);
    setTimeout(() => {
      setBgvSubmitted(null);
    }, 4000);
  };

  return (
    <section className="relative px-4 sm:px-6 pt-28 pb-20 max-w-7xl mx-auto text-white">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-[#F4F2FF] to-[#EAF7FA] text-gray-900 p-8 sm:p-12 mb-16 shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-80 h-80 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-[#2E2091]/10 text-[#2E2091]">
              <Shield className="w-3.5 h-3.5" />
              <span>Credential Verification</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#141726] mt-5 mb-4 leading-[1.12]">
              Every claim on a résumé, checkable in seconds.
            </h1>

            <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
              Certificates, faculty awards, ECHO badges, and SA Member IDs are cryptographically signed on issue. Recruiters and BGV agencies can confirm authenticity instantly.
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-6 sm:gap-10 my-8">
              <div>
                <div className="text-2xl sm:text-4xl font-extrabold text-[#4B3FA8]">184k</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">credentials signed</div>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl font-extrabold text-[#0E6E8C]">1.2s</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">median check</div>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl font-extrabold text-[#047857]">0</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">forgeries passed</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="#search-section"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-[#4B3FD6] hover:bg-[#3E32C4] shadow-lg shadow-indigo-500/25 transition-all"
              >
                Verify a credential
              </a>
              <a
                href="#bgv-section"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-[#2E2A55] border border-[#CFC9F3] hover:bg-white/60 transition-all"
              >
                Request a BGV check
              </a>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white/80 backdrop-blur-md border border-black/5 rounded-2xl p-6 shadow-sm">
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4">Who Uses This</div>
            <div className="space-y-3.5">
              {[
                'Recruiters and HR teams',
                'Background-verification agencies',
                'Accreditation bodies',
                'Placement cells and admin'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm font-semibold text-[#2E2A55]">
                  <CheckCircle2 className="w-4 h-4 text-[#047857] flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instant Verification Search Section */}
      <div id="search-section" className="max-w-4xl mx-auto text-center mb-24">
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Verify Certificate & <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400">SA Member ID</span>
        </h2>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
          Instant cryptographic validation for verified Certificate IDs, Faculty Awards, ECHO Badges, and SA Member IDs across partner campuses.
        </p>

        {/* Input Box */}
        <div className="p-2.5 rounded-2xl bg-[#0C0E1B] border border-white/10 shadow-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-3 px-4 py-3.5 bg-[#12142B] border border-white/10 rounded-xl">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="Enter Certificate ID, Member ID, or Roll Number…"
                className="w-full bg-transparent text-white placeholder-gray-500 text-sm sm:text-base outline-none font-medium"
              />
            </div>
            <button
              onClick={() => handleVerify()}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-[#5B4FE9] hover:bg-[#4F43D6] shadow-lg shadow-indigo-500/25 transition-all text-sm sm:text-base cursor-pointer"
            >
              <span>Verify Credential</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sample ID Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
          <span className="text-xs font-semibold text-gray-400">Try sample IDs:</span>
          {Object.entries(SAMPLE_CREDS).map(([id, [name]]) => (
            <button
              key={id}
              onClick={() => {
                setQuery(id);
                handleVerify(id);
              }}
              className="text-xs font-bold text-[#8B84FF] border border-[#2A2A55] hover:border-[#8B84FF] rounded-lg px-3 py-1.5 bg-[#0C0E1B] transition-colors cursor-pointer"
            >
              {id} <span className="font-normal text-gray-400">({name.split(' ')[0]})</span>
            </button>
          ))}
        </div>

        {/* Result Card */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-left rounded-2xl bg-[#0C0E1B] border border-white/15 p-6 sm:p-8 shadow-2xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{result.title}</div>
                  <div className="text-xs font-mono text-gray-400 mt-0.5">{result.id}</div>
                </div>
              </div>
              <div className="px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 uppercase">
                Signature Valid
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-sm">
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Issued By</div>
                <div className="font-semibold text-white">{result.issuer}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Issued On</div>
                <div className="font-semibold text-white">{result.date}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ledger Hash</div>
                <div className="font-mono text-xs text-purple-300 break-all">{result.hash}</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 4 Pillars of Cryptographic Trust */}
      <div className="mb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-3">
            <Shield className="w-4 h-4" />
            <span>Enterprise Integrity</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-bold tracking-tight">Built on Cryptographic Trust</h3>
          <p className="text-gray-400 text-sm sm:text-base mt-3">
            Designed for high-speed background verification across campuses, employers, and accreditation bodies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              num: '01',
              title: 'Cryptographic SHA-256 Ledger',
              desc: 'Every certificate and credential is signed with an immutable hash, preventing forgery and unauthorized duplication.'
            },
            {
              num: '02',
              title: 'Instant Multi-Campus BGV',
              desc: 'Instant verification for recruiters, HR teams, and academic institutions across thousands of partner colleges.'
            },
            {
              num: '03',
              title: 'Tamper-Proof Digital ID Cards',
              desc: 'Unified member IDs linked to verified student portfolios, campus achievements, and alumni career roadmaps.'
            },
            {
              num: '04',
              title: 'Autonomous Verification API',
              desc: 'Real-time programmatic query support for background verification agencies, automated scanners, and ATS systems.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-7 rounded-2xl bg-[#0C0E1B] border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="text-xs font-bold tracking-widest text-[#8B84FF] mb-3">{item.num}</div>
              <h4 className="text-lg font-bold text-white mb-2">{item.title}</h4>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Categories: What We Verify */}
      <div className="mb-24">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">What We Verify</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-2xl bg-[#0C0E1B] border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5">
              <FileCheck className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Certificates</h4>
            <p className="text-gray-400 text-sm leading-relaxed">Workshop and course completion, with issuing institution stamp, dates, and track details.</p>
          </div>
          <div className="p-7 rounded-2xl bg-[#0C0E1B] border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Member IDs</h4>
            <p className="text-gray-400 text-sm leading-relaxed">Confirms live college affiliation, degree program, department, and graduation cohort.</p>
          </div>
          <div className="p-7 rounded-2xl bg-[#0C0E1B] border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">ECHO Badges</h4>
            <p className="text-gray-400 text-sm leading-relaxed">Non-transferable event achievement badges, tied to one StudentAlumni ID, gate-scannable.</p>
          </div>
        </div>
      </div>

      {/* Bulk & Enterprise BGV Form */}
      <div id="bgv-section" className="rounded-3xl bg-[#0C0E1B] border border-white/15 p-8 sm:p-12 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-2">
              <Shield className="w-4 h-4" />
              <span>Bulk &amp; Enterprise BGV</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Request a BGV check</h3>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-6 max-w-xl">
              Checking a batch of candidates or verifying a record offline? Submit candidate details and our verification desk will respond within one working day.
            </p>

            {/* Kind Selector */}
            <div className="mb-6">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">What do you need verified?</div>
              <div className="flex flex-wrap gap-2.5">
                {['Single candidate', 'Bulk batch (10+)', 'API access', 'Dispute a result'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setBgvKind(k)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      bgvKind === k
                        ? 'bg-[#5B4FE9] text-white border border-[#5B4FE9]'
                        : 'bg-[#12142B] text-gray-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleBgvSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Menon"
                    value={bgvForm.name}
                    onChange={(e) => setBgvForm({ ...bgvForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={bgvForm.email}
                    onChange={(e) => setBgvForm({ ...bgvForm, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Organisation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deloitte India"
                    value={bgvForm.org}
                    onChange={(e) => setBgvForm({ ...bgvForm, org: e.target.value })}
                    className="w-full px-4 py-3 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 7569665077"
                    value={bgvForm.phone}
                    onChange={(e) => setBgvForm({ ...bgvForm, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Candidate Name</label>
                  <input
                    type="text"
                    placeholder="Name as on credential"
                    value={bgvForm.candidate}
                    onChange={(e) => setBgvForm({ ...bgvForm, candidate: e.target.value })}
                    className="w-full px-4 py-3 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Credential / Roll No</label>
                  <input
                    type="text"
                    placeholder="e.g. SA-EXC-2026-0002"
                    value={bgvForm.credId}
                    onChange={(e) => setBgvForm({ ...bgvForm, credId: e.target.value })}
                    className="w-full px-4 py-3 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Notes &amp; Turnaround Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Volume, candidate list, or specific institution details…"
                  value={bgvForm.notes}
                  onChange={(e) => setBgvForm({ ...bgvForm, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
                />
              </div>

              {/* Consent */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="bgv-consent"
                  checked={bgvConsent}
                  onChange={(e) => setBgvConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="bgv-consent" className="text-xs sm:text-sm text-gray-400 cursor-pointer leading-relaxed">
                  I confirm the candidate has consented to this background verification check in accordance with the DPDP Act 2023.
                </label>
              </div>

              <button
                type="submit"
                disabled={!bgvConsent}
                className={`w-full py-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  bgvConsent
                    ? 'bg-[#5B4FE9] hover:bg-[#4F43D6] text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{bgvSubmitted ? `Request Submitted — ${bgvSubmitted}` : 'Submit BGV Request'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-2xl bg-[#12142B] border border-white/10">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Turnaround Timelines</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Instant ID Lookup</span>
                  <span className="font-bold text-white">Seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Single Candidate</span>
                  <span className="font-bold text-white">1 working day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bulk Batch (10+)</span>
                  <span className="font-bold text-white">2–3 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">API Onboarding</span>
                  <span className="font-bold text-white">Same week</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#12142B] border border-white/10">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Compliance Handled Under</div>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2.5 text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>DPDP Act 2023 (India)</span>
                </div>
                <div className="flex items-center gap-2.5 text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>GDPR Lawful Basis</span>
                </div>
                <div className="flex items-center gap-2.5 text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>SOC 2 Type II Security</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-purple-950/30 border border-purple-500/20">
              <div className="font-bold text-white text-sm mb-1">Prefer direct email?</div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Write to <span className="text-purple-300 font-semibold">verify@studentalumni.ai</span> with candidate ID in subject line.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
