import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { AgentK3D } from "./AgentK3D";
import { useBreakpoint } from "@/src/theme/breakpoints";

export function Hero() {
  const router = useRouter();
  const { atLeast } = useBreakpoint();
  const isLargeScreen = atLeast("lg");
  const isMediumScreen = atLeast("md");

  const paddingTop = isLargeScreen ? 160 : isMediumScreen ? 140 : 120;
  const paddingBottom = isLargeScreen ? 120 : isMediumScreen ? 100 : 80;

  return (
    <section
      id="hero"
      className="relative overflow-hidden flex flex-col items-center justify-center"
      style={{ paddingTop, paddingBottom }}
    >
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10 w-full">

        {/* Left Side: Headline, Subheading & CTAs */}
        <div className="w-full flex flex-col items-center text-center lg:items-start lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase mb-8 text-purple-300 bg-purple-500/20 border border-purple-400/30 px-4 py-1.5 rounded-full shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>AI Career Platform for Students</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-white"
          >
            Your Intelligent <br />
            <span className="font-extrabold text-purple-400">Companion</span> for a <br />
            Modern Career
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25 }}
            className="mt-6 text-base md:text-xl text-purple-100/80 leading-relaxed font-medium max-w-xl"
          >
            Meet Agent K your always-on career copilot. Connect with mentors, discover events and career opportunities, polish your resume, and follow a personalized roadmap built for the way students actually work today.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4"
          >
            <button
              onClick={() => router.push('/get-started')}
              className="group inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-white transition-all duration-300 hover:scale-105 cursor-pointer"
              style={{
                backgroundColor: "#7c3aed",
                boxShadow: "0 0 25px rgba(124, 58, 237, 0.5)",
                border: "1px solid rgba(167, 139, 250, 0.4)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#6d28d9";
                e.currentTarget.style.boxShadow = "0 0 35px rgba(124, 58, 237, 0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#7c3aed";
                e.currentTarget.style.boxShadow = "0 0 25px rgba(124, 58, 237, 0.5)";
              }}
            >
              <span>Start now</span>
              <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </button>
          </motion.div>
        </div>

        {/* Right Side: Animated 3D Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="w-full relative flex items-center justify-center mt-12 lg:mt-0"
        >
          <div className="relative w-full h-[340px] md:h-[500px] flex items-center justify-center">
            <AgentK3D />
          </div>
        </motion.div>

      </div>
    </section>
  );
}