import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useState } from "react";

export function AgentK3D() {
  const [isHovered, setIsHovered] = useState(false);

  /* ── Mouse Parallax (±5° tilt) ── */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springCfg = { damping: 35, stiffness: 220 };
  const parallaxX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), springCfg);
  const parallaxY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), springCfg);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full flex items-center justify-center select-none"
      style={{ perspective: "1000px" }}
    >
      {/* Ambient Purple Glow */}
      <div
        className="absolute rounded-full pointer-events-none -z-10"
        style={{
          width: "440px",
          height: "440px",
          background: "radial-gradient(circle, rgba(168,85,247,0.38) 0%, rgba(99,102,241,0.16) 45%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* Mouse Parallax Wrapper */}
      <motion.div
        style={{
          rotateX: parallaxX,
          rotateY: parallaxY,
          transformStyle: "preserve-3d",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
        className="relative z-10 flex items-center justify-center cursor-pointer"
      >
        {/* Floating Animation */}
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* SA Shield — gentle ±18° oscillation, SA always visible */}
          <motion.img
            src="/sa-3d-shield.png"
            alt="Student Alumni 3D Shield Logo"
            animate={{ rotateY: [-18, 18, -18] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: "540px",
              height: "540px",
              maxWidth: "92vw",
              maxHeight: "92vw",
              objectFit: "contain",
              transformStyle: "preserve-3d",
              transform: "rotateX(4deg) translateZ(0)",
              filter: "drop-shadow(0 25px 45px rgba(130,80,255,0.55)) drop-shadow(0 0 30px rgba(168,85,247,0.35))",
              willChange: "transform",
            }}
            className="pointer-events-none"
          />

          {/* Floating Shadow Beneath */}
          <motion.div
            animate={{ scale: [0.85, 1, 0.85], opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-6 rounded-[100%] bg-purple-950/80 blur-xl pointer-events-none -z-10"
            style={{ width: "200px", height: "24px" }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
