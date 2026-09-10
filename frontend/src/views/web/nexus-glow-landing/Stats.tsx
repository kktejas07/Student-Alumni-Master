import React from 'react';
import { motion } from 'framer-motion';
import { Users, Award, Building2, TrendingUp } from 'lucide-react';

const STATS_DATA = [
  {
    icon: Users,
    number: '50,000+',
    title: 'Active Students',
    desc: 'and growing every day',
  },
  {
    icon: Award,
    number: '1,200+',
    title: 'Verified Mentors',
    desc: 'from top 500 companies',
  },
  {
    icon: Building2,
    number: '200+',
    title: 'Partner Universities',
    desc: 'across 30+ countries',
  },
  {
    icon: TrendingUp,
    number: '96%',
    title: 'Placement Rate',
    desc: 'within 6 months of joining',
  },
];

export function Stats() {
  return (
    <section className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto text-center">
      <div className="rounded-3xl bg-[#0A0C18] border border-white/10 p-8 sm:p-14 shadow-2xl">
        <div className="text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-4">
          By The Numbers
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-14 leading-tight">
          Trusted by students <span className="text-[#8B84FF]">worldwide</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS_DATA.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="p-8 rounded-2xl bg-[#0C0E1B] border border-white/5 flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
                <item.icon className="w-6 h-6" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
                {item.number}
              </div>
              <div className="text-base font-bold text-white mb-1">{item.title}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}