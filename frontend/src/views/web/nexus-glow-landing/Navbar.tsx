import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "expo-router";
import { Menu, X } from "lucide-react-native";
import { SALogo } from "@/src/views/components";
import { useBreakpoint } from "@/src/theme/breakpoints";

// Module-scoped so a pending section survives the Navbar remount when we
// navigate from an echo page (/echo/...) to the landing page (/welcome).
let pendingLandingSection: string | null = null;

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("Agent K");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { atLeast, width } = useBreakpoint();
  const isLargeScreen = atLeast("lg");
  // The app scrolls inside a container (body has overflow:hidden), not the
  // window, so framer-motion's useScroll() never fires. A capture-phase
  // listener catches scroll events from ANY scroll container on the page.
  useEffect(() => {
    const onScroll = (e: Event) => {
      const target = e.target as any;
      const top =
        target && typeof target.scrollTop === "number"
          ? target.scrollTop
          : window.scrollY || document.documentElement.scrollTop || 0;
      setScrolled(top > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true } as any);
  }, []);
  const isEcho = typeof pathname === "string" && pathname.startsWith("/echo");
  const isLanding = typeof pathname === "string" && pathname === "/welcome";

  const links = ["Agent K", "Features", "About Us", "Contact", "Partners", "Collaborations"];

  // After navigating from an echo page to the landing page, scroll to the
  // requested section once it has rendered.
  useEffect(() => {
    if (!isLanding || !pendingLandingSection) return;
    const id = pendingLandingSection;
    pendingLandingSection = null;
    const raf = requestAnimationFrame(() => {
      const elem = document.getElementById(id);
      if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [isLanding]);

  const goToLandingSection = (e: any, targetId: string) => {
    e.preventDefault();
    setActive(e.currentTarget?.textContent || "Features");
    setMobileOpen(false);
    if (isLanding) {
      const elem = document.getElementById(targetId);
      if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      pendingLandingSection = targetId;
      router.push("/welcome");
    }
  };

  const handleLogoClick = (e: any) => {
    e.preventDefault();
    setMobileOpen(false);
    router.push('/welcome');
  };

  const goToEcho = (e: any) => {
    e.preventDefault();
    setMobileOpen(false);
    router.push('/echo');
  };

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled || mobileOpen
          ? "py-2 bg-[#0C0C0D]/95 backdrop-blur-md border-b border-white/10 shadow-2xl"
          : "py-4 bg-transparent border-b border-transparent"
        }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className={`flex items-center justify-between transition-all duration-500 ${scrolled ? "px-4 sm:px-5 py-2.5" : "px-4 sm:px-5 py-3"
            }`}
        >
          {/* Logo */}
          <a
            href="/welcome"
            onClick={handleLogoClick}
            className="flex items-center gap-3 cursor-pointer"
          >
            <SALogo size={32} variant="gradient" />
            <span className="text-sm font-bold tracking-wide text-white">
              StudentAlumni
            </span>
          </a>

          {/* Nav links (desktop only) */}
          {isLargeScreen && (
            <nav className="flex items-center gap-1 bg-[#121214] border border-white/5 rounded-full px-2 py-1.5">
              <a
                href="/echo"
                onClick={goToEcho}
                className={`relative px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors duration-200 cursor-pointer ${
                  isEcho
                    ? "text-white bg-white/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                ECHO
              </a>
              {links.map((l) => {
                const isActive = active === l;
                const targetId = l.toLowerCase().replace(" ", "-");
                return (
                  <a
                    key={l}
                    href={isLanding ? `#${targetId}` : `/welcome#${targetId}`}
                    onClick={(e) => goToLandingSection(e, targetId)}
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
          )}

          {/* CTA buttons */}
          <div className="flex items-center gap-2 sm:gap-4">
            {width >= 420 && (
              <button
                onClick={() => router.push('/(auth)/login')}
                className="text-xs font-semibold text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
              >
                Sign in
              </button>
            )}
            <button
              onClick={() => { setMobileOpen(false); router.push('/get-started'); }}
              className="group relative overflow-hidden rounded-full bg-primary px-4 sm:px-5 py-2 text-xs font-bold text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] cursor-pointer"
            >
              Get Started
            </button>
            {/* Hamburger (tablet + mobile) */}
            {!isLargeScreen && (
              <button
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Toggle menu"
                className="flex items-center justify-center w-10 h-10 rounded-lg text-white bg-[#121214] border border-white/10 cursor-pointer"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden overflow-hidden bg-[#0C0C0D] border-b border-white/10"
          >
            <div className="px-6 pt-8 pb-6 flex flex-col gap-1">
              <a
                href="/echo"
                onClick={goToEcho}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  isEcho ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                ECHO
              </a>
              {links.map((l) => {
                const targetId = l.toLowerCase().replace(" ", "-");
                return (
                  <a
                    key={l}
                    href={isLanding ? `#${targetId}` : `/welcome#${targetId}`}
                    onClick={(e) => goToLandingSection(e, targetId)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                      active === l ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {l}
                  </a>
                );
              })}
              <div className="h-px bg-white/10 my-2" />
              <button
                onClick={() => { setMobileOpen(false); router.push('/(auth)/login'); }}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 text-left cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}