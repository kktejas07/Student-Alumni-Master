import { useState } from "react";
import { AgentK3D } from "./AgentK3D";

export function AgentKCompanion() {
  const [minimized, setMinimized] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full
          bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-violet-600
          text-white text-sm font-black shadow-[0_4px_20px_rgba(139,92,246,0.55)]
          hover:scale-105 transition-transform"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        Agent K
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 select-none ${
        minimized ? "w-[72px] h-[72px]" : "w-[230px] h-[290px]"
      }`}
    >
      {/* glass card backdrop */}
      <div
        className="w-full h-full rounded-3xl border border-white/30 overflow-hidden
          bg-white/15 backdrop-blur-xl
          shadow-[0_8px_32px_rgba(99,102,241,0.22),0_2px_8px_rgba(0,0,0,0.08)]"
      >
        {minimized ? (
          /* ── collapsed avatar button ── */
          <button
            onClick={() => setMinimized(false)}
            className="w-full h-full flex items-center justify-center rounded-3xl
              bg-gradient-to-br from-indigo-500/30 via-fuchsia-400/20 to-cyan-400/20
              hover:from-indigo-500/50 hover:via-fuchsia-400/35 transition-all"
          >
            <span className="text-2xl">🤖</span>
          </button>
        ) : (
          /* ── expanded 3D view ── */
          <div className="relative w-full h-full">
            <AgentK3D />

            {/* top controls */}
            <div className="absolute top-2 right-2 flex gap-1.5 z-10">
              <button
                onClick={() => setMinimized(true)}
                title="Minimize"
                className="w-6 h-6 rounded-full bg-white/50 hover:bg-white/80 backdrop-blur-sm
                  flex items-center justify-center text-[10px] text-indigo-600 font-black
                  border border-white/40 transition-all hover:scale-110"
              >
                −
              </button>
              <button
                onClick={() => setVisible(false)}
                title="Close"
                className="w-6 h-6 rounded-full bg-white/50 hover:bg-red-100 backdrop-blur-sm
                  flex items-center justify-center text-[10px] text-red-500 font-black
                  border border-white/40 transition-all hover:scale-110"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
