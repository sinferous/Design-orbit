'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { getMonthlyReportData, exportToCSV, formatReportTime } from '@/lib/services/reports';
import { fetchProfiles, fetchWorkTypes, fetchClients } from '@/lib/services/work-entry';
import { Profile, WorkType, Client } from '@/types';
import { Download, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { RichSelect } from '@/components/ui/RichSelect';

export default function MonthlyReportPage() {
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
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
    totalTimeSecondsAll: number;
  }>({
    summaries: [],
    totalDoneAll: 0,
    totalApprovedAll: 0,
    overallApprovalRate: 0,
    totalTimeSecondsAll: 0,
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
      'Time Spent': formatReportTime(s.totalTimeSeconds || 0),
      'Decimal Hours': ((s.totalTimeSeconds || 0) / 3600).toFixed(2),
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
            <Link
              href="/reports/billing"
              className="py-3 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Client Time Tracking
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Monthly Performance Report</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Aggregated monthly totals and work type distribution calculated from daily entries.
            </p>
          </div>
        </div>

        {/* Month / Year & Filters Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Month
            </label>
            <RichSelect
              value={selectedMonth}
              onChange={val => setSelectedMonth(Number(val))}
              options={months.map(m => ({ value: m.value, label: m.name }))}
              size="sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Year
            </label>
            <RichSelect
              value={selectedYear}
              onChange={val => setSelectedYear(Number(val))}
              options={Array.from(new Set([new Date().getFullYear(), new Date().getFullYear() - 1, 2026, 2025]))
                .sort((a, b) => b - a)
                .map(y => ({ value: y, label: String(y) }))}
              size="sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Team Member
            </label>
            <RichSelect
              value={selectedUser}
              onChange={val => setSelectedUser(String(val))}
              options={[
                { value: '', label: 'All Team Members' },
                ...profiles.map(p => ({
                  value: p.id,
                  label: p.name,
                })),
              ]}
              size="sm"
              placeholder="All Team Members"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Work Type
            </label>
            <RichSelect
              value={selectedWorkType}
              onChange={val => setSelectedWorkType(String(val))}
              options={[
                { value: '', label: 'All Work Types' },
                ...workTypes.map(wt => ({ value: wt.id, label: wt.name })),
              ]}
              size="sm"
              placeholder="All Work Types"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Client
            </label>
            <RichSelect
              value={selectedClient}
              onChange={val => setSelectedClient(String(val))}
              options={[
                { value: '', label: 'All Clients' },
                ...clients.map(c => ({ value: c.id, label: c.name })),
              ]}
              size="sm"
              searchable
              placeholder="All Clients"
            />
          </div>
        </div>

        {/* Monthly Summary Statistics - 2x2 Grid on Mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              {months.find(m => m.value === selectedMonth)?.name} Created
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{reportData.totalDoneAll}</div>
            <p className="text-[11px] sm:text-xs text-slate-400 sm:text-slate-500 truncate">Items this month</p>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              {months.find(m => m.value === selectedMonth)?.name} Approved
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-700">{reportData.totalApprovedAll}</div>
            <p className="text-[11px] sm:text-xs text-emerald-600 font-medium truncate">{reportData.overallApprovalRate}% approved</p>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Time Logged</div>
            <div className="text-xl sm:text-3xl font-extrabold text-amber-700 flex items-center space-x-1 sm:space-x-1.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="truncate">{formatReportTime(reportData.totalTimeSecondsAll || 0)}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 sm:text-slate-500 truncate">
              {((reportData.totalTimeSecondsAll || 0) / 3600).toFixed(1)} decimal hrs
            </p>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Active Categories</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-700">
              {reportData.summaries.filter(s => s.totalDone > 0).length} / {reportData.summaries.length}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 sm:text-slate-500 truncate">Work types active</p>
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
                    <th className="px-6 py-3.5 text-right">Time Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {reportData.summaries.map(s => (
                    <tr key={s.workType.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{s.workType.name}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900">{s.totalDone}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-teal-700">{s.totalApproved}</td>
                      <td className="px-6 py-4 text-right font-bold text-sky-700">{s.approvalRate}%</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-amber-800">
                        {formatReportTime(s.totalTimeSeconds || 0)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-extrabold text-slate-900">
                    <td className="px-6 py-4 uppercase">Total</td>
                    <td className="px-6 py-4 text-right text-slate-900">{reportData.totalDoneAll}</td>
                    <td className="px-6 py-4 text-right text-teal-700">{reportData.totalApprovedAll}</td>
                    <td className="px-6 py-4 text-right text-sky-700">{reportData.overallApprovalRate}%</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-amber-800">
                      {formatReportTime(reportData.totalTimeSecondsAll || 0)}
                    </td>
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
