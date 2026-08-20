'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { fetchProfiles, createProfileRecord, deleteProfileRecord } from '@/lib/services/work-entry';
import { Profile } from '@/types';
import { Users, Mail, Sparkles, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export default function TeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Team Member Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('Graphic Designer');
  const [customDesignation, setCustomDesignation] = useState('');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { showToast } = useToast();

  async function loadTeam() {
    setLoading(true);
    try {
      const data = await fetchProfiles();
      const creativeMembers = data.filter(p => p.name !== 'Admin' && !p.designation?.toLowerCase().includes('administrator'));
      setProfiles(creativeMembers);
    } catch (err) {
      showToast('Failed to load team profiles.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a member name', 'error');
      return;
    }
    if (!email.trim()) {
      showToast('Please enter an email address', 'error');
      return;
    }

    setAdding(true);
    const finalDesignation = designation === 'Other' ? customDesignation.trim() : designation;

    try {
      await createProfileRecord({
        name: name.trim(),
        designation: finalDesignation || 'Team Member',
        email: email.trim(),
      });

      setName('');
      setEmail('');
      setCustomDesignation('');
      showToast(`Team member "${name.trim()}" added successfully!`, 'success');
      setShowAddForm(false);
      await loadTeam();
    } catch (err: any) {
      showToast(err.message || 'Failed to add team member', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteMember = async (id: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove "${memberName}" from the team?`)) return;
    setDeletingId(id);
    try {
      await deleteProfileRecord(id);
      showToast(`Team member "${memberName}" removed.`, 'success');
      await loadTeam();
    } catch {
      showToast('Failed to remove team member', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-sky-600" />
                <span>Webtree Creative Department</span>
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">{profiles.length} Active Designers</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Creative Team Directory
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Graphic Designers, UI/UX Specialists, and Design Leads reporting daily work.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 text-sm font-bold text-white webtree-gradient-btn rounded-xl shadow-sm"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{showAddForm ? 'Close Form' : 'Add Team Member'}</span>
          </button>
        </div>

        {/* Add Team Member Card Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-sky-600" />
                <span>New Creative Team Profile</span>
              </h2>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@webtreeonline.com"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Designation
                  </label>
                  <select
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    <option value="Graphic Designer">Graphic Designer</option>
                    <option value="Senior Graphic Designer">Senior Graphic Designer</option>
                    <option value="UI/UX Designer">UI/UX Designer</option>
                    <option value="Senior UI/UX Designer">Senior UI/UX Designer</option>
                    <option value="Design Team Lead">Design Team Lead</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </div>
              </div>

              {designation === 'Other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Specify Custom Designation
                  </label>
                  <input
                    type="text"
                    required
                    value={customDesignation}
                    onChange={e => setCustomDesignation(e.target.value)}
                    placeholder="e.g. 3D Animator / Motion Designer"
                    className="w-full md:w-1/3 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white webtree-gradient-btn rounded-lg shadow-sm disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{adding ? 'Creating...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Team Grid */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-xs text-slate-500 font-semibold">Loading team profiles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors">
                        {profile.name}
                      </h3>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 mt-0.5">
                        {profile.designation || 'Graphic Designer'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteMember(profile.id, profile.name)}
                    disabled={deletingId === profile.id}
                    className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    title={`Remove "${profile.name}"`}
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-600">{profile.email || `${profile.name.toLowerCase().replace(/\s+/g, '')}@webtreeonline.com`}</span>
                  </div>

                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title="Active Account" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
