import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { TrendingUp, Users, Building2, Award } from "lucide-react";

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, {
      duration: 2.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() + suffix;
      },
    });
    return controls.stop;
  }, [inView, to, suffix, mv]);
  return <span ref={ref}>0{suffix}</span>;
}

const items = [
  { n: 50000, s: "+", label: "Active Students", sublabel: "and growing every day", icon: Users },
  { n: 1200, s: "+", label: "Verified Mentors", sublabel: "from top 500 companies", icon: Award },
  { n: 200, s: "+", label: "Partner Universities", sublabel: "across 30+ countries", icon: Building2 },
  { n: 96, s: "%", label: "Placement Rate", sublabel: "within 6 months of joining", icon: TrendingUp },
];

export function Stats() {
  return (
    <section className="relative py-24 bg-[#F8F9FC] border-b border-[#E3E0F0] z-10 text-[#110B29]">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2.5rem] p-[1px] bg-[#E3E0F0] shadow-[0_10px_30px_rgba(110,15,141,0.05)]"
        >
          <div className="relative rounded-[2.4rem] bg-white overflow-hidden p-10 md:p-16">
            
            {/* heading */}
            <div className="relative text-center mb-16">
              <span className="text-[11px] uppercase tracking-widest font-bold text-[#5c0d99] bg-[#F3EBFB] border border-[#E1CFFA] px-3.5 py-1.5 rounded-full shadow-xs">
                By the numbers
              </span>
              <h2 className="mt-6 text-3xl md:text-5xl font-extrabold tracking-tight text-[#110B29]">
                Trusted by students{" "}
                <span className="text-[#6c0f8d]">
                  worldwide
                </span>
              </h2>
            </div>

            {/* stat cards */}
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
              {items.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#F8F9FC] border border-[#E3E0F0] hover:border-purple-300 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className={`h-12 w-12 rounded-xl bg-[#F3EBFB] border border-[#E8DEF8] flex items-center justify-center text-[#6c0f8d] mb-5 group-hover:bg-[#6c0f8d] group-hover:text-white transition-colors`}>
                      <Icon className="h-6 w-6" strokeWidth={2.2} />
                    </div>
                    <div className="text-4xl font-black tracking-tight text-[#6c0f8d]">
                      <Counter to={s.n} suffix={s.s} />
                    </div>
                    <div className="mt-3 text-sm font-bold text-[#110B29]">{s.label}</div>
                    <div className="mt-1.5 text-[11px] text-[#716A8C] font-medium">{s.sublabel}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}