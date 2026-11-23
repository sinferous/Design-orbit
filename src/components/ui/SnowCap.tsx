'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * A soft drift of snow resting on the left part of a card's top edge.
 * The shape is drawn for the card's real width (no stretching) from a fixed seed,
 * so it looks the same on every visit. Place inside a `relative` wrapper around the card.
 */

const EDGE_Y = 32; // the card's top edge inside the drawing
const HEIGHT = 52; // snow above the edge plus what hangs over it
const CORNER = 16; // matches .bento-card border-radius (1rem)
const INSET = 4; // the drift reaches a little past each side

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How far the card's rounded corner drops below the top edge at x */
function cornerDrop(x: number, w: number) {
  const fromEdge = Math.min(x - INSET, w - INSET - x);
  if (fromEdge >= CORNER) return 0;
  const d = CORNER - Math.max(0, fromEdge);
  return CORNER - Math.sqrt(Math.max(0, CORNER * CORNER - d * d));
}

/** Smooth path through points, using midpoints as curve ends */
function smooth(points: [number, number][]) {
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    const mx = (x + nx) / 2;
    const my = (y + ny) / 2;
    d += i === 0 ? `L${x.toFixed(1)} ${y.toFixed(1)} ` : '';
    d += `Q${x.toFixed(1)} ${y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)} `;
  }
  const last = points[points.length - 1];
  return d + `L${last[0].toFixed(1)} ${last[1].toFixed(1)} `;
}

interface Speck {
  x: number;
  y: number;
  r: number;
  o: number;
}

function buildDrift(w: number) {
  const rand = rng(20261123);
  const step = 3;
  const left = INSET - 1;
  // Only the left corner: about 40% of the card, thinning out into a tail
  const right = Math.min(w - INSET + 1, Math.max(200, Math.min(w * 0.42, 440)));
  const TAIL = 110;

  // Soft rolling top: a few slow waves plus small lumps
  const p1 = rand() * 6.28;
  const p2 = rand() * 6.28;
  const p3 = rand() * 6.28;

  // Small clumps on the crest so it reads as packed snow, not a smooth band
  const clumps: { c: number; s: number; a: number }[] = [];
  for (let x = left + 6; x < right; x += 5 + rand() * 9) {
    clumps.push({ c: x, s: 3 + rand() * 6, a: 0.8 + rand() * 2.6 });
  }
  const thickness = (x: number) => {
    let t =
      10 +
      3 * Math.sin(x / 95 + p1) +
      1.6 * Math.sin(x / 37 + p2) +
      0.8 * Math.sin(x / 13 + p3) +
      // a heavier pile in the corner
      8 * Math.exp(-(x - left) / 120);
    for (const c of clumps) {
      const d = (x - c.c) / c.s;
      if (d > -2.5 && d < 2.5) t += c.a * Math.exp(-d * d);
    }
    return t;
  };

  // Rounded drips of snow over the edge
  const drips: { c: number; half: number; depth: number }[] = [];
  for (let x = 30 + rand() * 30; x < right - TAIL * 0.6; x += 38 + rand() * 60) {
    drips.push({ c: x, half: 8 + rand() * 14, depth: 3 + rand() * 6 });
  }
  const overhang = (x: number) => {
    let d = 2.5;
    for (const dr of drips) {
      const t = (x - dr.c) / dr.half;
      if (t > -1 && t < 1) d = Math.max(d, 2.5 + dr.depth * Math.cos((t * Math.PI) / 2) ** 2);
    }
    return d;
  };

  // Round the left end over the card corner; let the right end thin out slowly
  const endTaper = (x: number) => {
    const fromLeft = x - left;
    const fromRight = right - x;
    const kl = fromLeft > 26 ? 1 : Math.sin(((Math.max(0, fromLeft) / 26) * Math.PI) / 2);
    const kr = fromRight > TAIL ? 1 : Math.sin(((Math.max(0, fromRight) / TAIL) * Math.PI) / 2);
    return Math.min(kl, kr);
  };

  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let x = left; x <= right + 0.1; x += step) {
    const xx = Math.min(x, right);
    const drop = cornerDrop(xx, w);
    const k = endTaper(xx);
    top.push([xx, EDGE_Y + drop - thickness(xx) * Math.max(0.3, k)]);
    bottom.push([xx, EDGE_Y + drop + overhang(xx) * Math.max(0.35, k)]);
  }
  const startY = EDGE_Y + cornerDrop(left, w);
  const endY = EDGE_Y + cornerDrop(right, w);

  // Rounded ends: curve from the underside up to the crest at each end
  const b0 = bottom[0];
  const bN = bottom[bottom.length - 1];
  const t0 = top[0];
  const body =
    `M${b0[0].toFixed(1)} ${b0[1].toFixed(1)} ` +
    `Q${(left - 5).toFixed(1)} ${startY.toFixed(1)} ${t0[0].toFixed(1)} ${t0[1].toFixed(1)} ` +
    smooth(top) +
    `Q${(right + 5).toFixed(1)} ${endY.toFixed(1)} ${bN[0].toFixed(1)} ${bN[1].toFixed(1)} ` +
    smooth([...bottom].reverse()) +
    'Z';

  // Highlight along the crest
  const crest = smooth(top.filter((_, i) => i > 3 && i < top.length - 4).map(([x, y]) => [x, y + 1.4]));
  const crestStart = top[4] ? `M${top[4][0].toFixed(1)} ${(top[4][1] + 1.4).toFixed(1)} ` : '';

  // Underside shade, a touch lower
  const shade = `M${left} ${startY.toFixed(1)} ` + smooth(bottom.map(([x, y]) => [x, y - 4])) + smooth([...bottom].reverse()) + 'Z';

  // A few sparkles on top
  const sparkles: Speck[] = [];
  for (let i = 0; i < top.length; i += 2) {
    const [sx, sy] = top[i];
    if (rand() < 0.06) sparkles.push({ x: sx, y: sy + 2 + rand() * 4, r: 0.8 + rand() * 0.6, o: rand() * 4 });
  }

  return { body, crest: crestStart + crest, shade, sparkles };
}

export function SnowCap() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const drift = useMemo(() => (width > 0 ? buildDrift(width) : null), [width]);

  return (
    <div
      ref={ref}
      className="snowcap pointer-events-none absolute z-10"
      style={{ left: -INSET, right: -INSET, top: -EDGE_Y, height: HEIGHT }}
      aria-hidden="true"
    >
      {drift && (
        <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} className="block overflow-visible">
          <defs>
            <linearGradient id="snowcap-snow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f2f7fa" />
              <stop offset="100%" stopColor="#d9e7ee" />
            </linearGradient>
            <filter id="snowcap-soft" x="-5%" y="-50%" width="110%" height="200%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
            {/* roughens the outline so the edge looks fluffy, not drawn */}
            <filter id="snowcap-fluff" x="-3%" y="-40%" width="106%" height="180%">
              <feTurbulence type="fractalNoise" baseFrequency="0.2" numOctaves="2" seed="7" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            {/* fine powdery grain */}
            <filter id="snowcap-grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="3" />
              <feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.72  0 0 0 0 0.8  0 0 0 -1.7 1.05" />
            </filter>
            <filter id="snowcap-blur" x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="1.6" />
            </filter>
            <clipPath id="snowcap-clip">
              <path d={drift.body} />
            </clipPath>
          </defs>

          {/* soft shadow the drift casts on the card */}
          <path d={drift.body} fill="#000" opacity="0.4" transform="translate(0 2.5)" filter="url(#snowcap-soft)" />

          {/* the drift: soft shade underneath, powdery grain, bright crest, fluffy edge */}
          <g filter="url(#snowcap-fluff)">
            <path d={drift.body} fill="url(#snowcap-snow)" />
            <g clipPath="url(#snowcap-clip)">
              <path d={drift.shade} fill="#93b4c6" opacity="0.55" filter="url(#snowcap-blur)" transform="translate(0 1)" />
              <rect x="0" y="0" width={width} height={EDGE_Y + 20} filter="url(#snowcap-grain)" opacity="0.45" />
            </g>
            <path d={drift.crest} stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" filter="url(#snowcap-blur)" />
          </g>

          {/* sparkles */}
          {drift.sparkles.map((p, i) => (
            <path
              key={`k${i}`}
              className="snowcap-sparkle"
              d={`M${p.x} ${p.y - p.r * 2.2} L${p.x + p.r * 0.45} ${p.y} L${p.x} ${p.y + p.r * 2.2} L${p.x - p.r * 0.45} ${p.y} Z M${p.x - p.r * 2.2} ${p.y} L${p.x} ${p.y + p.r * 0.45} L${p.x + p.r * 2.2} ${p.y} L${p.x} ${p.y - p.r * 0.45} Z`}
              fill="#ffffff"
              style={{ animationDelay: `${p.o}s` }}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

export default SnowCap;
