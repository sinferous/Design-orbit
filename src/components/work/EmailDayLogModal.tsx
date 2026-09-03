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
import { X, Copy, Check, Mail, Table2, ListOrdered, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-200 shadow-2xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Email Daily Work Log</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-sky-100 text-sky-700 rounded-full border border-sky-200">
                  {entries.length} Deliverables
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Formatted for beautiful rendering in Gmail, Outlook, Apple Mail, and messaging apps.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Controls */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Format Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'table'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Modern Table</span>
            </button>

            <button
              onClick={() => setActiveTab('grouped')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'grouped'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Client Digest</span>
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'text'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Plain Text</span>
            </button>
          </div>

          {/* Quick Helper Badge */}
          <div className="text-xs text-slate-500 font-medium">
            {activeTab === 'text' ? (
              <span>Great for Slack, WhatsApp & quick chats</span>
            ) : (
              <span>Pastes with formatting, colors & links in Gmail/Outlook</span>
            )}
          </div>
        </div>

        {/* Live Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-3xl mx-auto">
            {/* Mock Email Client Header */}
            <div className="border-b border-slate-100 pb-3 mb-4 text-xs text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-slate-600 font-semibold">Subject: </strong>
                  Daily Work Log — {designerName} — {formattedDate}
                </div>
                <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                  Email-Ready Preview
                </span>
              </div>
            </div>

            {/* Content Preview */}
            {activeTab === 'table' ? (
              <div
                className="overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: tableHtml }}
              />
            ) : activeTab === 'grouped' ? (
              <div
                className="overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: groupedHtml }}
              />
            ) : (
              <pre className="text-xs font-mono text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {plainText}
              </pre>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            💡 Tip: Click <strong>"Copy for Email"</strong>, then press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono">Ctrl + V</kbd> in your email composer.
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleOpenMailto}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
              title="Open draft in default mail application"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Email Draft</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPlain}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              {copiedType === 'plain' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Text!</span>
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
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white webtree-gradient-btn rounded-lg shadow-sm"
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
