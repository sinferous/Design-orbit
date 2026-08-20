'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { getMonthlyReportData, exportToCSV } from '@/lib/services/reports';
import { fetchProfiles, fetchWorkTypes, fetchClients } from '@/lib/services/work-entry';
import { Profile, WorkType, Client } from '@/types';
import { Download, Calendar, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export default function MonthlyReportPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // August
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [reportData, setReportData] = useState<{
    summaries: any[];
    totalDoneAll: number;
    totalApprovedAll: number;
    overallApprovalRate: number;
  }>({
    summaries: [],
    totalDoneAll: 0,
    totalApprovedAll: 0,
    overallApprovalRate: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOptions() {
      const [pData, wtData, cData] = await Promise.all([
        fetchProfiles(),
        fetchWorkTypes(),
        fetchClients(),
      ]);
      const creativeProfiles = pData.filter(p => p.name !== 'Admin' && !p.designation?.toLowerCase().includes('administrator'));
      setProfiles(creativeProfiles);
      setWorkTypes(wtData);
      setClients(cData);
    }
    loadOptions();
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMonthlyReportData(
        selectedYear,
        selectedMonth,
        selectedUser || undefined,
        selectedWorkType || undefined,
        selectedClient || undefined
      );
      setReportData(data);
    } catch (err) {
      console.error('Failed to load monthly report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedUser, selectedWorkType, selectedClient]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  const { showToast } = useToast();

  const handleExportCSV = () => {
    const csvRows = reportData.summaries.map(s => ({
      'Work Type': s.workType.name,
      'Total Created': s.totalDone,
      'Total Approved': s.totalApproved,
      'Approval Rate (%)': `${s.approvalRate}%`,
    }));
    exportToCSV(`Monthly_Report_${selectedYear}_${selectedMonth}`, csvRows);
    showToast('Exported Monthly Report CSV successfully!', 'success');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName="Gajesh" />

      {/* Sub-Navigation for Reports */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex space-x-4 sm:space-x-6 min-w-max">
            <Link
              href="/reports/weekly"
              className="py-3 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Weekly Meeting Report
            </Link>
            <Link
              href="/reports/monthly"
              className="py-3 text-xs sm:text-sm font-bold text-sky-600 border-b-2 border-sky-600 whitespace-nowrap"
            >
              Monthly Summary
            </Link>
            <Link
              href="/reports/overall"
              className="py-3 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Overall / All-Time
            </Link>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Monthly Performance Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Aggregated monthly totals and work type distribution calculated from daily entries.
            </p>
          </div>
        </div>

        {/* Month / Year & Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Team Member
            </label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="">All Team Members</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Work Type
            </label>
            <select
              value={selectedWorkType}
              onChange={e => setSelectedWorkType(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="">All Work Types</option>
              {workTypes.map(wt => (
                <option key={wt.id} value={wt.id}>
                  {wt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Client
            </label>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Monthly Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {months.find(m => m.value === selectedMonth)?.name} Total Created
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{reportData.totalDoneAll}</div>
            <p className="text-xs text-slate-500">Deliverables produced this month</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {months.find(m => m.value === selectedMonth)?.name} Total Approved
            </div>
            <div className="text-3xl font-extrabold text-teal-700">{reportData.totalApprovedAll}</div>
            <p className="text-xs text-emerald-600 font-medium">{reportData.overallApprovalRate}% approved</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Types Active</div>
            <div className="text-3xl font-extrabold text-sky-700">
              {reportData.summaries.filter(s => s.totalDone > 0).length} / {reportData.summaries.length}
            </div>
            <p className="text-xs text-slate-500">Active deliverable categories</p>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Work Type Breakdown Table</h2>
            <span className="text-xs text-slate-500">
              {months.find(m => m.value === selectedMonth)?.name} {selectedYear}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-3 text-xs text-slate-500 font-medium">Loading monthly report...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Work Type</th>
                    <th className="px-6 py-3.5 text-right">Created Quantity</th>
                    <th className="px-6 py-3.5 text-right">Approved Quantity</th>
                    <th className="px-6 py-3.5 text-right">Approval Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {reportData.summaries.map(s => (
                    <tr key={s.workType.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{s.workType.name}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900">{s.totalDone}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-teal-700">{s.totalApproved}</td>
                      <td className="px-6 py-4 text-right font-bold text-sky-700">{s.approvalRate}%</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-extrabold text-slate-900">
                    <td className="px-6 py-4 uppercase">Total</td>
                    <td className="px-6 py-4 text-right text-slate-900">{reportData.totalDoneAll}</td>
                    <td className="px-6 py-4 text-right text-teal-700">{reportData.totalApprovedAll}</td>
                    <td className="px-6 py-4 text-right text-sky-700">{reportData.overallApprovalRate}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
