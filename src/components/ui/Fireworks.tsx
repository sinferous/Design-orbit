'use client';

import { useEffect, useRef } from 'react';
import { FESTIVE } from '@/components/ui/Diwali';

const COLORS = ['#f2a93b', '#e8792b', '#ffd27a', '#55cb98', '#fff4dc'];
const MAX_PARTICLES = 360;
const MIN_GUTTER = 90; // px of empty space needed beside the content before we draw there

type Rocket = { x: number; y: number; vy: number; targetY: number; color: string };
type Spark = { x: number; y: number; px: number; py: number; vx: number; vy: number; life: number; decay: number; color: string };

/**
 * Quiet Diwali fireworks drawn on a fixed canvas, bursting only in the empty
 * gutters to the left and right of the page's <main> column. Pauses when the
 * tab is hidden and does nothing for people who prefer reduced motion.
 */
export function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!FESTIVE) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

    // Free horizontal bands (canvas coordinates) on each side of <main>'s content.
    const gutters = (): [number, number][] => {
      const main = document.querySelector('main');
      const c = canvas.getBoundingClientRect();
      if (!main) return [];
      const inner = main.firstElementChild?.getBoundingClientRect() ?? main.getBoundingClientRect();
      const left: [number, number] = [24, inner.left - c.left - 24];
      const right: [number, number] = [inner.right - c.left + 24, w - 24];
      return [left, right].filter(([a, b]) => b - a >= MIN_GUTTER);
    };

    // Gutters are re-measured a few times a second, not every frame.
    let bands: [number, number][] = [];
    let bandsAt = 0;

    const launch = () => {
      if (!bands.length || sparks.length > MAX_PARTICLES * 0.7) return;
      const [a, b] = pick(bands);
      rockets.push({
        x: a + Math.random() * (b - a),
        y: h + 10,
        vy: -(7 + Math.random() * 2),
        targetY: h * (0.12 + Math.random() * 0.4),
        color: pick(COLORS),
      });
    };

    const burst = (x: number, y: number, color: string) => {
      const n = 34 + Math.floor(Math.random() * 18);
      const speed = 2.6 + Math.random() * 1.8;
      for (let i = 0; i < n && sparks.length < MAX_PARTICLES; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
        const s = speed * (0.6 + Math.random() * 0.5);
        sparks.push({
          x, y, px: x, py: y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
          decay: 0.009 + Math.random() * 0.007,
          color: Math.random() < 0.25 ? '#fff4dc' : color,
        });
      }
    };

    let raf = 0;
    let last = performance.now();
    let nextLaunch = last + 600;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      if (now > nextLaunch) {
        launch();
        nextLaunch = now + 1400 + Math.random() * 2200;
      }

      if (now - bandsAt > 400) {
        bands = gutters();
        bandsAt = now;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      // Draw only inside the gutters, so sparks never cross the page content.
      ctx.save();
      ctx.beginPath();
      for (const [a, b] of bands) ctx.rect(a - 24, 0, b - a + 48, h);
      ctx.clip();

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        const py = r.y;
        r.y += r.vy * dt;
        r.vy *= 0.995;
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(r.x, py + 10);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
        if (r.y <= r.targetY || r.vy > -1.2) {
          burst(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.px = s.x;
        s.py = s.y;
        s.vx *= 0.975;
        s.vy = s.vy * 0.975 + 0.035 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= s.decay * dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.min(1, s.life * 1.1) * 0.85;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.px - s.vx * 2.5, s.py - s.vy * 2.5);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!FESTIVE) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 md:left-64 lg:left-68 z-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
