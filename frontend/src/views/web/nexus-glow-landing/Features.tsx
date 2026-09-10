import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Users, Calendar, Gift, Briefcase, FileText, Map } from 'lucide-react';

export function Features() {
  return (
    <section id="features" className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto">
      <div className="text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-4">
        ● Everything You Need
      </div>
      <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
        A complete career OS,<br />
        <span className="text-[#8B84FF]">built for students.</span>
      </h2>
      <p className="text-base sm:text-lg text-gray-400 max-w-xl mb-14 leading-relaxed">
        Everything from your first job match to your full-time offer in one intelligent platform.
      </p>

      {/* 7 Bento Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 01 Agent K (2 cols) */}
        <div className="md:col-span-2 relative p-8 sm:p-10 rounded-3xl bg-[#0C0E1B] border border-white/10 hover:border-white/20 transition-all">
          <span className="absolute right-6 top-6 text-xs font-bold text-gray-600">01</span>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Agent K</h3>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-lg">
            Your always-on AI career copilot. Ask anything resume tips, interview prep, salary negotiation. Agent K remembers your goals and grows with you.
          </p>
        </div>

        {/* 02 Mentors */}
        <div className="relative p-8 rounded-3xl bg-[#0C0E1B] border border-white/10 hover:border-white/20 transition-all">
          <span className="absolute right-6 top-6 text-xs font-bold text-gray-600">02</span>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Mentors</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            One-on-one sessions with alumni from Google, McKinsey, Goldman &amp; more. Book, chat, level up.
          </p>
        </div>

        {/* 03 Events */}
        <div className="relative p-8 rounded-3xl bg-[#0C0E1B] border border-white/10 hover:border-white/20 transition-all">
          <span className="absolute right-6 top-6 text-xs font-bold text-gray-600">03</span>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Events</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Workshops, hackathons, and industry panels curated to your track and semester.
          </p>
        </div>

        {/* 04 Student Perks */}
        <div className="relative p-8 rounded-3xl bg-[#0C0E1B] border border-white/10 hover:border-white/20 transition-all">
          <span className="absolute right-6 top-6 text-xs font-bold text-gray-600">04</span>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
            <Gift className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Student Perks</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Unlock exclusive student deals and discounts on mentorship, courses, and partner services.
          </p>
        </div>

        {/* 05 Career Opportunities (Highlighted) */}
        <div className="relative p-8 rounded-3xl bg-gradient-to-br from-[#1B1647] to-[#0E1020] border border-indigo-500/40 shadow-xl shadow-indigo-950/40">
          <span className="absolute right-6 top-6 text-xs font-bold text-indigo-300">05</span>
          <div className="w-12 h-12 rounded-2xl bg-[#5B4FE9] flex items-center justify-center text-white mb-6">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-indigo-200 mb-3">Career Opportunities</h3>
          <p className="text-sm text-indigo-100/70 leading-relaxed">
            Personalized opportunity feed sourced from partner companies and warm alumni referrals.
          </p>
        </div>

        {/* 06 Resume Polish */}
        <div className="relative p-8 rounded-3xl bg-[#0C0E1B] border border-white/10 hover:border-white/20 transition-all">
          <span className="absolute right-6 top-6 text-xs font-bold text-gray-600">06</span>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Resume Polish</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Instant AI rewrites with ATS scoring, role-specific keywords, and beautiful design templates.
          </p>
        </div>

        {/* 07 Career Roadmap (2 cols) */}
        <div className="md:col-span-2 relative p-8 sm:p-10 rounded-3xl bg-[#0C0E1B] border border-white/10 hover:border-white/20 transition-all">
          <span className="absolute right-6 top-6 text-xs font-bold text-gray-600">07</span>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
            <Map className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Career Roadmap</h3>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-lg">
            Visual step-by-step plan from Day 1 to your first offer auto-updated as your goals evolve.
          </p>
        </div>
      </div>
    </section>
  );
}