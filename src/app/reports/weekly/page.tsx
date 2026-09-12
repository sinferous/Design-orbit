'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { getWeeklyReportData, getWeekRange, WeeklyUserSummary, exportToCSV, formatReportTime } from '@/lib/services/reports';
import { fetchWeeklyBestWorkRecords, saveWeeklyBestWorkLinkRecord } from '@/lib/services/work-entry';
import { ChevronLeft, ChevronRight, Calendar, Download, ChevronDown, ChevronUp, Link as LinkIcon, Award, Sparkles, ExternalLink, Building2, Plus, Edit2, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { WeeklyBestWorkModal } from '@/components/reports/WeeklyBestWorkModal';

export default function WeeklyReportPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [summaries, setSummaries] = useState<WeeklyUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Store weekly best work links per profile (persisted per week)
  const [bestWorkLinks, setBestWorkLinks] = useState<Record<string, string>>({});

  // Modal state for managing Weekly Best Work
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    profileId: string;
    designerName: string;
    currentUrl: string;
  } | null>(null);

  const handleSaveModalLink = async (profileId: string, url: string) => {
    await saveWeeklyBestWorkLinkRecord(profileId, startDate, url);
    setBestWorkLinks(prev => ({ ...prev, [profileId]: url }));
    showToast('Weekly Best Work link saved successfully!', 'success');
  };

  const handleDeleteModalLink = async (profileId: string) => {
    await saveWeeklyBestWorkLinkRecord(profileId, startDate, '');
    setBestWorkLinks(prev => {
      const copy = { ...prev };
      delete copy[profileId];
      return copy;
    });
    showToast('Weekly Best Work link removed.', 'success');
  };

  // Persistent helper for Weekly Best Work Links per week & profile
  const getSavedWeeklyLink = useCallback((profileId: string, weekStart: string) => {
    if (typeof window === 'undefined' || !weekStart) return '';
    return localStorage.getItem(`design_orbit_weekly_link_${profileId}_${weekStart}`) || '';
  }, []);

  const saveWeeklyLink = useCallback((profileId: string, weekStart: string, url: string) => {
    if (typeof window === 'undefined' || !weekStart) return;
    if (url.trim()) {
      localStorage.setItem(`design_orbit_weekly_link_${profileId}_${weekStart}`, url.trim());
    } else {
      localStorage.removeItem(`design_orbit_weekly_link_${profileId}_${weekStart}`);
    }
  }, []);

  // Premium Calendar Selector states
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    const range = getWeekRange(new Date());
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, []);

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

  const handleMonthDelta = (months: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + months);
    setViewDate(next);
  };

  const handleSelectWeekFromDate = (date: Date) => {
    const startStr = formatLocalDate(date);
    // Exactly 7 days inclusive: Start date + 6 days
    const endDateObj = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6, 12, 0, 0);
    const endStr = formatLocalDate(endDateObj);
    setStartDate(startStr);
    setEndDate(endStr);
  };

  const getWeekRangeLabel = () => {
    if (!startDate || !endDate) return 'Select Week Range';
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
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
        key: `prev-${prevMonthTotalDays - i}`
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i, 12, 0, 0);
      daysArr.push({
        date: d,
        isCurrentMonth: true,
        key: `curr-${i}`
      });
    }

    const remaining = 42 - daysArr.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i, 12, 0, 0);
      daysArr.push({
        date: d,
        isCurrentMonth: false,
        key: `next-${i}`
      });
    }

    return daysArr;
  };

  const loadReport = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const [data, dbLinksMap] = await Promise.all([
        getWeeklyReportData(startDate, endDate),
        fetchWeeklyBestWorkRecords(startDate)
      ]);
      setSummaries(data);
      setBestWorkLinks(dbLinksMap);
    } catch (err) {
      console.error('Failed to load weekly report:', err);
      showToast('Failed to load weekly report.', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, showToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleWeekDelta = (weeks: number) => {
    if (!startDate || !endDate) return;
    const currStart = parseLocalDate(startDate);
    const currEnd = parseLocalDate(endDate);
    currStart.setDate(currStart.getDate() + weeks * 7);
    currEnd.setDate(currEnd.getDate() + weeks * 7);

    setStartDate(formatLocalDate(currStart));
    setEndDate(formatLocalDate(currEnd));
  };

  const toggleExpand = (userId: string) => {
    setExpandedUser(prev => (prev === userId ? null : userId));
  };

  const handleExportCSV = () => {
    const csvRows = summaries.map(s => ({
      'Team Member': s.profile.name,
      'Designation': s.profile.designation || 'Team',
      'Total Created': s.totalCreated,
      'Total Approved': s.totalApproved,
      'Approval Rate (%)': `${s.approvalRate}%`,
      'Total Time Spent': formatReportTime(s.totalTimeSeconds || 0),
      'Time Spent (Hours)': ((s.totalTimeSeconds || 0) / 3600).toFixed(2),
      'Weekly Best Work Link': bestWorkLinks[s.profile.id] || '',
    }));
    exportToCSV(`Weekly_Report_${startDate}_to_${endDate}`, csvRows);
    showToast('Exported Weekly Meeting Report CSV successfully!', 'success');
  };

  const grandTotalCreated = summaries.reduce((acc, curr) => acc + curr.totalCreated, 0);
  const grandTotalApproved = summaries.reduce((acc, curr) => acc + curr.totalApproved, 0);
  const grandApprovalRate = grandTotalCreated > 0 ? Math.round((grandTotalApproved / grandTotalCreated) * 100) : 0;
  const grandTotalSeconds = summaries.reduce((acc, curr) => acc + (curr.totalTimeSeconds || 0), 0);
  const activeClientSet = new Set<string>();
  summaries.forEach(s => {
    s.entries?.forEach(e => {
      if (e.client?.name) activeClientSet.add(e.client.name.trim());
      else if (e.client_id) activeClientSet.add(e.client_id);
    });
  });
  const totalActiveClients = activeClientSet.size;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Sub-Navigation for Reports */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex space-x-4 sm:space-x-6 min-w-max">
            <Link
              href="/reports/weekly"
              className="py-3 text-xs sm:text-sm font-bold text-sky-600 border-b-2 border-sky-600 whitespace-nowrap"
            >
              Weekly Meeting Report
            </Link>
            <Link
              href="/reports/monthly"
              className="py-3 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Monthly Summary
            </Link>
            <Link
              href="/reports/overall"
              className="py-3 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Overall / All-Time
            </Link>
            <Link
              href="/reports/billing"
              className="py-3 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Client Time Tracking
            </Link>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Weekly Header Banner */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                Weekly Meeting Mode
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">•</span>
              <span className="text-xs font-medium text-slate-500">Auto-aggregated from Daily Entries</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Weekly Team Review
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Screen-friendly layout for weekly team discussions and work explanations.
            </p>
          </div>

          {/* Week Navigation */}
          <div className="w-full md:w-auto flex items-center justify-between gap-1.5 sm:gap-2 bg-slate-50 p-1.5 sm:p-2.5 rounded-xl border border-slate-200 relative">
            <button
              onClick={() => handleWeekDelta(-1)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer shadow-2xs"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="w-full flex items-center justify-center space-x-2 px-2.5 sm:px-4 py-2 bg-white rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/20 shadow-2xs transition-all text-xs font-bold text-slate-800 cursor-pointer truncate"
              >
                <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="truncate">{getWeekRangeLabel()}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-450 shrink-0" />
              </button>

              {isCalendarOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsCalendarOpen(false)}
                  />
                  <div className="absolute right-0 sm:left-0 mt-2 z-40 bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 sm:p-4 w-[calc(100vw-48px)] sm:w-[340px] max-w-[340px] space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Calendar Month Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleMonthDelta(-1)}
                        className="p-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-855 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider">
                        {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMonthDelta(1)}
                        className="p-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-855 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="space-y-1">
                      {/* Weekday labels */}
                      <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pb-1">
                        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                      </div>

                      {/* Days grid */}
                      <div className="grid grid-cols-7 gap-0.5">
                        {generateCalendarDays(viewDate).map((dayObj) => {
                          const dStr = formatLocalDate(dayObj.date);
                          const active = isSelected(dayObj.date);
                          const hoverActive = isInHoverRange(dayObj.date);
                          const start = isStart(dayObj.date);
                          const end = isEnd(dayObj.date);
                          const isToday = dStr === formatLocalDate(new Date());

                          return (
                            <button
                              key={dayObj.key}
                              type="button"
                              onMouseEnter={() => setHoveredDate(dStr)}
                              onMouseLeave={() => setHoveredDate(null)}
                              onClick={() => {
                                handleSelectWeekFromDate(dayObj.date);
                              }}
                              className={`h-8 w-8 sm:h-9 sm:w-9 text-xs font-semibold rounded-md flex items-center justify-center transition-all cursor-pointer relative ${
                                !dayObj.isCurrentMonth ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'
                              } ${
                                active
                                  ? 'bg-sky-50 text-sky-800 font-bold border border-sky-200'
                                  : hoverActive
                                  ? 'bg-slate-50 border border-dashed border-slate-300'
                                  : ''
                              } ${
                                start ? '!bg-sky-600 !text-white !border-sky-700 shadow-xs' : ''
                              } ${
                                end ? '!bg-sky-600 !text-white !border-sky-700 shadow-xs' : ''
                              }`}
                            >
                              {dayObj.date.getDate()}
                              {isToday && !active && (
                                <span className="absolute bottom-1 w-1.5 h-1.5 bg-sky-600 rounded-full" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-3">
                      {/* Manual Override inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Start Date</span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="font-bold text-slate-950 focus:outline-none bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs w-full"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">End Date</span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="font-bold text-slate-950 focus:outline-none bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs w-full"
                          />
                        </div>
                      </div>

                      {/* Presets & Actions */}
                      <div className="flex items-center justify-between text-[11px] font-bold border-t border-slate-50 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const range = getWeekRange(new Date());
                            setStartDate(range.startDate);
                            setEndDate(range.endDate);
                            setViewDate(new Date());
                          }}
                          className="text-sky-600 hover:text-sky-800 cursor-pointer"
                        >
                          This Week
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const lastWeek = new Date();
                            lastWeek.setDate(lastWeek.getDate() - 7);
                            const range = getWeekRange(lastWeek);
                            setStartDate(range.startDate);
                            setEndDate(range.endDate);
                            setViewDate(lastWeek);
                          }}
                          className="text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Last Week
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCalendarOpen(false)}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md cursor-pointer transition-colors shadow-2xs"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => handleWeekDelta(1)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer shadow-2xs"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekly Team Overview Bar - 2x2 Grid on Mobile for Maximum Space Efficiency */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Team Created</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{grandTotalCreated}</div>
            <p className="text-[11px] text-slate-400 sm:text-xs sm:text-slate-500 truncate">Items this week</p>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Team Approved</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-700">{grandTotalApproved}</div>
            <p className="text-[11px] text-emerald-600 font-medium sm:text-xs truncate">{grandApprovalRate}% approval rate</p>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Time Tracked</div>
            <div className="text-xl sm:text-3xl font-extrabold text-amber-700 flex items-center space-x-1 sm:space-x-1.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="truncate">{formatReportTime(grandTotalSeconds)}</span>
            </div>
            <p className="text-[11px] text-slate-400 sm:text-xs sm:text-slate-500 truncate">Total deliverable time</p>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Active Clients</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-700 flex items-center space-x-1 sm:space-x-1.5">
              <Building2 className="w-5 h-5 text-sky-600 shrink-0" />
              <span>{totalActiveClients}</span>
            </div>
            <p className="text-[11px] text-slate-400 sm:text-xs sm:text-slate-500 truncate">Brands this week</p>
          </div>
        </div>

        {/* Team Member Cards */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-xs text-slate-500 font-medium">Calculating weekly report aggregations...</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {summaries.map(s => {
              const isExpanded = expandedUser === s.profile.id;
              const userBestWork = bestWorkLinks[s.profile.id] || '';

              return (
                <div
                  key={s.profile.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all"
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 border-b border-slate-100">
                    <div className="flex items-center space-x-3.5 sm:space-x-4">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center shadow-sm shrink-0">
                        {s.profile.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{s.profile.name}</h2>
                          <span className="px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold bg-slate-100 text-slate-700">
                            {s.profile.designation || 'Team'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {s.entries.length} daily entry record(s) logged this week
                        </p>
                      </div>
                    </div>

                    {/* Stats Summary & Expand Trigger - Cleanly Aligned for Mobile & Desktop */}
                    <div className="flex items-center justify-between lg:justify-end gap-2.5 sm:gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:space-x-6 flex-1 sm:flex-initial">
                        {/* Created / Approved Mini-Tile */}
                        <div className="bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none text-left sm:text-right border sm:border-0 border-slate-100/80">
                          <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Created / Approved</div>
                          <div className="text-sm sm:text-lg font-bold text-slate-900">
                            {s.totalCreated} <span className="text-slate-400 font-normal">/</span>{' '}
                            <span className="text-teal-700">{s.totalApproved}</span>
                          </div>
                        </div>

                        {/* Approval Rate Mini-Tile */}
                        <div className="bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none text-left sm:text-right border sm:border-0 border-slate-100/80">
                          <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Approval Rate</div>
                          <div className="text-sm sm:text-lg font-bold text-sky-700">{s.approvalRate}%</div>
                        </div>
                      </div>

                      {/* Styled Action Button for Inspect Entries */}
                      <button
                        onClick={() => toggleExpand(s.profile.id)}
                        className="px-3 py-2 sm:p-2 text-xs font-semibold text-slate-700 sm:text-slate-600 hover:text-slate-900 bg-slate-100 sm:hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1 shrink-0 cursor-pointer shadow-2xs sm:shadow-none"
                        title={isExpanded ? 'Hide Details' : 'Inspect Daily Entries'}
                      >
                        <span className="whitespace-nowrap">{isExpanded ? 'Hide' : 'Inspect'}</span>
                        <span className="hidden sm:inline whitespace-nowrap">{isExpanded ? 'Details' : 'Entries'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 ml-0.5 text-slate-500" /> : <ChevronDown className="w-4 h-4 ml-0.5 text-slate-500" />}
                      </button>
                    </div>
                  </div>

                  {/* Work Type Summary Table - 3 Columns on Mobile (Only 3 neat rows instead of 5 tall rows) */}
                  <div className="p-3.5 sm:p-6 bg-slate-50/50 space-y-3 sm:space-y-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Work Type Aggregation — {s.profile.name}
                    </h3>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-1.5 sm:gap-2">
                      {Object.entries(s.workTypeBreakdown)
                        .filter(([typeName]) => typeName.trim().toLowerCase() !== 'working')
                        .map(([typeName, data]) => {
                          const hasWork = data.done > 0;
                          return (
                            <div
                              key={typeName}
                              className={`p-2 sm:p-3 rounded-lg border text-center transition-all ${
                                hasWork
                                  ? 'bg-white border-sky-300 shadow-2xs ring-1 ring-sky-100'
                                  : 'bg-slate-50/60 border-slate-200/60 opacity-40 hover:opacity-75'
                              }`}
                            >
                              <div className={`text-[11px] sm:text-xs font-bold truncate ${hasWork ? 'text-slate-800' : 'text-slate-500'}`}>
                                {typeName}
                              </div>
                              <div className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">
                                {data.done}{' '}
                                <span className={`text-[10px] sm:text-xs font-bold ${hasWork ? 'text-teal-600' : 'text-slate-400'}`}>
                                  ({data.approved})
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Featured Weekly Best Work Feature - Framed Banner with Polished Mobile Buttons */}
                    <div className="p-3 bg-gradient-to-r from-amber-50/60 via-amber-50/30 to-slate-50/50 border border-amber-200/70 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Featured Weekly Best Work:</span>
                      </div>

                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        {bestWorkLinks[s.profile.id] ? (
                          <>
                            <a
                              href={bestWorkLinks[s.profile.id]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                              title="Open Featured Best Work Link"
                            >
                              <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="truncate max-w-[180px]">View Best Work ↗</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                setModalConfig({
                                  isOpen: true,
                                  profileId: s.profile.id,
                                  designerName: s.profile.name,
                                  currentUrl: bestWorkLinks[s.profile.id],
                                });
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-center space-x-1 cursor-pointer shrink-0"
                              title="Edit or Remove Best Work Link"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit / Remove</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                profileId: s.profile.id,
                                designerName: s.profile.name,
                                currentUrl: '',
                              });
                            }}
                            className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold text-white webtree-gradient-btn rounded-xl shadow-2xs transition-transform active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Best Work</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Daily Entries Drill-down Grouped Client-Wise */}
                  {isExpanded && (
                    <div className="p-3.5 sm:p-6 border-t border-slate-200 space-y-3 sm:space-y-4 bg-white">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Client-Wise Work Entries ({s.entries.length} Total Items)
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                          Organized by Client Name (A-Z)
                        </span>
                      </div>

                      {s.entries.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No entries logged for this week.</p>
                      ) : (
                        (() => {
                          // Group entries by Client
                          const clientMap: Record<string, typeof s.entries> = {};
                          s.entries.forEach(entry => {
                            const clientName = entry.client?.name || 'General / Internal';
                            if (!clientMap[clientName]) clientMap[clientName] = [];
                            clientMap[clientName].push(entry);
                          });

                          const sortedClients = Object.keys(clientMap).sort((a, b) => a.localeCompare(b));

                          return (
                            <div className="space-y-3 sm:space-y-4">
                              {sortedClients.map(clientName => {
                                const items = clientMap[clientName];
                                return (
                                  <div
                                    key={clientName}
                                    className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 shadow-2xs"
                                  >
                                    {/* Client Header */}
                                    <div className="px-3 sm:px-4 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                                      <div className="flex items-center space-x-2 truncate">
                                        <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                        <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider truncate">
                                          {clientName}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2 shrink-0">
                                        <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                                          {items.length} item(s)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Entries for this Client */}
                                    <div className="p-2 sm:p-3 space-y-2 bg-white">
                                      {items.map(entry => (
                                        <div
                                          key={entry.id}
                                          className="p-2.5 sm:p-3 bg-slate-50/80 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-100/60 transition-colors"
                                        >
                                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                                            <span className="font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded text-[10px] sm:text-[11px] shrink-0">
                                              {entry.work_date}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold text-[10px] sm:text-[11px] shrink-0">
                                              {entry.work_type?.name || 'Work'}
                                            </span>
                                            <span className="text-slate-900 font-medium break-words">{entry.description}</span>
                                            {(entry.project_url || entry.best_work_url) && (
                                              <a
                                                href={entry.project_url || entry.best_work_url!}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center space-x-1 text-sky-600 hover:text-sky-800 font-semibold underline shrink-0"
                                                title="Open Project URL"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                                <span>Project Link</span>
                                              </a>
                                            )}
                                          </div>

                                          <div className="flex items-center space-x-3 sm:space-x-4 shrink-0 text-slate-600 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 justify-between sm:justify-end">
                                            <span>
                                              Done: <strong className="text-slate-900">{entry.quantity_done}</strong>
                                            </span>
                                            <span>
                                              Approved: <strong className="text-teal-700">{entry.quantity_approved}</strong>
                                            </span>
                                            <span
                                              className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                                entry.quantity_approved > 0 || entry.status === 'Reviewed'
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                                              }`}
                                            >
                                              {entry.status}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Weekly Best Work Modal */}
      {modalConfig && (
        <WeeklyBestWorkModal
          isOpen={modalConfig.isOpen}
          designerName={modalConfig.designerName}
          profileId={modalConfig.profileId}
          weekStartDate={startDate}
          currentUrl={modalConfig.currentUrl}
          onSave={handleSaveModalLink}
          onDelete={handleDeleteModalLink}
          onClose={() => setModalConfig(null)}
        />
      )}
    </div>
  );
}
