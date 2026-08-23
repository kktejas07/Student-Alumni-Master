import React from "react";
import { useRouter, usePathname } from "expo-router";

export function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const isLanding = typeof pathname === "string" && (pathname === "/welcome" || pathname === "/");

  const cols = [
    {
      title: "PRODUCT",
      items: [
        { label: "Agent K", route: "agentk" },
        { label: "Mentors", route: "home" },
        { label: "AI Roadmap", route: "home" },
      ],
    },
    {
      title: "COMPANY",
      items: [
        { label: "About", route: "home" },
        { label: "Contact", href: "/contact" },
        { label: "Partners", route: "partners" },
        { label: "Collaborations", route: "partners" },
      ],
    },
    {
      title: "RESOURCES",
      items: [
        { label: "Verify Certificate", href: "/verify" },
        { label: "ECHO Hub", href: "/echo" },
        { label: "Blog", href: "/welcome" },
        { label: "Community", href: "/welcome" },
      ],
    },
    {
      title: "LEGAL",
      items: [
        { label: "Privacy", href: "/policy/privacy" },
        { label: "Terms", href: "/policy/terms" },
        { label: "Security", href: "/policy/security" },
        { label: "Cookies", href: "/policy/cookies" },
      ],
    },
  ];

  const handleLinkClick = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    if (item.href) {
      router.push(item.href as any);
      return;
    }

    if (isLanding) {
      if (typeof document !== "undefined") {
        const shell = document.querySelector(".sa-scroll-shell");
        const homeSecs = document.querySelectorAll(".sa-sect, #sa-dash, #sa-road-sec");
        const agentSec = document.getElementById("sa-page-agentk");
        const partnersSec = document.getElementById("sa-page-partners");

        if (item.route === "agentk" && agentSec) {
          homeSecs.forEach((s) => ((s as HTMLElement).style.display = "none"));
          if (partnersSec) partnersSec.style.display = "none";
          agentSec.style.display = "block";
          if (shell) shell.scrollTo({ top: 0, behavior: "smooth" });
        } else if (item.route === "partners" && partnersSec) {
          homeSecs.forEach((s) => ((s as HTMLElement).style.display = "none"));
          if (agentSec) agentSec.style.display = "none";
          partnersSec.style.display = "block";
          if (shell) shell.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          homeSecs.forEach((s) => ((s as HTMLElement).style.display = ""));
          if (agentSec) agentSec.style.display = "none";
          if (partnersSec) partnersSec.style.display = "none";
          if (shell) shell.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    } else {
      router.push("/welcome");
    }
  };

  return (
    <footer
      style={{
        position: "relative",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        backgroundColor: "#05060D",
        paddingTop: "70px",
        paddingBottom: "50px",
        overflow: "hidden",
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      {/* Top subtle border glow */}
      <div
        aria-hidden
        style={{
          pointerEvents: "none",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.35), transparent)",
        }}
      />

      {/* Embedded CSS for responsive 5-column alignment */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .sa-footer-main-grid {
              display: grid;
              grid-template-columns: 2.2fr 1fr 1fr 1fr 1fr;
              gap: 32px;
              align-items: start;
            }
            @media (max-width: 1024px) {
              .sa-footer-main-grid {
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 24px;
              }
              .sa-footer-brand-col {
                grid-column: span 4 !important;
                margin-bottom: 12px;
              }
            }
            @media (max-width: 680px) {
              .sa-footer-main-grid {
                grid-template-columns: 1fr 1fr;
                gap: 24px;
              }
              .sa-footer-brand-col {
                grid-column: span 2 !important;
              }
            }
            @media (max-width: 420px) {
              .sa-footer-main-grid {
                grid-template-columns: 1fr;
                gap: 20px;
              }
              .sa-footer-brand-col {
                grid-column: span 1 !important;
              }
            }
          `,
        }}
      />

      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 24px",
          boxSizing: "border-box",
        }}
      >
        {/* Navigation Grid */}
        <div className="sa-footer-main-grid">
          {/* Brand column */}
          <div className="sa-footer-brand-col" style={{ minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg height="36" style={{ display: "block", flexShrink: 0 }} viewBox="0 0 32 36" width="32">
                <defs>
                  <linearGradient id="saFooterMainBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D8B6FF" />
                    <stop offset="45%" stopColor="#9A5CE8" />
                    <stop offset="100%" stopColor="#5B1FB0" />
                  </linearGradient>
                  <linearGradient id="saFooterInnerBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#B683F5" />
                    <stop offset="100%" stopColor="#7331C9" />
                  </linearGradient>
                </defs>
                <path
                  d="M16 2 L29 6.5 v13.5 c0 9 -7.5 13.5 -13 16 C10.5 33.5 3 29 3 20 V6.5 Z"
                  fill="url(#saFooterMainBadgeGrad)"
                />
                <path
                  d="M16 4.5 L26.5 8.2 v11.8 c0 7 -6 11 -10.5 13 C11.5 31 5.5 27 5.5 20 V8.2 Z"
                  fill="url(#saFooterInnerBadgeGrad)"
                />
                <text
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: "12px",
                    fontWeight: "800",
                    letterSpacing: "-0.5px",
                    fill: "#FFFFFF",
                  }}
                  textAnchor="middle"
                  x="16"
                  y="22.5"
                >
                  SA
                </text>
              </svg>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  letterSpacing: "-0.4px",
                  background: "linear-gradient(135deg, #FFFFFF 0%, #E8E6FF 40%, #B487FF 80%, #8B84FF 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: "'Manrope', sans-serif",
                  filter: "drop-shadow(0 2px 10px rgba(139, 132, 255, 0.35))",
                }}
              >
                StudentAlumni
              </span>
            </div>
            <p
              style={{
                marginTop: "14px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#9AA0B4",
                maxWidth: "320px",
                lineHeight: "1.6",
              }}
            >
              Built with love for students across all campuses.
              <br />
              <span style={{ color: "#8B84FF", fontWeight: 700, fontSize: "13px" }}>#studentalumni</span>
            </p>

            {/* Social Icons (Replacing pill text buttons with clean clickable SVG icons) */}
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              {/* LinkedIn Icon Button */}
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#B6BACB",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(139, 132, 255, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(139, 132, 255, 0.4)";
                  e.currentTarget.style.color = "#FFFFFF";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.color = "#B6BACB";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
              </a>

              {/* Instagram Icon Button */}
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#B6BACB",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(236, 72, 153, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.4)";
                  e.currentTarget.style.color = "#FFFFFF";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.color = "#B6BACB";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Columns */}
          {cols.map((c) => (
            <div key={c.title} style={{ minWidth: "120px" }}>
              <div
                style={{
                  fontSize: "11.5px",
                  textTransform: "uppercase",
                  letterSpacing: "1.6px",
                  fontWeight: 700,
                  color: "#8B84FF",
                  marginBottom: "16px",
                }}
              >
                {c.title}
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {c.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href || "#"}
                      onClick={(e) => handleLinkClick(e, item)}
                      style={{
                        fontSize: "14.5px",
                        fontWeight: 500,
                        color: "#B6BACB",
                        textDecoration: "none",
                        transition: "color 0.2s ease",
                        cursor: "pointer",
                        display: "inline-block",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#FFFFFF")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#B6BACB")}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Subscription Row */}
        <div
          style={{
            marginTop: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "22px",
            flexWrap: "wrap",
            border: "1px solid #2A2A55",
            borderRadius: "18px",
            background: "#0E1020",
            padding: "24px 28px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "19px", fontWeight: 700, letterSpacing: "-0.4px", color: "#F4F5FB" }}>
              One email a month. Nothing else.
            </div>
            <div style={{ fontSize: "14.5px", color: "#B6BACB", marginTop: "5px" }}>
              New openings, mentor drops and campus events — no noise.
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flex: "1 1 340px", flexWrap: "wrap" }}>
            <input
              type="email"
              placeholder="you@college.edu"
              style={{
                flex: "1 1 220px",
                minWidth: 0,
                border: "1px solid #1B1E33",
                borderRadius: "11px",
                background: "#0A0C18",
                padding: "14px 16px",
                fontSize: "14.5px",
                color: "#F4F5FB",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                const btn = e.currentTarget;
                btn.textContent = "Subscribed ✓";
                btn.style.background = "#047857";
                setTimeout(() => {
                  btn.textContent = "Subscribe";
                  btn.style.background = "#5B4FE9";
                }, 2200);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                background: "#5B4FE9",
                color: "#FFFFFF",
                fontSize: "14.5px",
                fontWeight: 600,
                padding: "14px 24px",
                borderRadius: "11px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                border: "none",
                boxShadow: "0 0 16px rgba(91,79,233,0.35)",
              }}
            >
              Subscribe
            </button>
          </div>
        </div>

        {/* Signature StudentAlumni Brand Banner */}
        <div
          style={{
            marginTop: "36px",
            paddingTop: "32px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "20px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "#D5D8E4",
                }}
              >
                <span>Built with love for students</span>
                <svg
                  style={{
                    fill: "#EC4899",
                    flex: "none",
                    filter: "drop-shadow(0 0 8px rgba(236,72,153,0.6))",
                  }}
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                >
                  <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7.6 4.6 4.6 0 0 1 20 10.6C20 16.1 12 21 12 21Z" />
                </svg>
                <span>across all campus’s</span>
              </div>
              <div style={{ marginTop: "6px" }}>
                <span
                  style={{
                    fontSize: "44px",
                    fontWeight: 800,
                    letterSpacing: "-1.2px",
                    background: "linear-gradient(135deg, #F5D0FE 0%, #C084FC 25%, #818CF8 50%, #38BDF8 75%, #E879F9 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    display: "inline-block",
                    filter: "drop-shadow(0 4px 20px rgba(192, 132, 252, 0.45))",
                  }}
                >
                  #studentalumni
                </span>
              </div>
            </div>
            <div style={{ fontSize: "13.5px", color: "#9AA0B4", fontWeight: 500 }}>
              All rights reserved © StudentAlumni 2026
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}