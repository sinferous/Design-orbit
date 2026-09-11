'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { fetchProfiles, fetchWorkTypes, fetchClients } from '@/lib/services/work-entry';
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
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export default function ClientTimeTrackingReportPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

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
        const [pData, wtData, cData] = await Promise.all([
          fetchProfiles(),
          fetchWorkTypes(),
          fetchClients(),
        ]);
        const creativeProfiles = pData.filter(
          p => p.name !== 'Admin' && !p.designation?.toLowerCase().includes('administrator')
        );
        setProfiles(creativeProfiles);
        setWorkTypes(wtData);
        setClients(cData);
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

  // Export Time Tracking CSV (Clean: without rates or currency)
  const handleExportCSV = () => {
    const rows: Record<string, any>[] = [];

    reportData.clientSummaries.forEach(client => {
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

    exportToCSV(`Client_Time_Report_${startDate}_to_${endDate}`, rows);
    showToast('Exported Client Time Tracking CSV report!', 'success');
  };

  const activeClientsCount = reportData.clientSummaries.filter(
    c => c.totalDone > 0 || c.totalTimeSeconds > 0
  ).length;

  const avgMinutesPerItem =
    reportData.totalDoneAll > 0
      ? Math.round(reportData.totalTimeSecondsAll / reportData.totalDoneAll / 60)
      : 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar userName="Gajesh" />

      {/* Sub-Navigation for Reports */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex space-x-4 sm:space-x-6 min-w-max">
            <Link
              href="/reports/weekly"
              className="py-3 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
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
              className="py-3 text-xs sm:text-sm font-bold text-sky-600 border-b-2 border-sky-600 whitespace-nowrap"
            >
              Client Time Tracking
            </Link>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Time CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Banner with Rich Date Range Picker */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider bg-sky-50 text-sky-700 rounded-full border border-sky-200">
                Time Spent & Deliverables
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500">Auto-aggregated from task timers</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Client Time Tracking Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Review exact time spent by team members across clients and deliverables.
            </p>
          </div>

          {/* Rich Calendar Dropdown Control */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 relative">
            <button
              onClick={() => handleRangeDelta(-7)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer shadow-2xs"
              title="Previous 7 Days"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="flex items-center space-x-2.5 px-4 py-2 bg-white rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/20 shadow-2xs transition-all text-xs font-bold text-slate-800 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{getWeekRangeLabel()}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isCalendarOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsCalendarOpen(false)}
                  />
                  <div className="absolute right-0 sm:left-0 mt-2 z-40 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 w-[320px] sm:w-[350px] space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Calendar Month Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleMonthDelta(-1)}
                        className="p-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider">
                        {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMonthDelta(1)}
                        className="p-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
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
                        {generateCalendarDays(viewDate).map(dayObj => {
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

                    {/* Manual Range inputs */}
                    <div className="border-t border-slate-100 pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
                            Start Date
                          </span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="font-bold text-slate-900 focus:outline-none bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs w-full"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
                            End Date
                          </span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="font-bold text-slate-900 focus:outline-none bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs w-full"
                          />
                        </div>
                      </div>

                      {/* Presets & Actions inside popup */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] font-bold border-t border-slate-50 pt-2 gap-1">
                        <button
                          type="button"
                          onClick={() => applyPreset('this_week')}
                          className={`cursor-pointer transition-colors ${
                            isPresetActive('this_week') ? 'text-sky-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          This Week
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('this_month')}
                          className={`cursor-pointer transition-colors ${
                            isPresetActive('this_month') ? 'text-sky-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          This Month
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('last_30')}
                          className={`cursor-pointer transition-colors ${
                            isPresetActive('last_30') ? 'text-sky-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          30 Days
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
              onClick={() => handleRangeDelta(7)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer shadow-2xs"
              title="Next 7 Days"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls & Presets Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          {/* Quick Presets Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mr-1">
                Quick Ranges:
              </span>
              <button
                type="button"
                onClick={() => applyPreset('today')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  isPresetActive('today')
                    ? 'bg-sky-50 text-sky-700 border border-sky-200 font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPreset('this_week')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  isPresetActive('this_week')
                    ? 'bg-sky-50 text-sky-700 border border-sky-200 font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                This Week (Tue-Mon)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('this_month')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  isPresetActive('this_month')
                    ? 'bg-sky-50 text-sky-700 border border-sky-200 font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last_30')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  isPresetActive('last_30')
                    ? 'bg-sky-50 text-sky-700 border border-sky-200 font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Last 30 Days
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Active Range: <strong className="text-slate-800">{getWeekRangeLabel()}</strong>
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Filter Client
              </label>
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 shadow-2xs"
              >
                <option value="">All Clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Filter Team Member
              </label>
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 shadow-2xs"
              >
                <option value="">All Team Members</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Filter Work Type
              </label>
              <select
                value={selectedWorkType}
                onChange={e => setSelectedWorkType(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 shadow-2xs"
              >
                <option value="">All Work Types</option>
                {workTypes.map(wt => (
                  <option key={wt.id} value={wt.id}>
                    {wt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Time & Deliverables KPI Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Time Tracked
              </div>
              <Clock className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {formatReportTime(reportData.totalTimeSecondsAll)}
            </div>
            <p className="text-xs text-sky-700 font-semibold">
              {reportData.totalDecimalHoursAll} decimal hours
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Clients Tracked
              </div>
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-extrabold text-indigo-700">
              {activeClientsCount} <span className="text-sm font-normal text-slate-400">/ {reportData.clientSummaries.length}</span>
            </div>
            <p className="text-xs text-slate-500">Clients with logged deliverables or time</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Deliverables
              </div>
              <Layers className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-3xl font-extrabold text-teal-700">
              {reportData.totalDoneAll}
            </div>
            <p className="text-xs text-slate-500">
              {reportData.totalApprovedAll} approved items
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Average Time / Item
              </div>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-extrabold text-amber-700">
              {avgMinutesPerItem > 0 ? `${avgMinutesPerItem}m` : '0m'}
            </div>
            <p className="text-xs text-slate-500">Average duration per deliverable</p>
          </div>
        </div>

        {/* Client-by-Client Time Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Client-Wise Time Breakdown</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Click any client card to inspect individual tasks and time spent
            </span>
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-3 text-xs text-slate-500 font-medium">Calculating client time spent...</p>
            </div>
          ) : reportData.clientSummaries.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
              <p className="text-sm font-semibold text-slate-700">No client records found for this date range.</p>
              <p className="text-xs text-slate-400 mt-1">Try expanding the date filter or resetting your filters.</p>
            </div>
          ) : (
            reportData.clientSummaries.map(client => {
              const isExpanded = Boolean(expandedClients[client.clientId]);

              return (
                <div
                  key={client.clientId}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Client Summary Header Bar */}
                  <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Client Identity & Deliverables */}
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-2xs shrink-0">
                        {client.clientName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-bold text-slate-900 truncate">
                            {client.clientName}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {client.totalDone} deliverable(s) done &bull; {client.totalApproved} approved
                        </p>
                      </div>
                    </div>

                    {/* Time Metrics & Action */}
                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-5">
                      {/* Tracked Time */}
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Time Spent
                        </div>
                        <div className="text-base font-extrabold text-slate-900 flex items-center justify-end space-x-1">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>{formatReportTime(client.totalTimeSeconds)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {client.decimalHours} hrs
                        </div>
                      </div>

                      {/* Expand / Collapse Button */}
                      <button
                        type="button"
                        onClick={() => toggleClientExpand(client.clientId)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
                      >
                        <span>{isExpanded ? 'Hide Tasks' : 'Inspect Tasks'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Work Type Badges Row */}
                  <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                      Deliverables:
                    </span>
                    {Object.entries(client.workTypeBreakdown)
                      .filter(([_, data]) => data.count > 0 || data.timeSeconds > 0)
                      .map(([wtName, data]) => (
                        <div
                          key={wtName}
                          className="px-2.5 py-1 bg-white rounded-md border border-slate-200 text-xs text-slate-700 flex items-center space-x-1.5 shadow-2xs"
                        >
                          <span className="font-bold text-slate-900">{wtName}:</span>
                          <span className="font-semibold text-sky-700">{data.count} items</span>
                          {data.timeSeconds > 0 && (
                            <span className="text-[11px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-mono font-bold">
                              ⏱ {formatReportTime(data.timeSeconds)}
                            </span>
                          )}
                        </div>
                      ))}
                    {Object.values(client.workTypeBreakdown).every(
                      data => data.count === 0 && data.timeSeconds === 0
                    ) && (
                      <span className="text-xs text-slate-400 italic">No deliverable breakdown recorded</span>
                    )}
                  </div>

                  {/* Detailed Drilldown of Deliverables */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 border-t border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Logged Deliverables & Tasks ({client.entries.length} items)
                        </h4>
                        <span className="text-xs text-slate-400">
                          Sorted newest first
                        </span>
                      </div>

                      {client.entries.length === 0 ? (
                        <p className="text-xs text-slate-400 italic p-4 text-center bg-slate-50 rounded-lg">
                          No deliverables logged under this client for the selected date range.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2.5">Date</th>
                                <th className="px-3 py-2.5">Designer</th>
                                <th className="px-3 py-2.5">Deliverable</th>
                                <th className="px-3 py-2.5">Description</th>
                                <th className="px-3 py-2.5 text-center">Qty Done</th>
                                <th className="px-3 py-2.5 text-center">Qty Approved</th>
                                <th className="px-3 py-2.5 text-right">Time Spent</th>
                                <th className="px-3 py-2.5 text-right">Decimal Hrs</th>
                                <th className="px-3 py-2.5 text-center">Link</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {client.entries.map(entry => {
                                const entrySecs = entry.time_spent_seconds || 0;
                                const decHrs = formatReportHoursDecimal(entrySecs);
                                const url = entry.project_url || entry.best_work_url;

                                return (
                                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                                      {entry.work_date}
                                    </td>
                                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                                      {entry.profile?.name || 'Designer'}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold text-[11px] whitespace-nowrap">
                                        {entry.work_type?.name || 'Task'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-600 max-w-xs break-words">
                                      {entry.description || '-'}
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                      {entry.quantity_done}
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-bold text-teal-700">
                                      {entry.quantity_approved}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                      {entrySecs > 0 ? (
                                        <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                          ⏱ {formatReportTime(entrySecs)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">&mdash;</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                                      {decHrs > 0 ? `${decHrs}h` : '0.00h'}
                                    </td>
                                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                      {url ? (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sky-600 hover:text-sky-800 inline-flex items-center"
                                          title="View Deliverable"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      ) : (
                                        <span className="text-slate-300">&mdash;</span>
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
            })
          )}
        </div>
      </main>
    </div>
  );
}
