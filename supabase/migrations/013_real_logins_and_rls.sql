-- Migration 013: Real logins (Supabase Auth) and row level security
--
-- Before: passwords were stored in plain text in profiles.password, sent to every
-- browser and checked there. Every table allowed full access with the public key.
--
-- After:
--   * Logins use Supabase Auth (hashed passwords, signed sessions).
--   * Old passwords are kept only as bcrypt hashes in private.legacy_passwords,
--     which the API cannot read. Each person's first login checks the old password,
--     asks for a new one, creates their Supabase login with the new one and links it
--     to their profile (claim_profile). The old hash is then deleted.
--   * People still on the shared default password get a temporary one from an admin
--     (Team page > key icon).
--   * Only linked team members can read data. People edit their own rows; admins edit everything.
--
-- Run in the Supabase SQL editor. Run it right after the matching app code is deployed.

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- 1. Hashed legacy passwords, out of reach of the API --------------------------------

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.legacy_passwords (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'password'
  ) THEN
    -- The shared default password (the column default) is public knowledge, so it is
    -- not carried over: those people get a temporary password from an admin instead.
    INSERT INTO private.legacy_passwords (profile_id, hash)
    SELECT p.id, extensions.crypt(p.password, extensions.gen_salt('bf'))
    FROM public.profiles p
    WHERE p.password IS NOT NULL AND p.password <> ''
      AND p.password IS DISTINCT FROM (
        SELECT split_part(trim(both '''' FROM split_part(c.column_default, '::', 1)), '''', 1)
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = 'profiles' AND c.column_name = 'password'
      )
    ON CONFLICT (profile_id) DO UPDATE SET hash = EXCLUDED.hash, updated_at = now();

    ALTER TABLE public.profiles DROP COLUMN password;
  END IF;
END $$;

-- Old, unlinked login accounts would block the first-login flow for their email
DELETE FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.auth_user_id = u.id);

-- 2. Helpers ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.my_profile_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_team() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id = auth.uid() AND is_active)
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND (lower(name) = 'admin'
           OR lower(email) = 'admin@webtreeonline.com'
           OR designation ILIKE '%administrator%'
           OR designation ILIKE '%system admin%')
  )
$$;

-- 3. Login functions ------------------------------------------------------------------

-- Names for the login dropdown (no passwords, works before login)
CREATE OR REPLACE FUNCTION public.login_directory()
RETURNS TABLE (id UUID, name TEXT, email TEXT, designation TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, email, designation FROM public.profiles WHERE is_active ORDER BY name
$$;

-- Checks an old password for someone who has not moved to the new login yet
CREATE OR REPLACE FUNCTION public.legacy_password_ok(p_email TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE ok BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN private.legacy_passwords l ON l.profile_id = p.id
    WHERE lower(p.email) = lower(trim(p_email))
      AND p.auth_user_id IS NULL
      AND l.hash = extensions.crypt(p_password, l.hash)
  ) INTO ok;
  IF NOT ok THEN PERFORM pg_sleep(0.7); END IF; -- slows down guessing
  RETURN ok;
END $$;

-- Links the signed-in login to its profile. Needs the old password, so a stranger who
-- signs up with a teammate's email cannot take over the profile.
CREATE OR REPLACE FUNCTION public.claim_profile(p_password TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  pid UUID;
  em TEXT := lower(auth.jwt() ->> 'email');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;

  SELECT id INTO pid FROM public.profiles WHERE auth_user_id = auth.uid();
  IF pid IS NOT NULL THEN RETURN pid; END IF;

  SELECT p.id INTO pid
  FROM public.profiles p
  JOIN private.legacy_passwords l ON l.profile_id = p.id
  WHERE lower(p.email) = em
    AND p.auth_user_id IS NULL
    AND l.hash = extensions.crypt(p_password, l.hash);

  IF pid IS NULL THEN RAISE EXCEPTION 'Password does not match'; END IF;

  UPDATE public.profiles SET auth_user_id = auth.uid(), updated_at = now() WHERE id = pid;
  DELETE FROM private.legacy_passwords WHERE profile_id = pid;
  RETURN pid;
END $$;

-- Admin: give someone a temporary password (new member, or forgotten password).
-- Removes their current login; they sign in with the temporary one and change it.
CREATE OR REPLACE FUNCTION public.admin_set_password(p_profile UUID, p_password TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  aid UUID;
  em TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF length(coalesce(p_password, '')) < 8 THEN RAISE EXCEPTION 'Use at least 8 characters'; END IF;

  SELECT auth_user_id, lower(email) INTO aid, em FROM public.profiles WHERE id = p_profile;
  IF NOT FOUND THEN RAISE EXCEPTION 'No such person'; END IF;
  IF aid = auth.uid() THEN RAISE EXCEPTION 'Change your own password in Settings'; END IF;

  UPDATE public.profiles SET auth_user_id = NULL, updated_at = now() WHERE id = p_profile;
  DELETE FROM auth.users WHERE id = aid OR lower(email) = em;

  INSERT INTO private.legacy_passwords (profile_id, hash)
  VALUES (p_profile, extensions.crypt(p_password, extensions.gen_salt('bf')))
  ON CONFLICT (profile_id) DO UPDATE SET hash = EXCLUDED.hash, updated_at = now();
END $$;

-- Admin: remove a person and their login
CREATE OR REPLACE FUNCTION public.admin_remove_member(p_profile UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE aid UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT auth_user_id INTO aid FROM public.profiles WHERE id = p_profile;
  IF aid = auth.uid() THEN RAISE EXCEPTION 'You cannot remove yourself'; END IF;
  DELETE FROM public.profiles WHERE id = p_profile;
  IF aid IS NOT NULL THEN DELETE FROM auth.users WHERE id = aid; END IF;
END $$;

REVOKE ALL ON FUNCTION public.my_profile_id(), public.is_team(), public.is_admin(),
  public.login_directory(), public.legacy_password_ok(TEXT, TEXT), public.claim_profile(TEXT),
  public.admin_set_password(UUID, TEXT), public.admin_remove_member(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.login_directory(), public.legacy_password_ok(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_profile_id(), public.is_team(), public.is_admin(),
  public.claim_profile(TEXT), public.admin_set_password(UUID, TEXT), public.admin_remove_member(UUID)
  TO authenticated;

-- 4. Row level security -----------------------------------------------------------------

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'clients', 'work_types', 'work_entries', 'todos', 'weekly_best_work')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_best_work ENABLE ROW LEVEL SECURITY;

-- No table access at all without a login
REVOKE ALL ON public.profiles, public.clients, public.work_types, public.work_entries,
  public.todos, public.weekly_best_work FROM anon;

-- Profiles: team reads; people may only change their own status fields; admins add people
REVOKE ALL ON public.profiles FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.profiles TO authenticated;
GRANT UPDATE (status_emoji, status_text, status_expires_at, status_updated_at, updated_at)
  ON public.profiles TO authenticated;

CREATE POLICY "Team reads profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_team());
CREATE POLICY "Own status updates" ON public.profiles FOR UPDATE TO authenticated
  USING (id = public.my_profile_id() OR public.is_admin())
  WITH CHECK (id = public.my_profile_id() OR public.is_admin());
CREATE POLICY "Admins add people" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins remove people" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- Clients and work types: shared by the team
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.work_types TO authenticated;
CREATE POLICY "Team manages clients" ON public.clients FOR ALL TO authenticated
  USING (public.is_team()) WITH CHECK (public.is_team());
CREATE POLICY "Team manages work types" ON public.work_types FOR ALL TO authenticated
  USING (public.is_team()) WITH CHECK (public.is_team());

-- Work entries: team reads all; people change their own; admins change all
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_entries TO authenticated;
CREATE POLICY "Team reads work" ON public.work_entries FOR SELECT TO authenticated USING (public.is_team());
CREATE POLICY "Own work inserts" ON public.work_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = public.my_profile_id() OR public.is_admin());
CREATE POLICY "Own work updates" ON public.work_entries FOR UPDATE TO authenticated
  USING (user_id = public.my_profile_id() OR public.is_admin())
  WITH CHECK (user_id = public.my_profile_id() OR public.is_admin());
CREATE POLICY "Own work deletes" ON public.work_entries FOR DELETE TO authenticated
  USING (user_id = public.my_profile_id() OR public.is_admin());

-- To-dos: private to each person
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todos TO authenticated;
CREATE POLICY "Own todos" ON public.todos FOR ALL TO authenticated
  USING (user_id = public.my_profile_id()) WITH CHECK (user_id = public.my_profile_id());

-- Weekly best work: team reads; people change their own; admins change all
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_best_work TO authenticated;
CREATE POLICY "Team reads best work" ON public.weekly_best_work FOR SELECT TO authenticated USING (public.is_team());
CREATE POLICY "Own best work" ON public.weekly_best_work FOR ALL TO authenticated
  USING (profile_id = public.my_profile_id() OR public.is_admin())
  WITH CHECK (profile_id = public.my_profile_id() OR public.is_admin());

-- 5. Let the API see the changes now ------------------------------------------------------

NOTIFY pgrst, 'reload schema';

-- People who still need a password from an admin (had none set)
SELECT name, email FROM public.profiles p
WHERE p.auth_user_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM private.legacy_passwords l WHERE l.profile_id = p.id);
