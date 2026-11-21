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
import { OrbitLoader } from '@/components/ui/OrbitLoader';
import { ReportsSubNav } from '@/components/reports/ReportsSubNav';

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
    showToast('Monthly report CSV exported', 'success');
  };

  const monthName = months.find(m => m.value === selectedMonth)?.name || '';
  const activeTypes = reportData.summaries.filter(s => s.totalDone > 0).length;
  const rows = [...reportData.summaries].sort((a, b) => b.totalDone - a.totalDone);
  const maxDone = Math.max(1, ...rows.map(r => r.totalDone));

  const filterLabel = 'block text-xs text-slate-500 mb-1.5';

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0c0b] md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <Navbar />

      <ReportsSubNav>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs text-slate-300 hover:text-white rounded-lg border border-white/[0.08] hover:bg-white/[0.05] transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          Export CSV
        </button>
      </ReportsSubNav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-slate-50">
            {monthName} {selectedYear}
          </h1>
          <p className="text-sm text-slate-400 mt-1">Monthly totals by work type</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className={filterLabel}>Month</label>
            <RichSelect
              value={selectedMonth}
              onChange={val => setSelectedMonth(Number(val))}
              options={months.map(m => ({ value: m.value, label: m.name }))}
              size="sm"
            />
          </div>
          <div>
            <label className={filterLabel}>Year</label>
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
            <label className={filterLabel}>Person</label>
            <RichSelect
              value={selectedUser}
              onChange={val => setSelectedUser(String(val))}
              options={[{ value: '', label: 'Everyone' }, ...profiles.map(p => ({ value: p.id, label: p.name }))]}
              size="sm"
              placeholder="Everyone"
            />
          </div>
          <div>
            <label className={filterLabel}>Work type</label>
            <RichSelect
              value={selectedWorkType}
              onChange={val => setSelectedWorkType(String(val))}
              options={[{ value: '', label: 'All types' }, ...workTypes.map(wt => ({ value: wt.id, label: wt.name }))]}
              size="sm"
              placeholder="All types"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className={filterLabel}>Client</label>
            <RichSelect
              value={selectedClient}
              onChange={val => setSelectedClient(String(val))}
              options={[{ value: '', label: 'All clients' }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
              size="sm"
              searchable
              placeholder="All clients"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="bento-card grid grid-cols-2 lg:grid-cols-4 [&>*]:border-white/[0.06] [&>*:nth-child(even)]:border-l lg:[&>*:not(:first-child)]:border-l [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0">
          <div className="p-5">
            <div className="text-xs text-slate-500">Deliverables</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums">{reportData.totalDoneAll}</div>
            <div className="mt-1 text-xs text-slate-500">in {monthName}</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Approved</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-emerald-400 tabular-nums">{reportData.totalApprovedAll}</div>
            <div className="mt-1 text-xs text-slate-500">{reportData.overallApprovalRate}% of deliverables</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Time tracked</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums truncate">
              {formatReportTime(reportData.totalTimeSecondsAll || 0)}
            </div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">
              {((reportData.totalTimeSecondsAll || 0) / 3600).toFixed(1)} hours
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Work types used</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums">
              {activeTypes}
              <span className="text-lg text-slate-500"> / {reportData.summaries.length}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">had work this month</div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bento-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-slate-100">By work type</h2>
            <span className="text-xs text-slate-500">Most made first</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <OrbitLoader size="lg" text="Loading the month" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-5 py-3 font-normal">Work type</th>
                    <th className="px-5 py-3 font-normal w-[34%] hidden md:table-cell"></th>
                    <th className="px-5 py-3 font-normal text-right">Made</th>
                    <th className="px-5 py-3 font-normal text-right">Approved</th>
                    <th className="px-5 py-3 font-normal text-right">Rate</th>
                    <th className="px-5 py-3 font-normal text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] tabular-nums">
                  {rows.map(s => {
                    const empty = s.totalDone === 0;
                    return (
                      <tr key={s.workType.id} className={empty ? 'text-slate-600' : 'text-slate-300 hover:bg-white/[0.015]'}>
                        <td className={`px-5 py-3 ${empty ? '' : 'text-slate-100'}`}>{s.workType.name}</td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          {!empty && (
                            <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden relative">
                              <div className="absolute inset-y-0 left-0 rounded-full bg-slate-500/60" style={{ width: `${(s.totalDone / maxDone) * 100}%` }} />
                              <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-400" style={{ width: `${(s.totalApproved / maxDone) * 100}%` }} />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">{s.totalDone}</td>
                        <td className={`px-5 py-3 text-right ${empty ? '' : 'text-emerald-400'}`}>{s.totalApproved}</td>
                        <td className="px-5 py-3 text-right">{empty ? '–' : `${s.approvalRate}%`}</td>
                        <td className="px-5 py-3 text-right">{s.totalTimeSeconds ? formatReportTime(s.totalTimeSeconds) : '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="tabular-nums">
                  <tr className="border-t border-white/[0.08] text-slate-100">
                    <td className="px-5 py-3.5 font-medium">Total</td>
                    <td className="hidden md:table-cell" />
                    <td className="px-5 py-3.5 text-right">{reportData.totalDoneAll}</td>
                    <td className="px-5 py-3.5 text-right text-emerald-400">{reportData.totalApprovedAll}</td>
                    <td className="px-5 py-3.5 text-right">{reportData.overallApprovalRate}%</td>
                    <td className="px-5 py-3.5 text-right">{formatReportTime(reportData.totalTimeSecondsAll || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
