'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { fetchProfiles, createProfileRecord, deleteProfileRecord } from '@/lib/services/work-entry';
import { Profile } from '@/types';
import { Users, Mail, Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, UserPlus, X } from 'lucide-react';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function loadTeam() {
    setLoading(true);
    try {
      const data = await fetchProfiles();
      const creativeMembers = data.filter(p => p.name !== 'Admin' && !p.designation?.toLowerCase().includes('administrator'));
      setProfiles(creativeMembers);
    } catch (err) {
      console.error('Failed to load team profiles:', err);
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
      setErrorMsg('Please enter a member name');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter an email address');
      return;
    }

    setAdding(true);
    setErrorMsg(null);
    setSuccessMsg(null);

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
      setSuccessMsg('Team member added successfully!');
      setShowAddForm(false);
      await loadTeam();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add team member');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteMember = async (id: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove "${memberName}" from the team?`)) return;
    setDeletingId(id);
    try {
      await deleteProfileRecord(id);
      await loadTeam();
    } catch (err) {
      alert('Failed to remove team member');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userName="Gajesh" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-sky-600" />
                <span>Webtree Creative Studio</span>
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5">
              Creative Team Directory
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage team roster, roles, and creative team members.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 items-center space-x-2">
              <Users className="w-4 h-4 text-sky-600" />
              <span>{profiles.length} Members</span>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 text-sm font-bold text-white webtree-gradient-btn rounded-xl shadow-sm"
            >
              {showAddForm ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Close Form</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Add Team Member</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Add Team Member Collapsible Card Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-2xl border border-sky-300 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-sky-600" />
                <span>Add New Creative Team Member</span>
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Member Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Designation *
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

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alex@webtreeonline.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              {designation === 'Other' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Custom Designation Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3D Animator / Motion Designer"
                    value={customDesignation}
                    onChange={e => setCustomDesignation(e.target.value)}
                    className="w-full md:w-1/3 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-6 py-2 text-xs font-bold text-white webtree-gradient-btn rounded-lg shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {adding ? 'Saving Member...' : 'Save Team Member'}
                </button>
              </div>
            </form>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Member Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="animate-spin w-7 h-7 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-xs text-slate-500 font-medium">Loading executive team profiles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map(member => (
              <div
                key={member.id}
                className="group bg-gradient-to-br from-white via-slate-50/50 to-sky-50/20 p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-sky-300 transition-all duration-200 flex flex-col justify-between space-y-6 relative"
              >
                {/* Top Avatar & Role */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-sky-900 text-white font-extrabold text-xl flex items-center justify-center shadow-md border border-slate-800 group-hover:scale-105 transition-transform duration-200">
                      {member.name.charAt(0)}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-sky-800 border border-slate-200/80 shadow-2xs">
                        {member.designation || 'Team Member'}
                      </span>

                      <button
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        disabled={deletingId === member.id}
                        className="p-1 text-slate-300 hover:text-red-600 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-sky-700 transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {member.designation?.includes('UI/UX') ? 'UI/UX Discipline' : 'Graphic & Visual Design'}
                    </p>
                  </div>
                </div>

                {/* Email Footer */}
                <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between">
                  <a
                    href={`mailto:${member.email}`}
                    className="flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-sky-600 transition-colors group/link truncate"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-sky-600 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
