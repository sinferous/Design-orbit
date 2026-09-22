'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastAlert, ToastType } from './ToastAlert';
import { ConfirmModal } from './ConfirmModal';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  confirmDialog: (config: ConfirmDialogConfig) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<(ConfirmDialogConfig & { isOpen: boolean }) | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success', title?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    // Keep max 4 stacked toasts to keep viewport uncluttered
    setToasts(prev => [...prev.slice(-3), { id, message, type, title }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const confirmDialog = useCallback((config: ConfirmDialogConfig) => {
    setConfirmConfig({ ...config, isOpen: true });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmConfig(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, confirmDialog }}>
      {children}
      
      {/* Global Toast Notifications Container - Positioned Top Right with Dynamic Stacking */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col space-y-3 pointer-events-none max-w-sm sm:max-w-md w-full px-4 sm:px-0">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastAlert
              message={toast.message}
              type={toast.type}
              title={toast.title}
              onClose={() => removeToast(toast.id)}
              isStandalone={false}
            />
          </div>
        ))}
      </div>

      {/* Global Custom Confirm Dialog Modal */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          cancelText={confirmConfig.cancelText}
          variant={confirmConfig.variant}
          onConfirm={confirmConfig.onConfirm}
          onClose={closeConfirm}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (message: string, type: ToastType = 'success', title?: string) => {
        console.log(`[Toast ${type}]: ${message} (Title: ${title || 'Notice'})`);
      },
      confirmDialog: (config: ConfirmDialogConfig) => {
        if (typeof window !== 'undefined' && confirm(`${config.title}\n\n${config.message}`)) {
          config.onConfirm();
        }
      },
    };
  }
  return context;
}
