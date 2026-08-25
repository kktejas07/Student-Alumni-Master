import React from 'react';
import { motion } from 'framer-motion';

const OUTCOMES = [
  {
    tag: "CS '26 · Hyderabad",
    name: 'Aisha K.',
    story: 'Two mentor calls, one resume rewrite, SWE offer in four months.',
    role: 'SWE · PRODUCT COMPANY',
  },
  {
    tag: "ECE '25 · Pune",
    name: 'Rohan M.',
    story: 'Matched to an alumnus who ran the same internship two years earlier.',
    role: 'DATA ANALYST · FINTECH',
  },
  {
    tag: "Design '26 · Remote",
    name: 'Ira S.',
    story: 'Portfolio review with a design lead, then a referral into her shortlist.',
    role: 'PRODUCT DESIGN INTERN',
  },
  {
    tag: "MBA '25 · Mumbai",
    name: 'Dev P.',
    story: 'Used the roadmap to pick electives that matched his target role.',
    role: 'STRATEGY ASSOCIATE',
  },
];

export function Outcomes() {
  return (
    <section className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto">
      <div className="text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-4">
        Where Students Landed
      </div>
      <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-12 max-w-xl leading-tight">
        Four students, four <span className="text-[#8B84FF]">first offers.</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {OUTCOMES.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="p-7 rounded-2xl bg-[#0C0E1B] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-medium text-gray-500 mb-4">{item.tag}</div>
              <div className="text-xl font-bold text-white mb-2">{item.name}</div>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">{item.story}</p>
            </div>
            <div className="text-[11px] font-bold tracking-wider text-[#8B84FF] uppercase">
              {item.role}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
