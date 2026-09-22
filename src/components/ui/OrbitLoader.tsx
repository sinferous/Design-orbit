'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface OrbitLoaderProps {
  /** Size preset */
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  /** Custom primary label or status message */
  text?: string;
  /** Subtitle or secondary hint text */
  subtitle?: string;
  /** Cycle through playful creative agency status messages */
  showCyclingText?: boolean;
  /** Additional container classes */
  className?: string;
}

const CREATIVE_MESSAGES = [
  'Aligning creative vectors...',
  'Syncing agency deliverables...',
  'Harmonizing team momentum...',
  'Connecting to Design Orbit...',
  'Calculating deliverable hours...',
  'Polishing pixels for review...',
];

export function OrbitLoader({
  size = 'md',
  text,
  subtitle,
  showCyclingText = false,
  className,
}: OrbitLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!showCyclingText && size !== 'fullscreen') return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % CREATIVE_MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [showCyclingText, size]);

  const activeText = text || (showCyclingText || size === 'fullscreen' ? CREATIVE_MESSAGES[messageIndex] : undefined);

  // Dimension scaling maps
  const dimensionStyles = {
    sm: {
      container: 'w-10 h-10',
      core: 'w-2.5 h-2.5',
      ring1: 'w-10 h-10 border-[1.5px]',
      ring2: 'w-8 h-8 border-[1.5px]',
      satellite: 'w-1.5 h-1.5',
    },
    md: {
      container: 'w-16 h-16',
      core: 'w-3.5 h-3.5',
      ring1: 'w-16 h-16 border-2',
      ring2: 'w-12 h-12 border-[1.5px]',
      satellite: 'w-2 h-2',
    },
    lg: {
      container: 'w-24 h-24',
      core: 'w-5 h-5',
      ring1: 'w-24 h-24 border-2',
      ring2: 'w-20 h-20 border-2',
      ring3: 'w-16 h-16 border-[1.5px]',
      satellite: 'w-2.5 h-2.5',
    },
    fullscreen: {
      container: 'w-28 h-28',
      core: 'w-6 h-6',
      ring1: 'w-28 h-28 border-2',
      ring2: 'w-22 h-22 border-2',
      ring3: 'w-18 h-18 border-[1.5px]',
      satellite: 'w-3 h-3',
    },
  }[size];

  const content = (
    <div className={cn('flex flex-col items-center justify-center select-none', className)}>
      {/* 3D Gyroscopic Orbit Stage */}
      <div
        className={cn('relative flex items-center justify-center [perspective:600px]', dimensionStyles.container)}
        role="status"
        aria-label="Loading..."
      >
        {/* Ambient Radial Backdrop Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-500/20 via-teal-500/10 to-transparent blur-xl pointer-events-none animate-pulse" />

        {/* Pulsing Core Nucleus */}
        <div
          className={cn(
            'absolute rounded-full bg-gradient-to-tr from-sky-400 via-teal-300 to-emerald-400 animate-orbit-core z-10',
            dimensionStyles.core
          )}
        >
          <div className="w-full h-full rounded-full bg-white/40 blur-[1px]" />
        </div>

        {/* Orbital Ring 1 (Cyan / Clockwise tilt) */}
        <div
          className={cn(
            'absolute rounded-full border-sky-400/40 border-dashed animate-orbit-ring-1 flex items-center justify-start pointer-events-none',
            dimensionStyles.ring1
          )}
        >
          {/* Cyan Satellite Beacon */}
          <div
            className={cn(
              'rounded-full bg-sky-300 shadow-[0_0_8px_#38bdf8] -ml-1',
              dimensionStyles.satellite
            )}
          />
        </div>

        {/* Orbital Ring 2 (Emerald / Counter-Clockwise tilt) */}
        <div
          className={cn(
            'absolute rounded-full border-emerald-400/40 border-dotted animate-orbit-ring-2 flex items-center justify-end pointer-events-none',
            dimensionStyles.ring2
          )}
        >
          {/* Emerald Satellite Beacon */}
          <div
            className={cn(
              'rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399] -mr-1',
              dimensionStyles.satellite
            )}
          />
        </div>

        {/* Orbital Ring 3 (Outer Subtle Ring for lg and fullscreen) */}
        {(size === 'lg' || size === 'fullscreen') && (
          <div
            className={cn(
              'absolute rounded-full border-teal-500/25 border-dashed animate-orbit-ring-3 flex items-start justify-center pointer-events-none',
              dimensionStyles.ring3 || 'w-16 h-16 border-[1.5px]'
            )}
          >
            {/* Third satellite node */}
            <div
              className={cn(
                'rounded-full bg-teal-200 shadow-[0_0_6px_#2dd4bf] -mt-1',
                dimensionStyles.satellite
              )}
            />
          </div>
        )}
      </div>

      {/* Label and Subtitle */}
      {(activeText || subtitle) && (
        <div className="mt-4 text-center max-w-xs space-y-1">
          {activeText && (
            <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-200 animate-in fade-in duration-300">
              {activeText}
            </p>
          )}
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 bg-[#090d16]/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Aurora Glass Shimmer Row for tabular & card skeleton loading
 */
export function ShimmerSkeleton({
  className,
  rounded = 'rounded-md',
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-slate-900/80 border border-slate-800/60',
        rounded,
        className
      )}
    >
      {/* Prismatic Shimmer Sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-400/10 via-teal-400/10 to-transparent animate-shimmer-sweep pointer-events-none" />
    </div>
  );
}

/**
 * Table Shimmer Skeleton Placeholder Rows
 */
export function TableShimmerSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-3">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <ShimmerSkeleton
              key={cIdx}
              className={cn(
                'h-8',
                cIdx === 0 ? 'w-12' : cIdx === 1 ? 'w-1/3' : 'flex-1'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
