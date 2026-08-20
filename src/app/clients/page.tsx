'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { fetchClients, createClientRecord, deleteClientRecord } from '@/lib/services/work-entry';
import { Client } from '@/types';
import { Building2, Plus, Trash2, Search, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function loadClientsData() {
    setLoading(true);
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClientsData();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setAdding(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await createClientRecord(newClientName.trim());
      setNewClientName('');
      setSuccessMsg('Client added successfully!');
      await loadClientsData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add client');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete client "${name}"?`)) return;
    setDeletingId(id);
    try {
      await deleteClientRecord(id);
      await loadClientsData();
    } catch (err) {
      alert('Failed to delete client');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userName="Gajesh" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Link href="/dashboard" className="text-xs font-bold text-sky-600 hover:underline flex items-center space-x-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Client Directory Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Add and manage client profiles for work logging across the team.
            </p>
          </div>
        </div>

        {/* Add New Client Form */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            <span>Add New Client</span>
          </h2>

          <form onSubmit={handleAddClient} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Enter new client name (e.g. Acme Corp, Longovia)..."
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              className="flex-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
              required
            />
            <button
              type="submit"
              disabled={adding || !newClientName.trim()}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0"
            >
              {adding ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4.5 h-4.5" />
                  <span>Add Client</span>
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Client List & Search */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">
              Existing Clients ({filteredClients.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-2 text-xs text-slate-500">Loading client directory...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              No clients found matching "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredClients.map(client => (
                <div
                  key={client.id}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between space-x-3 hover:border-sky-300 transition-colors"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="w-8 h-8 rounded-md bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-900 text-sm truncate">{client.name}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteClient(client.id, client.name)}
                    disabled={deletingId === client.id}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50 shrink-0"
                    title="Delete client"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
