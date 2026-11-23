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
      showToast('Could not load the totals. Try again.', 'error');
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
    showToast('Overall analytics CSV exported', 'success');
  };

  const grandDone = dataItems.reduce((acc, curr) => acc + curr.totalDone, 0);
  const grandApproved = dataItems.reduce((acc, curr) => acc + curr.totalApproved, 0);
  const maxDone = Math.max(...dataItems.map(i => i.totalDone), 1);

  const grandRate = grandDone > 0 ? Math.round((grandApproved / grandDone) * 100) : 0;
  const grandSeconds = dataItems.reduce((acc, curr) => acc + (curr.totalTimeSeconds || 0), 0);
  const sorted = [...dataItems].sort((a, b) => b.totalDone - a.totalDone);
  const groupNoun = groupBy === 'person' ? 'people' : groupBy === 'client' ? 'clients' : 'work types';

  return (
    <div className="min-h-screen flex flex-col md:pl-64 lg:pl-68 pt-14 md:pt-0">
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium text-slate-50">All time</h1>
            <p className="text-sm text-slate-400 mt-1">Everything the team has logged, by {groupNoun}</p>
          </div>

          <SlideTabs
            options={[
              { id: 'person', label: 'People', icon: Users },
              { id: 'work_type', label: 'Work types', icon: Layers },
              { id: 'client', label: 'Clients', icon: Briefcase },
            ]}
            value={groupBy}
            onChange={(val) => setGroupBy(val as 'person' | 'work_type' | 'client')}
            size="sm"
            fullWidth={false}
            className="bg-white/[0.03] border border-white/[0.06] p-1 w-full sm:w-auto"
            pillClassName="bg-white/[0.08] border border-white/[0.08]"
          />
        </div>

        {/* Totals */}
        <div className="bento-card grid grid-cols-3 divide-x divide-white/[0.06]">
          <div className="p-5">
            <div className="text-xs text-slate-500">Deliverables</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums">{grandDone}</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Approved</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-emerald-400 tabular-nums">
              {grandApproved}
              <span className="text-base text-slate-500"> · {grandRate}%</span>
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Time tracked</div>
            <div className="mt-1.5 font-display text-3xl font-medium text-white tabular-nums truncate">{formatReportTime(grandSeconds)}</div>
          </div>
        </div>

        {/* Ranking */}
        <div className="bento-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-slate-100 capitalize">{groupNoun}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 rounded-full bg-slate-500/60" /> Made
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 rounded-full bg-emerald-400" /> Approved
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <OrbitLoader size="lg" text="Loading all-time totals" />
            </div>
          ) : sorted.length === 0 ? (
            <p className="p-12 text-center text-sm text-slate-500">Nothing logged yet</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {sorted.map((item, i) => {
                const pctDone = (item.totalDone / maxDone) * 100;
                const pctApproved = (item.totalApproved / maxDone) * 100;
                return (
                  <div key={item.id} className="px-5 py-3.5 grid grid-cols-[24px_minmax(0,1fr)] md:grid-cols-[24px_minmax(0,200px)_minmax(0,1fr)_330px] items-center gap-x-4 gap-y-2">
                    <span className="text-xs text-slate-600 tabular-nums">{i + 1}</span>
                    <span className="text-sm text-slate-100 truncate">{item.name}</span>
                    <div className="col-start-2 md:col-start-auto h-1.5 rounded-full bg-white/[0.05] overflow-hidden relative">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-slate-500/60" style={{ width: `${pctDone}%` }} />
                      <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-400" style={{ width: `${pctApproved}%` }} />
                    </div>
                    <div className="col-start-2 md:col-start-auto flex items-center gap-4 text-xs text-slate-500 tabular-nums md:justify-end">
                      <span><span className="text-slate-100">{item.totalDone}</span> made</span>
                      <span><span className="text-emerald-400">{item.totalApproved}</span> approved · {item.approvalRate}%</span>
                      {(item.totalTimeSeconds || 0) > 0 && <span>{formatReportTime(item.totalTimeSeconds || 0)}</span>}
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
