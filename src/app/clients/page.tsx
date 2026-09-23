'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Client } from '@/types';
import { fetchClients, createClientRecord, deleteClientRecord, updateClientRecord } from '@/lib/services/work-entry';
import { Building2, Plus, Search, Trash2, ArrowLeft, Pencil, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastContext';
import { OrbitLoader } from '@/components/ui/OrbitLoader';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit / Update state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { showToast, confirmDialog } = useToast();

  const loadClientsData = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientsData();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClientName.trim();
    if (!trimmed) {
      showToast('Please enter a client name', 'error');
      return;
    }

    setAdding(true);
    try {
      await createClientRecord(trimmed);
      setNewClientName('');
      showToast(`Client "${trimmed}" added successfully!`, 'success');
      await loadClientsData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add client', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (client: Client) => {
    setEditingId(client.id);
    setEditingName(client.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdateClient = async (id: string, originalName: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showToast('Please enter a valid client name', 'error');
      return;
    }
    if (trimmed === originalName) {
      handleCancelEdit();
      return;
    }

    setUpdatingId(id);
    try {
      await updateClientRecord(id, trimmed);
      setClients(prev => prev.map(c => (c.id === id ? { ...c, name: trimmed } : c)));
      showToast(`Client updated to "${trimmed}" successfully!`, 'success');
      handleCancelEdit();
      await loadClientsData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update client', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteClient = (id: string, name: string) => {
    confirmDialog({
      title: 'Delete Client',
      message: `Are you sure you want to delete client "${name}"? This action cannot be undone.`,
      confirmText: 'Delete Client',
      variant: 'danger',
      onConfirm: async () => {
        setDeletingId(id);
        try {
          await deleteClientRecord(id);
          setClients(prev => prev.filter(c => c.id !== id && c.name.toLowerCase() !== name.toLowerCase()));
          showToast(`Client "${name}" removed permanently.`, 'success');
          await loadClientsData();
        } catch (err) {
          setClients(prev => prev.filter(c => c.id !== id && c.name.toLowerCase() !== name.toLowerCase()));
          showToast(`Client "${name}" removed.`, 'success');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const filteredClients = clients
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-950/70 text-violet-300 border border-violet-800/60">
                Client Roster
              </span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs font-semibold text-slate-400">{clients.length} Active Clients (A-Z)</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">
              Client Directory
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Add new client names or edit and update existing accounts for daily work entries.
            </p>
          </div>

          <Link
            href="/work/new"
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Work Entry</span>
          </Link>
        </div>

        {/* Add Client Card */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-violet-400" />
            <span>Add New Client</span>
          </h2>
          <form onSubmit={handleAddClient} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              placeholder="Enter new client name (e.g. Acme Corp)"
              className="flex-1 w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-slate-950 transition-all"
            />
            <button
              type="submit"
              disabled={adding}
              className="inline-flex justify-center items-center space-x-2 px-6 py-2.5 text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{adding ? 'Adding...' : 'Add Client'}</span>
            </button>
          </form>
        </div>

        {/* Client Roster List Card */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
            <h2 className="text-base font-bold text-slate-100">
              All Clients ({filteredClients.length})
            </h2>

            {/* Search Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search clients..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <OrbitLoader
                size="md"
                text="Loading client directory..."
                subtitle="Synchronizing client accounts from Supabase"
              />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/50 rounded-lg border border-slate-800 text-slate-400 text-sm">
              No clients found matching "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredClients.map(client => {
                const isEditing = editingId === client.id;
                const isUpdating = updatingId === client.id;

                if (isEditing) {
                  return (
                    <div
                      key={client.id}
                      className="p-3 bg-slate-950 rounded-lg border-2 border-violet-500 shadow-md transition-all"
                    >
                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          handleUpdateClient(client.id, client.name);
                        }}
                        className="space-y-2.5"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-violet-950/80 border border-violet-800/60 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
                            {(editingName.trim().charAt(0) || client.name.charAt(0)).toUpperCase()}
                          </div>
                          <input
                            type="text"
                            required
                            autoFocus
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            disabled={isUpdating}
                            placeholder="Edit client name..."
                            className="flex-1 w-full px-2.5 py-1 text-sm font-bold text-slate-100 bg-slate-900 border border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-slate-900"
                            onKeyDown={e => {
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-end space-x-1.5 pt-1.5 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isUpdating || !editingName.trim()}
                            className="px-3 py-1 text-xs font-bold text-white webtree-gradient-btn rounded shadow-sm disabled:opacity-50"
                          >
                            {isUpdating ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                }

                return (
                  <div
                    key={client.id}
                    className="p-4 bg-slate-950/70 rounded-lg border border-slate-800 flex items-center justify-between space-x-3 hover:border-slate-700 hover:bg-slate-800/60 transition-all group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-violet-950/80 border border-violet-800/60 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-slate-200 truncate" title={client.name}>
                        {client.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(client)}
                        disabled={editingId !== null || deletingId === client.id}
                        className="p-1.5 text-slate-400 hover:text-violet-400 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-30 cursor-pointer"
                        title={`Edit client "${client.name}"`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        disabled={editingId !== null || deletingId === client.id}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-30 cursor-pointer"
                        title={`Delete client "${client.name}"`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
