'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { createClient } from '@/lib/supabase/client';
import { getLoggedInUser, clearLocalSessionData, updateProfilePasswordInDB, fetchProfileByEmail, getUserPasswordFromDB } from '@/lib/services/work-entry';
import { KeyRound, Lock, ArrowLeft, User, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loadingPassword, setLoadingPassword] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: 'Team Member', email: '' });

  const { showToast } = useToast();

  useEffect(() => {
    async function loadUserPasswordFromDB() {
      const user = getLoggedInUser();
      if (user?.name) {
        setCurrentUser(user);
        if (user.email) {
          try {
            const dbProf = await fetchProfileByEmail(user.email);
            const pass = getUserPasswordFromDB(dbProf, user.email);
            setDbPassword(pass);
            setCurrentPassword(pass);
          } catch (err) {
            console.error('Failed to load password from DB:', err);
          }
        }
      }
      setLoadingPassword(false);
    }
    loadUserPasswordFromDB();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentPassword !== dbPassword) {
      showToast('Current password does not match database record.', 'error');
      return;
    }
    if (!newPassword) {
      showToast('Please enter a new password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setUpdating(true);

    try {
      if (currentUser.email) {
        await updateProfilePasswordInDB(currentUser.email, newPassword);
      }

      if (typeof window !== 'undefined' && currentUser.email) {
        localStorage.setItem(`design_orbit_pass_${currentUser.email.toLowerCase()}`, newPassword);
      }

      setDbPassword(newPassword);
      setCurrentPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast('Your password has been updated in the database successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update password in database', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                Account Settings
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">{currentUser.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Security & Password
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage your login credentials and security configuration.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* User Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-teal-600 text-white font-extrabold flex items-center justify-center text-xl shadow-sm">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center space-x-2 w-fit">
              <User className="w-3.5 h-3.5 text-sky-600" />
              <span>{currentUser.name}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{currentUser.email || 'varun@webtreeonline.com'}</p>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-sky-600" />
              <span>Change Password</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ensure your new password is at least 6 characters long.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="block w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="block w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updating}
                className="inline-flex justify-center items-center space-x-2 px-6 py-2.5 text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{updating ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Clear Local Cache & Session Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <span>Clear Local Session Cache</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Purge cached mock data stored in this browser to ensure live Supabase database sync.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                clearLocalSessionData();
                showToast('Cleared all local session cache successfully!', 'success');
                setTimeout(() => window.location.reload(), 500);
              }}
              className="inline-flex justify-center items-center space-x-2 px-5 py-2.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Clear Local Session Data</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
