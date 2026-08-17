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
    <section id="collaborations" className="relative py-32 bg-[#F8F9FC] text-[#110B29] border-b border-[#E3E0F0] z-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl text-center mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-[#5c0d99] bg-[#F3EBFB] border border-[#E1CFFA] px-3.5 py-1.5 rounded-full uppercase shadow-xs mb-6"
          >
            <HeartPulse className="w-3.5 h-3.5 text-[#6c0f8d]" />
            Loved by students
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#110B29] leading-[1.08]"
          >
            Real stories from{" "}
            <span className="text-[#6c0f8d]">
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
              className="group relative rounded-2xl border border-[#E3E0F0] bg-white p-8 shadow-[0_4px_25px_rgba(110,15,141,0.04)] hover:shadow-[0_12px_32px_rgba(110,15,141,0.1)] hover:border-purple-300 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Hover highlight background */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-[#E87A38] text-[#E87A38]" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-[#E1CFFA] group-hover:text-[#6c0f8d] transition-colors" />
                </div>
                
                <p className="text-[15px] font-medium leading-relaxed text-[#332C4A] min-h-[96px]">
                  "{r.text}"
                </p>
                
                <div className="mt-8 flex items-center gap-4 pt-6 border-t border-[#F0ECF7]">
                  <div className={`relative h-12 w-12 rounded-xl bg-[#F3EBFB] border border-[#E1CFFA] flex items-center justify-center text-[#6c0f8d] font-extrabold text-lg`}>
                    {r.name[0]}
                    {/* Active dot */}
                    <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <div className="h-2 w-2 rounded-full bg-[#6c0f8d] animate-pulse" />
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-bold tracking-tight text-[#110B29] flex items-center gap-1.5">
                      {r.name}
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#F3EBFB] text-[#6c0f8d] text-[8px] font-bold">✓</span>
                    </div>
                    <div className="text-[10px] font-bold text-[#9890B2] uppercase tracking-widest mt-1">{r.role}</div>
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