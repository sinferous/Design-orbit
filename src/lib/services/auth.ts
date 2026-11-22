import { createClient } from '@/lib/supabase/client';

/**
 * Logins run on Supabase Auth (hashed passwords, signed sessions).
 *
 * People who had a password before the switch sign in once with it. The database checks
 * it against a stored hash (legacy_password_ok), they choose a new password, their Supabase
 * login is created with the new one, and claim_profile links it to their profile.
 */

export const MIN_PASSWORD_LENGTH = 8;

export interface SessionProfile {
  id: string;
  name: string;
  email: string;
  designation: string | null;
}

export type SignInResult =
  | { status: 'ok'; profile: SessionProfile }
  | { status: 'needs_new_password' }
  | { status: 'error'; message: string };

const rpc = (name: string, args?: Record<string, unknown>) =>
  (createClient() as any).rpc(name, args);

async function profileForSession(): Promise<SessionProfile | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data } = await (supabase.from('profiles') as any)
    .select('id, name, email, designation')
    .eq('auth_user_id', auth.user.id)
    .maybeSingle();
  return (data as SessionProfile) || null;
}

/** Names and emails for the login list. Never includes passwords. */
export async function fetchLoginDirectory(): Promise<{ name: string; email: string; designation: string | null }[]> {
  const { data, error } = await rpc('login_directory');
  if (error || !data) return [];
  return data as { name: string; email: string; designation: string | null }[];
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const supabase = createClient();
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  if (!error && data?.user) {
    const profile = await profileForSession();
    if (profile) return { status: 'ok', profile };
    await supabase.auth.signOut();
    return { status: 'error', message: 'This login is not linked to a team profile. Ask the admin to reset your password.' };
  }

  const { data: legacyOk } = await rpc('legacy_password_ok', { p_email: cleanEmail, p_password: password });
  if (legacyOk === true) return { status: 'needs_new_password' };

  return { status: 'error', message: 'Wrong email or password.' };
}

/** First login after the switch: old password proves who you are, new password becomes your login. */
export async function completeFirstLogin(email: string, oldPassword: string, newPassword: string): Promise<SignInResult> {
  const supabase = createClient();
  const cleanEmail = email.trim().toLowerCase();

  const { data: signUp, error: signUpError } = await supabase.auth.signUp({ email: cleanEmail, password: newPassword });
  if (signUpError) {
    const taken = /registered|exists/i.test(signUpError.message);
    return {
      status: 'error',
      message: taken
        ? 'A login already exists for this email. Ask the admin to reset your password.'
        : signUpError.message,
    };
  }
  if (!signUp.session) {
    return { status: 'error', message: 'Login needs email confirmation. Ask the admin to turn off "Confirm email" in Supabase.' };
  }

  const { error: claimError } = await rpc('claim_profile', { p_password: oldPassword });
  if (claimError) {
    await supabase.auth.signOut();
    return { status: 'error', message: 'Could not link your profile. Ask the admin to reset your password.' };
  }

  const profile = await profileForSession();
  if (!profile) return { status: 'error', message: 'Signed in, but your profile could not be loaded. Try again.' };
  return { status: 'ok', profile };
}

/** Change your own password (you must be signed in). */
export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const email = auth?.user?.email;
  if (!email) throw new Error('Your session has ended. Sign in again.');

  const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (checkError) throw new Error('Current password is wrong.');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/** Admin: give someone a temporary password. They choose their own on next sign-in. */
export async function adminSetTemporaryPassword(profileId: string, tempPassword: string): Promise<void> {
  const { error } = await rpc('admin_set_password', { p_profile: profileId, p_password: tempPassword });
  if (error) throw new Error(error.message);
}

/** Admin: remove a person and their login. */
export async function adminRemoveMember(profileId: string): Promise<void> {
  const { error } = await rpc('admin_remove_member', { p_profile: profileId });
  if (error) throw new Error(error.message);
}

export async function hasSupabaseSession(): Promise<boolean> {
  const { data } = await createClient().auth.getSession();
  return Boolean(data?.session);
}

/** A readable temporary password, e.g. "orbit-4827-tide". */
export function makeTemporaryPassword(): string {
  const words = ['orbit', 'comet', 'pixel', 'tide', 'ember', 'lunar', 'maple', 'cedar', 'nova', 'prism'];
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
  const num = 1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000);
  return `${pick()}-${num}-${pick()}`;
}
