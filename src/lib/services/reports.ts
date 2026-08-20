import { fetchWorkEntriesByDate, fetchProfiles, fetchWorkTypes, fetchClients } from './work-entry';
import { WorkEntryWithDetails, Profile, WorkType, Client } from '@/types';

export interface WeeklyUserSummary {
  profile: Profile;
  totalCreated: number;
  totalApproved: number;
  approvalRate: number;
  workTypeBreakdown: Record<string, { done: number; approved: number }>;
  entries: WorkEntryWithDetails[];
  weeklyBestWorkUrl?: string;
}

export interface MonthlyWorkTypeSummary {
  workType: WorkType;
  totalDone: number;
  totalApproved: number;
  approvalRate: number;
}

export interface OverallSummaryItem {
  id: string;
  name: string;
  category?: string;
  totalDone: number;
  totalApproved: number;
  approvalRate: number;
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          const val = row[header] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility to calculate start and end of week (Monday to Sunday)
export function getWeekRange(dateInput: Date = new Date()) {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
    label: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
  };
}

export async function getWeeklyReportData(startDateStr: string, endDateStr: string): Promise<WeeklyUserSummary[]> {
  const profiles = await fetchProfiles();
  const workTypes = await fetchWorkTypes();

  // Fetch entries for all dates in the range
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const allEntries: WorkEntryWithDetails[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split('T')[0];
    const dayEntries = await fetchWorkEntriesByDate(dStr);
    allEntries.push(...dayEntries);
  }

  // Aggregate by profile
  const userSummaries: WeeklyUserSummary[] = profiles.map(profile => {
    const userEntries = allEntries.filter(e => e.user_id === profile.id);
    const totalCreated = userEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
    const totalApproved = userEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
    const approvalRate = totalCreated > 0 ? Math.round((totalApproved / totalCreated) * 100) : 0;

    const breakdown: Record<string, { done: number; approved: number }> = {};
    workTypes.forEach(wt => {
      breakdown[wt.name] = { done: 0, approved: 0 };
    });

    userEntries.forEach(entry => {
      const wtName = entry.work_type?.name || 'Other';
      if (!breakdown[wtName]) breakdown[wtName] = { done: 0, approved: 0 };
      breakdown[wtName].done += entry.quantity_done;
      breakdown[wtName].approved += entry.quantity_approved;
    });

    return {
      profile,
      totalCreated,
      totalApproved,
      approvalRate,
      workTypeBreakdown: breakdown,
      entries: userEntries,
      weeklyBestWorkUrl: '',
    };
  });

  return userSummaries;
}

export async function getMonthlyReportData(year: number, month: number, userIdFilter?: string, workTypeIdFilter?: string, clientIdFilter?: string) {
  const workTypes = await fetchWorkTypes();
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  let monthEntries: WorkEntryWithDetails[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split('T')[0];
    const dayEntries = await fetchWorkEntriesByDate(dStr, userIdFilter || undefined);
    monthEntries.push(...dayEntries);
  }

  if (workTypeIdFilter) {
    monthEntries = monthEntries.filter(e => e.work_type_id === workTypeIdFilter);
  }
  if (clientIdFilter) {
    monthEntries = monthEntries.filter(e => e.client_id === clientIdFilter);
  }

  const summaries: MonthlyWorkTypeSummary[] = workTypes.map(wt => {
    const typeEntries = monthEntries.filter(e => e.work_type_id === wt.id);
    const totalDone = typeEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
    const totalApproved = typeEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
    const approvalRate = totalDone > 0 ? Math.round((totalApproved / totalDone) * 100) : 0;

    return {
      workType: wt,
      totalDone,
      totalApproved,
      approvalRate,
    };
  });

  const totalDoneAll = summaries.reduce((acc, curr) => acc + curr.totalDone, 0);
  const totalApprovedAll = summaries.reduce((acc, curr) => acc + curr.totalApproved, 0);
  const overallApprovalRate = totalDoneAll > 0 ? Math.round((totalApprovedAll / totalDoneAll) * 100) : 0;

  return {
    summaries,
    totalDoneAll,
    totalApprovedAll,
    overallApprovalRate,
    entries: monthEntries,
  };
}

export async function getOverallReportData(groupBy: 'person' | 'work_type' | 'client') {
  const profiles = await fetchProfiles();
  const workTypes = await fetchWorkTypes();
  const clients = await fetchClients();

  // Fetch mock / recent data for demo aggregation
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const allEntries: WorkEntryWithDetails[] = [];
  for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split('T')[0];
    const dayEntries = await fetchWorkEntriesByDate(dStr);
    allEntries.push(...dayEntries);
  }

  if (groupBy === 'person') {
    return profiles.map(p => {
      const pEntries = allEntries.filter(e => e.user_id === p.id);
      const totalDone = pEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
      const totalApproved = pEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
      const approvalRate = totalDone > 0 ? Math.round((totalApproved / totalDone) * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        category: p.designation || 'Team',
        totalDone,
        totalApproved,
        approvalRate,
      };
    });
  }

  if (groupBy === 'work_type') {
    return workTypes.map(wt => {
      const wtEntries = allEntries.filter(e => e.work_type_id === wt.id);
      const totalDone = wtEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
      const totalApproved = wtEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
      const approvalRate = totalDone > 0 ? Math.round((totalApproved / totalDone) * 100) : 0;
      return {
        id: wt.id,
        name: wt.name,
        category: 'Work Type',
        totalDone,
        totalApproved,
        approvalRate,
      };
    });
  }

  return clients.map(c => {
    const cEntries = allEntries.filter(e => e.client_id === c.id);
    const totalDone = cEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
    const totalApproved = cEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
    const approvalRate = totalDone > 0 ? Math.round((totalApproved / totalDone) * 100) : 0;
    return {
      id: c.id,
      name: c.name,
      category: 'Client',
      totalDone,
      totalApproved,
      approvalRate,
    };
  });
}
