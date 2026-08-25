'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { fetchWorkEntriesByDate, deleteWorkEntry, fetchProfiles, getLoggedInUser } from '@/lib/services/work-entry';
import { WorkEntryWithDetails, Profile } from '@/types';
import { formatDate } from '@/lib/utils';
import { Plus, ChevronLeft, ChevronRight, Calendar, Edit2, Trash2, CheckCircle2, Clock, User, Check, AlertCircle, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export default function MyWorkPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  // Default view: ONLY the logged-in user's entries
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('my_work');
  const [entries, setEntries] = useState<WorkEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfiles() {
      const pData = await fetchProfiles();
      setProfiles(pData);
      const user = getLoggedInUser();
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
      const userIdToFetch = selectedUserFilter === 'my_work' ? (activeProfile?.id || 'p1') : (selectedUserFilter === 'all' ? undefined : selectedUserFilter);
      const data = await fetchWorkEntriesByDate(selectedDate, userIdToFetch);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedUserFilter, activeProfile]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleDateChange = (daysDelta: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysDelta);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const { showToast } = useToast();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work entry?')) return;
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
  };

  const handleCopySummary = () => {
    if (entries.length === 0) {
      showToast('No entries to copy.', 'error');
      return;
    }

    const formattedDate = formatDate(selectedDate);
    const title = selectedUserFilter === 'my_work'
      ? `My Work Log - ${formattedDate}\n`
      : `Team Work Log - ${formattedDate}\n`;

    const text = entries
      .map((entry, idx) => {
        const client = entry.client?.name || 'Unknown Client';
        const type = entry.work_type?.name || 'Work';
        const desc = entry.description || '';
        const qty = entry.quantity_done;
        return `${idx + 1}. Client: ${client} | Type: ${type} | Description: ${desc} | Qty: ${qty}`;
      })
      .join('\n');

    navigator.clipboard.writeText(title + text);
    showToast('Copied daily summary to clipboard!', 'success');
  };



  const totalDone = entries.reduce((acc, curr) => acc + curr.quantity_done, 0);
  const totalApproved = entries.reduce((acc, curr) => acc + curr.quantity_approved, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName={activeProfile?.name || 'Gajesh'} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Main Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {selectedUserFilter === 'my_work' ? 'My Daily Work Log' : 'Team Work Log'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {selectedUserFilter === 'my_work'
                ? `Showing work entries logged by ${activeProfile?.name || 'you'}`
                : 'Showing work entries logged across the team'}
            </p>
          </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {entries.length > 0 && (
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Copy all entries for this day to clipboard"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Day Log</span>
            </button>
          )}

          <Link
            href="/work/new"
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Add Work Entry</span>
          </Link>
        </div>
      </div>

        {/* View Toggle Bar & Date Selector */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* My Work vs Team Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
            <button
              onClick={() => setSelectedUserFilter('my_work')}
              className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                selectedUserFilter === 'my_work'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Log ({activeProfile?.name || 'Gajesh'})
            </button>
            <button
              onClick={() => setSelectedUserFilter('all')}
              className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                selectedUserFilter !== 'my_work'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entire Team Log
            </button>
          </div>

          {/* Date Selector & Designer Filter */}
          <div className="flex flex-wrap items-center space-x-2 w-full md:w-auto justify-between md:justify-end gap-2">
            {/* Designer Filter Dropdown (shown when Entire Team Log tab is selected) */}
            {selectedUserFilter !== 'my_work' && (
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-semibold">Designer:</span>
                <select
                  value={selectedUserFilter}
                  onChange={e => setSelectedUserFilter(e.target.value)}
                  className="font-bold text-slate-900 bg-transparent focus:outline-none text-xs"
                >
                  <option value="all">All Designers / Team</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.designation || 'Team'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                <Calendar className="w-4 h-4 text-sky-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="font-bold text-slate-900 focus:outline-none bg-transparent text-xs"
                />
                <span className="text-xs text-slate-500 font-medium">
                  ({formatDate(selectedDate)})
                </span>
              </div>

              <button
                onClick={() => handleDateChange(1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {selectedDate !== todayStr && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-2 py-1 text-xs font-bold text-sky-700 bg-sky-50 rounded-md border border-sky-200 hover:bg-sky-100"
                >
                  Today
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Daily Summary Stat Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity Done</div>
                <div className="text-2xl font-extrabold text-slate-900">{totalDone}</div>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium">{entries.length} work item(s)</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity Approved</div>
                <div className="text-2xl font-extrabold text-teal-700">{totalApproved}</div>
              </div>
            </div>
            <span className="text-xs text-teal-600 font-semibold">
              {totalDone > 0 ? `${Math.round((totalApproved / totalDone) * 100)}% approved` : '0%'}
            </span>
          </div>
        </div>

        {/* Streamlined, Uncluttered Entries View */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-xs text-slate-500 font-medium">Loading work entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No work logged for {formatDate(selectedDate)}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {selectedUserFilter === 'my_work'
                ? "You haven't logged any work items for this date yet."
                : "No team members have logged work for this date."}
            </p>
            <div className="pt-2">
              <Link
                href="/work/new"
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white webtree-gradient-btn rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Log Daily Work</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {entries.map(entry => (
              <div
                key={entry.id}
                className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Section: Badges & Description */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.client && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-50 text-sky-800 border border-sky-200">
                        {entry.client.name}
                      </span>
                    )}

                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {entry.work_type?.name || 'Work'}
                    </span>

                    {selectedUserFilter !== 'my_work' && entry.profile && (
                      <span className="text-xs text-slate-500 font-medium">
                        By <strong className="text-slate-800">{entry.profile.name}</strong>
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-snug">
                    {entry.description}
                  </p>

                  {entry.notes && (
                    <p className="text-xs text-slate-500 italic">
                      Note: {entry.notes}
                    </p>
                  )}
                </div>

                {/* Right Section: Quantities, Status & Action Icons */}
                <div className="flex items-center space-x-6 justify-between md:justify-end">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="text-center">
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Done</div>
                      <div className="text-base font-extrabold text-slate-900">{entry.quantity_done}</div>
                    </div>

                    <div className="text-center">
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Approved</div>
                      <div className="text-base font-extrabold text-teal-700">{entry.quantity_approved}</div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${
                      entry.quantity_approved > 0 || entry.status === 'Reviewed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {entry.quantity_approved > 0 || entry.status === 'Reviewed' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Approved</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Not Approved</span>
                      </>
                    )}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 border-l border-slate-200 pl-3">
                    <Link
                      href={`/work/${entry.id}`}
                      className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit entry"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
