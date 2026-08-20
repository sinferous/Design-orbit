-- Migration 004: Add password column to profiles table in Supabase PostgreSQL DB

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'strongpassword';
