import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Zap } from 'lucide-react';
import { useRouter } from 'expo-router';

export function CTA() {
  const router = useRouter();

  return (
    <section className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto text-center">
      <div className="rounded-3xl bg-gradient-to-b from-[#12142B] to-[#0A0C18] border border-white/10 p-8 sm:p-16 shadow-2xl">
        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-6">
          <Zap className="w-3.5 h-3.5 text-[#8B84FF]" />
          <span>Start Your Journey</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Your career, quietly<br />
          <span className="text-[#8B84FF]">upgraded.</span>
        </h2>

        <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Join 50,000+ students already using StudentAlumni to land career opportunities, find mentors, and build their future. No credit card required.
        </p>

        <button
          onClick={() => router.push('/get-started')}
          className="inline-flex items-center gap-2 px-9 py-4.5 rounded-xl font-bold text-base text-white bg-[#5B4FE9] hover:bg-[#4F43D6] shadow-2xl shadow-indigo-500/30 hover:scale-105 transition-all cursor-pointer"
        >
          <span>Create your free account</span>
          <ArrowUpRight className="w-5 h-5" />
        </button>

        {/* 3 FAQ Mini Columns */}
        <div className="mt-14 pt-10 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-3xl mx-auto">
          <div>
            <div className="text-sm font-bold text-white mb-1.5">Is it free?</div>
            <div className="text-xs text-gray-400 leading-relaxed">Free for students, always. Colleges pay per cohort.</div>
          </div>
          <div>
            <div className="text-sm font-bold text-white mb-1.5">Who sees my profile?</div>
            <div className="text-xs text-gray-400 leading-relaxed">Nobody, until you send a request yourself.</div>
          </div>
          <div>
            <div className="text-sm font-bold text-white mb-1.5">If no mentor replies?</div>
            <div className="text-xs text-gray-400 leading-relaxed">We re-match within 48 hours, up to three times.</div>
          </div>
        </div>

        <div className="text-[11px] font-bold tracking-widest text-gray-500 uppercase mt-10">
          Takes less than 60 seconds to set up
        </div>
      </div>
    </section>
  );
}