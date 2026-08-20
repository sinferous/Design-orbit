'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ToastAlertProps {
  message: string | null;
  type?: 'error' | 'success';
  onClose: () => void;
  autoCloseDuration?: number;
}

export function ToastAlert({
  message,
  type = 'error',
  onClose,
  autoCloseDuration = 5000,
}: ToastAlertProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseDuration);

    return () => clearTimeout(timer);
  }, [message, autoCloseDuration, onClose]);

  if (!message) return null;

  const isError = type === 'error';

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm sm:max-w-md w-full px-4 sm:px-0 animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`p-4 rounded-xl border shadow-xl flex items-start justify-between space-x-3 backdrop-blur-md transition-all ${
          isError
            ? 'bg-red-900/90 text-white border-red-700 shadow-red-900/20'
            : 'bg-emerald-900/90 text-white border-emerald-700 shadow-emerald-900/20'
        }`}
      >
        <div className="flex items-start space-x-3">
          {isError ? (
            <AlertCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              {isError ? 'Notice' : 'Success'}
            </h4>
            <p className="text-xs sm:text-sm font-semibold mt-0.5 leading-snug">
              {message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
