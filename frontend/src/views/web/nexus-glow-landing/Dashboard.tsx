import { motion } from "framer-motion";
import { Sparkles, TrendingUp, CheckCircle2, Navigation } from "lucide-react-native";

export function Dashboard() {
  return (
    <section id="about-us" className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-[12px] font-bold tracking-widest text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] uppercase mb-6"
          >
            <Navigation className="w-3.5 h-3.5 text-primary" />
            Your Command Center
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl font-medium tracking-tight text-white leading-[1.05]"
          >
            One dashboard,
            <br />
            <span className="text-primary">infinite momentum.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto font-medium"
          >
            Track every application, mentor session, and milestone in a beautifully quiet, deeply intelligent interface.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 15 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformPerspective: 2000 }}
          className="relative mx-auto max-w-5xl group"
        >
          {/* Mockup Container */}
          <div className="relative rounded-2xl border border-white/10 bg-[#0C0C0D] shadow-2xl overflow-hidden transition-transform duration-700 hover:scale-[1.02]">
            
            {/* macOS style Window Bar */}
            <div className="flex items-center justify-between border-b border-white/5 bg-[#121214] px-6 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-white/10" />
                <div className="h-3 w-3 rounded-full bg-white/10" />
                <div className="h-3 w-3 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1.5 rounded-md bg-white/5 text-[10px] font-bold text-gray-500 tracking-wide flex items-center gap-2 border border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  studentalumni.ai / overview
                </div>
              </div>
              <div className="w-[54px]"></div> {/* Spacer for balance */}
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8 bg-[#0C0C0D]">
              
              {/* Sidebar */}
              <div className="hidden md:flex flex-col col-span-3 rounded-xl bg-[#121214] border border-white/5 p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 px-2">Menu</div>
                <div className="space-y-1">
                  {["Overview", "Agent K", "Mentors", "AI Roadmap"].map((m, i) => (
                    <div
                      key={m}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                        i === 0 
                          ? "bg-white/10 text-white" 
                          : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-primary shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-current opacity-40"}`} />
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="col-span-1 md:col-span-9 flex flex-col gap-6">
                
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Active Applications", val: "12", trend: "+3 this week", color: "text-white" },
                    { label: "Mentor Hours", val: "8.5h", trend: "+2h vs last mo", color: "text-white" },
                    { label: "Skill Badges", val: "2,450", trend: "Unlock Premium", color: "text-primary" },
                  ].map((s, i) => (
                    <div key={s.label} className="rounded-xl border border-white/5 bg-[#121214] p-5 hover:bg-[#18181B] hover:border-white/10 transition-colors">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{s.label}</div>
                      <div className="flex items-end justify-between">
                        <div className={`text-3xl font-black tracking-tight ${s.color}`}>{s.val}</div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                          <TrendingUp className="h-3 w-3" />
                          {s.trend}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agent K Priority Panel */}
                <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-6 overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Sparkles className="w-24 h-24 text-primary" />
                  </div>
                  
                  <div className="relative z-10 flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Agent K Priorities</h3>
                      <p className="text-xs font-semibold text-primary">Curated for you today</p>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-3">
                    {[
                      { text: "Refine your resume for the Google SWE referral drop.", type: "urgent" },
                      { text: "Prep 3 questions for tomorrow's mentor call with Sarah.", type: "task" },
                      { text: "Apply to 2 matched career opportunities closing this Friday.", type: "task" },
                    ].map((t, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-lg bg-[#121214] border border-white/5 p-4 hover:border-white/10 transition-colors cursor-pointer">
                        <CheckCircle2 className={`h-5 w-5 mt-0.5 ${t.type === 'urgent' ? 'text-primary' : 'text-gray-500'}`} />
                        <span className="text-sm font-semibold text-gray-300 leading-relaxed">{t.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Roadmap Progress */}
                <div className="rounded-xl border border-white/5 bg-[#121214] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-white">Career Roadmap</span>
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Year 3 · Sem 1</span>
                  </div>
                  
                  <div className="relative h-2 w-full rounded-full bg-[#18181B] overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      whileInView={{ width: "65%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-primary rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    >
                    </motion.div>
                  </div>
                  
                  <div className="mt-4 flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <span>Foundations</span>
                    <span className="text-primary">Opportunities</span>
                    <span>Full-time</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}