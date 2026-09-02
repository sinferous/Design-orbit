-- Migration 007: Enable Row Level Security (RLS) and add public access policies for all tables

-- 1. PROFILES TABLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public delete access on profiles" ON public.profiles;

CREATE POLICY "Allow public read access on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on profiles" ON public.profiles FOR DELETE USING (true);

-- 2. CLIENTS TABLE
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public insert access on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public update access on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public delete access on clients" ON public.clients;

CREATE POLICY "Allow public read access on clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on clients" ON public.clients FOR DELETE USING (true);

-- 3. WORK TYPES TABLE
ALTER TABLE public.work_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on work_types" ON public.work_types;
DROP POLICY IF EXISTS "Allow public insert access on work_types" ON public.work_types;
DROP POLICY IF EXISTS "Allow public update access on work_types" ON public.work_types;
DROP POLICY IF EXISTS "Allow public delete access on work_types" ON public.work_types;

CREATE POLICY "Allow public read access on work_types" ON public.work_types FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on work_types" ON public.work_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on work_types" ON public.work_types FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on work_types" ON public.work_types FOR DELETE USING (true);

-- 4. WORK ENTRIES TABLE
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on work_entries" ON public.work_entries;
DROP POLICY IF EXISTS "Allow public insert access on work_entries" ON public.work_entries;
DROP POLICY IF EXISTS "Allow public update access on work_entries" ON public.work_entries;
DROP POLICY IF EXISTS "Allow public delete access on work_entries" ON public.work_entries;

CREATE POLICY "Allow public read access on work_entries" ON public.work_entries FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on work_entries" ON public.work_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on work_entries" ON public.work_entries FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on work_entries" ON public.work_entries FOR DELETE USING (true);
