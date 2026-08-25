import React from 'react';
import { motion } from 'framer-motion';

export function Audiences() {
  const items = [
    {
      num: '01 / STUDENTS',
      title: 'A roadmap, not a guess',
      desc: 'Term-by-term steps built from your course, goals, and gaps — with verified alumni who have already walked your path.',
      svg: (
        <svg viewBox="0 0 300 190" className="w-full h-44 rounded-xl bg-[#090B16]">
          <path d="M104 78 L150 54 L196 78 L150 102 Z" fill="#8B84FF" />
          <path d="M196 78 v24" stroke="#8B84FF" strokeWidth="4" />
          <rect x="60" y="120" width="180" height="18" rx="4" fill="#3B2F8F" />
          <rect x="74" y="138" width="152" height="18" rx="4" fill="#8B84FF" opacity=".55" />
          <rect x="60" y="156" width="180" height="18" rx="4" fill="#3B2F8F" />
        </svg>
      )
    },
    {
      num: '02 / ALUMNI',
      title: 'Give an hour a month',
      desc: 'Answer questions, refer candidates, host a portfolio review. Your contribution is recognized and visible to your alma mater.',
      svg: (
        <svg viewBox="0 0 300 190" className="w-full h-44 rounded-xl bg-[#090B16]">
          <circle cx="150" cy="80" r="38" fill="#2A2E45" />
          <circle cx="150" cy="80" r="24" fill="#5B4FE9" opacity=".5" />
          <path d="M124 128 l-14 44 26 -12 M176 128 l14 44 -26 -12" fill="#5B4FE9" />
        </svg>
      )
    },
    {
      num: '03 / MENTORS',
      title: 'Calls with an agenda',
      desc: 'Every session opens with structured prompts drawn from the student roadmap, ensuring every conversation delivers high impact.',
      svg: (
        <svg viewBox="0 0 300 190" className="w-full h-44 rounded-xl bg-[#090B16]">
          <path d="M52 44 h120 q10 0 10 10 v46 q0 10 -10 10 h-72 l-22 18 v-18 h-26 q-10 0 -10 -10 v-46 q0 -10 10 -10 Z" fill="#3B82F6" opacity=".85" />
          <path d="M148 92 h96 q10 0 10 10 v40 q0 10 -10 10 h-60 l-20 16 v-16 h-16 q-10 0 -10 -10 v-40 q0 -10 10 -10 Z" fill="#1E3A6B" />
        </svg>
      )
    },
    {
      num: '04 / COLLEGES',
      title: 'Placement, in one view',
      desc: 'Real-time student engagement, mentorship hours, and verified placement outcomes reported per cohort, department, and semester.',
      svg: (
        <svg viewBox="0 0 300 190" className="w-full h-44 rounded-xl bg-[#090B16]">
          <rect x="40" y="112" width="60" height="58" fill="#4F46C7" />
          <rect x="108" y="72" width="84" height="98" fill="#A78BFA" opacity=".8" />
          <rect x="200" y="98" width="60" height="72" fill="#4F46C7" />
          <path d="M108 72 L150 44 L192 72 Z" fill="#A78BFA" />
          <rect x="30" y="170" width="240" height="8" rx="4" fill="#4F46C7" />
        </svg>
      )
    }
  ];

  return (
    <section className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto">
      <div className="text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-4">
        Who It Is For
      </div>
      <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-12 leading-tight">
        Four points of view, <span className="text-[#8B84FF]">one graph.</span>
      </h2>

      <div className="space-y-6">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="p-8 sm:p-10 rounded-3xl bg-[#0A0C18] border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
          >
            <div>
              <div className="text-xs font-bold tracking-widest text-[#8B84FF] mb-3">{item.num}</div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
            <div>{item.svg}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
