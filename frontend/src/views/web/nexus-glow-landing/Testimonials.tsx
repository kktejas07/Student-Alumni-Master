import { motion } from "framer-motion";
import { Star, Quote, HeartPulse } from "lucide-react";

const reviews = [
  {
    name: "Ananya Sharma",
    role: "CS Junior · IIT Bombay",
    text: "Agent K rewrote my resume the night before a Google referral deadline. I got the interview. Nothing else has felt this personal.",
  },
  {
    name: "Marcus Lee",
    role: "Business Sophomore · NYU",
    text: "The mentor matching is unreal. My mentor at McKinsey walked me through case prep for 6 weeks I converted the offer.",
  },
  {
    name: "Sofia Rossi",
    role: "Design Senior · RISD",
    text: "Every event is genuinely curated. No spam, no fluff. StudentAlumni feels like the anti-LinkedIn quieter and much more useful.",
  },
  {
    name: "Rohan Patel",
    role: "ECE Freshman · Berkeley",
    text: "The roadmap gave me a plan for the next 4 years in about 20 minutes. I finally know what to focus on this semester.",
  },
  {
    name: "Zoe Chen",
    role: "Bio Junior · Stanford",
    text: "Unlocking premium sessions through active participation feels rewarding. I've joined 3 mentor sessions I could never afford otherwise.",
  },
  {
    name: "Daniel Okafor",
    role: "MBA · Harvard",
    text: "The career feed found me 4 strong matches in a week that I hadn't seen on any job board. The referrals through alumni sealed it.",
  },
];

export function Testimonials() {
  return (
    <section id="collaborations" className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl text-center mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-[12px] font-bold tracking-widest text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] uppercase mb-6"
          >
            <HeartPulse className="w-3.5 h-3.5 text-primary" />
            Loved by students
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-medium tracking-tight text-white leading-[1.05]"
          >
            Real stories from{" "}
            <span className="text-primary">
              real careers.
            </span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <motion.article
              key={r.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative rounded-2xl border border-white/5 bg-[#0C0C0D] p-8 hover:bg-[#121214] hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Hover highlight background */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-primary/50 text-primary/50 group-hover:fill-primary group-hover:text-primary transition-colors" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-white/5 group-hover:text-primary/20 transition-colors" />
                </div>
                
                <p className="text-[15px] font-medium leading-relaxed text-gray-300 min-h-[96px]">
                  "{r.text}"
                </p>
                
                <div className="mt-8 flex items-center gap-4 pt-6 border-t border-white/10">
                  <div className={`relative h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg border border-primary/20`}>
                    {r.name[0]}
                    {/* Active dot */}
                    <div className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#0C0C0D] flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                      {r.name}
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/10 text-primary text-[8px] font-bold">✓</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{r.role}</div>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}