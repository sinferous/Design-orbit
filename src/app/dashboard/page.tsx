'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { fetchWorkEntriesByDate, getLoggedInUser } from '@/lib/services/work-entry';
import { getWeeklyReportData, getWeekRange } from '@/lib/services/reports';
import { WorkEntryWithDetails } from '@/types';
import { Plus, CheckCircle2, Clock, CalendarDays, ArrowUpRight, BarChart2, Layers, Users, PieChart, Sparkles, User } from 'lucide-react';

export default function DashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [todayEntries, setTodayEntries] = useState<WorkEntryWithDetails[]>([]);
  const [weekSummary, setWeekSummary] = useState({ totalCreated: 0, totalApproved: 0, activeMembers: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({ name: 'Team Member', email: '' });

  const [greeting, setGreeting] = useState('Good day');

  useEffect(() => {
    const user = getLoggedInUser();
    if (user?.name) {
      setCurrentUser(user);
    }

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17 && hour < 22) setGreeting('Good evening');
    else setGreeting('Good night');

    async function loadDashboardData() {
      try {
        const week = getWeekRange(new Date());
        const [tEntries, wData] = await Promise.all([
          fetchWorkEntriesByDate(todayStr),
          getWeeklyReportData(week.startDate, week.endDate),
        ]);

        setTodayEntries(tEntries);

        const wCreated = wData.reduce((acc, curr) => acc + curr.totalCreated, 0);
        const wApproved = wData.reduce((acc, curr) => acc + curr.totalApproved, 0);
        const wActive = wData.filter(s => s.totalCreated > 0).length;

        setWeekSummary({
          totalCreated: wCreated,
          totalApproved: wApproved,
          activeMembers: wActive,
        });
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

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
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Webtree Creative Team</span>
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">Creative Team Member</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1.5">
              {greeting}, {currentUser.name} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Here is your live daily activity and weekly work summary.
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
              <span className="text-xs font-semibold uppercase tracking-wider">Active Contributors</span>
              <Users className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-3xl font-extrabold text-sky-700">{weekSummary.activeMembers}</div>
            <p className="text-xs text-slate-500">Team members logging work</p>
          </div>
        </div>

        {/* Live Entries & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Work Activity */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Today's Work Log</h2>
                <p className="text-xs text-slate-500">Deliverables created and approved today</p>
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
              <div className="p-8 text-center">
                <div className="animate-spin w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-xs text-slate-400">Loading today's activity...</p>
              </div>
            ) : todayEntries.length === 0 ? (
              <div className="p-8 text-center space-y-3 bg-slate-50/50 rounded-lg border border-slate-100">
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
              <div className="space-y-3">
                {todayEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {entry.profile && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                          <User className="w-3 h-3 text-teal-600" />
                          <span>By {entry.profile.name}</span>
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

                    <div className="flex items-center space-x-4 shrink-0 text-slate-700">
                      <span>Done: <strong>{entry.quantity_done}</strong></span>
                      <span>Approved: <strong className="text-teal-700">{entry.quantity_approved}</strong></span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {entry.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Core App Navigation Panel */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Application Navigation</h2>
            <div className="space-y-2.5">
              <Link
                href="/work/new"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span className="text-sm font-semibold text-slate-800">Add Daily Work Entry</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
              </Link>

              <Link
                href="/work"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <CalendarDays className="w-4 h-4 text-sky-600" />
                  <span className="text-sm font-semibold text-slate-800">My Daily Work Log</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
              </Link>

              <Link
                href="/reports/weekly"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <BarChart2 className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-semibold text-slate-800">Weekly Meeting Report</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </Link>

              <Link
                href="/reports/monthly"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <PieChart className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-semibold text-slate-800">Monthly Performance</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </Link>

              <Link
                href="/team"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span className="text-sm font-semibold text-slate-800">Team Directory</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
