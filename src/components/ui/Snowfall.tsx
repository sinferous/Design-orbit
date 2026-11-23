'use client';

import { useEffect, useRef } from 'react';

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  sway: number;
  phase: number;
  alpha: number;
}

/** Light snowfall drawn behind the app. Skipped for people who prefer reduced motion. */
export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let flakes: Flake[] = [];
    let raf = 0;
    let last = performance.now();

    const makeFlake = (startAnywhere: boolean): Flake => {
      const r = 0.6 + Math.random() * 1.6;
      return {
        x: Math.random() * w,
        y: startAnywhere ? Math.random() * h : -4,
        r,
        // Bigger flakes are nearer, so they fall a little faster
        speed: 12 + r * 11 + Math.random() * 9,
        sway: 6 + Math.random() * 12,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.2 + Math.random() * 0.4,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(24, Math.min(80, Math.round((w * h) / 20000)));
      while (flakes.length < count) flakes.push(makeFlake(true));
      flakes = flakes.slice(0, count);
    };

    const frame = (now: number) => {
      // Cap the step so a background tab does not dump all flakes at once
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#e8eef0';
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y += f.speed * dt;
        f.phase += dt * 0.8;
        const x = f.x + Math.sin(f.phase) * f.sway;
        if (f.y - f.r > h) {
          flakes[i] = makeFlake(false);
          continue;
        }
        ctx.globalAlpha = f.alpha;
        ctx.beginPath();
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />;
}

export default Snowfall;
