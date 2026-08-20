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
  { id: '10000000-0000-4000-a000-000000000009', name: 'Working', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
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

export function getLoggedInUser(): { name: string; email: string } {
  if (typeof window !== 'undefined') {
    const storedName = localStorage.getItem('design_orbit_logged_in_name');
    const storedEmail = localStorage.getItem('design_orbit_logged_in_email');
    if (storedName) {
      return { name: storedName, email: storedEmail || 'varun@webtreeonline.com' };
    }
  }
  return { name: 'Varun', email: 'varun@webtreeonline.com' };
}

export function setLoggedInUser(name: string, email: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('design_orbit_logged_in_name', name);
    localStorage.setItem('design_orbit_logged_in_email', email);
  }
}

export async function fetchWorkTypes(): Promise<WorkType[]> {
  if (!isSupabaseConfigured()) return INITIAL_MOCK_WORK_TYPES;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('work_types')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error || !data || data.length === 0) return INITIAL_MOCK_WORK_TYPES;
    return data;
  } catch {
    return INITIAL_MOCK_WORK_TYPES;
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

      insertPayload.push({
        user_id: dbUserId,
        client_id: dbClientId,
        work_type_id: dbWorkTypeId,
        work_date: formData.work_date,
        description: formData.description,
        quantity_done: formData.quantity_done,
        quantity_approved: formData.quantity_approved,
        best_work_url: formData.best_work_url || null,
        notes: formData.notes || null,
        status: formData.status || 'Submitted',
      });
    }

    const { data, error } = await (supabase.from('work_entries') as any)
      .insert(insertPayload)
      .select('*, profile:profiles(*), client:clients(*), work_type:work_types(*)');

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

    const newEntry: WorkEntryWithDetails = {
      id: `we_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: formData.user_id,
      client_id: formData.client_id || null,
      work_type_id: formData.work_type_id,
      work_date: formData.work_date,
      description: formData.description,
      quantity_done: formData.quantity_done,
      quantity_approved: formData.quantity_approved,
      best_work_url: formData.best_work_url || null,
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
    const payload: any = { ...formData, updated_at: new Date().toISOString() };

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

export async function createProfileRecord(data: { name: string; designation: string; email: string }): Promise<Profile> {
  const name = data.name.trim();
  const designation = data.designation.trim();
  const email = data.email.trim();

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
