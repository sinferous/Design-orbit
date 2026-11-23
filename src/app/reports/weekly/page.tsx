'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { getWeeklyReportData, getWeekRange, WeeklyUserSummary, exportToCSV, formatReportTime } from '@/lib/services/reports';
import { fetchWeeklyBestWorkRecords, saveWeeklyBestWorkLinkRecord } from '@/lib/services/work-entry';
import { ChevronLeft, ChevronRight, Calendar, Download, ChevronDown, ChevronUp, Link as LinkIcon, Award, Sparkles, ExternalLink, Building2, Plus, Edit2, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { WeeklyBestWorkModal } from '@/components/reports/WeeklyBestWorkModal';
import { OrbitLoader } from '@/components/ui/OrbitLoader';
import { ReportsSubNav } from '@/components/reports/ReportsSubNav';

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
    showToast('Best work link saved', 'success');
  };

  const handleDeleteModalLink = async (profileId: string) => {
    await saveWeeklyBestWorkLinkRecord(profileId, startDate, '');
    setBestWorkLinks(prev => {
      const copy = { ...prev };
      delete copy[profileId];
      return copy;
    });
    showToast('Best work link removed', 'success');
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
    if (!startDate || !endDate) return 'Pick a week';
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
      showToast('Could not load the week. Try again.', 'error');
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
    showToast('Weekly meeting CSV exported', 'success');
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

  const shortDay = (dateStr: string) =>
    parseLocalDate(dateStr).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

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
            <h1 className="text-2xl sm:text-3xl font-medium text-slate-50">Weekly review</h1>
            <p className="text-sm text-slate-400 mt-1">What each person made this week, for the team meeting</p>
          </div>

          {/* Week picker */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleWeekDelta(-1)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              title="Previous week"
              aria-label="Previous week"
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
                  <div className="absolute right-0 mt-2 z-40 w-[300px] rounded-xl border border-white/[0.08] bg-[#151514] p-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.55)] space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
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
                      {generateCalendarDays(viewDate).map((dayObj) => {
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

                    <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const range = getWeekRange(new Date());
                            setStartDate(range.startDate);
                            setEndDate(range.endDate);
                            setViewDate(new Date());
                          }}
                          className="text-slate-300 hover:text-white cursor-pointer"
                        >
                          This week
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
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          Last week
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCalendarOpen(false)}
                        className="h-7 px-3 rounded-md bg-white/[0.08] hover:bg-white/[0.12] text-slate-100 cursor-pointer transition-colors"
                      >
                        Done
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">Weeks run Tuesday to Monday</p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => handleWeekDelta(1)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              title="Next week"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Team totals */}
        <div className="bento-card grid grid-cols-2 lg:grid-cols-4 [&>*]:border-white/[0.06] [&>*:nth-child(even)]:border-l lg:[&>*:not(:first-child)]:border-l [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0">
          <div className="p-5">
            <div className="text-xs text-slate-500">Deliverables</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums">{grandTotalCreated}</div>
            <div className="mt-1 text-xs text-slate-500">made by the team</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Approved</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-emerald-400 tabular-nums">{grandTotalApproved}</div>
            <div className="mt-1 text-xs text-slate-500">{grandApprovalRate}% of deliverables</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Time tracked</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums truncate">{formatReportTime(grandTotalSeconds)}</div>
            <div className="mt-1 text-xs text-slate-500">on timers</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Clients</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums">{totalActiveClients}</div>
            <div className="mt-1 text-xs text-slate-500">worked on</div>
          </div>
        </div>

        {/* People */}
        {loading ? (
          <div className="bento-card p-12 text-center">
            <OrbitLoader size="lg" text="Loading the week" />
          </div>
        ) : summaries.length === 0 ? (
          <div className="bento-card p-12 text-center">
            <p className="text-sm text-slate-200">Nobody logged work this week</p>
            <p className="text-xs text-slate-500 mt-1">Pick another week above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {summaries.map(s => {
              const isExpanded = expandedUser === s.profile.id;
              const bestWork = bestWorkLinks[s.profile.id] || '';
              const types = Object.entries(s.workTypeBreakdown)
                .filter(([typeName, data]) => typeName.trim().toLowerCase() !== 'working' && data.done > 0)
                .sort((a, b) => b[1].done - a[1].done);
              const maxType = Math.max(1, ...types.map(([, d]) => d.done));

              return (
                <div key={s.profile.id} className="bento-card overflow-hidden">
                  {/* Person */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-200 font-display text-base flex items-center justify-center shrink-0">
                        {s.profile.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-medium text-slate-50 truncate">{s.profile.name}</h2>
                        <p className="text-xs text-slate-500 truncate">
                          {s.profile.designation || 'Team'}
                          <span className="mx-1.5 text-slate-700">·</span>
                          {s.entries.length} {s.entries.length === 1 ? 'entry' : 'entries'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-display text-xl font-medium text-white tabular-nums">
                          {s.totalApproved}
                          <span className="text-sm text-slate-500"> / {s.totalCreated}</span>
                        </div>
                        <div className="text-xs text-slate-500">approved</div>
                      </div>
                      <div className="w-28 hidden sm:block">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-slate-500">Rate</span>
                          <span className="text-slate-200 tabular-nums">{s.approvalRate}%</span>
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, s.approvalRate)}%` }} />
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExpand(s.profile.id)}
                        className="inline-flex items-center gap-1 h-8 px-3 text-xs text-slate-300 hover:text-white rounded-lg border border-white/[0.08] hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? 'Hide entries' : 'Entries'}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                      </button>
                    </div>
                  </div>

                  {/* By work type */}
                  <div className="px-5 pb-5">
                    {types.length === 0 ? (
                      <p className="text-xs text-slate-500">No deliverables logged this week</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2.5">
                        {types.map(([typeName, data]) => (
                          <div key={typeName}>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="text-slate-300 truncate">{typeName}</span>
                              <span className="text-xs text-slate-500 tabular-nums shrink-0">
                                {data.approved > 0 ? (
                                  <><span className="text-emerald-400">{data.approved}</span> of <span className="text-slate-100">{data.done}</span> approved</>
                                ) : (
                                  <span className="text-slate-100">{data.done}</span>
                                )}
                              </span>
                            </div>
                            <div className="mt-1 h-1 rounded-full bg-white/[0.05] overflow-hidden relative">
                              <div className="absolute inset-y-0 left-0 rounded-full bg-slate-500/60" style={{ width: `${(data.done / maxType) * 100}%` }} />
                              <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-400" style={{ width: `${(data.approved / maxType) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Best work */}
                  <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Award className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-slate-400 shrink-0">Best work</span>
                      {bestWork && (
                        <a
                          href={bestWork}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-100 hover:text-emerald-400 transition-colors truncate"
                          title={bestWork}
                        >
                          <span className="truncate">{bestWork.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setModalConfig({
                          isOpen: true,
                          profileId: s.profile.id,
                          designerName: s.profile.name,
                          currentUrl: bestWork,
                        })
                      }
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0"
                    >
                      {bestWork ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {bestWork ? 'Change' : 'Add link'}
                    </button>
                  </div>

                  {/* Entries, by client */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] bg-black/20 px-5 py-4">
                      {s.entries.length === 0 ? (
                        <p className="text-xs text-slate-500">No entries this week</p>
                      ) : (
                        (() => {
                          const clientMap: Record<string, typeof s.entries> = {};
                          s.entries.forEach(entry => {
                            const clientName = entry.client?.name || 'Internal';
                            if (!clientMap[clientName]) clientMap[clientName] = [];
                            clientMap[clientName].push(entry);
                          });
                          const sortedClients = Object.keys(clientMap).sort((a, b) => a.localeCompare(b));

                          return (
                            <div className="space-y-5">
                              {sortedClients.map(clientName => {
                                const items = clientMap[clientName];
                                return (
                                  <div key={clientName}>
                                    <div className="flex items-baseline gap-2 mb-1.5">
                                      <h4 className="text-sm font-medium text-slate-100">{clientName}</h4>
                                      <span className="text-xs text-slate-500">{items.length}</span>
                                    </div>
                                    <div className="divide-y divide-white/[0.04]">
                                      {items.map(entry => {
                                        const link = entry.project_url || entry.best_work_url;
                                        const done = entry.quantity_approved >= entry.quantity_done && entry.quantity_done > 0;
                                        return (
                                          <div key={entry.id} className="py-2 grid grid-cols-[64px_1fr_auto] items-baseline gap-3 text-sm">
                                            <span className="text-xs text-slate-500 tabular-nums">{shortDay(entry.work_date)}</span>
                                            <div className="min-w-0">
                                              <span className="text-slate-200">{entry.description}</span>
                                              <span className="text-xs text-slate-500 ml-2">{entry.work_type?.name || 'Work'}</span>
                                              {link && (
                                                <a
                                                  href={link}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-0.5 ml-2 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                                                >
                                                  Link
                                                  <ExternalLink className="w-3 h-3" />
                                                </a>
                                              )}
                                            </div>
                                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 tabular-nums">
                                              <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-emerald-400' : entry.quantity_approved > 0 ? 'bg-emerald-400/50' : 'bg-amber-400'}`} />
                                              {entry.quantity_approved} / {entry.quantity_done}
                                            </span>
                                          </div>
                                        );
                                      })}
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
