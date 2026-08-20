'use client';

import React from 'react';

export function CreativeBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none aria-hidden">
      {/* Colorful Gradient Radial Ambient Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-[32rem] h-[32rem] bg-sky-400/25 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-1/3 -right-24 w-[32rem] h-[32rem] bg-teal-400/25 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      <div className="absolute -bottom-24 left-1/4 w-[36rem] h-[36rem] bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.06]" 
        style={{
          backgroundImage: `radial-gradient(#0284c7 1.5px, transparent 1.5px), radial-gradient(#0d9488 1.5px, #fcfcfd 1.5px)`,
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px'
        }} 
      />

      {/* TOP LEFT CREATIVE VECTOR BEZIER CURVE */}
      <div className="absolute top-20 left-4 sm:left-10 opacity-70 animate-float">
        <svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-sky-600">
          <path d="M20 130 C 40 40, 110 110, 130 20" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 6" />
          <rect x="12" y="122" width="16" height="16" fill="white" stroke="#0284c7" strokeWidth="2.5" rx="3" />
          <rect x="122" y="12" width="16" height="16" fill="white" stroke="#0284c7" strokeWidth="2.5" rx="3" />
          <line x1="20" y1="130" x2="50" y2="75" stroke="#0d9488" strokeWidth="1.8" />
          <circle cx="50" cy="75" r="4.5" fill="#0d9488" />
          <line x1="130" y1="20" x2="100" y2="75" stroke="#0d9488" strokeWidth="1.8" />
          <circle cx="100" cy="75" r="4.5" fill="#0d9488" />
        </svg>
      </div>

      {/* TOP RIGHT FIGMA BOUNDING BOX */}
      <div className="absolute top-24 right-4 sm:right-12 opacity-75 animate-float" style={{ animationDelay: '1.5s' }}>
        <div className="w-48 h-36 border-2 border-dashed border-teal-500 rounded-xl relative bg-teal-50/20 backdrop-blur-2xs shadow-xs">
          <div className="absolute -top-2.5 -left-2.5 w-4 h-4 bg-white border-2 border-teal-600 rounded-sm shadow-xs" />
          <div className="absolute -top-2.5 -right-2.5 w-4 h-4 bg-white border-2 border-teal-600 rounded-sm shadow-xs" />
          <div className="absolute -bottom-2.5 -left-2.5 w-4 h-4 bg-white border-2 border-teal-600 rounded-sm shadow-xs" />
          <div className="absolute -bottom-2.5 -right-2.5 w-4 h-4 bg-white border-2 border-teal-600 rounded-sm shadow-xs" />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-teal-500 rounded-full border-2 border-white shadow-2xs" />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 h-5 w-0.5 bg-teal-500" />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center space-y-1 text-teal-700">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
              <line x1="12" y1="3" x2="12" y2="21" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider uppercase text-teal-800 bg-white/80 px-1.5 py-0.5 rounded border border-teal-200">Canvas</span>
          </div>
        </div>
      </div>

      {/* MID LEFT ROTATING DESIGN ORBIT */}
      <div className="absolute top-1/3 left-2 sm:left-8 opacity-65">
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-sky-500 animate-spin-slow">
          <circle cx="90" cy="90" r="80" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" />
          <circle cx="90" cy="90" r="55" stroke="#0d9488" strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="90" cy="90" r="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="170" cy="90" r="6" fill="#0284c7" />
          <circle cx="35" cy="90" r="5" fill="#0d9488" />
          <circle cx="90" cy="145" r="4" fill="#8b5cf6" />
        </svg>
      </div>

      {/* MID RIGHT COLOR SWATCH PALETTE */}
      <div className="absolute top-1/2 right-4 sm:right-10 opacity-80 animate-float" style={{ animationDelay: '3s' }}>
        <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-300 shadow-md space-y-2">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 rounded-full bg-sky-500 ring-2 ring-sky-200 shadow-xs" />
            <span className="w-4 h-4 rounded-full bg-teal-500 ring-2 ring-teal-200 shadow-xs" />
            <span className="w-4 h-4 rounded-full bg-indigo-500 ring-2 ring-indigo-200 shadow-xs" />
            <span className="w-4 h-4 rounded-full bg-amber-400 ring-2 ring-amber-200 shadow-xs" />
          </div>
          <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
            <div className="w-1/3 h-full bg-sky-500" />
            <div className="w-1/3 h-full bg-teal-500" />
            <div className="w-1/3 h-full bg-indigo-500" />
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT TYPOGRAPHY & LAYOUT GUIDES */}
      <div className="absolute bottom-28 left-6 sm:left-14 opacity-75 animate-float" style={{ animationDelay: '2s' }}>
        <div className="flex items-center space-x-3 p-2.5 bg-white/70 backdrop-blur-2xs rounded-xl border border-slate-300/80 shadow-xs">
          <span className="text-4xl font-black font-serif italic text-sky-700">Aa</span>
          <div className="space-y-1">
            <div className="w-16 h-1.5 bg-sky-500/80 rounded-full" />
            <div className="w-24 h-1.5 bg-teal-500/70 rounded-full" />
            <div className="w-20 h-1.5 bg-slate-400/60 rounded-full" />
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT VECTOR CURSOR */}
      <div className="absolute bottom-20 right-6 sm:right-16 opacity-80 animate-float" style={{ animationDelay: '4s' }}>
        <div className="p-2 bg-white/80 backdrop-blur-2xs rounded-xl border border-teal-200 shadow-sm flex items-center space-x-2">
          <svg width="28" height="28" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-teal-600 drop-shadow-xs">
            <path d="M12 12 L24 48 L32 32 L48 24 Z" fill="#0d9488" fillOpacity="0.3" stroke="#0d9488" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="4" fill="white" stroke="#0284c7" strokeWidth="3" />
          </svg>
          <span className="text-[11px] font-bold text-slate-700">Design Orbit</span>
        </div>
      </div>
    </div>
  );
}
