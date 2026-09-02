-- Migration 005: Add project_url column to work_entries table

ALTER TABLE public.work_entries
ADD COLUMN IF NOT EXISTS project_url TEXT;

-- Backfill project_url from best_work_url if best_work_url has existing values
UPDATE public.work_entries
SET project_url = best_work_url
WHERE project_url IS NULL AND best_work_url IS NOT NULL;
