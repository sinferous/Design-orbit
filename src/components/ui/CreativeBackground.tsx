'use client';

import React from 'react';

export function CreativeBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none aria-hidden">
      {/* Soft Gradient Radial Ambient Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '9s' }} />
      <div className="absolute top-1/4 -right-32 w-[30rem] h-[30rem] bg-teal-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '11s', animationDelay: '2s' }} />
      <div className="absolute -bottom-32 left-1/3 w-[36rem] h-[36rem] bg-indigo-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '13s', animationDelay: '4s' }} />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.025]" 
        style={{
          backgroundImage: `radial-gradient(#0284c7 1px, transparent 1px), radial-gradient(#0d9488 1px, #fcfcfd 1px)`,
          backgroundSize: '36px 36px',
          backgroundPosition: '0 0, 18px 18px'
        }} 
      />

      {/* TOP LEFT CREATIVE VECTOR ELEMENTS */}
      <div className="absolute top-20 left-8 md:left-14 opacity-15 hidden xl:block animate-float">
        {/* Pen Tool Bezier Curve & Nodes */}
        <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-sky-600">
          <path d="M20 120 C 40 40, 100 100, 120 20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
          <rect x="14" y="114" width="12" height="12" fill="white" stroke="currentColor" strokeWidth="2" rx="2" />
          <rect x="114" y="14" width="12" height="12" fill="white" stroke="currentColor" strokeWidth="2" rx="2" />
          <line x1="20" y1="120" x2="45" y2="70" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
          <circle cx="45" cy="70" r="3.5" fill="currentColor" />
          <line x1="120" y1="20" x2="95" y2="70" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
          <circle cx="95" cy="70" r="3.5" fill="currentColor" />
        </svg>
      </div>

      {/* TOP RIGHT CREATIVE CANVAS / RULER BOUNDING BOX */}
      <div className="absolute top-28 right-8 md:right-16 opacity-20 hidden lg:block animate-float" style={{ animationDelay: '1.5s' }}>
        {/* Selection Bounding Box with handles */}
        <div className="w-44 h-36 border-2 border-dashed border-teal-500/50 rounded-lg relative">
          <div className="absolute -top-2 -left-2 w-3.5 h-3.5 bg-white border-2 border-teal-600 rounded-sm" />
          <div className="absolute -top-2 -right-2 w-3.5 h-3.5 bg-white border-2 border-teal-600 rounded-sm" />
          <div className="absolute -bottom-2 -left-2 w-3.5 h-3.5 bg-white border-2 border-teal-600 rounded-sm" />
          <div className="absolute -bottom-2 -right-2 w-3.5 h-3.5 bg-white border-2 border-teal-600 rounded-sm" />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-3 bg-teal-500 rounded-full border-2 border-white" />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-4 w-0.5 bg-teal-500/60" />
          
          {/* Internal Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-teal-600/40">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
        </div>
      </div>

      {/* MID LEFT DESIGN ORBIT RINGS */}
      <div className="absolute top-1/3 left-6 md:left-12 opacity-15 hidden lg:block">
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-sky-500 animate-spin-slow">
          <circle cx="90" cy="90" r="80" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" />
          <circle cx="90" cy="90" r="55" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
          <circle cx="90" cy="90" r="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="170" cy="90" r="5" fill="#0284c7" />
          <circle cx="35" cy="90" r="4" fill="#0d9488" />
          <circle cx="90" cy="145" r="3.5" fill="#8b5cf6" />
        </svg>
      </div>

      {/* MID RIGHT COLOR SWATCH PALETTE */}
      <div className="absolute top-1/2 right-10 opacity-20 hidden xl:block animate-float" style={{ animationDelay: '3s' }}>
        <div className="p-3 bg-white/60 backdrop-blur-xs rounded-xl border border-slate-300/60 shadow-xs space-y-2">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-sky-500 shadow-2xs" />
            <span className="w-3.5 h-3.5 rounded-full bg-teal-500 shadow-2xs" />
            <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-2xs" />
            <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-2xs" />
          </div>
          <div className="w-24 h-1.5 bg-slate-200/80 rounded-full overflow-hidden flex">
            <div className="w-1/3 h-full bg-sky-500" />
            <div className="w-1/3 h-full bg-teal-500" />
            <div className="w-1/3 h-full bg-indigo-500" />
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT LAYOUT GRID & TYPOGRAPHY MAGNIFIER */}
      <div className="absolute bottom-24 left-10 md:left-20 opacity-15 hidden lg:block animate-float" style={{ animationDelay: '2.5s' }}>
        <div className="flex items-center space-x-3 text-slate-600">
          <span className="text-4xl font-black font-serif italic tracking-tighter text-slate-500">Aa</span>
          <div className="space-y-1">
            <div className="w-16 h-1 bg-slate-400/60 rounded-full" />
            <div className="w-24 h-1 bg-slate-300/60 rounded-full" />
            <div className="w-20 h-1 bg-slate-300/60 rounded-full" />
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT VECTOR CURSOR & COMPASS */}
      <div className="absolute bottom-20 right-14 opacity-20 hidden lg:block animate-float" style={{ animationDelay: '4s' }}>
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-teal-600">
          <path d="M12 12 L24 48 L32 32 L48 24 Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" fill="white" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
