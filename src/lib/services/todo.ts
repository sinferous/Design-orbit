import { createClient } from '@/lib/supabase/client';
import { TodoItem } from '@/types';

// Helper to calculate total accumulated seconds including live running timer
export function calculateTotalSeconds(todo: TodoItem, nowMs: number = Date.now()): number {
  let total = todo.time_spent_seconds || 0;
  if (todo.timer_started_at) {
    const started = new Date(todo.timer_started_at).getTime();
    if (!isNaN(started) && started > 0) {
      const elapsed = Math.max(0, Math.floor((nowMs - started) / 1000));
      total += elapsed;
    }
  }
  return total;
}

// Helper to format seconds into clean human-readable tags: "1h 24m", "4m 12s", "35s"
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

// Helper to format running stopwatch: "00:15" or "01:23:45"
export function formatStopwatch(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

// Helper to ensure completed tasks default to the bottom of the list
export function sortTodosWithCompletedAtBottom(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    // 1. Incomplete/pending tasks always come first; completed tasks go down
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    // 2. Within the same completion status, preserve drag-and-drop position if available
    if (a.position !== undefined && b.position !== undefined && a.position !== b.position) {
      return a.position - b.position;
    }
    // 3. Fallback to newest created first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

// Strictly user-specific: Person 1's todos are never visible to Person 2
export async function fetchTodos(userId?: string): Promise<TodoItem[]> {
  if (!userId) {
    // If no user ID is provided, return empty list to protect user privacy
    return [];
  }

  try {
    const supabase = createClient();
    let query = (supabase.from('todos') as any)
      .select('*')
      .eq('user_id', userId);

    // Attempt order by position first
    const { data, error } = await query
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && data) {
      return sortTodosWithCompletedAtBottom(data as TodoItem[]);
    }

    // Fallback if position column is not yet in table
    const { data: fallbackData, error: fallbackError } = await (supabase.from('todos') as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!fallbackError && fallbackData) {
      return sortTodosWithCompletedAtBottom(fallbackData as TodoItem[]);
    }

    return [];
  } catch (err: any) {
    console.warn('fetchTodos error:', err.message);
    return [];
  }
}

export async function createTodo(task: string, userId?: string): Promise<TodoItem> {
  const trimmed = task.trim();
  if (!trimmed) throw new Error('Task description cannot be empty');
  if (!userId) throw new Error('You must be logged in to create personal tasks.');

  const supabase = createClient();

  // Attempt insert with position and timer fields
  const { data, error } = await (supabase.from('todos') as any)
    .insert({
      user_id: userId,
      task: trimmed,
      is_completed: false,
      position: 0,
      time_spent_seconds: 0,
      timer_started_at: null,
    })
    .select()
    .single();

  if (!error && data) {
    return data as TodoItem;
  }

  // Graceful fallback: If timer columns are not in schema cache yet, insert with position only
  if (error) {
    const { data: fallbackData, error: fallbackError } = await (supabase.from('todos') as any)
      .insert({
        user_id: userId,
        task: trimmed,
        is_completed: false,
        position: 0,
      })
      .select()
      .single();

    if (!fallbackError && fallbackData) {
      return fallbackData as TodoItem;
    }

    // 2nd fallback: insert minimal fields
    const { data: minData, error: minError } = await (supabase.from('todos') as any)
      .insert({
        user_id: userId,
        task: trimmed,
        is_completed: false,
      })
      .select()
      .single();

    if (!minError && minData) {
      return minData as TodoItem;
    }

    console.error('Supabase createTodo error:', minError?.message || fallbackError?.message || error.message);
    throw new Error(`Database Error: ${minError?.message || fallbackError?.message || error.message}`);
  }

  return data as TodoItem;
}

export async function toggleTodo(
  id: string,
  isCompleted: boolean,
  userId?: string
): Promise<TodoItem> {
  const supabase = createClient();
  const updatePayload: any = {
    is_completed: isCompleted,
    updated_at: new Date().toISOString(),
  };

  let query = (supabase.from('todos') as any).update(updatePayload).eq('id', id);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error('Supabase toggleTodo error:', error.message);
    throw new Error(`Database Error: ${error.message}`);
  }

  return data as TodoItem;
}

// Start timer for a task
export async function startTodoTimer(
  id: string,
  activeTodos: TodoItem[] = [],
  userId?: string
): Promise<TodoItem> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  // Start this task's timer (supports multiple simultaneous running timers)
  let query = (supabase.from('todos') as any)
    .update({
      timer_started_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', id);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error('Supabase startTodoTimer error:', error.message);
    throw new Error(`Database Error: ${error.message}`);
  }

  return data as TodoItem;
}

// Stop timer for a task and record total accumulated seconds
export async function stopTodoTimer(
  id: string,
  currentTodo: TodoItem,
  userId?: string
): Promise<TodoItem> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  let additional = 0;
  if (currentTodo.timer_started_at) {
    const started = new Date(currentTodo.timer_started_at).getTime();
    if (!isNaN(started) && started > 0) {
      additional = Math.max(0, Math.floor((nowMs - started) / 1000));
    }
  }

  const newTotalSeconds = (currentTodo.time_spent_seconds || 0) + additional;

  let query = (supabase.from('todos') as any)
    .update({
      time_spent_seconds: newTotalSeconds,
      timer_started_at: null,
      updated_at: nowIso,
    })
    .eq('id', id);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error('Supabase stopTodoTimer error:', error.message);
    throw new Error(`Database Error: ${error.message}`);
  }

  return data as TodoItem;
}

export async function deleteTodo(id: string, userId?: string): Promise<void> {
  const supabase = createClient();
  let query = (supabase.from('todos') as any).delete().eq('id', id);
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('Supabase deleteTodo error:', error.message);
    throw new Error(`Database Error: ${error.message}`);
  }
}

export async function reorderTodos(orderedIds: string[], userId?: string): Promise<void> {
  try {
    const supabase = createClient();
    const updates = orderedIds.map((id, index) => {
      let query = (supabase.from('todos') as any)
        .update({ position: index, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (userId) {
        query = query.eq('user_id', userId);
      }
      return query;
    });
    await Promise.allSettled(updates);
  } catch (err: any) {
    console.warn('Supabase reorderTodos notice:', err);
  }
}
