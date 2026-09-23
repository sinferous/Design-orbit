'use client';

import { useState } from 'react';
import { WorkEntryWithDetails } from '@/types';
import {
  generateEmailTableHtml,
  generateGroupedEmailHtml,
  generateCleanPlainText,
  copyToClipboardWithHtml,
  formatEmailDate,
} from '@/lib/services/email-formatter';
import { isInProgressEntry } from '@/lib/services/work-entry';
import { X, Copy, Check, Mail, Table2, ListOrdered, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { SlideTabs } from '@/components/ui/SlideTabs';

interface EmailDayLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: WorkEntryWithDetails[];
  designerName: string;
  selectedDate: string;
}

type FormatTab = 'table' | 'grouped' | 'text';

export function EmailDayLogModal({
  isOpen,
  onClose,
  entries,
  designerName,
  selectedDate,
}: EmailDayLogModalProps) {
  const [activeTab, setActiveTab] = useState<FormatTab>('table');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const tableHtml = generateEmailTableHtml(entries, designerName, selectedDate);
  const groupedHtml = generateGroupedEmailHtml(entries, designerName, selectedDate);
  const plainText = generateCleanPlainText(entries, designerName, selectedDate);
  const formattedDate = formatEmailDate(selectedDate);
  const completedCount = entries.filter(e => !isInProgressEntry(e) && (e.quantity_done || 0) > 0).length;
  const workingCount = entries.filter(e => isInProgressEntry(e) || (e.quantity_done || 0) === 0).length;

  const handleCopyRich = async () => {
    const htmlToCopy = activeTab === 'grouped' ? groupedHtml : tableHtml;
    const success = await copyToClipboardWithHtml(htmlToCopy, plainText);
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

  const handleOpenMailto = () => {
    const subject = encodeURIComponent(`Daily Work Log - ${designerName} - ${formattedDate}`);
    const body = encodeURIComponent(plainText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-2xl shadow-2xl shadow-black/80 border border-slate-700 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-violet-950 text-violet-400 flex items-center justify-center border border-violet-800 shadow-sm">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Email Daily Work Log</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-violet-950 text-violet-300 rounded-full border border-violet-800">
                  {completedCount} Deliverable{completedCount === 1 ? '' : 's'}{workingCount > 0 ? ` • ${workingCount} Working` : ''}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Formatted for beautiful rendering in Gmail, Outlook, Apple Mail, and messaging apps.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Controls */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Format Tabs with Smooth Gliding Pill */}
          <SlideTabs
            options={[
              { id: 'table', label: 'Modern Table', icon: Table2 },
              { id: 'grouped', label: 'Client Digest', icon: ListOrdered },
              { id: 'text', label: 'Plain Text', icon: FileText },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as FormatTab)}
            size="sm"
            fullWidth={false}
            className="bg-slate-950 p-1 border-slate-800 w-full sm:w-auto"
            pillClassName="bg-slate-800 border border-slate-700 shadow-xs"
            activeTextClassName="text-violet-300 font-bold"
          />

          {/* Quick Helper Badge */}
          <div className="text-xs text-slate-400 font-medium">
            {activeTab === 'text' ? (
              <span>Great for Slack, WhatsApp & quick chats</span>
            ) : (
              <span>Pastes with formatting, colors & links in Gmail/Outlook</span>
            )}
          </div>
        </div>

        {/* Live Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm p-6 max-w-3xl mx-auto">
            {/* Mock Email Client Header */}
            <div className="border-b border-slate-800 pb-3 mb-4 text-xs text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-slate-200 font-semibold">Subject: </strong>
                  Daily Work Log — {designerName} — {formattedDate}
                </div>
                <span className="text-emerald-400 font-medium bg-emerald-950/60 px-2.5 py-0.5 rounded text-[11px] border border-emerald-800/60">
                  Email-Ready Preview
                </span>
              </div>
            </div>

            {/* Content Preview */}
            {activeTab === 'table' ? (
              <div
                className="overflow-x-auto rounded-lg bg-white p-3 text-slate-900"
                dangerouslySetInnerHTML={{ __html: tableHtml }}
              />
            ) : activeTab === 'grouped' ? (
              <div
                className="overflow-x-auto rounded-lg bg-white p-3 text-slate-900"
                dangerouslySetInnerHTML={{ __html: groupedHtml }}
              />
            ) : (
              <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {plainText}
              </pre>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            💡 Tip: Click <strong>"Copy for Email"</strong>, then press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-slate-300">Ctrl + V</kbd> in your email composer.
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleOpenMailto}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Open draft in default mail application"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Email Draft</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPlain}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
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
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white webtree-gradient-btn rounded-lg shadow-sm cursor-pointer"
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
