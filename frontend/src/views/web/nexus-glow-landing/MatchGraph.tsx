import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface MentorNode {
  x: number;
  y: number;
  score: number;
  name: string;
  why: string;
}

const NODES: MentorNode[] = [
  {
    x: 310,
    y: 132,
    score: 98,
    name: 'Priya R. — Product, Bengaluru',
    why: 'Same course, four years ahead. Mentors three students each term.',
  },
  {
    x: 430,
    y: 201,
    score: 92,
    name: 'Arjun M. — Data, Pune',
    why: 'Ex-intern at your target firm. Reviews analytics portfolios monthly.',
  },
  {
    x: 430,
    y: 339,
    score: 88,
    name: 'Neha S. — Design, Remote',
    why: 'Runs the portfolio review your roadmap suggests next.',
  },
  {
    x: 310,
    y: 408,
    score: 85,
    name: 'Rohit K. — Finance, Mumbai',
    why: 'Alumnus of your college, hiring two summer interns.',
  },
  {
    x: 190,
    y: 339,
    score: 81,
    name: 'Sana T. — Research, Delhi',
    why: 'Published in your field, open to weekly calls.',
  },
  {
    x: 190,
    y: 201,
    score: 76,
    name: 'Dev P. — Engineering, Hyderabad',
    why: 'Took the same electives. Answers within a day.',
  },
];

export function MatchGraph() {
  const [activeNode, setActiveNode] = useState<MentorNode>(NODES[0]);

  return (
    <section className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-4">
            How Matching Works
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            1,200+ verified mentors,<br />
            <span className="text-[#8B84FF]">ranked by fit.</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-400 leading-relaxed mb-8 max-w-md">
            Agent K scores every alumnus against your course, goals, and target roles. Hover any node on the orbital ring to inspect the match score and connection details.
          </p>

          <div className="p-6 rounded-2xl bg-[#0A0C18] border border-white/10 min-h-[110px]">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Match Detail
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mb-1">{activeNode.name}</div>
            <p className="text-sm text-gray-400 leading-relaxed">{activeNode.why}</p>
          </div>
        </div>

        {/* Interactive Orbital Radar Canvas */}
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 620 540" className="w-full max-w-[540px] h-auto overflow-visible">
            {/* Concentric Rings */}
            <g stroke="#1B1E33" strokeWidth="1.5" fill="none" strokeDasharray="4 8">
              <circle cx="310" cy="270" r="128" />
              <circle cx="310" cy="270" r="206" />
            </g>

            {/* Ripple Pulse Rings */}
            <circle cx="310" cy="270" r="52" stroke="#8B84FF" strokeWidth="1.5" fill="none" opacity="0.3" className="animate-ping" />

            {/* Line connecting Center to Active Node */}
            <line
              x1="310"
              y1="270"
              x2={activeNode.x}
              y2={activeNode.y}
              stroke="#8B84FF"
              strokeWidth="2"
              strokeDasharray="5 5"
              className="transition-all duration-300 ease-out"
            />

            {/* Center "YOU" Node */}
            <circle cx="310" cy="270" r="52" fill="#0C0E1B" stroke="#5B4FE9" strokeWidth="2.5" />
            <text x="310" y="266" textAnchor="middle" className="font-sans text-base font-extrabold fill-white">
              YOU
            </text>
            <text x="310" y="286" textAnchor="middle" className="font-sans text-[10px] font-bold tracking-widest fill-gray-400">
              YEAR 3
            </text>

            {/* Mentor Nodes */}
            {NODES.map((node, i) => {
              const isSelected = activeNode.name === node.name;
              return (
                <g
                  key={i}
                  onMouseEnter={() => setActiveNode(node)}
                  onClick={() => setActiveNode(node)}
                  className="cursor-pointer group"
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="32"
                    fill="#0C0E1B"
                    stroke={isSelected ? '#8B84FF' : '#2A2E45'}
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="transition-all duration-200"
                  />
                  <text
                    x={node.x}
                    y={node.y + 5}
                    textAnchor="middle"
                    className={`font-sans text-sm font-bold transition-all ${
                      isSelected ? 'fill-white' : 'fill-gray-300'
                    }`}
                  >
                    {node.score}
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
