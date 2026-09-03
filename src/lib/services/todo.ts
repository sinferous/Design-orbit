import { createClient } from '@/lib/supabase/client';
import { TodoItem } from '@/types';

// Pure database service for todos — 100% Supabase PostgreSQL backed (with drag & drop reordering)

export async function fetchTodos(userId?: string): Promise<TodoItem[]> {
  try {
    const supabase = createClient();
    let query = (supabase.from('todos') as any).select('*');

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    // Try ordering by position first (if position column exists)
    const { data, error } = await query
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as TodoItem[];
    }

    // Fallback ordering if position column does not exist yet
    let fallbackQuery = (supabase.from('todos') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      fallbackQuery = fallbackQuery.or(`user_id.eq.${userId},user_id.is.null`);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    if (!fallbackError && fallbackData) {
      return fallbackData as TodoItem[];
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

  const supabase = createClient();
  const payload: any = {
    task: trimmed,
    is_completed: false,
    position: 0,
  };
  if (userId) payload.user_id = userId;

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

export async function toggleTodo(id: string, isCompleted: boolean): Promise<TodoItem> {
  const supabase = createClient();
  const { data, error } = await (supabase.from('todos') as any)
    .update({ is_completed: isCompleted, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase toggleTodo error:', error.message);
    throw new Error(`Database Error: ${error.message}`);
  }

  return data as TodoItem;
}

export async function deleteTodo(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase.from('todos') as any)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase deleteTodo error:', error.message);
    throw new Error(`Database Error: ${error.message}`);
  }
}

export async function reorderTodos(orderedIds: string[]): Promise<void> {
  try {
    const supabase = createClient();
    const updates = orderedIds.map((id, index) =>
      (supabase.from('todos') as any)
        .update({ position: index, updated_at: new Date().toISOString() })
        .eq('id', id)
    );
    await Promise.allSettled(updates);
  } catch (err: any) {
    console.warn('Supabase reorderTodos notice:', err);
  }
}
