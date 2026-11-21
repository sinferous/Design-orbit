-- Migration 012: Custom team status (emoji + short text) shown in the sidebar
-- status_expires_at NULL means the status stays until the person clears it

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status_emoji TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status_expires_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Keep statuses short
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_text_length;
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_status_text_length CHECK (status_text IS NULL OR char_length(status_text) <= 60);
