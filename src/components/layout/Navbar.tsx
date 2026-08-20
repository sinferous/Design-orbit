'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, BarChart3, Users, PlusCircle, LogOut, Building2, KeyRound, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLoggedInUser } from '@/lib/services/work-entry';

interface NavbarProps {
  userName?: string;
}

export function Navbar({ userName }: NavbarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<string>(userName || 'Team Member');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const user = getLoggedInUser();
    if (user?.name) {
      setCurrentUser(user.name);
    }
  }, [userName]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Work', href: '/work', icon: Calendar },
    { label: 'Clients', href: '/clients', icon: Building2 },
    { label: 'Team', href: '/team', icon: Users },
    { label: 'Reports', href: '/reports/weekly', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4 md:space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-2.5 sm:space-x-3.5 group">
              <img
                src="/logo/webtree-logo.svg"
                alt="Webtree Logo"
                className="h-6 sm:h-7 w-auto object-contain group-hover:opacity-90 transition-opacity"
              />
              <div className="h-4 sm:h-5 w-px bg-slate-300" />
              <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                Design Orbit
              </span>
            </Link>

            {/* Desktop Navigation links */}
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
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/work/new"
              className="inline-flex items-center space-x-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden xs:inline">Add Work</span>
              <span className="xs:hidden">Add</span>
            </Link>

            <div className="hidden sm:block h-6 w-px bg-slate-200" />

            <div className="hidden sm:flex items-center space-x-3">
              <Link
                href="/settings"
                title="Account Settings & Password"
                className="flex items-center space-x-2 group/user"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 group-hover/user:border-sky-300">
                  {currentUser.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover/user:text-sky-600">
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

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-slate-800" /> : <Menu className="w-6 h-6 text-slate-800" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 mb-2 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-xs font-bold text-sky-700">
                  {currentUser.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-800">{currentUser}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  href="/settings"
                  className="text-xs font-semibold text-sky-600 hover:underline px-2 py-1 bg-white rounded border border-slate-200"
                >
                  Settings
                </Link>
                <Link
                  href="/login"
                  className="text-xs font-semibold text-red-600 hover:underline px-2 py-1 bg-white rounded border border-slate-200"
                >
                  Logout
                </Link>
              </div>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isActive ? 'text-sky-600' : 'text-slate-500')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
