'use client';

import { useState } from 'react';
import { WorkEntryWithDetails } from '@/types';
import {
  generateEmailTableHtml,
  generateCleanPlainText,
  copyToClipboardWithHtml,
  formatEmailSubject,
} from '@/lib/services/email-formatter';
import { X, Copy, Check, Mail, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface EmailDayLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: WorkEntryWithDetails[];
  designerName: string;
  selectedDate: string;
}

export function EmailDayLogModal({
  isOpen,
  onClose,
  entries,
  designerName,
  selectedDate,
}: EmailDayLogModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const tableHtml = generateEmailTableHtml(entries, designerName, selectedDate);
  const plainText = generateCleanPlainText(entries, designerName, selectedDate);
  const emailSubject = formatEmailSubject(selectedDate);

  const handleCopyRich = async () => {
    const success = await copyToClipboardWithHtml(tableHtml, plainText);
    if (success) {
      setCopiedType('rich');
      showToast('Copied Rich Email Format! Paste (Ctrl+V) directly into Gmail or Outlook.', 'success');
      setTimeout(() => setCopiedType(null), 2500);
    } else {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleCopyPlain = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopiedType('plain');
      showToast('Copied clean plain-text to clipboard!', 'success');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      showToast('Failed to copy text', 'error');
    }
  };

  const handleCopySubject = async () => {
    try {
      await navigator.clipboard.writeText(emailSubject);
      setCopiedType('subject');
      showToast('Copied email subject line!', 'success');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      showToast('Failed to copy subject', 'error');
    }
  };

  const handleOpenMailto = () => {
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(plainText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#141413] rounded-2xl shadow-2xl shadow-black/80 border border-white/[0.08] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between bg-[#0c0c0b]">
          <div className="flex items-center space-x-3">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Email Daily Work Log
              </h3>
              <p className="text-xs text-slate-400">
                Formatted for clean rendering in Gmail, Outlook, Apple Mail, and messaging apps.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0c0c0b]">
          <div className="bg-[#141413] rounded-xl border border-white/[0.07] shadow-sm p-6 max-w-3xl mx-auto">
            {/* Mock Email Client Header */}
            <div className="border-b border-white/[0.07] pb-3 mb-4 text-xs text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-200">
                    <strong className="font-semibold">Subject: </strong>
                    <span className="text-slate-100 font-medium">{emailSubject}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySubject}
                    className="p-1 hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer"
                    title="Copy subject line"
                  >
                    {copiedType === 'subject' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Content Preview */}
            <div
              className="overflow-x-auto rounded-lg bg-white p-3 text-slate-900"
              dangerouslySetInnerHTML={{ __html: tableHtml }}
            />
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-white/[0.07] bg-[#101010] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            Click <strong>Copy for Email</strong>, then press <kbd className="px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.1] rounded text-[11px] font-mono text-slate-300">Ctrl + V</kbd> in your email composer.
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleOpenMailto}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 webtree-secondary-btn rounded-xl transition-colors cursor-pointer"
              title="Open draft in default mail application"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Email Draft</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPlain}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-300 webtree-secondary-btn rounded-xl transition-colors cursor-pointer"
            >
              {copiedType === 'plain' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied Text!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Plain Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyRich}
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white webtree-gradient-btn rounded-xl shadow-xs cursor-pointer"
            >
              {copiedType === 'rich' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied for Email!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy for Email (Rich HTML)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
