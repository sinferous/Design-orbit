-- Migration 003: Disable Row Level Security (RLS) on internal application tables to prevent policy violations

ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries DISABLE ROW LEVEL SECURITY;
