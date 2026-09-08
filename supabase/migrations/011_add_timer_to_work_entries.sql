-- Migration 011: Add time tracking columns to work_entries table for daily task timers
-- time_spent_seconds stores the cumulative seconds spent working on this deliverable
-- timer_started_at stores the ISO timestamp when the active timer was started (NULL if idle/stopped)

ALTER TABLE public.work_entries 
ADD COLUMN IF NOT EXISTS time_spent_seconds INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ DEFAULT NULL;

-- Index for querying active running timers on work entries
CREATE INDEX IF NOT EXISTS idx_work_entries_timer_started_at 
ON public.work_entries(timer_started_at) 
WHERE timer_started_at IS NOT NULL;
