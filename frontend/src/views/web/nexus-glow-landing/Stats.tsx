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
  { n: 96, s: "%", label: "Internship Rate", sublabel: "within 6 months of joining", icon: TrendingUp },
];

export function Stats() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2.5rem] p-[1px] bg-gradient-to-b from-white/10 to-transparent"
        >
          <div className="relative rounded-[2.4rem] bg-[#121214] overflow-hidden p-10 md:p-16">
            
            {/* heading */}
            <div className="relative text-center mb-16">
              <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500">By the numbers</p>
              <h2 className="mt-4 text-3xl md:text-5xl font-medium tracking-tight text-white">
                Trusted by students{" "}
                <span className="text-primary">
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
                    className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#0C0C0D] border border-white/5 hover:border-primary/30 transition-colors duration-300 group"
                  >
                    <div className={`h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-4xl font-black tracking-tight text-white">
                      <Counter to={s.n} suffix={s.s} />
                    </div>
                    <div className="mt-3 text-sm font-bold text-gray-300">{s.label}</div>
                    <div className="mt-1.5 text-[11px] text-gray-500 font-medium">{s.sublabel}</div>
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