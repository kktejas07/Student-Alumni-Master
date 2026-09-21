import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Send, Copy, Check, Shield, Globe, MessageSquare } from 'lucide-react';

export function ContactView() {
  const [purpose, setPurpose] = useState('General Inquiry');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    org: '',
    message: '',
  });

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ name: '', email: '', phone: '', org: '', message: '' });
    }, 3500);
  };

  return (
    <section className="relative px-4 sm:px-6 pt-28 pb-20 max-w-7xl mx-auto text-white">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-[#12142B] border border-white/10 text-[#8B84FF] mb-6">
          <MapPin className="w-3.5 h-3.5" />
          <span>Contact &amp; Campus Relations</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
          Get in Touch with{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400">
            StudentAlumni Global
          </span>
        </h1>

        <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
          Connect directly with our leadership, campus partnership coordinators, and human resources team. We are dedicated to supporting students, alumni, and educational institutions worldwide.
        </p>
      </div>

      {/* 2 Hub Cards: India Hub & USA Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* India Hub */}
        <div className="p-8 rounded-3xl bg-[#0C0E1B] border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4 pb-6 border-b border-white/10 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-indigo-400 uppercase">APAC Headquarters</div>
              <div className="text-xl font-bold text-white mt-0.5">India Hub</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#12142B] border border-white/10 flex items-center justify-center text-[#8B84FF] flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Office Address</div>
                <div className="text-sm font-semibold text-white">Madhapur, Hyderabad, Telangana, India</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#12142B] border border-white/10 flex items-center justify-center text-[#8B84FF] flex-shrink-0 mt-0.5">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Phone Number</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">+91 7569665077</span>
                  <button
                    onClick={() => handleCopy('+917569665077', 'in-phone')}
                    className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                  >
                    {copiedKey === 'in-phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#12142B] border border-white/10 flex items-center justify-center text-[#8B84FF] flex-shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Official Email</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">hr@studentalumni.ai</span>
                  <button
                    onClick={() => handleCopy('hr@studentalumni.ai', 'in-email')}
                    className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                  >
                    {copiedKey === 'in-email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#12142B] border border-white/10 flex items-center justify-center text-[#8B84FF] flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Working Hours</div>
                <div className="text-sm font-semibold text-white">Mon – Sat: 9:00 AM – 7:00 PM IST</div>
              </div>
            </div>
          </div>
        </div>

        {/* USA Hub */}
        <div className="p-8 rounded-3xl bg-[#0C0E1B] border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4 pb-6 border-b border-white/10 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-blue-400 uppercase">Americas &amp; Global</div>
              <div className="text-xl font-bold text-white mt-0.5">USA Hub</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#12142B] border border-white/10 flex items-center justify-center text-[#8B84FF] flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Office Address</div>
                <div className="text-sm font-semibold text-white">Princeton, New Jersey, USA</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#12142B] border border-white/10 flex items-center justify-center text-[#8B84FF] flex-shrink-0 mt-0.5">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Phone Number</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">+91 7569665077</span>
                  <button
                    onClick={() => handleCopy('+917569665077', 'us-phone')}
                    className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                  >
                    {copiedKey === 'us-phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#12142B] border border-white/10 flex items-center justify-center text-[#8B84FF] flex-shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Official Email</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">hr@studentalumni.ai</span>
                  <button
                    onClick={() => handleCopy('hr@studentalumni.ai', 'us-email')}
                    className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                  >
                    {copiedKey === 'us-email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#12142B] border border-white/10 flex items-center justify-center text-[#8B84FF] flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Working Hours</div>
                <div className="text-sm font-semibold text-white">Mon – Fri: 9:00 AM – 6:00 PM EST</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Inquiry Form */}
      <div className="rounded-3xl bg-[#0C0E1B] border border-white/15 p-8 sm:p-12 shadow-2xl mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-2">
          <MessageSquare className="w-4 h-4" />
          <span>Direct Inquiry &amp; Support</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Send Us a Message</h2>
        <p className="text-gray-400 text-sm sm:text-base mb-8">
          Fill out the details below and our campus relations team will respond promptly.
        </p>

        {/* Purpose Chips */}
        <div className="mb-8">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Select Purpose</div>
          <div className="flex flex-wrap gap-2.5">
            {['General Inquiry', 'HR & Careers', 'College Partnerships', 'Mentor Network'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPurpose(p)}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  purpose === p
                    ? 'bg-[#5B4FE9] text-white border border-[#5B4FE9] shadow-lg shadow-indigo-500/25'
                    : 'bg-[#12142B] text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                className="w-full px-4 py-3.5 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">Official Email *</label>
              <input
                type="email"
                required
                placeholder="e.g. rahul@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3.5 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">Phone Number</label>
              <input
                type="text"
                placeholder="+91 7569665077"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3.5 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">College / University / Company</label>
              <input
                type="text"
                placeholder="e.g. Princeton / VNR VJIET"
                value={form.org}
                onChange={(e) => setForm({ ...form, org: e.target.value })}
                className="w-full px-4 py-3.5 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2">Your Message *</label>
            <textarea
              required
              rows={4}
              placeholder="How can we assist you with our platform, mentorship, or institutional onboarding?"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#12142B] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#8B84FF]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-[#5B4FE9] hover:bg-[#4F43D6] text-white shadow-xl shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{sent ? 'Message Sent' : 'Transmit Message'}</span>
          </button>
        </form>
      </div>

      {/* 3 Trust Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-[#0C0E1B] border border-white/10 p-6 text-center text-sm font-semibold text-gray-300">
        <div className="flex items-center justify-center gap-2.5">
          <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Verified Institutional Support</span>
        </div>
        <div className="flex items-center justify-center gap-2.5">
          <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>Direct Response Guarantee</span>
        </div>
        <div className="flex items-center justify-center gap-2.5">
          <Globe className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span>Accredited Global Campus Network</span>
        </div>
      </div>
    </section>
  );
}
