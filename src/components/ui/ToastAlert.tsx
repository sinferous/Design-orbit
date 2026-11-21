'use client';

import { useEffect, useState, useRef } from 'react';
import { Check, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAlertProps {
  message: string | null;
  type?: ToastType;
  title?: string;
  onClose: () => void;
  autoCloseDuration?: number;
  isStandalone?: boolean;
}

// One quiet card for every toast; only the small icon and the timer line carry the tone
const TONES = {
  success: { icon: Check, iconClass: 'text-emerald-400 bg-emerald-400/10', line: 'bg-emerald-400/70' },
  error: { icon: AlertCircle, iconClass: 'text-rose-400 bg-rose-400/10', line: 'bg-rose-400/70' },
  warning: { icon: AlertTriangle, iconClass: 'text-amber-400 bg-amber-400/10', line: 'bg-amber-400/70' },
  info: { icon: Info, iconClass: 'text-slate-300 bg-white/[0.06]', line: 'bg-slate-400/60' },
} as const;

export function ToastAlert({
  message,
  type = 'success',
  title,
  onClose,
  autoCloseDuration = 4500,
  isStandalone = true,
}: ToastAlertProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(autoCloseDuration);

  useEffect(() => {
    if (!message) return;
    remainingTimeRef.current = autoCloseDuration;
    setProgress(100);
  }, [message, autoCloseDuration]);

  useEffect(() => {
    if (!message) return;
    if (isPaused) return;

    const tickMs = 25;
    const interval = setInterval(() => {
      remainingTimeRef.current -= tickMs;
      const pct = Math.max(0, (remainingTimeRef.current / autoCloseDuration) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, tickMs);

    return () => clearInterval(interval);
  }, [message, autoCloseDuration, onClose, isPaused]);

  if (!message) return null;

  const tone = TONES[type] || TONES.info;
  const IconComponent = tone.icon;

  const cardContent = (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#161615] shadow-[0_16px_40px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-start gap-3 p-3.5 pr-2.5">
        <span className={`mt-px inline-flex w-6 h-6 shrink-0 items-center justify-center rounded-full ${tone.iconClass}`}>
          <IconComponent className="w-3.5 h-3.5" strokeWidth={2.25} />
        </span>

        <div className="flex-1 min-w-0 pt-0.5">
          {title && <p className="text-sm font-medium text-slate-100 leading-snug">{title}</p>}
          <p className={`text-sm leading-snug break-words ${title ? 'text-slate-400 mt-0.5' : 'text-slate-100'}`}>
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex w-6 h-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Time left before it closes */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-white/[0.04]">
        <div
          className={`h-full w-full origin-left ${tone.line}`}
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="fixed top-5 right-5 z-[9999] w-full max-w-sm px-4 sm:px-0">
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
