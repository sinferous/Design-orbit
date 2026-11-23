'use client';

import { useState } from 'react';
import { WorkEntryWithDetails } from '@/types';
import {
  generateEmailTableHtml,
  generateCleanPlainText,
  copyToClipboardWithHtml,
  formatEmailSubject,
} from '@/lib/services/email-formatter';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
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
  const emailSubject = formatEmailSubject(selectedDate, designerName);

  const markCopied = (type: string) => {
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyRich = async () => {
    const success = await copyToClipboardWithHtml(tableHtml, plainText);
    if (success) {
      markCopied('rich');
      showToast('Email copied. Paste it into Gmail or Outlook', 'success');
    } else {
      showToast('Could not copy to the clipboard', 'error');
    }
  };

  const handleCopyPlain = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      markCopied('plain');
      showToast('Text copied', 'success');
    } catch {
      showToast('Could not copy the text', 'error');
    }
  };

  const handleCopySubject = async () => {
    try {
      await navigator.clipboard.writeText(emailSubject);
      markCopied('subject');
      showToast('Subject copied', 'success');
    } catch {
      showToast('Could not copy the subject', 'error');
    }
  };

  const handleOpenMailto = () => {
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(plainText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-day-log-title"
        className="bg-[#141413] rounded-2xl shadow-2xl shadow-black/80 border border-white/[0.08] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between gap-4">
          <h3 id="email-day-log-title" className="text-base font-medium text-slate-100">
            Email day log
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subject, then the email as it will look */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-slate-500 shrink-0">Subject</span>
            <span className="text-slate-100 truncate">{emailSubject}</span>
            <button
              type="button"
              onClick={handleCopySubject}
              className="w-7 h-7 shrink-0 inline-flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] rounded-md transition-colors cursor-pointer"
              aria-label="Copy subject"
              title="Copy subject"
            >
              {copiedType === 'subject' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div
            className="overflow-x-auto rounded-xl bg-white px-6 py-5 text-slate-900"
            dangerouslySetInnerHTML={{ __html: tableHtml }}
          />
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleOpenMailto}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
              title="Open a draft in your mail app"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in mail app
            </button>

            <button
              type="button"
              onClick={handleCopyPlain}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs text-slate-200 border border-white/[0.1] hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
              title="Copy as plain text, for chat apps"
            >
              {copiedType === 'plain' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedType === 'plain' ? 'Copied' : 'Copy as text'}
            </button>

            <button
              type="button"
              onClick={handleCopyRich}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-medium text-[#0b0b0a] bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
              title="Copy with the table, for Gmail and Outlook"
            >
              {copiedType === 'rich' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedType === 'rich' ? 'Copied' : 'Copy email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
