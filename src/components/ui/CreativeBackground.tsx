'use client';

import React from 'react';

export function CreativeBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none aria-hidden">
      {/* Deep Obsidian Canvas Base */}
      <div className="absolute inset-0 bg-[#06080F]" />

      {/* Atmospheric Ambient Glow Orbs */}
      <div 
        className="absolute -top-48 left-1/4 w-[42rem] h-[42rem] rounded-full bg-gradient-to-br from-violet-600/15 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none" 
      />
      <div 
        className="absolute top-1/3 -right-32 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-fuchsia-600/10 via-purple-600/08 to-transparent blur-[110px] pointer-events-none" 
      />
      <div 
        className="absolute -bottom-40 left-10 w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-indigo-700/12 via-violet-900/08 to-transparent blur-[130px] pointer-events-none" 
      />

      {/* Fine Micro-Dot Matrix with Center Radial Fade */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#a855f7 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 40%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 40%, transparent 90%)',
        }} 
      />

      {/* Subtle Top Edge Gradient Line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
    </div>
  );
}

export default CreativeBackground;
