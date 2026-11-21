'use client';

import { useState } from 'react';
import { DayActivity, MonthlyDesignerActivity } from '@/lib/services/activity';
import { formatWorkEntryDuration } from '@/lib/services/work-entry';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MonthlyActivityHeatmapProps {
  activity: MonthlyDesignerActivity;
  onMonthChange?: (year: number, month: number) => void;
  showDetailsModal?: boolean;
  showProfileHeader?: boolean;
  className?: string;
}

/**
 * Background and text classes for heat intensity 0-4 (green scale).
 */
export function getIntensityClass(intensity: 0 | 1 | 2 | 3 | 4): string {
  switch (intensity) {
    case 1:
      return 'bg-emerald-400/10 hover:bg-emerald-400/15 border-transparent text-emerald-200';
    case 2:
      return 'bg-emerald-400/25 hover:bg-emerald-400/30 border-transparent text-emerald-100';
    case 3:
      return 'bg-emerald-400/50 hover:bg-emerald-400/60 border-transparent text-white';
    case 4:
      return 'bg-emerald-400 hover:bg-emerald-300 border-transparent text-[#0b1410]';
    case 0:
    default:
      return 'bg-white/[0.03] hover:bg-white/[0.06] border-transparent text-slate-500';
  }
}

function longDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function MonthlyActivityHeatmap({
  activity,
  onMonthChange,
  showProfileHeader = true,
  className = '',
}: MonthlyActivityHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);

  const handlePrevMonth = () => {
    if (!onMonthChange) return;
    setSelectedDay(null);
    if (activity.month === 1) onMonthChange(activity.year - 1, 12);
    else onMonthChange(activity.year, activity.month - 1);
  };

  const handleNextMonth = () => {
    if (!onMonthChange) return;
    setSelectedDay(null);
    if (activity.month === 12) onMonthChange(activity.year + 1, 1);
    else onMonthChange(activity.year, activity.month + 1);
  };

  // Monday-first calendar offset for day 1
  const firstDay = activity.daysList[0];
  const firstDayOfWeek = firstDay ? firstDay.dayOfWeek : 0;
  const paddingCols = (firstDayOfWeek + 6) % 7;

  const approvalRate =
    activity.totalQuantityDone > 0
      ? Math.round((activity.totalQuantityApproved / activity.totalQuantityDone) * 100)
      : 0;

  const navBtn =
    'inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer';

  return (
    <div className={`bento-card p-5 sm:p-6 space-y-6 text-slate-100 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {showProfileHeader ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 font-display flex items-center justify-center">
              {activity.profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-medium text-slate-50 truncate">{activity.profile.name}</h3>
              <p className="text-sm text-slate-500 truncate">{activity.profile.designation || 'Designer'}</p>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-medium text-slate-100">Your month</h3>
            <p className="text-sm text-slate-500 mt-0.5">Each square is a day. Greener means more made.</p>
          </div>
        )}

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button type="button" onClick={handlePrevMonth} disabled={!onMonthChange} className={navBtn} aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[128px] text-center text-sm text-slate-200 tabular-nums">
            {activity.monthName} {activity.year}
          </span>
          <button type="button" onClick={handleNextMonth} disabled={!onMonthChange} className={navBtn} aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 rounded-xl border border-white/[0.06] py-4 [&>*]:px-4 [&>*:not(:first-child)]:sm:border-l [&>*:nth-child(even)]:border-l [&>*]:border-white/[0.06]">
        <div>
          <div className="text-xs text-slate-500">Days with work</div>
          <div className="mt-1 font-display text-2xl font-medium text-white tabular-nums">
            {activity.activeDaysCount}
            <span className="text-base text-slate-500"> / {activity.daysInMonth}</span>
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{activity.consistencyPercentage}% of the month</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Made</div>
          <div className="mt-1 font-display text-2xl font-medium text-white tabular-nums">{activity.totalQuantityDone}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            in {activity.totalTasks} {activity.totalTasks === 1 ? 'entry' : 'entries'}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Approved</div>
          <div className="mt-1 font-display text-2xl font-medium text-emerald-400 tabular-nums">{activity.totalQuantityApproved}</div>
          <div className="mt-0.5 text-xs text-slate-500">{approvalRate}% of made</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Time tracked</div>
          <div className="mt-1 font-display text-2xl font-medium text-white tabular-nums truncate">
            {formatWorkEntryDuration(activity.totalSeconds)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">on timers</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-slate-500">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: paddingCols }).map((_, i) => (
            <div key={`empty-${i}`} className="h-11 sm:h-14" />
          ))}

          {activity.daysList.map(day => {
            const isSelected = selectedDay?.dateStr === day.dateStr;
            const hasWork = day.quantityDone > 0 || day.tasksCount > 0;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`h-11 sm:h-14 p-1.5 sm:p-2 rounded-md border flex flex-col justify-between text-left transition-colors cursor-pointer ${getIntensityClass(
                  day.intensity
                )} ${isSelected ? 'ring-1 ring-white/70 ring-offset-2 ring-offset-[#141413]' : ''}`}
                title={`${longDate(day.dateStr)}: ${day.quantityDone} made`}
                aria-pressed={isSelected}
              >
                <span className="text-[11px] tabular-nums leading-none opacity-80">{day.dayNumber}</span>
                {hasWork && (
                  <span className="self-end font-display text-sm sm:text-base leading-none tabular-nums">{day.quantityDone}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {([0, 1, 2, 3, 4] as const).map(n => (
              <span key={n} className={`w-3 h-3 rounded-[3px] ${getIntensityClass(n).split(' ')[0]}`} />
            ))}
          </div>
          <span>More</span>
        </div>
        <span>Click a day to see what was made</span>
      </div>

      {/* Day detail */}
      {selectedDay && (
        <div className="rounded-xl border border-white/[0.06] bg-black/20 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-slate-100">{longDate(selectedDay.dateStr)}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedDay.quantityDone} made · {selectedDay.tasksCount} {selectedDay.tasksCount === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Close day"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDay.entries.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing logged this day</p>
          ) : (
            <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
              {selectedDay.entries.map(entry => (
                <div key={entry.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-100 truncate">{entry.description || 'Untitled task'}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {entry.client?.name || 'Client'} · {entry.work_type?.name || 'Task'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs tabular-nums">
                    <div>
                      <span className="text-emerald-400">{entry.quantity_approved}</span>
                      <span className="text-slate-500"> / {entry.quantity_done} approved</span>
                    </div>
                    {(entry.time_spent_seconds || 0) > 0 && (
                      <div className="text-slate-500 mt-0.5">{formatWorkEntryDuration(entry.time_spent_seconds || 0)}</div>
                    )}
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
 * Compact mini heat strip (profile cards and table rows)
 */
export function MiniActivityHeatStrip({
  daysList,
  className = '',
}: {
  daysList: DayActivity[];
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 overflow-x-auto py-1 ${className}`}>
      {daysList.map(day => (
        <div
          key={day.dateStr}
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] border shrink-0 ${getIntensityClass(day.intensity)}`}
          title={`${day.dateStr}: ${day.quantityDone} made`}
        />
      ))}
    </div>
  );
}
