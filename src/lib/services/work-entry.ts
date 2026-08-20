import { createClient } from '@/lib/supabase/client';
import { WorkEntry, WorkEntryFormData, WorkEntryWithDetails, WorkType, Client, Profile } from '@/types';

// MOCK SEED DATA FOR OFFLINE / PREVIEW MODE
export const INITIAL_MOCK_PROFILES: Profile[] = [
  { id: 'p0', auth_user_id: null, name: 'Admin', designation: 'System Administrator', email: 'admin@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p1', auth_user_id: null, name: 'Gajesh', designation: 'UI/UX Designer', email: 'gajesh@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p2', auth_user_id: null, name: 'Fazil', designation: 'Senior UI/UX Designer', email: 'fazil@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p3', auth_user_id: null, name: 'Varun', designation: 'Graphic Designer', email: 'varun@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p4', auth_user_id: null, name: 'Moveena', designation: 'Senior Graphic Designer', email: 'moveena@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p5', auth_user_id: null, name: 'Shashiraj', designation: 'Graphic Designer', email: 'shashiraj@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p6', auth_user_id: null, name: 'Prasanna Lakshmi', designation: 'Graphic Designer', email: 'prasanna@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p7', auth_user_id: null, name: 'Samantha', designation: 'Design Team Lead', email: 'sams@webtreeonline.com', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const INITIAL_MOCK_WORK_TYPES: WorkType[] = [
  { id: 'wt1', name: 'Static', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'wt2', name: 'Video', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'wt3', name: 'Mobile App', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'wt4', name: 'Landing Page', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'wt5', name: 'Website', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'wt6', name: 'UI/UX', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'wt7', name: 'Logo', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'wt8', name: 'Edits', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'wt9', name: 'Working', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'wt10', name: 'Other', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const INITIAL_MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Longovia', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c2', name: 'Design Orbit', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c3', name: 'Webtree Corporate', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c4', name: 'Internal Project', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const todayStr = new Date().toISOString().split('T')[0];

let mockWorkEntriesStore: WorkEntryWithDetails[] = [
  {
    id: 'we1',
    user_id: 'p1',
    client_id: 'c1',
    work_type_id: 'wt5',
    work_date: todayStr,
    description: 'Homepage redesign & layout updates',
    quantity_done: 3,
    quantity_approved: 2,
    best_work_url: null,
    notes: 'Homepage revised based on client feedback from morning call.',
    status: 'Submitted',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: INITIAL_MOCK_PROFILES[0],
    client: INITIAL_MOCK_CLIENTS[0],
    work_type: INITIAL_MOCK_WORK_TYPES[4],
  },
  {
    id: 'we2',
    user_id: 'p1',
    client_id: 'c2',
    work_type_id: 'wt6',
    work_date: todayStr,
    description: 'Design system tokens & button component states',
    quantity_done: 5,
    quantity_approved: 5,
    best_work_url: null,
    notes: 'Approved during internal UI review.',
    status: 'Reviewed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: INITIAL_MOCK_PROFILES[0],
    client: INITIAL_MOCK_CLIENTS[1],
    work_type: INITIAL_MOCK_WORK_TYPES[5],
  },
  {
    id: 'we3',
    user_id: 'p2',
    client_id: 'c1',
    work_type_id: 'wt2',
    work_date: todayStr,
    description: 'Product walkthrough video edit',
    quantity_done: 2,
    quantity_approved: 1,
    best_work_url: null,
    notes: 'First cut delivered for client approval.',
    status: 'Submitted',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: INITIAL_MOCK_PROFILES[1],
    client: INITIAL_MOCK_CLIENTS[0],
    work_type: INITIAL_MOCK_WORK_TYPES[1],
  },
];

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes('your-supabase-project'));
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
    if (error || !data) return INITIAL_MOCK_WORK_TYPES;
    return data;
  } catch {
    return INITIAL_MOCK_WORK_TYPES;
  }
}

export async function fetchClients(): Promise<Client[]> {
  if (!isSupabaseConfigured()) return INITIAL_MOCK_CLIENTS;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error || !data) return INITIAL_MOCK_CLIENTS;
    return data;
  } catch {
    return INITIAL_MOCK_CLIENTS;
  }
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
    if (error || !data) return INITIAL_MOCK_PROFILES;
    return data;
  } catch {
    return INITIAL_MOCK_PROFILES;
  }
}

export async function fetchWorkEntriesByDate(dateStr: string, userId?: string): Promise<WorkEntryWithDetails[]> {
  if (!isSupabaseConfigured()) {
    return mockWorkEntriesStore.filter(e => {
      const matchDate = e.work_date === dateStr;
      const matchUser = userId ? e.user_id === userId : true;
      return matchDate && matchUser;
    });
  }
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
    if (error || !data) return mockWorkEntriesStore.filter(e => e.work_date === dateStr);
    return data as WorkEntryWithDetails[];
  } catch {
    return mockWorkEntriesStore.filter(e => e.work_date === dateStr);
  }
}

export async function fetchWorkEntryById(id: string): Promise<WorkEntryWithDetails | null> {
  if (!isSupabaseConfigured()) {
    const found = mockWorkEntriesStore.find(e => e.id === id);
    return found || null;
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

export async function createWorkEntry(formData: WorkEntryFormData): Promise<WorkEntry> {
  if (!isSupabaseConfigured()) {
    const profile = INITIAL_MOCK_PROFILES.find(p => p.id === formData.user_id) || INITIAL_MOCK_PROFILES[0];
    const client = INITIAL_MOCK_CLIENTS.find(c => c.id === formData.client_id) || null;
    const work_type = INITIAL_MOCK_WORK_TYPES.find(w => w.id === formData.work_type_id) || INITIAL_MOCK_WORK_TYPES[0];

    const newEntry: WorkEntryWithDetails = {
      id: `we_${Date.now()}`,
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

    mockWorkEntriesStore.unshift(newEntry);
    return newEntry;
  }

  const supabase = createClient();
  const { data, error } = await (supabase.from('work_entries') as any)
    .insert([
      {
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
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createWorkEntriesBatch(formDatas: WorkEntryFormData[]): Promise<WorkEntry[]> {
  if (formDatas.length === 0) return [];

  if (!isSupabaseConfigured()) {
    const created: WorkEntryWithDetails[] = [];
    for (let i = 0; i < formDatas.length; i++) {
      const formData = formDatas[i];
      const profile = INITIAL_MOCK_PROFILES.find(p => p.id === formData.user_id) || INITIAL_MOCK_PROFILES[0];
      const client = INITIAL_MOCK_CLIENTS.find(c => c.id === formData.client_id) || null;
      const work_type = INITIAL_MOCK_WORK_TYPES.find(w => w.id === formData.work_type_id) || INITIAL_MOCK_WORK_TYPES[0];

      const newEntry: WorkEntryWithDetails = {
        id: `we_${Date.now()}_${i}`,
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

      mockWorkEntriesStore.unshift(newEntry);
      created.push(newEntry);
    }
    return created;
  }

  const supabase = createClient();
  const insertPayload = formDatas.map(formData => ({
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
  }));

  const { data, error } = await (supabase.from('work_entries') as any)
    .insert(insertPayload)
    .select();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateWorkEntry(id: string, formData: Partial<WorkEntryFormData>): Promise<WorkEntry> {
  if (!isSupabaseConfigured()) {
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
    throw new Error('Entry not found');
  }

  const supabase = createClient();
  const { data, error } = await (supabase.from('work_entries') as any)
    .update(formData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteWorkEntry(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    mockWorkEntriesStore = mockWorkEntriesStore.filter(e => e.id !== id);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('work_entries')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function createClientRecord(name: string): Promise<Client> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Client name cannot be empty');

  if (!isSupabaseConfigured()) {
    const existing = INITIAL_MOCK_CLIENTS.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const newClient: Client = {
      id: `c_${Date.now()}`,
      name: trimmed,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    INITIAL_MOCK_CLIENTS.unshift(newClient);
    return newClient;
  }

  const supabase = createClient();
  const { data, error } = await (supabase.from('clients') as any)
    .insert({ name: trimmed })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteClientRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const idx = INITIAL_MOCK_CLIENTS.findIndex(c => c.id === id);
    if (idx !== -1) INITIAL_MOCK_CLIENTS.splice(idx, 1);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function createProfileRecord(data: { name: string; designation: string; email: string }): Promise<Profile> {
  const name = data.name.trim();
  const designation = data.designation.trim();
  const email = data.email.trim();

  if (!name) throw new Error('Member name is required');
  if (!email) throw new Error('Email is required');

  if (!isSupabaseConfigured()) {
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

  const supabase = createClient();
  const { data: created, error } = await (supabase.from('profiles') as any)
    .insert({ name, designation, email })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return created;
}

export async function deleteProfileRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const idx = INITIAL_MOCK_PROFILES.findIndex(p => p.id === id);
    if (idx !== -1) INITIAL_MOCK_PROFILES.splice(idx, 1);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}


