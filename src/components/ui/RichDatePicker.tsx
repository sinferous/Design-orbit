'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichDatePickerProps {
  value: string; // Format: "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function RichDatePicker({
  value,
  onChange,
  label,
  className,
  size = 'sm',
  disabled = false,
}: RichDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse local date safely without timezone shifting
  const parseDate = (dStr: string): Date => {
    if (!dStr) return new Date();
    const parts = dStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    }
    return new Date();
  };

  const formatDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const selectedDateObj = parseDate(value);
  const [viewDate, setViewDate] = useState<Date>(() => parseDate(value));

  // Sync viewDate when value changes from outside
  useEffect(() => {
    if (value) {
      setViewDate(parseDate(value));
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleMonthDelta = (delta: number) => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1, 12, 0, 0);
    setViewDate(next);
  };

  const handleSelectDay = (dayDate: Date) => {
    const formatted = formatDateStr(dayDate);
    onChange(formatted);
    setIsOpen(false);
  };

  // Generate calendar days (Monday-first grid)
  const generateDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday-based offset (0 for Mon, 6 for Sun)
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i, 12, 0, 0),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push({
        date: new Date(year, month, i, 12, 0, 0),
        isCurrentMonth: true,
      });
    }

    // Next month filler days to complete 42 grid cells (6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i, 12, 0, 0),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const todayStr = formatDateStr(new Date());

  const getDisplayLabel = () => {
    if (!value) return 'Select date';
    const isToday = value === todayStr;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = value === formatDateStr(yesterday);

    const d = selectedDateObj;
    const formattedDate = d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (isToday) return `Today, ${formattedDate}`;
    if (isYesterday) return `Yesterday, ${formattedDate}`;
    return formattedDate;
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setViewDate(parseDate(value));
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          'flex items-center space-x-2 bg-slate-900 border border-slate-700 hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all rounded-lg text-slate-100 shadow-sm cursor-pointer select-none font-bold',
          size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-4 py-2.5 text-base' : 'px-3.5 py-2 text-sm',
          isOpen && 'border-violet-500 ring-2 ring-violet-500/30',
          disabled && 'opacity-60 bg-slate-950 cursor-not-allowed border-slate-800 text-slate-500'
        )}
      >
        <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <span className="truncate">{getDisplayLabel()}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180 text-violet-400'
          )}
        />
      </button>

      {/* Popover Dropdown Calendar */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/80 p-4 w-[300px] sm:w-[320px] space-y-3 animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <button
              type="button"
              onClick={() => handleMonthDelta(-1)}
              className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-100 tracking-wide">
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => handleMonthDelta(1)}
              className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-0.5">
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
            <span>Su</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {generateDays().map((dayObj, idx) => {
              const dStr = formatDateStr(dayObj.date);
              const isSelected = dStr === value;
              const isToday = dStr === todayStr;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(dayObj.date)}
                  className={cn(
                    'h-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer select-none',
                    isSelected
                      ? 'bg-violet-600 text-white font-extrabold shadow-sm scale-105'
                      : isToday
                      ? 'border border-violet-500 text-violet-300 bg-violet-950/60 font-bold hover:bg-violet-900/60'
                      : dayObj.isCurrentMonth
                      ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-800/40 hover:text-slate-400'
                  )}
                >
                  {dayObj.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Quick Preset Shortcuts */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-xs">
            <div className="flex space-x-1.5">
              <button
                type="button"
                onClick={() => {
                  onChange(todayStr);
                  setIsOpen(false);
                }}
                className={cn(
                  'px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer',
                  value === todayStr
                    ? 'bg-violet-950 text-violet-300 border border-violet-800'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  onChange(formatDateStr(y));
                  setIsOpen(false);
                }}
                className={cn(
                  'px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer',
                  (() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    return value === formatDateStr(y);
                  })()
                    ? 'bg-violet-950 text-violet-300 border border-violet-800'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                )}
              >
                Yesterday
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 px-1.5 py-0.5 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
