/**
 * Diwali touches: a clay diya, a marigold toran and a dot rangoli.
 * Set FESTIVE to false after the season and every touch disappears.
 */
export const FESTIVE = true;

const MARIGOLD = '#f2a93b';
const SAFFRON = '#e8792b';
const CLAY = '#b5532a';
const CLAY_DARK = '#7d3518';
const LEAF = '#3eb181';

// Round so server and client render the same SVG numbers (avoids hydration mismatch)
const r2 = (n: number) => Math.round(n * 100) / 100;

/** A small clay lamp with a flickering flame. */
export function Diya({ size = 22, className = '' }: { size?: number; className?: string }) {
  if (!FESTIVE) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <g className="diya-flame">
        <path d="M16 3.5c2.6 3.4 3.9 6 3.9 8.1a3.9 3.9 0 0 1-7.8 0c0-2.1 1.3-4.7 3.9-8.1Z" fill={MARIGOLD} />
        <path d="M16 8c1.2 1.7 1.8 3 1.8 4a1.8 1.8 0 0 1-3.6 0c0-1 .6-2.3 1.8-4Z" fill="#ffe3a3" />
      </g>
      <path d="M3 17.5h26c-1.2 5.6-6.3 9.5-13 9.5S4.2 23.1 3 17.5Z" fill={CLAY} />
      <path d="M3 17.5h26c-.2.9-.5 1.7-.9 2.5H3.9c-.4-.8-.7-1.6-.9-2.5Z" fill={CLAY_DARK} />
      <circle cx="10" cy="22.4" r="1" fill={MARIGOLD} />
      <circle cx="16" cy="23.6" r="1" fill={MARIGOLD} />
      <circle cx="22" cy="22.4" r="1" fill={MARIGOLD} />
    </svg>
  );
}

/** A marigold-and-mango-leaf garland that hangs from the top edge of its parent. Tiles at a fixed size, so it never stretches. */
export function Toran({ className = '' }: { className?: string }) {
  if (!FESTIVE) return null;
  return (
    <svg className={`pointer-events-none block w-full h-[18px] ${className}`} aria-hidden="true">
      <defs>
        <pattern id="toran-tile" width="40" height="18" patternUnits="userSpaceOnUse">
          <path d="M0 1.5 Q 20 10 40 1.5" fill="none" stroke={MARIGOLD} strokeOpacity="0.45" strokeWidth="1" />
          <path d="M20 5.8 v3" stroke={MARIGOLD} strokeOpacity="0.45" strokeWidth="1" />
          <circle cx="20" cy="11.5" r="3.2" fill={MARIGOLD} />
          <circle cx="20" cy="11.5" r="1.3" fill={SAFFRON} />
          <path d="M3 1.5 q 1.6 4.6 0 8 q -1.6 -3.4 0 -8Z" fill={LEAF} fillOpacity="0.75" />
          <path d="M37 1.5 q 1.6 4.6 0 8 q -1.6 -3.4 0 -8Z" fill={LEAF} fillOpacity="0.75" />
        </pattern>
      </defs>
      <rect width="100%" height="18" fill="url(#toran-tile)" />
    </svg>
  );
}

/** A dotted rangoli ring; draw it large and faint behind something. */
export function Rangoli({ size = 240, className = '' }: { size?: number; className?: string }) {
  if (!FESTIVE) return null;
  const petals = 12;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: petals }, (_, i) => (
        <path
          key={`p${i}`}
          d="M0 -18 C 6 -26 6 -36 0 -44 C -6 -36 -6 -26 0 -18 Z"
          fill="none"
          stroke={i % 2 ? SAFFRON : MARIGOLD}
          strokeWidth="0.6"
          transform={`rotate(${(360 / petals) * i})`}
        />
      ))}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return <circle key={`d${i}`} cx={r2(Math.cos(a) * 47)} cy={r2(Math.sin(a) * 47)} r="0.7" fill={MARIGOLD} />;
      })}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <circle key={`i${i}`} cx={r2(Math.cos(a) * 14)} cy={r2(Math.sin(a) * 14)} r="0.55" fill={SAFFRON} />;
      })}
    </svg>
  );
}
