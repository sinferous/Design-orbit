'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MonthlyDesignerActivity,
  fetchMonthlyDesignerActivity
} from '@/lib/services/activity';
import { MonthlyActivityHeatmap } from './MonthlyActivityHeatmap';
import { X, Sparkles } from 'lucide-react';

interface DesignerActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialYear?: number;
  initialMonth?: number;
}

export function DesignerActivityModal({
  isOpen,
  onClose,
  userId,
  initialYear = new Date().getFullYear(),
  initialMonth = new Date().getMonth() + 1,
}: DesignerActivityModalProps) {
  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [activity, setActivity] = useState<MonthlyDesignerActivity | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchMonthlyDesignerActivity(year, month, userId);
      setActivity(data);
    } catch (err) {
      console.error('Failed to load designer activity:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month, userId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 z-10 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Designer Deliverable & Activity Matrix
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-xs text-slate-500 font-medium">
              Loading deliverable activity matrix...
            </p>
          </div>
        ) : activity ? (
          <MonthlyActivityHeatmap
            activity={activity}
            onMonthChange={(y, m) => {
              setYear(y);
              setMonth(m);
            }}
          />
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            No designer profile data available.
          </div>
        )}
      </div>
    </div>
  );
}
