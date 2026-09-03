-- Migration 009: Add position column to todos table for drag-and-drop reordering

ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_todos_position ON public.todos(position ASC);
