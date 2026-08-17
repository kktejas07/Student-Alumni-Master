import { motion } from "framer-motion";
import { Bot, Users, CalendarDays, Gift, Briefcase, FileText, Map } from "lucide-react-native";

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
    <section id="features" className="relative py-32 bg-[#F8F9FC] border-b border-[#E3E0F0] text-[#110B29] z-10">
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        {/* heading */}
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-[#5c0d99] bg-[#F3EBFB] border border-[#E1CFFA] px-3.5 py-1.5 rounded-full uppercase shadow-xs"
          >
            <span className="h-2 w-2 rounded-full bg-[#6c0f8d] animate-pulse" />
            Everything you need
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight text-[#110B29] leading-[1.08]"
          >
            A complete career OS, <br />
            <span className="text-[#6c0f8d]">built for students.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-[#504A6B] max-w-xl font-medium leading-relaxed"
          >
            Everything from your first job match to your full-time offer in one intelligent platform.
          </motion.p>
        </div>

        {/* bento grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative overflow-hidden rounded-2xl border border-[#E3E0F0] bg-white p-8 cursor-pointer shadow-[0_4px_25px_rgba(110,15,141,0.04)] hover:shadow-[0_12px_32px_rgba(110,15,141,0.1)] hover:border-purple-300 transition-all duration-300 ${f.span}`}
              >
                {/* hover glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* card number */}
                <div className="absolute top-6 right-7 text-[12px] font-black text-[#A19BB8] tracking-widest select-none">
                  {f.num}
                </div>

                {/* icon */}
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3EBFB] border border-[#E8DEF8] text-[#6c0f8d] shadow-sm group-hover:bg-[#6c0f8d] group-hover:text-white transition-all duration-300`}>
                  <Icon className="h-6 w-6" strokeWidth={2.2} />
                </div>

                <h3 className="mt-6 text-2xl font-bold tracking-tight text-[#110B29] group-hover:text-[#6c0f8d] transition-colors duration-300">
                  {f.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#504A6B] font-medium">
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