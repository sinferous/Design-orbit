'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Building2, Layers, AlertCircle } from 'lucide-react';
import { WorkEntryWithDetails } from '@/types';
import { updateWorkEntry } from '@/lib/services/work-entry';
import { useToast } from '@/components/ui/ToastContext';
import { triggerTinyConfetti } from '@/lib/utils/confetti';

interface QuickApprovalModalProps {
  entry: WorkEntryWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedEntry: WorkEntryWithDetails) => void;
}

export function QuickApprovalModal({
  entry,
  isOpen,
  onClose,
  onSuccess,
}: QuickApprovalModalProps) {
  const { showToast } = useToast();
  const [approvedQty, setApprovedQty] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (entry) {
      setApprovedQty(entry.quantity_approved || 0);
    }
  }, [entry]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !entry) return null;

  const maxQty = entry.quantity_done || 1;
  const isFullyApproved = approvedQty === maxQty;
  const isPartiallyApproved = approvedQty > 0 && approvedQty < maxQty;
  const isNotApproved = approvedQty === 0;

  const handleIncrement = () => {
    if (approvedQty < maxQty) {
      setApprovedQty(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (approvedQty > 0) {
      setApprovedQty(prev => prev - 1);
    }
  };

  const handleApproveAll = () => {
    setApprovedQty(maxQty);
  };

  const handleResetZero = () => {
    setApprovedQty(0);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const wasNotApproved = (entry.quantity_approved || 0) === 0;
      const isNowApproved = approvedQty > 0;

      const updated = await updateWorkEntry(entry.id, {
        quantity_approved: approvedQty,
        status: approvedQty > 0 ? 'Reviewed' : 'Submitted',
      });

      const fullUpdated: WorkEntryWithDetails = {
        ...entry,
        ...updated,
        quantity_approved: approvedQty,
        status: approvedQty > 0 ? 'Reviewed' : 'Submitted',
      };

      // When turning not approved to approved, pop a bit of tiny celebratory confetti!
      if (wasNotApproved && isNowApproved) {
        if (saveBtnRef.current) {
          const rect = saveBtnRef.current.getBoundingClientRect();
          const x = (rect.left + rect.width / 2) / window.innerWidth;
          const y = (rect.top + rect.height / 2) / window.innerHeight;
          triggerTinyConfetti({ origin: { x, y } });
        } else {
          triggerTinyConfetti();
        }
      }

      showToast(
        approvedQty > 0
          ? `Marked ${approvedQty} of ${maxQty} approved!`
          : 'Deliverable marked as Not Approved.',
        'success'
      );
      onSuccess(fullUpdated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update approval:', err);
      showToast(err.message || 'Failed to update approval status.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl shadow-black/80 border border-slate-700 overflow-hidden transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Update Approval</h3>
              <p className="text-[11px] text-slate-400">Set approved deliverables count</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Deliverable info card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-1.5 font-bold text-slate-200">
                <Building2 className="w-3.5 h-3.5 text-violet-400" />
                <span>{entry.client?.name || 'Client Work'}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-950 text-violet-300 border border-violet-800">
                {entry.work_type?.name || 'Deliverable'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-300 leading-snug line-clamp-2">
              {entry.description}
            </p>
          </div>

          {/* Stepper counter */}
          <div className="text-center space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Approved Deliverables
            </div>

            <div className="flex items-center justify-center space-x-4">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={approvedQty <= 0}
                className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-95 border border-slate-700"
                title="Decrease approved count"
              >
                -
              </button>

              <div className="px-5 py-2 bg-slate-950 border border-slate-800 rounded-xl min-w-[120px] shadow-inner">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {approvedQty}
                </span>
                <span className="text-sm font-bold text-slate-500 ml-1.5">
                  / {maxQty}
                </span>
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={approvedQty >= maxQty}
                className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-95 border border-slate-700"
                title="Increase approved count"
              >
                +
              </button>
            </div>

            {/* Status helper feedback */}
            <div className="pt-1">
              {isFullyApproved && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>✓ 100% Fully Approved ({approvedQty} of {maxQty})</span>
                </span>
              )}
              {isPartiallyApproved && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-950/70 text-violet-300 border border-violet-800/60">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  <span>Partially Approved ({approvedQty} of {maxQty})</span>
                </span>
              )}
              {isNotApproved && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>0 Approved &bull; Not Approved</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 mb-2">Quick Presets</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleApproveAll}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isFullyApproved
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/50'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>All Approved ({maxQty})</span>
              </button>

              <button
                type="button"
                onClick={handleResetZero}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isNotApproved
                    ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                    : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/50'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Not Approved (0)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            ref={saveBtnRef}
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold text-white webtree-gradient-btn rounded-lg shadow-sm hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
