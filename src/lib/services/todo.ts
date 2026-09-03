import { createClient } from '@/lib/supabase/client';
import { TodoItem } from '@/types';

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
  const payload: any = {
    user_id: userId,
    task: trimmed,
    is_completed: false,
    position: 0,
  };

  const { data, error } = await (supabase.from('todos') as any)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Supabase createTodo error:', error.message);
    throw new Error(`Database Error: ${error.message}`);
  }

  return data as TodoItem;
}

export async function toggleTodo(id: string, isCompleted: boolean, userId?: string): Promise<TodoItem> {
  const supabase = createClient();
  let query = (supabase.from('todos') as any)
    .update({ is_completed: isCompleted, updated_at: new Date().toISOString() })
    .eq('id', id);

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
