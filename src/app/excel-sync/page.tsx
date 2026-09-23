'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { CreativeBackground } from '@/components/ui/CreativeBackground';
import { RichDatePicker } from '@/components/ui/RichDatePicker';
import { OrbitLoader } from '@/components/ui/OrbitLoader';
import { useToast } from '@/components/ui/ToastContext';
import {
  FileSpreadsheet,
  Copy,
  Check,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Plus,
  Trash2,
  Table as TableIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchProfiles,
  fetchWorkEntriesByDate,
  getLoggedInUser,
  isInProgressEntry,
  isAdminUser,
} from '@/lib/services/work-entry';
import { getWeekRange } from '@/lib/services/reports';
import { copyToClipboardWithHtml } from '@/lib/services/email-formatter';
import { Profile, WorkEntryWithDetails } from '@/types';

// Daily 2-Column Row Interface
interface DailyExcelRow {
  id: string;
  client: string;
  type: string;
  originalEntryId?: string;
  quantity: number;
}

// Weekly 6-Column Row Interface (Serial No., Company Name, Description, Work Type, Done, Approved)
interface WeeklyExcelRow {
  id: string;
  serialNo: string;
  companyName: string;
  description: string;
  workType: string;
  done: string;
  approved: string;
  originalEntryId?: string;
}

export default function ExcelSyncPage() {
  const router = useRouter();
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

  // ----------------------------------------------------
  // DAILY STATE
  // ----------------------------------------------------
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dailyEntries, setDailyEntries] = useState<WorkEntryWithDetails[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [editableDailyRows, setEditableDailyRows] = useState<DailyExcelRow[]>([]);
  const [dailyHasCustomEdits, setDailyHasCustomEdits] = useState(false);
  const [isDailyCopied, setIsDailyCopied] = useState(false);

  // ----------------------------------------------------
  // WEEKLY STATE
  // ----------------------------------------------------
  const initialWeek = useMemo(() => getWeekRange(new Date()), []);
  const [weekStartDate, setWeekStartDate] = useState<string>(initialWeek.startDate);
  const [weekEndDate, setWeekEndDate] = useState<string>(initialWeek.endDate);
  const [weekLabel, setWeekLabel] = useState<string>(initialWeek.label);
  const [weeklyEntries, setWeeklyEntries] = useState<WorkEntryWithDetails[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [editableWeeklyRows, setEditableWeeklyRows] = useState<WeeklyExcelRow[]>([]);
  const [weeklyHasCustomEdits, setWeeklyHasCustomEdits] = useState(false);
  const [isWeeklyCopied, setIsWeeklyCopied] = useState(false);

  // Active view tab: 'daily' vs 'weekly'
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  // User & Profile state (strictly current profile)
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  // Load profiles and authenticated user
  useEffect(() => {
    async function initUserAndProfile() {
      const user = getLoggedInUser();
      if (!user) {
        router.push('/login');
        return;
      }
      if (isAdminUser(user)) {
        router.push('/admin');
        return;
      }
      const pData = await fetchProfiles();
      const current = pData.find((p) => p.name.toLowerCase() === user.name.toLowerCase()) || pData[0];
      if (current) setActiveProfile(current);
    }
    initUserAndProfile();
  }, [router]);

  // ----------------------------------------------------
  // 1. DAILY DATA FETCHING & ROW GENERATION
  // ----------------------------------------------------
  const loadDailyEntries = useCallback(async () => {
    setDailyLoading(true);
    try {
      const userIdToFetch = activeProfile?.id || 'p1';
      const data = await fetchWorkEntriesByDate(selectedDate, userIdToFetch);
      setDailyEntries(data);
    } catch (err) {
      console.error('Failed to load daily entries for Excel Sync:', err);
      showToast('Error loading work entries for this date', 'error');
    } finally {
      setDailyLoading(false);
    }
  }, [selectedDate, activeProfile, showToast]);

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyEntries();
    }
  }, [activeTab, loadDailyEntries]);

  // Generate Daily 2-Column Rows (Client | Type)
  const generatedDailyRows = useMemo<DailyExcelRow[]>(() => {
    if (!dailyEntries.length) return [];

    const sorted = [...dailyEntries].sort((a, b) => {
      const clientA = (a.client?.name || 'General').toLowerCase();
      const clientB = (b.client?.name || 'General').toLowerCase();
      return clientA.localeCompare(clientB);
    });

    return sorted.map((entry, idx) => {
      const client = entry.client?.name || 'General';
      const category = entry.work_type?.name || 'Deliverable';
      const desc = entry.description ? entry.description.trim() : '';
      const qty = entry.quantity_done || 0;
      const isWorking = isInProgressEntry(entry) || qty === 0;

      let qtySuffix = '';
      if (isWorking) {
        qtySuffix = ' [Working]';
      } else if (qty > 1) {
        qtySuffix = ` x${qty}`;
      }

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
  }, [dailyEntries]);

  useEffect(() => {
    setEditableDailyRows(generatedDailyRows);
    setDailyHasCustomEdits(false);
  }, [generatedDailyRows]);

  // Daily Date Navigation Steppers
  const handleDateStep = (days: number) => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatLocalDate(d));
  };

  const handleDailyRowChange = (id: string, field: 'client' | 'type', value: string) => {
    setEditableDailyRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    setDailyHasCustomEdits(true);
  };

  const handleAddDailyRow = () => {
    const newRow: DailyExcelRow = {
      id: `custom-daily-${Date.now()}`,
      client: '',
      type: '',
      quantity: 1,
    };
    setEditableDailyRows((prev) => [...prev, newRow]);
    setDailyHasCustomEdits(true);
  };

  const handleDeleteDailyRow = (id: string) => {
    setEditableDailyRows((prev) => prev.filter((r) => r.id !== id));
    setDailyHasCustomEdits(true);
  };

  const handleResetDaily = () => {
    setEditableDailyRows(generatedDailyRows);
    setDailyHasCustomEdits(false);
    showToast('Reset table to default data', 'success');
  };

  // 1-Click Copy for Daily (Copies Content with Header)
  const handleCopyDaily = async () => {
    if (!editableDailyRows.length) {
      showToast('No rows to copy', 'error');
      return;
    }

    const tsvLines: string[] = ['Client\tType'];
    editableDailyRows.forEach((row) => {
      tsvLines.push(`${row.client.trim()}\t${row.type.trim()}`);
    });
    const tsvContent = tsvLines.join('\r\n');

    const htmlContent = `
      <table style="border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt;">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; background-color: #f2f2f2;">Client</th>
            <th style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; background-color: #f2f2f2;">Type</th>
          </tr>
        </thead>
        <tbody>
          ${editableDailyRows
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
      setIsDailyCopied(true);
      showToast(`Copied ${editableDailyRows.length} rows to clipboard!`, 'success');
      setTimeout(() => setIsDailyCopied(false), 2500);
    } else {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleDownloadDailyCsv = () => {
    if (!editableDailyRows.length) {
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
    editableDailyRows.forEach((r) => {
      csvLines.push(`${escapeCsv(r.client)},${escapeCsv(r.type)}`);
    });

    const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `excel_daily_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded CSV spreadsheet', 'success');
  };

  // ----------------------------------------------------
  // 2. WEEKLY DATA FETCHING & ROW GENERATION
  // ----------------------------------------------------
  const loadWeeklyEntries = useCallback(async () => {
    if (!weekStartDate || !weekEndDate) return;
    setWeeklyLoading(true);
    try {
      const userIdToFetch = activeProfile?.id || 'p1';
      const [sy, sm, sd] = weekStartDate.split('-').map(Number);
      const [ey, em, ed] = weekEndDate.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd, 12, 0, 0);
      const end = new Date(ey, em - 1, ed, 12, 0, 0);

      const dates: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(formatLocalDate(d));
      }

      const dayResults = await Promise.all(
        dates.map((dStr) => fetchWorkEntriesByDate(dStr, userIdToFetch))
      );
      setWeeklyEntries(dayResults.flat());
    } catch (err) {
      console.error('Failed to load weekly entries for Excel Sync:', err);
      showToast('Error loading weekly work entries', 'error');
    } finally {
      setWeeklyLoading(false);
    }
  }, [weekStartDate, weekEndDate, activeProfile, showToast]);

  useEffect(() => {
    if (activeTab === 'weekly') {
      loadWeeklyEntries();
    }
  }, [activeTab, loadWeeklyEntries]);

  // Generate Weekly 6-Column Rows:
  // Serial No. | Company Name | Description | Work Type | Done | Approved
  // Rule: Company Name & Serial No. appear on first row for each client; subsequent client items have empty serial & company name!
  // Working events (in-progress / 0 quantity) are excluded from the weekly report.
  const generatedWeeklyRows = useMemo<WeeklyExcelRow[]>(() => {
    if (!weeklyEntries.length) return [];

    // Filter out working / in-progress events for weekly excel format
    const validWeeklyEntries = weeklyEntries.filter(
      (entry) =>
        !isInProgressEntry(entry) &&
        (entry.quantity_done || 0) > 0 &&
        entry.work_type?.name?.toLowerCase() !== 'working' &&
        entry.status !== 'Draft'
    );

    if (!validWeeklyEntries.length) return [];

    // Group entries by client name
    const clientGroups: Record<string, WorkEntryWithDetails[]> = {};
    validWeeklyEntries.forEach((entry) => {
      const clientName = entry.client?.name || 'General';
      if (!clientGroups[clientName]) {
        clientGroups[clientName] = [];
      }
      clientGroups[clientName].push(entry);
    });

    // Sort clients alphabetically A-Z
    const sortedClients = Object.keys(clientGroups).sort((a, b) => a.localeCompare(b));

    const rows: WeeklyExcelRow[] = [];
    let serialCounter = 1;

    sortedClients.forEach((clientName) => {
      const groupEntries = clientGroups[clientName];

      groupEntries.forEach((entry, entryIdx) => {
        const isFirst = entryIdx === 0;
        const serialNo = isFirst ? String(serialCounter) : '';
        const companyName = isFirst ? clientName : '';

        const category = entry.work_type?.name || 'Other';
        const desc = entry.description ? entry.description.trim() : (entry.work_type?.name || 'Deliverable');

        // Done: blank if 0; otherwise number string
        const doneVal = !entry.quantity_done ? '' : String(entry.quantity_done);

        // Approved: blank if 0 or undefined; otherwise number string
        const approvedVal = !entry.quantity_approved || entry.quantity_approved === 0 ? '' : String(entry.quantity_approved);

        rows.push({
          id: entry.id || `week-row-${serialCounter}-${entryIdx}`,
          serialNo,
          companyName,
          description: desc,
          workType: category,
          done: doneVal,
          approved: approvedVal,
          originalEntryId: entry.id,
        });
      });

      serialCounter++;
    });

    return rows;
  }, [weeklyEntries]);

  useEffect(() => {
    setEditableWeeklyRows(generatedWeeklyRows);
    setWeeklyHasCustomEdits(false);
  }, [generatedWeeklyRows]);

  // Flexible 7-Day Range calculator (any arbitrary start date through start + 6 days)
  const get7DayRange = (startDate: Date) => {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0);
    const end = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6, 12, 0, 0);

    return {
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end),
      label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };
  };

  // Weekly Navigation Steppers
  const handleWeekStep = (deltaWeeks: number) => {
    const [sy, sm, sd] = weekStartDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 12, 0, 0);
    start.setDate(start.getDate() + deltaWeeks * 7);
    const range = get7DayRange(start);
    setWeekStartDate(range.startDate);
    setWeekEndDate(range.endDate);
    setWeekLabel(range.label);
  };

  const handleThisWeek = () => {
    const range = getWeekRange(new Date());
    setWeekStartDate(range.startDate);
    setWeekEndDate(range.endDate);
    setWeekLabel(range.label);
  };

  // Week Calendar Popover State & Helpers
  const [isWeekCalendarOpen, setIsWeekCalendarOpen] = useState(false);
  const [viewMonthDate, setViewMonthDate] = useState<Date>(() => new Date());
  const [hoveredWeekDate, setHoveredWeekDate] = useState<string | null>(null);

  const handleMonthDelta = (months: number) => {
    const next = new Date(viewMonthDate);
    next.setMonth(next.getMonth() + months);
    setViewMonthDate(next);
  };

  const handleSelectWeekFromDate = (date: Date) => {
    const range = get7DayRange(date);
    setWeekStartDate(range.startDate);
    setWeekEndDate(range.endDate);
    setWeekLabel(range.label);
    setIsWeekCalendarOpen(false);
  };

  const isSelectedWeekDay = (d: Date) => {
    const dStr = formatLocalDate(d);
    return dStr >= weekStartDate && dStr <= weekEndDate;
  };

  const isStartOfWeek = (d: Date) => formatLocalDate(d) === weekStartDate;
  const isEndOfWeek = (d: Date) => formatLocalDate(d) === weekEndDate;

  const hoverRange = useMemo(() => {
    if (!hoveredWeekDate) return null;
    const target = parseLocalDate(hoveredWeekDate);
    return get7DayRange(target);
  }, [hoveredWeekDate]);

  const generateWeekCalendarDays = (vDate: Date) => {
    const year = vDate.getFullYear();
    const month = vDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1, 12, 0, 0).getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0, 12, 0, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0, 12, 0, 0).getDate();
    const daysArr: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthTotalDays - i, 12, 0, 0);
      daysArr.push({
        date: d,
        isCurrentMonth: false,
        key: `prev-${prevMonthTotalDays - i}`,
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i, 12, 0, 0);
      daysArr.push({
        date: d,
        isCurrentMonth: true,
        key: `curr-${i}`,
      });
    }

    const remaining = 42 - daysArr.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i, 12, 0, 0);
      daysArr.push({
        date: d,
        isCurrentMonth: false,
        key: `next-${i}`,
      });
    }

    return daysArr;
  };

  const handleWeeklyRowChange = (id: string, field: keyof WeeklyExcelRow, value: string) => {
    setEditableWeeklyRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    setWeeklyHasCustomEdits(true);
  };

  const handleAddWeeklyRow = () => {
    const newRow: WeeklyExcelRow = {
      id: `custom-weekly-${Date.now()}`,
      serialNo: '',
      companyName: '',
      description: '',
      workType: 'Static',
      done: '1',
      approved: '1',
    };
    setEditableWeeklyRows((prev) => [...prev, newRow]);
    setWeeklyHasCustomEdits(true);
  };

  const handleDeleteWeeklyRow = (id: string) => {
    setEditableWeeklyRows((prev) => prev.filter((r) => r.id !== id));
    setWeeklyHasCustomEdits(true);
  };

  const handleResetWeekly = () => {
    setEditableWeeklyRows(generatedWeeklyRows);
    setWeeklyHasCustomEdits(false);
    showToast('Reset weekly table to default data', 'success');
  };

  // 1-Click Copy for Weekly: STRICTLY DATA CONTENT ONLY (NO Week title, NO headers!)
  const handleCopyWeekly = async () => {
    if (!editableWeeklyRows.length) {
      showToast('No rows to copy', 'error');
      return;
    }

    // 1. TSV content without headers or week titles (cell-for-cell match)
    const tsvLines = editableWeeklyRows.map(
      (r) =>
        `${r.serialNo.trim()}\t${r.companyName.trim()}\t${r.description.trim()}\t${r.workType.trim()}\t${r.done.trim()}\t${r.approved.trim()}`
    );
    const tsvContent = tsvLines.join('\r\n');

    // 2. HTML table without <thead> (pure content rows for Excel paste)
    const htmlContent = `
      <table style="border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt;">
        <tbody>
          ${editableWeeklyRows
            .map(
              (r) => `
            <tr>
              <td style="border: 1px solid #d9d9d9; padding: 4px 8px; text-align: center;">${r.serialNo.trim()}</td>
              <td style="border: 1px solid #d9d9d9; padding: 4px 8px;">${r.companyName.trim()}</td>
              <td style="border: 1px solid #d9d9d9; padding: 4px 8px;">${r.description.trim()}</td>
              <td style="border: 1px solid #d9d9d9; padding: 4px 8px;">${r.workType.trim()}</td>
              <td style="border: 1px solid #d9d9d9; padding: 4px 8px; text-align: center;">${r.done.trim()}</td>
              <td style="border: 1px solid #d9d9d9; padding: 4px 8px; text-align: center;">${r.approved.trim()}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;

    const success = await copyToClipboardWithHtml(htmlContent, tsvContent);
    if (success) {
      setIsWeeklyCopied(true);
      showToast(`Copied ${editableWeeklyRows.length} rows! (Content only, no headers)`, 'success');
      setTimeout(() => setIsWeeklyCopied(false), 2500);
    } else {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleDownloadWeeklyCsv = () => {
    if (!editableWeeklyRows.length) {
      showToast('No rows to download', 'error');
      return;
    }

    const escapeCsv = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines: string[] = [
      'Serial No.,Company Name,Description,Work Type,Done,Approved',
    ];
    editableWeeklyRows.forEach((r) => {
      csvLines.push(
        `${escapeCsv(r.serialNo)},${escapeCsv(r.companyName)},${escapeCsv(r.description)},${escapeCsv(r.workType)},${escapeCsv(r.done)},${escapeCsv(r.approved)}`
      );
    });

    const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `excel_weekly_${weekStartDate}_to_${weekEndDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded Weekly CSV spreadsheet', 'success');
  };

  const formattedDailyTitle = parseLocalDate(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isCurrentWeek = weekStartDate === initialWeek.startDate;

  return (
    <div className="min-h-screen bg-[#06080F] text-slate-100 flex flex-col relative md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <CreativeBackground />
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-6 z-10 space-y-6">
        {/* Header Title & Subtitle */}
        <div className="bento-card bento-glow-subtle p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-emerald-600/15 border border-emerald-500/25 text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Excel Sync
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/40">
                  Excel & Sheets Ready
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Format your daily and weekly work into your company's exact Excel structure. Copy here, paste in Excel!
            </p>
          </div>

          {/* Mode Tabs (Daily vs Weekly) */}
          <div className="inline-flex p-1.5 bg-black/40 border border-white/[0.08] rounded-xl self-start sm:self-auto shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={cn(
                'w-32 sm:w-36 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer select-none btn-tactile',
                activeTab === 'daily'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Report</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('weekly')}
              className={cn(
                'w-32 sm:w-36 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer select-none',
                activeTab === 'weekly'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              )}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Weekly Report</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* VIEW 1: DAILY REPORT                                 */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'daily' && (
          <>
            {/* Streamlined Controls Bar: Date Navigation (Without Gaps) */}
            <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5 sm:p-4 mb-4 shadow-sm flex items-center justify-between">
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
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-violet-400 border border-slate-700 transition-colors cursor-pointer ml-1"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            {/* Action Bar: Copy for Excel & Download */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-slate-200">
                  {formattedDailyTitle} &bull;{' '}
                  <span className="text-emerald-400 font-bold">{editableDailyRows.length} rows ready</span>
                </span>
                {dailyHasCustomEdits && (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50">
                    Custom Edited
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {dailyHasCustomEdits && (
                  <button
                    type="button"
                    onClick={handleResetDaily}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Reset edits to original logged entries"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadDailyCsv}
                  disabled={!editableDailyRows.length}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyDaily}
                  disabled={!editableDailyRows.length}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                    isDailyCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white active:scale-95'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isDailyCopied ? (
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

            {/* Daily Spreadsheet Preview Table */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-md">
              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-emerald-400 font-bold">DAILY_EXCEL_PREVIEW</span>
                  <span>&bull;</span>
                  <span>Click any cell to edit wording before copying</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddDailyRow}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Row</span>
                </button>
              </div>

              {dailyLoading ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                  <OrbitLoader
                    size="md"
                    text={`Fetching daily deliverables for ${selectedDate}...`}
                    subtitle="Syncing with Supabase database"
                  />
                </div>
              ) : editableDailyRows.length === 0 ? (
                <div className="py-16 px-4 text-center text-slate-400 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-1">No Deliverables Logged on this Date</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-4">
                    No daily work entries were found for {formattedDailyTitle}. Choose another date or add custom rows manually.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddDailyRow}
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
                      <tr className="bg-slate-950/80 text-[10px] font-mono text-slate-500 border-b border-slate-800/80">
                        <th className="w-12 py-1 px-3 text-center border-r border-slate-800/80">#</th>
                        <th className="w-1/2 py-1 px-4 border-r border-slate-800/80">A</th>
                        <th className="w-1/2 py-1 px-4">B</th>
                        <th className="w-10 py-1 px-2 text-center"></th>
                      </tr>
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
                      {editableDailyRows.map((row, index) => {
                        const rowNumber = index + 2;
                        return (
                          <tr
                            key={row.id}
                            className="hover:bg-slate-800/30 transition-colors group"
                          >
                            <td className="py-2 px-3 text-center text-xs font-mono text-slate-500 bg-slate-950/40 border-r border-slate-800 select-none">
                              {rowNumber}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-800">
                              <input
                                type="text"
                                value={row.client}
                                onChange={(e) => handleDailyRowChange(row.id, 'client', e.target.value)}
                                placeholder="Client name"
                                className="w-full bg-transparent px-2.5 py-1.5 rounded text-slate-100 font-semibold focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={row.type}
                                onChange={(e) => handleDailyRowChange(row.id, 'type', e.target.value)}
                                placeholder="Type (e.g. Static x3)"
                                className="w-full bg-transparent px-2.5 py-1.5 rounded text-emerald-300 font-semibold focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteDailyRow(row.id)}
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

              {editableDailyRows.length > 0 && (
                <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>{editableDailyRows.length} data rows &bull; 2 columns</span>
                  <span className="text-[11px] text-slate-600">Excel &amp; Google Sheets ready</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 2: WEEKLY REPORT                                */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'weekly' && (
          <>
            {/* Streamlined Controls Bar: Week Navigation */}
            <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5 sm:p-4 mb-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => handleWeekStep(-1)}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Interactive Week Calendar Button & Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMonthDate(parseLocalDate(weekStartDate));
                      setIsWeekCalendarOpen(!isWeekCalendarOpen);
                    }}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-emerald-500 rounded-lg text-xs font-bold text-slate-100 shadow-sm transition-all cursor-pointer group select-none"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:scale-105 transition-transform" />
                    <span>{weekLabel}</span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200',
                        isWeekCalendarOpen && 'rotate-180 text-emerald-400'
                      )}
                    />
                  </button>

                  {/* Week Picker Popover */}
                  {isWeekCalendarOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsWeekCalendarOpen(false)}
                      />
                      <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/80 p-3.5 sm:p-4 w-[300px] sm:w-[320px] space-y-3 animate-in fade-in zoom-in-95 duration-150">
                        {/* Month Steppers Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleMonthDelta(-1)}
                            className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                            title="Previous Month"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-bold text-slate-100 tracking-wide">
                            {viewMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMonthDelta(1)}
                            className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                            title="Next Month"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Preview / Helper Bar */}
                        <div className="flex items-center justify-between text-[11px] px-1 py-0.5 rounded bg-slate-950/40 border border-slate-800/80">
                          <span className="font-semibold text-emerald-400 truncate">
                            {hoverRange ? `${hoverRange.label} (7 days)` : 'Select any start date (7 days)'}
                          </span>
                        </div>

                        {/* Weekday Column Headers (Mo to Su) */}
                        <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-0.5">
                          <span>Mo</span>
                          <span>Tu</span>
                          <span>We</span>
                          <span>Th</span>
                          <span>Fr</span>
                          <span>Sa</span>
                          <span>Su</span>
                        </div>

                        {/* 42-Day Grid with Full 7-Day Range Highlight */}
                        <div className="grid grid-cols-7 gap-0.5">
                          {generateWeekCalendarDays(viewMonthDate).map((dayObj) => {
                            const dStr = formatLocalDate(dayObj.date);
                            const active = isSelectedWeekDay(dayObj.date);
                            const hoverActive = hoverRange ? (dStr >= hoverRange.startDate && dStr <= hoverRange.endDate) : false;
                            const isHoverStart = hoverRange ? dStr === hoverRange.startDate : false;
                            const isHoverEnd = hoverRange ? dStr === hoverRange.endDate : false;
                            const start = isStartOfWeek(dayObj.date);
                            const end = isEndOfWeek(dayObj.date);
                            const isToday = dStr === todayStr;

                            return (
                              <button
                                key={dayObj.key}
                                type="button"
                                onMouseEnter={() => setHoveredWeekDate(dStr)}
                                onMouseLeave={() => setHoveredWeekDate(null)}
                                onClick={() => handleSelectWeekFromDate(dayObj.date)}
                                className={cn(
                                  'h-8 w-8 sm:h-8.5 sm:w-8.5 text-xs font-semibold rounded flex items-center justify-center transition-all cursor-pointer relative',
                                  !dayObj.isCurrentMonth
                                    ? 'text-slate-600'
                                    : 'text-slate-300 hover:bg-slate-800',
                                  active && 'bg-emerald-950/90 text-emerald-300 font-bold border border-emerald-700/60',
                                  hoverActive && !active && 'bg-emerald-950/40 border border-dashed border-emerald-600/70 text-emerald-200',
                                  isHoverStart && !active && '!bg-emerald-600/80 !text-white !border-emerald-500 font-bold shadow-sm',
                                  isHoverEnd && !active && '!bg-emerald-600/80 !text-white !border-emerald-500 font-bold shadow-sm',
                                  start && '!bg-gradient-to-r !from-emerald-600 !to-emerald-500 !text-white !border-emerald-500 shadow-sm font-bold',
                                  end && '!bg-gradient-to-r !from-emerald-500 !to-emerald-600 !text-white !border-emerald-500 shadow-sm font-bold'
                                )}
                              >
                                {dayObj.date.getDate()}
                                {isToday && !active && (
                                  <span className="absolute bottom-1 w-1 h-1 bg-violet-400 rounded-full" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Footer Presets */}
                        <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              handleThisWeek();
                              setViewMonthDate(new Date());
                              setIsWeekCalendarOpen(false);
                            }}
                            className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                          >
                            This Week
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const lastWeek = new Date();
                              lastWeek.setDate(lastWeek.getDate() - 7);
                              const range = getWeekRange(lastWeek);
                              setWeekStartDate(range.startDate);
                              setWeekEndDate(range.endDate);
                              setWeekLabel(range.label);
                              setViewMonthDate(lastWeek);
                              setIsWeekCalendarOpen(false);
                            }}
                            className="text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                          >
                            Last Week
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsWeekCalendarOpen(false)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors cursor-pointer border border-slate-700 text-[11px]"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleWeekStep(1)}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {!isCurrentWeek && (
                  <button
                    type="button"
                    onClick={handleThisWeek}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-violet-400 border border-slate-700 transition-colors cursor-pointer ml-1"
                  >
                    This Week
                  </button>
                )}
              </div>
            </div>

            {/* Action Bar: Copy for Excel & Download */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-slate-200">
                  {weekLabel} &bull;{' '}
                  <span className="text-emerald-400 font-bold">{editableWeeklyRows.length} deliverables ready</span>
                </span>
                {weeklyHasCustomEdits && (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50">
                    Custom Edited
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {weeklyHasCustomEdits && (
                  <button
                    type="button"
                    onClick={handleResetWeekly}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Reset edits to original logged entries"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadWeeklyCsv}
                  disabled={!editableWeeklyRows.length}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWeekly}
                  disabled={!editableWeeklyRows.length}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                    isWeeklyCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white active:scale-95'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isWeeklyCopied ? (
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

            {/* Weekly Spreadsheet Preview Table (6 Columns: Serial No. | Company Name | Description | Work Type | Done | Approved) */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-md">
              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-emerald-400 font-bold">WEEKLY_EXCEL_PREVIEW</span>
                  <span>&bull;</span>
                  <span className="text-slate-300">Copies <strong>content only</strong> (No headers or Week title)</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddWeeklyRow}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Row</span>
                </button>
              </div>

              {weeklyLoading ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                  <OrbitLoader
                    size="md"
                    text={`Fetching weekly deliverables for ${weekLabel}...`}
                    subtitle="Compiling company 6-column sheet"
                    showCyclingText
                  />
                </div>
              ) : editableWeeklyRows.length === 0 ? (
                <div className="py-16 px-4 text-center text-slate-400 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                    <TableIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-1">No Deliverables Logged for this Week</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-4">
                    No work entries were found for {weekLabel}. Choose another week or add custom rows manually.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddWeeklyRow}
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
                      {/* Excel Column Coordinates (A to F) */}
                      <tr className="bg-slate-950/80 text-[10px] font-mono text-slate-500 border-b border-slate-800/80">
                        <th className="w-10 py-1 px-2 text-center border-r border-slate-800/80">#</th>
                        <th className="w-20 py-1 px-3 text-center border-r border-slate-800/80">A</th>
                        <th className="w-40 py-1 px-3 border-r border-slate-800/80">B</th>
                        <th className="py-1 px-3 border-r border-slate-800/80">C</th>
                        <th className="w-28 py-1 px-3 border-r border-slate-800/80">D</th>
                        <th className="w-20 py-1 px-2 text-center border-r border-slate-800/80">E</th>
                        <th className="w-24 py-1 px-2 text-center border-r border-slate-800/80">F</th>
                        <th className="w-8 py-1 px-1 text-center"></th>
                      </tr>
                      {/* Visual Header matching Excel */}
                      <tr className="bg-slate-900/90 text-slate-200 font-bold border-b border-slate-800">
                        <th className="py-2 px-2 text-center border-r border-slate-800 text-slate-500 text-xs">
                          1
                        </th>
                        <th className="py-2 px-3 text-center border-r border-slate-800 text-white font-extrabold text-xs">
                          Serial No.
                        </th>
                        <th className="py-2 px-3 border-r border-slate-800 text-white font-extrabold text-xs">
                          Company Name
                        </th>
                        <th className="py-2 px-3 border-r border-slate-800 text-white font-extrabold text-xs">
                          Description
                        </th>
                        <th className="py-2 px-3 border-r border-slate-800 text-white font-extrabold text-xs">
                          Work Type
                        </th>
                        <th className="py-2 px-2 text-center border-r border-slate-800 text-white font-extrabold text-xs">
                          Done
                        </th>
                        <th className="py-2 px-2 text-center border-r border-slate-800 text-white font-extrabold text-xs">
                          Approved
                        </th>
                        <th className="py-2 px-1 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {editableWeeklyRows.map((row, index) => {
                        const rowNumber = index + 2;
                        const isClientHeaderRow = Boolean(row.companyName);

                        return (
                          <tr
                            key={row.id}
                            className={`transition-colors group ${
                              isClientHeaderRow ? 'bg-slate-900/30 hover:bg-slate-800/40' : 'hover:bg-slate-800/20'
                            }`}
                          >
                            {/* Row Index */}
                            <td className="py-1.5 px-2 text-center text-xs font-mono text-slate-500 bg-slate-950/40 border-r border-slate-800 select-none">
                              {rowNumber}
                            </td>

                            {/* Column A: Serial No. */}
                            <td className="py-1 px-2 border-r border-slate-800 text-center">
                              <input
                                type="text"
                                value={row.serialNo}
                                onChange={(e) => handleWeeklyRowChange(row.id, 'serialNo', e.target.value)}
                                placeholder=""
                                className="w-full bg-transparent px-1 py-1 text-center rounded text-slate-100 font-bold focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                              />
                            </td>

                            {/* Column B: Company Name */}
                            <td className="py-1 px-2 border-r border-slate-800">
                              <input
                                type="text"
                                value={row.companyName}
                                onChange={(e) => handleWeeklyRowChange(row.id, 'companyName', e.target.value)}
                                placeholder=""
                                className={`w-full bg-transparent px-2 py-1 rounded font-semibold focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600 ${
                                  row.companyName ? 'text-white font-bold' : 'text-slate-500'
                                }`}
                              />
                            </td>

                            {/* Column C: Description */}
                            <td className="py-1 px-2 border-r border-slate-800">
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) => handleWeeklyRowChange(row.id, 'description', e.target.value)}
                                placeholder="Description"
                                className="w-full bg-transparent px-2 py-1 rounded text-slate-200 focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                              />
                            </td>

                            {/* Column D: Work Type */}
                            <td className="py-1 px-2 border-r border-slate-800">
                              <input
                                type="text"
                                value={row.workType}
                                onChange={(e) => handleWeeklyRowChange(row.id, 'workType', e.target.value)}
                                placeholder="Category"
                                className={`w-full bg-transparent px-2 py-1 rounded font-medium focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none transition-all ${
                                  row.workType === 'Working' ? 'text-amber-400 font-bold' : 'text-emerald-300'
                                }`}
                              />
                            </td>

                            {/* Column E: Done */}
                            <td className="py-1 px-2 border-r border-slate-800 text-center">
                              <input
                                type="text"
                                value={row.done}
                                onChange={(e) => handleWeeklyRowChange(row.id, 'done', e.target.value)}
                                placeholder=""
                                className="w-full bg-transparent px-1 py-1 text-center rounded text-slate-100 font-bold focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                              />
                            </td>

                            {/* Column F: Approved */}
                            <td className="py-1 px-2 border-r border-slate-800 text-center">
                              <input
                                type="text"
                                value={row.approved}
                                onChange={(e) => handleWeeklyRowChange(row.id, 'approved', e.target.value)}
                                placeholder=""
                                className="w-full bg-transparent px-1 py-1 text-center rounded text-emerald-300 font-bold focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                              />
                            </td>

                            {/* Row Action: Delete row */}
                            <td className="py-1 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteWeeklyRow(row.id)}
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

              {editableWeeklyRows.length > 0 && (
                <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>{editableWeeklyRows.length} rows &bull; 6 columns (Serial No. | Company Name | Description | Work Type | Done | Approved)</span>
                  <span className="text-[11px] text-emerald-400 font-semibold">Copies content only (Direct paste under Excel header)</span>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
