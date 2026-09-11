'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { TodoListWidget } from '@/components/dashboard/TodoListWidget';
import { QuickApprovalModal } from '@/components/work/QuickApprovalModal';
import { useToast } from '@/components/ui/ToastContext';

export default function AdminDashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEntries, setTodayEntries] = useState<WorkEntryWithDetails[]>([]);
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
      const [tEntries, wData, profList] = await Promise.all([
        fetchWorkEntriesByDate(todayStr),
        getWeeklyReportData(week.startDate, week.endDate),
        fetchProfiles(),
      ]);

      setTodayEntries(tEntries);
      setProfiles(profList.filter(p => !isAdminUser(p))); // Filter designers

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

        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Today's Team Output */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Today's Team Output</span>
              <span className="p-2 rounded-xl bg-sky-50 text-sky-600">
                <Sparkles className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{todayCreated}</span>
              <span className="text-xs font-semibold text-slate-500">items logged</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Approved: <strong className="text-teal-700 font-bold">{todayApproved}</strong></span>
              <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                {activeTodayDesignerIds.size} active today
              </span>
            </div>
          </div>

          {/* Card 2: Weekly Production */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Weekly Production</span>
              <span className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{weekSummary.totalCreated}</span>
              <span className="text-xs font-semibold text-teal-700 font-bold">({weekSummary.totalApproved} approved)</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Approval Rate</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {weeklyApprovalRate}%
              </span>
            </div>
          </div>

          {/* Card 3: Total Deliverable Time */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Deliverable Time</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-amber-800 font-mono">
                {formatWorkEntryDuration(todaySeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-500">logged today</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Weekly Total</span>
              <span className="font-bold text-slate-700">
                {formatWorkEntryDuration(weekSummary.totalSeconds)}
              </span>
            </div>
          </div>

          {/* Card 4: Active Clients */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Active Clients</span>
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Building2 className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{weekSummary.activeClients}</span>
              <span className="text-xs font-semibold text-slate-500">brands serviced</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <Link href="/clients" className="text-sky-600 hover:text-sky-800 font-semibold inline-flex items-center space-x-1">
                <span>View Directory</span>
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
                  className={`p-3.5 rounded-xl border transition-all ${
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
          onSuccess={() => {
            setSelectedApprovalEntry(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
