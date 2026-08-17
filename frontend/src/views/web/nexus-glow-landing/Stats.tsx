import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { TrendingUp, Users, Building2, Award } from "lucide-react-native";

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
    <section className="relative py-24 bg-slate-50 border-b border-slate-200/60 z-10">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2.5rem] p-[1px] bg-slate-200/80 shadow-[0_10px_30px_rgba(124,58,237,0.06)]"
        >
          <div className="relative rounded-[2.4rem] bg-white overflow-hidden p-10 md:p-16">
            
            {/* heading */}
            <div className="relative text-center mb-16">
              <span className="text-[11px] uppercase tracking-widest font-bold text-purple-700 bg-purple-100/80 border border-purple-200/80 px-3.5 py-1.5 rounded-full shadow-xs">
                By the numbers
              </span>
              <h2 className="mt-6 text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                Trusted by students{" "}
                <span className="text-purple-600">
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
                    className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className={`h-12 w-12 rounded-xl bg-purple-100/80 border border-purple-200/60 flex items-center justify-center text-purple-600 mb-5 group-hover:bg-purple-600 group-hover:text-white transition-colors`}>
                      <Icon className="h-6 w-6" strokeWidth={2.2} />
                    </div>
                    <div className="text-4xl font-extrabold tracking-tight text-purple-700">
                      <Counter to={s.n} suffix={s.s} />
                    </div>
                    <div className="mt-3 text-sm font-bold text-slate-900">{s.label}</div>
                    <div className="mt-1.5 text-[11px] text-slate-500 font-medium">{s.sublabel}</div>
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