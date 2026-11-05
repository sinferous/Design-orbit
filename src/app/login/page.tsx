'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setLoggedInUser, fetchProfiles, getUserPasswordFromDB, isAdminUser } from '@/lib/services/work-entry';
import { Profile } from '@/types';
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { RichSelect } from '@/components/ui/RichSelect';
import { BrandMark } from '@/components/ui/BrandMark';
import { Diya, Rangoli, Toran } from '@/components/ui/Diwali';

const PRESET_ACCOUNTS = [
  { name: 'Choose your account', email: '' },
  { name: 'Admin (System Administrator)', email: 'admin@webtreeonline.com' },
  { name: 'Fazil (Senior UI/UX Designer)', email: 'fazil@webtreeonline.com' },
  { name: 'Gajesh (UI/UX Designer)', email: 'gajesh@webtreeonline.com' },
  { name: 'Moveena (Senior Graphic Designer)', email: 'moveena@webtreeonline.com' },
  { name: 'Prasanna Lakshmi (Graphic Designer)', email: 'prasanna@webtreeonline.com' },
  { name: 'Samantha (Design Team Lead)', email: 'sams@webtreeonline.com' },
  { name: 'Shashiraj (Graphic Designer)', email: 'shashiraj@webtreeonline.com' },
  { name: 'Varun (Graphic Designer)', email: 'varun@webtreeonline.com' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accountOptions, setAccountOptions] = useState(PRESET_ACCOUNTS);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.designOrbitPipManager?.closePip();
    }

    async function loadAccounts() {
      try {
        const dbProfiles = await fetchProfiles();
        if (dbProfiles && dbProfiles.length > 0) {
          const sorted = [...dbProfiles]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
            .map(p => ({
              name: p.name,
              email: p.email || '',
            }));
          setAccountOptions([
            { name: 'Choose your account', email: '' },
            ...sorted,
          ]);
        }
      } catch (err) {
        console.warn('Failed to load dynamic accounts for login:', err);
      }
    }
    loadAccounts();
  }, []);

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
      const validPassword = getUserPasswordFromDB(profileMatch, inputEmail);
      if (inputPassword !== validPassword) {
        showToast('Incorrect password entered. Access denied.', 'error');
        setLoading(false);
        return;
      }
    }

    const userName = profileMatch.name;
    setLoggedInUser(userName, profileMatch.email || inputEmail, profileMatch.id);
    showToast(`Welcome back, ${userName}! Signed in successfully.`, 'success');

    const destination = isAdminUser(profileMatch) ? '/admin' : '/dashboard';
    setTimeout(() => {
      router.push(destination);
    }, 400);
  };

  // Team members drawn as planets on the orbit (names from the live account list)
  const crew = accountOptions
    .filter(acc => acc.email && !acc.email.startsWith('admin'))
    .map(acc => {
      const m = acc.name.match(/^(.*?)\s*\((.*)\)\s*$/);
      return { name: (m ? m[1] : acc.name).trim(), email: acc.email };
    });
  const innerCrew = crew.filter((_, i) => i % 2 === 0);
  const outerCrew = crew.filter((_, i) => i % 2 === 1);
  const selectedEmail = email.trim().toLowerCase();

  const renderPlanets = (list: typeof crew, radius: number, offset: number, spinClass: string, counterClass: string) => (
    <div className={`absolute inset-0 ${spinClass}`}>
      {list.map((member, i) => {
        const angle = (i / Math.max(list.length, 1)) * Math.PI * 2 + offset;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;
        const isSelected = member.email.toLowerCase() === selectedEmail;
        return (
          <button
            key={member.email}
            type="button"
            onClick={() => setEmail(member.email)}
            title={`Sign in as ${member.name}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 group/planet cursor-pointer"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span className={`flex flex-col items-center gap-1.5 ${counterClass}`}>
              <span
                className={`flex items-center justify-center w-11 h-11 rounded-full text-sm font-semibold transition-all duration-300 ${
                  isSelected
                    ? 'bg-[#55cb98] text-[#06140d] scale-110'
                    : 'bg-[#232322] text-slate-200 group-hover/planet:bg-[#30302e]'
                }`}
              >
                {member.name.charAt(0).toUpperCase()}
              </span>
              <span className={`text-xs whitespace-nowrap transition-colors ${isSelected ? 'text-slate-50' : 'text-slate-500 group-hover/planet:text-slate-300'}`}>
                {member.name.split(' ')[0]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.15fr_1fr] bg-[#0c0c0b]">
      {/* Brand side: the team in orbit */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#121211] border-r border-white/[0.05] p-10 xl:p-14">
        <Toran className="absolute top-0 inset-x-0" />
        <div className="flex items-center gap-3 relative z-10">
          <BrandMark size={34} />
          <span className="font-display font-bold text-xl text-slate-50">Design Orbit</span>
        </div>

        <div className="relative mx-auto w-full max-w-[520px] aspect-square my-6">
          <div className="absolute inset-[18%] rounded-full border border-white/[0.07]" />
          <div className="absolute inset-[2%] rounded-full border border-dashed border-white/[0.08]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Rangoli size={250} className="absolute opacity-35 animate-orbit" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <BrandMark size={128} className="animate-orbit-slow" />
          </div>
          {renderPlanets(innerCrew, 32, -Math.PI / 2, 'animate-orbit', '[animation:orbitSpin_24s_linear_infinite_reverse] motion-reduce:[animation:none]')}
          {renderPlanets(outerCrew, 48, Math.PI / 5, 'animate-orbit-slow', '[animation:orbitSpin_60s_linear_infinite] motion-reduce:[animation:none]')}
        </div>

        <div className="relative z-10 max-w-xl">
          <h2 className="font-display text-4xl xl:text-[44px] leading-[1.02] font-semibold text-slate-50">
            Every brief, logged in orbit.
          </h2>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Daily work, client hours and approvals for the Webtree creative team, in one place. Pick your planet to start.
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm text-[#f2a93b]">
            <Diya size={24} />
            <span>Happy Diwali from the Webtree team</span>
          </div>
        </div>
      </section>

      {/* Form side */}
      <section className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center gap-3 lg:hidden mb-10">
            <BrandMark size={32} />
            <span className="font-display font-bold text-xl text-slate-50">Design Orbit</span>
          </div>

          <h1 className="font-display text-[32px] leading-tight font-semibold text-slate-50">Sign in</h1>
          <p className="mt-2 text-sm text-slate-400">Use your Webtree work email.</p>

          <div className="mt-8 space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Team member</label>
            <RichSelect
              value={email}
              onChange={val => handleSelectAccount(String(val))}
              options={accountOptions.map(acc => ({
                value: acc.email,
                label: acc.name,
              }))}
              size="sm"
              placeholder="Choose your account"
            />
          </div>

          <form className="mt-5 space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Work email
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@webtreeonline.com"
                  className="block w-full h-11 pl-10 pr-3 text-[15px] border border-white/[0.09] rounded-xl focus:outline-none focus:border-[#55cb98] focus:ring-4 focus:ring-[#55cb98]/15 text-slate-100 bg-[#141413] placeholder:text-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full h-11 pl-10 pr-10 text-[15px] border border-white/[0.09] rounded-xl focus:outline-none focus:border-[#55cb98] focus:ring-4 focus:ring-[#55cb98]/15 text-slate-100 bg-[#141413] placeholder:text-slate-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
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
                className="w-full h-11 flex justify-center items-center gap-2 px-4 text-[15px] rounded-full webtree-gradient-btn cursor-pointer"
              >
                <span>{loading ? 'Signing in…' : 'Sign in'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <p className="mt-10 text-xs text-slate-500">Webtree Online · internal tool for the creative team</p>
        </div>
      </section>
    </div>
  );
}
