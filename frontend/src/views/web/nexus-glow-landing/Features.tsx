import { motion } from "framer-motion";
import { Bot, Users, CalendarDays, Gift, Briefcase, FileText, Map } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Agent K",
    badge: "🔥 Most Used",
    desc: "Your always-on AI career copilot. Ask anything resume tips, interview prep, salary negotiation. Agent K remembers your goals and grows with you.",
    span: "lg:col-span-2",
    num: "01",
  },
  {
    icon: Users,
    title: "Mentors",
    badge: "⭐ Top Rated",
    desc: "One-on-one sessions with alumni from Google, McKinsey, Goldman & more. Book, chat, level up.",
    span: "",
    num: "02",
  },
  {
    icon: CalendarDays,
    title: "Events",
    badge: "📅 Live Now",
    desc: "Workshops, hackathons, and industry panels curated to your track and semester.",
    span: "",
    num: "03",
  },
  {
    icon: Gift,
    title: "Student Perks",
    badge: "🎁 Exclusive Deals",
    desc: "Unlock exclusive student deals and discounts on mentorship, courses, and partner services.",
    span: "",
    num: "04",
  },
  {
    icon: Briefcase,
    title: "Career Opportunities",
    badge: "✅ Verified",
    desc: "Personalized opportunity feed sourced from partner companies and warm alumni referrals.",
    span: "",
    num: "05",
  },
  {
    icon: FileText,
    title: "Resume Polish",
    badge: "🤖 AI Powered",
    desc: "Instant AI rewrites with ATS scoring, role-specific keywords, and beautiful design templates.",
    span: "",
    num: "06",
  },
  {
    icon: Map,
    title: "Career Roadmap",
    badge: "🗺️ Personalized",
    desc: "Visual step-by-step plan from Day 1 to your first offer auto-updated as your goals evolve.",
    span: "lg:col-span-2",
    num: "07",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      {/* Dark overlay to ensure text is readable over the bright stars */}
      <div className="absolute inset-0 bg-[#0C0C0D]/40 pointer-events-none z-0" />
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        {/* heading */}
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-[12px] font-bold tracking-widest text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] uppercase"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Everything you need
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-4 text-5xl md:text-6xl font-medium tracking-tight text-white leading-[1.02]"
          >
            A complete career OS, <br />
            <span className="text-primary">built for students.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-gray-400 max-w-xl font-medium"
          >
            Everything from your first job match to your full-time offer in one intelligent platform.
          </motion.p>
        </div>

        {/* bento grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-[#121214] p-8 cursor-pointer hover:bg-[#18181B] hover:border-primary/30 transition-all duration-300 ${f.span}`}
              >
                {/* hover glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* card number */}
                <div className="absolute top-6 right-7 text-[12px] font-black text-white/5 tracking-widest select-none">
                  {f.num}
                </div>

                {/* icon */}
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300`}>
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </div>

                <h3 className="mt-6 text-2xl font-bold tracking-tight text-white group-hover:text-primary transition-colors duration-300">
                  {f.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-400 font-medium">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}