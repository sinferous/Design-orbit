'use client';

import React from 'react';
import { AlertTriangle, Trash2, X, Check } from 'lucide-react';

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
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl shadow-black/80 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isDanger
                ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
            }`}
          >
            {isDanger ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>

          <div className="space-y-1.5 pt-0.5">
            <h3 className="text-lg font-extrabold text-slate-100 leading-tight">{title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
            }`}
          >
            {isDanger ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
