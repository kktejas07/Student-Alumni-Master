import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Sparkles, CheckCircle2 } from 'lucide-react';

export function Dashboard() {
  return (
    <section id="dashboard" className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-4">
        <Compass className="w-4 h-4 text-[#8B84FF]" />
        <span>Your Command Center</span>
      </div>
      <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
        One dashboard,<br />
        <span className="text-[#8B84FF]">infinite momentum.</span>
      </h2>
      <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mb-14 leading-relaxed">
        Track every application, mentor session, and milestone in a beautifully quiet, deeply intelligent interface.
      </p>

      {/* Browser Mockup Window */}
      <div className="max-w-5xl mx-auto bg-[#0A0C18] border border-white/10 rounded-3xl overflow-hidden shadow-2xl text-left">
        {/* Browser Top Bar */}
        <div className="flex items-center gap-2 px-6 py-4 bg-[#070914] border-b border-white/10 relative">
          <div className="flex gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#12142B] border border-white/5 text-xs text-gray-400 font-mono">
            studentalumni.ai / overview
          </div>
        </div>

        {/* Browser Content */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3 bg-[#0C0E1B] border border-white/5 rounded-2xl p-4 space-y-1.5 text-sm">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 py-2">
              Menu
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/10 font-bold text-white">
              <span className="w-2 h-2 rounded-full bg-[#8B84FF]" />
              <span>Overview</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 font-medium hover:text-white">
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              <span>Agent K</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 font-medium hover:text-white">
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              <span>Mentors</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 font-medium hover:text-white">
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              <span>AI Roadmap</span>
            </div>
          </div>

          {/* Main Panel */}
          <div className="lg:col-span-9 space-y-6">
            {/* Stat Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#0C0E1B] border border-white/5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Active Applications
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white">12</span>
                  <span className="text-xs font-semibold text-[#8B84FF] bg-indigo-500/15 rounded-md px-2 py-0.5">
                    ↗ +3 this week
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0C0E1B] border border-white/5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Mentor Hours
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white">8.5h</span>
                  <span className="text-xs font-semibold text-[#8B84FF] bg-indigo-500/15 rounded-md px-2 py-0.5">
                    ↗ +2h vs last mo
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0C0E1B] border border-white/5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Skill Badges
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-[#8B84FF]">2,450</span>
                  <span className="text-xs font-semibold text-white bg-[#5B4FE9] rounded-md px-2 py-0.5">
                    Unlock Premium
                  </span>
                </div>
              </div>
            </div>

            {/* Agent K Priorities */}
            <div className="p-6 rounded-2xl bg-[#0C0E1B] border border-indigo-500/25">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-[#8B84FF]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Agent K Priorities</h4>
                  <p className="text-xs text-[#8B84FF] font-semibold">Curated for you today</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  'Refine your resume for the Google SWE referral drop.',
                  "Prep 3 questions for tomorrow's mentor call with Sarah.",
                  'Apply to 2 matched career opportunities closing this Friday.'
                ].map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 p-4 rounded-xl bg-[#12142B] border border-white/5 text-sm text-gray-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#8B84FF] flex-shrink-0" />
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Career Roadmap Mini Progress */}
            <div className="p-6 rounded-2xl bg-[#0C0E1B] border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-white text-sm">Career Roadmap</span>
                <span className="text-[10px] font-bold text-gray-400 bg-white/10 rounded-full px-3 py-1 uppercase tracking-wider">
                  Year 3 · Sem 1
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-2/3 bg-[#5B4FE9] rounded-full" />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-3">
                <span>Foundations</span>
                <span className="text-[#8B84FF]">Opportunities</span>
                <span>Full-time</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}