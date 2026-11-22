-- Migration 014: Stop creating a blank profile for every new login
--
-- Migration 001 added on_auth_user_created, which inserts a profile for each new
-- Supabase login. With migration 013, a person's first sign-in creates their login,
-- so the trigger made a second, empty profile and claim_profile linked the login to
-- it instead of the person's real profile (two "Varun" rows on the login page).
--
-- This drops the trigger and moves any such login onto the real profile.

SET lock_timeout = '5s';
SET statement_timeout = '60s';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT d.id AS dup_id, d.auth_user_id AS aid, o.id AS real_id
    FROM public.profiles d
    JOIN public.profiles o
      ON lower(o.email) = lower(d.email) AND o.id <> d.id AND o.auth_user_id IS NULL
    WHERE d.auth_user_id IS NOT NULL
      AND d.created_at > o.created_at
  LOOP
    UPDATE public.work_entries SET user_id = r.real_id WHERE user_id = r.dup_id;
    UPDATE public.todos SET user_id = r.real_id WHERE user_id = r.dup_id;
    UPDATE public.weekly_best_work SET profile_id = r.real_id WHERE profile_id = r.dup_id;
    UPDATE public.profiles SET auth_user_id = NULL WHERE id = r.dup_id;
    UPDATE public.profiles SET auth_user_id = r.aid, updated_at = now() WHERE id = r.real_id;
    DELETE FROM private.legacy_passwords WHERE profile_id = r.real_id;
    DELETE FROM public.profiles WHERE id = r.dup_id;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

SELECT name, email, auth_user_id IS NOT NULL AS linked,
  (SELECT count(*) FROM public.work_entries w WHERE w.user_id = p.id) AS entries
FROM public.profiles p ORDER BY lower(name);
