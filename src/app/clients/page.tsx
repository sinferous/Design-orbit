'use client';

import { useState, useEffect, useMemo } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Client } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { fetchClients, createClientRecord, deleteClientRecord, updateClientRecord } from '@/lib/services/work-entry';
import { formatReportTime } from '@/lib/services/reports';
import { Plus, Search, Trash2, Pencil, Check, X, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { OrbitLoader } from '@/components/ui/OrbitLoader';

type ClientStats = {
  monthMade: number;
  monthApproved: number;
  monthSeconds: number;
  lastDate: string | null;
  people: string[];
};

type View = 'all' | 'active' | 'quiet';
type SortKey = 'name' | 'recent' | 'work';

const QUIET_DAYS = 30;

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysSince(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((today - then) / 86400000);
}

function lastWorkLabel(dateStr: string | null) {
  if (!dateStr) return 'No work in 90 days';
  const n = daysSince(dateStr);
  if (n <= 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n < 7) return `${n} days ago`;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Light query: last 90 days of entries, only the columns this page needs. */
async function fetchClientStats(): Promise<Record<string, ClientStats>> {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
  const monthStart = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const stats: Record<string, ClientStats> = {};

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('work_entries')
      .select('client_id, work_date, quantity_done, quantity_approved, time_spent_seconds, profile:profiles(name)')
      .gte('work_date', toLocalDateStr(from));
    if (error || !data) return stats;

    for (const row of data as any[]) {
      if (!row.client_id) continue;
      const s = (stats[row.client_id] ||= { monthMade: 0, monthApproved: 0, monthSeconds: 0, lastDate: null, people: [] });
      if (!s.lastDate || row.work_date > s.lastDate) s.lastDate = row.work_date;
      if (row.work_date >= monthStart) {
        s.monthMade += row.quantity_done || 0;
        s.monthApproved += row.quantity_approved || 0;
        s.monthSeconds += row.time_spent_seconds || 0;
      }
      const name = row.profile?.name;
      if (name && daysSince(row.work_date) <= QUIET_DAYS && !s.people.includes(name)) s.people.push(name);
    }
  } catch (err) {
    console.warn('Client stats unavailable:', err);
  }
  return stats;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Record<string, ClientStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<View>('all');
  const [sortKey, setSortKey] = useState<SortKey>('recent');

  const [showAdd, setShowAdd] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { showToast, confirmDialog } = useToast();

  const loadClientsData = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientsData();
    fetchClientStats().then(setStats);
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClientName.trim();
    if (!trimmed) {
      showToast('Enter a client name', 'error');
      return;
    }

    setAdding(true);
    try {
      await createClientRecord(trimmed);
      setNewClientName('');
      setShowAdd(false);
      showToast(`${trimmed} added`, 'success');
      await loadClientsData();
    } catch (err: any) {
      showToast(err.message || 'Could not add the client. Try again.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (client: Client) => {
    setEditingId(client.id);
    setEditingName(client.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdateClient = async (id: string, originalName: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showToast('Enter a client name', 'error');
      return;
    }
    if (trimmed === originalName) {
      handleCancelEdit();
      return;
    }

    setUpdatingId(id);
    try {
      await updateClientRecord(id, trimmed);
      setClients(prev => prev.map(c => (c.id === id ? { ...c, name: trimmed } : c)));
      showToast(`Renamed to ${trimmed}`, 'success');
      handleCancelEdit();
      await loadClientsData();
    } catch (err: any) {
      showToast(err.message || 'Could not rename the client. Try again.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteClient = (id: string, name: string) => {
    confirmDialog({
      title: 'Delete this client?',
      message: `${name} and its link to logged work will be removed. This can’t be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setDeletingId(id);
        try {
          await deleteClientRecord(id);
          setClients(prev => prev.filter(c => c.id !== id && c.name.toLowerCase() !== name.toLowerCase()));
          showToast(`${name} deleted`, 'success');
          await loadClientsData();
        } catch (err: any) {
          showToast(err?.message || `Could not delete ${name}. Try again.`, 'error');
          await loadClientsData();
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const empty: ClientStats = { monthMade: 0, monthApproved: 0, monthSeconds: 0, lastDate: null, people: [] };
  const statOf = (id: string) => stats[id] || empty;
  const isActive = (id: string) => {
    const d = statOf(id).lastDate;
    return d !== null && daysSince(d) <= QUIET_DAYS;
  };

  const totals = useMemo(() => {
    let active = 0;
    let monthMade = 0;
    let monthSeconds = 0;
    let top: { name: string; made: number } | null = null;
    for (const c of clients) {
      const s = stats[c.id];
      if (!s) continue;
      if (s.lastDate && daysSince(s.lastDate) <= QUIET_DAYS) active++;
      monthMade += s.monthMade;
      monthSeconds += s.monthSeconds;
      if (s.monthMade > 0 && (!top || s.monthMade > top.made)) top = { name: c.name, made: s.monthMade };
    }
    return { active, quiet: clients.length - active, monthMade, monthSeconds, top };
  }, [clients, stats]);

  const q = searchQuery.trim().toLowerCase();
  const rows = clients
    .filter(c => c.name.toLowerCase().includes(q))
    .filter(c => (view === 'all' ? true : view === 'active' ? isActive(c.id) : !isActive(c.id)))
    .sort((a, b) => {
      if (sortKey === 'work') return statOf(b.id).monthMade - statOf(a.id).monthMade || a.name.localeCompare(b.name);
      if (sortKey === 'recent') {
        const da = statOf(a.id).lastDate || '';
        const db = statOf(b.id).lastDate || '';
        return db.localeCompare(da) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  const maxMade = Math.max(1, ...rows.map(c => statOf(c.id).monthMade));
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  const iconBtn =
    'inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 transition-colors disabled:opacity-30 cursor-pointer';
  const segBtn = (active: boolean) =>
    `h-8 px-3 rounded-md text-xs transition-colors cursor-pointer ${active ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-slate-200'}`;
  const sortLabels: Record<SortKey, string> = { recent: 'Recent first', work: 'Most work', name: 'A to Z' };
  const nextSort: Record<SortKey, SortKey> = { recent: 'work', work: 'name', name: 'recent' };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0c0b] md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium text-slate-50">Clients</h1>
            <p className="text-sm text-slate-400 mt-1">Who the team is working for, and how recently</p>
          </div>

          {showAdd ? (
            <form onSubmit={handleAddClient} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                required
                autoFocus
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setShowAdd(false);
                    setNewClientName('');
                  }
                }}
                placeholder="Client name"
                aria-label="New client name"
                className="flex-1 sm:w-64 h-9 px-3 rounded-lg bg-white/[0.03] border border-emerald-400/40 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={adding || !newClientName.trim()}
                className="h-9 px-4 rounded-lg bg-emerald-500 text-sm font-medium text-[#0b1410] hover:bg-emerald-400 disabled:bg-white/[0.06] disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {adding ? 'Adding…' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setNewClientName('');
                }}
                className={`${iconBtn} w-9 h-9 border border-white/[0.08] hover:text-white hover:bg-white/[0.05]`}
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-500 text-sm font-medium text-[#0b1410] hover:bg-emerald-400 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              New client
            </button>
          )}
        </div>

        {/* Totals */}
        <div className="bento-card grid grid-cols-2 lg:grid-cols-4 [&>*]:border-white/[0.06] [&>*:nth-child(even)]:border-l lg:[&>*:not(:first-child)]:border-l [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0">
          <div className="p-5">
            <div className="text-xs text-slate-500">Clients</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums">{loading ? '–' : clients.length}</div>
            <div className="mt-1 text-xs text-slate-500">in the directory</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Active</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-emerald-400 tabular-nums">{loading ? '–' : totals.active}</div>
            <div className="mt-1 text-xs text-slate-500">worked on in the last {QUIET_DAYS} days</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Made in {monthName}</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums">{totals.monthMade}</div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">{formatReportTime(totals.monthSeconds)} tracked</div>
          </div>
          <div className="p-5 min-w-0">
            <div className="text-xs text-slate-500">Busiest this month</div>
            <div className="mt-1.5 font-display text-xl sm:text-2xl font-medium text-white truncate leading-9">
              {totals.top ? totals.top.name : '–'}
            </div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">{totals.top ? `${totals.top.made} made` : 'Nothing logged yet'}</div>
          </div>
        </div>

        {/* Directory */}
        <div className="bento-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex gap-1 rounded-lg bg-white/[0.03] border border-white/[0.05] p-0.5">
                <button type="button" onClick={() => setView('all')} className={segBtn(view === 'all')}>
                  All <span className="text-slate-500 tabular-nums">{clients.length}</span>
                </button>
                <button type="button" onClick={() => setView('active')} className={segBtn(view === 'active')}>
                  Active <span className="text-slate-500 tabular-nums">{totals.active}</span>
                </button>
                <button type="button" onClick={() => setView('quiet')} className={segBtn(view === 'quiet')}>
                  Quiet <span className="text-slate-500 tabular-nums">{totals.quiet}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSortKey(nextSort[sortKey])}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                title="Change sort"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortLabels[sortKey]}
              </button>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search clients"
                aria-label="Search clients"
                className="w-full h-9 pl-9 pr-8 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400/50 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded text-slate-500 hover:text-white cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Column heads */}
          {!loading && rows.length > 0 && (
            <div className="hidden md:grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_120px_72px] gap-6 px-5 py-2.5 text-xs text-slate-500 border-b border-white/[0.04]">
              <span>Client</span>
              <span>Made in {monthName}</span>
              <span className="text-right">Time</span>
              <span className="pl-4">Last work</span>
              <span />
            </div>
          )}

          {loading ? (
            <div className="p-12">
              <OrbitLoader size="md" text="Loading clients" />
            </div>
          ) : clients.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-200">No clients yet</p>
              <button type="button" onClick={() => setShowAdd(true)} className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer">
                Add the first one
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-200">
                {q ? `No client matches “${searchQuery.trim()}”` : view === 'active' ? 'No active clients' : 'No quiet clients'}
              </p>
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setNewClientName(searchQuery.trim());
                    setSearchQuery('');
                    setShowAdd(true);
                  }}
                  className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  Add “{searchQuery.trim()}” as a new client
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {rows.map(client => {
                const s = statOf(client.id);
                const active = isActive(client.id);
                const isEditing = editingId === client.id;
                const isUpdating = updatingId === client.id;
                const busy = editingId !== null || deletingId === client.id;
                const people =
                  s.people.length === 0 ? null : s.people.length <= 2 ? s.people.join(', ') : `${s.people.slice(0, 2).join(', ')} +${s.people.length - 2}`;

                return (
                  <li
                    key={client.id}
                    className={`group grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_120px_72px] items-center gap-x-6 gap-y-1 px-4 sm:px-5 py-3 hover:bg-white/[0.015] transition-colors ${
                      deletingId === client.id ? 'opacity-40' : ''
                    }`}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-display ${
                          active ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/[0.05] text-slate-400'
                        }`}
                      >
                        {client.name.trim().charAt(0).toUpperCase()}
                      </div>
                      {isEditing ? (
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            handleUpdateClient(client.id, client.name);
                          }}
                          className="flex items-center gap-1 flex-1 min-w-0"
                        >
                          <input
                            type="text"
                            required
                            autoFocus
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            disabled={isUpdating}
                            aria-label="Client name"
                            className="flex-1 min-w-0 h-8 px-2.5 rounded-md bg-white/[0.04] border border-emerald-400/50 text-sm text-slate-100 focus:outline-none"
                            onKeyDown={e => {
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            type="submit"
                            disabled={isUpdating || !editingName.trim()}
                            className={`${iconBtn} text-emerald-400 hover:bg-emerald-400/10`}
                            aria-label="Save name"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                            className={`${iconBtn} hover:text-white hover:bg-white/[0.06]`}
                            aria-label="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </form>
                      ) : (
                        <div className="min-w-0">
                          <div className="text-sm text-slate-100 truncate" title={client.name}>
                            {client.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {people ?? (active ? 'Active' : 'Quiet')}
                            <span className="md:hidden"> · {lastWorkLabel(s.lastDate)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Made this month */}
                    <div className="hidden md:flex items-center gap-3 min-w-0">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden relative">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-slate-500/60" style={{ width: `${(s.monthMade / maxMade) * 100}%` }} />
                        <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-400" style={{ width: `${(s.monthApproved / maxMade) * 100}%` }} />
                      </div>
                      <span className={`w-14 text-right text-xs tabular-nums ${s.monthMade ? 'text-slate-200' : 'text-slate-600'}`}>
                        {s.monthMade ? `${s.monthMade} made` : '–'}
                      </span>
                    </div>

                    <div className={`hidden md:block text-right text-sm tabular-nums ${s.monthSeconds ? 'text-slate-300' : 'text-slate-600'}`}>
                      {s.monthSeconds ? formatReportTime(s.monthSeconds) : '–'}
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-sm pl-4">
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span className={active ? 'text-slate-300' : 'text-slate-500'}>{lastWorkLabel(s.lastDate)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => handleStartEdit(client)}
                            disabled={busy}
                            className={`${iconBtn} hover:text-white hover:bg-white/[0.06]`}
                            aria-label={`Rename ${client.name}`}
                            title="Rename"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id, client.name)}
                            disabled={busy}
                            className={`${iconBtn} hover:text-rose-300 hover:bg-rose-500/10`}
                            aria-label={`Delete ${client.name}`}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
