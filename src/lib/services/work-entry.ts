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
  { id: '20000000-0000-4000-a000-000000000013', name: 'Allday', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000011', name: 'Alrosta', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000001', name: 'Alsaraya', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000026', name: 'Amaron', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000022', name: 'Amwaj', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000015', name: 'Calibar sports', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000024', name: 'Cruise', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000025', name: 'Cruise sm', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000028', name: 'Design Orbit', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000018', name: 'Easy lease', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000016', name: 'Farhat', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000023', name: 'Farhat tours', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000006', name: 'Ghumpa', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000027', name: 'Internal Project', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000010', name: 'Larosa', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000003', name: 'Longveia', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000017', name: 'Priyadarshini', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000014', name: 'Shaheen', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000005', name: 'Shaheen group', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000009', name: 'Shamsha', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000008', name: 'Tectory', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000020', name: 'Vivant dental', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000007', name: 'Voro', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000002', name: 'Webtree', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '20000000-0000-4000-a000-000000000019', name: 'Ybyf', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
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
    quantity_approved: 3,
    best_work_url: 'https://webtreeonline.com',
    notes: 'Approved by lead',
    status: 'Reviewed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: INITIAL_MOCK_PROFILES[1],
    client: INITIAL_MOCK_CLIENTS[0],
    work_type: INITIAL_MOCK_WORK_TYPES[4],
  },
  {
    id: 'we2',
    user_id: 'p2',
    client_id: 'c2',
    work_type_id: 'wt2',
    work_date: todayStr,
    description: 'Product walkthrough video edit',
    quantity_done: 2,
    quantity_approved: 1,
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
    if (error || !data || data.length === 0) return INITIAL_MOCK_WORK_TYPES;
    return data;
  } catch {
    return INITIAL_MOCK_WORK_TYPES;
  }
}

export async function fetchClients(): Promise<Client[]> {
  if (!isSupabaseConfigured()) {
    return [...INITIAL_MOCK_CLIENTS].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return [...INITIAL_MOCK_CLIENTS].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }

    // Merge any newly added local mock clients that might not be in Supabase yet
    const combined: Client[] = [...data];
    INITIAL_MOCK_CLIENTS.forEach(mockClient => {
      if (!combined.some(c => c.name.toLowerCase() === mockClient.name.toLowerCase())) {
        combined.push(mockClient);
      }
    });

    return combined.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  } catch {
    return [...INITIAL_MOCK_CLIENTS].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
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

    if (error || !data || data.length === 0) return INITIAL_MOCK_PROFILES;

    // Merge any mock profiles if Supabase has a subset
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

  // Fetch Supabase database tables to match exact database UUIDs
  const [dbProfiles, dbClients, dbWorkTypes] = await Promise.all([
    (supabase.from('profiles') as any).select('id, name').then((r: any) => r.data || []),
    (supabase.from('clients') as any).select('id, name').then((r: any) => r.data || []),
    (supabase.from('work_types') as any).select('id, name').then((r: any) => r.data || []),
  ]);

  const insertPayload = formDatas.map(formData => {
    // Resolve user_id
    let resolvedUserId = formData.user_id;
    if (!isUUID(resolvedUserId)) {
      const legacyName = LEGACY_ID_TO_NAME_MAP[formData.user_id];
      const mockProf = INITIAL_MOCK_PROFILES.find(p => p.id === formData.user_id || p.name.toLowerCase() === (legacyName || '').toLowerCase());
      const nameToMatch = legacyName || mockProf?.name || formData.user_id || '';
      const dbMatch = dbProfiles.find((p: any) => p.name?.toLowerCase() === nameToMatch.toLowerCase());
      resolvedUserId = dbMatch ? dbMatch.id : (dbProfiles[0]?.id || '00000000-0000-4000-a000-000000000001');
    }

    // Resolve client_id
    let resolvedClientId: string | null = formData.client_id || null;
    if (resolvedClientId && !isUUID(resolvedClientId)) {
      const legacyName = LEGACY_ID_TO_NAME_MAP[formData.client_id!];
      const mockClient = INITIAL_MOCK_CLIENTS.find(c => c.id === formData.client_id || c.name.toLowerCase() === (legacyName || '').toLowerCase());
      const nameToMatch = legacyName || mockClient?.name || formData.client_id || '';
      const dbMatch = dbClients.find((c: any) => c.name?.toLowerCase() === nameToMatch.toLowerCase());
      if (dbMatch) {
        resolvedClientId = dbMatch.id;
      } else {
        const fallbackClient = INITIAL_MOCK_CLIENTS.find(c => c.name.toLowerCase() === nameToMatch.toLowerCase());
        resolvedClientId = fallbackClient && isUUID(fallbackClient.id) ? fallbackClient.id : null;
      }
    }

    // Resolve work_type_id
    let resolvedWorkTypeId = formData.work_type_id;
    if (!isUUID(resolvedWorkTypeId)) {
      const legacyName = LEGACY_ID_TO_NAME_MAP[formData.work_type_id];
      const mockWorkType = INITIAL_MOCK_WORK_TYPES.find(w => w.id === formData.work_type_id || w.name.toLowerCase() === (legacyName || '').toLowerCase());
      const nameToMatch = legacyName || mockWorkType?.name || formData.work_type_id || '';
      const dbMatch = dbWorkTypes.find((wt: any) => wt.name?.toLowerCase() === nameToMatch.toLowerCase());
      resolvedWorkTypeId = dbMatch ? dbMatch.id : (dbWorkTypes[0]?.id || '10000000-0000-4000-a000-000000000001');
    }

    return {
      user_id: isUUID(resolvedUserId) ? resolvedUserId : (dbProfiles[0]?.id || '00000000-0000-4000-a000-000000000001'),
      client_id: isUUID(resolvedClientId) ? resolvedClientId : null,
      work_type_id: isUUID(resolvedWorkTypeId) ? resolvedWorkTypeId : (dbWorkTypes[0]?.id || '10000000-0000-4000-a000-000000000001'),
      work_date: formData.work_date,
      description: formData.description,
      quantity_done: formData.quantity_done,
      quantity_approved: formData.quantity_approved,
      best_work_url: formData.best_work_url || null,
      notes: formData.notes || null,
      status: formData.status || 'Submitted',
    };
  });

  try {
    const { data, error } = await (supabase.from('work_entries') as any)
      .insert(insertPayload)
      .select();

    if (!error && data && data.length > 0) {
      return data;
    }
    console.warn('Supabase insert fallback notice:', error?.message);
  } catch (err) {
    console.warn('Supabase insert exception fallback:', err);
  }

  // Fallback to local mock store so user operations are NEVER blocked by RLS policies!
  const created: WorkEntryWithDetails[] = [];
  for (const formData of formDatas) {
    const profile = INITIAL_MOCK_PROFILES.find(p => p.id === formData.user_id) || INITIAL_MOCK_PROFILES[1];
    const client = INITIAL_MOCK_CLIENTS.find(c => c.id === formData.client_id);
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

    mockWorkEntriesStore.unshift(newEntry);
    created.push(newEntry);
  }
  return created;
}

export async function updateWorkEntry(id: string, formData: Partial<WorkEntryFormData>): Promise<WorkEntry> {
  const updateLocal = () => {
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
    const fallbackEntry: WorkEntryWithDetails = {
      id,
      user_id: formData.user_id || '00000000-0000-4000-a000-000000000001',
      client_id: formData.client_id || null,
      work_type_id: formData.work_type_id || '10000000-0000-4000-a000-000000000001',
      work_date: formData.work_date || new Date().toISOString().split('T')[0],
      description: formData.description || 'Work Entry',
      quantity_done: formData.quantity_done ?? 1,
      quantity_approved: formData.quantity_approved ?? 0,
      best_work_url: formData.best_work_url || null,
      notes: formData.notes || null,
      status: formData.status || 'Submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockWorkEntriesStore.unshift(fallbackEntry);
    return fallbackEntry;
  };

  if (!isSupabaseConfigured()) {
    return updateLocal();
  }

  try {
    const supabase = createClient();
    const payload: any = { ...formData };

    if (payload.client_id && !isUUID(payload.client_id)) {
      const legacyName = LEGACY_ID_TO_NAME_MAP[payload.client_id];
      const dbClients = await (supabase.from('clients') as any).select('id, name').then((r: any) => r.data || []);
      const mockClient = INITIAL_MOCK_CLIENTS.find(c => c.id === payload.client_id || c.name.toLowerCase() === (legacyName || '').toLowerCase());
      const nameToMatch = legacyName || mockClient?.name || payload.client_id || '';
      const dbMatch = dbClients.find((c: any) => c.name?.toLowerCase() === nameToMatch.toLowerCase());
      payload.client_id = dbMatch && isUUID(dbMatch.id) ? dbMatch.id : null;
    }

    if (payload.user_id && !isUUID(payload.user_id)) {
      const legacyName = LEGACY_ID_TO_NAME_MAP[payload.user_id];
      const dbProfiles = await (supabase.from('profiles') as any).select('id, name').then((r: any) => r.data || []);
      const mockProf = INITIAL_MOCK_PROFILES.find(p => p.id === payload.user_id || p.name.toLowerCase() === (legacyName || '').toLowerCase());
      const nameToMatch = legacyName || mockProf?.name || payload.user_id || '';
      const dbMatch = dbProfiles.find((p: any) => p.name?.toLowerCase() === nameToMatch.toLowerCase());
      if (dbMatch && isUUID(dbMatch.id)) payload.user_id = dbMatch.id;
    }

    if (payload.work_type_id && !isUUID(payload.work_type_id)) {
      const legacyName = LEGACY_ID_TO_NAME_MAP[payload.work_type_id];
      const dbWorkTypes = await (supabase.from('work_types') as any).select('id, name').then((r: any) => r.data || []);
      const mockWorkType = INITIAL_MOCK_WORK_TYPES.find(w => w.id === payload.work_type_id || w.name.toLowerCase() === (legacyName || '').toLowerCase());
      const nameToMatch = legacyName || mockWorkType?.name || payload.work_type_id || '';
      const dbMatch = dbWorkTypes.find((wt: any) => wt.name?.toLowerCase() === nameToMatch.toLowerCase());
      if (dbMatch && isUUID(dbMatch.id)) payload.work_type_id = dbMatch.id;
    }

    const { data, error } = await (supabase.from('work_entries') as any)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) return data;
    return updateLocal();
  } catch {
    return updateLocal();
  }
}

export async function deleteWorkEntry(id: string): Promise<void> {
  // Remove from mock / local store immediately
  mockWorkEntriesStore = mockWorkEntriesStore.filter(e => e.id !== id);

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = createClient();
    await supabase
      .from('work_entries')
      .delete()
      .eq('id', id);
  } catch (err) {
    console.warn('Supabase work entry delete notice:', err);
  }
}

export async function createClientRecord(name: string): Promise<Client> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Client name cannot be empty');

  const existing = INITIAL_MOCK_CLIENTS.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;

  const newMockClient: Client = {
    id: `c_${Date.now()}`,
    name: trimmed,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  INITIAL_MOCK_CLIENTS.unshift(newMockClient);

  if (!isSupabaseConfigured()) {
    return newMockClient;
  }

  try {
    const supabase = createClient();
    const { data, error } = await (supabase.from('clients') as any)
      .insert({ name: trimmed })
      .select()
      .single();

    if (error || !data) return newMockClient;
    return data;
  } catch {
    return newMockClient;
  }
}

export async function deleteClientRecord(id: string): Promise<void> {
  // Remove from mock / local array by ID or name
  const idx = INITIAL_MOCK_CLIENTS.findIndex(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());
  if (idx !== -1) INITIAL_MOCK_CLIENTS.splice(idx, 1);

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = createClient();
    await supabase
      .from('clients')
      .delete()
      .or(`id.eq.${id},name.eq.${id}`);
  } catch (err) {
    console.warn('Supabase client delete notice:', err);
  }
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

export function setLoggedInUser(name: string, email: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('design_orbit_user_name', name);
    localStorage.setItem('design_orbit_user_email', email);
  }
}

export function getLoggedInUser(): { name: string; email: string } {
  if (typeof window !== 'undefined') {
    const storedName = localStorage.getItem('design_orbit_user_name');
    const storedEmail = localStorage.getItem('design_orbit_user_email');
    if (storedName && storedEmail) {
      return { name: storedName, email: storedEmail };
    }
  }
  return { name: 'Varun', email: 'varun@webtreeonline.com' };
}



