'use client';

import { useState, useEffect } from 'react';
import { TodoItem } from '@/types';
import { fetchTodos, createTodo, toggleTodo, deleteTodo } from '@/lib/services/todo';
import { CheckSquare, Plus, Trash2, Check, Clock, Sparkles } from 'lucide-react';
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
      // Handled in service fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      showToast('Task added to your dashboard!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add task', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleTodo = async (id: string, currentCompleted: boolean) => {
    const nextState = !currentCompleted;
    // Optimistic UI update
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, is_completed: nextState } : t))
    );

    try {
      await toggleTodo(id, nextState);
    } catch {
      // Revert if error
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

  const filteredTodos = todos.filter(t => {
    if (activeTab === 'pending') return !t.is_completed;
    if (activeTab === 'completed') return t.is_completed;
    return true;
  });

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col h-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Daily Tasks & To-Do</h2>
            {pendingCount > 0 ? (
              <span className="px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                {pendingCount} Pending
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>All Done!</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quick notes, action items, and reminders saved live to your database.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
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
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
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
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
              activeTab === 'completed'
                ? 'bg-white text-sky-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Done ({completedCount})
          </button>
        </div>
      </div>

      {/* Quick Add Task Input Form */}
      <form onSubmit={handleAddTodo} className="flex gap-2">
        <input
          type="text"
          value={newTaskText}
          onChange={e => setNewTaskText(e.target.value)}
          placeholder="Add a task, reminder, or action item... (Press Enter)"
          className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-medium"
        />
        <button
          type="submit"
          disabled={adding || !newTaskText.trim()}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white webtree-gradient-btn rounded-lg shadow-sm disabled:opacity-50 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{adding ? 'Adding...' : 'Add'}</span>
        </button>
      </form>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2 pr-1">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-2 text-xs text-slate-400 font-medium">Loading tasks...</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="p-6 text-center bg-slate-50/70 rounded-lg border border-slate-200/80 text-slate-500 text-xs">
            {activeTab === 'completed' ? (
              <span>No completed tasks yet. Check off items as you finish them!</span>
            ) : activeTab === 'pending' ? (
              <span>No pending tasks! All caught up for now.</span>
            ) : (
              <span>No tasks added yet. Type in the box above to add your first task.</span>
            )}
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div
              key={todo.id}
              className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 group ${
                todo.is_completed
                  ? 'bg-slate-50/70 border-slate-200 text-slate-400'
                  : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-2xs text-slate-800'
              }`}
            >
              {/* Checkbox & Task Text */}
              <div
                onClick={() => handleToggleTodo(todo.id, todo.is_completed)}
                className="flex items-center space-x-3 cursor-pointer min-w-0 flex-1 select-none"
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    todo.is_completed
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 bg-white hover:border-sky-500'
                  }`}
                >
                  {todo.is_completed && <Check className="w-3.5 h-3.5" />}
                </div>

                <span
                  className={`text-xs sm:text-sm leading-snug break-words ${
                    todo.is_completed
                      ? 'line-through text-slate-400'
                      : 'font-semibold text-slate-800'
                  }`}
                >
                  {todo.task}
                </span>
              </div>

              {/* Actions */}
              <button
                type="button"
                onClick={() => handleDeleteTodo(todo.id)}
                disabled={deletingId === todo.id}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors opacity-70 group-hover:opacity-100 shrink-0"
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
