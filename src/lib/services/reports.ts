import { fetchWorkEntriesByDate, fetchProfiles, fetchWorkTypes, fetchClients, calculateWorkEntrySeconds } from './work-entry';
import { WorkEntryWithDetails, Profile, WorkType, Client } from '@/types';

export interface WeeklyUserSummary {
  profile: Profile;
  totalCreated: number;
  totalApproved: number;
  approvalRate: number;
  totalTimeSeconds: number;
  workTypeBreakdown: Record<string, { done: number; approved: number; timeSeconds?: number }>;
  entries: WorkEntryWithDetails[];
  weeklyBestWorkUrl?: string;
}

export interface MonthlyWorkTypeSummary {
  workType: WorkType;
  totalDone: number;
  totalApproved: number;
  approvalRate: number;
  totalTimeSeconds: number;
}

export interface OverallSummaryItem {
  id: string;
  name: string;
  category?: string;
  totalDone: number;
  totalApproved: number;
  approvalRate: number;
  totalTimeSeconds: number;
}

export interface ClientBillingSummary {
  clientId: string;
  clientName: string;
  totalDone: number;
  totalApproved: number;
  totalTimeSeconds: number;
  decimalHours: number;
  entries: WorkEntryWithDetails[];
  workTypeBreakdown: Record<string, { count: number; timeSeconds: number }>;
}

// Format duration into clean string: "14h 30m" or "45m"
export function formatReportTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
}

// Decimal hours rounded to 2 decimals for billing calculations (e.g. 14.50 hrs)
export function formatReportHoursDecimal(seconds: number): number {
  if (!seconds || seconds <= 0) return 0;
  return Math.round((seconds / 3600) * 100) / 100;
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

// Utility to calculate start and end of week (Tuesday to Monday - exactly 7 days)
export function getWeekRange(dateInput: Date = new Date()) {
  const d = new Date(dateInput);
  const day = d.getDay();
  // Tuesday is day 2. Calculate offset to Tuesday
  const diff = d.getDate() - ((day - 2 + 7) % 7);
  const tuesday = new Date(d.getFullYear(), d.getMonth(), diff, 12, 0, 0);
  const monday = new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate() + 6, 12, 0, 0);

  const formatLocal = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dayNum = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };

  return {
    startDate: formatLocal(tuesday),
    endDate: formatLocal(monday),
    label: `${tuesday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
  };
}

export async function getWeeklyReportData(startDateStr: string, endDateStr: string): Promise<WeeklyUserSummary[]> {
  const allProfiles = await fetchProfiles();
  const profiles = allProfiles.filter(p => p.name !== 'Admin' && !p.designation?.toLowerCase().includes('administrator'));
  const workTypes = await fetchWorkTypes();

  // Parse dates cleanly using local components to eliminate timezone shifting
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd, 12, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0);
  const allEntries: WorkEntryWithDetails[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${dayNum}`;
    const dayEntries = await fetchWorkEntriesByDate(dStr);
    allEntries.push(...dayEntries);
  }

  // Aggregate by profile
  const userSummaries: WeeklyUserSummary[] = profiles.map(profile => {
    const userEntries = allEntries.filter(e => e.user_id === profile.id);
    const totalCreated = userEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
    const totalApproved = userEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
    const approvalRate = totalCreated > 0 ? Math.round((totalApproved / totalCreated) * 100) : 0;
    const totalTimeSeconds = userEntries.reduce((acc, curr) => acc + calculateWorkEntrySeconds(curr), 0);

    const breakdown: Record<string, { done: number; approved: number; timeSeconds?: number }> = {};
    workTypes.forEach(wt => {
      breakdown[wt.name] = { done: 0, approved: 0, timeSeconds: 0 };
    });

    userEntries.forEach(entry => {
      const wtName = entry.work_type?.name || 'Other';
      if (!breakdown[wtName]) breakdown[wtName] = { done: 0, approved: 0, timeSeconds: 0 };
      breakdown[wtName].done += entry.quantity_done;
      breakdown[wtName].approved += entry.quantity_approved;
      breakdown[wtName].timeSeconds = (breakdown[wtName].timeSeconds || 0) + calculateWorkEntrySeconds(entry);
    });

    const sortedUserEntries = [...userEntries].sort((a, b) => {
      const clientA = a.client?.name?.trim().toLowerCase() || 'zz_no_client';
      const clientB = b.client?.name?.trim().toLowerCase() || 'zz_no_client';
      if (clientA !== clientB) {
        return clientA.localeCompare(clientB);
      }
      return a.work_date.localeCompare(b.work_date);
    });

    return {
      profile,
      totalCreated,
      totalApproved,
      approvalRate,
      totalTimeSeconds,
      workTypeBreakdown: breakdown,
      entries: sortedUserEntries,
      weeklyBestWorkUrl: '',
    };
  });

  return userSummaries;
}

export async function getMonthlyReportData(
  year: number,
  month: number,
  userIdFilter?: string,
  workTypeIdFilter?: string,
  clientIdFilter?: string
) {
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

  // Filter out any entries by Admin
  monthEntries = monthEntries.filter(e => e.profile?.name !== 'Admin');

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
    const totalTimeSeconds = typeEntries.reduce((acc, curr) => acc + calculateWorkEntrySeconds(curr), 0);

    return {
      workType: wt,
      totalDone,
      totalApproved,
      approvalRate,
      totalTimeSeconds,
    };
  });

  const totalDoneAll = summaries.reduce((acc, curr) => acc + curr.totalDone, 0);
  const totalApprovedAll = summaries.reduce((acc, curr) => acc + curr.totalApproved, 0);
  const overallApprovalRate = totalDoneAll > 0 ? Math.round((totalApprovedAll / totalDoneAll) * 100) : 0;
  const totalTimeSecondsAll = monthEntries.reduce((acc, curr) => acc + calculateWorkEntrySeconds(curr), 0);

  return {
    summaries,
    totalDoneAll,
    totalApprovedAll,
    overallApprovalRate,
    totalTimeSecondsAll,
    entries: monthEntries,
  };
}

export async function getOverallReportData(groupBy: 'person' | 'work_type' | 'client') {
  const allProfiles = await fetchProfiles();
  const profiles = allProfiles.filter(p => p.name !== 'Admin' && !p.designation?.toLowerCase().includes('administrator'));
  const workTypes = await fetchWorkTypes();
  const clients = await fetchClients();

  // Fetch mock / recent data for demo aggregation (last 30 days)
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
      const totalTimeSeconds = pEntries.reduce((acc, curr) => acc + calculateWorkEntrySeconds(curr), 0);
      return {
        id: p.id,
        name: p.name,
        category: p.designation || 'Team',
        totalDone,
        totalApproved,
        approvalRate,
        totalTimeSeconds,
      };
    });
  }

  if (groupBy === 'work_type') {
    return workTypes.map(wt => {
      const wtEntries = allEntries.filter(e => e.work_type_id === wt.id);
      const totalDone = wtEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
      const totalApproved = wtEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
      const approvalRate = totalDone > 0 ? Math.round((totalApproved / totalDone) * 100) : 0;
      const totalTimeSeconds = wtEntries.reduce((acc, curr) => acc + calculateWorkEntrySeconds(curr), 0);
      return {
        id: wt.id,
        name: wt.name,
        category: 'Work Type',
        totalDone,
        totalApproved,
        approvalRate,
        totalTimeSeconds,
      };
    });
  }

  return clients.map(c => {
    const cEntries = allEntries.filter(e => e.client_id === c.id);
    const totalDone = cEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
    const totalApproved = cEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
    const approvalRate = totalDone > 0 ? Math.round((totalApproved / totalDone) * 100) : 0;
    const totalTimeSeconds = cEntries.reduce((acc, curr) => acc + calculateWorkEntrySeconds(curr), 0);
    return {
      id: c.id,
      name: c.name,
      category: 'Client',
      totalDone,
      totalApproved,
      approvalRate,
      totalTimeSeconds,
    };
  });
}

// Client Time & Billing Report Aggregator
export async function getClientBillingReportData(
  startDateStr: string,
  endDateStr: string,
  clientIdFilter?: string,
  userIdFilter?: string,
  workTypeIdFilter?: string
): Promise<{
  clientSummaries: ClientBillingSummary[];
  totalTimeSecondsAll: number;
  totalDecimalHoursAll: number;
  totalDoneAll: number;
  totalApprovedAll: number;
  entries: WorkEntryWithDetails[];
}> {
  const clients = await fetchClients();
  const workTypes = await fetchWorkTypes();

  // Parse dates cleanly
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd, 12, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0);
  let allEntries: WorkEntryWithDetails[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${dayNum}`;
    const dayEntries = await fetchWorkEntriesByDate(dStr, userIdFilter || undefined);
    allEntries.push(...dayEntries);
  }

  // Filter out Admin entries
  allEntries = allEntries.filter(e => e.profile?.name !== 'Admin');

  if (clientIdFilter) {
    allEntries = allEntries.filter(e => e.client_id === clientIdFilter);
  }
  if (workTypeIdFilter) {
    allEntries = allEntries.filter(e => e.work_type_id === workTypeIdFilter);
  }

  // Group by client
  const clientMap: Record<string, { clientName: string; entries: WorkEntryWithDetails[] }> = {};

  // Initialize known clients
  clients.forEach(c => {
    if (!clientIdFilter || c.id === clientIdFilter) {
      clientMap[c.id] = { clientName: c.name, entries: [] };
    }
  });

  // Assign entries
  allEntries.forEach(entry => {
    const cId = entry.client_id || 'unassigned';
    const cName = entry.client?.name || 'General / Internal';
    if (!clientMap[cId]) {
      clientMap[cId] = {
        clientName: cName,
        entries: [],
      };
    }
    clientMap[cId].entries.push(entry);
  });

  const clientSummaries: ClientBillingSummary[] = Object.entries(clientMap)
    .map(([cId, data]) => {
      const cEntries = data.entries;
      const totalDone = cEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
      const totalApproved = cEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);
      const totalTimeSeconds = cEntries.reduce((acc, curr) => acc + calculateWorkEntrySeconds(curr), 0);
      const decimalHours = formatReportHoursDecimal(totalTimeSeconds);

      // Work type breakdown
      const breakdown: Record<string, { count: number; timeSeconds: number }> = {};
      workTypes.forEach(wt => {
        breakdown[wt.name] = { count: 0, timeSeconds: 0 };
      });
      cEntries.forEach(e => {
        const wtName = e.work_type?.name || 'Other';
        if (!breakdown[wtName]) breakdown[wtName] = { count: 0, timeSeconds: 0 };
        breakdown[wtName].count += e.quantity_done;
        breakdown[wtName].timeSeconds += calculateWorkEntrySeconds(e);
      });

      return {
        clientId: cId,
        clientName: data.clientName,
        totalDone,
        totalApproved,
        totalTimeSeconds,
        decimalHours,
        entries: cEntries.sort((a, b) => b.work_date.localeCompare(a.work_date)),
        workTypeBreakdown: breakdown,
      };
    })
    // Sort by most time spent descending, then by deliverables
    .sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds || b.totalDone - a.totalDone);

  const totalTimeSecondsAll = allEntries.reduce((acc, curr) => acc + calculateWorkEntrySeconds(curr), 0);
  const totalDecimalHoursAll = formatReportHoursDecimal(totalTimeSecondsAll);
  const totalDoneAll = allEntries.reduce((acc, curr) => acc + curr.quantity_done, 0);
  const totalApprovedAll = allEntries.reduce((acc, curr) => acc + curr.quantity_approved, 0);

  return {
    clientSummaries,
    totalTimeSecondsAll,
    totalDecimalHoursAll,
    totalDoneAll,
    totalApprovedAll,
    entries: allEntries,
  };
}
