-- Migration 008: Create todos table for dashboard task tracking with RLS

CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON public.todos(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies allowing full read, insert, update, and delete access
DROP POLICY IF EXISTS "Allow public read access on todos" ON public.todos;
DROP POLICY IF EXISTS "Allow public insert access on todos" ON public.todos;
DROP POLICY IF EXISTS "Allow public update access on todos" ON public.todos;
DROP POLICY IF EXISTS "Allow public delete access on todos" ON public.todos;

CREATE POLICY "Allow public read access on todos" ON public.todos FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on todos" ON public.todos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on todos" ON public.todos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on todos" ON public.todos FOR DELETE USING (true);
