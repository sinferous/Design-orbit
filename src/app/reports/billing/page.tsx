'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import {
  getClientBillingReportData,
  ClientBillingSummary,
  formatReportTime,
  formatReportHoursDecimal,
  exportToCSV,
  getWeekRange,
} from '@/lib/services/reports';
import {
  fetchProfiles,
  fetchWorkTypes,
  fetchClients,
  fetchAllClientDescriptions,
  ClientDescriptionItem,
} from '@/lib/services/work-entry';
import { Profile, WorkType, Client } from '@/types';
import {
  Download,
  Calendar,
  Building2,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Users,
  Filter,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { RichSelect } from '@/components/ui/RichSelect';
import { OrbitLoader } from '@/components/ui/OrbitLoader';
import { ReportsSubNav } from '@/components/reports/ReportsSubNav';
import {
  DescriptionAutocomplete,
  DescriptionSuggestionItem,
} from '@/components/ui/DescriptionAutocomplete';

export default function ClientTimeTrackingReportPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('');
  const [descriptionFilter, setDescriptionFilter] = useState<string>('');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [allClientDescriptions, setAllClientDescriptions] = useState<Record<string, ClientDescriptionItem[]>>({});

  // Rich Calendar States (consistent with Weekly and Work sections)
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const [reportData, setReportData] = useState<{
    clientSummaries: ClientBillingSummary[];
    totalTimeSecondsAll: number;
    totalDecimalHoursAll: number;
    totalDoneAll: number;
    totalApprovedAll: number;
    entries: any[];
  }>({
    clientSummaries: [],
    totalTimeSecondsAll: 0,
    totalDecimalHoursAll: 0,
    totalDoneAll: 0,
    totalApprovedAll: 0,
    entries: [],
  });

  const [loading, setLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const { showToast } = useToast();

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

  // Initialize date range to current week (Tuesday-Monday)
  useEffect(() => {
    const range = getWeekRange(new Date());
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, []);

  // Load filter options
  useEffect(() => {
    async function loadOptions() {
      try {
        const [pData, wtData, cData, descMap] = await Promise.all([
          fetchProfiles(),
          fetchWorkTypes(),
          fetchClients(),
          fetchAllClientDescriptions(),
        ]);
        const creativeProfiles = pData.filter(
          p => p.name !== 'Admin' && !p.designation?.toLowerCase().includes('administrator')
        );
        setProfiles(creativeProfiles);
        setWorkTypes(wtData);
        setClients(cData);
        setAllClientDescriptions(descMap);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadOptions();
  }, []);

  const loadReport = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const data = await getClientBillingReportData(
        startDate,
        endDate,
        selectedClient || undefined,
        selectedUser || undefined,
        selectedWorkType || undefined
      );
      setReportData(data);
    } catch (err) {
      console.error('Failed to load time report:', err);
      showToast('Failed to load time report', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedClient, selectedUser, selectedWorkType]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const toggleClientExpand = (clientId: string) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  // Month navigation for rich calendar
  const handleMonthDelta = (months: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + months);
    setViewDate(next);
  };

  // Step range forward / backward by 7 days
  const handleRangeDelta = (days: number) => {
    if (!startDate || !endDate) return;
    const currStart = parseLocalDate(startDate);
    const currEnd = parseLocalDate(endDate);
    currStart.setDate(currStart.getDate() + days);
    currEnd.setDate(currEnd.getDate() + days);
    const sStr = formatLocalDate(currStart);
    const eStr = formatLocalDate(currEnd);
    setStartDate(sStr);
    setEndDate(eStr);
    setViewDate(currStart);
  };

  // Select week starting from clicked day
  const handleSelectWeekFromDate = (date: Date) => {
    const startStr = formatLocalDate(date);
    const endDateObj = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6, 12, 0, 0);
    const endStr = formatLocalDate(endDateObj);
    setStartDate(startStr);
    setEndDate(endStr);
  };

  // Date range presets
  const applyPreset = (preset: 'today' | 'this_week' | 'this_month' | 'last_30') => {
    const today = new Date();

    if (preset === 'today') {
      const tStr = formatLocalDate(today);
      setStartDate(tStr);
      setEndDate(tStr);
      setViewDate(today);
    } else if (preset === 'this_week') {
      const range = getWeekRange(today);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      setViewDate(today);
    } else if (preset === 'this_month') {
      const y = today.getFullYear();
      const m = today.getMonth() + 1;
      const daysInMonth = new Date(y, m, 0).getDate();
      setStartDate(`${y}-${String(m).padStart(2, '0')}-01`);
      setEndDate(`${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`);
      setViewDate(today);
    } else if (preset === 'last_30') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setStartDate(formatLocalDate(past));
      setEndDate(formatLocalDate(today));
      setViewDate(today);
    }
  };

  const isPresetActive = (preset: 'today' | 'this_week' | 'this_month' | 'last_30') => {
    const today = new Date();
    if (preset === 'today') {
      const tStr = formatLocalDate(today);
      return startDate === tStr && endDate === tStr;
    }
    if (preset === 'this_week') {
      const range = getWeekRange(today);
      return startDate === range.startDate && endDate === range.endDate;
    }
    if (preset === 'this_month') {
      const y = today.getFullYear();
      const m = today.getMonth() + 1;
      const daysInMonth = new Date(y, m, 0).getDate();
      const mStart = `${y}-${String(m).padStart(2, '0')}-01`;
      const mEnd = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      return startDate === mStart && endDate === mEnd;
    }
    if (preset === 'last_30') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      return startDate === formatLocalDate(past) && endDate === formatLocalDate(today);
    }
    return false;
  };

  const getWeekRangeLabel = () => {
    if (!startDate || !endDate) return 'Select Date Range';
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (startDate === endDate) {
      return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const isSelected = (d: Date) => {
    const dStr = formatLocalDate(d);
    return dStr >= startDate && dStr <= endDate;
  };

  const isStart = (d: Date) => {
    const dStr = formatLocalDate(d);
    return dStr === startDate;
  };

  const isEnd = (d: Date) => {
    const dStr = formatLocalDate(d);
    return dStr === endDate;
  };

  const getHoverWeekRange = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    const startStr = formatLocalDate(d);
    const endDateObj = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6, 12, 0, 0);
    const endStr = formatLocalDate(endDateObj);
    return {
      start: startStr,
      end: endStr,
    };
  };

  const isInHoverRange = (d: Date) => {
    if (!hoveredDate) return false;
    const { start, end } = getHoverWeekRange(hoveredDate);
    const dStr = formatLocalDate(d);
    return dStr >= start && dStr <= end;
  };

  const generateCalendarDays = (vDate: Date) => {
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

  // Filter report data dynamically by description query (fuzzy / substring matching)
  const filteredReportData = useMemo(() => {
    const query = descriptionFilter.trim().toLowerCase();
    if (!query) {
      return reportData;
    }

    // Filter all entries matching query substring
    const matchedEntries = reportData.entries.filter(e =>
      e.description && e.description.toLowerCase().includes(query)
    );

    // Re-aggregate per client
    const clientSummaries: ClientBillingSummary[] = reportData.clientSummaries
      .map(client => {
        const clientMatchedEntries = client.entries.filter(e =>
          e.description && e.description.toLowerCase().includes(query)
        );

        const totalDone = clientMatchedEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
        const totalApproved = clientMatchedEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
        const totalTimeSeconds = clientMatchedEntries.reduce(
          (acc, curr) => acc + (curr.time_spent_seconds || 0),
          0
        );
        const decimalHours = formatReportHoursDecimal(totalTimeSeconds);

        const breakdown: Record<string, { count: number; timeSeconds: number }> = {};
        clientMatchedEntries.forEach(e => {
          const wtName = e.work_type?.name || 'Other';
          if (wtName.trim().toLowerCase() === 'working') return;
          if (!breakdown[wtName]) breakdown[wtName] = { count: 0, timeSeconds: 0 };
          breakdown[wtName].count += e.quantity_done;
          breakdown[wtName].timeSeconds += (e.time_spent_seconds || 0);
        });

        return {
          ...client,
          totalDone,
          totalApproved,
          totalTimeSeconds,
          decimalHours,
          entries: clientMatchedEntries,
          workTypeBreakdown: breakdown,
        };
      })
      .filter(c => c.entries.length > 0)
      .sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds || b.totalDone - a.totalDone);

    const totalTimeSecondsAll = matchedEntries.reduce(
      (acc, curr) => acc + (curr.time_spent_seconds || 0),
      0
    );
    const totalDecimalHoursAll = formatReportHoursDecimal(totalTimeSecondsAll);
    const totalDoneAll = matchedEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
    const totalApprovedAll = matchedEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);

    return {
      clientSummaries,
      totalTimeSecondsAll,
      totalDecimalHoursAll,
      totalDoneAll,
      totalApprovedAll,
      entries: matchedEntries,
    };
  }, [reportData, descriptionFilter]);

  // Suggestions for description filter autocomplete
  const billingDescriptionSuggestions = useMemo((): DescriptionSuggestionItem[] => {
    const map = new Map<string, { description: string; count: number; timeSeconds: number }>();

    // 1. Current loaded period entries
    reportData.entries.forEach(e => {
      const desc = e.description?.trim();
      if (!desc) return;
      const lower = desc.toLowerCase();
      const existing = map.get(lower);
      const secs = e.time_spent_seconds || 0;
      if (existing) {
        existing.count += 1;
        existing.timeSeconds += secs;
      } else {
        map.set(lower, {
          description: desc,
          count: 1,
          timeSeconds: secs,
        });
      }
    });

    // 2. Known historical descriptions for selected client or all clients
    const fallbackList = selectedClient
      ? (allClientDescriptions[selectedClient] || [])
      : (allClientDescriptions.all || []);

    fallbackList.forEach(item => {
      const lower = item.description.toLowerCase();
      if (!map.has(lower)) {
        map.set(lower, {
          description: item.description,
          count: item.count || 0,
          timeSeconds: 0,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.timeSeconds - a.timeSeconds || b.count - a.count || a.description.localeCompare(b.description)
    );
  }, [reportData.entries, selectedClient, allClientDescriptions]);

  // Active filter helper states
  const selectedClientName = clients.find(c => c.id === selectedClient)?.name;
  const selectedUserName = profiles.find(p => p.id === selectedUser)?.name;
  const selectedWorkTypeName = workTypes.find(wt => wt.id === selectedWorkType)?.name;
  const hasActiveFilters = Boolean(
    selectedClient || selectedUser || selectedWorkType || descriptionFilter.trim()
  );

  const clearAllFilters = () => {
    setSelectedClient('');
    setSelectedUser('');
    setSelectedWorkType('');
    setDescriptionFilter('');
  };

  // Highlight matching substring helper
  const renderHighlightedDescription = (text: string, query: string) => {
    if (!query.trim() || !text) {
      return <span>{text || '-'}</span>;
    }
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="text-emerald-200 bg-emerald-400/15 rounded px-0.5">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  // Export Time Tracking CSV (Clean: without rates or currency)
  const handleExportCSV = () => {
    const rows: Record<string, any>[] = [];

    filteredReportData.clientSummaries.forEach(client => {
      if (client.entries.length === 0) {
        rows.push({
          'Client Name': client.clientName,
          'Date': '-',
          'Deliverable Type': 'No entries',
          'Description': '-',
          'Designer': '-',
          'Quantity Done': client.totalDone,
          'Quantity Approved': client.totalApproved,
          'Time Spent': formatReportTime(client.totalTimeSeconds),
          'Decimal Hours': client.decimalHours,
        });
      } else {
        client.entries.forEach(entry => {
          const entrySecs = entry.time_spent_seconds || 0;
          const decHrs = formatReportHoursDecimal(entrySecs);
          rows.push({
            'Client Name': client.clientName,
            'Date': entry.work_date,
            'Deliverable Type': entry.work_type?.name || 'Deliverable',
            'Description': entry.description || '',
            'Designer': entry.profile?.name || 'Designer',
            'Quantity Done': entry.quantity_done,
            'Quantity Approved': entry.quantity_approved,
            'Time Spent': formatReportTime(entrySecs),
            'Decimal Hours': decHrs,
            'Project URL': entry.project_url || entry.best_work_url || '',
          });
        });
      }
    });

    const nameSuffix = descriptionFilter.trim() ? `_${descriptionFilter.trim().replace(/\s+/g, '_')}` : '';
    exportToCSV(`Client_Time_Report_${startDate}_to_${endDate}${nameSuffix}`, rows);
    showToast('Client time CSV exported', 'success');
  };

  const activeClientsCount = filteredReportData.clientSummaries.filter(
    c => c.totalDone > 0 || c.totalTimeSeconds > 0
  ).length;

  const avgMinutesPerItem =
    filteredReportData.totalDoneAll > 0
      ? Math.round(filteredReportData.totalTimeSecondsAll / filteredReportData.totalDoneAll / 60)
      : 0;

  const maxClientSeconds = Math.max(1, ...filteredReportData.clientSummaries.map(c => c.totalTimeSeconds));
  const shortDate = (dateStr: string) =>
    parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const presetBtn = (preset: 'today' | 'this_week' | 'this_month' | 'last_30') =>
    `h-8 px-3 rounded-md text-xs transition-colors cursor-pointer ${
      isPresetActive(preset) ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-slate-200'
    }`;
  const filterLabel = 'block text-xs text-slate-500 mb-1.5';
  const chip = 'inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300';
  const chipX = 'inline-flex items-center justify-center w-5 h-5 rounded text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer';

  return (
    <div className="min-h-screen flex flex-col md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <Navbar />

      <ReportsSubNav>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs text-slate-300 hover:text-white rounded-lg border border-white/[0.08] hover:bg-white/[0.05] transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          Export CSV
        </button>
      </ReportsSubNav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium text-slate-50">Client hours</h1>
            <p className="text-sm text-slate-400 mt-1">Time the team spent on each client</p>
          </div>

          {/* Range picker */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleRangeDelta(-7)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              title="Back 7 days"
              aria-label="Back 7 days"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] text-sm text-slate-200 transition-colors cursor-pointer tabular-nums"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {getWeekRangeLabel()}
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {isCalendarOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsCalendarOpen(false)} />
                  <div className="absolute right-0 mt-2 z-40 w-[310px] rounded-xl border border-white/[0.08] bg-[#151514] p-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.55)] space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleMonthDelta(-1)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-slate-200">
                        {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMonthDelta(1)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                        aria-label="Next month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 text-center text-[11px] text-slate-500">
                      <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                    </div>

                    <div className="grid grid-cols-7 gap-y-0.5">
                      {generateCalendarDays(viewDate).map(dayObj => {
                        const dStr = formatLocalDate(dayObj.date);
                        const active = isSelected(dayObj.date);
                        const hoverActive = isInHoverRange(dayObj.date);
                        const edge = isStart(dayObj.date) || isEnd(dayObj.date);
                        const isToday = dStr === formatLocalDate(new Date());

                        return (
                          <button
                            key={dayObj.key}
                            type="button"
                            onMouseEnter={() => setHoveredDate(dStr)}
                            onMouseLeave={() => setHoveredDate(null)}
                            onClick={() => handleSelectWeekFromDate(dayObj.date)}
                            className={`relative h-9 text-xs tabular-nums flex items-center justify-center transition-colors cursor-pointer ${
                              edge
                                ? 'bg-emerald-500 text-[#0b1410] font-medium rounded-md'
                                : active
                                  ? 'bg-emerald-400/10 text-emerald-200'
                                  : hoverActive
                                    ? 'bg-white/[0.05] text-slate-200'
                                    : dayObj.isCurrentMonth
                                      ? 'text-slate-300 hover:bg-white/[0.05] rounded-md'
                                      : 'text-slate-600 rounded-md'
                            }`}
                          >
                            {dayObj.date.getDate()}
                            {isToday && !active && (
                              <span className="absolute bottom-1 w-1 h-1 bg-emerald-400 rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3">
                      <label className="text-[11px] text-slate-500">
                        From
                        <input
                          type="date"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          className="mt-1 w-full h-8 px-2 rounded-md bg-white/[0.03] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-emerald-400/40 [color-scheme:dark]"
                        />
                      </label>
                      <label className="text-[11px] text-slate-500">
                        To
                        <input
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          className="mt-1 w-full h-8 px-2 rounded-md bg-white/[0.03] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-emerald-400/40 [color-scheme:dark]"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsCalendarOpen(false)}
                        className="h-7 px-3 rounded-md bg-white/[0.08] hover:bg-white/[0.12] text-xs text-slate-100 cursor-pointer transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => handleRangeDelta(7)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              title="Forward 7 days"
              aria-label="Forward 7 days"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick ranges + filters */}
        <div className="space-y-3">
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-white/[0.03] border border-white/[0.05] p-0.5">
            <button type="button" onClick={() => applyPreset('today')} className={presetBtn('today')}>Today</button>
            <button type="button" onClick={() => applyPreset('this_week')} className={presetBtn('this_week')}>This week</button>
            <button type="button" onClick={() => applyPreset('this_month')} className={presetBtn('this_month')}>This month</button>
            <button type="button" onClick={() => applyPreset('last_30')} className={presetBtn('last_30')}>Last 30 days</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={filterLabel}>Client</label>
              <RichSelect
                value={selectedClient}
                onChange={val => setSelectedClient(String(val))}
                options={[{ value: '', label: 'All clients' }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
                size="sm"
                searchable
                placeholder="All clients"
              />
            </div>
            <div>
              <label className={filterLabel}>Person</label>
              <RichSelect
                value={selectedUser}
                onChange={val => setSelectedUser(String(val))}
                options={[{ value: '', label: 'Everyone' }, ...profiles.map(p => ({ value: p.id, label: p.name }))]}
                size="sm"
                placeholder="Everyone"
              />
            </div>
            <div>
              <label className={filterLabel}>Work type</label>
              <RichSelect
                value={selectedWorkType}
                onChange={val => setSelectedWorkType(String(val))}
                options={[{ value: '', label: 'All types' }, ...workTypes.map(wt => ({ value: wt.id, label: wt.name }))]}
                size="sm"
                placeholder="All types"
              />
            </div>
            <div>
              <label className={filterLabel}>Description</label>
              <DescriptionAutocomplete
                value={descriptionFilter}
                onChange={setDescriptionFilter}
                suggestions={billingDescriptionSuggestions}
                placeholder="Search descriptions"
                size="sm"
                allowClear
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedClient && (
                <span className={chip}>
                  {selectedClientName}
                  <button type="button" onClick={() => setSelectedClient('')} className={chipX} aria-label="Remove client filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedUser && (
                <span className={chip}>
                  {selectedUserName}
                  <button type="button" onClick={() => setSelectedUser('')} className={chipX} aria-label="Remove person filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedWorkType && (
                <span className={chip}>
                  {selectedWorkTypeName}
                  <button type="button" onClick={() => setSelectedWorkType('')} className={chipX} aria-label="Remove work type filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {descriptionFilter.trim() && (
                <span className={chip}>
                  &ldquo;{descriptionFilter}&rdquo;
                  <button type="button" onClick={() => setDescriptionFilter('')} className={chipX} aria-label="Remove description filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button type="button" onClick={clearAllFilters} className="text-xs text-slate-400 hover:text-white cursor-pointer ml-1">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bento-card grid grid-cols-2 lg:grid-cols-4 [&>*]:border-white/[0.06] [&>*:nth-child(even)]:border-l lg:[&>*:not(:first-child)]:border-l [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0">
          <div className="p-5">
            <div className="text-xs text-slate-500">Time tracked</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums truncate">
              {formatReportTime(filteredReportData.totalTimeSecondsAll)}
            </div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">{filteredReportData.totalDecimalHoursAll} hours</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Clients</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums">
              {activeClientsCount}
              <span className="text-lg text-slate-500"> / {filteredReportData.clientSummaries.length}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">had work in this range</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Deliverables</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums">{filteredReportData.totalDoneAll}</div>
            <div className="mt-1 text-xs text-slate-500">
              <span className="text-emerald-400">{filteredReportData.totalApprovedAll}</span> approved
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Average per deliverable</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums">
              {avgMinutesPerItem}
              <span className="text-lg text-slate-500"> min</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">of tracked time</div>
          </div>
        </div>

        {/* Clients */}
        <div className="bento-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-slate-100">By client</h2>
            <span className="text-xs text-slate-500">Open a client to see each task</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <OrbitLoader size="lg" text="Adding up client hours" />
            </div>
          ) : filteredReportData.clientSummaries.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-200">
                {descriptionFilter.trim() ? `Nothing matches “${descriptionFilter}”` : 'No client work in this range'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {descriptionFilter.trim() ? (
                  <button type="button" onClick={() => setDescriptionFilter('')} className="text-slate-300 hover:text-white cursor-pointer">
                    Clear the search
                  </button>
                ) : (
                  'Try a wider date range or fewer filters'
                )}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {filteredReportData.clientSummaries.map(client => {
                const isExpanded = Boolean(expandedClients[client.clientId]);
                const types = Object.entries(client.workTypeBreakdown).filter(
                  ([, data]) => data.count > 0 || data.timeSeconds > 0
                );

                return (
                  <div key={client.clientId}>
                    <button
                      type="button"
                      onClick={() => toggleClientExpand(client.clientId)}
                      aria-expanded={isExpanded}
                      className="w-full text-left px-5 py-4 grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_220px_20px] items-center gap-x-6 gap-y-2 hover:bg-white/[0.015] transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-100 truncate">{client.clientName}</div>
                        <div className="mt-0.5 text-xs text-slate-500 truncate">
                          {types.length > 0
                            ? types.map(([name, data]) => `${name} ${data.count}`).join(' · ')
                            : 'No deliverables'}
                        </div>
                      </div>
                      <div className="hidden md:block h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-400/80"
                          style={{ width: `${(client.totalTimeSeconds / maxClientSeconds) * 100}%` }}
                        />
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="font-display text-base text-white">{formatReportTime(client.totalTimeSeconds)}</div>
                        <div className="text-xs text-slate-500">
                          {client.decimalHours} h · {client.totalDone} made · <span className="text-emerald-400">{client.totalApproved}</span> approved
                        </div>
                      </div>
                      <ChevronDown
                        className={`hidden md:block w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-4">
                        {client.entries.length === 0 ? (
                          <p className="text-xs text-slate-500 py-3">No tasks logged for this client in this range</p>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-white/[0.05] bg-black/20">
                            <table className="w-full text-left text-sm">
                              <thead className="text-xs text-slate-500">
                                <tr className="border-b border-white/[0.05]">
                                  <th className="px-3 py-2.5 font-normal">Date</th>
                                  <th className="px-3 py-2.5 font-normal">Person</th>
                                  <th className="px-3 py-2.5 font-normal">Task</th>
                                  <th className="px-3 py-2.5 font-normal text-right">Approved</th>
                                  <th className="px-3 py-2.5 font-normal text-right">Time</th>
                                  <th className="px-3 py-2.5 font-normal text-right">Hours</th>
                                  <th className="px-3 py-2.5 font-normal w-8"><span className="sr-only">Link</span></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.04] tabular-nums">
                                {client.entries.map(entry => {
                                  const entrySecs = entry.time_spent_seconds || 0;
                                  const decHrs = formatReportHoursDecimal(entrySecs);
                                  const url = entry.project_url || entry.best_work_url;

                                  return (
                                    <tr key={entry.id} className="text-slate-300 hover:bg-white/[0.015]">
                                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{shortDate(entry.work_date)}</td>
                                      <td className="px-3 py-2.5 whitespace-nowrap">{entry.profile?.name || 'Designer'}</td>
                                      <td className="px-3 py-2.5 min-w-[220px]">
                                        <span className="text-slate-100">{renderHighlightedDescription(entry.description || '–', descriptionFilter)}</span>
                                        <span className="ml-2 text-xs text-slate-500">{entry.work_type?.name || 'Task'}</span>
                                      </td>
                                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                        <span className="text-emerald-400">{entry.quantity_approved}</span>
                                        <span className="text-slate-500"> / {entry.quantity_done}</span>
                                      </td>
                                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                        {entrySecs > 0 ? formatReportTime(entrySecs) : <span className="text-slate-600">–</span>}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap">{decHrs > 0 ? `${decHrs}` : '–'}</td>
                                      <td className="px-3 py-2.5 text-right">
                                        {url && (
                                          <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex text-slate-500 hover:text-emerald-400 transition-colors"
                                            title="Open link"
                                            aria-label="Open link"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
