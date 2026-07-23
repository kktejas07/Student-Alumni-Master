import { useEffect, useRef } from "react";

const logos = [
  { name: "VNR VJIT",                      src: "/logos/vnrvjit.png" },
  { name: "Malla Reddy College",           src: "/logos/malla-reddy.png" },
  { name: "GITAM",                         src: "/logos/gitam.png" },
  { name: "SR University",                 src: "/logos/sr-university.png" },
  { name: "MLRIT",                         src: "/logos/mlrit.png" },
  { name: "LinkedIn",                      src: "/logos/linkedin.png" },
  { name: "Deloitte",                      src: "/logos/deloitte.png" },
  { name: "Larsen & Toubro",               src: "/logos/lt.png" },
  { name: "Featherless",                   src: "/logos/featherless.png" },
  { name: "EXtrive Innovations",           src: "/logos/extrive.png" },
  { name: "Jabbergurus",                   src: "/logos/jabbergurus.png" },
  { name: "StepUpMark.AI",                 src: "/logos/stepupmark.png" },
  { name: "Atlast",                        src: "/logos/atlast.png" },
  { name: "Bandiwala",                     src: "/logos/bandiwala.png" },
  { name: "VJ Data Questers",              src: "/logos/vj-data-questers.png" },
  { name: "IUCEE VNRVJIET",                src: "/logos/iucee.png" },
  { name: "IEEE Computer Society",         src: "/logos/ieee.png" },
  { name: "Garuda Vigilance",              src: "/logos/garuda-vigilance.png" },
  { name: "VJ ARC",                        src: "/logos/vj-arc.png" },
];

// Duplicate for seamless loop
const loopLogos = [...logos, ...logos];

export function Logos() {
  return (
    <section className="relative overflow-hidden py-10">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section Title */}
        <div className="text-center mb-12">
          <p className="text-lg md:text-xl font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
            Our Partners & Collaborations
          </p>
        </div>

        {/* Marquee track */}
        <div className="flex overflow-hidden group">
          <div
            className="flex w-max shrink-0 items-center gap-12 pr-12 will-change-transform"
            style={{ animation: "marquee-ltr 30s linear infinite" }}
          >
            {logos.map((logo, i) => (
              <div
                key={`${logo.name}-${i}`}
                className="shrink-0 flex items-center justify-center h-16 w-32 md:h-20 md:w-36"
              >
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="max-h-full max-w-full object-contain opacity-80 hover:opacity-100 transition-opacity duration-200"
                />
              </div>
            ))}
          </div>
          <div
            className="flex w-max shrink-0 items-center gap-12 pr-12 will-change-transform"
            aria-hidden="true"
            style={{ animation: "marquee-ltr 30s linear infinite" }}
          >
            {logos.map((logo, i) => (
              <div
                key={`${logo.name}-dup-${i}`}
                className="shrink-0 flex items-center justify-center h-16 w-32 md:h-20 md:w-36"
              >
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="max-h-full max-w-full object-contain opacity-80 hover:opacity-100 transition-opacity duration-200"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keyframe animation injected inline */}
      <style>{`
        @keyframes marquee-ltr {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </section>
  );
}