-- Migration 010: Add time tracking columns to todos table for start/stop timer
-- time_spent_seconds stores the accumulated tracked seconds
-- timer_started_at stores the ISO timestamp when the active timer was started (NULL if idle/stopped)

ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS time_spent_seconds INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ DEFAULT NULL;

-- Index for querying active timers
CREATE INDEX IF NOT EXISTS idx_todos_timer_started_at ON public.todos(timer_started_at) WHERE timer_started_at IS NOT NULL;
