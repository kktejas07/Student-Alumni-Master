const collegeLogos = [
  { name: "MLRIT", subtitle: "MLR Institute of Technology", src: "/logos/mlrit.png" },
  { name: "Malla Reddy College", subtitle: "College of Engineering", src: "/logos/malla-reddy.png" },
  { name: "SR International", subtitle: "Institute of Technology", src: "/logos/sr-university.png" },
  { name: "VJ Data Questers", subtitle: "Data Science Society", src: "/logos/vj-data-questers.png" },
  { name: "VJ ARC", subtitle: "Automation & Robotics", src: "/logos/vj-arc.png" },
  { name: "VNR VJIET", subtitle: "Autonomous Institution", src: "/logos/vnrvjit.png" },
  { name: "GITAM", subtitle: "Deemed University", src: "/logos/gitam.png" },
  { name: "IUCEE VNRVJIET", subtitle: "Engineering Education Consortium", src: "/logos/iucee.png" },
  { name: "IEEE Computer Society", subtitle: "Student Branch Chapter", src: "/logos/ieee.png" },
  { name: "Garuda Vigilance", subtitle: "Security & Intelligence", src: "/logos/garuda-vigilance.png" },
];

const industryLogos = [
  { name: "Deloitte", src: "/logos/deloitte.png" },
  { name: "Featherless", src: "/logos/featherless.png" },
  { name: "Atlast", src: "/logos/atlast.png" },
  { name: "Bandiwala", src: "/logos/bandiwala.png" },
  { name: "EXtrive Innovations", src: "/logos/extrive.png" },
  { name: "Larsen & Toubro", src: "/logos/lt.png" },
  { name: "LinkedIn", src: "/logos/linkedin.png" },
  { name: "StepUpMark.AI", src: "/logos/stepupmark.png" },
  { name: "Jabbergurus", src: "/logos/jabbergurus.png" },
];

export function Logos() {
  const loopCollegeLogos = [...collegeLogos, ...collegeLogos];
  const loopIndustryLogos = [...industryLogos, ...industryLogos];

  return (
    <section id="partners" className="relative overflow-hidden py-14 gap-10 flex flex-col bg-[#180433] z-10 border-b border-purple-900/40">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 md:w-40 bg-gradient-to-r from-[#180433] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 md:w-40 bg-gradient-to-l from-[#180433] to-transparent z-10" />

      {/* Row 1: OUR COLLEGE COLLABORATIONS */}
      <div className="relative mx-auto max-w-7xl px-6 w-full">
        <div className="flex items-center gap-4 md:gap-10">
          {/* Highlighted Left Title Badge */}
          <div className="shrink-0 z-20 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md shadow-sm">
            <p className="text-[10px] sm:text-xs md:text-sm lg:text-base font-black uppercase tracking-widest text-white whitespace-nowrap">
              COLLEGES
            </p>
            <p className="hidden sm:block text-[10px] md:text-sm lg:text-base font-black uppercase tracking-widest text-purple-200 whitespace-nowrap">
              COLLABORATIONS
            </p>
          </div>

          {/* College Marquee Track */}
          <div className="flex-1 min-w-0 overflow-hidden group select-none relative">
            <div
              className="flex w-max shrink-0 items-center gap-10 pr-10 will-change-transform group-hover:[animation-play-state:paused]"
              style={{ animation: "logoScroll 28s linear infinite" }}
            >
              {loopCollegeLogos.map((logo, i) => (
                <div
                  key={`col-${logo.name}-${i}`}
                  className="shrink-0 flex items-center justify-center h-16 w-36 md:h-20 md:w-44 rounded-2xl bg-white p-3.5 shadow-md border border-purple-100/50 overflow-hidden opacity-95 hover:opacity-100 hover:scale-105 transition-all duration-200"
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    className="max-h-full max-w-full object-contain pointer-events-none rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: OUR INDUSTRY COLLABORATIONS */}
      <div className="relative mx-auto max-w-7xl px-6 w-full mt-4">
        <div className="flex items-center gap-4 md:gap-10">
          {/* Highlighted Left Title Badge */}
          <div className="shrink-0 z-20 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md shadow-sm">
            <p className="text-[10px] sm:text-xs md:text-sm lg:text-base font-black uppercase tracking-widest text-white whitespace-nowrap">
              INDUSTRY
            </p>
            <p className="hidden sm:block text-[10px] md:text-sm lg:text-base font-black uppercase tracking-widest text-purple-200 whitespace-nowrap">
              COLLABORATIONS
            </p>
          </div>

          {/* Industry Marquee Track (scrolling reverse or smooth) */}
          <div className="flex-1 min-w-0 overflow-hidden group select-none relative">
            <div
              className="flex w-max shrink-0 items-center gap-10 pr-10 will-change-transform group-hover:[animation-play-state:paused]"
              style={{ animation: "logoScroll 32s linear infinite" }}
            >
              {loopIndustryLogos.map((logo, i) => (
                <div
                  key={`ind-${logo.name}-${i}`}
                  className="shrink-0 flex items-center justify-center h-16 w-36 md:h-20 md:w-44 rounded-2xl bg-white p-3.5 shadow-md border border-purple-100/50 overflow-hidden opacity-95 hover:opacity-100 hover:scale-105 transition-all duration-200"
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    className="max-h-full max-w-full object-contain pointer-events-none rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes logoScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
    </section>
  );
}