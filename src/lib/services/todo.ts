import { createClient } from '@/lib/supabase/client';
import { TodoItem } from '@/types';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes('your-supabase-project'));
}

const LOCAL_STORAGE_KEY = 'design_orbit_local_todos';

function getStoredLocalTodos(): TodoItem[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse local todos:', e);
    }
  }
  return [
    {
      id: 'mock_todo_1',
      task: 'Finalize mobile app wireframes for Master Cool',
      is_completed: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'mock_todo_2',
      task: 'Prepare weekly meeting slides and featured deliverables',
      is_completed: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock_todo_3',
      task: 'Review landing page responsive layouts with team',
      is_completed: false,
      created_at: new Date().toISOString(),
    },
  ];
}

function saveStoredLocalTodos(todos: TodoItem[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      console.warn('Failed to persist local todos:', e);
    }
  }
}

export async function fetchTodos(userId?: string): Promise<TodoItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      let query = (supabase.from('todos') as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        saveStoredLocalTodos(data as TodoItem[]);
        return data as TodoItem[];
      }
    } catch (err) {
      console.warn('Supabase fetchTodos notice:', err);
    }
  }

  return getStoredLocalTodos();
}

export async function createTodo(task: string, userId?: string): Promise<TodoItem> {
  const trimmed = task.trim();
  if (!trimmed) throw new Error('Task description cannot be empty');

  if (isSupabaseConfigured()) {
    try {
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

      if (!error && data) {
        const local = getStoredLocalTodos();
        saveStoredLocalTodos([data as TodoItem, ...local]);
        return data as TodoItem;
      }
      if (error) {
        console.error('Supabase createTodo error:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase createTodo fallback:', err);
    }
  }

  const newTodo: TodoItem = {
    id: `todo_${Date.now()}`,
    user_id: userId || null,
    task: trimmed,
    is_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const local = getStoredLocalTodos();
  const updated = [newTodo, ...local];
  saveStoredLocalTodos(updated);
  return newTodo;
}

export async function toggleTodo(id: string, isCompleted: boolean): Promise<TodoItem> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from('todos') as any)
        .update({ is_completed: isCompleted, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const local = getStoredLocalTodos().map(t => (t.id === id ? (data as TodoItem) : t));
        saveStoredLocalTodos(local);
        return data as TodoItem;
      }
    } catch (err: any) {
      console.warn('Supabase toggleTodo fallback:', err);
    }
  }

  const local = getStoredLocalTodos();
  const target = local.find(t => t.id === id);
  if (!target) throw new Error('Task not found');

  target.is_completed = isCompleted;
  target.updated_at = new Date().toISOString();
  saveStoredLocalTodos([...local]);
  return target;
}

export async function deleteTodo(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await (supabase.from('todos') as any).delete().eq('id', id);
    } catch (err: any) {
      console.warn('Supabase deleteTodo notice:', err);
    }
  }

  const local = getStoredLocalTodos();
  const filtered = local.filter(t => t.id !== id);
  saveStoredLocalTodos(filtered);
}
