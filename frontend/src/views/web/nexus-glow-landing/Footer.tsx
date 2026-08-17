import { useEffect } from "react";
import { useRouter, usePathname } from "expo-router";

// Module-scoped so a pending section survives the Footer remount when we
// navigate from an echo page (/echo/...) to the landing page (/welcome).
let pendingLandingSection: string | null = null;

export function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const isLanding = typeof pathname === "string" && pathname === "/welcome";

  const cols = [
    { title: "Product",   items: [
      { label: "Agent K", href: "#agent-k" },
      { label: "Mentors", href: "#features" },
      { label: "AI Roadmap", href: "#features" }
    ] },
    { title: "Company",   items: [
      { label: "About", href: "#about-us" },
      { label: "Contact", href: "#contact" },
      { label: "Partners", href: "#partners" },
      { label: "Collaborations", href: "#collaborations" }
    ] },
    { title: "Resources", items: [
      { label: "Verify Certificate", href: "/certificates/verify" },
      { label: "Blog", href: "/blogs" },
      { label: "Help center", href: "/help-center" },
      { label: "Community", href: "/community" }
    ] },
    { title: "Legal",     items: [
      { label: "Privacy", href: "/policy/privacy" },
      { label: "Terms", href: "/policy/terms" },
      { label: "Security", href: "/policy/security" },
      { label: "Cookies", href: "/policy/cookies" }
    ] },
  ];

  const goToLandingSection = (e: any, targetId: string) => {
    e.preventDefault();
    if (isLanding) {
      const elem = document.getElementById(targetId);
      if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      pendingLandingSection = targetId;
      router.push("/welcome");
    }
  };

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

  return (
    <footer className="relative border-t border-[#20073e] bg-[#070312] text-white pt-20 pb-10 z-10">
      {/* Subtle top purple glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">

          {/* Brand column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/sa-icon.png"
                alt="StudentAlumni Logo"
                className="h-8 w-8 object-contain shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]"
              />
              <span className="text-lg font-black tracking-tight text-white">
                StudentAlumni
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-[#a69cbe] max-w-xs leading-relaxed">
              The intelligent career companion built for the{" "}
              <span className="font-bold text-white">next generation</span> of students.
            </p>

            {/* Social pill badges */}
            <div className="mt-5 flex gap-2 flex-wrap">
              {["LinkedIn", "Instagram"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-white/20 bg-white/10 text-white hover:bg-white hover:text-[#070312] transition-all duration-200"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-[11px] uppercase tracking-widest font-bold text-white">
                {c.title}
              </div>
              <ul className="mt-5 space-y-3">
                {c.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      onClick={(e) => {
                        if (item.href.startsWith("#") && item.href !== "#") {
                          goToLandingSection(e, item.href.substring(1));
                        }
                      }}
                      className="text-sm font-medium text-[#a69cbe] hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-[#20073e] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-bold text-[#a69cbe] tracking-wide">
            © 2026 <span className="text-white">StudentAlumni</span>. All rights reserved.
          </p>

        </div>
      </div>
    </footer>
  );
}