'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setLoggedInUser, fetchProfiles } from '@/lib/services/work-entry';
import { Profile } from '@/types';
import { Lock, Mail, ArrowRight, Eye, EyeOff, UserCheck } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

const PRESET_ACCOUNTS = [
  { name: 'Select a Team Member (Optional)', email: '' },
  { name: 'Admin (System Administrator)', email: 'admin@webtreeonline.com' },
  { name: 'Gajesh (UI/UX Designer)', email: 'gajesh@webtreeonline.com' },
  { name: 'Fazil (Senior UI/UX Designer)', email: 'fazil@webtreeonline.com' },
  { name: 'Samantha (Design Team Lead)', email: 'sams@webtreeonline.com' },
  { name: 'Moveena (Senior Graphic Designer)', email: 'moveena@webtreeonline.com' },
  { name: 'Prasanna Lakshmi (Graphic Designer)', email: 'prasanna@webtreeonline.com' },
  { name: 'Varun (Graphic Designer)', email: 'varun@webtreeonline.com' },
  { name: 'Shashiraj (Graphic Designer)', email: 'shashiraj@webtreeonline.com' },
];

function getStoredPassword(email: string): string {
  if (typeof window !== 'undefined') {
    const customPass = localStorage.getItem(`design_orbit_pass_${email.toLowerCase()}`);
    if (customPass) return customPass;
    const globalPass = localStorage.getItem('design_orbit_master_password');
    if (globalPass) return globalPass;
  }
  return 'strongpassword';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSelectAccount = (selectedEmail: string) => {
    if (!selectedEmail) return;
    setEmail(selectedEmail);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const inputEmail = email.trim().toLowerCase();
    const inputPassword = password.trim();

    if (!inputEmail) {
      showToast('Please enter your work email.', 'error');
      setLoading(false);
      return;
    }

    if (!inputPassword) {
      showToast('Please enter your password.', 'error');
      setLoading(false);
      return;
    }

    // 1. Fetch DB Profiles & verify email exists in Database directory
    let profilesList: Profile[] = [];
    try {
      profilesList = await fetchProfiles();
    } catch {
      profilesList = [];
    }

    const profileMatch = profilesList.find(
      p => p.email && p.email.toLowerCase() === inputEmail
    );

    if (!profileMatch) {
      showToast(`No account found for "${inputEmail}". Please check your email or select a valid team profile.`, 'error');
      setLoading(false);
      return;
    }

    // 2. Strict Password Verification against DB / account password
    const isConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project')
    );

    let authenticated = false;

    if (isConfigured) {
      try {
        const supabase = createClient();
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: inputEmail,
          password: inputPassword,
        });

        if (!authErr && authData?.user) {
          authenticated = true;
        }
      } catch (err) {
        console.warn('Supabase auth attempt:', err);
      }
    }

    if (!authenticated) {
      const validPassword = getStoredPassword(inputEmail);
      if (inputPassword !== validPassword) {
        showToast('Incorrect password entered. Access denied.', 'error');
        setLoading(false);
        return;
      }
    }

    const userName = profileMatch.name;
    setLoggedInUser(userName, profileMatch.email || inputEmail);
    showToast(`Welcome back, ${userName}! Signed in successfully.`, 'success');

    setTimeout(() => {
      router.push('/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src="/logo/webtree-logo.svg"
            alt="Webtree Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Design Orbit Work Tracker
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Internal reporting platform for the Webtree Creative Team
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10 space-y-6">
          {/* Quick Select Preset Member Account */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Select Member Account</span>
            </label>
            <select
              value={email}
              onChange={e => handleSelectAccount(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {PRESET_ACCOUNTS.map(acc => (
                <option key={acc.email || 'empty'} value={acc.email}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Work Email
              </label>
              <div className="mt-1.5 relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@webtreeonline.com"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Default team password: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold">strongpassword</code></p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 text-sm font-bold rounded-xl text-white webtree-gradient-btn shadow-sm disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
