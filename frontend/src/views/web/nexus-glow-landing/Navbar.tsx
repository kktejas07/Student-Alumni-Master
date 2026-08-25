import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "expo-router";
import { Menu, X } from "lucide-react-native";
import { useBreakpoint } from "@/src/theme/breakpoints";
import { useAuthStore } from "@/src/viewmodels/stores/authStore";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!user;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { atLeast, width } = useBreakpoint();
  const isLargeScreen = atLeast("lg");

  useEffect(() => {
    const onScroll = (e: Event) => {
      const target = e.target as any;
      const top =
        target && typeof target.scrollTop === "number"
          ? target.scrollTop
          : (typeof window !== "undefined" ? window.scrollY || document.documentElement.scrollTop || 0 : 0);
      setScrolled(top > 20);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", onScroll, { passive: true, capture: true });
      return () => window.removeEventListener("scroll", onScroll, { capture: true } as any);
    }
  }, []);

  const isEcho = typeof pathname === "string" && pathname.startsWith("/echo");
  const isLanding = typeof pathname === "string" && (pathname === "/welcome" || pathname === "/");
  const isVerify = typeof pathname === "string" && (pathname.startsWith("/certificates/verify") || pathname.startsWith("/verify"));
  const isContact = typeof pathname === "string" && pathname.startsWith("/contact");

  const navItems = [
    { label: "Home", href: "/welcome" },
    { label: "ECHO", href: "/echo" },
    { label: "Verify", href: "/verify" },
    { label: "Contact Us", href: "/contact" },
  ];

  const handleNavClick = (e: React.MouseEvent, item: { label: string; href: string }) => {
    e.preventDefault();
    setMobileOpen(false);

    if (item.label === "Home") {
      if (isLanding) {
        if (typeof document !== "undefined") {
          const shell = document.querySelector(".sa-scroll-shell");
          const homeSecs = document.querySelectorAll(".sa-sect, #sa-dash, #sa-road-sec");
          const agentSec = document.getElementById("sa-page-agentk");
          const partnersSec = document.getElementById("sa-page-partners");
          homeSecs.forEach((s) => {
            (s as HTMLElement).style.display = "";
          });
          if (agentSec) agentSec.style.display = "none";
          if (partnersSec) partnersSec.style.display = "none";
          if (shell) shell.scrollTo({ top: 0, behavior: "smooth" });
          else window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        router.push("/welcome");
      }
      return;
    }

    router.push(item.href as any);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    if (pathname === "/" || pathname === "/welcome") {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      router.push("/");
    }
  };

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          backgroundColor: scrolled || mobileOpen ? "rgba(5, 6, 15, 0.92)" : "rgba(5, 6, 15, 0.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(27, 30, 51, 0.8)",
          transition: "background-color 0.25s ease, border-color 0.25s ease",
          boxShadow: scrolled ? "0 10px 30px rgba(0, 0, 0, 0.45)" : "none",
        }}
      >
        <div
          style={{
            maxWidth: "1360px",
            margin: "0 auto",
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
            boxSizing: "border-box",
          }}
        >
          {/* Logo */}
          <a
            href="/"
            onClick={handleLogoClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg width="28" height="33" viewBox="0 0 300 350" style={{ display: "block", flexShrink: 0 }}>
              <defs>
                <linearGradient id="saNavMainBadgeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#C9A7FF" />
                  <stop offset="48%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#5B2FD0" />
                </linearGradient>
                <linearGradient id="saNavInnerBadgeGrad" x1="0" y1="0" x2="0.4" y2="1">
                  <stop offset="0%" stopColor="#B683F5" />
                  <stop offset="100%" stopColor="#7331C9" />
                </linearGradient>
              </defs>
              <path
                d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z"
                fill="url(#saNavMainBadgeGrad)"
              />
              <path
                d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z"
                fill="url(#saNavInnerBadgeGrad)"
              />
              <text
                style={{
                  fontFamily: "'Manrope', -apple-system, sans-serif",
                  fontSize: "118px",
                  fontWeight: "800",
                  letterSpacing: "-5px",
                  fill: "#FFFFFF",
                }}
                textAnchor="middle"
                x="150"
                y="214"
              >
                SA
              </text>
            </svg>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "-0.4px",
                color: "#FFFFFF",
                whiteSpace: "nowrap",
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              StudentAlumni
            </span>
          </a>

          {/* Desktop Nav Links */}
          {isLargeScreen && (
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: "36px",
                margin: "0 auto",
              }}
            >
              {navItems.map((item) => {
                const isActive =
                  (item.label === "Home" && isLanding) ||
                  (item.label === "ECHO" && isEcho) ||
                  (item.label === "Verify" && isVerify) ||
                  (item.label === "Contact Us" && isContact);

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    style={{
                      fontSize: "14px",
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: "0.2px",
                      color: isActive ? "#FFFFFF" : "#9AA0B4",
                      textDecoration: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      position: "relative",
                      padding: "6px 0",
                      transition: "color 0.2s ease",
                      fontFamily: "'Manrope', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.color = "#9AA0B4";
                    }}
                  >
                    {item.label}
                    {isActive && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: "2px",
                          backgroundColor: "#8B84FF",
                          borderRadius: "100px",
                          boxShadow: "0 0 10px rgba(139, 132, 255, 0.9)",
                        }}
                      />
                    )}
                  </a>
                );
              })}
            </nav>
          )}

          {/* Right Action buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexShrink: 0,
            }}
          >
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  const role = user?.role || "student";
                  const portalPath =
                    role === "super_admin"
                      ? "/super-admin"
                      : role === "mentor"
                      ? "/mentor-portal"
                      : role === "alumni"
                      ? "/alumni-portal"
                      : role === "college"
                      ? "/college-portal"
                      : "/student-portal";
                  router.push(portalPath);
                }}
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#4ADE80",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Manrope', sans-serif",
                  padding: "6px 10px",
                  transition: "color 0.2s ease",
                }}
              >
                Dashboard
              </button>
            ) : (
              width >= 420 && (
                <button
                  type="button"
                  onClick={() => router.push("/(auth)/login")}
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#B6BACB",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "'Manrope', sans-serif",
                    padding: "6px 12px",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#FFFFFF")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#B6BACB")}
                >
                  Sign in
                </button>
              )
            )}

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  const role = user?.role || "student";
                  const portalPath =
                    role === "super_admin"
                      ? "/super-admin"
                      : role === "mentor"
                      ? "/mentor-portal"
                      : role === "alumni"
                      ? "/alumni-portal"
                      : role === "college"
                      ? "/college-portal"
                      : "/student-portal";
                  router.push(portalPath);
                }}
                style={{
                  backgroundColor: "#5B4FE9",
                  color: "#FFFFFF",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  padding: "10px 20px",
                  borderRadius: "100px",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "'Manrope', sans-serif",
                  boxShadow: "0 0 16px rgba(91, 79, 233, 0.4)",
                  transition: "background-color 0.2s ease, transform 0.15s ease",
                }}
              >
                My Account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  router.push("/get-started");
                }}
                style={{
                  backgroundColor: "#5B4FE9",
                  color: "#FFFFFF",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  padding: "10px 20px",
                  borderRadius: "100px",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "'Manrope', sans-serif",
                  boxShadow: "0 0 16px rgba(91, 79, 233, 0.4)",
                  transition: "background-color 0.2s ease, transform 0.15s ease",
                }}
              >
                Get Started
              </button>
            )}

            {/* Hamburger button */}
            {!isLargeScreen && (
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Toggle menu"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  color: "#FFFFFF",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid #1B1E33",
                  cursor: "pointer",
                }}
              >
                {mobileOpen ? <X size={20} color="#FFFFFF" /> : <Menu size={20} color="#FFFFFF" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileOpen && !isLargeScreen && (
          <nav
            style={{
              backgroundColor: "#0C0C0D",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {navItems.map((item) => {
              const isActive =
                (item.label === "Home" && isLanding) ||
                (item.label === "ECHO" && isEcho) ||
                (item.label === "Verify" && isVerify) ||
                (item.label === "Contact Us" && isContact);

              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: isActive ? "#FFFFFF" : "#B6BACB",
                    backgroundColor: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    textDecoration: "none",
                    cursor: "pointer",
                    fontFamily: "'Manrope', sans-serif",
                  }}
                >
                  {item.label}
                </a>
              );
            })}

            <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.08)", margin: "8px 0" }} />

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  const role = user?.role || "student";
                  const portalPath =
                    role === "super_admin"
                      ? "/super-admin"
                      : role === "mentor"
                      ? "/mentor-portal"
                      : role === "alumni"
                      ? "/alumni-portal"
                      : role === "college"
                      ? "/college-portal"
                      : "/student-portal";
                  setMobileOpen(false);
                  router.push(portalPath);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#4ADE80",
                  backgroundColor: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  router.push("/(auth)/login");
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#B6BACB",
                  backgroundColor: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                Sign in
              </button>
            )}
          </nav>
        )}
      </header>
    </>
  );
}