'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastAlert } from './ToastAlert';
import { ConfirmModal } from './ConfirmModal';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
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
  showToast: (message: string, type?: 'success' | 'error') => void;
  confirmDialog: (config: ConfirmDialogConfig) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<(ConfirmDialogConfig & { isOpen: boolean }) | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, message, type }]);
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
      
      {/* Global Toast Notifications Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-3 pointer-events-none max-w-sm sm:max-w-md w-full px-4 sm:px-0">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastAlert
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
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
      showToast: (message: string, type: 'success' | 'error' = 'success') => {
        console.log(`[Toast ${type}]: ${message}`);
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
