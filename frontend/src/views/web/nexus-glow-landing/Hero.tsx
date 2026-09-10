import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useRouter } from 'expo-router';

const COLLEGES = [
  'MRIT', 'Malla Reddy College of Engineering', 'SR University',
  'VJ Data Questers', 'VJ ARC', 'VNR VJIET', 'GITAM',
  'IUCEE VNRVJIET', 'IEEE Computer Society', 'Garuda Vigilance'
];

const INDUSTRY = [
  'Deloitte', 'Featherless', 'Atlast', 'Bandiwala',
  'EXtrive Innovations', 'Larsen & Toubro', 'LinkedIn'
];

export function Hero() {
  const router = useRouter();

  return (
    <section className="relative pt-32 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-6"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#8B84FF]" />
            <span>AI Career Platform for Students</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-[58px] font-extrabold tracking-tight leading-[1.08] text-white"
          >
            Your Intelligent <br className="hidden sm:inline" />
            <span className="text-[#8B84FF]">Companion</span> for a <br className="hidden sm:inline" />
            Modern Career
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mt-6 text-base sm:text-lg text-gray-300 leading-relaxed max-w-xl font-normal"
          >
            Meet Agent K your always-on career copilot. Connect with mentors, discover events and career opportunities, polish your resume, and follow a personalized roadmap built for the way students actually work today.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3.5"
          >
            <button
              onClick={() => router.push('/get-started')}
              className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-sm font-bold text-white bg-[#5B4FE9] hover:bg-[#4F43D6] shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 cursor-pointer"
            >
              <span>I'm a student</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push('/(auth)/login')}
              className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-sm font-semibold text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              <span>I'm a college</span>
            </button>
          </motion.div>

          {/* Trust points */}
          <div className="mt-5 flex items-center justify-center lg:justify-start gap-3 text-xs text-gray-400 flex-wrap">
            <span>Free for students</span>
            <span>·</span>
            <span>No credit card</span>
            <span>·</span>
            <span>Your profile stays private until you reach out</span>
          </div>
        </div>

        {/* Right Column: 3D Animated Floating Shield */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="lg:col-span-5 relative flex items-center justify-center min-h-[380px]"
        >
          {/* Glowing Radial Backdrop */}
          <div className="absolute w-[360px] h-[360px] rounded-full bg-purple-500/25 blur-3xl pointer-events-none" />

          {/* Floating SA Shield SVG */}
          <motion.div
            animate={{
              y: [0, -14, 0],
              rotateY: [-10, 10, -10],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative z-10 w-64 sm:w-72"
          >
            <svg viewBox="0 0 300 350" className="w-full h-auto drop-shadow-2xl">
              <defs>
                <linearGradient id="sa-hero-out" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#D8B6FF" />
                  <stop offset="45%" stopColor="#9A5CE8" />
                  <stop offset="100%" stopColor="#5B1FB0" />
                </linearGradient>
                <linearGradient id="sa-hero-in" x1="0" y1="0" x2="0.4" y2="1">
                  <stop offset="0%" stopColor="#B683F5" />
                  <stop offset="100%" stopColor="#7331C9" />
                </linearGradient>
                <linearGradient id="sa-hero-txt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="55%" stopColor="#EDEAF6" />
                  <stop offset="100%" stopColor="#B9B4C6" />
                </linearGradient>
              </defs>
              <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#sa-hero-out)" />
              <path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#sa-hero-in)" />
              <text x="150" y="215" textAnchor="middle" className="font-sans text-[128px] font-extrabold tracking-tight" fill="url(#sa-hero-txt)">
                SA
              </text>
            </svg>
          </motion.div>
        </motion.div>
      </div>

      {/* Dual Marquee: Colleges & Industry */}
      <div className="mt-20 space-y-4">
        {/* Colleges Marquee */}
        <div className="flex items-center gap-4">
          <span className="flex-shrink-0 text-xs font-bold tracking-widest text-[#8B84FF] bg-indigo-500/15 border border-indigo-500/25 rounded-lg px-3 py-2 uppercase">
            Colleges
          </span>
          <div className="overflow-hidden w-full">
            <div className="flex w-max gap-3.5 animate-marquee-left">
              {[...COLLEGES, ...COLLEGES].map((col, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2.5 rounded-xl bg-[#0C0E1B] border border-white/10 text-white text-xs font-bold whitespace-nowrap flex items-center justify-center min-w-[130px]"
                >
                  {col}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Industry Marquee */}
        <div className="flex items-center gap-4">
          <span className="flex-shrink-0 text-xs font-bold tracking-widest text-[#8B84FF] bg-indigo-500/15 border border-indigo-500/25 rounded-lg px-3 py-2 uppercase">
            Industry
          </span>
          <div className="overflow-hidden w-full">
            <div className="flex w-max gap-3.5 animate-marquee-right">
              {[...INDUSTRY, ...INDUSTRY].map((ind, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2.5 rounded-xl bg-[#0C0E1B] border border-white/10 text-white text-xs font-bold whitespace-nowrap flex items-center justify-center min-w-[130px]"
                >
                  {ind}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}