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
        className={`p-4 rounded-xl border shadow-2xl shadow-black/80 flex items-start justify-between space-x-3 backdrop-blur-xl transition-all bg-slate-900/95 ${
          isError
            ? 'border-red-500/50 text-red-200 border-l-4 border-l-red-500'
            : 'border-emerald-500/50 text-emerald-200 border-l-4 border-l-emerald-500'
        }`}
      >
        <div className="flex items-start space-x-3">
          {isError ? (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {isError ? 'Notice' : 'Success'}
            </h4>
            <p className="text-xs sm:text-sm font-semibold mt-0.5 leading-snug text-slate-100">
              {message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
