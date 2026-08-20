export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          auth_user_id: string | null
          name: string
          designation: string | null
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          name: string
          designation?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          name?: string
          designation?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      work_types: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      work_entries: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          work_type_id: string
          work_date: string
          description: string
          quantity_done: number
          quantity_approved: number
          best_work_url: string | null
          notes: string | null
          status: 'Draft' | 'Submitted' | 'Reviewed' | 'Needs Changes'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          work_type_id: string
          work_date: string
          description: string
          quantity_done?: number
          quantity_approved?: number
          best_work_url?: string | null
          notes?: string | null
          status?: 'Draft' | 'Submitted' | 'Reviewed' | 'Needs Changes'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string | null
          work_type_id?: string
          work_date?: string
          description?: string
          quantity_done?: number
          quantity_approved?: number
          best_work_url?: string | null
          notes?: string | null
          status?: 'Draft' | 'Submitted' | 'Reviewed' | 'Needs Changes'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
