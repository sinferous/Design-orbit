-- Migration 006: Create weekly_best_work table

CREATE TABLE IF NOT EXISTS public.weekly_best_work (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_profile_week UNIQUE (profile_id, week_start_date)
);

-- Enable RLS and public policies for weekly_best_work
ALTER TABLE public.weekly_best_work ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to weekly_best_work" 
    ON public.weekly_best_work FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to weekly_best_work" 
    ON public.weekly_best_work FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to weekly_best_work" 
    ON public.weekly_best_work FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to weekly_best_work" 
    ON public.weekly_best_work FOR DELETE USING (true);
