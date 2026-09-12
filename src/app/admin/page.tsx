'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import {
  fetchWorkEntriesByDate,
  fetchProfiles,
  getLoggedInUser,
  calculateWorkEntrySeconds,
  formatWorkEntryStopwatch,
  formatWorkEntryDuration,
  isAdminUser,
  fetchPendingApprovalEntries,
  getPendingDaysAgo,
  getPendingUrgency,
} from '@/lib/services/work-entry';
import { getWeeklyReportData, getWeekRange } from '@/lib/services/reports';
import { WorkEntryWithDetails, Profile } from '@/types';
import {
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Users,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Sparkles,
  Hourglass,
  CheckCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { TodoListWidget } from '@/components/dashboard/TodoListWidget';
import { QuickApprovalModal } from '@/components/work/QuickApprovalModal';
import { useToast } from '@/components/ui/ToastContext';
import {
  fetchMonthlyTeamActivity,
  fetchMonthlyDesignerActivity,
  MonthlyTeamActivity,
  MonthlyDesignerActivity,
} from '@/lib/services/activity';
import { MonthlyActivityHeatmap, MiniActivityHeatStrip } from '@/components/activity/MonthlyActivityHeatmap';
import { RichSelect } from '@/components/ui/RichSelect';

export default function AdminDashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEntries, setTodayEntries] = useState<WorkEntryWithDetails[]>([]);
  const [agencyPendingEntries, setAgencyPendingEntries] = useState<WorkEntryWithDetails[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [weekSummary, setWeekSummary] = useState({
    totalCreated: 0,
    totalApproved: 0,
    activeClients: 0,
    totalSeconds: 0,
  });
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [selectedApprovalEntry, setSelectedApprovalEntry] = useState<WorkEntryWithDetails | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Monthly Activity & Consistency Matrix state
  const [matrixYear, setMatrixYear] = useState<number>(new Date().getFullYear());
  const [matrixMonth, setMatrixMonth] = useState<number>(new Date().getMonth() + 1);
  const [matrixDesignerFilter, setMatrixDesignerFilter] = useState<string>('all');
  const [teamActivity, setTeamActivity] = useState<MonthlyTeamActivity | null>(null);
  const [singleDesignerActivity, setSingleDesignerActivity] = useState<MonthlyDesignerActivity | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  // Strict Role Guard: Check if logged-in user is an Admin
  useEffect(() => {
    const user = getLoggedInUser();
    if (!user) {
      setIsAuthorized(false);
      router.replace('/login');
      return;
    }
    if (!isAdminUser(user)) {
      setIsAuthorized(false);
      router.replace('/dashboard');
      return;
    }
    setIsAuthorized(true);
  }, [router]);

  // Live timer tick every second for real-time stopwatches
  useEffect(() => {
    if (!isAuthorized) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const week = getWeekRange(new Date());
      const [tEntries, wData, profList, pendingList] = await Promise.all([
        fetchWorkEntriesByDate(todayStr),
        getWeeklyReportData(week.startDate, week.endDate),
        fetchProfiles(),
        fetchPendingApprovalEntries(),
      ]);

      setTodayEntries(tEntries);
      setProfiles(profList.filter(p => !isAdminUser(p))); // Filter designers
      setAgencyPendingEntries(pendingList);

      // Calculate weekly totals
      const created = wData.reduce((acc, curr) => acc + curr.totalCreated, 0);
      const approved = wData.reduce((acc, curr) => acc + curr.totalApproved, 0);
      const seconds = wData.reduce((acc, curr) => acc + (curr.totalTimeSeconds || 0), 0);

      // Unique active clients this week
      const clientSet = new Set<string>();
      wData.forEach(s => {
        s.entries.forEach(e => {
          if (e.client?.name) clientSet.add(e.client.name.trim().toLowerCase());
        });
      });

      setWeekSummary({
        totalCreated: created,
        totalApproved: approved,
        activeClients: clientSet.size,
        totalSeconds: seconds,
      });

      if (isManualRefresh) {
        showToast('Dashboard data refreshed with latest updates.', 'success');
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      if (isManualRefresh) {
        showToast('Failed to refresh data. Please check network connection.', 'error');
      }
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    loadData();

    // 5-second polling to capture team members' live timers in real-time
    const pollInterval = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [isAuthorized]);

  const loadMatrixData = useCallback(async () => {
    setLoadingMatrix(true);
    try {
      if (matrixDesignerFilter === 'all') {
        const data = await fetchMonthlyTeamActivity(matrixYear, matrixMonth);
        setTeamActivity(data);
        setSingleDesignerActivity(null);
      } else {
        const data = await fetchMonthlyDesignerActivity(matrixYear, matrixMonth, matrixDesignerFilter);
        setSingleDesignerActivity(data);
      }
    } catch (err) {
      console.error('Failed to load activity matrix:', err);
    } finally {
      setLoadingMatrix(false);
    }
  }, [matrixYear, matrixMonth, matrixDesignerFilter]);

  useEffect(() => {
    if (isAuthorized) {
      loadMatrixData();
    }
  }, [isAuthorized, loadMatrixData]);

  // If unauthorized or checking credentials, prevent any dashboard rendering
  if (isAuthorized !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm mx-auto">
          <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-800">Verifying Administrator Authorization...</p>
          <p className="text-xs text-slate-400">Restricted executive area. Validating access credentials.</p>
        </div>
      </div>
    );
  }

  // Today calculations across the agency
  const todayCreated = todayEntries.reduce((acc, curr) => acc + (curr.quantity_done || 0), 0);
  const todayApproved = todayEntries.reduce((acc, curr) => acc + (curr.quantity_approved || 0), 0);
  const todaySeconds = todayEntries.reduce((acc, curr) => acc + calculateWorkEntrySeconds(curr, nowMs), 0);

  // Active team members currently running timers
  const activeNowEntries = todayEntries.filter(e => Boolean(e.timer_started_at));
  const activeNowDesignerIds = new Set(activeNowEntries.map(e => e.profile?.id || e.user_id));

  // Designers who logged work today
  const activeTodayDesignerIds = new Set(todayEntries.map(e => e.profile?.id || e.user_id));

  const weeklyApprovalRate = weekSummary.totalCreated > 0
    ? Math.round((weekSummary.totalApproved / weekSummary.totalCreated) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Executive Header Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Executive Admin Dashboard</span>
              </span>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
              Agency Operations & Deliverables Overview
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live oversight of agency creative production, active team workload, and client deliverable velocity.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh agency metrics"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Top 4 KPI Metrics - 4 Small Compact Cards (2x2 on Mobile, 4-col on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {/* Card 1: Today's Team Output */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider truncate">Today Output</span>
              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600 shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">{todayCreated}</span>
              <span className="text-[10px] sm:text-xs font-bold text-teal-700 truncate">({todayApproved} app.)</span>
            </div>
            <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-400">Active</span>
              <span className="font-bold text-sky-700">
                {activeTodayDesignerIds.size} designers
              </span>
            </div>
          </div>

          {/* Card 2: Weekly Production */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider truncate">Weekly Output</span>
              <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">{weekSummary.totalCreated}</span>
              <span className="text-[10px] sm:text-xs font-bold text-teal-700 truncate">({weekSummary.totalApproved} app.)</span>
            </div>
            <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-400">Approval</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {weeklyApprovalRate}%
              </span>
            </div>
          </div>

          {/* Card 3: Total Deliverable Time */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider truncate">Logged Time</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-amber-800 font-mono leading-none">
                {formatWorkEntryDuration(todaySeconds)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 truncate">today</span>
            </div>
            <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-400">Week</span>
              <span className="font-bold text-slate-700 truncate">
                {formatWorkEntryDuration(weekSummary.totalSeconds)}
              </span>
            </div>
          </div>

          {/* Card 4: Active Clients */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider truncate">Active Clients</span>
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">{weekSummary.activeClients}</span>
              <span className="text-[10px] sm:text-xs text-slate-400 truncate">brands</span>
            </div>
            <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs">
              <Link href="/clients" className="text-sky-600 hover:text-sky-800 font-bold inline-flex items-center space-x-0.5">
                <span>Directory</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
              <span className="text-slate-400">This week</span>
            </div>
          </div>
        </div>

        {/* Live Team Workload Status Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">Creative Team Workload & Live Status</h2>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeNowDesignerIds.size} live working now</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">{profiles.length} total team designers</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {profiles.map((p) => {
              const isWorkingNow = activeNowDesignerIds.has(p.id);
              const hasLoggedToday = activeTodayDesignerIds.has(p.id);
              const activeTask = todayEntries.find(e => (e.profile?.id === p.id || e.user_id === p.id) && Boolean(e.timer_started_at));
              const designerTodayCount = todayEntries.filter(e => (e.profile?.id === p.id || e.user_id === p.id)).reduce((acc, curr) => acc + (curr.quantity_done || 0), 0);
              const designerApprovedCount = todayEntries.filter(e => (e.profile?.id === p.id || e.user_id === p.id)).reduce((acc, curr) => acc + (curr.quantity_approved || 0), 0);

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setMatrixDesignerFilter(p.id);
                    const el = document.getElementById('activity-matrix-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title={`Click to load ${p.name}'s monthly activity matrix`}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs ${
                    isWorkingNow
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-xs ring-1 ring-emerald-400/30'
                      : hasLoggedToday
                      ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                      : 'bg-white border-slate-200/80 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${
                        isWorkingNow
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : hasLoggedToday
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">{p.name}</h3>
                        <p className="text-[11px] text-slate-500 leading-tight">{p.designation || 'Designer'}</p>
                      </div>
                    </div>

                    {isWorkingNow ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>LIVE</span>
                      </span>
                    ) : hasLoggedToday ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                        Idle
                      </span>
                    )}
                  </div>

                  {/* Active Task or Daily Stats */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-xs">
                    {isWorkingNow && activeTask ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-900 font-medium">
                          <span className="truncate max-w-[140px]">{activeTask.client?.name || 'Task'}</span>
                          <span className="font-mono font-bold">
                            {formatWorkEntryStopwatch(calculateWorkEntrySeconds(activeTask, nowMs))}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">{activeTask.description}</p>
                      </div>
                    ) : hasLoggedToday ? (
                      <div className="flex items-center justify-between text-slate-600 text-[11px]">
                        <span>Today: <strong>{designerTodayCount} done</strong></span>
                        <span className="text-teal-700 font-bold">{designerApprovedCount} approved</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No tasks logged yet today</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Production Activity & Consistency Matrix (GitHub-Style Monthly Heatmap & Attendance Proxy) */}
        <div id="activity-matrix-section" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h2 className="text-lg font-bold text-slate-900">
                    Production Activity & Consistency Matrix
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Monthly Output Heatmap
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated attendance and deliverable rhythm based on daily tasks logged across the month.
                </p>
              </div>
            </div>

            {/* Matrix Filters: Designer Selector & Month Navigator */}
            <div className="flex flex-wrap items-center gap-2.5">
              {matrixDesignerFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setMatrixDesignerFilter('all')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  title="Return to entire team table"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                  <span>All Designers</span>
                </button>
              )}

              {/* Designer Filter */}
              <div className="w-60">
                <RichSelect
                  value={matrixDesignerFilter}
                  onChange={val => setMatrixDesignerFilter(String(val))}
                  options={[
                    { value: 'all', label: 'All Designers / Entire Team' },
                    ...profiles.map(p => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                  size="sm"
                  icon={<Users className="w-3.5 h-3.5" />}
                  placeholder="Filter Designer"
                />
              </div>

              {/* Month Navigator */}
              <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    if (matrixMonth === 1) {
                      setMatrixYear(matrixYear - 1);
                      setMatrixMonth(12);
                    } else {
                      setMatrixMonth(matrixMonth - 1);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2.5 py-1 text-xs font-bold text-slate-800 min-w-[110px] text-center">
                  {teamActivity?.monthName || new Date(matrixYear, matrixMonth - 1).toLocaleString('default', { month: 'long' })} {matrixYear}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (matrixMonth === 12) {
                      setMatrixYear(matrixYear + 1);
                      setMatrixMonth(1);
                    } else {
                      setMatrixMonth(matrixMonth + 1);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {loadingMatrix ? (
            <div className="py-12 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-3 text-xs text-slate-500 font-medium">Calculating monthly deliverable matrix...</p>
            </div>
          ) : matrixDesignerFilter !== 'all' && singleDesignerActivity ? (
            /* Single Designer Detailed Heatmap View */
            <MonthlyActivityHeatmap
              activity={singleDesignerActivity}
              onMonthChange={(y, m) => {
                setMatrixYear(y);
                setMatrixMonth(m);
              }}
            />
          ) : teamActivity ? (
            /* All Designers Team Overview Matrix */
            <div className="space-y-6">
              {/* Team Aggregate Summary Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Average Active Days
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                    {teamActivity.averageActiveDays} <span className="text-xs font-semibold text-slate-500">/ {teamActivity.daysInMonth} d</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    Team monthly average
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Total Agency Tasks
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                    {teamActivity.totalAgencyTasks}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                    {teamActivity.totalAgencyQuantityDone} total deliverables produced
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Agency Approvals
                  </div>
                  <div className="text-2xl font-extrabold text-teal-700 mt-0.5">
                    {teamActivity.totalAgencyApproved}
                  </div>
                  <p className="text-[11px] text-teal-600 font-semibold mt-0.5 truncate">
                    {teamActivity.totalAgencyQuantityDone > 0
                      ? `${Math.round((teamActivity.totalAgencyApproved / teamActivity.totalAgencyQuantityDone) * 100)}% approved`
                      : '0% approved'}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Total Deliverable Time
                  </div>
                  <div className="text-xl font-extrabold text-amber-800 font-mono mt-0.5 truncate">
                    {formatWorkEntryDuration(teamActivity.totalAgencySeconds)}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                    Cumulative tracked time
                  </p>
                </div>
              </div>

              {/* Team Consistency Matrix Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Designer</th>
                      <th className="py-3 px-3">Active Days</th>
                      <th className="py-3 px-3">Consistency</th>
                      <th className="py-3 px-3">Deliverables</th>
                      <th className="py-3 px-3 min-w-[200px]">
                        Monthly Contribution Rhythm ({teamActivity.monthName})
                      </th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamActivity.designers.map((designer) => (
                      <tr
                        key={designer.profile.id}
                        onClick={() => setMatrixDesignerFilter(designer.profile.id)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        title={`Click to load ${designer.profile.name}'s monthly activity calendar`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs shrink-0 group-hover:scale-105 transition-transform">
                              {designer.profile.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {designer.profile.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {designer.profile.designation || 'Designer'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {designer.activeDaysCount}
                          </span>
                          <span className="text-slate-400 text-[10px]"> / {designer.daysInMonth}d</span>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            designer.consistencyPercentage >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : designer.consistencyPercentage >= 60
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {designer.consistencyPercentage}%
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{designer.totalTasks} tasks</div>
                          <div className="text-[10px] text-teal-700 font-semibold">{designer.totalQuantityApproved} approved</div>
                        </td>

                        <td className="py-3 px-3">
                          <MiniActivityHeatStrip daysList={designer.daysList} />
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMatrixDesignerFilter(designer.profile.id);
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition-all shadow-2xs cursor-pointer"
                            title={`Load ${designer.profile.name}'s monthly activity matrix`}
                          >
                            <span>View Heatmap</span>
                            <span>→</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {/* Agency Pending Client Approvals Queue & Follow-up Tracker */}
        {agencyPendingEntries.length > 0 && (() => {
          const totalUnapproved = agencyPendingEntries.reduce(
            (acc, curr) => acc + (curr.quantity_done - curr.quantity_approved),
            0
          );
          const uniqueClients = new Set(
            agencyPendingEntries.map((e) => e.client?.name?.trim().toLowerCase() || e.client_id).filter(Boolean)
          ).size;

          let freshCount = 0;
          let followupCount = 0;
          let overdueCount = 0;

          agencyPendingEntries.forEach((entry) => {
            const days = getPendingDaysAgo(entry.work_date);
            if (days <= 4) freshCount++;
            else if (days <= 7) followupCount++;
            else overdueCount++;
          });

          return (
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-200/60 pb-4">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 rounded-xl bg-amber-500 text-white shadow-sm ring-4 ring-amber-100">
                    <Hourglass className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h2 className="text-lg font-bold text-slate-900">
                        Agency Pending Client Approvals Queue
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-200 text-amber-950 border border-amber-300">
                        {totalUnapproved} deliverables ({agencyPendingEntries.length} tasks)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Deliverables awaiting client sign-off across {uniqueClients} {uniqueClients === 1 ? 'client' : 'clients'}. When client confirms, approve in 1-click without searching historical dates.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Link
                    href="/work?view=pending"
                    className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-300 rounded-xl transition-all shadow-2xs"
                  >
                    <span>Open Full Agency Queue</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Urgency Status Indicators */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Breakdown:</span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Fresh (≤4d): {freshCount}</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Follow-up (5-7d): {followupCount}</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Overdue (&gt;7d): {overdueCount}</span>
                </span>
              </div>

              {/* Preview Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                {agencyPendingEntries.slice(0, 4).map((entry) => {
                  const daysAgo = getPendingDaysAgo(entry.work_date);
                  const urgency = getPendingUrgency(daysAgo);
                  const unapproved = (entry.quantity_done || 0) - (entry.quantity_approved || 0);
                  const formattedDate = new Date(entry.work_date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={entry.id}
                      className="bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-amber-200/80 hover:border-amber-400 shadow-2xs transition-all flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-bold truncate max-w-[120px]">
                            By {entry.profile?.name || 'Designer'}
                          </span>
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgency.bg} ${urgency.text} ${urgency.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
                            <span>{urgency.label}</span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 text-[11px] font-bold text-slate-800 truncate">
                          <Building2 className="w-3 h-3 text-sky-600 shrink-0" />
                          <span className="truncate">{entry.client?.name || 'Client'}</span>
                        </div>

                        <p className="text-xs font-semibold text-slate-900 line-clamp-2" title={entry.description}>
                          {entry.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700">📅 {formattedDate}</span>
                          <span className="mx-1 text-slate-300">•</span>
                          <span className="font-bold text-amber-800">{unapproved} left</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedApprovalEntry(entry)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                        >
                          <CheckCheck className="w-3 h-3 text-teal-600" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 2-Column Main Section: Today's Deliverables Feed (65%) + Admin Launchpad & Notes (35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Agency Today's Deliverables Stream (8 Cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Today's Agency Deliverables Feed</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live feed of all design deliverables produced across the agency today.
                </p>
              </div>
              <Link
                href="/work"
                className="text-xs font-bold text-sky-600 hover:text-sky-800 inline-flex items-center space-x-1"
              >
                <span>View Full Team Log</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                Loading today's agency deliverables...
              </div>
            ) : todayEntries.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">No deliverables recorded yet today</p>
                <p className="text-xs text-slate-400 mt-1">
                  Team members' logged items will stream here live as they work.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEntries.map((entry) => {
                  const isApproved = (entry.quantity_approved || 0) >= (entry.quantity_done || 1);
                  const hasPartial = (entry.quantity_approved || 0) > 0 && !isApproved;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        entry.timer_started_at
                          ? 'bg-emerald-50/40 border-l-4 border-l-emerald-500 border-slate-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[11px]">
                            By {entry.profile?.name || 'Designer'}
                          </span>
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-extrabold text-[11px]">
                            <Building2 className="w-3 h-3 text-sky-600" />
                            <span>{entry.client?.name || 'Client'}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {entry.work_type?.name || 'Work'}
                          </span>

                          {entry.timer_started_at && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              <span className="font-mono">{formatWorkEntryStopwatch(calculateWorkEntrySeconds(entry, nowMs))}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-slate-900 font-medium text-xs sm:text-sm">{entry.description}</p>

                        {(entry.project_url || entry.best_work_url) && (
                          <a
                            href={entry.project_url || entry.best_work_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-sky-600 hover:text-sky-800 font-semibold underline text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Project URL</span>
                          </a>
                        )}
                      </div>

                      {/* Right: Quantities & Quick Approval Stepper Trigger */}
                      <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <div className="text-right text-xs">
                          <div className="text-slate-500">
                            Done: <strong className="text-slate-900">{entry.quantity_done}</strong>
                          </div>
                          <div className="text-slate-500">
                            Approved: <strong className="text-teal-700">{entry.quantity_approved}</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedApprovalEntry(entry)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all cursor-pointer shadow-2xs ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : hasPartial
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          }`}
                          title="Click to adjust approval count"
                        >
                          {isApproved ? '✓ Approved' : hasPartial ? `⏳ Partial (${entry.quantity_approved})` : '✕ Not Approved'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Executive Operations Launchpad & Private Notes (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Executive Quick Launchpad */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                Executive Agency Controls
              </h2>

              <div className="space-y-2">
                <Link
                  href="/work?view=pending"
                  className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:border-amber-400 hover:bg-amber-100/60 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-800 group-hover:bg-amber-200">
                      <Hourglass className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-xs font-bold text-slate-900 leading-tight">Pending Client Approvals</h3>
                        {agencyPendingEntries.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-200 text-amber-950">
                            {agencyPendingEntries.length}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">Zero-date-hunting approval queue</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700" />
                </Link>

                <Link
                  href="/reports/billing"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-100">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Client Time & Invoicing</h3>
                      <p className="text-[11px] text-slate-500">Audit billable client hours</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700" />
                </Link>

                <Link
                  href="/reports/weekly"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-sky-50 text-sky-700 group-hover:bg-sky-100">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Weekly Team Review</h3>
                      <p className="text-[11px] text-slate-500">Weekly meeting deliverables</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-700" />
                </Link>

                <Link
                  href="/reports/monthly"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-100">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Monthly Summary</h3>
                      <p className="text-[11px] text-slate-500">Agency output per month</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700" />
                </Link>

                <Link
                  href="/clients"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Clients Directory</h3>
                      <p className="text-[11px] text-slate-500">Manage brand accounts</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-700" />
                </Link>

                <Link
                  href="/team"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-700 group-hover:bg-purple-100">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Team Management</h3>
                      <p className="text-[11px] text-slate-500">Roster & role designations</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700" />
                </Link>
              </div>
            </div>

            {/* Admin Private Notes & Action Items Widget */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <TodoListWidget />
            </div>
          </div>
        </div>
      </main>

      {/* Quick Approval Modal for on-the-fly deliverable review */}
      {selectedApprovalEntry && (
        <QuickApprovalModal
          entry={selectedApprovalEntry}
          isOpen={Boolean(selectedApprovalEntry)}
          onClose={() => setSelectedApprovalEntry(null)}
          onSuccess={(updated) => {
            setSelectedApprovalEntry(null);
            setAgencyPendingEntries(prev => {
              if (updated.quantity_approved >= updated.quantity_done) {
                return prev.filter(e => e.id !== updated.id);
              }
              return prev.map(e => e.id === updated.id ? updated : e);
            });
            showToast(`Approved count updated to ${updated.quantity_approved}`, 'success');
            loadData();
          }}
        />
      )}
    </div>
  );
}
