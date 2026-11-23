'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import {
  fetchWorkEntriesByDate,
  deleteWorkEntry,
  fetchProfiles,
  getLoggedInUser,
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
  dismissPendingApproval,
} from '@/lib/services/work-entry';
import { WorkEntryWithDetails, Profile } from '@/types';

import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  Building2,
  Mail,
  ChevronDown,
  Play,
  Square,
  Search,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { EmailDayLogModal } from '@/components/work/EmailDayLogModal';
import { SlideTabs } from '@/components/ui/SlideTabs';
import { cn } from '@/lib/utils';
import { QuickApprovalModal } from '@/components/work/QuickApprovalModal';
import { RichSelect } from '@/components/ui/RichSelect';
import { OrbitLoader } from '@/components/ui/OrbitLoader';
import { generateEmailTableHtml, generateCleanPlainText, copyToClipboardWithHtml } from '@/lib/services/email-formatter';
import { GreetingStrip } from '@/components/dashboard/GreetingStrip';
import { Snowman } from '@/components/ui/Snowman';

export default function MyWorkPage() {
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

  const todayStr = formatLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  // Default view: ONLY the logged-in user's entries (or all for admin)
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('my_work');
  const [entries, setEntries] = useState<WorkEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [timerLoadingId, setTimerLoadingId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedApprovalEntry, setSelectedApprovalEntry] = useState<WorkEntryWithDetails | null>(null);

  // Work View Mode: 'calendar' vs 'pending'
  const [workViewMode, setWorkViewMode] = useState<'calendar' | 'pending'>('calendar');
  const [pendingEntries, setPendingEntries] = useState<WorkEntryWithDetails[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingFilterUrgency, setPendingFilterUrgency] = useState<'all' | 'fresh' | 'attention' | 'overdue'>('all');

  // Check URL query on mount for ?view=pending
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'pending') {
        setWorkViewMode('pending');
      }
    }
  }, []);

  useEffect(() => {
    async function loadProfiles() {
      const pData = await fetchProfiles();
      setProfiles(pData);
      const user = getLoggedInUser();
      const admin = isAdminUser(user);
      setIsAdmin(admin);
      if (admin) {
        setSelectedUserFilter('all');
      }
      const current = user 
        ? (pData.find(p => p.name.toLowerCase() === user.name.toLowerCase()) || pData[0])
        : pData[0];
      if (current) setActiveProfile(current);
    }
    loadProfiles();
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const isMyWork = !isAdmin && selectedUserFilter === 'my_work';
      const userIdToFetch = isMyWork ? (activeProfile?.id || 'p1') : (selectedUserFilter === 'all' ? undefined : selectedUserFilter);
      const data = await fetchWorkEntriesByDate(selectedDate, userIdToFetch);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedUserFilter, activeProfile, isAdmin]);

  const loadPendingEntries = useCallback(async () => {
    setPendingLoading(true);
    try {
      const isMyWork = !isAdmin && selectedUserFilter === 'my_work';
      const userIdToFetch = isMyWork ? (activeProfile?.id || 'p1') : (selectedUserFilter === 'all' ? undefined : selectedUserFilter);
      const data = await fetchPendingApprovalEntries(userIdToFetch);
      setPendingEntries(data);
    } catch (err) {
      console.error('Failed to load pending entries:', err);
    } finally {
      setPendingLoading(false);
    }
  }, [selectedUserFilter, activeProfile, isAdmin]);

  useEffect(() => {
    loadEntries();
    loadPendingEntries();
  }, [loadEntries, loadPendingEntries]);

  // Background polling every 5s so all team members' active timers appear live in real-time
  useEffect(() => {
    // Every 20s, only while this tab is visible (keeps the database connection pool free)
    const pollTimer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const userIdToFetch = selectedUserFilter === 'my_work' ? (activeProfile?.id || 'p1') : (selectedUserFilter === 'all' ? undefined : selectedUserFilter);
        const data = await fetchWorkEntriesByDate(selectedDate, userIdToFetch);
        setEntries(data);
      } catch (e) {}
    }, 20000);

    return () => clearInterval(pollTimer);
  }, [selectedDate, selectedUserFilter, activeProfile]);
  const formatDisplayDate = (str: string) => {
    if (!str) return '';
    const d = parseLocalDate(str);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const handleDateChange = (daysDelta: number) => {
    const current = parseLocalDate(selectedDate);
    current.setDate(current.getDate() + daysDelta);
    const nextStr = formatLocalDate(current);
    setSelectedDate(nextStr);
    setViewDate(current);
  };

  const getDateDisplayLabel = (str: string) => {
    if (!str) return 'Select Date';
    const d = parseLocalDate(str);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleMonthDelta = (months: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + months);
    setViewDate(next);
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
        key: `prev-${prevMonthTotalDays - i}`,
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i, 12, 0, 0);
      daysArr.push({
        date: d,
        isCurrentMonth: true,
        key: `curr-${i}`,
      });
    }

    const remaining = (7 - (daysArr.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i, 12, 0, 0);
      daysArr.push({
        date: d,
        isCurrentMonth: false,
        key: `next-${i}`,
      });
    }

    return daysArr;
  };

  const handleSelectDate = (date: Date) => {
    const dateStr = formatLocalDate(date);
    setSelectedDate(dateStr);
    setViewDate(date);
    setIsCalendarOpen(false);
  };

  const { showToast, confirmDialog } = useToast();

  const handleDelete = (id: string) => {
    confirmDialog({
      title: 'Delete this entry?',
      message: 'It comes off your log and reports for good. This can’t be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setDeletingId(id);
        try {
          setEntries(prev => prev.filter(e => e.id !== id));
          await deleteWorkEntry(id);
          showToast('Entry deleted', 'success');
          await loadEntries();
        } catch (err) {
          setEntries(prev => prev.filter(e => e.id !== id));
          showToast('Work entry removed.', 'success');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleDismissPending = (entry: WorkEntryWithDetails) => {
    confirmDialog({
      title: 'Remove from pending?',
      message: `“${entry.description}” leaves the pending list. Its time and count stay on your log.`,
      confirmText: 'Remove',
      variant: 'warning',
      onConfirm: async () => {
        setDismissingId(entry.id);
        try {
          await dismissPendingApproval(entry.id);
          setPendingEntries(prev => prev.filter(e => e.id !== entry.id));
          setEntries(prev =>
            prev.map(e =>
              e.id === entry.id
                ? {
                    ...e,
                    notes: e.notes ? `${e.notes} [DISMISSED_PENDING]` : '[DISMISSED_PENDING]',
                  }
                : e
            )
          );
          showToast('Removed from pending', 'success');
        } catch (err: any) {
          showToast('Failed to dismiss item. Please try again.', 'error');
        } finally {
          setDismissingId(null);
        }
      },
    });
  };

  // Real-time interval ticking whenever at least one work entry timer is actively running
  const hasRunningTimer = entries.some(e => Boolean(e.timer_started_at));
  useEffect(() => {
    if (!hasRunningTimer) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [hasRunningTimer]);

  // Sync state when PiP or other components pause/start timers
  useEffect(() => {
    const handleTimerAction = (detail: any) => {
      const { id, entry, action } = detail || {};
      if (id) {
        if (action === 'stop') {
          setEntries(prev =>
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
          setEntries(prev => prev.map(item => (item.id === id ? { ...item, ...entry } : item)));
        }
      } else {
        loadEntries();
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
    if (!activeProfile) return;
    setTimerLoadingId(entry.id);
    const nowIso = new Date().toISOString();
    const activeEntry = { ...entry, timer_started_at: nowIso };

    // Directly open Picture-in-Picture window using user click gesture
    if (typeof window !== 'undefined') {
      window.designOrbitPipManager?.openPip(activeEntry).catch(() => {});
    }

    // Optimistic state: start this timer immediately in local state & PiP
    setEntries(prev =>
      prev.map(e => (e.id === entry.id ? activeEntry : e))
    );

    dispatchGlobalTimerEvent({
      id: entry.id,
      action: 'start',
      entry: activeEntry,
    });

    try {
      const updated = await startWorkEntryTimer(entry.id, entries, activeProfile.id);
      setEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, ...updated } : e)));
    } catch (err: any) {
      showToast(err.message || 'Failed to start timer', 'error');
      loadEntries();
    } finally {
      setTimerLoadingId(null);
    }
  };

  const handleStopTimer = async (entry: WorkEntryWithDetails) => {
    if (!activeProfile) return;
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

    // Optimistic state: immediately mark stopped in local page state
    setEntries(prev =>
      prev.map(e =>
        e.id === entry.id
          ? { ...e, timer_started_at: null, time_spent_seconds: newTotal }
          : e
      )
    );

    // Immediately dispatch stop event across PiP and all windows without waiting for DB network call
    dispatchGlobalTimerEvent({
      id: entry.id,
      action: 'stop',
      entry: { ...entry, timer_started_at: null, time_spent_seconds: newTotal },
    });

    try {
      const updated = await stopWorkEntryTimer(entry.id, entry, activeProfile.id, 'stop');
      setEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, ...updated } : e)));
      showToast(`Timer stopped · ${formatWorkEntryDuration(newTotal)} saved`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to stop timer', 'error');
      loadEntries();
    } finally {
      setTimerLoadingId(null);
    }
  };

  const handleQuickCopy = async () => {
    if (entries.length === 0) {
      showToast('No entries to copy.', 'error');
      return;
    }

    const designerName = activeProfile?.name || 'Gajesh';
    const tableHtml = generateEmailTableHtml(entries, designerName, selectedDate);
    const plainText = generateCleanPlainText(entries, designerName, selectedDate);

    const success = await copyToClipboardWithHtml(tableHtml, plainText);
    if (success) {
      showToast('Copied formatted email summary! Paste directly into Gmail or Outlook.', 'success');
    } else {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const totalDone = entries.reduce((acc, curr) => acc + curr.quantity_done, 0);
  const totalApproved = entries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
  const totalTrackedSeconds = entries.reduce((acc, curr) => acc + calculateWorkEntrySeconds(curr, nowMs), 0);
  const activeTimersCount = entries.filter(e => Boolean(e.timer_started_at)).length;

  // Filtered Pending Approvals for Queue Mode
  const filteredPendingEntries = pendingEntries.filter(entry => {
    const q = pendingSearch.trim().toLowerCase();
    if (q) {
      const clientMatch = entry.client?.name?.toLowerCase().includes(q);
      const descMatch = entry.description?.toLowerCase().includes(q);
      const typeMatch = entry.work_type?.name?.toLowerCase().includes(q);
      const designerMatch = entry.profile?.name?.toLowerCase().includes(q);
      if (!clientMatch && !descMatch && !typeMatch && !designerMatch) return false;
    }

    if (pendingFilterUrgency !== 'all') {
      const daysAgo = getPendingDaysAgo(entry.work_date);
      if (pendingFilterUrgency === 'fresh' && daysAgo > 4) return false;
      if (pendingFilterUrgency === 'attention' && (daysAgo < 5 || daysAgo > 7)) return false;
      if (pendingFilterUrgency === 'overdue' && daysAgo < 8) return false;
    }

    return true;
  });

  const freshPendingCount = pendingEntries.filter(e => getPendingDaysAgo(e.work_date) <= 4).length;
  const attentionPendingCount = pendingEntries.filter(e => {
    const d = getPendingDaysAgo(e.work_date);
    return d >= 5 && d <= 7;
  }).length;
  const overduePendingCount = pendingEntries.filter(e => getPendingDaysAgo(e.work_date) > 7).length;

  const totalPendingDone = filteredPendingEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
  const totalPendingApproved = filteredPendingEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
  const totalPendingWaiting = totalPendingDone - totalPendingApproved;

  return (
    <div className="min-h-screen flex flex-col md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <Navbar userName={activeProfile?.name || 'Gajesh'} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* For the team the greeting tile is the page header; admins keep the plain title */}
        {!isAdmin && <GreetingStrip eyebrow={selectedUserFilter === 'my_work' ? 'My log' : 'Team log'} />}

        {/* Header & Main Actions */}
        {(isAdmin || (selectedUserFilter === 'my_work' && entries.length > 0)) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {isAdmin && (
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              {isAdmin ? 'Team log' : (selectedUserFilter === 'my_work' ? 'My log' : 'Team log')}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {isAdmin
                ? 'Everything the creative team logged'
                : (selectedUserFilter === 'my_work'
                  ? `Logged by ${activeProfile?.name || 'you'}`
                  : 'Everything the team logged')}
            </p>
          </div>
          )}

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:ml-auto justify-end">
            {!isAdmin && selectedUserFilter === 'my_work' && entries.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="inline-flex items-center justify-center space-x-2 px-3.5 py-2 text-xs font-semibold text-slate-200 webtree-secondary-btn rounded-xl shadow-xs cursor-pointer"
                  title="Preview and format daily work log for email"
                >
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span>Email Day Log</span>
                </button>

                <button
                  onClick={handleQuickCopy}
                  className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-300 webtree-secondary-btn rounded-xl shadow-xs cursor-pointer"
                  title="Quick copy formatted email log to clipboard"
                >
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">Quick Copy</span>
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Primary View Mode Switcher: Daily Calendar vs Pending Approvals Queue */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          {/* Primary View Mode Switcher with Smooth Gliding Pill */}
          <div className="flex items-center w-full sm:w-auto">
          <SlideTabs
            options={[
              {
                id: 'calendar',
                label: (
                  <span>By date</span>
                ),
                icon: Calendar,
              },
              {
                id: 'pending',
                label: 'Pending',
                icon: CalendarClock,
                badge: pendingEntries.length > 0 ? (
                  <span
                    className={cn(
                      'text-xs font-normal tabular-nums shrink-0 text-slate-500'
                    )}
                  >
                    {pendingEntries.length}
                  </span>
                ) : null,
              },
            ]}
            value={workViewMode}
            onChange={(val) => setWorkViewMode(val as 'calendar' | 'pending')}
            size="md"
            fullWidth={false}
            className="bento-card p-1 gap-1 w-full sm:w-auto"
            pillClassName={cn(
              'rounded-lg transition duration-200',
              workViewMode === 'pending'
                ? 'bg-amber-500/20 border border-amber-500/35 text-amber-200 shadow-xs'
                : 'bg-white/[0.08] border border-white/[0.1] text-white shadow-xs'
            )}
          />
          {/* Snowman stands on the divider, right after the Pending tab */}
          <span className="relative hidden md:block w-16 self-stretch ml-2 shrink-0">
            <Snowman className="absolute left-0 bottom-[-15px]" />
          </span>
          </div>

          <span className="text-xs text-slate-400 font-normal hidden sm:inline">
            {workViewMode === 'pending'
              ? 'Deliverables awaiting client feedback • Direct approval without date hunting'
              : 'Pick a day to see its log'}
          </span>
        </div>

        {/* Primary Content: Daily Calendar View vs Pending Approvals Queue */}
        {workViewMode === 'calendar' ? (
          <>
            {/* View Toggle Bar & Date Selector */}
        <div className="bento-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* If Admin: show Team filter; Else: My Work vs Team Tabs */}
          {isAdmin ? (
            <div className="flex items-center space-x-2.5 w-full md:w-auto">
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 shrink-0">
                Team Work Log
              </span>
              <div className="w-60">
                <RichSelect
                  value={selectedUserFilter}
                  onChange={val => setSelectedUserFilter(val)}
                  options={[
                    { value: 'all', label: 'All Designers / Entire Team' },
                    ...profiles.filter(p => !isAdminUser(p)).map(p => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                  size="sm"
                  icon={<User className="w-3.5 h-3.5" />}
                  placeholder="Filter by Designer"
                />
              </div>
            </div>
          ) : (
            <SlideTabs
              options={[
                { id: 'my_work', label: 'Mine' },
                { id: 'all', label: 'Whole team' },
              ]}
              value={selectedUserFilter === 'my_work' ? 'my_work' : 'all'}
              onChange={(val) => setSelectedUserFilter(val)}
              size="sm"
              fullWidth={false}
              className="w-full md:w-auto p-1 bg-[#0c0c0b] border border-white/[0.08]"
              pillClassName="bg-white/[0.08] border border-white/[0.1] shadow-xs"
              activeTextClassName="text-white font-semibold"
            />
          )}

          {/* Date Selector & Designer Filter for non-admin */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 w-full md:w-auto">
            {!isAdmin && selectedUserFilter !== 'my_work' && (
              <div className="w-full sm:w-52">
                <RichSelect
                  value={selectedUserFilter}
                  onChange={val => setSelectedUserFilter(val)}
                  options={[
                    { value: 'all', label: 'All Designers / Team' },
                    ...profiles.map(p => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                  size="sm"
                  icon={<User className="w-3.5 h-3.5" />}
                  placeholder="Select Designer"
                />
              </div>
            )}

            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors shrink-0"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setViewDate(parseLocalDate(selectedDate));
                    setIsCalendarOpen(!isCalendarOpen);
                  }}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-slate-950/80 hover:bg-slate-800/80 rounded-lg border border-slate-700 hover:border-violet-500 shadow-2xs transition cursor-pointer text-xs group"
                  title="Click to choose a date"
                >
                  <Calendar className="w-4 h-4 text-violet-400 shrink-0 transition-transform" />
                  <span className="font-semibold text-slate-100">
                    {getDateDisplayLabel(selectedDate)}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-slate-300 transition-colors" />
                </button>

                {isCalendarOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsCalendarOpen(false)}
                    />
                    <div className="absolute left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 mt-2 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-4 w-[310px] sm:w-[330px] space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Calendar Month Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleMonthDelta(-1)}
                          className="p-1 rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-semibold text-slate-100 tracking-wide">
                          {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMonthDelta(1)}
                          className="p-1 rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Calendar Grid */}
                      <div className="space-y-1">
                        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-500 pb-1">
                          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {generateCalendarDays(viewDate).map((dayObj) => {
                            const dStr = formatLocalDate(dayObj.date);
                            const isSelected = dStr === selectedDate;
                            const isToday = dStr === todayStr;

                            return (
                              <button
                                key={dayObj.key}
                                type="button"
                                onClick={() => handleSelectDate(dayObj.date)}
                                className={`h-8 w-8 sm:h-8.5 sm:w-8.5 text-xs font-semibold rounded-lg flex items-center justify-center transition cursor-pointer relative ${
                                  !dayObj.isCurrentMonth ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:bg-slate-800'
                                } ${
                                  isSelected
                                    ? '!bg-violet-600 !text-white font-semibold !border-violet-500 shadow-sm'
                                    : ''
                                }`}
                              >
                                {dayObj.date.getDate()}
                                {isToday && !isSelected && (
                                  <span className="absolute bottom-1 w-1.5 h-1.5 bg-violet-500 rounded-full" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Quick Presets & Actions */}
                      <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date();
                              setSelectedDate(formatLocalDate(today));
                              setViewDate(today);
                              setIsCalendarOpen(false);
                            }}
                            className="px-2.5 py-1 text-violet-300 bg-violet-950/60 hover:bg-violet-900/80 rounded-md transition-colors cursor-pointer"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const yesterday = new Date();
                              yesterday.setDate(yesterday.getDate() - 1);
                              setSelectedDate(formatLocalDate(yesterday));
                              setViewDate(yesterday);
                              setIsCalendarOpen(false);
                            }}
                            className="px-2.5 py-1 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                          >
                            Yesterday
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCalendarOpen(false)}
                          className="px-2.5 py-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-xs"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => handleDateChange(1)}
                className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {selectedDate !== todayStr && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-2 py-1 text-xs font-semibold text-violet-300 bg-violet-950/70 rounded-md border border-violet-800/60 hover:bg-violet-900/80"
                >
                  Today
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Daily Summary Stat Tiles - Bento Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bento-card p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-400 truncate">Deliverables</div>
                <div className="text-xl sm:text-2xl font-medium text-slate-100 font-display tabular-nums">{totalDone}</div>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-normal hidden min-[400px]:inline shrink-0 tabular-nums">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
          </div>

          <div className="bento-card p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-400 truncate">Approved</div>
                <div className="text-xl sm:text-2xl font-medium text-slate-100 font-display tabular-nums">{totalApproved}</div>
              </div>
            </div>
            <span className="text-xs text-slate-500 tabular-nums shrink-0">
              {totalDone > 0 ? `${Math.round((totalApproved / totalDone) * 100)}%` : '0%'}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bento-card p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-400 truncate">Time tracked</div>
                <div className="text-lg sm:text-2xl font-medium text-slate-100 font-display tabular-nums">
                  {formatWorkEntryDuration(totalTrackedSeconds)}
                </div>
              </div>
            </div>
            <span className="text-xs text-slate-400 shrink-0 tabular-nums">
              {activeTimersCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-beacon inline-block" />
                  <span>{activeTimersCount} running</span>
                </span>
              ) : (
                <span className="text-slate-500 text-xs">None running</span>
              )}
            </span>
          </div>
        </div>

        {/* Work Entries Content */}
        {loading ? (
          <div className="bento-card p-12 text-center">
            <OrbitLoader
              size="md"
              text="Loading your log"
            />
          </div>
        ) : entries.length === 0 ? (
          <div className="bento-card p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-medium text-slate-100">Nothing logged for {formatDisplayDate(selectedDate)}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isAdmin || selectedUserFilter !== 'my_work'
                ? "Nobody on the team logged work this day"
                : "Entries you log for this day show up here"}
            </p>
            {!isAdmin && (
              <div className="pt-2">
                <Link
                  href="/work/new"
                  className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log work</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          (() => {
            // Group entries by Client Name
            const clientMap: Record<string, WorkEntryWithDetails[]> = {};
            entries.forEach(entry => {
              const clientName = entry.client?.name || 'General / Internal Work';
              if (!clientMap[clientName]) clientMap[clientName] = [];
              clientMap[clientName].push(entry);
            });

            const sortedClients = Object.keys(clientMap).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

            return (
              <div className="space-y-6">
                {sortedClients.map(clientName => {
                  const clientEntries = clientMap[clientName];
                  const clientDone = clientEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
                  const clientApproved = clientEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);

                  return (
                    <div key={clientName} className="bento-card overflow-hidden">
                      {/* Client header */}
                      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <h3 className="text-sm font-medium text-slate-100 truncate">{clientName}</h3>
                          <span className="text-xs text-slate-500 shrink-0">
                            {clientEntries.length} {clientEntries.length === 1 ? 'entry' : 'entries'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums shrink-0">
                          <span className="text-slate-300">{clientDone}</span> logged
                          <span className="mx-1.5 text-slate-700">·</span>
                          <span className={clientApproved > 0 ? 'text-emerald-400' : 'text-slate-300'}>{clientApproved}</span> approved
                        </div>
                      </div>

                      {/* Entries for this client */}
                      <div className="divide-y divide-white/[0.05]">
                        {clientEntries.map(entry => {
                          const isMyEntry = Boolean(
                            activeProfile && (
                              entry.user_id === activeProfile.id ||
                              (entry.profile && entry.profile.name.toLowerCase() === activeProfile.name.toLowerCase()) ||
                              (entry.profile && activeProfile.email && entry.profile.email && entry.profile.email.toLowerCase() === activeProfile.email.toLowerCase())
                            )
                          );
                          const isRunning = Boolean(entry.timer_started_at);
                          const trackedSeconds = calculateWorkEntrySeconds(entry, nowMs);
                          const link = entry.project_url || entry.best_work_url;
                          const inProgress = isInProgressEntry(entry);
                          const fullyApproved = entry.quantity_approved >= entry.quantity_done;
                          const approvalDot = fullyApproved
                            ? 'bg-emerald-400'
                            : entry.quantity_approved > 0
                              ? 'bg-emerald-400/50'
                              : 'bg-amber-400';
                          const approvalText = fullyApproved
                            ? entry.quantity_done === 1 ? 'Approved' : `All ${entry.quantity_done} approved`
                            : `${entry.quantity_approved} of ${entry.quantity_done} approved`;

                          return (
                            <div
                              key={entry.id}
                              className={`relative px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 transition-colors ${
                                isRunning ? 'bg-emerald-400/[0.03]' : 'hover:bg-white/[0.015]'
                              }`}
                            >
                              {isRunning && <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-emerald-400" />}

                              {/* What was done */}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-100 leading-snug">{entry.description}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                                  <span className="text-slate-400">{entry.work_type?.name || 'Work'}</span>
                                  {selectedUserFilter !== 'my_work' && entry.profile && (
                                    <>
                                      <span className="text-slate-700">·</span>
                                      <span>{entry.profile.name}</span>
                                    </>
                                  )}
                                  {!isRunning && trackedSeconds > 0 && (
                                    <>
                                      <span className="text-slate-700">·</span>
                                      <span className="tabular-nums" title="Time tracked">{formatWorkEntryDuration(trackedSeconds)}</span>
                                    </>
                                  )}
                                  {link && (
                                    <>
                                      <span className="text-slate-700">·</span>
                                      <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
                                        title={link}
                                      >
                                        Open link
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </>
                                  )}
                                </div>
                                {entry.notes && (
                                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{entry.notes}</p>
                                )}
                              </div>

                              {/* Status, timer, actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                {inProgress ? (
                                  <span className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs text-slate-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    Time only
                                  </span>
                                ) : isMyEntry || isAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedApprovalEntry(entry)}
                                    className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer tabular-nums"
                                    title="Update approved count"
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${approvalDot}`} />
                                    {approvalText}
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs text-slate-400 tabular-nums">
                                    <span className={`w-1.5 h-1.5 rounded-full ${approvalDot}`} />
                                    {approvalText}
                                  </span>
                                )}

                                {/* Timer */}
                                {isMyEntry ? (
                                  isRunning ? (
                                    <div className="flex items-center gap-1">
                                      <span className="inline-flex items-center gap-1.5 h-8 px-2 font-display text-sm text-emerald-300 tabular-nums">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-beacon" />
                                        {formatWorkEntryStopwatch(trackedSeconds)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleStopTimer(entry)}
                                        disabled={timerLoadingId === entry.id}
                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs text-slate-200 border border-white/[0.1] hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
                                        title="Stop the timer and save the time"
                                      >
                                        <Square className="w-2.5 h-2.5 fill-current" />
                                        Stop
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (typeof window !== 'undefined') {
                                            try {
                                              const opened = await window.designOrbitPipManager?.openPip(entry);
                                              if (!opened) {
                                                showToast('Could not open the floating timer. Allow popups for this site.', 'error');
                                              }
                                            } catch (err: any) {
                                              showToast(err.message || 'Could not open the floating timer', 'error');
                                            }
                                          }
                                        }}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                                        title="Pop out the timer"
                                        aria-label="Pop out the timer"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleStartTimer(entry)}
                                      disabled={timerLoadingId === entry.id}
                                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs text-emerald-300 border border-emerald-400/25 hover:bg-emerald-400/10 hover:text-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
                                      title="Start a timer for this entry"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                      Start
                                    </button>
                                  )
                                ) : (
                                  isRunning && (
                                    <span
                                      title={`${entry.profile?.name || 'A teammate'} is working on this now`}
                                      className="inline-flex items-center gap-1.5 h-8 px-2 font-display text-sm text-emerald-300 tabular-nums"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-beacon" />
                                      {formatWorkEntryStopwatch(trackedSeconds)}
                                    </span>
                                  )
                                )}

                                {/* Edit and delete, own entries only */}
                                {isMyEntry && (
                                  <div className="flex items-center ml-1 pl-2 border-l border-white/[0.06]">
                                    <Link
                                      href={`/work/${entry.id}`}
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
                                      title="Edit"
                                      aria-label="Edit entry"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Link>
                                    <button
                                      onClick={() => handleDelete(entry.id)}
                                      disabled={deletingId === entry.id}
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors disabled:opacity-50 cursor-pointer"
                                      title="Delete"
                                      aria-label="Delete entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
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
          </>
        ) : (
          /* Pending Approvals Queue Content */
          <div className="space-y-6">
            {/* Pending Approvals Control & Search Bar */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Designer Filter for Team/Admin or My Log tab */}
              {isAdmin ? (
                <div className="flex items-center space-x-2.5 w-full md:w-auto">
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/60 shadow-2xs shrink-0">
                    Pending Team Approvals
                  </span>
                  <div className="w-56">
                    <RichSelect
                      value={selectedUserFilter}
                      onChange={val => setSelectedUserFilter(val)}
                      options={[
                        { value: 'all', label: 'All Designers / Entire Team' },
                        ...profiles.filter(p => !isAdminUser(p)).map(p => ({
                          value: p.id,
                          label: p.name,
                        })),
                      ]}
                      size="sm"
                      icon={<User className="w-3.5 h-3.5" />}
                      placeholder="Filter by Designer"
                    />
                  </div>
                </div>
              ) : (
                <SlideTabs
                  options={[
                    { id: 'my_work', label: `My Pending (${activeProfile?.name || 'Gajesh'})` },
                    { id: 'all', label: 'Entire Team Pending' },
                  ]}
                  value={selectedUserFilter === 'my_work' ? 'my_work' : 'all'}
                  onChange={(val) => setSelectedUserFilter(val)}
                  size="sm"
                  fullWidth={false}
                  className="w-full md:w-auto p-1 bg-slate-950/80 border border-slate-800"
                  pillClassName="bg-slate-800 border border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  activeTextClassName="text-amber-400 font-semibold"
                />
              )}

              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={pendingSearch}
                  onChange={e => setPendingSearch(e.target.value)}
                  placeholder="Search client, task, designer..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-slate-950 transition"
                />
                {pendingSearch && (
                  <button
                    onClick={() => setPendingSearch('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Urgency Filter Chips & Pending Summary Tiles */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-semibold text-[11px] mr-1">Filter By Age:</span>
                <SlideTabs
                  options={[
                    { id: 'all', label: `All (${pendingEntries.length})` },
                    { id: 'fresh', label: `Fresh ≤4d (${freshPendingCount})` },
                    { id: 'attention', label: `Follow-up 5-7d (${attentionPendingCount})` },
                    { id: 'overdue', label: `Overdue >7d (${overduePendingCount})` },
                  ]}
                  value={pendingFilterUrgency}
                  onChange={(val) => setPendingFilterUrgency(val as 'all' | 'fresh' | 'attention' | 'overdue')}
                  size="sm"
                  fullWidth={false}
                  className="bg-slate-900 border border-slate-800 p-1"
                  pillClassName={cn(
                    'shadow-2xs transition duration-[480ms]',
                    pendingFilterUrgency === 'all' && 'bg-slate-100 border border-slate-100',
                    pendingFilterUrgency === 'fresh' && 'bg-emerald-600 border border-emerald-500',
                    pendingFilterUrgency === 'attention' && 'bg-amber-600 border border-amber-500',
                    pendingFilterUrgency === 'overdue' && 'bg-rose-600 border border-rose-500'
                  )}
                  activeTextClassName={pendingFilterUrgency === 'all' ? 'text-slate-950 font-semibold' : 'text-white font-semibold'}
                />
              </div>

              <div className="text-xs text-slate-400 font-medium">
                Waiting for sign-off: <strong className="text-amber-400 font-semibold">{totalPendingWaiting} item(s)</strong> across <strong className="text-slate-100 font-semibold">{filteredPendingEntries.length}</strong> task(s)
              </div>
            </div>

            {/* Pending Approvals Deliverables List */}
            {pendingLoading ? (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
                <OrbitLoader
                  size="md"
                  text="Loading pending work"
                />
              </div>
            ) : filteredPendingEntries.length === 0 ? (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-800/60">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-100">All Caught Up! No Pending Approvals</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {pendingSearch || pendingFilterUrgency !== 'all'
                    ? 'No pending approvals match your search filter criteria.'
                    : 'Every logged deliverable has received full client sign-off.'}
                </p>
                {(pendingSearch || pendingFilterUrgency !== 'all') && (
                  <button
                    onClick={() => {
                      setPendingSearch('');
                      setPendingFilterUrgency('all');
                    }}
                    className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              (() => {
                const pendingClientMap: Record<string, WorkEntryWithDetails[]> = {};
                filteredPendingEntries.forEach(entry => {
                  const clientName = entry.client?.name || 'General / Internal Work';
                  if (!pendingClientMap[clientName]) pendingClientMap[clientName] = [];
                  pendingClientMap[clientName].push(entry);
                });
                const sortedPendingClients = Object.keys(pendingClientMap).sort((a, b) =>
                  a.localeCompare(b, undefined, { sensitivity: 'base' })
                );

                return (
                  <div className="space-y-4">
                    {sortedPendingClients.map(clientName => {
                      const clientItems = pendingClientMap[clientName];
                      const clientDone = clientItems.reduce((acc, curr) => acc + curr.quantity_done, 0);
                      const clientApproved = clientItems.reduce((acc, curr) => acc + curr.quantity_approved, 0);

                      return (
                        <div
                          key={clientName}
                          className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden"
                        >
                          {/* Client Header */}
                          <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-2.5">
                              <h3 className="text-xs font-semibold text-slate-100">
                                {clientName}
                              </h3>
                              <span className="text-[11px] font-semibold text-amber-300 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded-full">
                                {clientItems.length} awaiting sign-off
                              </span>
                            </div>

                            <div className="flex items-center space-x-3 text-xs text-slate-400 font-semibold">
                              <span>Done: <strong className="text-slate-100">{clientDone}</strong></span>
                              <span className="text-slate-600">•</span>
                              <span>Approved: <strong className="text-violet-400">{clientApproved}</strong></span>
                              <span className="text-slate-600">•</span>
                              <span className="text-amber-400 font-semibold">Waiting: {clientDone - clientApproved}</span>
                            </div>
                          </div>

                          {/* Deliverable Items for this Client */}
                          <div className="divide-y divide-slate-800">
                            {clientItems.map(entry => {
                              const daysAgo = getPendingDaysAgo(entry.work_date);
                              const urgency = getPendingUrgency(daysAgo);

                              return (
                                <div
                                  key={entry.id}
                                  className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                                >
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {/* Original Work Date Tag */}
                                      <span className="font-semibold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[11px]">
                                        📅 {formatDisplayDate(entry.work_date)}
                                      </span>

                                      {/* Relative Urgency Age Badge */}
                                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${urgency.badgeBg} ${urgency.badgeText} ${urgency.badgeBorder}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${urgency.dotColor}`} />
                                        <span>{urgency.label}</span>
                                      </span>

                                      {/* Designer Tag */}
                                      <span className="px-2 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-800/60 font-semibold text-[11px]">
                                        By {entry.profile?.name || 'Designer'}
                                      </span>

                                      {/* Work Type */}
                                      <span className="px-2 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-800/60 font-semibold text-[11px]">
                                        {entry.work_type?.name || 'Work'}
                                      </span>
                                    </div>

                                    <p className="text-slate-100 font-medium text-xs sm:text-sm">{entry.description}</p>

                                    {(entry.project_url || entry.best_work_url) && (
                                      <div className="pt-0.5">
                                        <a
                                          href={entry.project_url || entry.best_work_url!}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center space-x-1 text-violet-400 hover:text-violet-300 font-semibold underline text-[11px]"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          <span>Project Link</span>
                                        </a>
                                      </div>
                                    )}

                                    {entry.notes && (
                                      <p className="text-[11px] text-slate-400 italic">
                                        Note: {entry.notes}
                                      </p>
                                    )}
                                  </div>

                                  {/* Right: Quantities & Actions */}
                                  {(() => {
                                    const isMyPending = Boolean(
                                      activeProfile?.id && (entry.user_id === activeProfile.id || entry.profile?.id === activeProfile.id)
                                    );
                                    const canManage = isMyPending || isAdmin;

                                    return (
                                      <div className="flex items-center space-x-3 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                                        <div className="text-right text-xs">
                                          <div className="text-slate-500 text-[11px] font-semibold">
                                            Done / Approved
                                          </div>
                                          <div className="text-sm font-semibold text-slate-100">
                                            {entry.quantity_done} <span className="text-slate-600 font-normal">/</span>{' '}
                                            <span className="text-violet-400">{entry.quantity_approved}</span>
                                          </div>
                                        </div>

                                        {canManage ? (
                                          <div className="flex items-center space-x-2">
                                            <button
                                              type="button"
                                              onClick={() => setSelectedApprovalEntry(entry)}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border shadow-2xs active:scale-95 cursor-pointer ${
                                                (entry.quantity_approved || 0) > 0
                                                  ? 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border-amber-800/60'
                                                  : 'bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border-rose-800/60'
                                              }`}
                                              title="Click to update approved count"
                                            >
                                              {(entry.quantity_approved || 0) > 0 ? (
                                                <>
                                                  <Check className="w-3.5 h-3.5 text-amber-400" />
                                                  <span>Partial ({entry.quantity_approved}/{entry.quantity_done})</span>
                                                  <span className="text-[10px] opacity-60">▾</span>
                                                </>
                                              ) : (
                                                <>
                                                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                                  <span>Approve</span>
                                                  <span className="text-[10px] opacity-60">▾</span>
                                                </>
                                              )}
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => handleDismissPending(entry)}
                                              disabled={dismissingId === entry.id}
                                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 shadow-2xs transition cursor-pointer flex items-center space-x-1"
                                              title="Dismiss from pending queue (e.g. client chose 1 of multiple options)"
                                            >
                                              <span>Dismiss</span>
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center">
                                            <span
                                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 bg-slate-800 border border-slate-700"
                                              title="Only the task creator or admin can update approval"
                                            >
                                              Awaiting Client
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
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
        {/* Email Day Log Modal */}
        <EmailDayLogModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          entries={entries}
          designerName={activeProfile?.name || 'Gajesh'}
          selectedDate={selectedDate}
        />

        {/* Quick Inline Approval Modal */}
        <QuickApprovalModal
          entry={selectedApprovalEntry}
          isOpen={Boolean(selectedApprovalEntry)}
          onClose={() => setSelectedApprovalEntry(null)}
          onSuccess={updated => {
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            if (
              (updated.quantity_approved || 0) >= (updated.quantity_done || 0) ||
              Boolean(updated.notes && updated.notes.includes('[DISMISSED_PENDING]'))
            ) {
              setPendingEntries(prev => prev.filter(e => e.id !== updated.id));
            } else {
              setPendingEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            }
          }}
        />
      </main>
    </div>
  );
}
