'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const GONE_KEY = 'design_orbit_snowman_gone_at';
const RESPAWN_MS = 5 * 60_000;
const BURST_SIZE = 360;
/** Length of the build-up animation in globals.css (.snowman-build) */
const BUILD_MS = 2400;
/** Two full waves (.snowman-hi in globals.css) */
const WAVE_MS = 1400;
/** Squash before the burst */
const POP_MS = 160;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  spin: number;
  angle: number;
  square: boolean;
}

function readGoneAt(): number | null {
  try {
    const v = Number(localStorage.getItem(GONE_KEY));
    return v && Date.now() - v < RESPAWN_MS ? v : null;
  } catch {
    return null;
  }
}

/**
 * A small snowman. Click it and it bursts; it is rebuilt after 5 minutes.
 * The parent places it with className; it keeps its space while gone.
 */
export function Snowman({ className }: { className?: string }) {
  // null until mounted, so the server render and first client render match
  const [state, setState] = useState<'here' | 'gone' | 'building' | 'popping' | null>(null);
  const burstRef = useRef<HTMLCanvasElement>(null);
  const respawnTimer = useRef<number | null>(null);
  const buildTimer = useRef<number | null>(null);
  const [waving, setWaving] = useState(false);

  // Hover starts a wave that always finishes, so the arm never snaps back
  const wave = () => {
    if (waving || state !== 'here') return;
    setWaving(true);
    window.setTimeout(() => setWaving(false), WAVE_MS);
  };

  // Every appearance builds him up piece by piece, then he idles
  const build = () => {
    setState('building');
    if (buildTimer.current !== null) window.clearTimeout(buildTimer.current);
    buildTimer.current = window.setTimeout(() => setState('here'), BUILD_MS);
  };

  const scheduleRespawn = (goneAt: number) => {
    if (respawnTimer.current !== null) window.clearTimeout(respawnTimer.current);
    const wait = Math.max(0, goneAt + RESPAWN_MS - Date.now());
    respawnTimer.current = window.setTimeout(() => {
      try {
        localStorage.removeItem(GONE_KEY);
      } catch {
        // storage blocked: still rebuild
      }
      build();
    }, wait);
  };

  useEffect(() => {
    const goneAt = readGoneAt();
    const t = window.setTimeout(() => {
      if (goneAt) {
        setState('gone');
        scheduleRespawn(goneAt);
      } else {
        build();
      }
    }, 0);
    return () => {
      window.clearTimeout(t);
      if (respawnTimer.current !== null) window.clearTimeout(respawnTimer.current);
      if (buildTimer.current !== null) window.clearTimeout(buildTimer.current);
    };
    // runs once on mount; build and scheduleRespawn only use setters and refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const burst = () => {
    const canvas = burstRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = BURST_SIZE * dpr;
    canvas.height = BURST_SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Origin: the snowman's middle, at the centre of the canvas
    const ox = BURST_SIZE / 2;
    const oy = BURST_SIZE / 2;
    const palette = [
      ...Array(9).fill('#eef3f5'),
      ...Array(3).fill('#cfd8dc'),
      '#55cb98',
      '#55cb98',
      '#f08a3c',
      '#1c1c1a',
      '#1c1c1a',
      '#7a5a3a',
    ];
    const bits: Bit[] = Array.from({ length: 56 }, () => {
      const a = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 320;
      const color = palette[Math.floor(Math.random() * palette.length)];
      return {
        x: ox + (Math.random() - 0.5) * 24,
        y: oy + (Math.random() - 0.5) * 40,
        vx: Math.cos(a) * speed - 60,
        vy: Math.sin(a) * speed - 180,
        r: color === '#eef3f5' || color === '#cfd8dc' ? 2 + Math.random() * 4 : 1.5 + Math.random() * 2.5,
        color,
        spin: (Math.random() - 0.5) * 12,
        angle: Math.random() * Math.PI,
        square: color !== '#eef3f5' && color !== '#cfd8dc',
      };
    });

    const start = performance.now();
    let last = start;
    const life = 1300;
    const frame = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const t = (now - start) / life;
      ctx.clearRect(0, 0, BURST_SIZE, BURST_SIZE);
      if (t >= 1) return;
      ctx.globalAlpha = 1 - t * t;
      for (const b of bits) {
        b.vy += 700 * dt;
        b.vx *= 0.985;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.angle += b.spin * dt;
        ctx.fillStyle = b.color;
        if (b.square) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.angle);
          ctx.fillRect(-b.r, -b.r / 2, b.r * 2, b.r);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const knockOver = () => {
    if (state !== 'here') return;
    const now = Date.now();
    try {
      localStorage.setItem(GONE_KEY, String(now));
    } catch {
      // storage blocked: it still comes back on this page
    }
    setState('popping');
    window.setTimeout(() => {
      burst();
      setState('gone');
      scheduleRespawn(now);
    }, POP_MS);
  };

  return (
    <div className={cn('relative z-20 w-16 h-[76px]', className)}>
      <canvas
        ref={burstRef}
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ width: BURST_SIZE, height: BURST_SIZE }}
      />
      {(state === 'here' || state === 'building' || state === 'popping') && (
        <button
          type="button"
          onClick={knockOver}
          onPointerEnter={wave}
          onFocus={wave}
          aria-label="Snowman. Click to knock it over."
          title="Click me"
          className={cn(
            'snowman absolute inset-0 cursor-pointer select-none bg-transparent border-0 p-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400',
            state === 'building' && 'snowman-build',
            state === 'here' && 'snowman-idle',
            state === 'here' && waving && 'snowman-hi',
            state === 'popping' && 'snowman-pop'
          )}
        >
          <SnowmanArt />
        </button>
      )}
    </div>
  );
}

export default Snowman;

function SnowmanArt() {
  return (
    <svg viewBox="0 0 64 76" className="w-full h-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id="sm-snow" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#e9f0f3" />
          <stop offset="100%" stopColor="#c9d6dc" />
        </radialGradient>
        <linearGradient id="sm-hat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6fdcac" />
          <stop offset="100%" stopColor="#47b886" />
        </linearGradient>
      </defs>

      <ellipse className="sm-shadow" cx="32" cy="73" rx="17" ry="2.6" fill="#000" opacity="0.35" />

      <g className="sm-all">
        {/* arms sit behind the body */}
        <g className="sm-arm-l">
          <path d="M19 52 Q12 49 8 44" stroke="#8a6644" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M10 46 L6.5 45.5 M10 46 L9 42.5" stroke="#8a6644" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </g>
        <g className="sm-arm-r">
          <path d="M45 52 Q52 49 56 44" stroke="#8a6644" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M54 46 L57.5 45.5 M54 46 L55 42.5" stroke="#8a6644" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </g>

        {/* body */}
        <g className="sm-body">
          <circle cx="32" cy="57" r="15.5" fill="url(#sm-snow)" />
          <circle cx="32" cy="53" r="1.5" fill="#2a2a27" />
          <circle cx="32" cy="59.5" r="1.5" fill="#2a2a27" />
        </g>

        {/* head, scarf and hat lean together on hover */}
        <g className="sm-lean">
        <g className="sm-head">
          <circle cx="32" cy="30" r="13" fill="url(#sm-snow)" />
          <g className="sm-eyes">
            <ellipse cx="27" cy="29.5" rx="1.9" ry="2.4" fill="#22221f" />
            <ellipse cx="37" cy="29.5" rx="1.9" ry="2.4" fill="#22221f" />
            <circle cx="27.6" cy="28.6" r="0.7" fill="#fff" />
            <circle cx="37.6" cy="28.6" r="0.7" fill="#fff" />
          </g>
          <ellipse cx="23" cy="33.5" rx="2.6" ry="1.5" fill="#ff8fa3" opacity="0.5" />
          <ellipse cx="41" cy="33.5" rx="2.6" ry="1.5" fill="#ff8fa3" opacity="0.5" />
          <path d="M31.5 31.6 Q37.5 32.6 38.6 33.4 Q37.4 34.2 31.5 34 Z" fill="#f59a4a" />
          <path d="M29.4 36 Q32 37.8 34.6 36" stroke="#22221f" strokeWidth="1" strokeLinecap="round" fill="none" />
        </g>

        {/* scarf */}
        <g className="sm-scarf">
          <path d="M20 41.5 Q32 46.5 44 41.5 Q44.8 44 44 45.5 Q32 50.5 20 45.5 Q19.2 44 20 41.5 Z" fill="#55cb98" />
          <path d="M23 43.2 L23 47 M27 44.2 L27 48" stroke="#3fae7f" strokeWidth="1" opacity="0.7" />
          <g className="sm-scarf-tail">
            <path d="M37 45.5 Q39.5 51 38 56 L42.5 55 Q43.5 50 41 44.5 Z" fill="#4cbf8e" />
            <path d="M38.2 55.8 L38 57.6 M40.3 55.4 L40.4 57.2 M42.3 55 L42.7 56.8" stroke="#3fae7f" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </g>

        {/* beanie */}
        <g className="sm-hat">
          <path d="M19.6 25.5 Q19 13 32 12.5 Q45 13 44.4 25.5 Z" fill="url(#sm-hat)" />
          <rect x="18.4" y="22.6" width="27.2" height="5" rx="2.5" fill="#3fae7f" />
          <circle className="sm-pom" cx="32" cy="11" r="3.4" fill="#f4f8f9" />
        </g>
        </g>
      </g>
    </svg>
  );
}
