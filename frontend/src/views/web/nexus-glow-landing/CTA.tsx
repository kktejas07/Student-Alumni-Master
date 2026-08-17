import { motion } from "framer-motion";
import { ArrowUpRight, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";

export function CTA() {
  const router = useRouter();

  return (
    <section id="contact" className="relative py-32 px-6 bg-[#06030e] text-white z-10">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#120829] via-[#1a0b3b] to-[#0c051d] border border-purple-500/30 p-12 md:p-24 shadow-[0_20px_80px_rgba(124,58,237,0.25)]"
        >
          {/* Subtle purple glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent pointer-events-none" />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.04] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] bg-[length:24px_24px]" />

          <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-purple-300 bg-purple-500/20 border border-purple-400/30 px-3.5 py-1.5 rounded-full uppercase mb-8 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              Start Your Journey
            </motion.div>

            <h2 className="text-4xl md:text-7xl font-extrabold tracking-tight leading-[1.08] text-white">
              Your career, quietly
              <br />
              <span className="text-purple-400">
                upgraded.
              </span>
            </h2>
            
            <p className="mt-8 text-lg md:text-xl font-medium text-purple-100/80 max-w-2xl leading-relaxed">
              Join 50,000+ students already using StudentAlumni to land career opportunities, find mentors, and build their future. No credit card required.
            </p>
            
            <div className="mt-12 flex justify-center w-full">
              <button 
                onClick={() => router.push('/get-started')}
                className="group relative inline-flex items-center justify-center gap-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 text-base font-bold transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(124,58,237,0.6)] border border-purple-400/40 w-full sm:w-auto overflow-hidden cursor-pointer"
              >
                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                <span className="relative">Create your free account</span>
                <ArrowUpRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
            </div>
            
            <p className="mt-8 text-[12px] font-bold text-purple-300/60 uppercase tracking-widest">
              Takes less than 60 seconds to set up
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}