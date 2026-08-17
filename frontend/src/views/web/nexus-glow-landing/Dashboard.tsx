import { motion } from "framer-motion";
import { Sparkles, TrendingUp, CheckCircle2, Navigation } from "lucide-react-native";

export function Dashboard() {
  return (
    <section id="about-us" className="relative py-32 bg-white text-slate-900 z-10 border-b border-slate-200/60">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-purple-700 bg-purple-100/80 border border-purple-200/80 px-3.5 py-1.5 rounded-full uppercase shadow-xs mb-6"
          >
            <Navigation className="w-3.5 h-3.5 text-purple-600" />
            Your Command Center
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08]"
          >
            One dashboard,
            <br />
            <span className="text-purple-600">infinite momentum.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Track every application, mentor session, and milestone in a beautifully quiet, deeply intelligent interface.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 12 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformPerspective: 2000 }}
          className="relative mx-auto max-w-5xl group"
        >
          {/* Mockup Container */}
          <div className="relative rounded-2xl border border-slate-200 bg-slate-50/90 shadow-[0_20px_60px_rgba(124,58,237,0.12)] overflow-hidden transition-transform duration-700 hover:scale-[1.01]">
            
            {/* macOS style Window Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-slate-200" />
                <div className="h-3 w-3 rounded-full bg-slate-200" />
                <div className="h-3 w-3 rounded-full bg-slate-200" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1.5 rounded-md bg-purple-50 text-[10px] font-bold text-purple-700 tracking-wide flex items-center gap-2 border border-purple-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
                  studentalumni.ai / overview
                </div>
              </div>
              <div className="w-[54px]"></div>
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8 bg-slate-50/90">
              
              {/* Sidebar */}
              <div className="hidden md:flex flex-col col-span-3 rounded-xl bg-white border border-slate-200/80 p-4 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 px-2">Menu</div>
                <div className="space-y-1">
                  {["Overview", "Agent K", "Mentors", "AI Roadmap"].map((m, i) => (
                    <div
                      key={m}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                        i === 0 
                          ? "bg-purple-50 text-purple-700 border border-purple-100" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-purple-600" : "bg-slate-300"}`} />
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
                    { label: "Active Applications", val: "12", trend: "+3 this week", color: "text-slate-900" },
                    { label: "Mentor Hours", val: "8.5h", trend: "+2h vs last mo", color: "text-slate-900" },
                    { label: "Skill Badges", val: "2,450", trend: "Unlock Premium", color: "text-purple-600" },
                  ].map((s, i) => (
                    <div key={s.label} className="rounded-xl border border-slate-200/80 bg-white p-5 hover:border-purple-200 transition-all shadow-xs">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{s.label}</div>
                      <div className="flex items-end justify-between">
                        <div className={`text-3xl font-extrabold tracking-tight ${s.color}`}>{s.val}</div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-1 rounded-md">
                          <TrendingUp className="h-3 w-3 text-purple-600" />
                          {s.trend}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agent K Priority Panel */}
                <div className="relative rounded-xl border border-purple-200 bg-purple-50/50 p-6 overflow-hidden shadow-xs">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles className="w-24 h-24 text-purple-600" />
                  </div>
                  
                  <div className="relative z-10 flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Agent K Priorities</h3>
                      <p className="text-xs font-semibold text-purple-700">Curated for you today</p>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-3">
                    {[
                      { text: "Refine your resume for the Google SWE referral drop.", type: "urgent" },
                      { text: "Prep 3 questions for tomorrow's mentor call with Sarah.", type: "task" },
                      { text: "Apply to 2 matched career opportunities closing this Friday.", type: "task" },
                    ].map((t, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-lg bg-white border border-slate-200/80 p-4 hover:border-purple-300 transition-colors cursor-pointer shadow-xs">
                        <CheckCircle2 className={`h-5 w-5 mt-0.5 ${t.type === 'urgent' ? 'text-purple-600' : 'text-slate-400'}`} />
                        <span className="text-sm font-semibold text-slate-700 leading-relaxed">{t.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Roadmap Progress */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-900">Career Roadmap</span>
                    <span className="px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-[10px] font-bold uppercase tracking-widest text-purple-700">Year 3 · Sem 1</span>
                  </div>
                  
                  <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      whileInView={{ width: "65%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-purple-600 rounded-full"
                    >
                    </motion.div>
                  </div>
                  
                  <div className="mt-4 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Foundations</span>
                    <span className="text-purple-600 font-extrabold">Opportunities</span>
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