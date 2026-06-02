import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Logo } from "../ui/Logo";

export function AuthLayout() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      className="min-h-[100dvh] w-full bg-[#faf8ff] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden" 
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos({ x: -1000, y: -1000 })}
    >
      {/* Static Light Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ 
          backgroundImage: "radial-gradient(#e2e8f0 1.5px, transparent 1.5px)", 
          backgroundSize: "24px 24px"
        }}
      />

      {/* Interactive Hover Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
        style={{ 
          backgroundImage: "radial-gradient(#0057cd 2px, transparent 2px)", 
          backgroundSize: "24px 24px",
          opacity: 0.8,
          maskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, black 10%, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, black 10%, transparent 80%)`
        }}
      />
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-400/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-md flex flex-col items-center relative z-10">
        <div className="mb-6 bg-white/70 p-4 rounded-3xl shadow-sm border border-white backdrop-blur-md">
          <Logo className="items-center" textClassName="text-3xl" />
        </div>

        <div className="w-full bg-white/90 backdrop-blur-xl shadow-2xl shadow-blue-900/5 rounded-[2rem] border border-white/80 p-6 sm:p-10 relative">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
