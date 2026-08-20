'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { getWeeklyReportData, getWeekRange, WeeklyUserSummary, exportToCSV } from '@/lib/services/reports';
import { ChevronLeft, ChevronRight, Calendar, Download, ChevronDown, ChevronUp, Link as LinkIcon, Award, Sparkles } from 'lucide-react';

export default function WeeklyReportPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekRange, setWeekRange] = useState(getWeekRange(new Date()));
  const [summaries, setSummaries] = useState<WeeklyUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Store weekly best work links per profile (empty by default)
  const [bestWorkLinks, setBestWorkLinks] = useState<Record<string, string>>({});
  const [tempLinks, setTempLinks] = useState<Record<string, string>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});

  const loadReport = useCallback(async () => {
    setLoading(true);
    const range = getWeekRange(currentDate);
    setWeekRange(range);
    try {
      const data = await getWeeklyReportData(range.startDate, range.endDate);
      setSummaries(data);
    } catch (err) {
      console.error('Failed to load weekly report:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleWeekDelta = (weeks: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + weeks * 7);
    setCurrentDate(next);
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
      'Weekly Best Work Link': bestWorkLinks[s.profile.id] || '',
    }));
    exportToCSV(`Weekly_Report_${weekRange.startDate}_to_${weekRange.endDate}`, csvRows);
  };

  const grandTotalCreated = summaries.reduce((acc, curr) => acc + curr.totalCreated, 0);
  const grandTotalApproved = summaries.reduce((acc, curr) => acc + curr.totalApproved, 0);
  const grandApprovalRate = grandTotalCreated > 0 ? Math.round((grandTotalApproved / grandTotalCreated) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Sub-Navigation for Reports */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex space-x-6">
            <Link
              href="/reports/weekly"
              className="py-3 text-sm font-bold text-sky-600 border-b-2 border-sky-600"
            >
              Weekly Meeting Report
            </Link>
            <Link
              href="/reports/monthly"
              className="py-3 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Monthly Summary
            </Link>
            <Link
              href="/reports/overall"
              className="py-3 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Overall / All-Time
            </Link>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Weekly Header Banner */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                Weekly Meeting Mode
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500">Auto-aggregated from Daily Entries</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Weekly Team Review
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Screen-friendly layout for weekly team discussions and work explanations.
            </p>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <button
              onClick={() => handleWeekDelta(-1)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1 text-center">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Week Range</div>
              <div className="text-sm font-bold text-slate-900">{weekRange.label}</div>
            </div>

            <button
              onClick={() => handleWeekDelta(1)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekly Team Overview Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Total Created</div>
            <div className="text-3xl font-extrabold text-slate-900">{grandTotalCreated}</div>
            <p className="text-xs text-slate-500">Items produced this week</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Total Approved</div>
            <div className="text-3xl font-extrabold text-teal-700">{grandTotalApproved}</div>
            <p className="text-xs text-emerald-600 font-medium">{grandApprovalRate}% overall approval rate</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Contributors</div>
            <div className="text-3xl font-extrabold text-sky-700">
              {summaries.filter(s => s.totalCreated > 0).length} / {summaries.length}
            </div>
            <p className="text-xs text-slate-500">Team members logging work</p>
          </div>
        </div>

        {/* Team Member Cards */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-xs text-slate-500 font-medium">Calculating weekly report aggregations...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {summaries.map(s => {
              const isExpanded = expandedUser === s.profile.id;
              const userBestWork = bestWorkLinks[s.profile.id] || '';

              return (
                <div
                  key={s.profile.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all"
                >
                  {/* Card Header */}
                  <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white font-extrabold text-xl flex items-center justify-center shadow-sm">
                        {s.profile.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-lg font-bold text-slate-900">{s.profile.name}</h2>
                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                            {s.profile.designation || 'Team'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {s.entries.length} daily entry record(s) logged this week
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 justify-between lg:justify-end">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Created / Approved</div>
                        <div className="text-lg font-bold text-slate-900">
                          {s.totalCreated} <span className="text-slate-400 font-normal">/</span>{' '}
                          <span className="text-teal-700">{s.totalApproved}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approval Rate</div>
                        <div className="text-lg font-bold text-sky-700">{s.approvalRate}%</div>
                      </div>

                      <button
                        onClick={() => toggleExpand(s.profile.id)}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-medium"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'Inspect Entries'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Work Type Summary Table */}
                  <div className="p-6 bg-slate-50/50 space-y-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Work Type Aggregation — {s.profile.name}
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
                      {Object.entries(s.workTypeBreakdown).map(([typeName, data]) => (
                        <div
                          key={typeName}
                          className={`p-3 rounded-lg border text-center space-y-1 ${
                            data.done > 0
                              ? 'bg-white border-sky-200 shadow-2xs'
                              : 'bg-slate-50/50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-700 truncate">{typeName}</div>
                          <div className="text-sm font-extrabold text-slate-900">
                            {data.done} <span className="text-xs text-teal-600 font-semibold">({data.approved})</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Weekly Best Work Link Highlight Feature */}
                    <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-200">
                      <div className="flex items-center space-x-2 text-xs font-bold text-amber-700">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Weekly Best Work Link (Featured for Meeting):</span>
                      </div>

                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <input
                          type="url"
                          placeholder="Paste URL for top deliverable this week..."
                          value={tempLinks[s.profile.id] ?? bestWorkLinks[s.profile.id] ?? ''}
                          onChange={e => {
                            setTempLinks({ ...tempLinks, [s.profile.id]: e.target.value });
                            setSavedStatus({ ...savedStatus, [s.profile.id]: false });
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = tempLinks[s.profile.id] ?? bestWorkLinks[s.profile.id] ?? '';
                            setBestWorkLinks({ ...bestWorkLinks, [s.profile.id]: val });
                            setSavedStatus({ ...savedStatus, [s.profile.id]: true });
                            setTimeout(() => {
                              setSavedStatus(prev => ({ ...prev, [s.profile.id]: false }));
                            }, 2000);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-white webtree-gradient-btn rounded-lg shadow-2xs transition-transform active:scale-95 flex items-center space-x-1 shrink-0"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          <span>{savedStatus[s.profile.id] ? 'Link Saved!' : '+ Add Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Daily Entries Drill-down */}
                  {isExpanded && (
                    <div className="p-6 border-t border-slate-200 space-y-3 bg-white">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Underlying Daily Entries ({s.entries.length})
                      </h4>

                      {s.entries.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No entries logged for this week.</p>
                      ) : (
                        <div className="space-y-2">
                          {s.entries.map(entry => (
                            <div
                              key={entry.id}
                              className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center space-x-3">
                                <span className="font-bold text-slate-900">{entry.work_date}</span>
                                <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold">
                                  {entry.work_type?.name || 'Work'}
                                </span>
                                {entry.client && (
                                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                                    {entry.client.name}
                                  </span>
                                )}
                                <span className="text-slate-800">{entry.description}</span>
                              </div>

                              <div className="flex items-center space-x-4">
                                <span>
                                  Done: <strong>{entry.quantity_done}</strong>
                                </span>
                                <span>
                                  Approved: <strong className="text-teal-700">{entry.quantity_approved}</strong>
                                </span>
                                <span className="font-semibold text-slate-600">{entry.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
