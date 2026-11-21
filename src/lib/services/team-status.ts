import { createClient } from '@/lib/supabase/client';

export interface MemberStatus {
  id: string;
  name: string;
  designation: string | null;
  emoji: string | null;
  text: string | null;
  expiresAt: string | null;
  /** Description of the task whose timer is running right now, if any */
  workingOn: string | null;
  workingClient: string | null;
}

export interface StatusInput {
  emoji: string | null;
  text: string | null;
  expiresAt: string | null;
}

const LOCAL_KEY = 'design_orbit_my_status';

/** True once we know the status columns exist in the database. */
let statusColumnsKnown: boolean | null = null;

export function isStatusSyncedToTeam() {
  return statusColumnsKnown === true;
}

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

function readLocalStatus(): StatusInput | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StatusInput;
    return isExpired(s.expiresAt) ? null : s;
  } catch {
    return null;
  }
}

/**
 * Loads every active team member with their custom status and live timer.
 * Only selects the columns it shows (never password fields).
 */
export async function fetchTeamStatuses(myProfileId?: string): Promise<MemberStatus[]> {
  const supabase = createClient();
  const base = 'id, name, designation, email, is_active';
  let rows: any[] = [];

  const withStatus = await (supabase.from('profiles') as any).select(
    `${base}, status_emoji, status_text, status_expires_at`
  );
  if (!withStatus.error && Array.isArray(withStatus.data)) {
    statusColumnsKnown = true;
    rows = withStatus.data;
  } else {
    // Status columns not migrated yet: load people without statuses
    statusColumnsKnown = false;
    const plain = await (supabase.from('profiles') as any).select(base);
    rows = Array.isArray(plain.data) ? plain.data : [];
  }

  // Light query: only the fields the panel shows
  let running: any[] = [];
  try {
    const { data } = await (supabase.from('work_entries') as any)
      .select('user_id, description, client:clients(name)')
      .not('timer_started_at', 'is', null);
    running = Array.isArray(data) ? data : [];
  } catch {
    running = [];
  }
  const runningByUser = new Map<string, any>();
  for (const e of running) if (e.user_id && !runningByUser.has(e.user_id)) runningByUser.set(e.user_id, e);

  const local = statusColumnsKnown ? null : readLocalStatus();

  return rows
    .filter(r => r.is_active !== false && !(r.email || '').toLowerCase().startsWith('admin'))
    .map(r => {
      let emoji = r.status_emoji ?? null;
      let text = r.status_text ?? null;
      let expiresAt = r.status_expires_at ?? null;
      if (isExpired(expiresAt)) {
        emoji = null;
        text = null;
        expiresAt = null;
      }
      if (local && r.id === myProfileId) {
        emoji = local.emoji;
        text = local.text;
        expiresAt = local.expiresAt;
      }
      const run = runningByUser.get(r.id);
      return {
        id: r.id,
        name: r.name,
        designation: r.designation ?? null,
        emoji,
        text,
        expiresAt,
        workingOn: run ? run.description || 'A task' : null,
        workingClient: run?.client?.name ?? null,
      };
    });
}

/** Saves the signed-in person's status. Falls back to this browser if the DB is not migrated. */
export async function saveMyStatus(profileId: string, status: StatusInput): Promise<'team' | 'local'> {
  const text = status.text ? status.text.trim().slice(0, 60) : null;
  const payload = {
    status_emoji: status.emoji || null,
    status_text: text || null,
    status_expires_at: status.expiresAt,
    status_updated_at: new Date().toISOString(),
  };

  if (statusColumnsKnown !== false) {
    const supabase = createClient();
    const { error } = await (supabase.from('profiles') as any).update(payload).eq('id', profileId);
    if (!error) {
      statusColumnsKnown = true;
      try {
        localStorage.removeItem(LOCAL_KEY);
      } catch {}
      return 'team';
    }
    statusColumnsKnown = false;
  }

  try {
    if (!payload.status_emoji && !payload.status_text) localStorage.removeItem(LOCAL_KEY);
    else localStorage.setItem(LOCAL_KEY, JSON.stringify({ emoji: payload.status_emoji, text: payload.status_text, expiresAt: status.expiresAt }));
  } catch {}
  return 'local';
}
