'use client';

import { useState, useEffect } from 'react';
import { TodoItem } from '@/types';
import { fetchTodos, createTodo, toggleTodo, deleteTodo } from '@/lib/services/todo';
import { CheckSquare, Plus, Trash2, Check, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface TodoListWidgetProps {
  userId?: string;
}

type FilterTab = 'all' | 'pending' | 'completed';

export function TodoListWidget({ userId }: TodoListWidgetProps) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { showToast } = useToast();

  const loadTodos = async () => {
    try {
      const data = await fetchTodos(userId);
      setTodos(data);
    } catch {
      // Handled in pure DB service
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('design_orbit_local_todos');
      } catch {}
    }
    loadTodos();
  }, [userId]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (!trimmed) {
      showToast('Please enter a task description', 'error');
      return;
    }

    setAdding(true);
    try {
      const created = await createTodo(trimmed, userId);
      setTodos(prev => [created, ...prev]);
      setNewTaskText('');
      showToast('Task added to database!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add task', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleTodo = async (id: string, currentCompleted: boolean) => {
    const nextState = !currentCompleted;
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, is_completed: nextState } : t))
    );

    try {
      await toggleTodo(id, nextState);
    } catch {
      setTodos(prev =>
        prev.map(t => (t.id === id ? { ...t, is_completed: currentCompleted } : t))
      );
      showToast('Failed to update task status', 'error');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTodo(id);
      setTodos(prev => prev.filter(t => t.id !== id));
      showToast('Task deleted', 'success');
    } catch {
      showToast('Failed to delete task', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const pendingCount = todos.filter(t => !t.is_completed).length;
  const completedCount = todos.filter(t => t.is_completed).length;
  const progressPercent = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  const filteredTodos = todos.filter(t => {
    if (activeTab === 'pending') return !t.is_completed;
    if (activeTab === 'completed') return t.is_completed;
    return true;
  });

  return (
    <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col h-full">
      {/* Header Row: Title & Badge */}
      <div className="space-y-3 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 shadow-2xs shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">Daily Tasks & To-Do</h2>
              <p className="text-[11px] text-slate-500 truncate">Saved live to database</p>
            </div>
          </div>

          {pendingCount > 0 ? (
            <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full shrink-0 whitespace-nowrap ml-2">
              {pendingCount} Pending
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center space-x-1 shrink-0 whitespace-nowrap ml-2">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>All Done!</span>
            </span>
          )}
        </div>

        {/* Filter Segmented Control Bar */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-lg border border-slate-200/70 text-xs w-full">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1 text-center rounded-md font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-sky-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({todos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-1 text-center rounded-md font-bold transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-sky-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-1 text-center rounded-md font-bold transition-all ${
              activeTab === 'completed'
                ? 'bg-white text-sky-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Done ({completedCount})
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {todos.length > 0 && (
        <div className="space-y-1 px-0.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>{completedCount} of {todos.length} completed</span>
            <span className="font-bold text-sky-700">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Add Form */}
      <form onSubmit={handleAddTodo} className="relative flex items-center">
        <input
          type="text"
          value={newTaskText}
          onChange={e => setNewTaskText(e.target.value)}
          placeholder="Add a new task... (Press Enter)"
          className="w-full pl-3.5 pr-20 py-2 bg-slate-50/80 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white focus:border-transparent transition-all font-medium shadow-2xs"
        />
        <button
          type="submit"
          disabled={adding || !newTaskText.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white webtree-gradient-btn rounded-md shadow-xs disabled:opacity-40 transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>
      </form>

      {/* Task Items List */}
      <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-2 text-xs text-slate-400 font-medium">Loading tasks from database...</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="p-6 text-center bg-slate-50/70 rounded-xl border border-slate-200/70 text-slate-500 text-xs space-y-1">
            {activeTab === 'completed' ? (
              <p className="font-medium text-slate-600">No completed tasks yet.</p>
            ) : activeTab === 'pending' ? (
              <p className="font-medium text-emerald-700">🎉 All caught up! 0 pending tasks.</p>
            ) : (
              <p className="font-medium text-slate-600">No tasks in database. Type above to add your first task.</p>
            )}
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div
              key={todo.id}
              className={`group p-2.5 sm:p-3 rounded-lg border transition-all flex items-center justify-between gap-2.5 ${
                todo.is_completed
                  ? 'bg-slate-50/60 border-slate-200/80 text-slate-400'
                  : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-2xs text-slate-800'
              }`}
            >
              {/* Checkbox & Task Label */}
              <div
                onClick={() => handleToggleTodo(todo.id, todo.is_completed)}
                className="flex items-center space-x-2.5 cursor-pointer min-w-0 flex-1 select-none"
              >
                <button
                  type="button"
                  className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    todo.is_completed
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                      : 'border-slate-300 bg-white group-hover:border-sky-500'
                  }`}
                >
                  {todo.is_completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </button>

                <span
                  className={`text-xs leading-snug break-words font-medium transition-colors ${
                    todo.is_completed
                      ? 'line-through text-slate-400'
                      : 'text-slate-800'
                  }`}
                >
                  {todo.task}
                </span>
              </div>

              {/* Delete Action */}
              <button
                type="button"
                onClick={() => handleDeleteTodo(todo.id)}
                disabled={deletingId === todo.id}
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-80 group-hover:opacity-100 shrink-0 cursor-pointer"
                title="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
