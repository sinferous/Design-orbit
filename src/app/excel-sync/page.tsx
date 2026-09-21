'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { CreativeBackground } from '@/components/ui/CreativeBackground';
import { RichDatePicker } from '@/components/ui/RichDatePicker';
import { useToast } from '@/components/ui/ToastContext';
import {
  FileSpreadsheet,
  Copy,
  Check,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Plus,
  Trash2,
  Table as TableIcon,
} from 'lucide-react';
import {
  fetchProfiles,
  fetchWorkEntriesByDate,
  getLoggedInUser,
  isInProgressEntry,
} from '@/lib/services/work-entry';
import { copyToClipboardWithHtml } from '@/lib/services/email-formatter';
import { Profile, WorkEntryWithDetails } from '@/types';

interface ExcelRow {
  id: string;
  client: string;
  type: string;
  originalEntryId?: string;
  quantity: number;
}

export default function ExcelSyncPage() {
  const { showToast } = useToast();

  // Date formatting helpers
  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseLocalDate = (str: string): Date => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  };

  const todayStr = formatLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // User & Profile state (strictly for current logged in profile)
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  // Work entries data
  const [entries, setEntries] = useState<WorkEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode tab
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  // Editable Spreadsheet rows
  const [editableRows, setEditableRows] = useState<ExcelRow[]>([]);
  const [hasCustomEdits, setHasCustomEdits] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Load profiles and authenticated user
  useEffect(() => {
    async function initUserAndProfile() {
      const pData = await fetchProfiles();
      const user = getLoggedInUser();
      const current = user
        ? pData.find((p) => p.name.toLowerCase() === user.name.toLowerCase()) || pData[0]
        : pData[0];
      if (current) setActiveProfile(current);
    }
    initUserAndProfile();
  }, []);

  // Fetch daily work entries strictly for current profile
  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const userIdToFetch = activeProfile?.id || 'p1';
      const data = await fetchWorkEntriesByDate(selectedDate, userIdToFetch);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load work entries for Excel Sync:', err);
      showToast('Error loading work entries for this date', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeProfile, showToast]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Compute standard Excel Rows from entries using Smart Auto formatting
  const generatedRows = useMemo<ExcelRow[]>(() => {
    if (!entries.length) return [];

    // Sort entries grouped by client alphabetically A-Z
    const sortedEntries = [...entries].sort((a, b) => {
      const clientA = (a.client?.name || 'General').toLowerCase();
      const clientB = (b.client?.name || 'General').toLowerCase();
      return clientA.localeCompare(clientB);
    });

    return sortedEntries.map((entry, idx) => {
      const client = entry.client?.name || 'General';
      const category = entry.work_type?.name || 'Deliverable';
      const desc = entry.description ? entry.description.trim() : '';
      const qty = entry.quantity_done || 0;
      const isWorking = isInProgressEntry(entry) || qty === 0;

      // Determine 'x' quantity suffix:
      // If qty > 1 -> ' x{qty}' (e.g. ' x3', ' x6')
      // If qty == 1 -> '' (clean without x1)
      // If working/qty == 0 -> ' [Working]'
      let qtySuffix = '';
      if (isWorking) {
        qtySuffix = ' [Working]';
      } else if (qty > 1) {
        qtySuffix = ` x${qty}`;
      }

      // Smart format logic:
      // If description is specific & different from category, use description + suffix
      // Otherwise use category + suffix
      let typeCol = '';
      if (desc && desc.toLowerCase() !== category.toLowerCase()) {
        const hasManualX = /\bx\s*\d+\b/i.test(desc);
        typeCol = hasManualX ? desc : `${desc}${qtySuffix}`;
      } else {
        typeCol = `${category}${qtySuffix}`;
      }

      return {
        id: entry.id || `row-${idx}`,
        client,
        type: typeCol,
        originalEntryId: entry.id,
        quantity: qty,
      };
    });
  }, [entries]);

  // Sync generated rows into editableRows whenever raw data changes
  useEffect(() => {
    setEditableRows(generatedRows);
    setHasCustomEdits(false);
  }, [generatedRows]);

  // Day navigation steppers
  const handleDateStep = (days: number) => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatLocalDate(d));
  };

  const handleRowChange = (id: string, field: 'client' | 'type', value: string) => {
    setEditableRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    setHasCustomEdits(true);
  };

  const handleAddRow = () => {
    const newRow: ExcelRow = {
      id: `custom-${Date.now()}`,
      client: '',
      type: '',
      quantity: 1,
    };
    setEditableRows((prev) => [...prev, newRow]);
    setHasCustomEdits(true);
  };

  const handleDeleteRow = (id: string) => {
    setEditableRows((prev) => prev.filter((r) => r.id !== id));
    setHasCustomEdits(true);
  };

  const handleResetToDefault = () => {
    setEditableRows(generatedRows);
    setHasCustomEdits(false);
    showToast('Reset table to default data', 'success');
  };

  // 1-Click Copy to Clipboard for Excel / Google Sheets
  const handleCopyForExcel = async () => {
    if (!editableRows.length) {
      showToast('No rows to copy', 'error');
      return;
    }

    // 1. Generate Plain Text Tab-Separated Values (TSV) with Header Row
    const tsvLines: string[] = ['Client\tType'];
    editableRows.forEach((row) => {
      tsvLines.push(`${row.client.trim()}\t${row.type.trim()}`);
    });
    const tsvContent = tsvLines.join('\r\n');

    // 2. Generate Clean HTML Table as secondary MIME type
    const htmlContent = `
      <table style="border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt;">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; background-color: #f2f2f2;">Client</th>
            <th style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; background-color: #f2f2f2;">Type</th>
          </tr>
        </thead>
        <tbody>
          ${editableRows
            .map(
              (r) => `
            <tr>
              <td style="border: 1px solid #d9d9d9; padding: 4px 8px;">${r.client.trim()}</td>
              <td style="border: 1px solid #d9d9d9; padding: 4px 8px;">${r.type.trim()}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;

    const success = await copyToClipboardWithHtml(htmlContent, tsvContent);
    if (success) {
      setIsCopied(true);
      showToast(`Copied ${editableRows.length} rows to clipboard!`, 'success');
      setTimeout(() => setIsCopied(false), 2500);
    } else {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  // Download .CSV backup
  const handleDownloadCsv = () => {
    if (!editableRows.length) {
      showToast('No rows to download', 'error');
      return;
    }

    const escapeCsv = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines: string[] = ['Client,Type'];
    editableRows.forEach((r) => {
      csvLines.push(`${escapeCsv(r.client)},${escapeCsv(r.type)}`);
    });

    const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `excel_daily_sync_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded CSV spreadsheet', 'success');
  };

  const formattedDateTitle = parseLocalDate(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col relative">
      <CreativeBackground />
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-6 z-10">
        {/* Header Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Excel Sync
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/40">
                  Excel & Sheets Ready
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Format your daily work into your company's exact 2-column Excel structure (<code className="text-emerald-300 font-mono text-xs">Client</code> | <code className="text-emerald-300 font-mono text-xs">Type</code>). Copy here, paste in Excel!
            </p>
          </div>

          {/* Mode Tabs (Daily vs Weekly) */}
          <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'daily'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 cursor-pointer'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Report</span>
            </button>
            <button
              type="button"
              onClick={() => {
                showToast('Weekly Excel Sync is coming next! Daily report is ready below.', 'success');
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Weekly Report</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-800 text-sky-400 rounded-full border border-sky-800/40">
                Next
              </span>
            </button>
          </div>
        </div>

        {/* Streamlined Controls Bar: Date Navigation (Without Gaps) */}
        <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5 sm:p-4 mb-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Date Navigation - Snug without extra gap */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleDateStep(-1)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <RichDatePicker
              value={selectedDate}
              onChange={(val) => setSelectedDate(val)}
              label=""
            />

            <button
              type="button"
              onClick={() => handleDateStep(1)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition-colors cursor-pointer ml-1"
              >
                Today
              </button>
            )}
          </div>

          {/* User Status Tag */}
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <span>Profile:</span>
            <span className="font-semibold text-slate-200 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
              {activeProfile?.name || 'My Work'}
            </span>
          </div>
        </div>

        {/* Quick Action Bar: Copy for Excel & Download */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              {formattedDateTitle} &bull;{' '}
              <span className="text-emerald-400 font-bold">{editableRows.length} rows ready</span>
            </span>
            {hasCustomEdits && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50">
                Custom Edited
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasCustomEdits && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Reset edits to original logged entries"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={!editableRows.length}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download CSV</span>
            </button>

            <button
              type="button"
              onClick={handleCopyForExcel}
              disabled={!editableRows.length}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                isCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white active:scale-95'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-white" />
                  <span>Copy for Excel</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Excel Spreadsheet Table Preview Card */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-md">
          {/* Spreadsheet Header Accent */}
          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-bold">EXCEL_SYNC_PREVIEW</span>
              <span>&bull;</span>
              <span>Click any cell to edit wording before copying</span>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Row</span>
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs sm:text-sm">Fetching deliverables for {selectedDate}...</p>
            </div>
          ) : editableRows.length === 0 ? (
            <div className="py-16 px-4 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">No Deliverables Logged on this Date</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                No daily work entries were found for {formattedDateTitle}. Choose another date or add custom rows manually.
              </p>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row Manually</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs sm:text-sm">
                <thead>
                  {/* Excel Column Coordinates (A & B) */}
                  <tr className="bg-slate-950/80 text-[10px] font-mono text-slate-500 border-b border-slate-800/80">
                    <th className="w-12 py-1 px-3 text-center border-r border-slate-800/80">#</th>
                    <th className="w-1/2 py-1 px-4 border-r border-slate-800/80">A</th>
                    <th className="w-1/2 py-1 px-4">B</th>
                    <th className="w-10 py-1 px-2 text-center"></th>
                  </tr>
                  {/* Actual Excel Table Header */}
                  <tr className="bg-slate-900/90 text-slate-200 font-bold border-b border-slate-800">
                    <th className="py-2.5 px-3 text-center border-r border-slate-800 text-slate-500 text-xs">
                      1
                    </th>
                    <th className="py-2.5 px-4 border-r border-slate-800 text-white font-extrabold tracking-wide">
                      Client
                    </th>
                    <th className="py-2.5 px-4 text-white font-extrabold tracking-wide">
                      Type
                    </th>
                    <th className="py-2.5 px-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {editableRows.map((row, index) => {
                    const rowNumber = index + 2; // Excel row number (1 is header)
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        {/* Excel Row Number */}
                        <td className="py-2 px-3 text-center text-xs font-mono text-slate-500 bg-slate-950/40 border-r border-slate-800 select-none">
                          {rowNumber}
                        </td>

                        {/* Column A: Client */}
                        <td className="py-1.5 px-2 border-r border-slate-800">
                          <input
                            type="text"
                            value={row.client}
                            onChange={(e) => handleRowChange(row.id, 'client', e.target.value)}
                            placeholder="Client name"
                            className="w-full bg-transparent px-2.5 py-1.5 rounded text-slate-100 font-semibold focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                          />
                        </td>

                        {/* Column B: Type (Category + Qty) */}
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.type}
                            onChange={(e) => handleRowChange(row.id, 'type', e.target.value)}
                            placeholder="Type (e.g. Static x3)"
                            className="w-full bg-transparent px-2.5 py-1.5 rounded text-emerald-300 font-semibold focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                          />
                        </td>

                        {/* Row Action: Delete row */}
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            title="Remove row from export"
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer: Clean Row Count */}
          {editableRows.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>{editableRows.length} data rows &bull; 2 columns</span>
              <span className="text-[11px] text-slate-600">Excel &amp; Google Sheets ready</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
