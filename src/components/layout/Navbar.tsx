'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, BarChart3, Users, PlusCircle, LogOut, Building2, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLoggedInUser } from '@/lib/services/work-entry';

interface NavbarProps {
  userName?: string;
}

export function Navbar({ userName }: NavbarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<string>(userName || 'Team Member');

  useEffect(() => {
    const user = getLoggedInUser();
    if (user?.name) {
      setCurrentUser(user.name);
    }
  }, [userName]);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Work', href: '/work', icon: Calendar },
    { label: 'Clients', href: '/clients', icon: Building2 },
    { label: 'Team', href: '/team', icon: Users },
    { label: 'Reports', href: '/reports/weekly', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-3.5 group">
              <img
                src="/logo/webtree-logo.svg"
                alt="Webtree Logo"
                className="h-7 w-auto object-contain group-hover:opacity-90 transition-opacity"
              />
              <div className="h-5 w-px bg-slate-300" />
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                Design Orbit
              </span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sky-50 text-sky-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-sky-600' : 'text-slate-400')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Action Button & Profile */}
          <div className="flex items-center space-x-4">
            <Link
              href="/work/new"
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white webtree-gradient-btn rounded-lg shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Work</span>
            </Link>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center space-x-3">
              <Link
                href="/settings"
                title="Account Settings & Password"
                className="flex items-center space-x-2 group/user"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 group-hover/user:border-sky-300">
                  {currentUser.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm font-bold text-slate-700 group-hover/user:text-sky-600">
                  {currentUser}
                </span>
              </Link>

              <Link
                href="/settings"
                title="Change Password"
                className="text-slate-400 hover:text-sky-600 p-1 rounded-md transition-colors"
              >
                <KeyRound className="w-4 h-4" />
              </Link>

              <Link
                href="/login"
                title="Sign out"
                className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
