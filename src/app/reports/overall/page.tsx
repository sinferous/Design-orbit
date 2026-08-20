'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { getOverallReportData, OverallSummaryItem, exportToCSV } from '@/lib/services/reports';
import { Download, Users, Layers, Briefcase, BarChart3 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export default function OverallReportPage() {
  const [groupBy, setGroupBy] = useState<'person' | 'work_type' | 'client'>('person');
  const [dataItems, setDataItems] = useState<OverallSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOverallReportData(groupBy);
      setDataItems(data);
    } catch {
      showToast('Failed to load overall report.', 'error');
    } finally {
      setLoading(false);
    }
  }, [groupBy]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportCSV = () => {
    const csvRows = dataItems.map(item => ({
      'Name': item.name,
      'Category': item.category || groupBy,
      'Total Created': item.totalDone,
      'Total Approved': item.totalApproved,
      'Approval Rate (%)': `${item.approvalRate}%`,
    }));
    exportToCSV(`Overall_Report_grouped_by_${groupBy}`, csvRows);
    showToast('Exported Overall Analytics CSV successfully!', 'success');
  };

  const grandDone = dataItems.reduce((acc, curr) => acc + curr.totalDone, 0);
  const grandApproved = dataItems.reduce((acc, curr) => acc + curr.totalApproved, 0);
  const maxDone = Math.max(...dataItems.map(i => i.totalDone), 1);

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
              className="py-3 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Monthly Summary
            </Link>
            <Link
              href="/reports/overall"
              className="py-3 text-xs sm:text-sm font-bold text-sky-600 border-b-2 border-sky-600 whitespace-nowrap"
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Overall / All-Time Analytics</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Long-term aggregated performance and deliverable breakdown.
            </p>
          </div>

          {/* Grouping Switcher Buttons */}
          <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setGroupBy('person')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                groupBy === 'person'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>By Person</span>
            </button>

            <button
              onClick={() => setGroupBy('work_type')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                groupBy === 'work_type'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Work Type</span>
            </button>

            <button
              onClick={() => setGroupBy('client')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                groupBy === 'client'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>By Client</span>
            </button>
          </div>
        </div>

        {/* Visual Progress Bar Chart Cards */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Aggregated Distribution (Grouped by {groupBy.replace('_', ' ')})
              </h2>
              <p className="text-xs text-slate-500">
                Visual ratio of Created vs Approved items across categories
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                <span>Created</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" />
                <span>Approved</span>
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-3 text-xs text-slate-500 font-medium">Aggregating overall report data...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {dataItems.map(item => {
                const percentDone = Math.round((item.totalDone / maxDone) * 100);
                const percentApproved = item.totalDone > 0 ? Math.round((item.totalApproved / maxDone) * 100) : 0;

                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                      <span className="text-slate-600 font-medium">
                        Created: <strong className="text-slate-900 font-extrabold">{item.totalDone}</strong> | Approved:{' '}
                        <strong className="text-teal-700 font-extrabold">{item.totalApproved}</strong> ({item.approvalRate}%)
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex relative">
                      <div
                        className="h-full bg-sky-500 rounded-l-full transition-all duration-500"
                        style={{ width: `${percentDone}%` }}
                      />
                      <div
                        className="h-full bg-teal-500 rounded-r-full -ml-1 transition-all duration-500 opacity-90"
                        style={{ width: `${percentApproved}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
