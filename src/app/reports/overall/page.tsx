'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { getOverallReportData, OverallSummaryItem, exportToCSV, formatReportTime } from '@/lib/services/reports';
import { Download, Users, Layers, Briefcase, BarChart3, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { OrbitLoader } from '@/components/ui/OrbitLoader';
import { SlideTabs } from '@/components/ui/SlideTabs';
import { ReportsSubNav } from '@/components/reports/ReportsSubNav';

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
      'Total Time Spent': formatReportTime(item.totalTimeSeconds || 0),
      'Decimal Hours': ((item.totalTimeSeconds || 0) / 3600).toFixed(2),
    }));
    exportToCSV(`Overall_Report_grouped_by_${groupBy}`, csvRows);
    showToast('Exported Overall Analytics CSV successfully!', 'success');
  };

  const grandDone = dataItems.reduce((acc, curr) => acc + curr.totalDone, 0);
  const grandApproved = dataItems.reduce((acc, curr) => acc + curr.totalApproved, 0);
  const maxDone = Math.max(...dataItems.map(i => i.totalDone), 1);

  return (
    <div className="min-h-screen flex flex-col bg-[#06080F] md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <Navbar userName="Gajesh" />

      {/* Sub-Navigation for Reports with Smooth Gliding Underline */}
      <ReportsSubNav>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
        >
          <Download className="w-4 h-4 text-violet-400" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">CSV</span>
        </button>
      </ReportsSubNav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Overall / All-Time Analytics</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Long-term aggregated performance and deliverable breakdown.
            </p>
          </div>

          {/* Grouping Switcher with Smooth Gliding Pill */}
          <SlideTabs
            options={[
              { id: 'person', label: 'By Person', icon: Users },
              { id: 'work_type', label: 'By Work Type', icon: Layers },
              { id: 'client', label: 'By Client', icon: Briefcase },
            ]}
            value={groupBy}
            onChange={(val) => setGroupBy(val as 'person' | 'work_type' | 'client')}
            size="sm"
            fullWidth={false}
            className="bg-slate-900 border border-slate-800 p-1 w-full sm:w-auto"
            pillClassName="bg-violet-600 border border-violet-500/50 shadow-2xs"
          />
        </div>

        {/* Visual Progress Bar Chart Cards */}
        <div className="bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Aggregated Distribution (Grouped by {groupBy.replace('_', ' ')})
              </h2>
              <p className="text-xs text-slate-400">
                Visual ratio of Created vs Approved items across categories
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold text-slate-300">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-violet-500 inline-block" />
                <span>Created</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
                <span>Approved</span>
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <OrbitLoader
                size="lg"
                text="Aggregating overall report data..."
                subtitle="Compiling deliverables, approval ratios, and client distributions"
              />
            </div>
          ) : (
            <div className="space-y-5">
              {dataItems.map(item => {
                const percentDone = Math.round((item.totalDone / maxDone) * 100);
                const percentApproved = item.totalDone > 0 ? Math.round((item.totalApproved / maxDone) * 100) : 0;

                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                      <span className="font-bold text-slate-100 text-sm">{item.name}</span>
                      <div className="flex items-center space-x-3 text-slate-400 font-medium">
                        <span>
                          Created: <strong className="text-slate-100 font-extrabold">{item.totalDone}</strong>
                        </span>
                        <span>
                          Approved: <strong className="text-violet-400 font-extrabold">{item.totalApproved}</strong> ({item.approvalRate}%)
                        </span>
                        {(item.totalTimeSeconds || 0) > 0 && (
                          <span className="text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 font-mono font-bold flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{formatReportTime(item.totalTimeSeconds || 0)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex relative">
                      <div
                        className="h-full bg-violet-500 rounded-l-full transition-all duration-500"
                        style={{ width: `${percentDone}%` }}
                      />
                      <div
                        className="h-full bg-indigo-500 rounded-r-full -ml-1 transition-all duration-500 opacity-90"
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
