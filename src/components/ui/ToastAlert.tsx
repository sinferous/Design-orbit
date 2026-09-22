'use client';

import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Sparkles } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAlertProps {
  message: string | null;
  type?: ToastType;
  title?: string;
  onClose: () => void;
  autoCloseDuration?: number;
  isStandalone?: boolean;
}

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

  const styleConfig = {
    success: {
      defaultTitle: 'Completed',
      icon: CheckCircle2,
      iconContainer: 'bg-violet-500/15 border-violet-500/30 text-violet-300 shadow-[0_0_16px_rgba(168,85,247,0.35)]',
      badgeClass: 'bg-violet-950/80 text-violet-300 border-violet-700/60',
      borderGlow: 'border-violet-500/35 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.9),0_0_24px_-4px_rgba(168,85,247,0.25)]',
      progressGradient: 'from-violet-500 via-fuchsia-400 to-indigo-500',
      accentDot: 'bg-violet-400',
    },
    error: {
      defaultTitle: 'Attention',
      icon: AlertCircle,
      iconContainer: 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.35)]',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
      borderGlow: 'border-rose-500/35 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.9),0_0_24px_-4px_rgba(244,63,94,0.25)]',
      progressGradient: 'from-rose-500 via-red-500 to-amber-500',
      accentDot: 'bg-rose-400',
    },
    warning: {
      defaultTitle: 'Notice',
      icon: AlertTriangle,
      iconContainer: 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.35)]',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
      borderGlow: 'border-amber-500/35 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.9),0_0_24px_-4px_rgba(245,158,11,0.25)]',
      progressGradient: 'from-amber-500 via-yellow-400 to-amber-600',
      accentDot: 'bg-amber-400',
    },
    info: {
      defaultTitle: 'Update',
      icon: Info,
      iconContainer: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 shadow-[0_0_16px_rgba(99,102,241,0.35)]',
      badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60',
      borderGlow: 'border-indigo-500/35 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.9),0_0_24px_-4px_rgba(99,102,241,0.25)]',
      progressGradient: 'from-indigo-500 via-violet-400 to-purple-500',
      accentDot: 'bg-indigo-400',
    },
  }[type] || {
    defaultTitle: 'Notice',
    icon: Sparkles,
    iconContainer: 'bg-violet-500/15 border-violet-500/30 text-violet-300 shadow-[0_0_16px_rgba(168,85,247,0.35)]',
    badgeClass: 'bg-violet-950/80 text-violet-300 border-violet-700/60',
    borderGlow: 'border-violet-500/35 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.9),0_0_24px_-4px_rgba(168,85,247,0.25)]',
    progressGradient: 'from-violet-500 via-fuchsia-400 to-indigo-500',
    accentDot: 'bg-violet-400',
  };

  const IconComponent = styleConfig.icon;
  const displayTitle = title || styleConfig.defaultTitle;

  const cardContent = (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-b from-slate-900/95 via-slate-950/98 to-slate-950/95 backdrop-blur-2xl transition-all duration-300 ${styleConfig.borderGlow} animate-in fade-in slide-in-from-top-3 sm:slide-in-from-right-3 duration-250`}
    >
      {/* Top Subtle Edge Rim Light */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Main Toast Content Body */}
      <div className="p-3.5 sm:p-4 flex items-start justify-between gap-3">
        {/* Left: Glowing Icon Squircle */}
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200 ${styleConfig.iconContainer}`}
        >
          <IconComponent className="w-4.5 h-4.5" />
        </div>

        {/* Center: Title + Message */}
        <div className="flex-1 min-w-0 pt-0.5 space-y-1">
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs ${styleConfig.badgeClass}`}
            >
              {displayTitle}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${styleConfig.accentDot} animate-pulse`} />
            <span className="text-[10px] font-semibold text-slate-500">Design Orbit</span>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug break-words">
            {message}
          </p>
        </div>

        {/* Right: Close Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0 cursor-pointer"
          title="Dismiss notification"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Animated Auto-Dismiss Progress Bar */}
      <div className="w-full h-[2.5px] bg-slate-800/60 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${styleConfig.progressGradient} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="fixed top-5 right-5 z-[9999] max-w-sm sm:max-w-md w-full px-4 sm:px-0">
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
