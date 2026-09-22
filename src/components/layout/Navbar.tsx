'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, BarChart3, PlusCircle, LogOut, Building2, Menu, X, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLoggedInUser, logoutUser, isAdminUser } from '@/lib/services/work-entry';

interface NavbarProps {
  userName?: string;
}

export function Navbar({ userName }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string>(userName || 'Team Member');
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const user = getLoggedInUser();
    if (user) {
      setCurrentUser(user.name);
      setIsAdmin(isAdminUser(user));
    } else {
      router.push('/login');
    }
  }, [userName, router]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logoutUser();
    router.push('/login');
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Dashboard', href: isAdmin ? '/admin' : '/dashboard', icon: LayoutDashboard },
    { label: isAdmin ? 'Team Log' : 'My Work', href: '/work', icon: Calendar },
    { label: 'Clients', href: '/clients', icon: Building2 },
    { label: 'Reports', href: '/reports/weekly', icon: BarChart3 },
    ...(!isAdmin ? [{ label: 'Excel Sync', href: '/excel-sync', icon: FileSpreadsheet }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-800/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4 md:space-x-8">
            <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center group">
              <span className="font-extrabold text-slate-100 text-base sm:text-lg tracking-tight flex items-center">
                Design
                <span className="inline-flex items-center justify-center ml-1.5 mr-[0.5px] relative -top-[0.5px]">
                  <svg
                    viewBox="0 0 1072.74 1072.74"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] rounded-full shadow-sm group-hover:scale-105 transition-transform"
                  >
                    <circle cx="536.37" cy="536.37" r="536.37" fill="#020202" />
                    <path
                      d="M152.76,654.71c15.04,77.61,113.24,77.57,187.09,67.07,122.66-17.43,261.52-74.83,353.66-158.03,28.46-25.7,53.21-54.58,64.96-91.12,9.91-30.81.23-62.52-28.91-78.21-76.08-40.95-216.63-8.42-300.06,23.14l-57.67,21.81c108.07-65.7,226.8-110.19,351.48-128.68,47.97-7.11,93.1-9.12,138.92,4.4,25.25,7.45,51.03,22.31,61.54,47.31,10.31,24.51,3.7,53.65-8.14,77.25-46.26,92.21-153.18,162.61-243.76,212.48-89.85,49.47-184.23,85.39-285.17,104.36-68.11,12.8-157.49,22.26-212.17-17.28-27.17-19.65-36.4-53.47-21.77-84.51Z"
                      fill="#ffffff"
                    />
                  </svg>
                </span>
                rbit
              </span>
            </Link>

            {/* Desktop Navigation links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href.startsWith('/reports')
                  ? pathname.startsWith('/reports')
                  : pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sky-950/60 text-sky-300 font-semibold border border-sky-800/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-sky-400' : 'text-slate-400')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Action Button & Profile */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {!isAdmin && (
              <Link
                href="/work/new"
                className="inline-flex items-center space-x-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden xs:inline">Add Work</span>
                <span className="xs:hidden">Add</span>
              </Link>
            )}

            <div className="hidden sm:block h-6 w-px bg-slate-800" />

            <div className="hidden sm:flex items-center space-x-3">
              <Link
                href="/settings"
                title="Account Settings & Password"
                className="flex items-center space-x-2 group/user"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 group-hover/user:border-sky-500">
                  {currentUser.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-slate-200 group-hover/user:text-sky-400">
                  {currentUser}
                </span>
              </Link>


              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="text-slate-400 hover:text-red-400 p-1 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-slate-200" /> : <Menu className="w-6 h-6 text-slate-200" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 mb-2 bg-slate-900 rounded-lg flex items-center justify-between border border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-sky-950 border border-sky-800 flex items-center justify-center text-xs font-bold text-sky-400">
                  {currentUser.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-200">{currentUser}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  href="/settings"
                  className="text-xs font-semibold text-sky-400 hover:underline px-2.5 py-1 bg-slate-800 rounded border border-slate-700"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-semibold text-red-400 hover:underline px-2.5 py-1 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href.startsWith('/reports')
                ? pathname.startsWith('/reports')
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-sky-950/60 text-sky-300 border border-sky-800/40'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isActive ? 'text-sky-400' : 'text-slate-400')} />
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
