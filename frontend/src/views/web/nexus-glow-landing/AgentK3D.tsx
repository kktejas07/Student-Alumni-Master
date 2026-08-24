import React, { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { Sparkles, Bot, Zap, Users, GraduationCap, ShieldCheck } from "lucide-react";

export function AgentK3D() {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const yRatio = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

    // Smooth tilt: max ±15 deg
    const targetRotX = -yRatio * 22;
    const targetRotY = xRatio * 22;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      setTilt({ x: targetRotX, y: targetRotY });
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[380px] md:min-h-[500px] flex items-center justify-center select-none"
      style={{ perspective: "1200px" }}
    >
      {/* ── Keyframe Animations Injected Inline ── */}
      <style>{`
        @keyframes agentKFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(0.5deg); }
        }
        @keyframes agentKShadow {
          0%, 100% { transform: scale(0.9); opacity: 0.45; }
          50% { transform: scale(1.1); opacity: 0.75; }
        }
        @keyframes agentKAuraPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0.9; }
        }
        @keyframes agentKOrbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes agentKBadgeFloatA {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-8px) translateX(4px); }
        }
        @keyframes agentKBadgeFloatB {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-10px) translateX(-4px); }
        }
      `}</style>

      {/* ── Deep Ambient Neon Glow ── */}
      <div
        className="absolute rounded-full pointer-events-none -z-10"
        style={{
          width: "480px",
          height: "480px",
          maxWidth: "90vw",
          maxHeight: "90vw",
          background: "radial-gradient(circle, rgba(147, 51, 234, 0.45) 0%, rgba(99, 102, 241, 0.25) 40%, rgba(139, 92, 246, 0.08) 65%, transparent 80%)",
          filter: "blur(75px)",
          animation: "agentKAuraPulse 6s ease-in-out infinite",
        }}
      />

      {/* ── Orbiting Shimmer Ring ── */}
      <div
        className="absolute rounded-full pointer-events-none opacity-40 -z-10"
        style={{
          width: "440px",
          height: "440px",
          maxWidth: "85vw",
          maxHeight: "85vw",
          border: "1px dashed rgba(168, 85, 247, 0.45)",
          animation: "agentKOrbit 24s linear infinite",
        }}
      />

      {/* ── Interactive 3D Parallax Container ── */}
      <div
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.04 : 1})`,
          transition: isHovered ? "transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)" : "transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        className="relative z-10 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {/* ── Floating Levitation Wrapper ── */}
        <div
          className="relative flex items-center justify-center"
          style={{
            animation: "agentKFloat 6s ease-in-out infinite",
            transformStyle: "preserve-3d",
          }}
        >
          {/* ── 3D High-Definition SA Shield Image ── */}
          <img
            src="/sa-3d-shield.png"
            alt="Student Alumni 3D Shield Logo"
            draggable={false}
            onError={(e) => {
              // Fallback to static asset if public root path fails
              const target = e.currentTarget;
              if (target.src.indexOf("sa-3d-shield") !== -1 && !target.dataset.triedFallback) {
                target.dataset.triedFallback = "true";
                target.src = "/sa-icon.png";
              }
            }}
            style={{
              width: "480px",
              height: "480px",
              maxWidth: "86vw",
              maxHeight: "86vw",
              objectFit: "contain",
              transformStyle: "preserve-3d",
              transform: "translateZ(30px)",
              filter: isHovered
                ? "drop-shadow(0 35px 55px rgba(147, 51, 234, 0.7)) drop-shadow(0 0 45px rgba(99, 102, 241, 0.5))"
                : "drop-shadow(0 25px 45px rgba(147, 51, 234, 0.55)) drop-shadow(0 0 30px rgba(124, 58, 237, 0.35))",
              transition: "filter 0.3s ease",
              willChange: "transform, filter",
            }}
            className="pointer-events-none"
          />

          {/* ── Dynamic Floating Shadow Beneath ── */}
          <div
            className="absolute -bottom-8 rounded-[100%] bg-purple-950/80 blur-xl pointer-events-none -z-10"
            style={{
              width: "260px",
              height: "32px",
              animation: "agentKShadow 6s ease-in-out infinite",
              background: "radial-gradient(ellipse at center, rgba(126, 34, 206, 0.6) 0%, rgba(15, 7, 34, 0.9) 60%, transparent 80%)",
            }}
          />

          {/* ── Satellite Glass Badge 1: Agent K AI (Top-Right) ── */}
          <div
            className="absolute -top-3 -right-2 md:right-2 hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl backdrop-blur-md"
            style={{
              background: "rgba(18, 14, 38, 0.85)",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(147, 51, 234, 0.25)",
              transform: "translateZ(50px)",
              animation: "agentKBadgeFloatA 5s ease-in-out infinite",
            }}
          >
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/40">
              <Bot className="w-4 h-4 text-purple-300" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-white tracking-wide leading-tight">Agent K Copilot</p>
              <p className="text-[9.5px] font-medium text-purple-300/80">AI Career Guidance</p>
            </div>
          </div>

          {/* ── Satellite Glass Badge 2: Verified Network (Bottom-Left) ── */}
          <div
            className="absolute -bottom-4 -left-2 md:left-2 hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl backdrop-blur-md"
            style={{
              background: "rgba(18, 14, 38, 0.85)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(99, 102, 241, 0.25)",
              transform: "translateZ(45px)",
              animation: "agentKBadgeFloatB 6s ease-in-out infinite 0.5s",
            }}
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40">
              <GraduationCap className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-white tracking-wide leading-tight">12,400+ Network</p>
              <p className="text-[9.5px] font-medium text-indigo-300/80">Students & Mentors</p>
            </div>
          </div>

          {/* ── Satellite Glass Badge 3: Smart Roadmap (Top-Left on large screens) ── */}
          <div
            className="absolute top-1/2 -left-6 md:-left-10 -translate-y-1/2 hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md"
            style={{
              background: "rgba(24, 18, 50, 0.75)",
              border: "1px solid rgba(216, 180, 254, 0.25)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              transform: "translateZ(35px)",
              animation: "agentKBadgeFloatA 7s ease-in-out infinite 1s",
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[10px] font-bold text-gray-200 tracking-wider">AI ROADMAP</span>
          </div>

        </div>
      </div>
    </div>
  );
}
