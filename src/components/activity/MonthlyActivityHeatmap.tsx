'use client';

import { useState } from 'react';
import {
  DayActivity,
  MonthlyDesignerActivity,
  calculateHeatIntensity,
  MONTH_NAMES
} from '@/lib/services/activity';
import { formatWorkEntryDuration } from '@/lib/services/work-entry';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Briefcase,
  Sparkles,
  X,
  ExternalLink,
  Users
} from 'lucide-react';

interface MonthlyActivityHeatmapProps {
  activity: MonthlyDesignerActivity;
  onMonthChange?: (year: number, month: number) => void;
  showDetailsModal?: boolean;
  className?: string;
}

/**
 * Returns GitHub-style background, border, and text classes for intensity 0-4
 */
export function getIntensityClass(intensity: 0 | 1 | 2 | 3 | 4): string {
  switch (intensity) {
    case 1:
      return 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800';
    case 2:
      return 'bg-emerald-300 hover:bg-emerald-400 border-emerald-400 text-emerald-950 font-semibold';
    case 3:
      return 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white font-bold shadow-2xs';
    case 4:
      return 'bg-emerald-700 hover:bg-emerald-800 border-emerald-800 text-white font-bold shadow-xs';
    case 0:
    default:
      return 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-200/60 text-slate-400';
  }
}

export function MonthlyActivityHeatmap({
  activity,
  onMonthChange,
  className = '',
}: MonthlyActivityHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    if (!onMonthChange) return;
    if (activity.month === 1) {
      onMonthChange(activity.year - 1, 12);
    } else {
      onMonthChange(activity.year, activity.month - 1);
    }
  };

  const handleNextMonth = () => {
    if (!onMonthChange) return;
    if (activity.month === 12) {
      onMonthChange(activity.year + 1, 1);
    } else {
      onMonthChange(activity.year, activity.month + 1);
    }
  };

  // Calculate calendar offset for Day 1
  // DayOfWeek: 0 = Sun, 1 = Mon, ..., 6 = Sat
  // We align columns Mon (0), Tue (1), Wed (2), Thu (3), Fri (4), Sat (5), Sun (6)
  const firstDay = activity.daysList[0];
  const firstDayOfWeek = firstDay ? firstDay.dayOfWeek : 0;
  // Convert Sun(0)->6, Mon(1)->0, Tue(2)->1, etc.
  const paddingCols = (firstDayOfWeek + 6) % 7;

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5 ${className}`}>
      {/* Header: Title, Designer Badge, Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-base shadow-sm shrink-0">
            {activity.profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {activity.profile.name}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-slate-100 text-slate-700">
                {activity.profile.designation || 'Designer'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deliverable Activity & Production Consistency Matrix
            </p>
          </div>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!onMonthChange}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 min-w-[125px] text-center">
            {activity.monthName} {activity.year}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={!onMonthChange}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Output & Consistency Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Active Output Days
          </div>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {activity.activeDaysCount}
            </span>
            <span className="text-xs text-slate-500">/ {activity.daysInMonth} d</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700">
            {activity.consistencyPercentage}% consistency
          </span>
        </div>

        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Tasks Logged
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
            {activity.totalTasks}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {activity.totalQuantityDone} deliverables produced
          </span>
        </div>

        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Deliverables Approved
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-teal-700 mt-0.5">
            {activity.totalQuantityApproved}
          </div>
          <span className="text-[11px] text-teal-600 font-semibold">
            {activity.totalQuantityDone > 0
              ? `${Math.round((activity.totalQuantityApproved / activity.totalQuantityDone) * 100)}% approval`
              : '0% approval'}
          </span>
        </div>

        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Deliverable Time
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-800 font-mono mt-0.5 truncate">
            {formatWorkEntryDuration(activity.totalSeconds)}
          </div>
          <span className="text-[11px] text-slate-500 font-medium truncate">
            Total logged hours
          </span>
        </div>
      </div>

      {/* GitHub-Style 7-Column Calendar Heatmap */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Daily Output Matrix — {activity.monthName}
          </span>
          <span className="text-[11px] text-slate-400">
            Click any day to inspect deliverables
          </span>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span className="text-rose-400">Sun</span>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Empty padding boxes before day 1 */}
          {Array.from({ length: paddingCols }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-10 sm:h-12 rounded-lg bg-slate-50/40 border border-dashed border-slate-100"
            />
          ))}

          {/* Actual days in month */}
          {activity.daysList.map((day) => {
            const isSelected = selectedDay?.dateStr === day.dateStr;
            const isSunday = day.dayOfWeek === 0;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`h-10 sm:h-12 px-2 py-1.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer relative group ${
                  getIntensityClass(day.intensity)
                } ${
                  isSelected
                    ? 'ring-2 ring-sky-500 ring-offset-1 scale-[1.03] z-10'
                    : ''
                } ${
                  isSunday && day.tasksCount === 0 ? 'opacity-40' : ''
                }`}
                title={`${day.dateStr}: ${day.tasksCount} task(s) logged, ${day.quantityDone} deliverables`}
              >
                <span className="text-xs sm:text-sm font-bold">
                  {day.dayNumber}
                </span>

                {day.tasksCount > 0 && (
                  <span className="text-[10px] sm:text-[11px] font-extrabold px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/20">
                    {day.tasksCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* GitHub-Style Legend */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span>Production Activity:</span>
          <span className="text-[11px] text-slate-400">Less</span>
          <div className="flex items-center space-x-1">
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-100 border border-slate-200" title="0 tasks (Off/Idle)" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-100 border border-emerald-300" title="1-2 tasks" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-300 border border-emerald-400" title="3-4 tasks" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500 border border-emerald-600" title="5-7 tasks" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-700 border border-emerald-800" title="8+ tasks" />
          </div>
          <span className="text-[11px] text-slate-400">More</span>
        </div>

        <div className="text-[11px] text-slate-400">
          Implicit attendance tracked automatically from daily deliverables
        </div>
      </div>

      {/* Interactive Day Drill-down Inspector */}
      {selectedDay && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Deliverables Logged on {selectedDay.dateStr}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800">
                {selectedDay.tasksCount} item{selectedDay.tasksCount === 1 ? '' : 's'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDay.entries.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 italic">
              No deliverable tasks were submitted on this date.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedDay.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-bold text-slate-900 truncate">
                        {entry.client?.name || 'Client'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {entry.work_type?.name || 'Deliverable'}
                      </span>
                      {entry.quantity_done > 0 && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          Qty: {entry.quantity_done}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] truncate">
                      {entry.description || 'Deliverable design work'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 text-right">
                    <div>
                      <div className="font-bold text-teal-700">
                        {entry.quantity_approved} app.
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatWorkEntryDuration(entry.time_spent_seconds || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact Mini Activity Heat Strip (Ideal for profile cards & table rows)
 */
export function MiniActivityHeatStrip({
  daysList,
  className = '',
}: {
  daysList: DayActivity[];
  className?: string;
}) {
  return (
    <div className={`flex items-center space-x-1 overflow-x-auto py-1 ${className}`}>
      {daysList.map((day) => (
        <div
          key={day.dateStr}
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs border shrink-0 transition-transform hover:scale-125 ${getIntensityClass(
            day.intensity
          )}`}
          title={`${day.dateStr}: ${day.tasksCount} task(s), ${day.quantityDone} created`}
        />
      ))}
    </div>
  );
}
