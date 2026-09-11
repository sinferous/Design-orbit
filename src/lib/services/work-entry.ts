import { createClient } from '@/lib/supabase/client';
import { WorkEntry, WorkEntryFormData, WorkEntryWithDetails, WorkType, Client, Profile } from '@/types';

const isUUID = (str: string | null | undefined): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

const LEGACY_ID_TO_NAME_MAP: Record<string, string> = {
  c1: 'Alsaraya', c2: 'Webtree', c3: 'Longveia', c4: '2am idea', c5: 'Shaheen group',
  c6: 'Ghumpa', c7: 'Voro', c8: 'Tectory', c9: 'Shamsha', c10: 'Larosa',
  c11: 'Alrosta', c12: 'Abdulhameed', c13: 'Allday', c14: 'Shaheen', c15: 'Calibar sports',
  c16: 'Farhat', c17: 'Priyadarshini', c18: 'Easy lease', c19: 'Ybyf', c20: 'Vivant dental',
  c21: 'All day market', c22: 'Amwaj', c23: 'Farhat tours', c24: 'Cruise', c25: 'Cruise sm',
  c26: 'Amaron', c27: 'Internal Project', c28: 'Design Orbit',
  p0: 'Admin', p1: 'Gajesh', p2: 'Fazil', p3: 'Varun', p4: 'Moveena', p5: 'Shashiraj', p6: 'Prasanna Lakshmi', p7: 'Samantha',
  wt1: 'Static', wt2: 'Video', wt3: 'Mobile App', wt4: 'Landing Page', wt5: 'Website',
  wt6: 'UI/UX', wt7: 'Logo', wt8: 'Edits', wt9: 'Working', wt10: 'Other',
};

// DELETED CLIENT TRACKER (persists across renders)
let DELETED_CLIENT_IDS_AND_NAMES: string[] = [];

function getDeletedClientFilter(): string[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('design_orbit_deleted_clients');
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return DELETED_CLIENT_IDS_AND_NAMES;
}

function addDeletedClientFilter(identifier: string) {
  if (!identifier) return;
  const current = getDeletedClientFilter();
  const lower = identifier.toLowerCase();
  if (!current.includes(lower)) {
    current.push(lower);
    DELETED_CLIENT_IDS_AND_NAMES = current;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('design_orbit_deleted_clients', JSON.stringify(current));
      } catch {}
    }
  }
}

// MOCK SEED DATA FOR OFFLINE / PREVIEW MODE
export const INITIAL_MOCK_PROFILES: Profile[] = [
  { id: '00000000-0000-4000-a000-000000000000', auth_user_id: null, name: 'Admin', designation: 'System Administrator', email: 'admin@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '00000000-0000-4000-a000-000000000001', auth_user_id: null, name: 'Gajesh', designation: 'UI/UX Designer', email: 'gajesh@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '00000000-0000-4000-a000-000000000002', auth_user_id: null, name: 'Fazil', designation: 'Senior UI/UX Designer', email: 'fazil@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '00000000-0000-4000-a000-000000000003', auth_user_id: null, name: 'Varun', designation: 'Graphic Designer', email: 'varun@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '00000000-0000-4000-a000-000000000004', auth_user_id: null, name: 'Moveena', designation: 'Senior Graphic Designer', email: 'moveena@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '00000000-0000-4000-a000-000000000005', auth_user_id: null, name: 'Shashiraj', designation: 'Graphic Designer', email: 'shashiraj@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '00000000-0000-4000-a000-000000000006', auth_user_id: null, name: 'Prasanna Lakshmi', designation: 'Graphic Designer', email: 'prasanna@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '00000000-0000-4000-a000-000000000007', auth_user_id: null, name: 'Samantha', designation: 'Design Team Lead', email: 'sams@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const INITIAL_MOCK_WORK_TYPES: WorkType[] = [
  { id: '10000000-0000-4000-a000-000000000001', name: 'Static', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-4000-a000-000000000002', name: 'Video', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-4000-a000-000000000003', name: 'Mobile App', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-4000-a000-000000000004', name: 'Landing Page', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-4000-a000-000000000005', name: 'Website', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-4000-a000-000000000006', name: 'UI/UX', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-4000-a000-000000000007', name: 'Logo', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-4000-a000-000000000008', name: 'Edits', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-4000-a000-000000000010', name: 'Other', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const INITIAL_MOCK_CLIENTS: Client[] = [
  { id: '20000000-0000-4000-a000-000000000004', name: '2am idea', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000012', name: 'Abdulhameed', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000021', name: 'All day market', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000011', name: 'Alrosta', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000001', name: 'Alsaraya', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000026', name: 'Amaron', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000022', name: 'Amwaj', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000015', name: 'Calibar sports', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000024', name: 'Cruise', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000018', name: 'Easy lease', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000016', name: 'Farhat', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000023', name: 'Farhat tours', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000006', name: 'Ghumpa', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000010', name: 'Larosa', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000003', name: 'Longevia', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000017', name: 'Priyadarshini', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000005', name: 'Shaheen group', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000009', name: 'Shamsha', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000008', name: 'Tectory', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000020', name: 'Vivant dental', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000007', name: 'Voro', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000002', name: 'Webtree', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000019', name: 'Ybyf', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

let mockWorkEntriesStore: WorkEntryWithDetails[] = [];

function getStoredMockEntries(): WorkEntryWithDetails[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('design_orbit_local_work_entries');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse local entries:', e);
    }
  }
  return mockWorkEntriesStore;
}

function saveStoredMockEntries(entries: WorkEntryWithDetails[]) {
  mockWorkEntriesStore = entries;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('design_orbit_local_work_entries', JSON.stringify(entries));
    } catch (e) {
      console.warn('Failed to save local entries:', e);
    }
  }
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes('your-supabase-project'));
}

export function getLoggedInUser(): { name: string; email: string; profileId?: string } | null {
  if (typeof window !== 'undefined') {
    const storedName = localStorage.getItem('design_orbit_logged_in_name');
    const storedEmail = localStorage.getItem('design_orbit_logged_in_email');
    const storedProfileId = localStorage.getItem('design_orbit_logged_in_profile_id') || undefined;
    if (storedName) {
      // Ensure cookie is synchronized with localStorage for Next.js middleware protection
      if (!document.cookie.includes('design_orbit_auth=')) {
        const isAdmin = isAdminUser({ name: storedName, email: storedEmail });
        const authData = JSON.stringify({ name: storedName, email: storedEmail, profileId: storedProfileId, isAdmin });
        document.cookie = `design_orbit_auth=${encodeURIComponent(authData)}; path=/; max-age=2592000; SameSite=Lax`;
      }
      return { name: storedName, email: storedEmail || '', profileId: storedProfileId };
    }
  }
  return null;
}

export function isAdminUser(user?: { name?: string | null; email?: string | null; designation?: string | null } | null): boolean {
  if (!user) return false;
  const name = (user.name || '').trim().toLowerCase();
  const email = (user.email || '').trim().toLowerCase();
  const designation = (user.designation || '').trim().toLowerCase();
  return (
    name === 'admin' ||
    email === 'admin@webtreeonline.com' ||
    designation.includes('administrator') ||
    designation.includes('system admin')
  );
}

export function setLoggedInUser(name: string, email: string, profileId?: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('design_orbit_logged_in_name', name);
    localStorage.setItem('design_orbit_logged_in_email', email);
    if (profileId) {
      localStorage.setItem('design_orbit_logged_in_profile_id', profileId);
    }
    const isAdmin = isAdminUser({ name, email });
    const authData = JSON.stringify({ name, email, profileId, isAdmin });
    // Secure session cookie for Next.js middleware protection (30 days persistence)
    document.cookie = `design_orbit_auth=${encodeURIComponent(authData)}; path=/; max-age=2592000; SameSite=Lax`;
    try {
      window.dispatchEvent(new CustomEvent('design_orbit_auth_change', {
        detail: { name, email, profileId }
      }));
    } catch (e) {}
  }
}

export function logoutUser() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('design_orbit_logged_in_name');
      localStorage.removeItem('design_orbit_logged_in_email');
      localStorage.removeItem('design_orbit_logged_in_profile_id');
      // Clear session cookie immediately
      document.cookie = 'design_orbit_auth=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      try {
        window.dispatchEvent(new CustomEvent('design_orbit_auth_change', {
          detail: null
        }));
      } catch (e) {}
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Failed to sign out:', e);
    }
  }
}

export async function getLoggedInProfileId(): Promise<string | null> {
  const user = getLoggedInUser();
  if (!user || !user.name) return null;
  if (user.profileId) return user.profileId;

  try {
    const profiles = await fetchProfiles();
    const matched = profiles.find(
      p =>
        p.name.toLowerCase() === user.name.toLowerCase() ||
        (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase())
    );
    if (matched) {
      setLoggedInUser(user.name, user.email, matched.id);
      return matched.id;
    }
  } catch (e) {
    console.warn('getLoggedInProfileId resolution error:', e);
  }
  return null;
}

export function isEntryForUser(
  entry: Partial<WorkEntryWithDetails> | undefined | null,
  userId?: string | null,
  userName?: string | null
): boolean {
  if (!entry) return false;
  const cleanUserId = userId?.trim().toLowerCase();
  const cleanUserName = userName?.trim().toLowerCase();

  if (cleanUserId) {
    if (entry.user_id && entry.user_id.toLowerCase() === cleanUserId) return true;
    if (entry.profile?.id && entry.profile.id.toLowerCase() === cleanUserId) return true;
  }
  if (cleanUserName) {
    if (entry.profile?.name && entry.profile.name.toLowerCase() === cleanUserName) return true;
  }
  return false;
}

export async function fetchWorkTypes(): Promise<WorkType[]> {
  const filterOutWorking = (list: WorkType[]) => list.filter(wt => wt.name.trim().toLowerCase() !== 'working');

  if (!isSupabaseConfigured()) return filterOutWorking(INITIAL_MOCK_WORK_TYPES);
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('work_types')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error || !data || data.length === 0) return filterOutWorking(INITIAL_MOCK_WORK_TYPES);
    return filterOutWorking(data);
  } catch {
    return filterOutWorking(INITIAL_MOCK_WORK_TYPES);
  }
}

export async function fetchClients(): Promise<Client[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return (data as Client[]).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      }
    } catch (err) {
      console.warn('Supabase fetchClients notice:', err);
    }
  }

  return [...INITIAL_MOCK_CLIENTS].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function fetchProfiles(): Promise<Profile[]> {
  if (!isSupabaseConfigured()) return INITIAL_MOCK_PROFILES;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error || !data || data.length === 0) return INITIAL_MOCK_PROFILES;

    const combined: Profile[] = [...data];
    INITIAL_MOCK_PROFILES.forEach(mockProf => {
      if (!combined.some(p => p.name.toLowerCase() === mockProf.name.toLowerCase() || (p.email && mockProf.email && p.email.toLowerCase() === mockProf.email.toLowerCase()))) {
        combined.push(mockProf);
      }
    });

    return combined;
  } catch {
    return INITIAL_MOCK_PROFILES;
  }
}

export async function fetchWorkEntriesByDate(dateStr: string, userId?: string): Promise<WorkEntryWithDetails[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      let query = supabase
        .from('work_entries')
        .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)')
        .eq('work_date', dateStr)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (!error && data) {
        if (typeof window !== 'undefined') {
          return (data as WorkEntryWithDetails[]).map(e => {
            const localStarted = localStorage.getItem(`work_timer_started_${e.id}`);
            const localSpent = localStorage.getItem(`work_time_spent_${e.id}`);
            return {
              ...e,
              timer_started_at: e.timer_started_at ?? localStarted ?? null,
              time_spent_seconds: e.time_spent_seconds ?? (localSpent ? Number(localSpent) : 0),
            };
          });
        }
        return data as WorkEntryWithDetails[];
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    }
  }

  const localEntries = getStoredMockEntries();
  return localEntries.filter(e => {
    const matchDate = e.work_date === dateStr;
    const matchUser = userId ? e.user_id === userId : true;
    return matchDate && matchUser;
  });
}

export function isDismissedPendingEntry(entry?: { notes?: string | null } | null): boolean {
  return Boolean(entry?.notes && entry.notes.includes('[DISMISSED_PENDING]'));
}

export async function dismissPendingApproval(entryId: string): Promise<WorkEntry | null> {
  const entry = await fetchWorkEntryById(entryId);
  if (!entry) return null;

  const currentNotes = entry.notes || '';
  if (currentNotes.includes('[DISMISSED_PENDING]')) return entry;

  const updatedNotes = currentNotes.trim() ? `${currentNotes.trim()} [DISMISSED_PENDING]` : '[DISMISSED_PENDING]';
  return updateWorkEntry(entryId, { notes: updatedNotes });
}

export async function fetchPendingApprovalEntries(userId?: string): Promise<WorkEntryWithDetails[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      let query = supabase
        .from('work_entries')
        .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)')
        .gt('quantity_done', 0)
        .order('work_date', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return (data as WorkEntryWithDetails[]).filter(
          e =>
            (e.quantity_done || 0) > 0 &&
            (e.quantity_approved || 0) < (e.quantity_done || 0) &&
            !isInProgressEntry(e) &&
            !isDismissedPendingEntry(e)
        );
      }
    } catch (err) {
      console.warn('Supabase fetchPendingApprovalEntries error:', err);
    }
  }

  const localEntries = getStoredMockEntries();
  return localEntries
    .filter(e => {
      const isPending =
        (e.quantity_done || 0) > 0 &&
        (e.quantity_approved || 0) < (e.quantity_done || 0) &&
        !isInProgressEntry(e) &&
        !isDismissedPendingEntry(e);
      const matchUser = userId ? e.user_id === userId : true;
      return isPending && matchUser;
    })
    .sort((a, b) => b.work_date.localeCompare(a.work_date));
}

export function getPendingDaysAgo(dateStr: string): number {
  if (!dateStr) return 0;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const entryDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - entryDate.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

export function getPendingUrgency(daysAgo: number): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  label: string;
  dotColor: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  if (daysAgo <= 1) {
    const badgeBg = 'bg-emerald-50';
    const badgeText = 'text-emerald-800';
    const badgeBorder = 'border-emerald-200';
    const dotColor = 'bg-emerald-500';
    return {
      badgeBg,
      badgeText,
      badgeBorder,
      label: daysAgo === 0 ? 'Logged today' : '1 day ago',
      dotColor,
      bg: badgeBg,
      text: badgeText,
      border: badgeBorder,
      dot: dotColor,
    };
  }
  if (daysAgo <= 4) {
    const badgeBg = 'bg-sky-50';
    const badgeText = 'text-sky-800';
    const badgeBorder = 'border-sky-200';
    const dotColor = 'bg-sky-500';
    return {
      badgeBg,
      badgeText,
      badgeBorder,
      label: `${daysAgo} days ago`,
      dotColor,
      bg: badgeBg,
      text: badgeText,
      border: badgeBorder,
      dot: dotColor,
    };
  }
  if (daysAgo <= 7) {
    const badgeBg = 'bg-amber-50';
    const badgeText = 'text-amber-800';
    const badgeBorder = 'border-amber-300';
    const dotColor = 'bg-amber-500';
    return {
      badgeBg,
      badgeText,
      badgeBorder,
      label: `${daysAgo}d ago • Follow-up`,
      dotColor,
      bg: badgeBg,
      text: badgeText,
      border: badgeBorder,
      dot: dotColor,
    };
  }
  const badgeBg = 'bg-rose-50';
  const badgeText = 'text-rose-800';
  const badgeBorder = 'border-rose-300';
  const dotColor = 'bg-rose-500';
  return {
    badgeBg,
    badgeText,
    badgeBorder,
    label: `${daysAgo}d ago • Overdue`,
    dotColor,
    bg: badgeBg,
    text: badgeText,
    border: badgeBorder,
    dot: dotColor,
  };
}

// ----------------------------------------------------
// Carryover & In-Progress ("Continue Tomorrow") Helpers
// ----------------------------------------------------

export function isInProgressEntry(entry: Partial<WorkEntryWithDetails> | null | undefined): boolean {
  if (!entry) return false;
  if (entry.status === 'Draft') return true;
  if ((entry.quantity_done ?? 1) === 0) return true;
  if (entry.notes && (entry.notes.includes('[IN_PROGRESS]') || entry.notes.toLowerCase().includes('in progress'))) {
    return true;
  }
  return false;
}

export function getCarryoverParentId(entry: Partial<WorkEntryWithDetails> | null | undefined): string | null {
  if (!entry?.notes) return null;
  const match = entry.notes.match(/\[CONTINUES:([a-zA-Z0-9_-]+)\]/);
  return match ? match[1] : null;
}

export async function fetchCarryoverEntries(userId?: string): Promise<WorkEntryWithDetails[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      let query = supabase
        .from('work_entries')
        .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)')
        .order('work_date', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Fetch entries from the past 21 days
      const pastCutoff = new Date();
      pastCutoff.setDate(pastCutoff.getDate() - 21);
      const pastCutoffStr = pastCutoff.toISOString().split('T')[0];
      query = query.gte('work_date', pastCutoffStr);

      const { data, error } = await query;
      if (!error && data) {
        const allEntries = data as WorkEntryWithDetails[];
        // Find which in-progress parent entries have already been finished in a subsequent entry
        const completedParentIds = new Set<string>();
        allEntries.forEach(e => {
          const parentId = getCarryoverParentId(e);
          if (parentId && (e.quantity_done || 0) > 0) {
            completedParentIds.add(parentId);
          }
        });

        return allEntries.filter(e => {
          const inProgress = isInProgressEntry(e);
          const notYetCompleted = !completedParentIds.has(e.id);
          return inProgress && notYetCompleted;
        });
      }
    } catch (err) {
      console.warn('fetchCarryoverEntries Supabase error:', err);
    }
  }

  const localEntries = getStoredMockEntries();
  const completedParentIds = new Set<string>();
  localEntries.forEach(e => {
    const parentId = getCarryoverParentId(e);
    if (parentId && (e.quantity_done || 0) > 0) {
      completedParentIds.add(parentId);
    }
  });

  return localEntries
    .filter(e => {
      const matchUser = userId ? e.user_id === userId : true;
      const inProgress = isInProgressEntry(e);
      const notYetCompleted = !completedParentIds.has(e.id);
      return matchUser && inProgress && notYetCompleted;
    })
    .sort((a, b) => b.work_date.localeCompare(a.work_date));
}

export async function fetchWorkEntryById(id: string): Promise<WorkEntryWithDetails | null> {
  if (!isSupabaseConfigured()) {
    return mockWorkEntriesStore.find(e => e.id === id) || null;
  }
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('work_entries')
      .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)')
      .eq('id', id)
      .single();

    if (error || !data) return mockWorkEntriesStore.find(e => e.id === id) || null;
    return data as WorkEntryWithDetails;
  } catch {
    return mockWorkEntriesStore.find(e => e.id === id) || null;
  }
}

// AUTO-PROVISIONING HELPERS FOR SUPABASE DB INTEGRITY
async function ensureProfileInDB(supabase: any, user_id: string): Promise<string> {
  const legacyName = LEGACY_ID_TO_NAME_MAP[user_id];
  const mockProf = INITIAL_MOCK_PROFILES.find(p => p.id === user_id || p.name.toLowerCase() === (legacyName || '').toLowerCase());
  const profName = legacyName || mockProf?.name || user_id;
  const profEmail = mockProf?.email || `${profName.toLowerCase().replace(/\s+/g, '')}@webtreeonline.com`;

  if (isUUID(user_id)) {
    const { data } = await supabase.from('profiles').select('id').eq('id', user_id).single();
    if (data?.id) return data.id;
  }

  const { data: nameMatch } = await supabase
    .from('profiles')
    .select('id')
    .or(`name.ilike.${profName},email.ilike.${profEmail}`)
    .limit(1);

  if (nameMatch && nameMatch.length > 0) return nameMatch[0].id;

  const { data: created } = await supabase
    .from('profiles')
    .insert({
      name: profName,
      designation: mockProf?.designation || 'Team Member',
      email: profEmail,
      is_active: true,
    })
    .select('id')
    .single();

  if (created?.id) return created.id;

  const { data: anyProf } = await supabase.from('profiles').select('id').limit(1);
  return anyProf?.[0]?.id || '00000000-0000-4000-a000-000000000001';
}

async function ensureClientInDB(supabase: any, client_id: string | null): Promise<string | null> {
  if (!client_id) return null;

  const legacyName = LEGACY_ID_TO_NAME_MAP[client_id];
  const mockClient = INITIAL_MOCK_CLIENTS.find(c => c.id === client_id || c.name.toLowerCase() === (legacyName || '').toLowerCase());
  const clientName = legacyName || mockClient?.name || client_id;

  if (isUUID(client_id)) {
    const { data } = await supabase.from('clients').select('id').eq('id', client_id).single();
    if (data?.id) return data.id;
  }

  const { data: nameMatch } = await supabase
    .from('clients')
    .select('id')
    .ilike('name', clientName)
    .limit(1);

  if (nameMatch && nameMatch.length > 0) return nameMatch[0].id;

  const { data: created } = await supabase
    .from('clients')
    .insert({
      name: clientName,
      is_active: true,
    })
    .select('id')
    .single();

  if (created?.id) return created.id;
  return null;
}

async function ensureWorkTypeInDB(supabase: any, work_type_id: string): Promise<string> {
  const legacyName = LEGACY_ID_TO_NAME_MAP[work_type_id];
  const mockWorkType = INITIAL_MOCK_WORK_TYPES.find(w => w.id === work_type_id || w.name.toLowerCase() === (legacyName || '').toLowerCase());
  const workTypeName = legacyName || mockWorkType?.name || work_type_id;

  if (isUUID(work_type_id)) {
    const { data } = await supabase.from('work_types').select('id').eq('id', work_type_id).single();
    if (data?.id) return data.id;
  }

  const { data: nameMatch } = await supabase
    .from('work_types')
    .select('id')
    .ilike('name', workTypeName)
    .limit(1);

  if (nameMatch && nameMatch.length > 0) return nameMatch[0].id;

  const { data: created } = await supabase
    .from('work_types')
    .insert({
      name: workTypeName,
      is_active: true,
    })
    .select('id')
    .single();

  if (created?.id) return created.id;

  const { data: anyType } = await supabase.from('work_types').select('id').limit(1);
  return anyType?.[0]?.id || '10000000-0000-4000-a000-000000000001';
}

export async function createWorkEntry(formData: WorkEntryFormData): Promise<WorkEntry> {
  const results = await createWorkEntriesBatch([formData]);
  return results[0];
}

export async function createWorkEntriesBatch(formDatas: WorkEntryFormData[]): Promise<WorkEntry[]> {
  if (formDatas.length === 0) return [];

  if (isSupabaseConfigured()) {
    const supabase = createClient();

    const insertPayload = [];
    for (const formData of formDatas) {
      const dbUserId = await ensureProfileInDB(supabase, formData.user_id);
      const dbClientId = await ensureClientInDB(supabase, formData.client_id || null);
      const dbWorkTypeId = await ensureWorkTypeInDB(supabase, formData.work_type_id);

      const urlValue = formData.project_url || formData.best_work_url || null;

      insertPayload.push({
        user_id: dbUserId,
        client_id: dbClientId,
        work_type_id: dbWorkTypeId,
        work_date: formData.work_date,
        description: formData.description,
        quantity_done: formData.quantity_done,
        quantity_approved: formData.quantity_approved,
        best_work_url: urlValue,
        notes: formData.notes || null,
        status: formData.status || 'Submitted',
        time_spent_seconds: formData.time_spent_seconds || 0,
        timer_started_at: formData.timer_started_at || null,
      });
    }

    let { data, error } = await (supabase.from('work_entries') as any)
      .insert(insertPayload)
      .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)');

    // Graceful fallback if time columns are missing in DB schema cache yet
    if (error && (error.message?.includes('time_spent_seconds') || error.message?.includes('timer_started_at'))) {
      const fallbackPayload = insertPayload.map(item => {
        const copy = { ...item };
        delete (copy as any).time_spent_seconds;
        delete (copy as any).timer_started_at;
        return copy;
      });
      const retry = await (supabase.from('work_entries') as any)
        .insert(fallbackPayload)
        .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)');
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase work_entries insert error:', error.message);
      throw new Error(`Database Error: ${error.message}`);
    }

    if (data && data.length > 0) {
      return data as WorkEntry[];
    }
  }

  // Local offline fallback ONLY when Supabase URL is not set at all
  const currentLocal = getStoredMockEntries();
  const created: WorkEntryWithDetails[] = [];
  for (const formData of formDatas) {
    const profile = INITIAL_MOCK_PROFILES.find(p => p.id === formData.user_id) || INITIAL_MOCK_PROFILES[1];
    const client = INITIAL_MOCK_CLIENTS.find(c => c.id === formData.client_id) || null;
    const work_type = INITIAL_MOCK_WORK_TYPES.find(w => w.id === formData.work_type_id) || INITIAL_MOCK_WORK_TYPES[0];
    const urlVal = formData.project_url || formData.best_work_url || null;

    const newEntry: WorkEntryWithDetails = {
      id: `we_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: formData.user_id,
      client_id: formData.client_id || null,
      work_type_id: formData.work_type_id,
      work_date: formData.work_date,
      description: formData.description,
      quantity_done: formData.quantity_done,
      quantity_approved: formData.quantity_approved,
      best_work_url: urlVal,
      project_url: urlVal,
      notes: formData.notes || null,
      status: formData.status || 'Submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile,
      client,
      work_type,
    };

    created.push(newEntry);
  }

  saveStoredMockEntries([...created, ...currentLocal]);
  return created;
}

export async function updateWorkEntry(id: string, formData: Partial<WorkEntryFormData>): Promise<WorkEntry> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const urlVal = formData.project_url !== undefined ? formData.project_url : formData.best_work_url;
    const cleanFormData = { ...formData };
    delete (cleanFormData as any).project_url;

    const payload: any = { 
      ...cleanFormData, 
      ...(urlVal !== undefined ? { best_work_url: urlVal || null } : {}),
      updated_at: new Date().toISOString() 
    };

    if (payload.client_id) {
      payload.client_id = await ensureClientInDB(supabase, payload.client_id);
    }

    if (payload.user_id) {
      payload.user_id = await ensureProfileInDB(supabase, payload.user_id);
    }

    if (payload.work_type_id) {
      payload.work_type_id = await ensureWorkTypeInDB(supabase, payload.work_type_id);
    }

    const { data, error } = await (supabase.from('work_entries') as any)
      .update(payload)
      .eq('id', id)
      .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)')
      .single();

    if (error) {
      console.error('Supabase update work entry error:', error.message);
      throw new Error(`Database Error: ${error.message}`);
    }

    if (data) return data as WorkEntry;
  }

  const idx = mockWorkEntriesStore.findIndex(e => e.id === id);
  if (idx !== -1) {
    const existing = mockWorkEntriesStore[idx];
    const updated: WorkEntryWithDetails = {
      ...existing,
      ...formData,
      updated_at: new Date().toISOString(),
    };
    if (formData.user_id) updated.profile = INITIAL_MOCK_PROFILES.find(p => p.id === formData.user_id);
    if (formData.client_id) updated.client = INITIAL_MOCK_CLIENTS.find(c => c.id === formData.client_id);
    if (formData.work_type_id) updated.work_type = INITIAL_MOCK_WORK_TYPES.find(w => w.id === formData.work_type_id);

    mockWorkEntriesStore[idx] = updated;
    return updated;
  }
  throw new Error('Work entry not found');
}

export async function deleteWorkEntry(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = await (supabase.from('work_entries') as any).delete().eq('id', id);
    if (error) {
      console.error('Supabase work entry delete error:', error.message);
      throw new Error(`Database Error: ${error.message}`);
    }
    return;
  }

  const currentLocal = getStoredMockEntries();
  const filtered = currentLocal.filter(e => e.id !== id);
  saveStoredMockEntries(filtered);
}

export async function createClientRecord(name: string): Promise<Client> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Client name cannot be empty');

  if (isSupabaseConfigured()) {
    const supabase = createClient();

    // 1. Check if client already exists in DB
    const { data: existingData, error: selectError } = await (supabase.from('clients') as any)
      .select('*')
      .ilike('name', trimmed)
      .limit(1);

    if (!selectError && existingData && existingData.length > 0) {
      const match = existingData[0] as Client;
      if (match.is_active === false) {
        await (supabase.from('clients') as any).update({ is_active: true }).eq('id', match.id);
      }
      return { ...match, is_active: true };
    }

    // 2. Insert new client row into Supabase DB
    const { data, error } = await (supabase.from('clients') as any)
      .insert({ name: trimmed, is_active: true })
      .select()
      .single();

    if (error) {
      console.error('Supabase client insert failed:', error.message);
      throw new Error(`Database Error: ${error.message}`);
    }

    if (data) {
      return data as Client;
    }
  }

  const newMockClient: Client = {
    id: `c_${Date.now()}`,
    name: trimmed,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  INITIAL_MOCK_CLIENTS.unshift(newMockClient);
  return newMockClient;
}

export async function deleteClientRecord(id: string): Promise<void> {
  const clientObj = INITIAL_MOCK_CLIENTS.find(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());
  const clientName = clientObj ? clientObj.name : id;

  const idx = INITIAL_MOCK_CLIENTS.findIndex(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());
  if (idx !== -1) INITIAL_MOCK_CLIENTS.splice(idx, 1);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (isUUID(id)) {
        await (supabase.from('clients') as any).update({ is_active: false }).eq('id', id);
        await (supabase.from('clients') as any).delete().eq('id', id);
      }
      if (clientName) {
        await (supabase.from('clients') as any).update({ is_active: false }).ilike('name', clientName);
        await (supabase.from('clients') as any).delete().ilike('name', clientName);
      }
    } catch (err: any) {
      console.error('Supabase delete client notice:', err);
      throw new Error(`Database Delete Error: ${err.message}`);
    }
  }
}

export async function updateClientRecord(id: string, newName: string): Promise<Client> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('Client name cannot be empty');

  const origClient = INITIAL_MOCK_CLIENTS.find(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());
  const oldName = origClient ? origClient.name : '';

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();

      // Check if another active client already has this new name
      const { data: duplicateCheck } = await (supabase.from('clients') as any)
        .select('id, name')
        .ilike('name', trimmed)
        .eq('is_active', true)
        .limit(5);

      if (duplicateCheck && duplicateCheck.length > 0) {
        const isOther = duplicateCheck.some((c: any) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase());
        if (isOther) {
          throw new Error(`A client with the name "${trimmed}" already exists.`);
        }
      }

      let updatedClient: Client | null = null;

      if (isUUID(id)) {
        const { data, error } = await (supabase.from('clients') as any)
          .update({ name: trimmed, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase update client error:', error.message);
          throw new Error(`Database Error: ${error.message}`);
        }
        if (data) updatedClient = data as Client;
      } else if (oldName) {
        const { data, error } = await (supabase.from('clients') as any)
          .update({ name: trimmed, updated_at: new Date().toISOString() })
          .ilike('name', oldName)
          .select()
          .single();

        if (!error && data) {
          updatedClient = data as Client;
        }
      }

      // Update in mock array if present
      const idx = INITIAL_MOCK_CLIENTS.findIndex(c => c.id === id || (oldName && c.name.toLowerCase() === oldName.toLowerCase()));
      if (idx !== -1) {
        INITIAL_MOCK_CLIENTS[idx].name = trimmed;
        INITIAL_MOCK_CLIENTS[idx].updated_at = new Date().toISOString();
      }
      if (LEGACY_ID_TO_NAME_MAP[id]) {
        LEGACY_ID_TO_NAME_MAP[id] = trimmed;
      }

      if (updatedClient) return updatedClient;
    } catch (err: any) {
      console.error('Supabase update client notice:', err);
      throw err;
    }
  }

  const idx = INITIAL_MOCK_CLIENTS.findIndex(c => c.id === id || (oldName && c.name.toLowerCase() === oldName.toLowerCase()));
  if (idx !== -1) {
    INITIAL_MOCK_CLIENTS[idx].name = trimmed;
    INITIAL_MOCK_CLIENTS[idx].updated_at = new Date().toISOString();
    return INITIAL_MOCK_CLIENTS[idx];
  }

  const updatedMock: Client = {
    id,
    name: trimmed,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  INITIAL_MOCK_CLIENTS.unshift(updatedMock);
  return updatedMock;
}

export async function createProfileRecord(data: { name: string; designation: string; email?: string }): Promise<Profile> {
  const name = data.name.trim();
  const designation = data.designation.trim();
  const email = (data.email || `${name.toLowerCase().replace(/\s+/g, '')}@webtreeonline.com`).trim();

  if (!name) throw new Error('Member name is required');
  if (!email) throw new Error('Email is required');

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data: newProf, error: insertErr } = await (supabase.from('profiles') as any)
      .insert({
        name,
        designation: designation || 'Team Member',
        email,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Supabase profile insert failed:', insertErr.message);
      throw new Error(`Database Error: ${insertErr.message}`);
    }

    if (newProf) {
      return newProf as Profile;
    }
  }

  const newProfile: Profile = {
    id: `p_${Date.now()}`,
    auth_user_id: null,
    name,
    designation: designation || 'Team Member',
    email,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  INITIAL_MOCK_PROFILES.unshift(newProfile);
  return newProfile;
}

export async function deleteProfileRecord(id: string): Promise<void> {
  const idx = INITIAL_MOCK_PROFILES.findIndex(p => p.id === id);
  if (idx !== -1) INITIAL_MOCK_PROFILES.splice(idx, 1);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (isUUID(id)) {
        await (supabase.from('profiles') as any).delete().eq('id', id);
      }
    } catch (err: any) {
      console.error('Supabase profile delete notice:', err);
      throw new Error(`Database Error: ${err.message}`);
    }
  }
}

export function clearLocalSessionData() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('design_orbit_local_work_entries');
      localStorage.removeItem('design_orbit_deleted_clients');
    } catch {}
  }
  mockWorkEntriesStore = [];
}

export async function updateProfilePasswordInDB(email: string, newPassword: string): Promise<void> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) throw new Error('Email is required');

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from('profiles') as any)
        .update({ password: newPassword, updated_at: new Date().toISOString() })
        .ilike('email', trimmedEmail);

      if (error) {
        if (error.message.includes("Could not find the 'password' column") || error.message.includes('password')) {
          throw new Error(`Database column missing: Please run "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'strongpassword';" in Supabase SQL Editor.`);
        }
        console.error('Supabase password update error:', error.message);
        throw new Error(`Database Error: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Failed to update password in DB:', err);
      throw err;
    }
  }

  const match = INITIAL_MOCK_PROFILES.find(p => p.email && p.email.toLowerCase() === trimmedEmail);
  if (match) {
    (match as any).password = newPassword;
  }
}

export async function fetchProfileByEmail(email: string): Promise<Profile | null> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) return null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from('profiles') as any)
        .select('*')
        .ilike('email', trimmedEmail)
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0] as Profile;
      }
    } catch (err) {
      console.warn('Supabase fetchProfileByEmail notice:', err);
    }
  }

  const profiles = await fetchProfiles();
  return profiles.find(p => p.email && p.email.toLowerCase() === trimmedEmail) || null;
}

export function getUserPasswordFromDB(profile?: Profile | null, email?: string): string {
  if (profile && (profile as any).password) {
    return (profile as any).password;
  }
  if (typeof window !== 'undefined' && email) {
    const customPass = localStorage.getItem(`design_orbit_pass_${email.toLowerCase()}`);
    if (customPass) return customPass;
  }
  return 'strongpassword';
}

export async function fetchWeeklyBestWorkRecords(weekStartDate: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from('weekly_best_work') as any)
        .select('*, profile:profiles(*)')
        .eq('week_start_date', weekStartDate);

      if (!error && data) {
        data.forEach((row: any) => {
          const val = row.best_work_url || row.url;
          if (val) {
            if (row.profile_id) result[row.profile_id] = val;
            if (row.profile?.id) result[row.profile.id] = val;
          }
        });
        return result;
      }
    } catch (err) {
      console.warn('Supabase fetchWeeklyBestWorkRecords notice:', err);
    }
  }

  // Local fallback
  if (typeof window !== 'undefined') {
    const keyPrefix = `design_orbit_weekly_link_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(keyPrefix) && key.endsWith(`_${weekStartDate}`)) {
        const parts = key.replace(keyPrefix, '').split('_');
        const profId = parts[0];
        const val = localStorage.getItem(key);
        if (profId && val) result[profId] = val;
      }
    }
  }

  return result;
}

export async function saveWeeklyBestWorkLinkRecord(profileId: string, weekStartDate: string, url: string): Promise<void> {
  const cleanUrl = url.trim();
  
  if (typeof window !== 'undefined') {
    if (cleanUrl) {
      localStorage.setItem(`design_orbit_weekly_link_${profileId}_${weekStartDate}`, cleanUrl);
    } else {
      localStorage.removeItem(`design_orbit_weekly_link_${profileId}_${weekStartDate}`);
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const dbProfileId = await ensureProfileInDB(supabase, profileId);

      if (!cleanUrl) {
        await (supabase.from('weekly_best_work') as any)
          .delete()
          .eq('profile_id', dbProfileId)
          .eq('week_start_date', weekStartDate);
      } else {
        const { error } = await (supabase.from('weekly_best_work') as any)
          .upsert({
            profile_id: dbProfileId,
            week_start_date: weekStartDate,
            best_work_url: cleanUrl,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'profile_id,week_start_date' });

        if (error) {
          console.error('Supabase weekly_best_work upsert error:', error.message);
        }
      }
    } catch (err) {
      console.warn('Supabase saveWeeklyBestWorkLinkRecord notice:', err);
    }
  }
}

// ----------------------------------------------------
// WORK ENTRY TIMER TRACKING SERVICE METHODS
// ----------------------------------------------------

export function calculateWorkEntrySeconds(
  entry: WorkEntryWithDetails | WorkEntry,
  nowMs: number = Date.now()
): number {
  let total = entry.time_spent_seconds || 0;
  if (entry.timer_started_at) {
    const started = new Date(entry.timer_started_at).getTime();
    if (!isNaN(started) && started > 0) {
      const elapsed = Math.max(0, Math.floor((nowMs - started) / 1000));
      total += elapsed;
    }
  }
  return total;
}

export function formatWorkEntryDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

export function formatWorkEntryStopwatch(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function dispatchGlobalTimerEvent(detail: {
  id: string;
  action: 'start' | 'stop' | 'pause' | 'resume';
  entry?: any;
}) {
  if (typeof window === 'undefined') return;

  const { id, action, entry } = detail;

  try {
    if (action === 'stop' || action === 'pause') {
      localStorage.removeItem(`work_timer_started_${id}`);
      if (entry?.time_spent_seconds !== undefined) {
        localStorage.setItem(`work_time_spent_${id}`, String(entry.time_spent_seconds));
      }
    } else if (action === 'start' || action === 'resume') {
      if (entry?.timer_started_at) {
        localStorage.setItem(`work_timer_started_${id}`, entry.timer_started_at);
      }
    }
  } catch (e) {}

  // 1. Current window custom event
  try {
    window.dispatchEvent(new CustomEvent('design_orbit_timer_event', { detail }));
  } catch (e) {}

  // 2. BroadcastChannel across all tabs & popup/PiP windows
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('design_orbit_timer_bus');
      channel.postMessage(detail);
      channel.close();
    }
  } catch (e) {}

  // 3. Storage event fallback for cross-tab sync
  try {
    localStorage.setItem(
      'design_orbit_timer_sync_event',
      JSON.stringify({ detail, timestamp: Date.now() })
    );
  } catch (e) {}
}

export async function startWorkEntryTimer(
  id: string,
  activeEntries: WorkEntryWithDetails[] = [],
  userId?: string
): Promise<WorkEntryWithDetails> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const supabase = createClient();

    // Start this work entry's timer (supports multiple simultaneous active timers)
    const { data, error } = await (supabase.from('work_entries') as any)
      .update({
        timer_started_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)')
      .single();

    if (error) {
      if (
        error.message?.includes('timer_started_at') ||
        error.message?.includes('time_spent_seconds') ||
        error.message?.toLowerCase().includes('schema cache')
      ) {
        console.warn('Supabase work_entries timer columns not migrated yet. Falling back to local state:', error.message);
        const allEntries = getStoredMockEntries();
        const target = allEntries.find(e => e.id === id);
        if (target) {
          target.timer_started_at = nowIso;
          saveStoredMockEntries(allEntries);
        }
        const existing = activeEntries.find(e => e.id === id) || target;
        const result = {
          ...(existing || {}),
          id,
          timer_started_at: nowIso,
        } as WorkEntryWithDetails;

        dispatchGlobalTimerEvent({ id, action: 'start', entry: result });
        return result;
      }
      console.error('Supabase startWorkEntryTimer error:', error.message);
      throw new Error(`Database Error: ${error.message}`);
    }

    dispatchGlobalTimerEvent({ id, action: 'start', entry: data });

    const allEntries = getStoredMockEntries();
    const target = allEntries.find(e => e.id === id);
    if (target) {
      target.timer_started_at = nowIso;
      saveStoredMockEntries(allEntries);
    }

    return data as WorkEntryWithDetails;
  }

  // Local offline fallback
  const allEntries = getStoredMockEntries();
  const target = allEntries.find(e => e.id === id);
  if (!target) throw new Error('Work entry not found');

  target.timer_started_at = nowIso;
  saveStoredMockEntries(allEntries);

  dispatchGlobalTimerEvent({ id, action: 'start', entry: target });

  return target;
}

export async function stopWorkEntryTimer(
  id: string,
  currentEntry: WorkEntryWithDetails,
  userId?: string,
  action: 'stop' | 'pause' = 'stop'
): Promise<WorkEntryWithDetails> {
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  let additional = 0;
  if (currentEntry.timer_started_at) {
    const started = new Date(currentEntry.timer_started_at).getTime();
    if (!isNaN(started) && started > 0) {
      additional = Math.max(0, Math.floor((nowMs - started) / 1000));
    }
  }

  const newTotalSeconds = (currentEntry.time_spent_seconds || 0) + additional;

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await (supabase.from('work_entries') as any)
      .update({
        time_spent_seconds: newTotalSeconds,
        timer_started_at: null,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)')
      .single();

    if (error) {
      if (
        error.message?.includes('timer_started_at') ||
        error.message?.includes('time_spent_seconds') ||
        error.message?.toLowerCase().includes('schema cache')
      ) {
        console.warn('Supabase work_entries timer columns not migrated yet. Falling back to local state:', error.message);
        const allEntries = getStoredMockEntries();
        const target = allEntries.find(e => e.id === id);
        if (target) {
          target.time_spent_seconds = newTotalSeconds;
          target.timer_started_at = null;
          saveStoredMockEntries(allEntries);
        }
        const result = {
          ...currentEntry,
          time_spent_seconds: newTotalSeconds,
          timer_started_at: null,
        };
        dispatchGlobalTimerEvent({ id, action, entry: result });
        return result;
      }
      // On any other database error, still ensure local state is stopped so timer does not run indefinitely
      dispatchGlobalTimerEvent({
        id,
        action,
        entry: { ...currentEntry, time_spent_seconds: newTotalSeconds, timer_started_at: null }
      });
      console.error('Supabase stopWorkEntryTimer error:', error.message);
      throw new Error(`Database Error: ${error.message}`);
    }

    dispatchGlobalTimerEvent({ id, action, entry: data });

    // Also update local mock store so both local & Supabase are in sync
    const allEntries = getStoredMockEntries();
    const target = allEntries.find(e => e.id === id);
    if (target) {
      target.time_spent_seconds = newTotalSeconds;
      target.timer_started_at = null;
      saveStoredMockEntries(allEntries);
    }

    return data as WorkEntryWithDetails;
  }

  // Local offline fallback
  const allEntries = getStoredMockEntries();
  const target = allEntries.find(e => e.id === id);
  if (!target) throw new Error('Work entry not found');

  target.time_spent_seconds = newTotalSeconds;
  target.timer_started_at = null;
  saveStoredMockEntries(allEntries);

  dispatchGlobalTimerEvent({ id, action, entry: target });

  return target;
}

export async function getActiveRunningWorkEntries(userId?: string): Promise<WorkEntryWithDetails[]> {
  // Resolve effective user ID: use explicit param or fall back to current session
  let effectiveUserId = userId;
  if (!effectiveUserId && typeof window !== 'undefined') {
    const user = getLoggedInUser();
    if (user?.profileId) {
      effectiveUserId = user.profileId;
    }
  }

  // If no user is identified and caller didn't request 'all', return empty list
  if (!effectiveUserId) {
    return [];
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      let query = (supabase.from('work_entries') as any)
        .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)')
        .not('timer_started_at', 'is', null)
        .order('timer_started_at', { ascending: false });

      if (effectiveUserId !== 'all') {
        query = query.eq('user_id', effectiveUserId);
      }

      const { data, error } = await query;
      // When Supabase succeeds, return data directly — even if empty (meaning 0 active timers)
      if (!error && Array.isArray(data)) {
        return data as WorkEntryWithDetails[];
      }
    } catch (err) {
      console.warn('getActiveRunningWorkEntries notice:', err);
    }
  }

  // Check localStorage for fallback active timers ONLY if Supabase is unavailable
  if (typeof window !== 'undefined') {
    const activeIds: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('work_timer_started_')) {
        const entryId = key.replace('work_timer_started_', '');
        activeIds.push(entryId);
      }
    }

    if (activeIds.length > 0) {
      const all = getStoredMockEntries();
      const matched = all
        .filter(e => activeIds.includes(e.id) && (effectiveUserId === 'all' || e.user_id === effectiveUserId))
        .map(e => ({
          ...e,
          timer_started_at: localStorage.getItem(`work_timer_started_${e.id}`) || e.timer_started_at,
          time_spent_seconds: Number(localStorage.getItem(`work_time_spent_${e.id}`)) || e.time_spent_seconds || 0,
        }));
      if (matched.length > 0) return matched;
    }
  }

  const all = getStoredMockEntries();
  return all.filter(e => Boolean(e.timer_started_at) && (effectiveUserId === 'all' || e.user_id === effectiveUserId));
}

