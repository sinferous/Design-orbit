'use client';

import confetti from 'canvas-confetti';

export interface ConfettiOptions {
  origin?: { x?: number; y?: number };
  particleCount?: number;
}

/**
 * Triggers a delicate burst of tiny celebratory confetti flakes
 * specifically tailored for Design Orbit approval actions.
 */
export function triggerTinyConfetti(options?: ConfettiOptions) {
  if (typeof window === 'undefined') return;

  const origin = options?.origin ?? { x: 0.5, y: 0.55 };
  const baseCount = options?.particleCount ?? 35;

  const colors = [
    '#a855f7', // violet-500
    '#c084fc', // violet-400
    '#10b981', // emerald-500
    '#34d399', // emerald-400
    '#f59e0b', // amber-500
    '#fbbf24', // amber-400
    '#ec4899', // pink-500
    '#818cf8', // indigo-400
  ];

  // Primary burst of delicate, tiny confetti
  confetti({
    particleCount: baseCount,
    spread: 55,
    startVelocity: 24,
    ticks: 150,
    gravity: 1.1,
    origin,
    scalar: 0.65, // Deliberately tiny flakes as requested
    shapes: ['circle', 'square'],
    colors,
    zIndex: 100000,
    disableForReducedMotion: true,
  });

  // Soft secondary twinkle burst for that extra delightful pop
  setTimeout(() => {
    confetti({
      particleCount: Math.round(baseCount * 0.5),
      spread: 70,
      startVelocity: 18,
      ticks: 130,
      gravity: 1.2,
      origin: { x: origin.x, y: Math.max(0.1, (origin.y ?? 0.55) - 0.02) },
      scalar: 0.55,
      shapes: ['circle'],
      colors,
      zIndex: 100000,
      disableForReducedMotion: true,
    });
  }, 90);
}
