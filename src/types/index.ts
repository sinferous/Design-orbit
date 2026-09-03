import { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type WorkType = Database['public']['Tables']['work_types']['Row'];
export type WorkEntry = Database['public']['Tables']['work_entries']['Row'];

export interface WorkEntryWithDetails extends WorkEntry {
  profile?: Profile;
  client?: Client | null;
  work_type?: WorkType;
  project_url?: string | null;
}

export type WorkStatus = 'Draft' | 'Submitted' | 'Reviewed' | 'Needs Changes';

export interface WorkEntryFormData {
  user_id: string;
  client_id?: string;
  work_type_id: string;
  work_date: string;
  description: string;
  quantity_done: number;
  quantity_approved: number;
  best_work_url?: string;
  project_url?: string;
  notes?: string;
  status?: WorkStatus;
}

export interface TodoItem {
  id: string;
  user_id?: string | null;
  task: string;
  is_completed: boolean;
  position?: number;
  created_at: string;
  updated_at?: string;
}

