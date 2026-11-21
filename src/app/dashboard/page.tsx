'use client';

import { Diya, FESTIVE } from '@/components/ui/Diwali';
import { useState, useEffect, useMemo, useRef } from 'react';
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
import { SlideTabs } from '@/components/ui/SlideTabs';

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
  const [feedFilter, setFeedFilter] = useState<FeedFilterTab>('team_work');
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<HorizonPeriod>('weekly');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const { showToast } = useToast();
  const router = useRouter();


  const velocityCardRef = useRef<HTMLDivElement>(null);
  const [velocityHeight, setVelocityHeight] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(typeof window !== 'undefined' && window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (!velocityCardRef.current) return;
    const el = velocityCardRef.current;
    const update = () => {
      if (el) {
        setVelocityHeight(el.offsetHeight);
      }
    };
    update();
    const ro = new ResizeObserver(() => {
      update();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      ? `${myWeekApprovalRate}% approved`
      : 'Nothing logged yet';
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

  // Approved count per day, for the green share of each bar
  const realDailyApproved = useMemo(() => {
    return realWeekDates.map(wd =>
      myEntries
        .filter(e => e.work_date === wd.dateStr)
        .reduce((acc, curr) => acc + curr.quantity_approved, 0)
    );
  }, [realWeekDates, myEntries]);

  // Peak output day from real data
  const peakDayMeta = useMemo(() => {
    if (realDailyCounts.length === 0 || myWeekTotalCreated === 0) {
      return { label: 'Active', count: 0, text: 'Nothing logged yet' };
    }
    let max = -1;
    let maxIdx = 0;
    realDailyCounts.forEach((val, idx) => {
      if (val > max) {
        max = val;
        maxIdx = idx;
      }
    });
    if (max <= 0) return { label: 'Active', count: 0, text: 'Nothing logged yet' };
    const dayLabel = realWeekDates[maxIdx]?.label || 'Day';
    return {
      label: dayLabel,
      count: max,
      text: `${dayLabel} · ${max} ${max === 1 ? 'deliverable' : 'deliverables'}`,
    };
  }, [realDailyCounts, myWeekTotalCreated, realWeekDates]);

  // Chart Meta based on selected Period (This Week, Monthly)
  const chartMeta = useMemo(() => {
    if (period === 'monthly') {
      const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const values = [0, 0, 0, myWeekTotalCreated];
      const approved = [0, 0, 0, myWeekTotalApproved];
      return {
        labels,
        values,
        approved,
        currentIdx: 3,
        displayTitle: 'Deliverables this month',
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
      approved: realDailyApproved,
      currentIdx: currentIdx >= 0 ? currentIdx : 0,
      displayTitle: 'Deliverables this week',
      subtitle: 'Your personal deliverables logged this week',
    };
  }, [period, realWeekDates, realDailyCounts, realDailyApproved, myTodayDone, myWeekTotalCreated, myWeekTotalApproved]);

  // Bar data: each period's total with the approved share stacked at the bottom
  const bars = chartMeta.values.map((val, idx) => ({
    val,
    approved: Math.min(chartMeta.approved[idx] ?? 0, val),
    label: chartMeta.labels[idx],
    isCurrent: idx === chartMeta.currentIdx,
  }));
  const barMax = Math.max(...chartMeta.values, 1);

  // Layered area chart geometry: one 100-unit column per period, points sit in the column centres
  const areaW = Math.max(bars.length, 1) * 100;
  const areaH = 160;
  const areaY = (v: number) => areaH - (v / barMax) * (areaH - 34);
  const areaPaths = (vals: number[]) => {
    if (vals.length === 0) return { line: '', fill: '' };
    const pts = vals.map((v, i) => ({ x: i * 100 + 50, y: areaY(v) }));
    let line = `M 0 ${pts[0].y} L ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const cx = (a.x + b.x) / 2;
      line += ` C ${cx} ${a.y}, ${cx} ${b.y}, ${b.x} ${b.y}`;
    }
    line += ` L ${areaW} ${pts[pts.length - 1].y}`;
    return { line, fill: `${line} L ${areaW} ${areaH} L 0 ${areaH} Z` };
  };
  const loggedArea = areaPaths(bars.map(b => b.val));
  const approvedArea = areaPaths(bars.map(b => b.approved));

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
    <div className="min-h-screen flex flex-col bg-[#0a0a09] md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-7 animate-fade-in-up">
        {/* Top Utility Command Header (Personal Workspace) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="font-display text-2xl sm:text-[28px] leading-tight font-medium text-slate-50">
                Today
              </h1>
              <Diya size={26} className="-mt-1" />
            </div>
            <p className="text-sm text-slate-400 font-normal">
              {currentUser.name}&rsquo;s week, sign-offs and today&rsquo;s log
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Live System Sync Pill */}
            <div className="flex items-center space-x-2 px-1 text-sm text-slate-400 tabular-nums">
              {FESTIVE && <span className="text-[#f2a93b]">Happy Diwali</span>}
              {FESTIVE && <span aria-hidden="true" className="text-slate-600">·</span>}
              <span>{formattedCurrentDate}</span>
            </div>
          </div>
        </div>

        {/* Hero Bento Grid: Individual Velocity Spline + To-Do List Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card 1: Individual Creative Velocity & Output Spline (8 cols) */}
          <div
            ref={velocityCardRef}
            className="lg:col-span-8 bento-card bento-card-hover p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-sm font-medium text-slate-300 font-sans tracking-normal">{chartMeta.displayTitle}</h2>
                </div>
                <div className="flex items-baseline space-x-3 mt-1.5">
                  <span className="text-4xl sm:text-[44px] leading-none font-medium font-display text-white tabular-nums">
                    {myWeekTotalCreated}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-400 font-normal tabular-nums">
                    logged · {myWeekTotalApproved} approved
                  </span>
                </div>
              </div>

              {/* Time Horizon Segmented Pill Selector with Smooth Gliding Pill */}
              <SlideTabs
                options={[
                  { id: 'weekly', label: 'Week' },
                  { id: 'monthly', label: 'Month' },
                ]}
                value={period}
                onChange={(val) => setPeriod(val as HorizonPeriod)}
                size="xs"
                fullWidth={false}
                className="self-start sm:self-center p-0.5"
              />
            </div>

            {/* Layered area: everything logged (graphite) with the approved share (green) inside it */}
            <div className="relative z-10 mt-5 mb-4">
              <div className="flex items-center justify-end gap-4 mb-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="w-3 h-0.5 rounded-full bg-slate-400/70" />Logged</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="w-3 h-0.5 rounded-full bg-emerald-400" />Approved</span>
              </div>

              <div className="relative h-40 sm:h-44" onMouseLeave={() => setHoveredPoint(null)}>
                {/* Guide lines */}
                <div aria-hidden="true" className="absolute inset-x-0 top-[21%] border-t border-dashed border-white/[0.05]" />
                <div aria-hidden="true" className="absolute inset-x-0 top-[60%] border-t border-dashed border-white/[0.05]" />

                <svg
                  key={period}
                  viewBox={`0 0 ${areaW} ${areaH}`}
                  preserveAspectRatio="none"
                  className="chart-reveal absolute inset-0 w-full h-full overflow-visible"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="areaLogged" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="areaApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#55cb98" stopOpacity="0.42" />
                      <stop offset="100%" stopColor="#55cb98" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={loggedArea.fill} fill="url(#areaLogged)" />
                  <path d={loggedArea.line} fill="none" stroke="rgba(203,213,225,0.38)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <path d={approvedArea.fill} fill="url(#areaApproved)" />
                  <path d={approvedArea.line} fill="none" stroke="#55cb98" strokeWidth="2.25" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  <line x1="0" y1={areaH} x2={areaW} y2={areaH} stroke="rgba(255,255,255,0.08)" vectorEffect="non-scaling-stroke" />
                </svg>

                {/* Columns: hover target, crosshair, points, numbers */}
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
                  {bars.map((b, idx) => {
                    const active = hoveredPoint === idx;
                    const topLogged = `${(areaY(b.val) / areaH) * 100}%`;
                    const topApproved = `${(areaY(b.approved) / areaH) * 100}%`;
                    return (
                      <div key={idx} className="relative h-full cursor-default" onMouseEnter={() => setHoveredPoint(idx)}>
                        <div
                          aria-hidden="true"
                          className={`absolute left-1/2 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-white/0 to-white/20 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
                          style={{ top: topLogged }}
                        />
                        {b.val > 0 && (
                          <span
                            className={`absolute left-1/2 -translate-x-1/2 -translate-y-full -mt-2.5 text-xs tabular-nums transition-colors ${active || b.isCurrent ? 'text-slate-100' : 'text-slate-500'}`}
                            style={{ top: topLogged }}
                          >
                            {b.val}
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className={`absolute left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 border-2 border-[#121211] transition-opacity ${active || b.isCurrent ? 'opacity-100' : 'opacity-0'}`}
                          style={{ top: topLogged }}
                        />
                        <span
                          aria-hidden="true"
                          className={`absolute left-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 border-2 border-[#121211] transition-opacity ${active || b.isCurrent ? 'opacity-100' : 'opacity-0'}`}
                          style={{ top: topApproved }}
                        />
                        {active && (
                          <div
                            className={`absolute z-20 top-0 w-max px-3 py-2 rounded-lg bg-[#1b1b1a] border border-white/[0.1] shadow-lg text-xs tabular-nums pointer-events-none ${
                              idx >= bars.length - 2 ? 'right-1/2 mr-3' : 'left-1/2 ml-3'
                            }`}
                          >
                            <div className="text-slate-400 mb-1">{b.label}</div>
                            <div className="flex items-center gap-1.5 text-slate-100"><span className="w-1.5 h-1.5 rounded-full bg-slate-300" />{b.val} logged</div>
                            <div className="flex items-center gap-1.5 text-slate-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{b.approved} approved</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid pt-3" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
                {bars.map((b, idx) => (
                  <span
                    key={idx}
                    className={`text-center text-xs transition-colors ${b.isCurrent || hoveredPoint === idx ? 'text-slate-100' : 'text-slate-500'}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Meta Stats */}
            <div className="relative z-10 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-4 text-xs">
              <div className="py-1 text-left">
                <span className="text-xs text-slate-500 block">Peak day</span>
                <span className="text-sm font-medium text-slate-100 mt-0.5 block">{peakDayMeta.text}</span>
              </div>
              <div className="py-1 text-left pl-4 border-l border-white/[0.06]">
                <span className="text-xs text-slate-500 block">Approval rate</span>
                <span className="text-sm font-medium text-slate-100 mt-0.5 block tabular-nums">{myTurnaroundRate}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Personal Focus & To-Do Hub (4 cols) - Height strictly matched to My Creative Velocity */}
          <div
            className="lg:col-span-4 min-h-0 flex flex-col"
            style={isDesktop && velocityHeight ? { height: `${velocityHeight}px`, maxHeight: `${velocityHeight}px` } : undefined}
          >
            <TodoListWidget userId={currentProfileId} />
          </div>
        </div>

        {/* Secondary KPI Matrix (Personal to this Designer) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {/* Tile 1: Today's Created */}
          <div className="bento-card p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400">Today's output</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-medium text-white font-display tabular-nums">{myTodayDone}</span>
                <span className="text-xs text-slate-400 font-normal">{myTodayDone === 1 ? 'deliverable' : 'deliverables'}</span>
              </div>
              <p className="text-xs text-slate-500">Logged by you today</p>
            </div>
          </div>

          {/* Tile 2: Deep Work Time */}
          <div className="bento-card p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-slate-400">Focused time</span>
                {myRunningTimers.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-beacon" />
                )}
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-medium text-white font-display tabular-nums">
                  {formatWorkEntryStopwatch(myTotalTimeSeconds)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {myRunningTimers.length > 0 ? `${myRunningTimers.length} timer running` : 'No timer running'}
              </p>
            </div>
          </div>

          {/* Tile 3: Active Client Brands */}
          <Link
            href="/clients"
            className="bento-card bento-card-hover p-4 sm:p-5 flex items-center justify-between group cursor-pointer"
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400">Clients this week</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-medium text-white font-display tabular-nums">{myActiveClientsCount}</span>
                <span className="text-xs text-slate-400 font-normal">{myActiveClientsCount === 1 ? 'brand' : 'brands'}</span>
              </div>
              <p className="text-xs text-slate-500 group-hover:text-slate-200 transition-colors flex items-center space-x-1">
                <span>View directory</span>
                <ArrowUpRight className="w-3 h-3" />
              </p>
            </div>
          </Link>
        </div>

        {/* Pending Client Approvals Urgent Banner (If Any) */}
        {pendingApprovals.length > 0 && (
          <div className="bento-card p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex items-center space-x-3">
                <div>
                  <div className="flex items-baseline space-x-2">
                    <h3 className="text-sm sm:text-base font-medium text-slate-100">Waiting for client sign-off</h3>
                    <span className="text-sm text-slate-500 tabular-nums">{pendingApprovals.length}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    From earlier days, oldest first
                  </p>
                </div>
              </div>

              <Link
                href="/work?view=pending"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-50 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] rounded-lg transition-colors self-start sm:self-center btn-tactile"
              >
                <span>Full queue</span>
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
                    className="p-4 rounded-xl bg-[#131312] border border-white/[0.06] hover:border-white/[0.12] flex flex-col justify-between space-y-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400 truncate">{entry.client?.name || 'Client'}</span>
                        <span className={`shrink-0 tabular-nums ${daysAgo >= 3 ? urgency.text : 'text-slate-500'}`}>
                          {urgency.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-100 line-clamp-1">{entry.description}</p>
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 text-slate-300 tabular-nums">
                        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {unapproved} pending
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedApprovalEntry(entry)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors btn-tactile cursor-pointer"
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

        {/* Operations Hub: Deliverables Transaction Stream (Full Width) */}
        <div className="bento-card p-5 sm:p-6 space-y-4">
            {/* Header with Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-white/[0.07] pb-4">
              <div className="flex items-center space-x-3 min-w-0 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-sm sm:text-base font-medium text-slate-100 whitespace-nowrap">
                      Logged today
                    </h2>
                    {myRunningTimers.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 tabular-nums shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-beacon" />
                        <span>{myRunningTimers.length} running</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Deliverables and timers from you and the team</p>
                </div>
              </div>

              {/* Filter Tabs: Team Work and My Work with Smooth Gliding Pill */}
              <SlideTabs
                options={[
                  { id: 'team_work', label: `Team (${todayEntries.length})` },
                  { id: 'my_work', label: `Mine (${myTodayEntries.length})` },
                ]}
                value={feedFilter}
                onChange={(val) => setFeedFilter(val as FeedFilterTab)}
                size="sm"
                fullWidth={false}
                className="shrink-0 sm:ml-auto p-0.5"
              />
            </div>

            {/* Transaction Rows List */}
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <OrbitLoader size="md" text="Syncing deliverable feed..." />
              </div>
            ) : filteredFeed.length === 0 ? (
              <div className="p-10 text-center space-y-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <p className="text-sm text-slate-400">
                  Nothing logged here yet today
                </p>
                <Link
                  href="/work/new"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors btn-tactile"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log work</span>
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
                      className={`relative p-3.5 sm:p-4 rounded-xl border transition duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden ${
                        isTimerRunning
                          ? 'bg-[#161614] border-white/[0.12]'
                          : 'bg-[#131312] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#181817]'
                      }`}
                    >
                      {/* Left Status Accent Bar */}
                      <span
                        className={`absolute left-0 inset-y-0 w-1 rounded-l-xl ${
                          isTimerRunning
                            ? 'bg-amber-400'
                            : entry.quantity_approved === entry.quantity_done
                            ? 'bg-emerald-400/70'
                            : 'bg-white/[0.08]'
                        }`}
                      />

                      {/* Left Side: Avatar squircle + Info */}
                      <div className="flex items-center space-x-3.5 min-w-0 pl-1">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0">
                          {initials}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-100 truncate">{entry.description}</span>
                            {entry.work_type && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                                {entry.work_type.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                            <span className="font-medium text-slate-300">{clientName}</span>
                            <span aria-hidden="true">·</span>
                            <span>{entry.profile?.name || (isMyEntry ? currentUser.name : 'Designer')}</span>
                            {isTimerRunning && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1.5 text-amber-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-beacon" />
                                  <span>Timer running</span>
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
                          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0c0c0b] border border-white/[0.08] font-display tabular-nums text-xs font-medium text-slate-200 tabular-nums">
                            <Clock className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-amber-400 animate-spin-slow' : 'text-slate-400'}`} />
                            <span>{formatWorkEntryStopwatch(liveSeconds)}</span>
                          </div>
                        )}

                        {/* Approval Status Pill */}
                        {isMyEntry ? (
                          <button
                            type="button"
                            onClick={() => setSelectedApprovalEntry(entry)}
                            title="Update approval"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-300 hover:text-white border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04] transition-colors cursor-pointer btn-tactile tabular-nums"
                          >
                            <span
                              aria-hidden="true"
                              className={`w-1.5 h-1.5 rounded-full ${entry.quantity_approved === entry.quantity_done ? 'bg-emerald-400' : 'bg-amber-400'}`}
                            />
                            {entry.quantity_approved === entry.quantity_done
                              ? 'Approved'
                              : entry.quantity_approved > 0
                              ? `${entry.quantity_approved} of ${entry.quantity_done} approved`
                              : 'Pending'}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 tabular-nums">
                            <span
                              aria-hidden="true"
                              className={`w-1.5 h-1.5 rounded-full ${entry.quantity_approved > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                            />
                            {entry.quantity_approved > 0 ? 'Approved' : 'Pending'}
                          </span>
                        )}

                        {/* Timer Control Button */}
                        {isMyEntry && (
                          <button
                            type="button"
                            disabled={timerLoadingId === entry.id}
                            onClick={() => (isTimerRunning ? handleStopTimer(entry) : handleStartTimer(entry))}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition btn-tactile cursor-pointer ${
                              isTimerRunning
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                                : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08]'
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
          showToast('Approval updated', 'success');
        }}
      />
    </div>
  );
}
