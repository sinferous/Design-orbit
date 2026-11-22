'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { createClient } from '@/lib/supabase/client';
import {
  getLoggedInUser,
  fetchProfileByEmail,
  fetchProfiles,
  isAdminUser
} from '@/lib/services/work-entry';
import { changeMyPassword, MIN_PASSWORD_LENGTH } from '@/lib/services/auth';
import {
  fetchMonthlyDesignerActivity,
  MonthlyDesignerActivity
} from '@/lib/services/activity';
import { MonthlyActivityHeatmap } from '@/components/activity/MonthlyActivityHeatmap';
import { Profile } from '@/types';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { OrbitLoader } from '@/components/ui/OrbitLoader';

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loadingPassword, setLoadingPassword] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: 'Team Member', email: '' });
  const [profile, setProfile] = useState<Profile | null>(null);

  // Profile-specific monthly activity heatmap state
  const [activityYear, setActivityYear] = useState<number>(new Date().getFullYear());
  const [activityMonth, setActivityMonth] = useState<number>(new Date().getMonth() + 1);
  const [activity, setActivity] = useState<MonthlyDesignerActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState<boolean>(true);

  const { showToast } = useToast();

  const loadActivity = useCallback(async (profId: string, yr: number, mo: number) => {
    setLoadingActivity(true);
    try {
      const data = await fetchMonthlyDesignerActivity(yr, mo, profId);
      setActivity(data);
    } catch (err) {
      console.error('Failed to load user activity heatmap:', err);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    async function loadUserData() {
      const user = getLoggedInUser();
      if (user?.name) {
        setCurrentUser(user);
        try {
          let activeProf: Profile | null = null;
          if (user.email) {
            activeProf = await fetchProfileByEmail(user.email);
          }
          if (!activeProf) {
            const all = await fetchProfiles();
            activeProf = all.find(p => p.name.toLowerCase() === user.name.toLowerCase()) || null;
          }

          if (activeProf) {
            setProfile(activeProf);
          }
        } catch (err) {
          console.error('Failed to load profile data:', err);
        }
      }
      setLoadingPassword(false);
    }
    loadUserData();
  }, []);

  const isAdmin = isAdminUser(currentUser) || isAdminUser(profile);

  useEffect(() => {
    if (profile?.id && !isAdmin) {
      loadActivity(profile.id, activityYear, activityMonth);
    } else if (isAdmin) {
      setLoadingActivity(false);
    }
  }, [profile?.id, isAdmin, activityYear, activityMonth, loadActivity]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast('Enter your current password', 'error');
      return;
    }
    if (!newPassword) {
      showToast('Enter a new password', 'error');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showToast(`Use at least ${MIN_PASSWORD_LENGTH} characters`, 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('The new passwords don’t match', 'error');
      return;
    }

    setUpdating(true);

    try {
      await changeMyPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not update the password. Try again.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const initial = (currentUser.name || '?').charAt(0).toUpperCase();
  const canSubmit = !updating && newPassword.length > 0 && confirmPassword.length > 0;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;

  const inputCls =
    'block w-full h-10 pl-3 pr-10 text-sm rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400/50 focus:bg-white/[0.04] transition-colors';
  const eyeCls =
    'absolute inset-y-0 right-0 w-10 flex items-center justify-center text-slate-500 hover:text-slate-200 cursor-pointer';

  const passwordField = (
    id: string,
    label: string,
    value: string,
    setValue: (v: string) => void,
    shown: boolean,
    setShown: (v: boolean) => void,
    opts: { placeholder?: string; autoComplete: string; hint?: React.ReactNode }
  ) => (
    <div>
      <label htmlFor={id} className="block text-xs text-slate-400 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          required
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={opts.placeholder}
          autoComplete={opts.autoComplete}
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => setShown(!shown)}
          className={eyeCls}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {opts.hint && <p className="mt-1.5 text-xs">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0c0b] md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-slate-50">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin ? 'Your account and password' : 'Your profile, your month and your password'}
          </p>
        </div>

        {/* Profile */}
        <section className="bento-card p-5 sm:p-6 flex items-center gap-4">
          <div className="w-14 h-14 shrink-0 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 font-display text-xl flex items-center justify-center">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium text-slate-50 truncate">{currentUser.name}</h2>
              {isAdmin && (
                <span className="inline-flex items-center h-5 px-2 rounded-md bg-white/[0.06] text-[11px] text-slate-300">
                  Admin
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-400 truncate">
              {[profile?.designation, currentUser.email].filter(Boolean).join(' · ') || 'No email on file'}
            </p>
          </div>
        </section>

        {/* Monthly activity (designers only) */}
        {!isAdmin && (
          loadingActivity ? (
            <div className="bento-card p-12">
              <OrbitLoader size="md" text="Loading your month" />
            </div>
          ) : activity ? (
            <MonthlyActivityHeatmap
              activity={activity}
              showProfileHeader={false}
              onMonthChange={(y, m) => {
                setActivityYear(y);
                setActivityMonth(m);
              }}
            />
          ) : null
        )}

        {/* Password */}
        <section className="bento-card p-5 sm:p-6 grid gap-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <div>
            <h2 className="text-sm font-medium text-slate-100">Password</h2>
            <p className="mt-1 text-sm text-slate-500">Use at least 6 characters. You stay signed in after changing it.</p>
          </div>

          {loadingPassword ? (
            <div className="py-6">
              <OrbitLoader size="sm" />
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              {passwordField('current-password', 'Current password', currentPassword, setCurrentPassword, showCurrent, setShowCurrent, {
                autoComplete: 'current-password',
              })}
              {passwordField('new-password', 'New password', newPassword, setNewPassword, showNew, setShowNew, {
                placeholder: 'At least 6 characters',
                autoComplete: 'new-password',
                hint: tooShort ? <span className="text-slate-500">{MIN_PASSWORD_LENGTH - newPassword.length} more to go</span> : undefined,
              })}
              {passwordField('confirm-password', 'Confirm new password', confirmPassword, setConfirmPassword, showConfirm, setShowConfirm, {
                placeholder: 'Type it again',
                autoComplete: 'new-password',
                hint: mismatch ? <span className="text-rose-300">Doesn’t match the new password</span> : undefined,
              })}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-emerald-500 text-sm font-medium text-[#0b1410] hover:bg-emerald-400 disabled:bg-white/[0.06] disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {updating ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
