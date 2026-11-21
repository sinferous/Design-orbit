'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus } from 'lucide-react';
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
  const isNotApproved = approvedQty === 0;
  const unchanged = approvedQty === (entry.quantity_approved || 0);

  const status = isFullyApproved
    ? { dot: 'bg-emerald-400', text: maxQty === 1 ? 'Approved' : 'All approved' }
    : isNotApproved
      ? { dot: 'bg-amber-400', text: 'Not approved yet' }
      : { dot: 'bg-emerald-400/60', text: 'Partly approved' };

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

      // A small burst from the save button when something gets its first approval
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
        approvedQty > 0 ? `${approvedQty} of ${maxQty} approved` : 'Marked as not approved',
        'success'
      );
      onSuccess(fullUpdated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update approval:', err);
      showToast(err.message || 'Could not save the approval. Try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const stepBtn =
    'inline-flex w-10 h-10 items-center justify-center rounded-full border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent';

  const presetBtn = (active: boolean) =>
    `h-8 px-3 rounded-md text-sm transition-colors cursor-pointer ${
      active ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-slate-200'
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-150"
      onClick={() => !isSaving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-title"
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#141413] shadow-[0_24px_60px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-[0.98] duration-150"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* What is being approved */}
        <div className="p-5 pr-12">
          <p className="text-xs text-slate-500">
            {entry.client?.name || 'Client work'}
            <span className="mx-1.5 text-slate-700">·</span>
            {entry.work_type?.name || 'Deliverable'}
          </p>
          <h3 id="approval-title" className="mt-1 text-base font-medium text-slate-50 leading-snug line-clamp-2">
            {entry.description}
          </h3>
        </div>

        {/* Approved count */}
        <div className="px-5 pb-5">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setApprovedQty(q => Math.max(0, q - 1))}
                disabled={approvedQty <= 0}
                className={stepBtn}
                aria-label="One fewer approved"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="text-center" aria-live="polite">
                <div className="font-display text-4xl font-medium text-white tabular-nums leading-none">
                  {approvedQty}
                  <span className="text-lg text-slate-500"> / {maxQty}</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.text}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setApprovedQty(q => Math.min(maxQty, q + 1))}
                disabled={approvedQty >= maxQty}
                className={stepBtn}
                aria-label="One more approved"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">Set to</span>
            <div className="inline-flex gap-1 rounded-lg bg-white/[0.03] p-0.5">
              <button type="button" onClick={() => setApprovedQty(0)} className={presetBtn(isNotApproved)}>
                None
              </button>
              <button type="button" onClick={() => setApprovedQty(maxQty)} className={presetBtn(isFullyApproved)}>
                All {maxQty}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-9 px-3.5 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            ref={saveBtnRef}
            type="button"
            onClick={handleSave}
            disabled={isSaving || unchanged}
            className="h-9 px-4 text-sm font-medium rounded-lg bg-emerald-500 text-[#0b1410] hover:bg-emerald-400 transition-colors cursor-pointer btn-tactile disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
