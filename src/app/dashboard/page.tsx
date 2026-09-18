'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  isAdminUser,
  fetchPendingApprovalEntries,
  getPendingDaysAgo,
  getPendingUrgency,
  isInProgressEntry,
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
  AlertCircle,
  ChevronRight,
  Hourglass,
  CheckCheck,
} from 'lucide-react';
import { TodoListWidget } from '@/components/dashboard/TodoListWidget';
import { useToast } from '@/components/ui/ToastContext';
import { QuickApprovalModal } from '@/components/work/QuickApprovalModal';

export default function DashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [todayEntries, setTodayEntries] = useState<WorkEntryWithDetails[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<WorkEntryWithDetails[]>([]);
  const [weekSummary, setWeekSummary] = useState({ totalCreated: 0, totalApproved: 0, activeClients: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({ name: 'Team Member', email: '' });
  const [currentProfileId, setCurrentProfileId] = useState<string | undefined>(undefined);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [timerLoadingId, setTimerLoadingId] = useState<string | null>(null);
  const [selectedApprovalEntry, setSelectedApprovalEntry] = useState<WorkEntryWithDetails | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  const [greeting, setGreeting] = useState('Good day');
  const [subtitle, setSubtitle] = useState('Here is your live daily activity and weekly work summary.');

  useEffect(() => {
    const user = getLoggedInUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (isAdminUser(user)) {
      router.replace('/admin');
      return;
    }
    if (user.name) {
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

        let resolvedId = user?.profileId;
        if (profiles.length > 0) {
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

        const pApprovals = await fetchPendingApprovalEntries(resolvedId);
        setPendingApprovals(pApprovals);

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-800 shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-baseline flex-wrap">
              {greeting}, <span className="font-display font-extrabold text-xl sm:text-3xl ml-2 inline-block bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">{currentUser.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/work/new"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span>Add Daily Work</span>
            </Link>
          </div>
        </div>

        {/* Quick Stat Cards - 4 Small Compact Cards (2x2 on Mobile, 4-col on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
          {/* Card 1: Today's Created */}
          <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Today Created</span>
              <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-100 leading-none">{todayDone}</span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">items logged</span>
            </div>
          </div>

          {/* Card 2: Today's Approved */}
          <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Today Approved</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-teal-400 leading-none">{todayApproved}</span>
              <span className="text-[10px] sm:text-xs text-emerald-400 font-bold truncate">({todayApprovalRate}%)</span>
            </div>
          </div>

          {/* Card 3: This Week Total */}
          <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">This Week</span>
              <CalendarDays className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-100 leading-none">{weekSummary.totalCreated}</span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">({weekSummary.totalApproved} app.)</span>
            </div>
          </div>

          {/* Card 4: Active Clients */}
          <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Active Clients</span>
              <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-sky-400 leading-none">{weekSummary.activeClients}</span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">brands</span>
            </div>
          </div>
        </div>

        {/* Application Navigation Quick Launchpad */}
        <div className="bg-slate-900 p-3.5 sm:p-5 rounded-xl border border-slate-800 shadow-sm space-y-3 sm:space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Application Quick Navigation</h2>
              <p className="text-xs text-slate-400">Fast access to key work tracking & reporting modules</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Link
              href="/work/new"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-sky-500/50 hover:bg-slate-800/80 transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <Plus className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-200">Add Daily Work</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
            </Link>

            <Link
              href="/work"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-sky-500/50 hover:bg-slate-800/80 transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <CalendarDays className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-200">My Daily Log</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
            </Link>

            <Link
              href="/work?view=pending"
              className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-950/20 hover:border-amber-500/60 hover:bg-amber-950/40 transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <Hourglass className="w-4 h-4 text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-200">Pending Queue</span>
                  {pendingApprovals.length > 0 && (
                    <span className="text-[10px] font-extrabold text-amber-400">{pendingApprovals.length} waiting</span>
                  )}
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
            </Link>

            <Link
              href="/reports/weekly"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-teal-500/50 hover:bg-slate-800/80 transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <BarChart2 className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-slate-200">Weekly Report</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400" />
            </Link>

            <Link
              href="/reports/monthly"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-teal-500/50 hover:bg-slate-800/80 transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <PieChart className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-slate-200">Monthly Stats</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400" />
            </Link>
          </div>
        </div>

        {/* Pending Client Approvals Reminder Card */}
        {pendingApprovals.length > 0 && (
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3.5">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shadow-sm ring-4 ring-amber-950/50">
                  <Hourglass className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-100">
                      Pending Client Approvals
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-900/60 text-amber-300 border border-amber-700/60">
                      {pendingApprovals.length} {pendingApprovals.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Deliverables awaiting client sign-off from past dates. Once client approves, sign off here directly without calendar hunting!
                  </p>
                </div>
              </div>

              <Link
                href="/work?view=pending"
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/60 rounded-xl transition-all shadow-2xs shrink-0 self-start sm:self-auto"
              >
                <span>View Full Pending Queue</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingApprovals.slice(0, 3).map((entry) => {
                const daysAgo = getPendingDaysAgo(entry.work_date);
                const urgency = getPendingUrgency(daysAgo);
                const unapproved = entry.quantity_done - entry.quantity_approved;
                const formattedDate = new Date(entry.work_date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={entry.id}
                    className="bg-slate-900/90 backdrop-blur-xs p-3.5 rounded-xl border border-slate-800 hover:border-amber-500/50 shadow-2xs transition-all flex flex-col justify-between space-y-2.5"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[11px] font-bold truncate max-w-[120px]">
                          {entry.client?.name || 'Client'}
                        </span>
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgency.bg} ${urgency.text} ${urgency.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
                          <span>{urgency.label}</span>
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-200 line-clamp-2" title={entry.description}>
                        {entry.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-slate-400">
                        <span className="font-medium text-slate-300">📅 {formattedDate}</span>
                        <span className="mx-1.5 text-slate-600">•</span>
                        <span className="font-bold text-amber-400">{unapproved} pending</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedApprovalEntry(entry)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-teal-300 bg-teal-950/60 hover:bg-teal-900/80 border border-teal-800/60 rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        <CheckCheck className="w-3 h-3 text-teal-400" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Entries & To-Do List (65% / 35% Split) */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* Today's Work Activity (65%) */}
          <div className="w-full lg:w-[65%] bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-800 shadow-sm space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-100">Today's Work Log</h2>
                    {todayEntries.filter(e => Boolean(e.timer_started_at)).length > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                        <span>{todayEntries.filter(e => Boolean(e.timer_started_at)).length} live</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Deliverables created and approved today</p>
                </div>
              </div>
              <Link
                href="/work"
                className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1"
              >
                <span>View Full Daily Log</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
                <div className="animate-spin w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-xs text-slate-400">Loading today's activity...</p>
              </div>
            ) : todayEntries.length === 0 ? (
              <div className="p-8 text-center space-y-3 bg-slate-950/50 rounded-lg border border-slate-800/80 flex-1 flex flex-col items-center justify-center">
                <p className="text-xs text-slate-400 font-medium">No work logged yet for today.</p>
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
                            ? 'bg-amber-950/30 border-amber-600/50 ring-1 ring-amber-500/30 shadow-2xs'
                            : 'bg-emerald-950/30 border-emerald-600/50 shadow-2xs'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {entry.profile && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-950/70 text-teal-300 border border-teal-800/60 shadow-2xs">
                            <User className="w-3 h-3 text-teal-400" />
                            <span>By {entry.profile.name}</span>
                          </span>
                        )}

                        {isTimerRunning && isMyEntry && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                            <span>Timer Active</span>
                          </span>
                        )}

                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-sky-950/70 text-sky-300 border border-sky-800/60">
                          {entry.work_type?.name || 'Work'}
                        </span>

                        {entry.client && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {entry.client.name}
                          </span>
                        )}

                        <span className="font-semibold text-slate-200">{entry.description}</span>
                      </div>

                      <div className="flex flex-wrap items-center space-x-3 sm:space-x-4 shrink-0 text-slate-300">
                        {isInProgressEntry(entry) ? (
                          <div className="flex items-center">
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60 shadow-2xs">
                              <span>⏳ Working</span>
                              <span className="text-[10px] text-amber-400 font-semibold">(0 qty • Time logged)</span>
                            </span>
                          </div>
                        ) : (
                          <>
                            <span>Qty: <strong className="text-slate-100">{entry.quantity_done}</strong></span>
                            <span>Approved: <strong className="text-teal-400">{entry.quantity_approved}</strong></span>
                            {isMyEntry ? (
                              <button
                                type="button"
                                onClick={() => setSelectedApprovalEntry(entry)}
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 flex items-center space-x-1 ${
                                  entry.quantity_approved === entry.quantity_done
                                    ? 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800/60'
                                    : entry.quantity_approved > 0
                                    ? 'bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 border-sky-800/60'
                                    : 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border-amber-800/60'
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
                                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                                    : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                                }`}
                              >
                                {entry.quantity_approved > 0 ? `Approved (${entry.quantity_approved})` : 'Not Approved'}
                              </span>
                            )}
                          </>
                        )}

                        {/* Timer Controls on Dashboard */}
                        {isMyEntry ? (
                          <div className="flex items-center space-x-1.5 shrink-0">
                            {isTimerRunning ? (
                              <div className="flex items-center space-x-1">
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-700/60 rounded font-mono text-[11px] font-bold shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
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
                                  onClick={async () => {
                                    if (typeof window !== 'undefined') {
                                      try {
                                        const opened = await window.designOrbitPipManager?.openPip(entry);
                                        if (!opened) {
                                          showToast('Unable to open floating timer. Ensure popups are allowed.', 'error');
                                        }
                                      } catch (err: any) {
                                        showToast(err.message || 'Could not launch floating timer', 'error');
                                      }
                                    }
                                  }}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                                  title="Float timer outside browser (Picture-in-Picture)"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                                  <span className="hidden sm:inline">Float PiP</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                {liveSeconds > 0 && (
                                  <span
                                    title={`Time tracked: ${formatWorkEntryDuration(liveSeconds)}`}
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px] font-mono font-bold"
                                  >
                                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{formatWorkEntryDuration(liveSeconds)}</span>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleStartTimer(entry)}
                                  disabled={timerLoadingId === entry.id}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-800/60 hover:border-sky-600 rounded text-[11px] font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                                  title="Start timer for this task"
                                >
                                  <Play className="w-2.5 h-2.5 fill-sky-400 text-sky-400" />
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
                                className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 rounded font-mono text-[11px] font-bold shadow-2xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                                <Clock className="w-3 h-3 text-emerald-400" />
                                <span>{formatWorkEntryStopwatch(liveSeconds)}</span>
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-900/60 px-1 py-0.2 rounded border border-emerald-700/50">Live</span>
                              </span>
                            ) : (
                              liveSeconds > 0 && (
                                <span
                                  title={`Time spent: ${formatWorkEntryDuration(liveSeconds)}`}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[10px] font-mono font-medium"
                                >
                                  <Clock className="w-2.5 h-2.5 text-slate-500" />
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
            setPendingApprovals(prev => {
              if (updated.quantity_approved >= updated.quantity_done) {
                return prev.filter(e => e.id !== updated.id);
              }
              return prev.map(e => e.id === updated.id ? updated : e);
            });
            showToast(`Approved count updated to ${updated.quantity_approved}`, 'success');
          }}
        />
      </main>
    </div>
  );
}

