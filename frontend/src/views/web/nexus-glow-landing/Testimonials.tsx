import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TESTIMONIALS = [
  {
    quote: '“I had no idea who to ask in my final year. Two mentor calls turned a vague plan into an actual offer.”',
    author: 'AISHA · YEAR 4, COMPUTER SCIENCE',
  },
  {
    quote: '“One hour a month, and three of my mentees have internships this summer.”',
    author: 'ARJUN · ALUMNUS, DATA SCIENCE',
  },
  {
    quote: '“Placement reporting took our office three weeks a term. It is now a dashboard we read on a Monday.”',
    author: 'R. IYER · CAREER SERVICES, PARTNER COLLEGE',
  },
];

export function Testimonials() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % TESTIMONIALS.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto">
      <div className="text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-4">
        From The Network
      </div>
      <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-12 leading-tight">
        Students, alumni <span className="text-[#8B84FF]">and offices.</span>
      </h2>

      {/* Quote Display */}
      <div className="relative min-h-[220px] rounded-3xl bg-[#0A0C18] border border-white/10 p-8 sm:p-12 flex flex-col justify-center shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-xl sm:text-3xl font-semibold text-gray-100 leading-relaxed max-w-4xl mb-6">
              {TESTIMONIALS[current].quote}
            </p>
            <div className="text-xs font-bold tracking-widest text-[#8B84FF] uppercase">
              {TESTIMONIALS[current].author}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="flex gap-3 mt-6">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
              current === i ? 'w-10 bg-[#8B84FF]' : 'w-6 bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>
    </section>
  );
}