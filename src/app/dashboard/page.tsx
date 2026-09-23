'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { getWeeklyReportData, getVelocityWeekRange, WeeklyUserSummary } from '@/lib/services/reports';
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
  Search,
  Sparkles,
  TrendingUp,
  Activity,
  Flame,
  Filter,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { TodoListWidget } from '@/components/dashboard/TodoListWidget';
import { useToast } from '@/components/ui/ToastContext';
import { QuickApprovalModal } from '@/components/work/QuickApprovalModal';
import { OrbitLoader } from '@/components/ui/OrbitLoader';

type FeedFilterTab = 'my_work' | 'team_work' | 'timers' | 'approved' | 'pending';
type HorizonPeriod = 'weekly' | 'monthly';

export default function DashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [todayEntries, setTodayEntries] = useState<WorkEntryWithDetails[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyUserSummary[]>([]);
  const [weekRange, setWeekRange] = useState({ startDate: '', endDate: '' });
  const [pendingApprovals, setPendingApprovals] = useState<WorkEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({ name: 'Team Member', email: '' });
  const [currentProfileId, setCurrentProfileId] = useState<string | undefined>(undefined);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [timerLoadingId, setTimerLoadingId] = useState<string | null>(null);
  const [selectedApprovalEntry, setSelectedApprovalEntry] = useState<WorkEntryWithDetails | null>(null);
  const [feedFilter, setFeedFilter] = useState<FeedFilterTab>('my_work');
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<HorizonPeriod>('weekly');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  const [greeting, setGreeting] = useState('Good day');
  const [subtitle, setSubtitle] = useState('Here is your personal creative velocity and activity overview.');

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
      setSubtitle("Ready to design something exceptional today?");
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good afternoon');
      setSubtitle("Maintaining peak velocity and creative flow.");
    } else if (hour >= 17 && hour < 22) {
      setGreeting('Good evening');
      setSubtitle("Wrapping up deliverables and reviewing milestones.");
    } else {
      setGreeting('Good night');
      setSubtitle("Rest well to recharge creative focus for tomorrow.");
    }

    async function loadDashboardData() {
      try {
        const week = getVelocityWeekRange(new Date());
        setWeekRange({ startDate: week.startDate, endDate: week.endDate });

        const [tEntries, wData, profiles] = await Promise.all([
          fetchWorkEntriesByDate(todayStr),
          getWeeklyReportData(week.startDate, week.endDate),
          fetchProfiles(),
        ]);

        setTodayEntries(tEntries);
        setWeeklyData(wData);

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

    if (typeof window !== 'undefined') {
      window.designOrbitPipManager?.openPip(activeEntry).catch(() => {});
    }

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

    setTodayEntries(prev =>
      prev.map(e =>
        e.id === entry.id
          ? { ...e, timer_started_at: null, time_spent_seconds: newTotal }
          : e
      )
    );

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

  // ==========================================
  // REAL INDIVIDUAL DATA METRICS (Personal to this designer)
  // ==========================================
  const myWeeklySummary = useMemo(() => {
    if (!currentProfileId) return null;
    return weeklyData.find(s => s.profile.id === currentProfileId) || null;
  }, [weeklyData, currentProfileId]);

  const myEntries = useMemo(() => {
    return myWeeklySummary?.entries || [];
  }, [myWeeklySummary]);

  const myTodayEntries = useMemo(() => {
    if (!currentProfileId) return todayEntries;
    return todayEntries.filter(e => e.user_id === currentProfileId || e.profile?.id === currentProfileId);
  }, [todayEntries, currentProfileId]);

  const myTodayDone = useMemo(() => {
    return myTodayEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
  }, [myTodayEntries]);

  const myTodayApproved = useMemo(() => {
    return myTodayEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
  }, [myTodayEntries]);

  const myTodayApprovalRate = myTodayDone > 0 ? Math.round((myTodayApproved / myTodayDone) * 100) : 0;

  // Individual Weekly Deliverables count (Real from DB)
  const myWeekTotalCreated = myWeeklySummary?.totalCreated ?? myTodayDone;
  const myWeekTotalApproved = myWeeklySummary?.totalApproved ?? myTodayApproved;
  const myWeekApprovalRate = myWeekTotalCreated > 0
    ? Math.round((myWeekTotalApproved / myWeekTotalCreated) * 100)
    : myTodayApprovalRate;

  // Individual total focused creative time logged today
  const myTotalTimeSeconds = useMemo(() => {
    return myTodayEntries.reduce((acc, entry) => {
      return acc + calculateWorkEntrySeconds(entry, nowMs);
    }, 0);
  }, [myTodayEntries, nowMs]);

  const myRunningTimers = myTodayEntries.filter(e => Boolean(e.timer_started_at));

  // Individual unique active client accounts serviced this week
  const myActiveClientsCount = useMemo(() => {
    const clients = new Set<string>();
    myEntries.forEach(e => {
      if (e.client?.name) clients.add(e.client.name.trim().toLowerCase());
      else if (e.client_id) clients.add(e.client_id);
    });
    myTodayEntries.forEach(e => {
      if (e.client?.name) clients.add(e.client.name.trim().toLowerCase());
      else if (e.client_id) clients.add(e.client_id);
    });
    return clients.size;
  }, [myEntries, myTodayEntries]);

  // Working Days Pace (Divided by 5 active working days so rest days never penalize average)
  const myDailyAverage = useMemo(() => {
    return (Math.round((myWeekTotalCreated / 5) * 10) / 10).toFixed(1);
  }, [myWeekTotalCreated]);

  const myTurnaroundRate = useMemo(() => {
    return myWeekTotalCreated > 0
      ? `${myWeekApprovalRate}% On Schedule`
      : '100% On Schedule';
  }, [myWeekTotalCreated, myWeekApprovalRate]);

  // ==========================================
  // REAL WEEKLY DATES & REAL SPLINE DATA
  // ==========================================
  const realWeekDates = useMemo(() => {
    if (!weekRange.startDate) return [];
    const dates: { dateStr: string; label: string; isToday: boolean }[] = [];
    const [sy, sm, sd] = weekRange.startDate.split('-').map(Number);
    const cur = new Date(sy, sm - 1, sd, 12, 0, 0);
    for (let i = 0; i < 7; i++) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dStr = `${y}-${m}-${d}`;
      const dayName = cur.toLocaleDateString('en-US', { weekday: 'short' });
      dates.push({
        dateStr: dStr,
        label: dayName,
        isToday: dStr === todayStr,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [weekRange.startDate, todayStr]);

  // Compute exact real deliverable count per day from DB for THIS individual designer
  const realDailyCounts = useMemo(() => {
    return realWeekDates.map(wd => {
      const count = myEntries
        .filter(e => e.work_date === wd.dateStr)
        .reduce((acc, curr) => acc + curr.quantity_done, 0);
      if (wd.isToday && count === 0 && myTodayDone > 0) {
        return myTodayDone;
      }
      return count;
    });
  }, [realWeekDates, myEntries, myTodayDone]);

  // Peak output day from real data
  const peakDayMeta = useMemo(() => {
    if (realDailyCounts.length === 0 || myWeekTotalCreated === 0) {
      return { label: 'Active', count: 0, text: 'No work logged yet' };
    }
    let max = -1;
    let maxIdx = 0;
    realDailyCounts.forEach((val, idx) => {
      if (val > max) {
        max = val;
        maxIdx = idx;
      }
    });
    if (max <= 0) return { label: 'Active', count: 0, text: '0 Deliverables' };
    const dayLabel = realWeekDates[maxIdx]?.label || 'Day';
    return {
      label: dayLabel,
      count: max,
      text: `${dayLabel} • ${max} Deliverables`,
    };
  }, [realDailyCounts, myWeekTotalCreated, realWeekDates]);

  // Chart Meta based on selected Period (This Week, Monthly)
  const chartMeta = useMemo(() => {
    if (period === 'monthly') {
      const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const values = [0, 0, 0, myWeekTotalCreated];
      return {
        labels,
        values,
        currentIdx: 3,
        displayTitle: 'My Monthly Throughput',
        subtitle: 'Personal outputs completed per sprint cycle',
      };
    }
    // Default: This Week (100% Real DB Data for this designer)
    const labels = realWeekDates.map(d => d.label);
    const values = realDailyCounts;
    const currentIdx = realWeekDates.findIndex(d => d.isToday);
    return {
      labels,
      values,
      currentIdx: currentIdx >= 0 ? currentIdx : 0,
      displayTitle: 'My Creative Velocity',
      subtitle: 'Your personal deliverables logged this week',
    };
  }, [period, realWeekDates, realDailyCounts, myTodayDone, myWeekTotalCreated]);

  // Compute SVG cubic bezier path coordinates
  const svgWidth = 560;
  const svgHeight = 120;
  const maxVal = Math.max(...chartMeta.values, 5);
  const points = chartMeta.values.map((val, idx) => {
    const x = (idx / (Math.max(chartMeta.values.length - 1, 1))) * (svgWidth - 48) + 24;
    const y = svgHeight - 22 - (val / maxVal) * (svgHeight - 44);
    return { x, y, val, label: chartMeta.labels[idx], isCurrent: idx === chartMeta.currentIdx };
  });

  const splinePath = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  const splineAreaPath = useMemo(() => {
    if (points.length === 0) return '';
    return `${splinePath} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;
  }, [splinePath, points, svgHeight]);

  // Filtered deliverables feed
  const filteredFeed = useMemo(() => {
    let list = feedFilter === 'team_work' ? todayEntries : myTodayEntries;
    if (feedFilter === 'timers') list = myTodayEntries.filter(e => Boolean(e.timer_started_at));
    else if (feedFilter === 'approved') list = myTodayEntries.filter(e => e.quantity_approved > 0);
    else if (feedFilter === 'pending') list = myTodayEntries.filter(e => e.quantity_approved < e.quantity_done);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (e.client?.name && e.client.name.toLowerCase().includes(q)) ||
        (e.work_type?.name && e.work_type.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [todayEntries, myTodayEntries, feedFilter, searchQuery]);

  const formattedCurrentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#06080F] md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-7 animate-fade-in-up">
        {/* Top Utility Command Header (Personal Workspace) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight flex items-center">
                {greeting}, <span className="font-display font-black text-xl sm:text-2xl ml-2 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">{currentUser.name}</span>
                <span className="ml-2 text-lg">👋</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Live System Sync Pill */}
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-slate-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-beacon" />
              <span className="text-slate-400 font-medium">{formattedCurrentDate}</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-bold">Personal Workspace</span>
            </div>

            {/* Quick Action Button */}
            <Link
              href="/work/new"
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs sm:text-sm font-bold text-white webtree-gradient-btn rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_28px_rgba(168,85,247,0.5)] btn-tactile"
            >
              <Plus className="w-4 h-4" />
              <span>Log Daily Work</span>
            </Link>
          </div>
        </div>

        {/* Hero Bento Grid: Individual Velocity Spline + Circular Quality Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1: Individual Creative Velocity & Output Spline (8 cols) */}
          <div className="lg:col-span-8 bento-card bento-card-hover bento-glow-subtle p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{chartMeta.displayTitle}</span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-xs">
                    <User className="w-3 h-3" />
                    <span>My Individual Output</span>
                  </span>
                </div>
                <div className="flex items-baseline space-x-3 mt-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold font-display text-slate-100 tracking-tight tabular-nums">
                    {myWeekTotalCreated}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-400 font-medium">
                    deliverables completed by you ({myWeekTotalApproved} approved)
                  </span>
                </div>
              </div>

              {/* Time Horizon Segmented Pill Selector */}
              <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/[0.08] text-[11px] self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setPeriod('weekly')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    period === 'weekly'
                      ? 'bg-violet-600/35 text-white border border-violet-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('monthly')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    period === 'monthly'
                      ? 'bg-violet-600/35 text-white border border-violet-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Interactive Real Data SVG Spline Wave Chart */}
            <div className="relative z-10 my-3 pt-3">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-28 sm:h-34 overflow-visible">
                <defs>
                  <linearGradient id="myVelocitySplineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.45" />
                    <stop offset="60%" stopColor="#6366f1" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#06080F" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="mySplineStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="50%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                  <filter id="mySplineGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#a855f7" floodOpacity="0.6" />
                  </filter>
                </defs>

                {/* Horizontal guide lines */}
                <line x1="20" y1="28" x2={svgWidth - 20} y2="28" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <line x1="20" y1="68" x2={svgWidth - 20} y2="68" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <line x1="20" y1={svgHeight - 16} x2={svgWidth - 20} y2={svgHeight - 16} stroke="rgba(255,255,255,0.06)" />

                {/* Vertical hover guide line */}
                {hoveredPoint !== null && points[hoveredPoint] && (
                  <line
                    x1={points[hoveredPoint].x}
                    y1="12"
                    x2={points[hoveredPoint].x}
                    y2={svgHeight - 16}
                    stroke="rgba(168,85,247,0.4)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Area under spline */}
                <path d={splineAreaPath} fill="url(#myVelocitySplineGrad)" />

                {/* Main Spline Curve */}
                <path
                  d={splinePath}
                  fill="none"
                  stroke="url(#mySplineStrokeGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  filter="url(#mySplineGlowFilter)"
                />

                {/* Interactive Node Circles (Clean static nodes, NO moving circles) */}
                {points.map((pt, idx) => (
                  <g
                    key={idx}
                    className="cursor-pointer group/node"
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint === idx ? '6.5' : pt.isCurrent ? '5.5' : '4'}
                      className={`transition-all duration-200 ${
                        hoveredPoint === idx
                          ? 'fill-white stroke-violet-500 stroke-2'
                          : pt.isCurrent
                          ? 'fill-violet-400 stroke-[#06080F] stroke-2'
                          : 'fill-slate-400 stroke-[#06080F] stroke-1.5 hover:fill-violet-300'
                      }`}
                    />
                    {/* Tooltip on Hover */}
                    {hoveredPoint === idx && (
                      <g transform={`translate(${pt.x}, ${pt.y - 30})`}>
                        <rect x="-32" y="-13" width="64" height="22" rx="7" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                        <text x="0" y="2" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="bold">
                          {pt.val} items
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>

              {/* Day / Period Labels Strip */}
              <div className="flex justify-between px-3 pt-1.5 text-[11px] font-bold text-slate-500">
                {points.map((pt, idx) => (
                  <span
                    key={idx}
                    className={`transition-colors cursor-pointer ${
                      pt.isCurrent
                        ? 'text-violet-300 font-extrabold underline underline-offset-4 decoration-violet-500'
                        : 'hover:text-slate-300'
                    }`}
                    onClick={() => setHoveredPoint(idx)}
                  >
                    {pt.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Meta Stats (Normalized for 5-day Working Sprints) */}
            <div className="relative z-10 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Peak Velocity</span>
                <span className="text-xs font-bold text-slate-200 mt-0.5 block">{peakDayMeta.text}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Approval Rating</span>
                <span className="text-xs font-bold text-emerald-400 mt-0.5 block">{myTurnaroundRate}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Individual Weekly Approval Rate Circular Gauge (4 cols) */}
          <div className="lg:col-span-4 bento-card bento-card-hover p-5 sm:p-7 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">My Quality Sign-off</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Weekly approval & client sign-off index</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 shadow-xs">
                This Week
              </span>
            </div>

            {/* Circular Ring Meter */}
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center my-1">
              <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                <defs>
                  <linearGradient id="ringGlowGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="60%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
                  </filter>
                </defs>

                {/* Background Ring Track */}
                <circle
                  cx="80"
                  cy="80"
                  r="58"
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="9"
                  fill="transparent"
                />

                {/* Animated Value Ring (Only render if > 0 to prevent 0% cap bleed) */}
                {myWeekApprovalRate > 0 && (
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    stroke="url(#ringGlowGrad)"
                    strokeWidth="9"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={2 * Math.PI * 58 - (2 * Math.PI * 58 * Math.min(myWeekApprovalRate, 100)) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    filter="url(#ringGlow)"
                    className="transition-all duration-1000 ease-out"
                  />
                )}
              </svg>

              {/* Centered Gauge Typography */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                <span className="text-3xl sm:text-[32px] font-black font-display text-slate-100 tracking-tight tabular-nums leading-none">
                  {myWeekApprovalRate}%
                </span>
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-2">
                  Weekly Sign-off
                </span>
              </div>
            </div>

            {/* Individual Weekly Quality Breakdown */}
            <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  <span className="text-slate-300 font-medium">Approved Deliverables</span>
                </div>
                <span className="font-bold text-emerald-400 tabular-nums">{myWeekTotalApproved} items</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                  <span className="text-slate-300 font-medium">In Review / Pending</span>
                </div>
                <span className="font-bold text-amber-400 tabular-nums">{Math.max(0, myWeekTotalCreated - myWeekTotalApproved)} items</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                  <span className="text-slate-300 font-medium">Today's Output</span>
                </div>
                <span className="font-bold text-violet-300 tabular-nums">{myTodayDone} logged today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary KPI Matrix (Personal to this Designer) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {/* Tile 1: Today's Created */}
          <div className="bento-card bento-card-hover p-4 sm:p-5 flex items-center justify-between group">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My Today's Output</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display tracking-tight tabular-nums">{myTodayDone}</span>
                <span className="text-xs text-slate-500 font-medium">deliverables</span>
              </div>
              <p className="text-[11px] text-slate-400">Logged by you today</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/25 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* Tile 2: Deep Work Time */}
          <div className="bento-card bento-card-hover p-4 sm:p-5 flex items-center justify-between group">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My Focused Creative Time</span>
                {myRunningTimers.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-beacon" />
                )}
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight tabular-nums">
                  {formatWorkEntryStopwatch(myTotalTimeSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {myRunningTimers.length > 0 ? `${myRunningTimers.length} active stopwatch running` : 'Timers paused'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Tile 3: Active Client Brands */}
          <Link
            href="/clients"
            className="bento-card bento-card-hover p-4 sm:p-5 flex items-center justify-between group cursor-pointer"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My Client Accounts</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-violet-300 font-display tracking-tight tabular-nums">{myActiveClientsCount}</span>
                <span className="text-xs text-slate-500 font-medium">brands serviced</span>
              </div>
              <p className="text-[11px] text-violet-400 font-medium group-hover:underline flex items-center space-x-1">
                <span>View directory</span>
                <ArrowUpRight className="w-3 h-3" />
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
          </Link>
        </div>

        {/* Pending Client Approvals Urgent Banner (If Any) */}
        {pendingApprovals.length > 0 && (
          <div className="bento-card p-5 sm:p-6 border-amber-500/35 bg-gradient-to-r from-amber-950/20 via-orange-950/10 to-transparent space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Hourglass className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-100">Pending Client Sign-offs</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-950/80 text-amber-300 border border-amber-700/60">
                      {pendingApprovals.length} {pendingApprovals.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deliverables awaiting client approval from past dates. Click to approve directly!
                  </p>
                </div>
              </div>

              <Link
                href="/work?view=pending"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold text-amber-300 bg-amber-950/70 hover:bg-amber-900/90 border border-amber-700/60 rounded-xl transition-all self-start sm:self-center btn-tactile"
              >
                <span>Full Queue</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {pendingApprovals.slice(0, 3).map(entry => {
                const daysAgo = getPendingDaysAgo(entry.work_date);
                const urgency = getPendingUrgency(daysAgo);
                const unapproved = entry.quantity_done - entry.quantity_approved;
                return (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-amber-500/40 flex flex-col justify-between space-y-2 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-300 truncate max-w-[130px]">{entry.client?.name || 'Client'}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${urgency.bg} ${urgency.text}`}>
                          {urgency.label}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-200 line-clamp-1">{entry.description}</p>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-bold tabular-nums">{unapproved} pending</span>
                      <button
                        type="button"
                        onClick={() => setSelectedApprovalEntry(entry)}
                        className="px-2.5 py-1 text-[11px] font-bold text-violet-200 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 rounded-lg transition-all btn-tactile cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Operations Hub: Deliverables Transaction Stream (65%) & Personal Focus List (35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Main Deliverables Stream (8 cols) */}
          <div className="lg:col-span-8 bento-card p-5 sm:p-6 space-y-4">
            {/* Header with Search and Filter Pills */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 border-b border-white/[0.08] pb-4">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-violet-600/15 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-sm sm:text-base font-bold text-slate-100 whitespace-nowrap">
                      Today's Deliverable Feed
                    </h2>
                    {myRunningTimers.length > 0 && (
                      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{myRunningTimers.length} running</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Live stream of creative outputs & focus sessions</p>
                </div>
              </div>

              {/* Interactive Search Bar & Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Input Box */}
                <div className="relative min-w-[150px] max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter deliverables..."
                    className="w-full pl-8 pr-7 py-1.5 bg-black/40 border border-white/[0.08] focus:border-violet-500/50 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs: My Work vs Team Work */}
                <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/[0.08] text-xs">
                  <button
                    type="button"
                    onClick={() => setFeedFilter('my_work')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      feedFilter === 'my_work'
                        ? 'bg-violet-600/30 text-white border border-violet-500/35 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    My Work ({myTodayEntries.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedFilter('team_work')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      feedFilter === 'team_work'
                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/35 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Team ({todayEntries.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedFilter('timers')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      feedFilter === 'timers'
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/35 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Timers
                  </button>
                </div>
              </div>
            </div>

            {/* Transaction Rows List */}
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <OrbitLoader size="md" text="Syncing deliverable feed..." />
              </div>
            ) : filteredFeed.length === 0 ? (
              <div className="p-10 text-center space-y-3 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                <p className="text-xs text-slate-400 font-medium">
                  {searchQuery ? `No deliverables matching "${searchQuery}"` : 'No deliverables logged in this view yet.'}
                </p>
                <Link
                  href="/work/new"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white webtree-gradient-btn rounded-xl shadow-[0_0_16px_rgba(168,85,247,0.3)] btn-tactile"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log New Deliverable</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[520px] pr-1">
                {filteredFeed.map(entry => {
                  const isMyEntry = Boolean(
                    currentProfileId && (entry.user_id === currentProfileId || entry.profile?.id === currentProfileId)
                  );
                  const isTimerRunning = Boolean(entry.timer_started_at);
                  const liveSeconds = calculateWorkEntrySeconds(entry, nowMs);
                  const clientName = entry.client?.name || 'Internal';
                  const initials = clientName.slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={entry.id}
                      className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden ${
                        isTimerRunning
                          ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/30'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-violet-500/35 hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Left Status Glow Accent Bar */}
                      <span
                        className={`absolute left-0 inset-y-0 w-1 rounded-l-2xl ${
                          isTimerRunning
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                            : entry.quantity_approved === entry.quantity_done
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                            : 'bg-violet-500/40'
                        }`}
                      />

                      {/* Left Side: Avatar squircle + Info */}
                      <div className="flex items-center space-x-3.5 min-w-0 pl-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600/30 via-indigo-600/20 to-fuchsia-600/20 border border-white/[0.1] flex items-center justify-center text-xs font-bold text-slate-200 shrink-0 shadow-xs">
                          {initials}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">{entry.description}</span>
                            {entry.work_type && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-600/20 text-violet-300 border border-violet-500/25">
                                {entry.work_type.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300">{clientName}</span>
                            <span>•</span>
                            <span>By {entry.profile?.name || (isMyEntry ? currentUser.name : 'Designer')}</span>
                            {isTimerRunning && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center space-x-1 text-amber-400 font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                  <span>Timer Live</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Stopwatch + Actions */}
                      <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center pl-1 sm:pl-0">
                        {/* Live Timer Clock Display */}
                        {(liveSeconds > 0 || isTimerRunning) && (
                          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.08] font-mono text-xs font-bold text-slate-200 tabular-nums">
                            <Clock className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-amber-400 animate-spin-slow' : 'text-slate-400'}`} />
                            <span>{formatWorkEntryStopwatch(liveSeconds)}</span>
                          </div>
                        )}

                        {/* Approval Status Pill */}
                        {isMyEntry ? (
                          <button
                            type="button"
                            onClick={() => setSelectedApprovalEntry(entry)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer btn-tactile ${
                              entry.quantity_approved === entry.quantity_done
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                : entry.quantity_approved > 0
                                ? 'bg-violet-500/15 text-violet-300 border-violet-500/30 hover:bg-violet-500/25'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                            }`}
                          >
                            {entry.quantity_approved === entry.quantity_done
                              ? `Approved (${entry.quantity_approved})`
                              : entry.quantity_approved > 0
                              ? `Partial (${entry.quantity_approved}/${entry.quantity_done})`
                              : 'Pending Sign-off'}
                          </button>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                              entry.quantity_approved > 0
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {entry.quantity_approved > 0 ? `Approved (${entry.quantity_approved})` : 'Pending'}
                          </span>
                        )}

                        {/* Timer Control Button */}
                        {isMyEntry && (
                          <button
                            type="button"
                            disabled={timerLoadingId === entry.id}
                            onClick={() => (isTimerRunning ? handleStopTimer(entry) : handleStartTimer(entry))}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all btn-tactile cursor-pointer ${
                              isTimerRunning
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                : 'bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/35'
                            }`}
                            title={isTimerRunning ? 'Pause timer' : 'Start stopwatch'}
                          >
                            {isTimerRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Personal Focus & Todo Hub (4 cols) */}
          <div className="lg:col-span-4 h-full">
            <TodoListWidget userId={currentProfileId} />
          </div>
        </div>
      </main>

      {/* Quick Approval Adjustment Dialog */}
      <QuickApprovalModal
        isOpen={Boolean(selectedApprovalEntry)}
        entry={selectedApprovalEntry}
        onClose={() => setSelectedApprovalEntry(null)}
        onSuccess={updated => {
          setTodayEntries(prev => prev.map(e => (e.id === updated.id ? { ...e, ...updated } : e)));
          setPendingApprovals(prev => prev.filter(e => e.id !== updated.id));
          setSelectedApprovalEntry(null);
          showToast('Deliverable approval updated!', 'success');
        }}
      />
    </div>
  );
}
