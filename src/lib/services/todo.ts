import { createClient } from '@/lib/supabase/client';
import { TodoItem } from '@/types';

// Pure database service for todos — 100% Supabase PostgreSQL backed (no dummy values or local session data)

export async function fetchTodos(userId?: string): Promise<TodoItem[]> {
  try {
    const supabase = createClient();
    let query = (supabase.from('todos') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase fetchTodos notice:', error.message);
      return [];
    }

    return (data as TodoItem[]) || [];
  } catch (err: any) {
    console.warn('Supabase fetchTodos error:', err.message);
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
