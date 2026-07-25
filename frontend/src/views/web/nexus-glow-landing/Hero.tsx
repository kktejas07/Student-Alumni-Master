import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { AgentK3D } from "./AgentK3D";

export function Hero() {
  const router = useRouter();

  return (
    <section id="agent-k" className="relative overflow-hidden pt-40 pb-24 md:pt-48 md:pb-32 flex flex-col items-center">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left Column: Text */}
        <div className="w-full flex flex-col items-center text-center lg:items-start lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 text-[12px] font-bold tracking-widest text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] uppercase mb-8"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            AI Career Platform for Students
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.05] text-white"
          >
            Your Intelligent <br />
            <span className="text-primary">Companion</span> for a <br />
            Modern Career
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25 }}
            className="mt-6 text-lg md:text-xl text-gray-300 leading-relaxed font-medium"
          >
            Meet Agent K your always-on career copilot. Connect with mentors,
            discover events and internships, polish your resume, and follow a
            personalized roadmap built for the way students actually work today.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4"
          >
            <button
              onClick={() => router.push('/get-started')}
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-sm font-bold text-primary-foreground transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer"
            >
              Start now
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </button>
          </motion.div>
        </div>

        {/* Right Column: Agent K */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="w-full relative mt-16 lg:mt-0"
        >
          <div className="relative h-[400px] w-full md:h-[600px] block">
            {/* Green glow behind Agent K */}
            <motion.div
              aria-hidden
              className="absolute inset-0 rounded-full bg-primary/20 blur-[100px] -z-10"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <AgentK3D />
          </div>
        </motion.div>

      </div>
    </section>
  );
}