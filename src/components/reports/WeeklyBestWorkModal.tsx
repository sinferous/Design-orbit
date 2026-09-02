'use client';

import React, { useState, useEffect } from 'react';
import { Award, ExternalLink, Trash2, X, Save, Link2 } from 'lucide-react';

interface WeeklyBestWorkModalProps {
  isOpen: boolean;
  designerName: string;
  profileId: string;
  weekStartDate: string;
  currentUrl: string;
  onSave: (profileId: string, url: string) => Promise<void>;
  onDelete: (profileId: string) => Promise<void>;
  onClose: () => void;
}

export function WeeklyBestWorkModal({
  isOpen,
  designerName,
  profileId,
  weekStartDate,
  currentUrl,
  onSave,
  onDelete,
  onClose,
}: WeeklyBestWorkModalProps) {
  const [url, setUrl] = useState(currentUrl || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setUrl(currentUrl || '');
  }, [currentUrl, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    try {
      await onSave(profileId, url.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(profileId);
      setUrl('');
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6 animate-in zoom-in-95 duration-200 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
              Featured Best Work
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Designer: <strong className="text-slate-800">{designerName}</strong> • Week of {weekStartDate}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Best Work URL (Featured for Meeting)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="url"
                required
                placeholder="https://figma.com/file/... or https://behance.net/..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Paste Figma link, Behance showcase, live URL, or Google Drive deliverable.
            </p>
          </div>

          {currentUrl && (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate mr-2">
                <ExternalLink className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-xs font-bold text-sky-900 truncate">{currentUrl}</span>
              </div>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 text-[11px] font-extrabold text-sky-700 hover:text-sky-900 bg-white rounded-lg border border-sky-300 shrink-0 transition-colors"
              >
                Test Link ↗
              </a>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              {currentUrl ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="px-3.5 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleting ? 'Removing...' : 'Remove Link'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {currentUrl && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving || deleting || !url.trim()}
                className="px-5 py-2 text-xs font-bold text-white webtree-gradient-btn rounded-xl shadow-xs transition-transform active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : currentUrl ? 'Update Link' : 'Save Best Work'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
