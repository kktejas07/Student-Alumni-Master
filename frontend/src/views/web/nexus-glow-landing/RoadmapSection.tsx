import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export function RoadmapSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0.2);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const total = rect.height;
      const current = windowHeight * 0.85 - rect.top;
      const p = Math.max(0.1, Math.min(1, current / total));
      setProgress(p);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const milestones = [
    { at: 0.05, cx: 30, cy: 230, textY: 272, label: '01 Foundations' },
    { at: 0.3, cx: 360, cy: 70, textY: 36, label: '02 Skill plan' },
    { at: 0.56, cx: 700, cy: 230, textY: 272, label: '03 Opportunities' },
    { at: 0.82, cx: 1010, cy: 60, textY: 26, label: '04 Full-time' },
  ];

  return (
    <section ref={sectionRef} className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-xl leading-tight">
          The roadmap fills in <span className="text-[#8B84FF]">as you scroll.</span>
        </h2>
        <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
          Day 1 → First Offer
        </span>
      </div>

      <div className="overflow-x-auto pb-6">
        <div className="min-w-[900px] w-full">
          <svg viewBox="0 0 1280 300" className="w-full h-auto overflow-visible">
            {/* Background Track Line */}
            <path
              d="M30 230 C 210 230 220 70 360 70 S 560 230 700 230 S 880 60 1010 60 S 1220 170 1250 170"
              fill="none"
              stroke="#1B1E33"
              strokeWidth="4"
            />
            {/* Animated Progress Line */}
            <path
              d="M30 230 C 210 230 220 70 360 70 S 560 230 700 230 S 880 60 1010 60 S 1220 170 1250 170"
              pathLength="1"
              fill="none"
              stroke="#5B4FE9"
              strokeWidth="4"
              strokeDasharray="1"
              strokeDashoffset={1 - progress}
              className="transition-all duration-300 ease-out"
            />

            {/* Milestones */}
            {milestones.map((m, idx) => {
              const active = progress >= m.at;
              return (
                <g key={idx} className={`transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-30'}`}>
                  <circle
                    cx={m.cx}
                    cy={m.cy}
                    r="10"
                    fill="#05060F"
                    stroke="#8B84FF"
                    strokeWidth="3"
                  />
                  {active && (
                    <circle
                      cx={m.cx}
                      cy={m.cy}
                      r="4"
                      fill="#8B84FF"
                    />
                  )}
                  <text
                    x={m.cx}
                    y={m.textY}
                    textAnchor="middle"
                    className="font-sans text-[17px] font-bold fill-white"
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}
