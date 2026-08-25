import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const POLAROIDS = [
  {
    title: 'Alumni career fair',
    subtitle: 'March',
    rot: -7,
    svg: (
      <svg viewBox="0 0 320 260" className="w-full h-[240px] rounded-xl bg-[#090B16]">
        <circle cx="252" cy="60" r="46" fill="#2A2E45" />
        <path d="M40 96 h240" stroke="#8B84FF" strokeWidth="3" />
        <path d="M56 96 v-22 h208 v22" fill="none" stroke="#5B4FE9" strokeWidth="3" />
        <rect x="92" y="46" width="136" height="30" rx="6" fill="#5B4FE9" />
        <circle cx="96" cy="150" r="14" fill="#D5D8E4" />
        <path d="M76 208 q0 -34 20 -34 q20 0 20 34 Z" fill="#5B4FE9" />
        <circle cx="160" cy="142" r="16" fill="#8B84FF" />
        <path d="M137 209 q0 -39 23 -39 q23 0 23 39 Z" fill="#2A2E45" />
        <circle cx="226" cy="152" r="13" fill="#A78BFA" />
        <path d="M207 207 q0 -32 19 -32 q19 0 19 32 Z" fill="#5B4FE9" />
      </svg>
    )
  },
  {
    title: 'One-to-one mentoring',
    subtitle: 'Library, block C',
    rot: 4,
    svg: (
      <svg viewBox="0 0 320 260" className="w-full h-[240px] rounded-xl bg-[#090B16]">
        <circle cx="70" cy="66" r="40" fill="#2A2E45" />
        <circle cx="96" cy="120" r="15" fill="#D5D8E4" />
        <path d="M74 184 q0 -37 22 -37 q22 0 22 37 Z" fill="#5B4FE9" />
        <circle cx="224" cy="120" r="15" fill="#8B84FF" />
        <path d="M202 184 q0 -37 22 -37 q22 0 22 37 Z" fill="#2A2E45" />
        <rect x="52" y="186" width="216" height="12" rx="6" fill="#8B84FF" />
        <path d="M146 54 h74 q10 0 10 10 v30 q0 10 -10 10 h-46 l-18 16 v-16 q-10 0 -10 -10 v-30 q0 -10 10 -10 Z" fill="#5B4FE9" />
      </svg>
    )
  },
  {
    title: 'Hackathon weekend',
    subtitle: 'Alumni-run',
    rot: -3,
    svg: (
      <svg viewBox="0 0 320 260" className="w-full h-[240px] rounded-xl bg-[#090B16]">
        <circle cx="88" cy="74" r="12" fill="#8B84FF" />
        <circle cx="232" cy="74" r="12" fill="#A78BFA" />
        <rect x="66" y="128" width="188" height="112" rx="8" fill="#2A2E45" />
        <rect x="80" y="142" width="160" height="82" rx="4" fill="#090B16" />
        <path d="M94 162 h48 M94 178 h72 M94 194 h36 M94 210 h60" stroke="#5B4FE9" strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: 'Graduation',
    subtitle: 'Class of 2026',
    rot: 6,
    svg: (
      <svg viewBox="0 0 320 260" className="w-full h-[240px] rounded-xl bg-[#090B16]">
        <circle cx="160" cy="130" r="86" fill="#2A2E45" />
        <circle cx="160" cy="128" r="21" fill="#D5D8E4" />
        <path d="M130 214 q0 -51 30 -51 q30 0 30 51 Z" fill="#5B4FE9" />
        <path d="M112 92 L160 68 L208 92 L160 116 Z" fill="#8B84FF" />
        <path d="M208 92 v26" stroke="#8B84FF" strokeWidth="4" />
      </svg>
    )
  },
  {
    title: 'First week on the job',
    subtitle: 'Internship',
    rot: -2,
    svg: (
      <svg viewBox="0 0 320 260" className="w-full h-[240px] rounded-xl bg-[#090B16]">
        <rect x="44" y="176" width="232" height="12" rx="6" fill="#8B84FF" />
        <rect x="118" y="96" width="120" height="72" rx="6" fill="#2A2E45" />
        <rect x="130" y="108" width="96" height="48" rx="3" fill="#3B82F6" opacity=".45" />
        <circle cx="88" cy="118" r="14" fill="#D5D8E4" />
        <path d="M68 176 q0 -34 20 -34 q20 0 20 34 Z" fill="#5B4FE9" />
      </svg>
    )
  }
];

export function OnCampus() {
  const [front, setFront] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFront((f) => (f + 1) % POLAROIDS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-4">
            On Campus
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            A year on <span className="text-[#8B84FF]">the network.</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-400 leading-relaxed mb-8 max-w-md">
            The stack deals itself forward every few seconds. Click any card or indicator to bring it directly to the front.
          </p>

          <div className="flex gap-2.5">
            {POLAROIDS.map((_, i) => (
              <button
                key={i}
                onClick={() => setFront(i)}
                className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                  front === i ? 'w-8 bg-[#8B84FF]' : 'w-5 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Polaroid Stack */}
        <div className="relative h-[380px] flex items-center justify-center">
          {POLAROIDS.map((card, i) => {
            const k = (i - front + POLAROIDS.length) % POLAROIDS.length;
            const isTop = k === 0;
            const xOffset = k % 2 ? k * 9 : -k * 9;
            const yOffset = k * 13;
            const scale = 1 - k * 0.05;
            const rot = isTop ? 0 : card.rot;

            return (
              <motion.div
                key={i}
                onClick={() => setFront(i)}
                animate={{
                  x: xOffset,
                  y: yOffset,
                  scale,
                  rotate: rot,
                  opacity: k > 3 ? 0 : 1 - k * 0.14,
                  zIndex: POLAROIDS.length - k,
                }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute w-72 sm:w-80 rounded-2xl bg-[#0A0C18] border border-white/15 p-3.5 pb-5 shadow-2xl cursor-pointer"
              >
                {card.svg}
                <div className="flex items-baseline justify-between gap-3 px-1 mt-3.5">
                  <span className="font-bold text-white text-base">{card.title}</span>
                  <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">{card.subtitle}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
