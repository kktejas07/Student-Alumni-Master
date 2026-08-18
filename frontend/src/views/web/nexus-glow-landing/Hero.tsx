import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useRouter } from "expo-router";
import { AgentK3D } from "./AgentK3D";
import { useBreakpoint } from "@/src/theme/breakpoints";

export function Hero() {
  const router = useRouter();
  const { atLeast } = useBreakpoint();
  const isLargeScreen = atLeast("lg");
  const isMediumScreen = atLeast("md");

  const paddingTop = isLargeScreen ? 160 : isMediumScreen ? 140 : 120;
  const paddingBottom = isLargeScreen ? 100 : isMediumScreen ? 80 : 60;

  return (
    <section
      id="hero"
      className="relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-r from-[#200542] via-[#3d096b] to-[#7a0f9b] text-white"
      style={{ paddingTop, paddingBottom }}
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-400/20 via-transparent to-transparent pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10 w-full">

        {/* Left Side: Headline, Subheading & CTAs */}
        <div className="w-full flex flex-col items-center text-center lg:items-start lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase mb-8 text-white bg-white/10 border border-white/20 px-4 py-1.5 rounded-full backdrop-blur-md shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-200" />
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
            className="mt-6 text-base md:text-xl text-purple-100/90 leading-relaxed font-medium max-w-xl"
          >
            Meet Agent K — your always-on career copilot. Connect with mentors, discover events and career opportunities, polish your resume, and follow a personalized roadmap built for the way students actually work today.
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
              className="group inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-extrabold text-[#3d096b] bg-white hover:bg-purple-50 transition-all duration-300 hover:scale-105 shadow-[0_8px_30px_rgba(0,0,0,0.25)] cursor-pointer"
            >
              <span>Get started</span>
              <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </button>
            <button
              onClick={() => router.push('/(auth)/login')}
              className="group inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white bg-white/10 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-md"
            >
              <span>Sign in</span>
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