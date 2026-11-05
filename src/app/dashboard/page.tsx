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

  const [greeting, setGreeting] = useState('Good day');
  const [subtitle, setSubtitle] = useState('Here is your personal creative velocity and activity overview.');

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
    <div className="min-h-screen flex flex-col bg-[#0a0a09] md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-7 animate-fade-in-up">
        {/* Top Utility Command Header (Personal Workspace) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="font-display text-2xl sm:text-[28px] leading-tight font-semibold text-slate-50">
                {greeting}, {currentUser.name}
              </h1>
              <Diya size={26} className="-mt-1" />
            </div>
            <p className="text-sm text-slate-400 font-normal">
              {subtitle}
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
                  <h2 className="text-sm font-semibold text-slate-200 font-sans tracking-normal">{chartMeta.displayTitle}</h2>
                </div>
                <div className="flex items-baseline space-x-3 mt-1.5">
                  <span className="text-4xl sm:text-[44px] leading-none font-semibold font-display text-white tabular-nums">
                    {myWeekTotalCreated}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-400 font-normal">
                    deliverables completed by you ({myWeekTotalApproved} approved)
                  </span>
                </div>
              </div>

              {/* Time Horizon Segmented Pill Selector with Smooth Gliding Pill */}
              <SlideTabs
                options={[
                  { id: 'weekly', label: 'This Week' },
                  { id: 'monthly', label: 'Monthly' },
                ]}
                value={period}
                onChange={(val) => setPeriod(val as HorizonPeriod)}
                size="xs"
                fullWidth={false}
                className="self-start sm:self-center p-0.5"
              />
            </div>

            {/* Interactive Real Data SVG Spline Wave Chart */}
            <div className="relative z-10 my-3 pt-3">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-28 sm:h-34 overflow-visible">
                <defs>
                  <linearGradient id="myVelocitySplineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#55cb98" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#55cb98" stopOpacity="0.0" />
                  </linearGradient>

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
                    stroke="rgba(85,203,152,0.3)"
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
                  stroke="#55cb98"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                />

                {/* Interactive Node Circles */}
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
                      r={hoveredPoint === idx ? '5.5' : pt.isCurrent ? '4.5' : '3.5'}
                      className={`transition-all duration-150 ${
                        hoveredPoint === idx
                          ? 'fill-white stroke-blue-500 stroke-2'
                          : pt.isCurrent
                          ? 'fill-blue-500 stroke-[#0c0c0b] stroke-2'
                          : 'fill-slate-500 stroke-[#0c0c0b] stroke-1.5 hover:fill-blue-400'
                      }`}
                    />
                    {/* Tooltip on Hover */}
                    {hoveredPoint === idx && (
                      <g transform={`translate(${pt.x}, ${pt.y - 30})`}>
                        <rect x="-32" y="-13" width="64" height="22" rx="6" fill="#1a1a19" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                        <text x="0" y="2" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="600">
                          {pt.val} items
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>

              {/* Day / Period Labels Strip */}
              <div className="flex justify-between px-3 pt-1.5 text-[11px] font-medium text-slate-400">
                {points.map((pt, idx) => (
                  <span
                    key={idx}
                    className={`transition-colors cursor-pointer ${
                      pt.isCurrent
                        ? 'text-slate-50 font-semibold'
                        : 'hover:text-slate-200'
                    }`}
                    onClick={() => setHoveredPoint(idx)}
                  >
                    {pt.label}
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
                <span className="text-sm font-medium text-emerald-400 mt-0.5 block">{myTurnaroundRate}</span>
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
          <div className="bento-card bento-card-hover p-4 sm:p-5 flex items-center justify-between group">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400">Today's output</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-semibold text-white font-display tabular-nums">{myTodayDone}</span>
                <span className="text-xs text-slate-400 font-normal">deliverables</span>
              </div>
              <p className="text-[11px] text-slate-500">Logged by you today</p>
            </div>
          </div>

          {/* Tile 2: Deep Work Time */}
          <div className="bento-card bento-card-hover p-4 sm:p-5 flex items-center justify-between group">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-slate-400">Focused time</span>
                {myRunningTimers.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-beacon" />
                )}
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-semibold text-emerald-400 font-display tabular-nums">
                  {formatWorkEntryStopwatch(myTotalTimeSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {myRunningTimers.length > 0 ? `${myRunningTimers.length} active stopwatch running` : 'Timers paused'}
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
                <span className="text-2xl sm:text-3xl font-semibold text-white font-display tabular-nums">{myActiveClientsCount}</span>
                <span className="text-xs text-slate-400 font-normal">brands serviced</span>
              </div>
              <p className="text-[11px] text-blue-400 font-medium group-hover:underline flex items-center space-x-1">
                <span>View directory</span>
                <ArrowUpRight className="w-3 h-3" />
              </p>
            </div>
          </Link>
        </div>

        {/* Pending Client Approvals Urgent Banner (If Any) */}
        {pendingApprovals.length > 0 && (
          <div className="bento-card p-5 sm:p-6 border-amber-500/35 bg-amber-950/15 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
              <div className="flex items-center space-x-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-100">Pending Client Sign-offs</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">
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

        {/* Operations Hub: Deliverables Transaction Stream (Full Width) */}
        <div className="bento-card p-5 sm:p-6 space-y-4">
            {/* Header with Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-white/[0.07] pb-4">
              <div className="flex items-center space-x-3 min-w-0 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-sm sm:text-base font-semibold text-slate-100 whitespace-nowrap">
                      Today's Deliverable Feed
                    </h2>
                    {myRunningTimers.length > 0 && (
                      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-beacon" />
                        <span>{myRunningTimers.length} running</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Live stream of creative outputs & focus sessions</p>
                </div>
              </div>

              {/* Filter Tabs: Team Work and My Work with Smooth Gliding Pill */}
              <SlideTabs
                options={[
                  { id: 'team_work', label: `Team (${todayEntries.length})` },
                  { id: 'my_work', label: `My Work (${myTodayEntries.length})` },
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
                <p className="text-xs text-slate-400 font-medium">
                  No deliverables logged in this view yet.
                </p>
                <Link
                  href="/work/new"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white webtree-gradient-btn rounded-xl shadow-xs btn-tactile"
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
                      className={`relative p-3.5 sm:p-4 rounded-xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden ${
                        isTimerRunning
                          ? 'bg-amber-950/20 border-amber-500/35 ring-1 ring-amber-500/20'
                          : 'bg-[#131312] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#181817]'
                      }`}
                    >
                      {/* Left Status Accent Bar */}
                      <span
                        className={`absolute left-0 inset-y-0 w-1 rounded-l-xl ${
                          isTimerRunning
                            ? 'bg-amber-400'
                            : entry.quantity_approved === entry.quantity_done
                            ? 'bg-emerald-400'
                            : 'bg-blue-500/40'
                        }`}
                      />

                      {/* Left Side: Avatar squircle + Info */}
                      <div className="flex items-center space-x-3.5 min-w-0 pl-1">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0">
                          {initials}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">{entry.description}</span>
                            {entry.work_type && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                                {entry.work_type.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                            <span className="font-medium text-slate-300">{clientName}</span>
                            <span>•</span>
                            <span>By {entry.profile?.name || (isMyEntry ? currentUser.name : 'Designer')}</span>
                            {isTimerRunning && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center space-x-1 text-amber-400 font-semibold">
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
                            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer btn-tactile ${
                              entry.quantity_approved === entry.quantity_done
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20'
                                : entry.quantity_approved > 0
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/25 hover:bg-blue-500/20'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/25 hover:bg-amber-500/20'
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
                            className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                              entry.quantity_approved > 0
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
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
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all btn-tactile cursor-pointer ${
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
          showToast('Deliverable approval updated!', 'success');
        }}
      />
    </div>
  );
}
