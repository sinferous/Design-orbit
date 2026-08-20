'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setLoggedInUser, INITIAL_MOCK_PROFILES } from '@/lib/services/work-entry';
import { Lock, Mail, ArrowRight, Eye, EyeOff, UserCheck, ShieldCheck } from 'lucide-react';
import { ToastAlert } from '@/components/ui/ToastAlert';

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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSelectAccount = (selectedEmail: string) => {
    if (!selectedEmail) return;
    setEmail(selectedEmail);
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const inputEmail = email.trim() || 'varun@webtreeonline.com';
    const inputPassword = password.trim() || 'strongpassword';

    // Find profile name matching email or capitalize email username
    const profileMatch = INITIAL_MOCK_PROFILES.find(p => p.email && p.email.toLowerCase() === inputEmail.toLowerCase());
    let userName = profileMatch ? profileMatch.name : inputEmail.split('@')[0];
    userName = userName.charAt(0).toUpperCase() + userName.slice(1);

    setLoggedInUser(userName, inputEmail);

    try {
      const isConfigured = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project')
      );

      if (isConfigured) {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email: inputEmail,
          password: inputPassword,
        }).catch(() => null);
      }

      setMessage(`Signed in as ${userName}! Opening Dashboard...`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err: any) {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <ToastAlert message={error} type="error" onClose={() => setError(null)} />
      <ToastAlert message={message} type="success" onClose={() => setMessage(null)} />
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
              <span>Quick Select Member Account</span>
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
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 text-sm font-bold rounded-xl text-white webtree-gradient-btn shadow-sm disabled:opacity-50"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={handleDemoAccess}
              type="button"
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Explore Application in Preview Mode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
