-- Migration 002: Fix Row Level Security (RLS) policies for anonymous and authenticated access

-- 1. CLIENTS POLICIES
DROP POLICY IF EXISTS "Anyone can view clients" ON public.clients;
DROP POLICY IF EXISTS "Anyone can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Anyone can update clients" ON public.clients;
DROP POLICY IF EXISTS "Anyone can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public select on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public insert on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public update on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public delete on clients" ON public.clients;

CREATE POLICY "Allow public select on clients" ON public.clients FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on clients" ON public.clients FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on clients" ON public.clients FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on clients" ON public.clients FOR DELETE TO public USING (true);

-- 2. PROFILES POLICIES
DROP POLICY IF EXISTS "Anyone can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public select on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update on profiles" ON public.profiles;

CREATE POLICY "Allow public select on profiles" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on profiles" ON public.profiles FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on profiles" ON public.profiles FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 3. WORK TYPES POLICIES
DROP POLICY IF EXISTS "Authenticated users can view work types" ON public.work_types;
DROP POLICY IF EXISTS "Authenticated users can insert work types" ON public.work_types;
DROP POLICY IF EXISTS "Allow public select on work_types" ON public.work_types;
DROP POLICY IF EXISTS "Allow public insert on work_types" ON public.work_types;

CREATE POLICY "Allow public select on work_types" ON public.work_types FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on work_types" ON public.work_types FOR INSERT TO public WITH CHECK (true);

-- 4. WORK ENTRIES POLICIES
DROP POLICY IF EXISTS "Anyone can view all work entries" ON public.work_entries;
DROP POLICY IF EXISTS "Anyone can insert work entries" ON public.work_entries;
DROP POLICY IF EXISTS "Anyone can update work entries" ON public.work_entries;
DROP POLICY IF EXISTS "Anyone can delete work entries" ON public.work_entries;
DROP POLICY IF EXISTS "Allow public select on work_entries" ON public.work_entries;
DROP POLICY IF EXISTS "Allow public insert on work_entries" ON public.work_entries;
DROP POLICY IF EXISTS "Allow public update on work_entries" ON public.work_entries;
DROP POLICY IF EXISTS "Allow public delete on work_entries" ON public.work_entries;

CREATE POLICY "Allow public select on work_entries" ON public.work_entries FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on work_entries" ON public.work_entries FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on work_entries" ON public.work_entries FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on work_entries" ON public.work_entries FOR DELETE TO public USING (true);
