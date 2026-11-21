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
  const gradId = React.useId().replace(/:/g, '');

  // One thin track, one planet with a fading tail, a small still core.
  const config = {
    sm: { box: 24, r: 9, dot: 2, core: 1.75, stroke: 1.5 },
    md: { box: 32, r: 12, dot: 2.5, core: 2.25, stroke: 1.5 },
    lg: { box: 40, r: 15, dot: 3, core: 2.75, stroke: 1.75 },
    fullscreen: { box: 48, r: 18, dot: 3.25, core: 3, stroke: 2 },
  }[size];

  const c = config.box / 2;
  const circumference = 2 * Math.PI * config.r;

  const content = (
    <div className={cn('flex flex-col items-center justify-center select-none', className)}>
      <div
        className="relative"
        style={{ width: config.box, height: config.box }}
        role="status"
        aria-label={text || 'Loading'}
      >
        <svg
          width={config.box}
          height={config.box}
          viewBox={`0 0 ${config.box} ${config.box}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`tail-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="50%" stopColor="#55cb98" stopOpacity="0" />
              <stop offset="100%" stopColor="#55cb98" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Track */}
          <circle cx={c} cy={c} r={config.r} stroke="rgba(255,255,255,0.08)" strokeWidth={config.stroke} />

          {/* Core */}
          <circle cx={c} cy={c} r={config.core} fill="#55cb98" opacity="0.55" />

          {/* Planet and its tail */}
          <g
            className="animate-spin motion-reduce:animate-none"
            style={{ animationDuration: '1.1s', transformOrigin: `${c}px ${c}px` }}
          >
            <circle
              cx={c}
              cy={c}
              r={config.r}
              stroke={`url(#tail-${gradId})`}
              strokeWidth={config.stroke}
              strokeLinecap="round"
              strokeDasharray={`${circumference * 0.25} ${circumference}`}
            />
            <circle cx={c} cy={c + config.r} r={config.dot} fill="#7ddbae" />
          </g>
        </svg>
      </div>

      {(text || subtitle) && (
        <div className="mt-3 text-center max-w-xs">
          {text && <p className="text-sm text-slate-400">{text}</p>}
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      )}
    </div>
  );

  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0c0c0b]/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Shimmer row for tabular & card skeleton loading
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
        'relative overflow-hidden bg-white/[0.03]',
        rounded,
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-shimmer-sweep pointer-events-none" />
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
