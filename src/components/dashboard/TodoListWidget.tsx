'use client';

import { useState, useEffect } from 'react';
import { TodoItem } from '@/types';
import {
  fetchTodos,
  createTodo,
  toggleTodo,
  deleteTodo,
  reorderTodos,
  sortTodosWithCompletedAtBottom,
} from '@/lib/services/todo';
import {
  CheckSquare,
  Plus,
  Trash2,
  Check,
  Sparkles,
  GripVertical,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { OrbitLoader } from '@/components/ui/OrbitLoader';

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

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const { showToast } = useToast();

  const loadTodos = async () => {
    if (!userId) {
      setTodos([]);
      setLoading(false);
      return;
    }

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
    if (!userId) {
      showToast('Please wait while your user session connects...', 'error');
      return;
    }

    setAdding(true);
    try {
      const created = await createTodo(trimmed, userId);
      setTodos(prev => sortTodosWithCompletedAtBottom([created, ...prev]));
      setNewTaskText('');
      showToast('Task added to your private list!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add task', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleTodo = async (id: string, currentCompleted: boolean) => {
    const nextState = !currentCompleted;

    // Optimistically update and automatically move completed tasks to bottom
    setTodos(prev => {
      const updated = prev.map(t => (t.id === id ? { ...t, is_completed: nextState } : t));
      return sortTodosWithCompletedAtBottom(updated);
    });

    try {
      await toggleTodo(id, nextState, userId);
    } catch {
      loadTodos();
      showToast('Failed to update task status', 'error');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTodo(id, userId);
      setTodos(prev => prev.filter(t => t.id !== id));
      showToast('Task deleted', 'success');
    } catch {
      showToast('Failed to delete task', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const fromIndex = todos.findIndex(t => t.id === draggedId);
    const toIndex = todos.findIndex(t => t.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...todos];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);

    // Update state and assign sequential positions
    const withUpdatedPositions = reordered.map((item, idx) => ({ ...item, position: idx }));
    setTodos(withUpdatedPositions);
    setDraggedId(null);
    setDragOverId(null);

    try {
      await reorderTodos(withUpdatedPositions.map(t => t.id), userId);
    } catch {
      // Handled silently
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
    <div className="bento-card p-5 sm:p-6 space-y-4 flex flex-col h-full text-slate-100">
      {/* Header Row: Title, Privacy Indicator & Badge */}
      <div className="space-y-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-violet-600/15 text-violet-400 flex items-center justify-center border border-violet-500/20 shadow-sm shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h2 className="text-sm font-bold text-slate-100 leading-tight truncate">My To-Do List</h2>
                <span title="Private to your account" className="inline-flex items-center text-slate-400 hover:text-violet-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">Private tasks • Completed go to bottom</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 ml-2">
            {pendingCount > 0 ? (
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60 rounded-full whitespace-nowrap">
                {pendingCount} Pending
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 rounded-full flex items-center space-x-1 whitespace-nowrap">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>All Done!</span>
              </span>
            )}
          </div>
        </div>

        {/* Filter Segmented Control Bar */}
        <div className="flex items-center bg-black/30 p-1 rounded-xl border border-white/[0.08] text-xs w-full">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 text-center rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-violet-600/25 text-white shadow-xs border border-violet-500/35'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({todos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-1.5 text-center rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-violet-600/25 text-white shadow-xs border border-violet-500/35'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-1.5 text-center rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-violet-600/25 text-white shadow-xs border border-violet-500/35'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Done ({completedCount})
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {todos.length > 0 && (
        <div className="space-y-1 px-0.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>{completedCount} of {todos.length} completed</span>
            <span className="font-bold text-violet-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300 rounded-full"
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
          placeholder="Add a private task... (Press Enter)"
          className="w-full pl-3.5 pr-20 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition-all font-medium shadow-xs"
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

      {/* Task Items List with Drag & Drop Reordering */}
      <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <OrbitLoader
              size="sm"
              text="Loading private tasks..."
            />
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="p-6 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 text-xs space-y-1">
            {activeTab === 'completed' ? (
              <p className="font-medium text-slate-400">No completed tasks yet.</p>
            ) : activeTab === 'pending' ? (
              <p className="font-medium text-emerald-400">🎉 All caught up! 0 pending tasks.</p>
            ) : (
              <p className="font-medium text-slate-400">No personal tasks yet. Type above to add your first task.</p>
            )}
          </div>
        ) : (
          filteredTodos.map(todo => {
            const isBeingDragged = draggedId === todo.id;
            const isTargeted = dragOverId === todo.id;

            return (
              <div
                key={todo.id}
                draggable={true}
                onDragStart={e => handleDragStart(e, todo.id)}
                onDragOver={e => handleDragOver(e, todo.id)}
                onDragLeave={() => {
                  if (dragOverId === todo.id) setDragOverId(null);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                onDrop={e => {
                  e.preventDefault();
                  handleDrop(todo.id);
                }}
                className={`group p-2.5 sm:p-3 rounded-lg border transition-all flex items-center justify-between gap-2.5 cursor-move select-none ${
                  isBeingDragged
                    ? 'opacity-40 border-dashed border-violet-500 bg-violet-950/50 scale-[0.98]'
                    : isTargeted
                    ? 'border-violet-500 ring-2 ring-violet-400/50 bg-violet-950/40'
                    : todo.is_completed
                    ? 'bg-slate-950/40 border-slate-850 text-slate-500'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-200'
                }`}
              >
                {/* Drag Handle & Checkbox & Task Label */}
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div
                    className="cursor-grab active:cursor-grabbing p-0.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleTodo(todo.id, todo.is_completed)}
                    className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      todo.is_completed
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-xs'
                        : 'border-slate-600 bg-slate-900 group-hover:border-violet-400'
                    }`}
                  >
                    {todo.is_completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>

                  <span
                    onClick={() => handleToggleTodo(todo.id, todo.is_completed)}
                    className={`text-xs leading-snug break-words font-medium transition-colors cursor-pointer flex-1 ${
                      todo.is_completed
                        ? 'line-through text-slate-500'
                        : 'text-slate-200'
                    }`}
                  >
                    {todo.task}
                  </span>
                </div>

                {/* Delete Action */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteTodo(todo.id);
                  }}
                  disabled={deletingId === todo.id}
                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-all opacity-70 group-hover:opacity-100 shrink-0 cursor-pointer"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
