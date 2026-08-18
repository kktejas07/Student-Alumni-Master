import { motion } from "framer-motion";
import { ArrowUpRight, Zap } from "lucide-react";
import { useRouter } from "expo-router";

export function CTA() {
  const router = useRouter();

  return (
    <section id="contact" className="relative py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-[#0C0C0D] border border-white/10 p-12 md:p-24 shadow-2xl"
        >
          {/* Subtle glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] bg-[length:24px_24px]" />

          <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 text-[12px] font-bold tracking-widest text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] uppercase mb-8"
            >
              <Zap className="w-4 h-4 text-primary" />
              Start Your Journey
            </motion.div>

            <h2 className="text-5xl md:text-7xl font-medium tracking-tight leading-[1.05] text-white">
              Your career, quietly
              <br />
              <span className="text-primary">
                upgraded.
              </span>
            </h2>
            
            <p className="mt-8 text-xl font-medium text-gray-400 max-w-2xl leading-relaxed">
              Join 50,000+ students already using StudentAlumni to land career opportunities, find mentors, and build their future. No credit card required.
            </p>
            
            <div className="mt-12 flex justify-center w-full">
              <button 
                onClick={() => router.push('/get-started')}
                className="group relative inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-8 py-4 text-base font-bold transition-all hover:scale-105 hover:bg-primary/90 w-full sm:w-auto overflow-hidden cursor-pointer"
              >
                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                <span className="relative">Create your free account</span>
                <ArrowUpRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
            </div>
            
            <p className="mt-8 text-[12px] font-bold text-gray-500 uppercase tracking-widest">
              Takes less than 60 seconds to set up
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}