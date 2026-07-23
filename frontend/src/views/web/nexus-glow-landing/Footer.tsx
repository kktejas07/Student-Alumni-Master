export function Footer() {
  const cols = [
    { title: "Product",   items: ["Agent K", "Mentors", "AI Roadmap"] },
    { title: "Company",   items: ["About", "Contact", "Partners", "Collaborations"] },
    { title: "Resources", items: ["Blog", "Help center", "Community"] },
    { title: "Legal",     items: ["Privacy", "Terms", "Security", "Cookies"] },
  ];

  return (
    <footer className="relative border-t border-white/5 bg-[#0C0C0D] pt-20 pb-10">
      {/* Subtle top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">

          {/* Brand column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/sa-icon.png"
                alt="StudentAlumni Logo"
                className="h-8 w-8 rounded-lg object-contain shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
              />
              <span className="text-lg font-black tracking-tight text-white">
                StudentAlumni
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-gray-200 max-w-xs leading-relaxed">
              The intelligent career companion built for the{" "}
              <span className="font-bold text-white">next generation</span> of students.
            </p>

            {/* Social pill badges */}
            <div className="mt-5 flex gap-2 flex-wrap">
              {["LinkedIn", "Instagram"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-white/5 bg-[#121214] text-gray-300 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-[11px] uppercase tracking-widest font-bold text-gray-300">
                {c.title}
              </div>
              <ul className="mt-5 space-y-3">
                {c.items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm font-medium text-gray-200 hover:text-primary hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-bold text-gray-300 tracking-wide">
            © 2026 <span className="text-white">StudentAlumni</span>. All rights reserved.
          </p>

        </div>
      </div>
    </footer>
  );
}