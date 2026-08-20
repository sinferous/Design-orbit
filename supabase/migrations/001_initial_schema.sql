-- Migration 001: Initial Schema for Creative Team Work Tracker

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
    name TEXT NOT NULL,
    designation TEXT,
    email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. WORK TYPES TABLE
CREATE TABLE IF NOT EXISTS public.work_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WORK ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.work_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    work_type_id UUID NOT NULL REFERENCES public.work_types(id) ON DELETE RESTRICT,
    work_date DATE NOT NULL,
    description TEXT NOT NULL,
    quantity_done INTEGER NOT NULL DEFAULT 1 CONSTRAINT check_quantity_done_positive CHECK (quantity_done >= 0),
    quantity_approved INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_quantity_approved_positive CHECK (quantity_approved >= 0),
    best_work_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted' CONSTRAINT check_status_valid CHECK (status IN ('Draft', 'Submitted', 'Reviewed', 'Needs Changes')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR FAST REPORTING & FILTERING
CREATE INDEX IF NOT EXISTS idx_work_entries_work_date ON public.work_entries(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_entries_user_id ON public.work_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_work_entries_work_type_id ON public.work_entries(work_type_id);
CREATE INDEX IF NOT EXISTS idx_work_entries_client_id ON public.work_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_work_entries_user_date ON public.work_entries(user_id, work_date DESC);

-- AUTOMATIC UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_work_types_updated_at
    BEFORE UPDATE ON public.work_types
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_work_entries_updated_at
    BEFORE UPDATE ON public.work_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (auth_user_id, email, name, designation)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'designation', 'Designer')
    )
    ON CONFLICT (auth_user_id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Anyone can view team profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert team profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Clients Policies
CREATE POLICY "Anyone can view clients"
    ON public.clients FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert clients"
    ON public.clients FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can delete clients"
    ON public.clients FOR DELETE
    USING (true);

CREATE POLICY "Anyone can update clients"
    ON public.clients FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Work Types Policies
CREATE POLICY "Authenticated users can view work types"
    ON public.work_types FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert work types"
    ON public.work_types FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Work Entries Policies
CREATE POLICY "Anyone can view all work entries"
    ON public.work_entries FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert work entries"
    ON public.work_entries FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update work entries"
    ON public.work_entries FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can delete work entries"
    ON public.work_entries FOR DELETE
    USING (true);
