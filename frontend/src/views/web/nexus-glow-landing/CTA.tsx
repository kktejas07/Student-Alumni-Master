import { motion } from "framer-motion";
import { ArrowUpRight, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";

export function CTA() {
  const router = useRouter();

  return (
    <section id="contact" className="relative py-32 px-6 bg-gradient-to-r from-[#200542] via-[#430b78] to-[#7a0f9b] text-white z-10">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-white/10 border border-white/20 p-12 md:p-24 shadow-[0_20px_80px_rgba(0,0,0,0.3)] backdrop-blur-md"
        >
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.05] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] bg-[length:24px_24px]" />

          <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-white bg-white/10 border border-white/20 px-4 py-1.5 rounded-full uppercase mb-8 shadow-sm backdrop-blur-md"
            >
              <Zap className="w-3.5 h-3.5 text-purple-200" />
              Start Your Journey
            </motion.div>

            <h2 className="text-4xl md:text-7xl font-extrabold tracking-tight leading-[1.08] text-white">
              Your career, quietly
              <br />
              <span className="text-white">
                upgraded.
              </span>
            </h2>
            
            <p className="mt-8 text-lg md:text-xl font-medium text-purple-100/90 max-w-2xl leading-relaxed">
              Join 50,000+ students already using StudentAlumni to land career opportunities, find mentors, and build their future. No credit card required.
            </p>
            
            <div className="mt-12 flex justify-center w-full">
              <button 
                onClick={() => router.push('/get-started')}
                className="group relative inline-flex items-center justify-center gap-2.5 rounded-full bg-white hover:bg-purple-50 text-[#3d096b] px-8 py-4 text-base font-extrabold transition-all duration-300 hover:scale-105 shadow-[0_10px_35px_rgba(0,0,0,0.3)] w-full sm:w-auto overflow-hidden cursor-pointer"
              >
                <span className="relative">Create your free account</span>
                <ArrowUpRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
            </div>
            
            <p className="mt-8 text-[12px] font-bold text-purple-200/70 uppercase tracking-widest">
              Takes less than 60 seconds to set up
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}