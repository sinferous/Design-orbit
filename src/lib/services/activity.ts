import { createClient } from '@/lib/supabase/client';
import { WorkEntryWithDetails, Profile } from '@/types';
import { fetchProfiles, isAdminUser } from './work-entry';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes('your-supabase-project'));
}

function getStoredMockEntries(): WorkEntryWithDetails[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('design_orbit_local_work_entries');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return [];
}

export interface DayActivity {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number; // 1-31
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  tasksCount: number; // Number of work entries logged
  quantityDone: number; // Total units produced
  quantityApproved: number; // Total units approved
  totalSeconds: number; // Time spent in seconds
  uniqueClients: string[]; // List of client names
  entries: WorkEntryWithDetails[]; // Detailed entry records for drill-down
  intensity: 0 | 1 | 2 | 3 | 4; // GitHub-style 0-4 heat scale
}

export interface MonthlyDesignerActivity {
  profile: Profile;
  year: number;
  month: number; // 1-12
  monthName: string;
  daysInMonth: number;
  activeDaysCount: number; // "Attendance" proxy: days with at least 1 task
  totalWorkingDays: number; // Excluding Sundays or standard working days
  consistencyPercentage: number; // (activeDays / workingDays) * 100
  totalTasks: number;
  totalQuantityDone: number;
  totalQuantityApproved: number;
  totalSeconds: number;
  days: Record<string, DayActivity>; // Map from YYYY-MM-DD to DayActivity
  daysList: DayActivity[]; // Sequential list from day 1 to daysInMonth
}

export interface MonthlyTeamActivity {
  year: number;
  month: number;
  monthName: string;
  daysInMonth: number;
  totalAgencyTasks: number;
  totalAgencyQuantityDone: number;
  totalAgencyApproved: number;
  totalAgencySeconds: number;
  averageActiveDays: number;
  designers: MonthlyDesignerActivity[];
  agencyDailyTotals: Record<string, {
    dateStr: string;
    dayNumber: number;
    tasksCount: number;
    activeDesignersCount: number;
    quantityDone: number;
    quantityApproved: number;
    intensity: 0 | 1 | 2 | 3 | 4;
  }>;
}

/**
 * Calculates GitHub-style 0-4 intensity tier based on task count
 */
export function calculateHeatIntensity(tasksCount: number): 0 | 1 | 2 | 3 | 4 {
  if (tasksCount <= 0) return 0;
  if (tasksCount <= 2) return 1;
  if (tasksCount <= 4) return 2;
  if (tasksCount <= 7) return 3;
  return 4;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Formats a local date as YYYY-MM-DD
 */
function toDateStr(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Fetches all work entries for a given year & month, optionally filtered by user
 */
export async function fetchMonthWorkEntries(
  year: number,
  month: number,
  userId?: string
): Promise<WorkEntryWithDetails[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      let query = supabase
        .from('work_entries')
        .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)')
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as WorkEntryWithDetails[];
      }
    } catch (err) {
      console.warn('Supabase fetchMonthWorkEntries error:', err);
    }
  }

  // Fallback to local mock entries store
  const localEntries = getStoredMockEntries();
  return localEntries.filter(e => {
    const isWithinMonth = e.work_date >= startDate && e.work_date <= endDate;
    const isMatchingUser = userId ? e.user_id === userId : true;
    return isWithinMonth && isMatchingUser;
  });
}

/**
 * Builds a full MonthlyDesignerActivity object for a given profile and month
 */
export function buildDesignerActivity(
  profile: Profile,
  year: number,
  month: number,
  entries: WorkEntryWithDetails[]
): MonthlyDesignerActivity {
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysMap: Record<string, DayActivity> = {};
  const daysList: DayActivity[] = [];

  // Group entries by date
  const entriesByDate = new Map<string, WorkEntryWithDetails[]>();
  entries.forEach(e => {
    const list = entriesByDate.get(e.work_date) || [];
    list.push(e);
    entriesByDate.set(e.work_date, list);
  });

  let activeDaysCount = 0;
  let totalWorkingDays = 0;
  let totalTasks = 0;
  let totalQuantityDone = 0;
  let totalQuantityApproved = 0;
  let totalSeconds = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = toDateStr(year, month, day);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    // Standard working day count (Mon through Sat, Sunday off)
    if (dayOfWeek !== 0) {
      totalWorkingDays++;
    }

    const dayEntries = entriesByDate.get(dateStr) || [];
    const tasksCount = dayEntries.length;

    let qDone = 0;
    let qApproved = 0;
    let sec = 0;
    const clientSet = new Set<string>();

    dayEntries.forEach(entry => {
      qDone += entry.quantity_done || 0;
      qApproved += entry.quantity_approved || 0;
      sec += entry.time_spent_seconds || 0;
      if (entry.client?.name) {
        clientSet.add(entry.client.name.trim());
      }
    });

    if (tasksCount > 0) {
      activeDaysCount++;
    }

    totalTasks += tasksCount;
    totalQuantityDone += qDone;
    totalQuantityApproved += qApproved;
    totalSeconds += sec;

    const dayActivity: DayActivity = {
      dateStr,
      dayNumber: day,
      dayOfWeek,
      tasksCount,
      quantityDone: qDone,
      quantityApproved: qApproved,
      totalSeconds: sec,
      uniqueClients: Array.from(clientSet),
      entries: dayEntries,
      intensity: calculateHeatIntensity(tasksCount),
    };

    daysMap[dateStr] = dayActivity;
    daysList.push(dayActivity);
  }

  const consistencyPercentage = totalWorkingDays > 0
    ? Math.min(100, Math.round((activeDaysCount / totalWorkingDays) * 100))
    : 0;

  return {
    profile,
    year,
    month,
    monthName: MONTH_NAMES[month - 1],
    daysInMonth,
    activeDaysCount,
    totalWorkingDays,
    consistencyPercentage,
    totalTasks,
    totalQuantityDone,
    totalQuantityApproved,
    totalSeconds,
    days: daysMap,
    daysList,
  };
}

/**
 * Fetches monthly activity report for a single designer
 */
export async function fetchMonthlyDesignerActivity(
  year: number,
  month: number,
  userId: string
): Promise<MonthlyDesignerActivity | null> {
  const profiles = await fetchProfiles();
  const profile = profiles.find(p => p.id === userId);
  if (!profile) return null;

  const entries = await fetchMonthWorkEntries(year, month, userId);
  return buildDesignerActivity(profile, year, month, entries);
}

/**
 * Fetches aggregated monthly activity report for all creative designers (excludes Admin)
 */
export async function fetchMonthlyTeamActivity(
  year: number,
  month: number
): Promise<MonthlyTeamActivity> {
  const allProfiles = await fetchProfiles();
  const designers = allProfiles.filter(p => !isAdminUser(p));
  const allMonthEntries = await fetchMonthWorkEntries(year, month);

  const daysInMonth = new Date(year, month, 0).getDate();
  const designerActivities: MonthlyDesignerActivity[] = [];

  let totalAgencyTasks = 0;
  let totalAgencyQuantityDone = 0;
  let totalAgencyApproved = 0;
  let totalAgencySeconds = 0;

  // Initialize agency daily totals
  const agencyDailyTotals: Record<string, {
    dateStr: string;
    dayNumber: number;
    tasksCount: number;
    activeDesignersCount: number;
    quantityDone: number;
    quantityApproved: number;
    intensity: 0 | 1 | 2 | 3 | 4;
  }> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = toDateStr(year, month, day);
    agencyDailyTotals[dateStr] = {
      dateStr,
      dayNumber: day,
      tasksCount: 0,
      activeDesignersCount: 0,
      quantityDone: 0,
      quantityApproved: 0,
      intensity: 0,
    };
  }

  designers.forEach(profile => {
    const userEntries = allMonthEntries.filter(e => e.user_id === profile.id);
    const activity = buildDesignerActivity(profile, year, month, userEntries);
    designerActivities.push(activity);

    totalAgencyTasks += activity.totalTasks;
    totalAgencyQuantityDone += activity.totalQuantityDone;
    totalAgencyApproved += activity.totalQuantityApproved;
    totalAgencySeconds += activity.totalSeconds;

    // Accumulate agency daily totals
    activity.daysList.forEach(day => {
      const daily = agencyDailyTotals[day.dateStr];
      if (daily) {
        daily.tasksCount += day.tasksCount;
        daily.quantityDone += day.quantityDone;
        daily.quantityApproved += day.quantityApproved;
        if (day.tasksCount > 0) {
          daily.activeDesignersCount += 1;
        }
      }
    });
  });

  // Calculate intensity for agency totals based on team active count
  Object.values(agencyDailyTotals).forEach(day => {
    if (day.tasksCount === 0) day.intensity = 0;
    else if (day.tasksCount <= 4) day.intensity = 1;
    else if (day.tasksCount <= 9) day.intensity = 2;
    else if (day.tasksCount <= 15) day.intensity = 3;
    else day.intensity = 4;
  });

  const totalActiveDays = designerActivities.reduce((acc, d) => acc + d.activeDaysCount, 0);
  const averageActiveDays = designers.length > 0 ? Math.round(totalActiveDays / designers.length) : 0;

  return {
    year,
    month,
    monthName: MONTH_NAMES[month - 1],
    daysInMonth,
    totalAgencyTasks,
    totalAgencyQuantityDone,
    totalAgencyApproved,
    totalAgencySeconds,
    averageActiveDays,
    designers: designerActivities,
    agencyDailyTotals,
  };
}
