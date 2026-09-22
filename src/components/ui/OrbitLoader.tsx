'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface OrbitLoaderProps {
  /** Size preset */
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  /** Custom primary label or status message */
  text?: string;
  /** Subtitle or secondary hint text */
  subtitle?: string;
  /** Optional flag for cycling text (kept for backwards compatibility) */
  showCyclingText?: boolean;
  /** Additional container classes */
  className?: string;
}

export function OrbitLoader({
  size = 'md',
  text,
  subtitle,
  className,
}: OrbitLoaderProps) {
  // Scaling configuration for the dotted orbit, 2 orbiting circles, and center circle
  const config = {
    sm: {
      svgSize: 32,
      r: 10.5,
      dotR: 2.2,
      centerR: 3.2,
      strokeWidth: 1.5,
      dashArray: '2.5 3.5',
    },
    md: {
      svgSize: 46,
      r: 16,
      dotR: 3.2,
      centerR: 4.8,
      strokeWidth: 1.75,
      dashArray: '3 4',
    },
    lg: {
      svgSize: 62,
      r: 22,
      dotR: 4,
      centerR: 6.5,
      strokeWidth: 2,
      dashArray: '3.5 5',
    },
    fullscreen: {
      svgSize: 76,
      r: 28,
      dotR: 5,
      centerR: 8.5,
      strokeWidth: 2.2,
      dashArray: '4 6',
    },
  }[size];

  const center = config.svgSize / 2;

  const content = (
    <div className={cn('flex flex-col items-center justify-center select-none', className)}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: config.svgSize, height: config.svgSize }}
        role="status"
        aria-label="Loading..."
      >
        <svg
          width={config.svgSize}
          height={config.svgSize}
          viewBox={`0 0 ${config.svgSize} ${config.svgSize}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`orbit-center-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2dd4bf" />
            </linearGradient>
          </defs>

          {/* Prominent Center Circle / Orbital Core */}
          <circle
            cx={center}
            cy={center}
            r={config.centerR}
            fill={`url(#orbit-center-grad-${size})`}
            style={{
              filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))',
            }}
          />

          {/* Dotted Circle Orbit Track */}
          <circle
            cx={center}
            cy={center}
            r={config.r}
            fill="none"
            stroke="#334155"
            strokeWidth={config.strokeWidth}
            strokeDasharray={config.dashArray}
            strokeLinecap="round"
          />

          {/* Rotating Group containing the 2 Circles moving in orbit */}
          <g
            className="animate-spin"
            style={{
              animationDuration: '2.2s',
              animationTimingFunction: 'linear',
              transformOrigin: `${center}px ${center}px`,
            }}
          >
            {/* Circle 1 (Cyan / Sky Blue - Top of orbit) */}
            <circle
              cx={center}
              cy={center - config.r}
              r={config.dotR}
              fill="#38bdf8"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.7))',
              }}
            />

            {/* Circle 2 (Emerald Green - Bottom of orbit, 180° opposite) */}
            <circle
              cx={center}
              cy={center + config.r}
              r={config.dotR}
              fill="#34d399"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.7))',
              }}
            />
          </g>
        </svg>
      </div>

      {/* Optional Label and Subtitle */}
      {(text || subtitle) && (
        <div className="mt-3 text-center max-w-xs space-y-0.5">
          {text && (
            <p className="text-xs font-semibold tracking-wide text-slate-300">
              {text}
            </p>
          )}
          {subtitle && (
            <p className="text-[11px] text-slate-500 font-medium">
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
