'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import {
  fetchWorkEntriesByDate,
  fetchProfiles,
  getLoggedInUser,
  setLoggedInUser,
  startWorkEntryTimer,
  stopWorkEntryTimer,
  dispatchGlobalTimerEvent,
  calculateWorkEntrySeconds,
  formatWorkEntryDuration,
  formatWorkEntryStopwatch,
} from '@/lib/services/work-entry';
import { getWeeklyReportData, getWeekRange } from '@/lib/services/reports';
import { WorkEntryWithDetails } from '@/types';
import {
  Plus,
  CheckCircle2,
  Clock,
  CalendarDays,
  ArrowUpRight,
  BarChart2,
  Layers,
  PieChart,
  User,
  CheckSquare,
  Play,
  Square,
  ExternalLink,
  Building2,
} from 'lucide-react';
import { TodoListWidget } from '@/components/dashboard/TodoListWidget';
import { useToast } from '@/components/ui/ToastContext';
import { QuickApprovalModal } from '@/components/work/QuickApprovalModal';

export default function DashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [todayEntries, setTodayEntries] = useState<WorkEntryWithDetails[]>([]);
  const [weekSummary, setWeekSummary] = useState({ totalCreated: 0, totalApproved: 0, activeClients: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({ name: 'Team Member', email: '' });
  const [currentProfileId, setCurrentProfileId] = useState<string | undefined>(undefined);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [timerLoadingId, setTimerLoadingId] = useState<string | null>(null);
  const [selectedApprovalEntry, setSelectedApprovalEntry] = useState<WorkEntryWithDetails | null>(null);
  const { showToast } = useToast();

  const [greeting, setGreeting] = useState('Good day');
  const [subtitle, setSubtitle] = useState('Here is your live daily activity and weekly work summary.');

  useEffect(() => {
    const user = getLoggedInUser();
    if (user?.name) {
      setCurrentUser(user);
    }
    if (user?.profileId) {
      setCurrentProfileId(user.profileId);
    }

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning');
      setSubtitle("What's that cool thing we're working on today?");
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good afternoon');
      setSubtitle("Halfway through! Let's keep the momentum going.");
    } else if (hour >= 17 && hour < 22) {
      setGreeting('Good evening');
      setSubtitle("Creative session winding down! Let's log our design achievements.");
    } else {
      setGreeting('Good night');
      setSubtitle("Time to wrap it up for the day! Rest up for tomorrow.");
    }

    async function loadDashboardData() {
      try {
        const week = getWeekRange(new Date());
        const [tEntries, wData, profiles] = await Promise.all([
          fetchWorkEntriesByDate(todayStr),
          getWeeklyReportData(week.startDate, week.endDate),
          fetchProfiles(),
        ]);

        setTodayEntries(tEntries);

        if (profiles.length > 0) {
          let resolvedId = user?.profileId;
          if (!resolvedId && user?.name) {
            const matched = profiles.find(
              p =>
                p.name.toLowerCase() === user.name.toLowerCase() ||
                (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase())
            );
            if (matched) {
              resolvedId = matched.id;
              setLoggedInUser(user.name, user.email, matched.id);
            }
          }
          if (resolvedId) {
            setCurrentProfileId(resolvedId);
          }
        }

        const wCreated = wData.reduce((acc, curr) => acc + curr.totalCreated, 0);
        const wApproved = wData.reduce((acc, curr) => acc + curr.totalApproved, 0);
        const clientSet = new Set<string>();
        wData.forEach(s => {
          s.entries?.forEach(e => {
            if (e.client?.name) clientSet.add(e.client.name.trim());
            else if (e.client_id) clientSet.add(e.client_id);
          });
        });

        setWeekSummary({
          totalCreated: wCreated,
          totalApproved: wApproved,
          activeClients: clientSet.size,
        });
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Real-time ticking effect whenever an entry timer is running
  const hasRunningTimer = todayEntries.some(e => Boolean(e.timer_started_at));
  useEffect(() => {
    if (!hasRunningTimer) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [hasRunningTimer]);

  // Periodic background poll (every 5 seconds) to keep team's active timers synced live on dashboard
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      fetchWorkEntriesByDate(todayStr)
        .then(newEntries => {
          setTodayEntries(newEntries);
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  // Sync state when PiP or other components pause/start timers
  useEffect(() => {
    const handleTimerAction = (detail: any) => {
      const { id, entry, action } = detail || {};
      if (id) {
        if (action === 'stop') {
          setTodayEntries(prev =>
            prev.map(item =>
              item.id === id
                ? {
                    ...item,
                    ...(entry || {}),
                    timer_started_at: null,
                    time_spent_seconds: entry?.time_spent_seconds ?? item.time_spent_seconds,
                  }
                : item
            )
          );
        } else if (entry) {
          setTodayEntries(prev => prev.map(item => (item.id === id ? { ...item, ...entry } : item)));
        }
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        fetchWorkEntriesByDate(todayStr).then(setTodayEntries).catch(() => {});
      }
    };

    const handleCustomEvent = (e: any) => handleTimerAction(e.detail);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('design_orbit_timer_bus');
        channel.onmessage = (ev) => {
          if (ev.data) handleTimerAction(ev.data);
        };
      }
    } catch (e) {}

    const handleStorage = (ev: StorageEvent) => {
      if (ev.key === 'design_orbit_timer_sync_event' && ev.newValue) {
        try {
          const parsed = JSON.parse(ev.newValue);
          if (parsed?.detail) handleTimerAction(parsed.detail);
        } catch (e) {}
      }
    };

    window.addEventListener('design_orbit_timer_event', handleCustomEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('design_orbit_timer_event', handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
      if (channel) {
        try { channel.close(); } catch (e) {}
      }
    };
  }, []);

  const handleStartTimer = async (entry: WorkEntryWithDetails) => {
    if (!currentProfileId) return;
    setTimerLoadingId(entry.id);
    const nowIso = new Date().toISOString();
    const activeEntry = { ...entry, timer_started_at: nowIso };

    // Directly open Picture-in-Picture window using user click gesture and seed with activeEntry
    if (typeof window !== 'undefined') {
      window.designOrbitPipManager?.openPip(activeEntry).catch(() => {});
    }

    // Optimistic state: start this timer without pausing other active timers
    setTodayEntries(prev =>
      prev.map(e => (e.id === entry.id ? activeEntry : e))
    );

    dispatchGlobalTimerEvent({
      id: entry.id,
      action: 'start',
      entry: activeEntry,
    });

    try {
      const updated = await startWorkEntryTimer(entry.id, todayEntries, currentProfileId);
      setTodayEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, ...updated } : e)));
      showToast(`Timer started: "${entry.description.slice(0, 24)}${entry.description.length > 24 ? '...' : ''}"`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to start timer', 'error');
    } finally {
      setTimerLoadingId(null);
    }
  };

  const handleStopTimer = async (entry: WorkEntryWithDetails) => {
    if (!currentProfileId) return;
    setTimerLoadingId(entry.id);
    const now = Date.now();

    let additional = 0;
    if (entry.timer_started_at) {
      const started = new Date(entry.timer_started_at).getTime();
      if (!isNaN(started) && started > 0) {
        additional = Math.max(0, Math.floor((now - started) / 1000));
      }
    }
    const newTotal = (entry.time_spent_seconds || 0) + additional;

    // Immediately mark stopped in dashboard state
    setTodayEntries(prev =>
      prev.map(e =>
        e.id === entry.id
          ? { ...e, timer_started_at: null, time_spent_seconds: newTotal }
          : e
      )
    );

    // Immediately dispatch stop event across PiP and other windows
    dispatchGlobalTimerEvent({
      id: entry.id,
      action: 'stop',
      entry: { ...entry, timer_started_at: null, time_spent_seconds: newTotal },
    });

    try {
      const updated = await stopWorkEntryTimer(entry.id, entry, currentProfileId, 'stop');
      setTodayEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, ...updated } : e)));
      showToast(`Timer stopped! Recorded ${formatWorkEntryDuration(newTotal)}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to stop timer', 'error');
    } finally {
      setTimerLoadingId(null);
    }
  };

  const todayDone = todayEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
  const todayApproved = todayEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
  const todayApprovalRate = todayDone > 0 ? Math.round((todayApproved / todayDone) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-baseline flex-wrap">
              {greeting}, <span className="font-display font-extrabold text-2xl sm:text-3xl ml-2 inline-block bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent tracking-tight">{currentUser.name}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/work/new"
              className="inline-flex items-center space-x-2 px-5 py-2.5 text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Add Daily Work</span>
            </Link>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Created</span>
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{todayDone}</div>
            <p className="text-xs text-slate-500">{todayEntries.length} work items logged today</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Approved</span>
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-3xl font-extrabold text-teal-700">{todayApproved}</div>
            <p className="text-xs text-emerald-600 font-semibold">{todayApprovalRate}% approval rate</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">This Week Total</span>
              <CalendarDays className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{weekSummary.totalCreated}</div>
            <p className="text-xs text-slate-500">{weekSummary.totalApproved} approved items</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Clients</span>
              <Building2 className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-3xl font-extrabold text-sky-700">{weekSummary.activeClients}</div>
            <p className="text-xs text-slate-500">Client brands serviced this week</p>
          </div>
        </div>

        {/* Application Navigation Quick Launchpad */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Application Quick Navigation</h2>
              <p className="text-xs text-slate-500">Fast access to key work tracking & reporting modules</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Link
              href="/work/new"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <Plus className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-800">Add Daily Work</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600" />
            </Link>

            <Link
              href="/work"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <CalendarDays className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-800">My Daily Log</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600" />
            </Link>

            <Link
              href="/reports/weekly"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <BarChart2 className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">Weekly Report</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600" />
            </Link>

            <Link
              href="/reports/monthly"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <PieChart className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">Monthly Stats</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600" />
            </Link>

            <Link
              href="/clients"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors group col-span-2 sm:col-span-1"
            >
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-800">Clients Directory</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600" />
            </Link>
          </div>
        </div>

        {/* Live Entries & To-Do List (65% / 35% Split) */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* Today's Work Activity (65%) */}
          <div className="w-full lg:w-[65%] bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-900">Today's Work Log</h2>
                    {todayEntries.filter(e => Boolean(e.timer_started_at)).length > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping inline-block" />
                        <span>{todayEntries.filter(e => Boolean(e.timer_started_at)).length} live</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Deliverables created and approved today</p>
                </div>
              </div>
              <Link
                href="/work"
                className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center space-x-1"
              >
                <span>View Full Daily Log</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
                <div className="animate-spin w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-xs text-slate-400">Loading today's activity...</p>
              </div>
            ) : todayEntries.length === 0 ? (
              <div className="p-8 text-center space-y-3 bg-slate-50/50 rounded-lg border border-slate-100 flex-1 flex flex-col items-center justify-center">
                <p className="text-xs text-slate-500 font-medium">No work logged yet for today.</p>
                <Link
                  href="/work/new"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white webtree-gradient-btn rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log First Entry for Today</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1">
                {todayEntries.map(entry => {
                  const isMyEntry = Boolean(
                    currentProfileId && (entry.user_id === currentProfileId || entry.profile?.id === currentProfileId)
                  );
                  const isTimerRunning = Boolean(entry.timer_started_at);
                  const liveSeconds = calculateWorkEntrySeconds(entry, nowMs);

                  return (
                    <div
                      key={entry.id}
                      className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                        isTimerRunning
                          ? isMyEntry
                            ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-200/80 shadow-2xs'
                            : 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 hover:border-sky-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {entry.profile && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                            <User className="w-3 h-3 text-teal-600" />
                            <span>By {entry.profile.name}</span>
                          </span>
                        )}

                        {isTimerRunning && isMyEntry && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping inline-block" />
                            <span>Timer Active</span>
                          </span>
                        )}

                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                          {entry.work_type?.name || 'Work'}
                        </span>

                        {entry.client && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-700">
                            {entry.client.name}
                          </span>
                        )}

                        <span className="font-semibold text-slate-900">{entry.description}</span>
                      </div>

                      <div className="flex flex-wrap items-center space-x-3 sm:space-x-4 shrink-0 text-slate-700">
                        <span>Qty: <strong>{entry.quantity_done}</strong></span>
                        <span>Approved: <strong className="text-teal-700">{entry.quantity_approved}</strong></span>
                        {isMyEntry ? (
                          <button
                            type="button"
                            onClick={() => setSelectedApprovalEntry(entry)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 flex items-center space-x-1 ${
                              entry.quantity_approved === entry.quantity_done
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                                : entry.quantity_approved > 0
                                ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-300'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
                            }`}
                            title="Click to update approved deliverables"
                          >
                            <span>
                              {entry.quantity_approved === entry.quantity_done
                                ? `Approved (${entry.quantity_approved})`
                                : entry.quantity_approved > 0
                                ? `Partial (${entry.quantity_approved}/${entry.quantity_done})`
                                : 'Not Approved (0)'}
                            </span>
                            <span className="text-[10px] opacity-60">▾</span>
                          </button>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              entry.quantity_approved > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {entry.quantity_approved > 0 ? `Approved (${entry.quantity_approved})` : 'Not Approved'}
                          </span>
                        )}

                        {/* Timer Controls on Dashboard */}
                        {isMyEntry ? (
                          <div className="flex items-center space-x-1.5 shrink-0">
                            {isTimerRunning ? (
                              <div className="flex items-center space-x-1">
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-mono text-[11px] font-bold shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping inline-block" />
                                  <span>{formatWorkEntryStopwatch(liveSeconds)}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStopTimer(entry)}
                                  disabled={timerLoadingId === entry.id}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                                  title="Stop timer and record time in DB"
                                >
                                  <Square className="w-2.5 h-2.5 fill-current" />
                                  <span>Stop</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof window !== 'undefined') {
                                      window.designOrbitPipManager?.openPip(entry);
                                    }
                                  }}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                                  title="Float timer outside browser (Picture-in-Picture)"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 text-slate-600" />
                                  <span className="hidden sm:inline">Float PiP</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                {liveSeconds > 0 && (
                                  <span
                                    title={`Time tracked: ${formatWorkEntryDuration(liveSeconds)}`}
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-mono font-bold"
                                  >
                                    <Clock className="w-2.5 h-2.5 text-slate-500" />
                                    <span>{formatWorkEntryDuration(liveSeconds)}</span>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleStartTimer(entry)}
                                  disabled={timerLoadingId === entry.id}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 hover:border-sky-300 rounded text-[11px] font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                                  title="Start timer for this task"
                                >
                                  <Play className="w-2.5 h-2.5 fill-sky-600" />
                                  <span>Start</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Teammate's work entry: live running clock with emerald beacon, or accumulated time
                          <div className="flex items-center space-x-1.5 shrink-0">
                            {isTimerRunning ? (
                              <span
                                title={`${entry.profile?.name || 'Teammate'} is actively working on this right now`}
                                className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-mono text-[11px] font-bold shadow-2xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping inline-block" />
                                <Clock className="w-3 h-3 text-emerald-600" />
                                <span>{formatWorkEntryStopwatch(liveSeconds)}</span>
                                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-1 py-0.2 rounded">Live</span>
                              </span>
                            ) : (
                              liveSeconds > 0 && (
                                <span
                                  title={`Time spent: ${formatWorkEntryDuration(liveSeconds)}`}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-mono font-medium"
                                >
                                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{formatWorkEntryDuration(liveSeconds)}</span>
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily Tasks & To-Do List Widget (35%) */}
          <div className="w-full lg:w-[35%] flex flex-col">
            <TodoListWidget userId={currentProfileId} />
          </div>
        </div>

        {/* Quick Inline Approval Modal */}
        <QuickApprovalModal
          entry={selectedApprovalEntry}
          isOpen={Boolean(selectedApprovalEntry)}
          onClose={() => setSelectedApprovalEntry(null)}
          onSuccess={updated => {
            setTodayEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
          }}
        />
      </main>
    </div>
  );
}

