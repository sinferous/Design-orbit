'use client';

import React from 'react';

export function CreativeBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none aria-hidden">
      {/* Very Faint Monochromatic Ambient Glow */}
      <div className="absolute -top-32 -left-32 w-[36rem] h-[36rem] bg-slate-300/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[36rem] h-[36rem] bg-slate-300/20 rounded-full blur-3xl" />

      {/* Subtle Dot Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.035]" 
        style={{
          backgroundImage: `radial-gradient(#64748b 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }} 
      />

      {/* TOP LEFT SUBTLE B&W BEZIER VECTOR PATH */}
      <div className="absolute top-16 left-4 sm:left-12 opacity-25 animate-float">
        <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-500">
          <path d="M15 125 C 35 35, 105 105, 125 15" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" />
          <rect x="10" y="120" width="10" height="10" fill="white" stroke="currentColor" strokeWidth="1.5" rx="1.5" />
          <rect x="120" y="10" width="10" height="10" fill="white" stroke="currentColor" strokeWidth="1.5" rx="1.5" />
          <line x1="15" y1="125" x2="45" y2="70" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="45" cy="70" r="3" fill="currentColor" />
          <line x1="125" y1="15" x2="95" y2="70" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="95" cy="70" r="3" fill="currentColor" />
        </svg>
      </div>

      {/* TOP RIGHT SUBTLE B&W CANVAS BOUNDING BOX */}
      <div className="absolute top-20 right-4 sm:right-12 opacity-25 animate-float" style={{ animationDelay: '2s' }}>
        <div className="w-40 h-32 border border-dashed border-slate-400 rounded-lg relative">
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-500 rounded-2xs" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-500 rounded-2xs" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-500 rounded-2xs" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-500 rounded-2xs" />
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-500 rounded-full border border-white" />
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 h-3.5 w-px bg-slate-400" />
        </div>
      </div>

      {/* MID LEFT SUBTLE B&W ROTATING ORBIT RINGS */}
      <div className="absolute top-1/3 left-2 sm:left-8 opacity-20">
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-500 animate-spin-slow">
          <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6 6" />
          <circle cx="80" cy="80" r="48" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
          <circle cx="80" cy="80" r="26" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="150" cy="80" r="4" fill="currentColor" />
          <circle cx="32" cy="80" r="3" fill="currentColor" />
        </svg>
      </div>

      {/* MID RIGHT SUBTLE B&W VECTOR RULE & CROSSHAIR */}
      <div className="absolute top-1/2 right-4 sm:right-10 opacity-25 animate-float" style={{ animationDelay: '3.5s' }}>
        <div className="p-2.5 border border-slate-300 rounded-lg flex items-center space-x-2 text-slate-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="2 2" />
            <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" />
            <rect x="7" y="7" width="10" height="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Vector</span>
        </div>
      </div>

      {/* BOTTOM LEFT SUBTLE B&W TYPOGRAPHY OUTLINE */}
      <div className="absolute bottom-24 left-6 sm:left-14 opacity-25 animate-float" style={{ animationDelay: '1.5s' }}>
        <div className="flex items-center space-x-2 text-slate-500">
          <span className="text-3xl font-black font-serif italic tracking-tighter text-slate-400">Aa</span>
          <div className="space-y-1">
            <div className="w-12 h-0.5 bg-slate-400 rounded-full" />
            <div className="w-20 h-0.5 bg-slate-300 rounded-full" />
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT SUBTLE B&W VECTOR CURSOR */}
      <div className="absolute bottom-16 right-6 sm:right-14 opacity-25 animate-float" style={{ animationDelay: '4s' }}>
        <svg width="24" height="24" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-500">
          <path d="M12 12 L24 48 L32 32 L48 24 Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" fill="white" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
