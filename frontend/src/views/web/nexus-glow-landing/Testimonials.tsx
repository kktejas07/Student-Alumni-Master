import { motion } from "framer-motion";
import { Star, Quote, HeartPulse } from "lucide-react-native";

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
    <section id="collaborations" className="relative py-32 bg-white text-slate-900 border-b border-slate-200/60 z-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl text-center mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-purple-700 bg-purple-100/80 border border-purple-200/80 px-3.5 py-1.5 rounded-full uppercase shadow-xs mb-6"
          >
            <HeartPulse className="w-3.5 h-3.5 text-purple-600" />
            Loved by students
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.08]"
          >
            Real stories from{" "}
            <span className="text-purple-600">
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
              whileHover={{ y: -6, scale: 1.01 }}
              className="group relative rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_4px_20px_rgba(124,58,237,0.04)] hover:shadow-[0_12px_32px_rgba(124,58,237,0.1)] hover:border-purple-300 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Hover highlight background */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-purple-600 text-purple-600" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-purple-200/60 group-hover:text-purple-400 transition-colors" />
                </div>
                
                <p className="text-[15px] font-medium leading-relaxed text-slate-700 min-h-[96px]">
                  "{r.text}"
                </p>
                
                <div className="mt-8 flex items-center gap-4 pt-6 border-t border-slate-100">
                  <div className={`relative h-12 w-12 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-700 font-extrabold text-lg`}>
                    {r.name[0]}
                    {/* Active dot */}
                    <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <div className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                      {r.name}
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[8px] font-bold">✓</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{r.role}</div>
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