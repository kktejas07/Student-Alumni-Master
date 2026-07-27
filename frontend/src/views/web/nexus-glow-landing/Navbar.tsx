import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { useRouter } from "expo-router";

export function Navbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("Agent K");
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 20));

  const links = ["Agent K", "Features", "About Us", "Contact", "Partners", "Collaborations"];

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-2" : "py-4"
        }`}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div
          className={`flex items-center justify-between rounded-full border transition-all duration-500 ${scrolled
              ? "border-white/10 bg-[#0C0C0D]/80 backdrop-blur-md px-5 py-2.5 shadow-2xl"
              : "border-transparent bg-transparent px-5 py-3"
            }`}
        >
          {/* Logo */}
          <a href="#" className="flex items-center gap-3">
            <img
              src="/sa-icon.png"
              alt="StudentAlumni Logo"
              className="h-8 w-8 rounded-lg object-contain shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
            />
            <span className="text-sm font-bold tracking-wide text-white">
              StudentAlumni
            </span>
          </a>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#121214] border border-white/5 rounded-full px-2 py-1.5">
            {links.map((l) => {
              const isActive = active === l;
              const targetId = l.toLowerCase().replace(" ", "-");
              return (
                <a
                  key={l}
                  href={`#${targetId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActive(l);
                    const elem = document.getElementById(targetId);
                    if (elem) {
                      elem.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className={`relative px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors duration-200 cursor-pointer
                    ${isActive
                      ? "text-white bg-white/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  {l}
                </a>
              );
            })}
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/(auth)/login')}
              className="hidden sm:inline-flex text-xs font-semibold text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={() => router.push('/get-started')}
              className="group relative overflow-hidden rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}