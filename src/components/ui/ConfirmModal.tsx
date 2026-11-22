'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  // Escape closes the dialog
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-150"
      onClick={() => !busy && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#141413] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-[0.98] duration-150"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute top-3.5 right-3.5 inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="pr-8 space-y-1.5">
          <h3 id="confirm-title" className="text-base font-medium text-slate-50">
            {title}
          </h3>
          <p id="confirm-message" className="text-sm text-slate-400 leading-relaxed whitespace-pre-line select-text">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-9 px-3.5 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            autoFocus
            onClick={handleConfirm}
            disabled={busy}
            className={`h-9 px-3.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer btn-tactile disabled:opacity-60 ${
              isDanger
                ? 'text-rose-200 bg-rose-500/[0.12] border-rose-500/30 hover:bg-rose-500/20 hover:text-white'
                : 'text-slate-100 bg-white/[0.06] border-white/[0.1] hover:bg-white/[0.1]'
            }`}
          >
            {busy ? 'Working…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
