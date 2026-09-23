'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { getWeeklyReportData, getVelocityWeekRange, WeeklyUserSummary } from '@/lib/services/reports';
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
import { QuickApprovalModal } from '@/components/work/QuickApprovalModal';
import { OrbitLoader } from '@/components/ui/OrbitLoader';
import { useToast } from '@/components/ui/ToastContext';

export default function AdminDashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEntries, setTodayEntries] = useState<WorkEntryWithDetails[]>([]);
  const [weeklyReportData, setWeeklyReportData] = useState<WeeklyUserSummary[]>([]);
  const [weekRange, setWeekRange] = useState({ startDate: '', endDate: '' });
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
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
      const week = getVelocityWeekRange(new Date());
      setWeekRange({ startDate: week.startDate, endDate: week.endDate });

      const [tEntries, wData, profList, pendingList] = await Promise.all([
        fetchWorkEntriesByDate(todayStr),
        getWeeklyReportData(week.startDate, week.endDate),
        fetchProfiles(),
        fetchPendingApprovalEntries(),
      ]);

      setTodayEntries(tEntries);
      setWeeklyReportData(wData);
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



  // If unauthorized or checking credentials, prevent any dashboard rendering
  if (isAuthorized !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] p-4">
        <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-sm mx-auto">
          <OrbitLoader
            size="lg"
            text="Verifying Administrator Authorization..."
            subtitle="Restricted executive area. Validating access credentials."
          />
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

  // ==========================================
  // REAL TEAM DATA & SPLINE METRICS ACROSS ALL DESIGNERS
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

  // Team daily counts across all designers
  const teamDailyCounts = useMemo(() => {
    return realWeekDates.map(wd => {
      let daySum = 0;
      weeklyReportData.forEach(userSummary => {
        const uCount = userSummary.entries
          .filter(e => e.work_date === wd.dateStr)
          .reduce((acc, curr) => acc + curr.quantity_done, 0);
        daySum += uCount;
      });
      if (wd.isToday && daySum === 0 && todayCreated > 0) {
        return todayCreated;
      }
      return daySum;
    });
  }, [realWeekDates, weeklyReportData, todayCreated]);

  // Peak output day across the whole agency
  const teamPeakDayMeta = useMemo(() => {
    if (teamDailyCounts.length === 0 || weekSummary.totalCreated === 0) {
      return { label: 'Active', count: 0, text: 'No work logged yet' };
    }
    let max = -1;
    let maxIdx = 0;
    teamDailyCounts.forEach((val, idx) => {
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
  }, [teamDailyCounts, weekSummary.totalCreated, realWeekDates]);

  // Team workdays daily average (divided by 5 working days)
  const teamDailyAverage = useMemo(() => {
    return (Math.round((weekSummary.totalCreated / 5) * 10) / 10).toFixed(1);
  }, [weekSummary.totalCreated]);

  // Spline points for Team Velocity
  const svgWidth = 560;
  const svgHeight = 120;
  const maxVal = Math.max(...teamDailyCounts, 8);
  const points = teamDailyCounts.map((val, idx) => {
    const x = (idx / Math.max(teamDailyCounts.length - 1, 1)) * (svgWidth - 48) + 24;
    const y = svgHeight - 22 - (val / maxVal) * (svgHeight - 44);
    return { x, y, val, label: realWeekDates[idx]?.label || '', isCurrent: realWeekDates[idx]?.isToday };
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 sm:space-y-8 animate-fade-in-up">
        {/* Executive Header Banner */}
        <div className="bento-card bento-glow-subtle p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-950/70 text-violet-300 border border-violet-800/60 shadow-2xs">
                Executive Agency Console
              </span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2">
              Agency Operations & Deliverables Overview
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live oversight of agency creative production, active team workload, and client deliverable velocity.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl shadow-2xs transition-all btn-tactile cursor-pointer disabled:opacity-50"
              title="Refresh agency metrics"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Hero Bento Grid: Team Creative Velocity Spline + Circular Quality Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1: Team Creative Velocity & Output Spline (8 cols) */}
          <div className="lg:col-span-8 bento-card bento-card-hover bento-glow-subtle p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Team Creative Velocity</span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-xs">
                    <Users className="w-3 h-3" />
                    <span>All Agency Designers</span>
                  </span>
                </div>
                <div className="flex items-baseline space-x-3 mt-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold font-display text-slate-100 tracking-tight tabular-nums">
                    {weekSummary.totalCreated}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-400 font-medium">
                    deliverables logged across agency ({weekSummary.totalApproved} approved)
                  </span>
                </div>
              </div>

              <div className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-slate-300 self-start sm:self-center">
                This Week (Mon – Sun)
              </div>
            </div>

            {/* Interactive Real Team Data SVG Spline Wave Chart */}
            <div className="relative z-10 my-3 pt-3">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-28 sm:h-34 overflow-visible">
                <defs>
                  <linearGradient id="teamVelocitySplineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                    <stop offset="60%" stopColor="#a855f7" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#06080F" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="teamSplineStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                  <filter id="teamSplineGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.6" />
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
                    stroke="rgba(99,102,241,0.4)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Area under spline */}
                <path d={splineAreaPath} fill="url(#teamVelocitySplineGrad)" />

                {/* Main Spline Curve */}
                <path
                  d={splinePath}
                  fill="none"
                  stroke="url(#teamSplineStrokeGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  filter="url(#teamSplineGlowFilter)"
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
                      r={hoveredPoint === idx ? '6.5' : pt.isCurrent ? '5.5' : '4'}
                      className={`transition-all duration-200 ${
                        hoveredPoint === idx
                          ? 'fill-white stroke-indigo-500 stroke-2'
                          : pt.isCurrent
                          ? 'fill-indigo-400 stroke-[#06080F] stroke-2'
                          : 'fill-slate-400 stroke-[#06080F] stroke-1.5 hover:fill-indigo-300'
                      }`}
                    />
                    {hoveredPoint === idx && (
                      <g transform={`translate(${pt.x}, ${pt.y - 30})`}>
                        <rect x="-34" y="-13" width="68" height="22" rx="7" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                        <text x="0" y="2" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="bold">
                          {pt.val} items
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>

              {/* Day Labels Strip */}
              <div className="flex justify-between px-3 pt-1.5 text-[11px] font-bold text-slate-500">
                {points.map((pt, idx) => (
                  <span
                    key={idx}
                    className={`transition-colors cursor-pointer ${
                      pt.isCurrent
                        ? 'text-indigo-300 font-extrabold underline underline-offset-4 decoration-indigo-500'
                        : 'hover:text-slate-300'
                    }`}
                    onClick={() => setHoveredPoint(idx)}
                  >
                    {pt.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Meta Stats */}
            <div className="relative z-10 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Team Peak Velocity</span>
                <span className="text-xs font-bold text-slate-200 mt-0.5 block">{teamPeakDayMeta.text}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Approval Rating</span>
                <span className="text-xs font-bold text-emerald-400 mt-0.5 block">{weeklyApprovalRate}% On Schedule</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Team Daily Average</span>
                <span className="text-xs font-bold text-indigo-300 mt-0.5 block">~{teamDailyAverage} Outputs / Day</span>
              </div>
            </div>
          </div>

          {/* Card 2: Team Approval Rate Circular Gauge (4 cols) */}
          <div className="lg:col-span-4 bento-card bento-card-hover p-5 sm:p-7 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Agency Quality Sign-off</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Team-wide approval index</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-xs">
                Team Level
              </span>
            </div>

            {/* Circular Ring Meter */}
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center my-1">
              <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                <defs>
                  <linearGradient id="adminRingGlowGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="60%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <filter id="adminRingGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
                  </filter>
                </defs>

                <circle
                  cx="80"
                  cy="80"
                  r="58"
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="9"
                  fill="transparent"
                />

                {weeklyApprovalRate > 0 && (
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    stroke="url(#adminRingGlowGrad)"
                    strokeWidth="9"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={2 * Math.PI * 58 - (2 * Math.PI * 58 * Math.min(weeklyApprovalRate, 100)) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    filter="url(#adminRingGlow)"
                    className="transition-all duration-1000 ease-out"
                  />
                )}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                <span className="text-3xl sm:text-[32px] font-black font-display text-slate-100 tracking-tight tabular-nums leading-none">
                  {weeklyApprovalRate}%
                </span>
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-2">
                  Team Approval
                </span>
              </div>
            </div>

            {/* Quality Breakdown */}
            <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  <span className="text-slate-300 font-medium">Approved Deliverables</span>
                </div>
                <span className="font-bold text-emerald-400 tabular-nums">{weekSummary.totalApproved} items</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                  <span className="text-slate-300 font-medium">In Review / Pending</span>
                </div>
                <span className="font-bold text-amber-400 tabular-nums">{Math.max(0, weekSummary.totalCreated - weekSummary.totalApproved)} items</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  <span className="text-slate-300 font-medium">Active Designers</span>
                </div>
                <span className="font-bold text-indigo-300 tabular-nums">{activeTodayDesignerIds.size} logged today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top 4 KPI Metrics - Bento Matrix */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Today's Team Output */}
          <div className="bento-card bento-card-hover p-4 sm:p-5 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider truncate">Today Output</span>
              <div className="w-7 h-7 rounded-lg bg-violet-600/15 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display leading-none">{todayCreated}</span>
              <span className="text-[10px] sm:text-xs font-bold text-violet-400 truncate">({todayApproved} app.)</span>
            </div>
            <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-500">Active</span>
              <span className="font-bold text-violet-400">
                {activeTodayDesignerIds.size} designers
              </span>
            </div>
          </div>

          {/* Card 2: Weekly Production */}
          <div className="bento-card bento-card-hover p-4 sm:p-5 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider truncate">Weekly Output</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display leading-none">{weekSummary.totalCreated}</span>
              <span className="text-[10px] sm:text-xs font-bold text-violet-400 truncate">({weekSummary.totalApproved} app.)</span>
            </div>
            <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-500">Approval</span>
              <span className="font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                {weeklyApprovalRate}%
              </span>
            </div>
          </div>

          {/* Card 3: Total Deliverable Time */}
          <div className="bento-card bento-card-hover p-4 sm:p-5 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider truncate">Logged Time</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono leading-none">
                {formatWorkEntryDuration(todaySeconds)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 truncate">today</span>
            </div>
            <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-500">Week</span>
              <span className="font-bold text-slate-300 truncate">
                {formatWorkEntryDuration(weekSummary.totalSeconds)}
              </span>
            </div>
          </div>

          {/* Card 4: Active Clients */}
          <div className="bento-card bento-card-hover p-4 sm:p-5 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider truncate">Active Clients</span>
              <div className="w-7 h-7 rounded-lg bg-violet-600/15 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display leading-none">{weekSummary.activeClients}</span>
              <span className="text-[10px] sm:text-xs text-slate-500 truncate">brands</span>
            </div>
            <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] sm:text-xs">
              <Link href="/clients" className="text-violet-400 hover:text-violet-300 font-bold inline-flex items-center space-x-0.5">
                <span>Directory</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
              <span className="text-slate-500">This week</span>
            </div>
          </div>
        </div>

        {/* Live Team Workload Status Bar */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-bold text-slate-100">Creative Team Workload & Live Status</h2>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeNowDesignerIds.size} live working now</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{profiles.length} total team designers</span>
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
                      ? 'bg-emerald-950/30 border-emerald-600/50 shadow-xs ring-1 ring-emerald-500/30'
                      : hasLoggedToday
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${
                        isWorkingNow
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : hasLoggedToday
                          ? 'bg-violet-950/80 text-violet-300 border border-violet-800/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 leading-tight">{p.name}</h3>
                        <p className="text-[11px] text-slate-400 leading-tight">{p.designation || 'Designer'}</p>
                      </div>
                    </div>

                    {isWorkingNow ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>LIVE</span>
                      </span>
                    ) : hasLoggedToday ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-950/70 text-violet-300 border border-violet-800/60">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Idle
                      </span>
                    )}
                  </div>

                  {/* Active Task or Daily Stats */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-xs">
                    {isWorkingNow && activeTask ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-300 font-medium">
                          <span className="truncate max-w-[140px]">{activeTask.client?.name || 'Task'}</span>
                          <span className="font-mono font-bold">
                            {formatWorkEntryStopwatch(calculateWorkEntrySeconds(activeTask, nowMs))}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{activeTask.description}</p>
                      </div>
                    ) : hasLoggedToday ? (
                      <div className="flex items-center justify-between text-slate-300 text-[11px]">
                        <span>Today: <strong className="text-slate-100">{designerTodayCount} done</strong></span>
                        <span className="text-violet-400 font-bold">{designerApprovedCount} approved</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">No tasks logged yet today</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 rounded-xl bg-amber-500 text-slate-950 shadow-sm ring-4 ring-amber-950/50">
                    <Hourglass className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h2 className="text-lg font-bold text-slate-100">
                        Agency Pending Client Approvals Queue
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-900/60 text-amber-300 border border-amber-700/60">
                        {totalUnapproved} deliverables ({agencyPendingEntries.length} tasks)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Deliverables awaiting client sign-off across {uniqueClients} {uniqueClients === 1 ? 'client' : 'clients'}. When client confirms, approve in 1-click without searching historical dates.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Link
                    href="/work?view=pending"
                    className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/60 rounded-xl transition-all shadow-2xs"
                  >
                    <span>Open Full Agency Queue</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Urgency Status Indicators */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Breakdown:</span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Fresh (≤4d): {freshCount}</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/60 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Follow-up (5-7d): {followupCount}</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/60 font-semibold text-[11px]">
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
                      className="bg-slate-900/90 backdrop-blur-xs p-3.5 rounded-xl border border-slate-800 hover:border-amber-500/50 shadow-2xs transition-all flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-violet-950/70 text-violet-300 border border-violet-800/60 text-[10px] font-bold truncate max-w-[120px]">
                            By {entry.profile?.name || 'Designer'}
                          </span>
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgency.bg} ${urgency.text} ${urgency.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
                            <span>{urgency.label}</span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 text-[11px] font-bold text-slate-300 truncate">
                          <Building2 className="w-3 h-3 text-violet-400 shrink-0" />
                          <span className="truncate">{entry.client?.name || 'Client'}</span>
                        </div>

                        <p className="text-xs font-semibold text-slate-200 line-clamp-2" title={entry.description}>
                          {entry.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <div className="text-[11px] text-slate-400">
                          <span className="font-medium text-slate-300">📅 {formattedDate}</span>
                          <span className="mx-1 text-slate-600">•</span>
                          <span className="font-bold text-amber-400">{unapproved} left</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedApprovalEntry(entry)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-violet-300 bg-violet-950/60 hover:bg-violet-900/80 border border-violet-800/60 rounded-lg shadow-2xs transition-all cursor-pointer"
                        >
                          <CheckCheck className="w-3 h-3 text-violet-400" />
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left: Agency Today's Deliverables Stream (8 Cols) */}
          <div className="lg:col-span-8 bento-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Today's Agency Deliverables Feed</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live feed of all design deliverables produced across the agency today.
                </p>
              </div>
              <Link
                href="/work"
                className="text-xs font-bold text-violet-400 hover:text-violet-300 inline-flex items-center space-x-1"
              >
                <span>View Full Team Log</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <OrbitLoader
                  size="md"
                  text="Streaming agency deliverables..."
                  subtitle="Synchronizing today's team output"
                />
              </div>
            ) : todayEntries.length === 0 ? (
              <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-400">No deliverables recorded yet today</p>
                <p className="text-xs text-slate-500 mt-1">
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
                          ? 'bg-emerald-950/30 border-l-4 border-l-emerald-500 border-slate-800'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-bold text-[11px]">
                            By {entry.profile?.name || 'Designer'}
                          </span>
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-violet-950/70 text-violet-300 border border-violet-800/60 font-extrabold text-[11px]">
                            <Building2 className="w-3 h-3 text-violet-400" />
                            <span>{entry.client?.name || 'Client'}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[11px]">
                            {entry.work_type?.name || 'Work'}
                          </span>

                          {entry.timer_started_at && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-mono">{formatWorkEntryStopwatch(calculateWorkEntrySeconds(entry, nowMs))}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-slate-200 font-medium text-xs sm:text-sm">{entry.description}</p>

                        {(entry.project_url || entry.best_work_url) && (
                          <a
                            href={entry.project_url || entry.best_work_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-violet-400 hover:text-violet-300 font-semibold underline text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Project URL</span>
                          </a>
                        )}
                      </div>

                      {/* Right: Quantities & Quick Approval Stepper Trigger */}
                      <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <div className="text-right text-xs">
                          <div className="text-slate-400">
                            Done: <strong className="text-slate-100">{entry.quantity_done}</strong>
                          </div>
                          <div className="text-slate-400">
                            Approved: <strong className="text-violet-400">{entry.quantity_approved}</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedApprovalEntry(entry)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all cursor-pointer shadow-2xs ${
                            isApproved
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/80'
                              : hasPartial
                              ? 'bg-amber-950/70 text-amber-300 border-amber-800/60 hover:bg-amber-900/80'
                              : 'bg-rose-950/70 text-rose-300 border-rose-800/60 hover:bg-rose-900/80'
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
            <div className="bento-card p-6 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
                Executive Agency Controls
              </h2>

              <div className="space-y-2">
                <Link
                  href="/work?view=pending"
                  className="flex items-center justify-between p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 hover:border-amber-500/60 hover:bg-amber-950/40 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-900/60 text-amber-300 group-hover:bg-amber-800/60">
                      <Hourglass className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-xs font-bold text-slate-200 leading-tight">Pending Client Approvals</h3>
                        {agencyPendingEntries.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-900/80 text-amber-300 border border-amber-700/60">
                            {agencyPendingEntries.length}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">Zero-date-hunting approval queue</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </Link>

                <Link
                  href="/reports/billing"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-amber-500/50 hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-950/70 text-amber-400 border border-amber-800/50 group-hover:bg-amber-900/60">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-200 leading-tight">Client Time & Invoicing</h3>
                      <p className="text-[11px] text-slate-400">Audit billable client hours</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </Link>

                <Link
                  href="/reports/weekly"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-violet-500/50 hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-violet-950/70 text-violet-400 border border-violet-800/50 group-hover:bg-violet-900/60">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-200 leading-tight">Weekly Team Review</h3>
                      <p className="text-[11px] text-slate-400">Weekly meeting deliverables</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400" />
                </Link>

                <Link
                  href="/reports/monthly"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-950/70 text-indigo-400 border border-indigo-800/50 group-hover:bg-indigo-900/60">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-200 leading-tight">Monthly Summary</h3>
                      <p className="text-[11px] text-slate-400">Agency output per month</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                </Link>

                <Link
                  href="/clients"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-950/70 text-indigo-400 border border-indigo-800/50 group-hover:bg-indigo-900/60">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-200 leading-tight">Clients Directory</h3>
                      <p className="text-[11px] text-slate-400">Manage brand accounts</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                </Link>

                <Link
                  href="/team"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-purple-500/50 hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-950/70 text-purple-400 border border-purple-800/50 group-hover:bg-purple-900/60">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-200 leading-tight">Team Management</h3>
                      <p className="text-[11px] text-slate-400">Roster & role designations</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400" />
                </Link>
              </div>
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
