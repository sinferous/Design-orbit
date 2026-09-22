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
import { QuickApprovalModal } from '@/components/work/QuickApprovalModal';
import { RichSelect } from '@/components/ui/RichSelect';
import { OrbitLoader } from '@/components/ui/OrbitLoader';
import { generateEmailTableHtml, generateCleanPlainText, copyToClipboardWithHtml } from '@/lib/services/email-formatter';

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
    const pollTimer = setInterval(async () => {
      try {
        const userIdToFetch = selectedUserFilter === 'my_work' ? (activeProfile?.id || 'p1') : (selectedUserFilter === 'all' ? undefined : selectedUserFilter);
        const data = await fetchWorkEntriesByDate(selectedDate, userIdToFetch);
        setEntries(data);
      } catch (e) {}
    }, 5000);

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
    const nice = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${day}-${month}-${year} (${nice})`;
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
      title: 'Delete Work Entry',
      message: 'Are you sure you want to delete this work entry? This action cannot be undone.',
      confirmText: 'Delete Entry',
      variant: 'danger',
      onConfirm: async () => {
        setDeletingId(id);
        try {
          setEntries(prev => prev.filter(e => e.id !== id));
          await deleteWorkEntry(id);
          showToast('Work entry deleted successfully.', 'success');
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
      title: 'Dismiss from Pending Queue',
      message: `Dismiss "${entry.description}" from pending approvals? Your work time and completed quantity (${entry.quantity_done}) will stay 100% intact.`,
      confirmText: 'Dismiss from Queue',
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
          showToast('Deliverable dismissed from pending approvals queue.', 'success');
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
      showToast(`Timer started: "${entry.description.slice(0, 24)}${entry.description.length > 24 ? '...' : ''}"`, 'success');
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
      showToast(`Timer stopped! Recorded ${formatWorkEntryDuration(newTotal)}.`, 'success');
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
    <div className="min-h-screen flex flex-col">
      <Navbar userName={activeProfile?.name || 'Gajesh'} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header & Main Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              {isAdmin ? 'Creative Team Work Log' : (selectedUserFilter === 'my_work' ? 'My Daily Work Log' : 'Team Work Log')}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {isAdmin
                ? 'Showing work entries logged across the creative design team'
                : (selectedUserFilter === 'my_work'
                  ? `Showing work entries logged by ${activeProfile?.name || 'you'}`
                  : 'Showing work entries logged across the team')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {!isAdmin && selectedUserFilter === 'my_work' && entries.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-bold text-violet-300 bg-violet-950/70 hover:bg-violet-900/80 border border-violet-800/60 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Preview and format daily work log for email"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Day Log</span>
                </button>

                <button
                  onClick={handleQuickCopy}
                  className="inline-flex items-center justify-center space-x-1.5 px-3 py-2.5 text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Quick copy formatted email log to clipboard"
                >
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">Quick Copy</span>
                </button>
              </div>
            )}

            {!isAdmin && (
              <Link
                href="/work/new"
                className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Add Work Entry</span>
              </Link>
            )}
          </div>
        </div>

        {/* Primary View Mode Switcher: Daily Calendar vs Pending Approvals Queue */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto items-center">
            <button
              type="button"
              onClick={() => setWorkViewMode('calendar')}
              className={`w-full sm:w-auto h-11 sm:h-auto inline-flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
                workViewMode === 'calendar'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="truncate">Daily Log <span className="hidden min-[420px]:inline text-[11px] font-normal opacity-90">(By Date)</span></span>
            </button>

            <button
              type="button"
              onClick={() => setWorkViewMode('pending')}
              className={`w-full sm:w-auto h-11 sm:h-auto inline-flex items-center justify-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
                workViewMode === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <CalendarClock className={`w-4 h-4 shrink-0 ${workViewMode === 'pending' ? 'text-white' : 'text-amber-400'}`} />
              <span className="truncate">Pending Queue</span>
              {pendingEntries.length > 0 && (
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold shrink-0 ${
                  workViewMode === 'pending'
                    ? 'bg-white text-amber-950'
                    : 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                }`}>
                  {pendingEntries.length}
                </span>
              )}
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            {workViewMode === 'pending'
              ? 'Deliverables awaiting client feedback • Direct approval without date hunting'
              : 'Browse deliverables by calendar date'}
          </span>
        </div>

        {/* Primary Content: Daily Calendar View vs Pending Approvals Queue */}
        {workViewMode === 'calendar' ? (
          <>
            {/* View Toggle Bar & Date Selector */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* If Admin: show Team filter; Else: My Work vs Team Tabs */}
          {isAdmin ? (
            <div className="flex items-center space-x-2.5 w-full md:w-auto">
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-950/70 text-violet-300 border border-violet-800/60 shadow-2xs shrink-0">
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
            <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-800 p-1 rounded-lg w-full md:w-auto">
              <button
                onClick={() => setSelectedUserFilter('my_work')}
                className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  selectedUserFilter === 'my_work'
                    ? 'bg-slate-800 text-violet-400 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                My Log ({activeProfile?.name || 'Gajesh'})
              </button>
              <button
                onClick={() => setSelectedUserFilter('all')}
                className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  selectedUserFilter !== 'my_work'
                    ? 'bg-slate-800 text-violet-400 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Entire Team Log
              </button>
            </div>
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
                  className="flex items-center space-x-2 px-3 py-1.5 bg-slate-950/80 hover:bg-slate-800/80 rounded-lg border border-slate-700 hover:border-violet-500 shadow-2xs transition-all cursor-pointer text-xs group"
                  title="Click to choose a date"
                >
                  <Calendar className="w-4 h-4 text-violet-400 shrink-0 group-hover:scale-105 transition-transform" />
                  <span className="font-bold text-slate-100">
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
                        <span className="text-xs font-extrabold text-slate-100 tracking-wide">
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
                        <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-1">
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
                                className={`h-8 w-8 sm:h-8.5 sm:w-8.5 text-xs font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
                                  !dayObj.isCurrentMonth ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:bg-slate-800'
                                } ${
                                  isSelected
                                    ? '!bg-violet-600 !text-white font-bold !border-violet-500 shadow-sm'
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
                      <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between text-xs font-bold">
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
                  className="px-2 py-1 text-xs font-bold text-violet-300 bg-violet-950/70 rounded-md border border-violet-800/60 hover:bg-violet-900/80"
                >
                  Today
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Daily Summary Stat Tiles - Compact on Mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800 shadow-2xs flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-950/70 border border-violet-800/60 flex items-center justify-center text-violet-400 shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">Total Quantity</div>
                <div className="text-lg sm:text-2xl font-extrabold text-slate-100">{totalDone}</div>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs text-slate-500 font-medium hidden min-[400px]:inline shrink-0">{entries.length} items</span>
          </div>

          <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800 shadow-2xs flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-950/70 border border-violet-800/60 flex items-center justify-center text-violet-400 shrink-0">
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">Approved Qty</div>
                <div className="text-lg sm:text-2xl font-extrabold text-violet-400">{totalApproved}</div>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs text-violet-400 font-bold shrink-0">
              {totalDone > 0 ? `${Math.round((totalApproved / totalDone) * 100)}%` : '0%'}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800 shadow-2xs flex items-center justify-between">
            <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-950/70 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">Total Time Tracked</div>
                <div className="text-lg sm:text-2xl font-extrabold text-amber-400 font-mono">
                  {formatWorkEntryDuration(totalTrackedSeconds)}
                </div>
              </div>
            </div>
            <span className="text-xs text-amber-400 font-semibold shrink-0">
              {activeTimersCount > 0 ? (
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                  <span>{activeTimersCount} Running</span>
                </span>
              ) : (
                'All Paused'
              )}
            </span>
          </div>
        </div>

        {/* Work Entries Content */}
        {loading ? (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
            <OrbitLoader
              size="md"
              text="Loading daily work log..."
              subtitle="Synchronizing deliverables from Supabase"
            />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100">No work logged for {formatDisplayDate(selectedDate)}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isAdmin || selectedUserFilter !== 'my_work'
                ? "No team members have logged work for this date."
                : "You haven't logged any work items for this date yet."}
            </p>
            {!isAdmin && (
              <div className="pt-2">
                <Link
                  href="/work/new"
                  className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white webtree-gradient-btn rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Daily Work</span>
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
                    <div key={clientName} className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
                      {/* Client Header Bar */}
                      <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-violet-950/80 text-violet-400 flex items-center justify-center border border-violet-800/60">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-extrabold text-slate-100 uppercase tracking-wider">
                              {clientName}
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold text-violet-300 bg-violet-950/70 border border-violet-800/60 px-2.5 py-0.5 rounded-full">
                            {clientEntries.length} item(s)
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-xs font-semibold text-slate-400">
                          <span>Total Qty: <strong className="text-slate-100 font-extrabold">{clientDone}</strong></span>
                          <span className="text-slate-600">•</span>
                          <span>Approved: <strong className="text-violet-400 font-extrabold">{clientApproved}</strong></span>
                        </div>
                      </div>

                      {/* Items for this Client */}
                      <div className="divide-y divide-slate-800">
                        {clientEntries.map(entry => {
                          const isMyEntry = Boolean(
                            activeProfile && (
                              entry.user_id === activeProfile.id ||
                              (entry.profile && entry.profile.name.toLowerCase() === activeProfile.name.toLowerCase()) ||
                              (entry.profile && activeProfile.email && entry.profile.email && entry.profile.email.toLowerCase() === activeProfile.email.toLowerCase())
                            )
                          );

                          return (
                            <div
                              key={entry.id}
                              className={`p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                entry.timer_started_at
                                  ? isMyEntry
                                    ? 'bg-amber-950/30 border-l-4 border-l-amber-500 shadow-2xs'
                                    : 'bg-emerald-950/30 border-l-4 border-l-emerald-500 shadow-2xs'
                                  : 'hover:bg-slate-800/40'
                              }`}
                            >
                              {/* Left Section: Work Type & Description */}
                              <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                    {entry.work_type?.name || 'Work'}
                                  </span>

                                  {selectedUserFilter !== 'my_work' && entry.profile && (
                                    <span className="text-xs text-slate-400 font-medium">
                                      By <strong className="text-slate-200">{entry.profile.name}</strong>
                                    </span>
                                  )}

                                  {entry.timer_started_at && isMyEntry && (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                                      <span>Timer Active</span>
                                    </span>
                                  )}
                                </div>

                                <p className="text-sm font-semibold text-slate-100 leading-snug">
                                  {entry.description}
                                </p>

                                {(entry.project_url || entry.best_work_url) && (
                                  <div className="pt-1.5 flex items-center space-x-2">
                                    <a
                                      href={entry.project_url || entry.best_work_url!}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-950/70 text-violet-300 hover:bg-violet-900/80 border border-violet-800/60 transition-colors shadow-2xs cursor-pointer group"
                                      title="Open Deliverable URL in new tab"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-violet-400 group-hover:scale-110 transition-transform shrink-0" />
                                      <span>View Project Link ↗</span>
                                      <span className="text-[11px] text-violet-400/80 font-normal truncate max-w-xs ml-1 border-l border-violet-800/60 pl-1.5">
                                        {entry.project_url || entry.best_work_url}
                                      </span>
                                    </a>
                                  </div>
                                )}

                                {entry.notes && (
                                  <p className="text-xs text-slate-400 italic">
                                    Note: {entry.notes}
                                  </p>
                                )}
                              </div>

                              {/* Right Section: Quantities, Status, Timer & Action Icons */}
                              <div className="flex flex-wrap items-center space-x-3 sm:space-x-5 justify-between md:justify-end gap-y-2">
                                {isInProgressEntry(entry) ? (
                                  <div className="flex items-center">
                                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60 shadow-2xs">
                                      <span>⏳ Working</span>
                                      <span className="text-[11px] text-amber-400 font-semibold">(0 qty • Time logged)</span>
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center space-x-4 text-xs">
                                      <div className="text-center">
                                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Qty</div>
                                        <div className="text-base font-extrabold text-slate-100">{entry.quantity_done}</div>
                                      </div>

                                      <div className="text-center">
                                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Approved</div>
                                        <div className="text-base font-extrabold text-violet-400">{entry.quantity_approved}</div>
                                      </div>
                                    </div>

                                    {/* Quick Interactive Approval Action */}
                                    {isMyEntry || isAdmin ? (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedApprovalEntry(entry)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-all border shadow-2xs hover:scale-105 active:scale-95 cursor-pointer ${
                                          entry.quantity_approved === entry.quantity_done
                                            ? 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800/60'
                                            : entry.quantity_approved > 0
                                            ? 'bg-violet-950/70 hover:bg-violet-900/80 text-violet-300 border-violet-800/60'
                                            : 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border-amber-800/60'
                                        }`}
                                        title="Click to update approved count"
                                      >
                                        {entry.quantity_approved === entry.quantity_done ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Approved ({entry.quantity_approved})</span>
                                            <span className="text-[10px] opacity-60">▾</span>
                                          </>
                                        ) : entry.quantity_approved > 0 ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-violet-400" />
                                            <span>Partial ({entry.quantity_approved}/{entry.quantity_done})</span>
                                            <span className="text-[10px] opacity-60">▾</span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Not Approved (0)</span>
                                            <span className="text-[10px] opacity-60">▾</span>
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 border ${
                                          entry.quantity_approved > 0
                                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                                            : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                                        }`}
                                      >
                                        {entry.quantity_approved > 0 ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Approved ({entry.quantity_approved})</span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Not Approved</span>
                                          </>
                                        )}
                                      </span>
                                    )}
                                  </>
                                )}

                                {/* Timer Controls: Start / Stop & Stopwatch */}
                                {isMyEntry ? (
                                  <div className="flex items-center space-x-1.5 shrink-0">
                                    {entry.timer_started_at ? (
                                      // Active running timer: live clock + Stop button
                                      <div className="flex items-center space-x-1.5">
                                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-950/80 text-amber-300 border border-amber-700/60 rounded-lg font-mono text-xs font-bold shadow-2xs">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                                          <Clock className="w-3 h-3 text-amber-400" />
                                          <span>{formatWorkEntryStopwatch(calculateWorkEntrySeconds(entry, nowMs))}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleStopTimer(entry)}
                                          disabled={timerLoadingId === entry.id}
                                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
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
                                          className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                          title="Float timer outside browser (Picture-in-Picture)"
                                        >
                                          <ExternalLink className="w-3 h-3 text-slate-400" />
                                          <span className="hidden sm:inline">Float PiP</span>
                                        </button>
                                      </div>
                                    ) : (
                                      // Idle timer: Accumulated time badge + Start button
                                      <div className="flex items-center space-x-1.5">
                                        {calculateWorkEntrySeconds(entry, nowMs) > 0 && (
                                          <span
                                            title={`Total time tracked: ${formatWorkEntryDuration(calculateWorkEntrySeconds(entry, nowMs))}`}
                                            className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono font-bold"
                                          >
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span>{formatWorkEntryDuration(calculateWorkEntrySeconds(entry, nowMs))}</span>
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleStartTimer(entry)}
                                          disabled={timerLoadingId === entry.id}
                                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-violet-950/60 hover:bg-violet-900/80 text-violet-300 border border-violet-800/60 hover:border-violet-600 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                                          title="Start timer for this task"
                                        >
                                          <Play className="w-2.5 h-2.5 fill-violet-400 text-violet-400" />
                                          <span>Start</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // Read-only time spent badge for other teammates with live ticker if active
                                  <div className="flex items-center space-x-1.5 shrink-0">
                                    {entry.timer_started_at ? (
                                      <span
                                        title={`${entry.profile?.name || 'Teammate'} is actively working on this right now`}
                                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 rounded-lg font-mono text-xs font-bold shadow-2xs"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>{formatWorkEntryStopwatch(calculateWorkEntrySeconds(entry, nowMs))}</span>
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-700/50">Live</span>
                                      </span>
                                    ) : (
                                      calculateWorkEntrySeconds(entry, nowMs) > 0 && (
                                        <span
                                          title={`Time spent: ${formatWorkEntryDuration(calculateWorkEntrySeconds(entry, nowMs))}`}
                                          className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-xs font-mono font-medium"
                                        >
                                          <Clock className="w-3 h-3 text-slate-500" />
                                          <span>{formatWorkEntryDuration(calculateWorkEntrySeconds(entry, nowMs))}</span>
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}

                                {/* Actions: Only visible and editable on the user's OWN work! */}
                                {isMyEntry && (
                                  <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
                                    <Link
                                      href={`/work/${entry.id}`}
                                      className="p-1.5 text-slate-400 hover:text-violet-400 rounded-lg hover:bg-slate-800 transition-colors"
                                      title="Edit my entry"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Link>
                                    <button
                                      onClick={() => handleDelete(entry.id)}
                                      disabled={deletingId === entry.id}
                                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                                      title="Delete my entry"
                                    >
                                      <Trash2 className="w-4 h-4" />
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
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60 shadow-2xs shrink-0">
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
                <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-800 p-1 rounded-lg w-full md:w-auto">
                  <button
                    onClick={() => setSelectedUserFilter('my_work')}
                    className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      selectedUserFilter === 'my_work'
                        ? 'bg-slate-800 text-amber-400 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    My Pending ({activeProfile?.name || 'Gajesh'})
                  </button>
                  <button
                    onClick={() => setSelectedUserFilter('all')}
                    className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      selectedUserFilter !== 'my_work'
                        ? 'bg-slate-800 text-amber-400 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Entire Team Pending
                  </button>
                </div>
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
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-slate-950 transition-all"
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
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1">Filter By Age:</span>
                <button
                  onClick={() => setPendingFilterUrgency('all')}
                  className={`px-3 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                    pendingFilterUrgency === 'all'
                      ? 'bg-slate-100 text-slate-950 border-slate-100 shadow-2xs'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  All ({pendingEntries.length})
                </button>
                <button
                  onClick={() => setPendingFilterUrgency('fresh')}
                  className={`px-3 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                    pendingFilterUrgency === 'fresh'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/80'
                  }`}
                >
                  Fresh &le;4d ({freshPendingCount})
                </button>
                <button
                  onClick={() => setPendingFilterUrgency('attention')}
                  className={`px-3 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                    pendingFilterUrgency === 'attention'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/80'
                  }`}
                >
                  Follow-up 5-7d ({attentionPendingCount})
                </button>
                <button
                  onClick={() => setPendingFilterUrgency('overdue')}
                  className={`px-3 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                    pendingFilterUrgency === 'overdue'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                      : 'bg-rose-950/60 text-rose-300 border-rose-800/60 hover:bg-rose-900/80'
                  }`}
                >
                  Overdue &gt;7d ({overduePendingCount})
                </button>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                Waiting for sign-off: <strong className="text-amber-400 font-bold">{totalPendingWaiting} item(s)</strong> across <strong className="text-slate-100 font-bold">{filteredPendingEntries.length}</strong> task(s)
              </div>
            </div>

            {/* Pending Approvals Deliverables List */}
            {pendingLoading ? (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
                <OrbitLoader
                  size="md"
                  text="Scanning for pending client approvals..."
                  subtitle="Checking past deliverables needing sign-off"
                />
              </div>
            ) : filteredPendingEntries.length === 0 ? (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-800/60">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">All Caught Up! No Pending Approvals</h3>
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
                              <div className="w-7 h-7 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center border border-amber-800/60">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <h3 className="text-xs font-extrabold text-slate-100 uppercase tracking-wider">
                                {clientName}
                              </h3>
                              <span className="text-[11px] font-bold text-amber-300 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded-full">
                                {clientItems.length} awaiting sign-off
                              </span>
                            </div>

                            <div className="flex items-center space-x-3 text-xs text-slate-400 font-semibold">
                              <span>Done: <strong className="text-slate-100">{clientDone}</strong></span>
                              <span className="text-slate-600">•</span>
                              <span>Approved: <strong className="text-violet-400">{clientApproved}</strong></span>
                              <span className="text-slate-600">•</span>
                              <span className="text-amber-400 font-bold">Waiting: {clientDone - clientApproved}</span>
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
                                      <span className="font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[11px]">
                                        📅 {formatDisplayDate(entry.work_date)}
                                      </span>

                                      {/* Relative Urgency Age Badge */}
                                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${urgency.badgeBg} ${urgency.badgeText} ${urgency.badgeBorder}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${urgency.dotColor}`} />
                                        <span>{urgency.label}</span>
                                      </span>

                                      {/* Designer Tag */}
                                      <span className="px-2 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-800/60 font-bold text-[11px]">
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
                                          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                            Done / Approved
                                          </div>
                                          <div className="text-sm font-extrabold text-slate-100">
                                            {entry.quantity_done} <span className="text-slate-600 font-normal">/</span>{' '}
                                            <span className="text-violet-400">{entry.quantity_approved}</span>
                                          </div>
                                        </div>

                                        {canManage ? (
                                          <div className="flex items-center space-x-2">
                                            <button
                                              type="button"
                                              onClick={() => setSelectedApprovalEntry(entry)}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all border shadow-2xs hover:scale-105 active:scale-95 cursor-pointer ${
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
                                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 shadow-2xs transition-all cursor-pointer flex items-center space-x-1"
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
